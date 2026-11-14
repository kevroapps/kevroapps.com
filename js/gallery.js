/* Larger view for the app screenshots. Each screen is a link to its image (so it works without script);
   this opens it in a native <dialog>: Escape closes it, focus goes back to the screen you opened, and the
   close button says "Close" / "إغلاق" (the same words as the chat box). The words below are in English and in
   Arabic approved by Chody (14 Nov 2026): the short dialog name and the "enlarge" action. */
(function () {
  'use strict';
  var links = document.querySelectorAll('.shot > a[data-zoom]');
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;

  var arabic = document.documentElement.getAttribute('lang') === 'ar';
  var T = arabic
    ? { close: 'إغلاق', view: 'عرض لقطة الشاشة', zoom: 'تكبير لقطة الشاشة' }
    : { close: 'Close', view: 'Screenshot view', zoom: 'Enlarge screenshot' };
  var dlg = null, img = null, cap = null, closeBtn = null, last = null;

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'shot-viewer';
    // a short name for the dialog; the picture keeps its own full description (alt)
    dlg.setAttribute('aria-label', T.view);
    closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'shot-viewer-close';
    closeBtn.setAttribute('aria-label', T.close);
    closeBtn.textContent = '×';
    var fig = document.createElement('figure');
    img = document.createElement('img');
    cap = document.createElement('figcaption');
    fig.appendChild(img);
    fig.appendChild(cap);
    dlg.appendChild(closeBtn);
    dlg.appendChild(fig);
    document.body.appendChild(dlg);
    closeBtn.addEventListener('click', function () { dlg.close(); });
    // a click on the dark area around the picture closes it too
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    // the close button is the only control, so Tab stays on it
    dlg.addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); } });
    dlg.addEventListener('close', function () { if (last && last.focus) last.focus(); });
  }

  function open(a) {
    if (!dlg) build();
    var thumb = a.querySelector('img');
    var text = a.parentNode.querySelector('figcaption');
    last = a;
    img.src = a.getAttribute('href');
    img.alt = thumb ? thumb.getAttribute('alt') || '' : '';
    cap.textContent = text ? text.textContent : '';
    cap.hidden = !text;
    dlg.showModal();
    closeBtn.focus();
  }

  // one hidden sentence that every screenshot link points to as its description
  var hint = document.createElement('span');
  hint.id = 'zoom-hint';
  hint.className = 'zoom-hint';
  hint.textContent = T.zoom;
  document.body.appendChild(hint);

  var magnifier = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" focusable="false"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/></svg>';
  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    a.setAttribute('aria-haspopup', 'dialog');
    a.setAttribute('aria-describedby', 'zoom-hint');
    var badge = document.createElement('span');
    badge.className = 'shot-zoom';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = magnifier;
    a.appendChild(badge);
    a.addEventListener('click', function (e) {
      // keep the normal behaviour for "open in a new tab" clicks
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(this);
    });
  }
})();
