// Registro generico de animaciones de victoria por simbolo. No sabe nada de
// game.js ni del motor de pagos: solo mapea symbolKey -> datos de la
// animacion (asset webm con alfa real + ajuste de encuadre dentro de la
// celda). Pensado para que futuros simbolos animados se añadan aqui sin
// tocar ningun otro archivo.
//
// Campos:
//   assetPath          ruta al webm VP9 con canal alfa (loop:false, un solo
//                       disparo).
//   minCount           umbral de apariciones en la grilla a partir del cual
//                       este simbolo se considera "ganador" para disparar la
//                       animacion (informativo: el disparo real se decide
//                       comparando contra getSymbolPayBreakdown, que ya
//                       aplica el umbral real de cada regla de pago).
//   scale              factor de escala aplicado al <video> dentro de la
//                       celda (transform: scale), para que el objeto dentro
//                       del video ocupe la misma proporcion visual que ocupa
//                       el arte dentro del PNG estatico equivalente.
//   offsetXPercent /
//   offsetYPercent     desplazamiento (en % del propio elemento, via
//                       transform: translate) para recentrar el objeto del
//                       video sobre el centro de la celda.
//   fallbackDurationMs tope de seguridad: si el evento "ended" del video no
//                       llega (error de carga, codec no soportado, etc.) la
//                       animacion se da por finalizada igualmente tras este
//                       tiempo, para no congelar el flujo del juego.
//
// NOTA sobre scale/offset: calculados comparando la caja del craneo (bbox
// alfa) dentro del video original contra la caja del arte dentro del PNG
// estatico (ver assets/symbols/ancestral-skull.png). Son un punto de partida
// calculado, no un ajuste pixel-perfect verificado en pantalla: usar
// window.OssuaryWinSymbolDebug.toggleStatic() para comparar en vivo PNG vs
// video en la celda real y afinar estos numeros si hace falta.
window.OSSUARY_SYMBOL_WIN_ANIMATIONS = {
  ANCESTRAL_SKULL: {
    assetPath: "assets/symbols/animations/ancestral_skull_win_alpha.webm",
    playWinAnimation: false,
    minCount: 3,
    connectionDirection: "LEFT_TO_RIGHT",
    consecutiveReelsOnly: true,
    triggerCondition: "PAYING_CONNECTED_PATH",
    connectionMode: "CONNECTED_PATH",
    connectionTolerancePx: 12,
    columnClusterGapPx: 75,
    payMultipliers: {
      3: 2,
      4: 5,
      5: 10
    },
    scale: 1.60,
    offsetXPercent: -3.4,
    offsetYPercent: 17.6,
    fallbackDurationMs: 6000
  }
};
