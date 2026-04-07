(function () {
  "use strict";
  var yearSelect = document.querySelector('select[name="birth_year"]');
  if (yearSelect) {
    var y = new Date().getFullYear();
    for (var i = y; i >= y - 100; i--) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      yearSelect.appendChild(opt);
    }
  }
  var form = document.getElementById("waiver-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      alert("Waiver submission will be connected to the server later.");
    });
  }
})();
