window.OSSUARY_COMBO_CONFIG = {
  MIN_PATH_LENGTH: 3,
  // El tablero real solo tiene 5 columnas de combinacion de izquierda a
  // derecha, asi que la longitud maxima pagable real es 5.
  MAX_PATH_LENGTH: 5,
  NON_PAYING_SYMBOLS: ["RIB_BONUS", "STERNUM_BONUS"],
  NON_SUBSTITUTABLE_SYMBOLS: ["RIB_BONUS", "STERNUM_BONUS"],
  COLUMN_WIDTH_FACTOR: 0.8,
  CELL_LINK_DISTANCE: 128,
  // Regla declarativa del nuevo sistema:
  // - toda combinacion arranca en la columna mas a la izquierda
  // - cualquier celda de esa columna puede ser origen
  // - cada paso solo puede avanzar a la derecha, recto o en diagonal 1 fila
  START_POLICY: "all_cells_in_leftmost_column",
  ALLOWED_ROW_DELTAS: [-1, 0, 1]
};
