(function (root) {
  "use strict";
  var config = {
    version: "ossuary-economy-2",
    targetRtp: .98,
    baseRtpRange: [.97, .98],
    maxMultiple: 20000,
    // Target configuration. Measured RTP and uncertainty live in docs/math-results.
    costs: { base: 1, "bonus-game": 100, "blade-spin": 20, "chest-game": 20, "super-bonus": 500 },
    lineScale: 1,
    maxBlades: 2,
    bladeFloor: [3, 4],
    crowFloor: [10, 20],
    forbiddenBlades: ["rib2-1", "rib3-2", "rib4-1", "rib5-1", "rib1-2"],
    goldenChance: .12,
    goldenMultipliers: [[10, .7], [25, .22], [50, .08]],
    goldenLifetime: [2, 5],
    perchedDoorChance: .5,
    ravenDoubleChance: .15,
    ravenStoneChances: [.57, .50, .45, .40, .30, .25],
    ravenMaxSpins: 25,
    handLevels: [[2,2],[2,3],[3,4],[3,5],[4,6],[5,8],[6,10],[8,15],[10,20],[12,30],[15,50],[20,75],[25,100],[30,150],[40,250],[50,500]],
    chestThreshold: [40, 53],
    chestOpenMultiple: 5,
    collect: 19,
    wheel: [
      {id:"X0",tier:"BRONZE",multiplier:0,weight:435},
      {id:"X10",tier:"BRONZE",multiplier:10,weight:238},
      {id:"X25",tier:"SILVER",multiplier:25,weight:160},
      {id:"X50",tier:"SILVER",multiplier:50,weight:85},
      {id:"X100",tier:"GOLD",multiplier:100,weight:40},
      {id:"BONUS",tier:"RED",bonus:"BONUS",weight:40},
      {id:"SUPER_BONUS",tier:"BLACK",bonus:"SUPER_BONUS",weight:2}
    ]
  };
  if (root) root.OSSUARY_ECONOMY_CONFIG = config;
  if (typeof module !== "undefined" && module.exports) module.exports = config;
})(typeof window !== "undefined" ? window : null);
