(function () {
  "use strict";

  function buildPlayerForType(entry) {
    switch (entry.type) {
      case "css":
        return window.OssuaryFXCssPlayer.create(entry);
      case "trajectory":
        return window.OssuaryFXTrajectoryPlayer.create(entry);
      case "webm-alpha":
        return window.OssuaryFXWebmAlphaPlayer.create(entry);
      case "webgl":
        return window.OssuaryFXWebglPlayer.create(entry);
      default:
        console.warn("[OssuaryFX] Effect '" + entry.id + "': type '" + entry.type + "' has no player implemented yet.");
        return null;
    }
  }

  // Lee window.OSSUARY_FX_EFFECTS y registra automaticamente cada entrada
  // en window.OssuaryFXRegistry. Anadir un efecto nuevo de un tipo ya
  // soportado (por ahora solo "css") no requiere ningun archivo JS nuevo:
  // solo una entrada de configuracion.
  function registerEffectsFromConfig() {
    var entries = window.OSSUARY_FX_EFFECTS || [];
    entries.forEach(function (entry) {
      if (entry.enabled === false) {
        return;
      }
      var player = buildPlayerForType(entry);
      if (!player) {
        return;
      }
      window.OssuaryFXRegistry.register({
        id: entry.id,
        mount: player.mount,
        activate: player.activate,
        deactivate: player.deactivate,
        dispose: player.dispose,
        getElement: player.getElement
      });
    });
  }

  registerEffectsFromConfig();

  window.OssuaryFXEffectFactory = {
    registerEffectsFromConfig: registerEffectsFromConfig
  };
})();
