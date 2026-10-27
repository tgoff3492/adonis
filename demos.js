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
  const hip = p.hip, sh = [hip[0] + L.torso * Math.sin(t), hip[1] - L.torso * Math.cos(t)];
  const ht = t + rad(p.hd || 0), hc = L.neck + L.head;
  const head = [sh[0] + hc * Math.sin(ht), sh[1] - hc * Math.cos(ht)];
  const handOf = (abs, rel) => abs || [sh[0] + rel[0], sh[1] + rel[1]];
  const ankOf = (abs, rel) => abs || [hip[0] + rel[0], hip[1] + rel[1]];
  const fwd = [Math.cos(t), Math.sin(t)], dn = [-Math.sin(t), Math.cos(t)];
  const viaT = v => [sh[0] + v[0] * fwd[0] + v[1] * dn[0], sh[1] + v[0] * fwd[1] + v[1] * dn[1]];
  const hand = p.ht ? viaT(p.ht) : handOf(p.hand, p.hr || [3, 50]);
  const hand2f = p.hand2 ? p.hand2 : p.ht2 ? viaT(p.ht2) : p.hr2 ? handOf(null, p.hr2) : hand;
  const an = ankOf(p.an, p.ar || [2, 69]), an2 = p.an2 || (p.ar2 ? ankOf(null, p.ar2) : an);
  const arm = (h, s) => ik(sh[0], sh[1], h[0], h[1], L.ua, L.fa, s);
  const leg = (a, s) => ik(hip[0], hip[1], a[0], a[1], L.th, L.sh, s);
  const A1 = arm(hand, p.eb ?? 1), A2 = arm(hand2f, p.eb2 ?? p.eb ?? 1);
  const L1 = leg(an, p.kb ?? -1), L2 = leg(an2, p.kb2 ?? p.kb ?? -1);
  const foot = (ank, f) => [ank[0] + L.foot * Math.cos(rad(f)), ank[1] + L.foot * Math.sin(rad(f))];
  return {
    hip, sh, head,
    elbow: [A1[0], A1[1]], hand: [A1[2], A1[3]], elbow2: [A2[0], A2[1]], hand2: [A2[2], A2[3]],
    knee: [L1[0], L1[1]], ankle: [L1[2], L1[3]], knee2: [L2[0], L2[1]], ankle2: [L2[2], L2[3]],
    toe: foot([L1[2], L1[3]], p.ft ?? 0), toe2: foot([L2[2], L2[3]], p.ft2 ?? p.ft ?? 0),
    shb: [sh[0] - 6 * Math.cos(t), sh[1] - 6 * Math.sin(t) - 2], shf: [sh[0] + 7 * Math.cos(t), sh[1] + 7 * Math.sin(t) - 2],
  };
}

/* ---------- front view: the person faces you ---------- */
function frontJoints(p) {
  const cx = p.cx ?? 120, hy = p.hip ?? 69, sw = 15, hw = 8;
  const shY = hy - L.torso;
  let J = {
    hipL: [cx - hw, hy], hipR: [cx + hw, hy], shL: [cx - sw, shY], shR: [cx + sw, shY], mid: [cx, hy], neck: [cx, shY],
    head: [cx, shY - L.neck - L.head],
  };
  const hl = p.hl || [cx - sw - 3, shY + 51.8], hr = p.hr || [cx + sw + 3, shY + 51.8];
  const al = p.al || [cx - hw - 2, hy + 69.8], ar = p.ar || [cx + hw + 2, hy + 69.8];
  const A1 = ik(J.shL[0], J.shL[1], hl[0], hl[1], L.ua, L.fa, p.ebl ?? -1), A2 = ik(J.shR[0], J.shR[1], hr[0], hr[1], L.ua, L.fa, p.ebr ?? 1);
  const L1 = ik(J.hipL[0], J.hipL[1], al[0], al[1], L.th, L.sh, p.kbl ?? 1), L2 = ik(J.hipR[0], J.hipR[1], ar[0], ar[1], L.th, L.sh, p.kbr ?? -1);
  Object.assign(J, { elL: [A1[0], A1[1]], hdL: [A1[2], A1[3]], elR: [A2[0], A2[1]], hdR: [A2[2], A2[3]],
    knL: [L1[0], L1[1]], anL: [L1[2], L1[3]], knR: [L2[0], L2[1]], anR: [L2[2], L2[3]] });
  J.toeL = [J.anL[0] - 7, J.anL[1] + 1]; J.toeR = [J.anR[0] + 7, J.anR[1] + 1];
  if (p.rot) {   // tip the whole body over (side plank, lying on your side)
    const a = rad(p.rot), [px, py] = p.piv || [cx, hy], c = Math.cos(a), s = Math.sin(a);
    for (const k in J) { const [x, y] = J[k]; J[k] = [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c]; }
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
    + poly([J.hip, J.knee, J.ankle, J.toe], 8, "dp-limb") + poly([J.sh, J.elbow, J.hand], 7, "dp-limb") + front;
}
function drawFront(J, props) {
  const back = (props || []).filter(p => !p.front).map(p => drawProp(p, J)).join("");
  const front = (props || []).filter(p => p.front).map(p => drawProp(p, J)).join("");
  return back
    + poly([J.hipL, J.knL, J.anL, J.toeL], 8, "dp-limb") + poly([J.hipR, J.knR, J.anR, J.toeR], 8, "dp-limb")
    + `<polygon class="dp-torso" points="${[J.shL, J.shR, J.hipR, J.hipL].map(p => `${f1(p[0])},${f1(p[1])}`).join(" ")}"/>`
    + `<circle class="dp-head" cx="${f1(J.head[0])}" cy="${f1(J.head[1])}" r="${L.head}"/>`
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
  if (o.heel) props.push({ k: "poly", pts: [[112, G], [138, G], [112, G - 7]] });
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
  const A = { hip: [86, 128], t: -48, an: [124, G], kb: -1, hand: [92, 116], ft: 0 }, B = { hip: [96, 95], t: -92, an: [124, G], kb: -1, hand: [96, 88] };
  if (o.sl) { A.an2 = null; A.ar2 = [52, -40]; B.ar2 = [64, -14]; A.kb2 = B.kb2 = 1; }
  const props = [{ k: "rect", x: 20, y: 98, w: 38, h: 40 }];
  if (o.eq === "bb") props.push({ k: "plate", at: "hip", dy: -11, front: true });
  if (o.eq === "db") props.push({ k: "db", at: "hip", dy: -7, front: true });
  return { A, B, props };
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
  let A = { hip: [128, 94], t: -90, an: [164, G], kb: 1, hand: [84, 42], eb: 1, hd: 0 }, B = { ...A, hand: [87, 80] };
  let props = [...LIE_BENCH];
  if (o.incline) { A = { hip: [126, 98], t: -58, an: [164, G], kb: 1, hand: [94, 22], eb: 1 }; B = { ...A, hand: [94, 60] };
    props = [{ k: "poly", pts: [[136, 100], [136, 108], [70, 66], [76, 58]] }, { k: "rect", x: 100, y: 104, w: 6, h: 34, rx: 1 }]; }
  if (o.floor) { A = { hip: [128, 129], t: -90, an: [160, G], kb: -1, hand: [84, 78], eb: 1 }; B = { ...A, hand: [88, 112] }; props = []; }
  if (o.fly) { B = { ...A, hand: [70, 96], eb: 1 }; }
  if (o.skull) { A = { ...A, hand: [84, 42], eb: -1 }; B = { ...A, hand: [66, 74], eb: -1 }; }
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
  B: { hip: [118, 64], t: -6, an: [152, 98], kb: 1, ft: 30, hand: [120, -36], eb: 1 },
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
  const A = { hip: [96, 80], t: 68, an: [122, G], hr: [2, 50], eb: 1 }, B = { ...A, hand: null, hr: [-26, 24], eb: 1 };
  const props = loadProps(o.eq, "hand", o.eq === "db" && !o.one ? "hand2" : null);
  if (o.one) { A.t = B.t = 82; A.hip = B.hip = [94, 84]; A.hand2 = B.hand2 = [160, 100]; A.eb2 = B.eb2 = -1; props.unshift({ k: "rect", x: 146, y: 102, w: 48, h: 36 }); }
  if (o.chest) { A.t = B.t = 50; props.unshift({ k: "poly", pts: [[110, 120], [116, 124], [150, 66], [144, 62]] }, { k: "rect", x: 112, y: 120, w: 6, h: 18, rx: 1 }); }
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
  A: { hip: [120, 62], t: 0, an: [104, 126], ft: 60, kb: 1, hand: [124, -38], eb: -1 },
  B: { hip: [120, 26], t: 6, an: [104, 90], ft: 60, kb: 1, hand: [124, -38], eb: 1 },
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
  A: { hip: [96, 80], t: 72, an: [122, G], hr: [2, 50], eb: 1 },
  B: { hip: [96, 80], t: 72, an: [122, G], hr: [-12, 16], eb: 1 },
  props: [{ k: "db", at: "hand", v: 1, front: true }],
});
// overhead / shoulders / arms (standing or seated)
const BASE = o => o.seated ? { hip: [110, 104], t: 0, an: [150, G] } : { ...STAND };
const seatProps = o => o.seated ? [...SEAT(110, 106), { k: "line", a: [96, 104], b: [96, 40], w: 5 }] : [];
T.ohp = (o = {}) => ({
  A: { ...BASE(o), hr: [12, -2], eb: 1 }, B: { ...BASE(o), hr: [3, -51], eb: 1 },
  props: [...seatProps(o), ...(o.eq === "bb" ? [{ k: "plate", at: "hand", front: true }] : o.eq === "db" ? [{ k: "db", at: "hand", v: 1, front: true }] : o.eq === "band" ? [{ k: "band", from: [122, 140], to: "hand" }] : o.machine ? [{ k: "bar", at: "hand", w: 6 }] : [])],
});
T.thruster = (o = {}) => ({
  A: { hip: [99, 103], t: 38, an: [122, G], ht: [4, -8], eb: 1 },
  B: { ...STAND, ht: [3, -51], eb: -1 },
  props: o.ball ? [{ k: "ball", at: "hand", r: 10, front: true }] : [{ k: "db", at: "hand", v: 1, front: true }],
});
T.pushpress = () => ({ A: { hip: [116, 78], t: 8, an: [122, G], hr: [12, -2], eb: 1 }, B: { ...STAND, hr: [3, -51], eb: 1 }, props: [{ k: "db", at: "hand", v: 1, front: true }] });
T.snatch = () => ({ A: { hip: [96, 92], t: 60, an: [122, G], hr: [2, 52] }, B: { ...STAND, hr: [3, -51], eb: 1 }, props: [{ k: "db", at: "hand", v: 1, front: true }] });
T.frontraise = (o = {}) => ({ A: { ...BASE(o), hr: [6, 50] }, B: { ...BASE(o), hr: [51, -4] }, props: [{ k: "db", at: "hand", v: 0, front: true }] });
T.curl = (o = {}) => ({
  A: { ...BASE(o), hr: [3, 50], eb: 1 }, B: { ...BASE(o), hr: o.drag ? [-2, 10] : [16, 8], eb: 1 },
  props: [...seatProps(o), ...(o.eq === "bb" ? [{ k: "bar", at: "hand", w: 6 }, { k: "plate", at: "hand", r: 9, front: true }] : o.eq === "db" ? [{ k: "db", at: "hand", v: !!o.hammer, front: true }]
    : o.cable ? [{ k: "cable", from: [176, 134], to: "hand" }] : o.band ? [{ k: "band", from: [124, 140], to: "hand" }] : [])],
});
T.pressdown = (o = {}) => ({
  A: { ...STAND, t: 8, hr: [14, 22], eb: 1 }, B: { ...STAND, t: 8, hr: [8, 50], eb: 1 },
  props: [o.band ? { k: "band", from: [150, -40], to: "hand" } : { k: "cable", from: [148, -40], to: "hand" }],
});
T.ohext = (o = {}) => ({
  A: { ...BASE(o), hr: [-12, -18], eb: -1 }, B: { ...BASE(o), hr: [3, -51], eb: -1 },
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
  const A = { hip: [100, 98], t: -10, an: [132, 134], kb: -1, ft: 0, hand: [104, 104] }, B = { ...A, an: [166, 92], ft: -50 };
  return { ...(o.curl ? { A: B, B: A } : { A, B }), props: [...SEAT(102, 102), { k: "line", a: [86, 100], b: [76, 50], w: 5 }, { k: "pad", at: "ankle", r: 6, dy: o.curl ? -5 : 5, front: true }] };
};
T.lyingcurl = () => ({
  A: { hip: [112, 94], t: -90, an: [180, 92], kb: 1, ft: 90, hand: [60, 98], eb: -1, hd: 0 },
  B: { hip: [112, 94], t: -90, an: [132, 52], kb: 1, ft: 0, hand: [60, 98], eb: -1 },
  props: [{ k: "rect", x: 52, y: 98, w: 104, h: 8 }, { k: "rect", x: 64, y: 106, w: 6, h: 32, rx: 1 }, { k: "rect", x: 138, y: 106, w: 6, h: 32, rx: 1 }, { k: "pad", at: "ankle", r: 6, dy: -5, front: true }],
});
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
  ? FV({ hr: [137, 104], ebr: 1 }, { hr: [180, 22], ebr: 1 }, [{ k: "cable", from: [88, 134], to: "hdR" }, { k: "pad", at: "hdR", r: 3, front: true }])
  : FV({ hl: [102, 74], hr: [138, 74] }, { hl: [54, 28], hr: [186, 28] }, o.band ? [{ k: "band", from: [114, 140], to: "hdL" }, { k: "band", from: [126, 140], to: "hdR" }] : [{ k: "db", at: "hdL", v: 0, front: true }, { k: "db", at: "hdR", v: 0, front: true }]);
T.fly = (o = {}) => FV({ hl: [70, 12], hr: [170, 12], ebl: 1, ebr: -1 }, { hl: [114, 46], hr: [126, 46], ebl: 1, ebr: -1 },
  o.band ? [{ k: "band", from: [36, 26], to: "hdL" }, { k: "band", from: [204, 26], to: "hdR" }] : [{ k: "cable", from: [34, -10], to: "hdL" }, { k: "cable", from: [206, -10], to: "hdR" }]);
T.pullapart = () => FV({ hl: [112, 30], hr: [128, 30], ebl: 1, ebr: -1 }, { hl: [54, 30], hr: [186, 30], ebl: 1, ebr: -1 }, [{ k: "seg", a: "hdL", b: "hdR", w: 2.5 }]);
T.uprow = () => FV({ hl: [114, 72], hr: [126, 72], ebl: -1, ebr: 1 }, { hl: [114, 28], hr: [126, 28], ebl: 1, ebr: -1 }, [{ k: "db", at: "hdL", v: 1, front: true }, { k: "db", at: "hdR", v: 1, front: true }]);
T.latwalk = () => FV({ al: [104, G], ar: [128, G] }, { al: [92, G], ar: [148, G], cx: 122 }, [{ k: "seg", a: "knL", b: "knR", w: 2.2 }]);
T.abduction = () => FV({ hl: [92, 40], ebl: 1 }, { hl: [92, 40], ebl: 1, ar: [166, 122], kbr: -1 }, [{ k: "line", a: [80, -10], b: [80, G], w: 4 }, { k: "cable", from: [200, 134], to: "anR" }]);
T.jacks = () => FV({ al: [112, G], ar: [128, G], hl: [104, 72], hr: [136, 72] }, { al: [88, G], ar: [152, G], hl: [86, -22], hr: [154, -22], ebl: 1, ebr: -1 });
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
  [/Lunge|Split Squat/, n => T.lunge({ eq: /Dumbbell/.test(n) ? "db" : "" })],
  [/Leg Extension/, () => T.legext()],
  [/Seated Leg Curl/, () => T.legext({ curl: 1 })],
  [/Lying Leg Curl|Leg Curl \(on bench\)/, () => T.lyingcurl()],
  [/Standing Banded Leg Curl/, () => T.standcurl()],
  [/Side-Lying Leg Raise/, () => T.sidelying()],
  [/Lateral Walk/, () => T.latwalk()],
  [/Kickback/, n => T.kickback({ band: /Band/.test(n) })],
  [/Hip Abduction/, () => T.abduction()],
  [/Floor Press/, () => T.bench({ floor: 1, eq: "db" })],
  [/Incline (Barbell|Dumbbell) Press/, n => T.bench({ incline: 1, eq: /Barbell/.test(n) ? "bb" : "db" })],
  [/(Barbell|Dumbbell|Decline) Bench Press/, n => T.bench({ eq: /Dumbbell/.test(n) ? "db" : "bb" })],
  [/Skull Crushers/, () => T.bench({ skull: 1, eq: "db" })],
  [/^Dumbbell Fly/, () => T.bench({ fly: 1, eq: "db" })],
  [/Incline Machine Press/, () => T.pressfwd({ seated: 1, incline: 1 })],
  [/Machine Chest Press/, () => T.pressfwd({ seated: 1 })],
  [/Banded Chest Press/, () => T.pressfwd({ band: 1 })],
  [/Med Ball Chest Pass/, () => T.pressfwd({ ball: 1 })],
  [/Pallof/, n => T.pressfwd({ cable: /Cable/.test(n), band: /Band/.test(n) })],
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
  [/Calf Raise/, n => T.calf({ eq: /Dumbbell/.test(n) ? "db" : "", machine: /Machine/.test(n) })],
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
  [/Standing Dumbbell Press/, () => T.ohp({ eq: "db" })],
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
  [/Incline Dumbbell Curl/, () => T.curl({ eq: "db", seated: 1 })],
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
function frameSVG(d, k) {
  const p = mix(d.A, d.B, k);
  return d.view === "front" ? drawFront(frontJoints(p), d.props) : drawSide(sideJoints(p), d.props);
}
/* frame each movement tightly: bounds over the whole motion, padded to a 16:9 box */
function bounds(d) {
  if (d.box) return d.box;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = G + 3;
  const add = (x, y, r) => { r = r || 0; x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); };
  for (const k of [0, 0.25, 0.5, 0.75, 1]) {
    const p = mix(d.A, d.B, k), J = d.view === "front" ? frontJoints(p) : sideJoints(p);
    for (const key in J) { const pt = J[key]; if (key === "shb" || key === "shf") continue; add(pt[0], pt[1], key === "head" ? L.head + 1 : 5); }
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
    const per = d.hold ? 3000 : 2600, ph = (now % per) / per;
    const k = d.hold ? 0.5 + 0.5 * Math.sin(ph * Math.PI * 2) : ease(ph < 0.5 ? ph * 2 : 2 - ph * 2);
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
    box.innerHTML = reduced()
      ? `<div class="demo-pair">${svg(name, 0)}${svg(name, 1)}</div><div class="demo-cap">Start and finish</div>`
      : svg(name, 0);
    if (!reduced()) running.add(box);
  });
  if (running.size && !raf && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(tick);
}
root.AdonisDemos = { has: n => !!demoFor(n), svg, fill, demoFor };
})(typeof window !== "undefined" ? window : globalThis);
