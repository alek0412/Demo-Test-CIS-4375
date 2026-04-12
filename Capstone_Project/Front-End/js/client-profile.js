(function () {
  var state = { profile: null };

  var editModal = document.getElementById('profile-edit-modal');
  var deleteModal = document.getElementById('profile-delete-modal');
  var editTriggers = [
    document.getElementById('profile-edit-trigger'),
    document.getElementById('profile-edit-trigger-secondary'),
  ].filter(Boolean);
  var deleteTriggers = [
    document.getElementById('profile-delete-trigger'),
    document.getElementById('profile-delete-trigger-secondary'),
  ].filter(Boolean);
  var closeBtns = Array.prototype.slice.call(document.querySelectorAll('[data-close-modal]'));
  var editForm = document.getElementById('profile-edit-form');
  var deleteInput = document.getElementById('delete-confirm-input');
  var confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  function esc(s) {
    return String(s == null ? '' : s);
  }

  function fullName(p) {
    if (!p) return '—';
    var n = (esc(p.firstName) + ' ' + esc(p.lastName)).trim();
    return n || '—';
  }

  function emergencyFullName(ec) {
    if (!ec) return '—';
    var n = (esc(ec.firstName) + ' ' + esc(ec.lastName)).trim();
    return n || '—';
  }

  function initials(p) {
    var fn = esc(p && p.firstName)
      .charAt(0)
      .toUpperCase();
    var ln = esc(p && p.lastName)
      .charAt(0)
      .toUpperCase();
    var t = (fn + ln).trim();
    return t || '?';
  }

  function renderActivity(activities) {
    var ul = document.getElementById('profile-activity-list');
    var empty = document.getElementById('profile-activity-empty');
    if (!ul) return;
    ul.innerHTML = '';
    var list = Array.isArray(activities) ? activities : [];
    if (!list.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    list.forEach(function (item) {
      var li = document.createElement('li');
      var p = document.createElement('p');
      p.textContent = item.title || '';
      var sm = document.createElement('small');
      sm.textContent = item.detail || '';
      li.appendChild(p);
      li.appendChild(sm);
      ul.appendChild(li);
    });
  }

  function applyProfile(p) {
    state.profile = p || null;
    if (!p) return;
    var nameEl = document.getElementById('profile-name');
    var emailEl = document.getElementById('profile-email');
    var phoneEl = document.getElementById('profile-phone');
    var avatar = document.querySelector('.profile-avatar');
    if (nameEl) nameEl.textContent = fullName(p);
    if (emailEl) emailEl.textContent = p.email || '—';
    if (phoneEl) phoneEl.textContent = p.phone || '—';
    if (avatar) avatar.textContent = initials(p);
    var ec = p.emergencyContact;
    var ecNameEl = document.getElementById('profile-emergency-name');
    var ecEmailEl = document.getElementById('profile-emergency-email');
    var ecPhoneEl = document.getElementById('profile-emergency-phone');
    if (ecNameEl) ecNameEl.textContent = emergencyFullName(ec);
    if (ecEmailEl) ecEmailEl.textContent = ec && ec.email ? esc(ec.email) : '—';
    if (ecPhoneEl) ecPhoneEl.textContent = ec && ec.phone ? esc(ec.phone) : '—';
    try {
      if (p.firstName) {
        sessionStorage.setItem('hbc_customer_first_name', String(p.firstName).trim());
      }
    } catch (e) {}
  }

  function fillEditForm() {
    var p = state.profile;
    var name = document.getElementById('edit-name');
    var mail = document.getElementById('edit-email');
    var phone = document.getElementById('edit-phone');
    if (!p) {
      if (name) name.value = '';
      if (mail) mail.value = '';
      if (phone) phone.value = '';
      return;
    }
    if (name) name.value = fullName(p) === '—' ? '' : fullName(p);
    if (mail) mail.value = p.email || '';
    if (phone) phone.value = p.phone || '';
  }

  function splitName(full) {
    var t = full.trim();
    if (!t) return { first_name: '', last_name: '' };
    var i = t.indexOf(' ');
    if (i === -1) return { first_name: t, last_name: '' };
    return { first_name: t.slice(0, i).trim(), last_name: t.slice(i + 1).trim() };
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add('is-hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  fetch('/api/customer-me', { credentials: 'same-origin' })
    .then(function (r) {
      return r.json().then(function (data) {
        return { ok: r.ok, data: data };
      });
    })
    .then(function (res) {
      var data = res.data;
      if (!data || !data.loggedIn) {
        window.location.href = '/client/Client_Login.html';
        return null;
      }
      if (data.profile) {
        applyProfile(data.profile);
      }
      return fetch('/api/customer-activity', { credentials: 'same-origin' })
        .then(function (r) {
          return r.json();
        })
        .catch(function () {
          return { success: true, activities: [] };
        });
    })
    .then(function (act) {
      if (act == null) return;
      if (act && act.success && Array.isArray(act.activities)) {
        renderActivity(act.activities);
      } else {
        renderActivity([]);
      }
    })
    .catch(function () {
      window.location.href = '/client/Client_Login.html';
    });

  editTriggers.forEach(function (btn) {
    btn.addEventListener('click', function () {
      fillEditForm();
      openModal(editModal);
    });
  });

  deleteTriggers.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (deleteInput) deleteInput.value = '';
      if (confirmDeleteBtn) confirmDeleteBtn.disabled = true;
      openModal(deleteModal);
    });
  });

  closeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeModal(editModal);
      closeModal(deleteModal);
    });
  });

  [editModal, deleteModal].forEach(function (modal) {
    if (!modal) return;
    modal.addEventListener('click', function (event) {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeModal(editModal);
      closeModal(deleteModal);
    }
  });

  if (editForm) {
    editForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var nameInput = document.getElementById('edit-name');
      var emailInput = document.getElementById('edit-email');
      var phoneInput = document.getElementById('edit-phone');
      var parts = splitName(nameInput ? nameInput.value : '');
      var body = {
        first_name: parts.first_name,
        last_name: parts.last_name,
        email: emailInput ? emailInput.value.trim() : '',
        phone: phoneInput ? phoneInput.value.trim() : '',
      };
      fetch('/api/customer', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then(function (r) {
          return r.text().then(function (text) {
            return { ok: r.ok, status: r.status, text: text };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            alert(out.text || 'Could not save changes. Try again.');
            return;
          }
          if (state.profile) {
            state.profile.firstName = parts.first_name;
            state.profile.lastName = parts.last_name;
            state.profile.email = body.email;
            state.profile.phone = body.phone;
            applyProfile(state.profile);
          }
          closeModal(editModal);
        })
        .catch(function () {
          alert('Network error while saving.');
        });
    });
  }

  if (deleteInput && confirmDeleteBtn) {
    deleteInput.addEventListener('input', function () {
      confirmDeleteBtn.disabled = deleteInput.value.trim() !== 'DELETE';
    });
    confirmDeleteBtn.addEventListener('click', function () {
      fetch('/api/customer', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
        .then(function (r) {
          return r.text().then(function (text) {
            return { ok: r.ok, text: text };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            alert(out.text || 'Could not delete account.');
            return;
          }
          try {
            sessionStorage.removeItem('hbc_customer_logged_in');
            sessionStorage.removeItem('hbc_customer_first_name');
            sessionStorage.removeItem('hbc_client_preview_mode');
          } catch (e) {}
          window.location.href = '/client/Client_Login.html';
        })
        .catch(function () {
          alert('Network error while deleting account.');
        });
    });
  }
})();
