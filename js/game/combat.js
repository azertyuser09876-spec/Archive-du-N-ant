/* Combat : projectiles, dégâts, morts, butin, zones d'effet annoncées,
   flaques, ondes de choc et rayons. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const C = (AN.Combat = {});

  C.reset = (X) => {
    X.projectiles = []; X.telegraphs = []; X.pools = []; X.waves = []; X.lasers = []; X.pickups = X.pickups || [];
  };

  /** Cibles possibles pour une équipe donnée. */
  C.enemiesOf = (X, team) => {
    if (team === 'wild') {
      const out = [];
      if (X.player.alive) out.push(X.player);
      for (const a of X.allies) if (a.alive && !a.downed) out.push(a);
      return out;
    }
    return X.creatures.filter((c) => c.alive && c.team === 'wild' && !c.hidden);
  };
  /** Cibles des créatures sauvages : joueur, compagnons et habitants exposés. */
  const baseEnemies = C.enemiesOf;
  C.enemiesOf = (X, team) => {
    const out = baseEnemies(X, team);
    if (team === 'wild' && X.civils) for (const c of X.civils) if (c.alive && c.exposed) out.push(c);
    return out;
  };

  C.shoot = (X, o) => {
    const p = {
      x: o.x, y: o.y, vx: Math.cos(o.angle) * o.speed, vy: Math.sin(o.angle) * o.speed,
      r: o.size || 4, dmg: o.dmg, team: o.team, color: o.color || '#ffffff', life: o.life || (o.range ? o.range / o.speed : 2),
      pierce: o.pierce || 0, slow: o.slow || 0, explode: o.explode || 0, hits: new Set(), owner: o.owner || null, heavy: !!o.heavy, net: o.net || 0,
    };
    X.projectiles.push(p);
    return p;
  };

  /** Inflige des dégâts à une entité. Retourne les dégâts réellement infligés. */
  C.hit = (X, target, dmg, src, opts = {}) => {
    if (!target || !target.alive || target.hidden) return 0;
    if (target.kind === 'player') return AN.PlayerCtl.damage(X, dmg, src, opts);
    if (target.downed) return 0;
    if (target.boss && (target.boss.invuln > 0 || target.boss.underground)) return 0;
    let d = dmg * (1 - (target.armor || 0));
    if (target.boss && target.boss.exhausted) {
      // épuisé : il ne peut plus tomber, seulement être capturé ou achevé
      d = 0;
    }
    if (d <= 0) return 0;
    target.hp -= d;
    target.flash = 0.09;
    if (src && opts.knock) {
      const a = Math.atan2(target.y - src.y, target.x - src.x);
      const resist = target.isBoss ? 0.12 : target.tier === 1 ? 0.6 : 1;
      target.kbx += Math.cos(a) * opts.knock * resist;
      target.kby += Math.sin(a) * opts.knock * resist;
    }
    if (target.team === 'wild') {
      target.aggroT = 5;
      if (opts.slow) { target.slowT = 2.5; target.slowAmt = opts.slow; }
      if (src && src.team === 'ally') target.target = src;
      if (target.def.traits.includes('puff') && Math.random() < 0.6) C.pool(X, { x: target.x, y: target.y, r: 40, dps: 4, life: 2.5, color: '#93c94e', team: 'wild' });
      if (target.boss && !target.boss.active) AN.Boss.wake(X, target);
    }
    if (opts.numbers !== false && d >= 1) FX.text(target.x + U.lerp(-6, 6, Math.random()), target.y - target.r - 4, Math.round(d), target.team === 'wild' ? AN.INK : AN.STAMP, { size: 11, life: 0.6, vy: -50 });
    AN.Audio.play('hit', { at: target, dmg: d, boss: target.isBoss });
    if (target.team === 'wild' && target.hp > 0 && target.def && !target.def.npc) AN.Audio.cry(target, 'hurt');
    if (target.team === 'wild' && !target.isBoss && !target.weak && target.hp > 0 && target.hp <= target.maxHp * X.captureThr) {
      target.weak = true;
      FX.text(target.x, target.y - target.r - 16, 'affaiblie', AN.CYAN, { size: 12, bold: true });
      FX.ring(target.x, target.y, AN.CYAN, target.r, target.r * 2.2, 0.5, 2);
      AN.Audio.play('weak');
    }
    if (target.hp <= 0) {
      if (target.isBoss && target.team === 'wild') AN.Boss.onZero(X, target);
      else C.kill(X, target, src);
    }
    return d;
  };

  C.kill = (X, e, src) => {
    if (e.kind === 'ark') { AN.Civ.arkDestroyed(X); return; }
    if (e.def && e.def.npc) {
      e.alive = false;
      FX.burst(e.x, e.y, e.pal.body, 12, 140, { size: 3 });
      AN.Audio.play('death', { at: e });
      if (e.team === 'wild' && !e.noLoot) C.drop(X, e.x, e.y, e.def.drops, 1);
      AN.Civ.onKilled(X, e, src);
      return;
    }
    if (src && src.team === 'ally' && src.kind === 'creature' && e.team === 'wild') src.kills = (src.kills || 0) + 1;
    if (e.team === 'ally' && e.temp) { e.alive = false; AN.FX.burst(e.x, e.y, e.pal.body, 8, 100); return; }
    if (e.team === 'ally') {
      e.hp = 0; e.downed = true; e.vx = e.vy = e.dvx = e.dvy = 0;
      FX.text(e.x, e.y - e.r - 10, P_NAME(e) + ' est à terre', AN.STAMP, { size: 12, bold: true, life: 1.6 });
      AN.HUD.toast((e.nickname || e.def.name) + ' est à terre. Maintenez E près de lui pour le relever.');
      return;
    }
    e.alive = false;
    FX.burst(e.x, e.y, e.pal.body, 14 + e.r, 160 + e.r * 4, { size: 3 + e.r * 0.15 });
    FX.burst(e.x, e.y, e.pal.accent, 6, 120, { size: 2.5 });
    AN.Audio.play('death', { at: e });
    AN.Audio.cry(e, 'death');
    if (!e.noLoot) C.drop(X, e.x, e.y, e.def.drops, (e.variant === 'geant' ? 1.6 : 1) * (X.dropMul || 1));
    if (!e.def.fake) {
      X.stats.kills++;
      const b = AN.Profile.markSeen(X.profile, e.def.id);
      b.killed = (b.killed || 0) + 1;
    }
    if (e.def.traits.includes('split') && !e.noLoot) {
      for (let i = 0; i < 2; i++) {
        const g = AN.Entities.creature(D.CREATURE.globule, e.x + (i ? 12 : -12), e.y, { threat: X.world.threat, rule: X.world.rule });
        g.temper = 'agressif';
        X.creatures.push(g);
      }
    }
    if (e.onDeath) e.onDeath(X, e);
  };
  function P_NAME(e) { return e.nickname || e.def.name; }

  /** Fait apparaître des ressources ramassables. */
  C.drop = (X, x, y, drops, mult = 1) => {
    if (!drops) return;
    for (const res in drops) {
      const v = drops[res] * mult;
      const n = v < 1 ? (Math.random() < v ? 1 : 0) : Math.round(v);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = 60 + Math.random() * 120;
        X.pickups.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, res, t: 0 });
      }
    }
  };

  C.explode = (X, x, y, radius, dmg, team, color = '#ffb02e', src = null) => {
    FX.ring(x, y, color, 6, radius, 0.4, 5);
    FX.burst(x, y, color, 22, 260, { size: 4, glow: true });
    AN.Audio.play('explosion', { at: { x, y }, pitch: radius > 120 ? 0.75 : 1 });
    X.cam.shake(6);
    for (const t of C.enemiesOf(X, team)) {
      if (U.dist(x, y, t.x, t.y) <= radius + t.r) C.hit(X, t, dmg, src || { x, y }, { knock: 280 });
    }
  };

  /** Zone d'effet annoncée : cercle (pluie, impact) qui frappe après un délai. */
  C.telegraph = (X, o) => {
    X.telegraphs.push({ kind: o.kind || 'circle', x: o.x, y: o.y, r: o.r, t: 0, windup: o.windup || 1, dmg: o.dmg, team: o.team || 'wild', color: o.color || AN.STAMP, angle: o.angle || 0, len: o.len || 0, width: o.width || 0, follow: o.follow || null, onDone: o.onDone || null, silent: o.silent });
    if (!o.silent) AN.Audio.play('telegraph', { gap: 0.15 });
  };
  C.pool = (X, o) => {
    X.pools.push({ x: o.x, y: o.y, r: o.r, dps: o.dps, life: o.life || 4, t: 0, color: o.color, team: o.team || 'wild', slow: o.slow || 0 });
  };
  C.shockwave = (X, o) => {
    X.waves.push({ x: o.x, y: o.y, r: o.r0 || 10, speed: o.speed || 240, max: o.max || 520, width: o.width || 26, dmg: o.dmg, team: o.team || 'wild', color: o.color || AN.INK, hit: new Set() });
  };
  C.laser = (X, o) => {
    X.lasers.push({ owner: o.owner, angle: o.angle, sweep: o.sweep, dur: o.dur, t: 0, windup: o.windup != null ? o.windup : 0.7, dps: o.dps, width: o.width || 22, len: o.len || 900, color: o.color || '#ffffff', team: o.team || 'wild' });
  };

  C.update = (X, dt) => {
    const zone = X.zone;
    // projectiles
    for (let i = X.projectiles.length - 1; i >= 0; i--) {
      const p = X.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      let dead = p.life <= 0;
      if (!dead && Z.isSolid(Z.tileAt(zone, p.x, p.y))) {
        dead = true;
        FX.burst(p.x, p.y, p.color, 4, 80, { size: 2 });
      }
      if (!dead) {
        for (const t of C.enemiesOf(X, p.team)) {
          if (p.hits.has(t)) continue;
          const rr = p.r + t.r;
          if ((t.x - p.x) ** 2 + (t.y - p.y) ** 2 <= rr * rr) {
            p.hits.add(t);
            if (p.explode) { dead = true; break; }
            if (p.net) {
              if (t.kind !== 'player') { t.stunT = Math.max(t.stunT || 0, p.net * (t.isBoss ? 0.2 : 1)); t.aggroT = 4; }
              FX.ring(t.x, t.y, '#e8e0f0', t.r * 2, t.r, 0.4, 2);
              FX.text(t.x, t.y - t.r - 10, 'immobilisée', AN.INK, { size: 11 });
              dead = true; break;
            }
            C.hit(X, t, p.dmg, p.owner || p, { knock: p.heavy ? 160 : 70, slow: p.slow });
            if (t.kind === 'player' && p.slow) { X.player.slowT = 1.5; X.player.slowAmt = p.slow; }
            if (p.pierce-- <= 0) { dead = true; break; }
          }
        }
      }
      if (dead) {
        if (p.explode) C.explode(X, p.x, p.y, p.explode, p.dmg, p.team, p.color === AN.INK ? '#6a5ad8' : p.color, p.owner);
        X.projectiles.splice(i, 1);
      }
    }
    // zones annoncées
    for (let i = X.telegraphs.length - 1; i >= 0; i--) {
      const t = X.telegraphs[i];
      t.t += dt;
      if (t.follow && t.follow.alive) { t.x = t.follow.x; t.y = t.follow.y; }
      if (t.t >= t.windup) {
        X.telegraphs.splice(i, 1);
        if (t.kind === 'circle') {
          FX.ring(t.x, t.y, t.color, t.r * 0.3, t.r, 0.35, 4);
          FX.burst(t.x, t.y, t.color, 10, 150, { size: 3 });
          for (const e of C.enemiesOf(X, t.team)) if (U.dist(t.x, t.y, e.x, e.y) <= t.r + e.r * 0.5) C.hit(X, e, t.dmg, { x: t.x, y: t.y }, { knock: 200 });
          X.cam.shake(3);
        } else if (t.kind === 'line') {
          for (const e of C.enemiesOf(X, t.team)) {
            if (distToSegment(e.x, e.y, t.x, t.y, t.x + Math.cos(t.angle) * t.len, t.y + Math.sin(t.angle) * t.len) <= t.width / 2 + e.r) C.hit(X, e, t.dmg, { x: t.x, y: t.y }, { knock: 220 });
          }
        }
        if (t.onDone) t.onDone(X, t);
      }
    }
    // flaques
    for (let i = X.pools.length - 1; i >= 0; i--) {
      const pl = X.pools[i];
      pl.t += dt;
      if (pl.t >= pl.life) { X.pools.splice(i, 1); continue; }
      for (const e of C.enemiesOf(X, pl.team)) {
        if (U.dist2(pl.x, pl.y, e.x, e.y) <= pl.r * pl.r) {
          e.dotAcc = (e.dotAcc || 0) + pl.dps * dt;
          if (e.dotAcc >= 1) { const d = Math.floor(e.dotAcc); e.dotAcc -= d; C.hit(X, e, d, null, { numbers: false }); }
        }
      }
    }
    // ondes de choc
    for (let i = X.waves.length - 1; i >= 0; i--) {
      const w = X.waves[i];
      w.r += w.speed * dt;
      if (w.r >= w.max) { X.waves.splice(i, 1); continue; }
      for (const e of C.enemiesOf(X, w.team)) {
        if (w.hit.has(e)) continue;
        const d = U.dist(w.x, w.y, e.x, e.y);
        if (Math.abs(d - w.r) <= w.width / 2 + e.r * 0.5) {
          w.hit.add(e);
          const dealt = C.hit(X, e, w.dmg, { x: w.x, y: w.y }, { knock: 260 });
          if (e.kind === 'player' && dealt > 0) AN.Capture.interrupt(X);
        }
      }
    }
    // rayons
    for (let i = X.lasers.length - 1; i >= 0; i--) {
      const L = X.lasers[i];
      L.t += dt;
      const o = L.owner;
      if (!o || !o.alive || L.t >= L.windup + L.dur) { X.lasers.splice(i, 1); continue; }
      if (L.t < L.windup) continue;
      const k = (L.t - L.windup) / L.dur;
      L.cur = L.angle + (k - 0.5) * L.sweep;
      const ex = o.x + Math.cos(L.cur) * L.len, ey = o.y + Math.sin(L.cur) * L.len;
      for (const e of C.enemiesOf(X, L.team)) {
        if (distToSegment(e.x, e.y, o.x, o.y, ex, ey) <= L.width / 2 + e.r * 0.6) {
          e.dotAcc = (e.dotAcc || 0) + L.dps * dt;
          if (e.dotAcc >= 1) { const d = Math.floor(e.dotAcc); e.dotAcc -= d; C.hit(X, e, d, o, { numbers: false }); }
        }
      }
    }
    // ressources au sol
    const p = X.player;
    for (let i = X.pickups.length - 1; i >= 0; i--) {
      const it = X.pickups[i];
      it.t += dt;
      const dmp = Math.exp(-4 * dt);
      it.vx *= dmp; it.vy *= dmp;
      if (p.alive && it.t > 0.35) {
        const d = U.dist(it.x, it.y, p.x, p.y);
        const room = X.bagFree() > 0;
        if (d < 120 && room) {
          const a = Math.atan2(p.y - it.y, p.x - it.x);
          const s = 420 * (1 - d / 140);
          it.vx += Math.cos(a) * s * dt * 6; it.vy += Math.sin(a) * s * dt * 6;
        }
        if (d < p.r + 8) {
          if (room) {
            X.addToBag(it.res, 1);
            X.pickups.splice(i, 1);
            AN.Audio.play('pickup', { pitch: 1 + D.RESOURCES[it.res].rarity * 0.25 });
            continue;
          } else if (!X.bagWarnT || X.time - X.bagWarnT > 3) {
            X.bagWarnT = X.time;
            AN.HUD.toast('Sac plein. Ouvrez le sac (Tab) pour jeter des ressources moins précieuses.');
          }
        }
      }
      it.x += it.vx * dt; it.y += it.vy * dt;
      if (Z.isSolid(Z.tileAt(zone, it.x, it.y))) { it.x -= it.vx * dt; it.y -= it.vy * dt; it.vx *= -0.4; it.vy *= -0.4; }
    }
  };

  function distToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = U.clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  C.distToSegment = distToSegment;

  /* ---------- dessin ---------- */
  C.drawUnder = (ctx, X, t) => {
    for (const pl of X.pools) {
      const k = pl.t / pl.life;
      const a = k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1;
      ctx.globalAlpha = 0.55 * a;
      ctx.fillStyle = pl.color;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r * (0.9 + Math.sin(t * 3 + pl.x) * 0.05), 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.8 * a;
      ctx.strokeStyle = U.shade(pl.color, 0.3); ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const tg of X.telegraphs) {
      const k = U.clamp(tg.t / tg.windup, 0, 1);
      const tc = tg.team === 'player' ? AN.CYAN : AN.STAMP;
      ctx.strokeStyle = tc;
      ctx.fillStyle = U.rgba(tc, 0.12 + k * 0.18);
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      if (tg.kind === 'circle') {
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = U.rgba(AN.STAMP, 0.3);
        ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.r * k, 0, TAU); ctx.fill();
      } else if (tg.kind === 'line') {
        ctx.save(); ctx.translate(tg.x, tg.y); ctx.rotate(tg.angle);
        ctx.fillRect(0, -tg.width / 2, tg.len, tg.width); ctx.strokeRect(0, -tg.width / 2, tg.len, tg.width);
        ctx.setLineDash([]);
        ctx.fillStyle = U.rgba(AN.STAMP, 0.3); ctx.fillRect(0, -tg.width / 2, tg.len * k, tg.width);
        ctx.restore();
      }
      ctx.setLineDash([]);
    }
    for (const w of X.waves) {
      const k = w.r / w.max;
      ctx.globalAlpha = 0.85 * (1 - k * 0.6);
      ctx.strokeStyle = w.color; ctx.lineWidth = w.width * 0.5;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.r - w.width * 0.25, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };

  C.drawOver = (ctx, X, t) => {
    for (const p of X.projectiles) {
      const sp = Math.hypot(p.vx, p.vy) || 1;
      const tail = Math.min(18, p.r * 3.5);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.r * 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - (p.vx / sp) * tail, p.y - (p.vy / sp) * tail);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.fillStyle = p.team === 'wild' ? '#ffffff' : U.shade(p.color, 0.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, TAU); ctx.fill();
      if (p.team === 'wild') { ctx.strokeStyle = AN.STAMP; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1.5, 0, TAU); ctx.stroke(); }
    }
    for (const L of X.lasers) {
      const o = L.owner;
      if (!o) continue;
      if (L.t < L.windup) {
        const a0 = L.angle - L.sweep / 2;
        ctx.strokeStyle = U.rgba(AN.STAMP, 0.5); ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + Math.cos(a0) * L.len, o.y + Math.sin(a0) * L.len); ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }
      const ex = o.x + Math.cos(L.cur) * L.len, ey = o.y + Math.sin(L.cur) * L.len;
      ctx.lineCap = 'round';
      ctx.strokeStyle = U.rgba(L.color === '#ffffff' ? AN.STAMP : L.color, 0.35); ctx.lineWidth = L.width * 1.6;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = L.color; ctx.lineWidth = L.width * 0.7;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = L.width * 0.25;
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ex, ey); ctx.stroke();
    }
  };

  C.drawPickups = (ctx, X, t) => {
    for (const it of X.pickups) {
      ctx.save();
      ctx.translate(it.x, it.y + Math.sin(t * 4 + it.x) * 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(0, 6, 5, 2.5, 0, 0, TAU); ctx.fill();
      AN.Icons.drawRes(ctx, it.res, 6, t);
      ctx.restore();
    }
  };
})();
