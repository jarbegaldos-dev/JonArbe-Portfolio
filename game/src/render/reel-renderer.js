(function () {
  "use strict";

  function createReelRenderer(options) {
    var reelLayer = options.reelLayer;
    var imageReference = options.imageReference;
    var config = options.config;
    var hooks = options.hooks;

    function setReelPhase(reel, phase) {
      if (reel.phase === phase) return;

      var classes = [
        "is-spinning",
        "is-accelerating",
        "is-cruising",
        "is-prepare-landing",
        "is-decelerating",
        "is-settling",
        "is-stopped"
      ];

      for (var i = 0; i < reel.cells.length; i++) {
        var cell = reel.cells[i];
        cell.el.classList.remove.apply(cell.el.classList, classes);
        if (phase === "stopped") {
          cell.el.classList.add("is-stopped");
        } else if (phase !== "idle") {
          cell.el.classList.add("is-spinning", "is-" + phase);
        }
      }

      reel.phase = phase;
    }

    function createCellElement(cell, reel) {
      var el = document.createElement("div");
      el.className = "symbol-cell " + (reel.type === "sternum" ? "sternum-cell" : "rib-cell");
      el.classList.add("uses-continuous-track");
      var bounds = cell.visualBounds || {
        cx: cell.x,
        cy: cell.y,
        width: cell.w,
        height: cell.h
      };
      el.style.left = (bounds.cx / imageReference.width) * 100 + "%";
      el.style.top = (bounds.cy / imageReference.height) * 100 + "%";
      el.style.width = (bounds.width / imageReference.width) * 100 + "%";
      el.style.height = (bounds.height / imageReference.height) * 100 + "%";
      el.dataset.cell = cell.id;
      el.dataset.reel = reel.id;

      var track = document.createElement("div");
      track.className = "symbol-track";
      el.appendChild(track);

      cell.el = el;
      cell.trackEl = track;
      cell.tileEls = [];

      reelLayer.appendChild(el);
      hooks.setCellSymbol(cell, cell.initial);
    }

    function createReelLane(reel) {
      var minX = Math.min.apply(null, reel.cells.map(function (cell) { return cell.x - cell.w / 2; }));
      var maxX = Math.max.apply(null, reel.cells.map(function (cell) { return cell.x + cell.w / 2; }));
      var minY = Math.min.apply(null, reel.cells.map(function (cell) { return cell.y - cell.h / 2; }));
      var maxY = Math.max.apply(null, reel.cells.map(function (cell) { return cell.y + cell.h / 2; }));
      var lane = document.createElement("div");
      lane.className = "reel-lane " + (reel.type === "sternum" ? "sternum-lane" : "rib-lane");
      lane.style.left = (((minX + maxX) / 2) / imageReference.width) * 100 + "%";
      lane.style.top = (((minY + maxY) / 2) / imageReference.height) * 100 + "%";
      lane.style.width = ((maxX - minX) / imageReference.width) * 100 + "%";
      lane.style.height = ((maxY - minY) / imageReference.height) * 100 + "%";
      lane.dataset.reel = reel.id;
      reelLayer.appendChild(lane);
      reel.laneEl = lane;
    }

    function createContinuousReelTrack(reel) {
      var isVertical = reel.orientation === "vertical";
      var axisKey = isVertical ? "cy" : "cx";
      var axisSizeKey = isVertical ? "height" : "width";

      var sortedCells = reel.cells.slice().sort(function (a, b) {
        return a.visualBounds[axisKey] - b.visualBounds[axisKey];
      });
      // Se guarda para poder localizar, mas adelante (cuando el rodillo esta
      // detenido), que tile del DOM corresponde a una celda concreta. Ver
      // getTileElementForCell.
      reel.sortedContinuousCells = sortedCells;
      var minX = Math.min.apply(null, sortedCells.map(function (cell) { return cell.visualBounds.cx - cell.visualBounds.width / 2; }));
      var maxX = Math.max.apply(null, sortedCells.map(function (cell) { return cell.visualBounds.cx + cell.visualBounds.width / 2; }));
      var minY = Math.min.apply(null, sortedCells.map(function (cell) { return cell.visualBounds.cy - cell.visualBounds.height / 2; }));
      var maxY = Math.max.apply(null, sortedCells.map(function (cell) { return cell.visualBounds.cy + cell.visualBounds.height / 2; }));
      var boundsWidth = maxX - minX;
      var boundsHeight = maxY - minY;
      var firstCell = sortedCells[0];
      var averagePitch = sortedCells.length > 1
        ? sortedCells.slice(1).reduce(function (sum, cell, index) {
          return sum + (cell.visualBounds[axisKey] - sortedCells[index].visualBounds[axisKey]);
        }, 0) / (sortedCells.length - 1)
        : firstCell.visualBounds[axisSizeKey];
      var tileSize = averagePitch / (config.SYMBOL_STEP_PERCENT / 100);

      var track = document.createElement("div");
      track.className = "continuous-symbol-track " + (reel.type === "sternum" ? "sternum-symbol-track" : "rib-symbol-track");
      track.style.left = (((minX + maxX) / 2) / imageReference.width) * 100 + "%";
      track.style.top = (((minY + maxY) / 2) / imageReference.height) * 100 + "%";
      track.style.width = (boundsWidth / imageReference.width) * 100 + "%";
      track.style.height = (boundsHeight / imageReference.height) * 100 + "%";
      track.style.setProperty("--continuous-symbol-x", ((firstCell.visualBounds.cx - minX) / boundsWidth) * 100 + "%");
      track.style.setProperty("--continuous-symbol-y", ((firstCell.visualBounds.cy - minY) / boundsHeight) * 100 + "%");
      track.style.setProperty(
        "--continuous-symbol-width",
        isVertical
          ? (firstCell.visualBounds.width / boundsWidth) * 100 + "%"
          : (tileSize / boundsWidth) * 100 + "%"
      );
      track.style.setProperty(
        "--continuous-symbol-height",
        isVertical
          ? (tileSize / boundsHeight) * 100 + "%"
          : (firstCell.visualBounds.height / boundsHeight) * 100 + "%"
      );
      track.dataset.reel = reel.id;

      reel.continuousReferenceCell = firstCell;
      reel.continuousTileRadius = config.VISIBLE_TILE_RADIUS + reel.cells.length + 2;
      reel.continuousTrackEl = track;
      reel.continuousTileEls = [];

      for (var i = -reel.continuousTileRadius; i <= reel.continuousTileRadius; i++) {
        var tile = document.createElement("div");
        tile.className = "symbol-tile";
        tile.dataset.reel = reel.id;
        tile.dataset.cell = reel.id + "-continuous";
        track.appendChild(tile);
        reel.continuousTileEls.push(tile);
      }

      reelLayer.appendChild(track);
    }

    function assignContinuousCellBounds(reel) {
      var axis = reel.orientation === "vertical" ? "y" : "x";
      var cross = reel.orientation === "vertical" ? "x" : "y";
      var size = reel.orientation === "vertical" ? "h" : "w";
      var crossSize = reel.orientation === "vertical" ? "w" : "h";
      var sortedCells = reel.cells.slice().sort(function (a, b) { return a[axis] - b[axis]; });
      var minEdge = Math.min.apply(null, sortedCells.map(function (cell) { return cell[axis] - cell[size] / 2; }));
      var maxEdge = Math.max.apply(null, sortedCells.map(function (cell) { return cell[axis] + cell[size] / 2; }));
      var minCross = Math.min.apply(null, sortedCells.map(function (cell) { return cell[cross] - cell[crossSize] / 2; }));
      var maxCross = Math.max.apply(null, sortedCells.map(function (cell) { return cell[cross] + cell[crossSize] / 2; }));

      for (var i = 0; i < sortedCells.length; i++) {
        var cell = sortedCells[i];
        var start = i === 0 ? minEdge : (sortedCells[i - 1][axis] + cell[axis]) / 2;
        var end = i === sortedCells.length - 1 ? maxEdge : (cell[axis] + sortedCells[i + 1][axis]) / 2;
        var visualBounds = {
          cx: cell.x,
          cy: cell.y,
          width: cell.w,
          height: cell.h
        };

        if (reel.orientation === "vertical") {
          visualBounds.cy = (start + end) / 2;
          visualBounds.height = end - start;
          visualBounds.cx = (minCross + maxCross) / 2;
          visualBounds.width = maxCross - minCross;
        } else {
          visualBounds.cx = (start + end) / 2;
          visualBounds.width = end - start;
          visualBounds.cy = (minCross + maxCross) / 2;
          visualBounds.height = maxCross - minCross;
        }

        cell.visualBounds = visualBounds;
      }
    }

    // Espejo cosmético SOLO del rebote de settle (no de scrollSign, que es la
    // dirección real del giro). Fuera de "settling" el excursion es ~0, así
    // que esto no afecta a accel/cruise/decel/idle/stopped.
    var SPRING_SIGN_OVERRIDE = config.SETTLE_SPRING_SIGN_OVERRIDE || {};

    function settlePositionFor(reel) {
      if (reel.phase !== "settling") return reel.position;
      var sign = SPRING_SIGN_OVERRIDE[reel.id] || 1;
      if (sign === 1) return reel.position;
      var excursion = reel.position - reel.targetPosition;
      return reel.targetPosition + excursion * sign;
    }

    function stableStreamBaseIndex(reel, center) {
      if (reel.windupRenderLock && typeof reel.windupBaseStreamIndex === "number") {
        return reel.windupBaseStreamIndex;
      }
      return Math.floor(center);
    }

    // Espejo cosmético del giro en RESPIN (a petición del usuario): al entrar
    // en el respin de bonus (reel.isRespin), las costillas giran visualmente
    // al reves respecto al spin base, EXCEPTO el esternón (rodillo central,
    // reel.type === "sternum"). Es puramente un cambio de signo en el render
    // (mismo mecanismo que SPRING_SIGN_OVERRIDE arriba): no toca reel.position,
    // reel.velocity, cellStep, ni el mapeo de símbolos finales
    // (streamIndexAtCell/getSymbolAt), así que timing, RNG y resultado son
    // exactamente los mismos, solo cambia hacia qué lado se pintan los tiles.
    function effectiveScrollSign(reel) {
      if (reel.isRespin && reel.type !== "sternum") return -reel.scrollSign;
      return reel.scrollSign;
    }

    function renderContinuousReelTrack(reel) {
      var effectivePosition = settlePositionFor(reel);
      var center = hooks.streamIndexAtCell(reel, reel.continuousReferenceCell, effectivePosition);
      var firstIndex = stableStreamBaseIndex(reel, center) - reel.continuousTileRadius;
      var scrollSign = effectiveScrollSign(reel);

      for (var i = 0; i < reel.continuousTileEls.length; i++) {
        var streamIndex = firstIndex + i;
        var tile = reel.continuousTileEls[i];
        var symbol = hooks.getSymbolAt(reel, streamIndex);
        var offset = (streamIndex - center) * config.SYMBOL_STEP_PERCENT * scrollSign;

        hooks.setTileSymbol(tile, symbol, reel);
        tile.style.transform = reel.orientation === "vertical"
          ? "translate(-50%, -50%) translateY(" + offset + "%)"
          : "translate(-50%, -50%) translateX(" + offset + "%)";
      }
    }

    function renderReel(reel) {
      renderContinuousReelTrack(reel);
    }

    function commitVisibleSymbols(reel, symbols) {
      var visibleSymbols = Array.isArray(symbols) && symbols.length ? symbols : reel.finalSymbols;
      for (var i = 0; i < reel.cells.length; i++) {
        hooks.setCellSymbol(reel.cells[i], visibleSymbols[i]);
      }
    }

    // Localiza el elemento DOM (.symbol-tile) que muestra actualmente una
    // celda concreta, SOLO valido con el rodillo detenido (no en pleno giro).
    // Reutiliza el mismo orden (sortedContinuousCells) y el mismo offset
    // (continuousTileRadius) que ya usa createContinuousReelTrack /
    // renderContinuousReelTrack para posicionar los tiles, en vez de
    // recalcular el indice por su cuenta: con el rodillo detenido, el centro
    // del track coincide exactamente con la celda de referencia (indice 0), y
    // cada celda siguiente cae en el siguiente indice de tile.
    function getTileElementForCell(reel, cell) {
      if (!reel.sortedContinuousCells || !reel.continuousTileEls) return null;
      var idx = reel.sortedContinuousCells.indexOf(cell);
      if (idx === -1) return null;
      return reel.continuousTileEls[reel.continuousTileRadius + idx] || null;
    }

    return {
      setReelPhase: setReelPhase,
      createCellElement: createCellElement,
      createReelLane: createReelLane,
      createContinuousReelTrack: createContinuousReelTrack,
      assignContinuousCellBounds: assignContinuousCellBounds,
      renderContinuousReelTrack: renderContinuousReelTrack,
      renderReel: renderReel,
      commitVisibleSymbols: commitVisibleSymbols,
      getTileElementForCell: getTileElementForCell
    };
  }

  window.OssuaryReelRenderer = {
    create: createReelRenderer
  };
})();
