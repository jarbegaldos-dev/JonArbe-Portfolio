(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Reglas del SUPER BONUS "El Juicio" (numeros en src/config/el-juicio.config.js).
  // Sin DOM: lo usa src/fx/el-juicio.js para jugar y tools/sim-el-juicio.js
  // para simular. Todo en multiplos de la apuesta.
  //
  // newSuper() -> estado inicial (condenados que arrastra la Muerte).
  // step(state, { forceGolden, forceHarvest, forceFlock, forceBlight }) -> lo
  //   que pasa en una tirada, en orden: landings (condenados que caen; el
  //   infectado lleva times: lo que vale de mas y suma a la guadana), crows (cuervos
  //   que parte la Muerte en el nido de rib1), flock (los 3 rodillos
  //   marcados: la BANDADA),
  //   harvest (8 cepos llenos: la Siega), end (ultima campanada: la Sentencia).
  //
  // Nido (peticion del usuario, 2026-10-18): rib1 tiene 3 rodillos y giran
  // los tres en cada tirada. El cuervo que cae en la linea lo parte la Muerte
  // en el acto (da su campanada y su paso de guadana) y su rodillo queda
  // marcado de sangre (nest). Con los 3 marcados, la BANDADA: la guadana sube
  // flockRungs peldanos de golpe y las marcas se borran.
  // El estado queda ya actualizado; los eventos llevan lo necesario para
  // animarlo paso a paso.
  // ---------------------------------------------------------------------------

  function create(options) {
    var cfg = options.config;
    var random = options.random || Math.random;
    var ladder = cfg.ladder;

    function pick(list) {
      var total = 0;
      for (var i = 0; i < list.length; i++) total += list[i][1];
      var r = random() * total;
      for (var j = 0; j < list.length; j++) {
        r -= list[j][1];
        if (r < 0) return list[j][0];
      }
      return list[list.length - 1][0];
    }

    function round(x) {
      return Math.round(x * 10000) / 10000;
    }

    function baseMultiplier(s) {
      return s.rung === 0 ? cfg.startMultiplier : ladder[s.rung - 1][1];
    }

    // Guadana: el peldano por los dorados, mas lo que han sumado los
    // infectados (s.blight; los dorados posteriores tambien lo multiplican).
    function multiplier(s) {
      return baseMultiplier(s) * s.golden + s.blight;
    }

    // Lo que falta para el siguiente peldano (null con la guadana al maximo).
    function nextRung(s) {
      if (s.rung >= ladder.length) return null;
      var need = ladder[s.rung][0];
      return { need: need, have: s.progress, left: need - s.progress, multiplier: ladder[s.rung][1] * s.golden + s.blight };
    }

    // times: el multiplicador del infectado (1 si no lo es).
    function condemned(type, times) {
      var t = times || 1;
      return { type: type, value: round(cfg.values[type] * t), marked: t > 1, times: t };
    }

    function lastFree(board) {
      for (var i = board.length - 1; i >= 0; i--) if (!board[i]) return i;
      return -1;
    }

    function boardSum(board) {
      var sum = 0;
      for (var i = 0; i < board.length; i++) if (board[i]) sum += board[i].value;
      return round(sum);
    }

    function newSuper() {
      var s = {
        board: [],
        sack: 0,
        tolls: cfg.tolls,
        rung: 0,
        progress: 0,
        golden: 1,
        blight: 0,
        blights: 0,
        spins: 0,
        harvests: 0,
        crows: 0,
        goldens: 0,
        flocks: 0,
        // Marcas del nido de rib1: 0 limpio, 1 cuervo partido, 2 dorado.
        nest: [],
        done: false,
        win: 0,
        capped: false,
        start: []
      };
      for (var i = 0; i < cfg.cepos; i++) s.board.push(null);
      for (var n = 0; n < cfg.nestCells; n++) s.nest.push(0);
      var count = pick(cfg.startCount);
      var free = [];
      for (var c = 0; c < cfg.cepos; c++) free.push(c);
      for (var k = 0; k < count && free.length; k++) {
        var at = free.splice(Math.floor(random() * free.length), 1)[0];
        var who = condemned(pick(cfg.startTypes), 1);
        s.board[at] = who;
        s.sack = round(s.sack + who.value);
        s.start.push({ cell: at, type: who.type, value: who.value, marked: false });
      }
      s.start.sort(function (a, b) { return a.cell - b.cell; });
      return s;
    }

    function climb(s) {
      if (s.rung >= ladder.length) return false;
      s.progress += 1;
      if (s.progress >= ladder[s.rung][0]) {
        s.rung += 1;
        s.progress = 0;
        return true;
      }
      return false;
    }

    function step(s, opts) {
      opts = opts || {};
      var ev = { spin: 0, landings: [], crows: [], flock: null, harvest: null, end: null };
      if (s.done) return ev;
      s.spins += 1;
      s.tolls -= 1;
      ev.spin = s.spins;

      // Condenados. El infectado (BLIGHTED) saca su multiplicador: vale esas
      // veces mas y esas veces se suman a la guadana. forceBlight: el primero
      // que cae llega infectado (y si no cae ninguno, cae uno).
      var forceBlight = Boolean(opts.forceBlight);
      for (var i = 0; i < s.board.length; i++) {
        if (s.board[i]) continue;
        var lands = random() < cfg.landChance;
        if (!lands && !(forceBlight && i === lastFree(s.board))) continue;
        var blighted = forceBlight || random() < cfg.markChance;
        forceBlight = false;
        var times = blighted ? pick(cfg.blightMultipliers) : 1;
        var who = condemned(pick(cfg.types), times);
        s.board[i] = who;
        s.sack = round(s.sack + who.value);
        if (who.marked) {
          s.blight += times;
          s.blights += 1;
        }
        ev.landings.push({ cell: i, type: who.type, value: who.value, marked: who.marked, times: times, base: cfg.values[who.type], sack: s.sack, multiplier: multiplier(s) });
      }

      // Cuervos: cada rodillo del nido puede traer uno; la probabilidad
      // depende de cuantos estan ya marcados (crowChance[marcados]). Con
      // forceFlock llegan a todos los que faltan por marcar.
      var marked = 0;
      for (var f = 0; f < s.nest.length; f++) if (s.nest[f]) marked += 1;
      var chance = cfg.crowChance[marked] || 0;
      var arrive = [];
      for (var a = 0; a < s.nest.length; a++) {
        if (opts.forceFlock ? !s.nest[a] : random() < chance) arrive.push(a);
      }
      if (opts.forceGolden && !arrive.length && s.nest.length) arrive.push(Math.floor(random() * s.nest.length));
      for (var c = 0; c < arrive.length; c++) {
        var cell = arrive[c];
        var fresh = !s.nest[cell];
        s.crows += 1;
        s.tolls += 1;
        var golden = (opts.forceGolden && c === 0) || random() < cfg.goldenShare;
        s.nest[cell] = golden ? 2 : s.nest[cell] || 1;
        if (golden) {
          var gTimes = pick(cfg.goldenMultipliers);
          s.golden *= gTimes;
          s.blight *= gTimes;
          s.goldens += 1;
          ev.crows.push({ cell: cell, fresh: fresh, golden: true, times: gTimes, rung: s.rung, progress: s.progress, goldenFactor: s.golden, blight: s.blight, multiplier: multiplier(s), tolls: s.tolls });
        } else {
          var up = climb(s);
          ev.crows.push({ cell: cell, fresh: fresh, golden: false, up: up, rung: s.rung, progress: s.progress, goldenFactor: s.golden, blight: s.blight, multiplier: multiplier(s), tolls: s.tolls });
        }
      }

      // BANDADA: los 3 rodillos marcados. La guadana sube flockRungs peldanos
      // (lo que llevaba hacia el siguiente se conserva) y se borran las marcas.
      if (s.nest.length && s.nest.every(Boolean)) {
        var flock = s.nest.slice();
        var from = s.rung;
        var climbBy = opts.forceFlockRungs || pick(cfg.flockRungs);
        s.rung = Math.min(ladder.length, s.rung + climbBy);
        if (s.rung >= ladder.length) s.progress = 0;
        s.flocks += 1;
        for (var k = 0; k < s.nest.length; k++) s.nest[k] = 0;
        ev.flock = { nest: flock, rungs: s.rung - from, rung: s.rung, progress: s.progress, multiplier: multiplier(s) };
      }

      var full = true;
      for (var b = 0; b < s.board.length; b++) if (!s.board[b]) full = false;
      if (full || opts.forceHarvest) {
        var cells = [];
        for (var h = 0; h < s.board.length; h++) {
          if (s.board[h]) cells.push({ cell: h, type: s.board[h].type, value: s.board[h].value, marked: s.board[h].marked });
          s.board[h] = null;
        }
        var sum = 0;
        cells.forEach(function (x) { sum += x.value; });
        s.sack = round(s.sack + sum);
        s.harvests += 1;
        var rose = false;
        if (s.rung < ladder.length) {
          s.rung += 1;
          s.progress = 0;
          rose = true;
        }
        ev.harvest = { cells: cells, sum: round(sum), sack: s.sack, up: rose, rung: s.rung, multiplier: multiplier(s) };
      }

      if (s.tolls <= 0) {
        var rest = [];
        for (var r = 0; r < s.board.length; r++) {
          if (s.board[r]) rest.push({ cell: r, type: s.board[r].type, value: s.board[r].value, marked: s.board[r].marked });
        }
        var restSum = 0;
        rest.forEach(function (x) { restSum += x.value; });
        s.sack = round(s.sack + restSum);
        var m = multiplier(s);
        var raw = s.sack * m;
        s.rawWin = raw;
        s.capped = raw >= cfg.cap;
        s.win = Math.round(Math.min(raw, cfg.cap) * 100) / 100;
        s.done = true;
        ev.end = { cells: rest, sum: round(restSum), sack: s.sack, multiplier: m, win: s.win, capped: s.capped };
      }
      return ev;
    }

    function play() {
      var s = newSuper();
      while (!s.done) step(s);
      return s;
    }

    return {
      newSuper: newSuper,
      step: step,
      play: play,
      multiplier: multiplier,
      baseMultiplier: baseMultiplier,
      nextRung: nextRung,
      boardSum: boardSum
    };
  }

  function replay(record, config) {
    var index = 0;
    var helpers = create({ config: config });
    function copy(value) { return JSON.parse(JSON.stringify(value)); }
    return {
      newSuper: function () { index = 0; return copy(record.initial); },
      step: function (state) {
        if (state.done) return { spin: 0, landings: [], crows: [], flock: null, harvest: null, end: null };
        var next = record.steps[index++];
        if (!next) throw new Error("Judgment replay exhausted");
        Object.keys(state).forEach(function (key) { delete state[key]; });
        Object.assign(state, copy(next.state));
        return copy(next.event);
      },
      multiplier: helpers.multiplier, baseMultiplier: helpers.baseMultiplier,
      nextRung: helpers.nextRung, boardSum: helpers.boardSum
    };
  }
  var api = { create: create, replay: replay };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.OssuaryElJuicioEngine = api;
})();
