(function () {
  "use strict";

  function createPaytableEngine(options) {
    var config = options || {};
    var catalog = config.catalog || window.OssuaryMathSymbolCatalog.create({
      symbols: config.symbols || window.OSSUARY_MATH_SYMBOL_CATALOG
    });

    function validate() {
      return catalog.all().map(function (symbol) {
        var missing = [3, 4, 5, 6, 7].filter(function (length) {
          return typeof symbol.payouts[length] !== "number";
        });
        return {
          symbolId: symbol.id,
          valid: missing.length === 0,
          missingLengths: missing
        };
      });
    }

    function entry(symbolId) {
      return catalog.get(symbolId);
    }

    function payout(symbolId, length) {
      return catalog.payoutFor(symbolId, length);
    }

    function describe() {
      return catalog.all().map(function (symbol) {
        return {
          id: symbol.id,
          name: symbol.name,
          category: symbol.category,
          payouts: Object.assign({}, symbol.payouts)
        };
      });
    }

    return {
      catalog: catalog,
      validate: validate,
      entry: entry,
      payout: payout,
      describe: describe
    };
  }

  window.OssuaryMathPaytableEngine = {
    create: createPaytableEngine
  };
})();
