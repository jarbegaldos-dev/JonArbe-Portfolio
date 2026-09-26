(function () {
  "use strict";

  function createReelModel(options) {
    var layout = options.layout;
    var config = options.config;
    var state = options.state;
    var hooks = options.hooks;

    function makeReel(reelConfig, index, type) {
      var cells = reelConfig.cells.map(function (cell, cellIndex) {
        return Object.assign({}, cell, {
          reelIndex: index,
          reelCellIndex: cellIndex,
          reelId: reelConfig.id
        });
      });

      return {
        id: reelConfig.id,
        label: reelConfig.label,
        index: index,
        stopIndex: reelConfig.stopIndex ?? index,
        type: type,
        orientation: type === "sternum" ? "vertical" : "horizontal",
        cellStep: reelConfig.cellStep,
        scrollSign: reelConfig.scrollSign,
        cells: cells,
        phase: "idle",
        position: 0,
        velocity: 0,
        stopStartAt: 0,
        prepareLandingAt: 0,
        landingPrepared: false,
        decelStartedAt: 0,
        decelStartPosition: 0,
        decelEndPosition: 0,
        decelDuration: config.DECELERATION_TIME,
        targetPosition: 0,
        settleStartedAt: 0,
        settleStartPosition: 0,
        finalSymbols: [],
        currentVisibleSymbols: [],
        activeLandingSymbols: null,
        finalSymbolMap: new Map(),
        loopSymbolMap: new Map(),
        giantSymbol: null,
        currentVisibleGiantSymbol: null,
        activeLandingGiantSymbol: null,
        giantActive: false,
        rib1BonusVacant: false,
        locked: false,
        lockedSymbol: null,
        lockedGiantBlock: null,
        carryGiantBlock: null,
        debugGiantBlocks: [],
        continuousTrackEl: null,
        continuousTileEls: [],
        continuousTileRadius: config.VISIBLE_TILE_RADIUS,
        continuousReferenceCell: null,
        giantStripEl: null,
        giantEl: null
      };
    }

    function buildReels() {
      state.ribReels = layout.RIB_LAYOUT.map(function (rib, index) {
        return makeReel(rib, index, "rib");
      });
      state.sternumReel = makeReel(layout.STERNUM_LAYOUT, layout.RIB_LAYOUT.length, "sternum");
      state.reels = state.ribReels.concat([state.sternumReel]);
    }

    function resetReelToInitial(reel) {
      reel.position = 0;
      reel.velocity = 0;
      reel.stopStartAt = 0;
      reel.prepareLandingAt = 0;
      reel.landingPrepared = false;
      reel.decelStartedAt = 0;
      reel.decelStartPosition = 0;
      reel.targetPosition = 0;
      reel.settleStartedAt = 0;
      reel.settleStartPosition = 0;
      reel.finalSymbols = reel.cells.map(function (cell) { return cell.initial; });
      reel.currentVisibleSymbols = reel.finalSymbols.slice();
      reel.activeLandingSymbols = null;
      reel.giantSymbol = null;
      reel.currentVisibleGiantSymbol = null;
      reel.activeLandingGiantSymbol = null;
      reel.rib1BonusVacant = false;
      reel.loopSymbolMap = new Map();
      clearReelLock(reel);
      reel.carryGiantBlock = null;
      reel.debugGiantBlocks = [];
      hooks.buildFinalSymbolMap(reel, 0);
      hooks.clearGiantPool(reel);
      hooks.setReelPhase(reel, "idle");
      hooks.renderReel(reel);
      hooks.commitVisibleSymbols(reel);
    }

    function resetReelMotion() {
      for (var i = 0; i < state.reels.length; i++) {
        resetReelToInitial(state.reels[i]);
      }
    }

    function resetCellsToReference() {
      for (var i = 0; i < state.reels.length; i++) {
        resetReelToInitial(state.reels[i]);
      }
    }

    function applyReelLock(reel, symbol) {
      if (!reel || (reel.type !== "rib" && reel.type !== "sternum")) return false;
      reel.locked = true;
      reel.lockedSymbol = symbol;
      reel.carryGiantBlock = null;
      reel.lockedGiantBlock = {
        refPosition: reel.targetPosition || reel.position || 0,
        size: reel.cells.length,
        symbol: symbol,
        locked: true
      };
      reel.giantActive = true;
      return true;
    }

    function clearReelLock(reel) {
      if (!reel) return false;
      reel.locked = false;
      reel.lockedSymbol = null;
      reel.lockedGiantBlock = null;
      reel.carryGiantBlock = null;
      reel.giantSymbol = null;
      reel.giantActive = false;
      return true;
    }

    function clearAllReelLocks() {
      for (var i = 0; i < state.reels.length; i++) {
        clearReelLock(state.reels[i]);
      }
    }

    function refreshLockedGiantBlockPosition(reel, refPosition) {
      if (!reel || !reel.lockedGiantBlock) return false;
      reel.lockedGiantBlock.refPosition = refPosition;
      return true;
    }

    function syncGiantActive(reel) {
      if (!reel) return false;
      reel.giantActive = Boolean(reel.lockedGiantBlock) || Boolean(reel.giantSymbol);
      return reel.giantActive;
    }

    // Termina el LOCK (logico+estatico) sin tocar el resultado visual: el
    // giganta sigue siendo reel.giantSymbol, solo deja de estar fijo por
    // lockedGiantBlock. Lo usa la cadena de bonus fallida: el reel queda
    // desbloqueado (gira normal en el siguiente spin) pero el simbolo
    // gigante no se borra ni se reemplaza hasta que el spin lo desplace.
    function releaseLockKeepGiant(reel) {
      if (!reel) return false;
      reel.locked = false;
      reel.lockedSymbol = null;
      reel.lockedGiantBlock = null;
      reel.carryGiantBlock = null;
      syncGiantActive(reel);
      return true;
    }

    return {
      makeReel: makeReel,
      buildReels: buildReels,
      resetReelToInitial: resetReelToInitial,
      resetReelMotion: resetReelMotion,
      resetCellsToReference: resetCellsToReference,
      applyReelLock: applyReelLock,
      clearReelLock: clearReelLock,
      clearAllReelLocks: clearAllReelLocks,
      refreshLockedGiantBlockPosition: refreshLockedGiantBlockPosition,
      syncGiantActive: syncGiantActive,
      releaseLockKeepGiant: releaseLockKeepGiant
    };
  }

  window.OssuaryReelModel = {
    create: createReelModel
  };
})();
