(function () {
  "use strict";

  function prepareNormalBonusMode(options) {
    var reels = (options && options.reels) || [];
    var releaseLockForSpin = options && options.releaseLockForSpin;
    var fixedReelId = (options && options.fixedReelId) || "rib1";
    var releasedReels = [];
    var retainedReels = [];

    reels.forEach(function (reel) {
      if (!reel || (!reel.locked && !reel.lockedGiantBlock)) return;
      if (reel.id === fixedReelId) {
        retainedReels.push(reel.id);
        return;
      }
      if (typeof releaseLockForSpin !== "function") return;
      releaseLockForSpin(reel);
      releasedReels.push(reel.id);
    });

    return {
      releasedReels: releasedReels,
      retainedReels: retainedReels
    };
  }

  window.OssuaryBonusModeLockHandoff = {
    prepareNormalBonusMode: prepareNormalBonusMode
  };
})();
