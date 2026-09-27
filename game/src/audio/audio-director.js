(function () {
  "use strict";

  // Ensambla window.OssuaryAudio: el unico punto de entrada publico que el
  // juego (o la consola de debug) debe usar. Nunca llama directamente a
  // play() desde gameplay (ver FASE 5 de la mision); todo pasa por
  // trigger(event, payload) + reglas declarativas en audio-rules.config.js.
  //
  // Este archivo no contiene ningun "if" que mencione un id de sonido o de
  // bus concreto: toda la logica de negocio vive en datos.

  var bus = window.OssuaryAudioEventBus;
  var engine = window.OssuaryAudioEngine;
  var busManager = window.OssuaryAudioBusManager;

  function getRules() {
    return window.OSSUARY_AUDIO_RULES || [];
  }

  function applyRule(rule, payload) {
    if (rule.play) engine.play(rule.play, rule.params || {});
    if (rule.stop) engine.stop(rule.stop, rule.fadeMs);
    if (rule.stopGroup) engine.stopGroup(rule.stopGroup, rule.fadeMs);
    if (rule.stopChannel) engine.stopChannel(rule.stopChannel, rule.fadeMs);
  }

  function trigger(eventName, payload) {
    bus.emit(eventName, payload);
    getRules().forEach(function (rule) {
      if (rule.event !== eventName) return;
      if (rule.when && !rule.when(payload)) return;
      applyRule(rule, payload);
    });
  }

  busManager.init(engine);

  // Decodificar de entrada los sonidos marcados preload:true para que el
  // primer trigger() (ej. el primer spin) ya tenga el buffer listo y suene
  // a la primera, en vez de perderse mientras se descarga/decodifica.
  engine.preloadAll();

  window.OssuaryAudio = {
    trigger: trigger,
    play: engine.play,
    stop: engine.stop,
    stopGroup: engine.stopGroup,
    stopChannel: engine.stopChannel,
    pauseAll: engine.pauseAll,
    resumeAll: engine.resumeAll,
    duck: engine.duck,
    crossFade: engine.crossFade,
    isReady: engine.isReady,
    preload: engine.preload,
    preloadAll: engine.preloadAll,
    unload: engine.unload,
    cleanup: engine.cleanup,
    setMasterVolume: engine.setMasterVolume,
    getMasterVolume: engine.getMasterVolume,
    setBusVolume: busManager.setVolume,
    getBusVolume: busManager.getVolume,
    muteBus: busManager.mute,
    unmuteBus: busManager.unmute,
    muteAll: busManager.muteAll,
    unmuteAll: busManager.unmuteAll,
    soloBus: busManager.setSolo,
    clearSolo: busManager.clearSolo,
    listBuses: busManager.listBuses,
    snapshot: engine.snapshot
  };

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      engine.pauseAll();
    } else {
      engine.resumeAll();
    }
  });
})();
