(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Humo que sale de la boca del altar del resumen de bonus — SOLO FX.
  //
  // Un <canvas> encima del altar (src/ui/bonus-summary.js) donde suben unas
  // cuantas bocanadas: nacen dentro del remolino rojo, teñidas de su rojo, y al
  // subir se abren, se mecen y se vuelven ceniza hasta apagarse. Pocas y
  // lentas: que el altar respire, no que eche humo de chimenea.
  //
  // Las bocanadas son las texturas del humo de los simbolos
  // (assets/effects/smoke/symbol-smoke-N.png, blancas con el humo en el alfa)
  // teñidas una vez en lienzos pequeños.
  //
  //   var smoke = OssuaryAltarSmoke.create(canvas, { mouth: {...} });
  //   smoke.start(); smoke.gush(s); smoke.burst(); smoke.stop();
  //
  // gush(s): durante s segundos la boca escupe una columna mas rapida y
  // espesa, la que acompana al premio cuando sale del pozo.
  //
  // Todo va en fracciones del ancho del altar (W) para que se vea igual en
  // escritorio y en movil.
  // ---------------------------------------------------------------------------

  var TEXTURES = [1, 2, 3, 4, 5, 6].map(function (n) {
    return "assets/effects/smoke/symbol-smoke-" + n + ".png";
  });
  var SPRITE_PX = 160;
  var EMBER_RGB = "196, 46, 36";   // rojo del remolino
  var ASH_RGB = "176, 166, 156";   // ceniza

  var SPAWN_PER_S = 4.6;
  var GUSH_PER_S = 13;
  var MAX_PUFFS = 34;
  var PREWARM_S = 2.2;
  var DPR_CAP = 2;

  var sprites = null; // [{ ember, ash }]
  var spritesLoading = null;

  function tint(img, rgb) {
    var c = document.createElement("canvas");
    c.width = SPRITE_PX;
    c.height = SPRITE_PX;
    var g = c.getContext("2d");
    g.drawImage(img, 0, 0, SPRITE_PX, SPRITE_PX);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "rgb(" + rgb + ")";
    g.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
    return c;
  }

  function loadSprites() {
    if (spritesLoading) return spritesLoading;
    spritesLoading = Promise.all(TEXTURES.map(function (src) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { resolve(null); };
        img.src = src;
      });
    })).then(function (imgs) {
      sprites = imgs.filter(Boolean).map(function (img) {
        return { ember: tint(img, EMBER_RGB), ash: tint(img, ASH_RGB) };
      });
    });
    return spritesLoading;
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  // mouth: centro y radios de la boca en fracciones del lienzo (x, y, rx, ry);
  // unit: ancho del altar en fracciones del ancho del lienzo.
  function create(canvas, options) {
    var mouth = options.mouth;
    var unitFrac = options.unit || 1;
    var ctx = canvas.getContext("2d");
    var puffs = [];
    var running = false;
    var frame = 0;
    var last = 0;
    var spawnDebt = 0;
    var gushLeft = 0;
    var gushDebt = 0;
    var w = 0;
    var h = 0;
    var unit = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      var cw = Math.max(1, Math.round(rect.width * dpr));
      var ch = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      w = cw;
      h = ch;
      unit = w * unitFrac;
    }

    function spawn(strong) {
      if (!sprites || !sprites.length || puffs.length >= MAX_PUFFS + (strong ? 10 : 0)) return;
      var a = Math.random() * Math.PI * 2;
      var r = Math.sqrt(Math.random());
      if (strong === "gush") {
        // Columna que sube a la par del premio: estrecha, rapida y pronto
        // ceniza (roja no se ve sobre el remolino); se abre y se apaga en
        // cuanto lo ha dejado arriba.
        puffs.push({
          x: mouth.x * w + Math.cos(a) * r * mouth.rx * 0.55 * w,
          y: mouth.y * h + Math.sin(a) * r * mouth.ry * 0.55 * h,
          vy: -rand(0.15, 0.24),
          vx: rand(-0.018, 0.018),
          sway: rand(0.006, 0.014),
          swayRate: rand(0.6, 1.1),
          phase: Math.random() * Math.PI * 2,
          size: rand(0.11, 0.17),
          grow: rand(1.5, 2.2),
          rot: Math.random() * Math.PI * 2,
          spin: rand(-0.3, 0.3),
          age: 0,
          life: rand(2.2, 3.2),
          peak: rand(0.46, 0.62),
          emberFade: 4,
          sprite: sprites[(Math.random() * sprites.length) | 0]
        });
        return;
      }
      puffs.push({
        x: mouth.x * w + Math.cos(a) * r * mouth.rx * w,
        y: mouth.y * h + Math.sin(a) * r * mouth.ry * h,
        // velocidades y tamaños en W por segundo / en W
        vy: -rand(0.05, 0.085) * (strong ? 1.5 : 1),
        vx: rand(-0.012, 0.012),
        sway: rand(0.01, 0.022),
        swayRate: rand(0.45, 0.85),
        phase: Math.random() * Math.PI * 2,
        size: rand(0.12, 0.19),
        grow: rand(1.1, 1.6),
        rot: Math.random() * Math.PI * 2,
        spin: rand(-0.18, 0.18),
        age: 0,
        life: rand(4.6, 6.8) * (strong ? 0.75 : 1),
        peak: rand(0.26, 0.42) * (strong ? 1.25 : 1),
        sprite: sprites[(Math.random() * sprites.length) | 0]
      });
    }

    function step(dt) {
      spawnDebt += dt * SPAWN_PER_S;
      while (spawnDebt >= 1) {
        spawnDebt -= 1;
        spawn(false);
      }
      if (gushLeft > 0) {
        gushLeft -= dt;
        gushDebt += dt * GUSH_PER_S;
        while (gushDebt >= 1) {
          gushDebt -= 1;
          spawn("gush");
        }
      }
      for (var i = puffs.length - 1; i >= 0; i--) {
        var p = puffs[i];
        p.age += dt;
        if (p.age >= p.life) {
          puffs.splice(i, 1);
          continue;
        }
        p.y += p.vy * unit * dt;
        p.x += p.vx * unit * dt;
        p.rot += p.spin * dt;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < puffs.length; i++) {
        var p = puffs[i];
        var t = p.age / p.life;
        // entra deprisa, se apaga despacio
        var env = t < 0.3 ? t / 0.3 : 1 - Math.pow((t - 0.3) / 0.7, 1.6);
        var alpha = p.peak * Math.max(0, env);
        if (alpha <= 0.004) continue;
        var size = p.size * unit * (1 + (p.grow) * t);
        var sx = p.x + Math.sin(p.phase + p.age * p.swayRate) * p.sway * unit;
        // el rojo de la boca se va volviendo ceniza al subir
        var ember = Math.max(0, 1 - t * (p.emberFade || 2.2));
        ctx.save();
        ctx.translate(sx, p.y);
        ctx.rotate(p.rot);
        if (ember > 0) {
          ctx.globalAlpha = alpha * ember;
          ctx.drawImage(p.sprite.ember, -size / 2, -size / 2, size, size);
        }
        ctx.globalAlpha = alpha * (1 - ember * 0.7);
        ctx.drawImage(p.sprite.ash, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      if (!running) return;
      var dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      step(dt);
      draw();
      frame = window.requestAnimationFrame(tick);
    }

    function start() {
      if (running) return;
      running = true;
      loadSprites().then(function () {
        if (!running) return;
        resize();
        puffs.length = 0;
        spawnDebt = 0;
        // Ya sale humo cuando se abre la pantalla (sin gastar una racha que
        // se haya pedido mientras cargaban las texturas).
        var gushing = gushLeft;
        gushLeft = 0;
        for (var s = 0; s < PREWARM_S; s += 1 / 30) step(1 / 30);
        gushLeft = gushing;
        draw();
        last = window.performance.now();
        frame = window.requestAnimationFrame(tick);
      });
    }

    function stop() {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      puffs.length = 0;
      gushLeft = 0;
      gushDebt = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Columna de humo que acompana al premio cuando sale de la boca.
    function gush(seconds) {
      if (!running) return;
      gushLeft = Math.max(gushLeft, Number(seconds) || 0);
      gushDebt = 1; // la primera bocanada sale ya
    }

    // Bocanada mas fuerte (cuando la cifra se asienta).
    function burst() {
      if (!running) return;
      for (var i = 0; i < 7; i++) spawn(true);
    }

    window.addEventListener("resize", function () {
      if (running) resize();
    });

    return { start: start, stop: stop, gush: gush, burst: burst, preload: loadSprites };
  }

  window.OssuaryAltarSmoke = { create: create, preload: loadSprites };
})();
