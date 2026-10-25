/* Release content shared by the home page and case study. Keep relative URLs repository-safe. */
window.PORTFOLIO = {
  "status": "In development \u00b7 earlier playable build",
  "note": "Solo prototype in development. The public demo is an earlier build; design notes and images can show later revisions. Code and visual development are AI-assisted. Economy targets are not validated results.",
  "gameUrl": "game/index.html",
  "heroVideo": null,
  "trailerYouTube": null,
  "photo": null,
  "images": {
    "concept": {
      "src": "assets/ossuary-reels/img/ribcage-concept.webp",
      "alt": "Early ribcage concept defining the silhouette of the reel board"
    },
    "board": {
      "src": "assets/ossuary-reels/img/game-base-hud.webp",
      "alt": "Development screenshot of the wooden reel machine and its interface"
    },
    "atmosphere": {
      "src": "assets/ossuary-reels/img/atmosphere.webp",
      "alt": "Storm over the machine during the Execution Bonus"
    }
  }
};
(function () {
  'use strict';
  var content = window.PORTFOLIO;
  document.querySelectorAll('[data-project-status]').forEach(function (el) { el.textContent = content.status; });
  document.querySelectorAll('[data-project-note]').forEach(function (el) { el.textContent = content.note; });
  document.querySelectorAll('[data-portfolio-image]').forEach(function (el) {
    var entry = content.images[el.getAttribute('data-portfolio-image')];
    if (!entry || !entry.src) return;
    el.src = entry.src;
    el.alt = entry.alt || '';
  });
})();

