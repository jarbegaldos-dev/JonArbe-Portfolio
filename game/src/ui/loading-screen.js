(function () {
  "use strict";

  // Pantalla de carga (#loadingScreen en index.html). Tapa el juego mientras
  // se prepara lo que hace falta para el primer giro y despues muestra PLAY.
  // Solo presentacion: el juego ya esta inicializado por debajo.
  //
  // Espera a:
  //   - el arte de los simbolos en memoria (OssuarySymbolRenderer.preloadArt:
  //     el mismo arte residente que usan las fichas, asi el primer giro no
  //     descarga nada);
  //   - las imagenes que ya hay en la pagina (marco, cofre, HUD...);
  //   - los sonidos precargados del Audio Framework (decodificados);
  //   - la fuente del juego (Moria Citadel);
  //   - el video de fondo, lo justo para arrancar (como mucho VIDEO_WAIT_MS).
  // Si algo falla o tarda mas de MAX_WAIT_MS, PLAY sale igualmente.
  //
  // PLAY es el primer gesto del jugador: el navegador desbloquea el sonido y
  // arranca la musica (audio-engine.js y adaptive-music-controller.js
  // escuchan ese primer clic).
  //
  // ?skipintro en la URL: se quita sola al terminar de cargar, sin PLAY
  // (pruebas automaticas y capturas).

  var screen = document.getElementById("loadingScreen");
  if (!screen) return;

  var fill = document.getElementById("loadingScreenFill");
  var bar = screen.querySelector(".loading-screen__bar");
  var status = document.getElementById("loadingScreenStatus");
  var play = document.getElementById("loadingScreenPlay");

  var MIN_SHOW_MS = 700;
  var MAX_WAIT_MS = 20000;
  var VIDEO_WAIT_MS = 8000;
  var LEAVE_MS = 650;

  var startedAt = window.performance.now();
  var total = 0;
  var done = 0;
  var finished = false;
  var skipIntro = /[?&]skipintro\b/.test(window.location.search);

  function setProgress(value) {
    var pct = Math.max(0, Math.min(100, Math.round(value * 100)));
    if (bar) bar.classList.add("is-measured");
    if (fill) fill.style.width = pct + "%";
    if (bar) bar.setAttribute("aria-valuenow", String(pct));
    if (status && !finished) status.textContent = "LOADING " + pct + "%";
  }

  function track(promise) {
    total += 1;
    return Promise.resolve(promise).catch(function () { return null; }).then(function () {
      done += 1;
      setProgress(total ? done / total : 1);
    });
  }

  function addUrl(list, url) {
    if (url && typeof url === "string" && list.indexOf(url) === -1) list.push(url);
  }

  function symbolArtUrls() {
    var urls = [];
    var symbols = window.OSSUARY_SYMBOL_ASSETS || {};
    var normal = (window.OSSUARY_SYMBOL_CONFIG && window.OSSUARY_SYMBOL_CONFIG.NORMAL_SYMBOLS) || [];
    // Solo lo que puede salir en juego: simbolos normales, WILD y el
    // esternon del bonus (los placeholders LEGACY no se usan).
    normal.concat(["WILD", "BLADE_BONUS", "STERNUM_CROSS_BONUS", "GUADANA_BONUS"]).forEach(function (id) {
      addUrl(urls, symbols[id]);
    });
    [
      window.OSSUARY_REEL_SYMBOL_ASSETS,
      window.OSSUARY_REEL_SYMBOL_BACKGROUNDS,
      window.OSSUARY_REEL_SYMBOL_OVERLAYS,
      window.OSSUARY_REEL_SYMBOL_HEAD_OVERLAYS
    ].forEach(function (byReel) {
      Object.keys(byReel || {}).forEach(function (reelId) {
        var map = byReel[reelId] || {};
        Object.keys(map).forEach(function (symbol) { addUrl(urls, map[symbol]); });
      });
    });
    // Arte borroso del giro (desenfoque de movimiento): listo antes del
    // primer giro para que el cambio no espere a la descarga.
    var blur = window.OSSUARY_SYMBOL_BLUR_ASSETS || {};
    Object.keys(blur).forEach(function (dir) {
      Object.keys(blur[dir] || {}).forEach(function (sharp) { addUrl(urls, blur[dir][sharp]); });
    });
    return urls;
  }

  function waitImage(img) {
    if (img.complete) return Promise.resolve();
    return new Promise(function (resolve) {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    });
  }

  function waitVideo(video) {
    if (!video || video.readyState >= 3) return Promise.resolve();
    return new Promise(function (resolve) {
      var timer = window.setTimeout(resolve, VIDEO_WAIT_MS);
      function done() {
        window.clearTimeout(timer);
        resolve();
      }
      video.addEventListener("canplay", done, { once: true });
      video.addEventListener("error", done, { once: true });
    });
  }

  function startLoading() {
    var jobs = [];
    var renderer = window.OssuarySymbolRenderer;
    if (renderer && typeof renderer.preloadArt === "function") {
      symbolArtUrls().forEach(function (url) { jobs.push(track(renderer.preloadArt(url))); });
    }
    Array.prototype.forEach.call(document.images, function (img) {
      if (screen.contains(img)) return;
      jobs.push(track(waitImage(img)));
    });
    if (window.OssuaryAudio && typeof window.OssuaryAudio.preloadAll === "function") {
      jobs.push(track(window.OssuaryAudio.preloadAll()));
    }
    if (document.fonts && typeof document.fonts.load === "function") {
      jobs.push(track(document.fonts.load('32px "Moria Citadel"')));
    }
    var bg = document.querySelector('[data-scene-layer="background_base"]');
    var bgVideo = bg && (bg.tagName === "VIDEO" ? bg : bg.querySelector("video"));
    jobs.push(track(waitVideo(bgVideo)));
    if (window.OssuaryNumberFont && typeof window.OssuaryNumberFont.preload === "function") {
      window.OssuaryNumberFont.preload();
    }
    setProgress(0);

    var all = Promise.all(jobs);
    var timeout = new Promise(function (resolve) { window.setTimeout(resolve, MAX_WAIT_MS); });
    Promise.race([all, timeout]).then(function () {
      var wait = Math.max(0, MIN_SHOW_MS - (window.performance.now() - startedAt));
      window.setTimeout(ready, wait);
    });
  }

  function decoratePlay() {
    if (!play) return;
    var label = play.querySelector(".loading-screen__play-label");
    if (label && window.OssuaryNumberFont && window.OssuaryNumberFont.canRenderLetters &&
        window.OssuaryNumberFont.canRenderLetters("PLAY")) {
      window.OssuaryNumberFont.render(label, "PLAY", { letters: true });
    }
  }

  function ready() {
    if (finished) return;
    finished = true;
    setProgress(1);
    if (status) status.textContent = "READY";
    screen.classList.add("is-ready");
    if (skipIntro) {
      leave();
      return;
    }
    decoratePlay();
    if (play) {
      play.hidden = false;
      try { play.focus({ preventScroll: true }); } catch (err) { play.focus(); }
    }
  }

  function leave() {
    if (screen.classList.contains("is-leaving")) return;
    screen.classList.add("is-leaving");
    document.body.classList.remove("is-loading");
    window.setTimeout(function () {
      if (screen.parentNode) screen.parentNode.removeChild(screen);
    }, LEAVE_MS);
  }

  if (play) {
    play.addEventListener("click", function () {
      if (window.OssuaryAudio) window.OssuaryAudio.trigger("button_click");
      leave();
    });
  }

  // Los scripts van al final del body: el DOM del juego ya existe y los
  // modulos ya han arrancado; la carga de recursos sigue en marcha.
  startLoading();

  window.OssuaryLoadingScreen = {
    isActive: function () { return Boolean(screen.parentNode) && !screen.classList.contains("is-leaving"); },
    dismiss: leave
  };
})();
