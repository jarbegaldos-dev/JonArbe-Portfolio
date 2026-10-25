(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Amagos de la guillotina gigante de rib1 en el juego base (peticion del
  // usuario, 2026-10-19: "que se vea pasando de largo", que a veces se pase
  // una casilla y vuelva para entrar, que a veces se quede a medias con una o
  // dos casillas dentro; que de "uff, casi cae").
  // 2026-10-20 (tercera vuelta): "sutil pero rapido", con fluidez; nada de
  // tension sin verse la cuchilla, ni tension que no acaba en un bajon claro.
  // Asi que:
  //   - Nada empieza hasta que la hoja asoma por el borde de rib1.
  //   - La hoja entra frenando sin pararse (sin tirones), y la penumbra y la
  //     luz suben mientras se acerca: empiezan en casi nada. Sin camara (daba
  //     tirones).
  //   - Si cae: golpe seco y fuera la penumbra. Si no: en cuanto se para (o
  //     en cuanto se va, si cruza), golpe sordo, la hoja se afloja y todo se
  //     apaga deprisa.
  //   - Sonidos del usuario (tools/bake-rib1-tease-sounds.js): cadenas que
  //     corren mientras entra, roce de piedra al resbalar, empujon de piedra
  //     que llega a su cima en el golpe y golpe de madera.
  //
  // Quien decide si cae es el motor de siempre (outcome-engine.js, sin
  // cambios en la probabilidad). Aqui solo se decide COMO llega rib1, con
  // Math.random (nunca el RNG del juego):
  //   - Si cae (pendingGiantSymbol RIB_BONUS), uno de tres finales:
  //       win-back  se le escapa media casilla (2,5 de 3 dentro),
  //                 aguanta y vuelve atras de golpe.
  //       win-creep se queda corta con 2 de 3 dentro, aguanta temblando y la
  //                 ultima casilla entra de golpe.
  //       win-slow  entra arrastrandose y cae.
  //   - Si no cae, a veces:
  //       short     se queda corta con 1 o 2 casillas dentro y ahi se queda.
  //       over      se le escapa, pasa de largo y se queda con 1 o 2 dentro.
  //       pass      se le escapa y cruza entera hasta salir.
  //       flyby     pasa volando durante el giro (rib1 gira un poco mas).
  //     short y over son el unico cambio en el tablero: las casillas que tapa
  //     la guillotina pasan a RIB_BONUS (no paga ni sustituye: rompen las
  //     lineas, como el gigante entero) y solo si eran simbolos normales
  //     (nunca cuchilla, cuervo ni WILD). Se queda a la vista hasta la
  //     siguiente tirada, que se la lleva como un gigante "de paso"
  //     (carryGiantBlock).
  // Todos (menos el short de una casilla) entran igual hasta tener casi dos
  // casillas dentro:
  // hasta el final no se sabe que va a pasar.
  //
  // El recorrido de rib1 es un guion (posicion por tiempo, tramos de Hermite
  // cubicos con la velocidad continua) que spin-engine.js usa en lugar de su
  // frenada (hook buildStopScript); termina exactamente en targetPosition,
  // sin muelle. El resto de rodillos sigue girando hasta que rib1 acaba
  // (game.js). Tiempos en ms de juego (turbo los acorta solo).
  // Estilos en src/fx/rib1-tease.css. Debug: OssuaryGameDebug.rib1Tease(kind).
  // ---------------------------------------------------------------------------

  var CONFIG = {
    // Si cae la guillotina: reparto de los finales.
    landKinds: { "win-back": 0.65, "win-creep": 0.25, "win-slow": 0.10 },
    // Si no cae: probabilidad de cada amago por tirada (el resto, nada).
    missKinds: { short: 0.045, over: 0.035, pass: 0.07, flyby: 0.22 },
    // De los short/over, cuantos se quedan con una sola casilla dentro.
    oneCellShare: 0.35,
    // Lo que gira de mas rib1 (y todos detras) para que pase volando.
    flybyExtraMs: 450,
    // Los demas rodillos siguen girando esto tras parar rib1.
    afterStopMs: 220,
    // Desde que se para sin entrar hasta el bajon (lo justo para verlo).
    missBeatMs: 90,
    // La cuchilla asoma (desfase en casillas: 3 = tocando el borde).
    visibleG: 2.95,
    // Casillas que puede tapar a medias (simbolos normales).
    coverableSymbols: ["FEMUR", "DARK_HEART", "SILVER_COIN", "ANCIENT_GOLD_COIN", "ANCESTRAL_SKULL"]
  };

  // --- Guiones -----------------------------------------------------------------
  // g = desfase de la guillotina en casillas respecto a su sitio (positivo:
  // aun entrando por la derecha; 3 = tocando el borde; negativo: pasada a la
  // izquierda). v = velocidad del rodillo (casillas/s, negativa = atras).
  // Cada guion: claves [t, g, v] y eventos [t, tipo]. El primer punto
  // (velocidad de crucero) lo pone el rodillo.
  function Path() {
    this.keys = [];
    this.events = [];
    this.t = 0;
    this.g = 0;
  }
  Path.prototype.key = function (t, g, v) {
    this.keys.push([t, g, v]);
    this.t = t;
    this.g = g;
    return this;
  };
  Path.prototype.event = function (type, at) {
    this.events.push([at == null ? this.t : at, type]);
    return this;
  };
  // Llega hasta g en ms con velocidad final v (sin pararse si v > 0).
  Path.prototype.to = function (ms, g, v) {
    return this.key(this.t + ms, g, v || 0);
  };
  // Aguanta parado, temblando.
  Path.prototype.tense = function (ms) {
    this.event("tense", this.t);
    return this.key(this.t + ms, this.g, 0);
  };
  // Se le escapa: resbala hasta g y se para (rasca el marco).
  Path.prototype.slip = function (ms, g) {
    this.event("slip", this.t);
    var mid = this.g + (g - this.g) * 0.55;
    this.key(this.t + ms * 0.45, mid, 1.9 * (this.g - g) / (ms / 1000));
    return this.key(this.t + ms * 0.55, g, 0);
  };
  // Golpe final: entra (o vuelve) hasta g con velocidad de impacto v.
  Path.prototype.slam = function (ms, g, v) {
    this.event("slam", this.t);
    return this.key(this.t + ms, g, v);
  };
  // Los que caen: el empujon de piedra suena con su cima (0.4 s) en el
  // golpe.
  Path.prototype.push = function () {
    return this.event("push", Math.max(0, this.t - 400));
  };
  // Hasta aqui sube la tension (penumbra y luz); despues se queda.
  Path.prototype.peak = function () {
    this.peakAt = this.t;
    this.peakG = this.g;
    return this;
  };

  // Lo cerca que esta la hoja: 0 al asomar, 1 con casi dos casillas dentro
  // (curva suave).
  function nearness(g) {
    var k = Math.max(0, Math.min(1, (CONFIG.visibleG - Math.abs(g)) / 1.85));
    return k * k * (3 - 2 * k);
  }

  // Entrada comun: frena desde el crucero sin pararse, asoma moviendose y
  // se arrastra hasta casi dos casillas dentro, cada vez mas despacio.
  function approach() {
    return new Path().key(480, 2.3, 4.2).to(520, 1.08, 0.5).peak();
  }

  var BUILD = {
    "win-back": function () {
      return approach().slip(420, -0.5).tense(180).slam(180, 0, -3).push();
    },
    "win-creep": function () {
      return approach().to(260, 1, 0).tense(420).slam(130, 0, 6).push();
    },
    "win-slow": function () {
      return approach().to(380, 0.32, 0.6).slam(110, 0, 4.5).push();
    },
    // short-N / over-N: se para con desfase N (short-1, dos casillas dentro;
    // short-2, una).
    "short-1": function () {
      return approach().to(260, 1, 0);
    },
    "short-2": function () {
      return new Path().key(520, 2.45, 2.2).to(300, 2, 0).peak();
    },
    "over-1": function () {
      return approach().slip(520, -1);
    },
    "over-2": function () {
      return approach().slip(640, -2);
    },
    "pass": function () {
      return approach().slip(420, -0.5).tense(180).slip(550, -3);
    }
  };

  var forcedKind = null;
  var plan = null; // { kind, pathId, gEnd, win, slow, halfway, path, block, script, R, target }

  function pickWeighted(table) {
    var keys = Object.keys(table);
    var total = keys.reduce(function (sum, key) { return sum + table[key]; }, 0);
    var r = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < keys.length; i++) {
      acc += table[keys[i]];
      if (r < acc) return keys[i];
    }
    return keys[keys.length - 1];
  }

  function pickMiss() {
    var r = Math.random();
    var acc = 0;
    var keys = Object.keys(CONFIG.missKinds);
    for (var i = 0; i < keys.length; i++) {
      acc += CONFIG.missKinds[keys[i]];
      if (r < acc) return keys[i];
    }
    return null;
  }

  // Casillas de rib1 que tapa la guillotina parada con desfase gEnd
  // (0 izquierda, 2 derecha).
  function coveredCells(gEnd) {
    var cells = [];
    for (var c = 0; c < 3; c++) {
      if (c >= gEnd && c <= gEnd + 2) cells.push(c);
    }
    return cells;
  }

  function canCover(symbols, gEnd) {
    return coveredCells(gEnd).every(function (c) {
      return CONFIG.coverableSymbols.indexOf(symbols[c]) !== -1;
    });
  }

  // Al preparar la tirada (game.js#prepareReelStops), con el tablero ya
  // decidido. ctx: { lands, symbols (casillas de rib1), allowed }.
  // Devuelve { kind, gEnd, covered } o null; si es short/over cambia las
  // casillas tapadas de ctx.symbols a RIB_BONUS.
  function planSpin(ctx) {
    plan = null;
    var kind = forcedKind;
    forcedKind = null;
    if (!ctx || !ctx.allowed) return null;
    if (ctx.lands) {
      if (!kind || kind.indexOf("win") !== 0) kind = pickWeighted(CONFIG.landKinds);
    } else {
      if (kind && kind.indexOf("win") === 0) kind = null;
      if (!kind) kind = pickMiss();
    }
    if (!kind) return null;

    var gEnd = 0;
    var pathId = kind;
    if (kind === "short" || kind === "over") {
      var sign = kind === "short" ? 1 : -1;
      var first = Math.random() < CONFIG.oneCellShare ? 2 : 1;
      var options = [first, 3 - first].map(function (n) { return sign * n; });
      gEnd = null;
      for (var i = 0; i < options.length; i++) {
        if (canCover(ctx.symbols, options[i])) {
          gEnd = options[i];
          break;
        }
      }
      if (gEnd === null) {
        // Lo que taparia no es un simbolo normal: que pase de largo.
        kind = "pass";
        pathId = "pass";
        gEnd = -3;
      } else {
        pathId = kind + "-" + Math.abs(gEnd);
        coveredCells(gEnd).forEach(function (c) { ctx.symbols[c] = "RIB_BONUS"; });
      }
    } else if (kind === "pass") {
      gEnd = -3;
    }
    var path = kind === "flyby" ? null : BUILD[pathId]();
    plan = {
      kind: kind,
      pathId: pathId,
      gEnd: gEnd,
      win: kind.indexOf("win") === 0,
      slow: kind !== "flyby",
      halfway: kind === "short" || kind === "over",
      path: path,
      block: null,
      script: null
    };
    return { kind: kind, gEnd: gEnd, covered: plan.halfway ? coveredCells(gEnd) : [] };
  }

  function current() {
    return plan;
  }

  // Duracion del guion (ms de juego).
  function scriptDurationMs() {
    return plan && plan.path ? plan.path.t : 0;
  }

  // Cuanto gira de mas cada rodillo en esta tirada (game.js lo suma al
  // crucero). rib1 solo con flyby; los demas, lo que dura el amago.
  function extraCruiseMs(reelId, decelMs) {
    if (!plan) return 0;
    if (!plan.slow) return CONFIG.flybyExtraMs;
    if (reelId === "rib1") return 0;
    return Math.max(0, scriptDurationMs() - decelMs) + CONFIG.afterStopMs + (plan.win ? 0 : CONFIG.missBeatMs);
  }

  // Flyby: la guillotina cruza el rodillo a velocidad de crucero ~230 ms
  // antes de que empiece a frenar. positionAt(ms de juego) da donde va el
  // rodillo (estimacion; un desfase de unos ms no se nota).
  function placeFlyby(reel, stopStartAt, positionAt) {
    if (!plan || plan.kind !== "flyby") return;
    var center = positionAt(stopStartAt - 230);
    plan.block = { refPosition: Math.round(center), size: reel.cells.length, symbol: "RIB_BONUS", tease: true };
    reel.teaseGiantBlocks = [plan.block];
  }

  // Hermite cubico entre dos claves {t, x, v} (t en ms, v en casillas/s).
  function hermite(a, b, t) {
    var h = (b.t - a.t) / 1000;
    var u = h > 0 ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
    var u2 = u * u;
    var u3 = u2 * u;
    var x = (2 * u3 - 3 * u2 + 1) * a.x + (u3 - 2 * u2 + u) * h * a.v + (-2 * u3 + 3 * u2) * b.x + (u3 - u2) * h * b.v;
    var dx = (6 * u2 - 6 * u) * a.x + (3 * u2 - 4 * u + 1) * h * a.v + (-6 * u2 + 6 * u) * b.x + (3 * u2 - 2 * u) * h * b.v;
    return { x: x, v: h > 0 ? dx / h : 0 };
  }

  // Hook de spin-engine.js (prepareReelLanding y beginReelDeceleration):
  // guion de parada de rib1 desde p0 a velocidad v0, o null.
  function buildStopScript(reel, p0, v0) {
    if (!plan || !plan.slow || !plan.path || !reel || reel.id !== "rib1") return null;
    var keys = plan.path.keys;
    var t1 = keys[0][0];
    // Primer tramo: de crucero a asomar, una frenada casi uniforme (la
    // distancia de una deceleracion constante, algo recortada; un Hermite no
    // se pasa mientras v*h/d < 3).
    var dNom = Math.max(2.5, (v0 + keys[0][2]) * (t1 / 1000) / 2.2);
    var R = Math.round(p0 + keys[0][1] + dNom);
    var target = R - plan.gEnd;
    var points = [{ t: 0, x: p0, v: v0 }].concat(keys.map(function (k) {
      return { t: k[0], x: R - k[1], v: k[2] };
    }));
    var duration = points[points.length - 1].t;
    if (!plan.win) {
      plan.block = plan.block || { size: reel.cells.length, symbol: "RIB_BONUS", tease: true };
      plan.block.refPosition = R;
      plan.block.rest = plan.halfway;
      reel.teaseGiantBlocks = [plan.block];
    }
    plan.R = R;
    plan.target = target;
    plan.peakAt = plan.path.peakAt || duration;
    plan.peakK = nearness(plan.path.peakG == null ? plan.gEnd : plan.path.peakG);
    plan.script = {
      target: target,
      duration: duration,
      events: plan.path.events.slice().sort(function (a, b) { return a[0] - b[0]; }),
      sample: function (t) {
        if (t >= duration) return { x: target, v: 0 };
        for (var i = 1; i < points.length; i++) {
          if (t <= points[i].t) return hermite(points[i - 1], points[i], t);
        }
        return { x: target, v: 0 };
      }
    };
    return plan.script;
  }

  // ---------------------------------------------------------------------------
  // Presentacion: desde que asoma, penumbra con un claro en rib1 y luz suave
  // en el rodillo; suben de casi nada hasta que la hoja se arrastra con casi
  // dos casillas dentro (plan.peakAt) y se quedan hasta el desenlace. Son
  // animaciones de opacidad (no se tocan estilos en cada fotograma). Sin
  // acercamiento de camara: ampliar las tres capas de la maquina hacia
  // tirones (2026-10-20, medido: fotogramas de 25-33 ms frente a 17 ms).
  // Duran ms de juego: game.js#syncAnimationPlaybackRate pone todas las
  // animaciones de la pagina a la velocidad del juego (turbo) en cada
  // fotograma del giro, asi que tampoco se puede usar playbackRate para
  // deshacerlas (para volver se lanza otra desde donde iban).
  // Cadenas mientras entra, alguna chispa donde roza el marco, y el golpe o
  // el bajon al final.
  // ---------------------------------------------------------------------------
  var RISE_EASING = "cubic-bezier(.5,0,.5,1)";
  var fx = null;
  var fxOpts = { speedMs: function (ms) { return ms; }, onWatch: null, onRelease: null };

  function audio(name, payload) {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger(name, payload || {});
  }

  function fxApi() {
    return window.OssuaryGuillotineDrop || null;
  }

  function laneRect(reel) {
    var el = reel.giantStripEl || reel.laneEl;
    var r = el ? el.getBoundingClientRect() : null;
    return r && r.width ? r : null;
  }

  function placeLight(dark, glow, r) {
    dark.style.setProperty("--tease-x", Math.round(r.left + r.width / 2) + "px");
    dark.style.setProperty("--tease-y", Math.round(r.top + r.height / 2) + "px");
    dark.style.setProperty("--tease-rx", Math.round(r.width * 0.8) + "px");
    dark.style.setProperty("--tease-ry", Math.round(r.height * 1.5) + "px");
    glow.style.left = Math.round(r.left) + "px";
    glow.style.top = Math.round(r.top) + "px";
    glow.style.width = Math.round(r.width) + "px";
    glow.style.height = Math.round(r.height) + "px";
  }

  // Sube de frame(0) a frame(1) en ms de juego y se queda. Devuelve
  // { el, anim, frame } o null.
  function rise(el, frame, ms) {
    if (!el || typeof el.animate !== "function") return null;
    var anim = el.animate([frame(0), frame(1)], { duration: ms, easing: RISE_EASING, fill: "forwards" });
    return { el: el, anim: anim, frame: frame };
  }

  // Vuelve a su sitio desde donde este en ms de juego y se quita.
  function settleBack(items, ms) {
    items.forEach(function (item) {
      var timing = item.anim.effect && item.anim.effect.getComputedTiming ? item.anim.effect.getComputedTiming() : null;
      var p = timing && timing.progress != null ? timing.progress : 0;
      item.anim.cancel();
      if (p <= 0.001 || ms <= 0) return;
      var back = item.el.animate([item.frame(p), item.frame(0)], { duration: ms, easing: "cubic-bezier(.3,0,.4,1)", fill: "forwards" });
      back.onfinish = function () { back.cancel(); };
    });
  }

  // Chispas donde la hoja roza el marco: en el borde por el que entra (o
  // sale), a la altura del filo.
  function sparksAtEdge(strength) {
    var g = fxApi();
    if (!fx || !g || typeof g.sparks !== "function") return;
    var r = laneRect(fx.reel);
    if (!r) return;
    var right = fx.g == null || fx.g > 0;
    var x = right ? r.right - 2 : r.left + 2;
    var y = r.top + r.height * (right ? 0.62 : 0.86);
    g.sparks(x, y, {
      count: Math.round(5 + 14 * strength),
      dir: right ? -Math.PI * 0.32 : -Math.PI * 0.68,
      spread: Math.PI * 0.55,
      speed: 240 + 260 * strength,
      width: 6
    });
  }

  function retrigger(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function setHold(on) {
    if (!fx || fx.hold === on) return;
    fx.hold = on;
    if (fx.track) fx.track.classList.toggle("is-rib1-tease-hold", on);
  }

  function fireEvent(type) {
    if (!fx || fx.released) return;
    if (type === "tense") {
      setHold(true);
    } else if (type === "push") {
      audio("rib1_tease_push", {});
    } else if (type === "slip") {
      setHold(false);
      fx.slipping = true;
      audio("rib1_tease_slip", {});
    } else if (type === "slam") {
      setHold(false);
      fx.slipping = false;
    }
  }

  // elapsed: ms de guion ya pasados (la subida acaba en plan.peakAt).
  function startFx(reel, elapsed) {
    endFx(true);
    var dark = document.createElement("div");
    dark.className = "rib1-tease-dark";
    dark.setAttribute("aria-hidden", "true");
    var glow = document.createElement("div");
    glow.className = "rib1-tease-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(dark);
    document.body.appendChild(glow);
    fx = {
      reel: reel,
      dark: dark,
      glow: glow,
      track: reel.giantStripEl || null,
      hold: false,
      released: false,
      slipping: false,
      nextEvent: 0,
      g: null,
      timers: [],
      anims: [],
      glowAnim: null,
      nextSparkAt: 0,
      lastSlipSpark: 0
    };
    var k = plan.peakK == null ? 1 : plan.peakK;
    var ms = Math.max(220, (plan.peakAt || 0) - (elapsed || 0));
    var r = laneRect(reel);
    if (r) placeLight(dark, glow, r);
    var opacity = function (p) { return { opacity: (k * p).toFixed(3) }; };
    fx.anims = [rise(dark, opacity, ms)].filter(Boolean);
    fx.glowAnim = rise(glow, opacity, ms);
    if (fx.track) fx.track.classList.add("is-rib1-tease");
    if (typeof fxOpts.onWatch === "function") fxOpts.onWatch();
    // Asoma rascando el marco.
    audio("rib1_tease_start", {});
    sparksAtEdge(0.55);
  }

  function later(fn, ms) {
    if (!fx) return;
    fx.timers.push(window.setTimeout(fn, fxOpts.speedMs(ms)));
  }

  // La luz del rodillo deja paso a su fogonazo (is-win) o a su rojo sordo
  // (is-miss), que son animaciones CSS (por debajo de las de script).
  function glowFinale(cls) {
    if (!fx) return;
    if (fx.glowAnim) fx.glowAnim.anim.cancel();
    fx.glowAnim = null;
    fx.glow.classList.add(cls);
  }

  // Fuera todo: now = de golpe (tirada nueva); si no, se apaga en fadeMs.
  function endFx(now, fadeMs) {
    if (!fx) return;
    var f = fx;
    fx = null;
    // Una vez por tirada: si sigue moviendose (pass), no vuelve a empezar.
    if (plan) plan.fxDone = true;
    f.timers.forEach(window.clearTimeout);
    var items = f.anims.concat(f.glowAnim ? [f.glowAnim] : []);
    if (f.track) f.track.classList.remove("is-rib1-tease", "is-rib1-tease-hold");
    if (typeof fxOpts.onRelease === "function") fxOpts.onRelease();
    if (now) {
      items.forEach(function (item) { item.anim.cancel(); });
      if (!f.released) audio("rib1_tease_cancel", {});
      f.dark.remove();
      f.glow.remove();
      return;
    }
    settleBack(items, fadeMs || 300);
    // La luz del rodillo (is-win dura 0.5 s) y la penumbra, fuera.
    window.setTimeout(function () {
      f.dark.remove();
      f.glow.remove();
    }, fxOpts.speedMs(Math.max(fadeMs || 300, 520)) + 120);
  }

  // Cada fotograma del giro (game.js#updateSpinFrame), solo para rib1.
  function frame(reel, now) {
    if (!plan || !plan.slow || !reel || reel.id !== "rib1") return;
    if (reel.phase !== "decelerating" || !reel.stopScript) return;
    var g = plan.R - reel.position;
    var elapsed = typeof now === "number" ? now - reel.decelStartedAt : Infinity;
    if (!fx) {
      // Sin cuchilla a la vista, nada.
      if (plan.fxDone || g >= CONFIG.visibleG) return;
      startFx(reel, elapsed);
    }
    if (fx.released) return;
    fx.g = g;
    // Eventos del guion que ya tocan.
    var events = reel.stopScript.events || [];
    while (fx && fx.nextEvent < events.length && events[fx.nextEvent][0] <= elapsed) {
      fireEvent(events[fx.nextEvent][1]);
      fx.nextEvent++;
    }
    if (!fx) return;
    var speed = Math.abs(reel.velocity);
    if (fx.slipping && speed > 0.6) {
      // Resbalando: chispas seguidas por el borde.
      if (now - fx.lastSlipSpark > 90) {
        fx.lastSlipSpark = now;
        sparksAtEdge(0.3);
      }
    } else if (speed > 0.2 && now >= fx.nextSparkAt) {
      // Arrastrandose: alguna chispa suelta de vez en cuando.
      if (fx.nextSparkAt && Math.random() < 0.55) sparksAtEdge(0.12 + 0.2 * Math.random());
      fx.nextSparkAt = now + 260 + Math.random() * 260;
    }
    // Cruza entera: el bajon en cuanto se va, sin esperar a que pare.
    if (plan.kind === "pass" && g < -1.7) release(reel, false);
  }

  // Bajon: golpe sordo, la hoja se afloja y la penumbra se va deprisa.
  function release(reel, stopped) {
    if (!fx || fx.released) return;
    fx.released = true;
    fx.slipping = false;
    setHold(false);
    audio("rib1_tease_miss", { stopped: stopped });
    var track = fx.track;
    if (stopped && track) {
      retrigger(track, "is-rib1-tease-sag");
      window.setTimeout(function () { track.classList.remove("is-rib1-tease-sag"); }, fxOpts.speedMs(450));
    }
    glowFinale("is-miss");
    if (reel.laneEl) {
      retrigger(reel.laneEl, "is-bonus-anticipation-miss");
      window.setTimeout(function () { reel.laneEl.classList.remove("is-bonus-anticipation-miss"); }, fxOpts.speedMs(800));
    }
    endFx(false, 380);
  }

  // Al parar rib1 (game.js#stopReel). Devuelve el bloque que se queda a
  // medias en el rodillo (short/over) o null.
  function reelStopped(reel) {
    if (!reel || reel.id !== "rib1" || !plan) return null;
    var p = plan;
    var rest = p.halfway && p.block ? p.block : null;
    reel.teaseGiantBlocks = rest ? [rest] : null;
    if (!p.slow) return rest;
    if (!fx) {
      if (p.fxDone) return rest;
      startFx(reel, p.script ? p.script.duration : 0);
    }
    if (fx.released) return rest;
    if (p.win) {
      fx.released = true;
      setHold(false);
      // El golpe de la guillotina al entrar: chispas por el filo, polvo,
      // temblor y fogonazo (encima del golpe de siempre del aterrizaje).
      var g = fxApi();
      var r = laneRect(reel);
      if (g && typeof g.impact === "function" && r) g.impact(r, 1.05);
      audio("rib1_tease_slam", {});
      glowFinale("is-win");
      endFx(false, 320);
      return rest;
    }
    // No entra: se ve parada un instante y bajon.
    later(function () { release(reel, true); }, p.kind === "pass" ? 0 : CONFIG.missBeatMs);
    return rest;
  }

  // Parada rapida: el flyby que aun no ha pasado se quita (con la parada
  // adelantada podria quedarse en el rodillo).
  function cancelFlyby(reel) {
    if (!plan || plan.kind !== "flyby") return;
    if (reel && reel.teaseGiantBlocks && reel.teaseGiantBlocks.indexOf(plan.block) !== -1) {
      reel.teaseGiantBlocks = null;
    }
    plan = null;
  }

  // Tirada nueva o cambio de modo: fuera todo.
  function reset() {
    plan = null;
    endFx(true);
  }

  function configure(options) {
    Object.keys(options || {}).forEach(function (key) { fxOpts[key] = options[key]; });
  }

  // Al cargar, la penumbra y la luz se pintan una vez casi transparentes:
  // la primera vez de la sesion costaban algun fotograma largo justo al
  // asomar la hoja.
  function warmUp() {
    if (!document.body) return;
    var els = ["rib1-tease-dark", "rib1-tease-glow"].map(function (cls) {
      var el = document.createElement("div");
      el.className = cls;
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = "opacity:0.01;left:0;top:0;width:200px;height:120px";
      document.body.appendChild(el);
      return el;
    });
    var frames = 0;
    var step = function () {
      if (++frames < 3) {
        window.requestAnimationFrame(step);
        return;
      }
      els.forEach(function (el) { el.remove(); });
    };
    window.requestAnimationFrame(step);
  }
  window.setTimeout(warmUp, 2500);

  function force(kind) {
    var valid = Object.keys(CONFIG.landKinds).concat(Object.keys(CONFIG.missKinds));
    forcedKind = valid.indexOf(kind) !== -1 ? kind : null;
    return forcedKind;
  }

  window.OssuaryRib1Tease = {
    CONFIG: CONFIG,
    configure: configure,
    planSpin: planSpin,
    current: current,
    extraCruiseMs: extraCruiseMs,
    placeFlyby: placeFlyby,
    buildStopScript: buildStopScript,
    frame: frame,
    reelStopped: reelStopped,
    cancelFlyby: cancelFlyby,
    reset: reset,
    force: force,
    kinds: function () { return Object.keys(CONFIG.landKinds).concat(Object.keys(CONFIG.missKinds)); }
  };
})();
