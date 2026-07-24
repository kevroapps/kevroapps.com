/* =============================================================
   Marmaris — Turkish Kitchen, Al Wakrah
   Independent website concept by Kevro Apps.

   No framework, no build step. Three behaviours:
     1. Mobile navigation panel (focus-trapped, Esc to close)
     2. Sample-menu category filter
     3. Scroll spy for the desktop nav
   ============================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------
     1. Mobile navigation
     ----------------------------------------------------------- */
  var toggle = document.getElementById('nav-toggle');
  var closeBtn = document.getElementById('nav-close');
  var overlay = document.getElementById('mobile-nav');
  var panel = overlay && overlay.querySelector('.mobile-nav__panel');
  var lastFocused = null;

  var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function focusableInPanel() {
    return Array.prototype.filter.call(
      panel.querySelectorAll(FOCUSABLE),
      function (el) { return el.offsetParent !== null || el === document.activeElement; }
    );
  }

  function openNav() {
    if (!overlay) return;
    lastFocused = document.activeElement;
    overlay.hidden = false;
    // Force a reflow so the CSS transform transition actually runs.
    void overlay.offsetWidth;
    overlay.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('.visually-hidden').textContent = 'Close menu';
    document.documentElement.style.overflow = 'hidden';

    var first = focusableInPanel()[0];
    if (first) first.focus();
    document.addEventListener('keydown', onKeydown, true);
  }

  function closeNav(restoreFocus) {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('.visually-hidden').textContent = 'Open menu';
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKeydown, true);

    var finish = function () { overlay.hidden = true; };
    if (reduceMotion) finish();
    else window.setTimeout(finish, 280);

    if (restoreFocus !== false && lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeNav(true);
      return;
    }
    if (e.key !== 'Tab') return;

    var items = focusableInPanel();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (toggle && overlay && panel) {
    toggle.addEventListener('click', function () {
      if (overlay.hidden) openNav(); else closeNav(true);
    });
    if (closeBtn) closeBtn.addEventListener('click', function () { closeNav(true); });

    // Click on the scrim (but not the panel) closes.
    overlay.addEventListener('click', function (e) {
      if (!panel.contains(e.target)) closeNav(true);
    });

    // Following a link should close the panel and let the anchor land.
    overlay.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a[href^="#"]');
      if (link) closeNav(false);
    });

    // If the viewport grows past the mobile breakpoint, drop the panel.
    var desktop = window.matchMedia('(min-width: 860px)');
    var onBreak = function (ev) { if (ev.matches) closeNav(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreak);
    else if (desktop.addListener) desktop.addListener(onBreak);
  }

  /* -----------------------------------------------------------
     2. Sample-menu filter
     ----------------------------------------------------------- */
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter]'));
  var dishes = Array.prototype.slice.call(document.querySelectorAll('.dish[data-cat]'));
  var status = document.getElementById('filter-status');
  var empty = document.getElementById('dish-empty');

  function applyFilter(key, announce) {
    var shown = 0;

    dishes.forEach(function (dish) {
      var match = key === 'all' || dish.getAttribute('data-cat') === key;
      dish.hidden = !match;
      if (match) shown++;
    });

    chips.forEach(function (chip) {
      var on = chip.getAttribute('data-filter') === key;
      chip.classList.toggle('is-active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    if (empty) empty.hidden = shown !== 0;

    if (status) {
      var label = key === 'all'
        ? 'Showing all ' + shown + ' sample dishes.'
        : 'Showing ' + shown + ' ' + key + ' ' + (shown === 1 ? 'dish' : 'dishes') + '.';
      // Only speak the change when the user drove it, not on first paint.
      status.textContent = announce ? label : label;
    }
  }

  if (chips.length && dishes.length) {
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        applyFilter(chip.getAttribute('data-filter'), true);
      });
    });
    applyFilter('all', false);
  }

  /* -----------------------------------------------------------
     3. Scroll spy (desktop nav)
     ----------------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__list a[href^="#"]'));
  var sections = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (s) { spy.observe(s); });
  }

  /* -----------------------------------------------------------
     4. Mark the document as enhanced (used by the test harness)
     ----------------------------------------------------------- */
  document.documentElement.setAttribute('data-js', 'ready');
}());
