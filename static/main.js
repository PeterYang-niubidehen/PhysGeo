(function () {
  "use strict";
  var V = "static/videos/";

  // posters for every video, real sources only once the video comes near the viewport
  document.querySelectorAll("video[data-src]").forEach(function (v) {
    v.poster = V + v.dataset.src + ".jpg";
    v.preload = "none";
    v.muted = true;
  });
  document.querySelectorAll("img[data-poster]").forEach(function (im) { im.src = V + im.dataset.poster + ".jpg"; });

  function load(v) {
    if (!v.getAttribute("src")) { v.src = V + v.dataset.src + ".mp4"; v.load(); }
  }
  function visible(el) { return !el.hidden && !el.closest("[hidden]"); }
  function play(v) { if (!visible(v)) return; load(v); var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  // ---- synchronised groups: all videos restart together once the longest one has finished ----
  function members(group) { return Array.prototype.slice.call(group.querySelectorAll("video[data-src]")).filter(visible); }
  function restart(group) {
    members(group).forEach(function (v) { v.currentTime = 0; play(v); });
  }
  document.querySelectorAll(".sync").forEach(function (g) {
    g.querySelectorAll("video").forEach(function (v) {
      v.loop = false;
      v.addEventListener("ended", function () {
        if (members(g).every(function (m) { return m.ended; }) && !g.dataset.paused) restart(g);
      });
    });
  });
  // gallery cards: a card is its own small group (generated video + optional simulation)
  document.querySelectorAll(".card .pair").forEach(function (pair) {
    pair.classList.add("sync");
    pair.querySelectorAll("video").forEach(function (v) {
      v.loop = false;
      v.addEventListener("ended", function () {
        if (members(pair).every(function (m) { return m.ended; })) restart(pair);
      });
    });
  });

  // ---- play only what is on screen ----
  var groupOf = function (v) { return v.closest(".sync") || v; };
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var g = groupOf(e.target), vids = g.tagName === "VIDEO" ? [g] : members(g);
      if (e.isIntersecting) {
        if (g.dataset && g.dataset.paused) return;
        vids.forEach(function (v) { load(v); });
        vids.forEach(play);
      } else {
        vids.forEach(function (v) { v.pause(); });
      }
    });
  }, { rootMargin: "200px 0px", threshold: 0.15 });
  document.querySelectorAll(".sync, .teaser video").forEach(function (el) { io.observe(el); });

  // ---- "show simulation" toggles ----
  document.querySelectorAll(".card .toggle").forEach(function (b) {
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function () {
      var card = b.closest(".card"), sim = card.querySelector("video.sim"), on = sim.hidden;
      sim.hidden = !on; card.classList.toggle("with-sim", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = on ? "hide geometry" : "show geometry";
      if (on) restart(card.querySelector(".pair")); else sim.pause();
    });
  });

  // ---- comparison tabs + player bar ----
  var tabs = document.querySelectorAll(".tabs [data-tab]"), panels = document.querySelectorAll(".tabpanel");
  var bar = document.querySelector(".player-bar"), slow = false, paused = false;
  function current() { var p = document.querySelector(".tabpanel:not([hidden]) .sync"); return p; }
  function applyRate(g) { members(g).forEach(function (v) { v.playbackRate = slow ? 0.5 : 1; }); }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.setAttribute("aria-selected", x === t ? "true" : "false"); });
      panels.forEach(function (p) {
        var show = p.dataset.panel === t.dataset.tab;
        if (!show) p.querySelectorAll("video").forEach(function (v) { v.pause(); });
        p.hidden = !show;
      });
      var g = current(); delete g.dataset.paused; paused = false;
      bar.querySelector('[data-act="toggle"]').textContent = "pause";
      applyRate(g); restart(g);
    });
  });
  if (bar) bar.addEventListener("click", function (e) {
    var act = e.target.dataset && e.target.dataset.act, g = current();
    if (!act || !g) return;
    if (act === "restart") { delete g.dataset.paused; paused = false; e.currentTarget.querySelector('[data-act="toggle"]').textContent = "pause"; restart(g); }
    if (act === "toggle") {
      paused = !paused;
      if (paused) { g.dataset.paused = "1"; members(g).forEach(function (v) { v.pause(); }); }
      else { delete g.dataset.paused; members(g).forEach(play); }
      e.target.textContent = paused ? "play" : "pause";
    }
    if (act === "slow") {
      slow = !slow; e.target.setAttribute("aria-pressed", slow ? "true" : "false");
      document.querySelectorAll("#compare .sync").forEach(applyRate);
    }
  });
})();
