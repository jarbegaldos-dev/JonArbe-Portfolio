(function () {
  "use strict";

  // Capa semantica sobre audio-engine.js. El engine solo sabe de GainNodes
  // por id de string; este modulo anade el concepto de "bus declarado en
  // config" con volumen base, mute, solo y prioridad. Ningun otro modulo
  // debe leer window.OSSUARY_AUDIO_BUSES directamente: todo pasa por aqui.

  var engine = null;
  var busState = {}; // busId -> { baseVolume, muted, solo }
  var soloActive = false;

  function getBusDefs() {
    return window.OSSUARY_AUDIO_BUSES || [];
  }

  function getBusDef(busId) {
    var defs = getBusDefs();
    for (var i = 0; i < defs.length; i++) {
      if (defs[i].id === busId) return defs[i];
    }
    return null;
  }

  function init(engineRef) {
    engine = engineRef;
    getBusDefs().forEach(function (def) {
      busState[def.id] = { baseVolume: def.volume, muted: false, solo: false };
      engine.fadeBusVolume(def.id, def.volume, 0);
    });
  }

  function recomputeEffectiveVolumes() {
    soloActive = Object.keys(busState).some(function (id) { return busState[id].solo; });
    Object.keys(busState).forEach(function (busId) {
      applyEffectiveVolume(busId);
    });
  }

  function applyEffectiveVolume(busId) {
    var entry = busState[busId];
    if (!entry || !engine) return;
    var audible = !entry.muted && (!soloActive || entry.solo);
    var volume = audible ? entry.baseVolume : 0;
    engine.fadeBusVolume(busId, volume, 60);
  }

  function setVolume(busId, volume) {
    if (!busState[busId]) return;
    busState[busId].baseVolume = Math.max(0, Math.min(1, volume));
    applyEffectiveVolume(busId);
  }

  function getVolume(busId) {
    return busState[busId] ? busState[busId].baseVolume : 0;
  }

  function mute(busId) {
    if (!busState[busId]) return;
    busState[busId].muted = true;
    applyEffectiveVolume(busId);
  }

  function unmute(busId) {
    if (!busState[busId]) return;
    busState[busId].muted = false;
    applyEffectiveVolume(busId);
  }

  function muteAll() {
    Object.keys(busState).forEach(mute);
  }

  function unmuteAll() {
    Object.keys(busState).forEach(unmute);
  }

  function setSolo(busId, isSolo) {
    if (!busState[busId]) return;
    busState[busId].solo = Boolean(isSolo);
    recomputeEffectiveVolumes();
  }

  function clearSolo() {
    Object.keys(busState).forEach(function (busId) { busState[busId].solo = false; });
    recomputeEffectiveVolumes();
  }

  function listBuses() {
    return Object.keys(busState).map(function (busId) {
      var def = getBusDef(busId) || {};
      return Object.assign({ id: busId }, busState[busId], { limit: def.limit, priority: def.priority });
    });
  }

  window.OssuaryAudioBusManager = {
    init: init,
    setVolume: setVolume,
    getVolume: getVolume,
    mute: mute,
    unmute: unmute,
    muteAll: muteAll,
    unmuteAll: unmuteAll,
    setSolo: setSolo,
    clearSolo: clearSolo,
    listBuses: listBuses,
    getBusDef: getBusDef
  };
})();
