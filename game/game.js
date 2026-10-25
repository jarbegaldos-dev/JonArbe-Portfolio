const stage = document.getElementById("slotStage");
const reelLayer = document.getElementById("reelLayer");
const uiLayer = document.getElementById("uiLayer");
const SVG_NS = "http://www.w3.org/2000/svg";
const bonusIntroModalEl = document.getElementById("bonusIntroModal");
const bonusIntroTitleEl = document.getElementById("bonusIntroTitle");
const bonusIntroContinueBtn = document.getElementById("bonusIntroContinueBtn");

const LAYOUT_CONFIG = window.OSSUARY_LAYOUT_CONFIG || {};
const SPIN_CONFIG = window.OSSUARY_SPIN_CONFIG || {};
const SYMBOL_CONFIG = window.OSSUARY_SYMBOL_CONFIG || {};
const BONUS_MODE_CONFIG = window.OSSUARY_BONUS_MODE_CONFIG || { modes: {} };
const COMBO_CONFIG = window.OSSUARY_COMBO_CONFIG || {};
const DEV_PAYTABLE_CONFIG = window.OSSUARY_DEV_PAYTABLE_CONFIG || { mode: "DEV_ONLY", symbols: [] };
const ECONOMY_CONFIG = window.OSSUARY_ECONOMY_CONFIG;
const REEL_STRIP_CONFIG = window.OSSUARY_REEL_STRIP_CONFIG || null;
const SCENE_FX_CONFIG = window.OSSUARY_SCENE_FX_CONFIG || {};

const IMAGE_REFERENCE = LAYOUT_CONFIG.IMAGE_REFERENCE;
const RIB_LAYOUT = LAYOUT_CONFIG.RIB_LAYOUT || [];
const STERNUM_LAYOUT = LAYOUT_CONFIG.STERNUM_LAYOUT;

const NORMAL_SYMBOLS = SYMBOL_CONFIG.NORMAL_SYMBOLS || [];
const WEIGHTED_NORMAL_SYMBOLS = SYMBOL_CONFIG.WEIGHTED_NORMAL_SYMBOLS || NORMAL_SYMBOLS;
const SPIN_SYMBOLS = SYMBOL_CONFIG.SPIN_SYMBOLS || [...WEIGHTED_NORMAL_SYMBOLS, "WILD"];

const STERNUM_GIANT_SYMBOL = SYMBOL_CONFIG.STERNUM_GIANT_SYMBOL;
const BET_STEPS = SPIN_CONFIG.BET_STEPS || [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 50, 100];
const DEFAULT_BET_AMOUNT = 1;
const BUY_BONUS_OPTIONS = {
  "bonus-game": {
    costMultiplier: 100,
    forcedRibBonusQueue: [1, 2],
    label: "BONUS BUY"
  },
  "blade-spin": {
    costMultiplier: 25,
    forceSmallBladeBirdCuts: 2,
    label: "BLADE BUY"
  },
  "chest-game": {
    costMultiplier: 21,
    startsRuletaGame: true,
    label: "CHEST BUY"
  },
  // SUPER BONUS "El Juicio" (peticion del usuario, 2026-10-17): el
  // encapuchado cae al esternon, entrada y PLAY, como con la llave negra.
  "super-bonus": {
    costMultiplier: 500,
    startsElJuicio: true,
    label: "SUPER BUY"
  }
};
Object.keys(BUY_BONUS_OPTIONS).forEach((id) => { BUY_BONUS_OPTIONS[id].costMultiplier = ECONOMY_CONFIG.costs[id]; });

const ACCELERATION_TIME = SPIN_CONFIG.ACCELERATION_TIME;
const MAX_REEL_SPEED = SPIN_CONFIG.MAX_REEL_SPEED;
const CRUISE_SPEED = SPIN_CONFIG.CRUISE_SPEED;
const CRUISE_TIME = SPIN_CONFIG.CRUISE_TIME;
const BONUS_RESPIN_EXTRA_CRUISE_MS = SPIN_CONFIG.BONUS_RESPIN_EXTRA_CRUISE_MS || 0;
const SUPER_BONUS_TRANSITION_CRUISE_SPEED_MULTIPLIER = SPIN_CONFIG.SUPER_BONUS_TRANSITION_CRUISE_SPEED_MULTIPLIER || 2;
const SUPER_BONUS_TRANSITION_DURATION_MS = SPIN_CONFIG.SUPER_BONUS_TRANSITION_DURATION_MS || 3500;
const PREPARE_LANDING_TIME = SPIN_CONFIG.PREPARE_LANDING_TIME;
const DECELERATION_TIME = SPIN_CONFIG.DECELERATION_TIME;
const STOP_OVERSHOOT_SYMBOLS = SPIN_CONFIG.STOP_OVERSHOOT_SYMBOLS;
const STOP_REBOUND_SYMBOLS = SPIN_CONFIG.STOP_REBOUND_SYMBOLS;
const SETTLE_TIME = SPIN_CONFIG.SETTLE_TIME;
const WINDUP_TIME = SPIN_CONFIG.WINDUP_TIME || 0;
const BASE_STOP_SEQUENCE = SPIN_CONFIG.BASE_STOP_SEQUENCE || {};

const AUTO_SPIN_DELAY = SPIN_CONFIG.AUTO_SPIN_DELAY;
const RIB_GIANT_CHANCE = SYMBOL_CONFIG.RIB_GIANT_CHANCE;
const RIB_GIANT_BONUS_SHARE = SYMBOL_CONFIG.RIB_GIANT_BONUS_SHARE;
const RIBCAGE_BUILD_BONUS_RIB_WEIGHT = SYMBOL_CONFIG.RIBCAGE_BUILD_BONUS_RIB_WEIGHT_REAL || 1;
const RIB_BONUS_REELS = new Set(SYMBOL_CONFIG.RIB_BONUS_REELS || []);
const RIB_BONUS_SEQUENCE = SYMBOL_CONFIG.RIB_BONUS_SEQUENCE || SYMBOL_CONFIG.RIB_BONUS_REELS || [];
const BONUS_RIB_TRIGGER_GROUPS = SYMBOL_CONFIG.BONUS_RIB_TRIGGER_GROUPS || [];
const BONUS_TRIGGER_STATES = SYMBOL_CONFIG.BONUS_TRIGGER_STATES || {};
const STERNUM_BONUS_CHANCE = SYMBOL_CONFIG.STERNUM_BONUS_CHANCE;
const FREE_SPIN_RIB_SYMBOLS = SYMBOL_CONFIG.FREE_SPIN_RIB_SYMBOLS || ["POBRE", "NOBLE", "RICO"];
// Pesos PROVISIONALES del Bonus Game (balance temporal a peticion del
// usuario): sorteo ponderado de rib2-5 (fallback uniforme si falta) y
// probabilidad DINAMICA de la cuchilla segun oportunidades restantes.
// Solo los lee outcome-engine (bonus mode).
const WEIGHTED_FREE_SPIN_RIB_SYMBOLS = SYMBOL_CONFIG.WEIGHTED_FREE_SPIN_RIB_SYMBOLS || [];
const BONUS_MODE_BLADE_CHANCE_BY_CHANCES = SYMBOL_CONFIG.BONUS_MODE_BLADE_CHANCE_BY_CHANCES || null;
const BONUS_MODE_BLADE_DELAYED_START = SYMBOL_CONFIG.BONUS_MODE_BLADE_DELAYED_START || null;
// Esqueletos "de paso" (solo visual) durante el giro de rib2-5 en bonus mode.
const BONUS_MODE_PASSING_SKELETONS = SYMBOL_CONFIG.BONUS_MODE_PASSING_SKELETONS || null;
const BONUS_MODE_PASSING_BLADE = SYMBOL_CONFIG.BONUS_MODE_PASSING_BLADE || null;
const BONUS_MODE_STERNUM_TENSION = SYMBOL_CONFIG.BONUS_MODE_STERNUM_TENSION || {};
const BONUS_MODE_STERNUM_CRUISE_SPEED_MULTIPLIER = SYMBOL_CONFIG.BONUS_MODE_STERNUM_CRUISE_SPEED_MULTIPLIER || 1;
const NORMAL_BONUS_STRUCTURE_SWELL_BASE_SCALE = 1.018;
const NORMAL_BONUS_STRUCTURE_SWELL_HIGH_MULTIPLIER = 1.5;
const BONUS_MODE_BLADE_CHAIN_TIMEOUT_MS = 1700;
const BONUS_MODE_BLADE_RIG_CLEANUP_MS = 2800;
// Rediseño FREE SPIN (2026-07-03): el esternón del Bonus Game solo sortea
// cuchilla o vacío; la mecánica anterior (positivo/negativo/multiplicadores)
// quedó desactivada (ver LEGACY_* en symbols.config.js).
const BONUS_MODE_STERNUM_SYMBOLS = SYMBOL_CONFIG.BONUS_MODE_STERNUM_SYMBOLS || ["BLADE_BONUS", "STERNUM_CROSS_BONUS"];
const BONUS_MODE_STERNUM_BLADE_SYMBOLS = SYMBOL_CONFIG.BONUS_MODE_STERNUM_BLADE_SYMBOLS || ["BLADE_BONUS"];
const BONUS_MODE_SKELETON_SYMBOLS = SYMBOL_CONFIG.BONUS_MODE_SKELETON_SYMBOLS || ["POBRE", "NOBLE", "RICO"];
const BONUS_MODE_SKELETON_PRIZES = SYMBOL_CONFIG.BONUS_MODE_SKELETON_PRIZES || {};
const BONUS_MODE_SKELETON_HEAD_PRIZES = SYMBOL_CONFIG.BONUS_MODE_SKELETON_HEAD_PRIZES || {};
const VISIBLE_TILE_RADIUS = SPIN_CONFIG.VISIBLE_TILE_RADIUS;
const SYMBOL_STEP_PERCENT = SPIN_CONFIG.SYMBOL_STEP_PERCENT;
const GIANT_ENTRY_THRESHOLD = VISIBLE_TILE_RADIUS * SYMBOL_STEP_PERCENT;
const GIANT_POOL_SIZE = SPIN_CONFIG.GIANT_POOL_SIZE;
const GIANT_BLOCK_AMBIENT_CHANCE = SPIN_CONFIG.GIANT_BLOCK_AMBIENT_CHANCE;
const GIANT_DEBUG_TESTS = SYMBOL_CONFIG.GIANT_DEBUG_TESTS || {};

const SYMBOL_ASSETS = window.OSSUARY_SYMBOL_ASSETS || {};
const REEL_SYMBOL_ASSETS = window.OSSUARY_REEL_SYMBOL_ASSETS || {};
const REEL_SYMBOL_BACKGROUNDS = window.OSSUARY_REEL_SYMBOL_BACKGROUNDS || {};
const REEL_SYMBOL_OVERLAYS = window.OSSUARY_REEL_SYMBOL_OVERLAYS || {};
const REEL_SYMBOL_HEAD_OVERLAYS = window.OSSUARY_REEL_SYMBOL_HEAD_OVERLAYS || {};
const REEL_SYMBOL_VIDEO_OVERLAYS = window.OSSUARY_REEL_SYMBOL_VIDEO_OVERLAYS || {};

const state = window.OssuaryGameState.createInitialState();
const economicRounds = window.OssuaryEconomicRound.create({ maxMultiple: 20000 });
let economicFeatureSequence = 0;
let elJuicioEconomicPayment = null;
let ruletaEconomicPayment = null;
let economicSpinPlan = null;
let economicPresentationQueue = [];
let economicSelectedProgress = null;
let economicHiddenCreditCents = 0;
let economicBranchSteps = 0;
const economicTeasePlans = new WeakMap();
let economicTeasePendingForce = null;
let economicWheelPlan = null;
let economicJudgmentPlan = null;
let finishedEconomicJudgment = null;
let economicInlineActive = false;
let economicStoneIndex = 0;
let economicKilledCrowSlots = new Set();
const reservedEconomicPayments = new Map();
const TURBO_SPEED_MULTIPLIER = 2.5;
state.turbo = Boolean(state.turbo);
let gameClockRealAt = 0;
let gameClockValue = 0;
let turboAnimationSyncFrame = 0;

function turboActive() {
  return Boolean(state.turbo);
}

function gameSpeedMultiplier() {
  return turboActive() ? TURBO_SPEED_MULTIPLIER : 1;
}

function speedMs(ms) {
  const value = Number(ms) || 0;
  return Math.max(0, Math.round(value / gameSpeedMultiplier()));
}

function gameNow(realNow = window.performance.now()) {
  if (!gameClockRealAt) {
    gameClockRealAt = realNow;
    gameClockValue = realNow;
    return gameClockValue;
  }
  const delta = Math.max(0, realNow - gameClockRealAt);
  gameClockRealAt = realNow;
  gameClockValue += delta * gameSpeedMultiplier();
  return gameClockValue;
}

function resetGameClock(realNow = window.performance.now()) {
  gameClockRealAt = realNow;
  gameClockValue = realNow;
  return gameClockValue;
}

function syncAnimationPlaybackRate() {
  if (!document.getAnimations) return;
  const rate = gameSpeedMultiplier();
  document.getAnimations({ subtree: true }).forEach(function (animation) {
    if (typeof animation.updatePlaybackRate === "function") {
      animation.updatePlaybackRate(rate);
    } else {
      animation.playbackRate = rate;
    }
  });
}

function scheduleAnimationPlaybackSync() {
  if (!turboActive() || turboAnimationSyncFrame) return;
  function tick() {
    turboAnimationSyncFrame = 0;
    if (!turboActive()) {
      syncAnimationPlaybackRate();
      return;
    }
    syncAnimationPlaybackRate();
    turboAnimationSyncFrame = window.requestAnimationFrame(tick);
  }
  turboAnimationSyncFrame = window.requestAnimationFrame(tick);
}

window.OssuaryGameSpeed = {
  multiplier: gameSpeedMultiplier,
  ms: speedMs,
  isTurbo: turboActive
};

const GAME_STATES = (window.OssuaryBonusFeature && window.OssuaryBonusFeature.states) || {
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

state.gameStatus = GAME_STATES.IDLE;

function setGameStatus(status, reason = "") {
  state.gameStatus = status;
  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info("[Ossuary State]", {
      status,
      reason,
      currentSpinType: state.currentSpinType || "BASE",
      lockedRibs: state.bonusLockedRibs || [],
      lockedSternum: Boolean(state.bonusLockedSternum)
    });
  }
}

function bonusEventDomName(eventName) {
  return "ossuary:bonus:" + eventName.replace(/^on/, "").replace(/[A-Z]/g, (letter, index) => {
    return (index ? "-" : "") + letter.toLowerCase();
  });
}

function emitBonusLogicEvent(eventName, detail = {}) {
  const payload = Object.assign({
    gameStatus: state.gameStatus,
    currentSpinType: state.currentSpinType || "BASE",
    lockedRibs: state.bonusLockedRibs || [],
    lockedSternum: Boolean(state.bonusLockedSternum),
    lockedReels: state.bonusLockedReels || []
  }, detail);

  window.dispatchEvent(new CustomEvent(bonusEventDomName(eventName), {
    detail: payload
  }));

  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info("[Ossuary Bonus Event] " + eventName, payload);
  }
}

function emitPaymentEvent(eventName, detail = {}) {
  const payload = Object.assign({
    balance: state.balance,
    currentSpinId: state.currentSpinId,
    currentSpinType: state.currentSpinType || "BASE"
  }, detail);

  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  window.dispatchEvent(new CustomEvent("ossuary:payment:" + eventName, { detail: payload }));

  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info("[Ossuary Payment Event] " + eventName, payload);
  }
}

function formatCurrency(value) {
  return "\u20ac" + value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function normalizeBetAmount(value) {
  const numeric = Number(String(value).replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const cents = Math.round(numeric * 100);
  if (Math.abs(numeric * 100 - cents) > 0.001) return null;
  if (cents % 10 !== 0) return null;
  return cents / 100;
}

function ensureBetStepAmount(value) {
  const amount = normalizeBetAmount(value);
  if (amount === null) return -1;
  let index = BET_STEPS.findIndex((step) => Math.abs(step - amount) < 0.001);
  if (index !== -1) return index;
  BET_STEPS.push(amount);
  BET_STEPS.sort((a, b) => a - b);
  return BET_STEPS.findIndex((step) => Math.abs(step - amount) < 0.001);
}

function betIndexForAmount(value) {
  const index = ensureBetStepAmount(value);
  return index === -1 ? 0 : index;
}

function currentBet() {
  const frozen = economicRounds.bet();
  if (frozen !== null) return frozen;
  return BET_STEPS[state.betIndex] || DEFAULT_BET_AMOUNT;
}

function economicRoundPending() {
  return Boolean(state.spinning || state.busy || bonusSummaryOpen || isRuletaActive() ||
    isElJuicioActive() || state.ravenChain || state.bonusModeActive || state.bonusIntroOffer ||
    bonusFeature.getState().active || state.bonusModePendingType);
}

function closeEconomicRoundIfIdle() {
  if (!economicRounds.current() || economicRoundPending()) return false;
  if (pendingEconomicPresentation()) return false;
  const result = economicRounds.close("complete");
  state.lastEconomicRound = result;
  document.dispatchEvent(new CustomEvent("ossuary:economic-round-complete", { detail: result }));
  return true;
}

function betChangeBlocked() {
  closeEconomicRoundIfIdle();
  return Boolean(economicRounds.current() || economicRoundPending());
}

const economicStakeBanks = new Map();
function selectEconomicBet(nextIndex) {
  if (nextIndex === state.betIndex) return;
  const oldKey = Math.round(BET_STEPS[state.betIndex] * 100);
  economicStakeBanks.set(oldKey, {
    crows: smallBladeBirdPerch ? smallBladeBirdPerch.exportEconomicState() : [],
    chest: window.OssuaryRuletaGame ? window.OssuaryRuletaGame.exportEconomicState() : null,
    bladeMisses: smallBladeSpinsWithoutCut, bladeThreshold: smallBladeFloorThreshold,
    crowMisses: smallBladeSpinsWithoutBirdCut, crowThreshold: smallBladeBirdFloorThreshold
  });
  const bank = economicStakeBanks.get(Math.round(BET_STEPS[nextIndex] * 100));
  if (smallBladeBirdPerch) smallBladeBirdPerch.importEconomicState(bank ? bank.crows : [], (key) => {
    const slot = SMALL_BLADE_BIRD_PERCH_SLOTS.find((item) => item.key === key);
    return smallBladeBirdAnchorForCell(slot.cellIndex);
  });
  if (window.OssuaryRuletaGame) window.OssuaryRuletaGame.importEconomicState(bank && bank.chest);
  smallBladeSpinsWithoutCut = bank ? bank.bladeMisses : 0;
  smallBladeFloorThreshold = bank ? bank.bladeThreshold : 3 + Math.floor(Math.random() * 2);
  smallBladeSpinsWithoutBirdCut = bank ? bank.crowMisses : 0;
  smallBladeBirdFloorThreshold = bank ? bank.crowThreshold : 10 + Math.floor(Math.random() * 11);
  state.betIndex = nextIndex;
}

state.betIndex = betIndexForAmount(DEFAULT_BET_AMOUNT);

function mod(n, m) {
  return ((n % m) + m) % m;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const comboEngine = window.OssuaryComboEngine.create({
  state,
  config: COMBO_CONFIG
});

const comboEvaluator = window.OssuaryComboEvaluator.create({
  comboEngine,
  config: {
    NORMAL_SYMBOLS,
    EXCLUDED_SYMBOLS: ["RIB_BONUS", "STERNUM_BONUS", "CROWNED_SKULL"],
    WILD_SYMBOL: "WILD",
    MIN_MATCH_LENGTH: 3
  }
});

const mathEngine = window.OssuaryMathEngine.create({
  comboEngine,
  evaluatorConfig: {
    NORMAL_SYMBOLS,
    EXCLUDED_SYMBOLS: ["RIB_BONUS", "STERNUM_BONUS", "CROWNED_SKULL"],
    WILD_SYMBOL: "WILD",
    MIN_MATCH_LENGTH: 3
  },
  symbols: DEV_PAYTABLE_CONFIG.symbols
});

const payoutEngine = window.OssuaryPayoutEngine.create({
  state,
  comboEngine,
  hooks: {
    currentBet
  }
});

const paymentEngine = window.OssuaryPaymentEngine.create({
  state,
  economy: economicRounds,
  hooks: {
    getBalance: () => state.balance,
    setBalance: (nextBalance) => {
      state.balance = nextBalance;
    },
    emitEvent: emitPaymentEvent
  }
});

const bonusFeature = window.OssuaryBonusFeature.create({
  state,
  hooks: {
    autoFreeSpinDelay: AUTO_SPIN_DELAY,
    emitEvent: emitBonusLogicEvent
  }
});

const bonusModeRuntime = window.OssuaryBonusModeRuntime.create({
  state,
  config: BONUS_MODE_CONFIG,
  hooks: {
    emitEvent: emitBonusLogicEvent
  }
});
const bonusModeLockHandoff = window.OssuaryBonusModeLockHandoff;

const economicSeed = new URLSearchParams(window.location.search).get("mathseed") ||
  Array.from(window.crypto.getRandomValues(new Uint32Array(4))).join("-");
const rngEngine = window.OssuaryRngEngine.create({ seed: economicSeed });
if (window.OssuaryRib1Tease) {
  const forceTease = window.OssuaryRib1Tease.force;
  window.OssuaryRib1Tease.force = (kind) => {
    economicTeasePendingForce = forceTease(kind);
    return economicTeasePendingForce;
  };
}
function withEconomicRandom(action) {
  const visualRandom = Math.random;
  Math.random = () => rngEngine.next();
  try { return action(); } finally { Math.random = visualRandom; }
}
const economicModel = window.OssuaryEconomicModel.create({
  config: ECONOMY_CONFIG, rng: rngEngine, layout: LAYOUT_CONFIG, symbols: SYMBOL_CONFIG,
  paytable: DEV_PAYTABLE_CONFIG, stripConfig: REEL_STRIP_CONFIG,
  finiteStrips: window.OssuaryFiniteStrips, bonusConfig: BONUS_MODE_CONFIG,
  judgmentConfig: window.OSSUARY_EL_JUICIO_CONFIG,
  // Reuse the untouched anticipation module. Its complete joint outcome is
  // selected synchronously here, before any reel begins its presentation.
  planTease: selectEconomicTeasePlan
});

function restoreEconomicTeasePlan(snapshot) {
  const tease = window.OssuaryRib1Tease;
  if (!tease) return;
  const visualRandom = Math.random;
  // Initialize the private record through the unchanged public API, then
  // replay the exact selected record. The temporary record is never rendered.
  // This consumes neither economic draws nor ambient visual randomness.
  Math.random = () => 0;
  try {
    if (!snapshot) tease.planSpin({allowed:false});
    else {
      tease.planSpin({allowed:true,lands:true,symbols:[]});
      const current = tease.current();
      Object.keys(current).forEach((key) => { if (!(key in snapshot)) delete current[key]; });
      Object.assign(current, snapshot);
    }
  } finally {
    Math.random = visualRandom;
    if (economicTeasePendingForce !== null) tease.force(economicTeasePendingForce);
  }
}

function selectEconomicTeasePlan(context) {
  const tease = window.OssuaryRib1Tease;
  const previous = tease.current();
  try {
    const selected = withEconomicRandom(() => tease.planSpin(context));
    economicTeasePendingForce = null;
    if (selected) economicTeasePlans.set(selected, tease.current());
    return selected;
  } finally {
    restoreEconomicTeasePlan(previous);
  }
}

function reserveEconomicPlan(plan) {
  plan.credits.forEach((entry) => {
    economicHiddenCreditCents += Math.round(entry.amount * 100);
    const result = paymentEngine.applyPayment({ roundId: entry.roundId,
      paymentId: entry.paymentId, spinId: state.currentSpinId || entry.paymentId,
      totalWin: entry.raw, bet: currentBet(), context: { source: entry.source, spinType: plan.spinType || "BONUS" } });
    if (!result.applied || result.payment.totalWin !== entry.amount) throw new Error("Economic ledger diverged: " + entry.paymentId);
    reservedEconomicPayments.set(entry.paymentId, result);
  });
}

function publishEconomicPlan(plan) {
  document.dispatchEvent(new CustomEvent("ossuary:economic-plan", {detail:plan}));
}

function pendingEconomicPresentation() {
  return economicPresentationQueue.length ? economicPresentationQueue[0].plan.kind : economicModel.pending();
}

function enqueueEconomicPlan(plan) {
  if (++economicBranchSteps > 100000) throw new Error("Economic branch exceeded diagnostic bound");
  reserveEconomicPlan(plan);
  const bank = economicModel.bank();
  economicPresentationQueue.push({plan,progress:{chest:bank.chest,chestThreshold:bank.chestThreshold}});
}

function preselectEconomicBranch() {
  // Select and commit the complete known branch before any visual callback.
  // A real COLLECT/GAMBLE decision is the only point that pauses selection.
  while (economicModel.pending()) {
    if (economicModel.pending() === "wheel") {
      if (economicBranchSteps === 0 && economicRounds.current().product === "chest-game") {
        enqueueEconomicPlan(economicModel.next("gamble"));
        continue;
      }
      break;
    }
    enqueueEconomicPlan(economicModel.next());
  }
}

function takeEconomicPlan(action) {
  if (action) {
    if (economicPresentationQueue.length) {
      const selected = economicPresentationQueue[0].plan;
      if (selected.kind !== "wheel" || selected.action !== action) throw new Error("Unexpected selected economic wheel decision");
    } else {
      if (economicModel.pending() !== "wheel") throw new Error("Unexpected economic wheel decision");
      enqueueEconomicPlan(economicModel.next(action));
    }
  }
  preselectEconomicBranch();
  const entry = economicPresentationQueue.shift();
  if (!entry) throw new Error("No selected economic presentation");
  economicSelectedProgress = entry.progress;
  // Starting a replay is not a prize reveal: keep its committed credits hidden.
  return entry.plan;
}

function revealEconomicPayment(paymentId) {
  const result = reservedEconomicPayments.get(paymentId);
  if (!result) return null;
  reservedEconomicPayments.delete(paymentId);
  economicHiddenCreditCents -= Math.round(result.payment.totalWin * 100);
  if (economicHiddenCreditCents < 0) throw new Error("Negative hidden economic credit");
  return result;
}

function resetEconomicPresentation() {
  economicPresentationQueue = [];
  economicSelectedProgress = null;
  economicHiddenCreditCents = 0;
  economicBranchSteps = 0;
}

function presentedEconomicBalance() {
  // Keep the existing balance reveal rhythm while the real money is committed.
  return Math.round(state.balance * 100 - economicHiddenCreditCents) / 100;
}

function selectedEconomicCredit(options) {
  if (!economicSpinPlan) return null;
  if (options.spinId !== state.currentSpinId) return null;
  if (options.source === "bonus_mode_blade_cut") {
    const row = economicSpinPlan.rows.find((r) => options.paymentId.endsWith("-" + r.rowIndex));
    return row ? row.credit : null;
  }
  if (options.source === "bonus_mode_guadana_heads") return economicSpinPlan.headCredit || null;
  if (options.source === "base" || options.source === "bonus") return economicSpinPlan.credits.find((e) =>
    ["base_lines", "raven_lines", "collecting_lines"].includes(e.source)) || null;
  return null;
}

// Marca de Sangre y Ultimo Aliento del Execution Bonus (peticion del usuario,
// 2026-10-16): src/bonus/execution-enhancers.js; numeros en
// bonus-modes.config.js#executionEnhancers.
const executionEnhancers = window.OssuaryExecutionEnhancers
  ? window.OssuaryExecutionEnhancers.create({ rng: rngEngine, config: BONUS_MODE_CONFIG.executionEnhancers || {} })
  : null;

const sceneFx = window.OssuarySceneFx.create({
  stage,
  state,
  config: SCENE_FX_CONFIG,
  hooks: {
    sternumGiantSymbol: STERNUM_GIANT_SYMBOL,
    bonusRibTriggerItems,
    isBonusTriggerConditionMet
  }
});

function formatLayerOffset(value) {
  return sceneFx.formatLayerOffset(value);
}

function setSceneLayer(layerId, options = {}) {
  return sceneFx.setSceneLayer(layerId, options);
}

function showSceneLayer(layerId) {
  return sceneFx.showSceneLayer(layerId);
}

function hideSceneLayer(layerId) {
  return sceneFx.hideSceneLayer(layerId);
}

function moveSceneLayer(layerId, x, y) {
  return sceneFx.moveSceneLayer(layerId, x, y);
}

function scaleSceneLayer(layerId, scale) {
  return sceneFx.scaleSceneLayer(layerId, scale);
}

function setSceneFxClass(fxId) {
  return sceneFx.setSceneFxClass(fxId);
}

function clearBonusFxLayers() {
  return sceneFx.clearBonusFxLayers();
}

function activateBonusFx(fxId, duration) {
  return sceneFx.activateBonusFx(fxId, duration);
}

function nearBonusFromOutcome() {
  return sceneFx.nearBonusFromOutcome();
}

function activateBonusFxForOutcome(bonus) {
  return sceneFx.activateBonusFxForOutcome(bonus);
}

sceneFx.expose();

// Lectura externa de solo lectura para sincronizar efectos visuales (p.ej.
// la textura que se desplaza con el rodillo). No modifica ni altera el
// estado: solo expone los valores que ya se calculan para el spin.
window.OssuaryReelMotion = {
  SYMBOL_STEP_PERCENT,
  snapshot() {
    return state.reels.map((reel) => ({
      id: reel.id,
      orientation: reel.orientation,
      scrollSign: reel.scrollSign,
      position: reel.position,
      // Datos de fase para la mecánica del rodillo (textura + chasis).
      // Solo lectura; no se modifica el estado del spin.
      phase: reel.phase,
      targetPosition: reel.targetPosition,
      decelStartPosition: reel.decelStartPosition,
      decelEndPosition: reel.decelEndPosition
    }));
  }
};

const outcomeEngine = window.OssuaryOutcomeEngine.create({
  state,
  rng: rngEngine,
  stripConfig: REEL_STRIP_CONFIG,
  config: {
    SPIN_SYMBOLS,
    RIB_BONUS_REELS,
    RIB_BONUS_SEQUENCE,
    RIB_GIANT_CHANCE,
    RIB_GIANT_BONUS_SHARE,
    RIBCAGE_BUILD_BONUS_RIB_WEIGHT,
    STERNUM_BONUS_CHANCE,
    STERNUM_GIANT_SYMBOL,
    FREE_SPIN_RIB_SYMBOLS,
    WEIGHTED_FREE_SPIN_RIB_SYMBOLS,
    BONUS_MODE_STERNUM_SYMBOLS,
    BONUS_MODE_STERNUM_BLADE_SYMBOLS,
    BONUS_MODE_BLADE_CHANCE_BY_CHANCES,
    BONUS_MODE_BLADE_DELAYED_START,
    VISIBLE_TILE_RADIUS,
    GIANT_ENTRY_THRESHOLD,
    SYMBOL_STEP_PERCENT,
    GIANT_BLOCK_AMBIENT_CHANCE
  },
  hooks: {
    getSpinType: () => outcomeSpinTypeForCurrentReelPrep()
  }
});

function isInlineRib1BonusContinuationActive() {
  return Boolean(state.inlineRib1BonusContinuationActive);
}

function outcomeSpinTypeForCurrentReelPrep() {
  return isInlineRib1BonusContinuationActive() ? "BONUS" : (state.currentSpinType || "BASE");
}

function randomFrom(symbols) {
  return outcomeEngine.randomFrom(symbols);
}

function randomSpinSymbol() {
  return outcomeEngine.randomSpinSymbol();
}

function deterministicSymbol(reel, streamIndex) {
  return outcomeEngine.deterministicSymbol(reel, streamIndex);
}

const SYMBOL_LABELS = {
  CROWNED_SKULL: "SMALL BLADE",
  DARK_HEART: "PETRIFIED HEART",
  ANCIENT_GOLD_COIN: "GOLD COIN",
  VERTEBRA: "BIRD",
  FEMUR: "BROKEN BONE",
  WILD: "WILD",
  SILVER_COIN: "SILVER COIN",
  ANCESTRAL_SKULL: "ANCESTRAL SKULL",
  RIB_BONUS: "BONUS RIB",
  STERNUM_BONUS: "SUPER BONUS",
  POSITIVE_BONUS: "POSITIVE BONUS",
  NEGATIVE_BONUS: "NEGATIVE BONUS",
  MULT_X5: "MULTIPLIER X5",
  MULT_X10: "MULTIPLIER X10",
  MULT_X25: "MULTIPLIER X25",
  MULT_X50: "MULTIPLIER X50",
  MULT_X100: "MULTIPLIER X100",
  BLADE_BONUS: "BLADE",
  STERNUM_CROSS_BONUS: "CROSS",
  GUADANA_BONUS: "GUADAÑA",
  BONUS_EMPTY: "EMPTY"
};

const SYMBOL_PLACEHOLDER_LABELS = {
  CROWNED_SKULL: "BLADE",
  DARK_HEART: "HEART",
  ANCIENT_GOLD_COIN: "GOLD",
  VERTEBRA: "BIRD",
  FEMUR: "BONE",
  SILVER_COIN: "SILVER",
  ANCESTRAL_SKULL: "SKULL",
  // Placeholder temporal (sin arte final todavia, ver assets/symbols/symbol-assets.js).
  POSITIVE_BONUS: "POSITIVE",
  NEGATIVE_BONUS: "NEGATIVE",
  MULT_X5: "×5",
  MULT_X10: "×10",
  MULT_X25: "×25",
  MULT_X50: "×50",
  MULT_X100: "×100",
  BLADE_BONUS: "BLADE",
  STERNUM_CROSS_BONUS: "CROSS",
  GUADANA_BONUS: "GUADAÑA"
};

function getEffectiveSymbol(symbol) {
  // El cuervo dorado paga como cuervo.
  return symbol === GOLDEN_CROW_SYMBOL ? SMALL_BLADE_BIRD_SYMBOL : symbol;
}

function reelByCell(cell) {
  if (!cell || typeof cell.reelIndex !== "number") return null;
  return state.reels[cell.reelIndex] || null;
}

function isRib1ForcedEmpty(reel, symbol) {
  return Boolean(
    reel &&
    reel.id === "rib1" &&
    reel.rib1BonusVacant &&
    symbol !== "RIB_BONUS"
  );
}

function isBonusBoardForcedEmptyForReel(reel) {
  return Boolean(
    state.bonusModeBoardBlank &&
    reel &&
    reel.id !== "rib1"
  );
}

function formatSymbolLabel(symbol) {
  return SYMBOL_LABELS[symbol] || symbol;
}

const symbolRenderer = window.OssuarySymbolRenderer.create({
  symbolAssets: SYMBOL_ASSETS,
  reelSymbolAssets: REEL_SYMBOL_ASSETS,
  reelSymbolBackgrounds: REEL_SYMBOL_BACKGROUNDS,
  reelSymbolOverlays: REEL_SYMBOL_OVERLAYS,
  reelSymbolHeadOverlays: REEL_SYMBOL_HEAD_OVERLAYS,
  reelSymbolVideoOverlays: REEL_SYMBOL_VIDEO_OVERLAYS,
  placeholderLabels: SYMBOL_PLACEHOLDER_LABELS,
  hooks: {
    getEffectiveSymbol,
    formatSymbolLabel,
    isCellForcedEmpty(cell, symbol) {
      const reel = reelByCell(cell);
      return isBonusBoardForcedEmptyForReel(reel) || isRib1ForcedEmpty(reel, symbol);
    },
    isTileForcedEmpty(tile, symbol, reel) {
      return isBonusBoardForcedEmptyForReel(reel) || isRib1ForcedEmpty(reel, symbol);
    }
  }
});

function getSymbolAsset(symbol, reel = null) {
  return symbolRenderer.getSymbolAsset(symbol, reel);
}

function setCellSymbol(cell, symbol) {
  symbolRenderer.setCellSymbol(cell, symbol);
}

function placeholderClassName(symbol) {
  return symbolRenderer.placeholderClassName(symbol);
}

function renderPlaceholderSymbol(el, symbol) {
  symbolRenderer.renderPlaceholderSymbol(el, symbol);
}

function renderSymbolContent(el, symbol, reel = null) {
  symbolRenderer.renderSymbolContent(el, symbol, reel);
}

function ensureSymbolVideoOverlay(el, symbol, reel = null) {
  if (symbolRenderer.ensureSymbolVideoOverlay) {
    symbolRenderer.ensureSymbolVideoOverlay(el, symbol, reel);
  }
}

function setTileSymbol(tile, symbol, reel) {
  symbolRenderer.setTileSymbol(tile, symbol, reel);
}

const reelRenderer = window.OssuaryReelRenderer.create({
  reelLayer,
  imageReference: IMAGE_REFERENCE,
  config: {
    VISIBLE_TILE_RADIUS,
    SYMBOL_STEP_PERCENT
  },
  hooks: {
    setCellSymbol,
    setTileSymbol,
    streamIndexAtCell,
    getSymbolAt
  }
});

// ---------------------------------------------------------------------------
// Mecanica "cuchilla pequena" (small blade cut) — orquestacion (SOLO VISUAL).
// Detecta el/los simbolo(s) gatillo ya aterrizados y le pasa al modulo FX
// (src/fx/small-blade-cut.js) los tiles DOM a animar. NO toca estado de reels,
// strips, outcome, locks ni pagos, y es independiente de la gran cuchilla del
// bonus. Configurable: SMALL_BLADE_CUT_TRIGGER_SYMBOLS admite varios gatillos y
// la region afectada se resuelve por lado + eje Y (sin hardcodear posiciones).
// ---------------------------------------------------------------------------
const SMALL_BLADE_CUT_TRIGGER_SYMBOLS = ["CROWNED_SKULL"];

// Como MAXIMO ejecutan el corte 2 cuchillas por spin (y, por el tope de
// tablero de abajo, como maximo 2 APARECEN). Este valor rige ambas cosas.
const SMALL_BLADE_MAX_CUTS_PER_SPIN = 2;

// Casillas donde la cuchilla pequena NUNCA aterriza (peticiones del usuario):
// - columna IZQUIERDA del todo de rib2-rib5 (x=543), 2026-10-04;
// - casilla 2 de rib1 (columna central, encima del esternon), 2026-10-05.
// El esternon no se lista: getSymbolAt ya le impide mostrar cuchillas.
// Se limpia del outcome sorteado y los forzados no la eligen.
// Altera el outcome visible; la cuchilla solo paga a traves de sus cortes.
const SMALL_BLADE_FORBIDDEN_CELL_IDS = ["rib2-1", "rib3-2", "rib4-1", "rib5-1", "rib1-2"];

function smallBladeCellIsForbidden(reel, index) {
  const cell = reel && Array.isArray(reel.cells) ? reel.cells[index] : null;
  return Boolean(cell) && SMALL_BLADE_FORBIDDEN_CELL_IDS.indexOf(cell.id) !== -1;
}

// Simbolos de bonus que los forzados de cuchilla/cuervo nunca pisan.
const SMALL_BLADE_BONUS_GUARD_SYMBOLS = ["WILD", "BONUS_RIB", "RIB_BONUS", "STERNUM_BONUS"];

// Casillas que CORTARIA una cuchilla en (bladeReel, bladeIndex), sobre el
// outcome ya sorteado y con el mismo criterio geometrico que el corte real
// (collectSmallBladeCutGroups): debajo (cell.y mayor) y en su columna
// (smallBladeColumnsOverlap), en rodillos rib cortables con outcome propio. Las
// dos mitades de una costilla estan a la MISMA altura, asi que lo que queda
// debajo siempre esta en otra costilla: NUNCA vale el indice k+1 del mismo
// rodillo (estaria al lado, no debajo). Ordenadas de arriba a abajo.
function smallBladeOutcomeCellsBelow(bladeReel, bladeIndex) {
  const bladeCell = bladeReel && Array.isArray(bladeReel.cells) ? bladeReel.cells[bladeIndex] : null;
  if (!bladeCell) return [];
  const out = [];
  (state.reels || []).forEach((reel) => {
    if (reel.pendingGiantSymbol || reel.type === "sternum") return;
    if (!smallBladeReelIsCuttable(reel)) return;
    if (!Array.isArray(reel.pendingFinalSymbols)) return;
    reel.cells.forEach((cell, index) => {
      if (!(cell.y > bladeCell.y)) return;
      if (!smallBladeColumnsOverlap(bladeCell, cell)) return;
      out.push({ reel, index, cell });
    });
  });
  out.sort((a, b) => a.cell.y - b.cell.y);
  return out;
}

// Donde poner el cuervo (VERTEBRA) para que esa cuchilla lo corte: la casilla
// mas cercana por debajo que no sea comodin/gatillo de bonus ni otra cuchilla
// ni una casilla ya usada (usedKeys: "reelId:index"). null si no hay.
function smallBladeCrowSpotBelow(bladeReel, bladeIndex, usedKeys) {
  return smallBladeOutcomeCellsBelow(bladeReel, bladeIndex).find((entry) => {
    const symbol = entry.reel.pendingFinalSymbols[entry.index];
    if (SMALL_BLADE_BONUS_GUARD_SYMBOLS.indexOf(symbol) !== -1) return false;
    if (SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(symbol) !== -1) return false;
    return !(usedKeys && usedKeys.has(entry.reel.id + ":" + entry.index));
  }) || null;
}

// Sustituye por un simbolo normal del strip cualquier cuchilla sorteada en la
// columna prohibida. Se llama en prepareReelStops ANTES de los suelos y del
// tope, para que estos cuenten ya con el tablero limpio. Solo BASE game.
function removeSmallBladesFromForbiddenCells() {
  if (state.bonusModeActive || state.currentSpinType !== "BASE") return;
  state.reels.forEach((reel) => {
    if (reel.pendingGiantSymbol || reel.type === "sternum") return;
    const syms = reel.pendingFinalSymbols;
    if (!Array.isArray(syms)) return;
    syms.forEach((symbol, index) => {
      if (SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(symbol) === -1) return;
      if (!smallBladeCellIsForbidden(reel, index)) return;
      syms[index] = smallBladeReplacementSymbol(reel);
    });
  });
}

// Tope DURO de cuchillas pequenas por spin a nivel de TABLERO: como maximo
// SMALL_BLADE_MAX_CUTS_PER_SPIN (2) simbolos CROWNED_SKULL pueden APARECER en
// el tablero sumando TODOS los rodillos (0, 1 o 2). Reducir su frecuencia en
// los strips no garantiza la regla (siempre queda la posibilidad de que caigan
// mas de 2 a la vez), asi que se impone sobre el OUTCOME ya sorteado, una vez
// por spin, en prepareReelStops (antes de que ningun rodillo pare): si aterrizan
// mas de 2, se eligen 2 al azar (Math.random, NO el RNG del motor: no perturba
// su secuencia deterministica) y el resto se sustituye por otro simbolo del
// propio strip de ese rodillo. IMPORTANTE: al alterar el outcome visible, esto
// puede cambiar el pago de esa tirada por los cortes que quedan disponibles.
// Solo BASE game: en bonus / free spins / respin no se toca nada.
function capSmallBladeSymbolsForSpin() {
  if (state.bonusModeActive || state.currentSpinType !== "BASE") return;
  const positions = [];
  state.reels.forEach((reel) => {
    // Rodillos gigantes/lock (RIB_BONUS, esqueleto...) no muestran cuchillas.
    if (reel.pendingGiantSymbol) return;
    // El ESTERNON pinta sus tiles desacoplado del outcome (ver getSymbolAt) y
    // ya tiene garantizado por render que NUNCA muestra una cuchilla, asi que
    // sus cuchillas de outcome no cuentan aqui: el presupuesto de 2 se reserva
    // integro para los rodillos rib, que son los unicos que las muestran.
    if (reel.type === "sternum") return;
    const syms = reel.pendingFinalSymbols;
    if (!Array.isArray(syms)) return;
    syms.forEach((symbol, index) => {
      if (SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(symbol) !== -1) {
        positions.push({ reel, index });
      }
    });
  });
  if (positions.length <= SMALL_BLADE_MAX_CUTS_PER_SPIN) return;
  // Baraja Fisher-Yates con Math.random (no el RNG del motor) y conserva 2;
  // el resto de cuchillas se sustituye por un simbolo normal del strip.
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  // La cuchilla forzada por el suelo de corte de cuervo NUNCA se retira: se
  // mueve al frente para que caiga siempre dentro de las 2 que se conservan.
  if (smallBladeForcedBirdBladePos) {
    const fi = positions.findIndex((p) =>
      p.reel === smallBladeForcedBirdBladePos.reel &&
      p.index === smallBladeForcedBirdBladePos.index);
    if (fi > 0) [positions[0], positions[fi]] = [positions[fi], positions[0]];
  }
  positions.slice(SMALL_BLADE_MAX_CUTS_PER_SPIN).forEach(({ reel, index }) => {
    reel.pendingFinalSymbols[index] = smallBladeReplacementSymbol(reel);
  });
}

// Simbolo con el que se sustituye una cuchilla sobrante: uno NORMAL del propio
// strip de ese rodillo (para que sea un simbolo que ESE rodillo puede mostrar
// de verdad), distinto de la cuchilla y de comodines/gatillos de bonus. Se
// elige con Math.random para no consumir sorteos del RNG del motor.
function smallBladeReplacementSymbol(reel, extraExcluded) {
  const strip = (typeof outcomeEngine.stripSymbolsForReel === "function"
    ? outcomeEngine.stripSymbolsForReel(reel)
    : null) || [];
  const excluded = SMALL_BLADE_CUT_TRIGGER_SYMBOLS.concat(["WILD", "BONUS_RIB", "RIB_BONUS", "STERNUM_BONUS"], extraExcluded || []);
  const candidates = strip.filter((s) => s && excluded.indexOf(s) === -1);
  if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
  return "FEMUR";
}

// "Suelo" de aparicion de cuchillas: para que el juego no pase demasiadas
// rondas sin ningun corte (sensacion de que "no cae nada"), se garantiza al
// menos una cuchilla cada 3-4 spins BASE. Se lleva un contador de spins BASE
// consecutivos SIN cuchilla en el outcome; al alcanzar un umbral elegido al
// azar entre estos dos valores se FUERZA una cuchilla en el outcome ya sorteado
// (se sustituye un simbolo normal de un rodillo rib por CROWNED_SKULL).
// ⚠️ Igual que el tope, esto altera el outcome visible y por tanto afecta
// LIGERAMENTE al RTP (aparecen cuchillas que el sorteo puro no habria dado).
// Solo BASE game; en bonus/free spins/respin no se toca nada.
const SMALL_BLADE_FLOOR_MIN_ROUNDS = 3;
const SMALL_BLADE_FLOOR_MAX_ROUNDS = 4;
let smallBladeSpinsWithoutCut = 0;
let smallBladeFloorThreshold = SMALL_BLADE_FLOOR_MIN_ROUNDS +
  Math.floor(Math.random() * (SMALL_BLADE_FLOOR_MAX_ROUNDS - SMALL_BLADE_FLOOR_MIN_ROUNDS + 1));

function resetSmallBladeFloorCounter() {
  smallBladeSpinsWithoutCut = 0;
  smallBladeFloorThreshold = SMALL_BLADE_FLOOR_MIN_ROUNDS +
    Math.floor(Math.random() * (SMALL_BLADE_FLOOR_MAX_ROUNDS - SMALL_BLADE_FLOOR_MIN_ROUNDS + 1));
}

// Cuenta cuantas cuchillas hay en el outcome ya sorteado (mismos rodillos que
// cuenta el tope: rib visibles, ni gigantes/lock ni esternon).
function countOutcomeSmallBlades() {
  let n = 0;
  state.reels.forEach((reel) => {
    if (reel.pendingGiantSymbol || reel.type === "sternum") return;
    const syms = reel.pendingFinalSymbols;
    if (!Array.isArray(syms)) return;
    syms.forEach((symbol) => {
      if (SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(symbol) !== -1) n++;
    });
  });
  return n;
}

// Aplica el suelo: si el outcome ya trae cuchilla, resetea el contador; si no,
// suma una ronda y, alcanzado el umbral, fuerza una cuchilla en una casilla
// elegible de un rodillo rib (prefiere las que NO son fila inferior para que
// tenga algo debajo que cortar). Se llama en prepareReelStops ANTES del tope.
function ensureSmallBladeFloorForSpin() {
  if (state.bonusModeActive || state.currentSpinType !== "BASE") return;
  if (countOutcomeSmallBlades() > 0) {
    resetSmallBladeFloorCounter();
    return;
  }
  smallBladeSpinsWithoutCut += 1;
  if (smallBladeSpinsWithoutCut < smallBladeFloorThreshold) return;

  const candidates = [];
  const excluded = SMALL_BLADE_CUT_TRIGGER_SYMBOLS.concat(["WILD", "BONUS_RIB", "RIB_BONUS", "STERNUM_BONUS"]);
  state.reels.forEach((reel) => {
    if (reel.pendingGiantSymbol || reel.type === "sternum") return;
    if (!smallBladeReelIsCuttable(reel)) return;
    const syms = reel.pendingFinalSymbols;
    if (!Array.isArray(syms)) return;
    syms.forEach((symbol, index) => {
      if (excluded.indexOf(symbol) !== -1) return;
      if (smallBladeCellIsForbidden(reel, index)) return;
      // "No fila inferior" = tiene algo debajo en su columna que cortar
      // (geometria real; antes se usaba index < ultimo, que en estos rodillos
      // horizontales daba por buena p.ej. rib5-3, en la ultima fila).
      candidates.push({ reel, index, notBottom: smallBladeOutcomeCellsBelow(reel, index).length > 0 });
    });
  });
  if (!candidates.length) return; // nada elegible este spin: se reintenta al siguiente

  const preferred = candidates.filter((c) => c.notBottom);
  const pool = preferred.length ? preferred : candidates;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  pick.reel.pendingFinalSymbols[pick.index] = SMALL_BLADE_CUT_TRIGGER_SYMBOLS[0];
  resetSmallBladeFloorCounter();
}

// Intervalo de corte de cuervo solicitado: 10..20 giros base normales.
// El mismo contador controla las parejas naturales y las forzadas; se
// reinicia al cortar de verdad. Si no hay casillas elegibles, reintenta.
// Compras, Raven, bonus y debug no consumen ni reinician el intervalo.
// Cambia solo esta frecuencia; como los otros forzados, altera el outcome.
const SMALL_BLADE_BIRD_FLOOR_MIN_ROUNDS = 10;
const SMALL_BLADE_BIRD_FLOOR_MAX_ROUNDS = 20;
let smallBladeSpinsWithoutBirdCut = 0;
let smallBladeBirdFloorThreshold = SMALL_BLADE_BIRD_FLOOR_MIN_ROUNDS +
  Math.floor(Math.random() * (SMALL_BLADE_BIRD_FLOOR_MAX_ROUNDS - SMALL_BLADE_BIRD_FLOOR_MIN_ROUNDS + 1));
const PURCHASED_BLADE_SPIN_EXCLUDED_BLADE_REELS = ["rib1", "rib2-left"];

// --- RAVEN BONUS (compra "blade-spin", x25) ---------------------------------
// Reglas pedidas por el usuario el 2026-10-09 (antes era una sola tirada):
//  - CADENA: cada cuervo que mata la piedra da otra tirada gratis y
//    automatica (cartel "+1 SPIN"; "+2 SPINS" si mueren dos a la vez). La
//    cadena se acaba cuando no quedan tiradas pendientes.
//  - Durante la cadena los cuervos vivos siguen posados y los que caen se
//    apilan; se van al arrancar la primera tirada normal despues.
//  - Cada tirada gratis trae una cuchilla sobre un cuervo (dos en
//    RAVEN_CHAIN_DOUBLE_BLADE_CHANCE) y su esqueleto con piedra; la piedra
//    acierta a un cuervo con RAVEN_CHAIN_STONE_HIT_CHANCES, que baja con cada
//    tirada. Pedido por el usuario (2026-10-09): antes la tirada gratis era
//    normal y la cadena casi nunca pasaba de 1. Con estos numeros (modelo de
//    la cadena): 0 tiradas extra ~11%, 1 ~23%, 2 ~21%, 3 ~17%, 4 ~13%, 5 ~8%,
//    6 o mas ~8%; media ~2.6.
// Como toda la capa de cuervos y piedras, se sortea con Math.random, no con el
// RNG del motor. Numeros provisionales hasta que se haga el RTP.
const RAVEN_CHAIN_SPIN_DELAY_MS = 1300;
// Cuanto se deja ver el numero del BIG WIN antes del cartel de la cadena.
const RAVEN_CHAIN_BIG_WIN_HOLD_MS = 1100;
// Probabilidad de que la piedra mate a un cuervo en la 2a, 3a, 4a... tirada
// de la cadena (la ultima se repite). La tirada de compra no la usa (la piedra
// elige al azar entre el centro y los cuervos posados, como en el juego base).
const RAVEN_CHAIN_STONE_HIT_CHANCES = [0.62, 0.55, 0.48, 0.4, 0.32, 0.25];
const RAVEN_CHAIN_DOUBLE_BLADE_CHANCE = 0.15;
// Tope de seguridad de tiradas de una cadena (compra incluida).
const RAVEN_CHAIN_MAX_SPINS = 25;
// Total ganado en la cadena (WIN del HUD); null fuera del Raven Bonus. Se
// queda a la vista al acabar, hasta la siguiente tirada normal.
let ravenChainWin = null;
// Debug (OssuaryRavenDebug): que la piedra siempre acierte a un cuervo si hay
// alguno posado.
let ravenDebugStoneAlwaysHits = false;

function startRavenChain() {
  // kills: cuervos muertos en la tirada en curso; pending: tiradas ganadas
  // que faltan; resolvedSpin: ultima tirada ya contada (scheduleAutoSpin
  // puede llamar varias veces al final de una misma tirada).
  state.ravenChain = { spin: 1, kills: 0, pending: 0, resolvedSpin: 0 };
  ravenChainWin = 0;
}

function endRavenChain() {
  state.ravenChain = null;
}

// Resumen al acabar un bonus (src/ui/bonus-summary.js, peticion del usuario
// 2026-10-14). Mientras esta en pantalla no se gira, ni a mano ni en autoplay
// (startSpin y scheduleAutoSpin esperan); al cerrarlo sigue el juego. Solo
// presentacion: no cambia premios ni el flujo del bonus.
let bonusSummaryOpen = false;

function showBonusSummary(kind, total, spins) {
  if (!window.OssuaryBonusSummary) return false;
  bonusSummaryOpen = true;
  state.bonusReturnRestored = false;
  // El contador BIG WIN de la ultima tirada (ya contado) deja paso al resumen.
  bigWinCounter.hide();
  window.OssuaryBonusSummary.show({
    kind: kind,
    total: total,
    bet: currentBet(),
    spins: spins,
    auto: Boolean(state.auto),
    onRestore: () => restoreBaseReelsAfterBonus(kind)
  }).then(function () {
    bonusSummaryOpen = false;
    state.busy = false;
    render();
    scheduleAutoSpin();
  });
  return true;
}

// Tirada de la cadena posterior a la de compra (la piedra usa su probabilidad
// y se fuerza la cuchilla con su cuervo).
function isRavenChainFreeSpin() {
  return Boolean(state.ravenChain && state.ravenChain.spin > 1);
}

function ravenChainStoneHitChance() {
  const index = Math.max(0, Math.min(state.ravenChain.spin - 2, RAVEN_CHAIN_STONE_HIT_CHANCES.length - 1));
  return RAVEN_CHAIN_STONE_HIT_CHANCES[index];
}

// Fin de cada tirada de la cadena (desde scheduleAutoSpin, con todo resuelto):
// cada cuervo muerto suma una tirada pendiente; si queda alguna, sale la
// siguiente (se descuenta al arrancar, en startSpin, para que el contador de
// SPIN la siga mostrando mientras sale el cartel) y si no, se acaba. Devuelve
// true si hay otra tirada en camino.
function continueRavenChain() {
  const chain = state.ravenChain;
  if (chain.resolvedSpin !== chain.spin) {
    chain.resolvedSpin = chain.spin;
    chain.posterUntil = 0;
    const earned = chain.kills;
    chain.kills = 0;
    chain.pending += earned;
    if (chain.pending <= 0 || chain.spin >= RAVEN_CHAIN_MAX_SPINS) {
      finishRavenChain(chain);
      return false;
    }
    if (earned > 0) {
      // Cartel RAVEN Spins (peticiones del usuario, 2026-10-19): solo al
      // empezar la cadena (el primer cuervo muerto); despues, solo las
      // tiradas ganadas. La tirada sale cuando se ha ido (show devuelve
      // cuanto tarda; tambien si se vuelve a pasar por aqui en la misma
      // tirada).
      // Con el BIG WIN en pantalla (va por encima de todo y se queda hasta la
      // siguiente tirada), su numero se ve un momento y se quita al salir.
      const banner = window.OssuaryRavenBanner;
      const poster = !chain.posterShown;
      chain.posterShown = true;
      const overCounter = bigWinCounterOnScreen;
      const posterMs = banner ? banner.show("+" + earned + (earned > 1 ? " SPINS" : " SPIN"), {
        poster,
        sourceRect: chain.lastKillOrigin || null,
        delayMs: overCounter ? speedMs(RAVEN_CHAIN_BIG_WIN_HOLD_MS) : 0,
        onStart: overCounter ? () => bigWinCounter.hide() : null
      }) : 0;
      if (posterMs > 0) chain.posterUntil = Date.now() + posterMs;
      if (window.OssuaryAudio) window.OssuaryAudio.trigger("raven_free_spin", { spin: chain.spin + 1, earned });
    }
  }
  const delayMs = Math.max(speedMs(RAVEN_CHAIN_SPIN_DELAY_MS), (chain.posterUntil || 0) - Date.now());
  state.autoTimer = window.setTimeout(function () {
    startSpin({ source: "raven-chain", spinType: "BASE", freeSpin: true });
  }, delayMs);
  render();
  return true;
}

// Se acaban las mini freespins (Raven Bonus, comprado o por un cuervo muerto
// en una tirada normal). Peticion del usuario (2026-10-18): los cuervos que
// siguen posados (los que no ha matado la piedra) se van volando y el
// posadero queda limpio; antes se quedaban acumulados para las tiradas
// siguientes. El resumen (si la cadena gano algo) sale cuando se han ido;
// mientras, no se gira (bonusSummaryOpen).
function finishRavenChain(chain) {
  state.bonusReturnRestored = false;
  if (window.OssuaryRavenBanner && typeof window.OssuaryRavenBanner.hide === "function") {
    window.OssuaryRavenBanner.hide();
  }
  endRavenChain();
  state.purchasedBladeSpinCrowSlots = [];
  let leaving = 0;
  const won = ravenChainWin > 0;
  const summary = function () {
    if (!won) return;
    bonusSummaryOpen = false;
    if (!showBonusSummary("raven", ravenChainWin, chain.spin)) {
      render();
      scheduleAutoSpin();
    }
  };
  if (smallBladeBirdPerch && typeof smallBladeBirdPerch.flyAway === "function") {
    leaving = smallBladeBirdPerch.flyAway();
  }
  if (leaving && window.OssuaryAudio) window.OssuaryAudio.trigger("raven_crows_fly_away", { count: leaving });
  bonusSummaryOpen = won;
  render();
  if (!won) return;
  if (!leaving) {
    summary();
    return;
  }
  const fly = (smallBladeBirdPerch && smallBladeBirdPerch.settings) || {};
  bonusSummaryOpen = true;
  window.setTimeout(summary, (fly.flyAwayMs || 1150) + (leaving - 1) * (fly.flyAwayStaggerMs || 150) + 150);
}

// --- CUERVOS DORADOS --------------------------------------------------------
// A peticion del usuario (2026-10-09): el cuervo dorado es un simbolo mas de
// la secuencia de los rodillos (GOLDEN_CROW, arte horneado en
// assets/symbols/depth/bird-golden.png): pasa dorado mientras giran y
// aterriza dorado; nunca se vuelve dorado de golpe. Para pagar cuenta como
// cuervo (getEffectiveSymbol). Al aterrizar solo sale donde una cuchilla
// puede cortarlo (ni rib1, ni el esternon, ni la columna izquierda) y nunca
// en el Execution Bonus. Cada cuervo cortable tiene GOLDEN_CROW_CHANCE: en
// ~1 de cada 3 tiradas hay alguno y a veces dos o tres. Si una cuchilla lo
// corta, se posa dorado y suma x10, x25 o x50 a su posadero (un negro suma 1:
// dorado x10 + negro = x11) y, si la piedra lo mata, su columna de comodines
// paga eso. Es un 25% mas grande que los demas simbolos y con el rodillo
// parado reluce y se mueve un poco (src/fx/raven-bonus.css). Math.random,
// como el resto de la capa de cuervos. Numeros provisionales hasta el RTP.
const GOLDEN_CROW_SYMBOL = "GOLDEN_CROW";
const GOLDEN_CROW_CHANCE = 0.12;          // por cuervo que aterriza en casilla cortable
const GOLDEN_CROW_PASSING_CHANCE = 0.12;  // por cuervo que pasa mientras gira
// [multiplicador, probabilidad] al posarse.
const GOLDEN_CROW_MULTIPLIERS = [[10, 0.7], [25, 0.22], [50, 0.08]];
// Decision por posicion de la cinta (reelId -> Map streamIndex -> bool): se
// toma la primera vez que se pinta ese cuervo y ya no cambia mientras se ve.
const goldenCrowStreamDecisions = new Map();
const goldenCrowCuttableCache = new Map();
// Debug: casillas "reelId:index" que salen doradas en la tirada en curso.
let goldenCrowForcedCells = new Set();
let goldenCrowDebugForceNext = false;

function isCrowSymbol(symbol) {
  return symbol === SMALL_BLADE_BIRD_SYMBOL || symbol === GOLDEN_CROW_SYMBOL;
}

// Casilla donde una cuchilla podria cortar un cuervo: alguna casilla de
// cuchilla permitida por encima, en su columna (misma geometria que el corte).
function goldenCrowCellIsCuttable(reel, index) {
  const key = reel.id + ":" + index;
  if (goldenCrowCuttableCache.has(key)) return goldenCrowCuttableCache.get(key);
  const cell = reel.cells[index];
  if (!cell || typeof cell.y !== "number" || typeof cell.x !== "number") return false;
  let cuttable = false;
  if (reel.id !== "rib1" && reel.type !== "sternum") {
    state.reels.forEach((other) => {
      if (cuttable || other.type === "sternum") return;
      other.cells.forEach((above, aboveIndex) => {
        if (cuttable || !(above.y < cell.y)) return;
        if (smallBladeCellIsForbidden(other, aboveIndex)) return;
        if (smallBladeColumnsOverlap(above, cell)) cuttable = true;
      });
    });
  }
  goldenCrowCuttableCache.set(key, cuttable);
  return cuttable;
}

// Casilla (indice) en la que aterriza la posicion streamIndex de la cinta, o
// -1 si no es una posicion de aterrizaje de esta tirada.
function goldenCrowLandingCellAt(reel, streamIndex) {
  if (!reel.finalSymbolMap || !reel.finalSymbolMap.has(streamIndex) || typeof reel.targetPosition !== "number") return -1;
  for (let i = 0; i < reel.cells.length; i++) {
    if (Math.round(reel.targetPosition + reel.cells[i].reelCellIndex * reel.cellStep) === streamIndex) return i;
  }
  return -1;
}

// ¿Es dorado el cuervo de esta posicion de la cinta? (getSymbolAt)
function goldenCrowAt(reel, streamIndex) {
  let decisions = goldenCrowStreamDecisions.get(reel.id);
  if (!decisions) {
    decisions = new Map();
    goldenCrowStreamDecisions.set(reel.id, decisions);
  }
  if (decisions.has(streamIndex)) return decisions.get(streamIndex);
  let golden = false;
  if (!state.bonusModeActive && reel.id !== "rib1" && reel.type !== "sternum") {
    const landingIndex = goldenCrowLandingCellAt(reel, streamIndex);
    if (landingIndex >= 0) {
      golden = goldenCrowForcedCells.has(reel.id + ":" + landingIndex) ||
        (goldenCrowCellIsCuttable(reel, landingIndex) && Math.random() < GOLDEN_CROW_CHANCE);
    } else {
      golden = Math.random() < GOLDEN_CROW_PASSING_CHANCE;
    }
  }
  decisions.set(streamIndex, golden);
  // Solo importan las posiciones que se ven: fuera las mas antiguas.
  if (decisions.size > 400) {
    const keys = decisions.keys();
    for (let i = 0; i < 200; i++) decisions.delete(keys.next().value);
  }
  return golden;
}

// Debug (forceGoldenNext): con el tablero ya decidido (prepareReelStops), un
// cuervo cortable de esta tirada sale dorado; si una cuchilla va a cortar
// alguno, ese.
function chooseGoldenCrowsForSpin() {
  goldenCrowForcedCells = new Set();
  if (!goldenCrowDebugForceNext) return;
  goldenCrowDebugForceNext = false;
  if (state.bonusModeActive || state.currentSpinType !== "BASE") return;
  const crows = [];
  state.reels.forEach((reel) => {
    if (reel.pendingGiantSymbol || !Array.isArray(reel.pendingFinalSymbols)) return;
    reel.pendingFinalSymbols.forEach((symbol, index) => {
      if (symbol === SMALL_BLADE_BIRD_SYMBOL && goldenCrowCellIsCuttable(reel, index)) crows.push({ reel, index });
    });
  });
  if (!crows.length) return;
  const cutKeys = new Set();
  state.reels.forEach((reel) => {
    if (reel.pendingGiantSymbol || !Array.isArray(reel.pendingFinalSymbols)) return;
    reel.pendingFinalSymbols.forEach((symbol, index) => {
      if (SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(symbol) === -1) return;
      smallBladeOutcomeCellsBelow(reel, index).forEach((below) => cutKeys.add(below.reel.id + ":" + below.index));
    });
  });
  const cutCrows = crows.filter((crow) => cutKeys.has(crow.reel.id + ":" + crow.index));
  const pool = cutCrows.length ? cutCrows : crows;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  goldenCrowForcedCells.add(pick.reel.id + ":" + pick.index);
}

// Con el rodillo parado, sus cuervos dorados visibles brillan y se mueven un
// poco (clase is-golden-idle, src/fx/raven-bonus.css) y suena la subida de
// nivel del bonus. Al arrancar el giro se apaga. Un frame despues de parar,
// para leer las fichas ya pintadas con su simbolo final.
function syncGoldenCrowIdle(reel, stopped) {
  const tiles = reel.continuousTileEls || [];
  if (!stopped) {
    tiles.forEach((tile) => tile.classList.remove("is-golden-idle"));
    return;
  }
  window.requestAnimationFrame(() => {
    if (reel.phase !== "stopped") return;
    let landed = 0;
    reel.cells.forEach((cell) => {
      const found = smallBladeDisplayedTileForCell(reel, cell);
      if (!found || found.tileEl.dataset.symbol !== GOLDEN_CROW_SYMBOL) return;
      if (!found.tileEl.classList.contains("is-golden-idle")) landed += 1;
      found.tileEl.classList.add("is-golden-idle");
    });
    if (landed && window.OssuaryAudio) window.OssuaryAudio.trigger("golden_crow_landed", { count: landed, reel: reel.id });
  });
}

function isGoldenCrowEntry(entry) {
  return Boolean(entry && entry.symbol === GOLDEN_CROW_SYMBOL);
}

function goldenCrowPerchOptions() {
  let roll = Math.random();
  let factor = GOLDEN_CROW_MULTIPLIERS[0][0];
  for (const [multiplier, weight] of GOLDEN_CROW_MULTIPLIERS) {
    if (roll < weight) { factor = multiplier; break; }
    roll -= weight;
  }
  return { golden: true, factor };
}

function goldenCrowsOnBoard() {
  let count = 0;
  (state.reels || []).forEach((reel) => {
    (reel.cells || []).forEach((cell) => {
      const found = smallBladeDisplayedTileForCell(reel, cell);
      if (found && found.tileEl.dataset.symbol === GOLDEN_CROW_SYMBOL &&
          !found.tileEl.classList.contains("small-blade-cut-hidden")) count += 1;
    });
  });
  return count;
}

window.OssuaryRavenDebug = {
  forceGoldenNext: function (on) { goldenCrowDebugForceNext = on !== false; return goldenCrowDebugForceNext; },
  stoneAlwaysHits: function (on) { ravenDebugStoneAlwaysHits = on !== false; return ravenDebugStoneAlwaysHits; },
  buy: function (golden) {
    if (golden) goldenCrowDebugForceNext = true;
    return buyBonusOption("blade-spin");
  },
  state: function () {
    return {
      chain: state.ravenChain ? Object.assign({}, state.ravenChain) : null,
      win: ravenChainWin,
      goldenOnBoard: goldenCrowsOnBoard(),
      perches: SMALL_BLADE_BIRD_PERCH_SLOTS.map((slot) => ({
        key: slot.key,
        occupied: Boolean(smallBladeBirdPerch && smallBladeBirdPerch.isOccupied(slot.key)),
        multiplier: smallBladeBirdPerch ? smallBladeBirdPerch.multiplierAt(slot.key) : 0,
        golden: Boolean(smallBladeBirdPerch && smallBladeBirdPerch.isGoldenAt && smallBladeBirdPerch.isGoldenAt(slot.key))
      }))
    };
  }
};

// Posicion {reel, index} de la cuchilla forzada por este suelo en el spin
// actual, para que el tope de tablero (capSmallBladeSymbolsForSpin) NUNCA la
// retire y la garantia se cumpla. null si este spin no forzo nada.
let smallBladeForcedBirdBladePos = null;

function resetSmallBladeBirdFloorCounter() {
  if (state.bonusModeActive || state.currentSpinType !== "BASE" ||
      state.pendingPurchasedSpin || state.currentPurchasedSpinType || state.ravenChain || state.debugGiantTest) return;
  smallBladeSpinsWithoutBirdCut = 0;
  smallBladeBirdFloorThreshold = SMALL_BLADE_BIRD_FLOOR_MIN_ROUNDS +
    Math.floor(Math.random() * (SMALL_BLADE_BIRD_FLOOR_MAX_ROUNDS - SMALL_BLADE_BIRD_FLOOR_MIN_ROUNDS + 1));
}

// Cuchillas con su cuervo debajo que se fuerzan en esta tirada: las de la
// compra del Raven Bonus y, en las tiradas gratis de su cadena, una (o dos en
// RAVEN_CHAIN_DOUBLE_BLADE_CHANCE). 0 en cualquier otra tirada.
function ravenForcedBladeBirdCuts() {
  if (state.bonusModeActive || state.currentSpinType !== "BASE") return 0;
  if (state.pendingPurchasedSpin && state.pendingPurchasedSpin.type === "blade-spin") {
    return state.pendingPurchasedSpin.forceSmallBladeBirdCuts || 2;
  }
  if (isRavenChainFreeSpin()) return Math.random() < RAVEN_CHAIN_DOUBLE_BLADE_CHANCE ? 2 : 1;
  return 0;
}

function forcePurchasedSmallBladeBirdCutSpin() {
  const forcedCuts = ravenForcedBladeBirdCuts();
  if (!forcedCuts) return;
  const targetCount = Math.max(1, Math.min(SMALL_BLADE_MAX_CUTS_PER_SPIN, forcedCuts));
  const blocked = SMALL_BLADE_CUT_TRIGGER_SYMBOLS.concat(SMALL_BLADE_BONUS_GUARD_SYMBOLS);
  const candidates = [];

  // Casillas de cuchilla con al menos una casilla debajo donde poner su cuervo
  // (ver smallBladeCrowSpotBelow; el cuervo se elige al colocar, abajo).
  state.reels.forEach((reel) => {
    if (reel.pendingGiantSymbol || reel.type === "sternum") return;
    if (PURCHASED_BLADE_SPIN_EXCLUDED_BLADE_REELS.indexOf(reel.id) !== -1) return;
    if (!smallBladeReelIsCuttable(reel)) return;
    const syms = reel.pendingFinalSymbols;
    if (!Array.isArray(syms)) return;
    syms.forEach((symbol, index) => {
      if (blocked.indexOf(symbol) !== -1) return;
      if (smallBladeCellIsForbidden(reel, index)) return;
      if (!smallBladeOutcomeCellsBelow(reel, index).length) return;
      candidates.push({ reel, index });
    });
  });

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  state.reels.forEach((reel) => {
    if (reel.pendingGiantSymbol || reel.type === "sternum") return;
    const syms = reel.pendingFinalSymbols;
    if (!Array.isArray(syms)) return;
    syms.forEach((symbol, index) => {
      if (SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(symbol) !== -1) {
        syms[index] = smallBladeReplacementSymbol(reel);
      }
    });
  });

  // Cada cuchilla con su cuervo DEBAJO (en otra costilla de su columna), sin
  // que una pareja pise las casillas de otra.
  const used = new Set();
  const selected = [];
  for (const candidate of candidates) {
    if (selected.length >= targetCount) break;
    const bladeKey = candidate.reel.id + ":" + candidate.index;
    if (used.has(bladeKey)) continue;
    const crow = smallBladeCrowSpotBelow(candidate.reel, candidate.index, used);
    if (!crow) continue;
    candidate.reel.pendingFinalSymbols[candidate.index] = SMALL_BLADE_CUT_TRIGGER_SYMBOLS[0];
    crow.reel.pendingFinalSymbols[crow.index] = SMALL_BLADE_BIRD_SYMBOL;
    used.add(bladeKey);
    used.add(crow.reel.id + ":" + crow.index);
    selected.push({ blade: candidate, crow });
  }

  state.forceSmallBladeDoorVideosForSpin = selected.length > 0;
  if (selected.length > 0) {
    resetSmallBladeFloorCounter();
    resetSmallBladeBirdFloorCounter();
  }
}

function ensureSmallBladeBirdFloorForSpin() {
  smallBladeForcedBirdBladePos = null;
  if (state.bonusModeActive || state.currentSpinType !== "BASE" ||
      state.pendingPurchasedSpin || state.currentPurchasedSpinType || state.ravenChain || state.debugGiantTest) return;
  smallBladeSpinsWithoutBirdCut += 1;
  if (smallBladeSpinsWithoutBirdCut < smallBladeBirdFloorThreshold) {
    // Las parejas naturales tambien cuentan: sin este filtro el intervalo
    // 10..20 seguia dando un corte de cuervo cada ~6 giros. Solo se retiran
    // las cuchillas que cortarian cuervos; no se cambian los propios cuervos.
    state.reels.forEach((reel) => {
      if (reel.pendingGiantSymbol || reel.type === "sternum" || !smallBladeReelIsCuttable(reel)) return;
      (reel.pendingFinalSymbols || []).forEach((symbol, index) => {
        if (SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(symbol) === -1) return;
        if (!smallBladeOutcomeCellsBelow(reel, index).some((entry) =>
          isCrowSymbol(entry.reel.pendingFinalSymbols[entry.index]))) return;
        // No crear otro cuervo bajo una cuchilla superior al sustituirla.
        reel.pendingFinalSymbols[index] = smallBladeReplacementSymbol(reel, [SMALL_BLADE_BIRD_SYMBOL, GOLDEN_CROW_SYMBOL]);
      });
    });
    return;
  }

  // Casilla de cuchilla (ni cuchilla ya, ni comodin/gatillo de bonus, ni
  // prohibida) con su cuervo DEBAJO, en otra costilla de su misma columna, para
  // que el corte lo haga caer de verdad. Antes se ponia en k+1 del mismo rodillo,
  // que esta AL LADO (misma altura) y nunca se cortaba. Math.random, no el RNG.
  const excluded = SMALL_BLADE_CUT_TRIGGER_SYMBOLS.concat(SMALL_BLADE_BONUS_GUARD_SYMBOLS);
  const spots = [];
  (state.reels || []).forEach((reel) => {
    if (reel.pendingGiantSymbol || reel.type === "sternum") return;
    if (!smallBladeReelIsCuttable(reel)) return;
    const syms = reel.pendingFinalSymbols;
    if (!Array.isArray(syms)) return;
    syms.forEach((symbol, index) => {
      if (excluded.indexOf(symbol) !== -1) return;
      if (smallBladeCellIsForbidden(reel, index)) return;
      const crow = smallBladeCrowSpotBelow(reel, index);
      if (crow) spots.push({ reel, index, crow });
    });
  });
  // Ninguna casilla elegible este spin (raro): se reintenta al siguiente sin
  // reiniciar el contador, para no perder la garantia.
  if (!spots.length) return;
  const pick = spots[Math.floor(Math.random() * spots.length)];
  pick.reel.pendingFinalSymbols[pick.index] = SMALL_BLADE_CUT_TRIGGER_SYMBOLS[0]; // cuchilla
  pick.crow.reel.pendingFinalSymbols[pick.crow.index] = SMALL_BLADE_BIRD_SYMBOL;    // cuervo debajo
  smallBladeForcedBirdBladePos = { reel: pick.reel, index: pick.index };
  capSmallBladeSymbolsForSpin();
  // el contador se reinicia al cortar el cuervo de verdad
}

// Video del esqueleto lanzando la piedra, decidido POR CUCHILLA (peticion del
// usuario, 2026-10-04):
//  - si la cuchilla corta al menos un cuervo (VERTEBRA) -> sale SIEMPRE;
//  - si no corta cuervo pero YA hay un cuervo posado en rib1 -> RNG
//    (SMALL_BLADE_DOOR_VIDEO_PERCHED_CHANCE);
//  - si no corta cuervo y no hay ningun cuervo posado -> NUNCA sale.
// Las compras con forceSmallBladeDoorVideosForSpin siguen forzandolo.
const SMALL_BLADE_DOOR_VIDEO_PERCHED_CHANCE = 0.5;

// Parpadeo ROJO SANGRE del cofre central: un pulso alrededor del cofre por
// cada simbolo cortado, coordinado con el instante exacto del corte (callback
// onSymbolCut del modulo de la cuchilla). Mismo rojo que el contorno de la
// cuchilla resaltada. WAAPI: si llega otro corte con el pulso anterior en
// marcha, se cancela y reinicia (un parpadeo POR simbolo, nunca solapados).
let chestCutFlashAnim = null;
let chestCutShakeAnim = null;
function flashChestOnSymbolCut() {
  const chest = document.querySelector('[data-scene-layer="chest_normal_game"]');
  if (!chest || chest.hidden) return;
  if (chestCutFlashAnim) {
    try { chestCutFlashAnim.cancel(); } catch (e) {}
  }
  if (chestCutShakeAnim) {
    try { chestCutShakeAnim.cancel(); } catch (e) {}
  }
  chestCutFlashAnim = chest.animate(
    [
      { filter: "none" },
      {
        // Flash inicial: pico muy brillante y rapido.
        filter:
          "drop-shadow(0 0 8px rgba(255, 60, 60, 1)) " +
          "drop-shadow(0 0 22px rgba(255, 8, 24, 1)) " +
          "drop-shadow(0 0 42px rgba(190, 0, 12, 0.9))",
        offset: 0.1
      },
      {
        // Se sostiene un instante (recubrimiento) algo por debajo del pico.
        filter:
          "drop-shadow(0 0 5px rgba(255, 8, 24, 0.95)) " +
          "drop-shadow(0 0 16px rgba(190, 0, 12, 0.85)) " +
          "drop-shadow(0 0 30px rgba(140, 0, 0, 0.7))",
        offset: 0.35
      },
      { filter: "none" }
    ],
    { duration: 1000, easing: "ease-out" }
  );
  chestCutFlashAnim.finished.catch(function () {});

  // Ligera vibracion coordinada con el destello rojo: mas suave (menos
  // amplitud, mas pasos) y con la misma duracion que el brillo para que
  // ambos se apaguen a la vez.
  chestCutShakeAnim = chest.animate(
    [
      { translate: "0 0" },
      { translate: "-1px 0.5px" },
      { translate: "1px -0.5px" },
      { translate: "-0.8px 0.4px" },
      { translate: "0.8px -0.4px" },
      { translate: "-0.4px 0.2px" },
      { translate: "0.4px -0.2px" },
      { translate: "0 0" }
    ],
    { duration: 650, easing: "ease-in-out" }
  );
  chestCutShakeAnim.finished.catch(function () {});
}

// El rastro de sangre de la cuchilla pequena del rodillo central no debe
// verse encima del cofre: si la cuchilla cae en una columna que solapa
// horizontalmente con el cofre, el rastro se recorta justo antes de su borde
// superior (el resto de la caida de simbolos no se ve afectado).
function smallBladeBloodTrailMaxBottom(bladeRect) {
  const chest = document.querySelector('[data-scene-layer="chest_normal_game"]');
  if (!chest || chest.hidden) return null;
  const chestRect = chest.getBoundingClientRect();
  if (!chestRect.width || !chestRect.height) return null;
  if (chestRect.top <= bladeRect.top) return null;
  const overlapX = Math.min(bladeRect.left + bladeRect.width, chestRect.left + chestRect.width) -
    Math.max(bladeRect.left, chestRect.left);
  if (overlapX <= 0) return null;
  return chestRect.top;
}

const smallBladeCut = window.OssuarySmallBladeCut.create({
  onSymbolCut: flashChestOnSymbolCut,
  onSymbolArrive: function () {
    if (window.OssuaryRuletaGame) window.OssuaryRuletaGame.addFallenSymbols(1);
  },
  getDebrisTargetRect: function () {
    const chest = document.querySelector('[data-scene-layer="chest_normal_game"] .ruleta-chest-rig__body');
    if (!chest) return null;
    const rect = chest.getBoundingClientRect();
    return rect.width && rect.height
      ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      : null;
  },
  getBloodTrailMaxBottom: smallBladeBloodTrailMaxBottom
});

// Video puerta/esqueleto (webm con alfa + audio) que aparece DETRAS del primer
// simbolo que corta cada cuchilla pequena: primer frame fijo mientras el
// simbolo cae, play (con sonido) cuando todos los simbolos han caido, piedra
// lanzada hacia el encapuchado en el segundo ~1.9 y ultimo frame como imagen
// hasta el siguiente spin. Modulo 100% visual/audio propio
// (src/fx/small-blade-door-video.js), guardado por si el script no esta
// cargado.
const smallBladeDoorVideo = window.OssuarySmallBladeDoorVideo
  ? window.OssuarySmallBladeDoorVideo.create({})
  : null;

// Pajaro (cuervo) que cae y se queda posado en el rodillo 1 cuando la cuchilla
// pequena corta un simbolo de pajaro (VERTEBRA). Persiste entre spins; solo se
// retira en reset total. Modulo 100% visual (src/fx/small-blade-bird-perch.js).
const smallBladeBirdPerch = window.OssuarySmallBladeBirdPerch
  ? window.OssuarySmallBladeBirdPerch.create({})
  : null;
if (smallBladeBirdPerch) smallBladeBirdPerch.warmCache();

function syncBaseCrowBonusState() {
  if (!smallBladeBirdPerch) return;
  // El primer impacto puede activar Raven antes de acabar los demas cortes.
  // Conserva los posaderos de esa tirada hasta que termine. La compra ya
  // guardo los de base antes de arrancar su primera tirada.
  if (state.ravenChain && state.ravenChain.spin === 1 && state.spinning) return;
  const inBonus = Boolean(state.bonusModeActive || state.ravenChain ||
    state.pendingPurchasedSpin || state.currentSpinType === "BONUS" || isRuletaActive() || isElJuicioActive() ||
    state.gameStatus === GAME_STATES.BONUS_MODE_PENDING || state.gameStatus === GAME_STATES.SUPER_BONUS_MODE_PENDING || (bonusSummaryOpen && !state.bonusReturnRestored));
  smallBladeBirdPerch.setBonusSuspended(inBonus);
}

// Niebla del Execution Bonus en el negro de los rodillos rib2-5 (modulo 100%
// visual, src/fx/bonus-lane-fog.js): se monta al entrar en el tablero negro
// del bonus y se abre cuando aterriza un esqueleto en ese rodillo.
const bonusLaneFog = window.OssuaryBonusLaneFog
  ? window.OssuaryBonusLaneFog.create({})
  : null;
const BONUS_LANE_FOG_SKELETONS = ["POBRE", "NOBLE", "RICO"];

// Simbolo cuyo corte hace caer al pajaro (el antiguo "linterna", reskin a
// cuervo; el id interno VERTEBRA no cambia para no tocar strips/pagos/RNG).
const SMALL_BLADE_BIRD_SYMBOL = "VERTEBRA";
// Los dos posaderos: casilla 1 y casilla 3 del rodillo 1 (rib1). El pajaro se
// posa 15px por encima del borde superior de una de ellas (perchGapPx del FX).
const SMALL_BLADE_BIRD_PERCH_SLOTS = [
  { key: "rib1-cell1", cellIndex: 0 },
  { key: "rib1-cell3", cellIndex: 2 }
];

// --- Pagos post-corte (peticion del usuario, 2026-07-09) -------------------
// La linea de pago se evalua DESPUES de que caigan las cuchillas pequenas:
//  - las casillas cuyo simbolo fue CORTADO quedan VACIAS (rompen la linea).
//  - las casillas con una COPIA de cuervo muerto cuentan como WILD, con el
//    multiplicador que llevaba el cuervo aplicado a las lineas que las cruzan.
// Ambos son SOLO del board de evaluacion visual: no tocan cell.effective, el
// outcome, los strips ni el RNG del motor. Se poblan durante la secuencia de la
// cuchilla (corte / muerte del cuervo) y se consultan al recalcular la ganancia
// en revealWinAndFinish. Se limpian al arrancar el siguiente giro.
let smallBladeCutCellIds = new Set();
let deadCrowWildByCellId = new Map();
let deadCrowCoveredCellEls = new Set();
let deadCrowCoveredTileEls = new Set();
let winningPaylineOverlayEl = null;
let activeWinningPaylinePayouts = [];
// Escalera de las lineas de pago (peticion del usuario, 2026-10-15): salen una
// detras de otra, de menor a mayor premio, y cada una suena un golpe mas alto
// de la escala menor pentatonica (golpe seco, tools/bake-win-notes.js).
// Solo presentacion: el premio y el pago no cambian.
let winningPaylineRevealStartedAt = 0;
let winningPaylineRevealDelays = [];
let winningPaylineNoteTimers = [];
const WINNING_PAYLINE_STAGGER_MS = { max: 170, min: 70, total: 1100 };
const WINNING_PAYLINE_NOTE_STEPS = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24];
let paylineConnectionDebugOverlayEl = null;
let winningPaylineAmountOverlayEl = null;
let winningPaylineForegroundTimer = 0;
let lastPaylineResolutionDebug = null;
const WINNING_PAYLINE_DRAW_MS = 650;
const WINNING_PAYLINE_AMOUNT_ANIM_MS = 820;

// Ancla del posadero: funcion que devuelve el rect (viewport) de la casilla de
// rib1 en vivo (o null si aun no se puede medir). El FX la reevalua al posar y
// al recolocar (resize), asi el pajaro sigue clavado a su casilla.
function smallBladeBirdAnchorForCell(cellIndex) {
  return function () {
    const rib1 = (state.reels || []).find((reel) => reel.id === "rib1");
    const cell = rib1 && Array.isArray(rib1.cells) ? rib1.cells[cellIndex] : null;
    if (!cell || !cell.el) return null;
    const rect = cell.el.getBoundingClientRect();
    return (rect.width && rect.height) ? rect : null;
  };
}

function landSmallBladeBirdInSlot(slot, opts) {
  if (!smallBladeBirdPerch || !slot) return false;
  const wasOccupied = smallBladeBirdPerch.isOccupied(slot.key);
  const landed = smallBladeBirdPerch.landBird(slot.key, smallBladeBirdAnchorForCell(slot.cellIndex), opts);
  if (landed && !wasOccupied && window.OssuaryAudio) window.OssuaryAudio.trigger("crow_perch", {});
  // Cuervo dorado posado: su propio brillo sonoro (mas agudo que al aterrizar).
  if (landed && opts && opts.golden && window.OssuaryAudio) {
    window.OssuaryAudio.trigger("golden_crow_perched", { factor: opts.factor });
  }
  return landed;
}

// Cuervos cortados de cada cuchilla (grupo del corte), en orden de caida.
function crowEntriesByBlade(groups) {
  return (groups || [])
    .map((group) => group.falling.filter((entry) => isCrowSymbol(entry.symbol)))
    .filter((entries) => entries.length > 0);
}

// Posa los cuervos cortados ([{ slot, opts }], en orden), uno detras de otro
// para que se vea subir el xN de cada posadero: cada cuervo cortado suma
// (peticion del usuario, 2026-10-09). Sobre un cuervo que se acaba de posar,
// el siguiente espera a que termine de bajar. Todos caen antes de que el
// esqueleto suelte la piedra (~1.9 s despues). Devuelve los posaderos usados.
const CROW_LAND_STAGGER_MS = 300;
const CROW_LAND_AFTER_PERCH_MS = 560;
const CROW_LAND_MAX_MS = 1400;
let crowLandTimers = new Set();

function landCrowsInSequence(landings) {
  const slots = new Set();
  slots.ready = Promise.resolve();
  if (!smallBladeBirdPerch || !landings.length) return slots;
  let resolveLandings;
  let pendingLandings = 0;
  slots.ready = new Promise((resolve) => { resolveLandings = resolve; });
  const newPerchAt = new Map();
  let t = 0;
  landings.forEach((landing, i) => {
    const key = landing.slot.key;
    if (i > 0) t += CROW_LAND_STAGGER_MS;
    if (newPerchAt.has(key)) t = Math.max(t, newPerchAt.get(key) + CROW_LAND_AFTER_PERCH_MS);
    else if (!slots.has(key) && !smallBladeBirdPerch.isOccupied(key)) newPerchAt.set(key, t);
    t = Math.min(t, CROW_LAND_MAX_MS);
    slots.add(key);
    if (t === 0) {
      landSmallBladeBirdInSlot(landing.slot, landing.opts);
      return;
    }
    pendingLandings += 1;
    const id = window.setTimeout(function () {
      crowLandTimers.delete(id);
      landSmallBladeBirdInSlot(landing.slot, landing.opts);
      if (--pendingLandings === 0) resolveLandings();
    }, speedMs(t));
    crowLandTimers.add(id);
  });
  if (!pendingLandings) resolveLandings();
  return slots;
}

function clearCrowLandTimers() {
  crowLandTimers.forEach((id) => window.clearTimeout(id));
  crowLandTimers.clear();
}

function crowLandingOptions(entry) {
  return isGoldenCrowEntry(entry) ? goldenCrowPerchOptions() : null;
}

// Compra del Raven Bonus: un cuervo a cada lado como minimo. Cada cuchilla
// lleva sus cuervos a un lado distinto (al azar) y, si una corta mas de uno,
// se apilan en su lado; un lado sin cuervo cortado recibe uno negro.
function landPurchasedBladeSpinCrows(groups) {
  if (!smallBladeBirdPerch) return false;
  const byBlade = crowEntriesByBlade(groups);
  const slots = SMALL_BLADE_BIRD_PERCH_SLOTS.slice();
  if (Math.random() < 0.5) slots.reverse();
  const landings = [];
  byBlade.forEach((entries, i) => {
    const slot = slots[i % slots.length];
    entries.forEach((entry) => landings.push({ slot, opts: crowLandingOptions(entry) }));
  });
  slots.forEach((slot, i) => {
    if (i >= byBlade.length) landings.unshift({ slot, opts: null });
  });
  const landedSlots = landCrowsInSequence(landings);
  if (landedSlots.size) {
    state.purchasedBladeSpinCrowSlots = Array.from(landedSlots);
    resetSmallBladeBirdFloorCounter();
  }
  return landedSlots.size > 0;
}

function clearPurchasedBladeSpinCrows() {
  if (!smallBladeBirdPerch || !Array.isArray(state.purchasedBladeSpinCrowSlots) || !state.purchasedBladeSpinCrowSlots.length) {
    state.purchasedBladeSpinCrowSlots = [];
    return;
  }
  if (typeof smallBladeBirdPerch.clearSlots === "function") {
    smallBladeBirdPerch.clearSlots(state.purchasedBladeSpinCrowSlots);
  }
  state.purchasedBladeSpinCrowSlots = [];
}

// Tras un corte: cada cuchilla que corta cuervos los manda a un lado del
// rodillo 1 elegido AL AZAR (casilla 1 = izq o casilla 3 = der, cada una
// puede salir siempre), todos al mismo: si corta dos, sale uno con x2. Si
// ese lado esta LIBRE, se posa un cuervo nuevo; si YA hay cuervo ahi, se
// APILA: sube el multiplicador de ese posadero (suma lo que vale el que cae:
// 1 el negro, su factor el dorado) y cae un cuervo encima que se funde con el
// posado. Persisten entre spins. Solo visual (Math.random, nunca el RNG del
// motor; no toca pagos).
function triggerSmallBladeBirdPerch(groups) {
  if (economicSpinPlan && economicSpinPlan.kind === "base") {
    return landCrowsInSequence(economicSpinPlan.landings.map((entry) => ({
      slot: SMALL_BLADE_BIRD_PERCH_SLOTS[entry.slot],
      opts: {golden:entry.member.golden,factor:entry.member.value,remaining:entry.member.remaining}
    }))).ready;
  }
  if (state.currentPurchasedSpinType === "blade-spin") {
    landPurchasedBladeSpinCrows(groups);
    return;
  }
  const byBlade = crowEntriesByBlade(groups);
  // Se corto al menos un cuervo: reinicia el suelo de corte de cuervo (garantia
  // de extremo a extremo, tanto si el corte fue natural como forzado).
  if (byBlade.length > 0) resetSmallBladeBirdFloorCounter();
  if (!smallBladeBirdPerch || !byBlade.length) return;
  const landings = [];
  byBlade.forEach((entries) => {
    const slot = SMALL_BLADE_BIRD_PERCH_SLOTS[
      Math.floor(Math.random() * SMALL_BLADE_BIRD_PERCH_SLOTS.length)
    ];
    entries.forEach((entry) => landings.push({ slot, opts: crowLandingOptions(entry) }));
  });
  landCrowsInSequence(landings);
}

// Punto objetivo de la piedra del esqueleto: el encapuchado de la escena,
// ~35px por encima del simbolo CENTRAL del rodillo 1 (rib1). Medido en vivo
// con el tablero detenido; null si no se puede resolver (la piedra no sale).
const SMALL_BLADE_STONE_TARGET_OFFSET_Y = -35;
function smallBladeStoneTargetPoint() {
  const rib1 = (state.reels || []).find((reel) => reel.id === "rib1");
  if (!rib1 || !Array.isArray(rib1.cells) || !rib1.cells.length) return null;
  const centerCell = rib1.cells[Math.floor(rib1.cells.length / 2)];
  if (!centerCell || !centerCell.el) return null;
  const rect = centerCell.el.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + SMALL_BLADE_STONE_TARGET_OFFSET_Y
  };
}

// Punto objetivo cuando la piedra apunta a un PAJARO posado: el cuerpo del
// cuervo, centrado sobre su casilla de rib1 y ~20px por encima del borde
// superior (donde queda posado). null si no se puede medir.
const SMALL_BLADE_BIRD_TARGET_OFFSET_Y = -20;
function smallBladeBirdTargetPoint(cellIndex) {
  const rib1 = (state.reels || []).find((reel) => reel.id === "rib1");
  const cell = rib1 && Array.isArray(rib1.cells) ? rib1.cells[cellIndex] : null;
  if (!cell || !cell.el) return null;
  const rect = cell.el.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + SMALL_BLADE_BIRD_TARGET_OFFSET_Y };
}

// Ancla (rect en vivo) de una casilla cualquiera, para el FX del cuervo muerto.
function smallBladeCellRectFn(cell) {
  return function () {
    if (!cell.el) return null;
    const r = cell.el.getBoundingClientRect();
    return (r.width && r.height) ? r : null;
  };
}

// Casillas que atraviesa la VERTICAL del pajaro posado (cellIndex de rib1) al
// caer muerto: la propia casilla y todas las de debajo cuyo intervalo horizontal
// contiene esa vertical (nada de diagonales). Ordenadas de arriba a abajo; cada
// una recibira una copia del cuervo muerto. Solo geometria visual en vivo.
function smallBladeColumnCellsBelow(cellIndex) {
  const rib1 = (state.reels || []).find((reel) => reel.id === "rib1");
  const perchCell = rib1 && Array.isArray(rib1.cells) ? rib1.cells[cellIndex] : null;
  if (!perchCell || !perchCell.el) return [];
  const pr = perchCell.el.getBoundingClientRect();
  if (!pr.width || !pr.height) return [];
  const lineX = pr.left + pr.width / 2;
  const out = [];
  (state.reels || []).forEach((reel) => {
    (reel.cells || []).forEach((cell) => {
      if (!cell.el) return;
      const r = cell.el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (r.top + r.height / 2 <= pr.top) return; // de la fila del posadero hacia abajo
      if (lineX < r.left || lineX > r.right) return; // cruzada por la vertical
      out.push({ top: r.top, cellId: cell.id, anchor: smallBladeCellRectFn(cell) });
    });
  });
  out.sort((a, b) => a.top - b.top);
  return out.map((o) => ({ cellId: o.cellId, anchor: o.anchor }));
}

// Impacto de la piedra en un pajaro posado: el cuervo se vuelve la imagen del
// cuervo muerto, cae recta hasta abajo y deja una copia en cada casilla de su
// vertical (se limpian en el siguiente giro). 100% visual (no toca pagos/RNG).
function killBirdWithFall(slot) {
  if (!smallBladeBirdPerch) return Promise.resolve();
  if (economicSpinPlan && economicKilledCrowSlots.has(slot.key)) return Promise.resolve();
  const columnCells = smallBladeColumnCellsBelow(slot.cellIndex);
  const killOrigin = typeof smallBladeBirdPerch.rectAt === "function"
    ? smallBladeBirdPerch.rectAt(slot.key)
    : null;
  // Multiplicador que llevaba el cuervo ANTES de morir (x1 = sin multiplicador).
  const mult = smallBladeBirdPerch.multiplierAt(slot.key) || 1;
  // La piedra golpea al cuervo: suena el impacto (solo si habia cuervo vivo que
  // matar; killBird devuelve false si el posadero estaba vacio).
  if (smallBladeBirdPerch.killBird(slot.key, columnCells)) {
    if (economicSpinPlan) economicKilledCrowSlots.add(slot.key);
    // Pagos: cada casilla que recibe una COPIA de cuervo muerto pasa a contar
    // como WILD, con el multiplicador del cuervo aplicado a las lineas que la
    // cruzan (se evalua tras el corte, ver revealWinAndFinish). Persiste igual
    // que la copia visual y se limpia al descartarla en el siguiente giro.
    columnCells.forEach((col) => {
      if (col.cellId) registerDeadCrowWildCell(col.cellId, mult);
    });
    // Cada cuervo muerto da otra tirada gratis (ver continueRavenChain); el
    // contador de SPIN sube en el momento. En una tirada normal, el primero
    // arranca la misma cadena que el Raven Bonus (peticion del usuario,
    // 2026-10-09: igual que el bonus, pero por azar en vez de comprado).
    if (!state.bonusModeActive && !economicSpinPlan) {
      if (!state.ravenChain) startRavenChain();
      state.ravenChain.kills += 1;
      state.ravenChain.lastKillOrigin = killOrigin;
      render();
      // Piedra que llega con la tirada ya cerrada (video del esqueleto lento):
      // la cadena sigue desde aqui en vez de perder la tirada.
      if (!state.spinning && !state.busy) scheduleAutoSpin();
    }
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("crow_stone_hit", {});
    const settings = smallBladeBirdPerch.settings || {};
    const waitMs = (settings.fallMs || 0) + (settings.copyLandMs || 0) + 80;
    return new Promise((resolve) => window.setTimeout(resolve, speedMs(waitMs)));
  }
  return Promise.resolve();
}

function findCellRecordById(cellId) {
  for (const reel of state.reels) {
    const cell = reel.cells.find((item) => item.id === cellId);
    if (cell) return { reel, cell };
  }
  return null;
}

function registerDeadCrowWildCell(cellId, multiplier) {
  deadCrowWildByCellId.set(cellId, multiplier || 1);
  const record = findCellRecordById(cellId);
  if (!record) return;
  if (record.cell.el) {
    record.cell.el.classList.add("is-covered-by-dead-crow-wild");
    deadCrowCoveredCellEls.add(record.cell.el);
  }
  const displayed = smallBladeDisplayedTileForCell(record.reel, record.cell);
  if (displayed && displayed.tileEl) {
    displayed.tileEl.classList.add("is-covered-by-dead-crow-wild");
    deadCrowCoveredTileEls.add(displayed.tileEl);
  }
}

function clearDeadCrowWildCellCovers() {
  deadCrowCoveredCellEls.forEach((el) => el.classList.remove("is-covered-by-dead-crow-wild"));
  deadCrowCoveredTileEls.forEach((el) => el.classList.remove("is-covered-by-dead-crow-wild"));
  deadCrowCoveredCellEls.clear();
  deadCrowCoveredTileEls.clear();
}

// Resolver del lanzamiento de la piedra: lo llama el FX de la puerta en el
// instante de soltar la piedra, para decidir el objetivo segun los pajaros
// VIVOS en ese momento: mata a un cuervo (ver hitBird), golpea al encapuchado
// (ojos) o es un tiro perdido. Eleccion con Math.random (capa visual, nunca el
// RNG del motor).
// Si la piedra no le da a ningun cuervo: parte de las veces golpea al
// encapuchado (se le encienden los ojos) y el resto es un tiro perdido que
// sale volando por su lado (peticion del usuario, 2026-10-13).
const STONE_CENTER_HIT_SHARE = 0.5;

function makeSmallBladeStoneThrowResolver(selectedStone) {
  // from: {x, y} de la mano del esqueleto al soltar la piedra.
  return function (from) {
    if (economicSpinPlan && economicSpinPlan.kind === "base") {
      const stone = selectedStone || economicSpinPlan.stones[economicStoneIndex++];
      if (stone && stone.slot !== null) {
        const slot = SMALL_BLADE_BIRD_PERCH_SLOTS[stone.slot];
        const point = smallBladeBirdTargetPoint(slot.cellIndex) || smallBladeStoneTargetPoint();
        return point ? {x:point.x,y:point.y,miss:false,onHit:()=>killBirdWithFall(slot)} : null;
      }
      const center = smallBladeStoneTargetPoint();
      if (center && Math.random() < STONE_CENTER_HIT_SHARE) return {x:center.x,y:center.y,miss:false,onHit:showHoodEyes};
      const missed = smallBladeStoneWildMissPoint(from);
      return missed ? {x:missed.x,y:missed.y,miss:true,exact:true} : center ? {x:center.x,y:center.y,miss:true} : null;
    }
    const center = smallBladeStoneTargetPoint();
    const perched = smallBladeBirdPerch
      ? SMALL_BLADE_BIRD_PERCH_SLOTS.filter((s) => smallBladeBirdPerch.isOccupied(s.key))
      : [];
    const birdOptions = [];
    perched.forEach((slot) => {
      const pt = smallBladeBirdTargetPoint(slot.cellIndex);
      if (pt) birdOptions.push({ slot: slot, x: pt.x, y: pt.y });
    });
    // Probabilidad de matar a un cuervo, la de siempre: como elegir al azar
    // entre el centro y cada cuervo posado (n / (n + 1)). En las tiradas
    // gratis de la cadena, la de RAVEN_CHAIN_STONE_HIT_CHANCES. Solo debug
    // (OssuaryRavenDebug.stoneAlwaysHits): siempre.
    let hitBird = false;
    if (birdOptions.length) {
      if (ravenDebugStoneAlwaysHits) hitBird = true;
      else if (isRavenChainFreeSpin()) hitBird = Math.random() < ravenChainStoneHitChance();
      else hitBird = Math.random() < birdOptions.length / (birdOptions.length + 1);
    }
    if (hitBird) {
      const choice = birdOptions[Math.floor(Math.random() * birdOptions.length)];
      const slot = choice.slot;
      return { x: choice.x, y: choice.y, miss: false, onHit: function () { return killBirdWithFall(slot); } };
    }
    if (center && Math.random() < STONE_CENTER_HIT_SHARE) {
      return { x: center.x, y: center.y, miss: false, onHit: showHoodEyes };
    }
    const wild = smallBladeStoneWildMissPoint(from);
    if (wild) return { x: wild.x, y: wild.y, miss: true, exact: true };
    return center ? { x: center.x, y: center.y, miss: true } : null;
  };
}

// Tiro perdido: un punto al azar por fuera de rib1, del lado de la puerta y
// por encima, de modo que la piedra pase por fuera del cuervo de ese lado (que
// ocupa 1.5 casillas de ancho centrado en su casilla) y siga hasta salir.
function smallBladeStoneWildMissPoint(from) {
  const rib1 = (state.reels || []).find((reel) => reel.id === "rib1");
  const cells = rib1 && Array.isArray(rib1.cells) ? rib1.cells : [];
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (!first || !first.el || !last || !last.el) return null;
  const a = first.el.getBoundingClientRect();
  const b = last.el.getBoundingClientRect();
  if (!a.width || !b.width) return null;
  const mid = (a.left + b.right) / 2;
  const side = from && typeof from.x === "number"
    ? (from.x < mid ? -1 : 1)
    : (Math.random() < 0.5 ? -1 : 1);
  const edge = side < 0 ? a.left : b.right;
  return {
    x: edge + side * a.width * (0.35 + Math.random() * 0.8),
    y: a.top - a.width * (0.2 + Math.random() * 0.9)
  };
}

// La piedra golpea al encapuchado: se le encienden los ojos (src/fx/hood-eyes.js).
// mood "watch": mira fijo durante la anticipacion de la cadena del bonus.
function showHoodEyes(mood) {
  if (!window.OssuaryHoodEyes) return;
  const rib1 = (state.reels || []).find((reel) => reel.id === "rib1");
  const cell = rib1 && Array.isArray(rib1.cells) ? rib1.cells[Math.floor(rib1.cells.length / 2)] : null;
  if (!cell || !cell.el) return;
  window.OssuaryHoodEyes.show(function () { return cell.el.getBoundingClientRect(); }, mood);
}

// --- Expectativa de la piedra (peticion del usuario, 2026-10-13) -----------
// Con un cuervo posado, mientras el esqueleto sale y arma el brazo (FX de la
// puerta, small-blade-door-video.js), el tablero se oscurece. El video del
// cuervo posado ya tiene movimiento propio. Si la piedra mata al cuervo,
// salta una explosion de plumas (small-blade-bird-perch.js#killBird). Solo
// presentacion: no cambia si la piedra acierta.

function smallBladeStoneHasCrowTarget() {
  return Boolean(smallBladeBirdPerch) &&
    SMALL_BLADE_BIRD_PERCH_SLOTS.some((slot) => smallBladeBirdPerch.isOccupied(slot.key));
}

function setSmallBladeStoneTension(on) {
  if (smallBladeBirdPerch && smallBladeBirdPerch.brace) smallBladeBirdPerch.brace(on);
}


// Huecos persistentes tras el corte: casillas que deben seguir VACIAS durante
// el siguiente giro y salir del tablero con el propio movimiento del rodillo
// (no rellenarse de golpe al pulsar SPIN). Cada hueco se ancla al streamIndex
// del tile cortado y un ticker propio re-mapea la clase de oculto al tile del
// pool que muestre ese streamIndex en cada frame; cuando el indice sale de la
// ventana visible, el hueco expira solo. Nada de esto toca el estado logico.
let smallBladeHoles = [];
let smallBladeHoleFrame = null;

// Un reel cubierto por un gigante (o bloqueado) no participa: sus tiles
// normales estan ocultos bajo el bloque gigante y clonarlos enseñaria
// simbolos que el jugador no esta viendo (causa real de cortes "fantasma").
function smallBladeReelIsCuttable(reel) {
  return !(reel.giantActive || reel.locked || reel.carryGiantBlock || reel.lockedGiantBlock);
}

// Misma base estable que usa reel-renderer#stableStreamBaseIndex para asignar
// streamIndex a los tiles del pool (incluido el lock de windup), para que el
// mapeo hueco->tile coincida exactamente con el del render en cada frame.
function smallBladeStreamBase(reel) {
  const center = streamIndexAtCell(reel, reel.continuousReferenceCell, reel.position);
  const base = (reel.windupRenderLock && typeof reel.windupBaseStreamIndex === "number")
    ? reel.windupBaseStreamIndex
    : Math.floor(center);
  return { base, center };
}

// Tile del pool continuo que el jugador esta VIENDO en la posicion de una
// celda, resuelto por solape geometrico (rects), valido con el rodillo
// detenido. Sustituye al mapeo por indice: en los reels con cellStep/scroll
// negativos (mitades derechas, esternon) el orden visual del pool va invertido
// y el mapeo directo devolvia tiles equivocados o fuera de pantalla (causa de
// los rastros de cuchillas anteriores y cortes duplicados).
function smallBladeDisplayedTileForCell(reel, cell) {
  if (!cell.el || !Array.isArray(reel.continuousTileEls) || !reel.continuousTileEls.length) return null;
  if (economicSpinPlan && reel.phase === "stopped" && reel.fxRenderGeometry &&
      Math.abs(reel.fxRenderGeometry.center - reel.position) < 1e-6) {
    const stream = Math.round(streamIndexAtCell(reel, cell, reel.position));
    const poolIndex = stream - reel.fxRenderGeometry.firstIndex;
    const tileEl = reel.continuousTileEls[poolIndex];
    if (!tileEl) throw new Error("Selected landing tile missing: " + cell.id + " stream=" + stream + " index=" + poolIndex + " cellIndex=" + cell.reelCellIndex + " position=" + reel.position + " first=" + reel.fxRenderGeometry.firstIndex + " length=" + reel.continuousTileEls.length);
    return { tileEl, poolIndex };
  }
  const cellRect = cell.el.getBoundingClientRect();
  if (!cellRect.width || !cellRect.height) return null;
  let best = null;
  let bestDist = Infinity;
  reel.continuousTileEls.forEach((tileEl, poolIndex) => {
    const rect = tileEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dx = (rect.left + rect.width / 2) - (cellRect.left + cellRect.width / 2);
    const dy = (rect.top + rect.height / 2) - (cellRect.top + cellRect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      best = { tileEl, poolIndex };
    }
  });
  // El tile debe estar realmente sobre la celda, no ser un vecino lejano.
  if (!best || bestDist > Math.max(cellRect.width, cellRect.height)) return null;
  return best;
}

// Corte por COLUMNA: una celda solo cae si su intervalo horizontal solapa de
// verdad con el de la celda de la cuchilla (>40% del ancho menor). Asi una
// cuchilla en rib3 casilla 1 solo corta la casilla 1 de rib4/rib5, nunca la
// otra casilla del mismo lado ni el resto del tablero.
function smallBladeColumnsOverlap(cellA, cellB) {
  const aMin = cellA.x - cellA.w / 2;
  const aMax = cellA.x + cellA.w / 2;
  const bMin = cellB.x - cellB.w / 2;
  const bMax = cellB.x + cellB.w / 2;
  const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);
  return overlap > Math.min(cellA.w, cellB.w) * 0.4;
}

// Escanea el tablero detenido leyendo los TILES visibles (no cell.current: en
// el esternon el tile mostrado puede diferir del estado de celda y provocaba
// cortes sin cuchilla visible). Devuelve un grupo por cuchilla con las
// entradas {reel, cell, tileEl, poolIndex} de la cuchilla y de sus afectados.
function collectSmallBladeCutGroups() {
  if (!Array.isArray(state.reels)) return [];
  if (economicSpinPlan && economicSpinPlan.kind === "base") {
    const entry = (id) => {
      const found = findCellRecordById(id);
      if (!found) throw new Error("Selected cut cell missing: " + id);
      const tile = smallBladeDisplayedTileForCell(found.reel, found.cell);
      if (!tile) throw new Error("Selected cut tile missing: " + id);
      const symbol = economicSpinPlan.outcomes[found.reel.id].symbols[found.reel.cells.indexOf(found.cell)];
      return Object.assign({}, found, tile, { symbol });
    };
    return economicSpinPlan.groups.map((group) => ({blade:entry(group.blade),falling:group.falling.map(entry)}));
  }
  const entries = [];
  state.reels.forEach((reel) => {
    if (!smallBladeReelIsCuttable(reel)) return;
    reel.cells.forEach((cell) => {
      const found = smallBladeDisplayedTileForCell(reel, cell);
      if (!found) return;
      entries.push({
        reel,
        cell,
        tileEl: found.tileEl,
        poolIndex: found.poolIndex,
        symbol: found.tileEl.dataset.symbol || ""
      });
    });
  });
  const blades = entries.filter((entry) => SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(entry.symbol) !== -1);
  if (!blades.length) return [];
  // Red de seguridad: el tope de tablero (capSmallBladeSymbolsForSpin) ya
  // garantiza que aterricen <=SMALL_BLADE_MAX_CUTS_PER_SPIN cuchillas, asi que
  // este recorte no deberia activarse en BASE game. Se conserva por robustez
  // (barajado Fisher-Yates con Math.random y corte a ese maximo): si por algun
  // camino se colasen mas, las sobrantes ni cortan ni caen.
  let activeBlades = blades;
  if (blades.length > SMALL_BLADE_MAX_CUTS_PER_SPIN) {
    activeBlades = blades.slice();
    for (let i = activeBlades.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activeBlades[i], activeBlades[j]] = [activeBlades[j], activeBlades[i]];
    }
    activeBlades = activeBlades.slice(0, SMALL_BLADE_MAX_CUTS_PER_SPIN);
  }
  const claimed = new Set();
  blades.forEach((blade) => claimed.add(blade.tileEl));
  return activeBlades.map((blade) => {
    const falling = entries.filter((entry) =>
      !claimed.has(entry.tileEl) &&
      SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(entry.symbol) === -1 &&
      entry.cell.y > blade.cell.y &&
      smallBladeColumnsOverlap(blade.cell, entry.cell)
    );
    falling.forEach((entry) => claimed.add(entry.tileEl));
    return { blade, falling };
  });
}

// Al terminar la caida, convierte los tiles ocultos en huecos persistentes
// anclados a su streamIndex y arranca el ticker que los acompaña en el giro.
function registerSmallBladeHoles(cutEntries) {
  const detached = smallBladeCut.detachHiddenTiles();
  const detachedSet = new Set(detached);
  cutEntries.forEach((entry) => {
    if (!detachedSet.has(entry.tileEl)) return; // cancelado antes de ocultarse
    detachedSet.delete(entry.tileEl);
    const { base } = smallBladeStreamBase(entry.reel);
    smallBladeHoles.push({
      reel: entry.reel,
      cellId: entry.cell.id,
      streamIndex: base - entry.reel.continuousTileRadius + entry.poolIndex,
      tileEl: entry.tileEl
    });
  });
  // Cualquier tile oculto sin hueco asociado se restaura (no deberia ocurrir).
  detachedSet.forEach((tileEl) => tileEl.classList.remove("small-blade-cut-hidden"));
  ensureSmallBladeHoleFrame();
}

function ensureSmallBladeHoleFrame() {
  if (smallBladeHoleFrame || !smallBladeHoles.length) return;
  smallBladeHoleFrame = window.requestAnimationFrame(updateSmallBladeHoles);
}

function updateSmallBladeHoles() {
  smallBladeHoleFrame = null;
  if (!smallBladeHoles.length) return;
  const alive = [];
  smallBladeHoles.forEach((hole) => {
    const reel = hole.reel;
    const { base, center } = smallBladeStreamBase(reel);
    const poolIndex = hole.streamIndex - (base - reel.continuousTileRadius);
    const expired =
      poolIndex < 0 ||
      poolIndex >= reel.continuousTileEls.length ||
      Math.abs(hole.streamIndex - center) > reel.continuousTileRadius;
    if (expired) {
      if (hole.tileEl) hole.tileEl.classList.remove("small-blade-cut-hidden");
      return;
    }
    const tileEl = reel.continuousTileEls[poolIndex];
    if (tileEl !== hole.tileEl) {
      if (hole.tileEl) hole.tileEl.classList.remove("small-blade-cut-hidden");
      tileEl.classList.add("small-blade-cut-hidden");
      hole.tileEl = tileEl;
    }
    alive.push(hole);
  });
  smallBladeHoles = alive;
  ensureSmallBladeHoleFrame();
}

// Restaura todos los huecos y para el ticker (reset completo, p.ej. resetGame
// o justo antes de un corte nuevo para que nunca se acumulen restos).
function clearSmallBladeHoles(preserveDoorHoles = false) {
  if (smallBladeHoleFrame) {
    window.cancelAnimationFrame(smallBladeHoleFrame);
    smallBladeHoleFrame = null;
  }
  smallBladeHoles.forEach((hole) => {
    if (preserveDoorHoles && hole.keepForDoor) return;
    if (hole.tileEl) hole.tileEl.classList.remove("small-blade-cut-hidden");
  });
  smallBladeHoles = preserveDoorHoles ? smallBladeHoles.filter((hole) => hole.keepForDoor) : [];
  ensureSmallBladeHoleFrame();
}

function runSmallBladeCutGroups(groups) {
  if (!groups.length) return Promise.resolve();
  clearSmallBladeHoles();
  // Pagos: la cuchilla y cada simbolo que corta dejan su casilla VACIA para la
  // linea que se evalua tras el corte (ver currentBoardStateForCombinations).
  groups.forEach((group) => {
    if (group.blade && group.blade.cell) smallBladeCutCellIds.add(group.blade.cell.id);
    group.falling.forEach((entry) => {
      if (entry.cell) smallBladeCutCellIds.add(entry.cell.id);
    });
  });
  // Video de la puerta DETRAS del primer simbolo cortado de cada cuchilla
  // (el mas cercano bajo ella; si una cuchilla no corta nada, no hay video).
  // Rects y objetivo de la piedra medidos AHORA (tablero detenido). Primer
  // frame visible justo cuando ese simbolo se oculta y su clon empieza a
  // caer por delante (initialPause + symbolFallDelay + margen; ese simbolo
  // es el primero del escalonado). play() se llama mas abajo, cuando TODOS
  // los simbolos han terminado de caer.
  let doorItems = [];
  if (smallBladeDoorVideo) {
    const cutTiming = smallBladeCut.settings;
    const stoneTarget = smallBladeStoneTargetPoint();
    // Puerta por cuchilla segun cuervos (ver SMALL_BLADE_DOOR_VIDEO_PERCHED_CHANCE).
    // "Posado" se mide ANTES del corte: los cuervos que caen por este mismo
    // corte aun no cuentan.
    const forceDoorVideos = Boolean(state.forceSmallBladeDoorVideosForSpin);
    const crowAlreadyPerched = Boolean(smallBladeBirdPerch) &&
      SMALL_BLADE_BIRD_PERCH_SLOTS.some((slot) => smallBladeBirdPerch.isOccupied(slot.key));
    doorItems = groups.filter((group) => {
      if (economicSpinPlan && economicSpinPlan.kind === "base") {
        const selected = economicSpinPlan.groups.find((g) => g.blade === group.blade.cell.id);
        return Boolean(selected && selected.door);
      }
      if (forceDoorVideos) return true;
      if (group.falling.some((entry) => isCrowSymbol(entry.symbol))) return true;
      if (crowAlreadyPerched) return Math.random() < SMALL_BLADE_DOOR_VIDEO_PERCHED_CHANCE;
      return false;
    }).map((group, doorIndex) => {
      // Ancla: el simbolo cortado mas alto del grupo; si la cuchilla no corta
      // ningun simbolo (fila inferior, columna ya vaciada...), la puerta
      // aparece detras de la PROPIA cuchilla (que tambien cae y deja hueco).
      // Antes estos grupos se descartaban y la puerta "no salia" a veces.
      const firstCut = group.falling.length
        ? group.falling.reduce((top, entry) =>
          (entry.cell.y < top.cell.y ? entry : top))
        : group.blade;
      return {
        rect: firstCut.tileEl.getBoundingClientRect(),
        target: stoneTarget,
        // Objetivo elegido en el instante del lanzamiento (centro / pajaro
        // posado / fallo) segun los pajaros vivos entonces; el impacto en un
        // pajaro dispara su muerte (killBirdWithFall). target queda de reserva.
        resolveThrow: makeSmallBladeStoneThrowResolver(economicSpinPlan && economicSpinPlan.stones[doorIndex]),
        // Anticipacion: camara lenta del lanzamiento si hay un cuervo posado.
        tension: smallBladeStoneHasCrowTarget,
        onTension: setSmallBladeStoneTension,
        // Para enlazar trackHole tras registerSmallBladeHoles (ver abajo).
        tileEl: firstCut.tileEl,
        laneEl: firstCut.reel ? firstCut.reel.laneEl : null
      };
    }).filter(Boolean);
    smallBladeDoorVideo.prepareForCut(
      doorItems,
      // El resalte (highlightHoldMs) retrasa toda la secuencia de caida.
      cutTiming.initialPauseMs + cutTiming.highlightHoldMs +
        cutTiming.symbolFallDelayMs + 30
    );
  }
  const runGroups = groups.map((group) => ({
    bladeTileEl: group.blade.tileEl,
    fallingTileEls: group.falling.map((entry) => entry.tileEl),
    // La rama cuervo recibe un contacto cálido propio en su casilla; no cambia
    // la caída ni el resultado, solo hace legible qué corte activa esa rama.
    crowTileEls: group.falling.filter((entry) => isCrowSymbol(entry.symbol)).map((entry) => entry.tileEl),
    goldenTileEls: group.falling.filter((entry) => entry.symbol === GOLDEN_CROW_SYMBOL).map((entry) => entry.tileEl)
  }));
  const cutEntries = [];
  groups.forEach((group) => {
    cutEntries.push(group.blade);
    group.falling.forEach((entry) => cutEntries.push(entry));
  });
  return smallBladeCut.run(runGroups).then(function () {
    registerSmallBladeHoles(cutEntries);
    // Enlaza cada puerta con su HUECO persistente recien registrado: en el
    // siguiente spin el video lo sigue frame a frame (muelle del arranque
    // incluido), recortado al carril, y se retira justo cuando el hueco
    // expira en el borde de la ventana visible — como un simbolo mas.
    doorItems.forEach(function (item) {
      const hole = smallBladeHoles.find(function (h) { return h.tileEl === item.tileEl; });
      if (!hole) return;
      hole.keepForDoor = true;
      item.trackHole = function () {
        if (smallBladeHoles.indexOf(hole) === -1 || !hole.tileEl) return null;
        const rect = hole.tileEl.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        return {
          rect,
          laneRect: item.laneEl ? item.laneEl.getBoundingClientRect() : null
        };
      };
    });
    // Todos los simbolos han caido: arranca el video del esqueleto (con su
    // sonido); la piedra sale sola en el segundo ~1.9 del video.
    const doorPlayPromise = smallBladeDoorVideo
      ? Promise.resolve(smallBladeDoorVideo.play())
      : Promise.resolve();
    // Por cada simbolo de PAJARO cortado, cae y se posa un pajaro en el
    // rodillo 1 (casilla 1 o 3). Persiste entre spins (SOLO VISUAL).
    const landingPromise = triggerSmallBladeBirdPerch(groups);
    state.forceSmallBladeDoorVideosForSpin = false;
    state.currentPurchasedSpinType = null;
    const selectedPlan = economicSpinPlan;
    return Promise.all([doorPlayPromise, landingPromise]).then(async function () {
      if (!selectedPlan || selectedPlan !== economicSpinPlan) return;
      // Missing/failed media cannot erase a selected crow death or change
      // refill anchors. Successful throws have already applied these slots.
      for (const stone of selectedPlan.stones) {
        if (stone.slot === null) continue;
        const slot = SMALL_BLADE_BIRD_PERCH_SLOTS[stone.slot];
        if (!economicKilledCrowSlots.has(slot.key)) await killBirdWithFall(slot);
        if (!economicKilledCrowSlots.has(slot.key)) throw new Error("Selected crow missing from presentation: " + slot.key);
        stone.cells.forEach((id) => registerDeadCrowWildCell(id, stone.multiplier));
      }
    });
  });
}

// Ejecuta la secuencia si procede (solo spin BASE, nunca en bonus mode ni en la
// gran cuchilla). Promesa que resuelve al terminar, para secuenciar el cierre
// del spin; resuelve de inmediato si no hay cuchilla en el tablero.
function maybeRunSmallBladeCut(spinType) {
  if (spinType !== "BASE" || state.bonusModeActive) return Promise.resolve();
  const groups = collectSmallBladeCutGroups();
  if (!groups.length) {
    if (state.currentPurchasedSpinType === "blade-spin") landPurchasedBladeSpinCrows();
    state.currentPurchasedSpinType = null;
  }
  return runSmallBladeCutGroups(groups);
}

let smallBladeRefillResolvedForSpinId = null;
let smallBladeRefillLastResult = { spinId: null, passCount: 0, cells: [] };

// Compacta cada rodillo en su dirección de giro: los símbolos supervivientes
// ocupan los huecos y los nuevos entran por el borde opuesto. El premio se
// calcula después, sobre este tablero final, en revealWinAndFinish().
function refillSmallBladeCutHoles() {
  const spinId = state.currentSpinId;
  if (
    state.currentSpinType !== "BASE" ||
    state.bonusModeActive ||
    !spinId ||
    smallBladeRefillResolvedForSpinId === spinId
  ) return Promise.resolve([]);
  smallBladeRefillResolvedForSpinId = spinId;
  smallBladeRefillLastResult = { spinId, passCount: 1, cells: [] };

  const cellsToFill = [];
  const cellUpdates = [];
  const visualMoves = [];
  const doorCellIds = new Set(smallBladeHoles.filter((hole) => hole.keepForDoor).map((hole) => hole.cellId));
  state.reels.forEach((reel) => {
    if (reel.pendingGiantSymbol || reel.giantActive || reel.locked || reel.type === "sternum") return;
    const continuation = economicSpinPlan ? Boolean(economicSpinPlan.inline) && reel.id !== "rib1" : reel.isRespin;
    const effectiveSign = continuation ? -reel.scrollSign : reel.scrollSign;
    const ordered = reel.cells.slice().sort((a, b) =>
      (a.x - b.x) * (effectiveSign < 0 ? -1 : 1));
    const cellIndex = (cell) => reel.cells.indexOf(cell);
    const addReplacement = (cell, animated) => {
      const selected = economicSpinPlan && economicSpinPlan.refills && economicSpinPlan.refills.find((x) => x.cellId === cell.id);
      const entry = { reel, cell, index: cellIndex(cell), symbol: selected ? selected.symbol : smallBladeReplacementSymbol(reel) };
      cellsToFill.push(entry);
      cellUpdates.push(entry);
      if (animated) visualMoves.push({ reel, cell, fromCell: null, sourceClone: null });
    };
    const compact = (segment) => {
      if (!segment.some((cell) => smallBladeCutCellIds.has(cell.id))) return;
      const survivors = segment.filter((cell) => !smallBladeCutCellIds.has(cell.id));
      survivors.forEach((source, index) => {
        const target = segment[index];
        if (source === target) return;
        const displayed = smallBladeDisplayedTileForCell(reel, source);
        const symbol = (displayed && displayed.tileEl.dataset.symbol) ||
          reel.currentVisibleSymbols[cellIndex(source)] || source.current || "FEMUR";
        cellUpdates.push({ reel, cell: target, index: cellIndex(target), symbol });
        visualMoves.push({
          reel, cell: target, fromCell: source,
          sourceClone: displayed ? displayed.tileEl.cloneNode(true) : null
        });
      });
      segment.slice(survivors.length).forEach((cell) => addReplacement(cell, true));
    };
    let segment = [];
    ordered.forEach((cell) => {
      // El WILD del cuervo muerto está anclado a su casilla. No lo arrastramos
      // ni dejamos que otros símbolos atraviesen su posición visible.
      if (doorCellIds.has(cell.id)) {
        compact(segment);
        segment = [];
      } else if (deadCrowWildByCellId.has(cell.id)) {
        compact(segment);
        segment = [];
        if (smallBladeCutCellIds.has(cell.id)) addReplacement(cell, false);
      } else {
        segment.push(cell);
      }
    });
    compact(segment);
  });
  smallBladeRefillLastResult.cells = cellsToFill.map(({ reel, cell, symbol }) => ({
    cellId: cell.id,
    reelId: reel.id,
    symbol,
    wildOverlayPreserved: deadCrowWildByCellId.has(cell.id)
  }));

  if (!cellsToFill.length) {
    smallBladeCutCellIds = doorCellIds;
    clearSmallBladeHoles(true);
    return Promise.resolve([]);
  }

  clearSmallBladeHoles(true);
  cellUpdates.forEach(({ reel, cell, index, symbol }) => {
    reel.currentVisibleSymbols[index] = symbol;
    reel.finalSymbols[index] = symbol;
    if (Array.isArray(reel.activeLandingSymbols)) reel.activeLandingSymbols[index] = symbol;
    if (!(reel.finalSymbolMap instanceof Map)) reel.finalSymbolMap = new Map();
    const streamIndex = Math.round(streamIndexAtCell(reel, cell, reel.targetPosition));
    reel.finalSymbolMap.set(streamIndex, symbol);
    setCellSymbol(cell, symbol);
  });
  smallBladeCutCellIds = doorCellIds;

  const changedReels = new Set(cellUpdates.map((entry) => entry.reel));
  changedReels.forEach((reel) => {
    renderReel(reel);
    commitVisibleSymbols(reel, reel.currentVisibleSymbols);
  });

  const animated = visualMoves.map((entry) => {
    const displayed = smallBladeDisplayedTileForCell(entry.reel, entry.cell);
    return displayed ? Object.assign({}, entry, { tileEl: displayed.tileEl }) : null;
  }).filter(Boolean);
  // Tiempo suficiente para leer la compactación y el rebote, tambien en turbo.
  const duration = typeof speedMs === "function" ? Math.max(360, speedMs(620)) : 620;
  return window.OssuarySmallBladeRefill
    ? window.OssuarySmallBladeRefill.animate(animated, duration).then(() => cellsToFill)
    : Promise.resolve(cellsToFill);
}

// Debug: fuerza la secuencia tratando la celda dada como cuchilla, SIN cambiar
// el outcome (solo visual). Util para revisar la animacion sin esperar al RNG.
window.OssuarySmallBladeDebug = {
  triggers: SMALL_BLADE_CUT_TRIGGER_SYMBOLS,
  forceAt: function (reelId, cellId) {
    const reel = state.reels.find((r) => r.id === reelId);
    if (!reel) return "reel no encontrado: " + reelId;
    const cell = cellId ? reel.cells.find((c) => c.id === cellId) : reel.cells[0];
    if (!cell) return "celda no encontrada en " + reelId;
    const blade = smallBladeDisplayedTileForCell(reel, cell);
    if (!blade) return "tile no disponible (rodillo en movimiento?)";
    const bladeEntry = { reel, cell, tileEl: blade.tileEl, poolIndex: blade.poolIndex };
    const falling = [];
    state.reels.forEach((otherReel) => {
      if (!smallBladeReelIsCuttable(otherReel)) return;
      otherReel.cells.forEach((otherCell) => {
        if (otherCell === cell) return;
        if (!(otherCell.y > cell.y)) return;
        if (!smallBladeColumnsOverlap(cell, otherCell)) return;
        const found = smallBladeDisplayedTileForCell(otherReel, otherCell);
        if (found && found.tileEl !== blade.tileEl) {
          falling.push({
            reel: otherReel,
            cell: otherCell,
            tileEl: found.tileEl,
            poolIndex: found.poolIndex,
            symbol: found.tileEl.dataset.symbol || ""
          });
        }
      });
    });
    return runSmallBladeCutGroups([{ blade: bladeEntry, falling }]);
  },
  holes: function () {
    return smallBladeHoles.map((hole) => ({ reel: hole.reel.id, streamIndex: hole.streamIndex }));
  },
  refillState: function () {
    return JSON.parse(JSON.stringify(smallBladeRefillLastResult));
  },
  // Debug aislado: cae un cuervo en un lado AL AZAR del rodillo 1 (igual que el
  // juego real). Si el lado esta libre se posa; si ya hay cuervo, apila y sube
  // el multiplicador (x2, x3...). Clics repetidos demuestran el apilado.
  perchBird: function () {
    if (!smallBladeBirdPerch) return "modulo de pajaro no disponible";
    const slot = SMALL_BLADE_BIRD_PERCH_SLOTS[
      Math.floor(Math.random() * SMALL_BLADE_BIRD_PERCH_SLOTS.length)
    ];
    const wasOccupied = smallBladeBirdPerch.isOccupied(slot.key);
    smallBladeBirdPerch.landBird(slot.key, smallBladeBirdAnchorForCell(slot.cellIndex));
    if (!wasOccupied && window.OssuaryAudio) window.OssuaryAudio.trigger("crow_perch", {});
    return slot.key + " ×" + smallBladeBirdPerch.multiplierAt(slot.key);
  },
  // Debug aislado: los cuervos posados se van volando (lo que pasa al acabar
  // las mini freespins, finishRavenChain).
  birdsFlyAway: function () {
    if (!smallBladeBirdPerch || !smallBladeBirdPerch.flyAway) return "modulo de pajaro no disponible";
    const n = smallBladeBirdPerch.flyAway();
    if (n && window.OssuaryAudio) window.OssuaryAudio.trigger("raven_crows_fly_away", { count: n });
    return n;
  },
  // Debug aislado: caida del pajaro MUERTO (destello + cae dejando copias). Si
  // no hay pajaro posado, posa uno y lo mata tras un instante. Solo visual.
  birdFall: function () {
    if (!smallBladeBirdPerch) return "modulo de pajaro no disponible";
    const occupied = SMALL_BLADE_BIRD_PERCH_SLOTS.filter(
      (s) => smallBladeBirdPerch.isOccupied(s.key)
    );
    if (occupied.length) {
      killBirdWithFall(occupied[0]);
      return occupied[0].key;
    }
    const slot = SMALL_BLADE_BIRD_PERCH_SLOTS[0];
    smallBladeBirdPerch.perchAt(slot.key, smallBladeBirdAnchorForCell(slot.cellIndex));
    window.setTimeout(() => killBirdWithFall(slot), 380);
    return slot.key;
  },
  // Debug aislado: el esqueleto sale de la puerta y tira la piedra (video +
  // piedra al segundo ~1.9), detras de la casilla central del rodillo 1. Solo
  // visual; el objetivo se elige segun los pajaros vivos (centro/pajaro/fallo).
  stoneThrow: function () {
    if (!smallBladeDoorVideo) return "modulo de puerta no disponible";
    const rib1 = (state.reels || []).find((r) => r.id === "rib1");
    if (!rib1 || !Array.isArray(rib1.cells) || !rib1.cells.length) return "rib1 no disponible";
    const cell = rib1.cells[Math.floor(rib1.cells.length / 2)];
    if (!cell || !cell.el) return "celda no disponible";
    const rect = cell.el.getBoundingClientRect();
    if (!rect.width || !rect.height) return "sin geometria (rodillo en movimiento?)";
    smallBladeDoorVideo.prepareForCut([{
      rect,
      target: smallBladeStoneTargetPoint(),
      resolveThrow: makeSmallBladeStoneThrowResolver()
    }], 0);
    window.setTimeout(() => smallBladeDoorVideo.play(), 140);
    return "ok";
  },
  clear: function () {
    clearSmallBladeHoles();
    if (smallBladeDoorVideo) smallBladeDoorVideo.clear();
    clearCrowLandTimers();
    if (smallBladeBirdPerch) smallBladeBirdPerch.clear();
    return smallBladeCut.clear();
  }
};

// Hooks reales del Ruleta Game (src/ruleta/ruleta-game.js): apuesta actual,
// pago via payment-engine (con paymentId propio, protegido contra dobles
// pagos) y entrada directa al Bonus Game FREE SPIN. El modulo de la ruleta
// nunca toca balance/estado por su cuenta.
if (window.OssuaryRuletaGame) {
  window.OssuaryRuletaGame.configure({
    getBet: () => currentBet(),
    payWin: (amount, source, token) => {
      if (economicWheelPlan) {
        const entry = economicWheelPlan.credits[0];
        if (!entry) return {applied:false,reason:"no_cash_prize"};
        if (!token || token.roundId !== entry.roundId || token.paymentId !== entry.paymentId ||
          !economicRounds.current() || economicRounds.current().id !== token.roundId) {
          return {applied:false,reason:"unselected_or_stale_wheel_credit"};
        }
        const result = revealEconomicPayment(entry.paymentId);
        render();
        return result || {applied:false,reason:"duplicate_payment"};
      }
      return {applied:false,reason:"unselected_or_stale_wheel_credit"};
    },
    showWinCounter: (amount, bet) => bigWinCounter.show(amount, bet || currentBet()),
    capturePayment: () => {
      const entry = economicWheelPlan && economicWheelPlan.credits[0];
      return entry ? {roundId:entry.roundId,paymentId:entry.paymentId} : null;
    },
    selectPrize: () => {
      economicWheelPlan = takeEconomicPlan("gamble");
      publishEconomicPlan(economicWheelPlan);
      const prize = Object.assign({}, economicWheelPlan.prize);
      if (!prize.bonus) prize.multiplier = economicWheelPlan.credits[0].amount / currentBet();
      return prize;
    },
    selectCollect: () => {
      economicWheelPlan = takeEconomicPlan("collect");
      publishEconomicPlan(economicWheelPlan);
      return economicWheelPlan.credits[0].amount;
    },
    shouldOpen: () => pendingEconomicPresentation() === "wheel",
    getProgress: () => economicSelectedProgress || economicModel.bank(),
    // Llave roja: Execution Bonus con el mismo video de entrada que en el
    // juego. Llave negra: el SUPER BONUS "El Juicio" (el encapuchado cae al
    // esternon, video de entrada y PLAY).
    enterFreeSpins: () => enterRuletaBonusWithIntro("BONUS"),
    enterSuperBonus: () => enterElJuicioWithFall("ruleta"),
    onClosed: (info) => handleRuletaClosed(info)
  });
}

// Pausa del juego base mientras el cofre/ruleta esta en marcha (bug: con
// autoplay, las tiradas seguian por debajo de la ruleta). Mientras
// isRuletaActive(), ni autoplay (scheduleAutoSpin), ni SPIN (startSpin), ni
// compras (buyBonusOption). Al cerrarse la ruleta:
// - x0 / x25 / COLLECT: el juego base sigue donde estaba (autoplay incluido).
// - BONUS GAME: entrar al Execution Bonus apaga el autoplay; se guarda aqui y
//   se recupera cuando ese bonus termina (handleBonusNextAction).
let ruletaBonusAutoResume = null;

function isRuletaActive() {
  const ruleta = window.OssuaryRuletaGame;
  return Boolean(ruleta && typeof ruleta.isActive === "function" && ruleta.isActive());
}

function handleRuletaClosed(info) {
  if (info && info.nextMode === "bonus") {
    ruletaBonusAutoResume = state.auto ? { remaining: state.autoSpinsRemaining } : null;
    return;
  }
  render();
  // COLLECT closes its presentation immediately before issuing its credit.
  // Let that synchronous credit finish before closing the economic root.
  Promise.resolve().then(scheduleAutoSpin);
}

// --- SUPER BONUS "El Juicio" -------------------------------------------------
// Peticion del usuario (2026-10-17, "hazlo todo"): cambia reglas de bonus
// (terreno de Codex), apuntado en PROJECT_STATE.md. Reglas en
// src/bonus/el-juicio-engine.js (numeros en src/config/el-juicio.config.js) y
// puesta en escena en src/fx/el-juicio.js, que dibuja su propio tablero encima
// de los rodillos (como la ruleta). Aqui solo la entrada, el pago y la vuelta.
//
// Entradas: (1) al completarse la cadena del Execution Bonus el encapuchado
// amaga (handleBonusNextAction) y, con EL_JUICIO_CONFIG.superChance, cae al
// esternon: Super en vez de Execution; (2) la llave negra de la ruleta; (3)
// debug. Despues de la caida el cartel THE JUDGMENT · Superbonus que cae
// (sin video desde 2026-10-18) se queda con el PLAY (bonusIntroContinueBtn)
// debajo, que arranca el Super.
const EL_JUICIO_CONFIG = window.OSSUARY_EL_JUICIO_CONFIG || null;
// Debug: lo que hara el encapuchado en la proxima cadena completa
// ("super" cae, "tease" amaga sin caer, null = al azar).
let elJuicioDebugNext = null;
// Autoplay que habia al entrar (se retoma al cerrar el resumen).
let elJuicioAutoResume = null;
let elJuicioWin = null;
// El encapuchado que se esta decidiendo en la tirada que completo la cadena
// (startElJuicioChain): { spinId, promise -> cae (true) o no }.
let elJuicioChain = null;
let purchasedExecutionEntryPending = false;

function isElJuicioActive() {
  const juicio = window.OssuaryElJuicio;
  return Boolean(juicio && juicio.isActive());
}

// Deja el juego quieto y limpio para el Super (la cadena del Execution o el
// cofre ya no siguen): sin locks, sin bonus pendiente, ocupado hasta el final.
function prepareElJuicioEntry(reason) {
  if (economicRounds.current() && pendingEconomicPresentation() === "judgment") selectEconomicJudgment();
  clearAutoTimer();
  hideBonusIntroModal();
  if (elJuicioAutoResume === null) {
    elJuicioAutoResume = ruletaBonusAutoResume || (state.auto ? { remaining: state.autoSpinsRemaining } : null);
  }
  ruletaBonusAutoResume = null;
  state.auto = false;
  bonusFeature.reset();
  clearBonusLocks();
  state.bonusModePendingType = null;
  state.currentSpinType = "BASE";
  state.busy = true;
  setGameStatus(GAME_STATES.SUPER_BONUS_MODE_PENDING, reason || "el_juicio_entry");
}

function showElJuicioIntro(source) {
  showBonusIntroModal({
    type: "SUPER_BONUS",
    source: source || "game",
    label: "SUPER BONUS",
    awardedSpins: EL_JUICIO_CONFIG ? EL_JUICIO_CONFIG.tolls : 13,
    unit: "BELLS",
    // Sin video ni titulo (peticion del usuario, 2026-10-18): el cartel que
    // acaba de caer con el PLAY debajo (showBonusIntroPoster).
    poster: "judgment"
  });
  render();
}

// Ruleta y debug: el encapuchado cae sin amago y sale la entrada.
function enterElJuicioWithFall(source) {
  if (!window.OssuaryElJuicio || !EL_JUICIO_CONFIG) return enterRuletaBonusWithIntro("SUPER_BONUS");
  if (state.spinning || (state.busy && source !== "chain") || isElJuicioActive()) return false;
  prepareElJuicioEntry("el_juicio_fall_" + source);
  render();
  window.OssuaryElJuicio.playHoodFall().then(function () {
    showElJuicioIntro(source);
  });
  return true;
}

function selectEconomicJudgment() {
  const round = economicRounds.current();
  if (!round) return null;
  if (economicJudgmentPlan && economicJudgmentPlan.roundId === round.id) return economicJudgmentPlan;
  elJuicioEconomicPayment = { roundId: round.id, paymentId: round.id + ":judgment-" + (++economicFeatureSequence) };
  economicJudgmentPlan = takeEconomicPlan();
  if (economicJudgmentPlan.kind !== "judgment") throw new Error("Unexpected judgment transition");
  publishEconomicPlan(economicJudgmentPlan);
  return economicJudgmentPlan;
}

// PLAY consumes the selected replay. The fall and this button cannot change money.
function startElJuicio(source) {
  if (!selectEconomicJudgment()) return false;
  elJuicioWin = 0;
  state.win = 0;
  resetHudBaseWin();
  bigWinCounter.hide();
  if (!window.OssuaryElJuicio.start({ source: source })) {
    finishElJuicioCleanup();
    state.busy = false;
    render();
    scheduleAutoSpin();
    return false;
  }
  render();
  return true;
}

// Fin del Super (src/fx/el-juicio.js#run): paga, deja el total en el WIN y
// sale el resumen del altar; al cerrarlo, vuelta al juego base.
function finishElJuicio(result) {
  const activeRound = economicRounds.current();
  if (economicJudgmentPlan) {
    if (!activeRound || economicJudgmentPlan.roundId !== activeRound.id || finishedEconomicJudgment === activeRound.id) return;
    finishedEconomicJudgment = activeRound.id;
    economicJudgmentPlan.credits.forEach((entry) => revealEconomicPayment(entry.paymentId));
  }
  const total = Math.max(0, Math.round(((result && result.total) || 0) * 100) / 100);
  elJuicioWin = total;
  if (total > 0) {
    if (!economicJudgmentPlan) {
    const stamp = elJuicioEconomicPayment && elJuicioEconomicPayment.paymentId;
    paymentEngine.applyPayment({
      paymentId: stamp,
      spinId: stamp,
      roundId: elJuicioEconomicPayment && elJuicioEconomicPayment.roundId,
      totalWin: total,
      bet: currentBet(),
      context: { spinType: "BONUS", source: "super_bonus_el_juicio" }
    });
    }
  }
  render();
  if (window.OssuaryBonusSummary) {
    bonusSummaryOpen = true;
    state.bonusReturnRestored = false;
    bigWinCounter.hide();
    window.OssuaryBonusSummary.show({
      kind: "super",
      total: total,
      bet: currentBet(),
      spins: result ? result.spins : 0,
      auto: Boolean(elJuicioAutoResume),
      onRestore: finishElJuicioCleanup
    }).then(function () {
      bonusSummaryOpen = false;
      state.busy = false;
      render();
      scheduleAutoSpin();
    });
  } else {
    finishElJuicioCleanup();
    state.busy = false;
    render();
    scheduleAutoSpin();
  }
}

function finishElJuicioCleanup() {
  if (window.OssuaryElJuicio) {
    window.OssuaryElJuicio.close();
    window.OssuaryElJuicio.resetEntry();
  }
  // El total se queda a la vista como premio de la ultima jugada.
  hudBaseWin = elJuicioWin || 0;
  hudBaseWinIsBig = false;
  elJuicioWin = null;
  state.currentSpinType = "BASE";
  setGameStatus(GAME_STATES.IDLE, "el_juicio_completed");
  if (elJuicioAutoResume) {
    state.auto = true;
    state.autoSpinsRemaining = elJuicioAutoResume.remaining;
  }
  elJuicioAutoResume = null;
  restoreBaseReelsAfterBonus("super");
}

// Salida de modos completos. No usa clearBonusLocks(): ese camino conserva
// gigantes para el siguiente giro de una cadena, incluidos los esqueletos.
// Aqui se reconstruyen solo los rodillos contaminados, sin sortear ni pagar.
function restoreBaseReelsAfterBonus(kind) {
  clearAutoTimer();
  const fullBonus = kind !== "raven";
  const temporary = new Set(FREE_SPIN_RIB_SYMBOLS.concat(BONUS_MODE_STERNUM_SYMBOLS));
  if (fullBonus) {
    temporary.add("RIB_BONUS");
    temporary.add("STERNUM_BONUS");
    bonusFeature.reset();
    state.bonusModePendingType = null;
    state.bonusModeCutPendingRelease = false;
    clearBonusModeBladePayoutState();
    clearBonusModeSternumPresentationState();
    resetBonusModeHandCutState();
    resetBonusHandBoxState();
    stopAllBladeBonusMedia();
    cleanupGuadanaTransientFx();
    clearBonusFxLayers();
    resetSuperBonusTransition();
    resetRespinStructureSwell();
    if (bonusLaneFog) bonusLaneFog.clear();
    state.bonusModeBoardBlank = false;
  }
  state.reels.forEach(function (reel) {
    const symbols = [reel.giantSymbol, reel.currentVisibleGiantSymbol, reel.activeLandingGiantSymbol,
      reel.pendingGiantSymbol, reel.lockedSymbol, reel.carryGiantBlock && reel.carryGiantBlock.symbol]
      .concat(reel.lockedGiantBlock && reel.lockedGiantBlock.symbol, reel.cells.map((cell) => cell.effective), reel.cells.map((cell) => cell.current))
      .concat(reel.finalSymbols || [], reel.currentVisibleSymbols || [], reel.pendingFinalSymbols || [], reel.activeLandingSymbols || [])
      .concat(Array.from(reel.loopSymbolMap.values()), Array.from(reel.finalSymbolMap.values()));
    if (symbols.some((symbol) => temporary.has(symbol)) || (fullBonus && reel.rib1BonusVacant)) {
      (reel.giantPool || []).forEach(function (el) {
        resetGiantElementTransientState(el);
        if (el.getAnimations) el.getAnimations({ subtree: true }).forEach((anim) => anim.cancel());
      });
      resetReelToInitial(reel);
    }
  });
  if (fullBonus) {
    state.currentSpinType = "BASE";
    setGameStatus(GAME_STATES.IDLE, "bonus_return_restored");
    syncBonusBoardBlankMode();
    syncBonusBackgroundVideo();
    emitBonusLockUpdated();
  }
  renderAllReels();
  state.bonusReturnRestored = true;
  render();
  // Se restauran bajo negro: entran con el tablero durante el fundido.
  if (smallBladeBirdPerch) smallBladeBirdPerch.setBonusSuspended(false);
}

// Cadena del Execution completa: el encapuchado amaga y quiza cae. Devuelve
// true si se encarga (y llama a onExecution si al final es el Execution).
// SUPER BONUS "El Juicio" (peticion del usuario, 2026-10-18): en la misma
// tirada en que se completa la cadena (para el BONUS de rib3) el esternon no
// se para: se oscurece y sigue girando con latidos (src/fx/el-juicio-fall.js
// #beginDark) mientras paran los demas, y al acabar la tirada se decide ahi
// mismo si cae el encapuchado (maybePlayElJuicioTease). Solo presentacion: el
// esternon real sigue su tirada debajo, tapado.
function syncElJuicioDarkSternum(reel) {
  if (purchasedExecutionEntryPending) return;
  const fall = window.OssuaryElJuicioFall;
  if (!fall || !fall.beginDark || !window.OssuaryElJuicio || !EL_JUICIO_CONFIG || isElJuicioActive()) return;
  if (state.bonusModeActive || stopSequenceTierForReel(reel) !== "rib3" || reel.giantSymbol !== "RIB_BONUS") return;
  const chainComplete = state.reels.every((item) => {
    const tier = stopSequenceTierForReel(item);
    if (tier !== "rib1" && tier !== "rib2" && tier !== "rib3") return true;
    return (item.locked || item.phase === "stopped") && (item.giantSymbol === "RIB_BONUS" || item.lockedSymbol === "RIB_BONUS");
  });
  if (!chainComplete) return;
  const sternum = reelByIdForLock("sternum");
  if (!sternum || sternum.phase === "stopped" || sternum.phase === "idle") return;
  if (fall.beginDark()) startElJuicioChain();
}

// En ese mismo momento se decide (mismas probabilidades que antes al acabar la
// tirada) y empieza: el encapuchado amaga y cae o no, o, sin amago, solo la
// intriga a oscuras. handleBonusNextAction espera a saberlo para la entrada.
function startElJuicioChain() {
  const forced = elJuicioDebugNext;
  elJuicioDebugNext = null;
  const superBonus = forced ? forced === "super" : economicSpinPlan ? economicSpinPlan.nextFeature === "judgment" : rngEngine.chance(EL_JUICIO_CONFIG.superChance);
  const tease = superBonus || forced === "tease" || Math.random() < EL_JUICIO_CONFIG.teaseChance;
  const promise = tease
    ? window.OssuaryElJuicio.playHoodTease({ fall: superBonus, quick: true, leadMs: speedMs(320) })
    : window.OssuaryElJuicioFall.intrigue(speedMs(1150));
  elJuicioChain = {
    spinId: state.currentSpinId,
    promise: Promise.resolve(promise).then(Boolean, function () { return false; })
  };
}

function maybePlayElJuicioTease(onExecution) {
  if (!window.OssuaryElJuicio || !EL_JUICIO_CONFIG) return false;
  const forced = elJuicioDebugNext;
  elJuicioDebugNext = null;
  const superBonus = forced ? forced === "super" : economicSpinPlan ? economicSpinPlan.nextFeature === "judgment" : rngEngine.chance(EL_JUICIO_CONFIG.superChance);
  const tease = superBonus || forced === "tease" || Math.random() < EL_JUICIO_CONFIG.teaseChance;
  const fall = window.OssuaryElJuicioFall;
  if (!tease) {
    // Sin amago: el esternon a oscuras frena y sigue el Execution.
    if (fall && fall.endDark) fall.endDark();
    return false;
  }
  // Si el esternon ya gira a oscuras desde la tirada, el amago empieza enseguida.
  const darkAlready = Boolean(fall && fall.isDark && fall.isDark());
  // De seguido (peticion del usuario, 2026-10-17): el esternon sigue girando a
  // oscuras desde ya y el encapuchado empieza a tambalearse al poco
  // (leadMs), mientras cae la guillotina de rib1.
  window.OssuaryElJuicio.playHoodTease({ fall: superBonus, leadMs: speedMs(darkAlready ? 250 : 900) }).then(function (fell) {
    if (!fell) {
      onExecution();
      return;
    }
    prepareElJuicioEntry("el_juicio_chain_fall");
    showElJuicioIntro("chain");
  });
  return true;
}

if (window.OssuaryElJuicio) {
  window.OssuaryElJuicio.init({
    getBet: () => currentBet(),
    render: () => render(),
    speedMs: (ms) => speedMs(ms),
    // Outcome comes from createEngine's replay. These draws only stage the
    // unchanged nest anticipation and must not advance the economic stream.
    random: () => Math.random(),
    createEngine: () => window.OssuaryElJuicioEngine.replay(economicJudgmentPlan.record, EL_JUICIO_CONFIG),
    // La Sentencia saca los premios grandes con el contador BIG WIN.
    showWinCounter: (amount) => bigWinCounter.show(amount, currentBet()),
    onFinish: (result) => finishElJuicio(result)
  });
}

function setReelPhase(reel, phase) {
  reelRenderer.setReelPhase(reel, phase);
  syncGoldenCrowIdle(reel, phase === "stopped");
}

function createCellElement(cell, reel) {
  reelRenderer.createCellElement(cell, reel);
}

function createReelLane(reel) {
  reelRenderer.createReelLane(reel);
}

function createContinuousReelTrack(reel) {
  reelRenderer.createContinuousReelTrack(reel);
}

function assignContinuousCellBounds(reel) {
  reelRenderer.assignContinuousCellBounds(reel);
}

function createGiantStripTrack(reel) {
  giantSymbolRenderer.createGiantStripTrack(reel);
}

const reelModel = window.OssuaryReelModel.create({
  layout: {
    RIB_LAYOUT,
    STERNUM_LAYOUT
  },
  config: {
    DECELERATION_TIME,
    VISIBLE_TILE_RADIUS
  },
  state,
  hooks: {
    buildFinalSymbolMap,
    clearGiantPool,
    setReelPhase,
    renderReel,
    commitVisibleSymbols
  }
});

function makeReel(config, index, type) {
  return reelModel.makeReel(config, index, type);
}

function buildReels() {
  reelModel.buildReels();
}

function createReelCells() {
  reelLayer.replaceChildren();
  buildReels();

  for (const reel of state.reels) {
    assignContinuousCellBounds(reel);
    createReelLane(reel);
    for (const cell of reel.cells) {
      createCellElement(cell, reel);
    }
    createContinuousReelTrack(reel);
    createGiantStripTrack(reel);
    resetReelToInitial(reel);
  }
}

function resetReelToInitial(reel) {
  reelModel.resetReelToInitial(reel);
}

function resetReelMotion() {
  reelModel.resetReelMotion();
}

function resetCellsToReference() {
  reelModel.resetCellsToReference();
}

function reelByIdForLock(reelId) {
  return state.reels.find((reel) => reel.id === reelId) || null;
}

function emitBonusLockUpdated() {
  if (!window.OssuaryFX) return;
  const lockedReelsList = state.reels.filter((reel) => reel.locked);
  window.OssuaryFX.trigger("bonus:lock-updated", {
    lockedCount: lockedReelsList.length,
    lockedReels: lockedReelsList.map((reel) => reel.id),
    lockedRibCount: lockedReelsList.filter((reel) => reel.type === "rib").length,
    sternumLocked: lockedReelsList.some((reel) => reel.type === "sternum")
  });
}

// Detecta desincronizacion entre estado real de lock/giant y su representacion
// visual derivada (giantActive / clase CSS has-giant-symbol). Solo loguea: no
// repara nada por si solo, para no enmascarar la causa real si reaparece.
function validateGiantSymbolSync(reel, moment) {
  if (!reel) return;
  const hasLockedBlock = Boolean(reel.lockedGiantBlock);
  const giantActive = Boolean(reel.giantActive);
  const expectedGiantActive = hasLockedBlock || Boolean(reel.giantSymbol);
  const cssActive = reel.laneEl ? reel.laneEl.classList.contains("has-giant-symbol") : null;
  const snapshot = {
    moment: moment,
    reelId: reel.id,
    locked: Boolean(reel.locked),
    lockedGiantBlock: hasLockedBlock,
    giantSymbol: reel.giantSymbol || null,
    giantActive: giantActive,
    cssHasGiantSymbol: cssActive
  };

  if (reel.locked !== hasLockedBlock || giantActive !== expectedGiantActive || (cssActive !== null && cssActive !== giantActive)) {
    console.error("[GiantSync] desync detectado", snapshot);
  }
}

function applyBonusLocks(lockedReels, lockedSymbols = {}) {
  const newlyLockedReels = [];
  for (const reelId of lockedReels || []) {
    const reel = reelByIdForLock(reelId);
    const wasAlreadyLocked = Boolean(reel && reel.locked);
    const fallbackSymbol = reel && reel.type === "sternum" ? STERNUM_GIANT_SYMBOL : "RIB_BONUS";
    const symbol = lockedSymbols[reelId] || fallbackSymbol;
    if (reel && reel.id === "rib1" && symbol === "RIB_BONUS") {
      reel.rib1BonusVacant = false;
    }
    // Una guillotina de amago a medias no sobrevive a un bloqueo.
    if (reel) reel.teaseGiantBlocks = null;
    if (!reelModel.applyReelLock(reel, symbol)) continue;
    renderGiantBlocks(reel);
    validateGiantSymbolSync(reel, "applyBonusLocks");
    if (!wasAlreadyLocked && reel.type === "rib" && window.OssuaryFX) {
      window.OssuaryFX.trigger("bonus:rib-locked", { reelId });
    }
    if (!wasAlreadyLocked && window.OssuaryAudio) {
      window.OssuaryAudio.trigger("bonus_lock", { reelId, reelType: reel ? reel.type : null });
    }
    if (!wasAlreadyLocked) {
      newlyLockedReels.push(reelId);
    }
  }
  if ((state.currentSpinType === "BONUS" || isInlineRib1BonusContinuationActive()) && newlyLockedReels.length) {
    triggerRespinLockStructureReaction(newlyLockedReels);
  }
  emitBonusLockUpdated();
}

function triggerRespinLandingFlash(reel) {
  if (!reel) return;
  const tier = stopSequenceTierForReel(reel);
  if (tier !== "rib2" && tier !== "rib3") return;
  // Impacto sonoro al aparecer el simbolo de bonus en rib2/rib3 (el cooldown
  // del sonido evita el doble disparo de las dos mitades del mismo rodillo).
  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger("bonus_symbol_landed_rib23", { reelId: reel.id, tier });
  }
  const targets = [reel.laneEl, reel.continuousTrackEl, reel.giantStripEl].filter(Boolean);
  targets.forEach(function (el) {
    el.classList.remove("bonus-respin-flash");
    void el.offsetWidth;
    el.classList.add("bonus-respin-flash");
  });
  const symbolTargets = (reel.giantPool || []).filter(function (el) {
    return el && !el.hidden;
  });
  symbolTargets.forEach(function (el) {
    el.classList.remove("bonus-respin-symbol-flash");
    void el.offsetWidth;
    el.classList.add("bonus-respin-symbol-flash");
  });
  if (reel.respinFlashTimer) {
    window.clearTimeout(reel.respinFlashTimer);
  }
  reel.respinFlashTimer = window.setTimeout(function () {
    targets.forEach(function (el) {
      el.classList.remove("bonus-respin-flash");
    });
    symbolTargets.forEach(function (el) {
      el.classList.remove("bonus-respin-symbol-flash");
    });
    reel.respinFlashTimer = 0;
  }, 200);
}

function triggerBackgroundBonusFlash() {
  if (!slotStage) return;
  if (!triggerBackgroundBonusFlash.overlayEl) {
    const overlayEl = document.createElement("div");
    overlayEl.className = "bonus-background-flash-overlay";
    slotStage.appendChild(overlayEl);
    triggerBackgroundBonusFlash.overlayEl = overlayEl;
  }
  const overlayEl = triggerBackgroundBonusFlash.overlayEl;
  if (triggerBackgroundBonusFlash.animation) {
    triggerBackgroundBonusFlash.animation.cancel();
  }
  triggerBackgroundBonusFlash.animation = overlayEl.animate([
    {
      opacity: 0,
      filter: "brightness(1.02)"
    },
    {
      opacity: 0.58,
      filter: "brightness(1.18)",
      offset: 0.24
    },
    {
      opacity: 0.24,
      filter: "brightness(1.1)",
      offset: 0.58
    },
    {
      opacity: 0,
      filter: "brightness(1.01)"
    }
  ], {
    duration: 260,
    easing: "cubic-bezier(0.2, 0.62, 0.24, 1)",
    fill: "forwards"
  });
}

function isBaseRib1BonusVisible() {
  const reel = reelByIdForLock("rib1");
  if (!reel || state.bonusModeActive || state.currentSpinType !== "BASE") return false;
  return Boolean(
    !reel.locked &&
    reel.giantSymbol === "RIB_BONUS" &&
    Array.isArray(reel.giantPool) &&
    reel.giantPool.some(function (el) {
      return el && !el.hidden && el.dataset && el.dataset.symbol === "RIB_BONUS";
    })
  );
}

function syncStageModeClasses() {
  if (!stage) return;
  stage.classList.toggle("bonus-mode-board-blank", Boolean(state.bonusModeBoardBlank));
  stage.classList.toggle(
    "bonus-mode-normal-active",
    Boolean((state.bonusModeActive && state.bonusModeType === "NORMAL_BONUS") || (state.bonusModeBoardBlank && bonusSummaryOpen))
  );
  stage.classList.toggle("base-rib1-bonus-visible", isBaseRib1BonusVisible());
  applyBonusModeSternumLightState();
}

function clearRib1VisibleSymbols(reel) {
  reel.finalSymbols = reel.cells.map(() => "");
  reel.currentVisibleSymbols = reel.finalSymbols.slice();
  reel.currentVisibleGiantSymbol = null;
  reel.pendingFinalSymbols = null;
  reel.pendingGiantSymbol = null;
  reel.activeLandingSymbols = null;
  reel.activeLandingGiantSymbol = null;
  buildFinalSymbolMap(reel, reel.targetPosition);
  commitVisibleSymbols(reel, reel.finalSymbols);
  renderReel(reel);
}

function carryVisibleGiantIntoNextSpin(reel) {
  const refPosition = reel.targetPosition || reel.position || 0;
  reelModel.releaseLockKeepGiant(reel);
  reel.carryGiantBlock = reel.giantSymbol
    ? { refPosition: refPosition, size: reel.cells.length, symbol: reel.giantSymbol }
    : null;
}

function clearRib1LockForReturnToBase(reel) {
  spawnRib1BonusFallAway(reel);
  reel.rib1BonusVacant = true;
  reelModel.clearReelLock(reel);
  clearRib1VisibleSymbols(reel);
}

function triggerRib1ModePendingBladeDrop() {
  const reel = reelByIdForLock("rib1");
  if (!reel || !reel.lockedGiantBlock || reel.lockedSymbol !== "RIB_BONUS") return false;
  spawnRib1BonusFallAway(reel);
  return true;
}

function releaseRib1LockForModePending() {
  const reel = reelByIdForLock("rib1");
  if (!reel || !reel.lockedGiantBlock) return false;
  clearRib1LockForReturnToBase(reel);
  renderGiantBlocks(reel);
  validateGiantSymbolSync(reel, "releaseRib1LockForModePending");
  emitBonusLockUpdated();
  return true;
}

// Solo termina el LOCK (logico ya lo resuelve bonusFeature.clearHeldLocks,
// este resuelve el visual): el simbolo gigante NO se borra ni se reemplaza
// por placeholder. Queda como reel.carryGiantBlock (mismo mecanismo que usa
// prepareReelStops para un giant "de paso") asi el siguiente spin lo
// desliza/saca con la fisica normal del reel en vez de desaparecer antes de
// que el reel empiece a moverse.
function releaseFailedChainLocks() {
  for (const reel of state.reels) {
    if (!reel.locked) continue;
    carryVisibleGiantIntoNextSpin(reel);
    renderGiantBlocks(reel);
    validateGiantSymbolSync(reel, "releaseFailedChainLocks");
  }
  emitBonusLockUpdated();
}

// A peticion del usuario: cuando la cadena de recoleccion BONUS termina de
// verdad (clearBonusLocks, solo se llama en el camino returnToBase, nunca si
// rib2/rib3 acaban de bloquearse en este mismo respin), el arte de rib1 no
// desaparece de golpe: cae hacia abajo hasta salir por completo de la
// pantalla (no solo del tablero) y se desvanece, en ~1.5s bien visibles. Se
// clona como una imagen suelta anclada a document.body con position:fixed
// (coordenadas de viewport, las mismas que ya da getBoundingClientRect) en
// vez de animar el elemento real del pool o anclarla dentro de
// #structureOverlay/#slotStage: ambos tienen overflow:hidden (el primero
// ajustado al tamaño exacto del simbolo, el segundo al tablero completo) y
// recortarian la caida mucho antes de llegar al borde real de la pantalla.
// El clon es puramente cosmetico (no toca reel/model/pool): el elemento real
// se sigue ocultando al instante exactamente igual que antes (ver mas abajo),
// la ilusion de continuidad la da el clon por encima de todo (z-index
// maximo).
function spawnRib1BonusFallAway(reel) {
  if (!reel.giantPool) return;
  const sourceEl = reel.giantPool.find((el) => !el.hidden);
  const sourceImg = sourceEl && sourceEl.querySelector("img");
  if (!sourceEl || !sourceImg) return;
  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger("rib1_blade_fall", {});
  }

  const elRect = sourceEl.getBoundingClientRect();
  // Distancia justa para que el clon termine completamente por debajo del
  // borde inferior real de la ventana, sea cual sea el tamaño de pantalla.
  const fallDistance = window.innerHeight - elRect.top + elRect.height;

  // El clon se coloca sobre el dibujo REAL (caja del <img> con su transform:
  // escala y subida dentro de la casilla), no sobre la caja de la casilla. La
  // casilla es mas baja que el dibujo (102 de 126 px) y con object-fit: cover
  // el clon cortaba la parte de abajo de la cuchilla al caer.
  const imgRect = sourceImg.getBoundingClientRect();
  const cloneRect = imgRect.width > 0 && imgRect.height > 0 ? imgRect : elRect;
  const cloneFallDistance = window.innerHeight - cloneRect.top + cloneRect.height;

  const clone = document.createElement("div");
  clone.className = "rib1-bonus-fallaway";
  clone.style.left = cloneRect.left + "px";
  clone.style.top = cloneRect.top + "px";
  clone.style.width = cloneRect.width + "px";
  clone.style.height = cloneRect.height + "px";
  clone.style.setProperty("--fallaway-distance", cloneFallDistance + "px");

  const cloneImg = document.createElement("img");
  cloneImg.className = "rib1-bonus-fallaway__img";
  cloneImg.src = sourceImg.src;
  cloneImg.alt = "";
  clone.appendChild(cloneImg);
  document.body.appendChild(clone);

  const cleanup = function () {
    if (clone.parentNode) clone.parentNode.removeChild(clone);
  };
  clone.addEventListener("animationend", cleanup);
  window.setTimeout(cleanup, 2000);

  scheduleLockedRibInnerHalfCuts(elRect, fallDistance);
  scheduleVisibleFreeSpinOverlayCuts(elRect, fallDistance);
}

// Solo debug (boton "RIB1 rope rig preview"): guillotina colgada de dos
// cuerdas. Un unico valor animado en CSS (--rib1-rig-drop, ver style.css)
// gobierna a la vez el translateY de la pieza y la longitud (height) de las
// cuerdas, de modo que geometricamente no pueden separarse nunca: la punta
// de la cuerda acaba siempre exactamente donde empieza la pieza. Al animar
// la longitud (y no un scaleY), la textura del trenzado mantiene su densidad
// natural: la cuerda se "suelta" desde el anclaje como una cuerda real en
// vez de estirarse como una goma. Aqui solo se monta el DOM del clon y se
// miden distancias.
// options.driven (Execution Bonus, 2026-10-16): la caida la mueve
// src/fx/guillotine-drop.js (sin animacion CSS ni sonido aqui; quien llama
// quita el rig al acabar) y options.cleanupMs es su red de seguridad.
function spawnRib1BladeRigPreview(reel, options = {}) {
  if (!reel || !reel.giantPool) return false;
  const sourceEl = reel.giantPool.find((el) => !el.hidden);
  const sourceImg = sourceEl && sourceEl.querySelector("img");
  if (!sourceEl || !sourceImg) return false;

  // La pieza debe caer EXACTAMENTE desde donde se ve el arte en la casilla.
  // El contenedor giant-strip-symbol NO sirve para eso: su caja
  // (getBoundingClientRect) queda desplazada respecto al arte, porque la
  // imagen lleva un transform propio que la escala/sube dentro del hueco de
  // la costilla. Anclamos por tanto a la caja VISIBLE real de la imagen
  // (sourceImg.getBoundingClientRect()), no a la del contenedor: asi el clon
  // arranca clavado sobre el original, sin salto. Solo esta preview cambia;
  // spawnRib1BonusFallAway (flujo real) sigue midiendo lo que ya media.
  const artRect = sourceImg.getBoundingClientRect();
  const anchorGap = 8;
  const ropeTop = Math.max(12, Math.round(artRect.top - anchorGap));
  const bladeStartY = Math.round(artRect.top - ropeTop);
  const rib5Bottom = ["rib5-left", "rib5-right"].reduce((maxBottom, reelId) => {
    const ribReel = reelByIdForLock(reelId);
    const laneRect = ribReel && ribReel.laneEl && ribReel.laneEl.getBoundingClientRect
      ? ribReel.laneEl.getBoundingClientRect()
      : null;
    return laneRect ? Math.max(maxBottom, laneRect.bottom) : maxBottom;
  }, artRect.bottom);
  const bladeTargetBottom = rib5Bottom + 40;
  const bladeDropDistance = Math.max(
    0,
    Math.round(bladeTargetBottom - artRect.bottom)
  );
  // A peticion del usuario: el anclaje superior de la cuerda nace por debajo
  // del borde del rig (3 -> 7, 4px mas abajo), y la punta inferior entra mas
  // abajo en el arte (14 -> 18 -> 22, 4px cada iteracion). La cuerda "muerde"
  // dentro del arte para que la union nunca muestre costura aunque la pieza
  // oscile al caer.
  const ropeTopOffset = 7;
  const ropeBite = 22;

  // El rig se monta dentro de #structureOverlay, que lleva su propio
  // scale/translate CSS (ver style.css). Las medidas de arriba son pixeles de
  // VIEWPORT (getBoundingClientRect); si se aplican tal cual dentro del
  // contenedor escalado, el clon se dibuja ~13% mas grande y desplazado
  // respecto a la pieza real -> salto visible ("teletransporte") al empezar
  // y sobre todo al terminar el ciclo, cuando el clon se intercambia por la
  // pieza real. Conversion a coordenadas LOCALES del contenedor: origen en su
  // rect real y longitudes divididas por su factor de escala efectivo.
  const rigHost = structureOverlayEl || stage || document.body;
  const hostRect = rigHost.getBoundingClientRect();
  const hostScaleX = rigHost.offsetWidth ? hostRect.width / rigHost.offsetWidth : 1;
  const hostScaleY = rigHost.offsetHeight ? hostRect.height / rigHost.offsetHeight : 1;
  const bladeStartYLocal = bladeStartY / hostScaleY;
  const bladeArtHeightLocal = artRect.height / hostScaleY;
  const bladeDropDistanceLocal = bladeDropDistance / hostScaleY;
  const ropeRestLen = bladeStartYLocal + ropeBite - ropeTopOffset;
  const ropeSpan = bladeStartYLocal + bladeDropDistanceLocal + bladeArtHeightLocal + 12;

  const rig = document.createElement("div");
  rig.className = "rib1-blade-rig-preview" + (options.driven ? " rib1-blade-rig-preview--driven" : "");
  rig.style.left = ((artRect.left - hostRect.left) / hostScaleX) + "px";
  rig.style.top = ((ropeTop - hostRect.top) / hostScaleY) + "px";
  rig.style.width = (artRect.width / hostScaleX) + "px";
  rig.style.height = ropeSpan + "px";
  rig.style.setProperty("--blade-start-y", bladeStartYLocal + "px");
  rig.style.setProperty("--blade-art-height", bladeArtHeightLocal + "px");
  rig.style.setProperty("--rope-top-offset", ropeTopOffset + "px");
  rig.style.setProperty("--rig-rest-len", ropeRestLen + "px");
  rig.style.setProperty("--rig-drop-len", bladeDropDistanceLocal + "px");

  ["left", "right"].forEach(function (side) {
    const rope = document.createElement("div");
    rope.className =
      "rib1-blade-rig-preview__rope rib1-blade-rig-preview__rope--" + side;
    rig.appendChild(rope);
  });

  const blade = document.createElement("div");
  blade.className = "rib1-blade-rig-preview__blade";
  const bladeImg = document.createElement("img");
  bladeImg.className = "rib1-blade-rig-preview__img";
  bladeImg.src = sourceImg.src;
  bladeImg.alt = "";
  blade.appendChild(bladeImg);
  rig.appendChild(blade);

  (structureOverlayEl || stage || document.body).appendChild(rig);
  if (window.OssuaryAudio && !options.driven) {
    window.OssuaryAudio.trigger("rib1_blade_fall", {});
  }

  const cleanup = function () {
    if (rig.parentNode) rig.parentNode.removeChild(rig);
  };
  // animationend burbujea tambien desde cuerdas/nudos/img; solo cuenta la
  // animacion maestra de --rib1-rig-drop, que corre sobre el propio rig.
  if (!options.driven) {
    rig.addEventListener("animationend", function (event) {
      if (event.target === rig) cleanup();
    });
  }
  // Fallback de seguridad, holgado por encima de la animacion (2240ms).
  window.setTimeout(cleanup, Math.max(BONUS_MODE_BLADE_RIG_CLEANUP_MS, options.cleanupMs || 0));
  return true;
}

function scheduleLockedRibInnerHalfCuts(rib1Rect, rib1FallDistance) {
  [
    { reelId: "rib2-left", half: "right" },
    { reelId: "rib2-right", half: "left" },
    { reelId: "rib3-left", half: "right" },
    { reelId: "rib3-right", half: "left" }
  ].forEach(function (entry) {
    const reel = reelByIdForLock(entry.reelId);
    if (!reel || !reel.lockedGiantBlock || reel.lockedSymbol !== "RIB_BONUS") return;
    scheduleVisibleGiantInnerCut(reel, entry.half, rib1Rect, rib1FallDistance, {
      cutTargetSelector: "img.symbol-art",
      cutLayer: "art",
      cutWholeTarget: false
    });
  });
}

function scheduleVisibleFreeSpinOverlayCuts(rib1Rect, rib1FallDistance) {
  [
    { reelId: "rib2-left", half: "right" },
    { reelId: "rib2-right", half: "left" },
    { reelId: "rib3-left", half: "right" },
    { reelId: "rib3-right", half: "left" },
    { reelId: "rib4-left", half: "right" },
    { reelId: "rib4-right", half: "left" },
    { reelId: "rib5-left", half: "right" },
    { reelId: "rib5-right", half: "left" }
  ].forEach(function (entry) {
    const reel = reelByIdForLock(entry.reelId);
    const sourceEl = visibleFreeSpinSkeletonSourceEl(reel);
    if (!reel || !sourceEl || !sourceEl.querySelector(".symbol-overlay")) return;
    scheduleVisibleGiantInnerCut(reel, entry.half, rib1Rect, rib1FallDistance, {
      cutTargetSelector: ".symbol-overlay",
      cutLayer: "overlay",
      cutWholeTarget: true
    });
  });
}

// A peticion del usuario: corte en cadena tipo guillotina - cada fila
// (rib2, rib3, rib4, rib5) se corta justo cuando la cuchilla real llega
// (aprox.) a la mitad vertical de ESA fila, no todas a la vez ni con un
// retardo generico. Agrupadas por fila (las 2 mitades izq/der de una fila
// se cortan juntas, misma altura). reelId/half con la misma convencion que
// scheduleVisibleFreeSpinOverlayCuts (la mitad INTERIOR es la que lleva la
// mano superpuesta).
const BONUS_GUILLOTINE_ROWS = [
  [{ reelId: "rib2-left", half: "right" }, { reelId: "rib2-right", half: "left" }],
  [{ reelId: "rib3-left", half: "right" }, { reelId: "rib3-right", half: "left" }],
  [{ reelId: "rib4-left", half: "right" }, { reelId: "rib4-right", half: "left" }],
  [{ reelId: "rib5-left", half: "right" }, { reelId: "rib5-right", half: "left" }]
];

function clearBonusModeBladePayoutState() {
  state.bonusModePendingBladePayoutRows = [];
}

function buildBonusModeBladePayoutRows(lockedSymbols, bloodMark = 1) {
  if (economicSpinPlan && economicSpinPlan.kind === "normal") return economicSpinPlan.rows.map((r) => ({rowIndex:r.rowIndex,amount:r.credit.amount}));
  const bet = currentBet();
  // Caja de manos: el multiplicador de la cuchilla vigente AL CAER (antes de
  // sumar las manos de este mismo corte) escala el pago de cada fila cortada.
  // Marca de Sangre (2026-10-16): multiplica ademas este corte.
  const bladeMultiplier = ((isNormalFreeSpinBonusActive() && state.bladeMultiplier) || 1) * Math.max(1, bloodMark || 1);
  return BONUS_GUILLOTINE_ROWS.map((entries, index) => {
    const amount = Math.round(entries.reduce((sum, entry) => {
      const symbol = lockedSymbols && lockedSymbols[entry.reelId];
      return sum + ((BONUS_MODE_SKELETON_PRIZES[symbol] || 0) * bet);
    }, 0) * bladeMultiplier * 100) / 100;
    return {
      rowIndex: index,
      amount
    };
  }).filter((row) => row.amount > 0);
}

function captureGuillotineCutTarget(entry) {
  const reel = reelByIdForLock(entry.reelId);
  const sourceEl = visibleFreeSpinSkeletonSourceEl(reel);
  const sourceTargetEl = sourceEl && sourceEl.querySelector(".symbol-overlay");
  if (!sourceEl || !sourceTargetEl) return null;
  const rect = sourceEl.getBoundingClientRect();
  return { half: entry.half, sourceEl, sourceTargetEl, midY: rect.top + rect.height / 2 };
}

function visibleFreeSpinSkeletonSourceEl(reel) {
  if (!reel || !reel.giantPool) return null;
  return reel.giantPool.find((el) => {
    return !el.hidden && FREE_SPIN_RIB_SYMBOLS.includes(el.dataset.symbol);
  }) || null;
}

// Captura, ANTES de que la cuchilla empiece a caer, la posicion vertical
// real (mitad de la caja) de cada fila con manos visibles en este spin. Se
// hace una unica vez al arrancar (no en cada frame): las manos no se mueven
// mientras la cuchilla cae, solo la cuchilla se mueve.
function buildGuillotineRows() {
  const payoutRows = Array.isArray(state.bonusModePendingBladePayoutRows)
    ? state.bonusModePendingBladePayoutRows
    : [];
  return BONUS_GUILLOTINE_ROWS
    .map((entries, index) => {
      const targets = entries.map(captureGuillotineCutTarget).filter(Boolean);
      if (!targets.length) return null;
      const midY = targets.reduce((sum, t) => sum + t.midY, 0) / targets.length;
      const payoutRow = payoutRows.find((row) => row.rowIndex === index) || null;
      return {
        midY,
        targets,
        cut: false,
        rowIndex: index,
        spinId: state.currentSpinId,
        payoutAmount: payoutRow ? payoutRow.amount : 0,
        payoutApplied: false
      };
    })
    .filter(Boolean);
}

function applyBonusModeBladeRowPayout(row) {
  if (!row || row.payoutApplied || !(row.payoutAmount > 0)) return;
  if (row.spinId && row.spinId !== state.currentSpinId) return;
  row.payoutApplied = true;
  state.win = Math.round(((state.win || 0) + row.payoutAmount) * 100) / 100;
  settleSpinPayment({
    paymentAmount: row.payoutAmount,
    paymentId: (row.spinId || state.currentSpinId) + ":bonus-mode-blade-row-" + row.rowIndex,
    spinId: row.spinId || state.currentSpinId,
    bet: currentBet(),
    spinType: "BASE",
    source: "bonus_mode_blade_cut",
    noBigWin: true
  });
}

// Premio de un corte (guillotina o guadana, 2026-10-16): cada fila o cabeza
// paga al cortarse y su importe vuela al WIN (src/fx/guillotine-drop.js); el
// WIN del HUD lo suma al llegar (executionPrizeInFlight). En la ejecucion de
// golpe (6 esqueletos o mas) las cifras se juntan en el centro y sale el total
// grande, que vuela al WIN. Cuando todo ha llegado, si el corte entero es un
// premio grande sale UN contador BIG WIN con el total (antes, uno por fila).
// Mientras tanto no gira la siguiente tirada del bonus (scheduleAutoSpin).
let cutPrize = null;
let cutPrizeBigWinPending = false;
let cutPrizeBigWinToken = 0;

function beginCutPrize(amounts, options = {}) {
  const paying = amounts.filter((amount) => amount > 0);
  const total = Math.round(paying.reduce((sum, amount) => sum + amount, 0) * 100) / 100;
  cutPrize = paying.length
    ? {
      total,
      pending: paying.length,
      gathered: 0,
      bet: currentBet(),
      startedAt: Date.now(),
      gather: options.gather || null,
      bloodMark: Boolean(options.bloodMark)
    }
    : null;
  return cutPrize;
}

// Red de seguridad: un corte cuyos importes no llegan en 15 s no frena el bonus.
function cutPrizeHolding() {
  if (cutPrize && Date.now() - cutPrize.startedAt > 15000) cutPrize = null;
  return Boolean(cutPrize) || cutPrizeBigWinPending;
}

function changePrizeInFlight(delta) {
  executionPrizeInFlight = Math.max(0, Math.round((executionPrizeInFlight + delta) * 100) / 100);
}

// Sangre, chispas y la cifra de una fila o cabeza cortada (targets: [{ rect }]).
function launchCutPrize(targets, amount) {
  const cutFx = window.OssuaryGuillotineDrop;
  const group = cutPrize;
  if (!cutFx) {
    if (amount > 0) window.setTimeout(() => noteCutPrizeLanded(group), 0);
    return;
  }
  if (amount > 0) changePrizeInFlight(amount);
  cutFx.rowCut(targets, amount, {
    bloodMark: Boolean(group && group.bloodMark),
    gather: group && group.gather ? group.gather : null,
    onLanded: function () {
      if (!(amount > 0)) return;
      if (group && group.gather) {
        noteCutPrizeGathered(group);
        return;
      }
      changePrizeInFlight(-amount);
      // Primero el grupo: si era la ultima cifra de un premio grande, el
      // contador BIG WIN se marca antes de repintar y el WIN no empieza a contar.
      noteCutPrizeLanded(group);
      render();
    }
  });
}

function noteCutPrizeGathered(group) {
  group.gathered += 1;
  if (group.gathered < group.pending) return;
  const cutFx = window.OssuaryGuillotineDrop;
  const landed = function () {
    changePrizeInFlight(-group.total);
    render();
    finishCutPrize(group);
  };
  if (!cutFx) {
    landed();
    return;
  }
  cutFx.spawnPrize(group.gather.x, group.gather.y, group.total, {
    big: true,
    bloodMark: group.bloodMark,
    onLanded: landed
  });
}

function noteCutPrizeLanded(group) {
  if (!group) return;
  group.pending -= 1;
  if (group.pending > 0) return;
  finishCutPrize(group);
}

function finishCutPrize(group) {
  if (cutPrize === group) cutPrize = null;
  if (!isBigWin(group.total, group.bet) || !isNormalFreeSpinBonusActive()) {
    scheduleAutoSpin();
    return;
  }
  const token = ++cutPrizeBigWinToken;
  const release = () => {
    if (token !== cutPrizeBigWinToken) return;
    cutPrizeBigWinPending = false;
    scheduleAutoSpin();
  };
  cutPrizeBigWinPending = true;
  bigWinCounterOnScreen = true;
  render();
  window.setTimeout(release, GUADANA_HEADS_PAYOUT_MAX_WAIT_MS);
  bigWinCounter.show(group.total, group.bet).then(release, release);
}

// Centro del tablero (el esternon): donde se junta el total de la ejecucion.
function boardCenterPoint() {
  const sternum = reelByIdForLock("sternum");
  const rect = sternum && sternum.laneEl ? sternum.laneEl.getBoundingClientRect() : null;
  if (!rect || !rect.width) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.45 };
}

function fireGuillotineRowCut(row) {
  if (row.cut) return;
  row.cut = true;
  // Sangre y el importe de la fila en cifras de oro que vuela al WIN.
  launchCutPrize(
    row.targets.map((t) => ({ rect: t.sourceTargetEl.getBoundingClientRect() })),
    row.payoutApplied ? 0 : (row.payoutAmount || 0)
  );
  row.targets.forEach((t) => {
    applyVisibleGiantInnerCut(t.sourceEl, t.half, "overlay");
    spawnVisibleGiantInnerFallAway(t.sourceTargetEl, t.half, true);
  });
  // Sonido de manos cortandose en el instante real del corte de esta fila
  // (la cuchilla alcanza este nivel). Guardado como el resto de emisores de
  // audio: si el framework no esta, no pasa nada. Ver AUDIO_ARCHITECTURE.md.
  if (window.OssuaryAudio) window.OssuaryAudio.trigger("bonus_hand_cut", { cutHands: row.targets.length });
  applyBonusModeBladeRowPayout(row);
}

// Sigue la posicion REAL (getBoundingClientRect, frame a frame) de la pieza
// del rig ya existente (spawnRib1BladeRigPreview, sin tocar) y dispara cada
// fila en cuanto la cuchilla alcanza (aprox.) su mitad vertical - en vez de
// un retardo fijo calculado de antemano, que no seguia el ritmo real de la
// animacion (arranque lento, caida pesada, rebote). Con esto el corte queda
// sincronizado con lo que se ve en pantalla, fila por fila, como una
// guillotina en cadena.
function runGuillotineChainCuts(rigEl, rows, onDone, maxChainMs) {
  let doneCalled = false;
  const finish = () => {
    if (doneCalled) return;
    doneCalled = true;
    if (typeof onDone === "function") onDone();
  };
  const bladeEl = rigEl && rigEl.querySelector(".rib1-blade-rig-preview__blade");
  if (!bladeEl || !rows.length) { finish(); return; }
  const startedAt = window.performance.now();
  // Cubre la caida + rebote de settle (~1568ms de rib1-blade-rig-drop-anim) con
  // margen; las caidas de src/fx/guillotine-drop.js pasan la suya (mas larga
  // si se atasca o baja a tirones).
  const MAX_CHAIN_MS = maxChainMs || BONUS_MODE_BLADE_CHAIN_TIMEOUT_MS;

  function tick() {
    if (!rigEl.isConnected) {
      rows.forEach(fireGuillotineRowCut);
      finish();
      return;
    }
    const bladeRect = bladeEl.getBoundingClientRect();
    const bladeMidY = bladeRect.top + bladeRect.height / 2;
    let pending = false;
    rows.forEach((row) => {
      if (row.cut) return;
      if (bladeMidY >= row.midY) {
        fireGuillotineRowCut(row);
      } else {
        pending = true;
      }
    });
    if (!pending) { finish(); return; }
    if (window.performance.now() - startedAt >= MAX_CHAIN_MS) {
      rows.forEach(fireGuillotineRowCut);
      finish();
      return;
    }
    window.requestAnimationFrame(tick);
  }
  window.requestAnimationFrame(tick);
}

const BONUS_MODE_HAND_CUT_REEL_IDS = [
  "rib2-left", "rib2-right",
  "rib3-left", "rib3-right",
  "rib4-left", "rib4-right",
  "rib5-left", "rib5-right"
];

// El corte visual pertenece unicamente al bloque saliente que lo recibio.
// Antes de preparar cada spin se conserva solo si el elemento sigue
// representando exactamente el locked/carry concreto (mismo refPosition);
// cualquier otro slot vuelve a su arte completo. giant-symbol-renderer añade
// la segunda defensa: si un pool slot cambia de bloque aunque repita simbolo,
// lo reconfigura y nunca hereda las manos cortadas del anterior.
function resetBonusModeHandCutState() {
  BONUS_MODE_HAND_CUT_REEL_IDS.forEach((reelId) => {
    const reel = reelByIdForLock(reelId);
    if (!reel || !reel.giantPool) return;
    const lockedCutRef = reel.lockedGiantBlock ? String(Math.round(reel.lockedGiantBlock.refPosition * 1000) / 1000) : "";
    const carryCutRef = reel.carryGiantBlock ? String(Math.round(reel.carryGiantBlock.refPosition * 1000) / 1000) : "";
    reel.giantPool.forEach((el) => {
      const preserveCutState =
        !el.hidden &&
        el.dataset &&
        el.dataset.handsCut === "1" &&
        (
          (reel.locked &&
            BONUS_MODE_SKELETON_SYMBOLS.includes(reel.lockedSymbol) &&
            el.dataset.symbol === reel.lockedSymbol &&
            el.dataset.cutBlockRef === lockedCutRef) ||
          (reel.carryGiantBlock &&
            BONUS_MODE_SKELETON_SYMBOLS.includes(reel.carryGiantBlock.symbol) &&
            el.dataset.symbol === reel.carryGiantBlock.symbol &&
            el.dataset.cutBlockRef === carryCutRef)
        );
      if (preserveCutState) return;
      el.classList.remove(
        "bonus-inner-cut--left",
        "bonus-inner-cut--right",
        "bonus-inner-cut-flash",
        "bonus-inner-cut-overlay-hidden"
      );
      if (el.dataset) {
        delete el.dataset.handsCut;
        delete el.dataset.cutBlockRef;
      }
      if (el.bonusInnerCutFlashTimer) {
        window.clearTimeout(el.bonusInnerCutFlashTimer);
        el.bonusInnerCutFlashTimer = 0;
      }
    });
  });
}

function visibleGiantSourceElForReel(reel) {
  return reel && reel.giantPool
    ? reel.giantPool.find((el) => !el.hidden) || null
    : null;
}

function ensureRib1FrontLayerTrack() {
  const rib1Reel = reelByIdForLock("rib1");
  if (!rib1Reel || !rib1Reel.giantStripEl || !structureOverlayEl) return;
  if (rib1Reel.giantStripEl.parentNode === structureOverlayEl) return;
  structureOverlayEl.appendChild(rib1Reel.giantStripEl);
}

function currentBladeBadgeAnchorEl() {
  const rigBlades = document.querySelectorAll(".rib1-blade-rig-preview__blade");
  if (rigBlades.length) return rigBlades[rigBlades.length - 1];
  return visibleGiantSourceElForReel(reelByIdForLock("rib1"));
}

// Cifras de la caja de manos y del multiplicador de la cuchilla en el oro
// cincelado del contador BIG WIN (cifras, aspa "x" y barra "/" de
// assets/fonts; peticion del usuario, 2026-10-16: "la fuente no me convence,
// dale mas personalidad y profundidad"). Sin la fuente, texto normal.
function paintGoldNumber(el, text) {
  if (!el) return;
  const font = window.OssuaryNumberFont;
  if (font && typeof font.canRenderLetters === "function" && font.canRenderLetters(text)) {
    font.render(el, text, { letters: true });
    el.setAttribute("aria-label", text);
  } else {
    el.classList.remove("ossuary-number-font");
    el.textContent = text;
  }
}

function clearAllBladeMultiplierBadges() {
  document.querySelectorAll(".bonus-hand-box-blade-multiplier").forEach((el) => el.remove());
}

function syncBonusBladeAttachedMultiplierUI(options = {}) {
  clearAllBladeMultiplierBadges();
  // Con Marca de Sangre (2026-10-16) la cuchilla ensena caja x marca en rojo
  // mientras dura ese corte.
  const bloodMark = Math.max(1, state.bonusBloodMarkShown || 1);
  const value = (state.bonusBladeAttachedMultiplier || 1) * bloodMark;
  if (!(value > 1)) return false;
  const anchorEl = currentBladeBadgeAnchorEl();
  if (!anchorEl) return false;
  const badge = document.createElement("div");
  badge.className = "bonus-hand-box-blade-multiplier";
  if (bloodMark > 1) badge.classList.add("bonus-hand-box-blade-multiplier--blood");
  if (options.flash) badge.classList.add("bonus-hand-box-blade-multiplier--flash");
  paintGoldNumber(badge, "x" + value);
  anchorEl.appendChild(badge);
  return true;
}

function holdActiveBladeRigForLevelUp(durationMs = 320) {
  const rigs = document.querySelectorAll(".rib1-blade-rig-preview");
  const rigEl = rigs[rigs.length - 1];
  if (!rigEl || rigEl.bonusLevelUpHoldTimer) return false;
  rigEl.classList.add("rib1-blade-rig-preview--levelup-hold");
  rigEl.bonusLevelUpHoldTimer = window.setTimeout(() => {
    rigEl.classList.remove("rib1-blade-rig-preview--levelup-hold");
    rigEl.bonusLevelUpHoldTimer = 0;
  }, Math.max(0, durationMs));
  return true;
}

// A peticion del usuario: mecanica EXCLUSIVA del Bonus Game (free spins).
// REDISEÑO FREE SPIN (2026-07-03): el esternon ahora solo sortea la Cuchilla
// (BLADE_BONUS) o la cruz/X cerrada (STERNUM_CROSS_BONUS) - la mecanica anterior positivo/
// negativo/multiplicadores quedo desactivada (LEGACY_* en symbols.config.js).
// Cuando aterriza la cuchilla, esta funcion dispara la bajada y el corte en
// cadena de TODOS los esqueletos acumulados/bloqueados en el tablero; si el
// esternon queda vacio no se llama a esta funcion (se pierde 1 oportunidad,
// ver resolveBonusModeFreeSpinResult). Solo corre cuando state.bonusModeActive
// (ver outcome-engine.js#bonusModeGiantSymbol - cero cambios en base game).
// El esternon en si NUNCA cae: solo muestra el arte de la cuchilla en su
// propia casilla. Lo que cae es la pieza de rib1
// (que durante todo el Bonus Game permanece fija/visible con su arte
// RIB_BONUS real, ver ensureFixedBonusModeRib1Lock) - exactamente la misma
// pieza que ya usa el rig de cuchilla+cuerdas, SIN MODIFICARLO
// (spawnRib1BladeRigPreview se llama tal cual, mismo boton de debug "RIB1
// rope rig preview"). El corte de manos reutiliza, tambien sin modificar,
// las mismas dos primitivas que ya existian (applyVisibleGiantInnerCut +
// spawnVisibleGiantInnerFallAway) - solo cambia CUANDO se llaman: en vez del
// retardo generico de scheduleVisibleGiantInnerCut (pensado para la caida
// recta de spawnRib1BonusFallAway, que ya no se usa aqui), runGuillotineChainCuts
// las dispara fila por fila siguiendo la posicion real de la cuchilla.
// A peticion del usuario: mientras la pieza cae (el clon del rig), la pieza
// REAL de rib1 (reel.giantPool) se quedaba visible a la vez -> se veia
// "duplicada" (una quieta en rib1 y una copia cayendo). spawnRib1BladeRigPreview
// es un clon no-destructivo a proposito (no toca el elemento real, pensado
// para una preview de debug que no debe alterar el estado del juego) y no se
// modifica aqui - en vez de eso, SOLO en este llamador, se oculta visualmente
// (opacidad, sin tocar dataset/contenido/estado del modelo) la pieza real
// mientras dura el rig, y se restaura en cuanto el rig termina su ciclo
// completo (cae, golpea, rebota, sube de vuelta) y se autolimpia - el mismo
// evento animationend filtrado al rig (event.target === rigEl) que ya usa la
// propia funcion para su propio cleanup, mas un timeout de seguridad igual
// de holgado por si ese evento no llegara a disparar.
// Tras el ciclo completo del rig (o su timeout de seguridad), la pieza real de
// rib1 se restaura y el multiplicador pegado vuelve a sincronizarse con la
// cuchilla en reposo. Los esqueletos cortados NO se retiran aqui: deben
// quedarse visibles hasta que el jugador pulse el siguiente SPIN. La retirada
// real ocurre al arrancar ese siguiente giro (startSpin -> release...).
function triggerBonusModeSternumBladeCut(sternumReel, options = {}) {
  if (!sternumReel || !BONUS_MODE_STERNUM_BLADE_SYMBOLS.includes(sternumReel.giantSymbol)) return false;
  const rib1Reel = reelByIdForLock("rib1");
  if (!rib1Reel || !rib1Reel.giantPool) return false;
  const sourceEl = rib1Reel.giantPool.find((el) => !el.hidden);
  if (!sourceEl) return false;

  // A peticion del usuario: en cuanto el rodillo central (esternon) aterriza
  // el simbolo que desata la cuchilla, suena "tirar de la cuerda" (antes de
  // que el rig empiece a caer). Evento propio y distinto de rib1_blade_fall
  // (ese sigue sonando cuando el rig arranca su caida visual unos ms despues).
  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger("bonus_sternum_blade_triggered", { reelId: sternumReel.id });
  }

  const rows = buildGuillotineRows();
  const bloodMark = Math.max(1, state.bonusBloodMark || 1);
  const dropFx = window.OssuaryGuillotineDrop;
  const tensionFx = window.OssuaryExecutionTension;
  let bloodMarkFx = null;

  // Caidas distintas (src/fx/guillotine-drop.js): con mas en juego, mas
  // amagos; con Marca de Sangre, golpe seco o atasco.
  function startDrop() {
    sourceEl.classList.add("bonus-mode-blade-source-hidden");
    // La Muerte mira la ejecucion con sus ojos macabros hasta que la
    // cuchilla vuelve arriba (src/fx/hood-eyes.js, cara "watch").
    showHoodEyes("watch");
    const variant = dropFx
      ? dropFx.chooseVariant({
        skeletons: Math.max(pendingHandCount, rows.reduce((n, row) => n + row.targets.length, 0)),
        multiplier: (state.bonusBladeAttachedMultiplier || 1) * bloodMark,
        bloodMark
      })
      : null;
    let plan = null;
    if (variant) {
      plan = dropFx.buildPlan(variant, { rowsD: [] });
    }
    beginCutPrize(rows.map((row) => row.payoutAmount || 0), {
      bloodMark: bloodMark > 1,
      gather: variant === "execution" ? boardCenterPoint() : null
    });
    const cycleMs = plan ? Math.round(plan.duration * dropFx.speedFactor()) + 700 : 0;
    const spawned = spawnRib1BladeRigPreview(rib1Reel, plan ? { driven: true, cleanupMs: cycleMs + 400 } : {});
    if (!spawned) {
      sourceEl.classList.remove("bonus-mode-blade-source-hidden");
      if (bloodMarkFx) bloodMarkFx.clear();
      restoreSource();
      return;
    }

    const rigEls = document.querySelectorAll(".rib1-blade-rig-preview");
    const rigEl = rigEls[rigEls.length - 1];

    // Si ya habia un multiplicador pegado a la cuchilla, se mueve del esternon
    // en reposo al blade del rig para que no desaparezca durante la bajada.
    syncBonusBladeAttachedMultiplierUI();
    if (bloodMark > 1 && rigEl) {
      const rigImg = rigEl.querySelector(".rib1-blade-rig-preview__img");
      if (rigImg) rigImg.classList.add("exec-blade-bleeding");
    }

    if (rigEl && plan) {
      // A que altura corta cada fila (para que el atasco se quede justo
      // encima de la primera y el trinquete las corte una a una).
      plan = dropFx.buildPlan(variant, { rowsD: guillotineRowsDrop(rigEl, rows) });
      dropFx.drive(rigEl, plan, {
        blood: bloodMark > 1,
        onDone: function () {
          if (rigEl.parentNode) rigEl.parentNode.removeChild(rigEl);
          restoreSource();
        }
      });
    } else if (rigEl) {
      rigEl.addEventListener("animationend", (event) => {
        if (event.target === rigEl) restoreSource();
      });
    }
    window.setTimeout(restoreSource, Math.max(BONUS_MODE_BLADE_RIG_CLEANUP_MS, cycleMs + 400));

    if (rows.length && rigEl) {
      const chainMs = plan
        ? Math.round((plan.bottomAt + 300) * dropFx.speedFactor())
        : BONUS_MODE_BLADE_CHAIN_TIMEOUT_MS;
      runGuillotineChainCuts(rigEl, rows, startHandCount, chainMs);
    } else {
      // Sin filas que cortar (cuchilla sin esqueletos visibles): arranca el
      // conteo igual - normalmente pendingHandCount sera 0.
      startHandCount();
    }
  }

  // Caja de manos: el conteo visual NO arranca al aparecer la cuchilla, sino
  // cuando esta ha bajado y cortado (guillotina completa) - o, como red de
  // seguridad, al cerrar el ciclo del rig si el corte no llego a dispararse.
  // Guardado por handCountStarted para no contar dos veces.
  const pendingHandCount = state.bonusModePendingHandCount || 0;
  state.bonusModePendingHandCount = 0;
  let handCountStarted = false;
  const startHandCount = () => {
    if (handCountStarted) return;
    handCountStarted = true;
    startBonusHandCountAnimation(pendingHandCount);
  };

  // Marca "cortados pendientes de retirar": la retirada real ocurre al
  // terminar el ciclo del rig (animationend/timeout de abajo) o, si el
  // jugador gira antes, al arrancar el siguiente free spin (ver startSpin) -
  // asi ningun esqueleto ya cortado puede quedarse bloqueado y volver a pagar.
  state.bonusModeCutPendingRelease = true;
  let restored = false;
  function restoreSource() {
    if (restored) return;
    restored = true;
    commitBonusCandleRestore();
    startHandCount(); // fallback si la cadena de corte no lo arranco antes
    sourceEl.classList.remove("bonus-mode-blade-source-hidden");
    // Fuera la Marca de Sangre: la cuchilla vuelve a su multiplicador de la caja.
    if (bloodMarkFx) bloodMarkFx.clear();
    if (window.OssuaryHoodEyes && window.OssuaryHoodEyes.release) window.OssuaryHoodEyes.release("watch");
    state.bonusBloodMark = 1;
    state.bonusBloodMarkShown = 1;
    syncBonusBladeAttachedMultiplierUI();
    clearBonusModeBladePayoutState();
    if (typeof options.onComplete === "function") {
      options.onComplete();
    }
  }

  // Marca de Sangre: antes de caer, la hoja sangra y en ella ruedan los
  // multiplicadores hasta clavarse el que toca (src/fx/execution-tension.js);
  // al clavarse, el multiplicador de la cuchilla pasa a ser caja x marca.
  // La lleva un esqueleto del tablero al azar (peticion del usuario,
  // 2026-10-17): se tine de sangre y se la lanza a la cuchilla. Solo es quien
  // la ensena: la marca y su valor ya estan decididos (rollBloodMark).
  if (bloodMark > 1 && tensionFx) {
    const skeletonEls = boardSkeletonEls();
    bloodMarkFx = tensionFx.playBloodMark(function () { return sourceEl; }, bloodMark, {
      carrier: skeletonEls.length ? skeletonEls[Math.floor(Math.random() * skeletonEls.length)] : null,
      beside: (state.bonusBladeAttachedMultiplier || 1) > 1,
      base: state.bonusBladeAttachedMultiplier || 1,
      onLanded: function (value, seal) {
        state.bonusBloodMarkShown = value;
        syncBonusBladeAttachedMultiplierUI({ flash: true });
        if (seal) seal.classList.add("is-merging");
      },
      onDone: startDrop
    });
  } else {
    startDrop();
  }
  return true;
}

// Valor de --rib1-rig-drop con el que la cuchilla del rig alcanza la mitad de
// cada fila (el mismo criterio que runGuillotineChainCuts).
function guillotineRowsDrop(rigEl, rows) {
  const bladeEl = rigEl && rigEl.querySelector(".rib1-blade-rig-preview__blade");
  if (!bladeEl || !rows.length) return [];
  const bladeRect = bladeEl.getBoundingClientRect();
  const mid0 = bladeRect.top + bladeRect.height / 2;
  const dropLocal = parseFloat(rigEl.style.getPropertyValue("--rig-drop-len")) || 0;
  const rigRect = rigEl.getBoundingClientRect();
  const scaleY = rigEl.offsetHeight ? rigRect.height / rigEl.offsetHeight : 1;
  const dropPx = dropLocal * scaleY;
  if (!(dropPx > 0)) return [];
  return rows
    .map((row) => (row.midY - mid0) / dropPx)
    .filter((d) => d > 0 && d < 1.2)
    .sort((a, b) => a - b);
}

// Rediseño FREE SPIN: retira del tablero los esqueletos ya cortados por la
// cuchilla - desbloquea cada mitad de rib que estaba bloqueada con un
// esqueleto (POBRE/NOBLE/RICO) y oculta su bloque gigante. IMPORTANTE: esta
// limpieza ya no ocurre al terminar la subida de la cuchilla, sino al arrancar
// el SIGUIENTE spin. Asi, tras el corte, los esqueletos siguen visibles en sus
// casillas hasta que el jugador vuelve a girar. Y al empezar ese siguiente
// giro no deben desaparecer "de golpe": se convierten en carryGiantBlock para
// que el propio reel los saque/deslice con su animacion normal de salida.
// rib1 y el esternon no se tocan. Idempotente via state.bonusModeCutPendingRelease.
function releaseBonusModeCutSkeletons() {
  if (!state.bonusModeCutPendingRelease) return;
  state.bonusModeCutPendingRelease = false;
  BONUS_MODE_HAND_CUT_REEL_IDS.forEach((reelId) => {
    const reel = reelByIdForLock(reelId);
    if (!reel || !reel.locked || !BONUS_MODE_SKELETON_SYMBOLS.includes(reel.lockedSymbol)) return;
    carryVisibleGiantIntoNextSpin(reel);
    renderGiantBlocks(reel);
    validateGiantSymbolSync(reel, "releaseBonusModeCutSkeletons");
  });
  emitBonusLockUpdated();
}

function completeBonusModeBladeSequenceFallback() {
  const pendingRows = Array.isArray(state.bonusModePendingBladePayoutRows)
    ? state.bonusModePendingBladePayoutRows
    : [];
  pendingRows.forEach((row) => {
    applyBonusModeBladeRowPayout({
      rowIndex: row.rowIndex,
      payoutAmount: row.amount,
      payoutApplied: false
    });
  });
  clearBonusModeBladePayoutState();
  // Sin secuencia visual de cuchilla: las manos se suman al instante.
  if (state.bonusModePendingHandCount > 0) {
    addBonusHands(state.bonusModePendingHandCount);
    state.bonusModePendingHandCount = 0;
  }
}

function isNormalFreeSpinBonusActive() {
  return Boolean(state.bonusModeActive && state.bonusModeType === "NORMAL_BONUS");
}

// Fondo de vídeo del Bonus Game FREE SPIN: alterna hacia el vídeo del bonus
// al entrar y de vuelta al fondo principal al salir (ver
// scene-manager.js#setBonusBackgroundActive). Ambos vídeos siguen su propio
// autoplay+loop en todo momento; esto solo cambia cual esta visible.
function syncBonusBackgroundVideo() {
  if (window.OssuarySceneManager) {
    window.OssuarySceneManager.setBonusBackgroundActive(isNormalFreeSpinBonusActive());
  }
}

// "Caja de manos recolectadas", EXCLUSIVA del Bonus Game normal (FREE SPIN).
// Cada esqueleto cortado por la cuchilla suma +1; al completar el objetivo la
// cuchilla sube de nivel (multiplicador de pago del corte) y el SOBRANTE pasa
// al siguiente objetivo (4/5 + 2 cortados => 1/10, nunca 0/10). El ultimo
// nivel es tope: la cuchilla se queda en x100 el resto del bonus y el contador
// se bloquea en el maximo. Cada entrada define el objetivo (manos para
// completar ESE nivel) y el multiplicador vigente MIENTRAS se esta en el.
// Progresion (2026-07-04): 5->x2, 10->x5, 20->x10, 25->x25, 50->x100 (max).
// La caja muestra el PROXIMO premio a coleccionar (empieza en x2) - NO
// multiplica todavia. Al completar el contador, ese multiplicador "sube a la
// guillotina" (se pega a ella: pasa a ser el multiplicador de PAGO) y la caja
// muestra el siguiente premio. `multiplier` aqui es el premio que se recoge en
// ese nivel; el que PAGA el corte es el ya pegado a la guillotina
// (state.bladeMultiplier), que es el premio del ultimo nivel COMPLETADO (x1
// mientras no se haya completado ninguno).
// 2026-10-16 (peticion del usuario: "tiene que sentirse que la cuchilla
// multiplicadora evoluciona mas rapido"): niveles cortos que suben casi en
// cada corte (x2, x3, x4, x5... ~5 subidas en las 7 primeras tiradas) y las
// cabezas de la guadana tambien suman a la caja (playGuadanaHeadsCutSequence).
// Cuentas en symbols.config.js#WEIGHTED_FREE_SPIN_RIB_SYMBOLS.
// Despues ("pocas veces se gana muchisimo"): la caja sigue subiendo en los
// bonus largos, hasta x500.
const BONUS_HAND_BOX_LEVELS = ECONOMY_CONFIG.handLevels.map(([target, multiplier]) => ({ target, multiplier }));

// Multiplicador pegado a la guillotina (el que paga) para un nivel dado: el
// premio del nivel anterior ya completado; x1 si aun no se completo ninguno.
function bonusBladeStuckForLevel(level) {
  const maxIndex = BONUS_HAND_BOX_LEVELS.length - 1;
  const lvl = Math.max(0, Math.min(level || 0, maxIndex));
  return lvl > 0 ? BONUS_HAND_BOX_LEVELS[lvl - 1].multiplier : 1;
}

// Ritmo del conteo visual mano a mano (ms por paso). Cada "frame" es un
// estado del contador; una mano que completa nivel produce 2 frames (p.ej.
// 5/5 y luego 0/10) para que el jugador vea el salto de nivel.
const BONUS_HAND_COUNT_STEP_MS = 260;
const BONUS_HAND_COUNT_PULSE_MS = 180;
const BONUS_HAND_COUNT_FLASH_MS = 260;
const BONUS_HAND_LEVELUP_HOLD_MS = 950;
// El sonido de "sube de nivel" se dispara este margen antes del cambio
// visual real (a peticion del usuario), para que se anticipe ligeramente.
const BONUS_MULTIPLIER_LEVELUP_SOUND_LEAD_MS = 200;

let bonusHandBoxEl = null;
let bonusHandBoxCrateBackEl = null;
let bonusHandBoxCrateFrontEl = null;
let bonusHandBoxCounterEl = null;
let bonusHandBoxCounterValueEl = null;
let bonusHandBoxCounterTargetEl = null;
let bonusHandBoxMultiplierEl = null;
let bonusHandCountAnimTimer = 0;
let bonusHandCountFrames = null;
let bonusHandCountIndex = 0;
let bonusMultiplierLevelupSoundTimer = 0;
let bonusMultiplierLevelupSoundLastValue = 0;
let bonusHandBoxActiveCrateLayer = "front";
let bonusHandBoxPulseTimer = 0;
let bonusHandBoxCounterFlashTimer = 0;
let bonusHandBoxLevelUpBusy = false;
let bonusCandleCounterEl = null;
let bonusCandleSlots = [];
let bonusCandleLastVisibleCount = 0;
let bonusCandleDisplayCount = 0;
let bonusCandleDeferredRestoreCount = null;
const BONUS_CANDLE_RELIGHT_FLASH_MS = 900;

function ensureBonusCandleCounter() {
  if (bonusCandleCounterEl) return bonusCandleCounterEl;
  const counterHost = structureOverlayEl || uiLayer;
  if (!counterHost) return null;

  const root = document.createElement("div");
  root.className = "bonus-candle-counter";
  root.hidden = true;

  const holder = document.createElement("img");
  holder.className = "bonus-candle-counter__holder";
  holder.src = "assets/symbols/posa_velas.png";
  holder.alt = "";
  holder.draggable = false;
  root.appendChild(holder);

  const candles = document.createElement("div");
  candles.className = "bonus-candle-counter__candles";
  root.appendChild(candles);

  bonusCandleSlots = [];
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement("div");
    slot.className = "bonus-candle-counter__slot";
    const candle = document.createElement("img");
    candle.className = "bonus-candle-counter__candle";
    candle.src = "assets/symbols/vela.png";
    candle.alt = "";
    candle.draggable = false;
    slot.appendChild(candle);
    candles.appendChild(slot);
    bonusCandleSlots.push(slot);
  }

  bonusCandleCounterEl = root;
  counterHost.appendChild(root);
  return root;
}

function updateBonusCandleCounterUI() {
  const root = ensureBonusCandleCounter();
  if (!root) return;

  const visible = Boolean(state.bonusModeActive && state.bonusModeType === "NORMAL_BONUS");
  root.hidden = !visible;
  if (!visible) {
    bonusCandleLastVisibleCount = 0;
    bonusCandleDisplayCount = 0;
    bonusCandleDeferredRestoreCount = null;
    return;
  }

  const maxCandles = 3;
  const actualRemaining = Math.max(0, Math.min(maxCandles, state.bonusModeSpinsRemaining || 0));
  if (bonusCandleDeferredRestoreCount == null) {
    bonusCandleDisplayCount = actualRemaining;
  } else {
    bonusCandleDisplayCount = Math.min(bonusCandleDisplayCount, actualRemaining);
  }
  const remaining = bonusCandleDisplayCount;
  if (remaining > bonusCandleLastVisibleCount && window.OssuaryAudio) {
    window.OssuaryAudio.trigger("bonus_candle_light", {
      previousCandles: bonusCandleLastVisibleCount,
      currentCandles: remaining,
      addedCandles: remaining - bonusCandleLastVisibleCount
    });
  }
  bonusCandleSlots.forEach((slot, index) => {
    const wasLit = slot.classList.contains("is-lit");
    const isLit = index >= (maxCandles - remaining);
    slot.classList.toggle("is-lit", isLit);
    slot.classList.toggle("is-out", !isLit);
    if (isLit && !wasLit) {
      slot.classList.remove("is-relit");
      void slot.offsetWidth;
      slot.classList.add("is-relit");
      if (slot.bonusRelightTimer) window.clearTimeout(slot.bonusRelightTimer);
      slot.bonusRelightTimer = window.setTimeout(() => {
        slot.classList.remove("is-relit");
        slot.bonusRelightTimer = 0;
      }, BONUS_CANDLE_RELIGHT_FLASH_MS);
    } else if (!isLit) {
      if (slot.bonusRelightTimer) window.clearTimeout(slot.bonusRelightTimer);
      slot.bonusRelightTimer = 0;
      slot.classList.remove("is-relit");
    }
  });
  bonusCandleLastVisibleCount = remaining;
}

function deferBonusCandleRestore(count) {
  bonusCandleDeferredRestoreCount = Math.max(0, Math.min(3, count || 0));
  bonusCandleDisplayCount = Math.max(0, Math.min(3, bonusCandleLastVisibleCount || bonusCandleDisplayCount || 0));
}

function commitBonusCandleRestore() {
  if (bonusCandleDeferredRestoreCount == null) return;
  bonusCandleDisplayCount = bonusCandleDeferredRestoreCount;
  bonusCandleDeferredRestoreCount = null;
  updateBonusCandleCounterUI();
}

// ============================================================
// FX VISUAL DE LA GUADAÑA (2026-07-06, a peticion del usuario)
// 100% PRESENTACION: cuando la Guadaña (GUADANA_BONUS) aterriza en el
// esternon durante los free spins, las cabezas de los esqueletos del
// tablero tiemblan (anticipacion), aparece la linea de corte en el
// cuello, hay un impacto seco y salen despedidas con fuerza girando,
// cada una en una direccion ligeramente distinta, hasta desvanecerse.
// CERO cambios de logica: no toca state/busy/locks/pagos/oportunidades
// (la guadaña sigue siendo un resultado neutro que consume el giro).
// Las cabezas ocultas no se restauran al arrancar el siguiente spin: si el
// esqueleto sigue bloqueado, permanece sin cabeza hasta que ese bloque se vaya.
// ============================================================
// Ritmo (ajustado a peticion del usuario, 2026-07-06): la anticipacion
// completa (temblor + linea de corte) dura 2s antes del impacto. El vuelo
// es un tiro hacia arriba y caida hacia abajo con deriva lateral aleatoria
// (ver launchGuadanaHeadClone). Velocidad del vuelo +35% (mismo recorrido,
// menos tiempo) a peticion del usuario tras reportar que se veia lento y
// con tirones; la curva tambien se simplifico a 3 puntos (antes 4) para
// quitar la meseta cerca del apice que se leia como un tiron/pausa.
const GUADANA_HEAD_TREMOR_MS = 2000;
const GUADANA_HEAD_FLY_BASE_MS = Math.round(2200 * 0.65);
const GUADANA_HEAD_FLY_RANDOM_MS = 325;
const GUADANA_BLADE_ASSET = "assets/symbols/guadana_blade_alpha.png";
// Tras un aterrizaje de guadaña, el siguiente spin del encadenado automatico
// espera 2.5s extra (a peticion del usuario) para dar tiempo a ver toda la
// secuencia (temblor + corte + vuelo) antes de que gire el siguiente reel.
const GUADANA_NEXT_SPIN_HOLD_MS = Math.max(
  0,
  GUADANA_HEAD_TREMOR_MS + GUADANA_HEAD_FLY_BASE_MS + GUADANA_HEAD_FLY_RANDOM_MS - AUTO_SPIN_DELAY + 80
);

function collectBonusModeSkeletonHeads() {
  const heads = [];
  BONUS_MODE_HAND_CUT_REEL_IDS.forEach((reelId) => {
    const reel = reelByIdForLock(reelId);
    if (!reel || !reel.giantPool) return;
    const symbol = reel.locked && reel.lockedSymbol ? reel.lockedSymbol : reel.giantSymbol;
    if (!BONUS_MODE_SKELETON_SYMBOLS.includes(symbol)) return;
    reel.giantPool.forEach((sourceEl) => {
      if (!sourceEl || sourceEl.hidden) return;
      const headImg = sourceEl.querySelector("img.symbol-head-overlay");
      if (!headImg || headImg.classList.contains("guadana-head-cut-hidden")) return;
      const rect = headImg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      heads.push({ headImg, sourceEl, reelId, symbol, rect });
    });
  });
  return heads;
}

// Premio de las cabezas (a peticion del usuario, 2026-10-04): cada esqueleto
// cuya cabeza corta la Guadaña paga BONUS_MODE_SKELETON_HEAD_PRIZES (el doble
// que sus manos, en multiplos de la apuesta) × el multiplicador vigente de la
// guillotina, igual que buildBonusModeBladePayoutRows. Una vez por esqueleto
// (reelId), aunque su bloque tenga varios elementos visibles; las cabezas ya
// cortadas no se recogen (collectBonusModeSkeletonHeads), asi que no repagan.
let guadanaHeadsPayoutPending = false;
let guadanaHeadsPayoutToken = 0;
// Tope de seguridad: si el contador BIG WIN se cancelase a medias su promesa
// no resuelve; el bonus nunca debe quedarse parado esperando por ello.
const GUADANA_HEADS_PAYOUT_MAX_WAIT_MS = 25000;

function guadanaHeadsPayoutAmount(heads) {
  const bet = currentBet();
  flushBonusHandCountAnim();
  const multiplier = (isNormalFreeSpinBonusActive() && state.bladeMultiplier) || 1;
  const symbolByReel = new Map();
  heads.forEach((head) => symbolByReel.set(head.reelId, head.symbol));
  let base = 0;
  symbolByReel.forEach((symbol) => {
    base += (BONUS_MODE_SKELETON_HEAD_PRIZES[symbol] || 0) * bet;
  });
  return Math.round(base * multiplier * 100) / 100;
}

// Importe de cada cabeza (una por esqueleto), para ensenarlo al cortarla
// (2026-10-16). Misma cuenta que guadanaHeadsPayoutAmount, cabeza a cabeza.
function guadanaHeadAmounts(heads) {
  if (economicSpinPlan && economicSpinPlan.kind === "normal") {
    let left = economicSpinPlan.headCredit ? Math.round(economicSpinPlan.headCredit.amount * 100) : 0;
    return economicSpinPlan.heads.map((entry) => {
      const head = heads.find((h) => h.reelId === entry.reelId);
      const amount = Math.min(left, Math.round(entry.amount * 100));
      left -= amount;
      return { head, amount: amount / 100 };
    }).filter((entry) => entry.head);
  }
  const bet = currentBet();
  flushBonusHandCountAnim();
  const multiplier = (isNormalFreeSpinBonusActive() && state.bladeMultiplier) || 1;
  const byReel = new Map();
  heads.forEach((head) => {
    if (!byReel.has(head.reelId)) byReel.set(head.reelId, head);
  });
  return Array.from(byReel.values()).map((head) => ({
    head,
    amount: Math.round((BONUS_MODE_SKELETON_HEAD_PRIZES[head.symbol] || 0) * bet * multiplier * 100) / 100
  }));
}

// Se paga en el impacto del corte. Mientras el pago (y su posible BIG WIN)
// esta en curso, scheduleAutoSpin no arranca el siguiente free spin.
function applyGuadanaHeadsPayout(amount, spinId) {
  if (!(amount > 0) || !isNormalFreeSpinBonusActive()) return;
  if (spinId !== state.currentSpinId) return;
  state.win = Math.round(((state.win || 0) + amount) * 100) / 100;
  const token = ++guadanaHeadsPayoutToken;
  const release = () => {
    if (token === guadanaHeadsPayoutToken) guadanaHeadsPayoutPending = false;
  };
  guadanaHeadsPayoutPending = true;
  window.setTimeout(release, GUADANA_HEADS_PAYOUT_MAX_WAIT_MS);
  settleSpinPayment({
    paymentAmount: amount,
    paymentId: spinId + ":bonus-mode-guadana-heads",
    spinId,
    bet: currentBet(),
    spinType: "BASE",
    source: "bonus_mode_guadana_heads",
    // El contador BIG WIN sale con el total cuando llegan las cifras de las
    // cabezas al WIN (finishCutPrize).
    noBigWin: true
  }).then(release, release);
}

function spawnGuadanaCutLine(sourceEl, reelId) {
  const line = document.createElement("div");
  line.className = "guadana-cut-line";
  // Zona del cuello dentro del canvas 924x500 del arte de cabeza: el craneo
  // vive en el cuadrante superior derecho (espejado en mitades -left).
  const mirrored = /-left$/.test(reelId || "");
  line.style.top = "44%";
  line.style.left = mirrored ? "24%" : "54%";
  line.style.width = "22%";
  sourceEl.appendChild(line);
  return line;
}

function launchGuadanaHeadClone(head) {
  const { headImg, reelId, rect } = head;
  const clone = document.createElement("img");
  clone.className = "guadana-head-fly";
  clone.src = headImg.currentSrc || headImg.src;
  clone.alt = "";
  clone.style.left = rect.left + "px";
  clone.style.top = rect.top + "px";
  clone.style.width = rect.width + "px";
  clone.style.height = rect.height + "px";
  clone.style.objectFit = "contain";
  clone.style.objectPosition = "center center";
  // Conserva el espejo de las mitades izquierdas en el transform base; el
  // vuelo se anima con las propiedades independientes translate/rotate para
  // no pisarlo.
  const baseTransform = window.getComputedStyle(headImg).transform;
  if (baseTransform && baseTransform !== "none") clone.style.transform = baseTransform;
  document.body.appendChild(clone);

  // Trayectoria (a peticion del usuario, 2026-07-06): tiro parabolico real -
  // la cabeza sale disparada HACIA ARRIBA con fuerza (ease-out, desacelera
  // segun sube), alcanza un apice claro y despues CAE hacia abajo (ease-in,
  // acelera como la gravedad) hasta salir de pantalla. Deriva lateral y
  // apice aleatorios por cabeza para que ninguna repita el mismo recorrido.
  // Curva reducida a 3 puntos (antes 4): el keyframe intermedio generaba una
  // meseta cerca del apice que el usuario vio como un tiron/pausa.
  const apexY = -(window.innerHeight * (0.16 + Math.random() * 0.14)); // subida clara, aleatoria
  const driftX = (Math.random() * 2 - 1) * window.innerWidth * 0.16; // deriva lateral aleatoria (izq/der)
  const fallY = window.innerHeight - rect.top + rect.height + 80; // cae hasta salir por abajo
  const spin = (420 + Math.random() * 420) * (Math.random() < 0.5 ? -1 : 1);
  const duration = GUADANA_HEAD_FLY_BASE_MS + Math.random() * GUADANA_HEAD_FLY_RANDOM_MS;
  const apexOffset = 0.36 + Math.random() * 0.06; // el punto mas alto varia un poco por cabeza

  const riseEase = "cubic-bezier(0.16, 0.72, 0.3, 1)"; // sube fuerte y desacelera hacia el apice
  const fallEase = "cubic-bezier(0.5, 0, 0.82, 0.4)"; // el apice cae acelerando (gravedad)
  const anim = clone.animate(
    [
      { translate: "0px 0px", rotate: "0deg", opacity: 1, easing: riseEase },
      { translate: `${Math.round(driftX * apexOffset * 0.6)}px ${Math.round(apexY)}px`, rotate: `${Math.round(spin * apexOffset)}deg`, opacity: 1, offset: apexOffset, easing: fallEase },
      { translate: `${Math.round(driftX * 0.96)}px ${Math.round(fallY * 0.92)}px`, rotate: `${Math.round(spin * 0.96)}deg`, opacity: 1, offset: 0.92, easing: fallEase },
      { translate: `${Math.round(driftX)}px ${Math.round(fallY)}px`, rotate: `${Math.round(spin)}deg`, opacity: 0 }
    ],
    { duration, fill: "forwards" }
  );
  anim.onfinish = () => clone.remove();
  window.setTimeout(() => clone.remove(), duration + 600);

  // Destello de impacto: pista CORTA e independiente, solo filter, para no
  // mezclar una propiedad de repintado (no compuesta) con la larga animacion
  // de transform/opacity de arriba - separarlas evita el tiron visual.
  clone.animate(
    [{ filter: "brightness(1.85)" }, { filter: "brightness(1)" }],
    { duration: Math.min(220, Math.round(duration * 0.2)), fill: "forwards" }
  );
}

function spawnGuadanaForegroundHead(head) {
  const { headImg, rect } = head;
  if (!headImg || !rect || !rect.width || !rect.height) return null;
  const clone = document.createElement("img");
  clone.className = "guadana-head-foreground guadana-head-tremor";
  clone.src = headImg.currentSrc || headImg.src;
  clone.alt = "";
  clone.draggable = false;
  clone.setAttribute("aria-hidden", "true");
  clone.style.left = rect.left + "px";
  clone.style.top = rect.top + "px";
  clone.style.width = rect.width + "px";
  clone.style.height = rect.height + "px";
  clone.style.objectFit = "contain";
  clone.style.objectPosition = "center center";
  const baseTransform = window.getComputedStyle(headImg).transform;
  if (baseTransform && baseTransform !== "none") clone.style.transform = baseTransform;
  document.body.appendChild(clone);
  return clone;
}

function spawnGuadanaBladeSlash(head) {
  const { headImg, reelId, rect } = head;
  if (!headImg || !rect || !rect.width || !rect.height) return null;
  const blade = document.createElement("img");
  blade.className = "guadana-blade-slash";
  blade.src = GUADANA_BLADE_ASSET;
  blade.alt = "";
  blade.draggable = false;
  blade.setAttribute("aria-hidden", "true");

  const mirrored = /-left$/.test(reelId || "");
  const width = Math.max(82, Math.min(220, rect.width * 0.76));
  const height = width * 1.685;
  const neckX = rect.left + rect.width * (mirrored ? 0.38 : 0.64);
  const neckY = rect.top + rect.height * 0.45;
  const baseX = neckX - width * (mirrored ? 0.48 : 0.52);
  const baseY = neckY - height * 0.50;

  blade.style.left = baseX + "px";
  blade.style.top = baseY + "px";
  blade.style.width = width + "px";
  blade.style.height = height + "px";
  blade.style.transformOrigin = mirrored ? "42% 54%" : "58% 54%";
  if (mirrored) blade.style.scale = "-1 1";
  document.body.appendChild(blade);

  const dir = mirrored ? -1 : 1;
  const lineCutX = Math.round(dir * rect.width * 0.08);
  const lineCutY = Math.round(rect.height * 0.012);
  const recoilX = Math.round(-dir * rect.width * 0.24);
  const recoilY = Math.round(-rect.height * 0.06);
  const slashX = Math.round(dir * rect.width * 0.46);
  const slashY = Math.round(rect.height * 0.14);
  const dropY = Math.round(rect.height * 0.72);
  const cutOffset = Math.max(0.66, Math.min(0.78, (GUADANA_HEAD_TREMOR_MS - 560) / (GUADANA_HEAD_TREMOR_MS + 460)));
  const separateOffset = Math.max(cutOffset + 0.07, Math.min(0.86, (GUADANA_HEAD_TREMOR_MS - 240) / (GUADANA_HEAD_TREMOR_MS + 460)));
  const hitOffset = Math.max(separateOffset + 0.055, Math.min(0.94, GUADANA_HEAD_TREMOR_MS / (GUADANA_HEAD_TREMOR_MS + 460)));

  const anim = blade.animate([
    {
      translate: `${Math.round(-dir * rect.width * 0.24)}px ${Math.round(-rect.height * 0.08)}px`,
      rotate: `${dir * -16}deg`,
      opacity: 0,
      filter: "blur(12px) brightness(0.86)",
      offset: 0,
      easing: "cubic-bezier(.2,.72,.22,1)"
    },
    {
      translate: "0px 0px",
      rotate: `${dir * -5}deg`,
      opacity: 0.84,
      filter: "blur(4px) brightness(0.98)",
      offset: 0.18,
      easing: "cubic-bezier(.18,.7,.28,1)"
    },
    {
      translate: `${lineCutX}px ${lineCutY}px`,
      rotate: `${dir * 7}deg`,
      opacity: 0.95,
      filter: "blur(1.2px) brightness(1.1)",
      offset: cutOffset,
      easing: "cubic-bezier(.28,0,.72,1)"
    },
    {
      translate: `${recoilX}px ${recoilY}px`,
      rotate: `${dir * -24}deg`,
      opacity: 1,
      filter: "blur(0.8px) brightness(1.2)",
      offset: separateOffset,
      easing: "cubic-bezier(.13,.72,.18,1)"
    },
    {
      translate: `${slashX}px ${slashY}px`,
      rotate: `${dir * 34}deg`,
      opacity: 1,
      filter: "blur(0px) brightness(1.48)",
      offset: hitOffset,
      easing: "cubic-bezier(.04,.92,.08,1)"
    },
    {
      translate: `${Math.round(slashX * 1.12)}px ${Math.round(slashY + dropY)}px`,
      rotate: `${dir * 42}deg`,
      opacity: 0,
      filter: "blur(14px) brightness(0.78)",
      offset: 1
    }
  ], {
    duration: GUADANA_HEAD_TREMOR_MS + 460,
    fill: "forwards"
  });
  anim.onfinish = () => blade.remove();
  window.setTimeout(() => blade.remove(), GUADANA_HEAD_TREMOR_MS + 1000);
  return blade;
}

function spawnGuadanaCutDust(head) {
  const { rect } = head;
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height * 0.46;
  const colors = ["#3a3028", "#565048", "#2c2620", "#cfc5b0", "#8a7f6a"];
  const count = 6;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "guadana-dust";
    const size = 3 + Math.random() * 4;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = originX + "px";
    p.style.top = originY + "px";
    p.style.background = colors[i % colors.length];
    document.body.appendChild(p);
    const a = Math.random() * Math.PI * 2;
    const d = 22 + Math.random() * 46;
    const anim = p.animate(
      [
        { translate: "0px 0px", opacity: 0.9, scale: "1" },
        { translate: `${Math.round(Math.cos(a) * d)}px ${Math.round(Math.sin(a) * d + 14)}px`, opacity: 0, scale: "0.4" }
      ],
      { duration: 380 + Math.random() * 260, easing: "cubic-bezier(0.2, 0.7, 0.4, 1)", fill: "forwards" }
    );
    anim.onfinish = () => p.remove();
    window.setTimeout(() => p.remove(), 900);
  }
}

// Rect en pantalla del rodillo del esternon (donde vive la imagen de la
// guadaña durante esta secuencia).
function guadanaSternumRect() {
  const reel = reelByIdForLock("sternum");
  const el = reel && (reel.laneEl || reel.el);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return rect.width && rect.height ? rect : null;
}

// Fase 1: latido de luz roja sobre el esternon mientras suena la linea roja
// del cuello. El audio (guadana_neck_line) repite su patron cada ~1.8s con dos
// acentos por ciclo => pulso de 900ms para que la luz respire con la musica.
// mix-blend screen: ilumina la guadaña sin taparla.
function spawnGuadanaSternumPulseGlow() {
  const rect = guadanaSternumRect();
  if (!rect) return null;
  const glow = document.createElement("div");
  glow.className = "guadana-sternum-pulse";
  glow.style.left = rect.left + "px";
  glow.style.top = rect.top + "px";
  glow.style.width = rect.width + "px";
  glow.style.height = rect.height + "px";
  document.body.appendChild(glow);
  return glow;
}

// Fase 2 (corte): dos manchas de sangre en X sobre la guadaña del esternon,
// con el MISMO generador organico de las lineas de pago (cuerpo de grosor
// variable + salpicaduras + revelado siguiendo el trazo).
function spawnGuadanaSternumBloodX() {
  const rect = guadanaSternumRect();
  if (!rect) return;
  // Desde el 2026-10-16, dos tajos de sangre humeda con rociada, charco y
  // goterones (src/fx/guadana-blood-x.js). Lo de abajo queda de respaldo.
  if (window.OssuaryGuadanaBloodX) {
    window.OssuaryGuadanaBloodX.spawn(rect);
    return;
  }
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "guadana-sternum-blood-x");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));
  svg.style.left = rect.left + "px";
  svg.style.top = rect.top + "px";
  const defs = createPaylineSvgDefs(svg, w, h);
  const inset = 0.14;
  const diagonals = [
    [
      { x: w * inset, y: h * (inset + 0.06) },
      { x: w * 0.5, y: h * 0.5 },
      { x: w * (1 - inset), y: h * (1 - inset - 0.06) }
    ],
    [
      { x: w * (1 - inset), y: h * (inset + 0.06) },
      { x: w * 0.5, y: h * 0.5 },
      { x: w * inset, y: h * (1 - inset - 0.06) }
    ]
  ];
  const stamp = Date.now();
  diagonals.forEach((points, i) => {
    const geo = bloodPaylineSamples(points);
    appendBloodSplatPayline(svg, defs, geo, "guadana-x-" + stamp + "-" + i, 360);
  });
  document.body.appendChild(svg);
  // La salpicadura se seca y desaparece sola pasado el impacto.
  window.setTimeout(() => {
    svg.style.transition = "opacity 700ms ease";
    svg.style.opacity = "0";
    window.setTimeout(() => svg.remove(), 760);
  }, 2600);
}

function playGuadanaHeadsCutSequence() {
  if (!isNormalFreeSpinBonusActive()) return false;
  const heads = collectBonusModeSkeletonHeads();
  if (!heads.length) return false;
  const headAmounts = guadanaHeadAmounts(heads);
  const headsPayout = Math.round(headAmounts.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
  const headsPayoutSpinId = state.currentSpinId;

  // Fase 1: temblor de anticipacion + linea de corte pulsando en el cuello.
  const cutLines = [];
  const foregroundHeads = [];
  const blades = [];
  heads.forEach((head) => {
    head.headImg.classList.add("guadana-head-tremor");
    cutLines.push(spawnGuadanaCutLine(head.sourceEl, head.reelId));
    const foregroundHead = spawnGuadanaForegroundHead(head);
    if (foregroundHead) foregroundHeads.push(foregroundHead);
    const blade = spawnGuadanaBladeSlash(head);
    if (blade) blades.push(blade);
  });
  const sternumPulseGlow = spawnGuadanaSternumPulseGlow();
  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger("guadana_neck_line_started", { heads: heads.length });
  }

  // Fase 2 (fin del temblor): impacto seco + salida despedida + polvo.
  window.setTimeout(() => {
    if (window.OssuaryAudio) {
      window.OssuaryAudio.trigger("guadana_neck_line_stopped", { heads: heads.length });
      window.OssuaryAudio.trigger("guadana_neck_cut", { heads: heads.length });
    }
    cutLines.forEach((line) => line.remove());
    foregroundHeads.forEach((foregroundHead) => foregroundHead.remove());
    if (sternumPulseGlow) sternumPulseGlow.remove();
    spawnGuadanaSternumBloodX();
    heads.forEach((head) => {
      head.headImg.classList.remove("guadana-head-tremor");
      // Rect fresco por si el layout se movio durante el temblor.
      const freshRect = head.headImg.getBoundingClientRect();
      if (freshRect.width && freshRect.height) head.rect = freshRect;
      head.headImg.classList.add("guadana-head-cut-hidden");
      head.sourceEl.classList.remove("guadana-impact-shake");
      void head.sourceEl.offsetWidth;
      head.sourceEl.classList.add("guadana-impact-shake");
      window.setTimeout(() => head.sourceEl.classList.remove("guadana-impact-shake"), 220);
      launchGuadanaHeadClone(head);
      spawnGuadanaCutDust(head);
    });
    // Como la guillotina (2026-10-16): golpe, sangre en cada cuello y el
    // precio de cada cabeza en cifras de oro que vuela al WIN.
    if (window.OssuaryGuillotineDrop) {
      window.OssuaryGuillotineDrop.shakeMachine(0.7);
      window.OssuaryGuillotineDrop.flash("blood");
    }
    beginCutPrize(headAmounts.map((item) => item.amount));
    headAmounts.forEach((item) => launchCutPrize([{ rect: item.head.rect }], item.amount));
    applyGuadanaHeadsPayout(headsPayout, headsPayoutSpinId);
    feedBonusHandBoxWithHeads(headAmounts);
  }, GUADANA_HEAD_TREMOR_MS);
  return true;
}

// Las cabezas de la guadana tambien llenan la caja (peticion del usuario,
// 2026-10-16: "que la cuchilla multiplicadora evolucione mas rapido"): una
// brasa por cabeza vuela del cuello a la caja y el contador sube con ellas.
// Con la ultima vela (el bonus se acaba salvo Ultimo Aliento) se suman de
// golpe, sin el conteo animado que retiene la siguiente tirada.
function feedBonusHandBoxWithHeads(headAmounts) {
  const count = headAmounts.length;
  if (!count || !isNormalFreeSpinBonusActive()) return;
  const tension = window.OssuaryExecutionTension;
  const boxEl = bonusHandBoxEl && !bonusHandBoxEl.hidden ? bonusHandBoxEl : null;
  if (tension && boxEl) {
    headAmounts.forEach((item, i) => tension.emberToBox(item.head.rect, boxEl, 120 + i * 90));
  }
  if ((state.bonusModeSpinsRemaining || 0) > 0) {
    window.setTimeout(() => {
      if (isNormalFreeSpinBonusActive()) startBonusHandCountAnimation(count);
    }, speedMs(720));
  } else {
    addBonusHands(count);
  }
}

// Limpieza visual ligera: las cabezas cortadas permanecen ocultas mientras su
// esqueleto siga bloqueado; solo se limpian residuos instantaneos.
function cleanupGuadanaTransientFx() {
  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger("guadana_neck_line_stopped", {});
  }
  document.querySelectorAll(".guadana-cut-line, .guadana-dust, .guadana-blade-slash, .guadana-head-foreground, .guadana-sternum-pulse, .guadana-sternum-blood-x").forEach((el) => el.remove());
}

function bonusHandBoxLevelDef() {
  const maxIndex = BONUS_HAND_BOX_LEVELS.length - 1;
  const index = Math.max(0, Math.min(state.bladeLevel || 0, maxIndex));
  return BONUS_HAND_BOX_LEVELS[index];
}

// Simula sumar `amount` manos una a una desde (startLevel, startCount) y
// devuelve la lista de estados intermedios a mostrar, en orden. Al completar
// un nivel se emiten DOS frames: el nivel lleno (p.ej. 5/5, aun con el
// multiplicador viejo) y el arranque del siguiente (0/10, ya con el nuevo
// multiplicador) - asi el jugador ve el salto en vez de brincar al final.
function buildBonusHandFrames(startLevel, startCount, amount) {
  const maxLevel = BONUS_HAND_BOX_LEVELS.length - 1;
  let level = Math.max(0, Math.min(startLevel || 0, maxLevel));
  let count = startCount || 0;
  const frames = [];
  const frameFor = (lvl, cnt, blade) => ({
    level: lvl,
    count: cnt,
    target: BONUS_HAND_BOX_LEVELS[lvl].target,
    // Multiplicador MOSTRADO en la caja = premio del nivel actual (el proximo a
    // recoger). NO paga hasta pegarse a la guillotina.
    boxMultiplier: BONUS_HAND_BOX_LEVELS[lvl].multiplier,
    // Multiplicador PEGADO a la guillotina (el que paga el corte).
    bladeMultiplier: blade,
    pulse: true,
    levelUpHold: false
  });
  for (let i = 0; i < amount; i++) {
    const target = BONUS_HAND_BOX_LEVELS[level].target;
    if (level >= maxLevel && count >= target) {
      // Todo coleccionado: x100 ya pegado a la guillotina, nada mas que recoger.
      continue;
    }
    count += 1;
    if (count < target) {
      frames.push(frameFor(level, count, bonusBladeStuckForLevel(level)));
    } else {
      // Contador completado: frame lleno (el premio AUN en la caja, guillotina
      // todavia con el multiplicador viejo)...
      frames.push(frameFor(level, target, bonusBladeStuckForLevel(level)));
      frames[frames.length - 1].levelUpHold = true;
      // ...y el premio "sube a la guillotina": se pega (pasa a pagar) y la caja
      // muestra el siguiente premio. Al nivel maximo la caja se queda topada
      // con x100 ya pegado.
      const stuck = BONUS_HAND_BOX_LEVELS[level].multiplier;
      if (level < maxLevel) {
        level += 1;
        count = 0;
        frames.push(frameFor(level, 0, stuck));
      } else {
        count = target;
        frames.push(frameFor(level, target, stuck));
      }
    }
  }
  return frames;
}

function applyBonusHandFrame(frame) {
  const prevBlade = state.bladeMultiplier || 1;
  state.bladeLevel = frame.level;
  state.bonusHandCount = frame.count;
  state.bonusHandTarget = frame.target;
  state.bonusHandBoxMultiplier = frame.boxMultiplier;
  state.bladeMultiplier = frame.bladeMultiplier;
  updateBonusHandBoxUI();
  if (frame.pulse) {
    triggerBonusHandBoxPulse();
    triggerBonusHandBoxCounterFlash();
  }
  // Al completar el contador, el multiplicador recien recogido "sube a la
  // guillotina y se pega": animacion de vuelo desde la caja hasta la hoja, que
  // deja pegado el badge (sustituyendo al anterior). El badge es hijo del blade
  // del rig, asi que a partir de ahi hace lo que hace la hoja (baja/sube/reposa).
  if (frame.bladeMultiplier > prevBlade) {
    triggerBonusMultiplierLevelupSound(frame.bladeMultiplier);
    playBonusMultiplierRiseToBlade(frame.bladeMultiplier);
  }
}

// Dispara el evento de audio de "sube de nivel" una sola vez por valor (evita
// que suene dos veces si ya se disparo por adelantado desde el step() del
// conteo animado, ver BONUS_MULTIPLIER_LEVELUP_SOUND_LEAD_MS).
function triggerBonusMultiplierLevelupSound(value) {
  if (bonusMultiplierLevelupSoundLastValue === value) return;
  bonusMultiplierLevelupSoundLastValue = value;
  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger("bonus_multiplier_levelup", { bladeMultiplier: value });
  }
}

function triggerBonusHandBoxPulse() {
  if (!bonusHandBoxEl) return;
  bonusHandBoxEl.classList.remove("bonus-hand-box--pulse");
  void bonusHandBoxEl.offsetWidth;
  bonusHandBoxEl.classList.add("bonus-hand-box--pulse");
  if (bonusHandBoxPulseTimer) window.clearTimeout(bonusHandBoxPulseTimer);
  bonusHandBoxPulseTimer = window.setTimeout(() => {
    bonusHandBoxEl.classList.remove("bonus-hand-box--pulse");
    bonusHandBoxPulseTimer = 0;
  }, BONUS_HAND_COUNT_PULSE_MS + 40);
}

// Pequeno flash de brillo en el propio numero del contador (0/5 -> 1/5, etc.,
// incluido el salto de fase 0/5 -> 0/10). Puramente cosmetico, no toca el
// valor ni el timing del conteo real.
function triggerBonusHandBoxCounterFlash() {
  if (!bonusHandBoxCounterValueEl) return;
  bonusHandBoxCounterValueEl.classList.remove("bonus-hand-box__counter-value--flash");
  void bonusHandBoxCounterValueEl.offsetWidth;
  bonusHandBoxCounterValueEl.classList.add("bonus-hand-box__counter-value--flash");
  if (bonusHandBoxCounterFlashTimer) window.clearTimeout(bonusHandBoxCounterFlashTimer);
  bonusHandBoxCounterFlashTimer = window.setTimeout(() => {
    bonusHandBoxCounterValueEl.classList.remove("bonus-hand-box__counter-value--flash");
    bonusHandBoxCounterFlashTimer = 0;
  }, BONUS_HAND_COUNT_FLASH_MS + 40);
}

function playBonusHandBoxLevelUpEmphasis() {
  if (!bonusHandBoxEl || !bonusHandBoxMultiplierEl) return;
  bonusHandBoxEl.classList.remove("bonus-hand-box--levelup");
  bonusHandBoxMultiplierEl.classList.remove("bonus-hand-box__multiplier--levelup");
  void bonusHandBoxMultiplierEl.offsetWidth;
  bonusHandBoxEl.classList.add("bonus-hand-box--levelup");
  bonusHandBoxMultiplierEl.classList.add("bonus-hand-box__multiplier--levelup");
}

function stopAllBladeBonusMedia() {
  document.querySelectorAll(".symbol-video-overlay").forEach((video) => {
    try {
      video.__ossuaryStopped = true;
      video.muted = true;
      video.volume = 0;
      video.pause();
      video.currentTime = 0;
    } catch (_) {}
  });
}

// Vuelo del multiplicador desde la caja de manos hasta la hoja (guillotina),
// donde se queda pegado. REDISEÑO DE FLUIDEZ (2026-07-05, a peticion del
// usuario): el vuelo ya no apunta a una foto fija del destino tomada al
// despegar (la cuchilla podia seguir moviendose y el badge aparecia en otro
// sitio; para disimularlo se congelaba el rig 320ms, otro parche anti-fluido,
// eliminado). Ahora:
//   1. Una SONDA invisible (mismo CSS que el badge definitivo) se cuelga del
//      anchor actual y se re-engancha si el anchor cambia en pleno vuelo
//      (rig -> pieza real): da en vivo el centro y tamano EXACTOS donde va a
//      aparecer el badge, aunque la hoja siga bajando/subiendo.
//   2. El vuelo persigue esa sonda frame a frame (rAF), con easing de
//      aceleracion (arranca suave, LLEGA lanzado = impacto), encogiendo en el
//      aire desde el tamano de la caja hasta el tamano final del badge: el
//      intercambio vuelo->badge es un morph continuo, sin salto de tamano.
//   3. Al llegar: badge definitivo con flash de impacto (retroceso + onda) y
//      destello en el arte de la hoja (solo filter, cero transforms).
function playBonusMultiplierRiseToBlade(value) {
  if (!bonusHandBoxMultiplierEl || !bonusHandBoxMultiplierEl.getBoundingClientRect) return;
  const boxRect = bonusHandBoxMultiplierEl.getBoundingClientRect();
  if (!boxRect.width) return;
  state.bonusBladeLevelUpPending = true;
  const FLY_MS = 460;
  const fromX = boxRect.left + boxRect.width / 2;
  const fromY = boxRect.top + boxRect.height / 2;

  // Sonda de destino (invisible): mismo elemento/clase que el badge final.
  const probe = document.createElement("div");
  probe.className = "bonus-hand-box-blade-multiplier";
  paintGoldNumber(probe, "x" + value);
  probe.style.visibility = "hidden";
  let probeAnchor = null;
  let lastTarget = { x: fromX, y: fromY - boxRect.height * 5, h: boxRect.height };
  const readTarget = function () {
    const anchor = currentBladeBadgeAnchorEl();
    if (anchor && anchor !== probeAnchor) {
      probeAnchor = anchor;
      anchor.appendChild(probe);
    }
    if (probeAnchor && probe.parentNode) {
      const r = probe.getBoundingClientRect();
      if (r.height) lastTarget = { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
    }
    return lastTarget;
  };

  const fly = document.createElement("div");
  fly.className = "bonus-multiplier-fly bonus-multiplier-fly--flash";
  paintGoldNumber(fly, "x" + value);
  fly.style.left = fromX + "px";
  fly.style.top = fromY + "px";
  fly.style.transition = "none"; // el movimiento lo lleva el rAF, no CSS
  fly.style.opacity = "1";
  document.body.appendChild(fly);
  const flyRect = fly.getBoundingClientRect();
  const flyH = flyRect.height || 1;
  readTarget();

  const startAt = performance.now();
  const stick = function () {
    state.bonusBladeAttachedMultiplier = value;
    state.bonusBladeLevelUpPending = false;
    if (probe.parentNode) probe.parentNode.removeChild(probe);
    syncBonusBladeAttachedMultiplierUI({ flash: true });
    if (fly.parentNode) fly.parentNode.removeChild(fly);
    // Impacto en la hoja: destello del arte (filter puro: no compite con los
    // transforms animados del rig ni con el transform propio del arte real).
    const anchor = currentBladeBadgeAnchorEl();
    const impactImg = anchor && anchor.querySelector && anchor.querySelector("img");
    if (impactImg) {
      impactImg.classList.remove("bonus-blade-impact-img");
      void impactImg.offsetWidth;
      impactImg.classList.add("bonus-blade-impact-img");
      window.setTimeout(function () {
        impactImg.classList.remove("bonus-blade-impact-img");
      }, 340);
    }
    if (window.OssuaryAudio) {
      window.OssuaryAudio.trigger("bonus_multiplier_stuck_blade", { bladeMultiplier: value });
    }
  };
  const step = function (now) {
    const p = Math.min(1, (now - startAt) / FLY_MS);
    // easeInQuad: sale suave de la caja y ACELERA hacia la hoja (impacto).
    const e = p * p;
    const target = readTarget();
    const x = fromX + (target.x - fromX) * e;
    const y = fromY + (target.y - fromY) * e;
    const scale = 1 + (target.h / flyH - 1) * e;
    fly.style.transform = "translate(-50%, -50%) translate(" + (x - fromX) + "px, " + (y - fromY) + "px) scale(" + scale + ")";
    if (p >= 1) {
      stick();
      return;
    }
    window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

function stopBonusHandCountAnim() {
  if (bonusHandCountAnimTimer) {
    window.clearTimeout(bonusHandCountAnimTimer);
    bonusHandCountAnimTimer = 0;
  }
  if (bonusMultiplierLevelupSoundTimer) {
    window.clearTimeout(bonusMultiplierLevelupSoundTimer);
    bonusMultiplierLevelupSoundTimer = 0;
  }
  bonusHandBoxLevelUpBusy = false;
}

// Corta cualquier conteo en curso y salta a su estado final (defensa por si
// el jugador dispara otro corte/spin antes de que termine la animacion: el
// pago siguiente debe leer un multiplicador ya definitivo).
function flushBonusHandCountAnim() {
  stopBonusHandCountAnim();
  if (bonusHandCountFrames && bonusHandCountFrames.length) {
    applyBonusHandFrame(bonusHandCountFrames[bonusHandCountFrames.length - 1]);
  }
  bonusHandCountFrames = null;
  bonusHandCountIndex = 0;
}

// Suma manos de forma INMEDIATA (sin animacion) - usado en el camino de
// fallback cuando no hay secuencia visual de cuchilla.
function addBonusHands(amount) {
  if (!(amount > 0) || !isNormalFreeSpinBonusActive()) return;
  flushBonusHandCountAnim();
  const frames = buildBonusHandFrames(state.bladeLevel || 0, state.bonusHandCount || 0, amount);
  if (frames.length) applyBonusHandFrame(frames[frames.length - 1]);
}

// Arranca el conteo VISUAL mano a mano tras el corte de la cuchilla. Solo se
// llama DESPUES de que la cuchilla haya bajado y cortado (ver
// triggerBonusModeSternumBladeCut / runGuillotineChainCuts), nunca al
// aparecer la cuchilla.
function startBonusHandCountAnimation(amount) {
  flushBonusHandCountAnim();
  if (!(amount > 0) || !isNormalFreeSpinBonusActive()) return;
  const frames = buildBonusHandFrames(state.bladeLevel || 0, state.bonusHandCount || 0, amount);
  if (!frames.length) {
    bonusHandBoxLevelUpBusy = false;
    if (!state.spinning) {
      state.busy = false;
    }
    return;
  }
  bonusHandBoxLevelUpBusy = true;
  state.busy = true;
  bonusHandCountFrames = frames;
  bonusHandCountIndex = 0;
  const step = () => {
    if (!bonusHandCountFrames) return;
    const frame = bonusHandCountFrames[bonusHandCountIndex];
    applyBonusHandFrame(frame);
    bonusHandCountIndex += 1;
    if (bonusHandCountIndex >= bonusHandCountFrames.length) {
      bonusHandCountFrames = null;
      bonusHandCountAnimTimer = 0;
      bonusHandBoxLevelUpBusy = false;
      if (!state.spinning) {
        state.busy = false;
        // Fresh Spin automatico: si el conteo de manos era lo ultimo que
        // mantenia state.busy, reengancha la cadena de tiradas del bonus
        // (scheduleAutoSpin ya salio en no-op cuando se llamo con busy=true).
        scheduleAutoSpin();
      }
      return;
    }
    const delayMs = frame.levelUpHold ? BONUS_HAND_LEVELUP_HOLD_MS : BONUS_HAND_COUNT_STEP_MS;
    if (frame.levelUpHold) {
      playBonusHandBoxLevelUpEmphasis();
      const nextFrame = bonusHandCountFrames[bonusHandCountIndex];
      if (nextFrame && nextFrame.bladeMultiplier > frame.bladeMultiplier) {
        const soundDelayMs = Math.max(0, delayMs - BONUS_MULTIPLIER_LEVELUP_SOUND_LEAD_MS);
        bonusMultiplierLevelupSoundTimer = window.setTimeout(function () {
          bonusMultiplierLevelupSoundTimer = 0;
          triggerBonusMultiplierLevelupSound(nextFrame.bladeMultiplier);
        }, soundDelayMs);
      }
    }
    bonusHandCountAnimTimer = window.setTimeout(step, delayMs);
  };
  step();
}

function resetBonusHandBoxState() {
  flushBonusHandCountAnim();
  bonusHandCountFrames = null;
  state.bladeLevel = 0;
  state.bonusHandCount = 0;
  state.bonusHandTarget = BONUS_HAND_BOX_LEVELS[0].target;
  // Guillotina vacia (x1, aun no se completo ningun nivel); la caja muestra el
  // primer premio a recoger (x2).
  state.bladeMultiplier = 1;
  state.bonusBladeAttachedMultiplier = 1;
  state.bonusBladeLevelUpPending = false;
  state.bonusHandBoxMultiplier = BONUS_HAND_BOX_LEVELS[0].multiplier;
  state.bonusModeBladeCutMultiplier = 1;
  state.bonusModePendingHandCount = 0;
  bonusMultiplierLevelupSoundLastValue = 0;
  updateBonusHandBoxUI();
  syncBonusBladeAttachedMultiplierUI();
}

// Caja azul provisional bajo el esternon, entre rib5-left y rib5-right.
// Coordenadas en el mismo sistema de referencia que layout.config.js
// (centro 762,597 - misma fila que rib5, mismo eje que el esternon),
// convertidas a % como hace reel-renderer.js. Se ancla a #slotStage (misma
// geometria que #reelLayer) y NO a reelLayer: dentro de reelLayer (z:2) la
// caja quedaria tapada por .structure-overlay (z:3, el arte de la caja
// toracica); en el stage puede pintarse por encima (z:4 en style.css).
function ensureBonusHandBoxEl() {
  if (bonusHandBoxEl) return bonusHandBoxEl;
  const el = document.createElement("div");
  el.className = "bonus-hand-box";
  el.hidden = true;
  el.style.left = ((762 / 1525) * 100) + "%";
  el.style.top = ((607 / 779) * 100) + "%";
  el.style.width = ((221 / 1525) * 100) + "%";
  el.style.height = ((149 / 779) * 100) + "%";
  const crateBack = document.createElement("img");
  crateBack.className = "bonus-hand-box__crate bonus-hand-box__crate--back";
  crateBack.alt = "";
  crateBack.decoding = "async";
  const crateFront = document.createElement("img");
  crateFront.className = "bonus-hand-box__crate bonus-hand-box__crate--front is-active";
  crateFront.alt = "";
  crateFront.decoding = "async";
  el.appendChild(crateBack);
  el.appendChild(crateFront);
  const counter = document.createElement("div");
  counter.className = "bonus-hand-box__counter";
  const counterValue = document.createElement("span");
  counterValue.className = "bonus-hand-box__counter-value";
  const counterTarget = document.createElement("span");
  counterTarget.className = "bonus-hand-box__counter-target";
  counter.appendChild(counterValue);
  counter.appendChild(counterTarget);
  const multiplier = document.createElement("div");
  multiplier.className = "bonus-hand-box__multiplier";
  el.appendChild(counter);
  el.appendChild(multiplier);
  // Montada DENTRO de #structureOverlay (no en #slotStage) para que herede el
  // mismo transform de impacto/escala que rodillos + arte torácico: la caja
  // recibe el aumento/disminución de la estructura igual que el resto, porque
  // structureOverlay esta en machineBlockEls (ver giant-symbol-renderer.js).
  // Misma geometria: structureOverlay es inset:0, igual que #slotStage.
  (structureOverlayEl || stage).appendChild(el);
  bonusHandBoxEl = el;
  bonusHandBoxCrateBackEl = crateBack;
  bonusHandBoxCrateFrontEl = crateFront;
  bonusHandBoxCounterEl = counter;
  bonusHandBoxCounterValueEl = counterValue;
  bonusHandBoxCounterTargetEl = counterTarget;
  bonusHandBoxMultiplierEl = multiplier;
  bonusHandBoxActiveCrateLayer = "front";
  // Aspa y barra de oro de las cifras de la caja (paintGoldNumber) y letras
  // de los rotulos del bonus (src/fx/execution-tension.js), ya en memoria.
  if (window.OssuaryNumberFont && typeof window.OssuaryNumberFont.preloadLetters === "function") {
    window.OssuaryNumberFont.preloadLetters("x/+= BLOOD MARK MULTIPLIES THIS CUT ON LAST BREATH CHANCE");
  }
  return el;
}

// Arte de la caja segun el PORCENTAJE del objetivo actual (nunca por numero
// absoluto de manos, para que sirva con cualquier objetivo futuro):
//   < 10%          -> vacia
//   10% .. < 70%   -> media
//   >= 70%         -> llena
// Al subir de nivel el objetivo cambia y el progreso vuelve a ~0 -> vacia sola.
const BONUS_HAND_BOX_CRATE_SRC = {
  empty: "assets/symbols/crate_empty.png",
  half: "assets/symbols/crate_half.png",
  full: "assets/symbols/crate_full.png"
};

function bonusHandBoxCrateSrcForProgress(count, target) {
  const progress = target > 0 ? count / target : 0;
  if (progress > 0.7) return BONUS_HAND_BOX_CRATE_SRC.full;
  if (progress >= 0.1) return BONUS_HAND_BOX_CRATE_SRC.half;
  return BONUS_HAND_BOX_CRATE_SRC.empty;
}

function updateBonusHandBoxUI() {
  const el = ensureBonusHandBoxEl();
  const active = isNormalFreeSpinBonusActive();
  el.hidden = !active;
  if (!active) return;
  const levelDef = bonusHandBoxLevelDef();
  const count = state.bonusHandCount || 0;
  const target = state.bonusHandTarget || levelDef.target;
  paintGoldNumber(bonusHandBoxCounterValueEl, String(count));
  paintGoldNumber(bonusHandBoxCounterTargetEl, "/" + target);
  // La caja muestra el PROXIMO premio a recoger (no el que ya paga).
  paintGoldNumber(bonusHandBoxMultiplierEl, "x" + (state.bonusHandBoxMultiplier || levelDef.multiplier));
  const crateSrc = bonusHandBoxCrateSrcForProgress(count, target);
  const activeCrateEl = bonusHandBoxActiveCrateLayer === "front"
    ? bonusHandBoxCrateFrontEl
    : bonusHandBoxCrateBackEl;
  const inactiveCrateEl = bonusHandBoxActiveCrateLayer === "front"
    ? bonusHandBoxCrateBackEl
    : bonusHandBoxCrateFrontEl;
  if (activeCrateEl.getAttribute("src") !== crateSrc) {
    inactiveCrateEl.setAttribute("src", crateSrc);
    inactiveCrateEl.classList.add("is-active");
    activeCrateEl.classList.remove("is-active");
    bonusHandBoxActiveCrateLayer = bonusHandBoxActiveCrateLayer === "front" ? "back" : "front";
  }
}

function sternumTensionLevelForChances(chances) {
  if (!isNormalFreeSpinBonusActive()) return 0;
  if (chances === 1) return 2;
  if (chances === 2) return 1;
  return 0;
}

function sternumExtraCruiseMsForCurrentSpin() {
  if (!isNormalFreeSpinBonusActive()) return 0;
  var level = sternumTensionLevelForChances(state.bonusModeSpinStartChances);
  if (level === 2) return BONUS_MODE_STERNUM_TENSION.HIGH_CRUISE_EXTRA_MS || 360;
  if (level === 1) return BONUS_MODE_STERNUM_TENSION.MID_CRUISE_EXTRA_MS || 180;
  return 0;
}

function clearBonusModeSternumPresentationState() {
  state.bonusModeSpinStartChances = 0;
  state.bonusModeLastRestingTensionLevel = 0;
  clearBonusModeSternumLightState();
}

const bonusModeSternumLightFx = {
  state: "idle",
  level: 0,
  timer: 0
};

function applyBonusModeSternumLightState() {
  const sternumReel = reelByIdForLock("sternum");
  const targets = sternumReel
    ? [sternumReel.laneEl, sternumReel.continuousTrackEl, sternumReel.giantStripEl].filter(Boolean)
    : [];
  const stateName = bonusModeSternumLightFx.state || "idle";
  const level = Math.max(0, Math.min(2, bonusModeSternumLightFx.level || 0));
  targets.forEach(function (el) {
    el.classList.remove(
      "bonus-mode-sternum-light",
      "bonus-mode-sternum-light--waiting",
      "bonus-mode-sternum-light--fail",
      "bonus-mode-sternum-light--impact",
      "bonus-mode-sternum-light--reward",
      "bonus-mode-sternum-light--reward-fade",
      "bonus-mode-sternum-light--level-0",
      "bonus-mode-sternum-light--level-1",
      "bonus-mode-sternum-light--level-2"
    );
    if (stateName === "idle") {
      delete el.dataset.bonusLightState;
      delete el.dataset.bonusLightLevel;
      return;
    }
    el.classList.add("bonus-mode-sternum-light", "bonus-mode-sternum-light--" + stateName);
    el.classList.add("bonus-mode-sternum-light--level-" + level);
    el.dataset.bonusLightState = stateName;
    el.dataset.bonusLightLevel = String(level);
  });
}

function setBonusModeSternumLightState(nextState, level) {
  bonusModeSternumLightFx.state = nextState || "idle";
  bonusModeSternumLightFx.level = Math.max(0, Math.min(2, level || 0));
  applyBonusModeSternumLightState();
}

function clearBonusModeSternumLightTimer() {
  if (!bonusModeSternumLightFx.timer) return;
  window.clearTimeout(bonusModeSternumLightFx.timer);
  bonusModeSternumLightFx.timer = 0;
}

function clearBonusModeSternumLightState() {
  clearBonusModeSternumLightTimer();
  setBonusModeSternumLightState("idle", 0);
}

function syncBonusModeSternumWaitingLight() {
  if (!isNormalFreeSpinBonusActive()) {
    clearBonusModeSternumLightState();
    return;
  }
  var chances = state.spinning
    ? state.bonusModeSpinStartChances
    : state.bonusModeSpinsRemaining;
  setBonusModeSternumLightState("waiting", sternumTensionLevelForChances(chances));
}

function flashBonusModeSternumResultLight(resultState) {
  if (!isNormalFreeSpinBonusActive()) return;
  clearBonusModeSternumLightTimer();
  var remaining = Math.max(0, state.bonusModeSpinsRemaining || 0);
  var restingLevel = sternumTensionLevelForChances(remaining);
  if (resultState === "success") {
    setBonusModeSternumLightState("impact", restingLevel);
    bonusModeSternumLightFx.timer = window.setTimeout(function () {
      bonusModeSternumLightFx.timer = 0;
      setBonusModeSternumLightState("reward", restingLevel);
      bonusModeSternumLightFx.timer = window.setTimeout(function () {
        bonusModeSternumLightFx.timer = 0;
        setBonusModeSternumLightState("reward-fade", restingLevel);
        bonusModeSternumLightFx.timer = window.setTimeout(function () {
          bonusModeSternumLightFx.timer = 0;
          syncBonusModeSternumWaitingLight();
        }, 620);
      }, 900);
    }, 90);
    return;
  }

  setBonusModeSternumLightState("fail", restingLevel);
  bonusModeSternumLightFx.timer = window.setTimeout(function () {
    bonusModeSternumLightFx.timer = 0;
    if (remaining > 0) {
      syncBonusModeSternumWaitingLight();
      return;
    }
    clearBonusModeSternumLightState();
  }, 320);
}

// Rediseño FREE SPIN (a peticion del usuario, 2026-07-03): resuelve cada free
// spin del Bonus Game con la mecanica de 3 oportunidades.
// - Cada esqueleto (POBRE/NOBLE/RICO) que aterriza en una mitad de rib se
//   BLOQUEA en el tablero junto con sus manos (lockedReels/lockedSymbols ->
//   applyBonusLocks) y se acumula entre giros; los ya bloqueados se re-listan
//   para conservar su lock (applyBonusLocks nunca quita locks de otros).
// - Si el esternon queda vacio (sin cuchilla): no pasa nada mas - la
//   oportunidad ya se consumio en startSpin (consumeBaseSpin); si el contador
//   llego a 0, completeIfDepleted (handleBonusNextAction) termina el modo
//   inmediatamente SIN pagar los esqueletos restantes.
// - Si aterriza la cuchilla (BLADE_BONUS): se paga el premio provisional de
//   TODOS los esqueletos del tablero (BONUS_MODE_SKELETON_PRIZES, en multiplos
//   de la apuesta), se resetean las oportunidades a su maximo (restoreSpins:
//   reset a 3, NUNCA suma) y el corte/retirada visual lo dispara
//   triggerBonusModeSternumBladeCut desde handleBonusNextAction.
function resolveBonusModeFreeSpinResult() {
  const lockedReels = ["rib1"];
  const lockedSymbols = { rib1: "RIB_BONUS" };
  BONUS_MODE_HAND_CUT_REEL_IDS.forEach((reelId) => {
    const reel = reelByIdForLock(reelId);
    if (!reel) return;
    const symbol = reel.locked && reel.lockedSymbol ? reel.lockedSymbol : reel.giantSymbol;
    if (!BONUS_MODE_SKELETON_SYMBOLS.includes(symbol)) return;
    lockedReels.push(reelId);
    lockedSymbols[reelId] = symbol;
  });

  const sternumReel = reelByIdForLock("sternum");
  const bladeLanded = Boolean(
    sternumReel && BONUS_MODE_STERNUM_BLADE_SYMBOLS.includes(sternumReel.giantSymbol)
  );

  let bonusWinToPay = 0;
  let bladePayoutRows = [];
  if (bladeLanded) {
    // Cualquier conteo pendiente de un corte anterior se cierra antes de
    // calcular este pago, para leer un multiplicador definitivo.
    flushBonusHandCountAnim();
    // Marca de Sangre (src/bonus/execution-enhancers.js): a veces este corte
    // trae un multiplicador propio (x2..x10) que se suma al de la caja.
    state.bonusBloodMark = economicSpinPlan && economicSpinPlan.kind === "normal" ? economicSpinPlan.bloodMark : executionEnhancers
      ? executionEnhancers.rollBloodMark({ skeletons: lockedReels.length - 1 })
      : 1;
    // El pago del corte usa el multiplicador VIGENTE AHORA (antes de sumar las
    // manos de este mismo corte: la subida de nivel solo afecta a cortes
    // futuros). Premio = (suma de valores de esqueletos) × multiplicador.
    bladePayoutRows = buildBonusModeBladePayoutRows(lockedSymbols, state.bonusBloodMark);
    bonusWinToPay = Math.round(bladePayoutRows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
    state.bonusModeBladeCutMultiplier = (isNormalFreeSpinBonusActive() && state.bladeMultiplier) || 1;
    // Las manos NO se cuentan aqui (al aparecer la cuchilla). Se guardan y el
    // conteo visual arranca cuando la cuchilla TERMINA de bajar y cortar
    // (triggerBonusModeSternumBladeCut). Todos menos rib1 son esqueletos.
    state.bonusModePendingHandCount = Math.max(0, lockedReels.length - 1);
    bonusModeRuntime.noteBladeDrop();
    bonusModeRuntime.restoreSpins();
    deferBonusCandleRestore(state.bonusModeSpinsRemaining || 0);
  }

  return {
    phase: "BONUS_MODE_FREE_SPIN",
    newLockedReels: [],
    lockedReels,
    lockedSymbols,
    bladeLanded,
    label: "",
    suppressBaseWin: true,
    bonusWinToPay,
    bladePayoutRows,
    completed: false,
    returnToBase: false,
    holdLocks: false,
    nextAction: null,
    modePendingType: null
  };
}

function scheduleVisibleGiantInnerCut(reel, half, rib1Rect, rib1FallDistance, options) {
  if (!reel || !reel.giantPool) return;
  const sourceEl = reel.giantPool.find((el) => !el.hidden);
  const cutTargetSelector = options && options.cutTargetSelector
    ? options.cutTargetSelector
    : "img.symbol-art";
  const sourceTargetEl = sourceEl && sourceEl.querySelector(cutTargetSelector);
  if (!sourceEl || !sourceTargetEl) return;

  const rect = sourceEl.getBoundingClientRect();
  const targetMidY = rect.top + (rect.height / 2);
  const travelToCut = Math.max(0, targetMidY - rib1Rect.top);
  const progressToCut = rib1FallDistance > 0
    ? Math.max(0, Math.min(1, travelToCut / rib1FallDistance))
    : 0.5;
  const cutDelayMs = Math.max(70, Math.min(430, progressToCut * 620));
  window.setTimeout(function () {
    applyVisibleGiantInnerCut(sourceEl, half, options && options.cutLayer === "overlay" ? "overlay" : "art");
    spawnVisibleGiantInnerFallAway(sourceTargetEl, half, Boolean(options && options.cutWholeTarget));
  }, cutDelayMs);
}

function applyVisibleGiantInnerCut(sourceEl, half, cutLayer) {
  if (!sourceEl) return;
  sourceEl.classList.remove(
    "bonus-inner-cut--left",
    "bonus-inner-cut--right",
    "bonus-inner-cut-flash",
    "bonus-inner-cut-overlay-hidden"
  );
  if (cutLayer === "overlay") {
    sourceEl.classList.add("bonus-inner-cut-overlay-hidden");
  } else {
    sourceEl.classList.add(half === "right" ? "bonus-inner-cut--right" : "bonus-inner-cut--left");
    sourceEl.classList.add("bonus-inner-cut-flash");
  }
  if (sourceEl.dataset) {
    sourceEl.dataset.handsCut = "1";
    sourceEl.dataset.cutBlockRef = sourceEl.dataset.blockRef || "";
  }
  if (sourceEl.bonusInnerCutFlashTimer) {
    window.clearTimeout(sourceEl.bonusInnerCutFlashTimer);
  }
  sourceEl.bonusInnerCutFlashTimer = window.setTimeout(function () {
    sourceEl.classList.remove("bonus-inner-cut-flash");
    sourceEl.bonusInnerCutFlashTimer = 0;
  }, 220);
}

function spawnVisibleGiantInnerFallAway(sourceTargetEl, half, cutWholeTarget) {
  if (!sourceTargetEl) return;
  const rect = sourceTargetEl.getBoundingClientRect();
  const sourceTrackEl = sourceTargetEl.closest ? sourceTargetEl.closest(".giant-strip-track") : null;
  const reelId = sourceTrackEl && sourceTrackEl.dataset ? sourceTrackEl.dataset.reel : "";
  const halfWidth = rect.width / 2;
  const left = cutWholeTarget
    ? rect.left
    : (half === "right" ? rect.left + halfWidth : rect.left);
  const fallDistance = window.innerHeight - rect.top + rect.height;

  const shard = document.createElement("div");
  shard.className = "rib-bonus-half-fallaway";
  shard.dataset.direction = half === "right" ? "right" : "left";
  shard.style.left = left + "px";
  shard.style.top = rect.top + "px";
  shard.style.width = (cutWholeTarget ? rect.width : halfWidth) + "px";
  shard.style.height = rect.height + "px";
  shard.style.setProperty("--fallaway-distance", fallDistance + "px");
  // A peticion del usuario: el salto hacia arriba antes de caer debe
  // respetar la altura REAL en pantalla de cada fila (rib1..rib5 no miden
  // lo mismo) en vez de un valor fijo en px igual para todas - una fila
  // pequeña (p.ej. rib5) ya no salta tan alto como una grande. Proporcional
  // a rect.height, con las mismas keyframes de siempre (rib-bonus-half-
  // fallaway-left/right-anim en style.css), que ahora leen estas 2
  // variables en vez de -18px/-50px fijos (con esos mismos valores como
  // fallback si no se fijan, por compatibilidad con cualquier otro uso).
  let hopBoost = 1;
  if (reelId === "rib4-left" || reelId === "rib4-right") {
    hopBoost = 1.7;
  } else if (reelId === "rib5-left" || reelId === "rib5-right") {
    hopBoost = 2.1;
  }
  shard.style.setProperty("--fallaway-hop-1", -Math.round(rect.height * 0.32 * hopBoost) + "px");
  shard.style.setProperty("--fallaway-hop-2", -Math.round(rect.height * 0.88 * hopBoost) + "px");

  const shardImg = document.createElement("img");
  shardImg.className = "rib-bonus-half-fallaway__img";
  // El esqueleto de la Marca de Sangre cae tenido de sangre (execution-fx.css).
  if (sourceTargetEl.closest && sourceTargetEl.closest(".exec-blood-carrier")) {
    shardImg.classList.add("exec-blood-carrier-shard");
  }
  shardImg.src = sourceTargetEl.currentSrc || sourceTargetEl.src;
  shardImg.alt = "";
  shardImg.style.width = rect.width + "px";
  shardImg.style.height = rect.height + "px";
  shardImg.style.objectFit = window.getComputedStyle(sourceTargetEl).objectFit || "cover";
  shardImg.style.objectPosition = window.getComputedStyle(sourceTargetEl).objectPosition || "center top";
  shardImg.style.transformOrigin = window.getComputedStyle(sourceTargetEl).transformOrigin || "center center";
  const baseTransform = window.getComputedStyle(sourceTargetEl).transform;
  const cropTransform = cutWholeTarget
    ? ""
    : (half === "right" ? "translateX(-" + halfWidth + "px)" : "translateX(0)");
  shardImg.style.transform = [cropTransform, baseTransform !== "none" ? baseTransform : ""]
    .filter(Boolean)
    .join(" ");
  shard.appendChild(shardImg);
  document.body.appendChild(shard);

  const boxRect = bonusHandBoxEl && !bonusHandBoxEl.hidden && bonusHandBoxEl.getBoundingClientRect
    ? bonusHandBoxEl.getBoundingClientRect()
    : null;
  const usesBoxArc =
    Boolean(boxRect) &&
    (reelId === "rib4-left" || reelId === "rib4-right" || reelId === "rib5-left" || reelId === "rib5-right");
  if (usesBoxArc) {
    const rib4Top = ["rib4-left", "rib4-right"].reduce((top, targetReelId) => {
      const targetReel = reelByIdForLock(targetReelId);
      const laneRect = targetReel && targetReel.laneEl && targetReel.laneEl.getBoundingClientRect
        ? targetReel.laneEl.getBoundingClientRect()
        : null;
      return laneRect ? Math.min(top, laneRect.top) : top;
    }, rect.top);
    const reelLiftBoost = (reelId === "rib5-left" || reelId === "rib5-right") ? 1.22 : 1.04;
    const shardCenterX = left + ((cutWholeTarget ? rect.width : halfWidth) / 2);
    const boxCenterX = boxRect.left + (boxRect.width / 2);
    const endX = Math.round(boxCenterX - shardCenterX);
    const rawApexY = Math.round(rib4Top - rect.top - (rect.height * 0.38 * reelLiftBoost));
    const apexY = Math.min(rawApexY, -Math.round(rect.height * (reelLiftBoost * 1.08)));
    const touchY = Math.round(boxRect.top - rect.top - rect.height);
    const settleY = Math.round(touchY + (rect.height * 0.7) + 5);
    const riseX1 = Math.round(endX * 0.18);
    const riseX2 = Math.round(endX * 0.42);
    const centerX1 = Math.round(endX * 0.68);
    const centerX2 = Math.round(endX * 0.88);
    const riseY1 = Math.round(apexY * 0.4);
    const riseY2 = Math.round(apexY * 0.82);
    const descendY1 = Math.round(apexY + ((touchY - apexY) * 0.38));
    const descendY2 = Math.round(apexY + ((touchY - apexY) * 0.82));
    shard.style.animation = "none";
    shard.animate([
      { transform: "translate3d(0px, 0px, 0) rotate(0deg)", offset: 0 },
      { transform: "translate3d(" + riseX1 + "px, " + riseY1 + "px, 0) rotate(" + (half === "right" ? 30 : -30) + "deg)", offset: 0.1 },
      { transform: "translate3d(" + riseX2 + "px, " + riseY2 + "px, 0) rotate(" + (half === "right" ? 74 : -74) + "deg)", offset: 0.24 },
      { transform: "translate3d(" + centerX1 + "px, " + apexY + "px, 0) rotate(" + (half === "right" ? 120 : -120) + "deg)", offset: 0.42 },
      { transform: "translate3d(" + centerX2 + "px, " + descendY1 + "px, 0) rotate(" + (half === "right" ? 166 : -166) + "deg)", offset: 0.62 },
      { transform: "translate3d(" + endX + "px, " + descendY2 + "px, 0) rotate(" + (half === "right" ? 198 : -198) + "deg)", offset: 0.76 },
      { transform: "translate3d(" + endX + "px, " + settleY + "px, 0) rotate(" + (half === "right" ? 214 : -214) + "deg)", offset: 1 }
    ], {
      duration: 760,
      easing: "linear",
      fill: "forwards"
    });
  }

  // Sensacion de que las manos "entran" dentro de la caja: el desvanecido debe
  // arrancar al tocar la boca superior de la caja mientras la mano ya va
  // descendiendo, no cuando su rectangulo aun cruza el volumen completo.
  if (boxRect) {
    shardImg.style.setProperty("--absorb-duration", "140ms");
    let absorbStarted = false;
    const contactArmedAt = usesBoxArc ? window.performance.now() + Math.round(760 * 0.6) : 0;
    let previousBottom = null;
    const resolveBoxEntryHitbox = function () {
      const liveBoxRect = bonusHandBoxEl && !bonusHandBoxEl.hidden && bonusHandBoxEl.getBoundingClientRect
        ? bonusHandBoxEl.getBoundingClientRect()
        : boxRect;
      const insetX = Math.round(liveBoxRect.width * 0.16);
      const topBandHeight = Math.max(18, Math.round(liveBoxRect.height * 0.18));
      const entryOffsetY = 35;
      return {
        left: liveBoxRect.left + insetX,
        right: liveBoxRect.right - insetX,
        top: liveBoxRect.top + entryOffsetY,
        bottom: liveBoxRect.top + entryOffsetY + topBandHeight
      };
    };
    const pollContact = function () {
      if (absorbStarted || !shard.isConnected || !shardImg.isConnected) return;
      if (contactArmedAt && window.performance.now() < contactArmedAt) {
        window.requestAnimationFrame(pollContact);
        return;
      }
      const liveBoxRect = resolveBoxEntryHitbox();
      const shardImgRect = shardImg.getBoundingClientRect();
      const isDescending = previousBottom !== null ? shardImgRect.bottom > previousBottom + 1 : false;
      previousBottom = shardImgRect.bottom;
      const overlapsHorizontally =
        shardImgRect.right > liveBoxRect.left &&
        shardImgRect.left < liveBoxRect.right;
      const touchesBox =
        shardImgRect.bottom >= liveBoxRect.top &&
        shardImgRect.top <= liveBoxRect.bottom;
      if (isDescending && overlapsHorizontally && touchesBox) {
        absorbStarted = true;
        shardImg.classList.add("rib-bonus-half-fallaway__img--absorbing");
        return;
      }
      window.requestAnimationFrame(pollContact);
    };
    window.requestAnimationFrame(pollContact);
  }

  const cleanup = function () {
    if (shard.parentNode) shard.parentNode.removeChild(shard);
  };
  shard.addEventListener("animationend", cleanup);
  window.setTimeout(cleanup, 2000);
}

// Solo debug: previsualiza la caida/desvanecido del arte de rib1 sin
// necesidad de completar un BONUS real (misma funcion que usa el flujo real,
// spawnRib1BonusFallAway, para que la previsualizacion sea identica al
// resultado en partida). Si rib1 no tiene ya un simbolo gigante visible
// (bonus real en curso), muestra uno temporal solo para esta
// previsualizacion — no toca locks/RNG/state.reels.
function debugPreviewRib1FallAway() {
  const reel = state.reels.find((item) => item.id === "rib1");
  if (!reel || !reel.giantPool) return false;
  const hasVisible = reel.giantPool.some((el) => !el.hidden);
  if (!hasVisible) {
    configureGiantElement(reel.giantPool[0], "RIB_BONUS", reel);
  }
  spawnRib1BonusFallAway(reel);
  return true;
}

function debugPreviewRib1BladeRig() {
  const reel = state.reels.find((item) => item.id === "rib1");
  if (!reel || !reel.giantPool) return false;
  const hasVisible = reel.giantPool.some((el) => !el.hidden);
  if (!hasVisible) {
    configureGiantElement(reel.giantPool[0], "RIB_BONUS", reel);
  }
  return spawnRib1BladeRigPreview(reel);
}

// Previsualiza (estatico, sin spin) un simbolo gigante de free spins
// (POBRE/NOBLE/RICO) en la mitad de rib indicada, para revisar arte base +
// sobre-imagen + espejo sin depender del RNG/outcome. Mismo patron que la
// preview de rib1: muestra el simbolo en giantPool[0], que cubre exactamente
// el bloque de 2 casillas (inset:0). Se limpia con "Limpiar vista previa"
// (clearGiantPool) y en cuanto arranca un spin real (renderGiantBlocks vuelve
// a ocultar el pool al no haber bloque activo). No toca RNG/strips/outcome/locks.
function debugPreviewFreeSpinSymbol(reelId, symbol) {
  const reel = state.reels.find((item) => item.id === reelId);
  if (!reel || !reel.giantPool || state.spinning) return false;
  for (let i = 1; i < reel.giantPool.length; i++) {
    hideGiantElement(reel.giantPool[i]);
  }
  configureGiantElement(reel.giantPool[0], symbol, reel);
  return true;
}

function clearBonusLocks() {
  // Solo debug: marca que acaba de pasar una limpieza de locks, para el
  // overlay temporal de giant-trace-overlay.js. No participa en ninguna
  // decision de juego.
  state.debugClearing = true;
  for (const reel of state.reels) {
    const hadLockedGiant = Boolean(reel.lockedGiantBlock);
    // A peticion del usuario: solo rib1 (nunca rib2/rib3), y solo cuando de
    // verdad estaba BLOQUEADO (no un giant "de paso"), dispara la caida antes
    // de que el resto de este bloque lo oculte al instante como siempre.
    if (reel.id === "rib1" && reel.lockedGiantBlock) {
      clearRib1LockForReturnToBase(reel);
    } else if (hadLockedGiant) {
      carryVisibleGiantIntoNextSpin(reel);
    } else {
      reelModel.clearReelLock(reel);
    }
      // este repintado quedaba un "overlay viejo": tile pequeño con
    renderGiantBlocks(reel);
    validateGiantSymbolSync(reel, "clearBonusLocks");
  }
  emitBonusLockUpdated();
}

// Muestra/oculta instantáneamente el slot 0 del pool, sin deslizamiento.
// Solo para el aterrizaje final exacto (offset ya en 0) y para el panel
// de debug (previsualizar un símbolo gigante sin necesidad de girar).
function streamIndexAtCell(reel, cell, position) {
  return spinEngine.streamIndexAtCell(reel, cell, position);
}

function buildFinalSymbolMap(reel, targetPosition) {
  spinEngine.buildFinalSymbolMap(reel, targetPosition);
}

// Paleta determinista con la que se sustituye una cuchilla que el ESTERNON
// intentaria mostrar (ver nota en getSymbolAt). Simbolos normales con asset
// garantizado; sin gigantes/bonus/comodines.
const STERNUM_BLADE_REPLACEMENTS = ["VERTEBRA", "FEMUR", "DARK_HEART", "SILVER_COIN", "ANCIENT_GOLD_COIN"];

function getSymbolAt(reel, streamIndex) {
  const symbol = spinEngine.getSymbolAt(reel, streamIndex);
  if (economicSpinPlan && reel.finalSymbolMap.has(streamIndex)) return symbol;
  // Regla de tablero: como MUCHO 2 cuchillas pequenas VISIBLES sumando todos los
  // rodillos. Los rodillos rib la respetan via el tope de outcome
  // (capSmallBladeSymbolsForSpin) porque su tile mostrado == su outcome. Pero el
  // ESTERNON pinta sus tiles por un camino DESACOPLADO del outcome/pagos: su
  // cell.effective (lo que paga) no coincide con el simbolo del tile mostrado
  // (p.ej. paga FEMUR y muestra DARK_HEART), asi que su simbolo VISIBLE es
  // puramente cosmetico y nunca paga. El tope de outcome no puede controlar ese
  // camino, y por ahi se colaba una 3a cuchilla en pantalla. Aqui se garantiza
  // que el esternon NUNCA muestre una cuchilla: se sustituye por un simbolo
  // normal determinista (por streamIndex, para que no parpadee al hacer scroll).
  // SOLO VISUAL: no toca cell.effective, outcome, strips, RNG ni pagos.
  if (reel && reel.type === "sternum" &&
      SMALL_BLADE_CUT_TRIGGER_SYMBOLS.indexOf(symbol) !== -1) {
    const len = STERNUM_BLADE_REPLACEMENTS.length;
    return STERNUM_BLADE_REPLACEMENTS[((streamIndex % len) + len) % len];
  }
  // Cuervo dorado: un simbolo mas de la secuencia (ver CUERVOS DORADOS).
  if (symbol === SMALL_BLADE_BIRD_SYMBOL && reel && goldenCrowAt(reel, streamIndex)) return GOLDEN_CROW_SYMBOL;
  return symbol;
}

// --- Símbolos gigantes como elementos reales de la tira ---------------
//
// En vez de "aparece de golpe al resultado final", cualquier símbolo
// gigante (el resultado final decidido, o uno que pasa de largo sin
// aterrizar) se trata igual: un bloque con posición de referencia +
// tamaño en celdas, que se desliza con la misma fórmula de offset que
// los símbolos normales. reel.giantPool contiene varios elementos
// reutilizables porque puede haber más de un bloque visible a la vez
// (el final + alguno "de paso").

// El bloque FINAL (el resultado decidido) puede ocupar el reel completo.
// Los bloques "de paso" (ambientales, sin aterrizar) solo se
// generan para BONUS RIB en Rib Reel 1/2/3 y SUPER BONUS en el Esternón,
// que es lo único que pide la arquitectura de símbolos.
function ambientGiantConfigForReel(reel) {
  return outcomeEngine.ambientGiantConfigForReel(reel);
}

function ambientGiantBlockRoll(reel, blockIndex) {
  return outcomeEngine.ambientGiantBlockRoll(reel, blockIndex);
}

function activeGiantBlocksNear(reel) {
  return outcomeEngine.activeGiantBlocksNear(reel);
}

const bonusLandingWeight = window.OssuaryBonusLandingWeight.create({
  config: window.BONUS_LANDING_WEIGHT_CONFIG
});

const bonusArrivalPhysics = window.OssuaryBonusArrivalPhysics.create({
  config: window.BONUS_LANDING_WEIGHT_CONFIG
});

const machineBlockEl = document.querySelector(".scene-layers");
// Capa frontal (caja toracica) montada fuera de .scene-layers a proposito
// (ver index.html#structureOverlay / scene-manager.js): debe seguir
// recibiendo el mismo transform que el resto del bloque para moverse como
// una sola pieza, pero vive en su propio contenedor para no heredar el
// stacking context que .scene-layers gana al recibir transform.
const structureOverlayEl = document.getElementById("structureOverlay");
const respinStructureSwell = {
  active: false,
  armed: false,
  armedLevel: 0,
  plannedEndAt: 0,
  startAt: 0,
  endAt: 0,
  peakScale: NORMAL_BONUS_STRUCTURE_SWELL_BASE_SCALE,
  stopControlled: false
};
const respinLockPulse = {
  active: false,
  startAt: 0,
  strength: 1
};
const superBonusTransition = {
  active: false,
  startAt: 0,
  endAt: 0,
  peakScale: 1 + ((respinStructureSwell.peakScale - 1) * 1.2)
};

function sampleStructurePulse(now, startAt) {
  return sampleStructurePulseWithStrength(now, startAt, 1);
}

function sampleStructurePulseWithStrength(now, startAt, strength) {
  const cfg = window.BONUS_LANDING_WEIGHT_CONFIG || {};
  const ZERO = { offsetPx: 0, scale: 1, scaleY: 1 };
  if (!startAt) return ZERO;
  const pulseStrength = typeof strength === "number" && strength > 0 ? strength : 1;
  const preScaleMs = cfg.BONUS_STRUCTURE_PRE_SCALE_MS || 0;
  const preScalePeak = (cfg.BONUS_STRUCTURE_PRE_SCALE || 0) * pulseStrength;
  const delayMs = cfg.BONUS_STRUCTURE_REACTION_DELAY_MS || 0;
  const riseMs = cfg.BONUS_STRUCTURE_REACTION_RISE_MS || 0;
  const holdMs = cfg.BONUS_STRUCTURE_REACTION_HOLD_MS || 0;
  const returnMs = cfg.BONUS_STRUCTURE_REACTION_RETURN_MS || 0;
  const peakPx = (cfg.BONUS_STRUCTURE_REACTION_PX || 0) * pulseStrength;
  const peakCompression = (cfg.BONUS_STRUCTURE_REACTION_SCALE_Y || 0) * pulseStrength;
  const elapsed = now - startAt;
  if (elapsed < 0) return ZERO;
  if (elapsed < preScaleMs) {
    const preT = preScaleMs > 0 ? elapsed / preScaleMs : 1;
    const preK = preT < 0.82
      ? 1 - Math.pow(1 - (preT / 0.82), 2)
      : 1 - Math.pow((preT - 0.82) / 0.18, 0.55);
    return {
      offsetPx: 0,
      scale: 1 + preScalePeak * Math.max(0, Math.min(1, preK)),
      scaleY: 1
    };
  }
  if (elapsed < preScaleMs + delayMs) return ZERO;
  const local = elapsed - preScaleMs - delayMs;
  let k;
  if (local < riseMs) {
    const t = riseMs > 0 ? local / riseMs : 1;
    k = 1 - Math.pow(1 - t, 8);
  } else if (local < riseMs + holdMs) {
    k = 1;
  } else if (local < riseMs + holdMs + returnMs) {
    const rp = returnMs > 0 ? (local - riseMs - holdMs) / returnMs : 1;
    k = 1 - (1 - (1 - rp) * (1 - rp));
  } else {
    return ZERO;
  }
  return {
    offsetPx: peakPx * k,
    scale: 1,
    scaleY: 1 - peakCompression * k
  };
}

function isRespinLockPulseActive(now) {
  const reaction = sampleStructurePulseWithStrength(now, respinLockPulse.startAt, respinLockPulse.strength);
  return reaction.offsetPx !== 0 || reaction.scale !== 1 || reaction.scaleY !== 1;
}

function isSuperBonusTransitionReel(reel) {
  const tier = stopSequenceTierForReel(reel);
  return tier === "rib4" || tier === "rib5" || tier === "sternum";
}

// SUPER BONUS "El Juicio" (peticion del usuario, 2026-10-18): cuando el
// encapuchado se decide en la misma tirada (syncElJuicioDarkSternum), rib4,
// rib5 y el esternon (ya tapado a oscuras) paran enseguida y no 3.5 s despues.
const EL_JUICIO_CHAIN_TRANSITION_MS = 650;
function superBonusTransitionDurationMs() {
  const takesOver = Boolean(window.OssuaryElJuicioFall && window.OssuaryElJuicio && EL_JUICIO_CONFIG && !isElJuicioActive());
  return takesOver ? EL_JUICIO_CHAIN_TRANSITION_MS : SUPER_BONUS_TRANSITION_DURATION_MS;
}

function shouldRunSuperBonusTransitionThisSpin() {
  if (state.currentSpinType !== "BONUS") return false;
  return state.reels.some(function (reel) {
    var tier = stopSequenceTierForReel(reel);
    return tier === "rib3" && reelWillSpinThisStop(reel) && reel.pendingGiantSymbol === "RIB_BONUS";
  });
}

function isBonusRespinSpeedContext() {
  return (state.currentSpinType === "BONUS" || isInlineRib1BonusContinuationActive()) && !state.bonusModeActive;
}

function reelCruiseSpeedForSpin(reel) {
  if (isBonusRespinSpeedContext()) {
    if (superBonusTransition.active && isSuperBonusTransitionReel(reel)) {
      return CRUISE_SPEED * SUPER_BONUS_TRANSITION_CRUISE_SPEED_MULTIPLIER;
    }
    const isRib23 = reel && (
      reel.id === "rib2-left" ||
      reel.id === "rib2-right" ||
      reel.id === "rib3-left" ||
      reel.id === "rib3-right"
    );
    const multiplier = isRib23
      ? (SPIN_CONFIG.BONUS_RESPIN_RIB23_CRUISE_SPEED_MULTIPLIER || 1.75)
      : (SPIN_CONFIG.BONUS_RESPIN_CRUISE_SPEED_MULTIPLIER || 1);
    return CRUISE_SPEED * multiplier;
  }
  if (state.bonusModeActive && state.bonusModeType === "NORMAL_BONUS" && reel && reel.type === "sternum") {
    return CRUISE_SPEED * BONUS_MODE_STERNUM_CRUISE_SPEED_MULTIPLIER;
  }
  return CRUISE_SPEED;
}

function resetSuperBonusTransition() {
  superBonusTransition.active = false;
  superBonusTransition.startAt = 0;
  superBonusTransition.endAt = 0;
}

// Limpieza unica para cualquier reutilizacion de un giantPool slot. Debe
// ejecutarse tanto cuando game.js configura una preview como cuando el
// renderer interno cambia de bloque durante un giro; si solo vive en el
// wrapper externo, el camino real del rodillo puede heredar "sin manos".
function resetGiantElementTransientState(el) {
  if (!el) return;
  el.classList.remove(
    "bonus-inner-cut--left",
    "bonus-inner-cut--right",
    "bonus-inner-cut-flash",
    "bonus-inner-cut-overlay-hidden"
  );
  if (el.bonusInnerCutFlashTimer) {
    window.clearTimeout(el.bonusInnerCutFlashTimer);
    el.bonusInnerCutFlashTimer = 0;
  }
  if (el.dataset) {
    delete el.dataset.handsCut;
    delete el.dataset.cutBlockRef;
  }
}

const giantSymbolRenderer = window.OssuaryGiantSymbolRenderer.create({
  reelLayer,
  machineBlockEls: [reelLayer, structureOverlayEl].filter(Boolean),
  backgroundBlockEls: [machineBlockEl].filter(Boolean),
  backgroundTransformFactor: 0.5,
  imageReference: IMAGE_REFERENCE,
  config: {
    GIANT_POOL_SIZE,
    GIANT_ENTRY_THRESHOLD,
    SYMBOL_STEP_PERCENT
  },
  hooks: {
    renderSymbolContent,
    ensureSymbolVideoOverlay,
    resetElementState: resetGiantElementTransientState,
    activeGiantBlocksNear,
    streamIndexAtCell,
    syncGiantActive: (reel) => reelModel.syncGiantActive(reel),
    weightPlayer: bonusLandingWeight,
    arrivalPhysics: bonusArrivalPhysics,
    onBonusLandingImpact: runBonusLandingWeightTail,
    getRespinStructureScale(now) {
      if (superBonusTransition.active && superBonusTransition.startAt && superBonusTransition.endAt) {
        if (now <= superBonusTransition.startAt || now >= superBonusTransition.endAt) return 1;
        var transitionDuration = Math.max(1, superBonusTransition.endAt - superBonusTransition.startAt);
        var transitionT = Math.max(0, Math.min(1, (now - superBonusTransition.startAt) / transitionDuration));
        var peakDelta = superBonusTransition.peakScale - 1;
        if (transitionT < 0.82) {
          var growT = transitionT / 0.82;
          return 1 + peakDelta * (1 - Math.pow(1 - growT, 2));
        }
        var shrinkT = (transitionT - 0.82) / 0.18;
        return 1 + peakDelta * (1 - Math.pow(shrinkT, 0.45));
      }
      if (!respinStructureSwell.active || !respinStructureSwell.startAt || !respinStructureSwell.endAt) return 1;
      if (now >= respinStructureSwell.endAt) {
        return respinStructureSwell.stopControlled ? respinStructureSwell.peakScale : 1;
      }
      var duration = Math.max(1, respinStructureSwell.endAt - respinStructureSwell.startAt);
      var t = Math.max(0, Math.min(1, (now - respinStructureSwell.startAt) / duration));
      return 1 + (respinStructureSwell.peakScale - 1) * (1 - Math.pow(1 - t, 2));
    },
    getExtraStructureReaction(now) {
      if (!respinLockPulse.active) return { offsetPx: 0, scale: 1, scaleY: 1 };
      const reaction = sampleStructurePulseWithStrength(now, respinLockPulse.startAt, respinLockPulse.strength);
      if (reaction.offsetPx === 0 && reaction.scale === 1 && reaction.scaleY === 1) {
        respinLockPulse.active = false;
        respinLockPulse.strength = 1;
      }
      return reaction;
    }
  }
});

function configureGiantElement(el, symbol, reel) {
  giantSymbolRenderer.configureGiantElement(el, symbol, reel);
  if (el && el.dataset) {
    el.dataset.blockRef = "";
  }
}

function hideGiantElement(el) {
  giantSymbolRenderer.hideGiantElement(el);
}

function streamIndexInCoveredRanges(streamIndex, coveredRanges) {
  return giantSymbolRenderer.streamIndexInCoveredRanges(streamIndex, coveredRanges);
}

function giantBlockVisibilityThreshold(block) {
  return giantSymbolRenderer.giantBlockVisibilityThreshold(block);
}

function setGiantTileCoverage(reel, coveredRanges) {
  giantSymbolRenderer.setGiantTileCoverage(reel, coveredRanges);
}

function setAllGiantTileCoverage(reel, covered) {
  giantSymbolRenderer.setAllGiantTileCoverage(reel, covered);
}

function cellSizePxFor(reel) {
  return giantSymbolRenderer.cellSizePxFor(reel);
}

function giantBlockOffsetPx(reel, offsetPercent) {
  return giantSymbolRenderer.giantBlockOffsetPx(reel, offsetPercent);
}

function renderGiantBlocks(reel) {
  giantSymbolRenderer.renderGiantBlocks(reel);
}

function clearGiantPool(reel) {
  giantSymbolRenderer.clearGiantPool(reel);
}

function renderContinuousReelTrack(reel) {
  reelRenderer.renderContinuousReelTrack(reel);
}

function renderReel(reel) {
  reelRenderer.renderReel(reel);
}

function renderAllReels() {
  state.reels.forEach(function (reel) {
    renderReel(reel);
    renderGiantBlocks(reel);
  });
}

function commitVisibleSymbols(reel, symbols) {
  const visibleSymbols = Array.isArray(symbols) && symbols.length
    ? symbols
    : (Array.isArray(reel.currentVisibleSymbols) && reel.currentVisibleSymbols.length
      ? reel.currentVisibleSymbols
      : reel.finalSymbols);
  reelRenderer.commitVisibleSymbols(reel, visibleSymbols);
}

function chooseRibOutcome(reel) {
  return outcomeEngine.chooseRibOutcome(reel);
}

function chooseSternumOutcome() {
  return outcomeEngine.chooseSternumOutcome();
}

function applyDebugGiantPassBlock(reel) {
  outcomeEngine.applyDebugGiantPassBlock(reel);
}

function debugLandingSymbolForReel(reel, test) {
  return outcomeEngine.debugLandingSymbolForReel(reel, test);
}

function prepareFinalSymbols(reel) {
  if (economicSpinPlan && (economicSpinPlan.kind === "base" || economicSpinPlan.kind === "normal")) {
    const outcomes = economicSpinPlan.kind === "base"
      // The continuation's result is already selected. Stage it before any
      // frame can stop a later reel; a late rAF must never drop its outcome.
      ? (economicSpinPlan.inline && (economicInlineActive || reel.id !== "rib1") ? economicSpinPlan.inline : economicSpinPlan.initial)
      : economicSpinPlan.outcomes;
    const result = outcomes[reel.id];
    if (!result) throw new Error("Missing selected reel " + reel.id);
    if (reel.id === "rib1") reel.rib1BonusVacant = false;
    reel.giantSymbol = result.giant;
    reel.finalSymbols = result.symbols.slice();
    return;
  }
  outcomeEngine.prepareFinalSymbols(reel);
}

function captureCurrentVisibleSymbols(reel) {
  if (reel.id === "rib1" && reel.rib1BonusVacant) {
    return reel.cells.map(() => "");
  }
  return reel.cells.map((cell, index) => {
    return cell.effective ||
      cell.current ||
      ((Array.isArray(reel.currentVisibleSymbols) && reel.currentVisibleSymbols[index]) || cell.initial);
  });
}

function cachePendingReelOutcome(reel) {
  const visibleSymbols = Array.isArray(reel.currentVisibleSymbols) && reel.currentVisibleSymbols.length
    ? reel.currentVisibleSymbols
    : captureCurrentVisibleSymbols(reel);
  reel.currentVisibleSymbols = visibleSymbols.slice();
  reel.pendingFinalSymbols = Array.isArray(reel.finalSymbols) ? reel.finalSymbols.slice() : [];
  reel.pendingGiantSymbol = reel.giantSymbol || null;
  reel.activeLandingSymbols = null;
  reel.activeLandingGiantSymbol = null;
  reel.finalSymbols = reel.currentVisibleSymbols.slice();
  reel.giantSymbol = reel.currentVisibleGiantSymbol;
  reel.finalSymbolMap = new Map();
  reel.loopSymbolMap = new Map();
  var loopCenter = Math.round(reel.position || 0);
  for (var i = 0; i < reel.currentVisibleSymbols.length; i++) {
    var loopIndex = Math.round(loopCenter + reel.cells[i].reelCellIndex * reel.cellStep);
    reel.loopSymbolMap.set(loopIndex, reel.currentVisibleSymbols[i]);
  }
}

function suppressPurchasedBladeSpinRib1Giant() {
  if (state.currentPurchasedSpinType !== "blade-spin") return;
  const reel = state.reels.find((item) => item.id === "rib1");
  if (!reel || !reel.pendingGiantSymbol) return;
  reel.pendingGiantSymbol = null;
  reel.activeLandingGiantSymbol = null;
  reel.giantSymbol = reel.currentVisibleGiantSymbol || null;
  reel.pendingFinalSymbols = reel.cells.map(() => smallBladeReplacementSymbol(reel));
}

function activatePendingReelOutcome(reel) {
  if (!reel) return;
  if (!Array.isArray(reel.pendingFinalSymbols) || !reel.pendingFinalSymbols.length) return;
  reel.activeLandingSymbols = reel.pendingFinalSymbols.slice();
  reel.activeLandingGiantSymbol = reel.pendingGiantSymbol || null;
  reel.finalSymbols = reel.activeLandingSymbols.slice();
  reel.giantSymbol = reel.activeLandingGiantSymbol;
}

function prepareReelLanding(reel) {
  if (!reel || reel.landingPrepared) return;
  activatePendingReelOutcome(reel);
  spinEngine.prepareReelLanding(reel);
  pruneBonusModePassingGiantBlocks(reel);
}

// Esqueletos "de paso" del Bonus Game (SOLO VISUAL, a peticion del usuario):
// bloques gigantes pobre/noble/rico (mismo arte real CON manos, via el mismo
// configureGiantElement/overlay de siempre) que cruzan los rodillos laterales
// a velocidad de crucero durante el giro, para que no se vean vacios/negros
// hasta el pop final. Garantias: se generan con Math.random (JAMAS con el RNG
// del motor: cero sorteos extra, el outcome real no cambia), no son locks, no
// pagan, y el bloque REAL del outcome siempre tiene prioridad de slot en el
// pool (se anexan DESPUES de el en activeGiantBlocksNear — la causa exacta
// por la que los antiguos bloques "ambiente" se desactivaron era esa
// competencia por slots, ver comentario historico en outcome-engine.js).
// Solo rib2-5 en bonus mode; en base game devuelve null y no existe nada.
function buildBonusModePassingGiantBlocks(reel, now) {
  if (!state.bonusModeActive || state.bonusModeType !== "NORMAL_BONUS") return null;
  const isSternum = Boolean(reel && reel.type === "sternum");
  const cfg = isSternum ? BONUS_MODE_PASSING_BLADE : BONUS_MODE_PASSING_SKELETONS;
  if (!cfg) return null;
  if (!isSternum && !BONUS_MODE_HAND_CUT_REEL_IDS.includes(reel.id)) return null;
  const symbols = isSternum
    ? (cfg.WEIGHTED_SYMBOLS || [])
    : (cfg.WEIGHTED_SYMBOLS || []);
  if (!symbols.length) return null;
  const size = reel.cells.length;
  // Mismo punto de aparicion que el pass-block de debug: justo fuera de la
  // ventana visible, para que entre deslizando y nunca haga pop.
  const spawnBase = reel.position + size + VISIBLE_TILE_RADIUS + 1;
  // Estimacion conservadora del recorrido de crucero de ESTE rodillo en este
  // spin (los tiers que paran mas tarde recorren mas y llevan mas candidatos).
  const cruiseSpeed = reelCruiseSpeedForSpin(reel) || SPIN_CONFIG.MAX_REEL_SPEED || 0;
  const travelUnits = Math.max(0, (reel.stopStartAt - now) / 1000) * cruiseSpeed;
  const minGap = cfg.MIN_GAP_UNITS || 5;
  const maxGap = Math.max(minGap, cfg.MAX_GAP_UNITS || minGap);
  const blocks = [];
  if (isSternum) {
    // Sternum: durante crucero deben pasar ALEATORIAMENTE las dos imagenes del
    // bonus, con huecos reales entre medias. No es relleno continuo: el
    // usuario quiere ver tanto simbolos 1/2 como espacios negros.
    let ref = spawnBase;
    while (ref < reel.position + travelUnits) {
      if (Math.random() < (cfg.CHANCE || 0)) {
        blocks.push({
          refPosition: Math.round(ref),
          size,
          symbol: symbols[Math.floor(Math.random() * symbols.length)],
          passing: true
        });
      }
      ref += minGap + Math.random() * (maxGap - minGap);
    }
  } else {
    // rib2-5: relleno CONTIGUO alineado a la rejilla. Cada hueco gigante del
    // crucero lleva un cepo vacio (BONUS_EMPTY) y, segun cfg.CHANCE, a veces un
    // esqueleto: asi el rodillo se ve LLENO y TODO se desplaza como los simbolos
    // normales durante el giro, no solo el aterrizaje. Puramente visual
    // (Math.random, nunca el RNG del motor; podado en prepareReelLanding antes
    // de parar; el bloque REAL del outcome siempre tiene prioridad de slot).
    const startIndex = Math.ceil(spawnBase / size);
    const endIndex = Math.floor((reel.position + travelUnits) / size);
    for (let idx = startIndex; idx <= endIndex; idx++) {
      const isSkeleton = Math.random() < (cfg.CHANCE || 0);
      const symbol = isSkeleton
        ? symbols[Math.floor(Math.random() * symbols.length)]
        : "BONUS_EMPTY";
      blocks.push({ refPosition: idx * size, size, symbol, passing: true });
    }
  }
  return blocks.length ? blocks : null;
}

// En cuanto se conoce el targetPosition real del aterrizaje (prepareReelLanding)
// se poda todo bloque de paso que no vaya a salir COMPLETO de la ventana
// visible antes de que el rodillo pare: ninguno puede quedarse congelado a
// medias en pantalla ni pisar/confundirse con el bloque real del outcome.
function pruneBonusModePassingGiantBlocks(reel) {
  if (!reel || !Array.isArray(reel.bonusPassingGiantBlocks) || !reel.bonusPassingGiantBlocks.length) return;
  const spanUnits = GIANT_ENTRY_THRESHOLD / SYMBOL_STEP_PERCENT + reel.cells.length;
  const exitLimit = (reel.targetPosition || 0) - (spanUnits + 0.5);
  reel.bonusPassingGiantBlocks = reel.bonusPassingGiantBlocks.filter((block) => block.refPosition <= exitLimit);
}

function prepareLockedBonusReel(reel) {
  const lockedPosition = Math.round(reel.position || reel.targetPosition || 0);
  reel.position = lockedPosition;
  reel.velocity = 0;
  reel.stopStartAt = 0;
  reel.decelStartedAt = 0;
  reel.decelStartPosition = lockedPosition;
  reel.targetPosition = lockedPosition;
  reel.decelEndPosition = lockedPosition;
  reel.settleStartedAt = 0;
  reel.settleStartPosition = lockedPosition;
  reel.giantSymbol = reel.lockedSymbol;
  reel.finalSymbols = reel.cells.map(() => reel.lockedSymbol);
  reel.currentVisibleSymbols = reel.finalSymbols.slice();
  reel.currentVisibleGiantSymbol = reel.giantSymbol;
  reel.pendingFinalSymbols = null;
  reel.pendingGiantSymbol = null;
  reel.activeLandingSymbols = null;
  reel.activeLandingGiantSymbol = null;
  reel.loopSymbolMap = new Map();
  reelModel.refreshLockedGiantBlockPosition(reel, lockedPosition);
  buildFinalSymbolMap(reel, lockedPosition);
  clearGiantPool(reel);
  renderReel(reel);
  commitVisibleSymbols(reel, reel.finalSymbols);
  setReelPhase(reel, "stopped");
  reelModel.syncGiantActive(reel);
  renderGiantBlocks(reel);
  validateGiantSymbolSync(reel, "prepareLockedBonusReel");
}

const STOP_SEQUENCE_TIER_ORDER = ["rib1", "rib2", "rib3", "rib4", "rib5", "sternum"];
const STOP_SEQUENCE_DELTAS = STOP_SEQUENCE_TIER_ORDER.slice(1).map(function (tier) {
  return BASE_STOP_SEQUENCE[tier] || 0;
});

function stopSequenceTierForReel(reel) {
  if (!reel) return null;
  if (reel.type === "sternum") return "sternum";
  if (reel.id === "rib1") return "rib1";
  if (reel.id.indexOf("rib2-") === 0) return "rib2";
  if (reel.id.indexOf("rib3-") === 0) return "rib3";
  if (reel.id.indexOf("rib4-") === 0) return "rib4";
  if (reel.id.indexOf("rib5-") === 0) return "rib5";
  return null;
}

function reelWillSpinThisStop(reel) {
  if (state.bonusModeActive && reel && reel.id === "rib1") {
    return false;
  }
  // Rediseño FREE SPIN: los esqueletos acumulados quedan BLOQUEADOS en el
  // tablero entre free spins (hasta que la cuchilla los corte), asi que sus
  // rodillos no giran, igual que un lock de respin BONUS clasico.
  if (state.bonusModeActive && reel && reel.locked && reel.lockedSymbol) {
    return false;
  }
  return !(state.currentSpinType === "BONUS" && reel.locked && reel.lockedSymbol);
}

function isFixedBonusModeRib1(reel) {
  return Boolean(state.bonusModeActive && reel && reel.id === "rib1");
}

function ensureFixedBonusModeRib1Lock(reel) {
  if (!isFixedBonusModeRib1(reel)) return false;
  reel.teaseGiantBlocks = null;
  reel.locked = true;
  reel.lockedSymbol = "RIB_BONUS";
  reel.lockedGiantBlock = reel.lockedGiantBlock || {
    refPosition: Math.round(reel.position || reel.targetPosition || 0),
    size: reel.cells.length,
    symbol: "RIB_BONUS"
  };
  prepareLockedBonusReel(reel);
  return true;
}

function activeStopSequenceTiers() {
  var activeTiers = new Set();
  for (const reel of state.reels) {
    if (!reelWillSpinThisStop(reel)) continue;
    var tier = stopSequenceTierForReel(reel);
    if (tier) activeTiers.add(tier);
  }
  return STOP_SEQUENCE_TIER_ORDER.filter(function (tier) {
    return activeTiers.has(tier);
  });
}

function buildDynamicStopOffsets(activeTiers) {
  if (superBonusTransition.active) {
    var transitionOffsets = {};
    var cumulative = 0;
    var superTransitionStartOffset = 0;
    activeTiers.forEach(function (tier, index) {
      if (index === 0) {
        transitionOffsets[tier] = 0;
        return;
      }
      if (tier === "rib4" || tier === "rib5" || tier === "sternum") {
        transitionOffsets[tier] = superTransitionStartOffset;
        return;
      }
      cumulative += STOP_SEQUENCE_DELTAS[index - 1] || 0;
      transitionOffsets[tier] = cumulative;
      if (tier === "rib3") {
        superTransitionStartOffset = cumulative;
      }
    });
    return transitionOffsets;
  }
  var offsets = {};
  var cumulative = 0;
  activeTiers.forEach(function (tier, index) {
    if (index === 0) {
      offsets[tier] = 0;
    } else {
      cumulative += STOP_SEQUENCE_DELTAS[index - 1] || 0;
      offsets[tier] = cumulative;
    }
  });
  return offsets;
}

function stopOffsetForReel(reel, dynamicOffsets) {
  var tier = stopSequenceTierForReel(reel);
  if (!tier) return 0;
  return (dynamicOffsets && dynamicOffsets[tier]) || 0;
}

function inlineRib1ContinuationReels() {
  return state.reels.filter(function (reel) {
    if (!reel || reel.id === "rib1") return false;
    if (reel.phase === "stopped" || reel.phase === "decelerating" || reel.phase === "settling") return false;
    return true;
  });
}

function startInlineRib1BonusContinuation(reel) {
  if (!reel || reel.id !== "rib1") return false;
  if (state.bonusModeActive || state.currentSpinType !== "BASE") return false;
  if (state.inlineRib1BonusContinuationStartedSpinId === state.currentSpinId) return false;
  if (reel.locked || reel.giantSymbol !== "RIB_BONUS") return false;

  const now = gameNow();
  state.inlineRib1BonusContinuationActive = true;
  state.inlineRib1BonusContinuationStartedSpinId = state.currentSpinId;

  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger("rib1_bonus_respin_started", { reelId: reel.id, inline: true });
  }
  applyBonusLocks(["rib1"], { rib1: "RIB_BONUS" });
  emitBonusLogicEvent("onRespinStarted", {
    inlineRib1Continuation: true,
    lockedReels: ["rib1"]
  });

  const continuationReels = inlineRib1ContinuationReels();
  economicInlineActive = true;
  const activeTiers = STOP_SEQUENCE_TIER_ORDER.filter(function (tier) {
    return continuationReels.some(function (activeReel) {
      return stopSequenceTierForReel(activeReel) === tier;
    });
  });
  const dynamicStopOffsets = buildDynamicStopOffsets(activeTiers);
  const inlineCruiseBaseAt = now + Math.max(BONUS_RESPIN_EXTRA_CRUISE_MS, PREPARE_LANDING_TIME + 16);
  // Anticipacion de rib2 (latidos y espera), como la de rib3 en los respins.
  planInlineRib2Anticipation();

  continuationReels.forEach(function (activeReel) {
    prepareFinalSymbols(activeReel);
    cachePendingReelOutcome(activeReel);
    activeReel.customCruiseSpeed = reelCruiseSpeedForSpin(activeReel);
    activeReel.stopStartAt = inlineCruiseBaseAt + stopOffsetForReel(activeReel, dynamicStopOffsets) +
      bonusChainAnticipationExtraMs(activeReel);
    activeReel.prepareLandingAt = activeReel.stopStartAt - PREPARE_LANDING_TIME;
    activeReel.landingPrepared = false;
    activeReel.decelStartedAt = 0;
    activeReel.targetPosition = 0;
    activeReel.settleStartedAt = 0;
    activeReel.settleStartPosition = 0;
    bonusArrivalPhysics.reset(activeReel);
    setRespinChargeGlow(activeReel, true);
    renderReel(activeReel);
    renderGiantBlocks(activeReel);
  });
  activateRespinStructureSwell(now, continuationReels.filter(function (activeReel) {
    var tier = stopSequenceTierForReel(activeReel);
    return tier === "rib2" || tier === "rib3";
  }));
  scheduleBonusChainAnticipationFx(now);

  return true;
}

function resetRespinStructureSwell() {
  respinStructureSwell.active = false;
  respinStructureSwell.armed = false;
  respinStructureSwell.armedLevel = 0;
  respinStructureSwell.plannedEndAt = 0;
  respinStructureSwell.startAt = 0;
  respinStructureSwell.endAt = 0;
  respinStructureSwell.peakScale = NORMAL_BONUS_STRUCTURE_SWELL_BASE_SCALE;
  respinStructureSwell.stopControlled = false;
  resetSuperBonusTransition();
}

// El spin solo ARMA el swell. No modifica ningun transform hasta que RIB4
// entra realmente en deceleracion.
function armBonusModeStructureSwellForCurrentSpin() {
  if (!isNormalFreeSpinBonusActive()) return;
  const level = sternumTensionLevelForChances(state.bonusModeSpinStartChances);
  if (level < 1) return;
  const sternumReel = reelByIdForLock("sternum");
  if (!sternumReel || !reelWillSpinThisStop(sternumReel)) return;
  respinStructureSwell.armed = true;
  respinStructureSwell.armedLevel = level;
  respinStructureSwell.plannedEndAt = sternumReel.stopStartAt + DECELERATION_TIME + SETTLE_TIME;
}

function beginArmedBonusModeStructureSwellAtRib4(reel, now) {
  if (!isNormalFreeSpinBonusActive() || !respinStructureSwell.armed || respinStructureSwell.active) return;
  if (stopSequenceTierForReel(reel) !== "rib4") return;
  const level = respinStructureSwell.armedLevel;
  respinStructureSwell.armed = false;
  respinStructureSwell.active = true;
  respinStructureSwell.startAt = now;
  respinStructureSwell.endAt = respinStructureSwell.plannedEndAt;
  respinStructureSwell.stopControlled = true;
  const baseDelta = NORMAL_BONUS_STRUCTURE_SWELL_BASE_SCALE - 1;
  respinStructureSwell.peakScale = 1 + baseDelta * (level >= 2 ? NORMAL_BONUS_STRUCTURE_SWELL_HIGH_MULTIPLIER : 1);
}

function setRespinChargeGlow(reel, active) {
  if (!reel) return;
  var tier = stopSequenceTierForReel(reel);
  var isChargedTier = tier === "rib2" || tier === "rib3";
  var isActive = Boolean(active && isChargedTier);
  var isRib2 = Boolean(active && tier === "rib2");
  var isRib3 = Boolean(active && tier === "rib3");
  if (reel.laneEl) {
    reel.laneEl.classList.toggle("bonus-respin-charge", isActive);
    reel.laneEl.classList.toggle("bonus-respin-charge--rib2", isRib2);
    reel.laneEl.classList.toggle("bonus-respin-charge--rib3", isRib3);
  }
  if (reel.continuousTrackEl) {
    reel.continuousTrackEl.classList.toggle("bonus-respin-charge", isActive);
    reel.continuousTrackEl.classList.toggle("bonus-respin-charge--rib2", isRib2);
    reel.continuousTrackEl.classList.toggle("bonus-respin-charge--rib3", isRib3);
  }
}

function clearAllRespinChargeGlow() {
  state.reels.forEach(function (reel) {
    setRespinChargeGlow(reel, false);
  });
}

function activeChargedRespinReels() {
  return state.reels.filter(function (reel) {
    if (!reelWillSpinThisStop(reel)) return false;
    var tier = stopSequenceTierForReel(reel);
    return tier === "rib2" || tier === "rib3";
  });
}

function activateRespinStructureSwell(now, chargedSpinReels) {
  var reels = Array.isArray(chargedSpinReels) ? chargedSpinReels : activeChargedRespinReels();
  if (reels.length || superBonusTransition.active) {
    var chargedEndAt = reels.length
      ? Math.max.apply(null, reels.map(function (reel) {
        return reel.stopStartAt + DECELERATION_TIME + SETTLE_TIME;
      }))
      : superBonusTransition.endAt;
    if (superBonusTransition.active) {
      var superBonusTransitionReels = state.reels.filter(function (reel) {
        return reelWillSpinThisStop(reel) && isSuperBonusTransitionReel(reel);
      });
      if (superBonusTransitionReels.length) {
        chargedEndAt = Math.max(chargedEndAt, superBonusTransition.endAt);
      }
    }
    respinStructureSwell.active = true;
    respinStructureSwell.startAt = now;
    respinStructureSwell.endAt = chargedEndAt;
    respinStructureSwell.stopControlled = false;
  } else {
    resetRespinStructureSwell();
  }
}

// Amagos de la guillotina gigante de rib1 (peticion del usuario, 2026-10-19;
// src/fx/rib1-tease.js). Si cae lo sigue decidiendo el motor (sin cambios);
// aqui se elige COMO llega en las tiradas base normales (ni compras, ni
// bonus, ni respins). Si se queda a medias, las casillas que tapa pasan a
// RIB_BONUS (no paga: rompe las lineas, como el gigante entero) y solo si
// eran simbolos normales: el unico cambio en el tablero.
function planRib1TeaseForSpin() {
  if (economicSpinPlan) return; // Already selected by the shared economic model.
  const tease = window.OssuaryRib1Tease;
  if (!tease) return;
  const reel = state.reels.find((item) => item.id === "rib1");
  const allowed = Boolean(reel) &&
    state.currentSpinType === "BASE" &&
    !state.bonusModeActive &&
    !reel.locked &&
    !state.currentPurchasedSpinType &&
    !state.debugGiantTest &&
    !isElJuicioActive() &&
    Array.isArray(reel.pendingFinalSymbols) &&
    reel.pendingFinalSymbols.length === reel.cells.length;
  const symbols = allowed ? reel.pendingFinalSymbols.slice() : [];
  const result = tease.planSpin({
    allowed,
    lands: Boolean(allowed && reel.pendingGiantSymbol === "RIB_BONUS"),
    symbols
  });
  if (result && result.covered.length) reel.pendingFinalSymbols = symbols;
}

// Lo que gira de mas cada rodillo para que rib1 haga su amago antes de que
// paren los demas.
function rib1TeaseExtraMs(reel) {
  const tease = window.OssuaryRib1Tease;
  if (!tease || !tease.current() || reel.isRespin) return 0;
  return tease.extraCruiseMs(reel.id, DECELERATION_TIME);
}

// Donde ira un rodillo de la tirada base (windup + aceleracion + crucero) en
// el instante "at" si arranca en "startAt" (la misma cuenta que
// spin-engine.js#positionBeforeDecelAt, antes de su primer fotograma).
function estimatedBaseCruisePosition(reel, startAt, at) {
  const speed = reelCruiseSpeedForSpin(reel) || CRUISE_SPEED;
  const windupMs = WINDUP_TIME || 0;
  const windup = -2 * (SPIN_CONFIG.WINDUP_PEAK_SPEED || 0) * (windupMs / 1000) / Math.PI;
  const accel = speed * (ACCELERATION_TIME / 1000) * 0.5;
  return (reel.position || 0) + windup + accel + speed * Math.max(0, at - startAt - windupMs - ACCELERATION_TIME) / 1000;
}

function prepareReelStops(now) {
  state.quickStopRequested = false;
  if (window.OssuaryRib1Tease) window.OssuaryRib1Tease.reset();
  economicInlineActive = false;
  economicSpinPlan = economicRounds.current() ? takeEconomicPlan() : null;
  if (economicSpinPlan) restoreEconomicTeasePlan(economicTeasePlans.get(economicSpinPlan.tease) || null);
  economicStoneIndex = 0;
  economicKilledCrowSlots = new Set();
  if (economicSpinPlan && !["base", "normal"].includes(economicSpinPlan.kind)) throw new Error("Unexpected spin economic transition");
  if (economicSpinPlan && (economicSpinPlan.kind === "normal") !== Boolean(state.bonusModeActive)) throw new Error("Presentation mode diverged from selected economic transition");
  if (economicSpinPlan) publishEconomicPlan(economicSpinPlan);
  if (state.bonusModeActive) {
    resetBonusModeHandCutState();
    // Salvaguarda: si por lo que sea el rig de cuchilla no llegase a disparar
    // su propio animationend/timeout de restauracion (ver
    // triggerBonusModeSternumBladeCut), la pieza real de rib1 nunca debe
    // quedar oculta mas alla del spin en que cayo.
    const rib1Reel = reelByIdForLock("rib1");
    if (rib1Reel && rib1Reel.giantPool) {
      rib1Reel.giantPool.forEach((el) => el.classList.remove("bonus-mode-blade-source-hidden"));
    }
    // En el mismo instante en que se destapa la pieza real, cualquier rig de
    // cuchilla aun en vuelo se retira: nunca deben verse las dos a la vez
    // (la pieza real quieta y el clon del rig subiendo/bajando).
    document.querySelectorAll(".rib1-blade-rig-preview").forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }
  for (const reel of state.reels) {
    if (isFixedBonusModeRib1(reel)) continue;
    // Rediseño FREE SPIN: los esqueletos bloqueados en el tablero no vuelven
    // a sortear resultado (misma rama que un lock de respin BONUS).
    if ((state.currentSpinType === "BONUS" || state.bonusModeActive) && reel.locked && reel.lockedSymbol) continue;
    prepareFinalSymbols(reel);
    cachePendingReelOutcome(reel);
  }
  if (!economicSpinPlan) {
  suppressPurchasedBladeSpinRib1Giant();

  // Columna izquierda del todo (rib2-rib5): nunca cuchilla. Antes de los suelos
  // para que cuenten con el tablero ya limpio.
  removeSmallBladesFromForbiddenCells();

  smallBladeForcedBirdBladePos = null;

  // Suelo general de cuchillas (3-4 giros), sujeto al intervalo de cuervos:
  // una coincidencia temprana con cuervos se retira despues, sin cortarlos.
  ensureSmallBladeFloorForSpin();

  // Tope DURO de cuchillas pequenas del tablero (max 2 CROWNED_SKULL visibles
  // sumando todos los rodillos). Se aplica sobre el outcome ya cacheado
  // (pendingFinalSymbols) y antes de que ningun rodillo pare. Solo BASE game.
  capSmallBladeSymbolsForSpin();
  // Pareja cuchilla/cuervo cada 10..20 giros base. Tras el suelo y el tope:
  // sus sustituciones tambien pueden producir coincidencias naturales.
  // Si fuerza una cuchilla, vuelve a aplicar el mismo tope protegiendola.
  ensureSmallBladeBirdFloorForSpin();
  forcePurchasedSmallBladeBirdCutSpin();
  // Cuervos dorados sueltos (~1 de cada 3 tiradas), con el tablero ya decidido.
  chooseGoldenCrowsForSpin();
  }
  // Como llega la guillotina de rib1 en esta tirada (amagos), tambien con el
  // tablero ya decidido.
  planRib1TeaseForSpin();

  superBonusTransition.active = shouldRunSuperBonusTransitionThisSpin();
  superBonusTransition.startAt = 0;
  superBonusTransition.endAt = 0;
  respinStructureSwell.peakScale = superBonusTransition.active
    ? superBonusTransition.peakScale
    : NORMAL_BONUS_STRUCTURE_SWELL_BASE_SCALE;
  // Anticipacion de la cadena del bonus: antes de fijar los tiempos de parada.
  planBonusChainAnticipation();
  const dynamicStopOffsets = buildDynamicStopOffsets(activeStopSequenceTiers());
  // Reloj de impacto de estructura: una vez por spin (no por rodillo), para
  // que el siguiente BONUS landing dispare su propio golpe de estructura en
  // vez de heredar el de un spin anterior.
  bonusLandingWeight.resetStructure();

  for (const reel of state.reels) {
    if (isFixedBonusModeRib1(reel)) {
      ensureFixedBonusModeRib1Lock(reel);
      continue;
    }
    if ((state.currentSpinType === "BONUS" || state.bonusModeActive) && reel.locked && reel.lockedSymbol) {
      prepareLockedBonusReel(reel);
      continue;
    }

    reel.debugGiantBlocks = [];
    // releaseBonusModeCutSkeletons ya convierte el bloque cortado en carry
    // antes de entrar aqui. No lo reconstruimos: conservar el mismo objeto y
    // refPosition mantiene unido el visual saliente durante todo el arranque
    // del rodillo y evita que una mitad (el caso observado fue rib5-left)
    // pueda quedar fuera del ciclo normal de salida.
    // La guillotina que se quedo a medias en rib1 (amago, src/fx/rib1-tease.js)
    // se va con el giro como cualquier gigante de paso (el mismo bloque: su
    // casilla del pool no se repinta).
    const teaseRestBlock = Array.isArray(reel.teaseGiantBlocks)
      ? reel.teaseGiantBlocks.find((block) => block && block.rest) || null
      : null;
    reel.teaseGiantBlocks = null;
    reel.stopScript = null;
    reel.carryGiantBlock = reel.carryGiantBlock || teaseRestBlock || (
      reel.giantSymbol && reel.targetPosition
        ? { refPosition: reel.targetPosition, size: reel.cells.length, symbol: reel.giantSymbol }
        : null
    );
    reel.velocity = 0;
    // RESPIN PHYSICS: state.currentSpinType === "BONUS" es, en todo el motor,
    // el unico marcador real de "esto es un respin de bonus" (ver
    // startSpin()/handleBonusNextAction, source: "bonus-respin"). Se marca
    // aqui, una vez por rodillo y por spin, para que spin-engine.js use la
    // rama de fisica de RESPIN en vez de la del spin normal. El spin BASE
    // (incluida la tirada que dispara el bonus) nunca pasa por aqui con
    // isRespin=true.
    reel.isRespin = state.currentSpinType === "BONUS";
    reel.customCruiseSpeed = reelCruiseSpeedForSpin(reel);
    // El reloj de parada debe arrancar cuando termina el bloque inicial real
    // de movimiento de ESTE tipo de spin. En BASE existe WINDUP + ACCEL; en
    // RESPIN no hay windup. Antes se programaba stopStartAt con solo
    // ACCELERATION_TIME, asi que el windup del spin base se comia 128ms del
    // tramo cruise/prepare-landing: el primer rodillo podia entrar en
    // prepare-landing todavia dentro de la aceleracion, y su crucero efectivo
    // quedaba practicamente colapsado. Aqui se alinea el reloj de parada con
    // la fisica real del motor sin tocar la rama RESPIN.
    const spinLeadTime = reel.isRespin
      ? ACCELERATION_TIME
      : (WINDUP_TIME || 0) + ACCELERATION_TIME;
    const sternumTensionCruiseExtraMs = !reel.isRespin && reel.type === "sternum"
      ? sternumExtraCruiseMsForCurrentSpin()
      : 0;
    const cruiseTime = CRUISE_TIME + (reel.isRespin ? BONUS_RESPIN_EXTRA_CRUISE_MS : 0) + sternumTensionCruiseExtraMs +
      bonusChainAnticipationExtraMs(reel) + rib1TeaseExtraMs(reel);
    reel.spinAnchorAt = null;
    reel.windupActive = false;
    reel.windupRenderLock = false;
    reel.windupBaseStreamIndex = null;
    reel.currentVisibleSymbols = captureCurrentVisibleSymbols(reel);
    reel.currentVisibleGiantSymbol = reel.giantSymbol || null;
    reel.stopStartAt = now + spinLeadTime + cruiseTime + stopOffsetForReel(reel, dynamicStopOffsets);
    if (reel.id === "rib1" && window.OssuaryRib1Tease) {
      window.OssuaryRib1Tease.placeFlyby(reel, reel.stopStartAt, (at) => estimatedBaseCruisePosition(reel, now, at));
    }
    // Esqueletos "de paso" solo visuales del Bonus Game (null fuera de el).
    reel.bonusPassingGiantBlocks = buildBonusModePassingGiantBlocks(reel, now);
    reel.prepareLandingAt = reel.stopStartAt - PREPARE_LANDING_TIME;
    reel.landingPrepared = false;
    reel.decelStartedAt = 0;
    reel.decelStartPosition = reel.position;
    reel.targetPosition = 0;
    reel.settleStartedAt = 0;
    reel.settleStartPosition = 0;
    bonusArrivalPhysics.reset(reel);
    applyDebugGiantPassBlock(reel);
    // Un carry cortado debe abandonar el rodillo con las manos todavia
    // ausentes. Ocultar todo el pool aqui obligaba al renderer a configurar
    // de nuevo ese mismo bloque un instante despues y, correctamente para un
    // bloque nuevo pero incorrectamente para el saliente, restauraba sus
    // manos. Si existe carry conservamos el elemento actual; el render de
    // abajo lo desplaza con la tira y limpiara el estado solo cuando el slot
    // pase de verdad a otro bloque/refPosition.
    if (!reel.carryGiantBlock) {
      clearGiantPool(reel);
    }
    setReelPhase(reel, "accelerating");
    if (!(reel.id === "rib1" && reel.rib1BonusVacant)) {
      renderReel(reel);
    }
    renderGiantBlocks(reel);
    setRespinChargeGlow(reel, isBonusRespinSpeedContext() && reelWillSpinThisStop(reel));
  }

  if (superBonusTransition.active) {
    var rib3TransitionReels = state.reels.filter(function (reel) {
      return reelWillSpinThisStop(reel) && stopSequenceTierForReel(reel) === "rib3";
    });
    if (!rib3TransitionReels.length) {
      resetSuperBonusTransition();
    } else {
      var rib3CompletionAt = Math.max.apply(null, rib3TransitionReels.map(function (reel) {
      return reel.stopStartAt + DECELERATION_TIME + SETTLE_TIME;
      }));
      superBonusTransition.startAt = rib3CompletionAt;
      superBonusTransition.endAt = rib3CompletionAt + superBonusTransitionDurationMs();
      var sharedStopStartAt = superBonusTransition.endAt - DECELERATION_TIME - SETTLE_TIME;
      state.reels.forEach(function (reel) {
        if (!reelWillSpinThisStop(reel) || !isSuperBonusTransitionReel(reel)) return;
        reel.stopStartAt = sharedStopStartAt;
        reel.prepareLandingAt = reel.stopStartAt - PREPARE_LANDING_TIME;
      });
    }
  }

  scheduleBonusChainAnticipationFx(now);

  if (state.currentSpinType === "BONUS") {
    activateRespinStructureSwell(now);
  } else {
    if (!isNormalFreeSpinBonusActive() || !respinStructureSwell.stopControlled) {
      resetRespinStructureSwell();
    }
    clearAllRespinChargeGlow();
  }

  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger(
      state.bonusModeActive ? "bonus_reels_mechanism_started" : "reel_started",
      {}
    );
  }
}

// Cola de render independiente del bucle principal de spin: la reaccion de
// estructura (delay + rise + hold + return) dura mas que el SETTLE_TIME
// real del rodillo, asi que sigue pintando overlay despues de que
// stopReel() detenga el bucle normal (updateSpinFrame deja de llamar a
// updateReel/renderGiantBlocks en cuanto el rodillo pasa a "stopped"). El
// BONUS en si ya esta congelado por ArrivalPhysics (no necesita mas
// frames), pero machineBlockEls si sigue animandose. No toca reel.position
// ni ningun timing de spin-engine.js: solo vuelve a invocar el render del
// giant existente hasta que bonusLandingWeight.isStructureReactionActive()
// se apaga.
function runBonusLandingWeightTail(reel) {
  if (!reel) return;
  function tick() {
    renderGiantBlocks(reel);
    const now = gameNow();
    if (bonusLandingWeight.isStructureReactionActive(now) || isRespinLockPulseActive(now)) {
      window.requestAnimationFrame(tick);
    }
  }
  window.requestAnimationFrame(tick);
}

function triggerRespinLockStructureReaction(lockedReels) {
  if (state.bonusModeActive) return;
  if (!Array.isArray(lockedReels) || !lockedReels.length) return;
  const ribLockId = lockedReels.find((reelId) => {
    return reelId === "rib2-left" ||
      reelId === "rib2-right" ||
      reelId === "rib3-left" ||
      reelId === "rib3-right";
  });
  if (!ribLockId) return;
  const reel = reelByIdForLock(ribLockId);
  if (!reel) return;
  respinLockPulse.active = true;
  respinLockPulse.startAt = gameNow();
  respinLockPulse.strength = (ribLockId === "rib3-left" || ribLockId === "rib3-right") ? 1.4 : 1;
  runBonusLandingWeightTail(reel);
}

// Solo FX: golpe de niebla cuando la guillotina grande cae en rib1 (estilos
// en style.css, .rib1-fog-burst). Se monta en #structureOverlay (misma caja y
// escala que el tablero) con z-index por encima del marco y los rodillos
// pero por debajo de la guillotina (rib1, z 12): la niebla pasa por delante
// de la caja toracica y de los simbolos, no de la cuchilla. Las nubes salen
// en abanico desde el rodillo: mucho recorrido a los lados y hacia abajo
// (rodillos vecinos), poco hacia arriba. Cada una: destino (fx, fy en % de su
// tamano), escala final, giro, retardo y duracion. Determinista (sin azar).
function buildRib1FogBurstPuffs() {
  const puffs = [];
  const count = 14;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.28;
    const reach = 0.62 + 0.38 * Math.abs(Math.sin(i * 78.233));
    const up = Math.sin(angle) < 0;
    puffs.push({
      m: (i % 6) + 1,
      fx: Math.round(Math.cos(angle) * 135 * reach),
      fy: Math.round(Math.sin(angle) * (up ? 28 : 62) * reach),
      fs: 1.15 + 0.55 * Math.abs(Math.sin(i * 4.1414)),
      fr: Math.round(Math.sin(i * 3.7) * 20),
      fl: (i % 5) * 0.04,
      fd: 3.2 + 1.2 * Math.abs(Math.sin(i * 9.17))
    });
  }
  return puffs;
}
const RIB1_FOG_BURST_PUFFS = buildRib1FogBurstPuffs();

// Solo FX: la guillotina grande colgada se balancea al caer. Esta atada por
// arriba, asi que gira sobre su borde superior (el arte): casi no se mueve
// arriba y el filo de abajo se va mas lejos, adelante y atras (rotateX con
// perspectiva) con un leve giro lateral. Pendulo amortiguado: empieza suave,
// llega a su maximo en la segunda oscilacion y se apaga.
const RIB1_SWING_KEYFRAMES = [
  [0, 0],
  [0.09, 3.5],
  [0.24, -10],
  [0.40, 8],
  [0.55, -5.5],
  [0.69, 3.4],
  [0.82, -1.7],
  [0.93, 0.6],
  [1, 0]
];

function swingRib1GiantBlade(reel) {
  const el = reel.giantPool && reel.giantPool.find((item) => !item.hidden);
  const img = el && el.querySelector("img");
  if (!el || !img || typeof el.animate !== "function") return;
  const elRect = el.getBoundingClientRect();
  const imgRect = img.getBoundingClientRect();
  const scaleY = el.offsetHeight ? elRect.height / el.offsetHeight : 1;
  const pivotY = (imgRect.top - elRect.top) / scaleY;
  const pivotX = el.offsetWidth / 2;
  el.getAnimations().forEach((anim) => { if (anim.id === "rib1-swing") anim.cancel(); });
  const anim = el.animate(RIB1_SWING_KEYFRAMES.map(function (k) {
    return {
      offset: k[0],
      transform: "perspective(520px) rotateX(" + k[1] + "deg)",
      // Hacia atras (rotateX negativo) se oscurece un poco, hacia delante se
      // aclara: refuerza la sensacion de profundidad.
      filter: "brightness(" + (1 + k[1] * 0.012).toFixed(3) + ")",
      easing: "ease-in-out"
    };
  }), {
    duration: 2400,
    delay: 60,
    fill: "none"
  });
  anim.id = "rib1-swing";
  el.style.transformOrigin = pivotX + "px " + pivotY + "px";
  const clear = function () { el.style.transformOrigin = ""; };
  anim.addEventListener("finish", clear);
  anim.addEventListener("cancel", clear);
}

function spawnRib1LandingFogBurst(reel) {
  swingRib1GiantBlade(reel);
  const host = structureOverlayEl || reelLayer;
  if (!host || !reel.laneEl) return;
  const burst = document.createElement("div");
  burst.className = "rib1-fog-burst";
  burst.setAttribute("aria-hidden", "true");
  ["left", "top", "width", "height"].forEach(function (prop) {
    burst.style[prop] = reel.laneEl.style[prop];
  });
  burst.style.translate = "-50% -50%";
  const wave = document.createElement("i");
  wave.className = "rib1-fog-burst__wave";
  burst.appendChild(wave);
  const flash = document.createElement("i");
  flash.className = "rib1-fog-burst__flash";
  burst.appendChild(flash);
  RIB1_FOG_BURST_PUFFS.forEach(function (cfg) {
    const puff = document.createElement("i");
    puff.className = "rib1-fog-burst__puff";
    puff.style.setProperty("--fog-mask", 'url("assets/effects/smoke/symbol-smoke-' + cfg.m + '.png")');
    puff.style.setProperty("--fx", cfg.fx + "%");
    puff.style.setProperty("--fy", cfg.fy + "%");
    puff.style.setProperty("--fs", cfg.fs);
    puff.style.setProperty("--fr", cfg.fr + "deg");
    puff.style.setProperty("--fl", cfg.fl + "s");
    puff.style.setProperty("--fd", cfg.fd + "s");
    burst.appendChild(puff);
  });
  host.appendChild(burst);
  window.setTimeout(function () {
    if (burst.parentNode) burst.parentNode.removeChild(burst);
  }, 5000);
}

// --- Anticipacion de la cadena del Execution Bonus (peticion del usuario,
// 2026-10-13) ----------------------------------------------------------------
// En los respins de la cadena (rib1 ya bloqueado), las mitades del siguiente
// grupo que falta (rib2 o rib3) se hacen esperar BONUS_CHAIN_ANTICIPATION_EXTRA_MS
// (con un solo grupo pendiente, mas) y los rodillos que paran despues de ellas
// en el orden normal se retrasan lo mismo: siguen girando durante la espera.
// Asi la secuencia es igual tanto si completan la cadena (donde el motor ya
// retiene a esos rodillos para su transicion) como si no; si no, al final hay
// un "casi". Durante la espera el tablero se oscurece, su carga azul se
// acelera y se enciende, el carril tiembla un poco y suenan los latidos. Solo
// tiempo de giro y presentacion: el resultado ya esta decidido y no cambia.
const BONUS_CHAIN_GROUPS = [["rib1"], ["rib2-left", "rib2-right"], ["rib3-left", "rib3-right"]];
const BONUS_CHAIN_ANTICIPATION_EXTRA_MS = { 1: 1600, 2: 900 };
let bonusChainAnticipation = null;
let bonusChainVignetteEl = null;

// Al preparar cada tirada (prepareReelStops): que mitades se hacen esperar.
function planBonusChainAnticipation() {
  endBonusChainAnticipationFx();
  bonusChainAnticipation = null;
  if (state.bonusModeActive || state.currentSpinType !== "BONUS") return;
  const locked = new Set(state.reels.filter((reel) => reel.locked).map((reel) => reel.id));
  if (!locked.has("rib1")) return;
  const pending = BONUS_CHAIN_GROUPS.filter((group) => group.some((id) => !locked.has(id)));
  const extraMs = pending.length ? BONUS_CHAIN_ANTICIPATION_EXTRA_MS[pending.length] || 0 : 0;
  if (!extraMs) return;
  const reelIds = pending[0].filter((id) => !locked.has(id));
  bonusChainAnticipation = {
    reelIds: new Set(reelIds),
    tierIndex: STOP_SEQUENCE_TIER_ORDER.indexOf(stopSequenceTierForReel(state.reels.find((reel) => reel.id === reelIds[0]))),
    extraMs,
    fxOn: false,
    timer: 0
  };
}

// La misma espera para rib2 en la tirada base en la que cae la guillotina en
// rib1 (startInlineRib1BonusContinuation): ahi se decide rib2 y, si falla, la
// cadena se acaba, asi que hasta ahora rib2 nunca tenia su momento (peticion
// del usuario, 2026-10-15). Solo tiempo de giro y presentacion.
function planInlineRib2Anticipation() {
  endBonusChainAnticipationFx();
  bonusChainAnticipation = null;
  const reelIds = BONUS_CHAIN_GROUPS[1].filter((id) => {
    const reel = state.reels.find((item) => item.id === id);
    return reel && !reel.locked && reel.phase !== "stopped" && reel.phase !== "idle";
  });
  if (!reelIds.length) return;
  bonusChainAnticipation = {
    reelIds: new Set(reelIds),
    tierIndex: STOP_SEQUENCE_TIER_ORDER.indexOf(stopSequenceTierForReel(state.reels.find((reel) => reel.id === reelIds[0]))),
    extraMs: BONUS_CHAIN_ANTICIPATION_EXTRA_MS[2],
    fxOn: false,
    timer: 0
  };
}

// Crucero extra: la espera, para las mitades que se hacen esperar y para los
// rodillos que paran despues de ellas.
function bonusChainAnticipationExtraMs(reel) {
  const plan = bonusChainAnticipation;
  if (!plan) return 0;
  if (plan.reelIds.has(reel.id)) return plan.extraMs;
  return STOP_SEQUENCE_TIER_ORDER.indexOf(stopSequenceTierForReel(reel)) > plan.tierIndex ? plan.extraMs : 0;
}

// Al final de prepareReelStops: el efecto empieza cuando esas mitades habrian
// parado sin la espera (reloj del juego; en turbo, speedMs).
function scheduleBonusChainAnticipationFx(now) {
  const plan = bonusChainAnticipation;
  if (!plan) return;
  const reels = state.reels.filter((reel) => plan.reelIds.has(reel.id) && reelWillSpinThisStop(reel));
  if (!reels.length) {
    bonusChainAnticipation = null;
    return;
  }
  const startAt = Math.min.apply(null, reels.map((reel) => reel.stopStartAt - plan.extraMs));
  plan.timer = window.setTimeout(function () {
    plan.timer = 0;
    if (bonusChainAnticipation === plan && !plan.fxOn) startBonusChainAnticipationFx();
  }, speedMs(startAt - now));
}

// Tras parar cada rodillo (stopReel): cuando paran las mitades que se hacian
// esperar, se acaba el efecto.
function syncBonusChainAnticipation() {
  const plan = bonusChainAnticipation;
  if (!plan || !plan.fxOn) return;
  const spinning = state.reels.filter((reel) => reel.phase !== "stopped" && reel.phase !== "idle");
  if (!spinning.some((reel) => plan.reelIds.has(reel.id))) {
    // "Casi": tras la espera no completa la cadena (el bloqueo, si llega, ya
    // tiene su propio golpe).
    const landed = Array.from(plan.reelIds).every((id) => {
      const reel = state.reels.find((item) => item.id === id);
      return reel && reel.giantSymbol === "RIB_BONUS";
    });
    endBonusChainAnticipationFx();
    if (!landed) flashBonusChainNearMiss(plan.reelIds);
    bonusChainAnticipation = null;
  }
}

function flashBonusChainNearMiss(reelIds) {
  state.reels.forEach((reel) => {
    if (!reelIds.has(reel.id) || !reel.laneEl) return;
    const lane = reel.laneEl;
    lane.classList.remove("is-bonus-anticipation-miss");
    void lane.offsetWidth;
    lane.classList.add("is-bonus-anticipation-miss");
    window.setTimeout(() => lane.classList.remove("is-bonus-anticipation-miss"), speedMs(800));
  });
  if (window.OssuaryAudio) window.OssuaryAudio.trigger("bonus_chain_near_miss", {});
}

function setBonusChainAnticipationClass(on) {
  const plan = bonusChainAnticipation;
  state.reels.forEach((reel) => {
    const lit = Boolean(on && plan && plan.reelIds.has(reel.id));
    if (reel.laneEl) reel.laneEl.classList.toggle("is-bonus-anticipation", lit);
    if (reel.continuousTrackEl) reel.continuousTrackEl.classList.toggle("is-bonus-anticipation", lit);
  });
}

function startBonusChainAnticipationFx() {
  const plan = bonusChainAnticipation;
  if (!plan || plan.fxOn) return;
  plan.fxOn = true;
  setBonusChainAnticipationClass(true);
  if (!bonusChainVignetteEl) {
    bonusChainVignetteEl = document.createElement("div");
    bonusChainVignetteEl.className = "stone-tension-vignette";
    document.body.appendChild(bonusChainVignetteEl);
    void bonusChainVignetteEl.offsetWidth;
  }
  bonusChainVignetteEl.classList.add("is-on");
  if (window.OssuaryAudio) window.OssuaryAudio.trigger("bonus_chain_anticipation", {});
  if (window.OssuaryBonusChainTension) {
    const pending = state.reels.filter((reel) => plan.reelIds.has(reel.id));
    const now = gameNow();
    const expectedEndAt = Math.max(...pending.map((reel) => reel.stopStartAt + DECELERATION_TIME + SETTLE_TIME));
    window.OssuaryBonusChainTension.start({
      vignette: bonusChainVignetteEl,
      pending: pending.map((reel) => reel.laneEl).filter(Boolean),
      bladeRect: () => {
        const rib1 = state.reels.find((reel) => reel.id === "rib1");
        const el = rib1 && (rib1.giantStripEl || rib1.laneEl);
        return el ? el.getBoundingClientRect() : null;
      },
      now,
      remainingMs: Math.max(1, expectedEndAt - now),
      speedMs
    });
  }
  // El encapuchado mira: dos ascuas rojas en la capucha hasta el desenlace.
  showHoodEyes("watch");
}

function updateBonusChainAnticipationFx(now) {
  const plan = bonusChainAnticipation;
  if (!plan || !plan.fxOn || !window.OssuaryBonusChainTension) return;
  const remaining = state.reels
    .filter((reel) => plan.reelIds.has(reel.id) && reel.phase !== "stopped" && reel.phase !== "idle")
    .map((reel) => reel.stopStartAt + DECELERATION_TIME + SETTLE_TIME - now);
  if (remaining.length) window.OssuaryBonusChainTension.update(now, Math.max(0, ...remaining));
}

function endBonusChainAnticipationFx() {
  if (bonusChainAnticipation && bonusChainAnticipation.timer) {
    window.clearTimeout(bonusChainAnticipation.timer);
    bonusChainAnticipation.timer = 0;
  }
  if (window.OssuaryBonusChainTension) window.OssuaryBonusChainTension.stop();
  if (!bonusChainAnticipation || !bonusChainAnticipation.fxOn) return;
  bonusChainAnticipation.fxOn = false;
  setBonusChainAnticipationClass(false);
  if (bonusChainVignetteEl) bonusChainVignetteEl.classList.remove("is-on");
  if (window.OssuaryAudio) window.OssuaryAudio.trigger("bonus_chain_anticipation_end", {});
  if (window.OssuaryHoodEyes && window.OssuaryHoodEyes.release) window.OssuaryHoodEyes.release("watch");
}

function stoppedReelLanding(reel) {
  const isSymbol = (symbol) => typeof symbol === "string" && symbol.length > 0;
  const complete = (symbols) => Array.isArray(symbols) && symbols.length === reel.cells.length &&
    reel.cells.every((cell, index) => isSymbol(symbols[index]));
  const selected = economicSpinPlan && economicSpinPlan.outcomes && economicSpinPlan.outcomes[reel.id];
  const hasActive = Array.isArray(reel.activeLandingSymbols) && reel.activeLandingSymbols.length > 0;
  const active = hasActive ? reel.activeLandingSymbols : reel.currentVisibleSymbols;
  const candidate = economicSpinPlan ? selected && selected.symbols : active;
  if (complete(candidate)) return {
    symbols: economicSpinPlan || hasActive ? candidate.slice() : candidate,
    selected, recovered: false
  };

  const copy = (symbols) => Array.isArray(symbols) ? Array.from(symbols) : null;
  const diagnostic = {
    rootId: economicRounds.current() && economicRounds.current().id,
    spinId: state.currentSpinId,
    mode: state.bonusModeActive ? state.bonusModeType : state.currentSpinType,
    planKind: economicSpinPlan && economicSpinPlan.kind,
    reelId: reel.id,
    phase: reel.phase,
    expectedLength: reel.cells.length,
    actualLength: Array.isArray(candidate) ? candidate.length : null,
    missingIndices: reel.cells.map((cell, index) => index).filter((index) => !isSymbol(candidate && candidate[index])),
    finalSymbols: copy(reel.currentVisibleSymbols),
    activeLandingSymbols: copy(reel.activeLandingSymbols),
    pendingFinalSymbols: copy(reel.pendingFinalSymbols),
    selectedSymbols: copy(selected && selected.symbols)
  };
  // A selected economic result is immutable. Never replace it with initials,
  // borrow another result or draw new symbols to conceal a contract failure.
  if (economicSpinPlan) {
    console.error("[Ossuary Stop Recovery] invalid selected landing", diagnostic);
    throw new Error("Invalid selected reel landing: " + reel.id);
  }
  const symbols = reel.cells.map((cell, index) => {
    const sources = [active, reel.activeLandingSymbols, reel.pendingFinalSymbols, reel.currentVisibleSymbols];
    for (const source of sources) {
      if (Array.isArray(source) && isSymbol(source[index])) return source[index];
    }
    return cell.initial;
  });
  if (!complete(symbols)) {
    console.error("[Ossuary Stop Recovery] unrecoverable landing", diagnostic);
    throw new Error("Unrecoverable reel landing: " + reel.id);
  }
  console.warn("[Ossuary Stop Recovery] missing visible symbols", Object.assign(diagnostic, {
    recovered: true, recoveredSymbols: symbols.slice()
  }));
  return { symbols, selected: null, recovered: true };
}

function stopReel(reel) {
  // Resolve the complete landing before the first render/commit, including
  // short/sparse caches. The ordinary valid path keeps its original FX order.
  const landing = stoppedReelLanding(reel);
  reel.position = reel.targetPosition;
  reel.velocity = 0;
  reel.windupRenderLock = false;
  reel.windupActive = false;
  if (landing.selected) {
    const selected = landing.selected;
    reel.activeLandingSymbols = selected.symbols.slice();
    reel.activeLandingGiantSymbol = selected.giant;
    reel.finalSymbols = selected.symbols.slice();
    reel.giantSymbol = selected.giant;
    buildFinalSymbolMap(reel, reel.targetPosition);
  }
  reel.carryGiantBlock = null;
  // Los bloques passing son solo relleno visual durante el movimiento. Nunca
  // deben sobrevivir al STOP ni quedar congelados sobre una mitad vacia.
  // La poda previa intenta sacarlos de viewport; este cierre explicito hace
  // que el contrato sea absoluto incluso ante un frame tardio o un limite de
  // visibilidad exacto (fallo visto en rib5-left).
  reel.bonusPassingGiantBlocks = null;
  // Amago de rib1: su golpe o su "casi"; la guillotina a medias se queda.
  reel.stopScript = null;
  if (reel.id === "rib1" && window.OssuaryRib1Tease) window.OssuaryRib1Tease.reelStopped(reel);
  reel.currentVisibleSymbols = landing.symbols;
  reel.currentVisibleGiantSymbol = reel.activeLandingGiantSymbol || reel.giantSymbol || null;
  if (landing.recovered && !reel.currentVisibleGiantSymbol) {
    reel.currentVisibleGiantSymbol = reel.pendingGiantSymbol || null;
  }
  reel.finalSymbols = reel.currentVisibleSymbols.slice();
  reel.giantSymbol = reel.currentVisibleGiantSymbol;
  if (landing.recovered) buildFinalSymbolMap(reel, reel.targetPosition);
  renderReel(reel);
  commitVisibleSymbols(reel);
  if (
    isNormalFreeSpinBonusActive() &&
    reel.id === "sternum" &&
    respinStructureSwell.active &&
    respinStructureSwell.stopControlled
  ) {
    resetRespinStructureSwell();
    renderGiantBlocks(reel);
  }
  if (
    !state.bonusModeActive &&
    (state.currentSpinType === "BONUS" || isInlineRib1BonusContinuationActive()) &&
    reel.giantSymbol === "RIB_BONUS" &&
    !reel.locked
  ) {
    triggerRespinLandingFlash(reel);
  }
  if (
    !state.bonusModeActive &&
    !reel.locked &&
    (reel.giantSymbol === "RIB_BONUS" || reel.giantSymbol === STERNUM_GIANT_SYMBOL)
  ) {
    triggerBackgroundBonusFlash();
  }
  if (reel.id === "rib1" && reel.giantSymbol === "RIB_BONUS" && !state.bonusModeActive && !reel.locked) {
    spawnRib1LandingFogBurst(reel);
  }
  reel.pendingFinalSymbols = null;
  reel.pendingGiantSymbol = null;
  reel.activeLandingSymbols = null;
  reel.activeLandingGiantSymbol = null;
  reel.loopSymbolMap = new Map();
  reel.customCruiseSpeed = null;
  setReelPhase(reel, "stopped");
  reelModel.syncGiantActive(reel);
  renderGiantBlocks(reel);
  syncStageModeClasses();
  if (isNormalFreeSpinBonusActive() && reel.id === "sternum") {
    flashBonusModeSternumResultLight(
      BONUS_MODE_STERNUM_BLADE_SYMBOLS.includes(reel.giantSymbol) ? "success" : "fail"
    );
  }
  validateGiantSymbolSync(reel, "stopReel");
  startInlineRib1BonusContinuation(reel);
  setRespinChargeGlow(reel, false);
  if (window.OssuaryAudio) {
    if (state.bonusModeActive) {
      window.OssuaryAudio.trigger("bonus_reel_stopped", { reelId: reel.id });
    } else {
      if (
        reel.id === "rib1" &&
        state.currentSpinType === "BASE" &&
        reel.giantSymbol === "RIB_BONUS" &&
        !reel.locked
      ) {
        window.OssuaryAudio.trigger("rib1_bonus_respin_started", { reelId: reel.id });
      }
      window.OssuaryAudio.trigger("reel_stopped", { reelId: reel.id });
    }
  }
  // Execution Bonus: un esqueleto que aterriza abre la niebla de su rodillo.
  if (state.bonusModeActive && bonusLaneFog && BONUS_LANE_FOG_SKELETONS.indexOf(reel.giantSymbol) !== -1) {
    bonusLaneFog.impact(reel.id);
  }
  syncExecutionLastChance(reel);
  syncElJuicioDarkSternum(reel);
  syncBonusChainAnticipation();
}

// Ultima oportunidad del Execution Bonus (peticion del usuario, 2026-10-16):
// con la ultima vela gastada en esta tirada y esqueletos en el tablero, cuando
// solo queda el esternon girando cae la oscuridad, laten los latidos, la vela
// tiembla y los esqueletos tiritan hasta que para (src/fx/execution-tension.js).
// Solo presentacion.
function boardSkeletonEls() {
  const els = [];
  BONUS_MODE_HAND_CUT_REEL_IDS.forEach((reelId) => {
    const reel = reelByIdForLock(reelId);
    if (!reel) return;
    const symbol = reel.locked && reel.lockedSymbol ? reel.lockedSymbol : reel.giantSymbol;
    if (!BONUS_MODE_SKELETON_SYMBOLS.includes(symbol)) return;
    const el = visibleFreeSpinSkeletonSourceEl(reel);
    if (el) els.push(el);
  });
  return els;
}

function syncExecutionLastChance(reel) {
  const tension = window.OssuaryExecutionTension;
  if (!tension) return;
  if (reel.id === "sternum") {
    if (tension.isLastChanceOn()) {
      tension.endLastChance(BONUS_MODE_STERNUM_BLADE_SYMBOLS.includes(reel.giantSymbol) ? "blade" : "miss");
      if (window.OssuaryHoodEyes && window.OssuaryHoodEyes.release) window.OssuaryHoodEyes.release("watch");
    }
    return;
  }
  maybeStartExecutionLastChance();
}

// Tambien al poco de arrancar la tirada: con todas las costillas bloqueadas
// solo gira el esternon y ningun otro rodillo "para".
function maybeStartExecutionLastChance() {
  const tension = window.OssuaryExecutionTension;
  if (!tension || !state.spinning) return;
  if (!isNormalFreeSpinBonusActive() || state.bonusModeSpinStartChances !== 1 || tension.isLastChanceOn()) return;
  const sternum = reelByIdForLock("sternum");
  if (!sternum || sternum.phase === "stopped" || sternum.phase === "idle") return;
  const othersSpinning = state.reels.some((item) => {
    return item !== sternum && !item.locked && item.phase !== "stopped" && item.phase !== "idle";
  });
  if (othersSpinning) return;
  const skeletons = boardSkeletonEls();
  if (!skeletons.length) return;
  tension.startLastChance({ skeletons, candleCounter: bonusCandleCounterEl });
  showHoodEyes("watch");
}

function maybePlayFinalGuadana(bonusResult) {
  if (!isNormalFreeSpinBonusActive() || (state.bonusModeSpinsRemaining || 0) > 0) return false;
  const sternum = reelByIdForLock("sternum");
  if (!sternum || sternum.giantSymbol !== "GUADANA_BONUS") return false;
  if (!playGuadanaHeadsCutSequence()) return false;
  state.busy = true;
  const holdUntil = Date.now() + GUADANA_NEXT_SPIN_HOLD_MS;
  const next = Object.assign({}, bonusResult || {}, { skipFinalGuadana: true });
  const wait = function () {
    if (Date.now() < holdUntil || guadanaHeadsPayoutPending || cutPrizeHolding()) {
      window.setTimeout(wait, 200);
      return;
    }
    handleBonusNextAction(next);
  };
  window.setTimeout(wait, 400);
  return true;
}

// Ultimo Aliento (peticion del usuario, 2026-10-16): se apaga la ultima vela
// con esqueletos en el tablero -> oscuridad y espera; a veces se enciende otra
// (src/bonus/execution-enhancers.js decide; src/fx/execution-tension.js lo
// ensena). Devuelve true si se encarga del final (y vuelve a llamar a
// handleBonusNextAction al acabar).
function maybePlayExecutionLastBreath(bonusResult) {
  const tension = window.OssuaryExecutionTension;
  if (!tension || !executionEnhancers || !isNormalFreeSpinBonusActive()) return false;
  if ((state.bonusModeSpinsRemaining || 0) > 0 || (bonusResult && bonusResult.bladeLanded)) return false;
  const skeletons = boardSkeletonEls().length;
  const used = state.lastBreathUsed || 0;
  if (!executionEnhancers.lastBreathApplies({ skeletons, used })) return false;
  const saved = economicSpinPlan && economicSpinPlan.kind === "normal"
    ? economicSpinPlan.lastBreath : executionEnhancers.rollLastBreath({ used });
  if (saved === null) return false;
  const resume = function () {
    if (window.OssuaryHoodEyes && window.OssuaryHoodEyes.release) window.OssuaryHoodEyes.release("watch");
    handleBonusNextAction(Object.assign({}, bonusResult || {}, { skipLastBreath: true }));
  };
  state.busy = true;
  const play = function () {
    showHoodEyes("watch");
    if (window.OssuaryAudio && typeof window.OssuaryAudio.duck === "function") {
      window.OssuaryAudio.duck("MUSIC", 0.8, 2600);
    }
    tension.playLastBreath({
      success: saved,
      candleSlot: bonusCandleSlots[bonusCandleSlots.length - 1] || null,
      onRelight: function () {
        state.lastBreathUsed = used + 1;
        bonusModeRuntime.grantSpins(executionEnhancers.lastBreathSpins());
        syncBonusModeReadout();
        render();
      },
      onDone: resume
    });
  };
  // El recuento ya termino, pero su cifra permanece hasta hide().
  // Esperar tambien su salida para que no tape el Ultimo Aliento.
  if (bigWinCounterOnScreen) bigWinCounter.hide().then(play);
  else play();
  return true;
}

const spinEngine = window.OssuarySpinEngine.create({
  config: {
    ACCELERATION_TIME,
    MAX_REEL_SPEED,
    CRUISE_SPEED,
    DECELERATION_TIME,
    STOP_OVERSHOOT_SYMBOLS,
    STOP_REBOUND_SYMBOLS,
    SETTLE_TIME,
    WINDUP_TIME: SPIN_CONFIG.WINDUP_TIME,
    WINDUP_PEAK_SPEED: SPIN_CONFIG.WINDUP_PEAK_SPEED
  },
  hooks: {
    getSpinStartTime: () => state.spinStartTime,
    deterministicSymbol,
    setReelPhase,
    renderReel,
    renderGiantBlocks,
    prepareReelLanding,
    stopReel,
    // Amagos de la guillotina de rib1 (src/fx/rib1-tease.js): su recorrido
    // de parada; null en cualquier otra tirada o rodillo.
    buildStopScript: (reel, startPosition, cruiseSpeed) => window.OssuaryRib1Tease
      ? window.OssuaryRib1Tease.buildStopScript(reel, startPosition, cruiseSpeed)
      : null
  }
});

// Amagos de rib1: sus esperas van al ritmo del juego (turbo) y el
// encapuchado los mira, como en la espera de la cadena.
if (window.OssuaryRib1Tease) {
  window.OssuaryRib1Tease.configure({
    speedMs,
    onWatch: () => showHoodEyes("watch"),
    onRelease: () => {
      if (window.OssuaryHoodEyes && window.OssuaryHoodEyes.release) window.OssuaryHoodEyes.release("watch");
    }
  });
}

function updateAccelerationAndCruise(reel, now, dtSec) {
  spinEngine.updateAccelerationAndCruise(reel, now, dtSec);
}

function updateReel(reel, now, dtSec) {
  spinEngine.updateReel(reel, now, dtSec);
}

const bonusTriggerEngine = window.OssuaryBonusTriggerEngine.create({
  state,
  config: {
    BONUS_RIB_TRIGGER_GROUPS,
    BONUS_TRIGGER_STATES,
    STERNUM_GIANT_SYMBOL
  }
});

function reelById(reelId) {
  return bonusTriggerEngine.reelById(reelId);
}

function bonusRibTriggerItems() {
  return bonusTriggerEngine.bonusRibTriggerItems();
}

function isBonusTriggerConditionMet() {
  return bonusTriggerEngine.isBonusTriggerConditionMet();
}

function isSuperBonusTriggerConditionMet() {
  return bonusTriggerEngine.isSuperBonusTriggerConditionMet();
}

function detectBonusTrigger() {
  return bonusTriggerEngine.detectBonusTrigger();
}

function dispatchBonusTrigger(trigger) {
  if (!trigger) return;

  window.dispatchEvent(new CustomEvent("ossuary:bonus-trigger", {
    detail: trigger
  }));

  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info(trigger.announcement, trigger);
  }
}

window.OssuaryBonusTriggers = {
  states: BONUS_TRIGGER_STATES,
  detect: detectBonusTrigger,
  isBonusTriggered: isBonusTriggerConditionMet,
  isSuperBonusTriggered: isSuperBonusTriggerConditionMet,
  last() {
    return state.bonusTrigger;
  }
};

function fullSymbolList(symbols, expectedCount, symbol) {
  return Array.isArray(symbols) &&
    symbols.length === expectedCount &&
    symbols.every((entry) => entry === symbol);
}

function visibleRibBonusGiantState(reel) {
  return visibleGiantSymbolState(reel, "RIB_BONUS");
}

function visibleSternumBonusGiantState(reel) {
  return visibleGiantSymbolState(reel, STERNUM_GIANT_SYMBOL);
}

function visibleGiantSymbolState(reel, symbol) {
  const entries = [];
  if (!reel || !Array.isArray(reel.giantPool)) return {
    appearsComplete: false,
    entries
  };

  for (const el of reel.giantPool) {
    if (el.hidden || el.dataset.symbol !== symbol) continue;
    const transform = el.style.transform || "";
    const match = transform.match(/translate(?:X|Y)\((-?\d+(?:\.\d+)?)px\)/);
    const offsetPx = match ? Number(match[1]) : 0;
    entries.push({
      symbol: el.dataset.symbol,
      hidden: el.hidden,
      transform,
      offsetPx
    });
  }

  return {
    appearsComplete: entries.some((entry) => Math.abs(entry.offsetPx) <= 1),
    entries
  };
}

function inspectRibBonusLandingState() {
  return Array.from(RIB_BONUS_REELS).map((reelId) => {
    const reel = reelByIdForLock(reelId);
    const cellEffective = reel ? reel.cells.map((cell) => cell.effective) : [];
    const finalSymbols = reel && Array.isArray(reel.finalSymbols) ? [...reel.finalSymbols] : [];
    const cellCount = reel ? reel.cells.length : 0;
    const visual = visibleRibBonusGiantState(reel);
    const sources = {
      giantSymbol: reel && reel.giantSymbol === "RIB_BONUS",
      finalSymbols: fullSymbolList(finalSymbols, cellCount, "RIB_BONUS"),
      cellEffective: fullSymbolList(cellEffective, cellCount, "RIB_BONUS"),
      lockedSymbol: reel && reel.lockedSymbol === "RIB_BONUS",
      lockedGiantBlock: reel && reel.lockedGiantBlock && reel.lockedGiantBlock.symbol === "RIB_BONUS",
      // Diagnostico unicamente: la posicion renderizada de un bloque gigante
      // "de paso"/carryover puede realinearse con offset~0 por coincidencia
      // ciclica del strip sin que sea el outcome real de esta tirada. No es
      // una fuente fiable de secuencia y NO debe contar como landing real
      // (ver completedByRibBonus mas abajo: solo fuentes ligadas al outcome
      // ordenado de outcome-engine.js cuentan).
      visualComplete: visual.appearsComplete
    };
    const completedByRibBonus = Boolean(
      sources.giantSymbol ||
      sources.finalSymbols ||
      sources.cellEffective ||
      sources.lockedSymbol ||
      sources.lockedGiantBlock
    );

    return {
      reelId,
      giantSymbol: reel ? reel.giantSymbol : null,
      finalSymbols,
      cellEffective,
      locked: Boolean(reel && reel.locked),
      lockedSymbol: reel ? reel.lockedSymbol : null,
      lockedGiantBlock: reel && reel.lockedGiantBlock ? Object.assign({}, reel.lockedGiantBlock) : null,
      visualRibBonusGiant: visual,
      sources,
      completedByRibBonus,
      detectedAsNewLock: false
    };
  });
}

function ribBonusLandingReelsFromInspection(inspection) {
  return inspection
    .filter((item) => item.completedByRibBonus)
    .map((item) => item.reelId);
}

function inspectSternumBonusLandingState() {
  const reel = state.sternumReel;
  const cellEffective = reel ? reel.cells.map((cell) => cell.effective) : [];
  const finalSymbols = reel && Array.isArray(reel.finalSymbols) ? [...reel.finalSymbols] : [];
  const cellCount = reel ? reel.cells.length : 0;
  const visual = visibleSternumBonusGiantState(reel);
  const sources = {
    giantSymbol: reel && reel.giantSymbol === STERNUM_GIANT_SYMBOL,
    finalSymbols: fullSymbolList(finalSymbols, cellCount, STERNUM_GIANT_SYMBOL),
    cellEffective: fullSymbolList(cellEffective, cellCount, STERNUM_GIANT_SYMBOL),
    lockedSymbol: reel && reel.lockedSymbol === STERNUM_GIANT_SYMBOL,
    lockedGiantBlock: reel && reel.lockedGiantBlock && reel.lockedGiantBlock.symbol === STERNUM_GIANT_SYMBOL,
    // Diagnostico unicamente, ver comentario equivalente en
    // inspectRibBonusLandingState. No cuenta como landing real.
    visualComplete: visual.appearsComplete
  };
  const completedBySternumBonus = Boolean(
    sources.giantSymbol ||
    sources.finalSymbols ||
    sources.cellEffective ||
    sources.lockedSymbol ||
    sources.lockedGiantBlock
  );

  return {
    reelId: reel ? reel.id : "sternum",
    giantSymbol: reel ? reel.giantSymbol : null,
    finalSymbols,
    cellEffective,
    locked: Boolean(reel && reel.locked),
    lockedSymbol: reel ? reel.lockedSymbol : null,
    lockedGiantBlock: reel && reel.lockedGiantBlock ? Object.assign({}, reel.lockedGiantBlock) : null,
    visualSternumBonusGiant: visual,
    sources,
    completedBySternumBonus,
    detectedAsNewLock: false
  };
}

function sternumBonusLandingReelFromInspection(inspection) {
  return inspection && inspection.completedBySternumBonus ? inspection.reelId : null;
}

function updateLandingInspectionWithBonusResult(inspection, bonusResult) {
  const newLockSet = new Set((bonusResult && bonusResult.newLockedReels) || []);
  const lockedSet = new Set((bonusResult && bonusResult.lockedReels) || []);
  return inspection.map((item) => Object.assign({}, item, {
    detectedAsNewLock: newLockSet.has(item.reelId),
    detectedAsLocked: lockedSet.has(item.reelId)
  }));
}

function updateSternumInspectionWithBonusResult(inspection, bonusResult) {
  const newLockSet = new Set((bonusResult && bonusResult.newLockedReels) || []);
  const lockedSet = new Set((bonusResult && bonusResult.lockedReels) || []);
  const reel = reelByIdForLock(inspection.reelId);
  return Object.assign({}, inspection, {
    detectedAsNewLock: newLockSet.has(inspection.reelId),
    detectedAsLocked: lockedSet.has(inspection.reelId),
    actualLockedAfterApply: Boolean(reel && reel.locked),
    actualLockedSymbolAfterApply: reel ? reel.lockedSymbol : null,
    lockMismatch: Boolean(inspection.completedBySternumBonus && !(reel && reel.locked))
  });
}

function refreshSternumLockInspectionAfterApply() {
  if (!state.lastSternumBonusLandingInspection) return;
  state.lastSternumBonusLandingInspection = updateSternumInspectionWithBonusResult(
    state.lastSternumBonusLandingInspection,
    {
      newLockedReels: state.lastSternumBonusLandingInspection.detectedAsNewLock ? ["sternum"] : [],
      lockedReels: bonusFeature.getState().lockedReels
    }
  );
}

function finishSpin() {
  state.spinFrame = null;
  setGameStatus(GAME_STATES.LANDING, "spin_finished");
  if (state.debugGiantTest && !state.debugGiantTest.debugWinAnimation) {
    state.spinning = false;
    state.busy = false;
    console.log("[busy] set false - reason: debugGiantTest finishSpin");
    const trigger = detectBonusTrigger();
    const bonusResult = bonusFeature.onSpinFinished({
      trigger,
      reels: state.reels,
      bet: currentBet(),
      debugMode: true,
      spinType: "DEBUG"
    });
    state.bonusTrigger = trigger;
    state.bonusLabel = bonusResult.label || state.debugGiantTest.label;
    state.win = 0;
    state.debugGiantTest = null;
    clearBonusFxLayers();
    dispatchBonusTrigger(trigger);
    // Mismo flujo de audio que un spin real: este return temprano es el
    // unico punto de salida de finishSpin() para tests de debug, asi que
    // sin este trigger el loop de "reel-spin-start" (arrancado en
    // startSpin) nunca recibe la senal de stop y queda sonando indefinida-
    // mente despues de cualquier test del panel de debug.
    if (window.OssuaryAudio) {
      window.OssuaryAudio.trigger("spin_finished", { spinType: "DEBUG", win: 0, winMultiple: 0 });
    }
    render();
    return;
  }

  const trigger = detectBonusTrigger();
  const spinType = state.currentSpinType || "BASE";
  const inlineRib1BonusContinuation = Boolean(
    state.inlineRib1BonusContinuationStartedSpinId === state.currentSpinId
  );
  const isBonusModeFreeSpin = Boolean(state.bonusModeActive && spinType !== "BONUS");
  // Evaluacion PROVISIONAL (board limpio, antes de las cuchillas): se usa para
  // la deteccion de bonus y para los pagos de bonus/free-spin (que no tienen
  // cuchillas). En spin BASE la ganancia se RECALCULA tras la secuencia de la
  // cuchilla (ver revealWinAndFinish), cuando el board ya refleja las casillas
  // cortadas (vacias) y los cuervos muertos (WILD + multiplicador).
  let mathSpinResult = resolveMathSpinResult();
  let spinWin = Math.round(mathSpinResult.resolution.total * 100) / 100;
  const ribBonusInspection = inspectRibBonusLandingState();
  const ribBonusLandingReels = economicSpinPlan && economicSpinPlan.kind === "base"
    ? Object.keys(economicSpinPlan.outcomes).filter((id) => RIB_BONUS_REELS.has(id) && economicSpinPlan.outcomes[id].giant === "RIB_BONUS")
    : ribBonusLandingReelsFromInspection(ribBonusInspection);
  const sternumBonusInspection = inspectSternumBonusLandingState();
  const sternumBonusLandingReel = sternumBonusLandingReelFromInspection(sternumBonusInspection);
  const bonusResult = isBonusModeFreeSpin
    ? resolveBonusModeFreeSpinResult()
    : bonusFeature.onSpinFinished({
        trigger,
        reels: state.reels,
        ribBonusLandingReels,
        ribBonusLandingInspection: ribBonusInspection,
        sternumBonusLandingReel,
        sternumBonusLandingInspection: sternumBonusInspection,
        bet: currentBet(),
        debugMode: false,
        spinType,
        spinWin,
        inlineRib1BonusContinuation
      });
  state.lastRibBonusLandingInspection = updateLandingInspectionWithBonusResult(ribBonusInspection, bonusResult);
  if (economicSpinPlan) {
    if (economicSpinPlan.kind === "base" && economicSpinPlan.kills.length) {
      if (!state.ravenChain) startRavenChain();
      state.ravenChain.kills += economicSpinPlan.kills.length;
    }
  }
  state.lastSternumBonusLandingInspection = updateSternumInspectionWithBonusResult(sternumBonusInspection, bonusResult);
  // Solo debug: si esta tirada bloqueo algo nuevo, para el overlay temporal.
  state.debugNewLockThisSpin = Boolean(bonusResult.newLockedReels && bonusResult.newLockedReels.length);
  state.bonusTrigger = trigger;
  state.bonusLabel = bonusResult.label || "";
  applyBonusLocks(bonusResult.lockedReels, bonusResult.lockedSymbols || state.bonusLockedSymbols);
  state.inlineRib1BonusContinuationActive = false;
  if (state.bonusModeActive) {
    ensureFixedBonusModeRib1Lock(reelByIdForLock("rib1"));
  }
  refreshSternumLockInspectionAfterApply();
  if (spinType === "BONUS") {
    emitBonusLogicEvent("onRespinEnded", {
      phase: bonusResult.phase,
      newLockedReels: bonusResult.newLockedReels || [],
      lockedReels: bonusResult.lockedReels || []
    });
  }
  let paymentAmount = 0;
  if (spinType === "BONUS") {
    state.win = bonusResult.bonusWinToPay > 0 ? bonusResult.bonusWinToPay : spinWin;
    paymentAmount = bonusResult.bonusWinToPay > 0 ? bonusResult.bonusWinToPay : 0;
  } else if (isBonusModeFreeSpin) {
    // Rediseño FREE SPIN: el unico pago del modo es el premio de los
    // esqueletos cortados por la cuchilla (resolveBonusModeFreeSpinResult);
    // la evaluacion de lineas base no aplica sobre los simbolos del bonus.
    state.win = 0;
    paymentAmount = 0;
    state.bonusModePendingBladePayoutRows = Array.isArray(bonusResult.bladePayoutRows)
      ? bonusResult.bladePayoutRows.map((row) => ({ rowIndex: row.rowIndex, amount: row.amount }))
      : [];
  } else {
    state.win = bonusResult.suppressBaseWin ? 0 : spinWin;
    paymentAmount = state.win;
  }

  if (window.OssuaryAudio) {
    if (state.bonusModeActive) {
      window.OssuaryAudio.trigger("bonus_reels_spin_finished", {});
    } else {
      const audioBet = currentBet() || 1;
      window.OssuaryAudio.trigger("spin_finished", {
        spinType,
        win: state.win,
        winMultiple: state.win > 0 ? state.win / audioBet : 0
      });
    }
  }

  if (trigger && !state.bonusModeActive) {
    clearBonusFxLayers();
    dispatchBonusTrigger(trigger);
  } else if (!state.bonusModeActive) {
    activateBonusFxForOutcome(null);
  }

  // state.spinning sigue en true (puesto por startSpin) mientras pueda haber
  // animacion de victoria pendiente: es el UNICO flag que leen startSpin() y
  // scheduleAutoSpin() para bloquear un spin nuevo, asi que si se baja a
  // false antes de que la animacion termine, el boton SPIN/auto-spin puede
  // arrancar un giro nuevo mientras el video todavia esta sobre un tile del
  // pool de la cinta continua, pisando ese mismo elemento DOM en pleno giro
  // (causa real de la perdida de fluidez y de simbolos gigantes mal
  // sincronizados detectada tras integrar las animaciones de simbolo).
  let mathPayBreakdown = buildMathSymbolPayBreakdown(mathSpinResult.resolution);
  if (state.debugGiantTest && state.debugGiantTest.debugWinAnimation) {
    console.log("[ancestral-debug] payout result", {
      amount: mathPayBreakdown.ANCESTRAL_SKULL || 0,
      winningCellIds: ((mathPayBreakdown.__winningCellsBySymbol || {}).ANCESTRAL_SKULL || []).map((cell) => cell.id)
    });
  }
  let winningAnimatedCells = isBonusModeFreeSpin
    ? []
    : collectWinningAnimatedCells(mathPayBreakdown);
  if (state.debugGiantTest && state.debugGiantTest.debugWinAnimation) {
    console.log("[ancestral-debug] winning cells passed to animation", winningAnimatedCells.map((entry) => entry.cell.id));
    state.debugGiantTest = null;
  }
  function finishResolvedSpin() {
    settleSpinPayment({
      paymentAmount,
      paymentId: state.currentSpinId,
      spinId: state.currentSpinId,
      bet: currentBet(),
      spinType,
      source: spinType === "BONUS" ? "bonus" : "base"
    }).then(function () {
      state.spinning = false;
      render();
      // Cofre del Ruleta Game: se evalua ahora, con animaciones y pago ya
      // terminados, para que la apertura no tape lineas, contadores ni big win.
      // Nunca encima de un bonus/respin que esta misma tirada acaba de disparar
      // (se jugaria por debajo de la ruleta): el cofre sigue listo y se abre en
      // la siguiente tirada que cumpla. Si se abre, handleBonusNextAction no
      // relanza el autoplay hasta que la ruleta se cierre (isRuletaActive).
      const bonusActionPending = Boolean(bonusResult && (bonusResult.nextAction || bonusResult.modePendingType));
      if (!bonusActionPending && window.OssuaryRuletaGame && window.OssuaryRuletaGame.startPendingSequence) {
        window.OssuaryRuletaGame.startPendingSequence({
          win: paymentAmount,
          bet: currentBet(),
          spinType
        });
        syncBaseCrowBonusState();
      }
      handleBonusNextAction(bonusResult);
    });
  }
  // El PAGO se revela lo ULTIMO de cada spin. Primero se reproduce toda la
  // secuencia de la cuchilla pequena (corte, cuervo que se posa, piedra del
  // esqueleto, cuervo muerto que cae y deja sus copias); SOLO cuando termina se
  // revela el premio: animacion de simbolo ganador + numero + recuento/big win.
  // Antes, en las victorias con animacion de simbolo (p.ej. ANCESTRAL_SKULL),
  // esa animacion saltaba ANTES de que cayeran las cuchillas. La secuencia de la
  // cuchilla es puramente cosmetica y no altera bonusResult/pago/estado de reels;
  // state.spinning sigue en true durante todo el bloque, asi que el tablero
  // queda bloqueado. maybeRunSmallBladeCut ya gatea a spin BASE fuera de bonus
  // mode (en bonus/free spins resuelve al instante y el premio sale sin espera).
  function runPostLandingFx() {
    return maybeRunSmallBladeCut(spinType).then(refillSmallBladeCutHoles);
  }
  function revealWinAndFinish() {
    if (economicSpinPlan && economicSpinPlan.kind === "base" && window.OssuaryRuletaGame) {
      window.OssuaryRuletaGame.importEconomicState(economicSpinPlan.chest);
    }
    // Spin BASE: las cuchillas ya cayeron. La linea de pago se genera AHORA
    // sobre el board final (casillas cortadas vacias, cuervos muertos como WILD
    // con su multiplicador). Solo BASE fuera de bonus: es el unico caso con
    // secuencia de cuchilla; bonus/free-spin ya se pagaron con su propia logica
    // y no usan spinWin de base (ver bonus-feature.onSpinFinished).
    if (spinType === "BASE" && !state.bonusModeActive) {
      mathSpinResult = resolveMathSpinResult();
      spinWin = Math.round(mathSpinResult.resolution.total * 100) / 100;
      state.win = bonusResult.suppressBaseWin ? 0 : spinWin;
      paymentAmount = state.win;
      mathPayBreakdown = buildMathSymbolPayBreakdown(mathSpinResult.resolution);
      winningAnimatedCells = collectWinningAnimatedCells(mathPayBreakdown);
    }
    showWinningPaylineOverlay(mathSpinResult.resolution);
    if (winningAnimatedCells.length) {
      render();
      playWinSymbolAnimations(winningAnimatedCells).then(finishResolvedSpin);
    } else {
      finishResolvedSpin();
    }
  }
  runPostLandingFx().then(revealWinAndFinish);
}

// Recorre la grilla actual y devuelve, para cada celda cuyo simbolo final
// tiene registrada una animacion (OSSUARY_SYMBOL_WIN_ANIMATIONS) Y ese
// simbolo efectivamente pago en este spin (breakdown[symbol] > 0), el par
// {reel, cell, config} necesario para reproducirla. Si un simbolo animado
// todavia no tiene regla de pago (p.ej. ANCESTRAL_SKULL, ver payout-engine),
// breakdown[symbol] es undefined y por tanto nunca se dispara: es el
// comportamiento correcto, no un bug, hasta que se defina su pago real.
function collectWinningAnimatedCells(symbolPayBreakdown) {
  const registry = window.OSSUARY_SYMBOL_WIN_ANIMATIONS || {};
  const winningCellsBySymbol = symbolPayBreakdown && symbolPayBreakdown.__winningCellsBySymbol
    ? symbolPayBreakdown.__winningCellsBySymbol
    : {};
  const entries = [];
  state.reels.forEach((reel) => {
    reel.cells.forEach((cell) => {
      const symbol = cell.effective;
      const animConfig = registry[symbol];
      const winningCells = winningCellsBySymbol[symbol];
      const isWinningCell = !winningCells || winningCells.indexOf(cell) !== -1;
      if (animConfig && animConfig.playWinAnimation !== false && symbolPayBreakdown[symbol] > 0 && isWinningCell) {
        entries.push({ reel, cell, config: animConfig, symbol });
      }
    });
  });
  return entries;
}

// Dispara la animacion de victoria (PNG -> video -> PNG) en cada celda
// ganadora encontrada, EN PARALELO, y resuelve cuando TODAS han terminado.
// Mientras la promesa no resuelve, finishSpin no llama a
// handleBonusNextAction: ningun rodillo, cascada, respin o evaluacion de
// bonus puede avanzar hasta que termine de reproducirse.
function playWinSymbolAnimations(entries) {
  const plays = entries.map((entry) => {
    const tileEl = reelRenderer.getTileElementForCell(entry.reel, entry.cell);
    return window.OssuarySymbolWinAnimationPlayer.play(tileEl, entry.config);
  });
  return Promise.all(plays);
}

const uiReadouts = window.OssuaryReadouts.create({
  formatCurrency
});

const bigWinCounter = window.OssuaryBigWinCounter.create({
  stage,
  formatCurrency,
  hooks: {
    emitEvent: function (eventName, detail) {
      // WIN del HUD: o el contador BIG WIN o el WIN, nunca los dos.
      if (eventName === "big_win_counter_started" || eventName === "big_win_counter_hidden") {
        bigWinCounterOnScreen = eventName === "big_win_counter_started";
        uiReadouts.updateHudWin(hudWinReadoutState());
      }
      emitPaymentEvent(eventName, detail);
      if (window.OssuaryAudio) window.OssuaryAudio.trigger(eventName, detail || {});
    },
    // Salto con clic del contador: resitúa la música BIG WIN en el instante
    // del tambor al que se ha saltado, para que siga cuadrada con el conteo.
    seekEpicMusic: function (offsetMs) {
      if (!window.OssuaryAudio) return;
      window.OssuaryAudio.stop("big-win-counter-epic", 0);
      window.OssuaryAudio.play("big-win-counter-epic", { offsetMs: offsetMs });
    }
  }
});

const uiControls = window.OssuaryControls.create({
  stage,
  betSteps: BET_STEPS,
  hooks: {
    changeBet,
    setBetAmount,
    setMaxBet,
    startSpin,
    quickStop: quickStopSpin,
    buyBonusOption,
    toggleTurbo,
    toggleAuto,
    stopAuto,
    setAutoSpinCount,
    resetGame
  }
});

const bonusRuntimeDebug = window.OssuaryBonusRuntimeDebug.create({
  state,
  bonusFeature,
  ribBonusReels: RIB_BONUS_REELS,
  sternumGiantSymbol: STERNUM_GIANT_SYMBOL,
  idleState: GAME_STATES.IDLE,
  hooks: {
    render,
    setGameStatus,
    applyBonusLocks,
    clearBonusLocks,
    prepareLockedBonusReel,
    inspectRibBonusLandingState,
    ribBonusLandingReelsFromInspection,
    inspectSternumBonusLandingState,
    sternumBonusLandingReelFromInspection,
    updateLandingInspectionWithBonusResult,
    updateSternumInspectionWithBonusResult,
    refreshSternumLockInspectionAfterApply,
    reelByIdForLock
  }
});

const debugPanel = window.OssuaryDebugPanel.create({
  tests: GIANT_DEBUG_TESTS,
  state,
  hooks: {
    clearAutoTimer,
    startSpin,
    formatSymbolLabel,
    clearGiantPool,
    renderReel,
    render,
    runBonusDebugScenario: bonusRuntimeDebug.runScenario,
    runBonusIntegratedDebugScenario: bonusRuntimeDebug.runIntegrated,
    inspectRibBonusLanding: bonusRuntimeDebug.inspectRibBonusLanding,
    inspectSternumBonusLanding: bonusRuntimeDebug.inspectSternumBonusLanding,
    inspectBonusLanding: bonusRuntimeDebug.inspectBonusLanding,
    inspectLockedGiantState: bonusRuntimeDebug.inspectLockedGiantState,
    resetBonusDebug: bonusRuntimeDebug.reset,
    getBonusDebugState: bonusRuntimeDebug.getState,
    clearBonusLocks,
    debugLockRib: bonusRuntimeDebug.lockRib,
    debugLockAllRibs: bonusRuntimeDebug.lockAllRibs,
    debugLockSternum: bonusRuntimeDebug.lockSternum,
    debugClearLocks: bonusRuntimeDebug.clearLocks,
    debugSimulateNormalBonus: bonusRuntimeDebug.simulateNormalBonus,
    debugSimulateSuperBonus: bonusRuntimeDebug.simulateSuperBonus,
    debugPrintBonusState: bonusRuntimeDebug.printState,
    getRibcageBuildState: bonusRuntimeDebug.getRibcageBuildState,
    debugForceRealBonusSpin,
    debugForceSuperBonusFromState3,
    debugPreviewRib1FallAway,
    debugPreviewRib1BladeRig,
    debugPreviewFreeSpinSymbol,
    debugEnterFreeSpinsMode
  }
});

const paymentDebug = window.OssuaryPaymentDebugFactory.create({
  state,
  paymentEngine,
  bigWinCounter,
  hooks: {
    currentBet
  }
});

// --- Parada rapida (Claude, a peticion del usuario, 2026-10-14) -----------
// Segundo toque de SPIN (o Espacio) con los rodillos en marcha: los que aun
// no han empezado a frenar adelantan su frenada, casi a la vez y en el orden
// de siempre. El resultado ya esta decidido al empezar la tirada y la
// frenada coloca los simbolos finales donde toque (beginReelDeceleration ->
// buildFinalSymbolMap), asi que solo cambia CUANDO frenan, no QUE sale.
// Solo en tiradas BASE (tambien autoplay, compras y la cadena del cuervo):
// nunca en los respins de la cadena del Execution Bonus, dentro del bonus
// (tension del esternon) ni en la transicion del SUPER BONUS, donde la
// espera es parte del juego. Nunca antes de acabar la aceleracion: la
// frenada empieza a velocidad de crucero. Las dos mitades de una costilla
// paran a la vez y cada nivel un poco despues del anterior: un golpe seco.
const QUICK_STOP_TIER_STAGGER_MS = 25;

function quickStopCandidate(reel) {
  if (reel.isRespin) return false;
  if (reel.phase !== "accelerating" && reel.phase !== "cruising" && reel.phase !== "prepare-landing") return false;
  return reelWillSpinThisStop(reel);
}

// Si la tirada trae la guillotina en rib1, al caer alarga el giro del resto
// en la misma tirada (startInlineRib1BonusContinuation, la cadena de
// costillas): con parada rapida esos rodillos ya estarian frenando y la
// cadena se cortaria. En esa tirada no hay parada rapida.
function spinLandsRib1Guillotine() {
  const rib1 = state.reels.find((reel) => reel.id === "rib1");
  if (!rib1 || rib1.locked) return false;
  return rib1.pendingGiantSymbol === "RIB_BONUS" ||
    rib1.activeLandingGiantSymbol === "RIB_BONUS" ||
    Boolean(state.inlineRib1BonusContinuationActive);
}

function quickStopAvailable() {
  if (!state.spinning || state.quickStopRequested) return false;
  if (state.currentSpinType !== "BASE" || state.bonusModeActive) return false;
  if (superBonusTransition.active || bonusChainAnticipation) return false;
  if (spinLandsRib1Guillotine()) return false;
  // Amago lento de la guillotina de rib1: es el momento de la tirada.
  const rib1Tease = window.OssuaryRib1Tease && window.OssuaryRib1Tease.current();
  if (rib1Tease && rib1Tease.slow) return false;
  return state.reels.some(quickStopCandidate);
}

function quickStopSpin() {
  if (!quickStopAvailable()) return false;
  const now = gameNow();
  const leadTime = (WINDUP_TIME || 0) + ACCELERATION_TIME;
  const reels = state.reels.filter(quickStopCandidate).sort((a, b) => a.stopStartAt - b.stopStartAt);
  const tiers = [];
  reels.forEach((reel) => {
    const tier = stopSequenceTierForReel(reel);
    if (tiers.indexOf(tier) === -1) tiers.push(tier);
  });
  reels.forEach((reel) => {
    const accelEndAt = (reel.spinAnchorAt == null ? now : reel.spinAnchorAt) + leadTime;
    const stagger = tiers.indexOf(stopSequenceTierForReel(reel)) * QUICK_STOP_TIER_STAGGER_MS;
    const stopAt = Math.max(now + stagger, accelEndAt);
    if (stopAt >= reel.stopStartAt) return;
    reel.stopStartAt = stopAt;
    reel.prepareLandingAt = Math.min(reel.prepareLandingAt, stopAt - PREPARE_LANDING_TIME);
    // La guillotina que iba a pasar volando por rib1 se quedaria en el rodillo.
    if (reel.id === "rib1" && window.OssuaryRib1Tease) window.OssuaryRib1Tease.cancelFlyby(reel);
  });
  state.quickStopRequested = true;
  render();
  return true;
}

function updateSpinFrame(realNow) {
  if (!state.spinning) return;
  const now = gameNow(realNow);
  syncAnimationPlaybackRate();

  if (!state.lastFrameTime) {
    state.lastFrameTime = now;
  }

  const dtSec = Math.min((now - state.lastFrameTime) / 1000, 0.05);
  state.lastFrameTime = now;

  for (const reel of state.reels) {
    const phaseBeforeUpdate = reel.phase;
    updateReel(reel, now, dtSec);
    if (reel.id === "rib1" && window.OssuaryRib1Tease) window.OssuaryRib1Tease.frame(reel, now);
    if (
      phaseBeforeUpdate !== "decelerating" &&
      phaseBeforeUpdate !== "settling" &&
      (reel.phase === "decelerating" || reel.phase === "settling")
    ) {
      beginArmedBonusModeStructureSwellAtRib4(reel, now);
    }
  }

  updateBonusChainAnticipationFx(now);

  if (state.reels.some((reel) => reel.phase !== "stopped")) {
    state.spinFrame = window.requestAnimationFrame(updateSpinFrame);
  } else {
    finishSpin();
  }
}

function render() {
  syncBaseCrowBonusState();
  ensureRib1FrontLayerTrack();
  syncStageModeClasses();
  updateBonusCandleCounterUI();
  uiReadouts.update({
    balance: presentedEconomicBalance(),
    bet: currentBet(),
    win: state.win,
    bonusLabel: state.bonusLabel,
    hudWin: hudWinReadoutState()
  });

  uiControls.update({
    // Durante el cofre/ruleta el juego base esta en pausa: controles como en
    // giro. Igual entre tiradas de la cadena del Raven Bonus.
    spinning: state.spinning || state.busy || bonusSummaryOpen || isRuletaActive() || Boolean(state.ravenChain),
    auto: state.auto,
    autoSpinsRemaining: state.autoSpinsRemaining,
    autoSpinConfigured: state.autoSpinConfigured,
    turbo: state.turbo,
    balance: presentedEconomicBalance(),
    currentBet: currentBet(),
    betIndex: state.betIndex,
    // Raven Bonus: tiradas gratis que quedan despues de la actual (contando
    // los cuervos que ya han muerto en ella); null fuera de la cadena.
    freeSpinsLeft: state.ravenChain ? state.ravenChain.pending + state.ravenChain.kills : null,
    // Parada rapida: SPIN sigue pulsable con los rodillos en marcha.
    quickStop: quickStopAvailable()
  });
}

function allEffectiveSymbols() {
  return payoutEngine.allEffectiveSymbols();
}

function currentBoardStateForCombinations() {
  return state.reels.flatMap((reel) => reel.cells.map((cell) => {
    // Cuervo muerto en la casilla => WILD (prioritario: la copia tapa el hueco).
    if (deadCrowWildByCellId.has(cell.id)) return { id: cell.id, symbol: "WILD" };
    // Simbolo cortado por la cuchilla => casilla vacia (rompe la linea).
    if (smallBladeCutCellIds.has(cell.id)) return { id: cell.id, symbol: null };
    return { id: cell.id, symbol: visibleEffectiveSymbolForCell(reel, cell) };
  }));
}

function visibleEffectiveSymbolForCell(reel, cell) {
  const found = smallBladeDisplayedTileForCell(reel, cell);
  if (found && found.tileEl && found.tileEl.dataset) {
    return found.tileEl.dataset.effectiveSymbol || found.tileEl.dataset.symbol || null;
  }
  return cell.effective || null;
}

// Aplica el multiplicador de los cuervos muertos a cada premio: si una linea
// pasa por una o varias casillas con cuervo muerto (WILD), su importe se
// multiplica por el producto de esos multiplicadores (x1 no altera nada).
function applyDeadCrowMultipliers(resolution) {
  if (!resolution || !deadCrowWildByCellId.size) return resolution;
  let total = 0;
  const payouts = (resolution.payouts || []).map((payout) => {
    let factor = 1;
    (payout.positions || []).forEach((cellId) => {
      const mult = deadCrowWildByCellId.get(cellId);
      if (mult && mult > 1) factor *= mult;
    });
    const amount = payout.amount * factor;
    total += amount;
    return factor === 1 ? payout : Object.assign({}, payout, { amount, crowMultiplier: factor });
  });
  return Object.assign({}, resolution, { payouts, total });
}

// RED de lineas de pago del tablero abanico. Cada columna esta ordenada de
// arriba a abajo; un paso valido solo puede ir a la columna siguiente y a la
// misma fila, una fila arriba o una fila abajo. Esto impide saltos imposibles
// como rib5-2 -> rib1-2.
const OSSUARY_BOARD_COLUMNS = [
  [null,     "rib2-1", "rib3-2",    "rib4-1", "rib5-1"],
  ["rib1-1", "rib2-2", "rib3-3", "rib4-2", "rib5-2"],
  ["rib1-2", "sternum-1", "sternum-2", "sternum-3", null],
  ["rib1-3", "rib2-3", "rib3-4", "rib4-3", "rib5-3"],
  [null,     "rib2-4", "rib3-5",    "rib4-4", "rib5-4"]
];

function paylineNetStartPoints(columns) {
  return (columns[0] || [])
    .map((id, row) => id ? { col: 0, row, id } : null)
    .filter(Boolean);
}

function paylineNetCellPositionMap(columns) {
  const map = {};
  columns.forEach((column, col) => {
    column.forEach((id, row) => {
      if (id) map[id] = { col, row };
    });
  });
  return map;
}

function paylineNetNextCellIds(columns, col, row) {
  const nextColumn = columns[col + 1] || [];
  const ids = [];
  for (let nextRow = row - 1; nextRow <= row + 1; nextRow++) {
    const id = nextColumn[nextRow];
    if (id) ids.push(id);
  }
  return ids;
}

function isStrictPaylinePath(ids, positionByCellId) {
  if (!ids || ids.length < (COMBO_CONFIG.MIN_PATH_LENGTH || 3)) return false;
  const first = positionByCellId[ids[0]];
  if (!first || first.col !== 0) return false;
  for (let i = 1; i < ids.length; i++) {
    const prev = positionByCellId[ids[i - 1]];
    const next = positionByCellId[ids[i]];
    if (!prev || !next) return false;
    if (next.col !== prev.col + 1) return false;
    if (Math.abs(next.row - prev.row) > 1) return false;
  }
  return true;
}

// Genera caminos solo desde la columna izquierda absoluta. Rib1 no inicia linea
// porque no existe en C0. Guarda tambien prefijos validos de longitud 3/4: si
// el siguiente cuadrado no existe, esa linea corta sigue pudiendo pagar.
let paylineNetCellPaths = null;
function buildPaylineNetCellPaths() {
  if (paylineNetCellPaths) return paylineNetCellPaths;
  const columns = OSSUARY_BOARD_COLUMNS;
  const minLen = COMBO_CONFIG.MIN_PATH_LENGTH || 3;
  const positionByCellId = paylineNetCellPositionMap(columns);
  const unique = new Set();
  const paths = [];

  function save(acc) {
    if (acc.length < minLen) return;
    const key = acc.join("|");
    if (unique.has(key)) return;
    if (!isStrictPaylinePath(acc, positionByCellId)) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("[payline-net] ruta invalida descartada", acc.join(" -> "));
      }
      return;
    }
    unique.add(key);
    paths.push(acc.slice());
  }

  function walk(col, row, acc) {
    save(acc);
    if (col >= columns.length - 1) return;
    paylineNetNextCellIds(columns, col, row).forEach((id) => {
      const next = positionByCellId[id];
      if (!next || next.col !== col + 1) return;
      acc.push(id);
      walk(next.col, next.row, acc);
      acc.pop();
    });
  }
  paylineNetStartPoints(columns).forEach((start) => {
    walk(start.col, start.row, [start.id]);
  });
  paylineNetCellPaths = paths;
  return paths;
}

// La red en el formato que espera el evaluador: [{ id, reelId }, ...] por linea.
// Se construye una vez (la geometria es estable) resolviendo el reelId de cada
// casilla desde el tablero.
let paylineNetRoutesCache = null;
function paylineNetRoutes() {
  if (paylineNetRoutesCache) return paylineNetRoutesCache;
  const reelByCellId = {};
  state.reels.forEach((reel) => {
    (reel.cells || []).forEach((cell) => { reelByCellId[cell.id] = reel.id; });
  });
  const minLen = COMBO_CONFIG.MIN_PATH_LENGTH || 3;
  paylineNetRoutesCache = buildPaylineNetCellPaths()
    .map((ids) => ids
      .filter((id) => reelByCellId[id])
      .map((id) => ({ id: id, reelId: reelByCellId[id] })))
    .filter((route) => route.length >= minLen);
  return paylineNetRoutesCache;
}

function describePaylineNetRoutes() {
  return paylineNetRoutes().map((route, index) => ({
    id: index + 1,
    length: route.length,
    reels: route.map((cell) => cell.reelId),
    cells: route.map((cell) => cell.id),
    visual: route.map((cell) => visualPaylineCellName(cell.id))
  }));
}

// Muchos caminos de la red comparten su tramo inicial. Un mismo premio recto no
// debe cobrarse en varias longitudes: un tramo de 5 iguales genera tambien un
// prefijo de 4 y de 3 (por caminos que divergen mas tarde), y solo debe pagar la
// version MAS LARGA. Regla: se descarta todo premio cuyas casillas ganadoras
// sean un PREFIJO exacto (mismo tramo desde la izquierda) de otro premio ya
// conservado mas largo. Los caminos que DIVERGEN dentro del premio no son
// prefijo el uno del otro, asi que ambos se pagan como lineas distintas (p.ej.
// recto-recto-recto vs recto-recto-diagonal desde el mismo inicio).
function dedupeWinningLines(resolution) {
  if (!resolution) return resolution;
  function isPrefixOf(shortPos, longPos) {
    if (shortPos.length > longPos.length) return false;
    for (let i = 0; i < shortPos.length; i++) {
      if (shortPos[i] !== longPos[i]) return false;
    }
    return true;
  }
  const wins = (resolution.payouts || [])
    .filter((payout) => (payout.amount || 0) > 0)
    .sort((a, b) => (b.positions || []).length - (a.positions || []).length);
  const kept = [];
  wins.forEach((win) => {
    const pos = win.positions || [];
    const subsumed = kept.some((k) => isPrefixOf(pos, k.positions || []));
    if (!subsumed) kept.push(win);
  });
  let total = 0;
  kept.forEach((k) => { total += k.amount || 0; });
  return Object.assign({}, resolution, { payouts: kept, total });
}

function filterStrictWinningPayouts(resolution) {
  if (!resolution) return resolution;
  const positionByCellId = paylineNetCellPositionMap(OSSUARY_BOARD_COLUMNS);
  const payouts = (resolution.payouts || []).filter((payout) => {
    const positions = payout.positions || [];
    const ok = isStrictPaylinePath(positions, positionByCellId);
    if (!ok && typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("[payline-net] premio imposible descartado", {
        positions: positions.join(" -> "),
        visual: positions.map((cellId) => visualPaylineCellName(cellId)).join(" -> ")
      });
    }
    return ok;
  });
  const total = payouts.reduce((sum, payout) => sum + (payout.amount || 0), 0);
  return Object.assign({}, resolution, { payouts, total });
}

function visualPaylineCellName(cellId) {
  const labels = {
    "rib1-1": "RIP1 casilla 2",
    "rib1-2": "RIP1 casilla 3",
    "rib1-3": "RIP1 casilla 4",
    "rib2-1": "RIP2 casilla 1",
    "rib2-2": "RIP2 casilla 2",
    "sternum-1": "EST1 casilla 3",
    "rib2-3": "RIP2 casilla 4",
    "rib2-4": "RIP2 casilla 5",
    "rib3-2": "RIP3 casilla 1",
    "rib3-3": "RIP3 casilla 2",
    "sternum-2": "EST2 casilla 3",
    "rib3-4": "RIP3 casilla 4",
    "rib3-5": "RIP3 casilla 5",
    "rib4-1": "RIP4 casilla 1",
    "rib4-2": "RIP4 casilla 2",
    "sternum-3": "EST3 casilla 3",
    "rib4-3": "RIP4 casilla 4",
    "rib4-4": "RIP4 casilla 5",
    "rib5-1": "RIP5 casilla 1",
    "rib5-2": "RIP5 casilla 2",
    "rib5-3": "RIP5 casilla 4",
    "rib5-4": "RIP5 casilla 5"
  };
  return labels[cellId] || cellId;
}

function resolveMathSpinResult() {
  if (economicSpinPlan && economicSpinPlan.kind === "base") {
    return { combinations: [], resolution: economicSpinPlan.resolution };
  }
  const result = mathEngine.resolveBoard(
    currentBoardStateForCombinations(),
    currentBet(),
    paylineNetRoutes()
  );
  result.resolution = filterStrictWinningPayouts(
    applyDeadCrowMultipliers(dedupeWinningLines(result.resolution))
  );
  lastPaylineResolutionDebug = {
    total: result.resolution.total,
    payouts: (result.resolution.payouts || []).map((payout) => ({
      symbol: payout.symbol,
      amount: payout.amount,
      positions: (payout.positions || []).slice(),
      visual: (payout.positions || []).map((cellId) => visualPaylineCellName(cellId)),
      routeId: payout.routeId || null
    })),
    combinations: (result.combinations || []).map((entry) => ({
      id: entry.id,
      symbol: entry.symbol,
      length: entry.length,
      route: (entry.route || []).slice(),
      routeVisual: (entry.route || []).map((cellId) => visualPaylineCellName(cellId)),
      positions: (entry.positions || []).slice(),
      positionsVisual: (entry.positions || []).map((cellId) => visualPaylineCellName(cellId))
    }))
  };
  return result;
}

function buildMathSymbolPayBreakdown(resolution) {
  const breakdown = {};
  const winningCellsBySymbol = {};

  (resolution.payouts || []).forEach((entry) => {
    if (entry.amount <= 0) return;
    breakdown[entry.symbol] = (breakdown[entry.symbol] || 0) + entry.amount;
    const cells = (entry.positions || [])
      .map((cellId) => findCellById(cellId))
      .filter(Boolean);
    winningCellsBySymbol[entry.symbol] = uniqueCells(
      (winningCellsBySymbol[entry.symbol] || []).concat(cells)
    );
  });

  Object.defineProperty(breakdown, "__winningCellsBySymbol", {
    value: winningCellsBySymbol,
    enumerable: false,
    configurable: true,
    writable: true
  });

  return breakdown;
}

// Readout WIN del HUD (src/ui/readouts.js), en todos los juegos. Solo lectura:
// no interviene en pagos ni balance.
// - Execution Bonus (NORMAL_BONUS): total acumulado del bonus en curso
//   (executionBonusWin); vuelve a 0 al entrar.
// - Resto (juego base, compras, ruleta): premio de la tirada actual
//   (hudBaseWin); vuelve a 0 al arrancar cada spin.
// - O uno o el otro: el WIN es para los premios pequenos. Si el premio de la
//   tirada salta el contador BIG WIN del centro (isBigWin) el WIN no sale, y
//   nunca se ve mientras ese contador esta en pantalla.
let executionBonusWin = 0;
let executionPrizeInFlight = 0;
let hudBaseWin = 0;
let hudBaseWinIsBig = false;
let bigWinCounterOnScreen = false;

function isExecutionBonusActive() {
  return Boolean(state.bonusModeActive) && state.bonusModeType === "NORMAL_BONUS";
}

// kind: "bonus" (total del Execution o de la cadena del cuervo, vuelve a 0
// al empezar) o "base" (premio de la tirada: el HUD deja el ultimo a la vista
// como LAST WIN hasta el siguiente, src/ui/readouts.js). Solo presentacion.
function hudWinReadoutState() {
  // SUPER BONUS "El Juicio": saco x guadana en vivo (ya asegurado: nunca baja).
  const juicioWin = window.OssuaryElJuicio ? window.OssuaryElJuicio.hudWin() : null;
  if (juicioWin !== null) {
    return { amount: juicioWin, visible: juicioWin > 0 && !bigWinCounterOnScreen, kind: "bonus" };
  }
  if (isExecutionBonusActive()) {
    // Lo que va volando hacia el WIN (importes de los cortes de la
    // guillotina, src/fx/guillotine-drop.js#rowCut) se suma al llegar.
    const shown = Math.max(0, Math.round((executionBonusWin - executionPrizeInFlight) * 100) / 100);
    return { amount: shown, visible: !bigWinCounterOnScreen, kind: "bonus" };
  }
  // Raven Bonus: el WIN suma toda la cadena de tiradas.
  if (ravenChainWin !== null) {
    return { amount: ravenChainWin, visible: ravenChainWin > 0 && !bigWinCounterOnScreen, kind: "bonus" };
  }
  return {
    amount: hudBaseWin,
    visible: hudBaseWin > 0 && !hudBaseWinIsBig && !bigWinCounterOnScreen,
    kind: "base"
  };
}

function resetHudBaseWin() {
  hudBaseWin = 0;
  hudBaseWinIsBig = false;
}

function isBigWin(totalWin, bet) {
  return totalWin > 0 && bet > 0 && totalWin >= bet * 10;
}

function settleSpinPayment(options) {
  const selected = selectedEconomicCredit(options);
  if (selected) options = Object.assign({}, options, { paymentAmount:selected.amount,
    paymentId:selected.paymentId, roundId:selected.roundId });
  else if (economicSpinPlan && ["base","bonus","bonus_mode_blade_cut","bonus_mode_guadana_heads"].includes(options.source)) return Promise.resolve(null);
  const paymentAmount = Math.round((options.paymentAmount || 0) * 100) / 100;
  if (paymentAmount <= 0) return Promise.resolve(null);

  const reserved = revealEconomicPayment(options.paymentId);
  const paymentResult = reserved || paymentEngine.applyPayment({
    paymentId: options.paymentId,
    spinId: options.spinId,
    roundId: options.roundId || economicRounds.spinRoundId(options.spinId),
    totalWin: paymentAmount,
    bet: options.bet,
    context: {
      spinType: options.spinType,
      source: options.source || "spin"
    }
  });

  if (!paymentResult.applied) return Promise.resolve(paymentResult);

  // noBigWin: las filas de un corte de la guillotina sacan UN contador con el
  // total del corte al acabar (finishBladeCutPrize), no uno por fila.
  const bigWinPayment = !options.noBigWin && isBigWin(paymentAmount, options.bet);
  if (isExecutionBonusActive()) {
    executionBonusWin = Math.round((executionBonusWin + paymentAmount) * 100) / 100;
  } else {
    hudBaseWin = Math.round((hudBaseWin + paymentAmount) * 100) / 100;
    hudBaseWinIsBig = hudBaseWinIsBig || isBigWin(hudBaseWin, options.bet);
    if (state.ravenChain && ravenChainWin !== null) {
      ravenChainWin = Math.round((ravenChainWin + paymentAmount) * 100) / 100;
    }
  }
  // El contador BIG WIN arranca tras un pequeno retardo: el WIN se oculta ya,
  // para que nunca se vean los dos a la vez.
  if (bigWinPayment) bigWinCounterOnScreen = true;
  render();
  if (!bigWinPayment) return Promise.resolve(paymentResult);
  const delayMs = activeWinningPaylinePayouts.length ? speedMs(WINNING_PAYLINE_AMOUNT_ANIM_MS) : 0;
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  }).then(() => bigWinCounter.show(paymentAmount, options.bet)).then(() => paymentResult);
}

function fakeWinningCombinationBoard() {
  return [
    { id: "rib3-2", symbol: "FEMUR" },
    { id: "rib4-1", symbol: "FEMUR" },
    { id: "rib5-2", symbol: "WILD" },
    { id: "sternum-2", symbol: "FEMUR" },
    { id: "rib4-3", symbol: "FEMUR" },
    { id: "rib5-4", symbol: "FEMUR" },
    { id: "rib3-4", symbol: "FEMUR" },
    { id: "rib2-2", symbol: "VERTEBRA" },
    { id: "rib1-2", symbol: "VERTEBRA" },
    { id: "rib2-3", symbol: "VERTEBRA" },
    { id: "rib3-5", symbol: "VERTEBRA" },
    { id: "rib2-1", symbol: "RIB_BONUS" },
    { id: "sternum-3", symbol: "STERNUM_BONUS" }
  ];
}

function printWinningCombinations(boardState = null) {
  const combinations = comboEvaluator.evaluateRoutes(
    boardState || currentBoardStateForCombinations(),
    paylineNetRoutes()
  );
  const printable = combinations.map((entry) => ({
    simbolo: entry.symbol,
    longitud: entry.length,
    ruta: entry.route.join(" -> "),
    rutaVisual: entry.route.map((cellId) => visualPaylineCellName(cellId)).join(" -> "),
    posiciones: entry.positions.join(" -> "),
    posicionesVisual: entry.positions.map((cellId) => visualPaylineCellName(cellId)).join(" -> "),
    wilds: entry.wildsUsed ? "si" : "no"
  }));
  console.table(printable);
  return combinations;
}

function printFakeWinningCombinations() {
  return printWinningCombinations(fakeWinningCombinationBoard());
}

let combinationPathHighlightTimer = null;
let highlightedCombinationCellIds = [];

function findCellById(cellId) {
  for (const reel of state.reels) {
    const cell = reel.cells.find((item) => item.id === cellId);
    if (cell) return cell;
  }
  return null;
}

function uniqueCells(cells) {
  const seen = new Set();
  return (cells || []).filter((cell) => {
    if (!cell || !cell.id || seen.has(cell.id)) return false;
    seen.add(cell.id);
    return true;
  });
}

function ensureWinningPaylineOverlayEl() {
  if (winningPaylineOverlayEl || (!reelLayer && !stage)) return winningPaylineOverlayEl;
  const el = document.createElementNS(SVG_NS, "svg");
  el.setAttribute("aria-hidden", "true");
  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.pointerEvents = "none";
  el.style.overflow = "visible";
  // Detras de los simbolos: vive dentro de reelLayer con z-index bajo, por
  // debajo de symbol-cell / continuous-symbol-track / giant-strip-track.
  el.style.zIndex = "1";
  el.hidden = true;
  (reelLayer || stage).appendChild(el);
  winningPaylineOverlayEl = el;
  return el;
}

function ensureWinningPaylineAmountOverlayEl() {
  if (winningPaylineAmountOverlayEl) return winningPaylineAmountOverlayEl;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.className = "winning-payline-amount-layer";
  el.hidden = true;
  document.body.appendChild(el);
  winningPaylineAmountOverlayEl = el;
  return el;
}

function clearWinningPaylineForegroundMode() {
  if (winningPaylineForegroundTimer) {
    window.clearTimeout(winningPaylineForegroundTimer);
    winningPaylineForegroundTimer = 0;
  }
  if (document.body) document.body.classList.remove("has-winning-payline-amounts");
}

function armWinningPaylineForegroundMode() {
  if (!document.body) return;
  document.body.classList.add("has-winning-payline-amounts");
  if (winningPaylineForegroundTimer) window.clearTimeout(winningPaylineForegroundTimer);
  winningPaylineForegroundTimer = window.setTimeout(() => {
    clearWinningPaylineForegroundMode();
  }, speedMs(WINNING_PAYLINE_AMOUNT_ANIM_MS + 180));
}

// Fichas de las casillas que pagan: llevan .is-paying mientras se ve la
// linea de pago (solo visual: style.css las hace vibrar, les pone un filo de
// luz y aclara su humo). Se quitan con la linea, al empezar el siguiente giro.
// La ficha se busca por geometria (la que esta de verdad sobre la casilla,
// igual que con los cuervos y las cuchillas), porque tras un giro real el
// indice de getTileElementForCell no siempre acierta. Las casillas tapadas
// por un cuervo muerto (WILD) celebran con su copia, que es lo que se ve.
let payingTileEls = [];

function clearPayingTiles() {
  payingTileEls.forEach((tileEl) => tileEl.classList.remove("is-paying"));
  payingTileEls = [];
  if (smallBladeBirdPerch && smallBladeBirdPerch.clearDeathCopyCelebration) {
    smallBladeBirdPerch.clearDeathCopyCelebration();
  }
}

function markPayingTiles(payouts) {
  clearPayingTiles();
  const cellIds = new Set();
  payouts.forEach((payout) => {
    (payout.positions || []).forEach((cellId) => cellIds.add(cellId));
  });
  cellIds.forEach((cellId) => {
    const cell = findCellById(cellId);
    const reel = cell && state.reels.find((item) => item.id === cell.reelId);
    if (!reel) return;
    const displayed = smallBladeDisplayedTileForCell(reel, cell);
    const tileEl = displayed ? displayed.tileEl : reelRenderer.getTileElementForCell(reel, cell);
    if (!tileEl) return;
    tileEl.classList.add("is-paying");
    payingTileEls.push(tileEl);
  });
  if (smallBladeBirdPerch && smallBladeBirdPerch.celebrateDeathCopies) {
    smallBladeBirdPerch.celebrateDeathCopies(Array.from(cellIds));
  }
}

function clearWinningPaylineNotes() {
  winningPaylineNoteTimers.forEach((timer) => window.clearTimeout(timer));
  winningPaylineNoteTimers = [];
}

function clearWinningPaylineOverlay() {
  activeWinningPaylinePayouts = [];
  winningPaylineRevealDelays = [];
  clearWinningPaylineNotes();
  clearPayingTiles();
  clearWinningPaylineForegroundMode();
  if (!winningPaylineOverlayEl) return;
  winningPaylineOverlayEl.replaceChildren();
  winningPaylineOverlayEl.hidden = true;
  if (winningPaylineAmountOverlayEl) {
    winningPaylineAmountOverlayEl.replaceChildren();
    winningPaylineAmountOverlayEl.hidden = true;
  }
}

function paylineOverlayViewportRect(overlay) {
  const parent = overlay && overlay.parentElement ? overlay.parentElement : (reelLayer || stage);
  return parent ? parent.getBoundingClientRect() : null;
}

function winningPaylinePointForCell(cell, viewportRect) {
  if (!cell || !viewportRect) return null;
  const sourceEl = cell.el;
  if (!sourceEl) return null;
  const cellRect = sourceEl.getBoundingClientRect();
  return {
    x: cellRect.left - viewportRect.left + (cellRect.width / 2),
    y: cellRect.top - viewportRect.top + (cellRect.height / 2)
  };
}

function paylinePathData(points) {
  return points.map((point, index) =>
    (index === 0 ? "M " : "L ") + point.x.toFixed(2) + " " + point.y.toFixed(2)
  ).join(" ");
}

function paylineAnchorPoint(points) {
  if (!Array.isArray(points) || !points.length) return null;
  if (points.length === 1) return { x: points[0].x, y: points[0].y };
  let total = 0;
  const segments = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (!(len > 0)) continue;
    segments.push({ a, b, len, start: total });
    total += len;
  }
  if (!segments.length) return { x: points[0].x, y: points[0].y };
  const half = total / 2;
  const seg = segments.find((item) => half <= item.start + item.len) || segments[segments.length - 1];
  const t = Math.max(0, Math.min(1, (half - seg.start) / seg.len));
  return {
    x: seg.a.x + (seg.b.x - seg.a.x) * t,
    y: seg.a.y + (seg.b.y - seg.a.y) * t
  };
}

function winningPaylineAmountScalePx(payout) {
  const heights = (payout.positions || [])
    .map((cellId) => {
      const cell = findCellById(cellId);
      const rect = cell && cell.el ? cell.el.getBoundingClientRect() : null;
      return rect ? rect.height : 0;
    })
    .filter((height) => height > 0);
  const cellHeight = heights.length
    ? heights.reduce((sum, height) => sum + height, 0) / heights.length
    : 120;
  return Math.max(14, Math.min(42, cellHeight * 0.26));
}

function avoidReelFiveCenterOverlapForPaylineAmount(anchor, payout, viewportRect) {
  if (!anchor || !payout || !viewportRect) return anchor;
  const reelFiveCells = (payout.positions || [])
    .filter((cellId) => typeof cellId === "string" && cellId.indexOf("rib5-") === 0)
    .map((cellId) => findCellById(cellId))
    .filter(Boolean);
  if (!reelFiveCells.length) return anchor;
  for (let i = 0; i < reelFiveCells.length; i++) {
    const cell = reelFiveCells[i];
    if (!cell.el) continue;
    const rect = cell.el.getBoundingClientRect();
    const local = {
      left: rect.left - viewportRect.left,
      right: rect.right - viewportRect.left,
      top: rect.top - viewportRect.top,
      bottom: rect.bottom - viewportRect.top,
      width: rect.width
    };
    const insideX = anchor.x >= local.left && anchor.x <= local.right;
    const closeY = anchor.y >= (local.top - rect.height * 0.45) && anchor.y <= (local.bottom + rect.height * 0.2);
    if (!insideX || !closeY) continue;
    const stageMidX = viewportRect.width / 2;
    const push = Math.max(local.width * 0.7, 26);
    const moveOutward = anchor.x >= stageMidX ? 1 : -1;
    return Object.assign({}, anchor, {
      x: Math.max(8, Math.min(viewportRect.width - 8, anchor.x + push * moveOutward))
    });
  }
  return anchor;
}

function createWinningPaylineAmountEl(payout, points, pointViewportRect) {
  const host = ensureWinningPaylineAmountOverlayEl();
  if (!host || !payout || !points || points.length < 2) return;
  const viewportRect = pointViewportRect || host.getBoundingClientRect();
  let midpoint = paylineAnchorPoint(points);
  midpoint = avoidReelFiveCenterOverlapForPaylineAmount(midpoint, payout, viewportRect);
  if (!midpoint) return;
  const amountEl = document.createElement("div");
  amountEl.className = "winning-payline-amount";
  amountEl.textContent = String(Math.max(0, Math.round(Number(payout.amount) || 0)));
  amountEl.style.left = (viewportRect.left + midpoint.x).toFixed(2) + "px";
  amountEl.style.top = (viewportRect.top + midpoint.y).toFixed(2) + "px";
  amountEl.style.fontSize = winningPaylineAmountScalePx(payout).toFixed(2) + "px";
  host.appendChild(amountEl);
  return amountEl;
}

// --- Linea de pago "reguero de sangre" ----------------------------------------
// La linea ganadora se dibuja como una MANCHA de sangre organica (referencia:
// salpicadura plana de rojo intenso): un cuerpo de grosor variable (hebras
// finas que se hinchan en pegotes), contorno irregular y salpicaduras sueltas
// alrededor. Se remuestrea la polilinea entre centros de casilla y se le anade
// una ondulacion PERPENDICULAR suave (suma de senos con fases al azar;
// Math.random, solo visual). La ondulacion se apaga en los extremos para que
// el inicio y el final queden clavados en el centro de sus casillas y la linea
// se siga leyendo claramente como linea de pago.
function bloodPaylineSamples(points) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.hypot(dx, dy) || 1;
    segs.push({ a: points[i - 1], dx, dy, len, start: total });
    total += len;
  }
  if (!segs.length) return { samples: points.slice(), total: 0 };
  const phase1 = Math.random() * Math.PI * 2;
  const phase2 = Math.random() * Math.PI * 2;
  const phase3 = Math.random() * Math.PI * 2;
  const count = Math.max(3, Math.round(total / 22));
  const samples = [];
  for (let k = 0; k <= count; k++) {
    const d = (k / count) * total;
    let seg = segs[segs.length - 1];
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i].start + segs[i].len + 0.001) { seg = segs[i]; break; }
    }
    const u = Math.min(1, Math.max(0, (d - seg.start) / seg.len));
    const x = seg.a.x + seg.dx * u;
    const y = seg.a.y + seg.dy * u;
    // Normal unitaria del segmento (perpendicular al trazo).
    const nx = -seg.dy / seg.len;
    const ny = seg.dx / seg.len;
    // Ondulacion suave, ligera (2-4px), apagada cerca de los extremos.
    const endFade = Math.min(1, Math.min(d, total - d) / 46);
    const wobble = (
      Math.sin(d * 0.045 + phase1) * 1.9 +
      Math.sin(d * 0.11 + phase2) * 1.0 +
      Math.sin(d * 0.021 + phase3) * 1.4
    ) * endFade;
    samples.push({ x: x + nx * wobble, y: y + ny * wobble, t: total ? d / total : 0 });
  }
  // Normal unitaria por muestra (desde los vecinos), para engordar el cuerpo
  // de la mancha perpendicular al reguero y colocar salpicaduras a los lados.
  for (let i = 0; i < samples.length; i++) {
    const a = samples[Math.max(0, i - 1)];
    const b = samples[Math.min(samples.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    samples[i].nx = -dy / len;
    samples[i].ny = dx / len;
  }
  return { samples, total };
}

// Convierte las muestras en un path SVG suavizado por puntos medios (curvas
// cuadraticas): reguero organico, sin picos duros entre muestras.
function bloodPaylinePathData(samples) {
  if (samples.length < 3) return paylinePathData(samples);
  let d = "M " + samples[0].x.toFixed(2) + " " + samples[0].y.toFixed(2);
  for (let i = 1; i < samples.length - 1; i++) {
    const mx = (samples[i].x + samples[i + 1].x) / 2;
    const my = (samples[i].y + samples[i + 1].y) / 2;
    d += " Q " + samples[i].x.toFixed(2) + " " + samples[i].y.toFixed(2) +
      " " + mx.toFixed(2) + " " + my.toFixed(2);
  }
  const last = samples[samples.length - 1];
  d += " L " + last.x.toFixed(2) + " " + last.y.toFixed(2);
  return d;
}

// Contorno CERRADO de la mancha: ida por el borde superior (centro + normal *
// grosor) y vuelta por el inferior, suavizado por puntos medios. Grosor
// variable => hebras finas y pegotes, como la salpicadura de referencia.
function bloodContourPathData(top, bot) {
  function seg(pts) {
    let s = " L " + pts[0].x.toFixed(2) + " " + pts[0].y.toFixed(2);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      s += " Q " + pts[i].x.toFixed(2) + " " + pts[i].y.toFixed(2) +
        " " + mx.toFixed(2) + " " + my.toFixed(2);
    }
    const last = pts[pts.length - 1];
    s += " L " + last.x.toFixed(2) + " " + last.y.toFixed(2);
    return s;
  }
  const botRev = bot.slice().reverse();
  return "M " + top[0].x.toFixed(2) + " " + top[0].y.toFixed(2) +
    seg(top) + seg(botRev) + " Z";
}

// Salpicaduras sueltas alrededor de la mancha: puntos y motas alargadas
// (elipses rotadas) esparcidas a los lados, mas densas alrededor de cada
// pegote. Van dentro del grupo enmascarado: aparecen al paso del trazo.
function appendBloodSpecks(group, samples, total, blobs) {
  const specks = document.createElementNS(SVG_NS, "g");
  function addSpeck(x, y, r, elong, angle, color) {
    const e = document.createElementNS(SVG_NS, "ellipse");
    e.setAttribute("cx", x.toFixed(2));
    e.setAttribute("cy", y.toFixed(2));
    e.setAttribute("rx", (r * elong).toFixed(2));
    e.setAttribute("ry", r.toFixed(2));
    if (angle) e.setAttribute("transform", "rotate(" + angle.toFixed(1) + " " + x.toFixed(2) + " " + y.toFixed(2) + ")");
    e.setAttribute("fill", color);
    specks.appendChild(e);
  }
  function sampleAt(d) {
    return samples[Math.min(samples.length - 1, Math.round((d / total) * (samples.length - 1)))];
  }
  // Motas sueltas a lo largo del reguero, a ambos lados.
  for (let d = 18 + Math.random() * 30; d < total - 10; d += 32 + Math.random() * 46) {
    const s = sampleAt(d);
    const side = Math.random() < 0.5 ? -1 : 1;
    const dist = 7 + Math.random() * 15;
    addSpeck(
      s.x + s.nx * dist * side + (Math.random() * 6 - 3),
      s.y + s.ny * dist * side + (Math.random() * 6 - 3),
      0.7 + Math.random() * 1.3,
      1 + Math.random() * 1.6,
      Math.random() * 180,
      Math.random() < 0.3 ? "#6e0507" : (Math.random() < 0.5 ? "#a30d0d" : "#c31111")
    );
  }
  // Mas densas alrededor de cada pegote (el "splash" de la referencia).
  (blobs || []).forEach((blob) => {
    const s = sampleAt(blob.c);
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 18;
      addSpeck(
        s.x + Math.cos(ang) * dist,
        s.y + Math.sin(ang) * dist,
        0.6 + Math.random() * 1.6,
        1 + Math.random() * 2.2,
        Math.random() * 180,
        Math.random() < 0.5 ? "#b00e0e" : "#c81212"
      );
    }
  });
  group.appendChild(specks);
}

// Degradado del cuerpo de la mancha A LO LARGO del reguero: zonas de rojo
// oscuro (sangre seca) fundiendo con el rojo vivo, en tramos al azar, para que
// el color no sea uniforme. userSpaceOnUse siguiendo el eje inicio -> fin.
function createBloodGradient(defs, id, samples) {
  const first = samples[0];
  const last = samples[samples.length - 1];
  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  gradient.setAttribute("id", id);
  gradient.setAttribute("gradientUnits", "userSpaceOnUse");
  gradient.setAttribute("x1", first.x.toFixed(2));
  gradient.setAttribute("y1", first.y.toFixed(2));
  gradient.setAttribute("x2", last.x.toFixed(2));
  gradient.setAttribute("y2", last.y.toFixed(2));
  const darks = ["#6e0507", "#7f0709", "#5c0405"];
  const lights = ["#c60f12", "#b70d10", "#d31418"];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // 5-7 paradas alternando vivo/oscuro con offsets ligeramente irregulares;
  // empieza y termina en oscuro (los extremos del reguero se ven mas secos).
  const stopCount = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < stopCount; i++) {
    const base = i / (stopCount - 1);
    const jitter = (i === 0 || i === stopCount - 1) ? 0 : (Math.random() * 0.08 - 0.04);
    const stop = document.createElementNS(SVG_NS, "stop");
    stop.setAttribute("offset", (Math.min(1, Math.max(0, base + jitter)) * 100).toFixed(1) + "%");
    const dark = (i === 0 || i === stopCount - 1) ? true : i % 2 === 0;
    stop.setAttribute("stop-color", dark ? pick(darks) : pick(lights));
    gradient.appendChild(stop);
  }
  defs.appendChild(gradient);
  return "url(#" + id + ")";
}

// Mancha de sangre completa de UNA linea de pago: cuerpo de grosor variable +
// salpicaduras, revelada de izquierda a derecha con una mascara que sigue el
// trazado central (misma animacion de "dibujado" que la linea clasica).
function appendBloodSplatPayline(overlay, defs, geo, index, drawMs, delayMs) {
  const samples = geo.samples;
  const total = geo.total;
  if (!samples || samples.length < 3 || total < 40) return;

  // Perfil de grosor: base fina ondulante + 2-4 pegotes gordos (campanas
  // gaussianas en posiciones al azar). Afinado en los extremos.
  const blobs = [];
  const blobCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < blobCount; i++) {
    blobs.push({
      c: total * (0.12 + 0.76 * Math.random()),
      amp: 3.5 + Math.random() * 4.5,
      sigma: 10 + Math.random() * 16
    });
  }
  const widthPhase1 = Math.random() * Math.PI * 2;
  const widthPhase2 = Math.random() * Math.PI * 2;
  function halfWidth(d) {
    let w = 2.1 + Math.sin(d * 0.05 + widthPhase1) * 0.9 + Math.sin(d * 0.013 + widthPhase2) * 0.9;
    blobs.forEach((blob) => {
      const dd = d - blob.c;
      w += blob.amp * Math.exp(-(dd * dd) / (2 * blob.sigma * blob.sigma));
    });
    const endTaper = Math.min(1, Math.min(d, total - d) / 30 + 0.3);
    return Math.max(0.9, Math.min(10, w)) * Math.min(1, endTaper);
  }

  const top = [];
  const bot = [];
  samples.forEach((s) => {
    const w = halfWidth(s.t * total);
    top.push({ x: s.x + s.nx * w, y: s.y + s.ny * w });
    bot.push({ x: s.x - s.nx * w, y: s.y - s.ny * w });
  });
  const contourData = bloodContourPathData(top, bot);
  const centerData = bloodPaylinePathData(samples);

  // Mascara de revelado: un trazo blanco gordo que recorre el centro; lo que
  // queda fuera (negro) oculta mancha y salpicaduras hasta que el trazo pasa.
  const maskId = "winning-payline-blood-mask-" + index;
  const mask = document.createElementNS(SVG_NS, "mask");
  mask.setAttribute("id", maskId);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  const wipe = document.createElementNS(SVG_NS, "path");
  wipe.setAttribute("d", centerData);
  wipe.setAttribute("fill", "none");
  wipe.setAttribute("stroke", "#fff");
  wipe.setAttribute("stroke-width", "60");
  wipe.setAttribute("stroke-linecap", "round");
  wipe.setAttribute("stroke-linejoin", "round");
  mask.appendChild(wipe);
  defs.appendChild(mask);

  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("mask", "url(#" + maskId + ")");

  // Halo suave detras (visibilidad sobre el tablero oscuro).
  const glow = document.createElementNS(SVG_NS, "path");
  glow.setAttribute("d", contourData);
  glow.setAttribute("fill", "rgba(196, 18, 18, 0.8)");
  glow.setAttribute("filter", "url(#winning-payline-soft-glow)");
  group.appendChild(glow);

  // Cuerpo de la mancha: rojo sangre con tramos oscuros fundiendo al vivo.
  const body = document.createElementNS(SVG_NS, "path");
  body.setAttribute("d", contourData);
  body.setAttribute("fill", createBloodGradient(defs, "winning-payline-blood-grad-" + index, samples));
  body.style.opacity = "0.97";
  group.appendChild(body);

  appendBloodSpecks(group, samples, total, blobs);
  overlay.appendChild(group);
  // El trazo de la mascara se "dibuja" (dashoffset) => la mancha se revela
  // siguiendo el recorrido de la linea, con sus salpicaduras.
  animatePaylineDraw(wipe, drawMs, delayMs);
  return group;
}

function createPaylineSvgDefs(overlay, width, height) {
  const defs = document.createElementNS(SVG_NS, "defs");
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", "winning-payline-soft-glow");
  filter.setAttribute("x", "-20%");
  filter.setAttribute("y", "-20%");
  filter.setAttribute("width", "140%");
  filter.setAttribute("height", "140%");

  const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
  blur.setAttribute("stdDeviation", "3.2");
  blur.setAttribute("result", "blur");
  filter.appendChild(blur);

  const merge = document.createElementNS(SVG_NS, "feMerge");
  const glowNode = document.createElementNS(SVG_NS, "feMergeNode");
  glowNode.setAttribute("in", "blur");
  merge.appendChild(glowNode);
  filter.appendChild(merge);

  defs.appendChild(filter);
  overlay.appendChild(defs);
  return defs;
}

function animatePaylineDraw(path, durationMs, delayMs) {
  if (typeof path.getTotalLength !== "function") return;
  const length = Math.max(1, path.getTotalLength());
  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length);
  if (typeof path.animate === "function") {
    path.animate([
      { strokeDashoffset: String(length) },
      { strokeDashoffset: "0" }
    ], {
      duration: durationMs,
      delay: delayMs || 0,
      easing: "cubic-bezier(.2,.82,.22,1)",
      fill: "both"
    });
  } else {
    path.style.strokeDashoffset = "0";
  }
}

function drawWinningPaylineOverlay() {
  const overlay = ensureWinningPaylineOverlayEl();
  if (!overlay) return;
  const amountOverlay = ensureWinningPaylineAmountOverlayEl();

  const viewportRect = paylineOverlayViewportRect(overlay);
  if (!viewportRect) return;
  const width = Math.max(1, Math.round(viewportRect.width));
  const height = Math.max(1, Math.round(viewportRect.height));
  overlay.setAttribute("viewBox", "0 0 " + width + " " + height);
  overlay.setAttribute("width", String(width));
  overlay.setAttribute("height", String(height));
  overlay.replaceChildren();
  if (amountOverlay) amountOverlay.replaceChildren();

  if (!activeWinningPaylinePayouts.length) {
    overlay.hidden = true;
    if (amountOverlay) amountOverlay.hidden = true;
    return;
  }

  const defs = createPaylineSvgDefs(overlay, width, height);
  // Escalera (showWinningPaylineOverlay): lo que le queda a cada linea para
  // empezar; si se redibuja despues (resize), sin espera.
  const revealElapsed = window.performance.now() - winningPaylineRevealStartedAt;
  // Con muchas lineas, una ruta representativa conserva el foco y las demas
  // quedan como contexto. Los importes por linea siguen apareciendo; no se
  // ocultan pagos ni resultados.
  let representativeIndex = 0;
  if (activeWinningPaylinePayouts.length > 3) {
    activeWinningPaylinePayouts.forEach((payout, index) => {
      if ((Number(payout.amount) || 0) > (Number(activeWinningPaylinePayouts[representativeIndex].amount) || 0)) {
        representativeIndex = index;
      }
    });
  }

  activeWinningPaylinePayouts.forEach((payout, index) => {
    const points = (payout.positions || [])
      .map((cellId) => winningPaylinePointForCell(findCellById(cellId), viewportRect))
      .filter(Boolean);
    if (points.length < 2) return;

    // Reguero de sangre organico (mancha + salpicaduras), revelado siguiendo
    // el trazado de la linea.
    const delayMs = Math.max(0, (winningPaylineRevealDelays[index] || 0) - revealElapsed);
    const geo = bloodPaylineSamples(points);
    const group = appendBloodSplatPayline(overlay, defs, geo, index, WINNING_PAYLINE_DRAW_MS, delayMs);
    if (group && activeWinningPaylinePayouts.length > 3 && index !== representativeIndex) {
      group.style.opacity = "0.24";
    }
    const amountEl = createWinningPaylineAmountEl(payout, points, viewportRect);
    if (amountEl && delayMs) amountEl.style.animationDelay = Math.round(delayMs) + "ms";
  });

  overlay.hidden = false;
  if (amountOverlay) amountOverlay.hidden = false;
}

// Orden de menor a mayor premio, espera de cada linea y su nota. Con muchas
// lineas el paso se acorta (todo cabe en ~1.1 s); en turbo, mas rapido.
function planWinningPaylineLadder() {
  clearWinningPaylineNotes();
  winningPaylineRevealStartedAt = window.performance.now();
  const count = activeWinningPaylinePayouts.length;
  winningPaylineRevealDelays = new Array(count).fill(0);
  if (!count) return;
  const order = activeWinningPaylinePayouts
    .map((payout, index) => ({ index, amount: Number(payout.amount) || 0 }))
    .sort((a, b) => a.amount - b.amount || a.index - b.index);
  const step = speedMs(count > 1
    ? Math.max(WINNING_PAYLINE_STAGGER_MS.min, Math.min(WINNING_PAYLINE_STAGGER_MS.max, WINNING_PAYLINE_STAGGER_MS.total / (count - 1)))
    : 0);
  order.forEach((entry, rank) => {
    const delay = rank * step;
    winningPaylineRevealDelays[entry.index] = delay;
    const semitones = WINNING_PAYLINE_NOTE_STEPS[Math.min(rank, WINNING_PAYLINE_NOTE_STEPS.length - 1)];
    const last = rank === order.length - 1;
    winningPaylineNoteTimers.push(window.setTimeout(function () {
      if (!window.OssuaryAudio) return;
      window.OssuaryAudio.trigger("payline_note", {
        pitch: Math.pow(2, semitones / 12),
        // La ultima (la mayor) un poco mas fuerte si hay escalera; el nivel
        // esta en audio-rules (`payline_note`).
        accent: last && count > 1
      });
    }, delay));
  });
}

function showWinningPaylineOverlay(resolution) {
  activeWinningPaylinePayouts = (resolution && resolution.payouts ? resolution.payouts : [])
    .filter((payout) => (payout.amount || 0) > 0 && (payout.positions || []).length >= 2)
    .map((payout) => ({
      symbol: payout.symbol,
      amount: payout.amount,
      crowMultiplier: payout.crowMultiplier || 1,
      positions: (payout.positions || []).slice()
    }));
  // Sonido de linea de pago: una sola vez por presentacion (no por linea),
  // solo si hay alguna linea ganadora que dibujar.
  if (activeWinningPaylinePayouts.length && window.OssuaryAudio) {
    window.OssuaryAudio.trigger("payline_shown", { count: activeWinningPaylinePayouts.length });
  }
  planWinningPaylineLadder();
  if (activeWinningPaylinePayouts.length) armWinningPaylineForegroundMode();
  else clearWinningPaylineForegroundMode();
  drawWinningPaylineOverlay();
  markPayingTiles(activeWinningPaylinePayouts);
}

function ensurePaylineConnectionDebugOverlayEl() {
  if (paylineConnectionDebugOverlayEl || (!reelLayer && !stage)) return paylineConnectionDebugOverlayEl;
  const el = document.createElementNS(SVG_NS, "svg");
  el.setAttribute("aria-hidden", "true");
  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.pointerEvents = "none";
  el.style.overflow = "visible";
  el.style.zIndex = "6";
  (reelLayer || stage).appendChild(el);
  paylineConnectionDebugOverlayEl = el;
  return el;
}

function clearPaylineConnectionDebug() {
  if (!paylineConnectionDebugOverlayEl) return;
  paylineConnectionDebugOverlayEl.remove();
  paylineConnectionDebugOverlayEl = null;
}

function drawPaylineConnectionDebug() {
  const overlay = ensurePaylineConnectionDebugOverlayEl();
  if (!overlay || !stage) return null;
  const viewportRect = paylineOverlayViewportRect(overlay);
  if (!viewportRect) return null;
  const width = Math.max(1, Math.round(viewportRect.width));
  const height = Math.max(1, Math.round(viewportRect.height));
  overlay.setAttribute("viewBox", "0 0 " + width + " " + height);
  overlay.setAttribute("width", String(width));
  overlay.setAttribute("height", String(height));
  overlay.replaceChildren();

  function pointForCellId(cellId) {
    return winningPaylinePointForCell(findCellById(cellId), viewportRect);
  }

  let count = 0;
  for (let col = 0; col < OSSUARY_BOARD_COLUMNS.length - 1; col++) {
    const column = OSSUARY_BOARD_COLUMNS[col];
    column.forEach((cellId, row) => {
      const from = pointForCellId(cellId);
      if (!from) return;
      paylineNetNextCellIds(OSSUARY_BOARD_COLUMNS, col, row).forEach((nextCellId) => {
        const to = nextCellId ? pointForCellId(nextCellId) : null;
        if (!to) return;
        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("x1", from.x.toFixed(2));
        line.setAttribute("y1", from.y.toFixed(2));
        line.setAttribute("x2", to.x.toFixed(2));
        line.setAttribute("y2", to.y.toFixed(2));
        line.setAttribute("stroke", "rgba(255, 40, 40, 0.88)");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("stroke-linecap", "round");
        overlay.appendChild(line);
        count += 1;
      });
    });
  }

  return {
    columns: OSSUARY_BOARD_COLUMNS.map((column) => column.slice()),
    connections: count
  };
}

function clearCombinationPathHighlight() {
  highlightedCombinationCellIds.forEach((cellId) => {
    const cell = findCellById(cellId);
    if (!cell || !cell.el) return;
    cell.el.style.outline = "";
    cell.el.style.outlineOffset = "";
    cell.el.style.boxShadow = "";
    cell.el.style.zIndex = "";
  });
  highlightedCombinationCellIds = [];
  if (combinationPathHighlightTimer) {
    window.clearTimeout(combinationPathHighlightTimer);
    combinationPathHighlightTimer = null;
  }
}

function printCombinationPaths() {
  const routes = describePaylineNetRoutes();
  const printable = routes.map((route) => ({
    id: route.id,
    longitud: route.length,
    reels: route.reels.join(" -> "),
    celdas: route.cells.join(" -> "),
    visual: route.visual.join(" -> ")
  }));
  console.table(printable);
  return printable;
}

function printCombinationPathsByLength() {
  const routes = describePaylineNetRoutes();
  const grouped = {
    3: routes.filter((route) => route.length === 3),
    4: routes.filter((route) => route.length === 4),
    5: routes.filter((route) => route.length === 5),
    6: routes.filter((route) => route.length === 6),
    7: routes.filter((route) => route.length === 7)
  };
  Object.keys(grouped).forEach((length) => {
    console.log("Rutas longitud " + length);
    console.table(grouped[length].map((route) => ({
      id: route.id,
      longitud: route.length,
      reels: route.reels.join(" -> "),
      celdas: route.cells.join(" -> "),
      visual: route.visual.join(" -> ")
    })));
  });
  console.log("Total final", routes.length);
  return grouped;
}

function highlightCombinationPath(id) {
  const routes = describePaylineNetRoutes();
  const route = routes.find((item) => item.id === id);
  if (!route) return null;

  clearCombinationPathHighlight();
  highlightedCombinationCellIds = route.cells.slice();

  route.cells.forEach((cellId) => {
    const cell = findCellById(cellId);
    if (!cell || !cell.el) return;
    cell.el.style.outline = "3px solid rgba(255, 217, 102, 0.95)";
    cell.el.style.outlineOffset = "2px";
    cell.el.style.boxShadow = "0 0 22px rgba(255, 217, 102, 0.9)";
    cell.el.style.zIndex = "20";
  });

  combinationPathHighlightTimer = window.setTimeout(clearCombinationPathHighlight, speedMs(2200));
  return route;
}

function calculateWinFromCells() {
  return payoutEngine.calculateWinFromCells();
}

function clearAutoTimer() {
  if (state.autoTimer) {
    window.clearTimeout(state.autoTimer);
    state.autoTimer = null;
  }
}

function clearSpinTicker() {
  if (state.spinFrame) {
    window.cancelAnimationFrame(state.spinFrame);
    state.spinFrame = null;
  }
}

function scheduleAutoSpin() {
  clearAutoTimer();
  if (state.spinning || state.busy) return;
  if (bonusSummaryOpen) return; // resumen del bonus en pantalla
  // Cofre/ruleta en marcha: el juego base espera (handleRuletaClosed reanuda).
  if (isRuletaActive()) return;
  // Raven Bonus: la cadena de tiradas gratis va antes que el autoplay. Si en
  // medio entra un modo bonus, este toma el relevo y la cadena se acaba.
  if (state.ravenChain) {
    if (bonusModeRuntime.canConsumeBaseSpin()) endRavenChain();
    else if (continueRavenChain()) return;
    if (bonusSummaryOpen) return; // la cadena acaba de terminar con resumen
  }
  // Fresh Spin (FREE SPIN bonus): las tiradas se encadenan SOLAS, sin pulsar
  // SPIN, mientras queden oportunidades (a peticion del usuario, 2026-07-05).
  // Las tiradas del modo son gratis (freeSpin en startSpin), asi que aqui no
  // aplica el chequeo de balance del modo AUTO normal.
  const bonusModeAutoSpin = bonusModeRuntime.canConsumeBaseSpin();
  if (!bonusModeAutoSpin) closeEconomicRoundIfIdle();
  if (!bonusModeAutoSpin && (!state.auto || state.balance < currentBet())) return;
  if (!bonusModeAutoSpin && state.autoSpinsRemaining <= 0) {
    state.auto = false;
    render();
    return;
  }
  // Fluidez del ciclo de la cuchilla: nunca arrancar la siguiente tirada
  // automatica mientras el rig (clon cuchilla+cuerdas) sigue en pantalla
  // bajando/subiendo. Si arrancara antes, la salvaguarda de prepareReelStops
  // destaparia la pieza real con el clon aun a la vista (dos cuchillas +
  // salto). Se re-intenta en corto: el cleanup del rig siempre llega
  // (animationend o su timeout de seguridad), asi que no puede estancarse.
  if (bonusModeAutoSpin && document.querySelector(".rib1-blade-rig-preview")) {
    state.autoTimer = window.setTimeout(scheduleAutoSpin, speedMs(160));
    return;
  }
  // A peticion del usuario: cuando el esternon acaba de mostrar la guadaña,
  // el siguiente spin del encadenado automatico espera 2.5s EXTRA (adema
  // del AUTO_SPIN_DELAY normal) para dar tiempo a ver la secuencia completa
  // (temblor + corte + vuelo) antes de que gire el siguiente reel. Mismo
  // patron de reintento que la salvaguarda del rig de arriba.
  // Tambien espera mientras se paga el premio de las cabezas (con su BIG WIN).
  const guadanaHoldMs = state.guadanaFxHoldUntil ? state.guadanaFxHoldUntil - Date.now() : 0;
  // Igual mientras los importes del corte de la guillotina vuelan al WIN y
  // su contador BIG WIN (finishCutPrize).
  if (bonusModeAutoSpin && (guadanaHoldMs > 0 || guadanaHeadsPayoutPending || cutPrizeHolding())) {
    state.autoTimer = window.setTimeout(scheduleAutoSpin, speedMs(guadanaHoldMs > 0 ? Math.min(250, guadanaHoldMs) : 250));
    return;
  }
  state.autoTimer = window.setTimeout(function () {
    startSpin({ source: bonusModeAutoSpin ? "bonus-auto" : "auto" });
  }, speedMs(AUTO_SPIN_DELAY));
}

function scheduleBonusFreeSpin(delay) {
  clearAutoTimer();
  state.auto = false;
  setGameStatus(GAME_STATES.RESPIN_PENDING, "bonus_auto_respin_scheduled");
  state.autoTimer = window.setTimeout(() => {
    startSpin({
      source: "bonus-respin",
      spinType: "BONUS",
      freeSpin: true
    });
  }, speedMs(delay));
  render();
}

function syncBonusModeReadout(fallbackLabel = "") {
  var bonusModeLabel = bonusModeRuntime.currentLabel();
  if (state.bonusModeActive && state.bonusModeType === "NORMAL_BONUS") {
    const normalBonusDef = bonusModeRuntime.getModeDefinition("NORMAL_BONUS") || {};
    state.bonusLabel = normalBonusDef.label || fallbackLabel || "FREE SPIN";
  } else {
    state.bonusLabel = bonusModeLabel || fallbackLabel || "";
  }
  updateBonusCandleCounterUI();
  syncBonusModeSternumWaitingLight();
}

function syncBonusBoardBlankMode() {
  // Caja de manos: visibilidad sincronizada con el estado del modo (solo
  // visible durante el FREE SPIN normal; en base game nunca se muestra).
  updateBonusHandBoxUI();
  updateBonusCandleCounterUI();
  var shouldBlankBoard = Boolean(state.bonusModeActive);
  if (shouldBlankBoard && bonusLaneFog) bonusLaneFog.ensure(state.reels);
  if (state.bonusModeBoardBlank === shouldBlankBoard) return;
  state.bonusModeBoardBlank = shouldBlankBoard;
  renderAllReels();
}

function clearBonusIntroTimer() {
  if (state.bonusIntroTimer) {
    window.clearTimeout(state.bonusIntroTimer);
    state.bonusIntroTimer = null;
  }
}

// Video de entrada de las free spins (a peticion del usuario, 2026-10-06):
// sustituye al recuadro marron. Ocupa media pantalla con todo lo demas
// oscurecido; debajo, el titulo y CONTINUAR, que arranca el bonus en
// cualquier momento (si el video acaba antes, queda en su ultimo frame). Suena
// con su audio y la musica del juego se baja mientras dura. Solo presentacion:
// el flujo del bonus (CONTINUAR -> enterBonusMode) no cambia.
// Desde el 2026-10-18 (peticion del usuario) no sale en ningun lado: cada
// entrada saca su cartel con el PLAY debajo (showBonusIntroPoster). El video
// se reserva para mas adelante (offer.video); hasta entonces no se descarga.
const BONUS_INTRO_VIDEO_SRC = "assets/effects/free_spins_intro.mp4";
const BONUS_INTRO_MUSIC_DUCK = 0.75;
let bonusIntroVideoEl = null;
// Salida del modal: fundido + estallido del boton (style.css#bonus-intro-fade-out).
const BONUS_INTRO_LEAVE_MS = 700;
let bonusIntroLeaveTimer = null;

function ensureBonusIntroVideo() {
  if (bonusIntroVideoEl || !bonusIntroModalEl) return bonusIntroVideoEl;
  const panel = bonusIntroModalEl.querySelector(".bonus-intro-modal__panel");
  if (!panel) return null;
  // Escenario: el video y, ENCIMA y en el centro, el boton de empezar.
  const stage = document.createElement("div");
  stage.className = "bonus-intro-modal__stage";
  const video = document.createElement("video");
  video.className = "bonus-intro-modal__video";
  // Sin src hasta que se use (offer.video): asi no se descarga.
  video.preload = "none";
  video.playsInline = true;
  // Neblina: una capa detras del video (asoma por sus bordes) y otra delante,
  // recortada al video, que nace detras del boton.
  stage.appendChild(buildBonusIntroSmoke("back"));
  stage.appendChild(video);
  stage.appendChild(buildBonusIntroSmoke("front"));
  if (bonusIntroContinueBtn) {
    decorateBonusIntroButton(bonusIntroContinueBtn);
    stage.appendChild(bonusIntroContinueBtn);
  }
  panel.insertBefore(stage, panel.firstChild);
  bonusIntroVideoEl = video;
  return video;
}

// Neblina de la entrada (la misma que la de los simbolos: mascaras de
// assets/effects/smoke). "front": entre el video y el boton, recortada al
// video, sale de detras del boton; "back": detras del video, asoma por sus
// bordes hacia lo oscuro. Tres bocanadas desfasadas para que no se quede sin
// humo. Estilos en style.css (.bonus-intro-smoke).
function buildBonusIntroSmoke(kind) {
  const layer = document.createElement("div");
  layer.className = "bonus-intro-smoke bonus-intro-smoke--" + kind;
  layer.setAttribute("aria-hidden", "true");
  for (let i = 1; i <= 3; i += 1) {
    const puff = document.createElement("span");
    puff.className = "bonus-intro-smoke__puff bonus-intro-smoke__puff--" + i;
    layer.appendChild(puff);
  }
  return layer;
}

// Boton de empezar: el de pergamino (src/ui/parchment-ui.js, peticion del
// usuario 2026-10-18) con PLAY en tinta. Detras sale la neblina de los
// simbolos (buildBonusIntroSmoke) y la brasa que late; al pulsarlo estalla
// (fireBonusIntroButton) mientras el modal se funde. Solo visual: el click
// (-> enterBonusMode) no cambia.
const BONUS_INTRO_BUTTON_LABEL = "PLAY";

// Texto con las letras y cifras de oro del contador BIG WIN; si algun caracter
// no tiene imagen, se queda en texto normal (no se mezclan). Desde el
// 2026-10-17 las palabras van en la fuente Buffied de los bonus (peticion del
// usuario; src/ui/bonus-fonts.css) y las cifras siguen en oro.
function renderBonusIntroGoldText(el, text) {
  const font = window.OssuaryNumberFont;
  if (font && typeof font.canRenderWords === "function" && font.canRenderWords(text)) {
    font.render(el, text, { letters: true, words: true });
  } else {
    el.classList.remove("ossuary-number-font");
    el.textContent = text;
  }
}

function decorateBonusIntroButton(btn) {
  if (btn.dataset.decorated) return;
  btn.dataset.decorated = "1";
  const text = BONUS_INTRO_BUTTON_LABEL;
  if (window.OssuaryParchment) window.OssuaryParchment.decorate(btn, text);
  else btn.textContent = text;
  btn.setAttribute("aria-label", text);
  const shine = document.createElement("span");
  shine.className = "bonus-intro-btn__shine";
  shine.setAttribute("aria-hidden", "true");
  btn.appendChild(shine);
  // El listener del juego (registrado antes) ya ha cerrado el modal si acepto
  // el click: solo entonces estalla.
  btn.addEventListener("click", function () {
    if (bonusIntroModalEl && bonusIntroModalEl.classList.contains("is-leaving")) {
      fireBonusIntroButton(btn);
    }
  });
}

// Estallido al pulsar: onda expansiva, chispas de brasa y destello. Vive en el
// escenario del video y se limpia al terminar la salida del modal.
function fireBonusIntroButton(btn) {
  const stage = btn.parentNode;
  if (!stage || btn.classList.contains("is-fired")) return;
  btn.classList.add("is-fired");
  if (window.OssuaryAudio) window.OssuaryAudio.trigger("bonus_intro_start_pressed");
  const burst = document.createElement("div");
  burst.className = "bonus-intro-burst";
  burst.setAttribute("aria-hidden", "true");
  burst.innerHTML = '<span class="bonus-intro-burst__flash"></span>' +
    '<span class="bonus-intro-burst__wave"></span><span class="bonus-intro-burst__wave bonus-intro-burst__wave--late"></span>';
  for (let i = 0; i < 22; i += 1) {
    const spark = document.createElement("span");
    spark.className = "bonus-intro-burst__spark";
    const angle = (i / 22) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 26 + Math.random() * 30;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist * 0.62;
    spark.style.cssText =
      "--dx:" + dx.toFixed(1) + "cqw;" +
      "--dy:" + dy.toFixed(1) + "cqw;" +
      "--rot:" + Math.atan2(dy, dx).toFixed(3) + "rad;" +
      "--size:" + (3 + Math.random() * 3).toFixed(1) + "px;" +
      "--delay:" + Math.round(Math.random() * 90) + "ms;" +
      "--dur:" + Math.round(480 + Math.random() * 260) + "ms;";
    burst.appendChild(spark);
  }
  stage.appendChild(burst);
}

function clearBonusIntroBurst() {
  if (!bonusIntroModalEl) return;
  bonusIntroModalEl.querySelectorAll(".bonus-intro-burst").forEach((el) => el.remove());
  if (bonusIntroContinueBtn) bonusIntroContinueBtn.classList.remove("is-fired");
}

function playBonusIntroVideo() {
  const video = ensureBonusIntroVideo();
  if (!video) return;
  try { video.currentTime = 0; } catch (e) {}
  video.muted = false;
  const started = video.play();
  if (started && started.catch) {
    // Si el navegador bloquea el audio, al menos se ve (en silencio).
    started.catch(() => {
      video.muted = true;
      const retry = video.play();
      if (retry && retry.catch) retry.catch(() => {});
    });
  }
  if (window.OssuaryAudio && typeof window.OssuaryAudio.duck === "function") {
    const ms = Math.round(((isFinite(video.duration) && video.duration) || 8) * 1000) + 300;
    window.OssuaryAudio.duck("MUSIC", BONUS_INTRO_MUSIC_DUCK, ms);
  }
}

function stopBonusIntroVideo() {
  if (!bonusIntroVideoEl) return;
  try { bonusIntroVideoEl.pause(); } catch (e) {}
}

function hideBonusIntroModal() {
  // Salida con fundido (y el estallido del boton si se pulso); el modal se
  // oculta del todo al acabar. El estado del juego no espera a la animacion.
  if (bonusIntroModalEl && !bonusIntroModalEl.hidden) {
    bonusIntroModalEl.classList.add("is-leaving");
    window.clearTimeout(bonusIntroLeaveTimer);
    bonusIntroLeaveTimer = window.setTimeout(finishBonusIntroLeave, BONUS_INTRO_LEAVE_MS);
  } else {
    stopBonusIntroVideo();
  }
  state.bonusIntroOffer = null;
  clearBonusIntroTimer();
}

function finishBonusIntroLeave() {
  window.clearTimeout(bonusIntroLeaveTimer);
  bonusIntroLeaveTimer = null;
  if (bonusIntroModalEl) {
    bonusIntroModalEl.hidden = true;
    bonusIntroModalEl.classList.remove("is-leaving");
  }
  stopBonusIntroVideo();
  clearBonusIntroBurst();
  clearBonusIntroPoster();
}

function showBonusIntroModal(offer) {
  if (bonusIntroLeaveTimer) finishBonusIntroLeave();
  state.bonusIntroOffer = offer;
  if (bonusIntroTitleEl) {
    // Rediseño FREE SPIN: el bonus ya no otorga giros fijos sino oportunidades.
    // El SUPER BONUS cuenta campanadas ("13 BELLS"), no oportunidades.
    const title = (offer.label || "FREE SPIN") + " · " + offer.awardedSpins + " " + (offer.unit || "CHANCES");
    // Con las letras de oro del contador BIG WIN (imagenes).
    bonusIntroTitleEl.setAttribute("aria-label", title);
    renderBonusIntroGoldText(bonusIntroTitleEl, title);
  }
  if (bonusIntroModalEl) {
    bonusIntroModalEl.hidden = false;
    // Cada entrada saca su cartel (el Super, THE JUDGMENT; las demas,
    // EXECUTION). El video solo con offer.video (reservado).
    if (!offer.video) {
      showBonusIntroPoster(offer.poster || (offer.type === "SUPER_BONUS" ? "judgment" : "execution"));
      return;
    }
    clearBonusIntroPoster();
    // Una entrada puede traer su propio video (offer.videoSrc).
    const introVideo = ensureBonusIntroVideo();
    const introSrc = offer.videoSrc || BONUS_INTRO_VIDEO_SRC;
    if (introVideo && introVideo.getAttribute("src") !== introSrc) introVideo.setAttribute("src", introSrc);
    if (introVideo) introVideo.preload = "auto";
    playBonusIntroVideo();
  }
}

// Entrada con cartel (peticiones del usuario, 2026-10-18): sin video ni
// titulo, el cartel del bonus (src/fx/bonus-poster.js: "judgment" para el
// Super, "execution" para el bonus normal) con el PLAY debajo (estilos:
// .bonus-intro-modal.is-poster). Si la caida del encapuchado acaba de dejar
// el del Super en pantalla (el-juicio-fall.js#superSlam), este es el mismo
// cartel en la misma caja y aquel se quita a la vez, cuando este ya ha
// pintado su sangre (WebGL): no se nota el cambio. Si no, el cartel cae aqui
// (drop) con su golpe.
let bonusIntroPosterEl = null;
let bonusIntroPosterKind = null;
let bonusIntroPosterImpact = 0;

function showBonusIntroPoster(kind) {
  ensureBonusIntroVideo();
  stopBonusIntroVideo();
  clearBonusIntroPoster();
  bonusIntroPosterKind = kind;
  bonusIntroModalEl.classList.add("is-poster", "bonus-poster-kind--" + kind);
  const posters = window.OssuaryBonusPoster;
  const p = posters ? posters.build(bonusIntroModalEl, kind, { className: "bonus-intro-modal__poster" }) : null;
  const fall = window.OssuaryElJuicioFall;
  const handoff = Boolean(fall && fall.hasSlam && fall.hasSlam());
  bonusIntroModalEl.classList.toggle("is-handoff", handoff);
  if (!p) {
    if (handoff) fall.releaseSlam();
    return;
  }
  bonusIntroPosterEl = p.root;
  bonusIntroModalEl.insertBefore(p.root, bonusIntroModalEl.firstChild);
  // Mientras no se puede pintar: si viene de la caida, todo oculto (la caida
  // sigue debajo); si no, el cartel y sus relampagos (el velo ya oscurece).
  const hold = handoff ? [p.root] : [p.logo, p.sky];
  hold.forEach((el) => { el.style.visibility = "hidden"; });
  const reveal = () => {
    if (handoff) {
      // Este y el de la caida, cambiados en el mismo fotograma, con el lienzo
      // de este ya pintado (un fotograma despues de montarlo; como mucho
      // 600 ms). Antes, dos velos a la vez: parpadeo oscuro.
      let swapped = false;
      const swap = () => {
        if (swapped || bonusIntroPosterEl !== p.root) return;
        swapped = true;
        hold.forEach((el) => { el.style.visibility = ""; });
        fall.releaseSlam();
      };
      if (p.smoke) p.smoke.onShown(swap);
      else swap();
      window.setTimeout(swap, 600);
      return;
    }
    hold.forEach((el) => { el.style.visibility = ""; });
    bonusIntroPosterImpact = posters.drop(p, {
      onImpact: function () {
        if (window.OssuaryAudio) window.OssuaryAudio.trigger("bonus_intro_poster_land", { kind: kind });
      }
    });
  };
  // Se ensena cuando se puede pintar entero (las imagenes suelen estar en
  // memoria; si no, espera oculto, como mucho 1.5 s).
  const imgs = Array.from(p.root.querySelectorAll("img"));
  if (imgs.every((img) => img.complete && img.naturalWidth)) {
    reveal();
    return;
  }
  Promise.race([
    Promise.all(imgs.map((img) => img.decode().catch(() => {}))),
    new Promise((resolve) => window.setTimeout(resolve, 1500))
  ]).then(() => {
    if (bonusIntroPosterEl === p.root) reveal();
  });
}

function clearBonusIntroPoster() {
  window.clearTimeout(bonusIntroPosterImpact);
  if (bonusIntroPosterEl) bonusIntroPosterEl.remove();
  bonusIntroPosterEl = null;
  if (bonusIntroModalEl) {
    bonusIntroModalEl.classList.remove("is-poster", "is-handoff");
    if (bonusIntroPosterKind) bonusIntroModalEl.classList.remove("bonus-poster-kind--" + bonusIntroPosterKind);
  }
  bonusIntroPosterKind = null;
}

function scheduleBonusIntroModal(offer, delayMs) {
  clearBonusIntroTimer();
  // Prepara la entrada (y su cartel en memoria) mientras corre la espera.
  ensureBonusIntroVideo();
  if (window.OssuaryBonusPoster) window.OssuaryBonusPoster.preload(offer.type === "SUPER_BONUS" ? "judgment" : "execution");
  state.bonusIntroOffer = offer;
  state.bonusIntroTimer = window.setTimeout(function () {
    state.bonusIntroTimer = null;
    showBonusIntroModal(offer);
  }, delayMs);
}

function resetInheritedFeedbackForBonusMode(options = {}) {
  clearBonusFxLayers();
  state.sceneFx = "";
  clearBonusModeSternumLightTimer();
  if (!options.preserveStructureSwell || !respinStructureSwell.stopControlled) {
    resetRespinStructureSwell();
  }
  resetSuperBonusTransition();
  respinLockPulse.active = false;
  respinLockPulse.startAt = 0;
  respinLockPulse.strength = 1;
  bonusLandingWeight.resetStructure();
  clearAllRespinChargeGlow();

  if (!window.OssuaryAudio) return;
  ["REELS", "BONUS", "SYMBOLS", "BIGWIN"].forEach(function (channel) {
    window.OssuaryAudio.stopChannel(channel, 0);
  });
  ["reel-spin-start", "reel-mechanism-start", "rib1-bonus-respin-loop"].forEach(function (soundId) {
    window.OssuaryAudio.stop(soundId, 0);
  });
}

function handoffCollectedLocksToNormalBonusMode() {
  const handoff = bonusModeLockHandoff.prepareNormalBonusMode({
    reels: state.reels,
    fixedReelId: "rib1",
    releaseLockForSpin: function (reel) {
      carryVisibleGiantIntoNextSpin(reel);
      renderGiantBlocks(reel);
      validateGiantSymbolSync(reel, "handoffCollectedLocksToNormalBonusMode");
    }
  });
  bonusFeature.reset();
  emitBonusLockUpdated();
  return handoff;
}

function enterBonusMode(options = {}) {
  const type = options.type || "NORMAL_BONUS";
  const modeDefinition = bonusModeRuntime.getModeDefinition(type);
  if (!modeDefinition || modeDefinition.enabled === false) {
    if (typeof console !== "undefined" && typeof console.info === "function") {
      console.info("[Ossuary Bonus] mode registered but disabled", { type });
    }
    return null;
  }
  if (type === "NORMAL_BONUS") {
    handoffCollectedLocksToNormalBonusMode();
  }
  executionBonusWin = 0;
  executionPrizeInFlight = 0;
  cutPrize = null;
  state.lastBreathUsed = 0;
  const status = type === "SUPER_BONUS"
    ? GAME_STATES.SUPER_BONUS_MODE_PENDING
    : GAME_STATES.BONUS_MODE_PENDING;
  const session = bonusModeRuntime.activate(type);
  // Caja de manos: contador y multiplicador arrancan de cero en cada bonus.
  resetBonusHandBoxState();
  setGameStatus(status, "bonus_mode_activated");
  state.bonusModePendingType = type;
  state.currentSpinType = "BASE";
  state.auto = false;
  syncBonusModeReadout(session ? session.label : "");
  syncBonusBoardBlankMode();
  resetInheritedFeedbackForBonusMode();
  syncBonusModeSternumWaitingLight();
  syncBonusBackgroundVideo();
  emitBonusLogicEvent(
    type === "SUPER_BONUS" ? "onSuperBonusModePending" : "onBonusModePending",
    {
      modePendingType: type,
      awardedSpins: session ? session.awardedSpins : 0,
      rulesProfile: session ? session.rulesProfile : null
    }
  );
  if (typeof console !== "undefined" && typeof console.info === "function") {
    console.info("[Ossuary Bonus] enterBonusMode", {
      type,
      awardedSpins: session ? session.awardedSpins : 0,
      rulesProfile: session ? session.rulesProfile : null
    });
  }
}

function debugEnterFreeSpinsMode() {
  if (state.spinning || state.busy) return false;
  clearAutoTimer();
  hideBonusIntroModal();
  bonusFeature.reset();
  clearBonusLocks();
  applyBonusLocks(["rib1"], { rib1: "RIB_BONUS" });
  state.currentSpinType = "BASE";
  state.auto = false;
  state.busy = false;
  setGameStatus(GAME_STATES.IDLE, "debug_enter_free_spins_mode_reset");
  // Musica del Execution, como al completar la cadena (sin esto seguia la del juego base).
  if (window.OssuaryAudio) window.OssuaryAudio.trigger("bonus_started", { modePendingType: "NORMAL_BONUS", debug: true });
  enterBonusMode({ type: "NORMAL_BONUS" });
  state.bonusModeSpinStartChances = 0;
  state.bonusModeLastRestingTensionLevel = 0;
  syncBonusModeSternumWaitingLight();
  state.busy = false;
  render();
  // Mismo comportamiento que el flujo real: el Fresh Spin arranca solo.
  scheduleAutoSpin();
  return true;
}

// Bonus ganado en la ruleta del cofre (a peticion del usuario, 2026-10-16):
// misma preparacion que debugEnterFreeSpinsMode (guillotina en rib1) pero sin
// entrar aun: sale el video de entrada con PLAY, como cuando se completa la
// cadena en el juego, y PLAY (bonusIntroContinueBtn) llama a enterBonusMode.
// `kind` "SUPER_BONUS": su modo aun no existe; hasta entonces, mismo bonus.
function enterRuletaBonusWithIntro(kind) {
  if (state.spinning || state.busy) return false;
  clearAutoTimer();
  hideBonusIntroModal();
  bonusFeature.reset();
  clearBonusLocks();
  applyBonusLocks(["rib1"], { rib1: "RIB_BONUS" });
  state.currentSpinType = "BASE";
  state.auto = false;
  state.bonusModeSpinStartChances = 0;
  state.bonusModeLastRestingTensionLevel = 0;
  const normalBonusDef = bonusModeRuntime.getModeDefinition("NORMAL_BONUS") || {};
  showBonusIntroModal({
    type: "NORMAL_BONUS",
    source: kind === "SUPER_BONUS" ? "ruleta_super_bonus" : "ruleta_bonus",
    label: normalBonusDef.label || "FREE SPIN",
    awardedSpins: normalBonusDef.awardedSpins || 3
  });
  setGameStatus(GAME_STATES.BONUS_MODE_PENDING, "ruleta_bonus_intro_waiting_continue");
  state.busy = true;
  render();
  return true;
}

function handleBonusNextAction(bonusResult) {
  function finalizeBonusModeFreeSpinReady() {
    setGameStatus(GAME_STATES.IDLE, "bonus_mode_free_spin_ready");
    state.busy = Boolean(bonusHandBoxLevelUpBusy);
    console.log("[busy] set " + state.busy + " - reason: handleBonusNextAction blade_sequence_complete");
    syncBonusModeReadout();
    render();
    scheduleAutoSpin();
  }

  const action = bonusResult && bonusResult.nextAction;
  if (action && action.type === "AUTO_FREE_SPIN") {
    scheduleBonusFreeSpin(action.delay || AUTO_SPIN_DELAY);
    return;
  }

  if (bonusResult && bonusResult.modePendingType) {
    // La compra garantiza Execution; solo las cadenas naturales sortean El Juicio.
    const purchasedExecution = purchasedExecutionEntryPending;
    purchasedExecutionEntryPending = false;
    // SUPER BONUS "El Juicio": el encapuchado se esta decidiendo desde que
    // paro el BONUS de rib3 (startElJuicioChain). La cuchilla de rib1 y la
    // entrada del bonus normal esperan a saberlo: si cae, es el Super.
    const chain = elJuicioChain;
    elJuicioChain = null;
    if (!purchasedExecution && bonusResult.modePendingType === "NORMAL_BONUS" && chain && chain.spinId === state.currentSpinId) {
      setGameStatus(GAME_STATES.BONUS_MODE_PENDING, "el_juicio_chain_deciding");
      render();
      chain.promise.then(function (fell) {
        if (fell) {
          prepareElJuicioEntry("el_juicio_chain_fall");
          showElJuicioIntro("chain");
          return;
        }
        handleBonusNextAction(Object.assign({}, bonusResult, { elJuicioDecided: true }));
      });
      return;
    }
    if (bonusResult.modePendingType !== "NORMAL_BONUS") {
      releaseRib1LockForModePending();
    } else {
      triggerRib1ModePendingBladeDrop();
    }
    if (window.OssuaryAudio) {
      window.OssuaryAudio.trigger(
        bonusResult.modePendingType === "SUPER_BONUS" ? "super_bonus" : "bonus_started",
        { modePendingType: bonusResult.modePendingType }
      );
    }
    if (bonusResult.modePendingType === "NORMAL_BONUS") {
      // Golpe de entrada (src/fx/bonus-entry-hit.js): temblor, destello rojo,
      // golpe grave y la musica hundida hasta que sale la entrada.
      if (window.OssuaryBonusEntryHit) window.OssuaryBonusEntryHit.play({ silenceMs: 1900 });
      // Rediseño FREE SPIN: la oferta muestra las OPORTUNIDADES del modo
      // (awardedSpins del config, 3 hoy), no un numero fijo de giros.
      const normalBonusDef = bonusModeRuntime.getModeDefinition("NORMAL_BONUS") || {};
      const normalOffer = {
        type: "NORMAL_BONUS",
        label: normalBonusDef.label || "FREE SPIN",
        awardedSpins: normalBonusDef.awardedSpins || 3
      };
      setGameStatus(GAME_STATES.BONUS_MODE_PENDING, "bonus_intro_waiting_continue");
      // SUPER BONUS "El Juicio": el encapuchado amaga y a veces cae al
      // esternon (entonces es el Super y no el Execution).
      const teasing = !purchasedExecution && !bonusResult.elJuicioDecided && maybePlayElJuicioTease(function () {
        scheduleBonusIntroModal(normalOffer, 300);
        render();
      });
      if (!teasing) scheduleBonusIntroModal(normalOffer, 2000);
      render();
      return;
    }
    enterBonusMode({ type: bonusResult.modePendingType });
    state.busy = false;
    console.log("[busy] set false - reason: handleBonusNextAction mode_pending");
    render();
    scheduleAutoSpin();
    return;
  }

  // La guadana que cae con la ultima vela tambien corta y paga (antes el bonus
  // se acababa antes de verla cortar). Despues, el Ultimo Aliento.
  if (!(bonusResult && bonusResult.skipFinalGuadana) && maybePlayFinalGuadana(bonusResult)) return;
  // Ultimo Aliento: antes de dar el bonus por acabado (src/fx/execution-tension.js).
  if (!(bonusResult && bonusResult.skipLastBreath) && maybePlayExecutionLastBreath(bonusResult)) return;

  var completedBonusModeSession = bonusModeRuntime.completeIfDepleted();
  if (!completedBonusModeSession) syncBonusBoardBlankMode();
  if (completedBonusModeSession) {
    if (window.OssuaryExecutionTension) window.OssuaryExecutionTension.endLastChance("miss");
    executionPrizeInFlight = 0;
    // Conserva el ultimo tablero hasta terminar el premio. El resumen llama
    // a restoreBaseReelsAfterBonus bajo negro, antes de revelar el juego base.
    // Bonus que venia de la ruleta: el autoplay que se pauso al abrir el cofre
    // se retoma ahora (scheduleAutoSpin al final de esta funcion).
    if (ruletaBonusAutoResume) {
      state.auto = true;
      state.autoSpinsRemaining = ruletaBonusAutoResume.remaining;
      ruletaBonusAutoResume = null;
    }
    // Resumen del Execution Bonus (scheduleAutoSpin espera a que se cierre).
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("bonus_mode_completed", {
      modeType: completedBonusModeSession.type,
      awardedSpins: completedBonusModeSession.awardedSpins
    });
    state.busy = true;
    clearAutoTimer();
    if (!showBonusSummary("execution", executionBonusWin, 0)) {
      restoreBaseReelsAfterBonus("execution");
      state.busy = false;
      render();
      scheduleAutoSpin();
    }
    return;
  }
  state.currentSpinType = "BASE";
  if (window.OssuaryAudio && bonusResult) {
    if (bonusResult.completed) {
      window.OssuaryAudio.trigger("bonus_completed", { bonusWinToPay: bonusResult.bonusWinToPay || 0 });
    } else if (bonusResult.returnToBase || bonusResult.holdLocks) {
      window.OssuaryAudio.trigger("bonus_failed", {});
    }
  }
  if (state.bonusModeActive) {
    ensureFixedBonusModeRib1Lock(reelByIdForLock("rib1"));
    if (bonusResult && bonusResult.bladeLanded) {
      var bladeSequenceStarted = triggerBonusModeSternumBladeCut(reelByIdForLock("sternum"), {
        onComplete: finalizeBonusModeFreeSpinReady
      });
      if (!bladeSequenceStarted) {
        completeBonusModeBladeSequenceFallback();
        finalizeBonusModeFreeSpinReady();
      }
      return;
    }
    // FX visual de la Guadaña (sin logica): si el esternon aterrizo la
    // guadaña, las cabezas de los esqueletos tiemblan y salen despedidas.
    // El flujo continua EXACTAMENTE igual que con cualquier resultado
    // neutro (no bloquea busy ni altera el encadenado de spins).
    {
      const sternumReelForGuadanaFx = reelByIdForLock("sternum");
      if (sternumReelForGuadanaFx && sternumReelForGuadanaFx.giantSymbol === "GUADANA_BONUS") {
        const guadanaCutStarted = playGuadanaHeadsCutSequence();
        state.guadanaFxHoldUntil = guadanaCutStarted ? Date.now() + GUADANA_NEXT_SPIN_HOLD_MS : 0;
      }
    }
    clearBonusModeBladePayoutState();
    setGameStatus(GAME_STATES.IDLE, "bonus_mode_free_spin_ready");
    syncBonusModeSternumWaitingLight();
  } else if (bonusResult && bonusResult.returnToBase) {
    clearBonusLocks();
    setGameStatus(GAME_STATES.IDLE, "collecting_returned_to_base");
    clearBonusModeSternumLightState();
  } else if (bonusResult && bonusResult.holdLocks) {
    // Cadena fallida: las costillas/esternon bloqueados se quedan visibles
    // en pantalla (no se llama a clearBonusLocks aqui). SPIN se vuelve a
    // habilitar igual (state.busy = false abajo); la limpieza real ocurre
    // recien al arrancar la siguiente tirada BASE (ver startSpin).
    setGameStatus(GAME_STATES.IDLE_WITH_LOCKS, "failed_chain_hold");
    clearBonusModeSternumLightState();
  }
  // Unico punto donde el flujo de bonus/respin queda realmente resuelto (no
  // hay otro respin ni modo bonus pendiente en camino): solo aqui es seguro
  // liberar busy para permitir un spin manual o auto-spin nuevo.
  state.busy = false;
  console.log("[busy] set false - reason: handleBonusNextAction idle");
  syncBonusModeReadout();
  render();
  scheduleAutoSpin();
}

function startSpin(options = {}) {
  const spinOptions = typeof options === "string" ? { spinType: options } : options;
  const source = spinOptions.source || "manual";
  const autoBaseSpin = source === "auto";
  const spinType = spinOptions.spinType || "BASE";
  const bonusModeFreeSpin = spinType !== "BONUS" && bonusModeRuntime.canConsumeBaseSpin();
  const freeSpin = Boolean(spinOptions.freeSpin || spinType === "BONUS" || bonusModeFreeSpin);
  const busyBlocked = state.busy && source !== "bonus-respin";
  if (state.spinning || busyBlocked || (!freeSpin && !state.debugGiantTest && state.balance < currentBet())) return;
  if (bonusSummaryOpen) return; // resumen del bonus en pantalla
  if (isRuletaActive()) return; // juego base en pausa durante el cofre/ruleta
  // Cadena del Raven Bonus: entre sus tiradas no se gira a mano ni en auto.
  if (state.ravenChain && (source === "manual" || source === "auto")) return;
  // Persiste durante los respins, aunque currentPurchasedSpinType se limpie.
  if (spinType !== "BONUS") {
    purchasedExecutionEntryPending = Boolean(state.pendingPurchasedSpin && state.pendingPurchasedSpin.type === "bonus-game");
  }
  const ravenChainSpin = source === "raven-chain" && Boolean(state.ravenChain);
  if (!freeSpin && !state.debugGiantTest) {
    closeEconomicRoundIfIdle();
    if (economicRounds.current()) return;
    economicRounds.begin({ bet: currentBet(), cost: currentBet(), product: "base" });
    economicModel.start("base", currentBet(), economicRounds.current().id);
    resetEconomicPresentation();
    economicWheelPlan = economicJudgmentPlan = null;
    reservedEconomicPayments.clear();
    ruletaEconomicPayment = null;
  }
  if (ravenChainSpin) {
    state.ravenChain.spin += 1;
    state.ravenChain.pending = Math.max(0, state.ravenChain.pending - 1);
  } else if (!state.ravenChain) {
    // Primera tirada normal tras el Raven Bonus: fuera su WIN acumulado.
    ravenChainWin = null;
  }
  if (autoBaseSpin) {
    state.autoSpinsRemaining = Math.max(0, state.autoSpinsRemaining - 1);
    if (state.autoSpinsRemaining <= 0) state.auto = false;
  }
  stopAllBladeBonusMedia();
  // El contador BIG WIN (numero + musica) permanece en pantalla desde que
  // termina de contar; se retira exactamente al arrancar el siguiente spin.
  // El WIN de la tirada anterior tambien se retira aqui.
  resetHudBaseWin();
  bigWinCounter.hide();
  // Limpieza visual de la guadaña: no restaurar cabezas si el esqueleto sigue
  // bloqueado; reaparecen solo con un esqueleto nuevo renderizado.
  cleanupGuadanaTransientFx();
  // Los cuervos de la compra se quedan durante la cadena del Raven Bonus.
  if (!ravenChainSpin) clearPurchasedBladeSpinCrows();

  // Si la tirada anterior termino en cadena de bonus fallida, las costillas
  // bloqueadas se quedaron visibles a proposito (regla: solo se desbloquean
  // al arrancar la SIGUIENTE tirada BASE real, no antes). Esta es esa
  // tirada: se limpia el LOCK (logico via lockManager, visual via
  // releaseFailedChainLocks), pero el simbolo gigante en si NO se borra aqui
  // - sigue como reel.carryGiantBlock y es prepareReelStops (mas abajo) el
  // que, al ser ahora un reel sin lock, lo trata como giant "de paso" y lo
  // desliza fuera con el spin normal en vez de desaparecer antes de girar.
  if (spinType !== "BONUS" && state.gameStatus === GAME_STATES.IDLE_WITH_LOCKS) {
    bonusFeature.clearHeldLocks();
    releaseFailedChainLocks();
  }

  clearAutoTimer();
  clearSpinTicker();
  clearBonusFxLayers();
  clearBonusModeBladePayoutState();
  // Cancela cualquier animacion de cuchilla pequena en vuelo (clones). Los
  // HUECOS persistentes NO se restauran aqui a proposito: viajan con el giro
  // via updateSmallBladeHoles y expiran solos al salir de la ventana visible.
  smallBladeCut.clear();
  // El video de la puerta (o su ultimo frame fijado) NO se retira de golpe:
  // sale deslizandose en la direccion de scroll de su rodillo, como un
  // simbolo mas arrastrado por el giro que arranca.
  if (smallBladeDoorVideo) smallBladeDoorVideo.dismissForSpin();
  // Las copias del cuervo muerto (piedra que golpeo un pajaro) se limpian en el
  // siguiente giro deslizandose hacia abajo; los pajaros vivos SI persisten.
  if (smallBladeBirdPerch) smallBladeBirdPerch.dismissDeathCopiesForSpin();
  if (smallBladeBirdPerch && spinType === "BASE" && !freeSpin && !state.pendingPurchasedSpin && !state.ravenChain && !state.debugGiantTest) {
    smallBladeBirdPerch.advanceBaseSpin();
  }
  // Pagos post-corte: al descartar las copias, esas casillas dejan de ser WILD;
  // y las casillas cortadas del spin anterior vuelven a contar con su simbolo.
  clearDeadCrowWildCellCovers();
  deadCrowWildByCellId.clear();
  smallBladeCutCellIds.clear();
  clearWinningPaylineOverlay();

  // Solo debug: nuevo ciclo de spin, limpia las marcas del overlay temporal.
  state.debugClearing = false;
  state.debugNewLockThisSpin = false;

  const now = resetGameClock(window.performance.now());
  state.spinning = true;
  state.busy = true;
  state.nextSpinSequence += 1;
  state.currentSpinId = "spin-" + state.nextSpinSequence;
  if (economicRounds.current()) economicRounds.bindSpin(state.currentSpinId);
  smallBladeRefillResolvedForSpinId = null;
  console.log("[busy] set true - reason: startSpin " + spinType);
  state.currentSpinType = state.debugGiantTest ? "DEBUG" : spinType;
  state.inlineRib1BonusContinuationActive = false;
  state.inlineRib1BonusContinuationStartedSpinId = null;
  if (bonusModeFreeSpin) {
    // Si el jugador gira antes de que el rig de la cuchilla termine su ciclo,
    // los esqueletos ya cortados se retiran AHORA (antes de prepareReelStops):
    // nunca deben seguir bloqueados en el giro siguiente ni volver a pagar.
    releaseBonusModeCutSkeletons();
    resetInheritedFeedbackForBonusMode({ preserveStructureSwell: true });
  }
  setGameStatus(spinType === "BONUS" ? GAME_STATES.RESPINNING : GAME_STATES.SPINNING, spinType === "BONUS" ? "bonus_respin_started" : "base_spin_started");
  if (window.OssuaryAudio) {
    window.OssuaryAudio.trigger(
      bonusModeFreeSpin ? "bonus_reels_spin_started" : "spin_started",
      { spinType }
    );
  }
  if (spinType === "BONUS") {
    emitBonusLogicEvent("onRespinStarted", {
      lockedReels: state.bonusLockedReels || []
    });
  }
  state.spinStartTime = now;
  state.lastFrameTime = now;
  if (bonusModeFreeSpin) {
    state.bonusModeSpinStartChances = state.bonusModeSpinsRemaining;
    bonusModeRuntime.consumeBaseSpin();
    syncBonusModeSternumWaitingLight();
    // Ultima vela en juego (src/fx/execution-tension.js): ver syncExecutionLastChance.
    if (state.bonusModeSpinStartChances === 1) window.setTimeout(maybeStartExecutionLastChance, speedMs(650));
  } else {
    state.bonusModeSpinStartChances = 0;
    clearBonusModeSternumLightState();
  }
  if (!freeSpin && !state.debugGiantTest) {
    state.balance = Math.max(0, Math.round((state.balance - currentBet()) * 100) / 100);
  }
  state.win = 0;
  syncBonusModeReadout();
  state.bonusTrigger = null;
  state.sceneFx = "";
  state.currentPurchasedSpinType = state.pendingPurchasedSpin ? state.pendingPurchasedSpin.type : null;
  prepareReelStops(now);
  state.pendingPurchasedSpin = null;
  armBonusModeStructureSwellForCurrentSpin();
  render();

  state.spinFrame = window.requestAnimationFrame(updateSpinFrame);
}

// Solo debug: prepara un estado inicial valido (BONUS sin locks previos) y
// arranca un spin BASE real con startSpin(). A partir de ahi NO se llama a
// nada mas manualmente: el motor real (outcome-engine -> detectBonusTrigger
// -> bonusFeature.onSpinFinished -> applyBonusLocks -> handleBonusNextAction
// -> respins automaticos via scheduleBonusFreeSpin -> spin-engine RESPIN ->
// ArrivalPhysics/StructureReaction) hace todo el resto exactamente igual que
// en una partida real. forcedRibGroupCounts es una cola consumida por
// outcome-engine.js (una entrada por spin, en orden). forceSternumOutcome
// (opcional) NUNCA puede saltarse la maquina de estados del Outcome Engine:
// solo tiene efecto en un spin que YA arranca en STATE 3 (rib1+rib2+rib3
// bloqueados de spins ANTERIORES) - usar esto con un solo grupo pendiente
// (p.ej. [1,1,1] con forceSternumOutcome=true en una cadena de 3 spins) NO
// produce sternum en el spin que completa rib3, porque ese spin arranca en
// STATE 2 todavia: el override queda simplemente sin efecto (consumido
// nunca, ya que chooseSternumOutcome ni siquiera lo lee si el gate no
// pasa). Para probar especificamente STATE 3 -> STATE 4 usar
// debugForceSuperBonusFromState3() en su lugar.
function debugForceRealBonusSpin(forcedRibGroupCounts, forceSternumOutcome) {
  if (state.spinning || state.busy) return false;
  bonusFeature.reset();
  clearBonusLocks();
  clearBonusModeSternumPresentationState();
  state.currentSpinType = "BASE";
  setGameStatus(GAME_STATES.IDLE, "debug_force_real_bonus_reset");
  state.debugForcedRibBonusQueue = (forcedRibGroupCounts || []).slice();
  state.debugForcedSternumOutcome = typeof forceSternumOutcome === "boolean" ? forceSternumOutcome : null;
  startSpin();
  return true;
}

function buyBonusOption(optionId) {
  const option = BUY_BONUS_OPTIONS[optionId];
  if (!option || state.spinning || state.busy || bonusSummaryOpen || isRuletaActive() || state.ravenChain) return false;
  if (option.startsElJuicio && (!window.OssuaryElJuicio || !EL_JUICIO_CONFIG || isElJuicioActive())) return false;
  const cost = Math.round((currentBet() * option.costMultiplier) * 100) / 100;
  if (state.balance < cost) {
    state.bonusLabel = "NOT ENOUGH BALANCE";
    render();
    return false;
  }

  if (option.startsRuletaGame && (!window.OssuaryRuletaGame || !window.OssuaryRuletaGame.startPurchasedGame)) return false;
  closeEconomicRoundIfIdle();
  if (economicRounds.current()) return false;
  economicRounds.begin({ bet: currentBet(), cost, product: optionId });
  economicModel.start(optionId, currentBet(), economicRounds.current().id);
  resetEconomicPresentation();
  economicWheelPlan = economicJudgmentPlan = null;
  reservedEconomicPayments.clear();
  ruletaEconomicPayment = null;

  clearAutoTimer();
  state.auto = false;
  state.autoSpinsRemaining = 0;
  state.balance = Math.max(0, Math.round((state.balance - cost) * 100) / 100);
  preselectEconomicBranch();
  state.win = 0;
  resetHudBaseWin();
  state.bonusLabel = option.label || "";
  if (option.startsRuletaGame) {
    state.pendingPurchasedSpin = null;
    state.currentPurchasedSpinType = null;
    state.purchasedForcedRibBonusQueue = [];
    render();
    if (window.OssuaryRuletaGame && window.OssuaryRuletaGame.startPurchasedGame) {
      const started = window.OssuaryRuletaGame.startPurchasedGame();
      render();
      return started;
    }
    state.bonusLabel = "CHEST GAME UNAVAILABLE";
    render();
    return false;
  }
  if (option.startsElJuicio) {
    state.pendingPurchasedSpin = null;
    state.currentPurchasedSpinType = null;
    state.purchasedForcedRibBonusQueue = [];
    render();
    return enterElJuicioWithFall("buy");
  }
  state.pendingPurchasedSpin = {
    type: optionId,
    cost,
    costMultiplier: option.costMultiplier,
    forceSmallBladeBirdCuts: option.forceSmallBladeBirdCuts || 0
  };
  state.purchasedForcedRibBonusQueue = Array.isArray(option.forcedRibBonusQueue)
    ? option.forcedRibBonusQueue.slice()
    : [];
  // Raven Bonus: empieza la cadena (y se sortea el cuervo dorado).
  if (optionId === "blade-spin") startRavenChain();
  render();
  return startSpin({ source: "buy-bonus", spinType: "BASE", freeSpin: true });
}

// Solo debug: construye STATE 3 DIRECTAMENTE (rib1+rib2+rib3 ya bloqueados,
// sin pasar por ningun spin) usando applyBonusLocks() - la misma funcion
// real que aplica locks tras un landing real, no un atajo paralelo - y
// arranca UN UNICO spin BONUS real (mismo startSpin({source:"bonus-respin",
// spinType:"BONUS"}) que usa scheduleBonusFreeSpin para cada respin
// automatico). Los 5 rodillos de costilla ya bloqueados quedan en su rama
// "ya bloqueado" dentro de outcome-engine.js#prepareFinalSymbols (no se
// vuelve a llamar a chooseRibOutcome para ellos: no pueden volver a generar
// rib1/rib2/rib3 en este spin). El esternon forzado solo tiene efecto
// porque, y unicamente porque, este spin arranca ya en STATE 3 - exactamente
// la unica transicion valida hacia STERNUM_BONUS.
function debugForceSuperBonusFromState3() {
  if (state.spinning || state.busy) return false;
  bonusFeature.reset();
  clearBonusLocks();
  clearBonusModeSternumPresentationState();
  state.currentSpinType = "BASE";
  setGameStatus(GAME_STATES.IDLE, "debug_force_super_bonus_reset");
  applyBonusLocks(["rib1", "rib2-left", "rib2-right", "rib3-left", "rib3-right"]);
  state.debugForcedSternumOutcome = true;
  startSpin({ source: "bonus-respin", spinType: "BONUS", freeSpin: true });
  return true;
}

function changeBet(direction) {
  if (betChangeBlocked()) return;
  selectEconomicBet(Math.max(0, Math.min(BET_STEPS.length - 1, state.betIndex + direction)));
  state.win = 0;
  state.bonusLabel = "";
  state.bonusTrigger = null;
  clearBonusFxLayers();
  render();
}

function setBetAmount(amount) {
  if (betChangeBlocked()) return false;
  const oldAmount = BET_STEPS[state.betIndex];
  const index = ensureBetStepAmount(amount);
  if (index === -1) return false;
  state.betIndex = BET_STEPS.indexOf(oldAmount);
  selectEconomicBet(index);
  state.win = 0;
  state.bonusLabel = "";
  state.bonusTrigger = null;
  clearBonusFxLayers();
  render();
  return true;
}

function setMaxBet() {
  if (betChangeBlocked()) return;
  selectEconomicBet(BET_STEPS.length - 1);
  state.win = 0;
  state.bonusLabel = "";
  state.bonusTrigger = null;
  clearBonusFxLayers();
  render();
}

function toggleAuto() {
  if (state.auto) {
    state.auto = false;
    state.autoSpinsRemaining = 0;
  } else {
    state.auto = true;
    state.autoSpinsRemaining = Math.max(1, state.autoSpinConfigured || 50);
  }
  render();
  scheduleAutoSpin();
}

function setAutoSpinCount(count) {
  var normalized = Math.max(1, Math.round(Number(count) || 0));
  state.autoSpinConfigured = normalized;
  if (state.auto) state.autoSpinsRemaining = normalized;
  render();
}

function toggleTurbo() {
  state.turbo = !state.turbo;
  syncAnimationPlaybackRate();
  scheduleAnimationPlaybackSync();
  render();
  return state.turbo;
}

function stopAuto() {
  clearAutoTimer();
  state.auto = false;
  state.autoSpinsRemaining = 0;
  render();
}

function toggleMenu(forceOpen = null) {
  uiControls.toggleMenu(forceOpen);
}

function resetGame() {
  economicModel.reset();
  resetEconomicPresentation();
  economicSpinPlan = economicWheelPlan = economicJudgmentPlan = null;
  reservedEconomicPayments.clear();
  economicStakeBanks.clear();
  economicRounds.reset();
  paymentEngine.reset();
  elJuicioEconomicPayment = ruletaEconomicPayment = null;
  purchasedExecutionEntryPending = false;
  clearAutoTimer();
  clearSpinTicker();
  resetHudBaseWin();
  endRavenChain();
  ravenChainWin = null;
  goldenCrowForcedCells = new Set();
  ruletaBonusAutoResume = null;
  if (state.bonusModeActive && window.OssuaryAudio) {
    window.OssuaryAudio.trigger("bonus_mode_completed", {
      modeType: state.bonusModeType,
      awardedSpins: state.bonusModeSpinsAwarded || 0
    });
  }
  hideBonusIntroModal();
  const wasTurbo = state.turbo;
  window.OssuaryGameState.resetSessionState(state);
  state.turbo = wasTurbo;
  syncAnimationPlaybackRate();
  scheduleAnimationPlaybackSync();
  state.betIndex = betIndexForAmount(DEFAULT_BET_AMOUNT);
  state.bonusModeCutPendingRelease = false;
  clearBonusModeSternumPresentationState();
  bonusFeature.reset();
  bonusModeRuntime.reset();
  resetBonusHandBoxState();
  syncBonusBoardBlankMode();
  syncBonusBackgroundVideo();
  state.currentSpinType = "BASE";
  setGameStatus(GAME_STATES.IDLE, "reset_game");
  clearBonusLocks();
  clearBonusFxLayers();
  clearSmallBladeHoles();
  clearDeadCrowWildCellCovers();
  deadCrowWildByCellId.clear();
  smallBladeCutCellIds.clear();
  smallBladeCut.clear();
  if (smallBladeDoorVideo) smallBladeDoorVideo.clear();
  // Reset total: tambien se van los pajaros posados (en un spin normal NO se
  // retiran: persisten entre spins a peticion del usuario).
  clearCrowLandTimers();
  endBonusChainAnticipationFx();
  bonusChainAnticipation = null;
  if (smallBladeBirdPerch) smallBladeBirdPerch.clear();
  if (window.OssuaryRuletaGame) window.OssuaryRuletaGame.close();
  resetReelMotion();
  resetCellsToReference();
  toggleMenu(false);
  render();
}

function inspectFreshSpinBladeState() {
  const skeletonReels = BONUS_MODE_HAND_CUT_REEL_IDS.map((reelId) => {
    const reel = reelByIdForLock(reelId);
    const visibleSourceEl = visibleGiantSourceElForReel(reel);
    return {
      reelId,
      locked: Boolean(reel && reel.locked),
      lockedSymbol: reel && reel.lockedSymbol ? reel.lockedSymbol : null,
      visible: Boolean(visibleSourceEl)
    };
  });
  const badgeAnchorEl = currentBladeBadgeAnchorEl();
  const info = {
    cutPendingRelease: Boolean(state.bonusModeCutPendingRelease),
    logicalBladeMultiplier: state.bladeMultiplier || 1,
    attachedBladeMultiplier: state.bonusBladeAttachedMultiplier || 1,
    levelUpPending: Boolean(state.bonusBladeLevelUpPending),
    handCount: state.bonusHandCount || 0,
    handTarget: state.bonusHandTarget || 0,
    visibleSkeletons: skeletonReels.filter((entry) => entry.visible).map((entry) => entry.reelId),
    lockedSkeletons: skeletonReels.filter((entry) => entry.locked).map((entry) => entry.reelId),
    badgeAnchor: badgeAnchorEl
      ? (badgeAnchorEl.classList.contains("rib1-blade-rig-preview__blade") ? "rig" : "rib1")
      : "none"
  };
  if (typeof console !== "undefined") {
    console.log("[FreshSpinDebug]", info);
    if (typeof console.table === "function") console.table(skeletonReels);
  }
  return info;
}

uiControls.bind();

if (bonusIntroContinueBtn) {
  bonusIntroContinueBtn.addEventListener("click", function () {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("button_click");
    var offer = state.bonusIntroOffer;
    if (!offer) return;
    hideBonusIntroModal();
    if (offer.type === "SUPER_BONUS" && window.OssuaryElJuicio) {
      startElJuicio(offer.source);
      return;
    }
    enterBonusMode({ type: offer.type });
    state.busy = false;
    console.log("[busy] set false - reason: bonus_intro_continue");
    render();
    scheduleAutoSpin();
  });
}

createReelCells();
render();

window.addEventListener("resize", () => {
  for (const reel of state.reels) {
    reel.cachedCellSizePx = null;
  }
  if (activeWinningPaylinePayouts.length) drawWinningPaylineOverlay();
  if (paylineConnectionDebugOverlayEl) drawPaylineConnectionDebug();
});

debugPanel.expose();

const winSymbolDebug = window.OssuaryWinSymbolDebugFactory.create({
  state,
  hooks: {
    getTileElementForCell: (reel, cell) => reelRenderer.getTileElementForCell(reel, cell),
    renderSymbolContent,
    clearAutoTimer,
    startSpin,
    resetReelMotion,
    resetCellsToReference,
    render,
    buildAnimatedSymbolDebugPreset: (symbol, count) => payoutEngine.buildAnimatedSymbolDebugPreset(symbol, count)
  }
});
winSymbolDebug.expose();

window.OssuaryPaymentDebug = paymentDebug;
window.OssuaryPaylineOverlayDebug = {
  show: showWinningPaylineOverlay,
  clear: clearWinningPaylineOverlay,
  showConnections: drawPaylineConnectionDebug,
  clearConnections: clearPaylineConnectionDebug,
  routes: describePaylineNetRoutes,
  lastResolution: function () {
    return lastPaylineResolutionDebug;
  },
  state: function () {
    return activeWinningPaylinePayouts.map(function (payout) {
      return {
        symbol: payout.symbol,
        amount: payout.amount,
        crowMultiplier: payout.crowMultiplier,
        positions: payout.positions.slice()
      };
    });
  }
};
window.OssuaryFreshSpinDebug = {
  inspectBladeState: inspectFreshSpinBladeState
};

// --- Panel DEBUG (src/debug/debug-menu.js, peticion del usuario 2026-10-15) ---
// Estado en vivo y las acciones que no tenian API. Solo para probar: nada de
// esto corre en una partida normal.

// Tablero forzado para un premio de verdad (paga, dibuja lineas, cuenta el
// WIN y, si toca, el contador BIG WIN). "line": una linea de 5 corazones;
// "lines": las tres primeras columnas llenas de huesos (muchas lineas de 3);
// "big": las cuatro primeras de corazones (BIG WIN). El resto de casillas, con
// un simbolo distinto por columna para que no salgan lineas de relleno (y sin
// cuchillas).
function debugBoardForWin(kind) {
  const symbol = kind === "lines" ? "FEMUR" : "DARK_HEART";
  const columnsFilled = kind === "lines" ? 3 : (kind === "big" ? 4 : 0);
  const lineCells = ["rib2-1", "rib2-2", "sternum-1", "rib2-3", "rib2-4"];
  const fillers = ["VERTEBRA", "SILVER_COIN", "ANCIENT_GOLD_COIN", "FEMUR", "DARK_HEART", "ANCESTRAL_SKULL"]
    .filter((item) => item !== symbol);
  const columnOf = {};
  OSSUARY_BOARD_COLUMNS.forEach((column, col) => column.forEach((id) => { if (id) columnOf[id] = col; }));
  const board = {};
  state.reels.forEach((reel) => {
    board[reel.id] = reel.cells.map((cell) => {
      const col = columnOf[cell.id];
      if (col == null) return fillers[0];
      const win = kind === "line" ? lineCells.includes(cell.id) : col < columnsFilled;
      return win ? symbol : fillers[col % fillers.length];
    });
  });
  return board;
}

function debugGameIdle() {
  return !state.spinning && !state.busy && !isRuletaActive() && !bonusSummaryOpen && !state.ravenChain;
}

window.OssuaryGameDebug = {
  snapshot: function () {
    const ruleta = window.OssuaryRuletaGame;
    return {
      balance: state.balance,
      bet: currentBet(),
      win: state.win,
      spinning: Boolean(state.spinning),
      busy: Boolean(state.busy),
      status: state.gameStatus || "",
      spinType: state.currentSpinType || "",
      turbo: turboActive(),
      auto: Boolean(state.auto),
      autoLeft: state.autoSpinsRemaining || 0,
      locked: state.reels.filter((reel) => reel.locked).map((reel) => reel.id),
      bonusActive: Boolean(state.bonusModeActive),
      bonusChances: state.bonusModeActive ? (state.bonusModeSpinsRemaining || 0) : null,
      bonusWin: executionBonusWin,
      hands: state.bonusModeActive ? (state.bonusHandCount || 0) + "/" + (state.bonusHandTarget || 0) : null,
      guillotineMult: state.bonusModeActive ? (state.bonusBladeAttachedMultiplier || 1) : null,
      bloodMark: state.bonusModeActive ? (state.bonusBloodMark || 1) : null,
      lastBreathUsed: state.bonusModeActive ? (state.lastBreathUsed || 0) : null,
      forcedExecutionFx: executionEnhancers ? executionEnhancers.forced() : null,
      raven: state.ravenChain ? { pending: state.ravenChain.pending, spin: state.ravenChain.spin, win: ravenChainWin } : null,
      chest: ruleta ? { count: ruleta.getCount(), target: ruleta.getTriggerCount(), open: ruleta.isActive() } : null,
      summaryOpen: bonusSummaryOpen,
      forcedNextBonus: state.debugBonusForce ? Object.assign({}, state.debugBonusForce) : null,
      superBonus: window.OssuaryElJuicio && window.OssuaryElJuicio.isActive() ? window.OssuaryElJuicio.debug.state() : null,
      superBonusNext: elJuicioDebugNext
    };
  },
  isIdle: debugGameIdle,
  setBalance: function (amount) {
    state.balance = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
    render();
    return state.balance;
  },
  forceWin: function (kind) {
    if (!debugGameIdle() || state.bonusModeActive) return false;
    clearAutoTimer();
    state.auto = false;
    state.debugGiantTest = {
      landing: true,
      label: "DEBUG WIN",
      debugWinAnimation: true,
      landingFinalSymbols: debugBoardForWin(kind)
    };
    startSpin();
    return true;
  },
  // Amagos de la guillotina de rib1 (src/fx/rib1-tease.js): una tirada base
  // con ese amago. "win-back", "win-creep" y "win-slow" caen (y la cadena
  // sigue con su suerte de siempre); "short", "over", "pass" y "flyby" no.
  rib1Tease: function (kind) {
    if (!debugGameIdle() || state.bonusModeActive || !window.OssuaryRib1Tease) return false;
    if (!window.OssuaryRib1Tease.force(kind)) return false;
    clearAutoTimer();
    state.auto = false;
    return debugForceRealBonusSpin([String(kind).indexOf("win") === 0 ? 1 : 0]);
  },
  rib1: function () {
    const reel = state.reels.find((item) => item.id === "rib1");
    if (!reel) return null;
    return {
      phase: reel.phase,
      position: Math.round(reel.position * 1000) / 1000,
      target: reel.targetPosition,
      giant: reel.giantSymbol || null,
      locked: Boolean(reel.locked),
      symbols: reel.cells.map((cell) => cell.effective || null),
      pending: reel.pendingFinalSymbols ? reel.pendingFinalSymbols.slice() : null,
      plan: window.OssuaryRib1Tease ? window.OssuaryRib1Tease.current() : null,
      tease:(reel.teaseGiantBlocks || []).map((block) => block.refPosition - reel.position),
      carry: reel.carryGiantBlock ? reel.carryGiantBlock.refPosition - reel.position : null
    };
  },
  // Proxima tirada del Execution Bonus: { sternum, ribs } (ver
  // outcome-engine.js#debugBonusForceFor).
  forceBonusNext: function (force) {
    if (!state.bonusModeActive) return false;
    state.debugBonusForce = { sternum: force && force.sternum || null, ribs: force && force.ribs || null, spinId: null };
    return true;
  },
  addHands: function (amount) {
    if (!isNormalFreeSpinBonusActive() || state.spinning) return false;
    startBonusHandCountAnimation(Number(amount) || 5);
    return true;
  },
  // SUPER BONUS "El Juicio": entrar ya (caida del encapuchado, entrada y
  // PLAY) o fijar que hara el encapuchado en la proxima cadena completa
  // ("super" cae, "tease" amaga sin caer, null al azar).
  enterSuperBonus: function () {
    if (!debugGameIdle()) return false;
    return enterElJuicioWithFall("debug");
  },
  superBonusNext: function (mode) {
    elJuicioDebugNext = mode === "super" || mode === "tease" ? mode : null;
    return true;
  },
  // Mejoras del Execution Bonus (2026-10-16): { bloodMark: 2|3|5|10,
  // lastBreath: true|false, drop: "classic"|"snag"|"execution" } para la
  // proxima vez que toquen.
  forceExecutionFx: function (force) {
    force = force || {};
    if (executionEnhancers) executionEnhancers.force(force);
    if (force.drop && window.OssuaryGuillotineDrop) window.OssuaryGuillotineDrop.forceNext(force.drop);
    return true;
  },
  hoodEyes: function (mood) {
    showHoodEyes(mood);
    if (mood === "watch") {
      window.setTimeout(function () {
        if (window.OssuaryHoodEyes && window.OssuaryHoodEyes.release) window.OssuaryHoodEyes.release("watch");
      }, 4200);
    }
    return true;
  }
};
window.printCombinationPaths = printCombinationPaths;
window.printCombinationPathsByLength = printCombinationPathsByLength;
window.highlightCombinationPath = highlightCombinationPath;
window.printWinningCombinations = printWinningCombinations;
window.printFakeWinningCombinations = printFakeWinningCombinations;
