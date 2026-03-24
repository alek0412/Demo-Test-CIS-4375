/**
 * General + Client nav auth:
 * - Default: "Log in" → /client/Client_Login.html
 * - Customer session: "Log out" → POST /api/customer-logout → General_Dashboard
 * - Admin session: "Log out" → POST /api/logout → General_Dashboard
 * - Both sessions: one "Log out" clears both, then General_Dashboard
 * - ?logged_in=1: just signed in as customer (nav shows Log out before cookie is readable)
 */
(function () {
  var link = document.querySelector('.nav-auth-link');
  if (!link) return;

  var GENERAL = '/client/General_Dashboard.html';
  var LOGIN_TAB_ADMIN_KEY = 'hbc_login_tab';

  function safeJson(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .catch(function () {
        return { loggedIn: false };
      });
  }

  function showLogOut(onClick) {
    link.textContent = 'Log out';
    link.href = '#';
    link.setAttribute('aria-label', 'Log out and return to the public home page');
    link.addEventListener('click', function (e) {
      e.preventDefault();
      onClick();
    });
  }

  var params = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  if (params && params.get('logged_in') === '1') {
    showLogOut(function () {
      try {
        sessionStorage.setItem(LOGIN_TAB_ADMIN_KEY, 'admin');
      } catch (e) {}
      fetch('/api/customer-logout', { method: 'POST', credentials: 'same-origin' })
        .then(function () {
          window.location.href = GENERAL;
        });
    });
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    return;
  }

  Promise.all([safeJson('/api/me'), safeJson('/api/customer-me')]).then(function (results) {
    var adminIn = results[0] && results[0].loggedIn === true;
    var customerIn = results[1] && results[1].loggedIn === true;

    if (!adminIn && !customerIn) {
      return;
    }

    showLogOut(function () {
      if (customerIn && !adminIn) {
        try {
          sessionStorage.setItem(LOGIN_TAB_ADMIN_KEY, 'admin');
        } catch (e) {}
      }
      var reqs = [];
      if (adminIn) {
        reqs.push(fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }));
      }
      if (customerIn) {
        reqs.push(fetch('/api/customer-logout', { method: 'POST', credentials: 'same-origin' }));
      }
      Promise.all(reqs).then(function () {
        window.location.href = GENERAL;
      });
    });
  });
})();
