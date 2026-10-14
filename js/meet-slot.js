/* ---------------------------------------------------------------------
   "Spin to meet me" — a tiny three-reel slot in the About section.
   Each reel is its own sentence (I speak / I am obsessed with / Ask me
   about), so a spin reads as three separate true facts and no reel ever
   implies something about another one.
   Reels stop left to right with a small overshoot; the last one takes
   longer (anticipation) and every reel flashes gold when it lands.
   --------------------------------------------------------------------- */
(function () {
  'use strict';

  var root = document.querySelector('[data-meet]');
  if (!root) return;

  // Each item: [what the reel shows, how it reads inside the sentence]
  var REELS = [
    { lead: 'I speak ', items: [['English', 'English'], ['Spanish', 'Spanish'], ['Japanese (N4)', 'Japanese (N4)']] },
    { lead: 'I’m obsessed with ', items: [['Details', 'details'], ['Timing', 'timing'], ['Near-misses', 'near-misses'], ['How things feel', 'how things feel'], ['Ravens, lately', 'ravens, lately']] },
    { lead: 'Ask me about ', items: [['Welding car prototypes', 'welding car prototypes'], ['Life in Tokyo', 'life in Tokyo'], ['Pastry in a Tokyo hotel', 'pastry in a Tokyo hotel'], ['My 173 paylines', 'my 173 paylines'], ['Throwing work away', 'throwing work away']] }
  ];
  var CYCLES = 14;                     // copies of each reel's items in its strip
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
  var windows = root.querySelectorAll('.meet-window');
  var strips = root.querySelectorAll('.meet-strip');
  var resultEl = root.querySelector('[data-meet-result]');
  var countEl = root.querySelector('[data-meet-count]');
  var button = root.querySelector('[data-meet-spin]');
  var bonusEl = root.querySelector('[data-meet-bonus]');
  if (strips.length !== REELS.length || !button) return;

  var pos = [];        // absolute index of the visible item in each strip
  var spins = 0;
  var spinning = false;

  function itemHeight(i) {
    var li = strips[i].firstElementChild;
    return li ? li.getBoundingClientRect().height : 0;
  }

  function place(i, index, ms) {
    var strip = strips[i];
    strip.style.transition = ms ? 'transform ' + ms + 'ms ' + EASE : 'none';
    strip.style.transform = 'translateY(' + (-index * itemHeight(i)) + 'px)';
  }

  function current(i) {
    var items = REELS[i].items;
    return items[pos[i] % items.length];
  }

  function describe() {
    return REELS.map(function (reel, i) {
      return reel.lead + '<b>' + current(i)[1] + '</b>.';
    }).join(' ');
  }

  // Build the strips and start on "English / Details / Welding car prototypes"
  REELS.forEach(function (reel, i) {
    var html = '';
    for (var c = 0; c < CYCLES; c++) {
      reel.items.forEach(function (item) { html += '<li>' + item[0] + '</li>'; });
    }
    strips[i].innerHTML = html;
    pos[i] = reel.items.length * 2;
    place(i, pos[i], 0);
  });

  function land(i, done) {
    windows[i].classList.remove('is-spinning');
    if (!reduceMotion) {
      windows[i].classList.remove('is-hit');
      void windows[i].offsetWidth; // restart the flash animation
      windows[i].classList.add('is-hit');
    }
    if (done) finish();
  }

  function finish() {
    spinning = false;
    button.disabled = false;
    resultEl.innerHTML = describe();
    countEl.textContent = spins === 1 ? '1 spin' : spins + ' spins';
    if (spins === BONUS_AT && bonusEl) bonusEl.hidden = false;
  }

  function spin() {
    if (spinning) return;
    spinning = true;
    spins += 1;
    button.disabled = true;

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

      var last = i === REELS.length - 1;
      if (!reduceMotion) windows[i].classList.add('is-spinning');
      place(i, target, STOP_MS[i]);
      // A timer instead of transitionend: it always fires, even when the
      // tab is in the background or the transition gets skipped.
      setTimeout(function () { land(i, last); }, STOP_MS[i] + 40);
    });
  }

  button.addEventListener('click', spin);

  // Keep the strips aligned when the item height changes (resize, rotation)
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (spinning) return;
      REELS.forEach(function (reel, i) { place(i, pos[i], 0); });
    }, 120);
  });
})();
