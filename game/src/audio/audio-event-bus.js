(function () {
  "use strict";

  // Bus de eventos pub/sub independiente del de FX (src/fx/fx-event-bus.js).
  // El Audio Framework no debe depender del sistema de FX ni del juego: es
  // infraestructura reutilizable en cualquier slot futura. No sabe nada de
  // sonido, buses ni reglas; solo transporta eventos con nombre + payload.
  function createEventBus() {
    var listeners = {};

    function on(eventName, handler) {
      if (!listeners[eventName]) listeners[eventName] = [];
      listeners[eventName].push(handler);
      return function off() {
        offListener(eventName, handler);
      };
    }

    function offListener(eventName, handler) {
      var handlers = listeners[eventName];
      if (!handlers) return;
      var index = handlers.indexOf(handler);
      if (index !== -1) handlers.splice(index, 1);
    }

    function emit(eventName, payload) {
      var handlers = listeners[eventName];
      if (!handlers || !handlers.length) return;
      handlers.slice().forEach(function (handler) {
        try {
          handler(payload);
        } catch (err) {
          if (typeof console !== "undefined") {
            console.error("[OssuaryAudioEventBus] handler error for " + eventName, err);
          }
        }
      });
    }

    return {
      on: on,
      off: offListener,
      emit: emit
    };
  }

  window.OssuaryAudioEventBus = createEventBus();
})();
