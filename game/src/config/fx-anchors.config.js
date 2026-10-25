// Anchors decorativos puros (no son geometria de reels).
//
// Los anchors de reels (rib1, rib2-left, rib2-right, rib3-left, rib3-right,
// sternum) NO se definen aqui: se derivan en tiempo de ejecucion desde
// window.OSSUARY_LAYOUT_CONFIG (RIB_LAYOUT / STERNUM_LAYOUT) por
// src/fx/fx-position-resolver.js, para no duplicar geometria que pertenece
// a layout.config.js.
//
// Coordenadas en porcentaje (0-100) relativas a #slotStage.
window.OSSUARY_FX_ANCHORS = {
  "skull-top-eyes": { x: 50, y: 14 },
  "skull-bottom": { x: 50, y: 38 },
  "full-screen": { x: 50, y: 50 },
  "background": { x: 50, y: 50 },
  "foreground": { x: 50, y: 50 }
};
