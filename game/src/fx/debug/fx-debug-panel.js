(function () {
  "use strict";

  // Herramienta de calibracion en consola para el sistema de FX. No lee ni
  // muta estado de juego (state, reels, balance, etc.): solo reposiciona
  // elementos de FX ya montados y ajusta sus variables CSS en caliente.
  // Los cambios aqui son temporales (no persisten a disco); una vez se
  // encuentran los valores correctos, se escriben a mano en
  // fx-anchors.config.js / fx-effects.config.js / style.css.

  function effectsUsingAnchor(anchorId) {
    var entries = window.OSSUARY_FX_EFFECTS || [];
    return entries.filter(function (entry) {
      return entry.anchor === anchorId;
    });
  }

  function repositionEffect(effectId, anchorId) {
    var effectDef = window.OssuaryFXRegistry && window.OssuaryFXRegistry.get(effectId);
    if (!effectDef || typeof effectDef.getElement !== "function") {
      return;
    }
    var element = effectDef.getElement();
    if (!element) {
      return;
    }
    var entry = (window.OSSUARY_FX_EFFECTS || []).filter(function (e) {
      return e.id === effectId;
    })[0];
    var offsetX = entry && entry.offset ? entry.offset.x || 0 : 0;
    var offsetY = entry && entry.offset ? entry.offset.y || 0 : 0;
    var position = window.OssuaryFXPositionResolver.resolveAnchor(anchorId);
    element.style.left = (position.xPercent + offsetX) + "%";
    element.style.top = (position.yPercent + offsetY) + "%";
  }

  // Actualiza un anchor manual (fx-anchors.config.js) en caliente y
  // reposiciona cualquier efecto ya montado que lo use. No tiene efecto
  // sobre anchors derivados de layout.config.js (rib*/sternum): esos son
  // geometria real y no se editan desde aqui.
  function setAnchor(anchorId, point) {
    if (!window.OSSUARY_FX_ANCHORS) {
      console.warn("[OssuaryFXDebug] fx-anchors.config.js no esta cargado.");
      return null;
    }
    if (!window.OSSUARY_FX_ANCHORS[anchorId]) {
      console.warn("[OssuaryFXDebug] '" + anchorId + "' no es un anchor manual. Los anchors de reels/sternum se derivan de layout.config.js y no se editan aqui.");
      return null;
    }
    window.OSSUARY_FX_ANCHORS[anchorId] = { x: point.x, y: point.y };
    effectsUsingAnchor(anchorId).forEach(function (entry) {
      repositionEffect(entry.id, anchorId);
    });
    return window.OSSUARY_FX_ANCHORS[anchorId];
  }

  // Set generico de cualquier variable CSS (--fx-eye-spacing, --fx-eye-size,
  // --fx-eye-blur, --fx-eye-base-opacity, --fx-eye-particle-intensity, ...)
  // sobre el elemento ya montado de un efecto. No es especifico de ojos:
  // funciona para cualquier efecto type:"css" que use variables propias.
  function setVar(effectId, varName, value) {
    var element = getElement(effectId);
    if (!element) {
      console.warn("[OssuaryFXDebug] '" + effectId + "' no esta montado todavia. Llama a OssuaryFX.activate primero.");
      return;
    }
    element.style.setProperty(varName, value);
  }

  function getElement(effectId) {
    var effectDef = window.OssuaryFXRegistry && window.OssuaryFXRegistry.get(effectId);
    return effectDef && typeof effectDef.getElement === "function" ? effectDef.getElement() : null;
  }

  window.OssuaryFXDebug = {
    setAnchor: setAnchor,
    setVar: setVar,
    getElement: getElement
  };
})();
