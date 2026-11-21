(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Panel DEBUG (boton DEBUG arriba a la derecha) — rehecho a peticion del
  // usuario (2026-10-15): el anterior tenia botones que ya no servian (SUPER
  // BONUS desactivado, gigantes de prueba sin bonus real, animaciones de
  // simbolo apagadas...) y no cubria lo nuevo (cofre, resumen, golpe de
  // entrada, ojos del encapuchado, escalera de premios).
  //
  // Arriba, el estado del juego en vivo; debajo, secciones por mecanica. Todo
  // lo que se puede, por el flujo REAL del juego (tiradas con resultado
  // forzado: pagan, suenan y encadenan como en una partida); lo demas son
  // vistas previas que se dicen como tales. Solo usa APIs de debug que ya
  // existen (window.Ossuary*Debug, OssuaryRuletaGame.debug...) y
  // window.OssuaryGameDebug (game.js). Estilos: src/debug/debug-menu.css.
  // ---------------------------------------------------------------------------

  var STATUS_MS = 400;
  var STORE_KEY = "ossuary-debug-menu";

  var root = null;
  var statusEl = null;
  var messageEl = null;
  var messageTimer = 0;
  var stoneHitsOn = false;
  var pendingBonus = { sternum: null, ribs: null };
  var store = loadStore();

  function loadStore() {
    try {
      return JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveStore() {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) { /* sin almacenamiento: el panel funciona igual */ }
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function game() { return window.OssuaryGameDebug; }

  function snapshot() {
    return game() ? game().snapshot() : null;
  }

  function idle() {
    return Boolean(game() && game().isIdle());
  }

  function bet() {
    var s = snapshot();
    return s ? s.bet : 1;
  }

  function say(text, kind) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = "dbg-message dbg-message--" + (kind || "ok");
    window.clearTimeout(messageTimer);
    messageTimer = window.setTimeout(function () {
      messageEl.textContent = "";
      messageEl.className = "dbg-message";
    }, 4200);
  }

  // Envuelve una accion: si necesita el juego parado y no lo esta, avisa; si
  // la accion devuelve false, avisa de que no se pudo.
  function act(label, fn, needsIdle) {
    return function () {
      if (needsIdle && !idle()) {
        say("Ahora no: el juego esta ocupado (girando, bonus, cofre o resumen).", "warn");
        return;
      }
      var result;
      try {
        result = fn();
      } catch (err) {
        say(label + ": error (" + (err && err.message ? err.message : err) + ")", "warn");
        return;
      }
      if (result === false) say(label + ": no disponible ahora.", "warn");
      else say(label + (typeof result === "string" && result !== "ok" ? " · " + result : ""));
    };
  }

  function button(parent, label, onClick, opts) {
    opts = opts || {};
    var btn = el("button", "dbg-btn" + (opts.cls ? " " + opts.cls : ""), label);
    btn.type = "button";
    if (opts.title) btn.title = opts.title;
    btn.addEventListener("click", function () {
      onClick(btn);
      // Sin foco: Espacio es el SPIN del juego y no debe repetir este boton.
      btn.blur();
    });
    parent.appendChild(btn);
    return btn;
  }

  function toggle(parent, label, initial, onChange) {
    var btn = button(parent, label, function () {
      var on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      onChange(on);
    }, { cls: "dbg-btn--toggle" });
    btn.setAttribute("aria-pressed", String(Boolean(initial)));
    return btn;
  }

  function row(parent, label) {
    var wrap = el("div", "dbg-row");
    if (label) wrap.appendChild(el("div", "dbg-row__label", label));
    var grid = el("div", "dbg-grid");
    wrap.appendChild(grid);
    parent.appendChild(wrap);
    return grid;
  }

  function note(parent, text) {
    parent.appendChild(el("p", "dbg-note", text));
  }

  function section(id, title) {
    var details = el("details", "dbg-section");
    details.open = Boolean(store["open-" + id]);
    var summary = el("summary", "dbg-section__title", title);
    details.appendChild(summary);
    details.addEventListener("toggle", function () {
      store["open-" + id] = details.open;
      saveStore();
    });
    var body = el("div", "dbg-section__body");
    details.appendChild(body);
    root.querySelector(".dbg-scroll").appendChild(details);
    return body;
  }

  // --- Estado en vivo ------------------------------------------------------

  function money(v) {
    return "€" + (Math.round((Number(v) || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function renderStatus() {
    if (!statusEl || root.hidden) return;
    var s = snapshot();
    if (!s) {
      statusEl.textContent = "Juego no cargado.";
      return;
    }
    var state = s.spinning ? "girando" : (s.busy ? "ocupado" : "libre");
    if (s.summaryOpen) state = "resumen en pantalla";
    if (s.chest && s.chest.open) state = "cofre / ruleta";
    var lines = [
      ["Saldo", money(s.balance) + "  ·  apuesta " + money(s.bet)],
      ["Estado", state + (s.turbo ? " · turbo" : "") + (s.auto ? " · auto " + s.autoLeft : "")],
      ["Tirada", (s.spinType || "-") + (s.status ? " · " + s.status : "")]
    ];
    if (s.locked.length) lines.push(["Bloqueados", s.locked.join(", ")]);
    if (s.bonusActive) {
      lines.push(["Bonus", s.bonusChances + " velas · manos " + s.hands + " · x" + s.guillotineMult + " · " + money(s.bonusWin)]);
    }
    if (s.superBonus) lines.push(["Super", s.superBonus.tolls + " campanadas · saco " + s.superBonus.sack.toFixed(2) + " · x" + s.superBonus.multiplier + " · " + s.superBonus.harvests + " Siegas"]);
    if (s.superBonusNext) lines.push(["Encapuchado", s.superBonusNext === "super" ? "caera en la proxima cadena" : "amagara en la proxima cadena"]);
    if (s.raven) lines.push(["Cuervo", "tirada " + s.raven.spin + " · quedan " + s.raven.pending + " · " + money(s.raven.win)]);
    if (s.chest) lines.push(["Cofre", s.chest.count + "/" + s.chest.target + (s.chest.count >= s.chest.target ? " (lleno)" : "")]);
    var ruletaDbg = window.OssuaryRuletaGame && window.OssuaryRuletaGame.debug;
    var forcedPrize = ruletaDbg && ruletaDbg.getForcedPrize ? ruletaDbg.getForcedPrize() : null;
    if (forcedPrize) lines.push(["Ruleta", "proximo GAMBLE: " + forcedPrize]);
    if (s.forcedNextBonus) {
      lines.push(["Proxima", [s.forcedNextBonus.sternum, s.forcedNextBonus.ribs].filter(Boolean).join(" + ")]);
    } else if (pendingBonus.sternum || pendingBonus.ribs) {
      pendingBonus = { sternum: null, ribs: null };
    }
    statusEl.textContent = "";
    lines.forEach(function (line) {
      var item = el("div", "dbg-status__line");
      item.appendChild(el("span", "dbg-status__key", line[0]));
      item.appendChild(el("span", "dbg-status__value", line[1]));
      statusEl.appendChild(item);
    });
  }

  // --- Secciones -----------------------------------------------------------

  function buildGame() {
    var body = section("game", "Partida");
    var grid = row(body);
    button(grid, "Saldo 10,000", act("Saldo 10,000", function () { return game().setBalance(10000) && "ok"; }));
    button(grid, "Saldo 0.50", act("Saldo 0.50 (prueba NOT ENOUGH / OUT OF CREDIT)", function () { return game().setBalance(0.5) && "ok"; }));
    button(grid, "Saldo 0", act("Saldo 0", function () { game().setBalance(0); return "ok"; }));
    button(grid, "Recargar", function () {
      var url = new URL(window.location.href);
      url.searchParams.set("skipintro", "");
      window.location.href = url.toString().replace("skipintro=", "skipintro");
    }, { title: "Recarga el juego sin la pantalla de carga" });
  }

  function buildWins() {
    var body = section("wins", "Premios");
    note(body, "Tirada real con tablero forzado: paga, dibuja las lineas (escalera de notas) y cuenta el WIN.");
    var grid = row(body, "Tirada");
    button(grid, "1 linea", act("Premio de 1 linea", function () { return game().forceWin("line"); }, true));
    button(grid, "9 lineas", act("Premio de 9 lineas", function () { return game().forceWin("lines"); }, true));
    button(grid, "BIG WIN", act("BIG WIN (48 lineas)", function () { return game().forceWin("big"); }, true));

    var counter = row(body, "Contador BIG WIN (vista previa, no paga)");
    [10, 20, 40, 150, 300, 1000].forEach(function (mult) {
      button(counter, "x" + mult, act("Contador x" + mult, function () {
        window.OssuaryPaymentDebug.forceBigWin(mult * bet());
        return "ok";
      }));
    });
    button(counter, "MAX WIN", act("Contador MAX WIN (x20,000)", function () {
      window.OssuaryPaymentDebug.forceBigWin(20000 * bet());
      return "ok";
    }));
    button(counter, "Cerrar", act("Contador cerrado", function () {
      window.OssuaryPaymentDebug.hideBigWin();
      return "ok";
    }));

    var summary = row(body, "Resumen de bonus (vista previa)");
    button(summary, "Execution", act("Resumen del Execution Bonus", function () {
      window.OssuaryBonusSummary.show({ kind: "execution", total: 48.6 * bet(), bet: bet(), spins: 0 });
      return "ok";
    }));
    button(summary, "Raven", act("Resumen del Raven Bonus", function () {
      window.OssuaryBonusSummary.show({ kind: "raven", total: 173.2 * bet(), bet: bet(), spins: 6 });
      return "ok";
    }));
  }

  function buildCrows() {
    var body = section("crows", "Cuchillas y cuervos");
    var crows = row(body, "Cuervos");
    button(crows, "Se posa", act("Cuervo posado (apila si repites)", function () { return window.OssuarySmallBladeDebug.perchBird(); }));
    // Como en el juego: el cuervo muerto da una tirada gratis (cadena del cuervo).
    button(crows, "Muere (+1 tirada)", act("Cuervo muerto: tirada gratis", function () { return window.OssuarySmallBladeDebug.birdFall(); }));
    button(crows, "Se van volando", act("Los cuervos posados se van (fin de las mini freespins)", function () { return window.OssuarySmallBladeDebug.birdsFlyAway(); }));
    button(crows, "Piedra", act("Esqueleto y piedra", function () { return window.OssuarySmallBladeDebug.stoneThrow(); }));
    button(crows, "Limpiar", act("Cuervos, huecos y puertas limpios", function () {
      window.OssuarySmallBladeDebug.clear();
      return "ok";
    }));

    var rules = row(body, "Proximas tiradas");
    toggle(rules, "Piedra siempre acierta", stoneHitsOn, function (on) {
      stoneHitsOn = on;
      window.OssuaryRavenDebug.stoneAlwaysHits(on);
      say("Piedra siempre acierta: " + (on ? "si" : "no"));
    });
    button(rules, "Cuervo dorado", act("Cuervo dorado en la proxima tirada con cuchilla", function () {
      window.OssuaryRavenDebug.forceGoldenNext(true);
      return "ok";
    }));

    var buy = row(body, "Raven Bonus (compra real)");
    button(buy, "Comprar", act("Raven Bonus comprado", function () { return window.OssuaryRavenDebug.buy(false); }, true));
    button(buy, "Comprar con dorado", act("Raven Bonus con cuervo dorado", function () { return window.OssuaryRavenDebug.buy(true); }, true));

    var hood = row(body, "Cara del encapuchado");
    [["Tonta", "silly"], ["Enfadada", "angry"], ["Llorando", "crying"], ["Mirando", "watch"]].forEach(function (entry) {
      button(hood, entry[0], act("Encapuchado: " + entry[0].toLowerCase(), function () { return game().hoodEyes(entry[1]); }));
    });
  }

  function buildChest() {
    var body = section("chest", "Cofre y ruleta");
    var ruleta = function () { return window.OssuaryRuletaGame; };
    function fillTo(fraction, label) {
      return act("Cofre: " + label, function () {
        var r = ruleta();
        if (r.isActive()) return false;
        var target = r.getTriggerCount();
        var to = Math.max(0, Math.round(target * fraction));
        // Dos de golpe al final: asi salta el aviso del tramo (ALMOST FULL,
        // CHEST FULL) como en una partida.
        if (to >= 2) {
          r.debug.setCount(to - 2);
          r.debug.addFallenSymbols(2);
        } else {
          r.debug.setCount(to);
        }
        return to + "/" + target;
      });
    }
    var fill = row(body, "Llenado");
    button(fill, "Vacio", fillTo(0, "vacio"));
    button(fill, "Mitad", fillTo(0.55, "mitad (meneos sueltos)"));
    button(fill, "Casi lleno", fillTo(0.85, "casi lleno"));
    button(fill, "Lleno", fillTo(1, "lleno"));

    var acts = row(body, "Acciones");
    button(acts, "+3 caidos", act("+3 al cofre", function () {
      if (ruleta().isActive()) return false;
      ruleta().debug.addFallenSymbols(3);
      return "ok";
    }));
    button(acts, "Amago", act("Amago del cofre (solo lleno)", function () {
      if (!window.OssuaryChestTension || window.OssuaryChestTension.getLevel() !== "full") return false;
      window.OssuaryChestTension.tease();
      return "ok";
    }));
    button(acts, "Abrir cofre", act("Cofre abierto", function () {
      ruleta().debug.forceSequence();
      return "ok";
    }, true));
    button(acts, "Ruleta directa", act("Ruleta (sin la apertura)", function () {
      ruleta().debug.showRuleta();
      return "ok";
    }, true));

    // Premio del siguiente GAMBLE (la rueda para en una llave de su nivel).
    var prize = row(body, "Proximo GAMBLE");
    [["x0", "X0"], ["x10", "X10"], ["x25", "X25"], ["x50", "X50"], ["x100", "X100"],
      ["BONUS", "BONUS"], ["SUPER", "SUPER_BONUS"], ["Al azar", null]].forEach(function (entry) {
      button(prize, entry[0], act("Proximo GAMBLE: " + entry[0], function () {
        var dbg = ruleta().debug;
        if (!dbg.forceNextPrize) return false;
        dbg.forceNextPrize(entry[1]);
        return "ok";
      }));
    });
  }

  function buildExecution() {
    var body = section("execution", "Execution Bonus");
    var chain = row(body, "Cadena real (guillotina en rib1)");
    function flow(label, queue) {
      return act(label, function () { return window.OssuaryDebugPreview.forceRealBonusFlow(queue); }, true);
    }
    button(chain, "Falla en rib2", flow("Cadena: falla en rib2", [1, 0]));
    button(chain, "Falla en rib3", flow("Cadena: falla en rib3", [1, 1, 0]));
    button(chain, "Completa", flow("Cadena completa (golpe y entrada)", [1, 1, 1]));
    button(chain, "Entrar directo", act("Dentro del Execution Bonus", function () {
      return window.OssuaryDebugPreview.enterFreeSpinsMode();
    }, true));

    note(body, "Dentro del bonus: fuerza la proxima tirada (se puede combinar esternon y costillas).");
    function forceNext(field, value, label) {
      return act("Proxima tirada: " + label, function () {
        pendingBonus[field] = value;
        return game().forceBonusNext(pendingBonus);
      });
    }
    var sternum = row(body, "Esternon");
    button(sternum, "Guillotina", forceNext("sternum", "BLADE_BONUS", "guillotina"));
    button(sternum, "Guadana", forceNext("sternum", "GUADANA_BONUS", "guadana"));
    button(sternum, "Cruz", forceNext("sternum", "STERNUM_CROSS_BONUS", "cruz"));
    var ribs = row(body, "Costillas (todas)");
    button(ribs, "Pobres", forceNext("ribs", "POBRE", "pobres"));
    button(ribs, "Nobles", forceNext("ribs", "NOBLE", "nobles"));
    button(ribs, "Ricos", forceNext("ribs", "RICO", "ricos"));
    button(ribs, "Vacias", forceNext("ribs", "BONUS_EMPTY", "vacias"));
    var extra = row(body, "Caja de manos y vistas previas");
    button(extra, "+5 manos", act("+5 manos", function () { return game().addHands(5); }));
    button(extra, "Golpe de entrada", act("Golpe de entrada (vista previa)", function () {
      window.OssuaryBonusEntryHit.play({ silenceMs: 900 });
      return "ok";
    }));
  }

  // SUPER BONUS "El Juicio" (src/fx/el-juicio.js).
  function buildSuper() {
    var body = section("super", "Super Bonus (El Juicio)");
    var entry = row(body, "Entrada");
    button(entry, "Entrar directo", act("Caida del encapuchado y entrada del Super", function () {
      return game().enterSuperBonus();
    }, true));
    button(entry, "Cadena que cae", act("Cadena completa: el encapuchado cae (Super)", function () {
      game().superBonusNext("super");
      return window.OssuaryDebugPreview.forceRealBonusFlow([1, 1, 1]);
    }, true));
    button(entry, "Cadena con amago", act("Cadena completa: amago sin caer (Execution)", function () {
      game().superBonusNext("tease");
      return window.OssuaryDebugPreview.forceRealBonusFlow([1, 1, 1]);
    }, true));
    note(body, "Dentro del Super: lo que pasara en la proxima tirada.");
    var next = row(body, "Proxima tirada");
    function juicio() { return window.OssuaryElJuicio && window.OssuaryElJuicio.isActive() ? window.OssuaryElJuicio.debug : null; }
    button(next, "Cuervo dorado", act("Proximo cuervo dorado", function () { var j = juicio(); return j ? j.forceGolden() : false; }));
    button(next, "Siega", act("Siega en la proxima tirada", function () { var j = juicio(); return j ? j.forceHarvest() : false; }));
    button(next, "Infectado", act("Cae un infectado (BLIGHTED x5..x50) en la proxima tirada", function () { var j = juicio(); return j ? j.forceBlight() : false; }));
    button(next, "Bandada", act("Los tres rodillos del nido marcados en la proxima tirada (MURDER OF CROWS)", function () { var j = juicio(); return j ? j.forceFlock() : false; }));
    button(next, "Ultima campanada", act("Queda una campanada", function () { var j = juicio(); return j ? j.setTolls(1) : false; }));
  }

  // Galeria de audio: los sonidos de category "gallery" de
  // audio-sounds.config.js, una fila por `gallery`. Suena uno cada vez: el
  // anterior se corta (y si el que se pidio antes aun cargaba, ya no suena).
  var galleryTurn = 0;

  function buildGallery() {
    var sounds = (window.OSSUARY_AUDIO_SOUNDS || []).filter(function (def) { return def.category === "gallery"; });
    if (!sounds.length || !window.OssuaryAudio) return;
    var body = section("gallery", "Galeria de audio");
    note(body, "Sonidos sueltos aun sin uso en el juego. Pasa el raton por encima de un boton para ver cual es.");
    function stopAll() { window.OssuaryAudio.stopGroup("gallery", 80); }
    button(row(body), "Parar", function () {
      galleryTurn++;
      stopAll();
      say("Galeria: parado");
    });
    var rows = {};
    sounds.forEach(function (def) {
      if (!rows[def.gallery]) rows[def.gallery] = row(body, def.gallery);
      button(rows[def.gallery], def.label, function () {
        var turn = ++galleryTurn;
        stopAll();
        window.OssuaryAudio.preload(def.id).then(function (buffer) {
          if (turn !== galleryTurn) return;
          var voice = buffer ? window.OssuaryAudio.play(def.id) : null;
          if (voice) say("Suena: " + def.title + " · " + def.id);
          else say(def.title + ": no se pudo reproducir", "warn");
        });
      }, { title: def.title + " · " + def.id });
    });
  }

  function buildView() {
    var body = section("view", "Vista");
    var grid = row(body);
    toggle(grid, "Ocultar HUD", false, function (on) {
      window.OssuarySceneManager.setUiVisible(!on);
    });
    toggle(grid, "Contorno rodillos", false, function (on) {
      var stage = document.getElementById("slotStage");
      if (stage) stage.classList.toggle("ossuary-debug-geometry", on);
    });
    toggle(grid, "Red de lineas", false, function (on) {
      var api = window.OssuaryPaylineOverlayDebug;
      if (!api) return;
      if (on) api.showConnections();
      else api.clearConnections();
    });

    var layers = window.OSSUARY_SCENE_LAYERS || [];
    var groups = window.OSSUARY_SCENE_GROUPS || [];
    var list = el("details", "dbg-layers");
    list.appendChild(el("summary", "dbg-row__label", "Capas de escena"));
    groups.forEach(function (group) {
      var inGroup = layers.filter(function (layer) { return layer.group === group.id; });
      if (!inGroup.length) return;
      list.appendChild(el("div", "dbg-layers__group", group.label));
      inGroup.forEach(function (layer) {
        var label = el("label", "dbg-check");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !layer.hidden;
        input.addEventListener("change", function () {
          window.OssuarySceneManager.setLayerVisible(layer.id, input.checked);
          input.blur();
        });
        label.appendChild(input);
        label.appendChild(el("span", null, layer.label));
        list.appendChild(label);
      });
    });
    body.appendChild(list);
  }

  // --- Montaje -------------------------------------------------------------

  function build() {
    var toggleBtn = el("button", null, "DEBUG");
    toggleBtn.type = "button";
    toggleBtn.id = "ossuaryDebugToggle";

    root = el("aside", "dbg-panel");
    root.id = "ossuaryDebugPanel";
    root.setAttribute("aria-label", "Debug");
    root.hidden = !store.visible;

    var head = el("div", "dbg-head");
    head.appendChild(el("div", "dbg-head__title", "DEBUG"));
    var close = el("button", "dbg-head__close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Cerrar");
    head.appendChild(close);
    root.appendChild(head);

    statusEl = el("div", "dbg-status");
    root.appendChild(statusEl);
    messageEl = el("div", "dbg-message");
    messageEl.setAttribute("role", "status");
    root.appendChild(messageEl);
    root.appendChild(el("div", "dbg-scroll"));

    buildGame();
    buildWins();
    buildCrows();
    buildChest();
    buildExecution();
    buildSuper();
    buildGallery();
    buildView();

    function setVisible(visible) {
      root.hidden = !visible;
      store.visible = visible;
      saveStore();
      renderStatus();
    }
    toggleBtn.addEventListener("click", function () {
      setVisible(root.hidden);
      toggleBtn.blur();
    });
    close.addEventListener("click", function () { setVisible(false); });

    // Las teclas dentro del panel (casillas, botones) no llegan al juego.
    root.addEventListener("keydown", function (event) { event.stopPropagation(); });

    document.body.appendChild(toggleBtn);
    document.body.appendChild(root);
    window.setInterval(renderStatus, STATUS_MS);
    renderStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
