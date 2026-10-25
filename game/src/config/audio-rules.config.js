(function () {
  "use strict";

  window.OSSUARY_AUDIO_RULES = [
    { event: "button_click", play: "ui-button-click" },
    // Boton CONTINUAR de la entrada de las free spins: golpe de hierro al estallar.
    { event: "bonus_intro_start_pressed", play: "bonus-multiplier-stick-blade", params: { pitch: 0.82, volume: 1, priority: 80 } },
    // Cartel de la entrada (src/fx/bonus-poster.js#drop): golpe seco al caer.
    { event: "bonus_intro_poster_land", play: "bonus-symbol-impact", params: { pitch: 0.6, volume: 0.95, priority: 86 } },
    { event: "bonus_intro_poster_land", play: "crow-stone-hit", params: { pitch: 0.52, volume: 0.8, priority: 86 } },
    // SPIN o compra sin saldo suficiente (src/ui/controls.js).
    { event: "button_error", play: "ui-button-error" },

    { event: "spin_started", play: "reel-spin-start" },
    { event: "reel_started", play: "reel-mechanism-start" },
    { event: "reel_stopped", play: "reel-stop" },
    { event: "spin_finished", stop: "reel-spin-start" },
    { event: "bonus_reels_spin_started", play: "reel-spin-start" },
    { event: "bonus_reels_mechanism_started", play: "reel-mechanism-start" },
    { event: "bonus_reel_stopped", play: "reel-stop" },
    { event: "bonus_reels_spin_finished", stop: "reel-spin-start" },
    { event: "bonus_mode_spin_silence", stop: "reel-spin-start" },
    { event: "bonus_mode_spin_silence", stop: "reel-mechanism-start" },
    { event: "bonus_mode_spin_silence", stop: "rib1-bonus-respin-loop" },
    { event: "bonus_mode_spin_silence", stop: "small-blade-tremble" },
    { event: "bonus_mode_spin_silence", stop: "small-blade-fall" },

    { event: "bonus_symbol_landed_rib23", play: "bonus-symbol-impact" },
    // Cadena completa (src/fx/bonus-entry-hit.js): golpe grave de hierro y piedra.
    { event: "bonus_entry_hit", play: "bonus-symbol-impact", params: { pitch: 0.62, volume: 1, priority: 90 } },
    { event: "bonus_entry_hit", play: "crow-stone-hit", params: { pitch: 0.55, volume: 0.9, priority: 90 } },
    { event: "small_blade_tremble_started", play: "small-blade-tremble" },
    { event: "small_blade_tremble_stopped", stop: "small-blade-tremble", fadeMs: 45 },
    { event: "small_blade_fall_started", play: "small-blade-fall" },
    { event: "small_blade_fall_stopped", stop: "small-blade-fall", fadeMs: 55 },
    { event: "rib1_blade_fall", play: "rib1-blade-fall" },
    { event: "rib1_bonus_respin_started", play: "rib1-bonus-respin-loop" },
    { event: "bonus_hand_cut", play: "bonus-hand-cut" },
    { event: "guadana_neck_line_started", play: "guadana-neck-line" },
    { event: "guadana_neck_line_stopped", stop: "guadana-neck-line", fadeMs: 30 },
    { event: "guadana_neck_cut", play: "guadana-neck-cut" },
    { event: "bonus_sternum_blade_triggered", play: "bonus-rope-pull" },
    { event: "bonus_candle_light", play: "bonus-candle-light" },
    { event: "bonus_multiplier_levelup", play: "bonus-multiplier-levelup" },
    { event: "bonus_multiplier_stuck_blade", play: "bonus-multiplier-stick-blade" },
    { event: "bonus_mode_started", play: "rib1-blade-fall" },
    { event: "bonus_mode_started", play: "rib1-bonus-respin-loop" },
    { event: "bonus_mode_completed", stop: "rib1-bonus-respin-loop", fadeMs: 160 },
    { event: "bonus_completed", stop: "rib1-bonus-respin-loop", fadeMs: 160 },
    { event: "bonus_failed", stop: "rib1-bonus-respin-loop", fadeMs: 160 },

    { event: "crow_stone_hit", play: "crow-stone-hit" },
    { event: "crow_perch", play: "crow-perch" },
    { event: "payline_shown", play: "payline-win" },
    // Escalera de las lineas de pago (game.js#planWinningPaylineLadder): un golpe
    // seco por linea, cada uno mas alto. Sube 3/4 de la nota de la escala (un
    // golpe subido dos octavas ya no suena a golpe; misma cuenta en
    // tools/bake-win-notes.js). `accent`: la ultima de la escalera, mas fuerte.
    { event: "payline_note", play: "win-hit", params: function (p) { return { pitch: Math.pow(p.pitch || 1, 0.75), volume: 0.36 * (p.accent ? 1.3 : 1), priority: 62 }; } },
    // Cofre del Ruleta Game (src/fx/chest-tension.js): meneo cuando esta casi
    // lleno o lleno, aviso ALMOST FULL y golpe de CHEST FULL.
    { event: "chest_rattle", play: "chest-rattle" },
    { event: "chest_almost_full", play: "chest-rattle", params: { pitch: 0.8, volume: 0.7, priority: 70 } },
    { event: "chest_almost_full", play: "bonus-multiplier-levelup", params: { pitch: 0.85, volume: 0.55, priority: 70 } },
    { event: "chest_full", play: "bonus-symbol-impact", params: { pitch: 0.82, volume: 0.85, priority: 78 } },
    { event: "chest_full", play: "bonus-multiplier-levelup", params: { pitch: 1.05, volume: 0.8, priority: 78 } },
    // Lleno, un premio que no basta: amaga con abrirse (golpe de madera y hierro).
    { event: "chest_tease", play: "chest-rattle", params: { pitch: 0.66, volume: 0.8, priority: 72, maxDurationMs: 700 } },
    { event: "chest_tease", play: "bonus-symbol-impact", params: { pitch: 0.7, volume: 0.6, priority: 72 } },
    // Ruleta del cofre (src/ruleta/ruleta-game.js; el tic de cada casilla con
    // la rueda rapida va directo con reel-stop): la carga (cuerda que se tensa
    // y mecanismo), la suelta, latidos mientras frena y cae la oscuridad, clac
    // de cada casilla ya despacio, golpe y apagon al parar, la llave que
    // prende, el abismo que aspira y canta, y un golpe por premio.
    { event: "ruleta_charge", play: "bonus-rope-pull", params: { pitch: 0.82, volume: 0.85, priority: 72 } },
    { event: "ruleta_charge", play: "reel-mechanism-start", params: { pitch: 0.6, volume: 0.65, priority: 70 } },
    { event: "ruleta_charge", play: "chest-rattle", params: { pitch: 0.55, volume: 0.5, maxDurationMs: 1400, priority: 70 } },
    { event: "ruleta_release", play: "bonus-symbol-impact", params: { pitch: 0.85, volume: 0.75, priority: 76 } },
    { event: "ruleta_release", play: "bonus-rope-pull", params: { pitch: 1.15, volume: 0.6, priority: 74 } },
    { event: "ruleta_spin_tension", play: "stone-tension", params: { volume: 0.75, priority: 72 } },
    { event: "ruleta_clack", play: "reel-stop", params: { pitch: 0.8, volume: 0.5, maxDurationMs: 90, priority: 70 } },
    { event: "ruleta_clack", play: "crow-stone-hit", params: { pitch: 1.35, volume: 0.22, priority: 68 } },
    { event: "ruleta_stop", stop: "stone-tension", fadeMs: 160 },
    { event: "ruleta_stop", play: "bonus-symbol-impact", params: { pitch: 0.8, volume: 0.85, priority: 80 } },
    { event: "ruleta_stop", play: "crow-stone-hit", params: { pitch: 0.7, volume: 0.6, priority: 80 } },
    { event: "ruleta_lights_out", play: "bonus-symbol-impact", params: { pitch: 0.66, volume: 0.45, priority: 74 } },
    { event: "ruleta_key_lit", play: "bonus-candle-light", params: { volume: 0.75, priority: 74 } },
    { event: "ruleta_inhale", play: "chest-rattle", params: { pitch: 0.48, volume: 0.75, maxDurationMs: 1000, priority: 80 } },
    { event: "ruleta_inhale", play: "reel-mechanism-start", params: { pitch: 0.55, volume: 0.6, priority: 78 } },
    { event: "ruleta_key_die", play: "bonus-candle-light", params: { pitch: 0.55, volume: 0.35, priority: 70 } },
    { event: "ruleta_prize_none", play: "crow-stone-hit", params: { pitch: 0.45, volume: 0.45, priority: 72 } },
    { event: "ruleta_prize_swallowed", play: "bonus-symbol-impact", params: { pitch: 0.45, volume: 0.5, priority: 72 } },
    { event: "ruleta_prize_small", play: "win-hit", params: { pitch: 0.75, volume: 0.8, priority: 80 } },
    { event: "ruleta_prize_small", play: "crow-stone-hit", params: { pitch: 0.72, volume: 0.5, priority: 80 } },
    { event: "ruleta_prize_mid", play: "win-hit", params: { pitch: 0.9, volume: 1, priority: 84 } },
    { event: "ruleta_prize_mid", play: "crow-stone-hit", params: { pitch: 0.6, volume: 0.85, priority: 84 } },
    { event: "ruleta_prize_mid", play: "bonus-multiplier-levelup", params: { pitch: 1, volume: 0.6, priority: 84 } },
    { event: "ruleta_prize_big", play: "bonus-symbol-impact", params: { pitch: 0.55, volume: 1, priority: 90 } },
    { event: "ruleta_prize_big", play: "crow-stone-hit", params: { pitch: 0.5, volume: 1, priority: 90 } },
    { event: "ruleta_prize_big", play: "bonus-multiplier-levelup", params: { pitch: 1.1, volume: 1, priority: 90 } },
    { event: "ruleta_prize_big", play: "win-hit", params: { pitch: 0.7, volume: 1, priority: 90 } },
    { event: "ruleta_prize_bonus", play: "bonus-symbol-impact", params: { pitch: 0.62, volume: 1, priority: 88 } },
    { event: "ruleta_prize_bonus", play: "crow-stone-hit", params: { pitch: 0.55, volume: 0.9, priority: 88 } },
    { event: "ruleta_prize_bonus", play: "bonus-multiplier-stick-blade", params: { pitch: 0.7, volume: 0.8, priority: 88 } },
    { event: "ruleta_prize_super", play: "bonus-symbol-impact", params: { pitch: 0.5, volume: 1, priority: 92 } },
    { event: "ruleta_prize_super", play: "crow-stone-hit", params: { pitch: 0.42, volume: 1, priority: 92 } },
    { event: "ruleta_prize_super", play: "bonus-multiplier-levelup", params: { pitch: 0.9, volume: 1, priority: 92 } },
    // Relampagos del BONUS y el SUPER BONUS: trueno grave de piedra.
    { event: "ruleta_lightning", play: "crow-stone-hit", params: { pitch: 0.38, volume: 0.9, priority: 86 } },
    { event: "big_win_counter_counting_started", play: "big-win-counter-loop" },
    { event: "big_win_counter_counting_stopped", stop: "big-win-counter-loop", fadeMs: 0 },
    { event: "big_win_counter_pause", play: "big-win-counter-pause" },
    { event: "big_win_counter_beat", play: "big-win-counter-pause" },
    { event: "big_win_counter_completed", play: "big-win-counter-pause" },
    { event: "big_win_counter_epic_started", play: "big-win-counter-epic" },
    // Graznidos de cuervo del contador BIG WIN (dark fantasy, 2026-10-06): al
    // entrar la musica (con los cuervos que cruzan) y cuando el cuervo se posa
    // sobre el numero final. Mas graves y lentos que el original (pitch < 1) y
    // sin su silencio inicial (offsetMs 230).
    { event: "big_win_counter_epic_started", play: "crow-perch", params: { pitch: 0.84, offsetMs: 230, volume: 1, priority: 80 } },
    { event: "big_win_counter_crow_perched", play: "crow-perch", params: { pitch: 0.8, offsetMs: 230, volume: 1, priority: 80 } },
    // Ganancia maxima: el cuervo muerto grande golpea el suelo bajo las cifras.
    { event: "big_win_counter_dead_crow_landed", play: "crow-stone-hit", params: { pitch: 0.78, volume: 1, priority: 82 } },
    // ...y "MAX WIN" se escribe con sangre en el cartel (trazo de las lineas de pago).
    { event: "big_win_counter_max_win_written", play: "payline-win", params: { pitch: 0.85, volume: 1.2, priority: 82 } },
    { event: "big_win_counter_hidden", stop: "big-win-counter-loop", fadeMs: 0 },
    { event: "big_win_counter_hidden", stop: "big-win-counter-epic", fadeMs: 180 },

    // Cuervo dorado (game.js): para un rodillo con un cuervo dorado (subida de
    // nivel del bonus). Raven Bonus: la piedra gana otra tirada (la cerilla de las
    // oportunidades del bonus + un graznido grave).
    { event: "golden_crow_landed", play: "bonus-multiplier-levelup", params: { volume: 1, priority: 80 } },
    { event: "golden_crow_perched", play: "bonus-multiplier-levelup", params: { pitch: 1.15, volume: 1, priority: 82 } },
    { event: "golden_crow_cut", play: "golden-crow-cut", params: { volume: 0.62, priority: 88 } },
    { event: "raven_free_spin", play: "bonus-candle-light", params: { volume: 0.9, priority: 78 } },
    { event: "raven_free_spin", play: "crow-perch", params: { pitch: 0.86, offsetMs: 230, volume: 0.9, priority: 78 } },
    // Cartel RAVEN Spins (src/ui/raven-banner.js): golpe seco al caer.
    { event: "raven_spins_poster_land", play: "bonus-symbol-impact", params: { pitch: 0.68, volume: 0.9, priority: 80 } },
    { event: "raven_spins_poster_land", play: "crow-stone-hit", params: { pitch: 0.6, volume: 0.7, priority: 80 } },
    // Al acabar las mini freespins, los cuervos posados se van volando
    // (game.js#finishRavenChain): aleteo y graznido, uno detras de otro.
    { event: "raven_crows_fly_away", play: "crow-perch", params: { pitch: 1.08, volume: 0.8, priority: 76 } },
    { event: "raven_crows_fly_away", play: "crow-perch", params: function (p) { return { pitch: 0.94, volume: p.count > 1 ? 0.7 : 0.45, priority: 74, delay: 170 }; } },

    // Anticipacion de la cadena del Execution Bonus (game.js): mientras se
    // hacen esperar las mitades que pueden completarla, las cadenas del
    // usuario (2026-10-20: antes latidos y un zumbido que sube, el "silbido"
    // que no le gustaba), que empiezan flojas y crecen.
    { event: "bonus_chain_anticipation", play: "rib1-tease-chains", params: { volume: 0.42, fadeInMs: 120, priority: 77 } },
    { event: "bonus_chain_anticipation_end", stop: "rib1-tease-chains", fadeMs: 160 },
    { event: "bonus_chain_tension_start", play: "rib1-tease-knock", params: { pitch: 0.6, volume: 0.42, priority: 78 } },
    { event: "bonus_chain_tension_start", play: "bonus-chain-bed", params: { fadeInMs: 120, volume: 0.24, priority: 77 } },
    { event: "bonus_chain_tension_start", play: "bonus-chain-riser", params: function (p) { return { offsetMs: Math.max(0, 2020 - (p.remainingMs || 2020)), volume: 0.3, priority: 79 }; } },
    { event: "bonus_chain_tension_build", play: "bonus-chain-roll", params: function (p) { return { offsetMs: Math.max(0, 3020 - (p.remainingMs || 3020)), volume: 0.26, priority: 79 }; } },
    { event: "bonus_chain_tension_beat", play: "rib1-tease-knock", params: function (p) { return { pitch: 0.58, volume: 0.12 + 0.22 * (p.intensity || 0), priority: 76 }; } },
    // Las capas callan un instante antes del resultado; el bucle del bonus se conserva.
    { event: "bonus_chain_tension_quiet", stop: "rib1-tease-chains", fadeMs: 35 },
    { event: "bonus_chain_tension_quiet", stop: "bonus-chain-bed", fadeMs: 35 },
    { event: "bonus_chain_tension_quiet", stop: "bonus-chain-riser", fadeMs: 35 },
    { event: "bonus_chain_tension_quiet", stop: "bonus-chain-roll", fadeMs: 35 },
    { event: "bonus_chain_tension_end", stop: "bonus-chain-bed", fadeMs: 90 },
    { event: "bonus_chain_tension_end", stop: "bonus-chain-riser", fadeMs: 90 },
    { event: "bonus_chain_tension_end", stop: "bonus-chain-roll", fadeMs: 90 },
    // ...y si no completa la cadena: golpe sordo y grave.
    { event: "bonus_chain_near_miss", play: "bonus-symbol-impact", params: { pitch: 0.55, volume: 0.75, priority: 77 } },

    // Amagos de la guillotina de rib1 (src/fx/rib1-tease.js), con los audios
    // del usuario (2026-10-20, tools/bake-rib1-tease-sounds.js). Nada suena
    // hasta que la hoja asoma: entonces la cadena empieza a correr (crece
    // sola) y la hoja rasca el marco; si resbala, roce de ladrillo; si va a
    // entrar, el empujon de piedra llega a su cima en el golpe de madera; si
    // no, todo se corta con un golpe sordo (el bajon).
    { event: "rib1_tease_start", play: "rib1-tease-chains", params: { fadeInMs: 60, priority: 77 } },
    { event: "rib1_tease_start", play: "rib1-tease-scrape", params: { pitch: 1.08, volume: 0.4, maxDurationMs: 600, priority: 76 } },
    { event: "rib1_tease_slip", play: "rib1-tease-scrape", params: { volume: 0.85, priority: 78 } },
    { event: "rib1_tease_push", play: "rib1-tease-push", params: { priority: 78 } },
    { event: "rib1_tease_slam", stop: "rib1-tease-chains", fadeMs: 70 },
    { event: "rib1_tease_slam", stop: "rib1-tease-scrape", fadeMs: 60 },
    { event: "rib1_tease_slam", play: "rib1-tease-hit", params: { pitch: 0.9, volume: 1, priority: 84 } },
    { event: "rib1_tease_slam", play: "bonus-symbol-impact", params: { pitch: 0.7, volume: 0.65, priority: 83 } },
    { event: "rib1_tease_miss", stop: "rib1-tease-chains", fadeMs: 220 },
    { event: "rib1_tease_miss", stop: "rib1-tease-scrape", fadeMs: 140 },
    { event: "rib1_tease_miss", stop: "rib1-tease-push", fadeMs: 120 },
    { event: "rib1_tease_miss", play: "rib1-tease-knock", params: { pitch: 0.78, volume: 0.85, priority: 78 } },
    { event: "rib1_tease_cancel", stop: "rib1-tease-chains", fadeMs: 80 },
    { event: "rib1_tease_cancel", stop: "rib1-tease-scrape", fadeMs: 80 },
    { event: "rib1_tease_cancel", stop: "rib1-tease-push", fadeMs: 80 },

    // Execution Bonus (peticion del usuario, 2026-10-16), todo con sonidos que
    // ya habia. Caidas de la guillotina (src/fx/guillotine-drop.js): el
    // sonido de caida programado para que su golpe coincida con el de la
    // caida, el golpe abajo (mas grave y fuerte cuanto mas pega; con Marca de
    // Sangre, hierro), el atasco (chirrido y madera), el rasqueo mientras
    // esta atascada, los clics del trinquete, la cuerda que se suelta y el
    // golpe seco de cada importe al llegar al WIN.
    { event: "guillotine_fall", play: "rib1-blade-fall", params: function (p) { return { delay: p.delayMs || 0, offsetMs: p.offsetMs || 0, priority: 78 }; } },
    { event: "guillotine_impact", play: "bonus-symbol-impact", params: function (p) { var s = p.strength || 0.6; return { pitch: 0.82 - 0.24 * s, volume: 0.45 + 0.5 * s, priority: 82 }; } },
    { event: "guillotine_impact", play: "crow-stone-hit", params: function (p) { var s = p.strength || 0.6; return { pitch: 0.62 - 0.12 * s, volume: 0.35 + 0.5 * s, priority: 82 }; } },
    { event: "guillotine_impact", play: "bonus-multiplier-stick-blade", params: function (p) { return { pitch: 0.62, volume: p.blood ? 0.85 : 0, priority: 82 }; } },
    { event: "guillotine_snag", play: "reel-stop", params: { pitch: 0.45, volume: 0.9, maxDurationMs: 220, priority: 78 } },
    { event: "guillotine_snag", play: "crow-stone-hit", params: { pitch: 0.92, volume: 0.55, priority: 78 } },
    { event: "guillotine_snag", play: "chest-rattle", params: { pitch: 0.7, volume: 0.6, maxDurationMs: 520, priority: 76 } },
    { event: "guillotine_grind_start", play: "guillotine-grind" },
    { event: "guillotine_grind_stop", stop: "guillotine-grind", fadeMs: 80 },
    { event: "guillotine_snap", play: "bonus-rope-pull", params: { pitch: 1.5, volume: 0.85, maxDurationMs: 380, priority: 78 } },
    { event: "guillotine_snap", play: "reel-stop", params: { pitch: 1.2, volume: 0.6, maxDurationMs: 120, priority: 76 } },
    { event: "guillotine_release", play: "bonus-rope-pull", params: { pitch: 1.3, volume: 0.6, maxDurationMs: 300, priority: 76 } },
    { event: "guillotine_prize_landed", play: "win-hit", params: { pitch: 1, volume: 0.42, priority: 64 } },
    // Ejecucion de golpe (6 esqueletos o mas): la carga (latidos, cuerda que
    // se tensa y madera que cruje) y el total grande del corte en el centro.
    { event: "guillotine_charge", play: "stone-tension", params: { volume: 0.95, priority: 82 } },
    { event: "guillotine_charge", play: "bonus-rope-pull", params: { pitch: 0.7, volume: 0.8, maxDurationMs: 1300, priority: 80 } },
    { event: "guillotine_charge", play: "chest-rattle", params: { pitch: 0.5, volume: 0.7, maxDurationMs: 1300, priority: 78 } },
    // ...con una subida que llega a su cima en el golpe (carga 1.34 s + caida
    // 0.2 s; cima de la subida a 2.85 s) y se corta al pegar.
    { event: "guillotine_charge", play: "tension-riser-short", params: { offsetMs: 1310, fadeInMs: 80, volume: 0.5, priority: 80 } },
    { event: "guillotine_impact", stop: "tension-riser-short", fadeMs: 100 },
    { event: "guillotine_total", play: "win-hit", params: { pitch: 0.75, volume: 0.9, priority: 84 } },
    { event: "guillotine_total", play: "bonus-multiplier-levelup", params: { pitch: 1.1, volume: 0.6, priority: 82 } },
    // Marca de Sangre (src/fx/execution-tension.js): la hoja sangra (latidos y
    // trueno de piedra), cada cifra que rueda un clac seco, y al clavarse un
    // golpe grave con el sonido de subir de nivel.
    { event: "exec_blood_mark_start", play: "stone-tension", params: { volume: 0.85, priority: 80 } },
    { event: "exec_blood_mark_start", play: "crow-stone-hit", params: { pitch: 0.42, volume: 0.7, priority: 80 } },
    // El esqueleto que la lleva lanza la sangre (soplo grave) y salpica la
    // hoja (tajo humedo y golpe de piedra).
    { event: "exec_blood_mark_throw", play: "el-juicio-whoosh", params: { pitch: 0.72, volume: 0.65, priority: 78 } },
    { event: "exec_blood_mark_splash", play: "guadana-neck-cut", params: { pitch: 0.7, volume: 0.8, priority: 84 } },
    { event: "exec_blood_mark_splash", play: "crow-stone-hit", params: { pitch: 0.55, volume: 0.6, priority: 82 } },
    { event: "exec_blood_mark_tick", play: "reel-stop", params: function (p) { return { pitch: 0.95 - 0.25 * ((p.step || 0) / Math.max(1, p.total || 1)), volume: 0.5, maxDurationMs: 90, priority: 74 }; } },
    { event: "exec_blood_mark_land", play: "bonus-symbol-impact", params: { pitch: 0.58, volume: 1, priority: 88 } },
    { event: "exec_blood_mark_land", play: "crow-stone-hit", params: { pitch: 0.5, volume: 0.9, priority: 88 } },
    { event: "exec_blood_mark_land", play: "bonus-multiplier-levelup", params: { pitch: 0.92, volume: 0.75, priority: 86 } },
    // Ultima vela en juego: latidos mientras gira el esternon; si falla,
    // golpe sordo.
    { event: "exec_last_chance", play: "stone-tension", params: { volume: 0.9, priority: 80 } },
    // Debajo, un fondo de tension que se sostiene hasta saberse.
    { event: "exec_last_chance", play: "tension-drone-rites", params: { fadeInMs: 300, volume: 0.5, priority: 80 } },
    { event: "exec_last_chance_end", stop: "stone-tension", fadeMs: 140 },
    { event: "exec_last_chance_end", stop: "tension-drone-rites", fadeMs: 450 },
    { event: "exec_last_chance_end", play: "bonus-symbol-impact", params: function (p) { return { pitch: 0.5, volume: p.result === "miss" ? 0.6 : 0, priority: 78 }; } },
    // Ultimo Aliento: latidos en la oscuridad, rasguenos de cerilla en el
    // pabilo y o prende de golpe o se apaga del todo.
    { event: "exec_last_breath_start", play: "stone-tension", params: { volume: 1, priority: 84 } },
    { event: "exec_last_breath_start", play: "tension-drone-breath", params: { fadeInMs: 600, volume: 0.58, priority: 82 } },
    { event: "exec_last_breath_saved", stop: "tension-drone-breath", fadeMs: 300 },
    { event: "exec_last_breath_lost", stop: "tension-drone-breath", fadeMs: 1400 },
    { event: "exec_last_breath_spark", play: "bonus-candle-light", params: function (p) { return { pitch: 1.5 + 0.1 * (p.step || 0), volume: 0.28, maxDurationMs: 260, priority: 78 }; } },
    { event: "exec_last_breath_saved", play: "bonus-symbol-impact", params: { pitch: 0.7, volume: 0.85, priority: 88 } },
    { event: "exec_last_breath_saved", play: "bonus-multiplier-levelup", params: { pitch: 1, volume: 0.7, priority: 86 } },
    { event: "exec_last_breath_lost", play: "bonus-symbol-impact", params: { pitch: 0.45, volume: 0.75, priority: 84 } },
    { event: "exec_last_breath_lost", play: "crow-stone-hit", params: { pitch: 0.42, volume: 0.6, priority: 84 } },

    // SUPER BONUS "El Juicio" (src/fx/el-juicio.js). Golpes secos del juego, la
    // campanada apagada (tools/bake-el-juicio-sounds.js) y, desde el
    // 2026-10-19, la galeria del usuario: cuencos que resuenan en las
    // campanadas, graznidos en el nido y tension que se corta al resolverse.
    { event: "el_juicio_tease", play: "stone-tension", params: { volume: 0.95, priority: 84 } },
    // Mientras el encapuchado se zarandea, una oleada que crece (su cima, a
    // 2.3 s, cae cuando se lo llevan); si solo amaga, se apaga.
    { event: "el_juicio_tease", play: "tension-swell-tease", params: { volume: 0.6, priority: 84 } },
    { event: "el_juicio_tease_miss", stop: "stone-tension", fadeMs: 160 },
    { event: "el_juicio_tease_miss", stop: "tension-swell-tease", fadeMs: 350 },
    { event: "el_juicio_hood_release", stop: "tension-swell-tease", fadeMs: 200 },
    { event: "el_juicio_tease_miss", play: "crow-stone-hit", params: { pitch: 0.5, volume: 0.5, priority: 80 } },
    { event: "el_juicio_hood_release", stop: "stone-tension", fadeMs: 90 },
    { event: "el_juicio_hood_release", play: "rib1-blade-fall", params: { pitch: 0.82, volume: 0.9, priority: 88 } },
    // Se alza y aprieta la madera; se lo llevan rascando la viga; la Muerte
    // cae por el esternon con el aire.
    { event: "el_juicio_hood_grip", play: "crow-stone-hit", params: { pitch: 0.7, volume: 0.5, priority: 84 } },
    { event: "el_juicio_hood_scrape", play: "el-juicio-scrape", params: { volume: 0.85, priority: 88 } },
    { event: "el_juicio_death_drop", play: "el-juicio-whoosh", params: { pitch: 0.5, volume: 1, priority: 90 } },
    // Caida (src/fx/el-juicio-fall.js): golpe sordo al hundirse detras de la
    // viga, retumbo mientras el esternon se apaga y estruendo al caer la
    // Muerte en el rodillo (con la campanada grave del Juicio).
    { event: "el_juicio_hood_behind", play: "crow-stone-hit", params: { pitch: 0.42, volume: 0.55, priority: 86 } },
    { event: "el_juicio_hood_behind", play: "bonus-symbol-impact", params: { pitch: 0.45, volume: 0.4, priority: 84 } },
    { event: "el_juicio_death_rumble", play: "el-juicio-death-rumble", params: { volume: 1, priority: 90 } },
    { event: "el_juicio_death_land", stop: "el-juicio-death-rumble", fadeMs: 30 },
    { event: "el_juicio_death_land", play: "el-juicio-death-crash", params: { volume: 1, priority: 96 } },
    { event: "el_juicio_death_land", play: "el-juicio-bell", params: { pitch: 0.5, volume: 0.85, priority: 92 } },
    // ...que resuena hondo (cuenco grave en Sol, 6 s) y los cuervos huyen.
    { event: "el_juicio_death_land", play: "bell-bowl-low", params: { pitch: 0.375, volume: 0.75, maxDurationMs: 5200, priority: 90 } },
    { event: "el_juicio_death_land", play: "crow-echo-2", params: { pitch: 0.8, volume: 0.5, delay: 550, priority: 80 } },
    // Mientras se queda ahi con el humo subiendo, la maquina sigue retumbando
    // (mas grave); lo corta el SUPER BONUS.
    { event: "el_juicio_death_smoke", play: "el-juicio-quake", params: { pitch: 0.62, volume: 0.75, priority: 88 } },
    // DEATH TOLLS 13 BELLS: campanada con los tres cuencos debajo y un cuervo
    // que contesta a lo lejos.
    { event: "el_juicio_intro", play: "el-juicio-bell", params: { pitch: 0.8, volume: 0.95, priority: 86 } },
    { event: "el_juicio_intro", play: "bell-bowl-trio", params: { pitch: 0.5, volume: 0.5, maxDurationMs: 5000, priority: 84 } },
    { event: "el_juicio_intro", play: "crow-echo-2", params: { pitch: 0.82, volume: 0.45, delay: 700, priority: 78 } },
    // Cada campanada: el golpe de hierro apagado y el cuenco que resuena en su
    // misma nota (Sol); la ultima (a vida o muerte), mas grave y mas larga.
    { event: "el_juicio_bell", play: "el-juicio-bell", params: function (p) { return p.last ? { pitch: 0.72, volume: 1, priority: 86 } : { pitch: 1, volume: 0.7, priority: 80 }; } },
    { event: "el_juicio_bell", play: "bell-bowl-mid", params: function (p) { return p.last ? { pitch: 0.36, volume: 0.75, maxDurationMs: 5200, priority: 84 } : { pitch: 0.5, volume: 0.55, maxDurationMs: 3000, priority: 76 }; } },
    { event: "el_juicio_bell_gained", play: "el-juicio-bell", params: { pitch: 1.3, volume: 0.5, priority: 80 } },
    { event: "el_juicio_bell_gained", play: "bell-bowl-mid", params: { pitch: 0.65, volume: 0.32, maxDurationMs: 2400, priority: 76 } },
    { event: "el_juicio_spin_start", play: "reel-mechanism-start", params: { volume: 0.7, priority: 70 } },
    { event: "el_juicio_spin_start", play: "reel-spin-start" },
    { event: "el_juicio_spin_end", stop: "reel-spin-start" },
    { event: "el_juicio_nest_spin_started", stop: "reel-spin-start", fadeMs: 120 },
    { event: "el_juicio_nest_spin_started", play: "judgment-nest-start", params: { priority: 75 } },
    { event: "el_juicio_nest_spin_started", play: "judgment-nest-loop", params: { fadeInMs: 180, priority: 64 } },
    { event: "el_juicio_spin_end", stop: "judgment-nest-loop", fadeMs: 180 },
    { event: "el_juicio_closed", stop: "judgment-nest-loop", fadeMs: 180 },
    { event: "el_juicio_bell", when: function (p) { return p.last; }, play: "judgment-final-hit", params: { volume: 0.58, priority: 92 } },
    // El esternon sigue girando a oscuras desde la tirada que completa la
    // cadena (src/fx/el-juicio-fall.js#beginDark): la maquina retumba, latidos.
    // Se corta al saberse: si no cae ("ah... nada", con un soplo que se va) o
    // cuando se lo llevan (lo sigue el retumbo de la caida).
    { event: "el_juicio_dark", play: "el-juicio-quake", params: { volume: 0.9, priority: 86 } },
    // ...y un fondo de tension que entra de golpe y se sostiene hasta saberse.
    { event: "el_juicio_dark", play: "tension-drone-dark", params: { fadeInMs: 400, volume: 0.6, priority: 84 } },
    { event: "el_juicio_tease_miss", stop: "tension-drone-dark", fadeMs: 600 },
    { event: "el_juicio_hood_release", stop: "tension-drone-dark", fadeMs: 400 },
    { event: "el_juicio_sternum_slam", stop: "tension-drone-dark", fadeMs: 300 },
    { event: "el_juicio_dark_beat", play: "stone-tension", params: { volume: 0.8, priority: 80 } },
    { event: "el_juicio_tease_miss", stop: "el-juicio-quake", fadeMs: 160 },
    { event: "el_juicio_tease_miss", play: "el-juicio-whoosh", params: { pitch: 0.42, volume: 0.6, priority: 80 } },
    { event: "el_juicio_hood_release", stop: "el-juicio-quake", fadeMs: 220 },
    // Cada vez que el encapuchado vuelve a golpear la viga (amago violento).
    { event: "el_juicio_hood_thud", play: "crow-stone-hit", params: function (p) { return { pitch: 0.5 + 0.04 * (p.step || 0), volume: 0.6, priority: 82 }; } },
    // SUPER BONUS! (el titulo cae sobre la pantalla).
    { event: "el_juicio_super_slam", stop: "el-juicio-quake", fadeMs: 500 },
    { event: "el_juicio_super_slam", play: "el-juicio-death-crash", params: { pitch: 1.25, volume: 0.8, priority: 94 } },
    { event: "el_juicio_super_slam", play: "el-juicio-bell", params: { pitch: 0.75, volume: 1, priority: 92 } },
    { event: "el_juicio_super_slam", play: "bonus-multiplier-levelup", params: { pitch: 0.85, volume: 1, priority: 92 } },
    { event: "el_juicio_super_slam", play: "bell-bowl-trio", params: { pitch: 0.5, volume: 0.6, maxDurationMs: 5000, priority: 90 } },
    { event: "el_juicio_super_slam", stop: "tension-drone-dark", fadeMs: 600 },
    { event: "el_juicio_cepo_stop", when: function (p) { return !p.emptyAppearance; }, play: "reel-stop", params: { volume: 0.32, priority: 60 } },
    { event: "el_juicio_empty_appearance", play: "judgment-empty-appearance", params: { volume: 0.48, priority: 76 } },
    // Sin Super el esternon para en seco: sus simbolos caen y se clavan.
    { event: "el_juicio_sternum_slam", play: "reel-stop", params: { pitch: 0.78, volume: 0.9, priority: 84 } },
    { event: "el_juicio_sternum_slam", play: "crow-stone-hit", params: { pitch: 0.46, volume: 0.75, priority: 84 } },
    { event: "el_juicio_anticipation", play: "stone-tension", params: { volume: 0.8, priority: 82 } },
    // El cepo o el rodillo del nido que se hace esperar: una oleada con su
    // cima a ~1 s, que se corta al parar.
    { event: "el_juicio_anticipation", play: "tension-swell-wait", params: { volume: 0.55, priority: 80 } },
    { event: "el_juicio_cepo_stop", stop: "tension-swell-wait", fadeMs: 250 },
    { event: "el_juicio_nest_stop", stop: "tension-swell-wait", fadeMs: 250 },
    { event: "el_juicio_spin_end", stop: "tension-swell-wait", fadeMs: 300 },
    { event: "el_juicio_condemned_landed", play: "bonus-symbol-impact", params: function (p) { return { pitch: p.type === "RICO" ? 0.8 : 1, volume: 0.8, priority: 80 }; } },
    { event: "el_juicio_marked", play: "guadana-neck-cut", params: { pitch: 0.75, volume: 0.8, priority: 84 } },
    // Sello BLIGHTED que cae sobre el cepo (src/fx/el-juicio-blight-stamp.js):
    // golpe seco y grave.
    // Mientras se alza, una subida que llega a su cima en el golpe (la manda
    // el sello con impactMs; cima de la subida a 2.85 s) y se corta al caer.
    // Vale tambien para la Marca de Sangre del Execution (mismo sello).
    { event: "el_juicio_blight_stamp_rise", play: "tension-riser-short", params: function (p) { return { offsetMs: Math.max(0, 2850 - (p.impactMs || 670)), fadeInMs: 80, volume: 0.6, priority: 84 }; } },
    { event: "el_juicio_blight_stamp", stop: "tension-riser-short", fadeMs: 80 },
    { event: "el_juicio_blight_stamp", play: "reel-stop", params: { pitch: 0.62, volume: 0.95, priority: 85 } },
    { event: "el_juicio_blight_stamp", play: "crow-stone-hit", params: { pitch: 0.42, volume: 0.8, priority: 85 } },
    // ...y debajo del golpe, los tres cuencos graves y algo desafinados: la
    // plaga.
    { event: "el_juicio_blight_stamp", play: "bell-bowl-trio", params: { pitch: 0.47, volume: 0.5, maxDurationMs: 3200, priority: 82 } },
    // Multiplicador del infectado que rueda sobre su cepo (el-juicio.js#blightRoll):
    // tic seco que baja de tono al frenar y golpe de piedra al clavarse.
    { event: "el_juicio_blight_tick", play: "reel-stop", params: function (p) { return { pitch: 0.92 - 0.24 * ((p.step || 0) / Math.max(1, p.total || 1)), volume: 0.5, maxDurationMs: 90, priority: 74 }; } },
    { event: "el_juicio_blight_land", play: "bonus-symbol-impact", params: { pitch: 0.56, volume: 1, priority: 88 } },
    { event: "el_juicio_blight_land", play: "crow-stone-hit", params: { pitch: 0.46, volume: 0.9, priority: 88 } },
    { event: "el_juicio_soul_in", play: "win-hit", params: function (p) { return { pitch: Math.pow(1 + 0.09 * Math.min(10, p.step || 1), 0.75), volume: 0.34, priority: 62 }; } },
    // El cuervo que para en el nido grazna (uno distinto cada vez, algo mas
    // grave); el dorado lo hace con eco al despertar (el_juicio_golden_reveal).
    { event: "el_juicio_crow_lands", when: function (p) { return !p.golden; }, play: ["crow-caw-1", "crow-caw-2", "crow-caw-3", "crow-caw-5"], params: function () { return { pitch: 0.86 + Math.random() * 0.1, volume: 0.75, priority: 78 }; } },
    // Nido de los cuervos (rib1): el casi (un cuervo que se queda asomando),
    // golpe apagado.
    { event: "el_juicio_crow_near", play: "bonus-symbol-impact", params: function (p) { return { pitch: p.golden ? 0.75 : 0.6, volume: 0.5, priority: 72 }; } },
    // ...y el que se fue grazna ya lejos.
    { event: "el_juicio_crow_near", play: "crow-echo-1", params: { pitch: 1.08, volume: 0.26, delay: 120, priority: 70 } },
    { event: "el_juicio_crow_cut", play: "guadana-neck-cut", params: { volume: 0.9, priority: 82 } },
    { event: "el_juicio_crow_cut", play: "crow-stone-hit", params: { pitch: 0.8, volume: 0.6, priority: 80 } },
    // El graznido que se corta con el tajo.
    { event: "el_juicio_crow_cut", play: ["crow-caw-6", "crow-caw-4"], params: function (p) { return { pitch: (p.golden ? 1 : 1.08) + Math.random() * 0.08, volume: 0.5, delay: 20, priority: 80 }; } },
    { event: "el_juicio_scythe_up", play: "bonus-multiplier-levelup", params: function (p) { return { pitch: p.golden ? 1.15 : 1, volume: 0.9, priority: 84 }; } },
    // La guadana que vuela: sale con un silbido grave, silba en cada media
    // vuelta y vuelve a la mano con un golpe seco.
    { event: "el_juicio_scythe_throw", play: "el-juicio-whoosh", params: function (p) { return { pitch: p.golden ? 0.95 : 0.8, volume: 0.9, priority: 80 }; } },
    { event: "el_juicio_scythe_whoosh", play: "el-juicio-whoosh", params: function (p) { return { pitch: ((p.step || 0) % 2 ? 1.12 : 1) * (p.golden ? 1.1 : 1), volume: 0.5, priority: 70 }; } },
    { event: "el_juicio_scythe_catch", play: "bonus-multiplier-stick-blade", params: { pitch: 1.2, volume: 0.55, priority: 76 } },
    { event: "el_juicio_golden_reveal", play: "stone-tension", params: { volume: 0.8, priority: 84 } },
    { event: "el_juicio_golden_reveal", play: "crow-echo-2", params: { pitch: 0.88, volume: 0.6, priority: 82 } },
    // Ruleta del cuervo dorado (2026-10-19): el clac seco de la Marca de
    // Sangre, algo mas agudo, que baja al frenar; el humo negro entra con un
    // retumbo.
    { event: "el_juicio_golden_tick", play: "reel-stop", params: function (p) { return { pitch: 1.08 - 0.26 * ((p.step || 0) / Math.max(1, p.total || 1)), volume: 0.5, maxDurationMs: 90, priority: 74 }; } },
    { event: "el_juicio_golden_smoke", play: "el-juicio-quake", params: { pitch: 0.72, volume: 0.7, priority: 84 } },
    // Mientras rueda (~3 s hasta clavarse), una subida que se corta al golpe.
    { event: "el_juicio_golden_smoke", play: "tension-riser-gold", params: { offsetMs: 400, fadeInMs: 200, volume: 0.55, priority: 82 } },
    { event: "el_juicio_golden_land", stop: "tension-riser-gold", fadeMs: 120 },
    { event: "el_juicio_golden_land", stop: "el-juicio-quake", fadeMs: 140 },
    { event: "el_juicio_golden_land", stop: "stone-tension", fadeMs: 140 },
    { event: "el_juicio_death_evolves", play: "bonus-multiplier-stick-blade", params: { pitch: 0.7, volume: 0.9, priority: 86 } },
    { event: "el_juicio_harvest", play: "rib1-blade-fall", params: { volume: 1, priority: 92 } },
    { event: "el_juicio_harvest", play: "bonus-hand-cut", params: { pitch: 0.9, volume: 0.9, priority: 90, delay: 420 } },
    { event: "el_juicio_execute", play: "win-hit", params: function (p) { return { pitch: Math.pow(1 + 0.08 * Math.min(10, p.step || 0), 0.75), volume: 0.36, priority: 64 }; } },
    // LAST BELL: la campanada grave y el cuenco que se queda cantando, muy
    // hondo, bajo las ejecuciones.
    { event: "el_juicio_last_bell", play: "el-juicio-bell", params: { pitch: 0.6, volume: 1, priority: 90 } },
    { event: "el_juicio_last_bell", play: "bell-bowl-low", params: { pitch: 0.3, volume: 0.65, maxDurationMs: 6000, priority: 88 } },
    { event: "el_juicio_last_bell", play: "bell-bowl-sung", params: { pitch: 0.5, volume: 0.55, maxDurationMs: 8000, priority: 86 } },
    { event: "el_juicio_sentence", play: "bonus-multiplier-stick-blade", params: { pitch: 0.8, volume: 1, priority: 90 } },
    { event: "el_juicio_sentence_done", play: "crow-stone-hit", params: { pitch: 0.5, volume: 0.9, priority: 90 } },
    { event: "el_juicio_stamp", play: "bonus-multiplier-stick-blade", params: function (p) { return { pitch: p.golden ? 1.15 : 1.05, volume: 0.75, priority: 84 }; } },
    { event: "el_juicio_golden_land", play: "crow-stone-hit", params: { pitch: 0.6, volume: 0.42, priority: 88 } },
    { event: "el_juicio_golden_land", play: "bonus-multiplier-levelup", params: { pitch: 1.25, volume: 0.78, priority: 88 } },
    // Y un golpe grave debajo, mas hondo cuanto mayor el multiplicador.
    { event: "el_juicio_golden_land", play: "bonus-symbol-impact", params: function (p) { return { pitch: 0.62 - 0.1 * (p.tier || 0), volume: 0.5, maxDurationMs: 650, priority: 88 }; } },
    { event: "el_juicio_row_cut", play: "bonus-hand-cut", params: function (p) { return { pitch: 1 - 0.05 * (p.row || 0), volume: 0.8, priority: 84 }; } },
    { event: "el_juicio_row_cut", play: "guadana-neck-cut", params: { volume: 0.7, priority: 84, delay: 60 } },
    // Nido de los cuervos (2026-10-18): cada rodillo para con un golpe mas
    // grave que los cepos (algo mas grave de izquierda a derecha); con dos
    // posados, graznan al que falta.
    { event: "el_juicio_nest_stop", when: function (p) { return !p.emptyAppearance; }, play: "judgment-nest-stop", params: function (p) { return { pitch: 1 - 0.06 * (p.col || 0), volume: 0.66, priority: 78 }; } },
    { event: "el_juicio_nest_call", play: "crow-echo-1", params: { pitch: 0.78, volume: 0.5, priority: 72 } },
    { event: "el_juicio_nest_call", play: "crow-echo-2", params: { pitch: 0.72, volume: 0.38, delay: 380, priority: 70 } },
    // BANDADA: golpe seco grave y los cuervos; la guadana se carga (silbido que
    // sube), se clava en cada peldano y, al no subir mas, se apaga.
    { event: "el_juicio_flock", play: "crow-stone-hit", params: { pitch: 0.55, volume: 0.4, priority: 90 } },
    { event: "el_juicio_flock", play: "bonus-symbol-impact", params: { pitch: 0.7, volume: 0.75, priority: 88 } },
    // ...la bandada entera graznando, una llamada con eco y, al salir de las
    // marcas (1 s), un graznido largo.
    { event: "el_juicio_flock", play: "crow-murder", params: { pitch: 0.9, volume: 0.6, priority: 86, delay: 120 } },
    { event: "el_juicio_flock", play: "crow-echo-2", params: { pitch: 0.7, volume: 0.28, priority: 84, delay: 380 } },
    { event: "el_juicio_flock", play: "crow-caw-long", params: { pitch: 0.82, volume: 0.35, maxDurationMs: 2300, priority: 84, delay: 950 } },
    { event: "el_juicio_flock_charge", play: "el-juicio-whoosh", params: function (p) { return { pitch: 0.55 + 0.1 * (p.step || 1), volume: 0.55, priority: 80 }; } },
    { event: "el_juicio_flock_climb", play: "bonus-multiplier-stick-blade", params: function (p) { return { pitch: 0.95 + 0.1 * (p.step || 1), volume: 0.85, priority: 86 }; } },
    { event: "el_juicio_flock_climb", play: "crow-stone-hit", params: { pitch: 0.7, volume: 0.6, priority: 84 } },
    { event: "el_juicio_flock_fizzle", play: "crow-stone-hit", params: { pitch: 0.45, volume: 0.45, priority: 76 } },
    // Ultima campanada a vida o muerte: retumbo y latido (dos golpes sordos);
    // otra campanada, campana alegre; nada, se apaga con un soplo.
    { event: "el_juicio_rites", play: "el-juicio-quake", params: { pitch: 0.7, volume: 0.8, priority: 86 } },
    { event: "el_juicio_rites", play: "tension-drone-rites", params: { fadeInMs: 500, volume: 0.6, priority: 86 } },
    // (heartbeat-thump: el mismo golpe sin la espera de bonus-symbol-impact,
    // que se comia el segundo golpe del latido.)
    { event: "el_juicio_rites_beat", play: "heartbeat-thump", params: { pitch: 0.42, volume: 0.55, priority: 78 } },
    { event: "el_juicio_rites_beat", play: "heartbeat-thump", params: { pitch: 0.36, volume: 0.4, priority: 76, delay: 170 } },
    { event: "el_juicio_rites_saved", stop: "el-juicio-quake", fadeMs: 200 },
    { event: "el_juicio_rites_saved", play: "el-juicio-bell", params: { pitch: 1.2, volume: 0.9, priority: 90 } },
    { event: "el_juicio_rites_saved", play: "bonus-multiplier-levelup", params: { pitch: 1.1, volume: 0.8, priority: 88 } },
    { event: "el_juicio_rites_saved", stop: "tension-drone-rites", fadeMs: 400 },
    { event: "el_juicio_rites_saved", play: "bell-bowl-trio", params: { pitch: 1, volume: 0.55, maxDurationMs: 3500, priority: 86 } },
    { event: "el_juicio_rites_lost", stop: "el-juicio-quake", fadeMs: 400 },
    { event: "el_juicio_rites_lost", play: "el-juicio-whoosh", params: { pitch: 0.4, volume: 0.6, priority: 80 } },
    { event: "el_juicio_rites_lost", stop: "tension-drone-rites", fadeMs: 1500 },
    { event: "el_juicio_rites_lost", play: "bell-bowl-low", params: { pitch: 0.3, volume: 0.5, maxDurationMs: 4500, priority: 82 } },
    // Un cuervo que cruza el cielo cuando no ha salido ninguno (el-juicio.js#flyBy).
    { event: "el_juicio_flyby", play: "crow-echo-1", params: { pitch: 0.95, volume: 0.3, priority: 66 } },

    { event: "debug:skull-eyes-on", play: "debug-skull-eyes-activation" }
  ];
})();
