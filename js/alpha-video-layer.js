/* ---------------------------------------------------------------------
   Alpha video layer — shared component.

   Problem this solves: a WebM video encoded with VP9 alpha (alpha_mode=1
   in the container) DOES carry real per-pixel transparency, decoded
   correctly by the browser's video pipeline. Verified directly (drawImage
   + getImageData) that raven-perch.webm / skeleton-stone-throw.webm both
   have a genuine alpha channel with a full 0-255 range and clean
   antialiased edges around the character — this is not guessed or
   computed, it's the codec's own data.

   But a plain <video> element's alpha is NOT guaranteed to reach the
   page's compositing on every engine/device — some mobile Chrome builds
   route WebM/VP9 through a hardware decoder path that drops the alpha
   side-channel, and Safari can't decode VP9 at all (it silently falls
   through to the H.264 <source>, which has no alpha in any browser).

   The fix: never let the <video> itself be the visible element. Decode it
   off-screen and mirror each frame onto a <canvas> via drawImage(). Canvas
   2D compositing preserves the decoded alpha reliably wherever the video
   pipeline produces it, independent of how that engine composites a raw
   <video> box into the page. No pixel data is read back or modified
   (no getImageData/putImageData) — drawImage is a straight passthrough,
   so there is zero quality loss versus the source video.

   This does not manufacture transparency where the decode itself has
   none (e.g. the H.264 fallback used when a browser can't play the WebM
   at all): in that case the canvas faithfully mirrors the same opaque
   frame the <video> would have shown. Fixing that case needs a source
   format Safari can decode with alpha (HEVC+alpha, Apple-only tooling)
   or an explicit fallback strategy — out of scope for this component.
   --------------------------------------------------------------------- */
(function () {
  'use strict';

  /**
   * @param {HTMLVideoElement} video - the decode source. Left in the DOM,
   *   visually hidden (see the *-source CSS classes), autoplay/muted/loop
   *   as usual. This module never calls play()/pause() itself — autoplay
   *   robustness stays owned by main.js's attemptPlay()/attemptPlayAll().
   * @param {HTMLCanvasElement} canvas - the visible element. Takes over
   *   the box the <video> used to occupy (same wrapper, same CSS sizing).
   * @returns {{ stop: function(): void }} call stop() to cancel the
   *   per-frame mirroring loop (e.g. if the element is removed).
   */
  function setupAlphaVideoLayer(video, canvas) {
    var ctx = canvas.getContext('2d', { alpha: true });
    var rafId = null;
    var lastCssW = 0, lastCssH = 0;

    function resizeCanvasToDisplaySize() {
      var dpr = window.devicePixelRatio || 1;
      var rect = canvas.getBoundingClientRect();
      var cssW = rect.width, cssH = rect.height;
      if (cssW === lastCssW && cssH === lastCssH) return;
      lastCssW = cssW;
      lastCssH = cssH;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
    }

    function drawFrame() {
      // readyState 2 (HAVE_CURRENT_DATA) is enough: there is a decoded
      // frame to mirror, even if the video is momentarily paused/buffering.
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        resizeCanvasToDisplaySize();
        var cw = canvas.width, ch = canvas.height;
        var vw = video.videoWidth, vh = video.videoHeight;
        if (cw > 0 && ch > 0) {
          // Emulate CSS object-fit:cover manually: canvas drawImage has no
          // equivalent, so the source/dest rects are computed by hand,
          // scaling to fill and centering the overflow (same visual result
          // the <video> had with object-fit:cover, no stretching).
          var scale = Math.max(cw / vw, ch / vh);
          var dw = vw * scale, dh = vh * scale;
          var dx = (cw - dw) / 2, dy = (ch - dh) / 2;
          ctx.clearRect(0, 0, cw, ch);
          ctx.drawImage(video, dx, dy, dw, dh);
        }
      }
      rafId = requestAnimationFrame(drawFrame);
    }

    drawFrame();

    return {
      stop: function () {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }

  window.OssuaryAlphaVideo = { setup: setupAlphaVideoLayer };
})();
