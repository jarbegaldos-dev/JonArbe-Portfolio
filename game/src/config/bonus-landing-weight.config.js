(function () {
  "use strict";

  // Configuracion pura del aterrizaje del simbolo gigante BONUS RIB. Solo
  // afecta a la capa visual del giant element + la estructura del reel
  // layer; nunca a reel.position, RNG, outcome, locks, RTP ni al motor de
  // spin real (src/core/spin-engine.js).
  //
  // REPLACE BONUS LANDING PHYSICS: el antiguo modelo de "masa" del propio
  // simbolo (curva heavyDropEase con overshoot/hold/correction/microsettle,
  // ver historial de este archivo) ha sido eliminado por completo. La
  // posicion del BONUS durante el aterrizaje ahora la calcula
  // exclusivamente ArrivalPhysics (BONUS_ARRIVAL_*, ver
  // src/render/bonus-arrival-physics.js). La energia visual del golpe en si
  // sigue perteneciendo unicamente a la reaccion de la estructura completa
  // (BONUS_STRUCTURE_REACTION_*, sin cambios), nunca al simbolo ni a una
  // vibracion repartida por elemento.
  window.BONUS_LANDING_WEIGHT_CONFIG = {
    BONUS_LANDING_WEIGHT_ENABLED: true,

    // --- ArrivalPhysics: posicion del BONUS durante la fase final de la
    // deceleracion real (ver src/render/bonus-arrival-physics.js) ---------
    //
    // Tiempo (ms), antes de que termine la deceleracion real del rodillo,
    // en el que ArrivalPhysics toma el control del BONUS. Antes de este
    // instante el BONUS usa el offset literal de reel.position igual que
    // cualquier otro simbolo (sin curva propia).
    BONUS_ARRIVAL_TAKEOVER_MS: 120,
    // Fraccion (0..1) del tiempo restante en la que el BONUS conserva
    // practicamente toda su velocidad; el resto (1-fraccion) concentra
    // toda la frenada. No cambia la duracion total de la deceleracion,
    // solo redistribuye cuando llega la perdida de velocidad dentro de la
    // ventana de ArrivalPhysics.
    BONUS_ARRIVAL_FULL_SPEED_FRACTION: 0.8,

    // --- Reaccion de la ESTRUCTURA completa (rodillos + marco/fondo) -----
    // COMPRESION, no traslacion: el efecto dominante no es "la maquina
    // baja" sino "la maquina se aplasta bajo una carga enorme". La
    // traslacion (BONUS_STRUCTURE_REACTION_PX) es solo un apoyo casi
    // imperceptible de 2px; el protagonista es BONUS_STRUCTURE_REACTION_SCALE_Y,
    // una compresion vertical de solo 0.5% (scaleY 1.000 -> 0.995 -> 1.000)
    // aplicada con transform-origin:center sobre TODO el bloque rigido
    // (machineBlockEls en giant-symbol-renderer.js: caja toracica + rodillos
    // + marco), nunca solo sobre un rodillo o el BONUS. Debe ser
    // practicamente imperceptible de forma consciente (no debe leerse como
    // un zoom): se siente, no se ve.
    // Dos tramos sin HOLD largo: impulso con impactSnapEase (concava, ~90%
    // del recorrido en el primer tercio) y retorno con easeOutQuad
    // (decelerando, sin rebote/overshoot/oscilacion). Pico en 8-12ms, hold
    // corto 20-30ms, recuperacion 90-120ms. Retrasada respecto al instante
    // en que el BONUS queda clavado, para que se lea como "la energia viaja
    // del BONUS a la maquina", nunca simultaneo.
    // Pequeño "cargar peso" previo al impacto real: la estructura se ensancha
    // y agranda apenas unas milésimas antes de que rib1 termine de caer.
    BONUS_STRUCTURE_PRE_SCALE_MS: 46,
    BONUS_STRUCTURE_PRE_SCALE: 0.00658125,
    BONUS_STRUCTURE_REACTION_DELAY_MS: 4,
    BONUS_STRUCTURE_REACTION_PX: 2,
    BONUS_STRUCTURE_REACTION_SCALE_Y: 0.005,
    BONUS_STRUCTURE_REACTION_RISE_MS: 10,
    BONUS_STRUCTURE_REACTION_HOLD_MS: 24,
    BONUS_STRUCTURE_REACTION_RETURN_MS: 105
  };
})();
