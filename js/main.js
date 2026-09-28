/* hyuntak03.github.io */
(function () {
  'use strict';

  // abstract / bibtex folds
  Array.prototype.forEach.call(document.querySelectorAll('.fold-toggle'), function (btn) {
    var target = document.getElementById(btn.getAttribute('aria-controls'));
    if (!target) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      target.hidden = open;
    });
  });

  // copy bibtex
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
    function fallback() {
      var ok = false;
      try {
        var range = document.createRange();
        range.selectNodeContents(pre);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        ok = document.execCommand('copy');
        if (ok) sel.removeAllRanges(); // on failure, leave it selected so Ctrl/Cmd+C works
      } catch (e) {}
      done(ok ? 'Copied' : 'Select and copy');
    }
    btn.addEventListener('click', function () {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(pre.textContent).then(function () { done('Copied'); }, fallback);
      } else {
        fallback();
      }
    });
  });
})();
