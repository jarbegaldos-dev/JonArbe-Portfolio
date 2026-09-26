(function () {
  "use strict";

  var MUSIC_BY_MODE = {
    normal: "music-normal",
    bonus: "music-bonus",
    ruleta: "music-ruleta"
  };
  var FADE_MS = 900;
  var currentMode = null;
  var desiredMode = null;
  var pendingPlayToken = 0;
  var suspendedForRib1Bonus = false;

  function audio() {
    return window.OssuaryAudio || null;
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
    currentMode = mode;
    pendingPlayToken += 1;
    var token = pendingPlayToken;
    api.stopGroup("music", typeof fadeMs === "number" ? fadeMs : FADE_MS);
    api.preload(soundId).then(function () {
      if (token !== pendingPlayToken || desiredMode !== mode) return;
      api.play(soundId, { fadeInMs: typeof fadeMs === "number" ? fadeMs : FADE_MS });
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
      if (suspendedForRib1Bonus) resumeAfterRib1Bonus("bonus", FADE_MS);
      else switchTo("bonus", FADE_MS);
    });
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
  // touchend too: on iOS Safari, a gesture-gated call like this can fail to
  // unlock audio when tied to touchstart alone (the touch could still turn
  // into a scroll/drag), while touchend confirms the tap actually completed.
  document.addEventListener("touchend", startMusicOnFirstGesture);
  document.addEventListener("keydown", startMusicOnFirstGesture);

  window.OssuaryAdaptiveAudio = {
    switchTo: switchTo,
    ensureNormal: ensureNormal,
    currentMode: function () { return currentMode; },
    dispose: function () {
      var api = audio();
      if (api) api.stopGroup("music", FADE_MS);
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
