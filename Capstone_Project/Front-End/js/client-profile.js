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

  function formatMemberSince(b) {
    if (!b) return '—';
    var d = new Date(b);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function membershipLabel(code) {
    if (code == null || code === '') return '—';
    var n = Number(code);
    if (n === 1) return 'Junior (under 23)';
    if (n === 2) return 'Standard (23–54)';
    if (n === 3) return 'Senior (55+)';
    return 'Category ' + esc(code);
  }

  function applyProfile(p) {
    state.profile = p || null;
    if (!p) return;
    var nameEl = document.getElementById('profile-name');
    var emailEl = document.getElementById('profile-email');
    var phoneEl = document.getElementById('profile-phone');
    var memberSinceEl = document.getElementById('profile-member-since');
    var avatar = document.querySelector('.profile-avatar');
    var planEl = document.getElementById('profile-plan');
    if (nameEl) nameEl.textContent = fullName(p);
    if (emailEl) emailEl.textContent = p.email || '—';
    if (phoneEl) phoneEl.textContent = p.phone || '—';
    if (memberSinceEl) memberSinceEl.textContent = formatMemberSince(p.birthdate);
    if (avatar) avatar.textContent = initials(p);
    if (planEl) planEl.textContent = membershipLabel(p.membershipStatus);
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
        return;
      }
      if (data.profile) {
        applyProfile(data.profile);
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
