(function (root) {
  "use strict";

  // One debit owns every descendant credit. All money is integer cents.
  function cents(value) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError("Invalid money");
    var result = Math.round(value * 100);
    if (!Number.isSafeInteger(result)) throw new RangeError("Unsafe money");
    return result;
  }

  function create(options) {
    options = options || {};
    var sequence = 0;
    var epoch = 0;
    var active = null;
    var last = null;
    var credits = new Map();
    var spins = new Map();
    var limit = options.maxMultiple == null ? 20000 : options.maxMultiple;
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new RangeError("Invalid cap");

    function snapshot(round) {
      if (!round) return null;
      return Object.assign({}, round, { contributions: Object.assign({}, round.contributions) });
    }

    function begin(input) {
      if (active) throw new Error("Economic round already active");
      var betCents = cents(input.bet);
      var costCents = cents(input.cost);
      if (!betCents || !costCents) throw new RangeError("Round needs positive stake and cost");
      var capCents = betCents * limit;
      if (!Number.isSafeInteger(capCents)) throw new RangeError("Unsafe cap");
      active = {
        id: "round-" + epoch + "-" + (++sequence), product: input.product || "base",
        betCents: betCents, costCents: costCents, capCents: capCents,
        paidCents: 0, rawCents: 0, clippedCents: 0, contributions: {},
        closed: false, reason: null
      };
      credits.clear();
      spins.clear();
      return snapshot(active);
    }

    function bindSpin(spinId) {
      if (!active || !spinId) throw new Error("Spin without economic round");
      spins.set(spinId, active.id);
      return active.id;
    }

    function credit(input) {
      var roundId = input.roundId || spins.get(input.spinId);
      if (!active || roundId !== active.id) return { applied: false, reason: "stale_round" };
      if (typeof input.paymentId !== "string" || !input.paymentId) return { applied: false, reason: "missing_payment_id" };
      if (credits.has(input.paymentId)) return { applied: false, reason: "duplicate_payment" };
      var rawCents;
      try { rawCents = cents(input.amount); } catch (_) { return { applied: false, reason: "invalid_numbers" }; }
      if (!Number.isSafeInteger(active.rawCents + rawCents)) return { applied: false, reason: "unsafe_total" };
      var paidCents = Math.min(rawCents, active.capCents - active.paidCents);
      var source = input.source || "unspecified";
      var entry = { roundId: active.id, paymentId: input.paymentId, rawCents: rawCents,
        paidCents: paidCents, clippedCents: rawCents - paidCents, source: source };
      // Commit before emitting anything: callbacks cannot re-enter this credit.
      credits.set(input.paymentId, entry);
      active.rawCents += rawCents;
      active.paidCents += paidCents;
      active.clippedCents += entry.clippedCents;
      active.contributions[source] = (active.contributions[source] || 0) + paidCents;
      return Object.assign({ applied: true }, entry);
    }

    function close(reason) {
      if (!active) return snapshot(last);
      active.closed = true;
      active.reason = reason || "complete";
      last = active;
      active = null;
      return snapshot(last);
    }

    function reset() {
      close("reset");
      epoch++;
      active = last = null;
      credits.clear();
      spins.clear();
    }

    return { begin: begin, bindSpin: bindSpin, credit: credit, close: close, reset: reset,
      current: function () { return snapshot(active); }, last: function () { return snapshot(last); },
      bet: function () { return active ? active.betCents / 100 : null; },
      spinRoundId: function (id) { return spins.get(id) || null; } };
  }

  var api = { create: create, cents: cents };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.OssuaryEconomicRound = api;
})(typeof window !== "undefined" ? window : null);
