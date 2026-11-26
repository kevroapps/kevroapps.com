// Makes the Ayah Play scene posters from the same code as the live scene, at 12 seconds of travel.
// Not part of the site: run it by hand when the scene changes.
//   SCENE_MODULES=<folder with node_modules containing puppeteer-core and sharp> CHROME_PATH=<chrome.exe> node tools/scene/make-posters.mjs
// It writes images/scenes/ayah-play-poster-portrait.webp (4:5) and ...-landscape.webp (16:10).
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(join(process.env.SCENE_MODULES || root, 'noop.js'));
const puppeteer = require('puppeteer-core');
const sharp = require('sharp');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  if (path === '/__poster__') { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><body style="margin:0"><div id="f" style="position:relative;width:100px;height:100px"></div>'); return; }
  try { const body = await readFile(join(root, path)); res.setHeader('content-type', MIME[extname(path)] || 'application/octet-stream'); res.end(body); }
  catch { res.statusCode = 404; res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
await mkdir(join(root, 'images', 'scenes'), { recursive: true });
const crops = [['portrait', 800, 1000], ['landscape', 1280, 800]];
for (const [name, w, h] of crops) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => { throw e; });
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/__poster__`);
  const dataUrl = await page.evaluate(async (w, h) => {
    const m = await import('/js/scene/ayah-play-scene.js');
    const frame = document.getElementById('f');
    // drawn at twice the size, then reduced, so the edges are clean
    const sc = m.createScene(frame, { dpr: 2, dprCap: 2, preserveDrawingBuffer: true, phone: w < 900 });
    sc.resize(w, h);
    sc.setDistance(m.POSTER_DISTANCE);
    sc.render();
    return sc.canvas.toDataURL('image/png');
  }, w, h);
  const png = Buffer.from(dataUrl.split(',')[1], 'base64');
  const out = join(root, 'images', 'scenes', `ayah-play-poster-${name}.webp`);
  await sharp(png).resize(w, h, { kernel: 'lanczos3' }).webp({ quality: 82, effort: 6 }).toFile(out);
  console.log(name, w + 'x' + h, out);
  await page.close();
}
await browser.close(); server.close();
