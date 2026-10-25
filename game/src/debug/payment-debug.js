(function () {
  "use strict";

  function createPaymentDebug(options) {
    var state = options.state;
    var paymentEngine = options.paymentEngine;
    var bigWinCounter = options.bigWinCounter;
    var hooks = options.hooks || {};
    var debugSequence = 0;

    function uniqueId(prefix) {
      debugSequence += 1;
      return prefix + "-" + debugSequence;
    }

    function lastPayment() {
      return paymentEngine.getState().lastPayment;
    }

    function forcePayment(amount) {
      return paymentEngine.applyPayment({
        paymentId: uniqueId("debug-payment"),
        spinId: uniqueId("debug-spin"),
        totalWin: Number(amount || 0),
        bet: hooks.currentBet ? hooks.currentBet() : 0,
        context: {
          source: "debug"
        }
      });
    }

    function forceBigWin(amount) {
      return bigWinCounter.show(Number(amount || 0), hooks.currentBet ? hooks.currentBet() : 0);
    }

    function hideBigWin() {
      return bigWinCounter.hide();
    }

    function stateSnapshot() {
      return {
        balance: state.balance,
        currentBet: hooks.currentBet ? hooks.currentBet() : 0,
        payment: paymentEngine.getState()
      };
    }

    function reset() {
      paymentEngine.reset();
      return stateSnapshot();
    }

    return {
      lastPayment: lastPayment,
      forcePayment: forcePayment,
      forceBigWin: forceBigWin,
      hideBigWin: hideBigWin,
      state: stateSnapshot,
      reset: reset
    };
  }

  window.OssuaryPaymentDebugFactory = {
    create: createPaymentDebug
  };
})();
