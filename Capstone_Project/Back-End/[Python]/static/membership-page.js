/**
 * Membership pages: skip link, scroll reveals, back-to-top (near footer).
 */
(function () {
  "use strict";

  if ("scrollRestoration" in history) {
    try {
      history.scrollRestoration = "manual";
    } catch (err) {}
  }

  window.addEventListener("load", function () {
    try {
      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } catch (err) {}
    window.scrollTo(0, 0);
  });

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mainEl = document.getElementById("main-content");

  function focusMain() {
    if (mainEl && typeof mainEl.focus === "function") {
      try {
        mainEl.focus({ preventScroll: true });
      } catch (err) {}
    }
  }

  document.querySelectorAll('.mem-toc a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var href = anchor.getAttribute("href");
      if (!href || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      if (reduce) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (typeof target.focus === "function") {
        try {
          target.focus({ preventScroll: true });
        } catch (err2) {}
      }
    });
  });

  var skip = document.querySelector(".mem-skip-link");
  if (skip && mainEl) {
    skip.addEventListener("click", function (e) {
      e.preventDefault();
      mainEl.focus({ preventScroll: true });
      if (!reduce) {
        try {
          mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          window.scrollTo(0, 0);
        }
      } else {
        window.scrollTo(0, 0);
      }
    });
  }

  var reveals = document.querySelectorAll(".mem-reveal");
  if (!reduce && "IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("mem-reveal--visible");
            io.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("mem-reveal--visible");
    });
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  var back = document.getElementById("gh-back-top");
  if (back) {
    var toggleBack = function () {
      var el = document.documentElement;
      var scrollTop = window.scrollY || 0;
      var vh = window.innerHeight;
      var sh = Math.max(el.scrollHeight, document.body ? document.body.scrollHeight : 0);
      var atBottom = scrollTop + vh >= sh - 2;
      if (atBottom) {
        back.classList.add("gh-back-top--visible");
        back.setAttribute("aria-hidden", "false");
        back.removeAttribute("tabindex");
      } else {
        back.classList.remove("gh-back-top--visible");
        back.setAttribute("aria-hidden", "true");
        back.setAttribute("tabindex", "-1");
      }
    };
    toggleBack();
    window.addEventListener("scroll", toggleBack, { passive: true });
    window.addEventListener("resize", toggleBack, { passive: true });

    back.addEventListener("click", function () {
      var start = window.scrollY || 0;
      if (reduce || start <= 0) {
        window.scrollTo(0, 0);
        focusMain();
        return;
      }
      var distance = start;
      var duration = Math.min(3800, Math.max(900, distance * 0.95));
      var t0 = performance.now();
      function step(now) {
        var elapsed = now - t0;
        var p = Math.min(elapsed / duration, 1);
        var y = start * (1 - easeInOutQuad(p));
        window.scrollTo(0, y);
        if (p < 1) {
          window.requestAnimationFrame(step);
        } else {
          focusMain();
        }
      }
      window.requestAnimationFrame(step);
    });
  }
})();
