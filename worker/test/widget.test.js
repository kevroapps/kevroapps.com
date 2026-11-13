// Tests for the chat box in js/chat.js. It is a plain browser script, so it runs here against a tiny
// fake DOM (just enough for what the script uses) and a fake fetch that stands in for the Worker.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'js', 'chat.js'), 'utf8');

class FakeNode {
  static active = null;
  constructor(tag) {
    this.tag = tag; this.children = []; this.parent = null; this.attrs = {}; this.handlers = {};
    this.className = ''; this._text = ''; this.value = ''; this.disabled = false; this.hidden = false; this.style = {};
    this.scrollTop = 0; this.scrollHeight = 0;
  }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children = []; this._text = String(v); }
  appendChild(c) { if (c.parent) c.remove(); c.parent = this; this.children.push(c); return c; }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((x) => x !== this); this.parent = null; } }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  get classList() {
    const self = this;
    const list = () => self.className.split(' ').filter(Boolean);
    return {
      add: (c) => { if (!list().includes(c)) self.className = list().concat(c).join(' '); },
      remove: (c) => { self.className = list().filter((x) => x !== c).join(' '); },
      contains: (c) => list().includes(c),
    };
  }
  get offsetParent() { for (let n = this; n; n = n.parent) if (n.hidden) return null; return {}; }
  querySelectorAll() {
    // what the box asks for: the things a keyboard can reach, in page order
    return this.findAll((n) => ['a', 'button', 'textarea', 'input', 'select'].includes(n.tag) && n.tabIndex !== -1 && !n.disabled);
  }
  addEventListener(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); }
  focus() { FakeNode.active = this; }
  find(pred) { for (const c of this.children) { if (pred(c)) return c; const d = c.find(pred); if (d) return d; } return null; }
  findAll(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.findAll(pred, out); } return out; }
  querySelector(tag) { return this.find((n) => n.tag === tag); }
}

// A page with the script loaded and a queue of canned Worker answers.
function loadWidget(workerAnswers, { pageLang = null, path = '/apps/', phone = undefined, siblings = [], autoOpen = true } = {}) {
  const body = new FakeNode('body');
  FakeNode.active = null;
  for (const name of siblings) { const n = new FakeNode(name); body.appendChild(n); }
  const calls = [];
  const document = { readyState: 'complete', body, documentElement: { getAttribute: (k) => (k === 'lang' ? pageLang : null) }, createElement: (t) => new FakeNode(t), createTextNode: (s) => { const n = new FakeNode('#text'); n._text = s; return n; }, addEventListener() {}, querySelectorAll: () => [], get activeElement() { return FakeNode.active; } };
  // phone: true or false stands for a window that matches (or not) the small-screen rule; leave it out for a page without these browser features
  const win = phone === undefined ? undefined : { matchMedia: () => ({ matches: phone }), addEventListener() {}, innerWidth: 360, innerHeight: 800, visualViewport: null };
  const fetch = async (url, opts) => {
    const path = new URL(url).pathname;
    calls.push({ path, body: JSON.parse(opts.body) });
    const next = workerAnswers.shift() || { ok: true, data: { ok: true } };
    return { ok: next.ok !== false, status: next.status || 200, json: async () => next.data };
  };
  vm.runInNewContext(SOURCE, { document, fetch, location: { pathname: path }, URL, console, ...(win ? { window: win } : {}) });
  const byClass = (cls, root = body) => root.find((n) => n.className.split(' ').includes(cls));
  const settle = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r)); };
  const api = {
    calls, body, byClass,
    log: () => byClass('kc-log'),
    forms: () => byClass('kc-log').children.filter((n) => n.className === 'kc-form'),
    open: () => byClass('kc-open').handlers.click[0](),
    async say(text) {
      byClass('kc-input').value = text;
      byClass('kc-send').handlers.click[0]();
      await settle();
    },
    async submitForm(form) {
      form.querySelector('input').value = 'Parent';
      form.findAll((n) => n.tag === 'input')[1].value = 'parent@example.com';
      form.handlers.submit[0]({ preventDefault() {} });
      await settle();
    },
  };
  if (autoOpen) api.open();
  return api;
}

const handoffAnswer = (reply) => ({ data: { reply, handoff: true } });
const plainAnswer = (reply) => ({ data: { reply, handoff: false } });

test('widget: the form appears when the assistant offers the studio', async () => {
  const w = loadWidget([handoffAnswer('I can pass this to the studio.')]);
  await w.say('Can I be a partner?');
  assert.equal(w.forms().length, 1);
});

test('widget: a second hand-off in the same visit shows the form again (the live "where is the form?" defect)', async () => {
  const w = loadWidget([
    handoffAnswer('I can pass this to the studio.'),
    { data: { ok: true } },                       // the first form is sent
    plainAnswer('The studio started a while ago.'),
    handoffAnswer('A short form will appear below.'),
  ]);
  await w.say('can i be a partner');
  assert.equal(w.forms().length, 1);
  await w.submitForm(w.forms()[0]);
  assert.equal(w.forms().length, 0, 'the sent form is gone');
  assert.ok(w.log().textContent.includes('We reply within one business day'), 'thank you line shown');
  await w.say('how old is the studio?');
  await w.say('yes pls');
  assert.equal(w.forms().length, 1, 'the form is back after the earlier submission');
  assert.equal(w.calls.filter((c) => c.path === '/handoff').length, 1);
});

test('widget: two offers in a row never make two forms; the open form moves to the bottom', async () => {
  const w = loadWidget([handoffAnswer('Pass it on?'), plainAnswer('Sure, anything else?'), handoffAnswer('Shall I pass it on?')]);
  await w.say('Is there a partner program for schools?');
  await w.say('what else do you do?');
  await w.say('ok please pass it on');
  assert.equal(w.forms().length, 1);
  assert.equal(w.log().children[w.log().children.length - 1].className, 'kc-form', 'form is the last thing in the log');
});

test('widget: the form is prefilled with the real question, not with "yes pls"', async () => {
  const w = loadWidget([plainAnswer('The studio is a small team in Doha. Shall I pass a question on?'), handoffAnswer('Done, a form will appear.')]);
  await w.say('how old is the studio?');
  await w.say('yes pls');
  const question = w.forms()[0].find((n) => n.tag === 'textarea');
  assert.equal(question.value, 'how old is the studio?');
});

test('widget: replies are plain text, and only our own links are links', async () => {
  const w = loadWidget([plainAnswer('**Islamic Coloring** is on https://play.google.com/store/apps/details?id=a.b. Also https://evil.example/x')]);
  await w.say('where do I get it?');
  const bot = w.log().children[w.log().children.length - 1];
  assert.ok(!bot.textContent.includes('**'));
  const links = bot.findAll((n) => n.tag === 'a');
  assert.equal(links.length, 1);
  assert.ok(links[0].href.startsWith('https://play.google.com/'));
});

test('widget: the assistant is called Kevro, in English and in Chody\'s reviewed Arabic', () => {
  for (const exact of [
    "title: 'Kevro, the Kevro Apps AI assistant'",
    "hello: 'Hello, I am Kevro, the Kevro Apps AI assistant. Ask me about our apps and I will do my best to help.'",
    "title: '«كيفرو»، مساعد يعمل بالذكاء الاصطناعي لدى كيفرو آبس (Kevro Apps)'",
    "hello: 'مرحبًا، أنا «كيفرو»، مساعد يعمل بالذكاء الاصطناعي لدى كيفرو آبس. يمكنكم السؤال عن تطبيقاتنا، وسأبذل جهدي للمساعدة.'",
  ]) assert.ok(SOURCE.includes(exact), exact);
});

test('widget: the short line under the box matches Captain\'s English and Chody\'s Arabic, with a Privacy link', () => {
  for (const exact of [
    "note: 'Kevro is an AI assistant. Please do not share personal details in the chat, such as family members’ names, passwords or payment details.'",
    "note: '«كيفرو» هو مساعد يعمل بالذكاء الاصطناعي. يُرجى عدم مشاركة تفاصيل شخصية في المحادثة، مثل أسماء أفراد العائلة أو كلمات المرور أو بيانات الدفع.'",
    "privacy: 'Privacy'",
    "privacy: 'الخصوصية'",
  ]) assert.ok(SOURCE.includes(exact), exact);
  assert.ok(!SOURCE.includes('sent to Claude'), 'the Claude and Anthropic sentence lives on the privacy page only');
  const w = loadWidget([]);
  const link = w.byClass('kc-privacy');
  assert.equal(link.href, '/privacy/#website-assistant');
  assert.equal(link.textContent, 'Privacy');
  assert.equal(link.target, '_blank');
});

test('widget: Arabic mode switches the title, the line, the link and the greeting direction', async () => {
  const w = loadWidget([plainAnswer('أهلًا بكم')]);
  await w.say('السلام عليكم');
  assert.equal(w.byClass('kc-privacy').textContent, 'الخصوصية');
  assert.ok(w.byClass('kc-title').textContent.startsWith('«كيفرو»'));
  assert.equal(w.byClass('kc-panel').attrs.dir, 'rtl');
});

test('widget: on an Arabic page (html lang ar) the box starts in Arabic, right to left', () => {
  const w = loadWidget([], { pageLang: 'ar' });
  assert.equal(w.byClass('kc-panel').attrs.dir, 'rtl');
  assert.equal(w.byClass('kc-privacy').textContent, 'الخصوصية');
  const en = loadWidget([]);
  assert.equal(en.byClass('kc-panel').attrs.dir, 'ltr');
});

test('widget: the assistant opens with a plain hello, never an Islamic greeting', () => {
  const hellos = (SOURCE.match(/hello: '[^']*'/g) || []).join(' ');
  assert.ok(hellos.includes('Hello, I am Kevro'));
  assert.doesNotMatch(hellos, /assalam|salaam|salam|السلام/i);
});

// ---- Review pass of 14 Nov 2026: the box on a phone, and where the launcher is not shown ----
const press = (panel, key, shiftKey = false) => { let stopped = false; panel.handlers.keydown[0]({ key, shiftKey, preventDefault() { stopped = true; }, stopPropagation() {} }); return stopped; };

test('widget: on a phone the open box is a modal: the page is inert, Tab goes round inside it, Escape gives everything back', () => {
  const w = loadWidget([], { phone: true, siblings: ['main', 'footer'] });
  const [main, footer] = w.body.children;
  const panel = w.byClass('kc-panel');
  assert.equal(panel.attrs['aria-modal'], 'true');
  assert.ok(main.hasAttribute('inert') && footer.hasAttribute('inert'), 'the page behind is inert');
  assert.ok(!w.byClass('kc-root').hasAttribute('inert'), 'the box itself is not');
  assert.ok(w.byClass('kc-root').classList.contains('kc-modal'), 'scrim class');
  const items = panel.querySelectorAll();
  assert.ok(items.length >= 4, 'close, text box, send and the Privacy link can be reached');
  // from the last one, Tab goes to the first; from the first, Shift+Tab goes to the last
  items[items.length - 1].focus();
  assert.equal(press(panel, 'Tab'), true);
  assert.equal(FakeNode.active, items[0]);
  assert.equal(press(panel, 'Tab', true), true);
  assert.equal(FakeNode.active, items[items.length - 1]);
  // in the middle Tab is left to the browser
  items[1].focus();
  assert.equal(press(panel, 'Tab'), false);
  press(panel, 'Escape');
  assert.equal(panel.hidden, true);
  assert.ok(!main.hasAttribute('inert') && !footer.hasAttribute('inert'), 'the page is usable again');
  assert.ok(!('aria-modal' in panel.attrs));
  assert.equal(FakeNode.active, w.byClass('kc-open'), 'focus is back on the launcher');
});

test('widget: a page element that was already inert stays inert after the box closes', () => {
  const w = loadWidget([], { phone: true, siblings: ['main'] });
  const main = w.body.children[0];
  const panel = w.byClass('kc-panel');
  press(panel, 'Escape');
  main.setAttribute('inert', '');            // the page makes it inert for its own reasons
  w.open();
  assert.ok(main.hasAttribute('inert'));
  press(panel, 'Escape');
  assert.ok(main.hasAttribute('inert'), 'not ours to remove');
});

test('widget: on a wide screen the box is a floating box: not modal, the page is not touched', () => {
  const w = loadWidget([], { phone: false, siblings: ['main'] });
  const panel = w.byClass('kc-panel');
  assert.ok(!('aria-modal' in panel.attrs));
  assert.ok(!w.body.children[0].hasAttribute('inert'));
  assert.equal(press(panel, 'Tab'), false, 'Tab is never held inside');
  press(panel, 'Escape');
  assert.equal(FakeNode.active, w.byClass('kc-open'));
});

test('widget: no launcher on the contact pages (the support form is the page); every other page has it', () => {
  for (const path of ['/contact/', '/ar/contact/', '/contact']) {
    const w = loadWidget([], { path, autoOpen: false });
    assert.equal(w.byClass('kc-open'), null, path);
  }
  for (const path of ['/', '/apps/', '/islamic-coloring/', '/ar/', '/ar/quraan-class/']) {
    const w = loadWidget([], { path, autoOpen: false });
    assert.ok(w.byClass('kc-open'), path);
  }
});

test('widget: the launcher keeps its words for screen readers and gets a round-button icon for small screens', () => {
  const w = loadWidget([], { autoOpen: false });
  const opener = w.byClass('kc-open');
  assert.equal(opener.firstChild.className, 'kc-open-text');
  assert.equal(opener.firstChild.textContent, 'Questions? Ask here');
  assert.equal(opener.children[1].attrs['aria-hidden'], 'true');
});
