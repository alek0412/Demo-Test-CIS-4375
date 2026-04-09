(function () {
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

  editTriggers.forEach(function (btn) {
    btn.addEventListener('click', function () {
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
      var name = document.getElementById('edit-name');
      var email = document.getElementById('edit-email');
      var phone = document.getElementById('edit-phone');
      var profileName = document.getElementById('profile-name');
      var profileEmail = document.getElementById('profile-email');
      var profilePhone = document.getElementById('profile-phone');
      var avatar = document.querySelector('.profile-avatar');
      if (name && profileName) profileName.textContent = name.value.trim() || profileName.textContent;
      if (email && profileEmail) profileEmail.textContent = email.value.trim() || profileEmail.textContent;
      if (phone && profilePhone) profilePhone.textContent = phone.value.trim() || profilePhone.textContent;
      if (name && avatar) {
        var parts = name.value.trim().split(/\s+/).filter(Boolean);
        var initials = (parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '');
        if (initials) avatar.textContent = initials.toUpperCase();
      }
      closeModal(editModal);
    });
  }

  if (deleteInput && confirmDeleteBtn) {
    deleteInput.addEventListener('input', function () {
      confirmDeleteBtn.disabled = deleteInput.value.trim() !== 'DELETE';
    });
    confirmDeleteBtn.addEventListener('click', function () {
      alert('Account deletion request captured. Connect this button to your delete-account endpoint when ready.');
      closeModal(deleteModal);
    });
  }
})();
