// Drs Guinsbourg-Hanisch & Associés, kleines Vanilla-JS ohne Libraries
(function () {
  "use strict";

  // Texte der Oberfläche in den drei Sprachen (Sprache kommt aus <html lang>)
  var I18N = {
    fr: { menuOpen: "Ouvrir le menu", menuClose: "Fermer le menu", play: "Lire la vidéo", pause: "Mettre la vidéo en pause",
          p0h: "Aucun point coché", p1h: "Un point coché", pnh: " points cochés",
          p0: "Un contrôle des gencives lors de votre visite annuelle reste recommandé, même sans symptôme.",
          pn: "Ces points justifient un examen des gencives. Une parodontite détectée tôt se traite plus simplement." },
    en: { menuOpen: "Open menu", menuClose: "Close menu", play: "Play video", pause: "Pause video",
          p0h: "No item ticked", p1h: "One item ticked", pnh: " items ticked",
          p0: "A gum check at your annual visit is still recommended, even without symptoms.",
          pn: "These signs call for a gum examination. Periodontitis detected early is easier to treat." },
    de: { menuOpen: "Menü öffnen", menuClose: "Menü schließen", play: "Video abspielen", pause: "Video anhalten",
          p0h: "Nichts angekreuzt", p1h: "Ein Punkt angekreuzt", pnh: " Punkte angekreuzt",
          p0: "Eine Kontrolle des Zahnfleischs beim jährlichen Termin ist auch ohne Beschwerden empfehlenswert.",
          pn: "Diese Punkte sprechen für eine Untersuchung des Zahnfleischs. Früh erkannt, lässt sich eine Parodontitis einfacher behandeln." }
  };
  var T = I18N[(document.documentElement.lang || "fr").slice(0, 2)] || I18N.fr;

  // Nur lokal (Seite per Doppelklick geöffnet): Ordner-Links auf index.html umbiegen.
  // Online auf dem Server hat das keine Wirkung.
  if (location.protocol === "file:") {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var h = a.getAttribute("href");
      if (/^(https?:|tel:|mailto:|#)/.test(h)) return;
      if (h === "./" || h === "" ) { a.setAttribute("href", "index.html"); return; }
      if (/\/$/.test(h)) a.setAttribute("href", h + "index.html");
      else if (/\/#/.test(h)) a.setAttribute("href", h.replace("/#", "/index.html#"));
    });
  }

  // Header: transparent über dem Hero, danach hell
  var header = document.querySelector("[data-header]");
  var hasHero = !!document.querySelector(".hero");
  function onScroll() {
    var solid = !hasHero || window.scrollY > window.innerHeight * 0.6 - 84;
    header.classList.toggle("is-solid", solid || document.body.classList.contains("menu-open"));
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Dropdowns (Klick + Hover auf Desktop, Escape schließt)
  var items = document.querySelectorAll(".nav-item.has-sub");
  function closeAll(except) {
    items.forEach(function (it) {
      if (it === except) return;
      it.classList.remove("is-open");
      it.querySelector(".nav-toggle, .nav-caret").setAttribute("aria-expanded", "false");
    });
  }
  items.forEach(function (it) {
    var btn = it.querySelector(".nav-toggle, .nav-caret");
    function setOpen(open) {
      it.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    var hoverOpenedAt = 0;
    btn.addEventListener("click", function () {
      // Wurde das Menü gerade erst per Maus geöffnet, schließt der Klick es nicht wieder
      if (Date.now() - hoverOpenedAt < 600) return;
      var open = !it.classList.contains("is-open");
      closeAll(it); setOpen(open);
    });
    it.addEventListener("mouseenter", function () { if (matchMedia("(hover: hover)").matches) { closeAll(it); setOpen(true); hoverOpenedAt = Date.now(); } });
    it.addEventListener("mouseleave", function () { if (matchMedia("(hover: hover)").matches) setOpen(false); });
    it.addEventListener("focusout", function (e) { if (!it.contains(e.relatedTarget)) setOpen(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeAll(); toggleMenu(false); }
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".nav-item")) closeAll(); });

  // Mobiles Menü
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("mobile-menu");
  function toggleMenu(open) {
    if (!burger) return;
    if (typeof open !== "boolean") open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? T.menuClose : T.menuOpen);
    menu.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    onScroll();
  }
  if (burger) burger.addEventListener("click", function () { toggleMenu(); });

  // Hero-Video: Pause-Knopf, reduzierte Bewegung respektieren
  var video = document.querySelector("[data-hero-video]");
  var vbtn = document.querySelector("[data-video-toggle]");
  if (video && vbtn) {
    var reduce = matchMedia("(prefers-reduced-motion: reduce)");
    // Beschriftung folgt immer dem tatsächlichen Zustand des Videos
    function syncLabel() {
      var p = video.paused;
      vbtn.setAttribute("aria-pressed", p ? "true" : "false");
      vbtn.textContent = p ? T.play : T.pause;
    }
    function setPaused(p) {
      if (p) video.pause(); else video.play().catch(function () {});
    }
    video.addEventListener("play", syncLabel);
    video.addEventListener("pause", syncLabel);
    if (reduce.matches) setPaused(true);
    syncLabel();
    vbtn.addEventListener("click", function () { setPaused(!video.paused); });
  }

  // Rundgang durch die Praxis: auf dem Desktop seitlich beim Scrollen, sonst wischen
  var tour = document.querySelector("[data-tour]");
  if (tour) {
    var sticky = tour.querySelector("[data-tour-sticky]");
    var track = tour.querySelector("[data-tour-track]");
    var bar = tour.querySelector("[data-tour-progress]");
    var pinMq = matchMedia("(min-width: 900px) and (prefers-reduced-motion: no-preference)");
    var dist = 0, ticking = false;
    tour.querySelectorAll("img").forEach(function (i) { i.loading = "eager"; i.addEventListener("load", setupTour); });

    function setupTour() {
      if (pinMq.matches) {
        tour.classList.add("is-pinned");
        dist = Math.max(0, track.scrollWidth - window.innerWidth);
        // 0.55: die Räume ziehen schneller vorbei, als man scrollt
        tour.style.height = (dist * 0.55 + window.innerHeight) + "px";
      } else {
        tour.classList.remove("is-pinned");
        tour.style.height = "";
        track.style.transform = "";
      }
      updateTour();
    }
    function updateTour() {
      ticking = false;
      var p;
      if (tour.classList.contains("is-pinned")) {
        var total = tour.offsetHeight - window.innerHeight;
        p = total > 0 ? Math.min(1, Math.max(0, -tour.getBoundingClientRect().top / total)) : 0;
        track.style.transform = "translate3d(" + (-p * dist).toFixed(1) + "px,0,0)";
      } else {
        var max = sticky.scrollWidth - sticky.clientWidth;
        p = max > 0 ? sticky.scrollLeft / max : 0;
      }
      if (bar) bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
    }
    function requestTour() { if (!ticking) { ticking = true; requestAnimationFrame(updateTour); } }
    window.addEventListener("scroll", requestTour, { passive: true });
    sticky.addEventListener("scroll", requestTour, { passive: true });
    window.addEventListener("resize", setupTour);
    if (pinMq.addEventListener) pinMq.addEventListener("change", setupTour);
    setupTour();
  }

  // Zeitstrahl: Linie füllt sich beim Scrollen, erreichte Schritte werden markiert
  var tl = document.querySelector("[data-timeline]");
  if (tl) {
    var fill = tl.querySelector("[data-tl-fill]");
    var stepEls = tl.querySelectorAll("[data-step]");
    var tlTick = false;
    function updateTl() {
      tlTick = false;
      var r = tl.getBoundingClientRect();
      var mark = window.innerHeight * 0.6;
      var p = Math.min(1, Math.max(0, (mark - r.top) / r.height));
      fill.style.transform = "scaleY(" + p.toFixed(4) + ")";
      stepEls.forEach(function (st) {
        st.classList.toggle("is-reached", st.getBoundingClientRect().top + 22 < mark);
      });
    }
    window.addEventListener("scroll", function () { if (!tlTick) { tlTick = true; requestAnimationFrame(updateTl); } }, { passive: true });
    window.addEventListener("resize", updateTl);
    updateTl();
  }

  // Tabs (Vergleich Prothetik, Altersleiste Kinder), mit Pfeiltasten bedienbar
  document.querySelectorAll("[data-tabs]").forEach(function (box) {
    var tabs = box.querySelectorAll('[role="tab"]');
    function select(t) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); select(n); n.focus(); }
      });
    });
  });

  // Zahnschnitt Endodontie: Schritt wählen hebt den passenden Teil hervor
  var tooth = document.querySelector("[data-tooth]");
  if (tooth) {
    var esteps = document.querySelectorAll("[data-endo-step]");
    function showStep(b) {
      esteps.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      tooth.setAttribute("data-show", b.getAttribute("data-endo-step"));
    }
    esteps.forEach(function (b) {
      b.addEventListener("click", function () { showStep(b); });
      b.addEventListener("mouseenter", function () { if (matchMedia("(hover: hover)").matches) showStep(b); });
      b.addEventListener("focus", function () { showStep(b); });
    });
  }

  // Warnzeichen Parodontologie: Anzahl und Hinweis aktualisieren
  var checks = document.querySelectorAll("[data-paro-check]");
  if (checks.length) {
    var cnt = document.querySelector("[data-paro-count]");
    var msg = document.querySelector("[data-paro-msg]");
    var hd = document.querySelector("[data-paro-h]");
    function upd() {
      var n = 0; checks.forEach(function (c) { if (c.checked) n++; });
      cnt.textContent = n;
      if (n === 0) {
        hd.textContent = T.p0h;
        msg.textContent = T.p0;
      } else {
        hd.textContent = n === 1 ? T.p1h : n + T.pnh;
        msg.textContent = T.pn;
      }
    }
    checks.forEach(function (c) { c.addEventListener("change", upd); });
    upd();
  }

  // Hintergrund-Videos im Seitenkopf: bei reduzierter Bewegung anhalten
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("[data-bg-video]").forEach(function (v) { v.removeAttribute("autoplay"); v.pause(); });
  }

  // Inhaltsverzeichnis: aktuellen Abschnitt markieren
  var tocLinks = document.querySelectorAll(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    tocLinks.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove("is-current"); });
          var a = byId[en.target.id]; if (a) a.classList.add("is-current");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    document.querySelectorAll(".prose-sec[id]").forEach(function (s) { io.observe(s); });
  }

  // Spezialitäten: Bild wechselt beim Überfahren / Fokussieren
  var list = document.querySelector("[data-spec-list]");
  var figImg = document.querySelector("[data-spec-img]");
  if (list && figImg) {
    var specItems = list.querySelectorAll(".spec-item");
    var current = specItems[0];
    // Bilder vorladen
    specItems.forEach(function (li) { var i = new Image(); i.src = li.dataset.img; });
    function activate(li) {
      if (li === current) return;
      current.classList.remove("is-active");
      li.classList.add("is-active");
      current = li;
      figImg.classList.add("is-fading");
      setTimeout(function () {
        figImg.src = li.dataset.img;
        figImg.alt = li.dataset.alt || "";
        figImg.classList.remove("is-fading");
      }, 180);
    }
    specItems.forEach(function (li) {
      li.addEventListener("mouseenter", function () { activate(li); });
      li.querySelector("a").addEventListener("focus", function () { activate(li); });
    });
  }
})();
