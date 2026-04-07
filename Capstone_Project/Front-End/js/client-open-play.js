(function () {
  "use strict";
  var closeBtn = document.querySelector(".openplay-close");
  if (!closeBtn) return;
  closeBtn.addEventListener("click", function (e) {
    e.preventDefault();
    history.back();
  });
})();
