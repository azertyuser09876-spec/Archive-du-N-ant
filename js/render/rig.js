/* Corps vivants (1.18) : les membres de chaque créature, articulés et procéduraux.
   - Pattes : chaque pied reste planté au sol tant que le corps n'est pas trop loin, puis fait
     un pas en arc vers sa position de repos (un peu en avant si la créature avance) ; les pattes
     d'un même groupe marchent ensemble, en alternance avec l'autre (diagonales d'un quadrupède,
     trépied d'un insecte). Le genou se place par cinématique inverse à deux segments.
   - Chaînes : queues, tentacules, antennes, cous, tiges ; des points qui suivent leur attache avec
     retard, gardent leur longueur, reviennent vers leur direction de repos, et ondulent.
   - Colonne : le corps d'un serpent ou d'un ver suit la trace réelle de sa tête.
   - Ailes : un battement propre (rapide en vol, lent en planant, replié au repos), qui se lève
     avant une attaque.
   - Regard : la tête se tourne vers la cible (bornée), sinon regarde autour.
   Rig.SPECS[forme](art, def) décrit les membres ; Rig.update(e, dt) les fait vivre (dans le monde) ;
   les formes les dessinent dans leur repère local (Rig.foot, Rig.chain, Rig.spine, Rig.flap, Rig.look).
   Sans état (icônes, Archive), tout est dessiné au repos. */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;
  const TAU = Math.PI * 2;

  const Rig = (AN.Rig = {});
  const SPECS = (Rig.SPECS = {});
  const CACHE = {};
  /** Les membres d'une espèce (gardés par espèce). */
  Rig.spec = function (def) {
    if (!def || !def.art) return null;
    if (CACHE[def.id] !== undefined) return CACHE[def.id];
    const f = SPECS[def.art.shape];
    return (CACHE[def.id] = f ? f(def.art, def) : null);
  };

  /* ======================= Membres de chaque forme ======================= */
  // Coordonnées en rayons (×r), repère de la créature : elle regarde vers +x.
  const pair = (xs, y, out, fwd = 0) => { const hips = [], rest = []; xs.forEach((x) => { for (const s of [-1, 1]) { hips.push([x, s * y]); rest.push([x + fwd, s * out]); } }); return { hips, rest }; };
  SPECS.quad = (A) => Object.assign(pair([0.45, -0.45], 0.32, 0.62, 0.05), { legs: { len: 0.62, style: 'paw', w: 1.6, groups: [0, 1, 1, 0], step: 0.36 },
    chains: A.tail ? { tail: { at: [-0.72, 0], dir: Math.PI, n: 5, seg: 0.26, w0: 0.25, w1: 0.07, stiff: 0.22, amp: 0.35, freq: 3.2 } } : {}, look: 0.7 });
  SPECS.stag = () => Object.assign(pair([0.42, -0.45], 0.28, 0.58, 0.04), { legs: { len: 0.7, style: 'hoof', w: 1.2, groups: [0, 1, 1, 0], step: 0.4 }, chains: {}, look: 0.6 });
  SPECS.insect = (A) => { const n = A.legs || 3, xs = []; for (let i = 0; i < n; i++) xs.push(0.25 - i * 0.28); const P = pair(xs, 0.16, 1.02, 0.08);
    return Object.assign(P, { legs: { len: 1.05, style: 'stick', w: 0.9, groups: P.hips.map((_, k) => (Math.floor(k / 2) + (k % 2)) % 2), step: 0.32 },
      chains: { antL: { at: [0.72, -0.1], dir: -0.55, n: 3, seg: 0.16, w0: 0.08, w1: 0.04, stiff: 0.35, amp: 0.25, freq: 5 }, antR: { at: [0.72, 0.1], dir: 0.55, n: 3, seg: 0.16, w0: 0.08, w1: 0.04, stiff: 0.35, amp: 0.25, freq: 5.4 } }, wings: !!A.wings, look: 0.5 }); };
  SPECS.crab = () => Object.assign(pair([0.2, -0.12, -0.44], 0.45, 1.3, -0.05), { legs: { len: 1.15, style: 'claw', w: 1.1, groups: [0, 1, 1, 0, 0, 1], step: 0.3 }, chains: {}, look: 0.3 });
  SPECS.scorpion = () => Object.assign(pair([0.25, 0.03, -0.19, -0.41], 0.25, 0.85, -0.1), { legs: { len: 0.82, style: 'stick', w: 0.9, groups: [0, 1, 1, 0, 0, 1, 1, 0], step: 0.28 }, chains: {}, look: 0.4 });
  SPECS.construct = (A) => { const n = A.legs || 2, xs = []; for (let i = 0; i < n; i++) xs.push(0.3 - (i / Math.max(1, n - 1)) * 0.6); return Object.assign(pair(xs, 0.4, 1.05, 0.12), { legs: { len: 1.0, style: 'mech', w: 1.4, groups: xs.flatMap((_, i) => [i % 2, (i + 1) % 2]), step: 0.4 }, chains: {}, look: 0.6 }); };
  SPECS.blob = (A) => (A.legs ? Object.assign(pair(A.legs > 2 ? [0.3, -0.3] : [0], 0.6, 1.02), { legs: { len: 0.5, style: 'paw', w: 1.8, foot: 1.9, groups: A.legs > 2 ? [0, 1, 1, 0] : [0, 1], step: 0.32 }, chains: {}, look: 0.4 }) : { chains: {}, look: 0.3 });
  SPECS.frog = () => ({ hips: [[0.35, -0.35], [0.35, 0.35]], rest: [[0.62, -0.62], [0.62, 0.62]], legs: { len: 0.45, style: 'paw', w: 1.2, groups: [0, 1], step: 0.3 }, chains: {}, look: 0.4 });
  SPECS.golem = () => ({ chains: {}, look: 0.5, arms: true });
  SPECS.serpent = (A) => ({ spine: { n: A.segs || 7, seg: 0.55 }, chains: {}, look: 0.9 });
  SPECS.worm = (A) => ({ spine: { n: A.segs || 4, seg: 0.62 }, chains: {}, look: 0.6 });
  SPECS.jelly = () => { const ch = {}; for (let i = 0; i < 6; i++) ch['t' + i] = { at: [-0.3, (i / 5 - 0.5) * 1.2], dir: Math.PI + (i / 5 - 0.5) * 0.4, n: 5, seg: 0.32, w0: 0.1, w1: 0.04, stiff: 0.12, amp: 0.45, freq: 2.6 + i * 0.3 }; return { chains: ch, look: 0 }; };
  SPECS.medusa = (A) => { const n = A.tentacles || 7, ch = {}; for (let k = 0; k < n; k++) ch['t' + k] = { at: [(k / (n - 1) - 0.5) * 1.3, 0.2], dir: Math.PI / 2, n: 6, seg: 0.24 + ((k * 13) % 7) / 40, w0: 0.1, w1: 0.03, stiff: 0.1, amp: 0.4, freq: 2 + k * 0.17, screen: true }; return { chains: ch, look: 0 }; };
  SPECS.hydra = (A) => { const h = A.heads || 3, ch = {}; for (let i = 0; i < h; i++) { const a = (i / (h - 1) - 0.5) * 1.3; ch['n' + i] = { at: [0.3, 0], dir: a, n: 4, seg: 0.32, w0: 0.2, w1: 0.16, stiff: 0.3, amp: 0.2, freq: 2 + i * 0.4, look: true }; } return { chains: ch, look: 0.6 }; };
  SPECS.fish = () => ({ chains: { tail: { at: [-0.85, 0], dir: Math.PI, n: 3, seg: 0.22, w0: 0.2, w1: 0.1, stiff: 0.2, amp: 0.5, freq: 6 } }, look: 0.3, fins: true });
  SPECS.whale = () => ({ chains: { tail: { at: [-0.95, 0], dir: Math.PI, n: 3, seg: 0.2, w0: 0.3, w1: 0.15, stiff: 0.15, amp: 0.35, freq: 2.2 } }, look: 0.2, fins: true });
  SPECS.snail = () => ({ chains: { eyeL: { at: [0.85, -0.12], dir: -0.45, n: 3, seg: 0.16, w0: 0.1, w1: 0.07, stiff: 0.3, amp: 0.3, freq: 1.6 }, eyeR: { at: [0.85, 0.12], dir: 0.45, n: 3, seg: 0.16, w0: 0.1, w1: 0.07, stiff: 0.3, amp: 0.3, freq: 1.9 } }, look: 0.4 });
  SPECS.moth = () => ({ chains: { antL: { at: [0.55, -0.08], dir: -0.6, n: 3, seg: 0.14, w0: 0.06, w1: 0.04, stiff: 0.35, amp: 0.3, freq: 4 }, antR: { at: [0.55, 0.08], dir: 0.6, n: 3, seg: 0.14, w0: 0.06, w1: 0.04, stiff: 0.35, amp: 0.3, freq: 4.3 } }, wings: true, look: 0.3 });
  SPECS.bird = (A) => ({ chains: {}, wings: true, look: A.owl ? 0.9 : 0.6 });
  SPECS.ray = () => ({ chains: { tail: { at: [-0.6, 0], dir: Math.PI, n: 6, seg: 0.24, w0: 0.08, w1: 0.03, stiff: 0.12, amp: 0.45, freq: 2.2 } }, wings: true, look: 0 });
  SPECS.wraith = () => ({ chains: { w0: { at: [-0.5, -0.25], dir: Math.PI + 0.3, n: 4, seg: 0.3, w0: 0.22, w1: 0.03, stiff: 0.1, amp: 0.5, freq: 2.4 }, w1: { at: [-0.55, 0], dir: Math.PI, n: 5, seg: 0.3, w0: 0.26, w1: 0.03, stiff: 0.1, amp: 0.5, freq: 2.1 }, w2: { at: [-0.5, 0.25], dir: Math.PI - 0.3, n: 4, seg: 0.3, w0: 0.22, w1: 0.03, stiff: 0.1, amp: 0.5, freq: 2.7 } }, look: 0.4 });
  SPECS.comet = () => ({ chains: { tail: { at: [-0.6, 0], dir: Math.PI, n: 7, seg: 0.32, w0: 0.6, w1: 0.05, stiff: 0.06, amp: 0.2, freq: 1.6 } }, look: 0 });
  SPECS.plant = () => ({ chains: {}, look: 0.5, sway: true });

  /* ======================= Vie des membres (dans le monde) ======================= */
  const ease = (k) => k * k * (3 - 2 * k);
  const flat = (e) => !!(AN.Art && AN.Art.NO_ROTATE && AN.Art.NO_ROTATE[e.def.art.shape]); // vue sans rotation (méduse…)
  function toW(e, lx, ly) {
    const a = flat(e) ? 0 : e.face || 0;
    const r = e.r || 10, c = Math.cos(a), s = Math.sin(a);
    return { x: e.x + (c * lx - s * ly) * r, y: e.y + (s * lx + c * ly) * r };
  }
  /** Fait vivre les membres. X (facultatif) : pour viser la cible du regard. */
  Rig.update = function (e, dt, X) {
    const S = Rig.spec(e.def);
    if (!S || !(dt > 0)) return;
    const R = e.rig || (e.rig = { legs: null, chains: {}, trail: [], look: 0, flap: Math.random() * TAU, t: Math.random() * 10, tuck: 0, wave: Math.random() * TAU, fold: 0, raise: 0 });
    R.t += dt;
    const P = AN.Motion ? AN.Motion.profile(e.def) : { gait: 1, flap: 10 };
    const m = e.mo || { sp: 0 };
    const r = e.r || 10;
    // ---- pattes ----
    if (S.legs && S.hips) {
      const L = S.legs;
      if (!R.legs) R.legs = S.hips.map((h, i) => { const w = toW(e, S.rest[i][0], S.rest[i][1]); return { fx: w.x, fy: w.y, mv: null, lift: 0 }; });
      const vx = e.vx || 0, vy = e.vy || 0;
      const busy = (g) => R.legs.some((l, k) => l.mv && L.groups[k] !== g);
      const dur = U.clamp((0.1 + r * 0.004) / Math.max(0.6, P.gait), 0.09, 0.32);
      R.legs.forEach((l, i) => {
        const rest = toW(e, S.rest[i][0], S.rest[i][1]);
        const d = Math.hypot(rest.x - l.fx, rest.y - l.fy);
        if (d > r * 4) { l.fx = rest.x; l.fy = rest.y; l.mv = null; l.lift = 0; return; } // téléporté, projeté : il retombe sur ses pieds
        if (l.mv) {
          l.mv.t += dt / l.mv.dur;
          const k = Math.min(1, l.mv.t);
          l.fx = U.lerp(l.mv.x0, l.mv.x1, ease(k)); l.fy = U.lerp(l.mv.y0, l.mv.y1, ease(k));
          l.lift = Math.sin(k * Math.PI);
          if (k >= 1) { l.mv = null; l.lift = 0; }
        } else if (d > L.step * r && (!busy(L.groups[i]) || d > L.step * r * 2.2)) {
          // le pied se pose un peu en avant, selon sa vitesse (jamais plus loin que son pas)
          const v = Math.hypot(vx, vy), lead = v > 0 ? Math.min(v * dur * 0.9, L.step * r * 1.4) / v : 0;
          l.mv = { t: 0, dur, x0: l.fx, y0: l.fy, x1: rest.x + vx * lead, y1: rest.y + vy * lead };
        }
      });
    }
    // pieds rentrés : quand elle tournoie, se roule en boule ou s'élève (saut, bond)
    const spin = (e.act && e.act.spec && e.act.spec.form === 'toupie') || e.shellT > 0;
    const air = e._pose ? U.clamp((e._pose.lift - r * 0.25) / (r * 0.5), 0, 1) : 0;
    R.tuck += ((spin ? 1 : air) - (R.tuck || 0)) * Math.min(1, dt * 10);
    // ---- chaînes ----
    for (const key in S.chains) {
      const C = S.chains[key];
      let pts = R.chains[key];
      const a0 = toW(e, C.at[0], C.at[1]);
      const look = C.look ? R.look * 0.8 : 0;
      const base = (flat(e) ? 0 : e.face || 0) + C.dir + look;
      if (!pts) { pts = R.chains[key] = []; for (let i = 0; i <= C.n; i++) pts.push({ x: a0.x + Math.cos(base) * C.seg * r * i, y: a0.y + Math.sin(base) * C.seg * r * i }); }
      pts[0].x = a0.x; pts[0].y = a0.y;
      const k = 1 - Math.pow(1 - C.stiff, dt * 60);
      const sway = (m.sp > 20 ? 1 : 0.6);
      for (let i = 1; i <= C.n; i++) {
        const a = base + Math.sin(R.t * C.freq - i * 0.8) * C.amp * (i / C.n) * sway;
        const tx = pts[i - 1].x + Math.cos(a) * C.seg * r, ty = pts[i - 1].y + Math.sin(a) * C.seg * r;
        pts[i].x += (tx - pts[i].x) * k; pts[i].y += (ty - pts[i].y) * k;
        const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y, dl = Math.hypot(dx, dy) || 1;
        pts[i].x = pts[i - 1].x + (dx / dl) * C.seg * r; pts[i].y = pts[i - 1].y + (dy / dl) * C.seg * r;
      }
    }
    // ---- colonne : la trace de la tête ----
    if (S.spine) {
      const seg = S.spine.seg * r, T = R.trail;
      const last = T[0];
      if (!last || Math.hypot(e.x - last.x, e.y - last.y) > seg * 0.25) T.unshift({ x: e.x, y: e.y });
      const maxLen = (S.spine.n + 2) * seg * 1.3;
      let acc = 0;
      for (let i = 1; i < T.length; i++) { acc += Math.hypot(T[i].x - T[i - 1].x, T[i].y - T[i - 1].y); if (acc > maxLen) { T.length = i + 1; break; } }
      R.wave += ((m.sp || 0) / r) * dt * 0.9 + dt * 0.7;
    }
    // ---- regard ----
    let want = (m.look || 0) * 0.65; // le corps a déjà tourné d'un tiers (Motion.pose)
    if (e._seenT > 0) e._seenT -= dt;
    const tg = (e.act && e.act.tgt) || (e._seenT > 0 ? e._seen : null) || (X && X.player && e.state === 'attack' ? X.player : null);
    if (tg && S.look) want = U.clamp(U.angDiff(e.face || 0, Math.atan2(tg.y - e.y, tg.x - e.x)), -S.look, S.look);
    R.look += (want - R.look) * Math.min(1, dt * 6);
    // ---- ailes ----
    if (S.wings) {
      const flying = e.def.move === 'fly' || e.def.move === 'drift' || e.def.move === 'blink';
      const f = flying ? P.flap * (m.sp > 20 ? 1 : 0.75) : m.sp > 20 ? P.flap * 0.5 : 0;
      R.flap += dt * f;
      R.fold += ((flying && !e.downed) || m.sp > 20 ? -R.fold : 1 - R.fold) * Math.min(1, dt * 4);
      if (e.act && e.act.phase === 'windup') R.raise = Math.min(1, (R.raise || 0) + dt * 4); else R.raise = Math.max(0, (R.raise || 0) - dt * 3);
    }
  };

  /* ======================= Lecture, dans le repère local ======================= */
  /** Monde → repère local du dessin (rotation, étirement, décalages de la pose : Art.draw les note dans e._xf). */
  function toL(e, x, y) {
    const r = e.r || 10, F = e._xf || { x: e.x, y: e.y, a: flat(e) ? 0 : e.face || 0, sx: 1, sy: 1, m: 1 }; // sans dessin : le repère du corps
    const dx = (x - F.x) * F.m, dy = y - F.y, c = Math.cos(F.a), s = Math.sin(F.a);
    return { x: (c * dx + s * dy) / F.sx / r, y: (-s * dx + c * dy) / F.sy / r };
  }
  /** Le pied i : { x, y, lift } en rayons ; au repos sans état. */
  Rig.foot = function (e, i) {
    const S = Rig.spec(e.def), R = e.rig;
    if (!R || !R.legs || !R.legs[i]) return { x: S.rest[i][0], y: S.rest[i][1], lift: 0 };
    const l = R.legs[i], q = toL(e, l.fx, l.fy), k = R.tuck || 0;
    if (k > 0.01) { const h = S.hips[i], tx = U.lerp(h[0], S.rest[i][0], 0.55), ty = U.lerp(h[1], S.rest[i][1], 0.55); return { x: U.lerp(q.x, tx, k), y: U.lerp(q.y, ty, k), lift: Math.max(l.lift, k) }; }
    return { x: q.x, y: q.y, lift: l.lift };
  };
  /** Les points d'une chaîne, en rayons ; droite au repos sans état. */
  Rig.chain = function (e, key) {
    const S = Rig.spec(e.def), C = S && S.chains[key], R = e.rig;
    if (!C) return [];
    if (!R || !R.chains[key]) { const out = []; for (let i = 0; i <= C.n; i++) out.push({ x: C.at[0] + Math.cos(C.dir) * C.seg * i, y: C.at[1] + Math.sin(C.dir) * C.seg * i }); return out; }
    const out = R.chains[key].map((p) => toL(e, p.x, p.y));
    out[0] = { x: C.at[0], y: C.at[1] }; // l'attache reste sur le corps
    return out;
  };
  /** Les anneaux d'une colonne (le premier à la tête), en rayons ; en ligne derrière elle sans trace. */
  Rig.spine = function (e) {
    const S = Rig.spec(e.def), R = e.rig;
    if (!S || !S.spine) return [];
    const n = S.spine.n, seg = S.spine.seg * (e.r || 10), out = [{ x: 0, y: 0 }];
    if (!R || R.trail.length < 2) { for (let i = 1; i <= n; i++) out.push({ x: -i * S.spine.seg, y: 0 }); return out; }
    const T = R.trail;
    let j = 0, acc = 0, want = seg;
    const px = e.x, py = e.y;
    for (let i = 1; i <= n; i++) {
      // le point de la trace à la distance i × seg de la tête
      while (j < T.length - 1) {
        const ax = j === 0 ? px : T[j].x, ay = j === 0 ? py : T[j].y;
        const bx = T[j + 1].x, by = T[j + 1].y, l = Math.hypot(bx - ax, by - ay);
        if (acc + l >= want) { const k = (want - acc) / (l || 1); const q = toL(e, ax + (bx - ax) * k, ay + (by - ay) * k); out.push(q); break; }
        acc += l; j++;
      }
      if (out.length <= i) { const prev = out[out.length - 1]; out.push({ x: prev.x - S.spine.seg, y: prev.y }); } // la trace est courte : en ligne
      want += seg;
    }
    // l'onde qui court le long du corps, de la tête vers la queue, en travers de sa trace
    for (let i = 1; i <= n; i++) {
      const a = out[i - 1], b = out[i], dx = a.x - b.x, dy = a.y - b.y, dl = Math.hypot(dx, dy) || 1;
      const w = Math.sin(R.wave - i * 0.85) * 0.32 * Math.min(1, i / 2.5);
      b.x += (-dy / dl) * w; b.y += (dx / dl) * w;
    }
    return out;
  };
  /** Le battement des ailes : { v (−1 → 1), fold (0 → 1, repliées), raise (0 → 1, levées avant une attaque) }. */
  Rig.flap = function (e, t, mul = 1) {
    const R = e.rig;
    if (!R) return { v: Math.sin((t * 8 + (e.seed || 0)) * mul), fold: 0, raise: 0 };
    return { v: Math.sin(R.flap * mul), fold: R.fold || 0, raise: R.raise || 0 };
  };
  /** Le regard de la tête, relatif au corps (radians). */
  Rig.look = (e) => (e.rig ? e.rig.look : 0);
  /** Le geste de l'attaque en cours : w (0 → 1, la préparation), s (1 à la frappe, puis retombe). */
  Rig.act = function (e) {
    const A = e.act;
    if (!A || !A.spec) return { w: 0, s: 0 };
    if (A.phase === 'windup') return { w: ease(U.clamp(A.t / Math.max(0.05, A.spec.windup || 0.3), 0, 1)), s: 0 };
    if (A.phase === 'active') return { w: 0, s: 1 };
    return { w: 0, s: 1 - ease(U.clamp(A.t / Math.max(0.05, A.spec.recover || 0.3), 0, 1)) };
  };
  /** Tourne le contexte autour du cou (px, en px locaux) selon le regard ; à refermer par ctx.restore(). */
  Rig.head = function (ctx, e, px, k = 1) {
    ctx.save();
    const a = Rig.look(e) * k;
    if (a) { ctx.translate(px, 0); ctx.rotate(a); ctx.translate(-px, 0); }
  };
  /** Tourne un point (x, y) autour d'un pivot (px, py) de l'angle du regard. */
  Rig.turn = function (e, x, y, px, py, k = 1) {
    const a = Rig.look(e) * k, c = Math.cos(a), s = Math.sin(a), dx = x - px, dy = y - py;
    return [px + c * dx - s * dy, py + s * dx + c * dy];
  };

  /* ======================= Dessin des membres ======================= */
  /** Une patte de la hanche (hx, hy) au pied i, coude placé par cinématique inverse (en px locaux). */
  Rig.drawLeg = function (ctx, e, i, r, lw, pal) {
    const S = Rig.spec(e.def), L = S.legs, h = S.hips[i];
    const f = Rig.foot(e, i);
    const hx = h[0] * r, hy = h[1] * r;
    let fx = f.x * r, fy = f.y * r;
    const len = L.len * r;
    let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy) || 1;
    if (d > len * 1.7) { fx = hx + (dx / d) * len * 1.7; fy = hy + (dy / d) * len * 1.7; dx = fx - hx; dy = fy - hy; d = len * 1.7; } // jamais plus loin
    // le genou : sur la médiatrice ; vers l'extérieur pour un insecte, sous le corps pour un mammifère ; patte tendue au-delà de sa longueur
    const bend = Math.sqrt(Math.max(0, (len / 2) ** 2 - (d / 2) ** 2));
    const nx = -dy / d, ny = dx / d, mx = (hx + fx) / 2, my = (hy + fy) / 2;
    const far = (mx + nx) ** 2 + (my + ny) ** 2 > (mx - nx) ** 2 + (my - ny) ** 2;
    const sgn = (L.style === 'paw' || L.style === 'hoof') === far ? -1 : 1;
    const kx = mx + nx * bend * sgn, ky = my + ny * bend * sgn;
    const lift = f.lift || 0, w = lw * L.w;
    ctx.lineCap = 'round';
    ctx.strokeStyle = pal.dark;
    if (L.style === 'stick') {
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.arc(kx, ky, w * 0.7, 0, TAU); ctx.fill();
    } else if (L.style === 'claw') {
      ctx.lineWidth = w * 1.2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.stroke();
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = pal.adark; ctx.beginPath(); ctx.arc(kx, ky, w * 0.8, 0, TAU); ctx.fill();
    } else if (L.style === 'mech') {
      ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(kx, ky, r * 0.09, 0, TAU); ctx.fill();
      ctx.fillStyle = pal.dark; ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.13 * (1 + lift * 0.25), r * 0.09 * (1 + lift * 0.25), Math.atan2(dy, dx), 0, TAU); ctx.fill();
    } else { // patte, sabot : un membre épais et un pied
      ctx.lineWidth = w * (L.style === 'hoof' ? 0.8 : 1); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = L.style === 'hoof' ? pal.adark : pal.dark;
      const fs = (L.foot || 1) * (1 + lift * 0.3);
      ctx.beginPath(); ctx.ellipse(fx, fy, r * 0.17 * fs, r * 0.12 * fs, Math.atan2(dy, dx), 0, TAU); ctx.fill();
    }
    ctx.lineCap = 'butt';
  };
  /** Toutes les pattes. */
  Rig.drawLegs = function (ctx, e, r, lw, pal) {
    const S = Rig.spec(e.def);
    if (!S || !S.legs) return;
    for (let i = 0; i < S.hips.length; i++) Rig.drawLeg(ctx, e, i, r, lw, pal);
  };
  /** Une chaîne effilée, en px locaux. */
  Rig.drawChain = function (ctx, e, key, r, lw, color, w0, w1) {
    const S = Rig.spec(e.def), C = S.chains[key], pts = Rig.chain(e, key);
    if (pts.length < 2) return pts;
    const a = w0 != null ? w0 : C.w0, b = w1 != null ? w1 : C.w1;
    ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      ctx.lineWidth = Math.max(0.8, U.lerp(a, b, (i - 1) / Math.max(1, pts.length - 2)) * r);
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x * r, pts[i - 1].y * r); ctx.lineTo(pts[i].x * r, pts[i].y * r); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    return pts;
  };
})();
