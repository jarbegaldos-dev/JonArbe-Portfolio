(function () {
  "use strict";

  var effects = {};
  var activeState = {};

  function register(effectDef) {
    if (!effectDef || !effectDef.id) {
      throw new Error("OssuaryFXRegistry.register requires an effect definition with an 'id'.");
    }
    if (effects[effectDef.id]) {
      console.warn("[OssuaryFX] Effect '" + effectDef.id + "' is already registered. Overwriting.");
    }
    effects[effectDef.id] = effectDef;
  }

  function get(id) {
    return effects[id] || null;
  }

  function all() {
    return Object.keys(effects);
  }

  function isActive(id) {
    return Boolean(activeState[id]);
  }

  function listActive() {
    return Object.keys(activeState).map(function (id) {
      var entry = activeState[id];
      return { id: id, scope: entry.scope || null, params: entry.params || null };
    });
  }

  function markActive(id, params, scope) {
    activeState[id] = { params: params || null, scope: scope || null };
  }

  function markInactive(id) {
    delete activeState[id];
  }

  function idsByScope(scope) {
    return Object.keys(activeState).filter(function (id) {
      return activeState[id].scope === scope;
    });
  }

  window.OssuaryFXRegistry = {
    register: register,
    get: get,
    all: all,
    isActive: isActive,
    listActive: listActive,
    markActive: markActive,
    markInactive: markInactive,
    idsByScope: idsByScope
  };
})();
