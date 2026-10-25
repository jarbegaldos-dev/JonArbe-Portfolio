(function () {
  "use strict";

  var DEFAULT_STAGES = [
    "beforeEvaluation",
    "afterEvaluation",
    "beforeConflictResolution",
    "afterConflictResolution",
    "beforePayout",
    "afterPayout",
    "simulation",
    "metrics"
  ];

  function defaultMechanics() {
    return [
      "multipliers",
      "persistent_multipliers",
      "global_multipliers",
      "expanding_symbols",
      "sticky",
      "walking_wild",
      "roaming_wild",
      "mystery",
      "transformations",
      "cascades",
      "avalanche",
      "collector",
      "respins",
      "hold_and_win",
      "free_spins",
      "retrigger",
      "jackpots",
      "feature_buy"
    ].map(function (id) {
      return {
        id: id,
        enabled: false,
        stages: [],
        priority: 100,
        metadata: {}
      };
    });
  }

  function createMechanicsRegistry(options) {
    var config = options || {};
    var definitions = {};
    (config.mechanics || defaultMechanics()).forEach(register);

    function register(definition) {
      definitions[definition.id] = {
        id: definition.id,
        enabled: Boolean(definition.enabled),
        stages: (definition.stages || []).slice(),
        priority: definition.priority != null ? definition.priority : 100,
        handlers: Object.assign({}, definition.handlers || {}),
        metadata: Object.assign({}, definition.metadata || {})
      };
      return definitions[definition.id];
    }

    function get(id) {
      return definitions[id] || null;
    }

    function all() {
      return Object.keys(definitions).map(function (id) { return definitions[id]; });
    }

    function forStage(stage) {
      return all()
        .filter(function (definition) {
          return definition.enabled
            && definition.stages.indexOf(stage) >= 0
            && typeof definition.handlers[stage] === "function";
        })
        .sort(function (left, right) {
          return left.priority - right.priority || left.id.localeCompare(right.id);
        });
    }

    function runStage(stage, context) {
      return forStage(stage).map(function (definition) {
        return {
          id: definition.id,
          result: definition.handlers[stage](context)
        };
      });
    }

    return {
      stages: DEFAULT_STAGES.slice(),
      register: register,
      get: get,
      all: all,
      forStage: forStage,
      runStage: runStage
    };
  }

  window.OSSUARY_MATH_MECHANIC_STAGES = DEFAULT_STAGES.slice();
  window.OSSUARY_MATH_FUTURE_MECHANICS = defaultMechanics();
  window.OssuaryMathMechanicsRegistry = {
    create: createMechanicsRegistry
  };
})();
