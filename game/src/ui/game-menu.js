(function () {
  "use strict";

  // Contenido del menu central (#menuPanel): volumen de musica y de efectos,
  // sonido si/no y reglas del juego. Abrir y cerrar el menu lo hace
  // src/ui/controls.js (toggleMenu); RESTART GAME tambien (hook resetGame).
  // Este modulo solo enlaza los mandos con OssuaryAudioSettings y
  // OssuaryRulesScreen. Solo presentacion.

  function byId(id) {
    return document.getElementById(id);
  }

  function click() {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("button_click");
  }

  function init() {
    var menuPanel = byId("menuPanel");
    var music = byId("musicVolumeInput");
    var musicOut = byId("musicVolumeValue");
    var effects = byId("effectsVolumeInput");
    var effectsOut = byId("effectsVolumeValue");
    var mute = byId("muteToggleBtn");
    var rulesBtn = byId("openRulesBtn");
    var settings = window.OssuaryAudioSettings;

    function paintRange(input, value) {
      if (!input) return;
      input.value = String(value);
      input.style.setProperty("--fill", value + "%");
    }

    if (settings) {
      settings.onChange(function (s) {
        var m = Math.round(s.music * 100);
        var e = Math.round(s.effects * 100);
        paintRange(music, m);
        paintRange(effects, e);
        if (musicOut) musicOut.textContent = String(m);
        if (effectsOut) effectsOut.textContent = String(e);
        if (mute) {
          mute.textContent = s.muted ? "SOUND OFF" : "SOUND ON";
          mute.setAttribute("aria-pressed", s.muted ? "true" : "false");
          mute.classList.toggle("is-active", s.muted);
        }
        if (menuPanel) menuPanel.classList.toggle("is-muted", s.muted);
      });
      if (music) music.addEventListener("input", function () {
        settings.setMusicVolume(Number(music.value) / 100);
      });
      if (effects) {
        effects.addEventListener("input", function () {
          settings.setEffectsVolume(Number(effects.value) / 100);
        });
        // Al soltar, un clic de muestra con el volumen nuevo.
        effects.addEventListener("change", click);
      }
      if (mute) mute.addEventListener("click", function () {
        settings.toggleMuted();
        click();
      });
    }

    if (rulesBtn) rulesBtn.addEventListener("click", function () {
      click();
      if (menuPanel) menuPanel.hidden = true;
      if (window.OssuaryRulesScreen) window.OssuaryRulesScreen.open();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
