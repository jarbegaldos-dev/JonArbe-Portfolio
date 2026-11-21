# Actualizar el portfolio

La estructura presenta a Jon como Game Designer con foco en dirección artística, mecánicas y game feel. Ossuary Reels es un proyecto, no la definición de todo su perfil. La web sigue siendo HTML/CSS/JS estático en GitHub Pages; no necesita compilación.

## Qué editar ahora

- `index.html`: presentación, trabajo seleccionado, galería de dirección artística, principios, About y contacto. Las tres tarjetas de Art direction / Mechanics / Game feel son perspectivas del mismo proyecto.
- `ossuary-reels.html`: idea, dirección artística, tablero, mecánicas, sensaciones, iteración y notas de desarrollo. Las especificaciones de slots quedan en un desplegable secundario.
- `js/portfolio-content.js`: estado del proyecto, aviso compartido, URL de la demo, imágenes de la galería, tráiler, vídeo de cabecera y foto opcional. Se ejecuta antes de `main.js`. El HTML contiene contenido de respaldo para visitantes sin JavaScript.

Se conserva el arte existente como material de desarrollo. No se han inventado proyectos, dibujos, métricas ni créditos individuales. Antes de presentar una imagen como ilustración propia, indicar su autoría real y, cuando corresponda, las herramientas utilizadas.

## Al terminar Ossuary Reels

1. Sustituir la carpeta `game/` por la build final y verificar sus rutas en el subdirectorio de GitHub Pages. No mezclar scripts de versiones distintas. También se puede cambiar `gameUrl` si el juego pasa a otro destino compatible con el iframe.
2. Actualizar `status` y `note` en `js/portfolio-content.js`. Mantener el texto de respaldo de ambos HTML coherente. Eliminar los avisos de provisionalidad solo cuando dejen de ser ciertos.
3. Cambiar las rutas y los textos alternativos en `images`. Las claves `concept`, `board` y `atmosphere` alimentan la galería; `atmosphere` también alimenta la sección artística del caso. Mantener el concepto temprano si permite explicar el proceso, aunque haya arte final nuevo.
4. Para las demás capturas, reemplazar los archivos actuales en `assets/ossuary-reels/img/` conservando los nombres o actualizar sus referencias HTML. Cabecera, póster y tarjetas siguen siendo elementos editoriales del HTML. Si cambian las dimensiones reales, actualizar width/height para evitar saltos de layout.
5. Activar `heroVideo` con `{ mp4: 'assets/ossuary-reels/video/hero-loop.mp4', webm: 'assets/ossuary-reels/video/hero-loop.webm' }` y `trailerYouTube` con el ID del vídeo. Mantenerlos a null si no hay material listo. `photo` admite una ruta a una foto propia.
6. Para clips de features, añadir `data-video="ruta.mp4"` y opcionalmente `data-video-webm="ruta.webm"` a la imagen correspondiente. El código existente conserva la imagen cuando se solicita movimiento reducido.
7. Revisar cada regla y cada cifra del caso contra la build publicada. Separar objetivos y resultados; añadir método, versión y fecha para resultados medidos. No convertir automáticamente el 98% objetivo en RTP validado.
8. Reemplazar los textos “in development”, “earlier build”, “provisional” y “next beta” solo donde corresponda. Revisar títulos, descripciones sociales, créditos, CV y capturas.
9. Añadir dos comparaciones reales del proceso: una decisión artística y una de mecánicas o timing. Usar imágenes/clip, problema, elección y resultado; no inventar pruebas de usuario.
10. Verificar escritorio y móvil, navegación por teclado, demo en iframe y enlace directo, sonido y cierre de modal, imágenes, PDF y enlaces. Medir portada y juego por separado.

## Añadir otro proyecto

Añadir una entrada real en Selected work con imagen, rol, estado y enlace a su caso. Crear un caso propio a partir de la estructura, reduciendo las secciones que no aporten. No duplicar los capítulos de Ossuary Reels como si fueran proyectos diferentes. Si el nuevo trabajo es principalmente artístico, mostrar proceso, intención, composición, variaciones y créditos antes que especificaciones matemáticas.

## Alcance de esta preparación

La estructura y el posicionamiento quedan preparados. Las cifras y reglas detalladas del caso se mantienen como documentación provisional y necesitan revisión con la build final. La accesibilidad del modal y el rendimiento no se han rediseñado en este cambio. Las comprobaciones estáticas no sustituyen la prueba visual del sitio ejecutado.
