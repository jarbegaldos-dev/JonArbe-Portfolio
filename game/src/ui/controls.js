(function () {
  "use strict";

  function createControls(options) {
    var stage = options.stage;
    var betSteps = options.betSteps;
    var hooks = options.hooks;

    var menuBtn = document.getElementById("menuBtn");
    var closeMenuBtn = document.getElementById("closeMenuBtn");
    var menuPanel = document.getElementById("menuPanel");
    var coinBtn = document.getElementById("coinBtn");
    var betChoicePanel = document.getElementById("betChoicePanel");
    var betChoicePresets = document.getElementById("betChoicePresets");
    var betCustomInput = document.getElementById("betCustomInput");
    var betCustomApplyBtn = document.getElementById("betCustomApplyBtn");
    var betChoiceHint = document.getElementById("betChoiceHint");
    var betUpBtn = document.getElementById("betUpBtn");
    var betDownBtn = document.getElementById("betDownBtn");
    var maxBetBtn = document.getElementById("maxBetBtn");
    var spinBtn = document.getElementById("spinBtn");
    var autoBtn = document.getElementById("autoBtn");
    var autoPanel = document.getElementById("autoPanel");
    var autoPresetButtons = Array.prototype.slice.call(document.querySelectorAll("[data-auto-count]"));
    var autoCustomInput = document.getElementById("autoCustomInput");
    var autoCustomApplyBtn = document.getElementById("autoCustomApplyBtn");
    var autoStopBtn = document.getElementById("autoStopBtn");
    var autoStatusLabel = document.getElementById("autoStatusLabel");
    var autoCounterBadge = document.getElementById("autoCounterBadge");
    var autoCounterValue = document.getElementById("autoCounterValue");
    var autoCounterStopBtn = document.getElementById("autoCounterStopBtn");
    var buyBonusBtn = document.getElementById("buyBonusBtn");
    var buyBonusPanel = document.getElementById("buyBonusPanel");
    var buyBonusOptionButtons = Array.prototype.slice.call(document.querySelectorAll("[data-buy-bonus-option]"));
    var buyBonusPriceEls = Array.prototype.slice.call(document.querySelectorAll("[data-buy-bonus-price]"));
    var buyBonusMultipleEls = Array.prototype.slice.call(document.querySelectorAll("[data-buy-bonus-multiple]"));
    var buyScreenCloseBtn = document.getElementById("buyScreenCloseBtn");
    var buyScreenRulesBtn = document.getElementById("buyScreenRulesBtn");
    var buyScreenBet = document.getElementById("buyScreenBet");
    var selectedBuyBonusBadge = document.getElementById("selectedBuyBonusBadge");
    var selectedBuyBonusImage = document.getElementById("selectedBuyBonusImage");
    var selectedBuyBonusPrice = document.getElementById("selectedBuyBonusPrice");
    var selectedBuyBonusCancelBtn = document.getElementById("selectedBuyBonusCancelBtn");
    var volumeBtn = document.getElementById("volumeBtn");
    var turboBtn = document.getElementById("turboBtn");
    var autoToggleBtn = document.getElementById("autoToggleBtn");
    var resetBtn = document.getElementById("resetBtn");
    // HUD: trebol de corazones (menu que se abre) y reloj de arena.
    var cloverEl = document.getElementById("hudClover");
    var cloverBtn = document.getElementById("cloverBtn");
    var rulesQuickBtn = document.getElementById("rulesQuickBtn");
    var hourglassEl = document.getElementById("hudHourglass");
    var cloverOpen = false;
    var audioMuted = false;
    var autoPanelOpen = false;
    var buyBonusPanelOpen = false;
    var betChoicePanelOpen = false;
    var selectedBuyBonusOption = null;

    function toggleMenu(forceOpen) {
      if (!menuPanel) return;
      var shouldOpen = forceOpen === null || typeof forceOpen === "undefined"
        ? menuPanel.hidden
        : forceOpen;
      menuPanel.hidden = !shouldOpen;
      if (menuBtn) menuBtn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      if (shouldOpen) {
        var first = menuPanel.querySelector("input, button:not(.menu-panel__close)");
        if (first && typeof first.focus === "function") first.focus();
      }
    }

    function isModalOpen() {
      if (menuPanel && !menuPanel.hidden) return true;
      if (buyBonusPanelOpen) return true;
      if (window.OssuaryRulesScreen && window.OssuaryRulesScreen.isOpen()) return true;
      return document.body.classList.contains("is-loading");
    }

    function syncVolumeButton(muted) {
      audioMuted = Boolean(muted);
      if (!volumeBtn) return;
      volumeBtn.classList.toggle("is-active", audioMuted);
      volumeBtn.setAttribute("aria-pressed", audioMuted ? "true" : "false");
    }

    function setDisabled(el, disabled) {
      if (el) el.disabled = disabled;
    }

    // Trebol: al pasar el raton por el emblema (o con un toque) gira y saca
    // sonido, reglas, apuestas y ajustes. Estilos en src/ui/hud-reliquary.css.
    function setCloverOpen(open) {
      if (!cloverEl) return;
      cloverOpen = Boolean(open);
      cloverEl.classList.toggle("is-open", cloverOpen);
      if (cloverBtn) cloverBtn.setAttribute("aria-expanded", cloverOpen ? "true" : "false");
    }

    // SPIN del reloj de arena: la flecha (gira mientras dura la tirada) o un
    // numero: tiradas del autoplay, tiradas gratis que quedan en la cadena del
    // cuervo (despues de la actual) u oportunidades (velas encendidas) del
    // Execution Bonus. Candado con la ruleta o la entrada del bonus en
    // pantalla. Cualquier tirada gratis (Execution o cadena del cuervo,
    // comprada o por azar) pinta el reloj de rojo y en cada una el marco da
    // media vuelta; en las tiradas normales, no.
    var spinCountEl = null;
    var spinCountNumEl = null;
    var spinCountLabelEl = null;
    var spinCountValue = null;
    var spinCountMode = null;
    var wasSpinning = false;
    var flipTimer = 0;
    var lastFlipAt = 0;

    function executionChances() {
      if (!stage || !stage.classList.contains("bonus-mode-normal-active")) return null;
      var counter = document.querySelector(".bonus-candle-counter");
      if (!counter || counter.hidden) return null;
      return counter.querySelectorAll(".bonus-candle-counter__slot.is-lit").length;
    }

    function spinLocked() {
      var ruleta = window.OssuaryRuletaGame;
      if (ruleta && typeof ruleta.isActive === "function" && ruleta.isActive()) return true;
      var intro = document.getElementById("bonusIntroModal");
      return Boolean(intro && !intro.hidden);
    }

    function spinStateFor(data) {
      // SUPER BONUS "El Juicio": las campanadas que quedan (reloj en rojo).
      var juicio = window.OssuaryElJuicio && window.OssuaryElJuicio.hudSpinState();
      if (juicio) return juicio;
      var chances = executionChances();
      if (chances !== null) return { mode: "execution", count: chances, label: chances === 1 ? "CHANCE" : "CHANCES" };
      if (typeof data.freeSpinsLeft === "number" && data.freeSpinsLeft >= 0) {
        return { mode: "raven", count: data.freeSpinsLeft, label: data.freeSpinsLeft === 1 ? "FREE SPIN" : "FREE SPINS" };
      }
      if (spinLocked()) return { mode: "locked" };
      if (data.auto) return { mode: "auto", count: data.autoSpinsRemaining, label: "AUTO" };
      return { mode: "base" };
    }

    function ensureSpinCount() {
      if (spinCountEl) return;
      spinCountEl = document.createElement("span");
      spinCountEl.className = "hud-hourglass__count";
      spinCountEl.setAttribute("aria-hidden", "true");
      spinCountNumEl = document.createElement("span");
      spinCountNumEl.className = "hud-hourglass__count-num";
      spinCountLabelEl = document.createElement("span");
      spinCountLabelEl.className = "hud-hourglass__count-label";
      spinCountEl.appendChild(spinCountNumEl);
      spinCountEl.appendChild(spinCountLabelEl);
      spinBtn.appendChild(spinCountEl);
    }

    function flipHourglass() {
      if (!hourglassEl) return;
      // Una sola media vuelta por tirada (al arrancar la tirada y al bajar el
      // contador pueden llegar casi a la vez).
      var now = window.performance.now();
      if (now - lastFlipAt < 1200) return;
      lastFlipAt = now;
      hourglassEl.classList.remove("is-flipping");
      void hourglassEl.offsetWidth; // reinicia la animacion CSS
      hourglassEl.classList.add("is-flipping");
      if (flipTimer) window.clearTimeout(flipTimer);
      flipTimer = window.setTimeout(function () {
        flipTimer = 0;
        hourglassEl.classList.remove("is-flipping");
      }, 800);
    }

    function syncSpinState(data) {
      if (!spinBtn) return;
      var st = spinStateFor(data);
      var hasCount = typeof st.count === "number";
      var reelsMoving = Boolean(data.spinning) && st.mode !== "locked";
      if (hourglassEl) {
        hourglassEl.classList.toggle("is-raven", st.mode === "raven");
        hourglassEl.classList.toggle("is-execution", st.mode === "execution");
        hourglassEl.classList.toggle("is-locked", st.mode === "locked");
        hourglassEl.classList.toggle("has-count", hasCount);
        hourglassEl.classList.toggle("is-spinning", reelsMoving && !hasCount);
        hourglassEl.classList.toggle("is-busy", reelsMoving);
        hourglassEl.classList.toggle("is-auto", st.mode === "auto");
        hourglassEl.classList.toggle("is-turbo", Boolean(data.turbo));
        // En la cadena del cuervo el juego no se para entre tiradas: cada
        // tirada gratis nueva se nota porque baja el contador.
        var freeSpin = st.mode === "raven" || st.mode === "execution";
        var countDropped = st.mode === "raven" && st.mode === spinCountMode && spinCountValue !== null && st.count < spinCountValue;
        if (freeSpin && ((reelsMoving && !wasSpinning) || countDropped)) flipHourglass();
      }
      wasSpinning = reelsMoving;
      spinBtn.classList.toggle("is-free-spins", st.mode === "raven");
      if (!hasCount) {
        if (spinCountEl) spinCountEl.hidden = true;
        spinCountValue = null;
        spinCountMode = null;
        spinBtn.setAttribute("aria-label", st.mode === "locked" ? "Spin locked" : "Spin");
        return;
      }
      ensureSpinCount();
      spinCountEl.hidden = false;
      if (st.count === spinCountValue && st.mode === spinCountMode) return;
      // Si sube (muere un cuervo, se enciende una vela), el numero da un golpe.
      var grew = spinCountMode === st.mode && spinCountValue !== null && st.count > spinCountValue;
      spinCountValue = st.count;
      spinCountMode = st.mode;
      spinCountNumEl.textContent = String(st.count);
      spinCountLabelEl.textContent = st.label;
      spinBtn.setAttribute("aria-label", st.label + " left: " + st.count);
      if (grew && typeof spinCountNumEl.animate === "function") {
        spinCountNumEl.animate(
          [
            { transform: "scale(1.7)", filter: "brightness(1.8)" },
            { transform: "scale(0.92)", filter: "brightness(1.2)", offset: 0.55 },
            { transform: "scale(1)", filter: "brightness(1)" }
          ],
          { duration: 420, easing: "cubic-bezier(.2,.8,.3,1)" }
        );
      }
    }

    function toggleAutoPanel(forceOpen) {
      if (!autoPanel) return;
      autoPanelOpen = typeof forceOpen === "boolean" ? forceOpen : !autoPanelOpen;
      autoPanel.hidden = !autoPanelOpen;
      if (autoBtn) autoBtn.classList.toggle("is-open", autoPanelOpen);
    }

    // Pantalla de compra (tarjetas a pantalla completa). Elegir una tarjeta la
    // deja seleccionada sobre SPIN, como antes: la compra se hace con SPIN.
    function toggleBuyBonusPanel(forceOpen) {
      if (!buyBonusPanel) return;
      var wasOpen = buyBonusPanelOpen;
      buyBonusPanelOpen = typeof forceOpen === "boolean" ? forceOpen : !buyBonusPanelOpen;
      buyBonusPanel.hidden = !buyBonusPanelOpen;
      document.body.classList.toggle("has-buy-screen", buyBonusPanelOpen);
      if (buyBonusBtn) {
        buyBonusBtn.classList.toggle("is-open", buyBonusPanelOpen);
        buyBonusBtn.setAttribute("aria-expanded", buyBonusPanelOpen ? "true" : "false");
      }
      if (buyBonusPanelOpen && !wasOpen) {
        if (lastData) syncBuyBonusPrices(lastData);
        // El foco va a la caja (no a la X): asi Espacio no la cierra sin querer.
        var buyBox = buyBonusPanel.querySelector(".buy-screen__box");
        if (buyBox) buyBox.focus({ preventScroll: true });
      } else if (!buyBonusPanelOpen && wasOpen && buyBonusBtn && buyBonusPanel.contains(document.activeElement)) {
        buyBonusBtn.focus({ preventScroll: true });
      }
    }

    function toggleBetChoicePanel(forceOpen) {
      if (!betChoicePanel) return;
      betChoicePanelOpen = typeof forceOpen === "boolean" ? forceOpen : !betChoicePanelOpen;
      betChoicePanel.hidden = !betChoicePanelOpen;
      if (coinBtn) {
        coinBtn.classList.toggle("is-open", betChoicePanelOpen);
        coinBtn.setAttribute("aria-expanded", betChoicePanelOpen ? "true" : "false");
      }
      if (!betChoicePanelOpen) setBetChoiceHint("");
    }

    function closeFloatingPanels() {
      toggleBetChoicePanel(false);
      toggleAutoPanel(false);
      toggleBuyBonusPanel(false);
    }

    function normalizeBetAmount(value) {
      var numeric = Number(String(value).replace(",", "."));
      if (!Number.isFinite(numeric) || numeric <= 0) return null;
      var cents = Math.round(numeric * 100);
      if (Math.abs(numeric * 100 - cents) > 0.001) return null;
      if (cents % 10 !== 0) return null;
      return Math.round(cents) / 100;
    }

    function formatBetOption(value) {
      var amount = normalizeBetAmount(value);
      if (amount === null) return "";
      return "\u20ac" + amount.toFixed(2);
    }

    function setBetChoiceHint(message, isError) {
      if (!betChoiceHint) return;
      betChoiceHint.textContent = message || "0.10 steps only";
      betChoiceHint.classList.toggle("is-error", Boolean(isError));
    }

    function selectableBetSteps() {
      return betSteps.filter(function (value) {
        return value >= 0.1 && value <= 10 && normalizeBetAmount(value) !== null;
      });
    }

    function buildBetChoiceButtons() {
      if (!betChoicePresets) return;
      betChoicePresets.innerHTML = "";
      selectableBetSteps().forEach(function (value) {
        var btn = document.createElement("button");
        btn.className = "bet-choice-panel__preset";
        btn.type = "button";
        btn.setAttribute("data-bet-choice", String(value));
        btn.textContent = formatBetOption(value);
        btn.addEventListener("click", function (event) {
          event.stopPropagation();
          playButtonClick();
          applyBetAmount(value);
        });
        betChoicePresets.appendChild(btn);
      });
    }

    function applyBetAmount(value) {
      var amount = normalizeBetAmount(value);
      if (amount === null) {
        setBetChoiceHint("Use multiples of \u20ac0.10", true);
        return;
      }
      if (hooks.setBetAmount) hooks.setBetAmount(amount);
      if (betCustomInput) betCustomInput.value = "";
      setBetChoiceHint("");
      toggleBetChoicePanel(false);
    }

    function parseAutoCount(rawValue) {
      var count = Math.round(Number(rawValue) || 0);
      return Math.max(1, count);
    }

    function applyAutoCount(count) {
      var normalized = parseAutoCount(count);
      hooks.setAutoSpinCount(normalized);
      if (autoCustomInput) autoCustomInput.value = "";
      toggleAutoPanel(false);
      if (hooks.stopAuto) hooks.stopAuto();
      hooks.toggleAuto();
    }

    function buyBonusMultiplier(kind) {
      var economy = window.OSSUARY_ECONOMY_CONFIG;
      if (economy && economy.costs[kind] != null) return economy.costs[kind];
      if (kind === "bonus-game") return 100;
      if (kind === "blade-spin") return 25;
      if (kind === "chest-game") return 21;
      if (kind === "super-bonus") return 500;
      return 1;
    }

    function selectedBuyBonusCost(data) {
      return selectedBuyBonusOption ? data.currentBet * buyBonusMultiplier(selectedBuyBonusOption) : data.currentBet;
    }

    function setSelectedBuyBonus(optionId) {
      selectedBuyBonusOption = optionId || null;
      var selectedButton = null;
      buyBonusOptionButtons.forEach(function (btn) {
        var isSelected = btn.getAttribute("data-buy-bonus-option") === selectedBuyBonusOption;
        btn.classList.toggle("is-selected", isSelected);
        btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
        if (isSelected) selectedButton = btn;
      });
      if (selectedBuyBonusBadge) selectedBuyBonusBadge.hidden = !selectedButton;
      if (selectedBuyBonusImage) {
        var img = selectedButton ? selectedButton.querySelector(".buy-card__art") : null;
        selectedBuyBonusImage.src = img ? img.currentSrc || img.src : "";
        selectedBuyBonusImage.alt = img ? img.alt : "";
      }
      if (lastData) syncBuyBonusPrices(lastData);
    }

    // Precios de la pantalla de compra y del badge sobre SPIN: en euros
    // segun la apuesta actual, con el multiplo debajo (100x BET).
    function syncBuyBonusPrices(data) {
      buyBonusPriceEls.forEach(function (el) {
        el.textContent = formatMoney(data.currentBet * buyBonusMultiplier(el.getAttribute("data-buy-bonus-price")));
      });
      buyBonusMultipleEls.forEach(function (el) {
        el.textContent = buyBonusMultiplier(el.getAttribute("data-buy-bonus-multiple")) + "× BET";
      });
      if (buyScreenBet) buyScreenBet.textContent = formatMoney(data.currentBet);
      if (selectedBuyBonusPrice) {
        selectedBuyBonusPrice.textContent = selectedBuyBonusOption ? formatMoney(selectedBuyBonusCost(data)) : "";
      }
    }

    // --- Saldo insuficiente --------------------------------------------------
    // Antes SPIN se desactivaba sin mas cuando no llegaba el saldo (y el
    // autoplay se quedaba "encendido" sin girar). Ahora SPIN sigue pulsable,
    // se ve apagado (.is-unaffordable) y al pulsarlo sale un aviso con el
    // sonido de error. Sin saldo para la apuesta minima, aviso fijo con
    // RESTART GAME (vuelve a 10,000 con el reset de siempre).
    var NOTICE_MS = 2800;
    var lastData = null;
    var noticeEl = null;
    var noticeTitleEl = null;
    var noticeTextEl = null;
    var noticeActionEl = null;
    var noticeTimer = 0;
    var noticeSticky = false;
    var autoStopQueued = false;

    function formatMoney(value) {
      var amount = Math.round((Number(value) || 0) * 100) / 100;
      return "€" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function minimumBet() {
      return betSteps.length ? Math.min.apply(null, betSteps) : 0;
    }

    function canAfford(data) {
      return data.balance + 1e-9 >= selectedBuyBonusCost(data);
    }

    // Durante el Execution Bonus (giros gratis) o con su entrada en pantalla
    // el saldo no cuenta: ahi nunca sale el aviso de "sin saldo".
    function freePlayInProgress() {
      if (stage && stage.classList.contains("bonus-mode-normal-active")) return true;
      var intro = document.getElementById("bonusIntroModal");
      return Boolean(intro && !intro.hidden);
    }

    function ensureNotice() {
      if (noticeEl) return noticeEl;
      // En body (como el contador BIG WIN): por encima de cuervos y FX del tablero.
      var host = document.body;
      noticeEl = document.createElement("div");
      noticeEl.className = "hud-notice";
      noticeEl.setAttribute("role", "status");
      noticeEl.setAttribute("aria-live", "polite");
      noticeEl.hidden = true;
      noticeTitleEl = document.createElement("div");
      noticeTitleEl.className = "hud-notice__title";
      noticeTextEl = document.createElement("div");
      noticeTextEl.className = "hud-notice__text";
      noticeActionEl = document.createElement("button");
      noticeActionEl.className = "hud-notice__action";
      noticeActionEl.type = "button";
      noticeActionEl.textContent = "RESTART GAME";
      noticeActionEl.hidden = true;
      noticeActionEl.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        hideNotice();
        if (hooks.resetGame) hooks.resetGame();
      });
      noticeEl.appendChild(noticeTitleEl);
      noticeEl.appendChild(noticeTextEl);
      noticeEl.appendChild(noticeActionEl);
      host.appendChild(noticeEl);
      return noticeEl;
    }

    function showNotice(title, text, options) {
      options = options || {};
      ensureNotice();
      if (noticeTimer) window.clearTimeout(noticeTimer);
      noticeTimer = 0;
      noticeSticky = Boolean(options.sticky);
      noticeTitleEl.textContent = title;
      noticeTextEl.textContent = text || "";
      noticeActionEl.hidden = !options.action;
      noticeEl.classList.toggle("is-sticky", noticeSticky);
      noticeEl.hidden = false;
      // Reinicia la animacion de entrada aunque ya estuviera visible.
      noticeEl.classList.remove("is-shown");
      void noticeEl.offsetWidth;
      noticeEl.classList.add("is-shown");
      if (!noticeSticky) noticeTimer = window.setTimeout(hideNotice, NOTICE_MS);
    }

    function hideNotice() {
      if (noticeTimer) window.clearTimeout(noticeTimer);
      noticeTimer = 0;
      noticeSticky = false;
      if (noticeEl) {
        noticeEl.hidden = true;
        noticeEl.classList.remove("is-shown", "is-sticky");
      }
    }

    function isOutOfCredit(data) {
      return data.balance + 1e-9 < minimumBet();
    }

    function showOutOfCredit() {
      if (noticeSticky && noticeEl && !noticeEl.hidden) return;
      showNotice("OUT OF CREDIT", "Start a new game with " + formatMoney(10000) + ".", { sticky: true, action: true });
    }

    function notifyInsufficientBalance(data, reason) {
      if (window.OssuaryAudio) window.OssuaryAudio.trigger("button_error");
      if (isOutOfCredit(data)) {
        showOutOfCredit();
        return;
      }
      var title = reason === "auto" ? "AUTOPLAY STOPPED" : "NOT ENOUGH BALANCE";
      var text = selectedBuyBonusOption
        ? "This bonus costs " + formatMoney(selectedBuyBonusCost(data)) + ". Cancel it with × or lower your bet."
        : "Lower your bet to keep playing.";
      showNotice(title, text);
    }

    function syncBalanceState(data) {
      var affordable = canAfford(data);
      if (spinBtn) {
        spinBtn.classList.toggle("is-unaffordable", !data.spinning && !affordable);
        spinBtn.setAttribute("aria-disabled", !data.spinning && !affordable ? "true" : "false");
      }
      if (data.spinning || freePlayInProgress()) return;
      // Autoplay sin saldo para el siguiente giro: se para (antes se quedaba
      // activo con el contador quieto). Fuera de este update, que corre
      // dentro del render de game.js.
      if (data.auto && !affordable && !autoStopQueued) {
        autoStopQueued = true;
        window.setTimeout(function () {
          autoStopQueued = false;
          if (!lastData || !lastData.auto || lastData.spinning || canAfford(lastData)) return;
          if (hooks.stopAuto) hooks.stopAuto();
          notifyInsufficientBalance(lastData, "auto");
        }, 0);
        return;
      }
      if (isOutOfCredit(data)) {
        showOutOfCredit();
      } else if (noticeSticky) {
        hideNotice();
      }
    }

    function runSpinAction() {
      // Parada rapida: con los rodillos en marcha, SPIN (o Espacio) los para.
      if (lastData && lastData.quickStop && hooks.quickStop) {
        hooks.quickStop();
        return;
      }
      if (lastData && !lastData.spinning && !canAfford(lastData) && !freePlayInProgress()) {
        notifyInsufficientBalance(lastData, "spin");
        return;
      }
      if (selectedBuyBonusOption && hooks.buyBonusOption) {
        var optionId = selectedBuyBonusOption;
        // La seleccion NO se limpia al comprar: el badge sigue sobre SPIN
        // hasta que el jugador la cancele con la X.
        hooks.buyBonusOption(optionId);
        return;
      }
      hooks.startSpin();
    }

    function update(data) {
      if (stage) {
        stage.classList.toggle("is-spinning", data.spinning);
        stage.classList.toggle("is-auto", data.auto);
      }

      lastData = data;
      // Sin saldo SPIN sigue pulsable (para avisar), ver syncBalanceState.
      setDisabled(spinBtn, data.spinning && !data.quickStop);
      spinBtn.classList.toggle("can-quick-stop", Boolean(data.quickStop));
      syncSpinState(data);
      syncBalanceState(data);
      setDisabled(betDownBtn, data.spinning || data.betIndex === 0);
      setDisabled(betUpBtn, data.spinning || data.betIndex === betSteps.length - 1);
      setDisabled(maxBetBtn, data.spinning || data.betIndex === betSteps.length - 1);

      if (autoToggleBtn) autoToggleBtn.textContent = data.auto
        ? "AUTO: " + data.autoSpinsRemaining + " LEFT"
        : "AUTO: " + data.autoSpinConfigured;
      if (autoBtn) {
        autoBtn.classList.toggle("is-active", Boolean(data.auto));
        autoBtn.setAttribute("aria-pressed", data.auto ? "true" : "false");
      }
      if (turboBtn) {
        turboBtn.classList.toggle("is-active", Boolean(data.turbo));
        turboBtn.setAttribute("aria-pressed", data.turbo ? "true" : "false");
      }
      if (autoStatusLabel) {
        autoStatusLabel.textContent = data.auto
          ? data.autoSpinsRemaining + " LEFT"
          : data.autoSpinConfigured + " ROUNDS";
      }
      if (autoCounterBadge) {
        autoCounterBadge.hidden = !data.auto;
      }
      if (autoCounterValue) {
        autoCounterValue.textContent = String(data.auto ? data.autoSpinsRemaining : data.autoSpinConfigured);
      }
      autoPresetButtons.forEach(function (btn) {
        var isSelected = parseAutoCount(btn.getAttribute("data-auto-count")) === parseAutoCount(data.autoSpinConfigured);
        btn.classList.toggle("is-selected", isSelected);
      });
      if (coinBtn) {
        coinBtn.classList.toggle("is-active", betChoicePanelOpen);
        coinBtn.setAttribute("aria-pressed", betChoicePanelOpen ? "true" : "false");
      }
      Array.prototype.slice.call(document.querySelectorAll("[data-bet-choice]")).forEach(function (btn) {
        var amount = normalizeBetAmount(btn.getAttribute("data-bet-choice"));
        btn.classList.toggle("is-selected", amount !== null && Math.abs(amount - data.currentBet) < 0.001);
        btn.disabled = data.spinning;
      });
      if (betCustomApplyBtn) betCustomApplyBtn.disabled = data.spinning;
      if (betCustomInput) betCustomInput.disabled = data.spinning;
      if (autoStopBtn) autoStopBtn.disabled = !data.auto;
      if (autoCounterStopBtn) autoCounterStopBtn.disabled = !data.auto;
      setDisabled(buyBonusBtn, data.spinning);
      buyBonusOptionButtons.forEach(function (btn) {
        var kind = btn.getAttribute("data-buy-bonus-option");
        var multiplier = buyBonusMultiplier(kind);
        btn.disabled = data.spinning || data.balance < data.currentBet * multiplier;
        btn.classList.toggle("is-selected", kind === selectedBuyBonusOption);
      });
      syncBuyBonusPrices(data);
      if (data.spinning && buyBonusPanelOpen) toggleBuyBonusPanel(false);
      if (volumeBtn) volumeBtn.setAttribute("aria-pressed", audioMuted ? "true" : "false");
    }

    function playButtonClick() {
      // Desbloquea el sonido tambien aqui: dentro de un iframe en movil (el
      // portfolio), el primer toque a veces no llega al listener generico de
      // audio-engine.js pero si a un boton del juego. unlock() es idempotente.
      if (window.OssuaryAudioEngine) window.OssuaryAudioEngine.unlock();
      if (window.OssuaryAudio) window.OssuaryAudio.trigger("button_click");
    }

    function bind() {
      buildBetChoiceButtons();
      // La entrada del Execution Bonus y la ruleta del cofre salen sin pasar
      // por el render del juego: el SPIN se pone en candado (y lo quita) en
      // cuanto aparecen o se van (la ruleta se monta en <body>).
      var introModal = document.getElementById("bonusIntroModal");
      if (window.MutationObserver) {
        var resyncSpin = function () {
          if (lastData) syncSpinState(lastData);
        };
        if (introModal) new MutationObserver(resyncSpin).observe(introModal, { attributes: true, attributeFilter: ["hidden"] });
        new MutationObserver(resyncSpin).observe(document.body, { childList: true });
      }
      if (menuBtn) menuBtn.addEventListener("click", function () {
        playButtonClick();
        closeFloatingPanels();
        setCloverOpen(false);
        toggleMenu();
      });
      if (cloverBtn) cloverBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        setCloverOpen(!cloverOpen);
      });
      // Se abre solo con clic o toque (al pasar el raton el emblema solo
      // crece, hud-reliquary.css); se cierra con otro clic o fuera.
      if (rulesQuickBtn) rulesQuickBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        closeFloatingPanels();
        toggleMenu(false);
        setCloverOpen(false);
        if (window.OssuaryRulesScreen) window.OssuaryRulesScreen.open();
      });
      // Clic fuera de la caja del menu (en el fondo oscurecido): cierra.
      if (menuPanel) menuPanel.addEventListener("click", function (event) {
        if (event.target === menuPanel) toggleMenu(false);
      });
      if (closeMenuBtn) closeMenuBtn.addEventListener("click", function () { playButtonClick(); toggleMenu(false); });
      if (betUpBtn) betUpBtn.addEventListener("click", function () { playButtonClick(); hooks.changeBet(1); });
      if (betDownBtn) betDownBtn.addEventListener("click", function () { playButtonClick(); hooks.changeBet(-1); });
      if (maxBetBtn) maxBetBtn.addEventListener("click", function () { playButtonClick(); hooks.setMaxBet(); });
      if (coinBtn) coinBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        toggleAutoPanel(false);
        toggleBuyBonusPanel(false);
        setCloverOpen(false);
        toggleBetChoicePanel();
      });
      if (betCustomApplyBtn) betCustomApplyBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        applyBetAmount(betCustomInput ? betCustomInput.value : 0);
      });
      if (betCustomInput) {
        betCustomInput.addEventListener("click", function (event) {
          event.stopPropagation();
        });
        betCustomInput.addEventListener("keydown", function (event) {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            applyBetAmount(betCustomInput.value);
          }
        });
      }
      if (spinBtn) spinBtn.addEventListener("click", function () { playButtonClick(); runSpinAction(); });
      if (autoBtn) autoBtn.addEventListener("click", function () { playButtonClick(); toggleAutoPanel(); });
      if (buyBonusBtn) buyBonusBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        toggleAutoPanel(false);
        toggleBetChoicePanel(false);
        setCloverOpen(false);
        toggleBuyBonusPanel();
      });
      if (buyScreenCloseBtn) buyScreenCloseBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        toggleBuyBonusPanel(false);
      });
      // Lo que hace cada compra esta en GAME RULES > BUY BONUS.
      if (buyScreenRulesBtn) buyScreenRulesBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        toggleBuyBonusPanel(false);
        if (window.OssuaryRulesScreen) window.OssuaryRulesScreen.open("buy");
      });
      // Tocar el fondo oscuro (fuera de la caja) cierra.
      if (buyBonusPanel) buyBonusPanel.addEventListener("click", function (event) {
        if (event.target === buyBonusPanel) toggleBuyBonusPanel(false);
      });
      buyBonusOptionButtons.forEach(function (btn) {
        btn.addEventListener("click", function (event) {
          event.stopPropagation();
          playButtonClick();
          toggleBuyBonusPanel(false);
          setSelectedBuyBonus(btn.getAttribute("data-buy-bonus-option"));
        });
      });
      autoPresetButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
          playButtonClick();
          applyAutoCount(btn.getAttribute("data-auto-count"));
        });
      });
      if (autoCustomApplyBtn) autoCustomApplyBtn.addEventListener("click", function () {
        playButtonClick();
        applyAutoCount(autoCustomInput ? autoCustomInput.value : 0);
      });
      if (autoCustomInput) autoCustomInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          applyAutoCount(autoCustomInput.value);
        }
      });
      if (autoStopBtn) autoStopBtn.addEventListener("click", function () {
        playButtonClick();
        if (hooks.stopAuto) hooks.stopAuto();
      });
      if (selectedBuyBonusCancelBtn) selectedBuyBonusCancelBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        setSelectedBuyBonus(null);
      });
      if (autoCounterStopBtn) autoCounterStopBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        if (hooks.stopAuto) hooks.stopAuto();
      });
      // Volumen: silencio guardado en OssuaryAudioSettings (tambien silencia
      // los videos con sonido propio y se recuerda al recargar).
      if (window.OssuaryAudioSettings) window.OssuaryAudioSettings.onChange(function (s) {
        syncVolumeButton(s.muted);
      });
      if (volumeBtn) volumeBtn.addEventListener("click", function () {
        playButtonClick();
        if (window.OssuaryAudioSettings) {
          window.OssuaryAudioSettings.toggleMuted();
          return;
        }
        syncVolumeButton(!audioMuted);
        if (window.OssuaryAudio) {
          if (audioMuted && window.OssuaryAudio.muteAll) window.OssuaryAudio.muteAll();
          if (!audioMuted && window.OssuaryAudio.unmuteAll) window.OssuaryAudio.unmuteAll();
        }
      });
      if (turboBtn) turboBtn.addEventListener("click", function () {
        playButtonClick();
        if (hooks.toggleTurbo) hooks.toggleTurbo();
      });
      if (autoToggleBtn) autoToggleBtn.addEventListener("click", function () { playButtonClick(); toggleAutoPanel(); });
      if (resetBtn) resetBtn.addEventListener("click", function () { playButtonClick(); hooks.resetGame(); });
      document.addEventListener("click", function (event) {
        if (cloverOpen && cloverEl && !cloverEl.contains(event.target)) setCloverOpen(false);
        if (autoPanelOpen) {
          if (!(autoPanel && autoPanel.contains(event.target)) && !(autoBtn && autoBtn.contains(event.target))) {
            toggleAutoPanel(false);
          }
        }
        if (betChoicePanelOpen) {
          if (!(betChoicePanel && betChoicePanel.contains(event.target)) && !(coinBtn && coinBtn.contains(event.target))) {
            toggleBetChoicePanel(false);
          }
        }
        if (buyBonusPanelOpen) {
          if (!(buyBonusPanel && buyBonusPanel.contains(event.target)) && !(buyBonusBtn && buyBonusBtn.contains(event.target))) {
            toggleBuyBonusPanel(false);
          }
        }
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === " " || event.key === "Enter") {
          var tag = event.target && event.target.tagName;
          if (isModalOpen() || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
          event.preventDefault();
          runSpinAction();
        }

        if (event.key === "Escape") {
          setCloverOpen(false);
          toggleMenu(false);
          toggleBetChoicePanel(false);
          toggleAutoPanel(false);
          toggleBuyBonusPanel(false);
        }
      });
    }

    return {
      bind: bind,
      update: update,
      toggleMenu: toggleMenu
    };
  }

  window.OssuaryControls = {
    create: createControls
  };
})();
