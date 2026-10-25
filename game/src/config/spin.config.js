window.OSSUARY_SPIN_CONFIG = {
  BET_STEPS: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 50, 100],

  // Base spin timing. Outcome selection stays outside animation: these values
  // only control start, cruise, landing preparation, deceleration, and settle.
  ACCELERATION_TIME: 180,
  MAX_REEL_SPEED: 9.0,
  // Cruise speed is intentionally independent from MAX_REEL_SPEED; the engine
  // uses it as the continuous visual speed before each reel begins landing.
  CRUISE_SPEED: 21.805,
  CRUISE_TIME: 170,
  BONUS_RESPIN_CRUISE_SPEED_MULTIPLIER: 1.5,
  BONUS_RESPIN_RIB23_CRUISE_SPEED_MULTIPLIER: 1.75,
  BONUS_RESPIN_EXTRA_CRUISE_MS: 3000,
  SUPER_BONUS_TRANSITION_CRUISE_SPEED_MULTIPLIER: 2,
  SUPER_BONUS_TRANSITION_DURATION_MS: 3500,
  PREPARE_LANDING_TIME: 120,
  DECELERATION_TIME: 470,
  STOP_OVERSHOOT_SYMBOLS: 0.145,
  STOP_REBOUND_SYMBOLS: 0.05,
  SETTLE_TIME: 70,
  BASE_STOP_SEQUENCE: {
    rib1: 0,
    rib2: 680,
    rib3: 480,
    rib4: 300,
    rib5: 260,
    sternum: 260
  },

  // Initial symbol-only windup. It stays inside the acceleration window and
  // fades back to zero before normal forward motion takes over.
  WINDUP_TIME: 128,
  WINDUP_PEAK_SPEED: 4.8,

  AUTO_SPIN_DELAY: 900,
  VISIBLE_TILE_RADIUS: 2,
  SYMBOL_STEP_PERCENT: 112,
  GIANT_POOL_SIZE: 6,
  GIANT_BLOCK_AMBIENT_CHANCE: 0.1,

  // --- Mecánica del rodillo (textura + chasis) ---------------------------
  // Sensación de pieza física con masa. Todo el efecto se apaga poniendo
  // estos valores a 0. Ver src/render/reel-texture-renderer.js.
  // Fracción del desplazamiento de los símbolos que hereda la textura
  // durante el giro normal (accelerating/cruising/decelerating). 0 = textura
  // completamente estable hasta el asentamiento (comportamiento actual).
  REEL_TEXTURE_PARALLAX: 0,
  // Acoplamiento de la textura SOLO durante el settle (1.0 = se mueve 1:1
  // con el rebote de los símbolos). Es un escalón, no una rampa: no hay
  // re-acoplamiento progresivo durante la decel.
  REEL_TEXTURE_DECEL_RECOUPLE: 1.0,
  // Easing aplicado dentro del propio settle (se reutiliza si en el futuro
  // se quisiera suavizar la entrada al settle; con el escalón actual no
  // tiene efecto perceptible).
  TEXTURE_RECOUPLE_EASING: "easeOutCubic",
  // Tope (px) del micro-desplazamiento del chasis, SOLO durante el settle.
  CHROME_SETTLE_MAX_PX: 2.5,
  // Brillo del chasis: eliminado (se veía como efecto de interfaz, no como
  // pieza física). Renderer ya no aplica filter; valor en 0 por documentación.
  CHROME_SETTLE_BRIGHTNESS: 0,
  // Invierte la dirección visual del muelle (chasis + textura + símbolos)
  // SOLO durante el settle, para el rodillo indicado. No toca scrollSign
  // (dirección real del giro/scroll, lógica de juego intacta). Puramente
  // cosmético: aplicado por reel-texture-renderer.js y reel-renderer.js.
  SETTLE_SPRING_SIGN_OVERRIDE: {}
};
