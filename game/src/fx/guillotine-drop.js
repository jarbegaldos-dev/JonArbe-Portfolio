(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Caidas de la guillotina del Execution Bonus — SOLO PRESENTACION.
  //
  // Peticion del usuario (2026-10-16): "que la caida de la guillotina no
  // siempre sea igual", mas tension y mas impacto. Antes el rig (cuchilla +
  // cuerdas, game.js#spawnRib1BladeRigPreview) caia siempre con la misma
  // animacion CSS de 2240 ms. Ahora, en el bonus, este modulo mueve el rig
  // fotograma a fotograma con una de estas TRES caidas (el usuario las queria
  // pocas y claras; la de tirones fila a fila y la de golpe seco sin carga se
  // quitaron el mismo dia: "no se entiende, no me convence"):
  //
  //   classic  la de siempre (mismo recorrido que la animacion CSS).
  //   snag     baja, se ATASCA justo encima de la primera fila con un chirrido,
  //            tiembla echando chispas por los rieles y se suelta de golpe.
  //   execution con 6 esqueletos o mas, o con Marca de Sangre (peticion del
  //            usuario: "tension y
  //            pum, corta todos de golpe y de manera mas epica"): la hoja
  //            carga hacia arriba temblando cada vez mas, cae la oscuridad y
  //            laten los latidos, y se suelta a plomo cortando todas las
  //            filas casi a la vez; golpe enorme. Las cifras de las filas se
  //            juntan en el centro en un total grande que vuela al WIN.
  //
  // El corte de cada fila (game.js#runGuillotineChainCuts) sigue la posicion
  // REAL de la cuchilla, asi que va sincronizado con cualquier caida.
  // Una sola variable (--rib1-rig-drop, 0 arriba / 1 abajo) sigue gobernando
  // la cuchilla y el largo de las cuerdas (style.css), asi que no se separan.
  //
  // Ademas: el golpe al llegar abajo (temblor de la maquina, chispas, polvo y
  // destello segun la fuerza), las chispas del atasco, y en cada fila cortada
  // la sangre y el importe en cifras de oro que vuela al WIN del HUD.
  // Estilos: src/fx/execution-fx.css. Sonidos: eventos guillotine_* en
  // src/config/audio-rules.config.js (con sonidos que ya habia).
  // ---------------------------------------------------------------------------

  var EASE = {
    lazy: [0.68, 0.02, 0.9, 0.32],
    gather: [0.34, 0.08, 0.7, 0.46],
    speedUp: [0.26, 0.18, 0.54, 0.96],
    cushion: [0.22, 0.3, 0.26, 1],
    inOut: [0.42, 0, 0.58, 1],
    rise: [0.5, 0.05, 0.22, 1],
    fall: [0.5, 0, 0.92, 0.42],
    freefall: [0.55, 0, 1, 0.45],
    out: [0.2, 0.7, 0.35, 1],
    linear: [0, 0, 1, 1]
  };

  var lastVariant = null;
  // Desde cuantos esqueletos la guillotina hace la ejecucion de golpe.
  var EXECUTION_MIN_SKELETONS = 6;
  // Debug (panel DEBUG > Execution Bonus): caida de la proxima guillotina.
  var forcedVariant = null;

  function speedFactor() {
    var speed = window.OssuaryGameSpeed;
    return speed && typeof speed.isTurbo === "function" && speed.isTurbo() ? 0.72 : 1;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  // --- Curvas de Bezier (las mismas que usa CSS) -----------------------------
  function bezier(p) {
    var x1 = p[0], y1 = p[1], x2 = p[2], y2 = p[3];
    function sample(a1, a2, t) {
      var u = 1 - t;
      return 3 * u * u * t * a1 + 3 * u * t * t * a2 + t * t * t;
    }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 18; i++) {
        var cx = sample(x1, x2, t);
        if (Math.abs(cx - x) < 1e-4) break;
        if (cx < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return sample(y1, y2, t);
    };
  }

  // --- Eleccion de la caida -------------------------------------------------
  // ctx: { skeletons, multiplier, bloodMark }. Con mas en juego, mas amagos.
  // Solo presentacion: Math.random (nunca el RNG del motor).
  function chooseVariant(ctx) {
    ctx = ctx || {};
    if (forcedVariant) {
      var forced = forcedVariant;
      forcedVariant = null;
      lastVariant = forced;
      return forced;
    }
    var weights;
    var stake = (ctx.skeletons || 0) * Math.max(1, ctx.multiplier || 1);
    if ((ctx.skeletons || 0) >= EXECUTION_MIN_SKELETONS) {
      lastVariant = "execution";
      return "execution";
    }
    if (ctx.bloodMark > 1) {
      lastVariant = "execution";
      return "execution";
    }
    if ((ctx.skeletons || 0) >= 3 || stake >= 12) {
      weights = { classic: 58, snag: 42 };
    } else {
      weights = { classic: 70, snag: 30 };
    }
    function pick(exclude) {
      var names = Object.keys(weights).filter(function (n) { return n !== exclude; });
      if (!names.length) names = Object.keys(weights);
      var total = names.reduce(function (s, n) { return s + weights[n]; }, 0);
      var r = Math.random() * total;
      for (var i = 0; i < names.length; i++) {
        r -= weights[names[i]];
        if (r < 0) return names[i];
      }
      return names[names.length - 1];
    }
    // El atasco no se repite dos veces seguidas (perderia la sorpresa).
    var variant = pick(lastVariant === "snag" ? "snag" : null);
    lastVariant = variant;
    return variant;
  }

  // --- Planes de caida --------------------------------------------------------
  // keys: [{ t, d, ease }] (ease = curva del tramo que EMPIEZA en esa clave).
  // events: [{ t, type, strength }]. trembles: [{ t0, t1, amp }].
  // geo.rowsD: valor de drop al que la cuchilla corta cada fila (ascendente).
  function Plan() {
    this.keys = [];
    this.events = [];
    this.trembles = [];
    this.t = 0;
    this.d = 0;
  }
  Plan.prototype.at = function (d, ease) {
    this.keys.push({ t: this.t, d: d, ease: ease || EASE.linear });
    this.d = d;
    return this;
  };
  Plan.prototype.to = function (ms, d, ease) {
    if (this.keys.length) this.keys[this.keys.length - 1].ease = ease || EASE.linear;
    this.t += ms;
    this.keys.push({ t: this.t, d: d, ease: EASE.linear });
    this.d = d;
    return this;
  };
  Plan.prototype.hold = function (ms, tremble) {
    if (tremble) this.trembles.push({ t0: this.t, t1: this.t + ms, amp: tremble });
    return this.to(ms, this.d, EASE.linear);
  };
  Plan.prototype.event = function (type, strength, extra) {
    var ev = { t: this.t, type: type, strength: strength == null ? 1 : strength };
    if (extra) Object.keys(extra).forEach(function (k) { ev[k] = extra[k]; });
    this.events.push(ev);
    return this;
  };
  // Golpe abajo: frenazo (hit-stop), rebote corto y un rato quieta.
  Plan.prototype.landing = function (strength, holdMs) {
    this.event("impact", strength);
    this.hold(Math.round(60 + 40 * strength));
    this.to(110, 1 - 0.034 * strength, EASE.out);
    this.to(120, 1, [0.5, 0, 0.9, 0.5]);
    this.to(90, 1 - 0.008 * strength, EASE.out);
    this.to(80, 1, EASE.inOut);
    return this.hold(holdMs == null ? 220 : holdMs);
  };

  function planClassic() {
    // Mismo recorrido que @keyframes rib1-blade-rig-drop-anim (2240 ms).
    var p = new Plan();
    p.at(0, EASE.lazy)
      .to(224, 0.025, EASE.lazy)
      .to(179, 0.12, EASE.gather)
      .to(359, 0.64, EASE.speedUp)
      .to(224, 1, EASE.cushion)
      .event("impact", 0.55)
      .to(179, 0.944, EASE.inOut)
      .to(157, 0.996, EASE.inOut)
      .to(134, 0.976, EASE.inOut)
      .to(112, 1, EASE.inOut)
      .to(672, 0, EASE.rise);
    p.fallFrom = 224;
    return p;
  }

  function planSnag(geo) {
    var first = geo.rowsD.length ? geo.rowsD[0] : 0.3;
    var snagD = clamp(first - 0.075, 0.05, 0.4);
    var p = new Plan();
    p.at(0, EASE.lazy)
      .to(240, 0.03, EASE.lazy)
      .to(250, snagD, EASE.fall)
      .event("snag", 0.8)
      .to(70, snagD + 0.014, EASE.out)
      .to(90, snagD - 0.008, EASE.inOut)
      .to(80, snagD, EASE.inOut)
      .event("grindStart", 0.6)
      .hold(Math.round(rand(650, 900)), 0.0045)
      .event("grindStop", 0)
      .event("release", 0.8)
      .to(80, snagD - 0.018, EASE.out);
    p.fallFrom = p.t;
    p.to(Math.round(300 + 140 * (1 - snagD)), 1, EASE.freefall)
      .landing(0.9, 220)
      .to(672, 0, EASE.rise);
    return p;
  }

  function planExecution() {
    var p = new Plan();
    p.at(0, EASE.out)
      .event("charge", 1)
      .to(420, -0.045, EASE.out)
      .hold(360, 0.0028)
      .hold(560, 0.0068)
      .event("snap", 1);
    p.fallFrom = p.t;
    p.to(200, 1, EASE.freefall)
      .landing(1.2, 360)
      .to(672, 0, EASE.rise);
    return p;
  }

  function buildPlan(variant, geo) {
    geo = geo || { rowsD: [] };
    var plan;
    if (variant === "snag") plan = planSnag(geo);
    else if (variant === "execution") plan = planExecution(geo);
    else plan = planClassic(geo);
    plan.variant = variant;
    plan.duration = plan.t;
    var impact = plan.events.filter(function (e) { return e.type === "impact"; })[0];
    plan.bottomAt = impact ? impact.t : plan.t;
    plan.keys.forEach(function (k) { k.fn = bezier(k.ease); });
    return plan;
  }

  function dropAt(plan, t) {
    var keys = plan.keys;
    if (t <= keys[0].t) return keys[0].d;
    for (var i = 0; i < keys.length - 1; i++) {
      var a = keys[i], b = keys[i + 1];
      if (t < b.t) {
        var span = b.t - a.t;
        var e = span > 0 ? a.fn((t - a.t) / span) : 1;
        return a.d + (b.d - a.d) * e;
      }
    }
    return keys[keys.length - 1].d;
  }

  function trembleAt(plan, t) {
    for (var i = 0; i < plan.trembles.length; i++) {
      var tr = plan.trembles[i];
      if (t >= tr.t0 && t < tr.t1) {
        var env = Math.min(1, (t - tr.t0) / 120, (tr.t1 - t) / 80);
        return tr.amp * env;
      }
    }
    return 0;
  }

  // Balanceo: cada golpe/atasco/clic deja una oscilacion amortiguada.
  var SWAY = {
    impact: { amp: 1.9, period: 270, tau: 330, squash: 0.034 },
    snag: { amp: -1.5, period: 210, tau: 260, squash: 0.018 },
    click: { amp: 0.55, period: 170, tau: 150, squash: 0.008 },
    snap: { amp: -0.9, period: 240, tau: 220, squash: 0 },
    release: { amp: 0.7, period: 220, tau: 200, squash: 0 }
  };

  // Efectos y sonidos de cada momento de la caida.
  function handleEvent(ev, bladeEl, hooks, ctx) {
    var rect = bladeEl && bladeEl.getBoundingClientRect ? bladeEl.getBoundingClientRect() : null;
    var audio = window.OssuaryAudio;
    if (ev.type === "charge") {
      ctx.vignette = document.createElement("div");
      ctx.vignette.className = "exec-execution-vignette";
      ctx.vignette.setAttribute("aria-hidden", "true");
      document.body.appendChild(ctx.vignette);
      void ctx.vignette.offsetWidth;
      ctx.vignette.classList.add("is-on");
      if (audio) audio.trigger("guillotine_charge", {});
      if (typeof hooks.onCharge === "function") hooks.onCharge();
    } else if (ev.type === "impact") {
      if (ctx.vignette) {
        var v = ctx.vignette;
        ctx.vignette = null;
        v.classList.remove("is-on");
        window.setTimeout(function () { v.remove(); }, 600);
      }
      impact(rect, ev.strength, { blood: Boolean(hooks.blood), epic: ev.strength > 1 });
    } else if (ev.type === "snag") {
      grindSparks(rect, 1);
      shakeMachine(0.32);
      if (audio) audio.trigger("guillotine_snag", { strength: ev.strength });
    } else if (ev.type === "grindStart") {
      if (audio) audio.trigger("guillotine_grind_start", { strength: ev.strength });
    } else if (ev.type === "grindStop") {
      if (audio) audio.trigger("guillotine_grind_stop", {});
    } else if (ev.type === "snap") {
      if (audio) audio.trigger("guillotine_snap", { strength: ev.strength });
    } else if (ev.type === "release") {
      grindSparks(rect, 0.7);
      if (audio) audio.trigger("guillotine_release", { strength: ev.strength });
    }
  }

  // Chispas sueltas mientras rasca en el atasco.
  function grindTick(plan, t, bladeEl, state) {
    var grinding = plan.trembles.some(function (tr) { return t >= tr.t0 && t < tr.t1 && tr.amp >= 0.003; });
    if (!grinding) return;
    if (t - (state.lastGrind || 0) < 150 + Math.random() * 140) return;
    state.lastGrind = t;
    grindSparks(bladeEl.getBoundingClientRect(), 0.35 + Math.random() * 0.4);
  }

  // El golpe del sonido de caida (rib1_blade_fall.mp3) suena a los 780 ms del
  // archivo: se programa para que coincida con el golpe de esta caida y que
  // arranque poco antes de que empiece la caida libre.
  var FALL_SOUND_PEAK_MS = 780;
  function scheduleFallSound(plan, scale) {
    if (!window.OssuaryAudio) return;
    var realB = plan.bottomAt * scale;
    var realFrom = (plan.fallFrom || 0) * scale;
    var start = Math.max(realFrom - 120, realB - FALL_SOUND_PEAK_MS, 0);
    var offset = Math.max(0, start - (realB - FALL_SOUND_PEAK_MS));
    window.OssuaryAudio.trigger("guillotine_fall", { delayMs: Math.round(start), offsetMs: Math.round(offset) });
  }

  // --- Motor del rig ------------------------------------------------------------
  // rigEl: .rib1-blade-rig-preview ya montado (game.js). hooks: { blood,
  // onEvent(ev, info), onDone() }. Devuelve { plan, scale, cancel }.
  function drive(rigEl, plan, hooks) {
    hooks = hooks || {};
    var scale = speedFactor();
    var grindState = {};
    var eventCtx = {};
    var bladeEl = rigEl.querySelector(".rib1-blade-rig-preview__blade");
    var ropes = Array.prototype.slice.call(rigEl.querySelectorAll(".rib1-blade-rig-preview__rope"));
    rigEl.classList.add("rib1-blade-rig-preview--driven");
    rigEl.dataset.dropVariant = plan.variant;
    var startAt = 0;
    var firedIndex = 0;
    var events = plan.events.slice().sort(function (a, b) { return a.t - b.t; });
    var impulses = [];
    var raf = 0;
    var done = false;
    var prevD = 0;
    var prevT = 0;
    var noiseSeed = Math.random() * 1000;

    function set(name, value) {
      rigEl.style.setProperty(name, value);
    }

    function finish() {
      if (done) return;
      done = true;
      if (eventCtx.vignette) {
        eventCtx.vignette.remove();
        eventCtx.vignette = null;
      }
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
      if (typeof hooks.onDone === "function") hooks.onDone();
    }

    function frame(now) {
      raf = 0;
      if (done) return;
      if (!rigEl.isConnected) {
        finish();
        return;
      }
      if (!startAt) startAt = now;
      var t = (now - startAt) / scale;
      while (firedIndex < events.length && events[firedIndex].t <= t) {
        var ev = events[firedIndex++];
        var sw = SWAY[ev.type];
        if (sw) impulses.push({ t: ev.t, amp: sw.amp * (ev.strength || 1), period: sw.period, tau: sw.tau, squash: sw.squash * (ev.strength || 1) });
        try {
          handleEvent(ev, bladeEl, hooks, eventCtx);
        } catch (err) {
          if (window.console) console.warn("[guillotine-drop] efecto", err);
        }
        if (typeof hooks.onEvent === "function") {
          try {
            hooks.onEvent(ev, { bladeEl: bladeEl, rigEl: rigEl, scale: scale });
          } catch (err) {
            if (window.console) console.warn("[guillotine-drop] onEvent", err);
          }
        }
      }
      var tremble = trembleAt(plan, t);
      if (tremble && bladeEl) grindTick(plan, t, bladeEl, grindState);
      var n1 = Math.sin((t + noiseSeed) * 0.151) * Math.sin((t + noiseSeed) * 0.083 + 1.3);
      var n2 = Math.sin((t + noiseSeed) * 0.127 + 2.1) * Math.cos((t + noiseSeed) * 0.061);
      var d = dropAt(plan, t) + tremble * n1;
      var dt = Math.max(1, t - prevT);
      var vel = (d - prevD) / dt * 1000; // recorrido por segundo
      prevD = d;
      prevT = t;

      var sway = 0;
      var squash = 0;
      for (var i = 0; i < impulses.length; i++) {
        var imp = impulses[i];
        var age = t - imp.t;
        if (age < 0) continue;
        var decay = Math.exp(-age / imp.tau);
        sway += imp.amp * decay * Math.sin(2 * Math.PI * age / imp.period);
        if (imp.squash) squash += imp.squash * Math.exp(-age / 90);
      }
      sway += tremble * 120 * n2;
      // Inclinacion suave mientras cae rapido (el peso tira de las cuerdas).
      sway += clamp(-vel * 0.18, -0.9, 0.9);
      var stretch = clamp(Math.abs(vel) * 0.012, 0, 0.035);
      var sy = 1 + stretch - squash;
      var sx = 1 - stretch * 0.4 + squash * 0.5;

      var env = Math.min(1, t / 160, (plan.duration - t) / 220);
      env = clamp(env, 0, 1);
      var ropeAlpha = clamp(Math.min(t / 110, (plan.duration - t) / 140), 0, 1);
      var shadowD = clamp(d, 0, 1);

      set("--rib1-rig-drop", d.toFixed(5));
      set("--rig-sway", (sway * env).toFixed(3) + "deg");
      set("--rig-sx", sx.toFixed(4));
      set("--rig-sy", sy.toFixed(4));
      set("--rope-flutter", (sway * 0.45 + tremble * 90 * n1).toFixed(3) + "deg");
      set("--rope-alpha", ropeAlpha.toFixed(3));
      set("--rig-shadow-y", ((6 + 20 * shadowD) * env).toFixed(1) + "px");
      set("--rig-shadow-blur", ((10 + 26 * shadowD) * env).toFixed(1) + "px");
      set("--rig-shadow-alpha", ((0.42 + 0.4 * shadowD) * env).toFixed(3));

      if (t >= plan.duration) {
        set("--rib1-rig-drop", "0");
        finish();
        return;
      }
      raf = window.requestAnimationFrame(frame);
    }

    // Arranca ya en la posicion 0 (sin un fotograma con la animacion CSS).
    set("--rib1-rig-drop", "0");
    set("--rope-alpha", "0");
    scheduleFallSound(plan, scale);
    raf = window.requestAnimationFrame(frame);
    if (ropes.length === 0 && window.console) console.warn("[guillotine-drop] rig sin cuerdas");

    return {
      plan: plan,
      scale: scale,
      cancel: finish
    };
  }

  // --- Particulas (chispas, sangre, polvo) --------------------------------------
  var canvas = null;
  var ctx2d = null;
  var particles = [];
  var particleRaf = 0;
  var lastParticleT = 0;

  function ensureCanvas() {
    if (canvas && canvas.isConnected) return true;
    canvas = document.createElement("canvas");
    canvas.className = "exec-fx-particles";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    ctx2d = canvas.getContext("2d");
    resizeCanvas();
    return Boolean(ctx2d);
  }

  function resizeCanvas() {
    if (!canvas) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth, h = window.innerHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.dpr = dpr;
  }

  function addParticle(p) {
    if (particles.length > 520) particles.shift();
    particles.push(p);
    if (!particleRaf) {
      lastParticleT = 0;
      particleRaf = window.requestAnimationFrame(stepParticles);
    }
  }

  function stepParticles(now) {
    particleRaf = 0;
    if (!ctx2d) return;
    resizeCanvas();
    var dt = lastParticleT ? Math.min(0.05, (now - lastParticleT) / 1000) : 0.016;
    lastParticleT = now;
    var dpr = canvas.dpr || 1;
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    var alive = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy = p.vy * Math.pow(p.drag, dt * 60) + p.gravity * dt;
      var px = p.x, py = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      var k = 1 - p.age / p.life;
      if (p.kind === "spark") {
        ctx2d.globalCompositeOperation = "lighter";
        ctx2d.strokeStyle = "rgba(" + p.r + "," + p.g + "," + p.b + "," + (0.95 * k).toFixed(3) + ")";
        ctx2d.lineWidth = p.size * (0.5 + 0.5 * k);
        ctx2d.lineCap = "round";
        ctx2d.beginPath();
        ctx2d.moveTo(px - p.vx * 0.018, py - p.vy * 0.018);
        ctx2d.lineTo(p.x, p.y);
        ctx2d.stroke();
      } else if (p.kind === "blood") {
        ctx2d.globalCompositeOperation = "source-over";
        ctx2d.fillStyle = "rgba(" + p.r + "," + p.g + "," + p.b + "," + Math.min(1, 1.6 * k).toFixed(3) + ")";
        ctx2d.beginPath();
        var stretch = Math.min(3, 1 + Math.hypot(p.vx, p.vy) / 420);
        var ang = Math.atan2(p.vy, p.vx);
        ctx2d.ellipse(p.x, p.y, p.size * stretch, p.size, ang, 0, Math.PI * 2);
        ctx2d.fill();
      } else {
        // polvo / ceniza: bocanada blanda que crece y se apaga
        ctx2d.globalCompositeOperation = "source-over";
        var r = p.size * (1 + (1 - k) * 1.6);
        var g = ctx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        g.addColorStop(0, "rgba(" + p.r + "," + p.g + "," + p.b + "," + (0.32 * k).toFixed(3) + ")");
        g.addColorStop(1, "rgba(" + p.r + "," + p.g + "," + p.b + ",0)");
        ctx2d.fillStyle = g;
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx2d.fill();
      }
      alive.push(p);
    }
    ctx2d.globalCompositeOperation = "source-over";
    particles = alive;
    if (particles.length) particleRaf = window.requestAnimationFrame(stepParticles);
    else ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Chispas de hierro: haz de rayitas que salen de (x, y) en abanico.
  function sparks(x, y, opts) {
    opts = opts || {};
    if (!ensureCanvas()) return;
    var count = Math.round(opts.count || 24);
    var spread = opts.spread == null ? Math.PI * 0.9 : opts.spread;
    var dir = opts.dir == null ? -Math.PI / 2 : opts.dir;
    var speed = opts.speed || 520;
    for (var i = 0; i < count; i++) {
      var a = dir + (Math.random() - 0.5) * spread;
      var v = speed * (0.35 + Math.random() * 0.9);
      var hot = Math.random();
      addParticle({
        kind: "spark",
        x: x + (Math.random() - 0.5) * (opts.width || 0),
        y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        gravity: 1500,
        drag: 0.965,
        size: 1.2 + Math.random() * 1.6,
        life: 0.28 + Math.random() * 0.45,
        age: 0,
        r: 255,
        g: Math.round(150 + 100 * hot),
        b: Math.round(40 + 140 * hot * hot)
      });
    }
  }

  // Sangre: gotas oscuras que salen disparadas y caen.
  function blood(x, y, opts) {
    opts = opts || {};
    if (!ensureCanvas()) return;
    var count = Math.round(opts.count || 18);
    var dir = opts.dir == null ? Math.PI / 2 : opts.dir;
    var spread = opts.spread == null ? Math.PI * 1.1 : opts.spread;
    var speed = opts.speed || 340;
    for (var i = 0; i < count; i++) {
      var a = dir + (Math.random() - 0.5) * spread;
      var v = speed * (0.3 + Math.random() * 0.9);
      var dark = Math.random();
      addParticle({
        kind: "blood",
        x: x + (Math.random() - 0.5) * (opts.width || 10),
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - (opts.lift || 120),
        gravity: 1300,
        drag: 0.975,
        size: 1.6 + Math.random() * (opts.big ? 4 : 2.6),
        life: 0.55 + Math.random() * 0.5,
        age: 0,
        r: Math.round(120 + 70 * dark),
        g: Math.round(4 + 10 * dark),
        b: Math.round(6 + 10 * dark)
      });
    }
  }

  function dust(x, y, opts) {
    opts = opts || {};
    if (!ensureCanvas()) return;
    var count = Math.round(opts.count || 8);
    for (var i = 0; i < count; i++) {
      var side = Math.random() < 0.5 ? -1 : 1;
      addParticle({
        kind: "dust",
        x: x + (Math.random() - 0.5) * (opts.width || 60),
        y: y - Math.random() * 8,
        vx: side * (40 + Math.random() * 140),
        vy: -30 - Math.random() * 70,
        gravity: -20,
        drag: 0.94,
        size: 14 + Math.random() * 22,
        life: 0.7 + Math.random() * 0.6,
        age: 0,
        r: 120, g: 108, b: 96
      });
    }
  }

  // --- Golpes ------------------------------------------------------------------
  function shakeMachine(strength) {
    var s = clamp(strength || 0.5, 0.1, 1.4);
    ["sceneLayers", "reelLayer", "structureOverlay"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || typeof el.animate !== "function") return;
      el.animate([
        { translate: "0 0" },
        { translate: (-7 * s).toFixed(1) + "px " + (11 * s).toFixed(1) + "px", offset: 0.07 },
        { translate: (6 * s).toFixed(1) + "px " + (-6 * s).toFixed(1) + "px", offset: 0.2 },
        { translate: (-4 * s).toFixed(1) + "px " + (3 * s).toFixed(1) + "px", offset: 0.36 },
        { translate: (2.5 * s).toFixed(1) + "px " + (-1.5 * s).toFixed(1) + "px", offset: 0.54 },
        { translate: (-1 * s).toFixed(1) + "px 0.5px", offset: 0.74 },
        { translate: "0 0" }
      ], { duration: Math.round(380 + 260 * s), easing: "ease-out", composite: "add" });
    });
  }

  var flashEl = null;
  function flash(kind) {
    if (!flashEl || !flashEl.isConnected) {
      flashEl = document.createElement("div");
      flashEl.className = "exec-impact-flash";
      flashEl.setAttribute("aria-hidden", "true");
      document.body.appendChild(flashEl);
    }
    flashEl.dataset.kind = kind || "steel";
    flashEl.classList.remove("is-on");
    void flashEl.offsetWidth;
    flashEl.classList.add("is-on");
  }

  // Golpe de la cuchilla abajo del todo. rect: caja de la cuchilla (viewport).
  function impact(rect, strength, options) {
    options = options || {};
    var s = clamp(strength || 0.6, 0.2, 1.2);
    shakeMachine(s);
    if (rect && rect.width) {
      var bottom = rect.top + rect.height * 0.92;
      sparks(rect.left + rect.width * 0.04, bottom, { count: Math.round(14 + 22 * s), dir: -Math.PI * 0.62, spread: Math.PI * 0.7, speed: 420 + 300 * s });
      sparks(rect.right - rect.width * 0.04, bottom, { count: Math.round(14 + 22 * s), dir: -Math.PI * 0.38, spread: Math.PI * 0.7, speed: 420 + 300 * s });
      if (s >= 0.8) sparks(rect.left + rect.width / 2, bottom, { count: Math.round(18 * s), width: rect.width * 0.8, spread: Math.PI * 0.6, speed: 380 });
      dust(rect.left + rect.width / 2, bottom + 6, { count: Math.round(5 + 8 * s), width: rect.width });
      if (options.epic) {
        // Ejecucion: chispas a lo largo de todo el filo y una nube de polvo.
        for (var i = 0; i < 5; i++) {
          sparks(rect.left + rect.width * (0.1 + i * 0.2), bottom, { count: 14, spread: Math.PI * 0.9, speed: 520 });
        }
        dust(rect.left + rect.width / 2, bottom + 10, { count: 14, width: rect.width * 1.2 });
      }
    }
    if (options.epic) flash("execution");
    else if (s >= 0.8 || options.blood) flash(options.blood ? "blood" : "steel");
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("guillotine_impact", { strength: s, blood: Boolean(options.blood) });
  }

  // Chispas del atasco: por los dos rieles (los bordes de la cuchilla).
  function grindSparks(rect, strength) {
    if (!rect || !rect.width) return;
    var s = strength || 0.6;
    var y = rect.top + rect.height * 0.3;
    sparks(rect.left + 4, y, { count: Math.round(6 + 10 * s), dir: Math.PI * 0.85, spread: Math.PI * 0.55, speed: 300 + 200 * s });
    sparks(rect.right - 4, y, { count: Math.round(6 + 10 * s), dir: Math.PI * 0.15, spread: Math.PI * 0.55, speed: 300 + 200 * s });
  }

  // --- Importe de cada fila cortada ---------------------------------------------
  function winTargetRect() {
    var el = document.getElementById("bonusWinReadout");
    if (!el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    return r.width ? r : null;
  }

  function pulseWin() {
    var el = document.getElementById("bonusWinReadout");
    if (!el) return;
    el.classList.remove("exec-win-pulse");
    void el.offsetWidth;
    el.classList.add("exec-win-pulse");
    window.setTimeout(function () { el.classList.remove("exec-win-pulse"); }, 520);
  }

  function formatAmount(value) {
    var amount = Math.round((Number(value) || 0) * 100) / 100;
    return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // targets: [{ rect }] de las manos de la fila; amount: lo que paga la fila;
  // options.bloodMark: el corte viene con Marca de Sangre (cifras rojas).
  function rowCut(targets, amount, options) {
    options = options || {};
    var rects = (targets || []).map(function (t) { return t.rect; }).filter(function (r) { return r && r.width; });
    rects.forEach(function (r, i) {
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height * 0.5;
      var outward = cx < window.innerWidth / 2 ? Math.PI * 0.85 : Math.PI * 0.15;
      blood(cx, cy, { count: options.bloodMark ? 26 : 16, dir: outward, spread: Math.PI * 0.9, speed: 300, big: Boolean(options.bloodMark), width: r.width * 0.4 });
      sparks(cx + (i === 0 ? r.width * 0.25 : -r.width * 0.25), cy, { count: 6, spread: Math.PI * 1.4, speed: 260 });
    });
    if (!(amount > 0) || !rects.length) {
      if (typeof options.onLanded === "function") options.onLanded();
      return;
    }
    var minX = Math.min.apply(null, rects.map(function (r) { return r.left; }));
    var maxX = Math.max.apply(null, rects.map(function (r) { return r.right; }));
    var midY = rects.reduce(function (s, r) { return s + r.top + r.height / 2; }, 0) / rects.length;
    spawnPrize((minX + maxX) / 2, midY, amount, options);
  }

  // options.onLanded(): cuando la cifra llega al WIN (una sola vez, tambien si
  // no hay WIN a la vista); game.js retiene hasta entonces ese importe en el
  // WIN del HUD para que suba justo al llegar.
  function spawnPrize(x, y, amount, options) {
    options = options || {};
    var landedCalled = false;
    function landed() {
      if (landedCalled) return;
      landedCalled = true;
      if (typeof options.onLanded === "function") options.onLanded();
    }
    var el = document.createElement("div");
    el.className = "exec-cut-prize" + (options.bloodMark ? " exec-cut-prize--blood" : "") + (options.big ? " exec-cut-prize--big" : "");
    el.setAttribute("aria-hidden", "true");
    var value = document.createElement("div");
    value.className = "exec-cut-prize__value";
    var text = formatAmount(amount);
    if (window.OssuaryNumberFont) window.OssuaryNumberFont.render(value, text, { separatorImages: true });
    else value.textContent = text;
    el.appendChild(value);
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);

    var scale = speedFactor();
    var popMs = Math.round((options.big ? 620 : 460) * scale);
    var holdMs = Math.round((options.big ? 720 : options.gather ? 120 : 220) * scale);
    var flyMs = Math.round((options.gather ? 380 : 520) * scale);
    var target = winTargetRect();
    if (options.big) {
      sparks(x, y, { count: 40, spread: Math.PI * 2, speed: 380 });
      if (window.OssuaryAudio) window.OssuaryAudio.trigger("guillotine_total", {});
    }
    el.animate([
      { transform: "translate(-50%, -50%) scale(0.35)", opacity: 0, filter: "brightness(2.4) blur(3px)" },
      { transform: "translate(-50%, -62%) scale(1.18)", opacity: 1, filter: "brightness(1.6) blur(0px)", offset: 0.42 },
      { transform: "translate(-50%, -70%) scale(1)", opacity: 1, filter: "brightness(1) blur(0px)" }
    ], { duration: popMs, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });

    window.setTimeout(function () {
      if (!el.isConnected) {
        landed();
        return;
      }
      var r = el.getBoundingClientRect();
      // gather: la cifra se junta con las demas en un punto (el total del
      // corte saldra de ahi) en vez de volar al WIN.
      if (options.gather) {
        var gx = options.gather.x - (r.left + r.width / 2);
        var gy = options.gather.y - (r.top + r.height / 2);
        var gAnim = el.animate([
          { transform: "translate(-50%, -70%) scale(1)", opacity: 1 },
          { transform: "translate(calc(-50% + " + gx.toFixed(1) + "px), calc(-70% + " + gy.toFixed(1) + "px)) scale(0.55)", opacity: 0.2 }
        ], { duration: flyMs, easing: "cubic-bezier(.55,0,.8,.4)", fill: "forwards" });
        gAnim.onfinish = function () {
          el.remove();
          landed();
        };
        return;
      }
      var tr = winTargetRect();
      if (!tr) {
        landed();
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }).onfinish = function () { el.remove(); };
        return;
      }
      var fromX = r.left + r.width / 2, fromY = r.top + r.height / 2;
      var toX = tr.left + tr.width / 2, toY = tr.top + tr.height / 2;
      var dx = toX - fromX, dy = toY - fromY;
      var lift = -Math.max(40, Math.abs(dx) * 0.18);
      var endScale = Math.max(0.28, Math.min(0.7, tr.height / Math.max(1, r.height)));
      var anim = el.animate([
        { transform: "translate(-50%, -70%) scale(1)", opacity: 1 },
        { transform: "translate(calc(-50% + " + (dx * 0.45).toFixed(1) + "px), calc(-70% + " + (dy * 0.25 + lift).toFixed(1) + "px)) scale(" + ((1 + endScale) / 2).toFixed(3) + ")", opacity: 1, offset: 0.45 },
        { transform: "translate(calc(-50% + " + dx.toFixed(1) + "px), calc(-70% + " + dy.toFixed(1) + "px)) scale(" + endScale.toFixed(3) + ")", opacity: 0.85 }
      ], { duration: flyMs, easing: "cubic-bezier(.55,0,.75,.35)", fill: "forwards" });
      anim.onfinish = function () {
        el.remove();
        landed();
        pulseWin();
        sparks(toX, toY, { count: 8, spread: Math.PI * 2, speed: 160 });
        if (window.OssuaryAudio) window.OssuaryAudio.trigger("guillotine_prize_landed", {});
      };
    }, popMs + holdMs);
    window.setTimeout(function () {
      if (el.isConnected) el.remove();
      landed();
    }, popMs + holdMs + flyMs + 1500);
    if (!target && window.console) console.warn("[guillotine-drop] sin WIN en el HUD");
  }

  window.addEventListener("resize", function () { if (canvas) resizeCanvas(); });

  window.OssuaryGuillotineDrop = {
    chooseVariant: chooseVariant,
    buildPlan: buildPlan,
    drive: drive,
    impact: impact,
    grindSparks: grindSparks,
    rowCut: rowCut,
    sparks: sparks,
    blood: blood,
    dust: dust,
    shakeMachine: shakeMachine,
    flash: flash,
    spawnPrize: spawnPrize,
    speedFactor: speedFactor,
    variants: ["classic", "snag", "execution"],
    forceNext: function (variant) {
      forcedVariant = ["classic", "snag", "execution"].indexOf(variant) !== -1 ? variant : null;
      return forcedVariant;
    },
    forcedNext: function () { return forcedVariant; },
    lastVariant: function () { return lastVariant; }
  };
})();
