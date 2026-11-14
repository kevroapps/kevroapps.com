
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
      'Color with glitter and a brush',
      'Five collections to color',
      'All 28 Arabic letters, free',
      'Picture puzzles in six worlds',
      'Jigsaw or sliding tiles'
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
  