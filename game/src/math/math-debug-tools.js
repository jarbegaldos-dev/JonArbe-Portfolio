(function () {
  "use strict";

  function createMathDebugTools(options) {
    var engine = options.engine;

    function printRoutes() {
      var routes = engine.describeRoutes();
      console.table(routes);
      return routes;
    }

    function printCombinations(boardState, routes) {
      var combinations = engine.evaluateBoard(boardState, routes);
      console.table(combinations);
      return combinations;
    }

    function printConflicts(combinations) {
      var conflicts = engine.conflictResolver.detectConflicts(combinations);
      console.table(conflicts);
      return conflicts;
    }

    function printPayouts(combinations, bet) {
      var payouts = engine.payoutEngine.calculate(combinations, bet);
      console.table(payouts.payouts);
      return payouts;
    }

    function printResolution(boardState, bet, routes) {
      var resolved = engine.resolveBoard(boardState, bet, routes);
      console.table(resolved.resolution.accepted);
      console.table(resolved.resolution.payouts);
      return resolved;
    }

    function runSimulation(options) {
      var stats = engine.simulator.run(options);
      console.table([stats]);
      return stats;
    }

    function measure(label, runner) {
      var start = Date.now();
      var result = runner();
      var elapsedMs = Date.now() - start;
      return {
        label: label,
        elapsedMs: elapsedMs,
        result: result
      };
    }

    function benchmark(label, iterations, runner) {
      var output = measure(label, function () {
        for (var i = 0; i < iterations; i += 1) runner(i);
      });
      console.table([{
        label: output.label,
        iterations: iterations,
        elapsedMs: output.elapsedMs
      }]);
      return output;
    }

    return {
      printRoutes: printRoutes,
      printCombinations: printCombinations,
      printConflicts: printConflicts,
      printPayouts: printPayouts,
      printResolution: printResolution,
      runSimulation: runSimulation,
      measure: measure,
      benchmark: benchmark
    };
  }

  window.OssuaryMathDebugTools = {
    create: createMathDebugTools
  };
})();
