(function () {
  "use strict";

  function createDryPayoutEngine(options) {
    var config = options || {};
    var paytable = config.paytable || window.OssuaryMathPaytableEngine.create();

    function normalizeBet(bet) {
      var amount = Number(bet || 0);
      return Number.isFinite(amount) ? amount : 0;
    }

    function calculateCombination(combination, bet) {
      var unitBet = normalizeBet(bet);
      var payoutMultiplier = paytable.payout(combination.symbol, combination.length);
      return {
        symbol: combination.symbol,
        length: combination.length,
        routeId: combination.id || null,
        positions: (combination.positions || []).slice(),
        wildsUsed: Boolean(combination.wildsUsed),
        multiplier: payoutMultiplier,
        amount: unitBet * payoutMultiplier
      };
    }

    function calculate(combinations, bet) {
      var results = (combinations || []).map(function (combination) {
        return calculateCombination(combination, bet);
      });
      var total = results.reduce(function (sum, result) {
        return sum + result.amount;
      }, 0);

      return {
        bet: normalizeBet(bet),
        total: total,
        payouts: results
      };
    }

    return {
      calculateCombination: calculateCombination,
      calculate: calculate
    };
  }

  window.OssuaryMathDryPayoutEngine = {
    create: createDryPayoutEngine
  };
})();
