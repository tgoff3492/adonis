/* Adonis account sync checks: several "phones" share one fake Firebase and must agree.
   Run:  node tests/cloud-tests.js
   The fake Firebase lives in this file (no network); it behaves like Auth + Firestore lite for what cloud.js uses. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "cloud.js"), "utf8");

let pass = 0, fail = 0;
function check(name, ok, detail) { if (ok) pass++; else { fail++; console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`); } }
const clone = o => JSON.parse(JSON.stringify(o));
const tick = () => new Promise(r => setTimeout(r, 0));

/* ---------- fake Firebase (one server, many phones) ---------- */
const server = { docs: new Map(), users: new Map(), clock: 1e12, offline: false, writes: 0 };
function Ts(ms) { return { ms, toMillis: () => ms }; }
const ST = { __st: true };
function net() { if (server.offline) { const e = new Error("offline"); e.code = "unavailable"; throw e; } }
function resolve(data) { const o = {}; for (const k in data) o[k] = data[k] === ST ? Ts(++server.clock) : data[k]; return o; }
function makeFB() {
  const auth = { listeners: [], currentUser: null };
  function emit() { const u = auth.currentUser; auth.listeners.forEach(cb => setTimeout(() => cb(u), 0)); }
  function authErr(code) { const e = new Error(code); e.code = code; return e; }
  function userObj(rec) { return { uid: rec.uid, email: rec.email, get displayName() { return rec.displayName; }, metadata: { creationTime: new Date(0).toUTCString() } }; }
  return {
    initializeApp: () => ({}), indexedDBLocalPersistence: {}, browserLocalPersistence: {},
    initializeAuth: () => auth, getFirestore: () => ({}),
    onAuthStateChanged(a, cb) { a.listeners.push(cb); setTimeout(() => cb(a.currentUser), 0); },
    async createUserWithEmailAndPassword(a, email, pw) {
      net(); if (server.users.has(email)) throw authErr("auth/email-already-in-use");
      const rec = { uid: "u" + (server.users.size + 1), email, pw, displayName: null }; server.users.set(email, rec);
      a.currentUser = userObj(rec); emit(); return { user: a.currentUser };
    },
    async signInWithEmailAndPassword(a, email, pw) {
      net(); const rec = server.users.get(email); if (!rec || rec.pw !== pw) throw authErr("auth/invalid-credential");
      a.currentUser = userObj(rec); emit(); return { user: a.currentUser };
    },
    async signOut(a) { a.currentUser = null; emit(); },
    async sendPasswordResetEmail() { net(); },
    async updateProfile(u, p) { net(); [...server.users.values()].find(r => r.uid === u.uid).displayName = p.displayName; },
    async updatePassword(u, pw) { net(); [...server.users.values()].find(r => r.uid === u.uid).pw = pw; },
    EmailAuthProvider: { credential: (email, pw) => ({ email, pw }) },
    async reauthenticateWithCredential(u, c) { net(); const r = server.users.get(c.email); if (!r || r.pw !== c.pw) throw authErr("auth/invalid-credential"); },
    async deleteUser(u) { net(); for (const [k, r] of server.users) if (r.uid === u.uid) server.users.delete(k); auth.currentUser = null; emit(); },
    doc: (db, ...seg) => ({ path: seg.join("/"), id: seg[seg.length - 1] }),
    collection: (db, ...seg) => ({ path: seg.join("/"), coll: true }),
    query: (c, ...cons) => ({ path: c.path, coll: true, cons }),
    where: (f, op, v) => ({ f, op, v }), orderBy: f => ({ order: f }),
    serverTimestamp: () => ST, Timestamp: { fromMillis: Ts },
    async getDoc(ref) { net(); const d = server.docs.get(ref.path); return { exists: () => !!d, data: () => d && clone({ ...d, t: undefined }) && d }; },
    async getDocs(q) {
      net(); const out = [];
      for (const [p, d] of server.docs) {
        if (!p.startsWith(q.path + "/") || p.slice(q.path.length + 1).includes("/")) continue;
        const ok = (q.cons || []).every(c => !c.f || (c.op === ">" ? d[c.f].toMillis() > c.v.toMillis() : true));
        if (ok) out.push({ id: p.split("/").pop(), data: () => d });
      }
      out.sort((a, b) => a.data().t.toMillis() - b.data().t.toMillis());
      return { forEach: cb => out.forEach(cb), size: out.length };
    },
    async setDoc(ref, data, opt) { net(); server.writes++; const prev = opt && opt.merge ? server.docs.get(ref.path) || {} : {}; server.docs.set(ref.path, { ...prev, ...resolve(data) }); },
    writeBatch() {
      const ops = [];
      return { set: (r, d) => ops.push(["set", r, d]), delete: r => ops.push(["del", r]),
        async commit() { net(); if (ops.length > 500) throw new Error("batch over 500"); ops.forEach(([k, r, d]) => { server.writes++; k === "set" ? server.docs.set(r.path, resolve(d)) : server.docs.delete(r.path); }); } };
    },
  };
}

/* ---------- a phone: its own storage, app state and copy of cloud.js ---------- */
function phone(name, startState) {
  const store = new Map();
  const ctx = { console: { warn() {}, log: console.log }, setTimeout, clearTimeout, JSON, Date, Math, Object, Promise, Error, RegExp, encodeURIComponent };
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
  const P = { name, C, store, S: clone(startState || { settings: {}, days: {}, plan: null }), mergeChoice: "merge", phases: [], waiters: [] };
  const app = {
    getMain() { const { days, ...m } = P.S; return m; },
    getDays() { return P.S.days; },
    getWipe() { return +(P.S.settings.wipedAt || 0); },
    hasData() { return !!(P.S.plan || Object.keys(P.S.days).some(d => !C.blankDay(P.S.days[d]))); },
    applyMain(m) { P.S = { ...clone(m), days: P.S.days }; },
    applyDays(o) { Object.assign(P.S.days, o); },
    wipeDays() { P.S.days = {}; },
    reset() { P.S = { settings: {}, days: {}, plan: null }; },
    askMerge() { P.asked = true; return Promise.resolve(P.mergeChoice); },
    onStatus() {},
    onAuth(u, phase) { P.phases.push(u ? phase : "signed-out"); P.waiters.splice(0).forEach(f => f()); },
  };
  C.start(app);
  P.until = async phase => { for (let i = 0; i < 200 && P.phases[P.phases.length - 1] !== phase; i++) await tick(); return P.phases[P.phases.length - 1] === phase; };
  return P;
}
const dayLog = (date, n) => ({ date, food: [{ name: "Eggs", p: n }], lifts: {}, weight: String(170 + n), complete: false });
const serverDays = uid => [...server.docs.keys()].filter(k => k.startsWith(`users/${uid}/days/`)).map(k => k.split("/").pop()).sort();

(async () => {
  /* 1. TJ's phone already has logs from before accounts: signing up uploads them */
  const A = phone("A", { settings: { start: "2026-09-28" }, plan: { title: "Muscle Gains" }, days: { "2026-11-01": dayLog("2026-11-01", 1), "2026-11-02": dayLog("2026-11-02", 2), "2026-11-03": dayLog("2026-11-03", 3) } });
  await tick();
  check("not signed in at start", A.phases[0] === "signed-out" && !A.C.claimed);
  await A.C.signUp("TJ", "tj@example.com", "password1");
  check("sign up reaches ready", await A.until("ready"), A.phases.join(","));
  check("no merge question for a brand-new account", !A.asked);
  const uid = A.C.user.uid;
  check("profile doc written with name", server.docs.get(`users/${uid}`) && server.docs.get(`users/${uid}`).name === "TJ");
  check("all 3 days uploaded", serverDays(uid).join() === "2026-11-01,2026-11-02,2026-11-03", serverDays(uid).join());
  check("plan uploaded", JSON.parse(server.docs.get(`users/${uid}/state/main`).j).plan.title === "Muscle Gains");
  check("phone now claimed by the account", A.C.claimed);
  check("nothing pending after first upload", !A.C.pending());

  /* 2. a second phone signs in and gets everything */
  const B = phone("B");
  await tick();
  await B.C.signIn("tj@example.com", "password1");
  check("phone B ready", await B.until("ready"));
  await B.C.syncNow();
  check("phone B has the 3 days", Object.keys(B.S.days).sort().join() === "2026-11-01,2026-11-02,2026-11-03");
  check("phone B has the plan", B.S.plan && B.S.plan.title === "Muscle Gains");
  check("phone B has nothing pending", !B.C.pending());
  check("empty phone wasn't asked to merge", !B.asked);

  /* 3. edits on A show up on B */
  A.S.days["2026-11-03"].weight = "168.4";
  A.S.days["2026-11-04"] = dayLog("2026-11-04", 4);
  A.S.plan = { title: "Cut block" };
  check("A has pending changes", A.C.pending());
  const w0 = server.writes;
  await A.C.syncNow();
  check("only changed docs written (2 days + main)", server.writes - w0 === 3, `${server.writes - w0} writes`);
  await B.C.syncNow();
  check("B got the edited weight", B.S.days["2026-11-03"].weight === "168.4");
  check("B got the new day", !!B.S.days["2026-11-04"]);
  check("B got the plan change", B.S.plan.title === "Cut block");
  check("B pending stays false after pulling", !B.C.pending());
  const w1 = server.writes; await B.C.syncNow(); await A.C.syncNow();
  check("a quiet sync writes nothing", server.writes === w1, `${server.writes - w1} writes`);

  /* 4. both phones edit the same day: the unsynced local edit is never overwritten; phones converge */
  B.S.days["2026-11-02"].weight = "171.0";            // B edits, not synced yet
  A.S.days["2026-11-02"].weight = "170.5"; await A.C.syncNow();
  await B.C.syncNow();
  check("B kept its own unsynced edit", B.S.days["2026-11-02"].weight === "171.0");
  await A.C.syncNow();
  check("A and B agree after syncing", A.S.days["2026-11-02"].weight === B.S.days["2026-11-02"].weight, `${A.S.days["2026-11-02"].weight} vs ${B.S.days["2026-11-02"].weight}`);

  /* 5. offline: changes wait on the phone, then go up */
  server.offline = true;
  A.S.days["2026-11-05"] = dayLog("2026-11-05", 5);
  await A.C.syncNow();
  check("offline sync reports offline", A.C.state === "offline", A.C.state);
  check("offline change still pending", A.C.pending());
  server.offline = false;
  await A.C.syncNow();
  check("back online: change uploaded", serverDays(uid).includes("2026-11-05") && !A.C.pending());

  /* 6. a phone with its own old logs signs in to the existing account and merges */
  const Cp = phone("C", { settings: {}, plan: { title: "Old plan" }, days: { "2026-10-01": dayLog("2026-10-01", 9), "2026-11-01": dayLog("2026-11-01", 99) } });
  Cp.mergeChoice = "merge"; await tick();
  await Cp.C.signIn("tj@example.com", "password1");
  check("phone C ready after merge", await Cp.until("ready"), Cp.phases.join(","));
  check("phone C was asked to merge", Cp.asked);
  check("C kept the day only it had", !!Cp.S.days["2026-10-01"]);
  check("account's version wins on the same date", Cp.S.days["2026-11-01"].weight === "171");
  check("plan comes from the account", Cp.S.plan.title === "Cut block");
  check("merged day uploaded", serverDays(uid).includes("2026-10-01"));
  await A.C.syncNow();
  check("A receives C's merged day", !!A.S.days["2026-10-01"]);

  /* 7. same, but choosing the account only */
  const D = phone("D", { settings: {}, plan: null, days: { "2026-09-01": dayLog("2026-09-01", 7) } });
  D.mergeChoice = "account"; await tick();
  await D.C.signIn("tj@example.com", "password1"); await D.until("ready");
  check("account-only choice drops this phone's old days", !D.S.days["2026-09-01"] && !serverDays(uid).includes("2026-09-01"));
  check("account-only choice still loads the account", !!D.S.days["2026-11-05"]);

  /* 8. erase history on one phone erases it everywhere */
  A.S.days = {}; A.S.settings.wipedAt = 5e12; await A.C.syncNow();
  check("server days gone after wipe", serverDays(uid).length === 0, serverDays(uid).join());
  await B.C.syncNow();
  check("B's days wiped too", Object.keys(B.S.days).length === 0, Object.keys(B.S.days).join());
  B.S.days["2026-11-10"] = dayLog("2026-11-10", 10); await B.C.syncNow(); await A.C.syncNow();
  check("logging after a wipe syncs normally", !!A.S.days["2026-11-10"]);

  /* 9. lots of days (bigger than one Firestore batch) */
  for (let i = 0; i < 1200; i++) A.S.days[`2027-${String(1 + (i % 12)).padStart(2, "0")}-x${i}`] = dayLog("x", i);
  await A.C.syncNow();
  check("1200+ days upload in chunks", serverDays(uid).length === 1201, String(serverDays(uid).length));
  await B.C.syncNow();
  check("B pulls 1200+ days", Object.keys(B.S.days).length === 1201);

  /* 10. sign out clears the phone; signing back in restores it */
  await B.C.signOut(); await B.until("signed-out");
  check("sign out clears the phone", Object.keys(B.S.days).length === 0 && !B.S.plan && !B.C.claimed && !B.store.get("adonis-sync"));
  await B.C.signIn("tj@example.com", "password1"); await B.until("ready");
  check("signing back in restores everything", Object.keys(B.S.days).length === 1201 && B.S.plan.title === "Cut block");
  check("no merge question after a clean sign-out", !B.asked);

  /* 10b. an empty day the app made just by opening it isn't a log: no merge question, nothing uploaded */
  await B.C.signOut(); await B.until("signed-out");
  B.S.days["2026-11-16"] = { date: "2026-11-16", food: [], lifts: {}, weight: "", bf: "", recovery: [], complete: false };
  B.asked = false;
  await B.C.signIn("tj@example.com", "password1"); await B.until("ready");
  check("opened-but-empty day doesn't trigger the merge question", !B.asked);
  B.S.days["2026-11-17"] = { date: "2026-11-17", food: [], lifts: {}, weight: "", recovery: [], complete: false };
  check("empty day isn't pending", !B.C.pending());
  await B.C.syncNow();
  check("empty day isn't uploaded", !serverDays(uid).includes("2026-11-17"));
  B.S.days["2026-11-17"].weight = "169"; await B.C.syncNow();
  check("once something's logged it uploads", serverDays(uid).includes("2026-11-17"));
  delete B.S.days["2026-11-17"]; await B.C.syncNow();

  /* 11. wrong password and account errors read like people talk */
  let msg = ""; try { await B.C.signIn("tj@example.com", "nope"); } catch (e) { msg = B.C.friendly(e); }
  check("wrong password message", /don't match/.test(msg), msg);
  try { await B.C.signUp("X", "tj@example.com", "password1"); } catch (e) { msg = B.C.friendly(e); }
  check("email in use message", /already an account/.test(msg), msg);

  /* 12. name and password changes */
  await A.C.updateName("Taylor");
  check("name saved to profile doc", server.docs.get(`users/${uid}`).name === "Taylor" && A.C.user.displayName === "Taylor");
  await A.C.changePassword("password1", "password2");
  let ok = true; try { await Cp.C.signIn("tj@example.com", "password2"); } catch (e) { ok = false; }
  check("new password works", ok);

  /* 13. a second person gets a separate account on the same phone after sign-out */
  await D.C.signOut(); await D.until("signed-out");
  await D.C.signUp("Wife", "wife@example.com", "password9"); await D.until("ready");
  const uid2 = D.C.user.uid;
  check("second account is separate and empty", uid2 !== uid && Object.keys(D.S.days).length === 0 && serverDays(uid2).length === 0);

  /* 14. delete account erases everything for that person only */
  D.S.days["2026-11-16"] = dayLog("2026-11-16", 1); await D.C.syncNow();
  await D.C.deleteAccount("password9");
  check("deleted account leaves nothing on the server", ![...server.docs.keys()].some(k => k.startsWith(`users/${uid2}`)));
  check("deleted account can't sign in", !server.users.has("wife@example.com"));
  check("TJ's data untouched", serverDays(uid).length === 1201);

  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log("CRASH", e); process.exit(1); });
