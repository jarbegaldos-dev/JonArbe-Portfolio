(function () {
  "use strict";

  window.OSSUARY_AUDIO_SOUNDS = [
    { id: "debug-skull-eyes-activation", category: "debug", file: "assets/audio/skull_eyes_activation.ogg", bus: "DEBUG", volume: 1, priority: 10, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 80 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["debug", "skull-eyes"], enabled: true },

    // Sonidos de interfaz generados por tools/bake-ui-sounds.js (clic seco y
    // error grave). Volumen medido: clic a ~-27 dB y error a ~-20 dB efectivos,
    // frente a ~-21 dB de la musica de fondo.
    { id: "ui-button-click", category: "ui", file: "assets/audio/ui/button_click.wav", bus: "BUTTONS", volume: 0.33, priority: 50, loop: false, preload: true, cooldown: 40, fade: { inMs: 0, outMs: 30 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["ui"], vary: { rate: 0.03, volume: 0.1 }, enabled: true },
    { id: "ui-button-error", category: "ui", file: "assets/audio/ui/button_error.wav", bus: "BUTTONS", volume: 0.35, priority: 55, loop: false, preload: true, cooldown: 250, fade: { inMs: 0, outMs: 30 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["ui"], enabled: true },

    { id: "reel-mechanism-start", category: "reels", file: "assets/audio/reels/reel_mechanism_start.wav", bus: "REELS", volume: 0.5, priority: 60, loop: false, preload: true, cooldown: 250, fade: { inMs: 0, outMs: 40 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["reels", "mechanism", "start"], vary: { rate: 0.03, volume: 0.1 }, enabled: true },
    { id: "reel-spin-start", category: "reels", file: "assets/audio/reels/spin_start.wav", bus: "REELS", volume: 0.22, priority: 50, loop: true, preload: true, cooldown: 120, fade: { inMs: 0, outMs: 60 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["reels", "spin"], enabled: true },
    { id: "reel-stop", category: "reels", file: "assets/audio/reels/reel_stop.wav", bus: "REELS", volume: 0.4, priority: 50, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 40 }, pool: 4, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["reels", "stop"], vary: { rate: 0.04, volume: 0.15 }, enabled: true },

    { id: "music-normal", category: "music", file: "assets/audio/music/fondo_juego_normal.wav", bus: "MUSIC", volume: 0.66, priority: 35, loop: true, preload: true, cooldown: 0, fade: { inMs: 900, outMs: 900 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["music", "base"], enabled: true },
    { id: "music-bonus", category: "music", file: "assets/audio/music/fondo_juego_bonus.wav", bus: "MUSIC", volume: 0.72, priority: 36, loop: true, preload: true, cooldown: 0, fade: { inMs: 900, outMs: 900 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["music", "bonus"], enabled: true },
    { id: "music-ruleta", category: "music", file: "assets/audio/music/fondo_juego_ruleta.wav", bus: "MUSIC", volume: 0.72, priority: 37, loop: true, preload: true, cooldown: 0, fade: { inMs: 700, outMs: 700 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["music", "ruleta"], enabled: true },

    { id: "judgment-empty-appearance", category: "bonus", file: "assets/audio/judgment/empty-appearance.wav", bus: "BONUS", volume: 0.48, priority: 76, loop: false, preload: true, cooldown: 900, fade: { inMs: 15, outMs: 100 }, pool: 1, enabled: true },
    { id: "judgment-surge", category: "music", file: "assets/audio/judgment/judgment-surge.wav?v=loop698182", bus: "MUSIC", volume: 0.65, priority: 39, loop: true, preload: "idle", cooldown: 0, fade: { inMs: 1200, outMs: 600 }, pool: 1, enabled: true },
    { id: "judgment-finale", category: "music", file: "assets/audio/judgment/judgment-finale.wav?v=loop698182", bus: "MUSIC", volume: 0.65, priority: 39, loop: true, preload: "idle", cooldown: 0, fade: { inMs: 1200, outMs: 600 }, pool: 1, enabled: true },
    // El Juicio: capas de 16 pulsos alineadas con el bucle original de la nana.
    { id: "judgment-low-bed", category: "music", file: "assets/audio/judgment/judgment-low-bed.wav?v=loop698182", bus: "MUSIC", volume: 0.32, priority: 38, loop: true, preload: "idle", cooldown: 0, fade: { inMs: 900, outMs: 600 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["music", "juicio", "low"], enabled: true },
    { id: "judgment-rhythm", category: "music", file: "assets/audio/judgment/judgment-rhythm.wav?v=loop698182", bus: "MUSIC", volume: 0.34, priority: 38, loop: true, preload: "idle", cooldown: 0, fade: { inMs: 900, outMs: 600 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["music", "juicio", "rhythm"], enabled: true },
    { id: "judgment-climax", category: "music", file: "assets/audio/judgment/judgment-climax.wav?v=loop698182", bus: "MUSIC", volume: 0.36, priority: 39, loop: true, preload: "idle", cooldown: 0, fade: { inMs: 750, outMs: 600 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["music", "juicio", "climax"], enabled: true },
    { id: "judgment-final-hit", category: "bonus", file: "assets/audio/judgment/judgment-final-hit.wav", bus: "BONUS", volume: 0.58, priority: 92, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 180 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "juicio", "final"], enabled: true },
    { id: "golden-crow-cut", category: "bonus", file: "assets/audio/judgment/golden-crow-cut.wav", bus: "BONUS", volume: 0.62, priority: 88, loop: false, preload: true, cooldown: 180, fade: { inMs: 0, outMs: 90 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "golden", "crow", "cut"], enabled: true },
    { id: "judgment-nest-start", category: "bonus", file: "assets/audio/judgment/nest-start.wav", bus: "BONUS", volume: 0.68, priority: 75, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 80 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "juicio", "nest"], enabled: true },
    { id: "judgment-nest-loop", category: "bonus", file: "assets/audio/judgment/nest-loop.wav", bus: "BONUS", volume: 0.38, priority: 64, loop: true, preload: true, cooldown: 0, fade: { inMs: 180, outMs: 150 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "juicio", "nest"], enabled: true },
    { id: "judgment-nest-stop", category: "bonus", file: "assets/audio/judgment/nest-stop.wav", bus: "BONUS", volume: 0.66, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "juicio", "nest"], enabled: true },

    { id: "rib1-blade-fall", category: "bonus", file: "assets/audio/bonus/rib1_blade_fall.mp3", bus: "BONUS", volume: 0.95, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 90 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "rib1", "blade", "fall"], enabled: true },
    { id: "rib1-bonus-respin-loop", category: "bonus", file: "assets/audio/bonus/rib1_bonus_respin_loop.wav", bus: "BONUS", volume: 0.9, priority: 76, loop: true, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 160 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "rib1", "respin", "loop"], enabled: true },
    { id: "bonus-hand-cut", category: "bonus", file: "assets/audio/bonus/manos_cortandose.wav", bus: "BONUS", volume: 0.95, priority: 77, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 40 }, pool: 4, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "guillotine", "hand", "cut"], vary: { rate: 0.04, volume: 0.1 }, enabled: true },
    { id: "guadana-neck-line", category: "bonus", file: "assets/audio/bonus/guadana_neck_line.mp3", bus: "BONUS", volume: 0.95, priority: 78, loop: true, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 40 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "guadana", "neck", "line"], enabled: true },
    { id: "guadana-neck-cut", category: "bonus", file: "assets/audio/bonus/guadana_neck_cut.mp3", bus: "BONUS", volume: 0.98, priority: 79, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 50 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "guadana", "neck", "cut"], enabled: true },
    { id: "bonus-rope-pull", category: "bonus", file: "assets/audio/bonus/tirar_cuerda.wav", bus: "BONUS", volume: 0.95, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 40 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "sternum", "rope", "trigger"], enabled: true },
    { id: "bonus-candle-light", category: "bonus", file: "assets/audio/bonus/cerilla.mp3", bus: "BONUS", volume: 0.78, priority: 77, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 2, playbackRate: 1, maxDurationMs: 700, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "candle", "light"], enabled: true },
    { id: "bonus-multiplier-levelup", category: "bonus", file: "assets/audio/bonus/bonus_multiplier_levelup.mp3", bus: "BONUS", volume: 0.9, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 80 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "multiplier", "levelup", "blade"], enabled: true },
    { id: "bonus-multiplier-stick-blade", category: "bonus", file: "assets/audio/bonus/bonus_multiplier_stick_blade.mp3", bus: "BONUS", volume: 0.9, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 80 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "multiplier", "blade", "stick"], enabled: true },
    { id: "bonus-symbol-impact", category: "bonus", file: "assets/audio/bonus/bonus_symbol_impact.mp3", bus: "BONUS", volume: 0.95, priority: 78, loop: false, preload: true, cooldown: 140, fade: { inMs: 0, outMs: 80 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "symbol", "impact", "rib2", "rib3"], enabled: true },
    // SUPER BONUS "El Juicio": campanada de hierro apagada (tools/bake-el-juicio-sounds.js).
    { id: "el-juicio-bell", category: "bonus", file: "assets/audio/bonus/el_juicio_bell.wav", bus: "BONUS", volume: 0.72, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "bell"], enabled: true },
    // Silbido de la guadana que vuela, una vez por media vuelta (tools/bake-el-juicio-sounds.js).
    { id: "el-juicio-whoosh", category: "bonus", file: "assets/audio/bonus/el_juicio_whoosh.wav", bus: "BONUS", volume: 0.6, priority: 70, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 30 }, pool: 4, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "scythe", "whoosh"], enabled: true },
    // Caida de la Muerte al entrar al Super (tools/bake-el-juicio-fall-sounds.js):
    // retumbo con el silbido de la caida y el estruendo en el rodillo.
    { id: "el-juicio-death-rumble", category: "bonus", file: "assets/audio/bonus/el_juicio_rumble.wav", bus: "BONUS", volume: 0.85, priority: 90, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 50 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "fall"], enabled: true },
    { id: "el-juicio-death-crash", category: "bonus", file: "assets/audio/bonus/el_juicio_crash.wav", bus: "BONUS", volume: 1, priority: 96, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 120 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "fall", "impact"], enabled: true },
    // Las unas del encapuchado rascando la viga cuando se lo llevan detras.
    { id: "el-juicio-scrape", category: "bonus", file: "assets/audio/bonus/el_juicio_scrape.wav", bus: "BONUS", volume: 0.8, priority: 88, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 40 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "fall"], enabled: true },
    // La maquina retumba a oscuras desde que se completa la cadena.
    { id: "el-juicio-quake", category: "bonus", file: "assets/audio/bonus/el_juicio_quake.wav", bus: "BONUS", volume: 0.85, priority: 86, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 180 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "tension"], enabled: true },

    // Sonidos de la galeria del usuario (assets/audio/gallery, 2026-10-19) que
    // ya suenan en el Execution Bonus y en El Juicio (audio-rules.config.js).
    // Cuencos: el resonar de las campanadas, bajados de tono (bowl-mid a 0.5 =
    // Sol, la nota de la campana del Juicio); se cortan con un fundido largo.
    { id: "bell-bowl-low", category: "bonus", file: "assets/audio/gallery/bells/bowl_low.mp3", bus: "BONUS", volume: 0.5, priority: 76, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 900 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "bell", "bowl"], enabled: true },
    { id: "bell-bowl-mid", category: "bonus", file: "assets/audio/gallery/bells/bowl_mid.mp3", bus: "BONUS", volume: 0.5, priority: 76, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 900 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "bell", "bowl"], enabled: true },
    { id: "bell-bowl-trio", category: "bonus", file: "assets/audio/gallery/bells/bowl_trio.mp3", bus: "BONUS", volume: 0.5, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 900 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "bell", "bowl"], enabled: true },
    { id: "bell-bowl-sung", category: "bonus", file: "assets/audio/gallery/bells/bowl_low_sung.mp3", bus: "BONUS", volume: 0.5, priority: 80, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 1500 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "bell", "bowl"], enabled: true },
    // Graznidos sueltos (las reglas eligen uno al azar de una lista).
    { id: "crow-caw-1", category: "fx", file: "assets/audio/gallery/crows/crow_caw_1.mp3", bus: "SYMBOLS", volume: 0.7, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "caw"], enabled: true },
    { id: "crow-caw-2", category: "fx", file: "assets/audio/gallery/crows/crow_caw_2.mp3", bus: "SYMBOLS", volume: 0.7, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "caw"], enabled: true },
    { id: "crow-caw-3", category: "fx", file: "assets/audio/gallery/crows/crow_caw_3.mp3", bus: "SYMBOLS", volume: 0.7, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "caw"], enabled: true },
    { id: "crow-caw-4", category: "fx", file: "assets/audio/gallery/crows/crow_caw_4.mp3", bus: "SYMBOLS", volume: 0.7, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "caw"], enabled: true },
    { id: "crow-caw-5", category: "fx", file: "assets/audio/gallery/crows/crow_caw_5.mp3", bus: "SYMBOLS", volume: 0.7, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "caw"], enabled: true },
    { id: "crow-caw-6", category: "fx", file: "assets/audio/gallery/crows/crow_caw_6.mp3", bus: "SYMBOLS", volume: 0.7, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "caw"], enabled: true },
    { id: "crow-caw-long", category: "fx", file: "assets/audio/gallery/crows/crow_caw_7.mp3", bus: "SYMBOLS", volume: 0.7, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 120 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "caw"], enabled: true },
    { id: "crow-echo-1", category: "fx", file: "assets/audio/gallery/crows/crow_echo_1.mp3", bus: "SYMBOLS", volume: 0.6, priority: 72, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 120 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "echo"], enabled: true },
    { id: "crow-echo-2", category: "fx", file: "assets/audio/gallery/crows/crow_echo_2.mp3", bus: "SYMBOLS", volume: 0.6, priority: 72, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 300 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "echo"], enabled: true },
    { id: "crow-murder", category: "fx", file: "assets/audio/gallery/crows/crow_caws_all.mp3", bus: "SYMBOLS", volume: 0.7, priority: 80, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 400 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "crow", "flock"], enabled: true },
    // Tension: oleadas y fondos que se cortan con fundido al resolverse, y
    // subidas que se arrancan a medias para que su cima caiga en el golpe.
    { id: "tension-swell-wait", category: "bonus", file: "assets/audio/gallery/tension/swell_3.mp3", bus: "BONUS", volume: 0.55, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 300 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "tension", "swell"], enabled: true },
    { id: "tension-swell-tease", category: "bonus", file: "assets/audio/gallery/tension/swell_4.mp3", bus: "BONUS", volume: 0.6, priority: 82, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 300 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "tension", "swell"], enabled: true },
    { id: "tension-drone-dark", category: "bonus", file: "assets/audio/gallery/tension/drone_1.mp3", bus: "BONUS", volume: 0.5, priority: 80, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 500 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "tension", "drone"], enabled: true },
    { id: "tension-drone-rites", category: "bonus", file: "assets/audio/gallery/tension/drone_2.mp3", bus: "BONUS", volume: 0.55, priority: 82, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 600 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "tension", "drone"], enabled: true },
    { id: "tension-drone-breath", category: "bonus", file: "assets/audio/gallery/tension/drone_4.mp3", bus: "BONUS", volume: 0.5, priority: 80, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 600 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "tension", "drone"], enabled: true },
    { id: "tension-riser-short", category: "bonus", file: "assets/audio/gallery/tension/riser_01.mp3", bus: "BONUS", volume: 0.6, priority: 82, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 120 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "tension", "riser"], enabled: true },
    // Latido de la ultima campanada: el golpe de bonus-symbol-impact sin su
    // espera de 140 ms (los dos golpes del pum-pum van seguidos).
    { id: "heartbeat-thump", category: "bonus", file: "assets/audio/bonus/bonus_symbol_impact.mp3", bus: "BONUS", volume: 0.55, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 80 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "heartbeat"], enabled: true },
    { id: "tension-riser-gold", category: "bonus", file: "assets/audio/gallery/tension/riser_02.mp3", bus: "BONUS", volume: 0.55, priority: 82, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 150 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "super", "tension", "riser"], enabled: true },

    { id: "crow-stone-hit", category: "fx", file: "assets/audio/fx/cuervo_golpe.wav", bus: "SYMBOLS", volume: 0.95, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 3, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "small-blade", "crow", "stone", "hit"], vary: { rate: 0.05, volume: 0.12 }, enabled: true },
    { id: "crow-perch", category: "fx", file: "assets/audio/fx/cuervo_posarse.mp3", bus: "SYMBOLS", volume: 0.9, priority: 74, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 80 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "small-blade", "crow", "perch"], enabled: true },
    // Espera de la cadena del Execution Bonus (generado con tools/bake-stone-sounds.js).
    { id: "stone-tension", category: "fx", file: "assets/audio/fx/stone_tension.wav", bus: "SYMBOLS", volume: 0.95, priority: 76, loop: false, preload: true, cooldown: 600, fade: { inMs: 0, outMs: 60 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "small-blade", "stone", "tension"], enabled: true },
    // Amagos de la guillotina de rib1, cortados de los audios del usuario
    // (tools/bake-rib1-tease-sounds.js): cadenas que corren, roce de ladrillo,
    // empujon de piedra y los dos golpes de madera de la flecha.
    { id: "rib1-tease-chains", category: "fx", file: "assets/audio/fx/rib1_tease_chains.mp3", bus: "SYMBOLS", volume: 0.5, priority: 77, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 160 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "rib1", "chain", "tension"], enabled: true },
    { id: "rib1-tease-scrape", category: "fx", file: "assets/audio/fx/rib1_tease_scrape.mp3", bus: "SYMBOLS", volume: 0.55, priority: 76, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 120 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "rib1", "scrape", "tension"], enabled: true },
    { id: "rib1-tease-push", category: "fx", file: "assets/audio/fx/rib1_tease_push.mp3", bus: "SYMBOLS", volume: 0.75, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 120 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "rib1", "stone", "tension"], enabled: true },
    { id: "rib1-tease-hit", category: "fx", file: "assets/audio/fx/rib1_tease_hit.mp3", bus: "SYMBOLS", volume: 1, priority: 84, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 60 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "rib1", "wood", "hit"], enabled: true },
    { id: "rib1-tease-knock", category: "fx", file: "assets/audio/fx/rib1_tease_knock.mp3", bus: "SYMBOLS", volume: 0.8, priority: 78, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 40 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "rib1", "wood", "hit"], vary: { rate: 0.04, volume: 0.1 }, enabled: true },
    // Cuchilla BONUS ya posada en rib1: espera de los rodillos rib2/rib3.
    { id: "bonus-chain-bed", category: "bonus", file: "assets/audio/library/tension/tension-bed.ogg", bus: "BONUS", volume: 0.24, priority: 77, loop: true, preload: true, cooldown: 0, fade: { inMs: 120, outMs: 90 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "chain", "tension"], fallbackFile: "assets/audio/library/tension/tension-bed.m4a", enabled: true },
    { id: "bonus-chain-riser", category: "bonus", file: "assets/audio/library/tension/tension-riser-2s.mp3", bus: "BONUS", volume: 0.3, priority: 79, loop: false, preload: true, cooldown: 0, fade: { inMs: 60, outMs: 80 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "chain", "tension"], enabled: true },
    { id: "bonus-chain-roll", category: "bonus", file: "assets/audio/library/tension/tension-timpani-roll.mp3", bus: "BONUS", volume: 0.26, priority: 79, loop: false, preload: true, cooldown: 0, fade: { inMs: 50, outMs: 80 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["bonus", "chain", "percussion"], enabled: true },
    { id: "payline-win", category: "fx", file: "assets/audio/fx/linea_pago.mp3", bus: "SYMBOLS", volume: 1.4, priority: 60, loop: false, preload: true, cooldown: 400, fade: { inMs: 0, outMs: 80 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "payline", "win"], enabled: true },
    // Golpe seco de premio (tools/bake-win-notes.js): tambor de piel apagado y
    // piedra, sin cola. La escalera de las lineas de pago lo sube de tono linea
    // a linea (game.js, audio-rules `payline_note`).
    { id: "win-hit", category: "fx", file: "assets/audio/fx/win_hit.wav", bus: "SYMBOLS", volume: 0.36, priority: 62, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 40 }, pool: 6, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "payline", "win", "note", "drum", "stone"], enabled: true },
    { id: "small-blade-tremble", category: "fx", file: "assets/audio/fx/small_blade_tremble.mp3", bus: "SYMBOLS", volume: 0.82, priority: 73, loop: true, preload: true, cooldown: 0, fade: { inMs: 35, outMs: 45 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "small-blade", "tremble"], enabled: true },
    // Meneo del cofre del Ruleta Game casi lleno o lleno (src/fx/chest-tension.js):
    // el temblor de la cuchilla, mas grave y corto.
    { id: "chest-rattle", category: "fx", file: "assets/audio/fx/small_blade_tremble.mp3", bus: "SYMBOLS", volume: 0.55, priority: 62, loop: false, preload: true, cooldown: 1500, fade: { inMs: 20, outMs: 140 }, pool: 1, playbackRate: 0.72, maxDurationMs: 520, pitch: 0.72, delay: 0, weight: 1, tags: ["fx", "chest", "rattle"], enabled: true },
    // Guillotina del Execution Bonus atascada o a punto de ceder
    // (src/fx/guillotine-drop.js): el temblor de la cuchilla, grave y en bucle.
    { id: "guillotine-grind", category: "bonus", file: "assets/audio/fx/small_blade_tremble.mp3", bus: "BONUS", volume: 0.62, priority: 74, loop: true, preload: true, cooldown: 0, fade: { inMs: 30, outMs: 90 }, pool: 1, playbackRate: 0.62, pitch: 0.62, delay: 0, weight: 1, tags: ["bonus", "guillotine", "grind"], enabled: true },
    { id: "small-blade-fall", category: "fx", file: "assets/audio/fx/small_blade_fall.mp3", bus: "SYMBOLS", volume: 0.9, priority: 74, loop: true, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 55 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["fx", "small-blade", "fall"], enabled: true },

    { id: "big-win-counter-loop", category: "wins", file: "assets/audio/fx/big_win_counter_loop.wav", bus: "BIGWIN", volume: 0.9, priority: 88, loop: true, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 0 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["win", "counter", "loop"], enabled: true },
    { id: "big-win-counter-epic", category: "wins", file: "assets/audio/fx/big_win_counter_epic.wav", bus: "BIGWIN", volume: 0.8, priority: 92, loop: false, preload: "idle", cooldown: 0, fade: { inMs: 0, outMs: 0 }, pool: 1, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["win", "counter", "epic"], enabled: true },
    { id: "big-win-counter-pause", category: "wins", file: "assets/audio/fx/big_win_counter_pause.mp3", bus: "BIGWIN", volume: 0.95, priority: 89, loop: false, preload: true, cooldown: 0, fade: { inMs: 0, outMs: 20 }, pool: 2, playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["win", "counter", "pause"], enabled: true }
  ];

  // Galeria de audio (tools/bake-audio-gallery.js): fragmentos sueltos de las
  // pistas de cuervos, cuencos y tension que trajo el usuario, aun sin uso en
  // el juego. Se cargan al pedirlos (preload false) y se escuchan desde
  // DEBUG > Galeria de audio, una fila por `gallery`. Id = "gallery-" + nombre
  // del fichero (crow_caw_1 -> gallery-crow-caw-1). Nivelados al cortarlos:
  // cuervos -12 dB, cuencos -16 dB y tension -14 dB de RMS maximo.
  var GALLERY_FAMILY = {
    crows: { bus: "SYMBOLS", volume: 0.6, tags: ["crow"] },
    bells: { bus: "BONUS", volume: 0.7, tags: ["bell", "bowl"] },
    tension: { bus: "BONUS", volume: 0.6, tags: ["tension"] }
  };
  [
    ["Cuervos con eco", "crows/crow_echo_1", "Eco 1", "Graznido con eco, el primero, casi seco (0.9 s)"],
    ["Cuervos con eco", "crows/crow_echo_2", "Eco 2", "Graznido con su eco largo (2.7 s)"],
    ["Cuervos con eco", "crows/crow_echo_pair", "Los dos", "Los dos graznidos con eco seguidos (3.6 s)"],
    ["Graznidos", "crows/crow_caw_1", "1", "Graznido 1 (0.7 s)"],
    ["Graznidos", "crows/crow_caw_2", "2", "Graznido 2 (0.5 s)"],
    ["Graznidos", "crows/crow_caw_3", "3", "Graznido 3 (0.6 s)"],
    ["Graznidos", "crows/crow_caw_4", "4", "Graznido 4 (0.5 s)"],
    ["Graznidos", "crows/crow_caw_5", "5", "Graznido 5 (0.6 s)"],
    ["Graznidos", "crows/crow_caw_6", "6", "Graznido 6, el mas corto (0.3 s)"],
    ["Graznidos", "crows/crow_caw_7", "7", "Graznido 7, largo (1.8 s)"],
    ["Graznidos", "crows/crow_caws_all", "Los 7", "Los siete graznidos seguidos (5 s)"],
    ["Campanas (cuencos)", "bells/bowl_low", "Grave", "Cuenco grave, un golpe (Do, 2.4 s)"],
    ["Campanas (cuencos)", "bells/bowl_mid", "Medio", "Cuenco medio, un golpe (Sol, 2.4 s)"],
    ["Campanas (cuencos)", "bells/bowl_high", "Agudo", "Cuenco agudo, un golpe (Do alto, 2.4 s)"],
    ["Campanas (cuencos)", "bells/bowl_trio", "Los tres", "Los tres cuencos a la vez (3.9 s)"],
    ["Campanas (cuencos)", "bells/bowl_low_sung", "Grave cantado", "Cuenco grave golpeado que se queda cantando y crece (5.3 s)"],
    ["Campanas (cuencos)", "bells/bowls_sequence", "Secuencia", "Los cuencos uno tras otro, cada 2.4 s (41 s)"],
    ["Tension: subidas", "tension/riser_01", "4 s", "Subida corta (4 s)"],
    ["Tension: subidas", "tension/riser_02", "6 s", "Subida que se aclara (6 s)"],
    ["Tension: subidas", "tension/riser_03", "7 s grave", "Subida grave (7 s)"],
    ["Tension: subidas", "tension/riser_04", "7 s agudo", "Subida aguda y suave (7.5 s)"],
    ["Tension: subidas", "tension/riser_05", "7 s directa", "Subida que arranca fuerte y se aclara (7.5 s)"],
    ["Tension: subidas", "tension/riser_06", "8 s", "Subida (7.7 s)"],
    ["Tension: subidas", "tension/riser_07", "12 s agudo", "Subida aguda (11.6 s)"],
    ["Tension: subidas", "tension/riser_08", "12 s", "Subida (12 s)"],
    ["Tension: subidas", "tension/riser_09", "14 s agudo", "Subida muy aguda (14 s)"],
    ["Tension: subidas", "tension/riser_10", "20 s", "Subida larga, de grave a agudo (20 s)"],
    ["Tension: subidas", "tension/riser_11", "20 s grave", "Subida larga y grave (20 s)"],
    ["Tension: oleadas", "tension/swell_1", "1", "Oleada que crece despacio (4 s)"],
    ["Tension: oleadas", "tension/swell_2", "2", "Oleada de golpe (5 s)"],
    ["Tension: oleadas", "tension/swell_3", "3", "Oleada de golpe (4 s)"],
    ["Tension: oleadas", "tension/swell_4", "4", "Oleada (5 s)"],
    ["Tension: oleadas", "tension/swell_5", "5", "Oleada (5 s)"],
    ["Tension: oleadas", "tension/swell_6", "6", "Oleada suave (4.5 s)"],
    ["Tension: fondos", "tension/drone_1", "1", "Fondo que entra de golpe y se apaga despacio (12 s)"],
    ["Tension: fondos", "tension/drone_2", "2", "Fondo sostenido (12 s)"],
    ["Tension: fondos", "tension/drone_3", "3", "Fondo sostenido, agudo (13 s)"],
    ["Tension: fondos", "tension/drone_4", "4", "Fondo sostenido (14 s)"]
  ].forEach(function (entry) {
    var family = entry[1].split("/")[0];
    var name = entry[1].split("/")[1];
    var f = GALLERY_FAMILY[family];
    window.OSSUARY_AUDIO_SOUNDS.push({
      id: "gallery-" + name.replace(/_/g, "-"), category: "gallery", file: "assets/audio/gallery/" + entry[1] + ".mp3",
      bus: f.bus, volume: f.volume, priority: 40, loop: false, preload: false, cooldown: 0, fade: { inMs: 0, outMs: 120 }, pool: 2,
      playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["gallery", family].concat(f.tags), enabled: true,
      gallery: entry[0], label: entry[2], title: entry[3]
    });
  });
})();
