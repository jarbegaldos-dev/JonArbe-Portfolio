(function () {
  "use strict";

  function createOutcomeEngine(options) {
    var config = options.config;
    var state = options.state;
    var hooks = options.hooks || {};
    var rng = options.rng || window.OssuaryRngEngine.create();
    var stripConfig = options.stripConfig || null;
    var ribBonusOutcomePlan = null;
    var ribBonusOutcomePlanKey = null;

    function currentSpinType() {
      return typeof hooks.getSpinType === "function" ? hooks.getSpinType() : "BASE";
    }

    function rib1ForcedBonusInBonusMode(reel) {
      return Boolean(
        state &&
        state.bonusModeActive &&
        reel &&
        reel.id === "rib1"
      );
    }

    function currentSpinKey() {
      var id = state && state.currentSpinId ? state.currentSpinId : String((state && state.spinStartTime) || "idle");
      return id + ":" + currentSpinType();
    }

    function ribBonusSequence() {
      var configuredSequence = Array.isArray(config.RIB_BONUS_SEQUENCE) && config.RIB_BONUS_SEQUENCE.length
        ? config.RIB_BONUS_SEQUENCE
        : Array.from(config.RIB_BONUS_REELS || []);

      return configuredSequence.filter(function (reelId) {
        return config.RIB_BONUS_REELS.has(reelId);
      });
    }

    function reelById(reelId) {
      if (!state || !Array.isArray(state.reels)) return null;
      return state.reels.find(function (reel) { return reel.id === reelId; }) || null;
    }

    function hasLockedRibBonus(reel) {
      return Boolean(reel && (
        reel.lockedSymbol === "RIB_BONUS" ||
        (reel.lockedGiantBlock && reel.lockedGiantBlock.symbol === "RIB_BONUS")
      ));
    }

    // rib2-left/rib2-right (and rib3-left/rib3-right) are the two physical
    // halves of a single logical giant symbol, not two independent reels.
    // Grouping them here means every probability decision and every locked-
    // prefix check below operates on the logical symbol as one atomic unit,
    // so it is structurally impossible for one half to win/lock without the
    // other.
    function ribBonusGroupKey(reelId) {
      return reelId.replace(/-left$|-right$/, "");
    }

    function ribBonusGroups() {
      var sequence = ribBonusSequence();
      var groups = [];
      var byKey = {};
      sequence.forEach(function (reelId) {
        var key = ribBonusGroupKey(reelId);
        if (!byKey[key]) {
          byKey[key] = { key: key, reelIds: [] };
          groups.push(byKey[key]);
        }
        byKey[key].reelIds.push(reelId);
      });
      return groups;
    }

    function hasLockedRibBonusGroup(group) {
      return group.reelIds.every(function (reelId) {
        return hasLockedRibBonus(reelById(reelId));
      });
    }

    function lockedRibPrefixGroupCount(groups) {
      var count = 0;
      for (var i = 0; i < groups.length; i++) {
        if (!hasLockedRibBonusGroup(groups[i])) break;
        count++;
      }
      return count;
    }

    function ribBonusThreshold() {
      var threshold = config.RIB_GIANT_CHANCE * config.RIB_GIANT_BONUS_SHARE;

      if (currentSpinType() === "BONUS") {
        var weight = config.RIBCAGE_BUILD_BONUS_RIB_WEIGHT || 1;
        threshold = Math.min(1, threshold * weight);
      }

      return threshold;
    }

    // Cola de override SOLO para el panel de debug (consumida una entrada por
    // spin, en orden): cada entero es "cuantos grupos de costilla adicionales
    // forzar como exito en este spin", reemplazando la tirada de RNG para ese
    // spin unicamente. El resto de la cadena (deteccion de trigger, lock real
    // via bonusFeature/applyBonusLocks, respins automaticos, ArrivalPhysics,
    // StructureReaction...) sigue siendo el motor real sin tocar, igual que
    // si el jugador hubiera tenido esa suerte exacta de RNG. Sin entradas
    // pendientes, el comportamiento es identico al original (100% RNG).
    function consumeForcedRibBonusGroupCount() {
      var purchasedQueue = state && state.purchasedForcedRibBonusQueue;
      if (Array.isArray(purchasedQueue) && purchasedQueue.length > 0) {
        var purchasedValue = purchasedQueue.shift();
        return typeof purchasedValue === "number" ? purchasedValue : null;
      }
      var queue = state && state.debugForcedRibBonusQueue;
      if (!Array.isArray(queue) || queue.length === 0) return null;
      var value = queue.shift();
      return typeof value === "number" ? value : null;
    }

    function buildRibBonusOutcomePlan() {
      var sequence = ribBonusSequence();
      var groups = ribBonusGroups();
      var spinType = currentSpinType();
      var lockedPrefix = spinType === "BONUS" ? lockedRibPrefixGroupCount(groups) : 0;
      // Regla de gameplay: en BASE solo puede bloquearse el primer grupo
      // (rib1). rib2/rib3 pueden existir como simbolos "de paso" en la tira,
      // pero nunca quedarse como nuevo lock fuera de un respin ya arrancado
      // desde rib1. En BONUS si se continua la secuencia prefijo normal.
      var candidateGroups = spinType === "BONUS"
        ? groups.slice(lockedPrefix)
        : groups.slice(0, 1);
      var remaining = candidateGroups.length;
      var threshold = ribBonusThreshold();
      var forcedCount = consumeForcedRibBonusGroupCount();
      var successCount;

      if (forcedCount != null) {
        successCount = Math.max(0, Math.min(remaining, forcedCount));
      } else {
        successCount = 0;
        for (var i = 0; i < remaining; i++) {
          if (rng.next() < threshold) successCount++;
        }
      }

      var reelIds = new Set();
      var stopAt = Math.min(candidateGroups.length, successCount);
      for (var g = 0; g < stopAt; g++) {
        candidateGroups[g].reelIds.forEach(function (reelId) {
          reelIds.add(reelId);
        });
      }

      return {
        sequence: sequence,
        groups: groups,
        lockedPrefix: lockedPrefix,
        successCount: successCount,
        reelIds: reelIds
      };
    }

    function ribBonusPlanForCurrentSpin() {
      var key = currentSpinKey();
      if (ribBonusOutcomePlanKey !== key) {
        ribBonusOutcomePlan = buildRibBonusOutcomePlan();
        ribBonusOutcomePlanKey = key;
      }
      return ribBonusOutcomePlan;
    }

    function randomFrom(symbols) {
      return rng.pick(symbols);
    }

    function stripSymbolsForReel(reel) {
      if (!stripConfig || stripConfig.active !== true) return config.SPIN_SYMBOLS;

      var reelStrips = stripConfig.reelStrips || {};
      var strips = stripConfig.strips || {};
      var stripId = reel && reel.id ? reelStrips[reel.id] : null;
      var strip = strips[stripId || stripConfig.defaultStripId];

      return strip && Array.isArray(strip.symbols) && strip.symbols.length
        ? strip.symbols
        : config.SPIN_SYMBOLS;
    }

    function randomSpinSymbol(reel) {
      if (rib1ForcedBonusInBonusMode(reel)) {
        return "RIB_BONUS";
      }
      return randomFrom(stripSymbolsForReel(reel));
    }

    function bonusModeGiantSymbol(reel) {
      function bonusModeEarlyBladeGuaranteeState(chancesAtSpinStart) {
        var delayedStart = config.BONUS_MODE_BLADE_DELAYED_START;
        if (!delayedStart || !state || state.bonusModeType !== "NORMAL_BONUS") return null;
        var protectedDrops = Math.max(0, delayedStart.PROTECTED_DROPS || 0);
        var bladeDropsLanded = Math.max(0, state.bonusModeBladeDropsLanded || 0);
        if (bladeDropsLanded >= protectedDrops) return null;
        var blockedChances = Array.isArray(delayedStart.BLOCKED_CHANCES) && delayedStart.BLOCKED_CHANCES.length
          ? delayedStart.BLOCKED_CHANCES
          : [3];
        if (blockedChances.indexOf(chancesAtSpinStart) !== -1) return "BLOCK";
        if (chancesAtSpinStart === 1) return "FORCE";
        return null;
      }

      // Free spins: cada mitad de rib (rib2..rib5) sortea POR RODILLO uno de
      // los resultados de FREE_SPIN_RIB_SYMBOLS (vacío/pobre/noble/rico) -
      // azar real e independiente por rodillo: un esqueleto NO está
      // garantizado en cada rodillo cada giro (BONUS_EMPTY = vacío). Arte
      // por-rodillo en symbol-assets.js; las manos van siempre pegadas a su
      // esqueleto (overlay), nunca sueltas. rib1 no llega aquí (va forzado a
      // RIB_BONUS en modo bonus).
      // Balance PROVISIONAL (2026-07-03): sorteo ponderado si existe la lista
      // WEIGHTED_* (vacio 60 / pobre 25 / noble 10 / rico 5, ver
      // symbols.config.js); fallback al reparto uniforme de la lista de
      // membresia si no.
      var freeSpinRibSymbols = (config.WEIGHTED_FREE_SPIN_RIB_SYMBOLS && config.WEIGHTED_FREE_SPIN_RIB_SYMBOLS.length)
        ? config.WEIGHTED_FREE_SPIN_RIB_SYMBOLS
        : (config.FREE_SPIN_RIB_SYMBOLS || []);
      if (reel && reel.type !== "sternum" && freeSpinRibSymbols.length) {
        return randomFrom(freeSpinRibSymbols);
      }
      // El sternum usa sus símbolos EXCLUSIVOS de Bonus Game. Rediseño FREE
      // SPIN (2026-07-05): solo Cuchilla (BLADE_BONUS, dispara el corte de
      // todos los esqueletos acumulados) o Cruz/X cerrada
      // (STERNUM_CROSS_BONUS, consume la oportunidad sin disparar corte) - la
      // cuchilla NO está garantizada cada giro. La mecánica anterior
      // (positivo/negativo/mult) está desactivada, ver LEGACY_* en
      // symbols.config.js#BONUS_MODE_STERNUM_SYMBOLS. Esta rama solo se
      // alcanza dentro de prepareFinalSymbols cuando state.bonusModeActive es
      // true, así que nunca afecta al base game.
      // Probabilidad DINAMICA de la cuchilla (balance PROVISIONAL 2026-07-03):
      // depende de las oportunidades que el jugador tenia AL PULSAR SPIN.
      // Este sorteo corre DESPUES de consumeBaseSpin (startSpin consume antes
      // de prepareReelStops), asi que spinsRemaining ya esta decrementado y
      // se le suma 1 para recuperar el valor mostrado al jugador al girar
      // (3/3 -> 40%, 2/3 -> 30%, 1/3 -> 20%, ver symbols.config.js). Cuando
      // la cuchilla resetea el contador a 3, la probabilidad vuelve sola al
      // valor de 3/3 (se deriva del contador, sin estado propio). Fallback:
      // reparto uniforme de la lista de membresia si falta el mapa/la clave.
      if (reel && reel.type === "sternum" && config.BONUS_MODE_BLADE_CHANCE_BY_CHANCES && state) {
        var chancesAtSpinStart = (typeof state.bonusModeSpinsRemaining === "number")
          ? state.bonusModeSpinsRemaining + 1
          : null;
        // Clamp al maximo del modo (3): cubre sorteos fuera del flujo real
        // (debug/preview, donde el contador aun no se ha consumido).
        if (chancesAtSpinStart != null && typeof state.bonusModeSpinsAwarded === "number" && state.bonusModeSpinsAwarded > 0) {
          chancesAtSpinStart = Math.max(1, Math.min(state.bonusModeSpinsAwarded, chancesAtSpinStart));
        }
        var bladeChance = chancesAtSpinStart != null
          ? config.BONUS_MODE_BLADE_CHANCE_BY_CHANCES[chancesAtSpinStart]
          : null;
        if (typeof bladeChance === "number") {
          var bladeSymbol = (config.BONUS_MODE_STERNUM_BLADE_SYMBOLS || ["BLADE_BONUS"])[0];
          // Cuando NO cae la cuchilla, el resto de simbolos del esternon
          // (cruz, guadana...) se reparten uniforme entre si (provisional,
          // pesos definitivos con la math de free spins).
          var sternumFallbackSymbols = (config.BONUS_MODE_STERNUM_SYMBOLS || []).filter(function (symbol) {
            return symbol !== bladeSymbol;
          });
          if (!sternumFallbackSymbols.length) sternumFallbackSymbols = ["STERNUM_CROSS_BONUS"];
          var guaranteeState = bonusModeEarlyBladeGuaranteeState(chancesAtSpinStart);
          if (guaranteeState === "BLOCK") {
            return randomFrom(sternumFallbackSymbols);
          }
          if (guaranteeState === "FORCE") {
            return bladeSymbol;
          }
          return rng.chance(bladeChance) ? bladeSymbol : randomFrom(sternumFallbackSymbols);
        }
      }
      var bonusModeSternumSymbols = config.BONUS_MODE_STERNUM_SYMBOLS || [];
      if (reel && reel.type === "sternum" && bonusModeSternumSymbols.length) {
        return randomFrom(bonusModeSternumSymbols);
      }
      var symbols = (config.SPIN_SYMBOLS || []).filter(function (symbol) {
        return symbol !== "RIB_BONUS" && symbol !== config.STERNUM_GIANT_SYMBOL;
      });
      return randomFrom(symbols.length ? symbols : config.NORMAL_SYMBOLS);
    }

    function chooseStripStopIndex(stripLength) {
      return Math.floor(rng.next() * stripLength);
    }

    function visibleSymbolsFromFiniteStrip(reel) {
      var finiteStrips = window.OssuaryFiniteStrips;
      if (!finiteStrips) return null;

      var stripLength = finiteStrips.getStripLength(reel.id);
      if (!stripLength) return null;

      var stopIndex = chooseStripStopIndex(stripLength);
      var raw = finiteStrips.getVisibleSymbols(reel.id, stopIndex, reel.cells.length);
      if (!raw || raw.length !== reel.cells.length) {
        console.error("[ReelStrips] lectura de strip invalida, usando fallback", { reelId: reel.id, stopIndex: stopIndex });
        return null;
      }

      var giantSymbols = finiteStrips.GIANT_SYMBOLS || [];
      var visibleSymbols = raw.map(function (symbol) {
        return (!symbol || giantSymbols.indexOf(symbol) !== -1) ? randomSpinSymbol(reel) : symbol;
      });

      console.info("[ReelStrips] spin", { reelId: reel.id, stopIndex: stopIndex, visibleSymbols: visibleSymbols });
      return visibleSymbols;
    }

    function finalSymbolsForReel(reel) {
      var stripSymbols = visibleSymbolsFromFiniteStrip(reel);
      return stripSymbols || reel.cells.map(function () { return randomSpinSymbol(reel); });
    }

    function deterministicSymbol(reel, streamIndex) {
      if (rib1ForcedBonusInBonusMode(reel)) {
        return "RIB_BONUS";
      }
      var n = Math.abs(Math.sin((streamIndex + 31) * 12.9898 + reel.index * 78.233) * 43758.5453);
      var symbols = stripSymbolsForReel(reel);
      return symbols[Math.floor(n) % symbols.length];
    }

    function ambientGiantConfigForReel(reel) {
      if (reel.type === "sternum") return { size: reel.cells.length, symbol: "STERNUM_BONUS" };
      if (config.RIB_BONUS_REELS.has(reel.id)) return { size: reel.cells.length, symbol: "RIB_BONUS" };
      return null;
    }

    function ambientGiantBlockRoll(reel, blockIndex) {
      var n = Math.abs(Math.sin((blockIndex + 53) * 12.9898 + reel.index * 78.233 + 91.1) * 43758.5453);
      return n - Math.floor(n);
    }

    function activeGiantBlocksNear(reel) {
      var blocks = [];
      var blockedAmbientIndexes = new Set();
      var finalBlockIndex = reel.targetPosition
        ? Math.round(reel.targetPosition / reel.cells.length)
        : null;

      if (reel.carryGiantBlock) {
        blocks.push(reel.carryGiantBlock);
        blockedAmbientIndexes.add(Math.round(reel.carryGiantBlock.refPosition / reel.carryGiantBlock.size));
      }

      if (reel.debugGiantBlocks && reel.debugGiantBlocks.length > 0) {
        for (var i = 0; i < reel.debugGiantBlocks.length; i++) {
          var block = reel.debugGiantBlocks[i];
          blocks.push(block);
          blockedAmbientIndexes.add(Math.round(block.refPosition / block.size));
        }
      }

      if (reel.giantSymbol && reel.targetPosition) {
        var finalSize = reel.cells.length;
        blocks.push({ refPosition: reel.targetPosition, size: finalSize, symbol: reel.giantSymbol });
        blockedAmbientIndexes.add(finalBlockIndex);
      }

      // Rediseño FREE SPIN (2026-07-03): esqueletos "de paso" SOLO VISUALES
      // durante el giro de rib2-5 en bonus mode (generados por game.js#
      // buildBonusModePassingGiantBlocks con Math.random, nunca con el RNG:
      // el outcome real no cambia; podados en prepareReelLanding para salir
      // completos de la vista antes de parar). Se anexan DESPUES del bloque
      // real del outcome a proposito: renderGiantBlocks asigna los slots del
      // pool en este orden, asi que el bloque real JAMAS puede quedarse sin
      // slot por culpa de uno de paso — exactamente el bug por el que los
      // antiguos bloques "ambiente" de abajo se desactivaron.
      if (state && state.bonusModeActive && reel.bonusPassingGiantBlocks && reel.bonusPassingGiantBlocks.length) {
        for (var p = 0; p < reel.bonusPassingGiantBlocks.length; p++) {
          var passingBlock = reel.bonusPassingGiantBlocks[p];
          var passingIndex = Math.round(passingBlock.refPosition / passingBlock.size);
          if (passingIndex === finalBlockIndex || blockedAmbientIndexes.has(passingIndex)) continue;
          blocks.push(passingBlock);
        }
      }

      // Los bloques "ambiente" (pasar de largo sin aterrizar) se generaban con
      // un roll hash independiente del outcome real. Competian por los
      // mismos slots limitados de reel.giantPool con el bloque real (el de
      // reel.giantSymbol), pudiendo desplazarlo del slice visible: el bloque
      // real perdia su cobertura de tiles y el tile pequeño de debajo se veia
      // a traves (giant "fantasma"/aparece de la nada, o landing real
      // sustituido por simbolos pequeños). Regla visual: solo se muestra
      // gigante si el outcome real lo contiene. Desactivado.
      var ambientConfig = null;
      if (ambientConfig) {
        var size = ambientConfig.size;
        var symbol = ambientConfig.symbol;
        var spanUnits = config.GIANT_ENTRY_THRESHOLD / config.SYMBOL_STEP_PERCENT + size;
        var minBlock = Math.floor((reel.position - spanUnits) / size);
        var maxBlock = Math.ceil((reel.position + spanUnits) / size);

        for (var b = minBlock; b <= maxBlock; b++) {
          if (b === finalBlockIndex || blockedAmbientIndexes.has(b)) continue;
          if (ambientGiantBlockRoll(reel, b) < config.GIANT_BLOCK_AMBIENT_CHANCE) {
            blocks.push({ refPosition: b * size, size: size, symbol: symbol });
          }
        }
      }

      return blocks;
    }

    function chooseRibOutcome(reel) {
      if (!config.RIB_BONUS_REELS.has(reel.id)) {
        rng.next();
        return null;
      }

      // One spin-level plan decides how many BONUS RIB symbols land, then
      // assigns them only as an ordered prefix. No gaps are possible.
      var plan = ribBonusPlanForCurrentSpin();
      if (plan && plan.reelIds.has(reel.id)) return "RIB_BONUS";

      // WILD remains a normal 1x1 strip symbol, not a giant outcome.
      return null;
    }

    // BONUS PROGRESSION STATE MACHINE (vive unicamente aqui, en el Outcome
    // Engine - no en render/spin-engine/landing/debug/scene-manager/
    // bonus-feature):
    //
    //   STATE 0  sin locks
    //   STATE 1  rib1 locked
    //   STATE 2  rib1 + rib2 locked
    //   STATE 3  rib1 + rib2 + rib3 locked
    //   STATE 4  STERNUM_BONUS permitido
    //
    // La unica transicion valida hacia STERNUM_BONUS parte de STATE 3. No
    // existe transicion directa desde STATE 0/1/2. ribGroupsAlreadyLocked()
    // evalua EXCLUSIVAMENTE el estado persistente de ANTES de este spin
    // (reel.lockedSymbol/reel.lockedGiantBlock, escritos por applyBonusLocks
    // tras el spin ANTERIOR) - nunca symbolos/plan/locks de este mismo spin.
    // Por construccion, rib3 y STERNUM_BONUS no pueden compartir outcome:
    // si rib3 se decide EN este spin (su grupo no estaba aun en
    // reel.lockedSymbol al evaluar), el gate sigue viendo STATE 2 y bloquea
    // el esternon; STERNUM_BONUS solo es posible en un spin que arranca ya
    // en STATE 3 (rib3 bloqueado de un spin estrictamente anterior).
    function ribGroupsAlreadyLocked() {
      return ribBonusGroups().every(hasLockedRibBonusGroup);
    }

    function chooseSternumOutcome() {
      if (!ribGroupsAlreadyLocked()) return null;

      // Override SOLO de debug (ver consumeForcedRibBonusGroupCount arriba):
      // consumido una unica vez, y solo cuando el gate de arriba ya permitio
      // continuar (es decir, solo si el spin arranca en STATE 3), asi que ni
      // siquiera el debug puede construir un SUPER BONUS invalido - usa
      // exactamente la misma maquina de estados que gameplay.
      if (state && typeof state.debugForcedSternumOutcome === "boolean") {
        var forced = state.debugForcedSternumOutcome;
        state.debugForcedSternumOutcome = null;
        return forced ? config.STERNUM_GIANT_SYMBOL : null;
      }

      return rng.chance(config.STERNUM_BONUS_CHANCE) ? config.STERNUM_GIANT_SYMBOL : null;
    }

    function applyDebugGiantPassBlock(reel) {
      reel.debugGiantBlocks = [];
      var test = state.debugGiantTest;
      if (!test || test.landing || test.reelId !== reel.id) return;

      var size = reel.cells.length;
      var spawnDistance = size + config.VISIBLE_TILE_RADIUS + 1;
      reel.debugGiantBlocks.push({
        refPosition: reel.position + spawnDistance,
        size: size,
        symbol: test.symbol,
        debug: true
      });
    }

    function debugLandingSymbolForReel(reel, test) {
      if (!test || !test.landing) return null;
      if (test.landingSymbols && test.landingSymbols[reel.id]) {
        return test.landingSymbols[reel.id];
      }
      if (test.reelId === reel.id) return test.symbol;
      return null;
    }

    function debugLandingFinalSymbolsForReel(reel, test) {
      if (!test || !test.landing || !test.landingFinalSymbols) return null;
      var forcedSymbols = test.landingFinalSymbols[reel.id];
      if (!Array.isArray(forcedSymbols) || forcedSymbols.length !== reel.cells.length) return null;
      return forcedSymbols.slice();
    }

    function prepareFinalSymbols(reel) {
      if (rib1ForcedBonusInBonusMode(reel)) {
        reel.giantSymbol = "RIB_BONUS";
        reel.finalSymbols = reel.cells.map(function () { return "RIB_BONUS"; });
        return;
      }

      if (state && state.bonusModeActive) {
        // Rediseño FREE SPIN (2026-07-03): los esqueletos acumulados quedan
        // bloqueados en el tablero entre free spins - un rodillo con lock
        // conserva su simbolo y NO vuelve a sortear (defensa en profundidad:
        // prepareReelStops ya ni siquiera llama aqui para esos rodillos).
        if (reel.locked && reel.lockedSymbol) {
          reel.giantSymbol = reel.lockedSymbol;
          reel.finalSymbols = reel.cells.map(function () { return reel.lockedSymbol; });
          return;
        }
        // Free spins use one full-reel symbol per physical reel. The repeated
        // values keep payout evaluation cell-compatible while giantSymbol
        // renders them as one 2-cell rib or one 3-cell sternum block.
        reel.giantSymbol = bonusModeGiantSymbol(reel);
        reel.finalSymbols = reel.cells.map(function () { return reel.giantSymbol; });
        return;
      }

      if (state.debugGiantTest) {
        var test = state.debugGiantTest;
        var forcedFinalSymbols = debugLandingFinalSymbolsForReel(reel, test);
        if (forcedFinalSymbols) {
          reel.giantSymbol = null;
          reel.finalSymbols = forcedFinalSymbols;
          return;
        }
        reel.giantSymbol = debugLandingSymbolForReel(reel, test);
        reel.finalSymbols = reel.giantSymbol
          ? reel.cells.map(function () { return reel.giantSymbol; })
          : reel.cells.map(function () { return randomSpinSymbol(reel); });
        return;
      }

      if (currentSpinType() === "BONUS" && reel.locked && reel.lockedSymbol) {
        reel.giantSymbol = reel.lockedSymbol;
        reel.finalSymbols = reel.cells.map(function () { return reel.lockedSymbol; });
        return;
      }

      if (reel.type === "sternum") {
        reel.giantSymbol = chooseSternumOutcome();
      } else {
        reel.giantSymbol = chooseRibOutcome(reel);
      }

      if (reel.giantSymbol) {
        reel.finalSymbols = reel.cells.map(function () { return reel.giantSymbol; });
        return;
      }

      reel.finalSymbols = finalSymbolsForReel(reel);
    }

    // Instrumentacion/validacion de la maquina de estados (ver
    // ribGroupsAlreadyLocked arriba): 0-3 = numero de grupos de costilla ya
    // bloqueados de spins anteriores; 4 = los 3 grupos bloqueados Y el
    // esternon tambien bloqueado. No es usado por ninguna decision de
    // outcome (chooseSternumOutcome usa ribGroupsAlreadyLocked()
    // directamente); existe solo para poder demostrar desde fuera (stress
    // test, debug) que STATE 0->1->2->3->4 es la unica secuencia posible.
    function bonusProgressionState() {
      var groups = ribBonusGroups();
      var lockedGroupCount = groups.filter(hasLockedRibBonusGroup).length;
      if (lockedGroupCount < groups.length) return lockedGroupCount;
      var sternumReel = reelById("sternum");
      var sternumLocked = Boolean(sternumReel && (
        sternumReel.lockedSymbol === config.STERNUM_GIANT_SYMBOL ||
        (sternumReel.lockedGiantBlock && sternumReel.lockedGiantBlock.symbol === config.STERNUM_GIANT_SYMBOL)
      ));
      return sternumLocked ? 4 : 3;
    }

    return {
      randomFrom: randomFrom,
      randomSpinSymbol: randomSpinSymbol,
      stripSymbolsForReel: stripSymbolsForReel,
      deterministicSymbol: deterministicSymbol,
      ambientGiantConfigForReel: ambientGiantConfigForReel,
      ambientGiantBlockRoll: ambientGiantBlockRoll,
      activeGiantBlocksNear: activeGiantBlocksNear,
      chooseRibOutcome: chooseRibOutcome,
      chooseSternumOutcome: chooseSternumOutcome,
      applyDebugGiantPassBlock: applyDebugGiantPassBlock,
      debugLandingSymbolForReel: debugLandingSymbolForReel,
      prepareFinalSymbols: prepareFinalSymbols,
      bonusProgressionState: bonusProgressionState
    };
  }

  window.OssuaryOutcomeEngine = {
    create: createOutcomeEngine
  };
})();
