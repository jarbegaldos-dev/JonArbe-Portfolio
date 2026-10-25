(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Mejoras del Execution Bonus — LOGICA (peticion del usuario, 2026-10-16).
  //
  // - Marca de Sangre: al caer la guillotina con esqueletos que cortar, a veces
  //   la hoja trae un multiplicador solo para ese corte (x2, x3, x5, x10).
  // - Ultimo Aliento: cuando se apaga la ultima vela con esqueletos en el
  //   tablero, a veces vuelve a encenderse una (una oportunidad mas).
  //
  // Solo decide (con el RNG del motor); los numeros viven en
  // src/config/bonus-modes.config.js#executionEnhancers y la presentacion en
  // src/fx/execution-tension.js. game.js lo instancia y aplica el resultado.
  // Debug: force({ bloodMark: 5 }) o force({ lastBreath: true / false }) fija
  // la PROXIMA tirada de cada mejora.
  // ---------------------------------------------------------------------------

  function create(options) {
    var rng = options.rng;
    var config = options.config || {};
    var forced = { bloodMark: null, lastBreath: null };

    function pickWeighted(entries) {
      var total = entries.reduce(function (sum, entry) { return sum + Math.max(0, entry.weight || 0); }, 0);
      if (!(total > 0)) return entries.length ? entries[0].value : 1;
      var roll = rng.next() * total;
      for (var i = 0; i < entries.length; i++) {
        roll -= Math.max(0, entries[i].weight || 0);
        if (roll < 0) return entries[i].value;
      }
      return entries[entries.length - 1].value;
    }

    // Multiplicador de la Marca de Sangre para este corte, o 1 si no sale.
    // ctx.skeletons: esqueletos que va a cortar la guillotina.
    function rollBloodMark(ctx) {
      var cfg = config.bloodMark;
      if (forced.bloodMark != null) {
        var value = forced.bloodMark;
        forced.bloodMark = null;
        return ctx.skeletons > 0 ? Math.max(1, value) : 1;
      }
      if (!cfg || cfg.enabled === false) return 1;
      if (!(ctx.skeletons >= (cfg.minSkeletons || 1))) return 1;
      if (!rng.chance(cfg.chance || 0)) return 1;
      return pickWeighted(cfg.multipliers || []);
    }

    // Si toca la espera del Ultimo Aliento (hay algo que perder). No tira.
    function lastBreathApplies(ctx) {
      var cfg = config.lastBreath;
      if (!cfg || cfg.enabled === false) return false;
      if (!(ctx.skeletons >= (cfg.minSkeletons || 1))) return false;
      var chances = cfg.chanceByUse || [];
      return (ctx.used || 0) < chances.length;
    }

    // true = se enciende otra vela. ctx.used: veces que ya salio en este bonus.
    function rollLastBreath(ctx) {
      if (forced.lastBreath != null) {
        var value = forced.lastBreath;
        forced.lastBreath = null;
        return Boolean(value);
      }
      var cfg = config.lastBreath || {};
      var chance = (cfg.chanceByUse || [])[ctx.used || 0] || 0;
      return rng.chance(chance);
    }

    function lastBreathSpins() {
      var cfg = config.lastBreath || {};
      return Math.max(1, cfg.spins || 1);
    }

    function force(next) {
      if (!next) return;
      if (next.bloodMark != null) forced.bloodMark = Number(next.bloodMark) || 1;
      if (next.lastBreath != null) forced.lastBreath = Boolean(next.lastBreath);
    }

    return {
      rollBloodMark: rollBloodMark,
      lastBreathApplies: lastBreathApplies,
      rollLastBreath: rollLastBreath,
      lastBreathSpins: lastBreathSpins,
      force: force,
      forced: function () { return { bloodMark: forced.bloodMark, lastBreath: forced.lastBreath }; }
    };
  }

  window.OssuaryExecutionEnhancers = { create: create };
})();
