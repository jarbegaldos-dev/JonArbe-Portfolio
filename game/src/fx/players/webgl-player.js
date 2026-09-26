(function () {
  "use strict";

  // Player generico para efectos type:"webgl". Por ahora solo lo usa
  // skull-eyes-glow, pero sigue el mismo contrato que cualquier otro
  // player (mount/activate/deactivate/dispose) para que anadir un
  // segundo efecto WebGL en el futuro sea config, no arquitectura
  // nueva (ver FX_ARCHITECTURE.md, seccion 13).
  //
  // El shader nacio como port 1:1 de OssuaryRemotionLab (donde se
  // disena/valida a 1024x1024). Tras el "readability pass" de
  // 2026-06-26 deja de serlo a proposito: en el juego real el ojo se
  // ve a ~30-40px de diametro, no a tamano de laboratorio, y a esa
  // escala el detalle fino (3 capas de humo, cavidades, remolinos,
  // estrellas) era invisible - puro coste de GPU sin beneficio
  // perceptual. Este archivo ahora prioriza legibilidad a tamano real:
  // nucleo mas grande/claro, halo con presencia, respiracion de brillo
  // perceptible, contorno mas limpio (menos picos finos = menos
  // aliasing a baja resolucion). El laboratorio sigue intacto como
  // referencia a gran escala; este archivo ya no se porta 1:1 desde
  // ahi.

  var VERTEX_SHADER = [
    "attribute vec2 aPosition;",
    "void main() {",
    "  gl_Position = vec4(aPosition, 0.0, 1.0);",
    "}"
  ].join("\n");

  var FRAGMENT_SHADER = [
    "precision highp float;",
    "",
    "uniform vec2 uResolution;",
    "uniform float uTime;",
    "uniform float uSeed;",
    "uniform float uDensity;",
    "uniform float uTurbulence;",
    "uniform float uLobes;",
    "uniform float uCoreBrightness;",
    "uniform float uIntensity;",
    "uniform float uFireForce;",
    "uniform float uBreatheSpeed;",
    "",
    "float hash(vec2 p) {",
    "  p = fract(p * vec2(123.34, 456.21));",
    "  p += dot(p, p + 45.32);",
    "  return fract(p.x * p.y);",
    "}",
    "",
    "vec2 cellHash(vec2 p) {",
    "  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));",
    "  return fract(sin(p) * 43758.5453);",
    "}",
    "",
    "float vnoise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  float a = hash(i);",
    "  float b = hash(i + vec2(1.0, 0.0));",
    "  float c = hash(i + vec2(0.0, 1.0));",
    "  float d = hash(i + vec2(1.0, 1.0));",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;",
    "}",
    "",
    "float fbm(vec2 p) {",
    "  float v = 0.0;",
    "  float amp = 0.5;",
    "  for (int i = 0; i < 4; i++) {",
    "    v += amp * vnoise(p);",
    "    p = p * 2.03 + 17.0;",
    "    amp *= 0.5;",
    "  }",
    "  return v;",
    "}",
    "",
    "vec2 warp(vec2 p, vec2 phase, float strength) {",
    "  vec2 q = vec2(fbm(p + phase), fbm(p + phase + vec2(5.2, 1.3)));",
    "  return p + strength * q;",
    "}",
    "",
    "float cellEdge(vec2 p, vec2 phase) {",
    "  vec2 ip = floor(p);",
    "  vec2 fp = fract(p);",
    "  float d1 = 8.0;",
    "  float d2 = 8.0;",
    "  for (int y = -1; y <= 1; y++) {",
    "    for (int x = -1; x <= 1; x++) {",
    "      vec2 g = vec2(float(x), float(y));",
    "      vec2 jitter = cellHash(ip + g);",
    "      jitter = 0.5 + 0.5 * sin(6.2831 * jitter + phase.x + phase.y);",
    "      vec2 diff = g + jitter - fp;",
    "      float d = length(diff);",
    "      if (d < d1) {",
    "        d2 = d1;",
    "        d1 = d;",
    "      } else if (d < d2) {",
    "        d2 = d;",
    "      }",
    "    }",
    "  }",
    "  return d2 - d1;",
    "}",
    "",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / uResolution.xy;",
    "  vec2 p = (uv - 0.5) * 2.0;",
    "  float r = length(p);",
    "  float ang = atan(p.y, p.x);",
    "",
    "  float intensityNorm = clamp((uIntensity - 2.0) / 3.0, 0.0, 1.0);",
    "",
    "  // Respiracion: pulso de brillo de TODO el ojo (nucleo + halo a la",
    "  // vez), no solo del nucleo. Es lo que de verdad se percibe como",
    "  // 'respirando' a 30-40px - la textura fina no se nota, esto si.",
    "  // uBreatheSpeed sube con la intensidad (mas rapido en intensity 5).",
    "  float breathe = 0.82 + 0.18 * sin(uTime * uBreatheSpeed);",
    "",
    "  vec2 phase = vec2(cos(uTime * 0.6), sin(uTime * 0.6)) * 0.5;",
    "  vec2 phase2 = vec2(cos(uTime * 1.1 + 1.7), sin(uTime * 1.1 + 1.7)) * 0.5;",
    "",
    "  vec2 warped = warp(p * uDensity + uSeed, phase, uTurbulence);",
    "  float edgeRaw = cellEdge(warped, phase2);",
    "  // Venas mas anchas de base que en el laboratorio: con pocas celdas",
    "  // grandes (uDensity bajo, ver presets), un borde ancho se lee como",
    "  // 2-3 venas claras en vez de una telaraña fina ilegible a 30px.",
    "  float edgeWidth = mix(0.16, 0.24, intensityNorm);",
    "  float edge = 1.0 - smoothstep(0.0, edgeWidth, edgeRaw);",
    "",
    "  // Silueta: lobulo ancho, picos suavizados (menos frecuencia, menos",
    "  // amplitud que en el laboratorio) - el contorno general se percibe,",
    "  // los picos finos individuales solo se traducian en aliasing.",
    "  float lobeBase = fbm(vec2(cos(ang * uLobes), sin(ang * uLobes)) * 2.0 + uSeed);",
    "  float lobeSpikeNoise = fbm(vec2(cos(ang * uLobes * 2.0 + 0.7), sin(ang * uLobes * 2.0 + 0.7)) * 2.0 + uSeed * 1.4);",
    "  float spikePeak = pow(max(0.0, lobeSpikeNoise - 0.45), 1.6);",
    "  float outerRadius = 0.92 * (0.55 + 0.26 * lobeBase) + spikePeak * 0.5;",
    "  float silhouette = smoothstep(outerRadius * 1.25, outerRadius * 0.45, r);",
    "",
    "  // Anillo/hueco oscuro alrededor del nucleo: un poco mas ancho que",
    "  // en el laboratorio para que siga siendo visible como hueco real a",
    "  // tamano pequeno (es lo que hace que el nucleo se sienta 'dentro de",
    "  // la cuenca', no pegado encima).",
    "  float innerGapInner = 0.10;",
    "  float innerGapOuter = 0.20;",
    "  float innerGap = smoothstep(innerGapInner, innerGapOuter, r);",
    "",
    "  float envelope = silhouette * innerGap;",
    "  float energy = edge * envelope;",
    "",
    "  vec3 darkCol = vec3(0.01, 0.04, 0.025);",
    "  vec3 midCol = vec3(0.06, 0.55, 0.28);",
    "  vec3 hotCol = vec3(0.85, 1.0, 0.88);",
    "",
    "  float radialHot = 1.0 - smoothstep(0.2, 0.85, r);",
    "  vec3 hotTarget = mix(midCol, hotCol, radialHot);",
    "",
    "  // uFireForce: cuanta superficie lee blanco-caliente vs verde. A",
    "  // tamano real esto se ve como 'cuanto calienta el color general',",
    "  // no como un detalle fino - por eso es uno de los 4 ejes que",
    "  // diferencian intensity 2..5 (junto a nucleo/halo/respiracion).",
    "  float hotThreshold = mix(0.55, 0.26, clamp(uFireForce - 1.0, 0.0, 1.0));",
    "",
    "  vec3 col = darkCol;",
    "  col = mix(col, midCol, smoothstep(0.0, 0.5, energy));",
    "  col = mix(col, hotTarget, smoothstep(hotThreshold, 1.0, energy));",
    "  col *= envelope;",
    "",
    "  // Una sola capa de niebla, de baja frecuencia, no atada a la malla",
    "  // de celdas: aporta algo de profundidad sin textura fina invisible",
    "  // a este tamano (antes habia 2-3 capas extra; no aportaban nada).",
    "  float ambientSmoke = fbm(p * 1.1 + uSeed * 2.3 + phase * 0.25);",
    "  col += midCol * ambientSmoke * 0.08 * envelope;",
    "",
    "  // Nucleo: agrandado y reforzado a proposito (prioridad #1 del pase",
    "  // de legibilidad) - a 220px internos escalados a 30-40px, el radio",
    "  // del laboratorio era casi sub-pixel. Tamano fijo (no depende de",
    "  // uCoreBrightness, solo el brillo si); respira junto con el halo.",
    "  float core = exp(-r * r / 0.0028) * uCoreBrightness;",
    "  vec3 coreColor = vec3(0.92, 1.0, 0.9);",
    "  col += coreColor * core;",
    "",
    "  col *= mix(1.0, 1.6, intensityNorm) * breathe;",
    "",
    "  float alpha = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);",
    "  gl_FragColor = vec4(col, alpha);",
    "}"
  ].join("\n");

  // Presets propios para el tamano real del juego (NO son los mismos
  // valores que OssuaryRemotionLab/.../eyePresets.ts - esos estan
  // tunados para fidelidad a 1024px, estos para legibilidad a 30-40px).
  // density baja = pocas celdas grandes = venas gruesas legibles.
  // breatheSpeed sube con la intensidad = respiracion mas rapida.
  var INTENSITY_PRESETS = {
    2: { seed: 7, density: 3.2, turbulence: 0.42, lobes: 5, coreBrightness: 1.3, fireForce: 1.0, breatheSpeed: 1.0 },
    3: { seed: 7, density: 3.4, turbulence: 0.48, lobes: 5, coreBrightness: 1.5, fireForce: 1.3, breatheSpeed: 1.4 },
    4: { seed: 7, density: 3.6, turbulence: 0.54, lobes: 5, coreBrightness: 1.7, fireForce: 1.55, breatheSpeed: 1.9 },
    5: { seed: 7, density: 3.8, turbulence: 0.6, lobes: 5, coreBrightness: 1.9, fireForce: 1.8, breatheSpeed: 2.5 }
  };

  var EYE_SPACING_PERCENT = 2; // debe coincidir con --fx-eye-spacing
  var EYE_SIZE_PERCENT = 2.2; // debe coincidir con --fx-eye-size
  var CANVAS_RESOLUTION = 160; // suficiente para 30-40px reales; antes 220

  function resolveZIndex(entry) {
    if (entry.zIndex != null) {
      return entry.zIndex;
    }
    var layerDef = window.OSSUARY_FX_LAYERS && window.OSSUARY_FX_LAYERS[entry.layer];
    return layerDef ? layerDef.zIndex : 0;
  }

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("[OssuaryFX] skull-eyes-glow shader compile error: " + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl) {
    var vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    var fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      return null;
    }
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[OssuaryFX] skull-eyes-glow program link error: " + gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function createWebglPlayer(entry) {
    var container = null;
    var eyes = [];
    var rafId = null;
    var startTimeMs = null;
    var active = false;
    var currentIntensity = 2;

    function buildEye(offsetSignXPercent) {
      var canvas = document.createElement("canvas");
      canvas.width = CANVAS_RESOLUTION;
      canvas.height = CANVAS_RESOLUTION;
      canvas.style.position = "absolute";
      canvas.style.left = "50%";
      canvas.style.top = "50%";
      canvas.style.width = EYE_SIZE_PERCENT * 1.8 + "%";
      canvas.style.height = EYE_SIZE_PERCENT * 1.8 + "%";
      canvas.style.marginLeft = (offsetSignXPercent * EYE_SPACING_PERCENT) + "%";
      canvas.style.transform = "translate(-50%, -50%)";
      canvas.style.pointerEvents = "none";

      var gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
      if (!gl) {
        console.warn("[OssuaryFX] skull-eyes-glow: WebGL not available, eye skipped.");
        return null;
      }
      var program = createProgram(gl);
      if (!program) {
        return null;
      }
      gl.useProgram(program);

      var posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var posLoc = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      var uniforms = {
        uTime: gl.getUniformLocation(program, "uTime"),
        uResolution: gl.getUniformLocation(program, "uResolution"),
        uSeed: gl.getUniformLocation(program, "uSeed"),
        uDensity: gl.getUniformLocation(program, "uDensity"),
        uTurbulence: gl.getUniformLocation(program, "uTurbulence"),
        uLobes: gl.getUniformLocation(program, "uLobes"),
        uCoreBrightness: gl.getUniformLocation(program, "uCoreBrightness"),
        uIntensity: gl.getUniformLocation(program, "uIntensity"),
        uFireForce: gl.getUniformLocation(program, "uFireForce"),
        uBreatheSpeed: gl.getUniformLocation(program, "uBreatheSpeed")
      };

      return { canvas: canvas, gl: gl, program: program, uniforms: uniforms };
    }

    function applyHaloFilter() {
      var t = clamp01((currentIntensity - 2) / 3);
      // Halo con presencia real (no un glow plano): blur moderado +
      // opacidad que crece con la intensidad, mismo verde que rib-glow
      // (hsl ~140-150) para integrarse con el resto de la escena.
      var blur = 4 + t * 6;
      var alpha = 0.5 + t * 0.35;
      var filterValue = "drop-shadow(0 0 " + blur.toFixed(1) + "px rgba(90,255,150," + alpha.toFixed(2) + "))";
      eyes.forEach(function (eye) {
        eye.canvas.style.filter = filterValue;
      });
    }

    function mount() {
      var stage = document.getElementById("slotStage");
      if (!stage) {
        console.warn("[OssuaryFX] " + entry.id + ": #slotStage not found, mount skipped.");
        return;
      }
      var position = window.OssuaryFXPositionResolver.resolveAnchor(entry.anchor);
      var offsetX = entry.offset ? entry.offset.x || 0 : 0;
      var offsetY = entry.offset ? entry.offset.y || 0 : 0;

      container = document.createElement("div");
      // Reutiliza fx-css-layer solo por su mecanica de posicion/escala/
      // fade (translate(-50%,-50%) + transicion de opacity en .is-active):
      // mismo comportamiento de aparicion que cualquier otro efecto CSS,
      // sin duplicar esa logica aqui.
      container.className = "fx-css-layer";
      container.setAttribute("aria-hidden", "true");
      container.style.left = (position.xPercent + offsetX) + "%";
      container.style.top = (position.yPercent + offsetY) + "%";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.zIndex = String(resolveZIndex(entry));
      container.style.setProperty("--fx-scale", entry.scale != null ? entry.scale : 1);
      container.style.setProperty("--fx-target-opacity", entry.opacity != null ? entry.opacity : 1);
      stage.appendChild(container);

      var leftEye = buildEye(-1);
      var rightEye = buildEye(1);
      eyes = [leftEye, rightEye].filter(Boolean);
      eyes.forEach(function (eye) {
        container.appendChild(eye.canvas);
      });
    }

    function renderFrame(timestampMs) {
      if (!active) {
        return;
      }
      if (startTimeMs == null) {
        startTimeMs = timestampMs;
      }
      var preset = INTENSITY_PRESETS[currentIntensity] || INTENSITY_PRESETS[2];
      // Tiempo real continuo, sin modulo de loop: a diferencia del
      // laboratorio (que exporta video y necesita un bucle exacto), el
      // efecto en vivo simplemente sigue corriendo - no hace falta que
      // "cierre" en ningun punto.
      var elapsedSeconds = (timestampMs - startTimeMs) / 1000;

      eyes.forEach(function (eye) {
        var gl = eye.gl;
        gl.viewport(0, 0, CANVAS_RESOLUTION, CANVAS_RESOLUTION);
        gl.useProgram(eye.program);
        gl.uniform1f(eye.uniforms.uTime, elapsedSeconds);
        gl.uniform2f(eye.uniforms.uResolution, CANVAS_RESOLUTION, CANVAS_RESOLUTION);
        gl.uniform1f(eye.uniforms.uSeed, preset.seed);
        gl.uniform1f(eye.uniforms.uDensity, preset.density);
        gl.uniform1f(eye.uniforms.uTurbulence, preset.turbulence);
        gl.uniform1f(eye.uniforms.uLobes, preset.lobes);
        gl.uniform1f(eye.uniforms.uCoreBrightness, preset.coreBrightness);
        gl.uniform1f(eye.uniforms.uIntensity, currentIntensity);
        gl.uniform1f(eye.uniforms.uFireForce, preset.fireForce);
        gl.uniform1f(eye.uniforms.uBreatheSpeed, preset.breatheSpeed);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      });

      rafId = window.requestAnimationFrame(renderFrame);
    }

    function activate(params) {
      if (!container) {
        return;
      }
      var intensity = params && params.intensity != null ? params.intensity : 2;
      if (!INTENSITY_PRESETS[intensity]) {
        intensity = 2;
      }
      currentIntensity = intensity;
      applyHaloFilter();
      container.classList.add("is-active");
      active = true;
      if (!rafId) {
        startTimeMs = null;
        rafId = window.requestAnimationFrame(renderFrame);
      }
    }

    function deactivate() {
      if (!container) {
        return;
      }
      container.classList.remove("is-active");
      active = false;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function dispose() {
      deactivate();
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      container = null;
      eyes = [];
    }

    return {
      mount: mount,
      activate: activate,
      deactivate: deactivate,
      dispose: dispose,
      getElement: function () {
        return container;
      }
    };
  }

  window.OssuaryFXWebglPlayer = {
    create: createWebglPlayer
  };
})();
