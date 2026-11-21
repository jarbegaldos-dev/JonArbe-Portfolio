(function () {
  "use strict";

  function createWinSymbolDebug(options) {
    var state = options.state;
    var hooks = options.hooks;
    var replayTimer = null;
    var replayRunning = false;
    var lastForcedPreset = null;

    function registry() {
      return window.OSSUARY_SYMBOL_WIN_ANIMATIONS || {};
    }

    function cloneLandingFinalSymbols(source) {
      var clone = {};
      Object.keys(source || {}).forEach(function (reelId) {
        clone[reelId] = source[reelId].slice();
      });
      return clone;
    }

    function clonePreset(preset) {
      if (!preset) return null;
      return {
        symbol: preset.symbol,
        length: preset.length,
        winningCellIds: (preset.winningCellIds || []).slice(),
        landingFinalSymbols: cloneLandingFinalSymbols(preset.landingFinalSymbols || {})
      };
    }

    function resolveTarget(reelId) {
      if (reelId) {
        var reel = state.reels.find(function (r) { return r.id === reelId; });
        return reel && reel.cells.length ? { reel: reel, cell: reel.cells[0] } : null;
      }
      for (var i = 0; i < state.reels.length; i++) {
        var candidate = state.reels[i];
        if (candidate.cells.length) return { reel: candidate, cell: candidate.cells[0] };
      }
      return null;
    }

    function forceSymbol(symbol, reelId) {
      symbol = symbol || Object.keys(registry())[0];
      var target = resolveTarget(reelId);
      if (!target || !symbol) {
        console.warn("[WinSymbolDebug] forceSymbol: no hay reel/celda disponible o falta symbol.");
        return null;
      }
      var reel = target.reel;
      var cell = target.cell;
      cell.current = symbol;
      cell.effective = symbol;
      cell.el.dataset.symbol = symbol;
      cell.el.dataset.effectiveSymbol = symbol;
      var tileEl = hooks.getTileElementForCell(reel, cell);
      if (tileEl) {
        hooks.renderSymbolContent(tileEl, symbol, reel);
      }
      return { reelId: reel.id, cellId: cell.id, symbol: symbol, tileEl: tileEl };
    }

    function trigger(symbol, reelId) {
      var forced = forceSymbol(symbol, reelId);
      if (!forced || !forced.tileEl) return Promise.resolve(false);
      var animConfig = registry()[forced.symbol];
      if (!animConfig) {
        console.warn("[WinSymbolDebug] trigger: '" + forced.symbol + "' no tiene animacion registrada.");
        return Promise.resolve(false);
      }
      return window.OssuarySymbolWinAnimationPlayer.play(forced.tileEl, animConfig).then(function () {
        return true;
      });
    }

    function stopReplay() {
      replayRunning = false;
      if (replayTimer) {
        clearTimeout(replayTimer);
        replayTimer = null;
      }
    }

    function replay(symbol, reelId, times) {
      stopReplay();
      replayRunning = true;
      var remaining = times == null ? Infinity : times;

      function next() {
        if (!replayRunning || remaining <= 0) {
          replayRunning = false;
          return;
        }
        remaining--;
        trigger(symbol, reelId).then(function () {
          if (replayRunning && remaining > 0) {
            replayTimer = setTimeout(next, 250);
          } else {
            replayRunning = false;
          }
        });
      }

      next();
    }

    function toggleStatic(symbol, reelId) {
      var target = resolveTarget(reelId);
      if (!target) return null;
      var tileEl = hooks.getTileElementForCell(target.reel, target.cell);
      if (!tileEl) return null;

      var existingVideo = tileEl.querySelector("video.symbol-art--win-animation");
      if (existingVideo) {
        existingVideo.pause();
        tileEl.removeChild(existingVideo);
        Array.prototype.forEach.call(tileEl.children, function (child) {
          child.style.visibility = "";
        });
        return "static";
      }

      symbol = symbol || Object.keys(registry())[0];
      var animConfig = registry()[symbol];
      if (!animConfig) {
        console.warn("[WinSymbolDebug] toggleStatic: '" + symbol + "' no tiene animacion registrada.");
        return null;
      }
      Array.prototype.forEach.call(tileEl.children, function (child) {
        child.style.visibility = "hidden";
      });
      var video = document.createElement("video");
      video.className = "symbol-art symbol-art--win-animation";
      video.src = animConfig.assetPath;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.style.position = "absolute";
      video.style.inset = "0";
      var scale = animConfig.scale != null ? animConfig.scale : 1;
      video.style.transform = "translate(" + (animConfig.offsetXPercent || 0) + "%, " + (animConfig.offsetYPercent || 0) + "%) scale(" + scale + ")";
      tileEl.appendChild(video);
      var playResult = video.play();
      if (playResult && typeof playResult.catch === "function") playResult.catch(function () {});
      return "animated";
    }

    function verifyRestore(symbol, reelId) {
      return trigger(symbol, reelId).then(function (ok) {
        if (!ok) {
          console.warn("[WinSymbolDebug] verifyRestore: no se pudo disparar la animacion.");
          return false;
        }
        var target = resolveTarget(reelId);
        var tileEl = hooks.getTileElementForCell(target.reel, target.cell);
        var hasLeftoverVideo = Boolean(tileEl && tileEl.querySelector("video.symbol-art--win-animation"));
        var img = tileEl && tileEl.querySelector("img.symbol-art");
        var imgRestored = Boolean(img) && img.style.visibility !== "hidden";
        var passed = !hasLeftoverVideo && imgRestored;
        console.log("[WinSymbolDebug] verifyRestore:", passed ? "OK, PNG restaurado correctamente." : "FALLO, no volvio al PNG estatico.");
        return passed;
      });
    }

    function rectToJson(r) {
      return { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    }

    function snapshotVideoState(tileEl, label) {
      var tileRect = tileEl.getBoundingClientRect();
      var video = tileEl.querySelector("video.symbol-art--win-animation");
      var data = { label: label, tileRect: rectToJson(tileRect), video: null };
      if (video) {
        var videoRect = video.getBoundingClientRect();
        var computed = window.getComputedStyle(video);
        data.video = {
          connected: video.isConnected,
          src: video.currentSrc || video.src,
          rect: rectToJson(videoRect),
          computedDisplay: computed.display,
          computedVisibility: computed.visibility,
          computedOpacity: computed.opacity,
          computedZIndex: computed.zIndex,
          computedTransform: computed.transform,
          computedPosition: computed.position,
          inlineTransform: video.style.transform,
          inlineOpacity: video.style.opacity,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          currentTime: video.currentTime,
          duration: video.duration,
          readyState: video.readyState,
          networkState: video.networkState,
          paused: video.paused,
          ended: video.ended,
          error: video.error ? { code: video.error.code, message: video.error.message } : null
        };
      }
      console.log("[WinSymbolDebug] inspectVideo[" + label + "]:", JSON.stringify(data));
      return data;
    }

    function inspectVideo(symbol, reelId) {
      var forced = forceSymbol(symbol, reelId);
      if (!forced || !forced.tileEl) {
        console.warn("[WinSymbolDebug] inspectVideo: no se pudo forzar el simbolo.");
        return Promise.resolve(null);
      }
      var tileEl = forced.tileEl;
      var animConfig = registry()[forced.symbol];
      if (!animConfig) {
        console.warn("[WinSymbolDebug] inspectVideo: '" + forced.symbol + "' no tiene animacion registrada.");
        return Promise.resolve(null);
      }

      window.OssuarySymbolWinAnimationPlayer.play(tileEl, animConfig);

      var snapshots = [snapshotVideoState(tileEl, "t+0ms (justo tras play())")];
      return new Promise(function (resolve) {
        setTimeout(function () {
          snapshots.push(snapshotVideoState(tileEl, "t+150ms"));
          setTimeout(function () {
            snapshots.push(snapshotVideoState(tileEl, "t+600ms"));
            setTimeout(function () {
              snapshots.push(snapshotVideoState(tileEl, "t+1500ms"));
              resolve(snapshots);
            }, 900);
          }, 450);
        }, 150);
      });
    }

    function buildForcedSpinState(preset) {
      return {
        landing: true,
        label: "ANCESTRAL " + preset.length + " WIN DEBUG",
        symbol: preset.symbol,
        debugWinAnimation: true,
        winningCellIds: (preset.winningCellIds || []).slice(),
        landingFinalSymbols: cloneLandingFinalSymbols(preset.landingFinalSymbols || {})
      };
    }

    function forceConnectedWin(length) {
      if (state.spinning) return false;
      if (!hooks.buildAnimatedSymbolDebugPreset || !hooks.startSpin) return false;
      var preset = hooks.buildAnimatedSymbolDebugPreset("ANCESTRAL_SKULL", length);
      if (!preset) {
        console.warn("[WinSymbolDebug] No se pudo construir preset ancestral de longitud " + length + ".");
        return false;
      }
      console.log("[ancestral-debug] forced cells", preset.winningCellIds || []);
      stopReplay();
      hooks.clearAutoTimer();
      state.auto = false;
      state.debugGiantTest = buildForcedSpinState(preset);
      lastForcedPreset = clonePreset(preset);
      hooks.startSpin();
      return true;
    }

    function replayForcedWin() {
      if (state.spinning || !lastForcedPreset || !hooks.startSpin) return false;
      stopReplay();
      hooks.clearAutoTimer();
      state.auto = false;
      state.debugGiantTest = buildForcedSpinState(lastForcedPreset);
      hooks.startSpin();
      return true;
    }

    function restoreNormalGame() {
      if (state.spinning) return false;
      stopReplay();
      hooks.clearAutoTimer();
      state.auto = false;
      state.debugGiantTest = null;
      lastForcedPreset = null;
      hooks.resetReelMotion();
      hooks.resetCellsToReference();
      hooks.render();
      return true;
    }

    function expose() {
      window.OssuaryWinSymbolDebug = {
        listSymbols: function () {
          return Object.keys(registry());
        },
        forceSymbol: function (symbol, reelId) {
          var result = forceSymbol(symbol, reelId);
          return result ? { reelId: result.reelId, cellId: result.cellId, symbol: result.symbol } : null;
        },
        trigger: trigger,
        replay: replay,
        stopReplay: stopReplay,
        toggleStatic: toggleStatic,
        verifyRestore: verifyRestore,
        inspectVideo: inspectVideo,
        forceConnectedWin: forceConnectedWin,
        force3: function () {
          return forceConnectedWin(3);
        },
        force4: function () {
          return forceConnectedWin(4);
        },
        force5: function () {
          return forceConnectedWin(5);
        },
        replayForcedWin: replayForcedWin,
        restoreNormalGame: restoreNormalGame
      };
    }

    return { expose: expose };
  }

  window.OssuaryWinSymbolDebugFactory = {
    create: createWinSymbolDebug
  };
})();
