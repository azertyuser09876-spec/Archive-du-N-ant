/* Montures : un compagnon assez grand peut porter le joueur (touche R).
   Il le rend plus rapide, encaisse les coups à sa place et, s'il vole ou
   possède la bonne clé, lui fait traverser les terrains dangereux. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const Mt = (AN.Mount = {});

  Mt.info = (ent) => (ent && ent.def ? D.trait(ent.def.id).mount : null);
  Mt.can = (ent) => !!Mt.info(ent) && !ent.downed && ent.alive !== false;

  /** Vitesse du joueur monté. */
  Mt.speed = function (ent) {
    const m = Mt.info(ent);
    const loy = ent.loyalty == null ? 1 : ent.loyalty >= 80 ? 1.1 : ent.loyalty < 50 ? 0.9 : 1;
    return m.speed * loy;
  };

  /** La monture protège-t-elle du danger de ce biome ? */
  Mt.ignoresHazard = function (ent, biome) {
    const m = Mt.info(ent);
    if (!m) return false;
    if (m.fly) return true;
    const k = D.hazardKey(biome);
    return !!k && (ent.keys || []).includes(k);
  };

  /* ======================= Expédition ======================= */
  Mt.toggle = function (X) {
    if (X.mount) { Mt.dismount(X, false); return; }
    const p = X.player;
    let best = null, bd = 90;
    for (const a of X.allies) {
      if (!Mt.can(a) || a.temp) continue;
      const d = U.dist(a.x, a.y, p.x, p.y) - a.r;
      if (d < bd) { bd = d; best = a; }
    }
    if (!best) {
      const any = X.allies.some((a) => Mt.info(a) && !a.temp);
      AN.HUD.toast(any ? 'Approchez-vous de votre monture pour la chevaucher (R).' : 'Aucun compagnon ne peut vous porter. Les grands prédateurs et certains gardiens le peuvent.');
      return;
    }
    Mt.mount(X, best);
  };

  Mt.mount = function (X, a) {
    const p = X.player;
    X.mount = a;
    a.ridden = true;
    a.dvx = a.dvy = 0;
    p.x = a.x; p.y = a.y;
    p.r = U.clamp(a.r * 0.8, 12, 26);
    AN.Physics.collide(X.zone, p);
    a.x = p.x; a.y = p.y;
    FX.ring(a.x, a.y, AN.CYAN, a.r, a.r * 2.2, 0.4, 2);
    AN.Audio.play('dash');
    if (!X.profile.flags.firstMount) {
      X.profile.flags.firstMount = 1;
      AN.HUD.toast('En selle sur ' + (a.nickname || a.def.name) + '. ' + AN.Input.label('Mouse2') + ' : charge. ' + AN.Input.label('KeyR') + ' : descendre.', 6);
    }
    AN.HUD.mountChanged(X);
  };

  Mt.dismount = function (X, thrown) {
    const a = X.mount;
    const p = X.player;
    if (!a) return;
    X.mount = null;
    a.ridden = false;
    p.r = 12;
    const ang = p.aim + Math.PI / 2;
    a.x = p.x + Math.cos(ang) * (a.r + 14);
    a.y = p.y + Math.sin(ang) * (a.r + 14);
    AN.Physics.collide(X.zone, a);
    if (thrown) {
      p.kbx += Math.cos(p.aim + Math.PI) * 260;
      p.kby += Math.sin(p.aim + Math.PI) * 260;
      p.stunT = 0.5;
      AN.HUD.toast((a.nickname || a.def.name) + ' s’effondre et vous désarçonne.');
    }
    AN.HUD.mountChanged(X);
  };

  /** Appelé après le déplacement du joueur : la monture suit exactement. */
  Mt.update = function (X, dt) {
    const a = X.mount;
    if (!a) return;
    if (!a.alive || a.downed) { Mt.dismount(X, true); return; }
    const p = X.player;
    const moved = Math.hypot(p.x - a.x, p.y - a.y);
    a.x = p.x; a.y = p.y;
    a.vx = p.vx; a.vy = p.vy;
    a.anim += moved / Math.max(4, a.r * 0.9);
    const sp = Math.hypot(p.vx, p.vy);
    const target = sp > 20 ? Math.atan2(p.vy, p.vx) : p.aim;
    a.face += U.angDiff(a.face, target) * Math.min(1, dt * 8);
    a.mountCd = Math.max(0, (a.mountCd || 0) - dt);
  };

  /** Charge de la monture (clic droit). */
  Mt.attack = function (X) {
    const a = X.mount;
    const p = X.player;
    if (!a || a.mountCd > 0) return;
    a.mountCd = 0.75;
    a.attackAnim = 1;
    const base = a.atk ? a.atk.dmg * a.dmgMul * 1.8 : 14 * a.dmgMul;
    const range = a.r + 56;
    let hit = 0;
    for (const e of X.creatures) {
      if (!e.alive || e.team !== 'wild' || e.hidden) continue;
      const d = U.dist(p.x, p.y, e.x, e.y);
      if (d > range + e.r) continue;
      if (Math.abs(U.angDiff(p.aim, Math.atan2(e.y - p.y, e.x - p.x))) > 0.9) continue;
      AN.Combat.hit(X, e, base, p, { knock: 380 });
      hit++;
    }
    p.kbx += Math.cos(p.aim) * 200; p.kby += Math.sin(p.aim) * 200;
    FX.burst(p.x + Math.cos(p.aim) * range * 0.6, p.y + Math.sin(p.aim) * range * 0.6, a.pal.accent, 10 + hit * 3, 200, { size: 3 });
    AN.Audio.play('melee');
  };

  /** Les coups reçus par le joueur monté frappent la monture. Renvoie vrai si absorbé. */
  Mt.absorb = function (X, dmg, src, opts) {
    const a = X.mount;
    if (!a || opts.dot) return false;
    AN.Combat.hit(X, a, dmg * 0.85, src, { knock: 0, numbers: true });
    X.player.iframes = 0.25;
    return true;
  };

  /** Dessin du cavalier, au-dessus de la monture. */
  Mt.drawRider = function (ctx, X, t) {
    const a = X.mount;
    const p = X.player;
    const fake = Object.assign({}, p, { y: p.y - a.r * 0.42, r: 11 });
    AN.Art.drawPlayer(ctx, fake, t, { weapon: true, weaponColor: X.S.ranged.color, mounted: true });
  };

  /* ======================= Archive ======================= */
  Mt.archiveToggle = function (A) {
    if (A.mount) {
      A.mount.ridden = false;
      A.mount.homeC = A.mount.homeC || { x: 0, y: 0 };
      A.mount = null;
      return true;
    }
    const p = A.player;
    let best = null, bd = 80;
    for (const e of A.creatures) {
      if (e.hiddenUntilIntegrated || !Mt.info(e) || e.entry.injured || e.entry.lost || e.entry.loyalty < 30) continue;
      const d = U.dist(e.x, e.y, p.x, p.y) - e.r;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return false;
    A.mount = best;
    best.ridden = true;
    FX.ring(best.x, best.y, AN.CYAN, best.r, best.r * 2.2, 0.4, 2);
    AN.Audio.play('dash');
    return true;
  };

  Mt.archiveUpdate = function (A, dt) {
    const e = A.mount;
    if (!e) return;
    const p = A.player;
    const moved = Math.hypot(p.x - e.x, p.y - e.y);
    e.x = p.x; e.y = p.y;
    e.anim += moved / Math.max(4, e.r * 0.9);
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 20) e.face += U.angDiff(e.face, Math.atan2(p.vy, p.vx)) * Math.min(1, dt * 8);
  };
})();
