/* Au-delà de la galaxie (1.10), côté expédition.
   - Amas : ponts de matière sombre qui se font et se défont (on tombe si l'on
     y reste), collisions de galaxies en ondes, le Berger se capture en ramenant
     ses galaxies errantes dans son orbite (Rassemblement).
   - Toile : filaments où l'on file, vides où l'on se traîne, le Grand Vide qui
     s'étend, le Tisserand se capture en reliant des nœuds dans l'ordre (Tissage).
   - Pli : la marche s'inverse par endroits, des pliures balaient la page, des
     échos de soi-même tirés du journal, le Relieur se dédouble (Reflet).
   Données : js/data/beyond.js. Branché sur game/cosmic.js (menaces, formes,
   appels, dessin) et game/player.js (vitesse, inversion). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const C = new Proxy({}, { get: (_, k) => AN.Combat[k] }); // chargé plus tard (et absent des tests)
  const TAU = Math.PI * 2;

  const Bd = (AN.Beyond = {});
  const toast = (...a) => AN.HUD && AN.HUD.toast && AN.HUD.toast(...a);

  /* ======================= Déplacements ======================= */
  /** Le saut au-dessus du vide existe dans la galaxie et dans l'Amas. */
  Bd.leaps = (X) => !!X.echelon && (X.echelon.move === 'leap' || X.echelon.move === 'bridges');

  /** Distance d'un point au filament le plus proche (Toile). */
  Bd.filamentDist = function (zone, x, y) {
    let best = 1e9;
    for (const f of zone.filaments || []) {
      const d = C.distToSegment(x, y, f.x1, f.y1, f.x2, f.y2);
      if (d < best) best = d;
    }
    return best;
  };
  Bd.FIL_FAST = 1.9;
  Bd.FIL_SLOW = 0.6;
  /** Multiplicateur de vitesse : sur un filament, on file ; dans un vide, on se traîne. */
  Bd.speedMul = function (X, e) {
    if (!X.echelon || X.echelon.move !== 'filaments' || !X.zone.filaments) return 1;
    if (X.cosmo && X.cosmo.voids.some((v) => U.dist(v.x, v.y, e.x, e.y) < v.r)) return 0.45;
    return Bd.filamentDist(X.zone, e.x, e.y) < 36 ? Bd.FIL_FAST : Bd.FIL_SLOW;
  };
  /** Dans les endroits de l'envers (Pli), la marche s'inverse. */
  Bd.inverted = (X, x, y) => !!(X.zone.inversions && X.zone.inversions.some((q) => (q.x - x) ** 2 + (q.y - y) ** 2 < q.r * q.r));
  Bd.inputAxis = function (X, p, ax) {
    if (!X.echelon || X.echelon.move !== 'inversion' || !Bd.inverted(X, p.x, p.y)) { p.inverted = false; return ax; }
    if (!p.inverted) { p.inverted = true; if (!X.cosmo.invSeen) { X.cosmo.invSeen = true; toast('Ici, tout est à l’envers : votre marche aussi.', 4); } }
    return { x: -ax.x, y: -ax.y };
  };

  /* ======================= Ponts de l'Amas ======================= */
  function bridgeOpen(b, t) {
    const per = b.on + b.off;
    const k = (t + b.phase) % per;
    return k < b.on;
  }
  function bridgeWarn(b, t) {
    const per = b.on + b.off;
    const k = (t + b.phase) % per;
    return k > b.on - 1.6 && k < b.on;
  }
  function setBridge(X, b, open) {
    const zone = X.zone;
    b.open = open;
    for (const i of b.tiles) if (zone.grid[i] === Z.BRIDGE_ON || zone.grid[i] === Z.BRIDGE_OFF) zone.grid[i] = open ? Z.BRIDGE_ON : Z.BRIDGE_OFF;
    X.flowT = 0; // les chemins changent
    if (open) return;
    // ce qui se tenait sur le pont tombe
    const onIt = (e) => { const tx = Math.floor(e.x / Z.T), ty = Math.floor(e.y / Z.T); return zone.grid[ty * zone.w + tx] === Z.BRIDGE_OFF; };
    const p = X.player;
    if (p.alive && !p.leap && !p.hidden && onIt(p)) Bd.fall(X);
    for (const a of X.allies) if (!a.downed && a.move !== 'fly' && onIt(a)) { a.x = p.x + (Math.random() - 0.5) * 60; a.y = p.y + (Math.random() - 0.5) * 60; AN.Physics.collide(zone, a); }
    for (const e of X.creatures) {
      if (!e.alive || e.isBoss || e.move === 'fly' || e.fixed || !onIt(e)) continue;
      e.alive = false; e.noLoot = true;
      FX.burst(e.x, e.y, e.pal.body, 10, 90, { size: 3, kind: 'square' });
    }
  }
  /** Le joueur tombe d'un pont défait : il revient au dernier endroit sûr. */
  Bd.fall = function (X) {
    const p = X.player;
    const s = X.cosmo.safe || { x: X.zone.entry.x, y: X.zone.entry.y };
    FX.burst(p.x, p.y, '#9a7ae8', 20, 200, { size: 3 });
    p.x = s.x; p.y = s.y; p.vx = p.vy = p.kbx = p.kby = 0;
    AN.Physics.collide(X.zone, p);
    AN.PlayerCtl.damage(X, 16, null, { ignoreIframes: true });
    toast('Le pont s’est défait sous vos pas.', 2.5);
  };

  /* ======================= Échos du Pli ======================= */
  /** Des échos de soi-même, tirés du journal des expéditions. */
  Bd.spawnEchoes = function (X, zone) {
    if (!X.echelon || X.echelon.id !== 'pli') return;
    const J = (X.profile.journal || []).filter((j) => j.code);
    if (!J.length) return;
    const rng = AN.RNG.from(X.world.seed, 'echos' + zone.index);
    const n = Math.min(J.length, 3 + rng.int(0, 2));
    const T = zone.T;
    for (let k = 0, tries = 0; k < n && tries < 400; tries++) {
      const x = rng.int(4, zone.w - 5), y = rng.int(4, zone.h - 5);
      if (zone.grid[y * zone.w + x] !== Z.FLOOR) continue;
      if (Math.hypot(x * T - zone.entry.x, y * T - zone.entry.y) < 10 * T) continue;
      const j = J[(rng.int(0, J.length - 1) + k) % J.length];
      const hostile = j.outcome === 'echec';
      const def = hostile ? D.ECHO_HOSTILE : D.ECHO_DEF;
      const e = AN.Entities.creature(def, x * T + T / 2, y * T + T / 2, { threat: X.world.threat, rule: X.world.rule });
      e.echo = j;
      e.home = { x: e.x, y: e.y };
      e.temper = hostile ? 'territorial' : 'passif';
      e.noCry = true;
      X.creatures.push(e);
      k++;
    }
  };
  Bd.echoLine = function (j, rng) {
    const L = D.ECHO_LINES[j.outcome] || D.ECHO_LINES.extrait;
    const tpl = L[Math.floor((rng || Math.random)() * L.length)] || L[0];
    let line = tpl.replace('{code}', j.code).replace('{region}', j.region || 'un monde');
    if (j.outcome === 'extrait' && j.territories) line += ' ' + j.territories + ' territoire' + (j.territories > 1 ? 's' : '') + ' vous suivaient.';
    if (j.creatures && j.creatures.length) line += ' ' + j.creatures.slice(0, 2).join(' et ') + (j.creatures.length > 2 ? ', et d’autres,' : '') + ' dans la soute.';
    return line;
  };
  Bd.interactables = function (X, consider) {
    if (!X.echelon || X.echelon.id !== 'pli') return;
    const p = X.player;
    for (const e of X.creatures) {
      if (!e.alive || !e.echo || e.heard || e.temper === 'agressif' || e.team !== 'wild') continue;
      consider(U.dist(e.x, e.y, p.x, p.y), e.r + 50, () => ({ kind: 'echo', target: e, text: 'Écouter l’écho', hold: 0.6 }));
    }
  };
  Bd.interact = function (X, it) {
    if (it.kind !== 'echo') return false;
    const e = it.target;
    e.heard = true;
    AN.Audio.play('appear', { pitch: 0.7 });
    toast(Bd.echoLine(e.echo), 8);
    AN.Combat.drop(X, e.x, e.y, { blanc: 1 }, 1);
    FX.ring(e.x, e.y, AN.CYAN, e.r, e.r * 4, 0.8, 3);
    setTimeout(() => { if (AN.X === X && e.alive) { e.alive = false; e.noLoot = true; FX.burst(e.x, e.y, '#ffffff', 16, 120, { size: 3 }); } }, 1800);
    return true;
  };

  /* ======================= Menaces ======================= */
  Bd.EVENTS = {
    collision: { first: 20, every: [24, 32] },
    grand_vide: { first: 18, every: [22, 30] },
    pliure: { first: 16, every: [18, 26] },
  };
  Bd.RUN = {
    collision(X) {
      X.cosmo.warn = { kind: 'collision', t: 0, dur: 2.2, text: 'Deux galaxies se percutent : l’onde arrive.', run: (XX) => {
        const p = XX.player;
        const a = Math.random() * TAU;
        for (let k = 0; k < 2; k++) {
          const b = a + k * (0.6 + Math.random() * 0.8);
          C.shockwave(XX, { x: p.x + Math.cos(b) * 900, y: p.y + Math.sin(b) * 900, r0: 40, speed: 380 + k * 40, max: 2400, width: 70, dmg: 24, team: 'wild', color: '#c8b8ff' });
        }
        XX.cam.shake(10);
        AN.Audio.play('explosion', { pitch: 0.6 });
      } };
      AN.Audio.play('boss_roar', { pitch: 0.4 });
    },
    grand_vide(X) {
      const p = X.player;
      const a = Math.random() * TAU, d = 220 + Math.random() * 180;
      X.cosmo.voids.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 0, max: 220 + Math.random() * 180, t: 0, life: 16, acc: 0 });
      toast('Le Grand Vide s’étend près de vous.', 3);
      AN.Audio.play('portal', { pitch: 0.5 });
    },
    pliure(X) {
      const p = X.player;
      const a = Math.random() * Math.PI;
      const off = (Math.random() - 0.5) * 160;
      const nx = -Math.sin(a), ny = Math.cos(a);
      const cx = p.x + nx * off, cy = p.y + ny * off;
      const side = Math.random() < 0.5 ? 1 : -1;
      C.telegraph(X, { kind: 'line', x: cx - Math.cos(a) * 1000, y: cy - Math.sin(a) * 1000, angle: a, len: 2000, width: 150, windup: 1.7, dmg: 16, team: 'wild', color: '#2346c8',
        onDone: (XX) => {
          // la page se replie : ce qui était dans le pli est emporté de l'autre côté
          const push = (e) => {
            const d = (e.x - cx) * nx + (e.y - cy) * ny;
            if (Math.abs(d) > 75) return;
            const tx = e.x + nx * side * 380, ty = e.y + ny * side * 380;
            if (Z.isSolid(Z.tileAt(XX.zone, tx, ty))) return;
            FX.burst(e.x, e.y, '#ffffff', 8, 90, { size: 3, kind: 'square' });
            e.x = tx; e.y = ty;
          };
          if (XX.player.alive) push(XX.player);
          XX.allies.forEach(push);
          XX.creatures.forEach((e) => { if (e.alive && !e.isBoss && !e.fixed) push(e); });
          XX.cosmo.creases.push({ x: cx, y: cy, a, t: 0 });
          XX.cam.shake(6);
        } });
      toast('Une pliure traverse la page.', 2.5);
    },
  };

  /* ======================= Formes de capture ======================= */
  const ORB_DEF = {
    id: 'galaxie_errante', name: 'Galaxie errante', tier: 0, r: 22, hp: 9999, speed: 0, temper: 'passif', move: 'drift', attack: null,
    traits: ['glow'], group: [1, 1], roles: [], biomes: [], resist: 1, armor: 0, rarity: 0, index: 9997, fake: true,
    art: { shape: 'spiral', body: '#c8b8ff', accent: '#fff0c0', eye: '#ffffff', eyes: 1, glow: '#c8b8ff' }, drops: {},
  };
  function nearFloor(X, x, y) {
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * TAU, r = k * 10;
      const xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r;
      if (Z.tileAt(X.zone, xx, yy) === Z.FLOOR) return { x: xx, y: yy };
    }
    return { x, y };
  }
  /** Prépare la forme de capture d'un maître d'au-delà, à son épuisement. */
  Bd.makeForm = function (X, e, F) {
    if (F.kind === 'rassemblement') {
      F.inner = e.r + 70; F.outer = e.r + 200;
      F.orbs = [0, 1, 2, 3].map((k) => {
        const a = (k / 4) * TAU + Math.random() * 0.6;
        const q = nearFloor(X, e.x + Math.cos(a) * (e.r + 300), e.y + Math.sin(a) * (e.r + 300));
        const o = AN.Entities.creature(ORB_DEF, q.x, q.y, { threat: X.world.threat });
        o.fixed = true; o.herd = true; o.noLoot = true; o.isBoss = false; o.aggroT = 0;
        o.vx = Math.cos(a) * 30; o.vy = Math.sin(a) * 30;
        X.creatures.push(o);
        return o;
      });
      return true;
    }
    if (F.kind === 'tissage') {
      const a0 = Math.random() * TAU;
      const n = 5;
      F.nodes = Array.from({ length: n }, (_, k) => { const a = a0 + (k / n) * TAU; const q = nearFloor(X, e.x + Math.cos(a) * (e.r + 230), e.y + Math.sin(a) * (e.r + 230)); return { x: q.x, y: q.y, lit: false }; });
      F.order = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
      F.next = 0; F.lastT = X.time;
      return true;
    }
    if (F.kind === 'reflet') {
      // le vrai prend l'une des trois places ; deux reflets, sans ombre et à l'envers, prennent les autres
      const a0 = Math.random() * TAU;
      const spots = [0, 1, 2].map((k) => nearFloor(X, e.x + Math.cos(a0 + (k / 3) * TAU) * (e.r * 1.4 + 120), e.y + Math.sin(a0 + (k / 3) * TAU) * (e.r * 1.4 + 120)));
      const real = Math.floor(Math.random() * 3);
      e.x = spots[real].x; e.y = spots[real].y;
      F.copies = spots.filter((_, k) => k !== real).map((q) => {
        const c = AN.Entities.creature(e.def, q.x, q.y, { threat: X.world.threat, variant: e.variant, hueSeed: e.hueSeed });
        c.fixed = true; c.reflection = true; c.real = e; c.noLoot = true; c.isBoss = false; c.mirror = true; c.noShadow = true; c.face = e.face;
        X.creatures.push(c);
        return c;
      });
      F.done = true;
      FX.ring(e.x, e.y, '#ffffff', e.r, e.r * 3, 0.8, 4);
      return true;
    }
    return false;
  };
  /** Le rayon a pris un reflet : il se déchire, et le vrai reprend des forces. */
  Bd.tearReflection = function (X, c) {
    if (!c.alive) return;
    c.alive = false;
    for (let i = 0; i < 30; i++) FX.add({ kind: 'square', x: c.x + (Math.random() - 0.5) * c.r * 2, y: c.y + (Math.random() - 0.5) * c.r * 2, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, size: 8, color: '#f7f6f2', life: 0.9, vr: 4, rot: 0, drag: 2 });
    AN.Audio.play('shatter', { pitch: 1.4 });
    const e = c.real;
    if (e && e.alive && e.boss) { e.boss.exhaustT = Math.max(2, e.boss.exhaustT - 6); e.capture = 0; }
    if (X.beam) X.beam.target = null;
    toast('Un reflet : il se déchire. Le Relieur reprend des forces.', 3.5);
  };
  Bd.formHint = function (X, e, F) {
    if (F.kind === 'rassemblement') return 'galaxies ramenées : ' + F.orbs.filter((o) => o.held).length + ' / ' + F.orbs.length;
    if (F.kind === 'tissage') return 'nœuds reliés : ' + F.next + ' / ' + F.order.length;
    if (F.kind === 'reflet') return 'trouvez celui qui porte une ombre';
    return null;
  };
  Bd.onRecover = function (X, e, F) {
    if (F.orbs) F.orbs.forEach((o) => { o.alive = false; });
    if (F.copies) F.copies.forEach((c) => { if (c.alive) { c.alive = false; FX.burst(c.x, c.y, '#ffffff', 10, 100, { size: 3 }); } });
  };
  function formsUpdate(X, dt) {
    const p = X.player;
    for (const e of X.creatures) {
      const F = e.alive && e.boss && e.boss.exhausted && e.boss.form;
      if (!F) continue;
      if (F.kind === 'rassemblement' && !F.done) {
        const mid = (F.inner + F.outer) / 2;
        let held = 0;
        F.orbs.forEach((o, k) => {
          if (!o.alive) return;
          o.hp = o.maxHp; o.weak = false;
          if (o.held) {
            held++;
            const a = X.time * 0.5 + (k / F.orbs.length) * TAU;
            o.x = e.x + Math.cos(a) * mid; o.y = e.y + Math.sin(a) * mid;
            return;
          }
          // elles dérivent loin du Berger ; les coups les repoussent
          const dx = o.x - e.x, dy = o.y - e.y, d = Math.hypot(dx, dy) || 1;
          const drift = d > 1400 ? -30 : 26;
          o.vx += (dx / d) * drift * dt; o.vy += (dy / d) * drift * dt;
          const sp = Math.hypot(o.vx, o.vy), max = 70;
          if (sp > max) { o.vx *= max / sp; o.vy *= max / sp; }
          const kd = Math.exp(-2.5 * dt);
          o.x += (o.vx + o.kbx * 1.6) * dt; o.y += (o.vy + o.kby * 1.6) * dt;
          o.kbx *= kd; o.kby *= kd;
          AN.Physics.collide(X.zone, o);
          o.anim += dt;
          if (d >= F.inner && d <= F.outer && Math.hypot(o.kbx, o.kby) < 120) {
            o.held = true;
            FX.ring(o.x, o.y, AN.CYAN, o.r, o.r * 3, 0.5, 3);
            AN.Audio.play('pickup', { pitch: 0.8 + held * 0.15 });
          }
        });
        if (held >= F.orbs.length) {
          F.done = true;
          e.boss.exhaustT = Math.max(e.boss.exhaustT, 14);
          FX.ring(e.x, e.y, AN.CYAN, F.inner, F.outer, 0.8, 5);
          AN.Audio.play('rank');
          toast(e.def.name + ' a retrouvé son troupeau. Maintenez ' + AN.Input.label('KeyF') + ' pour le capturer.', 5);
        }
      } else if (F.kind === 'tissage' && !F.done) {
        const n = F.order[F.next];
        const node = F.nodes[n];
        if (F.next > 0 && X.time - F.lastT > 9) {
          F.nodes.forEach((q) => { q.lit = false; });
          F.next = 0;
          AN.Audio.play('ui_err');
          toast('La trame a cédé : recommencez par le premier nœud.', 3);
        } else if (node && U.dist(p.x, p.y, node.x, node.y) < 46) {
          node.lit = true;
          F.next++;
          F.lastT = X.time;
          FX.ring(node.x, node.y, '#bfe2ff', 6, 70, 0.5, 3);
          AN.Audio.play('pickup', { pitch: 1 + F.next * 0.12 });
          if (F.next >= F.order.length) {
            F.done = true;
            e.boss.exhaustT = Math.max(e.boss.exhaustT, 14);
            AN.Audio.play('rank');
            toast(e.def.name + ' est pris dans sa propre trame. Maintenez ' + AN.Input.label('KeyF') + ' pour le capturer.', 5);
          }
        }
      } else if (F.kind === 'reflet') {
        for (const c of F.copies) if (c.alive) { c.hp = c.maxHp; c.face = e.face; c.anim = e.anim; }
      }
    }
  }

  /* ======================= Mise à jour ======================= */
  Bd.update = function (X, dt) {
    const c = X.cosmo;
    if (!c) return;
    const p = X.player;
    const zone = X.zone;
    // ponts de l'Amas
    if (zone.bridges && zone.bridges.length) {
      for (const b of zone.bridges) {
        const open = bridgeOpen(b, X.time);
        if (open !== b.open) setBridge(X, b, open);
      }
      const tile = zone.grid[Math.floor(p.y / Z.T) * zone.w + Math.floor(p.x / Z.T)];
      if (tile === Z.FLOOR || tile === Z.PLATE || tile === Z.HAZARD) c.safe = { x: p.x, y: p.y };
    }
    // le Grand Vide
    c.voids = c.voids.filter((v) => {
      v.t += dt;
      const grow = U.clamp(v.t / 6, 0, 1), shrink = U.clamp((v.life - v.t) / 3, 0, 1);
      v.r = v.max * U.easeOut(grow) * shrink;
      if (p.alive && U.dist(p.x, p.y, v.x, v.y) < v.r) {
        p.slowT = Math.max(p.slowT || 0, 0.25); p.slowAmt = Math.max(p.slowAmt || 0, 0.5);
        v.acc += 9 * dt;
        if (v.acc >= 1) { const d = Math.floor(v.acc); v.acc -= d; AN.PlayerCtl.damage(X, d, null, { dot: true, numbers: false, ignoreIframes: true }); }
      }
      for (const e of X.creatures) {
        if (!e.alive || e.isBoss || e.team !== 'wild' || e.fixed) continue;
        if (U.dist(e.x, e.y, v.x, v.y) < v.r && (e.voidCd || 0) <= X.time) { e.voidCd = X.time + 0.5; C.hit(X, e, 6, null, { numbers: false }); }
      }
      return v.t < v.life;
    });
    c.creases = c.creases.filter((q) => (q.t += dt) < 1.2);
    if (c.warn && c.warn.run && c.warn.t + dt >= c.warn.dur) { const f = c.warn.run; c.warn.run = null; c.warn.done = true; f(X); }
    formsUpdate(X, dt);
  };

  /* ======================= Appels ======================= */
  Bd.call = function (X, id, pw, visible) {
    const p = X.player;
    const m = AN.Game.mouseWorld();
    if (id === 'rassemblement') {
      visible.forEach((e) => {
        if (e.isBoss) return;
        const a = Math.atan2(m.y - e.y, m.x - e.x), d = U.dist(e.x, e.y, m.x, m.y);
        e.kbx += Math.cos(a) * Math.min(1200, d * 3); e.kby += Math.sin(a) * Math.min(1200, d * 3);
        e.stunT = Math.max(e.stunT || 0, 2.4);
      });
      C.telegraph(X, { x: m.x, y: m.y, r: 170, windup: 1.1, dmg: 120 * pw, team: 'player', color: '#c8b8ff' });
      FX.ring(m.x, m.y, '#c8b8ff', 300, 20, 0.8, 5);
      return true;
    }
    if (id === 'trame') {
      let prev = p;
      visible.slice(0, 20).forEach((e) => {
        C.hit(X, e, 70 * pw, p, { knock: 60, slow: 0.5 });
        e.slowT = 3; e.slowAmt = 0.5;
        FX.stream(prev.x, prev.y, e.x, e.y, '#bfe2ff', { life: 0.5, size: 3 });
        prev = e;
      });
      return true;
    }
    if (id === 'repli') {
      visible.forEach((e) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        if (!e.isBoss) { e.kbx += Math.cos(a) * 700; e.kby += Math.sin(a) * 700; }
        C.hit(X, e, 90 * pw, p, {});
      });
      p.hp = Math.min(p.maxHp, p.hp + 50 * pw);
      X.allies.forEach((a) => { if (!a.downed) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.4); });
      FX.ring(p.x, p.y, '#2346c8', 20, 600, 0.8, 6);
      X.cosmo.creases.push({ x: p.x, y: p.y, a: p.aim + Math.PI / 2, t: 0 });
      return true;
    }
    return false;
  };

  /* ======================= Dessin ======================= */
  Bd.drawUnder = function (ctx, X, t) {
    const zone = X.zone;
    const cam = X.cam;
    // filaments de la Toile
    if (zone.filaments && zone.filaments.length) {
      ctx.lineCap = 'round';
      for (const f of zone.filaments) {
        ctx.strokeStyle = U.rgba('#bfe2ff', 0.18); ctx.lineWidth = 64;
        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
        ctx.strokeStyle = U.rgba('#ffffff', 0.55); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(f.x1, f.y1); ctx.lineTo(f.x2, f.y2); ctx.stroke();
        // des grains de lumière filent le long du fil
        const L = Math.hypot(f.x2 - f.x1, f.y2 - f.y1);
        const n = Math.max(2, Math.floor(L / 120));
        ctx.fillStyle = '#ffffff';
        for (let k = 0; k < n; k++) {
          const s = ((t * 0.35 + k / n) % 1);
          const x = U.lerp(f.x1, f.x2, s), y = U.lerp(f.y1, f.y2, s);
          if (!cam.visible(x, y, 8)) continue;
          ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill();
        }
      }
      ctx.lineCap = 'butt';
    }
    // ponts de matière sombre
    if (zone.bridges && zone.bridges.length) {
      const T = Z.T;
      for (const b of zone.bridges) {
        if (!cam.visible(b.x, b.y, 400)) continue;
        const warn = bridgeWarn(b, X.time);
        const a = b.open ? (warn ? 0.35 + 0.35 * Math.abs(Math.sin(t * 14)) : 0.85) : 0.12;
        ctx.fillStyle = U.rgba('#3a2a60', a);
        for (const i of b.tiles) {
          if (zone.grid[i] !== Z.BRIDGE_ON && zone.grid[i] !== Z.BRIDGE_OFF) continue;
          const x = (i % zone.w) * T, y = ((i / zone.w) | 0) * T;
          ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        }
        if (b.open) {
          ctx.fillStyle = U.rgba('#c8b8ff', warn ? 0.4 : 0.7);
          for (let k = 0; k < b.tiles.length; k += 2) {
            const i = b.tiles[k];
            const x = (i % zone.w) * T + T / 2 + Math.sin(t * 2 + k) * 8, y = ((i / zone.w) | 0) * T + T / 2 + Math.cos(t * 1.7 + k) * 8;
            ctx.fillRect(x - 1, y - 1, 2, 2);
          }
        } else {
          ctx.strokeStyle = U.rgba('#9a7ae8', 0.25); ctx.lineWidth = 1; ctx.setLineDash([4, 8]);
          ctx.beginPath(); ctx.arc(b.x, b.y, 18, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        }
      }
    }
    // endroits de l'envers
    for (const q of zone.inversions || []) {
      if (!cam.visible(q.x, q.y, q.r)) continue;
      ctx.save();
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.clip();
      ctx.fillStyle = U.rgba('#1c2230', 0.05); ctx.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
      ctx.strokeStyle = U.rgba('#1c2230', 0.18); ctx.lineWidth = 1;
      for (let k = -q.r; k < q.r; k += 12) { ctx.beginPath(); ctx.moveTo(q.x + k, q.y - q.r); ctx.lineTo(q.x + k + q.r, q.y + q.r); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = U.rgba('#2346c8', 0.45); ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, -t * 0.4, -t * 0.4 + TAU); ctx.stroke(); ctx.setLineDash([]);
      // deux flèches qui se tournent le dos
      ctx.strokeStyle = U.rgba('#2346c8', 0.5); ctx.lineWidth = 2;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + s * 18, q.y); ctx.lineTo(q.x + s * 12, q.y - 5); ctx.moveTo(q.x + s * 18, q.y); ctx.lineTo(q.x + s * 12, q.y + 5); ctx.stroke(); }
    }
    const c = X.cosmo;
    if (!c) return;
    // le Grand Vide : il mange la lumière
    for (const v of c.voids) {
      if (v.r < 2) continue;
      const g = ctx.createRadialGradient(v.x, v.y, v.r * 0.2, v.x, v.y, v.r);
      g.addColorStop(0, 'rgba(0,0,0,0.92)'); g.addColorStop(0.8, 'rgba(4,4,10,0.75)'); g.addColorStop(1, 'rgba(4,4,10,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.rgba('#7a7aa8', 0.5); ctx.lineWidth = 1.5; ctx.setLineDash([3, 9]);
      ctx.beginPath(); ctx.arc(v.x, v.y, v.r * 0.98, t * 0.3, t * 0.3 + TAU); ctx.stroke(); ctx.setLineDash([]);
    }
  };
  Bd.drawOver = function (ctx, X, t) {
    const c = X.cosmo;
    if (!c) return;
    // pliures : un trait blanc qui s'efface
    for (const q of c.creases) {
      const k = 1 - q.t / 1.2;
      ctx.strokeStyle = U.rgba('#ffffff', 0.8 * k); ctx.lineWidth = 6 * k + 1;
      ctx.beginPath(); ctx.moveTo(q.x - Math.cos(q.a) * 1200, q.y - Math.sin(q.a) * 1200); ctx.lineTo(q.x + Math.cos(q.a) * 1200, q.y + Math.sin(q.a) * 1200); ctx.stroke();
      ctx.strokeStyle = U.rgba('#2346c8', 0.4 * k); ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // formes de capture
    for (const e of X.creatures) {
      const F = e.alive && e.boss && e.boss.exhausted && e.boss.form;
      if (!F) continue;
      if (F.kind === 'rassemblement') {
        ctx.fillStyle = U.rgba('#c8b8ff', F.done ? 0.2 : 0.1);
        ctx.beginPath(); ctx.arc(e.x, e.y, F.outer, 0, TAU); ctx.arc(e.x, e.y, F.inner, 0, TAU, true); ctx.fill();
        ctx.strokeStyle = U.rgba(F.done ? AN.CYAN : '#ffffff', 0.6); ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(e.x, e.y, F.inner, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(e.x, e.y, F.outer, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        for (const o of F.orbs) {
          if (!o.alive || o.held) continue;
          const a = Math.atan2(e.y - o.y, e.x - o.x);
          ctx.strokeStyle = U.rgba(AN.CYAN, 0.6); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(o.x + Math.cos(a) * (o.r + 6), o.y + Math.sin(a) * (o.r + 6)); ctx.lineTo(o.x + Math.cos(a) * (o.r + 26), o.y + Math.sin(a) * (o.r + 26)); ctx.stroke();
        }
      } else if (F.kind === 'tissage') {
        // fils déjà tendus, puis le prochain nœud
        ctx.strokeStyle = U.rgba('#bfe2ff', 0.8); ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let k = 0; k < F.next; k++) { const q = F.nodes[F.order[k]]; k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
        if (F.done) { const q = F.nodes[F.order[0]]; ctx.lineTo(q.x, q.y); }
        ctx.stroke();
        F.order.forEach((n, k) => {
          const q = F.nodes[n];
          const next = k === F.next && !F.done;
          ctx.fillStyle = q.lit ? '#bfe2ff' : '#ffffff';
          ctx.strokeStyle = next ? AN.CYAN : AN.INK; ctx.lineWidth = next ? 3 : 1.5;
          ctx.beginPath(); ctx.arc(q.x, q.y, next ? 16 + Math.sin(t * 6) * 3 : 13, 0, TAU); ctx.fill(); ctx.stroke();
          ctx.fillStyle = AN.INK; ctx.font = '700 12px ' + AN.FONT_UI; ctx.textAlign = 'center';
          ctx.fillText(String(k + 1), q.x, q.y + 4);
        });
      }
    }
  };
})();
