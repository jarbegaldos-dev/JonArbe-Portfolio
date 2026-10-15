# Jon Arbe — Game Designer Portfolio

Static HTML/CSS/JS site, published with GitHub Pages:
https://jarbegaldos-dev.github.io/JonArbe-Portfolio/

No build step, no dependencies.

## Run locally

```bash
node dev-server.js
```

Then open `http://127.0.0.1:5500/` (or set `PORT`). Use a server, not `file://`:
the playable demo runs in an iframe and needs it.

## Structure

```
index.html              Home: hero, about (story + "Spin to meet me"), Ossuary Reels (game sheet + 4 design breakdowns), how I design, contact
ossuary-reels.html      Ossuary Reels case study (6 sections + 4 feature breakdowns + dev log)
guillotine-reels.html   Redirect to ossuary-reels.html (the project's old name)
404.html                Not-found page (absolute URLs: GitHub Pages serves it at any depth)
css/style.css           Design system and every page's styles
js/main.js              MEDIA config, demo/trailer modal, video upgrades, nav, reveal, subnav, raven position
js/meet-slot.js         "Spin to meet me": the three-reel slot of true facts in the About section
js/alpha-video-layer.js Mirrors the raven/skeleton WebM videos onto a <canvas> to keep their alpha
game/                   Copy of the playable demo, opened in a modal by any [data-play] link
assets/ossuary-reels/   Game art, raven/skeleton videos; img/ = screenshots used by the pages
assets/cv/              CV (PDF)
assets/og-image.jpg     Link preview image (LinkedIn, WhatsApp...)
favicon.svg             Tab icon (assets/apple-touch-icon.png for iOS)
```

## When the final beta lands

1. **Demo:** replace `game/` with the new build, without the DEBUG button or any
   diagnostics. Every Play button keeps working (they all use `[data-play]`).
2. **Screenshots:** overwrite the files in `assets/ossuary-reels/img/` keeping the
   same names and proportions (16:10, the big-win card 1:1). No HTML change.
3. **Hero video:** put a 10–15 s muted loop in `assets/ossuary-reels/video/` and set
   `MEDIA.heroVideo` at the top of `js/main.js`. The still stays as the poster.
4. **Trailer:** upload it to YouTube and set `MEDIA.trailerYouTube` to its id. Every
   "Watch the trailer" button appears and opens it in the modal.
5. **Feature clips:** on any figure image add
   `data-video="assets/ossuary-reels/video/clip.mp4" data-video-webm="....webm"`;
   it becomes a muted loop when it scrolls into view.
6. **Photo:** save a portrait (4:5) as e.g. `assets/photo/jon.webp` and set
   `MEDIA.photo` in `js/main.js`; it appears above "Hi, I'm Jon".
7. **Numbers:** when the fourth bonus ships, update "3 +1" in both game sheets,
   the case study and the CV.

Visitors with "reduce motion" turned on (Windows: Settings › Accessibility ›
Visual effects › Animation effects off) keep the still images; the "Spin to meet
me" reels still turn, just briefly.
