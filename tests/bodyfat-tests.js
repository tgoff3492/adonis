/* Adonis body fat estimate checks: U.S. Navy tape method and Jackson-Pollock 3-site calipers.
   Run:  node tests/bodyfat-tests.js
   Expected values are worked out by hand from the published equations. */
"use strict";
const path = require("path");
require(path.join(__dirname, "..", "nutrition.js"));
const N = globalThis.AdonisNutrition;

let pass = 0, fail = 0;
function check(name, ok, detail) { if (ok) pass++; else { fail++; console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); } }
const near = (a, b, tol = 0.15) => a != null && Math.abs(a - b) <= tol;

/* ---------- tape (U.S. Navy) ---------- */
// man 5'9", waist 34.5, neck 14.25: 86.010*log10(20.25) - 70.041*log10(69) + 36.76 = 20.33
let v = N.navyBF("male", 69, 34.5, 14.25);
check("navy: man 5'9 waist 34.5 neck 14.25 ~ 20.3%", near(v, 20.33), `got ${v}`);
// woman 5'5", waist 30, hips 40, neck 13: 163.205*log10(57) - 97.684*log10(65) - 78.387 = 286.57 - 177.09 - 78.39 = 31.09
v = N.navyBF("female", 65, 30, 13, 40);
check("navy: woman 5'5 waist 30 hips 40 neck 13 ~ 31.1%", near(v, 31.09), `got ${v}`);
check("navy: woman needs hips", N.navyBF("female", 65, 30, 13) === null);
check("navy: missing neck is null", N.navyBF("male", 69, 34.5, 0) === null);
check("navy: neck bigger than waist is null", N.navyBF("male", 69, 14, 15) === null);
// bigger neck, same waist: lower estimate (muscle gain in the neck/traps reads as leaner)
check("navy: bigger neck lowers the estimate", N.navyBF("male", 69, 34.5, 15.5) < N.navyBF("male", 69, 34.5, 14.25));
check("navy: smaller waist lowers the estimate", N.navyBF("male", 69, 33, 14.25) < N.navyBF("male", 69, 34.5, 14.25));

/* ---------- calipers (Jackson-Pollock 3-site + Siri) ---------- */
// man, 35, chest 15 + abdomen 25 + thigh 20 = 60 mm
//   BD = 1.10938 - 0.0008267*60 + 0.0000016*3600 - 0.0002574*35 = 1.056529;  495/BD - 450 = 18.51
v = N.caliperBF("male", 35, { chest: 15, abdomen: 25, thigh: 20 });
check("calipers: man 35, 60 mm ~ 18.5%", near(v, 18.51), `got ${v}`);
// woman, 30, triceps 18 + suprailiac 17 + thigh 25 = 60 mm
//   BD = 1.0994921 - 0.0009929*60 + 0.0000023*3600 - 0.0001392*30 = 1.044022;  495/BD - 450 = 24.13
v = N.caliperBF("female", 30, { triceps: 18, suprailiac: 17, thigh: 25 });
check("calipers: woman 30, 60 mm ~ 24.1%", near(v, 24.13), `got ${v}`);
check("calipers: missing a site is null", N.caliperBF("male", 35, { chest: 15, abdomen: 25 }) === null);
check("calipers: missing age is null", N.caliperBF("male", 0, { chest: 15, abdomen: 25, thigh: 20 }) === null);
check("calipers: women's sites don't count for men", N.caliperBF("male", 35, { triceps: 18, suprailiac: 17, thigh: 25 }) === null);
check("calipers: thicker folds read higher",
  N.caliperBF("male", 35, { chest: 20, abdomen: 30, thigh: 25 }) > N.caliperBF("male", 35, { chest: 15, abdomen: 25, thigh: 20 }));
check("calipers: same folds read higher when older",
  N.caliperBF("male", 50, { chest: 15, abdomen: 25, thigh: 20 }) > N.caliperBF("male", 30, { chest: 15, abdomen: 25, thigh: 20 }));
check("calipers: very lean stays in range", N.caliperBF("male", 25, { chest: 3, abdomen: 4, thigh: 4 }) >= 3);
check("calipers: each sex has three sites", N.CALIPER_SITES.male.length === 3 && N.CALIPER_SITES.female.length === 3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
