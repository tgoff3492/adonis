/* Adonis research audit.
   Generates thousands of workout and nutrition plans and checks each one against published research.
   Run:  node tests/research-audit.js            (summary)
         node tests/research-audit.js --json     (full results, for the report page)
   Nothing here changes the app. It only reads engine.js, nutrition.js and meals.js. */
"use strict";
const path = require("path");
const ROOT = path.join(__dirname, "..");
require(path.join(ROOT, "engine.js"));
require(path.join(ROOT, "nutrition.js"));
require(path.join(ROOT, "meals.js"));
const E = globalThis.AdonisEngine, N = globalThis.AdonisNutrition, MP = globalThis.AdonisMeals;

const TODAY = process.env.AUDIT_TODAY || "2026-10-14";
const addDays = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const dueIn = weeksPregnant => addDays(TODAY, Math.round((40 - weeksPregnant) * 7));
const KG = 0.45359237;

/* ---------------- sources ---------------- */
const SRC = {
  issn: { short: "ISSN protein position stand (Jäger et al., 2017)", url: "https://pubmed.ncbi.nlm.nih.gov/28642676/" },
  morton: { short: "Morton et al., 2018 meta-analysis (BJSM)", url: "https://pubmed.ncbi.nlm.nih.gov/28698222/" },
  helms: { short: "Helms, Aragon & Fitschen, 2014 (JISSN): contest prep", url: "https://jissn.biomedcentral.com/articles/10.1186/1550-2783-11-20" },
  iraki: { short: "Iraki, Fitschen, Espinar & Helms, 2019 (Sports): off-season", url: "https://www.mdpi.com/2075-4663/7/7/154" },
  amdr: { short: "Institute of Medicine DRIs: macronutrient ranges (AMDR)", url: "https://nap.nationalacademies.org/catalog/10490" },
  dri_preg: { short: "Institute of Medicine DRIs for pregnancy and lactation", url: "https://nap.nationalacademies.org/read/12584/chapter/14" },
  fda_fish: { short: "FDA/EPA advice about eating fish", url: "https://www.fda.gov/food/consumers/advice-about-eating-fish" },
  acog: { short: "ACOG Committee Opinion 804 (2020): exercise in pregnancy and postpartum", url: "https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2020/04/physical-activity-and-exercise-during-pregnancy-and-the-postpartum-period" },
  gentil: { short: "Gentil et al., 2013: adding arm isolation to compound training (untrained)", url: "https://pubmed.ncbi.nlm.nih.gov/23537028/" },
  schoen_vol: { short: "Schoenfeld, Ogborn & Krieger, 2017: weekly sets and muscle growth", url: "https://pubmed.ncbi.nlm.nih.gov/27433992/" },
  schoen_freq: { short: "Schoenfeld, Ogborn & Krieger, 2016: training frequency", url: "https://pubmed.ncbi.nlm.nih.gov/27102172/" },
  schoen_load: { short: "Schoenfeld et al., 2017: low vs high load hypertrophy", url: "https://pubmed.ncbi.nlm.nih.gov/28834797/" },
  acsm: { short: "ACSM position stand: progression models in resistance training (2009)", url: "https://pubmed.ncbi.nlm.nih.gov/19204579/" },
  robinson: { short: "Robinson et al., 2024: proximity to failure and muscle growth", url: "https://pubmed.ncbi.nlm.nih.gov/38970765/" },
  bell: { short: "Bell et al., 2023: deloading practices (Delphi consensus)", url: "https://pubmed.ncbi.nlm.nih.gov/36848098/" },
  garthe: { short: "Garthe et al., 2011: slow vs fast weight loss in athletes", url: "https://pubmed.ncbi.nlm.nih.gov/21558571/" },
  frankenfield: { short: "Frankenfield et al., 2005: resting metabolic rate equations", url: "https://pubmed.ncbi.nlm.nih.gov/15883556/" },
  goom: { short: "Goom, Donnelly & Brockwell, 2019: returning to running postnatal", url: "https://absolute.physio/wp-content/uploads/2019/09/returning-to-running-postnatal-guidelines.pdf" },
  who: { short: "WHO 2020 guidelines on physical activity", url: "https://www.who.int/publications/i/item/9789240015128" },
};

/* ---------------- result collection ---------------- */
const checks = {};   // id -> {id, area, rule, source, pass, warn, fail, examples[]}
function def(id, area, rule, source) { checks[id] = { id, area, rule, source, pass: 0, warn: 0, fail: 0, examples: [] }; }
function rec(id, status, example) {
  const c = checks[id]; c[status]++;
  if (status !== "pass" && c.examples.length < 6 && example) c.examples.push({ status, example });
}

/* ================================================================
   NUTRITION
   ================================================================ */
def("n-protein-build", "Nutrition", "Protein on maintain/bulk is 1.6–2.2 g per kg of body weight a day (Morton breakpoint 1.62 g/kg, upper bound ~2.2; Iraki 1.6–2.2)", ["morton", "iraki", "issn"]);
def("n-protein-cut", "Nutrition", "Protein on a cut is 2.3–3.1 g per kg of lean mass a day, and at least 1.6 g per kg of body weight", ["helms", "issn"]);
def("n-protein-amdr", "Nutrition", "Protein stays within 10–35% of calories (up to 40% on a cut, where the higher sports-nutrition targets apply)", ["amdr", "helms"]);
def("n-protein-preg", "Nutrition", "Pregnancy and breastfeeding: protein at least the RDA (71 g/day, about 1.1 g/kg)", ["dri_preg"]);
def("n-fat-range", "Nutrition", "Fat stays within 20–35% of calories (15–30% allowed on a cut)", ["amdr", "helms", "iraki"]);
def("n-fat-min", "Nutrition", "Fat at least 0.5 g per kg of body weight", ["iraki"]);
def("n-carb-floor", "Nutrition", "Carbs at least the RDA: 130 g (adults), 175 g (pregnant), 210 g (breastfeeding)", ["amdr", "dri_preg"]);
def("n-carb-bulk", "Nutrition", "Bulking carbs at least 3 g per kg (Iraki's minimum of 3–5 g/kg)", ["iraki"]);
def("n-cut-rate", "Nutrition", "Planned cut loses 0.5–1.0% of body weight a week", ["helms", "garthe"]);
def("n-bulk-scope", "Nutrition", "Bulking above ~25% body fat (men) / 32% (women), or BMI 30+ when body fat is unknown, is outside the research population, so the app says so", ["iraki"]);
def("n-bulk-rate", "Nutrition", "Planned bulk gains 0.25–0.5% of body weight a week, from a 10–20% surplus", ["iraki"]);
def("n-floor", "Nutrition", "Calories never below resting burn (BMR), 1,200 (women) or 1,500 (men)", ["frankenfield"]);
def("n-activity", "Nutrition", "Activity multiplier matches the standard BMR activity factors (1.2 sedentary to 1.9 very active)", ["frankenfield"]);
def("n-preg-energy", "Nutrition", "Pregnancy adds +0 / +340 / +452 kcal by trimester; never a deficit", ["dri_preg", "acog"]);
def("n-bf-energy", "Nutrition", "Breastfeeding adds +330 (0–6 months) / +400 (7+ months) kcal; loss no faster than 0.5 kg (1.1 lb) a week, calories at least 1,800", ["dri_preg"]);

function nutriPersonas() {
  const out = [];
  const heights = { male: [64, 69, 74], female: [60, 65, 70] };
  const weights = { male: [130, 169, 200, 260, 320], female: [105, 130, 160, 200, 260] };
  const bfs = { male: [null, 12, 20, 28, 38], female: [null, 20, 28, 36, 45] };
  ["male", "female"].forEach(sex => heights[sex].forEach(h => weights[sex].forEach(w => bfs[sex].forEach(bf => {
    ["sit", "some", "most", "physical"].forEach(life => [0, 3, 5].forEach(td => {
      [["cut", "steady"], ["cut", "moderate"], ["cut", "aggressive"], ["maintain", ""], ["bulk", "slow"], ["bulk", "standard"]].forEach(([goal, pace]) => {
        out.push({ p: { sex, age: 34, heightIn: h, weight: w, bfMode: bf ? "known" : "skip", bf: bf || "", life, goal, pace, carbs: "same" }, td, tag: `${sex} ${h}in ${w}lb ${bf ? bf + "%" : "bf?"} ${life} ${td}d ${goal}${pace ? "/" + pace : ""}` });
      });
    }));
  }))));
  // pregnancy and breastfeeding
  [105, 130, 160, 200].forEach(w => [62, 66].forEach(h => [8, 20, 33].forEach(wk => ["sit", "some"].forEach(life => [0, 3, 4].forEach(td => ["maintain", "cut"].forEach(goal =>
    out.push({ p: { sex: "female", age: 31, heightIn: h, weight: w, bfMode: "skip", life, goal, pace: "moderate", status: "pregnant", dueDate: dueIn(wk) }, td, tag: `pregnant ${wk}wk ${h}in ${w}lb ${life} ${td}d asked:${goal}` })))))));
  [120, 150, 180, 220].forEach(w => [62, 66].forEach(h => [2, 8].forEach(mo => ["sit", "some"].forEach(life => [0, 3].forEach(td => [["cut", "aggressive"], ["cut", "steady"], ["maintain", ""], ["bulk", "standard"]].forEach(([goal, pace]) =>
    out.push({ p: { sex: "female", age: 32, heightIn: h, weight: w, bfMode: "skip", life, goal, pace, status: "breastfeeding", babyMonths: mo }, td, tag: `breastfeeding ${mo}mo ${h}in ${w}lb ${life} ${td}d asked:${goal}/${pace}` })))))));
  return out;
}

const LIFE_BASE = { sit: 1.2, some: 1.375, most: 1.55, physical: 1.725 };
function auditNutrition() {
  const ps = nutriPersonas();
  ps.forEach(({ p, td, tag }) => {
    const r = N.compute(p, { today: TODAY, trainingDays: td });
    const kg = r.weight * KG, lbmKg = r.bf != null ? kg * (1 - r.bf / 100) : null;
    const cal = r.cal, pk = r.protein / kg, fatPct = r.fat * 9 / cal, protPct = r.protein * 4 / cal;
    const ex = `${tag} → ${cal} kcal, P ${r.protein} g, C ${r.carbs} g, F ${r.fat} g`;
    const preg = r.status === "pregnant", bfeed = r.status === "breastfeeding";

    // protein
    if (preg || bfeed) rec("n-protein-preg", r.protein >= 71 && pk >= 1.1 ? "pass" : "fail", ex + ` (${pk.toFixed(2)} g/kg)`);
    else if (r.goal === "cut") {
      const lean = lbmKg ? r.protein / lbmKg : null;
      const highBF = r.bf != null && (p.sex === "male" ? r.bf > 30 : r.bf > 38);
      if (lean != null) {
        // Helms' range is for lean, trained people; for high body fat the check is the lean-mass target alone
        const ok = lean >= 2.3 && lean <= 3.1 && (highBF || pk >= 1.6);
        rec("n-protein-cut", ok ? "pass" : (lean >= 2.0 && lean <= 3.3 ? "warn" : "fail"), ex + ` (${lean.toFixed(2)} g/kg lean, ${pk.toFixed(2)} g/kg body weight)`);
      } else rec("n-protein-cut", pk >= 1.55 && pk <= 3.1 ? "pass" : "fail", ex + ` (${pk.toFixed(2)} g/kg body weight, body fat unknown)`);
    } else {
      const highBF = r.bf != null && (p.sex === "male" ? r.bf > 30 : r.bf > 38);
      if (highBF) { const lean = r.protein / lbmKg; rec("n-protein-build", lean >= 1.6 && lean <= 3.1 ? "pass" : "fail", ex + ` (${lean.toFixed(2)} g/kg lean)`); }
      else rec("n-protein-build", pk >= 1.6 && pk <= 2.2 ? "pass" : pk >= 1.4 && pk <= 2.5 ? "warn" : "fail", ex + ` (${pk.toFixed(2)} g/kg)`);
    }
    const pCeil = r.goal === "cut" ? 0.40 : 0.35;
    rec("n-protein-amdr", protPct >= 0.10 && protPct <= pCeil + 0.005 ? "pass" : protPct <= pCeil + 0.05 ? "warn" : "fail", ex + ` (${Math.round(protPct * 100)}% of calories)`);

    // fat
    const lo = r.goal === "cut" ? 0.15 : 0.20, hi = r.goal === "cut" ? 0.35 : 0.35;
    rec("n-fat-range", fatPct >= lo - 0.012 && fatPct <= hi + 0.012 ? "pass" : fatPct <= 0.40 ? "warn" : "fail", ex + ` (${Math.round(fatPct * 100)}% fat)`);
    rec("n-fat-min", r.fat / kg >= 0.5 ? "pass" : "fail", ex + ` (${(r.fat / kg).toFixed(2)} g/kg)`);

    // carbs
    const floor = preg ? 175 : bfeed ? 210 : 130;
    const carbsMin = Math.min(r.carbs, r.carbsRest);
    if (preg || bfeed) rec("n-carb-floor", carbsMin >= floor ? "pass" : "fail", ex + ` (needs ${floor} g)`);
    else rec("n-carb-floor", carbsMin >= floor ? "pass" : (r.goal === "cut" ? "warn" : "fail"), ex + ` (RDA ${floor} g)`);
    const outOfScope = r.goal === "bulk" && ((r.bf != null && r.bf > (p.sex === "male" ? 25 : 32)) || (r.bf == null && r.bmi >= 30));
    if (outOfScope) rec("n-bulk-scope", r.notes.some(x => /lean lifters/.test(x)) ? "pass" : "fail", ex + ` (BMI ${r.bmi}${r.bf != null ? ", " + r.bf + "% body fat" : ""})`);
    else if (r.goal === "bulk" && !preg && !bfeed) { const base = lbmKg || kg; rec("n-carb-bulk", r.carbs / base >= 3 ? "pass" : r.carbs / base >= 2.5 ? "warn" : "fail", ex + ` (${(r.carbs / base).toFixed(1)} g/kg${lbmKg ? " lean" : ""})`); }

    // rates
    if (r.goal === "cut" && !preg) {
      const deficit = r.tdee + r.extra - cal; // after floors
      const lbWk = deficit * 7 / 3500, pct = lbWk / r.weight * 100;
      const capped = cal <= Math.max(r.bmr, p.sex === "male" ? 1500 : 1200, bfeed ? 1800 : 0) + 10;
      rec("n-cut-rate", pct >= 0.45 && pct <= 1.05 ? "pass" : (pct < 0.45 && capped ? "pass" : pct <= 1.2 ? "warn" : "fail"), ex + ` (${pct.toFixed(2)}%/wk${capped ? ", held at the safety floor" : ""})`);
    }
    if (r.goal === "bulk" && !preg && !bfeed) {
      const surplus = cal - r.tdee, pct = surplus * 7 / 3500 / r.weight * 100, sp = surplus / r.tdee;
      const okRate = pct >= 0.2 && pct <= 0.55, okSurplus = sp >= 0.05 && sp <= 0.205;
      rec("n-bulk-rate", okRate && okSurplus ? "pass" : (pct <= 0.6 && sp <= 0.22 ? "warn" : "fail"), ex + ` (${pct.toFixed(2)}%/wk, surplus ${Math.round(sp * 100)}% of maintenance)`);
    }
    // floors
    const minCal = Math.max(r.bmr, p.sex === "male" ? 1500 : 1200) - 10;
    rec("n-floor", cal >= minCal ? "pass" : "fail", ex + ` (BMR ${r.bmr})`);
    // activity factor: our multiplier vs the standard factors for the same life + training days
    const std = Math.min(1.9, LIFE_BASE[p.life] + (td >= 6 ? 0.35 : td >= 3 ? 0.25 : td >= 1 ? 0.15 : 0) * (p.life === "physical" ? 0.6 : 1));
    rec("n-activity", Math.abs(r.mult - std) <= 0.12 ? "pass" : Math.abs(r.mult - std) <= 0.2 ? "warn" : "fail", ex + ` (×${r.mult} vs standard ≈×${std.toFixed(2)})`);
    // pregnancy energy
    if (preg) {
      const want = { 1: 0, 2: 340, 3: 452 }[r.trimester];
      rec("n-preg-energy", Math.abs(r.extra - want) <= 5 && r.goal === "maintain" && cal >= r.tdee + r.extra - 10 ? "pass" : "fail", ex + ` (trimester ${r.trimester}, +${r.extra}, goal ${r.goal})`);
    }
    if (bfeed) {
      const want = (+p.babyMonths || 0) >= 6 ? 400 : 330;
      const lbWk = r.goal === "cut" ? (r.tdee + r.extra - cal) * 7 / 3500 : 0;
      rec("n-bf-energy", Math.abs(r.extra - want) <= 5 && lbWk <= 1.11 && cal >= 1800 && r.goal !== "bulk" ? "pass" : "fail", ex + ` (+${r.extra}, ${lbWk.toFixed(2)} lb/wk)`);
    }
  });
  return ps.length;
}

/* ================================================================
   MEAL PLANS
   ================================================================ */
def("m-hit", "Meal plans", "A day of planned meals lands within 10% of calorie target and at least 90% of protein", ["issn"]);
def("m-meal-protein", "Meal plans", "Every breakfast, lunch and dinner has at least 0.25 g/kg protein, or 20 g (ISSN per-meal dose)", ["issn"]);
def("m-protein-spread", "Meal plans", "Protein is spread across the day: no single meal over 50% of the day's protein", ["issn"]);
def("m-fish-preg", "Meal plans", "Pregnant/breastfeeding: no more than 3 fish/seafood servings a week, tuna no more than 2", ["fda_fish"]);
def("m-deli-preg", "Meal plans", "Pregnant: no cold deli meat (listeria)", ["acog"]);
def("m-day1", "Meal plans", "Nothing that needs overnight prep is on day 1", []);

function auditMeals() {
  let n = 0;
  const people = [
    { p: { sex: "male", age: 34, heightIn: 69, weight: 169, bfMode: "known", bf: 20, life: "sit", goal: "cut", pace: "moderate" }, td: 5, tag: "TJ-like cut" },
    { p: { sex: "male", age: 34, heightIn: 69, weight: 169, bfMode: "known", bf: 20, life: "sit", goal: "maintain" }, td: 5, tag: "TJ-like maintain" },
    { p: { sex: "male", age: 22, heightIn: 72, weight: 150, bfMode: "skip", life: "physical", goal: "bulk", pace: "standard" }, td: 4, tag: "lean bulk, physical job" },
    { p: { sex: "female", age: 30, heightIn: 62, weight: 115, bfMode: "skip", life: "sit", goal: "cut", pace: "steady" }, td: 3, tag: "small woman cut" },
    { p: { sex: "female", age: 31, heightIn: 65, weight: 160, bfMode: "skip", life: "some", goal: "maintain", status: "pregnant", dueDate: dueIn(24) }, td: 3, tag: "pregnant 24 wk", preg: true },
    { p: { sex: "female", age: 32, heightIn: 65, weight: 170, bfMode: "skip", life: "some", goal: "cut", pace: "steady", status: "breastfeeding", babyMonths: 4 }, td: 3, tag: "breastfeeding 4 mo", bfeed: true },
    { p: { sex: "male", age: 45, heightIn: 74, weight: 300, bfMode: "known", bf: 38, life: "sit", goal: "cut", pace: "moderate" }, td: 3, tag: "large man cut" },
  ];
  const styles = [{ style: "none" }, { style: "vegetarian" }, { style: "vegan" }, { style: "pescatarian" }, { style: "none", allergies: ["dairy"] }, { style: "none", allergies: ["eggs", "nuts"] }];
  people.forEach(P => {
    const r = N.compute(P.p, { today: TODAY, trainingDays: P.td });
    const T = { protein: r.protein, carbs: r.carbs, fat: r.fat, cal: r.cal };
    styles.forEach(st => [3, 4, 5].forEach(meals => ["daily", "batch", "minimal"].forEach(cooking => [0, 7].forEach(off => {
      const pr = { meals, cooking, allergies: [], dislikes: [], ...st, people: 1, pregnant: !!P.preg, breastfeeding: !!P.bfeed, targets: T };
      const start = addDays(TODAY, off);
      const wk = MP.planWeek(pr, start); n++;
      const tag = `${P.tag}, ${st.style}${st.allergies ? " no " + st.allergies.join("/") : ""}, ${meals} meals, ${cooking}`;
      let fish = 0, tuna = 0;
      wk.days.forEach((day, di) => {
        const dp = MP.dayPortions(day, T, pr), t = dp.total;
        const calOff = Math.abs(t.cal - T.cal) / T.cal, pHit = t.p / T.protein;
        rec("m-hit", calOff <= 0.10 && pHit >= 0.9 ? "pass" : calOff <= 0.15 && pHit >= 0.85 ? "warn" : "fail", `${tag}, day ${di + 1}: ${Math.round(t.cal)} of ${T.cal} kcal, P ${Math.round(t.p)} of ${T.protein} g`);
        dp.meals.forEach(m => {
          const perMeal = Math.min(20, 0.25 * P.p.weight * KG);
          if (m.slot === "m" || m.slot === "b") rec("m-meal-protein", m.p >= perMeal ? "pass" : m.p >= perMeal * 0.8 ? "warn" : "fail", `${tag}, day ${di + 1} ${m.label} "${m.name}": ${Math.round(m.p)} g protein (needs ${Math.round(perMeal)} g)`);
          rec("m-protein-spread", m.p <= 0.5 * t.p ? "pass" : "fail", `${tag}, day ${di + 1} ${m.label}: ${Math.round(m.p)} of ${Math.round(t.p)} g`);
          const items = m.items.map(i => i.ing);
          if (items.some(i => ["salmon", "cod", "shrimp", "tuna"].includes(i))) fish++;
          if (items.includes("tuna")) tuna++;
          if (P.preg) rec("m-deli-preg", items.includes("deliturkey") ? "fail" : "pass", `${tag}, day ${di + 1}: ${m.name}`);
        });
        if (di === 0) rec("m-day1", day.some(s => (MP.getMeal(s.id, pr) || {}).ahead) ? "fail" : "pass", `${tag}: ${day.map(s => s.id).join(", ")}`);
      });
      if (P.preg || P.bfeed) rec("m-fish-preg", fish <= 3 && tuna <= 2 ? "pass" : "fail", `${tag}: ${fish} seafood meals, ${tuna} tuna`);
    }))));
  });
  return n;
}

/* ================================================================
   WORKOUTS
   ================================================================ */
def("w-volume-muscle", "Workouts", "Build-muscle plans: each major muscle gets at least 10 hard sets a week (6 for beginners; arms 6, counting presses and rows as half), and no more than ~25", ["schoen_vol", "gentil"]);
def("w-volume-other", "Workouts", "Strength, fat-loss and general plans: each major muscle gets at least 4 sets a week", ["schoen_vol", "acsm"]);
def("w-frequency", "Workouts", "Each major muscle is trained at least twice a week (plans with 3+ days)", ["schoen_freq", "acsm", "who"]);
def("w-reps", "Workouts", "Rep ranges fit the goal: strength main lifts reach ≤6 reps; muscle work stays in 6–30 reps", ["acsm", "schoen_load"]);
def("w-progression", "Workouts", "Weeks 1→3 get harder (more sets or heavier/lower reps), week 4 is a lighter deload", ["acsm", "bell"]);
def("w-effort", "Workouts", "Every week tells you how close to failure to go (reps in the tank)", ["robinson"]);
def("w-time", "Workouts", "Sessions fit the time picked (estimated at real rest times, within +10 minutes)", ["acsm"]);
def("w-rules", "Workouts", "No exercise breaks an equipment, injury, pregnancy or postpartum rule (the app's own auto-check)", ["acog"]);
def("w-preg-aerobic", "Workouts", "Pregnancy plans point to ~150 minutes a week of moderate aerobic activity", ["acog"]);
def("w-preg-warning", "Workouts", "Pregnancy plans list ACOG's warning signs to stop exercising", ["acog"]);
def("w-pp-impact", "Workouts", "Postpartum: no jumping/running impact before about 12 weeks", ["goom", "acog"]);

const MUSC = {
  squat: { quads: 1, glutes: 0.5 }, hinge: { hams: 1, glutes: 0.5 }, lunge: { quads: 1, glutes: 0.5 },
  quad_iso: { quads: 1 }, ham_iso: { hams: 1 }, glute: { glutes: 1 },
  h_push: { chest: 1, triceps: 0.5, delts: 0.5 }, incline_push: { chest: 1, delts: 0.5, triceps: 0.5 }, chest_iso: { chest: 1 },
  v_push: { delts: 1, triceps: 0.5 }, h_pull: { back: 1, biceps: 0.5 }, v_pull: { back: 1, biceps: 0.5 },
  lat_raise: { delts: 1 }, rear_delt: { delts: 0.5 }, biceps: { biceps: 1 }, triceps: { triceps: 1 },
};
const MAJOR = ["chest", "back", "quads", "hams", "glutes", "delts", "biceps", "triceps"];
const MAJOR_GENERAL = ["chest", "back", "quads", "hams", "delts"];   // arms get enough from presses and rows for general fitness

function workoutPersonas() {
  const out = [];
  const homes = { gym: { where: "gym" }, homefull: { where: "home", home: ["db_full", "bench", "pu", "band"] }, homelight: { where: "home", home: ["db_light", "band"] }, bw: { where: "home", home: ["none"] } };
  ["muscle", "strength", "fatloss", "general"].forEach(goal => ["1", "2", "3"].forEach(experience => ["2", "3", "4", "5", "6"].forEach(days => ["30", "45", "60", "75"].forEach(time => Object.entries(homes).forEach(([hk, h]) => {
    out.push({ a: { goal, experience, days, time, ...h, around: ["none"], emphasis: "none" }, tag: `${goal}, level ${experience}, ${days} days, ${time} min, ${hk}` });
  })))));
  // emphasis + injuries
  ["upper", "lower", "arms", "glutes", "core"].forEach(emphasis => ["3", "4", "5"].forEach(days => out.push({ a: { goal: "muscle", experience: "2", days, time: "60", where: "gym", around: ["none"], emphasis }, tag: `muscle, ${emphasis} focus, ${days} days` })));
  ["shoulders", "lowback", "knees", "wrists", "pelvic"].forEach(x => ["3", "4", "5"].forEach(days => out.push({ a: { goal: "muscle", experience: "2", days, time: "60", where: "gym", around: [x], emphasis: "none" }, tag: `muscle, around ${x}, ${days} days` })));
  // pregnancy
  [8, 18, 24, 33].forEach(wk => ["1", "2", "3"].forEach(pre => ["3", "4", "5"].forEach(days => ["gym", "homefull"].forEach(hk => ["strength", "general", "fatloss"].forEach(goal =>
    out.push({ a: { goal, experience: pre, days, time: "45", ...homes[hk], around: ["pregnant"], dueDate: dueIn(wk), prePreg: pre, emphasis: "none" }, preg: wk, tag: `pregnant ${wk} wk, trained ${pre}, ${days} days, ${hk}, ${goal}` }))))));
  // postpartum
  ["6w", "3m", "6m"].forEach(since => ["3", "4"].forEach(days => ["gym", "homelight"].forEach(hk => ["general", "fatloss"].forEach(goal =>
    out.push({ a: { goal, experience: "2", days, time: "45", ...homes[hk], around: ["postpartum"], since, emphasis: "none" }, pp: since, tag: `postpartum ${since}, ${days} days, ${hk}, ${goal}` })))));
  return out;
}

function restOf(name, goal) { const x = E.BY_NAME[name]; const big = x && x.c && x.d >= 3; return goal === "strength" ? (big ? 180 : 90) : goal === "fatloss" ? (big ? 90 : 60) : (big ? 120 : 75); }

function auditWorkouts() {
  const ps = workoutPersonas();
  ps.forEach(({ a, tag, preg, pp }) => {
    const plan = E.generate(a);
    const issues = E.audit(plan);
    rec("w-rules", issues.length ? "fail" : "pass", `${tag}: ${issues.slice(0, 2).join("; ")}`);
    const lifting = plan.days.filter(d => !d.rest);
    const level = +a.experience;

    // weekly sets per muscle, week 2 (a normal working week), and frequency
    const vol = {}, freq = {};
    MAJOR.forEach(m => { vol[m] = 0; freq[m] = 0; });
    lifting.forEach(d => {
      const today = {};
      (d.ex || []).forEach(e => {
        const x = E.BY_NAME[e.n]; if (!x || !MUSC[x.p]) return;
        const s = e.wk[1].s;
        Object.entries(MUSC[x.p]).forEach(([m, w]) => { vol[m] += s * w; today[m] = (today[m] || 0) + s * w; });
      });
      Object.entries(today).forEach(([m, v]) => { if (v >= 1.5) freq[m]++; });
    });
    const volStr = MAJOR.map(m => `${m} ${vol[m]}`).join(", ");
    if (!plan.mode || plan.mode === "normal") {
      if (a.goal === "muscle") {
        const min = m => (["biceps", "triceps"].includes(m) ? (level === 1 ? 3 : 6) : level === 1 ? 6 : 10);
        const low = MAJOR.filter(m => vol[m] < min(m)), veryLow = MAJOR.filter(m => vol[m] < min(m) * 0.6), high = MAJOR.filter(m => vol[m] > 25);
        const bwOnly = a.home && a.home.includes("none");
        rec("w-volume-muscle", !low.length && !high.length ? "pass" : (!veryLow.length && !high.length) || bwOnly ? "warn" : "fail", `${tag}: ${low.length ? "low " + low.join("/") : ""}${high.length ? " high " + high.join("/") : ""} (${volStr})`);
      } else {
        const low = MAJOR_GENERAL.filter(m => vol[m] < 4);
        rec("w-volume-other", !low.length ? "pass" : low.length <= 1 ? "warn" : "fail", `${tag}: low ${low.join("/")} (${volStr})`);
      }
      if (+a.days >= 3) {
        const once = MAJOR_GENERAL.filter(m => freq[m] < 2);
        rec("w-frequency", !once.length ? "pass" : once.length <= 1 ? "warn" : "fail", `${tag}: only once a week for ${once.join("/")}`);
      }
    }

    // reps
    const mains = []; let badReps = [];
    lifting.forEach(d => (d.ex || []).forEach((e, i) => {
      const x = E.BY_NAME[e.n]; if (!x || x.p === "cond" || x.p === "core" || x.p === "pfwarm" || x.p === "calves") return;
      e.wk.forEach(w => { if (/s$|min/.test(String(w.r))) return; const r = parseInt(w.r, 10); if (/^\d/.test(w.r) && (r < 1 || r > 30)) badReps.push(`${e.n} ${w.r}`); });
      if (x.c && i < 2) mains.push(e);
    }));
    if (a.goal === "strength" && plan.mode === "normal") {
      const heavy = mains.some(e => e.wk.some(w => parseInt(w.r, 10) <= 6));
      rec("w-reps", heavy && !badReps.length ? "pass" : "fail", `${tag}: ${heavy ? "" : "no main lift ever goes to 6 reps or fewer"} ${badReps.join(", ")}`);
    } else rec("w-reps", !badReps.length ? "pass" : "fail", `${tag}: ${badReps.join(", ")}`);

    // progression + deload
    if (plan.mode !== "recovery") {
      let ok = true, why = [];
      lifting.forEach(d => (d.ex || []).forEach(e => {
        if (!e.wk || e.wk.length < 4 || e.type) return;
        const s = e.wk.map(w => w.s);
        if (s[3] > s[2]) { ok = false; why.push(`${e.n} week 4 has more sets than week 3`); }
      }));
      const notes = plan.weekNotes || [];
      if (!/lighter|deload|drop the weight/i.test(notes[3] || "")) { ok = false; why.push("week 4 note isn't a deload"); }
      if (!/heav|harder/i.test((notes[1] || "") + (notes[2] || ""))) { ok = false; why.push("weeks 2–3 don't ask for more"); }
      rec("w-progression", ok ? "pass" : "fail", `${tag}: ${why.slice(0, 2).join("; ")}`);
      rec("w-effort", notes.slice(0, 3).every(n => /in the tank|failure|reps left/i.test(n)) ? "pass" : "warn", `${tag}: notes "${notes.slice(0, 3).join(" | ")}"`);
    }

    // time: each lifting day at realistic rest
    lifting.forEach((d, i) => {
      if (!d.ex || d.ex.some(e => e.type)) return;
      const mins = 8 + d.ex.reduce((s, e) => s + (e.wk[1].s || 0) * (40 + restOf(e.n, a.goal)) / 60, 0);
      rec("w-time", mins <= +a.time + 10 ? "pass" : mins <= +a.time + 15 ? "warn" : "fail", `${tag}, ${d.name}: about ${Math.round(mins)} min`);
    });

    if (preg) {
      const txt = JSON.stringify(plan.notes) + " " + (plan.warning || "");
      rec("w-preg-aerobic", /150 minutes|aerobic|walk/i.test(txt) ? "pass" : "fail", `${tag}: notes don't mention weekly aerobic activity`);
      const signs = ["bleeding", "contractions", "fluid", "dizz", "headache", "chest pain", "weakness", "calf", "shortness of breath"];
      const miss = signs.filter(s => !new RegExp(s, "i").test(plan.warning || ""));
      rec("w-preg-warning", !miss.length ? "pass" : "fail", `${tag}: missing ${miss.join(", ")}`);
    }
    if (pp === "6w") {
      const impact = lifting.some(d => (d.ex || []).some(e => { const x = E.BY_NAME[e.n]; return x && x.f.includes("impact"); }));
      rec("w-pp-impact", impact ? "fail" : "pass", `${tag}`);
    }
  });
  return ps.length;
}

/* ---------------- run ---------------- */
const counts = { nutrition: auditNutrition(), meals: auditMeals(), workouts: auditWorkouts() };
const list = Object.values(checks);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ today: TODAY, counts, sources: SRC, checks: list }, null, 1));
} else {
  console.log(`Plans tested: ${counts.nutrition} nutrition profiles, ${counts.meals} meal-plan weeks, ${counts.workouts} workout plans\n`);
  list.forEach(c => {
    const tot = c.pass + c.warn + c.fail;
    const st = c.fail ? "FAIL" : c.warn ? "WARN" : "PASS";
    console.log(`${st.padEnd(4)}  ${c.id.padEnd(18)} ${c.pass}/${tot} pass${c.warn ? `, ${c.warn} warn` : ""}${c.fail ? `, ${c.fail} fail` : ""}`);
    c.examples.slice(0, 3).forEach(e => console.log(`        ${e.status}: ${e.example}`));
  });
}
