(function () {
      var sel = document.getElementById('layout-section-jump');
      if (!sel) return;
      sel.addEventListener('change', function () {
        var id = sel.value;
        if (!id) return;
        var target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        sel.selectedIndex = 0;
      });
    })();
