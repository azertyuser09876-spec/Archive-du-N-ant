/* Le joueur en expédition : statistiques dérivées de l'équipement et des
   pouvoirs, contrôles, tir, corps à corps, esquive, consommables, dégâts. */
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

  const PC = (AN.PlayerCtl = {});

  PC.create = function (x, y) {
    return {
      kind: 'player', team: 'ally', x, y, vx: 0, vy: 0, dvx: 0, dvy: 0, kbx: 0, kby: 0, r: 12, aim: 0, anim: 0,
      hp: 100, maxHp: 100, alive: true, iframes: 0, flash: 0, dashT: 0, dashCd: 0, fireCd: 0, meleeCd: 0,
      slowT: 0, slowAmt: 0, recoil: 0, meleeAnim: 0, supportT: 0, hazardAcc: 0,
    };
  };

  /** Calcule toutes les valeurs dérivées de l'expédition (équipement, pouvoirs, compagnons). */
  PC.computeStats = function (X) {
    const prof = X.profile;
    const L = X.loadout;
    const pw = AN.Profile.powers(prof);
    X.powers = pw;
    const armor = L.armor ? D.GEAR[L.armor] : null;
    const bag = D.GEAR[L.bag] || D.GEAR.sacoche;
    const roles = (role) => X.allies.filter((a) => !a.downed && a.def.roles.includes(role)).length;
    const S = {
      maxHp: 100 + pw.hp,
      // les bienfaits de vitesse s'additionnent, jusqu'à +60 % (1.12)
      speed: 205 * (1 + Math.min(0.6, pw.speed)) * (1 + (armor && armor.speed ? armor.speed : 0)) * (X.world.rule === 'gravite' ? 1.15 : 1),
      armor: Math.min(0.75, (armor ? armor.armor : 0) + pw.armor),
      hazardRes: Math.min(0.9, (armor && armor.hazardRes ? armor.hazardRes : 0) + pw.hazardRes),
      dashCd: 0.9 * (1 - (armor && armor.dashCd ? armor.dashCd : 0)),
      regen: pw.regen,
      ranged: D.GEAR[L.ranged] || D.GEAR.eclat,
      melee: D.GEAR[L.melee] || D.GEAR.lame_neant,
      rangedMul: 1 + pw.rangedDmg,
      meleeMul: 1 + pw.meleeDmg,
      bagCap: bag.cap + roles('porteur') * 8,
      thrust: 2.2 + (armor && armor.thrust ? armor.thrust : 0),
      reveal: 7 + roles('eclaireur') * 3,
    };
    X.S = S;
    const ray = AN.Profile.upgradeValue(prof, 'rayon');
    X.captureThr = ray.thr;
    X.beamMult = ray.mult;
    X.beamRange = ray.range;
    X.captureHelpers = roles('capture');
    X.compDmg = 1 + pw.compDmg;
    X.sightMul = X.world.rule === 'brume' ? 0.65 : X.world.rule === 'nuit' ? 0.85 : 1;
    X.cargoCap = AN.Profile.cargoCap(prof);
    if (AN.Tools) AN.Tools.apply(X);
    const p = X.player;
    const ratio = p.maxHp ? p.hp / p.maxHp : 1;
    p.maxHp = S.maxHp;
    p.hp = Math.min(p.maxHp, Math.max(1, Math.round(p.maxHp * ratio)));
  };

  PC.damage = function (X, dmg, src, opts = {}) {
    const p = X.player;
    if (!p.alive || (p.iframes > 0 && !opts.ignoreIframes) || X.ending || p.hidden) return 0;
    if (AN.debug && X.god) return 0;
    if (X.mount && AN.Mount.absorb(X, dmg, src, opts)) return 0;
    const sh = X.abil && X.abil.buffs;
    if (sh && sh.shield > 0 && sh.shieldHp > 0 && !opts.dot) {
      const taken = Math.min(sh.shieldHp, dmg);
      sh.shieldHp -= taken;
      dmg -= taken;
      FX.ring(p.x, p.y, '#b8863b', 26, 18, 0.25, 3);
      if (sh.shieldHp <= 0) sh.shield = 0;
      if (dmg <= 0) { p.iframes = 0.2; return 0; }
    }
    let d = dmg * (1 - X.S.armor);
    if (X.tuto) { d = AN.Tutorial.guard(X, d); if (!d) return 0; }
    p.hp -= d;
    p.flash = 0.12;
    if (!opts.dot) p.iframes = 0.32;
    if (src && opts.knock) {
      const a = Math.atan2(p.y - src.y, p.x - src.x);
      p.kbx += Math.cos(a) * opts.knock * 0.6; p.kby += Math.sin(a) * opts.knock * 0.6;
    }
    if (!opts.dot) {
      X.cam.shake(Math.min(10, 3 + d * 0.25));
      AN.Audio.play('hurt', { gap: 0.1 });
      AN.HUD.hurt();
    }
    if (opts.numbers !== false && d >= 1) FX.text(p.x, p.y - 22, '−' + Math.round(d), AN.STAMP, { size: 12, bold: true, life: 0.7 });
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      FX.burst(p.x, p.y, '#ffffff', 40, 260, { size: 4 });
      FX.burst(p.x, p.y, AN.INK, 20, 200, { size: 3 });
      X.onDeath();
    }
    return d;
  };

  function hazardAt(X, p) {
    const tile = Z.tileAt(X.zone, p.x, p.y);
    if (tile === Z.VOID) return { dps: 32, slow: 0.4, void: true };
    if (tile === Z.HAZARD) {
      const b = Z.biomeAt(X.zone, p.x, p.y);
      if (b.hazard && X.mount && AN.Mount.ignoresHazard(X.mount, b)) return null;
      if (b.hazard) return b.hazard;
    }
    return null;
  }

  PC.update = function (X, dt) {
    const p = X.player;
    const S = X.S;
    p.iframes -= dt; p.flash -= dt; p.dashCd -= dt; p.fireCd -= dt; p.meleeCd -= dt; p.slowT -= dt;
    p.recoil = Math.max(0, p.recoil - dt * 8);
    p.meleeAnim = Math.max(0, p.meleeAnim - dt * 5);
    if (!p.alive) { p.dvx = p.dvy = 0; return; }
    const m = AN.Game.mouseWorld();
    p.aim = Math.atan2(m.y - p.y, m.x - p.x);
    if (I.hit('KeyR')) AN.Mount.toggle(X);
    if (p.stunT > 0) { p.stunT -= dt; p.dvx = p.dvy = 0; AN.Physics.move(X.zone, p, dt, false); AN.Mount.update(X, dt); return; }

    // terrain
    const hz = hazardAt(X, p);
    let slow = 0;
    if (hz) {
      slow = hz.slow || 0;
      if (hz.dps) {
        p.hazardAcc += hz.dps * (hz.void ? 1 : 1 - S.hazardRes) * dt;
        if (p.hazardAcc >= 1) { const d = Math.floor(p.hazardAcc); p.hazardAcc -= d; PC.damage(X, d / (1 - X.S.armor), null, { dot: true, numbers: false }); }
        if (Math.random() < dt * 6) FX.add({ kind: 'dot', x: p.x + (Math.random() - 0.5) * 14, y: p.y + 4, vy: -40, color: hz.color || '#ffffff', life: 0.5, size: 2 });
      }
    }
    if (p.slowT > 0) slow = Math.max(slow, p.slowAmt);

    // déplacement et esquive
    const ax = AN.Beyond.inputAxis(X, p, I.axis()); // le Pli : la marche s'inverse par endroits (1.10)
    AN.Cosmic.playerMode(X, p);
    const leaping = AN.Cosmic.leapUpdate(X, p, dt);
    const leapHandled = leaping || AN.Cosmic.leapControl(X, p, dt, ax);
    if (leaping) {
      // en plein saut : la trajectoire est fixée
    } else if (p.dashT > 0) {
      p.dashT -= dt;
      p.dvx = p.dashVx; p.dvy = p.dashVy;
      p.vx = p.dvx; p.vy = p.dvy;
      if (Math.random() < 0.8) FX.add({ kind: 'dot', x: p.x, y: p.y, color: 'rgba(255,255,255,0.8)', life: 0.25, size: 7 });
      if (p.dashT <= 0) p.dashT = 0;
    } else {
      const base = X.mount ? AN.Mount.speed(X.mount) : S.speed;
      const sp = base * (1 - slow) * (X.beam && X.beam.target ? 0.75 : 1) * AN.Beyond.speedMul(X, p);
      p.dvx = ax.x * sp; p.dvy = ax.y * sp;
      const galaxy = AN.Beyond.leaps(X);
      if (((galaxy && !leapHandled && I.up('Space')) || (!galaxy && I.hit('Space'))) && p.dashCd <= 0) {
        const dx = ax.x || Math.cos(p.aim), dy = ax.y || Math.sin(p.aim);
        const l = Math.hypot(dx, dy) || 1;
        const dist = X.world.rule === 'gravite' ? 1.3 : 1;
        p.dashT = 0.17 * dist;
        p.dashVx = (dx / l) * 720; p.dashVy = (dy / l) * 720;
        p.iframes = Math.max(p.iframes, 0.26 * dist);
        p.dashCd = S.dashCd;
        X.stats.dashes = (X.stats.dashes || 0) + 1;
        AN.Audio.play('dash');
      }
    }
    if (!leaping) AN.Cosmic.playerForces(X, p, dt);
    AN.Physics.move(X.zone, p, dt, !!p.leap);
    AN.Mount.update(X, dt);

    const beaming = I.down('KeyF');
    const rage = X.abil && X.abil.buffs.rage > 0 ? 1.4 : 1;
    // tir
    const W = S.ranged;
    if (I.mouseDown(0) && p.fireCd <= 0 && !beaming) {
      p.fireCd = 1 / W.rate;
      X.stats.shots = (X.stats.shots || 0) + 1;
      p.recoil = 1;
      const n = W.count || 1;
      for (let i = 0; i < n; i++) {
        const off = n > 1 ? (i / (n - 1) - 0.5) * W.spread : (Math.random() - 0.5) * W.spread;
        C.shoot(X, { x: p.x + Math.cos(p.aim) * 16, y: p.y + Math.sin(p.aim) * 16, angle: p.aim + off, speed: W.speed * (0.95 + Math.random() * 0.1), dmg: W.dmg * S.rangedMul * rage, team: 'player', size: W.size, color: W.color, range: W.range, pierce: W.pierce, slow: W.slow, explode: W.explode, heavy: W.heavy, owner: p });
      }
      AN.Audio.play('shoot', { weapon: X.loadout.ranged, pitch: 0.92 + Math.random() * 0.16, gap: 0.03 });
    }
    // corps à corps
    const M = S.melee;
    if (X.mount) { if (I.mouseHit(2) || I.mouseDown(2)) AN.Mount.attack(X); }
    else if ((I.mouseHit(2) || I.mouseDown(2)) && p.meleeCd <= 0) {
      p.meleeCd = M.cd;
      X.stats.swings = (X.stats.swings || 0) + 1;
      p.meleeAnim = 1;
      p.meleeA = p.aim;
      AN.Audio.play('melee', { weapon: X.loadout.melee });
      let healed = 0;
      for (const e of X.creatures) {
        if (!e.alive || e.team !== 'wild' || e.hidden) continue;
        const d = U.dist(p.x, p.y, e.x, e.y);
        if (d > M.range + e.r + p.r) continue;
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        if (Math.abs(U.angDiff(p.aim, a)) > M.arc / 2 + Math.atan2(e.r, Math.max(1, d))) continue;
        const dealt = C.hit(X, e, M.dmg * S.meleeMul * rage, p, { knock: M.knock });
        if (M.lifesteal) healed += dealt * M.lifesteal;
        FX.burst(e.x, e.y, '#ffffff', 5, 140, { size: 2.5 });
      }
      if (healed > 0) { p.hp = Math.min(p.maxHp, p.hp + healed); }
    }
    // consommables
    for (let i = 0; i < D.CONSUMABLE_SLOTS; i++) {
      if (I.hit('Digit' + (i + 1)) || I.hit('Numpad' + (i + 1))) PC.useConsumable(X, i);
    }
    // régénération et soins des compagnons de soutien
    if (S.regen) p.hp = Math.min(p.maxHp, p.hp + S.regen * dt);
    p.supportT -= dt;
    if (p.supportT <= 0) {
      p.supportT = 3;
      for (const a of X.allies) {
        if (a.downed || !a.def.roles.includes('soutien')) continue;
        if (U.dist(a.x, a.y, p.x, p.y) > 260 || p.hp >= p.maxHp) continue;
        const h = 3 + a.def.tier * 4;
        p.hp = Math.min(p.maxHp, p.hp + h);
        FX.text(p.x, p.y - 26, '+' + h, '#2a8a4a', { size: 11 });
        FX.stream(a.x, a.y, p.x, p.y, '#5fd08a', { life: 0.5, size: 3 });
      }
    }
  };

  PC.useConsumable = function (X, slot) {
    const c = X.consumables[slot];
    if (!c || c.n <= 0) return;
    const g = D.GEAR[c.id];
    const p = X.player;
    const m = AN.Game.mouseWorld();
    let used = true;
    if (g.heal) {
      if (p.hp >= p.maxHp) { AN.HUD.toast('Points de vie déjà au maximum.'); return; }
      p.hp = Math.min(p.maxHp, p.hp + g.heal);
      FX.text(p.x, p.y - 26, '+' + g.heal, '#2a8a4a', { size: 14, bold: true });
      FX.burst(p.x, p.y, '#5fd08a', 14, 120, { size: 3 });
      AN.Audio.play('harvest');
    } else if (g.decoy) {
      const a = p.aim, d = Math.min(240, U.dist(p.x, p.y, m.x, m.y));
      X.decoy = { kind: 'decoy', team: 'decoy', x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: 10, hp: 1e6, maxHp: 1e6, alive: true, t: g.decoy };
      FX.burst(X.decoy.x, X.decoy.y, '#93c94e', 20, 160, { size: 3 });
    } else if (g.bomb) {
      const a = p.aim, d = Math.min(300, U.dist(p.x, p.y, m.x, m.y));
      const tx = p.x + Math.cos(a) * d, ty = p.y + Math.sin(a) * d;
      FX.stream(p.x, p.y, tx, ty, '#e8582a', { life: 0.55, size: 5 });
      C.telegraph(X, { x: tx, y: ty, r: g.radius, windup: 0.6, dmg: 0, team: 'player', silent: true, onDone: (XX) => C.explode(XX, tx, ty, g.radius, g.bomb, 'player', '#ffb02e', p) });
    } else if (g.anchor) {
      if (!X.collapse) { AN.HUD.toast('L’ancre ne sert que pendant une extraction.'); return; }
      X.collapse.frozen += g.anchor;
      FX.ring(p.x, p.y, AN.CYAN, 20, 300, 1, 4);
      AN.HUD.toast('Effondrement figé pendant ' + g.anchor + ' secondes.');
    } else if (g.gravity) {
      AN.Cosmic.gravityBeacon(X, g);
    } else if (g.net) {
      C.shoot(X, { x: p.x, y: p.y, angle: p.aim, speed: 520, dmg: 0, team: 'player', size: 9, color: '#e8e0f0', range: 360, net: g.net, owner: p });
      AN.Audio.play('melee');
    } else used = false;
    if (used) {
      c.n--;
      AN.HUD.refreshConsumables(X);
    }
  };

  PC.draw = function (ctx, X, t) {
    const p = X.player;
    if (!p.alive || p.hidden || p.liftK > 0) return; // posé ou emporté avec l'hexagone (1.9)
    if (X.mount) AN.Mount.drawRider(ctx, X, t);
    else AN.Art.drawPlayer(ctx, p, t, { weapon: true, weaponColor: X.S.ranged.color });
    const b = X.abil && X.abil.buffs;
    if (b && b.shield > 0 && b.shieldHp > 0) {
      ctx.strokeStyle = U.rgba('#b8863b', 0.6 + Math.sin(t * 8) * 0.2);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 9, 0, TAU); ctx.stroke();
    }
    if (b && b.rage > 0) {
      ctx.strokeStyle = U.rgba('#ff4f7a', 0.5);
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 5, t * 3, t * 3 + TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (p.meleeAnim > 0) {
      const M = X.S.melee;
      const k = 1 - p.meleeAnim;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.meleeA);
      ctx.globalAlpha = p.meleeAnim;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      const R = p.r + M.range * (0.6 + k * 0.4);
      ctx.beginPath(); ctx.arc(0, 0, R, -M.arc / 2 + k * 0.3, M.arc / 2 * (0.2 + k * 0.8)); ctx.stroke();
      ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, R + 3, -M.arc / 2 + k * 0.3, M.arc / 2 * (0.2 + k * 0.8)); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    if (X.decoy && X.decoy.t > 0) {
      const d = X.decoy;
      ctx.fillStyle = '#93c94e';
      ctx.globalAlpha = 0.6 + Math.sin(t * 10) * 0.2;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
})();
