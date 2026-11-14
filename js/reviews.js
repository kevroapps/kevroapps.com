/* Parent reviews carousel, on its own so the English and Arabic home pages share it. The text of each review is never translated (real Google Play reviews). */
(function () {
  'use strict';
  /* Testimonials carousel: shows 3 cards (1 on mobile) with the next peeking.
     Auto-advances one card every 7s with a smooth slide; ANY interaction
     (hover, arrow, dot, drag/swipe) pauses it, and it resumes only after 10s
     of no interaction so it never fights the user. Loops seamlessly by cloning
     every card before and after the reals, then snapping (transition off) back
     into the canonical range once a slide lands : the clones are exact copies,
     so the reset is invisible. Reduced-motion: no auto-advance, instant manual
     nav. Without JS the first cards show statically and controls stay hidden. */
    var root = document.getElementById('tcarousel');
    if (!root) return;
    var section = root.closest('.testimonials') || root.parentNode;
    if (section.classList.contains('tc-ready')) return;   // a cached older home.js already built it: do not build twice
    var viewport = root.querySelector('.tc-viewport');
    var track = root.querySelector('.tc-track');
    var dotsWrap = document.getElementById('tc-dots');
    var arrows = [].slice.call(section.querySelectorAll('.tc-arrow'));
    var reals = [].slice.call(track.children);
    var N = reals.length;
    if (!N) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var AUTO = 7000, IDLE = 10000;
    var held = false, toggle = document.getElementById('tc-pause');
    var T = document.documentElement.lang === 'ar'
      ? { show: 'عرض المراجعة', play: 'استئناف العرض', pause: 'إيقاف العرض مؤقتًا' }
      : { show: 'Show review', play: 'Play reviews', pause: 'Pause reviews' };

    // Clone all cards before and after the reals for a seamless loop.
    var head = document.createDocumentFragment(), tail = document.createDocumentFragment();
    reals.forEach(function (c) {
      var a = c.cloneNode(true), b = c.cloneNode(true);
      a.setAttribute('aria-hidden', 'true'); b.setAttribute('aria-hidden', 'true');
      head.appendChild(a); tail.appendChild(b);
    });
    track.insertBefore(head, track.firstChild);
    track.appendChild(tail);

    var BASE = N;          // real card 0 sits at track index N (after the prepended clones)
    var pos = BASE;        // index of the left-most card currently shown
    var step = 0;          // px advanced per card (card width + gap)

    var dots = [];
    for (var d = 0; d < N; d++) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'tc-dot';
      dot.setAttribute('aria-label', T.show + ' ' + (d + 1));
      (function (idx) { dot.addEventListener('click', function () { pause(); goTo(idx); }); })(d);
      dotsWrap.appendChild(dot);
      dots.push(dot);
    }

    function realIndex(p) { return ((p - BASE) % N + N) % N; }
    function normalize(p) { while (p < BASE) p += N; while (p >= BASE + N) p -= N; return p; }

    function layout() {
      var vpW = viewport.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 24;
      var mobile = window.matchMedia('(max-width: 560px)').matches;
      var visible = mobile ? 1 : 3;
      var peek = mobile ? 0.22 : 0.16;                 // fraction of a card left peeking
      var W = (vpW - visible * gap) / (visible + peek);
      track.style.setProperty('--tc-w', W + 'px');
      step = W + gap;
      setX(pos, false);
    }

    function setX(p, animate) {
      pos = p;
      track.style.transition = animate ? '' : 'none';
      track.style.transform = 'translate3d(' + (-p * step) + 'px,0,0)';
      if (!animate) { track.getBoundingClientRect(); track.style.transition = ''; }  // flush
      updateDots();
    }

    function commit(target) {
      if (reduce) setX(normalize(target), false);      // instant, already canonical
      else setX(target, true);                         // animate, normalize on transitionend
    }

    function updateDots() {
      var r = realIndex(pos);
      for (var k = 0; k < dots.length; k++) {
        var on = k === r;
        dots[k].classList.toggle('is-active', on);
        if (on) dots[k].setAttribute('aria-current', 'true'); else dots[k].removeAttribute('aria-current');
      }
    }

    function goTo(idx) {
      var cur = realIndex(pos);
      var fwd = (idx - cur + N) % N;                   // 0..N-1
      var delta = (fwd * 2 <= N) ? fwd : fwd - N;      // shortest path, |delta| <= N/2
      pos = BASE + cur;                                // anchor canonical so the target stays within clones
      commit(pos + delta);
    }
    function moveBy(dir) { pos = BASE + realIndex(pos); commit(pos + dir); }

    track.addEventListener('transitionend', function (e) {
      if (e.propertyName !== 'transform') return;
      var n = normalize(pos);
      if (n !== pos) setX(n, false);
    });

    // ---- auto-advance + pause/resume ----
    var timer = null, idle = null;
    function play() { if (reduce || held || timer) return; timer = setInterval(function () { commit(pos + 1); }, AUTO); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function resume() { if (idle) { clearTimeout(idle); idle = null; } play(); }
    function pause() { stop(); if (idle) clearTimeout(idle); idle = setTimeout(resume, IDLE); }

    if (toggle && !reduce) {
      toggle.hidden = false;
      toggle.addEventListener('click', function () {
        held = !held;
        if (held) { stop(); if (idle) { clearTimeout(idle); idle = null; } } else { play(); }
        toggle.textContent = held ? T.play : T.pause;
      });
    }

    arrows.forEach(function (a) {
      a.addEventListener('click', function () { pause(); moveBy(parseInt(a.getAttribute('data-dir'), 10)); });
    });
    root.addEventListener('mouseenter', pause);
    root.addEventListener('mousemove', pause);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { pause(); moveBy(1); }
      else if (e.key === 'ArrowLeft') { pause(); moveBy(-1); }
    });

    // ---- drag / swipe ----
    var dragging = false, startX = 0, startPos = 0, dx = 0;
    viewport.addEventListener('pointerdown', function (e) {
      dragging = true; startX = e.clientX; startPos = BASE + realIndex(pos); dx = 0;
      pos = startPos;
      pause();
      track.style.transition = 'none';
      try { viewport.setPointerCapture(e.pointerId); } catch (_) {}
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      track.style.transform = 'translate3d(' + (-startPos * step + dx) + 'px,0,0)';
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      var steps = Math.max(-4, Math.min(4, Math.round(-dx / step)));
      track.style.transition = '';
      commit(startPos + steps);
      pause();                                         // restart the 10s idle window
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    window.addEventListener('resize', layout);

    section.classList.add('tc-ready');   // on the section: reveals both the side chevrons and the dots
    layout();
    play();
  })();
