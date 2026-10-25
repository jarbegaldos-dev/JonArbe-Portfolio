(function () {
  "use strict";

  // window.OssuaryAudioDebug: API de consola para inspeccionar/forzar el
  // Audio Framework sin tocar gameplay. Mismo espiritu que
  // window.OssuaryBonusDebug / window.OssuaryFXDebug ya existentes.

  function list() {
    return (window.OSSUARY_AUDIO_SOUNDS || []).map(function (def) {
      return { id: def.id, bus: def.bus, category: def.category, enabled: def.enabled !== false };
    });
  }

  function play(id, overrides) {
    return window.OssuaryAudio.play(id, overrides || {});
  }

  function stop(id, fadeMs) {
    return window.OssuaryAudio.stop(id, fadeMs);
  }

  function stopAll() {
    return window.OssuaryAudioEngine.cleanup();
  }

  function mute(busId) {
    return busId ? window.OssuaryAudio.muteBus(busId) : window.OssuaryAudio.muteAll();
  }

  function unmute(busId) {
    return busId ? window.OssuaryAudio.unmuteBus(busId) : window.OssuaryAudio.unmuteAll();
  }

  function channels() {
    return window.OssuaryAudio.listBuses();
  }

  function playing() {
    var snap = window.OssuaryAudio.snapshot();
    return { activeVoices: snap.activeVoices, buses: snap.buses };
  }

  function memory() {
    var snap = window.OssuaryAudio.snapshot();
    return { bufferedSounds: snap.bufferedSounds, failedSounds: snap.failedSounds };
  }

  function performance_() {
    return window.OssuaryAudioPerformanceMonitor
      ? window.OssuaryAudioPerformanceMonitor.report()
      : { error: "performance monitor not loaded" };
  }

  function stats() {
    return window.OssuaryAudio.snapshot().stats;
  }

  function printState() {
    var state = {
      snapshot: window.OssuaryAudio.snapshot(),
      buses: channels(),
      performance: performance_()
    };
    if (typeof console !== "undefined") console.log("[OssuaryAudioDebug] state", state);
    return state;
  }

  function simulateEvent(eventName, payload) {
    return window.OssuaryAudio.trigger(eventName, payload || {});
  }

  window.OssuaryAudioDebug = {
    list: list,
    play: play,
    stop: stop,
    stopAll: stopAll,
    mute: mute,
    unmute: unmute,
    channels: channels,
    playing: playing,
    memory: memory,
    performance: performance_,
    stats: stats,
    printState: printState,
    simulateEvent: simulateEvent
  };
})();
