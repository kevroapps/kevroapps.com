// Checks on the live scene on the Ayah Play page (English and Arabic): the poster works without JavaScript, the scene
// code is not fetched until the frame is near the screen, reduced motion and any failure keep the poster, the scene
// makes no request to any other site, and its geometry matches Chody's spec. The drawing itself needs a browser with
// WebGL; it was checked there by hand (see the pull request).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const PAGES = { en: 'ayah-play/index.html', ar: 'ar/ayah-play/index.html' };
const FRAME = /<figure class="scene-frame"[\s\S]*?<\/figure>/;

test('poster first: both pages carry the still picture in plain HTML, with sizes, a true alt text and no canvas', () => {
  for (const [lang, file] of Object.entries(PAGES)) {
    const html = read(file);
    const frame = html.match(FRAME);
    assert.ok(frame, file + ' has the frame');
    const f = frame[0];
    assert.match(f, /data-scene="ayah-play"/);
    assert.match(f, /<source media="\(max-width: 640px\)" srcset="\/images\/scenes\/ayah-play-poster-portrait\.webp" type="image\/webp" width="800" height="1000">/, file + ' portrait crop');
    assert.match(f, /<img class="scene-poster" src="\/images\/scenes\/ayah-play-poster-landscape\.webp" width="1280" height="800" alt="[^"]{40,}"/, file + ' landscape crop with size and alt');
    assert.doesNotMatch(f, /<canvas|hidden|display:\s*none/, file + ' nothing in the markup depends on a script');
    const alt = f.match(/alt="([^"]+)"/)[1];
    if (lang === 'en') {
      assert.match(alt, /illustration/i, 'says it is an illustration');
      assert.doesNotMatch(alt, /screenshot of the app|app screen/i, 'does not claim to be the app');
    }
    // the picture must not claim text or people: nothing readable, no faces
    assert.doesNotMatch(alt, /\b(face|child|girl|boy|person|people|animal|moon|crescent|text|words|letters)\b/i, file + ' alt says nothing that the picture does not show');
    for (const img of ['ayah-play-poster-portrait.webp', 'ayah-play-poster-landscape.webp']) {
      const p = join(root, 'images', 'scenes', img);
      assert.ok(existsSync(p), img + ' exists');
      assert.ok(statSync(p).size < 60 * 1024, img + ' stays small');
    }
  }
});

test('the scene adds no indexable text and leaves title, description, schema and hreflang alone', () => {
  for (const file of Object.values(PAGES)) {
    const html = read(file);
    const band = html.match(/<div class="scene-band">[\s\S]*?<\/figure>\s*<\/div>\s*<\/div>/)[0];
    assert.equal(band.replace(/<[^>]*>/g, '').trim(), '', file + ': the band has no text of its own');
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{40,}">/);
    assert.match(html, /<link rel="canonical" href="https:\/\/kevroapps\.com\/(ar\/)?ayah-play\/">/);
    assert.match(html, /hreflang="en"[^>]*href="https:\/\/kevroapps\.com\/ayah-play\/"/);
    assert.match(html, /hreflang="ar"[^>]*href="https:\/\/kevroapps\.com\/ar\/ayah-play\/"/);
    assert.match(html, /hreflang="x-default"/);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    assert.deepEqual(ld.map((o) => o['@type']).sort(), ['BreadcrumbList', 'FAQPage'], file + ' keeps its schema');
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  }
});

test('the scene belongs to the Ayah Play pages only; every other page is unchanged by it', () => {
  for (const f of ['index.html', 'apps/index.html', 'about/index.html', 'contact/index.html', 'islamic-coloring/index.html', 'quraan-class/index.html', 'ar/index.html', 'ar/islamic-coloring/index.html', 'ar/quraan-class/index.html', 'ar/apps/index.html']) {
    const html = read(f);
    assert.doesNotMatch(html, /scene-loader|scene\.css|scene-frame/, f);
  }
  for (const file of Object.values(PAGES)) {
    const html = read(file);
    assert.equal((html.match(/scene-loader\.js/g) || []).length, 1);
    assert.match(html, /<script src="\/js\/scene-loader\.js" defer><\/script>/, 'a small deferred script, not a blocking one');
    assert.doesNotMatch(html, /three|ayah-play-scene|scene-frame\.js/i, 'the page never names the heavy files: only the loader does');
  }
});

// ---- the loader, run against a stand-in page ----
const later = () => new Promise((r) => setImmediate(r));
function runLoader({ reduce = false, saveData = false, ready = 'loading', frames = 1, paint = false } = {}) {
  const painters = [], longTimers = [];
  const imports = [];
  const observers = [];
  const listeners = {};
  const frameList = Array.from({ length: frames }, () => ({ dataset: {} }));
  const source = read('js/scene-loader.js').replace(/import\(/g, '__import(');
  const ctx = {
    document: { querySelectorAll: () => frameList, get readyState() { return ready; } },
    window: { matchMedia: () => ({ matches: reduce }), addEventListener: (n, f) => { listeners[n] = f; }, requestIdleCallback: (f) => f() },
    navigator: { connection: { saveData } },
    IntersectionObserver: class { constructor(cb, opts) { this.cb = cb; this.opts = opts; observers.push(this); } observe() {} disconnect() { this.gone = true; } },
    ResizeObserver: class {},
    __import: (u) => { imports.push(u); return Promise.resolve({ mountScene: () => {} }); },
    setTimeout: (f, ms) => { if (ms >= 3000) longTimers.push(f); else f(); },
    Array
  };
  if (paint) ctx.PerformanceObserver = class { constructor(cb) { this.cb = cb; painters.push(this); } observe() {} };
  ctx.window.IntersectionObserver = ctx.IntersectionObserver; ctx.window.ResizeObserver = ctx.ResizeObserver;
  vm.runInNewContext(source, ctx);
  return { imports, observers, listeners, frameList, painters, longTimers };
}

test('loader: nothing is fetched until the frame is near the screen, and only after the page has loaded', async () => {
  const run = runLoader({ ready: 'loading' });
  assert.equal(run.observers.length, 1, 'watches the frame');
  assert.match(run.observers[0].opts.rootMargin, /^\d+px 0px$/, 'a margin, so it starts just before the frame shows');
  assert.ok(parseInt(run.observers[0].opts.rootMargin, 10) <= 300, 'but not far from it');
  assert.deepEqual(run.imports, [], 'not near: no import');
  run.observers[0].cb([{ isIntersecting: false }]);
  assert.deepEqual(run.imports, [], 'a non-intersecting report: still nothing');
  run.observers[0].cb([{ isIntersecting: true }]);
  assert.deepEqual(run.imports, [], 'near, but the page has not finished loading: still nothing');
  run.listeners.load();
  await later();
  assert.deepEqual(run.imports, ['/js/scene/scene-frame.js'], 'then it fetches the scene code, from this site');
  assert.ok(run.observers[0].gone, 'and stops watching');
  // the page is already loaded: a frame that is far away still fetches nothing; the same frame coming near does
  const loaded = runLoader({ ready: 'complete' });
  loaded.observers[0].cb([{ isIntersecting: false }]);
  await later();
  assert.deepEqual(loaded.imports, [], 'far from the screen: nothing, even after load');
  assert.ok(!loaded.observers[0].gone, 'and it keeps watching');
  loaded.observers[0].cb([{ isIntersecting: true }]);
  await later();
  assert.deepEqual(loaded.imports, ['/js/scene/scene-frame.js'], 'near the screen: fetched once');
});

test('loader: waits for the first paint of the page before it fetches anything', async () => {
  const run = runLoader({ ready: 'complete', paint: true });
  run.observers[0].cb([{ isIntersecting: true }]);
  await later();
  assert.deepEqual(run.imports, [], 'the page is loaded and the frame is near, but nothing has been painted yet');
  assert.equal(run.painters.length, 1);
  run.painters[0].cb({ getEntriesByName: (n) => (n === 'first-contentful-paint' ? [{}] : []) }, { disconnect() {} });
  await later();
  assert.deepEqual(run.imports, ['/js/scene/scene-frame.js'], 'after the first paint, a short wait and an idle moment, it fetches');
  // and a browser that never reports a paint does not wait for ever
  const stuck = runLoader({ ready: 'complete', paint: true });
  stuck.observers[0].cb([{ isIntersecting: true }]);
  await later();
  assert.deepEqual(stuck.imports, []);
  assert.equal(stuck.longTimers.length, 1, 'a four second limit');
  stuck.longTimers[0]();
  await later();
  assert.deepEqual(stuck.imports, ['/js/scene/scene-frame.js']);
});

test('loader: reduced motion, Save-Data or a missing browser feature keep the poster without watching anything', () => {
  const reduced = runLoader({ reduce: true });
  assert.equal(reduced.observers.length, 0);
  assert.deepEqual(reduced.imports, []);
  assert.equal(reduced.frameList[0].dataset.sceneState, 'reduced-motion');
  assert.equal(runLoader({ saveData: true }).observers.length, 0);
  const none = vm.runInNewContext(read('js/scene-loader.js'), { document: { querySelectorAll: () => [] }, window: {}, navigator: {}, Array });
  assert.equal(none, undefined);
});

// ---- the frame script, in Node with stand-ins: the failure paths must leave the poster ----
function stubFrame() {
  const classes = new Set();
  const frame = {
    dataset: {}, classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    getBoundingClientRect: () => ({ width: 360, height: 450 }), getAttribute: () => 'Give the ball a small push.', appendChild: () => {}, children: []
  };
  return { frame, classes };
}
const stubGlobals = (reduce, canvasHasGl) => {
  globalThis.window = globalThis;
  globalThis.matchMedia = () => ({ matches: reduce, addEventListener() {}, removeEventListener() {} });
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {}, getContext: () => (canvasHasGl ? {} : null), remove() {} }) };
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  globalThis.IntersectionObserver = class { observe() {} disconnect() {} };
};
const unstub = () => { for (const k of ['window', 'matchMedia', 'document', 'ResizeObserver', 'IntersectionObserver']) delete globalThis[k]; };

test('frame: reduced motion shows the poster and never loads the scene code or the 3D library', async () => {
  stubGlobals(true, true);
  try {
    const { mountScene } = await import(pathToFileURL(join(root, 'js/scene/scene-frame.js')).href + '?reduced');
    const { frame, classes } = stubFrame();
    await mountScene(frame);
    assert.equal(frame.dataset.sceneState, 'reduced-motion');
    assert.ok(!classes.has('is-live'), 'the poster stays');
    assert.equal(frame.sceneHandle, undefined, 'no scene was created');
  } finally { unstub(); }
  const src = read('js/scene/scene-frame.js');
  assert.ok(src.indexOf("reduceQuery.matches) { state('reduced-motion'); return; }") < src.indexOf("import('./ayah-play-scene.js')"), 'the check comes before the import');
  assert.match(src, /'change', onReduce/, 'and a visitor who turns reduced motion on while watching gets the poster back');
});

test('frame: no WebGL (or any error) keeps the poster and leaves no canvas behind', async () => {
  stubGlobals(false, false);
  try {
    const { mountScene } = await import(pathToFileURL(join(root, 'js/scene/scene-frame.js')).href + '?nogl');
    const { frame, classes } = stubFrame();
    await mountScene(frame);
    assert.equal(frame.dataset.sceneState, 'error');
    assert.ok(!classes.has('is-live'), 'the poster stays');
  } finally { unstub(); }
  const src = read('js/scene/scene-frame.js');
  assert.match(src, /webglcontextlost[\s\S]*?fallBack\('context-lost'\)/, 'a lost graphics context puts the poster back');
});

test('frame: pauses when off screen or the tab is hidden, resumes without catching up, and has no sound', () => {
  const src = read('js/scene/scene-frame.js');
  assert.match(src, /onScreen && !document\.hidden/);
  assert.match(src, /visibilitychange/);
  assert.match(src, /new IntersectionObserver/);
  const scene = read('js/scene/ayah-play-scene.js');
  assert.match(scene, /if \(last === null\) last = now;\s*\/\/ resume without catching up/);
  assert.match(scene, /Math\.min\(0\.05/, 'a long frame never makes a big jump');
  assert.doesNotMatch(scene + src, /\bAudio\b|AudioContext|PositionalAudio|new Howl|\.play\(\)/, 'no sound');
});

// ---- no other site, no storage, no text, no people ----
test('privacy: the scene files make no request to any other site and use no storage, cookies or beacons', () => {
  for (const f of ['js/scene/ayah-play-scene.js', 'js/scene/scene-frame.js', 'js/scene-loader.js', 'css/scene.css']) {
    const src = read(f);
    assert.doesNotMatch(src, /https?:\/\//, f + ' names no web address');
    assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|indexedDB|document\.cookie|new Image\(|TextureLoader|ImageLoader|FileLoader/, f + ' loads and stores nothing');
  }
  const loaderImports = [...read('js/scene-loader.js').matchAll(/import\('([^']+)'\)/g)].map((m) => m[1]);
  assert.deepEqual(loaderImports, ['/js/scene/scene-frame.js'], 'the loader imports one file, from this site');
  assert.deepEqual([...read('js/scene/scene-frame.js').matchAll(/import\('([^']+)'\)/g)].map((m) => m[1]), ['./ayah-play-scene.js']);
  assert.match(read('js/scene/ayah-play-scene.js'), /from '\.\.\/vendor\/three-0\.170\.0\.module\.min\.js'/, 'three.js comes from our own folder');
  // the privacy pages stay true: the pages themselves still make no third-party request
  for (const file of Object.values(PAGES)) {
    const html = read(file);
    assert.doesNotMatch(html.replace(/<a [^>]*>/g, '').replace(/<link rel="(canonical|alternate)"[^>]*>/g, '').replace(/<meta [^>]*>/g, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, ''), /(src|href)="https?:\/\/(?!kevroapps\.com)/, file + ' loads nothing from another site');
  }
});

test('vendored three.js: pinned version, own license, byte for byte what npm published', () => {
  const lib = readFileSync(join(root, 'js/vendor/three-0.170.0.module.min.js'));
  assert.equal(createHash('sha256').update(lib).digest('hex'), '08fd7545d13d2c7fb65ab691530a802dafefd638596501854f267d0fb13c39e7');
  assert.match(lib.toString('utf8', 0, 400), /const t="170"/);
  assert.match(read('js/vendor/three-LICENSE.txt'), /MIT License/);
  const urls = new Set(lib.toString('utf8').match(/https?:\/\/[^"'\s)]+/g) || []);
  assert.deepEqual([...urls], ['http://www.w3.org/1999/xhtml'], 'only an XML namespace name, never fetched');
});

test('nothing readable inside the picture: no text is drawn, no faces, people, animals or crescent', () => {
  const scene = read('js/scene/ayah-play-scene.js');
  assert.doesNotMatch(scene, /fillText|strokeText|\.font\s*=|TextGeometry|FontLoader|<text/, 'the scene draws no text');
  assert.doesNotMatch(scene.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), /crescent|moon|face|eye|animal|bird|person/i, 'no such shapes are built');
  assert.match(read('js/scene/scene-frame.js'), /className = 'scene-canvas'/);
  assert.match(read('js/scene/ayah-play-scene.js'), /canvas\.setAttribute\('aria-hidden', 'true'\)/, 'the canvas is hidden from screen readers; the poster alt and the button label speak for the frame');
});

// ---- the geometry and the numbers of the spec ----
const scene = await import(pathToFileURL(join(root, 'js/scene/ayah-play-scene.js')).href);

test('spec numbers: ball, band, path, speed, cycle, nudge, camera, light budget', () => {
  const S = scene.SPEC;
  assert.equal(S.ballDiameter, 1);
  assert.equal(S.bandShare, 0.28);
  assert.equal(S.pathWidth, 1.8);
  assert.equal(S.sectionArc, 24);
  assert.equal(S.speed, 0.8, 'Captain: 0.5 was too slow (15 Nov)');
  assert.equal(S.cycleSeconds, 30);
  assert.equal(S.sectionArc / S.speed, S.cycleSeconds, 'one section every 30 seconds');
  assert.deepEqual([S.nudgeSpeed, S.nudgeUp, S.nudgeDown], [1.04, 0.25, 1.5]);
  assert.deepEqual([S.cameraDistance, S.cameraPitchDeg, S.fovPhone, S.fovDesktop, S.ballFromTop, S.shadowMap], [6, 20, 40, 32, 0.6, 1024]);
  assert.equal(scene.POSTER_DISTANCE, 6, 'the poster is the pose 6 units along, as before');
  const src = read('js/scene/ayah-play-scene.js');
  assert.match(src, /advance\(POSTER_DISTANCE\)/, 'the live scene starts at the poster pose');
  assert.match(read('tools/scene/make-posters.mjs'), /setDistance\(m\.POSTER_DISTANCE\)/, 'and the poster is made by the same code');
  assert.match(src, /dprCap = options\.dprCap \?\? \(phone \? 1\.5 : 2\)/, 'pixel ratio capped at 1.5 on phones');
  assert.match(src, /castShadow = options\.shadows !== false/, 'one shadow casting light');
  assert.equal((src.match(/new DirectionalLight/g) || []).length, 1);
});

test('the land: the centre line measures 24, and path, height and slope match at every join', () => {
  const L = scene.land;
  assert.ok(Math.abs(L.arc - 24) < 0.001, 'centre line length ' + L.arc);
  assert.ok(L.step < 0 && L.step > -3, 'a gentle downhill');
  for (const x of [-15, -6, 0, 3, 9, 17]) for (const q of [-11, -5, 0.3, 4, 10]) {
    assert.ok(Math.abs(L.height(x, q + L.period) - (L.height(x, q) + L.step)) < 1e-9, 'height repeats at ' + x + ',' + q);
    const a = L.slopes(x, q), b = L.slopes(x, q + L.period);
    assert.ok(Math.abs(a.hx - b.hx) < 1e-6 && Math.abs(a.hq - b.hq) < 1e-6, 'slope repeats at ' + x + ',' + q);
  }
  for (const q of [-11, -3, 0, 6.5]) assert.ok(Math.abs(L.centreX(q) - L.centreX(q + L.period)) < 1e-9, 'path position repeats');
  // the distance along the path maps to the ground in whole sections
  assert.ok(Math.abs(L.qAtArc(6) - L.qAtArc(-18) - L.period) < 1e-6, 'one section of travel is one section of ground');
});

test('nudge: smooth up to 1.04 in 0.25 s, back over 1.5 s, and no stacking', () => {
  const n = scene.createNudge();
  assert.equal(n.speed(), 0.8);
  assert.equal(n.start(), true);
  assert.equal(n.start(), false, 'a second nudge during the first is refused');
  let prev = 0.8, peak = 0;
  for (let t = 0; t < 0.25; t += 0.01) { n.update(0.01); assert.ok(n.speed() >= prev - 1e-9, 'rising'); prev = n.speed(); peak = Math.max(peak, prev); }
  assert.ok(Math.abs(peak - 1.04) < 0.005, 'reaches 1.04 at 0.25 s: ' + peak);
  for (let t = 0; t < 1.49; t += 0.01) { n.update(0.01); assert.ok(n.speed() <= prev + 1e-9, 'falling'); prev = n.speed(); assert.equal(n.start(), false, 'still refused'); }
  n.update(0.05);
  assert.equal(n.active, false);
  assert.equal(n.speed(), 0.8);
  assert.equal(n.start(), true, 'accepted again once the first one is over');
});

test('frame styling: radii, borders and surfaces from the spec, same scene in both themes', () => {
  const css = read('css/scene.css');
  assert.match(css, /border-radius: 24px/);
  assert.match(css, /border-radius: 32px/);
  assert.match(css, /--scene-surface: #F7F5EF/);
  assert.match(css, /--scene-border: #DDDCD3/);
  assert.match(css, /--scene-surface: #182421; --scene-border: #3A4942/);
  assert.match(css, /aspect-ratio: 4 \/ 5/);
  assert.match(css, /aspect-ratio: 16 \/ 10/);
  assert.match(css, /touch-action: pan-y/, 'vertical scrolling still works through the frame');
  assert.doesNotMatch(css, /box-shadow|filter:\s*drop-shadow|blur\(/, 'no glow, no heavy shadow');
});

test('Arabic screen reader lines: Chody\'s 15 Nov wording, byte for byte, in the source and on the page', () => {
  const lock = JSON.parse(read('tools/arabic/chody_ayah_scene_2026-11-15.json'));
  assert.deepEqual(Object.keys(lock), ['sc_alt', 'sc_nudge']);
  const source = read('tools/arabic/ar_content.py');
  for (const [k, arabic] of Object.entries(lock)) {
    const row = source.split(/\r?\n/).find((l) => l.startsWith(`    (${JSON.stringify(k)}, `));
    assert.ok(row && row.endsWith(`${JSON.stringify(arabic)}),`), k + ' matches the locked text');
  }
  const html = read('ar/ayah-play/index.html');
  assert.ok(html.includes(`alt="${lock.sc_alt}"`), 'alt on the page');
  assert.ok(html.includes(`data-nudge-label="${lock.sc_nudge}"`), 'button label on the page');
});

test('the scene styles are inline in both pages (no extra request before first paint) and equal css/scene.css', () => {
  const source = read('css/scene.css').replace(/\r\n/g, '\n').replace(/^\/\*[ \s\S]*?\*\/\n/, '').trim();
  for (const file of Object.values(PAGES)) {
    const html = read(file).replace(/\r\n/g, '\n');
    const m = html.match(/<style>\n([ \s\S]*?)\n  <\/style>/);
    assert.ok(m, file + ' has the inline style');
    assert.equal(m[1].split('\n').map((l) => l.replace(/^  /, '')).join('\n'), source, file + ' carries css/scene.css as it is');
    assert.doesNotMatch(html, /href="\/css\/scene\.css/, file + ' does not wait for a separate file');
  }
});
