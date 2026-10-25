window.OSSUARY_LAYOUT_CONFIG = {
  IMAGE_REFERENCE: {
    width: 1525,
    height: 779,
    asset: "assets/backgrounds/background_base.webp"
  },

  RIB_LAYOUT: [
    {
      id: "rib1",
      label: "Costilla 1",
      cellStep: 1,
      scrollSign: 1,
      cells: [
        { id: "rib1-1", x: 622, y: 195, w: 58, h: 110, initial: "CROWNED_SKULL" },
        { id: "rib1-2", x: 759, y: 195, w: 58, h: 110, initial: "DARK_HEART" },
        { id: "rib1-3", x: 903, y: 195, w: 58, h: 110, initial: "FEMUR" }
      ]
    },
    {
      id: "rib2-left",
      label: "Costilla 2 izquierda",
      cellStep: 1,
      scrollSign: 1,
      cells: [
        { id: "rib2-1", x: 543, y: 300, w: 70, h: 70, initial: "VERTEBRA" },
        { id: "rib2-2", x: 649, y: 300, w: 70, h: 70, initial: "ANCIENT_GOLD_COIN" }
      ]
    },
    {
      id: "rib2-right",
      label: "Costilla 2 derecha",
      cellStep: -1,
      scrollSign: -1,
      cells: [
        { id: "rib2-3", x: 874, y: 300, w: 64, h: 70, initial: "DARK_HEART" },
        { id: "rib2-4", x: 990, y: 300, w: 64, h: 70, initial: "WILD" }
      ]
    },
    {
      id: "rib3-left",
      label: "Costilla 3 izquierda",
      stopIndex: 4,
      cellStep: 1,
      scrollSign: 1,
      cells: [
        { id: "rib3-2", x: 543, y: 391, w: 70, h: 64, initial: "ANCIENT_GOLD_COIN" },
        { id: "rib3-3", x: 649, y: 391, w: 70, h: 64, initial: "VERTEBRA" }
      ]
    },
    {
      id: "rib3-right",
      label: "Costilla 3 derecha",
      cellStep: -1,
      scrollSign: -1,
      cells: [
        { id: "rib3-4", x: 874, y: 391, w: 64, h: 64, initial: "FEMUR" },
        { id: "rib3-5", x: 990, y: 391, w: 64, h: 64, initial: "CROWNED_SKULL" }
      ]
    },
    {
      id: "rib4-left",
      label: "Costilla 4 izquierda",
      cellStep: 1,
      scrollSign: 1,
      cells: [
        { id: "rib4-1", x: 543, y: 492, w: 70, h: 70, initial: "ANCIENT_GOLD_COIN" },
        { id: "rib4-2", x: 649, y: 492, w: 70, h: 70, initial: "VERTEBRA" }
      ]
    },
    {
      id: "rib4-right",
      label: "Costilla 4 derecha",
      cellStep: -1,
      scrollSign: -1,
      cells: [
        { id: "rib4-3", x: 874, y: 492, w: 64, h: 70, initial: "WILD" },
        { id: "rib4-4", x: 990, y: 492, w: 64, h: 70, initial: "FEMUR" }
      ]
    },
    {
      id: "rib5-left",
      label: "Costilla 5 izquierda",
      cellStep: 1,
      scrollSign: 1,
      cells: [
        { id: "rib5-1", x: 543, y: 597, w: 70, h: 70, initial: "VERTEBRA" },
        { id: "rib5-2", x: 649, y: 597, w: 70, h: 70, initial: "WILD" }
      ]
    },
    {
      id: "rib5-right",
      label: "Costilla 5 derecha",
      cellStep: -1,
      scrollSign: -1,
      cells: [
        { id: "rib5-3", x: 874, y: 597, w: 64, h: 70, initial: "ANCIENT_GOLD_COIN" },
        { id: "rib5-4", x: 990, y: 597, w: 64, h: 70, initial: "FEMUR" }
      ]
    }
  ],

  STERNUM_LAYOUT: {
    id: "sternum",
    label: "Esternon",
    cellStep: 1,
    scrollSign: -1,
    cells: [
      { id: "sternum-1", x: 762, y: 294, w: 118, h: 70, initial: "WILD" },
      { id: "sternum-2", x: 762, y: 427, w: 118, h: 70, initial: "VERTEBRA" },
      { id: "sternum-3", x: 762, y: 499, w: 118, h: 70, initial: "DARK_HEART" }
    ]
  }
};
