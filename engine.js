/* Adonis plan engine: builds a 4-week plan from the questionnaire with fixed training rules.
   Shared by index.html (the app) and lab.html (the Plan Lab). No network, no AI. */
(function (root) {
"use strict";

/* ---------- equipment tokens ----------
   bb = barbell + rack, db = any dumbbells (light set OK), dbh = full dumbbell set (heavy),
   bench, cab = cables or machines, pu = pull-up bar, band = resistance bands, mb = medicine/slam ball.
   Bodyweight is always available. */
const GYM = ["bb", "db", "dbh", "bench", "cab", "pu", "band", "mb", "kb"];

/* ---------- flags ----------
   supine = lying on your back; prone = lying on your belly; impact = jumping/landing or slamming;
   fall = real fall risk; balance = single-leg balance under load; ab = direct abdominal work;
   crunch = trunk-flexion ab work; plank = plank-style bracing; lowback, knee, shoulder, wrist = joint stress. */

/* name, pattern, equipment needed (all of), difficulty 1-5, flags, compound */
const L = (n, p, eq, d, f, c) => ({ n, p, eq, d, f: f || [], c: !!c });
const LIB = [
  // squat
  L("Bodyweight Squat", "squat", [], 1, [], 1),
  L("Banded Squat", "squat", ["band"], 2, [], 1),
  L("Goblet Squat", "squat", ["db"], 2, [], 1),
  L("Leg Press", "squat", ["cab"], 2, [], 1),
  L("Tempo Goblet Squat (3s down)", "squat", ["db"], 3, [], 1),
  L("Dumbbell Front Squat", "squat", ["dbh"], 3, [], 1),
  L("Hack Squat", "squat", ["cab"], 3, [], 1),
  L("Barbell Back Squat", "squat", ["bb"], 4, ["lowback"], 1),
  L("Barbell Front Squat", "squat", ["bb"], 5, ["wrist"], 1),
  L("Jump Squat", "squat", [], 3, ["impact", "knee", "fall"], 0),
  // hinge
  L("Banded Good Morning", "hinge", ["band"], 1, [], 1),
  L("Glute Bridge", "hinge", [], 1, ["supine"], 0),
  L("Cable Pull Through", "hinge", ["cab"], 2, [], 1),
  L("Dumbbell Romanian Deadlift", "hinge", ["db"], 2, [], 1),
  L("Dumbbell Hip Thrust", "hinge", ["db", "bench"], 3, ["bellyload"], 1),
  L("Single-Leg Dumbbell RDL", "hinge", ["db"], 3, ["balance"], 1),
  L("Back Extension", "hinge", ["cab"], 3, ["lowback", "prone"], 0),
  L("Barbell Romanian Deadlift", "hinge", ["bb"], 4, ["lowback"], 1),
  L("Barbell Hip Thrust", "hinge", ["bb", "bench"], 4, ["bellyload"], 1),
  L("Barbell Deadlift", "hinge", ["bb"], 5, ["lowback"], 1),
  // single-leg
  L("Split Squat", "lunge", [], 1, ["knee"], 1),
  L("Step-Up", "lunge", ["bench"], 2, ["knee", "balance"], 1),
  L("Reverse Lunge", "lunge", [], 2, ["knee"], 1),
  L("Dumbbell Reverse Lunge", "lunge", ["db"], 3, ["knee"], 1),
  L("Dumbbell Step-Up", "lunge", ["db", "bench"], 3, ["knee", "balance"], 1),
  L("Bulgarian Split Squat", "lunge", ["db", "bench"], 4, ["knee", "balance"], 1),
  L("Dumbbell Walking Lunge", "lunge", ["dbh"], 4, ["knee", "balance"], 1),
  // quad isolation
  L("Wall Sit", "quad_iso", [], 1, [], 0),
  L("Heel-Elevated Goblet Squat", "quad_iso", ["db"], 2, ["knee"], 0),
  L("Leg Extension", "quad_iso", ["cab"], 2, ["knee"], 0),
  // hamstring isolation
  L("Standing Banded Leg Curl", "ham_iso", ["band"], 1, [], 0),
  L("Seated Leg Curl", "ham_iso", ["cab"], 2, [], 0),
  L("Lying Leg Curl", "ham_iso", ["cab"], 2, ["prone"], 0),
  L("Dumbbell Leg Curl (on bench)", "ham_iso", ["db", "bench"], 2, ["prone"], 0),
  L("Slider Hamstring Curl", "ham_iso", [], 3, ["supine"], 0),
  // glutes
  L("Side-Lying Leg Raise", "glute", [], 1, [], 0),
  L("Banded Lateral Walk", "glute", ["band"], 1, [], 0),
  L("Banded Glute Kickback", "glute", ["band"], 1, [], 0),
  L("Single-Leg Hip Thrust", "glute", ["bench"], 2, [], 0),
  L("Hip Abduction Machine", "glute", ["cab"], 2, [], 0),
  L("Cable Kickback", "glute", ["cab"], 2, [], 0),
  // horizontal push
  L("Banded Chest Press", "h_push", ["band"], 1, [], 1),
  L("Incline Push Up", "h_push", [], 1, [], 1),
  L("Wall Push Up", "h_push", [], 1, [], 1),
  L("Dumbbell Floor Press", "h_push", ["db"], 2, ["supine"], 1),
  L("Machine Chest Press", "h_push", ["cab"], 2, [], 1),
  L("Push Up", "h_push", [], 2, ["wrist"], 1),
  L("Dumbbell Bench Press", "h_push", ["dbh", "bench"], 3, ["supine"], 1),
  L("Decline Push Up", "h_push", ["bench"], 3, ["wrist", "headdown"], 1),
  L("Barbell Bench Press", "h_push", ["bb", "bench"], 4, ["supine"], 1),
  L("Decline Bench Press", "h_push", ["bb", "bench"], 4, ["supine"], 1),
  // incline push
  L("Incline Push Up", "incline_push", [], 1, [], 1),
  L("Incline Machine Press", "incline_push", ["cab"], 2, [], 1),
  L("Incline Dumbbell Press", "incline_push", ["db", "bench"], 3, [], 1),
  L("Incline Barbell Press", "incline_push", ["bb", "bench"], 4, [], 1),
  // vertical push
  L("Banded Overhead Press", "v_push", ["band"], 1, [], 1),
  L("Seated Dumbbell Shoulder Press", "v_push", ["db"], 2, [], 1),
  L("Machine Shoulder Press", "v_push", ["cab"], 2, [], 1),
  L("Standing Dumbbell Press", "v_push", ["dbh"], 3, [], 1),
  L("Pike Push Up", "v_push", [], 3, ["wrist", "shoulder"], 1),
  L("Barbell Overhead Press", "v_push", ["bb"], 4, ["lowback"], 1),
  // horizontal pull
  L("Doorframe Row", "h_pull", [], 1, [], 1),
  L("Banded Row", "h_pull", ["band"], 1, [], 1),
  L("One-Arm Dumbbell Row", "h_pull", ["db"], 2, [], 1),
  L("Seated Cable Row", "h_pull", ["cab"], 2, [], 1),
  L("Chest-Supported Dumbbell Row", "h_pull", ["db", "bench"], 3, ["prone"], 1),
  L("Bent-Over Dumbbell Row", "h_pull", ["dbh"], 3, ["lowback"], 1),
  L("Barbell Row", "h_pull", ["bb"], 4, ["lowback"], 1),
  // vertical pull
  L("Banded Lat Pulldown", "v_pull", ["band"], 1, [], 1),
  L("Lat Pulldown", "v_pull", ["cab"], 2, [], 1),
  L("Straight-Arm Pulldown", "v_pull", ["cab"], 2, [], 0),
  L("Band-Assisted Pull Up", "v_pull", ["pu", "band"], 2, [], 1),
  L("Negative Chin Up", "v_pull", ["pu"], 2, [], 1),
  L("Chin Up", "v_pull", ["pu"], 4, [], 1),
  L("Pull Up", "v_pull", ["pu"], 5, [], 1),
  // chest isolation
  L("Isometric Palm Press", "chest_iso", [], 1, [], 0),
  L("Banded Chest Fly", "chest_iso", ["band"], 1, [], 0),
  L("Cable/Machine Fly", "chest_iso", ["cab"], 2, [], 0),
  L("Dumbbell Fly", "chest_iso", ["db", "bench"], 2, ["supine", "shoulder"], 0),
  // shoulders
  L("Banded Lateral Raise", "lat_raise", ["band"], 1, [], 0),
  L("Dumbbell Lateral Raise", "lat_raise", ["db"], 2, [], 0),
  L("Dumbbell Front Raise", "lat_raise", ["db"], 2, [], 0),
  L("Cable Lateral Raise", "lat_raise", ["cab"], 3, [], 0),
  L("Band Pull-Apart", "rear_delt", ["band"], 1, [], 0),
  L("Prone Y-T Raise", "rear_delt", [], 1, ["prone"], 0),
  L("Reverse Fly", "rear_delt", ["db"], 2, [], 0),
  L("Face Pull", "rear_delt", ["cab"], 2, [], 0),
  L("Upright Row", "rear_delt", ["db"], 3, ["shoulder"], 0),
  // biceps
  L("Towel Isometric Curl", "biceps", [], 1, [], 0),
  L("Banded Curl", "biceps", ["band"], 1, [], 0),
  L("Dumbbell Curl", "biceps", ["db"], 1, [], 0),
  L("Hammer Curl", "biceps", ["db"], 2, [], 0),
  L("Cable Curl", "biceps", ["cab"], 2, [], 0),
  L("Incline Dumbbell Curl", "biceps", ["db", "bench"], 3, [], 0),
  L("Barbell Curl", "biceps", ["bb"], 3, ["wrist"], 0),
  L("Drag Curl", "biceps", ["bb"], 3, ["wrist"], 0),
  // triceps
  L("Banded Pressdown", "triceps", ["band"], 1, [], 0),
  L("Wall Triceps Extension", "triceps", [], 2, [], 0),
  L("Overhead Dumbbell Extension", "triceps", ["db"], 2, [], 0),
  L("Rope Pressdown", "triceps", ["cab"], 2, [], 0),
  L("Bench Dip", "triceps", ["bench"], 2, ["shoulder", "wrist"], 0),
  L("Close-Grip Push Up", "triceps", [], 3, ["wrist"], 0),
  L("Skull Crushers", "triceps", ["db", "bench"], 3, ["supine", "wrist"], 0),
  L("Dips", "triceps", ["cab"], 4, ["shoulder"], 0),
  // core
  L("Dead Bug", "core", [], 1, ["ab", "supine"], 0),
  L("Bird Dog", "core", [], 1, ["ab"], 0),
  L("Banded Pallof Press", "core", ["band"], 2, ["ab"], 0),
  L("Cable Pallof Press", "core", ["cab"], 2, ["ab"], 0),
  L("Suitcase Carry", "core", ["db"], 2, ["ab"], 0),
  L("Side Plank", "core", [], 2, ["ab", "plank"], 0),
  L("Plank", "core", [], 2, ["ab", "plank"], 0),
  L("Hanging Knee Raise", "core", ["pu"], 3, ["ab", "crunch"], 0),
  L("Cable Crunch", "core", ["cab"], 3, ["ab", "crunch"], 0),
  // calves
  L("Standing Calf Raise", "calves", [], 1, [], 0),
  L("Dumbbell Calf Raise", "calves", ["db"], 2, [], 0),
  L("Machine Calf Raise", "calves", ["cab"], 2, [], 0),
  // conditioning finishers
  L("Marching High Knees", "cond", [], 1, [], 0),
  L("Shadow Boxing", "cond", [], 1, [], 0),
  L("Bike or Rower Intervals", "cond", ["cab"], 2, [], 0),
  L("Med Ball Chest Pass", "cond", ["mb"], 2, [], 0),
  L("Dumbbell Thrusters", "cond", ["db"], 3, [], 0),
  L("Jumping Jacks", "cond", [], 2, ["impact"], 0),
  L("Mountain Climbers", "cond", [], 2, ["impact", "plank", "ab"], 0),
  L("Med Ball Slam", "cond", ["mb"], 3, ["impact"], 0),
  L("Burpees", "cond", [], 3, ["impact", "fall", "plank"], 0),
  // pelvic floor
  L("Connection Breath", "pf", [], 1, [], 0),
  L("Quick Kegels", "pf", [], 1, [], 0),
  L("Long-Hold Kegels", "pf", [], 1, [], 0),
  L("Heel Slides", "pf", [], 1, ["supine"], 0),
  L("Bridge with Exhale", "pf", [], 1, ["supine"], 0),
  L("Clamshell", "pf", [], 1, [], 0),
  L("Daily Walk", "pf", [], 1, [], 0),
  L("Pelvic Floor Warm-Up", "pfwarm", [], 1, [], 0),
];
const BY_NAME = {};
LIB.forEach(x => { if (!BY_NAME[x.n]) BY_NAME[x.n] = x; });

/* If nothing fits a slot, try these patterns instead (in order). */
const FALLBACK = {
  squat: ["lunge", "quad_iso"], hinge: ["glute"], lunge: ["squat", "glute"], quad_iso: ["squat", "glute"],
  ham_iso: ["hinge", "glute"], glute: ["hinge"], h_push: ["incline_push"], incline_push: ["h_push"],
  v_push: ["incline_push", "lat_raise"], h_pull: ["v_pull"], v_pull: ["h_pull"], chest_iso: ["h_push"],
  lat_raise: ["v_push"], rear_delt: ["h_pull"], biceps: ["h_pull"], triceps: ["h_push"],
  core: [], calves: [], cond: []
};

/* ---------- splits ----------
   Each day: name, type (upper/lower/full) and a long slot list; time decides how many are used. */
const D = (name, type, slots) => ({ name, type, slots });
const SPLITS = {
  2: { label: "Full body, 2 days", on: [1, 4], days: [
    D("Full body A", "full", ["squat", "h_push", "h_pull", "hinge", "v_push", "biceps", "triceps", "core", "calves"]),
    D("Full body B", "full", ["hinge", "v_pull", "incline_push", "lunge", "lat_raise", "ham_iso", "core", "rear_delt"])]},
  "3f": { label: "Full body, 3 days", on: [1, 3, 5], days: [
    D("Full body A", "full", ["squat", "h_push", "h_pull", "ham_iso", "lat_raise", "triceps", "biceps", "core", "calves"]),
    D("Full body B", "full", ["hinge", "v_pull", "incline_push", "lunge", "chest_iso", "biceps", "lat_raise", "core", "rear_delt"]),
    D("Full body C", "full", ["squat", "h_push", "h_pull", "hinge", "v_push", "triceps", "rear_delt", "biceps", "core"])]},
  "3p": { label: "Push / pull / legs", on: [1, 3, 5], days: [
    D("Push", "upper", ["h_push", "v_push", "incline_push", "lat_raise", "triceps", "chest_iso", "triceps"]),
    D("Pull", "upper", ["h_pull", "v_pull", "h_pull", "rear_delt", "biceps", "biceps", "core"]),
    D("Legs", "lower", ["squat", "hinge", "lunge", "ham_iso", "quad_iso", "calves", "core"])]},
  4: { label: "Upper / lower, 4 days", on: [1, 2, 4, 5], days: [
    D("Upper A", "upper", ["h_push", "h_pull", "v_push", "v_pull", "chest_iso", "lat_raise", "triceps", "biceps", "core"]),
    D("Lower A", "lower", ["squat", "hinge", "lunge", "quad_iso", "ham_iso", "calves", "core"]),
    D("Upper B", "upper", ["incline_push", "h_pull", "v_pull", "chest_iso", "lat_raise", "rear_delt", "biceps", "triceps", "core"]),
    D("Lower B", "lower", ["hinge", "squat", "glute", "lunge", "ham_iso", "core", "calves"])]},
  5: { label: "Upper / lower + push / pull / legs, 5 days", on: [1, 2, 4, 5, 6], days: [
    D("Upper", "upper", ["h_push", "h_pull", "v_push", "v_pull", "lat_raise", "biceps", "triceps", "core"]),
    D("Lower", "lower", ["squat", "hinge", "lunge", "ham_iso", "calves", "core", "glute"]),
    D("Push", "upper", ["incline_push", "v_push", "h_push", "chest_iso", "lat_raise", "triceps", "triceps"]),
    D("Pull", "upper", ["v_pull", "h_pull", "rear_delt", "h_pull", "biceps", "biceps", "core"]),
    D("Legs", "lower", ["hinge", "squat", "glute", "quad_iso", "ham_iso", "lunge", "calves"])]},
  6: { label: "Push / pull / legs, twice a week", on: [1, 2, 3, 4, 5, 6], days: [
    D("Push A", "upper", ["h_push", "v_push", "incline_push", "lat_raise", "chest_iso", "triceps", "triceps"]),
    D("Pull A", "upper", ["h_pull", "v_pull", "h_pull", "rear_delt", "biceps", "biceps", "core"]),
    D("Legs A", "lower", ["squat", "hinge", "lunge", "ham_iso", "quad_iso", "calves", "glute"]),
    D("Push B", "upper", ["v_push", "incline_push", "h_push", "lat_raise", "triceps", "chest_iso", "core"]),
    D("Pull B", "upper", ["v_pull", "h_pull", "rear_delt", "biceps", "core", "biceps", "v_pull"]),
    D("Legs B", "lower", ["hinge", "squat", "ham_iso", "glute", "lunge", "calves", "core"])]},
};

const EMPHASIS = {
  upper: { days: ["upper", "full"], p: ["v_pull", "v_push"] },
  lower: { days: ["lower", "full"], p: ["lunge", "squat"] },
  arms: { days: ["upper", "full"], p: ["biceps", "triceps"] },
  glutes: { days: ["lower", "full"], p: ["glute", "hinge"] },
  core: { days: ["upper", "lower", "full"], p: ["core"] },
};

const TIME_SLOTS = { 30: 4, 45: 5, 60: 6, 75: 7 };
const SETS = { 1: [2, 3, 3, 2], 2: [3, 3, 4, 2], 3: [3, 4, 4, 3] };
const ISO_SETS = { 1: [2, 3, 3, 2], 2: [3, 3, 3, 2], 3: [3, 3, 4, 2] };   // isolation work: enough to grow, not junk volume
const ADV_WEEK_NOTES = [
  "Moderate. Leave about 2 reps in the tank on every set.",
  "Heavier than week 1. Leave 1 to 2 reps in the tank.",
  "Hardest week. Main lifts: 1 rep in the tank. Isolation work: take the last set to failure, safely.",
  "Deload. Drop the weight about 10% and do one less set. You'll come back stronger next block."
];
const REPS = {
  muscle:   { c: ["8-10", "8-10", "6-8", "10-12"], a: ["10-12", "10-12", "8-10", "12-15"] },
  strength: { c: ["6", "5", "4", "8"], a: ["10", "10", "8", "12"] },
  fatloss:  { c: ["12", "12", "10", "15"], a: ["15", "15", "12", "15"] },
  general:  { c: ["8-10", "8-10", "8", "10-12"], a: ["12", "12", "10", "15"] },
};
const WEEK_NOTES = [
  "Moderate weight. Finish each set with 2-3 good reps left in the tank.",
  "Go a little heavier than week 1.",
  "Heaviest week. Push hard with good form.",
  "Lighter week. Drop the weight about 10% and focus on clean reps."
];
const PREG_WEEK_NOTES = [
  "Moderate weight. Keep breathing through every rep and stop with 2-3 reps in the tank.",
  "Go a little heavier if it feels good. Never hold your breath to grind out a rep.",
  "Hardest week. Push, but always keep 2 reps in the tank. Tap Easier any time.",
  "Lighter week. Drop the weight about 10% and move well."
];

const PREG_WARNING = "Stop and call your OB or midwife if you notice vaginal bleeding, regular painful contractions, fluid leaking, dizziness or feeling faint, a headache, chest pain, muscle weakness that affects your balance, calf pain or swelling, or shortness of breath before you start.";

/* Trimester the plan must be safe for: the one reached by the END of the 4-week block,
   worked out from the due date (or an older plan's trimester answer). */
function addDaysISO(iso, n) { const [y, m, d] = iso.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function trimesterFor(a) {
  if (a.dueDate) {
    const end = addDaysISO(a.start || todayISO(), 27);
    const [y1, m1, d1] = a.dueDate.split("-").map(Number), [y2, m2, d2] = end.split("-").map(Number);
    const weeks = 40 - (Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2)) / 864e5 / 7;
    return weeks < 14 ? 1 : weeks < 28 ? 2 : 3;
  }
  return +a.trimester || 1;
}

/* ---------- context: what this person can and can't do ---------- */
function context(a) {
  const ctx = { eq: new Set(), block: new Set(), maxD: 5, level: +a.experience || 1, intensity: +a.experience || 1, notes: [], mode: "normal" };
  if (a.where === "gym") GYM.forEach(t => ctx.eq.add(t));
  else (a.home || []).forEach(t => {
    if (t === "db_light") ctx.eq.add("db");
    else if (t === "db_full") { ctx.eq.add("db"); ctx.eq.add("dbh"); }
    else if (t !== "none") ctx.eq.add(t);
  });
  const around = new Set(a.around || []);
  if (around.has("shoulders")) ctx.block.add("shoulder");
  if (around.has("lowback")) ctx.block.add("lowback");
  if (around.has("knees")) ctx.block.add("knee");
  if (around.has("wrists")) ctx.block.add("wrist");
  if (around.has("pelvic")) { ctx.block.add("impact"); ctx.block.add("crunch"); ctx.pf = true; }
  if (around.has("pregnant")) {
    ctx.mode = "pregnant";
    ["impact", "fall", "ab", "crunch", "plank", "headdown"].forEach(f => ctx.block.add(f));
    const tri = trimesterFor(a);
    if (tri >= 2) { ctx.block.add("supine"); ctx.block.add("prone"); ctx.block.add("bellyload"); }
    if (tri >= 3) ctx.block.add("balance");
    ctx.intensity = +a.prePreg || 2;
    ctx.pf = true;
  }
  if (around.has("postpartum")) {
    const pp = a.since || "6w";
    if (pp === "lt6") ctx.mode = "recovery";
    else {
      ctx.mode = "postpartum";
      ctx.block.add("crunch");
      if (pp === "6w") { ctx.block.add("ballistic"); ctx.condMax = 2; ctx.level = Math.min(ctx.level, 1); ctx.block.add("impact"); ctx.block.add("plank"); ctx.maxD = 3; ctx.intensity = Math.min(ctx.intensity, 1); }
      if (pp === "3m") { ctx.level = Math.min(ctx.level, 2); ctx.block.add("impact"); ctx.maxD = 4; ctx.intensity = Math.min(ctx.intensity, 2); }
    }
    ctx.pf = true;
  }
  return ctx;
}
function fits(x, ctx) {
  if (x.d > ctx.maxD) return false;
  if (!x.eq.every(t => ctx.eq.has(t))) return false;
  if (x.f.some(f => ctx.block.has(f))) return false;
  return true;
}
const COMPOUND_P = new Set(["squat", "hinge", "lunge", "h_push", "incline_push", "v_push", "h_pull", "v_pull"]);
function targetD(ctx, pattern) {
  if (pattern === "cond") return Math.min(ctx.condMax || 5, { 1: 1, 2: 2, 3: 3 }[ctx.level] || 2);
  if (!COMPOUND_P.has(pattern)) return Math.min(ctx.maxD, ctx.level >= 3 ? 2.5 : 2);
  return Math.min(ctx.maxD, { 1: 2, 2: 3, 3: 4 }[ctx.level] || 2);
}

function pickFor(pattern, ctx, used, dayUsed, tried) {
  tried = tried || new Set();
  if (tried.has(pattern)) return null;
  tried.add(pattern);
  const t = targetD(ctx, pattern);
  const c = LIB.map((x, i) => [x, i]).filter(([x]) => x.p === pattern && fits(x, ctx) && !dayUsed.has(x.n) && !(pattern === "cond" && ctx.condMax && x.d > ctx.condMax));
  if (!c.length) {
    for (const fb of FALLBACK[pattern] || []) { const r = pickFor(fb, ctx, used, dayUsed, tried); if (r) return r; }
    return null;
  }
  c.sort((A, B) => {
    const [a, ia] = A, [b, ib] = B;
    // closest to the person's level, with a nudge toward variety across the week
    // equipped lifters get equipment-based accessories ahead of bodyweight fillers
    const bwPen = x => (x.eq.length === 0 && !x.c && ctx.eq.size >= 3 && pattern !== "cond" ? 0.75 : 0);
    const sa = Math.abs(a.d - t) + (a.d > t ? 0.5 : 0) + 1.25 * (used[a.n] || 0) + bwPen(a);
    const sb = Math.abs(b.d - t) + (b.d > t ? 0.5 : 0) + 1.25 * (used[b.n] || 0) + bwPen(b);
    if (sa !== sb) return sa - sb;
    if (a.c !== b.c) return a.c ? -1 : 1;                // prefer compound lifts
    return ia - ib;
  });
  return c[0][0];
}

/* ---------- prescriptions ---------- */
function prescribe(x, ctx, goal, idx) {
  let sets = (x.c ? SETS : ISO_SETS)[ctx.intensity] || SETS[2];
  // advanced, 3 days or fewer: each session carries more of the week, so main lifts get an extra set
  if (x.c && ctx.intensity >= 3 && ctx.fewDays) sets = sets.map(v => Math.min(5, v + 1));
  if (x.p === "cond") return sets.map(s => ({ s: Math.max(3, s + 1), r: "30s on, 30s off" }));
  if (x.p === "core") return sets.map(() => ({ s: 3, r: ["Plank"].includes(x.n) ? "30s" : ["Side Plank", "Suitcase Carry"].includes(x.n) ? "30s/side" : "10/side" }));
  if (x.p === "calves") return sets.map(s => ({ s, r: "15" }));
  if (x.p === "pfwarm") return [0, 1, 2, 3].map(() => ({ s: 1, r: "2 min" }));
  let g = goal === "fatloss" && ctx.mode === "pregnant" ? "general" : goal;
  let reps = (x.c && idx < 2 ? REPS[g].c : REPS[g].a).slice();
  if (ctx.mode === "pregnant" || ctx.mode === "postpartum") reps = reps.map(r => (/^\d+$/.test(r) ? String(Math.max(6, +r)) : r));
  if (["Wall Sit", "Isometric Palm Press"].includes(x.n)) reps = ["30s", "40s", "45s", "30s"];
  if (["Towel Isometric Curl"].includes(x.n)) reps = ["20s", "25s", "30s", "20s"];
  const out = sets.map((s, w) => ({ s, r: reps[w] }));
  // advanced lifters (not pregnant/postpartum): intensity techniques
  if (ctx.intensity >= 3 && ctx.mode === "normal") {
    if (!x.c && /^\d/.test(out[1].r)) { out[1].t = "Last set: go to failure, safely"; out[2].t = "Last set: go to failure, then drop the weight 25% and keep going (drop set)"; }
    if (x.c && idx === 0 && goal === "strength") { out[1].t = "Work up to one heavy top set, then do the rest about 10% lighter"; out[2].t = "Work up to one heavy top set, then do the rest about 10% lighter"; }
    if (x.c && idx === 0 && goal !== "strength") out[2].t = "Last set: as many good reps as you can";
  }
  return out;
}

const PF_NOTES = {
  "Connection Breath": "Breathe in and let your belly and pelvic floor relax. Breathe out and gently lift the pelvic floor.",
  "Quick Kegels": "Squeeze and lift quickly, then fully let go. Relaxing matters as much as squeezing.",
  "Long-Hold Kegels": "Squeeze and hold while breathing normally, then fully relax for the same time.",
  "Heel Slides": "On your back, exhale and gently lift the pelvic floor as you slide one heel out.",
  "Bridge with Exhale": "Exhale and lift the pelvic floor as you raise your hips. Inhale down.",
  "Clamshell": "Lying on your side, knees bent, open the top knee without rolling back.",
  "Daily Walk": "Easy pace. Stop if you have pain, heaviness or more bleeding.",
  "Pelvic Floor Warm-Up": "5 connection breaths, 10 quick Kegels, 5 long holds. Fully relax between each.",
};

function recoveryPlan(a) {
  const hold = ["3s hold", "5s hold", "7s hold", "10s hold"];
  const walk = ["10 min", "15 min", "20 min", "30 min"];
  const mk = (n, wk, note) => ({ n, bw: true, wk, note: note || PF_NOTES[n] || "" });
  const core = () => [
    mk("Connection Breath", [1, 1, 1, 1].map(() => ({ s: 1, r: "10 breaths" }))),
    mk("Quick Kegels", [1, 2, 2, 3].map(s => ({ s, r: "10 squeezes" }))),
    mk("Long-Hold Kegels", hold.map(r => ({ s: 1, r: "10 x " + r }))),
  ];
  const extra = [
    [mk("Heel Slides", [1, 2, 2, 2].map(s => ({ s, r: "8/side" })))],
    [mk("Clamshell", [1, 2, 2, 2].map(s => ({ s, r: "10/side" })))],
    [mk("Bridge with Exhale", [1, 2, 2, 3].map(s => ({ s, r: "8" })))],
  ];
  const days = [];
  for (let d = 0; d < 7; d++) {
    if (d === 6) { days.push({ name: "Rest", rest: true }); continue; }
    days.push({ name: "Pelvic floor + walk", ex: [...core(), ...extra[d % 3], mk("Daily Walk", walk.map(r => ({ s: 1, r })))] });
  }
  return {
    title: "Postpartum recovery: first 6 weeks", days, mode: "recovery",
    weekNotes: [
      "Gentle start. Short sessions, lots of rest.",
      "Holds get a little longer. Walk a bit farther if you feel good.",
      "Building. Keep relaxing fully between squeezes.",
      "Longest holds and walks. Ask about strength training at your postpartum checkup."
    ],
    notes: [
      "This isn't a lifting plan. Get cleared at your postpartum checkup (usually around 6 weeks) before strength training.",
      "After a C-section, follow your surgeon's guidance and skip anything that pulls on the incision.",
      "If you leak, feel heaviness or bulging, or have pain, ask for a referral to a pelvic floor physical therapist. It's common and very treatable.",
      "If Kegels cause pain or your pelvic floor feels tight, focus on the breathing and relaxing, and see a pelvic floor physical therapist."
    ],
  };
}

/* ---------- main ---------- */
function generate(a) {
  const ctx = context(a);
  const answersCopy = JSON.parse(JSON.stringify(a));
  if (ctx.mode === "recovery") {
    const p = recoveryPlan(a);
    return finish(p, a, ctx, answersCopy);
  }
  if (a.track === "functional") return finish(functionalPlan(a, ctx), a, ctx, answersCopy);
  if (a.track === "cardio") return finish(cardioPlan(a, ctx), a, ctx, answersCopy);
  if (a.track === "hybrid") return finish(hybridPlan(a, ctx), a, ctx, answersCopy);
  const goal = a.goal || "muscle";
  const nDays = +a.days || 3;
  const key = nDays === 3 ? "3f" : nDays;
  ctx.fewDays = nDays <= 3;  // 3 days: full body hits everything twice as often as push/pull/legs
  const split = SPLITS[key];
  // experienced lifters move faster between exercises, so fit one more in (not in a 30-minute session)
  const slots = (TIME_SLOTS[+a.time] || 5) + (ctx.level >= 3 && +a.time >= 45 ? 1 : 0);
  const used = {};
  const trainDays = split.days.map(t => ({ ...t, slots: t.slots.slice() }));

  // emphasis: one extra exercise on matching days, right after the first lift
  const em = EMPHASIS[a.emphasis];
  if (em) {
    let k = 0;
    trainDays.forEach(t => {
      if (!em.days.includes(t.type)) return;
      let pat = em.p[k % em.p.length];
      // arm work lands on the matching day: triceps with pushing, biceps with pulling
      if (a.emphasis === "arms" && /push|chest/i.test(t.name)) pat = "triceps";
      if (a.emphasis === "arms" && /pull|back/i.test(t.name)) pat = "biceps";
      t.slots.splice(a.emphasis === "arms" || pat === "core" ? 3 : 1, 0, pat); k++;
    });
  }

  const finisher = (goal === "fatloss" || goal === "general") && +a.time >= 45 && !a.noFinisher;
  const out = trainDays.map(t => {
    const dayUsed = new Set(), ex = [];
    const want = finisher ? slots - 1 : slots;
    for (const s of t.slots) {
      if (ex.length >= want) break;
      const x = pickFor(s, ctx, used, dayUsed);
      if (!x) continue;
      dayUsed.add(x.n); used[x.n] = (used[x.n] || 0) + 1;
      ex.push(x);
    }
    // never leave a day thin: top up with safe accessories for that kind of day
    const FILL = t.type === "lower" ? ["glute", "calves", "ham_iso", "quad_iso", "core"] : t.type === "upper" ? ["rear_delt", "lat_raise", "h_pull", "biceps", "triceps", "core"] : ["glute", "rear_delt", "calves", "core"];
    for (const s of FILL) {
      if (ex.length >= Math.min(want, 4)) break;
      const x = pickFor(s, ctx, used, dayUsed);
      if (x) { dayUsed.add(x.n); used[x.n] = (used[x.n] || 0) + 1; ex.push(x); }
    }
    if (finisher) { const f = pickFor("cond", ctx, used, dayUsed); if (f) { ex.push(f); used[f.n] = (used[f.n] || 0) + 1; } }
    const items = ex.map((x, i) => ({
      n: x.n, bw: x.eq.length === 0 && x.p !== "cond", wk: prescribe(x, ctx, goal, i),
      note: x.p === "cond" ? "Finisher. Rounds of 30 seconds hard, 30 seconds easy." : (x.n === "Single-Leg Dumbbell RDL" ? "Reps are for each leg" : (x.p === "lunge" ? "Reps are for each leg" : "")),
      ...(x.n === "Push Up" ? { amrap: true } : {})
    }));
    if (goal === "fatloss") {
      // superset the last two accessories (not the finisher)
      const acc = items.filter((it, i) => i >= 2 && !it.note.startsWith("Finisher"));
      if (acc.length >= 2) {
        const A = acc[acc.length - 2], B = acc[acc.length - 1];
        A.pair = "a"; B.pair = "b"; A.note = (A.note ? A.note + ". " : "") + "Superset with the next exercise";
      }
    }
    // keep the session inside the time they picked (estimate: ~40 s per set plus rest, plus a warm-up)
    const restOf = it => { const x = BY_NAME[it.n]; const big = x && x.c && x.d >= 3; return goal === "strength" ? (big ? 180 : 90) : goal === "fatloss" ? (big ? 90 : 60) : (big ? 120 : 75); };
    const est = () => 8 + items.reduce((a, it) => a + it.wk[0].s * (40 + restOf(it)) / 60, 0);
    while (items.length > 4 && est() > (+a.time || 45) + 3) { const k = items.length - 1 - (items[items.length - 1].note.startsWith("Finisher") ? 1 : 0); items.splice(k, 1); }
    if (ctx.pf) items.unshift({ n: "Pelvic Floor Warm-Up", bw: true, wk: prescribe(BY_NAME["Pelvic Floor Warm-Up"], ctx), note: PF_NOTES["Pelvic Floor Warm-Up"] });
    return { name: t.name, type: t.type, ex: items };
  });

  const days = [];
  let ti = 0;
  for (let d = 1; d <= 7; d++) {
    if (split.on.includes(d)) days.push(out[ti++]);
    else days.push({ name: "Active recovery", rest: true });
  }

  const notes = [];
  if (ctx.mode === "pregnant") {
    notes.push("Confirm this plan with your OB or midwife before you start.");
    if (goal === "fatloss") notes.push("Pregnancy isn't the time to cut, so this plan is set for strength and fitness instead of fat loss.");
    notes.push("No crunches, planks, jumping, slams or max-effort lifts." + (trimesterFor(a) >= 2 ? " Nothing lying flat on your back or belly." : ""));
  }
  if (ctx.mode === "postpartum") {
    notes.push("Make sure you've been cleared for exercise at your postpartum checkup.");
    if (a.since === "6w") notes.push("Rebuild phase: lighter loads, no planks, crunches or jumping yet. Leaking, heaviness or pain means ease off and see a pelvic floor physical therapist.");
    if (a.since === "3m") notes.push("Building phase: no crunches or jumping yet. Leaking, heaviness or pain means ease off and see a pelvic floor physical therapist.");
    if (a.since === "6m") notes.push("Impact work is back in, as long as you have no leaking, heaviness or pain.");
  }
  if (ctx.block.has("lowback") || ctx.block.has("knee") || ctx.block.has("shoulder") || ctx.block.has("wrist"))
    notes.push("Exercises that load the areas you flagged were left out. If something still hurts, tap Easier or skip it. This plan isn't medical advice.");

  const p = {
    title: split.label, days, mode: ctx.mode,
    weekNotes: ctx.mode === "pregnant" ? PREG_WEEK_NOTES : ctx.intensity >= 3 && ctx.mode === "normal" ? ADV_WEEK_NOTES : WEEK_NOTES,
    notes,
  };
  return finish(p, a, ctx, answersCopy);
}
function finish(p, a, ctx, answers) {
  p.version = 1;
  p.answers = answers;
  p.ctx = { eq: [...ctx.eq], block: [...ctx.block], maxD: ctx.maxD };
  p.warning = ctx.mode === "pregnant" ? PREG_WARNING : "";
  return p;
}

/* ======================= training styles beyond lifting ======================= */
function rng(seed) { let x = 0; for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
const ON = { 1: [1], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] };
function weekLayout(sessions, nDays) {
  const days = [], on = ON[nDays] || ON[3];
  let k = 0;
  for (let d = 1; d <= 7; d++) days.push(on.includes(d) ? sessions[k++] : { name: "Active recovery", rest: true });
  return days;
}
function safetyNotes(a, ctx) {
  const notes = [];
  if (ctx.mode === "pregnant") {
    notes.push("Confirm this plan with your OB or midwife before you start.");
    notes.push("Use the talk test: on hard efforts you should still be able to say a few words. No racing the clock, no jumping or slams." + (trimesterFor(a) >= 2 ? " Nothing lying flat on your back or belly." : ""));
  }
  if (ctx.mode === "postpartum") {
    notes.push("Make sure you've been cleared for exercise at your postpartum checkup.");
    if (a.since !== "6m") notes.push("No jumping or running yet. Leaking, heaviness or pain means ease off and see a pelvic floor physical therapist.");
  }
  if (["lowback", "knees", "shoulders", "wrists"].some(x => (a.around || []).includes(x)))
    notes.push("Moves that load the areas you flagged were left out. If something still hurts, skip it. This plan isn't medical advice.");
  return notes;
}
const lvlScale = ctx => ({ 1: 0.7, 2: 1, 3: 1.3 }[ctx.level] || 1);
const scaleReps = (r, f) => String(r).replace(/\d+/, n => String(Math.max(1, Math.round(+n * f))));

/* ---------- functional fitness: a strength piece plus a conditioning circuit ---------- */
const FM = (n, cat, eq, d, f, r) => ({ n, cat, eq, d, f: f || [], r });
const FLIB = [
  FM("Air Squat", "lower", [], 1, [], "15"), FM("Goblet Squat", "lower", ["db"], 2, [], "12"), FM("Kettlebell Swing", "lower", ["kb"], 3, ["ballistic"], "15"),
  FM("Walking Lunge", "lower", [], 2, ["knee", "balance"], "10/side"), FM("Box Step-Up", "lower", ["bench"], 2, ["knee", "balance"], "10/side"),
  FM("Glute Bridge", "lower", [], 1, ["supine"], "15"), FM("Dumbbell Thruster", "full", ["db"], 3, [], "10"), FM("Wall Ball", "full", ["mb"], 3, ["impact"], "12"),
  FM("Dumbbell Snatch", "full", ["dbh"], 4, ["ballistic"], "8/side"), FM("Burpee", "full", [], 3, ["impact", "fall", "plank"], "8"),
  FM("Push Up", "push", [], 2, ["wrist"], "10"), FM("Incline Push Up", "push", [], 1, [], "12"), FM("Dumbbell Push Press", "push", ["db"], 3, [], "10"),
  FM("One-Arm Dumbbell Row", "pull", ["db"], 2, [], "10/side"), FM("Renegade Row", "pull", ["db"], 4, ["plank", "ab", "wrist"], "8/side"),
  FM("Pull Up", "pull", ["pu"], 5, [], "5"), FM("Band-Assisted Pull Up", "pull", ["pu", "band"], 3, [], "6"), FM("Doorframe Row", "pull", [], 1, [], "12"), FM("Banded Row", "pull", ["band"], 1, [], "15"),
  FM("Row (machine)", "engine", ["cab"], 2, [], "12 calories"), FM("Bike (machine)", "engine", ["cab"], 1, [], "12 calories"),
  FM("Jumping Jacks", "engine", [], 1, ["impact"], "30"), FM("Mountain Climbers", "engine", [], 2, ["impact", "plank", "ab"], "20"),
  FM("Med Ball Slam", "engine", ["mb"], 3, ["impact"], "12"), FM("Shadow Boxing", "engine", [], 1, [], "30 seconds"), FM("Marching High Knees", "engine", [], 1, [], "30 seconds"),
  FM("Farmer Carry", "engine", ["db"], 2, [], "40 yards"),
  FM("Sit-Up", "core", [], 1, ["ab", "crunch", "supine"], "15"), FM("Plank Shoulder Taps", "core", [], 2, ["plank", "ab"], "20"), FM("Dead Bug", "core", [], 1, ["ab", "supine"], "10/side"),
  FM("Banded Pallof Press", "core", ["band"], 2, ["ab"], "10/side"), FM("Bird Dog", "core", [], 1, ["ab"], "10/side"),
];
const FM_BY = {}; FLIB.forEach(m => { FM_BY[m.n] = m; });
function pickMove(cat, ctx, used, R, week) {
  const c = FLIB.filter(m => m.cat === cat && fits(m, ctx) && !used.has(m.n));
  if (!c.length) return null;
  // closest to their level, spread across the week so circuits don't repeat
  const score = m => Math.abs(m.d - (ctx.level + 1)) + 1.6 * ((week && week[m.n]) || 0) + R() * 0.8;
  const sc = new Map(c.map(m => [m, score(m)]));
  c.sort((x, y) => sc.get(x) - sc.get(y));
  if (week) week[c[0].n] = (week[c[0].n] || 0) + 1;
  return c[0];
}
function circuit(ctx, i, maxMin, R, week) {
  const used = new Set(), cats = [["lower", "push", "engine", "core"], ["full", "pull", "engine", "lower"], ["lower", "push", "pull", "engine"]][i % 3];
  const moves = [];
  cats.forEach(cat => { const m = pickMove(cat, ctx, used, R, week) || pickMove("engine", ctx, used, R, week) || pickMove("lower", ctx, used, R, week); if (m) { used.add(m.n); moves.push(m); } });
  const f = lvlScale(ctx), careful = ctx.mode !== "normal", L = ctx.level;
  const mins = [[8, 12, 15], [10, 14, 16], [12, 15, 18], [6, 8, 10]].map(r => Math.min(maxMin, r[L - 1] || r[1]));
  const rounds = [3, 4, 5][L - 1] || 4;
  const fmt = careful
    ? [`AMRAP ${mins[0]} min`, `AMRAP ${mins[1]} min`, `AMRAP ${mins[2]} min`, `AMRAP ${mins[3]} min`]
    : [`AMRAP ${mins[0]} min`, `EMOM ${mins[1]} min`, `${rounds} rounds for time (cap ${mins[2]} min)`, `AMRAP ${mins[3]} min`];
  const how = careful
    ? ["Steady pace you could talk at. Rest whenever you need.", "Same moves, a little longer.", "Longest one. Keep the talk test.", "Short and easy."]
    : ["As many rounds as possible. Pick a pace you can hold.", "Every minute on the minute: one move per minute, rest what's left.", "Move fast, keep form. Log your time.", "Easy week: smooth, steady rounds."];
  const reps = w => moves.map(m => ({ n: m.n, r: scaleReps(m.r, w === 1 ? f * 0.6 : w === 3 ? f * 0.8 : f) }));
  return { type: "circuit", n: "Conditioning", moves: moves.map(m => m.n),
    wk: [0, 1, 2, 3].map(w => ({ s: 1, r: fmt[w], fmt: fmt[w], how: how[w], moves: reps(w), score: /for time/.test(fmt[w]) ? "time" : /AMRAP/.test(fmt[w]) ? "rounds" : "done" })) };
}
function strengthSets(ctx, x, goal) {
  const L = ctx.level, careful = ctx.mode === "pregnant" || ctx.mode === "postpartum";
  let t = { 1: [[3, "8"], [3, "8"], [4, "6"], [2, "8"]], 2: [[4, "6"], [4, "5"], [5, "4"], [3, "6"]], 3: [[5, "5"], [5, "4"], [5, "3"], [3, "5"]] }[L] || [[4, "6"], [4, "5"], [5, "4"], [3, "6"]];
  if (careful) t = t.map(([s, r]) => [s, String(Math.max(6, +r))]);
  if (!x.c) t = t.map(([s, r]) => [Math.min(s, 3), String(Math.max(+r, 10))]);
  return t.map(([s, r]) => ({ s, r }));
}
function functionalPlan(a, ctx) {
  const n = +a.days || 3, time = +a.time || 45, R = rng(JSON.stringify(a));
  const lifts = time <= 30 ? 1 : time >= 75 ? 3 : 2, metMax = time <= 30 ? 12 : time <= 45 ? 14 : time <= 60 ? 16 : 20;
  const FOCUS = [["squat", "h_push", "core"], ["hinge", "v_pull", "core"], ["lunge", "v_push", "core"], ["squat", "h_pull", "core"], ["hinge", "incline_push", "core"], ["squat", "v_pull", "core"]];
  const used = {}, sessions = [], week = {};
  for (let i = 0; i < n; i++) {
    const dayUsed = new Set(), ex = [];
    FOCUS[i % FOCUS.length].slice(0, lifts).forEach(pat => { const x = pickFor(pat, ctx, used, dayUsed); if (x) { dayUsed.add(x.n); used[x.n] = (used[x.n] || 0) + 1; ex.push({ n: x.n, bw: x.eq.length === 0, wk: strengthSets(ctx, x), note: x.p === "lunge" ? "Reps are for each leg" : "" }); } });
    const c = circuit(ctx, i, metMax, R, week);
    ex.push(c);
    if (ctx.pf) ex.unshift({ n: "Pelvic Floor Warm-Up", bw: true, wk: prescribe(BY_NAME["Pelvic Floor Warm-Up"], ctx), note: PF_NOTES["Pelvic Floor Warm-Up"] });
    sessions.push({ name: ["Squat + push", "Hinge + pull", "Lunge + press", "Squat + row", "Hinge + push", "Squat + pull"][i % 6], type: "full", ex });
  }
  return { title: `Functional fitness, ${n} days`, days: weekLayout(sessions, n), mode: ctx.mode, track: "functional",
    weekNotes: ctx.mode === "pregnant" ? PREG_WEEK_NOTES : ["Strength first, then the circuit. Leave 2 reps in the tank on the lifts.", "A little heavier on the lifts. Circuits switch to EMOM.", "Hardest week. Heaviest lifts, and race the clock on the circuit.", "Lighter week. Smooth lifts and a short circuit."],
    notes: safetyNotes(a, ctx) };
}

/* ---------- cardio and endurance ---------- */
const MODS = {
  run: { label: "Run", easy: "Easy run", int: (n, w, r) => `${n} × ${w} min hard, ${r} min easy jog`, unit: "mi" },
  bike: { label: "Bike", easy: "Easy ride", int: (n, w, r) => `${n} × ${w} min hard, ${r} min easy spin`, unit: "mi" },
  row: { label: "Row", easy: "Easy row", int: (n, w, r) => `${n} × ${w} min hard, ${r} min easy`, unit: "m" },
  swim: { label: "Swim", easy: "Easy swim", int: (n, w) => `${n * 2} × 50 yards hard, rest 30 seconds between`, unit: "yd" },
  walk: { label: "Walk", easy: "Brisk walk", int: (n, w, r) => `${n} × ${w} min fast or uphill, ${r} min easy`, unit: "mi" },
  elliptical: { label: "Elliptical", easy: "Easy elliptical", int: (n, w, r) => `${n} × ${w} min hard, ${r} min easy`, unit: "min" },
};
function cardioMods(a, ctx, notes) {
  let mods = (a.cardio || []).filter(m => MODS[m]);
  if (!mods.length) mods = ["walk"];
  const runOK = !ctx.block.has("impact") || (ctx.mode === "pregnant" && +a.prePreg === 3 && trimesterFor(a) < 3);
  if (mods.includes("run") && !runOK) {
    mods = mods.filter(m => m !== "run"); if (!mods.length) mods = ["walk"];
    notes.push(ctx.mode === "postpartum" ? "Running is swapped for brisk walking for now. Ease back in with walk-run intervals once you're cleared and have no leaking or heaviness."
      : ctx.mode === "pregnant" ? "Running is swapped for lower-impact cardio. If you ran regularly before pregnancy, ask your provider about keeping some easy runs." : "Running is swapped for lower-impact cardio because of the areas you flagged.");
  } else if (mods.includes("run") && ctx.mode === "pregnant") notes.push("Since you ran before pregnancy, easy running stays in. Slow down as your body tells you to, and switch to walking any time.");
  return mods;
}
function cardioSession(kind, mod, ctx, time, R) {
  const M = MODS[mod], L = ctx.level, careful = ctx.mode !== "normal";
  const base = { 1: 20, 2: 30, 3: 40 }[L] || 30;
  const grow = [1, 1.1, 1.2, 0.75];
  const cap = Math.max(20, time - 5);
  const mins = w => Math.min(kind === "long" ? Math.max(cap, 30) : cap, Math.round(base * (kind === "long" ? 1.5 : 1) * grow[w] / 5) * 5);
  const hard = careful ? "moderately hard: you can still say a few words" : "hard: about 8 out of 10";
  let n, wk;
  if (kind === "easy" || kind === "long") {
    wk = [0, 1, 2, 3].map(w => ({ s: 1, r: `${mins(w)} min`, how: `${kind === "long" ? "Your longest session of the week. " : ""}Easy pace: you could talk in full sentences (zone 2).` }));
    n = kind === "long" ? `Long ${M.easy.replace(/^Easy |^Brisk /, "").toLowerCase()}` : M.easy;
  } else if (kind === "intervals" && time <= 20) {
    // finisher after lifting: no separate warm-up needed
    const reps = [[5, 6, 7, 4], [6, 7, 8, 5], [8, 9, 10, 6]][L - 1] || [6, 7, 8, 5];
    wk = reps.map(rr => ({ s: 1, r: `${rr * 2} min`, how: `Right after lifting: ${M.int(rr, 1, 1)}. Hard means ${hard}.` }));
    n = `${M.label} intervals`;
  } else if (kind === "intervals") {
    const reps = [[5, 6, 7, 4], [6, 7, 8, 4], [6, 7, 8, 5]][L - 1] || [6, 7, 8, 4];
    const work = { 1: 1, 2: 2, 3: 3 }[L] || 2, rest = 2;
    wk = reps.map(rr => { const tot = 10 + rr * (work + rest) + 5; return { s: 1, r: `${Math.min(tot, time)} min`, how: `Warm up 10 min easy. Then ${M.int(rr, work, rest)}. Hard means ${hard}. Cool down 5 min.` }; });
    n = `${M.label} intervals`;
  } else {
    const t = { 1: 10, 2: 15, 3: 20 }[L] || 15;
    wk = [t, t + 5, t + 5, Math.max(8, t - 5)].map(tt => ({ s: 1, r: `${Math.min(tt + 15, time)} min`, how: `Warm up 10 min easy. Then ${tt} min at a comfortably hard pace (${careful ? "you can still talk in short phrases" : "a few words at a time"}). Cool down 5 min.` }));
    n = `${M.label} tempo`;
  }
  return { type: "cardio", n, mod, kind, unit: M.unit, wk };
}
function miniStrength(ctx, used, R) {
  const dayUsed = new Set(), ex = [];
  ["squat", "h_push", "h_pull", "hinge"].forEach(pat => { const x = pickFor(pat, ctx, used, dayUsed); if (x) { dayUsed.add(x.n); used[x.n] = (used[x.n] || 0) + 1;
    ex.push({ n: x.n, bw: x.eq.length === 0, wk: [[2, "12"], [3, "12"], [3, "10"], [2, "12"]].map(([s, r]) => ({ s, r })), note: x.p === "lunge" ? "Reps are for each leg" : "" }); } });
  return ex;
}
const CARDIO_WEEK = {
  2: ["intervals+s", "long"], 3: ["easy+s", "intervals", "long"], 4: ["easy+s", "intervals", "easy+s", "long"],
  5: ["easy+s", "intervals", "easy", "tempo+s", "long"], 6: ["easy+s", "intervals", "easy", "tempo", "easy+s", "long"]
};
function cardioPlan(a, ctx) {
  const n = Math.max(2, +a.days || 3), time = +a.time || 45, R = rng(JSON.stringify(a)), notes = safetyNotes(a, ctx);
  const mods = cardioMods(a, ctx, notes), used = {};
  let mi = 0;
  const nextMod = kind => { // intervals prefer bike/row/run, long prefers run/walk/bike
    const pref = kind === "intervals" ? ["bike", "row", "run", "elliptical", "swim", "walk"] : kind === "long" ? ["run", "walk", "bike", "swim", "row", "elliptical"] : null;
    if (pref && mods.length > 1) { const p = pref.find(m => mods.includes(m)); if (p && R() < 0.6) return p; }
    return mods[mi++ % mods.length];
  };
  const sessions = (CARDIO_WEEK[n] || CARDIO_WEEK[3]).map(code => {
    const [kind, plus] = code.split("+");
    const c = cardioSession(kind, nextMod(kind), ctx, plus ? Math.max(20, time - 15) : time, R);
    const ex = [c, ...(plus ? miniStrength(ctx, used, R) : [])];
    if (ctx.pf) ex.unshift({ n: "Pelvic Floor Warm-Up", bw: true, wk: prescribe(BY_NAME["Pelvic Floor Warm-Up"], ctx), note: PF_NOTES["Pelvic Floor Warm-Up"] });
    const title = { easy: "Easy cardio", intervals: "Intervals", tempo: "Tempo", long: "Long and easy" }[kind] + (plus ? " + strength" : "");
    return { name: title, type: "cardio", ex };
  });
  if (a.goal === "endurance") notes.push("Building endurance: most of your time is easy on purpose. Easy days build the engine; hard days sharpen it.");
  return { title: `Cardio and endurance, ${n} days`, days: weekLayout(sessions, n), mode: ctx.mode, track: "cardio",
    weekNotes: ctx.mode === "pregnant" ? PREG_WEEK_NOTES : ["Start easy. Easy days should feel easy, even if that means walking hills.", "Sessions get about 10% longer.", "Biggest week. Push the hard days, keep the easy days easy.", "Lighter week. Shorter sessions so you recover and absorb the work."],
    notes };
}

/* ---------- hybrid: lifting days plus cardio days ---------- */
function hybridPlan(a, ctx) {
  const n = Math.max(2, +a.days || 3), time = +a.time || 45, R = rng(JSON.stringify(a));
  const liftN = { 2: 2, 3: 2, 4: 2, 5: 3, 6: 4 }[n] || 2, cardioN = n - liftN;
  const lift = generate({ ...a, track: "lift", days: String(liftN), noFinisher: cardioN === 0, time: cardioN === 0 ? String(Math.max(30, time - 15)) : a.time });
  const liftDays = lift.days.filter(d => !d.rest);
  const notes = safetyNotes(a, ctx), mods = cardioMods(a, ctx, notes);
  const kinds = cardioN >= 2 ? ["intervals", "long", "tempo", "easy"].slice(0, cardioN) : ["intervals"];
  const sessions = [];
  let li = 0, ci = 0;
  for (let i = 0; i < n; i++) {
    const wantLift = cardioN === 0 || (i % 2 === 0 ? li < liftN : ci >= cardioN);
    if (wantLift && li < liftDays.length) {
      const d = JSON.parse(JSON.stringify(liftDays[li++]));
      if (cardioN === 0) d.ex.push(cardioSession("intervals", mods[li % mods.length], ctx, 15, R)), (d.name += " + intervals");
      sessions.push(d);
    } else {
      const kind = kinds[ci++ % kinds.length];
      sessions.push({ name: { easy: "Easy cardio", intervals: "Intervals", tempo: "Tempo", long: "Long and easy" }[kind], type: "cardio", ex: [cardioSession(kind, mods[ci % mods.length], ctx, time, R)] });
    }
  }
  return { title: `Hybrid: ${liftN} lifting + ${cardioN || "short"} cardio ${cardioN === 1 ? "day" : "days"}`, days: weekLayout(sessions, n), mode: ctx.mode, track: "hybrid",
    weekNotes: lift.weekNotes, notes: [...new Set([...lift.notes, ...notes])] };
}

/* ---------- easier / harder swaps ---------- */
function swap(name, dir, pctx, avoid) {
  const cur = BY_NAME[name];
  if (!cur || ["pf", "pfwarm"].includes(cur.p)) return null;
  const ctx = pctx ? { eq: new Set(pctx.eq), block: new Set(pctx.block), maxD: pctx.maxD } : { eq: new Set(GYM), block: new Set(), maxD: 5 };
  const c = LIB.filter(x => x.p === cur.p && x.n !== name && fits(x, ctx) && !(avoid || []).includes(x.n) &&
    (dir < 0 ? x.d < cur.d : x.d > cur.d));
  if (!c.length) return null;
  const same = x => (x.eq.join() === cur.eq.join() ? 0 : 1);
  c.sort((a, b) => Math.abs(a.d - cur.d) - Math.abs(b.d - cur.d) || same(a) - same(b) || (b.c - a.c));
  return c[0].n;
}

/* ---------- self-check: rules every plan must pass (used by the Plan Lab) ---------- */
function audit(p) {
  const issues = [];
  const block = new Set(p.ctx.block), eq = new Set(p.ctx.eq);
  p.days.forEach((d, i) => {
    if (d.rest) return;
    if (!d.ex || !d.ex.length) issues.push(`Day ${i + 1} has no exercises`);
    const names = new Set();
    (d.ex || []).forEach(e => {
      if (e.type === "cardio") { if (e.wk.some(w => /NaN|undefined/.test(w.r + w.how))) issues.push(`Day ${i + 1}: ${e.n} has a bad value`); if (e.mod === "run" && block.has("impact") && p.mode !== "pregnant") issues.push(`Day ${i + 1}: running breaks the "impact" rule`); return; }
      if (e.type === "circuit") {
        e.moves.forEach(mn => { const m = FM_BY[mn]; if (!m) { issues.push(`Unknown move: ${mn}`); return; }
          m.f.forEach(f => { if (block.has(f)) issues.push(`Day ${i + 1}: ${mn} breaks the "${f}" rule`); });
          m.eq.forEach(t => { if (!eq.has(t)) issues.push(`Day ${i + 1}: ${mn} needs equipment they don't have (${t})`); }); });
        if (e.moves.length < 3) issues.push(`Day ${i + 1}: circuit has only ${e.moves.length} moves`);
        if (e.wk.some(w => /NaN|undefined/.test(JSON.stringify(w)))) issues.push(`Day ${i + 1}: circuit has a bad value`);
        return;
      }
      const x = BY_NAME[e.n];
      if (!x) { issues.push(`Unknown exercise: ${e.n}`); return; }
      if (names.has(e.n)) issues.push(`Day ${i + 1} repeats ${e.n}`);
      names.add(e.n);
      x.f.forEach(f => { if (block.has(f)) issues.push(`Day ${i + 1}: ${e.n} breaks the "${f}" rule`); });
      x.eq.forEach(t => { if (!eq.has(t)) issues.push(`Day ${i + 1}: ${e.n} needs equipment they don't have (${t})`); });
      if (e.wk.some(w => /NaN|undefined/.test(String(w.r)) || !(w.s > 0))) issues.push(`Day ${i + 1}: ${e.n} has a bad set or rep value`);
      if (p.mode === "pregnant" && e.wk.some(w => /^\d+$/.test(w.r) && +w.r < 6)) issues.push(`Day ${i + 1}: ${e.n} goes below 6 reps during pregnancy`);
    });
  });
  return issues;
}

root.AdonisEngine = { LIB, BY_NAME, FLIB, generate, swap, audit, PF_NOTES, trimesterFor };
})(typeof window !== "undefined" ? window : globalThis);
