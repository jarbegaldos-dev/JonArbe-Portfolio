window.OSSUARY_REEL_TEXTURE = {
  horizontal: "assets/textures/fondo_reel.jpeg",
  vertical: "assets/textures/fondo_reel_vertical.jpeg"
};

window.OSSUARY_SCENE_GROUPS = [
  { id: "base", label: "Fondo principal", wrapped: false },
  { id: "structure", label: "Estructura osea", wrapped: false },
  { id: "ambient", label: "Ambiente", wrapped: true },
  { id: "bonus_fx", label: "Efectos de bonus", wrapped: true },
  { id: "fx_future", label: "FX futuros", wrapped: true }
];

window.OSSUARY_SCENE_LAYERS = [
  {
    id: "background_base",
    group: "base",
    label: "Fondo principal",
    class: "scene-layer scene-layer--base",
    src: "assets/backgrounds/background_base.mp4",
    type: "video"
  },
  {
    // Fondo alternativo del Bonus Game FREE SPIN normal. Se monta oculto
    // desde el arranque (misma capa "base", mismo tratamiento visual que
    // background_base) para que su <video autoplay loop> nunca deje de
    // reproducirse: game.js solo alterna `hidden` entre los dos fondos al
    // entrar/salir del bonus (ver OssuarySceneManager.setBonusBackgroundActive),
    // nunca los pausa ni los reinicia.
    id: "background_bonus_freespins",
    group: "base",
    label: "Fondo Bonus FREE SPIN",
    class: "scene-layer scene-layer--base",
    src: "assets/backgrounds/background_bonus_freespins.mp4",
    type: "video",
    hidden: true
  },
  {
    id: "volatility_panel",
    group: "ambient",
    label: "Panel de volatilidad",
    class: "scene-layer scene-layer--volatility",
    src: "assets/ambient/volatility_panel.webp"
  },
  {
    id: "crow_right",
    group: "ambient",
    label: "Cuervo",
    class: "scene-layer scene-layer--crow-right",
    src: "assets/ambient/crow_right.webp"
  },
  {
    id: "skulls",
    group: "ambient",
    label: "Calaveras",
    class: "scene-layer scene-layer--skulls",
    src: "assets/ambient/skulls.webp"
  },
  {
    id: "smoke",
    group: "ambient",
    label: "Niebla",
    class: "scene-layer scene-layer--smoke",
    src: "assets/ambient/smoke.webp"
  },
  {
    id: "embers",
    group: "ambient",
    label: "Brasas",
    class: "scene-layer scene-layer--embers",
    src: "assets/ambient/embers.webp"
  },
  {
    id: "bonus_warning_glow",
    group: "bonus_fx",
    label: "Aviso de bonus cercano",
    class: "scene-layer scene-layer--bonus-warning",
    src: "assets/bonus_fx/bonus_warning_glow.webp",
    bonusFx: "near_bonus",
    hidden: true
  },
  {
    id: "sternum_pulse",
    group: "bonus_fx",
    label: "Pulso de esternon (bonus)",
    class: "scene-layer scene-layer--sternum-pulse",
    src: "assets/bonus_fx/sternum_pulse.webp",
    bonusFx: "bonus",
    hidden: true
  },
  {
    id: "rib_glow",
    group: "bonus_fx",
    label: "Brillo de costilla (super bonus)",
    class: "scene-layer scene-layer--rib-glow",
    src: "assets/bonus_fx/rib_glow.webp",
    bonusFx: "super_bonus",
    hidden: true
  },
  {
    id: "super_bonus_fx",
    group: "bonus_fx",
    label: "Super bonus plus",
    class: "scene-layer scene-layer--super-bonus-fx",
    src: "assets/bonus_fx/super_bonus_fx.webp",
    bonusFx: "super_bonus_plus",
    hidden: true
  },
  {
    id: "ribcage_overlay_top",
    group: "fx_future",
    // Montada fuera de #sceneLayers (ver index.html#structureOverlay /
    // scene-manager.js): es el marco frontal de la maquina y debe quedar
    // SIEMPRE por delante de #reelLayer, incluso cuando #sceneLayers recibe
    // su propio transform (reaccion de estructura del BONUS RIB), que de
    // otro modo le crearia un stacking context propio y rompería el orden
    // (ver BUGFIX BONUS RIB DEPTH).
    root: "structureOverlay",
    label: "Caja toracica (capa superior)",
    class: "scene-layer scene-layer--ribcage-overlay-top",
    src: "assets/structure/ribcage_overlay_top.png"
  },
  {
    // Cofre decorativo del juego normal (base game). Montado en
    // #structureOverlay, DESPUES de ribcage_overlay_top en este array, para
    // que quede pintado por delante del marco (capa mas frontal de todas,
    // por delante de reels/estructura/fondo). Se oculta mientras el Bonus
    // Game FREE SPIN normal esta activo (ver
    // scene-manager.js#setBonusBackgroundActive, que ya alterna el fondo del
    // bonus en los mismos 3 puntos de sincronizacion de game.js).
    id: "chest_normal_game",
    root: "structureOverlay",
    label: "Cofre (juego normal)",
    class: "scene-layer scene-layer--chest-normal",
    src: "assets/ambient/chest.png"
  }
];

window.OSSUARY_SCENE_FX_CONFIG = {
  BONUS_FX_DURATION: 1400,
  BONUS_FX_BY_OUTCOME: {
    BONUS: "bonus",
    SUPER_BONUS: "super_bonus",
    SUPER_BONUS_PLUS: "super_bonus_plus"
  },
  SCENE_FX_CLASSES: [
    "has-near-bonus",
    "has-bonus",
    "has-super-bonus",
    "has-super-bonus-plus"
  ],
  SCENE_FX_CLASS_BY_ID: {
    near_bonus: "has-near-bonus",
    bonus: "has-bonus",
    super_bonus: "has-super-bonus",
    super_bonus_plus: "has-super-bonus-plus"
  }
};

