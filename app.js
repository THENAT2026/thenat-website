// THE NAT — shared site behavior: header scroll, scroll reveal, lightbox, tabs, form, carousel

(function () {
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Decorative background videos (hero, moment section) — respect reduced motion,
  // and lazy-start any video below the first viewport so it only loads/plays once visible.
  document.querySelectorAll('video[data-decorative]').forEach((video) => {
    if (prefersReducedMotion) {
      video.removeAttribute('autoplay');
      video.pause();
      return;
    }
    if (video.hasAttribute('autoplay') && video.closest('.hero')) return; // eager, above the fold
    video.removeAttribute('autoplay');
    video.pause();
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { threshold: 0.35 });
      io.observe(video);
    } else {
      video.play().catch(() => {});
    }
  });

  // Single dark brand expression — no theme toggle in v3.
  document.documentElement.setAttribute('data-theme', 'dark');

  // Primary nav — horizontally scrollable on narrow viewports (no burger menu).
  // Fades the edge(s) that still have hidden content so it reads as "swipe for
  // more" rather than looking cut off/broken.
  (function () {
    const nav = document.querySelector('.primary-nav');
    if (!nav) return;
    function updateMask() {
      const max = nav.scrollWidth - nav.clientWidth;
      if (max <= 2) { nav.style.maskImage = ''; nav.style.webkitMaskImage = ''; return; }
      const atStart = nav.scrollLeft <= 2;
      const atEnd = nav.scrollLeft >= max - 2;
      let mask;
      if (atStart) mask = 'linear-gradient(to right, black 82%, transparent 100%)';
      else if (atEnd) mask = 'linear-gradient(to right, transparent 0%, black 12%, black 100%)';
      else mask = 'linear-gradient(to right, transparent 0%, black 12%, black 82%, transparent 100%)';
      nav.style.maskImage = mask;
      nav.style.webkitMaskImage = mask;
    }
    updateMask();
    nav.addEventListener('scroll', updateMask, { passive: true });
    window.addEventListener('resize', updateMask);
    // Nudge the nav on first load so touch users on small screens realize it
    // scrolls, then settle back to the start.
    if (!prefersReducedMotion && nav.scrollWidth - nav.clientWidth > 2) {
      setTimeout(() => {
        nav.scrollTo({ left: 24, behavior: 'smooth' });
        setTimeout(() => nav.scrollTo({ left: 0, behavior: 'smooth' }), 450);
      }, 700);
    }
  })();

  // Header scroll behavior — transparent over hero, solid on scroll
  const header = document.querySelector('.site-header');
  let lastY = window.scrollY;
  function updateHeader() {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
      if (y > lastY && y > 160) header.classList.add('is-hidden');
      else header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', updateHeader);
  updateHeader();

  // Scroll reveal — IntersectionObserver-driven, always fail-safe to visible.
  // `.reveal` elements are opacity:1 by default in CSS; we only opt into the
  // fade-in effect (`.js-reveal-ready`) once we know IntersectionObserver is
  // available, and we force everything visible after a short timeout no
  // matter what — so content can never get stuck invisible.
  (function () {
    const revealItems = document.querySelectorAll('.reveal');
    if (!revealItems.length || prefersReducedMotion || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('js-reveal-ready');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
    revealItems.forEach((el) => io.observe(el));
    // Safety net: guarantee full visibility shortly after load regardless of
    // observer behavior in unusual embeds/previews.
    setTimeout(() => revealItems.forEach((el) => el.classList.add('is-visible')), 2000);
  })();

  // Animated stats — count up `.tile-stat-num` figures from 0 when they scroll
  // into view. Parses each element's own text (e.g. "340", "$2M", "290M+",
  // "100s", "1M Trees") into a leading number plus surrounding prefix/suffix
  // text, animates the number, then restores the exact original string so the
  // final state always matches the source markup byte-for-byte.
  (function () {
    const statEls = document.querySelectorAll('.tile-stat-num');
    if (!statEls.length) return;

    function animateCount(el) {
      const original = el.textContent;
      const match = original.match(/^(\D*)([\d,.]+)(.*)$/);
      if (!match) return; // no numeric portion — leave static text as-is
      const [, prefix, numStr, suffix] = match;
      const target = parseFloat(numStr.replace(/,/g, ''));
      if (!isFinite(target)) return;
      const decimals = (numStr.split('.')[1] || '').length;
      const duration = 1300;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        const current = target * eased;
        el.textContent = prefix + current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = original; // snap to exact source string
        }
      }
      requestAnimationFrame(tick);
    }

    if (prefersReducedMotion || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    statEls.forEach((el) => io.observe(el));
  })();

  // Lightbox for gallery
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    // Re-parent directly to <body> so it never sits inside a sticky-positioned
    // ancestor's stacking context (avoids header rendering above the overlay).
    document.body.appendChild(lightbox);
    const lbImg = lightbox.querySelector('img');
    document.querySelectorAll('[data-lightbox]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        lbImg.src = link.getAttribute('href');
        lbImg.alt = link.querySelector('img') ? link.querySelector('img').alt : '';
        lightbox.classList.add('is-open');
        document.body.classList.add('lightbox-open');
      });
    });
    const closeLightbox = () => {
      lightbox.classList.remove('is-open');
      document.body.classList.remove('lightbox-open');
    };
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.closest('.lightbox-close')) {
        closeLightbox();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }

  // Tabs (Roadmap, Homepage GALA)
  const tabButtons = document.querySelectorAll('.tab-btn');
  function activateTab(btn) {
    const target = btn.getAttribute('data-tab');
    const scope = btn.closest('section') || document;
    scope.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('is-active'));
    scope.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('is-active'));
    scope.querySelectorAll('.media-bg[data-media-tab]').forEach((m) => m.classList.remove('is-active'));
    btn.classList.add('is-active');
    scope.querySelectorAll('[data-tab-panel="' + target + '"]').forEach((p) => p.classList.add('is-active'));
    scope.querySelectorAll('[data-media-tab="' + target + '"]').forEach((m) => m.classList.add('is-active'));
  }
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn));
  });
  // Deep-link support — e.g. roadmap.html#past opens straight on the Past
  // Events tab, so breadcrumbs on event pages can jump back to the right tab.
  if (location.hash) {
    const hashTarget = location.hash.slice(1);
    const hashBtn = document.querySelector('.tab-btn[data-tab="' + hashTarget + '"]');
    if (hashBtn) {
      activateTab(hashBtn);
      hashBtn.scrollIntoView({ block: 'center' });
    }
  }

  // Save the Date — sound toggle (visual state only, no audio track on this build)
  const soundToggle = document.querySelector('[data-sound-toggle]');
  if (soundToggle) {
    let on = false;
    soundToggle.addEventListener('click', () => {
      on = !on;
      soundToggle.setAttribute('aria-pressed', String(on));
      soundToggle.lastChild.textContent = on ? ' Sound On' : ' Sound Off';
    });
  }

  // Join form (no backend — routes to a mailto so submissions reach hello@thenat.com)
  const joinForm = document.querySelector('[data-join-form]');
  if (joinForm) {
    joinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = joinForm.querySelector('#name')?.value || '';
      const email = joinForm.querySelector('#email')?.value || '';
      const subject = encodeURIComponent('Website Enquiry — Join THE NAT');
      const body = encodeURIComponent(`Website enquiry (Join the Movement form)\n\nName: ${name}\nEmail: ${email}`);
      window.location.href = `mailto:hello@thenat.com?subject=${subject}&body=${body}`;
      joinForm.style.display = 'none';
      document.querySelector('.form-success').classList.add('is-visible');
    });
  }

  // Hero background carousel — full-bleed crossfade slideshow behind fixed
  // title/overlay text (e.g. NAT Champions hero). Supports any number of
  // .media-bg images inside a [data-hero-carousel] section.
  document.querySelectorAll('[data-hero-carousel]').forEach((section) => {
    const slides = Array.from(section.querySelectorAll(':scope > img.media-bg'));
    if (slides.length < 2) return;
    const autoplayMs = parseInt(section.getAttribute('data-autoplay'), 10) || 5000;
    let index = slides.findIndex((s) => s.classList.contains('is-active'));
    if (index < 0) { index = 0; slides[0].classList.add('is-active'); }

    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'hero-carousel-dots';
    const dots = slides.map((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'carousel-dot' + (i === index ? ' is-active' : '');
      dotsWrap.appendChild(dot);
      return dot;
    });
    section.appendChild(dotsWrap);

    if (prefersReducedMotion) return;
    setInterval(() => {
      slides[index].classList.remove('is-active');
      dots[index].classList.remove('is-active');
      index = (index + 1) % slides.length;
      slides[index].classList.add('is-active');
      dots[index].classList.add('is-active');
    }, autoplayMs);
  });

  // Gala carousel — auto-advancing, swipeable, click-to-lightbox photo strip
  document.querySelectorAll('[data-carousel]').forEach((carousel) => {
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
    const prevBtn = carousel.querySelector('[data-carousel-prev]');
    const nextBtn = carousel.querySelector('[data-carousel-next]');
    const dotsWrap = carousel.querySelector('[data-carousel-dots]');
    if (!track || slides.length === 0) return;

    const autoplayMs = parseInt(carousel.getAttribute('data-autoplay'), 10) || 0;
    let currentIndex = 0;
    let autoplayTimer = null;

    // Build dots
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', 'Go to photo ' + (i + 1));
      dot.addEventListener('click', () => goTo(i));
      dotsWrap && dotsWrap.appendChild(dot);
      return dot;
    });

    function updateDots() {
      dots.forEach((d, i) => d.classList.toggle('is-active', i === currentIndex));
    }

    function goTo(index) {
      currentIndex = (index + slides.length) % slides.length;
      const slide = slides[currentIndex];
      track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
      updateDots();
    }

    function next() { goTo(currentIndex + 1); }
    function prev() { goTo(currentIndex - 1); }

    prevBtn && prevBtn.addEventListener('click', () => { prev(); restartAutoplay(); });
    nextBtn && nextBtn.addEventListener('click', () => { next(); restartAutoplay(); });

    // Keep currentIndex in sync when the user swipes/scrolls manually
    let scrollTimeout;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        let closest = 0;
        let closestDist = Infinity;
        slides.forEach((slide, i) => {
          const dist = Math.abs(slide.offsetLeft - track.offsetLeft - track.scrollLeft);
          if (dist < closestDist) { closestDist = dist; closest = i; }
        });
        currentIndex = closest;
        updateDots();
      }, 120);
    });

    function startAutoplay() {
      if (!autoplayMs || prefersReducedMotion) return;
      autoplayTimer = setInterval(next, autoplayMs);
    }
    function stopAutoplay() {
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
    }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
    carousel.addEventListener('touchstart', stopAutoplay, { passive: true });

    updateDots();
    startAutoplay();
  });

  // GALA countdown — whole days remaining until the target date, computed
  // once on load (not a ticking clock). Falls back gracefully once the
  // date has passed rather than showing a negative number.
  document.querySelectorAll('[data-gala-countdown]').forEach((el) => {
    const num = el.querySelector('[data-gala-countdown-num]');
    const copy = el.querySelector('.gala-countdown-copy');
    if (!num) return;
    const target = new Date(el.getAttribute('data-target'));
    if (isNaN(target.getTime())) return;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((target.getTime() - now.getTime()) / msPerDay);
    if (daysLeft > 1) {
      num.textContent = String(daysLeft);
    } else if (daysLeft === 1) {
      num.textContent = '1';
      if (copy) copy.innerHTML = 'Day to<br>THE NAT GALA';
    } else if (daysLeft === 0) {
      num.textContent = '';
      if (copy) copy.innerHTML = 'THE NAT GALA<br>is tonight';
      el.classList.add('gala-countdown--today');
    } else {
      el.style.display = 'none';
    }
  });

  // NAT GALA nav dropdown — reveals "GALA 2025 / GALA 2026" sub-links under
  // the NAT GALA nav item. The trigger lives inside <nav class="primary-nav">
  // but the panel is rendered as a sibling of that nav (not a descendant) —
  // the nav gets a JS-driven edge-fade mask-image when its links overflow on
  // narrow viewports, and mask-image clips ALL descendants, including
  // position:fixed ones, to the nav's own thin row. Trigger and panel are
  // paired by a shared data-nav-dropdown value instead of DOM nesting.
  const isTouch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  document.querySelectorAll('.nav-dropdown-trigger').forEach((trigger) => {
    const key = trigger.getAttribute('data-nav-dropdown');
    const menu = key && document.querySelector(`.nav-dropdown-menu[data-nav-dropdown="${key}"]`);
    if (!trigger || !menu) return;

    let closeTimer = null;
    const positionMenu = () => {
      const rect = trigger.getBoundingClientRect();
      menu.style.left = `${rect.left + rect.width / 2}px`;
      menu.style.top = `${rect.bottom}px`;
    };
    const openMenu = () => {
      clearTimeout(closeTimer);
      document.querySelectorAll('.nav-dropdown-menu.is-open').forEach((m) => {
        if (m !== menu) { m.classList.remove('is-open'); }
      });
      positionMenu();
      menu.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    };
    const closeMenuNow = () => {
      menu.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    };
    const scheduleClose = () => {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(closeMenuNow, 140);
    };

    if (isTouch) {
      trigger.addEventListener('click', (e) => {
        if (!menu.classList.contains('is-open')) {
          e.preventDefault();
          openMenu();
        }
      });
    } else {
      trigger.addEventListener('mouseenter', openMenu);
      trigger.addEventListener('mouseleave', scheduleClose);
      trigger.addEventListener('focus', openMenu);
      trigger.addEventListener('blur', scheduleClose);
      menu.addEventListener('mouseenter', () => clearTimeout(closeTimer));
      menu.addEventListener('mouseleave', scheduleClose);
      menu.addEventListener('focusin', () => clearTimeout(closeTimer));
      menu.addEventListener('focusout', scheduleClose);
    }
    window.addEventListener('resize', () => {
      if (menu.classList.contains('is-open')) positionMenu();
    });

    // Keyboard: the panel is a DOM sibling of <nav>, not nested after the
    // trigger, so Tab would otherwise skip straight past it into the rest of
    // the nav. Route Tab explicitly: open trigger -> first menu link -> ...
    // -> last menu link -> the nav item that would have followed the trigger.
    const menuLinks = Array.from(menu.querySelectorAll('a'));
    const nextNavItem = trigger.nextElementSibling;
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey && menu.classList.contains('is-open'))) {
        e.preventDefault();
        openMenu();
        menuLinks[0] && menuLinks[0].focus();
      }
    });
    menuLinks.forEach((link, i) => {
      link.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey && i === menuLinks.length - 1) {
          e.preventDefault();
          closeMenuNow();
          if (nextNavItem) nextNavItem.focus(); else trigger.focus();
        } else if (e.key === 'Tab' && e.shiftKey && i === 0) {
          e.preventDefault();
          closeMenuNow();
          trigger.focus();
        } else if (e.key === 'Escape') {
          closeMenuNow();
          trigger.focus();
        }
      });
    });
  });
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-dropdown-trigger').forEach((trigger) => {
      const key = trigger.getAttribute('data-nav-dropdown');
      const menu = key && document.querySelector(`.nav-dropdown-menu[data-nav-dropdown="${key}"]`);
      if (!menu) return;
      if (!trigger.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.nav-dropdown-menu.is-open').forEach((menu) => menu.classList.remove('is-open'));
  });
})();
