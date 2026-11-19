/* Adonis accounts and sync (Firebase Auth + Firestore).
 *
 * The phone stays the fast, offline copy (localStorage "adonis-v1"). When someone is signed in, every save
 * also goes up to their account a couple of seconds later, and opening the app pulls down anything changed
 * on another device. If firebase-config.js is empty, none of this runs and the app works exactly as before.
 *
 * Firestore layout (rules in firestore.rules: each person can only touch their own users/{uid} tree):
 *   users/{uid}               { name, email, app, created, updated }      their profile
 *   users/{uid}/state/main    { j: JSON of everything except logged days, t, wipe }
 *   users/{uid}/days/{date}   { j: JSON of that day's log, t }
 * Data is stored as JSON text so Firestore never has to understand the app's shapes (it rejects nested arrays).
 *
 * Coaching (Cloud.coach): one login can also be a coach, once they activate coach access with a one-time code an
 *   admin issues (coachKeys/{key}; admins/{uid} are made by hand in the console). An active coach gets an invite
 *   code; a client enters it to link: coaches/{uid}, invites/{code}, links/{coachUid_clientUid}. While linked and
 *   active, the coach can read the client's users/{uid} tree (never change it) and write only users/{uid}/coach/.
 *   Either side can unlink. Only an admin (or later, a payment server) can switch a coach's access off.
 */
(function () {
  "use strict";
  const CFG = window.ADONIS_FIREBASE;
  const FB = window.AdonisFB;
  const META_KEY = "adonis-sync";
  const enabled = !!(CFG && CFG.apiKey && CFG.projectId && FB);

  let auth = null, db = null, A = null, user = null, ready = false;
  let meta = readMeta();          // { uid, lastPull, mainT, main, days:{date:hash}, wipe, synced }
  let pushT = null, busy = null, again = false, lastPullAt = 0;
  let state = "idle";             // idle | syncing | synced | offline | error

  function readMeta() { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { return {}; } }
  function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) {} }
  function freshMeta(uid) { return { uid, lastPull: 0, mainT: 0, main: "", days: {}, wipe: 0, synced: 0 }; }
  function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + "." + s.length; }
  // the app makes an empty entry for any day you open; those aren't logs and never need uploading
  function blankDay(D) {
    if (!D || typeof D !== "object") return true;
    return Object.keys(D).every(k => {
      if (k === "date") return true;
      const v = D[k];
      return v == null || v === "" || v === false || v === 0 || (Array.isArray(v) ? !v.length : typeof v === "object" && !Object.keys(v).length);
    });
  }
  function tms(t) { return t && typeof t.toMillis === "function" ? t.toMillis() : +t || 0; }
  function setState(s) { state = s; A && A.onStatus && A.onStatus(s); }

  const R = {
    profile: () => FB.doc(db, "users", user.uid),
    main: () => FB.doc(db, "users", user.uid, "state", "main"),
    days: () => FB.collection(db, "users", user.uid, "days"),
    day: d => FB.doc(db, "users", user.uid, "days", d),
  };

  function friendly(e) {
    const c = (e && e.code) || "";
    if (/invalid-email/.test(c)) return "That email doesn't look right.";
    if (/user-not-found|wrong-password|invalid-credential|invalid-login-credentials/.test(c)) return "That email and password don't match an account.";
    if (/email-already-in-use/.test(c)) return "There's already an account with that email. Sign in instead.";
    if (/weak-password/.test(c)) return "Pick a longer password: at least 8 characters.";
    if (/too-many-requests/.test(c)) return "Too many tries. Wait a few minutes, then try again.";
    if (/network-request-failed|unavailable|deadline-exceeded/.test(c) || !navigator.onLine) return "Can't reach the internet. Check your connection and try again.";
    if (/requires-recent-login/.test(c)) return "For your security, sign out and back in, then try again.";
    if (/permission-denied/.test(c)) return "Your account couldn't be reached (permission denied). Send feedback from the menu so it can be fixed.";
    if (/operation-not-allowed/.test(c)) return "Email sign-in isn't turned on for Adonis yet.";
    return "Something went wrong. Try again.";
  }

  /* ---------- sync ---------- */
  function mainJSON() { return JSON.stringify(A.getMain()); }

  async function pull(full) {
    const ms = await FB.getDoc(R.main());
    let changed = false;
    if (ms.exists()) {
      const m = ms.data(), t = tms(m.t), rw = +m.wipe || 0;
      if (rw > (meta.wipe || 0)) {           // logs were erased on another device
        A.wipeDays(); meta.days = {}; meta.lastPull = 0; meta.wipe = rw; full = true; changed = true;
      }
      if (t > (meta.mainT || 0)) {
        const local = mainJSON(), clean = !meta.main || hash(local) === meta.main;
        if (clean && hash(m.j) !== hash(local)) { A.applyMain(JSON.parse(m.j)); changed = true; }
        if (clean) meta.main = hash(mainJSON());
        meta.mainT = t;
      }
    }
    const since = full ? 0 : Math.max(0, (meta.lastPull || 0) - 5000);   // small overlap covers writes that landed out of order
    const q = since ? FB.query(R.days(), FB.where("t", ">", FB.Timestamp.fromMillis(since)), FB.orderBy("t")) : R.days();
    const snap = await FB.getDocs(q);
    const days = A.getDays(), incoming = {};
    let maxT = meta.lastPull || 0;
    snap.forEach(s => {
      const v = s.data(), d = s.id, t = tms(v.t);
      if (t > maxT) maxT = t;
      // "clean" = this phone hasn't changed the day since it last synced (a day erased here counts as a change)
      const clean = days[d] ? hash(JSON.stringify(days[d])) === meta.days[d] : !(d in meta.days);
      if (clean && (!days[d] || JSON.stringify(days[d]) !== v.j)) incoming[d] = JSON.parse(v.j);
      if (clean) meta.days[d] = hash(v.j);
    });
    if (Object.keys(incoming).length) { A.applyDays(incoming); changed = true; }
    meta.lastPull = maxT;
    return changed;
  }

  async function push() {
    const days = A.getDays(), ops = [], newDays = {};
    for (const d in days) {
      if (!(d in meta.days) && blankDay(days[d])) continue;
      const j = JSON.stringify(days[d]), h = hash(j);
      if (h !== meta.days[d]) { ops.push(["set", R.day(d), { j, t: FB.serverTimestamp() }]); newDays[d] = h; }
    }
    const dels = Object.keys(meta.days).filter(d => !(d in days));
    dels.forEach(d => ops.push(["del", R.day(d)]));
    const mj = mainJSON(), mh = hash(mj), wipe = Math.max(+A.getWipe() || 0, meta.wipe || 0);
    const mainChanged = mh !== meta.main || wipe > (meta.wipe || 0);
    if (mainChanged) ops.push(["set", R.main(), { j: mj, t: FB.serverTimestamp(), wipe }]);
    if (!ops.length) return false;
    for (let i = 0; i < ops.length; i += 450) {
      const b = FB.writeBatch(db);
      ops.slice(i, i + 450).forEach(o => (o[0] === "set" ? b.set(o[1], o[2]) : b.delete(o[1])));
      await b.commit();
    }
    Object.assign(meta.days, newDays);
    dels.forEach(d => delete meta.days[d]);
    if (mainChanged) { meta.main = mh; meta.wipe = wipe; }
    return true;
  }

  // one sync at a time; a save during a sync queues one more round
  function run(doPull) {
    if (!user || !ready) return Promise.resolve();
    if (busy) { again = true; return busy; }
    setState("syncing");
    busy = (async () => {
      try {
        if (doPull) { lastPullAt = Date.now(); await pull(false); }
        await push();
        meta.synced = Date.now(); saveMeta(); setState("synced");
      } catch (e) {
        saveMeta(); setState(navigator.onLine === false || /network|unavailable/.test((e && e.code) || "") ? "offline" : "error");
        if (window.console) console.warn("Adonis sync:", e);
      } finally {
        busy = null;
        if (again) { again = false; schedule(1500); }
      }
    })();
    return busy;
  }
  function schedule(ms) { clearTimeout(pushT); pushT = setTimeout(() => run(false), ms); }

  /* ---------- first sign-in on this phone ---------- */
  async function adopt(u) {
    const ms = await FB.getDoc(FB.doc(db, "users", u.uid, "state", "main"));
    const accountHasData = ms.exists();
    const unclaimed = !meta.uid && A.hasData();          // logs made on this phone before anyone signed in
    if (!accountHasData) {
      // new or empty account: what's on this phone (if it's not someone else's) becomes the account's
      if (meta.uid && meta.uid !== u.uid) A.reset();
      meta = freshMeta(u.uid); ready = true;
      await push(); meta.synced = Date.now(); saveMeta();
      return;
    }
    let keep = null;
    if (unclaimed) {
      const choice = await A.askMerge();                   // "merge" or "account"
      if (choice === "merge") keep = JSON.parse(JSON.stringify(A.getDays()));
    }
    A.reset();
    meta = freshMeta(u.uid); ready = true;
    await pull(true);
    if (keep) {
      const have = A.getDays(), add = {};
      for (const d in keep) if (!(d in have)) add[d] = keep[d];
      if (Object.keys(add).length) A.applyDays(add);
    }
    await push(); meta.synced = Date.now(); saveMeta();
  }

  /* ---------- coaching: invite codes and client links (rules in firestore.rules) ---------- */
  // no 0/O or 1/I, so a code read aloud or off a screen can't be mistyped
  const CODE_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function randCode(n) {
    const r = new Uint32Array(n);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(r); else for (let i = 0; i < n; i++) r[i] = Math.floor(Math.random() * 4294967296);
    let s = ""; for (let i = 0; i < n; i++) s += CODE_ABC[r[i] % CODE_ABC.length];
    return s;
  }
  const newCode = () => randCode(8);          // client invite codes
  function cleanCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function coachErr(code, msg) { const e = new Error(msg); e.code = "coach/" + code; e.coachMsg = msg; return e; }
  const denied = e => /permission-denied/.test((e && e.code) || "");
  const CR = {
    coach: () => FB.doc(db, "coaches", user.uid),
    invite: c => FB.doc(db, "invites", c),
    links: () => FB.collection(db, "links"),
    link: id => FB.doc(db, "links", id),
    admin: () => FB.doc(db, "admins", user.uid),
    keys: () => FB.collection(db, "coachKeys"),
    key: k => FB.doc(db, "coachKeys", k),
  };
  async function linksWhere(field) {
    const snap = await FB.getDocs(FB.query(CR.links(), FB.where(field, "==", user.uid)));
    const out = []; snap.forEach(s => out.push({ id: s.id, ...s.data() }));
    return out;
  }
  async function deleteAll(refs) {
    for (let i = 0; i < refs.length; i += 450) {
      const b = FB.writeBatch(db);
      refs.slice(i, i + 450).forEach(r => b.delete(r));
      await b.commit();
    }
  }
  const Coach = {
    cleanCode,
    // this person's coach access, or null. active = they've activated coach mode (an admin can switch it off)
    async profile() {
      const s = await FB.getDoc(CR.coach());
      return s.exists() ? s.data() : null;
    },
    // admins are made by hand in the Firebase console (admins/{uid}); they issue activation codes
    async isAdmin() {
      try { return (await FB.getDoc(CR.admin())).exists(); } catch (e) { return false; }
    },
    // coach access: claim a one-time activation code (an admin can switch it on without one), then get an invite code
    async activate(raw) {
      const p = await Coach.profile();
      if (p && p.active) return Coach.start();
      const name = user.displayName || "Your coach";
      if (!cleanCode(raw) && await Coach.isAdmin()) {
        await FB.setDoc(CR.coach(), { name, code: (p && p.code) || "", key: "admin", active: true, activated: FB.serverTimestamp() });
        return Coach.start();
      }
      const key = cleanCode(raw);
      if (key.length !== 12) throw coachErr("bad-key", "Activation codes are 12 letters and numbers. Check it and try again.");
      const k = await FB.getDoc(CR.key(key));
      if (!k.exists()) throw coachErr("no-key", "That activation code isn't valid. Check it and try again.");
      if (k.data().usedBy) throw coachErr("used-key", "That activation code has already been used. Each code works once.");
      const b = FB.writeBatch(db);
      b.set(CR.key(key), { ...k.data(), usedBy: user.uid, usedName: name, usedAt: FB.serverTimestamp() });
      b.set(CR.coach(), { name, code: (p && p.code) || "", key, active: true, activated: FB.serverTimestamp() });
      await b.commit();
      return Coach.start();
    },
    // make sure an active coach has an invite code. A fresh code can (very rarely) collide with someone else's;
    // the rules refuse that write, so try another
    async start() {
      const p = await Coach.profile();
      if (!p || !p.active) throw coachErr("not-active", "Coach mode needs an activation code first.");
      if (p.code) return p;
      const name = user.displayName || p.name || "Your coach";
      for (let i = 0; i < 4; i++) {
        const code = newCode(), b = FB.writeBatch(db);
        b.set(CR.invite(code), { coach: user.uid, name, created: FB.serverTimestamp() });
        b.set(CR.coach(), { ...p, name, code });
        try { await b.commit(); return { ...p, name, code }; }
        catch (e) { if (!denied(e) || i === 3) throw e; }
      }
    },
    // retire the old code (people already linked stay linked) and hand out a new one
    async newCode() {
      const p = await Coach.profile(); if (!p || !p.active) throw coachErr("not-active", "Coach mode isn't on.");
      const name = user.displayName || p.name || "Your coach";
      for (let i = 0; i < 4; i++) {
        const code = newCode(), b = FB.writeBatch(db);
        if (p.code) b.delete(CR.invite(p.code));
        b.set(CR.invite(code), { coach: user.uid, name, created: FB.serverTimestamp() });
        b.set(CR.coach(), { ...p, name, code });
        try { await b.commit(); return code; }
        catch (e) { if (!denied(e) || i === 3) throw e; }
      }
    },
    // turning coach mode off unlinks every client and retires the invite code; coach access stays activated,
    // so turning it back on needs no new activation code
    async stop() {
      const p = await Coach.profile(), mine = await linksWhere("coach");
      const refs = mine.map(l => CR.link(l.id));
      if (p && p.code) refs.push(CR.invite(p.code));
      await deleteAll(refs);
      if (p && p.code) await FB.setDoc(CR.coach(), { ...p, code: "" });
    },
    /* admin: one-time activation codes for coach access (later a payment could issue these instead) */
    async makeKey(note) {
      for (let i = 0; i < 4; i++) {
        const key = randCode(12);
        if ((await FB.getDoc(CR.key(key))).exists()) continue;
        await FB.setDoc(CR.key(key), { note: String(note || "").trim().slice(0, 80), created: FB.serverTimestamp(), usedBy: null, usedName: "", usedAt: null });
        return key;
      }
      throw coachErr("key-fail", "Couldn't make a code. Try again.");
    },
    async listKeys() {
      const snap = await FB.getDocs(CR.keys()), out = [];
      snap.forEach(s => { const d = s.data(); out.push({ key: s.id, note: d.note || "", created: tms(d.created), used: !!d.usedBy, usedName: d.usedName || "", usedAt: tms(d.usedAt) }); });
      return out.sort((a, b) => b.created - a.created);
    },
    async deleteKey(key) { await deleteAll([CR.key(key)]); },
    // the coach's clients, each with how recently they logged (read straight from the client's account)
    // days7 = how many of the last 7 calendar days (today included) have something logged
    async roster() {
      const mine = await linksWhere("coach"), since = Date.now() - 14 * 864e5;
      const d = new Date(Date.now() - 6 * 864e5), pad = n => String(n).padStart(2, "0");
      const week = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return Promise.all(mine.map(async l => {
        const r = { id: l.id, client: l.client, name: l.clientName || "Client", linked: tms(l.created), lastLog: 0, days7: 0, ok: true };
        try {
          const snap = await FB.getDocs(FB.query(FB.collection(db, "users", l.client, "days"), FB.where("t", ">", FB.Timestamp.fromMillis(since))));
          snap.forEach(s => {
            const v = s.data(); let D = null; try { D = JSON.parse(v.j); } catch (e) {}
            if (blankDay(D)) return;
            const t = tms(v.t); if (t > r.lastLog) r.lastLog = t;
            if (s.id >= week) r.days7++;
          });
        } catch (e) { r.ok = false; }
        return r;
      }));
    },
    // the client's side: who coaches me (one coach at a time)
    async mine() {
      const l = await linksWhere("client");
      return l.length ? { id: l[0].id, coach: l[0].coach, name: l[0].coachName || "Your coach", linked: tms(l[0].created) } : null;
    },
    async link(raw) {
      const code = cleanCode(raw);
      if (code.length !== 8) throw coachErr("bad-code", "Invite codes are 8 letters and numbers. Check it and try again.");
      if (await Coach.mine()) throw coachErr("has-coach", "You're already linked to a coach. Unlink first to switch.");
      const inv = await FB.getDoc(CR.invite(code));
      if (!inv.exists()) throw coachErr("no-code", "No coach has that code. Check it with your coach, they may have made a new one.");
      const c = inv.data();
      if (c.coach === user.uid) throw coachErr("self", "That's your own invite code. Share it with your clients.");
      const id = c.coach + "_" + user.uid, b = FB.writeBatch(db);
      b.set(CR.link(id), { coach: c.coach, client: user.uid, coachName: c.name || "Your coach", clientName: user.displayName || "Client", code, created: FB.serverTimestamp() });
      await b.commit();
      return { id, coach: c.coach, name: c.name || "Your coach" };
    },
    // either side can end a link; the coach loses access right away
    async unlink(id) { await deleteAll([CR.link(id)]); },
    friendly(e) { return (e && e.coachMsg) || friendly(e); },
  };

  async function onUser(u) {
    user = u; ready = false;
    if (!u) {
      // keep the phone's copy (it may hold changes that never synced); the sign-in screen covers it
      A.onAuth(null, "signed-out"); return;
    }
    if (meta.uid !== u.uid) {
      A.onAuth(u, "loading");
      try { await adopt(u); }
      catch (e) { ready = false; A.onAuth(u, "error", friendly(e)); return; }
    } else ready = true;
    A.onAuth(u, "ready");
    run(true);
  }

  /* ---------- public ---------- */
  const Cloud = {
    enabled,
    get user() { return user; },
    get ready() { return ready; },
    get state() { return state; },
    get synced() { return meta.synced || 0; },
    // does this phone hold an account's data (show the app right away while sign-in is confirmed)?
    get claimed() { return !!meta.uid; },
    friendly,
    blankDay,
    coach: Coach,

    start(app) {
      A = app;
      if (!enabled) return;
      const fbApp = FB.initializeApp(CFG);
      auth = FB.initializeAuth(fbApp, { persistence: [FB.indexedDBLocalPersistence, FB.browserLocalPersistence] });
      db = FB.getFirestore(fbApp);
      FB.onAuthStateChanged(auth, u => { onUser(u); });
      document.addEventListener("visibilitychange", () => {
        if (!user || !ready) return;
        if (document.visibilityState === "hidden") { clearTimeout(pushT); run(false); }
        else if (Date.now() - lastPullAt > 20000) run(true);
      });
      window.addEventListener("online", () => { if (user && ready) run(true); });
    },
    retry() { if (user) onUser(user); },
    touch() { if (user && ready) schedule(2000); },
    syncNow() { return run(true); },
    pending() {
      if (!user || !ready) return false;
      const days = A.getDays();
      if (hash(mainJSON()) !== meta.main) return true;
      for (const d in days) if (!(d in meta.days) ? !blankDay(days[d]) : hash(JSON.stringify(days[d])) !== meta.days[d]) return true;
      return Object.keys(meta.days).some(d => !(d in days));
    },

    async signUp(name, email, password) {
      const cred = await FB.createUserWithEmailAndPassword(auth, email, password);
      try {
        if (name) await FB.updateProfile(cred.user, { displayName: name });
        await FB.setDoc(FB.doc(db, "users", cred.user.uid), { name: name || "", email, app: "adonis", created: FB.serverTimestamp(), updated: FB.serverTimestamp() }, { merge: true });
      } catch (e) { if (window.console) console.warn("Adonis profile:", e); }
    },
    signIn(email, password) { return FB.signInWithEmailAndPassword(auth, email, password); },
    resetPassword(email) { return FB.sendPasswordResetEmail(auth, email); },

    async updateName(name) {
      await FB.updateProfile(user, { displayName: name });
      await FB.setDoc(R.profile(), { name, email: user.email, app: "adonis", updated: FB.serverTimestamp() }, { merge: true });
    },
    async changePassword(current, next) {
      await FB.reauthenticateWithCredential(user, FB.EmailAuthProvider.credential(user.email, current));
      await FB.updatePassword(user, next);
    },

    // sends anything unsynced, then clears this phone so the next person starts clean
    async signOut() {
      clearTimeout(pushT);
      if (ready) { try { await run(false); } catch (e) {} }
      await FB.signOut(auth);
      meta = {}; saveMeta(); try { localStorage.removeItem(META_KEY); } catch (e) {}
      A.reset();
    },

    async deleteAccount(password) {
      await FB.reauthenticateWithCredential(user, FB.EmailAuthProvider.credential(user.email, password));
      clearTimeout(pushT); ready = false;
      const snap = await FB.getDocs(R.days()), refs = [];
      snap.forEach(s => refs.push(R.day(s.id)));
      refs.push(R.main(), R.profile());
      // coaching: unlink from a coach and from any clients, retire the invite code, clear coach-set data
      try {
        const links = [...await linksWhere("client"), ...await linksWhere("coach")];
        links.forEach(l => refs.push(CR.link(l.id)));
        const cs = await FB.getDocs(FB.collection(db, "users", user.uid, "coach"));
        cs.forEach(s => refs.push(FB.doc(db, "users", user.uid, "coach", s.id)));
        const p = await Coach.profile();
        if (p) { if (p.code) refs.push(CR.invite(p.code)); refs.push(CR.coach()); }
      } catch (e) { if (window.console) console.warn("Adonis coach cleanup:", e); }
      await deleteAll(refs);
      await FB.deleteUser(user);
      meta = {}; try { localStorage.removeItem(META_KEY); } catch (e) {}
      A.reset();
    },
  };
  window.AdonisCloud = Cloud;
})();
