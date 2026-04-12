(function () {
  'use strict';

  var state = {
    reservations: [],
    filter: 'all',
    pollTimer: null,
  };

  var listEl = document.getElementById('bookings-list');
  var emptyEl = document.getElementById('bookings-empty');
  var loadingEl = document.getElementById('bookings-loading');
  var liveEl = document.getElementById('bookings-last-sync');
  var filterBtns = Array.prototype.slice.call(document.querySelectorAll('[data-bookings-filter]'));

  function badgeClass(key) {
    var k = String(key || 'unknown');
    if (k === 'confirmed') return 'bookings-card__badge bookings-card__badge--confirmed';
    if (k === 'pending') return 'bookings-card__badge bookings-card__badge--pending';
    if (k === 'canceled') return 'bookings-card__badge bookings-card__badge--canceled';
    if (k === 'denied') return 'bookings-card__badge bookings-card__badge--denied';
    return 'bookings-card__badge bookings-card__badge--unknown';
  }

  function passesFilter(r, filter) {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return r.segment === 'upcoming';
    if (filter === 'past') {
      return r.segment === 'completed' || r.segment === 'stale_pending' || r.segment === 'other';
    }
    if (filter === 'canceled') {
      return r.reservationStatus === 3 || r.reservationStatus === 4;
    }
    return true;
  }

  function setLiveTime() {
    if (!liveEl) return;
    var t = new Date();
    liveEl.textContent = t.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function render() {
    if (!listEl || !emptyEl) return;
    var rows = state.reservations.filter(function (r) {
      return passesFilter(r, state.filter);
    });

    listEl.innerHTML = '';
    if (!state.reservations.length) {
      emptyEl.hidden = false;
      emptyEl.querySelector('h3').textContent = 'No reservations yet';
      emptyEl.querySelector('p').textContent =
        'When you book a court from Availability, your requests and confirmations will show up here.';
      listEl.hidden = true;
      return;
    }

    if (!rows.length) {
      emptyEl.hidden = false;
      var titles = {
        all: ['No reservations', ''],
        upcoming: ['No upcoming reservations', 'You have nothing scheduled ahead. Book a court from Availability.'],
        past: ['No past visits yet', 'Completed sessions will appear here after your court times end.'],
        canceled: ['No canceled or declined entries', 'When a booking is canceled or not approved, it will list here.'],
      };
      var pair = titles[state.filter] || titles.all;
      emptyEl.querySelector('h3').textContent = pair[0];
      emptyEl.querySelector('p').textContent = pair[1] || '';
      listEl.hidden = true;
      return;
    }

    emptyEl.hidden = true;
    listEl.hidden = false;

    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'bookings-card';
      li.setAttribute('data-status', r.statusKey || 'unknown');

      var body = document.createElement('div');
      var h = document.createElement('p');
      h.className = 'bookings-card__title';
      h.textContent = r.headline || '';

      var meta = document.createElement('p');
      meta.className = 'bookings-card__meta';
      meta.textContent = r.detailLine || '';

      body.appendChild(h);
      body.appendChild(meta);

      var badge = document.createElement('span');
      badge.className = badgeClass(r.statusKey);
      badge.textContent = r.statusLabel || '';

      li.appendChild(body);
      li.appendChild(badge);
      listEl.appendChild(li);
    });
  }

  function loadBookings() {
    return fetch('/api/customer-bookings', { credentials: 'same-origin' })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, status: r.status, body: j };
        });
      })
      .then(function (out) {
        if (out.status === 401 || (out.body && out.body.success === false && out.status === 401)) {
          window.location.href = '/client/Client_Login.html';
          return;
        }
        if (!out.body || !out.body.success || !Array.isArray(out.body.reservations)) {
          state.reservations = [];
        } else {
          state.reservations = out.body.reservations;
        }
        setLiveTime();
        if (loadingEl) loadingEl.hidden = true;
        render();
      })
      .catch(function () {
        if (loadingEl) loadingEl.hidden = true;
        state.reservations = [];
        render();
      });
  }

  function ensureSessionThenLoad() {
    fetch('/api/customer-me', { credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.loggedIn) {
          window.location.href = '/client/Client_Login.html';
          return;
        }
        return loadBookings();
      })
      .catch(function () {
        window.location.href = '/client/Client_Login.html';
      });
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.getAttribute('data-bookings-filter') || 'all';
      state.filter = f;
      filterBtns.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      render();
    });
  });

  ensureSessionThenLoad();

  state.pollTimer = setInterval(function () {
    if (document.hidden) return;
    loadBookings();
  }, 45000);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      loadBookings();
    }
  });
})();
