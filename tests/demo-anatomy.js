/* Anatomy checks for the drawn exercise demos: every joint bends the way a real one can, at every point in the rep.
   Run:  node tests/demo-anatomy.js
   Side view figures face right (lying on your back = head on the left; face down = head on the right), unless the
   template sets mir (face down with the head on the left), which swaps front and back. */
"use strict";
const path = require("path");
const ROOT = path.join(__dirname, "..");
let reach = 0;
globalThis.__adonisReach = d => { reach = Math.max(reach, d); };
require(path.join(ROOT, "engine.js"));
require(path.join(ROOT, "demos.js"));
const E = globalThis.AdonisEngine, D = globalThis.AdonisDemos;

const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
const wrap = x => ((x + 180) % 360 + 360) % 360 - 180;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], cross = (u, v) => u[0] * v[1] - u[1] * v[0], dot = (u, v) => u[0] * v[0] + u[1] * v[1];
const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const between = (o, a, b) => { const u = sub(a, o), v = sub(b, o); return Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (Math.hypot(...u) * Math.hypot(...v))))) * 180 / Math.PI; };

let pass = 0, fail = 0;
const problems = {};
function bad(name, msg) { (problems[name] = problems[name] || new Set()).add(msg); }

for (const name of Object.keys(E.BY_NAME).sort()) {
  if (!D.demoFor(name)) continue;
  for (let i = 0; i <= 40; i++) {
    const k = i / 40; reach = 0;
    const P = D.pose(name, k); if (!P) break;           // drawn from above (pallof, cable fly): no joints to check
    const J = P.J;
    if (reach > 1.5) bad(name, "a hand or foot can't reach its target, so the limb comes off it");
    if (P.view === "side") {
      const sg = J.mir ? -1 : 1, torsoDown = ang(J.sh, J.hip);
      for (const [h, kn, an, toe, leg] of [[J.hip, J.knee, J.ankle, J.toe, "near"], [J.hip, J.knee2, J.ankle2, J.toe2, "far"]]) {
        const knee = sg * wrap(ang(kn, an) - ang(h, kn));                     // + = flexed (heel toward the glutes)
        if (knee < -6) bad(name, `${leg} knee bends backward`);
        if (knee > 165) bad(name, `${leg} knee folds past what a knee can`);
        const hip = sg * wrap(torsoDown - ang(h, kn));                         // + = thigh forward of the body
        if (hip < -40) bad(name, `${leg} thigh swings too far behind the body`);
        if (hip > 150) bad(name, `${leg} thigh folds past the torso`);
        const side = sg * cross(sub(kn, an), sub(toe, an)), a = between(an, kn, toe);
        if (side < 0 && a > 8 && a < 172) bad(name, `${leg} foot points backward`);
        else if (a < 45) bad(name, `${leg} ankle bends further than an ankle can`);
      }
      for (const [s, e, h, arm] of [[J.sh, J.elbow, J.hand, "near"], [J.sh, J.elbow2, J.hand2, "far"]]) {
        // only arms seen truly side-on: a foreshortened arm (pointing toward you) or a tight fold can't be judged from the side
        if (len(s, e) < 25 || len(e, h) < 23 || len(s, h) < 16) continue;
        if (-sg * wrap(ang(e, h) - ang(s, e)) < -10) bad(name, `${arm} elbow bends backward`);
      }
      for (const key of ["ankle", "ankle2", "toe", "toe2", "knee", "knee2", "hand", "hand2", "head", "hip", "sh"]) if (J[key][1] > 141) bad(name, `${key} goes through the floor`);
    } else if (!P.d.A.kL) {                              // knees placed directly (seated, thighs toward you) are skipped
      const lat = sub(J.hipL, J.hipR);
      for (const [h, kn, an, sgn, leg] of [[J.hipL, J.knL, J.anL, 1, "left"], [J.hipR, J.knR, J.anR, -1, "right"]]) {
        const axis = sub(an, h), off = sub(kn, h), l2 = dot(axis, axis) || 1;
        const out = (dot(off, lat) - dot(axis, lat) * dot(off, axis) / l2) * sgn;
        if (out < -3) bad(name, `${leg} knee caves inward`);
      }
    }
  }
  if (problems[name]) fail++; else pass++;
}
for (const [n, set] of Object.entries(problems)) console.log(`FAIL  ${n}\n      ${[...set].join("\n      ")}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
