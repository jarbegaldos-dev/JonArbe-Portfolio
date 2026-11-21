(function () {
  "use strict";

  function createCombinationConflictResolver(options) {
    var config = options.config || {};
    var hooks = options.hooks || {};

    var PRIORITY_RULES = config.PRIORITY_RULES || ["length", "fewestWilds", "leftmost", "routeId"];
    var SHARE_POLICY = config.SHARE_POLICY || "allow_all";

    function countWilds(entry) {
      if (typeof hooks.countWilds === "function") return hooks.countWilds(entry);
      if (typeof entry.wildCount === "number") return entry.wildCount;
      return (entry.symbols || []).filter(function (symbol) { return symbol === "WILD"; }).length;
    }

    function leftmostPosition(entry) {
      if (typeof hooks.leftmostPosition === "function") return hooks.leftmostPosition(entry);
      return (entry.positions || [])[0] || "";
    }

    function compareByPriority(a, b) {
      for (var i = 0; i < PRIORITY_RULES.length; i += 1) {
        var rule = PRIORITY_RULES[i];
        if (rule === "length" && a.length !== b.length) return b.length - a.length;
        if (rule === "fewestWilds") {
          var wildDelta = countWilds(a) - countWilds(b);
          if (wildDelta !== 0) return wildDelta;
        }
        if (rule === "leftmost") {
          var leftmostDelta = leftmostPosition(a).localeCompare(leftmostPosition(b));
          if (leftmostDelta !== 0) return leftmostDelta;
        }
        if (rule === "routeId" && a.id !== b.id) return a.id - b.id;
      }

      return 0;
    }

    function sharedPositionIds(a, b) {
      var right = new Set(b.positions || []);
      return (a.positions || []).filter(function (positionId) {
        return right.has(positionId);
      });
    }

    function sharedWildIds(a, b) {
      var wildsA = new Set((a.positions || []).filter(function (_, index) {
        return (a.symbols || [])[index] === "WILD";
      }));
      return (b.positions || []).filter(function (positionId, index) {
        return (b.symbols || [])[index] === "WILD" && wildsA.has(positionId);
      });
    }

    function describePairConflict(a, b) {
      var sharedPositions = sharedPositionIds(a, b);
      var sharedWilds = sharedWildIds(a, b);
      var blocks =
        SHARE_POLICY === "no_shared_positions" && sharedPositions.length > 0
        || SHARE_POLICY === "no_shared_wilds" && sharedWilds.length > 0
        || SHARE_POLICY === "no_shared_any" && (sharedPositions.length > 0 || sharedWilds.length > 0)
        || typeof hooks.isConflict === "function" && hooks.isConflict(a, b);

      return {
        leftId: a.id,
        rightId: b.id,
        sharedPositions: sharedPositions,
        sharedWilds: sharedWilds,
        conflicts: Boolean(blocks)
      };
    }

    function detectConflicts(entries) {
      var conflicts = [];
      for (var i = 0; i < entries.length; i += 1) {
        for (var j = i + 1; j < entries.length; j += 1) {
          var conflict = describePairConflict(entries[i], entries[j]);
          if (conflict.conflicts) conflicts.push(conflict);
        }
      }
      return conflicts;
    }

    function resolve(entries) {
      var ordered = (entries || []).slice().sort(compareByPriority);
      var accepted = [];
      var rejected = [];

      ordered.forEach(function (entry) {
        var conflicts = accepted
          .map(function (candidate) { return describePairConflict(entry, candidate); })
          .filter(function (conflict) { return conflict.conflicts; });

        if (!conflicts.length) {
          accepted.push(entry);
          return;
        }

        rejected.push({
          entry: entry,
          conflicts: conflicts
        });
      });

      return {
        accepted: accepted,
        rejected: rejected,
        conflicts: detectConflicts(ordered),
        ordered: ordered
      };
    }

    return {
      compareByPriority: compareByPriority,
      detectConflicts: detectConflicts,
      resolve: resolve
    };
  }

  window.OssuaryMathCombinationConflictResolver = {
    create: createCombinationConflictResolver
  };
})();
