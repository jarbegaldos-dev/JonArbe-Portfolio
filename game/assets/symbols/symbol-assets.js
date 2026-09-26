window.OSSUARY_SYMBOL_ASSETS = {
  CROWNED_SKULL: "assets/symbols/small-blade.png",
  DARK_HEART: "assets/symbols/petrified-heart.png",
  ANCIENT_GOLD_COIN: "assets/symbols/gold-coin.png",
  VERTEBRA: "assets/symbols/bird.png",
  FEMUR: "assets/symbols/broken-bone.png",
  WILD: "assets/symbols/wild.png",
  SILVER_COIN: "assets/symbols/silver-coin.png",
  ANCESTRAL_SKULL: "assets/symbols/ancestral-skull.png",
  RIB_BONUS: null,
  STERNUM_BONUS: null,
  // Bonus Game (free spins) esternon - REDISEÑO FREE SPIN (2026-07-03): el
  // unico simbolo activo del esternon es la Cuchilla (BLADE_BONUS),
  // PLACEHOLDER temporal hasta que el usuario entregue el arte final - solo
  // reemplazar esta ruta cuando llegue el diseño definitivo, nada mas del
  // motor cambia. Al aterrizar dispara la bajada de la cuchilla y el corte de
  // todos los esqueletos acumulados (game.js#triggerBonusModeSternumBladeCut).
  BLADE_BONUS: "assets/symbols/blade-bonus-freespins-runtime.jpg",
  // Simbolo "X" / puerta cerrada del sternum para los free spins. Sustituye
  // al vacio anterior SOLO en el rodillo central; ocupa las 3 casillas del
  // sternum igual que la cuchilla, pero no lleva video ni dispara corte.
  STERNUM_CROSS_BONUS: "assets/symbols/sternum-cross-bonus.png",
  // Simbolo Guadana del sternum en free spins (2026-07-06). Mismo sistema que
  // la cruz: gigante de 3 casillas, sin video, SIN accion todavia (solo sale).
  // PLACEHOLDER sin arte (null => se renderiza la etiqueta de texto); poner
  // aqui la ruta cuando el usuario entregue el diseño final.
  GUADANA_BONUS: "assets/symbols/guadana-bonus.jpg",
  // DESACTIVADOS (rediseño FREE SPIN): positivo/negativo y multiplicadores ya
  // no participan en el Bonus Game (ver LEGACY_* en symbols.config.js). Se
  // conservan las rutas/PNGs por si estas ideas se reutilizan mas adelante.
  POSITIVE_BONUS: "assets/symbols/positive-bonus-placeholder.png",
  NEGATIVE_BONUS: "assets/symbols/negative-bonus-placeholder.png",
  MULT_X5: "assets/symbols/mult-x5-placeholder.png",
  MULT_X10: "assets/symbols/mult-x10-placeholder.png",
  MULT_X25: "assets/symbols/mult-x25-placeholder.png",
  MULT_X50: "assets/symbols/mult-x50-placeholder.png",
  MULT_X100: "assets/symbols/mult-x100-placeholder.png",
  // Bonus Game (free spins) rib2-5: resultado "vacio" (sin esqueleto ni
  // manos). Sin arte a proposito: se renderiza invisible via style.css
  // ([data-symbol="BONUS_EMPTY"]), no es un asset pendiente.
  BONUS_EMPTY: null
};

window.OSSUARY_REEL_SYMBOL_ASSETS = {
  "rib1": {
    RIB_BONUS: "assets/symbols/rib1-rib-bonus.png?v=20260702-rib1"
  },
  // Arte principal del símbolo gigante RIB_BONUS en rib2/rib3 (a petición del
  // usuario). Mismo diseño (brazo/esqueleto) en las 4 mitades; en las mitades
  // izquierdas se usa la versión reflejada horizontalmente (rib2-rib3-bonus-mirror.png)
  // para que el brazo apunte hacia el centro de la caja torácica en ambos lados.
  "rib2-left": {
    RIB_BONUS: "assets/symbols/rib2-rib3-bonus-mirror.png"
  },
  "rib2-right": {
    RIB_BONUS: "assets/symbols/rib2-rib3-bonus.png"
  },
  "rib3-left": {
    RIB_BONUS: "assets/symbols/rib2-rib3-bonus-mirror.png"
  },
  "rib3-right": {
    RIB_BONUS: "assets/symbols/rib2-rib3-bonus.png"
  }
};

// Capa de fondo (detrás del icono/arte normal) para el símbolo gigante RIB_BONUS.
// Mismo fondo compartido en rib2 y rib3 (ambas mitades izquierda/derecha), a
// petición del usuario: solo el fondo por ahora, el icono en primer plano se
// mantiene igual (arte existente o placeholder según el rodillo).
window.OSSUARY_REEL_SYMBOL_BACKGROUNDS = {
  "rib2-left": {
    RIB_BONUS: "assets/symbols/rib2-rib3-bonus-bg.png"
  },
  "rib2-right": {
    RIB_BONUS: "assets/symbols/rib2-rib3-bonus-bg.png"
  },
  "rib3-left": {
    RIB_BONUS: "assets/symbols/rib2-rib3-bonus-bg.png"
  },
  "rib3-right": {
    RIB_BONUS: "assets/symbols/rib2-rib3-bonus-bg.png"
  }
};

// Sobre-imagen (overlay) que se pinta SIEMPRE encima del arte base de un símbolo
// gigante y solo cubre la casilla INTERIOR (la más cercana al centro/esternón).
// Resuelto por symbol-renderer.js#getSymbolOverlayAsset (solo por rodillo, sin
// fallback global): un reel sin entrada aquí no se ve afectado.
window.OSSUARY_REEL_SYMBOL_OVERLAYS = {};

// Capa de CABEZA (2026-07-06, a peticion del usuario) de los esqueletos de free
// spins: cada esqueleto sale SIEMPRE en conjunto (cuerpo + manos + su cabeza).
// Mismo canvas 924x500 y mismo sistema de coordenadas que el arte base y las
// manos: la transparencia del PNG ES la alineacion (puzle que encaja), asi que
// se pinta en la misma caja sin recortes, solo el escalado natural del bloque.
// El espejo de las mitades -left lo resuelve style.css (scaleX(-1)), igual que
// el resto de capas. Resuelto por symbol-renderer.js#getSymbolHeadOverlayAsset.
window.OSSUARY_REEL_SYMBOL_HEAD_OVERLAYS = {};

// Video overlay opcional que se monta ENCIMA del arte estatico del simbolo.
// En el sternum del Bonus Game, la imagen fija del BLADE_BONUS sigue siendo la
// base segura del primer frame y el video arranca sobre ella en loop, sin
// pausar, hasta que el simbolo desaparece al siguiente giro. El simbolo
// alternativo STERNUM_CROSS_BONUS usa solo imagen fija (sin video).
window.OSSUARY_REEL_SYMBOL_VIDEO_OVERLAYS = {
  sternum: {
    BLADE_BONUS: {
      assetPath: "assets/symbols/blade-bonus-freespins-overlay.mp4",
      loop: true,
      muted: true
    }
  }
};

// Símbolos de free spins (bonus) pobre/noble/rico. Cada uno ocupa las 2 casillas
// de una mitad de rib (rib2..rib5, izquierda y derecha) como un único bloque
// gigante, igual mecanismo que el RIB_BONUS. El arte base es el mismo en las 4
// filas; el espejo de las mitades IZQUIERDAS se hace por CSS (scaleX(-1)), no con
// archivos duplicados. Base art y overlay (manos) son PNG de 924x500 con el mismo
// canvas/sistema de coordenadas (margen transparente incluido) — el overlay se
// pinta siempre encima, en la misma caja que el arte base, sin recorte ni ratio
// alguno: el margen transparente ya alinea las manos con el esqueleto. Pobre y
// noble comparten overlay (manos de bronce), rico tiene el suyo (manos doradas).
// Puramente visual: no toca RNG/strips/outcome/locks.
(function () {
  var BONUS_FREESPIN_REELS = [
    "rib2-left", "rib2-right",
    "rib3-left", "rib3-right",
    "rib4-left", "rib4-right",
    "rib5-left", "rib5-right"
  ];
  var BASE_ART = {
    POBRE: "assets/symbols/pobre.png",
    NOBLE: "assets/symbols/noble.png",
    RICO: "assets/symbols/rico.png",
    // Resultado VACIO de rib2-5: el cepo de madera SIN esqueleto (mismo mueble
    // que pobre/noble/rico pero deshabitado). Mismo canvas 924x500 que los
    // esqueletos, asi que alinea exacto y comparte el espejo por CSS de las
    // mitades -left. Solo se mapea aqui (rib2-5), nunca en el sternum: su
    // BONUS_EMPTY sigue sin arte (null global) y se mantiene invisible. No
    // lleva overlay (sin manos) y no toca RNG/strips/outcome/pago/locks.
    BONUS_EMPTY: "assets/symbols/cepo_vacio.png"
  };
  var OVERLAY_ART = {
    POBRE: "assets/symbols/manos-pobre.png",
    NOBLE: "assets/symbols/manos-pobre.png",
    RICO: "assets/symbols/manos-rico.png"
  };
  // Cabezas: cada esqueleto con su pareja exacta (pobre=calavera desnuda,
  // noble=corona dorada, rico=sombrero de copa con pluma, ver 13.png de
  // referencia del usuario). Mismo canvas que BASE_ART/OVERLAY_ART.
  var HEAD_ART = {
    POBRE: "assets/symbols/cabeza-pobre.png",
    NOBLE: "assets/symbols/cabeza-noble.png",
    RICO: "assets/symbols/cabeza-rico.png"
  };
  BONUS_FREESPIN_REELS.forEach(function (reelId) {
    var base = window.OSSUARY_REEL_SYMBOL_ASSETS[reelId] ||
      (window.OSSUARY_REEL_SYMBOL_ASSETS[reelId] = {});
    Object.keys(BASE_ART).forEach(function (sym) { base[sym] = BASE_ART[sym]; });

    var overlay = window.OSSUARY_REEL_SYMBOL_OVERLAYS[reelId] ||
      (window.OSSUARY_REEL_SYMBOL_OVERLAYS[reelId] = {});
    Object.keys(OVERLAY_ART).forEach(function (sym) { overlay[sym] = OVERLAY_ART[sym]; });

    var head = window.OSSUARY_REEL_SYMBOL_HEAD_OVERLAYS[reelId] ||
      (window.OSSUARY_REEL_SYMBOL_HEAD_OVERLAYS[reelId] = {});
    Object.keys(HEAD_ART).forEach(function (sym) { head[sym] = HEAD_ART[sym]; });
  });
})();
