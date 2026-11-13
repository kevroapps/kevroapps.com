/* Larger view for the app screenshots. Each screen is a link to its image (so it works without script);
   this opens it in a native <dialog>: Escape closes it, focus goes back to the screen you opened, and the
   close button says "Close" / "إغلاق" (the same words as the chat box, reviewed by Chody). */
(function () {
  'use strict';
  var links = document.querySelectorAll('.shot > a[data-zoom]');
  if (!links.length || typeof HTMLDialogElement === 'undefined') return;

  var arabic = document.documentElement.getAttribute('lang') === 'ar';
  var dlg = null, img = null, cap = null, last = null;

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'shot-viewer';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'shot-viewer-close';
    close.setAttribute('aria-label', arabic ? 'إغلاق' : 'Close');
    close.textContent = '×';
    var fig = document.createElement('figure');
    img = document.createElement('img');
    cap = document.createElement('figcaption');
    fig.appendChild(img);
    fig.appendChild(cap);
    dlg.appendChild(close);
    dlg.appendChild(fig);
    document.body.appendChild(dlg);
    close.addEventListener('click', function () { dlg.close(); });
    // a click on the dark area around the picture closes it too
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { if (last && last.focus) last.focus(); });
  }

  function open(a) {
    if (!dlg) build();
    var thumb = a.querySelector('img');
    var alt = thumb ? thumb.getAttribute('alt') || '' : '';
    var text = a.parentNode.querySelector('figcaption');
    last = a;
    img.src = a.getAttribute('href');
    img.alt = alt;
    cap.textContent = text ? text.textContent : '';
    cap.hidden = !text;
    dlg.setAttribute('aria-label', alt);
    dlg.showModal();
  }

  for (var i = 0; i < links.length; i++) {
    links[i].setAttribute('aria-haspopup', 'dialog');
    links[i].addEventListener('click', function (e) {
      // keep the normal behaviour for "open in a new tab" clicks
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(this);
    });
  }
})();
