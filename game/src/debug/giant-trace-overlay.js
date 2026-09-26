(function () {
  "use strict";

  // Overlay de debug TEMPORAL, solo lectura. No toca lock/giant/render del
  // juego, solo lee window.OssuaryBonusDebug.debugPrintBonusState() y pinta
  // texto encima de la slot. Sirve para ver, en vivo, si el gigante
  // desaparece a mitad de un respin o justo cuando se ejecuta
  // clearBonusLocks (lastTransitionReason/clearing pasan a tener valor en
  // ese instante).

  var STORAGE_KEY = "ossuary-giant-trace-overlay";
  var el = null;
  var timer = null;

  function ensureEl() {
    if (el) return el;
    el = document.createElement("div");
    el.id = "ossuary-giant-trace-overlay";
    el.style.position = "fixed";
    el.style.top = "6px";
    el.style.left = "6px";
    el.style.zIndex = "99999";
    el.style.padding = "6px 8px";
    el.style.background = "rgba(0,0,0,0.78)";
    el.style.color = "#9eff9e";
    el.style.font = "11px/1.4 monospace";
    el.style.whiteSpace = "pre";
    el.style.pointerEvents = "none";
    el.style.borderRadius = "4px";
    document.body.appendChild(el);
    return el;
  }

  function tick() {
    if (!window.OssuaryBonusDebug) return;
    var info = window.OssuaryBonusDebug.debugPrintBonusState();
    if (!info) return;
    var lockedRibs = (info.bonus && info.bonus.lockedRibs) || [];
    var holdingLocks = info.gameStatus === "IDLE_WITH_LOCKS";
    ensureEl().textContent =
      "mode: " + (info.bonus ? info.bonus.mode : "?") + "\n" +
      "spinType: " + info.currentSpinType + "\n" +
      "lockedRibs: " + lockedRibs.join(",") + "\n" +
      "lastTransitionReason: " + (info.bonus ? info.bonus.lastTransitionReason : null) + "\n" +
      "newLockThisSpin: " + info.newLockThisSpin + "\n" +
      "clearing: " + info.clearing + "\n" +
      "gameStatus: " + info.gameStatus +
      (holdingLocks ? "\nchain ended - locks held on screen - waiting for next base spin" : "");
  }

  function show() {
    ensureEl().style.display = "block";
    if (!timer) timer = window.setInterval(tick, 150);
    tick();
    window.localStorage.setItem(STORAGE_KEY, "1");
  }

  function hide() {
    if (el) el.style.display = "none";
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    window.localStorage.setItem(STORAGE_KEY, "0");
  }

  function toggle() {
    if (el && el.style.display !== "none") {
      hide();
    } else {
      show();
    }
  }

  window.OssuaryGiantTraceOverlay = {
    show: show,
    hide: hide,
    toggle: toggle
  };

  if (window.localStorage.getItem(STORAGE_KEY) === "1") {
    show();
  }
})();
