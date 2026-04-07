(function () {
  "use strict";
  var mapLink = document.getElementById("contact-map-link");
  var panel = document.getElementById("contact-location-panel");
  if (!mapLink || !panel) return;
  mapLink.addEventListener("click", function () {
    var open = panel.classList.toggle("is-open");
    mapLink.setAttribute("aria-expanded", open ? "true" : "false");
  });
})();
