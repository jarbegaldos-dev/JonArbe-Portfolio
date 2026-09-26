// Capas semanticas de FX, ordenadas de fondo a frente.
// zIndex es el valor por defecto de la capa; cada efecto puede
// sobreescribirlo con su propio campo "zIndex" si hace falta.
window.OSSUARY_FX_LAYERS = {
  "background-fx": { zIndex: 0 },
  "ambient-fx": { zIndex: 1 },
  "structure-back-fx": { zIndex: 2 },
  "structure-front-fx": { zIndex: 3 },
  "reel-fx": { zIndex: 4 },
  "lock-fx": { zIndex: 5 },
  "bonus-fx": { zIndex: 6 },
  "ui-fx": { zIndex: 7 },
  "fullscreen-fx": { zIndex: 8 }
};

// Configuracion declarativa por efecto.
//
// Fase FX-5 Paso 1: solo infraestructura. Sin efectos nuevos todavia.
// eyes-glow-test sigue funcionando con su archivo manual
// (src/fx/effects/glow/eyes-glow-test.fx.js) hasta el Paso 2, cuando se
// migre a una entrada de este array.
//
// Forma que tendra una entrada (ejemplo, no activo):
//
// {
//   id: "eyes-glow-test",
//   type: "css",            // css | webm-alpha | canvas | svg | remotion-export
//   assetPath: null,
//   anchor: "skull-top-eyes",
//   offset: { x: 0, y: 0 },
//   scale: 1,
//   opacity: 1,
//   blendMode: "normal",
//   layer: "structure-front-fx",
//   zIndex: null,           // null = usa el default de la capa
//   loop: true,
//   duration: null,
//   scope: null,
//   responsive: { hideBelowWidth: null, scaleWithStage: true },
//   enabled: true
// }

// Generador generico: una entrada de efecto por cada anchor de la lista,
// todas compartiendo el mismo visualId (= misma clase CSS) y la misma
// configuracion base. No sabe nada de costillas ni de bonus: solo expande
// una lista de anchors en N entradas casi identicas. Reutilizable para
// cualquier futuro efecto que necesite una instancia por costilla/anchor
// (por ejemplo, el futuro efecto de energia viajando por la costilla).
function buildPerAnchorCssEffects(visualId, anchorIds, baseConfig) {
  return anchorIds.map(function (anchorId) {
    var entry = {};
    Object.keys(baseConfig).forEach(function (key) {
      entry[key] = baseConfig[key];
    });
    entry.id = visualId + "-" + anchorId;
    entry.visualId = visualId;
    entry.anchor = anchorId;
    return entry;
  });
}

// Generador generico para type:"trajectory": una entrada por cada anchor
// origen de la lista, todas con el mismo target y el mismo visualId (=
// misma clase CSS). idPrefix y visualId se pasan por separado porque en
// trajectory no tienen por que coincidir (ej. id "rib-energy-path-rib1"
// pero visualId compartido "energy-trajectory"). No sabe nada de
// costillas/bonus: solo expande origenes en N entradas casi identicas.
function buildSourceToTargetTrajectoryEffects(idPrefix, visualId, sourceAnchorIds, target, baseConfig) {
  return sourceAnchorIds.map(function (sourceAnchorId) {
    var entry = {};
    Object.keys(baseConfig).forEach(function (key) {
      entry[key] = baseConfig[key];
    });
    entry.id = idPrefix + "-" + sourceAnchorId;
    entry.visualId = visualId;
    entry.source = sourceAnchorId;
    entry.target = target;
    return entry;
  });
}

// Costillas con cobertura de brillo persistente. Parte de las costillas
// validas para BONUS NORMAL (symbols.config.js, no se duplican aqui) y
// suma rib4-left/rib4-right: no son objetivo de lock todavia, pero ya
// tienen anchor real en layout.config.js y se quiere su cobertura visual
// completa desde ya.
var RIB_GLOW_ANCHORS = ((window.OSSUARY_SYMBOL_CONFIG && window.OSSUARY_SYMBOL_CONFIG.RIB_BONUS_REELS) || [])
  .concat(["rib4-left", "rib4-right"]);

window.OSSUARY_FX_EFFECTS = [
  {
    // ELIMINADO a peticion del usuario (2026-07-03): los ojos verdes de la
    // calavera ya no se activan en gameplay. enabled:false hace que
    // effect-factory.js ni siquiera lo registre; sus reglas de activacion
    // (bonus:lock-updated -> lockedRibCount) se quitaron de
    // fx-rules.config.js a la vez. La entrada se conserva como referencia
    // por si en el futuro se quiere un efecto nuevo en el mismo anchor.
    id: "skull-eyes-glow",
    type: "webm-alpha",
    assetPath: "assets/effects/skull_eyes_alpha.webm",
    audioPath: "assets/audio/skull_eyes_activation.ogg",
    anchor: "skull-top-eyes",
    offset: { x: 0, y: 0 },
    scale: 1,
    opacity: 1,
    blendMode: "normal",
    layer: "structure-front-fx",
    zIndex: null,
    loop: true,
    duration: null,
    scope: "bonus-session",
    responsive: { hideBelowWidth: null, scaleWithStage: true },
    enabled: false
  }
].concat(
  // ELIMINADO a peticion del usuario (2026-07-03): las marcas verdes
  // persistentes de costilla bloqueada (rib-glow) ya no se muestran.
  // enabled:false + reglas quitadas de fx-rules.config.js (mismo patron
  // que skull-eyes-glow arriba). El destello puntual al caer el simbolo
  // (rib-energy) y la luz que viaja (rib-energy-path) SI se mantienen,
  // recoloreados a azul oscuro en style.css.
  buildPerAnchorCssEffects("rib-glow", RIB_GLOW_ANCHORS, {
    type: "css",
    assetPath: null,
    offset: { x: 0, y: 0 },
    scale: 1,
    opacity: 0.65,
    blendMode: "screen",
    layer: "lock-fx",
    zIndex: null,
    loop: true,
    duration: null,
    scope: "bonus-session",
    responsive: { hideBelowWidth: null, scaleWithStage: true },
    enabled: false
  })
).concat(
  // Destello temporal al bloquear una costilla nueva (bonus:rib-locked).
  // Mismas costillas que rib-glow, efecto totalmente independiente: no
  // sustituye ni toca el brillo persistente.
  buildPerAnchorCssEffects("rib-energy", RIB_GLOW_ANCHORS, {
    type: "css",
    assetPath: null,
    offset: { x: 0, y: 0 },
    scale: 1,
    opacity: 1,
    blendMode: "screen",
    layer: "lock-fx",
    zIndex: null,
    loop: false,
    duration: 280,
    scope: "bonus-session",
    responsive: { hideBelowWidth: null, scaleWithStage: true },
    enabled: true
  })
).concat(
  // Fase 2 del sistema trajectory-fx: una trayectoria por cada costilla
  // bloqueable, todas hacia skull-top-eyes, mismo style "energy". Sin
  // ajuste estetico todavia (eso es un paso aparte). El rib-energy local
  // (type:"css", visualId "rib-energy") sigue intacto y activo en
  // paralelo hasta confirmar que este sistema funciona.
  buildSourceToTargetTrajectoryEffects("rib-energy-path", "energy-trajectory", RIB_GLOW_ANCHORS, "skull-top-eyes", {
    type: "trajectory",
    style: "energy",
    color: null,
    intensity: 1,
    duration: 280,
    loop: false,
    scope: "bonus-session",
    layer: "lock-fx",
    zIndex: null,
    enabled: true
  })
);
