(function () {
  "use strict";
  // Seleccion editorial del laboratorio. Mantiene intactos los sonidos
  // originales y las reglas de Claude; solo cambia los emparejamientos
  // enumerados aqui. El resto de la biblioteca sigue siendo de escucha.
  var sounds = window.OSSUARY_AUDIO_SOUNDS || [];
  var rules = window.OSSUARY_AUDIO_RULES || [];
  function sound(id, settings) {
    var def = sounds.find(function (s) { return s.id === id; });
    if (!def) throw new Error("Audio integrado ausente: " + id);
    Object.assign(def, { preload: true }, settings);
  }
  function replace(event, oldId, newId, params) {
    var rule = rules.find(function (r) { return r.event === event && r.play === oldId; });
    if (!rule) throw new Error("Regla de audio ausente: " + event + "/" + oldId);
    rule.play = newId;
    if (params) rule.params = params;
  }
  function remove(event, id) {
    for (var i = rules.length - 1; i >= 0; i--) {
      if (rules[i].event === event && rules[i].play === id) rules.splice(i, 1);
    }
  }
  function add(event, id, params) { rules.push({ event: event, play: id, params: params }); }

  // Iguala el nivel medio de los cuatro modos cerca de -20 LUFS efectivos
  // (2026-10-24, Claude: a -28 dBFS la musica quedaba ~6 dB por debajo de la
  // referencia con la que se ajustaron rodillos y golpes, y estos tapaban todo).
  // Las piezas nuevas son bucles OGG/Opus (con copia .m4a para Safari).
  // stopGroup("music") las reconoce.
  sound("lib-music-crypt-theme-var", { category: "music", bus: "MUSIC", volume: 1.45, pool: 1, fade: { inMs: 1100, outMs: 950 }, fallbackFile: "assets/audio/library/music/music-crypt-theme-var.m4a" });
  // Execution: vals de la guillotina (base) y seis capas del mismo bucle que
  // entran al subir la cuchilla (adaptive-music-controller.js). Mas bajos que
  // los otros modos: de fondo, bajo los golpes del bonus. El ritual queda en
  // la biblioteca para comparar.
  sound("lib-music-exec-waltz", { category: "music", bus: "MUSIC", volume: 1.1, pool: 1, fade: { inMs: 900, outMs: 900 }, fallbackFile: "assets/audio/library/music/music-exec-waltz.m4a" });
  [1, 2, 3, 4, 5, 6, 7].forEach(function (n) {
    sound("lib-music-exec-waltz-l" + n, { category: "music", bus: "MUSIC", volume: 1, pool: 1, priority: 46 - n, preload: "idle", fade: { inMs: 250, outMs: 900 }, fallbackFile: "assets/audio/library/music/music-exec-waltz-l" + n + ".m4a" });
  });
  sound("lib-music-execution-ritual", { category: "music", bus: "MUSIC", volume: 1.3, pool: 1, preload: false, fade: { inMs: 900, outMs: 900 }, fallbackFile: "assets/audio/library/music/music-execution-ritual.m4a" });
  sound("lib-music-lullaby-eerie", { category: "music", bus: "MUSIC", volume: 1.25, pool: 1, fade: { inMs: 1200, outMs: 1000 }, fallbackFile: "assets/audio/library/music/music-lullaby-eerie.m4a" });
  ["music-normal", "music-bonus"].forEach(function (id) {
    sounds.find(function (s) { return s.id === id; }).preload = false;
  }); // los WAV originales permanecen disponibles para comparar
  sound("music-ruleta", { volume: 0.67, preload: "idle" }); // conserva el pulso original de la rueda

  // Golpes secos de materiales distintos; una sola capa principal por evento.
  sound("lib-execution-entry", { bus: "BONUS", volume: 0.42, pool: 1, cooldown: 500 });
  sound("lib-blade-cut-metal", { bus: "BONUS", volume: 0.5, pool: 2, cooldown: 120 });
  sound("lib-chain-pull", { bus: "BONUS", volume: 0.35, pool: 1, cooldown: 180 });
  sound("lib-sting-near-miss", { bus: "BONUS", volume: 0.34, pool: 1, cooldown: 900 });
  sound("lib-juicio-seal", { bus: "BONUS", volume: 0.43, pool: 1, cooldown: 280 });
  sound("lib-juicio-entry", { bus: "BONUS", volume: 0.47, pool: 1, cooldown: 700 });
  sound("lib-raven-wing", { bus: "SYMBOLS", volume: 0.42, pool: 1, cooldown: 300 });
  sound("lib-chest-unlock", { bus: "SYMBOLS", volume: 0.45, pool: 1, cooldown: 350 });
  sound("lib-roulette-tick", { bus: "SYMBOLS", volume: 0.3, pool: 2, cooldown: 65 });
  sound("lib-roulette-stop", { bus: "SYMBOLS", volume: 0.48, pool: 1, cooldown: 250 });
  sound("lib-coin-small", { bus: "SYMBOLS", volume: 0.28, pool: 1, cooldown: 250 });
  sound("lib-coin-big", { bus: "SYMBOLS", volume: 0.38, pool: 1, cooldown: 300 });
  sound("lib-sting-win-big", { bus: "BONUS", volume: 0.36, pool: 1, cooldown: 800 });
  sound("lib-sting-bonus-trigger", { bus: "BONUS", volume: 0.38, pool: 1, cooldown: 800 });
  sound("lib-sting-win-epic", { bus: "BONUS", volume: 0.33, pool: 1, cooldown: 1000 });
  sound("lib-bonus-exit", { bus: "BONUS", volume: 0.32, pool: 1, cooldown: 700 });
  sound("lib-candle-relight", { bus: "BONUS", volume: 1.8, pool: 3, cooldown: 0 }); // las tres salen a la vez, con delay

  replace("bonus_intro_poster_land", "bonus-symbol-impact", "lib-execution-entry", { volume: 0.42, priority: 86 });
  remove("bonus_intro_poster_land", "crow-stone-hit");
  replace("bonus_chain_near_miss", "bonus-symbol-impact", "lib-sting-near-miss", { volume: 0.34, priority: 77 });
  replace("guillotine_impact", "bonus-symbol-impact", "lib-blade-cut-metal", function (p) {
    return { volume: 0.38 + 0.16 * (p.strength || 0.6), priority: 82 };
  });
  remove("guillotine_impact", "crow-stone-hit");
  replace("guillotine_snag", "reel-stop", "lib-chain-pull", { volume: 0.3, priority: 78 });
  remove("guillotine_snag", "crow-stone-hit");
  replace("exec_blood_mark_land", "bonus-symbol-impact", "lib-juicio-seal", { volume: 0.44, priority: 88 });
  remove("exec_blood_mark_land", "crow-stone-hit");
  replace("el_juicio_blight_stamp", "reel-stop", "lib-juicio-seal", { volume: 0.46, priority: 85 });
  remove("el_juicio_blight_stamp", "crow-stone-hit");
  replace("el_juicio_super_slam", "el-juicio-death-crash", "lib-juicio-entry", { volume: 0.47, priority: 94 });
  remove("el_juicio_super_slam", "bonus-multiplier-levelup");
  remove("el_juicio_super_slam", "bell-bowl-trio");
  replace("raven_crows_fly_away", "crow-perch", "lib-raven-wing", { volume: 0.42, priority: 76 });

  // Cofre-ruleta: mecanismo, tics discretos y un remate por resultado.
  replace("ruleta_charge", "reel-mechanism-start", "lib-chest-unlock", { volume: 0.42, priority: 70 });
  remove("ruleta_charge", "chest-rattle");
  replace("ruleta_clack", "reel-stop", "lib-roulette-tick", { volume: 0.28, priority: 70 });
  remove("ruleta_clack", "crow-stone-hit");
  replace("ruleta_stop", "bonus-symbol-impact", "lib-roulette-stop", { volume: 0.47, priority: 80 });
  remove("ruleta_stop", "crow-stone-hit");
  replace("ruleta_prize_small", "win-hit", "lib-coin-small", { volume: 0.26, priority: 80 });
  remove("ruleta_prize_small", "crow-stone-hit");
  replace("ruleta_prize_mid", "win-hit", "lib-coin-big", { volume: 0.38, priority: 84 });
  remove("ruleta_prize_mid", "crow-stone-hit");
  remove("ruleta_prize_mid", "bonus-multiplier-levelup");
  replace("ruleta_prize_big", "bonus-symbol-impact", "lib-sting-win-big", { volume: 0.36, priority: 90 });
  ["crow-stone-hit", "bonus-multiplier-levelup", "win-hit"].forEach(function (id) { remove("ruleta_prize_big", id); });
  replace("ruleta_prize_bonus", "bonus-symbol-impact", "lib-sting-bonus-trigger", { volume: 0.38, priority: 88 });
  ["crow-stone-hit", "bonus-multiplier-stick-blade"].forEach(function (id) { remove("ruleta_prize_bonus", id); });
  replace("ruleta_prize_super", "bonus-symbol-impact", "lib-sting-win-epic", { volume: 0.33, priority: 92 });
  ["crow-stone-hit", "bonus-multiplier-levelup"].forEach(function (id) { remove("ruleta_prize_super", id); });
  add("bonus_completed", "lib-bonus-exit", { volume: 0.3, priority: 70 });

  // Velas que vuelven (la guillotina repone a 3, a veces desde 0, y el Ultimo
  // Aliento): una llamarada por vela, escalonadas. El primer encendido de
  // cada bonus se queda con la cerilla sola. Las reglas sin "play" solo
  // apuntan en que bonus estamos.
  var candlesLit = false, candleRestore = false;
  ["bonus_started", "bonus_completed"].forEach(function (event) {
    rules.push({ event: event, when: function () { candlesLit = false; return false; } });
  });
  [0, 1, 2].forEach(function (k) {
    rules.push({
      event: "bonus_candle_light", play: "lib-candle-relight",
      when: function (p) {
        if (k === 0) { candleRestore = candlesLit; candlesLit = true; }
        return candleRestore && ((p && p.addedCandles) || 1) > k;
      },
      params: { delay: k * 170, pitch: [1, 0.94, 1.05][k], volume: 1.8 * [1, 0.8, 0.7][k], priority: 84 }
    });
  });
})();
