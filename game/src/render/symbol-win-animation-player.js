(function () {
  "use strict";

  // Reproductor generico de animaciones de victoria por simbolo. Recibe el
  // tile (.symbol-tile) que ya esta mostrando el PNG estatico del simbolo
  // ganador, carga el webm con alfa real EN PARALELO sin tocar el PNG, y
  // solo cuando el video confirma que puede arrancar (canplay + play()
  // resuelto) oculta el PNG y lo reemplaza visualmente. Si en cualquier
  // punto el video falla (error de red, codec no soportado, play()
  // rechazado), el PNG nunca se oculta o se restaura de inmediato: el jugador
  // jamas debe quedarse con la celda vacia. No conoce reels, celdas ni reglas
  // de pago: solo sabe reproducir un video dentro de un elemento y devolverlo
  // a su estado original. Reutilizable para cualquier simbolo futuro que
  // entre en OSSUARY_SYMBOL_WIN_ANIMATIONS.

  var LOG_PREFIX = "[OssuarySymbolWinAnimation]";
  var requestSequence = 0;

  function nowMs() {
    return typeof performance !== "undefined" && performance && typeof performance.now === "function"
      ? performance.now()
      : Date.now();
  }

  function describeMediaError(mediaError) {
    if (!mediaError) return "sin MediaError (causa desconocida)";
    var codes = {
      1: "MEDIA_ERR_ABORTED",
      2: "MEDIA_ERR_NETWORK",
      3: "MEDIA_ERR_DECODE",
      4: "MEDIA_ERR_SRC_NOT_SUPPORTED"
    };
    return (codes[mediaError.code] || ("codigo " + mediaError.code)) + (mediaError.message ? (" - " + mediaError.message) : "");
  }

  function describeTile(tileEl) {
    if (!tileEl) return null;
    return {
      reel: tileEl.dataset ? tileEl.dataset.reel || null : null,
      cell: tileEl.dataset ? tileEl.dataset.cell || null : null,
      symbol: tileEl.dataset ? tileEl.dataset.symbol || null : null,
      effectiveSymbol: tileEl.dataset ? tileEl.dataset.effectiveSymbol || null : null
    };
  }

  function play(tileEl, animConfig) {
    return new Promise(function (resolve) {
      var requestId = ++requestSequence;
      if (!tileEl || !animConfig || !animConfig.assetPath) {
        console.warn(LOG_PREFIX, "#" + requestId, "play() llamado sin tile o sin assetPath valido. tileEl:", tileEl, "animConfig:", animConfig);
        resolve();
        return;
      }

      var assetPath = animConfig.assetPath;
      var requestStartedAt = nowMs();
      console.log(LOG_PREFIX, "#" + requestId, "animation requested", {
        assetPath: assetPath,
        tile: describeTile(tileEl),
        scale: animConfig.scale != null ? animConfig.scale : 1,
        offsetXPercent: animConfig.offsetXPercent || 0,
        offsetYPercent: animConfig.offsetYPercent || 0
      });
      console.log(LOG_PREFIX, "#" + requestId, "animation configuration found");
      console.log(LOG_PREFIX, "#" + requestId, "asset path resolved:", assetPath);

      var staleVideos = tileEl.querySelectorAll("video.symbol-art--win-animation");
      if (staleVideos.length) {
        console.warn(LOG_PREFIX, "#" + requestId, "stale video elements found before new request:", staleVideos.length);
        Array.prototype.forEach.call(staleVideos, function (staleVideo) {
          try {
            staleVideo.pause();
          } catch (_) {}
          if (staleVideo.parentNode === tileEl) {
            tileEl.removeChild(staleVideo);
          }
        });
        Array.prototype.forEach.call(tileEl.children, function (child) {
          child.style.visibility = "";
        });
      }

      var pngHidden = false;
      var staticChildren = Array.prototype.slice.call(tileEl.children);

      var video = document.createElement("video");
      video.className = "symbol-art symbol-art--win-animation";
      video.muted = true;
      video.loop = false;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("aria-hidden", "true");
      // Oculto SOLO visualmente (opacity, no display:none ni visibility)
      // mientras carga: la descarga/decodificacion sigue su curso igual, el
      // PNG estatico de abajo sigue siendo lo unico visible para el jugador.
      video.style.opacity = "0";
      // El tile es "display:grid" con UN solo hijo originalmente (el img). Al
      // añadir el video como segundo hijo, el auto-placement de CSS Grid lo
      // manda a una fila/celda implicita NUEVA (no superpuesta al PNG), en vez
      // de apilarlo encima. position:absolute + inset:0 lo saca del flujo del
      // grid por completo: el tile ya es position:absolute (establece su
      // propio containing block), asi que esto lo hace coincidir exactamente
      // con la caja del PNG sin depender de como reparta el grid los hijos.
      video.style.position = "absolute";
      video.style.inset = "0";
      console.log(LOG_PREFIX, "#" + requestId, "video element created");

      var scale = animConfig.scale != null ? animConfig.scale : 1;
      var offsetX = animConfig.offsetXPercent || 0;
      var offsetY = animConfig.offsetYPercent || 0;
      video.style.transform = "translate(" + offsetX + "%, " + offsetY + "%) scale(" + scale + ")";

      var done = false;
      var loadTimeoutId = null;
      var playbackTimeoutId = null;
      var playbackStartedAt = 0;
      var firstFrameRendered = false;
      var videoFrameCallbackId = null;
      var playRequested = false;
      var fallbackDurationMs = animConfig.fallbackDurationMs || 6000;

      function hidePngOnce() {
        if (pngHidden) return;
        pngHidden = true;
        staticChildren.forEach(function (child) {
          child.style.visibility = "hidden";
        });
      }

      function restorePng() {
        if (!pngHidden) return;
        pngHidden = false;
        staticChildren.forEach(function (child) {
          child.style.visibility = "";
        });
      }

      function clearLoadTimeout() {
        if (!loadTimeoutId) return;
        clearTimeout(loadTimeoutId);
        loadTimeoutId = null;
      }

      function clearPlaybackTimeout() {
        if (!playbackTimeoutId) return;
        clearTimeout(playbackTimeoutId);
        playbackTimeoutId = null;
      }

      function cancelFirstFrameCallback() {
        if (videoFrameCallbackId != null && typeof video.cancelVideoFrameCallback === "function") {
          video.cancelVideoFrameCallback(videoFrameCallbackId);
        }
        videoFrameCallbackId = null;
      }

      function noteFirstFrame(metadata) {
        if (firstFrameRendered) return;
        firstFrameRendered = true;
        console.log(LOG_PREFIX, "#" + requestId, "first frame rendered", {
          elapsedSincePlayMs: playbackStartedAt ? Math.round(nowMs() - playbackStartedAt) : null,
          currentTime: video.currentTime,
          presentedFrames: metadata && metadata.presentedFrames != null ? metadata.presentedFrames : null
        });
      }

      function armLoadTimeout() {
        clearLoadTimeout();
        loadTimeoutId = setTimeout(function () {
          console.error(LOG_PREFIX, "#" + requestId, "asset load timed out before playback could start", {
            assetPath: assetPath,
            elapsedMs: Math.round(nowMs() - requestStartedAt)
          });
          finish("load-timeout");
        }, fallbackDurationMs);
        console.log(LOG_PREFIX, "#" + requestId, "waiting for metadata/canplay", {
          timeoutMs: fallbackDurationMs
        });
      }

      function armPlaybackTimeout() {
        clearPlaybackTimeout();
        var durationMs = isFinite(video.duration) && video.duration > 0
          ? Math.ceil(video.duration * 1000)
          : 0;
        var timeoutMs = Math.max(fallbackDurationMs, durationMs + 1500);
        playbackTimeoutId = setTimeout(function () {
          console.error(LOG_PREFIX, "#" + requestId, "playback timed out before ended", {
            assetPath: assetPath,
            elapsedSincePlayMs: playbackStartedAt ? Math.round(nowMs() - playbackStartedAt) : null,
            currentTime: video.currentTime,
            duration: video.duration,
            firstFrameRendered: firstFrameRendered
          });
          finish("playback-timeout");
        }, timeoutMs);
        console.log(LOG_PREFIX, "#" + requestId, "playback timeout armed", {
          timeoutMs: timeoutMs,
          durationMs: durationMs
        });
      }

      function finish(reason) {
        if (done) return;
        done = true;
        clearLoadTimeout();
        clearPlaybackTimeout();
        cancelFirstFrameCallback();
        video.removeEventListener("loadstart", onLoadStart);
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("ended", onEnded);
        video.removeEventListener("error", onError);
        // El PNG SIEMPRE se restaura al terminar (exito o fallo): el jugador
        // nunca debe quedarse sin ver el simbolo.
        restorePng();
        if (video.parentNode === tileEl) {
          tileEl.removeChild(video);
        }
        console.log(LOG_PREFIX, "#" + requestId, "cleanup completed", {
          reason: reason,
          elapsedMs: Math.round(nowMs() - requestStartedAt),
          firstFrameRendered: firstFrameRendered
        });
        if (reason && reason !== "ended") {
          console.warn(LOG_PREFIX, "#" + requestId, "animacion finalizada con fallback/aviso:", reason, "- PNG estatico restaurado.");
        }
        resolve();
      }

      function onLoadStart() {
        console.log(LOG_PREFIX, "#" + requestId, "loadstart:", assetPath);
      }

      function onLoadedMetadata() {
        console.log(LOG_PREFIX, "#" + requestId, "loadedmetadata:", assetPath, "duration:", video.duration, "size:", video.videoWidth + "x" + video.videoHeight);
      }

      function onCanPlay() {
        if (playRequested) {
          console.log(LOG_PREFIX, "#" + requestId, "duplicate canplay ignored:", assetPath);
          return;
        }
        playRequested = true;
        clearLoadTimeout();
        console.log(LOG_PREFIX, "#" + requestId, "canplay:", assetPath, "- ocultando PNG y arrancando reproduccion.");
        hidePngOnce();
        video.style.opacity = "";
        console.log(LOG_PREFIX, "#" + requestId, "play() requested");
        var playResult = video.play();
        if (playResult && typeof playResult.catch === "function") {
          playResult
            .then(function () {
              playbackStartedAt = nowMs();
              console.log(LOG_PREFIX, "#" + requestId, "play() resolved:", assetPath);
              armPlaybackTimeout();
            })
            .catch(function (err) {
              console.error(LOG_PREFIX, "#" + requestId, "play() rejected:", err && err.message ? err.message : err);
              finish("play-rejected");
            });
        } else {
          playbackStartedAt = nowMs();
          console.log(LOG_PREFIX, "#" + requestId, "play() invocado (navegador sin Promise de play()).");
          armPlaybackTimeout();
        }
      }

      function onPlaying() {
        if (!playbackStartedAt) playbackStartedAt = nowMs();
        if (!playbackTimeoutId) {
          armPlaybackTimeout();
        }
        console.log(LOG_PREFIX, "#" + requestId, "playing event");
        noteFirstFrame();
      }

      function onTimeUpdate() {
        if (video.currentTime > 0) {
          noteFirstFrame();
        }
      }

      function onEnded() {
        console.log(LOG_PREFIX, "#" + requestId, "ended:", assetPath);
        finish("ended");
      }

      function onError() {
        console.error(LOG_PREFIX, "#" + requestId, "error de video:", assetPath, "-", describeMediaError(video.error));
        finish("video-error");
      }

      video.addEventListener("loadstart", onLoadStart);
      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("ended", onEnded);
      video.addEventListener("error", onError);

      if (typeof video.requestVideoFrameCallback === "function") {
        videoFrameCallbackId = video.requestVideoFrameCallback(function (_, metadata) {
          noteFirstFrame(metadata);
        });
        console.log(LOG_PREFIX, "#" + requestId, "waiting for first frame via requestVideoFrameCallback");
      } else {
        console.log(LOG_PREFIX, "#" + requestId, "waiting for first frame via playing/timeupdate fallback");
      }

      video.src = assetPath;
      tileEl.appendChild(video);
      console.log(LOG_PREFIX, "#" + requestId, "asset load requested");
      video.load();
      armLoadTimeout();
    });
  }

  window.OssuarySymbolWinAnimationPlayer = {
    play: play
  };
})();
