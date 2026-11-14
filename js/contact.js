/* The support form on the contact pages (English and Arabic). Without script the form posts straight to
   Web3Forms as before. With script it does two things: it picks the app named in the link (?app=ayah-play),
   and it sends the form in the background so a failed send shows a message here, with the email address,
   instead of leaving the visitor on an error page of another site. The words come from the page itself
   (data-thanks and data-failed), so this file holds no text. */
(function () {
  'use strict';
  var form = document.querySelector('form.support-form');
  if (!form) return;

  try {
    var key = new URLSearchParams(window.location.search).get('app');
    var select = form.querySelector('select[name="app"]');
    if (key && select) {
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].getAttribute('data-key') === key) { select.selectedIndex = i; break; }
      }
    }
  } catch (e) { /* an old browser: the first option stays */ }

  if (!window.fetch || !window.FormData) return;
  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');
  var sending = false;

  function failed() {
    if (status) status.textContent = form.getAttribute('data-failed') || '';
    if (button) button.disabled = false;
    sending = false;
  }

  form.addEventListener('submit', function (e) {
    if (sending) { e.preventDefault(); return; }
    e.preventDefault();
    sending = true;
    if (button) button.disabled = true;
    if (status) status.textContent = '';
    var body = {};
    new FormData(form).forEach(function (value, name) { body[name] = value; });
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) { return { ok: res.ok && data && data.success, data: data }; }, function () { return { ok: false }; });
    }).then(function (r) {
      if (r.ok) { window.location.href = form.getAttribute('data-thanks') || '/thanks/'; } else { failed(); }
    }, function () {
      // The browser could not reach the service from the script (network or cross-site rule): send the form the ordinary way.
      sending = false;
      form.submit();
    });
  });
})();
