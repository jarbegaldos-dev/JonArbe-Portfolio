(function(){'use strict';
var host=document.getElementById('portfolio-language');if(!host)return;
var buttons=document.querySelectorAll('[data-language]'),status=document.getElementById('language-status'),wanted='en';
try{wanted=localStorage.getItem('portfolio-language')||'en';}catch(e){}
function mark(){buttons.forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.language===wanted));});}
function apply(){var combo=host.querySelector('select.goog-te-combo');if(!combo)return false;combo.value=wanted;combo.dispatchEvent(new Event('change',{bubbles:true}));return true;}
buttons.forEach(function(b){b.addEventListener('click',function(){wanted=b.dataset.language;try{localStorage.setItem('portfolio-language',wanted);}catch(e){}mark();if(!apply()){status.hidden=false;status.textContent='Loading translation…';}});});
window.portfolioTranslateReady=function(){new google.translate.TranslateElement({pageLanguage:'en',includedLanguages:'en,es,ja',autoDisplay:false},'portfolio-language');var attempts=0;var timer=setInterval(function(){if(apply()){clearInterval(timer);status.hidden=true;}else if(++attempts>40){clearInterval(timer);status.hidden=false;status.textContent='Translation unavailable. Please reload.';}},250);};
mark();var script=document.createElement('script');script.src='https://translate.google.com/translate_a/element.js?cb=portfolioTranslateReady';script.async=true;script.onerror=function(){status.textContent='Translation unavailable. Please reload.';status.hidden=false;};document.body.appendChild(script);
})();