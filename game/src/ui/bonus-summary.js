(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Resumen al acabar un bonus — SOLO presentacion.
  //
  // Al terminar el Execution Bonus o la cadena del cuervo, una pantalla con el
  // nombre del bonus sobre el altar de hueso (assets/ui/bonus-summary-altar.webp,
  // peticion del usuario 2026-10-15): de la boca del altar sale humo
  // (src/fx/altar-smoke.js) y, con el, el premio (peticion 2026-10-16): la
  // cifra nace dentro del remolino, sube entre el humo contando hacia arriba
  // (cifras de oro de number-font.js) y se posa quieta encima del pozo, con
  // TOTAL WIN encima y debajo las veces la apuesta (x51), que sube cifra a
  // cifra cuando la cuenta se asienta. Despues, CONTINUE.
  //
  // game.js llama a show({ kind, total, bet, spins, auto }) y espera la
  // promesa: mientras esta abierta el juego no gira (ni autoplay). Un clic (o
  // Espacio/Enter) durante la cuenta la salta al final; con la cuenta hecha,
  // cierra. Con autoplay se cierra sola. Estilos: src/ui/bonus-summary.css.
  // ---------------------------------------------------------------------------

  var COUNT_MS = 1500;
  // Lo que tarda el premio en asomar por la boca tras abrirse la pantalla.
  var RISE_DELAY_MS = 380;
  // Un clic durante la subida la acaba en este tiempo, no de golpe.
  var RUSH_MS = 240;
  var AUTO_CLOSE_MS = 4200;
  var CLOSE_FADE_MS = 280;

  var ALTAR_SRC = "assets/ui/bonus-summary-altar.webp";
  // Boca del altar (remolino rojo) en fracciones de la imagen; lo mide
  // tools/bake-summary-altar.js.
  var MOUTH = { x: 0.51, y: 0.198, rx: 0.17, ry: 0.06 };
  // Lienzo del humo respecto al altar: mas ancho y sube por encima de el.
  var SMOKE_BOX = { left: -0.3, top: -0.55, width: 1.6, height: 0.95 };

  var TITLES = {
    execution: "EXECUTION BONUS",
    raven: "RAVEN BONUS",
    // SUPER BONUS "El Juicio" (src/fx/el-juicio.js).
    super: "SUPER BONUS"
  };

  var root = null;
  var titleEl = null;
  var altarEl = null;
  var mawEl = null;
  var centerEl = null;
  var prizeEl = null;
  var valueEl = null;
  var multEl = null;
  var spinsEl = null;
  var smoke = null;
  var current = null;
  var closing = null;
  var altarUrl = "";

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }

  // El servidor manda las imagenes con no-store: el altar se guarda una vez en
  // memoria (blob:) ya descodificado, como las cifras de number-font.js, para
  // que la pantalla no salga sin el.
  function keepAltarResident() {
    if (altarUrl || typeof fetch !== "function" || typeof URL.createObjectURL !== "function") return;
    altarUrl = ALTAR_SRC;
    fetch(ALTAR_SRC).then(function (res) {
      return res.ok ? res.blob() : null;
    }).then(function (blob) {
      if (!blob) return;
      var objectUrl = URL.createObjectURL(blob);
      var img = new Image();
      img.src = objectUrl;
      return (typeof img.decode === "function" ? img.decode() : Promise.resolve()).then(function () {
        altarUrl = objectUrl;
        if (altarEl) altarEl.src = objectUrl;
      });
    }).catch(function () {});
  }

  function build() {
    root = el("div", "bonus-summary");
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Bonus summary");

    var scene = el("div", "bonus-summary__scene");
    titleEl = el("div", "bonus-summary__title");

    // El escenario es el altar mas el hueco de encima donde se posa el premio.
    var stage = el("div", "bonus-summary__stage");
    var shrine = el("div", "bonus-summary__shrine");
    altarEl = el("img", "bonus-summary__altar");
    altarEl.alt = "";
    altarEl.draggable = false;
    altarEl.src = altarUrl || ALTAR_SRC;

    // Resplandor del remolino, que late despacio.
    mawEl = el("span", "bonus-summary__maw");
    mawEl.style.left = MOUTH.x * 100 + "%";
    mawEl.style.top = MOUTH.y * 100 + "%";

    var smokeCanvas = el("canvas", "bonus-summary__smoke");
    smokeCanvas.style.left = SMOKE_BOX.left * 100 + "%";
    smokeCanvas.style.top = SMOKE_BOX.top * 100 + "%";
    smokeCanvas.style.width = SMOKE_BOX.width * 100 + "%";
    smokeCanvas.style.height = SMOKE_BOX.height * 100 + "%";

    centerEl = el("div", "bonus-summary__center");
    var label = el("div", "bonus-summary__label", "TOTAL WIN");
    // La cifra va dentro de prizeEl, que es lo que sube desde la boca; la
    // cifra se queda con su propio golpe al asentarse.
    prizeEl = el("div", "bonus-summary__prize");
    valueEl = el("div", "bonus-summary__value");
    prizeEl.appendChild(valueEl);
    multEl = el("div", "bonus-summary__mult");
    spinsEl = el("div", "bonus-summary__spins");
    // Solo TOTAL WIN y la cifra (peticion del usuario, 2026-10-24): sin el
    // nombre del bonus, las veces la apuesta ni las tiradas. titleEl, multEl
    // y spinsEl se siguen creando (show() los rellena) pero no se montan.
    centerEl.appendChild(label);
    centerEl.appendChild(prizeEl);

    shrine.style.setProperty("--mouth-x", MOUTH.x * 100 + "%");
    shrine.style.setProperty("--mouth-y", MOUTH.y * 100 + "%");
    shrine.appendChild(altarEl);
    shrine.appendChild(mawEl);
    shrine.appendChild(smokeCanvas);
    stage.appendChild(shrine);
    stage.appendChild(centerEl);

    var btn = el("button", "bonus-summary__continue", "CONTINUE");
    btn.type = "button";
    // De pergamino (src/ui/parchment-ui.js, peticion del usuario 2026-10-18).
    if (window.OssuaryParchment) window.OssuaryParchment.decorate(btn, "CONTINUE");

    scene.appendChild(stage);
    scene.appendChild(btn);
    root.appendChild(scene);
    document.body.appendChild(root);

    if (window.OssuaryAltarSmoke) {
      smoke = window.OssuaryAltarSmoke.create(smokeCanvas, {
        unit: 1 / SMOKE_BOX.width,
        mouth: {
          x: (MOUTH.x - SMOKE_BOX.left) / SMOKE_BOX.width,
          y: (MOUTH.y - SMOKE_BOX.top) / SMOKE_BOX.height,
          rx: MOUTH.rx / SMOKE_BOX.width,
          ry: MOUTH.ry / SMOKE_BOX.height
        }
      });
    }

    root.addEventListener("click", function (event) {
      event.stopPropagation();
      advance();
    });
  }

  function formatMoney(value) {
    var amount = Math.round((Number(value) || 0) * 100) / 100;
    return "€" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderAmount(value) {
    var text = formatMoney(value);
    if (window.OssuaryNumberFont) {
      window.OssuaryNumberFont.render(valueEl, text, { separatorImages: true });
    } else {
      valueEl.textContent = text;
    }
  }

  function formatMultiplier(total, bet) {
    if (!(bet > 0)) return "";
    var x = total / bet;
    var shown = x >= 100 ? String(Math.round(x)) : (Math.round(x * 10) / 10).toFixed(1).replace(/\.0$/, "");
    return "x" + shown;
  }

  // Las veces la apuesta salen cifra a cifra (cada una con su retraso, --i).
  function revealMultiplier() {
    var text = current ? current.multText : "";
    multEl.replaceChildren();
    if (!text) return;
    if (window.OssuaryNumberFont) {
      window.OssuaryNumberFont.render(multEl, text, { separatorImages: true });
    } else {
      multEl.textContent = text;
    }
    for (var i = 0; i < multEl.children.length; i++) {
      multEl.children[i].style.setProperty("--i", String(i));
    }
    root.classList.add("is-mult");
  }

  function speedMs(ms) {
    var speed = window.OssuaryGameSpeed;
    return speed && typeof speed.ms === "function" ? speed.ms(ms) : ms;
  }

  function stopCount() {
    if (!current) return;
    stopCountFor(current);
    current.frame = 0;
    current.countTimer = 0;
    current.riseTimer = 0;
  }

  // Punto de partida del premio: el centro del remolino, medido respecto a
  // donde se posa (antes de que empiece la subida).
  function aimRise() {
    var rest = prizeEl.getBoundingClientRect();
    var mouth = mawEl.getBoundingClientRect();
    prizeEl.style.setProperty("--rise-dx", Math.round(mouth.left + mouth.width / 2 - (rest.left + rest.width / 2)) + "px");
    prizeEl.style.setProperty("--rise-dy", Math.round(mouth.top + mouth.height / 2 - (rest.top + rest.height / 2)) + "px");
  }

  // Con la cuenta saltada, la subida (y lo que la acompana) acaba deprisa
  // en vez de pegar un salto.
  function rushRise() {
    if (typeof centerEl.getAnimations !== "function") return;
    centerEl.getAnimations({ subtree: true }).forEach(function (anim) {
      var timing = anim.effect && anim.effect.getComputedTiming ? anim.effect.getComputedTiming() : null;
      if (!timing || anim.playState === "finished") return;
      var left = (Number(timing.endTime) || 0) - (Number(anim.currentTime) || 0);
      if (!(left > RUSH_MS)) return;
      if (typeof anim.updatePlaybackRate === "function") anim.updatePlaybackRate(left / RUSH_MS);
      else anim.playbackRate = left / RUSH_MS;
    });
  }

  function finishCount() {
    if (!current || current.counted) return;
    stopCount();
    rushRise();
    current.counted = true;
    current.presentationEndsAt = Math.min(current.presentationEndsAt, window.performance.now() + RUSH_MS);
    renderAmount(current.total);
    root.classList.add("is-counted");
    revealMultiplier();
    if (smoke) smoke.burst();
    if (current.auto) current.autoTimer = window.setTimeout(close, speedMs(AUTO_CLOSE_MS));
  }

  // Clic o tecla: primero salta la cuenta; despues, cierra.
  function advance() {
    if (!current) return;
    if (!current.counted) {
      finishCount();
      return;
    }
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("button_click");
    close();
  }

  function onKey(event) {
    if (!current) return;
    if (event.key === " " || event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      advance();
    }
  }

  function close() {
    if (!current) return closing;
    if (!current.counted) finishCount();
    var done = current;
    current = null;
    stopCountFor(done);
    if (done.autoTimer) window.clearTimeout(done.autoTimer);
    window.removeEventListener("keydown", onKey, true);
    // Reutiliza la superficie del resumen. Primero acaba el premio; despues
    // oscurece, restaura los rodillos y solo entonces revela el juego base.
    closing = (async function () {
      var wait = Math.max(0, done.presentationEndsAt - window.performance.now());
      if (wait) await new Promise(function (resolve) { window.setTimeout(resolve, wait); });
      var scene = root.firstElementChild;
      var exitAnims = [];
      async function fade(node, frames, duration) {
        if (!node.animate) return;
        var anim = node.animate(frames, { duration: duration, easing: "ease-in-out", fill: "forwards" });
        exitAnims.push(anim);
        await anim.finished.catch(function () {});
      }
      try {
        if (done.onRestore) {
          await Promise.all([
            fade(scene, [{ opacity: 1 }, { opacity: 0 }], 420),
            fade(root, [{ backgroundColor: "transparent" }, { backgroundColor: "#000" }], 480)
          ]);
          root.style.background = "#000";
          if (smoke) smoke.stop();
          await done.onRestore();
        }
        root.classList.remove("is-open");
        await fade(root, [{ opacity: 1 }, { opacity: 0 }], CLOSE_FADE_MS + 200);
      } finally {
        root.hidden = true;
        exitAnims.forEach(function (anim) { anim.cancel(); });
        root.style.background = "";
        root.classList.remove("is-open", "is-counted", "is-mult");
        if (smoke) smoke.stop();
        closing = null;
        done.resolve();
      }
    })();
    return closing;
  }

  function stopCountFor(state) {
    if (state.frame) window.cancelAnimationFrame(state.frame);
    if (state.countTimer) window.clearTimeout(state.countTimer);
    if (state.riseTimer) window.clearTimeout(state.riseTimer);
  }

  function show(options) {
    options = options || {};
    if (closing) return closing.then(function () { return show(options); });
    if (!root) build();
    if (current) return close().then(function () { return show(options); });
    var total = Math.max(0, Number(options.total) || 0);
    var kind = TITLES[options.kind] ? options.kind : "execution";
    root.className = "bonus-summary bonus-summary--" + kind;
    titleEl.textContent = TITLES[kind];
    var multText = formatMultiplier(total, Number(options.bet) || 0);
    multEl.replaceChildren();
    var spins = Number(options.spins) || 0;
    spinsEl.textContent = (kind === "raven" || kind === "super") && spins > 0 ? spins + (spins === 1 ? " SPIN" : " SPINS") : "";
    // Tamano de la cifra segun lo larga que acabara (cabe en el altar).
    valueEl.style.setProperty("--chars", String(formatMoney(total).length));
    renderAmount(0);
    // La subida dura lo mismo que la cuenta: llega arriba con el premio entero.
    var delay = speedMs(RISE_DELAY_MS);
    var duration = speedMs(COUNT_MS);
    root.style.setProperty("--rise-delay", delay + "ms");
    root.style.setProperty("--rise-ms", duration + "ms");
    root.hidden = false;
    aimRise();
    void root.offsetWidth; // arranca la transicion de entrada
    root.classList.add("is-open");
    if (smoke) smoke.start();
    window.addEventListener("keydown", onKey, true);

    return new Promise(function (resolve) {
      current = { total: total, multText: multText, auto: Boolean(options.auto), resolve: resolve, counted: false, frame: 0, countTimer: 0, riseTimer: 0, autoTimer: 0,
        onRestore: options.onRestore, presentationEndsAt: window.performance.now() + delay + duration };
      var mine = current;
      // El humo sube con el premio cuando asoma por la boca.
      mine.riseTimer = window.setTimeout(function () {
        mine.riseTimer = 0;
        if (current === mine && !mine.counted && smoke) smoke.gush(duration / 1000);
      }, delay);
      if (total <= 0) {
        finishCount();
        return;
      }
      var start = window.performance.now() + delay;
      function step(now) {
        if (current !== mine || mine.counted) return;
        var t = Math.max(0, Math.min(1, (now - start) / duration));
        var eased = 1 - Math.pow(1 - t, 3);
        renderAmount(Math.round(total * eased * 100) / 100);
        if (t < 1) mine.frame = window.requestAnimationFrame(step);
        else finishCount();
      }
      mine.frame = window.requestAnimationFrame(step);
      // Red de seguridad (pestana en segundo plano sin rAF).
      mine.countTimer = window.setTimeout(finishCount, delay + duration + 120);
    });
  }

  // Altar y bocanadas listos antes del primer bonus.
  function preload() {
    keepAltarResident();
    if (window.OssuaryAltarSmoke) window.OssuaryAltarSmoke.preload();
  }
  if (document.readyState === "complete") window.setTimeout(preload, 1500);
  else window.addEventListener("load", function () { window.setTimeout(preload, 1500); });

  window.OssuaryBonusSummary = {
    show: show,
    close: close,
    isOpen: function () { return Boolean(current || closing); }
  };
})();
