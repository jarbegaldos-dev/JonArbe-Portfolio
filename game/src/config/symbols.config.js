window.OSSUARY_SYMBOL_CONFIG = {
  NORMAL_SYMBOLS: [
    "CROWNED_SKULL",
    "ANCESTRAL_SKULL",
    "DARK_HEART",
    "ANCIENT_GOLD_COIN",
    "SILVER_COIN",
    "VERTEBRA",
    "FEMUR"
  ],

  // Pesos PROVISIONALES: solo se han añadido los dos símbolos nuevos para que aparezcan
  // en los rodillos y se pueda probar el set completo. La curva de volatilidad / RTP
  // definitiva se ajustará más adelante junto con la tabla de pagos.
  WEIGHTED_NORMAL_SYMBOLS: [
    "CROWNED_SKULL",
    "ANCESTRAL_SKULL",
    "ANCESTRAL_SKULL",
    "DARK_HEART",
    "DARK_HEART",
    "ANCIENT_GOLD_COIN",
    "ANCIENT_GOLD_COIN",
    "ANCIENT_GOLD_COIN",
    "SILVER_COIN",
    "SILVER_COIN",
    "SILVER_COIN",
    "VERTEBRA",
    "VERTEBRA",
    "VERTEBRA",
    "VERTEBRA",
    "FEMUR",
    "FEMUR",
    "FEMUR",
    "FEMUR",
    "FEMUR"
  ],

  STERNUM_GIANT_SYMBOL: "STERNUM_BONUS",

  // Free spins (bonus mode): las mitades de rib (rib2..rib5) muestran uno de
  // estos símbolos gigantes por giro (arte por-rodillo en symbol-assets.js).
  // BONUS_EMPTY = rodillo vacío (a petición del usuario: un esqueleto NO está
  // garantizado en cada rodillo en cada giro; azar real por rodillo). Se
  // renderiza invisible (sin arte, sin caja, ver style.css) y nunca lleva
  // manos: las manos (overlay) solo existen emparejadas a su esqueleto en
  // OSSUARY_REEL_SYMBOL_OVERLAYS, jamás sueltas. Solo controla qué símbolo se
  // muestra en las rib durante free spins; el sternum tiene su propia lista
  // abajo. Los pesos/pagos definitivos se ajustan más adelante junto con la
  // math de free spins (hoy: reparto uniforme, 25% cada resultado).
  FREE_SPIN_RIB_SYMBOLS: ["BONUS_EMPTY", "POBRE", "NOBLE", "RICO"],

  // Pesos PROVISIONALES del sorteo por rodillo en rib2-5 (a petición del
  // usuario, 2026-07-03: los esqueletos salían demasiado a menudo — la
  // acumulación debe sentirse más gradual). Mismo patrón que
  // WEIGHTED_NORMAL_SYMBOLS: cada entrada repetida = 5% aquí (20 entradas).
  // Vacío 60% / pobre 25% / noble 10% / rico 5%. Si esta lista falta o está
  // vacía, el motor cae al reparto uniforme de FREE_SPIN_RIB_SYMBOLS (que
  // sigue siendo la lista de MEMBRESÍA para render/cortes, sin duplicados).
  WEIGHTED_FREE_SPIN_RIB_SYMBOLS: [
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY", "BONUS_EMPTY",
    "POBRE", "POBRE", "POBRE", "POBRE",
    "POBRE", "POBRE", "POBRE", "POBRE",
    "POBRE", "POBRE", "POBRE", "POBRE",
    "NOBLE", "NOBLE", "NOBLE", "NOBLE",
    "RICO", "RICO", "RICO", "RICO"
  ],

  // REDISEÑO FREE SPIN (a petición del usuario, 2026-07-05): el esternón del
  // Bonus Game ahora SOLO puede mostrar la Cuchilla (BLADE_BONUS, con video)
  // o la Cruz/X del rodillo central (STERNUM_CROSS_BONUS). La cuchilla NO está
  // garantizada cada giro. Reparto uniforme provisional (50/50); pesos
  // definitivos con la math de free spins. Solo se lee desde outcome-engine.js
  // dentro del branch state.bonusModeActive — nunca afecta al base game.
  // GUADANA_BONUS (2026-07-06, a peticion del usuario): tercer simbolo del
  // esternon en free spins. Mismas caracteristicas que la cruz (gigante de 3
  // casillas, consume la oportunidad); SIN accion propia todavia — solo sale.
  // No esta en BONUS_MODE_STERNUM_BLADE_SYMBOLS, asi que nunca dispara corte.
  BONUS_MODE_STERNUM_SYMBOLS: [
    "BLADE_BONUS",
    "STERNUM_CROSS_BONUS",
    "GUADANA_BONUS"
  ],

  // Probabilidad DINÁMICA y PROVISIONAL de la cuchilla (a petición del
  // usuario, 2026-07-03: un 25% fijo podía dar rondas "muertas" sin ninguna
  // cuchilla). La probabilidad depende de las oportunidades que el jugador
  // tenía AL PULSAR SPIN en este giro (clave del mapa): empieza alta al
  // principio de cada ciclo de 3 y baja al gastarlas. Cuando la cuchilla
  // aterriza y resetea a 3, la probabilidad vuelve sola al valor de 3/3
  // (se deriva del contador, no guarda estado propio). La cuchilla sigue
  // SIN estar garantizada y llegar a 0 sigue terminando el modo. Si este
  // mapa falta (o falta la clave), el motor cae al reparto uniforme de
  // BONUS_MODE_STERNUM_SYMBOLS.
  BONUS_MODE_BLADE_CHANCE_BY_CHANCES: {
    3: 0.55,
    2: 0.45,
    1: 0.35
  },

  // Pacing del Bonus Game normal: las dos primeras cuchillas de la sesion no
  // pueden caer todavia en 3/3. Deben esperar a que el ciclo haya creado
  // tension (2/3 o 1/3). Despues de esas dos primeras cuchillas, el sistema
  // dinamico normal vuelve a mandar sin restricciones extra.
  BONUS_MODE_BLADE_DELAYED_START: {
    PROTECTED_DROPS: 2,
    BLOCKED_CHANCES: [3]
  },

  // Símbolos del esternón que disparan la bajada de la cuchilla y el corte en
  // cadena de TODOS los esqueletos acumulados en el tablero
  // (game.js#triggerBonusModeSternumBladeCut). Hoy solo la cuchilla; se
  // añadirán más símbolos/mecánicas de esternón cuando se especifiquen.
  BONUS_MODE_STERNUM_BLADE_SYMBOLS: ["BLADE_BONUS"],

  // Esqueletos que se BLOQUEAN en el tablero al aterrizar (con sus manos) y
  // se acumulan entre giros hasta que la cuchilla los corta.
  BONUS_MODE_SKELETON_SYMBOLS: ["POBRE", "NOBLE", "RICO"],

  // Esqueletos "DE PASO" durante el giro de los rodillos laterales del Bonus
  // Game (a petición del usuario, 2026-07-03: el fondo negro hacía que los
  // rodillos se sintieran vacíos y el símbolo apareciera de golpe al final).
  // PURAMENTE VISUAL: bloques gigantes (mismo arte pobre/noble/rico CON manos)
  // que cruzan el rodillo a velocidad de crucero y salen de la vista antes del
  // aterrizaje — NUNCA cuentan como resultado, NUNCA se bloquean, NUNCA pagan,
  // y se generan con Math.random (no con el RNG del motor: cero sorteos extra,
  // el outcome real no cambia ni un bit). Solo en free spins (bonus mode).
  BONUS_MODE_PASSING_SKELETONS: {
    // Probabilidad de que cada hueco candidato de la tira lleve un esqueleto.
    CHANCE: 0.55,
    // Separación entre huecos candidatos, en celdas (aleatoria en el rango).
    MIN_GAP_UNITS: 5,
    MAX_GAP_UNITS: 9,
    // Reparto visual (solo estética del giro, sin relación con el outcome).
    WEIGHTED_SYMBOLS: ["POBRE", "POBRE", "POBRE", "NOBLE", "NOBLE", "RICO"]
  },

  // Anticipacion SOLO VISUAL en el rodillo central durante free spins:
  // durante el crucero pasan de forma aleatoria la cuchilla y la cruz/X, con
  // huecos reales entre bloques para que el sternum respire visualmente y no
  // se lea como una cinta totalmente llena. PURAMENTE VISUAL: no afecta JAMAS
  // al outcome real.
  BONUS_MODE_PASSING_BLADE: {
    CHANCE: 0.62,
    MIN_GAP_UNITS: 4,
    MAX_GAP_UNITS: 7,
    WEIGHTED_SYMBOLS: [
      "BLADE_BONUS",
      "BLADE_BONUS",
      "STERNUM_CROSS_BONUS",
      "STERNUM_CROSS_BONUS",
      "STERNUM_CROSS_BONUS",
      "GUADANA_BONUS"
    ]
  },

  // Velocidad de crucero especifica del sternum durante el Bonus Game normal.
  // Mas baja que el resto para que la cuchilla y la cruz/X se lean con mas
  // fluidez mientras cruzan el rodillo central.
  BONUS_MODE_STERNUM_CRUISE_SPEED_MULTIPLIER: 0.86,

  // Tension visual del sternum durante el Bonus Game normal: solo cambia la
  // PRESENTACION (escala/impacto/tiempo extra de crucero del rodillo
  // central), nunca el outcome. 3/3 sigue neutro; 2/3 y 1/3 escalan.
  BONUS_MODE_STERNUM_TENSION: {
    MID_CRUISE_EXTRA_MS: 500,
    HIGH_CRUISE_EXTRA_MS: 1050
  },

  // Valor de cada esqueleto al ser cortado por la cuchilla, en múltiplos de la
  // apuesta ACTUAL del jugador (siempre relativo a la apuesta, nunca fijo). El
  // premio del corte es (suma de valores de los esqueletos cortados) ×
  // multiplicador de la cuchilla — ver game.js#buildBonusModeBladePayoutRows.
  BONUS_MODE_SKELETON_PRIZES: {
    POBRE: 0.20,
    NOBLE: 0.50,
    RICO: 1.00
  },

  // DESACTIVADO (rediseño FREE SPIN 2026-07-03): la mecánica temporal
  // anterior del esternón (positivo/negativo + multiplicadores x5..x100) ya
  // NO participa en el Bonus Game. Se conservan las listas (y su arte
  // placeholder en symbol-assets.js) porque algunas de estas ideas podrían
  // reutilizarse más adelante; ningún código del motor las lee hoy.
  LEGACY_BONUS_MODE_STERNUM_SYMBOLS: [
    "POSITIVE_BONUS",
    "NEGATIVE_BONUS",
    "MULT_X5",
    "MULT_X10",
    "MULT_X25",
    "MULT_X50",
    "MULT_X100"
  ],
  LEGACY_BONUS_MODE_STERNUM_POSITIVE_SYMBOLS: [
    "POSITIVE_BONUS",
    "MULT_X5",
    "MULT_X10",
    "MULT_X25",
    "MULT_X50",
    "MULT_X100"
  ],

  RIB_GIANT_CHANCE: 0.16,
  RIB_GIANT_BONUS_SHARE: 0.42,
  STERNUM_BONUS_CHANCE: 0.16,

  // Peso de BONUS_RIB durante RIBCAGE_BUILD_MODE. Separado en dos valores:
  // REAL es el que usa el motor de juego real (desactivado, weight=1 = sin
  // boost, strip normal). SIMULATION es solo para el simulador/debug
  // offline y no debe leerse desde el motor real.
  RIBCAGE_BUILD_BONUS_RIB_WEIGHT_REAL: 1,
  RIBCAGE_BUILD_BONUS_RIB_WEIGHT_SIMULATION: 10,

  RIB_BONUS_REELS: ["rib1", "rib2-left", "rib2-right", "rib3-left", "rib3-right"],

  // Ordered outcome sequence for BONUS RIB. Probability is still derived from
  // RIB_GIANT_CHANCE * RIB_GIANT_BONUS_SHARE per available rib; the engine
  // counts successes first, then maps that count to a prefix of this list.
  // Valid outcomes are none, first rib, first two ribs, ... up to all five.
  RIB_BONUS_SEQUENCE: ["rib1", "rib2-left", "rib2-right", "rib3-left", "rib3-right"],

  BONUS_RIB_TRIGGER_GROUPS: [
    { id: "RIB_REEL_1", label: "Rib Reel 1", reelIds: ["rib1"] },
    { id: "RIB_REEL_2_LEFT", label: "Rib Reel 2 left", reelIds: ["rib2-left"] },
    { id: "RIB_REEL_2_RIGHT", label: "Rib Reel 2 right", reelIds: ["rib2-right"] },
    { id: "RIB_REEL_3_LEFT", label: "Rib Reel 3 left", reelIds: ["rib3-left"] },
    { id: "RIB_REEL_3_RIGHT", label: "Rib Reel 3 right", reelIds: ["rib3-right"] }
  ],

  BONUS_TRIGGER_STATES: {
    BONUS: {
      id: "BONUS",
      label: "BONUS",
      announcement: "BONUS TRIGGERED"
    },
    SUPER_BONUS: {
      id: "SUPER_BONUS",
      label: "SUPER BONUS",
      announcement: "SUPER BONUS TRIGGERED"
    }
  },

  GIANT_DEBUG_TESTS: {
    BONUS_RIB_PASS: {
      reelId: "rib2-left",
      symbol: "RIB_BONUS",
      landing: false,
      label: "BONUS RIB PASS"
    },
    BONUS_RIB_LAND: {
      landingSymbols: {
        rib1: "RIB_BONUS",
        "rib2-left": "RIB_BONUS",
        "rib2-right": "RIB_BONUS",
        "rib3-left": "RIB_BONUS",
        "rib3-right": "RIB_BONUS"
      },
      landing: true,
      label: "5 BONUS RIB TRIGGER TEST"
    },
    SUPER_BONUS_PASS: {
      reelId: "sternum",
      symbol: "STERNUM_BONUS",
      landing: false,
      label: "SUPER BONUS PASS"
    }
  }
};
