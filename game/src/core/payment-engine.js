(function () {
  "use strict";

  function createPaymentEngine(options) {
    var state = options.state;
    var hooks = options.hooks || {};
    var lastPayment = null;
    var lastPaymentId = null;
    var paidIds = new Set();
    var economy = options.economy || null;
    var debugSequence = 0;

    function emit(name, detail) {
      if (hooks.emitEvent) hooks.emitEvent(name, detail);
    }

    function roundCurrency(amount) {
      return Math.round(amount * 100) / 100;
    }

    function validNumber(value) {
      return typeof value === "number" && Number.isFinite(value);
    }

    function buildPaymentId(inputId) {
      if (inputId) return inputId;
      debugSequence += 1;
      return "debug-payment-" + debugSequence;
    }

    function applyPayment(payload) {
      var paymentId = buildPaymentId(payload && payload.paymentId);
      var totalWin = Number(payload && payload.totalWin);
      var bet = Number(payload && payload.bet);

      if (!validNumber(totalWin) || !validNumber(bet) || totalWin < 0 || bet < 0) {
        return {
          applied: false,
          paymentId: paymentId,
          reason: "invalid_numbers"
        };
      }

      if (!economy && paidIds.has(paymentId)) {
        return {
          applied: false,
          paymentId: paymentId,
          reason: "duplicate_payment"
        };
      }

      var credit = null;
      if (economy) {
        credit = economy.credit({ roundId: payload && payload.roundId,
          spinId: payload && payload.spinId, paymentId: paymentId, amount: totalWin,
          source: payload && payload.context && payload.context.source });
        if (!credit.applied) return Object.assign({ paymentId: paymentId }, credit);
        totalWin = credit.paidCents / 100;
        bet = economy.bet();
      }

      var beforeBalance = hooks.getBalance ? hooks.getBalance() : state.balance;
      var payment = {
        paymentId: paymentId,
        spinId: payload && payload.spinId ? payload.spinId : paymentId,
        totalWin: roundCurrency(totalWin),
        bet: roundCurrency(bet),
        beforeBalance: roundCurrency(beforeBalance),
        afterBalance: roundCurrency(beforeBalance + totalWin),
        context: Object.assign({}, payload && payload.context ? payload.context : {})
      };
      if (credit) Object.assign(payment, { roundId: credit.roundId,
        rawWin: credit.rawCents / 100, clippedWin: credit.clippedCents / 100 });

      // Record identity before event handlers can re-enter applyPayment.
      if (!economy) paidIds.add(paymentId);
      lastPaymentId = paymentId;
      lastPayment = payment;

      if (payment.totalWin > 0) {
        if (hooks.setBalance) hooks.setBalance(payment.afterBalance);
        else state.balance = payment.afterBalance;
      }

      state.lastPaidSpinId = payment.spinId;
      state.lastPayment = payment;

      emit("payment_started", payment);

      if (typeof console !== "undefined" && typeof console.info === "function") {
        console.info("[Ossuary Payment]", payment);
      }

      emit("payment_completed", payment);

      return {
        applied: true,
        payment: payment
      };
    }

    function getState() {
      return {
        lastPaymentId: lastPaymentId,
        lastPayment: lastPayment,
        lastPaidSpinId: state.lastPaidSpinId || null
      };
    }

    function reset() {
      lastPayment = null;
      lastPaymentId = null;
      paidIds.clear();
      state.lastPayment = null;
      state.lastPaidSpinId = null;
    }

    return {
      applyPayment: applyPayment,
      getState: getState,
      reset: reset
    };
  }

  window.OssuaryPaymentEngine = {
    create: createPaymentEngine
  };
})();
