(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Ojos que brillan, en canvas — SOLO VISUAL.
  //
  // Los usan los ojos del encapuchado (src/fx/hood-eyes.js: la piedra y la
  // cara "watch" del Execution Bonus) y los de la Muerte de El Juicio
  // (src/fx/el-juicio.js#buildMacabreEyes). Peticion del usuario (2026-10-25):
  // "a veces se salen, no tiene sentido que esten lagueados, se ven
  // descompensados con la calidad del juego". Antes eran capas CSS sueltas:
  // pupilas que se salian de la cuenca al entornar o al mirar, temblores a
  // saltos (steps) que parecian tirones y un aro negro duro alrededor.
  //
  // Ahora cada ojo es una almendra con parpados que recortan el iris y la
  // pupila (nunca se salen: al entornar o parpadear se las comen los
  // parpados), todo se mueve a pleno fotograma (muelles y ruido suave, nada a
  // saltos), la cuenca es una sombra blanda y la luz va en modo aditivo.
  //
  // Todo se dibuja en "unidades de cara": 1 = el ancho de referencia (el de
  // la casilla central de rib1 para el encapuchado, el de la cara de la
  // Muerte en El Juicio), con el origen en el centro de la cara.
  // ---------------------------------------------------------------------------

  var DEG = Math.PI / 180;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  // Acerca v a target sin depender del fotograma (rate: 1/s).
  function approach(v, target, rate, dt) { return target + (v - target) * Math.exp(-rate * dt); }
  // Ruido suave entre -1 y 1 (suma de senos): tiembla sin saltos.
  function noise(t, seed) {
    return Math.sin(t * 1.73 + seed) * 0.5 + Math.sin(t * 2.91 + seed * 1.7) * 0.3 + Math.sin(t * 5.37 + seed * 2.3) * 0.2;
  }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  // Interpola una tabla [[t, v], ...] con t de 0 a 1.
  function keyframes(table, t) {
    if (t <= table[0][0]) return table[0][1];
    for (var i = 1; i < table.length; i++) {
      if (t <= table[i][0]) {
        var a = table[i - 1], b = table[i];
        return a[1] + (b[1] - a[1]) * ((t - a[0]) / (b[0] - a[0]));
      }
    }
    return table[table.length - 1][1];
  }

  // Muelle hacia un objetivo: omega = rapidez, zeta < 1 rebota.
  function Spring(x, omega, zeta) {
    this.x = x;
    this.v = 0;
    this.omega = omega;
    this.zeta = zeta == null ? 1 : zeta;
  }
  Spring.prototype.step = function (target, dt) {
    var n = Math.max(1, Math.ceil(dt / 0.008));
    var h = dt / n;
    for (var i = 0; i < n; i++) {
      var acc = -this.omega * this.omega * (this.x - target) - 2 * this.zeta * this.omega * this.v;
      this.v += acc * h;
      this.x += this.v * h;
    }
    return this.x;
  };

  // --- colores ------------------------------------------------------------------
  // core: punto blanco caliente; hot/mid/deep: el ascua hacia el borde; edge: el
  // borde de la almendra (oscuro, sin aro); glow/haze: la luz que echa.
  var PALETTES = {
    ember: { core: [255, 244, 226], hot: [255, 172, 96], mid: [255, 58, 20], deep: [168, 10, 0], edge: [36, 0, 0], glow: [255, 38, 12], haze: [255, 36, 14], pupil: [255, 252, 240] },
    gold: { core: [255, 252, 236], hot: [255, 226, 136], mid: [255, 190, 26], deep: [170, 100, 0], edge: [38, 20, 0], glow: [255, 186, 40], haze: [255, 196, 60], pupil: [255, 255, 244] },
    white: { core: [255, 255, 255], hot: [255, 240, 180], mid: [255, 176, 42], deep: [196, 58, 0], edge: [34, 6, 0], glow: [255, 140, 44], haze: [255, 110, 36], pupil: [255, 255, 255] },
    rage: { core: [255, 255, 255], hot: [255, 182, 150], mid: [255, 70, 38], deep: [196, 18, 8], edge: [48, 0, 0], glow: [255, 52, 30], haze: [255, 44, 24], pupil: [255, 255, 255] },
    bone: { core: [255, 255, 255], hot: [240, 244, 255], mid: [206, 216, 240], deep: [112, 124, 164], edge: [16, 20, 34], glow: [214, 226, 255], haze: [190, 206, 255], pupil: [255, 255, 255] },
    sad: { core: [255, 255, 255], hot: [214, 232, 255], mid: [158, 196, 255], deep: [62, 94, 168], edge: [8, 16, 36], glow: [164, 202, 255], haze: [140, 182, 255], pupil: [255, 255, 255] },
    blaze: { core: [255, 255, 255], hot: [255, 255, 236], mid: [255, 214, 150], deep: [255, 110, 40], edge: [70, 16, 0], glow: [255, 170, 90], haze: [255, 130, 60], pupil: [255, 255, 255] }
  };
  var PAL_KEYS = ["core", "hot", "mid", "deep", "edge", "glow", "haze", "pupil"];

  function clonePal(p) {
    var out = {};
    PAL_KEYS.forEach(function (k) { out[k] = p[k].slice(); });
    return out;
  }
  function mixPal(cur, target, t) {
    PAL_KEYS.forEach(function (k) {
      var a = cur[k], b = target[k];
      a[0] += (b[0] - a[0]) * t;
      a[1] += (b[1] - a[1]) * t;
      a[2] += (b[2] - a[2]) * t;
    });
  }
  function rgba(c, a) {
    return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + clamp(a, 0, 1).toFixed(3) + ")";
  }

  // --- formas de los ojos ---------------------------------------------------------
  // up/low: lo que se abren los parpados de arriba/abajo (en b); inner/outer:
  // lagrimal mas bajo (+) / rabillo mas alto (+), en b; peak: el arco del
  // parpado de arriba hacia fuera (+) o hacia el lagrimal (-), en a.
  var SHAPES = {
    sinister: { up: 1, low: 0.74, inner: 0.14, outer: 0.08, peak: 0.16 },
    round: { up: 1, low: 1, inner: 0, outer: 0, peak: 0 },
    angry: { up: 0.62, low: 1, inner: 0.16, outer: 0, peak: 0.28 },
    sad: { up: 1, low: 0.72, inner: -0.22, outer: -0.24, peak: -0.22 }
  };

  // Almendra en coordenadas del ojo: x+ hacia el rabillo, centro en 0.
  function eyePath(ctx, a, b, open, sh) {
    var bu = b * open * sh.up * 1.333;
    var bl = b * open * sh.low * 1.333;
    var yi = sh.inner * b;
    var yo = -sh.outer * b;
    var p = sh.peak * a;
    ctx.beginPath();
    ctx.moveTo(-a, yi);
    ctx.bezierCurveTo(-a * 0.42 + p, yi * 0.3 - bu, a * 0.42 + p, yo * 0.3 - bu, a, yo);
    ctx.bezierCurveTo(a * 0.48, yo * 0.3 + bl, -a * 0.48, yi * 0.3 + bl, -a, yi);
    ctx.closePath();
  }

  // --- caras -------------------------------------------------------------------------
  // span: [x0, x1, y0, y1] del lienzo en unidades de cara. Ojos: x, y (centro),
  // a, b (medio ancho / medio alto), rot (grados), side (-1 izquierdo, 1
  // derecho), pupil [ancho, alto] en a/b o null, socket/lid: fuerza de la
  // sombra de la cuenca y del parpado, delay: cuando se abre (s).
  var HOOD_SPAN = [-0.2, 0.2, -0.13, 0.3];

  var PRESETS = {
    // Cara "watch" (2026-10-16): cuencas desparejas que se abren de golpe,
    // ascua roja con pupila blanca de alfiler que no para quieta, la derecha
    // entorna, halo rojo dentro de la capucha y sangre que resbala.
    watch: function () {
      return {
        span: HOOD_SPAN,
        palette: "ember",
        haze: { x: 0, y: 0.014, r: 0.15, sy: 0.74, a: 0.17 },
        eyes: [
          { x: -0.0617, y: 0, a: 0.036, b: 0.023, rot: 8, side: -1, shape: SHAPES.sinister, pupil: [0.2, 0.34], socket: 0.85, lid: 0.55, delay: 0 },
          { x: 0.0632, y: 0.005, a: 0.031, b: 0.0175, rot: -14, side: 1, shape: SHAPES.sinister, pupil: [0.2, 0.34], socket: 0.85, lid: 0.55, delay: 0.07, squint: true }
        ],
        // Nacen bajo el parpado de abajo (el ojo tapa el principio).
        drips: [
          { x: -0.05, y: 0.008, w: 0.0118, len: 0.14, delay: 0.45, dur: 2.4, seed: 1.3 },
          { x: 0.0574, y: 0.01, w: 0.0104, len: 0.1, delay: 1.25, dur: 2.4, seed: 4.1 },
          { x: -0.08, y: 0.004, w: 0.0084, len: 0.07, delay: 2.3, dur: 2.4, seed: 2.7 }
        ],
        behave: behaveWatch
      };
    },
    // "Tonto": dos ojos blancos desparejos que tiemblan cada uno a su ritmo.
    silly: function () {
      return {
        span: HOOD_SPAN,
        palette: "bone",
        haze: { x: 0, y: 0, r: 0.11, sy: 0.7, a: 0.05 },
        eyes: [
          { x: -0.0525, y: -0.0139, a: 0.027, b: 0.0175, rot: -12, side: -1, shape: SHAPES.round, pupil: null, socket: 0.3, lid: 0, delay: 0, bloom: 0.9 },
          { x: 0.057, y: 0.0197, a: 0.0235, b: 0.0092, rot: 22, side: 1, shape: SHAPES.round, pupil: null, socket: 0.3, lid: 0, delay: 0.03, bloom: 0.9 }
        ],
        behave: behaveSilly
      };
    },
    // Enfadado: ojos rasgados hacia el centro, cejas de brasa, temblor de rabia.
    angry: function () {
      return {
        span: HOOD_SPAN,
        palette: "rage",
        haze: { x: 0, y: 0.005, r: 0.12, sy: 0.7, a: 0.1 },
        eyes: [
          { x: -0.0525, y: 0, a: 0.03, b: 0.0118, rot: 26, side: -1, shape: SHAPES.angry, pupil: null, socket: 0.5, lid: 0.3, delay: 0 },
          { x: 0.0525, y: 0, a: 0.03, b: 0.0118, rot: -26, side: 1, shape: SHAPES.angry, pupil: null, socket: 0.5, lid: 0.3, delay: 0 }
        ],
        brows: [
          { x: -0.048, y: -0.029, len: 0.07, th: 0.0087, rot: 34 },
          { x: 0.048, y: -0.029, len: 0.07, th: 0.0087, rot: -34 }
        ],
        behave: behaveAngry
      };
    },
    // Llorando: ojos caidos azulados que sollozan y lagrimas por la capucha.
    crying: function () {
      return {
        span: HOOD_SPAN,
        palette: "sad",
        haze: { x: 0, y: 0, r: 0.11, sy: 0.7, a: 0.05 },
        eyes: [
          { x: -0.0525, y: 0, a: 0.024, b: 0.0185, rot: -12, side: -1, shape: SHAPES.sad, pupil: null, socket: 0.4, lid: 0.15, delay: 0 },
          { x: 0.0525, y: 0, a: 0.024, b: 0.0185, rot: 12, side: 1, shape: SHAPES.sad, pupil: null, socket: 0.4, lid: 0.15, delay: 0 }
        ],
        tears: [
          { x: -0.0595, delay: 0.25 }, { x: -0.0467, delay: 0.8 },
          { x: 0.0595, delay: 0.5 }, { x: 0.0467, delay: 1.05 }
        ],
        behave: behaveCrying
      };
    },
    // La Muerte de El Juicio: lo mismo que "watch" en la caja de su cara (hr =
    // alto/ancho de la caja), con lo que pasa en los rodillos (behaveJudgment).
    judgment: function (hr) {
      var lY = -0.03 * hr, rY = -0.015 * hr, lB = 0.112 * hr, rB = 0.085 * hr;
      return {
        span: [-1, 1, -0.8 * hr, 1.62 * hr],
        palette: "ember",
        haze: { x: 0, y: 0.05 * hr, r: 0.66, sy: 0.86, a: 0.26 },
        eyes: [
          { x: -0.2, y: lY, a: 0.145, b: lB, rot: 8, side: -1, shape: SHAPES.sinister, pupil: [0.3, 0.42], socket: 0.8, lid: 0.5, delay: 0 },
          { x: 0.2, y: rY, a: 0.126, b: rB, rot: -14, side: 1, shape: SHAPES.sinister, pupil: [0.3, 0.42], socket: 0.8, lid: 0.5, delay: 0.08, squint: true }
        ],
        drips: [
          { x: -0.19, y: lY + lB * 0.35, w: 0.055, len: 1.25 * hr, delay: 0, dur: 2.2, seed: 0.7 },
          { x: 0.2, y: rY + rB * 0.35, w: 0.05, len: 0.9 * hr, delay: 0.35, dur: 2.2, seed: 3.3 }
        ],
        behave: behaveJudgment
      };
    }
  };

  // --- bucle compartido ----------------------------------------------------------
  var faces = [];
  var rafId = 0;
  var lastNow = 0;

  function tick(now) {
    rafId = 0;
    // Tiempo real (los muelles se subdividen solos): a pocos fps la cara no
    // va a camara lenta ni la corta su temporizador antes de acabar.
    var dt = lastNow ? clamp((now - lastNow) / 1000, 0, 0.25) : 1 / 60;
    lastNow = now;
    for (var i = faces.length - 1; i >= 0; i--) {
      var f = faces[i];
      var keep = false;
      if (!f.dead) {
        try {
          keep = f.frame(dt) !== false;
        } catch (err) {
          if (window.console) console.warn("[eye-glow]", err);
        }
      }
      if (!keep) {
        f.dispose();
        faces.splice(i, 1);
      }
    }
    if (faces.length) rafId = window.requestAnimationFrame(tick);
    else lastNow = 0;
  }

  function track(face) {
    faces.push(face);
    if (!rafId) rafId = window.requestAnimationFrame(tick);
  }

  // --- una cara ------------------------------------------------------------------------
  function Face(name, opts) {
    opts = opts || {};
    this.name = name;
    this.cfg = PRESETS[name](opts.hr || 1);
    this.canvas = document.createElement("canvas");
    this.canvas.className = "eye-glow" + (opts.className ? " " + opts.className : "");
    this.canvas.setAttribute("aria-hidden", "true");
    this.ctx = this.canvas.getContext("2d");
    this.timeScale = opts.timeScale || 1;
    this.lifeMs = opts.lifeMs || 0;
    this.age = 0;
    this.leaving = -1;
    this.dead = false;
    this.u = 0;
    // Estado comun (objetivos y valores suavizados).
    this.I = 1; this.Ic = 0.6;
    this.size = 1; this.sizeC = 1;
    this.haze = 1; this.hazeC = 0;
    this.agit = 0.12; this.agitC = 0.12;
    this.palName = this.cfg.palette;
    this.pal = clonePal(PALETTES[this.palName]);
    this.gaze = { x: 0, y: 0.2 };
    this.pulses = { flare: -1, blaze: -1 };
    // La cara "watch" sangra desde que se abre; la Muerte, solo con la rabia.
    this.bleeding = name === "watch";
    this.bleedStart = 0;
    this.bleedAlpha = 1;
    this.eyes = this.cfg.eyes.map(function (spec, i) {
      return {
        spec: spec,
        open: new Spring(0, 16, 0.42),
        openT: 1,
        gx: new Spring(0, 40, 0.9),
        gy: new Spring(0.2, 40, 0.9),
        dart: { x: 0, y: 0, next: rand(0.3, 0.9) },
        squintAt: rand(2.2, 3.6),
        squintUntil: 0,
        seed: i * 7.31 + rand(0, 10),
        tx: 0,
        ty: 0
      };
    });
    if (opts.parent) opts.parent.appendChild(this.canvas);
  }

  // Tamano del lienzo para una unidad u (px CSS); superresolucion para que no
  // se emborrone si la camara acerca o la pantalla tiene mas densidad.
  Face.prototype.resize = function (u) {
    var s = this.cfg.span;
    var dpr = window.devicePixelRatio || 1;
    var bk = clamp(dpr * 1.6, 2, 3.2);
    var cw = (s[1] - s[0]) * u;
    var ch = (s[3] - s[2]) * u;
    this.canvas.style.width = cw.toFixed(2) + "px";
    this.canvas.style.height = ch.toFixed(2) + "px";
    this.canvas.width = Math.max(2, Math.round(cw * bk));
    this.canvas.height = Math.max(2, Math.round(ch * bk));
    this.bk = this.canvas.width / cw;
    this.u = u;
    this.ox = -s[0] * u;
    this.oy = -s[2] * u;
  };

  Face.prototype.release = function () {
    if (this.leaving < 0) this.leaving = 0;
  };

  Face.prototype.destroy = function () {
    this.dead = true;
  };

  Face.prototype.dispose = function () {
    this.dead = true;
    if (this.onDispose) this.onDispose();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  Face.prototype.pulse = function (name) {
    if (name === "flare" || name === "blaze") {
      var len = PULSES[name][0], peak = PULSES[name][1];
      var cur = pulseEnv(this.pulses[name], len, peak);
      // Si ya brillaba, sigue subiendo desde ahi (sin apagon de un fotograma).
      this.pulses[name] = cur > 0 ? len * peak * (0.5 - Math.sin(Math.asin(1 - 2 * cur) / 3)) : 0;
    }
    if (name === "bleed") {
      this.bleeding = true;
      this.bleedStart = this.age;
      this.bleedAlpha = 1;
    }
  };

  // Opacidad de toda la cara (encendido, vida corta, despedida).
  Face.prototype.alpha = function () {
    var a = 1;
    if (this.lifeMs) a = keyframes(LIFE, (this.age * 1000) / this.lifeMs);
    else if (this.name === "watch") a = keyframes(WATCH_IN, this.age / 0.5);
    if (this.leaving >= 0) a *= 1 - smooth(this.leaving / 0.32);
    return a;
  };

  // Encendido a parpadeos de las caras de la piedra (como hood-eyes-life).
  var LIFE = [[0, 0], [0.04, 1], [0.07, 0.15], [0.1, 1], [0.14, 0.45], [0.18, 0.95], [0.78, 0.85], [0.84, 0.25], [0.88, 0.7], [1, 0]];
  var WATCH_IN = [[0, 0], [0.12, 1], [0.22, 0.35], [0.34, 1], [1, 1]];

  Face.prototype.frame = function (dt) {
    if (this.sync && this.sync() === false) return false;
    if (!this.u) return true;
    this.age += dt;
    if (this.leaving >= 0) {
      this.leaving += dt;
      if (this.leaving > 0.34) return false;
    }
    if (this.lifeMs && this.age * 1000 > this.lifeMs + 80) return false;
    var t = this.age;
    var self = this;
    if (this.pulses.flare >= 0) this.pulses.flare = this.pulses.flare + dt > PULSES.flare[0] ? -1 : this.pulses.flare + dt;
    if (this.pulses.blaze >= 0) this.pulses.blaze = this.pulses.blaze + dt > PULSES.blaze[0] ? -1 : this.pulses.blaze + dt;

    // Objetivos de la cara (cada una a su manera).
    this.cfg.behave(this, dt, t);

    // Suavizado comun: nada cambia de golpe.
    this.Ic = approach(this.Ic, this.I, 9, dt);
    this.sizeC = approach(this.sizeC, this.size, 10, dt);
    this.hazeC = approach(this.hazeC, this.haze, 5, dt);
    this.agitC = approach(this.agitC, this.agit, 8, dt);
    mixPal(this.pal, PALETTES[this.palName], 1 - Math.exp(-6 * dt));

    this.eyes.forEach(function (e) {
      var s = e.spec;
      var target = t < s.delay * self.timeScale ? 0 : e.openT;
      // Se abren de golpe con rebote; despues entornan sin chicle.
      if (t > 0.8 && e.open.zeta < 0.8) {
        e.open.zeta = 0.85;
        e.open.omega = 22;
      }
      if (self.leaving >= 0) {
        target = 0;
        e.open.omega = 30;
      }
      e.open.step(target, dt);
      // Mirada: objetivo de la cara + su pupila inquieta; muelle rapido (un
      // vistazo de ~0.1 s, sin teletransporte).
      e.gx.step(clamp(self.gaze.x + e.dart.x, -1.15, 1.15), dt);
      e.gy.step(clamp(self.gaze.y + e.dart.y, -1.15, 1.15), dt);
      // Temblor suave, mas fuerte y rapido con la rabia.
      var f = 5 + self.agitC * 18;
      e.tx = noise(t * f, e.seed) * s.a * 0.22 * self.agitC;
      e.ty = noise(t * f * 1.13, e.seed + 2.1) * s.b * 0.3 * self.agitC;
    });

    this.draw(t);
    return true;
  };

  // Pulsos: sube rapido y se apaga. [duracion s, donde esta el pico].
  var PULSES = { flare: [0.7, 0.25], blaze: [2.2, 0.15] };
  function pulseEnv(age, len, peak) {
    if (age < 0 || age > len) return 0;
    var x = age / len;
    return x < peak ? smooth(x / peak) : 1 - smooth((x - peak) / (1 - peak));
  }

  Face.prototype.draw = function (t) {
    var ctx = this.ctx;
    var c = this.canvas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, c.width, c.height);
    var alpha = this.alpha();
    if (alpha <= 0.003) return;
    var k = this.u * this.bk;
    ctx.setTransform(k, 0, 0, k, this.ox * this.bk, this.oy * this.bk);
    ctx.globalAlpha = alpha;

    var flare = pulseEnv(this.pulses.flare, PULSES.flare[0], PULSES.flare[1]);
    var blaze = pulseEnv(this.pulses.blaze, PULSES.blaze[0], PULSES.blaze[1]);
    var I = this.Ic + flare * 1.2 + blaze * 2.2;
    var size = this.sizeC + flare * 0.35 + blaze * 0.7;
    var pal = this.pal;
    if (blaze > 0.01) {
      pal = clonePal(this.pal);
      mixPal(pal, PALETTES.blaze, blaze);
    }

    // 1. Luz dentro de la capucha: respira despacio.
    var hz = this.cfg.haze;
    if (hz) {
      var breath = 0.86 + 0.14 * Math.sin(t * 2.42);
      var ha = hz.a * this.hazeC * breath * (1 + flare * 0.7 + blaze * 1.4);
      var hr = hz.r * (1 + (this.hazeC - 1) * 0.25 + blaze * 0.6);
      drawHaze(ctx, hz.x, hz.y, hr, hz.sy, pal.haze, ha);
    }

    // 2. Cuencas: sombra blanda que hunde los ojos (sin aro).
    var self = this;
    this.eyes.forEach(function (e) { drawSocket(ctx, e, size); });

    // 3. Brillo de los ojos, luego la sangre encima (oscura, tapa la luz: se
    // lee liquida y no como un trazo encendido) y por ultimo los ojos, que
    // tapan donde nace (sale de debajo del parpado).
    this.eyes.forEach(function (e) { drawEye(ctx, e, size, pal, I, "bloom"); });
    if (this.cfg.drips) this.drawBlood(ctx, t);
    this.eyes.forEach(function (e) { drawEye(ctx, e, size, pal, I, "body"); });
    if (this.cfg.brows) this.cfg.brows.forEach(function (br) { drawBrow(ctx, br, pal, I, self, t); });
    if (this.cfg.tears) this.cfg.tears.forEach(function (tear) { drawTear(ctx, tear, pal, t * (1 / self.timeScale)); });
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  };

  function drawHaze(ctx, x, y, r, sy, col, a) {
    if (a <= 0.002) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(x, y);
    ctx.scale(1, sy);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(0.38, rgba(col, a * 0.45));
    g.addColorStop(0.7, rgba(col, a * 0.12));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  function drawSocket(ctx, e, size) {
    var s = e.spec;
    if (!s.socket) return;
    var a = s.a * size, b = s.b * size;
    var r = a * 1.75;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.translate(s.x + e.tx * 0.4, s.y + e.ty * 0.4);
    ctx.rotate(s.rot * DEG);
    ctx.scale(1, clamp(b / a * 1.3 + 0.12, 0.3, 1));
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, "rgba(0,0,0," + (0.72 * s.socket).toFixed(3) + ")");
    g.addColorStop(0.55, "rgba(0,0,0," + (0.42 * s.socket).toFixed(3) + ")");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // pass "bloom": la luz que echa (aditiva); "body": la almendra con su
  // ascua, la pupila y el nucleo blanco.
  function drawEye(ctx, e, size, pal, I, pass) {
    var s = e.spec;
    var open = Math.max(0, e.open.x);
    var a = s.a * size, b = s.b * size;
    ctx.save();
    ctx.translate(s.x + e.tx, s.y + e.ty);
    ctx.rotate(s.rot * DEG);
    ctx.scale(s.side, 1);
    // La pupila, en coordenadas del ojo (x+ hacia el rabillo).
    var px = clamp(e.gx.x * s.side, -1.2, 1.2) * a * 0.42;
    var py = clamp(e.gy.x, -1.2, 1.2) * b * 0.4 + b * 0.06;
    var heat = clamp(I, 0, 3.2);

    if (pass === "bloom") {
      // Menos cuanto mas cerrado.
      var lit = heat * (0.18 + 0.82 * clamp(open, 0, 1.25));
      var rb = a * 2.5 * (s.bloom || 1) * (0.9 + 0.1 * heat);
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(px * 0.35, py * 0.35);
      ctx.scale(1, 0.72);
      var gb = ctx.createRadialGradient(0, 0, 0, 0, 0, rb);
      gb.addColorStop(0, rgba(pal.glow, 0.5 * lit));
      gb.addColorStop(0.28, rgba(pal.glow, 0.2 * lit));
      gb.addColorStop(0.62, rgba(pal.glow, 0.05 * lit));
      gb.addColorStop(1, rgba(pal.glow, 0));
      ctx.fillStyle = gb;
      ctx.fillRect(-rb, -rb, rb * 2, rb * 2);
      ctx.restore();
      return;
    }

    if (open > 0.015) {
      ctx.save();
      eyePath(ctx, a, b, open, s.shape);
      ctx.clip();
      ctx.globalCompositeOperation = "source-over";
      var rr = a * 1.08;
      var g = ctx.createRadialGradient(px * 0.55, py * 0.55 + b * 0.08, 0, px * 0.3, b * 0.1, rr);
      g.addColorStop(0, rgba(pal.core, 1));
      g.addColorStop(clamp(0.05 + 0.05 * heat, 0.02, 0.3), rgba(pal.hot, 1));
      g.addColorStop(clamp(0.2 + 0.08 * heat, 0.1, 0.55), rgba(pal.mid, 1));
      g.addColorStop(clamp(0.5 + 0.07 * heat, 0.3, 0.82), rgba(pal.deep, 1));
      g.addColorStop(1, rgba(pal.edge, 1));
      ctx.fillStyle = g;
      ctx.fillRect(-a * 1.3, -b * 2.4, a * 2.6, b * 4.8);
      // Sombra del parpado de arriba: la mirada pesa.
      if (s.lid) {
        var top = -b * open * s.shape.up;
        var gl = ctx.createLinearGradient(0, top, 0, top + b * 1.05);
        gl.addColorStop(0, "rgba(0,0,0," + s.lid.toFixed(3) + ")");
        gl.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gl;
        ctx.fillRect(-a * 1.3, top - b, a * 2.6, b * 2.1);
      }
      // Pupila de alfiler: punto blanco caliente, siempre dentro.
      if (s.pupil) {
        var pw = a * s.pupil[0], ph = b * s.pupil[1];
        ctx.globalCompositeOperation = "lighter";
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(1, ph / pw);
        var gp = ctx.createRadialGradient(0, 0, 0, 0, 0, pw);
        gp.addColorStop(0, rgba(pal.pupil, 1));
        gp.addColorStop(0.42, rgba(pal.pupil, 0.85));
        gp.addColorStop(1, rgba(pal.hot, 0));
        ctx.fillStyle = gp;
        ctx.fillRect(-pw, -pw, pw * 2, pw * 2);
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.globalCompositeOperation = "lighter";
    // Muy caliente (rabia, linterna): nucleo blanco que se desborda.
    if (heat > 1.6 && open > 0.1) {
      var wb = a * 1.1;
      var wa = clamp((heat - 1.6) * 0.35, 0, 0.6) * clamp(open, 0, 1);
      ctx.save();
      ctx.translate(px * 0.5, py * 0.5);
      ctx.scale(1, 0.6);
      var gw = ctx.createRadialGradient(0, 0, 0, 0, 0, wb);
      gw.addColorStop(0, rgba(pal.core, wa));
      gw.addColorStop(1, rgba(pal.hot, 0));
      ctx.fillStyle = gw;
      ctx.fillRect(-wb, -wb, wb * 2, wb * 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // Un hilo de sangre que baja con una gota colgando al final.
  function drawDrip(ctx, d, p, alpha) {
    if (p <= 0.002 || alpha <= 0.01) return;
    var len = d.len * p;
    var w = d.w;
    var N = 12;
    var left = [], right = [];
    for (var i = 0; i <= N; i++) {
      var y = d.y + len * (i / N);
      // fa: por donde va del recorrido entero (la forma no se estira al bajar).
      var fa = (y - d.y) / d.len;
      // Fino donde nace, se engorda al bajar (la sangre se junta abajo).
      var hw = w * 0.5 * (0.36 + 0.64 * smooth(fa * 2.6)) * (1 - 0.12 * fa);
      var cx = d.x + Math.sin(fa * 4.2 + d.seed) * w * 0.38 * fa;
      left.push([cx - hw, y]);
      right.push([cx + hw, y]);
    }
    var ex = (left[N][0] + right[N][0]) / 2;
    var ey = left[N][1];
    var rb = w * (0.5 + 0.28 * smooth(p));
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (var j = 1; j <= N; j++) ctx.lineTo(left[j][0], left[j][1]);
    for (var m = N; m >= 0; m--) ctx.lineTo(right[m][0], right[m][1]);
    ctx.closePath();
    // La gota que cuelga: algo alargada, sigue al hilo.
    ctx.moveTo(ex + rb, ey + rb * 0.3);
    ctx.ellipse(ex, ey + rb * 0.3, rb, rb * 1.3, 0, 0, Math.PI * 2);
    var g = ctx.createLinearGradient(0, d.y, 0, ey + rb * 1.6);
    g.addColorStop(0, "rgba(58,0,4,0.6)");
    g.addColorStop(0.1, "rgba(78,0,6,0.96)");
    g.addColorStop(0.6, "rgba(52,0,4,0.98)");
    g.addColorStop(1, "rgba(34,0,2,1)");
    ctx.fillStyle = g;
    ctx.fill();
    // Brillo humedo: la luz de los ojos en un filo del hilo (mas cerca de
    // los ojos, mas luz) y un punto en la gota.
    ctx.globalCompositeOperation = "lighter";
    var gh = ctx.createLinearGradient(0, d.y, 0, ey);
    gh.addColorStop(0, "rgba(255,84,64,0.3)");
    gh.addColorStop(1, "rgba(255,84,64,0.06)");
    ctx.strokeStyle = gh;
    ctx.lineWidth = w * 0.18;
    ctx.lineCap = "round";
    ctx.beginPath();
    var from = Math.min(2, N);
    for (var q = from; q < N; q++) {
      var hx = left[q][0] + (right[q][0] - left[q][0]) * 0.28;
      if (q === from) ctx.moveTo(hx, left[q][1]);
      else ctx.lineTo(hx, left[q][1]);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(255,140,120,0.36)";
    ctx.beginPath();
    ctx.ellipse(ex - rb * 0.32, ey + rb * 0.05, rb * 0.22, rb * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  Face.prototype.drawBlood = function (ctx, t) {
    if (!this.bleeding) return;
    var self = this;
    var since = t - this.bleedStart;
    this.cfg.drips.forEach(function (d) {
      var x = (since - d.delay * self.timeScale) / (d.dur * self.timeScale);
      if (x <= 0) return;
      // Baja rapido al principio y se frena (cubic-bezier .32,.08,.36,1).
      var p = 1 - Math.pow(1 - clamp(x, 0, 1), 2.6);
      drawDrip(ctx, d, p, self.bleedAlpha);
    });
  };

  function drawBrow(ctx, br, pal, I, face, t) {
    var jx = noise(t * 26, br.x * 40) * 0.0035;
    var jy = noise(t * 29, br.y * 40 + 1) * 0.0025;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(br.x + jx, br.y + jy);
    ctx.rotate(br.rot * DEG);
    var h = br.len / 2;
    var g = ctx.createLinearGradient(-h, 0, h, 0);
    g.addColorStop(0, rgba(pal.glow, 0));
    g.addColorStop(0.3, rgba(pal.mid, 0.85 * Math.min(1, I)));
    g.addColorStop(0.7, rgba(pal.mid, 0.85 * Math.min(1, I)));
    g.addColorStop(1, rgba(pal.glow, 0));
    ctx.lineCap = "round";
    ctx.strokeStyle = g;
    ctx.globalAlpha *= 0.35;
    ctx.lineWidth = br.th * 2.6;
    ctx.beginPath();
    ctx.moveTo(-h, 0);
    ctx.lineTo(h, 0);
    ctx.stroke();
    ctx.globalAlpha /= 0.35;
    ctx.lineWidth = br.th;
    ctx.stroke();
    ctx.restore();
  }

  // Lagrima: se forma bajo el ojo, resbala acelerando y se apaga.
  function drawTear(ctx, tear, pal, t) {
    var period = 1.1;
    var local = t - tear.delay;
    if (local < 0) return;
    var x = (local % period) / period;
    var y0 = 0.026, fall = 0.24, w = 0.0099, h = 0.0145;
    var y = y0 + fall * x * x;
    var op = x < 0.15 ? x / 0.15 : x < 0.8 ? 1 - (x - 0.15) * 0.23 : 0.85 * (1 - (x - 0.8) / 0.2);
    var sc = x < 0.15 ? 0.6 + (x / 0.15) * 0.4 : 1;
    var sx = sc * (x > 0.8 ? 1 - (x - 0.8) * 0.75 : 1);
    var sy = sc * (x > 0.8 ? 1 + (x - 0.8) * 0.75 : 1);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha *= clamp(op, 0, 1);
    ctx.translate(tear.x, y);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.bezierCurveTo(w * 0.45, -h * 0.35, w, h * 0.1, w, h * 0.38);
    ctx.arc(0, h * 0.38, w, 0, Math.PI, false);
    ctx.bezierCurveTo(-w, h * 0.1, -w * 0.45, -h * 0.35, 0, -h);
    var g = ctx.createRadialGradient(-w * 0.1, h * 0.3, 0, 0, h * 0.2, w * 1.4);
    g.addColorStop(0, rgba(pal.core, 0.95));
    g.addColorStop(0.45, rgba(pal.mid, 0.75));
    g.addColorStop(1, rgba(pal.deep, 0.15));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  // --- comportamientos ---------------------------------------------------------------
  // Pupilas inquietas: cada cierto tiempo miran a otro sitio cerca (el muelle
  // de la mirada lo convierte en un vistazo rapido, no en un salto).
  function darts(face, dt, radius, minS, maxS) {
    face.eyes.forEach(function (e, i) {
      e.dart.next -= dt;
      if (e.dart.next > 0) return;
      var ang = rand(0, Math.PI * 2);
      var r = radius * Math.sqrt(Math.random());
      // El derecho a veces sigue al izquierdo (mirada conjugada), a veces no.
      if (i > 0 && Math.random() < 0.55) {
        e.dart.x = face.eyes[0].dart.x + rand(-0.12, 0.12);
        e.dart.y = face.eyes[0].dart.y + rand(-0.1, 0.1);
      } else {
        e.dart.x = Math.cos(ang) * r;
        e.dart.y = Math.sin(ang) * r * 0.7;
      }
      e.dart.next = rand(minS, maxS);
    });
  }

  // El ojo derecho entorna de vez en cuando.
  function squints(face, t, amount) {
    face.eyes.forEach(function (e) {
      if (!e.spec.squint) return;
      if (t >= e.squintAt) {
        e.squintUntil = t + rand(0.38, 0.6);
        e.squintAt = t + rand(2.8, 4.8);
      }
      e.openT = t < e.squintUntil ? amount : 1;
    });
  }

  // Chisporroteo de la brasa: alguna caida breve de luz, suave.
  function sputter(face, t) {
    if (!face.sputterAt) face.sputterAt = t + rand(1.2, 2.6);
    if (t >= face.sputterAt) {
      face.sputterUntil = t + rand(0.06, 0.14);
      face.sputterAt = t + rand(1.4, 3.2);
    }
    return t < (face.sputterUntil || 0) ? 0.72 : 1;
  }

  function behaveWatch(face, dt, t) {
    face.gaze.x = 0;
    face.gaze.y = 0.25;
    darts(face, dt, 0.75, 0.35, 1.4);
    squints(face, t, 0.4);
    face.I = (1 + noise(t * 2.2, 0.4) * 0.09) * sputter(face, t);
    face.haze = 1;
    face.agit = 0.14;
    face.size = 1;
  }

  function behaveSilly(face, dt, t) {
    face.gaze.x = 0;
    face.gaze.y = 0;
    face.agit = 0.9;
    face.I = 0.95;
    face.haze = 1;
    // El pequeno se aplasta y se estira a su ritmo.
    face.eyes[0].openT = 1 + noise(t * 7.5, 3) * 0.08;
    face.eyes[1].openT = 0.95 + noise(t * 9.3, 8) * 0.28;
  }

  function behaveAngry(face, dt, t) {
    face.gaze.x = 0;
    face.gaze.y = 0;
    face.agit = 1.4;
    face.I = 1.25 + noise(t * 6, 1) * 0.12;
    face.haze = 1;
    face.eyes.forEach(function (e) { e.openT = 1; });
  }

  function behaveCrying(face, dt, t) {
    face.gaze.x = 0;
    face.gaze.y = 0.3;
    face.agit = 0.1;
    face.I = 0.95;
    face.haze = 1;
    // Sollozo: entornan y se abren cada 0.9 s.
    var sob = keyframes([[0, 1], [0.45, 0.62], [0.55, 0.7], [1, 1]], (t % 0.9) / 0.9);
    face.eyes.forEach(function (e) { e.openT = sob; });
  }

  // El Juicio: lee el estado que ya pone el-juicio.js en la caja de los ojos
  // (clases is-scanning / is-staring / is-rage / is-gold / is-last y la forma
  // f1-f4 de la Muerte; la mirada de eyesLook en __look).
  function behaveJudgment(face, dt, t) {
    var st = face.judgment;
    var heat = [0.85, 0.85, 1, 1.15, 1.3][st.form] || 0.85;
    face.palName = st.gold ? "gold" : st.rage ? "rage" : st.form >= 4 ? "white" : "ember";
    var I = heat;
    var open = 1;
    var size = 1;
    var haze = 0.75 * heat;
    var agit = 0.12;
    if (st.staring) {
      // Entornan y arden: mas calor para que no se apaguen al cerrarse.
      I = 1.7 * heat + Math.sin(t * Math.PI * 2) * 0.2;
      open = 0.5;
      size = 1.14;
      haze = 1.3;
      agit = 0.3;
    }
    if (st.rage) {
      I = 1.9 + noise(t * 9, 2) * 0.15;
      open = 1.18;
      size = 1.28;
      haze = 1.6;
      agit = 1.1;
    }
    if (st.last) haze *= 1 + 0.55 * keyframes([[0, 0], [0.12, 1], [0.3, 0.1], [0.45, 0.75], [0.7, 0], [1, 0]], (t % 1.25) / 1.25);
    face.I = I * sputter(face, t);
    face.size = size;
    face.haze = haze;
    face.agit = agit;
    face.eyes.forEach(function (e) { e.openT = open; });
    if (!st.rage && !st.staring) squints(face, t, 0.42);

    // Mirada: hacia donde apunta eyesLook, mas el barrido de los cepos
    // mientras giran, mas la pupila inquieta.
    if (st.scanning) {
      face.scanNext = (face.scanNext || 0) - dt;
      if (face.scanNext <= 0) {
        face.scanSide = -(face.scanSide || 1);
        face.scanX = face.scanSide * rand(0.5, 1);
        face.scanY = rand(0.15, 0.6);
        face.scanNext = rand(0.16, 0.3);
      }
    } else {
      face.scanX = 0;
      face.scanY = 0;
    }
    face.gaze.x = clamp(st.lookX + (face.scanX || 0), -1.1, 1.1);
    face.gaze.y = clamp(st.lookY + (face.scanY || 0) + 0.12, -1.1, 1.1);
    darts(face, dt, st.staring || st.rage ? 0.25 : 0.55, 0.4, 1.5);

    // Sangre: corre con la rabia; al pasar, se va apagando.
    if (st.rage) {
      face.bleedAlpha = 1;
      face.calmSince = -1;
    } else if (face.bleeding) {
      if (face.calmSince < 0) face.calmSince = t;
      if (t - face.calmSince > 0.6) face.bleedAlpha = approach(face.bleedAlpha, 0, 2.2, dt);
      if (face.bleedAlpha < 0.02) face.bleeding = false;
    }
  }

  // --- API -------------------------------------------------------------------------------
  // create(mood, { parent, lifeMs, timeScale, className }): cara del
  // encapuchado en una capa fija. place(fn) le da cada fotograma donde va:
  // fn() -> { x, y, unit } en px de pantalla (centro de la cara y ancho de
  // referencia), asi sigue a la camara y al tablero aunque se muevan.
  function create(mood, opts) {
    if (!PRESETS[mood] || mood === "judgment") return null;
    var face = new Face(mood, opts);
    var placeFn = null;
    var lastKey = "";
    face.place = function (fn) { placeFn = fn; };
    face.alive = function () { return !face.dead && face.leaving < 0; };
    face.sync = function () {
      if (!placeFn) return true;
      var p = placeFn();
      if (!p || !(p.unit > 0)) return true;
      if (!face.u || p.unit / face.u > 1.3 || p.unit / face.u < 0.77) {
        face.resize(p.unit);
        face.canvas.style.transformOrigin = face.ox.toFixed(2) + "px " + face.oy.toFixed(2) + "px";
        lastKey = "";
      }
      var k = p.unit / face.u;
      var tx = (p.x - face.ox).toFixed(2);
      var ty = (p.y - face.oy).toFixed(2);
      var key = tx + "," + ty + "," + k.toFixed(4);
      if (key !== lastKey) {
        face.canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + k.toFixed(4) + ")";
        lastKey = key;
      }
      return true;
    };
    track(face);
    return face;
  }

  // attachJudgment(root, look): ojos de la Muerte de El Juicio dentro de su
  // caja (.el-juicio-eyes); las capas CSS de antes se quedan invisibles
  // (.is-glow) para que las ascuas sepan de donde salir.
  function attachJudgment(root, look) {
    if (!root) return null;
    var face = null;
    var box = { w: 0, h: 0 };
    var born = performance.now();
    var wasConnected = false;
    var ro = null;
    var mo = null;
    var state = { form: 1, scanning: false, staring: false, rage: false, gold: false, last: false, lookX: 0, lookY: 0 };

    function layout(w, h) {
      if (!(w > 0 && h > 0)) return;
      var hr = h / w;
      if (!face) {
        face = new Face("judgment", { hr: hr, className: "el-juicio-eyes__glow" });
        face.judgment = state;
        face.calmSince = -1;
        face.sync = sync;
        face.onDispose = function () {
          if (ro) ro.disconnect();
          if (mo) mo.disconnect();
          root.classList.remove("is-glow");
        };
        root.appendChild(face.canvas);
        track(face);
      } else {
        face.cfg = PRESETS.judgment(hr);
        face.cfg.eyes.forEach(function (spec, i) { if (face.eyes[i]) face.eyes[i].spec = spec; });
      }
      box.w = w;
      box.h = h;
      face.resize(w);
      var s = face.cfg.span;
      face.canvas.style.left = (w / 2 + s[0] * w).toFixed(2) + "px";
      face.canvas.style.top = (h / 2 + s[2] * w).toFixed(2) + "px";
    }

    function sync() {
      if (root.isConnected) wasConnected = true;
      else if (wasConnected || performance.now() - born > 15000) return false;
      if (!box.w && root.isConnected) layout(root.clientWidth, root.clientHeight);
      var cl = root.classList;
      state.scanning = cl.contains("is-scanning");
      state.staring = cl.contains("is-staring");
      state.rage = cl.contains("is-rage");
      state.gold = cl.contains("is-gold");
      state.last = cl.contains("is-last");
      var death = root.closest(".el-juicio-death");
      var dcl = death ? death.classList : null;
      state.form = !dcl ? 1 : dcl.contains("f4") ? 4 : dcl.contains("f3") ? 3 : dcl.contains("f2") ? 2 : 1;
      // eyesLook escribe "Xpx Ypx" con un alcance de 0.1 (x) y 0.06 (y)
      // anchos de la caja.
      var tr = look && look.style.translate ? look.style.translate.split(" ") : null;
      var w = box.w || 1;
      state.lookX = tr ? clamp((parseFloat(tr[0]) || 0) / (w * 0.1), -1, 1) : 0;
      state.lookY = tr ? clamp((parseFloat(tr[1]) || 0) / (w * 0.06), -1, 1) : 0;
      return true;
    }

    root.classList.add("is-glow");
    if (window.ResizeObserver) {
      ro = new ResizeObserver(function () {
        var w = root.clientWidth, h = root.clientHeight;
        if (w > 0 && h > 0 && (Math.abs(w - box.w) > 0.5 || Math.abs(h - box.h) > 0.5)) layout(w, h);
      });
      ro.observe(root);
    }
    // Destellos, rabia y linterna: el-juicio.js reinicia la clase (quita y
    // pone); cada vez que entra, un pulso.
    if (window.MutationObserver) {
      mo = new MutationObserver(function (records) {
        if (!face) return;
        for (var i = 0; i < records.length; i++) {
          var before = " " + (records[i].oldValue || "") + " ";
          var after = " " + (i + 1 < records.length ? records[i + 1].oldValue || "" : root.className) + " ";
          if (before.indexOf(" is-flare ") < 0 && after.indexOf(" is-flare ") >= 0) face.pulse("flare");
          if (before.indexOf(" is-blaze ") < 0 && after.indexOf(" is-blaze ") >= 0) face.pulse("blaze");
          if (before.indexOf(" is-rage ") < 0 && after.indexOf(" is-rage ") >= 0) face.pulse("bleed");
        }
      });
      mo.observe(root, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    }
    // Aun sin caja (el tablero se monta despues): se mide en el primer
    // fotograma con la caja puesta.
    var probe = function () {
      if (face || performance.now() - born > 15000) return;
      if (root.isConnected && root.clientWidth > 0) layout(root.clientWidth, root.clientHeight);
      else window.requestAnimationFrame(probe);
    };
    probe();
    return {
      root: root,
      face: function () { return face; }
    };
  }

  window.OssuaryEyeGlow = {
    create: create,
    attachJudgment: attachJudgment,
    // Para pruebas: cuantas caras se dibujan ahora.
    count: function () { return faces.length; }
  };
})();
