(function () {
  "use strict";

  function createBonusLockManager(options) {
    var validRibs = (options && options.validRibs) || [];
    var sternumReelId = (options && options.sternumReelId) || "sternum";
    var ribSymbol = (options && options.ribSymbol) || "RIB_BONUS";
    var sternumSymbol = (options && options.sternumSymbol) || "STERNUM_BONUS";
    var validRibSet = new Set(validRibs);

    var lockedRibs = [];
    var lockedSternum = false;

    function addRibLock(reelId) {
      if (!validRibSet.has(reelId) || lockedRibs.indexOf(reelId) !== -1) return false;
      lockedRibs.push(reelId);
      return true;
    }

    function addSternumLock() {
      if (lockedSternum) return false;
      lockedSternum = true;
      return true;
    }

    function getLockedRibs() {
      return lockedRibs.slice();
    }

    function isSternumLocked() {
      return lockedSternum;
    }

    function getLockedRibCount() {
      return lockedRibs.length;
    }

    function getLockedReels() {
      var reels = lockedRibs.slice();
      if (lockedSternum) reels.push(sternumReelId);
      return reels;
    }

    function getLockedSymbols() {
      var symbols = {};
      for (var i = 0; i < lockedRibs.length; i++) {
        symbols[lockedRibs[i]] = ribSymbol;
      }
      if (lockedSternum) symbols[sternumReelId] = sternumSymbol;
      return symbols;
    }

    function isBonusComplete() {
      return validRibs.every(function (reelId) {
        return lockedRibs.indexOf(reelId) !== -1;
      });
    }

    function isSuperBonusReady() {
      return isBonusComplete() && lockedSternum;
    }

    function resetLocks() {
      lockedRibs = [];
      lockedSternum = false;
    }

    function snapshot() {
      return {
        lockedRibs: getLockedRibs(),
        lockedSternum: lockedSternum,
        lockedReels: getLockedReels(),
        lockedSymbols: getLockedSymbols(),
        lockedRibCount: getLockedRibCount(),
        bonusComplete: isBonusComplete(),
        superBonusReady: isSuperBonusReady()
      };
    }

    return {
      addRibLock: addRibLock,
      addSternumLock: addSternumLock,
      getLockedRibs: getLockedRibs,
      isSternumLocked: isSternumLocked,
      getLockedRibCount: getLockedRibCount,
      getLockedReels: getLockedReels,
      getLockedSymbols: getLockedSymbols,
      isBonusComplete: isBonusComplete,
      isSuperBonusReady: isSuperBonusReady,
      resetLocks: resetLocks,
      snapshot: snapshot
    };
  }

  window.OssuaryBonusLockManager = {
    create: createBonusLockManager
  };
})();
