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
      var clientViewLink = document.createElement('a');
      clientViewLink.href = '../client/Client_Dashboard.html';
      clientViewLink.className = 'admin-client-view-btn';
      clientViewLink.textContent = 'Client View';
      var logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.className = 'admin-logout-btn';
      logoutBtn.textContent = 'Log Out';
      logoutBtn.addEventListener('click', function () {
        fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
          .then(function () { window.location.href = '../client/Client_Dashboard.html'; })
          .catch(function () { window.location.href = '../client/Client_Dashboard.html'; });
      });
      container.parentNode.insertBefore(topbarRight, container);
      topbarRight.appendChild(container);
      topbarRight.appendChild(clientViewLink);
      topbarRight.appendChild(logoutBtn);
      renderDropdown(container);
      bindDropdown(container);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
