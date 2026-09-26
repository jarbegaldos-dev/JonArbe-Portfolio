(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // FUENTE DE NUMEROS DE PAGO — SOLO VISUAL.
  //
  // Pinta una cadena numerica (p.ej. "€1,250.00") usando las imagenes de oro
  // recortadas de assets/fonts/numbers/0.png..9.png para los DIGITOS; el resto
  // de caracteres (€ , . espacio) se quedan como texto con la fuente base para
  // no inventar glifos que no existen en el asset.
  //
  // Las diez imagenes comparten alto y linea base, asi que basta con fijarles
  // una altura comun (height) y se alinean solas. render(el, text) reconstruye
  // el contenido de `el`; el tamaño se controla por CSS (--num-digit-height o
  // font-size del contenedor, ver .ossuary-number-font en style.css).
  // ---------------------------------------------------------------------------

  var BASE_PATH = "assets/fonts/numbers/";
  var cache = {};

  // Precarga las diez imagenes para que el primer pago no parpadee.
  function preload() {
    for (var d = 0; d < 10; d++) {
      if (cache[d]) continue;
      var img = new Image();
      img.src = BASE_PATH + d + ".png";
      cache[d] = img;
    }
  }

  // Reemplaza el contenido de `el` por la representacion de `text`. Los digitos
  // se vuelven <img class="ossuary-number-font__digit">; lo demas, <span>.
  function render(el, text) {
    if (!el) return;
    el.classList.add("ossuary-number-font");
    var str = String(text == null ? "" : text);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch >= "0" && ch <= "9") {
        var img = document.createElement("img");
        img.className = "ossuary-number-font__digit";
        img.src = BASE_PATH + ch + ".png";
        img.alt = ch;
        img.draggable = false;
        frag.appendChild(img);
      } else {
        var span = document.createElement("span");
        span.className = "ossuary-number-font__sym";
        // Espacio real para que no colapse en el layout inline.
        span.textContent = ch === " " ? " " : ch;
        frag.appendChild(span);
      }
    }
    el.replaceChildren(frag);
  }

  window.OssuaryNumberFont = {
    preload: preload,
    render: render
  };
})();
