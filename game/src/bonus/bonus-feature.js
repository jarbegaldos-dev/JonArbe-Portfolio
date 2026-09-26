(function () {
  "use strict";

  var BONUS_GAME_STATES = {
    IDLE: "IDLE",
    SPINNING: "SPINNING",
    LANDING: "LANDING",
    COLLECTING_LOCKS: "COLLECTING_LOCKS",
    RESPIN_PENDING: "RESPIN_PENDING",
    RESPINNING: "RESPINNING",
    BONUS_COMPLETE: "BONUS_COMPLETE",
    SUPER_BONUS_READY: "SUPER_BONUS_READY",
    BONUS_MODE_PENDING: "BONUS_MODE_PENDING",
    SUPER_BONUS_MODE_PENDING: "SUPER_BONUS_MODE_PENDING",
    IDLE_WITH_LOCKS: "IDLE_WITH_LOCKS"
  };

  function createBonusFeature(options) {
    var state = options.state;
    var hooks = options.hooks || {};
    var autoFreeSpinDelay = hooks.autoFreeSpinDelay || 900;
    var validBonusReels = [
      "rib1",
      "rib2-left",
      "rib2-right",
      "rib3-left",
      "rib3-right"
    ];
    var validBonusReelSet = new Set(validBonusReels);
    var sternumReelId = "sternum";
    var ribBonusSymbol = "RIB_BONUS";
    var sternumBonusSymbol = "STERNUM_BONUS";
    var lockManager = window.OssuaryBonusLockManager.create({
      validRibs: validBonusReels,
      sternumReelId: sternumReelId,
      ribSymbol: ribBonusSymbol,
      sternumSymbol: sternumBonusSymbol
    });

    var featureState = {
      active: false,
      mode: null,
      spinsRemaining: 0,
      totalSpins: 0,
      totalWin: 0,
      currentSpinWin: 0,
      lastTrigger: null,
      pendingAutoSpin: false,
      label: null,
      phase: BONUS_GAME_STATES.IDLE,
      completed: false,
      superBonusReady: false,
      modePendingType: null,
      lastTransitionReason: null,
      lastNewLock: null
    };

    function lockSnapshot() {
      return lockManager.snapshot();
    }

    function logBonus(message, payload) {
      if (typeof console !== "undefined" && typeof console.info === "function") {
        console.info("[Ossuary Bonus] " + message, payload || {});
      }
    }

    function emitEvent(name, detail) {
      if (hooks.emitEvent) hooks.emitEvent(name, detail || {});
    }

    function transitionTo(nextPhase, reason, extraDetail) {
      if (featureState.phase === nextPhase && featureState.lastTransitionReason === reason) return;
      var previousPhase = featureState.phase;
      featureState.phase = nextPhase;
      featureState.lastTransitionReason = reason || null;
      logBonus("state transition", Object.assign({
        from: previousPhase,
        to: nextPhase,
        reason: reason || "",
        lockedRibs: lockManager.getLockedRibs(),
        lockedSternum: lockManager.isSternumLocked()
      }, extraDetail || {}));
      emitEvent("onBonusStateChanged", Object.assign({
        previousState: previousPhase,
        state: nextPhase,
        reason: reason || null
      }, publicStateFields(), extraDetail || {}));
    }

    function publicStateFields() {
      var locks = lockSnapshot();
      return {
        active: featureState.active,
        mode: featureState.mode,
        spinsRemaining: featureState.spinsRemaining,
        totalSpins: featureState.totalSpins,
        lockedRibs: locks.lockedRibs,
        lockedSternum: locks.lockedSternum,
        lockedReels: locks.lockedReels,
        lockedSymbols: locks.lockedSymbols,
        lockedRibCount: locks.lockedRibCount,
        totalWin: featureState.totalWin,
        currentSpinWin: featureState.currentSpinWin,
        lastTrigger: featureState.lastTrigger,
        pendingAutoSpin: featureState.pendingAutoSpin,
        label: featureState.label,
        phase: featureState.phase,
        completed: featureState.completed,
        superBonusReady: featureState.superBonusReady,
        modePendingType: featureState.modePendingType,
        lastTransitionReason: featureState.lastTransitionReason
      };
    }

    function syncState() {
      if (!state) return;
      var locks = lockSnapshot();
      state.bonusMode = featureState.mode;
      state.bonusFeatureActive = featureState.active;
      state.bonusSpinsRemaining = featureState.spinsRemaining;
      state.bonusTotalSpins = featureState.totalSpins;
      state.bonusLockedRibs = locks.lockedRibs;
      state.bonusLockedSternum = locks.lockedSternum;
      state.bonusLockedReels = locks.lockedReels;
      state.bonusLockedSymbols = locks.lockedSymbols;
      state.bonusLockedRibCount = locks.lockedRibCount;
      state.bonusTotalWin = featureState.totalWin;
      state.bonusCurrentSpinWin = featureState.currentSpinWin;
      state.bonusPendingAutoSpin = featureState.pendingAutoSpin;
      state.bonusPhase = featureState.phase;
      state.gameStatus = featureState.phase;
      state.bonusCompleted = featureState.completed;
      state.bonusSuperBonusReady = featureState.superBonusReady;
      state.bonusModePendingType = featureState.modePendingType;
    }

    function reset() {
      featureState.active = false;
      featureState.mode = null;
      featureState.spinsRemaining = 0;
      featureState.totalSpins = 0;
      featureState.totalWin = 0;
      featureState.currentSpinWin = 0;
      featureState.lastTrigger = null;
      featureState.pendingAutoSpin = false;
      featureState.label = null;
      featureState.completed = false;
      featureState.superBonusReady = false;
      featureState.modePendingType = null;
      featureState.lastTransitionReason = null;
      featureState.lastNewLock = null;
      lockManager.resetLocks();
      featureState.phase = BONUS_GAME_STATES.IDLE;
      syncState();
    }

    // Limpieza logica de los locks retenidos tras una cadena fallida
    // (IDLE_WITH_LOCKS). Solo debe llamarse cuando arranca una tirada BASE
    // real nueva, justo antes de pedir la limpieza visual equivalente
    // (game.js#clearBonusLocks).
    function clearHeldLocks() {
      if (featureState.phase !== BONUS_GAME_STATES.IDLE_WITH_LOCKS) return false;
      lockManager.resetLocks();
      featureState.phase = BONUS_GAME_STATES.IDLE;
      featureState.lastTransitionReason = "next_base_spin_cleared_held_locks";
      syncState();
      return true;
    }

    function ribcageBuildDebugInfo() {
      var locks = lockSnapshot();
      var symbolConfig = window.OSSUARY_SYMBOL_CONFIG || {};
      var weight = symbolConfig.RIBCAGE_BUILD_BONUS_RIB_WEIGHT_REAL || 1;
      var mode;
      if (featureState.completed && featureState.superBonusReady) {
        mode = "SUPER_BONUS";
      } else if (featureState.completed) {
        mode = "BONUS";
      } else if (featureState.active) {
        mode = "RIBCAGE_BUILD";
      } else {
        mode = "BASE";
      }

      return {
        mode: mode,
        boostActive: featureState.active && !featureState.completed,
        weight: weight,
        lockedRibs: locks.lockedRibs,
        sternumLocked: locks.lockedSternum,
        lastNewLock: featureState.lastNewLock
      };
    }

    function getState() {
      return publicStateFields();
    }

    function resultSpinType(result) {
      if (result && result.debugMode) return "DEBUG";
      if (result && result.spinType) return result.spinType;
      return featureState.active ? "BONUS" : "BASE";
    }

    function isFullSymbolList(symbols, expectedCount, symbol) {
      return Array.isArray(symbols) &&
        symbols.length === expectedCount &&
        symbols.every(function (entry) { return entry === symbol; });
    }

    function hasLandedRibBonus(reel) {
      if (!reel || !validBonusReelSet.has(reel.id)) return false;
      if (reel.giantSymbol === ribBonusSymbol) return true;
      if (reel.lockedSymbol === ribBonusSymbol) return true;
      if (reel.lockedGiantBlock && reel.lockedGiantBlock.symbol === ribBonusSymbol) return true;

      var cellCount = Array.isArray(reel.cells) ? reel.cells.length : 0;
      if (isFullSymbolList(reel.finalSymbols, cellCount, ribBonusSymbol)) return true;
      if (isFullSymbolList(reel.cells && reel.cells.map(function (cell) { return cell.effective; }), cellCount, ribBonusSymbol)) return true;

      return false;
    }

    function ribBonusReelsFrom(result) {
      if (result && Array.isArray(result.ribBonusLandingReels)) {
        return result.ribBonusLandingReels.filter(function (reelId) {
          return validBonusReelSet.has(reelId);
        });
      }

      var reels = result && Array.isArray(result.reels) ? result.reels : [];
      return reels
        .filter(hasLandedRibBonus)
        .map(function (reel) { return reel.id; });
    }

    function hasLandedSternumBonus(reel) {
      if (!reel || reel.id !== sternumReelId) return false;
      if (reel.giantSymbol === sternumBonusSymbol) return true;
      if (reel.lockedSymbol === sternumBonusSymbol) return true;
      if (reel.lockedGiantBlock && reel.lockedGiantBlock.symbol === sternumBonusSymbol) return true;

      var cellCount = Array.isArray(reel.cells) ? reel.cells.length : 0;
      if (isFullSymbolList(reel.finalSymbols, cellCount, sternumBonusSymbol)) return true;
      if (isFullSymbolList(reel.cells && reel.cells.map(function (cell) { return cell.effective; }), cellCount, sternumBonusSymbol)) return true;

      return false;
    }

    function sternumBonusReelsFrom(result) {
      if (result && result.sternumBonusLandingReel === sternumReelId) {
        return [sternumReelId];
      }

      var reels = result && Array.isArray(result.reels) ? result.reels : [];
      return reels
        .filter(hasLandedSternumBonus)
        .map(function (reel) { return reel.id; });
    }

    function collectingLabelFor(newRibs, newSternum) {
      if (newSternum && newRibs.length) return "BONUS RIB + STERNUM LOCKED";
      if (newSternum) return "STERNUM BONUS LOCKED";
      return "BONUS RIB LOCKED";
    }

    function autoFreeSpinAction() {
      featureState.pendingAutoSpin = true;
      featureState.spinsRemaining = 1;
      return {
        type: "AUTO_FREE_SPIN",
        delay: autoFreeSpinDelay,
        spinType: "BONUS"
      };
    }

    function baseResponse(overrides) {
      var locks = lockSnapshot();
      return Object.assign({
        handled: false,
        mode: featureState.mode,
        phase: featureState.phase,
        label: featureState.label,
        suppressBaseWin: false,
        nextAction: null,
        lockedRibs: locks.lockedRibs,
        lockedSternum: locks.lockedSternum,
        lockedReels: locks.lockedReels,
        lockedSymbols: locks.lockedSymbols,
        newLockedRibs: [],
        newLockedSternum: false,
        newLockedReels: [],
        spinType: "BASE",
        completed: featureState.completed,
        returnToBase: false,
        bonusWinToPay: 0,
        superBonusReady: featureState.superBonusReady,
        modePendingType: featureState.modePendingType
      }, overrides || {});
    }

    function applyNewLocks(ribReelIds, sternumReelIds) {
      var newRibs = [];
      var newSternum = false;

      for (var i = 0; i < ribReelIds.length; i++) {
        if (lockManager.addRibLock(ribReelIds[i])) {
          newRibs.push(ribReelIds[i]);
          emitEvent("onRibLocked", Object.assign({ reelId: ribReelIds[i] }, publicStateFields()));
        }
      }

      if (sternumReelIds.indexOf(sternumReelId) !== -1 && lockManager.addSternumLock()) {
        newSternum = true;
        emitEvent("onSternumLocked", Object.assign({ reelId: sternumReelId }, publicStateFields()));
      }

      var newReels = newRibs.concat(newSternum ? [sternumReelId] : []);
      if (newReels.length) {
        featureState.lastNewLock = newReels[newReels.length - 1];
      }

      return {
        newRibs: newRibs,
        newSternum: newSternum,
        newReels: newReels
      };
    }

    function completeCollecting(spinType, newLocks) {
      var bonusWinToPay = featureState.totalWin;
      var modeType = lockManager.isSuperBonusReady() ? "SUPER_BONUS" : "NORMAL_BONUS";
      var completeState = modeType === "SUPER_BONUS"
        ? BONUS_GAME_STATES.SUPER_BONUS_READY
        : BONUS_GAME_STATES.BONUS_COMPLETE;
      var pendingState = modeType === "SUPER_BONUS"
        ? BONUS_GAME_STATES.SUPER_BONUS_MODE_PENDING
        : BONUS_GAME_STATES.BONUS_MODE_PENDING;

      featureState.active = false;
      featureState.pendingAutoSpin = false;
      featureState.spinsRemaining = 0;
      featureState.completed = true;
      featureState.superBonusReady = modeType === "SUPER_BONUS";
      featureState.mode = modeType === "SUPER_BONUS" ? "SUPER_BONUS" : "BONUS";
      featureState.modePendingType = modeType;
      featureState.label = modeType === "SUPER_BONUS" ? "SUPER BONUS READY" : "BONUS COMPLETE";
      transitionTo(completeState, "required_locks_completed", {
        newLockedReels: newLocks.newReels
      });
      emitEvent("onBonusComplete", publicStateFields());
      if (modeType === "SUPER_BONUS") {
        emitEvent("onSuperBonusReady", publicStateFields());
      }
      transitionTo(pendingState, "awaiting_future_bonus_mode", {
        modePendingType: modeType
      });
      emitEvent(modeType === "SUPER_BONUS" ? "onSuperBonusModePending" : "onBonusModePending", publicStateFields());
      syncState();

      return baseResponse({
        handled: true,
        mode: featureState.mode,
        phase: featureState.phase,
        label: featureState.label,
        newLockedRibs: newLocks.newRibs,
        newLockedSternum: newLocks.newSternum,
        newLockedReels: newLocks.newReels,
        spinType: spinType,
        completed: true,
        returnToBase: false,
        bonusWinToPay: bonusWinToPay,
        superBonusReady: featureState.superBonusReady,
        modePendingType: modeType
      });
    }

    function continueCollecting(spinType, newLocks) {
      featureState.active = true;
      featureState.mode = "BONUS";
      featureState.completed = false;
      featureState.superBonusReady = false;
      featureState.modePendingType = null;
      featureState.label = collectingLabelFor(newLocks.newRibs, newLocks.newSternum);
      transitionTo(BONUS_GAME_STATES.COLLECTING_LOCKS, "new_lock_detected", {
        newLockedReels: newLocks.newReels
      });
      var nextAction = autoFreeSpinAction();
      transitionTo(BONUS_GAME_STATES.RESPIN_PENDING, "auto_respin_scheduled", {
        delay: nextAction.delay
      });
      syncState();

      return baseResponse({
        handled: true,
        mode: "BONUS",
        phase: featureState.phase,
        label: featureState.label,
        nextAction: nextAction,
        newLockedRibs: newLocks.newRibs,
        newLockedSternum: newLocks.newSternum,
        newLockedReels: newLocks.newReels,
        spinType: spinType
      });
    }

    function finishFailedCollecting(spinType) {
      var bonusWinToPay = featureState.totalWin;
      featureState.label = "BONUS ENDED";
      featureState.active = false;
      featureState.pendingAutoSpin = false;
      featureState.spinsRemaining = 0;
      featureState.modePendingType = null;
      featureState.lastNewLock = null;
      featureState.completed = false;
      featureState.superBonusReady = false;
      // Regla pedida por el usuario: cuando ya no hay mas respins (el respin
      // actual no ha bloqueado ningun bonus nuevo), la cadena termina AHI y
      // el juego debe volver inmediatamente a base. Eso permite que game.js
      // dispare clearBonusLocks() en este mismo cierre y, con ello, la caida
      // visual de rib1 exactamente al final real de la cadena, no en el
      // siguiente spin BASE.
      transitionTo(BONUS_GAME_STATES.IDLE, "no_new_lock_collecting_return_to_base");
      syncState();

      return baseResponse({
        handled: true,
        mode: "BONUS",
        phase: featureState.phase,
        label: featureState.label,
        spinType: spinType,
        returnToBase: true,
        bonusWinToPay: bonusWinToPay
      });
    }

    function inlineRib1OnlyContinuationMiss(result, newLocks) {
      if (!result || !result.inlineRib1BonusContinuation) return false;
      if (!newLocks || !Array.isArray(newLocks.newReels)) return false;
      return newLocks.newReels.length === 1 && newLocks.newReels[0] === "rib1";
    }

    function onSpinFinished(result) {
      var trigger = result && result.trigger ? result.trigger : null;
      var spinType = resultSpinType(result);
      var spinWin = result && typeof result.spinWin === "number" ? result.spinWin : 0;

      if (spinType === "DEBUG") {
        return baseResponse({
          handled: Boolean(trigger),
          mode: trigger ? (trigger.id === "SUPER_BONUS" ? "SUPER_BONUS" : "BONUS") : null,
          phase: "DEBUG",
          label: trigger ? (trigger.announcement || trigger.label || null) : null,
          spinType: "DEBUG"
        });
      }

      transitionTo(spinType === "BONUS" ? BONUS_GAME_STATES.LANDING : BONUS_GAME_STATES.LANDING, "spin_finished", {
        spinType: spinType
      });

      var landedRibBonusReels = ribBonusReelsFrom(result);
      var landedSternumBonusReels = sternumBonusReelsFrom(result);
      var hadActiveBonus = featureState.active;
      var newLocks = applyNewLocks(landedRibBonusReels, landedSternumBonusReels);
      var hasNewLock = newLocks.newReels.length > 0;

      logBonus("spin result", {
        spinType: spinType,
        landedRibBonusReels: landedRibBonusReels,
        landedSternumBonusReels: landedSternumBonusReels,
        newLockedReels: newLocks.newReels,
        lockedRibs: lockManager.getLockedRibs(),
        lockedSternum: lockManager.isSternumLocked(),
        hasNewLock: hasNewLock
      });

      if (spinType === "BASE" && !hasNewLock) {
        // Si quedaban locks vivos (gigante/glow/ojos encendidos tras un
        // bonus completado en MODE_PENDING), reset() limpia solo la
        // logica; hay que pedir limpieza visual con returnToBase para que
        // game.js#clearBonusLocks apague reel.locked, el glow verde y los
        // ojos. Sin esto, los visuales quedan clavados desincronizados.
        var hadLiveLocks = lockManager.getLockedReels().length > 0;
        reset();
        return baseResponse({
          handled: false,
          mode: null,
          phase: BONUS_GAME_STATES.IDLE,
          label: null,
          spinType: "BASE",
          returnToBase: hadLiveLocks
        });
      }

      if (spinType === "BONUS" && !hadActiveBonus && !hasNewLock) {
        reset();
        return baseResponse({
          handled: false,
          mode: null,
          phase: BONUS_GAME_STATES.IDLE,
          label: null,
          spinType: "BONUS",
          returnToBase: true
        });
      }

      if (spinType === "BONUS") {
        featureState.currentSpinWin = spinWin;
        featureState.totalWin = Math.round((featureState.totalWin + spinWin) * 100) / 100;
        featureState.totalSpins += 1;
      } else {
        featureState.currentSpinWin = 0;
      }

      featureState.lastTrigger = trigger;
      featureState.pendingAutoSpin = false;
      featureState.spinsRemaining = 0;

      if (lockManager.isBonusComplete()) {
        return completeCollecting(spinType, newLocks);
      }

      if (inlineRib1OnlyContinuationMiss(result, newLocks)) {
        return finishFailedCollecting(spinType);
      }

      if (hasNewLock) {
        return continueCollecting(spinType, newLocks);
      }

      return finishFailedCollecting(spinType);
    }

    function fakeReelsWithLocks(ribReelIds, sternumBonus) {
      var reelSet = new Set(ribReelIds || []);
      var reels = validBonusReels.map(function (reelId) {
        return {
          id: reelId,
          giantSymbol: reelSet.has(reelId) ? ribBonusSymbol : null
        };
      });
      reels.push({
        id: sternumReelId,
        giantSymbol: sternumBonus ? sternumBonusSymbol : null
      });
      return reels;
    }

    function runDebugStep(step) {
      var response = onSpinFinished({
        trigger: null,
        reels: fakeReelsWithLocks(step.ribBonusReels || [], Boolean(step.sternumBonus)),
        ribBonusLandingReels: step.ribBonusReels || [],
        sternumBonusLandingReel: step.sternumBonus ? sternumReelId : null,
        bet: 0,
        debugMode: false,
        spinType: step.spinType,
        spinWin: step.spinWin || 0
      });
      return {
        name: step.name,
        response: response,
        state: getState()
      };
    }

    function runDebugScenario(scenarioId) {
      var scenarios = {
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
        FIVE_RIBS_WITH_STERNUM: [
          { name: "BASE lock sternum + rib1", spinType: "BASE", ribBonusReels: ["rib1"], sternumBonus: true },
          { name: "BONUS new lock rib2-left", spinType: "BONUS", ribBonusReels: ["rib2-left"] },
          { name: "BONUS new lock rib2-right", spinType: "BONUS", ribBonusReels: ["rib2-right"] },
          { name: "BONUS new lock rib3-left", spinType: "BONUS", ribBonusReels: ["rib3-left"] },
          { name: "BONUS new lock rib3-right", spinType: "BONUS", ribBonusReels: ["rib3-right"] }
        ]
      };

      var steps = scenarios[scenarioId];
      if (!steps) return null;
      reset();
      return {
        id: scenarioId,
        steps: steps.map(runDebugStep),
        finalState: getState()
      };
    }

    function debugLockRib(reelId) {
      var added = lockManager.addRibLock(reelId);
      if (added) {
        featureState.lastNewLock = reelId;
        emitEvent("onRibLocked", Object.assign({ reelId: reelId, debug: true }, publicStateFields()));
      }
      featureState.active = true;
      featureState.mode = "BONUS";
      featureState.label = added ? "DEBUG RIB LOCKED" : "DEBUG RIB ALREADY LOCKED";
      featureState.completed = lockManager.isBonusComplete();
      featureState.superBonusReady = lockManager.isSuperBonusReady();
      if (featureState.completed) {
        var ribModeType = featureState.superBonusReady ? "SUPER_BONUS" : "NORMAL_BONUS";
        featureState.active = false;
        featureState.mode = ribModeType === "SUPER_BONUS" ? "SUPER_BONUS" : "BONUS";
        featureState.modePendingType = ribModeType;
        featureState.label = ribModeType === "SUPER_BONUS" ? "SUPER BONUS READY" : "BONUS COMPLETE";
        transitionTo(featureState.superBonusReady ? BONUS_GAME_STATES.SUPER_BONUS_READY : BONUS_GAME_STATES.BONUS_COMPLETE, "debug_rib_completed_bonus");
        emitEvent("onBonusComplete", publicStateFields());
        if (featureState.superBonusReady) emitEvent("onSuperBonusReady", publicStateFields());
        transitionTo(featureState.superBonusReady ? BONUS_GAME_STATES.SUPER_BONUS_MODE_PENDING : BONUS_GAME_STATES.BONUS_MODE_PENDING, "debug_bonus_mode_pending");
        emitEvent(featureState.superBonusReady ? "onSuperBonusModePending" : "onBonusModePending", publicStateFields());
      } else {
        transitionTo(BONUS_GAME_STATES.COLLECTING_LOCKS, added ? "debug_rib_lock" : "debug_rib_repeated");
      }
      syncState();
      return getState();
    }

    function debugLockAllRibs() {
      for (var i = 0; i < validBonusReels.length; i++) {
        if (lockManager.addRibLock(validBonusReels[i])) {
          emitEvent("onRibLocked", Object.assign({ reelId: validBonusReels[i], debug: true }, publicStateFields()));
        }
      }
      featureState.active = true;
      featureState.mode = "BONUS";
      featureState.completed = true;
      featureState.superBonusReady = lockManager.isSuperBonusReady();
      featureState.modePendingType = featureState.superBonusReady ? "SUPER_BONUS" : "NORMAL_BONUS";
      featureState.label = featureState.superBonusReady ? "SUPER BONUS READY" : "BONUS COMPLETE";
      transitionTo(featureState.superBonusReady ? BONUS_GAME_STATES.SUPER_BONUS_READY : BONUS_GAME_STATES.BONUS_COMPLETE, "debug_all_ribs_locked");
      emitEvent("onBonusComplete", publicStateFields());
      if (featureState.superBonusReady) emitEvent("onSuperBonusReady", publicStateFields());
      transitionTo(featureState.superBonusReady ? BONUS_GAME_STATES.SUPER_BONUS_MODE_PENDING : BONUS_GAME_STATES.BONUS_MODE_PENDING, "debug_bonus_mode_pending");
      emitEvent(featureState.superBonusReady ? "onSuperBonusModePending" : "onBonusModePending", publicStateFields());
      syncState();
      return getState();
    }

    function debugLockSternum() {
      var added = lockManager.addSternumLock();
      if (added) {
        featureState.lastNewLock = sternumReelId;
        emitEvent("onSternumLocked", Object.assign({ reelId: sternumReelId, debug: true }, publicStateFields()));
      }
      featureState.active = true;
      featureState.mode = "BONUS";
      featureState.label = added ? "DEBUG STERNUM LOCKED" : "DEBUG STERNUM ALREADY LOCKED";
      featureState.completed = lockManager.isBonusComplete();
      featureState.superBonusReady = lockManager.isSuperBonusReady();
      if (featureState.superBonusReady) {
        featureState.active = false;
        featureState.mode = "SUPER_BONUS";
        featureState.modePendingType = "SUPER_BONUS";
        featureState.label = "SUPER BONUS READY";
        transitionTo(BONUS_GAME_STATES.SUPER_BONUS_READY, "debug_sternum_completed_super_bonus");
        emitEvent("onSuperBonusReady", publicStateFields());
        transitionTo(BONUS_GAME_STATES.SUPER_BONUS_MODE_PENDING, "debug_super_bonus_mode_pending");
        emitEvent("onSuperBonusModePending", publicStateFields());
      } else {
        transitionTo(BONUS_GAME_STATES.COLLECTING_LOCKS, added ? "debug_sternum_lock" : "debug_sternum_repeated");
      }
      syncState();
      return getState();
    }

    return {
      onSpinFinished: onSpinFinished,
      reset: reset,
      clearHeldLocks: clearHeldLocks,
      getState: getState,
      runDebugScenario: runDebugScenario,
      debugLockRib: debugLockRib,
      debugLockAllRibs: debugLockAllRibs,
      debugLockSternum: debugLockSternum,
      ribcageBuildDebugInfo: ribcageBuildDebugInfo,
      states: BONUS_GAME_STATES
    };
  }

  window.OssuaryBonusFeature = {
    create: createBonusFeature,
    states: BONUS_GAME_STATES
  };
})();
