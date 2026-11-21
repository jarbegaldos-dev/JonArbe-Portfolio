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
  //  3. Sobre el negro aparece la pantalla PLAY (boton de pergamino,
  //     src/ui/parchment-ui.js).
  //  4. PLAY monta la ruleta: la maquina de huesos sobre el fondo del
  //     castillo, con un pergamino a cada lado (buildScrolls: el cuento y lo
  //     que da cada llave) y debajo de cada uno su boton de pergamino:
  //       - COLLECT: cobra la apuesta x COLLECT_MULTIPLIER (premio por llenar
  //         el cofre) y vuelve al
  //         juego base con un flash.
  //       - GAMBLE: la rueda gira y para con una llave bajo la mano: bronce
  //         (x0 o x10), plata (x25 o x50), oro (x100), roja (BONUS GAME) o
  //         negra (SUPER BONUS; al reves hasta el 2026-10-18, peticion del
  //         usuario). Carga antes de girar, giro fisico que frena
  //         en cada separacion, cae en su casilla con un golpe seco y no se
  //         mueve de ella (planSpin); al frenar cae la oscuridad y la maquina
  //         tiembla. Al parar se va la luz, la llave se enciende, su luz
  //         baja al abismo del centro y el premio sale de alli, cada uno con
  //         su efecto (PRIZE_FX). BONUS GAME y SUPER BONUS: fundido y el
  //         video de entrada del bonus que saca game.js.
  //
  // Probabilidad del giro: se sortea el PREMIO con WHEEL_PRIZES (pesos
  // PROVISIONALES, a peticion del usuario el 2026-10-15; SUPER BONUS ~1 de
  // cada 500) y la rueda para en una casilla al azar de su nivel. Pendiente
  // del modelo matematico real.
  //
  // Contrato de independencia: este modulo NO toca RNG de reels, outcome,
  // locks ni strips. Cobra premios y entra al bonus SOLO via los hooks que
  // game.js inyecta con configure() (pago via payment-engine real).
  // ---------------------------------------------------------------------------

  var SYMBOL_TRIGGER_MIN = 40;
  var SYMBOL_TRIGGER_MAX = 53;
  var MIN_OPEN_WIN_MULTIPLE = 5;
  // COLLECT cobra la apuesta por esto (x1 hasta el 2026-10-18; x20 a peticion
  // del usuario). GAME RULES lo lee de aqui.
  var COLLECT_MULTIPLIER = window.OSSUARY_ECONOMY_CONFIG ? window.OSSUARY_ECONOMY_CONFIG.collect : 20;
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

  // Casillas de la rueda (tools/bake-ruleta-wheel.js#SLOT_TIERS, tienen que
  // coincidir): 12 de 30 grados en sentido horario desde la que queda bajo la
  // mano en reposo. Pares = marron, impares = blanca.
  var WHEEL_SLOTS = [
    "GOLD", "BRONZE", "SILVER", "BLACK", "SILVER", "BRONZE",
    "GOLD", "BRONZE", "SILVER", "RED", "SILVER", "BRONZE"
  ];
  var WHEEL_SLOT_DEG = 360 / WHEEL_SLOTS.length;
  // Premios y pesos sobre 1000 (PROVISIONALES, a peticion del usuario: los
  // bajos salen mucho mas y el SUPER BONUS ~1 de cada 500). El valor medio de
  // una tirada sale ~x16 en premios + 4% de BONUS + 0.2% de SUPER BONUS.
  var WHEEL_PRIZES = window.OSSUARY_ECONOMY_CONFIG ? window.OSSUARY_ECONOMY_CONFIG.wheel : [
    { id: "X0", tier: "BRONZE", multiplier: 0, weight: 360 },
    { id: "X10", tier: "BRONZE", multiplier: 10, weight: 300 },
    { id: "X25", tier: "SILVER", multiplier: 25, weight: 160 },
    { id: "X50", tier: "SILVER", multiplier: 50, weight: 90 },
    { id: "X100", tier: "GOLD", multiplier: 100, weight: 48 },
    { id: "BONUS", tier: "RED", bonus: "BONUS", weight: 40 },
    { id: "SUPER_BONUS", tier: "BLACK", bonus: "SUPER_BONUS", weight: 2 }
  ];
  // Giro (ruleta-game.js#planSpin). Sin amagos ni saltos (feedback del
  // usuario, 2026-10-16: parar en una casilla y pasar a otra parece trampa):
  //  1. Carga: la rueda se echa atras despacio, tiembla cada vez mas y el
  //     abismo aspira; se suelta de golpe.
  //  2. Giro con fisica (WHEEL_PHYSICS): rozamiento y clavijas. Cada
  //     separacion es una loma y el centro de cada casilla un valle: al ir
  //     despacio se frena en cada separacion y se acelera hacia el centro.
  //     La velocidad de salida se calcula para que la ultima separacion la
  //     pase casi parada (parece que se para)...
  //  3. ...y cae al centro de su casilla y para en seco con un rebote
  //     pequeno (el golpe). Una vez parada no se mueve de casilla.
  var WHEEL_PHYSICS = { a0: 22, a1: 0.5, a2: 0.0004, peg: 60, release: 1300, dt: 0.002 };
  var WHEEL_CHARGE_MS = 1150;
  var WHEEL_CHARGE_HOLD_MS = 350;
  var WHEEL_CHARGE_DEG = 13;
  var WHEEL_DROP_MS = 380;
  var WHEEL_THUD_MS = 300;
  var WHEEL_THUD_DEG = 1.4;
  var WHEEL_MIN_TURNS = 3;
  var WHEEL_TICK_GAP_MS = 42;
  // Por debajo de esta velocidad (grados/ms) cada separacion es un clac fuerte
  // con sacudida y parpadeo de luz.
  var WHEEL_CLACK_SPEED = 0.22;

  var ASSETS = {
    video: "assets/ruleta/cofre_apertura.webm",
    // WebP 2560x1440 (el PNG original de 3840x2160 pesaba 6 MB y ocupaba
    // 33 MB descomprimido): va oscurecido y basta para cualquier pantalla.
    fondo: "assets/ruleta/fondo_juego_ruleta.webp"
  };
  // Maquina de huesos (tools/bake-ruleta-wheel.js). Las posiciones de cada
  // capa estan en src/ruleta/ruleta-wheel.css.
  var WHEEL_ART = {
    frame: "assets/ruleta/wheel/frame.webp",
    disc: "assets/ruleta/wheel/disc.webp",
    discBlur: "assets/ruleta/wheel/disc-blur.webp",
    hub: "assets/ruleta/wheel/hub.webp",
    abyss: "assets/ruleta/wheel/abyss.webp",
    keys: {
      GOLD: "assets/ruleta/wheel/key-gold.webp",
      SILVER: "assets/ruleta/wheel/key-silver.webp",
      BRONZE: "assets/ruleta/wheel/key-bronze.webp",
      BLACK: "assets/ruleta/wheel/key-black.webp",
      RED: "assets/ruleta/wheel/key-red.webp"
    }
  };
  // Centro del abismo y de la llave encendida, en % de la maquina (para la
  // luz que baja y las chispas).
  var ABYSS_CENTER = { x: 49.573, y: 40.852 };
  var LIT_KEY_Y = 26.5;
  // Color de la luz de cada llave (CSS --key-glow y chispas).
  var TIER_GLOW = {
    BRONZE: "214, 108, 52",
    SILVER: "214, 228, 255",
    GOLD: "255, 214, 64",
    BLACK: "176, 126, 255",
    RED: "255, 38, 38"
  };
  // Cada premio con su propia revelacion (revealPrize): cuanto mas vale, mas
  // espera el abismo (inhale), mas chispas, rayos, ondas, temblor y luz.
  //   lights: "dim" (x0: la luz no vuelve), "flash" (vuelve de golpe con un
  //   destello) o "storm" (sigue a oscuras con relampagos).
  var PRIZE_FX = {
    X0: { inhale: 0, sparks: 0, ash: 26, rays: 0, rings: 0, shake: 0, lights: "dim", size: 0.72, sound: "ruleta_prize_none" },
    X10: { inhale: 0, sparks: 36, rays: 0, rings: 1, shake: 4, lights: "flash", flash: "255, 160, 90", size: 0.86, sound: "ruleta_prize_small" },
    X25: { inhale: 220, sparks: 64, rays: 0.55, rings: 1, shake: 6, lights: "flash", flash: "225, 235, 255", size: 1, sound: "ruleta_prize_mid" },
    X50: { inhale: 320, sparks: 96, rays: 0.8, rings: 2, shake: 9, lights: "flash", flash: "235, 242, 255", size: 1.12, sound: "ruleta_prize_mid" },
    X100: { inhale: 650, sparks: 120, coins: 90, rays: 1, rings: 3, shake: 15, lights: "flash", flash: "255, 214, 90", size: 1.3, sound: "ruleta_prize_big" },
    BONUS: { inhale: 700, sparks: 70, smoke: 26, rays: 0.85, rings: 2, shake: 13, lights: "storm", lightning: "170, 110, 255", bolts: 3, size: 1, sound: "ruleta_prize_bonus" },
    SUPER_BONUS: { inhale: 950, sparks: 150, smoke: 34, rays: 1, rings: 3, shake: 20, lights: "storm", lightning: "255, 30, 20", bolts: 5, size: 1.1, sound: "ruleta_prize_super" }
  };

  // Hooks inyectados por game.js (configure). Sin ellos el modulo funciona en
  // modo visual puro (no paga, no entra al bonus).
  var hooks = {
    getBet: function () { return 0; },
    payWin: null,
    showWinCounter: null,
    // BONUS GAME: Execution Bonus con su video de entrada.
    enterFreeSpins: null,
    // SUPER BONUS: el modo propio todavia no existe; sin este hook entra
    // como el BONUS GAME.
    enterSuperBonus: null,
    // Aviso a game.js al cerrar ({ nextMode }): reanuda el juego base pausado.
    onClosed: null
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
  // Pantalla de la ruleta: referencias de la maquina y su animacion (rAF).
  var scene = null;
  var wheelRotation = 0;
  var wheelSpinning = false;
  var ruletaButtonsRowEl = null;
  var ruletaResultTimers = [];
  // Debug: premio forzado para el siguiente GAMBLE (id de WHEEL_PRIZES).
  var forcedPrizeId = null;
  // Copias en memoria (blob:) del arte de la maquina: el servidor manda las
  // imagenes con no-store y la pantalla no debe salir a trozos.
  var residentArtUrls = {};

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

  // La meta va a la vista ("26/45"); lleno, solo la cifra en oro. Cada cambio
  // se anuncia con "ossuary:chest-count" para la tension del cofre
  // (src/fx/chest-tension.js: temblor, luz y avisos).
  function renderCounter(added) {
    var el = ensureCounter();
    if (!el) return;
    var full = count >= triggerCount;
    el.textContent = "";
    var countEl = document.createElement("span");
    countEl.className = "ruleta-chest-counter__count";
    countEl.textContent = String(count);
    el.appendChild(countEl);
    if (!full) {
      var goalEl = document.createElement("span");
      goalEl.className = "ruleta-chest-counter__goal";
      goalEl.textContent = "/" + triggerCount;
      el.appendChild(goalEl);
    }
    el.setAttribute("aria-label", full ? "Chest full" : count + " of " + triggerCount);
    if (full) el.classList.add("ruleta-chest-counter--full");
    else el.classList.remove("ruleta-chest-counter--full");
    document.dispatchEvent(new CustomEvent("ossuary:chest-count", {
      detail: { count: count, target: triggerCount, added: Number(added) || 0 }
    }));
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
    renderCounter(n);
    playChestCounterReaction(n);
    return count;
  }

  function shouldOpenAfterSpin(result) {
    result = result || {};
    var bet = Number(result.bet) || 0;
    var win = Number(result.win) || 0;
    var spinType = result.spinType || "BASE";
    if (sequenceStarted) return false;
    // The shared model owns the whole paid root, including its collecting
    // continuation. Legacy presentation filters must not discard its choice.
    if (hooks.shouldOpen) return hooks.shouldOpen();
    if (spinType !== "BASE") return false;
    if (count < triggerCount) return false;
    if (bet <= 0 || win <= 0) return false;
    return (win / bet) > MIN_OPEN_WIN_MULTIPLE;
  }

  // Arranca la apertura del cofre si el contador ya esta listo y el spin acaba
  // de pagar mas de x5. La llama game.js cuando el spin ya revelo y pago todo.
  function startPendingSequence(result) {
    if (!shouldOpenAfterSpin(result)) {
      // Lleno y con premio que no basta: el cofre amaga con abrirse
      // (src/fx/chest-tension.js). La regla no se dice: que haya intriga.
      var r = result || {};
      if (!sequenceStarted && count >= triggerCount && (r.spinType || "BASE") === "BASE" && Number(r.win) > 0) {
        document.dispatchEvent(new CustomEvent("ossuary:chest-tease", { detail: { win: Number(r.win) } }));
      }
      return false;
    }
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
    if (hooks.getProgress) {
      var progress = hooks.getProgress();
      if (progress) { count = progress.chest; triggerCount = progress.chestThreshold; }
    }
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

  // La mano esta arriba (angulo 0 de la imagen) y la rueda gira en sentido
  // horario: con la rueda girada `rotation` grados, bajo la mano queda el
  // angulo -rotation de la imagen.
  function slotIndexAtPointer(rotation) {
    return Math.round(normalizeDeg(-rotation) / WHEEL_SLOT_DEG) % WHEEL_SLOTS.length;
  }

  function targetRotationForSlot(index) {
    return normalizeDeg(-index * WHEEL_SLOT_DEG);
  }

  function prizeById(id) {
    for (var i = 0; i < WHEEL_PRIZES.length; i++) {
      if (WHEEL_PRIZES[i].id === id) return WHEEL_PRIZES[i];
    }
    return null;
  }

  function drawPrize() {
    var forced = forcedPrizeId ? prizeById(forcedPrizeId) : null;
    forcedPrizeId = null;
    if (forced) return forced;
    if (hooks.selectPrize) return hooks.selectPrize();
    var total = 0;
    for (var i = 0; i < WHEEL_PRIZES.length; i++) total += WHEEL_PRIZES[i].weight;
    var roll = Math.random() * total;
    for (var j = 0; j < WHEEL_PRIZES.length; j++) {
      roll -= WHEEL_PRIZES[j].weight;
      if (roll < 0) return WHEEL_PRIZES[j];
    }
    return WHEEL_PRIZES[0];
  }

  function slotForTier(tier) {
    var options = [];
    for (var i = 0; i < WHEEL_SLOTS.length; i++) {
      if (WHEEL_SLOTS[i] === tier) options.push(i);
    }
    return options[Math.floor(Math.random() * options.length)];
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

    var video = window.OssuaryMobileAlpha.create();
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

  // Boton de pergamino (src/ui/parchment-ui.js); sin el, el texto tal cual.
  function parchmentButton(btn, text) {
    if (window.OssuaryParchment) window.OssuaryParchment.decorate(btn, text);
    else btn.textContent = text;
    return btn;
  }

  function showPlayScreen() {
    if (!transitionEl) return;
    var playScreen = document.createElement("div");
    playScreen.className = "ruleta-play-screen";

    var btn = document.createElement("button");
    btn.className = "ruleta-play-btn";
    btn.type = "button";
    parchmentButton(btn, "PLAY");
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
  // `color`: otro color de fundido (negro o sangre para la entrada al bonus).
  function flashAndRun(swapFn, color) {
    var flash = document.createElement("div");
    flash.className = "ruleta-flash-out";
    if (color) flash.style.background = color;
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
  // Maquina de huesos (assets/ruleta/wheel/, tools/bake-ruleta-wheel.js) sobre
  // el fondo del castillo. Capas, de atras adelante: oscuridad sobre el
  // castillo, aura roja, marco (el dibujo entero sin fondo) y su sombra,
  // rueda (disco nitido + borroso segun la velocidad, llave encendida, sombra
  // sobre las casillas que no ganan y luz roja del abismo), buje fijo (aro y
  // triangulo), remolino del abismo (gira solo), rayos, chispas, luz que baja
  // de la llave y el premio. Estilos y posiciones en src/ruleta/ruleta-wheel.css.

  function el(tag, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    return node;
  }

  function residentArt(src) {
    return residentArtUrls[src] || src;
  }

  function keepWheelArtResident() {
    // El aspa de oro de los premios del pergamino de las llaves.
    if (window.OssuaryNumberFont && window.OssuaryNumberFont.preloadLetters) window.OssuaryNumberFont.preloadLetters("x");
    if (typeof fetch !== "function" || typeof URL.createObjectURL !== "function") return;
    // El fondo del castillo tambien (PNG grande: sin esto salia a medias).
    var list = [ASSETS.fondo, WHEEL_ART.frame, WHEEL_ART.disc, WHEEL_ART.discBlur, WHEEL_ART.hub, WHEEL_ART.abyss];
    Object.keys(WHEEL_ART.keys).forEach(function (tier) { list.push(WHEEL_ART.keys[tier]); });
    list.forEach(function (src) {
      if (residentArtUrls[src]) return;
      fetch(src).then(function (res) {
        return res.ok ? res.blob() : null;
      }).then(function (blob) {
        if (!blob) return;
        var objectUrl = URL.createObjectURL(blob);
        var img = new Image();
        img.src = objectUrl;
        return (typeof img.decode === "function" ? img.decode() : Promise.resolve()).then(function () {
          residentArtUrls[src] = objectUrl;
        });
      }).catch(function () {});
    });
  }

  function artImg(cls, src) {
    var img = el("img", cls);
    img.src = residentArt(src);
    img.alt = "";
    img.draggable = false;
    return img;
  }

  // --- Pergaminos (peticion del usuario, 2026-10-18) -------------------------
  // A los lados de la maquina, con su boton debajo: a la izquierda el cuento
  // (que es esto y que hacen COLLECT y GAMBLE, con lo que se cobra de
  // verdad, en las cifras de oro) y a la derecha las llaves con lo que da
  // cada una, en el orden del dibujo, sin recuadros (borrados en el arte):
  // negra SUPER BONUS (logo de The Judgment), roja BONUS GAME (logo del
  // Execution Bonus) y oro, plata y bronce con su tramo de premios en las
  // cifras de oro del contador BIG WIN teñidas de cada metal, sacado de
  // WHEEL_PRIZES. Arte de tools/bake-parchment-ui.js. Van debajo de
  // la oscuridad de la rueda: al frenar se apagan con el castillo. En
  // pantallas verticales no caben y no se muestran (ruleta-wheel.css).
  var SCROLL_ART = {
    story: "assets/ruleta/scroll/story.webp",
    keys: "assets/ruleta/scroll/keys.webp",
    logos: {
      BLACK: "assets/ruleta/scroll/logo-super.webp",
      RED: "assets/bonus_intro/execution_full.webp"
    }
  };
  var SCROLL_KEY_ROWS = ["BLACK", "RED", "GOLD", "SILVER", "BRONZE"];
  // Centro de cada llave en % del alto de keys.webp.
  var SCROLL_KEY_ROW_Y = [23.42, 37.17, 51.78, 66.36, 81.13];

  function scrollArt(src) {
    return window.OssuaryParchment ? window.OssuaryParchment.art(src) : src;
  }

  function textEl(tag, cls, text) {
    var node = el(tag, cls);
    node.textContent = text;
    return node;
  }

  // Cifras de oro cincelado (number-font.js, con el aspa y el punto en oro);
  // sin la fuente, texto.
  function goldText(node, text) {
    var font = window.OssuaryNumberFont;
    if (font && font.canRenderLetters && font.canRenderLetters(text.replace(/[.€]/g, ""))) {
      font.render(node, text, { letters: true, separatorImages: true });
    } else {
      node.textContent = text;
    }
    return node;
  }

  // Multiplicadores de una llave, de menor a mayor (sin repetir).
  function tierMultipliers(tier) {
    var values = [];
    for (var i = 0; i < WHEEL_PRIZES.length; i++) {
      var p = WHEEL_PRIZES[i];
      if (p.tier === tier && !p.bonus && values.indexOf(p.multiplier) < 0) values.push(p.multiplier);
    }
    return values.sort(function (a, b) { return a - b; });
  }

  // "x100" o "x25 – x50": cada cifra en oro y la raya en tinta.
  function tierRange(tier) {
    var values = tierMultipliers(tier);
    var range = el("span", "ruleta-scroll__range");
    var ends = values.length > 1 ? [values[0], values[values.length - 1]] : values;
    ends.forEach(function (value, k) {
      if (k > 0) range.appendChild(textEl("span", "ruleta-scroll__dash", "–"));
      range.appendChild(goldText(el("span", "ruleta-scroll__num"), "x" + value));
    });
    return range;
  }

  function buildStoryScroll() {
    var scroll = el("div", "ruleta-scroll ruleta-scroll--story");
    scroll.appendChild(artImg("ruleta-scroll__art", scrollArt(SCROLL_ART.story)));
    var text = el("div", "ruleta-scroll__text");
    text.appendChild(textEl("div", "ruleta-scroll__title", "THE CHEST"));
    text.appendChild(el("div", "ruleta-scroll__rule"));
    text.appendChild(textEl("p", "ruleta-scroll__lead", "The dead have paid. The choice is yours."));
    var collect = el("p", "ruleta-scroll__option");
    collect.appendChild(textEl("span", "ruleta-scroll__verb", "COLLECT"));
    collect.appendChild(document.createTextNode("Take "));
    collect.appendChild(goldText(el("span", "ruleta-scroll__amount"), "€" + formatPrizeAmount(hooks.getBet() * COLLECT_MULTIPLIER)));
    collect.appendChild(document.createTextNode(" and walk away."));
    var gamble = el("p", "ruleta-scroll__option");
    gamble.appendChild(textEl("span", "ruleta-scroll__verb", "GAMBLE"));
    gamble.appendChild(document.createTextNode("Spin the bone wheel and take what the key gives."));
    text.appendChild(collect);
    text.appendChild(gamble);
    text.appendChild(textEl("p", "ruleta-scroll__close", "One spin. No way back."));
    scroll.appendChild(text);
    return scroll;
  }

  function buildKeysScroll() {
    var scroll = el("div", "ruleta-scroll ruleta-scroll--keys");
    scroll.appendChild(artImg("ruleta-scroll__art", scrollArt(SCROLL_ART.keys)));
    SCROLL_KEY_ROWS.forEach(function (tier, index) {
      var row = el("div", "ruleta-scroll__key ruleta-scroll__key--" + tier.toLowerCase());
      row.style.setProperty("--row-y", SCROLL_KEY_ROW_Y[index] + "%");
      if (SCROLL_ART.logos[tier]) {
        var logo = artImg("ruleta-scroll__logo", scrollArt(SCROLL_ART.logos[tier]));
        logo.alt = tier === "BLACK" ? "Super Bonus" : "Bonus Game";
        row.appendChild(logo);
      } else {
        row.appendChild(tierRange(tier));
      }
      scroll.appendChild(row);
    });
    return scroll;
  }

  function buildScrolls() {
    var layer = el("div", "ruleta-scrolls");
    layer.appendChild(buildStoryScroll());
    layer.appendChild(buildKeysScroll());
    return layer;
  }

  function showRuletaScreen(options) {
    if (ruletaScreenEl) return ruletaScreenEl;
    var purchased = Boolean(options && options.purchased);
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("ruleta_started", {});
    ruletaScreenEl = el("div", "ruleta-screen ruleta-screen--wheel");

    // Escenario interno: alto = 100dvh, relacion nativa 16:9 del fondo.
    var stage = el("div", "ruleta-screen__stage");

    var fondo = el("img", "ruleta-screen__fondo");
    fondo.src = residentArt(ASSETS.fondo);
    fondo.alt = "";
    fondo.draggable = false;
    // Oscuridad que cae sobre el castillo mientras la rueda frena.
    var dark = el("div", "ruleta-screen__dark");

    // Arena: contenedor de tamano para colocar maquina y botones con cq.
    var arena = el("div", "ruleta-screen__arena");
    var machine = el("div", "ruleta-machine");
    machine.appendChild(el("div", "ruleta-machine__aura"));
    machine.appendChild(artImg("ruleta-machine__frame", WHEEL_ART.frame));
    // Sombra del marco (con su silueta): los huesos se hunden en lo oscuro y
    // la rueda queda sola, iluminada por el abismo.
    var frameDim = el("div", "ruleta-machine__frame-dim");
    var maskUrl = "url(\"" + residentArt(WHEEL_ART.frame) + "\")";
    frameDim.style.webkitMaskImage = maskUrl;
    frameDim.style.maskImage = maskUrl;
    machine.appendChild(frameDim);

    var wheel = el("div", "ruleta-machine__wheel");
    var spinner = el("div", "ruleta-machine__spinner");
    spinner.appendChild(artImg("ruleta-machine__disc", WHEEL_ART.disc));
    var discBlur = artImg("ruleta-machine__disc ruleta-machine__disc--blur", WHEEL_ART.discBlur);
    spinner.appendChild(discBlur);
    wheel.appendChild(spinner);
    var shade = el("div", "ruleta-machine__shade");
    wheel.appendChild(shade);
    wheel.appendChild(el("div", "ruleta-machine__glow"));
    machine.appendChild(wheel);

    machine.appendChild(artImg("ruleta-machine__hub", WHEEL_ART.hub));
    var abyss = el("div", "ruleta-machine__abyss");
    var vortex = artImg("ruleta-machine__vortex", WHEEL_ART.abyss);
    abyss.appendChild(vortex);
    abyss.appendChild(el("div", "ruleta-machine__maw"));
    machine.appendChild(abyss);

    var rays = el("div", "ruleta-machine__rays");
    machine.appendChild(rays);
    var sparks = el("canvas", "ruleta-machine__sparks");
    machine.appendChild(sparks);
    var beam = el("div", "ruleta-machine__beam");
    var orb = el("div", "ruleta-machine__orb");
    machine.appendChild(beam);
    machine.appendChild(orb);
    var prize = el("div", "ruleta-machine__prize");
    prize.hidden = true;
    machine.appendChild(prize);
    arena.appendChild(machine);

    // Botonera GAMBLE / COLLECT (de pergamino, debajo de cada pergamino).
    var controls = el("div", "ruleta-screen__controls");
    var gambleBtn = el("button", "ruleta-action-btn ruleta-action-btn--gamble");
    gambleBtn.type = "button";
    parchmentButton(gambleBtn, "GAMBLE");
    var collectBtn = el("button", "ruleta-action-btn ruleta-action-btn--collect");
    collectBtn.type = "button";
    parchmentButton(collectBtn, "COLLECT");
    var buttonsRow = el("div", "ruleta-screen__buttons");
    ruletaButtonsRowEl = buttonsRow;
    buttonsRow.appendChild(collectBtn);
    buttonsRow.appendChild(gambleBtn);
    controls.appendChild(buttonsRow);
    arena.appendChild(controls);

    gambleBtn.addEventListener("click", function () { startGamble(gambleBtn, collectBtn); });
    collectBtn.addEventListener("click", function () { collectPrize(gambleBtn, collectBtn); });

    var flash = el("div", "ruleta-screen__flash");
    stage.appendChild(fondo);
    var scrolls = buildScrolls();
    if (purchased) {
      var story = scrolls.querySelector(".ruleta-scroll--story");
      if (story) story.remove();
      buttonsRow.style.display = "none";
    }
    stage.appendChild(scrolls);
    stage.appendChild(dark);
    stage.appendChild(arena);
    stage.appendChild(flash);
    ruletaScreenEl.appendChild(stage);
    document.body.appendChild(ruletaScreenEl);

    scene = {
      machine: machine,
      spinner: spinner,
      discBlur: discBlur,
      shade: shade,
      vortex: vortex,
      sparks: sparks,
      ctx: sparks.getContext ? sparks.getContext("2d") : null,
      rays: rays,
      beam: beam,
      orb: orb,
      prize: prize,
      flash: flash,
      darkEl: dark,
      frameDim: frameDim,
      lit: null,
      frame: null,
      lastNow: 0,
      vortexAngle: 0,
      vortexSpeed: 14,
      vortexTarget: 14,
      maw: 0,
      mawBoost: 0,
      // Oscuridad (0 luz normal, 1 a oscuras) y a que ritmo persigue su meta.
      dark: 0,
      darkTarget: 0,
      darkRate: 600,
      // Temblor de la maquina (px a 1080 de alto), sacudida de cada clac,
      // destello de luz y succion del abismo antes de cantar.
      tremble: 0,
      trembleBoost: 0,
      jolt: 0,
      flicker: 0,
      suck: 0,
      spin: null,
      particles: [],
      emberClock: 0,
      sparkW: 0,
      sparkH: 0
    };
    wheelRotation = 0;
    setSpinnerRotation(0, 0);
    scene.frame = window.requestAnimationFrame(tickScene);

    // Una vez montada la ruleta, la transicion (video/flash/PLAY) sobra.
    if (transitionEl && transitionEl.parentNode) {
      transitionEl.parentNode.removeChild(transitionEl);
      transitionEl = null;
    }
    if (purchased) startGamble(gambleBtn, collectBtn);
    return ruletaScreenEl;
  }

  function setSpinnerRotation(rotation, blurAmount) {
    if (!scene) return;
    scene.spinner.style.transform = "rotate(" + rotation.toFixed(3) + "deg)";
    scene.discBlur.style.opacity = String(Math.max(0, Math.min(1, blurAmount)).toFixed(3));
  }

  function setDark(target, rateMs) {
    if (!scene) return;
    scene.darkTarget = target;
    scene.darkRate = rateMs || 600;
  }

  // --- Plan del giro -----------------------------------------------------------

  function now() {
    return window.performance ? window.performance.now() : Date.now();
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
  function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  // Debug: tramos del ultimo giro (debug.lastSpinPlan).
  var lastSpinPlan = null;

  // Distancia (grados) que recorreria la rueda solo con el rozamiento.
  function wheelFreeDistance(w0) {
    var p = WHEEL_PHYSICS;
    var th = 0, w = w0, t = 0;
    while (w > 0 && t < 60) {
      w -= (p.a0 + p.a1 * w + p.a2 * w * w) * p.dt;
      th += w * p.dt;
      t += p.dt;
    }
    return th;
  }

  // Giro desde `start` con velocidad w0 (grados/s) hasta pasar la ultima
  // separacion antes de `to` (to - 15). Rozamiento seco + viscoso + de aire y
  // la fuerza de las clavijas (seno: lomas en las separaciones, valles en los
  // centros). { crossed, speed, path } (path: posicion cada dt si `record`).
  function simulateWheel(start, to, w0, record) {
    var p = WHEEL_PHYSICS;
    var last = to - WHEEL_SLOT_DEG / 2;
    var th = start, w = w0, t = 0;
    var path = record ? [th] : null;
    while (t < 30) {
      var peg = p.peg * Math.sin(2 * Math.PI * (th - to) / WHEEL_SLOT_DEG);
      w += (-(p.a0 + p.a1 * w + p.a2 * w * w) - peg) * p.dt;
      th += w * p.dt;
      t += p.dt;
      if (record) path.push(th);
      if (w <= 0) return { crossed: false };
      if (th >= last) return { crossed: true, speed: w, path: path };
    }
    return { crossed: false };
  }

  // Tramos del giro: { phase, t0, t1, at(u) -> rotacion, enter() }. La rueda
  // gira en sentido horario (rotacion creciente). `plan.impact` se llama en el
  // golpe final (inicio de "thud").
  function planSpin(from, slotIndex, prize) {
    var p = WHEEL_PHYSICS;
    var release = from - WHEEL_CHARGE_DEG;
    var targetMod = targetRotationForSlot(slotIndex);
    var natural = release + wheelFreeDistance(p.release);
    var to = natural + (((normalizeDeg(targetMod - normalizeDeg(natural)) + 180) % 360) - 180);
    while (to - release < WHEEL_MIN_TURNS * 360) to += 360;
    // Velocidad (grados/s) al pasar la ultima separacion: casi parada; mas
    // justa en los premios gordos.
    var big = prize.multiplier >= 100 || !!prize.bonus;
    var lastSpeed = big ? 4 + Math.random() * 5 : 6 + Math.random() * 16;
    var lo = 200, hi = 4000;
    for (var i = 0; i < 48; i++) {
      var mid = (lo + hi) / 2;
      var r = simulateWheel(release, to, mid, false);
      if (!r.crossed || r.speed < lastSpeed) lo = mid; else hi = mid;
    }
    var sim = simulateWheel(release, to, hi, true);
    var path = sim.crossed ? sim.path : [release, to - WHEEL_SLOT_DEG / 2];
    var spinMs = Math.max(1, (path.length - 1) * p.dt * 1000);
    var last = to - WHEEL_SLOT_DEG / 2;
    // Caida al centro: sale con su velocidad y acelera hasta el golpe.
    var lead = Math.min((sim.crossed ? sim.speed : 0) * WHEEL_DROP_MS / 1000, WHEEL_SLOT_DEG * 0.3);
    var chargeMs = WHEEL_CHARGE_MS + WHEEL_CHARGE_HOLD_MS;

    var plan = { from: from, to: to, segs: [], total: 0, slotIndex: slotIndex, prize: prize, lastSpeed: lastSpeed, releaseSpeed: hi, impact: null };
    var t = 0;
    function add(phase, dur, at, enter) {
      plan.segs.push({ phase: phase, t0: t, t1: t + dur, at: at, enter: enter || null });
      t += dur;
    }
    add("charge", chargeMs, function (u) {
      return from - WHEEL_CHARGE_DEG * easeOutQuad(clamp01(u * chargeMs / WHEEL_CHARGE_MS));
    }, chargeWheel);
    add("spin", spinMs, function (u) {
      var x = u * (path.length - 1);
      var i0 = Math.floor(x);
      var i1 = Math.min(path.length - 1, i0 + 1);
      return path[i0] + (path[i1] - path[i0]) * (x - i0);
    }, releaseWheel);
    add("drop", WHEEL_DROP_MS, function (u) {
      return last + lead * u + (WHEEL_SLOT_DEG / 2 - lead) * u * u;
    });
    add("thud", WHEEL_THUD_MS, function (u) {
      return to - WHEEL_THUD_DEG * Math.sin(Math.PI * u) * (1 - u);
    }, function () {
      if (plan.impact) plan.impact();
    });
    plan.total = t;
    return plan;
  }

  // Carga: el abismo aspira, la maquina empieza a temblar y suena la cuerda.
  function chargeWheel() {
    if (!scene) return;
    scene.suck = 0.5;
    audioEvent("ruleta_charge");
  }

  // Suelta: respingo, destello del abismo y unas brasas.
  function releaseWheel() {
    if (!scene) return;
    scene.suck = 0;
    scene.trembleBoost = 0;
    scene.jolt = 1;
    scene.flicker = 1;
    scene.mawBoost = 1;
    burstSparks("RED", 18);
    audioEvent("ruleta_release");
  }

  // --- Animacion de la maquina (un solo rAF mientras la pantalla esta abierta)

  function tickScene(t) {
    if (!scene) return;
    var dt = scene.lastNow ? Math.min(64, t - scene.lastNow) : 16;
    scene.lastNow = t;

    // Rueda
    var spin = scene.spin;
    if (spin) {
      var elapsed = t - spin.startedAt;
      var seg = spin.segs[spin.segs.length - 1];
      for (var s = 0; s < spin.segs.length; s++) {
        if (elapsed < spin.segs[s].t1) { seg = spin.segs[s]; break; }
      }
      // Entradas de tramo en orden (aunque un fotograma largo se salte uno:
      // el golpe final nunca se pierde).
      while ((spin.entered || 0) < spin.segs.length && spin.segs[spin.entered || 0].t0 <= elapsed) {
        var entering = spin.segs[spin.entered || 0];
        spin.entered = (spin.entered || 0) + 1;
        if (entering.enter) entering.enter();
      }
      spin.seg = seg;
      var rotation = seg.at(clamp01((elapsed - seg.t0) / (seg.t1 - seg.t0)));
      var speed = Math.abs(rotation - spin.lastRotation) / Math.max(1, dt);
      spin.lastRotation = rotation;
      setSpinnerRotation(rotation, (speed - 0.12) / 0.5);
      // Tic (o clac, ya despacio) cada vez que una separacion pasa bajo la mano.
      var boundary = Math.floor((rotation + WHEEL_SLOT_DEG / 2) / WHEEL_SLOT_DEG);
      if (boundary !== spin.lastBoundary) {
        spin.lastBoundary = boundary;
        if (t - spin.lastTickAt >= WHEEL_TICK_GAP_MS) {
          spin.lastTickAt = t;
          if (speed < WHEEL_CLACK_SPEED) clack();
          else playWheelTick(speed);
        }
      }
      if (seg.phase === "charge") {
        // Carga: tiembla cada vez mas, se oscurece un poco y el abismo sube.
        var charge = clamp01((elapsed - seg.t0) / (seg.t1 - seg.t0));
        scene.trembleBoost = 0.25 + 1.15 * charge;
        scene.darkTarget = Math.max(scene.darkTarget, 0.32 * charge);
        scene.darkRate = 400;
        scene.mawBoost = Math.max(scene.mawBoost, 0.2 + 0.55 * charge);
      } else if (seg.phase === "spin" && elapsed - seg.t0 > 1200) {
        // Suspense: al frenar cae la oscuridad y la maquina empieza a temblar.
        var fall = clamp01((0.55 - speed) / 0.47);
        scene.darkTarget = Math.max(scene.darkTarget, fall * fall * (3 - 2 * fall) * 0.97);
        scene.darkRate = 500;
      } else if (seg.phase === "drop") {
        scene.darkTarget = Math.max(scene.darkTarget, 0.97);
      }
      if (!spin.tension && scene.darkTarget > 0.3) {
        spin.tension = true;
        audioEvent("ruleta_spin_tension");
      }
      scene.tremble = scene.dark * 0.9;
      scene.vortexTarget = 24 + Math.min(110, speed * 140) + scene.dark * 40;
      if (elapsed >= spin.total) {
        scene.spin = null;
        scene.trembleBoost = 0;
        setSpinnerRotation(spin.to, 0);
        if (spin.done) spin.done();
      }
    }

    // Luz: oscuridad que persigue su meta; un destello la levanta un momento.
    scene.dark += (scene.darkTarget - scene.dark) * Math.min(1, dt / scene.darkRate);
    scene.flicker = Math.max(0, scene.flicker - dt / 220);
    var light = Math.max(0, scene.dark - scene.flicker * 0.35);
    scene.darkEl.style.opacity = (light * 0.9).toFixed(3);
    scene.frameDim.style.opacity = (light * 0.72).toFixed(3);

    // Temblor: de fondo segun la oscuridad, mas fuerte en la carga, y una
    // sacudida corta en cada clac. En px a 1080 de alto.
    var charging = scene.spin && scene.spin.seg && scene.spin.seg.phase === "charge";
    if (!charging && scene.suck <= 0) scene.trembleBoost = Math.max(0, scene.trembleBoost - dt / 400);
    scene.jolt = Math.max(0, scene.jolt - dt / 160);
    var amp = scene.tremble + scene.trembleBoost * 2.2 + scene.jolt * 3.5;
    if (!scene.spin) scene.tremble = Math.max(0, scene.tremble - dt / 500);
    var unit = scene.machine.clientHeight / 1000 || 1;
    if (amp > 0.05) {
      var tx = (Math.random() * 2 - 1) * amp * unit;
      var ty = (Math.random() * 2 - 1) * amp * 0.6 * unit;
      scene.machine.style.translate = tx.toFixed(2) + "px " + ty.toFixed(2) + "px";
    } else if (scene.machine.style.translate) {
      scene.machine.style.translate = "";
    }

    // Remolino: velocidad que persigue a su objetivo (el estallido la
    // dispara; la succion la acelera y apaga la boca).
    if (scene.suck > 0) scene.vortexTarget = 720;
    scene.vortexSpeed += (scene.vortexTarget - scene.vortexSpeed) * Math.min(1, dt / 420);
    scene.vortexAngle = (scene.vortexAngle - scene.vortexSpeed * dt / 1000) % 360;
    scene.mawBoost = Math.max(0, scene.mawBoost - dt / 1400);
    var pulse = 0.5 + 0.5 * Math.sin(t / 620);
    scene.maw = Math.max(0.12, 0.42 + 0.22 * pulse + 0.6 * scene.mawBoost + 0.3 * scene.dark - 0.45 * scene.suck);
    var vortexScale = 1 + 0.05 * scene.mawBoost - 0.06 * scene.suck;
    scene.vortex.style.transform = "rotate(" + scene.vortexAngle.toFixed(2) + "deg) scale(" + vortexScale.toFixed(3) + ")";
    scene.machine.style.setProperty("--maw", scene.maw.toFixed(3));
    scene.machine.style.setProperty("--abyss-boost", scene.mawBoost.toFixed(3));

    updateSparks(dt);
    scene.frame = window.requestAnimationFrame(tickScene);
  }

  // Clac de una separacion con la rueda ya despacio: golpe seco, la maquina
  // da un respingo y la luz del abismo parpadea.
  function clack() {
    if (!scene) return;
    scene.jolt = 1;
    scene.flicker = 1;
    scene.mawBoost = Math.max(scene.mawBoost, 0.3);
    audioEvent("ruleta_clack");
  }

  // --- Particulas del abismo -------------------------------------------------
  // spark/ember: brasas que salen del remolino (se suman, "lighter"); coin:
  // monedas de oro que saltan y caen girando; smoke: humo oscuro que sale y se
  // abre; ash: ceniza gris que cae despacio (x0).

  function sizeSparks() {
    var canvas = scene.sparks;
    var w = scene.machine.clientWidth;
    var h = scene.machine.clientHeight;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!w || !h) return false;
    if (scene.sparkW !== w || scene.sparkH !== h) {
      scene.sparkW = w;
      scene.sparkH = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      scene.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return true;
  }

  function abyssXY() {
    return { x: scene.sparkW * ABYSS_CENTER.x / 100, y: scene.sparkH * ABYSS_CENTER.y / 100 };
  }

  function emitSpark(color, strength, kind) {
    var w = scene.sparkW;
    var c = abyssXY();
    var ang = Math.random() * Math.PI * 2;
    var r0 = w * (0.02 + Math.random() * 0.05);
    var speed = w * (0.05 + Math.random() * 0.22) * strength;
    scene.particles.push({
      kind: kind || "spark",
      x: c.x + Math.cos(ang) * r0,
      y: c.y + Math.sin(ang) * r0,
      // hacia fuera y algo de giro (sigue al remolino)
      vx: Math.cos(ang) * speed - Math.sin(ang) * speed * 0.55,
      vy: Math.sin(ang) * speed + Math.cos(ang) * speed * 0.55,
      life: 0,
      max: 500 + Math.random() * 700 * (strength > 1 ? 1.4 : 1),
      size: w * (0.0035 + Math.random() * 0.006) * (strength > 1 ? 1.3 : 1),
      color: color
    });
  }

  // Brasa que el abismo se traga (succion antes de cantar).
  function emitInward() {
    var w = scene.sparkW;
    var c = abyssXY();
    var ang = Math.random() * Math.PI * 2;
    var r0 = w * (0.22 + Math.random() * 0.2);
    scene.particles.push({
      kind: "ember",
      x: c.x + Math.cos(ang) * r0,
      y: c.y + Math.sin(ang) * r0,
      vx: -Math.cos(ang) * w * 0.05 + Math.sin(ang) * w * 0.12,
      vy: -Math.sin(ang) * w * 0.05 - Math.cos(ang) * w * 0.12,
      life: 0,
      max: 700,
      size: w * (0.003 + Math.random() * 0.004),
      color: "255, 80, 50"
    });
  }

  function burstSparks(tier, count) {
    if (!count || !scene || !scene.ctx || !sizeSparks()) return;
    var color = TIER_GLOW[tier] || TIER_GLOW.RED;
    for (var i = 0; i < count; i++) emitSpark(i % 3 === 0 ? TIER_GLOW.RED : color, 1.8);
  }

  function burstCoins(count) {
    if (!count || !scene || !scene.ctx || !sizeSparks()) return;
    var w = scene.sparkW;
    var c = abyssXY();
    for (var i = 0; i < count; i++) {
      var ang = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.25;
      var speed = w * (0.35 + Math.random() * 0.75);
      scene.particles.push({
        kind: "coin",
        x: c.x, y: c.y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        life: 0,
        max: 1600 + Math.random() * 900,
        size: w * (0.014 + Math.random() * 0.01),
        spin: Math.random() * Math.PI * 2,
        spinRate: 6 + Math.random() * 10,
        delay: Math.random() * 380
      });
    }
  }

  function burstSmoke(count, color) {
    if (!count || !scene || !scene.ctx || !sizeSparks()) return;
    var w = scene.sparkW;
    var c = abyssXY();
    for (var i = 0; i < count; i++) {
      var ang = Math.random() * Math.PI * 2;
      var speed = w * (0.04 + Math.random() * 0.12);
      scene.particles.push({
        kind: "smoke",
        x: c.x + Math.cos(ang) * w * 0.03,
        y: c.y + Math.sin(ang) * w * 0.03,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - w * 0.03,
        life: 0,
        max: 1800 + Math.random() * 1400,
        size: w * (0.05 + Math.random() * 0.05),
        color: color,
        delay: Math.random() * 600
      });
    }
  }

  function burstAsh(count) {
    if (!count || !scene || !scene.ctx || !sizeSparks()) return;
    var w = scene.sparkW;
    var c = abyssXY();
    for (var i = 0; i < count; i++) {
      scene.particles.push({
        kind: "ash",
        x: c.x + (Math.random() * 2 - 1) * w * 0.08,
        y: c.y + (Math.random() * 2 - 1) * w * 0.05,
        vx: (Math.random() * 2 - 1) * w * 0.03,
        vy: w * (0.01 + Math.random() * 0.04),
        life: 0,
        max: 1800 + Math.random() * 1200,
        size: w * (0.003 + Math.random() * 0.004),
        delay: Math.random() * 700
      });
    }
  }

  function updateSparks(dt) {
    if (!scene.ctx || !sizeSparks()) return;
    var ctx = scene.ctx;
    ctx.clearRect(0, 0, scene.sparkW, scene.sparkH);
    // brasas de reposo (mas con la rueda girando); en la succion, hacia dentro
    var rate = scene.suck > 0 ? 40 : scene.spin ? 16 : 5;
    scene.emberClock += dt * rate / 1000;
    while (scene.emberClock >= 1) {
      scene.emberClock -= 1;
      if (scene.suck > 0) emitInward();
      else emitSpark("255, 70, 40", 0.55, "ember");
    }
    var c = abyssXY();
    var k = dt / 1000;
    var list = scene.particles;
    var glowPass = [];
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life += dt;
      if (p.life >= p.max) { list.splice(i, 1); continue; }
      if (p.kind === "coin") {
        p.vy += scene.sparkH * 1.25 * k;
        p.vx *= 1 - 0.25 * k;
        p.spin += p.spinRate * k;
      } else if (p.kind === "smoke") {
        p.vx *= 1 - 0.8 * k;
        p.vy = p.vy * (1 - 0.8 * k) - scene.sparkH * 0.004 * k;
      } else if (p.kind === "ash") {
        p.vx += Math.sin((p.life + i * 97) / 300) * scene.sparkW * 0.02 * k;
      } else {
        if (scene.suck > 0) {
          // tirados hacia el remolino
          p.vx += (c.x - p.x) * 6 * k;
          p.vy += (c.y - p.y) * 6 * k;
          if (Math.hypot(c.x - p.x, c.y - p.y) < scene.sparkW * 0.02) { list.splice(i, 1); continue; }
        }
        p.vx *= 1 - 0.9 * k;
        p.vy = p.vy * (1 - 0.9 * k) - scene.sparkH * 0.02 * k;
      }
      p.x += p.vx * k;
      p.y += p.vy * k;
      if (p.kind === "spark" || p.kind === "ember") glowPass.push(p);
      else drawSolidParticle(ctx, p);
    }
    ctx.globalCompositeOperation = "lighter";
    for (var g = 0; g < glowPass.length; g++) {
      var q = glowPass[g];
      var fade = 1 - q.life / q.max;
      ctx.fillStyle = "rgba(" + q.color + "," + (0.85 * fade).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(q.x, q.y, Math.max(0.4, q.size * (0.4 + 0.6 * fade)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function drawSolidParticle(ctx, p) {
    var fade = 1 - p.life / p.max;
    if (p.kind === "coin") {
      // moneda que gira: elipse que se estrecha y se ensancha, mas clara de cara
      var face = Math.cos(p.spin);
      var rx = Math.max(0.6, p.size * Math.abs(face));
      var a = Math.min(1, fade * 2.2);
      ctx.fillStyle = face > 0 ? "rgba(255, 214, 72, " + a.toFixed(3) + ")" : "rgba(196, 136, 24, " + a.toFixed(3) + ")";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, rx, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120, 70, 6, " + a.toFixed(3) + ")";
      ctx.lineWidth = Math.max(0.6, p.size * 0.16);
      ctx.stroke();
      if (Math.abs(face) > 0.7) {
        ctx.fillStyle = "rgba(255, 250, 210, " + (a * 0.8).toFixed(3) + ")";
        ctx.beginPath();
        ctx.ellipse(p.x - rx * 0.3, p.y - p.size * 0.35, rx * 0.25, p.size * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.kind === "smoke") {
      var grow = 1 + (p.life / p.max) * 1.8;
      var r = p.size * grow;
      var alpha = Math.sin(Math.PI * (p.life / p.max)) * 0.5;
      var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, "rgba(" + p.color + "," + alpha.toFixed(3) + ")");
      grad.addColorStop(1, "rgba(" + p.color + ",0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === "ash") {
      ctx.fillStyle = "rgba(150, 146, 140, " + (0.7 * fade).toFixed(3) + ")";
      ctx.fillRect(p.x, p.y, p.size, p.size * 0.7);
    }
  }

  // --- Sonido ---------------------------------------------------------------

  function playWheelTick(speed) {
    if (!window.OssuaryAudio || !window.OssuaryAudio.play) return;
    // Mas seco y grave cuanto mas despacio va la rueda.
    var slow = Math.max(0, Math.min(1, 1 - speed / 0.9));
    window.OssuaryAudio.play("reel-stop", {
      volume: 0.14 + slow * 0.12,
      pitch: 1.5 - slow * 0.32 + Math.random() * 0.06,
      maxDurationMs: 60,
      priority: 62
    });
  }

  function audioEvent(name, payload) {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger(name, payload || {});
  }

  // --- Flujo ----------------------------------------------------------------

  function later(fn, ms) {
    var id = window.setTimeout(function () {
      ruletaResultTimers = ruletaResultTimers.filter(function (x) { return x !== id; });
      fn();
    }, ms);
    ruletaResultTimers.push(id);
    return id;
  }

  function clearResultTimers() {
    ruletaResultTimers.forEach(function (id) { window.clearTimeout(id); });
    ruletaResultTimers = [];
  }

  function startPurchasedGame() {
    if (sequenceStarted || wheelSpinning) return false;
    sequenceStarted = true;
    showRuletaScreen({ purchased: true });
    return true;
  }

  // COLLECT: cobra la apuesta x COLLECT_MULTIPLIER y vuelve al juego base con
  // un flash.
  function collectPrize(gambleBtn, collectBtn) {
    if (wheelSpinning) return;
    gambleBtn.disabled = true;
    collectBtn.disabled = true;
    var amount = hooks.selectCollect ? hooks.selectCollect() : hooks.getBet() * COLLECT_MULTIPLIER;
    var paymentToken = hooks.capturePayment ? hooks.capturePayment() : null;
    flashAndRun(function () {
      close();
      if (hooks.payWin && amount > 0) hooks.payWin(amount, "ruleta_collect", paymentToken);
    });
  }

  // GAMBLE: se sortea el premio, la rueda gira hasta una casilla de su nivel
  // y el abismo lo canta.
  function startGamble(gambleBtn, collectBtn) {
    if (wheelSpinning || !scene) return;
    wheelSpinning = true;
    gambleBtn.disabled = true;
    collectBtn.disabled = true;
    if (ruletaButtonsRowEl) ruletaButtonsRowEl.classList.add("ruleta-screen__buttons--spent");

    var prize = drawPrize();
    prize.paymentToken = hooks.capturePayment ? hooks.capturePayment() : null;
    var slotIndex = slotForTier(prize.tier);
    var spin = planSpin(wheelRotation, slotIndex, prize);
    spin.startedAt = now();
    spin.lastRotation = wheelRotation;
    spin.lastBoundary = Math.floor((wheelRotation + WHEEL_SLOT_DEG / 2) / WHEEL_SLOT_DEG);
    spin.lastTickAt = 0;
    // El golpe: la rueda para en seco en el centro de su casilla y empieza la
    // revelacion (el rebote sigue, sin salir de la casilla).
    spin.impact = function () {
      var resolved = slotIndexAtPointer(spin.to);
      if (ruletaScreenEl) {
        ruletaScreenEl.dataset.ruletaSlot = String(resolved);
        ruletaScreenEl.dataset.ruletaTier = WHEEL_SLOTS[resolved];
        ruletaScreenEl.dataset.ruletaResult = prize.id;
      }
      if (scene) {
        scene.jolt = 1;
        shakeMachine(6, 320);
      }
      revealPrize(prize, resolved);
    };
    spin.done = function () {
      wheelSpinning = false;
      wheelRotation = spin.to;
    };
    scene.spin = spin;
    lastSpinPlan = {
      startedAt: spin.startedAt,
      total: Math.round(spin.total),
      lastSpeed: Math.round(spin.lastSpeed),
      releaseSpeed: Math.round(spin.releaseSpeed),
      phases: spin.segs.map(function (sg) { return [sg.phase, Math.round(sg.t0), Math.round(sg.t1)]; })
    };
  }

  // Llave encendida sobre su casilla (la caja rota con ella).
  function keyHolder(slotIndex, extraClass) {
    var tier = WHEEL_SLOTS[slotIndex];
    var holder = el("div", "ruleta-machine__lit" + (extraClass ? " " + extraClass : ""));
    holder.style.transform = "rotate(" + (slotIndex * WHEEL_SLOT_DEG) + "deg)";
    holder.style.setProperty("--key-glow", TIER_GLOW[tier]);
    var box = slotIndex % 2 === 0 ? "brown" : tier === "BLACK" || tier === "RED" ? "rim" : "white";
    holder.appendChild(artImg("ruleta-machine__lit-key ruleta-machine__lit-key--" + box, WHEEL_ART.keys[tier]));
    scene.spinner.appendChild(holder);
    return holder;
  }

  // Parada: se va la luz, la llave ganadora prende sola en la oscuridad, su
  // luz baja al abismo, el abismo aspira (mas cuanto mas gordo es el premio) y
  // estalla cantandolo. Cada premio con lo suyo (PRIZE_FX).
  function revealPrize(prize, slotIndex) {
    if (!scene) return;
    var fx = PRIZE_FX[prize.id] || PRIZE_FX.X10;
    var tier = WHEEL_SLOTS[slotIndex];
    var none = !prize.bonus && prize.multiplier === 0;
    scene.machine.style.setProperty("--key-glow", TIER_GLOW[tier]);
    setDark(1, 90);
    scene.shade.classList.add("ruleta-machine__shade--on");
    audioEvent("ruleta_stop", { tier: tier });
    audioEvent("ruleta_lights_out");

    var holder = keyHolder(slotIndex, none ? "ruleta-machine__lit--weak" : "");
    scene.lit = holder;
    later(function () {
      if (!scene) return;
      holder.classList.add("ruleta-machine__lit--on");
      scene.mawBoost = Math.max(scene.mawBoost, 0.3);
      audioEvent("ruleta_key_lit", { tier: tier });
    }, none ? 520 : 300);

    later(function () { beamToAbyss(none); }, none ? 980 : 760);

    var arrive = none ? 1440 : 1240;
    if (fx.inhale) later(function () { inhaleAbyss(); }, arrive);
    later(function () { burstPrize(prize, fx, tier); }, arrive + fx.inhale);
    var settleIn = prize.bonus ? 2600 : none ? 1100 : prize.multiplier >= 100 ? 1900 : 1250;
    later(function () { settlePrize(prize); }, arrive + fx.inhale + settleIn);
  }

  function beamToAbyss(weak) {
    if (!scene) return;
    var peak = weak ? 0.45 : 1;
    scene.beam.animate([
      { opacity: 0, transform: "translateX(-50%) scaleY(0)" },
      { opacity: peak, transform: "translateX(-50%) scaleY(1)", offset: 0.6 },
      { opacity: 0, transform: "translateX(-50%) scaleY(1)" }
    ], { duration: 640, easing: "ease-in", fill: "forwards" });
    scene.orb.animate([
      { opacity: 0, top: LIT_KEY_Y + "%", transform: "translate(-50%, -50%) scale(0.6)" },
      { opacity: peak, offset: 0.15 },
      { opacity: peak, top: ABYSS_CENTER.y + "%", transform: "translate(-50%, -50%) scale(1.25)", offset: 0.85 },
      { opacity: 0, top: ABYSS_CENTER.y + "%", transform: "translate(-50%, -50%) scale(0.2)" }
    ], { duration: 520, easing: "cubic-bezier(0.55, 0, 0.75, 0.4)", fill: "forwards" });
  }

  // El abismo aspira: el remolino se acelera, la boca se apaga, las brasas
  // caen hacia dentro y la maquina tiembla. Lo corta burstPrize.
  function inhaleAbyss() {
    if (!scene) return;
    scene.suck = 1;
    scene.trembleBoost = 0.8;
    audioEvent("ruleta_inhale");
  }

  function burstPrize(prize, fx, tier) {
    if (!scene) return;
    scene.suck = 0;
    scene.trembleBoost = 0;
    scene.mawBoost = 1;
    scene.vortexSpeed = prize.bonus === "SUPER_BONUS" ? 900 : prize.multiplier === 0 && !prize.bonus ? 260 : 560;
    scene.vortexTarget = 14;
    burstSparks(tier, fx.sparks);
    burstCoins(fx.coins);
    burstSmoke(fx.smoke, prize.bonus === "SUPER_BONUS" ? "70, 0, 0" : "28, 6, 44");
    burstAsh(fx.ash);
    if (fx.rays) showRays(fx.rays, prize.bonus ? fx.lightning : TIER_GLOW[tier]);
    for (var i = 0; i < (fx.rings || 0); i++) {
      (function (delay) { later(function () { shockRing(); }, delay); })(i * 150);
    }
    if (fx.shake) shakeMachine(fx.shake, 380 + fx.shake * 30);
    if (fx.lights === "flash") {
      flashScreen(fx.flash, prize.multiplier >= 100 ? 1100 : 700);
      setDark(0, 380);
    } else if (fx.lights === "storm") {
      setDark(0.9, 200);
      lightning(fx.lightning, fx.bolts);
    } else {
      setDark(0.6, 1100);
      if (scene.lit) scene.lit.classList.add("ruleta-machine__lit--dying");
      audioEvent("ruleta_key_die");
    }
    audioEvent(fx.sound, { multiplier: prize.multiplier || 0 });
    emergePrize(prize, fx);
  }

  function showRays(strength, color) {
    var node = scene.rays;
    node.style.setProperty("--ray", color);
    node.animate([
      { opacity: 0, transform: "translate(-50%, -50%) rotate(0deg) scale(0.7)" },
      { opacity: strength, transform: "translate(-50%, -50%) rotate(8deg) scale(1)", offset: 0.15 },
      { opacity: strength * 0.7, transform: "translate(-50%, -50%) rotate(24deg) scale(1.05)", offset: 0.65 },
      { opacity: 0, transform: "translate(-50%, -50%) rotate(34deg) scale(1.08)" }
    ], { duration: 2800, easing: "ease-out", fill: "forwards" });
  }

  function shockRing() {
    if (!scene) return;
    var ring = el("div", "ruleta-machine__ring");
    scene.machine.appendChild(ring);
    var anim = ring.animate([
      { opacity: 1, transform: "translate(-50%, -50%) scale(0.3)" },
      { opacity: 0, transform: "translate(-50%, -50%) scale(5.5)" }
    ], { duration: 820, easing: "cubic-bezier(0.1, 0.7, 0.3, 1)", fill: "forwards" });
    anim.onfinish = function () { if (ring.parentNode) ring.parentNode.removeChild(ring); };
  }

  // Relampagos: fogonazos rapidos del color del bonus sobre la oscuridad.
  function lightning(color, bolts) {
    for (var i = 0; i < bolts; i++) {
      (function (index) {
        later(function () {
          if (!scene) return;
          scene.flash.style.background = "radial-gradient(circle at " + (30 + Math.random() * 40) + "% 30%, rgba(" + color + ", 0.75), rgba(" + color + ", 0.18) 55%, rgba(0, 0, 0, 0) 85%)";
          scene.flash.animate([
            { opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 0.15, offset: 0.25 },
            { opacity: 0.85, offset: 0.35 }, { opacity: 0 }
          ], { duration: 420 + Math.random() * 200, easing: "linear" });
          scene.flicker = 1;
          if (index > 0) shakeMachine(6, 260);
          audioEvent("ruleta_lightning", { index: index });
        }, index === 0 ? 0 : 260 + index * 380 + Math.random() * 160);
      })(i);
    }
  }

  function prizeLabel(prize) {
    if (prize.bonus === "SUPER_BONUS") return "SUPER BONUS";
    if (prize.bonus) return "BONUS GAME";
    return "x" + prize.multiplier;
  }

  // El premio son dos capas: la de fuera se anima (sale del remolino) y la de
  // dentro lleva las cifras o el texto con el resplandor del color de la
  // llave (si la animacion tocara su filtro, el resplandor se perderia).
  function emergePrize(prize, fx) {
    var node = scene.prize;
    var label = prizeLabel(prize);
    var none = !prize.bonus && prize.multiplier === 0;
    node.hidden = false;
    node.className = "ruleta-machine__prize ruleta-machine__prize--" +
      (prize.bonus === "SUPER_BONUS" ? "super" : prize.bonus ? "bonus" : none ? "none" : "win") +
      (prize.multiplier >= 100 ? " ruleta-machine__prize--big" : "");
    node.style.setProperty("--prize-scale", String(fx.size || 1));
    node.replaceChildren();
    var inner = el("span", "ruleta-machine__prize-label");
    node.appendChild(inner);
    if (!prize.bonus && window.OssuaryNumberFont) {
      window.OssuaryNumberFont.render(inner, label);
    } else if (prize.bonus) {
      var logo = artImg("ruleta-machine__prize-logo", scrollArt(SCROLL_ART.logos[prize.tier]));
      logo.alt = prize.bonus === "SUPER_BONUS" ? "The Judgment" : "Execution Bonus";
      inner.appendChild(logo);
    } else {
      inner.textContent = label;
    }
    // El resultado sube desde el centro del abismo, toma cuerpo y se asienta.
    // Un giro corto conserva el carácter sobrenatural sin hacer que el texto
    // sea difícil de leer.
    var big = prize.multiplier >= 100 || prize.bonus;
    node.animate([
      { opacity: 0, transform: "translate(-50%, calc(-50% + 18%)) scale(0.42) rotate(-18deg)", filter: "blur(4px) brightness(1.8)" },
      { opacity: 1, transform: "translate(-50%, -56%) scale(" + (none ? 0.88 : 1.08) + ") rotate(2deg)", filter: "blur(0px) brightness(1.45)", offset: 0.56 },
      { opacity: 1, transform: "translate(-50%, -50%) scale(1) rotate(0deg)", filter: "blur(0px) brightness(1)" }
    ], { duration: big ? 1450 : 1080, easing: "cubic-bezier(0.16, 0.76, 0.26, 1)", fill: "forwards" });
  }

  function shakeMachine(px, ms) {
    if (!scene || !scene.machine.animate) return;
    var unit = scene.machine.clientHeight / 1000 || 1;
    var frames = [];
    var steps = Math.max(8, Math.round(ms / 45));
    for (var i = 0; i <= steps; i++) {
      var k = 1 - i / steps;
      var x = i === steps ? 0 : (Math.random() * 2 - 1) * px * unit * k;
      var y = i === steps ? 0 : (Math.random() * 2 - 1) * px * unit * 0.6 * k;
      frames.push({ translate: x.toFixed(1) + "px " + y.toFixed(1) + "px" });
    }
    scene.machine.animate(frames, { duration: ms, easing: "linear" });
  }

  function flashScreen(color, ms) {
    if (!scene) return;
    scene.flash.style.background = "radial-gradient(circle at 50% 42%, rgba(" + color + ", 0.55) 0%, rgba(" + color + ", 0.22) 45%, rgba(0, 0, 0, 0) 85%)";
    scene.flash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0 }], { duration: ms, easing: "ease-out" });
  }

  // Desenlace: x0 se lo traga el abismo; un premio va al contador; BONUS y
  // SUPER BONUS fundido y video de entrada del bonus (como en el juego).
  function settlePrize(prize) {
    if (!scene) return;
    var bet = hooks.getBet();
    if (prize.bonus) {
      enterBonusFromWheel(prize);
      return;
    }
    if (prize.multiplier <= 0) {
      scene.prize.animate([
        { opacity: 1, transform: "translate(-50%, -50%) scale(1) rotate(0deg)", filter: "brightness(1)" },
        { opacity: 0, transform: "translate(-50%, -50%) scale(0.02) rotate(300deg)", filter: "brightness(0.4)" }
      ], { duration: 760, easing: "cubic-bezier(0.6, 0, 0.85, 0.4)", fill: "forwards" });
      scene.vortexSpeed = 380;
      scene.suck = 0.6;
      audioEvent("ruleta_prize_swallowed");
      later(function () { if (scene) scene.suck = 0; }, 700);
      later(function () {
        flashAndRun(function () { close(); }, "#000");
      }, 1250);
      return;
    }
    var amount = bet * prize.multiplier;
    // El premio cede el sitio al contador (sube y se apaga).
    if (hooks.showWinCounter) {
      scene.prize.animate([
        { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
        { opacity: 0, transform: "translate(-50%, -80%) scale(0.7)" }
      ], { duration: 320, easing: "ease-in", fill: "forwards" });
    }
    if (hooks.payWin) hooks.payWin(amount, "ruleta_gamble_" + prize.id.toLowerCase(), prize.paymentToken);
    showNormalWinCounter(amount, bet).then(function () {
      flashAndRun(function () { close(); });
    });
  }

  function showNormalWinCounter(amount, bet) {
    if (hooks.showWinCounter && amount > 0) {
      return Promise.resolve(hooks.showWinCounter(amount, bet));
    }
    // Sin contador (modo visual): una pausa con el premio en pantalla.
    return new Promise(function (resolve) { later(resolve, 1400); });
  }

  // BONUS GAME y SUPER BONUS: fundido a negro (sangre en el SUPER) y game.js
  // saca el video de entrada del bonus, como cuando se completa la cadena en
  // el juego. El SUPER BONUS tiene su propio hook (su modo aun no existe;
  // sin hook entra como el BONUS GAME).
  function enterBonusFromWheel(prize) {
    clearResultTimers();
    var superBonus = prize.bonus === "SUPER_BONUS";
    var enter = superBonus && hooks.enterSuperBonus ? hooks.enterSuperBonus : hooks.enterFreeSpins;
    flashAndRun(function () {
      close({ nextMode: "bonus" });
      if (enter) enter();
    }, superBonus ? "#5a0000" : "#000");
  }

  // Cierra todas las capas del modulo y resetea el contador (vuelta al slot).
  function close(options) {
    options = options || {};
    if (transitionEl && transitionEl.parentNode) transitionEl.parentNode.removeChild(transitionEl);
    transitionEl = null;
    if (scene && scene.frame) window.cancelAnimationFrame(scene.frame);
    scene = null;
    if (ruletaScreenEl && ruletaScreenEl.parentNode) ruletaScreenEl.parentNode.removeChild(ruletaScreenEl);
    ruletaScreenEl = null;
    ruletaButtonsRowEl = null;
    wheelRotation = 0;
    wheelSpinning = false;
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
    if (hooks.onClosed) hooks.onClosed({ nextMode: options.nextMode || "normal" });
  }

  // Pintar el contador inicial en cuanto el DOM este listo (el cofre ya
  // existe: scene-manager.js corre antes que este script). Debug por URL
  // (?rgdebug=sequence|play|ruleta) para revisar las pantallas sin jugar.
  function init() {
    renderCounter();
    // El arte de la maquina a memoria cuando el juego ya cargo lo suyo.
    if (document.readyState === "complete") window.setTimeout(keepWheelArtResident, 1500);
    else window.addEventListener("load", function () { window.setTimeout(keepWheelArtResident, 1500); }, { once: true });
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
    COLLECT_MULTIPLIER: COLLECT_MULTIPLIER,
    // game.js inyecta aqui sus hooks reales (bet, pago, entrada al bonus).
    configure: function (h) {
      h = h || {};
      if (typeof h.getBet === "function") hooks.getBet = h.getBet;
      if (typeof h.payWin === "function") hooks.payWin = h.payWin;
      if (typeof h.capturePayment === "function") hooks.capturePayment = h.capturePayment;
      if (typeof h.showWinCounter === "function") hooks.showWinCounter = h.showWinCounter;
      if (typeof h.enterFreeSpins === "function") hooks.enterFreeSpins = h.enterFreeSpins;
      if (typeof h.enterSuperBonus === "function") hooks.enterSuperBonus = h.enterSuperBonus;
      if (typeof h.onClosed === "function") hooks.onClosed = h.onClosed;
      if (typeof h.selectPrize === "function") hooks.selectPrize = h.selectPrize;
      if (typeof h.selectCollect === "function") hooks.selectCollect = h.selectCollect;
      if (typeof h.shouldOpen === "function") hooks.shouldOpen = h.shouldOpen;
      if (typeof h.getProgress === "function") hooks.getProgress = h.getProgress;
    },
    // true desde que arranca el cofre/ruleta hasta close(): game.js pausa
    // el juego base (autoplay, SPIN y compras) mientras tanto.
    isActive: function () { return sequenceStarted; },
    addFallenSymbols: addFallenSymbols,
    startPendingSequence: startPendingSequence,
    startPurchasedGame: startPurchasedGame,
    getCount: function () { return count; },
    getTriggerCount: function () { return triggerCount; },
    exportEconomicState: function () { return { count: count, triggerCount: triggerCount }; },
    importEconomicState: function (snapshot) {
      if (sequenceStarted) throw new Error("Cannot switch chest stake during a feature");
      count = snapshot ? snapshot.count : 0;
      triggerCount = snapshot ? snapshot.triggerCount : randomTriggerCount();
      renderCounter();
    },
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
      showRuleta: showRuletaScreen,
      // Premio del siguiente GAMBLE: "X0", "X10", "X25", "X50", "X100",
      // "BONUS" o "SUPER_BONUS" (null lo quita).
      forceNextPrize: function (id) {
        forcedPrizeId = id && prizeById(id) ? id : null;
        return forcedPrizeId;
      },
      getForcedPrize: function () { return forcedPrizeId; },
      lastSpinPlan: function () { return lastSpinPlan; },
      prizes: function () {
        return WHEEL_PRIZES.map(function (p) { return { id: p.id, tier: p.tier, weight: p.weight }; });
      },
      slots: function () { return WHEEL_SLOTS.slice(); }
    }
  };
})();
