(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // SUPER BONUS "El Juicio" (peticion del usuario, 2026-10-16/17): reglas y
  // numeros. La logica esta en src/bonus/el-juicio-engine.js y la puesta en
  // escena en src/fx/el-juicio.js.
  //
  // La Muerte (el encapuchado del marco que cae al esternon) da 13 campanadas;
  // cada tirada gasta una y cada cuervo que parte en el nido suma una. Cada
  // condenado que cae mete su valor (x apuesta) en el saco de almas (la
  // linterna). Cada cuervo sube un paso la guadana; el dorado la multiplica
  // entera. Los 3 rodillos del nido marcados de sangre = la BANDADA (la
  // guadana sube 1-3 peldanos de golpe, se borran). Ocho cepos llenos = la Siega (pagan otra
  // vez, la guadana sube un nivel, se vacian). Ultima campanada = la
  // Sentencia: los que quedan pagan otra vez y se paga saco x guadana, con
  // tope de 20,000x.
  //
  // Simulado (tools/sim-el-juicio.js, 1M) con los infectados que multiplican
  // y suman a la guadana (2026-10-19): media ~x450, mediana ~x174, p10 ~x36,
  // ~7% por debajo de x30, ~9.9% por encima de x1,000, ~0.86% por encima de
  // x5,000, tope 20,000x en ~1 de cada 1,700; ~0.9 infectados por Super (58%
  // con alguno). Lo de abajo es de antes, con el infectado x5 fijo.
  //
  // Simulado (tools/sim-el-juicio.js, 1M de Super con estos valores, 2026-10-18
  // con los cuervos que se parten y marcan su rodillo): media ~x185, mediana
  // ~x92, p10 ~x31, ~9% por debajo de x30, ~2.2% por encima de x1,000, ~0.17%
  // por encima de x5,000, tope 20,000x en ~1 de cada 6,400; ~18 tiradas, ~2
  // Siegas, ~5.4 cuervos, ~0.74 Bandadas (57% de los Super con alguna) y
  // cuervo dorado en ~10%. Con el nido de cuervos posados: media ~x188,
  // mediana ~x94, 77% con Bandada. Antes del nido (0-2 cuervos por tirada):
  // media ~x185, mediana ~x101, ~20 tiradas.
  // ---------------------------------------------------------------------------

  // Historical simulations above are not evidence for the current target.
  // Read docs/math-results for current shared-engine measurements.
  var config = {
    tolls: 13,
    cepos: 8,
    // Condenados que arrastra la Muerte al empezar ([cuantos, peso]) y de
    // que clase ([clase, peso]).
    startCount: [[3, 40], [4, 40], [5, 20]],
    startTypes: [["POBRE", 2], ["NOBLE", 1]],
    // Probabilidad de que caiga un condenado en cada cepo vacio en cada tirada.
    landChance: 0.3,
    types: [["POBRE", 60], ["NOBLE", 28], ["RICO", 12]],
    // Valor de cada clase, en multiplos de la apuesta.
    values: { POBRE: 0.109, NOBLE: 0.2725, RICO: 0.8175 },
    // Infectados (BLIGHTED, fuego rojo). Desde el 2026-10-19 (peticion del
    // usuario) cada uno saca un multiplicador al azar ([veces, peso], hasta
    // x50): vale esas veces mas en la linterna y esas mismas veces se SUMAN a
    // la guadana (x12 con un infectado x25 = x37). El cuervo dorado multiplica
    // la guadana entera, lo sumado incluido. Antes valian x5 fijo y no
    // tocaban la guadana (markFactor: 5).
    markChance: 0.05,
    blightMultipliers: [[5, 30], [6, 18], [7, 14], [10, 14], [15, 9], [20, 7], [25, 5], [50, 3]],
    // Nido de rib1 (peticion del usuario, 2026-10-18): 3 rodillos que giran
    // siempre; probabilidad de que cada uno traiga cuervo segun cuantos estan
    // ya marcados (crowChance[marcados]). El cuervo se parte en el acto y
    // marca su rodillo; los 3 marcados = BANDADA: la guadana sube de golpe 1,
    // 2 o 3 peldanos ([peldanos, peso]). (Antes de esto, el cuervo se quedaba
    // posado y su casilla dejaba de girar: nestChance [0, .2, .14, .105] por
    // casilla libre; y antes, 0-2 cuervos por tirada en una tira horizontal.)
    nestCells: 3,
    crowChance: [0.09, 0.095, 0.108],
    flockRungs: [[1, 75], [2, 18], [3, 7]],
    // Parte de los cuervos que llegan dorados y su multiplicador sorpresa.
    goldenShare: 0.02,
    goldenMultipliers: [[2, 50], [3, 25], [5, 17], [10, 8]],
    // Guadana: x2 al empezar; cada peldano pide [cuervos, multiplicador].
    startMultiplier: 2,
    ladder: [[1, 3], [1, 4], [2, 5], [2, 6], [2, 8], [3, 10], [3, 12], [4, 15], [4, 20], [5, 25], [6, 35], [8, 50], [10, 100]],
    // Tope del premio (x apuesta).
    cap: 20000,

    // --- Entrada desde el juego (cambio de reglas pedido por el usuario) ----
    // Al completarse la cadena del Execution Bonus (guillotina en rib1, rib2 y
    // rib3), el encapuchado amaga. superChance: probabilidad de que caiga y
    // sea el Super en vez del Execution. teaseChance: probabilidad de que
    // amague sin caer cuando sale el Execution (intriga).
    superChance: 0.15,
    teaseChance: 0.3,

    // --- Ritmo (ms, a velocidad normal; el turbo los acorta) ---------------
    timing: {
      betweenSpins: 650,
      spinMin: 620,
      stopStep: 70,
      anticipation: 900,
      crowLand: 420,
      crowSlash: 260,
      goldenReveal: 1700,
      harvest: 2100,
      sentence: 2400
    },

    // Formas de la Muerte segun la guadana (FX): desde x5, x15 y x50.
    forms: [5, 15, 50],

    // --- Arte y video del usuario ---------------------------------------------
    // introVideo: su video de entrada (p.ej. "assets/super_bonus/el_juicio_intro.mp4");
    // null = el video de entrada del Execution Bonus.
    introVideo: null,
    // deathArt: la Muerte de cuerpo entero del usuario (Image_3229, recortada
    // del croma con tools/bake-el-juicio-user-art.js; su cara y su mano en
    // src/fx/el-juicio.js#DEATH_ART); null = la provisional (capucha del marco
    // y manto).
    deathArt: "assets/super_bonus/death_full.png"
  };

  if (typeof module !== "undefined" && module.exports) module.exports = config;
  if (typeof window !== "undefined") window.OSSUARY_EL_JUICIO_CONFIG = config;
})();
