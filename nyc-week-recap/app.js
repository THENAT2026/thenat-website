(function () {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  let lastY = window.scrollY;

  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 8);
      if (y > lastY && y > 120) {
        header.classList.add('is-hidden');
      } else {
        header.classList.remove('is-hidden');
      }
      lastY = y;
    },
    { passive: true }
  );
})();
