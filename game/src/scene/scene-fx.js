(function () {
  "use strict";

  function formatLayerOffset(value) {
    return typeof value === "number" ? `${value}px` : value;
  }

  function createSceneFx(options) {
    const stage = options.stage;
    const state = options.state;
    const config = options.config || {};
    const hooks = options.hooks || {};

    const sceneLayers = new Map(
      Array.from(document.querySelectorAll("[data-scene-layer]"))
        .map((layer) => [layer.dataset.sceneLayer, layer])
    );
    const bonusFxLayers = new Map(
      Array.from(document.querySelectorAll("[data-bonus-fx]"))
        .map((layer) => [layer.dataset.bonusFx, layer])
    );

    const bonusFxDuration = config.BONUS_FX_DURATION;
    const bonusFxByOutcome = config.BONUS_FX_BY_OUTCOME || {};
    const sceneFxClasses = config.SCENE_FX_CLASSES || [];
    const sceneFxClassById = config.SCENE_FX_CLASS_BY_ID || {};

    function setSceneLayer(layerId, layerOptions = {}) {
      const layer = sceneLayers.get(layerId);
      if (!layer) return false;

      if (Object.prototype.hasOwnProperty.call(layerOptions, "visible")) {
        layer.hidden = !layerOptions.visible;
      }
      if (Object.prototype.hasOwnProperty.call(layerOptions, "x")) {
        layer.style.setProperty("--layer-x", formatLayerOffset(layerOptions.x));
      }
      if (Object.prototype.hasOwnProperty.call(layerOptions, "y")) {
        layer.style.setProperty("--layer-y", formatLayerOffset(layerOptions.y));
      }
      if (Object.prototype.hasOwnProperty.call(layerOptions, "scale")) {
        layer.style.setProperty("--layer-scale", String(layerOptions.scale));
      }
      if (Object.prototype.hasOwnProperty.call(layerOptions, "rotate")) {
        layer.style.setProperty("--layer-rotate", typeof layerOptions.rotate === "number" ? `${layerOptions.rotate}deg` : layerOptions.rotate);
      }
      if (Object.prototype.hasOwnProperty.call(layerOptions, "opacity")) {
        layer.style.setProperty("--layer-opacity", String(layerOptions.opacity));
      }
      if (Object.prototype.hasOwnProperty.call(layerOptions, "active")) {
        layer.classList.toggle("is-active", Boolean(layerOptions.active));
      }

      return true;
    }

    function showSceneLayer(layerId) {
      return setSceneLayer(layerId, { visible: true });
    }

    function hideSceneLayer(layerId) {
      return setSceneLayer(layerId, { visible: false });
    }

    function moveSceneLayer(layerId, x, y) {
      return setSceneLayer(layerId, { x, y });
    }

    function scaleSceneLayer(layerId, scale) {
      return setSceneLayer(layerId, { scale });
    }

    function setSceneFxClass(fxId) {
      stage.classList.remove(...sceneFxClasses);
      if (fxId && sceneFxClassById[fxId]) {
        stage.classList.add(sceneFxClassById[fxId]);
      }
      state.sceneFx = fxId || "";
    }

    function clearBonusFxLayers() {
      for (const layer of bonusFxLayers.values()) {
        layer.hidden = true;
        layer.classList.remove("is-active");
      }
      setSceneFxClass("");
    }

    function activateBonusFx(fxId, duration = bonusFxDuration) {
      const layer = bonusFxLayers.get(fxId);
      if (!layer) return false;

      setSceneFxClass(fxId);
      layer.hidden = false;
      layer.classList.remove("is-active");
      const fxRunId = `${Date.now()}-${Math.random()}`;
      layer.dataset.fxRun = fxRunId;
      void layer.offsetWidth;
      layer.classList.add("is-active");

      if (duration > 0) {
        window.setTimeout(() => {
          if (layer.dataset.fxRun !== fxRunId) return;
          layer.hidden = true;
          layer.classList.remove("is-active");
        }, duration);
      }

      return true;
    }

    function nearBonusFromOutcome() {
      const hasSternumBonus = state.sternumReel.giantSymbol === hooks.sternumGiantSymbol;
      const ribTriggerItems = typeof hooks.bonusRibTriggerItems === "function"
        ? hooks.bonusRibTriggerItems()
        : [];
      const ribTriggerCount = ribTriggerItems.filter((item) => item.present).length;
      const bonusTriggerMet = typeof hooks.isBonusTriggerConditionMet === "function"
        ? hooks.isBonusTriggerConditionMet()
        : false;
      return !bonusTriggerMet && (hasSternumBonus || ribTriggerCount > 0);
    }

    function activateBonusFxForOutcome(bonus) {
      clearBonusFxLayers();

      if (bonus) {
        activateBonusFx(bonusFxByOutcome[bonus]);
        return;
      }

      if (nearBonusFromOutcome()) {
        activateBonusFx("near_bonus");
      }
    }

    function expose() {
      window.OssuaryScene = {
        setLayer: setSceneLayer,
        showLayer: showSceneLayer,
        hideLayer: hideSceneLayer,
        moveLayer: moveSceneLayer,
        scaleLayer: scaleSceneLayer,
        activateBonusFx,
        clearBonusFx: clearBonusFxLayers
      };
    }

    return {
      formatLayerOffset,
      setSceneLayer,
      showSceneLayer,
      hideSceneLayer,
      moveSceneLayer,
      scaleSceneLayer,
      setSceneFxClass,
      clearBonusFxLayers,
      activateBonusFx,
      nearBonusFromOutcome,
      activateBonusFxForOutcome,
      expose
    };
  }

  window.OssuarySceneFx = {
    create: createSceneFx
  };
})();
