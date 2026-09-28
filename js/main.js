/* Hyuntak Lee — personal site */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- theme ---------- */

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t;
    return mq && mq.matches ? 'dark' : 'light';
  }

  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  }
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () {
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  }

  /* ---------- bibtex ---------- */

  Array.prototype.forEach.call(document.querySelectorAll('.bib-toggle'), function (btn) {
    var target = document.getElementById(btn.getAttribute('aria-controls'));
    if (!target) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      target.hidden = open;
    });
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (btn) {
    var pre = btn.parentNode.querySelector('pre');
    if (!pre) return;
    var timer = null;
    function done(label) {
      btn.textContent = label;
      btn.setAttribute('data-done', '');
      clearTimeout(timer);
      timer = setTimeout(function () {
        btn.textContent = 'Copy';
        btn.removeAttribute('data-done');
      }, 1600);
    }
    btn.addEventListener('click', function () {
      var text = pre.textContent;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () { done('Copied'); }, function () { fallback(); });
      } else {
        fallback();
      }
      function fallback() {
        var ok = false;
        try {
          var range = document.createRange();
          range.selectNodeContents(pre);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          ok = document.execCommand('copy');
          sel.removeAllRanges();
        } catch (e) {}
        done(ok ? 'Copied' : 'Select and copy');
      }
    });
  });

  /* ---------- "which way did it move?" ---------- */

  var demo = document.querySelector('[data-demo]');
  if (!demo) return;

  var canvas = demo.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var playBtn = demo.querySelector('.demo-play');
  var prompt = demo.querySelector('.demo-prompt');
  var choices = Array.prototype.slice.call(demo.querySelectorAll('.demo-choices button'));
  var score = demo.querySelector('.demo-score');

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var DIRS = {
    left:  { dx: -1, dy: 0,  word: 'left' },
    right: { dx: 1,  dy: 0,  word: 'right' },
    up:    { dx: 0,  dy: -1, word: 'up' },
    down:  { dx: 0,  dy: 1,  word: 'down' }
  };
  var W = 480, H = 300;           // logical canvas size
  var R = 15;                     // dot radius
  var DIST = 118;                 // travel distance
  var DURATION = 1150;            // ms
  var HOLD = 180;                 // ms of stillness at the start

  var state = { phase: 'idle', dir: null, played: 0, correct: 0, raf: null, last: null };

  playBtn.innerHTML = '<span>Play clip</span>';

  function css(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function fitCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(w / W, 0, 0, h / H, 0, 0);
  }

  function clear() {
    ctx.clearRect(0, 0, W, H);
  }

  function dot(x, y, alpha, radius) {
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = css('--dot') || '#c9782e';
    ctx.beginPath();
    ctx.arc(x, y, radius || R, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function ease(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function pick() {
    var keys = Object.keys(DIRS).filter(function (k) { return k !== state.last; });
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function drawStill() {
    fitCanvas();
    clear();
    dot(W / 2, H / 2, 1);
  }

  function drawFrame(t) {
    var d = DIRS[state.dir];
    var p = ease(t) * DIST;
    fitCanvas();
    clear();
    dot(W / 2 + d.dx * p, H / 2 + d.dy * p, 1);
  }

  function drawTrail() {
    var d = DIRS[state.dir];
    fitCanvas();
    clear();
    var steps = 5;
    for (var i = 0; i <= steps; i++) {
      var f = i / steps;
      var x = W / 2 + d.dx * (DIST * (2 * f - 1));
      var y = H / 2 + d.dy * (DIST * (2 * f - 1));
      dot(x, y, 0.12 + 0.88 * f, i === steps ? R : R * (0.55 + 0.35 * f));
    }
  }

  function setChoices(enabled) {
    choices.forEach(function (b) {
      b.disabled = !enabled;
      b.removeAttribute('data-state');
    });
  }

  function play() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.dir = pick();
    state.last = state.dir;
    playBtn.hidden = true;
    setChoices(false);
    score.textContent = '';

    if (reduceMotion) {
      // No animation: show the path as a trail instead. Direction is read from
      // faint (earlier) to solid (later).
      state.phase = 'answer';
      drawTrail();
      prompt.innerHTML = 'The trail goes from faint to solid. <strong>Which way did it move?</strong>';
      setChoices(true);
      return;
    }

    state.phase = 'playing';
    prompt.textContent = 'Watch closely.';
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var el = ts - start;
      if (el < HOLD) {
        drawFrame(0);
      } else if (el < HOLD + DURATION) {
        drawFrame((el - HOLD) / DURATION);
      } else if (el < HOLD + DURATION + 220) {
        drawFrame(1);
      } else {
        // Clip is over; blank the frame so the last position does not give it away.
        fitCanvas();
        clear();
        state.phase = 'answer';
        prompt.innerHTML = '<strong>Which way did it move?</strong>';
        setChoices(true);
        choices[0].focus({ preventScroll: true });
        state.raf = null;
        return;
      }
      state.raf = requestAnimationFrame(step);
    }
    state.raf = requestAnimationFrame(step);
  }

  function answer(dir) {
    if (state.phase !== 'answer') return;
    state.phase = 'done';
    state.played += 1;
    var right = dir === state.dir;
    if (right) state.correct += 1;

    choices.forEach(function (b) {
      b.disabled = true;
      var d = b.getAttribute('data-dir');
      if (d === state.dir) b.setAttribute('data-state', 'correct');
      else if (d === dir) b.setAttribute('data-state', 'chosen');
    });

    drawTrail();
    var word = DIRS[state.dir].word;
    prompt.innerHTML = right
      ? 'Yes. It moved <strong>' + word + '</strong>.'
      : 'It moved <strong>' + word + '</strong>.';

    score.innerHTML = state.correct + ' of ' + state.played + ' so far. <button type="button" data-again>Play again</button>';
    var again = score.querySelector('[data-again]');
    again.addEventListener('click', play);
    again.focus({ preventScroll: true });
  }

  choices.forEach(function (b) {
    b.addEventListener('click', function () { answer(b.getAttribute('data-dir')); });
  });
  playBtn.addEventListener('click', play);

  // Redraw the static frame when the theme or size changes.
  function redraw() {
    if (state.phase === 'idle') drawStill();
    else if (state.phase === 'done' || (state.phase === 'answer' && reduceMotion)) drawTrail();
    else if (state.phase === 'answer') { fitCanvas(); clear(); }
  }
  document.addEventListener('themechange', redraw);
  window.addEventListener('resize', redraw);

  drawStill();
})();
