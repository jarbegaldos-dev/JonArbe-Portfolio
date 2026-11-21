(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // BONUS de rib2/rib3 con vida — SOLO VISUAL.
  //
  // El simbolo gigante RIB_BONUS de rib2/rib3 es un esqueleto que asoma por
  // una ventana y estira el brazo hacia el centro. Aqui se monta encima del
  // arte (que se queda debajo, oculto) un muneco por piezas horneadas con
  // tools/bake-rib-bonus-rig.js: fondo de noche, niebla, brazo, antebrazo,
  // torso, craneo y mandibula, y ojos de brasa. Estilos y movimiento en
  // src/fx/rib-bonus-rig.css.
  //   - De paso (rodillo girando): quieto.
  //   - Al caer (.reel-lane.has-giant-symbol): zarpazo y luego vivo
  //     (respira, estira el brazo, ladea la cabeza, castanetea).
  //   - Al completar la cadena, la cuchilla de rib1 le corta el brazo: pierde
  //     esa mitad, como el arte original, y grita.
  // No toca el resultado ni el giro: solo anade hijos al elemento que ya pinta
  // src/render/giant-symbol-renderer.js y los vuelve a poner si se repinta.
  // ---------------------------------------------------------------------------

  var REELS = ["rib2-left", "rib2-right", "rib3-left", "rib3-right"];
  var DIR = "assets/symbols/rib-bonus-rig/";
  var PARTS = ["bg", "torso", "arm", "forearm", "head", "jaw"];
  var LUNGE_MS = 1000;
  var SCREAM_MS = 900;
  var renderer = window.OssuarySymbolRenderer;

  // Mismas imagenes residentes que las fichas (blob en memoria): sin volver a
  // pedir ni descodificar cada vez que el bloque se repinta.
  PARTS.forEach(function (name) {
    if (renderer && renderer.preloadArt) renderer.preloadArt(DIR + name + ".png");
  });
  function artUrl(name) {
    var url = DIR + name + ".png";
    return renderer && renderer.residentArtUrl ? renderer.residentArtUrl(url) : url;
  }

  function div(cls, parent) {
    var el = document.createElement("div");
    el.className = "rib-bonus-rig__" + cls;
    if (parent) parent.appendChild(el);
    return el;
  }

  function img(name, parent, cls) {
    var el = document.createElement("img");
    el.className = "rib-bonus-rig__" + (cls || "part");
    el.src = artUrl(name);
    el.alt = "";
    el.draggable = false;
    parent.appendChild(el);
    return el;
  }

  function buildRig() {
    var rig = document.createElement("div");
    rig.className = "rib-bonus-rig";
    rig.setAttribute("aria-hidden", "true");
    img("bg", rig, "bg");
    div("fog rib-bonus-rig__fog--far", rig);
    div("aura", rig);
    var body = div("body", rig);
    var arm = div("arm", body);
    img("arm", arm);
    img("forearm", div("forearm", arm));
    img("torso", div("torso", body));
    var head = div("head", body);
    img("head", head);
    img("jaw", div("jaw", head));
    div("eye rib-bonus-rig__eye--far", head);
    div("eye rib-bonus-rig__eye--near", head);
    div("fog rib-bonus-rig__fog--near", rig);
    return rig;
  }

  var tracks = {};
  var lanes = {};
  var lungeTimers = {};

  function rigOf(reelId) {
    var track = tracks[reelId];
    if (!track) return null;
    var el = track.querySelector('.giant-strip-symbol.has-bonus-rig[data-symbol="RIB_BONUS"]:not([hidden])');
    return el ? el.querySelector(".rib-bonus-rig") : null;
  }

  // Pone o quita el muneco segun lo que pinte cada elemento del bloque.
  function syncTrack(reelId) {
    var track = tracks[reelId];
    if (!track) return;
    var els = track.querySelectorAll(".giant-strip-symbol");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var wants = el.dataset.symbol === "RIB_BONUS" && !el.hidden;
      var rig = null;
      for (var c = 0; c < el.children.length; c++) {
        if (el.children[c].classList.contains("rib-bonus-rig")) rig = el.children[c];
      }
      if (wants && !rig) {
        rig = buildRig();
        el.appendChild(rig);
      } else if (!wants && rig) {
        rig.remove();
        rig = null;
      }
      el.classList.toggle("has-bonus-rig", Boolean(rig));
      if (rig) syncCut(el, rig);
    }
    syncLanding(reelId, false);
  }

  // La cuchilla de rib1 le corta el brazo (game.js marca el elemento con
  // .bonus-inner-cut--left/right; el recorte va en el CSS): grita una vez.
  function syncCut(el, rig) {
    var cut = el.classList.contains("bonus-inner-cut--left") || el.classList.contains("bonus-inner-cut--right");
    if (cut === (rig.dataset.cut === "1")) return;
    rig.dataset.cut = cut ? "1" : "";
    if (!cut) return;
    rig.classList.remove("is-scream");
    void rig.offsetWidth;
    rig.classList.add("is-scream");
    window.setTimeout(function () { rig.classList.remove("is-scream"); }, SCREAM_MS);
  }

  function syncLanding(reelId, fromLane) {
    var lane = lanes[reelId];
    var rig = rigOf(reelId);
    if (!rig) return;
    var landed = Boolean(lane && lane.classList.contains("has-giant-symbol"));
    if (landed === rig.classList.contains("is-landed")) return;
    rig.classList.toggle("is-landed", landed);
    if (!landed || !fromLane) return;
    // Zarpazo al caer: solo cuando el carril acaba de recibir el bloque.
    rig.classList.remove("is-lunge");
    void rig.offsetWidth;
    rig.classList.add("is-lunge");
    window.clearTimeout(lungeTimers[reelId]);
    lungeTimers[reelId] = window.setTimeout(function () {
      rig.classList.remove("is-lunge");
    }, LUNGE_MS);
  }

  function watch(reelId) {
    var track = document.querySelector('.giant-strip-track[data-reel="' + reelId + '"]');
    var lane = document.querySelector('.reel-lane[data-reel="' + reelId + '"]');
    if (!track || !lane) return false;
    tracks[reelId] = track;
    lanes[reelId] = lane;
    new MutationObserver(function () { syncTrack(reelId); })
      .observe(track, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-symbol", "hidden", "class"] });
    new MutationObserver(function () { syncLanding(reelId, true); })
      .observe(lane, { attributes: true, attributeFilter: ["class"] });
    syncTrack(reelId);
    return true;
  }

  // Los bloques gigantes se crean al montar los rodillos (tras la carga); si
  // aun no estan, se vuelve a mirar cada poco.
  var pending = REELS.slice();
  (function start() {
    pending = pending.filter(function (reelId) { return !watch(reelId); });
    if (pending.length) window.setTimeout(start, 250);
  })();
})();
