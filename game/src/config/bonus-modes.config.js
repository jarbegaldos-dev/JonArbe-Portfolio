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
  }
};
