window.OSSUARY_BONUS_MODE_CONFIG = {
  modes: {
    // REDISEÑO FREE SPIN (a petición del usuario, 2026-07-03): el Bonus Game
    // normal ya NO se basa en un número fijo de giros (antes awardedSpins: 10,
    // desactivado). Ahora awardedSpins = OPORTUNIDADES RESTANTES (3): cada giro
    // sin cuchilla consume 1; la cuchilla RESETEA el contador a este máximo
    // (nunca lo suma, ver bonus-mode-runtime.js#restoreSpins); al llegar a 0 el
    // modo termina inmediatamente. El modo pasa a llamarse "FREE SPIN".
    NORMAL_BONUS: {
      id: "NORMAL_BONUS",
      label: "FREE SPIN",
      kind: "FREE_SPINS",
      awardedSpins: 3,
      rulesProfile: "bonus_base_placeholder",
      autoStart: false,
      enabled: true
    },
    SUPER_BONUS: {
      id: "SUPER_BONUS",
      label: "SUPER BONUS",
      kind: "FREE_SPINS",
      awardedSpins: 15,
      rulesProfile: "super_bonus_placeholder",
      autoStart: false,
      enabled: false
    }
  },

  // Mejoras del Execution Bonus (a peticion del usuario, 2026-10-16: "mas
  // dopamina, mas tension, alguna mecanica que haga ganar mas"). Numeros
  // PROVISIONALES hasta las matematicas (RTP en pausa). Las tiradas salen del
  // RNG del motor (src/bonus/execution-enhancers.js); la presentacion, de
  // src/fx/execution-tension.js.
  executionEnhancers: {
    // MARCA DE SANGRE: al caer la guillotina con esqueletos que cortar, a
    // veces la hoja sangra y sortea un multiplicador solo para ESE corte, que
    // se multiplica con el de la caja de manos (caja x5 y marca x3 = x15).
    // 2026-10-16 ("pocas veces se gana muchisimo"): 20% de los cortes y
    // x25/x50/x100 raros (antes 18% y solo x2/x3/x5/x10). Media de la marca
    // ~x6.5 cuando sale.
    bloodMark: {
      enabled: true,
      chance: 0.2,
      minSkeletons: 1,
      multipliers: [
        { value: 2, weight: 40 },
        { value: 3, weight: 26 },
        { value: 5, weight: 18 },
        { value: 10, weight: 10 },
        { value: 25, weight: 4.5 },
        { value: 50, weight: 2 },
        { value: 100, weight: 1 }
      ]
    },
    // ULTIMO ALIENTO: si se apaga la ultima vela con esqueletos en el tablero
    // (lo que se perderia), oscuridad y espera; a veces el verdugo enciende
    // otra vela: una oportunidad mas. Como mucho dos veces por bonus (la
    // segunda, mas dificil). Sin esqueletos en el tablero no hay espera.
    lastBreath: {
      enabled: true,
      minSkeletons: 1,
      chanceByUse: [0.35, 0.15],
      spins: 1
    }
  }
};
