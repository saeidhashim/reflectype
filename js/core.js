/* Pure helpers. Works in the browser (window.ReflectypeCore) and in Node (tests). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ReflectypeCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Local calendar date as YYYY-MM-DD.
  function dateKey(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  // Days since 1970-01-01 for a YYYY-MM-DD key (timezone independent).
  function dayNumber(key) {
    var p = key.split("-").map(Number);
    return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
  }

  // One video per genre per day: walk through the genre's list by date.
  function pickVideo(videos, key) {
    if (!videos || !videos.length) return null;
    var i = ((dayNumber(key) % videos.length) + videos.length) % videos.length;
    return videos[i];
  }

  function cleanTag(t) {
    t = String(t).replace(/^#+/, "").replace(/[^A-Za-z0-9_]/g, "");
    return t ? "#" + t : "";
  }

  // Layout: the user's text, a blank line, five hashtags, then the @handle.
  function formatShareText(text, tags, handle) {
    var body = String(text || "").replace(/\s+$/, "");
    var five = (tags || []).map(cleanTag).filter(Boolean).slice(0, 5).join(" ");
    var out = body + "\n\n" + five;
    if (handle) out += "\n" + handle;
    return out;
  }

  function wordCount(text) {
    var m = String(text || "").trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  function draftKey(key, genreId) {
    return "reflectype:draft:" + key + ":" + genreId;
  }

  // A day counts as reflected when its card/text was exported (one mark per day).
  function exportKey(key) {
    return "reflectype:export:" + key;
  }

  // Consecutive reflected days ending today; if today is not done yet, the run
  // ending yesterday still counts (the day is not over).
  function streak(storage) {
    var prefix = "reflectype:export:", days = {};
    try {
      for (var i = 0; i < storage.length; i++) {
        var k = storage.key(i);
        if (k && k.indexOf(prefix) === 0 && storage.getItem(k)) days[dayNumber(k.slice(prefix.length))] = true;
      }
    } catch (e) { return 0; }
    var today = dayNumber(dateKey());
    var start = days[today] ? today : today - 1;
    if (!days[start]) return 0;
    var n = 0;
    while (days[start - n]) n++;
    return n;
  }

  return { dateKey: dateKey, dayNumber: dayNumber, pickVideo: pickVideo, cleanTag: cleanTag,
           formatShareText: formatShareText, wordCount: wordCount, draftKey: draftKey,
           exportKey: exportKey, streak: streak };
});
