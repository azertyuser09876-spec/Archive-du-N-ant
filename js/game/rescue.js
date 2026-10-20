/* Compagnons perdus, mondes en sursis, missions de sauvetage et essences.
   Quand le joueur tombe, l'Artefact l'arrache au monde sans le détruire :
   les compagnons restés loin de lui ou à terre y demeurent. Le monde tient
   encore trois expéditions. Passé ce délai, il s'effondre et ne laisse
   d'eux qu'une essence. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  const R = (AN.Rescue = {});
  R.DELAY = 3; // expéditions avant l'effondrement d'un monde en sursis

  /** Après un échec : qui reste coincé dans le monde ? */
  R.onFailure = function (X, prof, result) {
    const P = AN.Profile;
    const w = X.world;
    const p = X.player;
    const lost = [];
    X.allies.forEach((a) => {
      if (a.temp) return;
      const c = P.findCreature(prof, a.uid);
      if (!c) return;
      const far = U.dist(a.x, a.y, p.x, p.y) > 260;
      if (a.downed || far) {
        c.lost = { code: w.code, seed: w.seed, threat: w.threat, tier: w.scale || 'region', zi: X.zi, until: prof.expeditions + 1 + R.DELAY };
        lost.push(c);
      } else {
        c.injured = 2;
        result.injured.push(P.displayName(c));
      }
    });
    if (lost.length) {
      prof.sursis = (prof.sursis || []).filter((s) => s.seed !== w.seed);
      prof.sursis.push({ seed: w.seed, code: w.code, region: w.region, threat: w.threat, tier: w.scale || 'region', until: prof.expeditions + 1 + R.DELAY, created: Date.now(), rep: AN.Civ ? AN.Civ.reputation(prof) : 'inconnu' });
      result.lost = lost.map((c) => P.displayName(c));
      result.sursis = true;
      prof.companions = prof.companions.filter((u) => !lost.some((c) => c.uid === u));
    }
  };

  /** Des créatures restent dans un monde qui n'est pas détruit (gardes de l'hexagone, 1.9) : il entre en sursis. */
  R.strand = function (X, prof, list, result) {
    const P = AN.Profile;
    const w = X.world;
    if (!list.length) return;
    const zi = X.base ? X.base.zi : X.zi;
    list.forEach((c) => { c.lost = { code: w.code, seed: w.seed, threat: w.threat, tier: w.scale || 'region', zi, until: prof.expeditions + 1 + R.DELAY }; });
    if (!(prof.sursis || []).some((s) => s.seed === w.seed)) {
      prof.sursis = prof.sursis || [];
      prof.sursis.push({ seed: w.seed, code: w.code, region: w.region, threat: w.threat, tier: w.scale || 'region', until: prof.expeditions + 1 + R.DELAY, created: Date.now(), rep: AN.Civ ? AN.Civ.reputation(prof) : 'inconnu' });
    }
    result.lost = (result.lost || []).concat(list.map((c) => P.displayName(c)));
    result.sursis = true;
    prof.companions = prof.companions.filter((u) => !list.some((c) => c.uid === u));
  };

  /** Destinations de sauvetage, ajoutées à la liste de l'Artefact. */
  R.destinations = function (prof) {
    const out = [];
    (prof.sursis || []).forEach((s) => {
      const uids = prof.collection.filter((c) => c.lost && c.lost.seed === s.seed).map((c) => c.uid);
      if (!uids.length) return;
      const w = AN.WorldGen.destination(s.seed, { threat: s.threat, reliability: 1, scale: s.tier || 'region', rep: s.rep });
      w.rescue = { uids, until: s.until };
      out.push(w);
    });
    return out;
  };

  /** Fait apparaître les compagnons prisonniers dans la zone où ils ont été perdus. */
  R.spawnCaptives = function (X, zone) {
    const w = X.world;
    if (!w.rescue) return;
    const prof = X.profile;
    const rng = AN.RNG.from(w.seed, 'captifs' + zone.index);
    const here = prof.collection.filter((c) => c.lost && c.lost.seed === w.seed && (c.lost.zi === zone.index || (zone.index === 0 && c.lost.zi >= w.zones.length)) && !X.freed.has(c.uid));
    if (!here.length) return;
    const T = zone.T;
    let spot = null;
    for (let k = 0; k < 600 && !spot; k++) {
      const x = rng.int(5, zone.w - 6), y = rng.int(5, zone.h - 6);
      if (zone.grid[y * zone.w + x] !== AN.ZoneGen.FLOOR) continue;
      if (Math.hypot(x * T - zone.entry.x, y * T - zone.entry.y) < 14 * T) continue;
      if (Math.hypot(x * T - zone.arena.x, y * T - zone.arena.y) < zone.arena.r + 4 * T) continue;
      spot = { x: x * T + T / 2, y: y * T + T / 2 };
    }
    if (!spot) spot = { x: zone.arena.x + zone.arena.r + 3 * T, y: zone.arena.y };
    here.forEach((c, i) => {
      const def = D.CREATURE[c.species];
      const a = (i / here.length) * Math.PI * 2;
      const e = AN.Entities.creature(def, spot.x + Math.cos(a) * 40, spot.y + Math.sin(a) * 40, { team: 'ally', variant: c.variant, hueSeed: c.hueSeed, foreign: c.foreign, uid: c.uid, nickname: c.nickname, scale: 1.4, size: AN.Bonds.sizeMul(c), stage: c.stage });
      e.captive = true;
      AN.Physics.collide(zone, e);
      X.captives.push(e);
    });
    // geôliers
    const pool = AN.WorldGen.pool(zone.biome).filter((d) => d.tier === 1 && d.attack);
    for (let k = 0; k < 2 + Math.floor(w.threat / 3) && pool.length; k++) {
      const d = pool[rng.int(0, pool.length - 1)];
      const a = rng.float(0, Math.PI * 2);
      const g = AN.Entities.creature(d, spot.x + Math.cos(a) * 110, spot.y + Math.sin(a) * 110, { threat: w.threat, rule: w.rule });
      g.temper = 'territorial';
      g.home = { x: spot.x, y: spot.y };
      AN.Physics.collide(zone, g);
      X.creatures.push(g);
    }
    zone.captiveSpot = spot;
  };

  /** Libère un prisonnier : il rejoint la troupe. */
  R.free = function (X, e) {
    X.captives = X.captives.filter((c) => c !== e);
    e.captive = false;
    e.hp = e.maxHp * 0.6;
    e.temper = 'agressif';
    const c = AN.Profile.findCreature(X.profile, e.uid);
    if (c) {
      e.loyalty = c.loyalty;
      e.abilityId = D.trait(c.species).ability;
      e.keys = D.trait(c.species).keys;
      e.powerMul = AN.Bonds.powerMul(c);
      e.cdMul = AN.Bonds.cooldownMul(c);
    }
    X.allies.push(e);
    X.freed.add(e.uid);
    AN.FX.burst(e.x, e.y, '#ffffff', 30, 200, { size: 3 });
    AN.FX.ring(e.x, e.y, AN.CYAN, e.r, e.r * 3, 0.6, 3);
    AN.Audio.play('capture_ok');
    AN.HUD.toast((e.nickname || e.def.name) + ' est libre. Ramenez-le à l’Archive.', 4);
    AN.Abilities.setup(X);
    AN.HUD.refreshAbilities(X);
  };

  /** Transforme une créature perdue en essence. */
  R.toEssence = function (prof, c, why) {
    prof.collection = prof.collection.filter((x) => x.uid !== c.uid);
    prof.companions = prof.companions.filter((u) => u !== c.uid);
    if (prof.call === c.uid) prof.call = null;
    prof.essences = prof.essences || [];
    const ess = { uid: c.uid, species: c.species, variant: c.variant, hueSeed: c.hueSeed, nickname: c.nickname, level: c.level, world: c.lost ? c.lost.code : c.world, date: Date.now() };
    prof.essences.push(ess);
    AN.Bonds.log(prof, why || ('Le monde s’est effondré. De ' + AN.Profile.displayName(c) + ', il ne reste qu’une essence.'), 'loss');
    return ess;
  };

  /** Après chaque expédition : libérations confirmées, mondes qui s'effondrent. */
  R.afterExpedition = function (prof, X, outcome) {
    const msgs = [];
    const w = X.world;
    if (w.rescue) {
      const back = outcome !== 'echec';
      prof.collection.forEach((c) => {
        if (!c.lost || c.lost.seed !== w.seed) return;
        if (X.freed.has(c.uid) && back) {
          c.lost = null;
          c.injured = 1;
          AN.Bonds.addLoyalty(c, 25);
          msgs.push(AN.Profile.displayName(c) + ' est rentré. Il ne vous a pas oublié.');
          AN.Bonds.log(prof, AN.Profile.displayName(c) + ' a été sauvé de ' + w.code + '.', 'rescue');
        }
      });
      if (back) {
        // Le monde est détruit par l'extraction : ceux qui restent deviennent des essences.
        prof.collection.filter((c) => c.lost && c.lost.seed === w.seed).forEach((c) => {
          R.toEssence(prof, c, w.code + ' a été détruit avec ' + AN.Profile.displayName(c) + '. Il ne reste qu’une essence.');
          msgs.push(AN.Profile.displayName(c) + ' n’a pas été retrouvé : il ne reste qu’une essence.');
        });
        prof.sursis = (prof.sursis || []).filter((s) => s.seed !== w.seed);
      }
    }
    // Délais écoulés
    (prof.sursis || []).slice().forEach((s) => {
      if (prof.expeditions < s.until) return;
      prof.collection.filter((c) => c.lost && c.lost.seed === s.seed).forEach((c) => {
        R.toEssence(prof, c);
        msgs.push(s.code + ' s’est effondré. De ' + AN.Profile.displayName(c) + ', il ne reste qu’une essence.');
      });
      prof.sursis = prof.sursis.filter((x) => x !== s);
    });
    return msgs;
  };

  /* ---------- héritage ---------- */
  R.reviveCost = function (ess) {
    const def = D.CREATURE[ess.species];
    const res = (def.produces && def.produces.res) || Object.keys(def.drops || { fibre: 1 })[0];
    return { essence: 1 + Math.min(2, def.tier), [res]: 10 * (1 + def.tier) };
  };
  R.revive = function (prof, ess) {
    const cost = R.reviveCost(ess);
    if (!AN.Profile.pay(prof, cost)) return null;
    prof.essences = prof.essences.filter((x) => x !== ess);
    const c = AN.Save.normalizeCreature({
      uid: U.uid('c'), species: ess.species, variant: ess.variant, hueSeed: ess.hueSeed, foreign: null, nickname: ess.nickname,
      injured: 0, home: AN.Profile.bestHome(prof, ess.species), world: 'Archive', captured: Date.now(), level: 1, loyalty: 85, reborn: true,
    });
    prof.collection.push(c);
    AN.Bonds.log(prof, AN.Profile.displayName(c) + ' renaît de son essence.', 'rescue');
    return c;
  };
  /** Absorber une essence : un bonus permanent, discret. */
  R.absorb = function (prof, ess) {
    const def = D.CREATURE[ess.species];
    prof.legacy = prof.legacy || { capture: 0, hp: 0, loyalty: 0 };
    let kind = 'loyalty';
    if (def.roles.includes('capture') || def.roles.includes('eclaireur')) kind = 'capture';
    else if (def.roles.includes('combat') || def.roles.includes('soutien')) kind = 'hp';
    prof.legacy[kind] = (prof.legacy[kind] || 0) + 1;
    prof.essences = prof.essences.filter((x) => x !== ess);
    AN.Bonds.log(prof, 'Vous avez absorbé l’essence de ' + (ess.nickname || def.name) + '.', 'rescue');
    return kind;
  };
  R.LEGACY = {
    capture: 'Rayon de capture +3 % par essence',
    hp: '+4 points de vie par essence',
    loyalty: 'Loyauté de toutes vos créatures qui monte plus vite',
  };
})();
