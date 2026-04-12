/**
 * Customer Availability: show personalized welcome when logged in (GET /api/customer-me).
 */
(function () {
  var banner = document.getElementById('client-welcome-banner');
  var greeting = document.getElementById('client-welcome-greeting');
  if (!banner || !greeting) return;

  function hide() {
    banner.hidden = true;
    banner.setAttribute('aria-hidden', 'true');
  }

  function showWithFirstName(raw) {
    var name = String(raw || '').trim();
    if (!name) {
      try {
        name = (sessionStorage.getItem('hbc_customer_first_name') || '').trim();
      } catch (e) {}
    }
    var text;
    if (!name) {
      text = 'Welcome!';
    } else {
      var safe = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      text = 'Welcome, ' + safe + '!';
      try {
        sessionStorage.setItem('hbc_customer_first_name', safe);
      } catch (e2) {}
    }
    greeting.textContent = text;
    banner.hidden = false;
    banner.setAttribute('aria-hidden', 'false');
  }

  fetch('/api/customer-me', { credentials: 'same-origin' })
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      if (!data || !data.loggedIn || !data.profile) {
        hide();
        return;
      }
      var p = data.profile;
      var fn = p.firstName ? String(p.firstName).trim() : '';
      if (!fn && p.lastName) {
        fn = String(p.lastName).trim();
      }
      showWithFirstName(fn);
    })
    .catch(function () {
      hide();
    });
})();
