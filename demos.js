/* Adonis exercise demos: a simple drawn figure that plays each movement.
   Original artwork made in code (no photos, nothing licensed). One figure system, ~40 movement templates,
   every exercise in the library maps to one. Shared by index.html; Node can load it for checks. */
(function (root) {
"use strict";

const L = { torso: 46, neck: 4, head: 9, ua: 27, fa: 25, th: 36, sh: 34, foot: 11 };
const G = 138;                     // floor line
const rad = d => d * Math.PI / 180;

/* two-bone IK: joint between a and b. s = which side the joint bends to (1 or -1) */
function ik(ax, ay, bx, by, l1, l2, s) {
  const d = Math.hypot(bx - ax, by - ay);
  const dm = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.2, d));
  const th = Math.atan2(by - ay, bx - ax);
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dm * dm - l2 * l2) / (2 * l1 * dm))));
  const jx = ax + l1 * Math.cos(th + s * a), jy = ay + l1 * Math.sin(th + s * a);
  const t2 = Math.atan2(by - jy, bx - jx);
  return [jx, jy, jx + l2 * Math.cos(t2), jy + l2 * Math.sin(t2)];
}
const lerp = (a, b, k) => {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * k;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerp(v, b[i], k));
  return k < 0.5 ? a : b;
};
function mix(A, B, k) { const o = {}; new Set([...Object.keys(A), ...Object.keys(B)]).forEach(key => { o[key] = key in A && key in B ? lerp(A[key], B[key], k) : (key in A ? A[key] : B[key]); }); return o; }

/* ---------- side view: the person faces right ---------- */
function sideJoints(p) {
  const t = rad(p.t || 0);
  // pin: shoulders fixed (upper back on a bench) and the body pivots there; otherwise the hips are placed
  const hip = p.pin ? [p.pin[0] - L.torso * Math.sin(t), p.pin[1] + L.torso * Math.cos(t)] : p.hip;
  const sh = p.pin ? p.pin : [hip[0] + L.torso * Math.sin(t), hip[1] - L.torso * Math.cos(t)];
  const ht = t + rad(p.hd || 0), hc = L.neck + L.head;
  const head = [sh[0] + hc * Math.sin(ht), sh[1] - hc * Math.cos(ht)];
  const handOf = (abs, rel) => abs || [sh[0] + rel[0], sh[1] + rel[1]];
  const ankOf = (abs, rel) => abs || [hip[0] + rel[0], hip[1] + rel[1]];
  const fwd = [Math.cos(t), Math.sin(t)], dn = [-Math.sin(t), Math.cos(t)];
  const viaT = v => [sh[0] + v[0] * fwd[0] + v[1] * dn[0], sh[1] + v[0] * fwd[1] + v[1] * dn[1]];
  const hand = p.hh ? [hip[0] + p.hh[0], hip[1] + p.hh[1]] : p.ht ? viaT(p.ht) : handOf(p.hand, p.hr || [3, 50]);
  const hand2f = p.hand2 ? p.hand2 : p.ht2 ? viaT(p.ht2) : p.hr2 ? handOf(null, p.hr2) : hand;
  // ta/sa: thigh and shin angles (0 = pointing right, 90 = straight down). The knee stays where the thigh puts it.
  const byAng = p.ta != null ? (() => { const kn = [hip[0] + L.th * Math.cos(rad(p.ta)), hip[1] + L.th * Math.sin(rad(p.ta))];
    return [kn, [kn[0] + L.sh * Math.cos(rad(p.sa)), kn[1] + L.sh * Math.sin(rad(p.sa))]]; })() : null;
  const an = byAng ? byAng[1] : ankOf(p.an, p.ar || [2, 69]), an2 = p.an2 || (p.ar2 ? ankOf(null, p.ar2) : an);
  const arm = (h, s) => ik(sh[0], sh[1], h[0], h[1], L.ua, L.fa, s);
  const leg = (a, s) => ik(hip[0], hip[1], a[0], a[1], L.th, L.sh, s);
  // er: elbow placed directly (relative to the shoulder), for arms that partly point out to the side, like a bench press
  // fa: forearm angle (0 = pointing right, 90 = down), so the forearm swings around a fixed elbow without shrinking
  const aaArm = p.aa != null ? (() => { const a1 = rad(p.aa), a2 = rad(p.aa - 8), e = [sh[0] + L.ua * Math.cos(a1), sh[1] + L.ua * Math.sin(a1)];
    return [e[0], e[1], e[0] + L.fa * Math.cos(a2), e[1] + L.fa * Math.sin(a2)]; })() : null;
  const elb = p.er ? [sh[0] + p.er[0], sh[1] + p.er[1]] : null;
  const A1 = aaArm ? aaArm : p.er ? [elb[0], elb[1], ...(p.fa != null ? [elb[0] + L.fa * Math.cos(rad(p.fa)), elb[1] + L.fa * Math.sin(rad(p.fa))] : [sh[0] + p.hr[0], sh[1] + p.hr[1]])]
                  : arm(hand, p.eb ?? 1);
  const A2 = (p.er || aaArm) && !p.hand2 && !p.ht2 && !p.hr2 ? A1 : arm(hand2f, p.eb2 ?? p.eb ?? 1);
  const L1 = byAng ? [byAng[0][0], byAng[0][1], an[0], an[1]] : leg(an, p.kb ?? -1);
  const L2 = byAng && an2 === an ? L1 : leg(an2, p.kb2 ?? p.kb ?? -1);
  const foot = (ank, f) => [ank[0] + L.foot * Math.cos(rad(f)), ank[1] + L.foot * Math.sin(rad(f))];
  return {
    hip, sh, head,
    elbow: [A1[0], A1[1]], hand: [A1[2], A1[3]], elbow2: [A2[0], A2[1]], hand2: [A2[2], A2[3]],
    knee: [L1[0], L1[1]], ankle: [L1[2], L1[3]], knee2: [L2[0], L2[1]], ankle2: [L2[2], L2[3]],
    halo: !!p.halo, toe: foot([L1[2], L1[3]], p.ft ?? 0), toe2: foot([L2[2], L2[3]], p.ft2 ?? p.ft ?? 0),
    shb: [sh[0] - 6 * Math.cos(t), sh[1] - 6 * Math.sin(t) - 2], shf: [sh[0] + 7 * Math.cos(t), sh[1] + 7 * Math.sin(t) - 2],
  };
}

/* ---------- front view: the person faces you ---------- */
function frontJoints(p) {
  const cx = p.cx ?? 120, hy = p.hip ?? 69, sw = 16, hw = 9, lean = p.lean || 0;
  const Lt = L.torso * (1 - 0.6 * lean);        // bending toward you: the torso looks shorter
  const shY = hy - Lt + 3;                      // shoulder joints sit just below the top of the torso
  let J = {
    hipL: [cx - hw, hy], hipR: [cx + hw, hy], shL: [cx - sw, shY], shR: [cx + sw, shY], mid: [cx, hy], neck: [cx, hy - Lt],
    head: [cx, hy - Lt - (L.neck + L.head) * (1 - 0.75 * lean)],   // and the head comes forward, in front of the upper back
    // body outline: shoulders, chest, waist, hips
    oSL: [cx - sw - 3, shY - 2], oSR: [cx + sw + 3, shY - 2], oCL: [cx - sw + 1, shY + 14], oCR: [cx + sw - 1, shY + 14],
    oWL: [cx - 11, hy - 12 * (1 - 0.6 * lean)], oWR: [cx + 11, hy - 12 * (1 - 0.6 * lean)], oHL: [cx - 12, hy + 3], oHR: [cx + 12, hy + 3],
  };
  // arms: either a hand target (IK) or an angle from hanging (0) to straight out (90) to overhead (180).
  // plane "h": the arm swings in front of you (seen end-on), so it looks shorter as it points at you.
  const reach = L.ua + L.fa - 2;
  const arm = (side, sh, ang, target, eb) => {
    const sx = side < 0 ? -1 : 1;
    if (ang == null && !target) ang = 7;
    if (ang != null) {
      const a = rad(ang);
      if (p.plane === "h") { const hand = [sh[0] + sx * reach * Math.sin(a), sh[1] + (p.ay ?? 6)]; return [[(sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2], hand]; }
      const d1 = [sx * Math.sin(a), Math.cos(a)], a2 = rad(ang + 4), d2 = [sx * Math.sin(a2), Math.cos(a2)];
      const el = [sh[0] + L.ua * d1[0], sh[1] + L.ua * d1[1]];
      return [el, [el[0] + L.fa * d2[0], el[1] + L.fa * d2[1]]];
    }
    const f = p.fs ?? 1, r = ik(sh[0], sh[1], target[0], target[1], L.ua * f, L.fa * f, eb);
    return [[r[0], r[1]], [r[2], r[3]]];
  };
  const [elL, hdL] = arm(-1, J.shL, p.aL, p.hl, p.ebl ?? -1), [elR, hdR] = arm(1, J.shR, p.aR, p.hr, p.ebr ?? 1);
  const al = p.al || [cx - hw - 2, hy + 69.8], ar = p.ar || [cx + hw + 2, hy + 69.8];
  // kL/kR: knees placed directly (seated, thighs pointing at you so they look short)
  const L1 = p.kL ? [...p.kL, ...al] : ik(J.hipL[0], J.hipL[1], al[0], al[1], L.th, L.sh, p.kbl ?? 1);
  const L2 = p.kR ? [...p.kR, ...ar] : ik(J.hipR[0], J.hipR[1], ar[0], ar[1], L.th, L.sh, p.kbr ?? -1);
  Object.assign(J, { elL, hdL, elR, hdR, fs: p.fs ?? 1,
    knL: [L1[0], L1[1]], anL: [L1[2], L1[3]], knR: [L2[0], L2[1]], anR: [L2[2], L2[3]] });
  J.toeL = [J.anL[0] - 7, J.anL[1] + 1]; J.toeR = [J.anR[0] + 7, J.anR[1] + 1];
  if (p.rot) {   // tip the whole body over (side plank, lying on your side)
    const a = rad(p.rot), [px, py] = p.piv || [cx, hy], c = Math.cos(a), s = Math.sin(a);
    for (const k in J) { if (!Array.isArray(J[k])) continue; const [x, y] = J[k]; J[k] = [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; }
  }
  return J;
}

/* ---------- drawing ---------- */
const f1 = n => Math.round(n * 10) / 10;
const seg = (a, b, w, cls) => `<line class="${cls}" x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke-width="${w}"/>`;
const poly = (pts, w, cls) => `<polyline class="${cls}" points="${pts.map(p => `${f1(p[0])},${f1(p[1])}`).join(" ")}" stroke-width="${w}" fill="none"/>`;
function at(J, where, dx, dy) {
  const p = Array.isArray(where) ? where : J[where] || [0, 0];
  return [p[0] + (dx || 0), p[1] + (dy || 0)];
}
function drawProp(pr, J) {
  switch (pr.k) {
    case "rect": return `<rect class="dp-eq" x="${pr.x}" y="${pr.y}" width="${pr.w}" height="${pr.h}" rx="${pr.rx ?? 3}"/>`;
    case "poly": return `<polygon class="dp-eq" points="${pr.pts.map(p => p.join(",")).join(" ")}"/>`;
    case "line": return `<line class="dp-eqs" x1="${pr.a[0]}" y1="${pr.a[1]}" x2="${pr.b[0]}" y2="${pr.b[1]}" stroke-width="${pr.w || 4}"/>`;
    case "plate": { const c = at(J, pr.at, pr.dx, pr.dy); return `<circle class="dp-load" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${pr.r || 11}"/><circle class="dp-hole" cx="${f1(c[0])}" cy="${f1(c[1])}" r="2.5"/>`; }
    case "ball": { const c = at(J, pr.at, pr.dx, pr.dy); return `<circle class="dp-load" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${pr.r || 9}"/>`; }
    case "db": { const c = at(J, pr.at, pr.dx, pr.dy), v = pr.v;   // v: drawn upright
      if (pr.sq) return `<rect class="dp-load" x="${f1(c[0] - 5)}" y="${f1(c[1] - 5)}" width="10" height="10" rx="2.5"/>`;
      return v ? `<rect class="dp-load" x="${f1(c[0] - 3.5)}" y="${f1(c[1] - 9)}" width="7" height="18" rx="2.5"/>`
               : `<rect class="dp-load" x="${f1(c[0] - 9)}" y="${f1(c[1] - 3.5)}" width="18" height="7" rx="2.5"/>`; }
    case "bar": { const c = at(J, pr.at, pr.dx, pr.dy), w = pr.w || 26; return `<line class="dp-loads" x1="${f1(c[0] - w / 2)}" y1="${f1(c[1])}" x2="${f1(c[0] + w / 2)}" y2="${f1(c[1])}" stroke-width="4"/>`; }
    case "cable": { const t = at(J, pr.to); return `<line class="dp-cable" x1="${pr.from[0]}" y1="${pr.from[1]}" x2="${f1(t[0])}" y2="${f1(t[1])}"/><circle class="dp-eq" cx="${pr.from[0]}" cy="${pr.from[1]}" r="5"/>`; }
    case "band": { const t = at(J, pr.to), [x0, y0] = pr.from, n = 8, pts = [];
      for (let i = 0; i <= n; i++) { const k = i / n, x = x0 + (t[0] - x0) * k, y = y0 + (t[1] - y0) * k, nx = -(t[1] - y0), ny = t[0] - x0, l = Math.hypot(nx, ny) || 1, o = (i % 2 ? 2.2 : -2.2) * (i && i < n ? 1 : 0); pts.push([x + nx / l * o, y + ny / l * o]); }
      return poly(pts, 2.2, "dp-band"); }
    case "pad": { const c = at(J, pr.at, pr.dx, pr.dy); return `<circle class="dp-eq" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${pr.r || 5}"/>`; }
    case "plat": { const a = J.ankle, t = J.toe, dx = t[0] - a[0], dy = t[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, cx = t[0] + ux * 3, cy = t[1] + uy * 3;
      return seg([cx + uy * 18, cy - ux * 18], [cx - uy * 18, cy + ux * 18], 5, "dp-eqs"); }
    case "spad": { const a = J.knee, b = J.ankle, l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, sd = pr.side || 1;
      const c = [b[0] - ux * 5 - uy * 8 * sd, b[1] - uy * 5 + ux * 8 * sd];
      return `<circle class="dp-eq" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${pr.r || 6}"/>`; }
    case "fist": { const c = [(J.hdL[0] + J.hdR[0]) / 2, (J.hdL[1] + J.hdR[1]) / 2], r = 4 + 5 * (1 - (J.fs ?? 1));
      return `<circle class="dp-fist" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${f1(r)}"/>`; }
    case "floorscroll": {   // floor marks sliding backward under a walking figure
      const off = ((J.k || 0) * pr.travel) % pr.step; let out = "";
      for (let x = -40 - off; x < 280; x += pr.step) out += `<line class="dp-eqs" x1="${f1(x)}" y1="${G + 4}" x2="${f1(x + 12)}" y2="${G + 4}" stroke-width="3"/>`;
      return out; }
    case "seg": { const a = at(J, pr.a), b = at(J, pr.b); return seg(a, b, pr.w || 4, "dp-eqs"); }
  }
  return "";
}
function drawSide(J, props) {
  const back = (props || []).filter(p => !p.front).map(p => drawProp(p, J)).join("");
  const front = (props || []).filter(p => p.front).map(p => drawProp(p, J)).join("");
  return back
    + poly([J.hip, J.knee2, J.ankle2, J.toe2], 8, "dp-far") + poly([J.sh, J.elbow2, J.hand2], 7, "dp-far")
    + seg(J.hip, J.sh, 13, "dp-body") + `<circle class="dp-head" cx="${f1(J.head[0])}" cy="${f1(J.head[1])}" r="${L.head}"/>`
    + poly([J.hip, J.knee, J.ankle, J.toe], 8, "dp-limb") + (J.halo ? poly([J.sh, J.elbow, J.hand], 10.5, "dp-halo") : "") + poly([J.sh, J.elbow, J.hand], 7, "dp-limb") + front;
}
function drawFront(J, props) {
  const back = (props || []).filter(p => !p.front).map(p => drawProp(p, J)).join("");
  const front = (props || []).filter(p => p.front).map(p => drawProp(p, J)).join("");
  return back
    + poly([J.hipL, J.knL, J.anL, J.toeL], 8, "dp-limb") + poly([J.hipR, J.knR, J.anR, J.toeR], 8, "dp-limb")
    + `<polygon class="dp-torso" points="${[J.oSL, J.oSR, J.oCR, J.oWR, J.oHR, J.oHL, J.oWL, J.oCL].map(p => `${f1(p[0])},${f1(p[1])}`).join(" ")}"/>`
    + seg(J.neck, J.head, 7, "dp-limb") + `<circle class="dp-head" cx="${f1(J.head[0])}" cy="${f1(J.head[1])}" r="${L.head}"/>`
    // a thin outline in the background colour keeps arms readable where they cross the body
    + poly([J.elL, J.hdL], 10.5, "dp-halo") + poly([J.elR, J.hdR], 10.5, "dp-halo")
    + poly([J.shL, J.elL, J.hdL], 7, "dp-limb") + poly([J.shR, J.elR, J.hdR], 7, "dp-limb") + front;
}

/* ---------- movement templates ---------- */
const STAND = { hip: [120, 68.6], t: 2, an: [122, G] };
const ST_SH = [121.6, 23];                       // shoulder when standing
const LIE_BENCH = [{ k: "rect", x: 52, y: 98, w: 104, h: 8 }, { k: "rect", x: 64, y: 106, w: 6, h: 32, rx: 1 }, { k: "rect", x: 138, y: 106, w: 6, h: 32, rx: 1 }];
const FLAT_BENCH_LOW = [{ k: "rect", x: 112, y: 100, w: 70, h: 8 }, { k: "rect", x: 124, y: 108, w: 6, h: 30, rx: 1 }, { k: "rect", x: 166, y: 108, w: 6, h: 30, rx: 1 }];
const SEAT = (x, y) => [{ k: "rect", x: x - 18, y, w: 36, h: 7 }, { k: "rect", x: x - 3, y: y + 7, w: 6, h: G - y - 7, rx: 1 }];
const hold = (A, d) => ({ A, B: mix(A, d, 1), hold: true });

function loadProps(eq, at, at2) {
  if (eq === "bb") return [{ k: "plate", at, front: true }];
  if (eq === "db") return [{ k: "db", at, front: true }, ...(at2 ? [{ k: "db", at: at2 }] : [])];
  if (eq === "kb") return [{ k: "ball", at, r: 8, dy: 6, front: true }];
  return [];
}

const T = {};
// squat family. arms: bw (forward), goblet, back, front
T.squat = (o = {}) => {
  // bodyweight: arms straight out in front, level with the floor. Holds move with the torso.
  const hold_ = { goblet: { ht: [20, 10], eb: 1 }, band: { ht: [20, 10], eb: 1 }, back: { ht: [-7, -1], eb: -1 }, front: { ht: [4, -8], eb: 1 } }[o.arms];
  const arms = hold_ || { hr: [51, 4], eb: -1 };
  const A = { ...STAND, ...arms }, B = { hip: [99, 103], t: 38, an: [122, G], ...arms };
  const props = [];
  if (o.arms === "goblet") props.push({ k: "db", at: "hand", v: 1, front: true });
  if (o.arms === "back") props.push({ k: "plate", at: "shb", front: false });
  if (o.arms === "front") props.push({ k: "plate", at: "shf", front: true });
  if (o.arms === "band") props.push({ k: "band", from: [122, 140], to: "hand" });
  if (o.heel) {
    // heels raised on a slant board: ankles sit high, toes lower, and the torso stays more upright at the bottom
    props.push({ k: "poly", pts: [[106, G], [142, G], [142, G - 1], [106, G - 13]] });
    Object.assign(A, { hip: [116, 56], an: [114, G - 12], ft: 18 });
    Object.assign(B, { hip: [99, 92], t: 28, an: [114, G - 12], ft: 18 });
  }
  if (o.wall) { props.push({ k: "line", a: [80, -30], b: [80, G], w: 5 }); return { ...hold({ hip: [93, 103], t: 0, an: [126, G], hr: [8, 46] }, { hip: [93, 102] }), props }; }
  if (o.jump) return { A: { hip: [120, 56], t: 4, an: [122, 126], ft: 35, hr: [-16, 48], eb: 1 }, B: { ...B, hr: [-20, 44], eb: 1 }, props };
  if (o.hack) { props.push({ k: "poly", pts: [[60, G], [70, G], [136, -10], [128, -14]] }); }
  return { A, B, props };
};
T.legpress = () => ({
  A: { hip: [78, 112], t: -60, an: [118, 70], kb: 1, hand: [84, 114], ft: -70 },
  B: { hip: [78, 112], t: -60, an: [146, 46], kb: 1, hand: [84, 114], ft: -60 },
  props: [{ k: "poly", pts: [[30, 82], [40, 76], [92, 116], [92, 124], [60, 124]] }, { k: "rect", x: 74, y: 124, w: 8, h: 14, rx: 1 },
    { k: "plat", front: true }],
});
// hinge family: rdl, deadlift, goodmorning, single-leg rdl, kettlebell swing, pull-through
T.hinge = (o = {}) => {
  const A = { ...STAND, hr: [3, 50] }, B = { hip: [94, 78], t: 72, an: [122, G], hr: [3, 50] };
  if (o.dl) Object.assign(B, { hip: [97, 93], t: 56, hr: [2, 52] });
  if (o.gm) { A.ht = B.ht = [-7, -1]; A.eb = B.eb = -1; }
  if (o.sl) { A.an2 = [118, G]; B.an2 = [28, 72]; B.ft2 = 90; A.ft2 = 0; }
  const props = o.gm ? [{ k: "plate", at: "shb" }] : loadProps(o.eq, "hand", o.eq === "db" ? "hand2" : null);
  if (o.cable) { props.push({ k: "cable", from: [36, 132], to: "hand" }); A.hr = [-2, 50]; B.hr = [-30, 42]; }
  return { A, B, props };
};
T.swing = (o = {}) => ({
  A: { hip: [96, 82], t: 66, an: [122, G], hr: [-22, 40] },
  B: { ...STAND, hr: [50, -2] },
  props: o.slam ? [{ k: "ball", at: "hand", r: 10, front: true }] : [{ k: "ball", at: "hand", r: 8, dy: 6, front: true }],
});
T.slam = () => ({ A: { ...STAND, hr: [4, -50], eb: -1 }, B: { hip: [100, 96], t: 50, an: [122, G], hr: [30, 40] }, props: [{ k: "ball", at: "hand", r: 10, front: true }] });
// hip thrust / bridge
T.thrust = (o = {}) => {
  if (o.floor) {
    const A = { hip: [86, 131], t: -90, an: [126, G], kb: -1, hand: [88, 136], ft: 0 }, B = { hip: [82, 110], t: -116, an: [126, G], kb: -1, hand: [86, 136] };
    if (o.sl) { A.an2 = null; A.ar2 = [64, -24]; B.ar2 = [66, -26]; A.kb2 = B.kb2 = 1; }
    if (o.heel) { A.an = [150, G]; B.an = [132, G]; A.hip = [96, 131]; B.hip = [94, 112]; A.t = -90; B.t = -113; }
    return { A, B, props: o.eq === "bb" ? [{ k: "plate", at: "hip", dy: -10, front: true }] : [] };
  }
  // bench: shoulder blades pivot on its edge. Feet planted under the knees at the top.
  const PIN = [56, 103];
  const A = { pin: PIN, t: -54, hd: 14, an: [138, G], kb: -1, ft: 0, hh: [2, -9], eb: 1 };
  const B = { pin: PIN, t: -90, hd: 42, an: [138, G], kb: -1, ft: 0, hh: [2, -9], eb: 1 };
  if (o.sl) { A.ar2 = [46, -44]; B.ar2 = [68, -2]; A.kb2 = B.kb2 = -1; A.ft2 = B.ft2 = 0; delete A.hh; delete B.hh; A.hand = B.hand = [5, 107]; A.eb = B.eb = 1; }   // arms rest along the bench
  const props = [{ k: "rect", x: 10, y: 110, w: 50, h: 28 }];
  if (o.eq === "bb") props.push({ k: "plate", at: "hip", dy: -11, front: true });
  if (o.eq === "db") props.push({ k: "db", at: "hip", dy: -8, front: true });
  return { A, B, props, cap: "Upper back stays on the bench. Drive through your heels until your body is flat from shoulders to knees." };
};
// walking lunge: four keyframes (lunge, step through, lunge on the other leg, step through) that loop
T.walklunge = () => {
  const arms = { hr: [3, 50], t: 4 };
  const A = { ...arms, hip: [116, 103], an: [80, G - 4], ft: 35, an2: [152, G], ft2: 0 };      // far leg in front, back knee down
  const M1 = { ...arms, hip: [117, 70], an: [128, 112], ft: 15, an2: [116, G], ft2: 0 };        // stand up over the front foot, back leg swings through
  const B = { ...arms, hip: [116, 103], an: [152, G], ft: 0, an2: [80, G - 4], ft2: 35 };      // near leg in front now
  const M2 = { ...arms, hip: [117, 70], an: [116, G], ft: 0, an2: [128, 112], ft2: 15 };
  return { keys: [A, M1, B, M2, A], loop: true, per: 4400, A, B,
    props: [{ k: "db", at: "hand", v: 0, front: true }, { k: "db", at: "hand2" }, { k: "floorscroll", step: 36, travel: 144 }],
    cap: "Step forward into each lunge, then stand and bring the back leg through into the next step." };
};
// lunges
T.lunge = (o = {}) => {
  const A = { hip: [116, 72], t: 0, an: [152, G], an2: [80, G - 4], ft2: 35, hr: [3, 50] };
  const B = { hip: [113, 103], t: 6, an: [152, G], an2: [80, G - 4], ft2: 35, hr: [3, 50] };
  const props = loadProps(o.eq, "hand", o.eq === "db" ? "hand2" : null);
  if (o.bulg) { A.an2 = B.an2 = [62, 104]; A.ft2 = B.ft2 = -10; A.hip = [120, 72]; B.hip = [114, 104]; props.unshift({ k: "rect", x: 26, y: 108, w: 50, h: 30 }); }
  return { A, B, props };
};
T.stepup = (o = {}) => ({
  A: { hip: [116, 80], t: 14, an: [152, 106], an2: [104, G], hr: [3, 50] },
  B: { hip: [148, 38], t: 4, an: [152, 106], an2: [146, 102], kb2: -1, hr: [3, 50] },
  props: [{ k: "rect", x: 132, y: 108, w: 56, h: 30 }, ...loadProps(o.eq, "hand", o.eq === "db" ? "hand2" : null)],
});
// presses lying down
T.bench = (o = {}) => {
  // lockout: arms straight up over the shoulders. Bottom: elbows drop below the bench, forearms vertical under the weight.
  let A = { hip: [128, 94], t: -90, an: [164, G], kb: 1, er: [1, -25], hr: [2, -50], hd: 0 }, B = { ...A, er: [12, 13], hr: [13, -13] };
  let props = [...LIE_BENCH];
  if (o.incline) { A = { hip: [126, 98], t: -58, an: [164, G], kb: -1, er: [2, -25], hr: [4, -50] }; B = { ...A, er: [8, 17], hr: [17, -8] };
    props = [{ k: "poly", pts: [[136, 100], [136, 108], [70, 66], [76, 58]] }, { k: "rect", x: 100, y: 104, w: 6, h: 34, rx: 1 }]; }
  if (o.decline) {
    // head end low, hips high; knees bent over the top of the bench with the ankles hooked under a pad
    A = { hip: [128, 86], t: -112, ta: -28, sa: 72, ft: -18, er: [1, -25], hr: [2, -50] }; B = { ...A, er: [12, 13], hr: [13, -13] };
    props = [{ k: "poly", pts: [[44, 115], [44, 107], [146, 84], [148, 92]] }, { k: "rect", x: 56, y: 113, w: 6, h: 25, rx: 1 }, { k: "rect", x: 132, y: 92, w: 6, h: 46, rx: 1 },
      { k: "line", a: [138, 100], b: [176, 112], w: 4 }, { k: "pad", at: "ankle", dx: 4, dy: 7, r: 6 }];
  }
  if (o.floor) { A = { hip: [128, 129], t: -90, an: [160, G], kb: -1, er: [1, -25], hr: [2, -50] }; B = { ...A, er: [11, 6], hr: [13, -19] }; props = []; }   // elbows touch the floor
  if (o.fly) { B = { ...A, er: [3, 15], hr: [6, 30] }; }      // arms open wide to the sides: seen from the side they reach down past the bench
  if (o.skull) { A = { ...A, er: [1, -26], fa: -88 }; delete A.hr; B = { ...A, fa: -205 }; }   // upper arms stay pointed up, forearms lower toward the forehead
  props.push(...(o.eq === "bb" ? [{ k: "plate", at: "hand", front: true }] : o.eq === "db" ? [{ k: "db", at: "hand", v: 0, front: true }] : o.eq === "band" ? [{ k: "band", from: [84, 104], to: "hand" }] : []));
  return { A, B, props };
};
// seated or standing presses forward (machine chest press, med ball pass, pallof)
T.pressfwd = (o = {}) => {
  const base = o.seated ? { hip: [100, 102], t: -6, an: [140, G] } : { ...STAND };
  const y = o.incline ? -16 : 22;
  const A = { ...base, hr: [12, y + 2], eb: 1 }, B = { ...base, hr: [52, y - (o.incline ? 14 : 0)], eb: 1 };
  const props = [];
  if (o.seated) props.push(...SEAT(98, 104), { k: "line", a: [88, 102], b: [80, 44], w: 5 });
  if (o.cable) props.push({ k: "cable", from: [24, 40], to: "hand" });
  if (o.band) props.push({ k: "band", from: [26, 46], to: "hand" });
  if (o.ball) props.push({ k: "ball", at: "hand", r: 10, dx: 6, front: true });
  if (o.seated) props.push({ k: "bar", at: "hand", w: 4 });
  return { A, B, props };
};
T.pallof = (o = {}) => {
  // Seen from above, facing up the screen. That's the only angle where you can see both halves of the exercise:
  // the band pulling you sideways (from the left) and your arms pressing straight out in front of you.
  const ln = (a, b, w, cls) => `<line class="${cls}" x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke-width="${w}"/>`;
  const pl = (pts, w, cls) => `<polyline class="${cls}" points="${pts.map(q => `${f1(q[0])},${f1(q[1])}`).join(" ")}" stroke-width="${w}" fill="none"/>`;
  const L2 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const shL = [111, 78], shR = [149, 78];
  const anchor = [30, 58];                                        // the post, out to your left at chest height
  const custom = k => {
    const hand = L2([130, 49], [130, 28], k);                     // hands start at the chest, finish at arm's length
    const elL = L2([97, 59], [120.5, 53], k), elR = L2([163, 59], [139.5, 53], k);    // elbows start bent and wide
    const post = o.cable ? `<rect class="dp-eq" x="${anchor[0] - 10}" y="${anchor[1] - 10}" width="20" height="20" rx="3"/>`
                         : `<circle class="dp-eq" cx="${anchor[0]}" cy="${anchor[1]}" r="8"/>`;
    const pull = o.cable ? ln(anchor, hand, 1.5, "dp-cable") : drawProp({ k: "band", from: anchor, to: hand }, {});
    return post
      + ln([121, 76], [121, 60], 8, "dp-far") + ln([139, 76], [139, 60], 8, "dp-far")      // feet, seen past the body
      + `<rect class="dp-torso" x="105" y="66" width="50" height="24" rx="12"/>`             // shoulders and back from above
      + `<circle class="dp-fist" cx="130" cy="78" r="10.5"/>`                                // top of the head
      + pull
      + pl([elL, hand], 10.5, "dp-halo") + pl([elR, hand], 10.5, "dp-halo")
      + pl([shL, elL, hand], 7, "dp-limb") + pl([shR, elR, hand], 7, "dp-limb")
      + `<circle class="dp-fist" cx="${f1(hand[0])}" cy="${f1(hand[1])}" r="5.5"/>`;
  };
  return { custom, box: [12, 8, 166, 93.4], A: {}, B: {},
    cap: `Seen from above. The ${o.cable ? "cable" : "band"} pulls you sideways: press straight out from your chest and don't let your body turn.` };
};
// push ups
T.pushup = (o = {}) => {
  let A = { hip: [110, 106], t: 64, an: [50, 136], ft: 70, kb: 1, hand: [150, G], eb: -1, hd: 6 };
  let B = { hip: [119, 125], t: 81, an: [50, 136], ft: 70, kb: 1, hand: [150, G], eb: -1, hd: 6 };
  const props = [];
  if (o.incline) { A = { hip: [96, 88], t: 50, an: [44, 136], ft: 70, kb: 1, hand: [150, 100], eb: -1 }; B = { hip: [104, 100], t: 64, an: [44, 136], ft: 70, kb: 1, hand: [150, 100], eb: -1 }; props.push({ k: "rect", x: 138, y: 102, w: 54, h: 36 }); }
  if (o.wall) { A = { hip: [110, 72], t: 26, an: [92, G], hand: [178, 20], eb: -1 }; B = { hip: [118, 72], t: 36, an: [92, G], hand: [178, 20], eb: -1 }; props.push({ k: "line", a: [182, -30], b: [182, G], w: 5 }); }
  if (o.decline) { A = { hip: [116, 92], t: 83, an: [48, 100], ft: 70, kb: 1, hand: [158, G], eb: -1, hd: 6 }; B = { hip: [119, 107], t: 96, an: [48, 100], ft: 70, kb: 1, hand: [158, G], eb: -1, hd: 6 }; props.push({ k: "rect", x: 22, y: 104, w: 44, h: 34 }); }
  if (o.pike) { A = { hip: [104, 58], t: 150, an: [66, G], ft: 0, kb: 1, hand: [150, G], eb: -1 }; B = { hip: [110, 66], t: 140, an: [66, G], ft: 0, kb: 1, hand: [150, G], eb: 1 }; }
  if (o.climb) { B = { ...A, an: [112, 120], ft: 80 }; }
  if (o.taps) { B = { ...A, hand: [136, 72], eb: 1 }; }
  if (o.renegade) { B = { ...A, hand: [124, 104], eb: 1 }; props.push({ k: "db", at: "hand", front: true }, { k: "db", at: "hand2" }); }
  return { A, B, props };
};
// planks and floor core
T.plank = (o = {}) => {
  if (o.side) return hold({ hip: [136, 110], t: -70, an: [198, 136], ft: -40, kb: 1, hand: [76, 136], eb: 1, hand2: [92, 42], eb2: -1, hd: -10 }, { hip: [136, 106], t: -72 });
  return hold({ hip: [104, 120], t: 77, an: [36, 136], ft: 70, kb: 1, hand: [172, 136], eb: -1, hd: 8 }, { hip: [104, 117] });
};
T.deadbug = () => ({
  A: { hip: [132, 128], t: -90, an: [164, 92], an2: [164, 92], kb: 1, kb2: 1, ft: 0, hand: [88, 76], hand2: [88, 76], eb: 1 },
  B: { hip: [132, 128], t: -90, an: [164, 92], an2: [200, 124], kb: 1, kb2: 1, ft: 0, hand: [88, 76], hand2: [40, 122], eb: 1 },
});
T.birddog = () => ({
  A: { hip: [100, 98], t: 90, an: [66, 136], an2: [66, 136], kb: 1, kb2: 1, ft: 180, hand: [146, G], hand2: [146, G], eb: 1, hd: 10 },
  B: { hip: [100, 98], t: 90, an: [66, 136], an2: [34, 90], kb: 1, kb2: 1, ft: 180, ft2: 180, hand: [146, G], hand2: [194, 92], eb: 1, hd: 10 },
});
T.situp = () => ({
  A: { hip: [116, 130], t: -86, an: [160, G], kb: -1, hr: [-14, -14], eb: -1 },
  B: { hip: [116, 130], t: -10, an: [160, G], kb: -1, hr: [14, 12], eb: -1 },
});
T.heelslide = () => ({ A: { hip: [100, 130], t: -90, an: [134, G], kb: -1, hand: [102, 136] }, B: { hip: [100, 130], t: -90, an: [168, G], kb: -1, hand: [102, 136] } });
T.kneeraise = () => ({
  A: { hip: [120, 66], t: 0, an: [120, 135], hand: [120, -36], eb: 1 },
  B: { hip: [118, 64], t: -6, an: [152, 98], kb: -1, ft: 30, hand: [120, -36], eb: 1 },
  props: [{ k: "line", a: [80, -38], b: [160, -38], w: 4 }],
});
T.cablecrunch = () => ({
  A: { hip: [116, 94], t: 12, an: [78, 136], kb: 1, ft: 180, hr: [6, -4], eb: -1 },
  B: { hip: [116, 94], t: 78, an: [78, 136], kb: 1, ft: 180, hr: [6, -4], eb: -1 },
  props: [{ k: "cable", from: [128, -40], to: "hand" }],
});
T.carry = (o = {}) => ({
  A: { ...STAND, an: [132, G], an2: [110, G], hr: [2, 50] },
  B: { ...STAND, an: [110, G], an2: [132, G], hr: [2, 50] },
  props: [{ k: "db", at: "hand", v: 0, front: true }, ...(o.both ? [{ k: "db", at: "hand2" }] : [])],
});
// pulls
T.row = (o = {}) => {
  // the weight travels straight up and down under the shoulder; the elbow drives up past the back
  const A = { hip: [96, 80], t: 68, an: [122, G], er: [1, 25], hr: [1, 50], halo: 1 }, B = { ...A, er: [-9, -3], hr: [-5, 22] };
  const props = loadProps(o.eq, "hand", o.eq === "db" && !o.one ? "hand2" : null);
  if (o.one) { A.t = B.t = 82; A.hip = B.hip = [94, 84]; A.hand2 = B.hand2 = [160, 100]; A.eb2 = B.eb2 = -1; props.unshift({ k: "rect", x: 146, y: 102, w: 48, h: 36 }); }
  if (o.chest) {
    // lying chest-down on an incline pad, toes on the floor behind; arms hang straight down past the pad and row up
    Object.assign(A, { hip: [96, 96], t: 50, an: [44, G], kb: 1, ft: 0, er: [1, 25], hr: [2, 50], halo: 1 });
    Object.assign(B, { hip: [96, 96], t: 50, an: [44, G], kb: 1, ft: 0, er: [-9, -3], hr: [-4, 23], halo: 1 });
    props.unshift({ k: "poly", pts: [[97, 104], [137, 70], [142, 76], [103, 111]] },            // pad, right under the chest
      { k: "rect", x: 117, y: 92, w: 6, h: 46, rx: 1 }, { k: "rect", x: 100, y: 132, w: 40, h: 6, rx: 2 });
  }
  return { A, B, props };
};
T.seatedrow = (o = {}) => ({
  A: { hip: [86, 120], t: 26, an: [160, 112], kb: 1, ft: -80, hand: [162, 96], eb: 1 },
  B: { hip: [86, 120], t: -8, an: [160, 112], kb: 1, ft: -80, hand: [112, 100], eb: 1 },
  props: [...SEAT(86, 122), { k: "line", a: [168, 100], b: [168, G], w: 4 }, o.band ? { k: "band", from: [176, 108], to: "hand" } : { k: "cable", from: [204, 104], to: "hand" }],
});
T.doorrow = () => ({
  A: { hip: [110, 82], t: -34, an: [152, G], hand: [176, 46], eb: -1 },
  B: { hip: [128, 74], t: -12, an: [152, G], hand: [176, 46], eb: 1 },
  props: [{ k: "line", a: [182, -30], b: [182, G], w: 5 }],
});
T.pulldown = (o = {}) => ({
  A: { hip: [112, 104], t: -8, an: [150, G], kb: -1, hand: [124, -34], eb: -1 },
  B: { hip: [112, 104], t: -16, an: [150, G], kb: -1, hand: [112, 40], eb: 1 },
  props: [...SEAT(110, 106), { k: "pad", at: [140, 92], r: 6 }, o.band ? { k: "band", from: [120, -48], to: "hand" } : { k: "cable", from: [120, -46], to: "hand" }, { k: "bar", at: "hand", w: 34 }],
});
T.pullup = (o = {}) => ({
  // dead hang with straight arms, then pull until the chin clears the bar. Elbows drive down and slightly forward,
  // the body leans back a touch so the chest comes to the bar, and the legs hang quietly with soft knees.
  A: { hip: [118, 64], t: -4, ar: [-12, 63], kb: 1, ft: 60, hand: [124, -38], eb: 1 },
  B: { hip: [112, 10], t: -10, ar: [-12, 63], kb: 1, ft: 60, hand: [124, -38], eb: 1 },
  props: [{ k: "line", a: [84, -38], b: [166, -38], w: 4 }, ...(o.band ? [{ k: "band", from: [124, -36], to: "ankle" }] : [])],
});
T.straightarm = () => ({
  A: { hip: [118, 70], t: 22, an: [126, G], hand: [170, 4], eb: 1 },
  B: { hip: [118, 70], t: 22, an: [126, G], hand: [140, 72], eb: 1 },
  props: [{ k: "cable", from: [204, -32], to: "hand" }],
});
T.facepull = () => ({
  A: { ...STAND, hand: [172, 22], eb: -1 },
  B: { ...STAND, hand: [138, 6], eb: -1 },
  props: [{ k: "cable", from: [206, 18], to: "hand" }],
});
T.revfly = () => ({
  // seen from the front, bent forward at the hips. Arms hang under the shoulders, then open out to the sides
  // like wings until they're level with the back. Elbows stay soft.
  view: "front",
  A: { lean: 1, hip: 74, al: [107, G], ar: [133, G], kbl: -1, kbr: 1, aL: 4, aR: 4 },
  B: { lean: 1, hip: 74, al: [107, G], ar: [133, G], kbl: -1, kbr: 1, aL: 84, aR: 84 },
  props: [{ k: "db", at: "hdL", sq: 1, front: true }, { k: "db", at: "hdR", sq: 1, front: true }],
  cap: "Seen from the front, bent over. Lift the weights out to the sides until your arms are level with your back.",
});
// overhead / shoulders / arms (standing or seated)
const BASE = o => o.seated ? { hip: [110, 104], t: 0, an: [150, G] } : { ...STAND };
const seatProps = o => o.seated ? [...SEAT(110, 106), { k: "line", a: [96, 104], b: [96, 40], w: 5 }] : [];
T.ohp = (o = {}) => ({
  A: { ...BASE(o), hr: [12, -2], eb: 1 }, B: { ...BASE(o), hr: [3, -51], eb: 1 },
  props: [...seatProps(o), ...(o.eq === "bb" ? [{ k: "plate", at: "hand", front: true }] : o.eq === "db" ? [{ k: "db", at: "hand", v: 1, front: true }] : o.eq === "band" ? [{ k: "band", from: [122, 140], to: "hand" }] : o.machine ? [{ k: "bar", at: "hand", w: 6 }] : [])],
});
T.ohpFront = () => FV(
  { hl: [96, 22], hr: [144, 22], ebl: -1, ebr: 1 },                 // dumbbells at shoulder height, elbows out and under the weights
  { hl: [109, -26], hr: [131, -26], ebl: -1, ebr: 1 },              // pressed straight overhead, arms close to the ears
  [{ k: "db", at: "hdL", front: true }, { k: "db", at: "hdR", front: true }]);
T.thruster = (o = {}) => ({
  A: { hip: [99, 103], t: 38, an: [122, G], ht: [4, -8], eb: 1 },
  B: { ...STAND, ht: [3, -51], eb: -1 },
  props: o.ball ? [{ k: "ball", at: "hand", r: 10, front: true }] : [{ k: "db", at: "hand", v: 1, front: true }],
});
T.pushpress = () => ({ A: { hip: [116, 78], t: 8, an: [122, G], hr: [12, -2], eb: 1 }, B: { ...STAND, hr: [3, -51], eb: 1 }, props: [{ k: "db", at: "hand", v: 1, front: true }] });
T.snatch = () => ({ A: { hip: [96, 92], t: 60, an: [122, G], hr: [2, 52] }, B: { ...STAND, hr: [3, -51], eb: 1 }, props: [{ k: "db", at: "hand", v: 1, front: true }] });
T.frontraise = (o = {}) => ({ A: { ...BASE(o), aa: 84 }, B: { ...BASE(o), aa: -4 }, props: [{ k: "db", at: "hand", v: 0, front: true }] });   // arm swings up in an arc, elbow soft
T.curl = (o = {}) => {
  // upper arm pinned at your side; the forearm swings up around the elbow. Drag curl: elbows travel back as the bar rises.
  let base = BASE(o), er = [2, 26], erB = er, props = seatProps(o);
  if (o.incline) {
    // reclined on an incline bench: arms hang straight down behind the body line, so the curl starts from a long stretch
    base = { hip: [104, 104], t: -42, ta: 4, sa: 92, ft: 2 };
    er = erB = [0, 27];
    props = [{ k: "poly", pts: [[98, 109], [63, 71], [57, 77], [92, 115]] }, { k: "rect", x: 92, y: 108, w: 38, h: 6, rx: 2 }, { k: "rect", x: 101, y: 114, w: 6, h: 24, rx: 1 }];
  }
  if (o.drag) erB = [-14, 22];
  const load = o.eq === "bb" ? [{ k: "bar", at: "hand", w: 6 }, { k: "plate", at: "hand", r: 9, front: true }] : o.eq === "db" ? [{ k: "db", at: "hand", v: !!o.hammer, front: true }]
    : o.cable ? [{ k: "cable", from: [176, 134], to: "hand" }] : o.band ? [{ k: "band", from: [124, 140], to: "hand" }] : [];
  if (o.drag) {
    // drag curl: the bar stays against the front of your body and slides straight up to the chest; elbows travel back
    const mid = { ...base, er: [-9, 21], hr: [9, 30], halo: 1 };
    return { A: { ...base, er: [3, 26], hr: [8, 50], halo: 1 }, B: { ...base, er: [-21, 9], hr: [9, 9], halo: 1 }, mid, props: [...props, ...load],
      cap: "Drag curl: keep the bar touching your body as it slides up. Your elbows travel back instead of swinging the bar out." };
  }
  return { A: { ...base, er, fa: 86 }, B: { ...base, er: erB, fa: -46 }, props: [...props, ...load] };
};
T.pressdown = (o = {}) => ({
  A: { ...STAND, t: 8, hr: [14, 22], eb: 1 }, B: { ...STAND, t: 8, hr: [8, 50], eb: 1 },
  props: [o.band ? { k: "band", from: [150, -40], to: "hand" } : { k: "cable", from: [148, -40], to: "hand" }],
});
T.ohext = (o = {}) => ({
  // upper arm stays pointed straight up beside the head; only the forearm moves, lowering the dumbbell behind the head
  A: { ...BASE(o), er: [9, -25], fa: 116, halo: 1 }, B: { ...BASE(o), er: [9, -25], fa: 272, halo: 1 },
  props: [...seatProps(o), { k: "db", at: "hand", v: 1, front: true }],
});
T.dips = (o = {}) => o.bench ? {
  A: { hip: [104, 90], t: -2, an: [182, G], hand: [96, 98], eb: 1 },
  B: { hip: [106, 114], t: -8, an: [182, G], hand: [96, 98], eb: 1 },
  props: [{ k: "rect", x: 52, y: 100, w: 52, h: 38 }],
} : {
  A: { hip: [116, 42], t: 6, an: [96, 98], kb: 1, ft: 60, hand: [126, 48], eb: 1 },
  B: { hip: [114, 70], t: 16, an: [92, 126], kb: 1, ft: 60, hand: [126, 48], eb: 1 },
  props: [{ k: "line", a: [112, 50], b: [150, 50], w: 5 }, { k: "line", a: [146, 50], b: [146, G], w: 4 }],
};
// legs on machines
T.legext = (o = {}) => {
  // thigh held flat on the seat; the lower leg swings around the knee. Foot stays at right angles to the shin.
  const seat = { hip: [100, 98], t: -12, ta: 2, hand: [106, 106], eb: 1 };
  const shin = sa => ({ ...seat, sa, ft: sa - 90 });
  const A = o.curl ? shin(6) : shin(94), B = o.curl ? shin(116) : shin(4);
  const props = [...SEAT(102, 102), { k: "line", a: [86, 100], b: [74, 46], w: 5 }, { k: "spad", side: o.curl ? 1 : -1, front: true }];
  if (o.curl) props.push({ k: "pad", at: "knee", dx: -6, dy: -10, r: 6, front: true });     // thigh pad holds you down
  return { A, B, props };
};
T.lyingcurl = (o = {}) => {
  // face down on the machine, hips on the pad and knees just past its end. Thighs stay down; the shins swing up around the
  // knees toward the glutes, pushing the ankle pad. The pad is on a cable to the weight stack.
  const base = { hip: [112, 94], t: -90, ta: 0, hand: [58, 108], eb: -1, hd: 0 };
  const A = { ...base, sa: 0, ft: 90 }, B = { ...base, sa: -100, ft: -10 };
  const props = [{ k: "rect", x: 50, y: 98, w: 98, h: 8 }, { k: "rect", x: 62, y: 106, w: 6, h: 32, rx: 1 }, { k: "rect", x: 132, y: 106, w: 6, h: 32, rx: 1 },
    { k: "rect", x: 52, y: 106, w: 10, h: 4, rx: 2 }];                                       // handles under the front of the pad
  if (o.db) props.push({ k: "db", at: "ankle", v: 1, dx: -2, front: true });                // a dumbbell held between the feet
  else props.push({ k: "rect", x: 198, y: 20, w: 16, h: 118, rx: 2 }, { k: "cable", from: [206, 24], to: "ankle" }, { k: "spad", side: -1, front: true });
  return { A, B, props, cap: o.db ? "Lying on a bench with a dumbbell between your feet. Keep your hips down as you curl your heels toward your glutes."
                                  : "Lying leg curl machine: hips stay on the pad, curl your heels toward your glutes, then lower slowly." };
};
T.standcurl = () => ({ A: { ...STAND, an2: [116, G], hand: [150, 40], eb: -1 }, B: { ...STAND, an2: [94, 102], kb2: 1, hand: [150, 40], eb: -1 }, props: [{ k: "band", from: [180, 136], to: "ankle2" }, { k: "line", a: [158, -20], b: [158, G], w: 4 }] });
T.sliders = () => ({
  A: { hip: [110, 120], t: -105, an: [178, 134], kb: -1, ft: -60, hand: [112, 136] },
  B: { hip: [112, 108], t: -117, an: [146, 134], kb: -1, ft: -60, hand: [112, 136] },
  props: [{ k: "rect", x: 140, y: 134, w: 60, h: 4, rx: 2 }],
});
T.calf = (o = {}) => ({
  A: { ...STAND, an: [122, G], ft: 0, hr: [2, 50] },
  B: { ...STAND, hip: [121, 58.4], an: [122, 128], ft: 54, hr: [2, 50] },
  props: [...(o.eq === "db" ? [{ k: "db", at: "hand", v: 0, front: true }] : []), ...(o.machine ? [{ k: "plate", at: "shb" }] : [])],
});
T.calfmachine = () => ({
  // standing calf raise machine: pads on top of the shoulders, balls of the feet on the step. Heels drop below the step,
  // then you rise as high as you can onto your toes; the pads ride up with you.
  A: { hip: [123, 62], t: 2, an: [124, 131], ft: -26, er: [8, 19], hr: [10, -3] },
  B: { hip: [126, 49], t: 2, an: [127, 117.6], ft: 50, er: [8, 19], hr: [10, -3] },
  props: [{ k: "rect", x: 88, y: -40, w: 8, h: 178, rx: 2 }, { k: "rect", x: 78, y: 132, w: 82, h: 6, rx: 2 },   // frame and base
    { k: "rect", x: 128, y: 126, w: 30, h: 8, rx: 2 },                                                           // step block
    { k: "seg", a: [92, -2], b: "shb", w: 6 }, { k: "pad", at: "shb", dy: -3, r: 6 }],                            // lever arm and shoulder pad
  cap: "Let your heels sink below the step, then rise as high as you can onto your toes.",
});
T.kickback = (o = {}) => ({
  A: { hip: [116, 72], t: 28, an: [122, G], an2: [118, 134], ft2: 40, hand: [168, 60], eb: -1 },
  B: { hip: [116, 72], t: 34, an: [122, G], an2: [56, 50], ft2: 120, hand: [168, 60], eb: -1 },
  props: [o.band ? { k: "band", from: [116, 140], to: "ankle2" } : { k: "cable", from: [24, 128], to: "ankle2" }, { k: "line", a: [176, 40], b: [176, G], w: 4 }],
});
T.backext = () => ({
  A: { hip: [116, 82], t: 150, an: [58, 128], ft: 0, hr: [-8, 10], eb: 1, hd: 20 },
  B: { hip: [116, 82], t: 50, an: [58, 128], ft: 0, hr: [-8, 10], eb: 1 },
  props: [{ k: "poly", pts: [[110, 88], [122, 88], [80, 132], [68, 132]] }, { k: "rect", x: 52, y: 130, w: 20, h: 8 }],
});
T.sidelying = () => ({
  A: { hip: [124, 128], t: -90, an: [192, 132], an2: [192, 130], kb: 1, kb2: 1, ft: -90, hand: [88, 112], eb: 1 },
  B: { hip: [124, 128], t: -90, an: [192, 132], an2: [184, 98], kb: 1, kb2: 1, ft: -90, ft2: -60, hand: [88, 112], eb: 1 },
});
// cardio, conditioning
T.march = (o = {}) => ({
  A: { ...STAND, an2: [146, 96], kb2: -1, ft2: 20, hr: [-18, 44], hr2: [24, 30], eb: -1, eb2: -1 },
  B: { ...STAND, an: [146, 96], ft: 20, an2: [122, G], hr: [24, 30], hr2: [-18, 44], eb: -1, eb2: -1 },
});
T.box = () => ({ A: { ...STAND, an: [132, G], an2: [106, G], hr: [16, 8], hr2: [14, 4], eb: 1, eb2: 1 }, B: { ...STAND, an: [132, G], an2: [106, G], hr: [52, 2], hr2: [14, 4], eb: 1, eb2: 1 } });
T.rower = (o = {}) => ({
  A: { hip: [100, 120], t: 26, an: [158, 116], kb: 1, ft: -80, hand: [162, 100], eb: 1 },
  B: { hip: [66, 120], t: -20, an: [158, 116], kb: 1, ft: -80, hand: [100, 94], eb: 1 },
  props: [{ k: "line", a: [20, 126], b: [180, 126], w: 4 }, { k: "rect", x: 160, y: 96, w: 24, h: 30 }, { k: "cable", from: [172, 104], to: "hand" }],
});
T.bike = () => ({
  A: { hip: [100, 66], t: 34, an: [124, 128], an2: [110, 100], kb: -1, hand: [158, 50], eb: -1 },
  B: { hip: [100, 66], t: 34, an: [110, 100], an2: [124, 128], kb: -1, hand: [158, 50], eb: -1 },
  props: [{ k: "rect", x: 88, y: 66, w: 20, h: 6 }, { k: "line", a: [98, 72], b: [118, 112], w: 5 }, { k: "line", a: [118, 112], b: [160, 54], w: 5 }, { k: "rect", x: 96, y: 128, w: 48, h: 10 }],
});
T.burpee = () => ({ A: { ...STAND, hr: [4, -50], eb: -1 }, B: { hip: [110, 106], t: 64, an: [50, 136], ft: 70, kb: 1, hand: [150, G], eb: -1 } });
T.walk = () => ({ A: { ...STAND, an: [140, G], an2: [104, G], hr: [-10, 48], hr2: [12, 48] }, B: { ...STAND, an: [104, G], an2: [140, G], hr: [12, 48], hr2: [-10, 48] } });
T.bridgebreath = () => ({ A: { hip: [86, 131], t: -90, an: [126, G], kb: -1, hand: [88, 136] }, B: { hip: [84, 118], t: -106, an: [126, G], kb: -1, hand: [86, 136] } });

// front-view templates
const FV = (A, B, props) => ({ view: "front", A, B, props });
T.latraise = (o = {}) => o.cable
  ? FV({ aR: -14 }, { aR: 86 }, [{ k: "cable", from: [84, 134], to: "hdR" }, { k: "pad", at: "hdR", r: 3, front: true }])
  : FV({ aL: 9, aR: 9 }, { aL: 86, aR: 86 }, o.band ? [{ k: "band", from: [112, 140], to: "hdL" }, { k: "band", from: [128, 140], to: "hdR" }] : [{ k: "db", at: "hdL", sq: 1, front: true }, { k: "db", at: "hdR", sq: 1, front: true }]);
T.fly = (o = {}) => FV({ plane: "h", aL: 84, aR: 84, ay: -2 }, { plane: "h", aL: 20, aR: 20, ay: 10 },
  o.band ? [{ k: "band", from: [30, 24], to: "hdL" }, { k: "band", from: [210, 24], to: "hdR" }] : [{ k: "cable", from: [28, -10], to: "hdL" }, { k: "cable", from: [212, -10], to: "hdR" }]);
T.pullapart = () => FV({ plane: "h", aL: 12, aR: 12, ay: 6 }, { plane: "h", aL: 86, aR: 86, ay: 6 }, [{ k: "seg", a: "hdL", b: "hdR", w: 2.5 }]);
T.uprow = () => FV({ hl: [112, 76], hr: [128, 76], ebl: 1, ebr: -1 }, { hl: [112, 32], hr: [128, 32], ebl: 1, ebr: -1 }, [{ k: "db", at: "hdL", v: 1, front: true }, { k: "db", at: "hdR", v: 1, front: true }]);
T.latwalk = () => FV({ al: [104, G], ar: [128, G], cx: 116 }, { al: [92, G], ar: [148, G], cx: 122 }, [{ k: "seg", a: "knL", b: "knR", w: 2.2 }]);
T.abduction = () => {
  // seated in the machine, seen from the front: thighs point toward you, pads on the outside of the knees.
  // Push the knees apart against the pads, then let them come back together slowly.
  const seat = { hip: 98, hl: [96, 92], hr: [144, 92], ebl: 1, ebr: -1 };
  return { view: "front",
    A: { ...seat, kL: [113, 106], kR: [127, 106], al: [113, G - 2], ar: [127, G - 2] },
    B: { ...seat, kL: [90, 104], kR: [150, 104], al: [94, G - 2], ar: [146, G - 2] },
    props: [{ k: "rect", x: 100, y: 34, w: 40, h: 66, rx: 4 }, { k: "rect", x: 92, y: 96, w: 56, h: 8, rx: 3 }, { k: "rect", x: 116, y: 104, w: 8, h: 34, rx: 1 },
      { k: "rect", x: 88, y: 88, w: 8, h: 8, rx: 2 }, { k: "rect", x: 144, y: 88, w: 8, h: 8, rx: 2 },
      { k: "pad", at: "knL", dx: -8, r: 6, front: true }, { k: "pad", at: "knR", dx: 8, r: 6, front: true }],
    cap: "Seated, seen from the front. Push your knees out against the pads, then let them come back together slowly." };
};
T.jacks = () => FV({ al: [112, G], ar: [128, G], aL: 8, aR: 8 }, { al: [88, G], ar: [152, G], aL: 160, aR: 160 });
T.clam = () => ({ view: "front", A: { hip: 69, rot: -90, piv: [100, 128], al: [78, 96], ar: [82, 96], kbl: 1, kbr: 1, hl: [130, 30], hr: [130, 30] }, B: { hip: 69, rot: -90, piv: [100, 128], al: [78, 96], ar: [92, 70], kbl: 1, kbr: -1, hl: [130, 30], hr: [130, 30] } });

/* ---------- which template each exercise uses ---------- */
const MAP = [
  [/^Pelvic Floor Warm-Up|Kegel|Connection Breath/, null],
  [/^Daily Walk$/, () => T.walk()],
  [/Bridge with Exhale/, () => T.bridgebreath()],
  [/Heel Slides/, () => T.heelslide()],
  [/Clamshell/, () => null],
  [/Leg Press/, () => T.legpress()],
  [/Hack Squat/, () => T.squat({ arms: "back", hack: 1 })],
  [/Wall Sit/, () => T.squat({ wall: 1 })],
  [/Jump Squat/, () => T.squat({ jump: 1 })],
  [/Heel-Elevated Goblet/, () => T.squat({ arms: "goblet", heel: 1 })],
  [/Goblet Squat|Dumbbell Front Squat/, () => T.squat({ arms: "goblet" })],
  [/Barbell Back Squat/, () => T.squat({ arms: "back" })],
  [/Barbell Front Squat/, () => T.squat({ arms: "front" })],
  [/Banded Squat/, () => T.squat({ arms: "band" })],
  [/Thruster|Wall Ball/, n => T.thruster({ ball: /Wall Ball/.test(n) })],
  [/Bodyweight Squat|Air Squat/, () => T.squat({})],
  [/Kettlebell Swing/, () => T.swing()],
  [/Med Ball Slam/, () => T.slam()],
  [/Good Morning/, () => T.hinge({ gm: 1 })],
  [/Single-Leg Dumbbell RDL/, () => T.hinge({ sl: 1, eq: "db" })],
  [/Cable Pull Through/, () => T.hinge({ cable: 1 })],
  [/Barbell Deadlift/, () => T.hinge({ dl: 1, eq: "bb" })],
  [/Romanian Deadlift/, n => T.hinge({ eq: /Barbell/.test(n) ? "bb" : "db" })],
  [/Back Extension/, () => T.backext()],
  [/Single-Leg Hip Thrust/, () => T.thrust({ sl: 1 })],
  [/Hip Thrust/, n => T.thrust({ eq: /Barbell/.test(n) ? "bb" : "db" })],
  [/Glute Bridge/, () => T.thrust({ floor: 1 })],
  [/Slider Hamstring Curl/, () => T.sliders()],
  [/Bulgarian Split Squat/, () => T.lunge({ bulg: 1, eq: "db" })],
  [/Step-Up/, n => T.stepup({ eq: /Dumbbell/.test(n) ? "db" : "" })],
  [/Walking Lunge/, () => T.walklunge()],
  [/Lunge|Split Squat/, n => T.lunge({ eq: /Dumbbell/.test(n) ? "db" : "" })],
  [/Leg Extension/, () => T.legext()],
  [/Seated Leg Curl/, () => T.legext({ curl: 1 })],
  [/Leg Curl \(on bench\)/, () => T.lyingcurl({ db: 1 })],
  [/Lying Leg Curl/, () => T.lyingcurl()],
  [/Standing Banded Leg Curl/, () => T.standcurl()],
  [/Side-Lying Leg Raise/, () => T.sidelying()],
  [/Lateral Walk/, () => T.latwalk()],
  [/Kickback/, n => T.kickback({ band: /Band/.test(n) })],
  [/Hip Abduction/, () => T.abduction()],
  [/Floor Press/, () => T.bench({ floor: 1, eq: "db" })],
  [/Incline (Barbell|Dumbbell) Press/, n => T.bench({ incline: 1, eq: /Barbell/.test(n) ? "bb" : "db" })],
  [/Decline Bench Press/, () => T.bench({ decline: 1, eq: "bb" })],
  [/(Barbell|Dumbbell) Bench Press/, n => T.bench({ eq: /Dumbbell/.test(n) ? "db" : "bb" })],
  [/Skull Crushers/, () => T.bench({ skull: 1, eq: "db" })],
  [/^Dumbbell Fly/, () => T.bench({ fly: 1, eq: "db" })],
  [/Incline Machine Press/, () => T.pressfwd({ seated: 1, incline: 1 })],
  [/Machine Chest Press/, () => T.pressfwd({ seated: 1 })],
  [/Banded Chest Press/, () => T.pressfwd({ band: 1 })],
  [/Med Ball Chest Pass/, () => T.pressfwd({ ball: 1 })],
  [/Pallof/, n => T.pallof({ cable: /Cable/.test(n) })],
  [/Isometric Palm Press/, () => T.pressfwd({})],
  [/Banded Chest Fly/, () => T.fly({ band: 1 })],
  [/Cable\/Machine Fly/, () => T.fly({})],
  [/Pike Push Up/, () => T.pushup({ pike: 1 })],
  [/Decline Push Up/, () => T.pushup({ decline: 1 })],
  [/Wall Push Up/, () => T.pushup({ wall: 1 })],
  [/Wall Triceps Extension/, () => T.pushup({ wall: 1 })],
  [/Incline Push Up/, () => T.pushup({ incline: 1 })],
  [/Mountain Climbers/, () => T.pushup({ climb: 1 })],
  [/Plank Shoulder Taps/, () => T.pushup({ taps: 1 })],
  [/Renegade Row/, () => T.pushup({ renegade: 1 })],
  [/Push Up/, () => T.pushup({})],
  [/Burpee/, () => T.burpee()],
  [/Side Plank/, () => T.plank({ side: 1 })],
  [/^Plank/, () => T.plank({})],
  [/Dead Bug/, () => T.deadbug()],
  [/Bird Dog/, () => T.birddog()],
  [/Sit-Up/, () => T.situp()],
  [/Hanging Knee Raise/, () => T.kneeraise()],
  [/Cable Crunch/, () => T.cablecrunch()],
  [/Suitcase Carry/, () => T.carry({})],
  [/Farmer Carry/, () => T.carry({ both: 1 })],
  [/Machine Calf Raise/, () => T.calfmachine()],
  [/Calf Raise/, n => T.calf({ eq: /Dumbbell/.test(n) ? "db" : "" })],
  [/Chest-Supported Dumbbell Row/, () => T.row({ eq: "db", chest: 1 })],
  [/One-Arm Dumbbell Row/, () => T.row({ eq: "db", one: 1 })],
  [/Bent-Over Dumbbell Row/, () => T.row({ eq: "db" })],
  [/Barbell Row/, () => T.row({ eq: "bb" })],
  [/Seated Cable Row|^Row \(machine\)|Banded Row/, n => /Row \(machine\)/.test(n) ? T.rower() : T.seatedrow({ band: /Band/.test(n) })],
  [/Doorframe Row/, () => T.doorrow()],
  [/Straight-Arm Pulldown/, () => T.straightarm()],
  [/Lat Pulldown/, n => T.pulldown({ band: /Band/.test(n) })],
  [/Pull Up|Chin Up/, n => T.pullup({ band: /Band-Assisted/.test(n) })],
  [/Face Pull/, () => T.facepull()],
  [/Band Pull-Apart/, () => T.pullapart()],
  [/Prone Y-T Raise/, () => T.revfly()],
  [/Reverse Fly/, () => T.revfly()],
  [/Upright Row/, () => T.uprow()],
  [/Lateral Raise/, n => T.latraise({ cable: /Cable/.test(n), band: /Band/.test(n) })],
  [/Front Raise/, () => T.frontraise({})],
  [/Push Press/, () => T.pushpress()],
  [/Snatch/, () => T.snatch()],
  [/Barbell Overhead Press/, () => T.ohp({ eq: "bb" })],
  [/Standing Dumbbell Press/, () => T.ohpFront()],
  [/Seated Dumbbell Shoulder Press/, () => T.ohp({ eq: "db", seated: 1 })],
  [/Machine Shoulder Press/, () => T.ohp({ seated: 1, machine: 1 })],
  [/Banded Overhead Press/, () => T.ohp({ eq: "band" })],
  [/Overhead Dumbbell Extension/, () => T.ohext({})],
  [/Pressdown/, n => T.pressdown({ band: /Band/.test(n) })],
  [/Bench Dip/, () => T.dips({ bench: 1 })],
  [/^Dips/, () => T.dips({})],
  [/Close-Grip Push Up/, () => T.pushup({})],
  [/Hammer Curl/, () => T.curl({ eq: "db", hammer: 1 })],
  [/Drag Curl/, () => T.curl({ eq: "bb", drag: 1 })],
  [/Barbell Curl/, () => T.curl({ eq: "bb" })],
  [/Cable Curl/, () => T.curl({ cable: 1 })],
  [/Banded Curl/, () => T.curl({ band: 1 })],
  [/Towel Isometric Curl/, () => T.curl({})],
  [/Incline Dumbbell Curl/, () => T.curl({ eq: "db", incline: 1 })],
  [/Curl/, () => T.curl({ eq: "db" })],
  [/High Knees/, () => T.march()],
  [/Shadow Boxing/, () => T.box()],
  [/Bike/, () => T.bike()],
  [/Rower Intervals/, () => T.rower()],
  [/Jumping Jacks/, () => T.jacks()],
];
const cache = {};
function demoFor(name) {
  if (name in cache) return cache[name];
  let d = null;
  for (const [re, fn] of MAP) if (re.test(name)) { d = fn ? fn(name) : null; break; }
  return (cache[name] = d);
}

/* ---------- render + animate ---------- */
const ease = k => 0.5 - 0.5 * Math.cos(Math.PI * k);
/* spell out every setting in a frame (hands and feet as positions) so start and finish blend smoothly */
function normSide(p, m) {
  m = m || {};
  const J = sideJoints(p);
  const ft = p.ft ?? 0, kb = p.kb ?? -1, eb = p.eb ?? 1;
  const o = { halo: p.halo, t: p.t || 0, hd: p.hd || 0, ft, ft2: p.ft2 ?? ft, kb, kb2: p.kb2 ?? kb, eb, eb2: p.eb2 ?? eb };
  if (m.pin) o.pin = p.pin; else o.hip = J.hip;
  if (m.aa) o.aa = p.aa; else if (m.er) { o.er = p.er; if (p.fa != null) o.fa = p.fa; else o.hr = p.hr; if (p.hand2) o.hand2 = p.hand2; } else if (m.hh) o.hh = p.hh; else { o.hand = J.hand; o.hand2 = J.hand2; }
  if (m.ta) { o.ta = p.ta; o.sa = p.sa; } else o.an = J.ankle;
  if (m.ar2) o.ar2 = p.ar2; else if (!m.ta || m.an2) o.an2 = J.ankle2;
  return o;
}
function normFront(p) {
  const o = { lean: p.lean || 0, cx: p.cx ?? 120, hip: p.hip ?? 69, ebl: p.ebl ?? -1, ebr: p.ebr ?? 1, kbl: p.kbl ?? 1, kbr: p.kbr ?? -1, ay: p.ay ?? 6, plane: p.plane, rot: p.rot || 0, piv: p.piv };
  const J = frontJoints(p);
  o.al = J.anL; o.ar = J.anR; o.fs = p.fs ?? 1; if (p.kL) { o.kL = p.kL; o.kR = p.kR; }
  if (p.hl) o.hl = p.hl; else o.aL = p.aL ?? 7;
  if (p.hr) o.hr = p.hr; else o.aR = p.aR ?? 7;
  return o;
}
function frames(d) {
  if (!d.nA) {
    const both = k => d.A[k] != null && d.B[k] != null;
    const m = { aa: both("aa"), er: both("er"), pin: both("pin"), hh: both("hh"), ta: both("ta"), ar2: both("ar2"), an2: both("an2") };
    const n = d.view === "front" ? normFront : q => normSide(q, m);
    d.nA = n(d.A); d.nB = n(d.B);
  }
  return [d.nA, d.nB];
}
function keyNorm(d) {
  if (!d.nK) {
    const all = q => d.keys.every(x => x[q] != null);
    const m = { er: all("er"), pin: all("pin"), hh: all("hh"), ta: all("ta"), ar2: all("ar2"), an2: all("an2"), aa: all("aa") };
    d.nK = d.keys.map(x => normSide(x, m));
  }
  return d.nK;
}
function mid3(d, k) {
  if (d.keys) { const K = keyNorm(d), n = K.length - 1, x = Math.min(n - 1e-6, Math.max(0, k * n)), i = Math.floor(x); return mix(K[i], K[i + 1], x - i); }
  const [A, B] = frames(d);
  if (!d.mid) return mix(A, B, k);
  if (!d.nM) { const both = q => d.A[q] != null && d.B[q] != null; d.nM = normSide(d.mid, { er: both("er"), pin: both("pin"), hh: both("hh"), ta: both("ta"), ar2: both("ar2"), an2: both("an2"), aa: both("aa") }); }
  return k < 0.5 ? mix(A, d.nM, k * 2) : mix(d.nM, B, k * 2 - 1);
}
function frameSVG(d, k) {
  if (d.custom) return d.custom(k);
  const p = mid3(d, k);
  if (d.view === "front") return drawFront(frontJoints(p), d.props);
  const J = sideJoints(p); J.k = k;
  return drawSide(J, d.props);
}
/* frame each movement tightly: bounds over the whole motion, padded to a 16:9 box */
function bounds(d) {
  if (d.box) return d.box;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = G + 3;
  const add = (x, y, r) => { r = r || 0; x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const k of d.keys ? [0, .125, .25, .375, .5, .625, .75, .875, 1] : [0, 0.25, 0.5, 0.75, 1]) {
    const p = mid3(d, k), J = d.view === "front" ? frontJoints(p) : sideJoints(p);
    for (const key in J) { const pt = J[key]; if (key === "shb" || key === "shf" || !Array.isArray(pt)) continue; add(pt[0], pt[1], key === "head" ? L.head + 1 : 5); }
    (d.props || []).forEach(pr => {
      if (pr.k === "rect") { add(pr.x, pr.y); add(pr.x + pr.w, pr.y + pr.h); }
      else if (pr.k === "poly") pr.pts.forEach(q => add(q[0], q[1]));
      else if (pr.k === "line") { add(pr.a[0], pr.a[1]); add(pr.b[0], pr.b[1]); }
      else if (pr.k === "cable" || pr.k === "band") { if (Array.isArray(pr.from)) add(pr.from[0], pr.from[1], 6); }
      else if (pr.at) { const c = at(J, pr.at, pr.dx, pr.dy); add(c[0], c[1], (pr.r || 11) + 1); }
    });
  }
  x0 -= 10; x1 += 10; y0 -= 10; y1 += 4;
  let w = x1 - x0, h = y1 - y0;
  const ratio = 16 / 9;
  if (w / h < ratio) { const nw = h * ratio; x0 -= (nw - w) / 2; w = nw; }
  else { const nh = w / ratio; y0 -= (nh - h); h = nh; }       // grow upward, keep the floor at the bottom
  return (d.box = [x0, y0, w, h].map(v => Math.round(v * 10) / 10));
}
function svg(name, k) {
  const d = demoFor(name); if (!d) return "";
  const [x, y, w, h] = bounds(d);
  return `<svg class="demo-svg" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${name.replace(/"/g, "")} demo"><line class="dp-floor" x1="${x}" y1="${G + 1}" x2="${x + w}" y2="${G + 1}"/><g class="dp-fig">${frameSVG(d, k == null ? 0 : k)}</g></svg>`;
}
const running = new Set();
let raf = 0;
function tick(now) {
  running.forEach(el => {
    if (!el.isConnected) { running.delete(el); return; }
    if (!el.offsetParent) return;                      // closed or off screen: skip the work
    const d = demoFor(el.dataset.demo); if (!d) return;
    const per = d.per || (d.hold ? 3000 : 2600), ph = (now % per) / per;
    const k = d.loop ? ph : d.hold ? 0.5 + 0.5 * Math.sin(ph * Math.PI * 2) : ease(ph < 0.5 ? ph * 2 : 2 - ph * 2);
    const g = el.querySelector(".dp-fig"); if (g) g.innerHTML = frameSVG(d, k);
  });
  raf = running.size ? requestAnimationFrame(tick) : 0;
}
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
/* fill every [data-demo] inside el that hasn't been filled yet */
function fill(el) {
  (el || document).querySelectorAll("[data-demo]").forEach(box => {
    if (box.dataset.filled === box.dataset.demo) { if (!reduced()) running.add(box); return; }
    const name = box.dataset.demo, d = demoFor(name);
    if (!d) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false; box.dataset.filled = name;
    box.innerHTML = (reduced()
      ? `<div class="demo-pair">${svg(name, 0)}${svg(name, 1)}</div><div class="demo-cap">Start and finish</div>`
      : svg(name, 0)) + (d.cap ? `<div class="demo-cap">${d.cap}</div>` : "");
    if (!reduced()) running.add(box);
  });
  if (running.size && !raf && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(tick);
}
root.AdonisDemos = { has: n => !!demoFor(n), svg, fill, demoFor };
})(typeof window !== "undefined" ? window : globalThis);
