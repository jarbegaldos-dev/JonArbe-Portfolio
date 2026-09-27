(function () {
  "use strict";

  // DIAGNOSTICO DE AUDIO TEMPORAL — se eliminara tras la prueba fisica.
  // Solo se carga si la URL del juego (o la del portfolio que lo embebe)
  // lleva ?audiodiag=1 (ver el cargador inline en game/index.html). Se
  // carga ANTES que cualquier otro script para poder envolver AudioContext,
  // fetch, decodeAudioData, source.start() y el motor de audio. No cambia
  // ninguna logica: cada envoltorio registra y devuelve exactamente lo que
  // devuelve el original. No anade ningun mecanismo de unlock.

  var W = window;
  if (W.__ossDiag) return;

  var IS_TOP = (function () { try { return W.top === W; } catch (e) { return false; } })();
  var FRAME = IS_TOP ? "game-direct" : "game-iframe";
  var T0 = performance.timeOrigin || (Date.now() - performance.now());

  var logs = [];
  var ctx = null;
  var analyser = null;
  var meterSink = null;
  var meterBuf = null;
  var meterPeak = 0;
  var lastMeterCT = null;
  var lastHbCT = null;
  var lastTest = null;
  var engineRef = null;
  var bufName = new WeakMap();
  var abName = new WeakMap();
  var hooked = {};
  var panel = null;
  var statusEl = null;
  var listEl = null;

  // ------------------------------------------------------------ helpers
  function rel() { return performance.now() / 1000; }
  function short(u) {
    if (!u) return "";
    u = String(u);
    if (u.indexOf("blob:") === 0) return "blob";
    if (u.indexOf("data:") === 0) return "data-uri";
    var q = u.split("?")[0];
    return q.substring(q.lastIndexOf("/") + 1);
  }
  function activation(win) {
    try {
      var u = win.navigator.userActivation;
      if (!u) return "n/a";
      return { isActive: u.isActive, hasBeenActive: u.hasBeenActive };
    } catch (e) { return "no-access"; }
  }
  function topActivation() { return IS_TOP ? "same-frame" : activation(W.top); }
  function focus() { try { return document.hasFocus(); } catch (e) { return null; } }
  function cstate() { return ctx ? ctx.state : "no-ctx"; }
  function db(v) { return v > 0 ? Math.round(20 * Math.log(v) / Math.LN10) : "-inf"; }
  function r3(v) { return typeof v === "number" ? Math.round(v * 1000) / 1000 : v; }

  function log(type, data) {
    var e = { t: r3(rel()), type: type, state: cstate(), act: activation(W), d: data || {} };
    logs.push(e);
    renderLine(e);
    return e;
  }

  // ---------------------------------------------------------------- env
  function envSnapshot() {
    var a = document.createElement("audio");
    var fe = null;
    try {
      if (W.frameElement) {
        fe = {
          sandbox: W.frameElement.getAttribute("sandbox"),
          allow: W.frameElement.getAttribute("allow"),
          loading: W.frameElement.getAttribute("loading")
        };
      }
    } catch (e) { fe = "no-access"; }
    var autoplayPolicy = "n/a";
    try {
      var pol = document.permissionsPolicy || document.featurePolicy;
      if (pol && pol.allowsFeature) autoplayPolicy = pol.allowsFeature("autoplay");
    } catch (e) {}
    var topUrl = null;
    try { topUrl = W.top.location.href; } catch (e) { topUrl = "no-access"; }
    var v = document.createElement("video");
    var conn = navigator.connection || null;
    var ua = navigator.userAgent;
    log("ENV", {
      userAgent: ua,
      platform: navigator.platform,
      vendor: navigator.vendor,
      maxTouchPoints: navigator.maxTouchPoints,
      // En iOS todos los navegadores (Safari, Chrome, Firefox) usan WebKit.
      isIOS: /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
      isWebKitEngine: navigator.vendor === "Apple Computer, Inc.",
      screen: W.screen ? W.screen.width + "x" + W.screen.height : "n/a",
      connection: conn ? { effectiveType: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt, saveData: conn.saveData } : "n/a",
      canPlayVideo: {
        webm: v.canPlayType("video/webm"),
        webmVp9: v.canPlayType('video/webm; codecs="vp9"'),
        mp4H264High51: v.canPlayType('video/mp4; codecs="avc1.640033"'),
        mp4Hevc: v.canPlayType('video/mp4; codecs="hvc1"')
      },
      frame: FRAME,
      url: location.href,
      topUrl: topUrl,
      iframeAttrs: fe,
      autoplayPolicyAllows: autoplayPolicy,
      secureContext: W.isSecureContext,
      userActivationAPI: !!navigator.userActivation,
      topActivation: topActivation(),
      audioSessionAPI: !!navigator.audioSession,
      audioSessionType: navigator.audioSession ? navigator.audioSession.type : "n/a",
      hasAudioContext: !!W.AudioContext,
      hasWebkitAudioContext: !!W.webkitAudioContext,
      canPlay: {
        wav: a.canPlayType("audio/wav"),
        mp3: a.canPlayType("audio/mpeg"),
        oggOpus: a.canPlayType('audio/ogg; codecs="opus"')
      },
      viewport: W.innerWidth + "x" + W.innerHeight,
      dpr: W.devicePixelRatio,
      visibility: document.visibilityState,
      hasFocus: focus(),
      deviceMemory: navigator.deviceMemory || "n/a",
      hooks: hooked
    });
  }

  // ------------------------------------------------------- AudioContext
  function ctxInfo(c) {
    return {
      state: c.state,
      sampleRate: c.sampleRate,
      baseLatency: typeof c.baseLatency === "number" ? r3(c.baseLatency) : "n/a",
      outputLatency: typeof c.outputLatency === "number" ? r3(c.outputLatency) : "n/a",
      currentTime: r3(c.currentTime)
    };
  }

  var connectOrig = W.AudioNode ? W.AudioNode.prototype.connect : null;

  // Analyser en paralelo (fan-out) a lo que se conecta a destination, y de
  // ahi a una ganancia 0 -> destination para que el motor lo procese. No
  // altera lo que suena: solo mide la senal que LLEGA a destination.
  function setupMeter(c) {
    if (analyser || !c.createAnalyser || !connectOrig) return;
    try {
      analyser = c.createAnalyser();
      analyser.fftSize = 2048;
      analyser.__ossInternal = true;
      meterSink = c.createGain();
      meterSink.gain.value = 0;
      meterSink.__ossInternal = true;
      connectOrig.call(analyser, meterSink);
      connectOrig.call(meterSink, c.destination);
      meterBuf = new Float32Array(analyser.fftSize);
    } catch (e) {
      log("DIAG-ERROR", { where: "setupMeter", err: String(e) });
    }
  }

  function wrapContext(c, how) {
    if (!c || c.__ossWrapped) return;
    c.__ossWrapped = true;
    ctx = c;
    var info = ctxInfo(c);
    info.how = how;
    info.hasFocus = focus();
    info.topActivation = topActivation();
    info.destinationChannels = c.destination ? c.destination.maxChannelCount : "n/a";
    log("CTX-CREATED", info);
    var prevState = c.state;
    try {
      // Cualquier transicion: running / suspended / interrupted (WebKit) /
      // closed, con el estado anterior para ver la secuencia completa.
      c.addEventListener("statechange", function () {
        var from = prevState;
        prevState = c.state;
        log("CTX-STATECHANGE", {
          from: from,
          newState: c.state,
          currentTime: r3(c.currentTime),
          baseLatency: typeof c.baseLatency === "number" ? r3(c.baseLatency) : "n/a",
          outputLatency: typeof c.outputLatency === "number" ? r3(c.outputLatency) : "n/a",
          hasFocus: focus(),
          visibility: document.visibilityState
        });
        updateStatus();
      });
    } catch (e) {}

    var resumeOrig = c.resume;
    var seq = 0;
    if (typeof resumeOrig === "function") {
      c.resume = function () {
        var id = ++seq;
        log("RESUME-CALLED", { id: id, stateBefore: c.state, hasFocus: focus(), visibility: document.visibilityState, topActivation: topActivation() });
        var p;
        try {
          p = resumeOrig.apply(c, arguments);
        } catch (err) {
          log("RESUME-THREW", { id: id, err: String(err) });
          throw err;
        }
        var isPromise = !!(p && typeof p.then === "function");
        var settled = false;
        log("RESUME-RETURNED", { id: id, returnsPromise: isPromise, stateSync: c.state });
        if (isPromise) {
          p.then(function () {
            settled = true;
            log("RESUME-RESOLVED", { id: id, stateAfter: c.state, currentTime: r3(c.currentTime) });
          }, function (err) {
            settled = true;
            log("RESUME-REJECTED", { id: id, stateAfter: c.state, err: err ? (err.name + ": " + err.message) : String(err) });
          });
          setTimeout(function () {
            if (!settled) log("RESUME-STILL-PENDING-3s", { id: id, stateNow: c.state });
          }, 3000);
        }
        return p;
      };
    }
    var suspendOrig = c.suspend;
    if (typeof suspendOrig === "function") {
      c.suspend = function () {
        log("SUSPEND-CALLED", { stateBefore: c.state, visibility: document.visibilityState });
        return suspendOrig.apply(c, arguments);
      };
    }
    setupMeter(c);
  }

  function hookCtor(name) {
    var Orig = W[name];
    if (!Orig || Orig.__ossWrapped) return;
    var Wrapped = function (opts) {
      var c = arguments.length ? new Orig(opts) : new Orig();
      wrapContext(c, "new " + name);
      return c;
    };
    Wrapped.prototype = Orig.prototype;
    Wrapped.__ossWrapped = true;
    try { Object.setPrototypeOf(Wrapped, Orig); } catch (e) {}
    W[name] = Wrapped;
    hooked[name] = true;
  }

  function hookConnect() {
    if (!connectOrig) return;
    W.AudioNode.prototype.connect = function (dest) {
      var r = connectOrig.apply(this, arguments);
      try {
        if (!this.__ossInternal && dest && this.context && dest === this.context.destination) {
          log("CONNECT-TO-DESTINATION", {
            node: (this.constructor && this.constructor.name) || "?",
            gainValue: this.gain ? this.gain.value : null
          });
          if (!this.context.__ossWrapped) wrapContext(this.context, "seen-at-connect");
          if (analyser && analyser.context === this.context) connectOrig.call(this, analyser);
        }
      } catch (e) {}
      return r;
    };
    hooked.connect = true;
  }

  function hookSourceStart() {
    var P = W.AudioBufferSourceNode && W.AudioBufferSourceNode.prototype;
    if (!P || !P.start) return;
    var startOrig = P.start;
    P.start = function (when, offset) {
      var c = this.context;
      var info = {
        buffer: (this.buffer && bufName.get(this.buffer)) || (this.buffer ? "buffer " + this.buffer.duration.toFixed(2) + "s" : "NO-BUFFER"),
        bufferPresent: !!this.buffer,
        whenRelative: typeof when === "number" ? r3(when - c.currentTime) : 0,
        offset: offset || 0,
        loop: this.loop,
        ctxState: c.state,
        currentTime: r3(c.currentTime)
      };
      try {
        var r = startOrig.apply(this, arguments);
        info.ok = true;
        log("SOURCE-START", info);
        return r;
      } catch (err) {
        info.ok = false;
        info.err = String(err);
        log("SOURCE-START", info);
        throw err;
      }
    };
    hooked.sourceStart = true;
  }

  var fetchOrig = W.fetch ? W.fetch.bind(W) : null;
  function hookFetch() {
    if (!fetchOrig) return;
    W.fetch = function (input) {
      var url = typeof input === "string" ? input : (input && input.url) || String(input);
      if (!/\.(wav|mp3|ogg|m4a|aac)(\?|$)/i.test(url)) return fetchOrig.apply(W, arguments);
      var name = short(url);
      var st = performance.now();
      return fetchOrig.apply(W, arguments).then(function (resp) {
        if (!resp.ok) log("FETCH-HTTP-ERROR", { url: name, status: resp.status });
        var abOrig = resp.arrayBuffer;
        resp.arrayBuffer = function () {
          return abOrig.call(resp).then(function (ab) {
            abName.set(ab, name);
            log("FETCH-OK", { url: name, bytes: ab.byteLength, ms: Math.round(performance.now() - st) });
            return ab;
          }, function (err) {
            log("FETCH-BODY-ERROR", { url: name, err: String(err) });
            throw err;
          });
        };
        return resp;
      }, function (err) {
        log("FETCH-ERROR", { url: name, err: String(err), ms: Math.round(performance.now() - st) });
        throw err;
      });
    };
    hooked.fetch = true;
  }

  function hookDecode() {
    var Ctor = W.AudioContext || W.webkitAudioContext;
    if (!Ctor) return;
    var owner = Ctor.prototype;
    while (owner && !Object.prototype.hasOwnProperty.call(owner, "decodeAudioData")) owner = Object.getPrototypeOf(owner);
    if (!owner) return;
    var decOrig = owner.decodeAudioData;
    owner.decodeAudioData = function (ab, ok, fail) {
      var name = (ab && abName.get(ab)) || "?";
      var st = performance.now();
      function onOk(buf) {
        if (buf) bufName.set(buf, name);
        log("DECODE-OK", { url: name, ms: Math.round(performance.now() - st), duration: buf ? r3(buf.duration) : null, sampleRate: buf ? buf.sampleRate : null });
      }
      function onFail(err) {
        log("DECODE-FAILED", { url: name, ms: Math.round(performance.now() - st), err: err ? ((err.name || "") + ": " + (err.message || err)) : "null" });
      }
      var args = Array.prototype.slice.call(arguments);
      if (typeof ok === "function") args[1] = function (buf) { onOk(buf); return ok.apply(this, arguments); };
      if (typeof fail === "function") args[2] = function (err) { onFail(err); return fail.apply(this, arguments); };
      var p = decOrig.apply(this, args);
      if (p && typeof p.then === "function") {
        p.then(function (buf) { if (typeof ok !== "function") onOk(buf); },
               function (err) { if (typeof fail !== "function") onFail(err); });
      }
      return p;
    };
    hooked.decode = true;
  }

  // <video>/<audio>: todos los que entran en el DOM (MutationObserver, p.ej.
  // los fondos de escena con autoplay que nunca llaman a play()) y todos los
  // que llaman a play() (incluidos new Audio() fuera del DOM). Cada evento se
  // registra como maximo MEDIA_EVENT_LIMIT veces por elemento para que los
  // bucles no inunden el log.
  var MEDIA_EVENT_LIMIT = 3;
  var MEDIA_EVENTS = ["canplay", "loadeddata", "playing", "pause", "ended", "error"];
  var mediaSeq = 0;

  function mediaState(el) {
    var err = el.error;
    return {
      media: el.__ossMediaId,
      tag: el.tagName,
      cls: typeof el.className === "string" ? el.className.split(" ")[0] : "",
      src: el.getAttribute("src") || "",
      currentSrc: short(el.currentSrc),
      readyState: el.readyState,
      networkState: el.networkState,
      paused: el.paused,
      muted: el.muted,
      volume: el.volume,
      autoplay: el.autoplay,
      loop: el.loop,
      preload: el.preload,
      videoSize: el.tagName === "VIDEO" ? el.videoWidth + "x" + el.videoHeight : undefined,
      error: err ? { code: err.code, message: err.message || "" } : null,
      test: el.__ossTest || null
    };
  }
  function countOnce(el, key) {
    el.__ossEvtCount = el.__ossEvtCount || {};
    el.__ossEvtCount[key] = (el.__ossEvtCount[key] || 0) + 1;
    return el.__ossEvtCount[key] <= MEDIA_EVENT_LIMIT;
  }
  function trackMedia(el, how) {
    if (!el || el.__ossMediaId) return;
    el.__ossMediaId = "m" + (++mediaSeq);
    var s = mediaState(el);
    s.foundBy = how;
    log("MEDIA-FOUND", s);
    MEDIA_EVENTS.forEach(function (evt) {
      el.addEventListener(evt, function () {
        if (countOnce(el, evt)) log("MEDIA-" + evt.toUpperCase(), mediaState(el));
      });
    });
  }
  function scanMedia(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === "VIDEO" || node.tagName === "AUDIO") trackMedia(node, "dom");
    if (node.querySelectorAll) {
      Array.prototype.forEach.call(node.querySelectorAll("video, audio"), function (el) { trackMedia(el, "dom"); });
    }
  }
  function hookMedia() {
    var P = W.HTMLMediaElement && W.HTMLMediaElement.prototype;
    if (!P || !P.play) return;
    var playOrig = P.play;
    P.play = function () {
      var el = this;
      trackMedia(el, "play()");
      var logIt = countOnce(el, "play-call");
      if (logIt) log("MEDIA-PLAY-CALLED", mediaState(el));
      var p = playOrig.apply(this, arguments);
      if (p && typeof p.then === "function") {
        p.then(function () {
          if (logIt) log("MEDIA-PLAY-RESOLVED", mediaState(el));
        }, function (err) {
          // Los rechazos se registran siempre, sin limite.
          var s = mediaState(el);
          s.rejection = err ? err.name + ": " + err.message : "?";
          log("MEDIA-PLAY-REJECTED", s);
        });
      }
      return p;
    };
    if (W.MutationObserver) {
      new MutationObserver(function (records) {
        records.forEach(function (r) { Array.prototype.forEach.call(r.addedNodes, scanMedia); });
      }).observe(document.documentElement, { childList: true, subtree: true });
    }
    hooked.media = true;
  }
  function mediaSnapshot(label) {
    var list = Array.prototype.map.call(document.querySelectorAll("video, audio"), function (el) {
      trackMedia(el, "snapshot");
      var s = mediaState(el);
      var b = el.getBoundingClientRect();
      s.box = Math.round(b.width) + "x" + Math.round(b.height);
      s.hidden = !!el.closest("[hidden]") || getComputedStyle(el).display === "none";
      return s;
    });
    log("MEDIA-SNAPSHOT", { label: label, count: list.length, elements: list });
  }

  // ------------------------------------------------------ engine hooks
  function soundDef(id) {
    var list = W.OSSUARY_AUDIO_SOUNDS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function gains() {
    var out = { masterGain: "n/a" };
    if (!engineRef) return out;
    try {
      out.masterGain = r3(engineRef.getMasterVolume());
      var existing = engineRef.snapshot().buses;
      ["MASTER", "MUSIC", "REELS", "SYMBOLS", "BONUS", "BIGWIN"].forEach(function (id) {
        if (existing.indexOf(id) !== -1) out[id] = r3(engineRef.getBusGain(id).gain.value);
      });
    } catch (e) {}
    return out;
  }
  function buffersNotReady() {
    if (!engineRef || !engineRef.isReady) return "n/a";
    return (W.OSSUARY_AUDIO_SOUNDS || []).filter(function (d) {
      return d.enabled !== false && d.preload && !engineRef.isReady(d.id);
    }).map(function (d) { return d.id; });
  }

  function wrapEngine(v) {
    if (!v || v.__ossWrapped) return;
    v.__ossWrapped = true;
    engineRef = v;
    var playOrig = v.play;
    v.play = function (soundId, overrides) {
      var ready = v.isReady ? v.isReady(soundId) : "n/a";
      var voice = playOrig.apply(this, arguments);
      var reason = "ok";
      if (!voice) {
        var def = soundDef(soundId);
        if (!def) reason = "no-def";
        else if (def.enabled === false) reason = "DISABLED-IN-CONFIG";
        else if (ready === false) reason = "BUFFER-NOT-READY";
        else reason = "cooldown/voice-limit/ctx";
      }
      var def2 = soundDef(soundId);
      var info = { id: soundId, bufferReady: ready, returned: voice ? "voice" : "null", reason: reason, fadeInMs: overrides && overrides.fadeInMs };
      if (voice) {
        info.bus = voice.bus;
        info.sourceGainTarget = overrides && typeof overrides.volume === "number" ? overrides.volume : (def2 && typeof def2.volume === "number" ? def2.volume : 1);
        try {
          info.busGain = r3(v.getBusGain(voice.bus).gain.value);
          info.masterGain = r3(v.getMasterVolume());
        } catch (e) {}
      }
      log("ENGINE-PLAY", info);
      // Ganancia REAL del source (voiceGain) ya aplicada: a los 400ms para
      // SFX (3 primeras veces por sonido) y a los 1.5s para musica (tras el
      // fade-in). Con el contexto suspendido se queda en 0.
      var isMusic = def2 && def2.category === "music";
      if (voice && (isMusic || countOnce(v, "gaincheck-" + soundId))) {
        setTimeout(function () {
          log("SOURCE-GAIN-CHECK", { id: soundId, after: isMusic ? "1.5s" : "400ms", sourceGain: r3(voice.gainNode.gain.value), ctxState: cstate(), gains: gains() });
        }, isMusic ? 1500 : 400);
      }
      return voice;
    };
    var unlockOrig = v.unlock;
    v.unlock = function () {
      var before = cstate();
      var r = unlockOrig.apply(this, arguments);
      log("ENGINE-UNLOCK", { caller: "controls.js playButtonClick", stateBefore: before, stateAfterSync: cstate() });
      return r;
    };
    var preloadOrig = v.preload;
    v.preload = function (soundId) {
      log("ENGINE-PRELOAD-EXTERNAL", { id: soundId, bufferReady: v.isReady ? v.isReady(soundId) : "n/a" });
      return preloadOrig.apply(this, arguments);
    };
    var stopGroupOrig = v.stopGroup;
    v.stopGroup = function (cat, fadeMs) {
      if (cat === "music") log("ENGINE-STOPGROUP", { category: cat, fadeMs: fadeMs });
      return stopGroupOrig.apply(this, arguments);
    };
    ["pauseAll", "resumeAll"].forEach(function (k) {
      var o = v[k];
      v[k] = function () { log("ENGINE-" + k.toUpperCase(), { visibility: document.visibilityState }); return o.apply(this, arguments); };
    });
    hooked.engine = true;
  }
  function wrapFacade(v) {
    if (!v || v.__ossWrapped) return;
    v.__ossWrapped = true;
    var trigOrig = v.trigger;
    v.trigger = function (eventName) {
      log("TRIGGER", { event: eventName });
      return trigOrig.apply(this, arguments);
    };
    hooked.facade = true;
  }
  function defineTrap(name, onSet) {
    var store;
    try {
      Object.defineProperty(W, name, {
        configurable: true,
        enumerable: true,
        get: function () { return store; },
        set: function (v) {
          store = v;
          try { onSet(v); } catch (e) { log("DIAG-ERROR", { where: "trap " + name, err: String(e) }); }
        }
      });
    } catch (e) {
      log("DIAG-ERROR", { where: "defineTrap " + name, err: String(e) });
    }
  }

  // ------------------------------------------------------------ gestures
  function describe(t) {
    if (!t || !t.tagName) return String(t);
    var s = t.tagName.toLowerCase();
    if (t.id) s += "#" + t.id;
    else if (t.className && typeof t.className === "string") s += "." + t.className.split(" ")[0];
    return s;
  }
  function inPanel(t) { return !!(panel && t && panel.contains(t)); }
  ["pointerdown", "touchstart", "touchend", "click", "keydown"].forEach(function (type) {
    document.addEventListener(type, function (e) {
      log("GESTURE", { type: type, target: describe(e.target), isTrusted: e.isTrusted, hasFocus: focus(), onDiagPanel: inPanel(e.target), topActivation: topActivation() });
      if (type === "touchend" || type === "click") {
        setTimeout(function () { log("GESTURE-AFTER", { type: type, ctxStateAfterHandlers: cstate() }); }, 0);
      }
    }, { capture: true, passive: true });
  });
  document.addEventListener("visibilitychange", function () { log("VISIBILITY", { visibility: document.visibilityState }); });
  W.addEventListener("pagehide", function () { log("PAGEHIDE", {}); });

  // --------------------------------------------------------------- meter
  function readPeak(an, buf) {
    try {
      an.getFloatTimeDomainData(buf);
      var peak = 0;
      for (var i = 0; i < buf.length; i++) {
        var a = Math.abs(buf[i]);
        if (a > peak) peak = a;
      }
      return peak;
    } catch (e) { return null; }
  }
  var measurements = [];
  // Analyser propio de un test: se conecta a la ganancia 0 del medidor para
  // que el motor lo procese sin que suene nada extra.
  function testAnalyser(fromNode) {
    var an = ctx.createAnalyser();
    an.fftSize = 2048;
    connectOrig.call(fromNode, an);
    if (meterSink) connectOrig.call(an, meterSink);
    return an;
  }
  function measure(testId, an, buf, windowMs, extra) {
    measurements.push({ id: testId, an: an, buf: buf, until: performance.now() + windowMs, peak: 0, outPeak: 0, extra: extra || {} });
  }

  var tick = 0;
  var lastSlowJson = null;
  setInterval(function () {
    var live = ctx && ctx.state === "running" && ctx.currentTime !== lastMeterCT;
    if (ctx) lastMeterCT = ctx.currentTime;
    var p = live && analyser ? readPeak(analyser, meterBuf) : null;
    if (p !== null && p > meterPeak) meterPeak = p;
    measurements = measurements.filter(function (m) {
      if (live) {
        var tp = m.an ? readPeak(m.an, m.buf) : null;
        if (tp !== null && tp > m.peak) m.peak = tp;
        if (p !== null && p > m.outPeak) m.outPeak = p;
      }
      if (performance.now() < m.until) return true;
      var d = {
        test: m.id,
        testSignalPeakDb: m.an ? db(m.peak) : "n/a (no pasa por Web Audio)",
        signalAtDestinationPeakDb: db(m.outPeak),
        ctxState: cstate(),
        currentTime: ctx ? r3(ctx.currentTime) : null
      };
      for (var k in m.extra) d[k] = m.extra[k];
      log("TEST-SIGNAL", d);
      return false;
    });
    updateStatus();
    tick++;
    if (tick % 10 === 0) {
      var ct = ctx ? ctx.currentTime : null;
      var snap = null;
      try { snap = engineRef ? engineRef.snapshot() : null; } catch (e) {}
      var hb = {
        ctxState: cstate(),
        currentTime: ct !== null ? r3(ct) : null,
        clockAdvancing: ct !== null && lastHbCT !== null ? ct > lastHbCT : null,
        signalAtDestinationPeakDb: db(meterPeak),
        hasFocus: focus(),
        visibility: document.visibilityState,
        musicNormalReady: engineRef && engineRef.isReady ? engineRef.isReady("music-normal") : "n/a",
        activeVoices: snap ? snap.activeVoices : null,
        buffersOk: snap ? snap.bufferedSounds : null,
        buffersFailed: snap ? snap.failedSounds : null
      };
      // Ganancias, latencias y audioSession solo cuando cambian (o cada
      // ~30s), para que el log sea manejable al copiarlo desde el movil.
      var slow = {
        gains: gains(),
        baseLatency: ctx && typeof ctx.baseLatency === "number" ? r3(ctx.baseLatency) : "n/a",
        outputLatency: ctx && typeof ctx.outputLatency === "number" ? r3(ctx.outputLatency) : "n/a",
        audioSessionType: navigator.audioSession ? navigator.audioSession.type : "n/a"
      };
      var slowJson = JSON.stringify(slow);
      if (slowJson !== lastSlowJson || tick % 150 === 0) {
        for (var k in slow) hb[k] = slow[k];
        lastSlowJson = slowJson;
      }
      log("HB", hb);
      lastHbCT = ct;
      meterPeak = 0;
    }
  }, 200);

  // --------------------------------------------------------------- tests
  function makeWav(freq, seconds, amp) {
    var sr = 44100, n = Math.floor(sr * seconds);
    var buf = new ArrayBuffer(44 + n * 2);
    var dv = new DataView(buf);
    function str(o, s) { for (var i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); }
    str(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
    dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true);
    dv.setUint16(34, 16, true); str(36, "data"); dv.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) {
      var env = Math.min(1, i / 400, (n - i) / 400);
      dv.setInt16(44 + i * 2, amp ? Math.round(Math.sin(2 * Math.PI * freq * i / sr) * amp * env * 32767) : 0, true);
    }
    return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  }
  var beepUrl = null, silentUrl = null;

  // Oscilador 880Hz 0.6s directo a destination (sin buses del juego), con
  // un analyser propio para medir SOLO el pitido.
  function beepWebAudio(testId) {
    lastTest = testId;
    if (!ctx) { log("TEST-START", { test: testId, result: "NO-AUDIOCONTEXT" }); return; }
    var info = ctxInfo(ctx);
    info.test = testId;
    info.topActivation = topActivation();
    info.what = "oscilador 880Hz 0.6s -> destination (Web Audio, sin buses del juego)";
    log("TEST-START", info);
    try {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.value = 0.3;
      o.connect(g);
      g.connect(ctx.destination);
      var an = testAnalyser(g);
      o.start();
      o.stop(ctx.currentTime + 0.6);
      measure(testId, an, new Float32Array(2048), 1200);
    } catch (e) {
      log("TEST-ERROR", { test: testId, err: String(e) });
    }
  }
  function testT1() { beepWebAudio("T1"); }
  function testT2() {
    lastTest = "T2";
    if (!beepUrl) beepUrl = makeWav(880, 0.6, 0.3);
    var a = new Audio(beepUrl);
    a.__ossTest = "T2";
    log("TEST-START", { test: "T2", what: "<audio> 880Hz 0.6s (HTMLMediaElement, NO Web Audio)", topActivation: topActivation() });
    a.play();
    measure("T2", null, null, 1200);
  }
  function testT3() {
    lastTest = "T3";
    var api = W.OssuaryAudio;
    if (!api) { log("TEST-START", { test: "T3", result: "NO-OssuaryAudio" }); return; }
    log("TEST-START", { test: "T3", what: "music-normal via motor del juego (buffer + buses + master)", bufferReady: api.isReady ? api.isReady("music-normal") : "n/a", gains: gains(), topActivation: topActivation() });
    var voice = api.play("music-normal", { fadeInMs: 0 });
    var an = null, buf = null;
    if (voice && ctx) {
      try {
        an = testAnalyser(voice.gainNode);
        buf = new Float32Array(2048);
      } catch (e) { an = null; }
    }
    measure("T3", an, buf, 2000, { voiceReturned: !!voice });
  }
  function testStopMusic() {
    if (W.OssuaryAudio) W.OssuaryAudio.stopGroup("music", 150);
    log("TEST-STOP-MUSIC", {});
  }
  // resume() manual SOLO al pulsar el boton (test, no mecanismo automatico):
  // el resultado sale en RESUME-CALLED / RESOLVED / REJECTED.
  function testT4() {
    lastTest = "T4";
    if (!ctx) { log("TEST-START", { test: "T4", result: "NO-AUDIOCONTEXT" }); return; }
    log("TEST-START", { test: "T4", what: "AudioContext.resume() manual", stateBefore: ctx.state, topActivation: topActivation() });
    ctx.resume();
  }
  function testT5() {
    lastTest = "T5";
    if (!navigator.audioSession) { log("TEST-START", { test: "T5", result: "navigator.audioSession NO DISPONIBLE" }); return; }
    var before = navigator.audioSession.type;
    try {
      navigator.audioSession.type = "playback";
    } catch (e) {
      log("TEST-ERROR", { test: "T5", err: String(e) });
      return;
    }
    log("TEST-START", { test: "T5", what: "EXPERIMENTO en memoria: audioSession.type = playback (repetir T1 despues)", before: before, after: navigator.audioSession.type });
  }
  // <audio> silencioso en bucle y, a los 400ms, el mismo pitido Web Audio
  // que T1: compara Web Audio con y sin un elemento multimedia sonando.
  function testT6() {
    lastTest = "T6";
    if (!silentUrl) silentUrl = makeWav(0, 1, 0);
    var a = new Audio(silentUrl);
    a.loop = true;
    a.__ossTest = "T6-silent-audio";
    log("TEST-START", { test: "T6", what: "<audio> silencioso en bucle + a los 400ms pitido Web Audio (como T1)", topActivation: topActivation() });
    a.play();
    setTimeout(function () { beepWebAudio("T6"); }, 400);
    setTimeout(function () { a.pause(); }, 2600);
  }
  function mark(what, value) {
    log("USER-MARK", { what: what, value: value, lastTest: lastTest });
  }

  // ------------------------------------------------------------- export
  function exportText() {
    var head = [
      "OSSUARY AUDIO DIAG | frame=" + FRAME + " | entries=" + logs.length + " | exported=" + new Date().toISOString(),
      "cols: t(s desde carga) | TYPE | AudioContext.state | userActivation(isActive,hasBeenActive) | datos"
    ];
    return head.concat(logs.map(function (e) {
      var a = e.act;
      var act = a && typeof a === "object" ? "isActive=" + (a.isActive ? 1 : 0) + ",hasBeenActive=" + (a.hasBeenActive ? 1 : 0) : "userActivation=" + a;
      return e.t.toFixed(3) + " | " + e.type + " | " + e.state + " | " + act + " | " + JSON.stringify(e.d);
    })).join("\n");
  }
  // Muestra el log en un textarea (seleccionable a mano) y ademas intenta
  // copiarlo al portapapeles. El iframe va con sandbox sin allow-modals ni
  // allow-downloads, por eso la confirmacion es visual y no un alert().
  var logBox = null;
  function showLogBox(text) {
    if (!logBox) {
      logBox = document.createElement("textarea");
      logBox.readOnly = true;
      logBox.style.cssText = "display:block;width:100%;height:110px;font-size:10px;";
      panel.appendChild(logBox);
    }
    logBox.value = text;
    logBox.focus();
    logBox.select();
    try { logBox.setSelectionRange(0, text.length); } catch (e) {}
  }
  function copyLog(button) {
    var text = exportText();
    function done(method, ok) {
      log("LOG-COPIED", { method: method, ok: ok, chars: text.length });
      button.textContent = ok ? "Copiado ✔ (" + logs.length + ")" : "Copia manual ↓";
    }
    function fallback() {
      showLogBox(text);
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      done("textarea", ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done("clipboard", true); }, fallback);
    } else {
      fallback();
    }
  }
  function downloadLog() {
    var url = URL.createObjectURL(new Blob([exportText()], { type: "text/plain" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = "ossuary-audio-diag-" + Date.now() + ".txt";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 2000);
  }

  // --------------------------------------------------------------- panel
  // Los toques en el panel NO llegan a los listeners del juego (se corta
  // la propagacion), asi que el panel no desbloquea audio por su cuenta.
  function stopProp(e) { e.stopPropagation(); }
  function btn(label, fn, color) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = "font:600 11px/1.2 system-ui,sans-serif;margin:2px;padding:7px 8px;border-radius:5px;border:1px solid #555;background:" + (color || "#222") + ";color:#fff;";
    b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
    return b;
  }
  function row(children) {
    var r = document.createElement("div");
    r.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;";
    children.forEach(function (c) { r.appendChild(c); });
    return r;
  }
  function label(text) {
    var s = document.createElement("span");
    s.textContent = text;
    s.style.cssText = "margin:0 4px;color:#8c8;";
    return s;
  }
  function buildPanel() {
    if (panel || !document.body) return;
    panel = document.createElement("div");
    panel.id = "ossAudioDiag";
    // Debajo del indicador rosa del cargador (game/index.html).
    panel.style.cssText = "position:fixed;left:4px;top:calc(env(safe-area-inset-top, 0px) + 34px);z-index:2147483647;max-width:calc(100vw - 8px);" +
      "background:rgba(0,0,0,.88);color:#9f9;font:10px/1.3 ui-monospace,Menlo,monospace;border:1px solid #3a3;" +
      "border-radius:6px;padding:3px 5px;";
    ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup", "click", "keydown"].forEach(function (t) {
      panel.addEventListener(t, stopProp, false);
    });
    statusEl = document.createElement("span");
    statusEl.style.cssText = "white-space:pre-wrap;";
    var body = document.createElement("div");
    body.style.display = "none";
    var toggle = btn("DIAG ▾", function () {
      body.style.display = body.style.display === "none" ? "block" : "none";
    }, "#063");
    var head = row([toggle, statusEl]);
    panel.appendChild(head);
    body.appendChild(row([label("Flujo natural:"),
      btn("✔ música", function () { mark("music-natural", "heard"); }, "#063"),
      btn("✘ música", function () { mark("music-natural", "NOT-heard"); }, "#700"),
      btn("✔ SFX", function () { mark("sfx-natural", "heard"); }, "#063"),
      btn("✘ SFX", function () { mark("sfx-natural", "NOT-heard"); }, "#700")
    ]));
    body.appendChild(row([label("Tests:"),
      btn("T1 WebAudio", testT1, "#1b3a6b"),
      btn("T2 <audio>", testT2, "#1b3a6b"),
      btn("T3 música", testT3, "#1b3a6b"),
      btn("T4 resume()", testT4, "#1b3a6b"),
      btn("T5 audioSession", testT5, "#5a3a00"),
      btn("T6 WA+<audio>", testT6, "#1b3a6b"),
      btn("■ stop música", testStopMusic),
      btn("Media", function () { mediaSnapshot("manual"); }, "#333")
    ]));
    body.appendChild(row([label("¿Oyes el último test?"),
      btn("✔ lo oigo", function () { mark("test", "heard"); }, "#063"),
      btn("✘ NO lo oigo", function () { mark("test", "NOT-heard"); }, "#700")
    ]));
    body.appendChild(row([label("iPhone:"),
      btn("silencio ACTIVADO", function () { mark("silent-mode", "ON"); }, "#444"),
      btn("silencio DESACTIVADO", function () { mark("silent-mode", "OFF"); }, "#444")
    ]));
    var copyBtn = btn("Copiar log", function () { copyLog(copyBtn); }, "#333");
    body.appendChild(row([
      copyBtn,
      btn("Mostrar log", function () { showLogBox(exportText()); }, "#333"),
      btn("Descargar log", downloadLog, "#333")
    ]));
    listEl = document.createElement("div");
    listEl.style.cssText = "max-height:130px;overflow:auto;font-size:10px;color:#cfc;margin-top:3px;";
    body.appendChild(listEl);
    panel.appendChild(body);
    document.body.appendChild(panel);
    updateStatus();
    if (W.__ossDiagStatus) W.__ossDiagStatus("script OK · panel DIAG listo (pulsa DIAG ▾)");
  }
  function updateStatus() {
    if (!statusEl) return;
    var a = activation(W);
    statusEl.textContent = " ctx:" + cstate() + " t=" + (ctx ? ctx.currentTime.toFixed(1) : "-") +
      " out:" + db(meterPeak) + "dB act:" + (typeof a === "object" ? (a.isActive ? 1 : 0) + "/" + (a.hasBeenActive ? 1 : 0) : a) +
      " n=" + logs.length;
  }
  var SHOWN = /CTX|RESUME|DECODE-FAILED|FETCH-.*ERROR|ENGINE-PLAY|SOURCE-START|MEDIA|TEST|USER-MARK|GESTURE-AFTER|UNLOCK|DIAG-ERROR/;
  function renderLine(e) {
    if (!listEl || !SHOWN.test(e.type)) return;
    var d = e.d || {};
    var line = document.createElement("div");
    line.textContent = e.t.toFixed(1) + " [" + e.state + "] " + e.type + " " +
      (d.test || d.id || d.buffer || d.url || d.src || d.what || d.newState || "") +
      (d.returned ? " →" + d.returned + "/" + d.reason : "") +
      (d.testSignalPeakDb !== undefined ? " test:" + d.testSignalPeakDb + "dB dest:" + d.signalAtDestinationPeakDb + "dB" : "") +
      (d.value ? " " + d.value : "") + (d.err ? " ERR " + d.err : "") +
      (d.rejection ? " RECHAZO " + d.rejection : "") + (d.count !== undefined ? " (" + d.count + " elementos)" : "");
    listEl.insertBefore(line, listEl.firstChild);
    while (listEl.childNodes.length > 40) listEl.removeChild(listEl.lastChild);
  }

  // ---------------------------------------------------------------- boot
  W.__ossDiag = { logs: logs, exportText: exportText };

  hookCtor("AudioContext");
  hookCtor("webkitAudioContext");
  hookConnect();
  hookSourceStart();
  hookFetch();
  hookDecode();
  hookMedia();
  defineTrap("OssuaryAudioEngine", wrapEngine);
  defineTrap("OssuaryAudio", wrapFacade);

  envSnapshot();
  if (W.__ossDiagStatus) W.__ossDiagStatus("script OK · esperando al juego…");
  document.addEventListener("DOMContentLoaded", buildPanel);
  W.addEventListener("load", function () {
    log("LOAD", { hasFocus: focus(), visibility: document.visibilityState, buffersNotReady: buffersNotReady() });
    setTimeout(function () {
      log("BUFFERS-5s-AFTER-LOAD", { notReady: buffersNotReady(), gains: gains() });
      mediaSnapshot("5s-after-load");
    }, 5000);
    setTimeout(function () { mediaSnapshot("15s-after-load"); }, 15000);
  });
})();
