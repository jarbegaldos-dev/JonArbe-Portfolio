(function () {
  "use strict";

  // Presentacion de la espera REAL de rib2/rib3 tras la cuchilla BONUS de rib1.
  // game.js conserva por completo el disparador, los rodillos y el resultado.
  var active = null;

  function sound(event, payload) {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger(event, payload || {});
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function positionFocus(state) {
    var rect = state.bladeRect();
    if (!rect || !rect.width || !rect.height) {
      state.focus.style.display = "none";
      return;
    }
    state.focus.style.display = "block";
    state.focus.style.left = rect.left - rect.width * 0.08 + "px";
    state.focus.style.top = rect.top - rect.height * 0.08 + "px";
    state.focus.style.width = rect.width * 1.16 + "px";
    state.focus.style.height = rect.height * 1.16 + "px";
    state.vignette.style.setProperty("--bonus-chain-x", rect.left + rect.width / 2 + "px");
    state.vignette.style.setProperty("--bonus-chain-y", rect.top + rect.height / 2 + "px");
    state.vignette.style.setProperty("--bonus-chain-rx", Math.max(150, rect.width * 1.5) + "px");
    state.vignette.style.setProperty("--bonus-chain-ry", Math.max(130, rect.height * 1.6) + "px");
    state.viewportWidth = window.innerWidth;
    state.viewportHeight = window.innerHeight;
  }

  function phase(state, name) {
    if (state.phase === name) return;
    state.phase = name;
    [state.vignette, state.focus].concat(state.pending).forEach(function (el) {
      if (!el) return;
      el.classList.toggle("is-bonus-chain-build", name === "build" || name === "resolve");
      el.classList.toggle("is-bonus-chain-resolve", name === "resolve");
    });
  }

  function beat(state, now, progress) {
    var intensity = Math.min(1, 0.32 + progress * 0.62);
    sound("bonus_chain_tension_beat", { intensity: intensity });
    if (!reducedMotion()) {
      if (state.pulseAnim) state.pulseAnim.cancel();
      if (typeof state.focus.animate === "function") {
        state.pulseAnim = state.focus.animate([
          { opacity: 0.35, transform: "scale(1)" },
          { opacity: 0.8 * intensity, transform: "scale(1.022)", offset: 0.36 },
          { opacity: 0.35, transform: "scale(1)" }
        ], { duration: 240, easing: "ease-out" });
      }
      state.pending.forEach(function (el) {
        if (typeof el.animate !== "function") return;
        state.shakes.push(el.animate([
          { translate: "0 0" },
          { translate: "1.1px -0.4px", offset: 0.38 },
          { translate: "-0.7px 0.4px", offset: 0.7 },
          { translate: "0 0" }
        ], { duration: 180, easing: "ease-out" }));
      });
    }
    state.nextBeatAt = now + 340 - progress * 135;
  }

  function start(options) {
    stop();
    if (!options || !options.vignette || !options.bladeRect) return;
    var focus = document.createElement("div");
    focus.className = "bonus-chain-blade-focus";
    focus.setAttribute("aria-hidden", "true");
    document.body.appendChild(focus);
    active = {
      vignette: options.vignette,
      focus: focus,
      bladeRect: options.bladeRect,
      pending: (options.pending || []).filter(Boolean),
      startAt: options.now,
      totalMs: Math.max(1, options.remainingMs),
      speedMs: options.speedMs || function (ms) { return ms; },
      phase: "start",
      nextBeatAt: options.now + 180,
      quiet: false,
      pulseAnim: null,
      shakes: []
    };
    active.vignette.classList.add("is-bonus-chain");
    positionFocus(active);
    sound("bonus_chain_tension_start", { remainingMs: active.speedMs(active.totalMs) });
  }

  function update(now, remainingMs) {
    var state = active;
    if (!state) return;
    if (state.viewportWidth !== window.innerWidth || state.viewportHeight !== window.innerHeight) positionFocus(state);
    var remaining = Math.max(0, remainingMs);
    var progress = Math.max(0, Math.min(1, 1 - remaining / state.totalMs));
    if (progress >= 0.32 && state.phase === "start") {
      phase(state, "build");
      sound("bonus_chain_tension_build", { remainingMs: state.speedMs(remaining) });
    }
    if (progress >= 0.76 && state.phase !== "resolve") phase(state, "resolve");
    if (remaining <= Math.min(150, state.totalMs * 0.12)) {
      if (!state.quiet) {
        state.quiet = true;
        sound("bonus_chain_tension_quiet");
      }
      return;
    }
    if (progress >= 0.22 && now >= state.nextBeatAt && !state.quiet) beat(state, now, progress);
  }

  function stop() {
    var state = active;
    if (!state) return;
    active = null;
    if (state.pulseAnim) state.pulseAnim.cancel();
    state.shakes.forEach(function (anim) { anim.cancel(); });
    [state.vignette, state.focus].concat(state.pending).forEach(function (el) {
      if (!el) return;
      el.classList.remove("is-bonus-chain", "is-bonus-chain-build", "is-bonus-chain-resolve");
    });
    state.focus.remove();
    sound("bonus_chain_tension_end");
  }

  window.OssuaryBonusChainTension = { start: start, update: update, stop: stop };
})();
