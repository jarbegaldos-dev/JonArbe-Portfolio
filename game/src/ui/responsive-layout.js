/* Layout responsive de Ossuary Reels. SOLO presentacion: no toca juego,
   pagos, RNG ni estado.

   Problema que resuelve: #slotStage medía siempre el 100% del alto de la
   ventana y el HUD va pegado a los bordes de la ventana, asi que en ventanas
   estrechas el HUD acababa encima de la maquina (y de los simbolos).

   Coloca el escenario (#slotStage) con una escala k <= 1 y elige entre dos
   colocaciones del HUD segun la forma de la ventana:
   - rl-side: HUD en los laterales (trebol y libro de cuentas a la izquierda,
     reloj de arena y BUY BONUS a la derecha). Si no cabe, la maquina encoge
     y se centra entre los dos ("zona segura").
   - rl-stacked: ventana cuadrada o vertical. La maquina arriba y el HUD
     debajo: fila del trebol y el BUY BONUS, libro de cuentas y el reloj de
     arena tumbado.
   El fondo (videos .scene-layer--base) no encoge: se contra-escala para
   cubrir la ventana con el mismo encuadre de siempre.

   Todo lo que vive dentro de #slotStage (rodillos, marco, FX anclados en %)
   escala junto con el. Los estilos estan en src/ui/responsive-layout.css.
   Se carga antes que el resto de scripts para que su listener de resize
   corra primero: game.js y los FX re-miden casillas en su propio resize. */
(function () {
  "use strict";

  // Escenario de referencia 1525x779 (layout.config.js).
  var STAGE_ASPECT = 1525 / 779;
  // Escala y desplazamiento de #sceneLayers/#reelLayer/#structureOverlay
  // (style.css, bloque "Layout vertical derecho").
  var LAYER_SCALE = 1.13;
  var LAYER_SHIFT_Y = 0.052;
  // Cajas medidas en pantalla, en fraccion del escenario (ya con la escala y
  // el desplazamiento de las capas). Marco: pixeles visibles de
  // ribcage_overlay_top.png (con engranajes). Cuerpo: columnas del marco
  // opacas en mas del 30% de su alto. Rodillos: union de .reel-lane.
  var FRAME = { x0: 0.2225, x1: 0.78, y0: 0.063, y1: 1.026 };
  var BODY = { x0: 0.2506, x1: 0.7474 };
  var REELS = { x0: 0.3114, x1: 0.6923, y0: 0.19 };
  var LOGO_ASPECT = 573 / 1180;
  // Reloj de arena del HUD (dibujo de 260x500): grueso / largo.
  var HOURGLASS_ASPECT = 260 / 500;
  // El HUD lateral es el diseno principal: el apilado solo entra si deja la
  // maquina claramente mas grande.
  var STACKED_ADVANTAGE = 1.06;

  var root = document.documentElement;
  var stage = document.getElementById("slotStage");
  if (!stage) return;

  var appliedVars = [];
  var lastPlan = null;

  function q(selector) {
    return document.querySelector(selector);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function applyVars(vars) {
    appliedVars.forEach(function (name) {
      if (!(name in vars)) root.style.removeProperty("--rl-" + name);
    });
    appliedVars = Object.keys(vars);
    appliedVars.forEach(function (name) {
      var value = vars[name];
      root.style.setProperty("--rl-" + name, typeof value === "number" ? (Math.round(value * 100) / 100) + "px" : value);
    });
  }

  function setMode(mode) {
    root.classList.add("rl-ready");
    root.classList.toggle("rl-side", mode === "side");
    root.classList.toggle("rl-stacked", mode === "stacked");
    root.classList.remove("rl-bar", "rl-dock");
  }

  // Escenario de escala k con su centro horizontal en centerX y su borde
  // superior en top, mas el contra-escalado del fondo.
  function stageVars(vw, vh, k, centerX, top) {
    var h = vh * k;
    var w = h * STAGE_ASPECT;
    var x = centerX - w / 2;
    // Fondo: mismo encuadre que con k = 1 (escenario a toda altura y
    // centrado), ampliado si la ventana es mas ancha que ese encuadre.
    var w1 = vh * STAGE_ASPECT;
    var extra = Math.max(1, vw / (w1 * LAYER_SCALE));
    var targetCx = vw / 2;
    var targetCy = vh / 2 + LAYER_SHIFT_Y * vh;
    var currentCx = x + w / 2;
    var currentCy = top + h / 2 + LAYER_SHIFT_Y * h;
    return {
      "stage-x": x,
      "stage-y": top,
      "stage-w": w,
      "stage-h": h,
      // translate del fondo va en coordenadas de #sceneLayers (escala 1.13).
      "bg-tx": (targetCx - currentCx) / LAYER_SCALE,
      "bg-ty": (targetCy - currentCy) / LAYER_SCALE,
      "bg-scale": String(Math.round((extra / k) * 10000) / 10000)
    };
  }

  // HUD lateral: se mide lo que ocupa y la maquina se ajusta entre los dos
  // lados. La columna izquierda (trebol + libro) empieza bajo el logo y, si
  // no cabe de alto, encoge (--rl-left-scale).
  function sidePlan(vw, vh) {
    setMode("side");
    applyVars({});
    var pad = clamp(vw * 0.008, 6, 14);
    var vars = {};

    var logo = q(".ossuary-corner-logo");
    var logoRect = logo ? logo.getBoundingClientRect() : null;
    var leftRect = q(".hud-left").getBoundingClientRect();
    var leftTop = logoRect && logoRect.width > 0
      ? logoRect.top + logoRect.width * LOGO_ASPECT + pad * 2
      : vh * 0.27;
    var leftH = leftRect.height;
    var leftScale = 1;
    var room = vh - pad - leftTop;
    if (leftH > room) {
      leftScale = Math.max(0.68, room / leftH);
      if (leftH * leftScale > room) leftTop = Math.max(pad, vh - pad - leftH * leftScale);
    }
    vars["left-top"] = leftTop;
    vars["left-scale"] = String(Math.round(leftScale * 1000) / 1000);

    var right = q(".hud-right").getBoundingClientRect();
    var left = leftRect.left + leftRect.width * leftScale + pad;
    var rightEdge = right.left - pad;
    var w1 = vh * STAGE_ASPECT;
    var a0 = 0.5 - BODY.x0;
    var a1 = BODY.x1 - 0.5;
    var wMax = (rightEdge - left) / (a0 + a1);
    var k = clamp(wMax / w1, 0.05, 1);
    var w = w1 * k;
    // Centrada en la ventana si cabe; si no, lo justo para no pisar el HUD.
    var cx = clamp(vw / 2, left + a0 * w, rightEdge - a1 * w);
    var top = vh - vh * k; // apoyada abajo, como siempre

    var stage = stageVars(vw, vh, k, cx, top);
    Object.keys(stage).forEach(function (name) { vars[name] = stage[name]; });
    if (logoRect && logoRect.width > 0) {
      var logoH = logoRect.width * LOGO_ASPECT;
      var reelsLeft = cx - (0.5 - REELS.x0) * w;
      var reelsTop = top + REELS.y0 * vh * k;
      var overlapsX = logoRect.left + logoRect.width > reelsLeft - pad;
      var overlapsY = logoRect.top + logoH > reelsTop - pad;
      if (overlapsX && overlapsY) {
        var maxBeside = reelsLeft - pad - logoRect.left;
        var maxAbove = (reelsTop - pad - logoRect.top) / LOGO_ASPECT;
        vars["logo-max-w"] = Math.max(90, maxBeside, maxAbove);
      }
    }
    return { mode: "side", k: k, vars: vars };
  }

  // Maquina arriba y HUD debajo: fila del trebol y el BUY BONUS, libro de
  // cuentas y el reloj de arena tumbado.
  function stackedPlan(vw, vh) {
    var m = Math.min(vw, vh);
    var pad = clamp(m * 0.025, 8, 18);
    var gap = clamp(m * 0.02, 6, 14);
    var w1 = vh * STAGE_ASPECT;
    var frameW1 = (FRAME.x1 - FRAME.x0) * w1;
    var frameH1 = (FRAME.y1 - FRAME.y0) * vh;

    // Reloj tumbado: tan largo como deje la pantalla (hasta 560) y sin pasar
    // del 21% del alto de grueso.
    var hgLen = Math.min(vw - 2 * pad, 560);
    var hgTh = hgLen * HOURGLASS_ASPECT;
    if (hgTh > vh * 0.21) {
      hgTh = vh * 0.21;
      hgLen = hgTh / HOURGLASS_ASPECT;
    }
    var ledgerW = Math.min(vw - 2 * pad, 560);
    var ledgerH = clamp(hgTh * 0.3, 44, 62);
    var topRowH = clamp(hgTh * 0.42, 52, 80);
    var zoneH = topRowH + gap + ledgerH + gap + hgTh + pad;
    var zoneTop = vh - zoneH;

    var kW = (vw - 2 * Math.max(2, pad / 2)) / frameW1;
    var kH = (zoneTop - gap - pad) / frameH1;
    var k = clamp(Math.min(1, kW, kH), 0.05, 1);
    var w = w1 * k;
    var machineH = frameH1 * k;
    var free = zoneTop - gap - pad - machineH;

    var vars = {};
    // Logo: arriba y centrado si sobra alto; si no, en la esquina sin tapar
    // los rodillos.
    var machineTop;
    var logoW;
    var logoMinH = 44;
    if (free >= logoMinH + pad) {
      var logoH = Math.min(free - pad, clamp(vw * 0.7, 150, 380) * LOGO_ASPECT);
      logoW = logoH / LOGO_ASPECT;
      vars["logo-x"] = vw / 2 - logoW / 2;
      vars["logo-y"] = pad;
      var rest = free - logoH - pad;
      machineTop = pad + logoH + pad + rest / 2;
    } else {
      machineTop = pad + Math.max(0, free) / 2;
      var stageTopTmp = machineTop - FRAME.y0 * vh * k;
      var reelsLeft = vw / 2 - (0.5 - REELS.x0) * w;
      var reelsTop = stageTopTmp + REELS.y0 * vh * k;
      var byWidth = reelsLeft - 2 * pad;
      var byHeight = (reelsTop - 2 * pad) / LOGO_ASPECT;
      logoW = clamp(Math.max(byWidth, byHeight), 90, clamp(vw * 0.24, 120, 300));
      vars["logo-x"] = pad;
      vars["logo-y"] = pad;
    }
    vars["logo-w"] = logoW;

    var stageTop = machineTop - FRAME.y0 * vh * k;
    var frameCenterOffset = ((FRAME.x0 + FRAME.x1) / 2 - 0.5) * w;
    var stageBox = stageVars(vw, vh, k, vw / 2 - frameCenterOffset, stageTop);
    Object.keys(stageBox).forEach(function (name) { vars[name] = stageBox[name]; });

    // Fila del trebol (izquierda) y el platano (derecha).
    var cloverE = topRowH * 0.92;
    vars["clover-e"] = cloverE;
    vars["clover-x"] = pad;
    vars["clover-y"] = zoneTop + (topRowH - cloverE) / 2;
    vars["petal"] = clamp(topRowH * 0.66, 44, 54);
    var buyH = topRowH * 0.7;
    var buyW = Math.min(buyH * 1156 / 462, vw * 0.42);
    vars["buy-w"] = buyW;
    vars["buy-x"] = vw - pad - buyW;
    vars["buy-y"] = zoneTop;

    var ledgerY = zoneTop + topRowH + gap;
    vars["ledger-x"] = (vw - ledgerW) / 2;
    vars["ledger-y"] = ledgerY;
    vars["ledger-w"] = ledgerW;
    vars["ledger-h"] = ledgerH;

    vars["hg-x"] = (vw - hgLen) / 2;
    vars["hg-y"] = ledgerY + ledgerH + gap;
    vars["hg-len"] = hgLen;
    vars["hg-th"] = hgTh;
    vars["gap"] = gap;

    // Desplegables (apuesta, autoplay, compras): centrados y por encima de
    // la franja del HUD, para que no se salgan de la pantalla.
    var popupBottom = vh - zoneTop + 6;
    vars["popup-bottom"] = popupBottom;
    vars["popup-max-h"] = Math.max(160, vh - popupBottom - pad);

    return { mode: "stacked", k: k, vars: vars };
  }

  function layout() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (!vw || !vh) {
      // Pestana aun sin tamano (p. ej. abierta en segundo plano).
      window.requestAnimationFrame(layout);
      return;
    }
    if (lastPlan && lastPlan.vw === vw && lastPlan.vh === vh && root.classList.contains("rl-ready")) return;
    var side = sidePlan(vw, vh);
    var stacked = stackedPlan(vw, vh);
    var plan = stacked.k > side.k * STACKED_ADVANTAGE ? stacked : side;
    setMode(plan.mode);
    applyVars(plan.vars);
    lastPlan = { mode: plan.mode, k: plan.k, sideK: side.k, stackedK: stacked.k, vw: vw, vh: vh };
  }

  layout();
  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", layout);
  window.addEventListener("load", layout);
  // Respaldo por si algun entorno cambia el viewport sin evento resize.
  if (window.ResizeObserver) {
    new ResizeObserver(function () { layout(); }).observe(root);
  }

  window.OssuaryResponsiveLayout = {
    refresh: function () {
      lastPlan = null;
      layout();
    },
    state: function () {
      return lastPlan;
    }
  };
})();
