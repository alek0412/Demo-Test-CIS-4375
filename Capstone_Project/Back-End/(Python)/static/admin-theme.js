(function () {
  var STORAGE_KEY = 'admin-theme';
  var DEFAULT_THEME = 'dark';

  function getTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'light' || saved === 'dark' ? saved : DEFAULT_THEME;
    } catch (e) {
      return DEFAULT_THEME;
    }
  }

  function setTheme(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (e) {}
    document.body.setAttribute('data-theme', value);
  }

  function applyThemeOnLoad() {
    setTheme(getTheme());
  }

  function renderDropdown(container) {
    container.innerHTML =
      '<div class="theme-dropdown">' +
        '<button type="button" class="theme-dropdown-btn" id="admin-theme-btn" aria-expanded="false" aria-haspopup="listbox" aria-label="Theme">' +
          'Theme' +
          '<svg class="theme-dropdown-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>' +
          '</svg>' +
        '</button>' +
        '<ul class="theme-dropdown-list" id="admin-theme-list" role="listbox" aria-label="Theme" hidden>' +
          '<li class="theme-dropdown-option" role="option" data-theme="light" tabindex="-1">Light</li>' +
          '<li class="theme-dropdown-option" role="option" data-theme="dark" tabindex="-1">Dark</li>' +
        '</ul>' +
      '</div>';
  }

  function bindDropdown(container) {
    var btn = document.getElementById('admin-theme-btn');
    var list = document.getElementById('admin-theme-list');
    if (!btn || !list) return;

    function close() {
      btn.setAttribute('aria-expanded', 'false');
      list.hidden = true;
    }

    function open() {
      btn.setAttribute('aria-expanded', 'true');
      list.hidden = false;
    }

    function choose(theme) {
      setTheme(theme);
      close();
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (list.hidden) open(); else close();
    });

    list.querySelectorAll('.theme-dropdown-option').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        choose(opt.getAttribute('data-theme'));
      });
    });

    document.addEventListener('click', function () { close(); });
  }

  function init() {
    applyThemeOnLoad();
    var container = document.getElementById('admin-theme-container');
    if (container) {
      var topbarRight = document.createElement('div');
      topbarRight.className = 'admin-topbar-right';
      var logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.className = 'admin-logout-btn';
      logoutBtn.textContent = 'Log Out';
      logoutBtn.addEventListener('click', function () {
        fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
          .then(function () { window.location.href = '/client/General_Dashboard.html'; })
          .catch(function () { window.location.href = '/client/General_Dashboard.html'; });
      });
      container.parentNode.insertBefore(topbarRight, container);
      topbarRight.appendChild(container);
      topbarRight.appendChild(logoutBtn);
      renderDropdown(container);
      bindDropdown(container);
    }
    if (!document.querySelector('.reservations-page')) {
      initBackToTop();
    }
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function ensureBackToTopButton() {
    var existing = document.getElementById('gh-back-top');
    if (existing) return existing;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'gh-back-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.setAttribute('aria-hidden', 'true');
    btn.setAttribute('tabindex', '-1');
    btn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>' +
      '</svg>';
    document.body.appendChild(btn);
    return btn;
  }

  function initBackToTop() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var back = ensureBackToTopButton();
    if (!back) return;

    function toggleBack() {
      var el = document.documentElement;
      var scrollTop = window.scrollY || 0;
      var vh = window.innerHeight;
      var sh = Math.max(el.scrollHeight, document.body ? document.body.scrollHeight : 0);
      var atBottom = scrollTop + vh >= sh - 2;
      if (atBottom) {
        back.classList.add('gh-back-top--visible');
        back.setAttribute('aria-hidden', 'false');
        back.removeAttribute('tabindex');
      } else {
        back.classList.remove('gh-back-top--visible');
        back.setAttribute('aria-hidden', 'true');
        back.setAttribute('tabindex', '-1');
      }
    }

    toggleBack();
    window.addEventListener('scroll', toggleBack, { passive: true });
    window.addEventListener('resize', toggleBack, { passive: true });

    back.addEventListener('click', function () {
      var start = window.scrollY || 0;
      if (reduce || start <= 0) {
        window.scrollTo(0, 0);
        return;
      }
      var duration = Math.min(3800, Math.max(900, start * 0.95));
      var t0 = performance.now();
      function step(now) {
        var p = Math.min((now - t0) / duration, 1);
        var y = start * (1 - easeInOutQuad(p));
        window.scrollTo(0, y);
        if (p < 1) window.requestAnimationFrame(step);
      }
      window.requestAnimationFrame(step);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
