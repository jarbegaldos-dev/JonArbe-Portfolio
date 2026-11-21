(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Ojos del encapuchado — SOLO VISUAL.
  //
  // Cuando la piedra del esqueleto golpea al encapuchado de arriba (el centro
  // de rib1, sin matar a ningun cuervo), en el hueco negro de su capucha se
  // encienden dos ojos blancos, desparejos y siniestros, que tiemblan cada uno
  // a su ritmo y se apagan. Sutil: pequenos y con muy poco brillo. Peticion del
  // usuario (2026-10-13).
  //
  // Tres caras al azar, sin repetir la anterior (peticion del usuario,
  // 2026-10-14): "tonto" (los ojos desparejos de siempre), "enfadado" (ojos
  // rasgados hacia el centro, cejas y brillo rojo) y "llorando" (ojos caidos
  // y lagrimas que resbalan).
  //
  // Cara "watch" (peticion del usuario, 2026-10-15): durante la espera de la
  // cadena del Execution Bonus el encapuchado mira fijo con dos ascuas rojas;
  // no se va sola: game.js la quita con release("watch") en el desenlace.
  // Macabra desde el 2026-10-16 ("que a la Muerte le salgan unos ojos
  // macabros"): cuencas hundidas y desparejas que se abren de golpe, ascua
  // roja con una pupila blanca de alfiler que no para quieta, la derecha
  // entorna, un halo rojo dentro de la capucha y sangre que resbala de los
  // ojos. Tambien mira cuando cae la cuchilla (game.js).
  //
  // Desde el 2026-10-25 (peticion del usuario: "a veces se salen, lagueados")
  // las caras se dibujan en canvas (src/fx/eye-glow.js) y siguen a la capucha
  // en cada fotograma: antes se colocaban una sola vez y, si la camara del
  // bonus se movia o la casilla estaba botando en ese instante, se quedaban
  // fuera del hueco.
  //
  // game.js llama a show(anchorFn), donde anchorFn() devuelve el rect
  // (viewport) de la casilla central de rib1; la cara de la capucha queda
  // encima (faceOffsetYCells).
  // ---------------------------------------------------------------------------

  var SETTINGS = {
    // Centro de la cara respecto a la casilla central de rib1, en anchos de
    // casilla (x) y altos de casilla (y, hacia arriba).
    // (Medido sobre el hueco negro de la capucha a 1600x900.)
    faceOffsetXCells: 0.03,
    faceOffsetYCells: 0.36,
    showMs: 2100,
    // Tope de la cara "watch" por si nadie la quita.
    watchMaxMs: 9000,
    moods: ["silly", "angry", "crying"]
  };

  var lastMood = null;

  function pickMood() {
    var options = SETTINGS.moods.filter(function (m) { return m !== lastMood; });
    if (!options.length) options = SETTINGS.moods.slice();
    lastMood = options[Math.floor(Math.random() * options.length)];
    return lastMood;
  }

  var layerEl = null;
  var current = null;

  function ensureLayer() {
    if (layerEl && layerEl.isConnected) return layerEl;
    layerEl = document.createElement("div");
    layerEl.className = "hood-eyes-layer";
    document.body.appendChild(layerEl);
    return layerEl;
  }

  function speedMs(ms) {
    var speed = window.OssuaryGameSpeed;
    return speed && typeof speed.ms === "function" ? speed.ms(ms) : ms;
  }

  // Donde va la cara este fotograma (sigue a la casilla aunque se mueva).
  function placement(anchorFn, fallback) {
    var last = fallback;
    return function () {
      var rect = typeof anchorFn === "function" ? anchorFn() : anchorFn;
      if (rect && rect.width && rect.height) last = rect;
      if (!last) return null;
      return {
        x: last.left + last.width / 2 + last.width * SETTINGS.faceOffsetXCells,
        y: last.top - last.height * SETTINGS.faceOffsetYCells,
        unit: last.width
      };
    };
  }

  function hide() {
    if (!current) return;
    var face = current.face;
    window.clearTimeout(current.timer);
    current = null;
    face.destroy();
  }

  // Apaga la cara que se queda (cierra los ojos y se funde), solo si sigue
  // siendo esa.
  function release(mood) {
    if (!current || (mood && current.mood !== mood)) return;
    var face = current.face;
    window.clearTimeout(current.timer);
    current = null;
    face.release();
  }

  // mood es opcional (para probar una cara concreta): si no, al azar.
  function show(anchorFn, mood) {
    var rect = typeof anchorFn === "function" ? anchorFn() : anchorFn;
    if (!rect || !rect.width || !rect.height || !window.OssuaryEyeGlow) return false;
    // La cara que mira ya esta puesta: se queda (sin volver a abrir los ojos).
    if (mood === "watch" && current && current.mood === "watch" && current.face.alive()) {
      window.clearTimeout(current.timer);
      current.face.place(placement(anchorFn, rect));
      current.timer = window.setTimeout(function () { release("watch"); }, SETTINGS.watchMaxMs);
      return true;
    }
    hide();
    var watch = mood === "watch";
    var faceMood = watch || SETTINGS.moods.indexOf(mood) >= 0 ? mood : pickMood();
    var ms = watch ? 0 : speedMs(SETTINGS.showMs);
    var face = window.OssuaryEyeGlow.create(faceMood, {
      parent: ensureLayer(),
      lifeMs: ms,
      timeScale: speedMs(1000) / 1000,
      className: "hood-eyes hood-eyes--" + faceMood
    });
    if (!face) return false;
    face.place(placement(anchorFn, rect));
    current = {
      face: face,
      mood: faceMood,
      timer: watch
        ? window.setTimeout(function () { release("watch"); }, SETTINGS.watchMaxMs)
        : window.setTimeout(hide, ms + 60)
    };
    return true;
  }

  window.OssuaryHoodEyes = { show: show, hide: hide, release: release, settings: SETTINGS };
})();
