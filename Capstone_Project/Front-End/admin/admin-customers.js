/**
 * Admin Customers page: load Customer table from /api/db and attach search filter.
 * Runs in the browser (front-end).
 */
(function () {
  'use strict';

  // Auth check
  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.loggedIn !== true) {
        window.location.replace('/client/Client_Login.html');
      }
    })
    .catch(function () {});

  fetch('/api/db', { credentials: 'same-origin' })
    .then(function (r) {
      if (r.status === 401) {
        window.location.replace('/client/Client_Login.html');
        return null;
      }
      return r.json();
    })
    .then(function (data) {
      if (data === null) return;

      var el = document.getElementById('db-content');
      var searchWrap = document.getElementById('customer-search-wrap');

      if (data.error) {
        el.className = 'db-error';
        el.innerHTML =
          'Cannot connect to the database. ' + data.error +
          (data.database ? ' (Database: ' + data.database + ')' : '') +
          '<p style="margin-top: 0.75rem;">In AWS, only the EC2 instance can reach RDS. Run the app on EC2 and open Admin from there to see reservations data.</p>';
        return;
      }

      el.className = '';
      var tables = data.tables || {};
      var rows = tables.customer || tables.Customer;
      var html = '';

      if (!rows) {
        html = '<p class="db-meta">No customer table in this database.</p>';
      } else if (rows.length === 0) {
        html = '<p class="db-meta">Customer table is empty.</p>';
      } else {
        var isError = rows.length === 1 && rows[0]._error;
        html = '<div class="db-table-wrap"><h3>Customer</h3>';
        if (isError) {
          html += '<p class="db-error">' + rows[0]._error + '</p>';
        } else {
          if (searchWrap) searchWrap.classList.remove('is-hidden');
          html += '<div id="customer-no-results" class="db-no-results is-hidden" aria-live="polite">No customer found with that search.</div>';
          html += '<table id="customer-table"><thead><tr>';
          var cols = Object.keys(rows[0]);
          cols.forEach(function (c) { html += '<th>' + c + '</th>'; });
          html += '</tr></thead><tbody>';
          rows.forEach(function (row) {
            html += '<tr>';
            cols.forEach(function (c) { html += '<td>' + (row[c] != null ? String(row[c]) : '') + '</td>'; });
            html += '</tr>';
          });
          html += '</tbody></table>';
        }
        html += '</div>';
      }

      el.innerHTML = html;

      var searchInput = document.getElementById('customer-search');
      var table = document.getElementById('customer-table');
      var noResultsEl = document.getElementById('customer-no-results');
      if (searchInput && table) {
        var tbody = table.querySelector('tbody');
        var tableRows = tbody ? tbody.querySelectorAll('tr') : [];
        searchInput.addEventListener('input', function () {
          var q = (this.value || '').trim().toLowerCase();
          var visibleCount = 0;
          tableRows.forEach(function (tr) {
            var text = tr.textContent || '';
            var show = q === '' || text.toLowerCase().indexOf(q) !== -1;
            tr.style.display = show ? '' : 'none';
            if (show) visibleCount++;
          });
          if (noResultsEl) {
            if (q !== '' && visibleCount === 0) {
              noResultsEl.classList.remove('is-hidden');
            } else {
              noResultsEl.classList.add('is-hidden');
            }
          }
        });
      }
    })
    .catch(function () {
      document.getElementById('db-content').className = 'db-error';
      document.getElementById('db-content').innerHTML =
        'Failed to load data. Open this site at the same URL where your Node server is running (e.g. <strong>http://localhost:3008</strong> if the terminal shows port 3008), log in from that page, then open Customers again.';
    });
})();
