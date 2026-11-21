(function () {
  "use strict";

  var MUSIC_BY_MODE = {
    normal: "lib-music-crypt-theme-var",
    bonus: "lib-music-exec-waltz",
    juicio: "lib-music-lullaby-eerie",
    ruleta: "music-ruleta"
  };
  var FADE_MS = 900;
  var JUDGMENT_LOOP_MS = 698182 / 48; // muestras de la nana decodificada (antes 698494: 6.5 ms de mas por vuelta)
  var JUDGMENT_LAYERS = ["judgment-low-bed", "judgment-rhythm", "judgment-climax", "judgment-surge", "judgment-finale"];
  var currentMode = null;
  var desiredMode = null;
  var pendingPlayToken = 0;
  var suspendedForRib1Bonus = false;
  var judgmentStartMs = 0;
  var judgmentBells = 13;
  var judgmentVoice = null;
  var judgmentContext = null;
  var activeJudgmentLayers = {};
  var judgmentDuckLevel = 1;
  var judgmentDuckUntil = 0;
  var DUCK_RELEASE_SECONDS = 0.8;
  // Execution: la musica y siete capas del mismo bucle que entran al subir la
  // cuchilla. Cada valor alcanzado de game.js#BONUS_HAND_BOX_LEVELS es un paso
  // (una subida); cada capa entra en su paso (en el siguiente compas) y crece
  // dos pasos mas (las dos ultimas entran enteras). Climax en la 5.a subida
  // (x6) y dos escalones mas fuertes en la 6.a y la 7.a; desde ahi se queda
  // (2026-10-25: un bonus normal sube la cuchilla 4-7 veces y tiene que llegar).
  var EXEC_STEPS = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30, 50, 75, 100, 150, 250, 500];
  var EXEC_LAYERS = [1, 2, 3, 4, 5, 6, 7].map(function (n) { return "lib-music-exec-waltz-l" + n; });
  var EXEC_ENTRY = [1, 2, 3, 4, 5, 6, 7];
  var EXEC_START = [0.7, 0.7, 0.7, 0.7, 0.7, 1, 1];
  // Cada paso tambien abre el brillo de la musica (paso bajo del bus MUSIC, Hz;
  // 0 = abierto) y sube algo el vals base: la tension crece en cada subida,
  // entre o no capa nueva.
  var EXEC_TONE = [6500, 8000, 10000, 12500, 15500, 0];
  var EXEC_BASE_GROWTH = 0.06;
  var EXEC_CLIMAX_STEP = 7;
  var EXEC_BARS = 32;
  // En el Execution los efectos van delante y la musica detras (2026-10-25):
  // cada sonido que arranca en estos buses baja la musica a ese nivel mientras
  // suena (hasta 0.9 s) y vuelve en 0.45 s. Los efectos no se tocan.
  var EXEC_AUTODUCK = {
    target: "MUSIC", maxHoldMs: 900, releaseSec: 0.45, minVolume: 0.1,
    sources: { BONUS: 0.4, SYMBOLS: 0.55, RESPINS: 0.55, REELS: 0.8, BIGWIN: 0.35 }
  };
  var execStep = 0;
  var execVoice = null;
  var execStartSec = 0;
  var activeExecLayers = {};

  function audio() {
    return window.OssuaryAudio || null;
  }

  function stopSound(api, id, fadeMs) {
    if (api && typeof api.stop === "function") api.stop(id, fadeMs);
  }

  function stopJudgmentLayers(api, fadeMs, preserveTheme) {
    JUDGMENT_LAYERS.forEach(function (id) { if (activeJudgmentLayers[id]) stopSound(api, id, fadeMs); });
    activeJudgmentLayers = {};
    if (preserveTheme) return;
    judgmentStartMs = 0;
    judgmentBells = 13;
    judgmentVoice = null;
    judgmentContext = null;
    judgmentDuckLevel = 1;
    judgmentDuckUntil = 0;
  }

  function soundVolume(id) {
    var def = (window.OSSUARY_AUDIO_SOUNDS || []).find(function (s) { return s.id === id; });
    return def && typeof def.volume === "number" ? def.volume : 1;
  }

  function stopExecLayers(api, fadeMs) {
    EXEC_LAYERS.forEach(function (id) { if (activeExecLayers[id]) stopSound(api, id, fadeMs); });
    activeExecLayers = {};
    execVoice = null;
  }

  function execLayerVolume(index) {
    var since = execStep - EXEC_ENTRY[index];
    if (since < 0) return 0;
    return Math.min(1, EXEC_START[index] + 0.15 * since) * soundVolume(EXEC_LAYERS[index]);
  }

  // Arranca la capa en el siguiente compas del vals, en fase con el.
  function startOnNextBar(api, id, volume) {
    var src = execVoice && execVoice.source;
    if (!src || !src.buffer) return null;
    var ctx = src.context, loop = src.buffer.duration, bar = loop / EXEC_BARS;
    var pos = ((ctx.currentTime - execStartSec) % loop + loop) % loop;
    var wait = Math.ceil(pos / bar) * bar - pos;
    if (wait < 0.03) wait += bar;
    var voice = api.play(id, { delay: wait * 1000, offsetMs: ((pos + wait) % loop) * 1000, volume: volume, fadeInMs: 0 });
    if (!voice || !voice.gainNode) return voice;
    var gain = voice.gainNode.gain, at = ctx.currentTime + wait;
    gain.cancelScheduledValues(0);
    gain.setValueAtTime(0, ctx.currentTime);
    gain.setValueAtTime(0, at);
    gain.linearRampToValueAtTime(volume, at + 0.12);
    return voice;
  }

  function applyExecStage() {
    var api = audio();
    if (!api || currentMode !== "bonus" || !execVoice) return;
    var token = pendingPlayToken;
    if (execStep > 0) {
      if (typeof api.setBusTone === "function") api.setBusTone("MUSIC", execTone(), 1500);
      fadeVoice(execVoice, soundVolume(MUSIC_BY_MODE.bonus) * (1 + EXEC_BASE_GROWTH * Math.min(execStep, EXEC_CLIMAX_STEP)), 1.2);
    }
    EXEC_LAYERS.forEach(function (id, index) {
      var volume = execLayerVolume(index);
      if (volume <= 0) return;
      var active = activeExecLayers[id];
      if (active) {
        if (active.voice) fadeVoice(active.voice, volume, 0.6);
        return;
      }
      var entry = { voice: null };
      activeExecLayers[id] = entry;
      api.preload(id).then(function () {
        if (token !== pendingPlayToken || currentMode !== "bonus" || activeExecLayers[id] !== entry) return;
        entry.voice = startOnNextBar(api, id, execLayerVolume(index));
        if (!entry.voice) delete activeExecLayers[id];
      }).catch(function () {
        if (activeExecLayers[id] === entry) delete activeExecLayers[id];
      });
    });
  }

  function setExecMultiplier(payload) {
    if (!payload || !Number.isFinite(payload.bladeMultiplier)) return;
    var step = EXEC_STEPS.filter(function (m) { return payload.bladeMultiplier >= m; }).length;
    // La cuchilla no baja durante el bonus: la musica tampoco.
    if (step <= execStep) return;
    execStep = step;
    applyExecStage();
  }

  function setExecMix(on) {
    var api = audio();
    if (!api) return;
    if (typeof api.setAutoDuck === "function") api.setAutoDuck(on ? EXEC_AUTODUCK : null);
    if (typeof api.setBusTone === "function") api.setBusTone("MUSIC", on ? execTone() : 0, on ? 600 : 900);
  }

  function execTone() {
    return EXEC_TONE[Math.min(execStep, EXEC_TONE.length - 1)];
  }

  function duckLevelAt(now) {
    var release = Math.max(0, Math.min(1, (now - judgmentDuckUntil) / DUCK_RELEASE_SECONDS));
    return judgmentDuckLevel + (1 - judgmentDuckLevel) * release;
  }

  function scheduleJudgmentDuck(voice, fresh) {
    if (!voice || !voice.judgmentDucker || !judgmentContext) return;
    var now = judgmentContext.currentTime;
    var gain = voice.judgmentDucker.gain;
    var current = duckLevelAt(now);
    if (fresh) gain.setValueAtTime(current, now);
    else if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      var value = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(value, now);
    }
    var hold = Math.max(now + 0.055, judgmentDuckUntil);
    gain.linearRampToValueAtTime(current, now + 0.055);
    gain.setValueAtTime(current, hold);
    gain.linearRampToValueAtTime(1, hold + DUCK_RELEASE_SECONDS);
  }

  function attachJudgmentDucker(voice) {
    if (!voice || !voice.source || !judgmentContext || !judgmentContext.createGain) return;
    // Separate gain preserves instrument levels, music settings and layer fade-ins.
    var node = judgmentContext.createGain();
    voice.source.disconnect(voice.gainNode);
    voice.source.connect(node);
    node.connect(voice.gainNode);
    voice.judgmentDucker = node;
    scheduleJudgmentDuck(voice, true);
  }

  function duckJudgmentMusic(level, seconds) {
    if (currentMode !== "juicio" || !judgmentContext) return;
    var now = judgmentContext.currentTime;
    // Overlapping actions extend the strongest dip; no competing restoration timers.
    judgmentDuckLevel = Math.min(duckLevelAt(now), level);
    judgmentDuckUntil = Math.max(judgmentDuckUntil, now + seconds);
    scheduleJudgmentDuck(judgmentVoice, false);
    JUDGMENT_LAYERS.forEach(function (id) {
      if (activeJudgmentLayers[id]) scheduleJudgmentDuck(activeJudgmentLayers[id].voice, false);
    });
  }

  function fadeVoice(voice, volume, seconds) {
    if (!voice || !voice.gainNode) return;
    var gain = voice.gainNode.gain;
    var now = voice.gainNode.context.currentTime;
    if (gain.cancelAndHoldAtTime) gain.cancelAndHoldAtTime(now);
    else {
      var value = gain.value;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(value, now);
    }
    gain.linearRampToValueAtTime(volume, now + seconds);
  }

  // Medido (LUFS) contra la nana: la cama grave y el final quedaban 12-15 dB
  // por debajo y no se oian; las demas suben con la nana (+3.3 dB, ver
  // audio-integration.config.js).
  var LAYER_TRIM = [3.2, 1.47, 1.47, 1.47, 3.2];

  function layerVolume(index) {
    // Every three bells reached unlocks another arrangement, held until the bonus ends.
    var thresholds = [13, 10, 7, 4, 1];
    if (judgmentBells > thresholds[index]) return 0;
    var progress = Math.max(0, Math.min(1, (thresholds[index] - judgmentBells) / 3));
    return ([0.40, 0.72, 0.74, 0.65, 0.65][index] + [0.06, 0.10, 0.18, 0, 0][index] * progress) * LAYER_TRIM[index];
  }

  function applyJudgmentStage() {
    var api = audio();
    if (!api || currentMode !== "juicio" || !judgmentVoice) return;
    // The original melody stays present at its original level in all three arrangements.
    var token = pendingPlayToken;
    JUDGMENT_LAYERS.forEach(function (id, index) {
      var volume = layerVolume(index);
      if (volume <= 0) {
        if (activeJudgmentLayers[id]) stopSound(api, id, 1200);
        delete activeJudgmentLayers[id];
        return;
      }
      if (activeJudgmentLayers[id]) {
        fadeVoice(activeJudgmentLayers[id].voice, volume, 1.2);
        return;
      }
      var entry = { voice: null };
      activeJudgmentLayers[id] = entry;
      api.preload(id).then(function () {
        if (token !== pendingPlayToken || currentMode !== "juicio" || activeJudgmentLayers[id] !== entry) return;
        // Audio time freezes on suspension, so layers stay in phase after returning to the game.
        var clock = judgmentContext ? judgmentContext.currentTime * 1000 : window.performance.now();
        var offsetMs = Math.max(0, clock - judgmentStartMs) % JUDGMENT_LOOP_MS;
        entry.voice = api.play(id, { offsetMs: offsetMs, volume: layerVolume(index), fadeInMs: 1200 });
        attachJudgmentDucker(entry.voice);
        if (!entry.voice) delete activeJudgmentLayers[id];
      }).catch(function () {
        if (activeJudgmentLayers[id] === entry) delete activeJudgmentLayers[id];
      });
    });
  }

  function setJudgmentBells(payload) {
    if (currentMode !== "juicio" || !payload || !Number.isFinite(payload.remaining)) return;
    // Crow rewards must never remove instruments or lower an unlocked layer.
    judgmentBells = Math.min(judgmentBells, Math.max(0, payload.remaining));
    applyJudgmentStage();
  }

  function switchTo(mode, fadeMs) {
    var soundId = MUSIC_BY_MODE[mode];
    var api = audio();
    if (!soundId || !api) return null;
    desiredMode = mode;
    if (suspendedForRib1Bonus) {
      pendingPlayToken += 1;
      return mode;
    }
    if (currentMode === mode) return mode;
    if (currentMode) stopSound(api, MUSIC_BY_MODE[currentMode], typeof fadeMs === "number" ? fadeMs : FADE_MS);
    if (currentMode === "juicio") stopJudgmentLayers(api, typeof fadeMs === "number" ? fadeMs : FADE_MS);
    if (currentMode === "bonus") stopExecLayers(api, typeof fadeMs === "number" ? fadeMs : FADE_MS);
    if (mode === "normal" || mode === "juicio") execStep = 0;
    if ((currentMode === "bonus") !== (mode === "bonus")) setExecMix(mode === "bonus");
    currentMode = mode;
    pendingPlayToken += 1;
    var token = pendingPlayToken;
    api.stopGroup("music", typeof fadeMs === "number" ? fadeMs : FADE_MS);
    api.preload(soundId).then(function () {
      if (token !== pendingPlayToken || desiredMode !== mode) return;
      var voice = api.play(soundId, { fadeInMs: typeof fadeMs === "number" ? fadeMs : FADE_MS });
      if (mode === "juicio" && voice) {
        judgmentVoice = voice;
        judgmentContext = voice.source ? voice.source.context : null;
        judgmentStartMs = judgmentContext ? judgmentContext.currentTime * 1000 : window.performance.now();
        attachJudgmentDucker(voice);
        applyJudgmentStage();
      }
      if (mode === "bonus" && voice && voice.source) {
        execVoice = voice;
        execStartSec = voice.source.context.currentTime;
        applyExecStage();
      }
    });
    return mode;
  }

  function ensureNormal() {
    if (!currentMode) switchTo("normal", FADE_MS);
  }

  function suspendForRib1Bonus(fadeMs) {
    var api = audio();
    if (!api) return null;
    suspendedForRib1Bonus = true;
    desiredMode = desiredMode || currentMode || "normal";
    currentMode = null;
    pendingPlayToken += 1;
    if (MUSIC_BY_MODE[desiredMode]) stopSound(api, MUSIC_BY_MODE[desiredMode], typeof fadeMs === "number" ? fadeMs : 450);
    stopJudgmentLayers(api, typeof fadeMs === "number" ? fadeMs : 450);
    stopExecLayers(api, typeof fadeMs === "number" ? fadeMs : 450);
    api.stopGroup("music", typeof fadeMs === "number" ? fadeMs : 450);
    return desiredMode;
  }

  function resumeAfterRib1Bonus(mode, fadeMs) {
    suspendedForRib1Bonus = false;
    return switchTo(mode || desiredMode || "normal", typeof fadeMs === "number" ? fadeMs : FADE_MS);
  }

  function bindEvents() {
    var bus = window.OssuaryAudioEventBus;
    if (!bus || bindEvents.bound) return;
    bindEvents.bound = true;

    // Prioritize concrete actions; audio-clock automation also freezes while paused.
    var focus = {
      el_juicio_bell: [0.86, 0.65], el_juicio_bell_gained: [0.84, 0.7],
      el_juicio_condemned_landed: [0.86, 0.45], el_juicio_soul_in: [0.86, 0.35],
      el_juicio_crow_cut: [0.78, 0.65], el_juicio_empty_appearance: [0.86, 0.6],
      el_juicio_blight_tick: [0.82, 0.3], el_juicio_blight_land: [0.73, 1],
      el_juicio_golden_reveal: [0.78, 1.2], el_juicio_golden_smoke: [0.78, 1],
      el_juicio_golden_tick: [0.78, 0.4], el_juicio_golden_land: [0.68, 1.5],
      el_juicio_harvest: [0.73, 1.4], el_juicio_execute: [0.8, 0.5],
      el_juicio_flock: [0.73, 1.5], el_juicio_flock_charge: [0.8, 0.6],
      el_juicio_flock_climb: [0.73, 0.9], el_juicio_last_bell: [0.71, 1.5],
      el_juicio_rites: [0.75, 1], el_juicio_rites_beat: [0.75, 0.85],
      el_juicio_rites_saved: [0.75, 1], el_juicio_sentence: [0.69, 1.5],
      el_juicio_sentence_done: [0.69, 1.3]
    };
    Object.keys(focus).forEach(function (eventName) {
      bus.on(eventName, function () { duckJudgmentMusic(focus[eventName][0], focus[eventName][1]); });
    });

    ["button_click", "spin_started", "spin_finished"].forEach(function (eventName) {
      bus.on(eventName, ensureNormal);
    });
    bus.on("rib1_bonus_respin_started", function () { suspendForRib1Bonus(450); });
    bus.on("bonus_mode_started", function () {
      if (suspendedForRib1Bonus) resumeAfterRib1Bonus("bonus", FADE_MS);
      else switchTo("bonus", FADE_MS);
    });
    bus.on("bonus_started", function () {
      if (suspendedForRib1Bonus) resumeAfterRib1Bonus("bonus", FADE_MS);
      else switchTo("bonus", FADE_MS);
    });
    bus.on("super_bonus", function () {
      if (suspendedForRib1Bonus) resumeAfterRib1Bonus("juicio", 1200);
      else switchTo("juicio", 1200);
    });
    // El Juicio puede entrar por la cadena de bonus sin emitir super_bonus.
    bus.on("el_juicio_intro", function () {
      if (suspendedForRib1Bonus) resumeAfterRib1Bonus("juicio", 1200);
      else switchTo("juicio", 1200);
      judgmentBells = 13;
      applyJudgmentStage();
    });
    bus.on("bonus_multiplier_levelup", setExecMultiplier);
    bus.on("el_juicio_bell", setJudgmentBells);
    bus.on("el_juicio_bell_gained", setJudgmentBells);
    bus.on("el_juicio_sentence", function () {
      if (currentMode === "juicio") stopJudgmentLayers(audio(), 900, true);
    });
    bus.on("el_juicio_closed", function () { switchTo("normal", FADE_MS); });
    ["bonus_mode_completed", "bonus_completed", "bonus_failed"].forEach(function (eventName) {
      bus.on(eventName, function () {
        if (suspendedForRib1Bonus) resumeAfterRib1Bonus("normal", FADE_MS);
        else switchTo("normal", FADE_MS);
      });
    });
    bus.on("ruleta_started", function () { switchTo("ruleta", 700); });
    bus.on("ruleta_closed", function (payload) {
      switchTo(payload && payload.nextMode === "bonus" ? "bonus" : "normal", FADE_MS);
    });
  }

  bindEvents();

  // La musica de fondo no puede arrancar sola al cargar: el navegador deja
  // el AudioContext suspendido hasta el primer gesto del usuario. Hasta
  // ahora el unico disparador era un boton del juego o el primer spin
  // (bindEvents), asi que la partida se quedaba en silencio total mientras
  // no tocaras nada. Con esto, el primer gesto en cualquier parte de la
  // pagina ya pone el tema normal. No pisa al bonus ni a la ruleta porque
  // ensureNormal() solo actua si todavia no hay ningun modo de musica.
  function startMusicOnFirstGesture() {
    document.removeEventListener("click", startMusicOnFirstGesture);
    document.removeEventListener("touchstart", startMusicOnFirstGesture);
    document.removeEventListener("touchend", startMusicOnFirstGesture);
    document.removeEventListener("keydown", startMusicOnFirstGesture);
    ensureNormal();
  }

  document.addEventListener("click", startMusicOnFirstGesture);
  document.addEventListener("touchstart", startMusicOnFirstGesture);
  // touchend tambien (iOS Safari): ver audio-engine.js.
  document.addEventListener("touchend", startMusicOnFirstGesture);
  document.addEventListener("keydown", startMusicOnFirstGesture);

  window.OssuaryAdaptiveAudio = {
    switchTo: switchTo,
    ensureNormal: ensureNormal,
    currentMode: function () { return currentMode; },
    execState: function () { return { step: execStep, layers: Object.keys(activeExecLayers) }; },
    dispose: function () {
      var api = audio();
      if (api) {
        if (currentMode) stopSound(api, MUSIC_BY_MODE[currentMode], FADE_MS);
        stopJudgmentLayers(api, FADE_MS);
        stopExecLayers(api, FADE_MS);
        if (currentMode === "bonus") setExecMix(false);
        api.stopGroup("music", FADE_MS);
      }
      execStep = 0;
      currentMode = null;
      desiredMode = null;
      suspendedForRib1Bonus = false;
      pendingPlayToken += 1;
    },
    suspendForRib1Bonus: suspendForRib1Bonus,
    resumeAfterRib1Bonus: resumeAfterRib1Bonus,
    registerLayer: function () { return null; },
    setIntensity: function () { return null; },
    setVolatilityProfile: function () { return null; },
    setTension: function () { return null; }
  };
})();
