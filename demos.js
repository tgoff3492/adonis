/* Adonis exercise demos: a filmed clip when videos.js lists one, otherwise a simple drawn figure that plays each movement.
   Original artwork made in code (no photos, nothing licensed). One figure system, ~40 movement templates,
   every exercise in the library maps to one. Shared by index.html; Node can load it for checks. */
(function (root) {
"use strict";

const L = { torso: 46, neck: 4, head: 9, ua: 27, fa: 25, th: 36, sh: 34, foot: 11 };
const G = 138;                     // floor line
const rad = d => d * Math.PI / 180;

/* two-bone IK: joint between a and b. s = which side the joint bends to (1 or -1) */
function ik(ax, ay, bx, by, l1, l2, s) {
  s = s < 0 ? -1 : 1;                 // a bend direction blended between frames must never collapse to 0 (a locked, overshooting limb)
  const d = Math.hypot(bx - ax, by - ay);
  if (d > l1 + l2 + 0.5 && root.__adonisReach) root.__adonisReach(d - l1 - l2);   // dev check: a target the limb can't reach
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

/* 3D two-bone IK, shoulder at the origin. h = hand [x, y, z] (z toward the viewer), pole = which way the elbow points.
   Returns the elbow and hand; the side view simply drops z, so an elbow that flares out to the side looks shorter, like it does in real life. */
function ik3(h, l1, l2, pole) {
  const d = Math.hypot(h[0], h[1], h[2]) || 1, dm = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.2, d));
  const u = h.map(v => v / d), a = (l1 * l1 - l2 * l2 + dm * dm) / (2 * dm), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const pd = pole[0] * u[0] + pole[1] * u[1] + pole[2] * u[2], pp = pole.map((v, i) => v - pd * u[i]), pl = Math.hypot(...pp) || 1;
  return { e: u.map((v, i) => v * a + pp[i] / pl * hh), h: u.map(v => v * dm) };
}

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
  // cr: pedal crank angle. The feet ride a circle around crank = [x, y, radius], on opposite sides of it
  const ck = p.cr != null && p.crank ? [0, 180].map(o => [p.crank[0] + p.crank[2] * Math.cos(rad(p.cr + o)), p.crank[1] + p.crank[2] * Math.sin(rad(p.cr + o))]) : null;
  const an = byAng ? byAng[1] : ck ? ck[0] : ankOf(p.an, p.ar || [2, 69]), an2 = ck ? ck[1] : p.an2 || (p.ar2 ? ankOf(null, p.ar2) : an);
  const arm = (h, s) => ik(sh[0], sh[1], h[0], h[1], L.ua, L.fa, s);
  const leg = (a, s) => ik(hip[0], hip[1], a[0], a[1], L.th, L.sh, s);
  // limbs driven by angles (0 = pointing right, 90 = straight down). Blending angles swings a limb in an arc, at full
  // length, instead of dragging the hand or foot along a straight line (which bends the elbow or knee mid-rep).
  const byAngs = (o, a1, a2, l1, l2) => { const e = [o[0] + l1 * Math.cos(rad(a1)), o[1] + l1 * Math.sin(rad(a1))]; return [e[0], e[1], e[0] + l2 * Math.cos(rad(a2)), e[1] + l2 * Math.sin(rad(a2))]; };
  // aa: arm with a soft elbow; ua + fa: upper arm and forearm angles; er: elbow placed directly (relative to the shoulder),
  // for arms that partly point out to the side, like a bench press; fa then swings the forearm around that elbow
  const aaArm = p.aa != null ? byAngs(sh, p.aa, p.aa - 8, L.ua, L.fa) : p.ua != null ? byAngs(sh, p.ua, p.fa ?? p.ua, L.ua, L.fa) : null;
  const elb = p.er ? [sh[0] + p.er[0], sh[1] + p.er[1]] : null;
  // h3: hand in 3D. h3n (optional) is the hand's distance from the shoulder, blended separately so the hand travels in an arc
  const h3 = p.h3 && typeof p.h3n === "number" ? (() => { const l = Math.hypot(...p.h3) || 1; return p.h3.map(v => v / l * p.h3n); })() : p.h3;
  const a3 = h3 ? ik3(h3, L.ua, L.fa, p.pole || [0, 1, 1]) : null;
  const A1 = a3 ? [sh[0] + a3.e[0], sh[1] + a3.e[1], sh[0] + a3.h[0], sh[1] + a3.h[1]] : aaArm ? aaArm : p.er ? [elb[0], elb[1], ...(p.fa != null ? [elb[0] + L.fa * Math.cos(rad(p.fa)), elb[1] + L.fa * Math.sin(rad(p.fa))] : [sh[0] + p.hr[0], sh[1] + p.hr[1]])]
                  : arm(hand, p.eb ?? 1);
  const A2 = p.ua2 != null ? byAngs(sh, p.ua2, p.fa2 ?? p.ua2, L.ua, L.fa)
           : (p.er || aaArm || a3) && !p.hand2 && !p.ht2 && !p.hr2 ? A1 : arm(hand2f, p.eb2 ?? p.eb ?? 1);
  const L1 = byAng ? [byAng[0][0], byAng[0][1], an[0], an[1]] : leg(an, p.kb ?? -1);
  // ta2 + sa2: the far leg by angles, like ta + sa
  const L2 = p.ta2 != null ? byAngs(hip, p.ta2, p.sa2 ?? p.ta2, L.th, L.sh) : byAng && an2 === an ? L1 : leg(an2, p.kb2 ?? p.kb ?? -1);
  const foot = (ank, f) => [ank[0] + L.foot * Math.cos(rad(f)), ank[1] + L.foot * Math.sin(rad(f))];
  return {
    hip, sh, head,
    elbow: [A1[0], A1[1]], hand: [A1[2], A1[3]], elbow2: [A2[0], A2[1]], hand2: [A2[2], A2[3]],
    knee: [L1[0], L1[1]], ankle: [L1[2], L1[3]], knee2: [L2[0], L2[1]], ankle2: [L2[2], L2[3]],
    halo: !!p.halo, cc: p.crank ? [p.crank[0], p.crank[1]] : null, toe: foot([L1[2], L1[3]], p.ft ?? 0), toe2: foot([L2[2], L2[3]], p.ft2 ?? p.ft ?? 0),
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
    // uL/uR + fL/fR: upper-arm and forearm angles (0 = hanging, 90 = straight out, 180 = overhead), for presses
    const U = side < 0 ? p.uL : p.uR, Fo = side < 0 ? p.fL : p.fR;
    if (U != null) {
      const a1 = rad(U), a2 = rad(Fo ?? U), el = [sh[0] + sx * L.ua * Math.sin(a1), sh[1] + L.ua * Math.cos(a1)];
      return [el, [el[0] + sx * L.fa * Math.sin(a2), el[1] + L.fa * Math.cos(a2)]];
    }
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
      // sq: seen end-on (handle pointing at you, e.g. a palms-forward grip seen from the side)
      if (pr.sq) return `<rect class="dp-load" x="${f1(c[0] - 5)}" y="${f1(c[1] - 5)}" width="10" height="10" rx="2.5"/>`;
      // along / perp: lined up with, or across, the limb that holds it (forearm for a hand, shin for an ankle)
      if (pr.along || pr.perp) { const from = J[{ hand: "elbow", hand2: "elbow2", ankle: "knee", ankle2: "knee2", hdL: "elL", hdR: "elR" }[pr.at]] || c;
        const p0 = J[pr.at] || c, a = Math.atan2(p0[1] - from[1], p0[0] - from[0]) * 180 / Math.PI + (pr.perp ? 90 : 0);
        return `<rect class="dp-load" x="${f1(c[0] - 9)}" y="${f1(c[1] - 3.5)}" width="18" height="7" rx="2.5" transform="rotate(${f1(a)} ${f1(c[0])} ${f1(c[1])})"/>`; }
      return v ? `<rect class="dp-load" x="${f1(c[0] - 3.5)}" y="${f1(c[1] - 9)}" width="7" height="18" rx="2.5"/>`
               : `<rect class="dp-load" x="${f1(c[0] - 9)}" y="${f1(c[1] - 3.5)}" width="18" height="7" rx="2.5"/>`; }
    case "bar": { const c = at(J, pr.at, pr.dx, pr.dy), w = pr.w || 26; return `<line class="dp-loads" x1="${f1(c[0] - w / 2)}" y1="${f1(c[1])}" x2="${f1(c[0] + w / 2)}" y2="${f1(c[1])}" stroke-width="4"/>`; }
    case "cable": { const t = at(J, pr.to); return `<line class="dp-cable" x1="${pr.from[0]}" y1="${pr.from[1]}" x2="${f1(t[0])}" y2="${f1(t[1])}"/><circle class="dp-eq" cx="${pr.from[0]}" cy="${pr.from[1]}" r="5"/>`; }
    case "band": { const t = at(J, pr.to), [x0, y0] = pr.from, n = 8, pts = [];
      for (let i = 0; i <= n; i++) { const k = i / n, x = x0 + (t[0] - x0) * k, y = y0 + (t[1] - y0) * k, nx = -(t[1] - y0), ny = t[0] - x0, l = Math.hypot(nx, ny) || 1, o = (i % 2 ? 2.2 : -2.2) * (i && i < n ? 1 : 0); pts.push([x + nx / l * o, y + ny / l * o]); }
      return poly(pts, 2.2, "dp-band"); }
    case "pad": { const c = at(J, pr.at, pr.dx, pr.dy); return `<circle class="dp-eq" cx="${f1(c[0])}" cy="${f1(c[1])}" r="${pr.r || 5}"/>`; }
    case "plat": {   // footplate flat against the sole: parallel to the foot, on the side away from the shin
      const a = J.ankle, t = J.toe, k = J.knee, l = Math.hypot(t[0] - a[0], t[1] - a[1]) || 1, ux = (t[0] - a[0]) / l, uy = (t[1] - a[1]) / l;
      let nx = -uy, ny = ux; if (nx * (k[0] - a[0]) + ny * (k[1] - a[1]) > 0) { nx = -nx; ny = -ny; }
      return seg([a[0] - ux * 8 + nx * 6, a[1] - uy * 8 + ny * 6], [t[0] + ux * 10 + nx * 6, t[1] + uy * 10 + ny * 6], 5, "dp-eqs"); }
    case "under": { const c = at(J, pr.at, pr.dx); return `<rect class="dp-eq" x="${f1(c[0] - (pr.w || 16) / 2)}" y="${G - 3}" width="${pr.w || 16}" height="4" rx="2"/>`; }   // slider under a heel
    case "box": { const c = at(J, pr.at, pr.dx, pr.dy); return `<rect class="dp-eq" x="${f1(c[0] - pr.w / 2)}" y="${f1(c[1])}" width="${pr.w}" height="${pr.h}" rx="2"/>`; }   // a seat that rides with you
    case "crank": { const c = J.cc; return seg(J.ankle, J.ankle2, 3, "dp-eqs") + `<circle class="dp-eq" cx="${f1(c[0])}" cy="${f1(c[1])}" r="5"/>`; }
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
const SEAT = (x, y) => [{ k: "rect", x: x - 18, y, w: 36, h: 7 }, { k: "rect", x: x - 3, y: y + 7, w: 6, h: G - y - 7, rx: 1 }];
const hold = (A, d) => ({ A, B: mix(A, d, 1), hold: true });
const r1 = n => Math.round(n * 10) / 10;
/* a straight body pivoting at the ankle: th = lean from vertical (90 = flat, facing down, head to the right).
   Used for planks and push-ups (rigid from heels to head) and leaning pulls/pushes against a wall or door frame. */
const lean = (ank, th) => ({ hip: [r1(ank[0] + 69.4 * Math.sin(rad(th))), r1(ank[1] - 69.4 * Math.cos(rad(th)))], t: th });
const HANG = { ua: 91, fa: 91 };                 // arms hanging straight down from the shoulders

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
  if (o.jump) {
    // feet stay on the floor until the legs are straight: load with the arms back, drive up onto the toes, leave the
    // floor, land on the toes and sink straight back into the next squat
    const bot = { hip: [99, 103], t: 38, an: [122, G], ua: 118, fa: 112 };
    const toes = { hip: [121, 62], t: 4, an: [125.9, 129.6], ft: 50, ua: -30, fa: -40 };
    const air = { hip: [121, 47], t: 2, an: [124, 116], ft: 60, ua: -56, fa: -64 };
    return { keys: [bot, toes, air, toes, bot], loop: true, per: 2400, A: bot, B: air, props,
      cap: "Sink into the squat with your arms back, then jump straight up. Land softly on the balls of your feet." };
  }
  if (o.hack) {
    // back flat against the reclined pad the whole rep: you travel down along it, toward the angled footplate
    const u = [Math.sin(rad(25)), Math.cos(rad(25))];
    const top = { hip: [118, 72], t: -25, an: [148, 132], ft: -22, ht: [8, -2], eb: 1 };
    const bot = { ...top, hip: [r1(118 + 30 * u[0]), r1(72 + 30 * u[1])] };
    return { A: top, B: bot,
      props: [{ k: "line", a: [85, 21], b: [128, 116], w: 6 }, { k: "line", a: [128, 116], b: [128, G], w: 5 },
        { k: "plat" }, { k: "pad", at: "sh", dy: -7, r: 5, front: true }],
      cap: "Back stays flat on the pad. Sit down along the sled until your thighs are about level, then drive back up." };
  }
  return { A, B, props };
};
T.legpress = () => {
  // the sled runs on a fixed rail, so the feet travel in a straight line pointing at the hips. Feet flat on the plate.
  const hip = [78, 112], d = [Math.cos(rad(-40)), Math.sin(rad(-40))], at = n => [r1(hip[0] + n * d[0]), r1(hip[1] + n * d[1])];
  return {
    A: { hip, t: -60, an: at(47), kb: 1, hand: [82, 114], ft: -125 },
    B: { hip, t: -60, an: at(68), kb: 1, hand: [82, 114], ft: -125 },
    props: [{ k: "poly", pts: [[30, 82], [40, 76], [92, 116], [92, 124], [60, 124]] }, { k: "rect", x: 74, y: 124, w: 8, h: 14, rx: 1 },
      { k: "plat", front: true }],
  };
};
// hinge family: rdl, deadlift, goodmorning, single-leg rdl, pull-through
T.hinge = (o = {}) => {
  // hips travel back, shins stay nearly vertical, and the arms hang straight down so the weight stays over mid-foot
  const A = { ...STAND, ...HANG }, B = { hip: [86, 82], t: 72, an: [122, G], ua: 90, fa: 90 };
  if (o.dl) Object.assign(B, { hip: [95, 97.8], t: 63.2, ua: 100, fa: 100 });   // bar on the floor against the shins, hips above the knees
  if (o.gm) { for (const f of [A, B]) { delete f.ua; delete f.fa; f.ht = [-7, -1]; f.eb = -1; } }
  if (o.sl) {
    // the free leg swings back in one straight line with the torso, toes pointing at the floor
    Object.assign(B, { hip: [86, 80], t: 76 });
    Object.assign(A, { ta2: 89, sa2: 89, ft2: 0 }); Object.assign(B, { ta2: 172, sa2: 172, ft2: 100 });
    var mid = { hip: [104, 74], t: 36, an: [122, G], ua: 90, fa: 90, ta2: 128, sa2: 128, ft2: 20 };
  }
  const props = o.gm ? (o.band ? [{ k: "band", from: [122, 140], to: "shb" }] : [{ k: "plate", at: "shb" }]) : loadProps(o.eq, "hand", o.eq === "db" ? "hand2" : null);
  if (o.cable) { props.push({ k: "cable", from: [36, 132], to: "hand" }); A.ua = A.fa = 92; B.ua = B.fa = 120; }   // hands reach back between the legs
  return { A, B, mid, props };
};
T.swing = () => ({
  // arms stay long and swing in an arc: the bell is hiked back between the legs, then the hips snap it to chest height
  A: { hip: [96, 82], t: 66, an: [122, G], aa: 118 },
  B: { ...STAND, aa: -4 },
  props: [{ k: "ball", at: "hand", r: 8, dy: 6, front: true }],
});
T.slam = () => ({   // overhead, then slam it into the floor in front of your feet, sinking into a squat
  A: { ...STAND, aa: -84 }, B: { hip: [100, 104], t: 55, an: [122, G], aa: 82 },
  props: [{ k: "ball", at: "hand", r: 10, front: true }],
});
// hip thrust / bridge
T.thrust = (o = {}) => {
  if (o.floor) {
    const A = { hip: [86, 131], t: -90, an: [126, G], kb: -1, hand: [91, 137], eb: -1, ft: 0 }, B = { hip: [82, 110], t: -116, hd: 26, an: [126, G], kb: -1, hand: [91, 137], eb: -1 };
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
  if (o.eq === "db") props.push({ k: "db", at: "hip", dy: -8, sq: 1, front: true });   // lying across the hips, end-on
  return { A, B, props, cap: "Upper back stays on the bench. Drive through your heels until your body is flat from shoulders to knees." };
};
// walking lunge: four keyframes (lunge, step through, lunge on the other leg, step through) that loop.
// The floor slides back under you at a steady speed, so a planted foot moves exactly with it.
T.walklunge = (o = {}) => {
  const arms = { ua: 91, fa: 91, ua2: 91, fa2: 91, t: 4 };
  const A = { ...arms, hip: [116, 98], an: [80, 131], ft: 40, an2: [152, G], ft2: 0 };      // far leg in front, back knee just off the floor
  const M1 = { ...arms, hip: [117, 70], an: [128, 112], ft: 15, an2: [116, G], ft2: 0 };     // stand up over the front foot, back leg swings through
  const B = { ...arms, hip: [116, 98], an: [152, G], ft: 0, an2: [80, 131], ft2: 40 };       // near leg in front now
  const M2 = { ...arms, hip: [117, 70], an: [116, G], ft: 0, an2: [128, 112], ft2: 15 };
  return { keys: [A, M1, B, M2, A], loop: true, per: 4400, A, B,
    props: [...(o.eq === "db" ? [{ k: "db", at: "hand", v: 0, front: true }, { k: "db", at: "hand2" }] : []), { k: "floorscroll", step: 36, travel: 144 }],
    cap: "Step forward into each lunge, then stand and bring the back leg through into the next step." };
};
// lunges and split squats
T.lunge = (o = {}) => {
  const props = loadProps(o.eq, "hand", o.eq === "db" ? "hand2" : null);
  if (o.reverse) {
    // front foot stays planted; the other leg reaches back, lands on its toes, and you sink straight down between them
    const S = { ...HANG, ...STAND, an2: [122, G] };
    const Up = { ...HANG, hip: [116, 71], t: 4, an: [122, G], an2: [96, 124], ft2: 30 };
    const Touch = { ...HANG, hip: [92, 80], t: 4, an: [122, G], an2: [56, 131], ft2: 40 };
    const Bot = { ...HANG, hip: [89, 99], t: 6, an: [122, G], an2: [56, 131], ft2: 40 };
    return { keys: [S, Up, Touch, Bot, Touch, Up, S], loop: true, per: 4200, A: S, B: Bot, props,
      cap: "Step back, lower until your back knee nearly touches the floor, then push through the front foot to stand." };
  }
  // split squat: both feet stay put and the hips drop straight down; back knee stops just above the floor
  const A = { ...HANG, hip: [117, 79], t: 2, an: [150, G], an2: [82, 131], ft2: 40 };
  const B = { ...HANG, hip: [114, 99], t: 6, an: [150, G], an2: [82, 131], ft2: 40 };
  if (o.bulg) {
    // back foot laces-down on the bench, toes pointing behind you
    Object.assign(A, { hip: [122, 76], t: 2, an: [140, G], an2: [66, 104], ft2: 170 });
    Object.assign(B, { hip: [112, 101], t: 8, an: [140, G], an2: [66, 104], ft2: 170 });
    props.unshift({ k: "rect", x: 26, y: 108, w: 50, h: 30 });
  }
  return { A, B, props };
};
T.stepup = (o = {}) => {
  // drive up through the foot on the box; the back foot leaves the floor, clears the box edge and comes up beside it
  const A = { ...HANG, hip: [116, 82], t: 14, an: [150, 107], an2: [104, G] };
  const M = { ...HANG, hip: [134, 58], t: 8, an: [150, 107], an2: [118, 124], ft2: 60 };
  const C = { ...HANG, hip: [145, 44], t: 4, an: [150, 107], an2: [130, 98], ft2: 30 };
  const B = { ...HANG, hip: [148, 39], t: 2, an: [150, 107], an2: [146, 104] };
  return { keys: [A, M, C, B, C, M, A], loop: true, per: 3800, A, B,
    props: [{ k: "rect", x: 132, y: 108, w: 56, h: 30 }, ...loadProps(o.eq, "hand", o.eq === "db" ? "hand2" : null)],
    cap: "Push through the foot on the box to stand tall, then step back down with control." };
};
// presses lying down
T.bench = (o = {}) => {
  // lockout: arms straight up over the shoulders. Bottom: elbows drop below the bench, forearms vertical under the weight.
  let A = { hip: [128, 94], t: -90, an: [164, G], kb: 1, er: [1, -25], hr: [2, -50], hd: 0 }, B = { ...A, er: [12, 13], hr: [13, -13] };
  let props = [...LIE_BENCH];
  if (o.incline) {
    // back on a ~38° incline bench. Lockout: arms straight up over the upper chest.
    // Bottom: weights just above the upper chest, elbows dipping slightly below the bench line, forearms close to vertical.
    const hip = [126, 98], t = -52, tr = rad(t);
    const u0 = [-Math.sin(tr), Math.cos(tr)];                                    // shoulder → hip
    const pole = [u0[0] * 0.55 + u0[1] * 0.35, u0[1] * 0.55 - u0[0] * 0.35, 1];   // out to the side, toward the hips, a little under the bench line
    A = { hip, t, an: [166, G], kb: -1, h3: [4, -51, 4], pole, hd: 4 };
    B = { ...A, h3: [14, -4, 9] };
    // bench pad sits under the back (offset away from the chest), so the body doesn't hide it
    const sh = [hip[0] + 46 * Math.sin(tr), hip[1] - 46 * Math.cos(tr)];
    const u = [(hip[0] - sh[0]) / 46, (hip[1] - sh[1]) / 46], nb = [-u[1], u[0]];      // along the back, and away from the chest
    const P = (s_, n_) => [Math.round((sh[0] + u[0] * s_ + nb[0] * n_) * 10) / 10, Math.round((sh[1] + u[1] * s_ + nb[1] * n_) * 10) / 10];
    props = [
      { k: "poly", pts: [P(-12, 6), P(44, 6), P(44, 13), P(-12, 13)] },                       // back pad
      { k: "rect", x: hip[0] - 14, y: hip[1] + 7, w: 34, h: 7 },                                // seat
      { k: "rect", x: hip[0] - 3, y: hip[1] + 14, w: 6, h: G - hip[1] - 14, rx: 1 },              // post
      { k: "line", a: P(10, 13), b: [hip[0] - 2, G], w: 4 },                                    // back support
    ];
  }
  if (o.decline) {
    // head end low, hips high, lying ON a pad that runs parallel to the back; knees hooked over the top with the ankles under a pad
    const hip = [128, 86], t = -112, tr = rad(t);
    const sh = [hip[0] + 46 * Math.sin(tr), hip[1] - 46 * Math.cos(tr)], u = [(hip[0] - sh[0]) / 46, (hip[1] - sh[1]) / 46], nb = [-u[1], u[0]];
    const P = (s_, n_) => [Math.round((sh[0] + u[0] * s_ + nb[0] * n_) * 10) / 10, Math.round((sh[1] + u[1] * s_ + nb[1] * n_) * 10) / 10];
    const pole = [u[0] * 0.55 + u[1] * 0.35, u[1] * 0.55 - u[0] * 0.35, 1];
    A = { hip, t, ta: -28, sa: 72, ft: -18, h3: [4, -51, 4], pole }; B = { ...A, h3: [9, -15, 9] };
    const lo = P(-14, 13), hi = P(50, 13);
    props = [{ k: "poly", pts: [P(-14, 6), P(50, 6), hi, lo] },                                    // pad under the back
      { k: "line", a: [lo[0] + 8, lo[1]], b: [lo[0] + 8, G], w: 5 }, { k: "line", a: [hi[0] - 6, hi[1]], b: [hi[0] - 6, G], w: 5 },   // legs
      { k: "line", a: [hi[0] - 6, hi[1] + 4], b: [176, 112], w: 4 }, { k: "pad", at: "ankle", dx: 4, dy: 7, r: 6 }];
  }
  if (o.floor) { A = { hip: [128, 131], t: -90, an: [160, G], kb: -1, er: [1, -25], hr: [2, -50] }; B = { ...A, er: [11, 4], hr: [13, -21] }; props = []; }   // elbows touch the floor
  if (o.fly) {
    // arms open out to the sides in a wide arc with a soft elbow. From the side they swing toward you, so they look short
    // at the bottom, where the weights sit about level with the chest.
    A = { ...A, h3: [1, -50, 6], pole: [0, 0.4, 1], arc: 1 }; delete A.er; delete A.hr;
    B = { ...A, h3: [5, 5, 48], pole: [0, 1, 0.2] };
  }
  if (o.skull) { A = { ...A, er: [1, -26], fa: -88 }; delete A.hr; B = { ...A, fa: -205 }; }   // upper arms stay pointed up, forearms lower toward the forehead
  // dumbbells with palms facing your feet are seen end-on from the side; fly and skull crushers use a neutral grip
  const db = o.fly ? { v: 0 } : o.skull ? { perp: 1 } : { sq: 1 };
  props.push(...(o.eq === "bb" ? [{ k: "plate", at: "hand", front: true }] : o.eq === "db" ? [{ k: "db", at: "hand", ...db, front: true }] : o.eq === "band" ? [{ k: "band", from: [84, 104], to: "hand" }] : []));
  return { A, B, props };
};
// seated or standing presses forward (machine chest press, banded press, med ball pass)
T.pressfwd = (o = {}) => {
  // hands start beside the chest with the elbows back, and press out to arm's length at chest height
  const base = o.seated ? { hip: [100, 102], t: -6, an: [140, G] } : { ...STAND };
  const A = { ...base, hr: o.incline ? [14, 2] : [12, 16], eb: 1 }, B = { ...base, hr: o.incline ? [42, -30] : [50, 12], eb: 1 };
  const props = [];
  if (o.seated) props.push(...SEAT(98, 104), { k: "line", a: [88, 102], b: [80, 44], w: 5 });
  if (o.band) props.push({ k: "band", from: [26, 46], to: "hand" });
  if (o.ball) props.push({ k: "ball", at: "hand", r: 10, dx: 6, front: true });
  if (o.seated) props.push({ k: "pad", at: "hand", r: 3.5, front: true });
  return { A, B, props };
};
T.palmpress = () => ({ view: "front", ...hold({ hl: [116, 44], hr: [124, 44], ebl: 1, ebr: -1 }, { hl: [116.6, 44.5], hr: [123.4, 44.5] }),
  cap: "Press your palms together hard in front of your chest and hold. Nothing moves." });
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
// push ups: the body stays rigid from heels to head and pivots at the toes; hands stay planted, elbows travel back toward the feet
T.pushup = (o = {}) => {
  const toes = { ft: 75, kb: 1, eb: 1, hd: 6 };
  const pv = (ank, th, hand, extra) => ({ ...lean(ank, th), an: ank, hand, ...toes, ...extra });
  let A = pv([50, 129], 68.7, [156, G]), B = pv([50, 129], 84.5, [156, G]);
  const props = [];
  if (o.incline) { A = pv([69, 129], 46.8, [152, 101]); B = pv([69, 129], 68.1, [152, 101]); props.push({ k: "rect", x: 138, y: 104, w: 54, h: 34 }); }
  if (o.wall) { const w = { ft: 0, hd: 0 }; A = pv([86, G], 20.6, [177, 30], w); B = pv([86, G], 39.9, [177, 30], w); props.push({ k: "line", a: [182, -30], b: [182, G], w: 5 }); }
  if (o.decline) { A = pv([41.8, 94], 86.5, [156, G]); B = pv([41.8, 94], 102, [156, G]); props.push({ k: "rect", x: 22, y: 104, w: 44, h: 34 }); }
  if (o.pike) {
    // hips high in an upside-down V; bend the elbows to bring the top of the head toward the floor just in front of the hands
    A = { hip: [101.8, 62.9], t: 121.6, an: [84, 130], ft: 60, kb: 1, hand: [140, G], eb: 1 };
    B = { hip: [125.3, 74.2], t: 147.5, an: [84, 130], ft: 60, kb: 1, hand: [140, G], eb: 1 };
  }
  if (o.climb || o.taps || o.renegade) {
    // high plank with the far hand planted; the near arm (or a knee) does the work
    A = { ...A, hand2: [156, G], eb2: 1 }; delete A.hand; A.ua = A.fa = 91.7;
    B = { ...A };
  }
  if (o.climb) {
    // hips a touch higher than a push-up so the knee can swing under the body; the thigh swings forward while the shin
    // trails back, so the foot stays off the floor until it lands behind again
    const base = { hip: [112, 96], t: 77.4, ua: 90, fa: 90, hand2: [157, G], eb2: 1, hd: 6 };
    const back = { ta: 154, sa: 154, ft: 75 }, tuck = { ta: 30, sa: 165, ft: 20 };
    A = { ...base, ...back, ta2: tuck.ta, sa2: tuck.sa, ft2: tuck.ft }; B = { ...base, ...tuck, ta2: back.ta, sa2: back.sa, ft2: back.ft };
    // the switch: both knees pass under the hips with the feet up behind, a quick hop
    const M = { ...base, ta: 91, sa: 212, ft: 30, ta2: 91, sa2: 212, ft2: 30 };
    return { keys: [A, M, B, M, A], loop: true, per: 1600, A, B, props };
  }
  if (o.taps) {                                                  // near hand lifts straight up to tap the opposite shoulder, hips stay level
    A = { ...A, h3: [-1.5, 50.9, 0], pole: [-0.3, 1, 0.6] }; delete A.ua; delete A.fa; B = { ...A, h3: [-1, 4, -15] };
  }
  if (o.renegade) { B = { ...A, ua: 186, fa: 100 }; props.push({ k: "db", at: "hand", front: true }, { k: "db", at: "hand2" }); }   // row to the ribs, elbow past the back
  return { A, B, props };
};
// planks and floor core
T.plank = (o = {}) => {
  if (o.side) {
    // forearm side plank, seen from the front: elbow under the shoulder, one straight line from head to feet
    return hold({ hip: [136.9, 117.3], t: -77.7, an: [204.7, 132.1], ft: -40, kb: 1, er: [0, 27], hr: [4, 29], hand2: [94, 56], eb2: -1, hd: -10 },
                { hip: [136.9, 115.8], t: -78.6 });
  }
  // forearm plank: elbows under the shoulders, forearms flat on the floor, body straight from heels to head
  return hold({ ...lean([36, 129], 79.3), an: [36, 129], ft: 75, kb: 1, er: [0, 27], hr: [25, 27], hd: 6 }, lean([36, 129], 78.8));
};
T.deadbug = () => {
  // on your back, arms up, knees over hips with the shins level. Reach one arm overhead as the OPPOSITE leg straightens,
  // both hovering just off the floor.
  const base = { hip: [132, 131], t: -90, ta: -90, sa: 0, ft: -80, ta2: -90, sa2: 0, ft2: -80, ua: -90, fa: -90, ua2: -90, fa2: -90 };
  return { A: base, B: { ...base, ua: -170, fa: -172, ta2: -6, sa2: -4, ft2: -50 },
    cap: "Low back stays pressed down. Reach one arm back as the opposite leg straightens, then switch." };
};
T.birddog = () => {
  // hands under the shoulders, knees under the hips. Reach one arm forward as the OPPOSITE leg pushes straight back.
  const base = { hip: [100, 98], t: 76, ta: 90, sa: 180, ft: 180, ta2: 90, sa2: 180, ft2: 180, ua: 90, fa: 90, ua2: 90, fa2: 90, hd: 10 };
  return { A: base, B: { ...base, ua: -14, fa: -16, ta2: 176, sa2: 176, ft2: 110 },
    cap: "Reach one arm forward and the opposite leg back until both are level with your back. Keep your hips square." };
};
T.situp = () => ({   // arms crossed on the chest; sit all the way up, feet flat
  A: { hip: [116, 131], t: -86, an: [160, G], kb: -1, ht: [8, 13], eb: -1 },
  B: { hip: [116, 131], t: -4, an: [160, G], kb: -1, ht: [8, 13], eb: -1 },
});
T.heelslide = () => ({   // one heel slides out along the floor until the leg is straight, then back; the other foot stays planted
  A: { hip: [100, 131], t: -90, an: [134, 134], ft: -50, an2: [134, 134], ft2: -50, kb: -1, hand: [104, 136] },
  B: { hip: [100, 131], t: -90, an: [168, 134], ft: -60, an2: [134, 134], ft2: -50, kb: -1, hand: [104, 136] },
});
T.kneeraise = () => ({
  // dead hang from the bar (end-on); bring the knees up to hip height without swinging, then lower slowly
  A: { hip: [120, 56], t: 0, ta: 88, sa: 88, ft: 70, hand: [120, -40], eb: 1 },
  B: { hip: [119, 56.5], t: -4, ta: -4, sa: 86, ft: 70, hand: [120, -40], eb: 1 },
  props: [{ k: "line", a: [120, -41], b: [120, -56], w: 3 }, { k: "pad", at: [120, -41], r: 4.5 }],   // bar end-on, hung from above
});
T.cablecrunch = () => ({
  // kneeling, hands holding the rope beside your head. Curl your chest down toward your hips; the hips stay put.
  A: { hip: [116, 98], t: 14, ta: 90, sa: 180, ft: 180, ht: [7, -6], eb: 1 },
  B: { hip: [116, 98], t: 76, hd: 22, ta: 90, sa: 180, ft: 180, ht: [7, -6], eb: 1 },
  props: [{ k: "cable", from: [132, -40], to: "hand" }],
});
/* a walking stride as four keyframes. The floor scrolls back under you, so a planted foot moves exactly with it;
   the swinging foot lifts and passes the standing one. Arms swing opposite to the legs. */
function walkKeys(arms) {
  const k = (hipY, an, ft, an2, ft2, a) => ({ hip: [120, hipY], t: 3, an, ft, an2, ft2, ...a });
  const a = arms || {};
  return [
    k(71, [139, G], -8, [103, 133], 35, a.A),     // near heel lands in front, far foot pushes off behind
    k(68.6, [121, G], 0, [124, 124], 15, a.M),    // standing on the near leg, far leg swings through
    k(71, [103, 133], 35, [139, G], -8, a.B),
    k(68.6, [124, 124], 15, [121, G], 0, a.M),
    k(71, [139, G], -8, [103, 133], 35, a.A),
  ];
}
const SWING = { A: { ua: 104, fa: 96, ua2: 78, fa2: 68 }, M: { ua: 91, fa: 84, ua2: 91, fa2: 84 }, B: { ua: 78, fa: 68, ua2: 104, fa2: 96 } };
T.walk = () => { const keys = walkKeys(SWING); return { keys, loop: true, per: 2200, A: keys[0], B: keys[2], props: [{ k: "floorscroll", step: 36, travel: 72 }] }; };
T.carry = (o = {}) => {
  // arms stay long and still with the weight; walk tall without leaning toward it
  const still = { ua: 91, fa: 91, ua2: o.both ? 91 : 93, fa2: o.both ? 91 : 88 };
  const keys = walkKeys({ A: still, M: still, B: still });
  return { keys, loop: true, per: 2400, A: keys[0], B: keys[2],
    props: [{ k: "db", at: "hand", v: 0, front: true }, ...(o.both ? [{ k: "db", at: "hand2" }] : []), { k: "floorscroll", step: 36, travel: 72 }] };
};
// pulls
T.row = (o = {}) => {
  // hips back so the weight hangs over the middle of the foot. The upper arm swings back around the shoulder, elbow
  // driving up past the back, while the forearm stays hanging straight down under the weight.
  const A = { hip: [85, 82], t: 70, an: [122, G], ua: 90, fa: 90, halo: 1 }, B = { ...A, ua: 186, fa: 95 };
  const props = loadProps(o.eq, "hand", o.eq === "db" && !o.one ? "hand2" : null);
  if (o.one) {
    // free hand braced on a bench in front, arm straight
    for (const f of [A, B]) Object.assign(f, { hip: [88, 84], t: 72, hand2: [171, 102], eb2: -1 });
    props.unshift({ k: "rect", x: 150, y: 104, w: 44, h: 34 });
  }
  if (o.chest) {
    // lying chest-down on an incline pad, toes on the floor behind; arms hang straight down past the pad and row up
    Object.assign(A, { hip: [96, 96], t: 50, an: [44, G], kb: 1, ft: 0, ua: 90, fa: 90 });
    Object.assign(B, { hip: [96, 96], t: 50, an: [44, G], kb: 1, ft: 0, ua: 182, fa: 92 });
    props.unshift({ k: "poly", pts: [[97, 104], [137, 70], [142, 76], [103, 111]] },            // pad, right under the chest
      { k: "rect", x: 117, y: 92, w: 6, h: 46, rx: 1 }, { k: "rect", x: 100, y: 132, w: 40, h: 6, rx: 2 });
  }
  return { A, B, props };
};
T.ytraise = () => {
  // chest down on an incline bench, toes on the floor. Y: arms reach up past your head in line with your body.
  // T: arms straight out to the sides; from the side they point at you, so they look short.
  const base = { hip: [96, 96], t: 50, an: [44, G], kb: 1, ft: 0, arc: 1, halo: 1, hd: 12 };
  const hang = { ...base, h3: [0, 51, 2], pole: [0, 1, 0.3] };
  const Y = { ...base, h3: [36, -28, 22], pole: [0, -1, 0.5] }, Tp = { ...base, h3: [-2, 4, 51], pole: [0, -1, 0] };
  return { keys: [hang, Y, hang, Tp, hang], loop: true, per: 5600, A: hang, B: Y,
    props: [{ k: "poly", pts: [[97, 104], [137, 70], [142, 76], [103, 111]] }, { k: "rect", x: 117, y: 92, w: 6, h: 46, rx: 1 }, { k: "rect", x: 100, y: 132, w: 40, h: 6, rx: 2 }],
    cap: "Lift your arms into a Y, lower, then out to the sides into a T. Thumbs up, shoulder blades squeezed." };
};
T.seatedrow = (o = {}) => ({
  // reach long with a slight lean, then sit tall and row the handle to your belly, elbows driving back past the torso
  A: { hip: [86, 120], t: 22, an: [152, 114], kb: -1, ft: -80, hand: [154, 86], eb: 1 },
  B: { hip: [86, 120], t: -6, an: [152, 114], kb: -1, ft: -80, hand: [93, 98], eb: 1 },
  props: [...SEAT(86, 122), { k: "line", a: [160, 102], b: [160, G], w: 4 }, o.band ? { k: "band", from: [164, 100], to: "hand" } : { k: "cable", from: [204, 92], to: "hand" }],
});
T.doorrow = () => {
  // hold the door frame with your feet close to it; body straight and leaning back. Pull your chest to your hands.
  const ank = [165, G], hand = [178, 44];
  return { A: { ...lean(ank, -18), an: ank, ft: -15, hand, eb: 1 }, B: { ...lean(ank, -6), an: ank, ft: -15, hand, eb: 1 },
    props: [{ k: "line", a: [184, -30], b: [184, G], w: 5 }] };
};
T.pulldown = (o = {}) => ({
  // wide grip: from the side the arms angle out toward you, so they look short. Elbows drive down and back,
  // the bar (seen end-on) comes down in front of the face to the top of the chest.
  A: { hip: [112, 104], t: -8, an: [150, G], kb: -1, h3: [7, -47, 18], pole: [-0.3, 1, 1] },
  B: { hip: [112, 104], t: -14, an: [150, G], kb: -1, h3: [12, -2, 20], pole: [-0.4, 1, 1] },
  props: [...SEAT(110, 106), { k: "pad", at: [140, 96], r: 6 }, o.band ? { k: "band", from: [120, -48], to: "hand" } : { k: "cable", from: [120, -46], to: "hand" },
    { k: "pad", at: "hand", r: 3.5, front: true }],
});
T.pullup = (o = {}) => ({
  // dead hang with straight arms, then pull until the chin clears the bar (seen end-on). Elbows drive down and
  // slightly forward, the body leans back a touch, and the legs hang quietly with soft knees.
  A: { hip: [119.2, 59.2], t: -4, ar: [-12, 63], kb: 1, ft: 60, hand: [120, -38], eb: 1 },
  B: { hip: [116.6, 10], t: -12, hd: -10, ar: [-12, 63], kb: 1, ft: 60, hand: [120, -38], eb: 1 },
  props: [{ k: "line", a: [120, -38], b: [120, -53], w: 3 }, { k: "pad", at: [120, -38], r: 4.5 }, ...(o.band ? [{ k: "band", from: [120, -36], to: "ankle" }] : [])],
});
T.straightarm = () => ({
  // arms stay long: they sweep down in an arc from about head height to the front of the thighs
  A: { hip: [118, 70], t: 22, an: [126, G], aa: -32 },
  B: { hip: [118, 70], t: 22, an: [126, G], aa: 82 },
  props: [{ k: "cable", from: [210, -30], to: "hand" }],
});
T.facepull = () => ({
  // rope at face height: pull it apart toward your ears, elbows high and out to the sides
  A: { ...STAND, h3: [50, -4, 6], pole: [0, 1, 1] },
  B: { ...STAND, h3: [6, -14, 14], pole: [-0.5, -0.2, 1] },
  props: [{ k: "cable", from: [206, 16], to: "hand" }],
});
T.revfly = () => ({
  // seen from the front, bent forward at the hips with straight legs. Arms hang under the shoulders, then open out to
  // the sides like wings until they're level with the back. Elbows stay soft.
  view: "front",
  A: { lean: 1, hip: 78, al: [107, G], ar: [133, G], kL: [109, 108], kR: [131, 108], aL: 4, aR: 4 },
  B: { lean: 1, hip: 78, al: [107, G], ar: [133, G], kL: [109, 108], kR: [131, 108], aL: 84, aR: 84 },
  props: [{ k: "db", at: "hdL", sq: 1, front: true }, { k: "db", at: "hdR", sq: 1, front: true }],
  cap: "Seen from the front, bent over. Lift the weights out to the sides until your arms are level with your back.",
});
// overhead / shoulders / arms (standing or seated)
const BASE = o => o.seated ? { hip: [110, 104], t: 0, an: [150, G] } : { ...STAND };
const seatProps = o => o.seated ? [...SEAT(110, 106), { k: "line", a: [96, 104], b: [96, 40], w: 5 }] : [];
/* overhead press arm: the weight starts at the front of the shoulders and travels straight up. The elbows open out to
   the sides on the way, so from the side the upper arm looks short partway up. z = how far out the hands are. */
const PRESS_LO = z => ({ h3: [7, -1, z], pole: [0.5, 1, 0.6] }), PRESS_HI = z => ({ h3: [2, -51, z * 0.5], pole: [0.2, 1, 1] });
T.ohp = (o = {}) => {
  const z = o.eq === "db" ? 13 : o.machine ? 9 : 5;
  return {
    A: { ...BASE(o), ...PRESS_LO(z) }, B: { ...BASE(o), ...PRESS_HI(z) },
    props: [...seatProps(o), ...(o.eq === "bb" ? [{ k: "plate", at: "hand", front: true }] : o.eq === "db" ? [{ k: "db", at: "hand", sq: 1, front: true }]
      : o.eq === "band" ? [{ k: "band", from: [122, 140], to: "hand" }] : o.machine ? [{ k: "pad", at: "hand", r: 3.5, front: true }] : [])],
  };
};
T.ohpFront = () => FV(
  // bottom: upper arms just below level, forearms straight up so the elbows sit under the dumbbells, weights by the ears
  { uL: 80, uR: 80, fL: 180, fR: 180 },
  // top: pressed overhead with a soft lockout, dumbbells over the shoulders and arms close to the ears
  { uL: 170, uR: 170, fL: 178, fR: 178 },
  [{ k: "db", at: "hdL", front: true }, { k: "db", at: "hdR", front: true }]);
T.thruster = (o = {}) => ({
  // squat with the weight racked on the shoulders, stand, and let that drive carry it straight overhead
  A: { hip: [99, 103], t: 38, an: [122, G], h3: [8, -4, 5], pole: [0.5, 1, 0.5] },
  mid: { ...STAND, ...PRESS_LO(5) },
  B: { ...STAND, ...PRESS_HI(8) },
  props: o.ball ? [{ k: "ball", at: "hand", r: 10, dy: -6, front: true }] : [{ k: "db", at: "hand", sq: 1, front: true }],
});
T.pushpress = () => ({   // small dip at the knees, drive up, and press the weight overhead on the way
  A: { hip: [116, 78], t: 8, an: [122, G], ...PRESS_LO(8) }, mid: { ...STAND, ...PRESS_LO(8) }, B: { ...STAND, ...PRESS_HI(8) },
  props: [{ k: "db", at: "hand", sq: 1, front: true }],
});
T.snatch = () => ({
  // hinge with the dumbbell between the feet, explode up onto the toes pulling it high (elbow up and out), punch it overhead
  A: { hip: [90, 95], t: 62, an: [122, G], h3: [0, 51, 2], pole: [0.3, 1, 0.5] },
  mid: { hip: [120, 66], t: 4, an: [124, 130], ft: 45, h3: [9, -10, 10], pole: [-0.2, -1, 1] },
  B: { ...STAND, ...PRESS_HI(8) },
  props: [{ k: "db", at: "hand", sq: 1, front: true }],
});
T.frontraise = (o = {}) => ({ A: { ...BASE(o), aa: 84 }, B: { ...BASE(o), aa: -4 }, props: [{ k: "db", at: "hand", sq: 1, front: true }] });   // arm swings up in an arc, elbow soft
T.curl = (o = {}) => {
  // upper arm pinned at your side; the forearm swings up around the elbow. Drag curl: elbows travel back as the bar rises.
  let base = BASE(o), er = [2, 26], erB = er, props = seatProps(o);
  if (o.incline) {
    // reclined on an incline bench: arms hang straight down behind the body line, so the curl starts from a long stretch
    base = { hip: [104, 102], t: -42, ta: 4, sa: 92, ft: 2 };
    er = erB = [0, 27];
    props = [{ k: "poly", pts: [[98, 109], [63, 71], [57, 77], [92, 115]] }, { k: "rect", x: 92, y: 108, w: 38, h: 6, rx: 2 }, { k: "rect", x: 101, y: 114, w: 6, h: 24, rx: 1 }];
  }
  // palms up: the dumbbell's handle points at you (seen end-on). Hammer grip: the dumbbell sits across the forearm.
  const load = o.eq === "bb" ? [{ k: "bar", at: "hand", w: 6 }, { k: "plate", at: "hand", r: 9, front: true }] : o.eq === "db" ? [{ k: "db", at: "hand", ...(o.hammer ? { perp: 1 } : { sq: 1 }), front: true }]
    : o.cable ? [{ k: "cable", from: [176, 134], to: "hand" }] : o.band ? [{ k: "band", from: [124, 140], to: "hand" }] : [];
  if (o.towel) return { ...hold({ ...base, er, fa: -2 }, { fa: -5 }), props: [{ k: "seg", a: "hand", b: [127, 136], w: 3 }],
    cap: "Towel under your foot, elbows at 90°. Pull up as hard as you can without moving, and hold." };
  if (o.drag) {
    // drag curl: the bar stays against the front of your body and slides straight up to the chest; elbows travel back
    const mid = { ...base, er: [-9, 21], hr: [9, 30], halo: 1 };
    return { A: { ...base, er: [3, 26], hr: [8, 50], halo: 1 }, B: { ...base, er: [-21, 9], hr: [9, 9], halo: 1 }, mid, props: [...props, ...load],
      cap: "Drag curl: keep the bar touching your body as it slides up. Your elbows travel back instead of swinging the bar out." };
  }
  return { A: { ...base, er, fa: 86 }, B: { ...base, er: erB, fa: -46 }, props: [...props, ...load] };
};
T.pressdown = (o = {}) => ({
  // elbows pinned at your sides; only the forearms move, from just above level down to straight
  A: { ...STAND, t: 8, er: [-2, 26.9], fa: -16 }, B: { ...STAND, t: 8, er: [-2, 26.9], fa: 86 },
  props: [o.band ? { k: "band", from: [150, -40], to: "hand" } : { k: "cable", from: [148, -40], to: "hand" }],
});
T.ohext = (o = {}) => ({
  // upper arm stays fixed, pointing almost straight up beside the ear (elbow over the head, not in front of the face).
  // Only the elbow bends: the dumbbell lowers BEHIND the head to about neck height, then presses back up in line with the arm.
  // fa runs 132 → 274 (not 132 → -86) so the forearm swings back behind the head instead of forward over the face.
  A: { ...BASE(o), er: [3, -26.8], fa: 132, halo: 1 }, B: { ...BASE(o), er: [3, -26.8], fa: 274, halo: 1 },
  props: [...seatProps(o), { k: "db", at: "hand", along: 1, front: true }],
});
T.dips = (o = {}) => o.bench ? {
  // hands on the bench edge behind you, knees bent; lower until the upper arms are about level, elbows pointing back
  A: { hip: [104.2, 93.1], t: -4, an: [150, G], kb: -1, hand: [98, 98], eb: 1 },
  B: { hip: [107.8, 117.7], t: -6, an: [150, G], kb: -1, hand: [98, 98], eb: 1 },
  props: [{ k: "rect", x: 52, y: 100, w: 52, h: 38 }],
} : {
  // lean forward and lower until the upper arms are level: shoulders travel forward of the hands, elbows go back
  A: { hip: [120, 42.3], t: 10, ar: [-22, 56], kb: 1, ft: 60, hand: [126, 48], eb: 1 },
  B: { hip: [121.4, 62.6], t: 28, ar: [-22, 56], kb: 1, ft: 60, hand: [126, 48], eb: 1 },
  props: [{ k: "line", a: [100, 50], b: [150, 50], w: 5 }, { k: "line", a: [146, 50], b: [146, G], w: 4 }],
};
T.walltri = () => {
  // forearms flat on the wall, body straight and leaning in; press through the palms to straighten the arms
  const ank = [95.2, G], hand = [177, 1];
  return { A: { ...lean(ank, 30), an: ank, hand, eb: 1 }, B: { ...lean(ank, 20), an: ank, hand, eb: 1 },
    props: [{ k: "line", a: [182, -30], b: [182, G], w: 5 }], cap: "Forearms on the wall, then press through your palms to straighten your arms." };
};
// legs on machines
T.legext = (o = {}) => {
  // thigh held flat on the seat; the lower leg swings around the knee. Foot stays at right angles to the shin.
  const seat = { hip: [100, 98], t: -12, ta: 2, hand: [102, 102], eb: 1 };
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
  if (o.db) props.push({ k: "db", at: "ankle", along: 1, front: true });                     // squeezed between the feet, in line with the shins
  else props.push({ k: "rect", x: 198, y: 20, w: 16, h: 118, rx: 2 }, { k: "cable", from: [206, 24], to: "ankle" }, { k: "spad", side: -1, front: true });
  return { A, B, props, cap: o.db ? "Lying on a bench with a dumbbell between your feet. Keep your hips down as you curl your heels toward your glutes."
                                  : "Lying leg curl machine: hips stay on the pad, curl your heels toward your glutes, then lower slowly." };
};
T.standcurl = () => ({
  // standing tall, holding the post: the thigh stays pointing down while the heel curls up toward the glute
  A: { ...STAND, ta2: 93, sa2: 93, ft2: 0, hand: [155, 40], eb: 1 },
  B: { ...STAND, ta2: 95, sa2: 192, ft2: 100, hand: [155, 40], eb: 1 },
  props: [{ k: "band", from: [176, 136], to: "ankle2" }, { k: "line", a: [158, -20], b: [158, G], w: 4 }],
});
T.sliders = () => ({
  // shoulders stay down and the hips stay up; pull the heels in on the sliders, then push them back out
  A: { pin: [66, 131], t: -105, hd: 15, an: [178, 134], kb: -1, ft: -60, hand: [116, 136], eb: -1 },
  B: { pin: [66, 131], t: -117, hd: 27, an: [146, 134], kb: -1, ft: -60, hand: [116, 136], eb: -1 },
  props: [{ k: "under", at: "ankle", dx: -2, w: 14 }],
});
T.calf = (o = {}) => ({
  // rock up onto the balls of the feet: the toes stay planted and the heel rises, lifting the whole body
  A: { ...STAND, an: [122, G], ft: 0, ...HANG },
  B: { ...STAND, hip: [123.9, 60.2], an: [125.9, 129.6], ft: 50, ...HANG },
  props: [...(o.eq === "db" ? [{ k: "db", at: "hand", v: 0, front: true }] : [])],
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
  // torso leans forward, hips square. The working leg pushes back until it's in line with the body — no further,
  // so the low back doesn't arch. The cable or band pulls from in front / below, against the kick.
  A: { hip: [116, 72], t: 34, an: [122, G], ta2: 70, sa2: 125, ft2: 20, hand: [168, 60], eb: 1 },
  B: { hip: [116, 72], t: 34, an: [122, G], ta2: 132, sa2: 134, ft2: 50, hand: [168, 60], eb: 1 },
  props: [o.band ? { k: "band", from: [122, 140], to: "ankle2" } : { k: "cable", from: [170, 132], to: "ankle2" }, { k: "line", a: [176, 40], b: [176, G], w: 4 }],
});
T.backext = () => ({
  // legs locked on the pad, arms crossed on the chest; hinge down at the hips, then rise until the body is one straight line
  A: { hip: [116, 82], t: 135, an: [62, 124], ft: 0, ht: [7, 12], eb: -1, hd: 15 },
  B: { hip: [116, 82], t: 50, an: [62, 124], ft: 0, ht: [7, 12], eb: -1 },
  props: [{ k: "poly", pts: [[110, 88], [122, 88], [80, 132], [68, 132]] }, { k: "rect", x: 50, y: 130, w: 30, h: 8 }, { k: "pad", at: "ankle", dx: -4, dy: -8, r: 5, front: true }],
});
T.sidelying = () => ({
  // lying on your side, seen from the front, head resting on the bottom arm: the top leg lifts straight, then lowers slowly
  A: { hip: [124, 131], t: -90, an: [193, 133], kb: -1, ft: -70, ta2: 2, sa2: 2, ft2: -70, hand: [27, 133], eb: 1 },
  B: { hip: [124, 131], t: -90, an: [193, 133], kb: -1, ft: -70, ta2: -30, sa2: -30, ft2: -100, hand: [27, 133], eb: 1 },
});
// cardio, conditioning
T.march = () => {
  // drive one knee to hip height while the OPPOSITE arm swings forward; both feet are down as the legs swap
  const st = { hip: [120, 68.6], t: 2 };
  const upN = { ...st, an: [156, 103], ft: 30, an2: [122, G], ft2: 0, ua: 108, fa: 98, ua2: 32, fa2: -36 };
  const dn = { ...st, an: [122, G], ft: 0, an2: [122, G], ft2: 0, ua: 92, fa: 86, ua2: 92, fa2: 86 };
  const upF = { ...st, an: [122, G], ft: 0, an2: [156, 103], ft2: 30, ua: 32, fa: -36, ua2: 108, fa2: 98 };
  return { keys: [upN, dn, upF, dn, upN], loop: true, per: 1900, A: upN, B: upF };
};
T.box = () => ({ A: { ...STAND, hip: [120, 70], an: [132, G], an2: [106, G], hr: [16, 8], hr2: [14, 4], eb: 1, eb2: 1 }, B: { ...STAND, hip: [120, 70], an: [132, G], an2: [106, G], hr: [51, 3], hr2: [14, 4], eb: 1, eb2: 1 } });
T.rower = () => {
  // catch (shins vertical, arms long) → legs drive → swing back and pull the handle to the lower ribs; recover in reverse
  const f = { an: [176, 116], kb: -1, ft: -80, eb: 1 };
  return {
    A: { ...f, hip: [132, 120], t: 26, hand: [185, 117] },
    mid: { ...f, hip: [107, 120], t: 10, hand: [161, 96] },
    B: { ...f, hip: [107, 120], t: -24, hand: [100, 97] },
    props: [{ k: "line", a: [20, 128], b: [186, 128], w: 4 }, { k: "rect", x: 188, y: 92, w: 24, h: 34 }, { k: "plat" },
      { k: "box", at: "hip", dy: 4, w: 22, h: 5 }, { k: "cable", from: [190, 104], to: "hand" }],
    cap: "Legs push first, then lean back and pull the handle to your lower ribs. Return arms, body, then legs.",
  };
};
T.bike = () => {
  // the pedals turn in a circle, feet on opposite sides of the crank
  const base = { hip: [100, 64], t: 34, kb: -1, ft: 10, ft2: 10, hand: [158, 50], eb: 1, crank: [118, 112, 14] };
  const A = { ...base, cr: 0 };
  return { keys: [A, { ...base, cr: 120 }, { ...base, cr: 240 }, { ...base, cr: 360 }], loop: true, per: 1500, A, B: { ...base, cr: 180 },
    props: [{ k: "rect", x: 88, y: 66, w: 20, h: 6 }, { k: "line", a: [98, 72], b: [118, 112], w: 5 }, { k: "line", a: [118, 112], b: [160, 54], w: 5 }, { k: "rect", x: 96, y: 128, w: 48, h: 10 }, { k: "crank" }] };
};
T.burpee = () => {
  // squat and plant the hands, jump the feet back to a plank, jump them back in, then jump up with the arms overhead
  const S = { ...STAND, ua: 92, fa: 92 };
  const C = { hip: [106, 110], t: 60, an: [122, G], ua: 84, fa: 84 };
  const J1 = { hip: [110, 98], t: 76, an: [70, 108], ft: 60, ua: 93.8, fa: 93.8 };
  const P = { ...lean([50, 129], 68.7), an: [50, 129], ft: 75, kb: 1, ua: 97, fa: 97 };
  const Air = { hip: [121, 47], t: 2, an: [124, 116], ft: 60, ua: -86, fa: -92 };
  return { keys: [S, C, J1, P, J1, C, Air, S], loop: true, per: 4200, A: S, B: P };
};
T.bridgebreath = () => ({ A: { hip: [86, 131], t: -90, an: [126, G], kb: -1, hand: [91, 137], eb: -1 }, B: { hip: [84, 118], t: -106, hd: 16, an: [126, G], kb: -1, hand: [91, 137], eb: -1 } });

// front-view templates
const FV = (A, B, props) => ({ view: "front", A, B, props });
T.latraise = (o = {}) => o.cable
  ? FV({ aR: -14 }, { aR: 86 }, [{ k: "cable", from: [84, 134], to: "hdR" }, { k: "pad", at: "hdR", r: 3, front: true }])
  : FV({ aL: 9, aR: 9 }, { aL: 86, aR: 86 }, o.band ? [{ k: "band", from: [112, 140], to: "hdL" }, { k: "band", from: [128, 140], to: "hdR" }] : [{ k: "db", at: "hdL", sq: 1, front: true }, { k: "db", at: "hdR", sq: 1, front: true }]);
// cable or band fly, seen from above (facing up the screen): the only angle that shows both anchors and the hugging arc of the arms
T.flyTop = (o = {}) => {
  const ln = (a, b, w, cls) => `<line class="${cls}" x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke-width="${w}"/>`;
  const pl = (pts, w, cls) => `<polyline class="${cls}" points="${pts.map(q => `${f1(q[0])},${f1(q[1])}`).join(" ")}" stroke-width="${w}" fill="none"/>`;
  const shL = [111, 78], shR = [149, 78], stL = [40, 96], stR = [220, 96];   // shoulders; anchors out to each side, a step behind you
  const BEND = 20;                                                            // the elbows keep the same soft bend the whole rep
  // th: upper arm angle from straight ahead (0) to out to the side (90), slightly past it at the stretch
  const armAt = (sh, sx, th) => {
    const a = rad(th), b = rad(th - BEND);
    const el = [sh[0] + sx * L.ua * Math.sin(a), sh[1] - L.ua * Math.cos(a)];
    return [el, [el[0] + sx * L.fa * Math.sin(b), el[1] - L.fa * Math.cos(b)]];
  };
  const custom = k => {
    const th = 96 + (-8 - 96) * k;                                            // wide stretch → hands meet in front of the chest
    const [elL, hdL] = armAt(shL, -1, th), [elR, hdR] = armAt(shR, 1, th);
    const anchor = c => o.band ? `<circle class="dp-eq" cx="${c[0]}" cy="${c[1]}" r="8"/>` : `<rect class="dp-eq" x="${c[0] - 11}" y="${c[1] - 11}" width="22" height="22" rx="3"/>`;
    const pull = (a, b) => o.band ? drawProp({ k: "band", from: a, to: b }, {}) : ln(a, b, 1.5, "dp-cable");
    return anchor(stL) + anchor(stR)
      + ln([121, 74], [121, 57], 8, "dp-far") + ln([139, 101], [139, 84], 8, "dp-far")   // staggered stance: one foot forward
      + `<rect class="dp-torso" x="105" y="66" width="50" height="24" rx="12"/>`            // shoulders and back from above
      + `<circle class="dp-fist" cx="130" cy="78" r="10.5"/>`                               // top of the head
      + pull(stL, hdL) + pull(stR, hdR)
      + pl([elL, hdL], 10.5, "dp-halo") + pl([elR, hdR], 10.5, "dp-halo")
      + pl([shL, elL, hdL], 7, "dp-limb") + pl([shR, elR, hdR], 7, "dp-limb")
      + `<circle class="dp-fist" cx="${f1(hdL[0])}" cy="${f1(hdL[1])}" r="4.5"/><circle class="dp-fist" cx="${f1(hdR[0])}" cy="${f1(hdR[1])}" r="4.5"/>`;
  };
  return { custom, box: [24, -2, 212, 119.3], A: {}, B: {},
    cap: "Seen from above. Keep the same soft bend in your elbows and sweep your hands together in front of your chest, like hugging a big tree." };
};
T.pullapart = () => FV({ plane: "h", aL: 12, aR: 12, ay: 6 }, { plane: "h", aL: 86, aR: 86, ay: 6 }, [{ k: "seg", a: "hdL", b: "hdR", w: 2.5, front: true }]);
T.uprow = () => FV({ hl: [112, 76], hr: [128, 76], ebl: 1, ebr: -1 }, { hl: [112, 32], hr: [128, 32], ebl: 1, ebr: -1 }, [{ k: "db", at: "hdL", v: 0, front: true }, { k: "db", at: "hdR", v: 0, front: true }]);
T.latwalk = () => {
  // quarter squat, band around the knees: the lead foot steps out, the trail foot follows, feet never come together.
  // Two steps one way, then two steps back.
  const st = (cx, l, r, ly = G, ry = G) => ({ cx, hip: 72, al: [l, ly], ar: [r, ry] });
  const K = [st(112, 100, 124), st(116, 100, 132, G, 130), st(120, 100, 140), st(124, 108, 140, 130), st(128, 116, 140)];
  return { view: "front", keys: [...K, ...K.slice(0, -1).reverse()], loop: true, per: 4800, A: K[0], B: K[4], props: [{ k: "seg", a: "knL", b: "knR", w: 2.2 }] };
};
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
T.jacks = () => {
  // a small hop each time: the feet leave the floor as they go out and as they come back in
  const closed = { al: [112, G], ar: [128, G], aL: 8, aR: 8 }, open = { hip: 72, al: [92, G], ar: [148, G], aL: 160, aR: 160 };
  const air = { hip: 62, al: [100, G - 8], ar: [140, G - 8], aL: 84, aR: 84 };
  return { view: "front", keys: [closed, air, open, air, closed], loop: true, per: 1800, A: closed, B: open };
};
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
  [/Good Morning/, n => T.hinge({ gm: 1, band: /Band/.test(n) })],
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
  [/Walking Lunge/, n => T.walklunge({ eq: /Dumbbell/.test(n) ? "db" : "" })],
  [/Reverse Lunge/, n => T.lunge({ reverse: 1, eq: /Dumbbell/.test(n) ? "db" : "" })],
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
  [/Isometric Palm Press/, () => T.palmpress()],
  [/Banded Chest Fly/, () => T.flyTop({ band: 1 })],
  [/Cable\/Machine Fly/, () => T.flyTop()],
  [/Pike Push Up/, () => T.pushup({ pike: 1 })],
  [/Decline Push Up/, () => T.pushup({ decline: 1 })],
  [/Wall Push Up/, () => T.pushup({ wall: 1 })],
  [/Wall Triceps Extension/, () => T.walltri()],
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
  [/Prone Y-T Raise/, () => T.ytraise()],
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
  [/Towel Isometric Curl/, () => T.curl({ towel: 1 })],
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
  if (m.h3) { o.h3 = p.h3; o.pole = p.pole || [0, 1, 1]; if (m.h3n) o.h3n = Math.hypot(...p.h3); }
  else if (m.ua) { o.ua = p.ua; o.fa = p.fa ?? p.ua; }
  else if (m.aa) o.aa = p.aa;
  else if (m.er) { o.er = p.er; if (p.fa != null) o.fa = p.fa; else o.hr = p.hr; }
  else if (m.hh) o.hh = p.hh;
  else { o.hand = J.hand; o.hand2 = J.hand2; }
  if (m.ua2) { o.ua2 = p.ua2; o.fa2 = p.fa2 ?? p.ua2; } else if (m.h2) o.hand2 = J.hand2;   // far arm doing its own thing
  if (m.cr) { o.cr = p.cr; o.crank = p.crank; return o; }
  if (m.ta) { o.ta = p.ta; o.sa = p.sa; } else o.an = J.ankle;
  if (m.ta2) { o.ta2 = p.ta2; o.sa2 = p.sa2 ?? p.ta2; }
  else if (m.ar2) o.ar2 = p.ar2; else if (!m.ta || m.an2) o.an2 = J.ankle2;
  return o;
}
/* which settings every frame shares, so they blend as settings (angles, 3D hands) instead of as positions */
function flags(list) {
  const all = q => list.every(x => x[q] != null), any = q => list.some(x => x[q] != null);
  return { h3: all("h3"), h3n: list.some(x => x.arc), ua: all("ua"), aa: all("aa"), er: all("er"), pin: all("pin"), hh: all("hh"), ta: all("ta"),
    ar2: all("ar2"), an2: all("an2"), ua2: all("ua2"), ta2: all("ta2"), cr: all("cr"), h2: any("hand2") || any("ht2") || any("hr2") };
}
function normFront(p) {
  const o = { lean: p.lean || 0, cx: p.cx ?? 120, hip: p.hip ?? 69, ebl: p.ebl ?? -1, ebr: p.ebr ?? 1, kbl: p.kbl ?? 1, kbr: p.kbr ?? -1, ay: p.ay ?? 6, plane: p.plane, rot: p.rot || 0, piv: p.piv };
  const J = frontJoints(p);
  o.al = J.anL; o.ar = J.anR; o.fs = p.fs ?? 1; if (p.kL) { o.kL = p.kL; o.kR = p.kR; }
  if (p.uL != null) { o.uL = p.uL; o.fL = p.fL ?? p.uL; } else if (p.hl) o.hl = p.hl; else o.aL = p.aL ?? 7;
  if (p.uR != null) { o.uR = p.uR; o.fR = p.fR ?? p.uR; } else if (p.hr) o.hr = p.hr; else o.aR = p.aR ?? 7;
  return o;
}
function norm(d, list) {
  const m = flags(list);
  return d.view === "front" ? list.map(normFront) : list.map(q => normSide(q, m));
}
function frames(d) {
  if (!d.nA) { const all = [d.A, d.B, ...(d.mid ? [d.mid] : [])], n = norm(d, all); d.nA = n[0]; d.nB = n[1]; d.nM = n[2]; }
  return [d.nA, d.nB];
}
function keyNorm(d) {
  if (!d.nK) d.nK = norm(d, d.keys);
  return d.nK;
}
/* the pose at k (0..1): A to B, through mid if there is one, or along a chain of keyframes */
function mid3(d, k) {
  if (d.keys) { const K = keyNorm(d), n = K.length - 1, x = Math.min(n - 1e-6, Math.max(0, k * n)), i = Math.floor(x); return mix(K[i], K[i + 1], x - i); }
  const [A, B] = frames(d);
  if (!d.nM) return mix(A, B, k);
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
/* Filmed clips (videos.js) win over the drawing. If a clip can't load (offline, missing file) the drawing takes over. */
const vidFor = n => { const V = root.AdonisVideos; return V && Object.prototype.hasOwnProperty.call(V, n) ? "videos/" + V[n] : null; };
const attr = s => String(s).replace(/[&"<>]/g, c => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]);
function fillOne(box) {
  const name = box.dataset.demo, src = box.dataset.vidfail === name ? null : vidFor(name);
  if (box.dataset.filled === name) {
    const v = box.querySelector("video");
    if (v) { if (!reduced() && v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } }
    else if (!reduced()) running.add(box);
    return;
  }
  if (src) {
    running.delete(box); box.hidden = false; box.dataset.filled = name;
    box.innerHTML = `<video class="demo-vid" src="${attr(src)}" muted loop playsinline preload="metadata"${reduced() ? " controls" : " autoplay"} aria-label="${attr(name)} demo video"></video>`;
    box.querySelector("video").addEventListener("error", () => { box.dataset.vidfail = name; delete box.dataset.filled; fillOne(box); kick(); });
    return;
  }
  const d = demoFor(name);
  if (!d) { box.innerHTML = ""; box.hidden = true; return; }
  box.hidden = false; box.dataset.filled = name;
  box.innerHTML = (reduced()
    ? `<div class="demo-pair">${svg(name, 0)}${svg(name, 1)}</div><div class="demo-cap">Start and finish</div>`
    : svg(name, 0)) + (d.cap ? `<div class="demo-cap">${d.cap}</div>` : "");
  if (!reduced()) running.add(box);
}
function kick() { if (running.size && !raf && typeof requestAnimationFrame === "function") raf = requestAnimationFrame(tick); }
/* fill every [data-demo] inside el that hasn't been filled yet */
function fill(el) {
  (el || document).querySelectorAll("[data-demo]").forEach(fillOne);
  kick();
}
root.AdonisDemos = { has: n => !!(vidFor(n) || demoFor(n)), svg, fill, demoFor, video: vidFor };
})(typeof window !== "undefined" ? window : globalThis);
