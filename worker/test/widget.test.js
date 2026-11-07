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
  addEventListener(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); }
  focus() {}
  find(pred) { for (const c of this.children) { if (pred(c)) return c; const d = c.find(pred); if (d) return d; } return null; }
  findAll(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.findAll(pred, out); } return out; }
  querySelector(tag) { return this.find((n) => n.tag === tag); }
}

// A page with the script loaded and a queue of canned Worker answers.
function loadWidget(workerAnswers) {
  const body = new FakeNode('body');
  const calls = [];
  const document = { readyState: 'complete', body, createElement: (t) => new FakeNode(t), createTextNode: (s) => { const n = new FakeNode('#text'); n._text = s; return n; }, addEventListener() {} };
  const fetch = async (url, opts) => {
    const path = new URL(url).pathname;
    calls.push({ path, body: JSON.parse(opts.body) });
    const next = workerAnswers.shift() || { ok: true, data: { ok: true } };
    return { ok: next.ok !== false, status: next.status || 200, json: async () => next.data };
  };
  vm.runInNewContext(SOURCE, { document, fetch, location: { pathname: '/apps/' }, URL, console });
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
  api.open();
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
    "hello: 'Assalamu alaikum, I am Kevro, the Kevro Apps AI assistant. Ask me about our apps and I will do my best to help.'",
    "title: '«كيفرو»، مساعد يعمل بالذكاء الاصطناعي لدى كيفرو آبس (Kevro Apps)'",
    "hello: 'السلام عليكم، أنا «كيفرو»، مساعد يعمل بالذكاء الاصطناعي لدى كيفرو آبس. يمكنكم السؤال عن تطبيقاتنا، وسأبذل جهدي للمساعدة.'",
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
