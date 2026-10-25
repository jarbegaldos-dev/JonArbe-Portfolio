(function () {
  "use strict";

  var symbolConfig = window.OSSUARY_SYMBOL_CONFIG || {};
  var layoutConfig = window.OSSUARY_LAYOUT_CONFIG || {};

  function cloneList(list) {
    return Array.isArray(list) ? list.slice() : [];
  }

  function reelIdsFromLayout() {
    var ribIds = Array.isArray(layoutConfig.RIB_LAYOUT)
      ? layoutConfig.RIB_LAYOUT.map(function (reel) { return reel.id; })
      : [];
    var sternumId = layoutConfig.STERNUM_LAYOUT && layoutConfig.STERNUM_LAYOUT.id;
    return sternumId ? ribIds.concat(sternumId) : ribIds;
  }

  function assignDefaultStrip(reelIds, stripId) {
    return reelIds.reduce(function (assignments, reelId) {
      assignments[reelId] = stripId;
      return assignments;
    }, {});
  }

  var weightedNormalSymbols = cloneList(
    symbolConfig.WEIGHTED_NORMAL_SYMBOLS || symbolConfig.NORMAL_SYMBOLS
  );
  var defaultBaseStripSymbols = cloneList(
    symbolConfig.SPIN_SYMBOLS || weightedNormalSymbols.concat("WILD")
  );
  var defaultBaseStripId = "BASE_WEIGHTED_DEFAULT";
  var activeReelIds = reelIdsFromLayout();

  window.OSSUARY_REEL_STRIP_CONFIG = {
    version: 1,
    active: true,
    defaultStripId: defaultBaseStripId,
    strips: {
      BASE_WEIGHTED_DEFAULT: {
        id: defaultBaseStripId,
        mode: "weighted_symbol_list",
        symbols: defaultBaseStripSymbols
      }
    },
    reelStrips: assignDefaultStrip(activeReelIds, defaultBaseStripId)
  };
})();
