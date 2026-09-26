(function () {
  "use strict";

  function createRngEngine(options) {
    var source = options && typeof options.source === "function"
      ? options.source
      : Math.random;

    function next() {
      return source();
    }

    function int(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    }

    function pick(items) {
      return items[int(items.length)];
    }

    function chance(probability) {
      return next() < probability;
    }

    return {
      next: next,
      int: int,
      pick: pick,
      chance: chance
    };
  }

  window.OssuaryRngEngine = {
    create: createRngEngine
  };
})();
