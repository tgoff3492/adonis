/* Adonis meal plans: a library of real meals whose protein, carb and fat ingredients scale
   separately so each meal hits its share of the day's targets. Each meal rotates through
   flavor profiles (a spice blend plus a simple sauce) and comes with step-by-step cooking.
   Runs on the phone, no AI. */
(function (root) {
"use strict";

/* ---------- ingredients: macros per 100 g (USDA-style averages) ----------
   tags: meat, poultry, pork, fish, shellfish, dairy, egg, gluten, nuts, peanut, soy, honey,
         tuna (limit in pregnancy), deli (avoid cold in pregnancy)
   aisle: protein, dairy, produce, grains, pantry, frozen
   unit: friendly count (e.g. egg = 50 g) */
const I = (id, name, p, c, f, tags, aisle, unit) => ({ id, name, p, c, f, tags: tags || [], aisle, unit });
const ING = {};
[
  I("chicken", "Chicken breast (cooked)", 31, 0, 3.6, ["meat", "poultry"], "protein"),
  I("turkey93", "93% lean ground turkey (cooked)", 27, 0, 9.5, ["meat", "poultry"], "protein"),
  I("beef93", "93% lean ground beef (cooked)", 26, 0, 10, ["meat"], "protein"),
  I("pork", "Pork tenderloin (cooked)", 26, 0, 3.5, ["meat", "pork"], "protein"),
  I("salmon", "Salmon (cooked)", 24, 0, 11, ["fish"], "protein"),
  I("cod", "Cod (cooked)", 23, 0, 0.9, ["fish"], "protein"),
  I("shrimp", "Shrimp (cooked)", 24, 0.2, 0.3, ["shellfish"], "protein"),
  I("tuna", "Canned light tuna (drained)", 24, 0, 1, ["fish", "tuna"], "pantry"),
  I("deliturkey", "Deli turkey breast", 17, 3.5, 1, ["meat", "poultry", "deli"], "protein"),
  I("jerky", "Beef jerky", 33, 11, 7, ["meat"], "pantry"),
  I("egg", "Eggs", 12.6, 0.7, 9.5, ["egg"], "dairy", { n: "egg", g: 50 }),
  I("whites", "Egg whites", 11, 0.7, 0.2, ["egg"], "dairy"),
  I("greek", "Plain nonfat Greek yogurt", 10, 3.6, 0.4, ["dairy"], "dairy"),
  I("cottage", "2% cottage cheese", 11, 4, 2.3, ["dairy"], "dairy"),
  I("milk", "2% milk", 3.3, 4.8, 2, ["dairy"], "dairy"),
  I("cheddar", "Cheddar cheese", 25, 1.3, 33, ["dairy"], "dairy"),
  I("mozz", "Part-skim mozzarella", 24, 2.8, 16, ["dairy"], "dairy"),
  I("feta", "Feta (pasteurized)", 14, 4, 21, ["dairy"], "dairy"),
  I("parm", "Parmesan", 36, 3, 26, ["dairy"], "dairy"),
  I("whey", "Whey protein powder", 80, 8, 6, ["dairy"], "pantry", { n: "scoop", g: 30 }),
  I("pea", "Pea protein powder", 80, 3, 6, [], "pantry", { n: "scoop", g: 30 }),
  I("tofu", "Firm tofu", 17, 2.8, 8.7, ["soy"], "protein"),
  I("tempeh", "Tempeh", 20, 7.6, 11, ["soy"], "protein"),
  I("edamame", "Shelled edamame", 11, 9, 5, ["soy"], "frozen"),
  I("lentils", "Lentils (cooked)", 9, 20, 0.4, [], "pantry"),
  I("blackbeans", "Black beans (cooked)", 8.9, 23.7, 0.5, [], "pantry"),
  I("chickpeas", "Chickpeas (cooked)", 8.9, 27.4, 2.6, [], "pantry"),
  I("rice", "White rice (cooked)", 2.7, 28, 0.3, [], "grains"),
  I("brownrice", "Brown rice (cooked)", 2.6, 23, 0.9, [], "grains"),
  I("quinoa", "Quinoa (cooked)", 4.4, 21.3, 1.9, [], "grains"),
  I("oats", "Rolled oats (dry)", 13, 68, 6.5, [], "grains"),
  I("pasta", "Pasta (cooked)", 5.8, 31, 0.9, ["gluten"], "grains"),
  I("bread", "Whole wheat bread", 13, 41, 3.4, ["gluten"], "grains", { n: "slice", g: 32 }),
  I("tortilla", "Flour tortilla", 8, 49, 8, ["gluten"], "grains", { n: "tortilla", g: 45 }),
  I("corntort", "Corn tortilla", 5.7, 45, 2.9, [], "grains", { n: "tortilla", g: 26 }),
  I("pita", "Whole wheat pita", 9, 56, 1.2, ["gluten"], "grains", { n: "pita", g: 64 }),
  I("granola", "Granola", 9, 64, 15, ["gluten"], "grains"),
  I("ricecake", "Rice cakes", 8, 80, 3, [], "grains", { n: "rice cake", g: 9 }),
  I("potato", "Potatoes", 2.5, 21, 0.1, [], "produce"),
  I("sweetpot", "Sweet potatoes", 2, 20.7, 0.2, [], "produce"),
  I("banana", "Banana", 1.1, 23, 0.3, [], "produce", { n: "banana", g: 118 }),
  I("berries", "Mixed berries", 0.7, 14.5, 0.3, [], "frozen"),
  I("apple", "Apple", 0.3, 14, 0.2, [], "produce", { n: "apple", g: 180 }),
  I("honey", "Honey", 0.3, 82, 0, ["honey"], "pantry"),
  I("pb", "Peanut butter", 25, 20, 50, ["peanut"], "pantry"),
  I("almonds", "Almonds", 21, 22, 50, ["nuts"], "pantry"),
  I("oil", "Olive oil", 0, 0, 100, [], "pantry"),
  I("avocado", "Avocado", 2, 8.5, 15, [], "produce"),
  I("chia", "Chia seeds", 17, 42, 31, [], "pantry"),
  I("hummus", "Hummus", 8, 14, 10, [], "dairy"),
  I("broccoli", "Broccoli", 2.8, 7, 0.4, [], "produce"),
  I("spinach", "Spinach", 2.9, 3.6, 0.4, [], "produce"),
  I("peppers", "Bell peppers", 1, 6, 0.3, [], "produce"),
  I("greens", "Salad greens", 1.4, 3, 0.2, [], "produce"),
  I("mushrooms", "Mushrooms", 3, 3.3, 0.3, [], "produce"),
  I("onion", "Onion", 1.1, 9.3, 0.1, [], "produce"),
  I("stirfry", "Frozen stir-fry vegetables", 2, 8, 0.2, [], "frozen"),
  I("salsa", "Salsa", 1.5, 7, 0.2, [], "pantry"),
  I("marinara", "Marinara sauce", 1.5, 8, 1.5, [], "pantry"),
  I("cocoa", "Unsweetened cocoa powder", 20, 58, 14, [], "pantry"),
].forEach(x => { ING[x.id] = x; });

/* ---------- sauces: counted in the macros like any other ingredient ----------
   Homemade sauces list what they're made of (makes) so the grocery list buys the
   real ingredients; store-bought sauces are bought as-is. g = one serving. */
const SAUCES = {
  chipotle: { name: "Chipotle yogurt sauce", p: 9, c: 5, f: 0.6, tags: ["dairy"], g: 30, makes: { greek: 0.9 }, extras: ["Chipotle peppers in adobo (or chipotle powder)", "Limes"],
    recipe: "Stir together 2 tbsp Greek yogurt, 1 tsp adobo sauce from a can of chipotles (or ¼ tsp chipotle powder), a squeeze of lime and a pinch of salt." },
  salsaverde: { name: "Salsa verde", p: 1, c: 7, f: 0.3, tags: [], g: 40, store: 1, aisle: "pantry" },
  tzatziki: { name: "Tzatziki", p: 8, c: 4.5, f: 0.4, tags: ["dairy"], g: 35, makes: { greek: 0.8 }, extras: ["Cucumber", "Lemons", "Dried dill"],
    recipe: "Stir together 2 tbsp Greek yogurt, 1 tbsp grated cucumber (squeezed dry), a squeeze of lemon, a pinch each of garlic powder, dried dill and salt." },
  tahini: { name: "Lemon tahini sauce", p: 8.5, c: 11, f: 27, tags: [], g: 25, extras: ["Tahini", "Lemons"],
    recipe: "Whisk 1 tbsp tahini with 1 tbsp water, a squeeze of lemon, a pinch of garlic powder and salt until creamy. Add more water if it's too thick." },
  teriyaki: { name: "Light teriyaki sauce", p: 3, c: 25, f: 0, tags: ["soy", "gluten"], g: 30, store: 1, aisle: "pantry" },
  sweetchili: { name: "Sweet chili sauce", p: 0.5, c: 50, f: 0.5, tags: [], g: 20, store: 1, aisle: "pantry" },
  peanut: { name: "Peanut sauce", p: 10, c: 15, f: 22, tags: ["peanut", "soy", "gluten", "honey"], g: 30, makes: { pb: 0.4 }, extras: ["Soy sauce", "Limes", "Honey"],
    recipe: "Whisk 1 tbsp peanut butter, 2 tsp soy sauce, 1 tsp lime juice, 1 tsp honey and 1 to 2 tbsp warm water until smooth and pourable." },
  chimichurri: { name: "Chimichurri", p: 1, c: 3, f: 50, tags: [], g: 15, makes: { oil: 0.5 }, extras: ["Fresh parsley", "Red wine vinegar", "Red pepper flakes"],
    recipe: "Finely chop a small handful of parsley. Mix with 1 tbsp olive oil, 1 tsp red wine vinegar, a pinch each of garlic powder, red pepper flakes and salt." },
  pesto: { name: "Basil pesto", p: 5, c: 6, f: 45, tags: ["dairy", "nuts"], g: 15, store: 1, aisle: "dairy" },
  bbq: { name: "BBQ sauce", p: 0.8, c: 40, f: 0.6, tags: [], g: 30, store: 1, aisle: "pantry" },
  honeymustard: { name: "Honey mustard", p: 6, c: 18, f: 2, tags: ["dairy", "honey"], g: 25, makes: { greek: 0.5 }, extras: ["Dijon mustard", "Honey"],
    recipe: "Stir together 1 tbsp Greek yogurt, 2 tsp Dijon mustard and 1 tsp honey." },
  buffalo: { name: "Buffalo yogurt sauce", p: 9, c: 4, f: 0.5, tags: ["dairy"], g: 30, makes: { greek: 0.9 }, extras: ["Hot sauce (like Frank's)"],
    recipe: "Stir together 2 tbsp Greek yogurt and 1 to 2 tsp hot sauce. Add a pinch of garlic powder if you like." },
  srirachamayo: { name: "Sriracha mayo", p: 1, c: 8, f: 30, tags: ["egg"], g: 15, extras: ["Light mayo", "Sriracha"],
    recipe: "Stir together 1 tbsp light mayo and 1 tsp sriracha. Store-bought mayo is pasteurized, so it's fine in pregnancy." },
  cocoa: { ing: "cocoa", g: 6 },
};
Object.keys(SAUCES).forEach(k => {
  const s = SAUCES[k];
  if (s.ing) return;
  ING["s_" + k] = { id: "s_" + k, name: s.name, p: s.p, c: s.c, f: s.f, tags: s.tags, aisle: s.aisle || "pantry", sauce: k };
});
const sauceIng = k => SAUCES[k].ing || "s_" + k;

/* ---------- spice blends: mix a jar once, use all week ---------- */
const BLENDS = {
  taco: { name: "Taco blend", jar: "2 tbsp chili powder, 1 tbsp ground cumin, 1 tsp each garlic powder, onion powder, smoked paprika and dried oregano, 1½ tsp salt", spices: ["Chili powder", "Ground cumin", "Garlic powder", "Onion powder", "Smoked paprika", "Dried oregano"] },
  cajun: { name: "Cajun blend", jar: "2 tbsp paprika, 1 tbsp each garlic powder and onion powder, 1 tsp each cayenne, dried oregano, dried thyme and black pepper, 2 tsp salt", spices: ["Paprika", "Garlic powder", "Onion powder", "Cayenne", "Dried oregano", "Dried thyme", "Black pepper"] },
  lemonherb: { name: "Lemon herb blend", jar: "1 tbsp each dried oregano and dried basil, 2 tsp each lemon pepper and garlic powder, 1 tsp dried thyme, 1 tsp salt. Finish with a squeeze of fresh lemon.", spices: ["Dried oregano", "Dried basil", "Lemon pepper", "Garlic powder", "Dried thyme"] },
  greek: { name: "Greek blend", jar: "1 tbsp dried oregano, 2 tsp garlic powder, 1 tsp each onion powder, dried dill and black pepper, 1½ tsp salt", spices: ["Dried oregano", "Garlic powder", "Onion powder", "Dried dill", "Black pepper"] },
  bbq: { name: "BBQ rub", jar: "2 tbsp smoked paprika, 1 tbsp brown sugar, 2 tsp each garlic powder and onion powder, 1 tsp each chili powder and black pepper, 1½ tsp salt", spices: ["Smoked paprika", "Brown sugar", "Garlic powder", "Onion powder", "Chili powder", "Black pepper"] },
  curry: { name: "Curry blend", jar: "2 tbsp curry powder, 1 tsp each ground cumin, garlic powder, ground ginger and turmeric, 1 tsp salt", spices: ["Curry powder", "Ground cumin", "Garlic powder", "Ground ginger", "Turmeric"] },
  italian: { name: "Italian blend", jar: "1 tbsp each dried basil and dried oregano, 2 tsp garlic powder, 1 tsp each red pepper flakes, black pepper and salt", spices: ["Dried basil", "Dried oregano", "Garlic powder", "Red pepper flakes", "Black pepper"] },
  asian: { name: "Ginger garlic blend", jar: "2 tsp each garlic powder and ground ginger, 1 tsp onion powder, ½ tsp each white pepper and red pepper flakes. No salt: the sauce brings it.", spices: ["Garlic powder", "Ground ginger", "Onion powder", "White pepper", "Red pepper flakes"] },
  cinnamon: { name: "Cinnamon spice blend", jar: "2 tbsp cinnamon, 1 tsp each nutmeg and ground ginger, ¼ tsp ground cloves", spices: ["Cinnamon", "Nutmeg", "Ground ginger", "Ground cloves"] },
};

/* ---------- flavor profiles ----------
   blend: season from the jar (amount worked out from the portion); season: fixed wording.
   sauces: tried in order, skipping any the person can't have. needsSauce: the name promises it. */
const PROFILES = {
  texmex: { label: "Tex-Mex", blend: "taco", sauces: ["chipotle", "salsaverde"] },
  cajun: { label: "Cajun", blend: "cajun", sauces: ["honeymustard", "srirachamayo", "chipotle"] },
  lemonherb: { label: "Lemon herb", blend: "lemonherb", sauces: ["chimichurri", "tzatziki", "tahini"] },
  greek: { label: "Greek", blend: "greek", sauces: ["tzatziki", "tahini"] },
  bbq: { label: "BBQ", blend: "bbq", sauces: ["bbq"], needsSauce: 1 },
  teriyaki: { label: "Teriyaki", blend: "asian", sauces: ["teriyaki"], needsSauce: 1 },
  sweetchili: { label: "Sweet chili", blend: "asian", sauces: ["sweetchili", "srirachamayo"], needsSauce: 1 },
  peanut: { label: "Thai peanut", blend: "asian", sauces: ["peanut"], needsSauce: 1 },
  curry: { label: "Curry", blend: "curry", sauces: ["tzatziki", "tahini"] },
  italian: { label: "Italian", blend: "italian", sauces: [] },
  pestoit: { label: "Pesto", blend: "italian", sauces: ["pesto"], needsSauce: 1 },
  buffalo: { label: "Buffalo", blend: "cajun", sauces: ["buffalo"], needsSauce: 1 },
  honeymustard: { label: "Honey mustard", season: "a pinch of salt and pepper", sauces: ["honeymustard"], needsSauce: 1 },
  chimi: { label: "Chimichurri", blend: "lemonherb", sauces: ["chimichurri"], needsSauce: 1 },
  // breakfast and sweet
  cinnamon: { label: "Cinnamon spice", season: "½ tsp cinnamon spice blend", jar: "cinnamon", sauces: [] },
  choc: { label: "Chocolate", season: "the cocoa powder and a few drops of vanilla", sauces: ["cocoa"], needsSauce: 1, extras: ["Vanilla extract"] },
  berryvanilla: { label: "Berry vanilla", season: "½ tsp vanilla extract", sauces: [], extras: ["Vanilla extract"] },
  pbbanana: { label: "Peanut butter banana", season: "a pinch of salt", sauces: [] },
  everything: { label: "Everything bagel", season: "1 tsp everything bagel seasoning", sauces: [], extras: ["Everything bagel seasoning"] },
  southwest: { label: "Southwest", blend: "taco", sauces: ["salsaverde"] },
  eggpesto: { label: "Pesto", season: "a pinch of salt and pepper", sauces: ["pesto"], needsSauce: 1 },
};

// what you actually buy: raw meat, dry grains, canned beans
const BUY = {
  chicken: [1.33, "Chicken breast (raw)"], turkey93: [1.3, "93% lean ground turkey (raw)"], beef93: [1.3, "93% lean ground beef (raw)"],
  pork: [1.3, "Pork tenderloin (raw)"], salmon: [1.2, "Salmon (raw)"], cod: [1.2, "Cod (raw)"], shrimp: [1.2, "Shrimp (raw)"],
  rice: [1 / 2.8, "White rice (dry)"], brownrice: [1 / 2.6, "Brown rice (dry)"], quinoa: [1 / 2.7, "Quinoa (dry)"],
  pasta: [1 / 2.25, "Pasta (dry)"], lentils: [1 / 2.5, "Lentils (dry)"],
};
const CANS = { blackbeans: 240, chickpeas: 240, tuna: 142 };
// how a portion reads in a meal: "2 slices whole wheat bread"
const UNIT_LABEL = { egg: ["egg", "eggs"], bread: ["slice whole wheat bread", "slices whole wheat bread"], tortilla: ["flour tortilla", "flour tortillas"],
  corntort: ["corn tortilla", "corn tortillas"], pita: ["whole wheat pita", "whole wheat pitas"], ricecake: ["rice cake", "rice cakes"],
  banana: ["banana", "bananas"], apple: ["apple", "apples"], whey: ["scoop whey protein", "scoops whey protein"], pea: ["scoop pea protein", "scoops pea protein"] };

/* grains: dry grams per cup, cooked yield, water ratio, minutes */
const GRAIN = {
  rice: { label: "rice", dryCup: 185, yield: 2.8, water: 2, how: (d, w) => `Cook the rice: bring ${w} water and a pinch of salt to a boil, stir in ${d} dry white rice, cover and simmer on low 18 minutes. Rest 5 minutes covered, then fluff.` },
  brownrice: { label: "brown rice", dryCup: 190, yield: 2.6, water: 2.25, how: (d, w) => `Cook the brown rice: bring ${w} water to a boil, add ${d} dry brown rice, cover and simmer on low 40 to 45 minutes. Rest 10 minutes, then fluff.` },
  quinoa: { label: "quinoa", dryCup: 170, yield: 2.7, water: 2, how: (d, w) => `Cook the quinoa: rinse ${d} dry quinoa, add to ${w} boiling water, cover and simmer 15 minutes. Rest 5 minutes, then fluff.` },
  pasta: { label: "pasta", oz: 1, yield: 2.25, how: d => `Cook the pasta: boil ${d} dry pasta in well-salted water 9 to 11 minutes, until just tender. Save a splash of the pasta water, then drain.` },
  lentils: { label: "lentils", dryCup: 190, yield: 2.5, water: 3, how: (d, w) => `Cook the lentils: rinse ${d} dry lentils, simmer in ${w} water 20 to 25 minutes until tender, then drain. Or use canned lentils, rinsed.` },
};

/* ---------- meals ----------
   slot: b = breakfast, m = lunch or dinner, s = snack
   items: [ingredient, grams, role]  role p/c/f scales to hit protein/carbs/fat, x stays fixed
   fl: flavor profiles that suit the meal. nm: name with {f} for the flavor.
   t: minutes. oven: °F. seasonAll: the seasoning covers the potatoes too.
   steps use tokens: {season} {grain} {starch} {liquid}. The sauce step is added on its own.
   batch = keeps well for prep days, quick = 10 minutes or less
   ahead = has to be made earlier (e.g. the night before), so it's never put on the first day of a plan */
const M = (id, name, slot, items, opt) => ({ id, name, slot, items: items.map(([ing, g, r]) => ({ ing, g, r })), ...(opt || {}) });
const STARCH = "Heat the oven to 425°F. Cut the potatoes into 1-inch cubes, toss with a little of the oil and a pinch of salt, and roast on a sheet pan 30 to 35 minutes, flipping halfway, until browned and tender.";
const SWEET_STARCH = "Heat the oven to 425°F. Cut the sweet potatoes into 1-inch cubes, toss with a little of the oil and a pinch of salt, and roast 25 to 30 minutes, flipping halfway.";
const MEALS = [
  // ---- breakfast ----
  M("parfait", "Greek yogurt parfait", "b", [["greek", 250, "p"], ["berries", 100, "x"], ["granola", 40, "c"], ["almonds", 15, "f"]], { quick: 1, t: 5,
    fl: ["berryvanilla", "cinnamon", "choc"], nm: "{f} yogurt parfait",
    steps: ["Stir {season} into the yogurt.", "Layer yogurt, berries and granola in a bowl or jar.", "Chop the almonds and scatter them on top right before eating so they stay crunchy."] }),
  M("eggstoast", "Scrambled eggs and toast", "b", [["egg", 100, "f"], ["whites", 150, "p"], ["bread", 64, "c"], ["spinach", 30, "x"]], { quick: 1, t: 10,
    fl: ["everything", "southwest", "eggpesto"], nm: "{f} scrambled eggs and toast",
    steps: ["Whisk the eggs and egg whites with {season}.", "Heat a nonstick pan over medium-low with a quick spray of oil. Wilt the spinach, about 1 minute.", "Pour in the eggs and stir slowly with a spatula until fully set with no runny parts, 3 to 4 minutes.", "Toast the bread and serve alongside."] }),
  M("protoats", "Protein oatmeal", "b", [["oats", 60, "c"], ["whey", 30, "p"], ["milk", 200, "x"], ["banana", 60, "c"], ["pb", 16, "f"]], { quick: 1, t: 8,
    fl: ["pbbanana", "choc", "cinnamon"], nm: "{f} protein oatmeal",
    steps: ["Bring the milk and oats to a simmer in a small pot with {season}. Cook, stirring often, 4 to 5 minutes until thick.", "Take the pot off the heat and let it cool 1 minute, then stir in the protein powder. Adding it off the heat keeps it from clumping.", "Top with sliced banana and the peanut butter."] }),
  M("bfburrito", "Breakfast burritos", "b", [["egg", 100, "f"], ["whites", 120, "p"], ["tortilla", 60, "c"], ["cheddar", 20, "x"], ["salsa", 50, "x"]], { batch: 1, t: 20,
    fl: ["southwest"], nm: "Southwest breakfast burritos",
    steps: ["Whisk the eggs and egg whites with {season}.", "Scramble in a nonstick pan over medium-low until fully set, 4 to 5 minutes.", "Warm the tortillas 20 seconds in the microwave so they don't crack.", "Fill with the eggs, cheese and salsa. Fold in the sides and roll up tight.", "To make ahead: wrap each burrito in foil and freeze up to 3 months. To reheat, unwrap, wrap in a damp paper towel and microwave 1½ to 2 minutes, flipping halfway."] }),
  M("cottagebowl", "Cottage cheese bowl", "b", [["cottage", 250, "p"], ["banana", 118, "c"], ["almonds", 15, "f"]], { quick: 1, t: 3,
    fl: ["cinnamon", "choc"], nm: "{f} cottage cheese bowl",
    steps: ["Stir {season} into the cottage cheese.", "Top with the sliced banana and chopped almonds."] }),
  M("tofuscramble", "Tofu scramble and potatoes", "b", [["tofu", 200, "p"], ["potato", 200, "c"], ["spinach", 50, "x"], ["peppers", 50, "x"], ["oil", 7, "f"]], { t: 35, oven: 425, seasonAll: 1,
    fl: ["southwest", "curry"], nm: "{f} tofu scramble and potatoes",
    steps: ["{starch}", "Press the tofu between paper towels for 5 minutes, then crumble it with your fingers.", "Heat the rest of the oil in a skillet over medium-high. Cook the diced peppers 3 minutes.", "Add the tofu and {season}. Cook, stirring, 5 to 6 minutes until lightly golden.", "Stir in the spinach until wilted. Serve with the potatoes."] }),
  M("overnightoats", "Overnight oats", "b", [["oats", 60, "c"], ["pea", 30, "p"], ["berries", 100, "x"], ["chia", 15, "f"]], { batch: 1, quick: 1, t: 5, ahead: "the night before",
    fl: ["berryvanilla", "cinnamon", "choc"], nm: "{f} overnight oats",
    steps: ["In a jar, stir together the oats, protein powder, chia seeds and {season}.", "Stir in {liquid} of water or unsweetened almond milk until there are no dry clumps.", "Cover and refrigerate overnight, or at least 4 hours.", "Top with the berries in the morning. Jars keep 4 days in the fridge, so make several at once."] }),
  M("smoothie", "Protein smoothie", "b", [["whey", 35, "p"], ["banana", 118, "c"], ["berries", 100, "x"], ["milk", 250, "x"], ["pb", 16, "f"]], { quick: 1, t: 5,
    fl: ["berryvanilla", "choc"], nm: "{f} protein smoothie",
    steps: ["Pour the milk into the blender first so it blends easily.", "Add the banana, berries, peanut butter, protein powder, {season} and a handful of ice.", "Blend 45 to 60 seconds until smooth. Add a splash of water if it's too thick."] }),
  M("vsmoothie", "Plant protein smoothie", "b", [["pea", 35, "p"], ["banana", 118, "c"], ["berries", 100, "x"], ["chia", 15, "f"]], { quick: 1, t: 5,
    fl: ["berryvanilla", "choc"], nm: "{f} plant protein smoothie",
    steps: ["Add 1¼ cups cold water to the blender, then the banana, berries, chia seeds, protein powder, {season} and a handful of ice.", "Blend 60 seconds until smooth."] }),
  M("omelet", "Veggie omelet and potatoes", "b", [["egg", 150, "f"], ["whites", 100, "p"], ["mushrooms", 50, "x"], ["peppers", 50, "x"], ["potato", 200, "c"]], { t: 35, oven: 425,
    fl: ["everything", "southwest", "eggpesto"], nm: "{f} veggie omelet and potatoes",
    steps: ["{starch}", "Whisk the eggs and egg whites with {season}.", "In a nonstick pan over medium, cook the sliced mushrooms and diced peppers 4 minutes, then move them to a plate.", "Pour the eggs into the pan. As the edges set, lift them so the runny egg flows underneath. When the top is set, about 3 minutes, add the vegetables to one half and fold.", "Cook 1 more minute so the center is fully set. Serve with the potatoes."] }),
  M("pbtoast", "Peanut butter toast and yogurt", "b", [["bread", 64, "c"], ["pb", 20, "f"], ["greek", 200, "p"], ["banana", 60, "c"]], { quick: 1, t: 5,
    fl: ["cinnamon", "choc", "pbbanana"], nm: "{f} peanut butter toast and yogurt",
    steps: ["Toast the bread and spread with the peanut butter.", "Top with sliced banana.", "Stir {season} into the yogurt and eat it alongside."] }),
  // ---- lunches and dinners ----
  M("burritobowl", "Chicken burrito bowl", "m", [["chicken", 150, "p"], ["rice", 150, "c"], ["blackbeans", 80, "c"], ["salsa", 60, "x"], ["avocado", 50, "f"], ["greens", 30, "x"]], { batch: 1, t: 30, oven: 425,
    fl: ["texmex"], nm: "Chicken burrito bowl",
    steps: ["{grain}", "Heat the oven to 425°F. Pat the chicken dry and coat it with {season}.", "Bake on a lined sheet pan 18 to 22 minutes, until it reaches 165°F in the thickest part. Rest 5 minutes, then slice.", "Warm the rinsed black beans with a pinch of the same seasoning.", "Build the bowl: rice, beans, chicken, greens, salsa and sliced avocado."] }),
  M("turkeychili", "Turkey chili", "m", [["turkey93", 150, "p"], ["blackbeans", 120, "c"], ["marinara", 150, "x"], ["onion", 50, "x"], ["cheddar", 15, "f"]], { batch: 1, t: 35,
    fl: ["texmex", "bbq"], nm: "{f} turkey chili",
    steps: ["In a pot over medium-high, brown the turkey with the diced onion, breaking it up, 7 to 8 minutes until no pink remains (165°F).", "Stir in {season} and cook 1 minute until fragrant.", "Add the rinsed beans, the marinara and ½ cup water per serving. Simmer uncovered 20 minutes, stirring now and then.", "Top with the cheddar. Chili tastes even better on day two."] }),
  M("salmonrice", "Salmon, rice and broccoli", "m", [["salmon", 150, "p"], ["rice", 150, "c"], ["broccoli", 150, "x"], ["oil", 5, "f"]], { t: 25, oven: 400,
    fl: ["teriyaki", "lemonherb", "cajun"], nm: "{f} salmon, rice and broccoli",
    steps: ["{grain}", "Heat the oven to 400°F. Rub the salmon with half the oil and {season}.", "Toss the broccoli florets with the rest of the oil and a pinch of salt. Spread the salmon and broccoli on a lined sheet pan.", "Roast 12 to 15 minutes, until the salmon flakes easily with a fork and reaches 145°F."] }),
  M("beefstirfry", "Beef and veggie stir-fry", "m", [["beef93", 150, "p"], ["rice", 150, "c"], ["stirfry", 150, "x"], ["oil", 7, "f"]], { batch: 1, t: 25,
    fl: ["teriyaki", "sweetchili", "peanut"], nm: "{f} beef stir-fry",
    steps: ["{grain}", "Heat the oil in a large skillet over high heat. Brown the beef, breaking it up, 6 to 7 minutes until no pink remains (160°F).", "Add the frozen vegetables and {season}. Stir-fry 4 to 5 minutes until hot and crisp-tender.", "Serve over the rice."] }),
  M("chickenpasta", "Chicken marinara pasta", "m", [["chicken", 140, "p"], ["pasta", 180, "c"], ["marinara", 120, "x"], ["parm", 10, "x"], ["oil", 5, "f"], ["spinach", 40, "x"]], { batch: 1, t: 30,
    fl: ["italian", "pestoit"], nm: "{f} chicken pasta",
    steps: ["{grain}", "Cut the chicken into bite-size pieces and toss with {season}.", "Heat the oil in a skillet over medium-high. Cook the chicken 6 to 8 minutes, turning, until no pink remains (165°F).", "Add the marinara and spinach and simmer 2 minutes until the spinach wilts.", "Toss with the pasta, loosening with a splash of pasta water. Top with parmesan."] }),
  M("shrimptacos", "Shrimp tacos", "m", [["shrimp", 160, "p"], ["corntort", 78, "c"], ["greens", 60, "x"], ["avocado", 50, "f"], ["salsa", 40, "x"]], { quick: 1, t: 15,
    fl: ["texmex", "cajun"], nm: "{f} shrimp tacos",
    steps: ["Pat the peeled shrimp dry and toss with {season}.", "Heat a skillet over medium-high with a spray of oil. Cook the shrimp 1½ to 2 minutes per side until pink and opaque all the way through.", "Warm the tortillas in a dry pan, 30 seconds per side.", "Fill with shredded greens, shrimp, sliced avocado and salsa."] }),
  M("meatballs", "Turkey meatballs and sweet potato", "m", [["turkey93", 150, "p"], ["sweetpot", 200, "c"], ["broccoli", 150, "x"], ["oil", 7, "f"]], { batch: 1, t: 35, oven: 400,
    fl: ["italian", "greek", "bbq"], nm: "{f} turkey meatballs and sweet potatoes",
    steps: ["Heat the oven to 400°F. Cut the sweet potatoes into 1-inch cubes and toss with the oil and a pinch of salt.", "Mix the turkey with {season}. Roll into 1½-inch meatballs, about 4 per serving.", "Put the meatballs and sweet potatoes on a lined sheet pan. Roast 18 to 20 minutes, until the meatballs reach 165°F inside.", "Add the broccoli to the pan for the last 10 minutes."] }),
  M("sheetpan", "Sheet-pan chicken and sweet potatoes", "m", [["chicken", 150, "p"], ["sweetpot", 220, "c"], ["peppers", 100, "x"], ["oil", 10, "f"]], { batch: 1, t: 35, oven: 425, seasonAll: 1,
    fl: ["cajun", "lemonherb", "bbq", "greek"], nm: "{f} sheet-pan chicken and sweet potatoes",
    steps: ["Heat the oven to 425°F.", "Cut the chicken into 1½-inch pieces, the sweet potatoes into 1-inch cubes and the peppers into strips.", "Toss everything with the oil and {season}. Spread in a single layer on a lined sheet pan. Use two pans if it's crowded so everything browns instead of steaming.", "Roast 22 to 25 minutes, flipping halfway, until the chicken reaches 165°F and the potatoes are tender."] }),
  M("tunawrap", "Tuna salad wrap", "m", [["tuna", 120, "p"], ["greek", 50, "x"], ["tortilla", 60, "c"], ["greens", 40, "x"], ["avocado", 40, "f"]], { quick: 1, t: 10,
    fl: ["lemonherb", "buffalo"], nm: "{f} tuna salad wrap",
    steps: ["Drain the tuna well. Mix with the Greek yogurt and {season}.", "Lay the tortilla flat. Add greens, the tuna salad and sliced avocado.", "Fold in the sides and roll up tight. Cut in half."] }),
  M("lentilcurry", "Lentil curry", "m", [["lentils", 250, "p"], ["rice", 120, "c"], ["marinara", 100, "x"], ["spinach", 60, "x"], ["oil", 10, "f"]], { batch: 1, t: 35,
    fl: ["curry"], nm: "Lentil curry",
    steps: ["{grain}", "Heat the oil in a pot over medium. Add {season} and stir 30 seconds until fragrant.", "Add the cooked lentils, the marinara and ½ cup water per serving. Simmer 10 minutes.", "Stir in the spinach until wilted. Taste and add salt if needed. Serve over the rice."] }),
  M("tofustirfry", "Tofu stir-fry", "m", [["tofu", 200, "p"], ["rice", 150, "c"], ["stirfry", 150, "x"], ["oil", 7, "f"]], { batch: 1, t: 30,
    fl: ["teriyaki", "sweetchili", "peanut"], nm: "{f} tofu stir-fry",
    steps: ["{grain}", "Press the tofu between paper towels 10 minutes, then cut into ¾-inch cubes.", "Heat the oil in a nonstick skillet over medium-high. Cook the tofu 8 to 10 minutes, turning, until golden on most sides.", "Add the frozen vegetables and {season}. Stir-fry 4 to 5 minutes.", "Serve over the rice."] }),
  M("chickpeabowl", "Chickpea quinoa bowl", "m", [["chickpeas", 150, "p"], ["pea", 15, "p"], ["quinoa", 150, "c"], ["greens", 50, "x"], ["peppers", 50, "x"], ["oil", 10, "f"]], { plant: 1, batch: 1, t: 35, oven: 425,
    fl: ["greek", "lemonherb"], nm: "{f} chickpea quinoa bowl",
    steps: ["{grain}", "Heat the oven to 425°F. Rinse the chickpeas and pat very dry. Toss with half the oil and {season}.", "Roast 20 to 25 minutes, shaking the pan halfway, until crisp.", "Build the bowl: quinoa, greens, diced peppers and chickpeas. Drizzle with the rest of the oil and a squeeze of lemon.", "Have the protein powder as a shake on the side."] }),
  M("tempehbowl", "Tempeh rice bowl", "m", [["tempeh", 120, "p"], ["brownrice", 150, "c"], ["broccoli", 150, "x"], ["oil", 5, "f"]], { batch: 1, t: 50,
    fl: ["teriyaki", "peanut", "bbq"], nm: "{f} tempeh rice bowl",
    steps: ["{grain}", "Slice the tempeh into ¼-inch strips. Simmer in a little water 5 minutes to take away any bitterness, then drain.", "Heat the oil in a skillet over medium-high. Add the tempeh and {season}. Cook 3 to 4 minutes per side until golden.", "Steam or microwave the broccoli 3 to 4 minutes. Serve everything over the brown rice."] }),
  M("beanbowl", "Black bean bowl", "m", [["blackbeans", 150, "c"], ["greek", 80, "p"], ["rice", 100, "c"], ["cheddar", 25, "f"], ["salsa", 60, "x"], ["greens", 30, "x"]], { batch: 1, t: 25,
    fl: ["texmex"], nm: "Black bean burrito bowl",
    steps: ["{grain}", "Warm the rinsed black beans in a small pot with {season} and a splash of water, 5 minutes.", "Build the bowl: rice, beans, greens, salsa and cheddar.", "Top with the Greek yogurt in place of sour cream."] }),
  M("veganbeanbowl", "Black bean and avocado bowl", "m", [["blackbeans", 200, "p"], ["pea", 15, "p"], ["rice", 100, "c"], ["salsa", 60, "x"], ["avocado", 50, "f"], ["greens", 30, "x"]], { plant: 1, batch: 1, t: 25,
    fl: ["texmex"], nm: "Black bean and avocado bowl",
    steps: ["{grain}", "Warm the rinsed black beans in a small pot with {season} and a splash of water, 5 minutes.", "Build the bowl: rice, beans, greens, salsa and sliced avocado.", "Have the protein powder as a shake on the side."] }),
  M("porktenderloin", "Pork tenderloin and potatoes", "m", [["pork", 150, "p"], ["potato", 250, "c"], ["broccoli", 150, "x"], ["oil", 7, "f"]], { batch: 1, t: 40, oven: 425, seasonAll: 1,
    fl: ["bbq", "lemonherb", "cajun"], nm: "{f} pork tenderloin and potatoes",
    steps: ["{starch}", "Rub the pork with a little oil and {season}.", "Sear in a hot oven-safe skillet 2 minutes per side, then move to the 425°F oven for 15 to 18 minutes, until it reaches 145°F in the center.", "Rest 5 minutes before slicing so it stays juicy. Steam the broccoli while it rests."] }),
  M("codquinoa", "Cod, quinoa and broccoli", "m", [["cod", 180, "p"], ["quinoa", 160, "c"], ["broccoli", 150, "x"], ["oil", 10, "f"]], { quick: 1, t: 25, oven: 400,
    fl: ["lemonherb", "cajun", "greek"], nm: "{f} cod with quinoa and broccoli",
    steps: ["{grain}", "Heat the oven to 400°F. Brush the cod with half the oil and sprinkle with {season}.", "Toss the broccoli with the rest of the oil. Roast the cod and broccoli on a lined sheet pan 10 to 12 minutes, until the fish flakes easily and reaches 145°F."] }),
  M("greekpita", "Greek chicken pita", "m", [["chicken", 150, "p"], ["pita", 64, "c"], ["greens", 60, "x"], ["feta", 25, "x"], ["oil", 8, "f"]], { quick: 1, t: 20,
    fl: ["greek"], nm: "Greek chicken pita",
    steps: ["Slice the chicken into strips and toss with half the oil and {season}.", "Cook in a skillet over medium-high 6 to 8 minutes, until no pink remains (165°F).", "Warm the pita and stuff with greens, chicken and crumbled feta.", "Drizzle with the rest of the oil and a squeeze of lemon."] }),
  M("friedrice", "Egg fried rice", "m", [["egg", 100, "f"], ["whites", 150, "p"], ["rice", 180, "c"], ["stirfry", 120, "x"]], { quick: 1, t: 15,
    fl: ["teriyaki", "sweetchili"], nm: "{f} egg fried rice",
    steps: ["Use cold, leftover rice if you have it. It fries better than fresh.", "Heat a large nonstick skillet over medium-high with a spray of oil. Stir-fry the frozen vegetables 3 minutes.", "Add the rice and {season}. Stir-fry 3 minutes until hot.", "Push everything to the side. Pour in the eggs and whites and scramble until fully set, then mix it all together."] }),
  M("beeftacos", "Beef tacos", "m", [["beef93", 140, "p"], ["corntort", 78, "c"], ["salsa", 50, "x"], ["cheddar", 20, "f"], ["greens", 40, "x"]], { batch: 1, t: 20,
    fl: ["texmex"], nm: "Beef tacos",
    steps: ["Brown the beef in a skillet over medium-high, breaking it up, 6 to 7 minutes until no pink remains (160°F).", "Stir in {season} and 2 tbsp water per serving. Simmer 2 minutes until saucy.", "Warm the tortillas in a dry pan, 30 seconds per side.", "Fill with beef, shredded greens, cheddar and salsa."] }),
  M("turkeysandwich", "Turkey and cheese sandwich", "m", [["deliturkey", 120, "p"], ["bread", 64, "c"], ["mozz", 20, "f"], ["greens", 30, "x"]], { quick: 1, t: 5,
    fl: ["honeymustard", "buffalo"], nm: "{f} turkey and cheese sandwich",
    steps: ["Toast the bread if you like.", "Layer the turkey, cheese and greens, seasoned with {season}."] }),
  M("salmonbowl", "Salmon quinoa bowl", "m", [["salmon", 140, "p"], ["quinoa", 150, "c"], ["greens", 80, "x"], ["avocado", 40, "f"]], { t: 25, oven: 400,
    fl: ["teriyaki", "lemonherb", "sweetchili"], nm: "{f} salmon quinoa bowl",
    steps: ["{grain}", "Heat the oven to 400°F. Season the salmon with {season} and roast on a lined sheet pan 12 to 15 minutes, until it flakes easily (145°F).", "Build the bowl: quinoa, greens, salmon broken into chunks and sliced avocado."] }),
  M("tofucurry", "Tofu and spinach curry", "m", [["tofu", 200, "p"], ["rice", 150, "c"], ["spinach", 60, "x"], ["marinara", 100, "x"], ["oil", 7, "f"]], { batch: 1, t: 30,
    fl: ["curry"], nm: "Tofu and spinach curry",
    steps: ["{grain}", "Press the tofu 10 minutes, then cut into cubes.", "Heat the oil in a deep skillet over medium-high. Brown the tofu 6 to 8 minutes, turning.", "Add {season} and stir 30 seconds. Add the marinara and ¼ cup water per serving. Simmer 8 minutes.", "Stir in the spinach until wilted. Serve over the rice."] }),
  M("chickpeapasta", "Chickpea marinara pasta", "m", [["chickpeas", 150, "p"], ["pea", 15, "p"], ["pasta", 160, "c"], ["marinara", 120, "x"], ["oil", 7, "f"]], { plant: 1, batch: 1, t: 25,
    fl: ["italian"], nm: "Chickpea marinara pasta",
    steps: ["{grain}", "Heat the oil in a skillet over medium. Add the rinsed chickpeas and {season}. Cook 4 minutes.", "Add the marinara and simmer 5 minutes, lightly mashing a few chickpeas to thicken it.", "Toss with the pasta. Have the protein powder as a shake on the side."] }),
  M("chickenpotato", "Chicken, potatoes and green salad", "m", [["chicken", 150, "p"], ["potato", 250, "c"], ["greens", 80, "x"], ["oil", 10, "f"]], { batch: 1, t: 40, oven: 425, seasonAll: 1,
    fl: ["lemonherb", "greek", "bbq", "cajun"], nm: "{f} roast chicken, potatoes and salad",
    steps: ["{starch}", "Pound the chicken to an even thickness and rub with a little oil and {season}.", "Add the chicken to the potato pan for the last 18 to 22 minutes, until it reaches 165°F. Rest 5 minutes, then slice.", "Toss the greens with the rest of the oil, a splash of vinegar and a pinch of salt."] }),
  // ---- snacks ----
  M("yogurtberries", "Greek yogurt and berries", "s", [["greek", 200, "p"], ["berries", 100, "c"], ["honey", 10, "c"], ["almonds", 10, "f"]], { quick: 1, t: 2,
    fl: ["berryvanilla", "cinnamon", "choc"], nm: "{f} yogurt and berries",
    steps: ["Stir {season} into the yogurt.", "Top with berries, honey and almonds."] }),
  M("applepb", "Apple, peanut butter and jerky", "s", [["apple", 180, "c"], ["pb", 20, "f"], ["jerky", 30, "p"]], { quick: 1, t: 2,
    fl: ["cinnamon", "pbbanana"], nm: "Apple, peanut butter and jerky",
    steps: ["Slice the apple and dip in the peanut butter, sprinkled with {season}.", "Eat the jerky alongside."] }),
  M("cottagefruit", "Cottage cheese and fruit", "s", [["cottage", 200, "p"], ["berries", 100, "c"], ["apple", 90, "c"]], { quick: 1, t: 2,
    fl: ["cinnamon", "berryvanilla"], nm: "{f} cottage cheese and fruit",
    steps: ["Stir {season} into the cottage cheese.", "Top with berries and diced apple."] }),
  M("shake", "Protein shake and banana", "s", [["whey", 30, "p"], ["banana", 118, "c"], ["milk", 250, "x"]], { quick: 1, t: 2,
    fl: ["berryvanilla", "choc"], nm: "{f} protein shake and banana",
    steps: ["Shake or blend the milk, protein powder and {season} with ice.", "Eat the banana alongside, or blend it in."] }),
  M("hummusplate", "Hummus, pita and edamame", "s", [["hummus", 60, "f"], ["pita", 40, "c"], ["peppers", 100, "x"], ["edamame", 80, "p"]], { quick: 1, t: 5,
    steps: ["Microwave the frozen edamame 2 to 3 minutes, sprinkle with salt.", "Slice the pita and peppers. Dip in the hummus."] }),
  M("ricecakes", "Rice cakes, peanut butter and yogurt", "s", [["ricecake", 18, "c"], ["pb", 16, "f"], ["greek", 150, "p"]], { quick: 1, t: 2,
    fl: ["cinnamon", "choc"], nm: "{f} rice cakes and yogurt",
    steps: ["Spread the peanut butter on the rice cakes.", "Stir {season} into the yogurt and eat it alongside."] }),
  M("hbeggs", "Hard-boiled eggs and fruit", "s", [["egg", 100, "p"], ["banana", 118, "c"]], { batch: 1, quick: 1, t: 15,
    fl: ["everything"], nm: "Everything bagel hard-boiled eggs and fruit",
    steps: ["Cover the eggs with cold water in a pot. Bring to a boil, cover, take off the heat and let stand 12 minutes so the yolks are fully cooked.", "Move to ice water for 5 minutes, then peel.", "Sprinkle with {season}. Eat the banana alongside.", "Make a dozen at once. Unpeeled eggs keep a week in the fridge."] }),
  M("edamamefruit", "Edamame and an apple", "s", [["edamame", 150, "p"], ["apple", 150, "c"], ["almonds", 10, "f"]], { quick: 1, t: 4,
    steps: ["Microwave the frozen edamame 2 to 3 minutes, then sprinkle with salt.", "Eat with the apple and almonds."] }),
  M("vshake", "Plant protein shake", "s", [["pea", 30, "p"], ["banana", 118, "c"], ["chia", 10, "f"]], { quick: 1, t: 3,
    fl: ["berryvanilla", "choc"], nm: "{f} plant protein shake",
    steps: ["Blend the protein powder, banana, chia seeds and {season} with 1 cup cold water and ice, 45 seconds."] }),
  M("cheesejerky", "String cheese, jerky and an apple", "s", [["mozz", 28, "f"], ["jerky", 30, "p"], ["apple", 150, "c"]], { quick: 1, t: 1,
    steps: ["Grab and go."] }),
  M("tunacakes", "Tuna on rice cakes", "s", [["tuna", 100, "p"], ["ricecake", 27, "c"], ["avocado", 30, "f"]], { quick: 1, t: 5,
    fl: ["lemonherb", "buffalo"], nm: "{f} tuna on rice cakes",
    steps: ["Drain the tuna and mix with {season}.", "Mash the avocado onto the rice cakes and top with the tuna."] }),
];
const BY_ID = {}; MEALS.forEach(m => { BY_ID[m.id] = m; });

/* ---------- filters ---------- */
const STYLE_BLOCK = {
  none: [], pescatarian: ["meat"], vegetarian: ["meat", "fish", "shellfish"],
  vegan: ["meat", "fish", "shellfish", "dairy", "egg", "honey"]
};
const ALLERGY_TAG = { dairy: "dairy", eggs: "egg", gluten: "gluten", nuts: "nuts", peanuts: "peanut", shellfish: "shellfish", fish: "fish", soy: "soy" };
const DISLIKE_ING = {
  mushrooms: ["mushrooms"], beans: ["blackbeans", "chickpeas", "lentils"], fish: ["salmon", "cod", "tuna"], shrimp: ["shrimp"],
  tofu: ["tofu", "tempeh"], cottage: ["cottage"], greek: ["greek"], avocado: ["avocado"], oats: ["oats", "granola"], eggs: ["egg", "whites"]
};
function blockedTags(pr) {
  const b = new Set(STYLE_BLOCK[pr.style || "none"] || []);
  (pr.allergies || []).forEach(a => { if (ALLERGY_TAG[a]) b.add(ALLERGY_TAG[a]); });
  if (pr.pregnant) b.add("deli");
  return b;
}
function dislikedIngs(pr) { const dis = new Set(); (pr.dislikes || []).forEach(d => (DISLIKE_ING[d] || []).forEach(i => dis.add(i))); return dis; }
function mealOK(m, pr) {
  const b = blockedTags(pr), dis = dislikedIngs(pr);
  return m.items.every(it => !dis.has(it.ing) && !ING[it.ing].tags.some(t => b.has(t)));
}
function sauceOK(k, pr) {
  const s = SAUCES[k], b = blockedTags(pr), dis = dislikedIngs(pr);
  const tags = s.ing ? ING[s.ing].tags : s.tags;
  if (tags.some(t => b.has(t))) return false;
  if (s.makes && Object.keys(s.makes).some(i => dis.has(i) || ING[i].tags.some(t => b.has(t)))) return false;
  return true;
}
function profileSauces(fl, pr) { const P = PROFILES[fl]; return P ? P.sauces.filter(k => sauceOK(k, pr)) : []; }
function flavorsFor(m, pr) {
  return (m.fl || []).filter(f => { const P = PROFILES[f]; return P && (!P.needsSauce || profileSauces(f, pr).length); });
}

/* ---------- the meal with its flavor applied ---------- */
function withFlavor(m, slot, pr) {
  const fls = flavorsFor(m, pr);
  const fl = fls.includes(slot.fl) ? slot.fl : fls[0];
  const P = fl ? PROFILES[fl] : null;
  let sauce = null;
  if (P) { const ss = profileSauces(fl, pr); if (ss.length) sauce = ss[(slot.v || 0) % ss.length]; }
  const items = m.items.slice();
  if (sauce) items.push({ ing: sauceIng(sauce), g: SAUCES[sauce].g, r: "x", sauce: 1 });
  const name = P && m.nm ? m.nm.replace("{f}", P.label) : m.name;
  // sides to fall back on when the main dish alone can't reach the targets without silly portions
  const b = blockedTags(pr), dis = dislikedIngs(pr), have = new Set(m.items.map(i => i.ing));
  const okIng = i => !have.has(i) && !dis.has(i) && !ING[i].tags.some(t => b.has(t));
  const sides = {
    c: (m.slot === "m" ? ["rice", "potato", "corntort", "bread", "quinoa", "apple"] : ["banana", "apple", "bread", "berries", "ricecake"]).find(okIng),
    p: ["whey", "greek", "pea", "edamame", "whites"].find(okIng)
  };
  return { ...m, items, name, fl, P, sauce, flavors: fls, sides };
}

/* ---------- portion solver ----------
   Scale the p, c and f groups so the meal lands on its protein/carb/fat targets. */
function macrosOf(items) {
  const t = { p: 0, c: 0, f: 0 };
  items.forEach(it => { const g = ING[it.ing]; t.p += g.p * it.g / 100; t.c += g.c * it.g / 100; t.f += g.f * it.g / 100; });
  t.cal = t.p * 4 + t.c * 4 + t.f * 9;
  return t;
}
function roundG(ing, g) {
  const u = ING[ing].unit, max = MAXG[ing];
  if (u) { const step = u.g / (u.n === "scoop" ? 2 : 1); let r = Math.max(step, Math.round(g / step) * step); while (max && r > max && r > step) r -= step; return r; }
  const cap = v => (max ? Math.min(max, v) : v);
  if (ING[ing].f > 90 || g < 30) return cap(Math.max(5, Math.round(g / 5) * 5));
  return cap(Math.max(10, Math.round(g / 10) * 10));
}
/* most a real person would eat of one thing in one meal (grams) */
const MAXG = { banana: 236, apple: 270, berries: 250, honey: 25, sweetpot: 350, potato: 400, blackbeans: 200, chickpeas: 200,
  lentils: 300, rice: 300, brownrice: 300, quinoa: 300, pasta: 300, oats: 100, bread: 128, tortilla: 135, corntort: 104, pita: 128,
  granola: 80, ricecake: 45, cottage: 350, greek: 320, hummus: 90, almonds: 40, pb: 40, chia: 30, avocado: 100, oil: 25, cheddar: 50,
  mozz: 56, edamame: 250, milk: 360, whey: 45, pea: 45, jerky: 60, egg: 200, whites: 300, tofu: 300, tempeh: 200,
  chicken: 230, turkey93: 230, beef93: 230, pork: 230, salmon: 230, cod: 260, shrimp: 260, tuna: 200, deliturkey: 170, feta: 50, parm: 20 };
/* least that still reads as a real portion (grams); smaller amounts get bumped up and the rest of the day absorbs it */
const MING = { chicken: 85, turkey93: 85, beef93: 85, pork: 85, salmon: 85, cod: 85, shrimp: 85, tuna: 70, deliturkey: 55, jerky: 20,
  egg: 50, whites: 60, greek: 100, cottage: 110, tofu: 100, tempeh: 85, edamame: 75, lentils: 100, blackbeans: 60, chickpeas: 60,
  rice: 75, brownrice: 75, quinoa: 75, pasta: 100, oats: 30, potato: 100, sweetpot: 100, bread: 32, tortilla: 45, corntort: 52, pita: 40,
  granola: 20, ricecake: 9, banana: 59, apple: 90, berries: 50, avocado: 25, almonds: 10, pb: 8, oil: 5, cheddar: 14, mozz: 14,
  feta: 14, parm: 5, hummus: 30, chia: 5, honey: 5, whey: 15, pea: 15, milk: 100, cocoa: 3 };
function solve(items, target, slot) {
  const roles = ["p", "c", "f"];
  const base = {}; roles.forEach(r => { base[r] = macrosOf(items.filter(i => i.r === r)); });
  const fixed = macrosOf(items.filter(i => i.r === "x"));
  const s = { p: 1, c: 1, f: 1 };
  const W = { p: 3, c: 1, f: 2 }; // protein matters most, then fat, then carbs
  for (let it = 0; it < 60; it++) {
    roles.forEach(r => {
      if (!(base[r].cal > 0)) return;
      // 1-D best step for this group via derivative of the quadratic
      let num = 0, den = 0;
      ["p", "c", "f"].forEach(k => {
        const other = fixed[k] + roles.filter(x => x !== r).reduce((a, x) => a + base[x][k] * s[x], 0);
        num += W[k] * base[r][k] * (target[k] - other); den += W[k] * base[r][k] * base[r][k];
      });
      // mains keep a real piece of protein; nothing gets silly-small or huge
      const lo = { p: slot === "m" ? 0.75 : 0.5, c: 0.15, f: 0.25 }[r], hi = { p: 3, c: 4.5, f: 2.5 }[r];
      if (den > 0) s[r] = Math.max(lo, Math.min(hi, num / den));
    });
  }
  return s;
}
function fitItems(items, target, slot) {
  items = items.map(i => ({ ...i }));
  // solve, then pin anything past a sensible max and solve again for the rest
  for (let round = 0; round < 4; round++) {
    const s = solve(items, target, slot);
    let pinned = false;
    items.forEach(i => {
      if (i.r === "x" || i.sauce) return;
      const g = i.g * s[i.r], max = MAXG[i.ing], min = MING[i.ing];
      if (max && g > max) { i.g = max; i.r = "x"; pinned = true; }
      else if (min && g < min) { i.g = min; i.r = "x"; pinned = true; }
    });
    if (!pinned || round === 3)
      return items.map(i => ({ ing: i.ing, g: i.sauce ? i.g : roundG(i.ing, i.r === "x" ? i.g : i.g * s[i.r]), ...(i.sauce ? { sauce: 1 } : {}), ...(i.side ? { side: 1 } : {}) })).filter(i => i.g > 0);
  }
}
function scaleMeal(m, target) {
  let items = m.items.map(i => ({ ...i }));
  let out = fitItems(items, target, m.slot);
  // still well short after the caps? add a simple side
  if (m.sides) {
    let mac = macrosOf(out);
    if (m.sides.c && target.c - mac.c > 15) { items.push({ ing: m.sides.c, g: 100, r: "c", side: 1 }); out = fitItems(items, target, m.slot); mac = macrosOf(out); }
    if (m.sides.p && target.p - mac.p > (items.some(i => i.side) ? 20 : 12)) { items.push({ ing: m.sides.p, g: 100, r: "p", side: 1 }); out = fitItems(items, target, m.slot); }
  }
  return { id: m.id, name: m.name, items: out, ...macrosOf(out) };
}

/* ---------- friendly numbers ---------- */
const FR = [[0, ""], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
function frac(x, min) {
  x = Math.max(min || 0.25, x);
  let w = Math.floor(x), r = x - w, best = FR[0];
  FR.forEach(f => { if (Math.abs(f[0] - r) < Math.abs(best[0] - r)) best = f; });
  if (best[0] === 1) { w += 1; best = FR[0]; }
  return (w ? String(w) : "") + best[1] || "¼";
}
function cups(x) { const t = frac(x); return `${t} cup${x > 1.15 ? "s" : ""}`; }
function tsp(x) {
  x = Math.max(0.5, Math.round(x * 2) / 2);
  if (x >= 3) { const tb = Math.round(x / 3 * 2) / 2; return `${frac(tb, 0.5)} tbsp`; }
  return `${frac(x, 0.5)} tsp`;
}

const PROPER = /^(Cajun|Greek|Italian|Thai|Dijon|BBQ)\b/;
function lc(t) { return PROPER.test(t) || /^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1); }

/* ---------- recipe text for a portioned meal ---------- */
function rawOz(it) { return it.g * (BUY[it.ing] ? Math.max(1, BUY[it.ing][0]) : 1) / 28.35; }
function recipe(fm, items) {
  const P = fm.P;
  const pItem = items.find(it => fm.items.some(o => o.ing === it.ing && o.r === "p"));
  let oz = pItem ? rawOz(pItem) : 4;
  if (fm.seasonAll) items.forEach(it => { if (["potato", "sweetpot"].includes(it.ing)) oz += it.g / 28.35 / 2; });
  const cap = fm.slot === "m" ? 3 : 1; // breakfasts and snacks get a lighter hand
  let season, seasonTsp = 0;
  if (P && P.season) season = P.season;
  else if (P && P.blend) { seasonTsp = Math.min(cap, Math.max(0.5, Math.round(oz / 5 * 2) / 2)); season = `${tsp(seasonTsp)} ${lc(BLENDS[P.blend].name)}`; }
  else season = "a pinch each of salt, pepper and garlic powder";
  const grainIt = items.find(it => GRAIN[it.ing]);
  const grainText = () => {
    if (!grainIt) return "";
    const G = GRAIN[grainIt.ing], dryG = grainIt.g / G.yield;
    if (G.oz) return G.how(`${frac(dryG / 28.35, 0.5)} oz`);
    const c = dryG / G.dryCup;
    return G.how(cups(c), cups(c * G.water)) + (c < 0.5 ? ` Easier: cook a big pot once and reheat portions all week (cooked ${G.label} keeps 4 days in the fridge).` : "");
  };
  const oats = items.find(it => it.ing === "oats");
  const liquid = oats ? cups(oats.g / 40 * 0.75 + 0.25) : "¾ cup";
  const steps = [];
  if (fm.sauce && SAUCES[fm.sauce].recipe) steps.push(`Make the ${lc(SAUCES[fm.sauce].name)}: ${SAUCES[fm.sauce].recipe}`);
  (fm.steps || ["Cook the protein all the way through, add the carb and vegetables, finish with the fat. Season with {season}."]).forEach(s => {
    if (s === "{grain}") { const g = grainText(); if (g) steps.push(g); return; }
    if (s === "{starch}") { steps.push(items.some(it => it.ing === "sweetpot") ? SWEET_STARCH : STARCH); return; }
    steps.push(s.replace("{season}", season).replace("{liquid}", liquid));
  });
  const sideIts = items.filter(it => it.side);
  if (sideIts.length) steps.push(`On the side: ${sideIts.map(it => amountLine(it.ing, it.g)).join(" and ")}.${sideIts.some(it => GRAIN[it.ing]) ? " Use leftover or microwave-pouch grains to keep it easy." : ""}`);
  if (fm.sauce) {
    const S = SAUCES[fm.sauce];
    if (S.ing) { /* cocoa is stirred in via {season} */ }
    else steps.push(S.store ? `Finish with the ${lc(S.name)}.` : `Spoon the ${lc(S.name)} over the top and serve.`);
  }
  const jar = P && (P.blend || P.jar) ? BLENDS[P.blend || P.jar] : null;
  return {
    steps, time: fm.t || 0, flavor: P ? P.label : "", flavors: fm.flavors || [], seasonTsp,
    blend: jar ? { name: jar.name, jar: jar.jar } : null,
    sauce: fm.sauce && !SAUCES[fm.sauce].ing ? { name: SAUCES[fm.sauce].name, recipe: SAUCES[fm.sauce].recipe || "", store: !!SAUCES[fm.sauce].store } : null
  };
}

/* ---------- day + week ---------- */
const SPLITS = {
  3: [["b", 0.30, "Breakfast"], ["m", 0.35, "Lunch"], ["m", 0.35, "Dinner"]],
  4: [["b", 0.25, "Breakfast"], ["m", 0.30, "Lunch"], ["s", 0.15, "Snack"], ["m", 0.30, "Dinner"]],
  5: [["b", 0.22, "Breakfast"], ["s", 0.12, "Morning snack"], ["m", 0.28, "Lunch"], ["s", 0.12, "Afternoon snack"], ["m", 0.26, "Dinner"]],
};
function rng(seed) { let x = 0; for (const ch of String(seed)) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

/* fallback "plate" if the filters leave nothing for a slot */
function plateFallback(slot, pr) {
  const b = blockedTags(pr);
  const ok = id => !ING[id].tags.some(t => b.has(t));
  const pick = arr => arr.find(ok);
  const p = pick(["chicken", "turkey93", "salmon", "cod", "egg", "greek", "tofu", "tempeh", "lentils", "pea"]);
  const c = pick(slot === "b" ? ["oats", "potato", "banana", "rice"] : ["rice", "potato", "quinoa", "sweetpot"]);
  const f = pick(["oil", "avocado", "chia"]);
  const items = [[p, 150, "p"], [c, 150, "c"], ["broccoli", 120, "x"], [f, 8, "f"]].filter(x => x[0]);
  return M("plate-" + slot, "Simple plate", slot, items, { t: 25, fl: ["lemonherb"], nm: "{f} simple plate",
    steps: [...(GRAIN[c] ? ["{grain}"] : []), "Season the protein with {season} and cook it all the way through.", "Steam or roast the broccoli and serve with the protein and carb, finished with the fat."] });
}

/* prefs: { meals: 3|4|5, style, allergies[], dislikes[], cooking: "daily"|"batch"|"minimal", people, pregnant, breastfeeding }
   Returns ids per day (portions are worked out when shown, so they follow target changes). */
function planWeek(pr, start) {
  const split = SPLITS[pr.meals] || SPLITS[3];
  const R = rng(start + JSON.stringify(pr));
  const pool = slot => {
    let c = MEALS.filter(m => m.slot === slot && mealOK(m, pr));
    if (pr.cooking === "minimal") { const q = c.filter(m => m.quick); if (q.length >= 3) c = q; }
    // plant-protein-powder meals are for vegans; others get them only if little else fits
    if (pr.style !== "vegan") { const np = c.filter(m => !m.plant); if (np.length >= 3) c = np; }
    if (!c.length) c = [plateFallback(slot, pr)];
    return c;
  };
  const shuffle = a => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const limitTuna = pr.pregnant || pr.breastfeeding;
  let tunaUsed = 0;
  const tunaOK = id => { const m = BY_ID[id]; if (!m || !limitTuna) return true; return !m.items.some(i => i.ing === "tuna") || tunaUsed < 2; };
  const noteTuna = id => { const m = BY_ID[id]; if (m && m.items.some(i => i.ing === "tuna")) tunaUsed++; };
  const pickFl = (m, avoid) => {
    const fls = flavorsFor(m, pr); if (!fls.length) return "";
    const fresh = fls.filter(f => !avoid.has(f));
    const from = fresh.length ? fresh : fls;
    return from[Math.floor(R() * from.length)];
  };

  const days = [];
  // batch mode: two prep days, each cooks 2 mains that cover lunch and dinner
  let batchMains = null;
  if (pr.cooking === "batch") {
    let mains = pool("m"); const bm = mains.filter(m => m.batch); if (bm.length >= 2) mains = bm;
    const sh = shuffle(mains);
    batchMains = [[sh[0], sh[1 % sh.length]], [sh[2 % sh.length], sh[3 % sh.length]]].map(pair => {
      const used = new Set();
      return pair.map(m => { const fl = pickFl(m, used); used.add(fl); return { m, fl, v: Math.floor(R() * 1000) }; });
    });
  }
  const recent = [];
  for (let d = 0; d < 7; d++) {
    const used = new Set(), flUsed = new Set(), day = [];
    let mainIdx = 0;
    split.forEach(([slot, share, label]) => {
      let id, fl, v;
      if (slot === "m" && batchMains) {
        const half = d < 3 ? 0 : 1;
        const b = batchMains[half][mainIdx++ % 2];
        id = b.m.id; fl = b.fl; v = b.v;
      } else {
        const opts = shuffle(pool(slot));
        // day 1 can't use make-ahead meals: nobody has had the chance to prep them yet
        const aheadOK = m => d > 0 || !m.ahead;
        let cands = opts.filter(m => !used.has(m.id) && !recent.slice(-2).some(r => r.has(m.id)) && tunaOK(m.id) && aheadOK(m));
        if (!cands.length) cands = opts.filter(m => !used.has(m.id) && tunaOK(m.id) && aheadOK(m));
        if (!cands.length) cands = opts.filter(aheadOK);
        if (!cands.length) cands = [plateFallback(slot, pr)];
        // of a few random options, take the one that can hit this person's macros best
        if (pr.targets) {
          const t = { p: pr.targets.protein * share, c: pr.targets.carbs * share, f: pr.targets.fat * share };
          const score = m => { const r = scaleMeal(m, t); return 3 * Math.abs(r.p - t.p) / t.p + Math.abs(r.c - t.c) / Math.max(t.c, 1) + 2 * Math.abs(r.f - t.f) / t.f; };
          cands = cands.slice(0, 5).sort((a, b) => score(a) - score(b));
        }
        id = cands[0].id; fl = pickFl(cands[0], flUsed); v = Math.floor(R() * 1000);
      }
      used.add(id); flUsed.add(fl); noteTuna(id);
      day.push({ slot, share, label, id, fl, v });
    });
    recent.push(used);
    days.push(day);
  }
  return { start, days, prep: batchMains ? [{ day: 0, ids: batchMains[0].map(b => b.m.id), covers: [0, 1, 2] }, { day: 3, ids: batchMains[1].map(b => b.m.id), covers: [3, 4, 5, 6] }] : null };
}
function getMeal(id, pr) { return BY_ID[id] || (id.startsWith("plate-") ? plateFallback(id.slice(6), pr || {}) : null); }

/* Portions for one day against the day's targets {protein, carbs, fat}. */
function dayPortions(day, targets, pr) {
  const goal = { p: targets.protein, c: targets.carbs, f: targets.fat };
  const fms = day.map(slot => withFlavor(getMeal(slot.id, pr), slot, pr));
  let adj = { p: 0, c: 0, f: 0 }, meals;
  // passes: whatever one meal can't hit gets spread over the others
  for (let pass = 0; pass < 3; pass++) {
    meals = day.map((slot, i) => {
      const t = {}; ["p", "c", "f"].forEach(k => { t[k] = Math.max(1, (goal[k] + adj[k]) * slot.share); });
      return { ...slot, ...scaleMeal(fms[i], t), name: fms[i].name };
    });
    const sum = meals.reduce((a, m) => ({ p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { p: 0, c: 0, f: 0 });
    ["p", "c", "f"].forEach(k => { adj[k] += (goal[k] - sum[k]) * 0.8; });
  }
  meals = meals.map((m, i) => ({ ...m, ...recipe(fms[i], m.items), fl: fms[i].fl }));
  const tot = meals.reduce((a, m) => ({ p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { p: 0, c: 0, f: 0 });
  tot.cal = tot.p * 4 + tot.c * 4 + tot.f * 9;
  return { meals, total: tot };
}
function swapOptions(day, idx, pr, noAhead) {
  const slot = day[idx].slot, inDay = new Set(day.map(x => x.id));
  return MEALS.filter(m => m.slot === slot && mealOK(m, pr) && !inDay.has(m.id) && !(noAhead && m.ahead)).map(m => m.id);
}
/* make-ahead meals in a day, so the day before can say "prep this tonight" */
function aheadMeals(day, pr) {
  return (day || []).map(sl => ({ sl, m: getMeal(sl.id, pr) })).filter(x => x.m && x.m.ahead)
    .map(x => { const fm = withFlavor(x.m, x.sl, pr); return { label: x.sl.label, name: fm.name, when: x.m.ahead }; });
}
/* pick a flavor for a swapped-in meal, or move to the next flavor of the same meal */
function firstFlavor(id, pr, seed) { const m = getMeal(id, pr), fls = m ? flavorsFor(m, pr) : []; return fls.length ? fls[(seed || 0) % fls.length] : ""; }
function nextFlavor(id, fl, pr) { const m = getMeal(id, pr), fls = m ? flavorsFor(m, pr) : []; if (fls.length < 2) return fl; return fls[(fls.indexOf(fl) + 1) % fls.length]; }

/* ---------- friendly amounts + shopping ---------- */
function amountLine(ing, g, side) {
  if (side) return amountLine(ing, g) + " (on the side)";
  const x = ING[ing];
  if (x.sauce) { const S = SAUCES[x.sauce]; return `${frac(g / 15, 0.5)} tbsp ${lc(S.name)}${S.recipe ? " (recipe below)" : ""}`; }
  if (ing === "cocoa") return `${frac(g / 5, 0.5)} tbsp unsweetened cocoa powder`;
  if (x.unit && UNIT_LABEL[ing]) { const v = Math.round(g / x.unit.g * 2) / 2; return `${v} ${UNIT_LABEL[ing][v === 1 ? 0 : 1]}`; }
  return `${amount(ing, g)} ${x.name.charAt(0).toLowerCase() + x.name.slice(1)}`;
}
function amount(ing, g) {
  const x = ING[ing];
  if (x.unit) { const n = g / x.unit.g; const v = Math.round(n * 2) / 2; return `${v} ${x.unit.n}${v === 1 ? "" : "s"}`; }
  if (["milk"].includes(ing)) return `${Math.round(g / 240 * 4) / 4} cup${g > 240 ? "s" : ""} (${g} g)`;
  if (["oil", "honey"].includes(ing)) return `${Math.max(0.5, Math.round(g / 13.5 * 2) / 2)} tbsp`;
  if (["pb", "almonds", "chia"].includes(ing)) return `${Math.max(0.5, Math.round(g / 16 * 2) / 2)} tbsp (${g} g)`;
  return `${g} g (${Math.round(g / 28.35 * 10) / 10} oz)`;
}
function shopItem(ing, g) {
  if (CANS[ing]) { const n = Math.ceil(g / CANS[ing]); const nm = ING[ing].name.replace(/ \((cooked|drained)\)/, ""); return { name: /^Canned/.test(nm) ? nm : nm + " (canned)", amt: `${n} can${n === 1 ? "" : "s"}` }; }
  if (BUY[ing]) return { name: BUY[ing][1], amt: shopAmount(ing, g * BUY[ing][0], true) };
  return { name: ING[ing].name, amt: shopAmount(ing, g) };
}
function shopAmount(ing, g, plain) {
  const x = ING[ing];
  if (plain) { const lb = g / 453.6; return lb >= 0.5 ? `${Math.ceil(lb * 4) / 4} lb` : `${Math.ceil(g / 28.35)} oz`; }
  if (x.unit) { const n = Math.ceil(g / x.unit.g); return `${n} ${x.unit.n}${n === 1 ? "" : "s"}`; }
  const lb = g / 453.6;
  if (lb >= 0.5) return `${Math.ceil(lb * 4) / 4} lb`;
  return `${Math.ceil(g / 28.35)} oz`;
}
const AISLES = [["protein", "Meat, seafood and tofu"], ["dairy", "Dairy, eggs and fridge"], ["produce", "Produce"], ["frozen", "Frozen"], ["grains", "Bread, rice and grains"], ["pantry", "Pantry and sauces"]];
/* add one portioned meal's ingredients to the totals; homemade sauces become what they're made of */
function addItems(tot, extras, items, mult) {
  items.forEach(it => {
    const x = ING[it.ing];
    if (x.sauce) {
      const S = SAUCES[x.sauce];
      if (S.store) { tot[it.ing] = (tot[it.ing] || 0) + it.g * mult; return; }
      Object.entries(S.makes || {}).forEach(([i, share]) => { tot[i] = (tot[i] || 0) + it.g * share * mult; });
      (S.extras || []).forEach(e => extras.add(e));
      return;
    }
    tot[it.ing] = (tot[it.ing] || 0) + it.g * mult;
  });
}
/* grocery list for the week. people = household size; others get the base recipe portions. */
function groceries(week, targetsFor, pr) {
  const tot = {}, extras = new Set(), spices = new Set(), blends = new Set();
  const extra = Math.max(0, (+pr.people || 1) - 1);
  week.days.forEach((day, d) => {
    const dp = dayPortions(day, targetsFor(d), pr);
    dp.meals.forEach((m, i) => {
      addItems(tot, extras, m.items, 1);
      if (extra && m.slot === "m") addItems(tot, extras, withFlavor(getMeal(m.id, pr), day[i], pr).items, extra);
      if (m.blend) blends.add(m.blend.name);
      const P = PROFILES[m.fl]; if (P) (P.extras || []).forEach(e => extras.add(e));
    });
  });
  Object.values(BLENDS).forEach(b => { if (blends.has(b.name)) b.spices.forEach(s => spices.add(s)); });
  const groups = AISLES.map(([a, label]) => ({ label, items: Object.keys(tot).filter(k => ING[k].aisle === a).map(k => ({ ing: k, ...shopItem(k, tot[k]) })).sort((x, y) => x.name.localeCompare(y.name)) })).filter(g => g.items.length);
  const ex = [...extras].filter(e => !Object.keys(tot).some(k => ING[k].name === e)).sort();
  if (ex.length) groups.push({ label: "Sauce and flavor extras", note: "Check your fridge and pantry first.", items: ex.map(e => ({ ing: "x:" + e, name: e, amt: "" })) });
  if (spices.size) groups.push({ label: "Spices for your blends", note: "Check your pantry first. Spices last for months.", items: [...spices].sort().map(s => ({ ing: "sp:" + s, name: s, amt: "" })) });
  return groups;
}
/* prep list: everything to cook on each prep day, plus an ordered game plan */
function prepList(week, targetsFor, pr) {
  if (!week.prep) return null;
  const people = Math.max(1, +pr.people || 1), extra = people - 1;
  return week.prep.map(p => {
    const tot = {}, extras = new Set(), grains = {}, ovens = new Set(), blends = new Map(), blendTsp = {}, meals = [];
    p.ids.forEach(id => {
      let portions = 0, sample = null, slotRef = null;
      p.covers.forEach(d => {
        const dp = dayPortions(week.days[d], targetsFor(d), pr);
        dp.meals.forEach((m, i) => {
          if (m.id !== id) return;
          portions++; sample = sample || m; slotRef = slotRef || week.days[d][i];
          if (m.blend) blendTsp[m.blend.name] = (blendTsp[m.blend.name] || 0) + m.seasonTsp * people;
          addItems(tot, extras, m.items, 1);
          m.items.forEach(it => { if (GRAIN[it.ing]) grains[it.ing] = (grains[it.ing] || 0) + it.g; });
          if (extra) withFlavor(getMeal(id, pr), week.days[d][i], pr).items.forEach(it => {
            addItems(tot, extras, [it], extra);
            if (GRAIN[it.ing]) grains[it.ing] = (grains[it.ing] || 0) + it.g * extra;
          });
        });
      });
      const base = getMeal(id, pr);
      if (base.oven) ovens.add(base.oven);
      if (sample && sample.blend) blends.set(sample.blend.name, sample.blend.jar);
      meals.push({ id, name: sample ? sample.name : base.name, portions, servings: portions * people, sample });
    });
    const plan = [];
    if (blends.size) plan.push(`Mix your spice blends in small jars. ${[...blends].map(([n, j]) => {
      const need = blendTsp[n] || 0, jars = Math.max(1, Math.ceil(need / 18)); // one jar recipe makes about 6 tbsp
      return `${n}: ${j}.${jars > 1 ? ` You need about ${Math.round(need / 3)} tbsp today, so make ${jars} batches.` : ""}`;
    }).join(" ")}`);
    if (ovens.size) plan.push(`Heat the oven to ${Math.max(...ovens)}°F${ovens.size > 1 ? ` (lower to ${Math.min(...ovens)}°F for anything that calls for it)` : ""}. Line your sheet pans.`);
    Object.entries(grains).forEach(([g, cooked]) => {
      const G = GRAIN[g], dryG = cooked / G.yield;
      plan.push(G.oz ? G.how(`${frac(dryG / 28.35, 0.5)} oz`) : G.how(cups(dryG / G.dryCup), cups(dryG / G.dryCup * G.water)));
    });
    meals.forEach(m => {
      const steps = (m.sample ? m.sample.steps : []).filter(s => !/^Cook the (rice|brown rice|quinoa|pasta|lentils):/.test(s)).map(s => s.replace(/^Heat the oven to \d+°F\.\s*/, "")).filter(Boolean);
      plan.push(`${m.name}, ${m.servings} serving${m.servings === 1 ? "" : "s"}: multiply the amounts by ${m.servings}. ${steps.join(" ")}`);
    });
    const yours = meals.reduce((a, m) => a + m.portions, 0);
    plan.push(`Let everything cool for 30 minutes, then portion into ${yours} container${yours === 1 ? "" : "s"} for you${extra ? ` and ${yours * extra} family servings` : ""}. Label each with the day. Refrigerate and eat within 4 days. Freeze anything for later in the week.`);
    return { day: p.day, meals: meals.map(m => m.name), covers: p.covers, items: Object.keys(tot).map(k => shopItem(k, tot[k])), plan };
  });
}

root.AdonisMeals = { ING, MEALS, BY_ID, SAUCES, BLENDS, PROFILES, planWeek, dayPortions, scaleMeal, swapOptions, aheadMeals, getMeal, amount, amountLine, groceries, prepList, mealOK, flavorsFor, firstFlavor, nextFlavor };
})(typeof window !== "undefined" ? window : globalThis);
