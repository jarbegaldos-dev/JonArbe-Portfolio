(function () {
  "use strict";

  // El tablero ya tiene su resultado definitivo. Esta capa conserva una
  // instantánea del tramo anterior y lo desplaza como una tira hasta asentarlo.
  function animate(entries, durationMs) {
    if (!Array.isArray(entries) || !entries.length) return Promise.resolve();

    var groups = new Map();
    entries.forEach(function (entry) {
      if (!entry || !entry.reel || !entry.cell || !entry.cell.el || !entry.tileEl) return;
      if (!groups.has(entry.reel)) groups.set(entry.reel, []);
      groups.get(entry.reel).push(entry);
    });

    var plays = [];
    var landingTimer = null;
    groups.forEach(function (moves, reel) {
      var track = reel.continuousTrackEl || reel.laneEl;
      if (!track || !track.isConnected) return;
      var trackRect = track.getBoundingClientRect();
      if (!trackRect.width || !trackRect.height) return;

      var viewport = document.createElement("div");
      viewport.className = "small-blade-refill-viewport";
      viewport.setAttribute("aria-hidden", "true");
      viewport.style.cssText = "position:fixed;overflow:hidden;pointer-events:none;z-index:9050;left:" +
        trackRect.left + "px;top:" + trackRect.top + "px;width:" + trackRect.width +
        "px;height:" + trackRect.height + "px;";
      document.body.appendChild(viewport);

      var axis = reel.orientation === "vertical" ? "Y" : "X";
      var effectiveSign = reel.isRespin && reel.type !== "sternum" ? -reel.scrollSign : reel.scrollSign;
      var direction = effectiveSign < 0 ? 1 : -1;
      var animations = [];
      var hidden = [];

      moves.forEach(function (move) {
        var tile = move.tileEl;
        var target = move.cell.el.getBoundingClientRect();
        if (!tile.isConnected || !target.width || !target.height || typeof tile.animate !== "function") return;

        var source = move.fromCell && move.fromCell.el
          ? move.fromCell.el.getBoundingClientRect() : null;
        var ghost = (move.sourceClone || tile).cloneNode(true);
        ghost.classList.remove("small-blade-cut-hidden", "is-covered-by-giant");
        ghost.classList.add("small-blade-refill-ghost");
        ghost.setAttribute("aria-hidden", "true");
        ghost.querySelectorAll(".symbol-smoke, .symbol-shine, .symbol-video-overlay").forEach(function (el) { el.remove(); });
        ghost.style.position = "absolute";
        ghost.style.left = (target.left - trackRect.left) + "px";
        ghost.style.top = (target.top - trackRect.top) + "px";
        ghost.style.width = target.width + "px";
        ghost.style.height = target.height + "px";
        ghost.style.margin = "0";
        ghost.style.pointerEvents = "none";
        ghost.style.gridAutoRows = "100%";
        ghost.style.transform = "none";
        viewport.appendChild(ghost);
        tile.classList.add("small-blade-cut-hidden");
        hidden.push(tile);

        var targetCenter = axis === "X" ? target.left + target.width / 2 : target.top + target.height / 2;
        var sourceCenter = source
          ? (axis === "X" ? source.left + source.width / 2 : source.top + source.height / 2)
          : (direction < 0
            ? (axis === "X" ? trackRect.right + target.width / 2 : trackRect.bottom + target.height / 2)
            : (axis === "X" ? trackRect.left - target.width / 2 : trackRect.top - target.height / 2));
        var start = sourceCenter - targetCenter;
        var size = axis === "X" ? target.width : target.height;
        var translate = function (value) { return "translate" + axis + "(" + value + "px)"; };
        try {
          animations.push(ghost.animate([
            { transform: translate(start), easing: "cubic-bezier(.28,.54,.35,1)" },
            { transform: translate(direction * size * 0.20), offset: 0.80, easing: "ease-out" },
            { transform: translate(-direction * size * 0.075), offset: 0.92, easing: "ease-out" },
            { transform: translate(0) }
          ], { duration: durationMs, fill: "both" }));
        } catch (e) {
          // Aunque WAAPI falle se restaura el tablero en cleanup.
        }
      });

      if (animations.length && landingTimer === null) {
        landingTimer = window.setTimeout(function () {
          if (window.OssuaryAudio) window.OssuaryAudio.play("reel-stop", { volume: 0.25 });
        }, durationMs * 0.80);
      }
      plays.push(Promise.all(animations.map(function (animation) {
        return animation.finished.catch(function () {});
      })).then(function () {
        if (viewport.parentNode) viewport.parentNode.removeChild(viewport);
        hidden.forEach(function (tile) {
          if (tile.isConnected) tile.classList.remove("small-blade-cut-hidden");
        });
      }));
    });
    return Promise.all(plays).then(function () {
      if (landingTimer !== null) window.clearTimeout(landingTimer);
    });
  }

  window.OssuarySmallBladeRefill = { animate: animate };
})();
