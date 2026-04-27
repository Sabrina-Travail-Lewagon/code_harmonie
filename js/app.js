/* =============================================================
   app.js — Comportements UI
   - menu mobile (toggle + overlay + fermeture sur clic externe)
   - mise en évidence du module actif dans la sidebar (IntersectionObserver)
   - fermeture auto du menu mobile quand on clique sur un lien
   ============================================================= */

(function () {
  'use strict';

  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const moduleLinks = document.querySelectorAll('.module-link');
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  // ---- Overlay pour le menu mobile (créé dynamiquement) ----
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
    menuToggle.setAttribute('aria-expanded', 'true');
    ensureOverlay().classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    if (!sidebar) return;
    sidebar.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    if (overlay) overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  function toggleMenu() {
    if (sidebar.classList.contains('is-open')) closeMenu();
    else openMenu();
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', toggleMenu);
  }

  // Ferme le menu quand on suit un lien sur mobile
  moduleLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.matchMedia('(max-width: 768px)').matches) {
        closeMenu();
      }
    });
  });

  // Echap ferme le menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar && sidebar.classList.contains('is-open')) {
      closeMenu();
      menuToggle.focus();
    }
  });

  // Repasse en mode desktop : on nettoie le menu
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('is-open')) {
      closeMenu();
    }
  });

  // ---- Mise en évidence de la section visible ----

  function setActive(id) {
    moduleLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === '#' + id) link.classList.add('is-active');
      else link.classList.remove('is-active');
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver((entries) => {
      // Choisit la section la plus visible parmi celles qui passent le seuil
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) {
        setActive(visible[0].target.id);
      }
    }, {
      rootMargin: '-20% 0px -55% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });

    sections.forEach(s => observer.observe(s));
  }

  // ---- Au chargement : active le module pointé par le hash, sinon Intro ----
  const initial = (location.hash || '#intro').slice(1);
  setActive(initial);
})();
