/* Adonis meal plans: a library of real meals whose protein, carb and fat ingredients scale
   separately so each meal hits its share of the day's targets. Runs on the phone, no AI. */
(function (root) {
"use strict";

/* ---------- ingredients: macros per 100 g (USDA-style averages) ----------
   tags: meat, poultry, pork, fish, shellfish, dairy, egg, gluten, nuts, peanut, soy,
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
  I("honey", "Honey", 0.3, 82, 0, [], "pantry"),
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
].forEach(x => { ING[x.id] = x; });
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

/* ---------- meals ----------
   slot: b = breakfast, m = lunch or dinner, s = snack
   items: [ingredient, grams, role]  role p/c/f scales to hit protein/carbs/fat, x stays fixed
   batch = keeps well for prep days, quick = 10 minutes or less */
const M = (id, name, slot, items, opt) => ({ id, name, slot, items: items.map(([ing, g, r]) => ({ ing, g, r })), ...(opt || {}) });
const MEALS = [
  // breakfast
  M("parfait", "Greek yogurt parfait", "b", [["greek", 250, "p"], ["berries", 100, "x"], ["granola", 40, "c"], ["almonds", 15, "f"]], { quick: 1, how: "Layer yogurt, berries and granola. Top with almonds." }),
  M("eggstoast", "Scrambled eggs and toast", "b", [["egg", 100, "f"], ["whites", 150, "p"], ["bread", 64, "c"], ["spinach", 30, "x"]], { quick: 1, how: "Scramble eggs and whites with spinach until fully set. Serve with toast." }),
  M("protoats", "Protein oatmeal", "b", [["oats", 60, "c"], ["whey", 30, "p"], ["milk", 200, "x"], ["banana", 60, "c"], ["pb", 16, "f"]], { quick: 1, how: "Cook oats in milk, stir in protein powder off the heat, top with banana and peanut butter." }),
  M("bfburrito", "Breakfast burritos", "b", [["egg", 100, "f"], ["whites", 120, "p"], ["tortilla", 60, "c"], ["cheddar", 20, "x"], ["salsa", 50, "x"]], { batch: 1, how: "Scramble eggs and whites until fully set, wrap with cheese and salsa. Freezes well." }),
  M("cottagebowl", "Cottage cheese bowl", "b", [["cottage", 250, "p"], ["banana", 118, "c"], ["almonds", 15, "f"]], { quick: 1, how: "Top cottage cheese with sliced banana and almonds." }),
  M("tofuscramble", "Tofu scramble and potatoes", "b", [["tofu", 200, "p"], ["potato", 200, "c"], ["spinach", 50, "x"], ["peppers", 50, "x"], ["oil", 7, "f"]], { how: "Crumble tofu into a hot pan with oil, peppers and spinach. Serve with roasted potatoes." }),
  M("overnightoats", "Overnight oats", "b", [["oats", 60, "c"], ["pea", 30, "p"], ["berries", 100, "x"], ["chia", 15, "f"]], { batch: 1, quick: 1, how: "Stir oats, protein powder and chia with water. Refrigerate overnight, top with berries." }),
  M("smoothie", "Protein smoothie", "b", [["whey", 35, "p"], ["banana", 118, "c"], ["berries", 100, "x"], ["milk", 250, "x"], ["pb", 16, "f"]], { quick: 1, how: "Blend everything with ice." }),
  M("vsmoothie", "Plant protein smoothie", "b", [["pea", 35, "p"], ["banana", 118, "c"], ["berries", 100, "x"], ["chia", 15, "f"]], { quick: 1, how: "Blend with water and ice." }),
  M("omelet", "Veggie omelet and potatoes", "b", [["egg", 150, "f"], ["whites", 100, "p"], ["mushrooms", 50, "x"], ["peppers", 50, "x"], ["potato", 200, "c"]], { how: "Cook the omelet until fully set. Serve with roasted potatoes." }),
  M("pbtoast", "Peanut butter toast and yogurt", "b", [["bread", 64, "c"], ["pb", 20, "f"], ["greek", 200, "p"], ["banana", 60, "c"]], { quick: 1, how: "Toast, spread peanut butter, add banana slices. Yogurt on the side." }),
  // lunches and dinners
  M("burritobowl", "Chicken burrito bowl", "m", [["chicken", 150, "p"], ["rice", 150, "c"], ["blackbeans", 80, "c"], ["salsa", 60, "x"], ["avocado", 50, "f"], ["greens", 30, "x"]], { batch: 1, how: "Season and bake chicken. Build bowls with rice, beans, salsa and avocado." }),
  M("turkeychili", "Turkey chili", "m", [["turkey93", 150, "p"], ["blackbeans", 120, "c"], ["marinara", 150, "x"], ["onion", 50, "x"], ["cheddar", 15, "f"]], { batch: 1, how: "Brown turkey with onion, add beans, sauce and chili spices, simmer 20 minutes." }),
  M("salmonrice", "Salmon, rice and broccoli", "m", [["salmon", 150, "p"], ["rice", 150, "c"], ["broccoli", 150, "x"], ["oil", 5, "f"]], { how: "Bake salmon at 400°F for 12-15 minutes until it flakes. Serve with rice and broccoli." }),
  M("beefstirfry", "Beef and veggie stir-fry", "m", [["beef93", 150, "p"], ["rice", 150, "c"], ["stirfry", 150, "x"], ["oil", 7, "f"]], { batch: 1, how: "Brown beef, add vegetables and your favorite stir-fry sauce. Serve over rice." }),
  M("chickenpasta", "Chicken marinara pasta", "m", [["chicken", 140, "p"], ["pasta", 180, "c"], ["marinara", 120, "x"], ["parm", 10, "x"], ["oil", 5, "f"], ["spinach", 40, "x"]], { batch: 1, how: "Toss pasta with sauce, spinach and sliced chicken. Top with parmesan." }),
  M("shrimptacos", "Shrimp tacos", "m", [["shrimp", 160, "p"], ["corntort", 78, "c"], ["greens", 60, "x"], ["avocado", 50, "f"], ["salsa", 40, "x"]], { quick: 1, how: "Sauté shrimp until pink and opaque. Fill warm tortillas with slaw, avocado and salsa." }),
  M("meatballs", "Turkey meatballs and sweet potato", "m", [["turkey93", 150, "p"], ["sweetpot", 200, "c"], ["broccoli", 150, "x"], ["oil", 7, "f"]], { batch: 1, how: "Roll seasoned turkey into meatballs, bake at 400°F for 18 minutes. Roast sweet potatoes alongside." }),
  M("sheetpan", "Sheet-pan chicken and sweet potatoes", "m", [["chicken", 150, "p"], ["sweetpot", 220, "c"], ["peppers", 100, "x"], ["oil", 10, "f"]], { batch: 1, how: "Toss everything with oil and seasoning, roast at 425°F for 25 minutes." }),
  M("tunawrap", "Tuna salad wrap", "m", [["tuna", 120, "p"], ["greek", 50, "x"], ["tortilla", 60, "c"], ["greens", 40, "x"], ["avocado", 40, "f"]], { quick: 1, how: "Mix tuna with yogurt and seasoning, wrap with greens and avocado." }),
  M("lentilcurry", "Lentil curry", "m", [["lentils", 250, "p"], ["rice", 120, "c"], ["marinara", 100, "x"], ["spinach", 60, "x"], ["oil", 10, "f"]], { batch: 1, how: "Simmer lentils with tomato, curry spices and spinach. Serve over rice." }),
  M("tofustirfry", "Tofu stir-fry", "m", [["tofu", 200, "p"], ["rice", 150, "c"], ["stirfry", 150, "x"], ["oil", 7, "f"]], { batch: 1, how: "Crisp cubed tofu in a hot pan, add vegetables and sauce. Serve over rice." }),
  M("chickpeabowl", "Chickpea quinoa bowl", "m", [["chickpeas", 150, "p"], ["pea", 15, "p"], ["quinoa", 150, "c"], ["greens", 50, "x"], ["peppers", 50, "x"], ["oil", 10, "f"]], { plant: 1, batch: 1, how: "Roast chickpeas, serve over quinoa and greens with a lemon-oil dressing. Stir the protein powder into the dressing or have it as a shake." }),
  M("tempehbowl", "Tempeh rice bowl", "m", [["tempeh", 120, "p"], ["brownrice", 150, "c"], ["broccoli", 150, "x"], ["oil", 5, "f"]], { batch: 1, how: "Pan-fry sliced tempeh until golden. Serve with brown rice and broccoli." }),
  M("beanbowl", "Black bean bowl", "m", [["blackbeans", 150, "c"], ["greek", 80, "p"], ["rice", 100, "c"], ["cheddar", 25, "f"], ["salsa", 60, "x"], ["greens", 30, "x"]], { batch: 1, how: "Warm beans and rice, top with cheese, salsa and Greek yogurt in place of sour cream." }),
  M("veganbeanbowl", "Black bean and avocado bowl", "m", [["blackbeans", 200, "p"], ["pea", 15, "p"], ["rice", 100, "c"], ["salsa", 60, "x"], ["avocado", 50, "f"], ["greens", 30, "x"]], { plant: 1, batch: 1, how: "Warm beans and rice, top with salsa and avocado. Have the protein powder as a shake on the side." }),
  M("porktenderloin", "Pork tenderloin and potatoes", "m", [["pork", 150, "p"], ["potato", 250, "c"], ["broccoli", 150, "x"], ["oil", 7, "f"]], { batch: 1, how: "Roast pork at 425°F to 145°F inside, rest 3 minutes. Roast potatoes alongside." }),
  M("codquinoa", "Cod, quinoa and broccoli", "m", [["cod", 180, "p"], ["quinoa", 160, "c"], ["broccoli", 150, "x"], ["oil", 10, "f"]], { quick: 1, how: "Bake cod at 400°F for 10-12 minutes until it flakes." }),
  M("greekpita", "Greek chicken pita", "m", [["chicken", 150, "p"], ["pita", 64, "c"], ["greens", 60, "x"], ["feta", 25, "x"], ["oil", 8, "f"]], { quick: 1, how: "Stuff pita with chicken, greens and feta. Drizzle with oil and lemon." }),
  M("friedrice", "Egg fried rice", "m", [["egg", 100, "f"], ["whites", 150, "p"], ["rice", 180, "c"], ["stirfry", 120, "x"]], { quick: 1, how: "Fry vegetables and rice, push aside, scramble the eggs fully, mix together." }),
  M("beeftacos", "Beef tacos", "m", [["beef93", 140, "p"], ["corntort", 78, "c"], ["salsa", 50, "x"], ["cheddar", 20, "f"], ["greens", 40, "x"]], { batch: 1, how: "Brown beef with taco seasoning. Fill tortillas with beef, lettuce, cheese and salsa." }),
  M("turkeysandwich", "Turkey and cheese sandwich", "m", [["deliturkey", 120, "p"], ["bread", 64, "c"], ["mozz", 20, "f"], ["greens", 30, "x"]], { quick: 1, how: "Stack on whole wheat with greens and mustard." }),
  M("salmonbowl", "Salmon quinoa bowl", "m", [["salmon", 140, "p"], ["quinoa", 150, "c"], ["greens", 80, "x"], ["avocado", 40, "f"]], { how: "Bake salmon until it flakes. Serve over quinoa and greens with avocado." }),
  M("tofucurry", "Tofu and spinach curry", "m", [["tofu", 200, "p"], ["rice", 150, "c"], ["spinach", 60, "x"], ["marinara", 100, "x"], ["oil", 7, "f"]], { batch: 1, how: "Simmer tofu in tomato curry sauce with spinach. Serve over rice." }),
  M("chickpeapasta", "Chickpea marinara pasta", "m", [["chickpeas", 150, "p"], ["pea", 15, "p"], ["pasta", 160, "c"], ["marinara", 120, "x"], ["oil", 7, "f"]], { plant: 1, batch: 1, how: "Simmer chickpeas in marinara, toss with pasta. Have the protein powder as a shake on the side." }),
  M("chickenpotato", "Chicken, potatoes and green salad", "m", [["chicken", 150, "p"], ["potato", 250, "c"], ["greens", 80, "x"], ["oil", 10, "f"]], { batch: 1, how: "Roast chicken and potatoes. Dress the salad with oil and vinegar." }),
  // snacks
  M("yogurtberries", "Greek yogurt and berries", "s", [["greek", 200, "p"], ["berries", 100, "c"], ["honey", 10, "c"], ["almonds", 10, "f"]], { quick: 1 }),
  M("applepb", "Apple, peanut butter and jerky", "s", [["apple", 180, "c"], ["pb", 20, "f"], ["jerky", 30, "p"]], { quick: 1 }),
  M("cottagefruit", "Cottage cheese and fruit", "s", [["cottage", 200, "p"], ["berries", 100, "c"], ["apple", 90, "c"]], { quick: 1 }),
  M("shake", "Protein shake and banana", "s", [["whey", 30, "p"], ["banana", 118, "c"], ["milk", 250, "x"]], { quick: 1 }),
  M("hummusplate", "Hummus, pita and edamame", "s", [["hummus", 60, "f"], ["pita", 40, "c"], ["peppers", 100, "x"], ["edamame", 80, "p"]], { quick: 1 }),
  M("ricecakes", "Rice cakes, peanut butter and yogurt", "s", [["ricecake", 18, "c"], ["pb", 16, "f"], ["greek", 150, "p"]], { quick: 1 }),
  M("hbeggs", "Hard-boiled eggs and fruit", "s", [["egg", 100, "p"], ["banana", 118, "c"]], { batch: 1, quick: 1 }),
  M("edamamefruit", "Edamame and an apple", "s", [["edamame", 150, "p"], ["apple", 150, "c"], ["almonds", 10, "f"]], { quick: 1 }),
  M("vshake", "Plant protein shake", "s", [["pea", 30, "p"], ["banana", 118, "c"], ["chia", 10, "f"]], { quick: 1 }),
  M("cheesejerky", "String cheese, jerky and an apple", "s", [["mozz", 28, "f"], ["jerky", 30, "p"], ["apple", 150, "c"]], { quick: 1 }),
  M("tunacakes", "Tuna on rice cakes", "s", [["tuna", 100, "p"], ["ricecake", 27, "c"], ["avocado", 30, "f"]], { quick: 1 }),
];
const BY_ID = {}; MEALS.forEach(m => { BY_ID[m.id] = m; });

/* ---------- filters ---------- */
const STYLE_BLOCK = {
  none: [], pescatarian: ["meat"], vegetarian: ["meat", "fish", "shellfish"],
  vegan: ["meat", "fish", "shellfish", "dairy", "egg"]
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
function mealOK(m, pr) {
  const b = blockedTags(pr), dis = new Set();
  (pr.dislikes || []).forEach(d => (DISLIKE_ING[d] || []).forEach(i => dis.add(i)));
  return m.items.every(it => !dis.has(it.ing) && !ING[it.ing].tags.some(t => b.has(t)));
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
  const u = ING[ing].unit;
  if (u) { const step = u.g / (u.n === "scoop" ? 2 : 1); return Math.max(step, Math.round(g / step) * step); }
  if (ING[ing].f > 90 || g < 30) return Math.max(5, Math.round(g / 5) * 5);
  return Math.max(10, Math.round(g / 10) * 10);
}
function scaleMeal(m, target) {
  const roles = ["p", "c", "f"];
  const base = {}; roles.forEach(r => { base[r] = macrosOf(m.items.filter(i => i.r === r)); });
  const fixed = macrosOf(m.items.filter(i => i.r === "x"));
  const s = { p: 1, c: 1, f: 1 };
  const W = { p: 3, c: 1, f: 2 }; // protein matters most, then fat, then carbs
  const err = () => {
    let e = 0;
    ["p", "c", "f"].forEach(k => { const v = fixed[k] + roles.reduce((a, r) => a + base[r][k] * s[r], 0); e += W[k] * Math.pow(v - target[k], 2); });
    return e;
  };
  const has = r => base[r].cal > 0;
  for (let it = 0; it < 60; it++) {
    roles.forEach(r => {
      if (!has(r)) return;
      // 1-D best step for this group via derivative of the quadratic
      let num = 0, den = 0;
      ["p", "c", "f"].forEach(k => {
        const other = fixed[k] + roles.filter(x => x !== r).reduce((a, x) => a + base[x][k] * s[x], 0);
        num += W[k] * base[r][k] * (target[k] - other); den += W[k] * base[r][k] * base[r][k];
      });
      const lo = { p: 0.4, c: 0.15, f: 0.25 }[r], hi = { p: 3, c: 4.5, f: 2.5 }[r];
      if (den > 0) s[r] = Math.max(lo, Math.min(hi, num / den));
    });
  }
  const items = m.items.map(i => ({ ing: i.ing, g: roundG(i.ing, i.r === "x" ? i.g : i.g * s[i.r]) })).filter(i => i.g > 0);
  return { id: m.id, name: m.name, how: m.how || "", items, ...macrosOf(items) };
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
  return M("plate-" + slot, "Simple plate", slot, items, { how: "Cook the protein through, add the carb and vegetables, finish with the fat." });
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

  const days = [];
  // batch mode: two prep days, each cooks 2 mains that cover lunch and dinner
  let batchMains = null;
  if (pr.cooking === "batch") {
    let mains = pool("m"); const bm = mains.filter(m => m.batch); if (bm.length >= 2) mains = bm;
    const sh = shuffle(mains);
    batchMains = [[sh[0], sh[1 % sh.length]], [sh[2 % sh.length], sh[3 % sh.length]]];
  }
  const recent = [];
  for (let d = 0; d < 7; d++) {
    const used = new Set(), day = [];
    let mainIdx = 0;
    split.forEach(([slot, share, label]) => {
      let id;
      if (slot === "m" && batchMains) {
        const half = d < 3 ? 0 : 1;
        id = batchMains[half][mainIdx++ % 2].id;
      } else {
        const opts = shuffle(pool(slot));
        let cands = opts.filter(m => !used.has(m.id) && !recent.slice(-2).some(r => r.has(m.id)) && tunaOK(m.id));
        if (!cands.length) cands = opts.filter(m => !used.has(m.id) && tunaOK(m.id));
        if (!cands.length) cands = [opts[0]];
        // of a few random options, take the one that can hit this person's macros best
        if (pr.targets) {
          const t = { p: pr.targets.protein * share, c: pr.targets.carbs * share, f: pr.targets.fat * share };
          const score = m => { const r = scaleMeal(m, t); return 3 * Math.abs(r.p - t.p) / t.p + Math.abs(r.c - t.c) / Math.max(t.c, 1) + 2 * Math.abs(r.f - t.f) / t.f; };
          cands = cands.slice(0, 5).sort((a, b) => score(a) - score(b));
        }
        id = cands[0].id;
      }
      used.add(id); noteTuna(id);
      day.push({ slot, share, label, id });
    });
    recent.push(used);
    days.push(day);
  }
  return { start, days, prep: batchMains ? [{ day: 0, ids: batchMains[0].map(m => m.id), covers: [0, 1, 2] }, { day: 3, ids: batchMains[1].map(m => m.id), covers: [3, 4, 5, 6] }] : null };
}
function getMeal(id, pr) { return BY_ID[id] || (id.startsWith("plate-") ? plateFallback(id.slice(6), pr || {}) : null); }

/* Portions for one day against the day's targets {protein, carbs, fat}. */
function dayPortions(day, targets, pr) {
  const goal = { p: targets.protein, c: targets.carbs, f: targets.fat };
  let adj = { p: 0, c: 0, f: 0 }, meals;
  // two passes: whatever one meal can't hit gets spread over the others
  for (let pass = 0; pass < 3; pass++) {
    meals = day.map(slot => {
      const m = getMeal(slot.id, pr);
      const t = {}; ["p", "c", "f"].forEach(k => { t[k] = Math.max(1, (goal[k] + adj[k]) * slot.share); });
      return { ...slot, ...scaleMeal(m, t) };
    });
    const sum = meals.reduce((a, m) => ({ p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { p: 0, c: 0, f: 0 });
    ["p", "c", "f"].forEach(k => { adj[k] += (goal[k] - sum[k]) * 0.8; });
  }
  const tot = meals.reduce((a, m) => ({ p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { p: 0, c: 0, f: 0 });
  tot.cal = tot.p * 4 + tot.c * 4 + tot.f * 9;
  return { meals, total: tot };
}
function swapOptions(day, idx, pr) {
  const slot = day[idx].slot, inDay = new Set(day.map(x => x.id));
  return MEALS.filter(m => m.slot === slot && mealOK(m, pr) && !inDay.has(m.id)).map(m => m.id);
}

/* ---------- friendly amounts + shopping ---------- */
function amountLine(ing, g) {
  const x = ING[ing];
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
  if (CANS[ing]) { const n = Math.ceil(g / CANS[ing]); return { name: ING[ing].name.replace(/ \((cooked|drained)\)/, "") + " (canned)", amt: `${n} can${n === 1 ? "" : "s"}` }; }
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
const AISLES = [["protein", "Meat, seafood and tofu"], ["dairy", "Dairy, eggs and fridge"], ["produce", "Produce"], ["frozen", "Frozen"], ["grains", "Bread, rice and grains"], ["pantry", "Pantry"]];
/* grocery list for the week. people = household size; others get the base recipe portions. */
function groceries(week, targetsFor, pr) {
  const tot = {};
  const extra = Math.max(0, (+pr.people || 1) - 1);
  week.days.forEach((day, d) => {
    const dp = dayPortions(day, targetsFor(d), pr);
    dp.meals.forEach(m => {
      m.items.forEach(it => { tot[it.ing] = (tot[it.ing] || 0) + it.g; });
      if (extra && m.slot === "m") getMeal(m.id, pr).items.forEach(it => { tot[it.ing] = (tot[it.ing] || 0) + it.g * extra; });
    });
  });
  return AISLES.map(([a, label]) => ({ label, items: Object.keys(tot).filter(k => ING[k].aisle === a).map(k => ({ ing: k, ...shopItem(k, tot[k]) })).sort((x, y) => x.name.localeCompare(y.name)) })).filter(g => g.items.length);
}
/* prep list: everything to cook on each prep day */
function prepList(week, targetsFor, pr) {
  if (!week.prep) return null;
  const extra = Math.max(0, (+pr.people || 1) - 1);
  return week.prep.map(p => {
    const tot = {};
    p.covers.forEach(d => {
      const dp = dayPortions(week.days[d], targetsFor(d), pr);
      dp.meals.filter(m => p.ids.includes(m.id)).forEach(m => {
        m.items.forEach(it => { tot[it.ing] = (tot[it.ing] || 0) + it.g; });
        if (extra) getMeal(m.id, pr).items.forEach(it => { tot[it.ing] = (tot[it.ing] || 0) + it.g * extra; });
      });
    });
    return { day: p.day, meals: p.ids.map(id => getMeal(id, pr).name), covers: p.covers, items: Object.keys(tot).map(k => shopItem(k, tot[k])) };
  });
}

root.AdonisMeals = { ING, MEALS, BY_ID, planWeek, dayPortions, scaleMeal, swapOptions, getMeal, amount, amountLine, groceries, prepList, mealOK };
})(typeof window !== "undefined" ? window : globalThis);
