/* Gardiens et ultra-boss : phases successives faites de motifs d'attaque
   réutilisables, épuisement final, capture spéciale ou coup de grâce. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const C = AN.Combat;
  const TAU = Math.PI * 2;

  const B = (AN.Boss = {});

  B.init = function (e, opts) {
    e.boss = {
      phase: 0, active: false, cd: 1.6, busy: 0, patIdx: 0, invuln: 0,
      exhausted: false, exhaustT: 0, pulseT: 0, underground: false, contactCd: 0,
      arena: opts.arena, zoneIndex: opts.zoneIndex, guardian: !!opts.guardian, errant: !!opts.errant,
      current: null, summoned: [],
    };
    e.temper = 'agressif';
    return e;
  };

  B.phaseDef = (e) => e.def.phases[e.boss.phase];

  B.wake = function (X, e) {
    const b = e.boss;
    if (b.active) return;
    b.active = true;
    b.cd = 1.2;
    AN.Audio.play('boss_roar', { at: e });
    X.cam.shake(10);
    FX.ring(e.x, e.y, AN.STAMP, e.r, e.r * 4, 0.9, 4);
    AN.HUD.toast((e.def.tier >= 3 ? D.TIERS[e.def.tier].name : 'Gardien') + ' : ' + e.def.name);
    AN.Profile.markSeen(X.profile, e.def.id);
    X.activeBoss = e;
  };

  const PAT = {
    radial(X, e, p) {
      const n = p.n || 12, off = Math.random() * TAU;
      for (let i = 0; i < n; i++) C.shoot(X, { x: e.x, y: e.y, angle: off + (i / n) * TAU, speed: p.speed || 180, dmg: p.dmg * e.dmgMul, team: 'wild', size: p.size || 6, color: p.color, range: 900, owner: e });
      AN.Audio.play('enemy_shoot', { at: e });
      return { busy: 0.45, cd: 1.9 };
    },
    spiral(X, e, p) {
      e.boss.current = { type: 'spiral', t: 0, dur: p.dur || 2.4, emit: 0, rot: Math.random() * TAU, p };
      return { busy: p.dur || 2.4, cd: 1.4 };
    },
    aimed(X, e, p) {
      e.boss.current = { type: 'aimed', t: 0, left: p.bursts || 1, next: 0, p };
      return { busy: (p.bursts || 1) * 0.38 + 0.2, cd: 1.5 };
    },
    charge(X, e, p) {
      const pl = X.player;
      const a = Math.atan2(pl.y - e.y, pl.x - e.x);
      const len = Math.min(520, U.dist(e.x, e.y, pl.x, pl.y) + 160);
      C.telegraph(X, { kind: 'line', x: e.x, y: e.y, angle: a, len, width: e.r * 1.8, windup: p.windup || 0.9, dmg: 0, team: 'wild' });
      e.boss.current = { type: 'charge', t: 0, windup: p.windup || 0.9, a, dur: len / (p.speed || 420), speed: p.speed || 420, hit: false, p };
      return { busy: (p.windup || 0.9) + len / (p.speed || 420) + 0.2, cd: 1.6 };
    },
    slam(X, e, p) {
      C.telegraph(X, { x: e.x, y: e.y, r: p.radius || 120, windup: p.windup || 1, dmg: p.dmg * e.dmgMul, team: 'wild', follow: e,
        onDone: () => { X.cam.shake(9); FX.ring(e.x, e.y, e.pal.accent, e.r, (p.radius || 120) * 1.2, 0.5, 6); } });
      e.boss.current = { type: 'hold', t: 0 };
      return { busy: (p.windup || 1) + 0.3, cd: 1.6 };
    },
    rain(X, e, p) {
      const pl = X.player;
      const n = p.count || 5;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, r = i === 0 ? 0 : 40 + Math.random() * 200;
        const x = pl.x + Math.cos(a) * r + (pl.vx || 0) * 0.3, y = pl.y + Math.sin(a) * r + (pl.vy || 0) * 0.3;
        if (Z.isSolid(Z.tileAt(X.zone, x, y))) continue;
        C.telegraph(X, { x, y, r: p.radius || 50, windup: (p.windup || 1.1) + i * 0.08, dmg: p.dmg * e.dmgMul, team: 'wild', color: p.color, silent: i > 0 });
      }
      return { busy: 0.5, cd: 2.2 };
    },
    summon(X, e, p) {
      const alive = e.boss.summoned.filter((m) => m.alive).length;
      if (alive >= 6) return { busy: 0, cd: 0.2 };
      const def = D.CREATURE[p.species];
      for (let i = 0; i < (p.count || 2); i++) {
        const a = Math.random() * TAU;
        const m = AN.Entities.creature(def, e.x + Math.cos(a) * (e.r + 30), e.y + Math.sin(a) * (e.r + 30), { threat: X.world.threat, rule: X.world.rule });
        m.temper = 'agressif'; m.aggroT = 10; m.noLoot = Math.random() < 0.6; m.home = { x: e.x, y: e.y };
        AN.Physics.collide(X.zone, m);
        X.creatures.push(m);
        e.boss.summoned.push(m);
        FX.burst(m.x, m.y, e.pal.accent, 10, 120, { size: 3 });
      }
      FX.ring(e.x, e.y, e.pal.accent, e.r, e.r * 2, 0.5, 3);
      return { busy: 0.6, cd: 2.4 };
    },
    burrow(X, e, p) {
      e.boss.underground = true;
      e.hidden = true;
      FX.burst(e.x, e.y, e.pal.dark, 24, 200, { size: 4 });
      X.cam.shake(5);
      const pl = X.player;
      const tg = { x: pl.x, y: pl.y };
      e.boss.current = { type: 'burrow', t: 0, windup: p.windup || 1.2, target: tg, p };
      C.telegraph(X, { x: tg.x, y: tg.y, r: p.radius || 90, windup: p.windup || 1.2, dmg: p.dmg * e.dmgMul, team: 'wild', follow: null,
        onDone: (XX, t) => {
          e.x = t.x; e.y = t.y;
          AN.Physics.collide(XX.zone, e);
          e.boss.underground = false; e.hidden = false;
          XX.cam.shake(10);
          FX.burst(e.x, e.y, e.pal.body, 30, 260, { size: 5 });
          if (p.emergeRing) for (let i = 0; i < p.emergeRing; i++) C.shoot(XX, { x: e.x, y: e.y, angle: (i / p.emergeRing) * TAU, speed: 210, dmg: 9 * e.dmgMul, team: 'wild', size: 6, color: e.pal.accent, range: 700, owner: e });
        } });
      e.boss.current.tele = X.telegraphs[X.telegraphs.length - 1];
      return { busy: (p.windup || 1.2) + 0.4, cd: 1.4 };
    },
    laser(X, e, p) {
      const pl = X.player;
      const a = Math.atan2(pl.y - e.y, pl.x - e.x);
      const n = p.beams || 1;
      for (let i = 0; i < n; i++) C.laser(X, { owner: e, angle: a + (i / n) * TAU, sweep: p.sweep || 2.4, dur: p.dur || 2.6, windup: 0.8, dps: p.dmg * e.dmgMul, width: 22, len: 900, color: p.color });
      e.boss.current = { type: 'hold', t: 0 };
      return { busy: 0.8 + (p.dur || 2.6), cd: 1.5 };
    },
    shockwave(X, e, p) {
      e.boss.current = { type: 'waves', t: 0, left: p.count || 1, next: 0, p };
      return { busy: (p.count || 1) * 0.5 + 0.2, cd: 1.9 };
    },
    pools(X, e, p) {
      const pl = X.player;
      for (let i = 0; i < (p.count || 3); i++) {
        const a = Math.random() * TAU, r = 30 + Math.random() * 220;
        const x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r;
        if (Z.isSolid(Z.tileAt(X.zone, x, y))) continue;
        C.telegraph(X, { x, y, r: p.radius || 46, windup: 0.8, dmg: 0, team: 'wild', color: p.color, silent: i > 0,
          onDone: (XX) => C.pool(XX, { x, y, r: p.radius || 46, dps: p.dps * e.dmgMul, life: 5, color: p.color, team: 'wild' }) });
      }
      return { busy: 0.4, cd: 2.4 };
    },
    blink(X, e) {
      const pl = X.player;
      const ar = e.boss.arena;
      for (let k = 0; k < 12; k++) {
        const a = Math.random() * TAU, r = 200 + Math.random() * 120;
        let x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r;
        if (ar && U.dist(x, y, ar.x, ar.y) > ar.r * 1.3) continue;
        if (Z.isSolid(Z.tileAt(X.zone, x, y))) continue;
        FX.burst(e.x, e.y, e.pal.body, 20, 200, { size: 4, kind: 'square' });
        e.x = x; e.y = y;
        AN.Physics.collide(X.zone, e);
        FX.burst(e.x, e.y, e.pal.body, 20, 200, { size: 4, kind: 'square' });
        break;
      }
      return { busy: 0.3, cd: 0.8 };
    },
  };
  B.PATTERNS = PAT;

  function runCurrent(X, e, dt) {
    const cur = e.boss.current;
    if (!cur) return;
    cur.t += dt;
    const p = cur.p || {};
    switch (cur.type) {
      case 'spiral': {
        cur.emit -= dt;
        while (cur.emit <= 0 && cur.t < cur.dur) {
          cur.emit += 0.11;
          const arms = p.arms || 3;
          for (let k = 0; k < arms; k++) C.shoot(X, { x: e.x, y: e.y, angle: cur.rot + (k / arms) * TAU, speed: p.speed || 180, dmg: p.dmg * e.dmgMul, team: 'wild', size: p.size || 5, color: p.color, range: 900, owner: e });
          cur.rot += 0.27;
          AN.Audio.play('enemy_shoot', { gap: 0.1, at: e });
        }
        if (cur.t >= cur.dur) e.boss.current = null;
        e.dvx = e.dvy = 0;
        break;
      }
      case 'aimed': {
        cur.next -= dt;
        if (cur.next <= 0 && cur.left > 0) {
          cur.left--; cur.next = 0.38;
          const pl = X.player;
          const a = Math.atan2(pl.y - e.y, pl.x - e.x);
          const n = p.count || 3;
          for (let i = 0; i < n; i++) {
            const off = n > 1 ? (i / (n - 1) - 0.5) * (p.spread || 0.4) : 0;
            C.shoot(X, { x: e.x + Math.cos(a) * e.r * 0.6, y: e.y + Math.sin(a) * e.r * 0.6, angle: a + off, speed: p.speed || 320, dmg: p.dmg * e.dmgMul, team: 'wild', size: p.size || 5, color: p.color, range: 900, owner: e });
          }
          AN.Audio.play('enemy_shoot', { at: e });
        }
        if (cur.left <= 0 && cur.next <= 0) e.boss.current = null;
        break;
      }
      case 'charge': {
        e.lockFace = true;
        e.face = cur.a;
        if (cur.t < cur.windup) { e.dvx = e.dvy = 0; break; }
        e.dvx = Math.cos(cur.a) * cur.speed; e.dvy = Math.sin(cur.a) * cur.speed;
        e.vx = e.dvx; e.vy = e.dvy;
        const pl = X.player;
        if (!cur.hit && U.dist(e.x, e.y, pl.x, pl.y) < e.r + pl.r + 4) { cur.hit = true; C.hit(X, pl, p.dmg * e.dmgMul, e, { knock: 420 }); }
        if (cur.t >= cur.windup + cur.dur || AN.Physics.collide(X.zone, e)) {
          if (cur.t >= cur.windup + 0.1) { X.cam.shake(5); e.boss.current = null; e.lockFace = false; e.vx *= 0.2; e.vy *= 0.2; }
        }
        break;
      }
      case 'burrow': {
        const tele = cur.tele;
        if (tele && cur.t < cur.windup * 0.6) { tele.x = X.player.x; tele.y = X.player.y; cur.target.x = tele.x; cur.target.y = tele.y; }
        const tx = cur.target.x, ty = cur.target.y;
        e.dvx = (tx - e.x) * 2; e.dvy = (ty - e.y) * 2;
        if (cur.t > cur.windup + 0.3) e.boss.current = null;
        break;
      }
      case 'waves': {
        cur.next -= dt;
        e.dvx = e.dvy = 0;
        if (cur.next <= 0 && cur.left > 0) {
          cur.left--; cur.next = 0.5;
          C.shockwave(X, { x: e.x, y: e.y, r0: e.r, speed: p.speed || 240, max: 620, width: 26, dmg: p.dmg * e.dmgMul, team: 'wild', color: e.pal.accent });
          X.cam.shake(4);
          AN.Audio.play('explosion', { gap: 0.2 });
        }
        if (cur.left <= 0 && cur.next <= 0) e.boss.current = null;
        break;
      }
      case 'hold': e.dvx = e.dvy = 0; break;
      default:
        if (B.EXTRA && B.EXTRA[cur.type]) B.EXTRA[cur.type](X, e, cur, dt);
        else e.boss.current = null;
    }
  }

  B.update = function (X, e, dt) {
    const b = e.boss;
    const pl = X.player;
    b.contactCd -= dt;
    if (!b.active) {
      e.dvx = e.dvy = 0;
      const d = U.dist(pl.x, pl.y, b.arena.x, b.arena.y);
      if (pl.alive && d < b.arena.r * (b.errant ? 1 : 0.85)) B.wake(X, e);
      return;
    }
    if (b.exhausted) {
      e.dvx = e.dvy = 0;
      b.exhaustT -= dt;
      b.pulseT -= dt;
      if (b.pulseT <= 0) {
        b.pulseT = 2.2;
        C.shockwave(X, { x: e.x, y: e.y, r0: e.r, speed: 230, max: 420, width: 22, dmg: 8 * e.dmgMul, team: 'wild', color: e.pal.accent });
      }
      if (b.exhaustT <= 0) {
        b.exhausted = false;
        e.hp = e.maxHp * 0.25;
        e.capture = 0;
        AN.Audio.play('boss_roar', { at: e });
        AN.HUD.toast(e.def.name + ' se relève.');
        if (AN.Cosmic) AN.Cosmic.onRecover(X, e);
        FX.ring(e.x, e.y, AN.STAMP, e.r, e.r * 3, 0.7, 4);
      }
      return;
    }
    if (b.invuln > 0) { b.invuln -= dt; e.dvx = e.dvy = 0; return; }

    // Laisse : un gardien ne quitte pas son arène.
    if (b.arena && !b.errant && U.dist(pl.x, pl.y, b.arena.x, b.arena.y) > b.arena.r + 520) {
      b.active = false;
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3);
      e.x = b.arena.x; e.y = b.arena.y;
      b.current = null; e.lockFace = false;
      X.activeBoss = null;
      AN.HUD.toast(e.def.name + ' retourne au centre de son territoire.');
      return;
    }

    // Changement de phase
    const phases = e.def.phases;
    const next = phases[b.phase + 1];
    if (next && e.hp / e.maxHp <= next.at) {
      b.phase++;
      b.invuln = 1.3;
      b.current = null;
      b.cd = 0.8;
      e.lockFace = false;
      X.lasers = X.lasers.filter((L) => L.owner !== e);
      AN.Audio.play('boss_roar', { at: e });
      X.cam.shake(12);
      C.shockwave(X, { x: e.x, y: e.y, r0: e.r, speed: 360, max: 380, width: 18, dmg: 0, team: 'wild', color: AN.STAMP });
      FX.burst(e.x, e.y, e.pal.accent, 40, 300, { size: 4 });
      AN.HUD.toast(e.def.name + ' : phase ' + (b.phase + 1) + ' sur ' + phases.length);
      return;
    }

    const ph = phases[b.phase];
    // Déplacement : garde une distance moyenne en tournant autour du joueur.
    if (!b.current || b.current.type === 'aimed') {
      const d = U.dist(e.x, e.y, pl.x, pl.y);
      const want = 170 + e.r;
      const a = Math.atan2(pl.y - e.y, pl.x - e.x);
      const orbit = a + Math.PI / 2 * (Math.sin(X.time * 0.4 + e.seed) > 0 ? 1 : -1);
      let vx = Math.cos(orbit) * 0.6, vy = Math.sin(orbit) * 0.6;
      if (d > want + 60) { vx += Math.cos(a); vy += Math.sin(a); }
      else if (d < want - 60) { vx -= Math.cos(a); vy -= Math.sin(a); }
      const l = Math.hypot(vx, vy) || 1;
      const sp = ph.speed * (e.slowT > 0 ? 1 - e.slowAmt * 0.5 : 1);
      e.dvx = (vx / l) * sp; e.dvy = (vy / l) * sp;
      if (b.arena && !b.errant && U.dist(e.x, e.y, b.arena.x, b.arena.y) > b.arena.r * 1.25) {
        const ab = Math.atan2(b.arena.y - e.y, b.arena.x - e.x);
        e.dvx = Math.cos(ab) * sp; e.dvy = Math.sin(ab) * sp;
      }
      e.face += U.angDiff(e.face, a) * Math.min(1, dt * 4);
    }
    runCurrent(X, e, dt);
    if (b.busy > 0) b.busy -= dt;
    else {
      b.cd -= dt;
      if (b.cd <= 0 && !b.current) {
        const pat = ph.patterns[b.patIdx % ph.patterns.length];
        b.patIdx++;
        const res = PAT[pat.type] ? PAT[pat.type](X, e, pat) : { busy: 0, cd: 1 };
        b.busy = res.busy;
        b.cd = res.cd * (1 - b.phase * 0.08);
      }
    }
    // Contact
    if (!b.underground && b.contactCd <= 0 && U.dist(e.x, e.y, pl.x, pl.y) < e.r + pl.r) {
      b.contactCd = 0.9;
      C.hit(X, pl, 10 * e.dmgMul, e, { knock: 320 });
    }
  };

  /** PV à zéro : le boss s'effondre, épuisé. */
  B.onZero = function (X, e) {
    const b = e.boss;
    b.phase = e.def.phases.length - 1;
    b.exhausted = true;
    b.exhaustT = e.def.tier >= 4 ? 36 : e.def.tier >= 3 ? 20 : 14;
    b.pulseT = 1.6;
    b.current = null;
    b.underground = false;
    e.hidden = false;
    e.lockFace = false;
    e.hp = 1;
    X.lasers = X.lasers.filter((L) => L.owner !== e);
    X.telegraphs = X.telegraphs.filter((t) => !t.follow || t.follow !== e);
    AN.Audio.play('boss_roar', { at: e });
    X.cam.shake(14);
    FX.burst(e.x, e.y, e.pal.accent, 50, 320, { size: 5 });
    if (!(AN.Cosmic && AN.Cosmic.onExhausted(X, e))) AN.HUD.toast(e.def.name + ' est épuisé. Maintenez ' + AN.Input.label('KeyF') + ' pour le capturer, ou appuyez sur ' + AN.Input.label('KeyE') + ' à son contact pour l’achever.', 6);
  };

  /** Coup de grâce. */
  B.finish = function (X, e) {
    e.alive = false;
    FX.burst(e.x, e.y, e.pal.body, 80, 420, { size: 6, life: 1 });
    FX.ring(e.x, e.y, e.pal.accent, e.r, e.r * 5, 1.2, 6);
    X.cam.shake(16);
    AN.Audio.play('explosion');
    C.drop(X, e.x, e.y, e.def.drops, 1 + (X.world.threat - 1) * 0.15);
    const bs = AN.Profile.markSeen(X.profile, e.def.id);
    bs.killed = (bs.killed || 0) + 1;
    X.stats.kills++;
    B.defeated(X, e, 'achevé');
  };

  /** Commun à la capture et au coup de grâce : conquête de la zone. */
  B.defeated = function (X, e, how) {
    X.activeBoss = null;
    if (AN.Nations) AN.Nations.onGuardian(X, e); // il menaçait l'une de leurs villes (1.12)
    e.boss.summoned.forEach((m) => { if (m.alive) { m.alive = false; m.noLoot = true; FX.burst(m.x, m.y, m.pal.body, 8, 100); } });
    if (e.boss.errant) { AN.HUD.toast(e.def.name + ' ' + how + '.'); return; }
    X.conquer(e.boss.zoneIndex, e);
  };
})();
