(function () {
  "use strict";

  var SCENARIOS = {
    INITIAL_LOCK_RIB1: [
      { name: "BASE lock rib1", spinType: "BASE", ribBonusReels: ["rib1"] }
    ],
    NEW_LOCK_FREE_SPIN: [
      { name: "BASE lock rib1", spinType: "BASE", ribBonusReels: ["rib1"] },
      { name: "BONUS new lock rib2-left", spinType: "BONUS", ribBonusReels: ["rib2-left"] }
    ],
    REPEATED_RIB_BONUS: [
      { name: "BASE lock rib1", spinType: "BASE", ribBonusReels: ["rib1"] },
      { name: "BONUS repeated rib1", spinType: "BONUS", ribBonusReels: ["rib1"] }
    ],
    FAILED_NO_NEW_LOCK: [
      { name: "BASE lock rib1", spinType: "BASE", ribBonusReels: ["rib1"] },
      { name: "BONUS no new lock", spinType: "BONUS", ribBonusReels: [] }
    ],
    COMPLETED_FIVE_LOCKS: [
      { name: "BASE lock rib1", spinType: "BASE", ribBonusReels: ["rib1"] },
      { name: "BONUS new lock rib2-left", spinType: "BONUS", ribBonusReels: ["rib2-left"] },
      { name: "BONUS new lock rib2-right", spinType: "BONUS", ribBonusReels: ["rib2-right"] },
      { name: "BONUS new lock rib3-left", spinType: "BONUS", ribBonusReels: ["rib3-left"] },
      { name: "BONUS new lock rib3-right", spinType: "BONUS", ribBonusReels: ["rib3-right"] }
    ],
    STERNUM_ONLY: [
      { name: "BASE lock sternum", spinType: "BASE", ribBonusReels: [], sternumBonus: true }
    ],
    RIB_AND_STERNUM: [
      { name: "BASE lock rib1 + sternum", spinType: "BASE", ribBonusReels: ["rib1"], sternumBonus: true }
    ],
    REPEATED_STERNUM: [
      { name: "BASE lock sternum", spinType: "BASE", ribBonusReels: [], sternumBonus: true },
      { name: "BONUS repeated sternum", spinType: "BONUS", ribBonusReels: [], sternumBonus: true }
    ],
    FIVE_RIBS_NO_STERNUM: [
      { name: "BASE lock rib1", spinType: "BASE", ribBonusReels: ["rib1"] },
      { name: "BONUS new lock rib2-left", spinType: "BONUS", ribBonusReels: ["rib2-left"] },
      { name: "BONUS new lock rib2-right", spinType: "BONUS", ribBonusReels: ["rib2-right"] },
      { name: "BONUS new lock rib3-left", spinType: "BONUS", ribBonusReels: ["rib3-left"] },
      { name: "BONUS new lock rib3-right", spinType: "BONUS", ribBonusReels: ["rib3-right"] }
    ],
    FIVE_RIBS_WITH_STERNUM: [
      { name: "BASE lock sternum + rib1", spinType: "BASE", ribBonusReels: ["rib1"], sternumBonus: true },
      { name: "BONUS new lock rib2-left", spinType: "BONUS", ribBonusReels: ["rib2-left"] },
      { name: "BONUS new lock rib2-right", spinType: "BONUS", ribBonusReels: ["rib2-right"] },
      { name: "BONUS new lock rib3-left", spinType: "BONUS", ribBonusReels: ["rib3-left"] },
      { name: "BONUS new lock rib3-right", spinType: "BONUS", ribBonusReels: ["rib3-right"] }
    ]
  };

  function createBonusRuntimeDebug(options) {
    var state = options.state;
    var bonusFeature = options.bonusFeature;
    var ribBonusReels = options.ribBonusReels;
    var sternumGiantSymbol = options.sternumGiantSymbol;
    var idleState = options.idleState;
    var hooks = options.hooks;

    function runScenario(scenarioId) {
      var result = bonusFeature.runDebugScenario(scenarioId);
      hooks.render();
      return result;
    }

    function reset() {
      bonusFeature.reset();
      state.bonusLabel = "";
      state.bonusTrigger = null;
      state.currentSpinType = "BASE";
      hooks.setGameStatus(idleState, "reset_bonus_debug");
      hooks.render();
    }

    function getState() {
      return bonusFeature.getState();
    }

    function applyFeatureLocks(bonusState) {
      hooks.applyBonusLocks(bonusState.lockedReels, bonusState.lockedSymbols);
      hooks.render();
      return bonusState;
    }

    function lockRib(reelId) {
      return applyFeatureLocks(bonusFeature.debugLockRib(reelId));
    }

    function lockAllRibs() {
      return applyFeatureLocks(bonusFeature.debugLockAllRibs());
    }

    function lockSternum() {
      return applyFeatureLocks(bonusFeature.debugLockSternum());
    }

    function clearLocks() {
      bonusFeature.reset();
      hooks.clearBonusLocks();
      state.bonusLabel = "";
      state.bonusTrigger = null;
      state.currentSpinType = "BASE";
      hooks.setGameStatus(idleState, "debug_clear_locks");
      hooks.render();
      return bonusFeature.getState();
    }

    function inspectRibBonusLanding() {
      var inspection = state.lastRibBonusLandingInspection || hooks.inspectRibBonusLandingState();
      if (typeof console !== "undefined" && typeof console.table === "function") {
        console.table(inspection.map(function (item) {
          return {
            reelId: item.reelId,
            giantSymbol: item.giantSymbol,
            finalSymbols: item.finalSymbols.join(","),
            cellEffective: item.cellEffective.join(","),
            locked: item.locked,
            lockedSymbol: item.lockedSymbol,
            hasLockedGiantBlock: Boolean(item.lockedGiantBlock),
            visualComplete: item.sources.visualComplete,
            completedByRibBonus: item.completedByRibBonus,
            detectedAsNewLock: item.detectedAsNewLock,
            detectedAsLocked: item.detectedAsLocked
          };
        }));
      }
      return inspection;
    }

    function inspectSternumBonusLanding() {
      var stored = state.lastSternumBonusLandingInspection || hooks.inspectSternumBonusLandingState();
      var currentReel = hooks.reelByIdForLock(stored.reelId);
      var inspection = Object.assign({}, stored, {
        actualLockedNow: Boolean(currentReel && currentReel.locked),
        actualLockedSymbolNow: currentReel ? currentReel.lockedSymbol : null,
        currentLockMismatch: Boolean(stored.completedBySternumBonus && !(currentReel && currentReel.locked))
      });

      if (typeof console !== "undefined" && typeof console.table === "function") {
        console.table([{
          reelId: inspection.reelId,
          giantSymbol: inspection.giantSymbol,
          finalSymbols: inspection.finalSymbols.join(","),
          cellEffective: inspection.cellEffective.join(","),
          locked: inspection.locked,
          lockedSymbol: inspection.lockedSymbol,
          hasLockedGiantBlock: Boolean(inspection.lockedGiantBlock),
          visualComplete: inspection.sources.visualComplete,
          completedBySternumBonus: inspection.completedBySternumBonus,
          detectedAsNewLock: inspection.detectedAsNewLock,
          detectedAsLocked: inspection.detectedAsLocked,
          actualLockedAfterApply: inspection.actualLockedAfterApply,
          actualLockedSymbolAfterApply: inspection.actualLockedSymbolAfterApply,
          lockMismatch: inspection.lockMismatch,
          actualLockedNow: inspection.actualLockedNow,
          actualLockedSymbolNow: inspection.actualLockedSymbolNow,
          currentLockMismatch: inspection.currentLockMismatch
        }]);
      }
      return inspection;
    }

    function inspectBonusLanding() {
      return {
        ribs: inspectRibBonusLanding(),
        sternum: inspectSternumBonusLanding()
      };
    }

    function inspectLockedGiantState() {
      var result = state.reels
        .filter(function (reel) {
          return reel.locked || reel.lockedGiantBlock;
        })
        .map(function (reel) {
          return {
            reelId: reel.id,
            locked: reel.locked,
            lockedSymbol: reel.lockedSymbol,
            lockedGiantBlock: reel.lockedGiantBlock ? Object.assign({}, reel.lockedGiantBlock) : null,
            giantActive: reel.giantActive,
            position: reel.position,
            targetPosition: reel.targetPosition,
            phase: reel.phase,
            visibleGiantElements: Array.from(reel.giantPool || []).map(function (el, index) {
              return {
                index: index,
                hidden: el.hidden,
                symbol: el.dataset.symbol || "",
                transform: el.style.transform || ""
              };
            })
          };
        });

      if (typeof console !== "undefined" && typeof console.table === "function") {
        console.table(result.map(function (item) {
          var visible = item.visibleGiantElements.filter(function (entry) {
            return !entry.hidden;
          });
          return {
            reelId: item.reelId,
            locked: item.locked,
            lockedSymbol: item.lockedSymbol,
            hasLockedGiantBlock: Boolean(item.lockedGiantBlock),
            giantActive: item.giantActive,
            phase: item.phase,
            visibleCount: visible.length,
            visibleSymbols: visible.map(function (entry) {
              return entry.symbol;
            }).join(",")
          };
        }));
      }
      return result;
    }

    function getRibcageBuildState() {
      return bonusFeature.ribcageBuildDebugInfo
        ? bonusFeature.ribcageBuildDebugInfo()
        : null;
    }

    function printState() {
      var result = {
        bonus: bonusFeature.getState(),
        gameStatus: state.gameStatus,
        currentSpinType: state.currentSpinType || "BASE",
        ribcageBuild: getRibcageBuildState(),
        visualLocks: inspectLockedGiantState(),
        newLockThisSpin: Boolean(state.debugNewLockThisSpin),
        clearing: Boolean(state.debugClearing)
      };
      if (typeof console !== "undefined" && typeof console.info === "function") {
        console.info("[Ossuary Bonus State]", result);
      }
      return result;
    }

    function setDebugBonusOutcome(reelIds, sternumBonus) {
      var landedReels = new Set(reelIds || []);
      state.reels.forEach(function (reel) {
        if (!ribBonusReels.has(reel.id)) return;
        var landed = landedReels.has(reel.id);
        var symbol = landed || reel.locked ? "RIB_BONUS" : null;
        reel.giantSymbol = symbol;
        reel.finalSymbols = reel.cells.map(function (cell) {
          return symbol || cell.effective || cell.initial;
        });
      });

      var sternum = state.sternumReel;
      if (sternum) {
        var symbol = sternumBonus || sternum.locked ? sternumGiantSymbol : null;
        sternum.giantSymbol = symbol;
        sternum.finalSymbols = sternum.cells.map(function (cell) {
          return symbol || cell.effective || cell.initial;
        });
      }
    }

    function processIntegratedStep(step) {
      state.currentSpinType = step.spinType;
      var preparedLockedBeforeSpin = [];

      if (step.spinType === "BONUS") {
        state.reels.forEach(function (reel) {
          if (!reel.locked) return;
          hooks.prepareLockedBonusReel(reel);
          preparedLockedBeforeSpin.push({
            id: reel.id,
            locked: reel.locked,
            lockedSymbol: reel.lockedSymbol,
            hasLockedGiantBlock: Boolean(reel.lockedGiantBlock),
            phase: reel.phase
          });
        });
      }

      setDebugBonusOutcome(step.ribBonusReels, Boolean(step.sternumBonus));
      var ribInspection = hooks.inspectRibBonusLandingState();
      var ribLandingReels = hooks.ribBonusLandingReelsFromInspection(ribInspection);
      var sternumInspection = hooks.inspectSternumBonusLandingState();
      var sternumLandingReel = hooks.sternumBonusLandingReelFromInspection(sternumInspection);
      var response = bonusFeature.onSpinFinished({
        trigger: null,
        reels: state.reels,
        ribBonusLandingReels: ribLandingReels,
        ribBonusLandingInspection: ribInspection,
        sternumBonusLandingReel: sternumLandingReel,
        sternumBonusLandingInspection: sternumInspection,
        bet: 0,
        debugMode: false,
        spinType: step.spinType,
        spinWin: step.spinWin || 0
      });

      var finalRibInspection = hooks.updateLandingInspectionWithBonusResult(ribInspection, response);
      var finalSternumInspection = hooks.updateSternumInspectionWithBonusResult(sternumInspection, response);
      state.lastRibBonusLandingInspection = finalRibInspection;
      state.lastSternumBonusLandingInspection = finalSternumInspection;

      hooks.applyBonusLocks(response.lockedReels, response.lockedSymbols || state.bonusLockedSymbols);
      hooks.refreshSternumLockInspectionAfterApply();
      var visualLockedBeforeReturn = state.reels
        .filter(function (reel) { return reel.locked; })
        .map(function (reel) { return reel.id; });

      if (response.returnToBase) {
        state.currentSpinType = "BASE";
        hooks.clearBonusLocks();
      } else if (response.nextAction && response.nextAction.type === "AUTO_FREE_SPIN") {
        state.currentSpinType = "BONUS";
      }

      return {
        step: step.name,
        spinType: step.spinType,
        landedRibBonusReels: step.ribBonusReels || [],
        landedSternumBonus: Boolean(step.sternumBonus),
        ribBonusLandingReels: ribLandingReels,
        sternumBonusLandingReel: sternumLandingReel,
        ribBonusInspection: finalRibInspection,
        sternumBonusInspection: finalSternumInspection,
        preparedLockedBeforeSpin: preparedLockedBeforeSpin,
        newLockedReels: response.newLockedReels,
        lockedReels: response.lockedReels,
        visualLockedBeforeReturn: visualLockedBeforeReturn,
        visualLockedAfterStep: state.reels
          .filter(function (reel) { return reel.locked; })
          .map(function (reel) { return reel.id; }),
        nextAction: response.nextAction ? response.nextAction.type : null,
        phase: response.phase,
        completed: response.completed,
        returnToBase: response.returnToBase,
        bonusWinToPay: response.bonusWinToPay
      };
    }

    function runIntegrated(scenarioId) {
      var steps = SCENARIOS[scenarioId];
      if (!steps) return null;

      reset();
      hooks.clearBonusLocks();
      var result = {
        id: scenarioId,
        steps: steps.map(processIntegratedStep),
        finalState: bonusFeature.getState(),
        currentSpinType: state.currentSpinType,
        visualLockedReels: state.reels
          .filter(function (reel) { return reel.locked; })
          .map(function (reel) { return reel.id; })
      };
      hooks.render();
      return result;
    }

    return {
      runScenario: runScenario,
      runIntegrated: runIntegrated,
      reset: reset,
      getState: getState,
      lockRib: lockRib,
      lockAllRibs: lockAllRibs,
      lockSternum: lockSternum,
      clearLocks: clearLocks,
      simulateNormalBonus: function () {
        return runIntegrated("FIVE_RIBS_NO_STERNUM");
      },
      simulateSuperBonus: function () {
        return runIntegrated("FIVE_RIBS_WITH_STERNUM");
      },
      printState: printState,
      getRibcageBuildState: getRibcageBuildState,
      inspectRibBonusLanding: inspectRibBonusLanding,
      inspectSternumBonusLanding: inspectSternumBonusLanding,
      inspectBonusLanding: inspectBonusLanding,
      inspectLockedGiantState: inspectLockedGiantState
    };
  }

  window.OssuaryBonusRuntimeDebug = {
    create: createBonusRuntimeDebug,
    scenarios: Object.keys(SCENARIOS)
  };
})();
