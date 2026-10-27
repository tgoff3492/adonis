/* Adonis coach: form cues, rest times, today's weight suggestion and personal records.
   Pure functions, no network. */
(function (root) {
"use strict";

/* ---------- form cues: 3 short reminders per exercise ---------- */
const CUES = {
  "Bodyweight Squat": "Feet shoulder-width, toes slightly out · Sit back and down, chest up · Knees track over your toes",
  "Banded Squat": "Stand on the band, handles at shoulders · Sit back, chest up · Drive through your whole foot",
  "Goblet Squat": "Hold the weight at your chest, elbows down · Sit between your heels, chest tall · Push the floor away to stand",
  "Leg Press": "Feet hip-width, mid-platform · Lower until hips start to curl, then stop · Don't lock your knees at the top",
  "Tempo Goblet Squat (3s down)": "Count 3 seconds on the way down · Stay tall, elbows inside knees · Stand up with normal speed",
  "Dumbbell Front Squat": "Dumbbells on shoulders, elbows high · Sit straight down, chest up · Brace your belly before each rep",
  "Hack Squat": "Back flat against the pad · Lower until thighs are parallel · Drive through heels and mid-foot",
  "Barbell Back Squat": "Bar on upper back, squeeze the bar · Big breath and brace, then sit down · Knees out, drive up through mid-foot",
  "Barbell Front Squat": "Bar on front of shoulders, elbows high · Sit straight down, stay upright · Keep elbows up as you stand",
  "Jump Squat": "Quarter to half squat, then jump · Land soft and quiet · Reset between reps",
  "Banded Good Morning": "Band behind neck, under feet · Push hips back, soft knees · Flat back, squeeze glutes to stand",
  "Glute Bridge": "Feet flat, close to your hips · Push through heels, squeeze glutes · Ribs down, don't arch your low back",
  "Cable Pull Through": "Face away, rope between legs · Hinge at hips, back flat · Snap hips forward and squeeze glutes",
  "Dumbbell Romanian Deadlift": "Soft knees, push hips straight back · Weights slide down your thighs · Stop when hamstrings stretch, back stays flat",
  "Dumbbell Hip Thrust": "Upper back on bench, weight on hips · Chin tucked, ribs down · Drive through heels, pause at the top",
  "Single-Leg Dumbbell RDL": "Hinge on one leg, back leg reaches back · Hips stay square to the floor · Hold a wall if balance is off",
  "Back Extension": "Hips at the edge of the pad · Lower with a flat back · Rise until body is straight, no further",
  "Barbell Romanian Deadlift": "Start standing, bar close to legs · Push hips back, soft knees · Lower to mid-shin with a flat back",
  "Barbell Hip Thrust": "Pad the bar, upper back on bench · Tuck chin, ribs down · Full hip lockout, pause 1 second",
  "Barbell Deadlift": "Bar over mid-foot, shins near bar · Pull slack out, brace hard · Push the floor away, bar stays close",
  "Split Squat": "Long stance, back heel up · Drop the back knee straight down · Front heel stays planted",
  "Step-Up": "Whole foot on the box · Drive through the top leg, not the bottom one · Control the step down",
  "Reverse Lunge": "Step back, drop the back knee · Front shin stays fairly upright · Push through the front heel to return",
  "Dumbbell Reverse Lunge": "Weights at your sides, chest up · Step back and lower slowly · Drive through the front heel",
  "Dumbbell Step-Up": "Whole foot on the box · Stand tall at the top · Lower slowly, don't drop",
  "Bulgarian Split Squat": "Back foot laces-down on the bench · Lower straight down, slight forward lean · Front knee tracks over toes",
  "Dumbbell Walking Lunge": "Long steps, upright chest · Back knee nearly touches the floor · Push off the front heel into the next step",
  "Wall Sit": "Back flat on the wall · Thighs parallel, knees over ankles · Breathe steadily",
  "Heel-Elevated Goblet Squat": "Heels on a plate or wedge · Knees travel forward over toes · Stay upright, feel your quads",
  "Leg Extension": "Pad on lower shins · Lift and squeeze the quads at the top · Lower in 2 to 3 seconds",
  "Standing Banded Leg Curl": "Anchor the band low · Curl heel toward your glute · Keep your knees together",
  "Seated Leg Curl": "Knees lined up with the machine pivot · Pull heels down and back · Control the return",
  "Lying Leg Curl": "Hips pressed into the pad · Curl to full bend · Lower slowly, don't let it slam",
  "Dumbbell Leg Curl (on bench)": "Dumbbell between your feet · Curl slowly, hips down · Use a light weight you can control",
  "Slider Hamstring Curl": "Bridge up first, heels on sliders · Slide heels out slowly, hips up · Pull back in with your hamstrings",
  "Side-Lying Leg Raise": "Body in a straight line · Lift the top leg, toes forward · Slow down, no swinging",
  "Banded Lateral Walk": "Band above knees or at ankles · Slight squat, chest up · Small steps, keep tension on the band",
  "Banded Glute Kickback": "On all fours or standing · Kick back with the heel · Squeeze the glute, don't arch your back",
  "Single-Leg Hip Thrust": "Upper back on bench, one foot down · Drive through the heel · Keep hips level at the top",
  "Hip Abduction Machine": "Sit tall or lean slightly forward · Push knees out, pause · Return slowly",
  "Cable Kickback": "Cuff on the ankle, slight hinge · Kick back and slightly out · Squeeze, then return slowly",
  "Banded Chest Press": "Band behind your back · Press forward, palms down · Return slowly",
  "Incline Push Up": "Hands on a bench or counter · Body in a straight line · Chest to the edge, elbows at 45°",
  "Wall Push Up": "Hands on the wall at shoulder height · Body straight, heels lift · Lower chest to the wall",
  "Dumbbell Floor Press": "Lie on the floor, knees bent · Lower until upper arms touch the floor · Press up and together",
  "Machine Chest Press": "Handles at mid-chest · Shoulder blades back and down · Press without locking out hard",
  "Push Up": "Hands under shoulders, body straight · Elbows at 45°, chest to the floor · Squeeze glutes, don't sag",
  "Dumbbell Bench Press": "Shoulder blades pinched, feet planted · Lower to chest level, elbows at 45° · Press up and slightly in",
  "Decline Push Up": "Feet on a bench, hands on the floor · Body stays straight · Lower your chest, not your head",
  "Barbell Bench Press": "Eyes under the bar, shoulder blades pinched · Lower to lower chest, elbows at 45° · Drive feet down and press up",
  "Decline Bench Press": "Hook your feet, shoulder blades back · Lower to the bottom of your chest · Press straight up",
  "Incline Machine Press": "Seat so handles are at upper chest · Press up and forward · Control the return",
  "Incline Dumbbell Press": "Bench at 30 to 45° · Lower to upper chest · Press up, don't clank the weights",
  "Incline Barbell Press": "Bench at 30 to 45° · Bar touches upper chest · Keep shoulder blades back the whole time",
  "Banded Overhead Press": "Stand on the band, handles at shoulders · Press straight up · Ribs down, don't lean back",
  "Seated Dumbbell Shoulder Press": "Back against the pad · Press up, weights over your shoulders · Lower to ear height",
  "Machine Shoulder Press": "Handles just above shoulders · Press up without shrugging · Lower under control",
  "Standing Dumbbell Press": "Squeeze glutes, brace your belly · Press straight up · Don't lean back",
  "Pike Push Up": "Hips high, upside-down V · Lower the top of your head toward the floor · Press back up through shoulders",
  "Barbell Overhead Press": "Bar on front of shoulders, glutes tight · Move your head back, press past your face · Finish with the bar over mid-foot",
  "Doorframe Row": "Hold the frame, lean back · Pull your chest to your hands · Squeeze shoulder blades together",
  "Banded Row": "Anchor the band at chest height · Pull elbows back past your ribs · Squeeze, then return slowly",
  "One-Arm Dumbbell Row": "Hand and knee on bench, back flat · Pull the weight to your hip · Lower with a full stretch",
  "Seated Cable Row": "Sit tall, slight knee bend · Pull to your belly, chest up · Don't rock back and forth",
  "Chest-Supported Dumbbell Row": "Chest on an incline bench · Pull elbows back and up · Squeeze shoulder blades at the top",
  "Bent-Over Dumbbell Row": "Hinge to about 45°, back flat · Pull weights to your hips · Keep your torso still",
  "Barbell Row": "Hinge, bar hanging at knees · Pull to your lower ribs · Torso stays still, no jerking",
  "Banded Lat Pulldown": "Anchor the band high · Pull elbows down to your sides · Chest up, squeeze your lats",
  "Lat Pulldown": "Grip a bit wider than shoulders · Pull the bar to your upper chest · Lean back slightly, control the return",
  "Straight-Arm Pulldown": "Arms nearly straight, slight hinge · Pull the bar to your thighs · Feel it in your lats, not arms",
  "Band-Assisted Pull Up": "Band over the bar, knee or foot in it · Pull your chest toward the bar · Lower all the way",
  "Negative Chin Up": "Jump or step to the top · Lower in 3 to 5 seconds · Reset and repeat",
  "Chin Up": "Palms facing you, shoulder-width · Pull chest toward the bar · Lower all the way down",
  "Pull Up": "Palms away, a bit wider than shoulders · Pull elbows down to your ribs · Full hang at the bottom",
  "Isometric Palm Press": "Press palms together in front of your chest · Squeeze as hard as you can · Breathe, don't hold your breath",
  "Banded Chest Fly": "Anchor behind you, slight elbow bend · Hug a big tree · Return slowly",
  "Cable/Machine Fly": "Slight bend in the elbows, locked in · Bring hands together in front of your chest · Feel the stretch on the way back",
  "Dumbbell Fly": "Slight elbow bend the whole time · Lower until you feel a chest stretch · Squeeze back up like a hug",
  "Banded Lateral Raise": "Stand on the band · Raise arms out to shoulder height · Lead with the elbows",
  "Dumbbell Lateral Raise": "Slight lean forward · Raise out to shoulder height, elbows soft · Lower slowly, no swinging",
  "Dumbbell Front Raise": "Palms down or facing in · Raise to shoulder height · Lower in 2 seconds",
  "Cable Lateral Raise": "Cable crosses in front of your body · Raise out to shoulder height · Control the way down",
  "Band Pull-Apart": "Arms straight in front at shoulder height · Pull the band to your chest · Squeeze shoulder blades",
  "Prone Y-T Raise": "Lie face down, thumbs up · Raise arms in a Y, then a T · Small, slow, squeeze the upper back",
  "Reverse Fly": "Hinge forward, back flat · Raise arms out wide, pinkies up · Squeeze shoulder blades together",
  "Face Pull": "Rope at face height · Pull to your forehead, elbows high · Rotate hands back at the end",
  "Upright Row": "Wide grip · Pull elbows out to chest height, no higher · Keep the weights close to your body",
  "Towel Isometric Curl": "Stand on a towel, hold the ends · Curl up hard against it · Hold and breathe",
  "Banded Curl": "Stand on the band · Elbows pinned at your sides · Curl up, squeeze, lower slowly",
  "Dumbbell Curl": "Elbows at your sides · Curl up, turning palms up · Lower all the way, no swinging",
  "Hammer Curl": "Palms facing each other · Elbows pinned · Lower slowly",
  "Cable Curl": "Elbows at your sides · Curl to your shoulders · Keep tension at the bottom",
  "Incline Dumbbell Curl": "Bench at about 45°, arms hanging · Curl without moving your elbows · Lower to a full stretch",
  "Barbell Curl": "Shoulder-width grip · Elbows stay at your sides · No leaning back to swing it up",
  "Drag Curl": "Drag the bar up your body · Elbows move back · Squeeze at the top",
  "Banded Pressdown": "Anchor high · Elbows pinned at your sides · Push down to straight arms",
  "Wall Triceps Extension": "Forearms on the wall · Push off with your triceps · Keep your body straight",
  "Overhead Dumbbell Extension": "Hold one weight with both hands overhead · Lower behind your head, elbows in · Press up to straight arms",
  "Rope Pressdown": "Elbows pinned at your sides · Push down and spread the rope · Control the way up",
  "Bench Dip": "Hands on the bench edge, hips close · Lower until elbows are at 90° · Press up through your palms",
  "Close-Grip Push Up": "Hands under your chest · Elbows brush your sides · Body stays straight",
  "Skull Crushers": "Upper arms angled slightly back · Lower weights beside your head · Extend without moving your elbows",
  "Dips": "Lean slightly forward · Lower until shoulders are just below elbows · Press up, don't shrug",
  "Dead Bug": "Low back pressed to the floor · Reach opposite arm and leg out slowly · Breathe out as you reach",
  "Bird Dog": "Hands under shoulders, knees under hips · Reach opposite arm and leg · Keep hips level, pause",
  "Banded Pallof Press": "Stand sideways to the anchor · Press the band straight out · Don't let it twist you",
  "Cable Pallof Press": "Stand sideways to the cable · Press out and hold 2 seconds · Hips and shoulders stay square",
  "Suitcase Carry": "Heavy weight in one hand · Walk tall, don't lean · Switch hands halfway",
  "Side Plank": "Elbow under shoulder · Hips high, body straight · Breathe and hold",
  "Plank": "Elbows under shoulders · Squeeze glutes and quads · Don't let your hips sag",
  "Hanging Knee Raise": "Hang still, no swinging · Curl knees toward your chest · Lower slowly",
  "Cable Crunch": "Kneel, rope by your head · Crunch your ribs toward your hips · Hips stay still",
  "Standing Calf Raise": "Balls of feet on a step · Rise up high and pause · Lower to a full stretch",
  "Dumbbell Calf Raise": "Weight in one hand, hold a wall · Rise up high, pause · Lower slowly",
  "Machine Calf Raise": "Full stretch at the bottom · Pause at the top · No bouncing",
  "Marching High Knees": "Tall posture · Knees to hip height · Swing your arms",
  "Shadow Boxing": "Light on your feet · Punch with your hips, not just arms · Keep your hands up",
  "Bike or Rower Intervals": "Hard but steady effort on the work intervals · Easy pace on the rest · Rower: legs, hips, then arms",
  "Med Ball Chest Pass": "Ball at your chest · Push it hard to a wall · Catch with soft elbows",
  "Dumbbell Thrusters": "Squat with weights at shoulders · Drive up and press overhead in one move · Keep a steady rhythm",
  "Jumping Jacks": "Land softly on the balls of your feet · Arms fully overhead · Steady pace",
  "Mountain Climbers": "Hands under shoulders · Drive knees toward your chest · Hips stay low",
  "Med Ball Slam": "Reach the ball overhead · Slam it down with your whole body · Squat to pick it up",
  "Burpees": "Hands down, step or jump back · Chest to the floor if you can · Jump up, land softly",
  "Connection Breath": "Breathe into your belly and ribs · Exhale and gently lift the pelvic floor · Fully relax on the next breath in",
  "Quick Kegels": "Squeeze like stopping gas and urine · Lift, then fully let go · Don't squeeze your glutes",
  "Long-Hold Kegels": "Squeeze and lift gently · Keep breathing during the hold · Relax fully for the same time",
  "Heel Slides": "Low back neutral · Exhale and gently lift as you slide · Inhale to return",
  "Bridge with Exhale": "Exhale and lift the pelvic floor first · Then lift your hips · Inhale as you lower",
  "Clamshell": "Hips stacked, knees bent · Open the top knee · Don't roll backward",
  "Daily Walk": "Easy, conversational pace · Stand tall · Stop if you feel pain or heaviness",
  "Pelvic Floor Warm-Up": "5 connection breaths · 10 quick squeezes · 5 long holds, relaxing fully between each",
  "Air Squat": "Feet shoulder-width · Hips back and down, chest up · Stand all the way up each rep",
  "Kettlebell Swing": "Hinge, don't squat: hips back, flat back · Snap the hips forward to float the bell to chest height · Let it fall back between your legs, high and tight",
  "Walking Lunge": "Long steps, chest up · Back knee nearly to the floor · Drive through the front heel into the next step",
  "Box Step-Up": "Whole foot on the box · Push through the top leg · Step down with control",
  "Dumbbell Thruster": "Dumbbells at shoulders, squat down · Drive up and press overhead in one move · Lower to shoulders as you squat again",
  "Wall Ball": "Ball at chest, squat to depth · Drive up and throw to a target overhead · Catch and sink straight into the next squat",
  "Dumbbell Snatch": "Dumbbell between feet, flat back · Explode up and punch it overhead in one move · Lower under control, switch hands as noted",
  "Burpee": "Hands down, step or jump back · Chest to the floor · Stand and jump, land softly",
  "Dumbbell Push Press": "Dumbbells at shoulders · Small knee dip, then drive and press · Lock out overhead, ribs down",
  "Renegade Row": "Plank on the dumbbells, feet wide · Row one side without twisting hips · Alternate sides",
  "Row (machine)": "Legs push first, then lean back, then pull · Handle to lower ribs · Reverse it on the way back",
  "Bike (machine)": "Seat at hip height · Push and pull the handles · Steady hard pace",
  "Farmer Carry": "Heavy dumbbells at your sides · Tall posture, shoulders back · Short quick steps",
  "Sit-Up": "Feet anchored or flat · Roll up one vertebra at a time · Lower slowly",
  "Plank Shoulder Taps": "High plank, feet wide · Tap opposite shoulder · Keep hips from rocking",
};
// names from older or personal programs
const ALIAS = {
  "Incline Dumbbell Bench": "Incline Dumbbell Press", "Barbell Squat": "Barbell Back Squat", "Lunges": "Reverse Lunge",
  "Body Weight Squats": "Bodyweight Squat", "Cable/Rope Press Down": "Rope Pressdown", "Push Ups": "Push Up",
  "Romanian Deadlift": "Barbell Romanian Deadlift", "Rope Pull Through": "Cable Pull Through", "Dumbbell Shoulder Press": "Seated Dumbbell Shoulder Press",
  "Dumbbell Hammer Curl": "Hammer Curl", "Alternating Dumbbell Curl": "Dumbbell Curl",
};
const AB_CUE = "Ribs down, brace like you're about to be poked · Move slowly · Breathe out on the hard part";
function cues(name) { if (name === "Ab Work") return AB_CUE; return CUES[name] || CUES[ALIAS[name]] || ""; }

/* ---------- exercise type: drives rest time and weight jumps ---------- */
const BIG = /squat|deadlift|bench press|overhead press|barbell row|leg press|hack squat|hip thrust|chin up|pull up|front squat/i;
const LOWER = /squat|deadlift|leg press|lunge|split|step-up|hip thrust|rdl|leg curl|leg extension|calf|good morning|pull through|back extension/i;
const BAR = /barbell|^dips$/i;
function kind(name) {
  const n = ALIAS[name] || name;
  return { big: BIG.test(n) && !/goblet|tempo|bodyweight|banded/i.test(n), lower: LOWER.test(n), barbell: BAR.test(n), db: /dumbbell|goblet/i.test(n),
    machine: /machine|cable|pulldown|press down|pressdown|leg press|hack|leg curl|leg extension|fly/i.test(n) };
}

/* rest seconds after a set */
function restFor(name, goal, mode) {
  if (/Kegel|Breath|Walk|Pelvic|Heel Slides|Bridge with Exhale|Clamshell/i.test(name)) return 30;
  if (/Intervals|High Knees|Shadow|Jacks|Climbers|Slam|Burpees|Chest Pass|Thrusters/i.test(name)) return 30;
  const k = kind(name);
  let t = k.big ? 120 : 75;
  if (goal === "strength") t = k.big ? 180 : 90;
  if (goal === "fatloss") t = k.big ? 90 : 60;
  if (mode === "pregnant" || mode === "postpartum") t = Math.max(t, 90);
  return t;
}

/* ---------- strength math ---------- */
const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + Math.min(r, 15) / 30) : 0);
function topReps(rx) { const m = String(rx || "").match(/(\d+)\s*$/); return m ? +m[1] : null; }  // "8-10" -> 10
function lowReps(rx) { const m = String(rx || "").match(/^(\d+)/); return m ? +m[1] : null; }   // "8-10" -> 8

function step(name, w) {
  const k = kind(name);
  if (k.barbell || /leg press|hack/i.test(name)) return k.lower ? 10 : 5;
  if (k.machine) return 5;
  if (k.db) return w < 15 ? 2.5 : 5;
  return 5;
}
function roundTo(w, inc) { return Math.round(w / inc) * inc; }

/* sessions: newest first, each [{w, r, done}] of real sets. rx: today's reps ("10", "8-10", "max", "30s").
   opts: {mode, bw} → {w, r, text} or null */
function suggest(name, sessions, rx, opts) {
  opts = opts || {};
  if (!sessions || !sessions.length) return null;
  const last = sessions[0].filter(s => num(s.r) > 0);
  if (!last.length) return null;
  const target = topReps(rx), low = lowReps(rx);
  const timed = /s$|min/i.test(String(rx));
  if (timed || !target) return null;
  const careful = opts.mode === "pregnant" || opts.mode === "postpartum" || opts.mode === "recovery";
  const weighted = last.filter(s => num(s.w) > 0);
  if (!weighted.length) {
    // bodyweight: beat your best reps by one (not when the plan says to hold back)
    const best = Math.max(...last.map(s => num(s.r)));
    if (careful) return { w: 0, r: best, text: `Last time: ${best} reps. Match it if it feels good.` };
    return { w: 0, r: best + 1, text: `Last time: ${best} reps. Try ${best + 1} today.` };
  }
  const top = weighted.reduce((a, b) => (e1rm(num(b.w), num(b.r)) > e1rm(num(a.w), num(a.r)) ? b : a));
  const lw = num(top.w), lr = num(top.r);
  const inc = step(name, lw);
  const lastTarget = sessions[0].rx ? topReps(sessions[0].rx) : null;
  const hitAll = weighted.length >= Math.max(1, sessions[0].filter(s => s.done).length) && weighted.every(s => num(s.r) >= (lastTarget || target));
  // weight for today's target reps, leaving a rep or two in the tank
  const rir = careful ? 2 : 1;
  let w = roundTo(e1rm(lw, lr) / (1 + (target + rir) / 30), inc);
  if (lastTarget === target || !lastTarget) {
    const bestReps = Math.max(...weighted.map(s => num(s.r)));
    if (hitAll) w = Math.max(w, lw + inc);                 // earned it: go up
    else if (bestReps >= target - 2) w = lw;               // close: same weight, beat the reps
    else w = Math.min(w, lw);                               // well short: come down a little
  } else if (careful) w = Math.min(w, lw);                  // pregnancy/postpartum: no forced jumps
  // never more than about +10%, but always allow one step up (light dumbbells and cables can't move 10%)
  w = Math.max(inc, Math.min(w, Math.max(lw + inc, roundTo(lw * 1.1, inc))));
  let text;
  const lastTxt = `Last time: ${fmtW(lw)} lb × ${lr}.`;
  const bigJump = w > lw && (w - lw) / lw > 0.15;
  const lowR = low && low < target ? low : Math.max(1, target - 2);
  if (w > lw) text = `${lastTxt} Try ${fmtW(w)} lb today.` + (bigJump ? ` It's a big jump, so ${lowR} reps is a win. Build back up to ${target}.` : "");
  else if (w < lw) text = `${lastTxt} Try ${fmtW(w)} lb for today's ${low && low !== target ? `${low} to ${target}` : target} reps.`;
  else if (careful) text = `${lastTxt} Same weight is perfect.`;
  else if (Math.max(...weighted.map(s => num(s.r))) >= target)
    text = `${lastTxt} You hit ${target} on your best set. Get every set to ${target} at ${fmtW(w)} lb, then it goes up.`;
  else text = `${lastTxt} Stay at ${fmtW(w)} lb and beat your reps.`;
  if (careful && w > lw) text = `${lastTxt} Try ${fmtW(w)} lb if it feels good, or stay at ${fmtW(lw)}.`;
  return { w, r: target, text };
}
function fmtW(w) { return Number.isInteger(w) ? String(w) : w.toFixed(1); }
function num(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }

root.AdonisCoach = { cues, restFor, suggest, e1rm, kind, step };
})(typeof window !== "undefined" ? window : globalThis);
