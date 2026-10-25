(function () {
  "use strict";

  var EYE_SPACING_PERCENT = 1.5;
  var EYE_SPACING_PERCENT_EXTRA_LEFT = 0.13; // ~2px sobre el ancho de diseno del stage (1525px)
  var EYE_SIZE_PERCENT = 2.2;

  function resolveZIndex(entry) {
    if (entry.zIndex != null) {
      return entry.zIndex;
    }
    var layerDef = window.OSSUARY_FX_LAYERS && window.OSSUARY_FX_LAYERS[entry.layer];
    return layerDef ? layerDef.zIndex : 0;
  }

  function buildVideo(entry, offsetSignXPercent, shouldMirror) {
    var video = document.createElement("video");
    video.src = entry.assetPath;
    video.muted = true;
    video.loop = entry.loop !== false;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-hidden", "true");
    video.style.position = "absolute";
    video.style.left = "50%";
    video.style.top = "50%";
    video.style.width = EYE_SIZE_PERCENT * 1.8 + "%";
    video.style.height = EYE_SIZE_PERCENT * 1.8 + "%";
    var extraLeft = offsetSignXPercent < 0 ? EYE_SPACING_PERCENT_EXTRA_LEFT : 0;
    video.style.marginLeft = (offsetSignXPercent * EYE_SPACING_PERCENT - extraLeft) + "%";
    video.style.objectFit = "contain";
    video.style.pointerEvents = "none";
    video.style.transform = "translate(-50%, -50%)" + (shouldMirror ? " scaleX(-1)" : "");
    return video;
  }

  function safelyPlay(media) {
    if (!media) {
      return;
    }
    var playResult = media.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(function () {});
    }
  }

  function createWebmAlphaPlayer(entry) {
    var container = null;
    var videos = [];
    var audio = null;

    function mount() {
      var stage = document.getElementById("slotStage");
      if (!stage) {
        console.warn("[OssuaryFX] " + entry.id + ": #slotStage not found, mount skipped.");
        return;
      }
      var position = window.OssuaryFXPositionResolver.resolveAnchor(entry.anchor);
      var offsetX = entry.offset ? entry.offset.x || 0 : 0;
      var offsetY = entry.offset ? entry.offset.y || 0 : 0;

      container = document.createElement("div");
      container.className = "fx-css-layer";
      container.setAttribute("aria-hidden", "true");
      container.style.left = (position.xPercent + offsetX) + "%";
      container.style.top = (position.yPercent + offsetY) + "%";
      container.style.width = "100%";
      container.style.height = "100%";
      container.style.zIndex = String(resolveZIndex(entry));
      container.style.mixBlendMode = entry.blendMode || "normal";
      container.style.setProperty("--fx-scale", entry.scale != null ? entry.scale : 1);
      container.style.setProperty("--fx-target-opacity", entry.opacity != null ? entry.opacity : 1);
      stage.appendChild(container);

      videos = [
        buildVideo(entry, -1, false),
        buildVideo(entry, 1, true)
      ];
      videos.forEach(function (video) {
        container.appendChild(video);
      });

      if (entry.audioPath) {
        audio = new Audio(entry.audioPath);
        audio.preload = "auto";
      }
    }

    function activate() {
      if (!container) {
        return;
      }
      container.classList.add("is-active");
      videos.forEach(function (video) {
        video.currentTime = 0;
        safelyPlay(video);
      });
      if (audio) {
        audio.currentTime = 0;
        safelyPlay(audio);
      }
    }

    function deactivate() {
      if (!container) {
        return;
      }
      container.classList.remove("is-active");
      videos.forEach(function (video) {
        video.pause();
      });
    }

    function dispose() {
      deactivate();
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      container = null;
      videos = [];
      audio = null;
    }

    return {
      mount: mount,
      activate: activate,
      deactivate: deactivate,
      dispose: dispose,
      getElement: function () {
        return container;
      }
    };
  }

  window.OssuaryFXWebmAlphaPlayer = {
    create: createWebmAlphaPlayer
  };
})();
