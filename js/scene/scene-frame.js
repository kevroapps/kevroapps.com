/* Runs one live scene inside its frame on the page. Loaded only when the frame is near the screen (see
   /js/scene-loader.js). The poster stays in the page the whole time: this only draws on top of it, once
   the first frame, at the poster's exact pose, is ready. Anything that goes wrong puts the poster back. */
const POSTER_CLASS = 'is-live';

// let the page breathe between the heavy steps, so no single task blocks the main thread for long
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function mountScene(frame) {
  const state = (v) => { frame.dataset.sceneState = v; };
  let scene = null, button = null, ro = null, io = null;
  let onScreen = false;
  const reduceQuery = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  function fallBack(why) {
    if (io) io.disconnect();
    if (ro) ro.disconnect();
    document.removeEventListener('visibilitychange', sync);
    if (reduceQuery && reduceQuery.removeEventListener) reduceQuery.removeEventListener('change', onReduce);
    frame.classList.remove(POSTER_CLASS);
    if (button) { button.remove(); button = null; }
    if (scene) { const s = scene; scene = null; try { s.destroy(); s.canvas.remove(); } catch (e) { /* the poster is already showing */ } }
    state(why || 'poster');
  }
  function onReduce() { if (reduceQuery && reduceQuery.matches) fallBack('reduced-motion'); }
  function sync() {
    if (!scene) return;
    if (onScreen && !document.hidden) scene.start(); else scene.stop();
  }

  try {
    if (reduceQuery && reduceQuery.matches) { state('reduced-motion'); return; }
    state('loading');
    const { createScene } = await import('./ayah-play-scene.js');
    if (reduceQuery && reduceQuery.matches) { state('reduced-motion'); return; }
    const box = frame.getBoundingClientRect();
    if (!box.width || !box.height) { state('poster'); return; }
    await breathe();
    scene = createScene(frame);
    frame.sceneHandle = scene;                        // a handle for checks in a real browser; nothing on the page reads it
    scene.canvas.className = 'scene-canvas';
    scene.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fallBack('context-lost'); });
    scene.resize(box.width, box.height);
    await breathe();
    if (!scene) return;
    scene.render();                                   // the first frame, drawn at the poster's pose
    ro = new ResizeObserver(() => {
      if (!scene) return;
      const r = frame.getBoundingClientRect();
      if (r.width && r.height) { scene.resize(r.width, r.height); scene.render(); }
    });
    ro.observe(frame);
    io = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      sync();
    }, { threshold: 0 });
    io.observe(frame);
    document.addEventListener('visibilitychange', sync);
    if (reduceQuery && reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduce);

    // a tap anywhere in the frame (or Enter and Space on the button) gives the ball one small push
    const label = frame.getAttribute('data-nudge-label');
    if (label) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'scene-nudge';
      button.setAttribute('aria-label', label);
      button.addEventListener('click', () => { if (scene) scene.nudge(); });
      frame.appendChild(button);
    }
    // show the live canvas only once its first frame has really been presented
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!scene) return;
    frame.classList.add(POSTER_CLASS);
    state('live');
    sync();
  } catch (err) {
    fallBack('error');
  }
}
