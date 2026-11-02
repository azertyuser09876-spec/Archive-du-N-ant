/* Les colosses (1.16) : les maîtres de rang 3 et plus deviennent des corps immenses.
   - Un squelette procédural (nœuds et capsules) animé pas à pas : jambes qui se posent
     et se lèvent, corps de serpent qui suit sa tête, ailes qui battent, bras qui tournent.
     Chaque nœud a une hauteur (z) : le corps est dessiné au-dessus de son ombre.
   - Pas de tirs : il frappe avec son corps (piétinement, balayage, morsure, charge,
     plongeon, rotation), et chaque coup a sa préparation visible.
   - On ne l'use pas : on brise ses sceaux (D.COLOSSI). Ceux « du bas » se découvrent quand
     il se découvre (pied planté, tête étourdie, ventre au ras du sol, bras au repos) ; ceux
     « du haut » s'atteignent en grimpant sur lui (E près d'une partie basse de son corps),
     avec une endurance de prise qu'il met à l'épreuve en se secouant.
   - Il erre dans sa zone, enjambe le relief, et ne se réveille qu'à votre approche.
   Le colosse reste une créature (e) : e.x, e.y suivent son centre, e.hp reflète ses sceaux,
   l'épuisement, la capture et les formes de capture des échelons ne changent pas. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const I = AN.Input;
  const TAU = Math.PI * 2;

  const Co = (AN.Colossus = {});
  /** Hauteur au-dessous de laquelle une partie du corps se saisit depuis le sol. */
  Co.GRAB_Z = 0.45;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ease = (k) => k * k * (3 - 2 * k);

  Co.def = (id) => D.COLOSSI && D.COLOSSI[id];
  /** Les plus gros sont la carte (1.16.3) : la zone du cœur, c'est leur corps, et le vide tout autour. */
  Co.isMap = (def) => !!(def && Co.def(def.id) && def.tier >= (D.COLOSSUS_MAP_TIER || 99));
  /** Sa longueur : selon son rang, sa taille propre, et trois fois plus pour un colosse-carte (1.16.4). */
  Co.length = (def) => (D.COLOSSUS_LENGTH[def.tier] || 1000) * ((Co.def(def.id) || {}).size || 1) * (Co.isMap(def) ? D.COLOSSUS_MAP_SCALE || 1 : 1);
  Co.is = (e) => !!(e && e.col);

  /* ======================= Géométrie ======================= */
  function local(col, lx, ly, a = col.a) {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: col.x + c * lx - s * ly, y: col.y + s * lx + c * ly };
  }
  function setN(col, k, x, y, z) {
    let n = col.n[k];
    if (!n) n = col.n[k] = { x, y, z, under: false };
    n.x = x; n.y = y; n.z = z;
    return n;
  }
  /*
   * Perspective (1.16) : chaque point a sa hauteur, et il est projeté selon elle. Plus il est
   * haut, plus il s'écarte du centre de la vue et grandit (parallaxe : quand la caméra bouge,
   * le haut glisse plus vite que le bas), et il s'élève un peu. Plusieurs hauteurs à la fois :
   * pieds, genoux, torse, tête, ailes ont chacun la leur. L'ombre, elle, reste au sol.
   */
  const V = (Co.view = { x: 0, y: 0, k: 0.18, on: false });
  Co.setView = (cam) => { if (cam && Number.isFinite(cam.x)) { V.x = cam.x; V.y = cam.y; V.on = true; } };
  Co.proj = function (x, y, z, lift, k) {
    const zz = Math.max(0, z), s = 1 + (k != null ? k : V.k) * zz;
    if (!V.on) return { x, y: y - zz * lift, s: 1 };
    return { x: V.x + (x - V.x) * s, y: V.y + (y - V.y) * s - zz * lift, s };
  };
  const liftOf = (col) => col.ZH * 0.6;
  const PN = (col, n) => Co.proj(n.x, n.y, n.z, liftOf(col), col.persp); // un colosse-carte : une perspective plus douce (1.16.4)
  Co.pn = PN;
  const sx = (col, n) => PN(col, n).x;
  const sy = (col, n) => PN(col, n).y;
  /** Point d'une capsule : t le long, off en travers (−1 à 1). Position dessinée (x, y), au sol (gx, gy), hauteur z, échelle s. */
  function capPoint(col, c, t, off = 0) {
    const A = col.n[c.a], B = col.n[c.b];
    const pa = PN(col, A), pb = PN(col, B);
    const gx = U.lerp(A.x, B.x, t), gy = U.lerp(A.y, B.y, t), z = U.lerp(A.z, B.z, t), s = U.lerp(pa.s, pb.s, t);
    const r = U.lerp(c.ra, c.rb, t) * s;
    if (c.disc) { // un disque (le moyeu d'une roue) : t le traverse de gauche à droite, off de haut en bas
      const u = t * 2 - 1, k = Math.sqrt(Math.max(0, 1 - u * u)) * off, r0 = U.lerp(c.ra, c.rb, t) * 0.85;
      return { x: (pa.x + pb.x) / 2 + u * r * 0.85, y: (pa.y + pb.y) / 2 + k * r * 0.85, gx: (A.x + B.x) / 2 + u * r0, gy: (A.y + B.y) / 2 + k * r0, z, r, s, under: A.under && B.under };
    }
    if (c.stadium && (t < 0 || t > 1)) { // au-delà d'un bout : sur sa rondeur (le dos d'un colosse-carte, 1.16.4)
      const len = Math.hypot(B.x - A.x, B.y - A.y) || 1, rr = t < 0 ? c.ra : c.rb, du = (t < 0 ? -t : t - 1) * len;
      const avail = Math.sqrt(Math.max(0, rr * rr - du * du)) / Math.max(1, rr), tc = U.clamp(t, 0, 1);
      const zc = U.lerp(A.z, B.z, tc), sc = U.lerp(pa.s, pb.s, tc), rc = rr * sc;
      const ex = U.lerp(pa.x, pb.x, t), ey = U.lerp(pa.y, pb.y, t), dx = pb.x - pa.x, dy = pb.y - pa.y, l = Math.hypot(dx, dy) || 1;
      const o = off * rc * 0.85 * avail;
      const gdx = B.x - A.x, gdy = B.y - A.y, go = off * rr * 0.85 * avail;
      return { x: ex + (-dy / l) * o, y: ey + (dx / l) * o, gx: U.lerp(A.x, B.x, t) + (-gdy / len) * go, gy: U.lerp(A.y, B.y, t) + (gdx / len) * go, z: zc, r: rc * avail, s: sc, under: A.under && B.under };
    }
    let x = U.lerp(pa.x, pb.x, t), y = U.lerp(pa.y, pb.y, t);
    if (off) {
      const dx = pb.x - pa.x, dy = pb.y - pa.y, l = Math.hypot(dx, dy) || 1;
      x += (-dy / l) * off * r * 0.85; y += (dx / l) * off * r * 0.85;
    }
    return { x, y, gx, gy, z, r, s, under: A.under && B.under };
  }
  Co.capPoint = capPoint;
  /** Plus proche point d'une capsule, en position dessinée ({ t, d } ; d négatif à l'intérieur). */
  function closest(col, c, x, y, ground) {
    const A = col.n[c.a], B = col.n[c.b];
    const pa = ground ? { x: A.x, y: A.y, s: 1 } : PN(col, A), pb = ground ? { x: B.x, y: B.y, s: 1 } : PN(col, B);
    const ax = pa.x, ay = pa.y, bx = pb.x, by = pb.y;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = U.clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const px = ax + dx * t, py = ay + dy * t;
    return { t, d: Math.hypot(x - px, y - py) - U.lerp(c.ra * pa.s, c.rb * pb.s, t) };
  }
  Co.closest = closest;
  const visible = (col, c) => !(col.n[c.a].under && col.n[c.b].under) && !c.hide;

  function addCap(col, a, b, ra, rb, o = {}) {
    const c = Object.assign({ a, b, ra, rb, grip: true, flat: false, part: '' }, o);
    c.i = col.caps.length;
    col.caps.push(c);
    return c;
  }
  function anchor(col, name, cap, t, off = 0) { col.anchors[name] = { cap: cap.i, t, off }; }

  /** La bouche (origine des souffles) : la tête, projetée. */
  function setMouth(col, n) { const q = PN(col, n); col.mouth.x = q.x; col.mouth.y = q.y; }

  /* ======================= Jambes (bipède, quadrupède, araignée) ======================= */
  function makeLeg(col, name, hipL, restL, o = {}) {
    const leg = Object.assign({ name, hip: 'hanche_' + name, knee: 'genou_' + name, foot: 'pied_' + name, hl: hipL, rest: restL, fx: 0, fy: 0, fz: 0, mv: null, stuck: 0, act: null, group: 0 }, o);
    const p = local(col, restL[0], restL[1]);
    leg.fx = p.x; leg.fy = p.y;
    col.legs.push(leg);
    return leg;
  }
  function poseLegs(X, e, col, dt, hipZ, kneeUp, stride, maxMove, stepDur, bend) {
    const vx = col.vx || 0, vy = col.vy || 0;
    let moving = col.legs.filter((l) => l.mv).length;
    col.legs.forEach((leg, i) => {
      const h = local(col, leg.hl[0], leg.hl[1]);
      setN(col, leg.hip, h.x, h.y, hipZ);
      if (leg.stuck > 0) leg.stuck -= dt;
      const rest = local(col, leg.rest[0], leg.rest[1]);
      rest.x += vx * 0.3; rest.y += vy * 0.3;
      if (leg.act) { /* une attaque mène ce pied */ }
      else if (leg.mv) {
        const m = leg.mv;
        m.t += dt / m.dur;
        const k = ease(Math.min(1, m.t));
        leg.fx = U.lerp(m.x0, m.x1, k); leg.fy = U.lerp(m.y0, m.y1, k);
        leg.fz = Math.sin(Math.min(1, m.t) * Math.PI) * m.h;
        if (m.t >= 1) { leg.mv = null; leg.fz = 0; land(X, e, col, leg, 0.45); }
      } else if (leg.stuck <= 0 && !col.down && moving < maxMove && (col.legs.length < 3 || col.legs.some((o) => o.mv && o.group === leg.group) || !col.legs.some((o) => o.mv))) {
        const d = Math.hypot(rest.x - leg.fx, rest.y - leg.fy);
        if (d > stride) {
          const ahead = Math.hypot(vx, vy) > 5 ? 0.45 : 0;
          leg.mv = { t: 0, dur: stepDur * Math.max(1, d / (col.L * 0.25)), x0: leg.fx, y0: leg.fy, x1: rest.x + vx * ahead, y1: rest.y + vy * ahead, h: 0.28 + Math.min(0.3, d / col.L) }; // un grand pas prend plus de temps
          moving++;
        }
      }
      if (col.down) { leg.fx += (rest.x - leg.fx) * Math.min(1, dt * 1.2); leg.fy += (rest.y - leg.fy) * Math.min(1, dt * 1.2); leg.fz += (0 - leg.fz) * Math.min(1, dt * 3); }
      const f = setN(col, leg.foot, leg.fx, leg.fy, leg.fz);
      // le genou : à mi-chemin, rejeté vers l'extérieur du corps, et plus haut
      const mx = (h.x + f.x) / 2, my = (h.y + f.y) / 2;
      let ox = mx - col.x, oy = my - col.y; const ol = Math.hypot(ox, oy) || 1; ox /= ol; oy /= ol;
      setN(col, leg.knee, mx + ox * bend, my + oy * bend, (hipZ + f.z) / 2 + kneeUp);
    });
  }
  /** Un pied qui se pose : malheur à qui est dessous. */
  function land(X, e, col, leg, mul) {
    if (!X.cam) return; // hors d'une expédition (tests) : rien à écraser
    const f = col.n[leg.foot];
    const r = col.footR;
    if (X.cam && U.dist(f.x, f.y, X.player.x, X.player.y) < 900) { X.cam.shake(Math.min(6, col.L / 160)); AN.Audio.play('land', { pitch: 0.35, gap: 0.12 }); }
    FX.ring(f.x, f.y, U.rgba(e.pal.dark, 0.6), r * 0.6, r * 1.6, 0.35, 3);
    groundHit(X, e, f.x, f.y, r, col.dmg * mul, 260);
  }
  /** Coup porté au sol (rayon r) : joueur (s'il n'est pas sur ce colosse), compagnons, hexagone. */
  function groundHit(X, e, x, y, r, dmg, knock) {
    for (const t of AN.Combat.enemiesOf(X, 'wild')) {
      if (t.kind === 'player' && t.climb) continue;
      if (U.dist(t.x, t.y, x, y) <= r + (t.r || 12)) AN.Combat.hit(X, t, dmg, { x, y }, { knock });
    }
  }
  /** Contact avec une capsule basse en mouvement (au sol). Une fois par attaque et par cible. */
  function capsuleHit(X, e, col, c, dmg, knock, act) {
    if (!visible(col, c)) return;
    const A = col.n[c.a], B = col.n[c.b];
    if (Math.min(A.z, B.z) > 0.55) return;
    for (const t of AN.Combat.enemiesOf(X, 'wild')) {
      if (t.kind === 'player' && t.climb) continue;
      if (act && act.hit && act.hit.has(t)) continue;
      const q = closest(col, c, t.x, t.y, true);
      if (q.d <= (t.r || 12)) {
        if (act) { act.hit = act.hit || new Set(); act.hit.add(t); }
        AN.Combat.hit(X, t, dmg, { x: U.lerp(A.x, B.x, q.t), y: U.lerp(A.y, B.y, q.t) }, { knock });
      }
    }
  }

  /* ======================= Plans de corps ======================= */
  const PLANS = {};

  /* ---------- bipède ---------- */
  PLANS.bipede = {
    build(col) {
      const L = col.L;
      col.footR = Math.min(L * 0.075, 110);
      ['bassin', 'torse', 'tete'].forEach((k) => setN(col, k, col.x, col.y, 1));
      makeLeg(col, 'g', [-L * 0.02, -L * 0.12], [0, -L * 0.17]);
      makeLeg(col, 'd', [-L * 0.02, L * 0.12], [0, L * 0.17]);
      col.legs.forEach((l, i) => { l.group = i; setN(col, l.hip, col.x, col.y, 0.9); setN(col, l.knee, col.x, col.y, 0.5); setN(col, l.foot, l.fx, l.fy, 0); });
      col.hands = ['g', 'd'].map((s, i) => ({ name: s, sh: 'epaule_' + s, el: 'coude_' + s, hand: 'main_' + s, side: i ? 1 : -1, x: col.x, y: col.y, z: 0.5, act: null, stuck: 0 }));
      col.hands.forEach((hd) => { setN(col, hd.sh, col.x, col.y, 1); setN(col, hd.el, col.x, col.y, 0.8); setN(col, hd.hand, col.x, col.y, 0.5); });
      const torso = addCap(col, 'bassin', 'torse', L * 0.15, L * 0.17, { flat: true, part: 'dos' });
      const head = addCap(col, 'torse', 'tete', L * 0.07, L * 0.085, { part: 'tete' });
      const caps = {};
      col.hands.forEach((hd) => {
        caps['ep' + hd.name] = addCap(col, 'torse', hd.sh, L * 0.08, L * 0.065, { part: 'epaule' });
        addCap(col, hd.sh, hd.el, L * 0.06, L * 0.055, { part: 'bras' });
        caps['av' + hd.name] = addCap(col, hd.el, hd.hand, L * 0.055, L * 0.05, { part: 'main' });
      });
      col.legs.forEach((l) => {
        addCap(col, 'bassin', l.hip, L * 0.09, L * 0.075, { part: 'hanche' });
        addCap(col, l.hip, l.knee, L * 0.07, L * 0.06, { part: 'cuisse' });
        caps['ti' + l.name] = addCap(col, l.knee, l.foot, L * 0.06, L * 0.05, { part: 'pied' });
      });
      anchor(col, 'dos', torso, 0.4); anchor(col, 'tete', head, 0.85);
      anchor(col, 'pied_g', caps.tig, 0.95); anchor(col, 'pied_d', caps.tid, 0.95);
      anchor(col, 'main_g', caps.avg, 0.95); anchor(col, 'main_d', caps.avd, 0.95);
      anchor(col, 'epaule_g', caps.epg, 0.85); anchor(col, 'epaule_d', caps.epd, 0.85);
    },
    pose(X, e, col, dt) {
      const L = col.L, lift = col.lift || 0, dn = U.lerp(1, 0.35, col.downK || 0);
      const bz = (0.95 + lift) * dn, sway = Math.sin(col.walk * 2) * 0.03;
      const b = setN(col, 'bassin', col.x, col.y, bz);
      const t = local(col, L * 0.12, sway * L);
      setN(col, 'torse', t.x, t.y, (1.05 + lift) * dn);
      const hd = local(col, L * (0.26 + (col.lean || 0)), sway * L * 1.5);
      setN(col, 'tete', hd.x, hd.y, (1.2 + lift + (col.rear || 0)) * dn);
      poseLegs(X, e, col, dt, (0.9 + lift) * dn, 0.12, L * 0.13, 1, 0.55 * Math.sqrt(L / 600), L * 0.06);
      col.hands.forEach((h) => {
        const sh = local(col, L * 0.1, h.side * L * 0.2);
        setN(col, h.sh, sh.x, sh.y, (1.05 + lift) * dn);
        if (h.stuck > 0) h.stuck -= dt;
        if (!h.act && h.stuck <= 0) {
          const swing = Math.sin(col.walk + (h.side > 0 ? Math.PI : 0)) * L * 0.05;
          const rest = local(col, L * 0.1 + swing, h.side * L * 0.31);
          const d = Math.hypot(rest.x - h.x, rest.y - h.y), st = Math.min(d * Math.min(1, dt * 3), 1100 * dt); // retour au repos, à vitesse bornée
          if (d > 0.5) { h.x += ((rest.x - h.x) / d) * st; h.y += ((rest.y - h.y) / d) * st; }
          h.z += ((col.down ? 0.05 : 0.5) - h.z) * Math.min(1, dt * 4);
        }
        const hn = setN(col, h.hand, h.x, h.y, h.z);
        const mx = (sh.x + hn.x) / 2, my = (sh.y + hn.y) / 2;
        const o = local(col, 0, h.side * L * 0.07); const ox = o.x - col.x, oy = o.y - col.y;
        setN(col, h.el, mx + ox, my + oy, ((1.05 + lift) * dn + hn.z) / 2 + 0.1);
      });
      setMouth(col, col.n.tete);
    },
  };

  /* ---------- quadrupède (la Tortue-Monde) ---------- */
  PLANS.quadrupede = {
    build(col) {
      const L = col.L;
      col.footR = Math.min(L * 0.08, 115);
      ['arriere', 'avant', 'cou', 'tete', 'queue'].forEach((k) => setN(col, k, col.x, col.y, 0.6));
      [['avg', 1, -1], ['avd', 1, 1], ['arg', -1, -1], ['ard', -1, 1]].forEach(([n, fx, fy], i) => {
        const l = makeLeg(col, n, [fx * L * 0.13, fy * L * 0.16], [fx * L * 0.2, fy * L * 0.36]);
        l.group = (i === 0 || i === 3) ? 0 : 1;
        setN(col, l.hip, col.x, col.y, 0.55); setN(col, l.knee, col.x, col.y, 0.4); setN(col, l.foot, l.fx, l.fy, 0);
      });
      const shell = addCap(col, 'arriere', 'avant', L * 0.22, L * 0.22, { flat: true, part: 'dos' });
      addCap(col, 'avant', 'cou', L * 0.07, L * 0.065, { part: 'cou' });
      const head = addCap(col, 'cou', 'tete', L * 0.065, L * 0.075, { part: 'tete' });
      const tail = addCap(col, 'arriere', 'queue', L * 0.06, L * 0.03, { part: 'queue' });
      const caps = {};
      col.legs.forEach((l) => {
        addCap(col, l.name.startsWith('av') ? 'avant' : 'arriere', l.hip, L * 0.08, L * 0.075, { part: 'hanche' }); // sous la carapace
        addCap(col, l.hip, l.knee, L * 0.075, L * 0.07, { part: 'cuisse' });
        caps[l.name] = addCap(col, l.knee, l.foot, L * 0.07, L * 0.065, { part: 'pied' });
      });
      anchor(col, 'dos', shell, 0.5); anchor(col, 'tete', head, 0.85); anchor(col, 'queue', tail, 0.75);
      anchor(col, 'pied_av_g', caps.avg, 0.95); anchor(col, 'pied_av_d', caps.avd, 0.95);
      anchor(col, 'pied_ar_g', caps.arg, 0.95); anchor(col, 'pied_ar_d', caps.ard, 0.95);
      col.head = { x: col.x, y: col.y, z: 0.45, down: 0 };
    },
    pose(X, e, col, dt) {
      const L = col.L, shut = col.shell || 0, dn = U.lerp(1, 0.4, col.downK || 0);
      const z = U.lerp(0.65, 0.22, shut) * dn;
      const r = local(col, -L * 0.16, 0), f = local(col, L * 0.16, 0);
      setN(col, 'arriere', r.x, r.y, z); setN(col, 'avant', f.x, f.y, z);
      const hd = col.head;
      if (hd.down > 0) hd.down -= dt;
      if (!col.headAct && hd.down <= 0) {
        const rest = local(col, L * U.lerp(0.5, 0.2, shut), Math.sin(col.walk * 0.5) * L * 0.03);
        hd.x += (rest.x - hd.x) * Math.min(1, dt * 4); hd.y += (rest.y - hd.y) * Math.min(1, dt * 4);
        hd.z += (U.lerp(0.45, 0.2, shut) * dn - hd.z) * Math.min(1, dt * 4);
      }
      const nk = { x: U.lerp(f.x, hd.x, 0.5), y: U.lerp(f.y, hd.y, 0.5) };
      setN(col, 'cou', nk.x, nk.y, (z + hd.z) / 2 + 0.05);
      setN(col, 'tete', hd.x, hd.y, hd.z);
      const q = local(col, -L * U.lerp(0.44, 0.2, shut), Math.sin(col.walk) * L * 0.04);
      setN(col, 'queue', q.x, q.y, 0.15 * dn);
      // pattes rentrées dans la carapace
      col.legs.forEach((l) => { l.restNow = l.restNow || l.rest.slice(); l.rest = [l.restNow[0] * U.lerp(1, 0.35, shut), l.restNow[1] * U.lerp(1, 0.4, shut)]; });
      poseLegs(X, e, col, dt, z * 0.85, 0.1, L * 0.11, 2, 0.6 * Math.sqrt(L / 600), L * 0.05);
      col.caps.forEach((c) => { c.hide = shut > 0.95 && (c.part === 'pied' || c.part === 'cuisse' || c.part === 'hanche' || c.part === 'tete' || c.part === 'cou' || c.part === 'queue'); });
      setMouth(col, col.n.tete);
    },
  };

  /* ---------- serpent ---------- */
  PLANS.serpent = {
    build(col) {
      const L = col.L, N = 16;
      col.N = N; col.seg = L / N;
      col.trail = [];
      for (let i = 0; i <= N * col.seg + 20; i += 6) { const p = local(col, -i, 0); col.trail.push({ x: p.x, y: p.y, u: false }); }
      for (let i = 0; i < N; i++) setN(col, 's' + i, col.x, col.y, 0.2);
      const caps = [];
      for (let i = 0; i < N - 1; i++) {
        const k = i / (N - 1);
        const r0 = L * 0.07 * (1 - 0.6 * k) + 6, r1 = L * 0.07 * (1 - 0.6 * ((i + 1) / (N - 1))) + 6;
        caps.push(addCap(col, 's' + i, 's' + (i + 1), i === 0 ? r0 * 1.15 : r0, r1, { part: i === 0 ? 'tete' : i >= N - 3 ? 'queue' : 'corps', flat: i > 1 && i < N - 3 }));
      }
      anchor(col, 'tete', caps[0], 0.25);
      anchor(col, 'queue', caps[N - 2], 0.85);
      [1, 2, 3].forEach((k) => anchor(col, 'dorsal_' + k, caps[Math.round((k * (N - 1)) / 4)], 0.5));
      col.under = false;
    },
    pose(X, e, col, dt) {
      // la tête laisse une trace ; chaque anneau suit la trace, à sa distance
      // tr[0] suit la tête ; dès qu'elle s'est éloignée de 6 px du dernier point fixe, on en pose un
      const tr = col.trail;
      tr[0].x = col.x; tr[0].y = col.y; tr[0].u = col.under;
      if (Math.hypot(tr[0].x - tr[1].x, tr[0].y - tr[1].y) >= 6) {
        tr.splice(1, 0, { x: col.x, y: col.y, u: col.under });
        const need = Math.ceil((col.N * col.seg) / 6) + 6;
        if (tr.length > need) tr.length = need;
      }
      const moving = Math.hypot(col.vx, col.vy) > 10;
      for (let i = 0; i < col.N; i++) {
        const di = i * col.seg;
        // position le long de la trace (par pas de 6 px, interpolé)
        let acc = 0, j = 0, px = tr[0].x, py = tr[0].y, u = tr[0].u;
        while (j < tr.length - 1) {
          const a = tr[j], b = tr[j + 1], l = Math.hypot(b.x - a.x, b.y - a.y);
          if (acc + l >= di) { const k = l ? (di - acc) / l : 0; px = U.lerp(a.x, b.x, k); py = U.lerp(a.y, b.y, k); u = k < 0.5 ? a.u : b.u; break; }
          acc += l; j++; px = b.x; py = b.y; u = b.u;
        }
        let z = U.lerp(0.2 + (moving ? 0.14 * Math.max(0, Math.sin(col.walk * 1.6 - i * 0.7)) : 0.04 * Math.sin(col.t * 1.2 - i * 0.5)), 0.04, col.downK || 0);
        if (i === 0) z += (col.rear || 0);
        // secousse : le corps se tord
        if (col.shake > 0) { const w = Math.sin(col.t * 18 - i * 0.9) * col.L * 0.02 * col.shake; const a = col.a + Math.PI / 2; px += Math.cos(a) * w; py += Math.sin(a) * w; }
        const n = setN(col, 's' + i, px, py, z);
        n.under = u;
      }
      const hn = col.n.s0;
      setMouth(col, hn);
    },
  };

  /* ---------- volant ---------- */
  PLANS.volant = {
    build(col) {
      const L = col.L;
      ['tete', 'torse', 'ventre', 'queue', 'nageoire', 'aile_g0', 'aile_g1', 'aile_d0', 'aile_d1'].forEach((k) => setN(col, k, col.x, col.y, col.alt));
      const neck = addCap(col, 'tete', 'torse', L * 0.085, L * 0.1, { part: 'tete' });
      const body = addCap(col, 'torse', 'ventre', L * 0.12, L * 0.11, { flat: true, part: 'dos' });
      const tail = addCap(col, 'ventre', 'queue', L * 0.09, L * 0.055, { part: 'queue' });
      addCap(col, 'queue', 'nageoire', L * 0.05, L * 0.03, { part: 'queue' });
      addCap(col, 'torse', 'aile_g0', L * 0.08, L * 0.075, { part: 'aile', flat: true }); // l'attache des ailes : on passe du dos aux ailes
      addCap(col, 'torse', 'aile_d0', L * 0.08, L * 0.075, { part: 'aile', flat: true });
      const wg = addCap(col, 'aile_g0', 'aile_g1', L * 0.075, L * 0.03, { part: 'aile', flat: true });
      const wd = addCap(col, 'aile_d0', 'aile_d1', L * 0.075, L * 0.03, { part: 'aile', flat: true });
      anchor(col, 'nuque', neck, 0.65); anchor(col, 'dos', body, 0.35); anchor(col, 'ventre', body, 0.7);
      anchor(col, 'queue', tail, 0.8); anchor(col, 'aile_g', wg, 0.45); anchor(col, 'aile_d', wd, 0.45);
    },
    pose(X, e, col, dt) {
      const L = col.L, z = col.alt;
      col.flapPh = (col.flapPh || 0) + dt * (col.flapF || 2.2); // la phase avance : changer de rythme ne fait pas sauter les ailes
      const flap = Math.sin(col.flapPh) * (1 - 0.95 * (col.downK || 0));
      const roll = col.shake > 0 ? Math.sin(col.t * 9) * 0.5 * col.shake : 0;
      const P = (lx, ly, zz) => { const p = local(col, lx, ly); return [p.x, p.y, Math.max(0, zz)]; };
      setN(col, 'tete', ...P(L * 0.32, 0, z + 0.05));
      setN(col, 'torse', ...P(L * 0.1, 0, z));
      setN(col, 'ventre', ...P(-L * 0.1, 0, z));
      setN(col, 'queue', ...P(-L * 0.3, Math.sin(col.t * 1.6) * L * 0.04, z - 0.03));
      setN(col, 'nageoire', ...P(-L * 0.42, Math.sin(col.t * 1.6 - 0.7) * L * 0.07, z - 0.05));
      [['g', -1], ['d', 1]].forEach(([s, sd]) => {
        setN(col, 'aile_' + s + '0', ...P(L * 0.08, sd * L * 0.07, z));
        const span = L * (0.5 - Math.abs(flap) * 0.08);
        setN(col, 'aile_' + s + '1', ...P(-L * 0.06, sd * span, z + flap * 0.32 + sd * roll));
      });
      const hn = col.n.tete;
      setMouth(col, hn);
    },
  };

  /* ---------- roue ---------- */
  PLANS.roue = {
    build(col, cd) {
      const L = col.L, K = cd.arms || 4;
      col.K = K; col.hubR = L * 0.16; col.segL = L * 0.11;
      col.spinMax = Math.min(3.3, 1800 / (0.47 * L)); // une roue immense tourne moins vite : la pointe de ses bras reste à moins de 1 800 px/s
      setN(col, 'moyeu_a', col.x - 1, col.y, 0.85); setN(col, 'moyeu_b', col.x + 1, col.y, 0.85);
      const hub = addCap(col, 'moyeu_a', 'moyeu_b', col.hubR, col.hubR, { flat: true, part: 'moyeu', disc: true }); // un disque : t et off le parcourent en largeur et en hauteur (1.16.3)
      anchor(col, 'moyeu', hub, 0.5);
      for (let k = 0; k < K; k++) {
        for (let j = 0; j < 4; j++) setN(col, 'b' + k + '_' + j, col.x, col.y, 0.5);
        addCap(col, 'moyeu_b', 'b' + k + '_0', L * 0.07, L * 0.07, { part: 'bras' });
        let last = null;
        for (let j = 0; j < 3; j++) last = addCap(col, 'b' + k + '_' + j, 'b' + k + '_' + (j + 1), L * (0.07 - j * 0.012), L * (0.058 - j * 0.012), { part: 'bras' });
        anchor(col, 'bras_' + (k + 1), last, 0.9);
      }
    },
    pose(X, e, col, dt) {
      const rest = col.stall > 0 || col.down ? 1 : 0;
      col.restK = U.lerp(col.restK || 0, rest, Math.min(1, dt * 2.5));
      const hz = U.lerp(0.85, 0.35, col.restK);
      const wob = col.shake > 0 ? Math.sin(col.t * 16) * col.L * 0.01 : 0;
      setN(col, 'moyeu_a', col.x - 1 + wob, col.y, hz); setN(col, 'moyeu_b', col.x + 1 + wob, col.y, hz);
      const lag = U.clamp(col.spinRate, -4, 4) * 0.1;
      for (let k = 0; k < col.K; k++) {
        const th = col.spin + (k / col.K) * TAU;
        for (let j = 0; j < 4; j++) {
          const rr = col.hubR * 0.85 + j * col.segL;
          const a = th - lag * j;
          const z = U.lerp(hz * (1 - j / 3.3) + 0.04, hz * 0.4 * (1 - j / 3) + 0.03, col.restK);
          setN(col, 'b' + k + '_' + j, col.x + Math.cos(a) * rr, col.y + Math.sin(a) * rr * 0.92, Math.max(0.02, z));
        }
      }
      setMouth(col, col.n.moyeu_a);
    },
  };

  /* ---------- araignée ---------- */
  PLANS.araignee = {
    build(col, cd) {
      const L = col.L, K = cd.legs || 8;
      col.footR = Math.min(L * 0.04, 70);
      ['tete', 'corps', 'abdomen'].forEach((k) => setN(col, k, col.x, col.y, 1.4));
      for (let k = 0; k < K; k++) {
        const side = k < K / 2 ? -1 : 1, idx = k % (K / 2);
        const fa = (0.75 - (idx / (K / 2 - 1)) * 1.5); // de l'avant (+) vers l'arrière (−)
        const hip = [L * 0.08 * fa, side * L * 0.08];
        const rest = [L * 0.42 * Math.sin(fa * 0.9), side * L * 0.42 * Math.cos(fa * 0.9)];
        const l = makeLeg(col, String(k + 1), hip, rest);
        l.group = (idx + (side > 0 ? 1 : 0)) % 2;
        setN(col, l.hip, col.x, col.y, 1.4); setN(col, l.knee, col.x, col.y, 1.8); setN(col, l.foot, l.fx, l.fy, 0);
      }
      const head = addCap(col, 'tete', 'corps', L * 0.08, L * 0.1, { part: 'tete' });
      const body = addCap(col, 'corps', 'abdomen', L * 0.11, L * 0.16, { flat: true, part: 'corps' });
      col.legs.forEach((l, k) => {
        addCap(col, 'corps', l.hip, L * 0.04, L * 0.035, { part: 'hanche' });
        addCap(col, l.hip, l.knee, L * 0.03, L * 0.028, { part: 'cuisse' });
        const sh = addCap(col, l.knee, l.foot, L * 0.028, L * 0.022, { part: 'pied' });
        anchor(col, 'patte_' + (k + 1), sh, 0.93);
      });
      anchor(col, 'corps', body, 0.4); anchor(col, 'tete', head, 0.3);
    },
    pose(X, e, col, dt) {
      const L = col.L;
      const broken = col.seals.filter((s) => s.broken && s.at.startsWith('patte')).length;
      const target = col.down ? 0.12 : Math.max(0.35, 1.4 - broken * 0.36) + (col.lift || 0);
      col.bodyZ = U.lerp(col.bodyZ || target, target, Math.min(1, dt * 2));
      const z = col.bodyZ;
      const P = (lx) => local(col, lx, 0);
      const a = P(L * 0.16), b = P(0), c = P(-L * 0.2);
      setN(col, 'tete', a.x, a.y, z + 0.05); setN(col, 'corps', b.x, b.y, z); setN(col, 'abdomen', c.x, c.y, z + 0.05);
      poseLegs(X, e, col, dt, z, 0.75, L * 0.12, col.legs.length / 2, 0.42 * Math.sqrt(L / 600), L * 0.12);
      setMouth(col, col.n.tete);
    },
  };

  /* ======================= Création ======================= */
  Co.setup = function (X, e, zone) {
    const cd = Co.def(e.def.id);
    if (!cd) return null;
    const L = Co.length(e.def);
    const rng = AN.RNG.from(X.world.seed, 'colosse' + zone.index);
    // tout son corps reste dans la zone : son centre se tient loin des bords
    const m = Math.min(L * 0.5, zone.w * Z.T * 0.32, zone.h * Z.T * 0.32);
    const zb = { x0: Z.T * 3 + m, y0: Z.T * 3 + m, x1: (zone.w - 3) * Z.T - m, y1: (zone.h - 3) * Z.T - m };
    const col = (e.col = {
      id: e.def.id, cfg: cd, plan: cd.plan, L, A: Math.min(L, 1100), ZH: L * 0.16, x: e.x, y: e.y, a: rng.float(0, TAU), vx: 0, vy: 0,
      n: {}, caps: [], anchors: {}, seals: [], legs: [], hands: null,
      t: 0, walk: 0, act: null, cd: 2, roamTo: null, roamWait: 0, lair: { x: zone.arena.x, y: zone.arena.y }, bounds: zb,
      alt: cd.plan === 'volant' ? 1.6 : 0, spin: 0, spinRate: 0.5, stall: 0, stun: 0, biteTail: 0, shake: 0, shakeCd: 5,
      lift: 0, rear: 0, lean: 0, shell: 0, down: false, hidden: 0, attacks: 0, rage: 1, hintT: 0, hintI: 0, opened: {},
      dmg: (D.COLOSSUS_DMG[e.def.tier] || 40) * e.dmgMul, mouth: { x: e.x, y: e.y, alive: true },
    });
    // il naît loin des bords (son antre peut en être proche) ; un colosse-carte, au centre de sa zone
    col.map = Co.isMap(e.def);
    if (col.map) { col.ZH = Math.min(L * 0.16, 480); col.persp = 0.07; } // un géant : sa hauteur et sa perspective restent à l'échelle de la vue (1.16.4)
    if (col.map) { const cx = (zone.w * Z.T) / 2, cy = (zone.h * Z.T) / 2; col.x = cx; col.y = cy; zb.x0 = cx - 160; zb.x1 = cx + 160; zb.y0 = cy - 160; zb.y1 = cy + 160; col.lair = { x: cx, y: cy }; }
    col.x = U.clamp(col.x, zb.x0, zb.x1); col.y = U.clamp(col.y, zb.y0, zb.y1);
    col.lair = { x: U.clamp(col.lair.x, zb.x0, zb.x1), y: U.clamp(col.lair.y, zb.y0, zb.y1) };
    e.x = col.x; e.y = col.y;
    PLANS[cd.plan].build(col, cd);
    if (col.map && col.plan === 'roue') col.spinMax = Math.min(col.spinMax, 0.12); // une roue-monde tourne à peine : la pointe de ses bras va au pas
    const per = Math.max(60, Math.round((e.maxHp * D.COLOSSUS_SEAL_SHARE) / cd.seals.length));
    col.seals = cd.seals.map((s) => ({ at: s.at, kind: s.kind, hp: per, max: per, broken: false, open: false }));
    e.r = Math.min(L * 0.15, 220); // le cœur du colosse : portée de la capture, des formes et du coup de grâce (borné : les formes de capture gardent leur mesure)
    e.noShadow = true;
    e.speed = 0;
    for (let k = 0; k < 4; k++) PLANS[cd.plan].pose(X, e, col, 0.25);
    buildDeck(X, e, col, zone, rng); // son dos : ce qui y pousse, y vit, s'y récolte (1.16.2)
    if (col.deck) col.deck.riders.forEach((r) => placeRider(col, r));
    syncHp(e);
    return col;
  };
  /** Position dessinée et rayon d'un sceau. */
  Co.sealPos = function (col, s) {
    const an = col.anchors[s.at];
    if (!an) return null;
    const c = col.caps[an.cap];
    const p = capPoint(col, c, an.t, an.off);
    p.cap = c; p.sr = U.clamp(p.r * 0.42, 13, 34);
    return p;
  };
  function syncHp(e) {
    const col = e.col;
    if (e.boss && e.boss.exhausted) return;
    const tot = col.seals.reduce((s, x) => s + x.max, 0), left = col.seals.reduce((s, x) => s + (x.broken ? 0 : x.hp), 0);
    e.hp = Math.max(1, (e.maxHp * left) / tot);
  }
  Co.sealsLeft = (e) => e.col.seals.filter((s) => !s.broken).length;

  /* ======================= Sceaux ======================= */
  function sealOpen(col, s) {
    if (s.broken || s.kind !== 'bas' || col.hidden > 0) return false;
    const at = s.at;
    if (col.plan === 'volant') return at === 'ventre' && col.alt < 0.5 && !col.down;
    if (col.plan === 'roue') return at.startsWith('bras') && col.stall > 0;
    if (col.plan === 'serpent') {
      if (at === 'tete') return col.stun > 0 || col.biteTail > 0;
      if (at === 'queue') return col.biteTail > 0;
      return false;
    }
    if (col.plan === 'quadrupede') {
      if (at === 'tete') return col.head.down > 0 && col.shell < 0.3;
      const leg = col.legs.find((l) => 'pied_' + l.name.replace(/^av/, 'av_').replace(/^ar/, 'ar_') === at);
      return !!(leg && leg.stuck > 0) && col.shell < 0.3;
    }
    if (at.startsWith('pied_') || at.startsWith('patte_')) {
      const leg = col.legs.find((l) => l.foot === 'pied_' + at.split('_')[1]);
      return !!(leg && leg.stuck > 0);
    }
    if (at.startsWith('main_')) {
      const h = col.hands && col.hands.find((x) => x.hand === at);
      return !!(h && h.stuck > 0);
    }
    return false;
  }
  function updateSeals(X, e, col) {
    col.seals.forEach((s) => {
      const was = s.open;
      s.open = sealOpen(col, s);
      if (s.open && !was) {
        const p = Co.sealPos(col, s);
        if (p) { FX.ring(p.x, p.y, '#ffffff', p.sr, p.sr * 3, 0.5, 3); AN.Audio.play('weak'); }
        const k = 'open:' + s.at;
        if (!col.opened[k]) { col.opened[k] = 1; if (p) FX.text(p.x, p.y - p.sr - 12, 'sceau découvert', AN.CYAN, { size: 13, bold: true, life: 1.6 }); }
      }
    });
  }
  /** Dégâts portés à un sceau. Renvoie les dégâts infligés. */
  function hurtSeal(X, e, s, dmg, from) {
    if (!(dmg > 0) || s.broken || (e.boss && e.boss.exhausted)) return 0;
    const col = e.col;
    s.hp -= dmg;
    e.flash = 0.08;
    col.hintT = 0;
    const p = Co.sealPos(col, s);
    if (p) {
      FX.text(p.x + rnd(-6, 6), p.y - p.sr - 6, Math.round(dmg), AN.STAMP, { size: 13, bold: true, life: 0.7, vy: -60 });
      FX.burst(p.x, p.y, e.pal.glow || e.pal.accent, 8, 160, { size: 3 });
    }
    AN.Audio.play('hit', { at: e, dmg, boss: true });
    if (!e.boss.active) AN.Boss.wake(X, e);
    if (from === 'climb') col.shakeCd = Math.min(col.shakeCd, rnd(2.5, 4));
    if (s.hp <= 0) breakSeal(X, e, s);
    syncHp(e);
    return dmg;
  }
  function breakSeal(X, e, s) {
    const col = e.col;
    s.broken = true; s.open = false; s.hp = 0;
    const p = Co.sealPos(col, s);
    if (p) { FX.burst(p.x, p.y, '#ffffff', 50, 380, { size: 5 }); FX.ring(p.x, p.y, e.pal.glow || e.pal.accent, p.sr, col.L * 0.5, 0.9, 6); }
    X.cam.shake(14);
    AN.Audio.play('shatter'); AN.Audio.play('boss_roar', { at: e, pitch: 0.7 });
    const bs = AN.Profile.markSeen(X.profile, e.def.id);
    bs.secret = 1; // sa faiblesse rejoint le bestiaire
    col.rage = 1 + 0.12 * col.seals.filter((x) => x.broken).length;
    const left = Co.sealsLeft(e);
    if (!left) {
      if (X.player.climb && X.player.climb.e === e) Co.drop(X, X.player, 'down');
      AN.HUD.toast(D.COLOSSUS_TEXT.lastSeal, 4);
      AN.Boss.onZero(X, e);
      return;
    }
    AN.HUD.toast(D.COLOSSUS_TEXT.sealBroken + ' Il en reste ' + left + '.', 3.5);
    // il chancelle, puis enrage
    setAct(col, { type: 'chancelle', t: 0, dur: 2.2 });
    if (X.player.climb && X.player.climb.e === e) col.shakeCd = 2.4;
  }

  /* ======================= Attaques ======================= */
  const ACTS = {};
  /**
   * Change d'attaque (ou s'arrête) : les membres que l'attaque menait sont rendus à la marche,
   * même si elle est interrompue (secousse, sceau brisé). Sans cela, un pied ou une main
   * resterait « pris » par une attaque finie, et ne frapperait plus jamais.
   */
  function setAct(col, act) {
    col.legs.forEach((l) => {
      if (!l.act) return;
      l.act = null;
      if (l.fz > 0.01) l.mv = { t: 0.5, dur: 0.35, x0: l.fx, y0: l.fy, x1: l.fx, y1: l.fy, h: l.fz }; // il repose le pied
    });
    (col.hands || []).forEach((h) => { h.act = null; });
    col.headAct = null;
    col.flapF = 0; // la tête, le buste, l'élan et la secousse reviennent en douceur (finish)
    col.act = act;
  }
  Co.setAct = setAct;
  /** Le colosse se secoue : qui est sur lui doit tenir (E). */
  ACTS.secousse = (X, e, col, A, dt) => {
    col.shake = A.t < 0.3 ? A.t / 0.3 * 0.4 : U.clamp((A.dur - A.t) / 0.4, 0, 1);
    if (col.plan === 'volant') col.alt = Math.min(2.2, col.alt + dt * 0.4);
    if (col.plan === 'roue') col.spinRate += (Math.sign(col.spinRate || 1) * Math.min(3, col.spinMax || 3) - col.spinRate) * Math.min(1, dt * 2);
    if (!A.fx) { A.fx = 1; AN.Audio.play('rumble_hit'); }
    // Atlas : des rochers tombent du continent qu'il porte, autour de lui
    if (col.cfg.signature === 'eboulis' && !A.rocks && A.t > 0.4) { A.rocks = 1; rainAt(X, e, col, col.x, col.y, col.A * 0.55, 7, 0.6, '#8a7a62'); }
    return A.t >= A.dur;
  };
  ACTS.chancelle = (X, e, col, A, dt) => {
    col.shake = 0.5 * (1 - A.t / A.dur);
    col.vx *= 0.9; col.vy *= 0.9;
    if (col.plan === 'volant') col.alt = Math.min(1.8, col.alt + dt * 0.6);
    return A.t >= A.dur;
  };
  /** Rugissement : la tête se dresse, une onde repousse tout ce qui est près ; qui grimpe doit tenir. */
  ACTS.rugissement = (X, e, col, A, dt) => {
    col.rear = A.t < 0.7 ? A.t / 0.7 * 0.3 : Math.max(0, 0.3 - (A.t - 0.7));
    if (A.t >= 0.7 && !A.done) {
      A.done = 1;
      AN.Audio.play('boss_roar', { at: e, pitch: 0.5 });
      X.cam.shake(10);
      FX.ring(col.mouth.x, col.mouth.y, U.rgba('#ffffff', 0.8), 20, col.A * 0.7, 0.8, 5);
      push(X, col, col.x, col.y, col.A * 0.6, 520);
      col.shake = 0.6; // elle s'apaise d'elle-même
    }
    return A.t >= 1.6;
  };
  /** Repousse le joueur et les compagnons (sans dégâts). */
  function push(X, col, x, y, R, force) {
    for (const t of AN.Combat.enemiesOf(X, 'wild')) {
      if (t.kind === 'player' && t.climb) continue;
      if (t.kind === 'base') continue;
      const d = U.dist(t.x, t.y, x, y);
      if (d > R) continue;
      const a = Math.atan2(t.y - y, t.x - x), k = force * (1 - d / R) + 120;
      t.kbx = (t.kbx || 0) + Math.cos(a) * k; t.kby = (t.kby || 0) + Math.sin(a) * k;
    }
  }
  function pull(X, x, y, R, force, dt) {
    const p = X.player;
    if (!p.alive || p.climb) return;
    const d = U.dist(p.x, p.y, x, y);
    if (d > R || d < 10) return;
    const a = Math.atan2(y - p.y, x - p.x);
    p.vx += Math.cos(a) * force * dt; p.vy += Math.sin(a) * force * dt;
  }
  function rainAt(X, e, col, cx, cy, R, n, mul, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, r = i === 0 ? 0 : 40 + Math.random() * R;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      AN.Combat.telegraph(X, { x, y, r: 46, windup: 1.1 + i * 0.07, dmg: col.dmg * mul, team: 'wild', color: color || e.pal.accent, silent: i > 0 });
    }
  }
  const rain = (X, e, col, n, mul, color) => rainAt(X, e, col, X.player.x, X.player.y, 220, n, mul, color);
  function breath(X, e, col, A, sweep) {
    AN.Combat.laser(X, { owner: col.mouth, angle: Math.atan2(X.player.y - col.mouth.y, X.player.x - col.mouth.x), sweep: sweep || 0.9, dur: 1.8, windup: 0.9, dps: col.dmg * 0.9, width: U.clamp(col.L * 0.045, 24, 70), len: Math.min(col.L * 1.2, 1200), color: e.pal.glow || e.pal.accent, team: 'wild' });
  }
  ACTS.souffle = (X, e, col, A) => {
    if (!A.go) { A.go = 1; breath(X, e, col, A); }
    col.rear = A.t < 0.9 ? 0.15 : 0;
    col.vx *= 0.9; col.vy *= 0.9;
    return A.t >= 2.8;
  };

  /* ----- jambes ----- */
  const sealedOn = (col, node) => col.seals.some((s) => !s.broken && col.anchors[s.at] && col.caps[col.anchors[s.at].cap].b === node);
  function nearestLeg(col, x, y, filter) {
    let best = null, bd = 1e9;
    for (const l of col.legs) {
      if (filter && !filter(l)) continue;
      const d = Math.hypot(l.fx - x, l.fy - y) * (sealedOn(col, l.foot) ? 0.45 : 1);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  }
  /** Piétinement (et empalement de l'araignée) : un pied se lève au-dessus de vous, puis s'abat ; il reste planté. */
  ACTS.pietinement = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.leg) {
      A.leg = nearestLeg(col, p.x, p.y, (l) => !l.mv && l.stuck <= 0);
      if (!A.leg) return true;
      A.leg.act = A;
      A.x0 = A.leg.fx; A.y0 = A.leg.fy;
      A.reach = col.plan === 'araignee' ? Math.min(col.L * 0.62, 900) : col.L * 0.42;
      A.lift = (A.quick ? 0.6 : 0.85) * Math.max(1, Math.min(A.reach, U.dist(A.x0, A.y0, p.x, p.y)) / 750); // un pied qui va loin prend plus de temps
      A.fall = 0.12 * Math.max(1, (col.ZH * 1.1) / 260); // et un pied haut, plus de temps pour s'abattre
    }
    const leg = A.leg;
    const hip = col.n[leg.hip];
    if (A.t < A.lift * 0.65) { // il vise
      let tx = p.x, ty = p.y;
      const d = Math.hypot(tx - hip.x, ty - hip.y);
      if (d > A.reach) { tx = hip.x + (tx - hip.x) * A.reach / d; ty = hip.y + (ty - hip.y) * A.reach / d; }
      A.tx = tx; A.ty = ty;
    }
    if (!A.tele && A.t >= A.lift * 0.65) {
      A.tele = 1;
      AN.Combat.telegraph(X, { x: A.tx, y: A.ty, r: Math.min(col.footR * 1.6 + 20, 190), windup: A.lift * 0.35 + A.fall, dmg: col.dmg * (A.quick ? 1.1 : 1.35), team: 'wild', color: e.pal.dark });
    }
    const peak = col.plan === 'araignee' ? 1.1 : 0.95;
    if (A.t < A.lift) {
      const k = A.t / A.lift;
      leg.fx = U.lerp(A.x0, A.tx || A.x0, ease(k)); leg.fy = U.lerp(A.y0, A.ty || A.y0, ease(k));
      leg.fz = Math.sin(Math.min(1, k * 1.4) * Math.PI / 2) * peak;
      col.vx *= 0.85; col.vy *= 0.85;
      return false;
    }
    if (A.t < A.lift + A.fall) { // il s'abat : vite, mais on le voit descendre
      const k = (A.t - A.lift) / A.fall;
      leg.fx = A.tx; leg.fy = A.ty; leg.fz = peak * (1 - k * k);
      return false;
    }
    if (!A.slam) {
      A.slam = 1;
      leg.fx = A.tx; leg.fy = A.ty; leg.fz = 0;
      leg.stuck = A.quick ? 2.3 : 2.6;
      X.cam.shake(col.plan === 'araignee' ? 6 : 10);
      AN.Audio.play('boom');
      FX.burst(A.tx, A.ty, e.pal.dark, 24, 240, { size: 4, kind: 'square' });
      if (!A.quick) AN.Combat.shockwave(X, { x: A.tx, y: A.ty, r0: col.footR, speed: 300, max: col.A * 0.35, width: 20, dmg: col.dmg * 0.4, team: 'wild', color: e.pal.accent });
    }
    leg.act = null;
    return true;
  };
  ACTS.empalement = (X, e, col, A, dt) => { A.quick = true; return ACTS.pietinement(X, e, col, A, dt); };
  /** Bond (Titan-Lune) : il s'élève, retombe sur vous, et ses deux pieds restent pris. */
  ACTS.bond = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.init) {
      A.init = 1; A.x0 = col.x; A.y0 = col.y;
      const d = Math.min(col.A * 0.9, U.dist(col.x, col.y, p.x, p.y));
      const a = Math.atan2(p.y - col.y, p.x - col.x);
      A.tx = col.x + Math.cos(a) * d; A.ty = col.y + Math.sin(a) * d;
      AN.Combat.telegraph(X, { x: A.tx, y: A.ty, r: col.A * 0.26, windup: 1.35, dmg: col.dmg * 1.5, team: 'wild', color: e.pal.dark });
      AN.Audio.play('whoosh', { pitch: 0.5 });
    }
    const k = U.clamp((A.t - 0.25) / 1.1, 0, 1);
    if (A.t < 0.25) { col.lift = -0.25 * (A.t / 0.25); return false; } // il fléchit
    if (k < 1) {
      col.x = U.lerp(A.x0, A.tx, ease(k)); col.y = U.lerp(A.y0, A.ty, ease(k));
      col.lift = Math.sin(k * Math.PI) * 1.1;
      col.legs.forEach((l) => { const r = local(col, l.rest[0], l.rest[1]), k2 = Math.min(1, dt * 9); l.fx += (r.x - l.fx) * k2; l.fy += (r.y - l.fy) * k2; l.fz = col.lift * 0.6; l.mv = null; });
      return false;
    }
    if (!A.land) {
      A.land = 1; col.lift = 0;
      col.legs.forEach((l) => { l.fz = 0; l.stuck = 3.2; });
      X.cam.shake(16); AN.Audio.play('boom');
      AN.Combat.shockwave(X, { x: col.x, y: col.y, r0: col.A * 0.2, speed: 360, max: col.A * 0.8, width: 26, dmg: col.dmg * 0.5, team: 'wild', color: e.pal.accent });
      FX.burst(col.x, col.y, e.pal.dark, 60, 360, { size: 5, kind: 'square' });
    }
    return A.t > 1.8;
  };

  /* ----- mains (bipède) ----- */
  function handNear(col, x, y) {
    let best = null, bd = 1e9;
    (col.hands || []).forEach((h) => { if (h.stuck > 0 || h.act) return; const d = Math.hypot(h.x - x, h.y - y) * (sealedOn(col, h.hand) ? 0.6 : 1); if (d < bd) { bd = d; best = h; } });
    return best;
  }
  /** Balayage : le bras se lève d'un côté, puis fauche le sol devant lui. La houlette (Berger) ramène au lieu de repousser. */
  ACTS.balayage = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.h) {
      A.h = handNear(col, p.x, p.y);
      if (!A.h) return true;
      A.h.act = A;
      A.a0 = A.h.side * 1.6; A.a1 = -A.h.side * 0.5;
      const big = (col.L * 0.42) / 420;
      A.wind = 0.65 * Math.max(1, big); A.dur = 0.6 * Math.max(1, big * 1.4); A.drop = 0.15 * Math.max(1, big * 1.3); // un bras immense se prépare et balaie plus lentement
      AN.Audio.play('whoosh', { pitch: 0.4 });
    }
    const h = A.h, R = col.L * 0.42;
    const sh = col.n[h.sh];
    let ang, z;
    if (A.t < A.wind) { ang = col.a + A.a0 * ease(A.t / A.wind); z = U.lerp(0.5, 1.1, A.t / A.wind); }
    else { const k = Math.min(1, (A.t - A.wind) / A.dur); ang = col.a + U.lerp(A.a0, A.a1, ease(k)); z = U.lerp(1.1, 0.08, Math.min(1, (A.t - A.wind) / A.drop)); }
    const tx = sh.x + Math.cos(ang) * R, ty = sh.y + Math.sin(ang) * R;
    if (A.t < A.wind) { // elle se lève vers son départ, à vitesse bornée
      const d = Math.hypot(tx - h.x, ty - h.y), st = Math.min(d, 1300 * dt);
      if (d > 0.5) { h.x += ((tx - h.x) / d) * st; h.y += ((ty - h.y) / d) * st; }
      h.z += U.clamp(z - h.z, -2.5 * dt, 2.5 * dt);
    }
    else { h.x = tx; h.y = ty; h.z = z; }
    if (A.t >= A.wind) {
      const c = col.caps.find((cc) => cc.b === h.hand);
      if (c) capsuleHit(X, e, col, c, col.dmg * 1.05, A.hook ? -520 : 440, A);
      if (A.hook && A.hit && A.hit.has(p)) { /* ramené vers lui */ }
    }
    if (A.t >= A.wind + A.dur) {
      h.act = null;
      if (A.hook) { h.stuck = 2.8; h.z = 0.04; FX.burst(h.x, h.y, e.pal.dark, 16, 200, { size: 3, kind: 'square' }); X.cam.shake(5); } // la houlette se plante
      return true;
    }
    return false;
  };
  ACTS.houlette = (X, e, col, A, dt) => { A.hook = true; return ACTS.balayage(X, e, col, A, dt); };
  /** Écrasement (poing au sol) et racines : la main s'abat sur vous, puis reste plantée (son sceau se découvre, l'avant-bras se gravit). */
  ACTS.ecrasement = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.h) {
      A.h = handNear(col, p.x, p.y);
      if (!A.h) return true;
      A.h.act = A;
      const sh = col.n[A.h.sh];
      const d = Math.min(col.L * 0.5, U.dist(sh.x, sh.y, p.x, p.y)), a = Math.atan2(p.y - sh.y, p.x - sh.x);
      A.tx = sh.x + Math.cos(a) * d; A.ty = sh.y + Math.sin(a) * d;
      A.x0 = A.h.x; A.y0 = A.h.y; A.z0 = A.h.z;
      A.dur = 0.95 * Math.max(1, U.dist(A.x0, A.y0, A.tx, A.ty) / 900);
      AN.Combat.telegraph(X, { x: A.tx, y: A.ty, r: col.A * 0.09 + 26, windup: A.dur, dmg: col.dmg * 1.3, team: 'wild', color: e.pal.dark });
    }
    const h = A.h;
    if (A.t < A.dur) {
      const k = A.t / A.dur;
      h.x = U.lerp(A.x0, A.tx, ease(k)); h.y = U.lerp(A.y0, A.ty, ease(k)); h.z = k < 0.8 ? U.lerp(A.z0, 1.3, k / 0.8) : U.lerp(1.3, 0.03, (k - 0.8) / 0.2);
      col.lean = 0.06 * k;
      return false;
    }
    if (!A.slam) {
      A.slam = 1; h.z = 0.03; h.stuck = A.roots ? 3.6 : 3; h.act = null;
      X.cam.shake(9); AN.Audio.play('boom');
      FX.burst(A.tx, A.ty, e.pal.dark, 26, 260, { size: 4, kind: 'square' });
      if (A.roots) for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.random(); AN.Combat.pool(X, { x: A.tx + Math.cos(a) * 70, y: A.ty + Math.sin(a) * 70, r: 52, dps: col.dmg * 0.2, life: 3.6, color: '#5a7a2a', team: 'wild' }); }
    }
    col.lean *= 0.9;
    return A.t > A.dur + 0.35;
  };
  ACTS.racines = (X, e, col, A, dt) => { A.roots = true; return ACTS.ecrasement(X, e, col, A, dt); };

  /* ----- tête (quadrupède) ----- */
  ACTS.morsure = (X, e, col, A, dt) => {
    const p = X.player;
    if (col.plan === 'serpent') return serpentLunge(X, e, col, A, dt, 0.4, 2.6);
    const hd = col.head;
    if (!A.init) {
      A.init = 1; col.headAct = A;
      const f = col.n.avant, d = Math.min(col.L * 0.62, U.dist(f.x, f.y, p.x, p.y)), a = Math.atan2(p.y - f.y, p.x - f.x);
      A.tx = f.x + Math.cos(a) * d; A.ty = f.y + Math.sin(a) * d; A.x0 = hd.x; A.y0 = hd.y;
      AN.Combat.telegraph(X, { x: A.tx, y: A.ty, r: col.A * 0.09, windup: 0.85, dmg: col.dmg * 1.25, team: 'wild', color: e.pal.dark });
    }
    if (A.t < 0.6) { const back = local(col, col.L * 0.22, 0); hd.x += (back.x - hd.x) * 0.1; hd.y += (back.y - hd.y) * 0.1; hd.z += (0.6 - hd.z) * 0.1; return false; }
    if (A.t < 0.85) { const k = (A.t - 0.6) / 0.25; hd.x = U.lerp(hd.x, A.tx, k); hd.y = U.lerp(hd.y, A.ty, k); hd.z = U.lerp(0.6, 0.02, k); return false; }
    if (!A.bit) { A.bit = 1; hd.x = A.tx; hd.y = A.ty; hd.z = 0.02; hd.down = 2.6; col.headAct = null; X.cam.shake(6); AN.Audio.play('boom'); }
    return A.t > 1.1;
  };
  /** Carapace : elle rentre tout, tourne sur elle-même et fonce ; qui était dessus est projeté. */
  ACTS.carapace = (X, e, col, A, dt) => {
    const p = X.player;
    if (A.t < 0.5) { col.shell = A.t / 0.5; return false; }
    col.shell = 1;
    if (p.climb && p.climb.e === e) Co.drop(X, p, 'eject');
    if (A.t < 3.5) {
      col.a += dt * 5;
      const a = Math.atan2(p.y - col.y, p.x - col.x);
      col.vx += (Math.cos(a) * col.A * 0.5 - col.vx) * Math.min(1, dt * 1.5); col.vy += (Math.sin(a) * col.A * 0.5 - col.vy) * Math.min(1, dt * 1.5);
      if (!A.hitT || col.t > A.hitT) {
        for (const t of AN.Combat.enemiesOf(X, 'wild')) if (!(t.kind === 'player' && t.climb) && U.dist(t.x, t.y, col.x, col.y) < col.L * 0.27 + (t.r || 12)) { AN.Combat.hit(X, t, col.dmg * 0.9, col, { knock: 520 }); A.hitT = col.t + 0.6; }
      }
      return false;
    }
    col.vx *= 0.9; col.vy *= 0.9;
    col.shell = Math.max(0, 1 - (A.t - 3.5) / 0.6);
    return A.t > 4.1;
  };

  /* ----- charge (quadrupède, serpent) ----- */
  ACTS.charge = (X, e, col, A, dt) => {
    const p = X.player;
    if (col.plan === 'serpent') return serpentLunge(X, e, col, A, dt, 1.8, 2.5, true);
    if (!A.init) {
      A.init = 1; A.a = Math.atan2(p.y - col.y, p.x - col.x);
      AN.Combat.telegraph(X, { kind: 'line', x: col.x, y: col.y, angle: A.a, len: col.A * 1.3, width: Math.min(col.L * 0.5, col.A * 0.6), windup: 1, dmg: 0, team: 'wild' });
    }
    if (A.t < 1) { col.a += U.clamp(U.angDiff(col.a, A.a), -1.4 * dt, 1.4 * dt); col.vx *= 0.8; col.vy *= 0.8; return false; }
    A.a = col.a; // il charge droit devant lui
    const sp = col.A * 1.0;
    col.vx = Math.cos(A.a) * sp; col.vy = Math.sin(A.a) * sp;
    col.legs.forEach((l) => { const c = col.caps.find((cc) => cc.b === l.foot); if (c) capsuleHit(X, e, col, c, col.dmg * 1.1, 420, A); });
    if (U.dist(p.x, p.y, col.x, col.y) < col.L * 0.27 && !(A.hit && A.hit.has(p)) && !p.climb) { A.hit = A.hit || new Set(); A.hit.add(p); AN.Combat.hit(X, p, col.dmg * 1.1, col, { knock: 480 }); }
    return A.t > 2.3;
  };

  /* ----- serpent ----- */
  /** Élan de la tête : la charge garde son cap (contre un mur, il s'assomme) ; la morsure est brève. */
  function serpentLunge(X, e, col, A, dt, dur, spd, charge) {
    const p = X.player;
    if (!A.init) {
      A.init = 1;
      if (col.under) { col.under = false; }
      A.a = Math.atan2(p.y - col.y, p.x - col.x);
      if (charge) AN.Combat.telegraph(X, { kind: 'line', x: col.x, y: col.y, angle: A.a, len: col.A * 1.1, width: col.L * 0.12, windup: 0.75, dmg: 0, team: 'wild' });
    }
    const wind = charge ? 0.75 : 0.35;
    if (A.t < wind) { col.rear = 0.35 * (A.t / wind); col.a += U.angDiff(col.a, A.a) * Math.min(1, dt * 5); col.vx *= 0.8; col.vy *= 0.8; return false; }
    col.rear *= 0.9;
    const sp = col.A * 0.42 * spd;
    if (!charge) A.a += U.angDiff(A.a, Math.atan2(p.y - col.y, p.x - col.x)) * Math.min(1, dt * 1.5);
    col.a = A.a;
    col.vx = Math.cos(A.a) * sp; col.vy = Math.sin(A.a) * sp;
    capsuleHit(X, e, col, col.caps[0], col.dmg * (charge ? 1.15 : 1.0), 460, A);
    if (A.t > wind + dur) return true;
    return false;
  }
  /** Plongée : il s'enfouit, file sous vous, et jaillit là où vous étiez. */
  ACTS.plongee = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.init) {
      A.init = 1; col.under = true;
      FX.burst(col.x, col.y, e.pal.dark, 30, 240, { size: 4, kind: 'square' }); X.cam.shake(5); AN.Audio.play('rumble_hit');
      if (col.cfg.signature === 'seisme') AN.Combat.shockwave(X, { x: col.x, y: col.y, r0: 40, speed: 280, max: col.A * 0.7, width: 24, dmg: col.dmg * 0.45, team: 'wild', color: e.pal.accent });
    }
    if (A.t < 2.2) {
      const a = Math.atan2(p.y - col.y, p.x - col.x);
      col.a += U.angDiff(col.a, a) * Math.min(1, dt * 2.5);
      const sp = col.A * 0.6;
      col.vx = Math.cos(col.a) * sp; col.vy = Math.sin(col.a) * sp;
      return false;
    }
    if (!A.tele) {
      A.tele = 1; A.tx = p.x; A.ty = p.y;
      AN.Combat.telegraph(X, { x: A.tx, y: A.ty, r: col.A * 0.1 + 30, windup: 1.05, dmg: col.dmg * 1.3, team: 'wild', color: e.pal.accent });
    }
    if (A.t < 3.25) {
      const a = Math.atan2(A.ty - col.y, A.tx - col.x), d = U.dist(col.x, col.y, A.tx, A.ty);
      col.a = a;
      const sp = Math.min(col.A * 0.9, d / Math.max(0.05, 3.25 - A.t));
      col.vx = Math.cos(a) * sp; col.vy = Math.sin(a) * sp;
      return false;
    }
    if (!A.out) {
      A.out = 1; A.outT = A.t; col.under = false;
      X.cam.shake(12); AN.Audio.play('boom');
      FX.burst(col.x, col.y, e.pal.body, 40, 320, { size: 5, kind: 'square' });
      if (col.cfg.signature === 'geyser') for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; AN.Combat.pool(X, { x: col.x + Math.cos(a) * 80, y: col.y + Math.sin(a) * 80, r: 50, dps: col.dmg * 0.3, life: 4, color: '#ff7a2a', team: 'wild' }); }
      if (col.cfg.signature === 'seisme') AN.Combat.shockwave(X, { x: col.x, y: col.y, r0: 40, speed: 320, max: col.A * 0.6, width: 24, dmg: col.dmg * 0.45, team: 'wild', color: e.pal.accent });
    }
    if (A.outT != null) col.rear = 0.5 * Math.sin(Math.min(1, (A.t - A.outT) / 0.45) * Math.PI); // il se dresse, puis retombe
    return A.t > 3.7;
  };
  /** La tête vise un point mobile, à une vitesse bornée (pas de bond). */
  function chase(col, tx, ty) {
    let vx = (tx - col.x) * 6, vy = (ty - col.y) * 6;
    const sp = Math.hypot(vx, vy), max = col.A * 1.5;
    if (sp > max) { vx *= max / sp; vy *= max / sp; }
    col.vx = vx; col.vy = vy;
    if (sp > 5) col.a = Math.atan2(vy, vx);
  }
  /** Enroulement (Serpent annulaire) : il tourne autour de vous, l'anneau se resserre ; quand il se ferme, il se mord la queue. */
  ACTS.enroulement = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.init) { A.init = 1; A.cx = p.x; A.cy = p.y; A.R = col.L / TAU * 1.05; A.ang = Math.atan2(col.y - p.y, col.x - p.x); A.ring = true; }
    const lap = 1.8;
    if (A.t < lap) {
      // la tête rejoint le cercle, puis en fait le tour
      A.ang += (TAU / lap) * dt;
      const tx = A.cx + Math.cos(A.ang) * A.R, ty = A.cy + Math.sin(A.ang) * A.R;
      chase(col, tx, ty);
    } else if (A.t < lap + 1.4) {
      A.ang += (TAU / lap) * dt * 0.6;
      const R = U.lerp(A.R, A.R * 0.35, (A.t - lap) / 1.4);
      const tx = A.cx + Math.cos(A.ang) * R, ty = A.cy + Math.sin(A.ang) * R;
      chase(col, tx, ty);
      // l'anneau broie ce qu'il enserre
      col.caps.forEach((c) => capsuleHit(X, e, col, c, col.dmg * 0.9, 300, A));
    } else if (!A.bite) {
      A.bite = 1; col.biteTail = 3.2; col.vx = col.vy = 0;
      FX.text(col.x, col.y - 40, 'il se mord la queue', AN.CYAN, { size: 13, bold: true, life: 1.8 });
      AN.Audio.play('boss_roar', { at: e, pitch: 0.8 });
    }
    // l'anneau retient : on ne le franchit que d'une esquive
    if (A.t < lap + 1.4 && !p.climb && p.dashT <= 0) {
      const d = U.dist(p.x, p.y, A.cx, A.cy), R = A.t < lap ? A.R : U.lerp(A.R, A.R * 0.35, (A.t - lap) / 1.4);
      if (d > R - 18 && d < R + 30) { const a = Math.atan2(p.y - A.cy, p.x - A.cx); p.x = A.cx + Math.cos(a) * (R - 18); p.y = A.cy + Math.sin(a) * (R - 18); }
    }
    return A.t > lap + 1.4 + 3.2;
  };

  /* ----- volant ----- */
  ACTS.plongeon = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.init) {
      A.init = 1; A.a = Math.atan2(p.y - col.y, p.x - col.x);
      A.d = U.dist(col.x, col.y, p.x, p.y); A.tot = A.d * 2; A.s = 0; A.x0 = col.x; A.y0 = col.y; A.z0 = col.alt;
      AN.Combat.telegraph(X, { kind: 'line', x: col.x, y: col.y, angle: A.a, len: A.tot, width: Math.min(col.L * 0.3, 420), windup: 0.9, dmg: 0, team: 'wild' });
      AN.Audio.play('whoosh', { pitch: 0.4 });
    }
    const turn = Math.min(1, 1000 / col.L); // un grand volant vire plus lentement
    if (A.t < 0.9) { col.a += U.clamp(U.angDiff(col.a, A.a), -1.6 * turn * dt, 1.6 * turn * dt); col.alt = Math.min(2.2, col.alt + dt * 0.4); col.vx *= 0.9; col.vy *= 0.9; return false; }
    const sp = Math.min(1150, Math.max(col.A * 1.1, A.tot / 2.4));
    A.s += sp * dt;
    const k = U.clamp(A.s / A.tot, 0, 1);
    col.a += U.clamp(U.angDiff(col.a, A.a), -1.2 * turn * dt, 1.2 * turn * dt); // il s'aligne en plongeant, sans pivoter d'un coup
    col.vx = Math.cos(col.a) * sp; col.vy = Math.sin(col.a) * sp;
    col.alt = U.lerp(A.z0, 0.18, Math.sin(k * Math.PI));
    // au ras du sol, la tête et le corps renversent tout ; les ailes et la traîne passent au-dessus, et se saisissent
    if (col.alt < 0.45) col.caps.forEach((c) => { if (c.part === 'tete' || c.part === 'dos') capsuleHit(X, e, col, c, col.dmg * 1.0, 460, A); });
    if (col.cfg.signature === 'sillage' && col.alt < 0.8 && (!A.poolS || A.s - A.poolS > col.A * 0.12)) { A.poolS = A.s; AN.Combat.pool(X, { x: col.x, y: col.y, r: col.L * 0.07 + 20, dps: col.dmg * 0.3, life: 4.5, color: '#ff8a3a', team: 'wild' }); }
    return k >= 1;
  };
  ACTS.bourrasque = (X, e, col, A, dt) => {
    col.flapF = A.t < 1.2 ? 9 : 2.2;
    if (A.t > 0.6 && !A.done) {
      A.done = 1;
      AN.Audio.play('whoosh', { pitch: 0.3 });
      FX.ring(col.x, col.y, U.rgba('#ffffff', 0.7), 30, col.A * 0.8, 0.7, 6);
      push(X, col, col.x, col.y, col.A * 0.8, 620);
      if (X.player.climb && X.player.climb.e === e) col.shake = 0.7;
    }
    return A.t > 1.5;
  };
  ACTS.pluie = (X, e, col, A) => { if (!A.done) { A.done = 1; rain(X, e, col, 7, 0.7); } return A.t > 1.4; };
  ACTS.aspiration = (X, e, col, A, dt) => {
    if (A.t < 0.6) return false;
    const mx = col.n.tete.x, my = col.n.tete.y; // au sol, sous la gueule
    pull(X, mx, my, col.A * 1.1, 520, dt);
    if (Math.random() < 0.5) FX.add({ kind: 'dot', x: mx + rnd(-200, 200), y: my + rnd(-200, 200), vx: 0, vy: 0, color: '#ffffff', life: 0.4, size: 3 });
    const p = X.player;
    if (!A.bit && U.dist(p.x, p.y, mx, my) < col.A * 0.12 && !p.climb) { A.bit = 1; AN.Combat.hit(X, p, col.dmg * 1.3, { x: mx, y: my }, { knock: 600 }); }
    return A.t > 3;
  };

  /* ----- roue ----- */
  ACTS.tourbillon = (X, e, col, A, dt) => {
    const dir = Math.sign(col.spinRate) || 1;
    col.spinRate += (dir * (col.spinMax || 3.3) - col.spinRate) * Math.min(1, dt * 2);
    if (A.t > 0.4) {
      for (let k = 0; k < col.K; k++) for (let j = 1; j < 3; j++) {
        const c = col.caps.find((cc) => cc.a === 'b' + k + '_' + j);
        if (c) capsuleHit(X, e, col, c, col.dmg * 0.95, 380, A);
      }
      if (A.hit && col.t - (A.clr || 0) > 0.8) { A.hit.clear(); A.clr = col.t; }
      if (col.cfg.signature === 'attraction') pull(X, col.x, col.y, col.A * 1.2, 260, dt);
    }
    return A.t > 3.2;
  };
  ACTS.onde = (X, e, col, A) => {
    // un colosse-carte : l'onde naît sous vos pieds, dans son dos immense (1.16.4) ; on la voit venir
    if (A.cx == null) {
      if (col.map) { A.cx = X.player.x + rnd(-220, 220); A.cy = X.player.y + rnd(-220, 220); FX.ring(A.cx, A.cy, U.rgba(e.pal.accent, 0.8), 10, col.A * 0.15, 0.5, 4); }
      else { A.cx = col.x; A.cy = col.y; }
    }
    if (A.t > 0.5 && !A.n) { A.n = 1; AN.Combat.shockwave(X, { x: A.cx, y: A.cy, r0: col.A * 0.15, speed: 300, max: col.A * 0.9, width: 26, dmg: col.dmg * 0.6, team: 'wild', color: e.pal.accent }); X.cam.shake(6); AN.Audio.play('explosion', { pitch: 0.6 }); }
    if (A.t > 1.2 && A.n === 1) { A.n = 2; AN.Combat.shockwave(X, { x: A.cx, y: A.cy, r0: col.A * 0.15, speed: 300, max: col.A * 0.9, width: 26, dmg: col.dmg * 0.6, team: 'wild', color: e.pal.accent }); }
    return A.t > 1.6;
  };
  ACTS.roulement = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.init) { A.init = 1; A.a = Math.atan2(p.y - col.y, p.x - col.x); AN.Combat.telegraph(X, { kind: 'line', x: col.x, y: col.y, angle: A.a, len: col.L * 1.4, width: col.L * 0.8, windup: 0.8, dmg: 0, team: 'wild' }); }
    if (A.t < 0.8) { col.spinRate += (Math.min(3, col.spinMax || 3) - col.spinRate) * dt * 2; return false; }
    col.vx = Math.cos(A.a) * col.A * 0.75; col.vy = Math.sin(A.a) * col.A * 0.75;
    for (let k = 0; k < col.K; k++) { const c = col.caps.find((cc) => cc.a === 'b' + k + '_2'); if (c) capsuleHit(X, e, col, c, col.dmg, 420, A); }
    return A.t > 2.4;
  };
  ACTS.inversion = (X, e, col, A, dt) => {
    if (!A.init) { A.init = 1; A.to = -(Math.sign(col.spinRate) || 1) * Math.min(2.8, col.spinMax || 2.8); AN.Audio.play('boss_roar', { at: e, pitch: 1.2 }); }
    col.spinRate += (A.to - col.spinRate) * Math.min(1, dt * 1.2);
    if (A.t < 1) col.shake = 0.4;
    return A.t > 2;
  };
  /** Arrêt (éclipse, reliure refermée…) : il se recharge ; ses bras se posent et se découvrent. */
  ACTS.arret = (X, e, col, A, dt) => {
    col.spinRate *= Math.exp(-dt * 3);
    if (!A.init) { A.init = 1; col.stall = 5; FX.text(col.x, col.y - col.L * 0.2, 'il s’arrête', AN.CYAN, { size: 13, bold: true, life: 1.6 }); }
    return col.stall <= 0;
  };
  ACTS.eclipse = ACTS.arret;
  ACTS.attraction = ACTS.tourbillon;

  /* ----- araignée ----- */
  ACTS.toile = (X, e, col, A) => {
    if (!A.done) {
      A.done = 1;
      const p = X.player, n = col.cfg.signature === 'toile' ? 6 : 4;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, r = i ? 60 + Math.random() * 200 : 0;
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        AN.Combat.telegraph(X, { x, y, r: 60, windup: 0.8, dmg: 0, team: 'wild', color: '#e8e0f0', silent: i > 0,
          onDone: (XX) => AN.Combat.pool(XX, { x, y, r: 64, dps: col.dmg * 0.12, life: 6, color: '#e8e0f0', team: 'wild', slow: 0.55 }) });
      }
    }
    return A.t > 1.2;
  };
  ACTS.dispersion = (X, e, col, A, dt) => {
    const p = X.player;
    if (!A.init) { A.init = 1; FX.burst(col.x, col.y, e.pal.glow || '#ffffff', 80, 420, { size: 3 }); col.hidden = 1.4; if (p.climb && p.climb.e === e) Co.drop(X, p, 'eject'); AN.Audio.play('shatter'); }
    if (A.t > 1.3 && !A.out) {
      A.out = 1;
      const a = Math.random() * TAU;
      col.x = U.clamp(p.x + Math.cos(a) * col.A * 0.45, col.bounds.x0, col.bounds.x1); col.y = U.clamp(p.y + Math.sin(a) * col.A * 0.45, col.bounds.y0, col.bounds.y1);
      col.legs.forEach((l) => { const r = local(col, l.rest[0], l.rest[1]); l.fx = r.x; l.fy = r.y; l.fz = 0; l.mv = null; });
      FX.burst(col.x, col.y, e.pal.glow || '#ffffff', 80, 420, { size: 3 });
    }
    return A.t > 1.6;
  };

  Co.ACTS = ACTS;
  Co.PLANS = PLANS;
  /** Ce que le colosse sait faire, et ce qui convient à la distance. */
  function chooseAct(X, e, col) {
    const p = X.player, cd = col.cfg;
    const d = U.dist(p.x, p.y, col.x, col.y);
    const L = col.L;
    // un colosse-carte s'en prend à ce qui est sur lui : pluies, ondes, souffle, fils, rugissement
    if (col.map) { // pondérées : les pluies et les ondes surtout, le rugissement (qui secoue) plus rarement
      const nearMouth = U.dist(p.x, p.y, col.mouth.x, col.mouth.y) < 1300; // son souffle ne porte pas d'un bout à l'autre de son dos
      const back = ['pluie', 'pluie', 'pluie', 'onde', 'onde', 'rugissement'].concat(nearMouth ? ['souffle', 'souffle'] : [], col.plan === 'araignee' ? ['toile', 'toile'] : [], col.plan === 'roue' ? ['inversion'] : []);
      return back[Math.floor(Math.random() * back.length)];
    }
    const list = cd.attacks.concat(cd.signature && !cd.attacks.includes(cd.signature) ? [cd.signature] : []);
    const ok = list.filter((a) => {
      if (a === 'pietinement' || a === 'empalement') return d < L * (col.plan === 'araignee' ? 0.8 : 0.6);
      if (a === 'balayage' || a === 'houlette' || a === 'ecrasement' || a === 'racines') return d < L * 0.7 && d > L * 0.12;
      if (a === 'morsure') return d < L * (col.plan === 'serpent' ? 0.7 : 0.75);
      if (a === 'carapace') return d < L * 1.2;
      if (a === 'bond') return d > L * 0.3 && d < L * 1.1;
      if (a === 'enroulement') return d < L * 0.9;
      if (a === 'plongee') return !col.under;
      if (a === 'eboulis' || a === 'seisme' || a === 'geyser' || a === 'sillage') return false; // portés par d'autres attaques
      return true;
    });
    // les roues s'arrêtent toutes les trois attaques ; les autres rugissent parfois
    if (col.plan === 'roue' && col.attacks % 3 === 2) return cd.signature === 'eclipse' ? 'eclipse' : 'arret';
    if (col.plan === 'roue' && col.attacks % 3 === 1 && cd.signature === 'inversion') return 'inversion';
    if (!ok.length || Math.random() < 0.12) return col.plan === 'roue' ? 'onde' : col.plan === 'volant' ? 'bourrasque' : 'rugissement';
    // un volant plonge souvent : c'est le seul moment où on l'atteint
    if (col.plan === 'volant' && ok.includes('plongeon') && Math.random() < 0.45) return 'plongeon';
    // une araignée frappe souvent de la patte : c'est alors que ses pattes se découvrent
    if (col.plan === 'araignee' && ok.includes('empalement') && Math.random() < 0.4) return 'empalement';
    // la tortue piétine souvent : sa patte avant se découvre
    if (col.plan === 'quadrupede' && ok.includes('pietinement') && Math.random() < 0.3) return 'pietinement';
    // la signature revient souvent
    if (cd.signature && ok.includes(cd.signature) && Math.random() < 0.25) return cd.signature;
    return ok[Math.floor(Math.random() * ok.length)];
  }

  /* ======================= Déplacement ======================= */
  function steer(col, tx, ty, speed, turn, dt) {
    const a = Math.atan2(ty - col.y, tx - col.x);
    col.a += U.clamp(U.angDiff(col.a, a), -turn * dt, turn * dt);
    const d = Math.hypot(tx - col.x, ty - col.y);
    const sp = d < 30 ? 0 : speed * Math.min(1, d / 200);
    const fx = Math.cos(col.a) * sp, fy = Math.sin(col.a) * sp;
    col.vx += (fx - col.vx) * Math.min(1, dt * 2); col.vy += (fy - col.vy) * Math.min(1, dt * 2);
  }
  function roamTarget(X, col) {
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * TAU, r = 150 + Math.random() * Math.min(col.L * 1.1, 900);
      const x = col.lair.x + Math.cos(a) * r, y = col.lair.y + Math.sin(a) * r;
      if (x < col.bounds.x0 || y < col.bounds.y0 || x > col.bounds.x1 || y > col.bounds.y1) continue;
      if (Z.tileAt(X.zone, x, y) === Z.FLOOR) return { x, y };
    }
    return { x: col.lair.x, y: col.lair.y };
  }
  function move(X, e, col, dt) {
    const p = X.player, b = e.boss, L = col.L;
    const awake = b.active && !b.introT;
    const climbed = p.climb && p.climb.e === e;
    const sp = Math.min(L * (col.plan === 'serpent' ? 0.34 : col.plan === 'volant' ? 0.55 : 0.2), col.plan === 'serpent' ? 380 : col.plan === 'volant' ? 520 : 240) * col.rage;
    if (b.active && b.introT > 0 && col.plan !== 'volant') { col.vx *= 0.85; col.vy *= 0.85; return; } // il entre en scène : il vous regarde
    if (col.map) { // il est la carte : il respire, piétine, tourne à peine sur lui-même
      col.vx += (Math.cos(col.t * 0.13) * 8 - col.vx) * Math.min(1, dt); col.vy += (Math.sin(col.t * 0.11) * 8 - col.vy) * Math.min(1, dt); // le monde ne tourne pas sous vos pieds
      if (col.plan === 'roue') col.spinRate += (0.04 * (Math.sign(col.spinRate) || 1) - col.spinRate) * Math.min(1, dt * 0.8);
      return;
    }
    if (col.stun > 0 || col.biteTail > 0 || col.hidden > 0) { col.vx *= 0.85; col.vy *= 0.85; return; }
    if (col.plan === 'volant') {
      const c = awake ? { x: p.x, y: p.y } : col.lair;
      col.orbit = (col.orbit || 0) + dt * (awake ? 0.45 : 0.25);
      const R = Math.min(L * (awake ? 0.62 : 0.8), awake ? 720 : 900);
      const tx = c.x + Math.cos(col.orbit) * R, ty = c.y + Math.sin(col.orbit) * R;
      steer(col, tx, ty, sp, 1.1, dt);
      col.alt += ((climbed ? 1.9 : awake ? 1.35 : 1.3) - col.alt) * Math.min(1, dt * 0.8);
      return;
    }
    if (col.plan === 'roue') {
      col.spinRate += (Math.min(awake ? 1.1 : 0.5, col.spinMax || 1.1) * (Math.sign(col.spinRate) || 1) - col.spinRate) * Math.min(1, dt * 0.8);
      if (col.stall > 0) { col.vx *= 0.9; col.vy *= 0.9; return; }
      const t = awake ? p : (col.roamTo || col.lair);
      steer(col, t.x, t.y, awake ? sp : sp * 0.6, 2, dt);
      if (awake && U.dist(p.x, p.y, col.x, col.y) < L * 0.35) { col.vx *= 0.9; col.vy *= 0.9; }
      return;
    }
    if (!awake) {
      if (!col.roamTo || U.dist(col.x, col.y, col.roamTo.x, col.roamTo.y) < 60) {
        col.roamWait -= dt;
        col.vx *= 0.9; col.vy *= 0.9;
        if (col.roamWait <= 0) { col.roamTo = roamTarget(X, col); col.roamWait = rnd(2, 5); }
        return;
      }
      steer(col, col.roamTo.x, col.roamTo.y, sp * 0.55, 0.7, dt);
      return;
    }
    if (col.plan === 'serpent') {
      // il tourne autour de vous en ondulant
      col.orbit = (col.orbit || Math.atan2(col.y - p.y, col.x - p.x)) + dt * 0.5;
      const R = L * 0.45;
      const tx = p.x + Math.cos(col.orbit) * R, ty = p.y + Math.sin(col.orbit) * R;
      steer(col, tx, ty, sp, 1.8, dt);
      col.a += Math.sin(col.t * 2.4) * dt * 0.8;
      return;
    }
    // marcheurs : ils s'approchent jusqu'à vous avoir à portée de pied
    const want = L * (col.plan === 'araignee' ? 0.35 : 0.3);
    const d = U.dist(p.x, p.y, col.x, col.y);
    if (d > want) steer(col, p.x, p.y, sp, 0.9, dt);
    else { col.vx *= 0.9; col.vy *= 0.9; col.a += U.clamp(U.angDiff(col.a, Math.atan2(p.y - col.y, p.x - col.x)), -0.6 * dt, 0.6 * dt); }
  }

  /* ======================= Mise à jour ======================= */
  Co.update = function (X, e, dt) {
    const col = e.col, b = e.boss, p = X.player;
    Co.setView(X.cam);
    col.t += dt;
    e.flash -= dt;
    if (col.stun > 0) col.stun -= dt;
    if (col.biteTail > 0) col.biteTail -= dt;
    if (col.stall > 0) col.stall -= dt;
    if (col.hidden > 0) col.hidden -= dt;
    col.shakeCd -= dt;
    if (b.exhausted) {
      col.down = true; if (col.act) setAct(col, null); col.vx *= 0.9; col.vy *= 0.9; col.alt = Math.max(0.05, col.alt - dt);
      AN.Boss.exhaustedUpdate(X, e, dt);
      finish(X, e, col, dt);
      if (col.map) mapForms(X, e, col);
      return;
    }
    col.down = false;
    if (!b.active) {
      // il erre ; il se réveille si vous l'approchez, ou si vous le touchez
      if (p.alive && !X.ending && !X.colShow && (U.dist(p.x, p.y, col.x, col.y) < Math.max(col.L * 0.6, 500) || (p.climb && p.climb.e === e))) AN.Boss.wake(X, e);
    } else if (b.introT > 0) {
      b.introT -= dt;
      col.a += U.clamp(U.angDiff(col.a, Math.atan2(p.y - col.y, p.x - col.x)), -dt, dt);
    } else {
      if (U.dist(p.x, p.y, col.x, col.y) > col.L * 2.6 && !(p.climb && p.climb.e === e)) { b.active = false; X.activeBoss = null; setAct(col, null); }
      // l'Artefact finit par remarquer sa faiblesse
      col.hintT += dt;
      if (col.hintT > (col.hintI ? 45 : 30) && col.hintI < col.cfg.hints.length) { AN.HUD.toast('L’Artefact : ' + col.cfg.hints[col.hintI], 8); col.hintI++; col.hintT = 0; }
      // qui grimpe sur lui le fait se secouer
      if (p.climb && p.climb.e === e && col.shakeCd <= 0 && (!col.act || col.act.type !== 'secousse')) {
        setAct(col, { type: 'secousse', t: 0, dur: rnd(1.5, 2.2) });
        col.shakeCd = rnd(7, 11) / col.rage;
        AN.Audio.play('boss_roar', { at: e, pitch: 1.3 }); // l'invite dit de tenir (E)
      }
      if (!col.act) {
        col.cd -= dt * col.rage;
        if (col.cd <= 0 && !(p.climb && p.climb.e === e && col.plan !== 'roue' && col.plan !== 'volant' && !col.map)) {
          const type = chooseAct(X, e, col);
          setAct(col, { type, t: 0 });
          col.attacks++;
          col.cd = col.map ? rnd(3, 5) : rnd(1.4, 2.6); // un colosse-carte : on vit sur lui, il laisse respirer
        }
      }
    }
    if (col.act) {
      const A = col.act;
      const done = ACTS[A.type] ? ACTS[A.type](X, e, col, A, dt) : true;
      A.t += dt;
      if (done && col.act === A) setAct(col, null);
    }
    if (!col.act || ['secousse', 'chancelle', 'rugissement', 'souffle', 'pluie', 'onde', 'toile', 'tourbillon', 'attraction', 'arret', 'eclipse', 'inversion', 'bourrasque'].includes(col.act.type)) move(X, e, col, dt);
    // un serpent qui heurte la roche : à la charge, il s'assomme ; sinon, il plonge
    if (col.plan === 'serpent' && !col.under && col.stun <= 0) {
      const ahead = { x: col.x + Math.cos(col.a) * 30, y: col.y + Math.sin(col.a) * 30 };
      const tile = Z.tileAt(X.zone, ahead.x, ahead.y);
      if (Z.isSolid(tile)) {
        if (col.act && col.act.type === 'charge' && col.act.t > 0.8) {
          col.stun = 4.5; setAct(col, null); col.vx = col.vy = 0;
          X.cam.shake(14); AN.Audio.play('boom');
          FX.burst(ahead.x, ahead.y, '#8a7a62', 40, 300, { size: 5, kind: 'square' });
          FX.text(col.x, col.y - 50, 'assommé', AN.CYAN, { size: 14, bold: true, life: 2 });
        } else if (col.cfg.burrow && b.active && (!col.act || col.act.type !== 'plongee')) {
          setAct(col, { type: 'plongee', t: 0 });
        } else { col.a += Math.PI * 0.6; col.vx *= -0.3; col.vy *= -0.3; }
      }
    }
    if (col.plan === 'serpent' && col.under && !col.act) col.under = false;
    if (col.shell > 0 && (!col.act || col.act.type !== 'carapace')) col.shell = Math.max(0, col.shell - dt * 1.5); // la tortue ressort, même interrompue
    finish(X, e, col, dt);
  };
  function finish(X, e, col, dt) {
    col.downK = (col.downK || 0) + ((col.down ? 1 : 0) - (col.downK || 0)) * Math.min(1, dt * 1.6); // il s'effondre, se relève, sans à-coup
    col.shake *= Math.exp(-dt * 3);
    if (!col.act) { const k = Math.exp(-dt * 5); col.rear *= k; col.lean *= k; col.lift *= k; }
    col.x += col.vx * dt; col.y += col.vy * dt;
    col.x = U.clamp(col.x, col.bounds.x0, col.bounds.x1); col.y = U.clamp(col.y, col.bounds.y0, col.bounds.y1);
    col.walk += dt * (1.2 + Math.hypot(col.vx, col.vy) / (col.L * 0.08));
    if (col.plan !== 'volant' && col.plan !== 'roue' && col.plan !== 'serpent' && !col.map && Math.hypot(col.vx, col.vy) > 5) col.a += U.clamp(U.angDiff(col.a, Math.atan2(col.vy, col.vx)), -dt * 1.2, dt * 1.2) * 0.3;
    col.spin += col.spinRate * dt;
    for (const k in col.n) { const n = col.n[k]; n.ox = n.x; n.oy = n.y; }
    PLANS[col.plan].pose(X, e, col, dt);
    // garde-fou (1.16.1) : aucun membre ne bondit d'une image à l'autre (sauf quand il se disperse, invisible)
    if (dt > 0 && !(col.hidden > 0)) {
      const max = Math.max(24, 2600 * dt);
      for (const k in col.n) {
        const n = col.n[k];
        if (n.ox == null || n.under) continue;
        const dx = n.x - n.ox, dy = n.y - n.oy, d = Math.hypot(dx, dy);
        if (d > max) { n.x = n.ox + (dx * max) / d; n.y = n.oy + (dy * max) / d; }
        if (n.oz != null) { const dz = n.z - n.oz, mz = max / col.ZH; if (Math.abs(dz) > mz) n.z = n.oz + Math.sign(dz) * mz; }
      }
    }
    for (const k in col.n) col.n[k].oz = col.n[k].z;
    // vitesse de chaque nœud : une partie qui file ne se saisit pas
    for (const k in col.n) { const n = col.n[k]; n.v = dt > 0 ? Math.hypot(n.x - n.ox, n.y - n.oy) / dt : 0; }
    e.x = col.x; e.y = col.y + (col.plan === 'volant' ? 0 : 0);
    e.face = col.a;
    e.hidden = col.hidden > 0;
    e.anim += dt;
    updateSeals(X, e, col);
    syncHp(e);
  }
  Co.onRecover = function (X, e) {
    const col = e.col;
    col.down = false;
    const last = col.seals.slice().reverse().find((s) => s.broken);
    if (last) { last.broken = false; last.hp = Math.round(last.max * 0.5); }
    setAct(col, { type: 'rugissement', t: 0 });
    syncHp(e);
    AN.HUD.toast(e.def.name + ' se relève : un sceau s’est refermé.', 4);
  };
  Co.onDown = function (X, e) {
    const col = e.col;
    setAct(col, null);
    col.down = true; col.stall = 0; col.under = false; col.hidden = 0; col.shell = 0;
    if (col.map && e.boss) e.boss.exhaustT = Math.max(e.boss.exhaustT, 50); // le temps de traverser son dos jusqu'aux formes de capture (1.16.3)
    X.cam.shake(18);
    AN.Audio.play('boom');
  };

  /* ======================= Le joueur et le colosse ======================= */
  /** Parties d'une zone reliées à pied (murs et barrières des caveaux les séparent) : calculées une fois par zone. */
  function compOf(zone, x, y) {
    if (!zone || !zone.grid) return null;
    if (!zone.comp) {
      const w = zone.w, hgt = zone.h, comp = new Int32Array(w * hgt).fill(-1);
      let id = 0;
      for (let i = 0; i < w * hgt; i++) {
        if (comp[i] >= 0 || Z.isSolid(zone.grid[i])) continue;
        const st = [i]; comp[i] = id;
        while (st.length) {
          const j = st.pop(), jx = j % w, jy = (j / w) | 0;
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const nx = jx + dx, ny = jy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= hgt) return;
            const n = ny * w + nx;
            if (comp[n] < 0 && !Z.isSolid(zone.grid[n])) { comp[n] = id; st.push(n); }
          });
        }
        id++;
      }
      zone.comp = comp;
    }
    const tx = Math.floor(x / Z.T), ty = Math.floor(y / Z.T);
    if (tx < 0 || ty < 0 || tx >= zone.w || ty >= zone.h) return null;
    return zone.comp[ty * zone.w + tx];
  }
  Co.compOf = compOf;
  /** Où tombe un point dessiné sur une capsule : { t, off, inside } (off de −1 à 1 sur sa largeur). */
  function locate(col, c, x, y) {
    const pa = PN(col, col.n[c.a]), pb = PN(col, col.n[c.b]);
    if (c.disc) {
      const r = ((c.ra * pa.s + c.rb * pb.s) / 2) * 0.85 || 1;
      const u = (x - (pa.x + pb.x) / 2) / r, v = (y - (pa.y + pb.y) / 2) / r;
      const k = Math.sqrt(Math.max(1e-4, 1 - Math.min(1, u * u)));
      return { t: U.clamp((u + 1) / 2, 0, 1), off: U.clamp(v / k, -9, 9), inside: u * u + v * v <= 1 };
    }
    if (c.stadium) { // le dos d'un colosse-carte : jusqu'à ses bords arrondis (1.16.4)
      const dx = pb.x - pa.x, dy = pb.y - pa.y, l = Math.hypot(dx, dy) || 1;
      const t = ((x - pa.x) * dx + (y - pa.y) * dy) / (l * l);
      const tmin = -(c.ra * pa.s) / l, tmax = 1 + (c.rb * pb.s) / l, tt = U.clamp(t, tmin, tmax);
      const tc = U.clamp(tt, 0, 1), r = U.lerp(c.ra * pa.s, c.rb * pb.s, tc);
      const du = tt < 0 ? -tt * l : tt > 1 ? (tt - 1) * l : 0, avail = Math.sqrt(Math.max(0, r * r - du * du));
      const off = ((x - pa.x) * -dy + (y - pa.y) * dx) / l / Math.max(1, avail * 0.85);
      return { t: tt, off: U.clamp(off, -9, 9), inside: t >= tmin && t <= tmax && Math.abs(off) <= 1 && avail > 4 };
    }
    const dx = pb.x - pa.x, dy = pb.y - pa.y, l2 = dx * dx + dy * dy || 1, l = Math.sqrt(l2);
    const t = ((x - pa.x) * dx + (y - pa.y) * dy) / l2;
    const tc = U.clamp(t, 0, 1);
    const r = U.lerp(c.ra * pa.s, c.rb * pb.s, tc) * 0.85;
    const off = ((x - pa.x) * -dy + (y - pa.y) * dx) / l / Math.max(1, r);
    return { t: tc, off, inside: t >= 0 && t <= 1 && Math.abs(off) <= 1 };
  }
  Co.locate = locate;
  const linked = (a, b) => a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b;
  /** La partie du corps sous un point (à la même hauteur, ou reliée à celle où l'on est) ; flatOnly : son dos seulement. */
  function partAt(col, x, y, from, z, flatOnly) {
    let best = null, bs = 1e9;
    for (const o of col.caps) {
      if (o === from || !o.grip || !visible(col, o) || col.n[o.a].under || col.n[o.b].under) continue;
      if (flatOnly && !o.flat) continue;
      const q = locate(col, o, x, y);
      if (!q.inside) continue;
      const zc = U.lerp(col.n[o.a].z, col.n[o.b].z, q.t);
      const dz = Math.abs(zc - z);
      if (!(from && linked(from, o)) && dz > 0.35) continue;
      const sc = dz - (o.flat ? 0.2 : 0);
      if (sc < bs) { bs = sc; best = { cap: o, t: q.t, off: q.off }; }
    }
    return best;
  }
  Co.partAt = partAt;

  /* ======================= L'écosystème de son dos (1.16.2) ======================= */
  /** Ce qui pousse sur son dos, selon ce qu'il est. */
  const DECOR = {
    mousse: ['arbre', 'herbe', 'champignon', 'herbe', 'arbre'], continent: ['arbre', 'arbre', 'rocher', 'ruine', 'herbe'], carapace: ['herbe', 'rocher', 'arbre', 'cristal'],
    braises: ['rocher', 'braise', 'braise'], cristaux: ['cristal', 'cristal', 'rocher'], glace: ['cristal', 'rocher', 'cristal'], nageoires: ['corail', 'herbe', 'corail'],
    plumes: ['braise', 'herbe', 'braise'], engrenages: ['rouage', 'ruine', 'rocher'], rayons: ['braise', 'cristal'], etoiles: ['etoile', 'cristal', 'etoile'],
    spirale: ['etoile', 'herbe', 'etoile'], pages: ['ruine', 'herbe', 'ruine'], fils: ['toile', 'etoile', 'toile'], 'cratères': ['rocher', 'cristal', 'rocher'],
  };
  /* ======================= Le dos-biome d'un colosse-carte (1.16.4) ======================= */
  // Son dos est un paysage de son biome : une grille dans le repère de sa plus grande surface plate
  // (u le long de la capsule, v en travers, en px au sol), avec son sol, ses reliefs, ses mares, son décor.
  const BT = 32, OUT = 255;
  /** Position (t, off) sur la capsule du dos → (u, v). */
  function backUV(col, c, t, off) {
    if (c.disc) { const R = c.ra * 0.85, un = t * 2 - 1, k = Math.sqrt(Math.max(0, 1 - un * un)); return { u: 1 + un * R, v: k * off * R }; }
    const A = col.n[c.a], B = col.n[c.b], len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    const r = t < 0 ? c.ra : t > 1 ? c.rb : U.lerp(c.ra, c.rb, t), du = t < 0 ? -t * len : t > 1 ? (t - 1) * len : 0;
    return { u: t * len, v: off * Math.sqrt(Math.max(0, r * r - du * du)) * 0.85 };
  }
  /** (u, v) → (t, off) sur la capsule du dos. */
  function backTO(col, c, u, v) {
    if (c.disc) { const R = c.ra * 0.85, un = U.clamp((u - 1) / R, -0.999, 0.999), k = Math.sqrt(1 - un * un); return { t: (un + 1) / 2, off: v / (k * R) }; }
    const A = col.n[c.a], B = col.n[c.b], len = Math.hypot(B.x - A.x, B.y - A.y) || 1, t = u / len;
    const r = t < 0 ? c.ra : t > 1 ? c.rb : U.lerp(c.ra, c.rb, t), du = t < 0 ? -t * len : t > 1 ? (t - 1) * len : 0;
    return { t, off: v / Math.max(1, Math.sqrt(Math.max(0, r * r - du * du)) * 0.85) };
  }
  /** La case du dos sous (t, off) : FLOOR, WALL, HAZARD ; null hors du dos. */
  function backCell(col, capIdx, t, off) {
    const B = col.back;
    if (!B || capIdx !== B.cap) return null;
    const q = backUV(col, col.caps[B.cap], t, off);
    const i = Math.floor((q.u - B.u0) / BT), j = Math.floor((q.v - B.v0) / BT);
    if (i < 0 || j < 0 || i >= B.w || j >= B.h) return null;
    const g = B.grid[j * B.w + i];
    return g === OUT ? null : g;
  }
  Co.backCell = backCell;
  Co.backUV = backUV; Co.backTO = backTO;
  /** Une case libre de son dos, au hasard : { cap, t, off } (loin de la plateforme si on le demande). */
  function backSpot(col, rng, away) {
    const B = col.back, c = col.caps[B.cap];
    for (let k = 0; k < 200; k++) {
      const i = rng.int(1, B.w - 2), j = rng.int(1, B.h - 2);
      if (B.grid[j * B.w + i] !== Z.FLOOR) continue;
      // pas collé à un relief
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (B.grid[(j + dy) * B.w + i + dx] === Z.WALL) near = true;
      if (near) continue;
      const u = B.u0 + (i + 0.5) * BT, v = B.v0 + (j + 0.5) * BT;
      if (away && B.pad && Math.hypot(u - B.pad.u, v - B.pad.v) < away) continue;
      const to = backTO(col, c, u, v);
      if (Math.abs(to.off) > 0.95) continue;
      return { cap: c.i, t: to.t, off: to.off, u, v };
    }
    return { cap: c.i, t: 0.5, off: 0, u: 0, v: 0 };
  }
  Co.backSpot = backSpot;
  function buildBack(X, e, col, zone, rng, cap) {
    const b = D.BIOME[zone.biome] || D.BIOME[((X.world.zones || [])[0] || {}).biome] || D.BIOMES[0];
    const A = col.n[cap.a], Bn = col.n[cap.b], len = cap.disc ? 0 : Math.hypot(Bn.x - A.x, Bn.y - A.y);
    const R = Math.max(cap.ra, cap.rb);
    const u0 = cap.disc ? 1 - R : -R, v0 = -R;
    const w = Math.ceil((cap.disc ? 2 * R : len + 2 * R) / BT), h = Math.ceil((2 * R) / BT);
    const B = (col.back = { cap: cap.i, biome: b.id, u0, v0, w, h, grid: new Uint8Array(w * h).fill(OUT), shade: new Float32Array(w * h), decor: [] });
    const rad = (u) => (cap.disc ? R : U.lerp(cap.ra, cap.rb, U.clamp(u / Math.max(1, len), 0, 1)));
    const inside = (u, v, k) => { if (cap.disc) return Math.hypot(u - 1, v) <= R * k; const uc = U.clamp(u, 0, len); return Math.hypot(u - uc, v) <= rad(uc) * k; };
    const cu = (i) => u0 + (i + 0.5) * BT, cv = (j) => v0 + (j + 0.5) * BT;
    const nS = new AN.Noise(rng.int(1, 1e9)), nB = new AN.Noise(rng.int(1, 1e9));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i;
      B.shade[k] = nS.fbm(i * 0.18, j * 0.18, 3);
      if (inside(cu(i), cv(j), 0.9)) B.grid[k] = Z.FLOOR;
    }
    // ce qui reste dégagé : la plateforme, les sceaux, les attaches des membres
    const pad = col.deck.pad, pq = backUV(col, cap, pad.t, pad.off);
    B.pad = { u: pq.u, v: pq.v };
    const clear = [{ u: pq.u, v: pq.v, r: BT * 7 }];
    col.seals.forEach((s) => { const an = col.anchors[s.at]; if (an && an.cap === cap.i) { const q = backUV(col, cap, an.t, an.off); clear.push({ u: q.u, v: q.v, r: BT * 4 }); } });
    if (cap.disc) clear.push({ u: 1, v: 0, r: BT * 4 }); else { clear.push({ u: 0, v: 0, r: BT * 5 }); clear.push({ u: len, v: 0, r: BT * 5 }); }
    const free = (u, v, m) => inside(u, v, 0.74) && !clear.some((q) => Math.hypot(u - q.u, v - q.v) < q.r + m);
    // des massifs, en îlots séparés : on passe toujours entre eux (au moins deux cases)
    const blobs = [];
    const interior = B.grid.reduce((n, g, k) => n + (g === Z.FLOOR && inside(cu(k % w), cv((k / w) | 0), 0.74) ? 1 : 0), 0);
    const wallFrac = U.clamp((1 - (b.open != null ? b.open : 0.6)) * 0.4, 0.07, 0.18);
    const nb = Math.round((interior * wallFrac) / 11);
    for (let k = 0, tries = 0; k < nb && tries < nb * 30; tries++) {
      const r = rng.float(1.2, 2.8) * BT, u = rng.float(u0, u0 + w * BT), v = rng.float(v0, v0 + h * BT);
      if (!free(u, v, r) || blobs.some((o) => Math.hypot(o.u - u, o.v - v) < o.r + r + BT * 2.2)) continue;
      blobs.push({ u, v, r }); k++;
    }
    blobs.forEach((o) => {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const d = Math.hypot(cu(i) - o.u, cv(j) - o.v), wob = 0.75 + 0.45 * nB.fbm(i * 0.5, j * 0.5, 2);
        if (d <= o.r * wob && B.grid[j * w + i] === Z.FLOOR) B.grid[j * w + i] = Z.WALL;
      }
    });
    // des mares du danger du biome
    if (b.hazard) {
      const np = Math.max(2, Math.round((interior * (b.hazardAmt || 0.05)) / 16));
      for (let k = 0, tries = 0; k < np && tries < np * 30; tries++) {
        const r = rng.float(1.5, 3.2) * BT, u = rng.float(u0, u0 + w * BT), v = rng.float(v0, v0 + h * BT);
        if (!free(u, v, r) || blobs.some((o) => Math.hypot(o.u - u, o.v - v) < o.r + r + BT * 2)) continue;
        blobs.push({ u, v, r, pool: true }); k++;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const d = Math.hypot(cu(i) - u, cv(j) - v), wob = 0.75 + 0.45 * nB.fbm(i * 0.6 + 40, j * 0.6, 2);
          if (d <= r * wob && B.grid[j * w + i] === Z.FLOOR) B.grid[j * w + i] = Z.HAZARD;
        }
      }
    }
    // le menu décor du biome (non bloquant), comme au sol d'une zone
    const nd = Math.round(w * h * 0.07);
    for (let k = 0; k < nd; k++) {
      const i = rng.int(0, w - 1), j = rng.int(0, h - 1);
      if (B.grid[j * w + i] !== Z.FLOOR || !b.decor || !b.decor.length) continue;
      const d = rng.pick(b.decor);
      B.decor.push({ x: i * BT + rng.float(2, BT - 2), y: j * BT + rng.float(2, BT - 2), type: d[0], color: d[1], s: rng.float(0.7, 1.3), rot: rng.float(0, TAU) });
    }
    B.walls = B.grid.reduce((n, g) => n + (g === Z.WALL ? 1 : 0), 0);
    B.pools = B.grid.reduce((n, g) => n + (g === Z.HAZARD ? 1 : 0), 0);
    return B;
  }
  function buildDeck(X, e, col, zone, rng) {
    const deck = (col.deck = { decor: [], nodes: [], riders: [] });
    const flats = col.caps.filter((c) => c.flat && c.grip);
    if (!flats.length) return deck;
    const kinds = DECOR[col.cfg.look] || ['rocher', 'herbe'];
    // un colosse-carte porte la plateforme de l'Artefact, sur sa plus grande surface plate
    let back = null;
    if (col.map) {
      const big = flats.slice().sort((a, b) => (b.ra + b.rb) - (a.ra + a.rb))[0];
      if (!big.disc) big.stadium = true; // on marche jusqu'à ses bords arrondis
      deck.pad = { cap: big.i, t: 0.5, off: big.disc ? -0.5 : 0.5, R: 92 }; // à l'écart du sceau du dos
      back = buildBack(X, e, col, zone, rng, big);
    }
    const area = (c) => { const A = col.n[c.a], B = col.n[c.b]; return (Math.hypot(B.x - A.x, B.y - A.y) + c.ra + c.rb) * (c.ra + c.rb); };
    flats.forEach((c) => {
      if (back && c.i === back.cap) { // le dos-biome : de quoi peupler un paysage, sur ses cases libres
        const n = Math.min(260, Math.round((back.w * back.h) / 30));
        for (let k = 0; k < n; k++) { const q = backSpot(col, rng, 150); deck.decor.push({ cap: c.i, t: q.t, off: q.off, kind: rng.pick(kinds), s: rng.float(0.8, 1.6), seed: rng.int(0, 9999) }); }
        return;
      }
      const n = U.clamp(Math.round(area(c) / 12000), 2, 30);
      for (let k = 0; k < n; k++) {
        const d = { cap: c.i, t: rng.float(0.04, 0.96), off: rng.float(-0.85, 0.85), kind: rng.pick(kinds), s: rng.float(0.7, 1.4), seed: rng.int(0, 9999) };
        if (deck.pad && d.cap === deck.pad.cap && Math.abs(d.t - 0.5) < 0.22 && Math.abs(d.off) < 0.45) continue; // la plateforme reste dégagée
        deck.decor.push(d);
      }
    });
    // des gisements : ce que le paysage du monde produit
    let res = Object.keys((D.BIOME[zone.biome] || {}).resources || {});
    if (!res.length) for (const z of X.world.zones || []) { res = Object.keys((D.BIOME[z.biome] || {}).resources || {}); if (res.length) break; }
    const nn = res.length ? 2 + Math.floor(e.def.tier / 2) + (col.map ? 4 : 0) : 0;
    for (let k = 0; k < nn; k++) {
      if (back) { const q = backSpot(col, rng, 200); deck.nodes.push({ cap: q.cap, t: q.t, off: q.off, res: rng.pick(res), uses: 2, prog: 0 }); continue; }
      const c = rng.pick(flats); deck.nodes.push({ cap: c.i, t: rng.float(0.15, 0.85), off: rng.float(-0.7, 0.7), res: rng.pick(res), uses: 2, prog: 0 });
    }
    // des créatures y vivent : celles du monde
    if (X.creatures && AN.Entities && AN.WorldGen) {
      // la faune de sa zone, sinon celle des autres paysages du monde (un cratère, un foyer d'étoile n'ont parfois que leur maître)
      const biomes = [zone.biome, zone.mix].concat((X.world.zones || []).map((z) => z.biome)).filter(Boolean);
      let pool = [];
      for (const b of biomes) { pool = AN.WorldGen.pool(b).filter((d) => d.tier <= 1 && !d.fake); if (pool.length) break; }
      const n = back ? Math.min(40, 12 + e.def.tier * 2) : Math.min(10, 2 + e.def.tier);
      let grp = null;
      for (let k = 0; k < n && pool.length; k++) {
        // sur un dos-biome, elles vivent en groupes, chacun son coin, comme dans une zone
        if (back && (!grp || grp.left <= 0)) { const q = backSpot(col, rng, 500); grp = { def: rng.pick(pool), q, left: rng.int(2, 4) }; }
        const def = back ? grp.def : rng.pick(pool), c = back ? col.caps[back.cap] : rng.pick(flats);
        const r = AN.Entities.creature(def, col.x, col.y, { threat: X.world.threat, rule: X.world.rule, hueSeed: rng.int(0, 999) });
        let t = rng.float(0.2, 0.8), off = rng.float(-0.6, 0.6);
        if (back) { grp.left--; const to = backTO(col, c, grp.q.u + rng.float(-60, 60), grp.q.v + rng.float(-60, 60)); t = to.t; off = U.clamp(to.off, -0.9, 0.9); if (backCell(col, c.i, t, off) !== Z.FLOOR) { t = grp.q.t; off = grp.q.off; } }
        r.rider = { host: e, cap: c.i, t, off, goal: null, wait: rng.float(0, 3) };
        r.rider.home = { cap: r.rider.cap, t: r.rider.t, off: r.rider.off }; // son territoire : elle ne vous poursuit pas au-delà (1.16.3)
        if (r.temper === 'agressif' || r.temper === 'territorial') r.temper = 'territorial';
        deck.riders.push(r);
        X.creatures.push(r);
      }
    }
    return deck;
  }
  function placeRider(col, r) {
    const R = r.rider, c = col.caps[R.cap];
    const pt = capPoint(col, c, R.t, R.off);
    r.x = pt.x; r.y = pt.y; r.riderS = pt.s; r.riderZ = pt.z; R.gx = pt.gx; R.gy = pt.gy; R.low = Math.max(col.n[c.a].z, col.n[c.b].z) < 0.55;
  }
  /** Un passager descend (son colosse a disparu, ou la partie où il vivait) : il se pose au sol. */
  function dismount(X, r) {
    const R = r.rider;
    r.rider = null;
    if (X.zone && X.zone.colMap) {
      const pad = X.mapPad;
      if (R.ally && pad) { const a = (R.k || 0) * 2.1; r.x = pad.x + Math.cos(a) * 50; r.y = pad.y + Math.sin(a) * 40; r.home = { x: r.x, y: r.y }; FX.burst(r.x, r.y, AN.CYAN, 8, 90, { size: 2 }); return; }
      r.alive = false; r.noLoot = true; // il n'y a plus rien sous ses pattes : le vide
      FX.burst(r.x, r.y, r.pal ? r.pal.body : '#ffffff', 10, 120, { size: 2.5 });
      return;
    }
    let x = R.gx != null ? R.gx : r.x, y = R.gy != null ? R.gy : r.y;
    for (let k = 0; k < 60 && Z.tileAt(X.zone, x, y) !== Z.FLOOR; k++) { x += Math.cos(k * 2.4) * k * 6; y += Math.sin(k * 2.4) * k * 6; }
    r.x = x; r.y = y; r.home = { x, y };
    FX.burst(x, y, '#ffffff', 6, 90, { size: 2 });
  }
  /** Les créatures de son dos : elles errent sur lui, défendent leur territoire contre qui y monte. */
  Co.riderUpdate = function (X, r, dt) {
    const R = r.rider, host = R.host, col = host && host.col;
    r.flash -= dt; r.atkCd -= dt; r.stunT -= dt; r.slowT -= dt; r.aggroT -= dt; r.anim += dt;
    r.attackAnim = Math.max(0, (r.attackAnim || 0) - dt * 3);
    if (!host || !host.alive || !col) { dismount(X, r); return; }
    let cap = col.caps[R.cap];
    if (!cap || !visible(col, cap) || col.n[cap.a].under) {
      if (R.ally && col.deck && col.deck.pad) { R.cap = col.deck.pad.cap; R.t = col.deck.pad.t; R.off = 0; cap = col.caps[R.cap]; } // un compagnon se rattrape à la plateforme
      else { dismount(X, r); return; }
    }
    if (R.ally) { allyRide(X, r, R, host, col, cap, dt); return; }
    const p = X.player, onIt = p.climb && p.climb.e === host;
    if (r.stunT > 0 || r.frozenT > 0) { placeRider(col, r); return; }
    const here = capPoint(col, cap, R.t, R.off);
    const dp = U.dist(p.x, p.y, here.x, here.y);
    // à l'arrivée sur un colosse-carte, elles vous laissent poser le pied ; ensuite, chacune défend son coin de dos
    const calm = !!X.colShow || (X.colGrace || 0) > X.time || p.hidden;
    const hc = R.home && col.caps[R.home.cap], hp = hc && visible(col, hc) ? capPoint(col, hc, R.home.t, R.home.off) : null;
    const far = hp && U.dist(p.x, p.y, hp.x, hp.y) > (col.map ? 520 : 1e9);
    // la plateforme de l'Artefact est un abri : elles n'y entrent pas, et n'y attaquent pas qui s'y tient
    const pad = col.map && col.deck && col.deck.pad ? capPoint(col, col.caps[col.deck.pad.cap], col.deck.pad.t, 0) : null;
    const padR = pad ? col.deck.pad.R * pad.s : 0;
    const safe = pad && U.dist(p.x, p.y, pad.x, pad.y) < padR * 1.1;
    const hostile = (r.temper === 'territorial' || r.temper === 'agressif') && !calm && !far && !safe;
    let tx = null, ty = null;
    if (onIt && hostile && dp < 340) { const a = (r.seed || 0) * 2.4, k = r.r * (r.riderS || 1) + p.r + 6; tx = p.x + Math.cos(a) * k; ty = p.y + Math.sin(a) * k; } // chacune sa place autour de vous
    else if (onIt && r.temper === 'craintif' && dp < 220) { tx = here.x + (here.x - p.x); ty = here.y + (here.y - p.y); }
    else if (far && hp && U.dist(here.x, here.y, hp.x, hp.y) > 120) { tx = hp.x; ty = hp.y; } // elle regagne son coin
    else {
      R.wait -= dt;
      if (!R.goal || (R.wait <= 0 && R.at)) { R.goal = { t: Math.random() * 0.8 + 0.1, off: Math.random() * 1.4 - 0.7 }; R.wait = 1 + Math.random() * 3; R.at = false; }
      const g = capPoint(col, cap, R.goal.t, R.goal.off);
      if (pad && U.dist(g.x, g.y, pad.x, pad.y) < padR * 1.4) R.goal = null; // pas sur la plateforme : un autre but
      else if (U.dist(g.x, g.y, here.x, here.y) < 10) R.at = true; else { tx = g.x; ty = g.y; }
    }
    if (pad && tx != null && U.dist(tx, ty, pad.x, pad.y) < padR * 1.4) { const a = Math.atan2(ty - pad.y, tx - pad.x); tx = pad.x + Math.cos(a) * padR * 1.4; ty = pad.y + Math.sin(a) * padR * 1.4; }
    if (pad && U.dist(here.x, here.y, pad.x, pad.y) < padR * 1.3) { const a = Math.atan2(here.y - pad.y, here.x - pad.x); tx = pad.x + Math.cos(a) * padR * 1.6; ty = pad.y + Math.sin(a) * padR * 1.6; } // on s'écarte de la plateforme
    if (tx != null) {
      const d = Math.hypot(tx - here.x, ty - here.y);
      if (d > 8) {
        const k = Math.min(1, ((r.speed || 70) * 0.7 * dt) / d);
        const nx = here.x + (tx - here.x) * k, ny = here.y + (ty - here.y) * k;
        const L1 = locate(col, cap, nx, ny);
        let m = null;
        if (L1.inside) m = { cap: cap.i, t: L1.t, off: L1.off };
        else { const o = partAt(col, nx, ny, cap, here.z, true); if (o) m = { cap: o.cap.i, t: o.t, off: o.off }; }
        if (m && backCell(col, m.cap, m.t, m.off) === Z.WALL) { m = null; R.goal = null; } // un relief de son dos : elle le contourne
        if (m) { if (m.cap !== R.cap) R.goal = null; R.cap = m.cap; R.t = m.t; R.off = m.off; }
        r.face = Math.atan2(ty - here.y, tx - here.x);
      }
    }
    placeRider(col, r);
    // elles attaquent qui est sur leur colosse : leur propre jeu d'attaques (1.17), sans quitter leur place
    if (r.act) { AN.Kits.run(X, r, dt); return; }
    const kit = AN.Kits && AN.Kits.of(r.def);
    if (kit && kit.primary) { if (onIt && hostile && !p.climb.hop) AN.Kits.attack(X, r, p, dt, { fixed: true }); return; }
    const atk = r.atk;
    if (onIt && hostile && atk && r.atkCd <= 0 && !p.climb.hop) {
      const d = U.dist(p.x, p.y, r.x, r.y);
      const ranged = atk.type === 'shoot' || atk.type === 'spit' || atk.type === 'zap';
      if (ranged && d < (atk.range || 320)) {
        const a = Math.atan2(p.y - r.y, p.x - r.x), n = Math.min(3, atk.count || 1);
        for (let i = 0; i < n; i++) AN.Combat.shoot(X, { x: r.x, y: r.y, angle: a + (n > 1 ? (i / (n - 1) - 0.5) * (atk.spread || 0.3) : 0), speed: atk.speed || 300, dmg: (atk.dmg || 6) * r.dmgMul, team: 'wild', size: atk.size || 5, color: atk.color || r.pal.accent, range: atk.range || 340, owner: r });
        r.atkCd = (atk.cd || 1.4) * 1.2; r.attackAnim = 1;
      } else if (!ranged && d < r.r * (r.riderS || 1) + p.r + 12) {
        AN.Combat.hit(X, p, (atk.dmg || 6) * r.dmgMul, r, { knock: 120 });
        r.atkCd = (atk.cd || 1.2) * 1.2; r.attackAnim = 1;
      }
    }
  };
  /** Avancer sur le corps vers (tx, ty), d'une partie à l'autre. */
  function riderStep(col, r, R, cap, here, tx, ty, sp, dt) {
    const d = Math.hypot(tx - here.x, ty - here.y);
    if (d <= 8) return;
    const k = Math.min(1, (sp * dt) / d);
    const nx = here.x + (tx - here.x) * k, ny = here.y + (ty - here.y) * k;
    const L1 = locate(col, cap, nx, ny);
    let m = null;
    if (L1.inside) m = { cap: cap.i, t: L1.t, off: L1.off };
    else { const o = partAt(col, nx, ny, cap, here.z, true) || partAt(col, nx, ny, cap, here.z, false); if (o) m = { cap: o.cap.i, t: o.t, off: o.off }; }
    if (m && backCell(col, m.cap, m.t, m.off) === Z.WALL) m = null; // un relief : on contourne (un autre but)
    if (m) { if (m.cap !== R.cap) R.goal = null; R.cap = m.cap; R.t = m.t; R.off = m.off; } else R.goal = null;
    r.face = Math.atan2(ty - here.y, tx - here.x);
  }
  /**
   * Un compagnon sur un colosse-carte (1.16.3) : il vous suit sur son dos et s'en prend aux créatures
   * qui y vivent, au contact ou à distance. À terre, il attend que vous le releviez.
   */
  function allyRide(X, r, R, host, col, cap, dt) {
    if (r.downed || r.stunT > 0) { placeRider(col, r); return; }
    const p = X.player;
    const here = capPoint(col, cap, R.t, R.off);
    let tg = null, bd = 320;
    for (const o of col.deck.riders) {
      if (o === r || !o.alive || !o.rider || o.rider.ally || o.team !== 'wild') continue;
      const d = U.dist(o.x, o.y, here.x, here.y);
      if (d < bd && U.dist(o.x, o.y, p.x, p.y) < 460) { bd = d; tg = o; }
    }
    const A = r.atk, ranged = !!A && (A.type === 'shoot' || A.type === 'spit' || A.type === 'zap'), range = A ? A.range || (A.type === 'zap' ? 46 : 280) : 0;
    let tx, ty;
    if (tg && !(ranged && bd < range * 0.7)) { tx = tg.x; ty = tg.y; }
    else if (!tg) { const a = (R.k || 0) * 2.1 + 1, k = 46 + (R.k || 0) * 10; tx = p.x + Math.cos(a) * k; ty = p.y + Math.sin(a) * k; }
    if (tx != null) riderStep(col, r, R, cap, here, tx, ty, Math.max(90, (r.speed || 90) * 0.85), dt);
    placeRider(col, r);
    if (!tg || !A || r.atkCd > 0) return;
    const d = U.dist(r.x, r.y, tg.x, tg.y), dmg = (A.dmg || 6) * r.dmgMul * (X.compDmg || 1);
    r.face = Math.atan2(tg.y - r.y, tg.x - r.x);
    if (ranged && d < range) {
      if (A.type === 'zap') AN.Combat.hit(X, tg, dmg, r, { knock: 60 });
      else AN.Combat.shoot(X, { x: r.x, y: r.y, angle: r.face, speed: A.speed || 300, dmg, team: 'player', size: A.size || 5, color: A.color || r.pal.accent, range: range * 1.3, owner: r });
      r.atkCd = A.cd || 1.4; r.attackAnim = 1;
    } else if (!ranged && d < (r.r * (r.riderS || 1)) + tg.r * (tg.riderS || 1) + 10) {
      AN.Combat.hit(X, tg, dmg, r, { knock: 120 });
      r.atkCd = A.cd || 1.2; r.attackAnim = 1;
    }
  }
  /** Un gisement de son dos, à portée de main. */
  Co.deckNode = function (e, p) {
    const col = e.col;
    if (!col || !col.deck) return null;
    let best = null, bd = 1e9;
    for (const n of col.deck.nodes) {
      if (n.uses <= 0) continue;
      const c = col.caps[n.cap];
      if (!visible(col, c)) continue;
      const q = capPoint(col, c, n.t, n.off), d = U.dist(q.x, q.y, p.x, p.y);
      if (d < 48 && d < bd) { bd = d; best = n; }
    }
    return best;
  };

  /** Partie basse du corps à portée de main : { cap, t, d, r } ou null. */
  Co.grabSpot = function (e, p) {
    const col = e.col;
    if (!col || col.hidden > 0 || (e.boss && e.boss.exhausted) || col.shell > 0.3) return null;
    const pz = p.climb ? 0 : p.z || 0; // en plein saut, on atteint plus haut
    let best = null;
    for (const c of col.caps) {
      if (!c.grip || !visible(col, c)) continue;
      const q = closest(col, c, p.x, p.y, true);
      const A = col.n[c.a], B = col.n[c.b];
      const z = U.lerp(A.z, B.z, q.t);
      if (z > Co.GRAB_Z + pz || z < pz - 0.45 || A.under || B.under) continue;
      // une partie qui file ne se saisit pas ; un volant qui passe au ras du sol, si (on l'attrape au vol)
      if (Math.max(A.v || 0, B.v || 0) > (col.plan === 'volant' ? 1500 : 330)) continue;
      if (q.d < (col.plan === 'volant' ? 58 : 40) && (!best || q.d < best.d)) best = { cap: c.i, t: q.t, d: Math.max(0, q.d), r: U.lerp(c.ra, c.rb, q.t) };
    }
    return best;
  };
  Co.interactables = function (X, consider) {
    const p = X.player;
    if (p.climb) return;
    const pad = X.zone && X.zone.colMap && !X.collapse ? X.mapPad : null;
    if (pad) consider(U.dist(pad.x, pad.y, p.x, p.y), pad.R * 1.3, () => ({ kind: 'colpad', target: pad, text: PAD_TEXT, hold: 0.4 }));
    if (X.mount) return;
    for (const e of X.creatures) {
      if (!e.alive || !e.col) continue;
      const g = Co.grabSpot(e, p);
      if (g) consider(g.d, 40, () => ({ kind: 'grab', target: e, at: g, text: D.COLOSSUS_TEXT.grab + ' à ' + e.def.name, hold: 0.1 }));
    }
  };
  Co.grab = function (X, e, at) {
    const p = X.player;
    if (!e.alive || !e.col) return;
    p.climb = { e, cap: at.cap, t: at.t, off: 0, charge: 0, loose: 0, strikeCd: 0, home: { x: p.x, y: p.y }, comp: compOf(X.zone, p.x, p.y) };
    if (p.grip == null) p.grip = 1;
    p.leap = null; p.z = 0; // un saut s'achève sur sa prise
    p.dashT = 0; p.vx = p.vy = p.kbx = p.kby = 0;
    if (!e.boss.active) AN.Boss.wake(X, e);
    e.col.shakeCd = Math.max(e.col.shakeCd, 5); // le temps de trouver ses prises
    AN.Audio.play('land', { pitch: 1.4 });
    if (AN.Tips && !AN.Tips.seen(X.profile, 'climb')) AN.Tips.show('climb');
    else if (!X.climbToast) {
      const L = AN.Input.label;
      X.climbToast = 1;
      AN.HUD.toast('Vous êtes agrippé. Déplacez-vous sur son corps et frappez ses sceaux (' + L('Mouse0') + ' ; ' + L('Mouse2') + ' maintenu : plus fort). ' + L('KeyC') + ' : sauter vers une autre prise ; ' + L('Space') + ' : lâcher prise. Quand il se secoue, maintenez ' + L('KeyE') + '.', 7);
    }
  };
  /** Lâcher prise : 'jump' (volontaire), 'fall' (prise épuisée ou secousse), 'eject' (il plonge, se referme…), 'down' (il s'effondre). */
  Co.drop = function (X, p, how) {
    const c = p.climb;
    if (!c) return;
    const col = c.e.col;
    // un colosse-carte : le vide tout autour, on n'en descend pas ; une chute vous fait glisser jusqu'à la plateforme
    if (col.map && c.e.alive) {
      if (how === 'jump') { if (!X.voidToast || X.time - X.voidToast > 4) { X.voidToast = X.time; AN.HUD.toast('Le vide, tout autour : on ne descend pas d’un colosse-carte.', 3); } return; }
      if (how === 'down') return;
      // on glisse jusqu'à la surface plate la plus proche (son dos), sinon jusqu'à la plateforme
      const pad = col.deck && col.deck.pad, from = capPoint(col, col.caps[c.cap] || col.caps[0], c.t, c.off);
      let best = null, bd = 1e9;
      for (const o of col.caps) {
        if (!o.flat || !o.grip || !visible(col, o) || col.n[o.a].under || col.n[o.b].under) continue;
        const q = closest(col, o, from.x, from.y);
        if (q.d < bd) { bd = q.d; best = { cap: o.i, t: U.clamp(q.t, 0.08, 0.92) }; }
      }
      if (!best && pad) best = { cap: pad.cap, t: pad.t };
      let off0 = 0;
      if (best && col.back && best.cap === col.back.cap && backCell(col, best.cap, best.t, 0) !== Z.FLOOR) { // pas dans un relief ni dans une mare : la case libre la plus proche
        const B = col.back, cc = col.caps[B.cap], q0 = backUV(col, cc, best.t, 0);
        for (let r = 1, done = false; r < 16 && !done; r++) for (let k = 0; k < 12 && !done; k++) {
          const a = (k / 12) * TAU, u = q0.u + Math.cos(a) * r * BT, v = q0.v + Math.sin(a) * r * BT, to = backTO(col, cc, u, v);
          if (Math.abs(to.off) < 0.95 && backCell(col, B.cap, to.t, to.off) === Z.FLOOR) { best.t = to.t; off0 = to.off; done = true; }
        }
      }
      if (best) { c.cap = best.cap; c.t = best.t; c.off = off0; c.hop = null; }
      p.grip = Math.max(p.grip || 0, 0.45); c.loose = 0;
      AN.PlayerCtl.damage(X, col.dmg * 0.3, null, { ignoreIframes: true });
      AN.HUD.toast(best && pad && best.cap === pad.cap ? 'Vous glissez jusqu’à la plateforme.' : 'Vous glissez jusqu’à son dos.', 2);
      return;
    }
    const cap = col.caps[c.cap];
    const pt = capPoint(col, cap, c.t, c.off);
    p.climb = null;
    let x = pt.gx, y = pt.gy;
    const a = Math.atan2(y - col.y, x - col.x);
    x += Math.cos(a) * 34; y += Math.sin(a) * 34;
    // on redescend du côté d'où l'on est monté : le colosse ne fait passer ni les murs ni les barrières des caveaux
    const okAt = (xx, yy) => Z.tileAt(X.zone, xx, yy) === Z.FLOOR && (c.comp == null || compOf(X.zone, xx, yy) === c.comp);
    if (!okAt(x, y)) {
      let found = false;
      for (let k = 1; k < 90 && !found; k++) {
        const aa = k * 2.4, r = k * 9;
        const xx = x + Math.cos(aa) * r, yy = y + Math.sin(aa) * r;
        if (okAt(xx, yy)) { x = xx; y = yy; found = true; }
      }
      if (!found && c.home) { x = c.home.x; y = c.home.y; }
    }
    p.x = x; p.y = y; p.vx = p.vy = p.dvx = p.dvy = 0;
    p.iframes = Math.max(p.iframes, 0.5);
    FX.burst(x, y, '#ffffff', 10, 120, { size: 2.5 });
    if (how === 'fall' || how === 'eject') {
      const dmg = col.dmg * 0.25 * (0.4 + pt.z);
      if (pt.z > 0.35) AN.PlayerCtl.damage(X, dmg, null, { ignoreIframes: true });
      p.stunT = 0.45;
      AN.HUD.toast(how === 'eject' ? D.COLOSSUS_TEXT.under : D.COLOSSUS_TEXT.fall, 2);
    }
    AN.Audio.play('land', { pitch: 0.8 });
  };
  /**
   * Au bout d'une partie, une articulation (1.16.3) : on passe sur le membre qui part dans la direction
   * voulue, même s'il fait un angle (de la cuisse au tibia, du bras à la main). { cap, t } ou null.
   */
  function jointPart(col, cap, t, ax) {
    const end = cap.disc || cap.stadium ? null : t >= 0.97 ? cap.b : t <= 0.03 ? cap.a : null; // d'un disque, d'un dos-carte, on sort par son bord (partAt)
    const al = Math.hypot(ax.x, ax.y);
    if (!end || al < 0.1) return null;
    const pn = PN(col, col.n[end]);
    // le membre voisin doit mieux suivre la direction voulue que le chemin du retour (un tibia repart souvent en arrière)
    const bk = PN(col, col.n[end === cap.b ? cap.a : cap.b]), bl = Math.hypot(bk.x - pn.x, bk.y - pn.y) || 1;
    const back = ((bk.x - pn.x) * ax.x + (bk.y - pn.y) * ax.y) / bl / al;
    let best = null, bd = Math.max(0.3, back + 0.15);
    for (const o of col.caps) {
      if (o === cap || o.disc || o.stadium || !o.grip || (o.a !== end && o.b !== end) || !visible(col, o) || col.n[o.a].under || col.n[o.b].under) continue;
      const q = PN(col, col.n[o.a === end ? o.b : o.a]);
      const dl = Math.hypot(q.x - pn.x, q.y - pn.y) || 1;
      const dot = ((q.x - pn.x) * ax.x + (q.y - pn.y) * ax.y) / dl / al;
      if (dot > bd) { bd = dot; best = { cap: o, t: o.a === end ? 0.03 : 0.97 }; }
    }
    return best;
  }
  /** Sur le colosse : se déplacer, tenir, frapper. Renvoie true tant que le joueur y est. */
  Co.climbUpdate = function (X, p, dt) {
    const c = p.climb;
    const e = c && c.e;
    if (!e || !e.alive || !e.col) { p.climb = null; return false; }
    const col = e.col;
    if (e.boss.exhausted && !col.map) { Co.drop(X, p, 'down'); return false; }
    let cap = col.caps[c.cap];
    if (!cap || !visible(col, cap) || (col.n[cap.a].under || col.n[cap.b].under)) { Co.drop(X, p, 'eject'); return !!p.climb; }
    const ax = I.axis();
    // un saut d'une prise à l'autre : on file en arc au-dessus du corps
    if (c.hop) {
      const H = c.hop, tc = col.caps[H.cap];
      if (!tc || !visible(col, tc)) { c.hop = null; Co.drop(X, p, 'fall'); return !!p.climb; }
      H.t += dt;
      const k = Math.min(1, H.t / H.dur), q = capPoint(col, tc, H.tt, 0), arc = Math.sin(k * Math.PI);
      p.x = U.lerp(H.x0, q.x, ease(k)); p.y = U.lerp(H.y0, q.y, ease(k)) - arc * 46;
      p.climbZ = U.lerp(H.z0, q.z, k) + arc * 0.3;
      p.climbG = { x: U.lerp(H.g0.x, q.gx, k), y: U.lerp(H.g0.y, q.gy, k), s: U.lerp(H.g0.s, q.s, k) * (1 + arc * 0.08) };
      p.vx = p.vy = p.dvx = p.dvy = p.kbx = p.kby = 0;
      if (k >= 1) { c.cap = H.cap; c.t = H.tt; c.off = 0; c.hop = null; AN.Audio.play('land', { pitch: 1.3 }); }
      return true;
    }
    // déplacement libre sur le corps (1.16.2) : on marche dans toutes les directions, à pied sur son dos ; on passe
    // d'une partie à l'autre dès qu'elles se touchent (à la même hauteur, ou par une articulation)
    const moving = Math.hypot(ax.x, ax.y) > 0.1;
    const jn = moving ? jointPart(col, cap, c.t, ax) : null; // au bout d'une partie : l'articulation
    if (jn) { cap = jn.cap; c.cap = jn.cap.i; c.t = jn.t; c.off = 0; }
    else if (moving) {
      const here = capPoint(col, cap, c.t, c.off);
      let sp = cap.flat ? X.S.speed * 0.95 : col.map ? X.S.speed * 1.4 : 150; // les membres d'un colosse-carte sont des routes de milliers de pixels : on y court (1.16.4)
      if (c.mire > 0) sp *= 1 - c.mire; // une mare du dos ralentit
      const backCap = col.back ? col.caps[col.back.cap] : null;
      const step = (dx, dy) => {
        const tx = here.x + dx * sp * dt, ty = here.y + dy * sp * dt;
        // le dos-biome porte qui marche au-dessus de lui : les attaches des membres passent dessous (1.16.4)
        if (backCap && cap !== backCap) {
          const Lb = locate(col, backCap, tx, ty);
          if (Lb.inside && Math.abs(Lb.off) < 0.8 && Math.abs(capPoint(col, backCap, Lb.t, Lb.off).z - here.z) < 0.35) return { cap: backCap, t: Lb.t, off: Lb.off }; // nettement dedans : pas d'aller-retour au bord
        }
        const L1 = locate(col, cap, tx, ty);
        if (L1.inside) return { cap, t: L1.t, off: L1.off };
        const o = partAt(col, tx, ty, cap, here.z);
        if (o) return { cap: o.cap, t: o.t, off: o.off };
        const j = jointPart(col, cap, L1.t, ax);
        if (j) return { cap: j.cap, t: j.t, off: 0 };
        return { cap, t: cap.stadium ? L1.t : U.clamp(L1.t, 0, 1), off: U.clamp(L1.off, -0.97, 0.97) };
      };
      // un relief du dos-biome arrête le pas : on glisse le long (1.16.4)
      const stuckIn = backCell(col, c.cap, c.t, c.off) === Z.WALL; // déjà dans un relief (posé là) : on en sort librement
      const ok = (m) => stuckIn || backCell(col, m.cap.i, m.t, m.off) !== Z.WALL;
      // bloqué : des directions voisines, de plus en plus écartées (le dos tourne avec le colosse : ses reliefs ne suivent pas les axes de l'écran)
      let m = step(ax.x, ax.y);
      if (!ok(m)) {
        m = null;
        const a0 = Math.atan2(ax.y, ax.x), al = Math.hypot(ax.x, ax.y);
        for (const da of [0.45, -0.45, 0.9, -0.9, 1.35, -1.35]) {
          const k = al * Math.cos(da), mm = step(Math.cos(a0 + da) * k, Math.sin(a0 + da) * k);
          if (ok(mm)) { m = mm; break; }
        }
      }
      if (m) { cap = m.cap; c.cap = m.cap.i; c.t = m.t; c.off = m.off; }
    }
    // une mare du danger du biome, sur son dos : elle brûle, glace, ronge, et ralentit
    c.mire = 0;
    if (col.back && backCell(col, c.cap, c.t, c.off) === Z.HAZARD) {
      const hz = (D.BIOME[col.back.biome] || {}).hazard;
      if (hz && !(X.mount && AN.Mount.ignoresHazard(X.mount, D.BIOME[col.back.biome]))) {
        c.mire = hz.slow || 0;
        p.hazardAcc = (p.hazardAcc || 0) + (hz.dps || 0) * (1 - (X.S.hazardRes || 0)) * dt;
        if (p.hazardAcc >= 1) { const d = Math.floor(p.hazardAcc); p.hazardAcc -= d; AN.PlayerCtl.damage(X, d / (1 - (X.S.armor || 0)), null, { dot: true, numbers: false }); }
        if (Math.random() < dt * 6) FX.add({ kind: 'dot', x: p.x + (Math.random() - 0.5) * 14, y: p.y + 4, vy: -40, color: hz.color || '#ffffff', life: 0.5, size: 2 });
      }
    }
    // l'endurance de la prise
    const holding = I.down('KeyE');
    const pt = capPoint(col, cap, c.t, c.off);
    let drain = 0.012 + (moving ? 0.01 : 0) + pt.z * 0.006 + (col.plan === 'volant' ? col.alt * 0.012 : 0) + Math.abs(col.spinRate || 0) * 0.005;
    if (col.map) drain = 0; // un colosse-carte : on y vit, ses membres sont des chemins ; seules ses secousses font lâcher (1.16.4)
    if (cap.flat && col.shake <= 0.15) { // une surface plate : on y reprend son souffle ; sur un colosse-carte, même en marchant (c'est le sol)
      if (!moving) drain = -0.15; else if (col.map) drain = -0.06;
    }
    if (col.shake > 0.15) {
      if (holding) { drain += col.map ? 0.05 : 0.1; c.loose = 0; }
      else { c.loose += dt; drain += 0.05; if (c.loose > 1) { Co.drop(X, p, 'fall'); return !!p.climb; } }
    } else c.loose = 0;
    p.grip = U.clamp((p.grip == null ? 1 : p.grip) - drain * dt, 0, 1);
    if (p.grip <= 0) { Co.drop(X, p, 'fall'); return !!p.climb; }
    // position : celle du corps, qui bouge sous vos pieds
    p.x = pt.x; p.y = pt.y; p.vx = p.vy = p.dvx = p.dvy = p.kbx = p.kby = 0;
    p.climbZ = pt.z; p.climbG = { x: pt.gx, y: pt.gy, s: pt.s };
    // lâcher prise (Espace, l'esquive) ; sauter vers une autre prise (C, le saut) — sans prise à portée, on redescend
    if (I.hit('Space')) { Co.drop(X, p, 'jump'); return !!p.climb; }
    if (I.hit('KeyC')) {
      const tg = Co.hopTarget(e, p, ax);
      if (!tg) { Co.drop(X, p, 'jump'); return !!p.climb; }
      c.hop = { t: 0, dur: 0.42, x0: p.x, y0: p.y, z0: pt.z, g0: { x: pt.gx, y: pt.gy, s: pt.s }, cap: tg.cap, tt: tg.t };
      AN.Audio.play('dash', { pitch: 0.75 });
    }
    // un sceau à portée : on le frappe (clic ; clic droit maintenu, la frappe se charge) ;
    // sinon, on se bat comme au sol (1.16.2) : on tire, on frappe les créatures de son dos
    c.strikeCd -= dt;
    const seal = Co.reachSeal(e, p);
    const M = X.S.melee, S = X.S;
    const rage = X.abil && X.abil.buffs.rage > 0 ? 1.4 : 1;
    if (seal) {
      if (I.mouseDown(2)) c.charge = Math.min(1, c.charge + dt / 0.7);
      const released = c.charge > 0 && !I.mouseDown(2);
      if ((I.mouseHit(0) || released) && c.strikeCd <= 0) {
        const k = released ? c.charge : 0;
        c.charge = 0;
        c.strikeCd = 0.32;
        p.meleeAnim = 1; p.meleeA = p.aim;
        X.stats.swings = (X.stats.swings || 0) + 1;
        AN.Audio.play('melee', { weapon: X.loadout.melee, pitch: 0.8 });
        hurtSeal(X, e, seal, M.dmg * S.meleeMul * rage * (2.2 + 3.3 * k), 'climb');
      }
      const q = Co.sealPos(col, seal);
      p.aim = Math.atan2(q.y - p.y, q.x - p.x);
    } else {
      c.charge = 0;
      const W = S.ranged;
      if (I.mouseDown(0) && p.fireCd <= 0 && !I.down('KeyF')) {
        p.fireCd = 1 / W.rate; p.recoil = 1;
        X.stats.shots = (X.stats.shots || 0) + 1;
        const n = W.count || 1;
        for (let i = 0; i < n; i++) {
          const off = n > 1 ? (i / (n - 1) - 0.5) * W.spread : (Math.random() - 0.5) * W.spread;
          const pr = AN.Combat.shoot(X, { x: p.x + Math.cos(p.aim) * 16, y: p.y + Math.sin(p.aim) * 16, angle: p.aim + off, speed: W.speed * (0.95 + Math.random() * 0.1), dmg: W.dmg * S.rangedMul * rage, team: 'player', size: W.size, color: W.color, range: W.range, pierce: W.pierce, slow: W.slow, explode: W.explode, heavy: W.heavy, owner: p });
          pr.fromHost = e; // tiré depuis son dos : il ne ricoche pas sur lui
        }
        AN.Audio.play('shoot', { weapon: X.loadout.ranged, pitch: 0.92 + Math.random() * 0.16, gap: 0.03 });
      }
      if ((I.mouseHit(2) || I.mouseDown(2)) && p.meleeCd <= 0) {
        p.meleeCd = M.cd; p.meleeAnim = 1; p.meleeA = p.aim;
        X.stats.swings = (X.stats.swings || 0) + 1;
        AN.Audio.play('melee', { weapon: X.loadout.melee });
        for (const r of X.creatures) {
          if (!r.alive || !r.rider || r.rider.host !== e) continue;
          const d = U.dist(p.x, p.y, r.x, r.y), rr = r.r * (r.riderS || 1);
          if (d > M.range + rr + p.r) continue;
          if (Math.abs(U.angDiff(p.aim, Math.atan2(r.y - p.y, r.x - p.x))) > M.arc / 2 + Math.atan2(rr, Math.max(1, d))) continue;
          AN.Combat.hit(X, r, M.dmg * S.meleeMul * rage, p, {});
          FX.burst(r.x, r.y, '#ffffff', 5, 140, { size: 2.5 });
        }
      }
    }
    // récolter un gisement de son dos (E maintenu, quand il ne se secoue pas)
    const node = Co.deckNode(e, p);
    if (node && col.shake <= 0.15 && I.down('KeyE')) {
      node.prog += dt;
      if (node.prog >= 0.7) {
        node.prog = 0; node.uses--;
        const got = X.addToBag(node.res, 2);
        X.stats.harvested = (X.stats.harvested || 0) + 1;
        FX.text(p.x, p.y - 26, got ? '+' + got + ' ' + D.RESOURCES[node.res].name : 'sac plein', got ? AN.INK : AN.STAMP, { size: 12, bold: true });
        AN.Audio.play('harvest');
      }
    } else if (node) node.prog = Math.max(0, node.prog - dt);
    if (col.map) mapUse(X, e, p, dt); // la plateforme, un compagnon à relever, le coup de grâce (1.16.3)
    return true;
  };
  /** Où mène un saut depuis le corps (Espace) : la prise la plus proche dans la direction visée, pas trop haut au-dessus. */
  Co.hopTarget = function (e, p, ax) {
    const col = e.col, c = p.climb;
    if (!c) return null;
    const moving = ax && Math.hypot(ax.x, ax.y) > 0.1;
    const dir = moving ? Math.atan2(ax.y, ax.x) : p.aim;
    const here = capPoint(col, col.caps[c.cap], c.t, c.off);
    let best = null, bs = 1e9;
    for (const o of col.caps) {
      if (!o.grip || !visible(col, o) || col.n[o.a].under || col.n[o.b].under) continue;
      for (let i = 0; i <= 5; i++) {
        const t = i / 5, q = capPoint(col, o, t, 0);
        const d = U.dist(q.x, q.y, p.x, p.y);
        if (d < 70 || d > 280) continue;
        const da = Math.abs(U.angDiff(dir, Math.atan2(q.y - p.y, q.x - p.x)));
        if (da > 0.7 || q.z - here.z > 0.55) continue;
        if (backCell(col, o.i, t, 0) === Z.WALL) continue; // on ne saute pas dans un relief du dos
        const sc = d + da * 160;
        if (sc < bs) { bs = sc; best = { cap: o.i, t, x: q.x, y: q.y, r: q.r }; }
      }
    }
    return best;
  };
  /** Près d'un colosse, Espace maintenu fait sauter (le moteur de saut de la galaxie). */
  Co.canLeap = function (X) {
    const p = X.player;
    if (!p || p.climb || X.mount) return false;
    return X.creatures.some((e) => e.alive && e.col && U.dist(p.x, p.y, e.col.x, e.col.y) < e.col.L * 1.05);
  };
  const PLAYER_LIFT = 70;
  /** Le joueur à sa hauteur : sur un colosse, ou en plein saut. Ombre au sol, perspective comme le colosse. */
  Co.drawPlayer = function (ctx, X, t) {
    const p = X.player;
    if (!p.alive) { AN.PlayerCtl.draw(ctx, X, t); return; }
    let gx, gy, x, y, s, z;
    if (p.climb && p.climbG) { gx = p.climbG.x; gy = p.climbG.y; x = p.x; y = p.y; s = p.climbG.s; z = p.climbZ || 0; }
    else if (p.z > 0.01) { const q = Co.proj(p.x, p.y, p.z, PLAYER_LIFT); gx = p.x; gy = p.y; x = q.x; y = q.y; s = q.s; z = p.z; }
    else { AN.PlayerCtl.draw(ctx, X, t); return; }
    const k = U.clamp(1 - z * 0.25, 0.4, 1);
    ctx.fillStyle = 'rgba(10,12,20,' + (0.28 * k) + ')';
    ctx.beginPath(); ctx.ellipse(gx, gy + 5, p.r * 1.05 * k, p.r * 0.5 * k, 0, 0, TAU); ctx.fill();
    const px = p.x, py = p.y;
    p.airborne = true;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-px, -py);
    AN.PlayerCtl.draw(ctx, X, t);
    ctx.restore();
    p.airborne = false;
  };
  /** Le sceau que le joueur peut frapper d'où il est (sur le colosse). */
  Co.reachSeal = function (e, p) {
    const col = e.col;
    let best = null, bd = 1e9;
    for (const s of col.seals) {
      if (s.broken) continue;
      const q = Co.sealPos(col, s);
      if (!q) continue;
      const d = U.dist(q.x, q.y, p.x, p.y);
      if (d < q.sr + 42 && d < bd) { bd = d; best = s; }
    }
    return best;
  };
  /** Ce que dit l'invite pendant l'escalade. */
  Co.prompt = function (X) {
    const p = X.player, c = p.climb;
    if (!c) return null;
    const col = c.e.col;
    if (col.shake > 0.15) return { text: 'Tenez bon (maintenez)', key: AN.Input.label('KeyE'), progress: 0 };
    const node = Co.deckNode(c.e, p);
    if (node) return { text: 'Récolter : ' + D.RESOURCES[node.res].name, key: AN.Input.label('KeyE'), progress: node.prog / 0.7 };
    if (c.useAct) return { text: c.useAct.text, key: AN.Input.label('KeyE'), progress: c.useT > 0 ? c.useT / c.useAct.hold : 0 };
    const s = Co.reachSeal(c.e, p);
    if (s) return { text: D.COLOSSUS_TEXT.strike + (c.charge > 0 ? ' (charge ' + Math.round(c.charge * 100) + ' %)' : ' (maintenu : plus fort)'), key: AN.Input.label('Mouse2'), progress: c.charge };
    if (col.map) return Co.hopTarget(c.e, p, I.axis()) ? { text: 'Sauter vers cette prise', key: AN.Input.label('KeyC'), progress: 0 } : { text: 'Marchez jusqu’à un sceau : tout autour, le vide', key: '', progress: 0 };
    return Co.hopTarget(c.e, p, I.axis()) ? { text: 'Sauter vers cette prise (' + AN.Input.label('Space') + ' : lâcher prise)', key: AN.Input.label('KeyC'), progress: 0 } : { text: 'Grimpez jusqu’à un sceau · lâcher prise', key: AN.Input.label('Space'), progress: 0 };
  };

  /** Coup au corps à corps depuis le sol : un sceau découvert, ou la peau qui résiste. */
  Co.melee = function (X, e, p, M, dmg) {
    const col = e.col;
    let any = false;
    for (const s of col.seals) {
      if (!s.open) continue;
      const q = Co.sealPos(col, s);
      if (!q) continue;
      const d = U.dist(q.x, q.y, p.x, p.y);
      if (d > M.range + q.sr + p.r) continue;
      const a = Math.atan2(q.y - p.y, q.x - p.x);
      if (Math.abs(U.angDiff(p.aim, a)) > M.arc / 2 + 0.4) continue;
      hurtSeal(X, e, s, dmg * 1.25, 'melee');
      any = true;
    }
    if (!any) {
      for (const c of col.caps) {
        if (!visible(col, c)) continue;
        const q = closest(col, c, p.x + Math.cos(p.aim) * M.range * 0.6, p.y + Math.sin(p.aim) * M.range * 0.6, false);
        if (q.d < M.range * 0.5) { FX.burst(p.x + Math.cos(p.aim) * 30, p.y + Math.sin(p.aim) * 30, '#ffffff', 4, 90, { size: 2 }); if (!e.boss.active) AN.Boss.wake(X, e); break; }
      }
    }
    return any;
  };
  /** Un projectile contre le colosse : 'seal' (un sceau découvert), 'body' (il ricoche) ou null (il passe). */
  Co.shot = function (X, e, pr) {
    const col = e.col;
    if (col.hidden > 0) return null;
    const own = pr.fromHost === e; // tiré depuis son dos : seul un sceau découvert l'arrête
    for (const s of col.seals) {
      if (s.broken) continue;
      const q = Co.sealPos(col, s);
      if (!q) continue;
      const d = U.dist(q.x, q.y, pr.x, pr.y);
      // un sceau découvert se touche largement : le tir qui frappe le membre près de lui l'atteint
      if (s.open && d <= q.sr + q.r * 0.8 + pr.r) { hurtSeal(X, e, s, pr.dmg, 'shot'); return 'seal'; }
      if (d > q.sr + pr.r) continue;
      if (s.kind === 'haut' && pr.team !== 'wild' && Math.random() < 0.3) FX.text(q.x, q.y - q.sr - 8, D.COLOSSUS_TEXT.tooHigh, AN.INK, { size: 11, life: 0.8 });
    }
    if (own) return null;
    for (const c of col.caps) {
      if (!visible(col, c)) continue;
      if (closest(col, c, pr.x, pr.y, false).d <= pr.r) {
        FX.burst(pr.x, pr.y, '#ffffff', 3, 90, { size: 2 });
        if (!e.boss.active && pr.team === 'player') AN.Boss.wake(X, e);
        if (Math.random() < 0.08) FX.text(pr.x, pr.y - 10, D.COLOSSUS_TEXT.ricochet, AN.INK, { size: 10, life: 0.6 });
        return 'body';
      }
    }
    return null;
  };
  /** Tout autre coup (explosions, capacités, compagnons, appels) : seulement sur un sceau découvert, s'il est près. */
  Co.hit = function (X, e, dmg, src, opts) {
    const col = e.col;
    if (src && src.team === 'player' || (src && src.kind === 'player')) { if (!e.boss.active) AN.Boss.wake(X, e); }
    if (!src || src.x == null) return 0;
    let best = null, bd = 1e9;
    for (const s of col.seals) {
      if (!s.open) continue;
      const q = Co.sealPos(col, s);
      const d = q ? U.dist(q.x, q.y, src.x, src.y) : 1e9;
      if (d < bd) { bd = d; best = s; }
    }
    if (best && bd < 140) return hurtSeal(X, e, best, dmg * 0.6, 'other');
    return 0;
  };

  /* ======================= Caméra ======================= */
  /** Face à un colosse, la caméra recule pour le montrer en entier ; sur lui, elle se rapproche. */
  /* ======================= Le colosse-carte (1.16.3) ======================= */
  // Les plus gros maîtres sont la zone entière : on arrive sur leur dos avec la plateforme de l'Artefact,
  // et tout autour, c'est le vide. On n'en descend pas : on en repart par la plateforme.
  const PAD_TEXT = 'La plateforme de l’Artefact : extraire, ou repartir';
  /** Une zone dont le gardien est un colosse-carte : on vide le sol (il n'y a plus de sol), avant tout le reste. */
  Co.prepareMapZone = function (X, zone) {
    const gd = zone.guardian && D.CREATURE[zone.guardian];
    if (!gd || !Co.isMap(gd)) return false;
    zone.colMap = true;
    // la zone prend la taille du colosse (1.16.4) : il y tient tout entier, avec une marge de vide
    const n = Math.max(zone.w, zone.h, Math.ceil((Co.length(gd) * 1.3 + 900) / Z.T));
    zone.w = zone.h = n;
    zone.grid = new Uint8Array(n * n); zone.bmap = new Uint8Array(n * n); zone.shade = new Float32Array(n * n).fill(0.5);
    zone.mix = null;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) zone.grid[y * n + x] = x < 2 || y < 2 || x >= n - 2 || y >= n - 2 ? Z.WALL : Z.FLOOR;
    const cx = (n * Z.T) / 2;
    zone.arena = { x: cx, y: cx, r: zone.arena ? zone.arena.r : 400, tx: Math.floor(n / 2), ty: Math.floor(n / 2) };
    if (zone.state) zone.state.fog = new Uint8Array(n * n);
    ['plates', 'gates', 'nodes', 'groups', 'ruins', 'decor', 'vaults', 'eggs', 'wells', 'bridges', 'filaments', 'inversions'].forEach((k) => { if (Array.isArray(zone[k])) zone[k] = []; });
    zone.village = null; zone.structure = null; zone.comp = null;
    if (zone.state && zone.state.fog) zone.state.fog.fill(1); // rien à explorer : tout se voit
    zone.entry = { x: (zone.w * Z.T) / 2, y: (zone.h * Z.T) / 2 };
    return true;
  };
  /** Le colosse-carte de la zone, s'il est encore là. */
  Co.mapHost = (X) => (X.zone && X.zone.colMap ? X.creatures.find((e) => e.alive && e.col && e.col.map) || null : null);
  /** Où est la plateforme : sur son dos (elle suit le corps), ou seule dans le vide. */
  Co.padPoint = function (X) {
    const host = Co.mapHost(X), pad = host && host.col.deck && host.col.deck.pad;
    if (pad) { const col = host.col, q = capPoint(col, col.caps[pad.cap], pad.t, pad.off); return { x: q.x, y: q.y, s: q.s, R: pad.R * q.s, cap: pad.cap, low: isLowCap(col, col.caps[pad.cap]) }; }
    return X.mapPad;
  };
  const isLowCap = (col, c) => Math.max(col.n[c.a].z, col.n[c.b].z) < 0.55;
  /** Le joueur se tient sur la plateforme, sur son dos. */
  function attachToPad(X, host) {
    const p = X.player, col = host.col, pad = col.deck.pad;
    p.climb = { e: host, cap: pad.cap, t: pad.t, off: 0.35, charge: 0, loose: 0, strikeCd: 0, home: null, comp: null };
    p.grip = 1; p.leap = null; p.z = 0; p.dashT = 0; p.vx = p.vy = p.kbx = p.kby = p.dvx = p.dvy = 0;
    const q = capPoint(col, col.caps[pad.cap], pad.t, 0.35);
    p.x = q.x; p.y = q.y; p.climbZ = q.z; p.climbG = { x: q.gx, y: q.gy, s: q.s };
  }
  /** On arrive dans la zone : sur la plateforme, puis la caméra recule jusqu'à le montrer en entier. */
  Co.enterMap = function (X, fromZi) {
    const zone = X.zone, p = X.player;
    if (!zone || !zone.colMap) return;
    X.mapFrom = fromZi != null ? fromZi : X.mapFrom != null ? X.mapFrom : 0;
    if (X.mount) AN.Mount.dismount(X);
    const host = Co.mapHost(X), c0 = { x: (zone.w * Z.T) / 2, y: (zone.h * Z.T) / 2 };
    if (host) {
      const col = host.col;
      for (let k = 0; k < 3; k++) PLANS[col.plan].pose(X, host, col, 0.2);
      attachToPad(X, host);
      col.shakeCd = Math.max(col.shakeCd, 9); col.cd = Math.max(col.cd, 4);
      X.colGrace = X.time + SHOW.back + 4; // le temps de poser le pied
      // la plateforme est dégagée : celles qui y rôdaient regagnent un autre coin de son dos
      const pc = capPoint(col, col.caps[col.deck.pad.cap], col.deck.pad.t, 0), flats = col.caps.filter((c) => c.flat && c.grip && c.i !== col.deck.pad.cap);
      col.deck.riders.forEach((r, i) => {
        if (!r.alive || !r.rider || r.rider.ally || U.dist(r.x, r.y, pc.x, pc.y) > col.deck.pad.R * 3.5 || !flats.length) return;
        const c = flats[i % flats.length];
        Object.assign(r.rider, { cap: c.i, t: 0.15 + ((i * 0.37) % 0.7), off: 0, goal: null });
        r.rider.home = { cap: c.i, t: r.rider.t, off: 0 };
        placeRider(col, r);
      });
      // les compagnons montent avec vous, autour de la plateforme
      X.allies.forEach((a, i) => {
        if (!a.alive) return;
        a.onHex = false; // l'hexagone est resté dans une autre zone
        a.rider = { host, cap: col.deck.pad.cap, t: U.clamp(col.deck.pad.t + (i % 2 ? 0.06 : -0.06), 0.05, 0.95), off: ((i % 3) - 1) * 0.5, ally: true, k: i, wait: 0 };
        col.deck.riders.push(a);
        placeRider(col, a);
      });
    } else {
      X.mapPad = X.mapPad || { x: c0.x, y: c0.y, R: 92, s: 1 };
      p.climb = null; p.x = X.mapPad.x; p.y = X.mapPad.y + 30;
      X.allies.forEach((a, i) => { const ang = (i / Math.max(1, X.allies.length)) * TAU; a.x = p.x + Math.cos(ang) * 50; a.y = p.y + Math.sin(ang) * 36; a.home = { x: a.x, y: a.y }; });
    }
    const pad = Co.padPoint(X);
    X.mapPad = { x: pad.x, y: pad.y, R: pad.R, s: pad.s || 1 };
    X.mapPlate = { x: pad.x, y: pad.y, map: true };
    X.mapHad = !!host;
    // l'arrivée : la caméra s'éloigne très loin, d'un coup, le montre tout entier dans le vide, puis revient
    const L = host ? host.col.L : 1200;
    X.colShow = { t: 0, x: host ? host.col.x : pad.x, y: host ? host.col.y : pad.y, far: U.clamp((X.cam.W * 0.06) / L, 0.018, 0.05), land: 0, woke: !host };
    p.hidden = true;
    X.cam.x = p.x; X.cam.y = p.y;
    AN.HUD.toast(host ? host.def.name + ' : vous êtes sur son dos. Tout autour, le vide.' : 'Il ne reste que la plateforme, dans le vide.', 5);
  };
  /** On quitte la zone : on lâche tout ce qui tenait au colosse. */
  Co.leaveZone = function (X) {
    const p = X.player;
    if (p) { p.climb = null; p.z = 0; p.hidden = false; }
    (X.allies || []).forEach((a) => {
      if (!a.rider) return;
      const d = a.rider.host && a.rider.host.col && a.rider.host.col.deck;
      if (d) d.riders = d.riders.filter((r) => r !== a);
      a.rider = null;
    });
    X.colShow = null; X.mapPad = null; X.mapPlate = null; X.mapHad = false;
  };
  /** À chaque image, sur un colosse-carte : la plateforme suit son dos ; sans lui, on ne quitte pas la plateforme. */
  Co.mapUpdate = function (X, dt) {
    if (!X.zone || !X.zone.colMap) return;
    const p = X.player, host = Co.mapHost(X), S = X.colShow;
    if (S) {
      S.t += dt;
      if (!S.woke && S.t > 1 && host) { S.woke = true; if (!host.boss.active) AN.Boss.wake(X, host); } // son nom, quand on le voit en entier
      if (S.t < SHOW.land) p.hidden = true; // à bord de la plateforme qui descend
      else if (!S.landed) { S.landed = true; p.hidden = false; FX.burst(p.x, p.y, AN.CYAN, 14, 140, { size: 2.5 }); AN.Audio.play('land', { pitch: 0.9 }); }
    }
    const pad = Co.padPoint(X);
    if (pad) { X.mapPad.x = pad.x; X.mapPad.y = pad.y; X.mapPad.R = pad.R; X.mapPad.s = pad.s || 1; }
    if (X.mapPlate && X.mapPad) { X.mapPlate.x = X.mapPad.x; X.mapPlate.y = X.mapPad.y; }
    if (!p.alive || p.hidden || X.ending) return;
    if (host) {
      if (!p.climb) attachToPad(X, host); // rien ne vous en fait descendre
      return;
    }
    // il n'est plus : l'Artefact vous ramène sur la plateforme, seule dans le vide
    const P = X.mapPad;
    if (!P) return;
    if (X.mapHad) {
      X.mapHad = false;
      p.climb = null; p.z = 0; p.x = P.x; p.y = P.y + 20; p.vx = p.vy = p.kbx = p.kby = 0;
      FX.ring(P.x, P.y, AN.CYAN, 10, P.R * 1.5, 0.7, 4);
      AN.HUD.toast('Il n’est plus là : l’Artefact vous ramène sur sa plateforme, seule dans le vide.', 5);
    }
    const keep = (e, m) => { const d = U.dist(e.x, e.y, P.x, P.y), R = P.R * m; if (d > R) { e.x = P.x + ((e.x - P.x) / d) * R; e.y = P.y + ((e.y - P.y) / d) * R; } };
    keep(p, 0.85);
    X.allies.forEach((a) => { if (!a.rider && !a.onHex) { keep(a, 0.8); a.home = { x: P.x, y: P.y }; } });
  };
  const SHOW = { out: 0.8, hold: 2.5, back: 3.9, land: 2.3 };
  /** La caméra de l'arrivée : { x, y, zoom } tant qu'elle dure. */
  Co.showCam = function (X) {
    const S = X.colShow;
    if (!S) return null;
    if (S.t >= SHOW.back) { X.colShow = null; return null; }
    const base = AN.Expedition.baseZoom(), p = X.player;
    const k = S.t < SHOW.out ? ease(S.t / SHOW.out) : S.t < SHOW.hold ? 1 : 1 - ease((S.t - SHOW.hold) / (SHOW.back - SHOW.hold));
    const m = Math.min(1, k * 1.4);
    return { x: U.lerp(p.x, S.x, m), y: U.lerp(p.y, S.y, m), zoom: base * Math.pow(S.far / base, k) };
  };
  /** L'arrivée de la plateforme : 0 (dans le ciel) → 1 (posée). */
  Co.padLand = (X) => (X.colShow ? U.clamp((X.colShow.t - 0.5) / (SHOW.land - 0.5), 0, 1) : 1);
  /** Ce que E fait sur un colosse-carte : relever un compagnon, l'achever, la plateforme. */
  Co.mapAction = function (X, e, p) {
    const col = e.col;
    if (col.shake > 0.15 || Co.deckNode(e, p)) return null;
    for (const a of X.allies) if (a.downed && a.rider && U.dist(a.x, a.y, p.x, p.y) < 60) return { kind: 'revive', target: a, text: 'Relever ' + (a.nickname || a.def.name), hold: 1.4 };
    if (e.boss.exhausted) return { kind: 'finish', target: e, text: 'Achever ' + e.def.name + ' (sans le capturer)', hold: 0.6 };
    const pad = Co.padPoint(X);
    if (pad && !X.collapse && U.dist(pad.x, pad.y, p.x, p.y) < pad.R) return { kind: 'colpad', target: pad, text: PAD_TEXT, hold: 0.4 };
    return null;
  };
  function mapUse(X, e, p, dt) {
    const c = p.climb;
    if (!c) return;
    const act = Co.mapAction(X, e, p);
    const key = act ? act.kind : null;
    if (key !== c.useKey) { c.useKey = key; c.useT = 0; }
    c.useAct = act;
    if (act && I.down('KeyE')) {
      c.useT += dt;
      if (c.useT >= act.hold) { c.useT = -1e9; AN.Expedition.interact(X, act); }
    } else if (!I.down('KeyE')) c.useT = 0;
  }
  /** La plateforme : extraire (l'Artefact ouvre son portail ici), ou repartir d'où l'on vient. */
  Co.padMenu = function (X) {
    if (X.collapse || X.ending) return;
    const zi = X.mapFrom != null ? X.mapFrom : 0, spec = AN.Expedition.zoneSpec(X, zi);
    AN.UI.padDialog(X, { name: spec ? spec.name : 'la zone précédente', go: () => { AN.Audio.play('portal'); AN.Game.transition(() => AN.Expedition.enterZone(X, zi, X.zi)); } });
  };
  /** Les formes de capture se posent sur son dos : il n'y a pas de sol autour de lui. */
  function mapForms(X, e, col) {
    const F = e.boss.form;
    if (!F) return;
    if (F.done && !F.mapTime) { F.mapTime = 1; e.boss.exhaustT = Math.max(e.boss.exhaustT, 30); } // forme accomplie : le temps de le capturer
    if (F.nodes) {
      if (!F.onBody) { // les nœuds de la trame : sur des parties où l'on peut marcher, bien réparties
        F.onBody = true;
        const flats = col.caps.filter((c) => c.grip && c.flat && visible(col, c));
        const pool = flats.length ? flats : col.caps.filter((c) => c.grip);
        const rng = AN.RNG.from(X.world.seed, 'trame' + col.attacks);
        // sur un dos-biome : autour de vous (entre 150 et 800 px), pour qu'on les relie à temps
        const pc = X.player.climb, me = col.back && (pc && pc.cap === col.back.cap ? backUV(col, col.caps[pc.cap], pc.t, pc.off) : col.back.pad);
        F.nodes.forEach((q, k) => {
          if (col.back) {
            let best = null;
            for (let n = 0; n < 40 && !best; n++) { const sp = backSpot(col, rng, 0), d = Math.hypot(sp.u - me.u, sp.v - me.v); if (d > 150 && d < 800) best = sp; }
            if (best) { q.on = { cap: best.cap, t: best.t, off: best.off }; return; }
          }
          const c = pool[(k * 7 + 3) % pool.length]; q.on = { cap: c.i, t: 0.2 + ((k * 0.37) % 0.6), off: ((k % 3) - 1) * 0.45 };
        });
      }
      F.nodes.forEach((q) => { const c = q.on && col.caps[q.on.cap]; if (c) { const pt = capPoint(col, c, q.on.t, q.on.off); q.x = pt.x; q.y = pt.y; } });
    }
    if (F.orbs) F.orbs.forEach((o) => { o.overCol = true; });
  }

  Co.camera = function (X) {
    const p = X.player;
    let best = null, bd = 1e9;
    for (const e of X.creatures) {
      if (!e.alive || !e.col) continue;
      const d = U.dist(p.x, p.y, e.col.x, e.col.y);
      if (d < e.col.L * 1.5 && d < bd) { bd = d; best = e; }
    }
    if (!best) return null;
    const col = best.col, L = col.L;
    const far = U.clamp(900 / (L + 500), 0.45, 0.85);
    if (p.climb) return { zoom: col.map ? 1 : 0.85, x: p.x, y: p.y, k: 0 }; // sur lui : on voit son dos autour de soi (1.16.2) ; sur un dos-biome, comme au sol d'une zone (1.16.4)
    // éveillé et proche : on recule pour le voir en entier ; endormi, errant ou épuisé : à peine ; loin : rien (1.16.1)
    const awake = best.boss.active && !best.boss.exhausted;
    const near = awake ? U.clamp(1 - (bd - L * 0.55) / (L * 0.8), 0, 1) : U.clamp(1 - (bd - L * 0.3) / (L * 0.5), 0, 1) * 0.35;
    if (near <= 0.01) return null;
    const cy = Co.proj(col.x, col.y, col.plan === 'volant' ? col.alt : 0.8, liftOf(col)).y;
    return { zoom: U.lerp(1, far, near), x: col.x, y: cy, k: awake ? 0.15 * near : 0 };
  };
})();
