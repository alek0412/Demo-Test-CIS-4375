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

(function () {
  "use strict";

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function ensureBackToTopButton() {
    var existing = document.getElementById("gh-back-top");
    if (existing) return existing;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "gh-back-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.setAttribute("aria-hidden", "true");
    btn.setAttribute("tabindex", "-1");
    btn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>' +
      "</svg>";
    document.body.appendChild(btn);
    return btn;
  }

  function initBackToTop() {
    var path = (window.location && window.location.pathname ? window.location.pathname : "").toLowerCase();
    if (/\/client\/(general_contact|client_contact)\.html$/.test(path) || /(general_contact|client_contact)\.html$/.test(path)) {
      return;
    }
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var back = ensureBackToTopButton();
    if (!back) return;

    var toggleBack = function () {
      var el = document.documentElement;
      var scrollTop = window.scrollY || 0;
      var vh = window.innerHeight;
      var sh = Math.max(el.scrollHeight, document.body ? document.body.scrollHeight : 0);
      var atBottom = scrollTop + vh >= sh - 2;
      if (atBottom) {
        back.classList.add("gh-back-top--visible");
        back.setAttribute("aria-hidden", "false");
        back.removeAttribute("tabindex");
      } else {
        back.classList.remove("gh-back-top--visible");
        back.setAttribute("aria-hidden", "true");
        back.setAttribute("tabindex", "-1");
      }
    };

    toggleBack();
    window.addEventListener("scroll", toggleBack, { passive: true });
    window.addEventListener("resize", toggleBack, { passive: true });

    back.addEventListener("click", function () {
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBackToTop);
  } else {
    initBackToTop();
  }
})();
