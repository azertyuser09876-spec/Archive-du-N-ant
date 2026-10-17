/* Capacités prêtées par les compagnons (Q, la molette change de capacité)
   et appels stratégiques des géants restés dans l'Archive (G, une fois par expédition). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const C = AN.Combat;
  const I = AN.Input;
  const TAU = Math.PI * 2;

  const Ab = (AN.Abilities = {});

  Ab.setup = function (X) {
    const list = [];
    X.allies.forEach((a) => {
      if (!a.abilityId || a.temp) return;
      const def = D.ABILITIES[a.abilityId];
      list.push({ ally: a, id: a.abilityId, cd: 0, max: def.cd * (a.cdMul || 1) });
    });
    let call = null;
    let sel = X.profile.call && AN.Profile.findCreature(X.profile, X.profile.call);
    // un géant qui accompagne le joueur peut lancer lui-même son appel
    if (!sel) sel = X.profile.companions.map((u) => AN.Profile.findCreature(X.profile, u)).find((c) => c && D.trait(c.species).call) || null;
    if (sel && !sel.lost) {
      const tr = D.trait(sel.species);
      if (tr.call) call = { id: tr.call, species: sel.species, entry: sel, used: false };
    }
    X.abil = { list, idx: 0, call, buffs: { rage: 0, shield: 0, shieldHp: 0, capBoost: 0 }, giants: [] };
  };

  Ab.active = (X) => (X.abil && X.abil.list.length ? X.abil.list[X.abil.idx % X.abil.list.length] : null);

  /** Puissance d'une capacité : rang de l'espèce, niveau et loyauté du compagnon. */
  Ab.power = (slot) => (1 + slot.ally.tier * 0.8) * (slot.ally.powerMul || 1);

  Ab.update = function (X, dt) {
    const A = X.abil;
    if (!A) return;
    A.list.forEach((s) => { s.cd = Math.max(0, s.cd - dt); });
    const b = A.buffs;
    b.rage = Math.max(0, b.rage - dt);
    b.capBoost = Math.max(0, b.capBoost - dt);
    if (b.shield > 0) { b.shield -= dt; if (b.shield <= 0) b.shieldHp = 0; }
    A.giants = A.giants.filter((g) => (g.t += dt) < g.life);
    if (!X.player.alive || X.ending) return;
    if (I.wheel && A.list.length > 1) {
      A.idx = (A.idx + (I.wheel > 0 ? 1 : A.list.length - 1)) % A.list.length;
      AN.Audio.play('ui');
      AN.HUD.refreshAbilities(X);
    }
    if (I.hit('KeyQ')) Ab.use(X, A.idx);
    if (I.hit('KeyG')) Ab.call(X);
  };

  function aimPoint(X, max) {
    const p = X.player;
    const m = AN.Game.mouseWorld();
    const d = Math.min(max, U.dist(p.x, p.y, m.x, m.y));
    return { x: p.x + Math.cos(p.aim) * d, y: p.y + Math.sin(p.aim) * d };
  }
  function enemiesNear(X, x, y, r) {
    return X.creatures.filter((e) => e.alive && e.team === 'wild' && !e.hidden && U.dist(e.x, e.y, x, y) <= r + e.r);
  }

  Ab.use = function (X, i) {
    const A = X.abil;
    if (!A || !A.list.length) { AN.HUD.toast('Aucun compagnon ne vous prête de capacité.'); return; }
    const s = A.list[i % A.list.length];
    const a = s.ally;
    const name = a.nickname || a.def.name;
    if (a.downed) { AN.HUD.toast(name + ' est à terre : sa capacité est indisponible.'); AN.Audio.play('ui_err'); return; }
    if (s.cd > 0) { AN.Audio.play('ui_err', { gap: 0.3 }); return; }
    // Une créature méfiante n'obéit pas toujours.
    if (a.loyalty != null && a.loyalty < 50 && Math.random() < 0.2) {
      s.cd = 2;
      FX.text(a.x, a.y - a.r - 10, 'n’obéit pas', AN.STAMP, { size: 11 });
      return;
    }
    const pw = Ab.power(s);
    const p = X.player;
    const def = D.ABILITIES[s.id];
    let ok = true;
    switch (s.id) {
      case 'vision': {
        AN.Expedition.reveal(X, 24);
        X.visionT = 8;
        FX.ring(p.x, p.y, def.color, 20, 700, 1.2, 4);
        break;
      }
      case 'soin': {
        const h = Math.round(22 * pw);
        p.hp = Math.min(p.maxHp, p.hp + h);
        X.allies.forEach((o) => { if (!o.downed) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.3); });
        FX.text(p.x, p.y - 26, '+' + h, '#2a8a4a', { size: 14, bold: true });
        FX.burst(p.x, p.y, def.color, 22, 160, { size: 3 });
        FX.stream(a.x, a.y, p.x, p.y, def.color, { life: 0.5, size: 4 });
        break;
      }
      case 'arc': {
        const m = aimPoint(X, 520);
        let cur = enemiesNear(X, m.x, m.y, 220).sort((e1, e2) => U.dist(e1.x, e1.y, m.x, m.y) - U.dist(e2.x, e2.y, m.x, m.y))[0];
        if (!cur) { ok = false; AN.HUD.toast('Aucune cible pour l’arc.'); break; }
        let from = { x: a.x, y: a.y };
        const hit = new Set();
        for (let k = 0; k < 4 && cur; k++) {
          zap(from, cur, def.color);
          C.hit(X, cur, 16 * pw, from, { knock: 60 });
          hit.add(cur);
          from = cur;
          cur = enemiesNear(X, cur.x, cur.y, 200).filter((e) => !hit.has(e))[0];
        }
        AN.Audio.play('lightning');
        break;
      }
      case 'nuage': case 'acide': {
        const m = aimPoint(X, 360);
        const col = s.id === 'nuage' ? '#93c94e' : '#aad21e';
        C.pool(X, { x: m.x, y: m.y, r: 70 + pw * 8, dps: (s.id === 'acide' ? 16 : 10) * pw, life: 5, color: col, team: 'player' });
        X.creatures.forEach((e) => { if (e.alive && e.team === 'wild' && U.dist(e.x, e.y, m.x, m.y) < 80) { e.slowT = 3; e.slowAmt = 0.4; } });
        FX.stream(a.x, a.y, m.x, m.y, col, { life: 0.5, size: 6 });
        break;
      }
      case 'toile': case 'gel': {
        const m = aimPoint(X, 380);
        const R = 90 + pw * 10;
        enemiesNear(X, m.x, m.y, R).forEach((e) => {
          e.stunT = Math.max(e.stunT || 0, (e.isBoss ? 0.8 : 3) * (s.id === 'gel' ? 1 : 0.8));
          if (s.id === 'gel') { e.frozenT = e.stunT; C.hit(X, e, 6 * pw, null, {}); }
          e.aggroT = 4;
        });
        FX.ring(m.x, m.y, def.color, 10, R, 0.5, 4);
        FX.burst(m.x, m.y, def.color, 30, 220, { size: 3, kind: s.id === 'gel' ? 'shard' : 'dot' });
        break;
      }
      case 'ruee': {
        const len = 260;
        const ax = Math.cos(p.aim), ay = Math.sin(p.aim);
        const steps = 13;
        const sx = p.x, sy = p.y;
        for (let k = 1; k <= steps; k++) {
          const nx = sx + ax * (len * k) / steps, ny = sy + ay * (len * k) / steps;
          if (Z.solidT(X.zone, Math.floor(nx / Z.T), Math.floor(ny / Z.T))) break;
          p.x = nx; p.y = ny;
        }
        AN.Physics.collide(X.zone, p);
        p.iframes = Math.max(p.iframes, 0.35);
        X.creatures.forEach((e) => {
          if (!e.alive || e.team !== 'wild') return;
          if (C.distToSegment(e.x, e.y, sx, sy, p.x, p.y) < e.r + 26) C.hit(X, e, 22 * pw, { x: sx, y: sy }, { knock: 300 });
        });
        for (let k = 0; k < 14; k++) FX.add({ kind: 'dot', x: U.lerp(sx, p.x, k / 14), y: U.lerp(sy, p.y, k / 14), color: '#ffffff', life: 0.35, size: 7 });
        AN.Audio.play('dash');
        break;
      }
      case 'flammes': {
        for (let k = 0; k < 9; k++) {
          const off = (k / 8 - 0.5) * 0.7;
          C.shoot(X, { x: p.x, y: p.y, angle: p.aim + off, speed: 380 + Math.random() * 80, dmg: 7 * pw, team: 'player', size: 7, color: '#ff7a3a', range: 260, pierce: 2, owner: p });
        }
        AN.Audio.play('shoot_heavy');
        break;
      }
      case 'seisme': {
        const R = 170 + pw * 10;
        enemiesNear(X, p.x, p.y, R).forEach((e) => { C.hit(X, e, 18 * pw, p, { knock: 320 }); e.stunT = Math.max(e.stunT || 0, e.isBoss ? 0.6 : 2); });
        FX.ring(p.x, p.y, def.color, 10, R, 0.5, 8);
        X.cam.shake(9);
        AN.Audio.play('explosion');
        break;
      }
      case 'rage': {
        A.buffs.rage = 6 + pw;
        FX.ring(p.x, p.y, def.color, 30, 10, 0.5, 4);
        AN.Audio.play('boss_roar', { gap: 1 });
        break;
      }
      case 'saut': {
        const m = aimPoint(X, 320);
        if (Z.solidT(X.zone, Math.floor(m.x / Z.T), Math.floor(m.y / Z.T))) { ok = false; AN.HUD.toast('Impossible de se téléporter dans la roche.'); break; }
        FX.burst(p.x, p.y, '#ffffff', 16, 180, { size: 3, kind: 'square' });
        p.x = m.x; p.y = m.y;
        AN.Physics.collide(X.zone, p);
        p.iframes = Math.max(p.iframes, 0.3);
        FX.burst(p.x, p.y, '#ffffff', 16, 180, { size: 3, kind: 'square' });
        AN.Audio.play('portal', { gap: 0.5 });
        break;
      }
      case 'bouclier': {
        A.buffs.shield = 8;
        A.buffs.shieldHp = Math.round(30 * pw);
        FX.ring(p.x, p.y, def.color, 40, 24, 0.4, 4);
        break;
      }
      case 'entrave': {
        const m = aimPoint(X, 420);
        const tg = enemiesNear(X, m.x, m.y, 120).sort((e1, e2) => U.dist(e1.x, e1.y, m.x, m.y) - U.dist(e2.x, e2.y, m.x, m.y))[0];
        if (tg) { tg.stunT = Math.max(tg.stunT || 0, tg.isBoss ? 1.5 : 5); FX.ring(tg.x, tg.y, def.color, tg.r * 2.5, tg.r, 0.4, 3); }
        A.buffs.capBoost = 6;
        FX.text(p.x, p.y - 26, 'capture ×2', AN.CYAN, { size: 12, bold: true });
        break;
      }
      case 'cri': {
        const R = 280;
        enemiesNear(X, p.x, p.y, R).forEach((e) => { if (!e.isBoss) { e.fearT = 4; e.aggroT = 0; } });
        FX.ring(p.x, p.y, def.color, 10, R, 0.6, 6);
        AN.Audio.play('boss_roar', { gap: 1 });
        break;
      }
      case 'essaim': {
        const n = 3 + Math.floor(pw);
        const sp = D.CREATURE.ambrelle;
        for (let k = 0; k < n; k++) {
          const ang = (k / n) * TAU;
          const e = AN.Entities.creature(sp, p.x + Math.cos(ang) * 40, p.y + Math.sin(ang) * 40, { team: 'ally', scale: 1 + pw * 0.4 });
          e.temp = 12; e.temper = 'agressif'; e.noLoot = true;
          X.allies.push(e);
        }
        FX.burst(p.x, p.y, def.color, 20, 160, { size: 3 });
        break;
      }
      case 'rayon': {
        C.laser(X, { owner: p, angle: p.aim, sweep: 0.5, dur: 1.4, windup: 0.25, dps: 60 * pw, width: 18, len: 620, color: def.color, team: 'player' });
        break;
      }
      case 'vague': {
        C.shockwave(X, { x: p.x, y: p.y, r0: 20, speed: 420, max: 420, width: 30, dmg: 20 * pw, team: 'player', color: def.color });
        AN.Audio.play('explosion');
        break;
      }
      default: ok = false;
    }
    if (ok) {
      s.cd = s.max;
      a.attackAnim = 1;
      AN.Audio.play('ui_ok', { gap: 0.1 });
    }
  };

  function zap(a, b, color) {
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      FX.add({ kind: 'dot', x: U.lerp(a.x, b.x, k) + (Math.random() - 0.5) * 12, y: U.lerp(a.y, b.y, k) + (Math.random() - 0.5) * 12, color, life: 0.25, size: 3, glow: true });
    }
  }

  /* ---------- appels stratégiques ---------- */
  Ab.call = function (X) {
    const A = X.abil;
    if (!A || !A.call) { AN.HUD.toast('Aucun appel stratégique préparé. Choisissez un géant de l’Archive avant de partir.'); return; }
    if (A.call.used) { AN.HUD.toast('L’appel a déjà été utilisé pendant cette expédition.'); AN.Audio.play('ui_err'); return; }
    A.call.used = true;
    const p = X.player;
    const def = D.CREATURE[A.call.species];
    const rank = AN.Profile.rank(X.profile).index;
    const pw = (1 + rank * 0.15) * AN.Bonds.powerMul(A.call.entry);
    A.giants.push({ def, entry: A.call.entry, t: 0, life: 3.2, x: p.x, y: p.y - 160 });
    AN.Audio.play('appear');
    X.cam.shake(10);
    const visible = X.creatures.filter((e) => e.alive && e.team === 'wild' && !e.hidden && X.cam.visible(e.x, e.y, 0));
    switch (A.call.id) {
      case 'foret':
        for (let k = 0; k < 22; k++) {
          const a = Math.random() * TAU, r = 60 + Math.random() * 460;
          C.telegraph(X, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 60, windup: 0.6 + Math.random() * 0.8, dmg: 60 * pw, team: 'player', silent: k > 0, color: '#c8f26a' });
        }
        break;
      case 'pluie_feu':
        visible.slice(0, 18).forEach((e, k) => C.telegraph(X, { x: e.x, y: e.y, r: 70, windup: 0.8 + k * 0.06, dmg: 70 * pw, team: 'player', silent: k > 0, color: '#ff641a', follow: e.isBoss ? null : e }));
        for (let k = 0; k < 10; k++) { const a = Math.random() * TAU, r = Math.random() * 420; C.telegraph(X, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 60, windup: 1 + Math.random(), dmg: 60 * pw, team: 'player', silent: true }); }
        break;
      case 'maree':
        C.shockwave(X, { x: p.x, y: p.y, r0: 30, speed: 520, max: 1100, width: 60, dmg: 55 * pw, team: 'player', color: '#7fe0ff' });
        setTimeout(() => { if (AN.X === X) C.shockwave(X, { x: p.x, y: p.y, r0: 30, speed: 480, max: 1000, width: 50, dmg: 40 * pw, team: 'player', color: '#ffffff' }); }, 450);
        break;
      case 'frappe':
        visible.slice(0, 16).forEach((e, k) => C.telegraph(X, { x: e.x, y: e.y, r: 54, windup: 0.7 + k * 0.08, dmg: 85 * pw, team: 'player', silent: k > 0, color: '#ffb347', follow: e }));
        break;
      default:
        if (AN.Cosmic && AN.Cosmic.call) AN.Cosmic.call(X, A.call.id, pw, visible);
    }
    AN.HUD.toast('Appel : ' + D.CALLS[A.call.id].name + ' (' + def.name + ').', 3);
    AN.HUD.refreshAbilities(X);
  };

  /** Le géant appelé apparaît brièvement au-dessus de la scène. */
  Ab.drawGiants = function (ctx, X, t) {
    if (!X.abil) return;
    for (const g of X.abil.giants) {
      const k = g.t / g.life;
      const a = k < 0.2 ? k / 0.2 : k > 0.75 ? (1 - k) / 0.25 : 1;
      const e = { def: g.def, x: g.x, y: g.y - (1 - a) * 40, r: Math.min(220, g.def.r * 1.4), face: Math.PI / 2, anim: t * 2, seed: 1, pal: AN.Art.palette(g.def, g.entry.variant, g.entry.hueSeed), vx: 0, vy: 0, flash: 0, alpha: 0.55 * a };
      AN.Art.draw(ctx, e, t, { glow: true });
    }
  };
})();
