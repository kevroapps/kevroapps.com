// The "Support the teacher" link page (Captain, 16 Nov 2026): what it says, what it must not say,
// that the teacher's id goes nowhere, and what its script does on Android and elsewhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const FILE = 'quraan-class/support/index.html';
const page = read(FILE);
const script = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((s) => s.includes('intent://'));
const visible = page.match(/<main[\s\S]*?<\/main>/)[0].replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');

test('support page: kept out of search and referrers, share tags for the message preview, one h1', () => {
  assert.ok(page.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(page.includes('<meta name="referrer" content="no-referrer">'));
  assert.ok(page.includes('<link rel="canonical" href="https://kevroapps.com/quraan-class/support/">'));
  assert.ok(page.includes('<meta property="og:url" content="https://kevroapps.com/quraan-class/support/">'));
  assert.equal((page.match(/<h1[ >]/g) || []).length, 1);
  assert.ok(read('robots.txt').split(/\r?\n/).includes('Disallow: /quraan-class/support/'));
  assert.ok(!read('sitemap.xml').includes('/quraan-class/support'), 'not in the sitemap');
  assert.ok(page.indexOf('localStorage.getItem("kevro-theme")') < page.indexOf('/css/site.css'));
});

test('support page: the wording is Cody QC\'s and Chody\'s (r48), kept as written', () => {
  const squash = (s) => s.replace(/\s+/g, ' ');
  const text = squash(visible);
  for (const s of [
    'Support the teacher',
    "Opening Qur'aan Class at Support the teacher.",
    "Open Qur'aan Class",
    "If nothing happens, the app may not be on this phone. Your child's teacher can send you a joining code. Your access stays free whatever you choose.",
    'ادعم المعلم',
    'جارٍ فتح «حلقة القرآن» على صفحة «ادعم المعلم».',
    'فتح حلقة القرآن',
    'إن لم يحدث شيء، فربما لا يكون التطبيق على هذا الهاتف. يمكن لمعلّم طفلك إرسال رمز الانضمام إليك. يبقى دخولك مجانيًا مهما كان اختيارك.',
  ]) assert.ok(text.includes(s), s);
  assert.match(page, /<section class="page-hero centered" id="ar" lang="ar" dir="rtl">/);
});

test('support page: no price, percentage, date, location, iPhone promise, dash or emoji; American spelling', () => {
  assert.doesNotMatch(visible, /[0-9$€£%٪]/, 'no number, price or percentage in the copy');
  assert.doesNotMatch(visible, /\b(USD|QAR|riyal|dollar|January|February|March|April|May|June|July|August|September|October|November|December|Ramadan)\b/, 'no date or month');
  assert.doesNotMatch(page, /Doha|Qatar|الدوحة|قطر/);
  assert.doesNotMatch(page, /iPhone|iPad|iOS|App Store|TestFlight|آيفون|الآيفون/);
  assert.doesNotMatch(visible, /[–—]/);
  assert.doesNotMatch(visible, / - /);
  assert.doesNotMatch(visible, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  assert.doesNotMatch(visible, /\b(colour|centre|programme|organis|favour|honour|neighbour|behaviour|learnt|cancelled)/i);
});

test('support page: nothing sends the teacher id anywhere', () => {
  // no chat widget, no analytics, no third-party script, font or request
  assert.ok(!page.includes('/js/chat.js'));
  assert.doesNotMatch(script, /fetch\(|XMLHttpRequest|sendBeacon|new Image|WebSocket|document\.cookie|localStorage|sessionStorage|import\(/);
  assert.doesNotMatch(page, /google-analytics|googletagmanager|gtag|plausible|matomo|facebook|hotjar|clarity\.ms|cdn\./i);
  for (const m of page.matchAll(/<(?:script|link|img|source|iframe|form)\b[^>]*\b(?:src|href|action)="([^"]+)"/g)) {
    assert.doesNotMatch(m[1], /^(?:https?:)?\/\/(?!kevroapps\.com\/)/, 'no request to another site: ' + m[1]);
  }
  // the id is read once and only ever put into the app's own link
  assert.equal((script.match(/location\.search/g) || []).length, 1);
  assert.doesNotMatch(script, /location\.(href|hash)|document\.referrer|history\./);
  assert.match(script, /FALLBACK = 'https:\/\/kevroapps\.com\/quraan-class\/';/);
  assert.match(script, /FALLBACK_AR = 'https:\/\/kevroapps\.com\/ar\/quraan-class\/';/);
});

// Run the page's script against a stand-in browser.
function run(url, userAgent) {
  const hrefs = { open: 'https://kevroapps.com/quraan-class/', 'open-ar': 'https://kevroapps.com/ar/quraan-class/' };
  let replaced = null;
  const el = (id) => ({ setAttribute: (k, v) => { assert.equal(k, 'href'); hrefs[id] = v; } });
  const ctx = {
    window: { location: { search: new URL(url).search, replace: (u) => { replaced = u; } } },
    navigator: { userAgent },
    document: { getElementById: el },
    URLSearchParams,
    encodeURIComponent,
  };
  vm.runInNewContext(script, ctx);
  return { hrefs, replaced };
}
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
const ID = '3f2b8c1e-5a4d-4e7f-9b21-0c6d8e9a1b2c';

test('support page script: on Android, the buttons and the automatic try use Chrome\'s intent link with the teacher id', () => {
  const { hrefs, replaced } = run('https://kevroapps.com/quraan-class/support/?t=' + ID, ANDROID);
  const want = (fb) => 'intent://open/support?t=' + ID + '#Intent;scheme=com.kevroapps.quranhomework;package=com.kevroapps.quranhomework;S.browser_fallback_url=' + encodeURIComponent(fb) + ';end';
  assert.equal(hrefs.open, want('https://kevroapps.com/quraan-class/'));
  assert.equal(hrefs['open-ar'], want('https://kevroapps.com/ar/quraan-class/'));
  assert.equal(replaced, hrefs.open);
  assert.ok(!decodeURIComponent(hrefs.open.split('S.browser_fallback_url=')[1]).includes(ID), 'the fallback address carries no id');
});

test('support page script: an id that is not an id is dropped; upper case is lowered; no id opens the app at Support the teacher', () => {
  for (const q of ['?t=hello', '?t=' + ID + '&x=1', '?t=' + ID + 'zz', '?t=%3Cscript%3E', '?t=', '']) {
    const { replaced } = run('https://kevroapps.com/quraan-class/support/' + q, ANDROID);
    assert.ok(replaced.startsWith(q.includes(ID + '&') ? 'intent://open/support?t=' : 'intent://open/support#Intent;'), q + ' -> ' + replaced);
    assert.ok(!/hello|script/.test(replaced), q);
  }
  assert.ok(run('https://kevroapps.com/quraan-class/support/?t=' + ID.toUpperCase(), ANDROID).replaced.includes('?t=' + ID + '#'));
});

test('support page script: off Android nothing redirects and the buttons keep their plain addresses', () => {
  for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36']) {
    const { hrefs, replaced } = run('https://kevroapps.com/quraan-class/support/?t=' + ID, ua);
    assert.equal(replaced, null);
    assert.equal(hrefs.open, 'https://kevroapps.com/quraan-class/');
    assert.equal(hrefs['open-ar'], 'https://kevroapps.com/ar/quraan-class/');
  }
});
