/**
 * Embeds the admin-style court schedule on Availability pages (below Popular times).
 * - data-availability-embed="guest" (General): clicks prompt waiver message.
 * - data-availability-embed="client" (Client): logged-in customers can POST /api/reservation (Flask reservation.py).
 */
(function () {
  'use strict';

  var mode = document.body.getAttribute('data-availability-embed') || 'guest';
  var root = document.getElementById('availability-court-schedule-root');
  if (!root) return;

  var WAIVER_MSG =
    'You must sign the waiver to make an account to reserve!';
  var scheduleDate = new Date();
  scheduleDate.setHours(12, 0, 0, 0);

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatScheduleDateIso(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function isSameCalendarDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  /** Same grid markup as Admin_Reservations.html (schedule strip only). */
  var SCHEDULE_INNER =
    '<div class="reservations-shell">' +
    '<div class="res-date-toolbar" id="pub-res-date-toolbar" role="region" aria-label="Schedule date">' +
    '<div class="res-date-nav">' +
    '<button type="button" class="res-date-arrow" id="pub-res-date-prev" aria-label="Previous day">‹</button>' +
    '<div class="res-date-label-block">' +
    '<span class="res-date-weekday" id="pub-res-date-weekday"></span>' +
    '<time class="res-date-full" id="pub-res-date-full" datetime=""></time>' +
    '</div>' +
    '<button type="button" class="res-date-arrow" id="pub-res-date-next" aria-label="Next day">›</button>' +
    '</div>' +
    '</div>' +
    '<div class="reservations-schedule-outer" id="pub-res-schedule-outer">' +
    '<div class="reservations-schedule-wrap">' +
    '<div class="res-schedule-corner" aria-hidden="true"></div>' +
    '<div class="res-schedule-headers" id="pub-res-schedule-headers">' +
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      .map(function (n) {
        var label = 'Court ' + n;
        var extra = n === 11 ? ' cal-col-head--stack' : '';
        var inner =
          n === 11
            ? '<span class="cal-col-head-label cal-col-head-label--stack"><span class="cal-col-head-line">Court 11</span><span class="cal-col-head-sub">Badminton / table tennis</span></span>'
            : '<span class="cal-col-head-label">' + label + '</span>';
        return (
          '<div class="cal-col-head' +
          extra +
          '">' +
          inner +
          '<button type="button" class="cal-col-add-btn pub-cal-col-add" data-court="' +
          label +
          '" title="Reserve" aria-label="Reserve on ' +
          label +
          '"><span aria-hidden="true">+</span></button></div>'
        );
      })
      .join('') +
    '</div>' +
    '<aside class="reservations-time-scale" id="pub-reservations-time-scale" aria-label="Time scale"></aside>' +
    '<section class="reservations-calendar" id="pub-reservations-calendar" aria-label="Court availability">' +
    '<div class="cal-col" data-court="Court 1"><div class="cal-col-body">' +
    '<div class="cal-block is-white" data-slot-start="24" data-slot-span="3">Queuing<br>10:00 PM-11:30 PM</div>' +
    '<div class="cal-block is-blue" data-slot-start="10" data-slot-span="7">3.50 hr</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 2"><div class="cal-col-body">' +
    '<div class="cal-block is-event" data-slot-start="0" data-slot-span="14">Pickleball<br>10:00 AM-5:00 PM</div>' +
    '<div class="cal-block is-event" data-slot-start="14" data-slot-span="2">Training</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 3"><div class="cal-col-body">' +
    '<div class="cal-block is-white" data-slot-start="0" data-slot-span="14">Queuing<br>10:00 AM-5:00 PM</div>' +
    '<div class="cal-block is-blue" data-slot-start="14" data-slot-span="3">1.50 hr</div>' +
    '<div class="cal-block is-blue" data-slot-start="17" data-slot-span="1">0.5 hr</div>' +
    '<div class="cal-block is-blue" data-slot-start="18" data-slot-span="2">1.00 hr</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 4"><div class="cal-col-body">' +
    '<div class="cal-block is-event" data-slot-start="0" data-slot-span="14">Pickleball<br>10:00 AM-5:00 PM</div>' +
    '<div class="cal-block is-event" data-slot-start="14" data-slot-span="2">Training</div>' +
    '<div class="cal-block is-blue" data-slot-start="16" data-slot-span="2">1.00 hr</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 5"><div class="cal-col-body">' +
    '<div class="cal-block is-white" data-slot-start="0" data-slot-span="14">Badminton open play<br>10:00 AM-5:00 PM</div>' +
    '<div class="cal-block is-blue" data-slot-start="14" data-slot-span="3">1.50 hr</div>' +
    '<div class="cal-block is-blue" data-slot-start="17" data-slot-span="7">3.50 hr</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 6"><div class="cal-col-body">' +
    '<div class="cal-block is-event" data-slot-start="2" data-slot-span="8">Open Play<br>11:00 AM-3:00 PM</div>' +
    '<div class="cal-block is-blue" data-slot-start="10" data-slot-span="2">1.00 hr</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 7"><div class="cal-col-body">' +
    '<div class="cal-block is-white" data-slot-start="1" data-slot-span="15">Queuing<br>10:30 AM-6:00 PM</div>' +
    '<div class="cal-block is-orange" data-slot-start="16" data-slot-span="2">Training</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 8"><div class="cal-col-body">' +
    '<div class="cal-block is-event" data-slot-start="0" data-slot-span="13">Pickleball<br>10:00 AM-4:30 PM</div>' +
    '<div class="cal-block is-blue" data-slot-start="13" data-slot-span="4">2.00 hr</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 9"><div class="cal-col-body">' +
    '<div class="cal-block is-white" data-slot-start="4" data-slot-span="16">Court Rental<br>12:00 PM-8:00 PM</div>' +
    '<div class="cal-block is-blue" data-slot-start="20" data-slot-span="1">0.5 hr</div>' +
    '<div class="cal-block is-blue" data-slot-start="21" data-slot-span="3">1.50 hr</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 10"><div class="cal-col-body">' +
    '<div class="cal-block is-event" data-slot-start="0" data-slot-span="14">Queuing<br>10:00 AM-5:00 PM</div>' +
    '<div class="cal-block is-blue" data-slot-start="14" data-slot-span="2">1.00 hr</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 11" data-court-use="table-tennis-practice"><div class="cal-col-body">' +
    '<div class="cal-block is-table-tennis" data-slot-start="0" data-slot-span="14">Table tennis lessons<br>10:00 AM-5:00 PM</div>' +
    '<div class="cal-block is-white" data-slot-start="14" data-slot-span="4">Badminton<br>5:00 PM-7:00 PM</div>' +
    '</div></div>' +
    '<div class="cal-col" data-court="Court 12"><div class="cal-col-body">' +
    '<div class="cal-block is-white" data-slot-start="0" data-slot-span="16">Open Play<br>10:00 AM-6:00 PM</div>' +
    '<div class="cal-block is-blue" data-slot-start="16" data-slot-span="6">3.00 hr</div>' +
    '</div></div>' +
    '</section>' +
    '</div>' +
    '</div>' +
    '</div>';

  function decorateBlockNoActions(block) {
    if (!block || block.dataset.decorated === '1') return;
    var lines = block.innerHTML
      .split('<br>')
      .map(function (line) {
        return line.replace(/<[^>]+>/g, '').trim();
      })
      .filter(Boolean);
    if (!lines.length) return;
    var first = lines[0];
    var rest = lines.slice(1).join(' ');
    block.innerHTML = '';
    var titleEl = document.createElement('div');
    titleEl.className = 'cal-block-title';
    titleEl.textContent = first;
    block.appendChild(titleEl);
    if (rest) {
      var metaEl = document.createElement('div');
      metaEl.className = 'cal-block-meta';
      metaEl.textContent = rest;
      block.appendChild(metaEl);
    }
    block.dataset.decorated = '1';
  }

  function applyBlockSlotLayout(block) {
    if (!block) return;
    var start = parseInt(block.dataset.slotStart, 10);
    var span = parseInt(block.dataset.slotSpan, 10);
    var s = Number.isFinite(start) ? start : 0;
    var n = Number.isFinite(span) ? span : 2;
    block.style.setProperty('--slot-start', String(s));
    block.style.setProperty('--slot-span', String(Math.max(1, n)));
  }

  function buildTimeScale(el) {
    if (!el || el.dataset.built === '1') return;
    for (var minutes = 10 * 60; minutes <= 23 * 60 + 30; minutes += 30) {
      var h24 = Math.floor(minutes / 60);
      var m = minutes % 60;
      var suffix = h24 >= 12 ? 'PM' : 'AM';
      var h12 = ((h24 + 11) % 12) + 1;
      var label = h12 + ':' + String(m).padStart(2, '0') + ' ' + suffix;
      var row = document.createElement('div');
      row.className = 'time-slot';
      row.textContent = label;
      el.appendChild(row);
    }
    el.dataset.built = '1';
  }

  function updateDateDisplay() {
    var wk = document.getElementById('pub-res-date-weekday');
    var full = document.getElementById('pub-res-date-full');
    var toolbar = document.getElementById('pub-res-date-toolbar');
    var outer = document.getElementById('pub-res-schedule-outer');
    if (!wk || !full) return;
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    var today = new Date();
    today.setHours(12, 0, 0, 0);
    var isToday = isSameCalendarDay(scheduleDate, today);
    wk.textContent = days[scheduleDate.getDay()] + (isToday ? ' · Today' : '');
    full.textContent =
      months[scheduleDate.getMonth()] + ' ' + scheduleDate.getDate() + ', ' + scheduleDate.getFullYear();
    full.setAttribute('datetime', formatScheduleDateIso(scheduleDate));
    if (toolbar) {
      toolbar.classList.toggle('res-date-toolbar--other-day', !isToday);
      toolbar.classList.toggle('res-date-toolbar--today', isToday);
    }
    if (outer) {
      outer.setAttribute('data-selected-date', formatScheduleDateIso(scheduleDate));
      outer.classList.toggle('res-schedule-outer--other-day', !isToday);
    }
  }

  function courtNumFromName(name) {
    var m = String(name || '').match(/Court\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  }

  function fillTimeSelect(sel) {
    if (!sel) return;
    sel.innerHTML = '';
    for (var m = 10 * 60; m <= 23 * 60 + 45; m += 15) {
      var h = Math.floor(m / 60);
      var min = m % 60;
      var opt = document.createElement('option');
      opt.value = pad2(h) + ':' + pad2(min);
      opt.textContent = opt.value;
      sel.appendChild(opt);
    }
  }

  function ensureModal() {
    var existing = document.getElementById('pub-res-modal-overlay');
    if (existing) return existing;
    var wrap = document.createElement('div');
    wrap.id = 'pub-res-modal-overlay';
    wrap.className = 'pub-res-modal-overlay is-hidden';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML =
      '<div class="pub-res-modal" role="dialog" aria-modal="true" aria-labelledby="pub-res-modal-title">' +
      '<button type="button" class="pub-res-modal-close" id="pub-res-modal-close" aria-label="Close">×</button>' +
      '<h3 id="pub-res-modal-title">Request a reservation</h3>' +
      '<p class="pub-res-modal-court" id="pub-res-modal-court-line"></p>' +
      '<p class="pub-res-modal-date" id="pub-res-modal-date-line"></p>' +
      '<div class="pub-res-modal-fields">' +
      '<label class="pub-res-label">Start time <select id="pub-res-start"></select></label>' +
      '<label class="pub-res-label">End time <select id="pub-res-end"></select></label>' +
      '</div>' +
      '<p class="pub-res-modal-msg" id="pub-res-modal-msg"></p>' +
      '<div class="pub-res-modal-actions">' +
      '<button type="button" class="btn btn-primary" id="pub-res-submit">Submit request</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    var startSel = document.getElementById('pub-res-start');
    var endSel = document.getElementById('pub-res-end');
    fillTimeSelect(startSel);
    fillTimeSelect(endSel);
    if (startSel && startSel.options[16]) startSel.selectedIndex = 16;
    if (endSel && endSel.options[20]) endSel.selectedIndex = 20;
    document.getElementById('pub-res-modal-close').addEventListener('click', function () {
      wrap.classList.add('is-hidden');
      wrap.setAttribute('aria-hidden', 'true');
    });
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap) {
        wrap.classList.add('is-hidden');
        wrap.setAttribute('aria-hidden', 'true');
      }
    });
    return wrap;
  }

  var pendingCourtName = '';

  function openBookingModal(courtName) {
    pendingCourtName = String(courtName || '').trim();
    var overlay = ensureModal();
    var courtLine = document.getElementById('pub-res-modal-court-line');
    var dateLine = document.getElementById('pub-res-modal-date-line');
    var msg = document.getElementById('pub-res-modal-msg');
    if (courtLine) courtLine.textContent = pendingCourtName || 'Court';
    if (dateLine) dateLine.textContent = 'Date: ' + formatScheduleDateIso(scheduleDate);
    if (msg) {
      msg.textContent = '';
      msg.className = 'pub-res-modal-msg';
    }
    overlay.classList.remove('is-hidden');
    overlay.setAttribute('aria-hidden', 'false');
  }

  function submitReservation() {
    var msg = document.getElementById('pub-res-modal-msg');
    var startSel = document.getElementById('pub-res-start');
    var endSel = document.getElementById('pub-res-end');
    var n = courtNumFromName(pendingCourtName);
    if (n == null) {
      if (msg) {
        msg.textContent = 'Invalid court.';
        msg.className = 'pub-res-modal-msg pub-res-modal-msg--err';
      }
      return;
    }
    var body = {
      court_id: n,
      reservation_date: formatScheduleDateIso(scheduleDate),
      reservation_start_time: startSel ? startSel.value : '10:00',
      reservation_end_time: endSel ? endSel.value : '11:00',
    };
    if (msg) msg.textContent = 'Sending…';
    fetch('/api/reservation', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(function (r) {
        return r.text().then(function (t) {
          return { ok: r.ok, status: r.status, text: t };
        });
      })
      .then(function (out) {
        if (msg) {
          if (out.ok && out.status === 201) {
            msg.textContent = (out.text || '').trim() || 'Reservation submitted.';
            msg.className = 'pub-res-modal-msg pub-res-modal-msg--ok';
          } else {
            msg.textContent = (out.text || '').trim() || 'Could not create reservation.';
            msg.className = 'pub-res-modal-msg pub-res-modal-msg--err';
          }
        }
      })
      .catch(function () {
        if (msg) {
          msg.textContent = 'Network error.';
          msg.className = 'pub-res-modal-msg pub-res-modal-msg--err';
        }
      });
  }

  function attachSubmitOnce() {
    var btn = document.getElementById('pub-res-submit');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', submitReservation);
  }

  function showWaiverMessage() {
    window.alert(WAIVER_MSG);
  }

  function showLoginToReserveMessage() {
    window.alert('Please log in with your customer account to reserve a court.');
  }

  function handleScheduleClick(e, canBook) {
    var addBtn = e.target.closest && e.target.closest('.pub-cal-col-add');
    var col = e.target.closest && e.target.closest('.cal-col');
    var block = e.target.closest && e.target.closest('.cal-block');
    if (!addBtn && !col && !block) return;
    if (!canBook) {
      e.preventDefault();
      if (mode === 'guest') showWaiverMessage();
      else showLoginToReserveMessage();
      return;
    }
    var courtName = '';
    if (addBtn) courtName = addBtn.getAttribute('data-court') || '';
    else if (col) courtName = col.getAttribute('data-court') || '';
    else if (block) {
      var c = block.closest('.cal-col');
      courtName = c ? c.getAttribute('data-court') || '' : '';
    }
    if (!courtName) return;
    e.preventDefault();
    openBookingModal(courtName);
    attachSubmitOnce();
  }

  root.innerHTML =
    '<div class="public-res-embed reservations-page">' +
    '<p class="av-court-schedule-lead">Same view as admin reservations. Pick a day, then tap a court column, a time block, or <strong>+</strong> to request a booking.</p>' +
    SCHEDULE_INNER +
    '</div>';

  var calendar = document.getElementById('pub-reservations-calendar');
  var timeScale = document.getElementById('pub-reservations-time-scale');
  buildTimeScale(timeScale);
  if (calendar) {
    calendar.querySelectorAll('.cal-block').forEach(function (b) {
      decorateBlockNoActions(b);
      applyBlockSlotLayout(b);
    });
  }
  updateDateDisplay();
  var prev = document.getElementById('pub-res-date-prev');
  var next = document.getElementById('pub-res-date-next');
  if (prev)
    prev.addEventListener('click', function () {
      var d = new Date(scheduleDate.getTime());
      d.setDate(d.getDate() - 1);
      scheduleDate = d;
      updateDateDisplay();
    });
  if (next)
    next.addEventListener('click', function () {
      var d = new Date(scheduleDate.getTime());
      d.setDate(d.getDate() + 1);
      scheduleDate = d;
      updateDateDisplay();
    });

  var shell = document.querySelector('.public-res-embed .reservations-shell');
  if (shell) {
    fetch('/api/customer-me', { credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var loggedIn = data && data.loggedIn === true;
        var canBook = mode !== 'guest' && loggedIn;
        shell.addEventListener(
          'click',
          function (e) {
            handleScheduleClick(e, canBook);
          },
          true
        );
      })
      .catch(function () {
        shell.addEventListener(
          'click',
          function (e) {
            handleScheduleClick(e, mode !== 'guest' && false);
          },
          true
        );
      });
  }
})();
