(function () {
  "use strict";

  function createSimulationEngine(options) {
    var config = options || {};
    var evaluator = config.evaluator || null;
    var winResolver = config.winResolver || null;

    function emptyStats() {
      return {
        totalSpins: 0,
        totalWinAmount: 0,
        prizeCount: 0,
        bonusCount: 0,
        superBonusCount: 0,
        hitRate: 0,
        symbolFrequency: {},
        routeFrequency: {}
      };
    }

    function bump(map, key, amount) {
      map[key] = (map[key] || 0) + (amount || 1);
    }

    function normalizeSpin(spin) {
      var combinations = spin.combinations || [];
      var resolved = spin.resolved || null;

      if (!resolved && evaluator && winResolver && spin.boardState) {
        combinations = evaluator.evaluateRoutes(spin.boardState, spin.routes);
        resolved = winResolver.resolve({
          combinations: combinations,
          bet: spin.bet || 0
        });
      }

      return {
        boardState: spin.boardState || [],
        combinations: combinations,
        resolved: resolved || { accepted: combinations, total: 0 },
        trigger: spin.trigger || null
      };
    }

    function consumeSpin(stats, spin) {
      var normalized = normalizeSpin(spin);
      stats.totalSpins += 1;

      normalized.boardState.forEach(function (entry) {
        bump(stats.symbolFrequency, entry.symbol);
      });

      (normalized.resolved.accepted || []).forEach(function (entry) {
        bump(stats.routeFrequency, String(entry.id || entry.routeId || "unknown"));
      });

      if (normalized.trigger === "BONUS") stats.bonusCount += 1;
      if (normalized.trigger === "SUPER_BONUS") stats.superBonusCount += 1;
      if ((normalized.resolved.total || 0) > 0) stats.prizeCount += 1;
      stats.totalWinAmount += normalized.resolved.total || 0;
      stats.hitRate = stats.totalSpins ? stats.prizeCount / stats.totalSpins : 0;
      return stats;
    }

    function run(options) {
      var settings = options || {};
      var total = settings.count || 0;
      var nextSpin = settings.nextSpin;
      var stats = emptyStats();

      for (var index = 0; index < total; index += 1) {
        consumeSpin(stats, nextSpin(index));
      }

      return stats;
    }

    return {
      emptyStats: emptyStats,
      consumeSpin: consumeSpin,
      run: run
    };
  }

  window.OssuaryMathSimulationEngine = {
    create: createSimulationEngine
  };
})();
