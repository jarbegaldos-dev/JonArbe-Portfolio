(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Video de la puerta/esqueleto tras el corte de la cuchilla pequena — SOLO
  // VISUAL (+ audio propio del video).
  //
  // Cuando una cuchilla pequena corta, DETRAS de uno de los simbolos cortados
  // (el primero que cae bajo la cuchilla) aparece el video de la puerta de
  // madera con el esqueleto (webm VP9 con canal alfa + audio Opus). Secuencia:
  //   1) Primer frame del video visible (pausado en t=0) desde que ese simbolo
  //      empieza a caer: el simbolo cae por delante y revela la puerta.
  //   2) Cuando TODOS los simbolos han terminado de caer, el video se
  //      reproduce UNA vez, con su sonido, a playbackRate 1.35x (~3.0s en
  //      vez de 4.02s, sin cortar ningun frame).
  //   3) En el instante en que la piedra sale de la mano (t=1.76s de media
  //      time, medido frame a frame) se lanza la PIEDRA (stone_throw.png):
  //      la piedra sale del video hacia el punto objetivo que le pasa game.js
  //      (el encapuchado, ~35px sobre el simbolo central del rodillo 1),
  //      creciendo de escala durante el vuelo para que se lea bien. La mitad
  //      de las veces (stoneMissChance) ACIERTA: al llegar golpea y REBOTA
  //      hacia un lateral hasta cruzar el margen de la pantalla. La otra mitad
  //      FALLA: apunta a un punto ~75px a un lado del objetivo (izquierda o
  //      derecha al azar), asi pasa CERCA pero lo falla por ese margen y
  //      continua recto hasta salir de la pantalla, sin golpe ni rebote.
  //      (No se desvanece: desaparece porque sale de los margenes.)
  //   4) Al acabar el video, el ultimo frame queda como imagen fija (sin loop).
  //   5) Al arrancar el siguiente spin, game.js llama a dismissForSpin(): el
  //      ultimo frame se comporta como UN SIMBOLO MAS — sigue frame a frame
  //      al hueco persistente de su rodillo (muelle del arranque incluido),
  //      recortado al carril, y desaparece justo cuando el hueco expira en
  //      el borde de la ventana visible. Sin fades.
  //
  // La PUERTA del primer fotograma (su bounding box real, medido sobre el
  // alfa) encaja EXACTA en la casilla del rodillo; el aire del encuadre por
  // encima de la puerta sobresale de la casilla, por encima de la estructura
  // (la capa es fija sobre <body>), para que el esqueleto asome de verdad al
  // lanzar la piedra.
  //
  // Contrato de independencia (mismo espiritu que small-blade-cut.js):
  //  - NO toca estado de reels, strips, outcome, locks ni pagos. game.js le
  //    pasa RECTS ya medidos (casilla del simbolo cortado + punto objetivo de
  //    la piedra) y decide CUANDO mostrar (delay) y CUANDO reproducir (play()).
  //  - La capa va POR DEBAJO de .small-blade-cut-layer (los clones que caen
  //    pasan por delante del video) y por encima del tablero.
  //  - clear() cancela timers/animaciones, retira videos y piedras y deja todo
  //    limpio; se llama al arrancar el siguiente spin o en reset.
  // ---------------------------------------------------------------------------

  var DEFAULTS = {
    videoSrc: "assets/effects/door_skeleton_alpha.webm",
    stoneSrc: "assets/effects/stone_throw.png",
    // Bounding box de la PUERTA en el primer fotograma del webm (medido
    // pixel a pixel sobre el alfa: x 74-641, y 184-751 de un encuadre
    // 718x752, con la puerta apoyada en el borde inferior). El elemento
    // <video> se escala (object-fit:fill) para que ESTE recuadro encaje
    // EXACTO en la casilla del rodillo; el resto del encuadre (aire por
    // arriba, por donde asoma el esqueleto) queda fuera de la casilla.
    contentLeftFrac: 74 / 718,
    contentTopFrac: 184 / 752,
    contentWidthFrac: (642 - 74) / 718,
    contentHeightFrac: (752 - 184) / 752,
    // Velocidad de reproduccion: el video dura 4.02s reales; a 1.35x quedan
    // ~3.0s (un segundo menos) SIN cortar ningun frame. El audio se mantiene.
    playbackRate: 1.35,
    // Momento del video (segundos de MEDIA time, independiente del
    // playbackRate) en el que la piedra abandona la mano del esqueleto:
    // medido frame a frame, a 1.7s aun esta en la mano y a 1.8s ya ha salido.
    stoneTimeSec: 1.76,
    // Punto de salida de la piedra dentro de la CAJA del video (fracciones
    // del ENCUADRE completo 718x752): la mano en el instante de la suelta
    // (~1.76s) esta en torno a (300, 55) del frame.
    stoneOriginXFrac: 0.41,
    stoneOriginYFrac: 0.07,
    // Tamano inicial de la piedra: fraccion del ancho del encuadre (la mano
    // del esqueleto mide ~0.12 del frame; la piedra encaja en ella) y factor
    // de crecimiento durante el vuelo (para que sea facil de seguir).
    stoneStartWidthFrac: 0.13,
    stoneFlightGrowth: 2.4,
    // Vuelo (mas rapido, acorde al gesto del lanzamiento).
    stoneFlightMs: 460,
    stoneFlightEasing: "cubic-bezier(0.30, 0.10, 0.70, 0.40)",
    // Rebote: al golpear sale despedida hacia el lateral por el que vino,
    // sube un poco (rise), cae (drop) y CRUZA el margen de la pantalla; la
    // duracion depende de la distancia (speed en px/ms) acotada por min/max.
    stoneBounceRisePx: 60,
    stoneBounceDropPx: 150,
    stoneBounceSpeedPxMs: 1.5,
    stoneBounceMinMs: 320,
    stoneBounceMaxMs: 900,
    // Probabilidad de que la piedra FALLE el objetivo (capa visual, Math.random,
    // nunca el RNG del juego): con esta probabilidad la piedra NO golpea ni
    // rebota, sino que sigue la MISMA trayectoria hacia el punto objetivo y lo
    // pasa de largo, continuando en linea recta hasta salir de la pantalla.
    // 0.5 = mitad aciertan (impacto + rebote), mitad fallan (sigue de largo).
    stoneMissChance: 0.5,
    // Margen extra (px) mas alla del borde de la pantalla al que debe llegar la
    // piedra fallada para asegurar que sale del encuadre (ademas de su tamano).
    stoneMissExitMarginPx: 40,
    // Cuando la piedra FALLA no pasa por el objetivo sino a un lado: apunta a un
    // punto desplazado este tanto en horizontal (izquierda o derecha al azar),
    // de modo que la trayectoria sea similar y CERCANA al objetivo pero lo falle
    // por ~este margen antes de continuar de largo fuera de pantalla.
    stoneMissOffsetPx: 160,
    // Tope del factor de trayectoria (t>1) usado para la DURACION del fallo:
    // el tramo hasta el objetivo dura igual que un acierto (stoneFlightMs) y el
    // resto continua a velocidad similar; acota vuelos muy largos (angulos
    // rasantes) para que no se eternice. La geometria de salida usa la t real.
    stoneMissDurationTCap: 2.4,
    // Salida al arrancar el siguiente spin: el video SIGUE frame a frame al
    // hueco real de su rodillo (item.trackHole, lo enlaza game.js) — asi
    // hereda el muelle del arranque y la aceleracion — recortado al carril
    // con clip-path y retirado en cuanto el hueco expira en el borde. Este
    // tope solo es un cortafuegos por si el hueco no llegase a expirar.
    dismissMaxMs: 8000
  };

  function createSmallBladeDoorVideo(options) {
    options = options || {};
    var settings = Object.assign({}, DEFAULTS, options.settings || {});
    var layerParent = options.layerParent || document.body;

    var layerEl = null;
    var activeVideos = new Set();
    var activeStones = new Set();
    var activeAnimations = new Set();
    var pendingTimers = new Set();
    // Cada prepareForCut()/clear() invalida la secuencia anterior en vuelo.
    var runToken = 0;

    // Precalienta la cache HTTP una sola vez para que el primer frame este
    // disponible al instante cuando aterrice la primera cuchilla. Los
    // elementos se retienen (no GC) para conservar tambien datos decodificados.
    var warmVideoEl = null;
    var warmStoneEl = null;
    function warmCache() {
      if (warmVideoEl) return;
      warmVideoEl = document.createElement("video");
      warmVideoEl.muted = true;
      warmVideoEl.preload = "auto";
      warmVideoEl.src = settings.videoSrc;
      warmVideoEl.load();
      warmStoneEl = new Image();
      warmStoneEl.src = settings.stoneSrc;
    }

    function ensureLayer() {
      if (layerEl && layerEl.isConnected) return layerEl;
      layerEl = document.createElement("div");
      layerEl.className = "small-blade-door-video-layer";
      layerParent.appendChild(layerEl);
      return layerEl;
    }

    function timer(fn, ms, token) {
      var id = window.setTimeout(function () {
        pendingTimers.delete(id);
        if (token !== runToken) return;
        fn();
      }, ms);
      pendingTimers.add(id);
    }

    // Crea un video pausado en el primer frame, centrado sobre el rect de la
    // casilla del simbolo cortado (coordenadas de viewport; la capa es fija).
    function showFirstFrameAt(item, token) {
      var rect = item.rect;
      if (!rect || !rect.width || !rect.height) return;
      var video = document.createElement("video");
      video.className = "small-blade-door-video";
      // CON sonido: el gesto de usuario del SPIN habilita el autoplay con
      // audio; si el navegador lo bloquease, play() cae a un reintento muted
      // (ver playAll) para no perder nunca la parte visual.
      video.muted = false;
      video.playsInline = true;
      video.preload = "auto";
      video.loop = false;
      video.src = settings.videoSrc;
      // La caja del <video> se calcula para que el bbox de la PUERTA del
      // primer fotograma coincida exacto con la casilla (ejes independientes,
      // object-fit:fill). El aire del encuadre por encima de la puerta queda
      // fuera de la casilla, por donde asoma el esqueleto al animarse.
      var w = rect.width / settings.contentWidthFrac;
      var h = rect.height / settings.contentHeightFrac;
      var box = {
        left: rect.left - w * settings.contentLeftFrac,
        top: rect.top - h * settings.contentTopFrac,
        width: w,
        height: h
      };
      item.videoBox = box;
      var s = video.style;
      s.left = box.left + "px";
      s.top = box.top + "px";
      s.width = box.width + "px";
      s.height = box.height + "px";
      video.load(); // queda pausado mostrando el frame 0
      // Datos para el lanzamiento de la piedra al reproducirse.
      video.__doorItem = item;
      video.__doorToken = token;
      video.__stoneLaunched = false;
      // Aparicion FLUIDA: entra invisible y con un micro-zoom, y hace fade-in
      // (transition en CSS) cuando el primer frame esta decodificado
      // (loadeddata), no de golpe. Si la carga fallase se reintenta una vez,
      // y pase lo que pase se fuerza visible a los 900ms: que la puerta
      // nunca "no aparezca" por un frame que tarda en llegar.
      s.opacity = "0";
      s.transform = "scale(0.94)";
      var reveal = function () {
        if (video.__doorRevealed) return;
        video.__doorRevealed = true;
        s.opacity = "1";
        s.transform = "scale(1)";
      };
      if (video.readyState >= 2) {
        // Frame ya disponible (cache caliente): revela en el frame siguiente
        // para que la transition de opacidad se aplique igualmente.
        window.requestAnimationFrame(reveal);
      } else {
        video.addEventListener("loadeddata", reveal, { once: true });
        video.addEventListener("error", function () {
          if (video.__doorRetried) return;
          video.__doorRetried = true;
          video.src = settings.videoSrc;
          video.load();
        });
      }
      timer(reveal, 900, token);
      ensureLayer().appendChild(video);
      activeVideos.add(video);
    }

    // Reproduce todos los videos preparados (los simbolos ya han caido).
    // El ultimo frame queda fijo solo (sin loop). Cada video vigila su tiempo
    // con rAF (timeupdate solo dispara ~4 veces/s: a 1.35x eso serian hasta
    // ~0.34s de video de retraso) para soltar la piedra JUSTO en stoneTimeSec.
    function waitForVideoEnd(video, token) {
      return new Promise(function (resolve) {
        var done = false;
        function finish() {
          if (done) return;
          done = true;
          video.removeEventListener("ended", finish);
          video.removeEventListener("error", finish);
          resolve();
        }
        video.addEventListener("ended", finish, { once: true });
        video.addEventListener("error", finish, { once: true });
        var durationMs = 3600;
        if (isFinite(video.duration) && video.duration > 0) {
          durationMs = (video.duration / Math.max(0.1, settings.playbackRate)) * 1000 + 300;
        }
        window.setTimeout(finish, durationMs);
      });
    }

    function playAll() {
      var waits = [];
      activeVideos.forEach(function (video) {
        video.playbackRate = settings.playbackRate;
        var token = video.__doorToken;
        var resolveStoneDone = null;
        var stoneDone = new Promise(function (resolve) { resolveStoneDone = resolve; });
        var videoDone = waitForVideoEnd(video, token);
        var watchStone = function () {
          if (video.__stoneLaunched || token !== runToken ||
              video.__doorRemoved || !video.isConnected) return;
          if (video.currentTime >= settings.stoneTimeSec) {
            video.__stoneLaunched = true;
            Promise.resolve(launchStone(video.__doorItem, token)).then(resolveStoneDone, resolveStoneDone);
            return;
          }
          window.requestAnimationFrame(watchStone);
        };
        window.requestAnimationFrame(watchStone);
        var p = video.play();
        if (p && p.catch) {
          p.catch(function () {
            // Autoplay con audio bloqueado: reintento sin sonido para
            // conservar al menos el efecto visual completo.
            video.muted = true;
            var retry = video.play();
            if (retry && retry.catch) retry.catch(function () {});
          });
        }
        videoDone.then(function () {
          if (!video.__stoneLaunched) resolveStoneDone();
        });
        waits.push(Promise.all([videoDone, stoneDone]));
      });
      return waits.length ? Promise.all(waits).then(function () {}) : Promise.resolve();
    }

    // Piedra lanzada por el esqueleto: vuela desde el video hasta el punto
    // objetivo creciendo de escala, golpea y rebota hacia un lateral hasta
    // salir por el margen de la pantalla (desaparece por fuera, sin fade).
    function launchStone(item, token) {
      if (token !== runToken || !item) return Promise.resolve();
      var box = item.videoBox || item.rect;
      if (!box) return Promise.resolve();
      var startW = box.width * settings.stoneStartWidthFrac;
      var startX = box.left + box.width * settings.stoneOriginXFrac;
      var startY = box.top + box.height * settings.stoneOriginYFrac;

      // Plan del lanzamiento. game.js puede pasar item.resolveThrow(): decide EN
      // ESTE INSTANTE a que apunta la piedra (objetivo central, pajaro izquierdo
      // o derecho posado, o fallo) segun los pajaros vivos, y da un callback
      // onHit para el impacto en un pajaro. Sin resolver (o si devuelve null):
      // objetivo central + fallo por stoneMissChance (comportamiento clasico).
      var plan = (typeof item.resolveThrow === "function") ? item.resolveThrow() : null;
      var targetPt, miss, onHit;
      if (plan && plan.x != null && plan.y != null) {
        targetPt = { x: plan.x, y: plan.y };
        miss = !!plan.miss;
        onHit = (typeof plan.onHit === "function") ? plan.onHit : null;
      } else {
        if (!item.target) return Promise.resolve();
        targetPt = item.target;
        miss = Math.random() < settings.stoneMissChance;
        onHit = null;
      }

      var img = document.createElement("img");
      img.className = "small-blade-door-stone";
      img.src = settings.stoneSrc;
      img.alt = "";
      var s = img.style;
      s.width = startW + "px";
      s.left = (startX - startW / 2) + "px";
      s.top = (startY - startW / 2) + "px";
      ensureLayer().appendChild(img);
      activeStones.add(img);

      var dx = targetPt.x - startX;
      var dy = targetPt.y - startY;

      // La piedra FALLA. No apunta al objetivo sino a un punto a un lado
      // (±stoneMissOffsetPx en horizontal, lado al azar): pasa CERCA del objetivo
      // pero lo falla por ese margen y continua recto hasta salir de la pantalla,
      // sin golpe ni rebote.
      if (miss) {
        var missSide = Math.random() < 0.5 ? -1 : 1;
        var missDx = (targetPt.x + missSide * settings.stoneMissOffsetPx) - startX;
        return flyStoneMiss(img, startX, startY, startW, missDx, dy, token);
      }

      // Vuelo: trayectoria recta hacia el objetivo con crecimiento de escala
      // (translate antes de scale en la lista de transforms: el vector de
      // vuelo no se ve afectado por la escala).
      var flight = img.animate(
        [
          { transform: "translate(0px, 0px) scale(1) rotate(0deg)" },
          { transform: "translate(" + dx + "px, " + dy + "px) scale(" + settings.stoneFlightGrowth + ") rotate(240deg)" }
        ],
        { duration: settings.stoneFlightMs, easing: settings.stoneFlightEasing, fill: "forwards" }
      );
      activeAnimations.add(flight);

      var impactDone = function () {
        activeAnimations.delete(flight);
        if (token !== runToken || !img.isConnected) return Promise.resolve();
        // Impacto: si el objetivo era un pajaro, aqui (justo al golpear) game.js
        // dispara su muerte (destello + caida del cuervo) via onHit.
        var hitWait = Promise.resolve();
        if (onHit) {
          try {
            hitWait = Promise.resolve(onHit());
          } catch (e) {
            hitWait = Promise.resolve();
          }
        }
        // Rebote: sale despedida hacia el lateral por el que vino (si vino de
        // la derecha rebota hacia la derecha y viceversa), con un pequeno
        // arco (sube y cae) y giro, hasta CRUZAR el margen de la pantalla.
        // Sin fade: desaparece porque sale de los margenes.
        var grown = settings.stoneFlightGrowth;
        var stoneHalf = (startW * grown) / 2;
        var exitSide = dx > 0 ? -1 : 1; // deshace el sentido horizontal
        var exitDx = exitSide < 0
          ? -(startX + stoneHalf + 20) // centro mas alla del borde izquierdo
          : (window.innerWidth - startX) + stoneHalf + 20; // borde derecho
        var travel = Math.abs(exitDx - dx);
        var bounceMs = Math.max(
          settings.stoneBounceMinMs,
          Math.min(settings.stoneBounceMaxMs, travel / settings.stoneBounceSpeedPxMs)
        );
        var midDx = dx + (exitDx - dx) * 0.38;
        var bounce = img.animate(
          [
            {
              transform: "translate(" + dx + "px, " + dy + "px) scale(" + grown + ") rotate(240deg)",
              offset: 0
            },
            {
              transform: "translate(" + midDx + "px, " + (dy - settings.stoneBounceRisePx) + "px) scale(" + grown + ") rotate(340deg)",
              offset: 0.38
            },
            {
              transform: "translate(" + exitDx + "px, " + (dy + settings.stoneBounceDropPx) + "px) scale(" + (grown * 0.95) + ") rotate(540deg)",
              offset: 1
            }
          ],
          { duration: bounceMs, easing: "cubic-bezier(0.25, 0.35, 0.65, 1)", fill: "forwards" }
        );
        activeAnimations.add(bounce);
        var cleanup = function () {
          activeAnimations.delete(bounce);
          activeStones.delete(img);
          if (img.parentNode) img.parentNode.removeChild(img);
        };
        var bounceWait = bounce.finished.then(cleanup).catch(function () { cleanup(); });
        return Promise.all([hitWait, bounceWait]).then(function () {});
      };
      return flight.finished.then(impactDone).catch(function () {
        activeAnimations.delete(flight);
      });
    }

    // Piedra FALLADA: vuela hacia un punto CERCANO al objetivo (dx,dy ya llegan
    // apuntando a un lado de el, ver launchStone) y, en lugar de detenerse y
    // rebotar, lo pasa de largo y continua en linea recta hasta cruzar el margen
    // de la pantalla. El tramo hasta ese punto se recorre en el MISMO
    // tiempo/curva que un acierto (para que la salida sea indistinguible) y
    // despues mantiene la velocidad. Sin fade: desaparece porque sale de los
    // margenes.
    function flyStoneMiss(img, startX, startY, startW, dx, dy, token) {
      var grown = settings.stoneFlightGrowth;
      // Factor t>1 sobre el vector (dx,dy) para que la piedra salga de la
      // pantalla por el primer borde que cruce en esa direccion (contando su
      // tamano final + margen). Si la direccion es casi nula, sobrevuela poco.
      var margin = settings.stoneMissExitMarginPx + startW * grown;
      var ts = [];
      if (dx > 0) ts.push((window.innerWidth + margin - startX) / dx);
      else if (dx < 0) ts.push((-margin - startX) / dx);
      if (dy > 0) ts.push((window.innerHeight + margin - startY) / dy);
      else if (dy < 0) ts.push((-margin - startY) / dy);
      var t = ts.reduce(function (a, b) { return b > 0 ? Math.min(a, b) : a; }, Infinity);
      if (!isFinite(t) || t < 1.2) t = 1.6; // fallback: sobrevuela moderado

      var endDx = dx * t;
      var endDy = dy * t;

      // Duracion: el tramo 0->objetivo dura exactamente stoneFlightMs (igual
      // que un acierto); el resto continua a velocidad similar. Se acota t para
      // la duracion (no para la geometria) para que angulos rasantes no se
      // eternicen.
      var durationT = Math.min(t, settings.stoneMissDurationTCap);
      var missMs = settings.stoneFlightMs * durationT;
      var targetOffset = 1 / durationT; // instante en que pasa por el objetivo

      var miss = img.animate(
        [
          {
            transform: "translate(0px, 0px) scale(1) rotate(0deg)",
            offset: 0,
            easing: settings.stoneFlightEasing
          },
          {
            // Punto del objetivo: mismo estado que tendria un acierto al llegar.
            transform: "translate(" + dx + "px, " + dy + "px) scale(" + grown + ") rotate(240deg)",
            offset: targetOffset,
            easing: "linear"
          },
          {
            // Continua de largo, un pelin mas grande y girando, fuera de pantalla.
            transform: "translate(" + endDx + "px, " + endDy + "px) scale(" + (grown * 1.08) + ") rotate(" + Math.round(240 + 200 * (t - 1)) + "deg)",
            offset: 1
          }
        ],
        { duration: missMs, fill: "forwards" }
      );
      activeAnimations.add(miss);
      var cleanup = function () {
        activeAnimations.delete(miss);
        activeStones.delete(img);
        if (img.parentNode) img.parentNode.removeChild(img);
      };
      return miss.finished.then(cleanup).catch(function () { cleanup(); });
    }

    // items: [{ rect, target }] — rect (viewport) de la casilla del simbolo
    //   cortado donde aparece la puerta; target {x,y} (viewport) del punto al
    //   que el esqueleto lanza la piedra. game.js les añade despues
    //   item.trackHole() (rect actual del hueco + rect del carril, o null si
    //   expiro) para la salida con el spin (dismissForSpin).
    // showDelayMs: cuando mostrar el primer frame (ese simbolo ya oculto y su
    //   clon cayendo por delante). La reproduccion NO se programa aqui:
    //   game.js llama a play() cuando todos los simbolos han caido.
    function prepareForCut(items, showDelayMs) {
      clear();
      items = (items || []).filter(function (item) { return item && item.rect; });
      if (!items.length) return;
      warmCache();
      var token = ++runToken;
      timer(function () {
        items.forEach(function (item) { showFirstFrameAt(item, token); });
      }, Math.max(0, showDelayMs || 0), token);
    }

    function play() {
      return playAll();
    }

    // Salida al arrancar el siguiente spin: el ultimo frame se comporta como
    // UN SIMBOLO MAS. Nada de animacion enlatada ni fade: cada video sigue
    // frame a frame (rAF) el rect del hueco persistente de su rodillo
    // (item.trackHole, enlazado por game.js tras registrar los huecos), con
    // lo que hereda el MUELLE del arranque, la aceleracion y el settle; se
    // recorta contra el rect del carril con clip-path (mismo overflow:hidden
    // que recorta a los simbolos) y se retira en el instante en que el hueco
    // expira en el borde de la ventana visible.
    function dismissForSpin() {
      var videos = Array.from(activeVideos);
      if (!videos.length) {
        clear();
        return;
      }
      // Invalida piedras/timers en vuelo y limpia todo menos los videos.
      runToken++;
      pendingTimers.forEach(function (id) { window.clearTimeout(id); });
      pendingTimers.clear();
      activeAnimations.forEach(function (anim) {
        try { anim.cancel(); } catch (e) {}
      });
      activeAnimations.clear();
      activeStones.forEach(function (img) {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      activeStones.clear();
      activeVideos.clear();

      var exitingLayer = layerEl;
      layerEl = null; // un prepareForCut posterior creara capa nueva
      var pendingCount = videos.length;
      var removeOne = function (video) {
        if (video.__doorRemoved) return; // expiracion + cortafuegos: una vez
        video.__doorRemoved = true;
        if (video.__doorRaf) {
          window.cancelAnimationFrame(video.__doorRaf);
          video.__doorRaf = null;
        }
        try { video.pause(); } catch (e) {}
        if (video.parentNode) video.parentNode.removeChild(video);
        pendingCount--;
        if (pendingCount <= 0 && exitingLayer && exitingLayer.parentNode) {
          exitingLayer.parentNode.removeChild(exitingLayer);
        }
      };
      videos.forEach(function (video) {
        try { video.pause(); } catch (e) {}
        video.muted = true;
        var item = video.__doorItem || {};
        if (typeof item.trackHole !== "function") {
          removeOne(video);
          return;
        }
        var s = video.style;
        s.transition = "none"; // ni fade ni zoom durante la salida
        var step = function () {
          video.__doorRaf = null;
          if (video.__doorRemoved) return;
          var tracked = item.trackHole();
          if (!tracked || !tracked.rect || !tracked.rect.width) {
            // El hueco expiro en el borde de la ventana visible (o se
            // restauro): el video desaparece AHI, como un simbolo.
            removeOne(video);
            return;
          }
          var rect = tracked.rect;
          var w = rect.width / settings.contentWidthFrac;
          var h = rect.height / settings.contentHeightFrac;
          var left = rect.left - w * settings.contentLeftFrac;
          var top = rect.top - h * settings.contentTopFrac;
          s.left = left + "px";
          s.top = top + "px";
          s.width = w + "px";
          s.height = h + "px";
          var lane = tracked.laneRect;
          if (lane && lane.width) {
            s.clipPath = "inset(" +
              Math.max(0, lane.top - top) + "px " +
              Math.max(0, (left + w) - lane.right) + "px " +
              Math.max(0, (top + h) - lane.bottom) + "px " +
              Math.max(0, lane.left - left) + "px)";
          }
          video.__doorRaf = window.requestAnimationFrame(step);
        };
        step();
        // Cortafuegos: si el hueco no llegase a expirar (giro muy corto,
        // pestana en segundo plano), el video se retira igualmente.
        window.setTimeout(function () { removeOne(video); }, settings.dismissMaxMs);
      });
    }

    // Cancela timers/animaciones pendientes y retira videos (incluido el
    // ultimo frame fijado) y piedras AL INSTANTE. Para reset/debug; el spin
    // normal usa dismissForSpin() (salida animada).
    function clear() {
      runToken++;
      pendingTimers.forEach(function (id) { window.clearTimeout(id); });
      pendingTimers.clear();
      activeAnimations.forEach(function (anim) {
        try { anim.cancel(); } catch (e) {}
      });
      activeAnimations.clear();
      activeVideos.forEach(function (video) {
        try { video.pause(); } catch (e) {}
        if (video.parentNode) video.parentNode.removeChild(video);
      });
      activeVideos.clear();
      activeStones.forEach(function (img) {
        if (img.parentNode) img.parentNode.removeChild(img);
      });
      activeStones.clear();
      if (layerEl && layerEl.parentNode) {
        layerEl.parentNode.removeChild(layerEl);
      }
      layerEl = null;
    }

    return {
      prepareForCut: prepareForCut,
      play: play,
      dismissForSpin: dismissForSpin,
      clear: clear,
      settings: settings
    };
  }

  window.OssuarySmallBladeDoorVideo = {
    create: createSmallBladeDoorVideo,
    DEFAULTS: DEFAULTS
  };
})();
