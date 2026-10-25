(function () {
  "use strict";

  // Carteles de entrada de los bonus, del usuario (peticiones 2026-10-18): en
  // la pantalla del PLAY, sin video (el video se reserva para mas adelante).
  //   judgment  - "THE JUDGMENT · Superbonus" (Super Bonus "El Juicio"): cae
  //               en vez de las letras SUPER BONUS (el-juicio-fall.js#superSlam)
  //               y la entrada (game.js#showBonusIntroPoster) monta el mismo
  //               cartel en la misma caja y quita aquel sin que se note.
  //   execution - "EXECUTION Bonus" (bonus normal): la guillotina cae en la
  //               pantalla del PLAY (drop) y el humo sale de golpe.
  // Misma caja para todos (variables de bonus-poster.css segun el tipo),
  // velo y relampagos detras, y los movimientos que se repiten llevan la fase
  // de un reloj comun (dos copias montadas en momentos distintos van a la
  // par).
  //
  // Lo de fuera se mueve en WebGL (createSmoke; antes, capas recortadas que
  // dejaban ver sus cortes y el fondo al moverse): la imagen entera y un
  // mapa de flujo (tools/bake-bonus-poster.js); lo quieto (letras, guadana,
  // guillotina) no se mueve y lo de fuera se deforma sin cortes ni huecos.
  //   Execution: el humo sube, se enrosca, se espesa y aclara y suelta
  //              volutas grises que suben y se deshacen.
  //   Juicio:    la sangre se arrastra hacia fuera y hacia abajo, ondula
  //              como un liquido y suelta una neblina roja; detras del
  //              cartel sube humo rojo oscuro que se enrosca.
  // Sin WebGL, la imagen quieta.

  // smoke: rect, donde va el cartel dentro del lienzo del humo (x, y, ancho,
  // alto en partes de el; lo da el bake: el lienzo sobresale para las
  // volutas); center, centro de lo quieto en el cartel; tint, color de las
  // volutas (r, g, b) y lo que suben por segundo; flow, hacia donde va (hacia
  // fuera, hacia abajo (+) o arriba (-), cuanto lo tuerce la turbulencia,
  // recorrido); feel, turbulencia, cuanto se espesa y aclara, fuerza de las
  // volutas y segundos de cada vuelta del flujo; back, el humo de detras del
  // cartel (r, g, b, fuerza; 0 sin el); pace, lo rapido que se agita (1 el
  // humo del Execution; la sangre del Juicio, mas viva).
  var KINDS = {
    judgment: {
      base: "assets/super_bonus/judgment_",
      smoke: {
        rect: [0.0690, 0.3144, 0.8620, 0.5712],
        center: [0.5159, 0.5237],
        tint: [0.62, 0.06, 0.035, 0.11],
        flow: [1.4, 0.6, 1.5, 0.045],
        feel: [0.12, 0.35, 0.9, 3.2],
        back: [0.38, 0.065, 0.045, 0.8],
        pace: 2.6
      },
      glowMs: 1700
    },
    execution: {
      base: "assets/bonus_intro/execution_",
      smoke: {
        rect: [0.0690, 0.2204, 0.8619, 0.7353],
        center: [0.5042, 0.5378],
        tint: [0.46, 0.43, 0.40, 0.16],
        flow: [0.9, -1.0, 2.4, 0.04],
        feel: [0.08, 0.6, 0.75, 3.4],
        back: [0, 0, 0, 0],
        pace: 1
      },
      glowMs: 2100
    },
    // "RAVEN Spins" (cadena del cuervo, src/ui/raven-banner.js): sale un
    // momento, sin PLAY. Los bordes y goterones de la mancha negra se
    // arrastran, detras sube humo oscuro tirando a sangre (sin volutas: sobre
    // la mancha eran un parche gris) y las plumas sueltas van aparte (atlas
    // raven_feathers.webp) y caen.
    raven: {
      base: "assets/raven_bonus/raven_",
      smoke: {
        rect: [0.0533, 0.2417, 0.8933, 0.6893],
        center: [0.4975, 0.5333],
        tint: [0, 0, 0, 0],
        flow: [1.0, 0.5, 1.6, 0.045],
        feel: [0.1, 0.4, 0, 3.0],
        back: [0.26, 0.05, 0.045, 0.75],
        pace: 1.6
      },
      // x, y, ancho, alto (partes del cartel) y donde empieza en el atlas
      // (parte de su ancho); lo da el bake.
      feathers: [
        [0.0071, 0.292, 0.0441, 0.1653, 0],
        [0, 0.644, 0.0661, 0.2147, 0.1008],
        [0.8571, 0.6973, 0.0597, 0.1507, 0.2504],
        [0.0938, 0.864, 0.1166, 0.1013, 0.3858],
        [0.705, 0.868, 0.0796, 0.0933, 0.6472],
        [0.8721, 0.8773, 0.0768, 0.0613, 0.8268]
      ],
      // Pixeles del lienzo del cartel y del atlas.
      featherCanvas: [1407, 750],
      featherAtlas: [635, 161],
      glowMs: 1500
    }
  };
  // Relampagos: un ritmo cerca y otro lejos (ms de cada vuelta).
  var BOLT_NEAR_MS = 9700;
  var BOLT_FAR_MS = 14300;

  function art(src) {
    var r = window.OssuarySymbolRenderer;
    return r && r.residentArtUrl ? r.residentArtUrl(src) : src;
  }

  function keepResident(src) {
    var r = window.OssuarySymbolRenderer;
    return r && r.preloadArt ? r.preloadArt(src) : Promise.resolve(false);
  }

  function sources(kind) {
    var k = KINDS[kind];
    if (!k) return [];
    var list = [k.base + "full.webp", k.base + "flow.webp"];
    if (k.feathers) list.push(k.base + "feathers.webp");
    return list;
  }

  // Sin tipo: todos.
  function preload(kind) {
    var list = kind ? sources(kind) : Object.keys(KINDS).reduce(function (all, name) { return all.concat(sources(name)); }, []);
    return Promise.all(list.map(keepResident));
  }

  function div(className, parent) {
    var el = document.createElement("div");
    el.className = className;
    if (parent) parent.appendChild(el);
    return el;
  }

  function img(src, className, parent) {
    var el = document.createElement("img");
    el.className = className;
    el.alt = "";
    el.draggable = false;
    el.decoding = "sync";
    el.src = art(src);
    parent.appendChild(el);
    return el;
  }

  // Fase del reloj comun. cycle = vuelta entera de la animacion.
  function syncPhase(el, ms, cycle) {
    var now = window.performance ? window.performance.now() : Date.now();
    el.style.animationDuration = ms + "ms";
    el.style.animationDelay = -Math.round(now % cycle) + "ms";
  }

  // ---- Humo (WebGL) ------------------------------------------------------
  // Un triangulo que tapa el lienzo; todo en el fragment shader. Texturas:
  // uArt, el cartel entero (alfa premultiplicado); uFlow, el mapa de flujo
  // (R cuanto se mueve, G de donde salen volutas, B lo de fuera), que cubre
  // todo el lienzo.
  //  - Lo de fuera avanza (flow map: dos copias que avanzan desfasadas y se
  //    cruzan, asi avanza sin saltos; el humo sube, la sangre se arrastra
  //    hacia fuera y abajo) y se enrosca u ondula (turbulencia que va con el).
  //    Cada pixel lee el cartel desplazado lo que diga R, que es 0 en lo
  //    quieto y crece despacio: es la misma imagen deformada, sin cortes
  //    ni huecos.
  //  - Se espesa y se aclara a ratos (densidad con ruido).
  //  - Humo de detras (uBack, solo el Juicio): ruido que sube despacio y se
  //    enrosca alrededor del cartel, mas alto por arriba; va debajo del
  //    cartel (asoma alrededor y por los huecos).
  //  - Volutas (o neblina roja): ruido que sube y se enrosca, donde diga G
  //    (arrastrado hacia arriba en el bake), y se deshace al subir y antes
  //    del borde del lienzo.
  //  - Entrada (drop): lo de fuera (B) sale desde el centro (uScale), se
  //    enciende (uIn) y con el golpe (uBurst) el humo se agita mas y suelta
  //    mas volutas.
  var SMOKE_VS = "attribute vec2 aPos;\nvoid main() { gl_Position = vec4(aPos, 0.0, 1.0); }";
  var SMOKE_FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform sampler2D uArt;",
    "uniform sampler2D uFlow;",
    "uniform vec2 uRes;",
    "uniform vec4 uRect;",
    "uniform float uAspect;",
    "uniform float uTime;",
    "uniform float uPace;",
    "uniform float uIn;",
    "uniform float uScale;",
    "uniform float uBurst;",
    "uniform vec2 uCenter;",
    "uniform vec4 uTint;",
    "uniform vec4 uFlowA;",
    "uniform vec4 uFlowB;",
    "uniform vec4 uBack;",
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
    "  for (int i = 0; i < 4; i++) {",
    "    v += a * noise(p);",
    "    p = ROT * p * 2.03 + 7.1;",
    "    a *= 0.5;",
    "  }",
    "  return v;",
    "}",
    "float fbm2(vec2 p) { return 0.5 * noise(p) + 0.25 * noise(ROT * p * 2.03 + 7.1); }",
    "vec4 art(vec2 c) { return texture2D(uArt, (c - uRect.xy) / uRect.zw, -0.5); }",
    "void main() {",
    "  vec2 c = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);",
    "  vec3 fl = texture2D(uFlow, c).rgb;",
    "  vec2 k = vec2(uAspect, 1.0);",
    "  vec2 p = c * k;",
    "  float t = uTime;",
    "  float tp = t * uPace;",
    "  vec2 cs = uCenter + (c - uCenter) / mix(1.0, uScale, fl.b);",
    "  float amp = fl.r * (1.0 + 0.8 * uBurst);",
    "  vec4 col;",
    "  if (amp > 0.003) {",
    "    vec2 q = p * 1.8 - vec2(0.0, tp * 0.07 * uFlowA.y);",
    "    vec2 turb = vec2(fbm2(q + vec2(0.0, tp * 0.05)), fbm2(q + vec2(5.2, 1.3) + vec2(tp * 0.03, 0.0))) - 0.375;",
    "    vec2 dir = vec2((c.x - uCenter.x) * uFlowA.x, uFlowA.y) + turb * uFlowA.z;",
    "    float ph = t / uFlowB.w + fbm2(p * 1.3 + 3.0) * 2.6;",
    "    float ph0 = fract(ph);",
    "    float ph1 = fract(ph + 0.5);",
    "    float len = uFlowA.w * amp;",
    "    vec2 b = cs - turb * uFlowB.x * amp / k;",
    "    vec4 c0 = art(b - dir * (ph0 - 0.5) * len / k);",
    "    vec4 c1 = art(b - dir * (ph1 - 0.5) * len / k);",
    "    col = mix(c0, c1, abs(2.0 * ph0 - 1.0));",
    "    col *= 1.0 + amp * uFlowB.y * (fbm(p * 4.0 + vec2(tp * 0.04, tp * 0.12)) - 0.47);",
    "    col = min(col, vec4(1.0));",
    "  } else {",
    "    col = art(cs);",
    "  }",
    "  col *= mix(1.0, uIn, fl.b);",
    "  vec2 e = smoothstep(vec2(0.0), vec2(0.06, 0.1), c) * smoothstep(vec2(0.0), vec2(0.06, 0.03), 1.0 - c);",
    "  if (uBack.a > 0.0) {",
    // En altos del cartel, desde su centro; caja algo menor que el cartel,
    // y el humo llega mucho mas lejos por arriba que por abajo.
    "    vec2 bp = (cs - uRect.xy - uRect.zw * vec2(0.5, 0.55)) * vec2(uAspect, 1.0) / uRect.w;",
    "    vec2 bd = max(abs(bp) - vec2(0.41 * uRect.z * uAspect / uRect.w, 0.2), 0.0);",
    "    bd.y *= bp.y < 0.0 ? 0.42 : 1.7;",
    "    float bm = exp(-dot(bd, bd) * 7.0);",
    "    if (bm > 0.004) {",
    "      vec2 bq = bp * vec2(1.9, 2.4) + vec2(0.0, t * 0.55);",
    "      vec2 bw = vec2(fbm2(bq * 0.6 + vec2(t * 0.12, 0.0)), fbm2(bq * 0.6 + vec2(3.7, -t * 0.15))) - 0.375;",
    "      float bn = fbm(bq + bw * 2.6);",
    "      float ba = clamp(smoothstep(0.4, 0.7, bn) * (0.7 + 0.6 * fbm(bq * 2.7 + bw + 11.0)) * bm * uBack.a * (1.0 + 0.7 * uBurst) * uIn * e.x * e.y, 0.0, 1.0);",
    "      vec3 bc = uBack.rgb * (0.35 + 1.5 * smoothstep(0.55, 0.82, bn));",
    "      col += vec4(bc * ba, ba) * (1.0 - col.a);",
    "    }",
    "  }",
    "  float emit = texture2D(uFlow, cs).g;",
    "  if (emit > 0.004) {",
    "    vec2 wq = p * vec2(3.2, 2.2) + vec2(0.0, t * uTint.w);",
    "    vec2 ww = vec2(fbm2(wq * 0.7 + vec2(t * 0.05, 0.0)), fbm2(wq * 0.7 + vec2(4.3, -t * 0.04))) - 0.375;",
    "    float n = fbm(wq + ww * 2.4);",
    "    float wisp = smoothstep(0.38, 0.72, n) * (0.7 + 0.6 * fbm(wq * 2.7 + 9.0));",
    "    float wa = clamp(wisp * emit * (uFlowB.z + 0.6 * uBurst) * uIn * e.x * e.y, 0.0, 1.0);",
    "    col = vec4(uTint.rgb * (0.75 + 0.5 * n) * wa, wa) + col * (1.0 - wa);",
    "  }",
    "  gl_FragColor = col;",
    "}"
  ].join("\n");

  function smokeProgram(gl) {
    function shader(type, source) {
      var s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        if (window.console) console.warn("[bonus-poster] shader:", gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    }
    var vs = shader(gl.VERTEX_SHADER, SMOKE_VS);
    var fs = shader(gl.FRAGMENT_SHADER, SMOKE_FS);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      if (window.console) console.warn("[bonus-poster] program:", gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  // Entrada (drop): escala de lo de fuera tras el golpe (como salia antes).
  function entryScale(e) {
    if (e < 0.42) return 0.55 + (1.07 - 0.55) * (1 - Math.pow(1 - e / 0.42, 3));
    if (e < 0.72) return 1.07 + (0.985 - 1.07) * ((e - 0.42) / 0.3);
    return 0.985 + 0.015 * ((e - 0.72) / 0.28);
  }

  // Ultima entrada (enter) de cada tipo: una copia montada poco despues (la
  // pantalla del PLAY recogiendo el cartel de la caida del Super) sigue en
  // el mismo punto de la salida, como la otra.
  var lastEntry = {};
  var ENTRY_MS = 4000;

  // Lienzo del humo sobre el cartel (sobresale lo que diga rect). still: la
  // imagen quieta, que se ve hasta que pinta el lienzo (y si no hay WebGL o
  // se pierde). Devuelve { canvas, enter(delayMs), onShown(fn) } o null.
  function createSmoke(parent, kind, k, still) {
    var r = k.smoke.rect;
    var canvas = document.createElement("canvas");
    canvas.className = "bonus-poster__smoke";
    canvas.style.left = (-r[0] / r[2] * 100).toFixed(3) + "%";
    canvas.style.top = (-r[1] / r[3] * 100).toFixed(3) + "%";
    canvas.style.width = (100 / r[2]).toFixed(3) + "%";
    canvas.style.height = (100 / r[3]).toFixed(3) + "%";
    var gl = null;
    var attrs = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false };
    try {
      gl = canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs);
    } catch (e) {
      gl = null;
    }
    if (!gl) return null;
    var prog = smokeProgram(gl);
    if (!prog) {
      var release = gl.getExtension("WEBGL_lose_context");
      if (release) release.loseContext();
      return null;
    }
    var webgl2 = typeof window.WebGL2RenderingContext !== "undefined" && gl instanceof window.WebGL2RenderingContext;
    parent.appendChild(canvas);
    var flowImg = img(k.base + "flow.webp", "bonus-poster__flow", parent);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    gl.disable(gl.BLEND);
    var u = {};
    ["uArt", "uFlow", "uRes", "uRect", "uAspect", "uTime", "uIn", "uScale", "uBurst", "uCenter", "uTint", "uFlowA", "uFlowB", "uBack", "uPace"].forEach(function (name) {
      u[name] = gl.getUniformLocation(prog, name);
    });
    gl.uniform1i(u.uArt, 0);
    gl.uniform1i(u.uFlow, 1);
    gl.uniform4f(u.uRect, r[0], r[1], r[2], r[3]);
    gl.uniform2f(u.uCenter, r[0] + k.smoke.center[0] * r[2], r[1] + k.smoke.center[1] * r[3]);
    gl.uniform4fv(u.uTint, k.smoke.tint);
    gl.uniform4fv(u.uFlowA, k.smoke.flow);
    gl.uniform4fv(u.uFlowB, k.smoke.feel);
    gl.uniform4fv(u.uBack, k.smoke.back);
    gl.uniform1f(u.uPace, k.smoke.pace);
    canvas.style.visibility = "hidden";
    var textures = [];
    var ready = false;
    var dead = false;
    var shown = false;
    var waiting = [];
    var raf = 0;
    var entryAt = -1;
    var clock = window.performance ? window.performance.now() : Date.now();
    if (lastEntry[kind] && clock - lastEntry[kind] < ENTRY_MS) entryAt = lastEntry[kind];

    function showNow() {
      shown = true;
      var list = waiting;
      waiting = [];
      list.forEach(function (fn) { fn(); });
    }

    function texture(unit, image, premultiply, data) {
      var tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, data ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // Con WebGL2, mipmaps (el cartel se ve mas pequeno que la imagen).
      if (webgl2 && !data) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      textures.push(tex);
    }

    function upload() {
      if (!(still.complete && still.naturalWidth && flowImg.complete && flowImg.naturalWidth)) return false;
      texture(0, still, true, false);
      texture(1, flowImg, false, true);
      ready = true;
      return true;
    }

    function fallback() {
      dead = true;
      window.cancelAnimationFrame(raf);
      canvas.style.visibility = "hidden";
      still.style.visibility = "";
      if (!shown) showNow();
    }

    function dispose() {
      dead = true;
      window.cancelAnimationFrame(raf);
      if (gl.isContextLost()) return;
      textures.forEach(function (tex) { gl.deleteTexture(tex); });
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      var lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    }

    canvas.addEventListener("webglcontextlost", function (event) {
      event.preventDefault();
      if (!dead) fallback();
    });

    function frame(now) {
      if (dead) return;
      // Fuera de la pagina (se quito el cartel): se libera la GPU.
      if (!canvas.isConnected) {
        dispose();
        return;
      }
      raf = window.requestAnimationFrame(frame);
      if (!ready && !upload()) return;
      var cssW = canvas.clientWidth;
      var cssH = canvas.clientHeight;
      if (!cssW || !cssH) return;
      // Como mucho, la resolucion de la imagen.
      var scale = Math.min(window.devicePixelRatio || 1, 2, still.naturalWidth / r[2] / cssW);
      var w = Math.max(1, Math.round(cssW * scale));
      var h = Math.max(1, Math.round(cssH * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      var vIn = 1;
      var vScale = 1;
      var vBurst = 0;
      if (entryAt >= 0) {
        var since = now - entryAt;
        if (since < 0) {
          vIn = 0;
          vScale = 0.55;
        } else if (since < 900) {
          vIn = Math.min(1, since / 260);
          vScale = entryScale(since / 900);
        }
        if (since >= 0) vBurst = Math.exp(-since / 650);
        if (since > ENTRY_MS) entryAt = -1;
      }
      gl.uniform2f(u.uRes, w, h);
      gl.uniform1f(u.uAspect, cssW / cssH);
      gl.uniform1f(u.uTime, (now / 1000) % 3600);
      gl.uniform1f(u.uIn, vIn);
      gl.uniform1f(u.uScale, vScale);
      gl.uniform1f(u.uBurst, vBurst);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!shown) {
        canvas.style.visibility = "";
        still.style.visibility = "hidden";
        showNow();
      }
    }
    raf = window.requestAnimationFrame(frame);

    return {
      canvas: canvas,
      // Lo de fuera sale de golpe dentro de delayMs (el golpe); hasta
      // entonces, solo lo quieto (tampoco la imagen quieta, que lo lleva).
      enter: function (delayMs) {
        entryAt = (window.performance ? window.performance.now() : Date.now()) + (delayMs || 0);
        lastEntry[kind] = entryAt;
        if (!shown) still.style.visibility = "hidden";
      },
      // fn cuando el lienzo ya ha pintado (o se ha quedado la imagen quieta).
      onShown: function (fn) {
        if (shown) fn();
        else waiting.push(fn);
      }
    };
  }

  // parent: caja que ocupa toda la pantalla (position fixed o absolute sobre
  // ella). Devuelve { root, veil, sky, logo, glow, core, smoke } o null; el
  // velo y el cielo salen enteros (quien lo monta los funde si quiere).
  // sky: los relampagos de detras (antes, rayos que giraban; fuera por
  // peticion del usuario, 2026-10-18): a ratos el cielo se enciende dos o
  // tres veces seguidas, cerca y lejos, con la fase del reloj comun; strike()
  // da uno fuerte. core: el cartel entero (lo que cae); smoke: lo de fuera
  // que se mueve (null sin WebGL: la imagen quieta).
  function build(parent, kind, options) {
    var k = KINDS[kind];
    if (!k) return null;
    var opts = options || {};
    var root = div("bonus-poster bonus-poster-kind--" + kind + (opts.className ? " " + opts.className : ""), parent);
    root.setAttribute("aria-hidden", "true");
    var veil = div("bonus-poster__veil", root);
    var sky = div("bonus-poster__sky", root);
    syncPhase(div("bonus-poster__bolt bonus-poster__bolt--near", sky), BOLT_NEAR_MS, BOLT_NEAR_MS);
    syncPhase(div("bonus-poster__bolt bonus-poster__bolt--far", sky), BOLT_FAR_MS, BOLT_FAR_MS);
    var hit = div("bonus-poster__bolt bonus-poster__bolt--hit", sky);
    var logo = div("bonus-poster__logo", root);
    var glow = div("bonus-poster__glow", logo);
    syncPhase(glow, k.glowMs, k.glowMs * 2);
    var art = div("bonus-poster__art", logo);
    var still = img(k.base + "full.webp", "bonus-poster__layer bonus-poster__still", art);
    var smoke = createSmoke(art, kind, k, still);
    var feathers = k.feathers ? buildFeathers(art, k) : [];
    return { root: root, veil: veil, sky: sky, hit: hit, logo: logo, glow: glow, core: art, smoke: smoke, feathers: feathers };
  }

  // Plumas sueltas del cartel (las que flotaban sobre el croma, sin nada
  // detras: al moverse no dejan hueco). Cada una en su sitio, recortada del
  // atlas, y cayendo despacio con vaiven, cada una a su ritmo.
  function buildFeathers(parent, k) {
    var cw = k.featherCanvas[0], ch = k.featherCanvas[1];
    var aw = k.featherAtlas[0], ah = k.featherAtlas[1];
    return k.feathers.map(function (f, i) {
      var box = div("bonus-poster__feather", parent);
      box.style.left = (f[0] * 100).toFixed(3) + "%";
      box.style.top = (f[1] * 100).toFixed(3) + "%";
      box.style.width = (f[2] * 100).toFixed(3) + "%";
      box.style.height = (f[3] * 100).toFixed(3) + "%";
      var sheet = img(k.base + "feathers.webp", "bonus-poster__feather-sheet", box);
      var fw = f[2] * cw, fh = f[3] * ch;
      sheet.style.width = (aw / fw * 100).toFixed(3) + "%";
      sheet.style.height = (ah / fh * 100).toFixed(3) + "%";
      sheet.style.left = (-f[4] * aw / fw * 100).toFixed(3) + "%";
      // Cae entre un 9 y un 16% de su alto de cartel en 5 s, se mece de un
      // lado a otro y gira con el vaiven.
      var side = i % 2 ? 1 : -1;
      var fall = (0.09 + 0.07 * ((i * 37) % 10) / 10) / f[3] * 100;
      var sway = (40 + (i * 23) % 50) * side;
      var spin = (8 + (i * 13) % 10) * side;
      box.animate([
        { transform: "translate(0, 0) rotate(0deg)" },
        { transform: "translate(" + sway + "%, " + (fall * 0.3).toFixed(1) + "%) rotate(" + spin + "deg)", offset: 0.3 },
        { transform: "translate(" + (-sway * 0.4).toFixed(1) + "%, " + (fall * 0.65).toFixed(1) + "%) rotate(" + (-spin * 0.6).toFixed(1) + "deg)", offset: 0.65 },
        { transform: "translate(" + (sway * 0.7).toFixed(1) + "%, " + fall.toFixed(1) + "%) rotate(" + (spin * 0.8).toFixed(1) + "deg)" }
      ], { duration: 5000, easing: "ease-in-out", fill: "forwards" });
      return box;
    });
  }

  // Relampago al golpe: fogonazo, se va, otro y uno lejano.
  function strike(p, delayMs) {
    if (!p || !p.hit) return;
    p.hit.animate([
      { opacity: 0 },
      { opacity: 1, offset: 0.04 },
      { opacity: 0.12, offset: 0.12 },
      { opacity: 0.85, offset: 0.2 },
      { opacity: 0, offset: 0.36 },
      { opacity: 0.35, offset: 0.5 },
      { opacity: 0, offset: 0.62 },
      { opacity: 0 }
    ], { duration: 1100, delay: delayMs || 0, easing: "linear" });
  }

  // Entrada por su cuenta (sin caida delante): lo quieto cae desde arriba y
  // rebota; al golpe, lo de fuera sale de golpe desde detras, la brasa se
  // enciende con un relampago y el cartel tiembla. onImpact: al golpe.
  var IMPACT_MS = 390;
  function drop(p, options) {
    var opts = options || {};
    p.core.animate([
      { transform: "translateY(-150%)", opacity: 0, easing: "cubic-bezier(.55,0,.9,.45)" },
      { transform: "translateY(-120%)", opacity: 1, offset: 0.12, easing: "cubic-bezier(.55,0,.9,.45)" },
      { transform: "none", offset: 0.56, easing: "cubic-bezier(.2,.7,.4,1)" },
      { transform: "translateY(-3.5%)", offset: 0.72, easing: "cubic-bezier(.5,0,.8,.5)" },
      { transform: "none", offset: 0.86 },
      { transform: "translateY(-0.8%)", offset: 0.93 },
      { transform: "none", opacity: 1 }
    ], { duration: 700 });
    if (p.smoke) p.smoke.enter(IMPACT_MS);
    // Un solo fotograma clave: acaban en lo que diga el CSS (los latidos
    // siguen por donde iban).
    p.glow.animate([{ opacity: 0 }], { duration: 600, delay: IMPACT_MS, fill: "backwards" });
    strike(p, IMPACT_MS);
    p.logo.animate([
      { transform: "none" },
      { transform: "translate(-0.5%, 0.9%)" },
      { transform: "translate(0.45%, -0.5%)" },
      { transform: "translate(-0.25%, 0.3%)" },
      { transform: "none" }
    ], { duration: 280, delay: IMPACT_MS, easing: "linear" });
    return window.setTimeout(function () {
      if (opts.onImpact) opts.onImpact();
    }, IMPACT_MS);
  }

  // En memoria antes de que haga falta (sin prisa).
  window.setTimeout(function () { preload(); }, 7000);

  window.OssuaryBonusPoster = {
    build: build,
    drop: drop,
    strike: strike,
    preload: preload
  };
})();
