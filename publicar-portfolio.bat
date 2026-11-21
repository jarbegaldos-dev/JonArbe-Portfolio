@echo off
rem Publica el lavado de cara del portfolio en GitHub Pages.
rem No toca game/ ni _rediseno/.
cd /d "%~dp0"

echo Limpiando archivos que ya no se usan...
if exist "css\nolimit.css" del "css\nolimit.css"
if exist "assets\ossuary-reels\img\chest-wheel.webp" del "assets\ossuary-reels\img\chest-wheel.webp"
if exist "assets\ossuary-reels\img\buy-screen.webp" del "assets\ossuary-reels\img\buy-screen.webp"

echo Preparando el commit...
git add -A -- index.html ossuary-reels.html 404.html README.md ACTUALIZAR-PORTFOLIO.md css js assets/ossuary-reels/img assets/ossuary-reels/cast assets/ossuary-reels/deco
git status --short -- index.html ossuary-reels.html 404.html README.md ACTUALIZAR-PORTFOLIO.md css js assets

git commit -m "Portfolio facelift: own brand, key art, cast, business section" -m "Codex structure (art direction, mechanics, game feel) with the Ossuary Ledger brand layer (css/brand.css), new key art, the cast section with full skeletons, art details across sections and a Business section for licensing, concept sale and commissions. game/ untouched." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01GeQuYnYbfEkd1TPqVPXpPh"
if errorlevel 1 goto fin

echo Subiendo a GitHub...
git push origin main
if errorlevel 1 (
  echo.
  echo ERROR al subir. Revisa tu sesion de GitHub e intentalo de nuevo.
  goto fin
)
echo.
echo HECHO. En 1-2 minutos estara en:
echo https://jarbegaldos-dev.github.io/JonArbe-Portfolio/
:fin
echo.
pause
