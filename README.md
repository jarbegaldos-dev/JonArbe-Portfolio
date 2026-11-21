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
css/brand.css           Brand layer on top of style.css (ink, bone, blood & brass; toe-tag labels, ledger numbers)
js/portfolio-content.js Shared release content and optional media
js/main.js              Demo/trailer modal, video upgrades, nav, reveal, subnav, raven position
js/meet-slot.js         "Spin to meet me": the three-reel slot of true facts in the About section
js/alpha-video-layer.js Mirrors the raven/skeleton WebM videos onto a <canvas> to keep their alpha
game/                   Copy of the playable demo, opened in a modal by any [data-play] link
assets/ossuary-reels/   Game art, raven/skeleton videos; img/ = screenshots used by the pages
assets/cv/              CV (PDF)
assets/og-image.jpg     Link preview image (LinkedIn, WhatsApp...)
favicon.svg             Tab icon (assets/apple-touch-icon.png for iOS)
```

## Portfolio structure and release updates

The portfolio focuses on art direction, mechanics and game feel across games. Ossuary Reels is presented as an independent project in development.

Read [ACTUALIZAR-PORTFOLIO.md](ACTUALIZAR-PORTFOLIO.md) for the full update workflow. Shared release status, demo URL, gallery images and optional media are configured in `js/portfolio-content.js`; `main.js` reads that configuration. Keep the HTML fallback text in sync when changing the project status.

Home order: introduction → selected work → art direction gallery → design principles → About → contact. The case study adds a dedicated art direction section and keeps provisional slot specifications in a disclosure.

Existing images remain development material. Update the final demo, art, credits, measured results and CV when ready. No build step is required.
