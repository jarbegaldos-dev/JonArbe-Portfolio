(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Cartel de la cadena del cuervo: la piedra ha matado un cuervo y hay otra
  // tirada gratis. Peticiones del usuario (2026-10-19): al empezar la cadena
  // (el primer cuervo muerto) sale su cartel "RAVEN Spins"
  // (src/fx/bonus-poster.js, tipo raven: cae con golpe, la mancha negra echa
  // humo y las plumas caen) el tiempo justo para leerlo, sin PLAY, se quita y
  // empieza la tirada; con los siguientes, solo las tiradas ganadas
  // ("+1 SPIN"). Las tiradas, en Moria Citadel roja con filo de metal, como
  // el "Spins" del cartel (antes, las letras de oro del juego). Sin
  // bonus-poster.js, solo las letras.
  //
  // show(text, { poster, delayMs, onStart }) devuelve los ms hasta que se ha
  // ido (game.js#continueRavenChain lanza la tirada entonces). Solo visual.
  // Estilos en src/fx/raven-bonus.css.
  // ---------------------------------------------------------------------------

  // Normal: cae (golpe a los 390 ms), se queda y a los EXIT_AT se va en
  // EXIT_MS. En turbo, mas corto pero sin bajar de MIN_EXIT_AT (que se lea).
  var EXIT_AT = 2500;
  var MIN_EXIT_AT = 1650;
  var EXIT_MS = 420;
  var LABEL_AT = 520;
  // Solo letras (sin cartel).
  var SHOW_MS = 1500;
  var el = null;
  var timer = 0;
  var delayTimer = 0;
  var poster = null;

  function speedMs(ms) {
    if (window.OssuaryGameSpeed && typeof window.OssuaryGameSpeed.ms === "function") {
      return window.OssuaryGameSpeed.ms(ms);
    }
    return ms;
  }

  function audio(name, payload) {
    if (window.OssuaryAudio && typeof window.OssuaryAudio.trigger === "function") {
      window.OssuaryAudio.trigger(name, payload || {});
    }
  }

  // Las tiradas ("+1 SPIN"), en texto.
  function labelParts(className, str) {
    var root = document.createElement("div");
    root.className = className;
    root.setAttribute("role", "status");
    var labelNode = document.createElement("div");
    labelNode.className = "raven-banner__label";
    labelNode.textContent = str;
    root.appendChild(labelNode);
    return { root: root, label: labelNode };
  }

  function ensure() {
    if (el && el.isConnected) return el;
    el = labelParts("raven-banner", "").root;
    document.body.appendChild(el);
    return el;
  }

  // Sin cartel: solo las letras, que aparecen y se van solas.
  function showLabelOnly(str, sourceRect) {
    var root = ensure();
    var label = root.querySelector(".raven-banner__label");
    if (!label) {
      label = document.createElement("div");
      label.className = "raven-banner__label";
      root.appendChild(label);
    }
    if (root.getAnimations) root.getAnimations().forEach(function (animation) { animation.cancel(); });
    root.classList.remove("is-traveling");
    label.textContent = str;
    root.classList.remove("is-on");
    void root.offsetWidth;
    root.classList.add("is-on");
    if (sourceRect && Number.isFinite(sourceRect.left) && Number.isFinite(sourceRect.top)) {
      var startX = sourceRect.left + (sourceRect.width || 0) / 2;
      var startY = sourceRect.top + (sourceRect.height || 0) / 2;
      root.classList.add("is-traveling");
      root.style.left = startX + "px";
      root.style.top = startY + "px";
      root.style.transform = "translate(-50%, -50%) scale(.55)";
      root.style.opacity = "1";
      var travel = root.animate([
        { left: startX + "px", top: startY + "px", transform: "translate(-50%, -50%) scale(.55)", opacity: 0.2 },
        { left: "50%", top: "40%", transform: "translate(-50%, -50%) scale(1.06)", opacity: 1, offset: 0.76 },
        { left: "50%", top: "40%", transform: "translate(-50%, -50%) scale(1)", opacity: 1 }
      ], { duration: speedMs(520), easing: "cubic-bezier(.18,.72,.24,1)", fill: "forwards" });
      travel.onfinish = function () {
        root.style.left = "";
        root.style.top = "";
        root.style.transform = "";
        root.style.opacity = "";
        travel.cancel();
      };
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      root.classList.remove("is-on");
    }, speedMs(SHOW_MS));
    return speedMs(SHOW_MS);
  }

  function clearPoster() {
    if (!poster) return;
    window.clearTimeout(poster.exitTimer);
    window.clearTimeout(poster.endTimer);
    window.clearTimeout(poster.impactTimer);
    if (poster.layer.parentNode) poster.layer.parentNode.removeChild(poster.layer);
    poster = null;
  }

  function hide() {
    window.clearTimeout(timer);
    window.clearTimeout(delayTimer);
    clearPoster();
    if (!el) return;
    el.classList.remove("is-on");
    el.classList.remove("is-traveling");
    var label = el.querySelector(".raven-banner__label");
    if (label) label.textContent = "";
  }

  function showNow(str, wantPoster, sourceRect) {
    var posters = window.OssuaryBonusPoster;
    if (!wantPoster || !posters || typeof posters.build !== "function") return showLabelOnly(str, sourceRect);
    clearPoster();
    var layer = document.createElement("div");
    layer.className = "raven-poster";
    var p = posters.build(layer, "raven");
    if (!p) return showLabelOnly(str, sourceRect);
    var parts = labelParts("raven-banner raven-banner--poster", str);
    p.root.appendChild(parts.root);
    document.body.appendChild(layer);
    var exitAt = Math.max(speedMs(EXIT_AT), MIN_EXIT_AT);
    var current = { layer: layer, exitTimer: 0, endTimer: 0, impactTimer: 0 };
    poster = current;

    // Si el arte aun no esta en memoria, el cartel espera oculto (el velo
    // ya oscurece) y se va a su hora igual.
    var revealed = false;
    var reveal = function () {
      if (revealed || poster !== current) return;
      revealed = true;
      p.logo.style.visibility = "";
      parts.root.style.visibility = "";
      current.impactTimer = posters.drop(p, {
        onImpact: function () { audio("raven_spins_poster_land", {}); }
      });
      if (sourceRect && Number.isFinite(sourceRect.left) && Number.isFinite(sourceRect.top)) {
        var targetRect = parts.root.getBoundingClientRect();
        var dx = sourceRect.left + (sourceRect.width || 0) / 2 - (targetRect.left + targetRect.width / 2);
        var dy = sourceRect.top + (sourceRect.height || 0) / 2 - (targetRect.top + targetRect.height / 2);
        parts.root.animate([
          { opacity: 0.1, translate: dx + "px " + dy + "px", scale: 0.55 },
          { opacity: 1, translate: "0px 0px", scale: 1.12, offset: 0.72 },
          { opacity: 1, translate: "0px 0px", scale: 1 }
        ], { duration: 520, delay: LABEL_AT, easing: "cubic-bezier(.18,.72,.24,1)", fill: "backwards" });
      } else {
        parts.root.animate([
          { opacity: 0, transform: "translate(-50%, -50%) scale(0.55)" },
          { opacity: 1, transform: "translate(-50%, -50%) scale(1.12)", offset: 0.55 },
          { opacity: 1, transform: "translate(-50%, -50%) scale(1)" }
        ], { duration: 420, delay: LABEL_AT, easing: "cubic-bezier(.2,.8,.3,1)", fill: "backwards" });
      }
    };
    var imgs = Array.prototype.slice.call(layer.querySelectorAll("img"));
    var allReady = function () {
      return imgs.every(function (im) { return im.complete && im.naturalWidth; });
    };
    if (allReady()) {
      reveal();
    } else {
      p.logo.style.visibility = "hidden";
      parts.root.style.visibility = "hidden";
      imgs.forEach(function (im) {
        im.addEventListener("load", function () { if (allReady()) reveal(); });
      });
      window.setTimeout(reveal, 700);
    }
    p.veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: "ease-out" });

    current.exitTimer = window.setTimeout(function () {
      if (poster !== current) return;
      p.logo.animate([
        { opacity: 1, transform: "none" },
        { opacity: 0, transform: "translateY(-4%) scale(1.06)" }
      ], { duration: EXIT_MS, easing: "cubic-bezier(.4,0,.7,.4)", fill: "forwards" });
      [p.veil, p.sky].forEach(function (node) {
        node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: EXIT_MS, easing: "ease-in", fill: "forwards" });
      });
      parts.root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: Math.round(EXIT_MS * 0.7), easing: "ease-in", fill: "forwards" });
    }, exitAt);
    current.endTimer = window.setTimeout(function () {
      if (poster === current) clearPoster();
    }, exitAt + EXIT_MS);
    return exitAt + EXIT_MS;
  }

  // options.poster: con el cartel (si no, solo las tiradas). options.delayMs:
  // espera antes (game.js: deja ver el numero del BIG WIN) y entonces llama
  // a options.onStart (quita el contador, que tapa todo). Devuelve los ms
  // hasta que se ha ido, espera incluida.
  function show(text, options) {
    var o = options || {};
    var str = String(text || "");
    var wait = Math.max(0, Number(o.delayMs) || 0);
    if (!wait) {
      if (typeof o.onStart === "function") o.onStart();
      return showNow(str, o.poster, o.sourceRect);
    }
    var posters = window.OssuaryBonusPoster;
    var expected = o.poster && posters && typeof posters.build === "function"
      ? Math.max(speedMs(EXIT_AT), MIN_EXIT_AT) + EXIT_MS
      : speedMs(SHOW_MS);
    window.clearTimeout(delayTimer);
    delayTimer = window.setTimeout(function () {
      if (typeof o.onStart === "function") o.onStart();
      showNow(str, o.poster, o.sourceRect);
    }, wait);
    return wait + expected;
  }

  window.OssuaryRavenBanner = { show: show, hide: hide };
})();
