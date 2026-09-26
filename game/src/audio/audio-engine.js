(function () {
  "use strict";

  // Nucleo del Audio Framework. No conoce eventos de juego, reglas, ni
  // buses semanticos (eso vive en audio-bus-manager.js / audio-director.js).
  // Solo sabe: decodificar buffers, mantener pools de voces por sonido,
  // aplicar fades/ducking/cooldown/prioridad y limpiar todo sin fugas.
  //
  // Usa Web Audio API (no <audio> tags) para tener control real de
  // ganancia/automatizacion/crossfade/pitch sin artefactos.

  var ctx = null;
  var masterGain = null;
  var busGains = {}; // busId -> GainNode
  var buffers = {};  // soundId -> { buffer, def } | "failed"
  var loadingPromises = {}; // soundId -> Promise
  var activeVoices = {}; // soundId -> [{ source, gainNode, bus, startedAt, stop() }]
  var lastPlayedAt = {}; // soundId -> timestamp ms
  var globalVoiceCount = 0;
  var MAX_GLOBAL_VOICES = 48;
  var stats = {
    totalPlays: 0,
    totalPreloads: 0,
    totalFailedLoads: 0,
    totalStops: 0,
    totalCleanups: 0
  };

  function ensureContext() {
    if (ctx) return ctx;
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
    return ctx;
  }

  // Los navegadores moviles/desktop suspenden el AudioContext hasta el
  // primer gesto del usuario. Esto se llama desde un listener "una sola vez"
  // de click/touchstart/keydown a nivel documento (ver bottom de este
  // archivo), nunca hace falta que un modulo de gameplay lo sepa.
  function unlock() {
    var context = ensureContext();
    if (!context) return;
    if (context.state === "suspended") {
      context.resume().catch(function () {});
    }
  }

  function getBusGain(busId) {
    var context = ensureContext();
    if (!context) return null;
    if (busGains[busId]) return busGains[busId];
    var gainNode = context.createGain();
    gainNode.gain.value = 1;
    gainNode.connect(masterGain);
    busGains[busId] = gainNode;
    return gainNode;
  }

  function getSoundDef(soundId) {
    var sounds = window.OSSUARY_AUDIO_SOUNDS || [];
    for (var i = 0; i < sounds.length; i++) {
      if (sounds[i].id === soundId) return sounds[i];
    }
    return null;
  }

  function preload(soundId) {
    var context = ensureContext();
    if (!context) return Promise.resolve(null);
    if (buffers[soundId] && buffers[soundId] !== "failed") return Promise.resolve(buffers[soundId].buffer);
    if (loadingPromises[soundId]) return loadingPromises[soundId];

    var def = getSoundDef(soundId);
    if (!def || def.enabled === false || !def.file) {
      buffers[soundId] = "failed";
      return Promise.resolve(null);
    }

    stats.totalPreloads++;
    var promise = fetch(def.file)
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.arrayBuffer();
      })
      .then(function (arrayBuffer) {
        return context.decodeAudioData(arrayBuffer);
      })
      .then(function (decoded) {
        buffers[soundId] = { buffer: decoded, def: def };
        delete loadingPromises[soundId];
        return decoded;
      })
      .catch(function (err) {
        stats.totalFailedLoads++;
        buffers[soundId] = "failed";
        delete loadingPromises[soundId];
        if (typeof console !== "undefined") {
          console.warn("[OssuaryAudioEngine] preload failed for \"" + soundId + "\": " + err.message);
        }
        return null;
      });

    loadingPromises[soundId] = promise;
    return promise;
  }

  function preloadAll() {
    var sounds = window.OSSUARY_AUDIO_SOUNDS || [];
    return Promise.all(
      sounds.filter(function (def) { return def.preload && def.enabled !== false; })
        .map(function (def) { return preload(def.id); })
    );
  }

  function unload(soundId) {
    stopAllVoicesFor(soundId);
    delete buffers[soundId];
    delete loadingPromises[soundId];
  }

  function poolLimitFor(soundId) {
    var def = getSoundDef(soundId);
    return def && def.pool ? def.pool : 4;
  }

  function stealOldestVoice(soundId) {
    var voices = activeVoices[soundId];
    if (!voices || !voices.length) return;
    // Se elimina de la lista de forma inmediata y sincrona: el stop() real
    // (fade/disconnect) se completa despues via setTimeout, pero si
    // registerVoice() siguiera contando esta voz hasta ese momento, su
    // bucle de "robar voces" nunca veria bajar la longitud y quedaria en
    // un loop infinito sincrono (cuelga la pestaña).
    var oldest = voices.shift();
    globalVoiceCount = Math.max(0, globalVoiceCount - 1);
    oldest.stop(0);
  }

  function registerVoice(soundId, voice) {
    if (!activeVoices[soundId]) activeVoices[soundId] = [];
    var limit = poolLimitFor(soundId);
    while (activeVoices[soundId].length >= limit) {
      stealOldestVoice(soundId);
    }
    activeVoices[soundId].push(voice);
    globalVoiceCount++;
  }

  function unregisterVoice(soundId, voice) {
    var voices = activeVoices[soundId];
    if (!voices) return;
    var index = voices.indexOf(voice);
    if (index !== -1) {
      voices.splice(index, 1);
      globalVoiceCount = Math.max(0, globalVoiceCount - 1);
    }
  }

  function stopAllVoicesFor(soundId, fadeMs) {
    var voices = activeVoices[soundId];
    if (!voices) return;
    voices.slice().forEach(function (voice) {
      voice.stop(fadeMs || 0);
    });
  }

  function applyFadeIn(gainNode, targetVolume, fadeMs) {
    var now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0, now);
    if (fadeMs > 0) {
      gainNode.gain.linearRampToValueAtTime(targetVolume, now + fadeMs / 1000);
    } else {
      gainNode.gain.setValueAtTime(targetVolume, now);
    }
  }

  function scheduleFadeOutAndStop(gainNode, source, fadeMs, onStopped) {
    var context = ctx;
    var now = context.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    var currentValue = gainNode.gain.value;
    gainNode.gain.setValueAtTime(currentValue, now);
    if (fadeMs > 0) {
      gainNode.gain.linearRampToValueAtTime(0, now + fadeMs / 1000);
    } else {
      gainNode.gain.setValueAtTime(0, now);
    }
    var stopAt = now + Math.max(fadeMs, 0) / 1000;
    try {
      source.stop(stopAt);
    } catch (err) {
      // source ya parado o nunca arrancado; no es un error real de runtime.
    }
    window.setTimeout(function () {
      if (onStopped) onStopped();
    }, Math.max(fadeMs, 0) + 20);
  }

  // play(soundId, overrides) -> voice handle | null
  // overrides puede pisar: volume, playbackRate, pitch, delay, loop, fadeInMs,
  // bus, maxDurationMs.
  function play(soundId, overrides) {
    overrides = overrides || {};
    var context = ensureContext();
    if (!context) return null;

    var def = getSoundDef(soundId);
    if (!def || def.enabled === false) return null;

    var now = window.performance.now();
    var cooldown = def.cooldown || 0;
    if (cooldown > 0 && lastPlayedAt[soundId] && now - lastPlayedAt[soundId] < cooldown) {
      return null;
    }

    if (globalVoiceCount >= MAX_GLOBAL_VOICES) {
      // Politica simple de prioridad: no reproducir sonidos nuevos de baja
      // prioridad si el presupuesto global esta lleno; nunca lanza error.
      var incomingPriority = typeof overrides.priority === "number" ? overrides.priority : (def.priority || 0);
      if (incomingPriority < 50) return null;
    }

    var cached = buffers[soundId];
    if (!cached || cached === "failed") {
      // Carga perezosa: si nadie preload() este sonido todavia, se intenta
      // ahora mismo. La primera vez puede no sonar (decodificacion async);
      // a partir de la segunda llamada ya esta en cache.
      preload(soundId);
      return null;
    }

    lastPlayedAt[soundId] = now;
    stats.totalPlays++;

    var busId = overrides.bus || def.bus || "MASTER";
    var busGain = getBusGain(busId);
    if (!busGain) return null;

    var source = context.createBufferSource();
    source.buffer = cached.buffer;
    source.loop = typeof overrides.loop === "boolean" ? overrides.loop : Boolean(def.loop);

    var rate = overrides.playbackRate || overrides.pitch || def.playbackRate || def.pitch || 1;
    source.playbackRate.value = rate;

    var voiceGain = context.createGain();
    var targetVolume = typeof overrides.volume === "number" ? overrides.volume : (typeof def.volume === "number" ? def.volume : 1);

    source.connect(voiceGain);
    voiceGain.connect(busGain);

    var fadeIn = typeof overrides.fadeInMs === "number" ? overrides.fadeInMs : (def.fade && def.fade.inMs) || 0;
    var defaultFadeOut = (def.fade && def.fade.outMs) || 0;

    applyFadeIn(voiceGain, targetVolume, fadeIn);

    var delaySeconds = ((overrides.delay || def.delay || 0) / 1000);
    var startAt = context.currentTime + delaySeconds;

    var stopped = false;
    var voice = {
      soundId: soundId,
      bus: busId,
      startedAt: now,
      source: source,
      gainNode: voiceGain,
      stop: function (fadeMs) {
        if (stopped) return;
        stopped = true;
        var useFade = typeof fadeMs === "number" ? fadeMs : defaultFadeOut;
        scheduleFadeOutAndStop(voiceGain, source, useFade, function () {
          unregisterVoice(soundId, voice);
        });
      }
    };

    source.onended = function () {
      if (!stopped) {
        stopped = true;
        unregisterVoice(soundId, voice);
      }
    };

    try {
      // offsetMs: arrancar la reproduccion desde ese punto del buffer (para
      // resincronizar musica con animaciones que permiten saltar, p.ej. el
      // contador BIG WIN).
      var offsetSeconds = Math.max(0, (overrides.offsetMs || 0) / 1000);
      source.start(startAt, offsetSeconds);
    } catch (err) {
      return null;
    }

    var maxDurationMs = typeof overrides.maxDurationMs === "number"
      ? overrides.maxDurationMs
      : (typeof def.maxDurationMs === "number" ? def.maxDurationMs : null);
    if (maxDurationMs > 0) {
      window.setTimeout(function () {
        voice.stop();
      }, maxDurationMs);
    }

    registerVoice(soundId, voice);
    return voice;
  }

  function stop(soundId, fadeMs) {
    stats.totalStops++;
    stopAllVoicesFor(soundId, fadeMs);
  }

  function stopGroup(category, fadeMs) {
    var sounds = window.OSSUARY_AUDIO_SOUNDS || [];
    sounds.filter(function (def) { return def.category === category; })
      .forEach(function (def) { stop(def.id, fadeMs); });
  }

  function stopChannel(busId, fadeMs) {
    Object.keys(activeVoices).forEach(function (soundId) {
      var voices = activeVoices[soundId] || [];
      voices.slice().forEach(function (voice) {
        if (voice.bus === busId) voice.stop(fadeMs || 0);
      });
    });
  }

  function pauseAll() {
    if (ctx && ctx.state === "running") ctx.suspend().catch(function () {});
  }

  function resumeAll() {
    if (ctx && ctx.state === "suspended") ctx.resume().catch(function () {});
  }

  function fadeBusVolume(busId, targetVolume, fadeMs) {
    var gainNode = getBusGain(busId);
    if (!gainNode || !ctx) return;
    var now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    if (fadeMs > 0) {
      gainNode.gain.linearRampToValueAtTime(targetVolume, now + fadeMs / 1000);
    } else {
      gainNode.gain.setValueAtTime(targetVolume, now);
    }
  }

  // Ducking: baja temporalmente el volumen de un bus (p.ej. MUSIC) mientras
  // suena algo prioritario (p.ej. VOICE), y lo restaura despues.
  function duck(busId, amount, durationMs) {
    var gainNode = getBusGain(busId);
    if (!gainNode) return;
    var originalVolume = gainNode.gain.value;
    fadeBusVolume(busId, originalVolume * (1 - amount), 80);
    window.setTimeout(function () {
      fadeBusVolume(busId, originalVolume, 200);
    }, durationMs || 400);
  }

  function crossFade(fromSoundId, toSoundId, durationMs) {
    var fromVoices = activeVoices[fromSoundId] || [];
    fromVoices.forEach(function (voice) { voice.stop(durationMs); });
    return play(toSoundId, { fadeInMs: durationMs });
  }

  function cleanup() {
    stats.totalCleanups++;
    Object.keys(activeVoices).forEach(function (soundId) {
      stopAllVoicesFor(soundId, 0);
    });
    activeVoices = {};
    globalVoiceCount = 0;
  }

  function setMasterVolume(volume) {
    if (!masterGain) return;
    masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  function getMasterVolume() {
    return masterGain ? masterGain.gain.value : 1;
  }

  function snapshot() {
    var activeCount = 0;
    Object.keys(activeVoices).forEach(function (id) { activeCount += activeVoices[id].length; });
    return {
      contextState: ctx ? ctx.state : "uninitialized",
      bufferedSounds: Object.keys(buffers).filter(function (id) { return buffers[id] !== "failed"; }).length,
      failedSounds: Object.keys(buffers).filter(function (id) { return buffers[id] === "failed"; }).length,
      activeVoices: activeCount,
      globalVoiceCount: globalVoiceCount,
      buses: Object.keys(busGains),
      stats: Object.assign({}, stats)
    };
  }

  document.addEventListener("click", unlock, { once: true });
  document.addEventListener("touchstart", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });

  window.OssuaryAudioEngine = {
    ensureContext: ensureContext,
    unlock: unlock,
    preload: preload,
    preloadAll: preloadAll,
    unload: unload,
    play: play,
    stop: stop,
    stopGroup: stopGroup,
    stopChannel: stopChannel,
    pauseAll: pauseAll,
    resumeAll: resumeAll,
    fadeBusVolume: fadeBusVolume,
    duck: duck,
    crossFade: crossFade,
    cleanup: cleanup,
    setMasterVolume: setMasterVolume,
    getMasterVolume: getMasterVolume,
    getBusGain: getBusGain,
    snapshot: snapshot
  };
})();
