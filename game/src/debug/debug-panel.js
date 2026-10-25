(function () {
  "use strict";

  function createDebugPanel(options) {
    var tests = options.tests || {};
    var state = options.state;
    var hooks = options.hooks;

    function startGiantDebugTest(testId) {
      var test = tests[testId];
      if (!test || state.spinning) return false;
      hooks.clearAutoTimer();
      state.auto = false;
      state.debugGiantTest = Object.assign({}, test);
      hooks.startSpin();
      return true;
    }

    function startCustomGiantLandingTest(reelId, symbol) {
      var reel = state.reels.find(function (item) { return item.id === reelId; });
      if (!reel || state.spinning) return false;
      hooks.clearAutoTimer();
      state.auto = false;
      state.debugGiantTest = {
        reelId: reelId,
        symbol: symbol,
        landing: true,
        label: hooks.formatSymbolLabel(symbol) + " LAND"
      };
      hooks.startSpin();
      return true;
    }

    function clearGiantDebugTest() {
      state.debugGiantTest = null;
      for (var i = 0; i < state.reels.length; i++) {
        var reel = state.reels[i];
        reel.debugGiantBlocks = [];
        hooks.clearGiantPool(reel);
        hooks.renderReel(reel);
      }
      hooks.render();
    }

    function runBonusDebugScenario(scenarioId) {
      if (!hooks.runBonusDebugScenario) return null;
      return hooks.runBonusDebugScenario(scenarioId);
    }

    // Prepara unicamente el estado inicial (locks limpios + outcome forzado
    // para el/los proximo(s) spin(s)) y arranca un spin BASE real con
    // hooks.startSpin equivalente; todo lo que ocurre despues (lock,
    // respins, fisica RESPIN, ArrivalPhysics, StructureReaction) es el motor
    // real, no este panel.
    function forceRealBonusFlow(forcedRibGroupCounts, forceSternumOutcome) {
      if (!hooks.debugForceRealBonusSpin) return false;
      return hooks.debugForceRealBonusSpin(forcedRibGroupCounts, forceSternumOutcome);
    }

    // Construye STATE 3 directamente (rib1+rib2+rib3 ya bloqueados, sin
    // pasar por ningun spin previo) y arranca UN UNICO spin BONUS real que
    // solo puede generar STERNUM_BONUS (rib1/rib2/rib3 ya estan bloqueados,
    // asi que el Outcome Engine no los vuelve a generar). Es la unica
    // transicion valida STATE 3 -> STATE 4 de la maquina de estados.
    function forceSuperBonusFromState3() {
      if (!hooks.debugForceSuperBonusFromState3) return false;
      return hooks.debugForceSuperBonusFromState3();
    }

    // Previsualiza la caida/desvanecido del arte de rib1 (misma funcion que
    // el flujo real, ver game.js#spawnRib1BonusFallAway) sin tener que
    // completar un BONUS entero primero.
    function previewRib1FallAway() {
      if (!hooks.debugPreviewRib1FallAway) return false;
      return hooks.debugPreviewRib1FallAway();
    }

    function previewRib1BladeRig() {
      if (!hooks.debugPreviewRib1BladeRig) return false;
      return hooks.debugPreviewRib1BladeRig();
    }

    function previewFreeSpinSymbol(reelId, symbol) {
      if (!hooks.debugPreviewFreeSpinSymbol) return false;
      return hooks.debugPreviewFreeSpinSymbol(reelId, symbol);
    }

    function enterFreeSpinsDebugMode() {
      if (!hooks.debugEnterFreeSpinsMode) return false;
      return hooks.debugEnterFreeSpinsMode();
    }

    function expose() {
      window.OssuaryGiantStripDebug = {
        tests: Object.keys(tests),
        force: function (testId) {
          return startGiantDebugTest(testId);
        },
        clear: function () {
          clearGiantDebugTest();
        }
      };

      window.OssuaryDebugPreview = {
        runTest: function (testId) {
          return startGiantDebugTest(testId);
        },
        showGiant: function (reelId, symbol) {
          return startCustomGiantLandingTest(reelId, symbol);
        },
        clearAll: function () {
          clearGiantDebugTest();
        },
        forceRealBonusFlow: function (forcedRibGroupCounts, forceSternumOutcome) {
          return forceRealBonusFlow(forcedRibGroupCounts, forceSternumOutcome);
        },
        forceSuperBonusFromState3: function () {
          return forceSuperBonusFromState3();
        },
        previewRib1FallAway: function () {
          return previewRib1FallAway();
        },
        previewRib1BladeRig: function () {
          return previewRib1BladeRig();
        },
        previewFreeSpinSymbol: function (reelId, symbol) {
          return previewFreeSpinSymbol(reelId, symbol);
        },
        enterFreeSpinsMode: function () {
          return enterFreeSpinsDebugMode();
        }
      };

      window.OssuaryBonusDebug = {
        scenarios: [
          "INITIAL_LOCK_RIB1",
          "NEW_LOCK_FREE_SPIN",
          "REPEATED_RIB_BONUS",
          "FAILED_NO_NEW_LOCK",
          "COMPLETED_FIVE_LOCKS",
          "STERNUM_ONLY",
          "RIB_AND_STERNUM",
          "REPEATED_STERNUM",
          "FIVE_RIBS_NO_STERNUM",
          "FIVE_RIBS_WITH_STERNUM"
        ],
        run: function (scenarioId) {
          var result = runBonusDebugScenario(scenarioId);
          if (typeof console !== "undefined" && typeof console.table === "function" && result) {
            console.table(result.steps.map(function (step) {
              return {
                step: step.name,
                phase: step.response.phase,
                lockedReels: step.response.lockedReels.join(", "),
                newLockedReels: step.response.newLockedReels.join(", "),
                nextAction: step.response.nextAction ? step.response.nextAction.type : "",
                completed: step.response.completed,
                returnToBase: step.response.returnToBase
              };
            }));
          }
          return result;
        },
        runIntegrated: function (scenarioId) {
          var result = hooks.runBonusIntegratedDebugScenario
            ? hooks.runBonusIntegratedDebugScenario(scenarioId)
            : null;
          if (typeof console !== "undefined" && typeof console.table === "function" && result) {
            console.table(result.steps);
          }
          return result;
        },
        reset: function () {
          if (hooks.resetBonusDebug) hooks.resetBonusDebug();
          return hooks.getBonusDebugState ? hooks.getBonusDebugState() : null;
        },
        lockRib1: function () {
          return hooks.debugLockRib ? hooks.debugLockRib("rib1") : null;
        },
        lock: function (reelId) {
          return hooks.debugLockRib ? hooks.debugLockRib(reelId) : null;
        },
        clearLocks: function () {
          return hooks.debugClearLocks ? hooks.debugClearLocks() : null;
        },
        inspectRibBonusLanding: function () {
          return hooks.inspectRibBonusLanding ? hooks.inspectRibBonusLanding() : null;
        },
        inspectSternumBonusLanding: function () {
          return hooks.inspectSternumBonusLanding ? hooks.inspectSternumBonusLanding() : null;
        },
        inspectBonusLanding: function () {
          return hooks.inspectBonusLanding ? hooks.inspectBonusLanding() : null;
        },
        inspectLockedGiantState: function () {
          return hooks.inspectLockedGiantState ? hooks.inspectLockedGiantState() : null;
        },
        lockSternum: function () {
          return hooks.debugLockSternum ? hooks.debugLockSternum() : null;
        },
        debugLockRib: function (reelId) {
          return hooks.debugLockRib ? hooks.debugLockRib(reelId) : null;
        },
        debugLockAllRibs: function () {
          return hooks.debugLockAllRibs ? hooks.debugLockAllRibs() : null;
        },
        debugLockSternum: function () {
          return hooks.debugLockSternum ? hooks.debugLockSternum() : null;
        },
        debugClearLocks: function () {
          return hooks.debugClearLocks ? hooks.debugClearLocks() : null;
        },
        debugSimulateNormalBonus: function () {
          return hooks.debugSimulateNormalBonus ? hooks.debugSimulateNormalBonus() : null;
        },
        debugSimulateSuperBonus: function () {
          return hooks.debugSimulateSuperBonus ? hooks.debugSimulateSuperBonus() : null;
        },
        debugPrintBonusState: function () {
          return hooks.debugPrintBonusState ? hooks.debugPrintBonusState() : null;
        },
        getRibcageBuildState: function () {
          return hooks.getRibcageBuildState ? hooks.getRibcageBuildState() : null;
        },
        enterFreeSpinsMode: function () {
          return enterFreeSpinsDebugMode();
        },
        state: function () {
          return hooks.getBonusDebugState ? hooks.getBonusDebugState() : null;
        }
      };
    }

    return {
      startGiantDebugTest: startGiantDebugTest,
      startCustomGiantLandingTest: startCustomGiantLandingTest,
      clearGiantDebugTest: clearGiantDebugTest,
      expose: expose
    };
  }

  window.OssuaryDebugPanel = {
    create: createDebugPanel
  };
})();
