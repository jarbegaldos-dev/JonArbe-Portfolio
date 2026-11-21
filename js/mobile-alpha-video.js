/* Mobile H.264 frames contain RGB above a grayscale alpha mask.
 * Keeping both in one stream preserves frame/audio synchronization on iOS
 * and Android without depending on hardware VP9 alpha support.
 */
(function () {
  'use strict';
  var enabled = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  var players = new Set();
  // One shared GPU compositor: no per-character WebGL contexts or CPU readback.
  var gpu;
  function composite(media, canvas, ctx) {
    if (gpu === false) return false;
    if (!gpu) {
      var surface = document.createElement('canvas');
      var gl = surface.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
      if (!gl) { gpu = false; return false; }
      function shader(type, source) {
        var s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('Alpha shader failed');
        return s;
      }
      var program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 p; varying vec2 uv; void main(){gl_Position=vec4(p,0.,1.); uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);}'));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float; varying vec2 uv; uniform sampler2D frame; void main(){vec3 color=texture2D(frame,vec2(uv.x,uv.y*.5)).rgb; float alpha=texture2D(frame,vec2(uv.x,.5+uv.y*.5)).r; gl_FragColor=vec4(color,alpha);}'));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gpu = false; return false; }
      gl.useProgram(program);
      var buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
      var position = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      var texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      surface.addEventListener('webglcontextlost', function (e) { e.preventDefault(); gpu = false; });
      gpu = { gl: gl, surface: surface };
    }
    if (gpu.gl.isContextLost()) return false;
    var g = gpu.gl, target = gpu.surface;
    if (target.width !== canvas.width || target.height !== canvas.height) { target.width = canvas.width; target.height = canvas.height; }
    g.viewport(0,0,target.width,target.height);
    g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,media);
    g.drawArrays(g.TRIANGLES,0,3);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(target,0,0);
    return true;
  }

  function create(existing) {
    if (!enabled) return document.createElement('video');
    var canvas = existing || document.createElement('canvas');
    canvas.dataset.alphaVideo = 'true';
    var ctx = canvas.getContext('2d');
    var buffer = document.createElement('canvas');
    var read = buffer.getContext('2d', { willReadFrequently: true });
    var media = document.createElement('video');
    media.playsInline = true;
    media.setAttribute('playsinline', '');
    media.setAttribute('webkit-playsinline', '');
    media.setAttribute('aria-hidden', 'true');
    // A rendered in-viewport decoder avoids Safari's off-screen autoplay pause.
    media.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.001;pointer-events:none;';
    document.body.appendChild(media);
    var frame = null, connected = false, stopped = false, lastTime = -1;
    var wanted = false, suspended = false;
    function cancel() {
      if (frame === null) return;
      if (media.cancelVideoFrameCallback) media.cancelVideoFrameCallback(frame);
      else cancelAnimationFrame(frame);
      frame = null;
    }
    function draw() {
      if (stopped || media.readyState < 2 || !media.videoWidth) return;
      var w = media.videoWidth, h = media.videoHeight / 2;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        buffer.width = w; buffer.height = h * 2;
      }
      if (composite(media, canvas, ctx)) { lastTime = media.currentTime; return; }
      read.drawImage(media, 0, 0);
      var rgb = read.getImageData(0, 0, w, h);
      var mask = read.getImageData(0, h, w, h).data;
      for (var i = 3; i < rgb.data.length; i += 4) rgb.data[i] = mask[i - 3];
      ctx.putImageData(rgb, 0, 0);
      lastTime = media.currentTime;
    }
    function tick() {
      frame = null;
      if (stopped || media.paused || document.hidden) return;
      if (media.currentTime !== lastTime) draw();
      schedule();
    }
    function schedule() {
      if (frame !== null || stopped || media.paused || document.hidden) return;
      frame = media.requestVideoFrameCallback ? media.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
    }
    function dispose() {
      stopped = true; cancel(); media.pause();
      media.removeAttribute('src'); media.load(); media.remove(); players.delete(player);
    }
    var player = {
      check: function () {
        if (canvas.isConnected) connected = true;
        else if (connected) { dispose(); return; }
        var covered = document.body.classList.contains('game-modal-open');
        var pause = document.hidden || covered;
        if (pause && !suspended) { suspended = true; media.pause(); cancel(); }
        else if (!pause && suspended) { suspended = false; if (wanted) media.play().catch(function () {}); }
      },
      retry: function () { if (wanted && !suspended && media.paused && canvas.isConnected) media.play().catch(function () {}); }
    };
    players.add(player);
    ['muted','defaultMuted','loop','autoplay','playsInline','preload','volume','playbackRate','currentTime'].forEach(function (key) {
      Object.defineProperty(canvas, key, { configurable: true, get: function () { return media[key]; }, set: function (v) { media[key] = v; } });
    });
    ['readyState','paused','ended','duration','error','currentSrc'].forEach(function (key) {
      Object.defineProperty(canvas, key, { get: function () { return media[key]; } });
    });
    Object.defineProperty(canvas, 'videoWidth', { get: function () { return media.videoWidth; } });
    Object.defineProperty(canvas, 'videoHeight', { get: function () { return media.videoHeight / 2; } });
    Object.defineProperty(canvas, 'src', {
      get: function () { return media.src; },
      set: function (src) { media.src = src.replace(/\.webm(?=($|[?#]))/, '.mobile.mp4'); }
    });
    canvas.play = function () { wanted = true; return media.play(); };
    canvas.pause = function () { wanted = false; cancel(); media.pause(); };
    canvas.load = function () { media.load(); };
    canvas.dispose = dispose;
    canvas.cloneNode = function () {
      var copy = create();
      Array.from(canvas.attributes).forEach(function (a) { copy.setAttribute(a.name, a.value); });
      ['muted','loop','playsInline','preload','volume','playbackRate'].forEach(function (key) { copy[key] = canvas[key]; });
      copy.src = canvas.src;
      return copy;
    };
    ['loadstart','loadedmetadata','loadeddata','canplay','canplaythrough','play','playing','pause','timeupdate','seeking','seeked','ended','error'].forEach(function (name) {
      media.addEventListener(name, function () {
        if (name === 'loadeddata' || name === 'seeked') draw();
        if (name === 'playing') { wanted = true; draw(); schedule(); }
        if (name === 'pause' || name === 'ended') cancel();
        canvas.dispatchEvent(new Event(name));
      });
    });
    return canvas;
  }
  new MutationObserver(function () { players.forEach(function (p) { p.check(); }); }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', function () { players.forEach(function (p) { p.check(); }); });
  ['pointerdown','touchend','keydown'].forEach(function (name) {
    document.addEventListener(name, function () { players.forEach(function (p) { p.retry(); }); }, { passive: true });
  });
  window.OssuaryMobileAlpha = { enabled: enabled, create: create };
})();
