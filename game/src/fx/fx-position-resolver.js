(function () {
  "use strict";

  function getLayoutConfig() {
    return window.OSSUARY_LAYOUT_CONFIG || null;
  }

  function boundingBoxCenter(cells) {
    if (!cells || cells.length === 0) {
      return null;
    }
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    cells.forEach(function (cell) {
      minX = Math.min(minX, cell.x);
      minY = Math.min(minY, cell.y);
      maxX = Math.max(maxX, cell.x + cell.w);
      maxY = Math.max(maxY, cell.y + cell.h);
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  }

  function toPercent(point) {
    var layout = getLayoutConfig();
    var ref = layout && layout.IMAGE_REFERENCE;
    if (!ref || !ref.width || !ref.height || !point) {
      return null;
    }
    return {
      xPercent: (point.x / ref.width) * 100,
      yPercent: (point.y / ref.height) * 100
    };
  }

  function findRibLayoutEntry(anchorId) {
    var layout = getLayoutConfig();
    var ribs = layout && layout.RIB_LAYOUT;
    if (!ribs) {
      return null;
    }
    return ribs.find(function (rib) {
      return rib.id === anchorId;
    }) || null;
  }

  function findSternumLayoutEntry(anchorId) {
    var layout = getLayoutConfig();
    var sternum = layout && layout.STERNUM_LAYOUT;
    if (!sternum || sternum.id !== anchorId) {
      return null;
    }
    return sternum;
  }

  // Resuelve un anchor declarativo a un punto en porcentaje (0-100)
  // relativo a #slotStage. Los anchors decorativos vienen de
  // window.OSSUARY_FX_ANCHORS. Los anchors de reels (rib1, rib2-left,
  // sternum, ...) se derivan leyendo (solo lectura) la geometria real de
  // window.OSSUARY_LAYOUT_CONFIG, nunca duplicada aqui.
  function resolveAnchor(anchorId) {
    var manual = window.OSSUARY_FX_ANCHORS && window.OSSUARY_FX_ANCHORS[anchorId];
    if (manual) {
      return { xPercent: manual.x, yPercent: manual.y };
    }

    var ribEntry = findRibLayoutEntry(anchorId);
    if (ribEntry) {
      var ribPercent = toPercent(boundingBoxCenter(ribEntry.cells));
      if (ribPercent) {
        return ribPercent;
      }
    }

    var sternumEntry = findSternumLayoutEntry(anchorId);
    if (sternumEntry) {
      var sternumPercent = toPercent(boundingBoxCenter(sternumEntry.cells));
      if (sternumPercent) {
        return sternumPercent;
      }
    }

    console.warn("[OssuaryFX] Unknown anchor '" + anchorId + "'. Defaulting to stage center.");
    return { xPercent: 50, yPercent: 50 };
  }

  // Convierte un anchor ya resuelto (en %, base de cualquier origen:
  // manual o derivado) de vuelta al espacio de referencia 1525x779. Esto
  // es necesario porque % de ancho y % de alto del stage NO son
  // intercambiables (el stage no es cuadrado): para calcular angulo y
  // distancia reales hay que trabajar en una unidad isotropa (el propio
  // espacio de referencia), no directamente en %.
  function resolveAnchorAsReferencePoint(anchorId) {
    var percent = resolveAnchor(anchorId);
    var layout = getLayoutConfig();
    var ref = layout && layout.IMAGE_REFERENCE;
    if (!ref || !ref.width || !ref.height) {
      return null;
    }
    return {
      x: (percent.xPercent / 100) * ref.width,
      y: (percent.yPercent / 100) * ref.height
    };
  }

  // Calcula el trayecto entre dos anchors: punto medio, longitud y
  // angulo, listos para posicionar/rotar un elemento que conecte ambos
  // puntos. Reutiliza resolveAnchor (no duplica la logica de busqueda de
  // anchors); el calculo de angulo/distancia se hace en espacio de
  // referencia (isotropo) y solo se convierte a % al final, para evitar
  // la distorsion del aspect ratio del stage.
  function resolvePath(sourceAnchorId, targetAnchorId) {
    var layout = getLayoutConfig();
    var ref = layout && layout.IMAGE_REFERENCE;
    var sourcePoint = resolveAnchorAsReferencePoint(sourceAnchorId);
    var targetPoint = resolveAnchorAsReferencePoint(targetAnchorId);

    if (!ref || !sourcePoint || !targetPoint) {
      console.warn("[OssuaryFX] resolvePath: cannot resolve reference space for '" + sourceAnchorId + "' -> '" + targetAnchorId + "'.");
      var fallbackSource = resolveAnchor(sourceAnchorId);
      var fallbackTarget = resolveAnchor(targetAnchorId);
      return {
        xPercent: (fallbackSource.xPercent + fallbackTarget.xPercent) / 2,
        yPercent: (fallbackSource.yPercent + fallbackTarget.yPercent) / 2,
        lengthPercent: 0,
        angleDeg: 0
      };
    }

    var dx = targetPoint.x - sourcePoint.x;
    var dy = targetPoint.y - sourcePoint.y;
    var lengthPx = Math.sqrt(dx * dx + dy * dy);
    var angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    var midPointPx = {
      x: (sourcePoint.x + targetPoint.x) / 2,
      y: (sourcePoint.y + targetPoint.y) / 2
    };

    return {
      xPercent: (midPointPx.x / ref.width) * 100,
      yPercent: (midPointPx.y / ref.height) * 100,
      // lengthPercent se expresa en % del ANCHO del stage a proposito:
      // es la misma base que usara "width" en CSS para el elemento del
      // trayecto, asi que al aplicarlo como width:lengthPercent% el
      // resultado renderizado mide exactamente lengthPx de referencia,
      // sin importar el tamano real de la ventana.
      lengthPercent: (lengthPx / ref.width) * 100,
      angleDeg: angleDeg
    };
  }

  window.OssuaryFXPositionResolver = {
    resolveAnchor: resolveAnchor,
    resolvePath: resolvePath
  };
})();
