(function () {
  "use strict";

  // Configuracion declarativa de buses de audio. Dato puro: ningun archivo
  // de runtime debe hardcodear nombres de bus ni volumenes por defecto;
  // todo agente que necesite un bus nuevo lo declara aqui.
  //
  // volume: 0..1, volumen relativo dentro del bus (antes de aplicar master).
  // limit: numero maximo de sonidos simultaneos en este bus (null = sin limite).
  // priority: usado para decidir que sonido se corta primero cuando se
  //           alcanza "limit" o el limite global del engine.
  // fadeDefaultMs: fade por defecto al hacer stop/mute de este bus si la
  //                llamada no especifica uno propio.
  window.OSSUARY_AUDIO_BUSES = [
    { id: "MASTER", volume: 1, limit: null, priority: 100, fadeDefaultMs: 250 },
    { id: "MUSIC", volume: 0.8, limit: 2, priority: 40, fadeDefaultMs: 800 },
    { id: "AMBIENCE", volume: 0.7, limit: 4, priority: 30, fadeDefaultMs: 600 },
    { id: "UI", volume: 1, limit: 4, priority: 60, fadeDefaultMs: 80 },
    { id: "BUTTONS", volume: 1, limit: 4, priority: 60, fadeDefaultMs: 60 },
    { id: "REELS", volume: 0.9, limit: 8, priority: 50, fadeDefaultMs: 120 },
    { id: "SYMBOLS", volume: 0.9, limit: 8, priority: 50, fadeDefaultMs: 120 },
    { id: "BONUS", volume: 1, limit: 6, priority: 70, fadeDefaultMs: 250 },
    { id: "RESPINS", volume: 1, limit: 4, priority: 65, fadeDefaultMs: 150 },
    { id: "BIGWIN", volume: 1, limit: 3, priority: 90, fadeDefaultMs: 300 },
    { id: "VOICE", volume: 1, limit: 1, priority: 80, fadeDefaultMs: 150 },
    { id: "DEBUG", volume: 1, limit: 4, priority: 10, fadeDefaultMs: 0 }
  ];
})();
