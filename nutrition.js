/* Adonis nutrition engine: daily targets from body data, activity, training plan and goal.
   Runs entirely on the phone. Shared by index.html and lab.html. */
(function (root) {
"use strict";

const LB = 0.45359237, IN = 2.54;
const round = (n, s) => Math.round(n / (s || 1)) * (s || 1);

function dateNum(s) { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); }
function daysBetween(a, b) { return Math.round((dateNum(a) - dateNum(b)) / 864e5); }

/* ---------- body fat ---------- */
// U.S. Navy circumference method (inches). Returns % or null.
function navyBF(sex, heightIn, waist, neck, hips) {
  if (!heightIn || !waist || !neck) return null;
  let bf;
  if (sex === "female") {
    if (!hips || waist + hips - neck <= 0) return null;
    bf = 163.205 * Math.log10(waist + hips - neck) - 97.684 * Math.log10(heightIn) - 78.387;
  } else {
    if (waist - neck <= 0) return null;
    bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(heightIn) + 36.76;
  }
  if (!isFinite(bf)) return null;
  return Math.max(3, Math.min(60, bf));
}

/* ---------- pregnancy ---------- */
// Weeks pregnant on a given date from the due date (40 weeks).
function gestWeeks(dueDate, on) {
  if (!dueDate) return null;
  return 40 - daysBetween(dueDate, on) / 7;
}
function trimesterOf(dueDate, on) {
  const w = gestWeeks(dueDate, on);
  if (w == null) return null;
  return w < 14 ? 1 : w < 28 ? 2 : 3;
}

/* ---------- activity ---------- */
const LIFE = { sit: 1.25, some: 1.35, most: 1.45, physical: 1.6 };
const LIFE_LBL = { sit: "Mostly sitting", some: "On my feet some", most: "On my feet most of the day", physical: "Physical job" };
const CUT = { steady: 0.005, moderate: 0.0075, aggressive: 0.01 };
const BULK = { slow: 0.0025, standard: 0.005 };

/* Inputs:
   p = { sex, age, heightIn, weight, bfMode: "known"|"tape"|"skip", bf, waist, neck, hips,
         life, goal: "cut"|"maintain"|"bulk", pace, carbs: "same"|"cycle",
         status: "none"|"pregnant"|"breastfeeding", dueDate, babyMonths }
   o = { today: "YYYY-MM-DD", trainingDays: 0-7, weight (latest 7-day average, optional),
         bf (latest logged %, optional), waist (latest logged, optional),
         adj (accepted calorie adjustment), cut: {start, weeks} | null, ramp: {start, from, days} | null } */
function compute(p, o) {
  o = o || {};
  const notes = [];
  const sex = p.sex === "female" ? "female" : "male";
  const weight = +o.weight || +p.weight;
  const hIn = +p.heightIn;
  const kg = weight * LB, cm = hIn * IN;
  const today = o.today || new Date().toISOString().slice(0, 10);

  // body fat: newest logged value > tape (with newest waist) > known > none
  let bf = null, bfSource = "";
  if (o.bf) { bf = +o.bf; bfSource = "your latest check-in"; }
  else if (p.bfMode === "tape") {
    bf = navyBF(sex, hIn, +o.waist || +p.waist, +p.neck, +p.hips);
    if (bf != null) bfSource = "tape measurements";
  } else if (p.bfMode === "known" && +p.bf) { bf = +p.bf; bfSource = "what you entered"; }

  const bmi = kg / Math.pow(cm / 100, 2);

  // resting burn
  let bmr, bmrHow;
  if (bf != null) { const lbm = kg * (1 - bf / 100); bmr = 370 + 21.6 * lbm; bmrHow = "Katch-McArdle (uses lean mass)"; }
  else { bmr = 10 * kg + 6.25 * cm - 5 * (+p.age || 30) + (sex === "male" ? 5 : -161); bmrHow = "Mifflin-St Jeor"; }

  const td = Math.max(0, Math.min(7, +o.trainingDays || 0));
  const mult = Math.min(1.9, (LIFE[p.life] || 1.3) + 0.06 * td);
  const tdee = bmr * mult;

  // status
  const status = sex === "female" ? (p.status || "none") : "none";
  let tri = null, extra = 0, goal = p.goal || "maintain", pace = p.pace;
  if (status === "pregnant") {
    tri = trimesterOf(p.dueDate, today) || 1;
    extra = tri === 1 ? 0 : tri === 2 ? 340 : 450;
    if (goal !== "maintain") { notes.push("Pregnancy isn't the time to cut or bulk, so your targets are set to support you and your baby."); goal = "maintain"; }
  }
  if (status === "breastfeeding") {
    extra = (+p.babyMonths || 0) >= 6 ? 400 : 330;
    if (goal === "cut" && pace !== "steady") { pace = "steady"; notes.push("While breastfeeding, cuts are limited to the steady pace to protect your milk supply."); }
    if (goal === "bulk") goal = "maintain";
  }

  // cut window from the "Start a cut" button
  let cutInfo = null;
  if (o.cut && o.cut.start && status !== "pregnant") {
    const day = daysBetween(today, o.cut.start);
    const total = o.cut.weeks * 7;
    if (day >= 0 && day < total) { goal = "cut"; pace = o.cut.pace || pace || "steady"; if (status === "breastfeeding") pace = "steady"; cutInfo = { week: Math.floor(day / 7) + 1, weeks: o.cut.weeks, daysLeft: total - day }; }
    else if (day >= total) cutInfo = { done: true, weeks: o.cut.weeks };
  }

  let delta = 0;
  if (goal === "cut") delta = -(weight * (CUT[pace] || CUT.steady)) * 500;
  if (goal === "bulk") delta = (weight * (BULK[pace] || BULK.slow)) * 500;

  let cal = tdee + delta + extra + (+o.adj || 0);

  // gradual step back up after a cut
  let rampInfo = null;
  if (o.ramp && o.ramp.start) {
    const d = daysBetween(today, o.ramp.start);
    if (d >= 0 && d < o.ramp.days) {
      const t = (d + 1) / o.ramp.days;
      cal = o.ramp.from + (cal - o.ramp.from) * t;
      rampInfo = { day: d + 1, days: o.ramp.days };
    }
  }

  // safety floors
  let floor = Math.max(bmr, sex === "male" ? 1500 : 1200);
  if (status === "breastfeeding") floor = Math.max(floor, 1800);
  if (status === "pregnant") floor = Math.max(floor, tdee + extra);
  if (cal < floor) { cal = floor; if (goal === "cut") notes.push("Your cut is capped so calories never drop below what your body burns at rest."); }
  cal = round(cal, 10);

  // macros
  let protein;
  const lbmLb = bf != null ? weight * (1 - bf / 100) : null;
  const highBF = bf != null && (sex === "male" ? bf > 30 : bf > 38);
  if (highBF) protein = lbmLb * 1.2;
  else protein = weight * (goal === "cut" ? 1.0 : 0.85);
  protein = round(protein, 5);
  let fat = weight * (goal === "cut" ? 0.35 : 0.4);
  const minFatPct = status === "pregnant" || status === "breastfeeding" ? 0.25 : 0.2;
  fat = Math.max(fat, cal * minFatPct / 9);
  fat = round(fat, 5);
  let carbs = (cal - protein * 4 - fat * 9) / 4;
  if (carbs < 50) { // very small people on a cut: trim protein a little before carbs go silly
    carbs = 50; protein = round((cal - fat * 9 - carbs * 4) / 4, 5);
  }
  carbs = round(carbs, 5);

  let carbsTrain = carbs, carbsRest = carbs;
  if (p.carbs === "cycle" && td > 0 && td < 7) {
    const x = Math.min(0.15, 0.2 * (7 - td) / td); // rest days never drop below ~80% of the average
    carbsTrain = round(carbs * (1 + x), 5);
    carbsRest = round((carbs * 7 - carbsTrain * td) / (7 - td), 5);
  }

  return {
    cal, protein, fat, carbs, carbsTrain, carbsRest, cycle: p.carbs === "cycle",
    bmr: round(bmr, 10), tdee: round(tdee, 10), mult: Math.round(mult * 100) / 100, bmrHow,
    bf: bf != null ? Math.round(bf * 10) / 10 : null, bfSource, bmi: Math.round(bmi * 10) / 10,
    weight: Math.round(weight * 10) / 10, goal, pace, delta: round(delta, 10), extra,
    status, trimester: tri, gestWeeks: status === "pregnant" ? Math.floor(gestWeeks(p.dueDate, today)) : null,
    cut: cutInfo, ramp: rampInfo, notes, lifeLbl: LIFE_LBL[p.life] || ""
  };
}

/* ---------- weekly check: does the scale trend match the goal? ----------
   weights: [{d:"YYYY-MM-DD", w:Number}] sorted. Returns a suggestion or null. */
function trendCheck(weights, goal, pace, today, weightNow) {
  const inRange = (from, to) => weights.filter(x => { const k = daysBetween(today, x.d); return k >= from && k <= to; });
  const recent = inRange(0, 6), prior = inRange(7, 13);
  if (recent.length < 4 || prior.length < 4) return null;
  const avg = a => a.reduce((s, x) => s + x.w, 0) / a.length;
  const change = avg(recent) - avg(prior); // lb per week
  const w = weightNow || avg(recent);
  let target = 0;
  if (goal === "cut") target = -w * (CUT[pace] || CUT.steady);
  if (goal === "bulk") target = w * (BULK[pace] || BULK.slow);
  const r = { change: Math.round(change * 10) / 10, target: Math.round(target * 10) / 10 };
  if (goal === "cut") {
    if (change > target * 0.5) return { ...r, adj: -150, why: "You're losing weight slower than planned" };
    if (change < target * 1.5) return { ...r, adj: 150, why: "You're losing weight faster than planned, which can cost muscle" };
  } else if (goal === "bulk") {
    if (change < target * 0.5) return { ...r, adj: 150, why: "You're gaining slower than planned" };
    if (change > target * 1.75) return { ...r, adj: -150, why: "You're gaining faster than planned, which adds more fat" };
  } else {
    if (Math.abs(change) > w * 0.005) return { ...r, adj: change > 0 ? -150 : 150, why: change > 0 ? "Your weight is creeping up" : "Your weight is drifting down" };
  }
  return null;
}

root.AdonisNutrition = { compute, trendCheck, navyBF, trimesterOf, gestWeeks, daysBetween };
})(typeof window !== "undefined" ? window : globalThis);
