(function () {
  "use strict";

  // Capa de performance: no cambia el comportamiento del engine, solo lo
  // observa. Mantiene contadores ligeros (sin asignar objetos en el hot
  // path de play()) y expone snapshots legibles para debug-panel y para
  // futura telemetria.

  var samples = [];
  var MAX_SAMPLES = 240; // ~ 4 min a 1 muestra/seg

  function sampleNow() {
    var engine = window.OssuaryAudioEngine;
    if (!engine) return null;
    var snap = engine.snapshot();
    var sample = {
      t: window.performance.now(),
      activeVoices: snap.activeVoices,
      globalVoiceCount: snap.globalVoiceCount,
      bufferedSounds: snap.bufferedSounds,
      failedSounds: snap.failedSounds
    };
    samples.push(sample);
    if (samples.length > MAX_SAMPLES) samples.shift();
    return sample;
  }

  function peakActiveVoices() {
    return samples.reduce(function (max, s) { return Math.max(max, s.activeVoices); }, 0);
  }

  function averageActiveVoices() {
    if (!samples.length) return 0;
    var total = samples.reduce(function (sum, s) { return sum + s.activeVoices; }, 0);
    return total / samples.length;
  }

  function report() {
    var engine = window.OssuaryAudioEngine;
    var snap = engine ? engine.snapshot() : {};
    return {
      current: snap,
      peakActiveVoices: peakActiveVoices(),
      averageActiveVoices: Math.round(averageActiveVoices() * 100) / 100,
      sampleCount: samples.length
    };
  }

  window.setInterval(sampleNow, 1000);

  window.OssuaryAudioPerformanceMonitor = {
    sampleNow: sampleNow,
    report: report
  };
})();
