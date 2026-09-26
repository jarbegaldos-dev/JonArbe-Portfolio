(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // RULETA GAME — contador del cofre + transicion + juego de ruleta.
  //
  // Flujo (juego BASE unicamente, nunca durante el bonus):
  //  1. Cada corte de la cuchilla pequena hace caer simbolos; game.js llama a
  //     addFallenSymbols(n) con cuantos simbolos cayeron (las cuchillas NO
  //     cuentan). El total se muestra como contador sobre el cofre central.
  //  2. El contador no tiene limite fijo: sigue subiendo hasta que, una vez
  //     superada una ventana variable de activacion, un spin paga mas de x5.
  //     Entonces el cofre del juego se sustituye por el VIDEO del cofre
  //     abriendose, alineado frame a frame (el video arranca escalado/posicionado
  //     para que su cofre coincida exactamente con el cofre estatico, y hace zoom
  //     a pantalla completa mientras reproduce). Justo antes de terminar, flash
  //     rapido blanco -> negro.
  //  3. Sobre el negro aparece la pantalla PLAY (boton circular estilo SPIN).
  //  4. PLAY monta la ruleta: fondo + rueda (detras del recubrimiento, dentro
  //     del aro bajo la flecha) + tablero encima, con dos botones:
  //       - COLLECT: cobra apuesta x1 (premio por llenar el cofre) y vuelve al
  //         juego base con un flash.
  //       - GAMBLE: la rueda gira; negro = x0, blanco = x25, BONUS GAME =
  //         activa directamente el Bonus Game FREE SPIN con un flash.
  //     Bajo los botones se muestra el premio actual (apuesta x1).
  //
  // Probabilidad del giro: sector uniforme (5 negros, 4 blancos, 1 bonus) —
  // PROVISIONAL, pendiente de modelo matematico real (Codex).
  //
  // Contrato de independencia: este modulo NO toca RNG de reels, outcome,
  // locks ni strips. Cobra premios y entra al bonus SOLO via los hooks que
  // game.js inyecta con configure() (pago via payment-engine real).
  // ---------------------------------------------------------------------------

  var SYMBOL_TRIGGER_MIN = 40;
  var SYMBOL_TRIGGER_MAX = 53;
  var MIN_OPEN_WIN_MULTIPLE = 5;
  // El flash blanco arranca este margen antes del final del video.
  var FLASH_LEAD_MS = 550;
  // Fallback por si el video no puede reproducirse (asset ausente, autoplay
  // bloqueado...): se salta directo al flash para no dejar la pantalla colgada.
  var VIDEO_FAILSAFE_MS = 6500;
  // Zoom del video: de "cofre alineado con el del juego" a pantalla completa.
  var VIDEO_ZOOM_MS = 900;

  // Caja visible del cofre en el PRIMER frame del video (medida sobre el
  // webm ya sin croma, en coordenadas del frame 1920x1080). Sirve para
  // calcular el encaje inicial video<->cofre del juego en cualquier viewport.
  var VIDEO_FRAME = { w: 1920, h: 1080 };
  var VIDEO_CHEST_BBOX = { x: 813, y: 700, w: 292, h: 242 };

  // Sectores de la rueda, en sentido horario empezando por el que esta bajo
  // la flecha con la imagen en reposo (BONUS GAME arriba). El PNG real tiene
  // 11 casillas: BONUS + 5 negras x0 + 5 blancas x25.
  var WHEEL_SECTORS = ["BONUS", "X0", "X25", "X0", "X25", "X0", "X25", "X0", "X25", "X0", "X25"];
  // Layout explicito de centros: el PNG esta pintado con BONUS arriba en
  // reposo, y el resto de casillas cada 36 grados en sentido horario. El giro
  // siempre termina en uno de estos centros, nunca en los bordes.
  var WHEEL_CENTER_OFFSET_DEG = 0;
  var WHEEL_POINTER_ANGLE_DEG = 0;
  var WHEEL_SPIN_MS = 4600;
  var WHEEL_FULL_TURNS = 5;
  var WHEEL_SECTOR_DEG = 360 / WHEEL_SECTORS.length;
  var WHEEL_TICK_MIN_MS = 38;
  var WHEEL_TICK_MAX_MS = 155;
  var WHEEL_LAYOUT = WHEEL_SECTORS.map(function (result, index) {
    var centerAngle = normalizeDeg(WHEEL_CENTER_OFFSET_DEG + index * WHEEL_SECTOR_DEG);
    return {
      index: index,
      result: result,
      centerAngle: centerAngle,
      targetRotation: normalizeDeg(WHEEL_POINTER_ANGLE_DEG - centerAngle)
    };
  });

  var ASSETS = {
    video: "assets/ruleta/cofre_apertura.webm",
    fondo: "assets/ruleta/fondo_juego_ruleta.png",
    tablero: "assets/ruleta/tablero_ruleta.png",
    ruleta: "assets/ruleta/ruleta.png"
  };

  // Hooks inyectados por game.js (configure). Sin ellos el modulo funciona en
  // modo visual puro (no paga, no entra al bonus).
  var hooks = {
    getBet: function () { return 0; },
    payWin: null,
    showWinCounter: null,
    enterFreeSpins: null
  };

  var count = 0;
  var triggerCount = randomTriggerCount();
  var sequenceStarted = false;
  // La apertura del cofre solo se evalua cuando game.js ya termino animaciones
  // y pagos del spin; asi el video nunca tapa las lineas ni los contadores.
  var counterEl = null;
  var chestRigEl = null;
  var chestBodyEl = null;
  var chestImgEl = null;
  var chestReactionTimer = null;
  var chestReactionStep = 0;
  var transitionEl = null;
  var ruletaScreenEl = null;
  var failsafeTimer = null;
  var hiddenChestForVideo = false;
  var wheelImgEl = null;
  var wheelRotation = 0;
  var wheelSpinning = false;
  var wheelTickTimer = null;
  var wheelTickStartedAt = 0;
  var ruletaPrizeEl = null;
  var ruletaButtonsRowEl = null;
  var ruletaResultImpactEl = null;
  var ruletaImpactTimer = null;
  var ruletaResultTimer = null;
  var ruletaResultTickTimer = null;
  var ruletaResultFrame = null;

  function chestLayerEl() {
    return document.querySelector('[data-scene-layer="chest_normal_game"]');
  }

  function ensureChestRig() {
    if (chestRigEl && chestRigEl.isConnected) return chestRigEl;
    var chest = chestLayerEl();
    if (!chest) return null;
    if (chest.classList && chest.classList.contains("ruleta-chest-rig")) {
      chestRigEl = chest;
      chestBodyEl = chest.querySelector(".ruleta-chest-rig__body");
      chestImgEl = chest.querySelector(".ruleta-chest-rig__image");
      return chestRigEl;
    }
    var parent = chest.parentNode;
    if (!parent) return null;

    var rig = document.createElement("div");
    rig.className = chest.className + " ruleta-chest-rig";
    rig.dataset.sceneLayer = "chest_normal_game";
    rig.hidden = chest.hidden;

    var body = document.createElement("div");
    body.className = "ruleta-chest-rig__body";

    chest.removeAttribute("data-scene-layer");
    chest.hidden = false;
    chest.className = "ruleta-chest-rig__image";

    parent.insertBefore(rig, chest);
    body.appendChild(chest);
    rig.appendChild(body);
    chestRigEl = rig;
    chestBodyEl = body;
    chestImgEl = chest;
    return chestRigEl;
  }

  function randomTriggerCount() {
    return SYMBOL_TRIGGER_MIN + Math.floor(Math.random() * (SYMBOL_TRIGGER_MAX - SYMBOL_TRIGGER_MIN + 1));
  }

  // --- Contador sobre el cofre ----------------------------------------------
  // Vive en #structureOverlay (mismo contenedor y por tanto mismo transform
  // que el cofre) y espeja su atributo hidden, de modo que desaparece con el
  // cofre durante el Bonus Game sin mas puntos de sincronizacion.
  function ensureCounter() {
    if (counterEl && counterEl.isConnected) return counterEl;
    var chest = ensureChestRig();
    if (!chest) return null;
    counterEl = document.createElement("div");
    counterEl.className = "ruleta-chest-counter game-number";
    counterEl.textContent = String(count);
    counterEl.hidden = chest.hidden;
    (chestBodyEl || chest).appendChild(counterEl);
    var observer = new MutationObserver(function () {
      counterEl.hidden = chest.hidden;
    });
    observer.observe(chest, { attributes: true, attributeFilter: ["hidden"] });
    return counterEl;
  }

  function renderCounter() {
    var el = ensureCounter();
    if (!el) return;
    el.textContent = String(count);
    if (count >= triggerCount) el.classList.add("ruleta-chest-counter--full");
    else el.classList.remove("ruleta-chest-counter--full");
  }

  function clearChestReactionClasses() {
    var rig = ensureChestRig();
    if (rig) {
      rig.classList.remove(
        "ruleta-chest-rig--react-soft",
        "ruleta-chest-rig--react-medium",
        "ruleta-chest-rig--react-hard",
        "ruleta-chest-rig--react-ready"
      );
    }
    if (counterEl) {
      counterEl.classList.remove(
        "ruleta-chest-counter--react-soft",
        "ruleta-chest-counter--react-medium",
        "ruleta-chest-counter--react-hard",
        "ruleta-chest-counter--react-ready"
      );
    }
  }

  function chestReactionIntensity(amount) {
    chestReactionStep += 1;
    if (count >= triggerCount) return "ready";
    if (amount >= 7) return "hard";
    if (amount >= 4) return chestReactionStep % 3 === 0 ? "hard" : "medium";
    if ((count + chestReactionStep) % 5 === 0) return "medium";
    return "soft";
  }

  function playChestCounterReaction(amount) {
    var rig = ensureChestRig();
    var el = ensureCounter();
    if (!rig || !el) return;
    var intensity = chestReactionIntensity(amount);
    if (chestReactionTimer) {
      window.clearTimeout(chestReactionTimer);
      chestReactionTimer = null;
    }
    clearChestReactionClasses();
    void rig.offsetWidth;
    rig.classList.add("ruleta-chest-rig--react-" + intensity);
    el.classList.add("ruleta-chest-counter--react-" + intensity);
    chestReactionTimer = window.setTimeout(function () {
      clearChestReactionClasses();
      chestReactionTimer = null;
    }, intensity === "ready" ? 980 : intensity === "hard" ? 760 : 540);
  }

  function addFallenSymbols(n) {
    n = Number(n) || 0;
    if (n <= 0 || sequenceStarted) return count;
    count += n;
    renderCounter();
    playChestCounterReaction(n);
    return count;
  }

  function shouldOpenAfterSpin(result) {
    result = result || {};
    var bet = Number(result.bet) || 0;
    var win = Number(result.win) || 0;
    var spinType = result.spinType || "BASE";
    if (spinType !== "BASE") return false;
    if (sequenceStarted) return false;
    if (count < triggerCount) return false;
    if (bet <= 0 || win <= 0) return false;
    return (win / bet) > MIN_OPEN_WIN_MULTIPLE;
  }

  // Arranca la apertura del cofre si el contador ya esta listo y el spin acaba
  // de pagar mas de x5. La llama game.js cuando el spin ya revelo y pago todo.
  function startPendingSequence(result) {
    if (!shouldOpenAfterSpin(result)) return false;
    startTransitionSequence();
    return true;
  }

  function resetCounter() {
    if (chestReactionTimer) {
      window.clearTimeout(chestReactionTimer);
      chestReactionTimer = null;
    }
    clearChestReactionClasses();
    count = 0;
    triggerCount = randomTriggerCount();
    renderCounter();
  }

  function formatPrizeAmount(amount) {
    return Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function normalizeDeg(value) {
    return ((Number(value || 0) % 360) + 360) % 360;
  }

  function angleDistance(a, b) {
    var diff = Math.abs(normalizeDeg(a) - normalizeDeg(b));
    return Math.min(diff, 360 - diff);
  }

  function imageAngleAtPointer(rotation) {
    return normalizeDeg(WHEEL_POINTER_ANGLE_DEG - rotation);
  }

  function wheelLayoutForIndex(index) {
    return WHEEL_LAYOUT[((index % WHEEL_LAYOUT.length) + WHEEL_LAYOUT.length) % WHEEL_LAYOUT.length];
  }

  function targetRotationForSector(index) {
    return wheelLayoutForIndex(index).targetRotation;
  }

  function sectorIndexAtPointer(rotation) {
    var pointerAngle = imageAngleAtPointer(rotation);
    var best = WHEEL_LAYOUT[0];
    var bestDistance = angleDistance(pointerAngle, best.centerAngle);
    for (var i = 1; i < WHEEL_LAYOUT.length; i++) {
      var distance = angleDistance(pointerAngle, WHEEL_LAYOUT[i].centerAngle);
      if (distance < bestDistance) {
        best = WHEEL_LAYOUT[i];
        bestDistance = distance;
      }
    }
    return best.index;
  }

  function resultAtPointer(rotation) {
    return WHEEL_SECTORS[sectorIndexAtPointer(rotation)];
  }

  function snapRotationToSector(rotation, sectorIndex) {
    var targetMod = targetRotationForSector(sectorIndex);
    var turns = Math.round((Number(rotation || 0) - targetMod) / 360);
    return targetMod + turns * 360;
  }

  // --- Encaje video <-> cofre del juego --------------------------------------
  // El video se pinta a pantalla completa con object-fit cover. Devuelve la
  // transformacion (translate + scale uniforme) que hay que aplicar al
  // contenedor del video para que el cofre de su PRIMER frame coincida con el
  // rect del cofre estatico del juego.
  function computeVideoAlignTransform() {
    var chest = chestLayerEl();
    if (!chest) return null;
    var target = chest.getBoundingClientRect();
    if (!target.width || !target.height) return null;

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    // object-fit: cover
    var cover = Math.max(vw / VIDEO_FRAME.w, vh / VIDEO_FRAME.h);
    var dispW = VIDEO_FRAME.w * cover;
    var dispH = VIDEO_FRAME.h * cover;
    var offX = (vw - dispW) / 2;
    var offY = (vh - dispH) / 2;

    // Rect en pantalla del cofre del video (frame 0).
    var srcX = offX + VIDEO_CHEST_BBOX.x * cover;
    var srcY = offY + VIDEO_CHEST_BBOX.y * cover;
    var srcW = VIDEO_CHEST_BBOX.w * cover;
    var srcH = VIDEO_CHEST_BBOX.h * cover;

    var scale = target.width / srcW;
    var srcCx = srcX + srcW / 2;
    var srcCy = srcY + srcH / 2;
    var dstCx = target.left + target.width / 2;
    // Ancla por la BASE del cofre (ambos cofres "apoyan" en el suelo).
    var dstCy = target.top + target.height - (srcH * scale) / 2;

    return {
      originX: srcCx,
      originY: srcCy,
      translateX: dstCx - srcCx,
      translateY: dstCy - srcCy,
      scale: scale
    };
  }

  // --- Transicion: video del cofre + flash blanco->negro + pantalla PLAY ----

  function startTransitionSequence() {
    if (sequenceStarted) return;
    sequenceStarted = true;

    transitionEl = document.createElement("div");
    transitionEl.className = "ruleta-transition";

    var zoom = document.createElement("div");
    zoom.className = "ruleta-transition__zoom";

    var video = document.createElement("video");
    video.className = "ruleta-transition__video";
    video.src = ASSETS.video;
    // El video del cofre trae su propio audio: se reproduce CON sonido
    // (siempre llega tras interaccion del jugador, autoplay permitido).
    video.muted = false;
    video.volume = 1;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("playsinline", "");
    video.disablePictureInPicture = true;

    var flash = document.createElement("div");
    flash.className = "ruleta-transition__flash";

    zoom.appendChild(video);
    transitionEl.appendChild(zoom);
    transitionEl.appendChild(flash);
    document.body.appendChild(transitionEl);

    // Arranque alineado: el cofre del primer frame del video coincide con el
    // cofre del juego; luego zoom suave hasta pantalla completa.
    var align = computeVideoAlignTransform();
    if (align) {
      zoom.style.transformOrigin = align.originX + "px " + align.originY + "px";
      zoom.style.transform =
        "translate(" + align.translateX + "px, " + align.translateY + "px) scale(" + align.scale + ")";
    }

    var chest = chestLayerEl();
    function swapChestForVideo() {
      // Ocultar el cofre estatico (y su contador via observer) SOLO cuando el
      // video ya esta pintando, para que no haya hueco ni doble cofre.
      if (chest && !chest.hidden) {
        chest.hidden = true;
        hiddenChestForVideo = true;
      }
      if (align) {
        // Zoom a pantalla completa mientras el video reproduce.
        zoom.style.transition = "transform " + VIDEO_ZOOM_MS + "ms cubic-bezier(0.32, 0.05, 0.35, 1)";
        window.requestAnimationFrame(function () {
          zoom.style.transform = "translate(0px, 0px) scale(1)";
        });
      }
    }
    video.addEventListener("playing", swapChestForVideo, { once: true });

    var flashFired = false;
    function fireFlash() {
      if (flashFired) return;
      flashFired = true;
      flash.classList.add("ruleta-transition__flash--active");
    }

    var playShown = false;
    function showPlay() {
      if (playShown) return;
      playShown = true;
      if (failsafeTimer) { window.clearTimeout(failsafeTimer); failsafeTimer = null; }
      fireFlash();
      showPlayScreen();
    }

    video.addEventListener("timeupdate", function () {
      if (!flashFired && video.duration && video.currentTime >= video.duration - FLASH_LEAD_MS / 1000) {
        fireFlash();
      }
    });
    video.addEventListener("ended", showPlay);
    video.addEventListener("error", showPlay);
    failsafeTimer = window.setTimeout(showPlay, VIDEO_FAILSAFE_MS);

    var p = video.play();
    if (p && p.catch) p.catch(function () {
      // Si el navegador bloquea el autoplay CON sonido, mejor el video mudo
      // que saltarse la transicion entera.
      video.muted = true;
      var retry = video.play();
      if (retry && retry.catch) retry.catch(function () { showPlay(); });
    });
  }

  function showPlayScreen() {
    if (!transitionEl) return;
    var playScreen = document.createElement("div");
    playScreen.className = "ruleta-play-screen";

    var btn = document.createElement("button");
    btn.className = "ruleta-play-btn";
    btn.type = "button";
    btn.textContent = "PLAY";
    btn.setAttribute("aria-label", "Jugar a la ruleta");
    btn.addEventListener("click", function () {
      showRuletaScreen();
    });

    playScreen.appendChild(btn);
    transitionEl.appendChild(playScreen);
    window.requestAnimationFrame(function () {
      playScreen.classList.add("ruleta-play-screen--visible");
    });
  }

  // --- Flash generico de salida (blanco rapido, revela lo de debajo) --------
  function flashAndRun(swapFn) {
    var flash = document.createElement("div");
    flash.className = "ruleta-flash-out";
    document.body.appendChild(flash);
    window.requestAnimationFrame(function () {
      flash.classList.add("ruleta-flash-out--white");
      window.setTimeout(function () {
        swapFn();
        flash.classList.remove("ruleta-flash-out--white");
        window.setTimeout(function () {
          if (flash.parentNode) flash.parentNode.removeChild(flash);
        }, 480);
      }, 170);
    });
  }

  // --- Pantalla del juego de ruleta ------------------------------------------

  function showRuletaScreen() {
    if (ruletaScreenEl) return ruletaScreenEl;
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("ruleta_started", {});
    ruletaScreenEl = document.createElement("div");
    ruletaScreenEl.className = "ruleta-screen";

    // Escenario interno: alto = 100dvh, relacion nativa 16:9 de fondo y
    // tablero. El recorte de cover es SOLO horizontal y simetrico, asi que
    // las posiciones verticales en % y el centrado horizontal se conservan.
    var stage = document.createElement("div");
    stage.className = "ruleta-screen__stage";

    var fondo = document.createElement("img");
    fondo.className = "ruleta-screen__fondo";
    fondo.src = ASSETS.fondo;
    fondo.alt = "";
    fondo.draggable = false;

    // La rueda va DETRAS del tablero, con su borde metido bajo el aro del
    // recubrimiento (aro medido sobre el PNG del tablero: centro en
    // x=+23.5px del centro, y=575.5px, radio interior 362.5px, en 3840x2160).
    var wheelBox = document.createElement("div");
    wheelBox.className = "ruleta-screen__wheel-box";
    wheelImgEl = document.createElement("img");
    wheelImgEl.className = "ruleta-screen__ruleta";
    wheelImgEl.src = ASSETS.ruleta;
    wheelImgEl.alt = "";
    wheelImgEl.draggable = false;
    wheelBox.appendChild(wheelImgEl);

    var tablero = document.createElement("img");
    tablero.className = "ruleta-screen__tablero";
    tablero.src = ASSETS.tablero;
    tablero.alt = "";
    tablero.draggable = false;

    var resultImpact = document.createElement("div");
    resultImpact.className = "ruleta-screen__result-impact game-number";
    resultImpact.hidden = true;
    ruletaResultImpactEl = resultImpact;

    // Botonera GAMBLE / COLLECT + premio actual (apuesta x1) debajo.
    var controls = document.createElement("div");
    controls.className = "ruleta-screen__controls";

    var gambleBtn = document.createElement("button");
    gambleBtn.className = "ruleta-action-btn ruleta-action-btn--gamble";
    gambleBtn.type = "button";
    gambleBtn.textContent = "GAMBLE";

    var collectBtn = document.createElement("button");
    collectBtn.className = "ruleta-action-btn ruleta-action-btn--collect";
    collectBtn.type = "button";
    collectBtn.textContent = "COLLECT";

    var prize = document.createElement("div");
    prize.className = "ruleta-screen__prize game-number";
    prize.textContent = formatPrizeAmount(hooks.getBet() * 1);
    ruletaPrizeEl = prize;

    var buttonsRow = document.createElement("div");
    buttonsRow.className = "ruleta-screen__buttons";
    ruletaButtonsRowEl = buttonsRow;
    buttonsRow.appendChild(gambleBtn);
    buttonsRow.appendChild(collectBtn);
    controls.appendChild(buttonsRow);
    // El premio de la ruleta se muestra solo en el impacto central grande.
    prize.hidden = true;

    gambleBtn.addEventListener("click", function () { startGamble(gambleBtn, collectBtn); });
    collectBtn.addEventListener("click", function () { collectPrize(gambleBtn, collectBtn); });

    stage.appendChild(fondo);
    stage.appendChild(wheelBox);
    stage.appendChild(tablero);
    stage.appendChild(resultImpact);
    stage.appendChild(controls);
    ruletaScreenEl.appendChild(stage);
    document.body.appendChild(ruletaScreenEl);

    // Una vez montada la ruleta, la transicion (video/flash/PLAY) sobra.
    if (transitionEl && transitionEl.parentNode) {
      transitionEl.parentNode.removeChild(transitionEl);
      transitionEl = null;
    }
    return ruletaScreenEl;
  }

  function stopWheelTickSound() {
    if (wheelTickTimer) {
      window.clearTimeout(wheelTickTimer);
      wheelTickTimer = null;
    }
    wheelTickStartedAt = 0;
  }

  function clearResultTimers() {
    if (ruletaResultTimer) {
      window.clearTimeout(ruletaResultTimer);
      ruletaResultTimer = null;
    }
    if (ruletaResultTickTimer) {
      window.clearTimeout(ruletaResultTickTimer);
      ruletaResultTickTimer = null;
    }
    if (ruletaImpactTimer) {
      window.clearTimeout(ruletaImpactTimer);
      ruletaImpactTimer = null;
    }
    if (ruletaResultFrame) {
      window.cancelAnimationFrame(ruletaResultFrame);
      ruletaResultFrame = null;
    }
  }

  function playWheelTickSound() {
    if (!window.OssuaryAudio || !window.OssuaryAudio.play) return;
    window.OssuaryAudio.play("reel-stop", {
      volume: 0.16,
      pitch: 1.35 + Math.random() * 0.18,
      maxDurationMs: 58,
      priority: 62
    });
  }

  function scheduleWheelTickSound() {
    stopWheelTickSound();
    wheelTickStartedAt = window.performance ? window.performance.now() : Date.now();

    function tick() {
      if (!wheelSpinning) {
        stopWheelTickSound();
        return;
      }
      var now = window.performance ? window.performance.now() : Date.now();
      var elapsed = Math.max(0, now - wheelTickStartedAt);
      var progress = Math.min(1, elapsed / WHEEL_SPIN_MS);
      // Rapido al principio, cada vez mas separado mientras la rueda frena.
      var eased = progress * progress;
      var interval = WHEEL_TICK_MIN_MS + (WHEEL_TICK_MAX_MS - WHEEL_TICK_MIN_MS) * eased;
      playWheelTickSound();
      wheelTickTimer = window.setTimeout(tick, interval);
    }

    tick();
  }

  function startPurchasedGame() {
    if (sequenceStarted || wheelSpinning) return false;
    sequenceStarted = true;
    showRuletaScreen();
    return true;
  }

  // COLLECT: cobra apuesta x1 y vuelve al juego base con un flash.
  function collectPrize(gambleBtn, collectBtn) {
    if (wheelSpinning) return;
    gambleBtn.disabled = true;
    collectBtn.disabled = true;
    var amount = hooks.getBet() * 1;
    flashAndRun(function () {
      close();
      if (hooks.payWin && amount > 0) hooks.payWin(amount, "ruleta_collect");
    });
  }

  // GAMBLE: gira la rueda. Negro = x0, blanco = x25, BONUS GAME = free spins.
  function startGamble(gambleBtn, collectBtn) {
    if (wheelSpinning || !wheelImgEl) return;
    wheelSpinning = true;
    gambleBtn.disabled = true;
    collectBtn.disabled = true;

    // Sector uniforme (PROVISIONAL, ver cabecera).
    var sectorIndex = Math.floor(Math.random() * WHEEL_SECTORS.length);

    // Rotacion exacta al CENTRO del sector elegido. Sin jitter: nunca debe
    // quedar entre dos triangulos ni visual ni logicamente.
    var targetMod = targetRotationForSector(sectorIndex);
    var currentMod = ((wheelRotation % 360) + 360) % 360;
    var delta = WHEEL_FULL_TURNS * 360 + ((targetMod - currentMod + 360) % 360);
    wheelRotation += delta;

    wheelImgEl.style.transition = "transform " + WHEEL_SPIN_MS + "ms cubic-bezier(0.15, 0.55, 0.08, 1)";
    wheelImgEl.style.transform = "rotate(" + wheelRotation + "deg)";
    scheduleWheelTickSound();

    window.setTimeout(function () {
      wheelSpinning = false;
      stopWheelTickSound();
      wheelRotation = snapRotationToSector(wheelRotation, sectorIndex);
      if (wheelImgEl) {
        wheelImgEl.style.transition = "none";
        wheelImgEl.style.transform = "rotate(" + wheelRotation + "deg)";
      }
      var resolvedIndex = sectorIndexAtPointer(wheelRotation);
      var resolvedResult = WHEEL_SECTORS[resolvedIndex];
      if (ruletaScreenEl) {
        ruletaScreenEl.dataset.ruletaSectorIndex = String(resolvedIndex);
        ruletaScreenEl.dataset.ruletaResult = resolvedResult;
        ruletaScreenEl.dataset.ruletaPointerAngle = String(Math.round(imageAngleAtPointer(wheelRotation) * 100) / 100);
      }
      resolveGamble(resolvedResult);
    }, WHEEL_SPIN_MS + 600);
  }

  function resolveGamble(result) {
    var bet = hooks.getBet();
    if (result === "BONUS") {
      showBonusResultButton();
      return;
    }
    var amount = result === "X25" ? bet * 25 : 0;
    if (amount <= 0) {
      clearResultTimers();
      setPrizeResultText(formatPrizeAmount(0));
      ruletaResultTimer = window.setTimeout(function () {
        ruletaResultTimer = null;
        flashAndRun(function () {
          close();
        });
      }, 900);
      return;
    }

    if (hooks.payWin) hooks.payWin(amount, "ruleta_gamble_x25");
    showNormalWinCounter(amount, bet).then(function () {
      flashAndRun(function () {
        close();
      });
    });
  }

  function setPrizeResultText(text) {
    if (ruletaPrizeEl) {
      ruletaPrizeEl.classList.add("ruleta-screen__prize--result");
      ruletaPrizeEl.textContent = text;
    }
    showResultImpact(text);
  }

  function showResultImpact(text) {
    if (!ruletaResultImpactEl) return;
    if (ruletaImpactTimer) {
      window.clearTimeout(ruletaImpactTimer);
      ruletaImpactTimer = null;
    }
    ruletaResultImpactEl.hidden = false;
    ruletaResultImpactEl.classList.toggle("ruleta-screen__result-impact--bonus", !/[0-9]/.test(String(text)));
    if (window.OssuaryNumberFont && /[0-9]/.test(String(text))) {
      window.OssuaryNumberFont.render(ruletaResultImpactEl, text);
    } else {
      ruletaResultImpactEl.textContent = text;
    }
    ruletaResultImpactEl.style.transition = "none";
    ruletaResultImpactEl.style.opacity = "0";
    ruletaResultImpactEl.style.transform = "translate(-50%, -50%) scale(0.62)";
    ruletaImpactTimer = window.setTimeout(function () {
      if (!ruletaResultImpactEl) return;
      ruletaResultImpactEl.style.transition = "transform 220ms cubic-bezier(0.12, 1.08, 0.28, 1), opacity 110ms ease-out";
      ruletaResultImpactEl.style.opacity = "1";
      ruletaResultImpactEl.style.transform = "translate(-50%, -50%) scale(1.18)";
      ruletaImpactTimer = window.setTimeout(function () {
        ruletaImpactTimer = null;
        if (!ruletaResultImpactEl) return;
        ruletaResultImpactEl.style.transition = "transform 180ms ease-out";
        ruletaResultImpactEl.style.transform = "translate(-50%, -50%) scale(1)";
      }, 220);
    }, 30);
  }

  function showPrizeAmountResult(targetAmount, done) {
    clearResultTimers();
    targetAmount = Math.max(0, Number(targetAmount) || 0);
    var duration = targetAmount > 0 ? 1280 : 720;
    var start = window.performance ? window.performance.now() : Date.now();
    var lastShownCents = -1;

    function step() {
      var now = window.performance ? window.performance.now() : Date.now();
      var progress = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = targetAmount > 0 ? targetAmount * eased : 0;
      var cents = Math.round(value * 100);
      if (cents !== lastShownCents) {
        lastShownCents = cents;
        setPrizeResultText(formatPrizeAmount(cents / 100));
        if (cents > 0 && window.OssuaryAudio && window.OssuaryAudio.play) {
          window.OssuaryAudio.play("big-win-counter-pause", {
            volume: 0.22,
            pitch: 1.1 + Math.min(progress, 1) * 0.28,
            maxDurationMs: 70,
            priority: 64
          });
        }
      }
      if (progress < 1) {
        ruletaResultTickTimer = window.setTimeout(step, 33);
        return;
      }
      ruletaResultTickTimer = null;
      setPrizeResultText(formatPrizeAmount(targetAmount));
      ruletaResultTimer = window.setTimeout(function () {
        ruletaResultTimer = null;
        if (done) done();
      }, targetAmount > 0 ? 520 : 900);
    }

    step();
  }

  function showNormalWinCounter(amount, bet) {
    if (hooks.showWinCounter && amount > 0) {
      return Promise.resolve(hooks.showWinCounter(amount, bet));
    }
    return new Promise(function (resolve) {
      showPrizeAmountResult(amount, resolve);
    });
  }

  function showBonusResultButton() {
    clearResultTimers();
    setPrizeResultText("BONUS GAME");
    if (!ruletaButtonsRowEl) return;
    ruletaButtonsRowEl.replaceChildren();

    var freeBtn = document.createElement("button");
    freeBtn.className = "ruleta-action-btn ruleta-action-btn--free-games";
    freeBtn.type = "button";
    freeBtn.textContent = "FREE GAMES";
    freeBtn.addEventListener("click", function () {
      freeBtn.disabled = true;
      flashAndRun(function () {
        close({ nextMode: "bonus" });
        if (hooks.enterFreeSpins) hooks.enterFreeSpins();
      });
    });

    ruletaButtonsRowEl.appendChild(freeBtn);
  }

  // Cierra todas las capas del modulo y resetea el contador (vuelta al slot).
  function close(options) {
    options = options || {};
    if (transitionEl && transitionEl.parentNode) transitionEl.parentNode.removeChild(transitionEl);
    transitionEl = null;
    if (ruletaScreenEl && ruletaScreenEl.parentNode) ruletaScreenEl.parentNode.removeChild(ruletaScreenEl);
    ruletaScreenEl = null;
    wheelImgEl = null;
    ruletaPrizeEl = null;
    ruletaButtonsRowEl = null;
    ruletaResultImpactEl = null;
    wheelRotation = 0;
    wheelSpinning = false;
    stopWheelTickSound();
    clearResultTimers();
    if (failsafeTimer) { window.clearTimeout(failsafeTimer); failsafeTimer = null; }
    if (hiddenChestForVideo) {
      var chest = chestLayerEl();
      if (chest) chest.hidden = false;
      hiddenChestForVideo = false;
    }
    sequenceStarted = false;
    resetCounter();
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("ruleta_closed", { nextMode: options.nextMode || "normal" });
  }

  // Pintar el contador inicial en cuanto el DOM este listo (el cofre ya
  // existe: scene-manager.js corre antes que este script). Debug por URL
  // (?rgdebug=sequence|play|ruleta) para revisar las pantallas sin jugar.
  function init() {
    renderCounter();
    var mode = null;
    try { mode = new URLSearchParams(window.location.search).get("rgdebug"); } catch (e) {}
    if (mode === "sequence") {
      startTransitionSequence();
    } else if (mode === "play") {
      sequenceStarted = true;
      transitionEl = document.createElement("div");
      transitionEl.className = "ruleta-transition";
      document.body.appendChild(transitionEl);
      showPlayScreen();
    } else if (mode === "ruleta") {
      sequenceStarted = true;
      showRuletaScreen();
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.OssuaryRuletaGame = {
    SYMBOL_TRIGGER_MIN: SYMBOL_TRIGGER_MIN,
    SYMBOL_TRIGGER_MAX: SYMBOL_TRIGGER_MAX,
    MIN_OPEN_WIN_MULTIPLE: MIN_OPEN_WIN_MULTIPLE,
    // game.js inyecta aqui sus hooks reales (bet, pago, entrada al bonus).
    configure: function (h) {
      h = h || {};
      if (typeof h.getBet === "function") hooks.getBet = h.getBet;
      if (typeof h.payWin === "function") hooks.payWin = h.payWin;
      if (typeof h.showWinCounter === "function") hooks.showWinCounter = h.showWinCounter;
      if (typeof h.enterFreeSpins === "function") hooks.enterFreeSpins = h.enterFreeSpins;
    },
    addFallenSymbols: addFallenSymbols,
    startPendingSequence: startPendingSequence,
    startPurchasedGame: startPurchasedGame,
    getCount: function () { return count; },
    getTriggerCount: function () { return triggerCount; },
    resetCounter: resetCounter,
    close: close,
    debug: {
      setCount: function (n) {
        count = Math.max(0, Number(n) || 0);
        renderCounter();
        return count;
      },
      addFallenSymbols: addFallenSymbols,
      setTriggerCount: function (n) {
        triggerCount = Math.max(1, Number(n) || SYMBOL_TRIGGER_MIN);
        renderCounter();
        return triggerCount;
      },
      forceSequence: startTransitionSequence,
      showRuleta: showRuletaScreen
    }
  };
})();
