(function () {
  "use strict";

  function createCombinationPathRegistry(options) {
    var state = options.state;
    var config = options.config || {};
    var hooks = options.hooks || {};

    var MIN_PATH_LENGTH = config.MIN_PATH_LENGTH || 3;
    var MAX_PATH_LENGTH = config.MAX_PATH_LENGTH || 7;
    var COLUMN_CLUSTER_GAP = config.COLUMN_CLUSTER_GAP != null ? config.COLUMN_CLUSTER_GAP : null;
    var COLUMN_WIDTH_FACTOR = config.COLUMN_WIDTH_FACTOR != null ? config.COLUMN_WIDTH_FACTOR : 0.8;
    var START_POLICY = config.START_POLICY || "all_cells_in_leftmost_column";
    var ALLOWED_ROW_DELTAS = Array.isArray(config.ALLOWED_ROW_DELTAS) && config.ALLOWED_ROW_DELTAS.length
      ? new Set(config.ALLOWED_ROW_DELTAS)
      : new Set([-1, 0, 1]);
    var cachedBoard = null;
    var cachedRoutes = null;

    function cellCenterX(cell) {
      return cell.x + cell.w / 2;
    }

    function cellCenterY(cell) {
      return cell.y + cell.h / 2;
    }

    function sortByGeometry(a, b) {
      return cellCenterX(a) - cellCenterX(b) || cellCenterY(a) - cellCenterY(b);
    }

    function effectiveColumnGap(cells) {
      if (COLUMN_CLUSTER_GAP != null) return COLUMN_CLUSTER_GAP;
      var minWidth = Math.min.apply(null, cells.map(function (cell) { return cell.w; }));
      return minWidth * COLUMN_WIDTH_FACTOR;
    }

    function isPlayableCell(cell, reel) {
      if (!cell) return false;
      if (hooks.isCellPlayable) return hooks.isCellPlayable(cell, reel);
      return true;
    }

    function buildBoard() {
      if (cachedBoard) return cachedBoard;

      var playableCells = [];
      state.reels.forEach(function (reel) {
        reel.cells.forEach(function (cell) {
          if (!isPlayableCell(cell, reel)) return;
          playableCells.push({
            id: cell.id,
            reelId: reel.id,
            reelIndex: reel.index,
            reelType: reel.type,
            x: cell.x,
            y: cell.y,
            w: cell.w,
            h: cell.h,
            effective: cell.effective,
            initial: cell.initial,
            reelCellIndex: cell.reelCellIndex
          });
        });
      });

      playableCells.sort(sortByGeometry);
      var columnGap = effectiveColumnGap(playableCells);
      var columns = [];

      playableCells.forEach(function (cell) {
        var centerX = cellCenterX(cell);
        var lastColumn = columns[columns.length - 1];
        if (!lastColumn || Math.abs(centerX - lastColumn.anchorX) > columnGap) {
          columns.push({
            index: columns.length,
            anchorX: centerX,
            cells: [cell]
          });
          return;
        }

        lastColumn.cells.push(cell);
        lastColumn.anchorX = (lastColumn.anchorX * (lastColumn.cells.length - 1) + centerX) / lastColumn.cells.length;
      });

      columns.forEach(function (column) {
        column.cells.sort(function (a, b) {
          return cellCenterY(a) - cellCenterY(b) || cellCenterX(a) - cellCenterX(b);
        });
        column.cells.forEach(function (cell, rowIndex) {
          cell.columnIndex = column.index;
          cell.rowIndex = rowIndex;
        });
      });

      cachedBoard = {
        playableCells: playableCells,
        columns: columns
      };
      return cachedBoard;
    }

    function routeKey(route) {
      return route.map(function (cell) { return cell.id; }).join("|");
    }

    function startCellsFor(board) {
      var startColumn = board.columns[0];
      if (!startColumn) return [];
      if (START_POLICY === "all_cells_in_leftmost_column") {
        return startColumn.cells.slice();
      }
      return startColumn.cells.slice();
    }

    function nextCells(cell, board, usedReels) {
      var nextColumn = board.columns[cell.columnIndex + 1];
      if (!nextColumn) return [];

      var nearestRowIndex = 0;
      var nearestDistance = Infinity;
      nextColumn.cells.forEach(function (candidate, index) {
        var distance = Math.abs(cellCenterY(candidate) - cellCenterY(cell));
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestRowIndex = index;
        }
      });

      return nextColumn.cells.filter(function (candidate, index) {
        if (usedReels && usedReels[candidate.reelId]) return false;
        if (candidate.reelId === cell.reelId) return false;
        var rowDelta = index - nearestRowIndex;
        if (!ALLOWED_ROW_DELTAS.has(rowDelta)) return false;
        if (hooks.canTraverseStep && !hooks.canTraverseStep(cell, candidate, rowDelta)) return false;
        return true;
      });
    }

    function isValidRoute(route) {
      if (route.length < MIN_PATH_LENGTH) return false;
      if (route.length > MAX_PATH_LENGTH) return false;
      var sternumIndex = route.findIndex(function (cell) { return cell.reelId === "sternum"; });
      if (sternumIndex === 0 || sternumIndex === route.length - 1) return false;
      if (new Set(route.map(function (cell) { return cell.reelId; })).size !== route.length) return false;
      if (hooks.isRouteValid && !hooks.isRouteValid(route)) return false;
      return true;
    }

    function generateRoutes() {
      if (cachedRoutes) return cachedRoutes.slice();

      var board = buildBoard();
      var routes = [];
      var unique = {};

      function save(route) {
        if (!isValidRoute(route)) return;
        var key = routeKey(route);
        if (unique[key]) return;
        unique[key] = true;
        routes.push(route.slice());
      }

      function walk(route, usedReels) {
        var current = route[route.length - 1];
        save(route);
        if (route.length >= MAX_PATH_LENGTH) return;

        nextCells(current, board, usedReels).forEach(function (candidate) {
          usedReels[candidate.reelId] = true;
          route.push(candidate);
          walk(route, usedReels);
          route.pop();
          delete usedReels[candidate.reelId];
        });
      }

      startCellsFor(board).forEach(function (cell) {
        var usedReels = {};
        usedReels[cell.reelId] = true;
        walk([cell], usedReels);
      });

      cachedRoutes = routes.slice().sort(function (a, b) {
        if (a.length !== b.length) return b.length - a.length;
        return routeKey(a).localeCompare(routeKey(b));
      });
      return cachedRoutes.slice();
    }

    function inspectBoard() {
      var board = buildBoard();
      return {
        columnCount: board.columns.length,
        playableCellCount: board.playableCells.length,
        startPolicy: START_POLICY,
        startCellIds: startCellsFor(board).map(function (cell) { return cell.id; }),
        columns: board.columns.map(function (column) {
          return {
            index: column.index,
            anchorX: column.anchorX,
            cellIds: column.cells.map(function (cell) { return cell.id; })
          };
        })
      };
    }

    function describeRoutes() {
      return generateRoutes().map(function (route, index) {
        return {
          id: index + 1,
          length: route.length,
          reels: route.map(function (cell) { return cell.reelId; }),
          cells: route.map(function (cell) { return cell.id; })
        };
      });
    }

    function invalidate() {
      cachedBoard = null;
      cachedRoutes = null;
    }

    return {
      invalidate: invalidate,
      buildBoard: buildBoard,
      generateRoutes: generateRoutes,
      inspectBoard: inspectBoard,
      describeRoutes: describeRoutes,
      routeKey: routeKey
    };
  }

  window.OssuaryMathCombinationPaths = {
    create: createCombinationPathRegistry
  };
})();
