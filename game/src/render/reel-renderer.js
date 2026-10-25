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

      // Solo FX: humo de los simbolos (ver syncTileSmoke). En marcha, se
      // apaga con un fundido (no de golpe: se notaba el corte); al pararse
      // (las fichas ya estan en su sitio: el render final va antes que el
      // cambio de fase), a las fichas que se ven.
      if (phase === "stopped" || phase === "idle") {
        syncTileSmoke(reel);
        syncTileShine(reel);
      } else {
        fadeOutTileSmoke(reel);
        fadeOutTileShine(reel);
      }
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

    // Humo de los simbolos (solo FX; estilos en style.css, .symbol-smoke).
    // No va en las fichas mientras su rodillo gira: este renderer las mueve
    // en cada fotograma y cualquier estilo extra que lleven se recalcula ~130
    // veces por fotograma (era lo que hacia ir el giro a tirones). Con el
    // rodillo parado, o en reposo al cargar, cada ficha visible con dibujo
    // lleva un <span class="symbol-smoke"> con dos capas, detras del dibujo.
    // Variante y fase salen de la posicion del simbolo en la tira y del
    // rodillo, asi que dos simbolos iguales casi nunca coinciden. No toca
    // simbolos, posiciones ni resultados.
    var FX_VARIANTS = 5;
    var FX_PHASES = 6;

    var fxVariantSeeds = {};

    function fxVariantSeed(reelId) {
      if (fxVariantSeeds[reelId] == null) {
        var id = String(reelId || "");
        var hash = 2166136261;
        for (var c = 0; c < id.length; c++) {
          hash = Math.imul(hash ^ id.charCodeAt(c), 16777619);
        }
        // Avalancha extra: ids casi iguales ("rib2-left" / "rib3-left") dan
        // semillas muy distintas.
        hash ^= hash >>> 15;
        hash = Math.imul(hash, 0x2c1b3c6d);
        hash ^= hash >>> 12;
        fxVariantSeeds[reelId] = hash | 0;
      }
      return fxVariantSeeds[reelId];
    }

    function fxVariantFor(reelId, streamIndex) {
      var h = (Math.imul(streamIndex | 0, 0x9e3779b1) + fxVariantSeed(reelId)) | 0;
      h ^= h >>> 16;
      h = Math.imul(h, 0x85ebca6b);
      h ^= h >>> 13;
      h = Math.imul(h, 0xc2b2ae35);
      h ^= h >>> 16;
      h >>>= 0;
      return {
        variant: String(h % FX_VARIANTS),
        phase: String(Math.floor(h / FX_VARIANTS) % FX_PHASES),
        hash: h
      };
    }

    // Numero 0-1 estable a partir del hash de la ficha y una "sal" (cada sal
    // da un valor distinto e independiente).
    function fxUnit(hash, salt) {
      var h = Math.imul((hash ^ Math.imul(salt, 0x27d4eb2f)) | 0, 0x85ebca6b);
      h ^= h >>> 15;
      h = Math.imul(h, 0xc2b2ae35);
      h ^= h >>> 13;
      return (h >>> 0) / 4294967296;
    }

    function tileSmokeEl(tile) {
      return tile.querySelector(":scope > .symbol-smoke");
    }

    var SMOKE_FADE_MS = 700;

    // Al arrancar el giro el humo no se quita de golpe: pasa a .is-leaving
    // (fundido en CSS, symbol-smoke-out, mismo tiempo) y se retira del DOM
    // al terminar. Si el rodillo para antes, syncTileSmoke lo descarta.
    function fadeOutTileSmoke(reel) {
      var tiles = reel.continuousTileEls || [];
      for (var i = 0; i < tiles.length; i++) {
        var smoke = tileSmokeEl(tiles[i]);
        if (!smoke || smoke.classList.contains("is-leaving")) continue;
        smoke.classList.add("is-leaving");
        window.setTimeout(removeIfLeaving.bind(null, smoke), SMOKE_FADE_MS + 100);
      }
    }

    function removeIfLeaving(smoke) {
      if (smoke.classList.contains("is-leaving")) smoke.remove();
    }

    // Luz interior de algunos simbolos (solo FX, peticion del usuario,
    // 2026-10-18; capas de tools/bake-symbol-fx.js, estilos en style.css,
    // .symbol-shine): energia en las grietas del WILD, la gema del corazon
    // que late, reflejo y destellos en las monedas. Encima del dibujo y sin
    // moverlo. Mismo trato que el humo: solo en las fichas que se ven de un
    // rodillo parado; al arrancar el giro se funde y se quita.
    var SHINE_LAYERS = {
      WILD: ["glow", "veins"],
      DARK_HEART: ["glow"],
      ANCIENT_GOLD_COIN: ["sheen", "glint", "glint"],
      SILVER_COIN: ["sheen", "glint", "glint"]
    };
    var SHINE_FADE_MS = 260;

    function tileShineEl(tile) {
      return tile.querySelector(":scope > .symbol-shine");
    }

    function fadeOutTileShine(reel) {
      var tiles = reel.continuousTileEls || [];
      for (var i = 0; i < tiles.length; i++) {
        var shine = tileShineEl(tiles[i]);
        if (!shine || shine.classList.contains("is-leaving")) continue;
        shine.classList.add("is-leaving");
        window.setTimeout(removeIfLeaving.bind(null, shine), SHINE_FADE_MS + 60);
      }
    }

    function syncTileShine(reel) {
      var geo = reel.fxRenderGeometry;
      var tiles = reel.continuousTileEls;
      if (!geo || !tiles) return;
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var streamIndex = geo.firstIndex + i;
        var k = (streamIndex - geo.center) * geo.scrollSign;
        var visible = k > -0.6 && k < reel.cells.length - 0.4;
        var shine = tileShineEl(tile);
        if (shine && shine.classList.contains("is-leaving")) {
          shine.remove();
          shine = null;
        }
        var symbol = tile.dataset.symbol || "";
        var layers = visible && tile.classList.contains("has-symbol-art") ? SHINE_LAYERS[symbol] : null;
        if (!layers) {
          if (shine) shine.remove();
          continue;
        }
        var stream = String(streamIndex);
        if (shine && shine.dataset.symbol === symbol && shine.dataset.stream === stream) continue;
        if (shine) shine.remove();
        shine = document.createElement("span");
        shine.className = "symbol-shine";
        shine.setAttribute("aria-hidden", "true");
        for (var l = 0; l < layers.length; l++) {
          var layer = shine.appendChild(document.createElement("i"));
          layer.className = "symbol-shine__" + layers[l] +
            (layers[l] === "glint" ? " symbol-shine__glint--" + l : "");
          // Lo que corre por dentro de la mascara (energia, reflejo).
          if (layers[l] === "veins" || layers[l] === "sheen") layer.appendChild(document.createElement("b"));
        }
        // Cada ficha a su ritmo y con su desfase, como el humo.
        var fx = fxVariantFor(tile.dataset.reel || reel.id, streamIndex);
        shine.dataset.symbol = symbol;
        shine.dataset.stream = stream;
        shine.style.setProperty("--shine-delay", (-fxUnit(fx.hash, 5) * 12).toFixed(2) + "s");
        shine.style.setProperty("--shine-rate", (0.85 + fxUnit(fx.hash, 6) * 0.3).toFixed(3));
        tile.appendChild(shine);
      }
    }

    // La ficha i se pinta en la primera casilla mas (streamIndex - center)
    // pasos en el sentido de giro: las que se ven son las de k = 0 .. n - 1.
    // Se deja una casilla de margen a cada lado para el humo que asoma.
    function syncTileSmoke(reel) {
      var geo = reel.fxRenderGeometry;
      var tiles = reel.continuousTileEls;
      if (!geo || !tiles) return;
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        var streamIndex = geo.firstIndex + i;
        var k = (streamIndex - geo.center) * geo.scrollSign;
        var visible = k >= -1.2 && k <= reel.cells.length + 0.2;
        var smoke = tileSmokeEl(tile);
        if (smoke && smoke.classList.contains("is-leaving")) {
          smoke.remove();
          smoke = null;
        }
        if (!visible || !tile.classList.contains("has-symbol-art")) {
          if (smoke) smoke.remove();
          continue;
        }
        var symbol = tile.dataset.symbol || "";
        var stream = String(streamIndex);
        if (smoke && smoke.dataset.symbol === symbol && smoke.dataset.stream === stream) continue;
        var reelId = tile.dataset.reel || reel.id;
        var fx = fxVariantFor(reelId, streamIndex);
        if (!smoke) {
          smoke = document.createElement("span");
          smoke.className = "symbol-smoke";
          smoke.setAttribute("aria-hidden", "true");
          smoke.appendChild(document.createElement("i")).className = "symbol-smoke__a";
          smoke.appendChild(document.createElement("i")).className = "symbol-smoke__b";
          tile.appendChild(smoke);
        }
        smoke.dataset.symbol = symbol;
        smoke.dataset.reel = reelId;
        smoke.dataset.stream = stream;
        smoke.dataset.fxVariant = fx.variant;
        smoke.dataset.fxPhase = fx.phase;
        // Personalidad propia: ritmo y desfase distintos en cada capa de cada
        // ficha, para que no vayan todas a la par (sale de la misma semilla).
        smoke.style.setProperty("--smoke-sa", (0.6 + fxUnit(fx.hash, 1)).toFixed(3));
        smoke.style.setProperty("--smoke-sb", (0.6 + fxUnit(fx.hash, 2)).toFixed(3));
        smoke.style.setProperty("--smoke-ja", (-fxUnit(fx.hash, 3) * 14).toFixed(2) + "s");
        smoke.style.setProperty("--smoke-jb", (-fxUnit(fx.hash, 4) * 14).toFixed(2) + "s");
      }
    }

    // Desenfoque de movimiento (solo FX): con el rodillo rapido, las fichas
    // pintan el arte borroso horneado (tools/bake-symbol-blur.js,
    // OSSUARY_SYMBOL_BLUR_ASSETS) y al frenar vuelven al nitido, antes de
    // parar. Solo se cambia el src de la imagen, y solo cuando cambia el
    // estado o la ficha recicla simbolo: nada de filtros ni estilos por
    // fotograma. Lee reel.velocity (simbolos/s; crucero ~21.8), no la toca.
    var MOTION_BLUR_ON_SPEED = 8;
    var MOTION_BLUR_OFF_SPEED = 6;
    var blurAssets = window.OSSUARY_SYMBOL_BLUR_ASSETS || {};

    function wantsMotionBlur(reel) {
      if (reel.phase === "stopped" || reel.phase === "idle" || reel.phase === "settling") return false;
      var speed = Math.abs(reel.velocity || 0);
      return reel.motionBlurOn ? speed > MOTION_BLUR_OFF_SPEED : speed > MOTION_BLUR_ON_SPEED;
    }

    function residentUrl(url) {
      var sr = window.OssuarySymbolRenderer;
      return sr && sr.residentArtUrl ? sr.residentArtUrl(url) : url;
    }

    function syncTileMotionBlur(tile, on, orientation) {
      var img = tile.firstElementChild;
      if (!img || img.tagName !== "IMG" || !img.classList.contains("symbol-art")) return;
      if (Boolean(img.__motionBlur) === on) return;
      var sharp = tile.dataset.asset || "";
      var map = blurAssets[orientation === "vertical" ? "vertical" : "horizontal"] || {};
      var blurred = map[sharp];
      if (on && !blurred) return;
      img.__motionBlur = on;
      img.src = residentUrl(on ? blurred : sharp);
    }

    function renderContinuousReelTrack(reel) {
      var effectivePosition = settlePositionFor(reel);
      var center = hooks.streamIndexAtCell(reel, reel.continuousReferenceCell, effectivePosition);
      var firstIndex = stableStreamBaseIndex(reel, center) - reel.continuousTileRadius;
      var scrollSign = effectiveScrollSign(reel);
      var geo = reel.fxRenderGeometry || (reel.fxRenderGeometry = {});
      geo.firstIndex = firstIndex;
      geo.center = center;
      geo.scrollSign = scrollSign;
      var motionBlur = wantsMotionBlur(reel);
      reel.motionBlurOn = motionBlur;

      for (var i = 0; i < reel.continuousTileEls.length; i++) {
        var streamIndex = firstIndex + i;
        var tile = reel.continuousTileEls[i];
        var symbol = hooks.getSymbolAt(reel, streamIndex);
        var offset = (streamIndex - center) * config.SYMBOL_STEP_PERCENT * scrollSign;

        hooks.setTileSymbol(tile, symbol, reel);
        syncTileMotionBlur(tile, motionBlur, reel.orientation);
        tile.style.transform = reel.orientation === "vertical"
          ? "translate(-50%, -50%) translateY(" + offset + "%)"
          : "translate(-50%, -50%) translateX(" + offset + "%)";
      }

      // En reposo (al cargar o con el rodillo parado) el humo sigue a las
      // fichas visibles, por si una ha cambiado de simbolo (p.ej. un corte).
      if (reel.phase === "stopped" || reel.phase === "idle") {
        syncTileSmoke(reel);
        syncTileShine(reel);
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
