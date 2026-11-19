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

/* JavaScript copy of firestore.rules. op: get | list | create | update | delete */
function rulesAllow(uid, op, p, next, prev, filters) {
  const seg = p.split("/");
  const coachOf = client => !!uid && server.docs.has(`links/${uid}_${client}`);
  const me = x => !!uid && uid === x;
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
  if (seg[0] === "coaches") {
    if (op === "get" || op === "list" || op === "delete") return me(seg[1]);
    return me(seg[1]) && typeof next.code === "string";
  }
  if (seg[0] === "invites") {
    if (op === "get") return !!uid;
    if (op === "list") return false;
    if (op === "create") return !!uid && /^[A-Z0-9]{8}$/.test(seg[1]) && next.coach === uid;
    if (op === "delete") return !!uid && !!prev && prev.coach === uid;
    return false;
  }
  if (seg[0] === "links") {
    if (op === "list") return !!uid && !!filters && filters.some(f => f.op === "==" && (f.f === "coach" || f.f === "client") && f.v === uid);
    if (op === "get" || op === "delete") return !!uid && !!prev && (prev.coach === uid || prev.client === uid);
    if (op === "create") {
      const inv = server.docs.get(`invites/${next.code}`);
      return !!uid && next.client === uid && next.coach !== uid && seg[1] === `${next.coach}_${uid}`
        && typeof next.code === "string" && !!inv && inv.coach === next.coach;
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
  function writeOp(kind, ref, data) {
    const prev = server.docs.get(ref.path);
    const op = kind === "del" ? "delete" : prev ? "update" : "create";
    if (op === "delete" && !prev) { if (!rulesAllow(uid(), "delete", ref.path, null, null)) throw denied(); return () => {}; }
    const next = kind === "del" ? null : resolve(data);
    if (!rulesAllow(uid(), op, ref.path, next, prev)) throw denied();
    return () => (kind === "del" ? server.docs.delete(ref.path) : server.docs.set(ref.path, next));
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
    async setDoc(ref, data, opt) { const prev = opt && opt.merge ? server.docs.get(ref.path) || {} : {}; writeOp("set", ref, { ...prev, ...data })(); },
    writeBatch() {
      const ops = [];
      return { set: (r, d) => ops.push(["set", r, d]), delete: r => ops.push(["del", r]),
        async commit() { const apply = ops.map(([k, r, d]) => writeOp(k, r, d)); apply.forEach(f => f()); } };   // all or nothing
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

  /* turning on coach mode */
  check("not a coach before turning it on", (await K.profile()) === null);
  const prof = await K.start();
  check("coach mode gives an 8-character code", /^[A-HJ-NP-Z2-9]{8}$/.test(prof.code), prof.code);
  check("invite points at the coach", server.docs.get(`invites/${prof.code}`).coach === cu);
  check("profile saved with the code", (await K.profile()).code === prof.code);
  check("turning it on again keeps the same code", (await K.start()).code === prof.code);
  check("codes are cleaned of spaces, dashes and case", K.cleanCode(" ab cd-ef gh ") === "ABCDEFGH");

  /* bad codes */
  let e = await rejects(J.link("ABC"));
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
  check("rules: coach loses access right after unlinking", !rulesAllow(cu, "list", `users/${ju}/days/x`, null, null));
  const r2 = await K.roster();
  await K.unlink(r2[0].id);
  check("coach can remove a client", (await K.roster()).length === 0 && (await O.mine()) === null);

  /* turning coach mode off */
  await J.link(code2);
  await K.stop();
  check("coach mode off: profile gone", (await K.profile()) === null);
  check("coach mode off: code retired", !server.docs.has(`invites/${code2}`));
  check("coach mode off: clients unlinked", (await J.mine()) === null);

  /* deleting an account cleans up its links */
  const p3 = await K.start();
  await J.link(p3.code);
  await client.C.deleteAccount("password1");
  check("deleted client: link removed", ![...server.docs.keys()].some(k => k.startsWith("links/")));
  check("deleted client: data removed", ![...server.docs.keys()].some(k => k.startsWith(`users/${ju}/`)));
  await coach.C.deleteAccount("password1");
  check("deleted coach: profile and code removed", !server.docs.has(`coaches/${cu}`) && !server.docs.has(`invites/${p3.code}`));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
