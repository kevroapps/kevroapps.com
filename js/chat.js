/* Kevro Apps website assistant: a small chat box that talks to the kevro-chat Worker.
   Plain JS, no libraries. Nothing is stored in the browser and nothing is sent until the visitor
   presses Send. All words shown to visitors are in STR below (English and Arabic, the Arabic reviewed
   by Chody, 7 Nov 2026). The Worker never sends visitor-facing text of its own. */
(function () {
  'use strict';

  var API = 'https://kevro-chat.kevro-chat-worker.workers.dev';
  var SUPPORT = 'support@kevroapps.com';
  var LINK_HOSTS = ['kevroapps.com', 'www.kevroapps.com', 'play.google.com'];
  var MAX_LEN = 800;

  var STR = {
    en: {
      open: 'Questions? Ask here',
      title: 'Kevro, the Kevro Apps AI assistant',
      hello: 'Hello, I am Kevro, the Kevro Apps AI assistant. Ask me about our apps and I will do my best to help.',
      note: 'Kevro is an AI assistant. Please do not share personal details in the chat, such as family members’ names, passwords or payment details.',
      privacy: 'Privacy',
      ph: 'Type your question',
      send: 'Send',
      wait: 'One moment',
      close: 'Close',
      formTitle: 'Send this to the studio',
      fName: 'Your name',
      fEmail: 'Your email',
      fQ: 'Your question',
      fSend: 'Send to the studio',
      // Matches the contact page, which already says "We reply within one business day".
      thanks: 'Thank you. We reply within one business day.',
      failed: 'Sorry, that did not send. Please email ' + SUPPORT + '.',
      off: 'The assistant is not available right now. Please email ' + SUPPORT + '.',
      busy: 'Lots of questions at once. Please wait a minute and try again.',
      tooLong: 'That message is too long. Please keep it shorter.'
    },
    ar: {
      open: 'هل لديكم سؤال؟',
      title: '«كيفرو»، مساعد يعمل بالذكاء الاصطناعي لدى كيفرو آبس (Kevro Apps)',
      hello: 'مرحبًا، أنا «كيفرو»، مساعد يعمل بالذكاء الاصطناعي لدى كيفرو آبس. يمكنكم السؤال عن تطبيقاتنا، وسأبذل جهدي للمساعدة.',
      note: '«كيفرو» هو مساعد يعمل بالذكاء الاصطناعي. يُرجى عدم مشاركة تفاصيل شخصية في المحادثة، مثل أسماء أفراد العائلة أو كلمات المرور أو بيانات الدفع.',
      privacy: 'الخصوصية',
      ph: 'اكتبوا سؤالكم هنا',
      send: 'إرسال',
      wait: 'لحظة من فضلكم',
      close: 'إغلاق',
      formTitle: 'إرسال السؤال إلى الفريق',
      fName: 'الاسم',
      fEmail: 'البريد الإلكتروني',
      fQ: 'السؤال',
      fSend: 'إرسال إلى الفريق',
      thanks: 'شكرًا لكم. سنرد خلال يوم عمل واحد.',
      failed: 'عذرًا، تعذّر الإرسال. يمكنكم مراسلتنا على ' + SUPPORT + '.',
      off: 'المساعد غير متاح حاليًا. يمكنكم مراسلتنا على ' + SUPPORT + '.',
      busy: 'هناك أسئلة كثيرة في الوقت نفسه. يُرجى الانتظار دقيقة ثم المحاولة مرة أخرى.',
      tooLong: 'الرسالة أطول من الحد المسموح. يُرجى اختصارها.'
    }
  };

  var lang = 'en';
  var history = [];          // { role: 'user' | 'assistant', content }
  var busy = false;
  var els = {};

  function t(key) { return STR[lang][key]; }
  function isArabic(text) { return /[؀-ۿ]/.test(text); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Replies are plain text. Remove any markdown the model adds, and turn only our own links
  // (kevroapps.com and Google Play) into real links.
  function cleanReply(s) {
    return String(s).replace(/\*\*|__|`/g, '').replace(/^#+\s*/gm, '');
  }
  function addRichText(parent, text) {
    var parts = text.split(/(https?:\/\/[^\s]+)/g);
    parts.forEach(function (part) {
      if (/^https?:\/\//.test(part)) {
        var url = part, tail = '';
        var m = url.match(/[.,;:!?)،؛؟]+$/);
        if (m) { tail = m[0]; url = url.slice(0, -tail.length); }
        var host = '';
        try { host = new URL(url).hostname; } catch (e) { host = ''; }
        if (LINK_HOSTS.indexOf(host) !== -1 && /^https:/.test(url)) {
          var a = el('a', null, url);
          a.href = url;
          a.rel = 'noopener';
          parent.appendChild(a);
          if (tail) parent.appendChild(document.createTextNode(tail));
          return;
        }
      }
      if (part) parent.appendChild(document.createTextNode(part));
    });
  }

  function addMessage(who, text) {
    var m = el('div', 'kc-msg kc-' + who);
    // Arabic text with an English app name at the start would otherwise be laid out left to right.
    var arabic = (String(text).match(/[؀-ۿ]/g) || []).length;
    m.setAttribute('dir', arabic > String(text).length * 0.25 ? 'rtl' : 'ltr');
    if (who === 'bot') addRichText(m, cleanReply(text)); else m.textContent = text;
    els.log.appendChild(m);
    els.log.scrollTop = els.log.scrollHeight;
    return m;
  }

  function applyLang(l) {
    lang = l;
    els.panel.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    els.panel.setAttribute('lang', lang);
    // Display only: a non breaking space keeps the Latin "(Kevro Apps)" from splitting across two lines.
    els.title.textContent = t('title').replace('(Kevro Apps)', '(Kevro Apps)');
    els.panel.setAttribute('aria-label', t('title'));
    els.close.setAttribute('aria-label', t('close'));
    els.close.title = t('close');
    els.input.placeholder = t('ph');
    els.input.setAttribute('aria-label', t('ph'));
    els.sendBtn.textContent = t('send');
    els.noteText.textContent = t('note') + ' ';
    els.noteLink.textContent = t('privacy');
    els.opener.firstChild.textContent = t('open');
    if (els.hello) {
      els.hello.textContent = t('hello');
      els.hello.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
    if (els.form) {
      els.formTitle.textContent = t('formTitle');
      els.lName.textContent = t('fName');
      els.lEmail.textContent = t('fEmail');
      els.lQ.textContent = t('fQ');
      els.fSend.textContent = t('fSend');
    }
  }

  function setBusy(on) {
    busy = on;
    els.sendBtn.disabled = on;
    els.panel.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function statusFor(res, data) {
    if (data && data.error === 'message_too_long') return t('tooLong');
    if (data && data.fallback && data.code === 'rate_limited') return t('busy');
    if (res && res.status === 429) return t('busy');
    return t('off');
  }

  function post(path, body) {
    return fetch(API + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) { return { res: res, data: data }; });
    });
  }

  function send() {
    if (busy) return;
    var text = els.input.value.trim();
    if (!text) return;
    if (text.length > MAX_LEN) { addMessage('note', t('tooLong')); return; }
    if (history.length === 0 && isArabic(text)) applyLang('ar');
    addMessage('user', text);
    history.push({ role: 'user', content: text });
    els.input.value = '';
    resize();
    setBusy(true);
    var wait = addMessage('note', t('wait'));
    post('/chat', { messages: history.slice(-12), lang: lang }).then(function (r) {
      wait.remove();
      var d = r.data;
      if (r.res.ok && d && typeof d.reply === 'string') {
        if (d.reply) {
          addMessage('bot', d.reply);
          history.push({ role: 'assistant', content: d.reply });
        }
        if (d.handoff) showForm(text);
      } else {
        history.pop();
        addMessage('note', statusFor(r.res, d));
      }
    }).catch(function () {
      wait.remove();
      history.pop();
      addMessage('note', t('off'));
    }).then(function () { setBusy(false); });
  }

  function field(id, type) {
    var wrap = el('div', 'kc-field');
    var label = el('label');
    label.setAttribute('for', id);
    var input = type === 'textarea' ? el('textarea') : el('input');
    input.id = id;
    if (type !== 'textarea') input.type = type;
    if (type === 'textarea') input.rows = 3;
    input.required = true;
    input.setAttribute('dir', 'auto');
    wrap.appendChild(label);
    wrap.appendChild(input);
    return { wrap: wrap, label: label, input: input };
  }

  // A reply like "yes pls" is no question for the studio: prefill with the latest real question instead.
  function pickQuestion(latest) {
    if (latest && latest.length >= 12) return latest;
    for (var i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user' && history[i].content.length >= 12) return history[i].content;
    }
    return latest || '';
  }

  // Every time the assistant offers the studio, the form must appear, also a second time in one visit.
  // If one is already open, bring it to the bottom and focus it instead of making another.
  function showForm(lastQuestion) {
    if (els.form) {
      els.log.appendChild(els.form);
      els.log.scrollTop = els.log.scrollHeight;
      var open = els.form.querySelector ? els.form.querySelector('input') : null;
      if (open) open.focus();
      return;
    }
    lastQuestion = pickQuestion(lastQuestion);
    var form = el('form', 'kc-form');
    form.noValidate = false;
    var title = el('p', 'kc-form-title');
    var fn = field('kc-name', 'text'); fn.input.autocomplete = 'name'; fn.input.maxLength = 80;
    var fe = field('kc-email', 'email'); fe.input.autocomplete = 'email'; fe.input.maxLength = 120;
    var fq = field('kc-q', 'textarea'); fq.input.maxLength = 1500; fq.input.value = lastQuestion || '';
    var trap = el('input'); // honeypot: people never see or fill it
    trap.type = 'text'; trap.name = 'website'; trap.tabIndex = -1; trap.autocomplete = 'off';
    trap.className = 'kc-trap'; trap.setAttribute('aria-hidden', 'true');
    var btn = el('button', 'kc-btn'); btn.type = 'submit';
    var msg = el('p', 'kc-form-msg'); msg.setAttribute('role', 'status');
    [title, fn.wrap, fe.wrap, fq.wrap, trap, btn, msg].forEach(function (n) { form.appendChild(n); });
    els.form = form; els.formTitle = title; els.lName = fn.label; els.lEmail = fe.label; els.lQ = fq.label; els.fSend = btn;
    applyFormText();
    els.log.appendChild(form);
    els.log.scrollTop = els.log.scrollHeight;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (btn.disabled) return;
      btn.disabled = true;
      msg.textContent = '';
      var transcript = history.slice(-6);
      post('/handoff', {
        name: fn.input.value, email: fe.input.value, question: fq.input.value,
        website: trap.value, lang: lang, page: location.pathname, transcript: transcript
      }).then(function (r) {
        if (r.res.ok && r.data && r.data.ok) {
          form.remove();
          els.form = null;
          addMessage('note', t('thanks'));
        } else {
          msg.textContent = (r.data && r.data.fallback && r.data.code === 'rate_limited') ? t('busy') : t('failed');
          btn.disabled = false;
        }
      }).catch(function () { msg.textContent = t('failed'); btn.disabled = false; });
    });
    fn.input.focus();
  }
  function applyFormText() {
    els.formTitle.textContent = t('formTitle');
    els.lName.textContent = t('fName');
    els.lEmail.textContent = t('fEmail');
    els.lQ.textContent = t('fQ');
    els.fSend.textContent = t('fSend');
  }

  function resize() {
    els.input.style.height = 'auto';
    els.input.style.height = Math.min(els.input.scrollHeight, 120) + 'px';
    els.input.style.overflowY = els.input.scrollHeight > 120 ? 'auto' : 'hidden';
  }

  function open() {
    els.panel.hidden = false;
    els.opener.setAttribute('aria-expanded', 'true');
    els.opener.hidden = true;
    els.input.focus();
  }
  function close() {
    els.panel.hidden = true;
    els.opener.hidden = false;
    els.opener.setAttribute('aria-expanded', 'false');
    els.opener.focus();
  }

  function build() {
    var root = el('div', 'kc-root');

    var opener = el('button', 'kc-open');
    opener.type = 'button';
    opener.setAttribute('aria-expanded', 'false');
    opener.setAttribute('aria-controls', 'kc-panel');
    opener.appendChild(el('span', 'kc-open-text', STR.en.open));
    els.opener = opener;

    var panel = el('section', 'kc-panel');
    panel.id = 'kc-panel';
    panel.setAttribute('role', 'dialog');
    panel.hidden = true;
    els.panel = panel;

    var head = el('div', 'kc-head');
    els.title = el('h2', 'kc-title', STR.en.title);
    els.close = el('button', 'kc-close');
    els.close.type = 'button';
    els.close.setAttribute('aria-label', STR.en.close);
    els.close.textContent = '×';
    head.appendChild(els.title);
    head.appendChild(els.close);

    els.log = el('div', 'kc-log');
    els.log.setAttribute('role', 'log');
    els.log.setAttribute('aria-live', 'polite');
    els.hello = addMessage('bot', STR.en.hello);

    var bar = el('div', 'kc-bar');
    els.input = el('textarea', 'kc-input');
    els.input.rows = 1;
    els.input.maxLength = MAX_LEN;
    els.input.setAttribute('dir', 'auto');
    els.sendBtn = el('button', 'kc-btn kc-send', STR.en.send);
    els.sendBtn.type = 'button';
    bar.appendChild(els.input);
    bar.appendChild(els.sendBtn);

    // The line under the box, then a one word link to the Website Assistant section of the privacy page
    // (where the Claude and Anthropic sentence lives). It opens in a new tab so the chat is not lost.
    els.note = el('p', 'kc-note');
    els.noteText = el('span', null, STR.en.note + ' ');
    els.noteLink = el('a', 'kc-privacy', STR.en.privacy);
    els.noteLink.href = '/privacy/#website-assistant';
    els.noteLink.target = '_blank';
    els.noteLink.rel = 'noopener';
    els.note.appendChild(els.noteText);
    els.note.appendChild(els.noteLink);

    panel.appendChild(head);
    panel.appendChild(els.log);
    panel.appendChild(bar);
    panel.appendChild(els.note);
    root.appendChild(opener);
    root.appendChild(panel);
    document.body.appendChild(root);

    // The first bubble was added before els.log was attached to the panel; keep it as plain intro text.
    els.hello.className = 'kc-msg kc-bot';

    opener.addEventListener('click', open);
    els.close.addEventListener('click', close);
    els.sendBtn.addEventListener('click', send);
    els.input.addEventListener('input', resize);
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
    });
    // On the Arabic pages (html lang="ar") the box starts in Arabic; elsewhere it starts in English and
    // switches when the visitor writes Arabic.
    applyLang(document.documentElement.getAttribute('lang') === 'ar' ? 'ar' : 'en');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
