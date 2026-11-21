(function () {
  "use strict";

  function createEventBus() {
    var listeners = {};

    function on(eventName, handler) {
      if (!listeners[eventName]) {
        listeners[eventName] = [];
      }
      listeners[eventName].push(handler);
      return function unsubscribe() {
        off(eventName, handler);
      };
    }

    function off(eventName, handler) {
      var handlers = listeners[eventName];
      if (!handlers) {
        return;
      }
      var index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }

    function emit(eventName, payload) {
      var handlers = listeners[eventName];
      if (!handlers || handlers.length === 0) {
        return;
      }
      handlers.slice().forEach(function (handler) {
        handler(payload, eventName);
      });
    }

    return { on: on, off: off, emit: emit };
  }

  window.OssuaryFXEventBus = createEventBus();
})();
