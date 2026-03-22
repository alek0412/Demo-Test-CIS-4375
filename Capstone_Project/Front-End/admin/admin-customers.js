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
        var errLower = String(data.error).toLowerCase();
        var missingCreds =
          errLower.indexOf("using password: no") !== -1 ||
          errLower.indexOf("user ''@") !== -1 ||
          errLower.indexOf("user \"\"@") !== -1;
        var accessDenied = errLower.indexOf("access denied") !== -1;
        var hintBody;
        if (missingCreds) {
          hintBody =
            'The server is not sending a database user or password. On the machine running Node, create or edit <code>Capstone_Project/Back-End/.env</code> with <code>DB_USER</code> and <code>DB_PASSWORD</code> (see <code>.env.example</code>), then restart the app (e.g. <code>pm2 restart reservation-app</code>).';
        } else if (accessDenied) {
          hintBody =
            'The database host is reachable and a password was sent, but MySQL rejected the login. Confirm <code>DB_USER</code> matches the RDS master username (or a user you created with access to this database). Re-type <code>DB_PASSWORD</code> in <code>.env</code> with no quotes or spaces around the value. If you reset the RDS password in AWS, update <code>.env</code> and restart the app.';
        } else {
          hintBody =
            'If you run the app on your laptop, RDS may be unreachable from your network. Run the app on EC2 (same VPC as RDS) and ensure <code>.env</code> has the correct <code>DB_*</code> values.';
        }
        var hint = '<p style="margin-top: 0.75rem;">' + hintBody + '</p>';
        el.innerHTML =
          'Cannot connect to the database. ' + data.error +
          (data.database ? ' (Database: ' + data.database + ')' : '') +
          hint;
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
          var countWrap = document.getElementById('customer-result-count');
          if (countWrap) countWrap.classList.remove('is-hidden');
          var cols = Object.keys(rows[0]);
          var statusColName = cols.find(function (c) {
            var l = c.toLowerCase();
            return l === 'membership_status' || l === 'customerstatus' || l === 'status' || l === 'customer_status';
          });
          var colLabels = {
            customer_id: 'Customer ID',
            customer_first_name: 'First Name',
            customer_last_name: 'Last Name',
            phone: 'Phone',
            email: 'Email',
            street_address: 'Street Address',
            city: 'City',
            state: 'State',
            zip_code: 'Zip Code',
            membership_status: 'Membership Status'
          };
          function columnHeaderLabel(colName) {
            var key = colName.toLowerCase().replace(/\s+/g, '_');
            return colLabels[colName] || colLabels[key] || colName.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
          }
          html += '<table id="customer-table"><thead><tr>';
          cols.forEach(function (c) { html += '<th>' + columnHeaderLabel(c) + '</th>'; });
          html += '</tr></thead><tbody>';
          html += '<tr id="customer-no-results" class="db-no-results db-no-results-row is-hidden" aria-live="polite"><td colspan="' + cols.length + '">No customer found with that search.</td></tr>';
          rows.forEach(function (row) {
            html += '<tr>';
            cols.forEach(function (c) {
              var display = row[c];
              if (c === statusColName && (display === 1 || display === 2 || display === '1' || display === '2')) {
                display = display === 1 || display === '1' ? 'Active' : 'Inactive';
              }
              html += '<td>' + (display != null && display !== '' ? String(display) : '') + '</td>';
            });
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
      var filterBtn = document.getElementById('customer-filter-btn');
      var filterDropdown = document.getElementById('customer-filter-dropdown');

      var cols = rows && rows.length && !rows[0]._error ? Object.keys(rows[0]) : [];
      var emailCol = cols.find(function (c) { return c.toLowerCase() === 'email'; });
      var statusCol = cols.find(function (c) {
        var l = c.toLowerCase();
        return l === 'customerstatus' || l === 'status' || l === 'customer_status' || l === 'membership_status';
      });

      function membershipStatusLabel(val) {
        if (val == null || val === '') return '';
        var n = Number(val);
        if (n === 1) return 'Active';
        if (n === 2) return 'Inactive';
        return String(val);
      }
      var zipCol = cols.find(function (c) {
        var l = c.toLowerCase();
        return l === 'zipcode' || l === 'zip_code' || l === 'zip' || l === 'postalcode' || l === 'postal_code';
      });

      var filterDomain = '';
      var filterStatus = '';
      var filterZip = '';

      function getFilteredRows() {
        if (!rows || !rows.length || rows[0]._error) return [];
        return rows.filter(function (row) {
          var domainOk = !filterDomain;
          if (!domainOk && emailCol && row[emailCol]) {
            var email = String(row[emailCol]).trim();
            var domain = email.indexOf('@') !== -1 ? email.split('@')[1].toLowerCase() : '(none)';
            domainOk = domain === filterDomain;
          }
          var statusOk = !filterStatus;
          if (!statusOk && statusCol != null) {
            var s = membershipStatusLabel(row[statusCol]) || '(blank)';
            statusOk = norm(s) === norm(filterStatus);
          }
          var zipOk = !filterZip;
          if (!zipOk && zipCol != null) {
            var z = norm(row[zipCol]) || '(blank)';
            zipOk = z === norm(filterZip);
          }
          return domainOk && statusOk && zipOk;
        });
      }

      function buildFilterDropdown(rowsSubset) {
        if (!filterDropdown || !rowsSubset.length) return;
        var domainCounts = {};
        var statusCounts = {};
        var zipCounts = {};
        rowsSubset.forEach(function (row) {
          if (emailCol && row[emailCol]) {
            var email = String(row[emailCol]).trim();
            var domain = email.indexOf('@') !== -1 ? email.split('@')[1].toLowerCase() : '(none)';
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
          }
          if (statusCol && row[statusCol] != null && row[statusCol] !== '') {
            var s = membershipStatusLabel(row[statusCol]) || '(blank)';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
          }
          if (zipCol && row[zipCol] != null) {
            var zip = String(row[zipCol]).trim() || '(blank)';
            zipCounts[zip] = (zipCounts[zip] || 0) + 1;
          }
        });

        var dropdownHtml = '';
        if (Object.keys(domainCounts).length > 0) {
          dropdownHtml += '<div class="db-filter-section"><div class="db-filter-section-title">By email domain</div>';
          dropdownHtml += '<button type="button" class="db-filter-option db-filter-domain' + (filterDomain === '' ? ' is-active' : '') + '" data-value="">All</button>';
          Object.keys(domainCounts).sort().forEach(function (domain) {
            var active = filterDomain === domain ? ' is-active' : '';
            dropdownHtml += '<button type="button" class="db-filter-option db-filter-domain' + active + '" data-value="' + domain.replace(/"/g, '&quot;') + '">' + domain + ' (' + domainCounts[domain] + ')</button>';
          });
          dropdownHtml += '</div>';
        }
        if (Object.keys(statusCounts).length > 0) {
          dropdownHtml += '<div class="db-filter-section"><div class="db-filter-section-title">By status</div>';
          dropdownHtml += '<button type="button" class="db-filter-option db-filter-status' + (filterStatus === '' ? ' is-active' : '') + '" data-value="">All</button>';
          Object.keys(statusCounts).sort().forEach(function (s) {
            var active = norm(filterStatus) === norm(s) ? ' is-active' : '';
            dropdownHtml += '<button type="button" class="db-filter-option db-filter-status' + active + '" data-value="' + String(s).replace(/"/g, '&quot;') + '">' + s + ' (' + statusCounts[s] + ')</button>';
          });
          dropdownHtml += '</div>';
        }
        if (Object.keys(zipCounts).length > 0) {
          dropdownHtml += '<div class="db-filter-section"><div class="db-filter-section-title">By zip code</div>';
          dropdownHtml += '<button type="button" class="db-filter-option db-filter-zip' + (filterZip === '' ? ' is-active' : '') + '" data-value="">All</button>';
          Object.keys(zipCounts).sort().forEach(function (z) {
            var active = norm(filterZip) === norm(z) ? ' is-active' : '';
            dropdownHtml += '<button type="button" class="db-filter-option db-filter-zip' + active + '" data-value="' + String(z).replace(/"/g, '&quot;') + '">' + z + ' (' + zipCounts[z] + ')</button>';
          });
          dropdownHtml += '</div>';
        }
        if (dropdownHtml === '') dropdownHtml = '<div class="db-filter-section"><div class="db-filter-section-title">No filters available</div></div>';
        dropdownHtml += '<div class="db-filter-section db-filter-clear-wrap"><button type="button" class="db-filter-clear-btn" id="customer-filter-clear">Clear filters</button></div>';
        filterDropdown.innerHTML = dropdownHtml;
      }

      if (filterBtn && filterDropdown && rows && rows.length && !rows[0]._error) {
        buildFilterDropdown(getFilteredRows());
      }

      function getCellText(tr, colKey) {
        if (!cols.length || !colKey) return '';
        var idx = cols.indexOf(colKey);
        if (idx === -1) return '';
        var cell = tr.cells[idx];
        return cell ? (cell.textContent || '').trim() : '';
      }

      function norm(v) {
        return (v == null || v === '') ? '' : String(v).trim();
      }

      function applyFilters() {
        var q = (searchInput && searchInput.value) ? searchInput.value.trim().toLowerCase() : '';
        var visibleCount = 0;
        if (!table) return;
        var tbody = table.querySelector('tbody');
        var tableRows = tbody ? tbody.querySelectorAll('tr') : [];
        tableRows.forEach(function (tr) {
          if (tr.id === 'customer-no-results') return;
          var rowText = tr.textContent || '';
          var searchMatch = q === '' || rowText.toLowerCase().indexOf(q) !== -1;
          var emailCell = getCellText(tr, emailCol);
          var domainMatch = !filterDomain || (emailCell.indexOf('@') !== -1 && emailCell.split('@')[1].toLowerCase() === filterDomain);
          var statusCell = getCellText(tr, statusCol);
          var statusMatch = !filterStatus || norm(statusCell) === norm(filterStatus);
          var zipCell = getCellText(tr, zipCol);
          var zipMatch = !filterZip || norm(zipCell) === norm(filterZip);
          var show = searchMatch && domainMatch && statusMatch && zipMatch;
          tr.style.display = show ? '' : 'none';
          if (show) visibleCount++;
        });
        if (noResultsEl) {
          if ((q !== '' || filterDomain || filterStatus || filterZip) && visibleCount === 0) {
            noResultsEl.classList.remove('is-hidden');
          } else {
            noResultsEl.classList.add('is-hidden');
          }
        }
        var countEl = document.getElementById('customer-count-num');
        if (countEl) countEl.textContent = visibleCount;
        if (filterDropdown) {
          filterDropdown.querySelectorAll('.db-filter-domain').forEach(function (opt) {
            opt.classList.toggle('is-active', opt.getAttribute('data-value') === filterDomain);
          });
          filterDropdown.querySelectorAll('.db-filter-status').forEach(function (opt) {
            opt.classList.toggle('is-active', opt.getAttribute('data-value') === filterStatus);
          });
          filterDropdown.querySelectorAll('.db-filter-zip').forEach(function (opt) {
            opt.classList.toggle('is-active', opt.getAttribute('data-value') === filterZip);
          });
        }
      }

      if (searchInput && table) {
        searchInput.addEventListener('input', applyFilters);
      }

      if (filterBtn && filterDropdown) {
        filterBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var open = filterDropdown.classList.toggle('is-hidden');
          filterBtn.setAttribute('aria-expanded', !open);
        });
        filterDropdown.addEventListener('click', function (e) {
          e.stopPropagation();
          if (e.target && e.target.id === 'customer-filter-clear') {
            filterDomain = '';
            filterStatus = '';
            filterZip = '';
            if (searchInput) searchInput.value = '';
            buildFilterDropdown(getFilteredRows());
            applyFilters();
            /* keep dropdown open so user can keep filtering or close it themselves */
            return;
          }
          var opt = e.target && e.target.closest && e.target.closest('.db-filter-option');
          if (!opt) return;
          var value = opt.getAttribute('data-value') || '';
          if (opt.classList.contains('db-filter-domain')) {
            filterDomain = value;
          } else if (opt.classList.contains('db-filter-status')) {
            filterStatus = value;
          } else if (opt.classList.contains('db-filter-zip')) {
            filterZip = value;
          }
          buildFilterDropdown(getFilteredRows());
          applyFilters();
          /* leave dropdown open so user can pick more filters; they close it via button or click outside */
        });
        document.addEventListener('click', function () {
          filterDropdown.classList.add('is-hidden');
          filterBtn.setAttribute('aria-expanded', 'false');
        });
      }

      if (table && rows && rows.length && !rows[0]._error) {
        applyFilters();
      } else {
        var countEl = document.getElementById('customer-count-num');
        if (countEl) countEl.textContent = '0';
      }
    })
    .catch(function () {
      document.getElementById('db-content').className = 'db-error';
      document.getElementById('db-content').innerHTML =
        'Failed to load data. Open this site at the same URL where your Node server is running (e.g. <strong>http://localhost:3008</strong> if the terminal shows port 3008), log in from that page, then open Customers again.';
    });
})();
