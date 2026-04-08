/**
 * Membership pricing sheet: click thumbnail to zoom; X, Escape, or backdrop to close.
 */
(function () {
  'use strict';

  var thumb = document.getElementById('pricing-sheet-thumb');
  if (!thumb) return;

  var lb = document.createElement('div');
  lb.className = 'pricing-lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Enlarged pricing sheet');

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'pricing-lightbox-close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';

  var panel = document.createElement('div');
  panel.className = 'pricing-lightbox-panel';

  var bigImg = document.createElement('img');
  bigImg.className = 'pricing-lightbox-img';
  bigImg.alt = '';

  panel.appendChild(bigImg);
  lb.appendChild(closeBtn);
  lb.appendChild(panel);
  document.body.appendChild(lb);

  function open() {
    bigImg.src = thumb.currentSrc || thumb.src;
    bigImg.alt = thumb.getAttribute('alt') || '';
    lb.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function close() {
    lb.classList.remove('is-open');
    document.body.style.overflow = '';
    thumb.focus();
  }

  thumb.style.cursor = 'zoom-in';
  thumb.setAttribute('tabindex', '0');
  thumb.addEventListener('click', function (e) {
    e.preventDefault();
    open();
  });
  thumb.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });

  closeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    close();
  });

  lb.addEventListener('click', function (e) {
    if (closeBtn.contains(e.target)) return;
    if (e.target === bigImg) return;
    close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lb.classList.contains('is-open')) {
      close();
    }
  });
})();
