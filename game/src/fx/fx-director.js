(function () {
  "use strict";

  var bus = window.OssuaryFXEventBus;
  var registry = window.OssuaryFXRegistry;

  function getRules() {
    return window.OSSUARY_FX_RULES || [];
  }

  function activate(effectId, params) {
    var effect = registry.get(effectId);
    if (!effect) {
      console.warn("[OssuaryFX] Cannot activate unknown effect '" + effectId + "'.");
      return false;
    }
    if (!effect.__mounted) {
      if (typeof effect.mount === "function") {
        effect.mount();
      }
      effect.__mounted = true;
    }
    if (typeof effect.activate === "function") {
      effect.activate(params || {});
    }
    var scope = params && params.scope ? params.scope : null;
    registry.markActive(effectId, params, scope);
    return true;
  }

  function deactivate(effectId) {
    var effect = registry.get(effectId);
    if (!effect) {
      console.warn("[OssuaryFX] Cannot deactivate unknown effect '" + effectId + "'.");
      return false;
    }
    if (typeof effect.deactivate === "function") {
      effect.deactivate();
    }
    registry.markInactive(effectId);
    return true;
  }

  function deactivateScope(scope) {
    registry.idsByScope(scope).forEach(function (id) {
      deactivate(id);
    });
  }

  function listActive() {
    return registry.listActive();
  }

  function applyRule(rule, payload) {
    if (typeof rule.when === "function" && !rule.when(payload)) {
      return;
    }
    if (rule.activate) {
      activate(rule.activate, rule.params);
    }
    if (rule.deactivate) {
      deactivate(rule.deactivate);
    }
    if (rule.deactivateScope) {
      deactivateScope(rule.deactivateScope);
    }
  }

  function trigger(eventName, payload) {
    bus.emit(eventName, payload);
    getRules().forEach(function (rule) {
      if (rule.event === eventName) {
        applyRule(rule, payload);
      }
    });
  }

  window.OssuaryFX = {
    trigger: trigger,
    activate: activate,
    deactivate: deactivate,
    deactivateScope: deactivateScope,
    listActive: listActive
  };
})();
