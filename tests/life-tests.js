/* Adonis life-aware planning checks: sick days, trips, weekly consistency, goal forecast.
   Run:  node tests/life-tests.js */
"use strict";
const path = require("path");
const ROOT = path.join(__dirname, "..");
require(path.join(ROOT, "engine.js"));
require(path.join(ROOT, "life.js"));
const E = globalThis.AdonisEngine, L = globalThis.AdonisLife;

let pass = 0, fail = 0;
function check(name, ok, detail) { if (ok) pass++; else { fail++; console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); } }
const sick = (dates, lvl, extra) => { const o = {}; dates.forEach(d => { o[d] = { sick: lvl || "rest" }; }); return Object.assign(o, extra || {}); };
const did = days => d => !!(days[d] && days[d].complete);

/* ---------- sick runs and pausing ---------- */
{ const days = sick(["2026-12-01", "2026-12-02", "2026-12-05"]);
  const runs = L.sickRuns(days);
  check("two runs found", runs.length === 2 && runs[0].len === 2 && runs[1].len === 1, JSON.stringify(runs));
  check("1-2 sick days never pause the plan", L.pausedDates(days).size === 0); }
{ const days = sick(["2026-12-01", "2026-12-02", "2026-12-03"]);
  const p = L.pausedDates(days, did(days));
  check("3 sick days in a row pause all 3 days", p.size === 3);
  check("plan resumes where you left off: 3 days shifted", L.pausedBefore(p, "2026-11-30", "2026-12-04") === 3);
  check("paused days before the plan start don't count", L.pausedBefore(p, "2026-12-02", "2026-12-10") === 2); }
{ const days = sick(["2026-12-01", "2026-12-02", "2026-12-03"]); days["2026-12-02"].complete = true;
  check("a sick day you trained on isn't paused", L.pausedDates(days, did(days)).size === 2); }

/* ---------- return ramp ---------- */
{ const days = sick(["2026-12-01", "2026-12-02"]);
  check("after 1-2 sick days: full sets", L.setFactor(days, "2026-12-03", did(days)) === 1); }
{ const days = sick(["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"]);
  check("after 3-6 days: first session back is lighter", L.setFactor(days, "2026-12-05", did(days)) === 0.7);
  days["2026-12-05"] = { complete: true };
  check("after 3-6 days: second session back is full", L.setFactor(days, "2026-12-06", did(days)) === 1); }
{ const days = sick(["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05", "2026-12-06", "2026-12-07"]);
  check("after 7+ days: first session ~60%", L.setFactor(days, "2026-12-08", did(days)) === 0.6);
  days["2026-12-08"] = { complete: true };
  check("after 7+ days: second session ~80%", L.setFactor(days, "2026-12-09", did(days)) === 0.8);
  days["2026-12-09"] = { complete: true };
  check("after 7+ days: third session full", L.setFactor(days, "2026-12-10", did(days)) === 1);
  check("ramp expires after 3 weeks", L.setFactor(sick(["2026-12-01", "2026-12-02", "2026-12-03"]), "2026-12-30") === 1); }
check("mild sick day: optional lighter session", L.setFactor(sick(["2026-12-01"], "mild"), "2026-12-01") === 0.6);
check("rest sick day: no sets", L.setFactor(sick(["2026-12-01"]), "2026-12-01") === 0);
check("sets scale but never drop below 1", L.scaleSets(4, 0.7) === 3 && L.scaleSets(2, 0.6) === 1 && L.scaleSets(3, 1) === 3);

/* ---------- trips ---------- */
check("full gym maps to every token", L.tripEq(["gym"]).length === 9);
check("dumbbells full set maps to db + dbh", ["db", "dbh"].every(t => L.tripEq(["db_full"]).includes(t)));
check("bodyweight only maps to nothing", L.tripEq(["none"]).length === 0);
{ const trips = [{ place: "Denver", from: "2026-12-03", to: "2026-12-06", eq: [] }];
  check("trip found on its days", L.tripOn(trips, "2026-12-03") && L.tripOn(trips, "2026-12-06") && !L.tripOn(trips, "2026-12-07")); }
{ const p = L.places([{ place: "Marriott ", from: "2026-01-01", picks: ["band"] }, { place: "marriott", from: "2026-03-01", picks: ["db_light"] }, { place: "In-laws", from: "2026-02-01", picks: [] }]);
  check("saved places dedupe by name and keep the latest equipment", p.length === 2 && p.find(x => /marriott/i.test(x.place)).picks[0] === "db_light"); }

// every exercise in real gym plans → swaps that fit each travel setup, never repeat in a day, never break the plan's rules
const SETUPS = { bodyweight: [], bands: ["band"], hotel: ["db", "bench", "cab"], dumbbells: ["db", "dbh", "bench"] };
const ANSWERS = [
  { track: "lift", goal: "muscle", experience: "3", days: "5", time: "60", where: "gym", around: [], emphasis: "none" },
  { track: "lift", goal: "strength", experience: "2", days: "4", time: "45", where: "gym", around: ["knees", "lowback"], emphasis: "none" },
  { track: "lift", goal: "muscle", experience: "1", days: "3", time: "45", where: "gym", around: ["shoulders"], emphasis: "upper" },
];
let swapped = 0, unmatched = 0, unmatchedGear = [];
ANSWERS.forEach((a, ai) => {
  let plan; try { plan = E.generate(a); } catch (e) { check(`plan ${ai} builds`, false, e.message); return; }
  Object.entries(SETUPS).forEach(([label, eq]) => {
    plan.days.forEach((d, di) => {
      if (d.rest) return;
      const m = L.tripSwaps(d.ex, { eq }, plan.ctx, E);
      const finalNames = d.ex.filter(e => e.type !== "cardio" && e.type !== "circuit").map(e => (e.n in m ? m[e.n] : e.n)).filter(Boolean);
      check(`plan ${ai} day ${di + 1} on ${label}: no repeats`, new Set(finalNames).size === finalNames.length, finalNames.join(", "));
      Object.entries(m).forEach(([from, to]) => {
        if (!to) { unmatched++; if (label !== "bodyweight") unmatchedGear.push(`${from} on ${label}`); return; }
        swapped++;
        const x = E.BY_NAME[to];
        check(`${from} → ${to} fits ${label}`, x.eq.every(t => eq.includes(t)), x.eq.join());
        check(`${from} → ${to} keeps the plan's rules`, !x.f.some(f => plan.ctx.block.includes(f)), x.f.join());
      });
      d.ex.forEach(e => { if (e.type === "cardio" || e.type === "circuit" || e.n in m) return;
        const x = E.BY_NAME[e.n]; if (x) check(`${e.n} kept on ${label} only if it fits`, x.eq.every(t => eq.includes(t))); });
    });
  });
});
check("travel swaps actually happen", swapped > 50, `swapped ${swapped}`);
check("with any equipment at all, every exercise finds a travel swap", !unmatchedGear.length, unmatchedGear.join("; "));
check("even bodyweight-only finds a swap for most exercises", unmatched <= (swapped + unmatched) * 0.1, `unmatched ${unmatched} of ${swapped + unmatched}`);
check("barbell bench on dumbbells → a dumbbell press", /Dumbbell/.test(E.fitTo("Barbell Bench Press", { eq: ["db", "dbh", "bench"] })), E.fitTo("Barbell Bench Press", { eq: ["db", "dbh", "bench"] }));
check("lat pulldown with bands → banded pulldown", E.fitTo("Lat Pulldown", { eq: ["band"] }) === "Banded Lat Pulldown");
check("cable fly with bands → banded fly, not a bodyweight hold", E.fitTo("Cable/Machine Fly", { eq: ["band", "db"] }) === "Banded Chest Fly", E.fitTo("Cable/Machine Fly", { eq: ["band", "db"] }));
check("an exercise that fits stays", E.fitTo("Push Up", { eq: [] }) === "Push Up");

/* ---------- weekly consistency ---------- */
const wk = (planned, done, current) => ({ planned, done, current: !!current });
check("4 of 5 counts", L.consistency([wk(5, 4)]).weeks === 1);
check("3 of 5 doesn't count", L.consistency([wk(5, 3)]).weeks === 0);
check("3 of 4 counts (80% rounded)", L.consistency([wk(4, 3)]).weeks === 1);
check("one missed day no longer resets the run", L.consistency([wk(5, 5), wk(5, 4), wk(5, 4)]).weeks === 3);
check("unfinished current week isn't a miss", L.consistency([wk(5, 5), wk(5, 5), wk(5, 1, true)]).weeks === 2);
check("current week counts once it's met", L.consistency([wk(5, 5), wk(5, 4, true)]).weeks === 2);
check("a whole sick week (nothing planned) is neutral", L.consistency([wk(5, 5), wk(0, 0), wk(5, 5)]).weeks === 2);
{ const r = L.consistency([wk(5, 5), wk(5, 5), wk(5, 1), wk(5, 5)]);
  check("grace week keeps the run going", r.weeks === 3, JSON.stringify(r)); }
{ const r = L.consistency([wk(5, 5), wk(5, 1), wk(5, 5), wk(5, 1), wk(5, 5)]);
  check("only one grace week per 8 weeks", r.weeks === 1, JSON.stringify(r)); }
{ const w = [wk(5, 5), wk(5, 1)]; for (let i = 0; i < 8; i++) w.push(wk(5, 5)); w.push(wk(5, 1)); w.push(wk(5, 5));
  const r = L.consistency(w);
  check("grace comes back after 8 weeks", r.weeks === 10, JSON.stringify(r)); }
check("no grace before the run starts", L.consistency([wk(5, 1), wk(5, 5)]).weeks === 1);

/* ---------- forecast ---------- */
const T = "2026-11-24";
const fc = o => L.forecast({ today: T, ...o });
check("no goal → none", fc({ weight: 170 }).status === "none");
check("no trend yet → data", fc({ weight: 170, goalWeight: 165 }).status === "data");
check("at goal → reached", fc({ weight: 165.4, weightRate: -0.5, goalWeight: 165 }).status === "reached");
{ const f = fc({ weight: 170, weightRate: -0.5, goalWeight: 165, goalDate: "2027-01-26" });
  check("10 lb... 5 lb at 0.5/wk = 10 weeks → on pace for a date 9 weeks out", f.status === "onpace", JSON.stringify(f)); }
{ const f = fc({ weight: 170, weightRate: -0.5, goalWeight: 165, goalDate: "2027-05-31" });
  check("well ahead → ahead", f.status === "ahead"); }
{ const f = fc({ weight: 170, weightRate: -0.25, goalWeight: 165, goalDate: "2026-12-31" });
  check("slow → later with weeks off", f.status === "later" && f.offWeeks > 1, JSON.stringify(f)); }
{ const f = fc({ weight: 170, weightRate: -0.5, goalWeight: 165, bf: 20, bfRate: -0.1, goalBf: 15, goalDate: "2027-05-31" });
  check("both goals: finish is when the slower one lands", f.finish === f.parts.find(p => p.k === "bf").finish, JSON.stringify(f)); }
{ const f = fc({ weight: 170, weightRate: 0, goalWeight: 165, bf: 20, bfRate: -0.2, goalBf: 15 });
  const t = L.forecastText(f, { fmt: d => d, goals: "165 lb and 15%" });
  check("weight flat but body fat dropping → recomp message", f.status === "steady" && /recomp/.test(t), t); }
{ const fmt = d => d, statuses = [
    fc({ weight: 170, weightRate: -0.25, goalWeight: 165, goalDate: "2026-12-31" }),
    fc({ weight: 170, weightRate: 0.3, goalWeight: 165 }),
    fc({ weight: 170, weightRate: -0.5, goalWeight: 165, goalDate: "2027-01-26" }) ];
  statuses.forEach(f => { const t = L.forecastText(f, { fmt, goals: "165 lb", goalDate: "2026-12-31", recentSick: true });
    check(`forecast text is encouraging (${f.status})`, t && !/behind|fail|missed|off track/i.test(t), t);
    check(`forecast text mentions sick days when relevant (${f.status})`, /sick days/.test(t), t); }); }

/* ---------- reality check ---------- */
{ const r = L.reality({ today: T, weight: 173, bf: 22, goalWeight: 175, goalBf: 15, goalDate: "2027-05-31", level: 3 });
  check("173 @ 22% → 175 @ 15% in 6 months is flagged ambitious", r && !r.ok && r.leanGain === 14 && r.fatLoss === 12, JSON.stringify(r));
  check("ambitious goal gets a later suggested date", r.suggest > "2027-05-31", r.suggest); }
{ const r = L.reality({ today: T, weight: 173, bf: 22, goalWeight: 165, goalBf: 18, goalDate: "2027-05-31", level: 2 });
  check("a modest cut by May is realistic", r && r.ok, JSON.stringify(r)); }
check("no date → no reality check", L.reality({ today: T, weight: 173, goalWeight: 165 }) === null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
