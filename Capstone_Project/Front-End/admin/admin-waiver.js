/**
 * Admin Waiver page: load `waiver` table from GET /api/db (same pipeline as Customers).
 */
(function () {
  'use strict';

  function isVisibleWaiverColumn(colName) {
    return true;
  }

  fetch('/api/me', { credentials: 'same-origin' })
    .then(function (r) {
      return r.json();
    })
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
      var searchWrap = document.getElementById('waiver-search-wrap');

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
            'The database host is reachable and a password was sent, but MySQL rejected the login. Confirm <code>DB_USER</code> matches the RDS master username (or a user you created with access to this database). Re-type <code>DB_PASSWORD</code> in <code>.env</code> with no quotes or spaces around the value. If you reset the RDS password in AWS, update <code>.env</code> and restart the app.';
        } else {
          hintBody =
            'If you run the app on your laptop, RDS may be unreachable from your network. Run the app on EC2 (same VPC as RDS) and ensure <code>.env</code> has the correct <code>DB_*</code> values.';
        }
        var hint = '<p style="margin-top: 0.75rem;">' + hintBody + '</p>';
        el.innerHTML =
          'Cannot connect to the database. ' +
          data.error +
          (data.database ? ' (Database: ' + data.database + ')' : '') +
          hint;
        return;
      }

      el.className = '';
      var tables = data.tables || {};
      var rows = tables.waiver || tables.Waiver;
      var html = '';

      if (!rows) {
        html = '<p class="db-meta">No waiver table in this database.</p>';
      } else if (rows.length === 0) {
        html = '<p class="db-meta">Waiver table is empty.</p>';
      } else {
        var isError = rows.length === 1 && rows[0]._error;
        html = '<div class="db-table-wrap"><h3>Waiver</h3>';
        if (isError) {
          html += '<p class="db-error">' + rows[0]._error + '</p>';
        } else {
          if (searchWrap) searchWrap.classList.remove('is-hidden');
          var countWrap = document.getElementById('waiver-result-count');
          if (countWrap) countWrap.classList.remove('is-hidden');
          var cols = Object.keys(rows[0]).filter(isVisibleWaiverColumn);
          var idCol = cols.find(function (c) {
            return c.toLowerCase() === 'waiver_id';
          });
          var statusColName = cols.find(function (c) {
            return c.toLowerCase() === 'waiver_status';
          });
          var colLabels = {
            waiver_id: 'Waiver ID',
            customer_id: 'Customer ID',
            waiver_status: 'Waiver status',
          };
          function columnHeaderLabel(colName) {
            var key = colName.toLowerCase().replace(/\s+/g, '_');
            return colLabels[colName] || colLabels[key] || colName.replace(/_/g, ' ').replace(/\b\w/g, function (c) {
              return c.toUpperCase();
            });
          }
          function waiverStatusLabel(val) {
            if (val === 1 || val === '1') return 'Pending';
            if (val === 2 || val === '2') return 'On file';
            if (val === 3 || val === '3') return 'Inactive';
            return val != null && val !== '' ? String(val) : '';
          }
          html += '<table id="waiver-table"><thead><tr>';
          cols.forEach(function (c) {
            var label = columnHeaderLabel(c);
            html +=
              '<th scope="col" data-col="' +
              String(c).replace(/"/g, '&quot;') +
              '" aria-sort="none">' +
              '<button type="button" class="db-sort-btn" data-col="' +
              String(c).replace(/"/g, '&quot;') +
              '" aria-label="Sort by ' +
              String(label).replace(/"/g, '&quot;') +
              '">' +
              label +
              '<span class="db-sort-indicator" aria-hidden="true"></span>' +
              '</button>' +
              '</th>';
          });
          html += '</tr></thead><tbody>';
          html +=
            '<tr id="waiver-no-results" class="db-no-results db-no-results-row is-hidden" aria-live="polite"><td colspan="' +
            cols.length +
            '">No waiver row matches that search.</td></tr>';
          rows.forEach(function (row) {
            var wid = idCol != null && row[idCol] != null ? String(row[idCol]).replace(/"/g, '&quot;') : '';
            html += '<tr class="waiver-data-row"' + (wid ? ' data-waiver-id="' + wid + '"' : '') + '>';
            cols.forEach(function (c) {
              var display = row[c];
              if (c === statusColName && display != null && display !== '') {
                display = waiverStatusLabel(display);
              }
              var safe = display != null && display !== '' ? String(display) : '';
              var lower = String(c || '').toLowerCase();
              var cellClass = lower === 'customer_id' ? ' class="db-cell-mono"' : '';
              if (c === statusColName && safe) {
                var tone =
                  String(safe).toLowerCase() === 'on file'
                    ? 'ok'
                    : String(safe).toLowerCase() === 'pending'
                      ? 'muted'
                      : 'neutral';
                html += '<td><span class="db-pill db-pill--' + tone + '">' + safe + '</span></td>';
              } else {
                html += '<td' + cellClass + '>' + safe + '</td>';
              }
            });
            html += '</tr>';
          });
          html += '</tbody></table>';
        }
        html += '</div>';
      }

      el.innerHTML = html;

      var searchInput = document.getElementById('waiver-search');
      var table = document.getElementById('waiver-table');
      var noResultsEl = document.getElementById('waiver-no-results');
      var filterBtn = document.getElementById('waiver-filter-btn');
      var filterDropdown = document.getElementById('waiver-filter-dropdown');

      var cols =
        rows && rows.length && !rows[0]._error ? Object.keys(rows[0]).filter(isVisibleWaiverColumn) : [];
      var statusCol = cols.find(function (c) {
        return c.toLowerCase() === 'waiver_status';
      });

      var filterStatus = '';

      function waiverStatusLabelForRow(val) {
        if (val === 1 || val === '1') return 'Pending';
        if (val === 2 || val === '2') return 'On file';
        if (val === 3 || val === '3') return 'Inactive';
        return val != null && val !== '' ? String(val) : '';
      }

      function getFilteredRows() {
        if (!rows || !rows.length || rows[0]._error) return [];
        return rows.filter(function (row) {
          var statusOk = !filterStatus;
          if (!statusOk && statusCol != null) {
            var s = waiverStatusLabelForRow(row[statusCol]) || '(blank)';
            statusOk = norm(s) === norm(filterStatus);
          }
          return statusOk;
        });
      }

      function buildFilterDropdown(rowsSubset) {
        if (!filterDropdown || !rowsSubset.length) return;
        var statusCounts = {};
        rowsSubset.forEach(function (row) {
          if (statusCol && row[statusCol] != null && row[statusCol] !== '') {
            var s = waiverStatusLabelForRow(row[statusCol]) || '(blank)';
            statusCounts[s] = (statusCounts[s] || 0) + 1;
          }
        });

        var dropdownHtml = '';
        if (Object.keys(statusCounts).length > 0) {
          dropdownHtml += '<div class="db-filter-section"><div class="db-filter-section-title">By waiver status</div>';
          dropdownHtml +=
            '<button type="button" class="db-filter-option db-filter-status' +
            (filterStatus === '' ? ' is-active' : '') +
            '" data-value="">All</button>';
          Object.keys(statusCounts)
            .sort()
            .forEach(function (s) {
              var active = norm(filterStatus) === norm(s) ? ' is-active' : '';
              dropdownHtml +=
                '<button type="button" class="db-filter-option db-filter-status' +
                active +
                '" data-value="' +
                String(s).replace(/"/g, '&quot;') +
                '">' +
                s +
                ' (' +
                statusCounts[s] +
                ')</button>';
            });
          dropdownHtml += '</div>';
        }
        if (dropdownHtml === '') {
          dropdownHtml =
            '<div class="db-filter-section"><div class="db-filter-section-title">No filters available</div></div>';
        }
        dropdownHtml +=
          '<div class="db-filter-section db-filter-clear-wrap"><button type="button" class="db-filter-clear-btn" id="waiver-filter-clear">Clear filters</button></div>';
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
        return v == null || v === '' ? '' : String(v).trim();
      }

      function applyFilters() {
        var q = searchInput && searchInput.value ? searchInput.value.trim().toLowerCase() : '';
        var visibleCount = 0;
        if (!table) return;
        var tbody = table.querySelector('tbody');
        var tableRows = tbody ? tbody.querySelectorAll('tr') : [];
        tableRows.forEach(function (tr) {
          if (tr.id === 'waiver-no-results') return;
          var rowText = tr.textContent || '';
          var searchMatch = q === '' || rowText.toLowerCase().indexOf(q) !== -1;
          var statusCell = getCellText(tr, statusCol);
          var statusMatch = !filterStatus || norm(statusCell) === norm(filterStatus);
          var show = searchMatch && statusMatch;
          tr.style.display = show ? '' : 'none';
          if (show) visibleCount++;
        });
        if (noResultsEl) {
          if ((q !== '' || filterStatus) && visibleCount === 0) {
            noResultsEl.classList.remove('is-hidden');
          } else {
            noResultsEl.classList.add('is-hidden');
          }
        }
        var countEl = document.getElementById('waiver-count-num');
        if (countEl) countEl.textContent = visibleCount;
        if (filterDropdown) {
          filterDropdown.querySelectorAll('.db-filter-status').forEach(function (opt) {
            opt.classList.toggle('is-active', opt.getAttribute('data-value') === filterStatus);
          });
        }
      }

      function isProbablyNumber(s) {
        if (s == null) return false;
        var t = String(s).trim();
        if (!t) return false;
        return /^-?\d[\d,]*([.]\d+)?$/.test(t);
      }

      function compareCellText(a, b) {
        if (a == null) a = '';
        if (b == null) b = '';
        var A = String(a).trim();
        var B = String(b).trim();
        if (A === B) return 0;
        var numA = isProbablyNumber(A);
        var numB = isProbablyNumber(B);
        if (numA && numB) {
          var na = Number(A.replace(/,/g, ''));
          var nb = Number(B.replace(/,/g, ''));
          if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        }
        return A.localeCompare(B, undefined, { numeric: true, sensitivity: 'base' });
      }

      var sortState = { col: null, dir: 'asc' };

      function setSortUi(col, dir) {
        if (!table) return;
        var ths = table.querySelectorAll('thead th');
        ths.forEach(function (th) {
          var isActive = th.getAttribute('data-col') === col;
          th.setAttribute('aria-sort', isActive ? (dir === 'desc' ? 'descending' : 'ascending') : 'none');
          th.classList.toggle('is-sorted', isActive);
          th.classList.toggle('is-sorted-desc', isActive && dir === 'desc');
        });
      }

      function sortTableByColumn(colKey, dir) {
        if (!table || !cols.length) return;
        var idx = cols.indexOf(colKey);
        if (idx === -1) return;
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        var trs = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
        var noRes = trs.find(function (tr) {
          return tr.id === 'waiver-no-results';
        });
        var dataRows = trs.filter(function (tr) {
          return tr.id !== 'waiver-no-results';
        });

        dataRows.sort(function (ra, rb) {
          var a = ra.cells[idx] && ra.cells[idx].textContent ? ra.cells[idx].textContent : '';
          var b = rb.cells[idx] && rb.cells[idx].textContent ? rb.cells[idx].textContent : '';
          var cmp = compareCellText(a, b);
          return dir === 'desc' ? -cmp : cmp;
        });

        dataRows.forEach(function (tr) {
          tbody.appendChild(tr);
        });
        if (noRes) tbody.insertBefore(noRes, tbody.firstChild);
        setSortUi(colKey, dir);
        applyFilters();
      }

      if (searchInput && table) {
        searchInput.addEventListener('input', applyFilters);
      }

      if (table) {
        var thead = table.querySelector('thead');
        if (thead) {
          thead.addEventListener('click', function (e) {
            var btn = e.target && e.target.closest && e.target.closest('.db-sort-btn');
            if (!btn) return;
            var col = btn.getAttribute('data-col');
            if (!col) return;
            if (sortState.col === col) {
              sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
            } else {
              sortState.col = col;
              sortState.dir = 'asc';
            }
            sortTableByColumn(sortState.col, sortState.dir);
          });
        }
      }

      if (filterBtn && filterDropdown) {
        filterBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          var open = filterDropdown.classList.toggle('is-hidden');
          filterBtn.setAttribute('aria-expanded', !open);
        });
        filterDropdown.addEventListener('click', function (e) {
          e.stopPropagation();
          if (e.target && e.target.id === 'waiver-filter-clear') {
            filterStatus = '';
            if (searchInput) searchInput.value = '';
            buildFilterDropdown(getFilteredRows());
            applyFilters();
            return;
          }
          var opt = e.target && e.target.closest && e.target.closest('.db-filter-option');
          if (!opt) return;
          var value = opt.getAttribute('data-value') || '';
          if (opt.classList.contains('db-filter-status')) {
            filterStatus = value;
          }
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
        var countEl0 = document.getElementById('waiver-count-num');
        if (countEl0) countEl0.textContent = '0';
      }
    })
    .catch(function () {
      document.getElementById('db-content').className = 'db-error';
      document.getElementById('db-content').innerHTML =
        'Failed to load data. Open this site at the same URL where your Node server is running, log in from that page, then open Waiver again.';
    });
})();
