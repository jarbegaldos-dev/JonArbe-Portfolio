(function () {
  "use strict";

  function createBonusModeRuntime(options) {
    var state = options.state;
    var config = options.config || {};
    var hooks = options.hooks || {};
    var modes = config.modes || {};

    function syncState() {
      var session = state.activeBonusModeSession || null;
      state.bonusModeSession = session;
      state.bonusModeType = session ? session.type : null;
      state.bonusModeRulesProfile = session ? session.rulesProfile : null;
      state.bonusModeSpinsRemaining = session ? session.spinsRemaining : 0;
      state.bonusModeSpinsAwarded = session ? session.awardedSpins : 0;
      state.bonusModeBladeDropsLanded = session ? (session.bladeDropsLanded || 0) : 0;
      state.bonusModeActive = Boolean(session);
    }

    function getModeDefinition(type) {
      return modes[type] || null;
    }

    function currentSession() {
      return state.activeBonusModeSession || null;
    }

    function currentLabel() {
      var session = currentSession();
      if (!session) return "";
      // Rediseño FREE SPIN: el contador son OPORTUNIDADES restantes (no giros
      // fijos), mostradas como restantes/máximo (p.ej. "FREE SPIN 2/3").
      return session.label + " " + session.spinsRemaining + "/" + session.awardedSpins;
    }

    function activate(type) {
      var def = getModeDefinition(type);
      if (!def || def.enabled === false) return null;
      state.activeBonusModeSession = {
        type: def.id,
        label: def.label,
        kind: def.kind,
        awardedSpins: def.awardedSpins,
        spinsRemaining: def.awardedSpins,
        bladeDropsLanded: 0,
        rulesProfile: def.rulesProfile,
        autoStart: Boolean(def.autoStart)
      };
      syncState();
      if (hooks.emitEvent) {
        hooks.emitEvent("onBonusModeActivated", {
          modeType: def.id,
          awardedSpins: def.awardedSpins,
          rulesProfile: def.rulesProfile
        });
      }
      return currentSession();
    }

    function canConsumeBaseSpin() {
      var session = currentSession();
      return Boolean(
        session &&
        session.kind === "FREE_SPINS" &&
        session.spinsRemaining > 0
      );
    }

    function consumeBaseSpin() {
      var session = currentSession();
      if (!canConsumeBaseSpin()) return null;
      session.spinsRemaining = Math.max(0, session.spinsRemaining - 1);
      syncState();
      if (hooks.emitEvent) {
        hooks.emitEvent("onBonusModeSpinConsumed", {
          modeType: session.type,
          spinsRemaining: session.spinsRemaining,
          awardedSpins: session.awardedSpins
        });
      }
      return session;
    }

    // Rediseño FREE SPIN (2026-07-03): cuando la cuchilla aterriza, las
    // oportunidades restantes se RESETEAN a su máximo (awardedSpins) — nunca
    // se suman: el tope duro es siempre awardedSpins (3 hoy, ver
    // bonus-modes.config.js).
    function restoreSpins() {
      var session = currentSession();
      if (!session || session.kind !== "FREE_SPINS") return null;
      session.spinsRemaining = session.awardedSpins;
      syncState();
      if (hooks.emitEvent) {
        hooks.emitEvent("onBonusModeSpinsRestored", {
          modeType: session.type,
          spinsRemaining: session.spinsRemaining,
          awardedSpins: session.awardedSpins
        });
      }
      return session;
    }

    function noteBladeDrop() {
      var session = currentSession();
      if (!session || session.kind !== "FREE_SPINS") return null;
      session.bladeDropsLanded = (session.bladeDropsLanded || 0) + 1;
      syncState();
      if (hooks.emitEvent) {
        hooks.emitEvent("onBonusModeBladeDropLanded", {
          modeType: session.type,
          bladeDropsLanded: session.bladeDropsLanded,
          spinsRemaining: session.spinsRemaining,
          awardedSpins: session.awardedSpins
        });
      }
      return session;
    }

    function completeIfDepleted() {
      var session = currentSession();
      if (!session || session.spinsRemaining > 0) return null;
      state.lastCompletedBonusModeSession = session;
      state.activeBonusModeSession = null;
      syncState();
      if (hooks.emitEvent) {
        hooks.emitEvent("onBonusModeCompleted", {
          modeType: session.type,
          awardedSpins: session.awardedSpins,
          rulesProfile: session.rulesProfile
        });
      }
      return session;
    }

    function reset() {
      state.activeBonusModeSession = null;
      state.lastCompletedBonusModeSession = null;
      syncState();
    }

    syncState();

    return {
      activate: activate,
      getModeDefinition: getModeDefinition,
      currentSession: currentSession,
      currentLabel: currentLabel,
      canConsumeBaseSpin: canConsumeBaseSpin,
      consumeBaseSpin: consumeBaseSpin,
      restoreSpins: restoreSpins,
      noteBladeDrop: noteBladeDrop,
      completeIfDepleted: completeIfDepleted,
      reset: reset
    };
  }

  window.OssuaryBonusModeRuntime = {
    create: createBonusModeRuntime
  };
})();
