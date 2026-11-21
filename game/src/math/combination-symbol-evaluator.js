(function () {
  "use strict";

  function createCombinationSymbolEvaluator(options) {
    var config = options.config || {};
    var hooks = options.hooks || {};

    var NORMAL_SYMBOLS = new Set(config.NORMAL_SYMBOLS || []);
    var EXCLUDED_SYMBOLS = new Set(config.EXCLUDED_SYMBOLS || ["RIB_BONUS", "STERNUM_BONUS"]);
    var WILD_SYMBOL = config.WILD_SYMBOL || "WILD";
    var MIN_MATCH_LENGTH = config.MIN_MATCH_LENGTH || 3;

    function isExcludedSymbol(symbol) {
      if (hooks.isExcludedSymbol) return hooks.isExcludedSymbol(symbol);
      return EXCLUDED_SYMBOLS.has(symbol);
    }

    function isWildSymbol(symbol) {
      if (hooks.isWildSymbol) return hooks.isWildSymbol(symbol);
      return symbol === WILD_SYMBOL;
    }

    function isNormalSymbol(symbol) {
      if (hooks.isNormalSymbol) return hooks.isNormalSymbol(symbol);
      return NORMAL_SYMBOLS.has(symbol);
    }

    function boardLookup(boardState) {
      var lookup = {};
      (boardState || []).forEach(function (entry) {
        lookup[entry.id] = entry.symbol;
      });
      return lookup;
    }

    function routeCellStates(route, lookup) {
      return route.map(function (cell) {
        return {
          id: cell.id,
          reelId: cell.reelId,
          symbol: lookup[cell.id] || null
        };
      });
    }

    function winningPrefix(routeStates) {
      var prefix = [];
      var baseSymbol = null;

      for (var i = 0; i < routeStates.length; i += 1) {
        var state = routeStates[i];
        var symbol = state.symbol;

        if (!symbol || isExcludedSymbol(symbol)) break;
        if (isWildSymbol(symbol)) {
          prefix.push(state);
          continue;
        }
        if (!isNormalSymbol(symbol)) break;
        if (!baseSymbol) {
          baseSymbol = symbol;
          prefix.push(state);
          continue;
        }
        if (baseSymbol !== symbol) break;
        prefix.push(state);
      }

      if (!baseSymbol || prefix.length < MIN_MATCH_LENGTH) return null;
      return {
        symbol: baseSymbol,
        positions: prefix
      };
    }

    function evaluateRoutes(boardState, routes) {
      var lookup = boardLookup(boardState);

      return (routes || []).map(function (route, index) {
        var routeStates = routeCellStates(route, lookup);
        var prefix = winningPrefix(routeStates);
        if (!prefix) return null;

        return {
          id: index + 1,
          symbol: prefix.symbol,
          length: prefix.positions.length,
          route: route.map(function (cell) { return cell.id; }),
          positions: prefix.positions.map(function (cell) { return cell.id; }),
          wildsUsed: prefix.positions.some(function (cell) { return isWildSymbol(cell.symbol); }),
          reels: prefix.positions.map(function (cell) { return cell.reelId; }),
          symbols: prefix.positions.map(function (cell) { return cell.symbol; })
        };
      }).filter(Boolean);
    }

    return {
      boardLookup: boardLookup,
      routeCellStates: routeCellStates,
      winningPrefix: winningPrefix,
      evaluateRoutes: evaluateRoutes
    };
  }

  window.OssuaryMathCombinationSymbolEvaluator = {
    create: createCombinationSymbolEvaluator
  };
})();
