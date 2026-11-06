
  /* Hero slideshow: auto-advance with crossfade. Interaction (hover / tap / dot)
     PAUSES it; it resumes when the pointer leaves, or after ~7s of no
     interaction even if the pointer stays. Respects reduced-motion. Slides 2+
     lazy-load. Without JS, slide 1 shows statically and the dots stay hidden. */
  (function () {
    var root = document.getElementById('hero-slideshow');
    if (!root) return;
    var slides = [].slice.call(root.querySelectorAll('.slide'));
    var dots = [].slice.call(root.querySelectorAll('.dot'));
    var label = document.getElementById('hero-label');
    var held = false, toggle = document.getElementById('hero-pause');
    if (slides.length < 2) return;

    var LABELS = [
      'Beautiful Islamic scenes to color',
      'Mosques, Kaaba, and more',
      'Calm nature and everyday scenes',
      'Dozens of pages to explore',
      'Simple pages for little hands'
    ];
    var AUTO = 4000, IDLE = 7000;
    var i = 0, timer = null, idle = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    root.classList.add('js-slideshow');

    function load(n) {
      var img = slides[n];
      if (img && !img.getAttribute('src') && img.getAttribute('data-src')) {
        img.src = img.getAttribute('data-src');
      }
    }
    function show(n) {
      n = (n % slides.length + slides.length) % slides.length;
      load(n);
      load((n + 1) % slides.length);   // preload next for a smooth crossfade
      slides[i].classList.remove('is-active');
      dots[i].classList.remove('is-active');
      dots[i].removeAttribute('aria-current');
      i = n;
      slides[i].classList.add('is-active');
      dots[i].classList.add('is-active');
      dots[i].setAttribute('aria-current', 'true');
      if (label) label.textContent = LABELS[i] || label.textContent;
    }
    function play() { if (reduce || held || timer) return; timer = setInterval(function () { show(i + 1); }, AUTO); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function resume() { if (idle) { clearTimeout(idle); idle = null; } play(); }
    function pause() { stop(); if (idle) clearTimeout(idle); idle = setTimeout(resume, IDLE); }

    if (toggle && !reduce) {
      toggle.hidden = false;
      toggle.addEventListener('click', function () {
        held = !held;
        if (held) { stop(); if (idle) { clearTimeout(idle); idle = null; } } else { play(); }
        toggle.textContent = held ? 'Play slideshow' : 'Pause slideshow';
      });
    }

    dots.forEach(function (d, idx) {
      d.addEventListener('click', function () { pause(); show(idx); });
    });
    root.addEventListener('mouseenter', pause);
    root.addEventListener('mousemove', pause);   // stays paused while active; resumes ~7s after movement stops
    root.addEventListener('mouseleave', resume);
    root.addEventListener('touchstart', pause, { passive: true });

    load(1);   // begin fetching slide 2 in the background
    play();
  })();
  

  /* Testimonials carousel: shows 3 cards (1 on mobile) with the next peeking.
     Auto-advances one card every 7s with a smooth slide; ANY interaction
     (hover, arrow, dot, drag/swipe) pauses it, and it resumes only after 10s
     of no interaction so it never fights the user. Loops seamlessly by cloning
     every card before and after the reals, then snapping (transition off) back
     into the canonical range once a slide lands : the clones are exact copies,
     so the reset is invisible. Reduced-motion: no auto-advance, instant manual
     nav. Without JS the first cards show statically and controls stay hidden. */
  (function () {
    var root = document.getElementById('tcarousel');
    if (!root) return;
    var section = root.closest('.testimonials') || root.parentNode;
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
      dot.setAttribute('aria-label', 'Show review ' + (d + 1));
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
        toggle.textContent = held ? 'Play reviews' : 'Pause reviews';
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
  

  /* Header hide-on-scroll: slide the header up when scrolling DOWN, bring it
     back on any upward scroll, and always show it near the very top. A small
     threshold debounces jitter so tiny scroll wobbles never flicker it, and
     reads are batched into requestAnimationFrame. Reduced-motion: no-op, so
     the header stays sticky and always visible. */
  (function () {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    var TOP_ZONE = 12;    // px from top where the header is always shown
    var THRESHOLD = 6;    // ignore movements smaller than this (jitter debounce)
    var lastY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (y <= TOP_ZONE) {                       // at/near the top: always visible
        header.classList.remove('header-hidden');
        lastY = y;
        return;
      }
      var dy = y - lastY;
      if (Math.abs(dy) < THRESHOLD) return;      // too small to act on; keep lastY
      if (dy > 0) header.classList.add('header-hidden');     // scrolling down: hide
      else header.classList.remove('header-hidden');         // scrolling up: show
      lastY = y;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
  })();
  