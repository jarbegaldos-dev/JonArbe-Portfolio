(function () {
  "use strict";

  var SYMBOL_CATEGORIES = {
    NORMAL: "NORMAL",
    WILD: "WILD",
    SCATTER: "SCATTER",
    BONUS: "BONUS",
    SUPER_BONUS: "SUPER_BONUS"
  };

  function defaultPayouts() {
    return { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  }

  function normalizePayouts(payouts) {
    return Object.assign(defaultPayouts(), payouts || {});
  }

  function normalizeSymbol(definition) {
    return {
      id: definition.id,
      name: definition.name || definition.id,
      category: definition.category || SYMBOL_CATEGORIES.NORMAL,
      payouts: normalizePayouts(definition.payouts),
      tags: (definition.tags || []).slice(),
      metadata: Object.assign({}, definition.metadata || {})
    };
  }

  function defaultSymbols() {
    return [
      { id: "CROWNED_SKULL", name: "Crowned Skull", category: SYMBOL_CATEGORIES.NORMAL },
      { id: "ANCESTRAL_SKULL", name: "Ancestral Skull", category: SYMBOL_CATEGORIES.NORMAL },
      { id: "DARK_HEART", name: "Dark Heart", category: SYMBOL_CATEGORIES.NORMAL },
      { id: "ANCIENT_GOLD_COIN", name: "Ancient Gold Coin", category: SYMBOL_CATEGORIES.NORMAL },
      { id: "SILVER_COIN", name: "Silver Coin", category: SYMBOL_CATEGORIES.NORMAL },
      { id: "VERTEBRA", name: "Vertebra", category: SYMBOL_CATEGORIES.NORMAL },
      { id: "FEMUR", name: "Femur", category: SYMBOL_CATEGORIES.NORMAL },
      { id: "WILD", name: "Wild", category: SYMBOL_CATEGORIES.WILD },
      { id: "SCATTER", name: "Scatter", category: SYMBOL_CATEGORIES.SCATTER },
      { id: "RIB_BONUS", name: "Rib Bonus", category: SYMBOL_CATEGORIES.BONUS },
      { id: "STERNUM_BONUS", name: "Sternum Bonus", category: SYMBOL_CATEGORIES.SUPER_BONUS }
    ].map(normalizeSymbol);
  }

  function createSymbolCatalog(options) {
    var config = options || {};
    var symbols = (config.symbols || defaultSymbols()).map(normalizeSymbol);
    var byId = {};
    symbols.forEach(function (symbol) {
      byId[symbol.id] = symbol;
    });

    function get(symbolId) {
      return byId[symbolId] || null;
    }

    function all() {
      return symbols.slice();
    }

    function payoutFor(symbolId, length) {
      var symbol = get(symbolId);
      if (!symbol) return 0;
      return Number(symbol.payouts[length] || 0);
    }

    function isCategory(symbolId, category) {
      var symbol = get(symbolId);
      return Boolean(symbol && symbol.category === category);
    }

    return {
      categories: Object.assign({}, SYMBOL_CATEGORIES),
      all: all,
      get: get,
      payoutFor: payoutFor,
      isCategory: isCategory
    };
  }

  window.OSSUARY_MATH_SYMBOL_CATEGORIES = SYMBOL_CATEGORIES;
  window.OSSUARY_MATH_SYMBOL_CATALOG = defaultSymbols();
  window.OssuaryMathSymbolCatalog = {
    create: createSymbolCatalog
  };
})();
