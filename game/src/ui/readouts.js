(function () {
  "use strict";

  function createReadouts(options) {
    var formatCurrency = options.formatCurrency;
    var balanceReadout = document.getElementById("balanceReadout");
    var betReadout = document.getElementById("betReadout");
    var winReadout = document.getElementById("winReadout");
    // WIN del libro de cuentas, siempre a la vista (game.js#hudWinReadoutState
    // decide { amount, visible }: total del Execution Bonus, de la cadena del
    // cuervo o premio de la tirada; visible=false con el contador BIG WIN).
    // Cuenta hacia arriba desde el valor anterior cada vez que entra un premio.
    // Mientras el contador BIG WIN esta en pantalla el WIN no cambia (no lo
    // destripa); cuando se va, muestra el total.
    // Juego base (kind "base"): al arrancar la tirada el premio vuelve a 0,
    // pero aqui el ultimo se queda a la vista como LAST WIN hasta que llega
    // otro (en autoplay se borraba enseguida). Los bonus (kind "bonus") si
    // empiezan su total en 0.
    var bonusWinPanel = document.getElementById("bonusWinPanel");
    var bonusWinReadout = document.getElementById("bonusWinReadout");
    var winLabel = bonusWinPanel ? bonusWinPanel.querySelector(".hud-ledger__label") : null;
    var winDisplayed = 0;
    var showingLastWin = false;
    var BONUS_WIN_COUNT_MS = 700;
    var bonusWinShown = 0;
    var bonusWinTarget = 0;
    var bonusWinFrame = 0;
    var bonusWinTimer = 0;
    var bigWinWaitTimer = 0;

    function setOutputValue(el, value) {
      if (!el) return;
      el.value = value;
      el.textContent = value;
    }

    function stopBonusWinCount() {
      if (bonusWinFrame) window.cancelAnimationFrame(bonusWinFrame);
      if (bonusWinTimer) window.clearTimeout(bonusWinTimer);
      bonusWinFrame = 0;
      bonusWinTimer = 0;
    }

    function showBonusWinValue(value) {
      bonusWinShown = value;
      winDisplayed = value;
      setOutputValue(bonusWinReadout, formatCurrency(value));
    }

    function setLastWin(on) {
      if (showingLastWin === on) return;
      showingLastWin = on;
      if (winLabel) winLabel.textContent = on ? "LAST WIN" : "WIN";
      if (bonusWinPanel) bonusWinPanel.classList.toggle("is-last-win", on);
    }

    function bumpBonusWinPanel() {
      bonusWinPanel.classList.remove("is-bumped");
      void bonusWinPanel.offsetWidth; // reinicia la animacion CSS
      bonusWinPanel.classList.add("is-bumped");
    }

    function bigWinOnScreen() {
      var overlay = document.querySelector(".big-win-counter");
      if (!overlay) return false;
      return overlay.style.display !== "none" && overlay.style.opacity !== "0";
    }

    function stopBigWinWait() {
      if (bigWinWaitTimer) window.clearInterval(bigWinWaitTimer);
      bigWinWaitTimer = 0;
    }

    // Premio con contador BIG WIN: espera a que el contador salga y se vaya.
    function waitForBigWin(value) {
      stopBigWinWait();
      var seen = bigWinOnScreen();
      var tries = 0;
      bigWinWaitTimer = window.setInterval(function () {
        tries += 1;
        if (bigWinOnScreen()) {
          seen = true;
        } else if (seen) {
          stopBigWinWait();
          setLastWin(false);
          bonusWinTarget = value;
          showBonusWinValue(value);
          return;
        }
        if (tries > 400) stopBigWinWait(); // 2 minutos sin noticias: se deja
      }, 300);
    }

    function updateHudWin(hudWin) {
      if (!bonusWinPanel || !bonusWinReadout) return;
      var value = hudWin && typeof hudWin.amount === "number" && isFinite(hudWin.amount)
        ? hudWin.amount
        : 0;
      bonusWinPanel.hidden = false;
      if (!hudWin || !hudWin.visible) {
        stopBonusWinCount();
        // Si se corta una cuenta a medias (entra el contador BIG WIN mientras
        // el WIN subia, p.ej. tras los importes de un corte del Execution
        // Bonus), el objetivo pasa a ser lo que se ve: si no, al volver
        // creia estar ya en su sitio y el WIN se quedaba congelado a medias.
        bonusWinTarget = bonusWinShown;
        bonusWinPanel.classList.remove("is-bumped");
        if (value > 0) {
          waitForBigWin(value);
          return;
        }
        stopBigWinWait();
        if (hudWin && hudWin.kind === "base" && winDisplayed > 0) {
          // Tirada nueva del juego base: el ultimo premio se queda (LAST WIN)
          // y el siguiente contara desde 0.
          setLastWin(true);
          bonusWinTarget = 0;
          bonusWinShown = 0;
          return;
        }
        setLastWin(false);
        bonusWinTarget = value;
        showBonusWinValue(value);
        return;
      }
      stopBigWinWait();
      setLastWin(false);
      if (value === bonusWinTarget) return;
      stopBonusWinCount();
      if (value < bonusWinTarget) {
        // Bonus nuevo (el acumulado vuelve a 0): sin animacion.
        bonusWinTarget = value;
        showBonusWinValue(value);
        return;
      }
      var from = bonusWinShown;
      var start = window.performance.now();
      bonusWinTarget = value;
      bumpBonusWinPanel();
      function step(now) {
        var t = Math.min(1, (now - start) / BONUS_WIN_COUNT_MS);
        var eased = 1 - Math.pow(1 - t, 3);
        showBonusWinValue(Math.round((from + (value - from) * eased) * 100) / 100);
        bonusWinFrame = t < 1 ? window.requestAnimationFrame(step) : 0;
      }
      bonusWinFrame = window.requestAnimationFrame(step);
      // Red de seguridad (pestana en segundo plano sin rAF): fija el final.
      bonusWinTimer = window.setTimeout(function () {
        stopBonusWinCount();
        showBonusWinValue(bonusWinTarget);
      }, BONUS_WIN_COUNT_MS + 80);
    }

    function update(data) {
      setOutputValue(balanceReadout, formatCurrency(data.balance));
      setOutputValue(betReadout, formatCurrency(data.bet));
      setOutputValue(winReadout, data.bonusLabel || formatCurrency(data.win));
      updateHudWin(data.hudWin);
    }

    return {
      update: update,
      updateHudWin: updateHudWin
    };
  }

  window.OssuaryReadouts = {
    create: createReadouts
  };
})();

