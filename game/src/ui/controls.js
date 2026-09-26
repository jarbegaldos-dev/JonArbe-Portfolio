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
    var selectedBuyBonusBadge = document.getElementById("selectedBuyBonusBadge");
    var selectedBuyBonusImage = document.getElementById("selectedBuyBonusImage");
    var selectedBuyBonusCancelBtn = document.getElementById("selectedBuyBonusCancelBtn");
    var volumeBtn = document.getElementById("volumeBtn");
    var turboBtn = document.getElementById("turboBtn");
    var autoToggleBtn = document.getElementById("autoToggleBtn");
    var resetBtn = document.getElementById("resetBtn");
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
    }

    function setDisabled(el, disabled) {
      if (el) el.disabled = disabled;
    }

    function toggleAutoPanel(forceOpen) {
      if (!autoPanel) return;
      autoPanelOpen = typeof forceOpen === "boolean" ? forceOpen : !autoPanelOpen;
      autoPanel.hidden = !autoPanelOpen;
      if (autoBtn) autoBtn.classList.toggle("is-open", autoPanelOpen);
    }

    function toggleBuyBonusPanel(forceOpen) {
      if (!buyBonusPanel) return;
      buyBonusPanelOpen = typeof forceOpen === "boolean" ? forceOpen : !buyBonusPanelOpen;
      buyBonusPanel.hidden = !buyBonusPanelOpen;
      if (buyBonusBtn) {
        buyBonusBtn.classList.toggle("is-open", buyBonusPanelOpen);
        buyBonusBtn.setAttribute("aria-expanded", buyBonusPanelOpen ? "true" : "false");
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

    function formatBuyBonusPrice(value) {
      var rounded = Math.round((Number(value) || 0) * 100) / 100;
      if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
      return rounded.toFixed(2).replace(/\.?0+$/, "");
    }

    function buyBonusMultiplier(kind) {
      if (kind === "bonus-game") return 100;
      if (kind === "blade-spin") return 25;
      if (kind === "chest-game") return 21;
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
        var img = selectedButton ? selectedButton.querySelector(".hud-buy-bonus-option__image") : null;
        selectedBuyBonusImage.src = img ? img.currentSrc || img.src : "";
        selectedBuyBonusImage.alt = img ? img.alt : "";
      }
    }

    function runSpinAction() {
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

      setDisabled(spinBtn, data.spinning || data.balance < selectedBuyBonusCost(data));
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
      buyBonusPriceEls.forEach(function (el) {
        var kind = el.getAttribute("data-buy-bonus-price");
        var multiplier = buyBonusMultiplier(kind);
        el.textContent = formatBuyBonusPrice(data.currentBet * multiplier);
      });
      if (volumeBtn) volumeBtn.setAttribute("aria-pressed", audioMuted ? "true" : "false");
    }

    function playButtonClick() {
      if (window.OssuaryAudio) window.OssuaryAudio.trigger("button_click");
    }

    function bind() {
      buildBetChoiceButtons();
      if (menuBtn) menuBtn.addEventListener("click", function () { playButtonClick(); closeFloatingPanels(); });
      if (closeMenuBtn) closeMenuBtn.addEventListener("click", function () { playButtonClick(); toggleMenu(false); });
      if (betUpBtn) betUpBtn.addEventListener("click", function () { playButtonClick(); hooks.changeBet(1); });
      if (betDownBtn) betDownBtn.addEventListener("click", function () { playButtonClick(); hooks.changeBet(-1); });
      if (maxBetBtn) maxBetBtn.addEventListener("click", function () { playButtonClick(); hooks.setMaxBet(); });
      if (coinBtn) coinBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        playButtonClick();
        toggleAutoPanel(false);
        toggleBuyBonusPanel(false);
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
        toggleBuyBonusPanel();
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
      if (volumeBtn) volumeBtn.addEventListener("click", function () {
        playButtonClick();
        audioMuted = !audioMuted;
        if (window.OssuaryAudio) {
          if (audioMuted && window.OssuaryAudio.muteAll) window.OssuaryAudio.muteAll();
          if (!audioMuted && window.OssuaryAudio.unmuteAll) window.OssuaryAudio.unmuteAll();
        }
        volumeBtn.classList.toggle("is-active", audioMuted);
        volumeBtn.setAttribute("aria-pressed", audioMuted ? "true" : "false");
      });
      if (turboBtn) turboBtn.addEventListener("click", function () {
        playButtonClick();
        if (hooks.toggleTurbo) hooks.toggleTurbo();
      });
      if (autoToggleBtn) autoToggleBtn.addEventListener("click", function () { playButtonClick(); toggleAutoPanel(); });
      if (resetBtn) resetBtn.addEventListener("click", function () { playButtonClick(); hooks.resetGame(); });
      document.addEventListener("click", function (event) {
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
          event.preventDefault();
          runSpinAction();
        }

        if (event.key === "Escape") {
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
