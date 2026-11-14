// Checks on the app pages and the apps overview: structure, structured data, copy rules, sitemap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const PAGES = { 'islamic-coloring/index.html': '/islamic-coloring/', 'quraan-class/index.html': '/quraan-class/', 'ayah-play/index.html': '/ayah-play/', 'apps/index.html': '/apps/' };

test('app pages: title, one h1, canonical, share tags and valid structured data', () => {
  for (const [file, path] of Object.entries(PAGES)) {
    const html = read(file);
    assert.match(html, /<title>[^<]+<\/title>/, file);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, file + ' has one h1');
    assert.ok(html.includes(`<link rel="canonical" href="https://kevroapps.com${path}">`), file + ' canonical');
    assert.ok(html.includes(`<meta property="og:url" content="https://kevroapps.com${path}">`), file + ' og:url');
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1]);
    assert.ok(html.includes('/js/theme.js') && html.includes('/js/chat.js'), file + ' scripts');
    assert.ok(html.indexOf('localStorage.getItem("kevro-theme")') < html.indexOf('/css/site.css'), file + ' theme before css');
  }
});

test('app pages: copy rules (no dashes as punctuation, no emoji, no prices, no "Muslim kids")', () => {
  for (const file of Object.keys(PAGES)) {
    const text = read(file).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /[–—]/, file + ' dash');
    assert.doesNotMatch(text, / - /, file + ' spaced hyphen');
    assert.doesNotMatch(text, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, file + ' emoji');
    assert.doesNotMatch(text, /\$\s?\d|USD|QAR\s?\d/, file + ' price');
    assert.doesNotMatch(text, /Muslim kids/i, file + ' wording');
    assert.doesNotMatch(text, /hifz|musabaqah/i, file + ' transliteration');
  }
});

test('app pages: status wording is right (closed testing, coming soon, Android only), and every page links onward', () => {
  assert.match(read('quraan-class/index.html'), /closed testing/i);
  assert.match(read('quraan-class/index.html'), /no public release date/i);
  assert.match(read('ayah-play/index.html'), /Coming to Google Play/);
  assert.doesNotMatch(read('ayah-play/index.html').split('<main')[1].split('</main>')[0], /20\d\d/, 'no dates on the Ayah Play page');
  for (const file of Object.keys(PAGES)) assert.match(read(file), /Android only/, file);
  const apps = read('apps/index.html');
  for (const p of ['/islamic-coloring/', '/quraan-class/', '/ayah-play/']) assert.ok(apps.includes(`href="${p}"`), 'apps links to ' + p);
});

test('sitemap lists every app page', () => {
  const map = read('sitemap.xml');
  for (const path of Object.values(PAGES)) assert.ok(map.includes(`<loc>https://kevroapps.com${path}</loc>`), path);
});

// ---- Review pass of 14 Nov 2026 (Chody's first seven items) ----
const headerButton = (f) => (read(f).match(/<a [^>]*class="btn btn-nav"[^>]*>[^<]*<\/a>/) || [null])[0];

test('header button: only where it matches the page (store on the coloring pages, join the test on Qur\'aan Class, a question on Ayah Play)', () => {
  assert.match(headerButton('islamic-coloring/index.html'), /play\.google\.com.*Get the app/);
  assert.match(headerButton('privacy/index.html'), /play\.google\.com.*Get the app/);
  assert.match(headerButton('quraan-class/index.html'), /href="\/tester\/".*Help us test it/);
  assert.match(headerButton('ayah-play/index.html'), /href="\/contact\/\?app=ayah-play".*Ask a question/);
  for (const f of ['index.html', 'apps/index.html', 'about/index.html', 'contact/index.html', 'services/index.html', 'tester/index.html', 'thanks/index.html', 'quraan-class/privacy/index.html', 'quraan-class/delete-account/index.html', 'ayah-play/privacy/index.html']) {
    assert.equal(headerButton(f), null, f + ' has no download button in the header');
  }
});

test('home phone: no fake notch, and the screen takes the screenshots\' own shape', () => {
  assert.ok(!read('index.html').includes('phone-notch'));
  const css = read('css/site.css');
  assert.ok(!css.includes('phone-notch'));
  assert.match(css, /\.phone-screen \{[^}]*aspect-ratio: 594 \/ 1254;/);
});

test('screenshots: each one is a link to its own image (opens larger), nothing is cropped by a fixed ratio', () => {
  for (const f of ['islamic-coloring/index.html', 'quraan-class/index.html', 'ar/islamic-coloring/index.html', 'ar/quraan-class/index.html']) {
    const html = read(f);
    const figs = [...html.matchAll(/<figure class="shot[^"]*">\s*<a href="([^"]+)" data-zoom><img src="([^"]+)" alt="[^"]+" width="(\d+)" height="(\d+)"/g)];
    assert.ok(figs.length >= 3, f + ' has zoomable figures');
    for (const m of figs) assert.equal(m[1], m[2], f + ' the link opens the same image');
    assert.equal((html.match(/<img [^>]*screenshots\/(?:shot|quraan-class)-/g) || []).length, figs.length, f + ' every screenshot is a figure');
    assert.ok(html.includes('/js/gallery.js'), f + ' loads the larger-view script');
  }
  const css = read('css/site.css');
  assert.doesNotMatch(css, /\.shot \{[^}]*aspect-ratio/);
  assert.match(css, /\.shot img \{ width: 100%; height: auto; \}/);
  for (const f of ['islamic-coloring/index.html', 'quraan-class/index.html']) assert.match(read(f), /<figcaption>[^<]+<\/figcaption>/, f + ' captions');
});

test('contact page is an app-support page: name, email, app, message; email first; a way out if the form fails', () => {
  const html = read('contact/index.html');
  assert.deepEqual([...html.matchAll(/<(?:input|select|textarea) [^>]*name="([a-z_]+)"/g)].map((m) => m[1]).filter((n) => !['access_key', 'redirect', 'subject', 'botcheck'].includes(n)), ['name', 'email', 'app', 'message']);
  assert.doesNotMatch(html, /name="(business|phone)"/);
  assert.doesNotMatch(html, /your project|your business/i);
  assert.match(html, /class="contact-direct"[^>]*>Prefer email\? <a href="mailto:support@kevroapps\.com">/);
  assert.match(html, /data-thanks="\/thanks\/" data-failed="Sorry, that did not send\. Please email support@kevroapps\.com\."/);
  assert.match(html, /If the form does not work, email <a href="mailto:support@kevroapps\.com">/);
  assert.match(html, /<a href="\/privacy\/">Privacy policy<\/a>/);
  assert.match(html, /Please do not include a child's name/);
  assert.ok(html.includes('/js/contact.js'));
  for (const key of ['islamic-coloring', 'quraan-class', 'ayah-play']) assert.ok(html.includes(`data-key="${key}"`), key);
  assert.doesNotMatch(html.replace(/<[^>]+>/g, ' '), /[–—]| - |memoris|Muslim kids/i);
});

test('colors: white on the primary button is at least 4.5:1 at both ends of the gradient, and form edges are at least 3:1', () => {
  const css = read('css/site.css').replace(/\r/g, '');
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const grad = css.match(/--btn-grad: linear-gradient\(180deg, (#[0-9A-Fa-f]{6}) 0%, (#[0-9A-Fa-f]{6}) 100%\)/);
  assert.ok(grad, 'light gradient');
  assert.ok(ratio('#FFFFFF', grad[1]) >= 4.5 && ratio('#FFFFFF', grad[2]) >= 4.5, 'gradient ends ' + grad[1] + ' ' + grad[2]);
  assert.ok(ratio('#FFFFFF', '#2F6BEA') >= 4.5, 'dark theme button blue');
  const light = css.match(/--field-border: (#[0-9A-Fa-f]{6});/);
  assert.ok(ratio(light[1], '#FFFFFF') >= 3, 'light field edge on a white card ' + light[1]);
  const darkEdges = [...css.matchAll(/--field-border: (#[0-9A-Fa-f]{6});/g)].map((m) => m[1]).slice(1);
  assert.equal(darkEdges.length, 2, 'dark theme sets it twice (device setting and chosen)');
  for (const d of darkEdges) { assert.ok(ratio(d, '#131E31') >= 3 && ratio(d, '#0B1322') >= 3, 'dark field edge ' + d); }
});

test('every page that carries the stylesheet asks for the same version (so the new header reaches visitors)', () => {
  const versions = new Set();
  for (const f of ['index.html', '404.html', 'apps/index.html', 'about/index.html', 'contact/index.html', 'services/index.html', 'tester/index.html', 'thanks/index.html', 'privacy/index.html', 'islamic-coloring/index.html', 'quraan-class/index.html', 'ayah-play/index.html', 'quraan-class/privacy/index.html', 'quraan-class/delete-account/index.html', 'ayah-play/privacy/index.html', 'ar/index.html', 'ar/thanks/index.html', 'ar/contact/index.html']) {
    const m = read(f).match(/css\/site\.css\?v=(\d+)/);
    assert.ok(m, f);
    versions.add(m[1]);
  }
  assert.equal(versions.size, 1, [...versions].join());
});

test('privacy policy covers iPhone and iPad: App Store purchase, add-only Photos, TestFlight, and keeps the no-account model', () => {
  const html = read('privacy/index.html');
  for (const phrase of ["Apple's App Store", 'iPhone and iPad', 'TestFlight', 'add pictures to Photos', 'https://www.apple.com/legal/privacy/', 'IDFA', 'public link', 'content packs', 'Kids Category']) assert.ok(html.includes(phrase), phrase);
  assert.ok(html.includes('Short Privacy Summary (for the app stores)'));
  assert.ok(!html.includes('for Play Store'));
  assert.ok(!/premium/i.test(html), 'five content packs, not one premium unlock');
  assert.ok(html.includes('The app does not require account registration'));
  assert.ok(!/Muslim kids|colour/i.test(html));
});
