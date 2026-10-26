/* ---------------------------------------------------------------------
   "Spin to meet me" — a small three-reel slot in the About section.
   Each reel is its own sentence (I speak / I'm obsessed with / Ask me
   about), so a spin reads as three separate true facts and no reel ever
   implies something about another one. The reels show three rows; the
   middle one sits on the win line. Reels stop left to right with a small
   overshoot, the last one lingers (anticipation), each sentence updates as
   its reel lands, and the win line lights up when the spin is over.
   --------------------------------------------------------------------- */
(function () {
  'use strict';

  var root = document.querySelector('[data-meet]');
  if (!root) return;

  // Each item: [short label on the reel, how it reads in the sentence]
  var REELS = [
    { lead: 'I speak ', items: [
      ['English', 'English'],
      ['Spanish', 'Spanish (native)'],
      ['Japanese', 'Japanese (N4, still learning)']
    ] },
    { lead: 'I’m obsessed with ', items: [
      ['Details', 'details'],
      ['Timing', 'timing'],
      ['Visual identity', 'visual identity'],
      ['How it feels', 'how things feel'],
      ['Ravens', 'ravens, lately']
    ] },
    { lead: 'Ask me about ', items: [
      ['173 paylines', 'my 173 paylines'],
      ['Life in Tokyo', 'life in Tokyo'],
      ['Art direction', 'my visual direction'],
      ['Original concept', 'how Ossuary Reels began'],
      ['Throwing work away', 'throwing work away']
    ] }
  ];
  var CYCLES = 14;                      // copies of each reel's items in its strip
  var STOP_MS = [900, 1350, 2200];      // left to right; the last reel lingers
  var EASE = 'cubic-bezier(0.22, 0.9, 0.32, 1.08)';
  var BONUS_AT = 5;

  // With reduced motion the reels still turn (a spin that jumps straight to
  // the result reads as broken), but short, without blur or overshoot.
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    STOP_MS = [260, 360, 480];
    EASE = 'ease-out';
  }

  var cabinet = root.querySelector('[data-meet-cabinet]');
  var windows = root.querySelectorAll('.meet-window');
  var strips = root.querySelectorAll('.meet-strip');
  var lines = root.querySelectorAll('[data-meet-result] li');
  var button = root.querySelector('[data-meet-spin]');
  var bonusEl = root.querySelector('[data-meet-bonus]');
  if (strips.length !== REELS.length || lines.length !== REELS.length || !button) return;

  var pos = [];        // absolute index of the item on the win line, per strip
  var spins = 0;
  var spinning = false;

  function rowHeight(i) {
    var li = strips[i].firstElementChild;
    return li ? li.getBoundingClientRect().height : 0;
  }

  // The item at `index` sits in the middle row, one row below the top.
  function place(i, index, ms) {
    var strip = strips[i];
    strip.style.transition = ms ? 'transform ' + ms + 'ms ' + EASE : 'none';
    strip.style.transform = 'translateY(' + (-(index - 1) * rowHeight(i)) + 'px)';
  }

  function current(i) {
    var items = REELS[i].items;
    return items[pos[i] % items.length];
  }

  function writeLine(i, animate) {
    var line = lines[i];
    line.innerHTML = REELS[i].lead + '<b>' + current(i)[1] + '</b>.';
    if (animate && !reduceMotion) {
      line.classList.remove('is-new');
      void line.offsetWidth; // restart the fade-in
      line.classList.add('is-new');
    }
  }

  function flash(el, cls) {
    if (reduceMotion || !el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // restart the animation
    el.classList.add(cls);
  }

  // Build the strips and start on "English / Details / 173 paylines"
  REELS.forEach(function (reel, i) {
    var html = '';
    for (var c = 0; c < CYCLES; c++) {
      reel.items.forEach(function (item) { html += '<li>' + item[0] + '</li>'; });
    }
    strips[i].innerHTML = html;
    pos[i] = reel.items.length * 2;
    place(i, pos[i], 0);
    writeLine(i, false);
  });

  function land(i, last) {
    windows[i].classList.remove('is-spinning');
    flash(windows[i], 'is-hit');
    writeLine(i, true);
    if (last) finish();
  }

  function finish() {
    spinning = false;
    button.disabled = false;
    button.classList.remove('is-spinning');
    flash(cabinet, 'is-win');
    if (spins === BONUS_AT && bonusEl) bonusEl.hidden = false;
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    spins += 1;
    button.disabled = true;
    button.classList.add('is-spinning');

    REELS.forEach(function (reel, i) {
      var len = reel.items.length;
      // Near the end of the strip: jump back to the same item two cycles in,
      // without animation, so there is always room to spin forward.
      if (pos[i] > len * (CYCLES - 5)) {
        pos[i] = len * 2 + (pos[i] % len);
        place(i, pos[i], 0);
        void strips[i].offsetWidth;
      }
      var from = pos[i] % len;
      var to = Math.floor(Math.random() * len);
      if (to === from && len > 1) to = (to + 1) % len;
      var target = pos[i] + len * (3 + i) + ((to - from + len) % len);
      pos[i] = target;

      if (!reduceMotion) windows[i].classList.add('is-spinning');
      place(i, target, STOP_MS[i]);
      // A timer instead of transitionend: it always fires, even when the
      // tab is in the background or the transition gets skipped.
      var last = i === REELS.length - 1;
      setTimeout(function () { land(i, last); }, STOP_MS[i] + 40);
    });
  }

  button.addEventListener('click', spin);

  // Keep the strips aligned when the row height changes (resize, rotation)
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (spinning) return;
      REELS.forEach(function (reel, i) { place(i, pos[i], 0); });
    }, 120);
  });
})();
