(function () {
  "use strict";

  // Ajustes de sonido del jugador: volumen de musica, volumen de efectos y
  // silencio. Solo presentacion/mezcla: no emite eventos de juego.
  //
  // - Se guardan en este navegador (localStorage, si esta disponible) y se
  //   recuperan al recargar. El saldo NO se guarda (decision del usuario).
  // - Musica = bus MUSIC. Efectos = el resto de buses (rodillos, simbolos,
  //   bonus, BIG WIN, botones...). Cada bus queda en su volumen del config
  //   (audio-buses.config.js) multiplicado por el ajuste.
  // - Silencio = ganancia master a 0 (no toca los buses, asi el ducking de la
  //   musica no lo deshace).
  // - Videos con sonido propio (entrada de las free spins, puerta del
  //   esqueleto, cofre de la ruleta) no pasan por Web Audio: se marcan la
  //   primera vez que empiezan a sonar y desde entonces siguen el volumen de
  //   efectos y el silencio.
  //
  // Se carga antes que controls.js; toca el Audio Framework solo cuando ya
  // existe (DOMContentLoaded), porque sus scripts van al final de la pagina.

  var STORAGE_KEY = "ossuaryReels.audioSettings.v1";
  var MUSIC_BUSES = ["MUSIC"];
  var SKIP_BUSES = ["MASTER", "DEBUG"];
  var settings = { music: 1, effects: 1, muted: false };
  var listeners = [];
  var ready = false;

  function clamp01(value, fallback) {
    var n = Number(value);
    if (!isFinite(n)) return fallback;
    return Math.max(0, Math.min(1, n));
  }

  function load() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      settings.music = clamp01(parsed.music, 1);
      settings.effects = clamp01(parsed.effects, 1);
      settings.muted = Boolean(parsed.muted);
    } catch (err) {
      // Sin almacenamiento (privado, bloqueado...): valores por defecto.
    }
  }

  function save() {
    try {
      if (window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      // Igual que en load(): el ajuste sigue valiendo en esta sesion.
    }
  }

  function get() {
    return { music: settings.music, effects: settings.effects, muted: settings.muted };
  }

  function soundMediaElements() {
    return Array.prototype.slice.call(document.querySelectorAll("video[data-ossuary-sound], audio[data-ossuary-sound]"));
  }

  function applyToMedia(el) {
    el.volume = settings.effects;
    el.muted = settings.muted;
  }

  function applyToAudioFramework() {
    var audio = window.OssuaryAudio;
    if (!audio) return;
    (window.OSSUARY_AUDIO_BUSES || []).forEach(function (def) {
      if (SKIP_BUSES.indexOf(def.id) !== -1) return;
      var factor = MUSIC_BUSES.indexOf(def.id) !== -1 ? settings.music : settings.effects;
      if (audio.setBusVolume) audio.setBusVolume(def.id, def.volume * factor);
    });
    if (audio.setMasterVolume) audio.setMasterVolume(settings.muted ? 0 : 1);
  }

  function apply() {
    if (ready) applyToAudioFramework();
    soundMediaElements().forEach(applyToMedia);
    var snapshot = get();
    listeners.slice().forEach(function (fn) {
      try { fn(snapshot); } catch (err) { /* un listener roto no para al resto */ }
    });
  }

  function update(patch) {
    if ("music" in patch) settings.music = clamp01(patch.music, settings.music);
    if ("effects" in patch) settings.effects = clamp01(patch.effects, settings.effects);
    if ("muted" in patch) settings.muted = Boolean(patch.muted);
    save();
    apply();
    return get();
  }

  function onChange(fn) {
    if (typeof fn !== "function") return function () {};
    listeners.push(fn);
    fn(get());
    return function () {
      var i = listeners.indexOf(fn);
      if (i !== -1) listeners.splice(i, 1);
    };
  }

  // Los eventos "play" no burbujean: se escuchan en captura.
  document.addEventListener("play", function (event) {
    var el = event.target;
    if (!el || (el.tagName !== "VIDEO" && el.tagName !== "AUDIO")) return;
    if (!el.muted && el.dataset) el.dataset.ossuarySound = "1";
    if (el.dataset && el.dataset.ossuarySound === "1") applyToMedia(el);
  }, true);

  function init() {
    ready = true;
    apply();
  }

  load();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.OssuaryAudioSettings = {
    get: get,
    setMusicVolume: function (value) { return update({ music: value }); },
    setEffectsVolume: function (value) { return update({ effects: value }); },
    setMuted: function (muted) { return update({ muted: muted }); },
    toggleMuted: function () { return update({ muted: !settings.muted }); },
    onChange: onChange
  };
})();
