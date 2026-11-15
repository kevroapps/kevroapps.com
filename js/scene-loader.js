/* Starts the live scene on a page, but only when it is worth it. The page ships a still poster; this
   small script waits until the frame is close to the screen and the page has finished loading, then
   fetches the scene code from this site (nothing from any other site). It does nothing when the visitor
   asks for reduced motion or Save-Data, or when the browser lacks what the scene needs. */
(function () {
  'use strict';
  var frames = document.querySelectorAll('.scene-frame[data-scene]');
  if (!frames.length) return;
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  if (mq && mq.matches) { for (var i = 0; i < frames.length; i++) frames[i].dataset.sceneState = 'reduced-motion'; return; }
  var conn = navigator.connection;
  if (conn && conn.saveData) return;
  if (!('IntersectionObserver' in window) || !('ResizeObserver' in window)) return;

  // Wait for the page to finish loading AND to have painted its first content, then a moment more and an idle
  // slot, so the scene never competes with the text and images the visitor came for.
  function afterPaint(fn) {
    var loaded = document.readyState === 'complete', painted = false, fired = false;
    function check() {
      if (!loaded || !painted || fired) return;
      fired = true;
      setTimeout(function () { (window.requestIdleCallback || function (f) { f(); })(fn, { timeout: 2000 }); }, 800);
    }
    if (!loaded) window.addEventListener('load', function () { loaded = true; check(); }, { once: true });
    try {
      var po = new PerformanceObserver(function (list, obs) {
        if (list.getEntriesByName('first-contentful-paint').length) { painted = true; obs.disconnect(); check(); }
      });
      po.observe({ type: 'paint', buffered: true });
      setTimeout(function () { painted = true; check(); }, 4000);   // never wait for ever
    } catch (e) { painted = true; }
    check();
  }
  Array.prototype.forEach.call(frames, function (frame) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries.some(function (e) { return e.isIntersecting; })) return;
      io.disconnect();
      afterPaint(function () {
        import('/js/scene/scene-frame.js').then(function (m) { return m.mountScene(frame); }).catch(function () { /* the poster stays */ });
      });
    }, { rootMargin: '100px 0px' });
    io.observe(frame);
  });
})();
