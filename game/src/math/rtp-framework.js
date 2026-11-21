(function () {
  "use strict";

  function defaultMetricDefinitions() {
    return [
      { key: "rtp", ready: false },
      { key: "volatility", ready: false },
      { key: "hitRate", ready: false },
      { key: "ev", ready: false },
      { key: "maxExposure", ready: false }
    ];
  }

  function createRtpFramework(options) {
    var config = options || {};
    var definitions = {};
    (config.metrics || defaultMetricDefinitions()).forEach(function (definition) {
      definitions[definition.key] = Object.assign({}, definition);
    });

    var observed = {
      spins: 0,
      totalBet: 0,
      totalWin: 0,
      maxWin: 0
    };

    function observeSpin(spin) {
      var bet = Number(spin.bet || 0);
      var win = Number(spin.win || 0);
      observed.spins += 1;
      observed.totalBet += bet;
      observed.totalWin += win;
      observed.maxWin = Math.max(observed.maxWin, win);
    }

    function snapshot() {
      return {
        observed: Object.assign({}, observed),
        metrics: Object.keys(definitions).reduce(function (acc, key) {
          acc[key] = {
            ready: Boolean(definitions[key].ready),
            value: definitions[key].ready ? definitions[key].value : null
          };
          return acc;
        }, {})
      };
    }

    function registerMetric(definition) {
      definitions[definition.key] = Object.assign({}, definition);
    }

    return {
      observeSpin: observeSpin,
      snapshot: snapshot,
      registerMetric: registerMetric
    };
  }

  window.OssuaryMathRtpFramework = {
    create: createRtpFramework
  };
})();
