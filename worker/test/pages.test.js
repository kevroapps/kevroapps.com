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

test('privacy policy covers iPhone and iPad: App Store purchase, add-only Photos, TestFlight, and keeps the no-account model', () => {
  const html = read('privacy/index.html');
  for (const phrase of ["Apple's App Store", 'iPhone and iPad', 'TestFlight', 'add pictures to Photos', 'https://www.apple.com/legal/privacy/', 'IDFA']) assert.ok(html.includes(phrase), phrase);
  assert.ok(html.includes('Short Privacy Summary (for the app stores)'));
  assert.ok(!html.includes('for Play Store'));
  assert.ok(html.includes('The app does not require account registration'));
  assert.ok(!/Muslim kids|colour/i.test(html));
});
