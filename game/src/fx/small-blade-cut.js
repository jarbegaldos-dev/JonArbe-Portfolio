(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Mecanica "cuchilla pequena" (small blade cut) — SOLO VISUAL.
  //
  // Cuando una cuchilla pequena aterriza, esta capa reproduce una secuencia
  // puramente cosmetica: la cuchilla cae por gravedad y, un instante despues,
  // caen todos los simbolos afectados, saliendo por la parte inferior de la
  // pantalla. No hay fundido: solo caida.
  //
  // Contrato de independencia (importante):
  //  - NO toca el estado interno de los reels, ni strips, ni outcome, ni locks,
  //    ni pagos. El game.js resuelve QUE celdas caen (lectura de simbolos ya
  //    aterrizados) y le pasa a este modulo los ELEMENTOS DOM (.symbol-tile) ya
  //    localizados. Este modulo solo clona esos tiles en una capa aparte y los
  //    anima; los tiles originales solo se ocultan visualmente y se restauran
  //    con clear().
  //  - Es totalmente independiente de la GRAN CUCHILLA del bonus (rig/esqueletos/
  //    caja): no comparte estado, DOM, ni clases con aquella.
  //  - Preparada para futuras ampliaciones: run() acepta VARIOS grupos (varias
  //    cuchillas en la misma tirada) y todos los tiempos/curvas son configurables.
  // ---------------------------------------------------------------------------

  var DEFAULTS = {
    // 0) RESALTE al aparecer la cuchilla (antes de caer): todo el tablero se
    //    oscurece un poco (velo) EXCEPTO la(s) cuchilla(s), que tiemblan con
    //    un contorno rojo sangre. Al caer, los simbolos van iluminando las
    //    casillas inferiores a su paso; al terminar todo, la luz vuelve a la
    //    normalidad (fade del velo). Todo esto es un velo + clones por encima:
    //    no toca el render de los reels.
    highlightHoldMs: 750,
    dimFadeInMs: 180,
    dimFadeOutMs: 340,
    cellGlowMs: 560,
    // Rastro de sangre que la cuchilla deja por donde pasa: banda de regueros
    // (CSS .small-blade-blood-trail) que crece con la cuchilla (misma curva de
    // caida) y se seca despues (linger + fade). Ancho relativo a la casilla.
    bloodTrailWidthFrac: 0.46,
    bloodTrailLingerMs: 300,
    bloodTrailFadeMs: 650,
    bloodTrailMinRunnels: 5,
    bloodTrailMaxRunnels: 9,
    bloodTrailMinDrops: 10,
    bloodTrailMaxDrops: 18,
    bloodTrailMinSpecks: 16,
    bloodTrailMaxSpecks: 28,
    // 1) Pausa para que el jugador identifique la cuchilla.
    initialPauseMs: 200,
    // 4) Fraccion de segundo entre que la cuchilla empieza a caer y empiezan a
    //    caer los simbolos afectados.
    symbolFallDelayMs: 160,
    // Duraciones de caida (sensacion de peso + velocidad). La cuchilla se
    // ralentizo un 15% respecto al valor original de 360ms (peticion usuario).
    bladeFallMs: 414,
    symbolFallMs: 520,
    // Pequeno escalonado entre simbolos afectados (de arriba hacia abajo) para
    // que se sienta como "perdieron el soporte" en cascada, no un bloque unico.
    symbolStaggerMs: 24,
    // Giro LENTO de los simbolos cortados mientras caen (sensacion de corte
    // real): cada simbolo rota unos pocos grados hacia un lado aleatorio
    // (izquierda o derecha) durante toda la caida. La cuchilla NO rota.
    symbolRotateMinDeg: 14,
    symbolRotateMaxDeg: 32,
    // Curvas ease-in (aceleracion tipo gravedad): arrancan lento y aceleran.
    bladeEasing: "cubic-bezier(0.45, 0.02, 0.9, 0.32)",
    symbolEasing: "cubic-bezier(0.38, 0.00, 0.85, 0.30)",
    // Margen extra bajo el borde inferior para asegurar que sale de pantalla.
    fallBufferPx: 72
  };

  function createSmallBladeCut(options) {
    options = options || {};
    var settings = Object.assign({}, DEFAULTS, options.settings || {});
    var layerParent = options.layerParent || document.body;
    // Callback opcional: se invoca UNA vez por simbolo cortado, en el
    // instante exacto en que ese simbolo empieza a caer (lo usa game.js para
    // el parpadeo rojo del cofre central, coordinado con cada corte).
    var onSymbolCut = typeof options.onSymbolCut === "function" ? options.onSymbolCut : null;
    // Callback opcional: dado el rect de la cuchilla, devuelve el limite
    // inferior (coordenada Y en pantalla) al que debe recortarse su rastro de
    // sangre, o null/undefined si no hay limite. Lo usa game.js para que el
    // rastro de la cuchilla del rodillo central no se vea encima del cofre.
    var getBloodTrailMaxBottom = typeof options.getBloodTrailMaxBottom === "function"
      ? options.getBloodTrailMaxBottom
      : null;

    var layerEl = null;
    var hiddenTiles = new Set();
    var activeClones = new Set();
    var activeAnimations = new Set();
    // Velo de oscurecimiento del resalte (elemento propio, fuera de la capa
    // de clones: va POR DEBAJO del video de la puerta y de los clones).
    var dimEl = null;
    // Cada llamada a run() (o clear()) invalida los efectos en vuelo anteriores.
    var runToken = 0;

    function triggerAudio(eventName, payload) {
      if (!window.OssuaryAudio || typeof window.OssuaryAudio.trigger !== "function") return;
      window.OssuaryAudio.trigger(eventName, payload || {});
    }

    function ensureLayer() {
      if (layerEl && layerEl.isConnected) return layerEl;
      layerEl = document.createElement("div");
      layerEl.className = "small-blade-cut-layer";
      layerParent.appendChild(layerEl);
      return layerEl;
    }

    function hideOriginal(tileEl) {
      if (!tileEl) return;
      tileEl.classList.add("small-blade-cut-hidden");
      hiddenTiles.add(tileEl);
    }

    function wait(ms) {
      return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
    }

    // Velo del resalte: oscurece todo el juego un poco; lo que deba verse a
    // plena luz (cuchillas resaltadas, destellos, clones que caen, video de
    // la puerta) vive en capas con z-index superior.
    function spawnDim(token) {
      removeDim();
      var el = document.createElement("div");
      el.className = "small-blade-cut-dim";
      el.style.transitionDuration = settings.dimFadeInMs + "ms";
      layerParent.appendChild(el);
      dimEl = el;
      window.requestAnimationFrame(function () {
        if (token !== runToken || el !== dimEl) return;
        el.classList.add("is-on");
      });
    }

    function fadeOutDim() {
      if (!dimEl) return Promise.resolve();
      var el = dimEl;
      dimEl = null;
      el.style.transitionDuration = settings.dimFadeOutMs + "ms";
      el.classList.remove("is-on");
      return wait(settings.dimFadeOutMs + 40).then(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    }

    function removeDim() {
      if (dimEl && dimEl.parentNode) dimEl.parentNode.removeChild(dimEl);
      dimEl = null;
    }

    // Clon de RESALTE de la cuchilla: copia del tile a plena luz por encima
    // del velo, temblando con contorno rojo sangre (clase CSS). Se retira en
    // el instante en que la cuchilla empieza a caer (el clon de la caida toma
    // el relevo conservando el contorno rojo).
    function spawnBladeHighlight(tileEl) {
      if (!tileEl) return null;
      var rect = tileEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      var clone = tileEl.cloneNode(true);
      // El ORIGINAL se oculta mientras el clon tiembla por encima: si quedara
      // visible (oscurecido bajo el velo) se veria "la misma cuchilla debajo"
      // asomando por los bordes con cada sacudida. hiddenTiles lo restaura en
      // clear() si la secuencia se cancela; si sigue, dropTile lo re-oculta.
      hideOriginal(tileEl);
      clone.classList.add("small-blade-cut-clone", "small-blade-highlight-blade");
      clone.classList.remove("small-blade-cut-hidden");
      clone.removeAttribute("id");
      var s = clone.style;
      s.position = "fixed";
      s.margin = "0";
      s.left = rect.left + "px";
      s.top = rect.top + "px";
      s.width = rect.width + "px";
      s.height = rect.height + "px";
      s.transform = "none";
      s.transition = "none";
      s.pointerEvents = "none";
      ensureLayer().appendChild(clone);
      activeClones.add(clone);
      return clone;
    }

    function removeClone(clone) {
      if (!clone) return;
      activeClones.delete(clone);
      if (clone.parentNode) clone.parentNode.removeChild(clone);
    }

    function rand(min, max) {
      return min + Math.random() * (max - min);
    }

    function randomInt(min, max) {
      return Math.floor(rand(min, max + 1));
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function createBloodMark(className, styles) {
      var el = document.createElement("i");
      el.className = className;
      Object.keys(styles || {}).forEach(function (key) {
        el.style[key] = styles[key];
      });
      return el;
    }

    function populateBloodTrail(trail, width, height) {
      var sheet = createBloodMark("small-blade-blood-trail__sheet", {
        left: rand(width * 0.12, width * 0.28) + "px",
        top: "0px",
        width: rand(width * 0.44, width * 0.68) + "px",
        height: rand(height * 0.22, height * 0.38) + "px",
        opacity: rand(0.42, 0.66).toFixed(2),
        transform: "skewX(" + rand(-5, 5).toFixed(2) + "deg)"
      });
      trail.appendChild(sheet);

      var runnelCount = randomInt(settings.bloodTrailMinRunnels, settings.bloodTrailMaxRunnels);
      for (var i = 0; i < runnelCount; i++) {
        var isMain = i < 2;
        var runnelWidth = isMain ? rand(width * 0.09, width * 0.18) : rand(width * 0.035, width * 0.11);
        var runnelHeight = isMain
          ? rand(height * 0.96, height * 1.12)
          : rand(height * 0.34, height * 0.86);
        var left = clamp(rand(width * -0.08, width * 0.92), -width * 0.08, width - runnelWidth * 0.35);
        var kink = rand(-width * 0.16, width * 0.16);
        var runnel = createBloodMark("small-blade-blood-trail__runnel" + (isMain ? " small-blade-blood-trail__runnel--main" : ""), {
          left: left + "px",
          top: rand(-height * 0.015, height * 0.06) + "px",
          width: runnelWidth + "px",
          height: runnelHeight + "px",
          opacity: rand(isMain ? 0.78 : 0.42, isMain ? 0.98 : 0.76).toFixed(2),
          transform: "translateX(" + kink.toFixed(2) + "px) rotate(" + rand(-2.6, 2.6).toFixed(2) + "deg)"
        });
        runnel.style.setProperty("--blood-runnel-dark", rand(0.34, 0.68).toFixed(2));
        trail.appendChild(runnel);
      }

      var bottomDrop = createBloodMark("small-blade-blood-trail__bottom-drop", {
        left: rand(width * 0.28, width * 0.7) + "px",
        top: rand(height * 0.88, height * 0.98) + "px",
        width: rand(width * 0.08, width * 0.16) + "px",
        height: rand(width * 0.12, width * 0.24) + "px",
        opacity: rand(0.46, 0.78).toFixed(2)
      });
      trail.appendChild(bottomDrop);

      var dropCount = randomInt(settings.bloodTrailMinDrops, settings.bloodTrailMaxDrops);
      for (var d = 0; d < dropCount; d++) {
        var dropSize = rand(width * 0.035, width * 0.14);
        var dropX = rand(-width * 0.2, width * 1.12);
        var dropY = rand(height * 0.08, height * 0.96);
        var drop = createBloodMark("small-blade-blood-trail__drop", {
          left: dropX + "px",
          top: dropY + "px",
          width: dropSize + "px",
          height: (dropSize * rand(0.72, 1.45)) + "px",
          opacity: rand(0.32, 0.82).toFixed(2),
          transform: "rotate(" + rand(-18, 18).toFixed(2) + "deg)"
        });
        trail.appendChild(drop);

        if (Math.random() < 0.38) {
          var tail = createBloodMark("small-blade-blood-trail__drop-tail", {
            left: (dropX + dropSize * rand(0.32, 0.62)) + "px",
            top: (dropY - dropSize * rand(0.25, 0.8)) + "px",
            width: rand(1.2, 3.6) + "px",
            height: rand(dropSize * 1.8, dropSize * 4.8) + "px",
            opacity: rand(0.22, 0.52).toFixed(2),
            transform: "rotate(" + rand(-5, 5).toFixed(2) + "deg)"
          });
          trail.appendChild(tail);
        }
      }

      var speckCount = randomInt(settings.bloodTrailMinSpecks, settings.bloodTrailMaxSpecks);
      for (var s = 0; s < speckCount; s++) {
        var speckSize = rand(1.2, 4.2);
        var sideBias = Math.random() < 0.42
          ? (Math.random() < 0.5 ? rand(-width * 0.34, width * 0.08) : rand(width * 0.88, width * 1.26))
          : rand(width * 0.02, width * 0.94);
        var speck = createBloodMark("small-blade-blood-trail__speck", {
          left: sideBias + "px",
          top: rand(height * 0.02, height * 0.72) + "px",
          width: speckSize + "px",
          height: (speckSize * rand(0.65, 1.35)) + "px",
          opacity: rand(0.18, 0.58).toFixed(2),
          transform: "rotate(" + rand(-24, 24).toFixed(2) + "deg)"
        });
        trail.appendChild(speck);
      }
    }

    // Rastro de sangre de la cuchilla: banda de regueros anclada al borde
    // inferior de la cuchilla que se ESTIRA hacia abajo con su misma curva de
    // caida (scaleY con transform-origin top: la punta del rastro acompaña a
    // la cuchilla), aguanta un instante y se seca (fade). Va al FONDO de la
    // capa de clones: la cuchilla y los simbolos caen por delante.
    function spawnBloodTrail(rect, token) {
      if (token !== runToken || !rect || !rect.width) return;
      var trail = document.createElement("div");
      trail.className = "small-blade-blood-trail";
      var width = rect.width * rand(settings.bloodTrailWidthFrac * 0.92, settings.bloodTrailWidthFrac * 1.42);
      var top = rect.top + rect.height * 0.55;
      var naturalBottom = window.innerHeight + settings.fallBufferPx;
      var maxBottom = getBloodTrailMaxBottom ? getBloodTrailMaxBottom(rect) : null;
      var bottom = (typeof maxBottom === "number" && maxBottom > top && maxBottom < naturalBottom)
        ? maxBottom
        : naturalBottom;
      var s = trail.style;
      s.left = (rect.left + (rect.width - width) / 2) + "px";
      s.top = top + "px";
      s.width = width + "px";
      s.height = (bottom - top) + "px";
      s.transform = "scaleY(0)";
      s.setProperty("--blood-trail-tilt", rand(-1.8, 1.8).toFixed(2) + "deg");
      s.setProperty("--blood-trail-shift", rand(-rect.width * 0.05, rect.width * 0.05).toFixed(2) + "px");
      populateBloodTrail(trail, width, bottom - top);
      var layer = ensureLayer();
      layer.insertBefore(trail, layer.firstChild);
      activeClones.add(trail);
      var grow = trail.animate(
        [
          { transform: "scaleY(0.02)", opacity: 0.18 },
          { opacity: 0.92, offset: 0.28 },
          { transform: "scaleY(1)", opacity: 1 }
        ],
        { duration: settings.bladeFallMs, easing: settings.bladeEasing, fill: "forwards" }
      );
      activeAnimations.add(grow);
      var dry = function () {
        activeAnimations.delete(grow);
        if (token !== runToken || !trail.isConnected) return;
        var fade = trail.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          {
            delay: settings.bloodTrailLingerMs,
            duration: settings.bloodTrailFadeMs,
            easing: "ease-in",
            fill: "forwards"
          }
        );
        activeAnimations.add(fade);
        var done = function () {
          activeAnimations.delete(fade);
          activeClones.delete(trail);
          if (trail.parentNode) trail.parentNode.removeChild(trail);
        };
        fade.finished.then(done).catch(done);
      };
      grow.finished.then(dry).catch(function () {
        activeAnimations.delete(grow);
      });
    }

    // Destello de una casilla al paso del simbolo que cae: luz calida que se
    // enciende y apaga sobre el rect de la casilla (mix-blend-mode screen).
    function flashCellGlow(tileEl, token) {
      if (token !== runToken || !tileEl) return;
      var rect = tileEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var glow = document.createElement("div");
      glow.className = "small-blade-cell-glow";
      var s = glow.style;
      s.left = rect.left + "px";
      s.top = rect.top + "px";
      s.width = rect.width + "px";
      s.height = rect.height + "px";
      ensureLayer().appendChild(glow);
      activeClones.add(glow);
      var anim = glow.animate(
        [{ opacity: 0 }, { opacity: 0.95, offset: 0.3 }, { opacity: 0 }],
        { duration: settings.cellGlowMs, easing: "ease-out", fill: "forwards" }
      );
      activeAnimations.add(anim);
      var done = function () {
        activeAnimations.delete(anim);
        activeClones.delete(glow);
        if (glow.parentNode) glow.parentNode.removeChild(glow);
      };
      anim.finished.then(done).catch(done);
    }

    // Angulo de giro aleatorio para un simbolo cortado: magnitud entre min y
    // max, signo (izquierda/derecha) al azar. La cuchilla no usa esto.
    function randomCutRotationDeg() {
      var magnitude = settings.symbolRotateMinDeg +
        Math.random() * (settings.symbolRotateMaxDeg - settings.symbolRotateMinDeg);
      return (Math.random() < 0.5 ? -1 : 1) * magnitude;
    }

    // Clona un tile detenido en la capa fija y lo anima cayendo fuera de pantalla.
    // El tile original queda oculto (no borrado) hasta clear().
    // rotateDeg: giro total (lento, lineal durante toda la caida) del clon;
    // 0 = sin giro (cuchilla). cloneClass: clase extra opcional (p.ej. el
    // contorno rojo de la cuchilla resaltada durante su caida).
    function dropTile(tileEl, durationMs, easing, token, rotateDeg, cloneClass) {
      return new Promise(function (resolve) {
        if (!tileEl || token !== runToken) { resolve(); return; }
        var rect = tileEl.getBoundingClientRect();
        if (!rect.width || !rect.height) { hideOriginal(tileEl); resolve(); return; }

        hideOriginal(tileEl);

        var clone = tileEl.cloneNode(true);
        clone.classList.add("small-blade-cut-clone");
        if (cloneClass) clone.classList.add(cloneClass);
        clone.classList.remove("small-blade-cut-hidden");
        clone.removeAttribute("id");
        var s = clone.style;
        s.position = "fixed";
        s.margin = "0";
        s.left = rect.left + "px";
        s.top = rect.top + "px";
        s.width = rect.width + "px";
        s.height = rect.height + "px";
        s.transform = "none";
        s.transition = "none";
        s.pointerEvents = "none";
        ensureLayer().appendChild(clone);
        activeClones.add(clone);

        var fall = window.innerHeight - rect.top + settings.fallBufferPx;
        // Caida por la propiedad CSS `translate` (no por transform): en el
        // orden de composicion CSS, `translate` se aplica ANTES que `rotate`,
        // asi que la trayectoria es SIEMPRE vertical recta aunque el clon vaya
        // rotado. (Con translateY dentro de `transform` ocurria lo contrario:
        // el vector de caida se inclinaba con el angulo y el simbolo caia en
        // diagonal.)
        var anim = clone.animate(
          [
            { translate: "0 0" },
            { translate: "0 " + fall + "px" }
          ],
          { duration: durationMs, easing: easing, fill: "forwards" }
        );
        activeAnimations.add(anim);

        // Giro del simbolo cortado SOBRE SU PROPIO CENTRO (transform-origin
        // por defecto 50% 50%), sentido horario o antihorario: animacion
        // APARTE sobre la propiedad CSS `rotate` con easing LINEAL, para que
        // el giro sea lento y constante aunque la caida acelere. Si
        // compartiera keyframes con la caida heredaria el ease-in y pareceria
        // un latigazo al final en vez de un vuelco natural por el corte.
        var spin = rotateDeg || 0;
        if (spin) {
          var spinAnim = clone.animate(
            [{ rotate: "0deg" }, { rotate: spin + "deg" }],
            { duration: durationMs, easing: "linear", fill: "forwards" }
          );
          activeAnimations.add(spinAnim);
          spinAnim.finished.then(function () {
            activeAnimations.delete(spinAnim);
          }).catch(function () {
            activeAnimations.delete(spinAnim);
          });
        }

        var done = function () {
          activeAnimations.delete(anim);
          activeClones.delete(clone);
          if (clone.parentNode) clone.parentNode.removeChild(clone);
          resolve();
        };
        // .catch cubre el rechazo de finished cuando la animacion se cancela
        // (clear()): en ese caso el clon ya se retiro, done() es idempotente.
        anim.finished.then(done).catch(done);
      });
    }

    // groups: [{ bladeTileEl, fallingTileEls: [tileEl, ...] }, ...]
    // Un grupo por cuchilla. fallingTileEls = tiles afectados por esa cuchilla.
    function run(groups) {
      clear();
      groups = (groups || []).filter(function (g) { return g && g.bladeTileEl; });
      if (!groups.length) return Promise.resolve();
      var token = ++runToken;

      // 0/1) RESALTE + pausa: velo de oscurecimiento sobre todo el juego y
      //      clones de las cuchillas a plena luz por encima, temblando con
      //      contorno rojo sangre, para que el jugador las identifique.
      spawnDim(token);
      var bladeHighlights = groups.map(function (g) {
        return spawnBladeHighlight(g.bladeTileEl);
      });
      triggerAudio("small_blade_tremble_started", { blades: bladeHighlights.filter(Boolean).length });

      return wait(settings.initialPauseMs + settings.highlightHoldMs).then(function () {
        if (token !== runToken) return;
        var pending = [];
        triggerAudio("small_blade_tremble_stopped", {});
        triggerAudio("small_blade_fall_started", { blades: groups.length });

        // 2/3) La(s) cuchilla(s) caen (sin giro: caida recta de guillotina).
        //      El clon del resalte se retira y el de la caida toma el relevo
        //      conservando el contorno rojo.
        groups.forEach(function (g, gi) {
          removeClone(bladeHighlights[gi]);
          // El rastro de sangre arranca a la vez que la cuchilla y crece con
          // su misma curva: la punta del reguero va pegada a la hoja.
          var bladeRect = g.bladeTileEl ? g.bladeTileEl.getBoundingClientRect() : null;
          if (bladeRect && bladeRect.width) spawnBloodTrail(bladeRect, token);
          // El pulso del cofre (onSymbolCut) va POR simbolo caido. Si esta
          // cuchilla no corta ningun simbolo (fila inferior, columna ya vacia,
          // celdas ya reclamadas...) no habria ningun pulso y el cofre no
          // reaccionaria: en ese caso se dispara aqui, al caer la propia
          // cuchilla, para que SIEMPRE haya un brillo/temblor por cuchilla.
          if (onSymbolCut && token === runToken &&
              (!g.fallingTileEls || !g.fallingTileEls.length)) {
            try { onSymbolCut(); } catch (e) {}
          }
          pending.push(dropTile(g.bladeTileEl, settings.bladeFallMs, settings.bladeEasing, token, 0, "small-blade-glow-red"));
        });
        var bladeFallAudioStop = wait(settings.bladeFallMs).then(function () {
          if (token === runToken) triggerAudio("small_blade_fall_stopped", {});
        });
        pending.push(bladeFallAudioStop);

        // 4/5) Un instante despues, caen los simbolos afectados (de arriba
        //      abajo, con escalonado suave), iluminando cada casilla a su
        //      paso (destello sobre el rect de la celda al arrancar su caida).
        var symbolsDrop = wait(settings.symbolFallDelayMs).then(function () {
          if (token !== runToken) return;
          var subDrops = [];
          groups.forEach(function (g) {
            var tiles = (g.fallingTileEls || []).slice().sort(function (a, b) {
              return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
            });
            tiles.forEach(function (tileEl, i) {
              subDrops.push(
                wait(i * settings.symbolStaggerMs).then(function () {
                  flashCellGlow(tileEl, token);
                  // Una vez por simbolo cortado, en el instante del corte
                  // (parpadeo rojo del cofre central, ver game.js).
                  if (onSymbolCut && token === runToken) {
                    try { onSymbolCut(); } catch (e) {}
                  }
                  return dropTile(tileEl, settings.symbolFallMs, settings.symbolEasing, token, randomCutRotationDeg());
                })
              );
            });
          });
          return Promise.all(subDrops);
        });
        pending.push(symbolsDrop);

        // 6) Todo ha caido: la iluminacion vuelve a la normalidad (fade del
        //    velo). Si run()/clear() re-entraron, clear ya retiro el velo.
        return Promise.all(pending).then(function () {
          if (token !== runToken) return;
          return fadeOutDim();
        });
      });
    }

    // Transfiere al llamador la propiedad de los tiles actualmente ocultos:
    // devuelve la lista y los olvida SIN quitarles la clase. A partir de aqui
    // clear() ya no los restaura; el llamador gestiona su visibilidad (se usa
    // para que los huecos del corte persistan durante el siguiente giro).
    function detachHiddenTiles() {
      var detached = Array.from(hiddenTiles);
      hiddenTiles.clear();
      return detached;
    }

    // Cancela cualquier efecto en vuelo, retira los clones y restaura la
    // visibilidad de los tiles originales. Debe llamarse al arrancar el
    // siguiente spin para dejar el tablero limpio.
    function clear() {
      runToken++;
      triggerAudio("small_blade_tremble_stopped", {});
      triggerAudio("small_blade_fall_stopped", {});
      activeAnimations.forEach(function (anim) {
        try { anim.cancel(); } catch (e) {}
      });
      activeAnimations.clear();
      activeClones.forEach(function (clone) {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
      });
      activeClones.clear();
      hiddenTiles.forEach(function (tileEl) {
        tileEl.classList.remove("small-blade-cut-hidden");
      });
      hiddenTiles.clear();
      removeDim();
      if (layerEl && layerEl.parentNode) {
        layerEl.parentNode.removeChild(layerEl);
      }
      layerEl = null;
    }

    return {
      run: run,
      clear: clear,
      detachHiddenTiles: detachHiddenTiles,
      settings: settings
    };
  }

  window.OssuarySmallBladeCut = {
    create: createSmallBladeCut,
    DEFAULTS: DEFAULTS
  };
})();
