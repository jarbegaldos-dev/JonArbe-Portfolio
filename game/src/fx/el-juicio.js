(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // SUPER BONUS "El Juicio" (peticion del usuario, 2026-10-17): puesta en
  // escena y flujo. Reglas en src/bonus/el-juicio-engine.js y numeros en
  // src/config/el-juicio.config.js.
  //
  // Va encima del tablero del juego, como la ruleta: mientras dura, los
  // rodillos se ocultan y este modulo dibuja los 8 cepos (las mitades de
  // rib2-5, con cuerpo, manos y cabeza como en el Execution), la Muerte en el
  // esternon, el nido de los cuervos en rib1 (tres rodillos; la guillotina solo
  // baja en la Siega y la Sentencia, a cortar manos), la linterna de almas donde va el
  // cofre y las campanadas en la torre derecha. Las tiradas van solas. Al acabar llama a
  // hooks.onFinish({ total, ... }) y game.js paga, saca el resumen y llama a
  // close().
  //
  // Antes de empezar: playHoodTease({ fall }) hace amagar al encapuchado del
  // marco (y caer al esternon si fall) al completarse la cadena del Execution
  // Bonus; playHoodFall() es la caida sola (ruleta y debug).
  //
  // Efectos: chispas, sangre, polvo, golpe y temblor de la maquina son los de
  // la guillotina del Execution (src/fx/guillotine-drop.js); brasas, estelas
  // de las almas y motas de oro van en un lienzo propio. El premio final sale
  // con el contador BIG WIN del juego (hooks.showWinCounter).
  //
  // Arte de la Muerte provisional (capucha del marco, manto, guadana y humo);
  // cuando el usuario pase la definitiva va en el-juicio.config.js#deathArt.
  // ---------------------------------------------------------------------------

  var CFG = window.OSSUARY_EL_JUICIO_CONFIG;
  var ENGINE = window.OssuaryElJuicioEngine;
  if (!CFG || !ENGINE) return;

  var ART = {
    POBRE: "assets/symbols/pobre.png",
    NOBLE: "assets/symbols/noble.png",
    RICO: "assets/symbols/rico.png",
    EMPTY: "assets/symbols/cepo_vacio.png",
    frameNoHood: "assets/super_bonus/ribcage_overlay_top_nohood.png",
    hood: "assets/super_bonus/hood_figure.png",
    // La Muerte definitiva del usuario (src/config/el-juicio.config.js#deathArt).
    death: (CFG && CFG.deathArt) || null,
    // Arte del usuario recortado del croma (tools/bake-el-juicio-user-art.js):
    // su mano derecha (va encima de la guadana), la guadana y la campana en
    // tres capas del mismo lienzo (madera quieta, campana y badajo).
    deathHand: "assets/super_bonus/death_hand.png",
    scythe: "assets/super_bonus/scythe.png",
    bellBeam: "assets/super_bonus/bell_beam.png",
    bellBody: "assets/super_bonus/bell_body.png",
    bellClapper: "assets/super_bonus/bell_clapper.png",
    guillotine: "assets/symbols/rib1-rib-bonus.png",
    crowDead: "assets/symbols/bird-dead.png",
    crowShape: "assets/symbols/bird.png",
    lantern: "assets/symbols/lantern.png",
    smoke: ["assets/effects/smoke/symbol-smoke-2.png", "assets/effects/smoke/symbol-smoke-4.png", "assets/effects/smoke/symbol-smoke-6.png"],
    // Manchas de sangre del usuario (tools/bake-blood-splats.js) para la
    // marca de los rodillos del nido: regueros en diagonal y abanicos.
    nestSplats: [2, 3, 4, 6, 7].map(function (n) { return "assets/bonus_fx/blood_splat_" + n + ".webp"; }),
    // Las plumas del usuario (tools/bake-el-juicio-user-art.js feathers) que
    // rellenan las casillas vacias del nido.
    nestFeathers: [1, 2, 3].map(function (n) { return "assets/super_bonus/nest_feather_" + n + ".webp"; })
  };
  // Manos y cabezas de cada esqueleto: mismo lienzo 924x500 que el cuerpo
  // (assets/symbols/symbol-assets.js).
  var HANDS = { POBRE: "assets/symbols/manos-pobre.png", NOBLE: "assets/symbols/manos-pobre.png", RICO: "assets/symbols/manos-rico.png" };
  var HEADS = { POBRE: "assets/symbols/cabeza-pobre.png", NOBLE: "assets/symbols/cabeza-noble.png", RICO: "assets/symbols/cabeza-rico.png" };
  // Puntos del lienzo 924x500 (mitad derecha; las izquierdas van en espejo):
  // cuello y agujeros de las manos.
  var NECK = { x: 0.66, y: 0.46 };
  var HAND_HOLES = { x: 0.3, y: 0.8 };
  // Muerte de cuerpo entero (assets/super_bonus/death_full.png, 629x1400):
  // hueco de la cara y mano derecha (la de la guadana) en fracciones de la
  // imagen; headroom: aire encima de la capucha para la hoja.
  var DEATH_ART = {
    ar: 629 / 1400,
    face: { left: 0.4, top: 0.07, width: 0.2, height: 0.08 },
    grip: { x: 0.81, y: 0.52 },
    headroom: 0.16
  };
  // Guadana del usuario (scythe.png, 346x1000): agarre en el mango (fracciones
  // de la imagen), alto en altos de la figura (la hoja queda sobre la capucha
  // y el pie cerca del suelo) e inclinacion para que quepa en el esternon.
  var SCYTHE_ART = { ar: 346 / 1000, grip: { x: 0.468, y: 0.6 }, scale: 1.13, tilt: -12 };
  // Sin arte: la guadana dibujada (SVG, viewBox 120x320).
  var SCYTHE_SVG_GRIP = { x: 0.45, y: 0.72 };
  // Campana del usuario (bell_*.png, 507x640): eje del que cuelga, eje del
  // badajo y altura de la cifra de campanadas (fracciones del lienzo).
  var BELL_ART = { ar: 880 / 1110, pivot: { x: 0.4966, y: 0.2396 }, clapperPivot: { x: 0.4955, y: 0.8396 }, countY: 0.545 };
  // Cepos de arriba abajo, izquierda y derecha.
  var CEPO_REELS = ["rib2-left", "rib2-right", "rib3-left", "rib3-right", "rib4-left", "rib4-right", "rib5-left", "rib5-right"];
  // Nido de los cuervos (rib1, peticion del usuario 2026-10-18): 3 rodillos
  // verticales. cell: alto de la casilla del centro en altos del rodillo
  // (desde el 2026-10-19 el rodillo entero: al usuario no le convencian los
  // cuervos que se quedaban asomando arriba y abajo; con 0.7 asomaban; el
  // cuervo mide lo mismo, lo da el ancho); slots: casillas que se pintan a la
  // vez; speed y creepSpeed en casillas por segundo; creepCells: lo que entra
  // a paso de tortuga; kick: lo que se echa atras al arrancar; bounce: rebote
  // al parar; stagger: ms entre parada y parada; fogFlow: altos de niebla que
  // baja por cada casilla que gira el rodillo.
  // Simbolos: 0 nada, 1 cuervo, 2 cuervo dorado.
  var NEST = { cell: 1, slots: 4, speed: 8.5, creepSpeed: 1.6, creepCells: 1.4, kick: 0.16, bounce: 0.12, stagger: 170, fogFlow: 0.42 };
  // Arranque de una tirada (peticion del usuario, 2026-10-19: "que vaya por
  // orden"): los cepos de arriba abajo (ms entre costilla y costilla y de la
  // mitad izquierda a la derecha) y el nido despues, casi seguido.
  var SPIN_ORDER = { row: 70, side: 30, nestAfter: 200 };
  var STRIP_FRAMES = ["EMPTY", "POBRE", "EMPTY", "NOBLE", "EMPTY", "RICO"];

  var hooks = {
    getBet: function () { return 1; },
    render: function () {},
    speedMs: function (x) { return x; },
    random: Math.random,
    showWinCounter: null,
    onFinish: function () {}
  };

  var stage = document.getElementById("slotStage");
  var overlay = document.getElementById("structureOverlay");
  var reelLayer = document.getElementById("reelLayer");

  var engine = null;
  var S = null;
  var V = null;
  var active = false;
  var els = null;
  var fallenSprite = null;
  var frameSwapped = false;
  var originalFrameSrc = null;
  var resizeObserver = null;
  var debugNext = { golden: false, harvest: false, flock: false, blight: false };
  var shownSack = 0;
  var sackTween = 0;
  // Premio de la Sentencia ya multiplicado en la linterna (null hasta entonces).
  var lanternFinal = null;
  // Trabajo visual propio del modo: se cancela al retirar su tablero.
  var pendingTimeouts = new Set();
  var pendingIntervals = new Set();
  var pendingFrames = new Set();
  function schedule(fn, delay) {
    var id = window.setTimeout(function () { pendingTimeouts.delete(id); fn(); }, delay);
    pendingTimeouts.add(id);
    return id;
  }
  function cancelScheduled(id) { pendingTimeouts.delete(id); window.clearTimeout(id); }
  function repeat(fn, delay) { var id = window.setInterval(fn, delay); pendingIntervals.add(id); return id; }
  function cancelRepeat(id) { pendingIntervals.delete(id); window.clearInterval(id); }
  function nextFrame(fn) {
    var id = window.requestAnimationFrame(function (now) { pendingFrames.delete(id); fn(now); });
    pendingFrames.add(id);
    return id;
  }
  function cancelFrame(id) { pendingFrames.delete(id); window.cancelAnimationFrame(id); }

  // --- utilidades -------------------------------------------------------------
  function ms(x) {
    var v = hooks.speedMs ? hooks.speedMs(x) : x;
    return Math.max(0, Number(v) || 0);
  }

  function wait(x) {
    return new Promise(function (resolve) { schedule(resolve, ms(x)); });
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function sound(eventName, payload) {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger(eventName, payload || {});
  }

  function bet() {
    return Number(hooks.getBet && hooks.getBet()) || 1;
  }

  function money(multiple) {
    var amount = Math.round(multiple * bet() * 100) / 100;
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Cifras en oro y palabras en la fuente Buffied de los bonus (peticion del
  // usuario, 2026-10-17; src/ui/bonus-fonts.css).
  function gold(el, text) {
    if (!el) return;
    if (window.OssuaryNumberFont && window.OssuaryNumberFont.canRenderWords(String(text).replace(/[.,]/g, ""))) {
      window.OssuaryNumberFont.render(el, text, { letters: true, words: true, separatorImages: true });
    } else {
      el.textContent = text;
    }
  }

  // El servidor local manda las imagenes con no-store: cada <img> nueva o
  // cada cambio de src volveria a pedir y descodificar el PNG. Se usa la
  // copia en memoria de src/render/symbol-renderer.js (la ruta si aun no).
  function art(src) {
    var r = window.OssuarySymbolRenderer;
    return r && r.residentArtUrl ? r.residentArtUrl(src) : src;
  }

  function keepResident(src) {
    var r = window.OssuarySymbolRenderer;
    return r && r.preloadArt ? r.preloadArt(src) : Promise.resolve(false);
  }

  function div(className, parent) {
    var el = document.createElement("div");
    el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }

  function img(src, className, parent) {
    var el = document.createElement("img");
    el.src = art(src);
    el.alt = "";
    el.draggable = false;
    el.decoding = "async";
    if (className) el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }

  function restartClass(el, className) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  function animate(el, frames, options) {
    if (!el || typeof el.animate !== "function") return Promise.resolve();
    var opts = Object.assign({}, options, { duration: ms(options.duration), delay: ms(options.delay || 0) });
    var a = el.animate(frames, opts);
    return new Promise(function (resolve) {
      a.onfinish = resolve;
      a.oncancel = resolve;
    });
  }

  // Efectos de la guillotina del Execution (chispas, sangre, polvo, golpe).
  function gfx() {
    return window.OssuaryGuillotineDrop || null;
  }

  // --- geometria ----------------------------------------------------------------
  // Todo en % de la caja de #reelLayer, que es la misma que la de
  // #structureOverlay (las dos mas grandes que #slotStage cuando el layout
  // amplia la maquina). El tablero va dentro de #reelLayer y los efectos
  // dentro de #structureOverlay.
  function refBox() {
    return (reelLayer || stage).getBoundingClientRect();
  }

  function boxOf(el) {
    if (!el) return null;
    var a = el.getBoundingClientRect();
    var s = refBox();
    if (!a.width || !a.height || !s.width) return null;
    return { x: a.left - s.left, y: a.top - s.top, w: a.width, h: a.height, sw: s.width, sh: s.height };
  }

  function place(el, b) {
    if (!el || !b) return;
    el.style.left = (b.x / b.sw) * 100 + "%";
    el.style.top = (b.y / b.sh) * 100 + "%";
    el.style.width = (b.w / b.sw) * 100 + "%";
    el.style.height = (b.h / b.sh) * 100 + "%";
  }

  function laneBox(reelId) {
    return boxOf(document.querySelector('.reel-lane[data-reel="' + reelId + '"]'));
  }

  function cellBox(cellId) {
    return boxOf(document.querySelector('.symbol-cell[data-cell="' + cellId + '"]'));
  }

  // Rect de pantalla (viewport) de un elemento.
  function vrect(el) {
    if (!el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    return r.width ? r : null;
  }

  // Caja del arte 924x500 dentro de su caja (object-fit: contain).
  function containRect(rect, ar) {
    if (!rect) return null;
    var w = rect.width, h = rect.height;
    var cw = Math.min(w, h * ar), ch = Math.min(h, w / ar);
    var left = rect.left + (w - cw) / 2, top = rect.top + (h - ch) / 2;
    return { left: left, top: top, width: cw, height: ch, right: left + cw, bottom: top + ch };
  }

  // Punto de pantalla dentro de un rect, en fracciones (x, y).
  function vpoint(rect, fx, fy) {
    return { x: rect.left + rect.width * fx, y: rect.top + rect.height * fy };
  }

  function frameImg() {
    return document.querySelector('img[data-scene-layer="ribcage_overlay_top"]');
  }

  function sternumBox() {
    return laneBox("sternum");
  }

  // --- lienzo propio: brasas, estelas de almas, motas de oro y humo -----------
  var refCache = null;
  function ref() {
    return refCache || (refCache = refBox());
  }

  var pCanvas = null;
  var pCtx = null;
  var particles = [];
  var pRaf = 0;
  var pLast = 0;
  var emberTimer = 0;

  function ensureParticles() {
    if (pCanvas && pCanvas.isConnected) return true;
    if (!overlay) return false;
    pCanvas = document.createElement("canvas");
    pCanvas.className = "el-juicio-particles";
    pCanvas.setAttribute("aria-hidden", "true");
    overlay.appendChild(pCanvas);
    pCtx = pCanvas.getContext("2d");
    sizeParticles();
    return Boolean(pCtx);
  }

  function sizeParticles() {
    if (!pCanvas) return;
    var r = ref();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (pCanvas.width !== w || pCanvas.height !== h) {
      pCanvas.width = w;
      pCanvas.height = h;
    }
    pCanvas.scaleX = w / Math.max(1, r.width);
    pCanvas.scaleY = h / Math.max(1, r.height);
  }

  // x, y en pantalla (viewport).
  function emit(kind, x, y, opts) {
    if (!ensureParticles()) return;
    opts = opts || {};
    var r = ref();
    var p = {
      kind: kind,
      x: x - r.left,
      y: y - r.top,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      gravity: opts.gravity || 0,
      drag: opts.drag == null ? 0.97 : opts.drag,
      size: opts.size || 3,
      life: opts.life || 1,
      age: 0,
      sway: opts.sway || 0,
      phase: Math.random() * 6.28,
      color: opts.color || null
    };
    if (particles.length > 520) particles.shift();
    particles.push(p);
    if (!pRaf) {
      pLast = 0;
      pRaf = nextFrame(stepParticles);
    }
  }

  function burst(kind, x, y, count, opts) {
    opts = opts || {};
    for (var i = 0; i < count; i++) {
      var a = (opts.dir == null ? 0 : opts.dir) + (opts.spread == null ? Math.PI * 2 : opts.spread) * (Math.random() - 0.5);
      var v = (opts.speed || 160) * (0.35 + Math.random() * 0.8);
      emit(kind, x + rand(-1, 1) * (opts.width || 0), y + rand(-1, 1) * (opts.height || 0), {
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        gravity: opts.gravity || 0,
        drag: opts.drag,
        size: (opts.size || 3) * (0.6 + Math.random() * 0.8),
        life: (opts.life || 0.9) * (0.6 + Math.random() * 0.7),
        sway: opts.sway || 0,
        color: opts.color
      });
    }
  }

  // Sprites ya pintados (un degradado por color, una sola vez): dibujar un
  // degradado nuevo por particula y fotograma era lo que mas costaba.
  var spriteCache = {};
  function glowSprite(color, smoke) {
    var key = (smoke ? "s" : "g") + color;
    if (spriteCache[key]) return spriteCache[key];
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var x = c.getContext("2d");
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (smoke) {
      g.addColorStop(0, "rgba(" + color + ",0.42)");
      g.addColorStop(1, "rgba(" + color + ",0)");
    } else {
      g.addColorStop(0, "rgba(255,255,240,1)");
      g.addColorStop(0.25, "rgba(" + color + ",0.85)");
      g.addColorStop(1, "rgba(" + color + ",0)");
    }
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    spriteCache[key] = c;
    return c;
  }

  function stepParticles(now) {
    pRaf = 0;
    refCache = null;
    if (!pCtx || !pCanvas || !pCanvas.isConnected) {
      particles = [];
      return;
    }
    sizeParticles();
    var dt = pLast ? Math.min(0.05, (now - pLast) / 1000) : 0.016;
    pLast = now;
    var sx = pCanvas.scaleX || 1, sy = pCanvas.scaleY || 1;
    pCtx.setTransform(sx, 0, 0, sy, 0, 0);
    pCtx.clearRect(0, 0, pCanvas.width / sx, pCanvas.height / sy);
    var alive = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt;
      p.x += (p.vx + Math.sin(p.phase + p.age * 3) * p.sway) * dt;
      p.y += p.vy * dt;
      var k = 1 - p.age / p.life;
      var fadeIn = Math.min(1, p.age / 0.12);
      if (p.kind === "smoke") {
        pCtx.globalCompositeOperation = "source-over";
        var rs = p.size * (1 + (1 - k) * 2.2);
        pCtx.globalAlpha = Math.max(0, Math.min(1, k * fadeIn));
        pCtx.drawImage(glowSprite(p.color || "40,8,8", true), p.x - rs, p.y - rs, rs * 2, rs * 2);
      } else {
        // brasa, alma u oro: punto que brilla (luz sumada).
        pCtx.globalCompositeOperation = "lighter";
        var col = p.color || (p.kind === "soul" ? "150,255,220" : p.kind === "gold" ? "255,206,90" : "255,120,40");
        var rr = 3 * p.size * (p.kind === "soul" ? 0.6 + 0.4 * k : 0.5 + 0.5 * k);
        pCtx.globalAlpha = Math.max(0, Math.min(1, (p.kind === "ember" ? 0.85 * Math.min(1, k * 2.5) : 0.9 * k) * fadeIn));
        pCtx.drawImage(glowSprite(col, false), p.x - rr, p.y - rr, rr * 2, rr * 2);
      }
      alive.push(p);
    }
    pCtx.globalCompositeOperation = "source-over";
    pCtx.globalAlpha = 1;
    particles = alive;
    if (particles.length) pRaf = nextFrame(stepParticles);
  }

  // Brasas que suben del tablero mientras dura el Super (mas con cada forma
  // de la Muerte).
  function startEmbers() {
    stopEmbers();
    emberTimer = repeat(function () {
      if (!active || !els) return;
      var r = vrect(els.board);
      if (!r) return;
      var form = V ? formFor(vMultiplier()) : 1;
      var n = form >= 4 ? 3 : form >= 3 ? 2 : 1;
      for (var i = 0; i < n; i++) {
        emit("ember", r.left + r.width * rand(0.28, 0.72), r.top + r.height * rand(0.78, 0.98), {
          vx: rand(-12, 12), vy: rand(-55, -25), drag: 0.995, size: rand(1.2, 2.6), life: rand(2.4, 4.2), sway: rand(10, 26),
          color: form >= 4 ? "255,190,60" : "255,96,30"
        });
      }
      // De vez en cuando se le escapa una ascua de los ojos.
      if (Math.random() < 0.05 * form) eyesEmbers(1, form >= 4 ? "255,206,90" : null);
    }, 260);
  }

  // El lienzo se quita cuando ya no hace falta (amago sin Super).
  function releaseParticles() {
    schedule(function () {
      if (active || !pCanvas) return;
      pCanvas.remove();
      pCanvas = null;
      pCtx = null;
      particles = [];
    }, 2500);
  }

  function stopEmbers() {
    if (emberTimer) cancelRepeat(emberTimer);
    emberTimer = 0;
  }

  // Onda que se abre desde un punto de pantalla (anillo de luz).
  function shockwave(x, y, size, kind) {
    if (!overlay) return;
    var r = ref();
    var ring = div("el-juicio-ring" + (kind ? " is-" + kind : ""), overlay);
    ring.style.left = ((x - r.left) / r.width) * 100 + "%";
    ring.style.top = ((y - r.top) / r.height) * 100 + "%";
    ring.style.width = size + "px";
    ring.style.height = size + "px";
    animate(ring, [
      { transform: "translate(-50%, -50%) scale(0.15)", opacity: 1 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 0 }
    ], { duration: 620, easing: "cubic-bezier(.15,.7,.3,1)" }).then(function () { ring.remove(); });
  }

  // --- el marco sin el encapuchado --------------------------------------------
  function swapFrame(withoutHood) {
    var el = frameImg();
    if (!el) return;
    if (withoutHood && !frameSwapped) {
      originalFrameSrc = el.getAttribute("src");
      el.setAttribute("src", art(ART.frameNoHood));
      frameSwapped = true;
    } else if (!withoutHood && frameSwapped) {
      el.setAttribute("src", originalFrameSrc || "assets/structure/ribcage_overlay_top.png");
      frameSwapped = false;
    }
    // Las luces del marco (.frame-depth) usan su PNG de mascara.
    stage.classList.toggle("el-juicio-nohood", frameSwapped);
  }

  // --- el encapuchado: amago y caida ------------------------------------------
  function preload() {
    [ART.frameNoHood, ART.hood, ART.POBRE, ART.NOBLE, ART.RICO, ART.EMPTY, ART.guillotine, ART.crowDead, ART.crowShape, ART.lantern, ART.death, ART.deathHand, ART.scythe, ART.bellBeam, ART.bellBody, ART.bellClapper]
      .concat(Object.keys(HANDS).map(function (k) { return HANDS[k]; }))
      .concat(Object.keys(HEADS).map(function (k) { return HEADS[k]; }))
      .concat(ART.smoke)
      .concat(ART.nestSplats)
      .concat(ART.nestFeathers)
      .filter(Boolean)
      .forEach(function (src) { keepResident(src); });
    if (window.OssuaryNumberFont && window.OssuaryNumberFont.preloadLetters) {
      window.OssuaryNumberFont.preloadLetters("DEATH TOLLS 13 BELLS HARVEST THE SENTENCE LAST BELL BLIGHTED SCYTHE MURDER OF CROWS ONE MORE x+1 MAX");
    }
  }

  function sternumCall(on) {
    var lane = document.querySelector('.reel-lane[data-reel="sternum"]');
    if (lane) lane.classList.toggle("el-juicio-sternum-call", Boolean(on));
  }

  // Penumbra sobre la maquina mientras el encapuchado amaga.
  function dread(on) {
    var el = overlay && overlay.querySelector(".el-juicio-dread");
    if (on && !el && overlay) {
      el = div("el-juicio-dread", overlay);
      void el.offsetWidth;
      el.classList.add("is-on");
    } else if (!on && el) {
      el.classList.remove("is-on");
      schedule(function () { el.remove(); }, 500);
    }
  }

  // Amago y caida del encapuchado, de seguido (src/fx/el-juicio-fall.js,
  // peticion del usuario 2026-10-17): el esternon gira a oscuras, el
  // encapuchado se ilumina por detras y se tambalea y, si fall, se mete detras
  // de la viga y la Muerte entera sale por el esternon con estruendo (se
  // queda ahi hasta que empieza el Super: clearFallenSprite). leadMs: tiempo
  // del esternon girando antes del amago. Devuelve una promesa con true si
  // cayo.
  async function playHoodTease(options) {
    var opts = options || {};
    preload();
    if (!window.OssuaryElJuicioFall || !overlay) return Boolean(opts.fall);
    var result = await window.OssuaryElJuicioFall.play({
      fall: Boolean(opts.fall),
      quick: Boolean(opts.quick),
      leadMs: opts.leadMs || 0,
      overlay: overlay,
      reelLayer: reelLayer || stage,
      hoodSrc: ART.hood,
      frameNoHoodSrc: ART.frameNoHood,
      swapFrame: swapFrame,
      dread: dread,
      buildDeath: buildSternumDeath,
      fx: { animate: animate, wait: wait, emit: emit, burst: burst, shockwave: shockwave, sound: sound, gfx: gfx }
    });
    if (!result.fell) releaseParticles();
    fallenSprite = result.landing || null;
    dread(false);
    return result.fell;
  }

  function playHoodFall() {
    return playHoodTease({ fall: true, quick: true });
  }

  // La Muerte del tablero, sola en la caja del esternon: la que cae en la
  // entrada (src/fx/el-juicio-fall.js), identica a la del Super.
  function buildSternumDeath(parent) {
    var st = sternumBox();
    if (!st) return null;
    var d = buildDeath(parent);
    place(d.death, st);
    if (d.figure) layoutFigure(st, d);
    return d;
  }

  function clearFallenSprite() {
    if (fallenSprite) fallenSprite.remove();
    fallenSprite = null;
  }

  // --- construccion del tablero ------------------------------------------------
  function buildCepo(parent, reelId, i) {
    var mirrored = /-left$/.test(reelId);
    var c = div("el-juicio-cepo" + (mirrored ? " is-left" : ""), parent);
    c.dataset.cepo = String(i);
    var fog = buildLaneFog(i, mirrored);
    c.appendChild(fog);
    div("el-juicio-cepo__fire", c);
    var stack = div("el-juicio-cepo__stack", c);
    var body = img(ART.EMPTY, "el-juicio-cepo__body", stack);
    var hands = img(HANDS.POBRE, "el-juicio-cepo__hands", stack);
    var head = img(HEADS.POBRE, "el-juicio-cepo__head", stack);
    hands.hidden = true;
    head.hidden = true;
    // Tira para el giro: seis caras dos veces (bucle sin salto).
    var strip = div("el-juicio-cepo__strip", c);
    STRIP_FRAMES.concat(STRIP_FRAMES).forEach(function (key) {
      var frame = div("el-juicio-cepo__frame", strip);
      img(ART[key], "el-juicio-cepo__frame-art" + (key === "EMPTY" ? " is-empty" : ""), frame);
    });
    var plate = div("el-juicio-plate", c);
    plate.hidden = true;
    return { el: c, stack: stack, body: body, hands: hands, head: head, strip: strip, plate: plate, fog: fog, reelId: reelId, mirrored: mirrored };
  }

  function smokeMask(el, n) {
    var url = 'url("assets/effects/smoke/symbol-smoke-' + n + '.png")';
    el.style.webkitMaskImage = url;
    el.style.maskImage = url;
  }

  // Niebla en el negro del cepo: la de los rodillos del Execution
  // (src/fx/bonus-lane-fog.js, estilos en raven-bonus.css), tres capas a la
  // deriva con el desfase de su carril; al caer un condenado se abre con el
  // golpe (.is-impact).
  function buildLaneFog(index, mirrored) {
    var fog = div("bonus-lane-fog el-juicio-cepo__fog");
    if (mirrored) fog.style.scale = "-1 1";
    ["a", "b", "c"].forEach(function (name, k) {
      var layer = document.createElement("span");
      layer.className = "bonus-lane-fog__layer bonus-lane-fog__layer--" + name;
      smokeMask(layer, ((index * 2 + k * 3) % 6) + 1);
      layer.style.animationDelay = (-((index * 3.7 + k * 5.3) % 17)).toFixed(2) + "s";
      fog.appendChild(layer);
    });
    ["l", "r"].forEach(function (side, k) {
      var puff = document.createElement("span");
      puff.className = "bonus-lane-fog__puff bonus-lane-fog__puff--" + side;
      smokeMask(puff, ((index + k * 2) % 6) + 1);
      fog.appendChild(puff);
    });
    return fog;
  }

  function addEyes(head) {
    var eyes = div("el-juicio-death__eyes", head);
    div("el-juicio-death__eye", eyes);
    div("el-juicio-death__eye", eyes);
  }

  // Ojos macabros de la Muerte de cuerpo entero (los del encapuchado que
  // mira, src/fx/hood-eyes.js, aqui vivos): halo rojo en la capucha, cuencas
  // con ascua y pupila blanca de alfiler, la derecha entorna y sangre que cae
  // con la rabia. Miran lo que pasa en los rodillos (eyesLook) y cambian con
  // lo que ocurre (eyesMood). Capas: __scan (barre mientras giran) > __look
  // (mira a un punto) > pupilas (tiemblan).
  function buildMacabreEyes(head) {
    var root = div("el-juicio-eyes", head);
    div("el-juicio-eyes__haze", root);
    var socketL = div("el-juicio-eyes__socket is-l", root);
    var socketR = div("el-juicio-eyes__socket is-r", root);
    var scan = div("el-juicio-eyes__scan", root);
    var look = div("el-juicio-eyes__look", scan);
    div("el-juicio-eyes__pupil is-l", look);
    div("el-juicio-eyes__pupil is-r", look);
    div("el-juicio-eyes__blood is-l", root);
    div("el-juicio-eyes__blood is-r", root);
    // Se dibujan en canvas (src/fx/eye-glow.js, 2026-10-25): leen estas
    // mismas clases y la mirada de __look; las capas CSS quedan invisibles.
    if (window.OssuaryEyeGlow) window.OssuaryEyeGlow.attachJudgment(root, look);
    return { root: root, scan: scan, look: look, socketL: socketL, socketR: socketR };
  }

  function buildDeath(board) {
    var death = div("el-juicio-death f1" + (ART.death ? " has-art" : ""), board);
    var aura = div("el-juicio-death__aura", death);
    ART.smoke.forEach(function (src, k) { img(src, "el-juicio-death__smoke el-juicio-death__smoke--" + (k + 1), aura); });
    div("el-juicio-death__glow", death);
    // Niebla detras de la Muerte: cinco capas a la deriva (como la de los
    // cepos, mas espesa) y bruma baja a sus pies.
    var mist = div("el-juicio-death__mist", death);
    ["a", "b", "c", "d", "e"].forEach(function (name, k) {
      smokeMask(div("el-juicio-death__mist-layer el-juicio-death__mist-layer--" + name, mist), ((k * 2 + 1) % 6) + 1);
    });
    var scythe = buildScythe(Boolean(ART.death && ART.scythe));
    var head = null;
    var figure = null;
    var eyes = null;
    if (ART.death) {
      // La figura: la guadana delante del manto y su mano derecha encima del
      // mango (la empuna); ojos en el hueco de la capucha. Su caja la pone
      // layout().
      figure = div("el-juicio-death__figure", death);
      img(ART.death, "el-juicio-death__art", figure);
      figure.appendChild(scythe);
      if (ART.scythe && ART.deathHand) img(ART.deathHand, "el-juicio-death__hand", figure);
      head = div("el-juicio-death__head is-art", figure);
      head.style.left = DEATH_ART.face.left * 100 + "%";
      head.style.top = DEATH_ART.face.top * 100 + "%";
      head.style.width = DEATH_ART.face.width * 100 + "%";
      head.style.height = DEATH_ART.face.height * 100 + "%";
      eyes = buildMacabreEyes(head);
    } else {
      div("el-juicio-death__robe", death);
      head = div("el-juicio-death__head", death);
      img(ART.hood, "el-juicio-death__hood", head);
      addEyes(head);
      death.appendChild(scythe);
    }
    div("el-juicio-death__fire", death);
    return { death: death, head: head, scythe: scythe, figure: figure, eyes: eyes };
  }

  // La guadana: el arte del usuario o, sin el, la dibujada. Lo de dentro es lo
  // que tajea y se alza (CSS); la caja lleva la inclinacion de reposo.
  function buildScythe(withArt) {
    var scythe = document.createElement("div");
    scythe.className = "el-juicio-death__scythe" + (withArt ? " is-art" : "");
    if (withArt) {
      img(ART.scythe, "el-juicio-death__scythe-art", scythe);
      return scythe;
    }
    scythe.innerHTML =
      '<svg viewBox="0 0 120 320" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="elJuicioSteel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6f2e8"/><stop offset="0.35" stop-color="#a7a6a0"/><stop offset="0.7" stop-color="#4d4c49"/><stop offset="1" stop-color="#191918"/></linearGradient>' +
      '<linearGradient id="elJuicioWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22140a"/><stop offset="0.5" stop-color="#5c3b1e"/><stop offset="1" stop-color="#1a0f07"/></linearGradient>' +
      '</defs>' +
      '<path d="M83 18 L93 21 L45 318 L35 315 Z" fill="url(#elJuicioWood)"/>' +
      '<path d="M78 30 l14 4 l-2 8 l-14 -4 Z" fill="#2a2622"/>' +
      '<path d="M86 26 C 60 0, 14 -6, -16 32 C 18 12, 54 16, 81 42 Z" fill="url(#elJuicioSteel)" stroke="#0e0e0e" stroke-width="1.4"/>' +
      '<path d="M-16 32 C 18 12, 54 16, 81 42" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="1.1"/>' +
      '<path d="M30 14 C 38 16, 44 22, 40 30 M52 18 C 56 22, 56 26, 52 30" stroke="#7d0a0a" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85"/>' +
      '</svg>';
    return scythe;
  }

  function build() {
    var board = div("el-juicio-board");
    (reelLayer || stage).appendChild(board);
    var cepos = CEPO_REELS.map(function (reelId, i) { return buildCepo(board, reelId, i); });

    // rib1: el nido de los cuervos, cada rodillo con su niebla; la guillotina
    // espera arriba, fuera de la vista, y solo baja en la Siega y la Sentencia.
    var rib1 = div("el-juicio-rib1", board);
    var nest = buildNest(rib1);
    var blade = img(ART.guillotine, "el-juicio-rib1__blade", rib1);

    var d = buildDeath(board);

    var fx = div("el-juicio-fx");
    overlay.appendChild(fx);
    var tint = div("el-juicio-tint", fx);

    var mult = div("el-juicio-mult", fx);
    var multValue = div("el-juicio-mult__value", mult);
    var pips = div("el-juicio-mult__pips", mult);
    var next = div("el-juicio-mult__next", mult);

    var lantern = div("el-juicio-lantern", fx);
    div("el-juicio-lantern__halo", lantern);
    img(ART.lantern, "el-juicio-lantern__art", lantern);
    div("el-juicio-lantern__glow", lantern);
    var sack = div("el-juicio-lantern__value", lantern);
    var occupancy = div("el-juicio-lantern__occupancy", lantern);
    occupancy.setAttribute("role", "status");

    // Campana del usuario: la madera no se mueve; la campana oscila colgada de
    // sus argollas y el badajo con retraso. Las campanadas que quedan van en
    // la campana (oscilan con ella).
    var bell = div("el-juicio-bell", fx);
    // Dos giros sobre el mismo eje: el vaiven leve de siempre y, dentro, el
    // balanceo de cada campanada.
    var pivot = BELL_ART.pivot.x * 100 + "% " + BELL_ART.pivot.y * 100 + "%";
    var sway = div("el-juicio-bell__sway", bell);
    sway.style.transformOrigin = pivot;
    var swing = div("el-juicio-bell__swing", sway);
    swing.style.transformOrigin = pivot;
    var clapper = div("el-juicio-bell__clapper", swing);
    clapper.style.transformOrigin = BELL_ART.clapperPivot.x * 100 + "% " + BELL_ART.clapperPivot.y * 100 + "%";
    img(ART.bellClapper, "el-juicio-bell__layer", clapper);
    img(ART.bellBody, "el-juicio-bell__layer el-juicio-bell__body", swing);
    var bellCount = div("el-juicio-bell__count", swing);
    bellCount.style.top = BELL_ART.countY * 100 + "%";
    img(ART.bellBeam, "el-juicio-bell__layer el-juicio-bell__beam", bell);
    var bellNote = div("el-juicio-bell__note", bell);

    els = {
      board: board, fx: fx, tint: tint, cepos: cepos, rib1: rib1, blade: blade, nest: nest,
      death: d.death, head: d.head, scythe: d.scythe, figure: d.figure, eyes: d.eyes,
      mult: mult, multValue: multValue, pips: pips, next: next, lantern: lantern, sack: sack, occupancy: occupancy,
      bell: bell, bellCount: bellCount, bellNote: bellNote
    };
    renderNest();
  }

  function layout() {
    refCache = null;
    if (!els) return;
    els.cepos.forEach(function (c) { place(c.el, laneBox(c.reelId)); });
    var r1 = laneBox("rib1");
    place(els.rib1, r1);
    var st = sternumBox();
    place(els.death, st);
    if (st && els.figure) layoutFigure(st);
    if (st) {
      place(els.mult, { x: st.x - st.w * 0.35, y: st.y + st.h * 0.46, w: st.w * 1.7, h: st.h * 0.34, sw: st.sw, sh: st.sh });
    }
    // Linterna donde va el cofre (misma caja que la caja de manos del
    // Execution Bonus: 762,607 de 1525x779).
    var s = refBox();
    var lw = (230 / 1525) * s.width, lh = (190 / 779) * s.height;
    place(els.lantern, { x: (762 / 1525) * s.width - lw / 2, y: (602 / 779) * s.height - lh / 2, w: lw, h: lh, sw: s.width, sh: s.height });
    // Campana en la torre derecha (donde el Execution pone las velas): a la
    // derecha de rib1 y encima de rib2, sin tapar rodillos; sube por el marco
    // para tener buen tamano.
    var right = laneBox("rib2-right");
    if (r1 && right) {
      var gap = r1.h * 0.05;
      var bTop = Math.max(0, r1.y - r1.h * 0.8);
      var bh = right.y - gap - bTop;
      var bw = bh * BELL_ART.ar;
      place(els.bell, { x: r1.x + r1.w + gap, y: bTop, w: bw, h: bh, sw: r1.sw, sh: r1.sh });
      els.bell.style.fontSize = (bh * 0.13).toFixed(1) + "px";
    }
    sizeParticles();
  }

  // La Muerte de cuerpo entero dentro del esternon: entera (sin recorte), de
  // pie en el fondo y con aire encima para la hoja de la guadana, que va en
  // su mano derecha. parts: { figure, scythe } (por defecto los del tablero;
  // la caida de la entrada pasa los suyos).
  function layoutFigure(st, parts) {
    parts = parts || els;
    var availH = st.h * (1 - DEATH_ART.headroom);
    var h = Math.min(availH, st.w / DEATH_ART.ar);
    var w = h * DEATH_ART.ar;
    var f = parts.figure.style;
    f.width = (w / st.w) * 100 + "%";
    f.height = (h / st.h) * 100 + "%";
    f.left = ((st.w - w) / 2 / st.w) * 100 + "%";
    f.top = ((st.h - h) / st.h) * 100 + "%";
    // Guadana: su punto de agarre en la mano; ancho en anchos de la figura.
    var art = parts.scythe.classList.contains("is-art");
    var grip = art ? SCYTHE_ART.grip : SCYTHE_SVG_GRIP;
    var sh = art ? SCYTHE_ART.scale : 0.82 * (320 / 120) * DEATH_ART.ar;
    var sw = art ? (SCYTHE_ART.scale * SCYTHE_ART.ar) / DEATH_ART.ar : 0.82;
    var s = parts.scythe.style;
    s.width = sw * 100 + "%";
    s.left = (DEATH_ART.grip.x - grip.x * sw) * 100 + "%";
    s.top = (DEATH_ART.grip.y - grip.y * sh) * 100 + "%";
    s.right = "auto";
    s.transformOrigin = grip.x * 100 + "% " + grip.y * 100 + "%";
    s.transform = "rotate(" + (art ? SCYTHE_ART.tilt : -6) + "deg)";
  }

  // --- HUD ----------------------------------------------------------------------
  // Lo que ensena la guadana: el peldano por los dorados mas lo que han
  // sumado los infectados (V.blight), como engine.multiplier.
  function vMultiplier() {
    var base = V.rung === 0 ? CFG.startMultiplier : CFG.ladder[V.rung - 1][1];
    return base * V.golden + V.blight;
  }

  function formFor(m) {
    var form = 1;
    (CFG.forms || []).forEach(function (threshold, k) { if (m >= threshold) form = k + 2; });
    return form;
  }

  // El saco sube cifra a cifra (no de golpe); el WIN del HUD lo sigue.
  function tweenSack(to, durMs) {
    if (!els) return;
    var from = shownSack;
    if (Math.abs(to - from) < 0.0001) {
      gold(els.sack, money(to));
      return;
    }
    if (sackTween) cancelFrame(sackTween);
    var t0 = 0;
    var dur = ms(durMs || 320);
    function step(now) {
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / Math.max(1, dur));
      var e = 1 - Math.pow(1 - k, 3);
      shownSack = from + (to - from) * e;
      if (els) gold(els.sack, money(shownSack));
      scheduleGameRender();
      if (k < 1) sackTween = nextFrame(step);
      else { sackTween = 0; shownSack = to; }
    }
    sackTween = nextFrame(step);
  }

  var lastMultShown = null;
  function renderHud() {
    if (!els || !V) return;
    gold(els.bellCount, String(Math.max(0, V.tolls)));
    els.bell.classList.toggle("is-last", V.tolls <= 1 && !V.done);
    els.bellNote.textContent = V.tolls === 1 && !V.done ? "LAST BELL" : "";
    els.tint.classList.toggle("is-last", V.tolls <= 1 && !V.done);
    if (els.eyes) els.eyes.root.classList.toggle("is-last", V.tolls <= 1 && !V.done);
    // Tras la Sentencia la linterna se queda con el premio ya multiplicado.
    if (lanternFinal === null) tweenSack(V.sack);
    els.lantern.style.setProperty("--souls", Math.min(1, Math.log10(1 + V.sack * 4) / 2.2).toFixed(3));
    var m = vMultiplier();
    if (m !== lastMultShown) {
      gold(els.multValue, "x" + m);
      lastMultShown = m;
    }
    var nextRung = V.rung < CFG.ladder.length ? CFG.ladder[V.rung] : null;
    els.pips.innerHTML = "";
    if (nextRung) {
      for (var k = 0; k < nextRung[0]; k++) div("el-juicio-mult__pip" + (k < V.progress ? " is-on" : ""), els.pips);
      gold(els.next, "x" + (nextRung[1] * V.golden + V.blight));
      els.mult.classList.toggle("is-near", nextRung[0] - V.progress === 1);
    } else {
      els.next.textContent = "";
      els.mult.classList.remove("is-near");
    }
    var filled = V.board.filter(Boolean).length;
    els.occupancy.textContent = filled + "/" + CFG.cepos;
    els.occupancy.setAttribute("aria-label", "Traps " + filled + " of " + CFG.cepos);
    els.cepos.forEach(function (c, i) {
      c.el.classList.toggle("is-near", filled === CFG.cepos - 1 && !V.board[i] && !V.done);
    });
    var form = formFor(m);
    if (!els.death.classList.contains("f" + form)) {
      var prev = 1;
      for (var f = 2; f <= 4; f++) if (els.death.classList.contains("f" + f)) prev = f;
      els.death.classList.remove("f1", "f2", "f3", "f4");
      els.death.classList.add("f" + form);
      if (form > prev) {
        restartClass(els.death, "is-evolving");
        sound("el_juicio_death_evolves", { form: form });
        var dr = vrect(els.death);
        if (dr) {
          shockwave(dr.left + dr.width / 2, dr.top + dr.height * 0.2, dr.width * 2.6, form >= 4 ? "gold" : "blood");
          burst(form >= 4 ? "gold" : "ember", dr.left + dr.width / 2, dr.top + dr.height * 0.22, 24, { speed: 180, size: 2.4, life: 1.2, gravity: 60 });
        }
      }
    }
    scheduleGameRender();
  }

  // El WIN y el SPIN del HUD (game.js render) una vez por fotograma como mucho.
  var gameRenderQueued = false;
  function scheduleGameRender() {
    if (gameRenderQueued) return;
    gameRenderQueued = true;
    nextFrame(function () {
      gameRenderQueued = false;
      hooks.render();
    });
  }

  function setCepo(i, who) {
    var c = els.cepos[i];
    c.el.classList.remove("is-marked", "is-spinning", "is-executed-empty");
    c.el.classList.toggle("is-empty", !who);
    c.body.src = art(who ? ART[who.type] : ART.EMPTY);
    c.hands.hidden = !who;
    c.head.hidden = !who;
    if (who) {
      c.hands.src = art(HANDS[who.type]);
      c.head.src = art(HEADS[who.type]);
      c.plate.hidden = false;
      c.plate.classList.toggle("is-marked", Boolean(who.marked));
      gold(c.plate, money(who.value));
      if (who.marked) c.el.classList.add("is-marked");
    } else {
      c.plate.hidden = true;
    }
  }

  // Alma que vuela de un rect de pantalla a un elemento, con estela.
  function soulFlight(fromRect, toEl, options) {
    var o = options || {};
    return new Promise(function (resolve) {
      var to = vrect(toEl);
      if (!fromRect || !to || !els) {
        resolve();
        return;
      }
      var orb = div("el-juicio-soul" + (o.red ? " is-red" : "") + (o.gold ? " is-gold" : ""), document.body);
      var x0 = fromRect.left + fromRect.width * (o.fromX == null ? 0.5 : o.fromX);
      var y0 = fromRect.top + fromRect.height * (o.fromY == null ? 0.45 : o.fromY);
      var x1 = to.left + to.width / 2;
      var y1 = to.top + to.height * (o.toY == null ? 0.45 : o.toY);
      var lift = Math.max(60, Math.abs(x1 - x0) * 0.32 + Math.abs(y1 - y0) * 0.15);
      var dur = ms(o.duration || 640);
      var t0 = 0;
      var trailColor = o.red ? "255,90,70" : o.gold ? "255,206,90" : null;
      function step(now) {
        if (!t0) t0 = now;
        var p = Math.min(1, (now - t0) / Math.max(1, dur));
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var x = x0 + (x1 - x0) * e;
        var y = y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * lift;
        orb.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-50%) scale(" + (1.15 - 0.4 * e).toFixed(3) + ")";
        emit("soul", x + rand(-2, 2), y + rand(-2, 2), { vx: rand(-14, 14), vy: rand(-14, 14), size: 2.6, life: 0.45, color: trailColor });
        if (p < 1) {
          nextFrame(step);
          return;
        }
        orb.remove();
        burst("soul", x1, y1, 10, { speed: 90, size: 2, life: 0.5, color: trailColor });
        resolve();
      }
      nextFrame(step);
    });
  }

  // Cifra de un premio, como los cortes del Execution Bonus (misma letra,
  // src/fx/execution-fx.css#exec-cut-prize): sale en el cepo, se queda un
  // momento a la vista y vuela a la linterna con estela; al llegar sube el
  // saco. options.red: infectado (cifras en sangre); options.text y
  // options.to / toY: otra cifra a otro sitio (el "+1" de un cuervo a la
  // campana).
  function prizeFlight(fromRect, multiple, options) {
    var o = options || {};
    var target = o.to || (els && els.lantern);
    var label = o.text != null ? o.text : money(multiple);
    return new Promise(function (resolve) {
      var to = els && vrect(target);
      if (!fromRect || !to || (o.text == null && !(multiple > 0))) {
        resolve();
        return;
      }
      var el = div("exec-cut-prize el-juicio-prize" + (o.red ? " exec-cut-prize--blood" : "") + (o.gold ? " is-rich" : ""), document.body);
      el.setAttribute("aria-hidden", "true");
      var value = div("exec-cut-prize__value", el);
      // Con texto propio ("+1"), los signos tambien en oro.
      if (window.OssuaryNumberFont) window.OssuaryNumberFont.render(value, label, { separatorImages: true, letters: o.text != null });
      else value.textContent = label;
      var x0 = fromRect.left + fromRect.width * 0.5;
      var y0 = fromRect.top + fromRect.height * (o.fromY == null ? 0.42 : o.fromY);
      el.style.left = "0px";
      el.style.top = "0px";
      el.style.transform = "translate(" + x0.toFixed(1) + "px," + y0.toFixed(1) + "px) translate(-50%,-50%) scale(0.35)";
      var popMs = ms(360), holdMs = ms(o.hold == null ? 220 : o.hold), flyMs = ms(o.duration || 560);
      var pop = typeof el.animate === "function" ? el.animate([
        { transform: "translate(" + x0.toFixed(1) + "px," + y0.toFixed(1) + "px) translate(-50%,-50%) scale(0.35)", opacity: 0, filter: "brightness(2.4) blur(3px)" },
        { transform: "translate(" + x0.toFixed(1) + "px," + (y0 - 8).toFixed(1) + "px) translate(-50%,-50%) scale(1.22)", opacity: 1, filter: "brightness(1.7) blur(0px)", offset: 0.45 },
        { transform: "translate(" + x0.toFixed(1) + "px," + (y0 - 12).toFixed(1) + "px) translate(-50%,-50%) scale(1)", opacity: 1, filter: "brightness(1) blur(0px)" }
      ], { duration: popMs, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }) : null;
      schedule(function () {
        if (pop) pop.cancel();
        el.style.opacity = "1";
        var dest = (els && vrect(target)) || to;
        var x1 = dest.left + dest.width / 2;
        var y1 = dest.top + dest.height * (o.toY == null ? 0.42 : o.toY);
        var sy = y0 - 12;
        var lift = Math.max(50, Math.abs(x1 - x0) * 0.28 + Math.abs(y1 - sy) * 0.12);
        var trail = o.red ? "255,90,70" : "255,206,90";
        var t0 = 0;
        function step(now) {
          if (!t0) t0 = now;
          var p = Math.min(1, (now - t0) / Math.max(1, flyMs));
          var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          var x = x0 + (x1 - x0) * e;
          var y = sy + (y1 - sy) * e - Math.sin(Math.PI * e) * lift;
          el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-50%) scale(" + (1 - 0.5 * e).toFixed(3) + ")";
          emit("soul", x + rand(-3, 3), y + rand(-3, 3), { vx: rand(-16, 16), vy: rand(-16, 16), size: 2.4, life: 0.4, color: trail });
          if (p < 1) {
            nextFrame(step);
            return;
          }
          el.remove();
          burst("soul", x1, y1, 10, { speed: 100, size: 2, life: 0.5, color: trail });
          resolve();
        }
        nextFrame(step);
      }, popMs + holdMs);
      // Por si la pestana se queda quieta: nunca se queda colgada.
      schedule(function () {
        if (!el.isConnected) return;
        el.remove();
        resolve();
      }, popMs + holdMs + flyMs + 2500);
    });
  }

  function lanternHit() {
    if (!els) return;
    restartClass(els.lantern, "is-pumping");
    var r = vrect(els.lantern);
    if (r) shockwave(r.left + r.width / 2, r.top + r.height * 0.32, r.width * 0.9, "soul");
  }

  function banner(text, options) {
    var o = options || {};
    if (!els) return Promise.resolve();
    var b = div("el-juicio-banner" + (o.className ? " " + o.className : ""), els.fx);
    b.style.top = (o.top == null ? 42 : o.top) + "%";
    var inner = div("el-juicio-banner__text", b);
    gold(inner, text);
    var slam = o.slam;
    return animate(b, slam ? [
      { transform: "translate(-50%, -50%) scale(2.4)", opacity: 0, filter: "blur(6px)" },
      { transform: "translate(-50%, -50%) scale(0.94)", opacity: 1, filter: "blur(0px)", offset: 0.14 },
      { transform: "translate(-50%, -50%) scale(1.02)", opacity: 1, offset: 0.22 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.8 },
      { transform: "translate(-50%, -50%) scale(1.06)", opacity: 0 }
    ] : [
      { transform: "translate(-50%, -50%) scale(0.55)", opacity: 0 },
      { transform: "translate(-50%, -50%) scale(1.08)", opacity: 1, offset: 0.18 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 1, offset: 0.78 },
      { transform: "translate(-50%, -50%) scale(1.04)", opacity: 0 }
    ], { duration: o.duration || 1300, easing: "ease-out" }).then(function () { b.remove(); });
  }

  function pump(el) {
    restartClass(el, "is-pumping");
  }

  // El multiplicador de la guadana se clava con un golpe: anillo, chispas y
  // los ojos de la Muerte se encienden.
  function stampMultiplier(kind) {
    if (!els) return;
    pump(els.mult);
    restartClass(els.death, "is-glaring");
    var r = vrect(els.multValue);
    if (r) {
      shockwave(r.left + r.width / 2, r.top + r.height / 2, r.width * 2.4, kind === "gold" ? "gold" : "blood");
      if (gfx()) gfx().sparks(r.left + r.width / 2, r.top + r.height / 2, { count: 18, spread: Math.PI * 2, speed: 300 });
      burst(kind === "gold" ? "gold" : "ember", r.left + r.width / 2, r.top + r.height / 2, 14, { speed: 150, size: 2.2, life: 0.8 });
    }
    sound("el_juicio_stamp", { golden: kind === "gold" });
    eyesMood("flare", 900);
    eyesEmbers(3, kind === "gold" ? "255,206,90" : null);
  }

  // --- los ojos de la Muerte -------------------------------------------------------
  // Estados (clases en .el-juicio-eyes): scanning (barren los cepos mientras
  // giran), staring (clavados en el cepo que se hace esperar), flare
  // (destello: un rico, un cuervo, la guadana que sube), rage (infectado,
  // Siega, Sentencia: se abren, tiemblan, arden y sangran), gold (cuervo
  // dorado), blaze (la linterna revienta) y last (late con la ultima
  // campanada). La forma de la Muerte (f2-f4) los enciende mas.
  var eyeTimers = {};
  var lookTimer = 0;

  function eyesMood(name, durationMs) {
    if (!els || !els.eyes) return;
    var root = els.eyes.root;
    restartClass(root, "is-" + name);
    cancelScheduled(eyeTimers[name]);
    if (durationMs) {
      eyeTimers[name] = schedule(function () { root.classList.remove("is-" + name); }, ms(durationMs));
    }
  }

  function eyesOff(name) {
    if (!els || !els.eyes) return;
    cancelScheduled(eyeTimers[name]);
    els.eyes.root.classList.remove("is-" + name);
  }

  // Las pupilas miran hacia un punto de pantalla (null: al frente); holdMs:
  // cuanto miran antes de volver al frente (0: se quedan).
  function eyesLook(x, y, holdMs) {
    if (!els || !els.eyes) return;
    var look = els.eyes.look;
    cancelScheduled(lookTimer);
    if (x == null) {
      look.style.translate = "0px 0px";
      return;
    }
    var r = vrect(els.eyes.root);
    if (!r) return;
    var dx = x - (r.left + r.width / 2);
    var dy = y - (r.top + r.height / 2);
    var d = Math.hypot(dx, dy) || 1;
    var reach = r.width * 0.1 * Math.min(1, d / (r.width * 4));
    look.style.translate = ((dx / d) * reach).toFixed(2) + "px " + ((dy / d) * reach * 0.6).toFixed(2) + "px";
    if (holdMs) lookTimer = schedule(function () { look.style.translate = "0px 0px"; }, ms(holdMs));
  }

  function eyesLookAt(el, holdMs) {
    var r = vrect(el);
    if (r) eyesLook(r.left + r.width / 2, r.top + r.height / 2, holdMs);
  }

  // Ascuas (o motas de oro) que suben de los ojos.
  function eyesEmbers(count, color) {
    if (!els || !els.eyes) return;
    [els.eyes.socketL, els.eyes.socketR].forEach(function (socket) {
      var r = vrect(socket);
      if (!r) return;
      for (var i = 0; i < count; i++) {
        emit("ember", r.left + r.width * rand(0.3, 0.7), r.top + r.height * 0.45, {
          vx: rand(-12, 12), vy: rand(-70, -30), drag: 0.985, size: rand(1.1, 1.9), life: rand(0.5, 1.2), sway: rand(6, 14),
          color: color || "255,60,24"
        });
      }
    });
  }

  // --- una tirada -----------------------------------------------------------------
  // Arrancan por orden (peticion del usuario, 2026-10-19): de arriba abajo,
  // primero la mitad izquierda de cada costilla y enseguida la derecha.
  // Devuelve cuando arranca el ultimo (ms de juego).
  function startSpinning(indexes) {
    var last = 0;
    var firstRow = Math.min.apply(null, indexes.map(function (i) { return Math.floor(i / 2); }));
    indexes.forEach(function (i, k) {
      var c = els.cepos[i];
      var delay = (Math.floor(i / 2) - firstRow) * SPIN_ORDER.row + (i % 2) * SPIN_ORDER.side;
      last = Math.max(last, delay);
      cancelScheduled(c.spinTimer);
      c.spinTimer = schedule(function () {
        c.spinTimer = 0;
        if (!els) return;
        c.plate.hidden = true;
        c.el.classList.remove("is-landing");
        c.el.classList.add("is-spinning");
        c.strip.style.animationDelay = (-0.06 * k).toFixed(2) + "s";
      }, ms(delay));
    });
    return last;
  }

  function stopSpinning(i) {
    var c = els.cepos[i];
    cancelScheduled(c.spinTimer);
    c.spinTimer = 0;
    c.el.classList.remove("is-spinning", "is-anticipation");
  }

  // Condenado que cae al cepo: golpe del cepo, polvo, placa con su valor y su
  // alma a la linterna.
  async function landCondemned(landing, note) {
    var c = els.cepos[landing.cell];
    V.board[landing.cell] = landing;
    setCepo(landing.cell, landing);
    // El infectado llega con su valor de siempre; el multiplicado sale cuando
    // rueda su multiplicador (blightRoll).
    var blightTimes = landing.marked && landing.times > 1 && landing.base != null;
    if (blightTimes) gold(c.plate, money(landing.base));
    restartClass(c.el, "is-landing");
    restartClass(c.plate, "is-popping");
    // La niebla del cepo se abre con el golpe y la Muerte lo mira.
    restartClass(c.fog, "is-impact");
    schedule(function () { c.fog.classList.remove("is-impact"); }, ms(2200));
    eyesLookAt(c.el, 900);
    if (landing.marked) {
      eyesMood("rage", 2200);
      eyesEmbers(6);
    } else if (landing.type === "RICO") {
      eyesMood("flare", 700);
    }
    sound("el_juicio_condemned_landed", { type: landing.type, marked: landing.marked });
    var r = vrect(c.el);
    if (r && gfx()) {
      schedule(function () {
        gfx().dust(r.left + r.width / 2, r.bottom - r.height * 0.06, { count: 4, width: r.width * 0.7 });
      }, ms(110));
    }
    if (landing.type === "RICO" && r) burst("gold", r.left + r.width * 0.5, r.top + r.height * 0.5, 14, { speed: 120, size: 2, life: 0.9 });
    // Infectado: antes, el sello BLIGHTED del usuario cae sobre el cepo, se
    // enciende y se va (src/fx/el-juicio-blight-stamp.js, 2026-10-19).
    if (landing.marked && window.OssuaryBlightStamp) await window.OssuaryBlightStamp.play(c.el, { ms: ms });
    if (landing.marked) {
      // Infectado: golpe de sangre al caer el sello (el cartelito que se
      // quedaba en el cepo, provisional, fuera desde el 2026-10-19).
      sound("el_juicio_marked");
      if (gfx()) {
        gfx().flash("blood");
        gfx().shakeMachine(0.3);
      }
      if (r) {
        shockwave(r.left + r.width / 2, r.top + r.height * 0.3, r.width * 1.4, "blood");
        burst("ember", r.left + r.width / 2, r.top + r.height / 2, 22, { speed: 160, size: 2.4, life: 1, gravity: -40 });
      }
    }
    // Infectado con multiplicador (peticion del usuario, 2026-10-19): rueda
    // sobre el cepo y la placa pasa a valer esas veces mas.
    // Esas mismas veces vuelan a la guadana, que las suma; su alma sale un
    // momento despues (que no salgan una encima de otra).
    var rolled = blightTimes ? await blightRoll(c, landing, r) : null;
    var toScythe = rolled ? blightToScythe(rolled, landing) : null;
    await wait(rolled ? 380 : 240);
    prizeFlight(r, landing.value, { red: landing.marked, gold: landing.type === "RICO", hold: landing.marked ? (rolled ? 160 : 480) : 220 }).then(function () {
      V.sack = Math.max(V.sack, landing.sack);
      lanternHit();
      sound("el_juicio_soul_in", { step: note });
      renderHud();
    });
    if (toScythe) await toScythe;
  }

  // El multiplicador del infectado rueda sobre su cepo (cifras de oro tenidas
  // de sangre, como la Marca de Sangre del Execution), frena y se clava en el
  // suyo; la placa pasa del valor base al multiplicado. Devuelve donde quedo
  // la cifra (para que vuele a la guadana).
  async function blightRoll(c, landing, r) {
    r = vrect(c.el) || r;
    if (!r) {
      gold(c.plate, money(landing.value));
      return null;
    }
    var roll = div("exec-cut-prize exec-cut-prize--blood el-juicio-prize el-juicio-blight-roll", document.body);
    roll.setAttribute("aria-hidden", "true");
    var value = div("exec-cut-prize__value", roll);
    var x = r.left + r.width / 2, y = r.top + r.height * 0.56;
    roll.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-50%)";
    var options = CFG.blightMultipliers.map(function (o) { return o[0]; });
    var seq = options.concat(options);
    var endAt = seq.lastIndexOf(landing.times);
    var steps = Math.min(endAt, 8 + Math.floor(Math.random() * 3));
    for (var k = endAt - steps, j = 0; k <= endAt; k++, j++) {
      gold(value, "x" + seq[k]);
      restartClass(roll, "is-tick");
      sound("el_juicio_blight_tick", { step: j, total: steps });
      await wait(42 + j * j * 3.6);
    }
    restartClass(roll, "is-landed");
    sound("el_juicio_blight_land", { times: landing.times });
    eyesMood("rage", 1600);
    var rr = vrect(roll) || { left: x - 20, top: y - 20, width: 40, height: 40 };
    shockwave(rr.left + rr.width / 2, rr.top + rr.height / 2, Math.max(rr.width, r.width) * 1.6, "blood");
    if (gfx()) gfx().sparks(rr.left + rr.width / 2, rr.top + rr.height / 2, { count: 22, spread: Math.PI * 2, speed: 300 });
    burst("ember", rr.left + rr.width / 2, rr.top + rr.height / 2, 18, { speed: 170, size: 2.4, life: 0.9, gravity: -30 });
    gold(c.plate, money(landing.value));
    restartClass(c.plate, "is-popping");
    await wait(520);
    rr = vrect(roll) || rr;
    roll.remove();
    return rr;
  }

  // "+N" del infectado a la guadana: al llegar se suma (V.blight), se clava y
  // sale el rotulo con la guadana nueva.
  async function blightToScythe(fromRect, landing) {
    await prizeFlight(fromRect, 0, { text: "+" + landing.times, to: els.multValue, toY: 0.5, red: true, fromY: 0.5, hold: 0, duration: 560 });
    if (!els || !V) return;
    V.blight += landing.times;
    renderHud();
    stampMultiplier("blood");
    sound("el_juicio_scythe_up", { multiplier: landing.multiplier });
    banner("SCYTHE x" + landing.multiplier, { top: 47, duration: 1000 });
    await wait(480);
  }

  // --- el nido de los cuervos (rib1) ---------------------------------------------
  // Tres rodillos verticales pequenos (peticion del usuario, 2026-10-18; antes
  // una tira horizontal): giran los tres en cada tirada, hacia abajo, y paran
  // de izquierda a derecha. Cada uno ensena una casilla, todo su alto (hasta
  // el 2026-10-19 asomaban trozos de la de arriba y la de abajo, los casis; al
  // usuario no le convencian). El cuervo que para en
  // el centro lo parte la Muerte en el acto (peticion del usuario: "cuando se
  // posaba los mataba") y su sangre marca el rodillo hasta la BANDADA.
  // col.syms[i]: simbolo de la casilla i (0 nada, 1 cuervo, 2 dorado; al azar
  // mientras no se fija: el relleno que se ve pasar). Con col.pos entero la
  // casilla pos esta en el centro; las de numero mayor van encima (bajan
  // hacia el centro). col.marked: la marca de sangre (0, 1 o 2 si fue dorado).
  function buildNest(rib1) {
    var el = div("el-juicio-nest", rib1);
    var cols = [];
    for (var k = 0; k < CFG.nestCells; k++) {
      var c = div("el-juicio-nest__col", el);
      c.style.left = ((k * 100) / CFG.nestCells).toFixed(3) + "%";
      c.style.width = (100 / CFG.nestCells).toFixed(3) + "%";
      var flow = buildNestFog(c, k);
      var mark = buildNestMark(c, k);
      var strip = div("el-juicio-nest__strip", c);
      var slots = [];
      for (var s = 0; s < NEST.slots; s++) {
        var slot = div("el-juicio-nest__slot", strip);
        slot.style.height = NEST.cell * 100 + "%";
        slots.push({ el: slot, bird: img(ART.crowShape, "el-juicio-nest__bird", slot), feather: img(ART.nestFeathers[s % ART.nestFeathers.length], "el-juicio-nest__feather", slot), idx: null });
      }
      buildNestMist(c, k);
      var col = { index: k, el: c, strip: strip, slots: slots, syms: {}, feathers: {}, pos: 0, spinning: false, spinT: 0, v: 0, stop: null, marked: 0, mark: mark, flow: flow };
      for (var i = -2; i <= 3; i++) col.syms[i] = 0;
      cols.push(col);
    }
    div("el-juicio-nest__shade", el);
    return { el: el, cols: cols, raf: 0, last: 0 };
  }

  // La marca de un rodillo: la sangre que deja la guadana al partir a su
  // cuervo, en la pared de detras (delante de la niebla, detras de los
  // cuervos que pasan). Desde el 2026-10-19 es una mancha del usuario (al
  // usuario no le gustaba el tajo dibujado): una de sus manchas
  // (ART.nestSplats), sorteada cada vez que el rodillo se marca (paintNestMark);
  // escurre despacio (CSS). Se ve con .is-marked (CSS).
  function buildNestMark(col, k) {
    var mark = div("el-juicio-nest__mark", col);
    var splat = img(ART.nestSplats[k % ART.nestSplats.length], "el-juicio-nest__splat", mark);
    splat.style.animationDelay = (-rand(0, 6)).toFixed(2) + "s";
    return mark;
  }

  // Mancha nueva al marcarse un rodillo limpio (peticion del usuario,
  // 2026-10-19: "mas aleatorias, no siempre las mismas en los mismos
  // lados"): otra que no lleve ya un rodillo marcado, girada a cualquier
  // lado (a veces del reves), en espejo o no, movida y de otro tamano.
  function paintNestMark(col) {
    var splat = col.mark && col.mark.querySelector(".el-juicio-nest__splat");
    if (!splat) return;
    var N = els && els.nest;
    var busy = N ? N.cols.filter(function (c) { return c !== col && c.marked; }).map(function (c) { return c.splatSrc; }) : [];
    var free = ART.nestSplats.filter(function (s) { return busy.indexOf(s) < 0 && s !== col.splatSrc; });
    if (!free.length) free = ART.nestSplats;
    col.splatSrc = free[Math.floor(Math.random() * free.length)];
    splat.src = art(col.splatSrc);
    var tilt = rand(-32, 32) + (Math.random() < 0.3 ? 180 : 0);
    splat.style.setProperty("--splat-tilt", tilt.toFixed(1) + "deg");
    splat.style.setProperty("--splat-flip", Math.random() < 0.5 ? "-1" : "1");
    splat.style.setProperty("--splat-x", rand(-16, 16).toFixed(1) + "%");
    splat.style.setProperty("--splat-y", rand(-12, 12).toFixed(1) + "%");
    splat.style.setProperty("--splat-size", rand(0.82, 1.18).toFixed(3));
  }

  // Niebla de cada rodillo del nido (peticion del usuario, 2026-10-18: que
  // interactue con los cuervos). Detras: dos velos de la niebla de los
  // simbolos que el rodillo arrastra al girar (renderNestCol los baja con
  // col.pos, a menos velocidad que los cuervos) y un remolino que se enrosca
  // cuando se hace esperar. Delante, a los pies del cuervo: bruma baja y
  // bocanadas que salen al posarse, al quedarse uno a medias, al echar a volar
  // y al segarlos. Devuelve la capa que arrastra el rodillo.
  function buildNestFog(col, k) {
    var fog = div("el-juicio-nest__fog", col);
    var flow = div("el-juicio-nest__flow", fog);
    ["a", "b"].forEach(function (name, i) {
      var veil = div("el-juicio-nest__veil el-juicio-nest__veil--" + name, flow);
      smokeMask(veil, ((k * 2 + i * 3) % 6) + 1);
      veil.style.animationDelay = (-((k * 4.1 + i * 6.3) % 15)).toFixed(2) + "s";
    });
    smokeMask(div("el-juicio-nest__swirl", fog), ((k + 4) % 6) + 1);
    return flow;
  }

  function buildNestMist(col, k) {
    var mist = div("el-juicio-nest__mist", col);
    ["a", "b"].forEach(function (name, i) {
      var haze = div("el-juicio-nest__haze el-juicio-nest__haze--" + name, mist);
      smokeMask(haze, ((k * 3 + i * 2 + 1) % 6) + 1);
      haze.style.animationDelay = (-((k * 3.3 + i * 4.7) % 12)).toFixed(2) + "s";
    });
    ["l", "r", "t", "b"].forEach(function (side, i) {
      smokeMask(div("el-juicio-nest__puff el-juicio-nest__puff--" + side, mist), ((k + i * 2) % 6) + 1);
    });
    return mist;
  }

  function nestSym(col, i) {
    if (col.syms[i] === undefined) {
      var r = Math.random();
      col.syms[i] = r < 0.025 ? 2 : r < 0.42 ? 1 : 0;
    }
    return col.syms[i];
  }

  // La pluma de la casilla i del rodillo (col.feathers[i]): una de las tres
  // del usuario, girada a cualquier lado, en espejo o no, movida y de otro
  // tamano. Es un simbolo mas de la tira (peticion del usuario, 2026-10-19:
  // lo aleatorio es lo que sale en el rodillo; la pluma no cambia mientras
  // baja): se sortea la primera vez que hace falta y la casilla la lleva
  // consigo. renew: otra nueva (la del cuervo recien partido).
  function nestFeather(col, i, renew) {
    if (renew || !col.feathers[i]) {
      col.feathers[i] = {
        n: Math.floor(Math.random() * ART.nestFeathers.length),
        tilt: (rand(-70, 70) + (Math.random() < 0.18 ? 180 : 0)).toFixed(1) + "deg",
        flip: Math.random() < 0.5 ? "-1" : "1",
        x: rand(-18, 18).toFixed(1) + "%",
        y: rand(-12, 12).toFixed(1) + "%",
        size: rand(0.74, 1.02).toFixed(3)
      };
    }
    return col.feathers[i];
  }

  // Simbolo de una casilla del nido (data-sym). Las vacias llevan su pluma
  // (que no quede ningun hueco; no paga nada). options.fade: una pluma nueva
  // que aparece poco a poco (la del cuervo recien partido).
  function setNestSym(col, slot, sym, options) {
    slot.el.dataset.sym = String(sym);
    var f = slot.feather;
    if (sym !== 0 || !f) return;
    var fade = !!(options && options.fade);
    var look = nestFeather(col, slot.idx, fade);
    if (f.dataset.n !== String(look.n)) {
      f.dataset.n = String(look.n);
      f.src = art(ART.nestFeathers[look.n]);
    }
    f.style.setProperty("--feather-tilt", look.tilt);
    f.style.setProperty("--feather-flip", look.flip);
    f.style.setProperty("--feather-x", look.x);
    f.style.setProperty("--feather-y", look.y);
    f.style.setProperty("--feather-size", look.size);
    f.classList.remove("is-new");
    if (fade) {
      void f.offsetWidth;
      f.classList.add("is-new");
    }
  }

  function renderNestCol(col) {
    var base = Math.floor(col.pos);
    var top = (1 - NEST.cell) / 2;
    for (var k = 0; k < col.slots.length; k++) {
      var slot = col.slots[k];
      var idx = base - 1 + k;
      if (slot.idx !== idx) {
        slot.idx = idx;
        setNestSym(col, slot, nestSym(col, idx));
        slot.el.classList.remove("is-landed", "is-near-miss", "is-fleeing", "is-awake");
        var oldRays = slot.el.querySelector(".el-juicio-crow-rays");
        if (oldRays) oldRays.remove();
      }
      var y = top + (col.pos - idx) * NEST.cell;
      slot.el.style.transform = "translateY(" + ((y / NEST.cell) * 100).toFixed(2) + "%)";
    }
    // La niebla de detras baja con el rodillo (la capa mide dos altos y se
    // repite cada alto: sin saltos).
    if (col.flow) {
      var phase = (col.pos * NEST.fogFlow) % 1;
      if (phase < 0) phase += 1;
      col.flow.style.transform = "translate3d(0," + (phase * 50).toFixed(2) + "%,0)";
    }
    if (base % 40 === 0) {
      Object.keys(col.syms).forEach(function (key) { if (+key < base - 6) delete col.syms[key]; });
      Object.keys(col.feathers).forEach(function (key) { if (+key < base - 6) delete col.feathers[key]; });
    }
  }

  function renderNest() {
    var N = els && els.nest;
    if (!N) return;
    N.cols.forEach(renderNestCol);
  }

  function nestSlot(col, i) {
    for (var k = 0; k < col.slots.length; k++) if (col.slots[k].idx === i) return col.slots[k];
    return null;
  }

  // Casillas por segundo a la velocidad del juego (el turbo la sube).
  function nestSpeed(cells) {
    return (cells * 1000) / Math.max(1, ms(1000));
  }

  function nestLoop(now) {
    var N = els && els.nest;
    if (!N) return;
    N.raf = 0;
    var dt = N.last ? Math.min(0.05, (now - N.last) / 1000) : 0.016;
    N.last = now;
    var moving = false;
    N.cols.forEach(function (col) {
      if (col.stop) {
        var st = col.stop;
        if (!st.t0) st.t0 = now;
        var t = (now - st.t0) / 1000;
        col.pos = st.posAt(Math.min(t, st.total));
        if (!st.landed && t >= st.landAt) {
          st.landed = true;
          col.el.classList.remove("is-spinning", "is-creeping");
          st.onLand();
        } else if (st.creep && !st.creeping && t >= st.creepAt) {
          st.creeping = true;
          col.el.classList.remove("is-spinning");
          col.el.classList.add("is-creeping");
        }
        if (t >= st.total) {
          col.pos = st.to;
          col.stop = null;
          col.spinning = false;
          renderNestCol(col);
          st.done();
          return;
        }
        moving = true;
      } else if (col.spinning) {
        // Arranque: se echa un poco hacia arriba y sale disparado hacia abajo.
        col.spinT += dt;
        var kickT = 0.13;
        if (col.spinT < kickT) {
          col.pos = col.pos0 - NEST.kick * Math.sin((Math.PI / 2) * (col.spinT / kickT));
        } else {
          col.v = nestSpeed(NEST.speed) * Math.min(1, (col.spinT - kickT) / 0.22);
          col.pos += col.v * dt;
        }
        moving = true;
      }
      renderNestCol(col);
    });
    if (moving) N.raf = nextFrame(nestLoop);
  }

  function kickNest() {
    var N = els && els.nest;
    if (N && !N.raf) {
      N.last = 0;
      N.raf = nextFrame(nestLoop);
    }
  }

  // Arrancan los rodillos del nido de izquierda a derecha, un poco
  // desfasados; delay: ms de juego antes del primero (detras de los cepos).
  function spinNest(cols, delay) {
    cols.forEach(function (col, k) {
      schedule(function () {
        if (!els || col.spinning) return;
        col.spinning = true;
        col.spinT = 0;
        col.v = 0;
        col.pos0 = col.pos;
        col.el.classList.add("is-spinning");
        if (k === 0) sound("el_juicio_nest_spin_started");
        kickNest();
      }, ms((delay || 0) + k * 70));
    });
  }

  // Para un rodillo con plan.center en el centro y plan.above / plan.below
  // asomando. creep: 0 para de golpe (rebota), 1 se arrastra un poco, 2 se
  // arrastra del todo (casi parado, lo que viene de arriba entra a paso de
  // tortuga... o se queda a medias). onLand: al llegar a su sitio (antes del
  // rebote). Se cumple al quedarse quieto.
  function stopNestCol(col, plan, creep, onLand) {
    return new Promise(function (resolve) {
      if (!col.spinning) {
        col.spinning = true;
        col.spinT = 1;
        col.pos0 = col.pos;
      }
      var v = Math.max(col.v, nestSpeed(NEST.speed) * 0.6);
      var pos0 = col.pos;
      var to = Math.ceil(pos0 + (creep ? 3 : 1.4));
      col.syms[to - 1] = plan.below;
      col.syms[to] = plan.center;
      col.syms[to + 1] = plan.above;
      // Si ya se estaban pintando, se repintan con lo que toca.
      [to - 1, to, to + 1].forEach(function (i) {
        var s = nestSlot(col, i);
        if (s) setNestSym(col, s, col.syms[i]);
      });
      var st = { to: to, t0: 0, creep: creep, creeping: false, landed: false, onLand: onLand || function () {}, done: resolve };
      var b = creep ? NEST.bounce * 0.4 : NEST.bounce;
      var tb = 0.16;
      var stopAt;
      var decel;
      if (creep) {
        var cells = creep === 2 ? NEST.creepCells : NEST.creepCells * 0.55;
        var vs = nestSpeed(NEST.creepSpeed * (creep === 2 ? 1 : 1.5));
        var d1 = to - cells - pos0;
        var t1 = (2 * d1) / (v + vs);
        var a1 = (v - vs) / t1;
        var t2 = (2 * (cells + b)) / vs;
        var a2 = vs / t2;
        st.creepAt = t1;
        stopAt = t1 + t2;
        decel = function (t) {
          if (t <= t1) return pos0 + v * t - 0.5 * a1 * t * t;
          var u = t - t1;
          return to - cells + vs * u - 0.5 * a2 * u * u;
        };
      } else {
        var d = to + b - pos0;
        var td = (2 * d) / v;
        st.creepAt = Infinity;
        stopAt = td;
        decel = function (t) { return pos0 + v * t - 0.5 * (v / td) * t * t; };
      }
      // Llega a su sitio cuando pasa por "to" (luego rebota un pelo y vuelve).
      st.landAt = stopAt;
      for (var probe = 0; probe <= 60; probe++) {
        var tp = (stopAt * probe) / 60;
        if (decel(tp) >= to) {
          st.landAt = tp;
          break;
        }
      }
      st.total = stopAt + tb;
      st.posAt = function (t) {
        if (t <= stopAt) return decel(t);
        var k = Math.min(1, (t - stopAt) / tb);
        return to + b * (1 - (1 - Math.pow(1 - k, 3)));
      };
      col.stop = st;
      kickNest();
      // Si el navegador deja de dar fotogramas un rato (maquina cargada), la
      // parada sigue con un temporizador: el rodillo no se queda congelado.
      var watch = repeat(function () {
        var N = els && els.nest;
        if (!N || col.stop !== st) {
          cancelRepeat(watch);
          return;
        }
        if (window.performance.now() - N.last < 120) return;
        if (N.raf) cancelFrame(N.raf);
        N.raf = 0;
        nestLoop(window.performance.now());
      }, 60);
      schedule(function () {
        cancelRepeat(watch);
        if (col.stop !== st) return;
        col.stop = null;
        col.spinning = false;
        col.pos = to;
        col.el.classList.remove("is-spinning", "is-creeping");
        renderNestCol(col);
        if (!st.landed) {
          st.landed = true;
          st.onLand();
        }
        resolve();
      }, st.total * 1000 + 2500);
    });
  }

  // Lo que queda justo encima y debajo de la casilla (solo escena). Desde el
  // 2026-10-19 no se ve con el rodillo parado (la casilla es el rodillo
  // entero: al usuario no le convencian los que se quedaban asomando). Queda
  // un casi en marcha: si se arrastra sin cuervo, a menudo uno cruza el centro
  // a paso de tortuga y se le va por abajo justo antes de parar (below).
  function nestColPlan(crow, creep) {
    var plan = { center: crow ? (crow.golden ? 2 : 1) : 0, above: 0, below: 0 };
    if (!crow && creep && Math.random() < 0.72) plan.below = Math.random() < 0.05 ? 2 : 1;
    return plan;
  }

  // Un cuervo se posa en el centro de su rodillo: salto, el aletazo aparta la
  // niebla (bocanadas a los lados), polvo, graznido y la Muerte lo mira.
  function landNestCrow(col, sym) {
    var slot = nestSlot(col, col.stop ? col.stop.to : Math.round(col.pos));
    if (slot) restartClass(slot.el, "is-landed");
    restartClass(col.el, "is-gust");
    var r = vrect(col.el);
    if (r && gfx()) gfx().dust(r.left + r.width / 2, r.top + r.height * 0.82, { count: 4, width: r.width * 0.5 });
    if (r && sym === 2) burst("gold", r.left + r.width / 2, r.top + r.height * 0.5, 22, { speed: 120, size: 2, life: 0.7 });
    eyesLookAt(col.el, 0);
    sound("el_juicio_crow_lands", { golden: sym === 2 });
  }

  // La casilla del centro de un rodillo, en pantalla.
  function nestCell(col) {
    var r = vrect(col.el);
    return r ? { left: r.left, top: r.top + (r.height * (1 - NEST.cell)) / 2, width: r.width, height: r.height * NEST.cell } : null;
  }

  // La Muerte parte al cuervo en cuanto se posa (peticion del usuario,
  // 2026-10-18: "cuando se posaba los mataba"): se le eriza, la Muerte le
  // lanza la guadana girando, lo parte en su casilla (tajo, sangre, plumas, el
  // muerto cae) y su sangre marca el rodillo. Se cumple con el tajo y
  // devuelve la vuelta de la guadana a la mano. El dorado brilla antes con
  // sus rayos.
  async function killNestCrow(col, crow) {
    var idx = Math.round(col.pos);
    var slot = nestSlot(col, idx);
    var golden = crow.golden;
    var rays = null;
    if (golden && slot) {
      rays = div("el-juicio-crow-rays", null);
      slot.el.insertBefore(rays, slot.bird);
    }
    if (slot) restartClass(slot.el, "is-awake");
    eyesLookAt(col.el, 0);
    eyesMood(golden ? "gold" : "flare", golden ? 0 : 700);
    var cell = nestCell(col);
    if (golden && cell) {
      burst("gold", cell.left + cell.width / 2, cell.top + cell.height * 0.55, 26, { speed: 140, size: 2.4, life: 1.2, gravity: -20 });
      sound("el_juicio_golden_reveal");
    }
    await wait(golden ? 620 : 90);
    cell = nestCell(col);
    var aim = cell ? vpoint(cell, 0.5, 0.5) : null;
    var reached = null;
    var hit = new Promise(function (resolve) { reached = resolve; });
    var flight = throwScythe(aim ? [{ x: aim.x, y: aim.y, onReach: function () { reached(); } }] : [], { golden: golden, overshoot: 0.22, scale: 0.6, turns: 2 });
    if (!aim) reached();
    await hit;
    slashNestCrow(col, nestCell(col), golden);
    col.syms[idx] = 0;
    if (slot) setNestSym(col, slot, 0, { fade: true });
    if (rays) {
      rays.classList.add("is-out");
      schedule(function () { rays.remove(); }, 500);
    }
    markNestCol(col, golden ? 2 : 1);
    return flight;
  }

  // El tajo sobre un cuervo: abre la niebla de golpe, media luna, sangre,
  // plumas y el cuervo muerto cae.
  function slashNestCrow(col, cell, golden) {
    restartClass(col.el, "is-reaped");
    sound("el_juicio_crow_cut", { golden: golden });
    if (!cell) return;
    crescentSlash(cell, golden);
    var center = vpoint(cell, 0.5, 0.55);
    if (gfx()) gfx().blood(center.x, center.y, { count: golden ? 12 : 20, dir: Math.PI / 2, spread: Math.PI * 1.4, speed: 280, width: cell.width * 0.2 });
    featherBurst({ left: cell.left + cell.width * 0.15, top: cell.top + cell.height * 0.2, width: cell.width * 0.7, height: cell.height * 0.6 }, golden);
    if (golden) burst("gold", center.x, center.y, 30, { speed: 260, size: 2.6, life: 1.1, gravity: 160 });
    var dead = img(ART.crowDead, "el-juicio-crow-dead" + (golden ? " is-golden" : ""), els.fx);
    placeOver(dead, { left: cell.left + cell.width * 0.1, top: cell.top, width: cell.width * 0.8, height: cell.height });
    animate(dead, [
      { transform: "translateY(0) rotate(0deg)", opacity: 1 },
      { transform: "translateY(-12%) rotate(-10deg)", opacity: 1, offset: 0.14 },
      { transform: "translateY(260%) rotate(150deg)", opacity: 0 }
    ], { duration: 820, easing: "cubic-bezier(.45,0,.8,.45)" }).then(function () { dead.remove(); });
  }

  // La sangre marca el rodillo (o lo vuelve a manchar si ya lo estaba).
  function markNestCol(col, sym) {
    var fresh = !col.marked;
    if (fresh) paintNestMark(col);
    col.marked = Math.max(col.marked, sym);
    // Roja tambien la del dorado (peticion del usuario, 2026-10-19; antes en
    // oro): col.marked sigue diciendo que fue dorado.
    col.el.classList.add("is-marked");
    restartClass(col.el, fresh ? "is-bleeding" : "is-rebleed");
  }

  // Se lavan las marcas (despues de la BANDADA).
  function unmarkNestCol(col) {
    col.marked = 0;
    col.el.classList.remove("is-marked", "is-calling", "is-bleeding", "is-rebleed");
  }

  function nestMarked() {
    var N = els && els.nest;
    if (!N) return 0;
    return N.cols.filter(function (col) { return col.marked; }).length;
  }

  // El casi: el que se acaba de ir por abajo remueve la niebla de ese borde,
  // la Muerte mira hacia alli y suena el casi. (Con above, que ya no sale
  // desde el 2026-10-19, temblaba asomando o echaba a volar.)
  function nestNearMiss(col, plan) {
    var to = Math.round(col.pos);
    var at = plan.above ? to + 1 : plan.below ? to - 1 : null;
    if (at === null) return;
    var slot = nestSlot(col, at);
    if (!slot) return;
    var flee = plan.above && Math.random() < 0.4;
    restartClass(slot.el, flee ? "is-fleeing" : "is-near-miss");
    restartClass(col.el, flee ? "is-trail" : plan.above ? "is-stir-top" : "is-stir-bottom");
    eyesLookAt(slot.el, 700);
    sound("el_juicio_crow_near", { golden: (plan.above || plan.below) === 2 });
  }

  // Con dos rodillos marcados, su sangre llama al que falta (gotea mas y
  // late; la niebla del limpio se enrosca).
  function nestCalling(on) {
    var N = els && els.nest;
    if (!N) return;
    N.cols.forEach(function (col) { col.el.classList.toggle("is-calling", Boolean(on) && Boolean(col.marked)); });
    els.rib1.classList.toggle("is-calling", Boolean(on));
  }

  // Plumas del cuervo partido (mismas plumas que el juego base).
  function featherBurst(rect, golden) {
    if (!rect || !els) return;
    var cx = rect.left + rect.width * 0.5, cy = rect.top + rect.height * 0.55;
    var box = refBox();
    var len = rect.width * 0.22;
    for (var i = 0; i < 12; i++) {
      var f = div("small-blade-bird-feather" + (golden ? " is-golden" : ""), els.fx);
      f.style.width = len * rand(0.7, 1.3) + "px";
      f.style.height = len * 0.3 + "px";
      f.style.left = ((cx - box.left) / box.width) * 100 + "%";
      f.style.top = ((cy - box.top) / box.height) * 100 + "%";
      var a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      var reach = rect.width * rand(0.35, 0.8);
      var ox = Math.cos(a) * reach, oy = Math.sin(a) * reach * 0.7 - rect.width * 0.15;
      var fall = rect.width * rand(0.6, 1.3);
      var spin = (Math.random() < 0.5 ? -1 : 1) * rand(220, 520);
      animate(f, [
        { transform: "translate(-50%, -50%) rotate(" + Math.round(a * 57) + "deg) scale(0.6)", opacity: 1 },
        { transform: "translate(-50%, -50%) translate(" + ox + "px, " + oy + "px) rotate(" + Math.round(a * 57 + spin * 0.35) + "deg) scale(1)", opacity: 1, offset: 0.25 },
        { transform: "translate(-50%, -50%) translate(" + (ox * 1.1) + "px, " + (oy + fall) + "px) rotate(" + Math.round(a * 57 + spin) + "deg) scale(0.9)", opacity: 0 }
      ], { duration: rand(900, 1500), easing: "cubic-bezier(.12,.62,.4,1)" }).then((function (el) { return function () { el.remove(); }; })(f));
    }
  }

  // Una pluma del cuervo que vuela revoloteando hasta un elemento (el paso de
  // la guadana): la misma pluma del juego base, sin estela de luz.
  function featherFlight(fromRect, toEl, golden) {
    return new Promise(function (resolve) {
      var to = vrect(toEl);
      if (!fromRect || !to || !els) {
        resolve();
        return;
      }
      var f = div("small-blade-bird-feather el-juicio-feather-fly" + (golden ? " is-golden" : ""), document.body);
      var len = Math.max(16, fromRect.width * 0.3);
      f.style.width = len.toFixed(1) + "px";
      f.style.height = (len * 0.3).toFixed(1) + "px";
      var x0 = fromRect.left + fromRect.width * 0.55, y0 = fromRect.top + fromRect.height * 0.45;
      var x1 = to.left + to.width / 2, y1 = to.top + to.height / 2;
      var lift = Math.max(40, Math.abs(x1 - x0) * 0.25 + Math.abs(y1 - y0) * 0.1);
      var dur = ms(640);
      var spin = (Math.random() < 0.5 ? -1 : 1) * rand(360, 620);
      var t0 = 0;
      function step(now) {
        if (!t0) t0 = now;
        var p = Math.min(1, (now - t0) / Math.max(1, dur));
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var x = x0 + (x1 - x0) * e + Math.sin(p * Math.PI * 5) * len * 0.35 * (1 - p);
        var y = y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * lift;
        f.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-50%) rotate(" + (spin * e + Math.sin(p * 18) * 22).toFixed(1) + "deg) scale(" + (1.2 - 0.45 * e).toFixed(3) + ")";
        if (p < 1) {
          nextFrame(step);
          return;
        }
        f.remove();
        resolve();
      }
      nextFrame(step);
      schedule(function () {
        if (!f.isConnected) return;
        f.remove();
        resolve();
      }, dur + 2500);
    });
  }

  // --- la guadana que vuela ------------------------------------------------------
  // La Muerte la lanza: sale de su mano girando, vuela hasta lo que corta
  // (cuervos y condenados), corta alli y vuelve a su mano. Es una copia fija
  // en pantalla (como las cabezas que saltan) con tres sombras que la siguen
  // y chispas en la punta de la hoja; la de la mano se esconde mientras vuela
  // y los ojos de la Muerte no la pierden de vista.
  var SCYTHE_TIP = { x: 0.03, y: 0.07 };
  var scytheFlight = null;

  // Agarre (pantalla) y tamano de la guadana de la mano.
  function scytheHand() {
    var fr = els && els.figure && vrect(els.figure);
    if (!fr || !els.scythe.classList.contains("is-art")) return null;
    var h = fr.height * SCYTHE_ART.scale;
    return { x: fr.left + fr.width * DEATH_ART.grip.x, y: fr.top + fr.height * DEATH_ART.grip.y, w: h * SCYTHE_ART.ar, h: h };
  }

  // Curva por los puntos (Catmull-Rom centripeta: sin bucles raros en los
  // giros cerrados), en una polilinea con su largo acumulado.
  function sampleCurve(points) {
    var pts = [points[0]];
    var n = points.length;
    function at(i) {
      if (i < 0) return { x: 2 * points[0].x - points[1].x, y: 2 * points[0].y - points[1].y };
      if (i >= n) return { x: 2 * points[n - 1].x - points[n - 2].x, y: 2 * points[n - 1].y - points[n - 2].y };
      return points[i];
    }
    function knot(t, a, b) {
      return t + Math.max(1e-3, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
    }
    function lerp(a, b, ta, tb, u) {
      var k = (u - ta) / (tb - ta);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    var marks = [0];
    for (var i = 0; i < n - 1; i++) {
      var p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      var t0 = 0, t1 = knot(t0, p0, p1), t2 = knot(t1, p1, p2), t3 = knot(t2, p2, p3);
      for (var s = 1; s <= 24; s++) {
        var u = t1 + (t2 - t1) * (s / 24);
        var a1 = lerp(p0, p1, t0, t1, u), a2 = lerp(p1, p2, t1, t2, u), a3 = lerp(p2, p3, t2, t3, u);
        var b1 = lerp(a1, a2, t0, t2, u), b2 = lerp(a2, a3, t1, t3, u);
        pts.push(lerp(b1, b2, t1, t2, u));
      }
      marks.push(pts.length - 1);
    }
    var len = [0];
    for (var k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    return { pts: pts, len: len, total: len[len.length - 1], marks: marks.map(function (m) { return len[m]; }) };
  }

  function pointAt(curve, dist) {
    var len = curve.len, lo = 0, hi = len.length - 1;
    if (dist <= 0) return curve.pts[0];
    if (dist >= curve.total) return curve.pts[hi];
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (len[mid] < dist) lo = mid; else hi = mid;
    }
    var k = (dist - len[lo]) / Math.max(1e-6, len[hi] - len[lo]);
    return { x: curve.pts[lo].x + (curve.pts[hi].x - curve.pts[lo].x) * k, y: curve.pts[lo].y + (curve.pts[hi].y - curve.pts[lo].y) * k };
  }

  // stops: [{ x, y, onReach }] en pantalla. options: turns (vueltas), scale
  // (tamano en vuelo), golden, overshoot (para los cuervos: sigue de largo y
  // vuelve). Se cumple al volver a la mano; si no hay arte, corta sin volar.
  function throwScythe(stops, options) {
    var o = options || {};
    var hand = scytheHand();
    if (!hand || !stops.length) {
      return (async function () {
        for (var i = 0; i < stops.length; i++) {
          if (stops[i].onReach) stops[i].onReach();
          await wait(150);
        }
      })();
    }
    if (scytheFlight) scytheFlight.finish();
    return new Promise(function (resolve) {
      var gx = hand.w * SCYTHE_ART.grip.x, gy = hand.h * SCYTHE_ART.grip.y;
      var points = [{ x: hand.x, y: hand.y }];
      stops.forEach(function (s) { points.push({ x: s.x, y: s.y }); });
      if (o.overshoot) {
        var last = stops[stops.length - 1];
        points.push({ x: last.x + (last.x - hand.x) * o.overshoot, y: last.y + (last.y - hand.y) * o.overshoot - hand.h * 0.15 });
      }
      points.push({ x: hand.x, y: hand.y });
      var curve = sampleCurve(points);
      // Velocidad segun el tamano de la Muerte (igual en PC y movil): unas
      // 4.8 guadanas por segundo; una Siega entera, ~2 s.
      var speed = Math.max(300, hand.h * 4.8);
      var dur = ms(Math.min(3000, Math.max(800, (curve.total / speed) * 1000)));
      var turns = o.turns || Math.max(2, Math.round((dur / 1000) * 2.6));
      var flyScale = o.scale || 0.55;
      var pieces = [0.45, 0.28, 0.14].map(function (opacity) {
        var g = div("el-juicio-flying-scythe is-ghost" + (o.golden ? " is-golden" : ""), document.body);
        g.style.opacity = String(opacity);
        img(ART.scythe, "", g);
        return g;
      });
      var main = div("el-juicio-flying-scythe" + (o.golden ? " is-golden" : ""), document.body);
      img(ART.scythe, "", main);
      pieces.push(main);
      pieces.forEach(function (el) {
        el.style.width = hand.w + "px";
        el.style.height = hand.h + "px";
        el.style.transformOrigin = gx + "px " + gy + "px";
      });
      var history = [];
      var fired = 0;
      var halfTurns = 0;
      var t0 = 0;
      var done = false;
      els.death.classList.add("is-thrown");
      restartClass(els.death, "is-throwing");
      sound("el_juicio_scythe_throw", { golden: o.golden });

      function place(el, st) {
        el.style.transform = "translate(" + (st.x - gx).toFixed(1) + "px," + (st.y - gy).toFixed(1) + "px) rotate(" + st.a.toFixed(1) + "deg) scale(" + st.s.toFixed(3) + ")";
      }
      function fireUpTo(dist) {
        // marks[0] es la mano; marks[k] es la parada k.
        while (fired < stops.length && curve.marks[fired + 1] <= dist + 0.5) {
          var stop = stops[fired];
          fired += 1;
          if (stop.onReach) stop.onReach();
        }
      }
      function finish() {
        if (done) return;
        done = true;
        fireUpTo(Infinity);
        pieces.forEach(function (el) { el.remove(); });
        scytheFlight = null;
        if (els) {
          els.death.classList.remove("is-thrown");
          restartClass(els.death, "is-catching");
          eyesLook(null);
        }
        sound("el_juicio_scythe_catch");
        resolve();
      }
      scytheFlight = { finish: finish };
      function step(now) {
        if (done) return;
        if (!active || !els) {
          finish();
          return;
        }
        if (!t0) t0 = now;
        var t = Math.min(1, (now - t0) / Math.max(1, dur));
        var e = 0.5 - Math.cos(Math.PI * t) / 2;
        var dist = curve.total * e;
        var p = pointAt(curve, dist);
        var spin = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        var windup = 26 * Math.sin(Math.PI * Math.min(1, t / 0.18));
        var a = SCYTHE_ART.tilt + windup - 360 * turns * spin;
        var grow = Math.min(1, t / 0.14), shrink = Math.min(1, (1 - t) / 0.14);
        var s = 1 + (flyScale - 1) * (grow * grow * (3 - 2 * grow)) * (shrink * shrink * (3 - 2 * shrink));
        var st = { x: p.x, y: p.y, a: a, s: s };
        place(main, st);
        history.push(st);
        if (history.length > 12) history.shift();
        for (var g = 0; g < 3; g++) {
          var past = history[history.length - 1 - (g + 1) * 3];
          if (past) place(pieces[g], past);
        }
        // Chispas en la punta de la hoja y un silbido por cada media vuelta.
        var rad = (a * Math.PI) / 180;
        var vx = (SCYTHE_TIP.x * hand.w - gx) * s, vy = (SCYTHE_TIP.y * hand.h - gy) * s;
        var tipX = p.x + vx * Math.cos(rad) - vy * Math.sin(rad);
        var tipY = p.y + vx * Math.sin(rad) + vy * Math.cos(rad);
        if (t > 0.08 && t < 0.92) {
          for (var sp = 0; sp < 2; sp++) emit("ember", tipX, tipY, { vx: rand(-40, 40), vy: rand(-40, 40), drag: 0.9, size: rand(1.4, 2.4), life: rand(0.25, 0.5), color: o.golden ? "255,214,110" : "255,190,140" });
        }
        var turned = Math.floor(Math.abs(a - SCYTHE_ART.tilt - windup) / 180);
        if (turned > halfTurns) {
          halfTurns = turned;
          sound("el_juicio_scythe_whoosh", { step: halfTurns, golden: o.golden });
        }
        eyesLook(p.x, p.y, 0);
        fireUpTo(dist);
        if (t < 1) {
          nextFrame(step);
          return;
        }
        finish();
      }
      nextFrame(step);
      // Con la pestana quieta no se queda nada colgado.
      schedule(finish, dur + 2500);
    });
  }

  // Pone un elemento de la capa de efectos encima de un rect de pantalla.
  function placeOver(el, rect) {
    var s = refBox();
    place(el, { x: rect.left - s.left, y: rect.top - s.top, w: rect.width, h: rect.height, sw: s.width, sh: s.height });
  }

  // Tajo de la guadana en el aire: media luna de luz que barre al cuervo.
  function crescentSlash(rect, golden) {
    if (!rect || !els) return Promise.resolve();
    var box = div("el-juicio-slash-box", els.fx);
    placeOver(box, rect);
    var s = div("el-juicio-slash" + (golden ? " is-golden" : ""), box);
    s.innerHTML = '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M20 150 C 50 40, 150 20, 190 70" /></svg>';
    return animate(s, [
      { opacity: 1, transform: "rotate(-8deg) scale(0.9)" },
      { opacity: 1, transform: "rotate(4deg) scale(1.05)", offset: 0.5 },
      { opacity: 0, transform: "rotate(10deg) scale(1.1)" }
    ], { duration: 360, easing: "ease-out" }).then(function () { box.remove(); });
  }

  // Lo que da un cuervo partido (evento del motor): un "+1" en oro vuela a la
  // campana y una pluma suya a la guadana, un paso mas (o, si es dorado, el
  // multiplicador sorpresa). Sin bolas de luz: que se lea que es cada cosa
  // (peticion del usuario, 2026-10-18).
  async function rewardCrow(c) {
    var col = els.nest.cols[c.cell];
    var r = vrect(col.el);
    var from = r ? { left: r.left, top: r.top, width: r.width, height: r.height * 0.55 } : null;
    var bell = prizeFlight(from, 0, { text: "+1", to: els.bell, toY: BELL_ART.countY, hold: 140, duration: 520 }).then(function () {
      V.tolls = c.tolls;
      pump(els.bell);
      var br = vrect(els.bell);
      if (br) shockwave(br.left + br.width / 2, br.top + br.height * BELL_ART.countY, br.width * 0.9, "gold");
      sound("el_juicio_bell_gained", { remaining: V.tolls, total: CFG.tolls });
      renderHud();
    });
    if (c.golden) {
      await bell;
      await goldenReveal(c);
      eyesOff("gold");
      return;
    }
    // Una pluma del cuervo, revoloteando, a la guadana: un paso mas.
    var step = featherFlight(r, els.pips.childNodes.length ? els.pips : els.multValue).then(function () {
      V.rung = c.rung;
      V.progress = c.progress;
      renderHud();
      restartClass(els.pips, "is-pumping");
    });
    await Promise.all([bell, step]);
    if (c.up) {
      stampMultiplier();
      sound("el_juicio_scythe_up", { multiplier: c.multiplier });
      banner("SCYTHE x" + c.multiplier, { top: 47, duration: 1000 });
      await wait(560);
    } else {
      await wait(120);
    }
  }

  // La bandada que llama la sangre: de la marca de un rodillo salen cuervos
  // que suben y se arremolinan sobre el nido, aleteando, hasta que pasa la
  // guadana. Devuelve el grupo y el punto donde se juntan.
  function summonMurder(col, golden) {
    var r = vrect(col.el), rr = vrect(els.rib1);
    if (!r || !rr) return { x: 0, y: 0, crows: [], golden: golden };
    var size = r.width * 0.62;
    var hx = r.left + r.width / 2, hy = rr.top - rr.height * 0.12;
    var crows = [];
    for (var i = 0; i < 6; i++) {
      var c = img(ART.crowShape, "el-juicio-murder-crow" + (golden && i === 0 ? " is-golden" : ""), els.fx);
      var sx = r.left + r.width * rand(0.25, 0.75), sy = r.top + r.height * rand(0.4, 0.62);
      placeOver(c, { left: sx - size / 2, top: sy - size / 2, width: size, height: size });
      var face = Math.random() < 0.5 ? 1 : -1;
      var ex = hx + rand(-0.5, 0.5) * r.width - sx, ey = hy + rand(-0.45, 0.35) * r.height - sy;
      var mx = ex * rand(0.2, 0.6) + rand(-0.7, 0.7) * r.width, my = ey - r.height * rand(0.4, 0.9);
      var sc = rand(0.6, 0.95);
      c.style.animationDelay = (-Math.random()).toFixed(2) + "s";
      animate(c, [
        { transform: "translate(0px,0px) scale(" + (0.3 * face).toFixed(2) + ",0.3)", opacity: 0 },
        { transform: "translate(" + mx.toFixed(1) + "px," + my.toFixed(1) + "px) scale(" + (face * (sc + 0.12)).toFixed(2) + "," + (sc + 0.12).toFixed(2) + ")", opacity: 1, offset: 0.45 },
        { transform: "translate(" + ex.toFixed(1) + "px," + ey.toFixed(1) + "px) scale(" + (face * sc).toFixed(2) + "," + sc.toFixed(2) + ")", opacity: 1 }
      ], { duration: ms(rand(620, 880)), delay: ms(i * 70), easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
      crows.push(c);
    }
    return { x: hx, y: hy, crows: crows, golden: golden };
  }

  // La guadana pasa por el grupo: los parte a todos en el aire (sangre,
  // plumas) y caen muertos.
  function slaughterMurder(group) {
    sound("el_juicio_crow_cut", { golden: group.golden });
    var box = null;
    group.crows.forEach(function (c, i) {
      var r = vrect(c);
      c.remove();
      if (!r) return;
      box = box ? { left: Math.min(box.left, r.left), top: Math.min(box.top, r.top), right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (gfx()) gfx().blood(cx, cy, { count: 7, dir: Math.PI / 2, spread: Math.PI * 1.6, speed: 230, width: r.width * 0.15 });
      if (i % 2 === 0) featherBurst({ left: r.left, top: r.top, width: r.width, height: r.height }, group.golden && i === 0);
      var dead = img(ART.crowDead, "el-juicio-crow-dead" + (group.golden && i === 0 ? " is-golden" : ""), els.fx);
      placeOver(dead, { left: r.left, top: r.top, width: r.width, height: r.height });
      var spin = (Math.random() < 0.5 ? -1 : 1) * rand(120, 260);
      animate(dead, [
        { transform: "translateY(0) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + rand(-30, 30).toFixed(0) + "%, 320%) rotate(" + spin.toFixed(0) + "deg)", opacity: 0 }
      ], { duration: rand(760, 1100), delay: i * 35, easing: "cubic-bezier(.45,0,.8,.45)" }).then(function () { dead.remove(); });
    });
    if (box) crescentSlash({ left: box.left, top: box.top, width: box.right - box.left, height: box.bottom - box.top }, group.golden);
    if (box && group.golden) burst("gold", (box.left + box.right) / 2, (box.top + box.bottom) / 2, 26, { speed: 240, size: 2.4, life: 1, gravity: 150 });
  }

  // BANDADA (MURDER OF CROWS): los tres rodillos marcados. La sangre llama a la
  // bandada: de cada marca salen cuervos que se arremolinan sobre el nido, la
  // Muerte se alza y los siega de un vuelo, de izquierda a derecha; las marcas
  // se lavan y la guadana sube 1, 2 o 3 peldanos, de uno en uno (no se sabe
  // donde para).
  async function playFlock(f) {
    var N = els.nest;
    nestCalling(false);
    await wait(380);
    // Enseña la causa antes de borrarla: las marcas se iluminan en orden y
    // solo después la bandada abandona el nido. No altera estado ni premio.
    var markedCols = N.cols.filter(function (col) { return col.marked; });
    for (var m = 0; m < markedCols.length; m++) {
      restartClass(markedCols[m].el, "is-gathering");
      await wait(115);
    }
    N.cols.forEach(function (col) { restartClass(col.el, "is-summoning"); });
    els.tint.classList.add("is-flock");
    restartClass(els.rib1, "is-flock");
    // La niebla del nido se tine de sangre mientras dura.
    els.rib1.classList.add("is-reaping");
    restartClass(els.death, "is-raising");
    banner("MURDER OF CROWS", { className: "is-flock", top: 33, duration: 1800, slam: true });
    sound("el_juicio_flock");
    eyesLookAt(els.rib1, 0);
    eyesMood("rage", 3400);
    eyesEmbers(8);
    if (gfx()) gfx().shakeMachine(0.5);
    var rr = vrect(els.rib1);
    if (rr) shockwave(rr.left + rr.width / 2, rr.top + rr.height / 2, rr.width * 1.3, "blood");
    var groups = N.cols.map(function (col, k) {
      restartClass(col.el, "is-reaped");
      return summonMurder(col, f.nest[k] === 2);
    });
    await wait(1000);
    var stops = groups.filter(function (g) { return g.crows.length; }).map(function (g) {
      return { x: g.x, y: g.y, onReach: function () { slaughterMurder(g); } };
    });
    await throwScythe(stops, { golden: f.nest.indexOf(2) >= 0, scale: 0.6, turns: 3 });
    groups.forEach(function (g) { g.crows.forEach(function (c) { if (c.isConnected) c.remove(); }); });
    N.cols.forEach(unmarkNestCol);
    els.tint.classList.remove("is-flock");
    els.rib1.classList.remove("is-reaping");
    eyesOff("rage");
    await climbReveal(f);
  }

  // La guadana sube peldano a peldano: cada uno se carga y se clava; tras el
  // ultimo vuelve a cargarse... y se apaga (o sigue).
  async function climbReveal(f) {
    var from = f.rung - f.rungs;
    var maxed = f.rung >= CFG.ladder.length;
    for (var k = 1; k <= f.rungs; k++) {
      restartClass(els.mult, "is-charging");
      sound("el_juicio_flock_charge", { step: k });
      eyesMood("flare", 500);
      await wait(k === 1 ? 420 : 640);
      els.mult.classList.remove("is-charging");
      V.rung = from + k;
      V.progress = f.progress;
      renderHud();
      stampMultiplier();
      sound("el_juicio_flock_climb", { step: k });
      await wait(260);
    }
    if (!maxed) {
      // El amago: parece que sube otra vez.
      restartClass(els.mult, "is-charging");
      sound("el_juicio_flock_charge", { step: f.rungs + 1 });
      await wait(640);
      els.mult.classList.remove("is-charging");
      restartClass(els.mult, "is-fizzle");
      sound("el_juicio_flock_fizzle");
    }
    banner("SCYTHE x" + f.multiplier, { top: 47, duration: 1100 });
    sound("el_juicio_scythe_up", { multiplier: f.multiplier });
    await wait(700);
  }

  // Ultima campanada a vida o muerte (peticion del usuario, 2026-10-18): con
  // la campana a 0, la maquina se apaga menos el nido, late, y los rodillos
  // libres paran despacio, uno a uno. Un cuervo da otra campanada y sigue;
  // ninguno: la Sentencia.
  function ritesBegin() {
    var r = vrect(els.rib1);
    // Debajo de la campana, la guadana y la linterna (siguen a la vista).
    var spot = div("el-juicio-rites", null);
    els.fx.insertBefore(spot, els.tint.nextSibling);
    if (r) {
      var pad = r.height * 0.14;
      placeOver(spot, { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
    }
    void spot.offsetWidth;
    spot.classList.add("is-on");
    els.rib1.classList.add("is-rites");
    eyesOff("scanning");
    eyesMood("staring");
    eyesLookAt(els.rib1, 0);
    sound("el_juicio_rites");
    var beat = 0;
    function pulse() {
      beat += 1;
      restartClass(spot, "is-beat");
      sound("el_juicio_rites_beat", { step: beat });
    }
    pulse();
    var timer = repeat(pulse, ms(820));
    return { spot: spot, timer: timer };
  }

  async function ritesEnd(h, saved) {
    if (!h) return;
    cancelRepeat(h.timer);
    eyesOff("staring");
    els.rib1.classList.remove("is-rites");
    if (saved) {
      h.spot.classList.add("is-saved");
      sound("el_juicio_rites_saved");
      var r = vrect(els.rib1);
      if (r) {
        shockwave(r.left + r.width / 2, r.top + r.height / 2, r.width * 1.6, "gold");
        burst("gold", r.left + r.width / 2, r.top + r.height / 2, 34, { speed: 280, size: 2.6, life: 1.2, gravity: 80 });
      }
      if (gfx()) gfx().flash("execution");
      banner("ONE MORE BELL", { top: 40, duration: 1500, slam: true });
      await wait(420);
    } else {
      h.spot.classList.add("is-lost");
      sound("el_juicio_rites_lost");
      await wait(900);
    }
    h.spot.classList.remove("is-on");
    schedule(function () { h.spot.remove(); }, ms(700));
  }

  // Cuervo dorado (peticion del usuario, 2026-10-19: fuera los rayos de sol):
  // un humo negro espeso se traga la pantalla (src/fx/dark-smoke.js) y,
  // delante, una ruleta de cifras de oro como la de la Marca de Sangre del
  // Execution (execution-tension.js#playBloodMark): cada cambio un clac, cada
  // vez mas lenta, y se clava en la que toca. Luego la cifra vuela a la
  // guadana mientras el humo se abre y se va. Todo en el centro de la
  // pantalla y epico (mismo dia): al frenar el oro se calienta (alumbra el
  // humo, suben brasas, la cifra tiembla en los ultimos pasos) y al clavarse
  // golpe, onda de oro, fogonazo y un destello que recorre las cifras; mas
  // fuerte cuanto mayor el multiplicador.
  async function goldenReveal(c) {
    var x = window.innerWidth / 2;
    var y = window.innerHeight * 0.47;
    var size = Math.min(window.innerWidth, window.innerHeight * 1.7);
    var smoke = window.OssuaryDarkSmoke ? window.OssuaryDarkSmoke.show({ x: x, y: y, radius: size * 0.17, dim: 0.78 }) : null;
    sound("el_juicio_golden_smoke");
    var options = CFG.goldenMultipliers.map(function (o) { return o[0]; });
    var lo = Math.min.apply(null, options), hi = Math.max.apply(null, options);
    var tier = hi > lo ? Math.max(0, Math.min(1, Math.log(c.times / lo) / Math.log(hi / lo))) : 1;
    var b = div("el-juicio-gold-roll", document.body);
    b.setAttribute("aria-hidden", "true");
    b.style.left = Math.round(x) + "px";
    b.style.top = Math.round(y) + "px";
    b.style.setProperty("--heat", "0");
    div("el-juicio-gold-roll__ring", b);
    div("el-juicio-gold-roll__ring is-late", b);
    var body = div("el-juicio-gold-roll__body", b);
    div("el-juicio-gold-roll__glow", body);
    var title = div("el-juicio-gold-roll__title", body);
    gold(title, "SCYTHE");
    var num = div("el-juicio-gold-roll__value", body);
    gold(num, "x" + options[0]);
    restartClass(body, "is-in");
    await wait(620);
    // Unas vueltas y acaba en la que toca (los ultimos pasos ya despacio).
    var seq = [];
    var n = 1;
    var steps = 13 + Math.floor(Math.random() * 4);
    for (; n <= steps; n++) seq.push(options[n % options.length]);
    if (options.indexOf(c.times) === -1) seq.push(c.times);
    else while (seq[seq.length - 1] !== c.times) seq.push(options[n++ % options.length]);
    for (var k = 0; k < seq.length; k++) {
      var p = k / Math.max(1, seq.length - 1);
      var left = seq.length - 1 - k;
      if (smoke) smoke.heat(0.15 + 0.7 * p);
      b.style.setProperty("--heat", p.toFixed(3));
      if (left === 2) b.classList.add("is-tense");
      await wait(46 + 260 * Math.pow(p, 2.4) + (left === 1 ? 110 : 0) + (left === 0 ? 260 : 0));
      gold(num, "x" + seq[k]);
      restartClass(num, "is-tick");
      if (smoke) smoke.pulse(0.06 + 0.2 * p);
      if (left > 0) sound("el_juicio_golden_tick", { step: k, total: seq.length });
    }
    num.classList.remove("is-tick");
    b.classList.remove("is-tense");
    b.classList.add("is-landed");
    restartClass(body, "is-landed");
    sound("el_juicio_golden_land", { tier: tier });
    if (smoke) {
      smoke.pulse(1);
      smoke.heat(1);
    }
    var flash = div("el-juicio-gold-flash", document.body);
    flash.style.setProperty("--fx", Math.round(x) + "px");
    flash.style.setProperty("--fy", Math.round(y) + "px");
    restartClass(flash, "is-on");
    schedule(function () { flash.remove(); }, ms(1000));
    var nr = vrect(num);
    if (nr && gfx()) {
      var cx = nr.left + nr.width / 2, cy = nr.top + nr.height / 2;
      gfx().sparks(cx, cy, { count: Math.round(46 + 50 * tier), spread: Math.PI * 2, speed: 460 + 240 * tier });
      if (tier >= 0.4) {
        schedule(function () {
          if (gfx()) gfx().sparks(cx, cy, { count: Math.round(30 + 30 * tier), dir: -Math.PI / 2, spread: Math.PI * 1.2, speed: 640 + 200 * tier });
        }, ms(140));
      }
      gfx().shakeMachine(0.45 + 0.6 * tier);
    }
    // Un destello que recorre las cifras de izquierda a derecha.
    num.querySelectorAll(".ossuary-number-font__digit, .ossuary-number-font__letter").forEach(function (el, i) {
      el.style.animationDelay = ms(360 + i * 80) + "ms";
    });
    num.classList.add("is-glint");
    await wait(1000 + 400 * tier);
    // La cifra vuela a la guadana; el humo se abre y se va.
    if (smoke) smoke.hide(800);
    var to = vrect(els.multValue);
    if (to) {
      var x1 = to.left + to.width / 2;
      var y1 = to.top + to.height * 0.5;
      var lift = Math.max(50, Math.abs(x1 - x) * 0.28 + Math.abs(y1 - y) * 0.12);
      var dur = ms(560);
      await new Promise(function (resolve) {
        var t0 = 0;
        function step(now) {
          if (!t0) t0 = now;
          var e = Math.min(1, (now - t0) / Math.max(1, dur));
          e = e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
          var fx = x + (x1 - x) * e;
          var fy = y + (y1 - y) * e - Math.sin(Math.PI * e) * lift;
          b.style.left = fx.toFixed(1) + "px";
          b.style.top = fy.toFixed(1) + "px";
          b.style.transform = "translate(-50%, -50%) scale(" + (1 - 0.65 * e).toFixed(3) + ")";
          emit("soul", fx + rand(-4, 4), fy + rand(-4, 4), { vx: rand(-16, 16), vy: rand(-16, 16), size: 2.6, life: 0.45, color: "255,206,90" });
          if (e < 1) nextFrame(step);
          else resolve();
        }
        nextFrame(step);
      });
    }
    b.remove();
    V.golden = c.goldenFactor;
    V.blight = c.blight || 0;
    renderHud();
    stampMultiplier("gold");
    sound("el_juicio_scythe_up", { multiplier: c.multiplier, golden: true });
    await wait(400);
  }

  // Ejecucion de un condenado en dos golpes: la guillotina le corta las
  // manos (caen) y la guadana, al pasar volando, la cabeza (sale despedida);
  // con la cabeza su cifra vuela a la linterna.
  function stackRect(c) {
    var stackBox = vrect(c.stack);
    return { box: stackBox, art: containRect(stackBox, 924 / 500) };
  }

  function cutHands(cell) {
    var c = els.cepos[cell.cell];
    var s = stackRect(c);
    if (!s.art || c.hands.hidden) return;
    var holes = vpoint(s.art, c.mirrored ? 1 - HAND_HOLES.x : HAND_HOLES.x, HAND_HOLES.y);
    flyPart(c.hands, s.box, c.mirrored, "hands");
    c.hands.hidden = true;
    if (gfx()) gfx().blood(holes.x, holes.y, { count: 10, dir: Math.PI / 2, spread: Math.PI * 0.9, speed: 200, width: s.art.width * 0.2 });
  }

  function cutHead(cell, step) {
    var c = els.cepos[cell.cell];
    var r = vrect(c.el);
    var s = stackRect(c);
    cutHands(cell);
    restartClass(c.el, "is-executed");
    sound("el_juicio_execute", { step: step });
    if (s.art && !c.head.hidden) {
      var neck = vpoint(s.art, c.mirrored ? 1 - NECK.x : NECK.x, NECK.y);
      flyPart(c.head, s.box, c.mirrored, "head");
      c.head.hidden = true;
      if (gfx()) {
        gfx().blood(neck.x, neck.y, { count: cell.marked ? 26 : 16, dir: -Math.PI / 2, spread: Math.PI * 1.3, speed: 300, width: s.art.width * 0.05 });
        gfx().sparks(neck.x, neck.y, { count: 8, spread: Math.PI * 1.6, speed: 280 });
      }
    }
    return prizeFlight(r, cell.value, { red: cell.marked, gold: cell.type === "RICO", fromY: 0.36, hold: 160 }).then(function () {
      V.sack = Math.round((V.sack + cell.value) * 10000) / 10000;
      lanternHit();
      sound("el_juicio_soul_in", { step: step + 1 });
      renderHud();
    });
  }

  // Punto del cuello de un cepo (pantalla): por donde pasa la guadana.
  function neckPoint(i) {
    var c = els.cepos[i];
    var s = stackRect(c);
    if (!s.art) return null;
    return vpoint(s.art, c.mirrored ? 1 - NECK.x : NECK.x, NECK.y);
  }

  // La guadana recorre los condenados fila a fila (rib2 a rib5), en zigzag
  // desde donde viene, y a cada uno le salta la cabeza al pasar.
  async function scytheSweep(cells) {
    var rows = {};
    cells.forEach(function (cell) {
      var row = Math.floor(cell.cell / 2);
      (rows[row] = rows[row] || []).push(cell);
    });
    var hand = scytheHand();
    var x = hand ? hand.x : 0;
    var order = [];
    Object.keys(rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (row) {
      rows[row].map(function (cell) { return { cell: cell, p: neckPoint(cell.cell), row: row }; })
        .filter(function (o) { return o.p; })
        .sort(function (a, b) { return Math.abs(a.p.x - x) - Math.abs(b.p.x - x); })
        .forEach(function (o, k) {
          o.first = k === 0;
          order.push(o);
          x = o.p.x;
        });
    });
    var flights = [];
    var step = 0;
    await throwScythe(order.map(function (o) {
      return {
        x: o.p.x,
        y: o.p.y,
        onReach: function () {
          if (o.first) sound("el_juicio_row_cut", { row: o.row });
          flights.push(cutHead(o.cell, step));
          step += 1;
        }
      };
    }), { scale: 0.62 });
    await Promise.all(flights);
  }

  // Copia de la cabeza (sale despedida hacia arriba y cae girando) o de las
  // manos (caen) en la capa fija, como la guadana del Execution.
  function flyPart(source, rect, mirrored, kind) {
    if (!source || source.hidden || !rect) return;
    var clone = document.createElement("img");
    clone.className = "guadana-head-fly";
    clone.src = source.currentSrc || source.src;
    clone.alt = "";
    clone.style.left = rect.left + "px";
    clone.style.top = rect.top + "px";
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    clone.style.objectFit = "contain";
    if (mirrored) clone.style.transform = "scaleX(-1)";
    var originX = kind === "head" ? NECK.x : HAND_HOLES.x;
    clone.style.transformOrigin = (mirrored ? 1 - originX : originX) * 100 + "% " + (kind === "head" ? 30 : 80) + "%";
    document.body.appendChild(clone);
    var spin = (Math.random() < 0.5 ? -1 : 1) * rand(300, 620);
    var drift = (Math.random() * 2 - 1) * window.innerWidth * 0.12;
    var fallY = window.innerHeight - rect.top + rect.height;
    var frames = kind === "head" ? [
      { translate: "0px 0px", rotate: "0deg", opacity: 1, easing: "cubic-bezier(0.16, 0.72, 0.3, 1)" },
      { translate: Math.round(drift * 0.4) + "px " + Math.round(-window.innerHeight * rand(0.12, 0.22)) + "px", rotate: Math.round(spin * 0.4) + "deg", opacity: 1, offset: 0.38, easing: "cubic-bezier(0.5, 0, 0.82, 0.4)" },
      { translate: Math.round(drift) + "px " + Math.round(fallY) + "px", rotate: Math.round(spin) + "deg", opacity: 0 }
    ] : [
      { translate: "0px 0px", rotate: "0deg", opacity: 1 },
      { translate: Math.round(drift * 0.2) + "px " + Math.round(fallY * 0.9) + "px", rotate: Math.round(spin * 0.3) + "deg", opacity: 0 }
    ];
    animate(clone, frames, { duration: kind === "head" ? 1500 : 1100, easing: kind === "head" ? "linear" : "cubic-bezier(.5,0,.85,.5)", fill: "forwards" })
      .then(function () { clone.remove(); });
    schedule(function () { if (clone.isConnected) clone.remove(); }, 3000);
  }

  function dropGuillotine() {
    restartClass(els.rib1, "is-dropping");
    schedule(function () {
      var r = vrect(els.rib1);
      if (gfx() && r) gfx().impact({ left: r.left, top: r.top, width: r.width, height: r.height, right: r.right }, 1, { epic: true });
    }, ms(440));
  }

  // Cae la guillotina y corta las manos de todos; luego la guadana vuela a
  // por las cabezas.
  async function executeAll(cells, phases) {
    dropGuillotine();
    await wait(440);
    if (phases && phases.onCut) phases.onCut();
    cells.forEach(cutHands);
    await wait(240);
    if (phases && phases.onSweep) phases.onSweep();
    await scytheSweep(cells);
  }

  async function playHarvest(h) {
    await wait(160);
    els.tint.classList.add("is-harvest");
    restartClass(els.death, "is-raising");
    banner("HARVEST", { className: "is-red is-huge", top: 40, duration: 2000, slam: true });
    sound("el_juicio_harvest");
    eyesMood("rage", 3600);
    eyesEmbers(8);
    if (gfx()) gfx().shakeMachine(0.6);
    await wait(380);
    await executeAll(h.cells, {
      onCut: function () { els.tint.classList.add("is-harvest-cut"); },
      onSweep: function () {
        els.tint.classList.remove("is-harvest-cut");
        els.tint.classList.add("is-harvest-sweep");
      }
    });
    els.tint.classList.remove("is-harvest-sweep");
    els.tint.classList.add("is-harvest-collect");
    V.sack = h.sack;
    await wait(240);
    for (var i = 0; i < CFG.cepos; i++) {
      V.board[i] = null;
      setCepo(i, null);
      els.cepos[i].el.classList.add("is-executed-empty");
      var r = vrect(els.cepos[i].el);
      if (r) emit("smoke", r.left + r.width * 0.5, r.top + r.height * 0.5, { vy: -30, size: r.width * 0.2, life: 1.4, color: "30,26,22" });
    }
    V.rung = h.rung;
    V.progress = 0;
    renderHud();
    els.tint.classList.remove("is-harvest");
    els.tint.classList.remove("is-harvest-collect");
    if (h.up) {
      stampMultiplier();
      sound("el_juicio_scythe_up", { multiplier: h.multiplier });
      banner("SCYTHE x" + h.multiplier, { top: 47, duration: 1000 });
    }
    await wait(720);
  }

  async function playSentence(e) {
    V.done = true;
    els.bell.classList.add("is-last");
    els.tint.classList.add("is-sentence");
    sound("el_juicio_last_bell");
    var br = vrect(els.bell);
    if (br) shockwave(br.left + br.width / 2, br.top + br.height * BELL_ART.countY, br.width * 2, "blood");
    await banner("LAST BELL", { className: "is-red", top: 42, duration: 1300, slam: true });
    if (e.cells.length) {
      restartClass(els.death, "is-raising");
      eyesMood("rage", 3600);
      eyesEmbers(8);
      await executeAll(e.cells);
    }
    V.sack = e.sack;
    renderHud();
    await wait(300);

    // La Sentencia: la guadana vuela a la linterna, que estalla.
    sound("el_juicio_sentence");
    var mr = vrect(els.multValue);
    if (mr) await soulFlight(mr, els.lantern, { gold: true, duration: 700, toY: 0.35 });
    restartClass(els.lantern, "is-sentence");
    await wait(820);
    var lr = vrect(els.lantern);
    if (lr) {
      var c = vpoint(lr, 0.5, 0.32);
      shockwave(c.x, c.y, lr.width * 4, "gold");
      shockwave(c.x, c.y, lr.width * 2.4, "soul");
      if (gfx()) {
        gfx().flash("execution");
        gfx().shakeMachine(0.9);
        gfx().sparks(c.x, c.y, { count: 60, spread: Math.PI * 2, speed: 520 });
      }
      eyesMood("blaze", 2200);
      eyesEmbers(10, "255,214,140");
      burst("soul", c.x, c.y, 50, { speed: 360, size: 3, life: 1.4, gravity: -30 });
      burst("gold", c.x, c.y, 40, { speed: 300, size: 2.6, life: 1.3, gravity: 120 });
      // La guadana multiplica la linterna: "x5" encima y la cifra sube hasta
      // el premio (el WIN del HUD con ella).
      var tag = div("exec-cut-prize exec-cut-prize--big el-juicio-prize is-mult", document.body);
      var tagValue = div("exec-cut-prize__value", tag);
      gold(tagValue, "x" + e.multiplier);
      tag.style.left = c.x + "px";
      tag.style.top = lr.top + "px";
      animate(tag, [
        { transform: "translate(-50%, -50%) scale(2.6)", opacity: 0, filter: "blur(4px) brightness(2)" },
        { transform: "translate(-50%, -60%) scale(0.95)", opacity: 1, filter: "blur(0px) brightness(1.4)", offset: 0.18 },
        { transform: "translate(-50%, -64%) scale(1.05)", opacity: 1, filter: "none", offset: 0.75 },
        { transform: "translate(-50%, -90%) scale(0.8)", opacity: 0 }
      ], { duration: 1500, easing: "ease-out", fill: "forwards" }).then(function () { tag.remove(); });
    }
    lanternFinal = e.win;
    tweenSack(e.win, 900);
    pump(els.lantern);
    sound("el_juicio_sentence_done", { capped: e.capped });

    var total = Math.round(e.win * bet() * 100) / 100;
    // El premio con el contador BIG WIN del juego (con su musica) si es un
    // premio grande; si no, la cuenta propia de la Sentencia.
    if (hooks.showWinCounter && e.win >= 10) {
      await wait(1550);
      try {
        await hooks.showWinCounter(total);
      } catch (err) { /* sigue */ }
      await wait(1700);
      return;
    }
    await wait(1150);
    var panel = div("el-juicio-sentence", els.fx);
    var title = div("el-juicio-sentence__title", panel);
    gold(title, "THE SENTENCE");
    var eq = div("el-juicio-sentence__eq", panel);
    gold(eq, money(e.sack) + " x" + e.multiplier);
    var tot = div("el-juicio-sentence__total", panel);
    gold(tot, "0.00");
    await animate(panel, [{ opacity: 0, transform: "translate(-50%, -50%) scale(0.8)" }, { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }],
      { duration: 380, easing: "ease-out", fill: "forwards" });
    var duration = ms(CFG.timing.sentence * 0.6);
    var t0 = window.performance.now();
    await new Promise(function (resolve) {
      function tick(now) {
        var k = Math.min(1, (now - t0) / Math.max(1, duration));
        var eased = 1 - Math.pow(1 - k, 3);
        gold(tot, money(e.win * eased));
        if (k < 1) nextFrame(tick);
        else resolve();
      }
      nextFrame(tick);
    });
    pump(tot);
    await wait(CFG.timing.sentence * 0.5);
    await animate(panel, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
    panel.remove();
  }

  function flyBy() {
    if (!els) return;
    var c = img(ART.crowShape, "el-juicio-flyby", els.fx);
    sound("el_juicio_flyby");
    animate(c, [
      { left: "-10%", top: "4%" },
      { left: "105%", top: "-6%" }
    ], { duration: 1000, easing: "ease-in" }).then(function () { c.remove(); });
  }

  function tollBell(last) {
    restartClass(els.bell, "is-tolling");
    els.tint.classList.toggle("is-last", Boolean(last));
    sound("el_juicio_bell", { last: last, remaining: V.tolls, total: CFG.tolls });
    var br = vrect(els.bell);
    if (br) shockwave(br.left + br.width / 2, br.top + br.height * BELL_ART.countY, br.width * (last ? 1.8 : 1.1), last ? "blood" : "gold");
    restartClass(els.tint, "is-toll");
  }

  async function playSpin() {
    var before = S.board.slice();
    var ev = engine.step(S, { forceGolden: debugNext.golden, forceHarvest: debugNext.harvest, forceFlock: debugNext.flock, forceBlight: debugNext.blight });
    debugNext.blight = false;
    debugNext.golden = false;
    debugNext.harvest = false;
    debugNext.flock = false;

    // Campanada. Con la ultima (la campana a 0), a vida o muerte.
    V.tolls -= 1;
    var lastRites = V.tolls <= 0;
    tollBell(lastRites);
    renderHud();
    await wait(260);

    // Giran los cepos vacios y paran de arriba abajo.
    var empties = [];
    for (var i = 0; i < before.length; i++) if (!before[i]) empties.push(i);
    var tense = lastRites || empties.length === 1;
    var landed = {};
    ev.landings.forEach(function (l) { landed[l.cell] = l; });
    var emptyAppearance = !ev.landings.length && !ev.crows.length;
    // Por orden (peticion del usuario, 2026-10-19): arrancan los cepos de
    // arriba abajo y despues, casi seguido, los tres rodillos del nido; con
    // dos marcados, su sangre llama al que falta.
    var N = els.nest;
    var nestDelay = empties.length ? startSpinning(empties) + SPIN_ORDER.nestAfter : 0;
    spinNest(N.cols, nestDelay);
    if (nestMarked() === N.cols.length - 1) {
      nestCalling(true);
      sound("el_juicio_nest_call");
    }
    if (!empties.length) {
      eyesMood("scanning");
      sound("el_juicio_spin_start");
      await wait(CFG.timing.spinMin);
    }
    if (empties.length) {
      // Mientras giran, la Muerte los recorre con la mirada.
      eyesMood("scanning");
      sound("el_juicio_spin_start");
      await wait(CFG.timing.spinMin);
      var note = 0;
      for (var k = 0; k < empties.length; k++) {
        var cell = empties[k];
        var staring = tense && k === empties.length - 1;
        if (staring) {
          els.cepos[cell].el.classList.add("is-anticipation");
          // ...y se clava en el que se hace esperar.
          eyesOff("scanning");
          eyesMood("staring");
          eyesLookAt(els.cepos[cell].el, 0);
          sound("el_juicio_anticipation");
          var ar = vrect(els.cepos[cell].el);
          if (ar && gfx()) gfx().sparks(ar.left + ar.width / 2, ar.top + ar.height / 2, { count: 10, spread: Math.PI * 2, speed: 200 });
          await wait(CFG.timing.anticipation);
        }
        stopSpinning(cell);
        if (staring) eyesOff("staring");
        sound("el_juicio_cepo_stop", { emptyAppearance: emptyAppearance });
        if (landed[cell]) {
          note += 1;
          await landCondemned(landed[cell], note);
        } else {
          setCepo(cell, null);
          restartClass(els.cepos[cell].el, "is-landing-empty");
          await wait(CFG.timing.stopStep);
        }
      }
    }

    // El nido para el ultimo, de izquierda a derecha, y cada cuervo que para en
    // el centro lo parte la Muerte en el acto (los que faltan siguen girando).
    // Se arrastra (casi parado, la Muerte clavada en el) a menudo el limpio
    // que completaria la BANDADA, a veces el ultimo cuando a la guadana le
    // falta uno y de vez en cuando sin mas; en la ultima campanada, todos.
    var byCell = {};
    ev.crows.forEach(function (c) { byCell[c.cell] = c; });
    var rites = lastRites ? ritesBegin() : null;
    if (rites) await wait(900);
    var stops = [];
    for (var j = 0; j < N.cols.length; j++) {
      var col = N.cols[j];
      var isLast = j === N.cols.length - 1;
      var crow = byCell[col.index] || null;
      var creep = 0;
      if (rites) {
        creep = isLast ? 2 : 1;
      } else {
        var hungry = !col.marked && nestMarked() === N.cols.length - 1;
        var chance = hungry ? 0.55 : isLast ? (els.mult.classList.contains("is-near") ? 0.35 : 0.1) : 0;
        if (hooks.random() < chance) creep = 2;
      }
      if (creep) {
        await Promise.all(stops);
        eyesOff("scanning");
        eyesMood("staring");
        eyesLookAt(col.el, 0);
        if (!rites) sound("el_juicio_anticipation");
      }
      var plan = nestColPlan(crow, creep === 2);
      var stop = stopNestCol(col, plan, creep, (function (cc, cr, pl) {
        return function () {
          sound("el_juicio_nest_stop", { col: cc.index, emptyAppearance: emptyAppearance });
          if (cr) landNestCrow(cc, pl.center);
          else nestNearMiss(cc, pl);
        };
      })(col, crow, plan));
      stops.push(stop);
      if (crow) {
        await stop;
        eyesOff("staring");
        // Lo parte, su campanada y su paso; la guadana vuelve a la mano.
        var flight = await killNestCrow(col, crow);
        if (rites) {
          await ritesEnd(rites, true);
          rites = null;
        }
        await Promise.all([rewardCrow(crow), flight]);
        eyesOff("gold");
        if (nestMarked() === N.cols.length - 1 && !ev.flock) {
          nestCalling(true);
          sound("el_juicio_nest_call");
        }
      } else if (creep) {
        await stop;
        eyesOff("staring");
      } else if (!isLast) {
        await wait(NEST.stagger);
      }
    }
    await Promise.all(stops);
    nestCalling(false);
    eyesOff("staring");
    eyesOff("scanning");
    sound("el_juicio_spin_end");
    if (emptyAppearance) sound("el_juicio_empty_appearance");
    if (rites) await ritesEnd(rites, false);
    if (!ev.crows.length && hooks.random() < 0.08) {
      flyBy();
      var fr = vrect(els.board);
      if (fr) eyesLook(fr.left + fr.width * 0.8, fr.top, 700);
    }

    // Los tres marcados: la BANDADA.
    if (ev.flock) await playFlock(ev.flock);

    if (ev.harvest) await playHarvest(ev.harvest);
    await wait(250);
    if (ev.end) await playSentence(ev.end);

    // Lo visible queda igual que el motor.
    V.board = S.board.slice();
    V.sack = S.sack;
    V.tolls = S.tolls;
    V.rung = S.rung;
    V.progress = S.progress;
    V.golden = S.golden;
    V.blight = S.blight;
    if (els) {
      els.nest.cols.forEach(function (col, n) {
        if (S.nest[n] && col.marked !== S.nest[n]) markNestCol(col, S.nest[n]);
        else if (!S.nest[n] && col.marked) unmarkNestCol(col);
      });
    }
    renderHud();
    return ev;
  }

  async function intro() {
    banner("DEATH TOLLS " + CFG.tolls + " BELLS", { top: 40, duration: 2200, slam: true });
    sound("el_juicio_intro");
    // Las campanadas suben de 0 a 13.
    var shown = V.tolls;
    for (var t = 0; t <= shown; t++) {
      V.tolls = t;
      gold(els.bellCount, String(t));
      if (t % 4 === 0) pump(els.bell);
      await wait(38);
    }
    V.tolls = shown;
    tollBell(false);
    renderHud();
    await wait(500);
    for (var k = 0; k < S.start.length; k++) {
      var who = S.start[k];
      var running = 0;
      for (var j = 0; j <= k; j++) running += S.start[j].value;
      await landCondemned(Object.assign({}, who, { sack: Math.round(running * 10000) / 10000 }), k + 1);
      await wait(150);
    }
    await wait(500);
  }

  async function run() {
    await intro();
    while (active && S && !S.done) {
      await wait(CFG.timing.betweenSpins);
      if (!active) return;
      await playSpin();
    }
    if (!active || !S) return;
    hooks.onFinish({
      total: Math.round(S.win * bet() * 100) / 100,
      multiple: S.win,
      spins: S.spins,
      harvests: S.harvests,
      capped: S.capped
    });
  }

  // --- API ---------------------------------------------------------------------
  function start(options) {
    if (active || !stage || !overlay) return false;
    preload();
    active = true;
    engine = hooks.createEngine ? hooks.createEngine() : ENGINE.create({ config: CFG, random: hooks.random || Math.random });
    S = engine.newSuper();
    V = { board: [], sack: 0, tolls: S.tolls, rung: 0, progress: 0, golden: 1, blight: 0, done: false };
    for (var i = 0; i < CFG.cepos; i++) V.board.push(null);
    shownSack = 0;
    lanternFinal = null;
    lastMultShown = null;
    build();
    stage.classList.add("el-juicio-active");
    swapFrame(true);
    if (window.OssuarySceneManager && window.OssuarySceneManager.setBonusBackgroundActive) {
      window.OssuarySceneManager.setBonusBackgroundActive(true);
    }
    ensureParticles();
    layout();
    clearFallenSprite();
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(function () { layout(); });
      resizeObserver.observe(stage);
    }
    startEmbers();
    sound("super_bonus", { source: options && options.source });
    renderHud();
    run();
    return true;
  }

  function close() {
    if (!active && !els) return;
    sound("el_juicio_closed");
    active = false;
    stopEmbers();
    if (scytheFlight) scytheFlight.finish();
    if (els && els.nest) {
      if (els.nest.raf) cancelFrame(els.nest.raf);
      els.nest.raf = 0;
      els.nest.cols.forEach(function (col) {
        col.stop = null;
        col.spinning = false;
      });
    }
    Object.keys(eyeTimers).forEach(function (k) { cancelScheduled(eyeTimers[k]); });
    cancelScheduled(lookTimer);
    if (sackTween) cancelFrame(sackTween);
    sackTween = 0;
    pendingTimeouts.forEach(function (id) { window.clearTimeout(id); });
    pendingTimeouts.clear();
    pendingIntervals.forEach(function (id) { window.clearInterval(id); });
    pendingIntervals.clear();
    pendingFrames.forEach(function (id) { window.cancelAnimationFrame(id); });
    pendingFrames.clear();
    pRaf = 0;
    // Algunas ondas viven directamente en el overlay, fuera de els.fx.
    Array.from(overlay.children).forEach(function (node) {
      if (!Array.from(node.classList).some(function (name) { return name.indexOf("el-juicio-") === 0; })) return;
      if (node.getAnimations) node.getAnimations({ subtree: true }).forEach(function (anim) { anim.cancel(); });
      node.remove();
    });
    if (els) {
      els.board.remove();
      els.fx.remove();
    }
    els = null;
    if (pCanvas) pCanvas.remove();
    pCanvas = null;
    pCtx = null;
    particles = [];
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    clearFallenSprite();
    dread(false);
    stage.classList.remove("el-juicio-active");
    swapFrame(false);
    if (window.OssuarySceneManager && window.OssuarySceneManager.setBonusBackgroundActive) {
      window.OssuarySceneManager.setBonusBackgroundActive(false);
    }
    sound("bonus_completed", { source: "el_juicio" });
    S = null;
    V = null;
    hooks.render();
  }

  // Cuando el Super se cancela antes de empezar (p.ej. el amago fallo o se
  // corto la entrada): deja el marco y el esternon como estaban.
  function resetEntry() {
    clearFallenSprite();
    sternumCall(false);
    dread(false);
    if (!active) swapFrame(false);
  }

  window.OssuaryElJuicio = {
    init: function (h) {
      Object.keys(h || {}).forEach(function (k) {
        if (typeof h[k] === "function") hooks[k] = h[k];
      });
      // El arte en memoria antes de que haga falta (sin prisa).
      schedule(preload, 4000);
    },
    start: start,
    close: close,
    resetEntry: resetEntry,
    playHoodTease: playHoodTease,
    playHoodFall: playHoodFall,
    isActive: function () { return active; },
    // Para el SPIN del HUD (src/ui/controls.js): campanadas que quedan.
    hudSpinState: function () {
      if (!active || !V) return null;
      var n = Math.max(0, V.tolls);
      return { mode: "execution", count: n, label: n === 1 ? "BELL" : "BELLS" };
    },
    // WIN del HUD: lo mismo que la linterna (cada premio sube al llegar su
    // cifra; en la Sentencia, multiplicado por la guadana). Un solo numero.
    hudWin: function () {
      if (!active || !V) return null;
      return Math.round(shownSack * bet() * 100) / 100;
    },
    debug: {
      forceGolden: function () { debugNext.golden = true; return true; },
      forceHarvest: function () { debugNext.harvest = true; return true; },
      // En la proxima tirada caen cuervos en los rodillos sin marcar (BANDADA).
      forceFlock: function () { debugNext.flock = true; return true; },
      // En la proxima tirada cae un infectado (BLIGHTED con su multiplicador).
      forceBlight: function () { debugNext.blight = true; return true; },
      // Estado del nido de los cuervos (para pruebas).
      nest: function () {
        var N = els && els.nest;
        return N ? N.cols.map(function (col) {
          return { pos: Math.round(col.pos * 100) / 100, spinning: col.spinning, stopping: Boolean(col.stop), marked: col.marked };
        }) : null;
      },
      setTolls: function (n) {
        if (!S || !V) return false;
        S.tolls = Math.max(1, Number(n) || 1);
        V.tolls = S.tolls;
        renderHud();
        return true;
      },
      state: function () {
        return S ? { tolls: S.tolls, sack: S.sack, multiplier: engine.multiplier(S), spins: S.spins, harvests: S.harvests, flocks: S.flocks, nest: S.nest.join(""), board: S.board.map(function (b) { return b ? b.type + (b.marked ? "*" : "") : "-"; }).join(" ") } : null;
      }
    }
  };
})();
