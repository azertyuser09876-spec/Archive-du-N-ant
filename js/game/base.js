/* La base mobile (1.9).
   Au départ d'une expédition, l'hexagone central de l'Archive (celui de
   l'Artefact) se détache et se pose dans le monde, à l'entrée de la première
   zone. Il est le point d'extraction principal : on y lance le transfert, et
   il repart avec le butin. Des gardes (créatures de la collection) et des
   modules de défense le protègent. S'il tombe sous les coups (« submergé »),
   l'Artefact rentre seul avec ses défenses et toute la soute, abandonne les
   gardes qui ne sont pas à bord, et le joueur doit sortir par une plaque
   blanche ou par l'extraction d'urgence.
   Données : js/data/base.js (D.BASE, D.DEFENSES). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  // effets et messages : sans affichage (tests), ils ne font rien
  const FX = { ring: (...a) => AN.FX && AN.FX.ring(...a), burst: (...a) => AN.FX && AN.FX.burst(...a), add: (...a) => AN.FX && AN.FX.add(...a), stream: (...a) => AN.FX && AN.FX.stream(...a) };
  const toast = (...a) => AN.HUD && AN.HUD.toast && AN.HUD.toast(...a);
  const TAU = Math.PI * 2;

  const B = (AN.Base = {});

  /* ======================= Profil ======================= */
  B.of = function (p) {
    const b = (p.base = p.base || {});
    b.guards = b.guards || [];
    b.defenses = b.defenses || {};
    b.installed = b.installed || [];
    return b;
  };
  /** Points de garde : chaque garde en coûte autant que de liens de compagnon. */
  B.guardPoints = (p) => D.BASE.guardPoints + ((AN.Structures && AN.Structures.powers(p).guards) || 0);
  B.guardCost = (c) => AN.Profile.linkCost(c.species);
  B.guardsUsed = (p) => B.of(p).guards.reduce((s, uid) => { const c = AN.Profile.findCreature(p, uid); return s + (c ? B.guardCost(c) : 0); }, 0);
  B.isGuard = (p, uid) => B.of(p).guards.includes(uid);
  /** Pourquoi une créature ne peut pas garder l'hexagone (null si elle le peut). */
  B.whyNot = function (p, c) {
    if (!c || !D.CREATURE[c.species]) return 'Créature inconnue.';
    if (c.lost) return 'Elle est perdue dans un autre monde.';
    if (c.injured) return 'Elle est blessée.';
    if (c.loyalty != null && c.loyalty < 20) return 'Elle est trop rebelle pour obéir.';
    if (D.CREATURE[c.species].tier >= 5) return 'Trop grande pour l’hexagone.';
    return null;
  };
  /** Ajoute ou retire un garde. Un garde n'est plus compagnon. Renvoie un message d'erreur, ou null. */
  B.toggleGuard = function (p, uid) {
    const b = B.of(p);
    if (b.guards.includes(uid)) { b.guards = b.guards.filter((u) => u !== uid); return null; }
    const c = AN.Profile.findCreature(p, uid);
    const why = B.whyNot(p, c);
    if (why) return why;
    if (B.guardsUsed(p) + B.guardCost(c) > B.guardPoints(p)) return 'Plus assez de points de garde (' + B.guardPoints(p) + '). Une garnison en ajoute.';
    b.guards.push(uid);
    p.companions = p.companions.filter((u) => u !== uid);
    if (p.call === uid) p.call = null;
    return null;
  };
  /** Retire les gardes qui ne peuvent plus servir, et ceux qui dépassent les points disponibles. */
  B.cleanGuards = function (p) {
    const b = B.of(p);
    b.guards = b.guards.filter((uid) => { const c = AN.Profile.findCreature(p, uid); return c && !B.whyNot(p, c) && !p.companions.includes(uid); });
    while (B.guardsUsed(p) > B.guardPoints(p)) b.guards.pop();
  };

  /** Modules installés à la fois. */
  B.defSlots = (p) => D.BASE.defSlots + ((AN.Structures && AN.Structures.powers(p).defSlots) || 0);
  B.level = (p, id) => B.of(p).defenses[id] || 0;
  B.installed = (p) => B.of(p).installed.filter((id) => D.DEFENSES[id] && B.level(p, id) > 0).slice(0, B.defSlots(p));
  B.defenseCost = (p, id) => {
    const lv = B.level(p, id);
    const L = D.DEFENSES[id].levels[lv];
    return L ? AN.Profile.scaledCost(L.cost, AN.Structures ? AN.Structures.costMult(p) : 1) : null;
  };
  /** Bâtir ou améliorer un module ; un nouveau module s'installe s'il reste de la place. */
  B.buildDefense = function (p, id) {
    const def = D.DEFENSES[id];
    const lv = B.level(p, id);
    if (!def) return 'Module inconnu.';
    if (lv >= def.levels.length) return 'Niveau maximal.';
    const cost = B.defenseCost(p, id);
    if (!AN.Profile.pay(p, cost)) return 'Ressources insuffisantes.';
    const b = B.of(p);
    b.defenses[id] = lv + 1;
    if (!b.installed.includes(id) && B.installed(p).length < B.defSlots(p)) b.installed.push(id);
    if (AN.Bonds && AN.Bonds.log) AN.Bonds.log(p, (lv ? 'Hexagone : ' + def.name + ' amélioré, niveau ' + (lv + 1) : 'Hexagone : ' + def.name + ' installé') + '.', 'build');
    AN.Save.write(p);
    return null;
  };
  B.toggleInstall = function (p, id) {
    const b = B.of(p);
    if (b.installed.includes(id)) { b.installed = b.installed.filter((x) => x !== id); return null; }
    if (!B.level(p, id)) return 'Ce module n’est pas encore bâti.';
    if (B.installed(p).length >= B.defSlots(p)) return 'Plus de place dans l’hexagone (' + B.defSlots(p) + ' modules). Un chantier en ajoute.';
    b.installed = B.installed(p).concat([id]);
    return null;
  };

  /** Ce que vaut l'hexagone dans un monde de cette menace. */
  B.stats = function (p, threat) {
    const out = { maxHp: D.BASE.hp + D.BASE.hpThreat * (threat || 1), armor: D.BASE.armor, shield: 0, shieldRegen: 0, slow: 0, slowRange: 0, heal: 0, turret: null };
    B.installed(p).forEach((id) => {
      const st = D.DEFENSES[id].levels[B.level(p, id) - 1].stat;
      if (id === 'mur') { out.maxHp += st.hp; out.armor += st.armor; }
      if (id === 'bouclier') { out.shield = st.shield; out.shieldRegen = st.shieldRegen; }
      if (id === 'phare_lent') { out.slow = st.slow; out.slowRange = st.slowRange; }
      if (id === 'source') out.heal = st.heal;
      if (id === 'tourelle') out.turret = { dmg: st.dmg * (1 + 0.12 * (threat || 1)), rate: st.rate, range: st.range };
    });
    return out;
  };

  /* ======================= Expédition ======================= */
  B.here = (X) => !!(X && X.base && X.base.state !== 'gone' && X.base.ready && X.zi === X.base.zi);
  B.active = (X) => B.here(X) && X.base.state === 'ok';
  B.inZone = (X) => !!(X && X.base && X.base.ready && X.zi === X.base.zi);
  B.onHex = (X, x, y, k = 0.92) => !!X.base && X.base.ready && U.dist(x, y, X.base.x, X.base.y) <= X.base.R * k;

  /** Prépare l'hexagone (avant la première zone). */
  B.setup = function (X) {
    X.base = null;
    if (X.world.tutorial) return;
    const p = X.profile;
    B.cleanGuards(p);
    const st = B.stats(p, X.world.threat);
    const T = AN.ZoneGen.T;
    const b = (X.base = {
      zi: 0, x: 0, y: 0, R: D.BASE.radius * T, ready: false, state: 'land', t: 0, landT: 0, liftT: 0,
      st, hp: st.maxHp, shield: st.shield, lastHit: -99, warned: 0,
      modules: B.installed(p).map((id, i, all) => {
        const a = -Math.PI / 2 + (i - (all.length - 1) / 2) * (TAU / 6) + Math.PI;
        return { id, level: B.level(p, id), a, cd: 0.5, aim: a };
      }),
      guards: [], secured: [], aboard: [], abandoned: [], raidT: U.lerp(D.BASE.raidFirst[0], D.BASE.raidFirst[1], Math.random()),
    });
    // les gardes : des créatures de la collection, qui restent sur l'hexagone
    const rank = AN.Profile.rank(p).index;
    B.of(p).guards.forEach((uid, i) => {
      const c = AN.Profile.findCreature(p, uid);
      if (!c) return;
      const def = D.CREATURE[c.species];
      const pw = AN.Bonds.powerMul(c);
      const reduced = AN.Profile.isReduced(c.species);
      const shrink = reduced ? Math.min(1, 50 / def.r) : 1;
      const e = AN.Entities.creature(def, 0, 0, { team: 'ally', variant: c.variant, hueSeed: c.hueSeed, foreign: c.foreign, scale: (1.4 + rank * 0.45 + def.tier * 0.3) * pw * (reduced ? 0.35 : 1), uid: c.uid, nickname: c.nickname, size: AN.Bonds.sizeMul(c) * shrink, stage: c.stage });
      e.guard = true;
      e.temper = 'agressif';
      e.dmgMul *= pw;
      e.loyalty = c.loyalty;
      e.post = i;
      e.kills = 0;
      b.guards.push(e);
    });
  };

  /** Une zone vient d'être générée : celle de l'hexagone est dégagée sous lui (avant son dessin). */
  B.onZoneGenerated = function (X, zone) {
    const b = X.base;
    if (!b || zone.index !== b.zi) return;
    b.x = zone.entry.x; b.y = zone.entry.y;
    const Z = AN.ZoneGen, T = Z.T;
    const r = Math.ceil(b.R / T) + 1;
    const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) {
      if (x < 2 || y < 2 || x >= zone.w - 2 || y >= zone.h - 2) continue;
      const i = y * zone.w + x;
      const g = zone.grid[i];
      if (g !== Z.WALL && g !== Z.HAZARD && g !== Z.ABYSS && g !== Z.BRIDGE_ON && g !== Z.BRIDGE_OFF) continue;
      if (B.inHexShape(x * T + T / 2 - b.x, y * T + T / 2 - b.y, b.R + T * 0.6)) zone.grid[i] = Z.FLOOR;
    }
    b.ready = true;
    b.flow = null;
  };
  /** Un point (relatif au centre) est-il dans un hexagone pointe en haut de rayon R ? */
  B.inHexShape = function (dx, dy, R) {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    return ax <= (Math.sqrt(3) / 2) * R && ay <= R - ax / Math.sqrt(3);
  };

  /** En entrant dans une zone : l'hexagone, ses gardes à leur poste. */
  B.onEnterZone = function (X, zi, fromZi) {
    const b = X.base;
    if (!b || zi !== b.zi || b.state === 'gone') return;
    b.flow = AN.Physics.flowField(X.zone, Math.floor(b.x / AN.ZoneGen.T), Math.floor(b.y / AN.ZoneGen.T), 60);
    b.guards.forEach((g) => {
      if (g.placed && fromZi != null) return; // ils sont restés où ils étaient
      const pp = B.postOf(X, g);
      g.x = pp.x; g.y = pp.y; g.vx = g.vy = g.kbx = g.kby = 0;
      g.placed = true;
    });
    if (fromZi == null && b.state === 'land') {
      // l'arrivée : le joueur se pose avec l'hexagone, au pied de l'Artefact
      const p = X.player;
      p.x = b.x; p.y = b.y + 70;
      X.allies.forEach((a, i) => { const ang = Math.PI / 2 + (i - (X.allies.length - 1) / 2) * 0.5; a.x = b.x + Math.cos(ang) * 110; a.y = b.y + Math.sin(ang) * 110; a.home = { x: a.x, y: a.y }; });
      X.cam.x = b.x; X.cam.y = b.y;
      p.hidden = true;
    }
  };
  B.postOf = function (X, g) {
    const b = X.base;
    const n = Math.max(1, b.guards.length);
    const a = -Math.PI / 2 + ((g.post + 0.5) / n) * TAU;
    return { x: b.x + Math.cos(a) * b.R * 0.55, y: b.y + Math.sin(a) * b.R * 0.55 };
  };

  /** Pseudo-entité visée par les créatures sauvages. */
  B.target = function (X) {
    const b = X.base;
    if (!b.tgt) b.tgt = { kind: 'base', team: 'ally', alive: true, x: b.x, y: b.y, r: b.R * 0.85, vx: 0, vy: 0, base: true };
    b.tgt.x = b.x; b.tgt.y = b.y; b.tgt.alive = b.state === 'ok';
    return b.tgt;
  };
  /** Cibles qu'ajoute l'hexagone pour les créatures sauvages (gardes, hexagone). */
  B.enemies = function (X, out) {
    if (!B.inZone(X)) return out;
    for (const g of X.base.guards) if (g.alive && !g.downed && !g.aboard) out.push(g);
    if (B.active(X)) out.push(B.target(X));
    return out;
  };
  /** Choix de cible d'une créature sauvage : gardes et hexagone comptent comme le joueur. */
  B.pick = function (X, e, best, bd) {
    if (!B.inZone(X)) return best;
    for (const g of X.base.guards) {
      if (!g.alive || g.downed || g.aboard) continue;
      const d = U.dist(e.x, e.y, g.x, g.y);
      if (d < bd * 0.7) { best = g; bd = d; }
    }
    if (X.base.state !== 'ok') return best;
    const db = U.dist(e.x, e.y, X.base.x, X.base.y) - X.base.R * 0.85;
    if (e.raid && (!best || bd > 150)) return B.target(X);
    if (db < bd * 0.7) return B.target(X);
    return best;
  };

  /** Coup porté à l'hexagone. */
  B.damage = function (X, dmg, src) {
    const b = X.base;
    if (!b || b.state !== 'ok' || !(dmg > 0)) return 0;
    b.lastHit = X.time;
    let d = dmg;
    if (b.shield > 0) {
      const s = Math.min(b.shield, d);
      b.shield -= s; d -= s;
      if (Math.random() < 0.4) FX.ring(b.x, b.y, D.DEFENSES.bouclier.color, b.R * 0.9, b.R * 1.02, 0.25, 2);
      if (d <= 0) return s;
    }
    d *= 1 - b.st.armor;
    b.hp -= d;
    b.flash = 0.15;
    if (src && src.x != null && Math.random() < 0.5) FX.burst(U.lerp(b.x, src.x, 0.75), U.lerp(b.y, src.y, 0.75), '#ffffff', 5, 90, { size: 2.5, kind: 'square' });
    const k = b.hp / b.st.maxHp;
    if (b.hp <= 0) { B.submerge(X); return d; }
    if (k < 0.5 && b.warned < 1) { b.warned = 1; toast('L’hexagone est attaqué : la moitié de sa vigueur est perdue.', 4); AN.Audio.play('ui_err'); }
    if (k < 0.25 && b.warned < 2) { b.warned = 2; toast('L’hexagone va céder. S’il tombe, l’Artefact rentrera seul avec la soute.', 5); AN.Audio.play('ui_err'); }
    if (b.hp <= 0) B.submerge(X);
    return d;
  };

  /** L'hexagone est submergé : l'Artefact rentre seul, avec ses défenses et toute la soute. */
  B.submerge = function (X) {
    const b = X.base;
    if (!b || b.state !== 'ok') return;
    b.hp = 0;
    b.submerged = true;
    const p = X.player;
    const withPlayer = p.alive && !X.ending && B.onHex(X, p.x, p.y);
    // à bord : les gardes debout sur l'hexagone ; les autres sont abandonnés
    b.guards.forEach((g) => {
      if (g.alive && !g.downed && B.onHex(X, g.x, g.y, 1.05)) { g.aboard = true; b.aboard.push(g.uid); }
      else b.abandoned.push(g.uid);
    });
    b.secured = b.secured.concat(X.cargo);
    X.cargo = [];
    // un transfert lancé depuis l'hexagone s'interrompt : le monde se fige tel qu'il est
    if (X.collapse && X.collapse.plate && X.collapse.plate.base) {
      X.collapse.done = true;
      if (X.collapse.sound) X.collapse.sound.stop();
      X.collapse = null;
      if (AN.HUD && AN.HUD.els && AN.HUD.els.collapse) AN.HUD.els.collapse.hidden = true;
      if (AN.Music) AN.Music.mood('expedition', { seed: X.world.seed, biome: X.zone.biome, scale: X.world.scale });
    }
    B.lift(X, withPlayer);
    AN.Audio.play('shatter');
    X.cam.shake(10);
    const n = b.secured.length;
    if (withPlayer) {
      toast('L’hexagone est submergé. Vous êtes à bord : l’Artefact vous emporte avec la soute.', 5);
    } else {
      toast('L’hexagone est submergé. L’Artefact rentre seul avec ses défenses' + (n ? ' et la soute (' + n + ' élément' + (n > 1 ? 's' : '') + ')' : '') + '. Sortez par une plaque blanche, ou maintenez ' + AN.Input.label('KeyX') + '.', 9);
      if (b.abandoned.length) setTimeout(() => { if (AN.X === X) toast(b.abandoned.length > 1 ? b.abandoned.length + ' gardes sont restés au sol. Relevez-les : ils rentreront avec vous.' : 'Un garde est resté au sol. Relevez-le : il rentrera avec vous.', 6); }, 2600);
    }
    if (AN.HUD && AN.HUD.ready) AN.HUD.zoneChanged(X);
  };

  /** Départ de l'hexagone (retour ou submersion). withPlayer : le joueur est à bord. */
  B.lift = function (X, withPlayer, then) {
    const b = X.base;
    b.state = 'lift';
    b.liftT = 0;
    b.withPlayer = !!withPlayer;
    b.guards.forEach((g) => { if (!g.downed && B.onHex(X, g.x, g.y, 1.05) && !g.aboard) { g.aboard = true; if (!b.aboard.includes(g.uid)) b.aboard.push(g.uid); } });
    if (withPlayer) {
      X.ending = true;
      X.player.liftK = 0;
      b.then = then || (() => AN.Expedition.finish(X, 'urgence'));
    }
    AN.Audio.play('portal');
    FX.ring(b.x, b.y, AN.CYAN, b.R * 0.4, b.R * 1.4, 1, 5);
  };

  /** Un garde relevé après la submersion rejoint le joueur, et rentrera avec lui. */
  B.onRevive = function (X, e) {
    const b = X.base;
    if (!b || !e.guard || b.state !== 'gone') return;
    b.guards = b.guards.filter((g) => g !== e);
    b.abandoned = b.abandoned.filter((u) => u !== e.uid);
    e.guard = false;
    e.rejoined = true;
    X.allies.push(e);
    toast((e.nickname || e.def.name) + ' vous suit : il rentrera avec vous.', 4);
  };

  /** Interactions : l'Artefact au centre de l'hexagone. */
  B.interactables = function (X, consider) {
    if (!B.active(X) || X.collapse) return;
    const b = X.base, p = X.player;
    consider(U.dist(b.x, b.y, p.x, p.y), 90, () => ({ kind: 'base_extract', target: b, text: 'Activer l’Artefact : transfert depuis l’hexagone', hold: 0.5 }));
  };
  B.plate = (X) => ({ x: X.base.x, y: X.base.y, base: true });
  /** Gardes à terre qu'on peut relever. */
  B.downedNear = function (X) {
    if (!X.base || X.zi !== X.base.zi) return null;
    const p = X.player;
    for (const g of X.base.guards) if (g.alive && g.downed && !g.aboard && U.dist(g.x, g.y, p.x, p.y) < 54) return g;
    return null;
  };

  /* ---------- assauts ---------- */
  function raid(X) {
    const b = X.base, zone = X.zone, Z = AN.ZoneGen;
    const pool = AN.WorldGen.pool(zone.biome).filter((d) => d.attack && d.tier <= 1);
    if (!pool.length) return;
    const count = 1 + Math.ceil(X.world.threat / 2) + (Math.random() < 0.5 ? 1 : 0);
    const a0 = Math.random() * TAU;
    let n = 0;
    for (let k = 0; k < count * 8 && n < count; k++) {
      const a = a0 + (Math.random() - 0.5) * 1.2, r = b.R + 520 + Math.random() * 300;
      const x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r;
      if (Z.tileAt(zone, x, y) !== Z.FLOOR) continue;
      const def = pool[Math.floor(Math.random() * pool.length)];
      const e = AN.Entities.creature(def, x, y, { threat: X.world.threat, rule: X.world.rule });
      e.frenzy = true; e.aggroT = 60; e.raid = true;
      e.home = { x: b.x, y: b.y };
      X.creatures.push(e);
      n++;
    }
    if (n) {
      toast('Des créatures marchent sur l’hexagone.', 4);
      AN.Audio.play('telegraph');
    }
  }

  B.raid = (X) => { if (B.active(X)) raid(X); };

  /* ---------- gardes ---------- */
  B.guardAI = function (X, e, dt) {
    const b = X.base;
    if (e.downed || e.aboard) { e.dvx = e.dvy = 0; return; }
    const post = B.postOf(X, e);
    const leash = b.R + 320;
    let enemy = null, bd = 1e9;
    if (e.atk && b.state !== 'gone') {
      for (const c of X.creatures) {
        if (!c.alive || c.team !== 'wild' || c.hidden || c.weak || c.herd || c.reflection) continue;
        if (c.def.npc && !c.fighter && c.npc && c.npc.mode !== 'thief' && c.npc.mode !== 'zealot') continue;
        if (c.boss && (c.boss.exhausted || !c.boss.active)) continue;
        const dc = U.dist(c.x, c.y, b.x, b.y);
        if (dc > leash) continue;
        const d = U.dist(c.x, c.y, e.x, e.y);
        if (d < bd) { bd = d; enemy = c; }
      }
    }
    if (enemy && U.dist(e.x, e.y, b.x, b.y) < leash + 60) { e.state = 'attack'; AN.AI.attack(X, e, enemy, dt); return; }
    e.state = 'guard';
    const tx = b.state === 'gone' ? e.x : post.x, ty = b.state === 'gone' ? e.y : post.y;
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    const sp = e.speed * (d > 120 ? 1.1 : 0.4);
    if (d > 14) { e.dvx = (dx / d) * sp; e.dvy = (dy / d) * sp; } else { e.dvx = e.dvy = 0; e.face += U.angDiff(e.face, Math.atan2(e.y - b.y, e.x - b.x)) * Math.min(1, dt * 3); }
  };

  /* ---------- mise à jour ---------- */
  B.update = function (X, dt) {
    const b = X.base;
    if (!b) return;
    if (b.state === 'gone') {
      // les gardes abandonnés restent là où ils sont tombés
      if (B.inZone(X)) for (const g of b.guards) if (g.alive && !g.aboard) AN.AI.update(X, g, dt);
      return;
    }
    b.t += dt;
    if (b.flash > 0) b.flash -= dt;
    const here = X.zi === b.zi && b.ready;
    // pose dans le monde
    if (b.state === 'land') {
      if (!here) { b.state = 'ok'; X.player.hidden = false; return; }
      b.landT += dt;
      const dur = AN.Prefs && AN.Prefs.reduceFx() ? 0.5 : D.BASE.landDur;
      if (b.landT >= dur) {
        b.state = 'ok';
        X.player.hidden = false;
        X.cam.shake(9);
        AN.Audio.play('boom');
        AN.Audio.play('appear');
        FX.ring(b.x, b.y, AN.CYAN, b.R * 0.6, b.R * 2.2, 0.9, 6);
        FX.ring(b.x, b.y, AN.INK, b.R, b.R * 1.6, 0.6, 3);
        const zb = X.biome;
        for (let i = 0; i < 26; i++) {
          const a = (i / 26) * TAU;
          FX.add({ kind: 'square', x: b.x + Math.cos(a) * b.R, y: b.y + Math.sin(a) * b.R, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, size: 6, color: zb.ground[1], life: 0.8, vr: 3, rot: a, drag: 3 });
        }
        // le choc repousse ce qui se trouvait là
        for (const c of X.creatures) {
          if (!c.alive) continue;
          const d = U.dist(c.x, c.y, b.x, b.y);
          if (d < b.R * 1.6) { const a = Math.atan2(c.y - b.y, c.x - b.x); c.kbx += Math.cos(a) * 420; c.kby += Math.sin(a) * 420; c.aggroT = Math.max(c.aggroT, 3); }
        }
        if (!X.profile.flags.baseHelp) {
          X.profile.flags.baseHelp = 1;
          setTimeout(() => { if (AN.X === X) toast('L’hexagone de l’Artefact s’est posé ici. C’est votre point d’extraction principal : revenez à l’Artefact (' + AN.Input.label('KeyE') + ') pour lancer le transfert. Il peut être attaqué en votre absence.', 10); }, 1800);
        }
      }
      return;
    }
    // départ
    if (b.state === 'lift') {
      b.liftT += dt;
      const dur = AN.Prefs && AN.Prefs.reduceFx() ? 0.6 : D.BASE.liftDur;
      if (b.withPlayer) X.player.liftK = U.clamp(b.liftT / dur, 0, 1);
      if (here && Math.random() < dt * 30) FX.stream(b.x + (Math.random() - 0.5) * b.R, b.y + (Math.random() - 0.5) * b.R, b.x, b.y - 400, Math.random() < 0.5 ? '#ffffff' : AN.CYAN, { life: 0.7, size: 3 });
      if (b.liftT >= dur) {
        b.state = 'gone';
        X.player.liftK = 0;
        if (here) { FX.ring(b.x, b.y, AN.CYAN, 10, b.R * 2, 0.7, 4); X.cam.shake(4); }
        if (b.then) { const f = b.then; b.then = null; f(); }
      }
      return;
    }
    if (!here) return;
    const p = X.player;
    // modules
    const st = b.st;
    if (st.shield && X.time - b.lastHit > 3) b.shield = Math.min(st.shield, b.shield + st.shieldRegen * dt);
    if (!X.collapse && X.time - b.lastHit > 10 && b.hp < st.maxHp) { b.hp = Math.min(st.maxHp, b.hp + D.BASE.regen * dt); if (b.hp > st.maxHp * 0.6) b.warned = 0; }
    if (st.heal) {
      if (p.alive && B.onHex(X, p.x, p.y)) p.hp = Math.min(p.maxHp, p.hp + st.heal * dt);
      for (const g of b.guards) if (g.alive && !g.downed && B.onHex(X, g.x, g.y)) g.hp = Math.min(g.maxHp, g.hp + st.heal * dt);
    }
    if (st.slow) {
      const rr = b.R + st.slowRange;
      for (const c of X.creatures) {
        if (!c.alive || c.team !== 'wild') continue;
        if (Math.abs(c.x - b.x) > rr || Math.abs(c.y - b.y) > rr || U.dist(c.x, c.y, b.x, b.y) > rr) continue;
        c.slowT = Math.max(c.slowT || 0, 0.3); c.slowAmt = Math.max(c.slowT > 0.3 ? c.slowAmt || 0 : 0, st.slow);
      }
    }
    if (st.turret) {
      for (const m of b.modules) {
        if (m.id !== 'tourelle') continue;
        const mp = B.modulePos(b, m);
        m.cd -= dt;
        let tg = null, bd = st.turret.range;
        for (const c of X.creatures) {
          if (!c.alive || c.team !== 'wild' || c.hidden || c.weak || c.herd || c.reflection) continue;
          if (c.def.npc && !c.fighter && c.npc && c.npc.mode !== 'thief' && c.npc.mode !== 'zealot') continue;
          if (c.boss && (c.boss.exhausted || !c.boss.active)) continue;
          if (!c.isBoss && c.state !== 'attack' && !c.raid && !c.frenzy) continue; // elle ne tire que sur ce qui menace
          const d = U.dist(c.x, c.y, mp.x, mp.y);
          if (d < bd && AN.ZoneGen.los(X.zone, mp.x, mp.y, c.x, c.y)) { bd = d; tg = c; }
        }
        if (tg) {
          m.aim += U.angDiff(m.aim, Math.atan2(tg.y - mp.y, tg.x - mp.x)) * Math.min(1, dt * 10);
          if (m.cd <= 0) {
            m.cd = 1 / st.turret.rate;
            AN.Combat.shoot(X, { x: mp.x, y: mp.y - 10, angle: Math.atan2(tg.y - mp.y, tg.x - mp.x), speed: 720, dmg: st.turret.dmg, team: 'player', size: 4, color: D.DEFENSES.tourelle.color, range: st.turret.range * 1.1 });
            AN.Audio.play('shoot', { weapon: 'eclat', gap: 0.05, at: mp });
          }
        }
      }
    }
    // gardes (la mise à jour de leur IA passe par AN.AI.update)
    for (const g of b.guards) {
      if (!g.alive || g.aboard) continue;
      AN.AI.update(X, g, dt);
      // un garde qui s'aventure trop loin revient à son poste
      if (U.dist(g.x, g.y, b.x, b.y) > b.R + 700) { const pp = B.postOf(X, g); g.x = pp.x; g.y = pp.y; }
    }
    // assauts, pendant l'exploration
    if (!X.collapse && !X.ending && X.profile.expeditions >= D.BASE.raidFrom) {
      b.raidT -= dt;
      if (b.raidT <= 0) {
        b.raidT = U.lerp(D.BASE.raidEvery[0], D.BASE.raidEvery[1], Math.random());
        raid(X);
      }
    }
  };
  B.modulePos = (b, m) => ({ x: b.x + Math.cos(m.a) * b.R * 0.66, y: b.y + Math.sin(m.a) * b.R * 0.66 });
  /** Entités de l'hexagone à faire bouger et séparer (gardes présents). */
  B.entities = (X) => (B.inZone(X) ? X.base.guards.filter((g) => g.alive && !g.aboard) : []);

  /* ======================= Dessin ======================= */
  function hexPath(ctx, x, y, R) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const px = x + R * Math.cos(a), py = y + R * Math.sin(a);
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  B.hexPath = hexPath;

  /** L'Artefact lui-même (losange et anneaux), centré en (x, y). */
  B.drawArtefact = function (ctx, x, y, t, k = 1, size = 1) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 1.3) * 4 * size - 20 * size);
    ctx.scale(size, size);
    ctx.globalAlpha *= k;
    ctx.fillStyle = 'rgba(28,34,48,0.12)';
    ctx.beginPath(); ctx.ellipse(0, 44, 30, 9, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
    g.addColorStop(0, U.rgba(AN.CYAN, 0.25)); g.addColorStop(1, U.rgba(AN.CYAN, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(t * (0.3 + i * 0.25) * (i % 2 ? -1 : 1) + i * 0.4);
      const s = 10 + i * 7;
      ctx.strokeStyle = i === 0 ? AN.CYAN : U.rgba(AN.INK, 0.9 - i * 0.18);
      ctx.lineWidth = i === 0 ? 3 : 1.5;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    }
    ctx.fillStyle = AN.CYAN;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  /**
   * Le sol de l'hexagone : un morceau du blanc de l'Archive, posé sur le monde.
   * o : { lift (0 → 1, il s'élève), land (0 → 1, il se pose), flash, empty (empreinte seule) }
   */
  B.drawPlatform = function (ctx, x, y, R, t, o = {}) {
    const up = o.lift != null ? U.easeIn(o.lift) : o.land != null ? Math.pow(1 - U.easeOut(o.land), 2) : 0;
    const dy = -up * 520, sc = 1 + up * 0.35, alpha = o.lift != null ? 1 - U.clamp((o.lift - 0.55) / 0.45, 0, 1) : o.land != null ? U.clamp(o.land * 3, 0, 1) : 1;
    // l'ombre, puis l'empreinte laissée au sol
    ctx.save();
    ctx.fillStyle = 'rgba(10,12,20,' + (0.16 * (1 - up * 0.7) * alpha) + ')';
    hexPath(ctx, x + 10 + up * 40, y + 14 + up * 30, R * (1 - up * 0.25)); ctx.fill();
    if (o.lift != null || o.empty) {
      ctx.strokeStyle = U.rgba(AN.INK, 0.25); ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
      hexPath(ctx, x, y, R); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    if (o.empty) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y + dy);
    ctx.scale(sc, sc);
    // tranche de l'hexagone (un peu d'épaisseur quand il vole)
    if (up > 0.01) { ctx.fillStyle = '#d9dcdf'; hexPath(ctx, 0, 10 * up + 4, R); ctx.fill(); }
    ctx.fillStyle = AN.PAPER;
    hexPath(ctx, 0, 0, R); ctx.fill();
    ctx.fillStyle = U.rgba(AN.INK, 0.12);
    for (let gy = -R; gy <= R; gy += 32) for (let gx = -R; gx <= R; gx += 32) if (B.inHexShape(gx, gy, R - 12)) ctx.fillRect(gx - 1, gy - 1, 2, 2);
    ctx.strokeStyle = U.rgba(AN.CYAN, 0.55); ctx.lineWidth = 2; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 12;
    hexPath(ctx, 0, 0, R * 0.62); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = o.flash > 0 ? AN.STAMP : AN.INK; ctx.lineWidth = 3;
    hexPath(ctx, 0, 0, R); ctx.stroke();
    ctx.restore();
  };

  /** Sous les créatures : le sol, les modules, l'Artefact. */
  B.drawUnder = function (ctx, X, t) {
    const b = X.base;
    if (!b || !b.ready || X.zi !== b.zi) return;
    if (!X.cam.visible(b.x, b.y, b.R + 40) && b.state !== 'lift' && b.state !== 'land') return;
    if (b.state === 'gone') { B.drawPlatform(ctx, b.x, b.y, b.R, t, { empty: true }); return; }
    const o = { flash: b.flash };
    if (b.state === 'land') o.land = U.clamp(b.landT / D.BASE.landDur, 0, 1);
    if (b.state === 'lift') o.lift = U.clamp(b.liftT / D.BASE.liftDur, 0, 1);
    B.drawPlatform(ctx, b.x, b.y, b.R, t, o);
    const up = o.lift != null ? U.easeIn(o.lift) : o.land != null ? Math.pow(1 - U.easeOut(o.land), 2) : 0;
    const alpha = o.lift != null ? 1 - U.clamp((o.lift - 0.55) / 0.45, 0, 1) : o.land != null ? U.clamp(o.land * 3, 0, 1) : 1;
    const sc = 1 + up * 0.35, dy = -up * 520;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(b.x, b.y + dy); ctx.scale(sc, sc); ctx.translate(-b.x, -b.y);
    for (const m of b.modules) {
      const mp = B.modulePos(b, m);
      AN.StructArt.drawDefense(ctx, m.id, mp.x, mp.y, 22, t, { level: m.level, aim: m.aim });
    }
    B.drawArtefact(ctx, b.x, b.y, t, 1, 1);
    // pendant le départ, ce qui est à bord monte avec l'hexagone
    if (up > 0) {
      for (const g of b.guards) if (g.aboard) AN.Art.draw(ctx, g, t);
      if (b.withPlayer && X.player.alive) AN.Art.drawPlayer(ctx, X.player, t, { weapon: false });
    }
    ctx.restore();
  };
  /** Par-dessus : le dôme du bouclier, la vigueur, la colonne de lumière du départ. */
  B.drawOver = function (ctx, X, t) {
    const b = X.base;
    if (!b || !b.ready || X.zi !== b.zi || b.state === 'gone') return;
    if (b.state === 'ok') {
      if (b.st.shield && b.shield > 1) {
        ctx.strokeStyle = U.rgba(D.DEFENSES.bouclier.color, 0.25 + 0.35 * (b.shield / b.st.shield));
        ctx.lineWidth = 3;
        hexPath(ctx, b.x, b.y, b.R + 10 + Math.sin(t * 3) * 2); ctx.stroke();
      }
      if (b.st.slow) {
        ctx.strokeStyle = U.rgba(D.DEFENSES.phare_lent.color, 0.18); ctx.lineWidth = 1.5; ctx.setLineDash([6, 12]);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.R + b.st.slowRange, t * 0.1, t * 0.1 + TAU); ctx.stroke(); ctx.setLineDash([]);
      }
      if (b.hp < b.st.maxHp || b.flash > 0) {
        const w = b.R * 1.1, k = U.clamp(b.hp / b.st.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(b.x - w / 2 - 1, b.y - b.R - 22, w + 2, 6);
        ctx.fillStyle = k < 0.3 ? AN.STAMP : AN.INK; ctx.fillRect(b.x - w / 2, b.y - b.R - 21, w * k, 4);
      }
    }
    if (b.state === 'lift' || b.state === 'land') {
      const k = b.state === 'lift' ? U.clamp(b.liftT / D.BASE.liftDur, 0, 1) : 1 - U.clamp(b.landT / D.BASE.landDur, 0, 1);
      const g = ctx.createLinearGradient(b.x, b.y - 1200, b.x, b.y);
      g.addColorStop(0, U.rgba('#ffffff', 0)); g.addColorStop(1, U.rgba('#ffffff', 0.55 * Math.sin(k * Math.PI)));
      ctx.fillStyle = g;
      ctx.fillRect(b.x - b.R * 0.8, b.y - 1200, b.R * 1.6, 1200);
    }
  };
  /** À l'écran : une flèche vers l'hexagone quand il est hors de vue et qu'on l'attaque. */
  B.drawScreen = function (ctx, X, t) {
    const b = X.base;
    if (!B.active(X)) return;
    const cam = X.cam;
    if (cam.visible(b.x, b.y, b.R * 0.5)) return;
    const s = cam.worldToScreen(b.x, b.y);
    const W = cam.W, H = cam.H;
    const a = Math.atan2(s.y - H / 2, s.x - W / 2);
    const attacked = X.time - b.lastHit < 3;
    const r = Math.min(W, H) / 2 - 46;
    const x = W / 2 + Math.cos(a) * r, y = H / 2 + Math.sin(a) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = attacked ? 0.75 + Math.sin(t * 10) * 0.25 : 0.55;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = attacked ? AN.STAMP : AN.INK; ctx.lineWidth = 2;
    hexPath(ctx, 0, 0, 13); ctx.fill(); ctx.stroke();
    ctx.rotate(a);
    ctx.fillStyle = attacked ? AN.STAMP : AN.INK;
    ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(16, -6); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  B.drawMinimap = function (ctx, X, k) {
    const b = X.base;
    if (!b || !b.ready || X.zi !== b.zi) return;
    ctx.fillStyle = b.state === 'gone' ? 'rgba(255,255,255,0.25)' : '#ffffff';
    ctx.strokeStyle = b.state === 'gone' ? U.rgba(AN.INK, 0.5) : X.time - b.lastHit < 3 ? AN.STAMP : AN.CYAN;
    ctx.lineWidth = 1.8;
    hexPath(ctx, b.x * k, b.y * k, 6.5); ctx.fill(); ctx.stroke();
    for (const g of b.guards) if (g.alive && !g.aboard) { ctx.fillStyle = g.downed ? AN.STAMP : '#9fb4ff'; ctx.fillRect(g.x * k - 1.5, g.y * k - 1.5, 3, 3); }
  };
  /** Lumières de l'hexagone, dans les mondes sombres. */
  B.lights = function (X, light) {
    const b = X.base;
    if (!B.here(X) || b.state === 'lift') return;
    light(b.x, b.y, b.R + 120 + (b.st.slow ? 160 : 0), 0.9);
  };

  /* ======================= Fin d'expédition ======================= */
  /**
   * Ce que deviennent les gardes. Le monde n'est pas détruit après une chute
   * (outcome 'echec') : les gardes laissés au sol y restent, en sursis, comme
   * des compagnons perdus. Sinon, il est détruit avec eux : il n'en reste qu'une essence.
   */
  B.finish = function (X, prof, outcome, result) {
    const b = X.base;
    if (!b) return;
    const P = AN.Profile;
    const strand = [], gone = [];
    const destroyed = outcome !== 'echec'; // après une chute, le monde n'est pas détruit
    b.guards.forEach((g) => {
      if (g.rejoined) return; // relevé après la submersion : il est rentré avec le joueur, comme un compagnon
      const c = P.findCreature(prof, g.uid);
      if (!c) return;
      if (g.aboard) { if (g.hp < g.maxHp * 0.25) { c.injured = 1; result.injured.push(P.displayName(c)); } return; }
      // un lieu ancré n'est jamais détruit : l'Artefact y retrouve toujours ses gardes (1.10)
      if (X.world.place || outcome === 'ancre') { if (g.downed || b.abandoned.includes(g.uid)) { c.injured = 2; result.injured.push(P.displayName(c)); } return; }
      if (b.abandoned.includes(g.uid)) { (destroyed ? gone : strand).push(c); return; }
      // l'hexagone est rentré avec l'Artefact : un garde à terre revient blessé, sauf après une chute
      if (g.downed) {
        if (destroyed) { c.injured = 2; result.injured.push(P.displayName(c)); }
        else strand.push(c);
      }
    });
    if (strand.length) AN.Rescue.strand(X, prof, strand, result);
    gone.forEach((c) => {
      AN.Rescue.toEssence(prof, c, X.world.code + ' a été détruit avec ' + P.displayName(c) + ', resté à garder l’hexagone. Il ne reste qu’une essence.');
      (result.rescueMsgs = result.rescueMsgs || []).push(P.displayName(c) + ' gardait l’hexagone ; il est resté dans ' + X.world.code + '. Il ne reste qu’une essence.');
    });
    B.of(prof).guards = B.of(prof).guards.filter((uid) => P.findCreature(prof, uid));
    result.base = { submerged: !!b.submerged, withPlayer: !!b.withPlayer, secured: b.secured.length, lost: gone.map((c) => P.displayName(c)), stranded: strand.map((c) => P.displayName(c)) };
  };

  /* ======================= Reprise ======================= */
  B.snapshot = function (X) {
    const b = X.base;
    if (!b) return null;
    return {
      zi: b.zi, hp: Math.round(b.hp), shield: Math.round(b.shield), gone: b.state === 'gone' || b.state === 'lift', submerged: !!b.submerged, raidT: Math.round(b.raidT),
      secured: b.secured.map((c) => Object.assign({}, c)), aboard: b.aboard.slice(), abandoned: b.abandoned.slice(),
      guards: b.guards.map((g) => ({ uid: g.uid, hp: Math.round(g.hp), downed: !!g.downed })),
    };
  };
  B.restore = function (X, s) {
    const b = X.base;
    if (!b || !s) return;
    b.zi = s.zi || 0;
    b.hp = Math.max(1, s.hp || b.hp);
    b.shield = s.shield || 0;
    b.raidT = s.raidT || b.raidT;
    b.state = s.gone ? 'gone' : 'ok';
    b.submerged = !!s.submerged;
    b.secured = (s.secured || []).map((c) => Object.assign({}, c));
    b.aboard = (s.aboard || []).slice();
    b.abandoned = (s.abandoned || []).slice();
    const byUid = new Map((s.guards || []).map((g) => [g.uid, g]));
    b.guards = b.guards.filter((g) => !s.guards || byUid.has(g.uid) || b.aboard.includes(g.uid));
    b.guards.forEach((g) => { if (b.aboard.includes(g.uid)) g.aboard = true; });
    b.guards.forEach((g) => { const sg = byUid.get(g.uid); if (sg) { g.hp = Math.min(g.maxHp, Math.max(1, sg.hp)); g.downed = sg.downed; } });
    X.player.hidden = false;
  };

  /* ======================= Archive ======================= */
  /*
   * Dans l'Archive, l'hexagone central porte l'Artefact, les modules de
   * défense et les gardes. Il se détache au départ (B.depart) et revient
   * se poser au retour (B.archiveLand).
   */
  B.archivePos = (i, n) => { const a = -Math.PI / 2 + (i - (n - 1) / 2) * (TAU / 6) + Math.PI; return { x: Math.cos(a) * 270, y: Math.sin(a) * 270 }; };
  B.guardHome = (i, n) => { const a = -Math.PI / 2 + ((i + 0.5) / Math.max(1, n)) * TAU; return { x: Math.cos(a) * 170, y: Math.sin(a) * 170 }; };

  /** Lancer l'animation du départ, puis fn (l'expédition). */
  B.depart = function (fn) {
    const A = AN.Archive.state();
    if (!A || (AN.Prefs && AN.Prefs.reduceFx())) { fn(); return; }
    A.depart = { t: 0, dur: 2.1, fn, done: false };
    A.focus = { x: 0, y: 0, zoom: U.clamp(Math.min(A.cam.W, A.cam.H) / 1500, 0.22, 0.6) };
    AN.Audio.play('portal');
  };
  B.archiveLand = function (A) {
    if (AN.Prefs && AN.Prefs.reduceFx()) return;
    A.baseLand = { t: 0, dur: 1.7 };
    A.cam.x = 0; A.cam.y = 0; A.cam.zoom = U.clamp(Math.min(A.cam.W, A.cam.H) / 1500, 0.22, 0.6);
  };
  B.archiveUpdate = function (A, dt) {
    if (A.depart) {
      const d = A.depart;
      d.t += dt;
      if (d.t > 0.35 && !d.ringed) { d.ringed = true; FX.ring(0, 0, AN.CYAN, 60, AN.Hex.R * 1.3, 1, 6); A.cam.shake && A.cam.shake(5); }
      if (d.t >= d.dur && !d.done) { d.done = true; d.fn(); }
    }
    if (A.baseLand) {
      const L = A.baseLand;
      L.t += dt;
      if (L.t >= L.dur * 0.82 && !L.hit) {
        L.hit = true;
        FX.ring(0, 0, AN.CYAN, AN.Hex.R * 0.5, AN.Hex.R * 1.5, 0.9, 6);
        FX.ring(0, 0, AN.INK, AN.Hex.R, AN.Hex.R * 1.25, 0.6, 3);
        if (A.cam.shake) A.cam.shake(6);
        AN.Audio.play('appear');
      }
      if (L.t >= L.dur) A.baseLand = null;
    }
  };
  /** Le sol de l'hexagone central, sous les créatures (avec le départ et le retour). */
  B.drawArchiveHex = function (ctx, A, t, z) {
    const R = AN.Hex.R - 6;
    let o = {};
    if (A.depart) o.lift = U.clamp((A.depart.t - 0.3) / (A.depart.dur - 0.3), 0, 1);
    else if (A.baseLand) o.land = U.clamp(A.baseLand.t / (A.baseLand.dur * 0.82), 0, 1);
    if (o.lift == null && o.land == null) {
      // au repos : un hexagone discret, des modules, des repères
      ctx.strokeStyle = U.rgba(AN.CYAN, 0.35); ctx.lineWidth = Math.max(1.5, 2 / Math.max(0.2, z)); ctx.setLineDash([16, 14]);
      hexPath(ctx, 0, 0, R); ctx.stroke(); ctx.setLineDash([]);
    } else {
      if (o.lift != null) { ctx.strokeStyle = U.rgba(AN.INK, 0.3); ctx.lineWidth = 3; ctx.setLineDash([16, 12]); hexPath(ctx, 0, 0, R); ctx.stroke(); ctx.setLineDash([]); }
      B.drawPlatform(ctx, 0, 0, R, t, o);
    }
    return o;
  };
  /** Modules de défense posés dans l'hexagone central. */
  B.drawArchiveModules = function (ctx, A, t, o) {
    const p = A.profile;
    const list = B.installed(p);
    const up = o && o.lift != null ? U.easeIn(o.lift) : o && o.land != null ? Math.pow(1 - U.easeOut(o.land), 2) : 0;
    const alpha = o && o.lift != null ? 1 - U.clamp((o.lift - 0.55) / 0.45, 0, 1) : o && o.land != null ? U.clamp(o.land * 3, 0, 1) : 1;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(0, -up * 520); ctx.scale(1 + up * 0.35, 1 + up * 0.35);
    list.forEach((id, i) => { const q = B.archivePos(i, list.length); AN.StructArt.drawDefense(ctx, id, q.x, q.y, 30, t, { level: B.level(p, id) }); });
    ctx.restore();
    return { up, alpha };
  };
})();
