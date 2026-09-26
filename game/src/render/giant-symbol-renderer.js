(function () {
  "use strict";

  function createGiantSymbolRenderer(options) {
    var reelLayer = options.reelLayer;
    // Bloque fisico unico que recibe la carga del impacto: rodillos +
    // marco/arte de fondo (caja toracica, estructura central). Todos los
    // elementos de esta lista reciben EXACTAMENTE el mismo transform cada
    // frame, nunca valores independientes, para que se lean como una sola
    // pieza rigida y no como rodillos con vida propia. uiLayer (botones,
    // marcador) deliberadamente NO esta aqui.
    var machineBlockEls = options.machineBlockEls || [reelLayer];
    var backgroundBlockEls = options.backgroundBlockEls || [];
    var backgroundTransformFactor = typeof options.backgroundTransformFactor === "number"
      ? options.backgroundTransformFactor
      : 0.5;
    var imageReference = options.imageReference;
    var config = options.config;
    var hooks = options.hooks;

    function dampTransformValue(value, factor) {
      return value === 1 ? 1 : 1 + (value - 1) * factor;
    }

    function createGiantStripTrack(reel) {
      var xs = reel.cells.map(function (cell) { return cell.x; });
      var ys = reel.cells.map(function (cell) { return cell.y; });
      var minX = Math.min.apply(null, reel.cells.map(function (cell) { return cell.x - cell.w / 2; }));
      var maxX = Math.max.apply(null, reel.cells.map(function (cell) { return cell.x + cell.w / 2; }));
      var minY = Math.min.apply(null, reel.cells.map(function (cell) { return cell.y - cell.h / 2; }));
      var maxY = Math.max.apply(null, reel.cells.map(function (cell) { return cell.y + cell.h / 2; }));

      var track = document.createElement("div");
      track.className = "giant-strip-track " + (reel.type === "sternum" ? "giant-sternum-strip" : "giant-rib-strip");
      track.style.left = ((Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2 / imageReference.width) * 100 + "%";
      track.style.top = ((Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2 / imageReference.height) * 100 + "%";
      track.style.width = ((maxX - minX) / imageReference.width) * 100 + "%";
      track.style.height = ((maxY - minY) / imageReference.height) * 100 + "%";
      track.dataset.reel = reel.id;
      reelLayer.appendChild(track);
      reel.giantStripEl = track;

      reel.giantPool = [];
      for (var i = 0; i < config.GIANT_POOL_SIZE; i++) {
        var el = document.createElement("div");
        el.className = "giant-strip-symbol " + (reel.type === "sternum" ? "giant-sternum" : "giant-rib");
        el.hidden = true;
        track.appendChild(el);
        reel.giantPool.push(el);
      }
      reel.giantEl = reel.giantPool[0];
    }

    function configureGiantElement(el, symbol, reel) {
      if (hooks.resetElementState) {
        hooks.resetElementState(el, reel);
      }
      el.hidden = false;
      hooks.renderSymbolContent(el, symbol, reel);
      el.dataset.symbol = symbol;
    }

    function hideGiantElement(el) {
      el.hidden = true;
      el.replaceChildren();
      el.classList.remove("has-symbol-art");
      el.dataset.symbol = "";
    }

    function streamIndexInCoveredRanges(streamIndex, coveredRanges) {
      return coveredRanges.some(function (range) {
        return streamIndex >= range[0] && streamIndex <= range[1];
      });
    }

    function giantBlockVisibilityThreshold(block) {
      return config.GIANT_ENTRY_THRESHOLD + block.size * config.SYMBOL_STEP_PERCENT;
    }

    function setGiantTileCoverage(reel, coveredRanges) {
      var center = hooks.streamIndexAtCell(reel, reel.continuousReferenceCell, reel.position);
      var firstIndex = Math.floor(center) - reel.continuousTileRadius;

      for (var i = 0; i < reel.continuousTileEls.length; i++) {
        var streamIndex = firstIndex + i;
        var covered = streamIndexInCoveredRanges(streamIndex, coveredRanges);
        reel.continuousTileEls[i].classList.toggle("is-covered-by-giant", covered);
      }

      for (var c = 0; c < reel.cells.length; c++) {
        var cell = reel.cells[c];
        var cellCenter = Math.round(hooks.streamIndexAtCell(reel, cell, reel.position));
        cell.el.classList.toggle("is-covered-by-giant", streamIndexInCoveredRanges(cellCenter, coveredRanges));
      }
    }

    function setAllGiantTileCoverage(reel, covered) {
      for (var i = 0; i < reel.continuousTileEls.length; i++) {
        reel.continuousTileEls[i].classList.toggle("is-covered-by-giant", covered);
      }

      for (var c = 0; c < reel.cells.length; c++) {
        reel.cells[c].el.classList.toggle("is-covered-by-giant", covered);
      }
    }

    function cellSizePxFor(reel) {
      if (reel.cachedCellSizePx == null) {
        var rect = reel.cells[0].el.getBoundingClientRect();
        reel.cachedCellSizePx = reel.orientation === "vertical" ? rect.height : rect.width;
      }
      return reel.cachedCellSizePx;
    }

    function giantBlockOffsetPx(reel, offsetPercent) {
      return (offsetPercent / 100) * cellSizePxFor(reel);
    }

    // Mismo espejo cosmético de RESPIN que reel-renderer.js#effectiveScrollSign
    // (no exportado, se replica aqui): el bloque gigante BONUS es parte de la
    // misma tira visual que las celdas normales, asi que tiene que invertirse
    // exactamente igual o quedaria girando en sentido contrario al resto de
    // simbolos del mismo rodillo durante el respin.
    function effectiveScrollSign(reel) {
      if (reel.isRespin && reel.type !== "sternum") return -reel.scrollSign;
      return reel.scrollSign;
    }

    function renderGiantBlocks(reel) {
      var blocks = reel.lockedGiantBlock
        ? [reel.lockedGiantBlock]
        : hooks.activeGiantBlocksNear(reel).slice();
      var visible = [];
      var scrollSign = effectiveScrollSign(reel);

      for (var b = 0; b < blocks.length; b++) {
        var block = blocks[b];
        var offset = (block.refPosition - reel.position) * config.SYMBOL_STEP_PERCENT * scrollSign;
        if (Math.abs(offset) <= giantBlockVisibilityThreshold(block)) {
          visible.push({ block: block, offset: offset });
        }
      }

      var renderedGiantEntries = visible.slice(0, reel.giantPool.length);
      var weightPlayer = hooks.weightPlayer;
      var arrivalPhysics = hooks.arrivalPhysics;
      var respinStructureScale = hooks.getRespinStructureScale;
      var extraStructureReaction = hooks.getExtraStructureReaction;
      var now = (weightPlayer || arrivalPhysics) ? window.performance.now() : 0;

      for (var i = 0; i < reel.giantPool.length; i++) {
        var el = reel.giantPool[i];
        var entry = renderedGiantEntries[i];
        if (!entry) {
          if (!el.hidden) hideGiantElement(el);
          continue;
        }
        var blockRef = String(Math.round(entry.block.refPosition * 1000) / 1000);
        // Cada slot de giantPool es reciclable. Comparar solo el simbolo no
        // basta: dos esqueletos consecutivos pueden ser ambos POBRE/NOBLE/RICO
        // y ocupar el mismo slot sin que este llegue a ocultarse entre frames.
        // En ese caso el anterior podia ceder al nuevo sus clases visuales
        // (especialmente bonus-inner-cut-overlay-hidden, es decir, "sin
        // manos"). El refPosition identifica el bloque concreto dentro de la
        // tira; si cambia, se reconfigura el contenido aunque el simbolo sea
        // el mismo, restaurando siempre el arte completo del bloque entrante.
        if (
          el.hidden ||
          el.dataset.symbol !== entry.block.symbol ||
          el.dataset.blockRef !== blockRef
        ) {
          configureGiantElement(el, entry.block.symbol, reel);
        } else if (hooks.ensureSymbolVideoOverlay) {
          hooks.ensureSymbolVideoOverlay(el, entry.block.symbol, reel);
        }
        if (el.dataset) {
          el.dataset.blockRef = blockRef;
        }
        var offsetPx = giantBlockOffsetPx(reel, entry.offset);
        var tiltDeg = 0;

        // Aterrizaje del BONUS RIB: solo aplica al bloque que es realmente
        // el resultado final de este rodillo (mismo refPosition que
        // reel.targetPosition), nunca a un bloque "de paso" sin aterrizar.
        // La posicion durante la fase final de la deceleracion y el freeze
        // posterior son responsabilidad exclusiva de ArrivalPhysics (ver
        // src/render/bonus-arrival-physics.js); este modulo solo le pasa el
        // estado real del rodillo que ArrivalPhysics necesita para calcular
        // sin tocar reel.position.
        var isLandingBlock = Boolean(weightPlayer) && arrivalPhysics &&
          weightPlayer.isWeightedBlock(entry.block) &&
          reel.targetPosition != null &&
          Math.round(entry.block.refPosition) === Math.round(reel.targetPosition);

        if (isLandingBlock) {
          if (reel.phase === "decelerating" && reel.decelStartedAt != null && reel.decelDuration) {
            var decelEndAt = reel.decelStartedAt + reel.decelDuration;
            var remainingMs = decelEndAt - now;
            // BUGFIX ARRIVAL PHYSICS FINAL ALIGNMENT: el punto de llegada NO
            // puede ser reel.decelEndPosition. decelEndPosition es solo la
            // posicion MOMENTANEA del rodillo en el primerísimo frame de
            // settling (incluye STOP_OVERSHOOT_SYMBOLS, el muelle real de
            // overshoot/rebound de spin-engine.js). Esa posicion NO es la
            // referencia de la celda: es un punto de paso transitorio que el
            // propio reel.position sigue corrigiendo durante todo
            // settleSpringOffset() hasta relajarse exactamente a
            // reel.targetPosition al terminar el spin (offset final
            // garantizado 0 porque entry.block.refPosition === targetPosition
            // para el bloque de aterrizaje). Sincronizar ahi anclaba al BONUS
            // a un desplazamiento residual permanente (el overshoot
            // congelado para siempre) mientras el resto de la rejilla de
            // celdas SI relaja hasta alinearse en 0 — esa divergencia
            // constante es la desalineacion observada.
            // El sistema de referencia correcto es el mismo que usa el reel
            // para su posicion de reposo: reel.targetPosition (el mismo
            // valor que entry.block.refPosition). Usando exactamente esa
            // misma referencia, el offset resultante es 0 POR CONSTRUCCION
            // matematica (refPosition - targetPosition === 0 siempre que
            // isLandingBlock es true), sin necesidad de ningun offset
            // manual, constante de correccion ni hack visual.
            var endOffsetPercent = (entry.block.refPosition - reel.targetPosition) *
              config.SYMBOL_STEP_PERCENT * scrollSign;
            var endOffsetPx = giantBlockOffsetPx(reel, endOffsetPercent);
            var arrivalPx = arrivalPhysics.arrivalOffsetPx(reel, now, offsetPx, endOffsetPx, remainingMs);
            if (arrivalPx != null) offsetPx = arrivalPx;
          } else if (reel.phase === "settling" && !reel.bonusArrivalStructureTriggered) {
            // Punto de disparo real del impacto: spin-engine.js llama a sus
            // propias funciones internas beginReelDeceleration/beginReelSettle
            // (no a un hook), asi que nunca podriamos detectar el inicio de
            // "settling" desde fuera salvo aqui, en el unico render que SI
            // esta enganchado como hook real (hooks.renderGiantBlocks) y que
            // se ejecuta de forma fiable cada frame mientras dura el settle.
            reel.bonusArrivalStructureTriggered = true;
            arrivalPhysics.lockArrival(reel);
            weightPlayer.beginStructureImpact(now);
            if (hooks.onBonusLandingImpact) hooks.onBonusLandingImpact(reel);
          }
          if (reel.phase === "settling" || reel.bonusArrivalLocked) {
            // Congelado para siempre desde el primer frame de settling: sin
            // overshoot, sin correction, sin microsettle, sin rebound. El
            // muelle real del rodillo (settleSpringOffset) se sigue
            // calculando para reel.position pero el BONUS no vuelve a
            // leerlo nunca.
            offsetPx = arrivalPhysics.lockedOffsetPx(reel);
          }
        }

        var transformParts = [reel.orientation === "vertical"
          ? "translateY(" + offsetPx + "px)"
          : "translateX(" + offsetPx + "px)"];
        if (tiltDeg) transformParts.push("rotate(" + tiltDeg + "deg)");
        el.style.transform = transformParts.join(" ");
      }

      // El golpe ya no se reparte por strip/elemento ni se simula con un
      // shake: toda la energia visual se lee como una UNICA carga que cede
      // y se recupera, aplicada con el mismo valor exacto a TODOS los
      // elementos de machineBlockEls (rodillos + marco/arte de fondo), para
      // que nunca haya un desfase entre piezas (ver weightPlayer y el reloj
      // compartido structureImpactAt en bonus-landing-weight-player.js).
      if (weightPlayer || respinStructureScale || extraStructureReaction) {
        var structureReaction = weightPlayer
          ? (weightPlayer.structureReaction
            ? weightPlayer.structureReaction(now)
            : { offsetPx: weightPlayer.structureReactionOffsetPx(now), scale: 1, scaleY: 1 })
          : { offsetPx: 0, scale: 1, scaleY: 1 };
        var extraReaction = extraStructureReaction
          ? (extraStructureReaction(now) || { offsetPx: 0, scale: 1, scaleY: 1 })
          : { offsetPx: 0, scale: 1, scaleY: 1 };
        structureReaction = {
          offsetPx: (structureReaction.offsetPx || 0) + (extraReaction.offsetPx || 0),
          scale: (structureReaction.scale == null ? 1 : structureReaction.scale) * (extraReaction.scale == null ? 1 : extraReaction.scale),
          scaleY: (structureReaction.scaleY == null ? 1 : structureReaction.scaleY) * (extraReaction.scaleY == null ? 1 : extraReaction.scaleY)
        };
        var respinScale = respinStructureScale ? respinStructureScale(now) : 1;
        var structureTransform = "";
        var backgroundTransform = "";
        if (structureReaction.offsetPx || structureReaction.scale !== 1 || structureReaction.scaleY !== 1 || respinScale !== 1) {
          var structureParts = [];
          var backgroundParts = [];
          if (structureReaction.offsetPx) structureParts.push("translateY(" + structureReaction.offsetPx + "px)");
          if (structureReaction.offsetPx) backgroundParts.push("translateY(" + (structureReaction.offsetPx * backgroundTransformFactor) + "px)");
          if (respinScale !== 1) structureParts.push("scale(" + respinScale + ")");
          if (respinScale !== 1) backgroundParts.push("scale(" + dampTransformValue(respinScale, backgroundTransformFactor) + ")");
          if (structureReaction.scale !== 1) structureParts.push("scale(" + structureReaction.scale + ")");
          if (structureReaction.scale !== 1) backgroundParts.push("scale(" + dampTransformValue(structureReaction.scale, backgroundTransformFactor) + ")");
          if (structureReaction.scaleY !== 1) structureParts.push("scaleY(" + structureReaction.scaleY + ")");
          if (structureReaction.scaleY !== 1) backgroundParts.push("scaleY(" + dampTransformValue(structureReaction.scaleY, backgroundTransformFactor) + ")");
          structureTransform = structureParts.join(" ");
          backgroundTransform = backgroundParts.join(" ");
        }
        for (var m = 0; m < machineBlockEls.length; m++) {
          if (machineBlockEls[m].style.transformOrigin !== "center") {
            machineBlockEls[m].style.transformOrigin = "center";
          }
          if (machineBlockEls[m].style.transform !== structureTransform) {
            machineBlockEls[m].style.transform = structureTransform;
          }
        }
        for (var bge = 0; bge < backgroundBlockEls.length; bge++) {
          if (backgroundBlockEls[bge].style.transformOrigin !== "center") {
            backgroundBlockEls[bge].style.transformOrigin = "center";
          }
          if (backgroundBlockEls[bge].style.transform !== backgroundTransform) {
            backgroundBlockEls[bge].style.transform = backgroundTransform;
          }
        }
      }

      if (reel.laneEl) {
        reel.laneEl.classList.toggle("has-giant-symbol", Boolean(reel.giantActive));
      }

      if (reel.giantStripEl) {
        reel.giantStripEl.classList.toggle("has-visible-giant", renderedGiantEntries.length > 0);
      }

      var coveredRanges = renderedGiantEntries.map(function (entry) {
        return [
          Math.min(entry.block.refPosition, entry.block.refPosition + (entry.block.size - 1) * reel.cellStep),
          Math.max(entry.block.refPosition, entry.block.refPosition + (entry.block.size - 1) * reel.cellStep)
        ];
      });
      setGiantTileCoverage(reel, coveredRanges);
    }

    function clearGiantPool(reel) {
      if (reel.lockedGiantBlock) {
        hooks.syncGiantActive(reel);
        renderGiantBlocks(reel);
        return;
      }

      for (var i = 0; i < reel.giantPool.length; i++) {
        hideGiantElement(reel.giantPool[i]);
      }
      hooks.syncGiantActive(reel);
      if (reel.laneEl) {
        reel.laneEl.classList.remove("has-giant-symbol");
      }
      if (reel.giantStripEl) {
        reel.giantStripEl.classList.remove("has-visible-giant");
      }
      setAllGiantTileCoverage(reel, false);
    }

    return {
      createGiantStripTrack: createGiantStripTrack,
      configureGiantElement: configureGiantElement,
      hideGiantElement: hideGiantElement,
      streamIndexInCoveredRanges: streamIndexInCoveredRanges,
      giantBlockVisibilityThreshold: giantBlockVisibilityThreshold,
      setGiantTileCoverage: setGiantTileCoverage,
      setAllGiantTileCoverage: setAllGiantTileCoverage,
      cellSizePxFor: cellSizePxFor,
      giantBlockOffsetPx: giantBlockOffsetPx,
      renderGiantBlocks: renderGiantBlocks,
      clearGiantPool: clearGiantPool
    };
  }

  window.OssuaryGiantSymbolRenderer = {
    create: createGiantSymbolRenderer
  };
})();
