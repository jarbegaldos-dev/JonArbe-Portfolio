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
  var limiter = null;
  var busGains = {}; // busId -> GainNode (volumen del bus: config x ajuste del jugador)
  var duckGains = {}; // busId -> GainNode (solo ducking; no pisa el volumen del bus)
  var duckHolds = {}; // busId -> [{ level, until }]
  var autoDuck = null; // setAutoDuck: { target, sources: { busId: nivel }, maxHoldMs, releaseSec, minVolume }
  var toneFilters = {}; // busId -> paso bajo de setBusTone (entre el volumen del bus y el ducking)
  var buffers = {};  // soundId -> { buffer, def } | "failed"
  var loadingPromises = {}; // soundId -> Promise
  var activeVoices = {}; // soundId -> [{ source, gainNode, bus, startedAt, stop() }]
  var lastPlayedAt = {}; // soundId -> timestamp ms
  var lastStartAt = {}; // soundId -> { at: inicio programado ms, voice }
  var globalVoiceCount = 0;
  var MAX_GLOBAL_VOICES = 48;
  // Dos disparos del mismo sonido a la vez (p.ej. las dos mitades de una
  // costilla parando en el mismo fotograma) suman en fase: +6 dB por cada
  // duplicado y la tirada base llegaba a +3.9 dBFS. Dentro de esta ventana
  // se reaprovecha la voz que ya suena.
  var DEFAULT_MERGE_MS = 30;
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
    // Limitador de seguridad al final: sin el, golpes que coinciden con la
    // musica (BIG WIN, impactos del bonus) pasaban de 0 dBFS y recortaban.
    // Solo actua cerca del techo: por debajo de -3 dBFS no toca nada y lo
    // que llega a +6 dBFS sale a ~-1.7 dBFS (medido con OfflineAudioContext).
    if (ctx.createDynamicsCompressor) {
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 2;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.16;
      // El compresor de Web Audio suma una ganancia de compensacion fija
      // (spec: (1 / curva(1))^0.6, +1.37 dB con estos valores); se devuelve
      // para que el nivel por debajo del umbral quede igual que antes.
      var makeup = ctx.createGain();
      makeup.gain.value = 0.854;
      masterGain.connect(limiter);
      limiter.connect(makeup);
      makeup.connect(ctx.destination);
    } else {
      masterGain.connect(ctx.destination);
    }
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
    var duckNode = context.createGain();
    duckNode.gain.value = 1;
    gainNode.connect(duckNode);
    duckNode.connect(masterGain);
    busGains[busId] = gainNode;
    duckGains[busId] = duckNode;
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
    function fetchDecode(file) {
      return fetch(file)
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.arrayBuffer();
        })
        .then(function (arrayBuffer) {
          return context.decodeAudioData(arrayBuffer);
        });
    }
    // fallbackFile: otro formato del mismo sonido (Safari antiguo no
    // decodifica Ogg/Opus, en el que van los bucles de musica).
    var promise = fetchDecode(def.file)
      .catch(function (err) {
        if (!def.fallbackFile) throw err;
        return fetchDecode(def.fallbackFile);
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

  // preload: true  -> antes de PLAY (la pantalla de carga espera por ellos).
  // preload: "idle" -> pesados que no hacen falta al empezar (musica del
  // Juicio, ruleta, BIG WIN...): se bajan de uno en uno al acabar los
  // primeros, sin alargar la carga. Si se piden antes, play() los carga.
  var idlePreloadStarted = false;
  function preloadIdle() {
    if (idlePreloadStarted) return;
    idlePreloadStarted = true;
    // Primero los de mas prioridad (la musica del BIG WIN antes que la del Juicio).
    var queue = (window.OSSUARY_AUDIO_SOUNDS || []).filter(function (def) {
      return def.preload === "idle" && def.enabled !== false;
    }).sort(function (a, b) { return (b.priority || 0) - (a.priority || 0); });
    (function next() {
      var def = queue.shift();
      if (!def) return;
      preload(def.id).then(next, next);
    })();
  }

  function preloadAll() {
    var sounds = window.OSSUARY_AUDIO_SOUNDS || [];
    return Promise.all(
      sounds.filter(function (def) { return def.preload === true && def.enabled !== false; })
        .map(function (def) { return preload(def.id); })
    ).then(function (result) {
      preloadIdle();
      return result;
    });
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

    var willLoop = typeof overrides.loop === "boolean" ? overrides.loop : Boolean(def.loop);
    var delayMs = overrides.delay || def.delay || 0;
    var mergeMs = typeof def.mergeMs === "number" ? def.mergeMs : DEFAULT_MERGE_MS;
    var last = lastStartAt[soundId];
    if (!willLoop && mergeMs > 0 && last && !last.voice.isStopped() && Math.abs(now + delayMs - last.at) < mergeMs) {
      return last.voice;
    }

    lastPlayedAt[soundId] = now;
    stats.totalPlays++;

    var busId = overrides.bus || def.bus || "MASTER";
    var busGain = getBusGain(busId);
    if (!busGain) return null;

    var source = context.createBufferSource();
    source.buffer = cached.buffer;
    source.loop = willLoop;

    var rate = overrides.playbackRate || overrides.pitch || def.playbackRate || def.pitch || 1;
    var targetVolume = typeof overrides.volume === "number" ? overrides.volume : (typeof def.volume === "number" ? def.volume : 1);
    // vary: { rate, volume } -> cada disparo algo distinto (golpes que se
    // repiten mucho, como la parada de rodillo, dejan de sonar a metralleta).
    if (def.vary) {
      if (def.vary.rate) rate *= 1 + (Math.random() * 2 - 1) * def.vary.rate;
      if (def.vary.volume) targetVolume *= 1 - Math.random() * def.vary.volume;
    }
    source.playbackRate.value = rate;

    var voiceGain = context.createGain();

    source.connect(voiceGain);
    voiceGain.connect(busGain);

    var fadeIn = typeof overrides.fadeInMs === "number" ? overrides.fadeInMs : (def.fade && def.fade.inMs) || 0;
    var defaultFadeOut = (def.fade && def.fade.outMs) || 0;

    applyFadeIn(voiceGain, targetVolume, fadeIn);

    var delaySeconds = delayMs / 1000;
    var startAt = context.currentTime + delaySeconds;

    var stopped = false;
    var voice = {
      soundId: soundId,
      bus: busId,
      startedAt: now,
      source: source,
      gainNode: voiceGain,
      isStopped: function () { return stopped; },
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
    lastStartAt[soundId] = { at: now + delayMs, voice: voice };
    if (!willLoop) autoDuckFor(busId, targetVolume, source.buffer.duration / rate, delayMs);
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

  // Ducking: baja temporalmente un bus (p.ej. MUSIC) mientras suena algo
  // prioritario, y lo restaura despues. Va en su propio nodo, detras del
  // volumen del bus: antes leia el volumen del bus a mitad de otro duck y lo
  // "restauraba" a ese valor ya bajado (musica atascada baja), y pisaba el
  // ajuste MUSIC/EFFECTS que el jugador cambiara mientras durase. Si se
  // solapan, manda el mas profundo hasta que acaba el ultimo.
  function applyDuck(busId, rampSec) {
    var node = duckGains[busId];
    if (!node || !ctx) return;
    var nowMs = window.performance.now();
    var holds = (duckHolds[busId] || []).filter(function (h) { return h.until > nowMs; });
    duckHolds[busId] = holds;
    var level = holds.reduce(function (min, h) { return Math.min(min, h.level); }, 1);
    var release = autoDuck && autoDuck.target === busId && autoDuck.releaseSec ? autoDuck.releaseSec : 0.25;
    var now = ctx.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(level, now + (rampSec || (level < node.gain.value ? 0.06 : release)));
  }

  function duck(busId, amount, durationMs) {
    if (!getBusGain(busId)) return;
    var ms = durationMs || 400;
    if (!duckHolds[busId]) duckHolds[busId] = [];
    duckHolds[busId].push({ level: Math.max(0, 1 - amount), until: window.performance.now() + ms });
    applyDuck(busId);
    window.setTimeout(function () { applyDuck(busId); }, ms + 5);
  }

  // Ducking automatico (p. ej. la musica del Execution): cada sonido que
  // arranca en un bus de sources baja el bus target a ese nivel mientras suena
  // (hasta maxHoldMs) y vuelve en releaseSec. null lo apaga.
  function setAutoDuck(config) {
    autoDuck = config && config.target && config.sources ? config : null;
  }

  function autoDuckFor(busId, volume, seconds, delayMs) {
    if (!autoDuck || busId === autoDuck.target) return;
    var level = autoDuck.sources[busId];
    if (typeof level !== "number" || volume < (autoDuck.minVolume || 0)) return;
    var target = autoDuck.target;
    var holdMs = Math.max(120, Math.min(autoDuck.maxHoldMs || 900, seconds * 1000));
    var fire = function () { duck(target, 1 - level, holdMs); };
    if (delayMs > 0) window.setTimeout(fire, delayMs);
    else fire();
  }

  // Brillo de un bus: paso bajo suave; 0 o >= 20000 lo deja abierto. El filtro
  // se crea al primer uso, entre el volumen del bus y su ducking.
  function setBusTone(busId, cutoffHz, fadeMs) {
    var gainNode = getBusGain(busId);
    if (!gainNode || !ctx) return;
    var open = !cutoffHz || cutoffHz >= 20000;
    var filter = toneFilters[busId];
    if (!filter) {
      if (open) return;
      filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 0.6;
      filter.frequency.value = Math.min(20000, ctx.sampleRate / 2 - 100);
      gainNode.disconnect(duckGains[busId]);
      gainNode.connect(filter);
      filter.connect(duckGains[busId]);
      toneFilters[busId] = filter;
    }
    var hz = open ? Math.min(20000, ctx.sampleRate / 2 - 100) : Math.max(200, cutoffHz);
    var now = ctx.currentTime, freq = filter.frequency;
    freq.cancelScheduledValues(now);
    freq.setValueAtTime(freq.value, now);
    freq.exponentialRampToValueAtTime(hz, now + Math.max(0.02, (fadeMs || 0) / 1000));
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
      ducks: Object.keys(duckGains).reduce(function (out, id) {
        if (duckGains[id].gain.value < 0.999) out[id] = +duckGains[id].gain.value.toFixed(3);
        return out;
      }, {}),
      limiterReductionDb: limiter ? +limiter.reduction.toFixed(1) : null,
      stats: Object.assign({}, stats)
    };
  }

  document.addEventListener("click", unlock, { once: true });
  document.addEventListener("touchstart", unlock, { once: true });
  // touchend tambien: en iOS Safari un resume() desde touchstart no siempre
  // cuenta como gesto (el toque aun puede acabar en arrastre); touchend si.
  document.addEventListener("touchend", unlock, { once: true });
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
    setAutoDuck: setAutoDuck,
    setBusTone: setBusTone,
    crossFade: crossFade,
    cleanup: cleanup,
    setMasterVolume: setMasterVolume,
    getMasterVolume: getMasterVolume,
    getBusGain: getBusGain,
    snapshot: snapshot
  };
})();
