(function () {
  "use strict";

  function createComboEvaluator(options) {
    var comboEngine = options.comboEngine;
    var config = options.config || {};
    var evaluator = window.OssuaryMathCombinationSymbolEvaluator.create({
      config: config
    });

    function evaluateRoutes(boardState, routes) {
      var sourceRoutes = routes || comboEngine.generateRoutes();
      return evaluator.evaluateRoutes(boardState, sourceRoutes);
    }

    return {
      evaluateRoutes: evaluateRoutes
    };
  }

  window.OssuaryComboEvaluator = {
    create: createComboEvaluator
  };
})();
