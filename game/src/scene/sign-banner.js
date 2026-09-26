// Letrero colgante "Ossuary Reels": capa visual independiente, no forma
// parte de los reels, el fondo ni la caja toracica. Se monta directamente
// sobre #slotStage, por encima de la estructura osea, y reproduce su video
// con alpha en loop automatico desde la carga del juego.
(function () {
  "use strict";

  function mountSignBanner() {
    var stage = document.getElementById("slotStage");
    if (!stage) {
      console.warn("[OssuarySignBanner] #slotStage not found, mount skipped.");
      return;
    }

    var wrapper = document.createElement("div");
    wrapper.id = "signBanner";
    wrapper.className = "sign-banner";
    wrapper.setAttribute("aria-hidden", "true");

    var video = document.createElement("video");
    video.className = "sign-banner__video";
    video.src = "assets/effects/sign_logo_alpha.webm";
    video.muted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-hidden", "true");

    wrapper.appendChild(video);
    stage.appendChild(wrapper);

    var playResult = video.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(function () {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountSignBanner);
  } else {
    mountSignBanner();
  }
})();
