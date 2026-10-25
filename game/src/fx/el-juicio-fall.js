(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // SUPER BONUS "El Juicio": amago y caida del encapuchado, de seguido
  // (peticiones del usuario, 2026-10-17 y 2026-10-18).
  //
  // El encapuchado va en dos capas (tools/bake-el-juicio-hood-layers.js): el
  // cuerpo DETRAS del marco, asi que la viga lo tapa de verdad (puede subir
  // unos pixeles o hundirse sin que se vea hueco ni corte; su manto sigue por
  // detras de la madera), y las manos DELANTE, agarradas a la viga.
  //
  // 0. En cuanto para el BONUS de rib3 (cadena completa), en esa misma
  //    tirada: el esternon no se para y se queda NEGRO del todo, la maquina
  //    se apaga alrededor, tiembla y retumba, con latidos en rojo y la luz
  //    fallando a tirones (parpadeo: apagones con el esternon al rojo por
  //    dentro, sin salirse del rodillo); rib4 y rib5 paran enseguida. Ahi
  //    mismo se decide (game.js#startElJuicioChain):
  // 1. Amago (rapido y violento): aura oscura (humo negro que sube y apaga el
  //    cielo) y el encapuchado da tirones contra la viga, sin ojos; cada golpe
  //    sacude la maquina y suelta polvo. Sin amago: solo la intriga
  //    (intrigue).
  // 2a. Sin Super: "ah... nada". Para el temblor, se rinde, el humo se apaga
  //     y el esternon para en seco: sus simbolos caen de golpe y se clavan
  //     (stopSternumSpin); enseguida la entrada del bonus normal.
  // 2b. Super: se alza temblando, algo tira de el y se hunde detras de la
  //     viga (las manos resbalan por el borde con chispas, polvo y humo; el
  //     aura se va con el). El esternon acelera y se pone al rojo, todo lo
  //     demas se apaga (tambien el marcador y los botones), cae arenilla y la
  //     Muerte entera (la del tablero: el-juicio.js#buildSternumDeath) cae de
  //     golpe por el esternon con estela; el rodillo se para con ella: golpe
  //     congelado, fogonazo, la camara da un tiron hacia el golpe, grietas al
  //     rojo detras de ella, cascotes y huesos que saltan, los rodillos de
  //     alrededor se encogen, ondas, chispas y ascuas. Estruendo
  //     (tools/bake-el-juicio-fall-sounds.js). Se queda ahi un rato ardiendo,
  //     con todo lo demas a oscuras, una columna de humo negro y gris que
  //     sube y se abre por encima del marco y de los rodillos (plume), la
  //     maquina retumbando y la camara acercandose despacio.
  // 3. Y el cartel THE JUDGMENT · Superbonus cae de golpe sobre la pantalla
  //    (superSlam) y se queda para la entrada con PLAY (releaseSlam). La
  //    oscuridad se va al empezar el Super (al quitarse la Muerte caida).
  //
  // Lo llama el-juicio.js#playHoodTease con sus utilidades (fx: animate y wait
  // con el turbo, particulas, ondas, sonido y los golpes de la guillotina).
  // ---------------------------------------------------------------------------

  var FRAME_PX = 1408;
  // Lienzo de hood_body.png y hood_hands.png en pixeles del marco.
  var LAYER = { x0: 540, y0: 30, w: 322, h: 260 };
  // La viga: donde empieza la madera y donde acaba; cut: donde se recorto la
  // figura del marco (tools/bake-el-juicio-art.js#FIGURE.beamTop).
  var BEAM = { top: 191, bottom: 227, cut: 184 };
  // El cuerpo gira y se alza desde donde asoma de la viga.
  var PIVOT_Y = (BEAM.top - LAYER.y0) / LAYER.h;
  // Centro de cada mano en el lienzo (tools/bake-el-juicio-art.js#HAND_BOXES).
  var HAND_X = [(599 - LAYER.x0) / LAYER.w, (818 - LAYER.x0) / LAYER.w];
  var BODY_SRC = "assets/super_bonus/hood_body.png";
  var HANDS_SRC = "assets/super_bonus/hood_hands.png";
  // El esternon a oscuras tapa algo mas que su caja (el marco deja ver un poco
  // del rodillo real por encima): fracciones del alto/ancho de la caja.
  var DARK_BLEED = { top: 0.07, bottom: 0.015, side: 0.02 };

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
    el.setAttribute("aria-hidden", "true");
    if (parent) parent.appendChild(el);
    return el;
  }

  function img(src, className, parent) {
    var el = document.createElement("img");
    el.className = className;
    el.src = art(src);
    el.alt = "";
    el.draggable = false;
    if (parent) parent.appendChild(el);
    return el;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function laneEl() {
    return document.querySelector('.reel-lane[data-reel="sternum"]');
  }

  function laneRect() {
    var el = laneEl();
    if (!el) return null;
    var r = el.getBoundingClientRect();
    return r.width ? r : null;
  }

  // El cuadrado del marco tal y como se ve (object-fit: contain, centrado),
  // en pantalla. La escala sale del rect real entre el tamano de layout: asi
  // cuenta la del marco y la de sus padres (el layout amplia la maquina; si
  // solo se cuenta la del marco, el encapuchado sale mas abajo y mas
  // pequeno, medio tapado por la viga).
  function frameImg() {
    return document.querySelector('img[data-scene-layer="ribcage_overlay_top"]');
  }

  function frameContentRect() {
    var el = frameImg();
    if (!el || !el.offsetWidth || !el.offsetHeight) return null;
    var r = el.getBoundingClientRect();
    var W = el.offsetWidth, H = el.offsetHeight;
    var ar = (el.naturalWidth || 1) / (el.naturalHeight || 1);
    var cw = Math.min(W, H * ar) * (r.width / W);
    var ch = Math.min(H, W / ar) * (r.height / H);
    return { left: r.left + (r.width - cw) / 2, top: r.top + (r.height - ch) / 2, width: cw, height: ch };
  }

  // Caja en pixeles del marco -> pantalla.
  function frameBox(f, x, y, w, h) {
    var sx = f.width / FRAME_PX, sy = f.height / FRAME_PX;
    return { left: f.left + x * sx, top: f.top + y * sy, width: w * sx, height: h * sy };
  }

  // Coloca el (absoluto) sobre rect (pantalla) en % de la caja p (pantalla).
  function placeIn(el, p, rect) {
    el.style.left = ((rect.left - p.left) / p.width) * 100 + "%";
    el.style.top = ((rect.top - p.top) / p.height) * 100 + "%";
    el.style.width = (rect.width / p.width) * 100 + "%";
    el.style.height = (rect.height / p.height) * 100 + "%";
  }

  // Cambia el ritmo de una animacion poco a poco (el esternon que acelera o
  // frena). Una rampa nueva manda sobre la que estuviera en marcha.
  function rampRate(anim, from, to, dur, ease) {
    var id = (anim.rampId || 0) + 1;
    anim.rampId = id;
    return new Promise(function (resolve) {
      var t0 = 0;
      function step(now) {
        if (anim.rampId !== id) {
          resolve();
          return;
        }
        if (!t0) t0 = now;
        var k = Math.min(1, (now - t0) / Math.max(1, dur));
        anim.playbackRate = from + (to - from) * (ease ? ease(k) : k);
        if (k < 1) window.requestAnimationFrame(step);
        else resolve();
      }
      window.requestAnimationFrame(step);
    });
  }

  // --- 0. el esternon girando a oscuras ----------------------------------------
  // Negro del todo, sin simbolos (peticion del usuario): el giro solo se oye y
  // se nota en los latidos. fromSpin: viene del giro real de la tirada (que no
  // se para): se oscurece en un momento y sin el golpe de arranque.
  function startSternumSpin(reelLayer, fx, fromSpin) {
    var lane = laneRect();
    if (!lane || !reelLayer) return null;
    var wrap = div("el-juicio-sternum-spin");
    placeIn(wrap, reelLayer.getBoundingClientRect(), {
      left: lane.left - lane.width * DARK_BLEED.side,
      top: lane.top - lane.height * DARK_BLEED.top,
      width: lane.width * (1 + 2 * DARK_BLEED.side),
      height: lane.height * (1 + DARK_BLEED.top + DARK_BLEED.bottom)
    });
    // La tira solo lleva el ritmo del giro (frena, acelera): no se ve.
    var strip = div("el-juicio-sternum-spin__strip", wrap);
    var pulse = div("el-juicio-sternum-spin__pulse", wrap);
    var flash = div("el-juicio-sternum-spin__flash", wrap);
    reelLayer.appendChild(wrap);
    var spin = strip.animate([{ transform: "translateY(-50%)" }, { transform: "translateY(0%)" }], { duration: 560, iterations: Infinity });
    if (fromSpin) {
      spin.playbackRate = 3;
      rampRate(spin, 3, 1, 1500, function (k) { return 1 - (1 - k) * (1 - k); });
      wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-in", fill: "forwards" });
    } else {
      wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: "forwards" });
      fx.sound("el_juicio_spin_start");
    }
    var s = { wrap: wrap, spin: spin, pulse: pulse, flash: flash, beatTimer: 0, beatsOff: false, mute: false, flicker: null };
    startBeats(s, fx);
    startFlicker(s);
    return s;
  }

  // Latidos mientras gira a oscuras: el esternon se enciende en rojo por
  // dentro (pum-pum) y cada vez mas seguido. Con sonido solo hasta que
  // empieza el amago (que trae los suyos).
  function startBeats(s, fx) {
    var gap = 700;
    function beat() {
      if (s.beatsOff || !s.wrap.isConnected) return;
      if (!s.mute) fx.sound("el_juicio_dark_beat");
      s.pulse.animate([
        { opacity: 0 },
        { opacity: 0.9, offset: 0.12 },
        { opacity: 0.2, offset: 0.3 },
        { opacity: 0.65, offset: 0.42 },
        { opacity: 0 }
      ], { duration: Math.min(760, gap + 60), easing: "ease-out" });
      gap = Math.max(330, gap - 80);
      s.beatTimer = window.setTimeout(beat, gap);
    }
    s.beatTimer = window.setTimeout(beat, 140);
  }

  function stopBeats(s) {
    if (!s) return;
    s.beatsOff = true;
    window.clearTimeout(s.beatTimer);
    stopFlicker(s);
  }

  // Parpadeo (peticion del usuario, 2026-10-18): mientras gira a oscuras la
  // luz de la maquina falla a tirones (se va casi del todo un instante) y en
  // cada apagon el esternon se enciende en rojo por dentro (el rojo no sale
  // del rodillo: antes era un anillo alrededor que se salia); cada vez mas
  // seguido y mas a oscuras, con un respingo de la maquina en cada tiron.
  function startFlicker(s) {
    var overlay = document.getElementById("structureOverlay");
    var lr = laneRect();
    var or = overlay && overlay.getBoundingClientRect();
    if (!lr || !or || !or.width) return;
    var root = div("el-juicio-flicker", overlay);
    var dark = div("el-juicio-flicker__dark", root);
    var x = (((lr.left + lr.width / 2 - or.left) / or.width) * 100).toFixed(1);
    var y = (((lr.top + lr.height / 2 - or.top) / or.height) * 100).toFixed(1);
    var ew = (lr.width / or.width) * 100, eh = (lr.height / or.height) * 100;
    // El apagon deja ver el esternon (su rojo de dentro).
    dark.style.background = "radial-gradient(ellipse " + ew.toFixed(1) + "% " + (eh * 0.8).toFixed(1) + "% at " + x + "% " + y + "%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.05) 40%, rgba(0, 0, 0, 0.92) 100%)";
    var f = { root: root, timer: 0, t0: window.performance.now() };
    s.flicker = f;
    function burst() {
      if (!root.isConnected || s.beatsOff) return;
      var heat = Math.min(1, (window.performance.now() - f.t0) / 2200);
      // 2-5 apagones de 30-80 ms con luz entre medias.
      var n = 2 + Math.floor(Math.random() * (2 + 2 * heat));
      var segs = [];
      for (var i = 0; i < n; i++) {
        segs.push({ on: true, ms: rand(30, 80) });
        segs.push({ on: false, ms: rand(25, 70) });
      }
      var total = segs.reduce(function (a, g) { return a + g.ms; }, 0);
      var t = 0;
      var dk = [], ik = [];
      segs.forEach(function (g) {
        var off = t / total;
        var depth = g.on ? rand(0.6, 0.9) * (0.75 + 0.25 * heat) : 0;
        var glow = g.on ? rand(0.65, 1) : 0;
        dk.push({ opacity: depth, offset: off, easing: "step-end" });
        ik.push({ opacity: glow, offset: off, easing: "step-end" });
        t += g.ms;
      });
      [dk, ik].forEach(function (k) { k.push({ opacity: 0, offset: 1 }); });
      dark.animate(dk, { duration: total });
      if (s.flash.isConnected) s.flash.animate(ik, { duration: total });
      jolt(0.6 + 0.8 * heat);
      f.timer = window.setTimeout(burst, total + rand(380, 720) * (1 - 0.65 * heat));
    }
    f.timer = window.setTimeout(burst, 110);
  }

  function stopFlicker(s) {
    var f = s && s.flicker;
    if (!f) return;
    s.flicker = null;
    window.clearTimeout(f.timer);
    f.root.getAnimations({ subtree: true }).forEach(function (a) { a.cancel(); });
    f.root.remove();
  }

  // Respingo de la maquina (un tiron seco, encima del temblor).
  function jolt(px) {
    var dx = rand(-1, 1) * px * 2, dy = rand(0.4, 1) * px * 2.4;
    ["sceneLayers", "reelLayer", "structureOverlay"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || typeof el.animate !== "function") return;
      var k = id === "sceneLayers" ? 0.5 : 1;
      el.animate([
        { translate: "0 0" },
        { translate: (dx * k).toFixed(1) + "px " + (dy * k).toFixed(1) + "px", offset: 0.25 },
        { translate: "0 0" }
      ], { duration: 150, easing: "ease-out", composite: "add" });
    });
  }

  // Tiembla toda la maquina (fondo a media fuerza, rodillos y marco igual,
  // para que no se descuadren): level 0 la para.
  var trembleAnims = [];
  function tremble(level) {
    trembleAnims.forEach(function (a) { a.cancel(); });
    trembleAnims = [];
    if (!level) return;
    var frames = [];
    for (var k = 0; k < 14; k++) {
      frames.push([rand(-1, 1) * 2.4 * level, rand(-1, 1) * 1.8 * level]);
    }
    frames.push(frames[0]);
    ["sceneLayers", "reelLayer", "structureOverlay"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || typeof el.animate !== "function") return;
      var k = id === "sceneLayers" ? 0.5 : 1;
      trembleAnims.push(el.animate(frames.map(function (p) {
        return { translate: (p[0] * k).toFixed(1) + "px " + (p[1] * k).toFixed(1) + "px" };
      }), { duration: 460, iterations: Infinity, composite: "add" }));
    });
  }

  // Desde la tirada que completa la cadena (game.js#syncElJuicioDarkSternum,
  // en cuanto para el BONUS de rib3): el esternon no se para y se queda negro,
  // la maquina se apaga alrededor, tiembla y retumba, con latidos. play() (el
  // encapuchado) o intrigue() (sin el) lo recogen; endDark() lo frena.
  var pendingDark = null;
  var pendingTimer = 0;

  function plainFx() {
    return {
      sound: function (eventName, payload) {
        if (window.OssuaryAudio) window.OssuaryAudio.trigger(eventName, payload || {});
      },
      animate: function (el, frames, options) {
        var a = el.animate(frames, options);
        return new Promise(function (resolve) { a.onfinish = resolve; a.oncancel = resolve; });
      }
    };
  }

  function beginDark() {
    if (pendingDark) return true;
    var s = startSternumSpin(document.getElementById("reelLayer"), plainFx(), true);
    if (!s) return false;
    pendingDark = s;
    plainFx().sound("el_juicio_dark");
    spotlight(document.getElementById("structureOverlay"), true);
    tremble(1);
    // Por si nadie lo recoge (no deberia pasar).
    pendingTimer = window.setTimeout(endDark, 15000);
    return true;
  }

  function takeDark() {
    var s = pendingDark;
    pendingDark = null;
    window.clearTimeout(pendingTimer);
    return s;
  }

  // Sin amago: sigue un momento a oscuras y frena.
  function endDark() {
    var s = takeDark();
    if (!s) return;
    var fx = plainFx();
    window.setTimeout(function () { letDown(s, fx); }, 650);
  }

  // "Ah... nada": se acaba el temblor de golpe, se va la oscuridad y el
  // esternon frena; debajo vuelve el del juego (bonus normal).
  function letDown(s, fx) {
    tremble(0);
    fx.sound("el_juicio_tease_miss");
    spotlight(document.getElementById("structureOverlay"), false);
    return stopSternumSpin(s, fx);
  }

  // Sin encapuchado (no amaga): la intriga a oscuras, temblando cada vez mas,
  // y nada. Se cumple con false cuando ya ha frenado.
  function intrigue(ms) {
    var s = takeDark();
    if (!s) return Promise.resolve(false);
    var fx = plainFx();
    tremble(1.3);
    return new Promise(function (resolve) {
      window.setTimeout(function () { tremble(1.8); }, ms * 0.55);
      window.setTimeout(function () {
        // El bonus normal sigue enseguida; el esternon acaba de frenar solo.
        letDown(s, fx);
        window.setTimeout(function () { resolve(false); }, 380);
      }, ms);
    });
  }

  // Sin Super: para en seco (peticion del usuario, 2026-10-18; antes frenaba
  // y el negro se fundia con los simbolos ya puestos). El negro se va de
  // golpe y los simbolos del esternon del juego (ya parados debajo) caen
  // desde arriba a toda velocidad, borrosos, y se clavan: rebote corto, golpe
  // seco y respingo de la maquina. Si el de debajo aun no ha parado, solo se
  // quita el negro (acaba de parar solo, como siempre).
  var STERNUM_DROP = { fall: 150, total: 250 };
  function stopSternumSpin(s, fx) {
    if (!s) return Promise.resolve();
    stopBeats(s);
    s.spin.cancel();
    s.wrap.remove();
    fx.sound("el_juicio_spin_end");
    var cell = document.querySelector('.symbol-cell[data-reel="sternum"]');
    var track = document.querySelector('.continuous-symbol-track[data-reel="sternum"]');
    if (!cell || cell.classList.contains("is-spinning") || !track || !track.offsetHeight) {
      fx.sound("el_juicio_cepo_stop");
      return Promise.resolve();
    }
    var drop = track.offsetHeight * 0.9;
    var hit = STERNUM_DROP.fall / STERNUM_DROP.total;
    var keys = [
      { translate: "0 " + (-drop).toFixed(1) + "px", easing: "cubic-bezier(.5,0,1,.7)" },
      { translate: "0 0", offset: hit, easing: "ease-out" },
      { translate: "0 " + (drop * 0.04).toFixed(1) + "px", offset: hit + (1 - hit) * 0.3, easing: "ease-in-out" },
      { translate: "0 " + (-drop * 0.012).toFixed(1) + "px", offset: hit + (1 - hit) * 0.65 },
      { translate: "0 0" }
    ];
    var moving = Array.prototype.slice.call(track.children);
    Array.prototype.forEach.call(document.querySelectorAll('.giant-strip-track[data-reel="sternum"] .giant-strip-symbol'), function (el) {
      if (!el.hidden) moving.push(el);
    });
    var anims = moving.map(function (el) { return el.animate(keys, { duration: STERNUM_DROP.total }); });
    // Borrosos mientras caen (desenfoque vertical); nitidos de golpe al parar.
    track.style.filter = "url(#" + verticalBlur() + ")";
    // El golpe, en el fotograma en que llegan (con el reloj de la animacion:
    // el primer fotograma puede tardar y un temporizador se adelantaba).
    return new Promise(function (resolve) {
      var lead = anims[0];
      var done = false;
      function hit() {
        if (done) return;
        done = true;
        track.style.filter = "";
        fx.sound("el_juicio_sternum_slam");
        jolt(2.4);
        var lr = laneRect();
        if (lr && fx.emit) {
          for (var i = 0; i < 10; i++) {
            fx.emit("ember", lr.left + lr.width * rand(0.1, 0.9), lr.bottom - 4, {
              vx: rand(-60, 60), vy: rand(-140, -40), gravity: 700, drag: 0.98, size: rand(0.8, 1.5), life: rand(0.4, 0.7), color: "150,132,112"
            });
          }
        }
        resolve();
      }
      function watch() {
        if (done) return;
        if (!lead || lead.playState !== "running" || (Number(lead.currentTime) || 0) >= STERNUM_DROP.fall - 4) hit();
        else window.requestAnimationFrame(watch);
      }
      window.requestAnimationFrame(watch);
      // Por si la pagina no pinta (pestana oculta).
      window.setTimeout(hit, STERNUM_DROP.total + 400);
    });
  }

  // Filtro SVG de desenfoque solo vertical (una vez por pagina).
  var VBLUR_ID = "elJuicioVerticalBlur";
  function verticalBlur() {
    if (!document.getElementById(VBLUR_ID)) {
      var NS = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(NS, "svg");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      var filter = document.createElementNS(NS, "filter");
      filter.setAttribute("id", VBLUR_ID);
      filter.setAttribute("x", "0");
      filter.setAttribute("y", "-10%");
      filter.setAttribute("width", "100%");
      filter.setAttribute("height", "120%");
      var blur = document.createElementNS(NS, "feGaussianBlur");
      blur.setAttribute("stdDeviation", "0 10");
      filter.appendChild(blur);
      svg.appendChild(filter);
      document.body.appendChild(svg);
    }
    return VBLUR_ID;
  }

  // Rayas de velocidad dentro del esternon mientras cae la Muerte.
  function streaks(s, fx) {
    if (!s) return;
    for (var i = 0; i < 7; i++) {
      var st = div("el-juicio-sternum-spin__streak", s.wrap);
      st.style.left = (8 + i * 13 + rand(-4, 4)).toFixed(1) + "%";
      st.style.opacity = rand(0.35, 0.8).toFixed(2);
      fx.animate(st, [{ transform: "translateY(-110%)" }, { transform: "translateY(260%)" }], { duration: rand(130, 190), delay: rand(0, 60), iterations: 3 });
    }
  }

  // --- penumbra con el foco en el esternon -----------------------------------
  function spotlight(overlay, on) {
    var el = overlay && overlay.querySelector(".el-juicio-fall-dark");
    if (on && el) {
      window.clearTimeout(el.removeTimer);
      el.classList.add("is-on");
      return;
    }
    if (on && overlay && !el) {
      var lr = laneRect();
      var or = overlay.getBoundingClientRect();
      if (!lr || !or.width) return;
      var x = ((lr.left + lr.width / 2 - or.left) / or.width) * 100;
      var y = ((lr.top + lr.height * 0.55 - or.top) / or.height) * 100;
      el = div("el-juicio-fall-dark", overlay);
      el.style.background = "radial-gradient(ellipse " + ((lr.width / or.width) * 95).toFixed(1) + "% " + ((lr.height / or.height) * 80).toFixed(1) + "% at " + x.toFixed(1) + "% " + y.toFixed(1) + "%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.45) 62%, rgba(0, 0, 0, 0.78) 100%)";
      void el.offsetWidth;
      el.classList.add("is-on");
      var dread = overlay.querySelector(".el-juicio-dread");
      if (dread) dread.classList.remove("is-on");
    } else if (!on && el) {
      el.classList.remove("is-on");
      window.clearTimeout(el.removeTimer);
      el.removeTimer = window.setTimeout(function () { el.remove(); }, 700);
    }
  }

  // Penumbra del amago con el foco en el encapuchado (la de el-juicio.js lo
  // dejaba a medio oscurecer: ahora va detras del marco).
  function hoodDim(overlay, h, on) {
    var el = overlay && overlay.querySelector(".el-juicio-hood-dim");
    if (on && overlay && !el) {
      var or = overlay.getBoundingClientRect();
      if (!or.width) return;
      var x = ((h.layer.left + h.layer.width / 2 - or.left) / or.width) * 100;
      var y = ((beamY(h) - or.top) / or.height) * 100;
      el = div("el-juicio-hood-dim", overlay);
      el.style.background = "radial-gradient(ellipse " + ((h.layer.width / or.width) * 140).toFixed(1) + "% " + ((h.layer.height / or.height) * 150).toFixed(1) + "% at " + x.toFixed(1) + "% " + y.toFixed(1) + "%, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.5) 75%, rgba(0, 0, 0, 0.72) 100%)";
      void el.offsetWidth;
      el.classList.add("is-on");
    } else if (!on && el) {
      el.classList.remove("is-on");
      window.setTimeout(function () { el.remove(); }, 600);
    }
  }

  // Fogonazo en toda la pantalla: blanco al rojo, otro mas flojo y uno lejano.
  function thunder() {
    var el = div("el-juicio-thunder", document.body);
    window.setTimeout(function () { el.remove(); }, 1300);
  }

  // --- el encapuchado en dos capas y su aura ----------------------------------
  function buildHood(o) {
    var f = frameContentRect();
    var ov = o.overlay;
    if (!f || !ov) return null;
    var p = ov.getBoundingClientRect();
    if (!p.width) return null;
    var layer = frameBox(f, LAYER.x0, LAYER.y0, LAYER.w, LAYER.h);

    // Aura: detras de todo y solo por encima de la viga. Apaga el cielo, una
    // silueta negra difuminada respira hacia arriba (llama oscura) y suben
    // volutas negras desde la capucha y los hombros.
    var aura = div("el-juicio-hood-aura", ov);
    var auraBox = frameBox(f, LAYER.x0 - 200, LAYER.y0 - 160, LAYER.w + 400, BEAM.top + 6 - (LAYER.y0 - 160));
    placeIn(aura, p, auraBox);
    div("el-juicio-hood-aura__shade", aura);
    var ghost = img(BODY_SRC, "el-juicio-hood-aura__ghost", aura);
    placeIn(ghost, auraBox, layer);
    ghost.style.transformOrigin = "50% " + (PIVOT_Y * 100).toFixed(2) + "%";
    var wisps = [];
    for (var i = 0; i < 10; i++) {
      var w = div("el-juicio-hood-aura__wisp", aura);
      w.style.left = (33 + (i % 5) * 8.5 + rand(-3, 3)).toFixed(1) + "%";
      w.style.top = (i % 2 ? rand(60, 72) : rand(70, 82)).toFixed(1) + "%";
      wisps.push(w);
    }

    // Cuerpo: detras del marco, en una ventana que acaba en la viga (por
    // debajo de la viga el marco es transparente: ahi esta el rodillo).
    var maskBox = frameBox(f, LAYER.x0 - 120, LAYER.y0 - 100, LAYER.w + 240, BEAM.bottom - (LAYER.y0 - 100));
    var mask = div("el-juicio-hood-mask", ov);
    placeIn(mask, p, maskBox);
    var body = img(BODY_SRC, "el-juicio-hood-body", mask);
    placeIn(body, maskBox, layer);
    body.style.transformOrigin = "50% " + (PIVOT_Y * 100).toFixed(2) + "%";

    // Manos: delante de la viga, cada una por su lado, y debajo de la capa de
    // luz del marco (src/scene/scene-manager.js, justo detras del marco en
    // el DOM) para que les de la misma luz que al marco.
    var handsWrap = div("el-juicio-hood-hands");
    var light = ov.querySelector(".frame-depth--light");
    if (light && light.parentNode === ov) ov.insertBefore(handsWrap, light);
    else ov.appendChild(handsWrap);
    placeIn(handsWrap, p, layer);

    // La viga original bajo el encapuchado (la del marco sin el es un tramo
    // repetido, mas claro), desde el corte de la figura (con el borde del
    // manto y las sombras de las manos que tenia encima): delante del cuerpo
    // y detras de las manos, hasta que se lo llevan. Misma imagen que el
    // marco (ya cargada).
    var fi = frameImg();
    var beam = img(fi && fi.currentSrc ? fi.currentSrc : "assets/structure/ribcage_overlay_top.png", "el-juicio-hood-beam");
    ov.insertBefore(beam, handsWrap);
    placeIn(beam, p, f);
    beam.style.clipPath = "inset(" + [BEAM.cut, FRAME_PX - (LAYER.x0 + LAYER.w), FRAME_PX - BEAM.bottom, LAYER.x0].map(function (v) {
      return ((v / FRAME_PX) * 100).toFixed(3) + "%";
    }).join(" ") + ")";
    var hands = HAND_X.map(function (hx, k) {
      var h = img(HANDS_SRC, "el-juicio-hood-hand el-juicio-hood-hand--" + (k ? "r" : "l"), handsWrap);
      h.style.transformOrigin = (hx * 100).toFixed(2) + "% " + (PIVOT_Y * 100).toFixed(2) + "%";
      return h;
    });

    // Cada voluta sube, se abre hacia su lado y se deshace.
    wisps.forEach(function (w, k) {
      var dir = k % 2 ? 1 : -1;
      var dur = rand(1500, 2100);
      w.animate([
        { transform: "translate(-50%, -50%) scale(0.45, 0.6)", opacity: 0 },
        { transform: "translate(" + (-50 + dir * 12).toFixed(0) + "%, -110%) scale(0.85, 1.1)", opacity: 0.95, offset: 0.3 },
        { transform: "translate(" + (-50 + dir * 40).toFixed(0) + "%, -260%) scale(1.5, 1.8)", opacity: 0 }
      ], { duration: dur, delay: -dur * (k / wisps.length), iterations: Infinity, easing: "ease-out" });
    });

    return { f: f, layer: layer, aura: aura, mask: mask, body: body, beam: beam, handsWrap: handsWrap, hands: hands };
  }

  function removeHood(h) {
    if (!h) return;
    lit(false);
    [h.aura, h.mask, h.beam, h.handsWrap].forEach(function (el) { el.remove(); });
  }

  // Mientras el encapuchado esta en su sitio, la luz del marco cae sobre el
  // con la silueta del marco original (con el marco sin el, se veria mas
  // apagado que antes del cambio).
  function lit(on) {
    var stage = document.getElementById("slotStage");
    if (stage) stage.classList.toggle("el-juicio-hood-lit", Boolean(on));
  }

  function beamY(h) {
    return frameBox(h.f, 0, BEAM.top, 0, 0).top;
  }

  function handPoint(h, k) {
    return { x: h.layer.left + h.layer.width * HAND_X[k], y: beamY(h) };
  }

  // --- 1. el amago: se balancea sobre la viga ----------------------------------
  // Sube unos pixeles (sale de detras de la madera, sin hueco) y baja, girando
  // desde la viga; las manos aprietan en cada tiron. [offset, subida %, giro].
  var WOBBLE = [
    [0, 0, 0], [0.1, -3, -2], [0.22, 0.6, 1.2], [0.38, -4.5, 2.2], [0.52, 0.6, -1.5], [0.68, -3, -0.8], [0.84, 0.4, 0.8], [1, 0, 0]
  ];
  // Cuando vuelve a apoyarse (polvo de la viga).
  var WOBBLE_LANDS = [0.22, 0.52, 0.84];
  // Rapido y violento (la cadena y las entradas directas, quick): tirones mas
  // fuertes y cada vuelta a la viga es un golpe que sacude la maquina.
  var WOBBLE_VIOLENT = [
    [0, 0, 0], [0.07, -4.5, -3.2], [0.15, 1, 2.4], [0.26, -6, 3.8], [0.36, 1, -3.2], [0.48, -5, -1.8], [0.58, 1, 3], [0.7, -6.5, -3.6], [0.82, 1, 1.8], [1, 0, 0]
  ];
  var WOBBLE_VIOLENT_LANDS = [0.15, 0.36, 0.58, 0.82];

  function wobble(h, fx, dur, violent) {
    var g = fx.gfx();
    var keys = violent ? WOBBLE_VIOLENT : WOBBLE;
    var lands = violent ? WOBBLE_VIOLENT_LANDS : WOBBLE_LANDS;
    fx.animate(h.body, keys.map(function (k) {
      return { transform: "translateY(" + k[1] + "%) rotate(" + k[2] + "deg)", offset: k[0] };
    }), { duration: dur, easing: "ease-in-out", fill: "forwards" });
    h.hands.forEach(function (hand, i) {
      // Aprieta la mano del lado hacia el que se inclina.
      fx.animate(hand, keys.map(function (k) {
        var load = Math.max(0, (i ? 1 : -1) * k[2]) / 2.2;
        return { transform: "translateY(" + (k[1] < 0 ? -0.4 : 0) + "%) scaleY(" + (1 - 0.06 * load).toFixed(3) + ")", offset: k[0] };
      }), { duration: dur, easing: "ease-in-out", fill: "forwards" });
    });
    lands.forEach(function (t, n) {
      fx.wait(dur * t).then(function () {
        if (!g || !h.body.isConnected) return;
        var pt = handPoint(h, n % 2);
        g.dust(pt.x, pt.y, { count: violent ? 3 : 2, width: h.layer.width * 0.18 });
        g.dust(h.layer.left + h.layer.width / 2, beamY(h), { count: 1, width: h.layer.width * 0.4 });
        if (violent) {
          g.shakeMachine(0.22 + 0.06 * n);
          fx.sound("el_juicio_hood_thud", { step: n });
        }
      });
    });
    // Volutas negras delante tambien (lienzo de particulas, encima).
    var wisps = window.setInterval(function () {
      if (!h.body.isConnected) return;
      fx.emit("smoke", h.layer.left + h.layer.width * rand(0.3, 0.7), beamY(h) - h.layer.height * rand(0.05, 0.3), {
        vx: rand(-14, 14), vy: rand(-38, -20), drag: 0.99, size: h.layer.width * rand(0.07, 0.12), life: rand(1.1, 1.6), sway: 12, color: "6,4,8"
      });
    }, 150);
    return fx.wait(dur).then(function () { window.clearInterval(wisps); });
  }

  // --- 2a. amago sin caida: se rinde ---------------------------------------------
  // Se deja caer sobre la viga (se hunde un poco y vuelve a su sitio), el humo
  // se apaga de golpe: "ah... nada".
  function settle(h, fx) {
    fx.animate(h.aura, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease-in", fill: "forwards" });
    h.hands.forEach(function (hand) {
      fx.animate(hand, [{ transform: "translateY(0%) scaleY(1)" }], { duration: 200, fill: "forwards" });
    });
    return fx.animate(h.body, [
      { transform: "translateY(0%) rotate(0deg)" },
      { transform: "translateY(3%) rotate(0deg) scale(1, 0.98)", offset: 0.3 },
      { transform: "translateY(0%) rotate(0deg) scale(1, 1)" }
    ], { duration: 460, easing: "ease-out", fill: "forwards" });
  }

  // --- 2b. se alza temblando y algo tira de el -----------------------------------
  function anticipate(h, fx, dur) {
    fx.sound("el_juicio_hood_grip");
    fx.animate(h.aura, [{ transform: "scale(1)", filter: "brightness(1)" }, { transform: "scale(0.88)", filter: "brightness(0.6)" }], { duration: dur, easing: "ease-in", fill: "forwards" });
    h.hands.forEach(function (hand) {
      fx.animate(hand, [
        { transform: "translateY(0%) scaleY(1)" },
        { transform: "translateY(-0.6%) scaleY(0.9)", offset: 0.3 },
        { transform: "translateY(-0.4%) scaleY(0.88)" }
      ], { duration: dur, easing: "ease-out", fill: "forwards" });
    });
    var frames = [];
    var n = 14;
    for (var i = 0; i <= n; i++) {
      var k = i / n;
      var side = i % 2 ? 1 : -1;
      var end = i === n;
      frames.push({
        transform: "translate(" + (end ? 0 : side * (0.4 + 0.9 * k)).toFixed(2) + "%, " + (-6 * Math.sin((k * Math.PI) / 2)).toFixed(2) + "%) rotate(" + (end ? 0 : -side * 0.9 * k).toFixed(2) + "deg)"
      });
    }
    return fx.animate(h.body, frames, { duration: dur, easing: "linear", fill: "forwards" });
  }

  async function yank(h, fx, dur) {
    var g = fx.gfx();
    dur = dur || 250;
    var by = beamY(h);
    lit(false);
    h.beam.remove();
    fx.sound("el_juicio_hood_release");
    fx.sound("el_juicio_hood_scrape");
    fx.sound("el_juicio_death_rumble");
    if (g) {
      g.shakeMachine(0.45);
      // Las unas rascan el borde de la viga.
      [0, 1].forEach(function (k) {
        var pt = handPoint(h, k);
        g.sparks(pt.x, pt.y, { count: 12, dir: -Math.PI / 2, spread: Math.PI * 0.7, speed: 300, width: h.layer.width * 0.2 });
      });
    }
    // Las manos resbalan por el borde (se pliegan hacia la arista).
    h.hands.forEach(function (hand) {
      fx.animate(hand, [
        { transform: "translateY(-0.4%) scaleY(0.88)", opacity: 1 },
        { transform: "translateY(-1.4%) scaleY(0.45)", opacity: 1, offset: 0.45 },
        { transform: "translateY(0%) scaleY(0.03)", opacity: 0 }
      ], { duration: dur * 0.85, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" });
    });
    // El aura se va con el, tragada hacia la viga.
    h.aura.style.transformOrigin = "50% 100%";
    fx.animate(h.aura, [
      { transform: "scale(0.88)", opacity: 1 },
      { transform: "scale(0.5, 0.12)", opacity: 0 }
    ], { duration: dur + 140, easing: "cubic-bezier(.5,0,.9,.5)", fill: "forwards" });
    // Polvo y humo negro cuando pasa por la viga.
    fx.wait(dur * 0.4).then(function () {
      var cx = h.layer.left + h.layer.width / 2;
      if (g) g.dust(cx, by, { count: 4, width: h.layer.width * 0.7 });
      for (var i = 0; i < 14; i++) {
        fx.emit("smoke", cx + h.layer.width * rand(-0.35, 0.35), by - 4, {
          vx: rand(-40, 40), vy: rand(-95, -45), drag: 0.96, size: h.layer.width * rand(0.1, 0.17), life: rand(0.9, 1.4), color: "8,6,8"
        });
      }
    });
    // De un tiron, detras de la viga (se estira con la velocidad).
    await fx.animate(h.body, [
      { transform: "translate(0%, -6%) scale(1, 1)" },
      { transform: "translate(0%, -8%) scale(1.01, 0.99)", offset: 0.12 },
      { transform: "translate(0%, 72%) scale(0.94, 1.08)" }
    ], { duration: dur, easing: "cubic-bezier(.55,0,.85,.4)", fill: "forwards" });
    fx.sound("el_juicio_hood_behind");
    if (g) g.shakeMachine(0.25);
    removeHood(h);
  }

  // --- 2b. detras: el esternon acelera y llama ---------------------------------
  // Justo antes de que caiga se apaga todo menos el esternon, y sigue asi
  // mientras ella se queda ahi y cuando cae el cartel (peticion del usuario,
  // 2026-10-18: "oscurecer bastante todo lo demas"; el fogonazo del golpe lo
  // enciende un instante). Capa fija sobre toda la pantalla (tambien el
  // marcador y los botones), debajo del cartel, con un hueco alrededor del
  // esternon que sube algo por encima (por ahi sale su humo). Se va sola
  // cuando se quita la Muerte caida (al empezar el Super: keepDark).
  var blackoutEl = null;
  function blackout(on, dur) {
    // Lo de capas mas altas (cuchilla pequena, particulas): el-juicio-fall.css.
    var root = document.documentElement;
    if (!on) {
      root.classList.remove("el-juicio-is-dark");
      if (blackoutEl) {
        var el = blackoutEl;
        if (el.watch) el.watch.disconnect();
        if (dur) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, fill: "forwards" }).onfinish = function () { el.remove(); };
        else el.remove();
      }
      blackoutEl = null;
      return;
    }
    var lr = laneRect();
    if (!lr) return;
    blackout(false);
    // En #gameRoot, como la entrada con PLAY (debajo de ella; en body la
    // tapaba): asi tambien oscurece el marcador y los botones.
    blackoutEl = div("el-juicio-blackout", document.getElementById("gameRoot") || document.body);
    var x = (lr.left + lr.width / 2).toFixed(0), y = (lr.top + lr.height * 0.36).toFixed(0);
    blackoutEl.style.background = "radial-gradient(" + (lr.width * 1.05).toFixed(0) + "px " + (lr.height * 0.95).toFixed(0) + "px at " + x + "px " + y + "px, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.12) 42%, rgba(0, 0, 0, 0.72) 78%, rgba(0, 0, 0, 0.93) 100%)";
    blackoutEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: "ease-in", fill: "forwards" });
    root.classList.add("el-juicio-is-dark");
  }

  // La oscuridad se queda hasta que se quita la Muerte caida (holder).
  function keepDark(holder) {
    var el = blackoutEl;
    var parent = holder && holder.parentNode;
    if (!el || !parent || typeof window.MutationObserver !== "function") return;
    el.watch = new window.MutationObserver(function () {
      if (holder.isConnected) return;
      if (blackoutEl === el) blackout(false, 320);
      else el.watch.disconnect();
    });
    el.watch.observe(parent, { childList: true });
  }

  async function behind(spin, fx, dur) {
    var lane = laneEl();
    if (lane) lane.classList.add("el-juicio-sternum-call");
    blackout(true, dur * 0.8);
    if (spin) {
      rampRate(spin.spin, spin.spin.playbackRate, 2.8, dur, function (k) { return k * k; });
      // El borde se pone al rojo vivo, temblando.
      spin.flash.animate([{ opacity: 0.2 }, { opacity: 0.7 }, { opacity: 0.45 }, { opacity: 1 }, { opacity: 0.8 }, { opacity: 1 }], { duration: dur, fill: "forwards" });
    }
    // Arenilla que cae por dentro: algo pesado viene.
    var lr = laneRect();
    if (lr) {
      for (var i = 0; i < 12; i++) {
        fx.emit("ember", lr.left + lr.width * rand(0.15, 0.85), lr.top + rand(0, 10), {
          vx: rand(-10, 10), vy: rand(30, 90), gravity: 900, drag: 0.99, size: rand(0.7, 1.2), life: rand(0.4, 0.7), color: "150,132,112"
        });
      }
    }
    await fx.wait(dur);
  }

  // --- 2b. sale entera por el esternon ----------------------------------------
  async function dropDeath(o, spin, fx, hold) {
    var holder = div("el-juicio-landing");
    o.reelLayer.appendChild(holder);
    var parts = o.buildDeath ? o.buildDeath(holder) : null;
    var body = parts && (parts.figure || parts.head);
    var lane = laneEl();
    if (!parts || !parts.death || !body) {
      holder.remove();
      blackout(false);
      if (spin) spin.wrap.remove();
      if (lane) lane.classList.remove("el-juicio-sternum-call");
      return null;
    }
    var death = parts.death;
    // Mientras cae se ve el esternon girando detras (sin el fondo del tablero).
    death.classList.add("is-dropping");
    body.style.animation = "none";
    body.style.transform = "translateY(-150%)";

    // De golpe (peticion del usuario, 2026-10-18): cae como una piedra, sin
    // frenar, y se estira con la velocidad.
    var dropFrames = [
      { transform: "translateY(-150%) scale(0.86, 1.32)" },
      { transform: "translateY(0%) scale(0.95, 1.16)" }
    ];
    var dropOpts = { duration: o.quick ? 140 : 180, easing: "cubic-bezier(.6,0,1,1)", fill: "forwards" };
    fx.sound("el_juicio_death_drop");
    streaks(spin, fx);
    // Estela: copias rojas que caen detras de ella y se funden con ella en
    // el golpe (si se quedaran, se verian mas altas que la figura aplastada).
    var ghosts = !parts.figure ? [] : [0.55, 0.32, 0.16].map(function (alpha, i) {
      var ghost = body.cloneNode(true);
      ghost.classList.add("is-ghost");
      ghost.style.opacity = String(alpha);
      death.insertBefore(ghost, body);
      fx.animate(ghost, dropFrames, Object.assign({}, dropOpts, { delay: 22 * (i + 1) }));
      return ghost;
    });
    // El golpe va con el reloj y no con el final de la animacion (ese aviso
    // llega un fotograma o dos tarde).
    fx.animate(body, dropFrames, dropOpts);
    await fx.wait(dropOpts.duration - 12);

    // Estruendo: el rodillo se para con ella y el golpe se congela un
    // instante, aplastada.
    if (spin) spin.wrap.remove();
    if (lane) lane.classList.remove("el-juicio-sternum-call");
    fx.sound("el_juicio_spin_end");
    death.classList.remove("is-dropping");
    body.getAnimations().forEach(function (a) { a.cancel(); });
    body.style.transform = "translateY(0%) scale(1.2, 0.74)";
    ghosts.forEach(function (g) { g.remove(); });
    impact(death, o, fx);
    // El golpe se congela un instante, aplastada.
    await fx.wait(140);
    var settled = fx.animate(body, [
      { transform: "translateY(0%) scale(1.2, 0.74)" },
      { transform: "translateY(0%) scale(0.93, 1.09)", offset: 0.3 },
      { transform: "translateY(0%) scale(1.03, 0.97)", offset: 0.62 },
      { transform: "translateY(0%) scale(1, 1)" }
    ], { duration: 480, easing: "ease-out", fill: "forwards" }).then(function () {
      body.getAnimations().forEach(function (a) { a.cancel(); });
      body.style.transform = "";
      body.style.animation = "";
    });

    // Se queda ahi un rato (peticion del usuario, 2026-10-18): ardiendo, con
    // la columna de humo negro subiendo por encima de todo (impact ->
    // plume), la maquina aun retumbando y la camara acercandose despacio.
    // Luego, SUPER BONUS!
    var embers = window.setInterval(function () {
      var lr = laneRect();
      if (!lr) return;
      fx.emit("ember", lr.left + lr.width * rand(0.2, 0.8), lr.top + lr.height * 0.95, {
        vx: rand(-18, 18), vy: rand(-130, -60), drag: 0.99, size: rand(1.4, 2.8), life: rand(1.4, 2.4), sway: 18
      });
    }, 60);
    window.setTimeout(function () { window.clearInterval(embers); }, 2600);
    await settled;
    await fx.wait(hold == null ? 1100 : hold);
    return holder;
  }

  // La camara se acerca despacio a la Muerte mientras se queda ahi (encima
  // del tiron del golpe: composite add). release() la devuelve a su sitio.
  var camAnims = [];
  function pushIn(px, py, k, dur) {
    releaseCam(0);
    ["sceneLayers", "reelLayer", "structureOverlay"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !el.offsetWidth || typeof el.animate !== "function") return;
      var r = el.getBoundingClientRect();
      var s = r.width / el.offsetWidth || 1;
      var o = window.getComputedStyle(el).transformOrigin.split(" ").map(parseFloat);
      var ax = (px - r.left) / s - (o[0] || 0), ay = (py - r.top) / s - (o[1] || 0);
      function z(v) {
        return "translate(" + ax.toFixed(1) + "px, " + ay.toFixed(1) + "px) scale(" + v + ") translate(" + (-ax).toFixed(1) + "px, " + (-ay).toFixed(1) + "px)";
      }
      camAnims.push(el.animate([{ transform: z(1) }, { transform: z(k) }], { duration: dur, easing: "cubic-bezier(.3,.5,.4,1)", fill: "forwards", composite: "add" }));
    });
  }

  function releaseCam(ms) {
    var list = camAnims;
    camAnims = [];
    list.forEach(function (a) {
      if (!ms) {
        a.cancel();
        return;
      }
      var t = Number(a.currentTime) || 0;
      a.playbackRate = -Math.max(1, t) / ms;
      a.onfinish = function () { a.cancel(); };
      a.play();
    });
  }

  // --- el impacto ------------------------------------------------------------------
  // La camara da un tiron hacia el golpe (las tres capas de la maquina usan
  // scale/translate sueltos; esto va en transform, que se aplica encima).
  function punch(px, py, fx) {
    ["sceneLayers", "reelLayer", "structureOverlay"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !el.offsetWidth) return;
      var r = el.getBoundingClientRect();
      var s = r.width / el.offsetWidth || 1;
      var o = window.getComputedStyle(el).transformOrigin.split(" ").map(parseFloat);
      var ax = (px - r.left) / s - (o[0] || 0), ay = (py - r.top) / s - (o[1] || 0);
      function z(k) {
        return "translate(" + ax.toFixed(1) + "px, " + ay.toFixed(1) + "px) scale(" + k + ") translate(" + (-ax).toFixed(1) + "px, " + (-ay).toFixed(1) + "px)";
      }
      fx.animate(el, [
        { transform: z(1) },
        { transform: z(1.075), offset: 0.1 },
        { transform: z(0.985), offset: 0.45 },
        { transform: z(1.006), offset: 0.72 },
        { transform: z(1) }
      ], { duration: 720, easing: "cubic-bezier(.2,.7,.3,1)" });
    });
  }

  // Los rodillos de alrededor se encogen con el golpe (antes los de cerca).
  function flinchReels(px, py, fx) {
    Array.prototype.forEach.call(document.querySelectorAll(".reel-lane"), function (lane) {
      if (lane.dataset.reel === "sternum") return;
      var r = lane.getBoundingClientRect();
      if (!r.width) return;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var dist = Math.hypot(cx - px, cy - py);
      var push = Math.max(2, 10 - dist * 0.014);
      var dir = cx < px ? -1 : 1;
      fx.animate(lane, [
        { translate: "0 0" },
        { translate: (dir * push * 0.5).toFixed(1) + "px " + push.toFixed(1) + "px", offset: 0.16 },
        { translate: (-dir * push * 0.2).toFixed(1) + "px " + (-push * 0.4).toFixed(1) + "px", offset: 0.48 },
        { translate: "0 0" }
      ], { duration: 460, delay: Math.min(110, dist * 0.18), easing: "ease-out", composite: "add" });
    });
  }

  // Grietas al rojo en el fondo del esternon, que se enfrian: detras de ella
  // pero delante del humo y la luz del tablero, que las tapaban.
  function cracks(death, fx) {
    var r = death.getBoundingClientRect();
    if (!r.width) return;
    var NS = "http://www.w3.org/2000/svg";
    var H = (100 * r.height) / r.width;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "el-juicio-cracks");
    svg.setAttribute("viewBox", "0 0 100 " + H.toFixed(1));
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("aria-hidden", "true");
    var d = "";
    function branch(x, y, a, len, depth) {
      var path = "M" + x.toFixed(1) + " " + y.toFixed(1);
      var steps = 4 + Math.round(len / 9);
      for (var i = 0; i < steps; i++) {
        a += rand(-0.45, 0.45);
        var seg = len / steps;
        x += Math.cos(a) * seg;
        y += Math.sin(a) * seg;
        path += " L" + x.toFixed(1) + " " + y.toFixed(1);
        if (depth < 2 && Math.random() < 0.3) branch(x, y, a + (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 0.9), len * rand(0.3, 0.5), depth + 1);
      }
      d += path + " ";
    }
    for (var i = 0; i < 10; i++) {
      // Sobre todo hacia los lados (lo de en medio lo tapa su manto) y
      // subiendo por las paredes del esternon.
      var side = i % 2 ? 1 : -1;
      var a = side > 0 ? rand(-0.5, -0.05) : Math.PI + rand(0.05, 0.5);
      if (i < 2) a = -Math.PI / 2 + side * rand(0.15, 0.35);
      branch(50 + rand(-8, 8), H - 2, a, i < 2 ? rand(40, 70) : rand(45, 90), 0);
    }
    ["el-juicio-cracks__rift", "el-juicio-cracks__core"].forEach(function (cls) {
      var p = document.createElementNS(NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("class", cls);
      svg.appendChild(p);
    });
    death.insertBefore(svg, death.querySelector(".el-juicio-death__figure") || death.firstChild);
    fx.animate(svg, [{ clipPath: "circle(0% at 50% 100%)" }, { clipPath: "circle(160% at 50% 100%)" }], { duration: 140, easing: "ease-out", fill: "forwards" });
    fx.animate(svg, [{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], { duration: 3200, easing: "ease-in", fill: "forwards" }).then(function () { svg.remove(); });
  }

  // Cascotes y astillas de hueso que saltan del golpe (parabolas).
  function debris(overlay, x, y, width, fx) {
    if (!overlay) return;
    var p = overlay.getBoundingClientRect();
    var s = p.width / (overlay.offsetWidth || p.width) || 1;
    for (var i = 0; i < 22; i++) {
      var sh = div("el-juicio-shard" + (i % 3 === 0 ? " is-bone" : ""), overlay);
      var size = rand(7, 17);
      sh.style.left = ((x + rand(-0.3, 0.3) * width - p.left) / p.width) * 100 + "%";
      sh.style.top = ((y - p.top) / p.height) * 100 + "%";
      sh.style.width = size.toFixed(1) + "px";
      sh.style.height = (size * rand(0.5, 1)).toFixed(1) + "px";
      sh.style.clipPath = "polygon(" + [0, 1, 2, 3, 4].map(function (k) {
        var a = (k / 5) * Math.PI * 2 + rand(-0.4, 0.4), rr = rand(0.32, 0.5);
        return (50 + Math.cos(a) * rr * 100).toFixed(0) + "% " + (50 + Math.sin(a) * rr * 100).toFixed(0) + "%";
      }).join(", ") + ")";
      var ang = -Math.PI / 2 + rand(-0.5, 0.5) * Math.PI * 0.95;
      var v = rand(280, 700) / s;
      var vx = Math.cos(ang) * v, vy = Math.sin(ang) * v;
      var g = 1500 / s;
      var T = rand(0.65, 1.05);
      var spinDeg = rand(-720, 720);
      var frames = [];
      for (var k = 0; k <= 8; k++) {
        var t = (k / 8) * T;
        frames.push({
          transform: "translate(-50%, -50%) translate(" + (vx * t).toFixed(1) + "px, " + (vy * t + 0.5 * g * t * t).toFixed(1) + "px) rotate(" + (spinDeg * (k / 8)).toFixed(0) + "deg)",
          opacity: k < 6 ? 1 : 1 - (k - 5) / 3
        });
      }
      (function (el) {
        fx.animate(el, frames, { duration: T * 1000, easing: "linear", fill: "forwards" }).then(function () { el.remove(); });
      })(sh);
    }
  }

  function impact(death, o, fx) {
    fx.sound("el_juicio_death_land");
    fx.sound("el_juicio_death_smoke");
    // La oscuridad se queda (blackout): el fogonazo la enciende un instante.
    thunder();
    var g = fx.gfx();
    var r = laneRect();
    if (!r) return;
    var feet = { x: r.left + r.width / 2, y: r.top + r.height * 0.95 };
    punch(feet.x, feet.y, fx);
    pushIn(feet.x, r.top + r.height * 0.45, 1.05, 1900);
    plume(r);
    flinchReels(feet.x, feet.y, fx);
    cracks(death, fx);
    debris(o.overlay, feet.x, feet.y, r.width, fx);
    if (g) {
      // Sacudida fuerte y chispas desde los pies (sin la nube de polvo de la
      // guillotina, que tapaba la figura).
      g.shakeMachine(1.4);
      // Replica: la maquina sigue sacudiendose un momento.
      window.setTimeout(function () { g.shakeMachine(0.7); }, 420);
      window.setTimeout(function () { g.shakeMachine(0.35); }, 900);
      g.sparks(r.left + r.width * 0.12, feet.y, { count: 30, dir: -Math.PI * 0.7, spread: Math.PI * 0.6, speed: 700 });
      g.sparks(r.right - r.width * 0.12, feet.y, { count: 30, dir: -Math.PI * 0.3, spread: Math.PI * 0.6, speed: 700 });
      g.sparks(feet.x, feet.y, { count: 20, width: r.width * 0.7, spread: Math.PI * 0.5, speed: 480 });
      g.dust(feet.x, feet.y, { count: 6, width: r.width * 1.3 });
    }
    fx.shockwave(feet.x, feet.y, r.width * 4.8, "blood");
    window.setTimeout(function () { fx.shockwave(feet.x, feet.y, r.width * 2.6); }, 90);
    fx.burst("ember", feet.x, feet.y, 40, { dir: -Math.PI / 2, spread: Math.PI * 1.3, speed: 400, gravity: 170, size: 2.6, life: 1.3 });
    // Le arden los pies mientras se queda ahi (luz roja detras de la figura).
    death.classList.add("is-burning");
    window.setTimeout(function () { death.classList.remove("is-burning"); }, 3200);
  }

  // --- humo negro del golpe --------------------------------------------------------
  // Cuando cae, le sale humo negro y gris que sube y se abre hacia los lados
  // POR ENCIMA del marco y de los demas rodillos (peticion del usuario,
  // 2026-10-18): lienzo propio en #structureOverlay, encima del marco y
  // debajo de las brasas. Bocanadas pintadas una vez (bultos con la cresta
  // gris) que salen de los lados y de encima de ella (no la tapan), suben,
  // crecen, giran y se deshacen; al golpe, otras salen a ras de suelo hacia
  // los lados.
  var puffCache = null;
  function puffSprites() {
    if (puffCache) return puffCache;
    // [color del humo, color de la cresta]: negro, carbon y gris.
    // Sobre la maquina a oscuras el negro puro no se lee: el cuerpo negro o
    // carbon y la cresta en gris claro (como humo con luz por arriba).
    var tones = [["5,4,5", "58,55,52"], ["5,4,5", "48,45,43"], ["5,4,5", "66,62,58"], ["13,12,12", "74,70,66"], ["13,12,12", "62,58,55"], ["28,26,25", "92,88,82"]];
    puffCache = tones.map(function (t) {
      var S = 128;
      var c = document.createElement("canvas");
      c.width = c.height = S;
      var x = c.getContext("2d");
      for (var i = 0; i < 24; i++) {
        var a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * S * 0.26;
        var cx = S / 2 + Math.cos(a) * d, cy = S / 2 + Math.sin(a) * d * 0.85;
        var r = S * rand(0.09, 0.24);
        var g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, "rgba(" + t[0] + ",0.8)");
        g.addColorStop(0.6, "rgba(" + t[0] + ",0.45)");
        g.addColorStop(1, "rgba(" + t[0] + ",0)");
        x.fillStyle = g;
        x.fillRect(0, 0, S, S);
      }
      // Grumos pequenos para que no parezca un degradado liso.
      for (var j = 0; j < 30; j++) {
        var ja = Math.random() * Math.PI * 2, jd = Math.random() * S * 0.3;
        var jx = S / 2 + Math.cos(ja) * jd, jy = S / 2 + Math.sin(ja) * jd;
        var jr = S * rand(0.04, 0.09);
        var jg = x.createRadialGradient(jx, jy, 0, jx, jy, jr);
        jg.addColorStop(0, "rgba(" + t[0] + ",0.35)");
        jg.addColorStop(1, "rgba(" + t[0] + ",0)");
        x.fillStyle = jg;
        x.fillRect(0, 0, S, S);
      }
      // La cresta coge algo de luz (solo donde hay humo).
      x.globalCompositeOperation = "source-atop";
      var lg = x.createLinearGradient(0, S * 0.12, 0, S * 0.62);
      lg.addColorStop(0, "rgba(" + t[1] + ",0.6)");
      lg.addColorStop(1, "rgba(" + t[1] + ",0)");
      x.fillStyle = lg;
      x.fillRect(0, 0, S, S);
      // Borde blando.
      x.globalCompositeOperation = "destination-in";
      var fall = x.createRadialGradient(S / 2, S / 2, S * 0.22, S / 2, S / 2, S / 2);
      fall.addColorStop(0, "rgba(0,0,0,1)");
      fall.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = fall;
      x.fillRect(0, 0, S, S);
      return c;
    });
    return puffCache;
  }

  var plumeState = null;
  function plume(lr) {
    var overlay = document.getElementById("structureOverlay");
    if (!overlay || !overlay.offsetWidth || !lr) return;
    if (plumeState) plumeState.canvas.remove();
    var W = overlay.offsetWidth, H = overlay.offsetHeight;
    var or = overlay.getBoundingClientRect();
    var sc = or.width / W || 1;
    // A media resolucion: el humo es blando y asi pesa la cuarta parte.
    var RES = 0.5;
    var canvas = document.createElement("canvas");
    canvas.className = "el-juicio-plume";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = Math.max(1, Math.round(W * RES));
    canvas.height = Math.max(1, Math.round(H * RES));
    overlay.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      return;
    }
    // El esternon en pixeles del overlay (sin su escala).
    var L = { x: (lr.left - or.left) / sc, y: (lr.top - or.top) / sc, w: lr.width / sc, h: lr.height / sc };
    var cx = L.x + L.w / 2, floor = L.y + L.h * 0.93;
    var sprites = puffSprites();
    var puffs = [];
    var st = { canvas: canvas, raf: 0 };
    plumeState = st;

    function add(x, y, vx, vy, size, o) {
      o = o || {};
      if (puffs.length > 170) puffs.shift();
      puffs.push({
        x: x, y: y, vx: vx, vy: vy, size: size, age: -(o.delay || 0), life: o.life || rand(3, 4.2),
        drag: o.drag || 0.972, lift: o.lift == null ? 34 : o.lift, grow: o.grow || rand(1.8, 2.8),
        rot: rand(0, Math.PI * 2), vr: rand(-0.5, 0.5), alpha: o.alpha || rand(0.85, 1),
        sway: rand(6, 16), phase: rand(0, 6.28), sprite: sprites[Math.floor(Math.random() * sprites.length)],
        // Algo estiradas (no bolas): mas anchas o mas altas.
        sx: rand(0.95, 1.35), sy: rand(0.8, 1.1)
      });
    }
    // Hacia arriba: de encima de ella (por donde estaba el encapuchado),
    // despacio y abriendose sobre la viga.
    function up(n, power) {
      for (var i = 0; i < n; i++) {
        add(cx + rand(-0.4, 0.4) * L.w, L.y + rand(-0.06, 0.22) * L.h, rand(-0.5, 0.5) * L.w * power, -rand(0.9, 1.6) * L.w * power,
          L.w * rand(0.24, 0.36), {});
      }
    }
    // Hacia los lados: de los costados del esternon, por encima de los
    // huesos del marco y de los rodillos de al lado, subiendo poco a poco.
    function sides(n, power) {
      for (var i = 0; i < n; i++) {
        var side = Math.random() < 0.5 ? -1 : 1;
        add(cx + side * rand(0.38, 0.6) * L.w, L.y + rand(0.15, 0.85) * L.h, side * rand(0.8, 1.9) * L.w * power, -rand(0.35, 1) * L.w * power,
          L.w * rand(0.22, 0.34), { drag: 0.965 });
      }
    }
    // Al golpe: todo de golpe y ademas bocanadas a ras de suelo hacia los
    // lados, que luego suben.
    up(14, 1.25);
    sides(20, 1.3);
    for (var i = 0; i < 12; i++) {
      var side = i % 2 ? 1 : -1;
      add(cx + side * rand(0.25, 0.5) * L.w, floor - rand(0, 0.1) * L.h, side * rand(2.6, 4.2) * L.w, -rand(0.05, 0.3) * L.w,
        L.w * rand(0.24, 0.34), { drag: 0.93, lift: 55, life: rand(2.6, 3.4), delay: rand(0, 0.08) });
    }
    var turn = 0;
    var t0 = 0, last = 0, emitAcc = 0;
    var EMIT = 2.6;
    function step(now) {
      st.raf = 0;
      if (!canvas.isConnected) return;
      if (!t0) t0 = last = now;
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var t = (now - t0) / 1000;
      // Sigue saliendo un rato, cada vez menos.
      if (t < EMIT) {
        emitAcc += dt * 34 * (1 - 0.7 * (t / EMIT));
        while (emitAcc >= 1) {
          emitAcc -= 1;
          if (turn++ % 2) up(1, 1 - 0.4 * (t / EMIT));
          else sides(1, 1 - 0.4 * (t / EMIT));
        }
      }
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var alive = [];
      for (var i = 0; i < puffs.length; i++) {
        var p = puffs[i];
        p.age += dt;
        if (p.age < 0) {
          alive.push(p);
          continue;
        }
        if (p.age >= p.life) continue;
        var dragK = Math.pow(p.drag, dt * 60);
        p.vx *= dragK;
        p.vy = p.vy * dragK - p.lift * dt;
        p.x += (p.vx + Math.sin(p.phase + p.age * 1.7) * p.sway) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        var k = p.age / p.life;
        var sz = p.size * (1 + p.grow * (1 - Math.pow(1 - k, 2)));
        // Entra rapido, se queda espeso la primera mitad y se deshace.
        var a = p.alpha * Math.min(1, p.age / 0.2) * (k < 0.4 ? 1 : Math.pow(1 - (k - 0.4) / 0.6, 1.3));
        // Se deshace al llegar arriba del todo (sin cortarse en el borde).
        a *= Math.max(0, Math.min(1, (p.y + sz * 0.5) / (H * 0.16)));
        if (a <= 0.01) {
          alive.push(p);
          continue;
        }
        ctx.globalAlpha = a;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(p.sprite, -sz * p.sx, -sz * p.sy, sz * 2 * p.sx, sz * 2 * p.sy);
        ctx.restore();
        alive.push(p);
      }
      ctx.globalAlpha = 1;
      puffs = alive;
      if (puffs.length || t < EMIT) st.raf = window.requestAnimationFrame(step);
      else {
        canvas.remove();
        if (plumeState === st) plumeState = null;
      }
    }
    st.raf = window.requestAnimationFrame(step);
  }

  // --- 3. SUPER BONUS! -----------------------------------------------------------
  // Con la Muerte ya en el esternon cae de golpe el cartel THE JUDGMENT ·
  // Superbonus del usuario (src/fx/bonus-poster.js; antes, las letras de oro
  // SUPER BONUS): las letras y la guadana caen sobre la pantalla y al golpe
  // la sangre de fuera salpica hacia fuera y se queda viva; fogonazo,
  // relampago detras, ondas, oro, gotas de sangre, chispas, sacudida y
  // estruendo. Se queda en pantalla: la entrada del Super (game.js, sin
  // video) monta el mismo cartel con el PLAY debajo y quita este
  // (releaseSlam) sin que se note el cambio.
  var heldSlam = null;

  function releaseSlam() {
    if (!heldSlam) return false;
    window.clearTimeout(heldSlam.timer);
    heldSlam.root.remove();
    heldSlam = null;
    return true;
  }

  async function superSlam(fx) {
    releaseSlam();
    var root = div("el-juicio-slam bonus-poster-kind--judgment", document.body);
    var p = window.OssuaryBonusPoster.build(root, "judgment");
    var flash = div("el-juicio-slam__flash", root);
    fx.sound("el_juicio_super_slam");
    // Un solo fotograma clave: acaban en lo que diga el CSS (y los latidos
    // de la brasa siguen por donde iban).
    p.veil.animate([{ opacity: 0 }], { duration: 240 });
    window.OssuaryBonusPoster.strike(p, 250);
    p.glow.animate([{ opacity: 0 }], { duration: 520, delay: 250, fill: "backwards" });
    var slam = fx.animate(p.core, [
      { transform: "scale(3.4)", opacity: 0, filter: "blur(14px) brightness(2.4)" },
      { transform: "scale(0.9)", opacity: 1, filter: "blur(0px) brightness(1.9)", offset: 0.55 },
      { transform: "scale(1.06)", opacity: 1, filter: "blur(0px) brightness(1.3)", offset: 0.78 },
      { transform: "none", opacity: 1, filter: "none" }
    ], { duration: 460, easing: "cubic-bezier(.5,0,.75,1)" });
    // La sangre salpica desde detras de las letras al golpe: sale desde el
    // centro, se agita y suelta su neblina (bonus-poster.js, WebGL).
    if (p.smoke) p.smoke.enter(250);
    await fx.wait(250);
    // Contacto.
    fx.animate(flash, [{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: "ease-out", fill: "forwards" });
    var g = fx.gfx();
    var r = p.logo.getBoundingClientRect();
    var cx = r.left + r.width * 0.516, cy = r.top + r.height * 0.524;
    if (g) {
      g.shakeMachine(1.25);
      g.sparks(r.left + r.width * 0.14, cy, { count: 30, dir: Math.PI, spread: Math.PI * 0.8, speed: 760 });
      g.sparks(r.right - r.width * 0.1, cy, { count: 30, dir: 0, spread: Math.PI * 0.8, speed: 760 });
    }
    fx.shockwave(cx, cy, r.width * 1.5, "blood");
    window.setTimeout(function () { fx.shockwave(cx, cy, r.width * 0.9, "gold"); }, 110);
    fx.burst("gold", cx, cy, 60, { spread: Math.PI * 2, speed: 560, gravity: 280, size: 2.8, life: 1.5, width: r.width * 0.35 });
    // Gotas de sangre que salen despedidas por los lados y caen.
    [Math.PI, 0].forEach(function (dir, k) {
      fx.burst("ember", k ? r.right - r.width * 0.12 : r.left + r.width * 0.14, cy, 26, {
        dir: dir, spread: Math.PI * 0.9, speed: 520, gravity: 900, drag: 0.985, size: 2.6, life: 1.2,
        height: r.height * 0.3, color: "170,10,4"
      });
    });
    fx.burst("ember", cx, cy, 30, { spread: Math.PI * 2, speed: 380, gravity: 160, size: 2.4, life: 1.3, width: r.width * 0.4 });
    await slam;
    var rise = window.setInterval(function () {
      fx.emit(Math.random() < 0.6 ? "gold" : "ember", cx + rand(-0.4, 0.4) * r.width, cy + r.height * 0.3, {
        vx: rand(-20, 20), vy: rand(-110, -50), drag: 0.99, size: rand(1.5, 2.8), life: rand(1, 1.7), sway: 14
      });
    }, 55);
    await fx.wait(1000);
    window.clearInterval(rise);
    // Se queda hasta que sale la entrada; si no saliera, se va solo.
    heldSlam = { root: root, timer: 0 };
    var held = heldSlam;
    held.timer = window.setTimeout(function () {
      if (heldSlam !== held) return;
      heldSlam = null;
      root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, fill: "forwards" }).onfinish = function () { root.remove(); };
    }, 15000);
  }

  // o: { fall, quick, leadMs (esternon girando antes del amago), overlay,
  //      reelLayer, frameNoHoodSrc, swapFrame(bool), dread(bool),
  //      buildDeath(parent) -> { death, figure, head, scythe, eyes }, fx }
  // Devuelve { fell, landing } (landing: la Muerte caida, se quita al
  // empezar el Super).
  async function play(o) {
    var fx = o.fx;
    if (window.OssuaryHoodEyes) window.OssuaryHoodEyes.hide();
    // El esternon ya gira a oscuras desde la tirada que completo la cadena
    // (beginDark, con la tirada aun en marcha); si no (entrada directa),
    // arranca ahora, con la oscuridad y el retumbo.
    var spin = takeDark();
    if (!spin) {
      spin = startSternumSpin(o.reelLayer, fx);
      fx.sound("el_juicio_dark");
      spotlight(o.overlay, true);
    }
    tremble(1.2);
    await Promise.all([
      Promise.race([Promise.all([keepResident(o.frameNoHoodSrc), keepResident(BODY_SRC), keepResident(HANDS_SRC), window.OssuaryBonusPoster.preload("judgment")]), fx.wait(1500)]),
      fx.wait(o.leadMs || 0)
    ]);
    // El encapuchado del marco pasa a ser sus dos capas, en su sitio.
    var h = buildHood(o);
    if (!h) {
      tremble(0);
      spotlight(o.overlay, false);
      if (spin) {
        stopBeats(spin);
        spin.wrap.remove();
      }
      return { fell: false, landing: null };
    }
    lit(true);
    o.swapFrame(true);
    // Ahora la luz es para el.
    spotlight(o.overlay, false);
    hoodDim(o.overlay, h, true);
    window.requestAnimationFrame(function () { h.body.classList.add("is-dark"); });
    fx.sound("el_juicio_tease");
    if (spin) spin.mute = true;
    fx.animate(h.aura, [{ opacity: 0 }, { opacity: 1 }], { duration: o.quick ? 300 : 600, fill: "forwards" });
    tremble(1.6);
    await wobble(h, fx, o.quick ? 1000 : 1700, o.quick);

    if (!o.fall) {
      // Amago: "ah... nada". Para el temblor, se rinde, el humo se apaga y el
      // esternon frena.
      // El bonus normal sigue enseguida; el esternon acaba de frenar solo.
      tremble(0);
      fx.sound("el_juicio_tease_miss");
      spotlight(o.overlay, false);
      stopSternumSpin(spin, fx);
      await Promise.all([settle(h, fx), fx.wait(420)]);
      o.swapFrame(false);
      hoodDim(o.overlay, h, false);
      removeHood(h);
      o.dread(false);
      return { fell: false, landing: null };
    }

    // Super: se alza, se lo llevan detras de la viga y la Muerte sale entera
    // por el esternon, sin pausa.
    tremble(2.4);
    await anticipate(h, fx, o.quick ? 260 : 440);
    tremble(0);
    stopBeats(spin);
    await yank(h, fx, o.quick ? 220 : 250);
    hoodDim(o.overlay, h, false);
    spotlight(o.overlay, true);
    await behind(spin, fx, o.quick ? 220 : 380);
    // Ya en el suelo, la maquina aun retumba mientras se queda ahi.
    var rumble = window.setTimeout(function () { tremble(0.7); }, 700);
    var landing = await dropDeath(o, spin, fx, o.quick ? 700 : 1100);
    if (landing) keepDark(landing);
    else blackout(false);
    // ¡SUPER BONUS!
    window.clearTimeout(rumble);
    tremble(0);
    releaseCam(420);
    await superSlam(fx);
    spotlight(o.overlay, false);
    return { fell: true, landing: landing };
  }

  // Las capas en memoria antes de que hagan falta (sin prisa).
  window.setTimeout(function () {
    keepResident(BODY_SRC);
    keepResident(HANDS_SRC);
  }, 6000);

  window.OssuaryElJuicioFall = {
    play: play,
    beginDark: beginDark,
    endDark: endDark,
    intrigue: intrigue,
    isDark: function () { return Boolean(pendingDark); },
    releaseSlam: releaseSlam,
    hasSlam: function () { return Boolean(heldSlam); }
  };
})();
