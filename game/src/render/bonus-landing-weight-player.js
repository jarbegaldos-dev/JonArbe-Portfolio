(function () {
  "use strict";

  // Reaccion de la ESTRUCTURA completa (rodillos + marco/fondo) al aterrizaje
  // del BONUS RIB. Sigue siendo una capa puramente visual: no conoce
  // RNG/outcome/locks, no decide nada de juego, y no toca reel.position ni
  // ningun timing real de src/core/spin-engine.js.
  //
  // REPLACE BONUS LANDING PHYSICS: el modelo anterior de "masa" del propio
  // simbolo BONUS (aproximacion con heavyDropEase + overshoot + hold +
  // correction + microsettle) ha sido eliminado por completo de este
  // archivo. La posicion del simbolo BONUS durante su aterrizaje ya no se
  // calcula aqui: la calcula exclusivamente ArrivalPhysics (ver
  // src/render/bonus-arrival-physics.js). Este modulo conserva UNICAMENTE
  // la reaccion de la estructura (StructureReaction), que permanece sin
  // cambios respecto a la pasada anterior.

  function createBonusLandingWeightPlayer(options) {
    var config = (options && options.config) || window.BONUS_LANDING_WEIGHT_CONFIG || {};
    var WEIGHTED_SYMBOL = "RIB_BONUS";

    // STRUCTURE IMPACT PASS: el golpe no se reparte por elemento (cada
    // giant-strip-track con su propio shake independiente, que se leia como
    // varios temblores sueltos en vez de un solo golpe solido). En su lugar
    // hay un UNICO reloj de impacto de estructura, compartido por todos los
    // rodillos via este closure: el primer BONUS que llega a "settling" en
    // este spin lo dispara, y cualquier otro BONUS que llegue casi a la vez
    // (p.ej. los 5 BONUS RIB de un landing real) reutiliza el mismo golpe en
    // vez de sumar un golpe propio. Eso es lo que hace que el tórax entero
    // se mueva como un solo bloque.
    var structureImpactAt = null;

    function isEnabled() {
      return config.BONUS_LANDING_WEIGHT_ENABLED !== false;
    }

    function isWeightedBlock(block) {
      return Boolean(block && block.symbol === WEIGHTED_SYMBOL);
    }

    function easeOutQuad(t) {
      return 1 - (1 - t) * (1 - t);
    }

    // Llamado UNA vez por rodillo, en el primer frame en que ese rodillo
    // entra en "settling" (ver giant-symbol-renderer.js). Solo arma el
    // reloj compartido de la estructura; ya no guarda ningun estado propio
    // del simbolo (eso es responsabilidad exclusiva de ArrivalPhysics).
    function beginStructureImpact(now) {
      if (!isEnabled()) return;
      // El reloj de estructura es "primero en llegar, unico en disparar":
      // si ya hay un golpe de estructura en curso para este spin (otro
      // BONUS RIB que aterrizo unos frames antes), no se reinicia ni se
      // suma uno nuevo.
      if (structureImpactAt == null) {
        structureImpactAt = now;
      }
    }

    // Debe llamarse UNA vez por spin (no por rodillo) al preparar un nuevo
    // spin, para que el siguiente BONUS landing dispare su propio golpe de
    // estructura en vez de heredar el reloj del spin anterior.
    function resetStructure() {
      structureImpactAt = null;
    }

    // --- COMPRESION de toda la estructura (rodillos + marco/fondo) -------
    //
    // No es una animacion de la maquina: es una consecuencia fisica. El
    // jugador no debe pensar "la maquina baja", debe pensar "la maquina
    // acaba de soportar una carga enorme". Por eso el efecto dominante ya
    // NO es la traslacion (translateY, que se lee como una camara bajando)
    // sino una compresion vertical (scaleY) extremadamente sutil aplicada
    // sobre el MISMO bloque rigido (machineBlockEls: caja toracica +
    // rodillos + marco), con transform-origin center para que el bloque se
    // aplaste sobre si mismo en vez de desplazarse. La traslacion se reduce
    // a un apoyo casi imperceptible (2px), nunca el protagonista.
    //
    // Dos tramos SIN hold largo (cualquier tramo "sostenido" es algo que
    // el ojo puede leer como movimiento en curso):
    //   1. IMPULSO: hacia el pico (offset + compresion maxima),
    //      impactSnapEase (curva concava, ~90% del recorrido en el primer
    //      tercio del tramo: ya esta cediendo desde el primer frame
    //      visible).
    //   2. RETORNO: vuelve a 0 / escala 1 con easeOutQuad (decelera hasta
    //      el final, nunca acelera; un retorno que acelera al final se
    //      leeria como muelle/rebote). Mas lento que el impulso.
    // Se activa con un pequeno delay respecto al instante en que el BONUS
    // queda clavado (BONUS_STRUCTURE_REACTION_DELAY_MS), para que se lea
    // como "la energia viaja del BONUS a la maquina" y nunca como algo
    // simultaneo.
    function impactSnapEase(t) {
      return 1 - Math.pow(1 - t, 8);
    }

    function structureTotalDurationMs() {
      return (config.BONUS_STRUCTURE_PRE_SCALE_MS || 0) +
        (config.BONUS_STRUCTURE_REACTION_DELAY_MS || 0) +
        (config.BONUS_STRUCTURE_REACTION_RISE_MS || 0) +
        (config.BONUS_STRUCTURE_REACTION_HOLD_MS || 0) +
        (config.BONUS_STRUCTURE_REACTION_RETURN_MS || 0);
    }

    // Usado por game.js para saber si todavia hace falta seguir pintando
    // frames tras detener el bucle normal de spin (la reaccion de
    // estructura dura mas que SETTLE_TIME).
    function isStructureReactionActive(now) {
      if (!isEnabled() || structureImpactAt == null) return false;
      return (now - structureImpactAt) < structureTotalDurationMs();
    }

    function structureReactionOffsetPx(now) {
      return structureReaction(now).offsetPx;
    }

    function structureReaction(now) {
      var ZERO = { offsetPx: 0, scale: 1, scaleY: 1 };
      if (!isEnabled() || structureImpactAt == null) return ZERO;

      var preScaleMs = config.BONUS_STRUCTURE_PRE_SCALE_MS || 0;
      var preScalePeak = config.BONUS_STRUCTURE_PRE_SCALE || 0;
      var delayMs = config.BONUS_STRUCTURE_REACTION_DELAY_MS || 0;
      var riseMs = config.BONUS_STRUCTURE_REACTION_RISE_MS || 0;
      var holdMs = config.BONUS_STRUCTURE_REACTION_HOLD_MS || 0;
      var returnMs = config.BONUS_STRUCTURE_REACTION_RETURN_MS || 0;
      var peakPx = config.BONUS_STRUCTURE_REACTION_PX || 0;
      var peakCompression = config.BONUS_STRUCTURE_REACTION_SCALE_Y || 0;

      var elapsed = now - structureImpactAt;
      if (elapsed < preScaleMs) {
        var preT = preScaleMs > 0 ? elapsed / preScaleMs : 1;
        var preK = preT < 0.82
          ? easeOutQuad(preT / 0.82)
          : 1 - Math.pow((preT - 0.82) / 0.18, 0.55);
        return {
          offsetPx: 0,
          scale: 1 + preScalePeak * Math.max(0, Math.min(1, preK)),
          scaleY: 1
        };
      }

      if (elapsed < preScaleMs + delayMs) return ZERO;

      var local = elapsed - preScaleMs - delayMs;
      var k; // fraccion 0..1 de "cuanto del golpe esta activo ahora mismo"
      if (local < riseMs) {
        k = impactSnapEase(riseMs > 0 ? local / riseMs : 1);
      } else if (local < riseMs + holdMs) {
        k = 1;
      } else if (local < riseMs + holdMs + returnMs) {
        var rp = returnMs > 0 ? (local - riseMs - holdMs) / returnMs : 1;
        k = 1 - easeOutQuad(rp);
      } else {
        return ZERO;
      }

      return {
        offsetPx: peakPx * k,
        scale: 1,
        scaleY: 1 - peakCompression * k
      };
    }

    return {
      isWeightedBlock: isWeightedBlock,
      beginStructureImpact: beginStructureImpact,
      resetStructure: resetStructure,
      isStructureReactionActive: isStructureReactionActive,
      structureReactionOffsetPx: structureReactionOffsetPx,
      structureReaction: structureReaction
    };
  }

  window.OssuaryBonusLandingWeight = {
    create: createBonusLandingWeightPlayer
  };
})();
