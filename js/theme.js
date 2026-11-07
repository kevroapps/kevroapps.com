/* Light and dark mode button. The site follows the device setting by default (CSS, no script).
   This adds a button in the header so a visitor can choose; the choice is remembered in this
   browser only (localStorage key "kevro-theme") and is applied before the page paints by the small
   inline script in each page's head. Without JavaScript nothing changes and the device setting rules. */
(function () {
  'use strict';
  var KEY = 'kevro-theme';
  var root = document.documentElement;
  var nav = document.querySelector('.nav');
  if (!nav) return;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function current() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return mq && mq.matches ? 'dark' : 'light';
  }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle';
  // The label comes from the page (data-theme-label on <html>, set on the Arabic pages) so it is in the page's language.
  var label = root.getAttribute('data-theme-label') || 'Dark mode';
  btn.title = label;
  btn.setAttribute('aria-label', label);
  // A half filled disc: the usual light and dark symbol, nothing else.
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"></path></svg>';

  function sync() {
    var dark = current() === 'dark';
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    var color = dark ? '#0B1322' : '#ffffff';
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', color);
  }

  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch (e) { /* private window or blocked storage: the choice just lasts this page */ }
    sync();
  });
  if (mq && mq.addEventListener) mq.addEventListener('change', sync);

  nav.appendChild(btn);
  sync();
})();
