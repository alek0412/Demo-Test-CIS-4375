/**
 * General + Client nav auth (public-facing nav link .nav-auth-link):
 * - Default: "Log in" → /client/Client_Login.html
 * - Customer session only: "Log out" → POST /api/customer-logout → General_Dashboard
 * - Admin session (/api/me) does NOT change this link — admins use Admin Log out separately.
 * - ?logged_in=1: just signed in as customer (nav shows Log out before cookie is readable)
 * - sessionStorage hbc_customer_logged_in: set on customer sign-in; cleared on logout or API says logged out
 */
(function () {
  var link = document.querySelector('.nav-auth-link');
  if (!link) return;

  var GENERAL = '/client/General_Dashboard.html';
  var LOGIN_TAB_ADMIN_KEY = 'hbc_login_tab';
  var CUSTOMER_FLAG = 'hbc_customer_logged_in';

  function setCustomerFlag() {
    try {
      sessionStorage.setItem(CUSTOMER_FLAG, '1');
    } catch (e) {}
  }

  function clearCustomerFlag() {
    try {
      sessionStorage.removeItem(CUSTOMER_FLAG);
    } catch (e) {}
  }

  function hasCustomerFlag() {
    try {
      return sessionStorage.getItem(CUSTOMER_FLAG) === '1';
    } catch (e) {
      return false;
    }
  }

  function safeJson(url) {
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) {
          return { loggedIn: false, _unreliable: true };
        }
        return r.json().then(
          function (data) {
            return data;
          },
          function () {
            return { loggedIn: false, _unreliable: true };
          }
        );
      })
      .catch(function () {
        return { loggedIn: false, _unreliable: true };
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
    setCustomerFlag();
    showLogOut(function () {
      try {
        sessionStorage.setItem(LOGIN_TAB_ADMIN_KEY, 'admin');
      } catch (e) {}
      clearCustomerFlag();
      fetch('/api/customer-logout', { method: 'POST', credentials: 'same-origin' }).then(function () {
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
    var customerRes = results[1] || {};
    var customerLoggedIn = customerRes.loggedIn === true;
    var customerExplicitOut = customerRes.loggedIn === false && !customerRes._unreliable;

    if (customerLoggedIn) {
      setCustomerFlag();
    } else if (customerExplicitOut) {
      clearCustomerFlag();
    } else if (customerRes._unreliable && hasCustomerFlag()) {
      customerLoggedIn = true;
    }

    // Only customer login controls "Log out" here. An admin cookie alone must not show Log out
    // (e.g. user has Admin Layout open in another tab but never signed in as a customer).
    if (!customerLoggedIn) {
      return;
    }

    showLogOut(function () {
      clearCustomerFlag();
      if (!adminIn) {
        try {
          sessionStorage.setItem(LOGIN_TAB_ADMIN_KEY, 'admin');
        } catch (e) {}
      }
      fetch('/api/customer-logout', { method: 'POST', credentials: 'same-origin' }).then(function () {
        window.location.href = GENERAL;
      });
    });
  });
})();
