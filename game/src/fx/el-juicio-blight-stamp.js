(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Sello BLIGHTED del usuario (peticion del 2026-10-19) — SOLO PRESENTACION.
  //
  // Cuando cae un infectado en un cepo de El Juicio, su sello (arte del
  // usuario: assets/super_bonus/blighted_stamp.webp, recortado del croma con
  // tools/bake-el-juicio-user-art.js blighted) aparece sobre el cepo, se
  // hace algo mas grande, cae de golpe sobre la casilla (pum: temblor, polvo,
  // golpe seco), se enciende y desaparece; despues sigue el efecto BLIGHTED
  // (el-juicio.js#landCondemned espera a play()).
  //
  // play(target, options) -> Promise: target, el cepo (elemento) o su rect;
  // options.ms, la funcion de tiempos del juego (turbo). Se resuelve cuando
  // el sello se esta yendo (el efecto entra mientras se apaga). Lo unico que
  // toca del cepo: le quita .is-marked (a el y a su placa) mientras cae y se
  // lo devuelve al golpe, para que no se vea infectado antes que el sello.
  // options.onImpact(): al golpe; options.maxWidth: tope del ancho (px).
  // Desde el 2026-10-19 cae tambien sobre el esqueleto de la Marca de Sangre
  // del Execution Bonus (execution-tension.js#playBloodMark, peticion del
  // usuario: la marca del bono normal con la animacion del BLIGHTED).
  // Estilos en el-juicio-blight-stamp.css.
  // ---------------------------------------------------------------------------

  var SRC = "assets/super_bonus/blighted_stamp.webp";
  var AR = 900 / 375;
  // Tiempos (ms a velocidad normal): aparece, crece, cae, se enciende, se va.
  var APPEAR_MS = 230;
  var GROW_MS = 330;
  var SLAM_MS = 110;
  var GLOW_MS = 430;
  var LEAVE_MS = 320;

  function art(path) {
    var r = window.OssuarySymbolRenderer;
    return r && r.residentArtUrl ? r.residentArtUrl(path) : path;
  }

  function preload() {
    var r = window.OssuarySymbolRenderer;
    return r && r.preloadArt ? r.preloadArt(SRC) : Promise.resolve(false);
  }

  function gameMs(x) {
    if (window.OssuaryGameSpeed && typeof window.OssuaryGameSpeed.ms === "function") return window.OssuaryGameSpeed.ms(x);
    return x;
  }

  function sound(name, payload) {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger(name, payload || {});
  }

  function play(target, options) {
    var o = options || {};
    var ms = typeof o.ms === "function" ? o.ms : gameMs;
    var r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : target;
    if (!r || !r.width) return Promise.resolve(false);

    var root = document.createElement("div");
    root.className = "el-juicio-blight-stamp";
    root.setAttribute("aria-hidden", "true");
    // Algo mas ancho que el cepo, centrado en el.
    var w = Math.max(110, r.width * 1.3);
    if (o.maxWidth > 0) w = Math.min(w, o.maxWidth);
    var h = w / AR;
    root.style.left = Math.round(r.left + r.width / 2 - w / 2) + "px";
    root.style.top = Math.round(r.top + r.height / 2 - h / 2) + "px";
    root.style.width = Math.round(w) + "px";
    root.style.height = Math.round(h) + "px";
    var glow = document.createElement("div");
    glow.className = "el-juicio-blight-stamp__glow";
    var body = document.createElement("div");
    body.className = "el-juicio-blight-stamp__body";
    var img = document.createElement("img");
    img.className = "el-juicio-blight-stamp__art";
    img.alt = "";
    img.draggable = false;
    img.decoding = "sync";
    img.src = art(SRC);
    body.appendChild(img);
    root.appendChild(glow);
    root.appendChild(body);
    document.body.appendChild(root);

    var appear = ms(APPEAR_MS), grow = ms(GROW_MS), slam = ms(SLAM_MS), lit = ms(GLOW_MS), leave = ms(LEAVE_MS);
    var impactAt = appear + grow + slam;
    var total = impactAt + lit + leave;
    // Sonido que sube hasta el golpe (sabe cuando cae).
    sound("el_juicio_blight_stamp_rise", { impactMs: impactAt });
    var tilt = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5);
    var off = function (t) { return t / total; };
    // Hasta que cae, el cepo no se ve infectado (sin .is-marked, ni el ni su
    // placa): el sello llega primero y lo infecta al golpe.
    var held = [];
    if (target.classList) {
      if (target.classList.contains("is-marked")) held.push(target);
      Array.prototype.forEach.call(target.querySelectorAll(".is-marked"), function (el) { held.push(el); });
      held.forEach(function (el) { el.classList.remove("is-marked"); });
    }
    // Aparece sobre el cepo y se hace mas grande, como si se levantara (con
    // un temblor de carga); cae de golpe sobre la casilla, rebota apenas y
    // se queda; al final se hincha un poco y se va.
    body.animate([
      { transform: "translateY(-6%) scale(0.6) rotate(" + (tilt * 2) + "deg)", opacity: 0, filter: "brightness(1.4) blur(2px)" },
      { transform: "translateY(-8%) scale(1.05) rotate(" + tilt + "deg)", opacity: 1, filter: "brightness(1.1) blur(0px)", offset: off(appear) },
      { transform: "translateY(-13%) scale(1.42) rotate(" + (tilt * 0.6) + "deg)", opacity: 1, filter: "brightness(1.15)", offset: off(appear + grow * 0.8), easing: "ease-in" },
      { transform: "translate(1.2%, -14%) scale(1.46) rotate(" + (tilt * 0.4) + "deg)", offset: off(appear + grow), easing: "cubic-bezier(.7,0,1,.6)" },
      { transform: "translateY(0) scale(0.94) rotate(" + (tilt * 0.3) + "deg)", filter: "brightness(2.4)", offset: off(impactAt), easing: "ease-out" },
      { transform: "translateY(0) scale(1.04) rotate(" + (tilt * 0.3) + "deg)", filter: "brightness(1.9)", offset: off(impactAt + slam * 0.8) },
      { transform: "translateY(0) scale(1) rotate(" + (tilt * 0.3) + "deg)", filter: "brightness(1.45)", offset: off(impactAt + lit), opacity: 1, easing: "ease-in" },
      { transform: "translateY(-4%) scale(1.12) rotate(" + (tilt * 0.3) + "deg)", filter: "brightness(1.8) blur(3px)", opacity: 0 }
    ], { duration: total, fill: "forwards" });
    // Se enciende al caer: brasa roja detras que estalla y se apaga.
    glow.animate([
      { opacity: 0, transform: "scale(0.6)" },
      { opacity: 0, transform: "scale(0.6)", offset: off(impactAt) },
      { opacity: 1, transform: "scale(1.15)", offset: off(impactAt + slam) },
      { opacity: 0.7, transform: "scale(1)", offset: off(impactAt + lit) },
      { opacity: 0, transform: "scale(1.2)" }
    ], { duration: total, fill: "forwards" });

    window.setTimeout(function () {
      held.forEach(function (el) { el.classList.add("is-marked"); });
      sound("el_juicio_blight_stamp", {});
      var g = window.OssuaryGuillotineDrop;
      if (g) {
        if (typeof g.shakeMachine === "function") g.shakeMachine(0.34);
        if (typeof g.dust === "function") g.dust(r.left + r.width / 2, r.top + r.height * 0.9, { count: 6, width: r.width * 0.9 });
      }
      if (typeof o.onImpact === "function") o.onImpact();
    }, impactAt);
    window.setTimeout(function () { root.remove(); }, total + 40);
    return new Promise(function (resolve) {
      window.setTimeout(function () { resolve(true); }, impactAt + lit);
    });
  }

  // En memoria antes de que haga falta (sin prisa).
  window.setTimeout(preload, 8000);

  window.OssuaryBlightStamp = { play: play, preload: preload };
})();
