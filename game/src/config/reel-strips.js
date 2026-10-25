(function () {
  "use strict";

  // Sistema de rodillos virtuales finitos (preparacion para RNG/RTP futuros).
  // No esta conectado todavia al motor de spin actual. El motor de spin
  // sigue usando SPIN_SYMBOLS / OSSUARY_REEL_STRIP_CONFIG sin cambios.

  var STRIP_LENGTH = 250;
  var MIN_GIANT_GAP = 3;
  var GIANT_SYMBOLS = ["BONUS_RIB", "SUPER_BONUS"];

  // Datos embebidos generados a partir de /src/config/strips/<id>.json.
  // Los .json son la fuente editable para el matematico; este bloque es la
  // copia que el navegador puede cargar de forma sincrona via <script>.
  var STRIP_DATA = window.OSSUARY_FINITE_STRIP_DATA || {};

  var REEL_STRIP_MAP = {
    "rib1": "rib1",
    "rib2-left": "rib2-left",
    "rib2-right": "rib2-right",
    "rib3-left": "rib3-left",
    "rib3-right": "rib3-right",
    "rib4-left": "rib4-left",
    "rib4-right": "rib4-right",
    "rib5-left": "rib5-left",
    "rib5-right": "rib5-right",
    "relic": "relic"
  };

  function knownSymbolRegistry() {
    var symbolConfig = window.OSSUARY_SYMBOL_CONFIG || {};
    var normal = symbolConfig.NORMAL_SYMBOLS || [];
    return normal.concat(["WILD"]).concat(GIANT_SYMBOLS);
  }

  function isGiantSymbol(symbol) {
    return GIANT_SYMBOLS.indexOf(symbol) !== -1;
  }

  function getStrip(reelId) {
    var stripId = REEL_STRIP_MAP[reelId];
    return stripId ? STRIP_DATA[stripId] || null : null;
  }

  function getStripLength(reelId) {
    var strip = getStrip(reelId);
    return strip ? strip.length : 0;
  }

  function normalizeStripIndex(index, length) {
    if (!length) return 0;
    var n = index % length;
    return n < 0 ? n + length : n;
  }

  function getSymbolAt(reelId, index) {
    var strip = getStrip(reelId);
    if (!strip || !strip.length) return null;
    return strip[normalizeStripIndex(index, strip.length)];
  }

  function getVisibleSymbols(reelId, stopIndex, count) {
    var strip = getStrip(reelId);
    if (!strip || !strip.length) return [];
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push(strip[normalizeStripIndex(stopIndex + i, strip.length)]);
    }
    return out;
  }

  function validateStrip(reelId, strip) {
    var errors = [];
    if (!strip || !Array.isArray(strip)) {
      errors.push("strip ausente o invalido");
      return errors;
    }
    if (strip.length !== STRIP_LENGTH) {
      errors.push("longitud invalida: " + strip.length + " (esperado " + STRIP_LENGTH + ")");
    }

    var registry = knownSymbolRegistry();
    var lastGiantIdx = -1;
    var firstGiantIdx = -1;

    for (var i = 0; i < strip.length; i++) {
      var symbol = strip[i];
      if (!symbol) {
        errors.push("simbolo vacio en indice " + i);
        continue;
      }
      if (registry.length && registry.indexOf(symbol) === -1) {
        errors.push("simbolo desconocido '" + symbol + "' en indice " + i);
      }
      if (isGiantSymbol(symbol)) {
        if (firstGiantIdx === -1) firstGiantIdx = i;
        if (lastGiantIdx !== -1 && i - lastGiantIdx - 1 < MIN_GIANT_GAP) {
          errors.push("gigantes demasiado cerca: indices " + lastGiantIdx + " y " + i);
        }
        lastGiantIdx = i;
      }
    }

    if (firstGiantIdx !== -1 && lastGiantIdx !== firstGiantIdx) {
      var wrapGap = (strip.length - 1 - lastGiantIdx) + firstGiantIdx;
      if (wrapGap < MIN_GIANT_GAP) {
        errors.push("gigantes demasiado cerca en el wrap: indices " + lastGiantIdx + " y " + firstGiantIdx);
      }
    }

    return errors;
  }

  function validateAllStrips() {
    var report = {};
    var anyError = false;

    Object.keys(REEL_STRIP_MAP).forEach(function (reelId) {
      var stripId = REEL_STRIP_MAP[reelId];
      var strip = STRIP_DATA[stripId];
      var errors = validateStrip(reelId, strip);
      report[reelId] = { stripId: stripId, ok: errors.length === 0, errors: errors };
      if (errors.length) {
        anyError = true;
        console.error("[ReelStrips] strip invalido para '" + reelId + "':", errors);
      }
    });

    if (!anyError) {
      console.info("[ReelStrips] " + Object.keys(REEL_STRIP_MAP).length + " strips finitos validados OK (" + STRIP_LENGTH + " posiciones cada uno).");
    }

    return report;
  }

  function debugInspect(reelId, stopIndex) {
    var strip = getStrip(reelId);
    var length = strip ? strip.length : 0;
    var errors = strip ? validateStrip(reelId, strip) : ["strip no encontrado"];
    return {
      reelId: reelId,
      stripLength: length,
      stopIndex: stopIndex,
      visibleSymbols: strip ? getVisibleSymbols(reelId, stopIndex, 1) : [],
      giantDistanceValidation: errors.length === 0 ? "OK" : "FAIL",
      errors: errors
    };
  }

  function minGiantDistance(strip) {
    var indexes = [];
    for (var i = 0; i < strip.length; i++) {
      if (isGiantSymbol(strip[i])) indexes.push(i);
    }
    if (indexes.length < 2) return null;

    var min = Infinity;
    for (var k = 1; k < indexes.length; k++) {
      min = Math.min(min, indexes[k] - indexes[k - 1] - 1);
    }
    var wrapGap = (strip.length - 1 - indexes[indexes.length - 1]) + indexes[0];
    min = Math.min(min, wrapGap);
    return min;
  }

  function stripStats(reelId) {
    var strip = getStrip(reelId);
    if (!strip) return null;

    var counts = {};
    for (var i = 0; i < strip.length; i++) {
      var symbol = strip[i];
      counts[symbol] = (counts[symbol] || 0) + 1;
    }

    var percentages = {};
    Object.keys(counts).forEach(function (symbol) {
      percentages[symbol] = (counts[symbol] / strip.length * 100).toFixed(2) + "%";
    });

    var errors = validateStrip(reelId, strip);

    return {
      reelId: reelId,
      stripLength: strip.length,
      counts: counts,
      percentages: percentages,
      bonusRibCount: counts["BONUS_RIB"] || 0,
      superBonusCount: counts["SUPER_BONUS"] || 0,
      wildCount: counts["WILD"] || 0,
      minGiantDistance: minGiantDistance(strip),
      wrapValidation: errors.length === 0 ? "OK" : "FAIL"
    };
  }

  function printStripStats() {
    Object.keys(REEL_STRIP_MAP).forEach(function (reelId) {
      var stats = stripStats(reelId);
      if (!stats) {
        console.info("[ReelStripStats] " + reelId + ": sin strip");
        return;
      }
      console.info("[ReelStripStats] " + reelId, {
        stripLength: stats.stripLength,
        percentages: stats.percentages,
        bonusRibCount: stats.bonusRibCount,
        superBonusCount: stats.superBonusCount,
        wildCount: stats.wildCount,
        minGiantDistance: stats.minGiantDistance,
        wrapValidation: stats.wrapValidation
      });
    });
  }

  window.OssuaryFiniteStrips = {
    STRIP_LENGTH: STRIP_LENGTH,
    MIN_GIANT_GAP: MIN_GIANT_GAP,
    GIANT_SYMBOLS: GIANT_SYMBOLS,
    getStrip: getStrip,
    getStripLength: getStripLength,
    getSymbolAt: getSymbolAt,
    getVisibleSymbols: getVisibleSymbols,
    normalizeStripIndex: normalizeStripIndex,
    validateStrip: validateStrip,
    validateAllStrips: validateAllStrips,
    debugInspect: debugInspect,
    stripStats: stripStats,
    printStripStats: printStripStats
  };

  window.OssuaryFiniteStripsDebug = {
    inspect: debugInspect,
    validateAll: validateAllStrips,
    printStripStats: printStripStats
  };

  window.printStripStats = printStripStats;

  validateAllStrips();
})();
