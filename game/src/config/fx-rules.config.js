// Configuracion declarativa del sistema de FX.
//
// Reglas de PRUEBA (debug:skull-eyes-on / debug:skull-eyes-off) +
// primera conexion a un evento REAL del juego (bonus:lock-updated, ya
// emitido desde game.js#emitBonusLockUpdated).

// Generador generico de reglas "valor numerico del payload -> intensity".
// No conoce costillas, ojos ni bonus: solo transforma una tabla de datos
// {umbral: intensity} en un array de reglas declarativas. Reutilizable
// para cualquier futuro efecto que reaccione a un campo numerico del
// payload de un evento (lockedRibCount, sternumLocked como 0/1, etc.).
//
// Ejemplo de uso:
//   buildThresholdRules("bonus:lock-updated", "lockedRibCount",
//     "skull-eyes-glow", { 2: 2, 3: 3, 4: 4, 5: 5 }, { scope: "bonus-session" })
//
// Genera: una regla de deactivate por debajo del umbral mas bajo, y una
// regla de activate por cada umbral (el ultimo usa >=, los demas ===).
function buildThresholdRules(eventName, valueKey, effectId, intensityByThreshold, options) {
  options = options || {};
  var scope = options.scope || null;
  var thresholds = Object.keys(intensityByThreshold)
    .map(Number)
    .sort(function (a, b) { return a - b; });

  var rules = thresholds.map(function (threshold, index) {
    var isLast = index === thresholds.length - 1;
    var intensity = intensityByThreshold[threshold];
    return {
      event: eventName,
      when: function (payload) {
        var value = payload[valueKey];
        return isLast ? value >= threshold : value === threshold;
      },
      activate: effectId,
      params: { intensity: intensity, scope: scope }
    };
  });

  var lowestThreshold = thresholds[0];
  rules.unshift({
    event: eventName,
    when: function (payload) {
      return payload[valueKey] < lowestThreshold;
    },
    deactivate: effectId
  });

  return rules;
}

// Generador generico de reglas "lista de ids del payload -> set de
// efectos activos". Por cada entryId del mapa, activa su effectId si esta
// presente en la lista actual del payload, y lo desactiva si no lo esta.
// No sabe nada de costillas/bonus: solo reconcilia un set de ids contra un
// mapa id->effectId. Reutilizable para cualquier futuro efecto que
// dependa de una lista de ids en el payload (lockedReels, etc.).
//
// Ejemplo de uso:
//   buildLockedSetRules("bonus:lock-updated", "lockedReels", {
//     "rib1": "rib-glow-rib1", ...
//   }, { scope: "bonus-session" })
function buildLockedSetRules(eventName, listKey, effectIdByEntryId, options) {
  options = options || {};
  var scope = options.scope || null;
  var rules = [];

  Object.keys(effectIdByEntryId).forEach(function (entryId) {
    var effectId = effectIdByEntryId[entryId];

    rules.push({
      event: eventName,
      when: function (payload) {
        return (payload[listKey] || []).indexOf(entryId) !== -1;
      },
      activate: effectId,
      params: { scope: scope }
    });

    rules.push({
      event: eventName,
      when: function (payload) {
        return (payload[listKey] || []).indexOf(entryId) === -1;
      },
      deactivate: effectId
    });
  });

  return rules;
}

// Generador generico de reglas "un solo id en el payload -> activar un
// efecto puntual". A diferencia de buildLockedSetRules, no genera regla de
// desactivacion: pensado para efectos one-shot (loop:false + duration)
// que ya se autodesactivan solos via css-fx-player.js. No sabe nada de
// costillas/bonus: solo mapea un id exacto del payload a un effectId.
//
// Ejemplo de uso:
//   buildSingleShotIdRules("bonus:rib-locked", "reelId", {
//     "rib1": "rib-energy-rib1", ...
//   })
function buildSingleShotIdRules(eventName, idKey, effectIdByEntryId) {
  return Object.keys(effectIdByEntryId).map(function (entryId) {
    var effectId = effectIdByEntryId[entryId];
    return {
      event: eventName,
      when: function (payload) {
        return payload[idKey] === entryId;
      },
      activate: effectId
    };
  });
}

// Misma lista de cobertura que fx-effects.config.js: costillas validas
// para BONUS NORMAL (symbols.config.js) + rib4-left/rib4-right.
var RIB_GLOW_REEL_IDS = ((window.OSSUARY_SYMBOL_CONFIG && window.OSSUARY_SYMBOL_CONFIG.RIB_BONUS_REELS) || [])
  .concat(["rib4-left", "rib4-right"]);
var RIB_ENERGY_EFFECT_ID_BY_REEL_ID = RIB_GLOW_REEL_IDS.reduce(function (map, reelId) {
  map[reelId] = "rib-energy-" + reelId;
  return map;
}, {});
// Fase 2 de trajectory-fx: una trayectoria por costilla, mismo evento
// bonus:rib-locked, mismo generador que ya usa rib-energy (local) arriba.
var RIB_ENERGY_PATH_EFFECT_ID_BY_REEL_ID = RIB_GLOW_REEL_IDS.reduce(function (map, reelId) {
  map[reelId] = "rib-energy-path-" + reelId;
  return map;
}, {});

// ELIMINADAS a peticion del usuario (2026-07-03): las reglas de
// skull-eyes-glow (ojos verdes, bonus:lock-updated -> lockedRibCount via
// buildThresholdRules) y de rib-glow (marcas verdes persistentes,
// bonus:lock-updated -> lockedReels via buildLockedSetRules). Sus efectos
// estan enabled:false en fx-effects.config.js; quitar tambien las reglas
// evita el warning "Cannot activate unknown effect" en cada lock. Los
// generadores buildThresholdRules/buildLockedSetRules se conservan arriba
// como utilidades reutilizables. rib-energy (destello al caer el simbolo)
// y rib-energy-path (luz que viaja, ahora azul oscuro) se mantienen.
window.OSSUARY_FX_RULES = [
  {
    event: "debug:skull-eyes-on",
    activate: "eyes-glow-test",
    params: { scope: "debug-session" }
  },
  {
    event: "debug:skull-eyes-off",
    deactivateScope: "debug-session"
  }
].concat(
  buildSingleShotIdRules("bonus:rib-locked", "reelId", RIB_ENERGY_EFFECT_ID_BY_REEL_ID)
).concat(
  buildSingleShotIdRules("bonus:rib-locked", "reelId", RIB_ENERGY_PATH_EFFECT_ID_BY_REEL_ID)
);
