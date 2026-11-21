(function () {
  "use strict";

  // Pantalla de reglas y tabla de pagos (en ingles, como el HUD). Solo
  // presentacion: lee los datos de los configs en el momento de abrirse, asi
  // que si cambia la paytable, los premios de los esqueletos o los precios de
  // compra, la pantalla ya sale con los valores nuevos:
  //   - pagos de linea: OSSUARY_DEV_PAYTABLE_CONFIG (multiplos de la apuesta);
  //   - arte: OSSUARY_SYMBOL_ASSETS / OSSUARY_REEL_SYMBOL_* (symbol-assets.js);
  //   - premios del Execution Bonus: OSSUARY_SYMBOL_CONFIG;
  //   - precios de compra: los que muestra el propio desplegable BUY BONUS.
  // Lo que no esta en config (forma del tablero, niveles de la caja de manos,
  // reglas del cofre) va copiado aqui con la referencia al codigo que manda.
  //
  // API: window.OssuaryRulesScreen.open() / close() / isOpen().

  var root = null;
  var bodyEl = null;
  var lastFocus = null;
  var dynamicNodes = [];

  // Nombres para el jugador (el id interno no cambia: CROWNED_SKULL es la
  // cuchilla pequena y VERTEBRA el cuervo desde sus reskins).
  var SYMBOL_NAMES = {
    WILD: "Wild",
    ANCESTRAL_SKULL: "Ancestral Skull",
    CROWNED_SKULL: "Blade",
    DARK_HEART: "Heart",
    ANCIENT_GOLD_COIN: "Gold Coin",
    SILVER_COIN: "Silver Coin",
    VERTEBRA: "Crow",
    FEMUR: "Bones"
  };

  // Las lineas tienen como mucho 5 simbolos (5 columnas): la paytable de
  // desarrollo trae tambien 6 y 7, que no pueden salir.
  var PAY_LENGTHS = [5, 4, 3];

  // Copia de presentacion de game.js#OSSUARY_BOARD_COLUMNS (columna x fila;
  // null = no hay casilla). Solo para dibujar el esquema de lineas.
  var BOARD_COLUMNS = [
    [null, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, null],
    [1, 1, 1, 1, 1],
    [null, 1, 1, 1, 1]
  ];
  // Tres lineas de ejemplo validas en ese tablero (fila por columna), sin
  // tramos compartidos para que se lean las tres.
  var EXAMPLE_PATHS = [
    [2, 2, 2, 2, 2],
    [4, 3, 2, 1, 1],
    [1, 0, 0, 0, 1]
  ];

  // game.js#BONUS_HAND_BOX_LEVELS (manos para completar cada nivel y el
  // multiplicador que se pega a la guillotina al completarlo).
  var HAND_BOX_LEVELS = window.OSSUARY_ECONOMY_CONFIG ? window.OSSUARY_ECONOMY_CONFIG.handLevels.map(function (level) {
    return { target: level[0], multiplier: level[1] };
  }) : [
    { target: 5, multiplier: 2 },
    { target: 10, multiplier: 5 },
    { target: 20, multiplier: 10 },
    { target: 25, multiplier: 25 },
    { target: 50, multiplier: 100 }
  ];

  var SKELETONS = [
    { id: "POBRE", name: "Poor" },
    { id: "NOBLE", name: "Noble" },
    { id: "RICO", name: "Rich" }
  ];

  var SECTIONS = [
    { id: "paytable", label: "PAYTABLE" },
    { id: "paths", label: "PATHS" },
    { id: "blades", label: "BLADES & CROWS" },
    { id: "chest", label: "CHEST" },
    { id: "bonus", label: "EXECUTION BONUS" },
    { id: "super", label: "SUPER BONUS" },
    { id: "buy", label: "BUY BONUS" },
    { id: "controls", label: "CONTROLS" }
  ];

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function img(src, alt, className) {
    var node = document.createElement("img");
    node.className = className || "rules-screen__img";
    node.src = src;
    node.alt = alt || "";
    node.decoding = "async";
    node.loading = "lazy";
    node.draggable = false;
    return node;
  }

  function parseMoney(text) {
    var n = Number(String(text || "").replace(/[^0-9.]/g, ""));
    return isFinite(n) ? n : 0;
  }

  function currentBet() {
    var readout = document.getElementById("betReadout");
    var bet = readout ? parseMoney(readout.textContent) : 0;
    return bet > 0 ? bet : 1;
  }

  function formatMoney(amount) {
    var value = Math.round((Number(amount) || 0) * 100) / 100;
    return "€" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatMultiple(value) {
    return (Number(value) || 0).toLocaleString("en-US", {useGrouping:false,maximumFractionDigits:5}) + "×";
  }

  // Nodo cuyo texto depende de la apuesta: se rellena en cada open().
  function betAmount(multiple) {
    var node = el("span", "rules-screen__money");
    node.dataset.multiple = String(multiple);
    dynamicNodes.push(node);
    return node;
  }

  function buyPriceMultiple(optionId) {
    var priceEl = document.querySelector('[data-buy-bonus-price="' + optionId + '"]');
    if (!priceEl) return null;
    var price = parseMoney(priceEl.textContent);
    var bet = currentBet();
    return price > 0 && bet > 0 ? Math.round(price / bet) : null;
  }

  function paragraph(parent, text) {
    var p = el("p", "rules-screen__text", text);
    parent.appendChild(p);
    return p;
  }

  function list(parent, items) {
    var ul = el("ul", "rules-screen__list");
    items.forEach(function (item) {
      var li = el("li");
      if (typeof item === "string") li.textContent = item;
      else item.forEach(function (part) { li.appendChild(typeof part === "string" ? document.createTextNode(part) : part); });
      ul.appendChild(li);
    });
    parent.appendChild(ul);
    return ul;
  }

  function section(id, title) {
    var sec = el("section", "rules-screen__section");
    sec.id = "rules-" + id;
    sec.appendChild(el("h3", "rules-screen__heading", title));
    bodyEl.appendChild(sec);
    return sec;
  }

  function symbolAsset(symbolId) {
    var assets = window.OSSUARY_SYMBOL_ASSETS || {};
    return assets[symbolId] || null;
  }

  function paytableSymbols() {
    var config = window.OSSUARY_DEV_PAYTABLE_CONFIG || { symbols: [] };
    var normal = (window.OSSUARY_SYMBOL_CONFIG && window.OSSUARY_SYMBOL_CONFIG.NORMAL_SYMBOLS) || [];
    return (config.symbols || []).filter(function (entry) {
      return entry.id === "WILD" || (entry.category === "NORMAL" && normal.indexOf(entry.id) !== -1);
    }).sort(function (a, b) {
      if (a.id === "WILD") return -1;
      if (b.id === "WILD") return 1;
      return (b.payouts[5] || 0) - (a.payouts[5] || 0) || (b.payouts[3] || 0) - (a.payouts[3] || 0);
    });
  }

  function buildPaytable() {
    var sec = section("paytable", "Paytable");
    var intro = paragraph(sec, "");
    intro.appendChild(document.createTextNode("Line wins are multiples of your total bet. Amounts shown for your current bet of "));
    var betNode = el("strong", "rules-screen__money");
    betNode.dataset.bet = "1";
    dynamicNodes.push(betNode);
    intro.appendChild(betNode);
    intro.appendChild(document.createTextNode("."));

    var grid = el("div", "rules-screen__paygrid");
    paytableSymbols().forEach(function (entry) {
      var card = el("figure", "rules-symbol" + (entry.id === "WILD" ? " rules-symbol--wild" : ""));
      var src = symbolAsset(entry.id);
      var art = el("div", "rules-symbol__art");
      if (src) art.appendChild(img(src, SYMBOL_NAMES[entry.id] || entry.name));
      card.appendChild(art);
      var caption = el("figcaption", "rules-symbol__name", SYMBOL_NAMES[entry.id] || entry.name);
      card.appendChild(caption);
      var pays = el("dl", "rules-symbol__pays");
      PAY_LENGTHS.forEach(function (length) {
        var value = entry.payouts[length];
        if (typeof value !== "number" || value <= 0) return;
        pays.appendChild(el("dt", null, String(length)));
        var dd = el("dd");
        dd.appendChild(betAmount(value));
        dd.appendChild(el("small", "rules-screen__multiple", formatMultiple(value)));
        pays.appendChild(dd);
      });
      card.appendChild(pays);
      if (entry.id === "WILD") card.appendChild(el("p", "rules-symbol__note", "Substitutes for every paying symbol."));
      if (entry.id === "VERTEBRA") card.appendChild(el("p", "rules-symbol__note", "Cut it to call a crow."));
      grid.appendChild(card);
    });
    sec.appendChild(grid);
  }

  function buildPathsDiagram() {
    var NS = "http://www.w3.org/2000/svg";
    var cellW = 46, cellH = 34, gap = 8, pad = 10;
    var width = pad * 2 + BOARD_COLUMNS.length * cellW + (BOARD_COLUMNS.length - 1) * gap;
    var height = pad * 2 + 5 * cellH + 4 * gap;
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.setAttribute("class", "rules-screen__diagram");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Board with three example paths");
    function center(col, row) {
      return {
        x: pad + col * (cellW + gap) + cellW / 2,
        y: pad + row * (cellH + gap) + cellH / 2
      };
    }
    BOARD_COLUMNS.forEach(function (column, col) {
      column.forEach(function (exists, row) {
        if (!exists) return;
        var rect = document.createElementNS(NS, "rect");
        rect.setAttribute("x", pad + col * (cellW + gap));
        rect.setAttribute("y", pad + row * (cellH + gap));
        rect.setAttribute("width", cellW);
        rect.setAttribute("height", cellH);
        rect.setAttribute("rx", 5);
        rect.setAttribute("class", "rules-diagram__cell" + (col === 0 ? " rules-diagram__cell--start" : "") + (col === 2 && row > 0 ? " rules-diagram__cell--sternum" : ""));
        svg.appendChild(rect);
      });
    });
    EXAMPLE_PATHS.forEach(function (rows, index) {
      var points = rows.map(function (row, col) {
        var c = center(col, row);
        return c.x + "," + c.y;
      }).join(" ");
      var line = document.createElementNS(NS, "polyline");
      line.setAttribute("points", points);
      line.setAttribute("class", "rules-diagram__path rules-diagram__path--" + (index + 1));
      svg.appendChild(line);
    });
    return svg;
  }

  function buildPaths() {
    var sec = section("paths", "Paths");
    var routes = window.OssuaryPaylineOverlayDebug && window.OssuaryPaylineOverlayDebug.routes
      ? window.OssuaryPaylineOverlayDebug.routes() : null;
    var fullPaths = Array.isArray(routes) ? routes.filter(function (r) { return r.length === 5; }).length : 0;
    paragraph(sec, (fullPaths ? "Wins pay left to right along " + fullPaths + " paths." : "Wins pay left to right along paths.") +
      " Every path starts in the leftmost column and crosses the board one column at a time: straight across, or one row up or down. The top reel, the side ribs and the central reel all take part.");
    var figure = el("div", "rules-screen__figure");
    figure.appendChild(buildPathsDiagram());
    figure.appendChild(el("p", "rules-screen__caption", "Three of the paths. Highlighted cells: where every path starts."));
    sec.appendChild(figure);
    list(sec, [
      "3, 4 or 5 matching symbols in a row from the first column win. Wilds count as any paying symbol.",
      "When a win continues on a longer path, only the longest win is paid. Paths that split apart pay separately.",
      "All wins on all paths are added together."
    ]);
  }

  function buildBlades() {
    var sec = section("blades", "Blades & Crows");
    var row = el("div", "rules-screen__row");
    var blade = symbolAsset("CROWNED_SKULL");
    var crow = symbolAsset("VERTEBRA");
    if (blade) row.appendChild(img(blade, "Blade", "rules-screen__icon"));
    if (crow) row.appendChild(img(crow, "Crow", "rules-screen__icon"));
    var goldenCrow = symbolAsset("GOLDEN_CROW");
    if (goldenCrow) row.appendChild(img(goldenCrow, "Golden crow", "rules-screen__icon"));
    row.appendChild(img("assets/symbols/bird-dead.png", "Dead crow", "rules-screen__icon"));
    sec.appendChild(row);
    list(sec, [
      "Mini Blades are special symbols with no direct payout. When a Blade lands, it drops straight down and cuts the symbols below it. Cut cells stay empty and break paths. Every cut symbol falls into the Chest.",
      "Cut a Crow and a crow lands on top of the machine, on the left or the right. Crows cut by the same Blade land on the same side. Every crow that lands on an occupied side adds to its multiplier: ×2, ×3 and up. Base crows wait off-screen during bonuses. Crows collected during Raven free spins fly away when that chain ends.",
      "After a cut, a skeleton may open a door in the cut cell and throw a stone. If the stone hits a perched crow, the crow dies and falls down its column.",
      "Every cell the dead crow falls through becomes a Wild until the next spin. A line through it is multiplied by that crow's multiplier.",
      "Some Crows are golden. They pay like a Crow, and if a Blade cuts one it perches golden and adds ×10, ×25 or ×50 to its side: a golden ×10 with a black crow makes ×11. Each golden crow flies away after 2–5 base spins. Bonus spins do not count. Base crows wait off-screen during bonuses and return afterwards."
    ]);
  }

  function buildChest() {
    var sec = section("chest", "The Chest");
    var row = el("div", "rules-screen__row");
    row.appendChild(img("assets/ambient/chest.png", "Chest", "rules-screen__icon rules-screen__icon--wide"));
    row.appendChild(img("assets/ruleta/wheel/icon.webp", "Chest Gamble wheel", "rules-screen__icon"));
    sec.appendChild(row);
    var ruleta = window.OssuaryRuletaGame;
    var collectMultiple = (ruleta && ruleta.COLLECT_MULTIPLIER) || 20;
    var collect = el("span");
    collect.appendChild(document.createTextNode("COLLECT takes "));
    collect.appendChild(betAmount(collectMultiple));
    collect.appendChild(document.createTextNode(" (" + collectMultiple + "× bet)."));
    list(sec, [
      "The number on the Chest counts every symbol cut by a Blade.",
      "Once the count is high enough, the next spin that pays more than 5× your bet opens the Chest.",
      [collect],
      "GAMBLE spins the bone wheel. The key that stops under the hand lights up and the abyss in the middle calls the prize: bronze ×0 or ×10, silver ×25 or ×50, gold ×100, red BONUS GAME, black SUPER BONUS. BONUS GAME starts the Execution Bonus and SUPER BONUS the Super Bonus."
    ]);
  }

  function skeletonFigure(skeleton) {
    var reelAssets = (window.OSSUARY_REEL_SYMBOL_ASSETS || {})["rib2-right"] || {};
    var hands = (window.OSSUARY_REEL_SYMBOL_OVERLAYS || {})["rib2-right"] || {};
    var heads = (window.OSSUARY_REEL_SYMBOL_HEAD_OVERLAYS || {})["rib2-right"] || {};
    var fig = el("figure", "rules-skeleton");
    var art = el("div", "rules-skeleton__art");
    [reelAssets[skeleton.id], hands[skeleton.id], heads[skeleton.id]].forEach(function (src) {
      if (src) art.appendChild(img(src, "", "rules-skeleton__layer"));
    });
    fig.appendChild(art);
    fig.appendChild(el("figcaption", "rules-skeleton__name", skeleton.name));
    var cfg = window.OSSUARY_SYMBOL_CONFIG || {};
    var handPrize = (cfg.BONUS_MODE_SKELETON_PRIZES || {})[skeleton.id];
    var headPrize = (cfg.BONUS_MODE_SKELETON_HEAD_PRIZES || {})[skeleton.id];
    var pays = el("dl", "rules-symbol__pays");
    if (typeof handPrize === "number") {
      pays.appendChild(el("dt", null, "Hands"));
      var dd1 = el("dd");
      dd1.appendChild(betAmount(handPrize));
      dd1.appendChild(el("small", "rules-screen__multiple", formatMultiple(handPrize)));
      pays.appendChild(dd1);
    }
    if (typeof headPrize === "number") {
      pays.appendChild(el("dt", null, "Head"));
      var dd2 = el("dd");
      dd2.appendChild(betAmount(headPrize));
      dd2.appendChild(el("small", "rules-screen__multiple", formatMultiple(headPrize)));
      pays.appendChild(dd2);
    }
    fig.appendChild(pays);
    return fig;
  }

  function sternumFigure(symbolId, name, text) {
    var fig = el("figure", "rules-sternum");
    var src = symbolAsset(symbolId);
    if (src) fig.appendChild(img(src, name, "rules-sternum__art"));
    var caption = el("figcaption", "rules-sternum__text");
    caption.appendChild(el("strong", null, name));
    caption.appendChild(document.createTextNode(" " + text));
    fig.appendChild(caption);
    return fig;
  }

  function buildBonus() {
    var sec = section("bonus", "Execution Bonus");
    var trigger = el("div", "rules-screen__row");
    var rib1 = ((window.OSSUARY_REEL_SYMBOL_ASSETS || {}).rib1 || {}).RIB_BONUS;
    var rib2 = ((window.OSSUARY_REEL_SYMBOL_ASSETS || {})["rib2-right"] || {}).RIB_BONUS;
    if (rib1) trigger.appendChild(img(rib1, "Giant guillotine", "rules-screen__icon rules-screen__icon--wide"));
    if (rib2) trigger.appendChild(img(rib2, "Giant bones", "rules-screen__icon rules-screen__icon--wide"));
    sec.appendChild(trigger);
    var chances = (window.OSSUARY_BONUS_MODE_CONFIG && window.OSSUARY_BONUS_MODE_CONFIG.modes &&
      window.OSSUARY_BONUS_MODE_CONFIG.modes.NORMAL_BONUS && window.OSSUARY_BONUS_MODE_CONFIG.modes.NORMAL_BONUS.awardedSpins) || 3;
    paragraph(sec, "Land the giant guillotine on the top reel and the side reels spin again. Giant bones must then lock on rib 2 and rib 3, in order. Every respin that adds a new piece keeps the chain going; a respin with nothing new ends it. Complete the ribcage to enter FREE SPIN · " + chances + " CHANCES.");

    sec.appendChild(el("h4", "rules-screen__subheading", "Skeletons"));
    paragraph(sec, "Skeletons land on the side ribs and stay chained in their stocks. Each one pays for its hands and for its head:");
    var skeletons = el("div", "rules-screen__skeletons");
    SKELETONS.forEach(function (s) { skeletons.appendChild(skeletonFigure(s)); });
    sec.appendChild(skeletons);

    sec.appendChild(el("h4", "rules-screen__subheading", "The central reel"));
    var sternum = el("div", "rules-screen__sternum");
    sternum.appendChild(sternumFigure("BLADE_BONUS", "Guillotine:", "cuts the hands of every chained skeleton, pays them and refills your chances to " + chances + ". The cut skeletons leave on the next spin."));
    sternum.appendChild(sternumFigure("GUADANA_BONUS", "Scythe:", "cuts the heads of every chained skeleton and pays them. The skeletons stay, so their hands can still be cut."));
    sternum.appendChild(sternumFigure("STERNUM_CROSS_BONUS", "Cross:", "nothing happens."));
    sec.appendChild(sternum);

    sec.appendChild(el("h4", "rules-screen__subheading", "Hand box and multiplier"));
    var levels = HAND_BOX_LEVELS.map(function (level) { return level.target + " → ×" + level.multiplier; }).join(", ");
    list(sec, [
      "Hands and heads are paid times the guillotine multiplier (×1 at the start).",
      "Every skeleton cut by the Guillotine drops its hands into the box. Fill it to stick a bigger multiplier on the guillotine for the next cuts: " + levels + " (maximum). Extra hands carry over to the next level.",
      "Every spin uses one chance. When no chances are left the bonus ends at once, and skeletons still chained pay nothing.",
      "The WIN panel shows the bonus total."
    ]);
  }

  // SUPER BONUS "El Juicio" (src/fx/el-juicio.js). Sin la probabilidad de que
  // caiga el encapuchado (intriga, decision del usuario).
  function buildSuper() {
    var cfg = window.OSSUARY_EL_JUICIO_CONFIG;
    if (!cfg) return;
    var sec = section("super", "Super Bonus");
    var row = el("div", "rules-screen__row");
    row.appendChild(img("assets/super_bonus/hood_figure.png", "The hooded figure", "rules-screen__icon rules-screen__icon--wide"));
    row.appendChild(img("assets/symbols/lantern.png", "Death’s lantern", "rules-screen__icon"));
    sec.appendChild(row);
    paragraph(sec, "When the ribcage is complete, the hooded figure on top of the machine may let go and fall into the central reel. Death takes the board: SUPER BONUS · " + cfg.tolls + " BELLS. The black key of the Chest Gamble starts it too, and you can buy it with BUY BONUS.");
    function valueOf(type, name) {
      var part = el("span");
      part.appendChild(document.createTextNode(name + " "));
      part.appendChild(betAmount(cfg.values[type]));
      return part;
    }
    var souls = el("span");
    souls.appendChild(document.createTextNode("Every condemned that lands in a stock puts its soul into Death’s lantern: "));
    souls.appendChild(valueOf("POBRE", "Poor"));
    souls.appendChild(document.createTextNode(", "));
    souls.appendChild(valueOf("NOBLE", "Noble"));
    souls.appendChild(document.createTextNode(", "));
    souls.appendChild(valueOf("RICO", "Rich"));
    // Infectados con multiplicador (peticion del usuario, 2026-10-19).
    var blightMax = Math.max.apply(null, (cfg.blightMultipliers || [[5, 1]]).map(function (b) { return b[0]; }));
    souls.appendChild(document.createTextNode(". Some arrive BLIGHTED, burning red, with a multiplier of up to ×" + blightMax + ": their soul is worth that many times more, and the same number is added to the scythe."));
    var steps = [cfg.startMultiplier].concat(cfg.ladder.map(function (r) { return r[1]; })).map(function (m) { return "×" + m; }).join(" → ");
    var golden = cfg.goldenMultipliers.map(function (g) { return "×" + g[0]; }).join(", ");
    var climbs = cfg.flockRungs.map(function (r) { return r[0]; });
    var climbText = climbs.length > 1 ? climbs.slice(0, -1).join(", ") + " or " + climbs[climbs.length - 1] : String(climbs[0]);
    list(sec, [
      "Death tolls " + cfg.tolls + " bells. Every spin uses one.",
      [souls],
      "The top reel is Death’s nest: " + cfg.nestCells + " small reels of crows that spin every time. When a crow stops in the middle of one, Death throws the scythe and cuts it down: +1 bell and one step for the scythe (" + steps + "). Its blood marks that reel. A golden crow multiplies the whole scythe by " + golden + ".",
      "All three reels marked: MURDER OF CROWS. The blood calls the flock, Death reaps it in one throw, the scythe climbs " + climbText + " levels at once and the marks wash away.",
      "All 8 stocks full: HARVEST. Guillotine and scythe execute them all, every soul goes into the lantern again, the scythe climbs a whole level and the stocks empty for more.",
      "Last bell: everything goes dark but the nest. A crow there gives one more bell. If none comes, THE SENTENCE: the condemned still chained pay once more and you win the lantern times the scythe, up to " + cfg.cap.toLocaleString("en-US") + "× your bet.",
      "Every prize shows its amount and flies into the lantern (and the WIN panel); at the Sentence the scythe multiplies the lantern."
    ]);
  }

  // Arte de las compras: el mismo de la pantalla BUY BONUS (assets/ui/buy/).
  function buildBuy() {
    var sec = section("buy", "Buy Bonus");
    paragraph(sec, "Press BUY BONUS under SPIN and pick a bonus, then press SPIN to buy it. Your choice stays selected above SPIN, with its price, until you cancel it with ×.");
    var options = [
      { id: "bonus-game", src: "assets/ui/buy/buy-execution.webp", name: "Execution Bonus", text: "a spin that completes the ribcage and starts FREE SPIN." },
      { id: "blade-spin", src: "assets/ui/buy/buy-raven.webp", name: "Raven Bonus", text: "a spin with two Blades over Crows: a crow lands on each side and two skeletons throw their stones. Every crow a stone kills gives you +1 spin. Each free spin brings a new Blade over a Crow and another stone, and the crows stay perched while the chain goes on. When it ends, the crows still alive fly away." },
      { id: "chest-game", src: "assets/ui/buy/buy-chest.webp", name: "Chest Gamble", text: "opens the Chest Gamble and spins automatically, without COLLECT." },
      { id: "super-bonus", src: "assets/ui/buy/buy-judgment.webp", name: "Super Bonus", text: "the hooded figure falls into the central reel and the SUPER BONUS starts straight away." }
    ];
    var wrap = el("div", "rules-screen__buy");
    options.forEach(function (option) {
      var fig = el("figure", "rules-buy");
      fig.appendChild(img(option.src, option.name, "rules-buy__art"));
      var cap = el("figcaption", "rules-buy__text");
      cap.appendChild(el("strong", null, option.name));
      var multiple = buyPriceMultiple(option.id);
      if (multiple) {
        cap.appendChild(document.createTextNode(" — "));
        cap.appendChild(betAmount(multiple));
        cap.appendChild(el("small", "rules-screen__multiple", formatMultiple(multiple) + " bet"));
      }
      cap.appendChild(el("span", "rules-buy__desc", option.text));
      fig.appendChild(cap);
      wrap.appendChild(fig);
    });
    sec.appendChild(wrap);
  }

  function buildControls() {
    var sec = section("controls", "Controls");
    list(sec, [
      "SPIN: the big round button, or Space / Enter.",
      "BET: − and +, or the coin button for amounts from €0.10 to €10.00 and custom amounts in €0.10 steps.",
      "AUTO: 10 to 1000 rounds, or your own number. Stop it with × above SPIN.",
      "TURBO (lightning): plays 2.5× faster.",
      "SOUND (speaker): sound on or off. Music and sound effects levels are in the menu.",
      "Wins of 10× your bet or more are counted in the centre of the screen. Click anywhere to close the final amount."
    ]);
    paragraph(sec, "This is a demo with play money: every game starts with €10,000. Payouts and probabilities are provisional.").className += " rules-screen__note";
  }

  function build() {
    root = el("div", "rules-screen");
    root.id = "rulesScreen";
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "rulesScreenTitle");

    var panel = el("div", "rules-screen__panel");
    var header = el("header", "rules-screen__header");
    var title = el("h2", "rules-screen__title", "Game Rules");
    title.id = "rulesScreenTitle";
    header.appendChild(title);
    var closeBtn = el("button", "rules-screen__close", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close rules");
    closeBtn.addEventListener("click", function () { click(); close(); });
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var nav = el("nav", "rules-screen__nav");
    nav.setAttribute("aria-label", "Rules sections");
    SECTIONS.forEach(function (s) {
      var btn = el("button", "rules-screen__tab", s.label);
      btn.type = "button";
      btn.addEventListener("click", function () {
        click();
        var target = document.getElementById("rules-" + s.id);
        if (target && bodyEl) bodyEl.scrollTo({ top: target.offsetTop - bodyEl.offsetTop, behavior: "smooth" });
      });
      nav.appendChild(btn);
    });
    panel.appendChild(nav);

    bodyEl = el("div", "rules-screen__body");
    bodyEl.tabIndex = 0;
    panel.appendChild(bodyEl);
    root.appendChild(panel);

    buildPaytable();
    buildPaths();
    buildBlades();
    buildChest();
    buildBonus();
    buildSuper();
    buildBuy();
    buildControls();

    root.addEventListener("click", function (event) {
      if (event.target === root) close();
    });
    root.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
      // Que Espacio/Enter no lancen un giro mientras se leen las reglas.
      if (event.key === " " || event.key === "Enter") event.stopPropagation();
    });
    document.body.appendChild(root);
  }

  function refreshAmounts() {
    var bet = currentBet();
    dynamicNodes.forEach(function (node) {
      if (node.dataset.bet) {
        node.textContent = formatMoney(bet);
      } else {
        node.textContent = formatMoney(bet * Number(node.dataset.multiple || 0));
      }
    });
  }

  function click() {
    if (window.OssuaryAudio) window.OssuaryAudio.trigger("button_click");
  }

  // open("buy") abre directamente en esa seccion (la pantalla de compra lo
  // usa para "HOW THEY WORK").
  function open(sectionId) {
    if (!root) build();
    refreshAmounts();
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add("has-rules-screen");
    var target = sectionId ? document.getElementById("rules-" + sectionId) : null;
    bodyEl.scrollTop = target ? target.offsetTop - bodyEl.offsetTop : 0;
    var closeBtn = root.querySelector(".rules-screen__close");
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove("has-rules-screen");
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  window.OssuaryRulesScreen = {
    open: open,
    close: close,
    isOpen: function () { return Boolean(root && !root.hidden); }
  };
})();
