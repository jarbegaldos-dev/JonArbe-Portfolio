(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Tension del Execution Bonus — SOLO PRESENTACION (peticion del usuario,
  // 2026-10-16: mas dopamina y mas tension en el bonus).
  //
  // - Marca de Sangre (logica en src/bonus/execution-enhancers.js): la lleva
  //   un esqueleto del tablero, con la animacion del infectado de El Juicio:
  //   cae el sello BLIGHTED, se tine de sangre, encima ruedan multiplicadores
  //   de sangre (x2, x3, x5, x10...) que frenan y se clavan en el que toca, y
  //   se lo lanza con un chorro a la guillotina, que sangra. Si la cuchilla ya
  //   llevaba el multiplicador de la caja, game.js los junta en uno (x5 * x3).
  // - Ultima oportunidad: con 1 vela y esqueletos en el tablero, cuando solo
  //   falta el esternon, el tablero se oscurece, laten los latidos, la vela
  //   tiembla y los esqueletos se encogen en sus cepos. Se acaba al parar.
  // - Ultimo Aliento: se apaga la ultima vela con esqueletos en el tablero:
  //   oscuridad salvo la vela, el pabilo humea, saltan chispitas... y o prende
  //   de golpe (una oportunidad mas) o se apaga del todo.
  //
  // Sin rotulos (ART_BIBLE: nada de carteles genericos): solo luz, sangre,
  // humo y golpes. Estilos: src/fx/execution-fx.css. Particulas y temblor:
  // src/fx/guillotine-drop.js.
  // ---------------------------------------------------------------------------

  var MARK_VALUES = [2, 3, 5, 10, 25, 50, 100];

  function fx() {
    return window.OssuaryGuillotineDrop || null;
  }

  function audio(name, payload) {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger(name, payload || {});
  }

  function speedFactor() {
    var g = fx();
    return g ? g.speedFactor() : 1;
  }

  // Cifras del sello en el oro cincelado del juego (cifras y aspa "x" de
  // assets/fonts, OssuaryNumberFont), tenidas de sangre por CSS. Tambien los
  // rotulos: desde el 2026-10-17 sus palabras van en la fuente Buffied de los
  // bonus (peticion del usuario) y las cifras siguen en oro. Si falta algun
  // caracter, texto normal (no se mezclan).
  function paint(el, text) {
    var font = window.OssuaryNumberFont;
    if (text && font && typeof font.canRenderWords === "function" && font.canRenderWords(text)) {
      font.render(el, text, { letters: true, words: true });
      el.setAttribute("aria-label", text);
    } else {
      el.classList.remove("ossuary-number-font");
      el.textContent = text || "";
    }
  }

  function overlay(cls) {
    var el = document.createElement("div");
    el.className = cls;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    return el;
  }

  // --- Rotulo de una mecanica ---------------------------------------------------
  // Peticion del usuario (2026-10-16): "no se entiende por que sale". Al saltar
  // la Marca de Sangre o el Ultimo Aliento, su nombre y lo que hace, junto a
  // donde pasa. x, y: centro (viewport). Desde la segunda vuelta del mismo dia
  // ("la fuente no me convence, dale personalidad y profundidad"), en las
  // letras de oro cincelado del contador BIG WIN (paint).
  // Numera cada letra (--i) para que el CSS las anime una tras otra.
  function stagger(el) {
    for (var i = 0; i < el.children.length; i++) el.children[i].style.setProperty("--i", i);
  }

  // sub null: solo el nombre (la Marca de Sangre, desde el 2026-10-18).
  function showTitle(x, y, title, sub, kind) {
    var el = overlay("exec-title exec-title--" + (kind || "blood"));
    var t = document.createElement("div");
    t.className = "exec-title__name";
    paint(t, title);
    stagger(t);
    var s = document.createElement("div");
    s.className = "exec-title__sub";
    paint(s, sub || "");
    stagger(s);
    el.appendChild(t);
    if (sub != null) el.appendChild(s);
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
    void el.offsetWidth;
    el.classList.add("is-on");
    return {
      el: el,
      setSub: function (text, cls) {
        if (!s.parentNode) el.appendChild(s);
        s.className = "exec-title__sub" + (cls ? " " + cls : "");
        paint(s, text);
        stagger(s);
        s.classList.remove("is-punch");
        void s.offsetWidth;
        s.classList.add("is-punch");
      },
      // El rotulo prende (Ultimo Aliento que se salva): ver execution-fx.css.
      ignite: function () {
        el.classList.add("is-lit");
      },
      // Se desliza hasta otro sitio (la Marca de Sangre, del esqueleto a la
      // cuchilla).
      moveTo: function (nx, ny) {
        el.classList.add("is-gliding");
        el.style.left = Math.round(nx) + "px";
        el.style.top = Math.round(ny) + "px";
      },
      hide: function (mode) {
        el.classList.remove("is-on");
        if (mode) el.classList.add("is-" + mode);
        window.setTimeout(function () { el.remove(); }, 900);
      }
    };
  }

  // --- Chorro de sangre ---------------------------------------------------------
  // Del esqueleto que lleva la Marca a la cuchilla: unos goterones que vuelan en
  // arco uno tras otro y van soltando gotas por el camino. from/to: puntos
  // (viewport). onArrive: cuando llega el primero. rider: elemento que vuela
  // con el primero (la cifra de la Marca, desde el 2026-10-19).
  function throwBlood(from, to, durMs, onArrive, rider) {
    var g = fx();
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    var lift = Math.max(70, Math.hypot(dx, dy) * 0.32);
    var arrived = false;
    function arrive() {
      if (arrived) return;
      arrived = true;
      if (typeof onArrive === "function") onArrive();
    }
    [1, 0.82, 0.66, 0.5, 0.36].forEach(function (size, i) {
      var el = overlay("exec-blood-glob");
      el.style.setProperty("--s", size);
      var start = performance.now() + i * 42 * speedFactor();
      var lastDrip = 0;
      function step(now) {
        var p = (now - start) / durMs;
        if (p < 0) {
          window.requestAnimationFrame(step);
          return;
        }
        p = Math.min(1, p);
        var x = from.x + dx * p;
        var y = from.y + dy * p - 4 * lift * p * (1 - p);
        var ang = Math.atan2(dy - 4 * lift * (1 - 2 * p), dx) * 180 / Math.PI;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + ang.toFixed(1) + "deg)";
        el.style.opacity = "1";
        if (rider && i === 0) rider.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) translate(-50%,-50%)";
        if (g && i < 2 && now - lastDrip > 38) {
          lastDrip = now;
          g.blood(x, y, { count: 2, dir: Math.PI / 2, spread: 0.7, speed: 50, lift: 0, width: 5 });
        }
        if (p < 1) {
          window.requestAnimationFrame(step);
          return;
        }
        el.remove();
        if (i === 0) arrive();
        else if (g) g.blood(x, y, { count: 5, spread: Math.PI * 2, speed: 160, lift: 30, width: 8 });
      }
      window.requestAnimationFrame(step);
    });
    // Por si no hay fotogramas (pestana oculta): que el corte siga.
    window.setTimeout(arrive, durMs + 160);
  }

  // --- Marca de Sangre ---------------------------------------------------------
  // anchorFn() -> elemento de la cuchilla (pieza de rib1) donde se pinta el sello.
  // options: { carrier, beside, onLanded(value, seal), onDone(seal) } (base, el
  // multiplicador de la caja, ya no se usa: era para la cuenta del rotulo).
  // Desde el 2026-10-17 la lleva un esqueleto del tablero (peticion del
  // usuario: "que la lleve uno de los esqueletos"); carrier es su elemento,
  // que elige game.js. Desde el 2026-10-19, con la animacion del infectado de
  // El Juicio (peticion del usuario: "que funcione igual pero con la animacion
  // igual que en el superbonus"): el sello BLIGHTED del usuario cae sobre el
  // esqueleto (src/fx/el-juicio-blight-stamp.js), que se tine de sangre al
  // golpe; encima rueda la ruleta de multiplicadores en las cifras de sangre
  // del Super (las clases de el-juicio.js#blightRoll), frena y se clava en el
  // que toca; el esqueleto coge impulso y la cifra vuela con su chorro de
  // sangre a la cuchilla, que sangra y se queda el sello con la cifra. Sin
  // rotulo BLOOD MARK (el sello lo dice). Sin carrier (no deberia pasar): el
  // sello cae sobre la cuchilla y la ruleta rueda en ella, como antes.
  function playBloodMark(anchorFn, value, options) {
    options = options || {};
    var scale = speedFactor();
    var at = function (x) { return Math.round(x * scale); };
    var anchor = typeof anchorFn === "function" ? anchorFn() : null;
    var vignette = overlay("exec-mark-vignette");
    void vignette.offsetWidth;
    vignette.classList.add("is-on");
    var timers = [];
    var later = function (fn, ms) { timers.push(window.setTimeout(fn, ms)); };

    var carrier = options.carrier || null;
    var cr = carrier && carrier.getBoundingClientRect ? carrier.getBoundingClientRect() : null;
    if (!cr || !cr.width) {
      carrier = null;
      cr = null;
    }
    // La vineta deja un claro sobre el esqueleto para que no se pierda.
    if (carrier) {
      var vr = vignette.getBoundingClientRect();
      vignette.style.setProperty("--hole-x", Math.round(cr.left + cr.width / 2 - vr.left) + "px");
      vignette.style.setProperty("--hole-y", Math.round(cr.top + cr.height / 2 - vr.top) + "px");
      vignette.style.setProperty("--hole-r", Math.round(Math.max(cr.width, cr.height) * 0.8) + "px");
      vignette.classList.add("has-carrier");
    }

    var seal = document.createElement("div");
    // beside: la cuchilla ya lleva el multiplicador de la caja en el centro;
    // el sello sale a su lado y al clavarse se funde con el.
    seal.className = "exec-blood-seal" + (options.beside ? " exec-blood-seal--beside" : "");
    var splat = document.createElement("div");
    splat.className = "exec-blood-seal__splat";
    // La mancha del usuario, cada vez girada y en espejo o no (2026-10-19).
    splat.style.transform = "rotate(" + (Math.random() * 50 - 25).toFixed(1) + "deg) scale(" + (Math.random() < 0.5 ? -1 : 1) + ", " + (Math.random() < 0.5 ? -1 : 1) + ")";
    var num = document.createElement("div");
    num.className = "exec-blood-seal__value";
    // Con portador la cifra llega ya clavada; sin el, rueda aqui.
    paint(num, "x" + (carrier ? value : MARK_VALUES[0]));
    seal.appendChild(splat);
    seal.appendChild(num);
    if (anchor) anchor.appendChild(seal);
    else document.body.appendChild(seal);

    var bladeImg = anchor && anchor.querySelector ? anchor.querySelector("img") : null;
    var ar = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : null;
    var bladeX = ar && ar.width ? ar.left + ar.width / 2 : window.innerWidth / 2;
    var bladeY = ar && ar.width ? ar.top + ar.height * 0.45 : window.innerHeight * 0.18;
    var g = fx();
    var roll = null;
    var rollValue = null;
    var cancelled = false;

    // Sello BLIGHTED sobre el esqueleto (o la cuchilla); al golpe se tine.
    var stamp = window.OssuaryBlightStamp;
    var target = carrier || anchor;
    var stampMs = stamp && target ? 1100 : 0; // golpe (670) + encendido (430)
    function marked() {
      if (cancelled) return;
      if (carrier) {
        carrier.classList.add("exec-blood-carrier");
        carrier.classList.add("exec-blood-carrier--marked");
        var ccx = cr.left + cr.width / 2;
        if (g) g.blood(ccx, cr.top + cr.height * 0.42, { count: 22, spread: Math.PI * 2, speed: 220, lift: 70, big: true, width: cr.width * 0.3 });
        [320, 580, 800].forEach(function (ms) {
          later(function () {
            if (g) g.blood(ccx, cr.top + cr.height * 0.6, { count: 4, spread: Math.PI * 0.5, speed: 60, lift: 0, width: cr.width * 0.4 });
          }, at(ms));
        });
      } else if (bladeImg) {
        bladeImg.classList.add("exec-blade-bleeding");
      }
    }
    if (stampMs) {
      stamp.play(target, { ms: at, maxWidth: carrier ? 230 : 200, onImpact: marked });
    } else {
      later(marked, at(160));
    }
    // Se enciende el sello: sangre y retumbo, como el infectado del Super.
    later(function () {
      audio("exec_blood_mark_start", { value: value });
      if (g) {
        g.flash("blood");
        g.shakeMachine(0.3);
      }
    }, at(stampMs || 160));

    // Ruleta de cifras que frena (la del infectado de El Juicio): cada cambio
    // un clac, cada vez mas lento, y acaba en el valor que toca.
    var seq = MARK_VALUES.concat(MARK_VALUES);
    var endAt = seq.lastIndexOf(value);
    if (endAt === -1) {
      seq.push(value);
      endAt = seq.length - 1;
    }
    var steps = Math.min(endAt, carrier ? 8 + Math.floor(Math.random() * 3) : 14 + Math.floor(Math.random() * 3));
    var t = at(stampMs + 220);
    if (carrier) {
      later(function () {
        if (cancelled) return;
        roll = document.createElement("div");
        roll.className = "exec-cut-prize exec-cut-prize--blood el-juicio-prize el-juicio-blight-roll exec-blight-roll";
        roll.setAttribute("aria-hidden", "true");
        rollValue = document.createElement("div");
        rollValue.className = "exec-cut-prize__value";
        roll.appendChild(rollValue);
        var r = carrier.getBoundingClientRect();
        roll.style.transform = "translate(" + (r.left + r.width / 2).toFixed(1) + "px," + (r.top + r.height * 0.5).toFixed(1) + "px) translate(-50%,-50%)";
        document.body.appendChild(roll);
        carrier.classList.add("exec-blood-carrier--value");
      }, t);
    }
    for (var k = endAt - steps, j = 0; k <= endAt; k++, j++) {
      (function (v, n) {
        later(function () {
          var el = carrier ? rollValue : num;
          var box = carrier ? roll : num;
          if (!el || !box) return;
          paint(el, "x" + v);
          box.classList.remove("is-tick");
          void box.offsetWidth;
          box.classList.add("is-tick");
          if (n < steps) audio("exec_blood_mark_tick", { step: n, total: steps });
        }, t);
      })(seq[k], j);
      t += at(42 + j * j * 3.6);
    }
    var rollAt = t;

    // La sangre salpica la hoja y el sello se queda en ella con la cifra.
    var hitDone = false;
    function hit() {
      if (hitDone || cancelled) return;
      hitDone = true;
      if (carrier) {
        carrier.classList.remove("exec-blood-carrier--marked", "exec-blood-carrier--value");
        carrier.classList.add("exec-blood-carrier--consumed");
        window.setTimeout(function () { carrier.classList.remove("exec-blood-carrier--consumed"); }, at(620));
      }
      if (roll) roll.remove();
      seal.classList.add("is-landed");
      num.classList.add("is-landed");
      if (bladeImg) bladeImg.classList.add("exec-blade-bleeding");
      audio(carrier ? "exec_blood_mark_splash" : "exec_blood_mark_land", { value: value });
      if (g && anchor) {
        var r = anchor.getBoundingClientRect();
        g.blood(r.left + r.width / 2, r.top + r.height * 0.45, { count: 34 + value * 2, spread: Math.PI * 2, speed: 380, lift: 60, big: true, width: r.width * 0.25 });
        g.shakeMachine(0.45 + Math.min(0.5, value / 20));
        g.flash("blood");
      }
      if (typeof options.onLanded === "function") options.onLanded(value, seal);
    }

    var landAt;
    if (carrier) {
      // Se clava sobre el esqueleto...
      later(function () {
        if (!roll) return;
        roll.classList.remove("is-tick");
        roll.classList.add("is-landed");
        audio("exec_blood_mark_land", { value: value });
        var rr = roll.getBoundingClientRect();
        if (g) {
          g.sparks(rr.left + rr.width / 2, rr.top + rr.height / 2, { count: 22, spread: Math.PI * 2, speed: 300 });
          g.blood(rr.left + rr.width / 2, rr.top + rr.height / 2, { count: 14, spread: Math.PI * 2, speed: 200, lift: 40, width: rr.width * 0.4 });
          g.shakeMachine(0.3);
        }
      }, rollAt);
      // ...coge impulso y la lanza con su chorro de sangre a la cuchilla.
      var throwAt = rollAt + at(520);
      later(function () {
        if (cancelled) return;
        carrier.classList.remove("exec-blood-carrier--value");
        carrier.classList.add("is-throwing");
      }, throwAt);
      later(function () {
        if (cancelled) return;
        var c = carrier.getBoundingClientRect();
        var from = { x: c.left + c.width / 2, y: c.top + c.height * 0.4 };
        if (roll) {
          var rr = roll.getBoundingClientRect();
          from = { x: rr.left + rr.width / 2, y: rr.top + rr.height / 2 };
        }
        var r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : ar;
        var to = r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height * 0.45 } : { x: bladeX, y: bladeY };
        audio("exec_blood_mark_throw", {});
        throwBlood(from, to, at(540), hit, roll);
      }, throwAt + at(140));
      landAt = throwAt + at(140 + 540);
    } else {
      later(function () { seal.classList.add("is-in"); }, at(stampMs || 160));
      later(hit, rollAt);
      landAt = rollAt;
    }

    var doneAt = landAt + at(1100);
    later(function () {
      vignette.classList.remove("is-on");
      window.setTimeout(function () { vignette.remove(); }, 500);
      if (typeof options.onDone === "function") options.onDone(seal);
    }, doneAt);

    return {
      seal: seal,
      durationMs: doneAt,
      // game.js la quita al acabar el ciclo de la cuchilla.
      clear: function () {
        if (!hitDone) {
          cancelled = true;
          timers.forEach(window.clearTimeout);
        }
        if (roll && roll.isConnected) roll.remove();
        if (bladeImg) bladeImg.classList.remove("exec-blade-bleeding");
        if (carrier) carrier.classList.remove("exec-blood-carrier", "is-throwing", "exec-blood-carrier--marked", "exec-blood-carrier--value", "exec-blood-carrier--consumed");
        if (seal.isConnected) seal.remove();
        if (vignette.isConnected) vignette.remove();
      }
    };
  }

  // Mueve el sello a la cuchilla que cae (el clon del rig) o lo quita.
  function moveSeal(seal, newAnchor) {
    if (seal && newAnchor && seal.parentNode !== newAnchor) newAnchor.appendChild(seal);
  }

  // --- Ultima oportunidad ------------------------------------------------------
  var lastChance = { on: false, vignette: null, skeletons: [], candle: null };

  function startLastChance(options) {
    options = options || {};
    if (lastChance.on) return;
    lastChance.on = true;
    if (!lastChance.vignette || !lastChance.vignette.isConnected) {
      lastChance.vignette = overlay("exec-last-chance-vignette");
      void lastChance.vignette.offsetWidth;
    }
    lastChance.vignette.classList.add("is-on");
    lastChance.skeletons = (options.skeletons || []).filter(Boolean);
    lastChance.skeletons.forEach(function (el, i) {
      el.style.setProperty("--fear-delay", (-i * 97) + "ms");
      el.classList.add("exec-skeleton-fear");
    });
    lastChance.candle = options.candleCounter || document.querySelector(".bonus-candle-counter");
    if (lastChance.candle) lastChance.candle.classList.add("bonus-candle-counter--last");
    audio("exec_last_chance", {});
  }

  // result: "blade" (se salva) o "miss".
  function endLastChance(result) {
    if (!lastChance.on) return;
    lastChance.on = false;
    if (lastChance.vignette) lastChance.vignette.classList.remove("is-on");
    lastChance.skeletons.forEach(function (el) { el.classList.remove("exec-skeleton-fear"); });
    lastChance.skeletons = [];
    if (lastChance.candle) lastChance.candle.classList.remove("bonus-candle-counter--last");
    audio("exec_last_chance_end", { result: result });
    if (result === "blade") {
      var g = fx();
      if (g) g.flash("steel");
    }
  }

  // --- Ultimo Aliento ------------------------------------------------------------
  // options: { success, candleSlot (elemento de la ultima vela), onRelight(),
  // onDone() }. onRelight es el momento en que game.js devuelve la oportunidad
  // (la vela se enciende con su propio destello y su cerilla).
  function playLastBreath(options) {
    options = options || {};
    var scale = speedFactor();
    var g = fx();
    var slot = options.candleSlot || null;
    var r = slot && slot.getBoundingClientRect ? slot.getBoundingClientRect() : null;
    var cx = r && r.width ? r.left + r.width / 2 : window.innerWidth * 0.62;
    // La llama vive encima de la casilla de la vela (style.css, ::after).
    var cy = r && r.width ? r.top - r.height * 0.25 : window.innerHeight * 0.22;

    var dark = overlay("exec-breath-dark");
    dark.style.setProperty("--x", cx + "px");
    dark.style.setProperty("--y", cy + "px");
    void dark.offsetWidth;
    dark.classList.add("is-on");

    var wisp = overlay("exec-breath-wisp");
    wisp.style.left = cx + "px";
    wisp.style.top = cy + "px";
    audio("exec_last_breath_start", {});

    function at(ms, fn) {
      window.setTimeout(fn, Math.round(ms * scale));
    }

    // El nombre en la oscuridad, a la izquierda de la vela; si prende,
    // "+1 CHANCE" (peticion del usuario: que se entienda por que hay otra).
    // Segunda vuelta (2026-10-16, "mas llamativo, que cambie un poco la
    // fuente"): sale letra a letra del humo en ceniza palida, mas alta y
    // ladeada, y al salvarse prende en brasa (execution-fx.css).
    var title = null;
    at(450, function () {
      // Anclado por su borde derecho (CSS): acaba un poco antes de la vela,
      // sin taparla.
      var gap = Math.max(36, (r && r.width ? r.width : 40) * 0.9);
      title = showTitle(cx - gap, cy + 16, "LAST BREATH", "", "breath");
    });

    // Chispitas en el pabilo: amagos (en los dos desenlaces).
    [900, 1220, 1510].forEach(function (ms, i) {
      at(ms, function () {
        if (g) g.sparks(cx, cy, { count: 4 + i * 3, spread: Math.PI * 0.9, speed: 120 + i * 40 });
        audio("exec_last_breath_spark", { step: i });
      });
    });

    if (options.success) {
      at(1900, function () {
        dark.classList.add("is-saved");
        wisp.remove();
        var burst = overlay("exec-breath-burst");
        burst.style.left = cx + "px";
        burst.style.top = cy + "px";
        window.setTimeout(function () { burst.remove(); }, 1400);
        if (g) {
          g.sparks(cx, cy, { count: 46, spread: Math.PI * 2, speed: 420 });
          g.shakeMachine(0.6);
          g.flash("ember");
        }
        audio("exec_last_breath_saved", {});
        if (title) {
          title.ignite();
          title.setSub("+1 CHANCE", "is-result");
        }
        if (typeof options.onRelight === "function") options.onRelight();
      });
      // El rotulo encendido se queda un poco mas que la oscuridad.
      at(3050, function () {
        if (title) title.hide();
      });
      at(2650, function () {
        dark.classList.remove("is-on");
        window.setTimeout(function () { dark.remove(); }, 700);
        if (typeof options.onDone === "function") options.onDone();
      });
    } else {
      at(1850, function () {
        wisp.classList.add("is-dying");
        dark.classList.add("is-lost");
        if (title) title.hide("ash");
        audio("exec_last_breath_lost", {});
      });
      at(2450, function () {
        dark.classList.remove("is-on");
        window.setTimeout(function () { dark.remove(); wisp.remove(); }, 700);
        if (typeof options.onDone === "function") options.onDone();
      });
    }
  }

  // --- Brasa a la caja ---------------------------------------------------------
  // Peticion del usuario (2026-10-16: "que la cuchilla evolucione mas rapido"):
  // las cabezas de la guadana tambien llenan la caja. Del cuello sale una brasa
  // roja que vuela en arco hasta la caja; al llegar, la caja da un golpe.
  // fromRect: rect del cuello (viewport); toEl: la caja. onArrive opcional.
  function emberToBox(fromRect, toEl, delayMs, onArrive) {
    if (!fromRect || !toEl || !toEl.getBoundingClientRect) return;
    var scale = speedFactor();
    window.setTimeout(function () {
      var to = toEl.getBoundingClientRect();
      if (!to.width) return;
      var x0 = fromRect.left + fromRect.width * 0.5;
      var y0 = fromRect.top + fromRect.height * 0.42;
      var x1 = to.left + to.width * 0.5;
      var y1 = to.top + to.height * 0.45;
      var lift = Math.max(70, Math.abs(x1 - x0) * 0.35);
      var el = overlay("exec-ember");
      var dur = 620 * scale;
      var start = performance.now();
      function step(now) {
        var p = Math.min(1, (now - start) / dur);
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var x = x0 + (x1 - x0) * e;
        var y = y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * lift;
        el.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(" + (1.15 - 0.45 * e).toFixed(3) + ")";
        if (p < 1) {
          window.requestAnimationFrame(step);
          return;
        }
        el.remove();
        var g = fx();
        if (g) g.sparks(x1, y1, { count: 12, spread: Math.PI * 1.7, speed: 260 });
        toEl.classList.remove("exec-box-hit");
        void toEl.offsetWidth;
        toEl.classList.add("exec-box-hit");
        window.setTimeout(function () { toEl.classList.remove("exec-box-hit"); }, 420);
        if (typeof onArrive === "function") onArrive();
      }
      el.style.transform = "translate(" + x0 + "px," + y0 + "px)";
      window.requestAnimationFrame(step);
    }, Math.max(0, delayMs || 0) * scale);
  }

  window.OssuaryExecutionTension = {
    emberToBox: emberToBox,
    playBloodMark: playBloodMark,
    moveSeal: moveSeal,
    startLastChance: startLastChance,
    endLastChance: endLastChance,
    isLastChanceOn: function () { return lastChance.on; },
    playLastBreath: playLastBreath
  };
})();
