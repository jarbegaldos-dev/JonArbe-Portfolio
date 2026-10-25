(function () {
  "use strict";

  // Simulador offline de comportamiento de strips. No esta conectado al
  // motor de spin real: solo lee los mismos strips finitos con la misma
  // logica de stopIndex + wrap para medir frecuencias. Se ejecuta solo
  // manualmente desde consola via simulateStripSpins(count).

  var RIB_GIANT_SYMBOL = "BONUS_RIB";
  var SUPER_GIANT_SYMBOL = "SUPER_BONUS";
  var WILD_SYMBOL = "WILD";

  function activeReelIds() {
    // Mismos reelIds definidos en src/config/reel-strips.js (REEL_STRIP_MAP).
    return [
      "rib1", "rib2-left", "rib2-right", "rib3-left", "rib3-right",
      "rib4-left", "rib4-right", "rib5-left", "rib5-right", "relic"
    ];
  }

  function landingSymbolForReel(finiteStrips, reelId) {
    var length = finiteStrips.getStripLength(reelId);
    if (!length) return null;
    var stopIndex = Math.floor(Math.random() * length);
    return finiteStrips.getSymbolAt(reelId, stopIndex);
  }

  function bucketKeyForGiantCount(count) {
    if (count >= 5) return "5+";
    return String(count);
  }

  function simulateStripSpins(count) {
    var finiteStrips = window.OssuaryFiniteStrips;
    if (!finiteStrips) {
      console.error("[StripSimulator] OssuaryFiniteStrips no disponible.");
      return null;
    }

    var reelIds = activeReelIds();
    var ribReelIds = reelIds.filter(function (id) { return id !== "relic"; });

    var perReelGiantCount = {};
    reelIds.forEach(function (id) { perReelGiantCount[id] = 0; });

    var totals = { BONUS_RIB: 0, SUPER_BONUS: 0, WILD: 0 };
    var bonusTriggerCount = 0;
    var superBonusTriggerCount = 0;
    var giantsPerSpinTotal = 0;
    var giantCountBuckets = { "0": 0, "1": 0, "2": 0, "3": 0, "4": 0, "5+": 0 };

    for (var spin = 0; spin < count; spin++) {
      var giantsThisSpin = 0;
      var anyRibLanded = false;
      var relicLandedSuper = false;

      for (var r = 0; r < reelIds.length; r++) {
        var reelId = reelIds[r];
        var symbol = landingSymbolForReel(finiteStrips, reelId);

        if (symbol === RIB_GIANT_SYMBOL) {
          totals.BONUS_RIB++;
          perReelGiantCount[reelId]++;
          giantsThisSpin++;
          if (ribReelIds.indexOf(reelId) !== -1) anyRibLanded = true;
        } else if (symbol === SUPER_GIANT_SYMBOL) {
          totals.SUPER_BONUS++;
          perReelGiantCount[reelId]++;
          giantsThisSpin++;
          if (reelId === "relic") relicLandedSuper = true;
        } else if (symbol === WILD_SYMBOL) {
          totals.WILD++;
        }
      }

      // Regla actual del juego: aterrizar al menos una costilla gigante
      // activa/continua el modo bonus (cada reel se bloquea individualmente,
      // no se exige que las 9 costillas caigan juntas en la misma tirada).
      if (anyRibLanded) bonusTriggerCount++;
      if (relicLandedSuper) superBonusTriggerCount++;

      giantsPerSpinTotal += giantsThisSpin;
      giantCountBuckets[bucketKeyForGiantCount(giantsThisSpin)]++;
    }

    var bonusRibRatePerReel = {};
    reelIds.forEach(function (id) {
      bonusRibRatePerReel[id] = (perReelGiantCount[id] / count * 100).toFixed(4) + "%";
    });

    var bonusTriggerRate = (bonusTriggerCount / count * 100).toFixed(4) + "%";
    var superBonusTriggerRate = (superBonusTriggerCount / count * 100).toFixed(4) + "%";
    var wildRate = (totals.WILD / count * 100).toFixed(4) + "%";

    var report = {
      totalSpins: count,
      bonusRibFrequencyPerReel: perReelGiantCount,
      bonusRibRatePerReel: bonusRibRatePerReel,
      superBonusFrequency: totals.SUPER_BONUS,
      wildFrequency: totals.WILD,
      wildRate: wildRate,
      bonusTriggerCount: bonusTriggerCount,
      bonusTriggerRate: bonusTriggerRate,
      superBonusTriggerCount: superBonusTriggerCount,
      superBonusTriggerRate: superBonusTriggerRate,
      averageGiantsPerSpin: (giantsPerSpinTotal / count).toFixed(4),
      spinsWithZeroGiants: giantCountBuckets["0"],
      giantCountBuckets: giantCountBuckets
    };

    printPlainReport(count, report);

    return report;
  }

  function printPlainReport(count, report) {
    console.log("[StripSimulator] ===== " + count + " spins simulados =====");
    console.log("[StripSimulator] bonusTriggerRate: " + report.bonusTriggerRate + " (" + report.bonusTriggerCount + " spins)");
    console.log("[StripSimulator] superBonusTriggerRate: " + report.superBonusTriggerRate + " (" + report.superBonusTriggerCount + " spins)");
    console.log("[StripSimulator] wildRate: " + report.wildRate + " (" + report.wildFrequency + " simbolos)");
    console.log("[StripSimulator] averageGiantsPerSpin: " + report.averageGiantsPerSpin);

    console.log("[StripSimulator] bonusRibRatePerReel:");
    Object.keys(report.bonusRibRatePerReel).forEach(function (reelId) {
      console.log("  - " + reelId + ": " + report.bonusRibRatePerReel[reelId] + " (" + report.bonusRibFrequencyPerReel[reelId] + " veces)");
    });

    console.log("[StripSimulator] giantCountBuckets (spins por numero de gigantes en la misma tirada):");
    Object.keys(report.giantCountBuckets).forEach(function (bucket) {
      console.log("  - " + bucket + " gigante(s): " + report.giantCountBuckets[bucket]);
    });

    console.log(
      "[StripSimulator] bonusTriggerCount = numero de tiradas donde al menos una " +
      "costilla (BONUS_RIB) aterrizo en cualquiera de los reels rib. No exige que " +
      "todas las costillas caigan juntas: cada reel se bloquea por separado, igual " +
      "que en el motor real."
    );
  }

  window.simulateStripSpins = simulateStripSpins;
  window.OssuaryStripSimulator = {
    run: simulateStripSpins
  };
})();
