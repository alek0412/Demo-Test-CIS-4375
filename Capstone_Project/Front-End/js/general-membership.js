(function() {
      var box = document.getElementById('specials-box');
      if (!box) return;
      function toggle() {
        box.classList.toggle('is-open');
        box.setAttribute('aria-expanded', box.classList.contains('is-open'));
      }
      box.addEventListener('click', toggle);
      box.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    })();
