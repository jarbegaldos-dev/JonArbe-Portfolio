/* Release content shared by the home page and case study. Keep relative URLs repository-safe. */
window.PORTFOLIO = {
  "status": "Playable prototype \u00b7 in development",
  "note": "The case study covers the current development build. The linked demo is a separate snapshot. Artwork and math are still in development.",
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
      "src": "assets/ossuary-reels/showcase/gameplay-desktop.jpg",
      "alt": "Development screenshot of the wooden reel machine and its interface"
    },
    "atmosphere": {
      "src": "assets/ossuary-reels/showcase/execution-round-1.jpg",
      "alt": "The Execution Bonus on the playable board"
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
