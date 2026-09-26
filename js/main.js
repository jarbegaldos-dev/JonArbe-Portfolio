(function () {
  'use strict';

  /* ---------------------------------------------------------
     CONFIG — centralized links that aren't live yet.
     Set the URL, everything wired to it activates automatically.
     Until then, the link stays visible, clearly disabled, and inert.
     --------------------------------------------------------- */
  var YOUTUBE_URL = null;    // e.g. "https://www.youtube.com/@your-channel"

  // GitHub repo link (Case Study). Not created yet — leave null until the
  // repository is public, then set it here. Relative-safe: this is a full
  // URL, not a path, so it isn't affected by the GitHub Pages subdirectory.
  var GITHUB_URL = "https://github.com/jarbegaldos-dev/JonArbe-Portfolio";

  function wireConfigurableLinks(selector, url, message) {
    document.querySelectorAll(selector).forEach(function (link) {
      if (url) {
        link.href = url;
        link.classList.remove('is-disabled');
        link.removeAttribute('aria-disabled');
      } else {
        link.classList.add('is-disabled');
        link.setAttribute('aria-disabled', 'true');
        link.addEventListener('click', function (e) {
          e.preventDefault();
          console.info(message);
        });
      }
    });
  }

  wireConfigurableLinks(
    '#youtubeLink',
    YOUTUBE_URL,
    '[Portfolio] YouTube link not configured yet — set YOUTUBE_URL in js/main.js'
  );

  wireConfigurableLinks(
    '#githubRepoLink',
    GITHUB_URL,
    '[Portfolio] GitHub repo link not configured yet — set GITHUB_URL in js/main.js'
  );

  /* ---------------------------------------------------------
     Play Demo / Play Game — single shared modal + iframe.
     One public URL for the game, reused by every "Play" entry point
     across the whole site (Home and Case Study alike). Relative path:
     works from both index.html and guillotine-reels.html since both
     live at the repo root, and stays subdirectory-safe on GitHub Pages.
     --------------------------------------------------------- */
  var GAME_URL = 'game/index.html';
  var PLAY_TRIGGER_SELECTOR =
    '#playDemoLink, #playDemoLinkCard, #playDemoLinkHero, #playDemoLinkSection, #playDemoLinkFooter';

  var playTriggers = document.querySelectorAll(PLAY_TRIGGER_SELECTOR);
  if (playTriggers.length) {
    var modal = null;
    var iframeEl = null;
    var panelEl = null;
    var lastScrollY = 0;
    var lastFocusedEl = null;

    function buildModal() {
      var el = document.createElement('div');
      el.className = 'game-modal';
      el.id = 'gameModal';
      el.hidden = true;
      el.innerHTML =
        '<div class="game-modal-backdrop" data-game-modal-close></div>' +
        '<div class="game-modal-panel" role="dialog" aria-modal="true" aria-label="Guillotine Reels — playable demo">' +
          '<div class="game-modal-controls">' +
            '<button type="button" class="game-modal-btn" data-game-modal-fullscreen aria-label="Toggle fullscreen">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>' +
            '</button>' +
            '<button type="button" class="game-modal-btn game-modal-btn-close" data-game-modal-close aria-label="Close game">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="game-modal-frame">' +
            '<iframe id="gameModalIframe" title="Guillotine Reels — playable demo" ' +
              'loading="lazy" allow="autoplay; fullscreen" referrerpolicy="no-referrer" ' +
              'sandbox="allow-scripts allow-same-origin"></iframe>' +
          '</div>' +
        '</div>';
      document.body.appendChild(el);
      return el;
    }

    function lockScroll() {
      lastScrollY = window.scrollY;
      document.body.classList.add('game-modal-open');
      document.body.style.top = (-lastScrollY) + 'px';
    }

    function unlockScroll() {
      document.body.classList.remove('game-modal-open');
      document.body.style.top = '';
      window.scrollTo(0, lastScrollY);
    }

    function openGameModal(e) {
      if (e) e.preventDefault();
      if (!modal) {
        modal = buildModal();
        iframeEl = modal.querySelector('#gameModalIframe');
        panelEl = modal.querySelector('.game-modal-panel');

        modal.querySelectorAll('[data-game-modal-close]').forEach(function (btn) {
          btn.addEventListener('click', closeGameModal);
        });
        modal.querySelector('[data-game-modal-fullscreen]').addEventListener('click', toggleFullscreen);
      }

      lastFocusedEl = document.activeElement;
      lockScroll();
      iframeEl.src = GAME_URL;
      modal.hidden = false;
      // Next frame, so the transition (opacity/scale) actually animates in.
      window.requestAnimationFrame(function () {
        modal.classList.add('is-open');
      });
      modal.querySelector('.game-modal-btn-close').focus();
      document.addEventListener('keydown', onModalKeydown);
    }

    function closeGameModal() {
      if (!modal || modal.hidden) return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(function () { /* ignore */ });
      }
      modal.classList.remove('is-open');
      // Stop the game/audio completely and free resources: drop the src
      // rather than just hiding, so nothing keeps running in the background.
      iframeEl.removeAttribute('src');
      modal.hidden = true;
      unlockScroll();
      document.removeEventListener('keydown', onModalKeydown);
      if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
        lastFocusedEl.focus();
      }
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        if (panelEl.requestFullscreen) {
          panelEl.requestFullscreen().catch(function () { /* not available, stay windowed */ });
        }
      } else {
        document.exitFullscreen().catch(function () { /* ignore */ });
      }
    }

    function onModalKeydown(e) {
      if (e.key === 'Escape') closeGameModal();
    }

    playTriggers.forEach(function (trigger) {
      trigger.href = GAME_URL; // progressive enhancement: works even without JS
      trigger.removeAttribute('target');
      trigger.removeAttribute('rel');
      trigger.addEventListener('click', openGameModal);
    });
  }

  /* ---------------------------------------------------------
     Background music — prepared, no track loaded yet.
     Set AUDIO_SRC to a real audio file (e.g. "assets/audio/ambient.mp3")
     to enable playback. Until then, the control stays visible but inert,
     exactly like the Play Demo buttons above.
     --------------------------------------------------------- */
  var AUDIO_SRC = null;
  var audioToggle = document.getElementById('audioToggle');

  if (audioToggle) {
    if (!AUDIO_SRC) {
      audioToggle.classList.add('is-disabled');
      audioToggle.setAttribute('aria-disabled', 'true');
      audioToggle.addEventListener('click', function () {
        console.info('[Portfolio] Background music not configured yet — set AUDIO_SRC in js/main.js');
      });
    } else {
      var audioEl = new Audio(AUDIO_SRC);
      audioEl.loop = true;
      audioEl.volume = 0.22;
      audioEl.preload = 'none';

      var AUDIO_STORAGE_KEY = 'jonarbe-audio-enabled';

      var setAudioState = function (playing) {
        audioToggle.classList.toggle('is-playing', playing);
        audioToggle.setAttribute('aria-pressed', String(playing));
        audioToggle.setAttribute('aria-label', playing ? 'Mute background music' : 'Play background music');
      };
      setAudioState(false);

      audioToggle.addEventListener('click', function () {
        if (audioToggle.classList.contains('is-playing')) {
          audioEl.pause();
          setAudioState(false);
          try { localStorage.setItem(AUDIO_STORAGE_KEY, '0'); } catch (err) { /* storage unavailable, ignore */ }
        } else {
          audioEl.play().then(function () {
            setAudioState(true);
            try { localStorage.setItem(AUDIO_STORAGE_KEY, '1'); } catch (err) { /* storage unavailable, ignore */ }
          }).catch(function () {
            // Playback blocked by the browser's autoplay policy — stay paused silently.
            setAudioState(false);
          });
        }
      });

      // Respect the visitor's previous choice when arriving on a new page.
      // Browsers may still require a fresh gesture on this page load; if so,
      // this attempt is silently ignored and the control simply stays off.
      var storedAudioPref = null;
      try { storedAudioPref = localStorage.getItem(AUDIO_STORAGE_KEY); } catch (err) { /* storage unavailable, ignore */ }
      if (storedAudioPref === '1') {
        audioEl.play().then(function () { setAudioState(true); }).catch(function () { setAudioState(false); });
      }
    }
  }

  /* ---------------------------------------------------------
     Nav: solid background on scroll
     --------------------------------------------------------- */
  var nav = document.getElementById('siteNav');
  function onScroll() {
    if (window.scrollY > 40) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------------------------------------------------
     Mobile nav toggle
     --------------------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('is-open');
      toggle.classList.toggle('is-active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('is-open');
        toggle.classList.remove('is-active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------- */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------------------------------------------------------
     "What I Design" — click-to-expand definitions.
     Each area is a real <button>, so it already gets native
     keyboard support (Tab, Enter, Space) for free. Escape closes
     the open one and returns focus to its trigger.
     --------------------------------------------------------- */
  var focusList = document.getElementById('focusList');
  if (focusList) {
    var focusItems = Array.prototype.slice.call(focusList.querySelectorAll('.focus-item'));

    function closeFocusItem(item) {
      var trigger = item.querySelector('.focus-item-trigger');
      item.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    function openFocusItem(item) {
      var trigger = item.querySelector('.focus-item-trigger');
      item.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }

    focusItems.forEach(function (item) {
      var trigger = item.querySelector('.focus-item-trigger');
      trigger.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');
        if (isOpen) {
          closeFocusItem(item);
        } else {
          openFocusItem(item);
        }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var openItem = focusItems.filter(function (item) { return item.classList.contains('is-open'); })[0];
      if (!openItem) return;
      closeFocusItem(openItem);
      openItem.querySelector('.focus-item-trigger').focus();
    });
  }

  /* ---------------------------------------------------------
     Case study subnav: active link on scroll + offset anchor scroll
     --------------------------------------------------------- */
  var subnavList = document.getElementById('csSubnavList');
  if (subnavList) {
    var subnavLinks = Array.prototype.slice.call(subnavList.querySelectorAll('a'));
    var targets = subnavLinks
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    if ('IntersectionObserver' in window) {
      var sectionIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var link = subnavList.querySelector('a[href="#' + entry.target.id + '"]');
          if (!link) return;
          if (entry.isIntersecting) {
            subnavLinks.forEach(function (a) { a.classList.remove('is-active'); });
            link.classList.add('is-active');
          }
        });
      }, { threshold: 0, rootMargin: '-40% 0px -55% 0px' });

      targets.forEach(function (t) { sectionIo.observe(t); });
    }
  }

  /* ---------------------------------------------------------
     Hero raven — position it against a REAL rendered letter of
     "Jon Arbe", not a guessed top/right percentage. Desktop targets
     the final "E"; mobile (<=900px, matching the CSS breakpoint
     that shrinks the frame) targets the "A" of "Arbe" instead, per
     spec. The text wraps to one or two lines depending on viewport
     width/font metrics (this boundary shifts slightly on real
     devices vs. an emulator), so any fixed CSS breakpoint for the
     raven's position is fragile. Measuring the actual character
     position on every load/resize/font-load is the only approach
     that stays correct regardless of how the text wraps.
     --------------------------------------------------------- */
  var heroRavenFrame = document.querySelector('.hero-raven-frame');
  var heroNameEl = document.querySelector('.hero-name');
  var heroH1 = document.querySelector('.hero h1');
  var heroRavenMobileQuery = window.matchMedia ? window.matchMedia('(max-width: 900px)') : null;

  if (heroRavenFrame && heroNameEl && heroH1 && heroH1.firstChild) {
    var positionHeroRaven = function () {
      var textNode = heroH1.firstChild;
      var text = textNode.textContent || '';
      if (!text.length) return;

      var isMobile = heroRavenMobileQuery ? heroRavenMobileQuery.matches : false;
      var startIndex = text.length - 1; // desktop: final "E"
      if (isMobile) {
        var arbeIndex = text.indexOf('Arbe');
        startIndex = arbeIndex >= 0 ? arbeIndex : startIndex; // mobile: "A" of Arbe
      }

      var range = document.createRange();
      range.setStart(textNode, startIndex);
      range.setEnd(textNode, startIndex + 1);
      var letterRect = range.getBoundingClientRect();
      if (!letterRect.width && !letterRect.height) return; // hero not laid out yet

      var heroNameRect = heroNameEl.getBoundingClientRect();
      var frameSize = heroRavenFrame.offsetWidth;
      if (!frameSize) return;

      // Center the frame horizontally on the letter; vertically, perch it
      // mostly above the letter with a small overlap onto its top, like a
      // bird landing on it (matches the look tuned earlier for desktop).
      var letterCenterX = letterRect.left + letterRect.width / 2;
      var letterCapTop = letterRect.top + letterRect.height * 0.12;

      var left = (letterCenterX - heroNameRect.left) - frameSize / 2;
      var top = (letterCapTop - heroNameRect.top) - frameSize * 0.62;

      heroRavenFrame.style.left = left + 'px';
      heroRavenFrame.style.top = top + 'px';
      heroRavenFrame.style.right = 'auto';
    };

    positionHeroRaven();
    window.addEventListener('resize', positionHeroRaven);
    window.addEventListener('orientationchange', positionHeroRaven);
    // Fraunces (the display font used by the name) loads async; once it
    // swaps in, the text metrics/wrap can shift, so re-measure after it's
    // actually ready instead of relying on the pre-webfont fallback layout.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(positionHeroRaven).catch(function () {});
    }
  }

  /* ---------------------------------------------------------
     Decorative video autoplay — robust silent retry.
     Both ambient videos (hero raven, Case Study skeleton) already carry
     autoplay/muted/playsinline/webkit-playsinline, which is normally
     enough. On some real mobile browsers a single autoplay attempt at
     parse time can still be silently blocked or deferred (e.g. the
     element's entrance animation has it at opacity:0 at that exact
     instant, or the browser defers until the tab/page is actually
     foregrounded) and, critically, nothing then automatically retries it
     — the browser just leaves it paused with its own native tap-to-resume
     affordance, which is exactly what read as "a Play button that doesn't
     do anything" (see .hero-raven-frame's pointer-events fix elsewhere in
     this codebase for the other half of that bug).
     attemptPlay() is called from every signal that could plausibly make a
     previously-blocked autoplay succeed — never from a click/tap on the
     video itself, so no visible control or video-specific interaction is
     ever introduced. Every call re-sets `muted` as a JS property (not just
     relying on the HTML attribute) because some engines only honor the
     property for autoplay eligibility, and silently swallows a rejected
     Promise so a still-blocked attempt never surfaces as an error.
     --------------------------------------------------------- */
  var ambientVideos = document.querySelectorAll('.hero-raven, .cs-heading-mark');
  if (ambientVideos.length) {
    var attemptPlay = function (video) {
      if (!video || !video.paused) return;
      video.muted = true;
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () { /* still blocked this time; another signal below will retry */ });
      }
    };
    var attemptPlayAll = function () {
      ambientVideos.forEach(attemptPlay);
    };

    attemptPlayAll();
    ambientVideos.forEach(function (video) {
      video.addEventListener('loadeddata', function () { attemptPlay(video); });
      video.addEventListener('canplay', function () { attemptPlay(video); });
    });
    window.addEventListener('load', attemptPlayAll);
    window.addEventListener('pageshow', attemptPlayAll);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') attemptPlayAll();
    });
    if ('IntersectionObserver' in window) {
      var videoIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) attemptPlay(entry.target);
        });
      }, { threshold: 0.1 });
      ambientVideos.forEach(function (video) { videoIo.observe(video); });
    }
  }
})();
