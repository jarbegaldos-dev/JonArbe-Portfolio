/* DIAGNOSTICO DE AUDIO TEMPORAL — se eliminara tras la prueba fisica.
   Solo se carga con ?audiodiag=1 (cargador inline en el <head> de
   index.html). No cambia nada del portfolio salvo, en este modo:
   1) una etiqueta "DIAG ON" para confirmar que se esta en modo diagnostico;
   2) el iframe de Play Demo recibe game/index.html?audiodiag=1&diag=<ts>,
      una URL distinta en cada apertura: asi el HTML del juego nunca puede
      salir de una cache anterior al diagnostico. */
(function () {
  "use strict";

  var GAME_PATH = /(^|\/)game\/(index\.html)?(\?|#|$)/;
  var DIAG_FLAG = /[?&]audiodiag=1(&|$)/;

  var desc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, "src");
  if (desc && desc.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, "src", {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set: function (value) {
        var url = String(value);
        if (GAME_PATH.test(url) && !DIAG_FLAG.test(url)) {
          url += (url.indexOf("?") === -1 ? "?" : "&") + "audiodiag=1&diag=" + Date.now();
        }
        desc.set.call(this, url);
      }
    });
  }

  function showBadge() {
    var badge = document.createElement("div");
    badge.id = "audioDiagBadge";
    badge.textContent = "DIAG ON";
    badge.style.cssText = "position:fixed;bottom:6px;left:50%;transform:translateX(-50%);" +
      "z-index:2147483647;pointer-events:none;background:#0a7a2a;color:#fff;" +
      "font:700 12px/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;" +
      "padding:5px 9px;border-radius:4px;box-shadow:0 1px 6px rgba(0,0,0,.6);";
    document.body.appendChild(badge);
  }

  if (document.body) showBadge();
  else document.addEventListener("DOMContentLoaded", showBadge);
})();
