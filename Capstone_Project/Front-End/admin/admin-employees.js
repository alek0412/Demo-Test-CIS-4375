/**
 * Admin Employees: manager gate + load Employee table from /api/db.
 */
(function () {
  'use strict';

  var HIDDEN_EMPLOYEE_COLS = { employee_password: true, employee_salt: true };

  function isHiddenEmployeeColumn(name) {
    var k = String(name || '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    return HIDDEN_EMPLOYEE_COLS[k] === true;
  }

  function visibleEmployeeColumns(keys) {
    return keys.filter(function (c) {
      return !isHiddenEmployeeColumn(c);
    });
  }

  /** DB: employee_rank 1 = manager, 2 = regular (matches Flask session checks). */
  function formatEmployeeCell(colName, raw) {
    var key = String(colName || '')
      .toLowerCase()
      .replace(/\s+/g, '_');
    if (key === 'employee_rank') {
      var n = parseInt(raw, 10);
      if (n === 1) return 'Manager';
      if (n === 2) return 'Regular Employee';
    }
    if (raw != null && raw !== '') return String(raw);
    return '';
  }

  var overlay = document.getElementById('manager-gate-overlay');
  var gateForm = document.getElementById('manager-gate-form');
  var gateError = document.getElementById('manager-gate-error');
  var gateSubmit = document.getElementById('manager-gate-submit');

  function showManagerGate(show) {
    if (!overlay) return;
    if (show) {
      overlay.removeAttribute('hidden');
      document.body.classList.add('manager-gate-active');
    } else {
      overlay.setAttribute('hidden', '');
      document.body.classList.remove('manager-gate-active');
    }
  }

  function loadEmployeeTable() {
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
        var searchWrap = document.getElementById('employee-search-wrap');

        if (data.error) {
          el.className = 'db-error';
          var errLower = String(data.error).toLowerCase();
          var missingCreds =
            errLower.indexOf('using password: no') !== -1 ||
            errLower.indexOf("user ''@") !== -1 ||
            errLower.indexOf('user ""@') !== -1;
          var accessDenied = errLower.indexOf('access denied') !== -1;
          var hintBody;
          if (missingCreds) {
            hintBody =
              'The server is not sending a database user or password. On the machine running Node, create or edit <code>Capstone_Project/Back-End/.env</code> with <code>DB_USER</code> and <code>DB_PASSWORD</code> (see <code>.env.example</code>), then restart the app (e.g. <code>pm2 restart reservation-app</code>).';
          } else if (accessDenied) {
            hintBody =
              'The database host is reachable and a password was sent, but MySQL rejected the login. Confirm <code>DB_USER</code> and <code>DB_PASSWORD</code> in <code>.env</code> and restart the app.';
          } else {
            hintBody =
              'If you run the app on your laptop, RDS may be unreachable. Run the app on EC2 and ensure <code>.env</code> has the correct <code>DB_*</code> values.';
          }
          el.innerHTML =
            'Cannot connect to the database. ' +
            data.error +
            (data.database ? ' (Database: ' + data.database + ')' : '') +
            '<p style="margin-top: 0.75rem;">' +
            hintBody +
            '</p>';
          return;
        }

        el.className = '';
        var tables = data.tables || {};
        var rows = tables.employee || tables.Employee;
        var html = '';

        if (!rows) {
          html = '<p class="db-meta">No employee table in this database.</p>';
        } else if (rows.length === 0) {
          html = '<p class="db-meta">Employee table is empty.</p>';
        } else {
          var isError = rows.length === 1 && rows[0]._error;
          html = '<div class="db-table-wrap"><h3>Employee</h3>';
          if (isError) {
            html += '<p class="db-error">' + rows[0]._error + '</p>';
          } else {
            if (searchWrap) searchWrap.classList.remove('is-hidden');
            var countWrap = document.getElementById('employee-result-count');
            if (countWrap) countWrap.classList.remove('is-hidden');
            var cols = visibleEmployeeColumns(Object.keys(rows[0]));
            var colLabels = {
              employee_id: 'Employee ID',
              employee_first_name: 'First Name',
              employee_last_name: 'Last Name',
              employee_email: 'Email',
              employee_phone: 'Phone',
              employee_rank: 'Rank'
            };
            function columnHeaderLabel(colName) {
              var key = colName.toLowerCase().replace(/\s+/g, '_');
              return colLabels[colName] || colLabels[key] || colName.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
            }
            html += '<table id="employee-table"><thead><tr>';
            cols.forEach(function (c) {
              html += '<th>' + columnHeaderLabel(c) + '</th>';
            });
            html += '</tr></thead><tbody>';
            html +=
              '<tr id="employee-no-results" class="db-no-results db-no-results-row is-hidden" aria-live="polite"><td colspan="' +
              cols.length +
              '">No employee found with that search.</td></tr>';
            rows.forEach(function (row) {
              html += '<tr>';
              cols.forEach(function (c) {
                var display = formatEmployeeCell(c, row[c]);
                html += '<td>' + display + '</td>';
              });
              html += '</tr>';
            });
            html += '</tbody></table>';
          }
          html += '</div>';
        }

        el.innerHTML = html;

        var searchInput = document.getElementById('employee-search');
        var table = document.getElementById('employee-table');
        var noResultsEl = document.getElementById('employee-no-results');
        var filterBtn = document.getElementById('employee-filter-btn');
        var filterDropdown = document.getElementById('employee-filter-dropdown');

        var cols =
          rows && rows.length && !rows[0]._error ? visibleEmployeeColumns(Object.keys(rows[0])) : [];
        var emailCol = cols.find(function (c) {
          var l = c.toLowerCase();
          return l === 'employee_email' || l === 'email';
        });

        var filterDomain = '';

        function getFilteredRows() {
          if (!rows || !rows.length || rows[0]._error) return [];
          return rows.filter(function (row) {
            if (!filterDomain || !emailCol || !row[emailCol]) return !filterDomain;
            var email = String(row[emailCol]).trim();
            var domain = email.indexOf('@') !== -1 ? email.split('@')[1].toLowerCase() : '(none)';
            return domain === filterDomain;
          });
        }

        function buildFilterDropdown(rowsSubset) {
          if (!filterDropdown || !rowsSubset.length) return;
          var domainCounts = {};
          rowsSubset.forEach(function (row) {
            if (emailCol && row[emailCol]) {
              var email = String(row[emailCol]).trim();
              var domain = email.indexOf('@') !== -1 ? email.split('@')[1].toLowerCase() : '(none)';
              domainCounts[domain] = (domainCounts[domain] || 0) + 1;
            }
          });
          var dropdownHtml = '';
          if (Object.keys(domainCounts).length > 0) {
            dropdownHtml += '<div class="db-filter-section"><div class="db-filter-section-title">By email domain</div>';
            dropdownHtml +=
              '<button type="button" class="db-filter-option db-filter-domain' +
              (filterDomain === '' ? ' is-active' : '') +
              '" data-value="">All</button>';
            Object.keys(domainCounts)
              .sort()
              .forEach(function (domain) {
                var active = filterDomain === domain ? ' is-active' : '';
                dropdownHtml +=
                  '<button type="button" class="db-filter-option db-filter-domain' +
                  active +
                  '" data-value="' +
                  domain.replace(/"/g, '&quot;') +
                  '">' +
                  domain +
                  ' (' +
                  domainCounts[domain] +
                  ')</button>';
              });
            dropdownHtml += '</div>';
          } else {
            dropdownHtml =
              '<div class="db-filter-section"><div class="db-filter-section-title">No filters available</div></div>';
          }
          dropdownHtml +=
            '<div class="db-filter-section db-filter-clear-wrap"><button type="button" class="db-filter-clear-btn" id="employee-filter-clear">Clear filters</button></div>';
          filterDropdown.innerHTML = dropdownHtml;
        }

        if (filterBtn && filterDropdown && rows && rows.length && !rows[0]._error) {
          buildFilterDropdown(rows);
        }

        function getCellText(tr, colKey) {
          if (!cols.length || !colKey) return '';
          var idx = cols.indexOf(colKey);
          if (idx === -1) return '';
          var cell = tr.cells[idx];
          return cell ? (cell.textContent || '').trim() : '';
        }

        function applyFilters() {
          var q = searchInput && searchInput.value ? searchInput.value.trim().toLowerCase() : '';
          var visibleCount = 0;
          if (!table) return;
          var tbody = table.querySelector('tbody');
          var tableRows = tbody ? tbody.querySelectorAll('tr') : [];
          tableRows.forEach(function (tr) {
            if (tr.id === 'employee-no-results') return;
            var rowText = tr.textContent || '';
            var searchMatch = q === '' || rowText.toLowerCase().indexOf(q) !== -1;
            var emailCell = getCellText(tr, emailCol);
            var domainMatch =
              !filterDomain ||
              (emailCell.indexOf('@') !== -1 && emailCell.split('@')[1].toLowerCase() === filterDomain);
            var show = searchMatch && domainMatch;
            tr.style.display = show ? '' : 'none';
            if (show) visibleCount++;
          });
          if (noResultsEl) {
            if ((q !== '' || filterDomain) && visibleCount === 0) {
              noResultsEl.classList.remove('is-hidden');
            } else {
              noResultsEl.classList.add('is-hidden');
            }
          }
          var countEl = document.getElementById('employee-count-num');
          if (countEl) countEl.textContent = visibleCount;
          if (filterDropdown) {
            filterDropdown.querySelectorAll('.db-filter-domain').forEach(function (opt) {
              opt.classList.toggle('is-active', opt.getAttribute('data-value') === filterDomain);
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
            if (e.target && e.target.id === 'employee-filter-clear') {
              filterDomain = '';
              if (searchInput) searchInput.value = '';
              buildFilterDropdown(rows);
              applyFilters();
              return;
            }
            var opt = e.target && e.target.closest && e.target.closest('.db-filter-option');
            if (!opt || !opt.classList.contains('db-filter-domain')) return;
            filterDomain = opt.getAttribute('data-value') || '';
            buildFilterDropdown(getFilteredRows());
            applyFilters();
          });
          document.addEventListener('click', function () {
            filterDropdown.classList.add('is-hidden');
            filterBtn.setAttribute('aria-expanded', 'false');
          });
        }

        if (table && rows && rows.length && !rows[0]._error) {
          applyFilters();
        } else {
          var countEl0 = document.getElementById('employee-count-num');
          if (countEl0) countEl0.textContent = '0';
        }
      })
      .catch(function () {
        var content = document.getElementById('db-content');
        content.className = 'db-error';
        content.innerHTML =
          'Failed to load data. Open this site from your Node server URL, log in, then open Employees again.';
      });
  }

  if (gateForm && gateSubmit) {
    gateForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (gateError) {
        gateError.hidden = true;
        gateError.textContent = '';
      }
      gateSubmit.disabled = true;
      gateSubmit.textContent = 'Signing in…';
      var email = document.getElementById('manager-gate-email').value.trim();
      var password = document.getElementById('manager-gate-password').value;
      fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password,
          employeesGate: true
        }),
        credentials: 'same-origin'
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (res.ok && res.data && res.data.success) {
            window.location.reload();
            return;
          }
          if (gateError) {
            gateError.textContent =
              (res.data && res.data.message) || 'Invalid email or password';
            gateError.hidden = false;
          }
          gateSubmit.disabled = false;
          gateSubmit.textContent = 'Continue';
        })
        .catch(function () {
          if (gateError) {
            gateError.textContent = 'Unable to reach server.';
            gateError.hidden = false;
          }
          gateSubmit.disabled = false;
          gateSubmit.textContent = 'Continue';
        });
    });
  }

  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) {
      return r.json();
    })
    .then(function (data) {
      if (data && data.loggedIn !== true) {
        window.location.replace('/client/Client_Login.html');
        return null;
      }
      return fetch('/api/admin/manager-me', { credentials: 'same-origin' }).then(function (r) {
        return r.json();
      });
    })
    .then(function (mgr) {
      if (mgr === null) return;
      if (!mgr || typeof mgr.managerLoggedIn === 'undefined') return;
      if (mgr.managerLoggedIn === true) {
        showManagerGate(false);
        loadEmployeeTable();
      } else {
        showManagerGate(true);
      }
    })
    .catch(function () {});
})();
