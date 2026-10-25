(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Gradacion del fondo de los bonus (Execution y El Juicio) — SOLO VISUAL.
  //
  // Los dos modos comparten el video background_bonus_freespins (eclipse y
  // rayos; la version graduada ya viene sin fuego, ver
  // tools/bake-bonus-background-grade.js). Encima del video, y por debajo del
  // resto de capas, va una capa .scene-grade: velo del cielo, vineta lateral
  // (separa el tablero del fondo) y un relampago de luz para los momentos
  // fuertes. Estilos en src/fx/scene-grade.css.
  //
  // En El Juicio el ambiente cambia segun el momento (#slotStage
  // data-juicio-mood):
  //   intro  -> desde que empieza hasta la primera tirada: fondo vivo.
  //   calm   -> tiradas normales: fondo contenido, manda el tablero.
  //   last   -> ultima campanada: mas oscuro todavia.
  // Y el relampago solo en HARVEST, BANDADA, LAST BELL y la entrada.
  // No toca el flujo del Juicio: lee las clases que ya pone
  // src/fx/el-juicio.js (#slotStage.el-juicio-active y .el-juicio-tint).
  // ---------------------------------------------------------------------------

  var stage = document.getElementById("slotStage");
  var video = document.querySelector('[data-scene-layer="background_bonus_freespins"]');
  if (!stage || !video) return;

  // Cielo mas tranquilo: el remolino del eclipse gira mas despacio. Solo este
  // video; el del juego base va a su ritmo.
  var SKY_RATE = 0.8;
  video.defaultPlaybackRate = SKY_RATE;
  video.playbackRate = SKY_RATE;

  var grade = document.createElement("div");
  grade.className = "scene-grade";
  grade.setAttribute("aria-hidden", "true");
  var flashEl = document.createElement("div");
  flashEl.className = "scene-grade__flash";
  grade.appendChild(flashEl);
  video.insertAdjacentElement("afterend", grade);

  var strikeTimer = 0;
  function strike(power) {
    window.clearTimeout(strikeTimer);
    stage.classList.remove("scene-grade-strike", "scene-grade-strike--soft");
    void flashEl.offsetWidth;
    stage.classList.add("scene-grade-strike");
    if (power === "soft") stage.classList.add("scene-grade-strike--soft");
    strikeTimer = window.setTimeout(function () {
      stage.classList.remove("scene-grade-strike", "scene-grade-strike--soft");
    }, 1100);
  }

  function setMood(mood) {
    if (mood) stage.dataset.juicioMood = mood;
    else delete stage.dataset.juicioMood;
  }

  // --- El Juicio --------------------------------------------------------------
  var juicioOn = false;
  var tint = null;
  var tintObserver = null;
  var tolls = 0;

  // La .el-juicio-tint se monta en el mismo arranque que la clase del
  // escenario; si aun no esta, se reintenta unos fotogramas.
  function watchTint(tries) {
    var found = document.querySelector(".el-juicio-tint");
    if (!found) {
      if (juicioOn && (tries || 0) < 120) window.requestAnimationFrame(function () { watchTint((tries || 0) + 1); });
      return;
    }
    if (found === tint) return;
    if (tintObserver) tintObserver.disconnect();
    tint = found;
    tintObserver = new MutationObserver(onTint);
    tintObserver.observe(tint, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
  }

  function hasClass(value, name) {
    return (" " + (value || "") + " ").indexOf(" " + name + " ") >= 0;
  }

  // Cada registro trae la clase de antes; la de despues es la del siguiente
  // registro (o la actual). Asi se ven tambien las clases que el Juicio quita
  // y vuelve a poner en el mismo instante (restartClass: is-toll).
  function onTint(records) {
    if (!tint || !juicioOn) return;
    for (var i = 0; i < records.length; i++) {
      var before = records[i].oldValue;
      var after = i + 1 < records.length ? records[i + 1].oldValue : tint.className;
      var added = function (name) { return hasClass(after, name) && !hasClass(before, name); };
      // Campanadas: la primera es la de la entrada; la siguiente ya es la
      // primera tirada y el ambiente baja.
      if (added("is-toll")) {
        tolls += 1;
        if (tolls >= 2 && stage.dataset.juicioMood === "intro") setMood("calm");
      }
      if (added("is-harvest") || added("is-sentence")) strike();
      if (added("is-flock")) strike("soft");
    }
    var cl = tint.classList;
    if (stage.dataset.juicioMood !== "intro") setMood(cl.contains("is-last") || cl.contains("is-sentence") ? "last" : "calm");
  }

  // Relampago de la entrada: cuando el cartel (#bonusIntroModal) acaba de
  // irse (fundido .is-leaving y luego hidden) y el tablero ya se ve entero.
  var modal = document.getElementById("bonusIntroModal");
  function modalGone() {
    return !modal || modal.hidden;
  }
  function strikeWhenRevealed() {
    if (modalGone()) {
      window.setTimeout(function () { if (juicioOn) strike(); }, 260);
      return;
    }
    var mo = new MutationObserver(function () {
      if (!modalGone()) return;
      mo.disconnect();
      window.setTimeout(function () { if (juicioOn) strike(); }, 120);
    });
    mo.observe(modal, { attributes: true, attributeFilter: ["hidden", "class"] });
  }

  function onStage() {
    var active = stage.classList.contains("el-juicio-active");
    if (active === juicioOn) {
      if (active) watchTint();
      return;
    }
    juicioOn = active;
    if (active) {
      tolls = 0;
      setMood("intro");
      watchTint();
      strikeWhenRevealed();
    } else {
      if (tintObserver) tintObserver.disconnect();
      tintObserver = null;
      tint = null;
      setMood(null);
    }
  }

  new MutationObserver(onStage).observe(stage, { attributes: true, attributeFilter: ["class"] });
  onStage();

  window.OssuarySceneGrade = {
    strike: strike,
    mood: function () { return stage.dataset.juicioMood || null; }
  };
})();
