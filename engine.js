/* Adonis plan engine: builds a 4-week plan from the questionnaire with fixed training rules.
   Shared by index.html (the app) and lab.html (the Plan Lab). No network, no AI. */
(function (root) {
"use strict";

/* ---------- equipment tokens ----------
   bb = barbell + rack, db = any dumbbells (light set OK), dbh = full dumbbell set (heavy),
   bench, cab = cables or machines, pu = pull-up bar, band = resistance bands, mb = medicine/slam ball.
   Bodyweight is always available. */
const GYM = ["bb", "db", "dbh", "bench", "cab", "pu", "band", "mb"];

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
    D("Full body A", "full", ["squat", "h_push", "h_pull", "lunge", "lat_raise", "triceps", "core", "calves"]),
    D("Full body B", "full", ["hinge", "v_pull", "v_push", "glute", "chest_iso", "biceps", "core", "rear_delt"]),
    D("Full body C", "full", ["lunge", "incline_push", "h_pull", "hinge", "rear_delt", "triceps", "biceps", "core"])]},
  "3p": { label: "Push / pull / legs", on: [1, 3, 5], days: [
    D("Push", "upper", ["h_push", "v_push", "incline_push", "lat_raise", "triceps", "chest_iso", "triceps"]),
    D("Pull", "upper", ["h_pull", "v_pull", "h_pull", "rear_delt", "biceps", "biceps", "core"]),
    D("Legs", "lower", ["squat", "hinge", "lunge", "ham_iso", "quad_iso", "calves", "core"])]},
  4: { label: "Upper / lower, 4 days", on: [1, 2, 4, 5], days: [
    D("Upper A", "upper", ["h_push", "h_pull", "v_push", "v_pull", "triceps", "biceps", "lat_raise", "core"]),
    D("Lower A", "lower", ["squat", "hinge", "lunge", "quad_iso", "ham_iso", "calves", "core"]),
    D("Upper B", "upper", ["incline_push", "v_pull", "h_pull", "chest_iso", "rear_delt", "biceps", "triceps", "core"]),
    D("Lower B", "lower", ["hinge", "squat", "glute", "lunge", "ham_iso", "core", "calves"])]},
  5: { label: "Upper / lower + push / pull / legs, 5 days", on: [1, 2, 4, 5, 6], days: [
    D("Upper", "upper", ["h_push", "h_pull", "v_push", "v_pull", "lat_raise", "biceps", "triceps", "core"]),
    D("Lower", "lower", ["squat", "hinge", "lunge", "ham_iso", "calves", "core", "glute"]),
    D("Push", "upper", ["incline_push", "v_push", "h_push", "chest_iso", "lat_raise", "triceps", "triceps"]),
    D("Pull", "upper", ["v_pull", "h_pull", "rear_delt", "h_pull", "biceps", "biceps", "core"]),
    D("Legs", "lower", ["hinge", "squat", "glute", "quad_iso", "ham_iso", "lunge", "calves"])]},
  6: { label: "Push / pull / legs, twice a week", on: [1, 2, 3, 4, 5, 6], days: [
    D("Push A", "upper", ["h_push", "v_push", "incline_push", "lat_raise", "triceps", "chest_iso", "triceps"]),
    D("Pull A", "upper", ["h_pull", "v_pull", "rear_delt", "h_pull", "biceps", "biceps", "core"]),
    D("Legs A", "lower", ["squat", "hinge", "lunge", "quad_iso", "calves", "core", "glute"]),
    D("Push B", "upper", ["v_push", "incline_push", "h_push", "lat_raise", "chest_iso", "triceps", "lat_raise"]),
    D("Pull B", "upper", ["v_pull", "h_pull", "v_pull", "rear_delt", "biceps", "core", "biceps"]),
    D("Legs B", "lower", ["hinge", "squat", "glute", "ham_iso", "lunge", "calves", "core"])]},
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
      if (pp === "6w") { ctx.condMax = 2; ctx.level = Math.min(ctx.level, 1); ctx.block.add("impact"); ctx.block.add("plank"); ctx.maxD = 3; ctx.intensity = Math.min(ctx.intensity, 1); }
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
  const sets = SETS[ctx.intensity] || SETS[2];
  if (x.p === "cond") return sets.map(s => ({ s: Math.max(3, s + 1), r: "30s on, 30s off" }));
  if (x.p === "core") return sets.map(() => ({ s: 3, r: ["Plank"].includes(x.n) ? "30s" : ["Side Plank", "Suitcase Carry"].includes(x.n) ? "30s/side" : "10/side" }));
  if (x.p === "calves") return sets.map(s => ({ s, r: "15" }));
  if (x.p === "pfwarm") return [0, 1, 2, 3].map(() => ({ s: 1, r: "2 min" }));
  let g = goal === "fatloss" && ctx.mode === "pregnant" ? "general" : goal;
  let reps = (x.c && idx < 2 ? REPS[g].c : REPS[g].a).slice();
  if (ctx.mode === "pregnant" || ctx.mode === "postpartum") reps = reps.map(r => (/^\d+$/.test(r) ? String(Math.max(6, +r)) : r));
  if (["Wall Sit", "Isometric Palm Press"].includes(x.n)) reps = ["30s", "40s", "45s", "30s"];
  if (["Towel Isometric Curl"].includes(x.n)) reps = ["20s", "25s", "30s", "20s"];
  return sets.map((s, w) => ({ s, r: reps[w] }));
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
  const goal = a.goal || "muscle";
  const nDays = +a.days || 3;
  const key = nDays === 3 ? (ctx.level >= 3 && ctx.mode === "normal" ? "3p" : "3f") : nDays;
  const split = SPLITS[key];
  const slots = TIME_SLOTS[+a.time] || 5;
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

  const finisher = (goal === "fatloss" || goal === "general") && +a.time >= 45;
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
    weekNotes: ctx.mode === "pregnant" ? PREG_WEEK_NOTES : WEEK_NOTES,
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

root.AdonisEngine = { LIB, BY_NAME, generate, swap, audit, PF_NOTES, trimesterFor };
})(typeof window !== "undefined" ? window : globalThis);
