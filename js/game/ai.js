/* Comportements des créatures, construits à partir de composants partagés :
   tempérament, mode de déplacement et type d'attaque. Le même code anime les
   créatures sauvages et les compagnons du joueur. */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const C = AN.Combat;
  const TAU = Math.PI * 2;

  const AI = (AN.AI = {});

  function steerTo(X, e, tx, ty, speed, useFlow) {
    let dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const flow = e.flowTo || X.flow; // vers l'hexagone, le champ de flux qui y mène (1.9)
    if (useFlow && flow && d > 70 && !Z.los(X.zone, e.x, e.y, tx, ty)) {
      const f = AN.Physics.flowDir(X.zone, flow, e.x, e.y);
      if (f) { dx = f.x; dy = f.y; }
    }
    e.dvx = dx * speed; e.dvy = dy * speed;
  }
  function flee(X, e, from, speed) {
    let dx = e.x - from.x, dy = e.y - from.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    // évite de foncer dans un mur
    const ahead = Z.tileAt(X.zone, e.x + dx * 40, e.y + dy * 40);
    if (Z.isSolid(ahead)) {
      const side = (e.seed % 2 > 1 ? 1 : -1);
      const a = Math.atan2(dy, dx) + side * 1.3;
      dx = Math.cos(a); dy = Math.sin(a);
    }
    e.dvx = dx * speed; e.dvy = dy * speed;
  }
  function wander(X, e, dt, speed, radius = 140) {
    e.wanderT -= dt;
    if (!e.wanderTo || e.wanderT <= 0) {
      const a = Math.random() * TAU, r = Math.random() * radius;
      e.wanderTo = { x: e.home.x + Math.cos(a) * r, y: e.home.y + Math.sin(a) * r };
      e.wanderT = 2 + Math.random() * 3;
      e.idleT = Math.random() < 0.4 ? 1 + Math.random() * 2 : 0;
    }
    if (e.idleT > 0) { e.idleT -= dt; e.dvx = e.dvy = 0; return; }
    if (U.dist(e.x, e.y, e.wanderTo.x, e.wanderTo.y) < 10) { e.dvx = e.dvy = 0; return; }
    steerTo(X, e, e.wanderTo.x, e.wanderTo.y, speed, false);
  }

  /** Effectue l'attaque du composant attack contre une cible. Retourne la distance souhaitée. */
  function attack(X, e, target, dt) {
    const A = e.atk;
    e.flowTo = target.kind === 'base' && X.base ? X.base.flow : null;
    const d = U.dist(e.x, e.y, target.x, target.y);
    const team = e.team === 'ally' || e.team === 'civil' ? 'player' : 'wild'; // les gardes d'une ville (1.13) frappent les bêtes
    const sp = e.speed * (e.slowT > 0 ? 1 - e.slowAmt : 1);
    e.face += U.angDiff(e.face, Math.atan2(target.y - e.y, target.x - e.x)) * Math.min(1, dt * 8);
    const dmg = (A ? A.dmg : 0) * e.dmgMul * (e.team === 'ally' ? X.compDmg : 1);
    if (!A) { steerTo(X, e, target.x, target.y, sp, true); return; }
    switch (A.type) {
      case 'bite': {
        const reach = e.r + target.r + 6;
        if (d > reach) steerTo(X, e, target.x, target.y, sp, true);
        else { e.dvx *= 0.3; e.dvy *= 0.3; }
        if (d <= reach + 4 && e.atkCd <= 0) {
          e.atkCd = A.cd;
          e.attackAnim = 1;
          C.hit(X, target, dmg, e, { knock: 120 });
          const a = Math.atan2(target.y - e.y, target.x - e.x);
          e.kbx += Math.cos(a) * 80; e.kby += Math.sin(a) * 80;
        }
        break;
      }
      case 'shoot': case 'spit': case 'zap': {
        const range = A.range || (A.type === 'zap' ? 46 : 280);
        const want = A.type === 'zap' ? range * 0.7 : range * 0.6;
        if (d > want + 30 || !Z.los(X.zone, e.x, e.y, target.x, target.y)) steerTo(X, e, target.x, target.y, sp, true);
        else if (d < want - 60) flee(X, e, target, sp * 0.7);
        else {
          const a = Math.atan2(target.y - e.y, target.x - e.x) + Math.PI / 2;
          const s = Math.sin(X.time * 0.8 + e.seed) > 0 ? 1 : -1;
          e.dvx = Math.cos(a) * sp * 0.4 * s; e.dvy = Math.sin(a) * sp * 0.4 * s;
        }
        if (d <= range && e.atkCd <= 0 && Z.los(X.zone, e.x, e.y, target.x, target.y)) {
          e.atkCd = A.cd * (0.85 + Math.random() * 0.3);
          const ang = Math.atan2(target.y - e.y, target.x - e.x);
          if (A.type === 'zap') {
            C.hit(X, target, dmg, e, { knock: 60 });
            zapFx(e.x, e.y, target.x, target.y, e.pal.glow || e.pal.accent);
          } else if (A.type === 'spit') {
            const tx = target.x + (target.vx || 0) * 0.4, ty = target.y + (target.vy || 0) * 0.4;
            C.telegraph(X, { x: tx, y: ty, r: A.radius, windup: 0.7, dmg: dmg * 0.6, team, color: A.color, silent: true,
              onDone: (XX) => C.pool(XX, { x: tx, y: ty, r: A.radius, dps: dmg, life: A.life, color: A.color, team }) });
            FX.stream(e.x, e.y, tx, ty, A.color, { life: 0.7, size: 5 });
          } else {
            const n = A.count || 1;
            for (let i = 0; i < n; i++) {
              const off = n > 1 ? (i / (n - 1) - 0.5) * (A.spread || 0) : 0;
              C.shoot(X, { x: e.x, y: e.y, angle: ang + off, speed: A.speed, dmg, team, size: A.size, color: A.color, range: range * 1.3, slow: A.slow, owner: e });
            }
            AN.Audio.play('enemy_shoot', { gap: 0.08, at: e });
          }
        }
        break;
      }
      case 'charge': {
        if (e.chargeT > 0) {
          e.chargeT -= dt;
          e.dvx = Math.cos(e.chargeA) * A.speed; e.dvy = Math.sin(e.chargeA) * A.speed;
          e.vx = e.dvx; e.vy = e.dvy;
          if (!e.chargeHit && d <= e.r + target.r + 4) {
            e.chargeHit = true;
            C.hit(X, target, dmg, e, { knock: 340 });
          }
          if (e.chargeT <= 0) e.atkCd = A.cd;
          break;
        }
        if (e.windup > 0) {
          e.windup -= dt;
          e.dvx = e.dvy = 0;
          if (e.windup <= 0) { e.chargeT = (A.dist || 260) / A.speed; e.chargeHit = false; }
          break;
        }
        if (d < (A.dist || 260) * 0.9 && e.atkCd <= 0 && Z.los(X.zone, e.x, e.y, target.x, target.y)) {
          e.windup = A.windup;
          e.chargeA = Math.atan2(target.y - e.y, target.x - e.x);
          e.face = e.chargeA;
          C.telegraph(X, { kind: 'line', x: e.x, y: e.y, angle: e.chargeA, len: A.dist || 260, width: e.r * 2, windup: A.windup, dmg: 0, team, silent: true });
        } else steerTo(X, e, target.x, target.y, sp, true);
        break;
      }
      case 'slam': {
        if (e.windup > 0) {
          e.windup -= dt; e.dvx = e.dvy = 0;
          if (e.windup <= 0) { e.atkCd = A.cd; X.cam.shake(4); }
          break;
        }
        if (d < A.radius * 0.8 && e.atkCd <= 0) {
          e.windup = A.windup;
          C.telegraph(X, { x: e.x, y: e.y, r: A.radius, windup: A.windup, dmg, team, follow: e });
        } else steerTo(X, e, target.x, target.y, sp, true);
        break;
      }
      default: steerTo(X, e, target.x, target.y, sp, true);
    }
  }
  AI.attack = attack;

  function zapFx(x1, y1, x2, y2, color) {
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      FX.add({ kind: 'dot', x: U.lerp(x1, x2, k) + (Math.random() - 0.5) * 10, y: U.lerp(y1, y2, k) + (Math.random() - 0.5) * 10, color, life: 0.18, size: 2.5, glow: true });
    }
  }

  /** Cible la plus proche pour une créature sauvage : joueur, compagnon ou leurre. */
  function pickTarget(X, e) {
    if (X.decoy && X.decoy.t > 0 && U.dist(e.x, e.y, X.decoy.x, X.decoy.y) < 420) return X.decoy;
    // Habitants exposés (rassemblement, arche) : des proies pour les bêtes.
    if (X.civils.length && !e.def.npc) {
      let prey = null, pd = e.arkHunter ? 900 : 240;
      for (const c of X.civils) {
        if (!c.alive || !c.exposed) continue;
        const d = U.dist(e.x, e.y, c.x, c.y) - (c.kind === 'ark' && e.arkHunter ? 400 : 0);
        if (d < pd) { pd = d; prey = c; }
      }
      if (prey) {
        const pl = X.player;
        if (!pl.alive || U.dist(e.x, e.y, pl.x, pl.y) > pd + 60 || e.arkHunter) return prey;
      }
    }
    if (e.target && e.target.alive && !e.target.downed && (e.target.team === 'ally' || (e.target.team === 'civil' && e.target.exposed)) && U.dist(e.x, e.y, e.target.x, e.target.y) < 500) return e.target;
    // raid sur une ville (1.13) : les bêtes marchent sur ses habitants, sauf si l'on se met en travers
    if (e.cityRaid) {
      let prey = null, pd = 1e9;
      for (const c of X.civils) {
        if (!c.alive || !c.exposed || !c.npc || !c.npc.nation) continue;
        const d = U.dist(e.x, e.y, c.x, c.y);
        if (d < pd) { pd = d; prey = c; }
      }
      const pl = X.player;
      if (prey && (!pl.alive || U.dist(e.x, e.y, pl.x, pl.y) > Math.min(pd, 200))) return prey;
    }
    let best = X.player.alive ? X.player : null;
    let bd = best ? U.dist(e.x, e.y, best.x, best.y) : 1e9;
    for (const a of X.allies) {
      if (!a.alive || a.downed) continue;
      const d = U.dist(e.x, e.y, a.x, a.y);
      if (d < bd * 0.7) { best = a; bd = d; }
    }
    if (X.base && AN.Base) best = AN.Base.pick(X, e, best, bd);
    return best;
  }

  AI.wild = function (X, e, dt) {
    e.flowTo = null;
    if (e.fearT > 0 && X.player.alive) { flee(X, e, X.player, e.speed * 1.1); return; }
    const tgt = pickTarget(X, e);
    if (!tgt) { wander(X, e, dt, e.speed * 0.35); return; }
    const d = U.dist(e.x, e.y, tgt.x, tgt.y);
    const sight = 270 * X.sightMul * (e.def.traits.includes('lure') ? 1.2 : 1);
    const sp = e.speed * (e.slowT > 0 ? 1 - e.slowAmt : 1);

    // Effondrement : les petites créatures paniquent et se réfugient près du portail.
    if (X.collapse && e.panic) {
      const pl = X.collapse.plate;
      const dd = U.dist(e.x, e.y, pl.x, pl.y);
      if (dd > 150) steerTo(X, e, pl.x, pl.y, sp * 1.15, true);
      else { e.home = { x: pl.x, y: pl.y }; wander(X, e, dt, sp * 0.6, 140); }
      return;
    }

    // Créature enfouie : attend ou se déplace sous terre.
    if (e.move === 'burrow') {
      if (e.hidden) {
        e.dvx = e.dvy = 0;
        if (e.temper === 'agressif' && d < 130) {
          e.hidden = false; e.atkCd = 0.2;
          FX.burst(e.x, e.y, e.pal.dark, 12, 140, { size: 3 });
          AN.Audio.play('melee');
        } else if (e.temper !== 'agressif') {
          e.burrowT = (e.burrowT || 0) - dt;
          flee(X, e, tgt, sp * 1.2);
          if (e.burrowT <= 0) { e.hidden = false; FX.burst(e.x, e.y, e.pal.dark, 8, 100, { size: 2 }); }
        }
        return;
      }
      if (e.temper !== 'agressif' && (e.aggroT > 0 || d < 110) && !e.weak && Math.random() < dt * 2) {
        e.hidden = true; e.burrowT = 2.2;
        FX.burst(e.x, e.y, e.pal.dark, 8, 100, { size: 2 });
        return;
      }
    }
    // Clignement (téléportation courte).
    if (e.move === 'blink') {
      e.blinkCd -= dt;
      if (e.blinkCd <= 0 && d < 400) {
        e.blinkCd = 2.5 + Math.random() * 3;
        const fleeing = e.temper === 'craintif' || e.weak;
        const a = fleeing ? Math.atan2(e.y - tgt.y, e.x - tgt.x) + (Math.random() - 0.5) : Math.random() * TAU;
        const dist = fleeing ? 140 : 90 + Math.random() * 100;
        const nx = (fleeing ? e.x : tgt.x) + Math.cos(a) * dist, ny = (fleeing ? e.y : tgt.y) + Math.sin(a) * dist;
        if (!Z.isSolid(Z.tileAt(X.zone, nx, ny))) {
          FX.burst(e.x, e.y, e.pal.body, 10, 120, { size: 2.5, kind: 'square' });
          e.x = nx; e.y = ny;
          FX.burst(e.x, e.y, e.pal.body, 10, 120, { size: 2.5, kind: 'square' });
        }
      }
    }

    let mode = 'wander';
    if (e.weak) mode = d < 260 ? 'flee' : 'wander';
    else if (e.frenzy) mode = 'attack';
    else {
      switch (e.temper) {
        case 'passif': mode = e.aggroT > 0 ? 'flee' : 'wander'; break;
        case 'craintif':
          if (e.aggroT > 0 && e.atk && d < 70) mode = 'attack';
          else if (d < 160 * X.sightMul || e.aggroT > 0) mode = 'flee';
          break;
        case 'territorial':
          if (e.aggroT > 0 || (U.dist(tgt.x, tgt.y, e.home.x, e.home.y) < 170 && d < sight)) mode = d < 520 ? 'attack' : 'return';
          else if (U.dist(e.x, e.y, e.home.x, e.home.y) > 220) mode = 'return';
          break;
        case 'agressif':
          if (e.aggroT > 0 || (d < sight && (e.state === 'attack' || Z.los(X.zone, e.x, e.y, tgt.x, tgt.y)))) mode = d < 640 ? 'attack' : 'wander';
          break;
      }
    }
    if (mode === 'attack' && !e.atk) mode = 'flee';
    // elle vous a remarqué : un cri, propre à sa forme (1.8)
    if (mode === 'attack' && e.state !== 'attack' && e.team === 'wild' && !e.def.npc && (e.cryT || 0) <= X.time) { e.cryT = X.time + 6; AN.Audio.cry(e, 'aggro'); }
    e.state = mode;
    switch (mode) {
      case 'flee': flee(X, e, tgt, sp * (e.weak ? 0.78 : 1)); break;
      case 'attack': attack(X, e, tgt, dt); break;
      case 'return': steerTo(X, e, e.home.x, e.home.y, sp * 0.7, false); break;
      default: wander(X, e, dt, sp * 0.35);
    }
    // Les créatures capturées par le rayon se débattent mais ralentissent.
    if (e.captureT > 0) { e.dvx *= 0.45; e.dvy *= 0.45; }
    if (e.def.traits.includes('acidtrail') && Math.random() < dt * 0.8) C.pool(X, { x: e.x, y: e.y, r: 18, dps: 5, life: 3, color: '#aad21e', team: 'wild' });
    if (e.def.traits.includes('heal') && Math.random() < dt * 0.5) {
      for (const o of X.creatures) {
        if (o !== e && o.alive && o.team === 'wild' && !o.isBoss && U.dist(o.x, o.y, e.x, e.y) < 90 && o.hp < o.maxHp && !o.weak) {
          o.hp = Math.min(o.maxHp, o.hp + 4);
          FX.text(o.x, o.y - o.r - 6, '+4', '#2a8a4a', { size: 10, life: 0.6 });
        }
      }
    }
  };

  /** Compagnon : suit le joueur et attaque ce qui le menace, en épargnant les créatures affaiblies. */
  AI.ally = function (X, e, dt) {
    const p = X.player;
    if (e.downed) { e.dvx = e.dvy = 0; return; }
    // Une créature méfiante se laisse parfois distraire.
    if (e.loyalty != null && e.loyalty < 50 && !e.temp) {
      if (e.distractT > 0) { e.distractT -= dt; wander(X, e, dt, e.speed * 0.4, 120); return; }
      if (Math.random() < dt * 0.05) { e.distractT = 2 + Math.random() * 2; e.home = { x: e.x, y: e.y }; }
    }
    const sp = e.speed * 1.05;
    const dp = U.dist(e.x, e.y, p.x, p.y);
    if (dp > 720) {
      const a = Math.random() * TAU;
      e.x = p.x + Math.cos(a) * 50; e.y = p.y + Math.sin(a) * 50;
      AN.Physics.collide(X.zone, e);
      return;
    }
    let enemy = null, bd = 1e9;
    if (e.atk) {
      const capT = X.beam && X.beam.target;
      for (const c of X.creatures) {
        if (!c.alive || c.team !== 'wild' || c.hidden || c.weak || c === capT || c.herd || c.reflection || (c.echo && c.temper !== 'territorial')) continue;
        if (c.def.npc && !c.fighter && c.npc && c.npc.mode !== 'thief' && c.npc.mode !== 'zealot') continue; // les compagnons ne s'en prennent pas aux habitants qui fuient
        if (c.boss && (c.boss.exhausted || !c.boss.active)) continue;
        if (!c.isBoss && c.state !== 'attack' && c.aggroT <= 0) continue;
        const d = U.dist(c.x, c.y, p.x, p.y);
        if (d < 300 && d < bd) { bd = d; enemy = c; }
      }
    }
    if (enemy && dp < 420) { e.state = 'attack'; attack(X, e, enemy, dt); return; }
    e.state = 'follow';
    if (dp > 95) steerTo(X, e, p.x, p.y, Math.min(sp * 1.4, sp + dp), true);
    else {
      e.home = { x: p.x, y: p.y };
      wander(X, e, dt, sp * 0.3, 60);
    }
  };

  AI.update = function (X, e, dt) {
    if (!e.alive) return;
    if (e.fixed) { e.flash -= dt; e.anim += dt; return; }
    if (e.ridden) { e.flash -= dt; e.attackAnim = Math.max(0, (e.attackAnim || 0) - dt * 3); return; }
    if (e.captive) { e.anim += dt * 0.5; return; }
    if (e.temp) { e.temp -= dt; if (e.temp <= 0) { e.alive = false; FX.burst(e.x, e.y, e.pal.body, 6, 80); return; } }
    e.atkCd -= dt; e.flash -= dt; e.stunT -= dt; e.slowT -= dt; e.aggroT -= dt;
    if (e.fearT > 0) e.fearT -= dt;
    if (e.frozenT > 0) e.frozenT -= dt;
    e.attackAnim = Math.max(0, (e.attackAnim || 0) - dt * 3);
    if (e.captureT > 0) e.captureT -= dt;
    if (e.stunT > 0) { e.dvx = e.dvy = 0; }
    else if (e.npc && e.npc.role === 'leader' && e.weak && e.team === 'wild' && X.civ && X.civ.attitude === 'hostiles') { e.dvx = e.dvy = 0; e.kneel = true; }
    else if (e.npc && e.npc.sovereign && e.weak && e.team === 'wild') { e.dvx = e.dvy = 0; e.kneel = true; } // souverain vaincu (1.12)
    else if (e.npc && e.npc.nation && e.team === 'civil' && AN.Nations.defend(X, e, dt)) { /* les gardes défendent leur ville (1.13) */ }
    else if (e.def.npc && !e.fighter) AN.Civ.ai(X, e, dt);
    else if (e.boss) AN.Boss.update(X, e, dt);
    else if (e.guard) AN.Base.guardAI(X, e, dt);
    else if (e.team === 'ally') AI.ally(X, e, dt);
    else AI.wild(X, e, dt);
    const flies = e.move === 'fly' || (e.boss && e.boss.underground);
    if (X.zone.filaments) { const k = AN.Beyond.speedMul(X, e); e.dvx *= k; e.dvy *= k; } // la Toile (1.10)
    AN.Physics.move(X.zone, e, dt, flies);
    // Chute dans le vide pendant l'effondrement.
    if (X.collapse && Z.tileAt(X.zone, e.x, e.y) === Z.VOID && !flies) {
      if (e.guard && X.base) {
        e.x = X.base.x + (Math.random() - 0.5) * 80; e.y = X.base.y + (Math.random() - 0.5) * 80;
      } else if (e.team === 'ally') {
        e.x = X.collapse.plate.x + (Math.random() - 0.5) * 60; e.y = X.collapse.plate.y + (Math.random() - 0.5) * 60;
      } else if (!e.isBoss) {
        e.alive = false; e.noLoot = true;
        FX.burst(e.x, e.y, e.pal.body, 10, 80, { size: 3, kind: 'square' });
      }
    }
  };
})();
