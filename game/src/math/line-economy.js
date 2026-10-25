(function (root) {
  "use strict";
  // Same 173 complete paths and their 97 prefixes. No DOM or reel animation.
  var columns = [
    [null,"rib2-1","rib3-2","rib4-1","rib5-1"],
    ["rib1-1","rib2-2","rib3-3","rib4-2","rib5-2"],
    ["rib1-2","sternum-1","sternum-2","sternum-3",null],
    ["rib1-3","rib2-3","rib3-4","rib4-3","rib5-3"],
    [null,"rib2-4","rib3-5","rib4-4","rib5-4"]
  ];
  var routes = [];
  function walk(col,row,path) {
    var id=columns[col][row];
    if (!id) return;
    var next=path.concat(id);
    if(next.length>=3) routes.push(next);
    if(col===4) return;
    for(var r=Math.max(0,row-1);r<=Math.min(4,row+1);r++) walk(col+1,r,next);
  }
  for(var r=0;r<5;r++) walk(0,r,[]);

  // Compile common path prefixes once. Prune a branch at its first mismatch.
  // This evaluates the exact same routes and suppresses the same paid prefixes.
  var tree = { children: [] };
  routes.forEach(function (path, routeIndex) {
    var parent = tree;
    path.forEach(function (id, depth) {
      var child = parent.children.find(function (n) { return n.id === id; });
      if (!child) {
        child = { id: id, path: path.slice(0, depth + 1), children: [] };
        parent.children.push(child);
      }
      parent = child;
    });
    parent.routeId = routeIndex + 1;
  });

  function create(options) {
    var table = {};
    options.symbols.forEach(function (s) { table[s.id] = s.payouts; });
    var normals = new Set(options.normalSymbols.filter(function (s) { return s !== 'CROWNED_SKULL'; }));
    var scale = options.scale == null ? 1 : options.scale;
    function resolve(board, bet, wilds) {
      wilds = wilds || {};
      var payouts = [];
      function visit(node, symbol, factor) {
        var s = wilds[node.id] ? 'WILD' : board[node.id];
        if (s === 'GOLDEN_CROW') s = 'VERTEBRA';
        if (s !== 'WILD') {
          if (!normals.has(s) || (symbol && symbol !== s)) return false;
          symbol = s;
        }
        factor *= wilds[node.id] || 1;
        var longer = false;
        for (var i = 0; i < node.children.length; i++) {
          if (visit(node.children[i], symbol, factor)) longer = true;
        }
        var length = node.path.length;
        var multiplier = symbol && table[symbol] && table[symbol][length];
        if (!longer && length >= 3 && multiplier) {
          payouts.push({ symbol: symbol, length: length, positions: node.path.slice(),
            multiplier: multiplier, amount: bet * multiplier * scale * factor,
            crowMultiplier: factor, routeId: node.routeId });
          return true;
        }
        return longer;
      }
      tree.children.forEach(function (node) { visit(node, null, 1); });
      payouts.sort(function (a, b) { return b.length - a.length; });
      return { bet: bet, total: payouts.reduce(function (sum, p) { return sum + p.amount; }, 0), payouts: payouts };
    }
    return { resolve: resolve };
  }

  var api={columns:columns,routes:routes,create:create};
  if(root) root.OssuaryLineEconomy=api;
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
})(typeof window!=="undefined"?window:null);
