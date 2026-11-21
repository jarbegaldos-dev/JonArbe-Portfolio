(function () {
  "use strict";

  var stage = document.getElementById("slotStage");
  var reelLayer = document.getElementById("reelLayer");
  var textureConfig = window.OSSUARY_REEL_TEXTURE;
  if (!stage || !reelLayer || !textureConfig) return;

  // Las filas 3-5 se veían demasiado finas/separadas frente a las filas 1-2.
  // Esto solo agranda el reel-lane decorativo (centrado, sin mover su
  // posición); no toca cell.x/y/w/h, así que la alineación de las casillas
  // con los paneles óseos no cambia.
  var LANE_THICKNESS_FACTORS = {
    "rib2-left": 1.3,
    "rib2-right": 1.3,
    "rib3-left": 1.45,
    "rib3-right": 1.45,
    "rib4-left": 1.3,
    "rib4-right": 1.3,
    "rib5-left": 1.3,
    "rib5-right": 1.3
  };

  Array.prototype.forEach.call(document.querySelectorAll(".reel-lane"), function (lane) {
    var reelId = lane.dataset.reel;
    var factor = LANE_THICKNESS_FACTORS[reelId];
    if (factor) {
      var currentHeight = parseFloat(lane.style.height);
      if (!isNaN(currentHeight)) {
        lane.style.height = (currentHeight * factor) + "%";
      }
    }
  });

  function laneById(id) {
    return document.querySelector('.reel-lane[data-reel="' + id + '"]');
  }

  var sternumLane = laneById("sternum");
  if (sternumLane) {
    var sternumTrimPercent = 1.5;
    var sternumTop = parseFloat(sternumLane.style.top);
    var sternumHeight = parseFloat(sternumLane.style.height);
    if (!isNaN(sternumTop) && !isNaN(sternumHeight)) {
      sternumLane.style.height = (sternumHeight - sternumTrimPercent) + "%";
      sternumLane.style.top = (sternumTop + sternumTrimPercent / 2) + "%";
    }
    sternumLane.style.boxShadow = "0 0 10px rgba(0, 0, 0, 0.78)";
  }

  var strips = {};
  var lanesById = {};
  var cellRectCache = {};

  Array.prototype.forEach.call(document.querySelectorAll(".reel-lane"), function (lane) {
    var reelId = lane.dataset.reel;
    var isVertical = lane.classList.contains("sternum-lane");

    var strip = document.createElement("div");
    strip.className = "reel-texture-strip";
    strip.dataset.reel = reelId;
    strip.hidden = lane.hidden;
    strip.style.left = lane.style.left;
    strip.style.width = lane.style.width;

    if (reelId === "sternum") {
      // Tapa el resto de línea/sombra que queda en el borde superior del
      // esternón, extendiendo la franja de textura un poco por encima.
      var sternumOverhang = 1.2;
      var laneTop = parseFloat(lane.style.top);
      var laneHeight = parseFloat(lane.style.height);
      strip.style.top = (laneTop - sternumOverhang / 2) + "%";
      strip.style.height = (laneHeight + sternumOverhang) + "%";
    } else {
      strip.style.top = lane.style.top;
      strip.style.height = lane.style.height;
    }

    if (isVertical) {
      strip.style.backgroundImage = "url('" + textureConfig.vertical + "')";
      strip.style.backgroundSize = "100% auto";
      strip.style.backgroundRepeat = "repeat-y";
    } else {
      strip.style.backgroundImage = "url('" + textureConfig.horizontal + "')";
      strip.style.backgroundSize = "auto 100%";
      strip.style.backgroundRepeat = "repeat-x";
    }

    lane.insertAdjacentElement("afterend", strip);
    strips[reelId] = strip;
    lanesById[reelId] = lane;
  });

  function cellSizeFor(reelId, orientation) {
    if (cellRectCache[reelId]) return cellRectCache[reelId];
    var cell = reelLayer.querySelector('.symbol-cell[data-reel="' + reelId + '"]');
    if (!cell) return 0;
    var rect = cell.getBoundingClientRect();
    var size = orientation === "vertical" ? rect.height : rect.width;
    cellRectCache[reelId] = size;
    return size;
  }

  function invalidateCellSizeCache() {
    cellRectCache = {};
  }

  window.addEventListener("resize", invalidateCellSizeCache);

  // --- Mecánica del rodillo: textura casi estable + rebote del chasis ------
  // La textura NO sigue la posición absoluta del rodillo: se integra de
  // forma incremental (delta de posición × coeficiente de acoplamiento k).
  // k es un escalón: prácticamente 0 durante todo el giro (textura estable,
  // sin "fondo animado") y solo se acopla al movimiento real de los símbolos
  // durante el asentamiento final (settle), momento en el que el chasis
  // (.reel-lane: fondo, sombras, brillo) también se mueve, compartiendo la
  // misma curva de rebote para que todo se sienta como una única pieza
  // mecánica. Todo es parametrizable desde spin.config.js.
  var SPIN_CFG = window.OSSUARY_SPIN_CONFIG || {};

  function numOr(value, fallback) {
    return typeof value === "number" && isFinite(value) ? value : fallback;
  }

  var MECH = {
    parallax: numOr(SPIN_CFG.REEL_TEXTURE_PARALLAX, 0),
    decelRecouple: numOr(SPIN_CFG.REEL_TEXTURE_DECEL_RECOUPLE, 1.0),
    chromeMaxPx: numOr(SPIN_CFG.CHROME_SETTLE_MAX_PX, 2.5)
  };

  // Invierte SOLO la dirección visual del muelle (textura + chasis) en el
  // reel indicado. No toca reel.scrollSign (eso es lógica de juego: dirección
  // real del scroll de símbolos). Puramente cosmético para el rebote final.
  // Config compartida con reel-renderer.js (mismo override para símbolos).
  var MECH_SIGN_OVERRIDE = SPIN_CFG.SETTLE_SPRING_SIGN_OVERRIDE || {};
  function mechSign(reelId) {
    return MECH_SIGN_OVERRIDE[reelId] || 1;
  }

  // Ajuste secundario (rara vez se toca):
  // Un salto de posición mayor que esto (p. ej. RESET → 0) se trata como
  // discontinuidad: se re-siembra la referencia sin desplazar la textura.
  var DISCONTINUITY_SYMBOLS = 3;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // Estado de integración por rodillo. lastPos es la referencia que se
  // re-siembra al empezar un spin / al resetear para evitar saltos; accum es
  // el desplazamiento visual acumulado de la textura (un repeat sin costuras).
  // lastPhase permite re-sembrar también en cada cambio de fase: si el
  // renderer pierde un tick justo al cruzar decel→settling (tab en segundo
  // plano, frame caído), la distancia recorrida en la fase anterior NO debe
  // colarse en el delta del settle con coupling=1 (eso produciría un salto
  // grande en vez del pequeño rebote). Sin este resync, un tick perdido en
  // el momento exacto del cambio de fase puede arrastrar todo el recorrido
  // de la deceleración al asentamiento.
  var mechState = {};
  function mechFor(reelId, position) {
    if (!mechState[reelId]) {
      mechState[reelId] = { lastPos: position, accum: 0, lastPhase: null };
    }
    return mechState[reelId];
  }

  // Coeficiente de acoplamiento textura→símbolos según la fase. Es un
  // ESCALÓN deliberado (no una rampa): la textura permanece prácticamente
  // estable durante todo el giro (accel/cruise/decel) y solo se acopla al
  // movimiento real de los símbolos durante el asentamiento final, donde
  // chasis + textura + sombras + brillo comparten la misma curva. Una rampa
  // progresiva durante la decel se probó y se percibía como un "intento de
  // alcanzar velocidad" artificial; por eso se eliminó.
  function textureCoupling(reel) {
    if (reel.phase === "settling") return MECH.decelRecouple;
    if (reel.phase === "stopped" || reel.phase === "idle") return 0;
    return MECH.parallax; // accelerating / cruising / decelerating
  }

  function applyChassis(lane, orientation, px) {
    if (px === 0) {
      lane.style.translate = "";
      lane.style.willChange = "";
      return;
    }
    lane.style.translate = orientation === "vertical"
      ? "0px " + px + "px"
      : px + "px 0px";
    lane.style.willChange = "translate";
  }

  function update() {
    var motion = window.OssuaryReelMotion;
    if (motion) {
      var stepPercent = motion.SYMBOL_STEP_PERCENT / 100;
      var snapshot = motion.snapshot();
      for (var i = 0; i < snapshot.length; i++) {
        var reel = snapshot[i];
        var cellSize = cellSizeFor(reel.id, reel.orientation);
        var pitchPx = stepPercent * cellSize; // px por 1.0 de posición
        var st = mechFor(reel.id, reel.position);

        // Reset / re-siembra de estado por rodillo.
        if (reel.phase === "idle") {
          // RESET: la textura vuelve a 0, coherente con el reinicio del board.
          st.accum = 0;
          st.lastPos = reel.position;
          st.lastPhase = reel.phase;
        } else if (st.lastPhase !== reel.phase) {
          // Cambio de fase: re-siembra sin aplicar coupling retroactivo. Ver
          // comentario junto a mechState más arriba.
          st.lastPos = reel.position;
          st.lastPhase = reel.phase;
        } else {
          var delta = reel.position - st.lastPos;
          // Discontinuidad ajena a una fase normal (no debería ocurrir ya
          // que los cambios de fase se resincronizan arriba; se deja como
          // red de seguridad): re-siembra sin mover la textura.
          if (Math.abs(delta) > DISCONTINUITY_SYMBOLS) {
            delta = 0;
          }
          st.accum += delta * textureCoupling(reel);
          st.lastPos = reel.position;
        }

        // Textura: integración incremental (nunca posición absoluta × k).
        var strip = strips[reel.id];
        if (strip) {
          var shift = -1 * st.accum * pitchPx * reel.scrollSign * mechSign(reel.id);
          strip.style.backgroundPosition = reel.orientation === "vertical"
            ? "0px " + shift + "px"
            : shift + "px 0px";
        }

        // Chasis: SOLO durante el settle, compartiendo la curva del rebote
        // de los símbolos (reel.position - targetPosition). No se mueve en
        // ninguna otra fase del giro.
        var lane = lanesById[reel.id];
        if (lane) {
          var chassisPx = 0;
          if (reel.phase === "settling") {
            var rawSym = reel.position - reel.targetPosition;
            chassisPx = clamp(
              -rawSym * pitchPx * reel.scrollSign * mechSign(reel.id),
              -MECH.chromeMaxPx,
              MECH.chromeMaxPx
            );
          }
          applyChassis(lane, reel.orientation, chassisPx);
        }
      }
    }
    window.requestAnimationFrame(update);
  }

  window.requestAnimationFrame(update);
})();
