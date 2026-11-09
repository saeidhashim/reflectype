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
    if (ytPlayer && ytPlayer.destroy) { try { ytPlayer.destroy(); } catch (e) {} }
    ytPlayer = null;
    ytReady = false;
    updateControls();
    setPlayIcon(false);
    box.className = "video";
    box.innerHTML = "";
    if (v.youtubeId) {
      box.classList.add("has-embed");
      var f = document.createElement("iframe");
      f.id = "ytframe";
      var origin = location.protocol.indexOf("http") === 0 ? "&origin=" + encodeURIComponent(location.origin) : "";
      f.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(v.youtubeId) + "?enablejsapi=1&rel=0" + origin;
      f.title = v.title;
      f.allow = "encrypted-media; picture-in-picture";
      f.allowFullscreen = true;
      f.loading = "lazy";
      box.appendChild(f);
      ensureYT(function () {
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
    var off = !ytReady;
    ["vc-back", "vc-play", "vc-fwd", "vc-vol"].forEach(function (id) { $(id).disabled = off; });
  }
  function setPlayIcon(playing) {
    $("vc-play-icon").setAttribute("d", playing ? "M7.5 5.5h3.4v13H7.5zM13.1 5.5h3.4v13h-3.4z" : "M8 5.5v13l10.5-6.5z");
    $("vc-play").setAttribute("aria-label", playing ? "Pause" : "Play");
    $("vc-play").title = playing ? "Pause" : "Play";
  }
  $("vc-back").addEventListener("click", function () { if (ytReady) ytPlayer.seekTo(Math.max(0, ytPlayer.getCurrentTime() - 5), true); });
  $("vc-fwd").addEventListener("click", function () { if (ytReady) ytPlayer.seekTo(ytPlayer.getCurrentTime() + 5, true); });
  $("vc-play").addEventListener("click", function () {
    if (!ytReady) return;
    if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) ytPlayer.pauseVideo(); else ytPlayer.playVideo();
  });
  $("vc-vol").addEventListener("input", function () {
    if (!ytReady) return;
    ytPlayer.unMute();
    ytPlayer.setVolume(+this.value);
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
    document.title = v.title + " - Reflectype";
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

  // Original artwork only: no frame or thumbnail from the video is used.
  function drawCard() {
    var cv = $("card"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height, g = current.genre;
    var grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "hsl(" + g.hue + ",18%,22%)");
    grad.addColorStop(1, "hsl(" + g.hue + ",14%,12%)");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = "#f4efe4"; ctx.lineWidth = 3;
    for (var x = -H; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
    ctx.restore();
    var serif = '"Noto Serif", Georgia, "Times New Roman", serif';
    ctx.font = "600 34px " + serif;
    var bw = ctx.measureText("Reflectype").width + 48;
    ctx.fillStyle = "#f4efe4"; ctx.fillRect(60, 56, bw, 62);
    ctx.fillStyle = "#1d1b18"; ctx.textBaseline = "middle";
    ctx.fillText("Reflectype", 84, 88);
    ctx.fillStyle = "#d9d3c5"; ctx.font = "26px " + serif; ctx.textBaseline = "alphabetic";
    ctx.fillText(g.name.toUpperCase(), 60, 392);
    ctx.fillStyle = "#f4efe4"; ctx.font = "600 62px " + serif;
    var lines = wrap(ctx, current.video.title, W - 120).slice(0, 3), y = 466;
    lines.forEach(function (l) { ctx.fillText(l, 60, y); y += 74; });
    ctx.fillStyle = "#a79f8e"; ctx.font = "26px " + serif; ctx.textAlign = "right";
    ctx.fillText(shortDate, W - 60, H - 40); ctx.textAlign = "left";
  }

  function openExport(genreId) {
    openEditor(genreId);               // loads current + draft
    var text = currentText();
    var box = $("copybox");
    if (!C.wordCount(text)) {
      box.textContent = "Write your reflection first, then come back to export.";
      box.classList.add("empty"); $("copy").disabled = true;
    } else {
      box.textContent = C.formatShareText(text, current.video.tags, CFG.brandHandle);
      box.classList.remove("empty"); $("copy").disabled = false;
    }
    $("back-writing").href = "#/g/" + current.genre.id;
    $("toast").textContent = "";
    drawCard();
    show("export");
  }

  $("copy").addEventListener("click", function () {
    var txt = $("copybox").textContent;
    function done(ok) { $("toast").textContent = ok ? "Copied. Paste it into your LinkedIn post." : "Couldn't copy. Select the text above and copy it."; }
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
    $("card").toBlob(function (b) {
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
    document.title = "Reflectype";
    if (!m) { show("home"); return; }
    if (m[2]) openExport(m[1]); else openEditor(m[1]);
  }
  window.addEventListener("hashchange", route);
  route();
})();
