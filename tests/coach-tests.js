/* Adonis coach and plan checks: "logged this, expect that".
   Run:  node tests/coach-tests.js
   Each check is a real situation a lifter hits. Add one whenever a tester finds a bug. */
"use strict";
const path = require("path");
const ROOT = path.join(__dirname, "..");
require(path.join(ROOT, "engine.js"));
require(path.join(ROOT, "coach.js"));
const E = globalThis.AdonisEngine, C = globalThis.AdonisCoach;

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) pass++; else { fail++; console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); }
}
// one past session: same weight on every set
const session = (w, reps, rx) => { const s = reps.map(r => ({ w, r, done: true })); s.rx = rx; return [s]; };
const sug = (name, w, reps, rx, today, opts) => C.suggest(name, session(w, reps, rx), today || rx, opts || {});

/* ---------- weight suggestions ---------- */
// hit the top of the range on every set → the weight goes up, for every kind of lift
for (const [name, w] of [["Barbell Bench Press", 135], ["Barbell Back Squat", 185], ["Dumbbell Lateral Raise", 10], ["Dumbbell Lateral Raise", 15],
  ["Dumbbell Lateral Raise", 20], ["Alternating Dumbbell Curl", 25], ["Lying Leg Curl", 15], ["Cable/Machine Fly", 20], ["Rope Pressdown", 30], ["Leg Press", 270]]) {
  const r = sug(name, w, [10, 10, 10], "10");
  check(`all sets at top reps → go up: ${name} ${w} lb`, r && r.w > w, r && r.text);
}
// same with a rep range
{ const r = sug("Cable/Machine Fly", 20, [12, 12, 12], "8-12"); check("top of 8-12 on every set → go up", r && r.w > 20, r && r.text); }
// one set short → hold the weight, and the message says to get every set there
{ const r = sug("Barbell Bench Press", 135, [10, 10, 9], "10");
  check("one set short → same weight", r && r.w === 135, r && r.text);
  check("one set short → says to get every set to the target", r && /every set/i.test(r.text), r && r.text); }
// well short → come down or hold, never go up
{ const r = sug("Barbell Bench Press", 135, [6, 5, 5], "10"); check("well short → not heavier", r && r.w <= 135, r && r.text); }
// a jump never exceeds ~10% on heavy lifts
{ const r = sug("Barbell Back Squat", 315, [10, 10, 10], "10"); check("heavy lift jump stays near 10%", r && r.w <= 315 * 1.1 + 10, r && r.text); }
// big relative jumps on light weights get a heads-up that fewer reps is fine
{ const r = sug("Dumbbell Lateral Raise", 15, [10, 10, 10], "10"); check("big jump → reps-may-drop note", r && /big jump/i.test(r.text), r && r.text); }
// pregnancy/postpartum: never pushed heavier without the option to stay
for (const mode of ["pregnant", "postpartum"]) {
  const r = sug("Leg Press", 100, [10, 10, 10], "10", "10", { mode });
  check(`${mode}: offers to stay at the same weight`, r && (r.w <= 100 || /or stay/i.test(r.text)), r && r.text);
}
// moving to fewer reps next week (10 → 8) → heavier
{ const r = sug("Barbell Bench Press", 135, [10, 10, 10], "10", "8"); check("10 reps → 8 reps next week: heavier", r && r.w > 135, r && r.text); }
// bodyweight: beat last time's best by one
{ const s = [[{ w: "", r: 12, done: true }, { w: "", r: 10, done: true }]]; const r = C.suggest("Push Up", s, "12", {});
  check("bodyweight → one more rep than best", r && r.r === 13, r && r.text); }

/* ---------- gym plans use gym equipment ---------- */
const HOME_ONLY = /Doorframe|Banded (Squat|Row|Curl|Chest|Overhead|Lat|Pressdown|Good Morning|Pallof|Lateral Raise|Leg Curl)|Wall (Push|Triceps|Sit)|Towel|Isometric Palm|Dumbbell Floor Press|Pike Push Up|Decline Push Up|Bodyweight Squat|Side-Lying/;
for (const experience of ["1", "2", "3"]) for (const days of ["3", "4", "5", "6"]) for (const time of ["45", "60"]) for (const goal of ["muscle", "strength", "fatloss", "general"]) {
  const a = { track: "lift", where: "gym", experience, days, time, goal, around: ["none"] };
  const p = E.generate(a), names = p.days.filter(d => !d.rest).flatMap(d => d.ex.map(x => x.n));
  const bad = names.filter(n => HOME_ONLY.test(n));
  check(`gym plan has no home-only moves (exp ${experience}, ${days}d, ${time}min, ${goal})`, !bad.length, bad.join(", "));
  if (experience !== "1") {
    const firsts = p.days.filter(d => !d.rest).map(d => d.ex[0] && d.ex[0].n);
    check(`gym plan past beginner has barbell main lifts (exp ${experience}, ${days}d, ${goal})`, firsts.some(n => /Barbell/.test(n)), firsts.join(", "));
  }
}

/* ---------- exercise demos ---------- */
require(path.join(ROOT, "demos.js"));
{ const D = globalThis.AdonisDemos;
  const names = [...new Set([...E.LIB.map(x => x.n), ...(E.FLIB || []).map(x => x.n)])];
  const NO_DEMO = /Kegel|Connection Breath|Pelvic Floor Warm-Up|Clamshell/;
  for (const n of names) {
    if (NO_DEMO.test(n)) continue;
    check(`demo exists: ${n}`, D.has(n));
    if (D.has(n)) for (const k of [0, 0.5, 1]) { const s = D.svg(n, k); check(`demo draws cleanly: ${n} @${k}`, s.length > 200 && !/NaN|undefined/.test(s), s.slice(0, 80)); }
  } }

/* ---------- release files ---------- */
{ const fs = require("fs");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  check("sw.js is not empty and has a cache VERSION", /const VERSION = "adonis-v\d+"/.test(sw) && /addEventListener\("fetch"/.test(sw));
  for (const f of ["index.html", "engine.js", "coach.js", "nutrition.js", "meals.js", "foods.js"])
    check(`${f} is not empty`, fs.statSync(path.join(ROOT, f)).size > 1000); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
