(function () {
  "use strict";

  function createWinResolver(options) {
    var config = options || {};
    var conflictResolver = config.conflictResolver || window.OssuaryMathCombinationConflictResolver.create(config.conflicts || {});
    var payoutEngine = config.payoutEngine || window.OssuaryMathDryPayoutEngine.create(config.payouts || {});

    function resolve(payload) {
      var combinations = (payload && payload.combinations) || [];
      var bet = payload && payload.bet;
      var conflictResult = conflictResolver.resolve(combinations);
      var payoutResult = payoutEngine.calculate(conflictResult.accepted, bet);

      return {
        accepted: conflictResult.accepted,
        rejected: conflictResult.rejected,
        conflicts: conflictResult.conflicts,
        ordered: conflictResult.ordered,
        payouts: payoutResult.payouts,
        total: payoutResult.total,
        bet: payoutResult.bet
      };
    }

    return {
      resolve: resolve
    };
  }

  window.OssuaryMathWinResolver = {
    create: createWinResolver
  };
})();
