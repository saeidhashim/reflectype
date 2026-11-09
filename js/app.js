(function () {
  "use strict";
  var C = window.ReflectypeCore, CFG = window.REFLECTYPE_CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var today = C.dateKey();
  var longDate = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  var shortDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  var current = null; // { genre, video }

  // Storage: the hosted preview may supply window.REFLECTYPE_STORAGE (sandboxed frames block localStorage).
  function store(fn) { try { return fn(window.REFLECTYPE_STORAGE || window.localStorage); } catch (e) { return null; } }

  function genreById(id) { return CFG.genres.filter(function (g) { return g.id === id; })[0]; }

  /* ---------- home ---------- */
  $("today").textContent = longDate;
  var genresBox = $("genres");
  CFG.genres.forEach(function (g) {
    var a = document.createElement("a");
    a.className = "g sketch";
    a.href = "#/g/" + g.id;
    a.textContent = g.name;
    genresBox.appendChild(a);
  });

  /* ---------- views ---------- */
  function show(view) {
    document.body.dataset.view = view;
    ["home", "editor", "export"].forEach(function (v) { $(v).classList.toggle("on", v === view); });
    window.scrollTo(0, 0);
  }

  /* ---------- editor ---------- */
  function renderVideo(v) {
    var box = $("video");
    var generation = ++videoGeneration;
    if (nativeVideo) { nativeVideo.pause(); nativeVideo.removeAttribute("src"); nativeVideo.load(); }
    nativeVideo = null;
    $("video-status").textContent = "";
    $("video-credit").textContent = "";
    $("video-credit").hidden = true;
    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) {} }
    ytPlayer = null;
    ytReady = false;
    updateControls();
    setPlayIcon(false);
    box.className = "video";
    box.innerHTML = "";
    if (v.src) {
      box.classList.add("has-embed");
      var el = document.createElement("video");
      nativeVideo = el;
      el.id = "native-video";
      el.playsInline = true;
      el.preload = "metadata";
      el.poster = v.poster || "";
      el.setAttribute("aria-label", v.title);
      el.volume = +$("vc-vol").value / 100;
      el.addEventListener("loadedmetadata", updateControls);
      el.addEventListener("play", function () { setPlayIcon(true); });
      el.addEventListener("pause", function () { setPlayIcon(false); });
      el.addEventListener("ended", function () { setPlayIcon(false); });
      el.addEventListener("error", function () {
        updateControls();
        $("video-status").textContent = "Video couldn't load. Reload to try again.";
      });
      var primary = document.createElement("source"); primary.src = v.src; primary.type = /\.mp4(\?|#|$)/i.test(v.src) ? "video/mp4" : "video/webm"; el.appendChild(primary);
      if (v.fallbackSrc) { var fallback = document.createElement("source"); fallback.src = v.fallbackSrc; fallback.type = "video/mp4"; el.appendChild(fallback); }
      box.appendChild(el);
      if (v.credit) {
        var credit = $("video-credit");
        credit.hidden = false;
        credit.appendChild(document.createTextNode(v.credit + " "));
        var link = document.createElement("a");
        link.href = v.source; link.target = "_blank"; link.rel = "noopener";
        link.textContent = "Source & credits"; credit.appendChild(link);
        credit.appendChild(document.createTextNode(" · "));
        var rights = document.createElement("a");
        rights.href = v.licenseUrl; rights.target = "_blank"; rights.rel = "noopener";
        rights.textContent = "Reuse terms"; credit.appendChild(rights);
      }
      updateControls();
      return;
    }
    if (v.youtubeId) {
      box.classList.add("has-embed");
      var f = document.createElement("iframe");
      f.id = "ytframe";
      var origin = location.protocol.indexOf("http") === 0 ? "&origin=" + encodeURIComponent(location.origin) : "";
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(v.youtubeId) + "?enablejsapi=1&rel=0&playsinline=1" + origin;
      f.title = v.title;
      f.allow = "autoplay; encrypted-media; picture-in-picture";
      f.allowFullscreen = true;
      f.loading = "lazy";
      box.appendChild(f);
      ensureYT(function () {
        if (generation !== videoGeneration) return;
        ytPlayer = new YT.Player("ytframe", { events: {
          onReady: function () { ytReady = true; ytPlayer.setVolume(+$("vc-vol").value); updateControls(); },
          onStateChange: function (e) { setPlayIcon(e.data === YT.PlayerState.PLAYING); }
        } });
      });
      return;
    }
    box.innerHTML = '<div class="play"><i></i></div><div>Video placeholder</div><div class="vnote">Real videos arrive in a later version.</div>';
  }

  /* ---------- video controls (YouTube IFrame API) ---------- */
  var nativeVideo = null, videoGeneration = 0;
  var ytPlayer = null, ytReady = false, ytApiLoading = false, ytApiQueue = [];
  window.onYouTubeIframeAPIReady = function () {
    ytApiQueue.forEach(function (cb) { cb(); });
    ytApiQueue = [];
  };
  function ensureYT(cb) {
    if (window.YT && window.YT.Player) return cb();
    ytApiQueue.push(cb);
    if (ytApiLoading) return;
    ytApiLoading = true;
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  }
  function updateControls() {
    var off = nativeVideo ? nativeVideo.readyState < 1 || !!nativeVideo.error : !ytReady;
    ["vc-back", "vc-play", "vc-fwd", "vc-vol"].forEach(function (id) { $(id).disabled = off; });
  }
  function setPlayIcon(playing) {
    $("vc-play-icon").setAttribute("d", playing ? "M7.5 5.5h3.4v13H7.5zM13.1 5.5h3.4v13h-3.4z" : "M8 5.5v13l10.5-6.5z");
    $("vc-play").setAttribute("aria-label", playing ? "Pause" : "Play");
    $("vc-play").title = playing ? "Pause" : "Play";
  }
  function seek(delta) {
    if (nativeVideo && nativeVideo.readyState >= 1) {
      nativeVideo.currentTime = Math.max(0, Math.min(nativeVideo.duration, nativeVideo.currentTime + delta));
    } else if (ytReady) ytPlayer.seekTo(Math.max(0, ytPlayer.getCurrentTime() + delta), true);
  }
  $("vc-back").addEventListener("click", function () { seek(-5); });
  $("vc-fwd").addEventListener("click", function () { seek(5); });
  $("vc-play").addEventListener("click", function () {
    if (nativeVideo) {
      if (nativeVideo.paused) {
        nativeVideo.play().catch(function () { $("video-status").textContent = "Playback didn't start. Tap Play to try again."; });
      } else nativeVideo.pause();
      return;
    }
    if (!ytReady) return;
    if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
  });
  $("vc-vol").addEventListener("input", function () {
    if (nativeVideo) { nativeVideo.muted = false; nativeVideo.volume = +this.value / 100; return; }
    if (!ytReady) return;
    ytPlayer.unMute(); ytPlayer.setVolume(+this.value);
  });
  updateControls();

  var saveTimer = null;
  function saveNow() {
    if (!current) return;
    store(function (s) { s.setItem(C.draftKey(today, current.genre.id), $("ta").value); });
  }
  function updateCount() {
    var n = C.wordCount($("ta").value);
    $("count").textContent = n + (n === 1 ? " word" : " words");
  }

  function openEditor(genreId) {
    var g = genreById(genreId);
    if (!g) { location.hash = "#/"; return; }
    var v = C.pickVideo(g.videos, today);
    current = { genre: g, video: v };
    $("e-genre").textContent = g.name;
    $("e-title").textContent = v.title;
    $("n-genre").textContent = g.name;
    $("n-title").textContent = v.title;
    $("n-date").textContent = shortDate;
    $("export-link").href = "#/g/" + g.id + "/export";
    $("export-link-2").href = "#/g/" + g.id + "/export";
    document.title = v.title + " - reflectype";
    renderVideo(v);
    var draft = store(function (s) { return s.getItem(C.draftKey(today, g.id)); });
    $("ta").value = draft || "";
    updateCount();
    show("editor");
    if (!window.matchMedia("(max-width:760px)").matches) $("ta").focus({ preventScroll: true });
  }

  var ta = $("ta");
  ta.addEventListener("input", function () {
    updateCount();
    clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400);
  });
  // Paste is turned off to nudge people to write in their own words. Typing is always accepted.
  ["paste", "drop"].forEach(function (ev) { ta.addEventListener(ev, function (e) { e.preventDefault(); }); });
  ta.addEventListener("beforeinput", function (e) {
    if (e.inputType === "insertFromPaste" || e.inputType === "insertFromDrop" || e.inputType === "insertFromPasteAsQuotation") e.preventDefault();
  });
  window.addEventListener("pagehide", saveNow);

  /* ---------- export ---------- */
  function currentText() { return store(function (s) { return s.getItem(C.draftKey(today, current.genre.id)); }) || ""; }

  function wrap(ctx, text, maxW) {
    var words = text.split(" "), lines = [], line = "";
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }

  // Share card (1280x720): white top, grey footer band, video thumbnail on the right.
  var thumbCache = {};
  function loadThumb(id, cb, poster) {
    var key = poster || id;
    var c = thumbCache[key];
    if (c) { if (c.done) cb(c.img); else c.waiters.push(cb); return; }
    c = thumbCache[key] = { img: null, done: false, waiters: [cb] };
    function finish(img) { c.img = img; c.done = true; c.waiters.splice(0).forEach(function (f) { f(img); }); }
    function tryLoad(name, next) {
      var im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = function () { finish(im); };
      im.onerror = next;
      im.src = "https://i.ytimg.com/vi/" + encodeURIComponent(id) + "/" + name + ".jpg";
    }
    if (poster) {
      var im = new Image(); im.crossOrigin = "anonymous";
      im.onload = function () { finish(im); };
      im.onerror = function () { finish(null); };
      im.src = poster; return;
    }
    tryLoad("maxresdefault", function () { tryLoad("hqdefault", function () { finish(null); }); });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function cardDate() {
    var d = new Date();
    return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
  }

  function drawCard() {
    var cv = $("card"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    var video = current.video, genre = current.genre;
    var serif = '"Times New Roman", Times, "Liberation Serif", Georgia, serif';
    var ink = "#444444";
    var box = { x: 401, y: 40, w: 846, h: 503 };
    function paint(img) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#c8c5bf"; ctx.fillRect(0, 480, W, H - 480);
      ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.fillStyle = ink;
      ctx.font = "72px " + serif; ctx.fillText("reflectype", 33, 100);
      ctx.font = "40px " + serif; ctx.fillText(cardDate(), 33, 186);
      ctx.fillStyle = ink; ctx.fillRect(33, 225, 343, 2);
      ctx.font = "40px " + serif; ctx.fillText(genre.name, 33, 300);
      var size = 40, lines;
      for (; size >= 26; size -= 2) {
        ctx.font = size + "px " + serif;
        lines = wrap(ctx, video.title, 343);
        if (lines.length * (size + 12) <= 150) break;
      }
      var y = 370;
      lines.slice(0, 4).forEach(function (l) { ctx.fillText(l, 33, y); y += size + 12; });
      ctx.save();
      roundRect(ctx, box.x, box.y, box.w, box.h, 40); ctx.clip();
      ctx.fillStyle = "#000000"; ctx.fillRect(box.x, box.y, box.w, box.h);
      if (img) {
        var sc = Math.max(box.w / img.width, box.h / img.height);
        var dw = img.width * sc, dh = img.height * sc;
        ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
      }
      ctx.restore();
      ctx.fillStyle = ink; ctx.textAlign = "center";
      ctx.font = "46px " + serif;
      ctx.fillText("Head over to reflectype to create your own reflections!", W / 2, 650);
      ctx.textAlign = "left";
    }
    var token = (drawCard.token = (drawCard.token || 0) + 1);
    paint(null);
    cv._ready = !(video.youtubeId || video.poster);
    if (video.youtubeId || video.poster) {
      loadThumb(video.youtubeId, function (img) {
        if (token === drawCard.token) { paint(img); }
        if (token === drawCard.token) cv._ready = true;
        var q = cv._waiting; cv._waiting = null; if (q) q();
      }, video.poster);
    }
  }

  // The press: printer feeds the card up out of its slot, then the page.
  // Timings mirror the CSS animation delays/durations in style.css (v12).
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PRINT = { pageGo: 350, pagePrintEnd: 2150, cardGo: 4050, cardPrintEnd: 5850, bye: 7800, settle: 9000 };
  var pressTimers = [];

  // The printed page shows only the opening of the reflection; Copy copies it all.
  function previewText(t) {
    var lim = 260;
    if (t.length <= lim) return t;
    var cut = t.slice(0, lim), sp = cut.lastIndexOf(" ");
    if (sp > 120) cut = cut.slice(0, sp);
    return cut.replace(/\s+$/, "") + " \u2026";
  }

  function runPress() {
    var section = $("export");
    section.classList.remove("go");
    section.classList.remove("done");
    pressTimers.forEach(clearTimeout); pressTimers = [];
    var printer = $("printer"), cap = $("pcap");
    printer.classList.remove("printing");
    printer.style.display = "";
    cap.textContent = "";
    if (reducedMotion) return;
    // Measure after layout: each output starts centred on the printer slot,
    // scaled down, its bottom edge just inside the slot, then rises by --rise.
    // The printer must be visible again before measuring: a hidden slot
    // measures as 0,0 and the outputs fly in from the corner of the screen.
    requestAnimationFrame(function () {
      var slot = $("pslot").getBoundingClientRect();
      var sx = slot.left + slot.width / 2, sy = slot.top + slot.height / 2;
      ["out-card", "out-page"].forEach(function (id) {
        var el = $(id), r = el.getBoundingClientRect();
        var h = r.height * 0.22;
        el.style.setProperty("--sx", (slot.width ? Math.round(sx - (r.left + r.width / 2)) : 0) + "px");
        el.style.setProperty("--sy", (slot.width ? Math.round(sy + h / 2 - (r.top + r.height / 2)) : 0) + "px");
        el.style.setProperty("--rise", Math.round(h) + "px");
      });
      section.classList.add("go");
      function later(ms, fn) { pressTimers.push(setTimeout(fn, ms)); }
      later(PRINT.pageGo, function () { printer.classList.add("printing"); cap.textContent = "printing your page\u2026"; });
      later(PRINT.pagePrintEnd, function () { printer.classList.remove("printing"); cap.textContent = ""; });
      later(PRINT.cardGo, function () { printer.classList.add("printing"); cap.textContent = "printing your card\u2026"; });
      later(PRINT.cardPrintEnd, function () { printer.classList.remove("printing"); cap.textContent = ""; });
      later(PRINT.bye, function () { printer.style.display = "none"; });
      // Clear the animation once settled so the final page and card
      // re-rasterise at full sharpness instead of keeping a scaled layer.
      later(PRINT.settle, function () { section.classList.remove("go"); section.classList.add("done"); });
    });
  }

  function openExport(genreId) {
    openEditor(genreId);               // loads current + draft
    var text = currentText();
    var st = $("sheet-text");
    if (!C.wordCount(text)) {
      st.textContent = "Write your reflection first, then come back to export.";
      st.classList.add("empty");
      $("copy").disabled = true;
    } else {
      st.textContent = previewText(text.replace(/\s+$/, ""));
      st.classList.remove("empty");
      $("copy").disabled = false;
    }
    $("sheet-tags").textContent = (current.video.tags || []).map(C.cleanTag).filter(Boolean).slice(0, 5).join(" ");
    $("sheet-handle").textContent = CFG.brandHandle;
    $("back-writing").href = "#/g/" + current.genre.id;
    $("toast").textContent = "";
    drawCard();
    show("export");
    runPress();
  }

  // A brief tactile response acknowledges the click, not the action's outcome.
  // No persistent transform or success label is left behind.
  function buttonPress(button) {
    if (!button.animate) return;
    if (button._pressFeedback) button._pressFeedback.cancel();
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var frames = reduced
      ? [{ opacity: 1 }, { opacity: 0.65, offset: 0.35 }, { opacity: 1 }]
      : [{ transform: "translateY(0)" },
         { transform: "translateY(2px)", offset: 0.35 },
         { transform: "translateY(0)" }];
    button._pressFeedback = button.animate(frames, {
      duration: reduced ? 180 : 280,
      easing: "ease-out"
    });
  }

  $("copy").addEventListener("click", function () {
    buttonPress(this);
    var txt = C.formatShareText(currentText(), current.video.tags, CFG.brandHandle);
    function done(ok) { $("toast").textContent = ok ? "" : "Couldn't copy. Select the text on the page and copy it."; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { fallback(); });
    else fallback();
    function fallback() {
      var t = document.createElement("textarea"); t.value = txt; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(t); done(ok);
    }
  });

  $("dl").addEventListener("click", function () {
    buttonPress(this);
    var cvs = $("card");
    if (!cvs._ready) { cvs._waiting = function () { $("dl").click(); }; return; }
    cvs.toBlob(function (b) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "reflectype-" + current.genre.id + "-" + today + ".png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  });

  /* ---------- routing ---------- */
  function route() {
    var m = (location.hash || "#/").match(/^#\/g\/([a-z]+)(\/export)?$/);
    document.title = "reflectype";
    if (!m) { if (nativeVideo) nativeVideo.pause(); if (ytReady) ytPlayer.pauseVideo(); show("home"); return; }
    if (m[2]) openExport(m[1]); else openEditor(m[1]);
  }
  window.addEventListener("hashchange", route);
  route();
})();
