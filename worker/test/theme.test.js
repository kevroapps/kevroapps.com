// Tests for the light and dark button in js/theme.js, against a tiny fake page.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'js', 'theme.js'), 'utf8');

function page({ systemDark = false, saved = null, hasNav = true, storageThrows = false } = {}) {
  const attrs = {};
  if (saved) attrs['data-theme'] = saved;
  const metas = [{ attrs: { content: '#fff' }, setAttribute(k, v) { this.attrs[k] = v; } }, { attrs: { content: '#0B1322' }, setAttribute(k, v) { this.attrs[k] = v; } }];
  const nav = { children: [], appendChild(c) { this.children.push(c); } };
  const created = [];
  const store = {};
  const root = { getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = v; } };
  const document = {
    documentElement: root,
    querySelector: (sel) => (sel === '.nav' && hasNav ? nav : null),
    querySelectorAll: () => metas,
    createElement: () => { const b = { attrs: {}, handlers: {}, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { this.handlers[t] = f; } }; created.push(b); return b; },
  };
  const window = { matchMedia: () => ({ matches: systemDark, addEventListener() {} }) };
  const localStorage = storageThrows
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  vm.runInNewContext(SOURCE, { document, window, localStorage });
  return { attrs, metas, nav, button: created[0], store, click: () => created[0].handlers.click() };
}

test('theme: the button is added to the header and starts from the device setting', () => {
  const light = page({ systemDark: false });
  assert.equal(light.nav.children.length, 1);
  assert.equal(light.button.attrs['aria-pressed'], 'false');
  const dark = page({ systemDark: true });
  assert.equal(dark.button.attrs['aria-pressed'], 'true');
});

test('theme: clicking switches the page and remembers the choice', () => {
  const p = page({ systemDark: false });
  p.click();
  assert.equal(p.attrs['data-theme'], 'dark');
  assert.equal(p.store['kevro-theme'], 'dark');
  assert.equal(p.button.attrs['aria-pressed'], 'true');
  assert.ok(p.metas.every((m) => m.attrs.content === '#0B1322'));
  p.click();
  assert.equal(p.attrs['data-theme'], 'light');
  assert.equal(p.store['kevro-theme'], 'light');
  assert.ok(p.metas.every((m) => m.attrs.content === '#ffffff'));
});

test('theme: a saved choice wins over the device setting; on a dark device a click goes to light', () => {
  const p = page({ systemDark: true, saved: 'light' });
  assert.equal(p.button.attrs['aria-pressed'], 'false');
  const q = page({ systemDark: true });
  q.click();
  assert.equal(q.attrs['data-theme'], 'light');
});

test('theme: blocked storage never breaks the button, and a page without a header is left alone', () => {
  const p = page({ storageThrows: true });
  assert.doesNotThrow(() => p.click());
  assert.equal(p.attrs['data-theme'], 'dark');
  const none = page({ hasNav: false });
  assert.equal(none.button, undefined);
});

test('theme: every page that uses the stylesheet sets the saved theme before it paints and loads the button', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  for (const f of ['index.html', 'apps/index.html', 'about/index.html', 'contact/index.html', 'privacy/index.html', 'services/index.html', 'tester/index.html', 'thanks/index.html', '404.html']) {
    const html = readFileSync(join(root, f), 'utf8');
    assert.ok(html.includes('localStorage.getItem("kevro-theme")'), f + ' early script');
    assert.ok(html.indexOf('localStorage.getItem("kevro-theme")') < html.indexOf('/css/site.css'), f + ' runs before the stylesheet');
    assert.ok(html.includes('/js/theme.js'), f + ' loads theme.js');
    assert.ok(html.includes('logo-for-light') && html.includes('logo-for-dark'), f + ' has both logos');
  }
});
