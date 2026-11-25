/* Superset rules for generated plans.
   Run: node tests/superset-tests.js */
"use strict";
const path = require("path");
require(path.join(__dirname, "..", "engine.js"));
const E = globalThis.AdonisEngine;
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; if (fail < 25) console.log("FAIL", msg); } };
const homes = { gym: { where: "gym" }, homefull: { where: "home", home: ["db_full", "bench", "pu", "band"] }, homelight: { where: "home", home: ["db_light", "band"] }, bw: { where: "home", home: ["none"] } };
const NEVER = new Set(["squat", "hinge", "lunge", "cond", "pf", "pfwarm"]);
const MAX = { strength: 1, muscle: 2, general: 2, fatloss: 3 };
let paired = 0;
const check = (a, tag) => {
  const p = E.generate(a);
  p.days.filter(d => !d.rest && d.ex).forEach(d => {
    const ex = d.ex;
    const nA = ex.filter(e => e.pair === "a").length;
    paired += nA;
    if (p.mode === "pregnant" || p.mode === "postpartum") ok(nA === 0, `${tag} ${d.name}: supersets during pregnancy/postpartum`);
    ok(nA <= (+a.experience <= 1 ? 1 : MAX[a.goal]), `${tag} ${d.name}: ${nA} supersets`);
    ex.forEach((e, i) => {
      if (!e.pair) return;
      const x = E.BY_NAME[e.n];
      ok(i >= 2, `${tag} ${d.name}: a main lift (${e.n}) is in a superset`);
      ok(!NEVER.has(x.p), `${tag} ${d.name}: ${e.n} (${x.p}) shouldn't be supersetted`);
      ok(!(x.eq.includes("bb") && x.d >= 4), `${tag} ${d.name}: heavy barbell ${e.n} in a superset`);
      if (a.goal === "strength") ok(!x.c, `${tag} ${d.name}: strength plan supersets compound ${e.n}`);
      if (e.pair === "a") ok(ex[i + 1] && ex[i + 1].pair === "b", `${tag} ${d.name}: ${e.n} has no partner`);
      if (e.pair === "b") ok(ex[i - 1] && ex[i - 1].pair === "a", `${tag} ${d.name}: ${e.n} has no partner`);
      ok(/Superset/.test(e.note), `${tag} ${d.name}: ${e.n} missing superset note`);
    });
    ex.forEach(e => { if (!e.pair) ok(!/Superset/.test(e.note || ""), `${tag} ${d.name}: ${e.n} has a stray superset note`); });
  });
  ok(E.audit(p).length === 0, `${tag}: audit issues ${E.audit(p).join("; ")}`);
};
["muscle", "strength", "fatloss", "general"].forEach(goal => ["1", "2", "3"].forEach(experience => ["2", "3", "4", "5", "6"].forEach(days => ["30", "45", "60", "75"].forEach(time => Object.entries(homes).forEach(([hk, h]) =>
  check({ goal, experience, days, time, ...h, around: ["none"], emphasis: "none" }, `${goal} L${experience} ${days}d ${time}m ${hk}`))))));
["3", "4", "5"].forEach(days => ["general", "fatloss"].forEach(goal => {
  check({ goal, experience: "2", days, time: "45", where: "gym", around: ["pregnant"], dueDate: "2027-03-01", prePreg: "2", emphasis: "none" }, `pregnant ${goal} ${days}d`);
  ["6w", "3m", "6m"].forEach(since => check({ goal, experience: "2", days, time: "45", where: "gym", around: ["postpartum"], since, emphasis: "none" }, `postpartum ${since} ${goal} ${days}d`));
}));
ok(paired > 1000, `only ${paired} supersets across all plans`);
// time estimate: a superset shares one rest per round
const it = n => ({ n, wk: [{ s: 3 }] });
const A = { ...it("x"), pair: "a" }, B = { ...it("y"), pair: "b" };
const solo = E.sessionMinutes([it("x"), it("y")], e => e.wk[0].s, () => 60);
const ss = E.sessionMinutes([A, B], e => e.wk[0].s, () => 60);
ok(ss < solo, `superset estimate ${ss} should be under ${solo}`);
console.log(`\n${pass} passed, ${fail} failed (${paired} supersets)`);
process.exit(fail ? 1 : 0);
