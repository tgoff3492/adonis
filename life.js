/* Adonis life-aware planning: sick days, trips, weekly consistency and the goal forecast.
   Pure functions shared by index.html and tests/life-tests.js. No network, no AI, no sleep data (by design).

   Sick days (S.days[date].sick = "mild" | "rest"):
     - 1 or 2 sick days in a row: the plan keeps its dates; those workouts are simply skipped.
     - 3+ sick days in a row: the 4-week block pauses for those days and resumes where you left off.
       A sick day you still trained on is not paused.
     - First sessions back after a run are lighter (see RAMP). A "mild" day's workout is optional and lighter.
     - Sick days never count as planned workouts, so they never hurt your stats or consistency.
   Trips ({id, place, from, to, eq:[engine equipment tokens], picks:[questionnaire answers]}):
     on trip days, any exercise that needs equipment you won't have swaps to the closest one that fits. */
(function (root) {
"use strict";

/* ---------- dates (YYYY-MM-DD, UTC math so time zones never shift a day) ---------- */
function dn(s) { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); }
function daysBetween(a, b) { return Math.round((dn(a) - dn(b)) / 864e5); }   // a - b
function addDays(s, n) { return new Date(dn(s) + n * 864e5).toISOString().slice(0, 10); }

/* ---------- sick days ---------- */
const PAUSE_AT = 3;                 // a run this long (days in a row) pauses the plan
const MILD_FACTOR = 0.6;            // optional light session on a "mild" sick day
const RAMP_WINDOW = 21;             // the return ramp only applies within 3 weeks of getting better
// run length -> set multiplier for the 1st, 2nd... session back
function rampSteps(len) { return len >= 7 ? [0.6, 0.8] : len >= PAUSE_AT ? [0.7] : []; }

function sickDates(days) { return Object.keys(days || {}).filter(k => days[k] && days[k].sick).sort(); }
// consecutive runs of sick days: [{from, to, len, dates}]
function sickRuns(days) {
  const runs = [];
  sickDates(days).forEach(d => {
    const r = runs[runs.length - 1];
    if (r && daysBetween(d, r.to) === 1) { r.to = d; r.len++; r.dates.push(d); }
    else runs.push({ from: d, to: d, len: 1, dates: [d] });
  });
  return runs;
}
function runOn(days, d) { return sickRuns(days).find(r => d >= r.from && d <= r.to) || null; }
// dates the plan is paused: every day of a 3+ day run, except days you trained anyway
function pausedDates(days, didWorkout) {
  const out = new Set();
  sickRuns(days).forEach(r => { if (r.len >= PAUSE_AT) r.dates.forEach(d => { if (!(didWorkout && didWorkout(d))) out.add(d); }); });
  return out;
}
// how many paused days fall on or after the plan start and before d
function pausedBefore(paused, start, d) { let n = 0; paused.forEach(p => { if (p >= start && p < d) n++; }); return n; }
// set multiplier for d: lighter on a mild sick day and for the first session(s) back
function setFactor(days, d, didWorkout) {
  const D = days && days[d];
  if (D && D.sick === "rest") return 0;
  if (D && D.sick === "mild") return MILD_FACTOR;
  const runs = sickRuns(days).filter(r => r.to < d && daysBetween(d, r.to) <= RAMP_WINDOW);
  if (!runs.length) return 1;
  const r = runs[runs.length - 1], steps = rampSteps(r.len);
  let done = 0;
  for (let x = addDays(r.to, 1); x < d; x = addDays(x, 1)) if (didWorkout && didWorkout(x)) done++;
  return done < steps.length ? steps[done] : 1;
}
function scaleSets(s, f) { return f >= 1 || !(s > 0) ? s : Math.max(1, Math.round(s * f)); }

/* ---------- trips ---------- */
const GYM_EQ = ["bb", "db", "dbh", "bench", "cab", "pu", "band", "mb", "kb"];
// questionnaire answers -> engine tokens (same mapping as the plan builder)
function tripEq(picks) {
  const p = picks || [];
  if (p.includes("gym")) return GYM_EQ.slice();
  const eq = new Set();
  p.forEach(t => { if (t === "db_light") eq.add("db"); else if (t === "db_full") { eq.add("db"); eq.add("dbh"); } else if (t !== "none") eq.add(t); });
  return [...eq];
}
function tripOn(trips, d) { return (trips || []).find(t => t && t.from && t.to && d >= t.from && d <= t.to) || null; }
// saved places: the latest equipment used for each place name
function places(trips) {
  const m = new Map();
  (trips || []).slice().sort((a, b) => (a.from < b.from ? -1 : 1)).forEach(t => { if (t.place) m.set(t.place.trim().toLowerCase(), { place: t.place.trim(), picks: t.picks || [] }); });
  return [...m.values()];
}
// for one planned day on a trip: {original name -> travel swap} (null value = nothing fits, do what you can)
function tripSwaps(exercises, trip, planCtx, engine) {
  const out = {};
  if (!trip || !engine || !engine.fitTo) return out;
  const ctx = { eq: trip.eq || [], block: (planCtx && planCtx.block) || [], maxD: (planCtx && planCtx.maxD) || 5 };
  const lifts = (exercises || []).filter(e => e && e.type !== "cardio" && e.type !== "circuit");
  const used = lifts.filter(e => engine.fitTo(e.n, ctx) === e.n).map(e => e.n);   // what already fits stays put
  lifts.forEach(e => {
    if (used.includes(e.n)) return;
    const to = engine.fitTo(e.n, ctx, used);
    out[e.n] = to; if (to) used.push(to);
  });
  return out;
}

/* ---------- weekly consistency (replaces the all-or-nothing streak) ----------
   weeks: oldest first, [{planned, done, current}]. A week counts at 80% of planned workouts (rounded, at least 1).
   Weeks with nothing planned (all sick, say) are neutral. One missed week every 8 weeks is forgiven (a grace week). */
const CONSIST_PCT = 0.8, GRACE_EVERY = 8;
function weekNeed(planned) { return Math.max(1, Math.round(planned * CONSIST_PCT)); }
function consistency(weeks) {
  let run = 0, lastGrace = -Infinity, graceUsedAt = null;
  (weeks || []).forEach((w, i) => {
    if (!w.planned) return;
    if (w.done >= weekNeed(w.planned)) { run++; return; }
    if (w.current) return;                       // this week isn't over yet
    if (run > 0 && i - lastGrace >= GRACE_EVERY) { lastGrace = i; graceUsedAt = i; return; }
    run = 0;
  });
  const n = (weeks || []).length;
  return { weeks: run, graceReady: n - lastGrace >= GRACE_EVERY, graceUsedRecently: graceUsedAt != null && n - 1 - graceUsedAt < 2 };
}

/* ---------- goal forecast ----------
   in: {today, weight, weightRate (lb/week), bf, bfRate (%/week), goalWeight, goalBf, goalDate}
   out: {status, finish, early, late, offWeeks, parts:[{k, status, ...}]}
   status: none | data | reached | moving (no goal date) | onpace | ahead | later | steady (not heading toward a goal yet) */
const SPREAD_FAST = 0.85, SPREAD_SLOW = 1.25;
function part(k, now, rate, goal, close, today) {
  if (!(goal > 0)) return null;
  if (!(now > 0)) return { k, status: "data" };
  const rem = goal - now;
  if (Math.abs(rem) < close) return { k, status: "reached" };
  if (rate == null) return { k, status: "data" };
  if (Math.abs(rate) < 0.02 || Math.sign(rate) !== Math.sign(rem)) return { k, status: "steady", rem, rate };
  const wk = rem / rate;
  return { k, status: "moving", rem, rate, finish: addDays(today, Math.round(wk * 7)), early: addDays(today, Math.round(wk * 7 * SPREAD_FAST)), late: addDays(today, Math.round(wk * 7 * SPREAD_SLOW)) };
}
function forecast(i) {
  const parts = [part("weight", i.weight, i.weightRate, i.goalWeight, 1, i.today), part("bf", i.bf, i.bfRate, i.goalBf, 0.5, i.today)].filter(Boolean);
  if (!parts.length) return { status: "none", parts };
  if (parts.every(p => p.status === "reached")) return { status: "reached", parts };
  if (parts.some(p => p.status === "data")) return { status: "data", parts };
  if (parts.some(p => p.status === "steady")) return { status: "steady", parts };
  const mv = parts.filter(p => p.status === "moving");
  const pick = k => mv.map(p => p[k]).sort().pop();       // you're there when the last goal is met
  const r = { parts, finish: pick("finish"), early: pick("early"), late: pick("late") };
  if (!i.goalDate || i.goalDate <= i.today) return { ...r, status: "moving" };
  const off = Math.round(daysBetween(r.finish, i.goalDate) / 7);
  return { ...r, offWeeks: off, status: Math.abs(off) <= 1 ? "onpace" : off < 0 ? "ahead" : "later" };
}
// plain-language line. fmt(date) formats a date; goals = "165 lb and 15%"; never says "behind" or "failed"
function forecastText(f, o) {
  const fmt = o.fmt, goals = o.goals, by = o.goalDate ? fmt(o.goalDate) : "";
  const range = f.early && f.late ? (fmt(f.early) === fmt(f.late) ? fmt(f.finish) : `${fmt(f.early)} – ${fmt(f.late)}`) : "";
  const sick = o.recentSick ? " Your sick days are already counted in this, and rest was the right call." : "";
  switch (f.status) {
    case "none": return "Set a goal weight or body fat below and your forecast shows up here.";
    case "data": return "Keep weighing in and measuring once a week. After about two weeks of check-ins, your forecast shows up here.";
    case "reached": return `You're at your goal. From here it's about holding it and building strength.`;
    case "steady": {
      const w = f.parts.find(p => p.k === "weight"), b = f.parts.find(p => p.k === "bf");
      if (w && w.status === "steady" && b && (b.status === "moving" || b.status === "reached")) return `Your weight is holding while body fat drops. That's muscle replacing fat, which is exactly what a recomp looks like.${sick}`;
      return `Your trend isn't heading toward ${goals} yet. Give it a couple more weeks of steady training and logging before changing anything; trends take time to show.${sick}`;
    }
    case "moving": return `At your current pace, you'll reach ${goals} around ${range}.${sick}`;
    case "onpace": return `On pace for ${goals} by ${by}.${sick}`;
    case "ahead": return `Ahead of schedule: you're projected to reach ${goals} around ${range}, before your ${by} target.${sick}`;
    case "later": return `Projected for ${range}, about ${f.offWeeks} week${f.offWeeks === 1 ? "" : "s"} after your ${by} target. That's still real progress, and every consistent week moves the date closer.${sick}`;
  }
  return "";
}

/* ---------- day-one reality check ----------
   How much fat to lose and lean mass to gain, and whether the date is realistic.
   Lean gain per month by training experience (1 new, 2 some, 3 experienced): about 2, 1 and 0.5 lb.
   Fat loss: about 0.75% of body weight a week keeps muscle. */
const LEAN_PER_MONTH = { 1: 2, 2: 1, 3: 0.5 }, FAT_PCT_WEEK = 0.0075;
function reality(i) {
  if (!(i.weight > 0) || !(i.goalWeight > 0) || !i.goalDate || i.goalDate <= i.today) return null;
  const days = daysBetween(i.goalDate, i.today), months = days / 30.44, weeks = days / 7;
  const lean = LEAN_PER_MONTH[i.level] || 1;
  let fatLoss = null, leanGain = null, needWeeks = 0;
  if (i.bf > 0 && i.goalBf > 0) {
    fatLoss = i.weight * i.bf / 100 - i.goalWeight * i.goalBf / 100;
    leanGain = i.goalWeight * (1 - i.goalBf / 100) - i.weight * (1 - i.bf / 100);
    if (leanGain > 0) needWeeks = Math.max(needWeeks, leanGain / lean * 30.44 / 7);
    if (fatLoss > 0) needWeeks = Math.max(needWeeks, fatLoss / (i.weight * FAT_PCT_WEEK));
  } else {
    const ch = i.goalWeight - i.weight;
    if (ch < 0) needWeeks = -ch / (i.weight * FAT_PCT_WEEK);
    else if (ch > 0) needWeeks = ch / lean * 30.44 / 7;    // gaining weight: mostly muscle pace
  }
  const ok = needWeeks <= weeks * 1.05;
  return { ok, months: Math.round(months * 10) / 10, fatLoss: fatLoss == null ? null : Math.round(fatLoss), leanGain: leanGain == null ? null : Math.round(leanGain),
    leanPerMonth: lean, suggest: ok ? null : addDays(i.today, Math.ceil(needWeeks) * 7) };
}

root.AdonisLife = { daysBetween, addDays, sickRuns, runOn, pausedDates, pausedBefore, setFactor, scaleSets, rampSteps, PAUSE_AT,
  tripEq, tripOn, places, tripSwaps, consistency, weekNeed, forecast, forecastText, reality };
})(typeof window !== "undefined" ? window : globalThis);
