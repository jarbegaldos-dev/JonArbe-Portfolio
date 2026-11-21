document.querySelectorAll('[data-game-gallery]').forEach(gallery => {
  const viewport = gallery.querySelector('.game-gallery__slides');
  const slides = [...viewport.querySelectorAll('.game-gallery__slide')];
  const controls = gallery.querySelector('.game-gallery__controls');
  const dots = controls.querySelector('[data-gallery-dots]');
  const status = controls.querySelector('[data-gallery-status]');
  let current = 0;
  let timer;

  const titles = slides.map(slide => slide.querySelector('figcaption').textContent.trim());
  const buttons = titles.map((title, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-dot';
    button.setAttribute('aria-label', title);
    button.setAttribute('aria-controls', viewport.id);
    button.addEventListener('click', () => navigate(index));
    dots.append(button);
    return button;
  });
  buttons[current].setAttribute('aria-current', 'true');

  function show(index) {
    slides[current].hidden = true;
    buttons[current].removeAttribute('aria-current');
    current = (index + slides.length) % slides.length;
    slides[current].hidden = false;
    buttons[current].setAttribute('aria-current', 'true');
  }

  function syncRotation() {
    clearInterval(timer);
    if (!viewport.contains(document.activeElement) && !document.hidden) {
      timer = setInterval(() => show(current + 1), 4000);
    }
  }

  function navigate(index) {
    show(index);
    status.textContent = titles[current];
    syncRotation();
  }

  controls.querySelector('[data-gallery-prev]').addEventListener('click', () => navigate(current - 1));
  controls.querySelector('[data-gallery-next]').addEventListener('click', () => navigate(current + 1));
  gallery.addEventListener('focusin', syncRotation);
  gallery.addEventListener('focusout', () => setTimeout(syncRotation, 0));
  document.addEventListener('visibilitychange', syncRotation);

  controls.hidden = false;
  syncRotation();
});