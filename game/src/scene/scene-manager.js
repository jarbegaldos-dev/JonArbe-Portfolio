(function () {
  "use strict";

  var GROUPS = window.OSSUARY_SCENE_GROUPS || [];
  var LAYERS = window.OSSUARY_SCENE_LAYERS || [];

  var sceneLayersRoot = document.getElementById("sceneLayers");
  var structureOverlayRoot = document.getElementById("structureOverlay");
  var stage = document.getElementById("slotStage");
  var groupEls = {};

  function groupClassName(groupId) {
    return "scene-layer-group scene-layer-group--" + groupId.replace(/_/g, "-");
  }

  function ensureGroupEl(groupId) {
    if (groupEls[groupId]) return groupEls[groupId];
    var group = GROUPS.filter(function (g) { return g.id === groupId; })[0];
    if (group && group.wrapped === false) {
      groupEls[groupId] = sceneLayersRoot;
      return sceneLayersRoot;
    }
    var el = document.createElement("div");
    el.className = groupClassName(groupId);
    el.dataset.sceneGroup = groupId;
    sceneLayersRoot.appendChild(el);
    groupEls[groupId] = el;
    return el;
  }

  // Crea los grupos en el orden declarado para que el orden en el DOM
  // (y por tanto el apilado visual) coincida con el markup original.
  GROUPS.forEach(function (group) {
    if (group.wrapped !== false) ensureGroupEl(group.id);
  });

  LAYERS.forEach(function (layer) {
    // `root: "structureOverlay"` saca la capa de #sceneLayers y la monta en
    // su propio contenedor de nivel superior (ver index.html), para que
    // quede inmune a cualquier transform que reciba #sceneLayers (ver
    // scene.config.js, capa ribcage_overlay_top).
    var parent = (layer.root === "structureOverlay" && structureOverlayRoot)
      ? structureOverlayRoot
      : ensureGroupEl(layer.group);
    var el;
    if (layer.type === "video") {
      el = document.createElement("video");
      el.src = layer.src;
      el.muted = true;
      el.autoplay = !(window.OssuaryMobileAlpha.enabled && layer.hidden);
      el.loop = true;
      el.preload = "auto";
      el.playsInline = true;
      el.setAttribute("muted", "");
      el.setAttribute("preload", "auto");
      el.setAttribute("playsinline", "");
      el.disablePictureInPicture = true;
      el.disableRemotePlayback = true;
    } else {
      el = document.createElement("img");
      el.src = layer.src;
      el.alt = "";
      el.draggable = false;
    }
    el.className = layer.class;
    el.dataset.sceneLayer = layer.id;
    if (layer.bonusFx) el.dataset.bonusFx = layer.bonusFx;
    if (layer.hidden) el.hidden = true;
    parent.appendChild(el);
  });

  // El stage tiene una proporción fija (1525:779); si la ventana no coincide
  // exactamente, queda una franja fuera del stage. Para que no se vea negra,
  // pintamos ahí el mismo fondo configurado en background_base.
  var backdropLayer = LAYERS.filter(function (l) { return l.id === "background_base"; })[0];
  if (backdropLayer && backdropLayer.type !== "video") {
    document.getElementById("gameRoot").style.backgroundImage = "url('" + backdropLayer.src + "')";
  } else if (backdropLayer) {
    // Un <video> no sirve de background-image: la franja lleva un fotograma
    // fijo del propio video (mismo encuadre: cover y centrado en el CSS).
    document.getElementById("gameRoot").style.backgroundImage =
      "url('assets/backgrounds/background_base_poster.jpg')";
  } else {
    document.getElementById("gameRoot").style.backgroundColor = "#000";
  }

  // Humo ambiental de las velas: generado con CSS puro (sin asset ni canvas),
  // sigue la visibilidad de la capa "candles".
  var candleSmokeEl = document.createElement("div");
  candleSmokeEl.id = "candleSmoke";
  candleSmokeEl.appendChild(document.createElement("span")).className = "candle-smoke-puff";
  candleSmokeEl.appendChild(document.createElement("span")).className = "candle-smoke-puff";
  candleSmokeEl.appendChild(document.createElement("span")).className = "candle-smoke-puff";
  var candlesImg = getLayerEl("candles");
  if (candlesImg) {
    candlesImg.insertAdjacentElement("afterend", candleSmokeEl);
    candleSmokeEl.hidden = candlesImg.hidden;
  } else {
    candleSmokeEl.hidden = true;
  }

  // Profundidad del marco: capa de luz direccional justo detras del marco
  // frontal en el DOM (por debajo del cofre y del resto de piezas de
  // #structureOverlay). Lleva sus mismas clases, asi que comparte caja y
  // transform; el estilo y la mascara estan en style.css (.frame-depth).
  // Sigue la visibilidad de la capa del marco.
  var frameLightEl = null;
  var frameImg = getLayerEl("ribcage_overlay_top");
  if (frameImg) {
    frameLightEl = document.createElement("div");
    frameLightEl.className = frameImg.className + " frame-depth frame-depth--light";
    frameLightEl.setAttribute("aria-hidden", "true");
    frameLightEl.hidden = frameImg.hidden;
    frameImg.insertAdjacentElement("afterend", frameLightEl);
  }

  function getLayerEl(id) {
    // No restringido a sceneLayersRoot: las capas con `root: "structureOverlay"`
    // se montan fuera de #sceneLayers (ver LAYERS.forEach mas arriba).
    return document.querySelector('[data-scene-layer="' + id + '"]');
  }

  // Hidden HD backgrounds must not keep a second mobile decoder running.
  function syncMobileBackgrounds() {
    if (!window.OssuaryMobileAlpha.enabled) return;
    document.querySelectorAll('video[data-scene-layer]').forEach(function (video) {
      if (document.hidden || video.closest('[hidden]')) video.pause();
      else video.play().catch(function () {});
    });
  }
  document.addEventListener('visibilitychange', syncMobileBackgrounds);

  function setLayerVisible(id, visible) {
    var el = getLayerEl(id);
    if (!el) return false;
    el.hidden = !visible;
    syncMobileBackgrounds();
    if (id === "candles") candleSmokeEl.hidden = !visible;
    if (id === "ribcage_overlay_top" && frameLightEl) frameLightEl.hidden = !visible;
    return true;
  }

  function setGroupVisible(groupId, visible) {
    var el = groupEls[groupId];
    if (!el || el === sceneLayersRoot) return false;
    el.hidden = !visible;
    syncMobileBackgrounds();
    return true;
  }

  // Mobile pauses the hidden background; desktop retains continuous loops.
  // Alterna el fondo de vídeo entre el principal (background_base) y el del
  // Bonus Game FREE SPIN normal (background_bonus_freespins). Ambos <video>
  // están montados desde el arranque con autoplay+loop y NUNCA se pausan ni
  // se reinician aquí: solo se alterna qué capa queda oculta, para que el
  // vídeo de fondo del bonus siga sonando/reproduciendose de forma continua
  // aunque no se este mostrando en ese momento.
  function setBonusBackgroundActive(active) {
    var shown = setLayerVisible("background_bonus_freespins", Boolean(active));
    var hiddenBase = setLayerVisible("background_base", !active);
    setLayerVisible("chest_normal_game", !active);
    return shown && hiddenBase;
  }

  function setUiVisible(visible) {
    var ui = document.getElementById("uiLayer");
    if (!ui) return false;
    ui.style.display = visible ? "" : "none";
    return true;
  }

  // El panel DEBUG vive en src/debug/debug-menu.js (rehecho 2026-10-15) y
  // usa esta API para las capas y la capa de interfaz.

  window.OssuarySceneManager = {
    setLayerVisible: setLayerVisible,
    setGroupVisible: setGroupVisible,
    setUiVisible: setUiVisible,
    setBonusBackgroundActive: setBonusBackgroundActive
  };
})();
