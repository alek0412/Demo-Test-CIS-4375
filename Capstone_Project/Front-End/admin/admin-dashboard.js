/**
 * Admin Dashboard page: auth check.
 * Runs in the browser (front-end).
 */
(function () {
  'use strict';
  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.loggedIn !== true) {
        window.location.replace('/client/Client_Login.html');
      }
    })
    .catch(function () { /* ignore: e.g. opening file directly */ });
})();
