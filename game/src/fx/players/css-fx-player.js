(function () {
  "use strict";

  function resolveZIndex(entry) {
    if (entry.zIndex != null) {
      return entry.zIndex;
    }
    var layerDef = window.OSSUARY_FX_LAYERS && window.OSSUARY_FX_LAYERS[entry.layer];
    return layerDef ? layerDef.zIndex : 0;
  }

  // Player generico para efectos type: "css". No conoce el aspecto visual
  // de ningun efecto en particular: solo coloca, escala, ajusta opacidad y
  // capa segun la entrada declarativa de fx-effects.config.js. El aspecto
  // (gradiente/animacion) vive en una clase "fx-visual--<id>" en style.css.
  function createCssFxPlayer(entry) {
    var element = null;
    var autoDeactivateTimer = null;

    function mount() {
      var stage = document.getElementById("slotStage");
      if (!stage) {
        console.warn("[OssuaryFX] " + entry.id + ": #slotStage not found, mount skipped.");
        return;
      }
      var position = window.OssuaryFXPositionResolver.resolveAnchor(entry.anchor);
      var offsetX = entry.offset ? entry.offset.x || 0 : 0;
      var offsetY = entry.offset ? entry.offset.y || 0 : 0;

      element = document.createElement("div");
      // visualId permite que varias entradas (ej. una por costilla)
      // compartan exactamente la misma clase/aspecto visual. Si no se
      // define, cae en entry.id (comportamiento identico al anterior).
      element.className = "fx-css-layer fx-visual--" + (entry.visualId || entry.id);
      element.setAttribute("aria-hidden", "true");
      element.style.left = (position.xPercent + offsetX) + "%";
      element.style.top = (position.yPercent + offsetY) + "%";
      element.style.zIndex = String(resolveZIndex(entry));
      element.style.mixBlendMode = entry.blendMode || "normal";
      element.style.setProperty("--fx-scale", entry.scale != null ? entry.scale : 1);
      element.style.setProperty("--fx-target-opacity", entry.opacity != null ? entry.opacity : 1);
      stage.appendChild(element);
    }

    function activate(params) {
      if (!element) {
        return;
      }
      if (params && params.intensity != null) {
        element.dataset.intensity = params.intensity;
      }
      element.classList.add("is-active");
      if (autoDeactivateTimer) {
        clearTimeout(autoDeactivateTimer);
        autoDeactivateTimer = null;
      }
      if (!entry.loop && entry.duration) {
        autoDeactivateTimer = window.setTimeout(deactivate, entry.duration);
      }
    }

    function deactivate() {
      if (!element) {
        return;
      }
      element.classList.remove("is-active");
      if (autoDeactivateTimer) {
        clearTimeout(autoDeactivateTimer);
        autoDeactivateTimer = null;
      }
    }

    function dispose() {
      deactivate();
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
      element = null;
    }

    return {
      mount: mount,
      activate: activate,
      deactivate: deactivate,
      dispose: dispose,
      getElement: function () {
        return element;
      }
    };
  }

  window.OssuaryFXCssPlayer = {
    create: createCssFxPlayer
  };
})();
