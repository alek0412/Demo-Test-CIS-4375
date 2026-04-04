/**
 * Membership pages — teaser + specials body from API (plain text only).
 */
(function () {
  'use strict';

  function renderItems(items) {
    var inner = document.getElementById('membership-specials-inner');
    if (!inner || !items || !items.length) return;
    inner.innerHTML = '';
    items.forEach(function (item, idx) {
      var p = document.createElement('p');
      if (idx > 0) p.style.marginTop = '1rem';
      var title = document.createElement('strong');
      title.textContent = item.name || '';
      p.appendChild(title);
      var desc = item.description || '';
      if (desc.length > 0) {
        desc.split(/\r?\n/).forEach(function (line) {
          p.appendChild(document.createElement('br'));
          p.appendChild(document.createTextNode(line));
        });
      }
      inner.appendChild(p);
      if (idx < items.length - 1) {
        var hr = document.createElement('hr');
        hr.setAttribute(
          'style',
          'border: none; border-top: 1px solid rgba(255, 255, 255, 0.35); margin: 0.75rem 0;'
        );
        inner.appendChild(hr);
      }
    });
  }

  fetch('/api/membership-specials-teaser', { credentials: 'same-origin' })
    .then(function (r) {
      return r.json();
    })
    .then(function (d) {
      var teaser = document.getElementById('membership-specials-teaser-closed');
      if (teaser && d && typeof d.teaserText === 'string') {
        teaser.textContent = d.teaserText;
      }
      if (d && Array.isArray(d.items) && d.items.length) {
        renderItems(d.items);
      }
    })
    .catch(function () {});
})();
