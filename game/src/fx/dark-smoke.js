(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Humo negro que se traga la pantalla — SOLO FX.
  //
  // Peticion del usuario (2026-10-19): detras del multiplicador del cuervo
  // dorado del Super, "una especie de humo negro por detras para darle
  // tension y oscurecer lo demas de la pantalla, un humo negro bien real,
  // como el de la imagen del bono normal" (el humo espeso del cartel
  // EXECUTION). Un lienzo WebGL fijo, encima del juego y debajo de las
  // cifras: humo espeso alrededor de un punto que se hincha, se enrosca y
  // sube despacio, con relieve (bordes grises que reciben luz) y el oro de
  // las cifras alumbrando de cerca sus bordes; el resto de la pantalla se
  // oscurece con una neblina negra. Todo en el fragment shader (ruido fbm con
  // el dominio deformado dos veces). Sin WebGL, un velo negro con degradado.
  //
  //   var s = OssuaryDarkSmoke.show({ x, y, radius });  // centro (viewport)
  //   s.heat(0..1);        // el oro se calienta: alumbra mas el humo y suben brasas
  //   s.pulse(1);          // golpe: el humo se abre de un empujon y el oro lo enciende
  //   s.hide(700).then();  // se abre y se disipa
  // ---------------------------------------------------------------------------

  // Resolucion del lienzo frente a la pantalla (el humo es blando: con algo
  // mas de la mitad sobra y cuesta la mitad).
  var RES = 0.7;
  var IN_MS = 750;
  // Encima del juego y del velo de la Marca de Sangre (8840), debajo de los
  // menus (9300+) y de las cifras que vuelan (10003+).
  var Z = 9050;

  function cover(el) {
    el.style.position = "fixed";
    el.style.left = "0";
    el.style.top = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.zIndex = String(Z);
    el.style.pointerEvents = "none";
  }

  var VS = "attribute vec2 aPos;\nvoid main() { gl_Position = vec4(aPos, 0.0, 1.0); }";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 uRes;",
    "uniform vec2 uCenter;",
    "uniform float uR;",
    "uniform float uTime;",
    "uniform float uIn;",
    "uniform float uOut;",
    "uniform float uBurst;",
    "uniform float uHeat;",
    "uniform float uDim;",
    "uniform vec3 uLight;",
    "float hash(vec2 p) {",
    "  vec3 p3 = fract(vec3(p.xyx) * 0.1031);",
    "  p3 += dot(p3, p3.yzx + 33.33);",
    "  return fract((p3.x + p3.y) * p3.z);",
    "}",
    "float noise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
    "}",
    "const mat2 ROT = mat2(0.8, -0.6, 0.6, 0.8);",
    "float fbm(vec2 p) {",
    "  float v = 0.0;",
    "  float a = 0.5;",
    "  for (int i = 0; i < 5; i++) {",
    "    v += a * noise(p);",
    "    p = ROT * p * 2.02 + 7.3;",
    "    a *= 0.5;",
    "  }",
    "  return v;",
    "}",
    "float fbm3(vec2 p) {",
    "  float v = 0.5 * noise(p);",
    "  p = ROT * p * 2.02 + 7.3;",
    "  v += 0.25 * noise(p);",
    "  p = ROT * p * 2.02 + 7.3;",
    "  return v + 0.125 * noise(p);",
    "}",
    // Bocanadas: ruido "billow" (valor absoluto): bultos redondos con
    // pliegues entre ellos, como el humo espeso del cartel. Tres octavas para
    // las bocanadas grandes y dos para las pequenas que llevan encima.
    "float billow3(vec2 p) {",
    "  float v = 0.5 * abs(noise(p) * 2.0 - 1.0);",
    "  p = ROT * p * 2.03 + 7.3;",
    "  v += 0.25 * abs(noise(p) * 2.0 - 1.0);",
    "  p = ROT * p * 2.03 + 7.3;",
    "  return v + 0.125 * abs(noise(p) * 2.0 - 1.0);",
    "}",
    "float billow2(vec2 p) {",
    "  float v = 0.5 * abs(noise(p) * 2.0 - 1.0);",
    "  p = ROT * p * 2.03 + 7.3;",
    "  return v + 0.25 * abs(noise(p) * 2.0 - 1.0);",
    "}",
    "float puffs(vec2 p) { return billow3(p) + 0.32 * billow2(p * 3.1 + 4.0); }",
    // Jirones de fuera: el dominio deformado (se enroscan).
    "float wisps(vec2 p, float t) {",
    "  vec2 w1 = vec2(fbm3(p * 0.9 + vec2(0.0, t * 0.07)), fbm3(p * 0.9 + vec2(5.2, 1.3) - vec2(t * 0.05, 0.0)));",
    "  return fbm(p * 1.3 + 2.6 * w1 + vec2(t * 0.02, 0.0));",
    "}",
    // Union blanda de dos bultos (la nube es varias bocanadas juntas).
    "float smin(float a, float b, float k) {",
    "  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);",
    "  return mix(b, a, h) - k * h * (1.0 - h);",
    "}",
    // Brasas de oro que suben por el humo: una por celda (a veces), que se
    // mece y parpadea. Dos capas: grandes y lentas, pequenas y rapidas.
    "float embers(vec2 sp, float t) {",
    "  float acc = 0.0;",
    "  for (int i = 0; i < 2; i++) {",
    "    float fi = float(i);",
    "    vec2 g = sp * (8.0 + fi * 7.0) + vec2(fi * 3.7, t * (0.9 + fi * 0.7));",
    "    vec2 id = floor(g);",
    "    vec2 f = fract(g);",
    "    float r = hash(id + fi * 17.0);",
    "    vec2 pos = vec2(0.22 + 0.56 * hash(id + 3.1), 0.2 + 0.6 * hash(id + 5.7));",
    "    pos.x += 0.12 * sin(t * 1.7 + r * 40.0);",
    "    float dd = length((f - pos) * vec2(1.0, 0.75));",
    "    float flick = 0.55 + 0.45 * sin(t * 8.0 + r * 60.0);",
    "    acc += step(r, 0.3) * flick * smoothstep(0.075 - fi * 0.03, 0.0, dd);",
    "  }",
    "  return acc;",
    "}",
    "void main() {",
    "  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);",
    "  vec2 d = (px - uCenter) / uR;",
    "  float t = uTime;",
    // Se hincha al entrar, se abre de golpe con el empujon y al irse.
    "  float grow = mix(0.55, 1.0, uIn) + 0.2 * uBurst + 0.8 * uOut;",
    "  vec2 q = d / grow;",
    // Las bocanadas se abren hacia fuera (zoom lento), suben y se enroscan.
    "  vec2 p = q * (1.0 / (1.0 + t * 0.04)) + vec2(0.0, t * 0.07);",
    "  vec2 w = vec2(fbm3(p * 0.6 + vec2(0.0, t * 0.05)), fbm3(p * 0.6 + vec2(5.2, 1.3) - vec2(t * 0.04, 0.0))) - 0.44;",
    "  vec2 pw = (p + w * 1.3) * 1.15;",
    "  float h = puffs(pw);",
    "  float hx = puffs(pw + vec2(0.035, 0.0));",
    "  float hy = puffs(pw + vec2(0.0, 0.035));",
    "  vec3 nrm = normalize(vec3((h - hx) * 9.0, (h - hy) * 9.0, 1.0));",
    // Silueta (peticion del usuario, 2026-10-19: ni redonda ni recortada):
    // varias bocanadas juntas, mas ancha que alta, el contorno roto por un
    // ruido grande y un borde muy largo que se deshace en la neblina; hacia
    // fuera solo quedan los bultos y se van aclarando.
    "  float b0 = length(q * vec2(0.62, 0.95));",
    "  float b1 = length((q - vec2(-1.25, 0.45 + 0.08 * sin(t * 0.3))) * vec2(0.8, 1.05)) + 0.25;",
    "  float b2 = length((q - vec2(1.2, 0.35 - 0.08 * sin(t * 0.23))) * vec2(0.8, 1.0)) + 0.22;",
    "  float b3 = length((q - vec2(0.3 * sin(t * 0.17), -0.85)) * vec2(0.75, 1.1)) + 0.3;",
    "  float blob = smin(smin(b0, b1, 0.6), smin(b2, b3, 0.6), 0.6);",
    "  float lobe = fbm(q * 0.7 + w * 1.1 + vec2(t * 0.02, t * 0.04));",
    "  float shape = blob - (lobe - 0.47) * 1.6 - (h - 0.5) * 0.6;",
    "  float body = 1.0 - smoothstep(0.75, 2.1, shape);",
    "  float core = 1.0 - smoothstep(0.55, 1.35, shape);",
    // Negro en los pliegues; los bultos, gris de carbon con la luz de arriba.
    "  float ao = smoothstep(0.12, 0.8, h);",
    "  float a = pow(body, 1.15) * mix(0.35 + 0.65 * ao, 1.0, core);",
    "  vec3 L = normalize(vec3(-0.25, -0.8, 0.5));",
    "  float diff = max(dot(nrm, L), 0.0);",
    "  float lit = pow(diff, 1.3) * ao * ao;",
    // Los bordes de la nube, mas finos, dejan pasar luz (filo plateado).
    "  float rim = smoothstep(0.4, 1.4, shape) * body;",
    "  vec3 col = vec3(0.01, 0.009, 0.009) + vec3(0.31, 0.296, 0.282) * lit * (0.25 + 0.75 * core) + vec3(0.06, 0.057, 0.053) * rim * diff;",
    // El oro de las cifras alumbra de cerca las caras que le miran; mas
    // cuanto mas frena la ruleta (uHeat) y de golpe al clavarse (uBurst).
    "  vec2 toC = length(q) > 0.001 ? -normalize(q) : vec2(0.0, -1.0);",
    "  vec3 Lg = normalize(vec3(toC * 0.85, 0.5));",
    "  float dg = max(dot(nrm, Lg), 0.0);",
    "  float near = exp(-length(q * vec2(0.7, 1.0)) * (2.2 - 0.4 * uHeat - 0.9 * uBurst));",
    "  col += uLight * pow(dg, 2.5) * near * ao * (0.14 + 0.5 * uHeat + 1.5 * uBurst);",
    // Jirones que suben alrededor de la nube.
    "  float wn = wisps(p * 0.85 + vec2(0.0, t * 0.05), t);",
    "  float wa = smoothstep(0.45, 0.8, wn) * exp(-pow(max(shape - 0.6, 0.0) / 1.4, 2.0)) * 0.5;",
    "  vec3 wc = mix(vec3(0.012), vec3(0.12, 0.114, 0.108), smoothstep(0.55, 0.85, wn));",
    "  float vis = uIn * (1.0 - uOut);",
    "  a *= vis;",
    "  wa *= vis;",
    // Resto de la pantalla: neblina negra que respira (no un velo plano).
    "  vec2 sp = px / uRes.y;",
    "  float haze = fbm3(sp * 2.4 + vec2(t * 0.03, -t * 0.05));",
    "  float dim = clamp(uDim * vis * (0.85 + 0.3 * (haze - 0.4)), 0.0, 0.95);",
    "  vec3 outC = wc * wa;",
    "  float outA = wa + dim * (1.0 - wa);",
    "  outC = col * a + outC * (1.0 - a);",
    "  outA = a + outA * (1.0 - a);",
    // Brasas: encima de todo, sumando luz (sobre todo dentro de la nube).
    "  float em = embers(sp, t) * (0.2 + 0.8 * uHeat + 1.2 * uBurst) * (0.3 + 0.7 * body) * vis;",
    "  em = min(em, 1.0);",
    "  outC += mix(vec3(1.0, 0.5, 0.1), vec3(1.0, 0.86, 0.5), em) * em;",
    "  outA = min(1.0, outA + em * 0.5);",
    "  gl_FragColor = vec4(outC, outA);",
    "}"
  ].join("\n");

  function program(gl) {
    function shader(type, source) {
      var s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        if (window.console) console.warn("[dark-smoke] shader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var vs = shader(gl.VERTEX_SHADER, VS);
    var fs = shader(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      if (window.console) console.warn("[dark-smoke] program:", gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function speedMs(x) {
    var speed = window.OssuaryGameSpeed;
    return speed && typeof speed.ms === "function" ? speed.ms(x) : x;
  }

  // Sin WebGL: velo negro con un claro alrededor del punto.
  function fallback(o) {
    var el = document.createElement("div");
    el.className = "dark-smoke dark-smoke--flat";
    el.setAttribute("aria-hidden", "true");
    cover(el);
    el.style.background = "radial-gradient(circle " + Math.round(o.radius * 2.2) + "px at " + Math.round(o.x) + "px " + Math.round(o.y) + "px, rgba(0, 0, 0, 0.94) 0%, rgba(0, 0, 0, 0.88) 45%, rgba(0, 0, 0, " + o.dim + ") 100%)";
    el.style.opacity = "0";
    el.style.transition = "opacity " + speedMs(IN_MS) + "ms ease-out";
    document.body.appendChild(el);
    void el.offsetWidth;
    el.style.opacity = "1";
    return {
      pulse: function () {},
      heat: function () {},
      move: function () {},
      hide: function (msOut) {
        el.style.transition = "opacity " + speedMs(msOut == null ? 700 : msOut) + "ms ease-in";
        el.style.opacity = "0";
        return new Promise(function (resolve) {
          window.setTimeout(function () { el.remove(); resolve(); }, speedMs(msOut == null ? 700 : msOut));
        });
      }
    };
  }

  // o: { x, y, radius (px, viewport), dim (0-1, lo oscuro del resto),
  // light ([r, g, b] de la luz de las cifras) }.
  function show(o) {
    o = Object.assign({ x: window.innerWidth / 2, y: window.innerHeight / 2, radius: 160, dim: 0.72, light: [1.0, 0.68, 0.2] }, o || {});
    var canvas = document.createElement("canvas");
    canvas.className = "dark-smoke";
    canvas.setAttribute("aria-hidden", "true");
    var gl = null;
    try {
      gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false });
    } catch (e) {
      gl = null;
    }
    var prog = gl ? program(gl) : null;
    if (!prog) return fallback(o);
    cover(canvas);
    document.body.appendChild(canvas);

    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ["uRes", "uCenter", "uR", "uTime", "uIn", "uOut", "uBurst", "uHeat", "uDim", "uLight"].forEach(function (name) {
      u[name] = gl.getUniformLocation(prog, name);
    });
    gl.uniform1f(u.uDim, o.dim);
    gl.uniform3fv(u.uLight, o.light);
    gl.clearColor(0, 0, 0, 0);

    var w = 0, h = 0;
    function size() {
      var nw = Math.max(2, Math.round(window.innerWidth * RES));
      var nh = Math.max(2, Math.round(window.innerHeight * RES));
      if (nw === w && nh === h) return;
      w = nw;
      h = nh;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }

    var center = { x: o.x, y: o.y };
    var t0 = 0, last = 0;
    var inStart = 0;
    var burst = 0;
    var heat = 0, heatTo = 0;
    var outStart = 0, outMs = 0, outDone = null;
    var dead = false;
    var raf = 0;
    // Arranca con unos segundos de ventaja: las volutas ya enroscadas.
    var seed = 3 + Math.random() * 20;

    function frame(now) {
      if (dead) return;
      if (!t0) {
        t0 = now;
        last = now;
        inStart = now;
      }
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      burst *= Math.exp(-dt * 3.2);
      heat += (heatTo - heat) * (1 - Math.exp(-dt * 5));
      size();
      var pIn = Math.min(1, (now - inStart) / Math.max(1, speedMs(IN_MS)));
      var eIn = 1 - Math.pow(1 - pIn, 3);
      var pOut = outStart ? Math.min(1, (now - outStart) / Math.max(1, outMs)) : 0;
      var eOut = pOut * pOut * (3 - 2 * pOut);
      gl.uniform2f(u.uRes, w, h);
      gl.uniform2f(u.uCenter, center.x * RES, center.y * RES);
      gl.uniform1f(u.uR, Math.max(20, o.radius * RES));
      gl.uniform1f(u.uTime, seed + (now - t0) / 1000);
      gl.uniform1f(u.uIn, eIn);
      gl.uniform1f(u.uOut, eOut);
      gl.uniform1f(u.uBurst, burst);
      gl.uniform1f(u.uHeat, heat);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (outStart && pOut >= 1) {
        dispose();
        if (outDone) outDone();
        return;
      }
      raf = window.requestAnimationFrame(frame);
    }

    function dispose() {
      if (dead) return;
      dead = true;
      if (raf) window.cancelAnimationFrame(raf);
      var lose = gl.getExtension("WEBGL_lose_context");
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      if (lose) lose.loseContext();
      canvas.remove();
    }

    canvas.addEventListener("webglcontextlost", function (event) {
      event.preventDefault();
      if (!dead) {
        dead = true;
        canvas.remove();
        if (outDone) outDone();
      }
    });

    size();
    raf = window.requestAnimationFrame(frame);

    return {
      pulse: function (strength) {
        burst = Math.max(burst, strength == null ? 1 : strength);
      },
      heat: function (v) {
        heatTo = Math.max(0, Math.min(1, Number(v) || 0));
      },
      move: function (x, y) {
        center.x = x;
        center.y = y;
      },
      hide: function (msOut) {
        if (outStart || dead) return Promise.resolve();
        outMs = speedMs(msOut == null ? 700 : msOut);
        outStart = window.performance ? window.performance.now() : Date.now();
        return new Promise(function (resolve) {
          outDone = resolve;
          // Por si la pestana esta en segundo plano y no hay fotogramas.
          window.setTimeout(function () {
            if (!dead) dispose();
            resolve();
          }, outMs + 600);
        });
      }
    };
  }

  window.OssuaryDarkSmoke = { show: show };
})();
