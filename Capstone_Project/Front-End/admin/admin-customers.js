/**
 * Admin Customers page: load Customer table from /api/db and attach search filter.
 * Runs in the browser (front-end).
 */
(function () {
  'use strict';
  var HIDDEN_CUSTOMER_COLUMNS = { password: true, salt: true };

  function isVisibleCustomerColumn(colName) {
    return !HIDDEN_CUSTOMER_COLUMNS[String(colName || '').toLowerCase()];
  }

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
          var cols = Object.keys(rows[0]).filter(isVisibleCustomerColumn);
          var customerIdColInner = cols.find(function (c) {
            return c.toLowerCase() === 'customer_id';
          });
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
          html += '<tr id="customer-no-results" class="db-no-results db-no-results-row is-hidden" aria-live="polite"><td colspan="' + cols.length + '">No customer found with that search.</td></tr>';
          rows.forEach(function (row) {
            var cid =
              customerIdColInner != null && row[customerIdColInner] != null
                ? String(row[customerIdColInner]).replace(/"/g, '&quot;')
                : '';
            html += '<tr class="customer-data-row"' + (cid ? ' data-customer-id="' + cid + '"' : '') + '>';
            cols.forEach(function (c) {
              var display = row[c];
              if (c === statusColName && (display === 1 || display === 2 || display === '1' || display === '2')) {
                display = display === 1 || display === '1' ? 'Active' : 'Inactive';
              }
              var safe = display != null && display !== '' ? String(display) : '';
              var lower = String(c || '').toLowerCase();
              var cellClass = '';
              if (lower === 'email') cellClass = ' class="db-cell-mono"';
              if (c === statusColName) {
                var statusText = safe;
                var tone =
                  String(statusText).toLowerCase() === 'active'
                    ? 'ok'
                    : String(statusText).toLowerCase() === 'inactive'
                      ? 'muted'
                      : 'neutral';
                html +=
                  '<td>' +
                  (safe
                    ? '<span class="db-pill db-pill--' + tone + '">' + statusText + '</span>'
                    : '') +
                  '</td>';
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

      var searchInput = document.getElementById('customer-search');
      var table = document.getElementById('customer-table');
      var noResultsEl = document.getElementById('customer-no-results');
      var filterBtn = document.getElementById('customer-filter-btn');
      var filterDropdown = document.getElementById('customer-filter-dropdown');

      var cols = rows && rows.length && !rows[0]._error
        ? Object.keys(rows[0]).filter(isVisibleCustomerColumn)
        : [];
      var customerIdCol = cols.find(function (c) {
        return c.toLowerCase() === 'customer_id';
      });
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

      var selectedCustomerId = null;
      var allRowsData = rows && rows.length && !rows[0]._error ? rows : [];

      var sortState = { col: null, dir: 'asc' };

      function getRowDataByCustomerId(idStr) {
        var n = parseInt(idStr, 10);
        if (!Number.isFinite(n) || !customerIdCol) return null;
        for (var i = 0; i < allRowsData.length; i++) {
          if (parseInt(allRowsData[i][customerIdCol], 10) === n) return allRowsData[i];
        }
        return null;
      }

      function syncRowSelection() {
        document.querySelectorAll('.customer-data-row').forEach(function (tr) {
          tr.classList.remove('customer-row-selected');
          tr.setAttribute('aria-selected', 'false');
        });
        if (selectedCustomerId == null) return;
        var sel = document.querySelector('.customer-data-row[data-customer-id="' + selectedCustomerId + '"]');
        if (sel && sel.style.display !== 'none') {
          sel.classList.add('customer-row-selected');
          sel.setAttribute('aria-selected', 'true');
        }
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
        if (selectedCustomerId != null) {
          var selTr = document.querySelector('.customer-data-row[data-customer-id="' + selectedCustomerId + '"]');
          if (!selTr || selTr.style.display === 'none') {
            selectedCustomerId = null;
          }
        }
        syncRowSelection();
      }

      function isProbablyNumber(s) {
        if (s == null) return false;
        var t = String(s).trim();
        if (!t) return false;
        // allow digits, commas, decimals, leading minus
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
        var noRes = trs.find(function (tr) { return tr.id === 'customer-no-results'; });
        var dataRows = trs.filter(function (tr) { return tr.id !== 'customer-no-results'; });

        dataRows.sort(function (ra, rb) {
          var a = (ra.cells[idx] && ra.cells[idx].textContent) ? ra.cells[idx].textContent : '';
          var b = (rb.cells[idx] && rb.cells[idx].textContent) ? rb.cells[idx].textContent : '';
          var cmp = compareCellText(a, b);
          return dir === 'desc' ? -cmp : cmp;
        });

        // Re-append in new order (keeps event delegation on tbody)
        dataRows.forEach(function (tr) { tbody.appendChild(tr); });
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

      var editBtn = document.getElementById('customer-edit-btn');
      var delBtn = document.getElementById('customer-delete-btn');
      var customerEditModal = document.getElementById('customer-edit-modal');
      var editSaveBtn = document.getElementById('customer-edit-save');
      var editCancelBtn = document.getElementById('customer-edit-cancel');
      var editFormStatus = document.getElementById('customer-edit-form-status');

      function colKey(name) {
        var l = name.toLowerCase();
        for (var i = 0; i < cols.length; i++) {
          if (cols[i].toLowerCase() === l) return cols[i];
        }
        return null;
      }

      function fillEditModal(row) {
        if (!row) return;
        document.getElementById('edit-display-id').textContent = selectedCustomerId || '—';
        var map = [
          ['edit-customer-first', 'customer_first_name'],
          ['edit-customer-last', 'customer_last_name'],
          ['edit-customer-phone', 'phone'],
          ['edit-customer-email', 'email'],
          ['edit-customer-street', 'street_address'],
          ['edit-customer-city', 'city'],
          ['edit-customer-state', 'state'],
          ['edit-customer-zip', 'zip_code'],
        ];
        map.forEach(function (pair) {
          var el = document.getElementById(pair[0]);
          var k = colKey(pair[1]);
          if (el) el.value = k && row[k] != null ? String(row[k]) : '';
        });
        var stK = colKey('membership_status');
        var sel = document.getElementById('edit-customer-status');
        if (sel && stK) {
          var n = parseInt(row[stK], 10);
          sel.value = n === 2 ? '2' : '1';
        }
        var pw = document.getElementById('edit-customer-new-password');
        if (pw) pw.value = '';
        if (editFormStatus) {
          editFormStatus.textContent = '';
          editFormStatus.style.color = '';
        }
      }

      function openEditModal() {
        if (!customerIdCol) {
          alert('This database table has no customer_id column; editing is not supported.');
          return;
        }
        if (!selectedCustomerId) {
          alert('Click a row in the table to select a customer, then choose Edit customer.');
          return;
        }
        var rowData = getRowDataByCustomerId(selectedCustomerId);
        if (!rowData) {
          alert('Could not load that customer. Try refreshing the page.');
          return;
        }
        fillEditModal(rowData);
        if (customerEditModal) {
          customerEditModal.classList.remove('is-hidden');
        }
      }

      function closeEditModal() {
        if (customerEditModal) customerEditModal.classList.add('is-hidden');
      }

      if (table && customerIdCol) {
        var tbodyEl = table.querySelector('tbody');
        if (tbodyEl) {
          tbodyEl.addEventListener('click', function (e) {
            var tr = e.target.closest && e.target.closest('.customer-data-row');
            if (!tr) return;
            var id = tr.getAttribute('data-customer-id');
            if (!id) return;
            selectedCustomerId = id;
            syncRowSelection();
          });
        }
      }

      if (editBtn) {
        editBtn.addEventListener('click', function () {
          openEditModal();
        });
      }

      if (editCancelBtn) {
        editCancelBtn.addEventListener('click', closeEditModal);
      }

      if (customerEditModal) {
        customerEditModal.addEventListener('click', function (e) {
          if (e.target === customerEditModal) closeEditModal();
        });
      }

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && customerEditModal && !customerEditModal.classList.contains('is-hidden')) {
          closeEditModal();
        }
      });

      if (editSaveBtn) {
        editSaveBtn.addEventListener('click', function () {
          if (!selectedCustomerId) return;
          var payload = {
            op: 'update',
            customerId: parseInt(selectedCustomerId, 10),
            customer_first_name: (document.getElementById('edit-customer-first') || {}).value || '',
            customer_last_name: (document.getElementById('edit-customer-last') || {}).value || '',
            phone: (document.getElementById('edit-customer-phone') || {}).value || '',
            email: (document.getElementById('edit-customer-email') || {}).value || '',
            street_address: (document.getElementById('edit-customer-street') || {}).value || '',
            city: (document.getElementById('edit-customer-city') || {}).value || '',
            state: (document.getElementById('edit-customer-state') || {}).value || '',
            zip_code: (document.getElementById('edit-customer-zip') || {}).value || '',
            membership_status: parseInt((document.getElementById('edit-customer-status') || {}).value, 10) || 1,
          };
          var npw = (document.getElementById('edit-customer-new-password') || {}).value || '';
          if (npw.trim()) payload.newPassword = npw.trim();
          editSaveBtn.disabled = true;
          if (editFormStatus) editFormStatus.textContent = 'Saving…';
          fetch('/api/admin/customer', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
            .then(function (r) {
              return r.json().then(function (body) {
                return { ok: r.ok, body: body };
              });
            })
            .then(function (out) {
              if (out.ok && out.body && out.body.success) {
                if (editFormStatus) {
                  editFormStatus.textContent = 'Saved successfully.';
                  editFormStatus.style.color = '';
                }
                setTimeout(function () {
                  closeEditModal();
                  window.location.reload();
                }, 600);
              } else {
                var msg = (out.body && out.body.message) || 'Could not save.';
                if (editFormStatus) {
                  editFormStatus.textContent = msg;
                  editFormStatus.style.color = '#b91c1c';
                } else {
                  alert(msg);
                }
              }
            })
            .catch(function () {
              if (editFormStatus) {
                editFormStatus.textContent = 'Network error.';
                editFormStatus.style.color = '#b91c1c';
              }
            })
            .then(function () {
              editSaveBtn.disabled = false;
            });
        });
      }

      if (delBtn) {
        delBtn.addEventListener('click', function () {
          if (!customerIdCol) {
            alert('This database table has no customer_id column; delete is not supported.');
            return;
          }
          if (!selectedCustomerId) {
            alert('Click a row in the table to select a customer, then choose Delete customer.');
            return;
          }
          if (
            !confirm(
              'Delete customer #' +
                selectedCustomerId +
                ' from the database? This cannot be undone.'
            )
          ) {
            return;
          }
          delBtn.disabled = true;
          fetch('/api/admin/customer', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              op: 'delete',
              customerId: parseInt(selectedCustomerId, 10),
            }),
          })
            .then(function (r) {
              return r.json().then(function (body) {
                return { ok: r.ok, body: body };
              });
            })
            .then(function (out) {
              if (out.ok && out.body && out.body.success) {
                window.location.reload();
              } else {
                var msg =
                  (out.body && out.body.message) ||
                  'Could not delete. The customer may be referenced by reservations or other records.';
                alert(msg);
              }
            })
            .catch(function () {
              alert('Network error.');
            })
            .then(function () {
              delBtn.disabled = false;
            });
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
