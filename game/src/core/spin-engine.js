(function () {
  "use strict";

  function createSpinEngine(options) {
    var config = options.config;
    var hooks = options.hooks;

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function effectiveCruiseSpeed(reel) {
      if (reel && typeof reel.customCruiseSpeed === "number" && reel.customCruiseSpeed > 0) {
        return reel.customCruiseSpeed;
      }
      return config.CRUISE_SPEED || config.MAX_REEL_SPEED;
    }

    function respinCruiseSpeed(reel) {
      if (reel && typeof reel.customCruiseSpeed === "number" && reel.customCruiseSpeed > 0) {
        return reel.customCruiseSpeed;
      }
      var tierMultiplier = reel && (reel.id === "rib2-left" || reel.id === "rib2-right" || reel.id === "rib3-left" || reel.id === "rib3-right")
        ? (config.BONUS_RESPIN_RIB23_CRUISE_SPEED_MULTIPLIER || 1.75)
        : (config.BONUS_RESPIN_CRUISE_SPEED_MULTIPLIER || 1);
      return (config.CRUISE_SPEED || config.MAX_REEL_SPEED) * tierMultiplier;
    }

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function easeOutSine(t) {
      return Math.sin((t * Math.PI) / 2);
    }

    // Rampa S (ease-in-out de 5º grado): pendiente 0 en ambos extremos. Hace
    // que la velocidad arranque desde 0 sin tirón y se acople a la velocidad
    // de crucero sin escalón (derivada 0 arriba). Sustituye a easeOutCubic en
    // la aceleración, que subía la velocidad de golpe al principio.
    function smootherStep(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function smootherStepIntegral(t) {
      return Math.pow(t, 6) - 3 * Math.pow(t, 5) + 2.5 * Math.pow(t, 4);
    }

    // Desplazamiento EXACTO del retroceso inicial en función de w (0..1), no
    // una velocidad integrada paso a paso. Es la primitiva de
    // -PEAK*sin(pi*w): ofrece la posición real en cualquier instante sin
    // depender de cuántos frames hayan pasado ni de su dtSec. Con velocidad
    // integrada (position += velocity*dt), un frame tardío con dt grande
    // multiplica una velocidad ya alta por ese hueco de tiempo y se ve como
    // un salto; con la fórmula cerrada, el frame que llegue tarde simplemente
    // "aparece" en el punto exacto de la curva que le corresponde, nunca
    // antes ni después: nunca hay teleport, como mucho menos fluidez si el
    // frame rate cae.
    function windupOffset(w, windupTimeSeconds) {
      return -config.WINDUP_PEAK_SPEED * (windupTimeSeconds / Math.PI) * (1 - Math.cos(Math.PI * w));
    }

    function finalWindupOffset(windupTimeSeconds) {
      return windupOffset(1, windupTimeSeconds);
    }

    function accelerationDistance(accelProgress, spinSpeed, accelerationTimeSeconds) {
      return spinSpeed * accelerationTimeSeconds * smootherStepIntegral(accelProgress);
    }

    // ===== RESPIN PHYSICS =====================================================
    // Rama de curvas exclusiva para RESPIN (state.currentSpinType === "BONUS",
    // marcada en game.js#prepareReelStops como reel.isRespin). El spin BASE
    // sigue usando exactamente windupOffset/smootherStep/easeOutQuart/
    // settleSpringOffset de arriba, sin tocar ni una linea. No hay timers ni
    // setTimeout: todo se deriva de timestamps reales (reel.spinAnchorAt,
    // reel.decelStartedAt) igual que el resto del motor.

    // PHASE 1 (START): no existe windup para RESPIN. El primer frame ya avanza
    // en la direccion de giro (ver updateAccelerationAndCruise, que salta el
    // bloque de windup entero cuando reel.isRespin es true).

    // PHASE 2 (INITIAL ACCELERATION): curva en dos segmentos, formula cerrada
    // (misma filosofia que windupOffset/accelerationDistance: posicion exacta
    // para cualquier instante, sin depender de cuantos frames hayan pasado).
    //   Segmento A [0, RESPIN_ACCEL_SEGMENT_A_MS]: velocidad lineal 0 -> vA,
    //   donde vA = spinSpeed * RESPIN_ACCEL_SEGMENT_A_FRACTION.
    //   Segmento B [RESPIN_ACCEL_SEGMENT_A_MS, ACCELERATION_TIME]: velocidad
    //   vA -> spinSpeed con aceleracion creciente (easeOutCubic sobre la
    //   velocidad: respuesta mas brusca/mecanica que easeOutQuad, llega plana
    //   a la velocidad de crucero, sin escalon al entrar en PHASE 3).
    // Duracion total identica a config.ACCELERATION_TIME (no se toca):
    // unicamente se redistribuye DONDE ocurre la aceleracion dentro de esa
    // ventana.
    // PULIDO: fraccion subida 0.45 -> 0.55 (limite superior del rango pedido
    // 40-50%... ampliado a 55% tras comparar variantes 45/55/60: 55% da el
    // arranque mas agresivo sin que el segmento B se perciba como un salto).
    var RESPIN_ACCEL_SEGMENT_A_MS = 50; // dentro del rango pedido 40-60ms
    var RESPIN_ACCEL_SEGMENT_A_FRACTION = 0.55;

    function respinAccelSegmentAMs(accelerationTimeMs) {
      return Math.min(RESPIN_ACCEL_SEGMENT_A_MS, accelerationTimeMs);
    }

    function respinAccelDistance(elapsedMs, spinSpeed, accelerationTimeMs) {
      var e = clamp(elapsedMs, 0, accelerationTimeMs);
      var tA = respinAccelSegmentAMs(accelerationTimeMs);
      var vA = spinSpeed * RESPIN_ACCEL_SEGMENT_A_FRACTION;
      var tASec = tA / 1000;

      if (e <= tA) {
        var tSec = e / 1000;
        return tASec > 0 ? (vA * tSec * tSec) / (2 * tASec) : 0;
      }

      var distA = tASec > 0 ? (vA * tASec) / 2 : 0;
      var segBMs = accelerationTimeMs - tA;
      var uSec = segBMs / 1000;
      var p = segBMs > 0 ? clamp((e - tA) / segBMs, 0, 1) : 1;
      // v(p) = vA + (spinSpeed-vA)*(1-(1-p)^3)  [easeOutCubic sobre la velocidad]
      // distB(p) = U * [ vA*p + (spinSpeed-vA)*( p + (1-p)^4/4 - 1/4 ) ]  (integral cerrada)
      var distB = uSec * (vA * p + (spinSpeed - vA) * (p + Math.pow(1 - p, 4) / 4 - 0.25));
      return distA + distB;
    }

    function respinAccelVelocity(elapsedMs, spinSpeed, accelerationTimeMs) {
      var e = clamp(elapsedMs, 0, accelerationTimeMs);
      var tA = respinAccelSegmentAMs(accelerationTimeMs);
      var vA = spinSpeed * RESPIN_ACCEL_SEGMENT_A_FRACTION;

      if (e <= tA) {
        return tA > 0 ? vA * (e / tA) : vA;
      }

      var segBMs = accelerationTimeMs - tA;
      var p = segBMs > 0 ? (e - tA) / segBMs : 1;
      var easeOut = 1 - Math.pow(1 - p, 3);
      return vA + (spinSpeed - vA) * easeOut;
    }

    // PHASE 4 (DECELERATION): velocidad alta sostenida durante la mayor parte
    // del recorrido y caida concentrada en el tramo final: v(t) = v0*(1-t^N),
    // continuidad exacta con la velocidad de crucero en t=0 (v(0)=v0, igual
    // que beginReelDeceleration ya garantiza para el spin normal) y SIN
    // elastic/bounce/spring/overshoot (monotona, nunca cambia de signo).
    // N alto concentra la perdida de velocidad cerca de t=1 a proposito.
    // PULIDO: subido 6 -> 7 tras comparar t^5/t^6/t^7 — t^7 mantiene la
    // velocidad de crucero mas tiempo y corta mas seco al final (mas mecanico,
    // menos "deslizamiento"), sin volverse brusco/perceptible como bug porque
    // sigue siendo monotona y closed-form, igual de continua en el arranque.
    var RESPIN_DECEL_POWER = 7;

    // Fraccion de posicion normalizada (0..1) en progreso t (0..1):
    // posFrac(t) = ((N+1)*t - t^(N+1)) / N  — cerrada, posFrac(0)=0, posFrac(1)=1.
    function respinDecelPositionFraction(t) {
      var n = RESPIN_DECEL_POWER;
      var tc = clamp(t, 0, 1);
      return ((n + 1) * tc - Math.pow(tc, n + 1)) / n;
    }

    // Fraccion de distancia total recorrida durante toda la ventana de decel
    // respecto a v0*duracion (factor N/(N+1)): usado para calcular el target
    // de aterrizaje a partir de v0 y DECELERATION_TIME, igual que el spin
    // normal usa el factor 1/4 propio de easeOutQuart.
    function respinDecelDistanceFactor() {
      var n = RESPIN_DECEL_POWER;
      return n / (n + 1);
    }

    function respinDecelVelocityFraction(t) {
      var tc = clamp(t, 0, 1);
      return 1 - Math.pow(tc, RESPIN_DECEL_POWER);
    }

    function positionBeforeDecelAt(reel, now) {
      var spinSpeed = reel.isRespin ? respinCruiseSpeed(reel) : effectiveCruiseSpeed(reel);
      var sinceAnchor = now - reel.spinAnchorAt;

      if (reel.isRespin) {
        // PHASE 1 eliminada: sin windup, accelElapsed = sinceAnchor desde el
        // primer frame.
        var respinAccelElapsed = sinceAnchor;
        if (respinAccelElapsed < config.ACCELERATION_TIME) {
          return reel.windupBasePosition + respinAccelDistance(respinAccelElapsed, spinSpeed, config.ACCELERATION_TIME);
        }
        return reel.windupBasePosition +
          respinAccelDistance(config.ACCELERATION_TIME, spinSpeed, config.ACCELERATION_TIME) +
          spinSpeed * ((respinAccelElapsed - config.ACCELERATION_TIME) / 1000);
      }

      var windupTime = config.WINDUP_TIME || 0;
      var windupTimeSeconds = windupTime / 1000;
      var accelerationTimeSeconds = config.ACCELERATION_TIME / 1000;
      var windupEndPosition = reel.windupBasePosition + finalWindupOffset(windupTimeSeconds);

      if (windupTime > 0 && sinceAnchor < windupTime) {
        var w = clamp(sinceAnchor / windupTime, 0, 1);
        return reel.windupBasePosition + windupOffset(w, windupTimeSeconds);
      }

      var accelElapsed = sinceAnchor - windupTime;
      if (accelElapsed < config.ACCELERATION_TIME) {
        var t = clamp(accelElapsed / config.ACCELERATION_TIME, 0, 1);
        return windupEndPosition + accelerationDistance(t, spinSpeed, accelerationTimeSeconds);
      }

      return windupEndPosition +
        accelerationDistance(1, spinSpeed, accelerationTimeSeconds) +
        spinSpeed * ((accelElapsed - config.ACCELERATION_TIME) / 1000);
    }

    function settleSpringOffset(t) {
      if (t < 0.64) {
        var local = easeOutSine(t / 0.64);
        return config.STOP_OVERSHOOT_SYMBOLS +
          (-config.STOP_REBOUND_SYMBOLS - config.STOP_OVERSHOOT_SYMBOLS) * local;
      }

      var localSettle = easeOutCubic((t - 0.64) / 0.36);
      return -config.STOP_REBOUND_SYMBOLS * (1 - localSettle);
    }

    function setMotionPhase(reel, phase) {
      if (reel.landingPrepared && reel.phase === "prepare-landing" &&
        (phase === "accelerating" || phase === "cruising")) {
        return;
      }
      hooks.setReelPhase(reel, phase);
    }

    function streamIndexAtCell(reel, cell, position) {
      return position + cell.reelCellIndex * reel.cellStep;
    }

    function buildFinalSymbolMap(reel, targetPosition) {
      reel.finalSymbolMap = new Map();
      reel.targetPosition = targetPosition;
      var landingSymbols = Array.isArray(reel.activeLandingSymbols) && reel.activeLandingSymbols.length
        ? reel.activeLandingSymbols
        : reel.finalSymbols;

      for (var i = 0; i < landingSymbols.length; i++) {
        var cell = reel.cells[i];
        var streamIndex = Math.round(streamIndexAtCell(reel, cell, targetPosition));
        reel.finalSymbolMap.set(streamIndex, landingSymbols[i]);
      }
    }

    function getSymbolAt(reel, streamIndex) {
      if (reel.finalSymbolMap.has(streamIndex)) {
        return reel.finalSymbolMap.get(streamIndex);
      }
      if (reel.loopSymbolMap && reel.loopSymbolMap.has(streamIndex)) {
        return reel.loopSymbolMap.get(streamIndex);
      }
      return hooks.deterministicSymbol(reel, streamIndex);
    }

    function beginReelDeceleration(reel, now) {
      reel.decelStartedAt = now;
      reel.decelStartPosition = positionBeforeDecelAt(reel, now);
      reel.position = reel.decelStartPosition;

      var v0 = reel.isRespin ? respinCruiseSpeed(reel) : effectiveCruiseSpeed(reel);

      if (reel.isRespin) {
        // PHASE 4 (RESPIN): misma duracion total que el spin normal
        // (config.DECELERATION_TIME, intacta) y misma continuidad de
        // velocidad en t=0 (v0 = velocidad real de crucero). La distancia es
        // la que resulta de integrar v(t)=v0*(1-t^N) durante esa duracion
        // (factor N/(N+1) en vez del 1/4 de easeOutQuart): solo cambia la
        // curva, no la duracion ni la velocidad maxima.
        var respinDistance = v0 * (config.DECELERATION_TIME / 1000) * respinDecelDistanceFactor();
        var respinTargetPosition = Math.round(reel.position + respinDistance);
        if (respinTargetPosition < reel.position + 1) {
          respinTargetPosition = Math.floor(reel.position) + 2;
        }

        // PHASE 5 (STOP): sin settle/overshoot/rebound. decelEndPosition ES
        // la posicion final real, no un punto de paso transitorio.
        reel.decelEndPosition = respinTargetPosition;
        reel.decelDuration = config.DECELERATION_TIME;

        buildFinalSymbolMap(reel, respinTargetPosition);
        hooks.setReelPhase(reel, "decelerating");
        return;
      }

      // La frenada arranca a la MISMA velocidad real de crucero (continuidad:
      // sin bajón brusco al empezar a frenar). Con la curva de posición
      // easeOutQuart la velocidad inicial = distancia*4/duración; fijando
      // duración = 4*distancia/v0 la velocidad inicial sale exactamente v0,
      // pero la caída de velocidad se siente más seca.
      var idealDistance = v0 * (config.DECELERATION_TIME / 1000) / 4;

      var targetPosition = Math.round(reel.position + idealDistance);
      if (targetPosition < reel.position + 1) {
        targetPosition = Math.floor(reel.position) + 2;
      }

      reel.decelEndPosition = targetPosition + config.STOP_OVERSHOOT_SYMBOLS;

      var distance = reel.decelEndPosition - reel.decelStartPosition;
      reel.decelDuration = (4 * distance / v0) * 1000;

      buildFinalSymbolMap(reel, targetPosition);
      hooks.setReelPhase(reel, "decelerating");
    }

    function prepareReelLanding(reel) {
      var predictedStopPosition = positionBeforeDecelAt(reel, reel.stopStartAt);
      var v0 = reel.isRespin ? respinCruiseSpeed(reel) : effectiveCruiseSpeed(reel);
      var idealDistance = reel.isRespin
        ? v0 * (config.DECELERATION_TIME / 1000) * respinDecelDistanceFactor()
        : v0 * (config.DECELERATION_TIME / 1000) / 4;
      var targetPosition = Math.round(predictedStopPosition + idealDistance);

      if (targetPosition < predictedStopPosition + 1) {
        targetPosition = Math.floor(predictedStopPosition) + 2;
      }

      reel.targetPosition = targetPosition;
      reel.decelEndPosition = reel.isRespin ? targetPosition : targetPosition + config.STOP_OVERSHOOT_SYMBOLS;
      reel.landingPrepared = true;
      buildFinalSymbolMap(reel, targetPosition);
      hooks.setReelPhase(reel, "prepare-landing");
    }

    function beginReelSettle(reel, now) {
      reel.settleStartedAt = now;
      reel.settleStartPosition = reel.decelEndPosition;
      reel.position = reel.decelEndPosition;
      reel.velocity = 0;
      hooks.setReelPhase(reel, "settling");
    }

    function updateAccelerationAndCruise(reel, now, dtSec) {
      var windupTime = config.WINDUP_TIME || 0;

      // Ancla ÚNICA de todo el arranque (windup + rampa de aceleración),
      // fijada en el PRIMER frame real que renderiza este rodillo.
      //
      // Antes el windup se abría/cerraba con el reloj GLOBAL (elapsed desde
      // spinStartTime) pero su curva "w" se medía desde el primer frame. Como
      // spinStartTime corre desde antes del primer frame (rAF llega 16-50ms
      // después, más con GC o pestaña ocupada), la ventana global ya estaba
      // medio gastada cuando w empezaba en 0: el windup se cortaba a mitad de
      // recorrido (tirón/teleport) y si el primer frame llegaba muy tarde no
      // se ejecutaba nada ("como si el retroceso no existiera, solo un
      // parpadeo"). Midiendo TODO desde la misma ancla local, el retroceso
      // recorre siempre w:0->1 completo desde el primer frame, pase lo que
      // pase con el reloj.
      if (reel.spinAnchorAt == null) {
        reel.spinAnchorAt = now;
        reel.windupBasePosition = reel.position;
        reel.windupBaseStreamIndex = Math.round(reel.position);
        reel.windupRenderLock = false;
      }
      var sinceAnchor = now - reel.spinAnchorAt;

      // PHASE 1+2 (RESPIN): sin windup (el primer frame ya avanza en la
      // direccion de giro) y curva de aceleracion en dos segmentos
      // (respinAccelDistance/respinAccelVelocity, formula cerrada, misma
      // ancla local que el resto del motor). Rama completamente separada del
      // spin normal de aqui abajo: nunca llama a windupOffset/smootherStep.
      if (reel.isRespin) {
        reel.windupActive = false;
        reel.windupRenderLock = false;
        var respinAccelElapsed = sinceAnchor;
        var respinSpinSpeed = respinCruiseSpeed(reel);
        if (respinAccelElapsed < config.ACCELERATION_TIME) {
          reel.velocity = respinAccelVelocity(respinAccelElapsed, respinSpinSpeed, config.ACCELERATION_TIME);
          reel.position = reel.windupBasePosition + respinAccelDistance(respinAccelElapsed, respinSpinSpeed, config.ACCELERATION_TIME);
          setMotionPhase(reel, "accelerating");
        } else {
          reel.velocity = respinSpinSpeed;
          reel.position = reel.windupBasePosition +
            respinAccelDistance(config.ACCELERATION_TIME, respinSpinSpeed, config.ACCELERATION_TIME) +
            respinSpinSpeed * ((respinAccelElapsed - config.ACCELERATION_TIME) / 1000);
          setMotionPhase(reel, "cruising");
        }
        if (reel.id === "rib1" && reel.rib1BonusVacant && Math.abs(reel.position - reel.windupBasePosition) > 0.001) {
          reel.rib1BonusVacant = false;
        }
        hooks.renderReel(reel);
        hooks.renderGiantBlocks(reel);
        return;
      }

      // --- Micro-retroceso inicial (windup) -------------------------------
      // Posición por fórmula cerrada windupOffset(w): cada frame cae en el
      // punto exacto de su w, así que un frame tardío "aparece" donde le toca,
      // nunca se extrapola de más. Empieza y acaba en velocidad 0 (seno 0..pi).
      if (windupTime > 0 && sinceAnchor < windupTime) {
        var w = clamp(sinceAnchor / windupTime, 0, 1);
        reel.windupActive = true;
        reel.windupRenderLock = true;
        reel.velocity = -config.WINDUP_PEAK_SPEED * Math.sin(Math.PI * w);
        reel.position = reel.windupBasePosition + windupOffset(w, windupTime / 1000);
        setMotionPhase(reel, "accelerating");
        if (reel.id === "rib1" && reel.rib1BonusVacant && Math.abs(reel.position - reel.windupBasePosition) > 0.001) {
          reel.rib1BonusVacant = false;
        }
        hooks.renderReel(reel);
        hooks.renderGiantBlocks(reel);
        return;
      }
      reel.windupActive = false;

      // --- Rampa de aceleración + crucero ---------------------------------
      // accelElapsed continúa desde el fin del windup en la MISMA ancla, así
      // que la rampa empieza siempre en t=0 (velocidad 0) justo cuando acaba
      // el retroceso, sin escalón. Sube con curva S (smootherStep) hasta la
      // velocidad de crucero (no MAX_REEL_SPEED): sin tirón al salir de 0 y
      // sin escalón al entrar en crucero (pendiente 0 arriba). spinSpeed es la
      // única velocidad de giro; MAX_REEL_SPEED queda de reserva.
      var accelElapsed = sinceAnchor - windupTime;
      var windupTimeSeconds = windupTime / 1000;
      var accelerationTimeSeconds = config.ACCELERATION_TIME / 1000;
      var windupEndPosition = reel.windupBasePosition + finalWindupOffset(windupTimeSeconds);
      var spinSpeed = effectiveCruiseSpeed(reel);
      if (accelElapsed < config.ACCELERATION_TIME) {
        var t = clamp(accelElapsed / config.ACCELERATION_TIME, 0, 1);
        reel.velocity = spinSpeed * smootherStep(t);
        reel.position = windupEndPosition + accelerationDistance(t, spinSpeed, accelerationTimeSeconds);
        setMotionPhase(reel, "accelerating");
      } else {
        reel.velocity = spinSpeed;
        reel.position = windupEndPosition +
          accelerationDistance(1, spinSpeed, accelerationTimeSeconds) +
          spinSpeed * ((accelElapsed - config.ACCELERATION_TIME) / 1000);
        setMotionPhase(reel, "cruising");
      }
      if (reel.id === "rib1" && reel.rib1BonusVacant && Math.abs(reel.position - reel.windupBasePosition) > 0.001) {
        reel.rib1BonusVacant = false;
      }
      if (reel.windupRenderLock && reel.position >= reel.windupBasePosition) {
        reel.windupRenderLock = false;
      }
      hooks.renderReel(reel);
      hooks.renderGiantBlocks(reel);
    }

    function updateReel(reel, now, dtSec) {
      if (reel.phase === "stopped") return;

      if (now < reel.stopStartAt) {
        if (!reel.landingPrepared && reel.prepareLandingAt && now >= reel.prepareLandingAt) {
          hooks.prepareReelLanding(reel);
        }
        updateAccelerationAndCruise(reel, now, dtSec);
        return;
      }

      if (reel.phase !== "decelerating" && reel.phase !== "settling") {
        beginReelDeceleration(reel, reel.stopStartAt);
      }

      if (reel.phase === "decelerating") {
        var progress = clamp((now - reel.decelStartedAt) / reel.decelDuration, 0, 1);
        var distance = reel.decelEndPosition - reel.decelStartPosition;

        if (reel.isRespin) {
          // PHASE 4 (RESPIN): v(t)=v0*(1-t^N) -- velocidad alta sostenida la
          // mayor parte del recorrido, caida concentrada en el tramo final,
          // monotona (sin elastic/bounce/spring/overshoot).
          reel.position = reel.decelStartPosition + distance * respinDecelPositionFraction(progress);
          var respinV0 = respinCruiseSpeed(reel);
          reel.velocity = respinV0 * respinDecelVelocityFraction(progress);
        } else {
          // La caída tiene que empezar enseguida, no quedarse "pegada" al
          // inicio. easeOutQuart mantiene una desaceleración clara desde el
          // primer frame y sigue aterrizando con limpieza al final.
          reel.position = reel.decelStartPosition + distance * easeOutQuart(progress);
          reel.velocity = (distance * 4 * Math.pow(1 - progress, 3)) / (reel.decelDuration / 1000);
        }
        hooks.renderReel(reel);
        hooks.renderGiantBlocks(reel);

        if (progress >= 1) {
          if (reel.isRespin) {
            // PHASE 5 (STOP): sin settle/correcciones/micro-movimientos
            // propios del rodillo. reel.position ya es exactamente
            // reel.targetPosition (decelEndPosition === targetPosition, sin
            // overshoot ni rebound) — no se mueve mas a partir de aqui.
            //
            // Restriccion explicita aparte: ArrivalPhysics/StructureReaction
            // (que NO se pueden tocar) detectan el aterrizaje del BONUS RIB
            // exclusivamente en el primer render con reel.phase==="settling"
            // (giant-symbol-renderer.js, unico punto enganchado como hook
            // real desde fuera de spin-engine.js). Eliminar la fase settling
            // del todo romperia ese contrato. Por eso se pasa por
            // "settling" durante exactamente UN frame -- sin spring, sin
            // offset, sin duracion propia (config.SETTLE_TIME no se usa
            // aqui) -- unicamente para disparar ese hook, y se entra en
            // STOP inmediatamente despues, en el mismo frame.
            reel.velocity = 0;
            hooks.setReelPhase(reel, "settling");
            hooks.renderReel(reel);
            hooks.renderGiantBlocks(reel);
            hooks.stopReel(reel);
          } else {
            beginReelSettle(reel, reel.decelStartedAt + reel.decelDuration);
          }
        }
        return;
      }

      var settleProgress = clamp((now - reel.settleStartedAt) / config.SETTLE_TIME, 0, 1);
      reel.position = reel.targetPosition + settleSpringOffset(settleProgress);
      hooks.renderReel(reel);
      hooks.renderGiantBlocks(reel);

      if (settleProgress >= 1) {
        hooks.stopReel(reel);
      }
    }

    return {
      streamIndexAtCell: streamIndexAtCell,
      buildFinalSymbolMap: buildFinalSymbolMap,
      getSymbolAt: getSymbolAt,
      beginReelDeceleration: beginReelDeceleration,
      beginReelSettle: beginReelSettle,
      prepareReelLanding: prepareReelLanding,
      updateAccelerationAndCruise: updateAccelerationAndCruise,
      updateReel: updateReel,
      // Funciones puras de instrumentacion/validacion para RESPIN PHYSICS
      // (sin estado, sin tocar reels reales): usadas para trazar tiempos y
      // velocidad instantanea de cada fase sin depender del navegador.
      debugRespin: {
        accelDistance: respinAccelDistance,
        accelVelocity: respinAccelVelocity,
        accelSegmentAMs: respinAccelSegmentAMs,
        decelPositionFraction: respinDecelPositionFraction,
        decelVelocityFraction: respinDecelVelocityFraction,
        decelDistanceFactor: respinDecelDistanceFactor
      }
    };
  }

  window.OssuarySpinEngine = {
    create: createSpinEngine
  };
})();
