(function () {
  "use strict";

  function createInitialState() {
    return {
      initialBalance: 10000,
      balance: 10000,
      betIndex: 2,
      win: 0,
      bonusLabel: "",
      bonusTrigger: null,
      sceneFx: "",
      gameStatus: "IDLE",
      spinning: false,
      busy: false,
      auto: false,
      autoSpinConfigured: 50,
      autoSpinsRemaining: 0,
      autoTimer: null,
      spinFrame: null,
      spinStartTime: 0,
      lastFrameTime: 0,
      nextSpinSequence: 0,
      currentSpinId: null,
      lastPaidSpinId: null,
      lastPayment: null,
      debugGiantTest: null,
      purchasedForcedRibBonusQueue: [],
      pendingPurchasedSpin: null,
      currentPurchasedSpinType: null,
      purchasedBladeSpinCrowSlots: [],
      forceSmallBladeDoorVideosForSpin: false,
      activeBonusModeSession: null,
      lastCompletedBonusModeSession: null,
      bonusModeSession: null,
      bonusModeType: null,
      bonusModeRulesProfile: null,
      bonusModeSpinsRemaining: 0,
      bonusModeSpinsAwarded: 0,
      bonusModeBladeDropsLanded: 0,
      bonusModeSpinStartChances: 0,
      bonusModePendingHandCount: 0,
      bonusModeCutPendingRelease: false,
      bonusModeBladeCutMultiplier: 1,
      bonusModeActive: false,
      bonusModeBoardBlank: false,
      bladeLevel: 0,
      bladeMultiplier: 1,
      bonusBladeAttachedMultiplier: 1,
      bonusBladeLevelUpPending: false,
      bonusHandCount: 0,
      bonusHandTarget: 0,
      bonusHandBoxMultiplier: 0,
      bonusIntroOffer: null,
      bonusIntroTimer: null,
      reels: [],
      ribReels: [],
      sternumReel: null
    };
  }

  function resetSessionState(state) {
    state.balance = state.initialBalance;
    state.betIndex = 2;
    state.win = 0;
    state.bonusLabel = "";
    state.bonusTrigger = null;
    state.sceneFx = "";
    state.gameStatus = "IDLE";
    state.spinning = false;
    state.auto = false;
    state.autoSpinConfigured = 50;
    state.autoSpinsRemaining = 0;
    state.nextSpinSequence = 0;
    state.currentSpinId = null;
    state.lastPaidSpinId = null;
    state.lastPayment = null;
    state.debugGiantTest = null;
    state.purchasedForcedRibBonusQueue = [];
    state.pendingPurchasedSpin = null;
    state.currentPurchasedSpinType = null;
    state.purchasedBladeSpinCrowSlots = [];
    state.forceSmallBladeDoorVideosForSpin = false;
    state.activeBonusModeSession = null;
    state.lastCompletedBonusModeSession = null;
    state.bonusModeSession = null;
    state.bonusModeType = null;
    state.bonusModeRulesProfile = null;
    state.bonusModeSpinsRemaining = 0;
    state.bonusModeSpinsAwarded = 0;
    state.bonusModeBladeDropsLanded = 0;
    state.bonusModeSpinStartChances = 0;
    state.bonusModePendingHandCount = 0;
    state.bonusModeCutPendingRelease = false;
    state.bonusModeBladeCutMultiplier = 1;
    state.bonusModeActive = false;
    state.bonusModeBoardBlank = false;
    state.bladeLevel = 0;
    state.bladeMultiplier = 1;
    state.bonusBladeAttachedMultiplier = 1;
    state.bonusBladeLevelUpPending = false;
    state.bonusHandCount = 0;
    state.bonusHandTarget = 0;
    state.bonusHandBoxMultiplier = 0;
    state.bonusIntroOffer = null;
    state.bonusIntroTimer = null;
  }

  window.OssuaryGameState = {
    createInitialState: createInitialState,
    resetSessionState: resetSessionState
  };
})();
