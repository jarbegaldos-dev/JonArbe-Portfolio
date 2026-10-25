(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Golpe al entrar en el Execution Bonus — SOLO presentacion.
  //
  // Cuando la cadena se completa (game.js, rama NORMAL_BONUS de
  // handleBonusNextAction), antes de la entrada del bonus: la maquina da un
  // temblor seco, un destello rojo sangre desde los bordes, un golpe grave y la
  // musica se hunde hasta que sale la entrada (el hueco de silencio hace que el
  // golpe pegue). Peticion del usuario (2026-10-15). Estilos:
  // src/fx/bonus-entry-hit.css.
  // ---------------------------------------------------------------------------

  var SHAKE_MS = 520;
  var FLASH_MS = 900;

  var flashEl = null;
  var flashTimer = 0;

  function speedMs(ms) {
    var speed = window.OssuaryGameSpeed;
    return speed && typeof speed.ms === "function" ? speed.ms(ms) : ms;
  }

  function ensureFlash() {
    if (flashEl && flashEl.isConnected) return flashEl;
    flashEl = document.createElement("div");
    flashEl.className = "bonus-entry-hit";
    flashEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(flashEl);
    return flashEl;
  }

  // Temblor con `translate` en modo "add": el escenario y el HUD ya usan
  // translate para colocarse (responsive-layout) y se suma a su posicion.
  function shake(el) {
    if (!el || typeof el.animate !== "function") return;
    el.animate([
      { translate: "0 0" },
      { translate: "-9px 6px", offset: 0.08 },
      { translate: "8px -5px", offset: 0.2 },
      { translate: "-6px 3px", offset: 0.34 },
      { translate: "4px -2px", offset: 0.5 },
      { translate: "-2px 1px", offset: 0.68 },
      { translate: "1px 0", offset: 0.84 },
      { translate: "0 0" }
    ], { duration: speedMs(SHAKE_MS), easing: "ease-out", composite: "add" });
  }

  // silenceMs: cuanto se hunde la musica (hasta la entrada del bonus).
  function play(options) {
    options = options || {};
    var flash = ensureFlash();
    flash.classList.remove("is-on");
    void flash.offsetWidth;
    flash.style.animationDuration = speedMs(FLASH_MS) + "ms";
    flash.classList.add("is-on");
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(function () {
      flash.classList.remove("is-on");
    }, speedMs(FLASH_MS) + 50);
    // Solo la maquina (escena, rodillos y estructura), no #slotStage: el HUD
    // vive dentro con position: fixed y un translate en el escenario lo
    // convertiria en su referencia y lo haria saltar.
    ["sceneLayers", "reelLayer", "structureOverlay"].forEach(function (id) {
      shake(document.getElementById(id));
    });
    if (window.OssuaryAudio) {
      window.OssuaryAudio.trigger("bonus_entry_hit");
      if (typeof window.OssuaryAudio.duck === "function") {
        window.OssuaryAudio.duck("MUSIC", 0.92, Math.max(300, Number(options.silenceMs) || 1800));
      }
    }
  }

  window.OssuaryBonusEntryHit = { play: play };
})();
