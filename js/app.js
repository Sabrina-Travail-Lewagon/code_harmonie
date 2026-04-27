/* =============================================================
   app.js — Moteur de navigation en slides
   - Boutons Précédent / Suivant
   - Flèches clavier ← / →  (et Espace, PageUp/Down, Home/End)
   - Swipe tactile gauche/droite
   - Sync URL hash (#m3 ou #m3-2)
   - Sidebar mobile burger + overlay
   - Mise à jour barre de progression et compteur
   ============================================================= */

(function () {
  'use strict';

  document.body.classList.remove('no-js');
  document.body.classList.add('js');

  // ---- Références DOM ----
  const slides = Array.from(document.querySelectorAll('.slide'));
  const moduleLinks = Array.from(document.querySelectorAll('.module-link'));
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const navPrev = document.getElementById('navPrev');
  const navNext = document.getElementById('navNext');
  const navCounter = document.getElementById('navCounter');
  const navModule = document.getElementById('navModule');
  const progressFill = document.getElementById('progressFill');
  const deck = document.getElementById('deck');

  if (!slides.length || !deck) return;

  // ---- Map des titres de module pour l'affichage ----
  const moduleTitles = {};
  moduleLinks.forEach(link => {
    const id = link.dataset.module;
    const title = link.querySelector('.module-title');
    moduleTitles[id] = title ? title.textContent.trim() : id;
  });

  let currentIndex = 0;

  function findIndexById(id) {
    if (!id) return 0;
    let idx = slides.findIndex(s => s.dataset.id === id);
    if (idx >= 0) return idx;
    // Fallback : si on cherche un module (intro, m1...), prendre sa première slide
    idx = slides.findIndex(s => s.dataset.module === id);
    return idx >= 0 ? idx : 0;
  }

  function goTo(index, opts = {}) {
    const direction = (opts.direction != null)
      ? opts.direction
      : (index > currentIndex ? 1 : (index < currentIndex ? -1 : 0));
    index = Math.max(0, Math.min(slides.length - 1, index));
    if (index === currentIndex && !opts.force) return;

    const prev = slides[currentIndex];
    const next = slides[index];

    // Animation : sortie de l'ancienne slide
    if (prev && prev !== next) {
      prev.classList.remove('is-active');
      prev.classList.add(direction >= 0 ? 'is-leaving-left' : 'is-leaving-right');
      setTimeout(() => {
        prev.classList.remove('is-leaving-left', 'is-leaving-right');
      }, 350);
    }

    // Activation de la nouvelle
    next.classList.add('is-active');
    next.scrollTop = 0;
    currentIndex = index;

    updateUI();

    // Met à jour le hash (sans déclencher hashchange en boucle)
    const id = next.dataset.id;
    if (id) {
      history.replaceState(null, '', '#' + id);
    }

    // Sur mobile : ferme la sidebar si ouverte
    if (sidebar && sidebar.classList.contains('is-open')) {
      closeMenu();
    }
  }

  function goPrev() { goTo(currentIndex - 1, { direction: -1 }); }
  function goNext() { goTo(currentIndex + 1, { direction: 1 }); }
  function goFirst() { goTo(0, { direction: -1 }); }

  // ---- Mise à jour de l'UI ----

  function updateUI() {
    const slide = slides[currentIndex];
    const moduleId = slide.dataset.module;

    // Boutons activés/désactivés
    if (navPrev) navPrev.disabled = currentIndex === 0;
    if (navNext) navNext.disabled = currentIndex === slides.length - 1;

    // Compteur
    if (navCounter) navCounter.textContent = `${currentIndex + 1} / ${slides.length}`;
    if (navModule)  navModule.textContent  = moduleTitles[moduleId] || '';

    // Barre de progression
    if (progressFill) {
      const pct = ((currentIndex + 1) / slides.length) * 100;
      progressFill.style.width = pct + '%';
    }

    // Sidebar : module actif + modules complétés
    moduleLinks.forEach(link => {
      const linkModule = link.dataset.module;
      link.classList.toggle('is-active', linkModule === moduleId);
    });

    // Marque comme "fait" tous les modules dont l'index de la dernière slide
    // est <= currentIndex (= modules entièrement parcourus)
    const moduleOrder = moduleLinks.map(l => l.dataset.module);
    moduleOrder.forEach(modId => {
      const slidesOfModule = slides.filter(s => s.dataset.module === modId);
      if (!slidesOfModule.length) return;
      const lastIdx = slides.indexOf(slidesOfModule[slidesOfModule.length - 1]);
      const link = moduleLinks.find(l => l.dataset.module === modId);
      if (link && lastIdx < currentIndex) {
        link.classList.add('is-done');
      }
    });

    // Met à jour le titre du document
    const titleEl = slide.querySelector('h1, h2');
    if (titleEl) {
      document.title = titleEl.textContent.trim() + " · Le Code de l'Harmonie";
    }
  }

  // ---- Clavier ----

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault();
        goNext();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        goPrev();
        break;
      case 'Home':
        e.preventDefault();
        goTo(0, { direction: -1 });
        break;
      case 'End':
        e.preventDefault();
        goTo(slides.length - 1, { direction: 1 });
        break;
      case 'Escape':
        if (sidebar && sidebar.classList.contains('is-open')) {
          closeMenu();
          if (menuToggle) menuToggle.focus();
        }
        break;
    }
  });

  // ---- Boutons ----

  if (navPrev) navPrev.addEventListener('click', goPrev);
  if (navNext) navNext.addEventListener('click', goNext);

  // Boutons "data-go-next" et "data-go-first" dans les slides
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-go-next]')) {
      e.preventDefault();
      goNext();
    } else if (e.target.closest('[data-go-first]')) {
      e.preventDefault();
      goFirst();
    }
  });

  // ---- Sidebar : navigation par module ----

  moduleLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetModule = link.dataset.module;
      const idx = slides.findIndex(s => s.dataset.module === targetModule);
      if (idx >= 0) goTo(idx);
    });
  });

  // ---- Hash ----

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    const idx = findIndexById(id);
    if (idx !== currentIndex) goTo(idx);
  });

  // ---- Swipe tactile ----

  let touchStartX = 0;
  let touchStartY = 0;
  let touchActive = false;
  const SWIPE_THRESHOLD = 50;

  deck.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchActive = true;
  }, { passive: true });

  deck.addEventListener('touchend', (e) => {
    if (!touchActive) return;
    touchActive = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    // Swipe horizontal seulement (et pas un scroll vertical)
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }, { passive: true });

  // ---- Menu mobile (burger) ----

  let overlay = null;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', closeMenu);
    document.body.appendChild(overlay);
    return overlay;
  }

  function openMenu() {
    if (!sidebar) return;
    sidebar.classList.add('is-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
    ensureOverlay().classList.add('is-visible');
  }

  function closeMenu() {
    if (!sidebar) return;
    sidebar.classList.remove('is-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    if (overlay) overlay.classList.remove('is-visible');
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      if (sidebar.classList.contains('is-open')) closeMenu();
      else openMenu();
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // ---- Init ----

  // Affiche la slide voulue : depuis le hash, ou la première
  const initialId = location.hash.slice(1);
  const startIdx = findIndexById(initialId);

  // On ne lance pas l'animation à l'init : on active directement la slide
  slides.forEach((s, i) => s.classList.toggle('is-active', i === startIdx));
  currentIndex = startIdx;
  updateUI();

  // Permet le focus sur la zone deck pour le clavier
  deck.focus({ preventScroll: true });
})();
