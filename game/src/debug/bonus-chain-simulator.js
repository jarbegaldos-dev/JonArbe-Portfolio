(function () {
  "use strict";

  // Simulador offline de cadenas de bonus. No esta conectado al motor real:
  // replica la regla actual (src/bonus/bonus-lock-manager.js) usando los
  // mismos strips finitos para decidir que aterriza en cada respin. Se
  // ejecuta solo manualmente desde consola via simulateBonusChains(count)
  // y traceRibcageBuildChain() (esta ultima imprime paso a paso una cadena).

  var RIB_GIANT_SYMBOL = "BONUS_RIB";
  var SUPER_GIANT_SYMBOL = "SUPER_BONUS";
  var RELIC_REEL_ID = "relic";

  // Mismas 5 costillas requeridas que SYMBOL_CONFIG.RIB_BONUS_REELS en el
  // motor real (src/config/symbols.config.js).
  var REQUIRED_RIB_REEL_IDS = ["rib1", "rib2-left", "rib2-right", "rib3-left", "rib3-right"];
  var MAX_RESPINS_SAFETY = 500;

  // Peso provisional de BONUS_RIB durante RIBCAGE_BUILD_MODE. Editable.
  // No afecta al spin base ni a los strips reales: solo pondera la
  // seleccion simulada en los reels libres mientras se construye el bonus.
  var RIBCAGE_BUILD_BONUS_RIB_WEIGHT = 10;

  function landingSymbolForReel(finiteStrips, reelId) {
    var length = finiteStrips.getStripLength(reelId);
    if (!length) return null;
    var stopIndex = Math.floor(Math.random() * length);
    return finiteStrips.getSymbolAt(reelId, stopIndex);
  }

  var giantProbabilityCache = {};

  // Probabilidad real de BONUS_RIB segun el strip (conteo / longitud).
  // Solo lectura: no modifica el strip, solo mide su composicion actual.
  function giantProbabilityForReel(finiteStrips, reelId) {
    if (giantProbabilityCache[reelId] != null) return giantProbabilityCache[reelId];
    var strip = finiteStrips.getStrip(reelId);
    if (!strip || !strip.length) {
      giantProbabilityCache[reelId] = 0;
      return 0;
    }
    var giantCount = 0;
    for (var i = 0; i < strip.length; i++) {
      if (strip[i] === RIB_GIANT_SYMBOL) giantCount++;
    }
    var probability = giantCount / strip.length;
    giantProbabilityCache[reelId] = probability;
    return probability;
  }

  // Peso SOLO de simulador, exclusivo de RIBCAGE_BUILD_MODE: en vez de leer
  // el strip real tal cual, se simula una probabilidad ponderada de
  // BONUS_RIB (prob base * weight, capada a 1). El strip en si no se toca.
  function landingSymbolForReelWeighted(finiteStrips, reelId, weight) {
    var weightedProbability = Math.min(1, giantProbabilityForReel(finiteStrips, reelId) * weight);
    if (Math.random() < weightedProbability) return RIB_GIANT_SYMBOL;

    // Si no toca gigante, se devuelve un simbolo normal real leido del strip
    // (relanzando si cae justo en una posicion gigante) para no inventar
    // simbolos fuera del registro del strip.
    var symbol = landingSymbolForReel(finiteStrips, reelId);
    var guard = 0;
    while (symbol === RIB_GIANT_SYMBOL && guard < 50) {
      symbol = landingSymbolForReel(finiteStrips, reelId);
      guard++;
    }
    return symbol;
  }

  function modeForState(lockedRibCount, relicLocked, spinIndex) {
    if (lockedRibCount === REQUIRED_RIB_REEL_IDS.length && relicLocked) return "SUPER_BONUS";
    if (lockedRibCount === REQUIRED_RIB_REEL_IDS.length) return "BONUS";
    if (spinIndex === 0) return "BASE";
    return "RIBCAGE_BUILD";
  }

  // Ejecuta una cadena completa. Si options.trace=true, devuelve tambien
  // steps[] con el estado de debug pedido en cada spin (mode, boost activo,
  // weight, locks actuales, ultimo nuevo lock).
  function simulateOneChain(finiteStrips, options) {
    var ribcageBuildMode = Boolean(options && options.ribcageBuildMode);
    var ribcageBuildWeight = options && typeof options.ribcageBuildWeight === "number"
      ? options.ribcageBuildWeight
      : RIBCAGE_BUILD_BONUS_RIB_WEIGHT;
    var trace = Boolean(options && options.trace);

    var lockedRibs = {};
    var lockedRibCount = 0;
    var relicLocked = false;
    var respins = 0;
    var spinIndex = 0;
    var steps = trace ? [] : null;

    while (true) {
      var newLockThisSpin = false;
      var lastNewLock = null;
      var isBuildSpin = ribcageBuildMode && spinIndex > 0;
      var boostActive = isBuildSpin;

      for (var i = 0; i < REQUIRED_RIB_REEL_IDS.length; i++) {
        var reelId = REQUIRED_RIB_REEL_IDS[i];
        if (lockedRibs[reelId]) continue; // reel bloqueado: no gira
        var symbol = boostActive
          ? landingSymbolForReelWeighted(finiteStrips, reelId, ribcageBuildWeight)
          : landingSymbolForReel(finiteStrips, reelId);
        if (symbol === RIB_GIANT_SYMBOL) {
          lockedRibs[reelId] = true;
          lockedRibCount++;
          newLockThisSpin = true;
          lastNewLock = reelId;
        }
      }

      if (!relicLocked) {
        // El esternon/relic mantiene la regla actual: sin ponderacion especial.
        var relicSymbol = landingSymbolForReel(finiteStrips, RELIC_REEL_ID);
        if (relicSymbol === SUPER_GIANT_SYMBOL) {
          relicLocked = true;
          newLockThisSpin = true;
          if (!lastNewLock) lastNewLock = RELIC_REEL_ID;
        }
      }

      if (trace) {
        steps.push({
          spinIndex: spinIndex,
          mode: modeForState(lockedRibCount, relicLocked, spinIndex),
          boostActive: boostActive,
          weight: boostActive ? ribcageBuildWeight : 1,
          lockedRibs: Object.keys(lockedRibs),
          relicLocked: relicLocked,
          lastNewLock: lastNewLock
        });
      }

      if (spinIndex === 0 && !newLockThisSpin) {
        var resultNotStarted = { started: false, completed: false, superCompleted: false, locksReached: 0, respins: 0 };
        if (trace) resultNotStarted.steps = steps;
        return resultNotStarted;
      }

      if (lockedRibCount === REQUIRED_RIB_REEL_IDS.length) {
        var resultCompleted = {
          started: true,
          completed: true,
          superCompleted: relicLocked,
          locksReached: lockedRibCount,
          respins: respins
        };
        if (trace) resultCompleted.steps = steps;
        return resultCompleted;
      }

      if (!newLockThisSpin || respins >= MAX_RESPINS_SAFETY) {
        var resultFailed = {
          started: true,
          completed: false,
          superCompleted: false,
          locksReached: lockedRibCount,
          respins: respins
        };
        if (trace) resultFailed.steps = steps;
        return resultFailed;
      }

      respins++;
      spinIndex++;
    }
  }

  function simulateBonusChains(count, options) {
    var finiteStrips = window.OssuaryFiniteStrips;
    if (!finiteStrips) {
      console.error("[BonusChainSimulator] OssuaryFiniteStrips no disponible.");
      return null;
    }

    var ribcageBuildMode = Boolean(options && (options.ribcageBuildMode || options.respinBoost));
    var ribcageBuildWeight = options && typeof options.ribcageBuildWeight === "number"
      ? options.ribcageBuildWeight
      : (options && typeof options.boostMultiplier === "number" ? options.boostMultiplier : RIBCAGE_BUILD_BONUS_RIB_WEIGHT);

    var chainsStarted = 0;
    var chainsFailed = 0;
    var bonusCompleted = 0;
    var superBonusCompleted = 0;
    var respinsTotal = 0;
    var maxRespinsSeen = 0;
    var locksReachedDistribution = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };

    for (var c = 0; c < count; c++) {
      var result = simulateOneChain(finiteStrips, {
        ribcageBuildMode: ribcageBuildMode,
        ribcageBuildWeight: ribcageBuildWeight
      });

      if (!result.started) continue;

      chainsStarted++;
      respinsTotal += result.respins;
      if (result.respins > maxRespinsSeen) maxRespinsSeen = result.respins;

      if (result.locksReached >= 1) {
        locksReachedDistribution[String(result.locksReached)]++;
      }

      if (result.completed) {
        bonusCompleted++;
        if (result.superCompleted) superBonusCompleted++;
      } else {
        chainsFailed++;
      }
    }

    var report = {
      totalChains: count,
      ribcageBuildMode: ribcageBuildMode,
      ribcageBuildWeight: ribcageBuildMode ? ribcageBuildWeight : 1,
      chainsStarted: chainsStarted,
      chainsFailed: chainsFailed,
      bonusCompleted: bonusCompleted,
      superBonusCompleted: superBonusCompleted,
      averageRespinsPerChain: chainsStarted ? (respinsTotal / chainsStarted).toFixed(4) : "0.0000",
      maxRespinsSeen: maxRespinsSeen,
      locksReachedDistribution: locksReachedDistribution,
      bonusCompletionRate: chainsStarted ? (bonusCompleted / chainsStarted * 100).toFixed(4) + "%" : "0.0000%",
      superBonusCompletionRate: chainsStarted ? (superBonusCompleted / chainsStarted * 100).toFixed(4) + "%" : "0.0000%",
      bonusRateOverTotalSpins: (bonusCompleted / count * 100).toFixed(4) + "%",
      superBonusRateOverTotalSpins: (superBonusCompleted / count * 100).toFixed(4) + "%"
    };

    printPlainReport(count, report);

    return report;
  }

  function printPlainReport(count, report) {
    console.log("[BonusChainSimulator] ===== " + count + " cadenas simuladas " +
      (report.ribcageBuildMode ? "(RIBCAGE_BUILD_MODE peso x" + report.ribcageBuildWeight + ")" : "(sin RIBCAGE_BUILD_MODE)") + " =====");
    console.log("[BonusChainSimulator] totalChains: " + report.totalChains);
    console.log("[BonusChainSimulator] chainsStarted: " + report.chainsStarted);
    console.log("[BonusChainSimulator] chainsFailed: " + report.chainsFailed);
    console.log("[BonusChainSimulator] bonusCompleted: " + report.bonusCompleted + " (rate sobre chains iniciadas: " + report.bonusCompletionRate + ", rate sobre total spins: " + report.bonusRateOverTotalSpins + ")");
    console.log("[BonusChainSimulator] superBonusCompleted: " + report.superBonusCompleted + " (rate sobre chains iniciadas: " + report.superBonusCompletionRate + ", rate sobre total spins: " + report.superBonusRateOverTotalSpins + ")");
    console.log("[BonusChainSimulator] averageRespinsPerChain: " + report.averageRespinsPerChain);
    console.log("[BonusChainSimulator] maxRespinsSeen: " + report.maxRespinsSeen);

    console.log("[BonusChainSimulator] locksReachedDistribution (chains iniciadas, por costillas conseguidas al terminar):");
    Object.keys(report.locksReachedDistribution).forEach(function (locks) {
      console.log("  - " + locks + " lock(s): " + report.locksReachedDistribution[locks]);
    });

    console.log(
      "[BonusChainSimulator] chainsStarted = tiradas BASE donde aterrizo al menos " +
      "una costilla o el relic; a partir de ahi se entra en RIBCAGE_BUILD_MODE y se " +
      "encadenan respins hasta completar las 5 costillas requeridas (bonusCompleted, " +
      "+ esternon = superBonusCompleted) o hasta que un respin no trae ningun lock " +
      "nuevo (chainsFailed)."
    );
  }

  // Ejecuta UNA cadena y muestra en consola, paso a paso, el estado de debug
  // pedido: mode, boost activo, weight, locks actuales, ultimo nuevo lock.
  function traceRibcageBuildChain(options) {
    var finiteStrips = window.OssuaryFiniteStrips;
    if (!finiteStrips) {
      console.error("[BonusChainSimulator] OssuaryFiniteStrips no disponible.");
      return null;
    }

    var ribcageBuildWeight = options && typeof options.ribcageBuildWeight === "number"
      ? options.ribcageBuildWeight
      : RIBCAGE_BUILD_BONUS_RIB_WEIGHT;

    var result = simulateOneChain(finiteStrips, {
      ribcageBuildMode: true,
      ribcageBuildWeight: ribcageBuildWeight,
      trace: true
    });

    console.log("[RibcageBuildTrace] ===== cadena trazada =====");
    result.steps.forEach(function (step) {
      console.log(
        "[RibcageBuildTrace] spin " + step.spinIndex +
        " | mode=" + step.mode +
        " | boostActivo=" + (step.boostActive ? "si" : "no") +
        " | weight=" + step.weight +
        " | locks=" + (step.lockedRibs.length ? step.lockedRibs.join(",") : "(ninguno)") +
        " | esternonLocked=" + step.relicLocked +
        " | ultimoNuevoLock=" + (step.lastNewLock || "(ninguno)")
      );
    });

    if (!result.started) {
      console.log("[RibcageBuildTrace] resultado: cadena nunca se inicio (spin base sin costilla ni esternon).");
    } else if (result.completed) {
      console.log("[RibcageBuildTrace] resultado: " + (result.superCompleted ? "SUPER_BONUS activado" : "BONUS activado") + " tras " + result.respins + " respins.");
    } else {
      console.log("[RibcageBuildTrace] resultado: cadena fallida (sin nuevo lock), limpieza final sin residuos. Locks alcanzados: " + result.locksReached);
    }

    return result;
  }

  window.simulateBonusChains = simulateBonusChains;
  window.traceRibcageBuildChain = traceRibcageBuildChain;
  window.RIBCAGE_BUILD_BONUS_RIB_WEIGHT = RIBCAGE_BUILD_BONUS_RIB_WEIGHT;
  window.OssuaryBonusChainSimulator = {
    run: simulateBonusChains,
    trace: traceRibcageBuildChain,
    RIBCAGE_BUILD_BONUS_RIB_WEIGHT: RIBCAGE_BUILD_BONUS_RIB_WEIGHT
  };
})();
