/* Adonis coaching checks: invite codes, linking, unlinking, and who can read what.
   Run:  node tests/coach-link-tests.js
   The fake Firebase here (no network) enforces a JavaScript copy of firestore.rules, so a cloud.js change that
   the real rules would refuse fails here too. If you change firestore.rules, change rulesAllow() to match. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "cloud.js"), "utf8");

let pass = 0, fail = 0;
function check(name, ok, detail) { if (ok) pass++; else { fail++; console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); } }
const tick = () => new Promise(r => setTimeout(r, 0));
async function rejects(p) { try { await p; return null; } catch (e) { return e; } }

/* ---------- one fake server ---------- */
const server = { docs: new Map(), users: new Map(), clock: Date.now() };   // real time, so "logged in the last 7 days" works
function Ts(ms) { return { ms, toMillis: () => ms }; }
const ST = { __st: true };
function resolve(data) { const o = {}; for (const k in data) o[k] = data[k] === ST ? Ts(++server.clock) : data[k]; return o; }
function denied() { const e = new Error("permission-denied"); e.code = "permission-denied"; return e; }

/* JavaScript copy of firestore.rules. op: get | list | create | update | delete.
   prev = the doc before this write, next = after; after(path) = a doc as it will be once the whole batch lands
   (getAfter in the rules); server.docs is the state before the batch (get in the rules). */
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const changed = (next, prev) => [...new Set([...Object.keys(next || {}), ...Object.keys(prev || {})])].filter(k => !same((next || {})[k], (prev || {})[k]));
const onlyChanged = (next, prev, keys) => changed(next, prev).every(k => keys.includes(k));
function rulesAllow(uid, op, p, next, prev, filters, after) {
  after = after || (q => server.docs.get(q));
  const before = q => server.docs.get(q);
  const seg = p.split("/");
  const me = x => !!uid && uid === x;
  const isAdmin = () => !!uid && server.docs.has(`admins/${uid}`);
  const activeCoach = x => !!before(`coaches/${x}`) && before(`coaches/${x}`).active === true;
  const coachOf = client => !!uid && server.docs.has(`links/${uid}_${client}`) && activeCoach(uid);
  if (seg[0] === "users") {
    const owner = seg[1];
    if (seg.length === 2 || seg[2] === "state" || seg[2] === "days") {
      if (op === "get" || op === "list") return me(owner) || coachOf(owner);
      return me(owner);
    }
    if (seg[2] === "coach") {
      if (op === "get" || op === "list") return me(owner) || coachOf(owner);
      if (op === "create" || op === "update") return coachOf(owner);
      if (op === "delete") return me(owner) || coachOf(owner);
    }
    return false;
  }
  if (seg[0] === "admins") return op === "get" && me(seg[1]);
  if (seg[0] === "coachKeys") {
    const key = seg[1];
    if (op === "get") return !!uid;
    if (op === "list" || op === "delete") return isAdmin();
    if (op === "create") return isAdmin() && /^[A-Z0-9]{12}$/.test(key) && next.usedBy === null;
    if (op === "update") return isAdmin() || (!!uid && prev.usedBy === null && next.usedBy === uid
      && onlyChanged(next, prev, ["usedBy", "usedName", "usedAt"]) && !!after(`coaches/${uid}`) && after(`coaches/${uid}`).key === key);
    return false;
  }
  if (seg[0] === "coaches") {
    const who = seg[1];
    if (op === "get" || op === "list") return me(who) || isAdmin();
    if (op === "delete") return me(who) || isAdmin();
    const kb = next && typeof next.key === "string" ? before(`coachKeys/${next.key}`) : null;
    const ka = next && typeof next.key === "string" ? after(`coachKeys/${next.key}`) : null;
    const activating = isAdmin() || (me(who) && next.active === true && !!kb && kb.usedBy === null && !!ka && ka.usedBy === who);
    if (op === "create") return activating;
    return activating || (me(who) && onlyChanged(next, prev, ["name", "code"]));
  }
  if (seg[0] === "invites") {
    if (op === "get") return !!uid;
    if (op === "list") return false;
    if (op === "create") return !!uid && /^[A-Z0-9]{8}$/.test(seg[1]) && next.coach === uid && !!after(`coaches/${uid}`) && after(`coaches/${uid}`).active === true;
    if (op === "delete") return !!uid && !!prev && prev.coach === uid;
    return false;
  }
  if (seg[0] === "links") {
    if (op === "list") return !!uid && !!filters && filters.some(f => f.op === "==" && (f.f === "coach" || f.f === "client") && f.v === uid);
    if (op === "get" || op === "delete") return !!uid && !!prev && (prev.coach === uid || prev.client === uid);
    if (op === "create") {
      const inv = server.docs.get(`invites/${next.code}`);
      return !!uid && next.client === uid && next.coach !== uid && seg[1] === `${next.coach}_${uid}`
        && typeof next.code === "string" && !!inv && inv.coach === next.coach && activeCoach(next.coach);
    }
    return false;
  }
  return false;
}

function makeFB() {
  const auth = { listeners: [], currentUser: null };
  const uid = () => auth.currentUser && auth.currentUser.uid;
  function emit() { const u = auth.currentUser; auth.listeners.forEach(cb => setTimeout(() => cb(u), 0)); }
  function userObj(rec) { return { uid: rec.uid, email: rec.email, get displayName() { return rec.displayName; }, metadata: {} }; }
  // a set of writes lands all together or not at all; each is checked with the before and after state
  function commitAll(ops) {
    const after = new Map(server.docs);
    const planned = ops.map(([kind, ref, data]) => {
      const next = kind === "del" ? null : resolve(data);
      if (kind === "del") after.delete(ref.path); else after.set(ref.path, next);
      return { kind, ref, next };
    });
    for (const w of planned) {
      const prev = server.docs.get(w.ref.path);
      const op = w.kind === "del" ? "delete" : prev ? "update" : "create";
      if (!rulesAllow(uid(), op, w.ref.path, w.next, prev || null, null, q => after.get(q))) throw denied();
    }
    server.docs = after;
  }
  return {
    initializeApp: () => ({}), indexedDBLocalPersistence: {}, browserLocalPersistence: {},
    initializeAuth: () => auth, getFirestore: () => ({}),
    onAuthStateChanged(a, cb) { a.listeners.push(cb); setTimeout(() => cb(a.currentUser), 0); },
    async createUserWithEmailAndPassword(a, email, pw) {
      const rec = { uid: "u" + (server.users.size + 1), email, pw, displayName: null }; server.users.set(email, rec);
      a.currentUser = userObj(rec); emit(); return { user: a.currentUser };
    },
    async signInWithEmailAndPassword(a, email, pw) { const rec = server.users.get(email); a.currentUser = userObj(rec); emit(); return { user: a.currentUser }; },
    async signOut(a) { a.currentUser = null; emit(); },
    async updateProfile(u, p) { [...server.users.values()].find(r => r.uid === u.uid).displayName = p.displayName; },
    EmailAuthProvider: { credential: (email, pw) => ({ email, pw }) },
    async reauthenticateWithCredential() {},
    async deleteUser(u) { for (const [k, r] of server.users) if (r.uid === u.uid) server.users.delete(k); auth.currentUser = null; emit(); },
    doc: (db, ...seg) => ({ path: seg.join("/"), id: seg[seg.length - 1] }),
    collection: (db, ...seg) => ({ path: seg.join("/"), coll: true }),
    query: (c, ...cons) => ({ path: c.path, coll: true, cons }),
    where: (f, op, v) => ({ f, op, v }), orderBy: f => ({ order: f }),
    serverTimestamp: () => ST, Timestamp: { fromMillis: Ts },
    async getDoc(ref) {
      const d = server.docs.get(ref.path);
      if (!rulesAllow(uid(), "get", ref.path, null, d || null)) {
        // like Firestore: a read of a missing doc is judged without resource data
        if (d || !(ref.path.startsWith("invites/") && uid())) throw denied();
      }
      return { exists: () => !!d, data: () => d };
    },
    async getDocs(q) {
      const filters = (q.cons || []).filter(c => c.f);
      if (!rulesAllow(uid(), "list", q.path + "/x", null, null, filters)) throw denied();
      const out = [];
      for (const [p, d] of server.docs) {
        if (!p.startsWith(q.path + "/") || p.slice(q.path.length + 1).includes("/")) continue;
        const ok = filters.every(c => c.op === ">" ? d[c.f] && d[c.f].toMillis() > c.v.toMillis() : c.op === "==" ? d[c.f] === c.v : true);
        if (ok) out.push({ id: p.split("/").pop(), data: () => d });
      }
      return { forEach: cb => out.forEach(cb), size: out.length };
    },
    async setDoc(ref, data, opt) { const prev = opt && opt.merge ? server.docs.get(ref.path) || {} : {}; commitAll([["set", ref, { ...prev, ...data }]]); },
    writeBatch() {
      const ops = [];
      return { set: (r, d) => ops.push(["set", r, d]), delete: r => ops.push(["del", r]),
        async commit() { commitAll(ops); } };
    },
  };
}

function phone() {
  const store = new Map();
  const ctx = { console: { warn() {}, log: console.log }, setTimeout, clearTimeout, JSON, Date, Math, Object, Promise, Error, RegExp, Uint32Array, encodeURIComponent };
  ctx.window = ctx;
  ctx.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  ctx.navigator = { onLine: true };
  ctx.document = { addEventListener() {}, visibilityState: "visible" };
  ctx.addEventListener = () => {};
  ctx.ADONIS_FIREBASE = { apiKey: "x", projectId: "adonis-test" };
  ctx.AdonisFB = makeFB();
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  const C = ctx.AdonisCloud;
  const P = { C, S: { settings: {}, days: {}, plan: null }, phases: [] };
  C.start({
    getMain() { const { days, ...m } = P.S; return m; }, getDays() { return P.S.days; }, getWipe() { return 0; },
    hasData() { return false; }, applyMain(m) { P.S = { ...m, days: P.S.days }; }, applyDays(o) { Object.assign(P.S.days, o); },
    wipeDays() { P.S.days = {}; }, reset() { P.S = { settings: {}, days: {}, plan: null }; },
    askMerge() { return Promise.resolve("account"); }, onStatus() {}, onAuth(u, phase) { P.phases.push(u ? phase : "signed-out"); },
  });
  P.until = async phase => { for (let i = 0; i < 300 && P.phases[P.phases.length - 1] !== phase; i++) await tick(); return P.phases[P.phases.length - 1] === phase; };
  return P;
}
const dayLog = (date, n) => ({ date, food: [{ name: "Eggs", p: n }], lifts: {}, weight: "", complete: false });

(async () => {
  const coach = phone(), client = phone(), other = phone();
  await coach.C.signUp("Taylor", "coach@example.com", "password1"); await coach.until("ready");
  await client.C.signUp("Jordan", "client@example.com", "password1"); await client.until("ready");
  await other.C.signUp("Sam", "other@example.com", "password1"); await other.until("ready");
  const K = coach.C.coach, J = client.C.coach, O = other.C.coach;
  const cu = coach.C.user.uid, ju = client.C.user.uid;

  /* coach access is locked: only with a one-time activation code from an admin */
  const admin = phone();
  await admin.C.signUp("TJ", "admin@example.com", "password1"); await admin.until("ready");
  const A = admin.C.coach, au = admin.C.user.uid;
  check("nobody is an admin until made one in the console", !(await A.isAdmin()));
  server.docs.set(`admins/${au}`, {});
  check("admin is recognized", await A.isAdmin());
  check("a regular person isn't an admin", !(await K.isAdmin()));

  check("not a coach before activating", (await K.profile()) === null);
  let e = await rejects(K.start());
  check("can't get an invite code without activating", e && /activation code/.test(K.friendly(e)));
  e = await rejects(K.activate(""));
  check("a regular person can't activate without a code", e && /12 letters/.test(K.friendly(e)));
  e = await rejects(K.activate("ZZZZ-ZZZZ-ZZZZ"));
  check("made-up activation code refused", e && /isn't valid/.test(K.friendly(e)));
  e = await rejects(K.makeKey("me"));
  check("a regular person can't make activation codes", e && /permission/.test(e.code || ""));
  e = await rejects(K.listKeys());
  check("a regular person can't list activation codes", e && /permission/.test(e.code || ""));

  // trying to skip the code by writing straight to the database
  const fbK = coach.C, rawWrite = (path, data) => rulesAllow(cu, server.docs.has(path) ? "update" : "create", path, data, server.docs.get(path) || null);
  check("rules: can't switch on coach access by hand", !rawWrite(`coaches/${cu}`, { name: "Taylor", code: "", key: "admin", active: true }));
  check("rules: can't make an invite code without coach access", !rulesAllow(cu, "create", "invites/ABCDEFGH", { coach: cu }, null));

  const key = await A.makeKey("Taylor, Dallas gym");
  check("admin makes a 12-character activation code", /^[A-HJ-NP-Z2-9]{12}$/.test(key), key);
  const keys1 = await A.listKeys();
  check("admin sees the new code, unused", keys1.length === 1 && !keys1[0].used && keys1[0].note === "Taylor, Dallas gym");
  check("rules: can't claim a code without turning on coach access in the same write", !rulesAllow(cu, "update", `coachKeys/${key}`,
    { ...server.docs.get(`coachKeys/${key}`), usedBy: cu }, server.docs.get(`coachKeys/${key}`)));

  const prof = await K.activate(key.slice(0, 4).toLowerCase() + " " + key.slice(4, 8) + "-" + key.slice(8));
  check("activating with a code (any spacing or case) turns on coach mode", prof && prof.active === true);
  check("activation gives an 8-character invite code", /^[A-HJ-NP-Z2-9]{8}$/.test(prof.code), prof.code);
  check("invite points at the coach", server.docs.get(`invites/${prof.code}`).coach === cu);
  check("activating again keeps the same invite code", (await K.activate("")).code === prof.code);
  const keys2 = await A.listKeys();
  check("admin sees who used the code", keys2[0].used && keys2[0].usedName === "Taylor");
  e = await rejects(O.activate(key));
  check("a used activation code can't be used again", e && /already been used/.test(O.friendly(e)));
  check("codes are cleaned of spaces, dashes and case", K.cleanCode(" ab cd-ef gh ") === "ABCDEFGH");

  const adminProf = await A.activate("");
  check("an admin can switch on coach mode without a code", adminProf && adminProf.active && adminProf.code.length === 8);
  const spare = await A.makeKey("");
  await A.deleteKey(spare);
  check("admin can cancel an unused code", (await A.listKeys()).every(k => k.key !== spare));

  /* bad codes */
  e = await rejects(J.link("ABC"));
  check("short code refused with a clear message", e && /8 letters/.test(J.friendly(e)));
  e = await rejects(J.link("ZZZZZZZZ"));
  check("unknown code refused with a clear message", e && /No coach has that code/.test(J.friendly(e)));
  e = await rejects(K.link(prof.code));
  check("a coach can't link to their own code", e && /your own invite code/.test(K.friendly(e)));

  /* before linking, the coach can't see anything of the client's */
  const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  client.S.days[today] = dayLog(today, 112); client.S.days["2020-01-01"] = dayLog("2020-01-01", 90);
  client.C.touch(); await client.C.syncNow();
  check("client's day is in the account", server.docs.has(`users/${ju}/days/${today}`));
  const before = await K.roster();
  check("empty roster before anyone links", before.length === 0);

  /* linking */
  const lk = await J.link(prof.code.slice(0, 4).toLowerCase() + "-" + prof.code.slice(4));
  check("client links with a lower-case, dashed code", lk && lk.name === "Taylor", JSON.stringify(lk));
  const mine = await J.mine();
  check("client sees their coach", mine && mine.name === "Taylor" && mine.coach === cu);
  e = await rejects(J.link(prof.code));
  check("one coach at a time", e && /already linked/.test(J.friendly(e)));
  const roster = await K.roster();
  check("coach sees the client in the roster", roster.length === 1 && roster[0].name === "Jordan", JSON.stringify(roster));
  check("roster shows a recent log", roster[0].lastLog > 0 && roster[0].days7 === 1, JSON.stringify(roster[0]));

  /* coach sets targets and a pinned note; the client sees them */
  client.S.nutri = { a: { goal: "cut" } }; client.C.touch(); await client.C.syncNow();
  const cd = await K.clientData(ju);
  check("coach reads the client's saved state", cd.main && cd.main.nutri && cd.main.nutri.a.goal === "cut", JSON.stringify(cd.main));
  check("coach reads the client's recent days", cd.days[today] && cd.days[today].food.length === 1);
  check("nothing set for the client yet", cd.coaching === null && (await J.myCoaching(await J.mine())) === null);
  await K.setCoaching(ju, { targets: { protein: 190, carbs: 190, fat: 70, cal: 2150 }, letEdit: false });
  await K.setCoaching(ju, { note: { text: "Log something every day this week.", t: Date.now() } });
  const mc = await J.myCoaching(await J.mine());
  check("client sees the coach's targets", mc && mc.targets.protein === 190 && mc.targets.cal === 2150, JSON.stringify(mc));
  check("client sees the pinned note and who set it", mc.note && /every day/.test(mc.note.text) && mc.coachName === "Taylor");
  check("saving the note kept the targets", mc.targets && mc.targets.fat === 70);
  e = await rejects(O.setCoaching(ju, { note: { text: "hi", t: 1 } }));
  check("someone who isn't their coach can't set targets or notes", e && /permission/.test(e.code || ""));
  e = await rejects(J.setCoaching(ju, { targets: { protein: 999, carbs: 1, fat: 1, cal: 4009 } }));
  check("a client can't set their own coach targets", e && /permission/.test(e.code || ""));
  e = await rejects(O.clientData(ju));
  check("someone who isn't their coach can't read the client", e && /permission/.test(e.code || ""));

  /* what the rules allow and block */
  const FBc = coach.C, FBo = other.C;
  check("rules: coach can read the linked client's days", rulesAllow(cu, "list", `users/${ju}/days/x`, null, null));
  check("rules: coach can't change the client's logs", !rulesAllow(cu, "update", `users/${ju}/days/${today}`, {}, {}));
  check("rules: coach can write the client's coach area", rulesAllow(cu, "create", `users/${ju}/coach/targets`, {}, null));
  check("rules: client can't write their own coach area", !rulesAllow(ju, "create", `users/${ju}/coach/targets`, {}, null));
  check("rules: client can clear their coach area", rulesAllow(ju, "delete", `users/${ju}/coach/targets`, null, {}));
  check("rules: a stranger can't read the client", !rulesAllow(other.C.user.uid, "list", `users/${ju}/days/x`, null, null));
  check("rules: invites can't be listed", !rulesAllow(ju, "list", "invites/x", null, null));
  check("rules: a stranger can't fake a link to the client", !rulesAllow(other.C.user.uid, "create", `links/${other.C.user.uid}_${ju}`,
    { coach: other.C.user.uid, client: ju, code: prof.code }, null));
  check("rules: can't link with a code that belongs to another coach", !rulesAllow(other.C.user.uid, "create", `links/${ju}_${other.C.user.uid}`,
    { coach: ju, client: other.C.user.uid, code: prof.code }, null));
  e = await rejects(O.roster().then(r => { if (r.length) throw new Error("saw someone else's clients"); }));
  check("a non-coach's roster is empty, not someone else's", !e);

  /* new code: old one stops working, existing clients stay linked */
  const oldCode = prof.code, code2 = await K.newCode();
  check("new code is different", code2 && code2 !== oldCode);
  check("old invite is gone", !server.docs.has(`invites/${oldCode}`));
  e = await rejects(O.link(oldCode));
  check("old code no longer links anyone", e && /No coach has that code/.test(O.friendly(e)));
  check("existing client still linked after a new code", !!(await J.mine()));
  await O.link(code2);
  check("new code links a second client", (await K.roster()).length === 2);

  /* unlinking */
  await J.unlink(mine.id);
  check("client can unlink", (await J.mine()) === null && (await K.roster()).length === 1);
  check("unlinking clears the coach's targets and note", !server.docs.has(`users/${ju}/coach/main`));
  check("rules: coach loses access right after unlinking", !rulesAllow(cu, "list", `users/${ju}/days/x`, null, null));
  const r2 = await K.roster();
  await K.setCoaching(r2[0].client, { note: { text: "Welcome!", t: Date.now() } });
  await K.unlink(r2[0].id);
  check("removing a client clears what the coach set", !server.docs.has(`users/${r2[0].client}/coach/main`));
  check("coach can remove a client", (await K.roster()).length === 0 && (await O.mine()) === null);

  /* an admin (or later, a lapsed payment) switches coach access off: access ends at once */
  await J.link(code2);
  check("relinked", (await K.roster()).length === 1 && (await K.roster())[0].ok);
  server.docs.set(`coaches/${cu}`, { ...server.docs.get(`coaches/${cu}`), active: false });   // what an admin's switch does
  check("rules: switched-off coach can't read clients", !rulesAllow(cu, "list", `users/${ju}/days/x`, null, null));
  check("switched-off coach's roster can't load logs", (await K.roster()).every(r => !r.ok));
  check("rules: switched-off coach can't switch themselves back on", !rawWrite(`coaches/${cu}`, { ...server.docs.get(`coaches/${cu}`), active: true }));
  check("(the other person has no coach right now)", (await O.mine()) === null);
  e = await rejects(O.link(code2));
  check("nobody new can link to a switched-off coach", e && /permission/.test(e.code || ""), e && e.message);
  check("rules: admin can switch a coach back on", rulesAllow(au, "update", `coaches/${cu}`, { ...server.docs.get(`coaches/${cu}`), active: true }, server.docs.get(`coaches/${cu}`)));
  server.docs.set(`coaches/${cu}`, { ...server.docs.get(`coaches/${cu}`), active: true });

  /* turning coach mode off: clients unlinked, code retired, activation kept */
  await K.setCoaching(ju, { targets: { protein: 180, carbs: 200, fat: 60, cal: 2060 } });
  await K.stop();
  check("coach mode off: clients' targets and notes cleared", !server.docs.has(`users/${ju}/coach/main`));
  check("coach mode off: clients unlinked", (await J.mine()) === null);
  check("coach mode off: code retired", !server.docs.has(`invites/${code2}`));
  const kept = await K.profile();
  check("coach mode off: still activated, no code", kept && kept.active === true && kept.code === "");
  const back = await K.activate("");
  check("turning it back on needs no new activation code", back && back.code && back.code !== code2);

  /* deleting an account cleans up its links */
  const p3 = await K.profile();
  await J.link(p3.code);
  await client.C.deleteAccount("password1");
  check("deleted client: link removed", ![...server.docs.keys()].some(k => k.startsWith("links/")));
  check("deleted client: data removed", ![...server.docs.keys()].some(k => k.startsWith(`users/${ju}/`)));
  await coach.C.deleteAccount("password1");
  check("deleted coach: profile and code removed", !server.docs.has(`coaches/${cu}`) && !server.docs.has(`invites/${p3.code}`));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
