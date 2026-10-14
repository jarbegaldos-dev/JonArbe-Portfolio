(function () {
  'use strict';

  /* ---------------------------------------------------------
     MEDIA — the one place to switch on video when the beta's
     footage exists. Leave a value as null and the site keeps the
     still images it uses today.
       heroVideo:      muted loop behind the hero, e.g.
                       { mp4: 'assets/ossuary-reels/video/hero-loop.mp4',
                         webm: 'assets/ossuary-reels/video/hero-loop.webm' }
       trailerYouTube: the trailer's YouTube id; shows every
                       "Watch the trailer" button ([data-trailer]).
       photo:          portrait for the About section, e.g.
                       'assets/photo/jon.webp' (4:5, at least 480x600).
     Any <img data-video="clip.mp4" data-video-webm="clip.webm"> also
     turns into a muted looping clip once it scrolls into view.
     --------------------------------------------------------- */
  var MEDIA = {
    heroVideo: null,
    trailerYouTube: null,
    photo: null
  };

  if (MEDIA.photo) {
    var photoFigure = document.querySelector('[data-photo]');
    if (photoFigure) {
      photoFigure.querySelector('img').src = MEDIA.photo;
      photoFigure.hidden = false;
    }
  }

  /* ---------------------------------------------------------
     Play Demo / Play Game — single shared modal + iframe.
     One public URL for the game, reused by every "Play" entry point
     across the whole site (Home and Case Study alike). Relative path:
     works from both index.html and ossuary-reels.html since both
     live at the repo root, and stays subdirectory-safe on GitHub Pages.
     --------------------------------------------------------- */
  var GAME_URL = 'game/index.html';
  var PLAY_TRIGGER_SELECTOR = '[data-play]';

  var playTriggers = document.querySelectorAll(PLAY_TRIGGER_SELECTOR);
  var trailerTriggers = MEDIA.trailerYouTube ? document.querySelectorAll('[data-trailer]') : [];
  if (playTriggers.length || trailerTriggers.length) {
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
        '<div class="game-modal-panel" role="dialog" aria-modal="true" aria-label="Ossuary Reels — playable demo">' +
          '<div class="game-modal-controls">' +
            '<button type="button" class="game-modal-btn" data-game-modal-fullscreen aria-label="Toggle fullscreen">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>' +
            '</button>' +
            '<button type="button" class="game-modal-btn game-modal-btn-close" data-game-modal-close aria-label="Close game">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="game-modal-frame">' +
            '<iframe id="gameModalIframe" title="Ossuary Reels — playable demo" ' +
              'loading="lazy" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" ' +
              'sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>' +
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
      openModal(GAME_URL, 'Ossuary Reels — playable demo');
    }

    function openTrailerModal(e) {
      if (e) e.preventDefault();
      openModal('https://www.youtube-nocookie.com/embed/' + encodeURIComponent(MEDIA.trailerYouTube) +
        '?autoplay=1&rel=0&modestbranding=1', 'Ossuary Reels — trailer');
    }

    function openModal(src, label) {
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
      panelEl.setAttribute('aria-label', label);
      iframeEl.title = label;
      iframeEl.src = src;
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

    trailerTriggers.forEach(function (trigger) {
      trigger.hidden = false;
      trigger.href = 'https://www.youtube.com/watch?v=' + encodeURIComponent(MEDIA.trailerYouTube);
      trigger.addEventListener('click', openTrailerModal);
    });
  }

  /* ---------------------------------------------------------
     Video upgrades (see MEDIA above). Without a source nothing
     changes; with one, the still stays as the poster until the
     video can actually play, so there is never a black frame.
     --------------------------------------------------------- */
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function makeLoopVideo(poster, mp4, webm) {
    var video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    if (poster) video.poster = poster;
    if (webm) {
      var s1 = document.createElement('source');
      s1.src = webm; s1.type = 'video/webm';
      video.appendChild(s1);
    }
    if (mp4) {
      var s2 = document.createElement('source');
      s2.src = mp4; s2.type = 'video/mp4';
      video.appendChild(s2);
    }
    return video;
  }

  if (MEDIA.heroVideo && !prefersReducedMotion) {
    var heroImg = document.querySelector('.hero-media img');
    if (heroImg) {
      var heroVideo = makeLoopVideo(heroImg.currentSrc || heroImg.src, MEDIA.heroVideo.mp4, MEDIA.heroVideo.webm);
      heroVideo.className = 'hero-video';
      heroVideo.addEventListener('playing', function () { heroImg.style.visibility = 'hidden'; }, { once: true });
      heroImg.parentNode.insertBefore(heroVideo, heroImg.nextSibling);
    }
  }

  var videoImgs = document.querySelectorAll('img[data-video]');
  if (videoImgs.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
    var clipIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var img = entry.target;
        clipIo.unobserve(img);
        var clip = makeLoopVideo(img.currentSrc || img.src, img.getAttribute('data-video'), img.getAttribute('data-video-webm'));
        clip.className = img.className;
        clip.setAttribute('aria-label', img.alt || '');
        clip.addEventListener('playing', function () { img.replaceWith(clip); }, { once: true });
        var started = clip.play();
        if (started && typeof started.catch === 'function') started.catch(function () { /* keep the still */ });
      });
    }, { rootMargin: '200px 0px' });
    videoImgs.forEach(function (img) { clipIo.observe(img); });
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
     "Jon Arbe", not a guessed top/right percentage. It perches on the
     final "E" at every size. The text wraps to one or two lines depending on viewport
     width/font metrics (this boundary shifts slightly on real
     devices vs. an emulator), so any fixed CSS breakpoint for the
     raven's position is fragile. Measuring the actual character
     position on every load/resize/font-load is the only approach
     that stays correct regardless of how the text wraps.
     --------------------------------------------------------- */
  var heroRavenFrame = document.querySelector('.hero-raven-frame');
  var heroNameEl = document.querySelector('.hero-name');
  var heroH1 = document.querySelector('.hero h1');

  if (heroRavenFrame && heroNameEl && heroH1 && heroH1.firstChild) {
    var positionHeroRaven = function () {
      var textNode = heroH1.firstChild;
      var text = textNode.textContent || '';
      if (!text.length) return;

      // Final "E" of "Arbe" on every screen size: on phones the name wraps to
      // two lines and the end of the second line is the only spot where the
      // raven does not cover another letter.
      var startIndex = text.length - 1;

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

     These are the *-source <video> elements: the actual decode targets.
     They're never the visible element (see js/alpha-video-layer.js) — the
     IntersectionObserver below watches their visible <canvas> proxies
     instead, since the source itself sits permanently off-screen and would
     never report as intersecting on its own.
     --------------------------------------------------------- */
  var ambientVideos = document.querySelectorAll('.hero-raven-source, .cs-heading-mark-source');
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
          if (entry.isIntersecting) attemptPlay(entry.target._alphaVideoSource || entry.target);
        });
      }, { threshold: 0.1 });
      ambientVideos.forEach(function (video) {
        // Observe the visible canvas proxy, not the off-screen source —
        // the source's own geometry never intersects the viewport.
        var canvas = video.parentElement && video.parentElement.querySelector('canvas');
        if (canvas) {
          canvas._alphaVideoSource = video;
          videoIo.observe(canvas);
        } else {
          videoIo.observe(video);
        }
      });
    }
  }

  /* ---------------------------------------------------------
     Wire the *-source videos to their <canvas> proxy so the canvas
     actually mirrors the decoded frames (see js/alpha-video-layer.js for
     why a canvas is used instead of showing the <video> directly).
     --------------------------------------------------------- */
  if (window.OssuaryAlphaVideo) {
    ambientVideos.forEach(function (video) {
      var canvas = video.parentElement && video.parentElement.querySelector('canvas');
      if (canvas) window.OssuaryAlphaVideo.setup(video, canvas);
    });
  }
})();
