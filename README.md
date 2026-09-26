# Jon Arbe — Game Designer Portfolio

Static HTML/CSS/JS portfolio site. No build step, no dependencies.

## Run locally

Any static file server works. For example:

```bash
npx serve .
```

or with Python:

```bash
python -m http.server 8080
```

Then open the printed local URL (e.g. `http://localhost:8080`).

## Structure

```
index.html              Home — hero, statement, selected work, about, contact
guillotine-reels.html   Guillotine Reels case study (structured, placeholders)
css/style.css           Design system: tokens, typography, components, animations
js/main.js              Nav behavior, scroll reveal, case study subnav, Play Demo config
assets/                 Reserved for future images/video
```

## Configuring "Play Demo"

Set `PLAY_DEMO_URL` at the top of `js/main.js` once the live Guillotine Reels
build has a public URL. Until then, the button is visibly present but inert
(logs a console note instead of navigating).

## Status / Next phase

- Real photography/video for the Guillotine Reels project card and case study
  media placeholders.
- Case study copy for all 11 sections (currently structured with `[Placeholder]` text only).
- About section content (bio, philosophy, tools/skills, experience).
- Real Email / LinkedIn / GitHub / CV links in Contact.
- `PLAY_DEMO_URL` once the game has a public deployment.
