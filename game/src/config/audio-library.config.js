// Generado por sound-lab/bake.js: no editar a mano (se reescribe).
// Biblioteca de sonidos del laboratorio (assets/audio/library). Se cargan al
// pedirlos (preload false) y se escuchan en DEBUG > Galeria de audio. Para
// usar uno en el juego, una regla en audio-rules.config.js con su id
// ("lib-" + id), por ejemplo { sound: "lib-epic-hit-orchestra" }.
(function () {
  "use strict";
  if (!window.OSSUARY_AUDIO_SOUNDS) return;
  var FAMILIES = {
    "tension": {"title":"Tension","bus":"BONUS"},
    "epic": {"title":"Golpes epicos","bus":"BONUS"},
    "hits": {"title":"Golpes secos","bus":"SYMBOLS"},
    "metal": {"title":"Metal, cadenas y mecanismos","bus":"SYMBOLS"},
    "whoosh": {"title":"Pasadas","bus":"SYMBOLS"},
    "coins": {"title":"Monedas y premios","bus":"SYMBOLS"},
    "magic": {"title":"Magia oscura","bus":"BONUS"},
    "stings": {"title":"Remates musicales","bus":"BONUS"},
    "music": {"title":"Melodias y fondos","bus":"BONUS"}
  };
  [
    ["blade-draw","metal","Guillotina: armar","Cuchilla deslizandose y trinquete de metal",1.4,0,"mp3"],
    ["blade-fall","whoosh","Guillotina: caida","Barrido corto de hoja pesada antes del impacto",0.75,0,"mp3"],
    ["blade-cut-bone","hits","Guillotina: corte con hueso","Corte, golpe de carne y rotura de hueso",2.2,0,"mp3"],
    ["blade-cut-metal","hits","Guillotina: corte metalico","Hoja, yunque y golpe metalico para corte de simbolo",2.4,0,"mp3"],
    ["chain-pull","metal","Cadena: tiron","Cadena corta con peso y roce metalico",1.28,0,"mp3"],
    ["chain-drop","metal","Cadena: caida","Cadena pesada sobre suelo de piedra",2.2,0,"mp3"],
    ["stone-strike","hits","Piedra: impacto","Golpe de roca y gravilla",2.6,0,"mp3"],
    ["bone-break","hits","Huesos: crujido","Rotura breve y seca",0.79,0,"mp3"],
    ["chest-unlock","metal","Cofre: girar llave","Mecanismo profundo y clic de pestillo",0.59,0,"mp3"],
    ["chest-open","metal","Cofre: abrir","Cerradura, tapa que cruje y campana grave",2.3,0,"mp3"],
    ["roulette-tick","metal","Cofre-ruleta: paso","Clic de mecanismo para una muesca de ruleta",0.42,0,"mp3"],
    ["roulette-stop","hits","Cofre-ruleta: parada","Freno metalico con piedra y campana",0.76,0,"mp3"],
    ["coin-small","coins","Premio: monedas","Monedas en mano, breve y seco",0.75,0,"mp3"],
    ["coin-big","coins","Premio grande: monedas","Monedas y golpe de campana",1.35,0,"mp3"],
    ["raven-wing","whoosh","Raven: ala","Barrido de tela, solo movimiento de ala; sin graznido",0.95,0,"mp3"],
    ["execution-entry","stings","Execution: entrada","Caida de hoja y golpe cinematografico grave",3,0,"mp3"],
    ["juicio-entry","stings","El Juicio: entrada","Cerradura, golpe monumental y campana",3.1,0,"mp3"],
    ["juicio-seal","magic","El Juicio: sello","Pulso magico oscuro con cierre metalico",2.7,0,"mp3"],
    ["curse-pulse","magic","Maldicion: pulso","Energia tenue para multiplicador o marca de sangre",2.5,0,"mp3"],
    ["raven-omen","magic","Raven: presagio","Barrido de ala sobre tension oscura; no es un graznido",2.4,0,"mp3"],
    ["bonus-transition","whoosh","Bonus: transicion","Barrido de aire seguido de golpe seco",1.46,0,"mp3"],
    ["bonus-exit","stings","Bonus: final","Puerta que se cierra y golpe final amortiguado",2.2,0,"mp3"],
    ["candle-relight","magic","Execution: vela que vuelve","Cerilla que prende y llamarada grave de fuego; para cada vela repuesta",1.7,0,"mp3"],
    ["music-tension-ostinato","music","Ostinato de tension (bucle)","Chelos y contrabajo en corcheas sobre Re con tremolo de violas y timbal suave; 4 compases a 120, se repite sin corte",8,1,"ogg"],
    ["music-tension-build","music","Tension que sube (6 s)","El ostinato en semicorcheas mientras las cuerdas suben por semitonos y el plato crece; acaba arriba, listo para un golpe",6.02,0,"mp3"],
    ["music-crypt-theme","music","Tema de la cripta (bucle)","Melodia lenta de violines en Re menor sobre organo suave, arpa y pizzicato; 4 compases a 72, se repite sin corte",13.33,1,"ogg"],
    ["music-bonus-drums","music","Tambores del bonus (bucle)","Tambor grande, timbales y bombo con chelos en corcheas y golpes de trompa; 2 compases a 130, se repite sin corte",3.69,1,"ogg"],
    ["music-crypt-theme-long","music","Tema de la cripta, largo (bucle)","El tema de la cripta en 16 compases a 72: entrada sin melodia, la melodia de violines, un puente en Sol menor con los chelos y la melodia otra vez con violas; se repite sin corte",53.33,1,"ogg"],
    ["music-crypt-theme-var","music","Tema de la cripta con variacion (bucle)","El tema largo de la cripta (53 s) y una segunda pasada de 40 s con arpa en tresillos, pizzicato sincopado y tambor grande muy suave; 28 compases a 72, se repite sin corte",93.33,1,"ogg"],
    ["music-execution-ritual","music","Ritual de la ejecucion (bucle)","Tambores grandes, timbales y bombo sobre un pedal de chelos y contrabajos en Re (acentos 3+3+2) con golpes secos de metales; sin melodia. 24 compases a 120: pulso, golpes, bajada con tremolo, todo, medio tiempo y vuelta con redoble",48,1,"ogg"],
    ["music-exec-waltz","music","Lamento de la guillotina (bucle)","Cama de cuerdas graves en Re menor con el bajo bajando por semitonos (septimas disminuidas, sexta aumentada, napolitana) y un lamento lento en el clarinete grave; sin percusion; 32 compases de 3/4 a 132, se repite sin corte. Capa base del Execution",43.64,1,"ogg"],
    ["music-exec-waltz-l1","music","Lamento: inquietud (capa 1)","Tremolo suave de violas en el acorde; mismo bucle",43.64,1,"ogg"],
    ["music-exec-waltz-l2","music","Lamento: pulso (capa 2)","Corcheas graves de chelos en spiccato y contrabajo en el 1; mismo bucle",43.64,1,"ogg"],
    ["music-exec-waltz-l3","music","Lamento: violines (capa 3)","El lamento en violines y un contracanto de violas por semitonos; mismo bucle",43.64,1,"ogg"],
    ["music-exec-waltz-l4","music","Lamento: metales largos (capa 4)","Trompas en el acorde y trombones en quintas, notas largas; mismo bucle",43.64,1,"ogg"],
    ["music-exec-waltz-l5","music","Lamento: climax (capa 5)","Tremolo agudo de violines, violas en corcheas y tuba larga; mismo bucle",43.64,1,"ogg"],
    ["music-exec-waltz-l6","music","Lamento: racimos (capa 6)","Racimos de violines en tremolo que suben medio tono cada dos compases y corcheas graves con acento; mismo bucle",43.64,1,"ogg"],
    ["music-exec-waltz-l7","music","Lamento: tutti (capa 7)","El lamento en todas las cuerdas a la octava con trompas y trompetas, todo largo; mismo bucle",43.64,1,"ogg"],
    ["music-tension-ostinato-long","music","Ostinato de tension, largo (bucle)","El ostinato del Execution en 16 compases a 120: solo, con violines y trompas, un tramo en Si bemol y Sol con trombones y la vuelta a Re con redoble de timbal; se repite sin corte",32,1,"ogg"],
    ["music-lullaby-eerie","music","Nana inquietante (bucle)","Arpa sola con una melodia de cuna en Re menor sobre salterio con arco; lenta, para menus o esperas; se repite sin corte",14.55,1,"ogg"],
    ["tension-swell-quick","tension","Oleada rapida (1 s)","Chelos y violas en tremolo con el plato que crece 1 s y para arriba; la tension sutil y corta",1.02,0,"mp3"],
    ["tension-riser-2s","tension","Subida de cuerdas (2 s)","Tremolos que entran de grave a agudo (Re, Mi bemol, Re alto) con plato y bombo que crecen 2 s",2.02,0,"mp3"],
    ["tension-riser-4s","tension","Subida de cuerdas (4 s)","Como la de 2 s pero mas larga, con contrabajo y un redoble de timbal debajo",4.02,0,"mp3"],
    ["tension-bed","tension","Fondo de tension (bucle)","Cuerdas en tremolo muy suaves en racimo (Re, Mi bemol) con contrabajo grave; se repite sin corte",6,1,"ogg"],
    ["tension-gong-reverse","tension","Gong al reves","Gong fuerte tocado al reves: crece 2.5 s y se corta de golpe, para que entre algo encima",2.5,0,"mp3"],
    ["tension-timpani-roll","tension","Redoble de timbal (3 s)","Redoble de timbal en Re que crece 3 s con el bombo debajo; acaba arriba",3,0,"mp3"],
    ["epic-hit-orchestra","epic","Golpe de orquesta","Toda la orquesta a la vez en Re menor (metales cortos, timbal, bombo, gong y plato) en una sala grande",3.2,0,"mp3"],
    ["epic-braam-orchestra","epic","Braam de metales","Trompas, trombones y tuba graves a tope en Re con contrabajo, saturados, con bombo y gong: el BRAAM de trailer",4.2,0,"mp3"],
    ["epic-gong-crash","epic","Plato al reves y gong","Plato que crece al reves 1.5 s y revienta en gong, bombo y timbal",5,0,"mp3"],
    ["epic-anvil-strike","epic","Yunque y bombo","Golpe de yunque con bombo y timbal en una cripta: metal pesado, para la cuchilla",2.6,0,"mp3"],
    ["epic-timpani-dadum","epic","Ta-DUM de timbales","Dos golpes de timbal (La grave y Re) con bombo en el segundo: anuncio corto",2.4,0,"mp3"],
    ["epic-taiko-hits","epic","Tambor grande x3","Tres golpes de tambor grande (tipo taiko) que crecen, el ultimo con timbal y bombo",2.8,0,"mp3"],
    ["sting-bonus-trigger","stings","Entra el bonus","Redoble de timbal y plato que crecen 1.4 s y golpe de toda la orquesta en Re menor con gong",4.2,0,"mp3"],
    ["sting-win-small","stings","Premio pequeno","Arpegio de arpa y pizzicato que sube (Re menor), corto y discreto",2.2,0,"mp3"],
    ["sting-win-medium","stings","Premio mediano","Arpegio de pizzicato y arpa que sube y acaba en acorde de trompas en Re mayor con timbal",3.2,0,"mp3"],
    ["sting-win-big","stings","Premio grande","Fanfarria de trompas sobre trombones y timbales: Re menor, Si bemol y final en Re mayor con plato",5.5,0,"mp3"],
    ["sting-win-epic","stings","Premio enorme","Redoble que crece y dos golpes de toda la orquesta (Si bemol, Re mayor) con gong; para un BIG WIN",5.2,0,"mp3"],
    ["sting-lose","stings","Bajon (no hay premio)","Caida de trombon y pizzicato grave: un 'nada' corto y apagado",2,0,"mp3"],
    ["sting-near-miss","stings","Casi (amago)","Cuerdas en tremolo que suben 0.7 s y se cortan en un pizzicato grave: el 'uff, casi'",2,0,"mp3"],
    ["sting-dread","stings","Amenaza","Racimo grave de metales y cuerdas (Re y Mi bemol) que crece 2 s y se corta en un golpe de bombo",3.4,0,"mp3"],
    ["sting-crypt-reveal","stings","Se abre la cripta","Acorde de organo en Re menor con campana tubular y gong suave, en una catedral",6,0,"mp3"],
    ["sting-bell-toll","stings","Toque de difuntos","Campana tubular grave dos veces (Re, La) sobre organo de pedal, lejana",7,0,"mp3"],
    ["sting-free-spins","stings","Tiradas gratis","Arpa en cascada hacia arriba con cuerdas en tremolo que se abren a Re mayor",4.5,0,"mp3"]
  ].forEach(function (row) {
    var f = FAMILIES[row[1]];
    window.OSSUARY_AUDIO_SOUNDS.push({
      id: "lib-" + row[0], category: "gallery", file: "assets/audio/library/" + row[1] + "/" + row[0] + "." + row[6],
      bus: f.bus, volume: 0.8, priority: 40, loop: !!row[5], preload: false, cooldown: 0, fade: { inMs: 0, outMs: 150 }, pool: 2,
      playbackRate: 1, pitch: 1, delay: 0, weight: 1, tags: ["gallery", "library", row[1]], enabled: true,
      gallery: "Biblioteca: " + f.title, label: row[2], title: row[3] + " (" + row[4] + " s)"
    });
  });
})();
