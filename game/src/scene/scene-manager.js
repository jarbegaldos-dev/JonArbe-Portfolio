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
      el.autoplay = true;
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

  function getLayerEl(id) {
    // No restringido a sceneLayersRoot: las capas con `root: "structureOverlay"`
    // se montan fuera de #sceneLayers (ver LAYERS.forEach mas arriba).
    return document.querySelector('[data-scene-layer="' + id + '"]');
  }

  function setLayerVisible(id, visible) {
    var el = getLayerEl(id);
    if (!el) return false;
    el.hidden = !visible;
    if (id === "candles") candleSmokeEl.hidden = !visible;
    return true;
  }

  function setGroupVisible(groupId, visible) {
    var el = groupEls[groupId];
    if (!el || el === sceneLayersRoot) return false;
    el.hidden = !visible;
    return true;
  }

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

  // ---- Overlays de debug (solo visuales, no leen ni modifican el estado del juego) ----

  function setDebugClass(name, on) {
    stage.classList.toggle(name, on);
  }

  var coordsBuilt = false;
  function buildCoordinateLabels() {
    if (coordsBuilt) return;
    coordsBuilt = true;
    var overlay = document.createElement("div");
    overlay.className = "ossuary-debug-coords-layer";
    Array.prototype.forEach.call(document.querySelectorAll(".reel-lane"), function (lane) {
      var label = document.createElement("div");
      label.className = "ossuary-debug-coord-label";
      label.style.left = lane.style.left;
      label.style.top = lane.style.top;
      var reelId = lane.dataset.reel || "?";
      label.textContent = reelId + " · " + lane.style.left + ", " + lane.style.top;
      overlay.appendChild(label);
    });
    stage.appendChild(overlay);
  }

  function buildLegend() {
    var legend = document.createElement("div");
    legend.className = "ossuary-debug-legend";
    GROUPS.forEach(function (group) {
      var layersInGroup = LAYERS.filter(function (l) { return l.group === group.id; });
      if (!layersInGroup.length) return;
      layersInGroup.forEach(function (layer) {
        var item = document.createElement("div");
        item.className = "ossuary-debug-legend-item";
        item.textContent = group.label + " › " + layer.label;
        legend.appendChild(item);
      });
    });
    stage.appendChild(legend);
  }

  // ---- Panel de debug (ocultable, fuera del flujo del juego) ----

  function addCheckbox(parent, labelText, defaultChecked, onChange) {
    var row = document.createElement("label");
    row.className = "ossuary-debug-row";
    var input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!defaultChecked;
    input.addEventListener("change", function () {
      onChange(input.checked);
    });
    row.appendChild(input);
    var span = document.createElement("span");
    span.textContent = labelText;
    row.appendChild(span);
    parent.appendChild(row);
    return input;
  }

  function addButton(parent, labelText, onClick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ossuary-debug-button";
    btn.textContent = labelText;
    btn.addEventListener("click", onClick);
    parent.appendChild(btn);
    return btn;
  }

  function addSubtitle(parent, text) {
    var el = document.createElement("div");
    el.className = "ossuary-debug-panel__subtitle";
    el.textContent = text;
    parent.appendChild(el);
  }

  // Los botones de landing del panel de debug solo simulan los giant
  // symbols (no pasan por el bonus state machine real), asi que el FX de
  // ojos de la calavera (que reacciona a bonus:lock-updated) nunca se
  // disparaba al probarlos. Se emite el mismo evento que emite game.js
  // en una landing real, con las 5 costillas BONUS bloqueadas, para que
  // el panel de debug sirva tambien para validar ese FX.
  var DEBUG_LANDING_LOCKED_REELS = (window.OSSUARY_SYMBOL_CONFIG && window.OSSUARY_SYMBOL_CONFIG.RIB_BONUS_REELS) || [];
  function triggerSkullEyesLandingFx() {
    if (!window.OssuaryFX) return;
    window.OssuaryFX.trigger("bonus:lock-updated", {
      lockedRibCount: DEBUG_LANDING_LOCKED_REELS.length,
      lockedReels: DEBUG_LANDING_LOCKED_REELS
    });
  }

  function buildDebugPanel() {
    buildLegend();

    var toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.id = "ossuaryDebugToggle";
    toggleBtn.textContent = "DEBUG";

    var panel = document.createElement("div");
    panel.id = "ossuaryDebugPanel";
    panel.hidden = true;

    var title = document.createElement("div");
    title.className = "ossuary-debug-panel__title";
    title.textContent = "Debug visual";
    panel.appendChild(title);

    addSubtitle(panel, "Overlays");

    addCheckbox(panel, "Geometría de rodillos", false, function (checked) {
      setDebugClass("ossuary-debug-geometry", checked);
    });

    addCheckbox(panel, "Hitboxes de botones", false, function (checked) {
      setDebugClass("ossuary-debug-hitboxes", checked);
    });

    addCheckbox(panel, "Coordenadas de rodillos", false, function (checked) {
      if (checked) buildCoordinateLabels();
      setDebugClass("ossuary-debug-coords", checked);
    });

    addCheckbox(panel, "Nombres de capas", false, function (checked) {
      setDebugClass("ossuary-debug-names", checked);
    });

    addCheckbox(panel, "Capa de interfaz (UI)", true, function (checked) {
      setUiVisible(checked);
    });

    addSubtitle(panel, "Bonus trigger tests");

    addButton(panel, "BONUS RIB passing", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.runTest("BONUS_RIB_PASS");
    });

    addButton(panel, "BONUS landing · 5 BONUS RIB", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.runTest("BONUS_RIB_LAND");
      triggerSkullEyesLandingFx();
    });

    addButton(panel, "BONUS landing · rib1 only", function () {
      // Gameplay real: inicia un BONUS real, genera unicamente rib1,
      // bloquea rib1, lanza el respin real. Nada mas - el resto (respin,
      // fisica RESPIN, ArrivalPhysics, StructureReaction) es el motor real,
      // no este boton. Ver debugForceRealBonusSpin en game.js.
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.forceRealBonusFlow([1]);
    });

    addButton(panel, "BONUS landing · normal bonus (rib1→rib2→rib3)", function () {
      // Gameplay real: exactamente Spin1 rib1 -> respin -> Spin2 rib2 ->
      // respin -> Spin3 rib3 -> fin. Termina en STATE 3 (bonus-feature
      // completa la coleccion en cuanto los 5 rodillos de costilla quedan
      // bloqueados); STERNUM_BONUS nunca se fuerza ni puede aparecer aqui
      // (el Outcome Engine solo lo permite arrancando YA en STATE 3, y esta
      // cadena nunca llega a tener un spin que arranque asi).
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.forceRealBonusFlow([1, 1, 1]);
    });

    addButton(panel, "SUPER BONUS passing", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.runTest("SUPER_BONUS_PASS");
    });

    addButton(panel, "SUPER BONUS landing", function () {
      // Empieza YA en STATE 3 (rib1+rib2+rib3 bloqueados directamente, sin
      // pasar por ningun spin) y ejecuta UN UNICO spin BONUS real que solo
      // puede generar STERNUM_BONUS - rib1/rib2/rib3 ya estan bloqueados, asi
      // que el Outcome Engine no los vuelve a generar en ese spin. Prueba
      // exclusivamente la unica transicion valida de la maquina de estados:
      // STATE 3 -> STATE 4. Ver debugForceSuperBonusFromState3 en game.js.
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.forceSuperBonusFromState3();
    });

    addButton(panel, "Clear giant test", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.clearAll();
    });

    addButton(panel, "RIB1 blade preview", function () {
      // Previsualiza la caida/desvanecido del arte de rib1 (misma funcion que
      // usa el flujo real al terminar la cadena de recoleccion BONUS), sin
      // tener que completar un BONUS entero primero.
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.previewRib1FallAway();
    });

    addButton(panel, "RIB1 rope rig preview", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.previewRib1BladeRig();
    });

    addButton(panel, "Free spins", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.enterFreeSpinsMode();
    });

    addSubtitle(panel, "Cuchilla pequeña · pájaro / esqueleto");

    addButton(panel, "Pájaro se posa (aparición)", function () {
      if (window.OssuarySmallBladeDebug) window.OssuarySmallBladeDebug.perchBird();
    });

    addButton(panel, "Pájaro muerto cae", function () {
      if (window.OssuarySmallBladeDebug) window.OssuarySmallBladeDebug.birdFall();
    });

    addButton(panel, "Esqueleto tira piedra", function () {
      if (window.OssuarySmallBladeDebug) window.OssuarySmallBladeDebug.stoneThrow();
    });

    addSubtitle(panel, "Free spins · símbolos pobre/noble/rico");

    var FREESPIN_PREVIEW_REELS = [
      "rib2-left", "rib2-right",
      "rib3-left", "rib3-right",
      "rib4-left", "rib4-right",
      "rib5-left", "rib5-right"
    ];

    [
      { symbol: "POBRE", label: "POBRE (todas las rib 2-5)" },
      { symbol: "NOBLE", label: "NOBLE (todas las rib 2-5)" },
      { symbol: "RICO", label: "RICO (todas las rib 2-5)" }
    ].forEach(function (entry) {
      addButton(panel, entry.label, function () {
        if (!window.OssuaryDebugPreview) return;
        // Preview estatico: rellena las 8 mitades a la vez (izq espejadas) para
        // ver arte base + sobre-imagen interior + modo espejo de un vistazo.
        FREESPIN_PREVIEW_REELS.forEach(function (reelId) {
          window.OssuaryDebugPreview.previewFreeSpinSymbol(reelId, entry.symbol);
        });
      });
    });

    addButton(panel, "Limpiar preview free spins", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.clearAll();
    });

    addSubtitle(panel, "BIG WIN counter");

    // Importes variados para comprobar que el ritmo cuadra con la música
    // sea cual sea la ganancia (con apuesta 1: 15 no lleva música, el resto sí).
    [15, 87, 1000, 20000].forEach(function (amount) {
      addButton(panel, "Contador BIG WIN · " + amount, function () {
        if (window.OssuaryPaymentDebug) window.OssuaryPaymentDebug.forceBigWin(amount);
      });
    });

    addButton(panel, "Ocultar contador BIG WIN", function () {
      if (window.OssuaryPaymentDebug && window.OssuaryPaymentDebug.hideBigWin) {
        window.OssuaryPaymentDebug.hideBigWin();
      }
    });

    addSubtitle(panel, "Animated ancestral wins");

    addButton(panel, "Force 3-symbol ancestral win", function () {
      if (window.OssuaryWinSymbolDebug) window.OssuaryWinSymbolDebug.force3();
    });

    addButton(panel, "Force 4-symbol ancestral win", function () {
      if (window.OssuaryWinSymbolDebug) window.OssuaryWinSymbolDebug.force4();
    });

    addButton(panel, "Force 5-symbol ancestral win", function () {
      if (window.OssuaryWinSymbolDebug) window.OssuaryWinSymbolDebug.force5();
    });

    addButton(panel, "Play animation again", function () {
      if (window.OssuaryWinSymbolDebug) window.OssuaryWinSymbolDebug.replayForcedWin();
    });

    addButton(panel, "Restore normal game", function () {
      if (window.OssuaryWinSymbolDebug) window.OssuaryWinSymbolDebug.restoreNormalGame();
    });

    addSubtitle(panel, "Vista previa de símbolos (temporal)");

    if (false) { // Legacy preview block kept disabled for reference.
    var BONUS_RIB_PREVIEW_REELS = [
      { id: "rib1", label: "BONUS RIB · Rib 1 (3)" },
      { id: "rib2-left", label: "BONUS RIB · Rib 2 izq (2)" },
      { id: "rib2-right", label: "BONUS RIB · Rib 2 der (2)" },
      { id: "rib3-left", label: "BONUS RIB · Rib 3 izq (2)" },
      { id: "rib3-right", label: "BONUS RIB · Rib 3 der (2)" }
    ];

    BONUS_RIB_PREVIEW_REELS.forEach(function (entry) {
      addButton(panel, entry.label, function () {
        if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.showGiant(entry.id, "RIB_BONUS");
      });
    });

    addButton(panel, "SUPER BONUS · Esternón (3)", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.showGiant("sternum", "STERNUM_BONUS");
    });

    addButton(panel, "Mostrar TODAS las posiciones", function () {
      if (!window.OssuaryDebugPreview) return;
      BONUS_RIB_PREVIEW_REELS.forEach(function (entry) {
        window.OssuaryDebugPreview.showGiant(entry.id, "RIB_BONUS");
      });
      window.OssuaryDebugPreview.showGiant("sternum", "STERNUM_BONUS");
    });

    addButton(panel, "Limpiar vista previa", function () {
      if (window.OssuaryDebugPreview) window.OssuaryDebugPreview.clearAll();
    });

    }

    addSubtitle(panel, "Capas");

    GROUPS.forEach(function (group) {
      var layersInGroup = LAYERS.filter(function (l) { return l.group === group.id; });
      var groupHeader = document.createElement("div");
      groupHeader.className = "ossuary-debug-group-label";
      groupHeader.textContent = layersInGroup.length
        ? group.label
        : group.label + " (sin assets aún)";
      panel.appendChild(groupHeader);

      layersInGroup.forEach(function (layer) {
        addCheckbox(panel, layer.label, !layer.hidden, function (checked) {
          setLayerVisible(layer.id, checked);
        });
      });
    });

    toggleBtn.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
    });

    document.body.appendChild(toggleBtn);
    document.body.appendChild(panel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildDebugPanel);
  } else {
    buildDebugPanel();
  }

  window.OssuarySceneManager = {
    setLayerVisible: setLayerVisible,
    setGroupVisible: setGroupVisible,
    setUiVisible: setUiVisible,
    setBonusBackgroundActive: setBonusBackgroundActive
  };
})();
