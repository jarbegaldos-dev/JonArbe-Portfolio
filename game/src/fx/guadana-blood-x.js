(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // X de sangre de la Guadana sobre el esternon — SOLO PRESENTACION.
  //
  // Peticion del usuario (2026-10-16): "la mancha de sangre que marca una X en
  // el rodillo central cuando sale la hoz hay que mejorarla". Desde el
  // 2026-10-19 (al usuario no le gustaban las manchas dibujadas) son sus
  // manchas de sangre (assets/bonus_fx/blood_splat_<n>.webp, de
  // tools/bake-blood-splats.js): una mancha por tajo, alineada con su
  // diagonal por el eje de la mancha (del lado gordo al fino, SPLATS) y
  // aplastada de canto; se revelan siguiendo el tajo, uno detras de otro, y
  // en el cruce suele saltar otra. Todo sorteado cada vez (manchas, orden,
  // sentido, puntas, grosor; el usuario las queria mas aleatorias). Luego se
  // seca (se oscurece) y se va.
  //
  // spawn(rect): rect del rodillo central (viewport). game.js llama desde
  // spawnGuadanaSternumBloodX en el golpe del corte. Math.random (nunca el RNG
  // del motor). Estilos: .guadana-sternum-blood-x en style.css y
  // .guadana-blood-x en src/fx/execution-fx.css. OssuaryBloodSplats: las
  // manchas y su eje, tambien para la marca del nido de El Juicio.
  // ---------------------------------------------------------------------------

  var BASE = "assets/bonus_fx/blood_splat_";
  // Ancho y alto de la imagen y su eje (sx, sy, ex, ey en partes de ellos):
  // lo da el bake.
  var SPLATS = {
    1: { w: 376, h: 233, axis: [0.881, 0.341, 0.255, 0.589] },
    2: { w: 321, h: 229, axis: [0.223, 0.804, 0.866, 0.342] },
    3: { w: 344, h: 264, axis: [0.28, 0.828, 0.824, 0.229] },
    4: { w: 330, h: 251, axis: [0.28, 0.81, 0.832, 0.202] },
    5: { w: 219, h: 249, axis: [0.698, 0.145, 0.106, 0.734] },
    6: { w: 230, h: 538, axis: [0.364, 0.886, 0.519, 0.195] },
    7: { w: 354, h: 551, axis: [0.197, 0.829, 0.759, 0.285] }
  };
  // Para los tajos, todas (los regueros mas a menudo); para el cruce, la
  // ancha y los abanicos.
  var STREAKS = [2, 2, 3, 4, 5, 5, 1, 6, 7];
  var POOLS = [1, 1, 6, 7];

  function src(n) {
    return BASE + n + ".webp";
  }

  // Misma imagen sin volver a pedirla ni descodificarla (local-server manda
  // no-store; ver symbol-renderer.js).
  function art(path) {
    var r = window.OssuarySymbolRenderer;
    return r && r.residentArtUrl ? r.residentArtUrl(path) : path;
  }

  function preload() {
    var r = window.OssuarySymbolRenderer;
    if (!r || !r.preloadArt) return Promise.resolve(false);
    return Promise.all(Object.keys(SPLATS).map(function (n) { return r.preloadArt(src(n)); }));
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function f(v) { return v.toFixed(1); }

  function pick(list, not) {
    var options = list.filter(function (n) { return n !== not; });
    return options[Math.floor(Math.random() * options.length)];
  }

  function speedFactor() {
    var g = window.OssuaryGuillotineDrop;
    return g && typeof g.speedFactor === "function" ? g.speedFactor() : 1;
  }

  function animate(elm, frames, opts) {
    if (elm && typeof elm.animate === "function") return elm.animate(frames, opts);
    return null;
  }

  // Una mancha n con su eje de s a e (px de la pantalla, o del padre), con
  // el canto (perpendicular al eje) por squash y de un lado u otro (mirror).
  // Devuelve { el, reveal(delay, ms) }: el revelado avanza por el eje, del
  // lado gordo al fino (clip-path en px de la imagen).
  function placeSplat(parent, n, s, e, options) {
    var o = options || {};
    var S = SPLATS[n];
    var sx = S.axis[0] * S.w, sy = S.axis[1] * S.h;
    var ex = S.axis[2] * S.w, ey = S.axis[3] * S.h;
    var il = Math.hypot(ex - sx, ey - sy) || 1;
    var tl = Math.hypot(e.x - s.x, e.y - s.y) || 1;
    var scale = tl / il;
    var imgAngle = Math.atan2(ey - sy, ex - sx);
    var toAngle = Math.atan2(e.y - s.y, e.x - s.x);
    var el = document.createElement("img");
    el.className = "guadana-blood-x__splat";
    el.alt = "";
    el.draggable = false;
    el.decoding = "async";
    el.src = art(src(n));
    el.style.width = S.w + "px";
    el.style.height = S.h + "px";
    el.style.transform = "translate(" + f(s.x) + "px, " + f(s.y) + "px) rotate(" + toAngle.toFixed(4) + "rad) scale(" +
      scale.toFixed(4) + ", " + (scale * (o.squash || 1) * (o.mirror ? -1 : 1)).toFixed(4) + ") rotate(" + (-imgAngle).toFixed(4) +
      "rad) translate(" + f(-sx) + "px, " + f(-sy) + "px)";
    parent.appendChild(el);

    // Linea perpendicular al eje que avanza de antes de s a pasado e; lo de
    // detras se ve.
    var dx = (ex - sx) / il, dy = (ey - sy) / il;
    var big = Math.max(S.w, S.h) * 2;
    function cut(t) {
      var cx = sx + dx * (t * il), cy = sy + dy * (t * il);
      var px = -dy * big, py = dx * big;
      var pts = [
        [cx + px, cy + py], [cx - px, cy - py],
        [cx - px - dx * big, cy - py - dy * big], [cx + px - dx * big, cy + py - dy * big]
      ];
      return "polygon(" + pts.map(function (p) { return f(p[0]) + "px " + f(p[1]) + "px"; }).join(", ") + ")";
    }
    return {
      el: el,
      reveal: function (delay, ms) {
        el.style.clipPath = cut(-0.25);
        animate(el, [{ clipPath: cut(-0.25) }, { clipPath: cut(1.35) }], { duration: ms, delay: delay, easing: "cubic-bezier(.3,.6,.2,1)", fill: "both" });
      }
    };
  }

  function spawn(rect, options) {
    options = options || {};
    if (!rect || !rect.width || !rect.height) return null;
    var sp = speedFactor();
    var rw = rect.width, rh = rect.height;
    var root = document.createElement("div");
    root.className = "guadana-sternum-blood-x guadana-blood-x";
    root.setAttribute("aria-hidden", "true");

    var SLASH_MS = Math.round(150 * sp);
    var GAP_MS = Math.round(130 * sp);
    // Los dos tajos, en aspa y algo mas largos que el rodillo (las puntas de
    // la mancha son finas). Peticion del usuario (2026-10-19: "mas
    // aleatorias, no siempre las mismas en los mismos lados"): cada vez
    // otras manchas, primero una diagonal u otra, con el lado gordo arriba o
    // abajo, puntas movidas, mas o menos largas y gruesas.
    var x0 = rect.left, y0 = rect.top;
    var diagonals = [
      [{ x: 0.06, y: 0.12 }, { x: 0.96, y: 0.88 }],
      [{ x: 0.94, y: 0.1 }, { x: 0.04, y: 0.9 }]
    ];
    if (Math.random() < 0.5) diagonals.reverse();
    var used = 0;
    diagonals.forEach(function (d, i) {
      var n = pick(STREAKS, used);
      used = n;
      var ends = Math.random() < 0.5 ? d : [d[1], d[0]];
      var grow = rand(0.9, 1.18);
      var s = { x: ends[0].x + rand(-0.12, 0.12), y: ends[0].y + rand(-0.08, 0.08) };
      var e = { x: ends[1].x + rand(-0.12, 0.12), y: ends[1].y + rand(-0.08, 0.08) };
      var mx = (s.x + e.x) / 2, my = (s.y + e.y) / 2;
      var sp0 = { x: x0 + rw * (mx + (s.x - mx) * grow), y: y0 + rh * (my + (s.y - my) * grow) };
      var sp1 = { x: x0 + rw * (mx + (e.x - mx) * grow), y: y0 + rh * (my + (e.y - my) * grow) };
      // Las anchas y los abanicos, mas aplastados (si no, tapan el rodillo).
      var squash = n === 1 || n >= 6 ? rand(0.42, 0.6) : rand(0.55, 0.85);
      var splat = placeSplat(root, n, sp0, sp1, { squash: squash, mirror: Math.random() < 0.5 });
      splat.reveal(i * GAP_MS, SLASH_MS);
    });

    // En el cruce (mas o menos), una mancha que salta al cruzarse, de
    // cualquier lado; a veces ninguna.
    var poolAt = GAP_MS + Math.round(SLASH_MS * 0.6);
    var cx = x0 + rw * rand(0.38, 0.62), cy = y0 + rh * rand(0.4, 0.6);
    var hasPool = Math.random() < 0.8;
    var poolN = pick(POOLS);
    var poolW = rw * (poolN === 1 ? rand(0.8, 1.3) : rand(0.7, 1.05));
    var pa = rand(0, Math.PI * 2);
    var pool = placeSplat(root, poolN, { x: cx - Math.cos(pa) * poolW / 2, y: cy - Math.sin(pa) * poolW / 2 }, { x: cx + Math.cos(pa) * poolW / 2, y: cy + Math.sin(pa) * poolW / 2 }, { squash: rand(0.6, 1), mirror: Math.random() < 0.5 });
    if (!hasPool) pool.el.style.display = "none";
    pool.el.style.opacity = "0";
    var poolWrap = document.createElement("div");
    poolWrap.className = "guadana-blood-x__pool";
    poolWrap.style.transformOrigin = f(cx) + "px " + f(cy) + "px";
    root.insertBefore(poolWrap, root.firstChild);
    poolWrap.appendChild(pool.el);
    animate(pool.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 60, delay: poolAt, fill: "both" });
    animate(poolWrap, [{ scale: "0.25" }, { scale: "1.1", offset: 0.55 }, { scale: "1" }], { duration: Math.round(260 * sp), delay: poolAt, easing: "ease-out", fill: "both" });

    document.body.appendChild(root);

    // Golpe de sangre en el cruce (particulas del canvas de la guillotina).
    var gd = window.OssuaryGuillotineDrop;
    if (gd && typeof gd.blood === "function") {
      window.setTimeout(function () {
        gd.blood(cx, cy, { count: 30, spread: Math.PI * 2, speed: 320, lift: 70, big: true, width: rw * 0.4 });
      }, poolAt);
    }

    // Se seca y se va.
    var dryAt = Math.round(2500 * sp);
    animate(root, [
      { filter: "brightness(1) saturate(1)", opacity: 1 },
      { filter: "brightness(0.62) saturate(0.85)", opacity: 1, offset: 0.6 },
      { filter: "brightness(0.55) saturate(0.8)", opacity: 0 }
    ], { duration: Math.round(1100 * sp), delay: dryAt, easing: "ease-in", fill: "both" });
    window.setTimeout(function () { root.remove(); }, dryAt + Math.round(1150 * sp));
    return root;
  }

  // En memoria antes de que haga falta (sin prisa).
  window.setTimeout(preload, 6000);

  window.OssuaryGuadanaBloodX = { spawn: spawn };
  window.OssuaryBloodSplats = { src: function (n) { return art(src(n)); }, info: function (n) { return SPLATS[n] || null; }, preload: preload };
})();
