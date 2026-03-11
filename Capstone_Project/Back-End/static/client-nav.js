/**
 * Client/General nav: if customer is logged in, show "Log out" instead of "Log in".
 * Clicking "Log out" POSTs to /api/customer-logout and redirects to the general page.
 * Uses /api/customer-me; also treats ?logged_in=1 as just-logged-in so the nav updates
 * even if the cookie isn't available on the first load (e.g. Safari, port mismatch).
 */
(function () {
  var link = document.querySelector('.nav-auth-link');
  if (!link) return;

  function showLogOut() {
    link.textContent = 'Log out';
    link.href = '#';
    link.setAttribute('aria-label', 'Log out and return to general page');
    link.addEventListener('click', function (e) {
      e.preventDefault();
      fetch('/api/customer-logout', {
        method: 'POST',
        credentials: 'same-origin'
      }).then(function () {
        window.location.href = '/client/General_Dashboard.html';
      });
    });
  }

  // If we were just redirected here after login, show Log out and clean the URL
  var params = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  if (params && params.get('logged_in') === '1') {
    showLogOut();
    if (window.history && window.history.replaceState) {
      var clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
    return;
  }

  fetch('/api/customer-me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.loggedIn) {
        showLogOut();
      }
    })
    .catch(function () {});
})();
