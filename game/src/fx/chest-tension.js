(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Tension del cofre del Ruleta Game — SOLO presentacion.
  //
  // El cofre se llena con lo que cortan las cuchillas y, lleno, se abre en la
  // primera tirada base que pague mas de x5 (src/ruleta/ruleta-game.js).
  // Peticion del usuario (2026-10-15): que se note cuanto falta y que se diga
  // que esta pasando. Por tramos de llenado:
  //   - menos de la mitad: quieto;
  //   - desde la mitad: algun meneo suelto;
  //   - desde el 80%: tiembla a menudo, luz por la rendija de la tapa y
  //     ascuas; al cruzar, aviso "ALMOST FULL";
  //   - lleno: tiembla mas y mas seguido, mas luz y aviso "CHEST FULL".
  // Cada caida de simbolos suelta un "+N" que sube desde el cofre.
  // No se dice que hace falta para abrirlo (el usuario prefiere la intriga,
  // 2026-10-15): lleno, cada premio que no basta le hace amagar (sacudon,
  // fogonazo por la rendija y ascuas) y se vuelve a cerrar.
  //
  // Escucha "ossuary:chest-count" (ruleta-game.js#renderCounter) y
  // "ossuary:chest-tease" (ruleta-game.js#startPendingSequence). No toca la
  // cuenta, la meta ni cuando se abre. Estilos: src/fx/chest-tension.css.
  // ---------------------------------------------------------------------------

  var LEVELS = ["calm", "stirring", "almost", "full"];

  // Meneos sueltos por tramo: cada cuanto (ms, al azar entre los dos), cuanto
  // gira (grados), cuanto salta (px) y cuanto dura.
  var RATTLE = {
    stirring: { every: [7000, 10500], deg: 0.8, px: 1.2, ms: 460 },
    almost: { every: [3200, 4800], deg: 1.4, px: 2, ms: 600 },
    full: { every: [1800, 2700], deg: 2, px: 2.8, ms: 720 }
  };
  // Luz de la rendija por tramo (opacidad; igual que en chest-tension.css).
  var LIGHT = { calm: 0, stirring: 0, almost: 0.45, full: 0.8 };
  // Sonido del meneo, como mucho cada tanto (lleno puede durar muchas tiradas).
  var RATTLE_SOUND_GAP_MS = 7000;
  var EMBERS = 6;
  var CALLOUT_MS = 2200;
  var PLUS_MS = 1100;

  var rig = null;
  var body = null;
  var light = null;
  var callout = null;
  var embers = null;
  var level = "calm";
  var rattleTimer = 0;
  var calloutTimer = 0;
  var lastRattleSoundAt = 0;

  function levelFor(count, target) {
    if (!(target > 0)) return "calm";
    var r = count / target;
    if (r >= 1) return "full";
    if (r >= 0.8) return "almost";
    if (r >= 0.5) return "stirring";
    return "calm";
  }

  function el(tagName, cls, text) {
    var node = document.createElement(tagName);
    node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  // Monta las piezas dentro del rig del cofre (lo crea ruleta-game.js): asi
  // heredan su escala, su posicion y su `hidden` (el cofre se oculta en el
  // bonus).
  function ensureRig() {
    if (rig && rig.isConnected) return rig;
    rig = document.querySelector(".ruleta-chest-rig");
    body = rig ? rig.querySelector(".ruleta-chest-rig__body") : null;
    if (!rig || !body) {
      rig = null;
      return null;
    }
    var img = body.querySelector(".ruleta-chest-rig__image");
    light = el("div", "chest-tension__light");
    light.setAttribute("aria-hidden", "true");
    // La luz solo pinta sobre el cofre: mascara con su propia imagen.
    if (img && img.getAttribute("src")) {
      var mask = 'url("' + img.getAttribute("src") + '")';
      light.style.webkitMaskImage = mask;
      light.style.maskImage = mask;
    }
    body.insertBefore(light, img ? img.nextSibling : body.firstChild);

    embers = el("div", "chest-tension__embers");
    embers.setAttribute("aria-hidden", "true");
    for (var i = 0; i < EMBERS; i++) {
      var ember = el("span", "chest-tension__ember");
      ember.style.setProperty("--ember-x", (16 + Math.round(Math.random() * 68)) + "%");
      ember.style.setProperty("--ember-delay", (-Math.random() * 2.4).toFixed(2) + "s");
      ember.style.setProperty("--ember-drift", (Math.round(Math.random() * 24) - 12) + "px");
      embers.appendChild(ember);
    }
    body.appendChild(embers);

    callout = el("div", "chest-tension__callout");
    callout.setAttribute("role", "status");
    rig.appendChild(callout);
    return rig;
  }

  function chestVisible() {
    return Boolean(rig && rig.isConnected && !rig.hidden && !document.hidden);
  }

  function ruletaActive() {
    var ruleta = window.OssuaryRuletaGame;
    return Boolean(ruleta && typeof ruleta.isActive === "function" && ruleta.isActive());
  }

  function bigWinOnScreen() {
    var counter = document.querySelector(".big-win-counter");
    return Boolean(counter && !counter.hidden && counter.offsetParent !== null);
  }

  function audio(eventName) {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger(eventName);
  }

  // Meneo: rotate/translate sueltos (no `transform`), asi se suma a las
  // reacciones de ruleta-game.js en el mismo cuerpo sin pisarlas.
  function rattle(spec) {
    if (!body || typeof body.animate !== "function") return;
    var d = spec.deg;
    var p = spec.px;
    body.animate([
      { rotate: "0deg", translate: "0 0" },
      { rotate: (-d) + "deg", translate: "0 " + (-p) + "px", offset: 0.14 },
      { rotate: (d * 0.85) + "deg", translate: "0 0", offset: 0.3 },
      { rotate: (-d * 0.6) + "deg", translate: "0 " + (-p * 0.5) + "px", offset: 0.48 },
      { rotate: (d * 0.35) + "deg", translate: "0 0", offset: 0.66 },
      { rotate: (-d * 0.15) + "deg", translate: "0 0", offset: 0.82 },
      { rotate: "0deg", translate: "0 0" }
    ], { duration: spec.ms, easing: "ease-out" });
    // La rendija se aviva con el golpe y vuelve a su luz de tramo (la del CSS).
    if (light && LIGHT[level] > 0) {
      light.animate([
        { opacity: LIGHT[level] },
        { opacity: 1, offset: 0.2 },
        { opacity: LIGHT[level] }
      ], { duration: spec.ms + 200, easing: "ease-out" });
    }
    var now = window.performance.now();
    if ((level === "almost" || level === "full") && now - lastRattleSoundAt > RATTLE_SOUND_GAP_MS && !bigWinOnScreen()) {
      lastRattleSoundAt = now;
      audio("chest_rattle");
    }
  }

  function scheduleRattle() {
    window.clearTimeout(rattleTimer);
    rattleTimer = 0;
    var spec = RATTLE[level];
    if (!spec) return;
    var wait = spec.every[0] + Math.random() * (spec.every[1] - spec.every[0]);
    rattleTimer = window.setTimeout(function () {
      if (chestVisible() && !ruletaActive()) rattle(spec);
      scheduleRattle();
    }, wait);
  }

  function showCallout(text, kind) {
    if (!callout) return;
    callout.textContent = text;
    callout.className = "chest-tension__callout chest-tension__callout--" + kind;
    void callout.offsetWidth;
    callout.classList.add("is-on");
    window.clearTimeout(calloutTimer);
    calloutTimer = window.setTimeout(function () {
      callout.classList.remove("is-on");
    }, CALLOUT_MS);
  }

  function showPlus(n) {
    if (!rig || !(n > 0) || rig.hidden) return;
    var plus = el("div", "chest-tension__plus", "+" + n);
    plus.setAttribute("aria-hidden", "true");
    rig.appendChild(plus);
    window.setTimeout(function () {
      if (plus.parentNode) plus.parentNode.removeChild(plus);
    }, PLUS_MS + 50);
  }

  function setLevel(next, announce) {
    var prev = level;
    level = next;
    LEVELS.forEach(function (id) {
      rig.classList.toggle("is-chest-" + id, id === next);
    });
    if (next !== prev) scheduleRattle();
    if (!announce) return;
    var rose = LEVELS.indexOf(next) > LEVELS.indexOf(prev);
    if (!rose) return;
    if (next === "almost") {
      showCallout("ALMOST FULL", "almost");
      audio("chest_almost_full");
      rattle(RATTLE.almost);
    } else if (next === "full") {
      showCallout("CHEST FULL", "full");
      audio("chest_full");
      rattle({ deg: 3, px: 5, ms: 900 });
    }
  }

  // Amago: casi se abre y no. Sacudon fuerte, la tapa "salta", fogonazo por
  // la rendija y una tanda de ascuas.
  function tease() {
    if (!ensureRig() || level !== "full" || !chestVisible()) return;
    rattle({ deg: 3.4, px: 7, ms: 1000 });
    rig.classList.remove("is-chest-tease");
    void rig.offsetWidth;
    rig.classList.add("is-chest-tease");
    window.setTimeout(function () { if (rig) rig.classList.remove("is-chest-tease"); }, 1300);
    audio("chest_tease");
  }

  function update(count, target, added) {
    if (!ensureRig()) return;
    var next = levelFor(count, target);
    // Un salto de nivel por la propia caida (no al cargar ni al reiniciar).
    setLevel(next, added > 0);
    if (added > 0) showPlus(added);
  }

  document.addEventListener("ossuary:chest-count", function (event) {
    var d = event.detail || {};
    update(Number(d.count) || 0, Number(d.target) || 0, Number(d.added) || 0);
  });

  document.addEventListener("ossuary:chest-tease", function () {
    // Tras el premio (y su contador, si lo hay): un respiro y amaga.
    window.setTimeout(tease, 350);
  });

  // Estado de partida (el contador pudo pintarse antes de cargar este script).
  function init() {
    var ruleta = window.OssuaryRuletaGame;
    if (!ruleta || typeof ruleta.getCount !== "function") return;
    update(ruleta.getCount(), ruleta.getTriggerCount(), 0);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.OssuaryChestTension = {
    getLevel: function () { return level; },
    tease: tease,
    rattle: function (id) { if (ensureRig()) rattle(RATTLE[id] || RATTLE.full); }
  };
})();
