(function () {
  "use strict";

  // Player generico para efectos type: "trajectory". A diferencia de
  // css-fx-player.js (que coloca algo EN un anchor), este conecta DOS
  // anchors (entry.source -> entry.target) con un unico elemento: lo
  // centra en el punto medio del trayecto, le da de ancho la longitud
  // real del trayecto y lo rota al angulo correcto. El aspecto visual
  // (gradiente/animacion de "energia viajando") vive en una clase
  // fx-visual--<visualId> en style.css, igual que en css-fx-player.js.

  function resolveZIndex(entry) {
    if (entry.zIndex != null) {
      return entry.zIndex;
    }
    var layerDef = window.OSSUARY_FX_LAYERS && window.OSSUARY_FX_LAYERS[entry.layer];
    return layerDef ? layerDef.zIndex : 0;
  }

  function createTrajectoryFxPlayer(entry) {
    var element = null;
    var autoDeactivateTimer = null;

    function mount() {
      var stage = document.getElementById("slotStage");
      if (!stage) {
        console.warn("[OssuaryFX] " + entry.id + ": #slotStage not found, mount skipped.");
        return;
      }
      var path = window.OssuaryFXPositionResolver.resolvePath(entry.source, entry.target);

      element = document.createElement("div");
      element.className = "fx-trajectory-layer fx-visual--" + (entry.visualId || entry.id);
      element.setAttribute("aria-hidden", "true");
      element.style.left = path.xPercent + "%";
      element.style.top = path.yPercent + "%";
      element.style.width = path.lengthPercent + "%";
      element.style.zIndex = String(resolveZIndex(entry));
      element.style.setProperty("--fx-trajectory-angle", path.angleDeg + "deg");
      element.style.setProperty("--fx-trajectory-duration", (entry.duration || 280) + "ms");
      if (entry.intensity != null) {
        element.style.setProperty("--fx-trajectory-intensity", entry.intensity);
      }
      stage.appendChild(element);
    }

    function activate() {
      if (!element) {
        return;
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

  window.OssuaryFXTrajectoryPlayer = {
    create: createTrajectoryFxPlayer
  };
})();
