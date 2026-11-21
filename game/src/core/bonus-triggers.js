(function () {
  "use strict";

  function createBonusTriggers(options) {
    var state = options.state;
    var config = options.config;

    function reelById(reelId) {
      return state.reels.find(function (reel) { return reel.id === reelId; }) || null;
    }

    function bonusRibTriggerItems() {
      return config.BONUS_RIB_TRIGGER_GROUPS.map(function (group) {
        var reel = group.reelIds
          .map(reelById)
          .find(function (candidate) {
            return candidate && candidate.giantSymbol === "RIB_BONUS";
          });

        return {
          groupId: group.id,
          groupLabel: group.label,
          reelId: reel ? reel.id : null,
          symbol: reel ? "RIB_BONUS" : null,
          present: Boolean(reel)
        };
      });
    }

    function isBonusTriggerConditionMet() {
      return bonusRibTriggerItems().every(function (item) { return item.present; });
    }

    function isSuperBonusTriggerConditionMet() {
      return isBonusTriggerConditionMet() && state.sternumReel.giantSymbol === config.STERNUM_GIANT_SYMBOL;
    }

    function detectBonusTrigger() {
      var ribItems = bonusRibTriggerItems();
      var bonusReady = ribItems.every(function (item) { return item.present; });
      var sternumItem = {
        reelId: state.sternumReel.id,
        symbol: state.sternumReel.giantSymbol === config.STERNUM_GIANT_SYMBOL ? config.STERNUM_GIANT_SYMBOL : null,
        present: state.sternumReel.giantSymbol === config.STERNUM_GIANT_SYMBOL
      };

      if (!bonusReady) return null;

      var triggerState = sternumItem.present
        ? config.BONUS_TRIGGER_STATES.SUPER_BONUS
        : config.BONUS_TRIGGER_STATES.BONUS;

      return Object.assign({}, triggerState, {
        ribItems: ribItems,
        sternumItem: sternumItem
      });
    }

    return {
      reelById: reelById,
      bonusRibTriggerItems: bonusRibTriggerItems,
      isBonusTriggerConditionMet: isBonusTriggerConditionMet,
      isSuperBonusTriggerConditionMet: isSuperBonusTriggerConditionMet,
      detectBonusTrigger: detectBonusTrigger
    };
  }

  window.OssuaryBonusTriggerEngine = {
    create: createBonusTriggers
  };
})();

