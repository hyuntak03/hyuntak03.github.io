/* Hyuntak Lee — personal site */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- theme ---------- */

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
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

  /* ---------- abstract / bibtex folds ---------- */

  Array.prototype.forEach.call(document.querySelectorAll('.fold-toggle'), function (btn) {
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
})();
