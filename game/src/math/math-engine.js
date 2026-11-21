(function () {
  "use strict";

  function createMathEngine(options) {
    var config = options || {};
    var comboEngine = config.comboEngine || (
      config.state
        ? window.OssuaryComboEngine.create({
            state: config.state,
            config: config.comboConfig || window.OSSUARY_COMBO_CONFIG || {}
          })
        : null
    );
    var evaluator = window.OssuaryMathCombinationSymbolEvaluator.create({
      config: config.evaluatorConfig || {}
    });
    var conflictResolver = window.OssuaryMathCombinationConflictResolver.create(config.conflicts || {});
    var paytable = window.OssuaryMathPaytableEngine.create({
      symbols: config.symbols || window.OSSUARY_MATH_SYMBOL_CATALOG
    });
    var payoutEngine = window.OssuaryMathDryPayoutEngine.create({
      paytable: paytable
    });
    var winResolver = window.OssuaryMathWinResolver.create({
      conflictResolver: conflictResolver,
      payoutEngine: payoutEngine
    });
    var mechanics = window.OssuaryMathMechanicsRegistry.create({
      mechanics: config.mechanics || window.OSSUARY_MATH_FUTURE_MECHANICS
    });
    var simulator = window.OssuaryMathSimulationEngine.create({
      evaluator: {
        evaluateRoutes: function (boardState, routes) {
          return evaluator.evaluateRoutes(boardState, routes);
        }
      },
      winResolver: winResolver
    });

    function ensureRoutes(routes) {
      if (routes) return routes;
      return comboEngine ? comboEngine.generateRoutes() : [];
    }

    function evaluateBoard(boardState, routes) {
      return evaluator.evaluateRoutes(boardState, ensureRoutes(routes));
    }

    function resolveBoard(boardState, bet, routes) {
      var combinations = evaluateBoard(boardState, routes);
      return {
        combinations: combinations,
        resolution: winResolver.resolve({
          combinations: combinations,
          bet: bet
        })
      };
    }

    return {
      comboEngine: comboEngine,
      evaluator: evaluator,
      conflictResolver: conflictResolver,
      paytable: paytable,
      payoutEngine: payoutEngine,
      winResolver: winResolver,
      mechanics: mechanics,
      simulator: simulator,
      generateRoutes: function () { return ensureRoutes(); },
      describeRoutes: function () { return comboEngine ? comboEngine.describeRoutes() : []; },
      evaluateBoard: evaluateBoard,
      resolveBoard: resolveBoard,
      createRtpFramework: function () {
        return window.OssuaryMathRtpFramework.create();
      }
    };
  }

  window.OssuaryMathEngine = {
    create: createMathEngine
  };
})();
