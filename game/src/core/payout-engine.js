(function () {
  "use strict";

  function createPayoutEngine(options) {
    const state = options.state;
    const hooks = options.hooks || {};
    const comboEngine = options.comboEngine;

    function allEffectiveSymbols() {
      return state.reels.flatMap((reel) => reel.cells.map((cell) => cell.effective));
    }

    function winAnimationRegistry() {
      return window.OSSUARY_SYMBOL_WIN_ANIMATIONS || {};
    }

    function animatedSymbolConfig(symbol) {
      return winAnimationRegistry()[symbol] || null;
    }

    function currentBet() {
      return hooks.currentBet();
    }

    function comparePaths(a, b) {
      if (a.length !== b.length) return b.length - a.length;
      return a[0].x - b[0].x || a[0].y - b[0].y;
    }

    function longestConnectedPath(symbol, symbolConfig) {
      if (!comboEngine) return [];
      const result = comboEngine.inspectSymbolPaths(symbol);
      if (!result.paths.length) return [];
      return result.paths.slice().sort(comparePaths)[0];
    }

    function payoutMultiplierForPathLength(symbolConfig, connectedCount) {
      const payMultipliers = symbolConfig && symbolConfig.payMultipliers
        ? symbolConfig.payMultipliers
        : null;
      if (!payMultipliers) return 0;
      return Object.keys(payMultipliers)
        .map((key) => Number(key))
        .filter((count) => count <= connectedCount)
        .sort((a, b) => b - a)
        .map((count) => payMultipliers[count])
        .find((value) => value > 0) || 0;
    }

    function inspectAnimatedSymbolWin(symbol) {
      const symbolConfig = animatedSymbolConfig(symbol);
      if (!symbolConfig) {
        return {
          symbol,
          paying: false,
          connectedCount: 0,
          amount: 0,
          winningCells: []
        };
      }

      const path = longestConnectedPath(symbol, symbolConfig);
      const connectedCount = path.length;
      const minCount = symbolConfig.minCount || 0;
      const multiplier = payoutMultiplierForPathLength(symbolConfig, connectedCount);
      const paying = connectedCount >= minCount && multiplier > 0;

      return {
        symbol,
        paying,
        connectedCount,
        amount: paying ? currentBet() * multiplier : 0,
        winningCells: paying ? path.slice() : []
      };
    }

    function buildAnimatedSymbolDebugPreset(symbol, targetLength) {
      const symbolConfig = animatedSymbolConfig(symbol);
      if (!symbolConfig) return null;
      if (!comboEngine) return null;
      const desiredLength = Math.max(symbolConfig.minCount || 1, targetLength);
      const allPaths = comboEngine.inspectSymbolPaths(symbol).paths
        .filter((path) => path.length === desiredLength);
      if (!allPaths.length) return null;

      const preferredCellIdsByLength = {
        3: ["rib1-1", "rib1-2", "rib1-3"],
        4: ["rib4-1", "rib4-2", "sternum-3", "rib4-3"],
        5: ["rib2-1", "rib2-2", "sternum-1", "rib2-3", "rib2-4"]
      };
      const preferredKey = (preferredCellIdsByLength[desiredLength] || []).join("|");
      const winningPath = allPaths.find((path) => path.map((cell) => cell.id).join("|") === preferredKey)
        || allPaths.slice().sort(comparePaths)[0];
      if (!winningPath || winningPath.length !== desiredLength) return null;

      const finalSymbolsByReel = {};
      state.reels.forEach((reel) => {
        finalSymbolsByReel[reel.id] = reel.cells.map((cell) => cell.initial);
      });

      winningPath.forEach((cell) => {
        const reel = state.reels[cell.reelIndex];
        if (!reel || !finalSymbolsByReel[reel.id]) return;
        finalSymbolsByReel[reel.id][cell.reelCellIndex] = symbol;
      });

      return {
        symbol,
        length: desiredLength,
        winningCellIds: winningPath.map((cell) => cell.id),
        landingFinalSymbols: finalSymbolsByReel
      };
    }

    function calculateWinFromCells() {
      const bet = currentBet();
      const symbols = allEffectiveSymbols();
      const wilds = symbols.filter((symbol) => symbol === "WILD").length;
      const crownedSkulls = symbols.filter((symbol) => symbol === "CROWNED_SKULL").length;
      const darkHearts = symbols.filter((symbol) => symbol === "DARK_HEART").length;
      const ancientGoldCoins = symbols.filter((symbol) => symbol === "ANCIENT_GOLD_COIN").length;
      const vertebrae = symbols.filter((symbol) => symbol === "VERTEBRA").length;
      const femurs = symbols.filter((symbol) => symbol === "FEMUR").length;
      const ancestralSkullWin = inspectAnimatedSymbolWin("ANCESTRAL_SKULL");
      // SILVER_COIN sigue fuera a propósito: no tiene regla de pago.

      let total = 0;
      if (wilds >= 10) total += bet * 60;
      else if (wilds >= 6) total += bet * 25;
      else if (wilds >= 3) total += bet * 6;

      if (crownedSkulls >= 5) total += bet * 8;
      if (darkHearts >= 5) total += bet * 6;
      if (ancientGoldCoins >= 5) total += bet * 4;
      if (vertebrae >= 5) total += bet * 3;
      if (femurs >= 5) total += bet * 3;
      if (ancestralSkullWin.paying) total += ancestralSkullWin.amount;

      return total;
    }

    function getSymbolPayBreakdown() {
      const bet = currentBet();
      const symbols = allEffectiveSymbols();
      const countOf = (key) => symbols.filter((symbol) => symbol === key).length;

      const wilds = countOf("WILD");
      const crownedSkulls = countOf("CROWNED_SKULL");
      const darkHearts = countOf("DARK_HEART");
      const ancientGoldCoins = countOf("ANCIENT_GOLD_COIN");
      const vertebrae = countOf("VERTEBRA");
      const femurs = countOf("FEMUR");
      const ancestralSkullWin = inspectAnimatedSymbolWin("ANCESTRAL_SKULL");

      const breakdown = {};
      if (wilds >= 10) breakdown.WILD = bet * 60;
      else if (wilds >= 6) breakdown.WILD = bet * 25;
      else if (wilds >= 3) breakdown.WILD = bet * 6;

      if (crownedSkulls >= 5) breakdown.CROWNED_SKULL = bet * 8;
      if (darkHearts >= 5) breakdown.DARK_HEART = bet * 6;
      if (ancientGoldCoins >= 5) breakdown.ANCIENT_GOLD_COIN = bet * 4;
      if (vertebrae >= 5) breakdown.VERTEBRA = bet * 3;
      if (femurs >= 5) breakdown.FEMUR = bet * 3;
      if (ancestralSkullWin.paying) breakdown.ANCESTRAL_SKULL = ancestralSkullWin.amount;

      Object.defineProperty(breakdown, "__winningCellsBySymbol", {
        value: {
          ANCESTRAL_SKULL: ancestralSkullWin.winningCells.slice()
        },
        enumerable: false,
        configurable: true,
        writable: true
      });

      return breakdown;
    }

    return {
      allEffectiveSymbols,
      calculateWinFromCells,
      getSymbolPayBreakdown,
      inspectAnimatedSymbolWin,
      buildAnimatedSymbolDebugPreset
    };
  }

  window.OssuaryPayoutEngine = {
    create: createPayoutEngine
  };
})();
