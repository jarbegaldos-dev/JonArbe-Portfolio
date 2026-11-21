(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Niebla del Execution Bonus en el negro de los rodillos — SOLO VISUAL.
  //
  // Peticion del usuario (2026-10-13): los esqueletos ya no llevan humo
  // pegado; la niebla vive en el negro de cada mitad de rib2-rib5, quieta en
  // su sitio y moviendose despacio (tres capas que van y vuelven, cada
  // carril con su propio desfase). Cuando cae un esqueleto en un rodillo, su
  // niebla se abre con el golpe (se hincha y se aviva, y salen dos bocanadas
  // a los lados) y vuelve poco a poco a su deriva.
  //
  // Va dentro de la pista de los gigantes de cada rodillo (reel.giantStripEl:
  // fija, con el fondo negro del bonus y overflow hidden), como primer hijo,
  // detras de los esqueletos. Solo se ve con el tablero del bonus en negro
  // (#slotStage.bonus-mode-board-blank); fuera de el no se pinta ni anima.
  // Estilos en src/fx/raven-bonus.css. game.js llama a ensure(reels) al
  // entrar en el bonus y a impact(reelId) cuando un esqueleto aterriza.
  // ---------------------------------------------------------------------------

  var LANES = [
    "rib2-left", "rib2-right", "rib3-left", "rib3-right",
    "rib4-left", "rib4-right", "rib5-left", "rib5-right"
  ];
  var MASK_COUNT = 6;
  var IMPACT_MS = 2200;

  function maskUrl(n) {
    return 'url("assets/effects/smoke/symbol-smoke-' + n + '.png")';
  }

  function speedMs(ms) {
    var speed = window.OssuaryGameSpeed;
    return speed && typeof speed.ms === "function" ? speed.ms(ms) : ms;
  }

  function setMask(el, n) {
    el.style.webkitMaskImage = maskUrl(n);
    el.style.maskImage = maskUrl(n);
  }

  function create() {
    // reelId -> { el, timer }
    var fogs = new Map();

    function build(reelId, index) {
      var fog = document.createElement("div");
      fog.className = "bonus-lane-fog";
      fog.dataset.reel = reelId;
      // Las mitades izquierdas en espejo: la niebla no va igual en las dos.
      if (/-left$/.test(reelId)) fog.style.scale = "-1 1";
      ["a", "b", "c"].forEach(function (name, k) {
        var layer = document.createElement("span");
        layer.className = "bonus-lane-fog__layer bonus-lane-fog__layer--" + name;
        setMask(layer, ((index * 2 + k * 3) % MASK_COUNT) + 1);
        // Cada carril y cada capa, en otro punto de su vaiven.
        layer.style.animationDelay = (-((index * 3.7 + k * 5.3) % 17)).toFixed(2) + "s";
        fog.appendChild(layer);
      });
      ["l", "r"].forEach(function (side, k) {
        var puff = document.createElement("span");
        puff.className = "bonus-lane-fog__puff bonus-lane-fog__puff--" + side;
        setMask(puff, ((index + k * 2) % MASK_COUNT) + 1);
        fog.appendChild(puff);
      });
      return fog;
    }

    // Monta la niebla en las pistas de rib2-rib5 que aun no la tengan.
    function ensure(reels) {
      (reels || []).forEach(function (reel) {
        var index = LANES.indexOf(reel && reel.id);
        if (index === -1 || !reel.giantStripEl) return;
        var current = fogs.get(reel.id);
        if (current && current.el.parentNode === reel.giantStripEl) return;
        var fog = build(reel.id, index);
        reel.giantStripEl.insertBefore(fog, reel.giantStripEl.firstChild);
        fogs.set(reel.id, { el: fog, timer: 0 });
      });
    }

    // Golpe de un esqueleto que aterriza en ese rodillo.
    function impact(reelId) {
      var fog = fogs.get(reelId);
      if (!fog) return false;
      var el = fog.el;
      el.classList.remove("is-impact");
      void el.offsetWidth;
      el.classList.add("is-impact");
      window.clearTimeout(fog.timer);
      fog.timer = window.setTimeout(function () {
        el.classList.remove("is-impact");
      }, speedMs(IMPACT_MS));
      return true;
    }

    function clear() {
      fogs.forEach(function (fog) {
        window.clearTimeout(fog.timer);
        fog.el.remove();
      });
      fogs.clear();
    }

    return { ensure: ensure, impact: impact, clear: clear, lanes: LANES.slice() };
  }

  window.OssuaryBonusLaneFog = { create: create };
})();
