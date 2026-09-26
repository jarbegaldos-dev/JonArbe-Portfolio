(function () {
  "use strict";

  var element = null;

  function mount() {
    var stage = document.getElementById("slotStage");
    if (!stage) {
      console.warn("[OssuaryFX] eyes-glow-test: #slotStage not found, mount skipped.");
      return;
    }
    element = document.createElement("div");
    element.className = "fx-eyes-glow-test";
    element.setAttribute("aria-hidden", "true");
    stage.appendChild(element);
  }

  function activate() {
    if (!element) {
      return;
    }
    element.classList.add("is-active");
  }

  function deactivate() {
    if (!element) {
      return;
    }
    element.classList.remove("is-active");
  }

  function dispose() {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    element = null;
  }

  window.OssuaryFXRegistry.register({
    id: "eyes-glow-test",
    mount: mount,
    activate: activate,
    deactivate: deactivate,
    dispose: dispose
  });
})();
