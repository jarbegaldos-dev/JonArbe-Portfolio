# Mobile transparent video

Coarse-pointer and Android/iOS devices use `.mobile.mp4` assets. Each H.264 frame stores RGB in the top half and the original VP9 alpha mask in the bottom half. Both halves and optional AAC audio stay synchronized in one stream. The mobile canvas adapter retains media controls/events used by game timelines; desktop retains native videos.

The canvas only redraws decoded frames (requestVideoFrameCallback, with a currentTime-checked RAF fallback). Removed players release their decoder, and hidden documents pause playback. Portfolio decorations pause while the game modal is open. Mobile eye shaders use 64px render targets instead of 160px.

Regenerate from the matching original WebM with FFmpeg (libvpx-vp9 is required to decode the original alpha). Set WIDTH=256 for characters, 512 for the chest transition:

```sh
ffmpeg -c:v libvpx-vp9 -i INPUT.webm -filter_complex "[0:v]fps=24,split[c][a];[a]alphaextract,scale=WIDTH:-2[m];[c]scale=WIDTH:-2,format=yuv420p[r];[r][m]vstack,format=yuv420p[v]" -map '[v]' -map '0:a?' -c:v libx264 -crf 20 -preset fast -c:a aac -b:a 96k -movflags +faststart OUTPUT.mobile.mp4
```

Validation performed: JavaScript syntax/runtime validator; Chromium with a mobile/touch viewport confirmed transparent and opaque pixels, changing raven frames, modal pause/resume, door playback and clone cleanup in both game copies; desktop native video selection; no page exceptions. This is browser emulation, not a physical iPhone/Android performance benchmark. Before release, verify spins, birds, door/stone timing, win animations, chest transition and tab switching on physical Safari and Chrome devices.
