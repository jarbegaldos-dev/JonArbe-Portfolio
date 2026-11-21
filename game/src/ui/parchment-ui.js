(function () {
  "use strict";

  // Botones de pergamino (peticion del usuario, 2026-10-18): la placa de
  // pergamino con marco de hierro y rubies de su hoja de botones, sin texto
  // (tools/bake-parchment-ui.js), con la palabra encima en tinta y en la letra
  // del juego (Moria Citadel). La llevan PLAY del cofre y de la entrada de
  // los bonus, GAMBLE y COLLECT de la ruleta y CONTINUE del resumen.
  // Solo presentacion: decorate() viste el mismo <button> (sus listeners y su
  // estado disabled no cambian). Estilos en src/ui/parchment-ui.css.

  var BUTTON_SRC = "assets/ui/parchment/button.webp";
  // Arte de la ruleta que va a memoria con la placa (los pergaminos).
  var PRELOAD = [
    BUTTON_SRC,
    "assets/ruleta/scroll/story.webp",
    "assets/ruleta/scroll/keys.webp",
    "assets/bonus_intro/execution_full.webp",
    "assets/ruleta/scroll/logo-super.webp"
  ];

  // Copia en memoria (blob:) si ya esta: el servidor manda las imagenes con
  // no-store y un boton no debe salir sin su placa.
  function art(src) {
    var r = window.OssuarySymbolRenderer;
    return r && r.residentArtUrl ? r.residentArtUrl(src) : src;
  }

  function preload() {
    var r = window.OssuarySymbolRenderer;
    if (!r || !r.preloadArt) return Promise.resolve(false);
    return Promise.all(PRELOAD.map(function (src) { return r.preloadArt(src); }));
  }

  function setLabel(btn, text) {
    var label = btn && btn.querySelector(":scope > .parchment-btn__label");
    if (label) label.textContent = text;
  }

  // Placa (imagen), brillo de los rubies y la palabra. Se puede llamar otra
  // vez: solo cambia la palabra.
  function decorate(btn, text) {
    if (!btn) return btn;
    if (btn.classList.contains("parchment-btn")) {
      setLabel(btn, text);
      return btn;
    }
    btn.classList.add("parchment-btn");
    btn.textContent = "";
    var plate = document.createElement("img");
    plate.className = "parchment-btn__plate";
    plate.src = art(BUTTON_SRC);
    plate.alt = "";
    plate.draggable = false;
    plate.decoding = "sync";
    var gems = document.createElement("span");
    gems.className = "parchment-btn__gems";
    gems.setAttribute("aria-hidden", "true");
    var label = document.createElement("span");
    label.className = "parchment-btn__label";
    label.textContent = text;
    btn.appendChild(plate);
    btn.appendChild(gems);
    btn.appendChild(label);
    return btn;
  }

  function schedulePreload() {
    window.setTimeout(preload, 2500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedulePreload, { once: true });
  else schedulePreload();

  window.OssuaryParchment = {
    BUTTON_SRC: BUTTON_SRC,
    art: art,
    preload: preload,
    decorate: decorate,
    setLabel: setLabel
  };
})();
