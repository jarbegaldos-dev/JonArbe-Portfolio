(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Pajaro (cuervo) que se posa tras el corte de la cuchilla pequena — SOLO
  // VISUAL.
  //
  // Cuando una cuchilla pequena CORTA un simbolo de PAJARO (VERTEBRA), game.js
  // llama a perchAt(): el video del pajaro (webm VP9 con alfa, idle en loop)
  // CAE de arriba hacia abajo y se queda POSADO en uno de los dos posaderos del
  // rodillo 1 (casilla 1 o casilla 3), con las patas perchGapPx por ENCIMA del
  // borde superior de la casilla. El pajaro PERSISTE entre spins (no se retira
  // al girar); solo desaparece en un reset total (clear()).
  //
  // Contrato de independencia (mismo espiritu que small-blade-cut.js /
  // small-blade-door-video.js):
  //  - NO toca estado de reels, strips, outcome, locks ni pagos. game.js le
  //    pasa una funcion-ancla que devuelve el RECT (viewport) de la casilla y
  //    decide QUE posadero ocupar. Aleatoriedad visual con Math.random (nunca
  //    el RNG del motor).
  //  - Capa fija sobre el resto del tablero; el pajaro asoma por encima de la
  //    estructura porque se posa por encima del borde de la casilla.
  //  - clear() cancela animaciones y retira todos los pajaros (reset).
  //  - flyAway() los que quedan posados se van volando (al acabar las mini
  //    freespins del Raven Bonus; game.js#finishRavenChain).
  //  - reposition() recoloca los pajaros vivos desde su ancla (resize).
  // ---------------------------------------------------------------------------

  var DEFAULTS = {
    videoSrc: "assets/effects/bird_perch_alpha.webm",
    // Caja del CONTENIDO (el pajaro) dentro del frame 512x512 del webm, medida
    // sobre el alfa (cropdetect: crop=426:296:64:122 => x 64..490, y 122..418).
    // Con esto se alinea el centro horizontal del pajaro con el centro de la
    // casilla y sus patas (borde inferior del contenido) con el punto de posado.
    contentLeftFrac: 64 / 512,
    contentTopFrac: 122 / 512,
    contentWidthFrac: 426 / 512,
    contentHeightFrac: 296 / 512,
    // Ancho del pajaro (su contenido) al posarse, en fraccion del ancho de la
    // casilla del rodillo. >1 => el pajaro es mas ancho que la casilla.
    contentWidthCells: 1.5,
    // Las patas del pajaro quedan este tanto (px) por ENCIMA del borde superior
    // de la casilla.
    perchGapPx: 4,
    // Caida: arranca a dropRisePx por encima de su sitio y baja en dropMs.
    dropRisePx: 300,
    dropMs: 640,
    dropEasing: "cubic-bezier(.24,.72,.26,1)",
    // Aparicion suave del primer frame.
    fadeMs: 200,

    // --- Muerte del pajaro (la piedra del esqueleto lo golpea) ---------------
    // Al llamar killBird(): DESTELLO de impacto, el video del cuervo se cambia
    // por esta imagen (cuervo muerto), que CAE recta hasta salir por abajo y,
    // por el camino, deja una COPIA de si misma en cada casilla que atraviesa
    // (game.js pasa esas casillas). Las copias PERSISTEN hasta el siguiente
    // giro, donde salen deslizandose (dismissDeathCopiesForSpin).
    deadImageSrc: "assets/symbols/bird-dead.png",
    // Ancho de la imagen que cae, en anchos de la casilla del posadero. Solo la
    // que CAE es grande; las copias que deja son mas pequenas.
    fallWidthCells: 2.3,
    fallMs: 900,
    fallEasing: "cubic-bezier(.36,.06,.68,.30)",
    fallSpinDeg: 60,
    // Destello del impacto sobre el posadero.
    flashMs: 240,
    flashGrow: 1.6,
    // Cada copia: ancho respecto a SU casilla (cuadrada, object-fit:contain). Al
    // "clavarse" en la casilla hace un FLASH blanco (pum de luz), aparece un
    // poco mas grande y ENCOGE hasta su tamano final, quedandose con un AURA
    // blanca permanente alrededor (ver .small-blade-bird-dead-copy en CSS).
    copyWidthCells: 1.05,
    // Escala inicial (mas grande) al aparecer, antes de encoger a 1.
    copyLandInScale: 1.32,
    // Duracion del "clavado": flash blanco de la imagen + encoger.
    copyLandMs: 340,
    // Destello radial blanco (el "pum" de luz) sobre la casilla al clavarse.
    copyFlashMs: 320,
    copyFlashGrow: 2.0,
    copyExitMs: 430,
    copyExitDropPx: 150,
    copyExitEasing: "cubic-bezier(.5,0,.75,0)",

    // --- Se van volando (flyAway) --------------------------------------------
    // Se agacha, salta con un golpe de plumas y se aleja aleteando hacia
    // arriba y hacia su lado de la pantalla hasta perderse. flyAwayStaggerMs:
    // uno detras de otro.
    flyAwayMs: 1150,
    flyAwayStaggerMs: 150,
    flyAwayEasing: "cubic-bezier(.45,0,.75,.9)",
    // Si el cuervo que muere llevaba multiplicador (x2, x3...), cada copia que
    // deja al caer muestra ESE numero, sencillo y bien visible, POR ENCIMA de la
    // imagen del cuervo muerto (sin aura ni color especial). Tamano de la fuente
    // en fraccion del ancho de la casilla.
    copyMultFontCells: 0.4,
    copyMultPopMs: 300,

    // --- Multiplicador apilado (varios cuervos en el MISMO lado) -------------
    // Cuando cae un cuervo en un lado que YA tiene cuervo, no se posa uno nuevo:
    // sube el contador de ese posadero (x2, x3, x4...) y aparece/actualiza un
    // badge sobre el cuervo, mientras un cuervo "clavado" cae encima y se funde.
    // SOLO VISUAL.
    birdImageSrc: "assets/symbols/bird.png",
    // Cuervo que cae encima al apilar: arranca stackDropRisePx por encima y baja.
    stackDropRisePx: 260,
    stackDropMs: 480,
    stackDropEasing: "cubic-bezier(.24,.72,.26,1)",
    // Rebote del cuervo posado al recibir el apilado.
    stackBounceMs: 320,
    // Badge del multiplicador: PEQUENO, anclado a la esquina superior DERECHA
    // del contenido del cuervo (no del frame del webm), justo fuera de su
    // silueta para no taparlo. Tamano en fraccion del ancho de la casilla.
    multBadgeSizeCells: 0.34,
    // Offsets del CENTRO del badge respecto a esa esquina, en fraccion del
    // propio tamano del badge (+ = mas a la derecha / mas abajo).
    multBadgeOffsetXFrac: 0.45,
    multBadgeOffsetYFrac: -0.10,
    multBadgePopMs: 300,

    // --- Cuervo DORADO -------------------------------------------------------
    // Mismo arte y mismo video del cuervo, dorados por filtro (clase is-golden,
    // ver src/fx/raven-bonus.css). Vale el factor que pasa game.js (x10, x25 o
    // x50) y se suma a la pila como uno negro suma 1. Las copias del cuervo
    // muerto llevan el dorado dentro de su animacion de clavado (su filter va
    // por script con fill forwards y taparia el de la clase).
    goldTint: "grayscale(1) sepia(1) saturate(5.5) hue-rotate(-4deg) brightness(1.75) contrast(1.3)"
  };

  function createBirdPerch(options) {
    options = options || {};
    var settings = Object.assign({}, DEFAULTS, options.settings || {});
    var layerParent = options.layerParent || document.body;

    var layerEl = null;
    // slotKey -> { video, anchorFn, anims:Set }
    var birds = new Map();
    var savedBaseBirds = null;
    // Copias persistentes del cuervo muerto que deja la caida (una por casilla
    // atravesada). Cada una: { img, anchor }. Se retiran en el siguiente giro.
    var deathCopies = [];
    // Visuales transitorios de la muerte (imagen que cae, destellos, pops) y
    // sus timers/animaciones, para poder cancelarlos en clear().
    var deathEls = new Set();
    var deathAnims = new Set();
    var deathTimers = new Set();
    var warmEl = null;
    var warmDeadEl = null;

    // Precarga el webm una vez para que el primer frame este listo al posarse.
    function warmCache() {
      if (warmEl) return;
      warmEl = document.createElement("video");
      warmEl.muted = true;
      warmEl.preload = "auto";
      warmEl.src = settings.videoSrc;
      warmEl.load();
      // Precarga tambien la imagen del cuervo muerto (impacto de la piedra).
      warmDeadEl = new Image();
      warmDeadEl.src = settings.deadImageSrc;
    }

    // Timer/animacion propios de la muerte, registrados para poder cancelarlos.
    function deathTimer(fn, ms) {
      var id = window.setTimeout(function () {
        deathTimers.delete(id);
        fn();
      }, ms);
      deathTimers.add(id);
      return id;
    }
    function trackDeathAnim(anim) {
      if (anim) deathAnims.add(anim);
      return anim;
    }

    function ensureLayer() {
      if (layerEl && layerEl.isConnected) return layerEl;
      layerEl = document.createElement("div");
      layerEl.className = "small-blade-bird-perch-layer";
      layerParent.appendChild(layerEl);
      return layerEl;
    }

    // Caja {left,top,width,height} del <video> para que el pajaro quede
    // centrado sobre la casilla y con las patas perchGapPx por encima del borde
    // superior. El frame del webm es cuadrado (512x512) => alto = ancho.
    function boxForRect(rect) {
      if (!rect || !rect.width || !rect.height) return null;
      var w = (rect.width * settings.contentWidthCells) / settings.contentWidthFrac;
      var h = w;
      var contentCenterXFrac = settings.contentLeftFrac + settings.contentWidthFrac / 2;
      var contentBottomFrac = settings.contentTopFrac + settings.contentHeightFrac;
      var cellCenterX = rect.left + rect.width / 2;
      var feetY = rect.top - settings.perchGapPx;
      return {
        left: cellCenterX - contentCenterXFrac * w,
        top: feetY - contentBottomFrac * h,
        width: w,
        height: h
      };
    }

    function applyBox(video, box) {
      var s = video.style;
      s.left = box.left + "px";
      s.top = box.top + "px";
      s.width = box.width + "px";
      s.height = box.height + "px";
    }

    function isOccupied(slotKey) {
      return birds.has(slotKey);
    }

    // Multiplicador de un posadero: la SUMA de sus cuervos (peticion del
    // usuario, 2026-10-09): cada negro vale 1 y cada dorado su factor (x10,
    // x25, x50). Dos negros x2; un dorado x10 y un negro x11.
    function multiplierOf(entry) {
      return entry ? entry.value : 0;
    }

    function crowValue(opts) {
      return opts && opts.golden && opts.factor > 1 ? opts.factor : 1;
    }

    function crowMember(opts) {
      var golden = Boolean(opts && opts.golden);
      return { value: crowValue(opts), golden: golden,
        remaining: opts && opts.remaining != null ? opts.remaining : golden ? 2 + Math.floor(Math.random() * 4) : null };
    }

    // Conserva las mismas entradas y anclas; el bonus usa posaderos propios.
    function setBonusSuspended(on) {
      if (on === (savedBaseBirds !== null)) return;
      if (on) {
        savedBaseBirds = birds;
        birds = new Map();
        savedBaseBirds.forEach(function (entry) {
          entry.suspended = true;
          entry.video.style.visibility = "hidden";
          entry.video.pause();
          if (entry.badgeEl) entry.badgeEl.style.visibility = "hidden";
        });
      } else {
        clearSlots(Array.from(birds.keys()));
        birds = savedBaseBirds;
        savedBaseBirds = null;
        birds.forEach(function (entry) {
          entry.suspended = false;
          entry.video.style.visibility = "";
          if (entry.badgeEl) entry.badgeEl.style.visibility = "";
          else if (entry.value >= 2) updateMultiplierBadge(entry);
          var playing = entry.video.play();
          if (playing && playing.catch) playing.catch(function () {});
        });
        reposition();
      }
    }

    // Solo se invoca al aceptar un giro base. Cada dorado conserva su plazo,
    // incluso al apilarse con otros; la piedra sigue matando la pila completa.
    function advanceBaseSpin() {
      if (savedBaseBirds !== null) return 0;
      var leaving = 0;
      Array.from(birds.keys()).forEach(function (key) {
        var entry = birds.get(key);
        var expired = entry.members.filter(function (member) {
          return member.remaining !== null && --member.remaining <= 0;
        });
        if (!expired.length) return;
        leaving += expired.length;
        entry.members = entry.members.filter(function (member) { return expired.indexOf(member) === -1; });
        if (!entry.members.length) {
          flyAway([key]);
          return;
        }
        // Vuela una copia de los que salen; la pila superviviente no se mueve.
        var flightKey = {};
        var flight = { video: entry.video.cloneNode(true), anchorFn: entry.anchorFn, anims: new Set(), golden: true, badgeEl: null };
        ensureLayer().appendChild(flight.video);
        var playing = flight.video.play();
        if (playing && playing.catch) playing.catch(function () {});
        birds.set(flightKey, flight);
        flyAway([flightKey]);
        entry.count = entry.members.length;
        entry.value = entry.members.reduce(function (sum, member) { return sum + member.value; }, 0);
        entry.golden = entry.members.some(function (member) { return member.golden; });
        entry.video.classList.toggle("is-golden", entry.golden);
        if (entry.value >= 2) updateMultiplierBadge(entry);
        else if (entry.badgeEl) { entry.badgeEl.remove(); entry.badgeEl = null; }
      });
      return leaving;
    }

    // Con un dorado en la pila, todo el posadero se ve dorado.
    function makeGolden(entry) {
      if (!entry) return;
      entry.golden = true;
      if (entry.video) entry.video.classList.add("is-golden");
    }

    function clearSlot(slotKey) {
      var entry = birds.get(slotKey);
      if (!entry) return false;
      entry.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      if (entry.video && entry.video.parentNode) {
        entry.video.parentNode.removeChild(entry.video);
      }
      if (entry.badgeEl && entry.badgeEl.parentNode) {
        entry.badgeEl.parentNode.removeChild(entry.badgeEl);
      }
      birds.delete(slotKey);
      return true;
    }

    function clearSlots(slotKeys) {
      if (!Array.isArray(slotKeys) || !slotKeys.length) return 0;
      var removed = 0;
      slotKeys.forEach(function (slotKey) {
        if (clearSlot(slotKey)) removed += 1;
      });
      return removed;
    }

    // Posa un pajaro en slotKey si esta libre. anchorFn() devuelve el rect
    // (viewport) actual de la casilla, o null si aun no se puede medir.
    // opts.golden / opts.factor: cuervo dorado y su multiplicador.
    function perchAt(slotKey, anchorFn, opts) {
      if (birds.has(slotKey)) return false;
      var box = boxForRect(anchorFn && anchorFn());
      if (!box) return false;

      var video = document.createElement("video");
      video.className = "small-blade-bird-perch";
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.preload = "auto";
      video.src = settings.videoSrc;
      applyBox(video, box);
      video.style.opacity = "0";
      ensureLayer().appendChild(video);

      // count = cuervos apilados en este posadero (1 = solo este, sin badge; a
      // partir de 2 aparece el badge xN). badgeEl se crea al primer apilado.
      var entry = { video: video, anchorFn: anchorFn, anims: new Set(), count: 1, value: crowValue(opts), badgeEl: null, golden: false };
      entry.members = [crowMember(opts)];
      birds.set(slotKey, entry);
      if (opts && opts.golden) {
        makeGolden(entry);
        // El dorado lleva su xN desde que se posa (al terminar la caida).
        if (multiplierOf(entry) >= 2) {
          window.setTimeout(function () {
            if (birds.get(slotKey) === entry) updateMultiplierBadge(entry);
          }, settings.dropMs);
        }
      }

      function start() {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
        try {
          entry.anims.add(video.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: settings.fadeMs, fill: "forwards" }
          ));
          entry.anims.add(video.animate(
            [
              { transform: "translateY(" + (-settings.dropRisePx) + "px)" },
              { transform: "translateY(0px)" }
            ],
            { duration: settings.dropMs, easing: settings.dropEasing, fill: "forwards" }
          ));
        } catch (e) {
          video.style.opacity = "1";
        }
      }

      if (video.readyState >= 2) start();
      else video.addEventListener("loadeddata", start, { once: true });
      return true;
    }

    // Cae un cuervo en slotKey: si el posadero esta LIBRE se posa uno nuevo
    // (perchAt); si YA hay cuervo, se APILA — sube el multiplicador (x2, x3...)
    // y cae un cuervo encima que se funde con el posado. El lado (izq/der) lo
    // elige quien llama (game.js), pudiendo coincidir con uno ocupado.
    function landBird(slotKey, anchorFn, opts) {
      if (birds.has(slotKey)) return bumpAt(slotKey, opts);
      return perchAt(slotKey, anchorFn, opts);
    }

    // Sube el multiplicador de un posadero ocupado (le suma lo que vale el que
    // cae) y reproduce el apilado: un cuervo cae encima y se funde; el badge
    // xN hace pop. El video posado conserva su movimiento propio.
    // Si el que cae es dorado, toda la pila pasa
    // a ser dorada.
    function bumpAt(slotKey, opts) {
      var entry = birds.get(slotKey);
      if (!entry) return false;
      entry.count += 1;
      entry.members.push(crowMember(opts));
      entry.value += crowValue(opts);
      var golden = Boolean(opts && opts.golden);
      if (golden) makeGolden(entry);
      var rect = entry.anchorFn && entry.anchorFn();
      var box = boxForRect(rect);
      // Cuervo que cae encima y se funde con el posado.
      if (box) spawnStackDrop(box, golden);
      updateMultiplierBadge(entry);
      return true;
    }

    // Caja {left,top,size} del badge del multiplicador, anclada a la esquina
    // superior DERECHA del CONTENIDO del cuervo (no del frame del webm), un
    // poco hacia fuera para no tapar su silueta.
    function badgeBoxForRect(rect) {
      var crow = boxForRect(rect);
      if (!crow || !rect || !rect.width) return null;
      var size = rect.width * settings.multBadgeSizeCells;
      var contentRight = crow.left + (settings.contentLeftFrac + settings.contentWidthFrac) * crow.width;
      var contentTop = crow.top + settings.contentTopFrac * crow.height;
      var cx = contentRight + size * settings.multBadgeOffsetXFrac;
      var cy = contentTop + size * settings.multBadgeOffsetYFrac;
      return { left: cx - size / 2, top: cy - size / 2, size: size };
    }

    // Crea/actualiza el badge xN del posadero y lo hace pop. Sin badge para 1.
    function updateMultiplierBadge(entry) {
      var box = badgeBoxForRect(entry.anchorFn && entry.anchorFn());
      if (!entry.badgeEl) {
        var badge = document.createElement("div");
        badge.className = "small-blade-bird-mult-badge";
        ensureLayer().appendChild(badge);
        entry.badgeEl = badge;
      }
      entry.badgeEl.classList.toggle("is-golden", Boolean(entry.golden));
      entry.badgeEl.style.visibility = entry.suspended ? "hidden" : "";
      entry.badgeEl.textContent = "×" + multiplierOf(entry);
      if (box) {
        var s = entry.badgeEl.style;
        s.left = box.left + "px";
        s.top = box.top + "px";
        s.width = box.size + "px";
        s.height = box.size + "px";
        s.fontSize = (box.size * 0.52) + "px";
      }
      try {
        entry.anims.add(entry.badgeEl.animate(
          [
            { transform: "scale(0.4)", opacity: 0.2 },
            { transform: "scale(1.32)", opacity: 1, offset: 0.6 },
            { transform: "scale(1)", opacity: 1 }
          ],
          { duration: settings.multBadgePopMs, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }
        ));
      } catch (e) {
        entry.badgeEl.style.opacity = "1";
      }
    }

    // Cuervo (bird.png) que cae desde arriba sobre el posadero y se funde con el
    // cuervo ya posado (aparece, llega y se desvanece). Transitorio: se limpia
    // solo. Usa la MISMA caja que el video posado para alinearse encima.
    function spawnStackDrop(box, golden) {
      var img = document.createElement("img");
      img.className = "small-blade-bird-stack-drop" + (golden ? " is-golden" : "");
      img.src = settings.birdImageSrc;
      img.alt = "";
      applyBox(img, box);
      ensureLayer().appendChild(img);
      deathEls.add(img);
      trackDeathAnim(img.animate(
        [
          { transform: "translateY(" + (-settings.stackDropRisePx) + "px)", opacity: 0 },
          { transform: "translateY(-8px)", opacity: 1, offset: 0.72 },
          { transform: "translateY(0px)", opacity: 0 }
        ],
        { duration: settings.stackDropMs, easing: settings.stackDropEasing, fill: "forwards" }
      ));
      deathTimer(function () {
        deathEls.delete(img);
        if (img.parentNode) img.parentNode.removeChild(img);
      }, settings.stackDropMs + 40);
    }

    // --- Anticipacion de la piedra (peticion del usuario, 2026-10-13) --------
    // Compatibilidad con el aviso de piedra: el video ya trae movimiento.
    // Solo cancela una sacudida antigua si siguiera activa; no crea otra.
    function brace(on) {
      birds.forEach(function (entry) {
        if (entry.braceAnim) {
          try { entry.braceAnim.cancel(); } catch (e) {}
          entry.anims.delete(entry.braceAnim);
          entry.braceAnim = null;
        }
      });
    }

    // La piedra mata al cuervo: explosion de plumas desde su cuerpo, hacia
    // todos lados (mas hacia arriba), que caen girando y meciendose (doradas
    // si el cuervo era dorado). Peticion del usuario (2026-10-13). count: menos
    // plumas (al echar a volar).
    var FEATHER_COUNT = 14;
    function spawnFeatherBurst(rect, box, golden, count) {
      var total = count || FEATHER_COUNT;
      if (!rect || !rect.width || !box) return;
      var cx = box.left + (settings.contentLeftFrac + settings.contentWidthFrac * 0.5) * box.width;
      var cy = box.top + (settings.contentTopFrac + settings.contentHeightFrac * 0.45) * box.height;
      var featherLen = rect.width * 0.34;
      var layer = ensureLayer();
      for (var i = 0; i < total; i++) {
        var feather = document.createElement("div");
        feather.className = "small-blade-bird-feather" + (golden ? " is-golden" : "");
        var fs = feather.style;
        fs.width = featherLen * (0.7 + 0.6 * Math.random()) + "px";
        fs.height = featherLen * 0.3 + "px";
        fs.left = cx + "px";
        fs.top = cy + "px";
        layer.appendChild(feather);
        deathEls.add(feather);
        var angle = (i / total) * Math.PI * 2 + Math.random() * 0.5;
        var reach = rect.width * (0.55 + Math.random() * 0.75);
        var outX = Math.cos(angle) * reach;
        var outY = Math.sin(angle) * reach * 0.7 - rect.width * 0.25;
        var fallY = rect.width * (0.7 + Math.random() * 0.8);
        var sway = (Math.random() < 0.5 ? -1 : 1) * rect.width * 0.12;
        var spin = (Math.random() < 0.5 ? -1 : 1) * (220 + Math.random() * 300);
        var dur = 1000 + Math.random() * 600;
        trackDeathAnim(feather.animate(
          [
            { transform: "translate(-50%, -50%) translate(0px, 0px) rotate(" + Math.round(angle * 57.3) + "deg) scale(0.6)", opacity: 1 },
            { transform: "translate(-50%, -50%) translate(" + outX + "px, " + outY + "px) rotate(" + Math.round(angle * 57.3 + spin * 0.35) + "deg) scale(1)", opacity: 1, offset: 0.22 },
            { transform: "translate(-50%, -50%) translate(" + (outX + sway) + "px, " + (outY + fallY * 0.5) + "px) rotate(" + Math.round(angle * 57.3 + spin * 0.7) + "deg) scale(1)", opacity: 0.9, offset: 0.6 },
            { transform: "translate(-50%, -50%) translate(" + (outX - sway * 0.5) + "px, " + (outY + fallY) + "px) rotate(" + Math.round(angle * 57.3 + spin) + "deg) scale(0.95)", opacity: 0 }
          ],
          { duration: dur, easing: "cubic-bezier(.12,.62,.4,1)", fill: "forwards" }
        ));
        (function (el, ms) {
          deathTimer(function () {
            deathEls.delete(el);
            if (el.parentNode) el.parentNode.removeChild(el);
          }, ms + 60);
        })(feather, dur);
      }
    }

    // Caja cuadrada {left,top,width,height} centrada en el rect de una casilla,
    // de ancho widthCells veces el ancho de la casilla (object-fit:contain, sin
    // deformar la imagen). Se usa para la copia del cuervo muerto en la casilla.
    function squareBoxForRect(rect, widthCells) {
      if (!rect || !rect.width || !rect.height) return null;
      var side = rect.width * widthCells;
      return {
        left: rect.left + rect.width / 2 - side / 2,
        top: rect.top + rect.height / 2 - side / 2,
        width: side,
        height: side
      };
    }

    // Coloca el numero del multiplicador de una copia centrado sobre su casilla,
    // con el tamano de fuente escalado al ancho de la casilla.
    function applyMultLabelBox(el, rect) {
      if (!rect || !rect.width) return;
      var s = el.style;
      s.left = rect.left + "px";
      s.top = rect.top + "px";
      s.width = rect.width + "px";
      s.height = rect.height + "px";
      s.fontSize = (rect.width * settings.copyMultFontCells) + "px";
    }

    // Impacto de la piedra en un pajaro POSADO: destello, el cuervo se cambia
    // por la imagen del cuervo muerto que CAE recta hasta salir por abajo y deja
    // una COPIA en cada casilla que atraviesa. columnCells: [{ anchor }] (de
    // arriba a abajo) que da game.js con las casillas de la vertical del pajaro.
    // Libera el posadero (el pajaro muere). No-op si el posadero no tiene pajaro.
    function killBird(slotKey, columnCells) {
      var entry = birds.get(slotKey);
      if (!entry) return false;
      var rect = entry.anchorFn && entry.anchorFn();
      var perchBox = boxForRect(rect);
      // Multiplicador que llevaba el cuervo que muere: cada copia que deja al
      // caer mostrara este numero (>=2). Si era 1, las copias van sin numero.
      var deadMult = multiplierOf(entry) || 1;
      var golden = Boolean(entry.golden);
      // Retira el video del pajaro vivo, su badge de multiplicador y libera el
      // posadero (muere toda la pila; el multiplicador se pierde con el cuervo).
      entry.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      if (entry.video && entry.video.parentNode) {
        entry.video.parentNode.removeChild(entry.video);
      }
      if (entry.badgeEl && entry.badgeEl.parentNode) {
        entry.badgeEl.parentNode.removeChild(entry.badgeEl);
      }
      birds.delete(slotKey);
      if (!rect || !perchBox) return true;

      var layer = ensureLayer();

      // Plumas que salen volando con el golpe.
      spawnFeatherBurst(rect, perchBox, golden);

      // Destello del impacto sobre el posadero.
      var flash = document.createElement("div");
      flash.className = "small-blade-bird-flash";
      var fs = flash.style;
      fs.left = perchBox.left + "px";
      fs.top = perchBox.top + "px";
      fs.width = perchBox.width + "px";
      fs.height = perchBox.height + "px";
      layer.appendChild(flash);
      deathEls.add(flash);
      trackDeathAnim(flash.animate(
        [
          { opacity: 0, transform: "scale(0.6)" },
          { opacity: 1, transform: "scale(1)", offset: 0.35 },
          { opacity: 0, transform: "scale(" + settings.flashGrow + ")" }
        ],
        { duration: settings.flashMs, easing: "ease-out", fill: "forwards" }
      ));
      deathTimer(function () {
        deathEls.delete(flash);
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, settings.flashMs + 40);

      // Imagen del cuervo muerto que cae recta hasta salir por abajo. Se centra
      // en la vertical del pajaro y arranca en el sitio del posadero.
      var fallSide = rect.width * settings.fallWidthCells;
      var cellCenterX = rect.left + rect.width / 2;
      var startTop = perchBox.top;
      var startCenterY = startTop + fallSide / 2;
      var fallDist = (window.innerHeight + fallSide) - startTop;

      var dead = document.createElement("img");
      dead.className = "small-blade-bird-dead" + (golden ? " is-golden" : "");
      dead.src = settings.deadImageSrc;
      dead.alt = "";
      var ds = dead.style;
      ds.left = (cellCenterX - fallSide / 2) + "px";
      ds.top = startTop + "px";
      ds.width = fallSide + "px";
      ds.height = fallSide + "px";
      layer.appendChild(dead);
      deathEls.add(dead);
      trackDeathAnim(dead.animate(
        [
          { transform: "translateY(0px) rotate(0deg)" },
          { transform: "translateY(" + fallDist + "px) rotate(" + settings.fallSpinDeg + "deg)" }
        ],
        { duration: settings.fallMs, easing: settings.fallEasing, fill: "forwards" }
      ));
      deathTimer(function () {
        deathEls.delete(dead);
        if (dead.parentNode) dead.parentNode.removeChild(dead);
      }, settings.fallMs + 40);

      // Copia persistente en cada casilla atravesada, soltada en el instante en
      // que la imagen que cae pasa por su centro (secuencia de arriba a abajo).
      (columnCells || []).forEach(function (col) {
        var cellRect = col.anchor && col.anchor();
        if (!cellRect || !cellRect.width) return;
        var cellCenterY = cellRect.top + cellRect.height / 2;
        var p = (cellCenterY - startCenterY) / fallDist;
        if (!(p >= 0)) p = 0;
        if (p > 1) p = 1;
        deathTimer(function () { dropDeathCopy(col.anchor, deadMult, col.cellId, golden); }, Math.round(p * settings.fallMs));
      });
      return true;
    }

    // Coloca (o repone) una copia persistente del cuervo muerto en la casilla
    // que devuelve anchor(). Al clavarse hace un "pum" de luz: un destello
    // radial blanco sobre la casilla + la imagen aparece un poco mas grande,
    // hace un flash blanco (brightness) y ENCOGE hasta su tamano final,
    // quedandose con un aura blanca permanente (via fill:forwards del filter).
    function dropDeathCopy(anchor, mult, cellId, golden) {
      var rect = anchor && anchor();
      var box = squareBoxForRect(rect, settings.copyWidthCells);
      if (!box) return;
      var layer = ensureLayer();

      // "Pum" de luz: destello radial blanco centrado en la casilla.
      if (rect && rect.width) {
        var flash = document.createElement("div");
        flash.className = "small-blade-bird-copy-flash";
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var fSide = rect.width * settings.copyWidthCells * 1.15;
        var ffs = flash.style;
        ffs.left = (cx - fSide / 2) + "px";
        ffs.top = (cy - fSide / 2) + "px";
        ffs.width = fSide + "px";
        ffs.height = fSide + "px";
        layer.appendChild(flash);
        deathEls.add(flash);
        trackDeathAnim(flash.animate(
          [
            { opacity: 0, transform: "scale(0.5)" },
            { opacity: 0.95, transform: "scale(1)", offset: 0.32 },
            { opacity: 0, transform: "scale(" + settings.copyFlashGrow + ")" }
          ],
          { duration: settings.copyFlashMs, easing: "ease-out", fill: "forwards" }
        ));
        deathTimer(function () {
          deathEls.delete(flash);
          if (flash.parentNode) flash.parentNode.removeChild(flash);
        }, settings.copyFlashMs + 40);
      }

      var img = document.createElement("img");
      img.className = "small-blade-bird-dead small-blade-bird-dead-copy" + (golden ? " is-golden" : "");
      img.src = settings.deadImageSrc;
      img.alt = "";
      var s = img.style;
      s.left = box.left + "px";
      s.top = box.top + "px";
      s.width = box.width + "px";
      s.height = box.height + "px";
      if (cellId) img.dataset.cellId = cellId;
      layer.appendChild(img);
      var record = { img: img, anchor: anchor, label: null, cellId: cellId || null, golden: Boolean(golden) };
      deathCopies.push(record);

      // Numero del multiplicador POR ENCIMA de la copia (solo si >=2): sencillo,
      // blanco y bien visible (sin aura ni color de fondo). Persiste con la copia.
      if (mult >= 2 && rect && rect.width) {
        var label = document.createElement("div");
        label.className = "small-blade-bird-dead-copy-mult" + (golden ? " is-golden" : "");
        label.textContent = "×" + mult;
        applyMultLabelBox(label, rect);
        layer.appendChild(label);
        record.label = label;
        trackDeathAnim(label.animate(
          [
            { transform: "scale(0.5)", opacity: 0 },
            { transform: "scale(1.18)", opacity: 1, offset: 0.6 },
            { transform: "scale(1)", opacity: 1 }
          ],
          { duration: settings.copyMultPopMs, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" }
        ));
      }

      // Flash ROJO SANGRE (difuminando a NEGRO hacia fuera) + encoge; termina
      // (fill:forwards) con el aura rojo-sangre/negra permanente, para que
      // persista igual que la copia entre spins. El cuervo dorado, igual pero
      // dorado (tinte + aura de oro).
      var aura = golden ? GOLD_COPY_AURA : RED_COPY_AURA;
      trackDeathAnim(img.animate(
        [
          { opacity: 0, transform: "scale(" + settings.copyLandInScale + ")", filter: aura[0] },
          { opacity: 1, transform: "scale(1.07)", filter: aura[1], offset: 0.42 },
          { opacity: 1, transform: "scale(1)", filter: aura[2] }
        ],
        { duration: settings.copyLandMs, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }
      ));
    }

    // Aura de la copia al clavarse: [inicio, medio, final que se queda].
    var RED_COPY_AURA = [
      "drop-shadow(0 0 24px rgba(200,18,18,1)) drop-shadow(0 0 44px rgba(0,0,0,.95))",
      "drop-shadow(0 0 18px rgba(178,10,10,.95)) drop-shadow(0 0 34px rgba(0,0,0,.9))",
      "drop-shadow(0 0 9px rgba(150,0,0,.9)) drop-shadow(0 0 22px rgba(0,0,0,.82))"
    ];
    var GOLD_COPY_AURA = [
      settings.goldTint + " drop-shadow(0 0 26px rgba(255,214,120,1)) drop-shadow(0 0 44px rgba(120,70,0,.9))",
      settings.goldTint + " drop-shadow(0 0 18px rgba(255,196,80,.95)) drop-shadow(0 0 32px rgba(90,50,0,.85))",
      settings.goldTint + " drop-shadow(0 0 9px rgba(255,190,70,.9)) drop-shadow(0 0 20px rgba(60,30,0,.8))"
    ];

    // Siguiente giro: las copias del cuervo muerto se van deslizandose hacia
    // abajo y desvaneciendose (arrastradas por el giro que arranca).
    function dismissDeathCopiesForSpin() {
      if (!deathCopies.length) return;
      var exiting = deathCopies;
      deathCopies = [];
      exiting.forEach(function (copy) {
        var els = [copy.img];
        if (copy.label) els.push(copy.label);
        els.forEach(function (el) {
          var anim = el.animate(
            [
              { transform: "translateY(0px)", opacity: 1 },
              { transform: "translateY(" + settings.copyExitDropPx + "px)", opacity: 0 }
            ],
            { duration: settings.copyExitMs, easing: settings.copyExitEasing, fill: "forwards" }
          );
          var done = function () {
            if (el.parentNode) el.parentNode.removeChild(el);
          };
          anim.finished.then(done).catch(done);
        });
      });
    }

    // Premio: las copias del cuervo muerto que estan en casillas ganadoras
    // (cuentan como WILD) celebran igual que los simbolos que pagan (ver
    // .symbol-tile.is-paying en style.css). La vibracion va por CSS
    // (.is-paying: translate/rotate, que no chocan con el transform de su
    // caida). El destello va por script porque el aura rojo-sangre es una
    // animacion con fill forwards que taparia uno hecho en CSS: este, de una
    // sola vez, se pone encima un momento y al acabar vuelve a verse el aura.
    var DEAD_COPY_AURA = "drop-shadow(0 0 9px rgba(150,0,0,.9)) " +
      "drop-shadow(0 0 22px rgba(0,0,0,.82)) brightness(1)";
    var DEAD_COPY_FLASH = "drop-shadow(0 0 12px rgba(255,236,200,1)) " +
      "drop-shadow(0 0 30px rgba(255,190,120,.6)) brightness(1.35)";

    function celebrateDeathCopies(cellIds) {
      var wanted = {};
      (cellIds || []).forEach(function (id) { wanted[id] = true; });
      deathCopies.forEach(function (copy) {
        if (!copy.img || !copy.cellId || !wanted[copy.cellId]) return;
        copy.img.classList.add("is-paying");
        // Las doradas llevan delante su tinte de oro (misma lista de funciones
        // en los tres pasos para que el destello se interpole).
        var tint = copy.golden ? settings.goldTint + " " : "";
        var rest = copy.golden ? GOLD_COPY_AURA[2] + " brightness(1)" : DEAD_COPY_AURA;
        // Sin fill: al acabar desaparece sola (no se guarda en deathAnims).
        copy.img.animate(
          [
            { filter: rest },
            { filter: tint + DEAD_COPY_FLASH, offset: 0.14 },
            { filter: rest }
          ],
          { duration: 900, easing: "ease-out" }
        );
      });
    }

    function clearDeathCopyCelebration() {
      deathCopies.forEach(function (copy) {
        if (copy.img) copy.img.classList.remove("is-paying");
      });
    }

    // Recoloca todos los pajaros vivos desde su ancla (p.ej. al redimensionar).
    function reposition() {
      birds.forEach(function (entry) {
        var rect = entry.anchorFn && entry.anchorFn();
        var box = boxForRect(rect);
        if (box) applyBox(entry.video, box);
        if (entry.badgeEl) {
          var bbox = badgeBoxForRect(rect);
          if (bbox) {
            var s = entry.badgeEl.style;
            s.left = bbox.left + "px";
            s.top = bbox.top + "px";
            s.width = bbox.size + "px";
            s.height = bbox.size + "px";
            s.fontSize = (bbox.size * 0.52) + "px";
          }
        }
      });
      deathCopies.forEach(function (copy) {
        var rect = copy.anchor && copy.anchor();
        var box = squareBoxForRect(rect, settings.copyWidthCells);
        if (box) applyBox(copy.img, box);
        if (copy.label) applyMultLabelBox(copy.label, rect);
      });
    }

    // Los cuervos posados se van volando (peticion del usuario, 2026-10-18: al
    // acabar las mini freespins, los que no ha matado la piedra no se quedan
    // acumulados). Cada uno se agacha, salta con un golpe de plumas y se aleja
    // aleteando hacia arriba y hacia fuera, mas pequeno, hasta perderse; su xN
    // se apaga. Deja el posadero libre en el acto (ya no cuenta para la
    // piedra). slotKeys: los que se van (todos si no se pasa). Devuelve
    // cuantos se van; onDone cuando el ultimo se ha perdido.
    function flyAway(slotKeys, onDone) {
      var keys = Array.isArray(slotKeys) ? slotKeys.filter(function (k) { return birds.has(k); }) : Array.from(birds.keys());
      var total = 0;
      var vw = window.innerWidth || 1280, vh = window.innerHeight || 720;
      keys.forEach(function (slotKey, i) {
        var entry = birds.get(slotKey);
        if (!entry) return;
        birds.delete(slotKey);
        if (entry.braceAnim) entry.braceAnim = null;
        var video = entry.video;
        // Quieto y a la vista mientras espera su turno (al cancelar su
        // aparicion volveria a la opacidad 0 del principio).
        if (video) video.style.opacity = "1";
        entry.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        var badge = entry.badgeEl;
        var rect = entry.anchorFn && entry.anchorFn();
        var box = boxForRect(rect);
        var delay = i * settings.flyAwayStaggerMs + Math.round(Math.random() * 70);
        total = Math.max(total, delay + settings.flyAwayMs);
        if (video) deathEls.add(video);
        if (badge) deathEls.add(badge);
        if (!video || !box || typeof video.animate !== "function") {
          deathTimer(function () {
            [video, badge].forEach(function (el) {
              if (!el) return;
              deathEls.delete(el);
              if (el.parentNode) el.parentNode.removeChild(el);
            });
          }, delay);
          return;
        }
        // Hacia su lado de la pantalla, arriba, fuera de la vista.
        var cx = box.left + box.width / 2;
        var dir = cx < vw / 2 ? -1 : 1;
        var dx = dir * (vw * (0.3 + Math.random() * 0.16));
        var dy = -(box.top + box.height + vh * (0.08 + Math.random() * 0.1));
        function k(f, sx, sy, rot, extra) {
          return Object.assign({
            transform: "translate(" + (dx * f).toFixed(1) + "px," + (dy * f).toFixed(1) + "px) rotate(" + (dir * rot).toFixed(1) + "deg) scale(" + sx + "," + sy + ")"
          }, extra || {});
        }
        trackDeathAnim(video.animate([
          { transform: "translate(0px,0px) rotate(0deg) scale(1,1)", opacity: 1 },
          // Se agacha...
          { transform: "translate(0px,5px) rotate(0deg) scale(1.08,0.86)", opacity: 1, offset: 0.12 },
          // ...salta y aletea (las alas abajo/arriba: aplastado/estirado).
          k(0.04, 0.96, 1.1, -4, { offset: 0.2 }),
          k(0.14, 1.02, 0.74, -10, { offset: 0.3 }),
          k(0.26, 0.9, 0.98, -14, { offset: 0.4 }),
          k(0.4, 0.86, 0.62, -16, { offset: 0.5 }),
          k(0.55, 0.74, 0.8, -16, { offset: 0.6 }),
          k(0.7, 0.66, 0.46, -14, { offset: 0.7 }),
          k(0.84, 0.56, 0.6, -12, { opacity: 0.85, offset: 0.82 }),
          k(1, 0.44, 0.34, -10, { opacity: 0 })
        ], { duration: settings.flyAwayMs, delay: delay, easing: settings.flyAwayEasing, fill: "both" }));
        if (badge && typeof badge.animate === "function") {
          trackDeathAnim(badge.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.6)" }], { duration: 260, delay: delay, fill: "forwards" }));
        }
        // El golpe de plumas al saltar.
        deathTimer(function () { spawnFeatherBurst(rect, box, entry.golden, 5); }, delay + Math.round(settings.flyAwayMs * 0.17));
        deathTimer(function () {
          [video, badge].forEach(function (el) {
            if (!el) return;
            deathEls.delete(el);
            if (el.parentNode) el.parentNode.removeChild(el);
          });
        }, delay + settings.flyAwayMs + 60);
      });
      if (onDone) deathTimer(onDone, total + 80);
      return keys.length;
    }

    // Reset total: cancela animaciones y retira todos los pajaros, las copias
    // del cuervo muerto y cualquier visual de muerte en vuelo.
    function clear() {
      if (savedBaseBirds !== null) {
        savedBaseBirds.forEach(function (entry, key) { birds.set({}, entry); });
        savedBaseBirds = null;
      }
      birds.forEach(function (entry) {
        entry.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        if (entry.video && entry.video.parentNode) {
          entry.video.parentNode.removeChild(entry.video);
        }
        if (entry.badgeEl && entry.badgeEl.parentNode) {
          entry.badgeEl.parentNode.removeChild(entry.badgeEl);
        }
      });
      birds.clear();
      deathTimers.forEach(function (id) { window.clearTimeout(id); });
      deathTimers.clear();
      deathAnims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      deathAnims.clear();
      deathEls.forEach(function (el) {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      deathEls.clear();
      deathCopies.forEach(function (copy) {
        if (copy.img && copy.img.parentNode) copy.img.parentNode.removeChild(copy.img);
        if (copy.label && copy.label.parentNode) copy.label.parentNode.removeChild(copy.label);
      });
      deathCopies = [];
    }

    window.addEventListener("resize", reposition);

    return {
      warmCache: warmCache,
      perchAt: perchAt,
      landBird: landBird,
      isOccupied: isOccupied,
      occupiedCount: function () { return birds.size; },
      rectAt: function (slotKey) {
        var entry = birds.get(slotKey);
        var rect = entry && entry.anchorFn ? entry.anchorFn() : null;
        return rect && rect.width ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
      },
      multiplierAt: function (slotKey) { return multiplierOf(birds.get(slotKey)); },
      isGoldenAt: function (slotKey) { var e = birds.get(slotKey); return Boolean(e && e.golden); },
      killBird: killBird,
      flyAway: flyAway,
      advanceBaseSpin: advanceBaseSpin,
      setBonusSuspended: setBonusSuspended,
      exportEconomicState: function () {
        var source = savedBaseBirds !== null ? savedBaseBirds : birds;
        return Array.from(source.entries()).filter(function (pair) { return pair[1].members; }).map(function (pair) {
          return { key: pair[0], members: pair[1].members.map(function (m) { return Object.assign({}, m); }) };
        });
      },
      importEconomicState: function (snapshot, anchorForKey) {
        if (savedBaseBirds !== null) throw new Error("Cannot switch crow stake during a bonus");
        clearSlots(Array.from(birds.keys()));
        (snapshot || []).forEach(function (slot) {
          if (!slot.members.length) return;
          slot.members.forEach(function (m) {
            landBird(slot.key, anchorForKey(slot.key), { golden: m.golden, factor: m.value });
          });
          var entry = birds.get(slot.key);
          if (entry) entry.members = slot.members.map(function (m) { return Object.assign({}, m); });
        });
      },
      brace: brace,
      dismissDeathCopiesForSpin: dismissDeathCopiesForSpin,
      celebrateDeathCopies: celebrateDeathCopies,
      clearDeathCopyCelebration: clearDeathCopyCelebration,
      clearSlots: clearSlots,
      reposition: reposition,
      clear: clear,
      settings: settings
    };
  }

  window.OssuarySmallBladeBirdPerch = { create: createBirdPerch };
})();
