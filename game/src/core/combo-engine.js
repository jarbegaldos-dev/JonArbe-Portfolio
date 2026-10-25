(function () {
  "use strict";

  function createComboEngine(options) {
    var state = options.state;
    var config = options.config || {};
    var hooks = options.hooks || {};

    var NON_PAYING_SYMBOLS = new Set(config.NON_PAYING_SYMBOLS || ["RIB_BONUS", "STERNUM_BONUS"]);
    var NON_SUBSTITUTABLE_SYMBOLS = new Set(config.NON_SUBSTITUTABLE_SYMBOLS || ["RIB_BONUS", "STERNUM_BONUS"]);
    var MIN_PATH_LENGTH = config.MIN_PATH_LENGTH || 3;
    var pathRegistry = window.OssuaryMathCombinationPaths.create({
      state: state,
      config: config,
      hooks: {
        isCellPlayable: isCellEligible,
        canTraverseStep: hooks.canTraverseStep,
        isRouteValid: hooks.isRouteValid
      }
    });

    function cellSymbol(cell) {
      if (hooks.getCellSymbol) return hooks.getCellSymbol(cell);
      return cell.effective;
    }

    function isExcludedSymbol(symbol) {
      if (hooks.isExcludedSymbol) return hooks.isExcludedSymbol(symbol);
      return NON_PAYING_SYMBOLS.has(symbol);
    }

    function isCellEligible(cell, reel) {
      if (hooks.isCellEligible) return hooks.isCellEligible(cell, reel);
      if (!cell) return false;
      if (cell.blocksCombos) return false;
      return !isExcludedSymbol(cellSymbol(cell));
    }

    function canWildSubstitute(targetSymbol, cell) {
      if (hooks.canWildSubstitute) return hooks.canWildSubstitute(targetSymbol, cell);
      return !NON_SUBSTITUTABLE_SYMBOLS.has(targetSymbol);
    }

    function invalidate() {
      pathRegistry.invalidate();
    }

    function matchingSymbol(cell, targetSymbol) {
      var effective = cellSymbol(cell);
      if (effective === targetSymbol) return true;
      if (effective !== "WILD") return false;
      return canWildSubstitute(targetSymbol, cell);
    }

    function inspectSymbolPaths(targetSymbol) {
      if (!targetSymbol || isExcludedSymbol(targetSymbol)) {
        return {
          symbol: targetSymbol,
          paths: [],
          longestPath: []
        };
      }

      var paths = pathRegistry.generateRoutes().filter(function (route) {
        return route.every(function (cell) {
          return matchingSymbol(cell, targetSymbol);
        });
      });

      return {
        symbol: targetSymbol,
        paths: paths,
        longestPath: paths[0] ? paths[0].slice() : []
      };
    }

    function inspectBoard() {
      return pathRegistry.inspectBoard();
    }

    return {
      invalidate: invalidate,
      generateRoutes: pathRegistry.generateRoutes,
      allValidPaths: pathRegistry.generateRoutes,
      inspectSymbolPaths: inspectSymbolPaths,
      inspectBoard: inspectBoard,
      describeRoutes: pathRegistry.describeRoutes
    };
  }

  window.OssuaryComboEngine = {
    create: createComboEngine
  };
})();
