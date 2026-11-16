/* Checks videos.js: every listed exercise is a real exercise name and its file is in the videos folder.
   Run:  node tests/videos-check.js */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
require(path.join(ROOT, "engine.js"));
require(path.join(ROOT, "videos.js"));
require(path.join(ROOT, "demos.js"));
const E = globalThis.AdonisEngine, V = globalThis.AdonisVideos, D = globalThis.AdonisDemos;
let fail = 0;
for (const [name, file] of Object.entries(V)) {
  if (!E.BY_NAME[name]) { fail++; console.log(`FAIL  "${name}" isn't an exercise name in the library (check spelling and capitals)`); }
  if (!fs.existsSync(path.join(ROOT, "videos", file))) { fail++; console.log(`FAIL  ${name}: videos/${file} is missing`); }
  if (D.video(name) !== "videos/" + file) { fail++; console.log(`FAIL  ${name}: demos.js doesn't pick up the clip`); }
}
const n = Object.keys(V).length, total = Object.keys(E.BY_NAME).length;
console.log(`${fail ? "" : "OK  "}${n} of ${total} exercises have a filmed clip; the rest use the drawing.${fail ? ` ${fail} problem(s).` : ""}`);
process.exit(fail ? 1 : 0);
