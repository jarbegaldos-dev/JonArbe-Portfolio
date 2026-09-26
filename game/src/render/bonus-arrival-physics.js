(function () {
  "use strict";

  // ArrivalPhysics: sustituye por completo al antiguo modelo de "masa" del
  // BONUS RIB (heavyDropEase + overshoot + correction + microsettle, ver
  // bonus-landing-weight-player.js, que ya NO calcula la posicion del
  // simbolo). Su unica responsabilidad es la posicion del BONUS durante el
  // tramo final de la deceleracion real del rodillo. No conoce RNG, outcome,
  // locks, RTP, ni toca reel.position/reel.velocity: solo LEE el estado real
  // del rodillo (reel.decelStartedAt, reel.decelDuration, reel.decelEndPosition)
  // y devuelve un offsetPx alternativo para el render del simbolo gigante.
  //
  // MODELO:
  //
  // 1. Mientras falten mas de BONUS_ARRIVAL_TAKEOVER_MS para el final de la
  //    deceleracion: ArrivalPhysics no hace nada. El BONUS usa el offset
  //    literal del rodillo, igual que cualquier otro simbolo.
  //
  // 2. En el instante en que faltan BONUS_ARRIVAL_TAKEOVER_MS, ArrivalPhysics
  //    toma el control. Captura: el offset literal en ese instante (punto de
  //    partida, continuidad garantizada), y el punto de llegada — calculado
  //    de forma cerrada usando reel.targetPosition (la posicion de REPOSO
  //    real del rodillo, el mismo sistema de referencia que usa el reel para
  //    su celda final; NUNCA reel.decelEndPosition, que es solo un punto de
  //    paso transitorio con el overshoot real del muelle todavia activo,
  //    ver BUGFIX ARRIVAL PHYSICS FINAL ALIGNMENT en giant-symbol-renderer.js).
  //    El tiempo real restante tambien se captura aqui (la duracion total de
  //    la deceleracion NUNCA se modifica, solo se redistribuye como llega la
  //    velocidad dentro de esta ventana final).
  //
  // 3. Durante esa ventana, en vez de interpolar POSICION, se interpola
  //    VELOCIDAD: un perfil de velocidad normalizada que conserva ~100% de
  //    la velocidad durante el primer BONUS_ARRIVAL_FULL_SPEED_FRACTION del
  //    tiempo restante, y concentra toda la frenada en el ultimo tramo
  //    (descenso suave a 0, sin redondear a un escalon). La posicion en
  //    cada instante es la integral exacta (forma cerrada) de ese perfil de
  //    velocidad, normalizada para que el desplazamiento total coincida
  //    EXACTAMENTE con la distancia entre el punto de partida y el punto de
  //    llegada capturados en el paso 2 — sin necesidad de snap ni correccion
  //    posterior, la sincronizacion es matematica por construccion.
  //
  // 4. Al llegar al final de la ventana (que coincide con el primer frame de
  //    "settling", transicion real reel.phase de "decelerating" a
  //    "settling") el BONUS ya esta exactamente en su posicion de reposo
  //    final (offset 0 respecto a la celda, por construccion: el punto de
  //    llegada capturado en el paso 2 usa la MISMA referencia,
  //    reel.targetPosition, que hace que reel.position == targetPosition
  //    en el offset 0 cuando el rodillo termina de asentarse). A partir de
  //    ahi el BONUS queda CONGELADO en ese valor para siempre: no hay
  //    overshoot, no hay rebote, no hay correccion, no hay micro-
  //    asentamiento. El muelle real del rodillo (settleSpringOffset en
  //    spin-engine.js) se sigue aplicando a reel.position (para el resto del
  //    rodillo/simbolos normales, que SI pasan brevemente por el overshoot
  //    antes de relajarse) pero el BONUS ya no lo lee nunca: llega
  //    directamente a su posicion de reposo, sin pasar por el overshoot.

  function createBonusArrivalPhysics(options) {
    var config = (options && options.config) || window.BONUS_LANDING_WEIGHT_CONFIG || {};

    function isEnabled() {
      return config.BONUS_LANDING_WEIGHT_ENABLED !== false;
    }

    function takeoverMs() {
      return config.BONUS_ARRIVAL_TAKEOVER_MS || 0;
    }

    function fullSpeedFraction() {
      var f = config.BONUS_ARRIVAL_FULL_SPEED_FRACTION;
      return (f == null) ? 0.8 : f;
    }

    // Integral normalizada (0..1) del perfil de velocidad en funcion de la
    // fraccion de tiempo t (0..1) transcurrida dentro de la ventana de
    // ArrivalPhysics. El perfil de VELOCIDAD (no de posicion) es:
    //   - constante (=1) durante [0, p]
    //   - decae suavemente a 0 durante (p, 1], como (1-u)^2 con
    //     u=(t-p)/(1-p): empieza a frenar fuerte justo despues de p y
    //     termina en velocidad exactamente 0 en t=1 (sin escalon final).
    // cumulativeFraction(t) es la primitiva de ese perfil, normalizada por
    // su integral total, asi que cumulativeFraction(0)=0 y
    // cumulativeFraction(1)=1 SIEMPRE, sea cual sea p. Multiplicada por la
    // distancia total (start->end) da la posicion exacta en cada instante.
    function cumulativeFraction(t, p) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;

      var totalIntegral = p + (1 - p) / 3;

      if (t <= p) {
        return (t) / totalIntegral;
      }

      var u = (t - p) / (1 - p);
      var tailIntegral = (1 - p) / 3 * (1 - Math.pow(1 - u, 3));
      return (p + tailIntegral) / totalIntegral;
    }

    // Velocidad instantanea normalizada (0..1, relativa a la velocidad de
    // crucero de la ventana) en la fraccion de tiempo t. Solo para
    // instrumentacion/validacion (ver bonus-arrival-physics-debug en
    // PROJECT_STATE.md): no se usa para calcular la posicion (que sale de
    // la forma cerrada de cumulativeFraction), pero permite demostrar con
    // datos que el perfil de velocidad es el pedido.
    function speedFraction(t, p) {
      if (t <= p) return 1;
      var u = (t - p) / (1 - p);
      return Math.max(0, 1 - u * u);
    }

    // reel.bonusArrival* son el unico estado que este modulo guarda, y vive
    // colgado del propio objeto reel (igual que reel.decelStartedAt etc.):
    // no hay closures compartidos entre rodillos, cada BONUS RIB tiene su
    // propia ventana de llegada independiente.
    function reset(reel) {
      reel.bonusArrivalActive = false;
      reel.bonusArrivalLocked = false;
      reel.bonusArrivalStartAt = null;
      reel.bonusArrivalStartOffsetPx = null;
      reel.bonusArrivalEndOffsetPx = null;
      reel.bonusArrivalDurationMs = null;
      reel.bonusArrivalStructureTriggered = false;
    }

    // Punto de entrada llamado en cada frame mientras reel.phase ===
    // "decelerating". literalOffsetPx es el offset que tendria el simbolo
    // siguiendo reel.position al pie de la letra (igual que cualquier otro
    // simbolo), calculado por el llamador. endOffsetPx es ese mismo calculo
    // pero evaluado en reel.decelEndPosition (el valor que tomara
    // reel.position exactamente al terminar la deceleracion, antes de
    // entrar en el muelle de settling) — tambien lo calcula el llamador,
    // porque solo el conoce block.refPosition/SYMBOL_STEP_PERCENT/scrollSign.
    // remainingMs es real: (decelStartedAt + decelDuration) - now.
    //
    // Devuelve null mientras no toca intervenir (el llamador debe usar el
    // offset literal sin modificar). Devuelve un numero (px) en cuanto
    // ArrivalPhysics tiene el control.
    function arrivalOffsetPx(reel, now, literalOffsetPx, endOffsetPx, remainingMs) {
      if (!isEnabled()) return null;

      if (!reel.bonusArrivalActive) {
        if (remainingMs > takeoverMs()) return null;

        reel.bonusArrivalActive = true;
        reel.bonusArrivalStartAt = now;
        reel.bonusArrivalStartOffsetPx = literalOffsetPx;
        reel.bonusArrivalEndOffsetPx = endOffsetPx;
        // Ventana real restante en el instante de la toma de control: NO se
        // fija a takeoverMs() a pelo (el frame que detecta el cruce del
        // umbral casi nunca cae justo en remainingMs===takeoverMs()), para
        // no alargar ni acortar la duracion total de la deceleracion real.
        reel.bonusArrivalDurationMs = Math.max(remainingMs, 1);
      }

      var elapsed = now - reel.bonusArrivalStartAt;
      var t = Math.min(1, Math.max(0, elapsed / reel.bonusArrivalDurationMs));
      var p = fullSpeedFraction();
      var frac = cumulativeFraction(t, p);
      var start = reel.bonusArrivalStartOffsetPx;
      var end = reel.bonusArrivalEndOffsetPx;

      return start + (end - start) * frac;
    }

    // Llamado en el primer frame de "settling": congela el BONUS para
    // siempre en el valor exacto al que llego ArrivalPhysics (== posicion
    // literal del rodillo en ese mismo instante, ver arrivalOffsetPx). No
    // hay overshoot/correction/microsettle/rebound: el valor no vuelve a
    // cambiar hasta el siguiente spin.
    function lockArrival(reel) {
      reel.bonusArrivalLocked = true;
      return reel.bonusArrivalEndOffsetPx != null ? reel.bonusArrivalEndOffsetPx : 0;
    }

    function lockedOffsetPx(reel) {
      return reel.bonusArrivalEndOffsetPx != null ? reel.bonusArrivalEndOffsetPx : 0;
    }

    // --- Solo para instrumentacion/validacion (no usado en runtime) ------
    function debugSample(reel, now) {
      if (!reel.bonusArrivalActive) return null;
      var elapsed = now - reel.bonusArrivalStartAt;
      var t = Math.min(1, Math.max(0, elapsed / reel.bonusArrivalDurationMs));
      var p = fullSpeedFraction();
      var distance = reel.bonusArrivalEndOffsetPx - reel.bonusArrivalStartOffsetPx;
      var speedNorm = speedFraction(t, p);
      var totalIntegral = p + (1 - p) / 3;
      var instantSpeedPxPerMs = (distance * speedNorm / totalIntegral) / reel.bonusArrivalDurationMs;
      return {
        t: t,
        offsetPx: arrivalOffsetPx(reel, now, reel.bonusArrivalStartOffsetPx, reel.bonusArrivalEndOffsetPx, reel.bonusArrivalDurationMs - elapsed),
        instantSpeedPxPerMs: instantSpeedPxPerMs
      };
    }

    return {
      reset: reset,
      arrivalOffsetPx: arrivalOffsetPx,
      lockArrival: lockArrival,
      lockedOffsetPx: lockedOffsetPx,
      debugSample: debugSample
    };
  }

  window.OssuaryBonusArrivalPhysics = {
    create: createBonusArrivalPhysics
  };
})();
