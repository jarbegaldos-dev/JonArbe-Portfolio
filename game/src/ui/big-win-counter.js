(function () {
  "use strict";

  function createBigWinCounter(options) {
    var stage = options.stage;
    var formatCurrency = options.formatCurrency;
    var hooks = options.hooks || {};
    var overlay = null;
    var value = null;
    var animationFrame = null;
    var pauseTimer = null;
    var active = false;
    var counting = false;
    var glowEl = null;
    var flareEl = null;
    var pulseEl = null;

    // ------------------------------------------------------------------
    // RITMO DEL CONTEO según el tamaño del premio (m = premio / apuesta).
    // A petición del usuario (2026-10-09: con 10, 20 o 40 € se hacía
    // pesado, x40 tardaba 21 s) el contador solo se alarga cuando el premio
    // lo merece, y con música el número SIEMPRE aterriza en un golpe:
    //
    //   x10–x25    CORTO, sin música: un solo conteo que frena al llegar
    //              (1.2 s en x10, 2 s en x25; el x25 de la ruleta va aquí).
    //   >x25–x100  1 COMPÁS: la música arranca con el contador y el número
    //              aterriza en su primer platillo (~4.2 s).
    //   x100–x250  2 compases (~8.2 s), con parón en el primer platillo.
    //   x250–x500  3 compases (~12.2 s).
    //   x500+      COMPLETO: conteo con loop, parón en x10, golpe en x25
    //              que arranca la música y el resto repartido en sus 4
    //              golpes (~18 s).
    //
    // Con música, la velocidad de los números se adapta sola para clavar
    // cada golpe; subida escalonada (cada tramo suelta más dinero que el
    // anterior) y tras cada golpe el número aguanta un instante.
    // Turbo: lo que va sin música corre 2.5x (speedMs); lo que va con música
    // no se acelera (se descuadraría): usa la mitad de compases.
    // ------------------------------------------------------------------
    var QUICK_MIN_MS = 1200;          // conteo corto en x10
    var QUICK_MAX_MS = 2000;          // conteo corto en x25
    var MUSIC_MULTIPLE = 25;          // por encima de esto hay música
    var FULL_SHOW_MULTIPLE = 500;     // desde aquí, el espectáculo completo
    // Compases de música según el premio, por debajo de FULL_SHOW_MULTIPLE.
    var MUSIC_BARS = [
      { below: 100, bars: 1 },
      { below: 250, bars: 2 },
      { below: FULL_SHOW_MULTIPLE, bars: 3 }
    ];
    // Espectáculo completo, antes de la música: 0 → x10, parón, x10 → x25.
    // Antes 1.8 s + 0.7 s + 2.7 s: lo pesado de esperar a que la música
    // arrancara a contar rápido.
    var FULL_TO_X10_MS = 900;
    var PAUSE_X10_MS = 450;
    var FULL_X10_TO_X25_MS = 1100;
    // Golpes de la música épica (assets/audio/fx/big_win_counter_epic.wav:
    // 120 BPM, un platillo cada 4 s). Platillos medidos por la subida de
    // agudos (ventana de 5 ms) en 4.205, 8.185 y 12.205 s; el número
    // aterriza 30 ms después (antes 4.30/8.28/12.30, medidos por el grave,
    // llegaban casi una décima tarde). El cuarto, 15.78 s, es el final del
    // espectáculo completo que el usuario dio por bueno: el cuervo se posa
    // con el platillo de 16.22 s.
    var EPIC_BEAT_MS = [4235, 8215, 12235, 15780];
    // Fracción del premio con música alcanzada en cada golpe, según los
    // compases que dure: subida escalonada.
    var BEAT_FRACTIONS = {
      1: [1],
      2: [0.4, 1],
      3: [0.24, 0.55, 1],
      4: [0.18, 0.40, 0.68, 1]
    };
    var BEAT_FLAT_RATIO = 0.18;  // tras cada golpe el número aguanta quieto un momento

    // Intensidad de la escena (oscuridad del fondo + luz de los FX), 0..1, en
    // la variable CSS --bw-i del overlay. Crece CON EL PREMIO mientras cuenta
    // (nada aparece de golpe): empieza tenue, llega a INTENSITY_AT_MUSIC al
    // entrar la musica (en x25 en el completo; desde el principio en los de
    // 1-3 compases, suavizado por la entrada --bw-e) y a 1 en el final. Sin
    // musica (conteo corto) termina en INTENSITY_NO_MUSIC.
    var INTENSITY_START = 0.12;
    var INTENSITY_AT_MUSIC = 0.72;
    var INTENSITY_NO_MUSIC = 0.82;
    // Al pararse el contador, el cuervo del juego base (mismo video) se posa
    // sobre el digito central de la parte entera, tras este retardo (cuando el
    // golpe de escala del final ya ha vuelto a 1 y el digito esta en su sitio).
    var NUMBER_CROW_DELAY_MS = 360;
    // Solo con premios de x50 la apuesta o mas (peticion del usuario,
    // 2026-10-24): en los menores el numero se queda sin cuervo.
    var NUMBER_CROW_MIN_MULTIPLE = 50;
    // Entrada suave desde cero: --bw-e sube 0 -> 1 en este tiempo al aparecer
    // el contador y multiplica oscuridad y FX (luego manda --bw-i).
    var ENTER_MS = 1400;
    // Ganancia maxima (x20.000 la apuesta, segun el usuario): el final no es el
    // cuervo posado sino el CUERVO MUERTO grande cayendo debajo de las cifras.
    // Umbral solo visual; el juego no define un tope de premio en codigo.
    var BIG_WIN_MAX_MULTIPLE = 20000;
    var DEAD_CROW_SRC = "assets/symbols/bird-dead.png";
    // Instante del impacto dentro de la caida (big-win-dead-crow-fall en CSS).
    var DEAD_CROW_IMPACT_MS = 620;
    // Ganancia maxima: tras el impacto del cuervo cae un cartel de madera
    // sobre las cifras y en el se escribe "MAX WIN" con sangre.
    var MAX_WIN_SIGN_DELAY_MS = DEAD_CROW_IMPACT_MS + 180;
    var MAX_WIN_TEXT = "MAX WIN";

    function speedMs(ms) {
      if (window.OssuaryGameSpeed && typeof window.OssuaryGameSpeed.ms === "function") {
        return window.OssuaryGameSpeed.ms(ms);
      }
      return Math.max(0, Math.round(Number(ms) || 0));
    }

    function ensureElements() {
      if (overlay) return;
      overlay = document.createElement("div");
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.display = "none";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "2147483647";
      overlay.style.isolation = "isolate";
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 240ms ease";
      // Oscurecido de pantalla + FX dark fantasy detras del numero (style.css,
      // .big-win-counter*): niebla rojiza, haces de luz de cripta, circulo de
      // simbolos macabros, reliquias del arte del juego bailando en espiral,
      // nucleo de brasa que tiembla, brasas y ceniza, cuervos que cruzan al
      // entrar la musica, onda carmesi y latido rojo en cada golpe (flare,
      // desde punchValue) y el cuervo que se posa sobre el numero final. Todo
      // se oscurece y enciende poco a poco con el premio (--bw-i, ver
      // setIntensity). Solo visual.
      overlay.className = "big-win-counter";
      var fx = document.createElement("div");
      fx.className = "big-win-counter__fx";
      fxEl = fx;
      function fxLayer(cls) {
        var el = document.createElement("div");
        el.className = cls;
        fx.appendChild(el);
        return el;
      }
      fxLayer("big-win-counter__fog big-win-counter__fog--a");
      fxLayer("big-win-counter__fog big-win-counter__fog--b");
      fxLayer("big-win-counter__fog big-win-counter__fog--c");
      fxLayer("big-win-counter__rays");
      fxLayer("big-win-counter__rays big-win-counter__rays--counter");
      fxLayer("big-win-counter__sigil").innerHTML = buildSigilSvg();
      buildRelics(fxLayer("big-win-counter__relics"));
      glowEl = fxLayer("big-win-counter__glow");
      flareEl = fxLayer("big-win-counter__flare");
      pulseEl = fxLayer("big-win-counter__pulse");
      // Brasas que suben parpadeando + algo de ceniza gris (las ultimas 8).
      for (var s = 0; s < 30; s++) {
        var spark = document.createElement("span");
        spark.className = "big-win-counter__spark" + (s >= 22 ? " big-win-counter__spark--ash" : "");
        spark.style.cssText =
          "--spark-x:" + (8 + Math.random() * 84).toFixed(1) + "%;" +
          "--spark-size:" + (3 + Math.random() * 5).toFixed(1) + "px;" +
          "--spark-dur:" + (2.6 + Math.random() * 3.2).toFixed(2) + "s;" +
          "--spark-delay:" + (-Math.random() * 6).toFixed(2) + "s;" +
          "--spark-drift:" + ((Math.random() - 0.5) * 120).toFixed(0) + "px;";
        fx.appendChild(spark);
      }
      overlay.appendChild(fx);

      // Sin recuadro ni rotulo: solo el número flotando sobre el halo oscuro.
      var panel = document.createElement("div");
      panel.style.textAlign = "center";
      panel.style.color = "#f7ddb0";
      panel.style.fontFamily = "\"Times New Roman\", serif";
      panel.style.letterSpacing = "0.06em";
      panel.style.position = "relative";
      panel.style.zIndex = "1";

      value = document.createElement("div");
      // Numero del juego: imagenes de oro de assets/fonts/numbers via
      // OssuaryNumberFont. El tamaño lo fija el font-size del contenedor.
      value.className = "big-win-counter__value";
      value.style.fontFamily = "\"Moria Citadel\", \"Times New Roman\", serif";
      value.style.fontSize = "110px";
      value.style.fontWeight = "700";
      value.style.whiteSpace = "nowrap";
      value.style.transition = "transform 160ms ease";
      if (window.OssuaryNumberFont) window.OssuaryNumberFont.preload();

      panel.appendChild(value);
      overlay.appendChild(panel);
      (document.body || stage).appendChild(overlay);
    }

    // Pinta el importe con la fuente de numeros de oro. Sin simbolo de euro:
    // solo el numero con decimales y sus separadores, que tambien van en el oro
    // biselado de los digitos (comma.png / dot.png, opcion separatorImages).
    function renderValue(amount) {
      var text = formatCurrency(amount).replace(/[^0-9.,]/g, "");
      if (window.OssuaryNumberFont) {
        window.OssuaryNumberFont.render(value, text, { separatorImages: true });
      } else {
        value.textContent = text;
      }
    }

    // Halo de luz que se expande desde el numero + pulso del brillo dorado.
    // Va en cada golpe (x10, entrada de la musica, tambores y final).
    function setFxClass(el, cls, on) {
      if (el && el.classList) el.classList.toggle(cls, Boolean(on));
    }

    function restartAnimClass(el, cls) {
      if (!el || !el.classList) return;
      el.classList.remove(cls);
      void el.offsetWidth;
      el.classList.add(cls);
    }

    function flare(strong) {
      setFxClass(flareEl, "is-flaring", false);
      setFxClass(flareEl, "is-flaring-strong", false);
      restartAnimClass(flareEl, strong ? "is-flaring-strong" : "is-flaring");
      restartAnimClass(glowEl, "is-pulsing");
      // Latido rojo en los bordes de la pantalla en los golpes fuertes.
      if (strong) restartAnimClass(pulseEl, "is-pulsing");
    }

    // Circulo de simbolos macabros (SVG en linea, sin assets): anillos, marcas
    // y, en vez de runas, pequenos simbolos de muerte dibujados a trazo
    // (calavera, daga, luna, huesos cruzados, ojo, ataud, reloj de arena,
    // hueso). Coordenadas locales: "arriba" (-y) apunta hacia fuera del
    // circulo. Trazos con color por CSS.
    var SIGIL_GLYPHS = [
      // calavera
      "<circle cx=\"0\" cy=\"-1.6\" r=\"3.4\"/><circle cx=\"-1.3\" cy=\"-1.7\" r=\"0.8\"/>" +
        "<circle cx=\"1.3\" cy=\"-1.7\" r=\"0.8\"/><path d=\"M-1.8 1.3 V3.8 H1.8 V1.3 M-0.6 2 V3.8 M0.6 2 V3.8\"/>",
      // daga (punta hacia fuera)
      "<path d=\"M0 -6.2 L1 -1.6 L0 2.8 L-1 -1.6 Z M-2.8 -1.6 H2.8 M0 2.8 V5\"/><circle cx=\"0\" cy=\"5.7\" r=\"0.7\"/>",
      // luna creciente
      "<path d=\"M1.4 -5 A5 5 0 1 0 1.4 5 A3.7 3.7 0 1 1 1.4 -5 Z\"/>",
      // huesos cruzados
      "<path d=\"M-3.2 -4.4 L3.2 4.4 M3.2 -4.4 L-3.2 4.4\"/><circle cx=\"-3.7\" cy=\"-4.8\" r=\"0.9\"/>" +
        "<circle cx=\"3.7\" cy=\"-4.8\" r=\"0.9\"/><circle cx=\"-3.7\" cy=\"4.8\" r=\"0.9\"/><circle cx=\"3.7\" cy=\"4.8\" r=\"0.9\"/>",
      // ojo
      "<path d=\"M-4.6 0 Q0 -4.2 4.6 0 Q0 4.2 -4.6 0 Z\"/><circle cx=\"0\" cy=\"0\" r=\"1.4\"/>",
      // ataud
      "<path d=\"M-1.8 -6 H1.8 L3.2 -2.6 L1.6 6 H-1.6 L-3.2 -2.6 Z\"/>",
      // reloj de arena
      "<path d=\"M-3 -5.4 H3 L0 0 L3 5.4 H-3 L0 0 Z\"/>",
      // hueso
      "<path d=\"M0 -4.4 V4.4\"/><circle cx=\"-0.9\" cy=\"-5\" r=\"0.9\"/><circle cx=\"0.9\" cy=\"-5\" r=\"0.9\"/>" +
        "<circle cx=\"-0.9\" cy=\"5\" r=\"0.9\"/><circle cx=\"0.9\" cy=\"5\" r=\"0.9\"/>"
    ];

    function buildSigilSvg() {
      var cx = 100;
      var cy = 100;
      var out = [];
      out.push("<circle cx=\"100\" cy=\"100\" r=\"97\"/>", "<circle cx=\"100\" cy=\"100\" r=\"90\"/>",
        "<circle cx=\"100\" cy=\"100\" r=\"66\"/>", "<circle cx=\"100\" cy=\"100\" r=\"61\" stroke-dasharray=\"2 5\"/>");
      for (var t = 0; t < 72; t++) {
        var at = (t / 72) * Math.PI * 2;
        var len = t % 6 === 0 ? 7 : 3.5;
        out.push("<line x1=\"" + (cx + Math.cos(at) * 90).toFixed(2) + "\" y1=\"" + (cy + Math.sin(at) * 90).toFixed(2) +
          "\" x2=\"" + (cx + Math.cos(at) * (90 + len)).toFixed(2) + "\" y2=\"" + (cy + Math.sin(at) * (90 + len)).toFixed(2) + "\"/>");
      }
      var count = 24;
      for (var i = 0; i < count; i++) {
        var deg = (i / count) * 360;
        var rad = deg * Math.PI / 180;
        out.push("<g transform=\"translate(" + (cx + Math.cos(rad) * 78).toFixed(2) + " " +
          (cy + Math.sin(rad) * 78).toFixed(2) + ") rotate(" + (deg + 90).toFixed(1) + ")\">" +
          SIGIL_GLYPHS[i % SIGIL_GLYPHS.length] + "</g>");
      }
      return "<svg viewBox=\"0 0 200 200\" aria-hidden=\"true\">" + out.join("") + "</svg>";
    }

    // Reliquias: el propio arte del juego en silueta con borde rojo (cuervos,
    // cuervo muerto, calaveras, huesos, la hoz) bailando en ESPIRAL lenta
    // alrededor del numero. Estructura: .relic (orbita alrededor del centro)
    // > .relic-arm (radio que entra y sale) > img (gira a su ritmo). Tiempos,
    // radios, tamanos y sentido se sortean en cada contador (layoutRelics).
    var RELIC_ART = [
      { src: "assets/symbols/bird.png", flip: true },
      { src: "assets/symbols/demon-skull.png" },
      { src: "assets/symbols/broken-bone.png" },
      { src: "assets/symbols/bird.png" },
      { src: "assets/symbols/ancestral-skull.png" },
      { src: "assets/symbols/guadana_blade_alpha.png" },
      { src: "assets/symbols/bird-dead.png" },
      { src: "assets/symbols/broken-bone.png", flip: true },
      { src: "assets/symbols/demon-skull.png" },
      { src: "assets/symbols/bird.png", flip: true }
    ];
    var relicEls = [];

    function buildRelics(container) {
      RELIC_ART.forEach(function (art) {
        var relic = document.createElement("div");
        relic.className = "big-win-counter__relic";
        var arm = document.createElement("div");
        arm.className = "big-win-counter__relic-arm";
        var img = document.createElement("img");
        img.src = art.src;
        img.alt = "";
        arm.appendChild(img);
        relic.appendChild(arm);
        container.appendChild(relic);
        relicEls.push({ el: relic, flip: Boolean(art.flip) });
      });
    }

    function layoutRelics() {
      var n = relicEls.length;
      if (!n) return;
      relicEls.forEach(function (relic, i) {
        if (!relic.el.style) return;
        var orbitDur = 46 + Math.random() * 40;           // vuelta completa lenta
        var orbitDir = Math.random() < 0.5 ? "normal" : "reverse";
        // Angulo de partida repartido por la vuelta (con ruido) via delay negativo.
        var startFrac = (i + Math.random() * 0.8) / n;
        var rMin = 14 + Math.random() * 10;               // vmin
        relic.el.style.cssText =
          "--orbit-dur:" + orbitDur.toFixed(1) + "s;" +
          // En sentido inverso la animacion corre al reves: el delay equivalente
          // a empezar en startFrac de la vuelta es (1 - startFrac).
          "--orbit-delay:" + (-(orbitDir === "reverse" ? 1 - startFrac : startFrac) * orbitDur).toFixed(2) + "s;" +
          "--orbit-dir:" + orbitDir + ";" +
          "--start-angle:" + Math.round(startFrac * 360) + "deg;" +
          "--tumble-dur:" + orbitDur.toFixed(1) + "s;" +
          "--tumble-dir:" + orbitDir + ";" +
          "--tumble:" + Math.round((Math.random() - 0.5) * 300) + "deg;" +
          "--tilt:" + Math.round((Math.random() - 0.5) * 50) + "deg;" +
          "--r-min:" + rMin.toFixed(1) + "vmin;" +
          "--r-max:" + (rMin + 14 + Math.random() * 14).toFixed(1) + "vmin;" +
          "--radial-dur:" + (9 + Math.random() * 9).toFixed(1) + "s;" +
          "--radial-delay:" + (-Math.random() * 18).toFixed(1) + "s;" +
          "--relic-size:" + (6.5 + Math.random() * 6).toFixed(1) + "vmin;" +
          "--relic-flip:" + (relic.flip ? -1 : 1) + ";";
      });
    }

    // Cuervos (silueta) que cruzan la pantalla a distinta altura, tamano y
    // velocidad: al entrar la musica y al final. Van con el graznido
    // (reglas de audio de big_win_counter_epic_started/completed).
    var fxEl = null;

    function spawnCrows(count) {
      if (!fxEl || typeof fxEl.appendChild !== "function") return;
      for (var i = 0; i < count; i++) {
        var fromLeft = Math.random() < 0.5;
        var y0 = 12 + Math.random() * 58;
        var crow = document.createElement("div");
        crow.className = "big-win-counter__crow";
        var dur = 1.7 + Math.random() * 1.5;
        var delay = i * (0.16 + Math.random() * 0.4);
        if (crow.style) {
          crow.style.cssText =
            "--crow-x0:" + (fromLeft ? -22 : 112) + "vw;" +
            "--crow-x1:" + (fromLeft ? 112 : -22) + "vw;" +
            "--crow-y0:" + y0.toFixed(1) + "vh;" +
            "--crow-y1:" + (y0 + (Math.random() - 0.65) * 36).toFixed(1) + "vh;" +
            "--crow-dip:" + (4 + Math.random() * 10).toFixed(1) + "vh;" +
            "--crow-size:" + (8 + Math.random() * 8).toFixed(1) + "vmin;" +
            "--crow-flip:" + (fromLeft ? -1 : 1) + ";" +
            "--crow-dur:" + dur.toFixed(2) + "s;" +
            "--crow-delay:" + delay.toFixed(2) + "s;" +
            "--crow-flap:" + (0.14 + Math.random() * 0.1).toFixed(2) + "s;";
        }
        var img = document.createElement("img");
        img.src = "assets/symbols/bird.png";
        img.alt = "";
        crow.appendChild(img);
        fxEl.appendChild(crow);
        (function (el, ms) {
          window.setTimeout(function () {
            if (el.parentNode && typeof el.parentNode.removeChild === "function") el.parentNode.removeChild(el);
          }, ms);
        })(crow, Math.round((dur + delay) * 1000) + 250);
      }
    }

    function punchValue(scale) {
      if (!value) return;
      flare((scale || 1.18) >= 1.24);
      value.style.transform = "scale(" + (scale || 1.18) + ")";
      window.setTimeout(function () {
        if (value) value.style.transform = "scale(1)";
      }, speedMs(170));
    }

    function emit(eventName, detail) {
      hooks.emitEvent && hooks.emitEvent(eventName, detail || {});
    }

    function emitCountingStopped() {
      if (!counting) return;
      counting = false;
      emit("big_win_counter_counting_stopped");
    }

    function emitCountingStarted(detail) {
      counting = true;
      emit("big_win_counter_counting_started", detail);
    }

    function removeStoredPointerListeners() {
      if (overlay && overlay.__ossuaryRemoveSkip) {
        overlay.__ossuaryRemoveSkip();
        overlay.__ossuaryRemoveSkip = null;
      }
      if (overlay && overlay.__ossuaryRemoveFinalDismiss) {
        overlay.__ossuaryRemoveFinalDismiss();
        overlay.__ossuaryRemoveFinalDismiss = null;
      }
    }

    function clearAnimation() {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      if (pauseTimer) {
        window.clearTimeout(pauseTimer);
        pauseTimer = null;
      }
      emitCountingStopped();
      active = false;
      removeStoredPointerListeners();
    }

    // Oculta el contador y para toda su música (loop y épica). El juego lo
    // llama al arrancar el siguiente spin: número y música se quedan hasta
    // ese momento.
    function hide() {
      clearAnimation();
      cancelNumberCrow();
      cancelEnterRamp();
      emit("big_win_counter_hidden");
      if (!overlay) return Promise.resolve();
      overlay.style.opacity = "0";
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          overlay.style.display = "none";
          if (numberCrow) numberCrow.clear();
          clearDeadCrow();
          resolve();
        }, speedMs(260));
      });
    }

    // --- Entrada suave (--bw-e) ---------------------------------------------
    var lastEnter = -1;
    var enterFrame = null;
    var enterStartedAt = 0;

    function setEnter(level) {
      if (!overlay || !overlay.style || typeof overlay.style.setProperty !== "function") return;
      var e = Math.max(0, Math.min(1, level));
      if (lastEnter >= 0 && Math.abs(e - lastEnter) < 0.006 && e < 1) return;
      lastEnter = e;
      overlay.style.setProperty("--bw-e", e.toFixed(3));
    }

    function cancelEnterRamp() {
      if (enterFrame) {
        window.cancelAnimationFrame(enterFrame);
        enterFrame = null;
      }
    }

    function startEnterRamp() {
      cancelEnterRamp();
      lastEnter = -1;
      setEnter(0);
      enterStartedAt = 0;
      function ramp(now) {
        if (!enterStartedAt) enterStartedAt = now;
        var t = Math.min(1, (now - enterStartedAt) / ENTER_MS);
        // ease-in-out: arranca y termina con suavidad.
        setEnter(t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        enterFrame = t < 1 ? window.requestAnimationFrame(ramp) : null;
      }
      enterFrame = window.requestAnimationFrame(ramp);
    }

    // --- Ganancia maxima: cuervo muerto grande debajo de las cifras ---------
    var deadCrowEl = null;
    var deadCrowTimer = null;

    function clearDeadCrow() {
      if (deadCrowTimer) {
        window.clearTimeout(deadCrowTimer);
        deadCrowTimer = null;
      }
      if (deadCrowEl && deadCrowEl.parentNode && typeof deadCrowEl.parentNode.removeChild === "function") {
        deadCrowEl.parentNode.removeChild(deadCrowEl);
      }
      deadCrowEl = null;
      clearMaxWinSign();
    }

    // --- Ganancia maxima: cartel de madera con "MAX WIN" escrito en sangre --
    // Tabla de madera tosca (CSS) que cae sobre las cifras y se balancea; en
    // ella el texto (fuente del juego, Moria Citadel) se TRAZA con sangre, se
    // rellena con bordes organicos (filtro SVG) y le bajan goterones que caen
    // por debajo de la tabla. Medidas en viewBox 1000x300.
    var maxWinSignEl = null;
    var maxWinSignTimer = null;

    function clearMaxWinSign() {
      if (maxWinSignTimer) {
        window.clearTimeout(maxWinSignTimer);
        maxWinSignTimer = null;
      }
      if (maxWinSignEl && maxWinSignEl.parentNode && typeof maxWinSignEl.parentNode.removeChild === "function") {
        maxWinSignEl.parentNode.removeChild(maxWinSignEl);
      }
      maxWinSignEl = null;
    }

    function buildMaxWinSvg() {
      var drips = [];
      var count = 9 + Math.floor(Math.random() * 4);
      for (var d = 0; d < count; d++) {
        var x = 150 + Math.random() * 700;
        var y0 = 190 + Math.random() * 18;
        var len = 26 + Math.random() * 92;
        var w = 3.5 + Math.random() * 4.5;
        var delay = 2.5 + Math.random() * 1.6;
        var dur = 1.3 + Math.random() * 1.6;
        drips.push(
          "<path class=\"big-win-counter__maxwin-drip\" d=\"M" + x.toFixed(1) + " " + y0.toFixed(1) +
          " L" + x.toFixed(1) + " " + (y0 + len).toFixed(1) + "\" style=\"--drip-len:" + Math.ceil(len) +
          ";--drip-delay:" + delay.toFixed(2) + "s;--drip-dur:" + dur.toFixed(2) + "s;stroke-width:" + w.toFixed(1) + "\"/>" +
          "<circle class=\"big-win-counter__maxwin-drop\" cx=\"" + x.toFixed(1) + "\" cy=\"" + (y0 + len).toFixed(1) +
          "\" r=\"" + (w * 0.85).toFixed(1) + "\" style=\"--drop-delay:" + (delay + dur - 0.05).toFixed(2) + "s\"/>"
        );
      }
      return "<svg class=\"big-win-counter__maxwin-text\" viewBox=\"0 0 1000 300\" aria-hidden=\"true\">" +
        "<defs>" +
        "<linearGradient id=\"bwBloodGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">" +
        "<stop offset=\"0\" stop-color=\"#d81a12\"/><stop offset=\"0.45\" stop-color=\"#9c0505\"/>" +
        "<stop offset=\"1\" stop-color=\"#4e0000\"/></linearGradient>" +
        "<filter id=\"bwBloodRough\" x=\"-5%\" y=\"-20%\" width=\"110%\" height=\"140%\">" +
        "<feTurbulence type=\"fractalNoise\" baseFrequency=\"0.045\" numOctaves=\"2\" seed=\"7\" result=\"n\"/>" +
        "<feDisplacementMap in=\"SourceGraphic\" in2=\"n\" scale=\"5\" xChannelSelector=\"R\" yChannelSelector=\"G\"/>" +
        "</filter></defs>" +
        "<text class=\"big-win-counter__maxwin-fill\" x=\"500\" y=\"196\" text-anchor=\"middle\" textLength=\"760\"" +
        " lengthAdjust=\"spacingAndGlyphs\">" + MAX_WIN_TEXT + "</text>" +
        "<text class=\"big-win-counter__maxwin-stroke\" x=\"500\" y=\"196\" text-anchor=\"middle\" textLength=\"760\"" +
        " lengthAdjust=\"spacingAndGlyphs\">" + MAX_WIN_TEXT + "</text>" +
        drips.join("") +
        "</svg>";
    }

    function showMaxWinSign() {
      maxWinSignTimer = null;
      if (!overlay || overlay.style.display === "none" || !value) return;
      clearMaxWinSign();
      var rect = typeof value.getBoundingClientRect === "function" ? value.getBoundingClientRect() : null;
      if (!rect || !rect.height) return;
      var vw = window.innerWidth || 1280;
      // Tabla 1000x300 sobre las cifras: tan ancha como quepa encima (sin
      // pasar del 64% del ancho ni de 760px), con un margen sobre el numero.
      var width = Math.max(220, Math.min(vw * 0.64, 760, (rect.top - 14) / 0.34));
      var height = width * 0.3;
      var top = Math.max(6, rect.top - 12 - height);
      var sign = document.createElement("div");
      sign.className = "big-win-counter__maxwin";
      if (sign.style) sign.style.cssText = "--sign-w:" + Math.round(width) + "px;--sign-top:" + Math.round(top) + "px;";
      var board = document.createElement("div");
      board.className = "big-win-counter__maxwin-board";
      sign.appendChild(board);
      var textLayer = document.createElement("div");
      textLayer.className = "big-win-counter__maxwin-ink";
      textLayer.innerHTML = buildMaxWinSvg();
      sign.appendChild(textLayer);
      overlay.appendChild(sign);
      maxWinSignEl = sign;
      // Empieza a escribirse con la sangre (trazo de las lineas de pago).
      maxWinSignTimer = window.setTimeout(function () {
        maxWinSignTimer = null;
        if (maxWinSignEl !== sign) return;
        emit("big_win_counter_max_win_written", {});
      }, 1000);
    }

    function dropDeadCrowUnderNumber() {
      numberCrowTimer = null;
      if (!overlay || overlay.style.display === "none" || !value) return;
      clearDeadCrow();
      var rect = typeof value.getBoundingClientRect === "function" ? value.getBoundingClientRect() : null;
      if (!rect || !rect.height) return;
      var crow = document.createElement("div");
      crow.className = "big-win-counter__dead-crow";
      // Tamano grande (76% del alto de pantalla, sin pasar del 92% del ancho)
      // y colocado para que la parte alta del cuervo (su dibujo empieza al
      // 11.3% de la imagen y acaba al 79.4%) arranque a la altura del centro
      // de las cifras: queda "debajo" del numero, como caido muerto ahi. Si no
      // cabe hasta el borde inferior, se reduce.
      var vw = window.innerWidth || 1280;
      var vh = window.innerHeight || 720;
      var centerY = rect.top + rect.height / 2;
      var size = Math.min(vh * 0.76, vw * 0.92, Math.max(120, (vh - 8 - centerY) / 0.681));
      var top = centerY - size * 0.113;
      if (crow.style) crow.style.cssText = "--dead-top:" + Math.round(top) + "px;--dead-size:" + Math.round(size) + "px;";
      var img = document.createElement("img");
      img.src = DEAD_CROW_SRC;
      img.alt = "";
      crow.appendChild(img);
      // Entre los FX (z 0) y el numero (z 1): detras de las cifras.
      var panel = value.parentNode;
      if (panel && panel.parentNode === overlay && typeof overlay.insertBefore === "function") {
        overlay.insertBefore(crow, panel);
      } else {
        overlay.appendChild(crow);
      }
      deadCrowEl = crow;
      // Impacto contra el suelo: golpe, onda y latido.
      deadCrowTimer = window.setTimeout(function () {
        deadCrowTimer = null;
        if (deadCrowEl !== crow) return;
        flare(true);
        emit("big_win_counter_dead_crow_landed", {});
      }, DEAD_CROW_IMPACT_MS);
      // Y despues cae el cartel de MAX WIN sobre las cifras.
      maxWinSignTimer = window.setTimeout(showMaxWinSign, MAX_WIN_SIGN_DELAY_MS);
    }

    var lastIntensity = -1;

    function setIntensity(level) {
      if (!overlay || !overlay.style || typeof overlay.style.setProperty !== "function") return;
      var i = Math.max(0, Math.min(1, level));
      if (lastIntensity >= 0 && Math.abs(i - lastIntensity) < 0.008) return;
      lastIntensity = i;
      overlay.style.setProperty("--bw-i", i.toFixed(3));
    }

    function intensityFor(amount, total, bet, mode) {
      if (!(bet > 0) || !(total > 0)) return 1;
      var done = Math.max(0, Math.min(1, amount / total));
      if (mode === "quick") return INTENSITY_START + (INTENSITY_NO_MUSIC - INTENSITY_START) * done;
      if (mode === "music") return INTENSITY_AT_MUSIC + (1 - INTENSITY_AT_MUSIC) * done;
      var m = amount / bet;
      var totalM = total / bet;
      if (m <= MUSIC_MULTIPLE) return INTENSITY_START + (INTENSITY_AT_MUSIC - INTENSITY_START) * (m / MUSIC_MULTIPLE);
      return INTENSITY_AT_MUSIC + (1 - INTENSITY_AT_MUSIC) * Math.min(1, (m - MUSIC_MULTIPLE) / (totalM - MUSIC_MULTIPLE));
    }

    // Cuervo posado sobre el numero final: el MISMO modulo y video del cuervo
    // que se posa en el juego base (src/fx/small-blade-bird-perch.js), con su
    // capa dentro del overlay para quedar por encima del numero. Digito: el
    // central de la parte entera, desempatando a la izquierda (100 -> el 0 del
    // medio; 1,000 -> el segundo digito, tercero por la derecha).
    var numberCrow = null;
    var numberCrowTimer = null;

    function cancelNumberCrow() {
      if (numberCrowTimer) {
        window.clearTimeout(numberCrowTimer);
        numberCrowTimer = null;
      }
    }

    function integerDigitEls() {
      var out = [];
      var children = value && value.children ? value.children : [];
      for (var c = 0; c < children.length; c++) {
        var el = children[c];
        var cls = String(el.className || "");
        // El punto decimal (texto o imagen dorada) cierra la parte entera.
        if (el.textContent === "." || el.alt === ".") break;
        if (cls.indexOf("ossuary-number-font__digit") !== -1) out.push(el);
      }
      return out;
    }

    function perchCrowOnNumber() {
      numberCrowTimer = null;
      if (!overlay || overlay.style.display === "none") return;
      if (!window.OssuarySmallBladeBirdPerch || typeof window.OssuarySmallBladeBirdPerch.create !== "function") return;
      var digits = integerDigitEls();
      if (!digits.length) return;
      var target = digits[Math.floor((digits.length - 1) / 2)];
      if (!numberCrow) {
        numberCrow = window.OssuarySmallBladeBirdPerch.create({ layerParent: overlay });
        numberCrow.warmCache();
      }
      numberCrow.clear();
      var perched = numberCrow.perchAt("big-win-number", function () {
        var r = target.getBoundingClientRect();
        return (r.width && r.height) ? r : null;
      });
      if (perched) emit("big_win_counter_crow_perched", {});
    }

    function isTurbo() {
      return Boolean(window.OssuaryGameSpeed && typeof window.OssuaryGameSpeed.isTurbo === "function" &&
        window.OssuaryGameSpeed.isTurbo());
    }

    function musicBarsFor(multiple) {
      for (var i = 0; i < MUSIC_BARS.length; i++) {
        if (multiple < MUSIC_BARS[i].below) return MUSIC_BARS[i].bars;
      }
      return EPIC_BEAT_MS.length;
    }

    // Plan del conteo: { mode, segments }. mode: "quick" (sin música),
    // "music" (la música arranca con el contador) o "full" (conteo con loop
    // y la música desde x25). Tramos:
    //  { from, to, durationMs, flatMs, onEnd, epicEndMs?, ease? }
    // flatMs: al principio del tramo el número se queda quieto (resaca del
    // golpe anterior). epicEndMs: instante de la canción en el que termina
    // el tramo (solo con música; si el usuario salta, la música se resitúa
    // ahí).
    function buildPlan(total, bet) {
      var segments = [];
      var multiple = bet > 0 ? total / bet : 0;

      if (!(bet > 0) || multiple <= MUSIC_MULTIPLE) {
        var size = Math.max(0, Math.min(1, (multiple - 10) / (MUSIC_MULTIPLE - 10)));
        segments.push({
          from: 0, to: total, flatMs: 0, ease: "out",
          durationMs: QUICK_MIN_MS + (QUICK_MAX_MS - QUICK_MIN_MS) * size,
          onEnd: "complete"
        });
        return { mode: "quick", segments: segments };
      }

      var bars = musicBarsFor(multiple);
      var turbo = isTurbo();
      var full = bars === EPIC_BEAT_MS.length && !turbo;
      if (turbo) bars = Math.ceil(bars / 2);
      var musicFrom = 0;

      if (full) {
        // 0 → x10 con loop de conteo y parón (sonido de pausa una vez);
        // x10 → x25 y golpe: arranca la música.
        var x10 = bet * 10;
        var x25 = bet * MUSIC_MULTIPLE;
        segments.push({ from: 0, to: x10, flatMs: 0, durationMs: FULL_TO_X10_MS, onEnd: "pause_x10" });
        segments.push({ from: x10, to: x25, flatMs: 0, durationMs: FULL_X10_TO_X25_MS, onEnd: "epic_start" });
        musicFrom = x25;
      }

      // Tramos con música: lo que queda de premio, sea cual sea el importe,
      // repartido cuadrando con los golpes de la canción; el último golpe
      // aterriza el total.
      var fractions = BEAT_FRACTIONS[bars];
      var remaining = total - musicFrom;
      var prevBeat = 0;
      var fromValue = musicFrom;
      for (var i = 0; i < bars; i++) {
        var beatDuration = EPIC_BEAT_MS[i] - prevBeat;
        var toValue = musicFrom + remaining * fractions[i];
        segments.push({
          from: fromValue, to: toValue,
          flatMs: i === 0 ? 0 : beatDuration * BEAT_FLAT_RATIO,
          durationMs: beatDuration,
          epicEndMs: EPIC_BEAT_MS[i],
          onEnd: i === bars - 1 ? "complete" : "beat"
        });
        prevBeat = EPIC_BEAT_MS[i];
        fromValue = toValue;
      }
      return { mode: full ? "full" : "music", segments: segments };
    }

    function show(amount, bet) {
      ensureElements();
      clearAnimation();

      var total = Math.max(0, Number(amount || 0));
      if (!Number.isFinite(total) || total <= 0) return Promise.resolve(null);

      var betAmount = Number(bet || 0);
      var plan = buildPlan(total, betAmount);
      var mode = plan.mode;
      var segments = plan.segments;
      segments.forEach(function (segment) {
        // Con música el tramo va clavado a la canción: el turbo no lo acelera.
        if (typeof segment.epicEndMs === "number") return;
        segment.durationMs = speedMs(segment.durationMs);
        segment.flatMs = speedMs(segment.flatMs);
      });
      var totalDuration = segments.reduce(function (sum, s) { return sum + s.durationMs; }, 0);

      active = true;
      cancelNumberCrow();
      if (numberCrow) numberCrow.clear();
      clearDeadCrow();
      startEnterRamp();
      setFxClass(overlay, "is-epic", false);
      setFxClass(overlay, "is-complete", false);
      lastIntensity = -1;
      setIntensity(intensityFor(0, total, betAmount, mode));
      layoutRelics();
      overlay.style.display = "flex";
      renderValue(0);
      emit("big_win_counter_started", { amount: total, bet: betAmount });
      emitCountingStarted({ amount: total, bet: betAmount });
      overlay.style.opacity = "1";

      var segIndex = 0;
      var segStart = null;
      var completed = false;

      return new Promise(function (resolve) {
        function finish() {
          completed = true;
          removeSkipListener();
          renderValue(total);
          setIntensity(intensityFor(total, total, betAmount, mode));
          setFxClass(overlay, "is-complete", true);
          punchValue(1.28);
          // Tras el golpe final (punch): desde x50 el cuervo baja y se posa en
          // el numero; con la ganancia maxima, en su lugar cae el cuervo
          // muerto grande. Por debajo de x50, sin cuervo.
          cancelNumberCrow();
          var winMultiple = betAmount > 0 ? total / betAmount : 0;
          var maxWin = winMultiple >= BIG_WIN_MAX_MULTIPLE;
          if (maxWin || winMultiple >= NUMBER_CROW_MIN_MULTIPLE) {
            numberCrowTimer = window.setTimeout(maxWin ? dropDeadCrowUnderNumber : perchCrowOnNumber, NUMBER_CROW_DELAY_MS);
          }
          emitCountingStopped();
          emit("big_win_counter_completed", {
            amount: total,
            bet: betAmount,
            winMultiple: betAmount > 0 ? total / betAmount : 0
          });
          animationFrame = null;
          // El número (y la música épica si sonaba) siguen hasta hide().
          armFinalDismissListener();
          resolve({ amount: total, bet: betAmount, durationMs: totalDuration });
        }

        // Golpe con el que arranca la música BIG WIN: los FX suben de
        // intensidad y cruzan cuervos (con graznido, regla de audio). El loop
        // de conteo sigue mientras los números corren.
        function startEpic(withPunch) {
          setFxClass(overlay, "is-epic", true);
          spawnCrows(3);
          if (withPunch) punchValue(1.24);
          else flare(true);
          emit("big_win_counter_epic_started", { amount: total, bet: betAmount });
        }

        function step(now) {
          if (!active) return;
          var seg = segments[segIndex];
          if (!segStart) {
            segStart = now;
            // 1-3 compases: la música arranca en el primer frame del conteo,
            // a la vez que el reloj de los tramos.
            if (segIndex === 0 && mode === "music") startEpic(false);
          }
          var elapsed = now - segStart;

          // Resaca del golpe: el número aguanta quieto al principio del
          // tramo y el loop de conteo no suena hasta que vuelve a moverse.
          var effective = Math.max(0, elapsed - seg.flatMs);
          if (seg.flatMs > 0 && !seg.loopResumed && effective > 0) {
            seg.loopResumed = true;
            emitCountingStarted({ amount: total, bet: betAmount });
          }
          var countSpan = Math.max(1, seg.durationMs - seg.flatMs);
          var progress = Math.min(1, effective / countSpan);
          // Conteo corto: arranca rápido y frena al llegar.
          if (seg.ease === "out") progress = 1 - (1 - progress) * (1 - progress);
          // Dentro del tramo el tiempo manda (elapsed), no el progreso del
          // valor: así los tramos épicos terminan clavados en su tambor.
          var timeDone = elapsed >= seg.durationMs;
          var shownValue = seg.from + (seg.to - seg.from) * (timeDone ? 1 : progress);
          renderValue(shownValue);
          setIntensity(intensityFor(shownValue, total, betAmount, mode));

          if (!timeDone) {
            animationFrame = window.requestAnimationFrame(step);
            return;
          }

          // Fin de tramo.
          if (seg.onEnd === "complete") {
            finish();
            return;
          }

          if (seg.onEnd === "pause_x10") {
            punchValue();
            emitCountingStopped();
            emit("big_win_counter_pause", { at: "x10", amount: total });
            pauseTimer = window.setTimeout(function () {
              pauseTimer = null;
              if (!active) return;
              emitCountingStarted({ amount: total, bet: betAmount });
              segIndex += 1;
              segStart = null;
              animationFrame = window.requestAnimationFrame(step);
            }, speedMs(PAUSE_X10_MS));
            return;
          }

          if (seg.onEnd === "epic_start") {
            // Golpe de x25 (espectáculo completo): arranca la música; los
            // tramos siguientes van clavados a sus golpes.
            startEpic(true);
            segIndex += 1;
            segStart = now - (elapsed - seg.durationMs);
            animationFrame = window.requestAnimationFrame(step);
            return;
          }

          // "beat": golpe de tambor de la música épica — parón: el loop de
          // conteo se corta, suena el parón (regla de audio), el número hace
          // su aumento y el flatMs del tramo siguiente le da la resaca.
          // El sobrante del frame pasa al siguiente tramo para que los
          // tambores no acumulen deriva respecto a la canción.
          punchValue(1.24);
          emitCountingStopped();
          emit("big_win_counter_beat", { amount: total });
          segIndex += 1;
          segStart = now - (elapsed - seg.durationMs);
          animationFrame = window.requestAnimationFrame(step);
        }

        // SALTO CON CLIC: un clic en cualquier parte de la pantalla lleva el
        // conteo hasta el siguiente parón (x10, golpe de x25, tambor o final)
        // y continúa desde ahí. Si la música épica ya sonaba, se resitúa en
        // el instante exacto de ese tambor para no perder el ritmo.
        function skipToNextStop() {
          if (!active || completed) return;
          if (pauseTimer) return; // ya estamos en un parón; se respeta
          var seg = segments[segIndex];
          if (!seg || segStart === null) return;
          // Adelanta el tramo actual a su final: el próximo frame dispara el
          // parón correspondiente (pausa/tambor/final) con sus sonidos.
          segStart = performance.now() - seg.durationMs;
          // Música épica: si este tramo termina en un punto de la canción,
          // la música salta a ese punto y sigue desde ahí.
          if (typeof seg.epicEndMs === "number" && hooks.seekEpicMusic) {
            hooks.seekEpicMusic(seg.epicEndMs);
          }
        }

        function onSkipClick(event) {
          // Los botones (debug, spin, HUD) conservan su función normal.
          if (event.target && event.target.closest &&
              event.target.closest("button, #ossuaryDebugPanel")) return;
          skipToNextStop();
        }

        // document puede ser un stub sin eventos (validador en Node).
        var canListen = typeof document.addEventListener === "function";

        function removeSkipListener() {
          if (canListen) document.removeEventListener("pointerdown", onSkipClick, true);
        }

        function removeFinalDismissListener() {
          if (canListen) document.removeEventListener("pointerdown", onFinalDismissClick, true);
        }

        function onFinalDismissClick() {
          if (!completed || !overlay || overlay.style.display === "none") return;
          removeFinalDismissListener();
          overlay.__ossuaryRemoveFinalDismiss = null;
          hide();
        }

        function armFinalDismissListener() {
          if (!canListen) return;
          removeFinalDismissListener();
          document.addEventListener("pointerdown", onFinalDismissClick, true);
          overlay.__ossuaryRemoveFinalDismiss = removeFinalDismissListener;
        }

        if (canListen) document.addEventListener("pointerdown", onSkipClick, true);
        overlay.__ossuaryRemoveSkip = removeSkipListener;

        animationFrame = window.requestAnimationFrame(step);
      });
    }

    return {
      show: show,
      hide: hide
    };
  }

  window.OssuaryBigWinCounter = {
    create: createBigWinCounter
  };
})();
