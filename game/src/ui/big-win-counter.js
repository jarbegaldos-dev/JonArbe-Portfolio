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

    // ------------------------------------------------------------------
    // RITMO DEL CONTEO (todo en multiplos de la apuesta):
    //
    // Premio ≤ x25 — sin música. Conteo lento con loop de conteo; si cruza
    //   x10 hay un PARÓN (loop se corta, suena big-win-counter-pause una vez)
    //   y el conteo continúa hasta el total.
    //
    // Premio > x25 — el conteo empieza igual (loop + parón en x10) y al
    //   LLEGAR a x25 hay un golpe: arranca la música BIG WIN y el loop se
    //   corta. Desde ahí, lo que quede de premio (sea 87 o 20.000) se
    //   reparte cuadrando con los tambores de la canción — la velocidad de
    //   los números se adapta sola para aterrizar el total en el último
    //   tambor. Golpes medidos en el wav (envolvente RMS, registrado):
    //   4.30s, 8.28s, 12.30s y el golpe final ~15.78s desde que arranca la
    //   música. En cada tambor el número hace su aumento (punch) y aguanta
    //   un instante antes de seguir; subida escalonada: cada tramo suelta
    //   más dinero que el anterior.
    // ------------------------------------------------------------------
    var MS_PER_MULTIPLE = 450;   // velocidad base (premios sin música)
    var MIN_COUNT_MS = 3500;     // ningún conteo dura menos que esto
    var PAUSE_X10_MS = 700;      // duración del parón en x10
    var EPIC_BEAT_MS = [4300, 8280, 12300, 15780]; // tambores medidos en el wav
    // Fracción del total alcanzada en cada tambor: subida escalonada.
    var EPIC_BEAT_FRACTION = [0.18, 0.40, 0.68, 1];
    var BEAT_FLAT_RATIO = 0.18;  // tras cada tambor el número aguanta quieto un momento

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
      overlay.style.background = "radial-gradient(circle, rgba(28, 14, 4, 0.58) 0%, rgba(0, 0, 0, 0) 62%)";
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 240ms ease";

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
    // solo el numero con decimales y sus separadores (comas y puntos van en
    // negro, ver regla CSS de .big-win-counter__value .ossuary-number-font__sym).
    function renderValue(amount) {
      var text = formatCurrency(amount).replace(/[^0-9.,]/g, "");
      if (window.OssuaryNumberFont) {
        window.OssuaryNumberFont.render(value, text);
      } else {
        value.textContent = text;
      }
    }

    function punchValue(scale) {
      if (!value) return;
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
      emit("big_win_counter_hidden");
      if (!overlay) return Promise.resolve();
      overlay.style.opacity = "0";
      return new Promise(function (resolve) {
        window.setTimeout(function () {
          overlay.style.display = "none";
          resolve();
        }, speedMs(260));
      });
    }

    // Construye la linea de tiempo del conteo como lista de tramos:
    //  { from, to, durationMs, flatMs, onEnd }  — flatMs: al principio del
    // tramo el número se queda quieto (resaca del golpe anterior).
    function buildTimeline(total, bet) {
      var segments = [];
      var multiple = bet > 0 ? total / bet : 0;
      var x10 = bet * 10;
      var x25 = bet * 25;

      if (multiple <= 10 || bet <= 0) {
        segments.push({
          from: 0, to: total, flatMs: 0,
          durationMs: Math.max(MIN_COUNT_MS, multiple * MS_PER_MULTIPLE),
          onEnd: "complete"
        });
        return segments;
      }

      // Tramo 1: 0 → x10 con loop de conteo; termina en el parón (sonido de
      // pausa una vez).
      segments.push({
        from: 0, to: x10, flatMs: 0,
        durationMs: 10 * MS_PER_MULTIPLE,
        onEnd: "pause_x10"
      });

      if (multiple <= 25) {
        segments.push({
          from: x10, to: total, flatMs: 0,
          durationMs: (multiple - 10) * MS_PER_MULTIPLE,
          onEnd: "complete"
        });
        return segments;
      }

      // Tramo 2: x10 → x25 con loop; al llegar a x25, golpe: arranca la
      // música BIG WIN y el loop se corta.
      segments.push({
        from: x10, to: x25, flatMs: 0,
        durationMs: 15 * MS_PER_MULTIPLE,
        onEnd: "epic_start"
      });

      // Tramos épicos: lo que queda de premio (total − x25), sea cual sea el
      // importe, repartido cuadrando con los tambores de la canción. Subida
      // escalonada por EPIC_BEAT_FRACTION; el último tambor aterriza el total.
      var remaining = total - x25;
      var prevBeat = 0;
      var fromValue = x25;
      for (var i = 0; i < EPIC_BEAT_MS.length; i++) {
        var beatDuration = EPIC_BEAT_MS[i] - prevBeat;
        var toValue = x25 + remaining * EPIC_BEAT_FRACTION[i];
        segments.push({
          from: fromValue, to: toValue,
          flatMs: i === 0 ? 0 : beatDuration * BEAT_FLAT_RATIO,
          durationMs: beatDuration,
          // Momento de la canción en el que termina este tramo: si el
          // usuario salta, la música se resitúa aquí.
          epicEndMs: EPIC_BEAT_MS[i],
          onEnd: i === EPIC_BEAT_MS.length - 1 ? "complete" : "beat"
        });
        prevBeat = EPIC_BEAT_MS[i];
        fromValue = toValue;
      }
      return segments;
    }

    function show(amount, bet) {
      ensureElements();
      clearAnimation();

      var total = Math.max(0, Number(amount || 0));
      if (!Number.isFinite(total) || total <= 0) return Promise.resolve(null);

      var betAmount = Number(bet || 0);
      var segments = buildTimeline(total, betAmount);
      segments.forEach(function (segment) {
        segment.durationMs = speedMs(segment.durationMs);
        segment.flatMs = speedMs(segment.flatMs);
      });
      var totalDuration = segments.reduce(function (sum, s) { return sum + s.durationMs; }, 0);

      active = true;
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
          punchValue(1.28);
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

        function step(now) {
          if (!active) return;
          var seg = segments[segIndex];
          if (!segStart) segStart = now;
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
          // Dentro del tramo el tiempo manda (elapsed), no el progreso del
          // valor: así los tramos épicos terminan clavados en su tambor.
          var timeDone = elapsed >= seg.durationMs;
          renderValue(seg.from + (seg.to - seg.from) * (timeDone ? 1 : progress));

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
            // Golpe de x25: arranca la música BIG WIN. El loop de conteo
            // sigue mientras los números corren; los tramos siguientes van
            // clavados a sus tambores.
            punchValue(1.24);
            emit("big_win_counter_epic_started", { amount: total, bet: betAmount });
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
