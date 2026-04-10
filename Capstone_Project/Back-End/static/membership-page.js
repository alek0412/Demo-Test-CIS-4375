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

  function getDocScrollHeight() {
    var doc = document.documentElement;
    var body = document.body;
    return Math.max(
      doc.scrollHeight,
      doc.offsetHeight,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
  }

  function findPrimaryScrollContainer() {
    var vh = window.innerHeight;
    var sh = getDocScrollHeight();
    if (sh > vh + 4) return null;
    var best = null;
    var bestArea = 0;
    var nodes = document.body ? document.body.getElementsByTagName("*") : [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var st = window.getComputedStyle(el);
      var oy = st.overflowY;
      if (oy !== "auto" && oy !== "scroll" && oy !== "overlay") continue;
      var ch = el.clientHeight;
      if (ch < 100) continue;
      if (el.scrollHeight <= ch + 2) continue;
      var area = el.clientWidth * ch;
      if (area > bestArea) {
        bestArea = area;
        best = el;
      }
    }
    return best;
  }

  function isAtScrollBottom() {
    var pad = 2;
    var sc = findPrimaryScrollContainer();
    if (!sc) {
      var sh = getDocScrollHeight();
      var vh = window.innerHeight;
      if (sh <= vh + pad) return false;
      var scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      return scrollTop + vh >= sh - pad;
    }
    if (sc.scrollHeight <= sc.clientHeight + pad) return false;
    return sc.scrollTop + sc.clientHeight >= sc.scrollHeight - pad;
  }

  function resetAllScrollToTop() {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    } catch (e) {}
    var nodes = document.body ? document.body.getElementsByTagName("*") : [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var st = window.getComputedStyle(el);
      if (st.overflowY !== "auto" && st.overflowY !== "scroll" && st.overflowY !== "overlay") continue;
      if (el.scrollHeight > el.clientHeight + 1) el.scrollTop = 0;
    }
  }

  function pickScrollTargetForClick() {
    var winY = window.scrollY || document.documentElement.scrollTop || 0;
    var bestEl = null;
    var bestTop = 0;
    var nodes = document.body ? document.body.getElementsByTagName("*") : [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var st = window.getComputedStyle(el);
      if (st.overflowY !== "auto" && st.overflowY !== "scroll" && st.overflowY !== "overlay") continue;
      if (el.clientHeight < 80) continue;
      if (el.scrollHeight <= el.clientHeight + 2) continue;
      if (el.scrollTop > bestTop) {
        bestTop = el.scrollTop;
        bestEl = el;
      }
    }
    if (winY > bestTop) return { type: "window", start: winY };
    if (bestEl && bestTop > 0) return { type: "element", el: bestEl, start: bestTop };
    if (winY > 0) return { type: "window", start: winY };
    return null;
  }

  var back = document.getElementById("gh-back-top");
  if (back) {
    var nestedScrollEl = null;

    var toggleBack = function () {
      if (isAtScrollBottom()) {
        back.classList.add("gh-back-top--visible");
        back.setAttribute("aria-hidden", "false");
        back.removeAttribute("tabindex");
      } else {
        back.classList.remove("gh-back-top--visible");
        back.setAttribute("aria-hidden", "true");
        back.setAttribute("tabindex", "-1");
      }
    };

    function bindNestedScroll() {
      if (nestedScrollEl) {
        nestedScrollEl.removeEventListener("scroll", toggleBack);
        nestedScrollEl = null;
      }
      var n = findPrimaryScrollContainer();
      if (n) {
        nestedScrollEl = n;
        n.addEventListener("scroll", toggleBack, { passive: true });
      }
    }

    toggleBack();
    bindNestedScroll();
    window.addEventListener("scroll", toggleBack, { passive: true });
    window.addEventListener("resize", function () {
      bindNestedScroll();
      toggleBack();
    }, { passive: true });

    back.addEventListener("click", function () {
      function finish() {
        resetAllScrollToTop();
        focusMain();
      }
      if (reduce) {
        finish();
        return;
      }
      var t = pickScrollTargetForClick();
      if (!t || t.start <= 0) {
        finish();
        return;
      }
      if (t.type === "window") {
        var start = t.start;
        var duration = Math.min(3800, Math.max(900, start * 0.95));
        var t0 = performance.now();
        function stepWin(now) {
          var p = Math.min((now - t0) / duration, 1);
          var y = start * (1 - easeInOutQuad(p));
          window.scrollTo(0, y);
          if (p < 1) window.requestAnimationFrame(stepWin);
          else finish();
        }
        window.requestAnimationFrame(stepWin);
        return;
      }
      var sc = t.el;
      var startSc = t.start;
      var dur = Math.min(3800, Math.max(900, startSc * 0.95));
      var t1 = performance.now();
      function stepEl(now) {
        var p = Math.min((now - t1) / dur, 1);
        sc.scrollTop = startSc * (1 - easeInOutQuad(p));
        if (p < 1) window.requestAnimationFrame(stepEl);
        else finish();
      }
      window.requestAnimationFrame(stepEl);
    });
  }
})();
