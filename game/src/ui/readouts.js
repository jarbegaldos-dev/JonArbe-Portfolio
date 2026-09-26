(function () {
  "use strict";

  function createReadouts(options) {
    var formatCurrency = options.formatCurrency;
    var balanceReadout = document.getElementById("balanceReadout");
    var betReadout = document.getElementById("betReadout");
    var winReadout = document.getElementById("winReadout");

    function setOutputValue(el, value) {
      if (!el) return;
      el.value = value;
      el.textContent = value;
    }

    function update(data) {
      setOutputValue(balanceReadout, formatCurrency(data.balance));
      setOutputValue(betReadout, formatCurrency(data.bet));
      setOutputValue(winReadout, data.bonusLabel || formatCurrency(data.win));
    }

    return {
      update: update
    };
  }

  window.OssuaryReadouts = {
    create: createReadouts
  };
})();

