/* Language control shared by both portfolio pages. */
(function () {
  'use strict';
  var host = document.getElementById('portfolio-language');
  if (!host) return;
  var status = document.getElementById('language-status');
  window.portfolioTranslateReady = function () {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'en,es,ja',
      autoDisplay: false,
      layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'portfolio-language');
    status.hidden = true;
  };
  var script = document.createElement('script');
  script.src = 'https://translate.google.com/translate_a/element.js?cb=portfolioTranslateReady';
  script.async = true;
  script.onerror = function () {
    status.textContent = 'Translation unavailable. Please try again later.';
    status.hidden = false;
  };
  document.body.appendChild(script);
})();
