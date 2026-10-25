(function () {
  "use strict";

  // Arte residente (solo carga de imagenes: no cambia que simbolo sale ni
  // donde). El servidor manda los PNG con Cache-Control: no-store, asi que
  // cada <img> nueva que crea una ficha al reciclarse durante el giro volvia
  // a pedir su PNG (343 peticiones en 3 giros) y a descodificarlo entero
  // (784 px para pintarlo a ~110): de ahi los tirones y los simbolos que
  // llegaban tarde con los rodillos en marcha. La primera vez que se usa una
  // imagen se baja una copia, se guarda en memoria como blob: ya
  // descodificada y desde entonces las fichas usan esa copia; mientras no
  // esta lista se usa la ruta normal.
  var residentArtUrls = {};
  var residentArtImgs = [];
  var residentArtPromises = {};

  function residentArtUrl(url) {
    return (url && residentArtUrls[url]) || url;
  }

  // Devuelve una promesa que se cumple (true/false) cuando el arte ya esta en
  // memoria o no se ha podido guardar. Una sola descarga por ruta. La
  // pantalla de carga (src/ui/loading-screen.js) la usa via preloadArt para
  // empezar a jugar con el arte de los simbolos ya listo.
  function keepArtResident(url) {
    if (!url || !/\.(png|jpe?g|webp)(\?|$)/i.test(url)) return Promise.resolve(false);
    if (residentArtPromises[url]) return residentArtPromises[url];
    if (typeof fetch !== "function" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      residentArtPromises[url] = Promise.resolve(false);
      return residentArtPromises[url];
    }
    residentArtPromises[url] = fetch(url).then(function (res) {
      return res.ok ? res.blob() : null;
    }).then(function (blob) {
      if (!blob) return false;
      var objectUrl = URL.createObjectURL(blob);
      var img = new Image();
      img.src = objectUrl;
      return (typeof img.decode === "function" ? img.decode() : Promise.resolve()).then(function () {
        residentArtImgs.push(img);
        residentArtUrls[url] = objectUrl;
        return true;
      }, function () {
        URL.revokeObjectURL(objectUrl);
        return false;
      });
    }).catch(function () {
      return false;
    });
    return residentArtPromises[url];
  }

  function createSymbolRenderer(options) {
    var symbolAssets = options.symbolAssets || {};
    var reelSymbolAssets = options.reelSymbolAssets || {};
    var reelSymbolBackgrounds = options.reelSymbolBackgrounds || {};
    var reelSymbolOverlays = options.reelSymbolOverlays || {};
    var reelSymbolHeadOverlays = options.reelSymbolHeadOverlays || {};
    var reelSymbolVideoOverlays = options.reelSymbolVideoOverlays || {};
    var placeholderLabels = options.placeholderLabels || {};
    var hooks = options.hooks;

    function forceVideoSilent(video) {
      if (!video) return;
      try {
        video.defaultMuted = true;
        video.muted = true;
        video.volume = 0;
      } catch (_) {}
    }

    function tryStartVideoPlayback(video) {
      if (!video || video.__ossuaryStopped || video.__ossuaryPlayStarted) return;
      video.__ossuaryPlayStarted = true;
      forceVideoSilent(video);
      var playResult = null;
      try {
        playResult = video.play();
      } catch (_) {
        video.__ossuaryPlayStarted = false;
        return;
      }
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(function () {
          if (video.__ossuaryStopped) return;
          video.__ossuaryPlayStarted = false;
          video.style.opacity = "0";
        });
      }
    }

    function stopSymbolMedia(el) {
      if (!el || !el.querySelectorAll) return;
      var videos = el.querySelectorAll("video");
      Array.prototype.forEach.call(videos, function (video) {
        video.__ossuaryStopped = true;
        video.__ossuaryPlayStarted = false;
        video.style.opacity = "0";
        try {
          forceVideoSilent(video);
          video.currentTime = 0;
        } catch (_) {}
        try {
          video.pause();
        } catch (_) {}
      });
    }

    function renderEmptySymbol(el) {
      stopSymbolMedia(el);
      el.replaceChildren();
      el.classList.remove("has-symbol-art", "has-placeholder-symbol", "has-symbol-bg", "has-symbol-overlay", "has-symbol-head-overlay", "has-symbol-video-overlay");
      el.dataset.asset = "";
      el.style.setProperty("--symbol-bg-image", "none");
      el.textContent = "";
    }

    function getSymbolAsset(symbol, reel) {
      var reelAssets = reel ? reelSymbolAssets[reel.id] : null;
      if (reelAssets && reelAssets[symbol]) {
        return reelAssets[symbol];
      }
      return symbolAssets[symbol] || null;
    }

    // Capa de fondo opcional, independiente del arte/icono normal (getSymbolAsset):
    // solo existe por rodillo (no hay fallback global), asi que un reel sin
    // entrada en OSSUARY_REEL_SYMBOL_BACKGROUNDS no se ve afectado.
    function getSymbolBackgroundAsset(symbol, reel) {
      var reelBg = reel ? reelSymbolBackgrounds[reel.id] : null;
      return (reelBg && reelBg[symbol]) || null;
    }

    // Sobre-imagen opcional que se pinta SIEMPRE encima del arte base y solo
    // cubre la casilla interior (posicionamiento/espejo por CSS). Igual que la
    // capa de fondo, solo existe por rodillo: un reel sin entrada no se afecta.
    function getSymbolOverlayAsset(symbol, reel) {
      var reelOverlay = reel ? reelSymbolOverlays[reel.id] : null;
      return (reelOverlay && reelOverlay[symbol]) || null;
    }

    // Capa de cabeza de los esqueletos de free spins: mismo contrato que la
    // capa de manos (solo por rodillo, sin fallback global), se pinta encima
    // del arte base y de las manos (orden del DOM = orden de pintado).
    function getSymbolHeadOverlayAsset(symbol, reel) {
      var reelHeadOverlay = reel ? reelSymbolHeadOverlays[reel.id] : null;
      return (reelHeadOverlay && reelHeadOverlay[symbol]) || null;
    }

    function getSymbolVideoOverlay(symbol, reel) {
      var reelVideoOverlay = reel ? reelSymbolVideoOverlays[reel.id] : null;
      return (reelVideoOverlay && reelVideoOverlay[symbol]) || null;
    }

    function ensureSymbolVideoOverlay(el, symbol, reel) {
      var videoOverlay = getSymbolVideoOverlay(symbol, reel);
      if (!videoOverlay || !videoOverlay.assetPath || !el || !el.querySelector) return;
      var overlayVideo = el.querySelector(".symbol-video-overlay");
      if (!overlayVideo) return;
      if (!overlayVideo.getAttribute("src")) {
        overlayVideo.src = videoOverlay.assetPath;
        try {
          overlayVideo.load();
        } catch (_) {}
      }
      forceVideoSilent(overlayVideo);
      if (overlayVideo.__ossuaryStopped) {
        overlayVideo.__ossuaryStopped = false;
        overlayVideo.__ossuaryPlayStarted = false;
      }
      if (overlayVideo.paused || overlayVideo.readyState >= 2) {
        tryStartVideoPlayback(overlayVideo);
      }
    }

    function setCellSymbol(cell, symbol) {
      if (hooks.isCellForcedEmpty && hooks.isCellForcedEmpty(cell, symbol)) {
        cell.current = "";
        cell.effective = "";
        cell.el.dataset.symbol = "";
        cell.el.dataset.effectiveSymbol = "";
        renderEmptySymbol(cell.el);
        return;
      }
      cell.current = symbol;
      cell.effective = hooks.getEffectiveSymbol(symbol);
      cell.el.dataset.symbol = symbol;
      cell.el.dataset.effectiveSymbol = cell.effective;
    }

    function placeholderClassName(symbol) {
      return symbol.toLowerCase().replace(/_/g, "-");
    }

    function renderPlaceholderSymbol(el, symbol) {
      var root = document.createElement("span");
      root.className = "symbol-placeholder symbol-placeholder--" + placeholderClassName(symbol);

      var mark = document.createElement("span");
      mark.className = "symbol-placeholder__mark";
      root.appendChild(mark);

      var label = document.createElement("span");
      label.className = "symbol-placeholder__label";
      label.textContent = placeholderLabels[symbol];
      root.appendChild(label);

      el.appendChild(root);
    }

    function renderPlaceholderOrText(el, symbol) {
      if (placeholderLabels[symbol]) {
        renderPlaceholderSymbol(el, symbol);
      } else {
        el.textContent = hooks.formatSymbolLabel(symbol);
      }
    }

    function applyArtFallback(el, symbol) {
      // El PNG no cargó (falta, 404 o error de carga): sustituimos la imagen rota por
      // el placeholder/texto. No tocamos dataset.asset para no invalidar la caché de
      // setTileSymbol y evitar re-renders en bucle durante el giro.
      stopSymbolMedia(el);
      el.replaceChildren();
      el.classList.remove("has-symbol-art");
      el.classList.toggle("has-placeholder-symbol", Boolean(placeholderLabels[symbol]));
      renderPlaceholderOrText(el, symbol);
    }

    // La capa de fondo se aplica como variable CSS (--symbol-bg-image), consumida
    // por style.css dentro de la lista de background-image del propio tile junto
    // al degradado decorativo ya existente (nunca lo sustituye). El background de
    // un elemento siempre pinta detrás de TODOS sus hijos por espec, así que el
    // icono/placeholder/texto normal (sin cambios) queda encima sin ningún ajuste
    // de z-index ni riesgo de que se lo lleve por delante un replaceChildren.
    function applySymbolBackground(el, bgAsset) {
      el.classList.toggle("has-symbol-bg", Boolean(bgAsset));
      keepArtResident(bgAsset);
      el.style.setProperty("--symbol-bg-image", bgAsset ? 'url("' + residentArtUrl(bgAsset) + '")' : "none");
    }

    function renderSymbolContent(el, symbol, reel) {
      var asset = getSymbolAsset(symbol, reel);
      var videoOverlay = getSymbolVideoOverlay(symbol, reel);
      stopSymbolMedia(el);
      el.replaceChildren();
      el.classList.toggle("has-symbol-art", Boolean(asset));
      el.classList.toggle("has-placeholder-symbol", Boolean(!asset && placeholderLabels[symbol]));
      el.classList.toggle("has-symbol-video-overlay", Boolean(videoOverlay && videoOverlay.assetPath));
      el.dataset.asset = asset || "";
      applySymbolBackground(el, getSymbolBackgroundAsset(symbol, reel));

      if (asset) {
        var img = document.createElement("img");
        img.className = "symbol-art";
        keepArtResident(asset);
        img.src = residentArtUrl(asset);
        img.alt = hooks.formatSymbolLabel(symbol);
        img.draggable = false;
        img.addEventListener("error", function () {
          applyArtFallback(el, symbol);
        });
        el.appendChild(img);
      } else {
        renderPlaceholderOrText(el, symbol);
      }

      // Sobre-imagen: se añade DESPUÉS del arte base para quedar siempre encima
      // (orden del DOM = orden de pintado). Cubre solo la casilla interior; su
      // posición/espejo los resuelve style.css según el rodillo (izq/der).
      var overlayAsset = getSymbolOverlayAsset(symbol, reel);
      el.classList.toggle("has-symbol-overlay", Boolean(overlayAsset));
      if (overlayAsset) {
        var overlayImg = document.createElement("img");
        overlayImg.className = "symbol-overlay";
        keepArtResident(overlayAsset);
        overlayImg.src = residentArtUrl(overlayAsset);
        overlayImg.alt = "";
        overlayImg.draggable = false;
        el.appendChild(overlayImg);
      }

      // Cabeza del esqueleto: se añade DESPUÉS de las manos para pintarse
      // encima de todo el conjunto (cuerpo + manos + cabeza salen juntos).
      var headOverlayAsset = getSymbolHeadOverlayAsset(symbol, reel);
      el.classList.toggle("has-symbol-head-overlay", Boolean(headOverlayAsset));
      if (headOverlayAsset) {
        var headOverlayImg = document.createElement("img");
        headOverlayImg.className = "symbol-head-overlay";
        keepArtResident(headOverlayAsset);
        headOverlayImg.src = residentArtUrl(headOverlayAsset);
        headOverlayImg.alt = "";
        headOverlayImg.draggable = false;
        el.appendChild(headOverlayImg);
      }

      if (videoOverlay && videoOverlay.assetPath) {
        var overlayVideo = document.createElement("video");
        overlayVideo.className = "symbol-video-overlay";
        overlayVideo.src = videoOverlay.assetPath;
        overlayVideo.defaultMuted = true;
        overlayVideo.muted = true;
        overlayVideo.loop = Boolean(videoOverlay.loop);
        overlayVideo.autoplay = true;
        overlayVideo.playsInline = true;
        overlayVideo.preload = "auto";
        overlayVideo.setAttribute("aria-hidden", "true");
        overlayVideo.setAttribute("muted", "");
        overlayVideo.style.opacity = "0";
        overlayVideo.volume = 0;
        overlayVideo.__ossuaryStopped = false;
        overlayVideo.__ossuaryPlayStarted = false;
        overlayVideo.addEventListener("loadeddata", function () {
          tryStartVideoPlayback(overlayVideo);
        });
        overlayVideo.addEventListener("canplay", function () {
          tryStartVideoPlayback(overlayVideo);
        });
        overlayVideo.addEventListener("canplaythrough", function () {
          tryStartVideoPlayback(overlayVideo);
        });
        overlayVideo.addEventListener("playing", function () {
          if (overlayVideo.__ossuaryStopped) return;
          overlayVideo.style.opacity = "1";
          forceVideoSilent(overlayVideo);
        });
        overlayVideo.addEventListener("error", function () {
          if (overlayVideo.__ossuaryStopped) return;
          overlayVideo.style.opacity = "0";
        });
        el.appendChild(overlayVideo);
        tryStartVideoPlayback(overlayVideo);
      }
    }

    function setTileSymbol(tile, symbol, reel) {
      if (hooks.isTileForcedEmpty && hooks.isTileForcedEmpty(tile, symbol, reel)) {
        if (tile.dataset.symbol === "" && tile.dataset.asset === "") return;
        renderEmptySymbol(tile);
        tile.dataset.symbol = "";
        tile.dataset.asset = "";
        tile.dataset.effectiveSymbol = "";
        return;
      }
      var asset = getSymbolAsset(symbol, reel) || "";
      // Sin cambios respecto al frame anterior: no tocar el DOM. Antes se
      // reescribían 3 dataset por tile en CADA frame (×~150 tiles), aunque el
      // símbolo no cambiara. Saltarlo cuando no cambia reduce el trabajo de
      // hilo principal por frame y deja más presupuesto para mantener 60 fps
      // estables (menos saltos de fotograma). El símbolo/asset/effective solo
      // varían cuando el tile recicla, así que el dataset ya está al día.
      if (tile.dataset.symbol === symbol && tile.dataset.asset === asset) {
        return;
      }
      renderSymbolContent(tile, symbol, reel);
      tile.dataset.symbol = symbol;
      tile.dataset.asset = asset;
      tile.dataset.effectiveSymbol = hooks.getEffectiveSymbol(symbol);
    }

    return {
      getSymbolAsset: getSymbolAsset,
      getSymbolOverlayAsset: getSymbolOverlayAsset,
      getSymbolHeadOverlayAsset: getSymbolHeadOverlayAsset,
      getSymbolVideoOverlay: getSymbolVideoOverlay,
      setCellSymbol: setCellSymbol,
      renderEmptySymbol: renderEmptySymbol,
      placeholderClassName: placeholderClassName,
      renderPlaceholderSymbol: renderPlaceholderSymbol,
      renderSymbolContent: renderSymbolContent,
      ensureSymbolVideoOverlay: ensureSymbolVideoOverlay,
      setTileSymbol: setTileSymbol
    };
  }

  window.OssuarySymbolRenderer = {
    create: createSymbolRenderer,
    preloadArt: keepArtResident,
    // Copia en memoria de una imagen ya precargada (o la ruta si aun no):
    // el desenfoque de movimiento de reel-renderer.js cambia el arte con ella.
    residentArtUrl: residentArtUrl
  };
})();
