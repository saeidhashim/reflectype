const assert = require("assert");
const C = require("../js/core.js");

assert.strictEqual(C.dateKey(new Date(2026, 10, 9)), "2026-11-09");

// Same day -> same video; next day -> next video; wraps around.
const vids = ["a", "b", "c"];
assert.strictEqual(C.pickVideo(vids, "2026-11-09"), C.pickVideo(vids, "2026-11-09"));
const d0 = vids.indexOf(C.pickVideo(vids, "2026-11-09"));
assert.strictEqual(vids.indexOf(C.pickVideo(vids, "2026-11-10")), (d0 + 1) % 3);
assert.strictEqual(C.pickVideo([], "2026-11-09"), null);

// Share text layout: text, blank line, five hashtags, @handle.
const out = C.formatShareText("My take.\n\n", ["Tech", "#AI", "Inno vation", "Future", "Tech2", "Extra"], "@brand");
assert.strictEqual(out, "My take.\n\n#Tech #AI #Innovation #Future #Tech2\n@brand");
assert.strictEqual(out.split("\n")[1], "");
assert.strictEqual(out.split("\n")[2].split(" ").length, 5);

assert.strictEqual(C.wordCount("  one two\nthree "), 3);
assert.strictEqual(C.wordCount(""), 0);

// Every genre has exactly 5 usable tags and at least one video.
global.window = {};
require("../js/data.js");
const g = window.REFLECTYPE_CONFIG.genres;
assert.strictEqual(g.length, 12);
g.forEach(x => { assert.strictEqual(x.tags.map(C.cleanTag).filter(Boolean).length, 5, x.id); assert.ok(x.videos.length >= 1, x.id); });
console.log("core tests passed");
