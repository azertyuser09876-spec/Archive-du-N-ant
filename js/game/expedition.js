/* Scène d'expédition : un monde fait de plusieurs zones, son exploration,
   ses interactions, son butin et la fin de l'expédition. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const I = AN.Input;
  const TAU = Math.PI * 2;

  const Exp = (AN.Expedition = {});
  /** Message différé de l'expédition : oublié si elle est finie entre-temps. */
  const later = (X, fn, ms) => setTimeout(() => { if (AN.X === X && AN.Game.scene === Exp.scene) fn(); }, ms);

  /* ======================= Démarrage ======================= */
  /** Démarre une expédition, ou reprend celle qu'un point de reprise décrit (opts.snap). */
  Exp.start = function (profile, world, opts = {}) {
    const P = AN.Profile;
    const snap = opts.snap || null;
    const L = JSON.parse(JSON.stringify(snap ? snap.loadout : profile.loadout));
    const consumables = [];
    if (snap) {
      // reprise : l'équipement et les consommables ont déjà quitté la réserve au départ
      (snap.consumables || []).forEach((c) => consumables.push({ id: c.id, n: c.n, start: c.start || c.n }));
    } else {
      // L'équipement emporté quitte la réserve : il est en jeu.
      D.GEAR_SLOTS.forEach((s) => {
        const id = L[s];
        if (!id) return;
        if (!D.GEAR[id] || (profile.owned[id] || 0) <= 0) { L[s] = s === 'ranged' ? 'eclat' : s === 'melee' ? 'lame_neant' : s === 'bag' ? 'sacoche' : null; return; }
        if (!D.GEAR[id].bound) profile.owned[id]--;
      });
      (L.consumables || []).forEach((c) => {
        const n = Math.min(c.n, profile.owned[c.id] || 0, P.consumableMax(profile));
        if (n > 0) { consumables.push({ id: c.id, n, start: n }); profile.owned[c.id] -= n; }
      });
      P.cleanCompanions(profile);
      profile.pendingExpedition = { code: world.code, loadout: L, consumables: consumables.map((c) => ({ id: c.id, n: c.n })) };
      AN.Save.write(profile);
    }

    const X = {
      profile, world, loadout: L, consumables,
      zones: [], zone: null, zi: -1,
      player: AN.PlayerCtl.create(0, 0),
      creatures: [], allies: [], pickups: [],
      bag: {}, cargo: [], conquered: new Set(), heartDone: false,
      time: 0, flowT: 0, flow: null, fogT: 0, holdT: 0, holdKey: null, emergencyT: 0,
      stats: { kills: 0, captures: 0, harvested: 0 },
      cam: AN.Game.cam, collapse: null, ending: false, beam: null, decoy: null,
      weather: [], lightningT: 6, msgs: [],
      activeBoss: null, captives: [], freed: new Set(), mount: null, visionT: 0,
      civ: world.civ ? Object.assign({}, world.civ, { state: 'unmet', met: false, boarded: 0, killed: 0 }) : null, civils: [],
      search: profile.search ? { kind: profile.search.kind, id: profile.search.id } : null,
    };
    AN.X = X;
    AN.Combat.reset(X);
    AN.Cosmic.setup(X);

    X.bagCount = () => U.sumValues(X.bag);
    X.bagFree = () => X.S.bagCap - X.bagCount();
    X.addToBag = (res, n) => {
      const k = Math.min(n, X.bagFree());
      if (k <= 0) return 0;
      X.bag[res] = (X.bag[res] || 0) + k;
      AN.HUD.bagPulse(res);
      return k;
    };
    X.bagValue = () => Object.entries(X.bag).reduce((s, [k, n]) => s + D.resValue(k) * n, 0);
    X.cargoUsed = () => AN.Tools.cargoUsed(X);
    X.cargoValue = () => X.cargo.reduce((s, c) => s + (c.structure ? 150 * c.weight : c.inhabitants ? 30 * c.inhabitants : c.ark ? 400 : c.egg ? 40 * ((D.VARIANT[c.variant] || {}).value || 1) : AN.Entities.value(c.species, c.variant)), 0);
    X.conquer = (zi, boss) => Exp.conquer(X, zi, boss);
    X.onDeath = () => Exp.onDeath(X);

    // Compagnons
    const rank = P.rank(profile).index;
    profile.companions.forEach((uid) => {
      const c = P.findCreature(profile, uid);
      if (!c) return;
      const def = D.CREATURE[c.species];
      const tr = D.trait(c.species);
      const pw = AN.Bonds.powerMul(c);
      // forme réduite : un géant accompagne le joueur à une taille praticable, avec une partie de sa vigueur
      const reduced = P.isReduced(c.species);
      const shrink = reduced ? Math.min(1, 50 / def.r) : 1;
      const a = AN.Entities.creature(def, 0, 0, { team: 'ally', variant: c.variant, hueSeed: c.hueSeed, foreign: c.foreign, scale: (1.4 + rank * 0.45 + def.tier * 0.3) * pw * (reduced ? 0.35 : 1), uid: c.uid, nickname: c.nickname, size: AN.Bonds.sizeMul(c) * shrink, stage: c.stage });
      a.reduced = reduced;
      a.temper = 'agressif';
      a.dmgMul *= pw;
      a.loyalty = c.loyalty;
      a.level = c.level;
      a.powerMul = pw;
      a.cdMul = AN.Bonds.cooldownMul(c);
      a.abilityId = tr.ability;
      a.keys = tr.keys;
      a.kills = 0;
      if (a.boss === undefined && def.tier >= 2) { a.isBoss = false; }
      X.allies.push(a);
    });
    AN.PlayerCtl.computeStats(X);
    X.player.hp = X.player.maxHp;
    AN.Abilities.setup(X);

    if (snap) AN.Resume.prepare(X, snap);
    Exp.enterZone(X, snap ? snap.zi : 0, null);
    AN.Game.setScene(Exp.scene);
    AN.HUD.showExpedition(X);
    if (world.tutorial) AN.Tutorial.setup(X);
    AN.Audio.play('portal');
    if (snap) { AN.Resume.after(X, snap); return X; }
    FX.ring(X.player.x, X.player.y, AN.CYAN, 10, 160, 0.9, 4);
    FX.burst(X.player.x, X.player.y, '#ffffff', 40, 240, { size: 3 });
    const sc = world.scan;
    if (world.tutorial) return X;
    later(X, () => AN.HUD.toast('Arrivée : ' + world.code + ', ' + world.region + (X.echelon.id !== 'region' ? ' (' + X.echelon.name.toLowerCase() + ')' : '') + '. Menace ' + world.threat + '.', 5), 300);
    if (X.echelon.id !== 'region') later(X, () => AN.HUD.toast(X.echelon.name + ' : ' + X.echelon.moveDesc + '. Menace propre : ' + X.echelon.threatDesc.toLowerCase() + '.', 7), 2600);
    if (!profile.flags.firstExpedition) {
      profile.flags.firstExpedition = 1;
      later(X, () => AN.HUD.toast('Tirez (' + AN.Input.label('Mouse0') + '), frappez (' + AN.Input.label('Mouse2') + '), esquivez (' + AN.Input.label('Space') + '). Affaiblissez une créature, puis maintenez ' + AN.Input.label('KeyF') + ' pour la capturer.', 9), 2600);
    }
    if (world.rule !== 'aucune') later(X, () => AN.HUD.toast('Règle de ce monde : ' + D.RULES.find((r) => r.id === world.rule).name + '. ' + D.RULES.find((r) => r.id === world.rule).desc, 6), 5200);
    return X;
  };

  /* ======================= Zones ======================= */
  function variantFor(rng, forced) {
    if (forced) return forced;
    return rng.weighted(D.VARIANTS.map((v) => [v.id, v.weight]));
  }

  function spawnZone(X, zone) {
    const w = X.world;
    zone.groups.forEach((g, gi) => {
      const def = D.CREATURE[g.species];
      if (!def) return;
      const rng = AN.RNG.from(w.seed, 'g' + zone.index + '_' + gi);
      for (let k = 0; k < g.count; k++) {
        let x = g.x + rng.float(-40, 40), y = g.y + rng.float(-40, 40);
        if (Z.isSolid(Z.tileAt(zone, x, y))) { x = g.x; y = g.y; }
        const e = AN.Entities.creature(def, x, y, { threat: w.threat, variant: variantFor(rng, g.variant), hueSeed: rng.int(0, 999), foreign: g.foreign, rule: w.rule, move: g.move, group: gi });
        e.home = { x: g.x, y: g.y };
        if (g.temper) e.temper = g.temper;
        if (def.tier >= 2) AN.Boss.init(e, { arena: { x: g.x, y: g.y, r: 280 }, zoneIndex: zone.index, errant: true });
        X.creatures.push(e);
      }
    });
    if (!zone.state.conquered && zone.guardian) {
      const def = D.CREATURE[zone.guardian];
      const rng = AN.RNG.from(w.seed, 'boss' + zone.index);
      const e = AN.Entities.creature(def, zone.arena.x, zone.arena.y, { threat: w.threat, variant: rng.chance(0.08) ? 'chromatique' : 'commun', hueSeed: rng.int(0, 999), rule: w.rule, foreign: def.biomes.includes(zone.biome) ? null : zone.biome });
      AN.Boss.init(e, { arena: zone.arena, zoneIndex: zone.index, guardian: true });
      X.creatures.push(e);
      zone.state.boss = e;
    }
    AN.Rescue.spawnCaptives(X, zone);
    AN.Civ.spawnVillage(X, zone);
  }

  Exp.zoneSpec = (X, zi) => (zi >= X.world.zones.length ? X.world.heart : X.world.zones[zi]);

  Exp.enterZone = function (X, zi, fromZi) {
    // Mémorise l'état de la zone quittée.
    if (X.zone) {
      X.zone.state.saved = X.creatures.filter((c) => c.alive && c.team === 'wild');
      X.zone.state.pickups = X.pickups;
      X.zone.state.captives = X.captives;
      X.zone.state.civils = X.civils;
      if (X.activeBoss) { X.activeBoss.boss.active = false; X.activeBoss = null; }
    }
    let zone = X.zones[zi];
    if (!zone) {
      zone = Z.generate(X.world, zi);
      zone.state = { conquered: false, saved: null, pickups: [], fog: new Uint8Array(zone.w * zone.h), boss: null };
      X.zones[zi] = zone;
      // reprise d'une expédition sauvegardée : ce qui avait changé dans cette zone
      if (X.restore && X.restore[zi]) AN.Resume.applyZone(X, zone, X.restore[zi]);
    }
    X.zone = zone;
    X.zi = zi;
    X.creatures = [];
    AN.Combat.reset(X);
    X.pickups = zone.state.pickups || [];
    X.captives = [];
    X.civils = [];
    if (zone.state.saved) {
      X.creatures = zone.state.saved;
      X.creatures.forEach((c) => { c.vx = c.vy = c.kbx = c.kby = 0; c.capture = 0; });
      X.captives = zone.state.captives || [];
      X.civils = zone.state.civils || [];
    } else spawnZone(X, zone);

    const seed = AN.hash(X.world.seed + ':canvas:' + zi);
    X.canvas = AN.Terrain.renderZone(zone, seed);
    X.thumb = AN.Terrain.thumb(zone, 3);
    X.fogCanvas = AN.Terrain.canvas(zone.w * 3, zone.h * 3);
    const fctx = X.fogCanvas.getContext('2d');
    fctx.fillStyle = '#10131c';
    fctx.fillRect(0, 0, X.fogCanvas.width, X.fogCanvas.height);
    for (let i = 0; i < zone.w * zone.h; i++) if (zone.state.fog[i]) fctx.clearRect((i % zone.w) * 3, ((i / zone.w) | 0) * 3, 3, 3);
    X.fogDirty = true;

    const p = X.player;
    let start = zone.entry;
    if (fromZi != null) {
      const g = zone.gates.find((gg) => gg.to === fromZi) || zone.gates[0];
      const a = Math.atan2(zone.h * Z.T / 2 - g.y, zone.w * Z.T / 2 - g.x);
      start = { x: g.x + Math.cos(a) * 70, y: g.y + Math.sin(a) * 70 };
    }
    p.x = start.x; p.y = start.y; p.vx = p.vy = p.kbx = p.kby = 0;
    AN.Physics.collide(zone, p);
    X.allies.forEach((a, i) => {
      const ang = (i / Math.max(1, X.allies.length)) * TAU;
      a.x = p.x + Math.cos(ang) * 40; a.y = p.y + Math.sin(ang) * 40;
      a.home = { x: a.x, y: a.y };
      AN.Physics.collide(zone, a);
    });
    if (X.mount) { X.mount.x = p.x; X.mount.y = p.y; }
    X.flow = AN.Physics.flowField(zone, Math.floor(p.x / Z.T), Math.floor(p.y / Z.T));
    X.cam.x = p.x; X.cam.y = p.y; X.cam.zoom = Exp.baseZoom();
    X.weather = [];
    X.biome = D.BIOME[zone.biome];
    AN.FX.clear();
    if (X.droneSound) X.droneSound.stop();
    // musique et bourdon s'accordent sur le biome de la zone (1.8)
    X.droneSound = AN.Audio.loop('drone_world', { root: AN.Music ? AN.Music.rootHz(zone.biome, X.world.scale) : null });
    X.droneSound.set(0.2 + X.biome.dark * 0.5);
    if (AN.Music) AN.Music.mood('expedition', { seed: X.world.seed, biome: zone.biome, scale: X.world.scale });
    if (AN.HUD.ready) AN.HUD.zoneChanged(X);
    const spec = Exp.zoneSpec(X, zi);
    if (fromZi != null) AN.HUD.toast((zone.isHeart ? X.echelon.heart : X.echelon.unit + ' ' + (zi + 1) + ' sur ' + X.world.zones.length) + ' : ' + spec.name, 3.5);
    if (X.search) setTimeout(() => { if (AN.X === X && X.zi === zi) AN.Search.onEnterZone(X); }, fromZi == null ? 7800 : 1400);
    AN.Events.onEnterZone(X);
    if (fromZi != null) X.snapT = Math.min(X.snapT == null ? 2 : X.snapT, 2);
  };

  Exp.baseZoom = () => {
    const W = AN.Game.cam.W, H = AN.Game.cam.H;
    const k = AN.X && AN.X.echelon ? AN.X.echelon.zoom : 1;
    return U.clamp(Math.min(W, H) / 640, 0.75, 1.35) * k;
  };

  /* ======================= Conquête ======================= */
  Exp.conquer = function (X, zi, boss) {
    const zone = X.zones[zi];
    if (!zone || zone.state.conquered) return;
    zone.state.conquered = true;
    zone.state.boss = null;
    X.conquered.add(zi);
    AN.Audio.play('rank');
    FX.ring(boss.x, boss.y, AN.CYAN, 20, 600, 1.4, 5);
    if (zone.isHeart) {
      X.heartDone = true;
      AN.HUD.toast('Le cœur de la région est conquis. Son territoire peut rejoindre l’Archive (' + D.TERRITORY_WEIGHT.coeur + ' places de soute).', 7);
    } else {
      AN.HUD.toast('Zone conquise : ' + Exp.zoneSpec(X, zi).name + '. Son territoire peut être transféré (' + D.TERRITORY_WEIGHT.territoire + ' places de soute).', 7);
      const regular = X.world.zones.length;
      let all = true;
      for (let i = 0; i < regular; i++) if (!X.conquered.has(i)) all = false;
      if (all) later(X, () => AN.HUD.toast('Tous les gardiens sont tombés. Le passage vers le Cœur de la région est ouvert.', 7), 2500);
    }
    AN.HUD.zoneChanged(X);
  };
  Exp.heartOpen = (X) => { for (let i = 0; i < X.world.zones.length; i++) if (!X.conquered.has(i)) return false; return true; };

  /* ======================= Interactions ======================= */
  function interactables(X) {
    const p = X.player;
    const zone = X.zone;
    // priorité absolue : relever un compagnon, achever un gardien épuisé
    for (const a of X.allies) if (a.downed && U.dist(a.x, a.y, p.x, p.y) < 54) return { kind: 'revive', target: a, text: 'Relever ' + (a.nickname || a.def.name), hold: 1.4 };
    for (const e of X.creatures) if (e.alive && e.boss && e.boss.exhausted && U.dist(e.x, e.y, p.x, p.y) < e.r + 60) return { kind: 'finish', target: e, text: 'Achever ' + e.def.name + ' (sans le capturer)', hold: 0.6 };
    for (const c of X.captives) if (U.dist(c.x, c.y, p.x, p.y) < c.r + 50) return { kind: 'free', target: c, text: 'Libérer ' + (c.nickname || c.def.name), hold: 1.6 };
    const L = AN.Civ.leader(X);
    const rallying = X.civ && (X.civ.state === 'rally' || X.collapse);
    if (L && !rallying && U.dist(L.x, L.y, p.x, p.y) < L.r + 60) {
      if (L.team === 'civil') return { kind: 'talk', target: L, text: 'Parler à ' + X.civ.leader + ' (' + D.PEOPLE[X.civ.people].Name + ')', hold: 0.25 };
      if (L.weak && X.civ.attitude === 'hostiles') return { kind: 'parley', target: L, text: 'Parlementer avec ' + X.civ.leader, hold: 0.4 };
    }
    // sinon : l'élément le plus proche, rapporté à sa portée d'interaction
    let best = null, bs = 1;
    const consider = (d, range, make) => { const s = d / range; if (s < bs) { bs = s; best = make; } };
    for (const n of zone.nodes) {
      if (n.uses <= 0) continue;
      if (n.deep && !(X.T && X.T.deep)) { consider(U.dist(n.x, n.y, p.x, p.y), 50, () => ({ kind: 'deep_locked', target: n, locked: true, text: 'Filon profond de ' + D.RESOURCES[n.res].name + ' : une foreuse est nécessaire', hold: 0.3 })); continue; }
      consider(U.dist(n.x, n.y, p.x, p.y), 50, () => ({ kind: 'harvest', target: n, text: (n.deep ? 'Forer le filon : ' : n.meteor ? 'Ramasser le fragment : ' : 'Récolter : ') + D.RESOURCES[n.res].name, hold: AN.Tools.harvestHold(X) * (n.deep ? 1.6 : 1) }));
    }
    AN.Tools.interactables(X, consider);
    AN.Structures.interactables(X, consider);
    for (const r of zone.ruins) {
      if (r.used) continue;
      consider(U.dist(r.x, r.y, p.x, p.y), 56, () => ({ kind: 'ruin', target: r, text: r.kind === 'cache' ? 'Fouiller la structure' : 'Lire l’inscription', hold: 0.5 }));
    }
    for (const g of zone.gates) {
      consider(U.dist(g.x, g.y, p.x, p.y), 64, () => {
        const locked = g.kind === 'heart' && !Exp.heartOpen(X);
        const spec = Exp.zoneSpec(X, g.to);
        return { kind: 'gate', target: g, locked, text: locked ? 'Passage scellé : conquérez les ' + X.world.zones.length + ' gardiens' : 'Passer vers : ' + spec.name, hold: 0.4 };
      });
    }
    if (L && rallying && L.team === 'civil') consider(U.dist(L.x, L.y, p.x, p.y), L.r + 24, () => ({ kind: 'talk', target: L, text: 'Parler à ' + X.civ.leader, hold: 0.25 }));
    AN.Cosmic.interactables(X, consider);
    if (!X.collapse) for (const pl of zone.plates) consider(U.dist(pl.x, pl.y, p.x, p.y), Z.T * 2.4, () => ({ kind: 'extract', target: pl, text: 'Activer l’Artefact : extraction', hold: 0.5 }));
    for (const v of zone.vaults || []) {
      if (v.opened) continue;
      consider(U.dist(v.x, v.y, p.x, p.y), 100, () => {
        const K = D.KEYS[v.key];
        const holder = AN.Keys.holder(X, v.key);
        return holder
          ? { kind: 'vault', target: v, holder, text: K.barrier + ' : ' + K.verb + ' (' + (holder.nickname || holder.def.name) + ')', hold: 1.2 }
          : { kind: 'vault', target: v, locked: true, text: K.barrier + ' : un compagnon doté de « ' + K.name + ' » est nécessaire', hold: 0.3 };
      });
    }
    for (const egg of zone.eggs || []) {
      if (egg.taken) continue;
      consider(U.dist(egg.x, egg.y, p.x, p.y), 46, () => ({ kind: 'egg', target: egg, text: 'Emporter l’œuf de ' + D.CREATURE[egg.species].name + ' (1 place de soute)', hold: 0.6 }));
    }
    return best ? best() : null;
  }

  function doInteract(X, it) {
    const p = X.player;
    switch (it.kind) {
      case 'revive':
        it.target.downed = false;
        it.target.hp = it.target.maxHp * 0.4;
        FX.burst(it.target.x, it.target.y, '#5fd08a', 16, 120, { size: 3 });
        AN.HUD.toast((it.target.nickname || it.target.def.name) + ' est de nouveau sur pied.');
        break;
      case 'finish': AN.Boss.finish(X, it.target); break;
      case 'free': AN.Rescue.free(X, it.target); break;
      case 'talk': AN.Civ.talk(X); break;
      case 'parley': AN.UI.civParley(X); break;
      case 'anchor': AN.Cosmic.plant(X, it.target, it.boss); break;
      case 'vault': {
        if (it.locked) { AN.Audio.play('ui_err'); AN.HUD.toast(it.text + '. Ses clés sont indiquées dans sa fiche.', 4); return; }
        AN.Keys.open(X, it.target, it.holder);
        break;
      }
      case 'egg': {
        if (X.cargoUsed() + 1 > X.cargoCap) { AN.Audio.play('ui_err'); AN.HUD.toast('Soute pleine : un œuf occupe une place.'); return; }
        const egg = it.target;
        egg.taken = true;
        X.cargo.push({ egg: true, species: egg.species, variant: egg.variant, hueSeed: egg.hueSeed, zone: X.zi });
        AN.FX.stream(egg.x, egg.y, p.x, p.y, '#fff3d0', { life: 0.5, size: 6 });
        AN.Audio.play('capture_ok');
        AN.HUD.toast('Œuf de ' + D.CREATURE[egg.species].name + ' dans la soute. Il éclora dans l’Archive.', 4);
        break;
      }
      case 'harvest': {
        const n = it.target;
        const got = X.addToBag(n.res, n.amount + AN.Tools.harvestBonus(X));
        if (got <= 0) { AN.HUD.toast('Sac plein. Ouvrez le sac (Tab) pour faire de la place.'); return; }
        X.stats.harvested += got;
        n.amount -= got;
        if (n.amount <= 0) { n.uses--; n.amount = n.uses > 0 ? Math.max(1, Math.round(n.amount + 2)) : 0; }
        FX.burst(n.x, n.y, D.RESOURCES[n.res].color, 12, 140, { size: 3 });
        FX.text(n.x, n.y - 16, '+' + got + ' ' + D.RESOURCES[n.res].name, AN.INK, { size: 12 });
        AN.Audio.play('harvest');
        break;
      }
      case 'ruin': {
        const r = it.target;
        r.used = true;
        if (r.kind === 'cache') {
          const b = D.BIOME[X.zone.biome];
          const drops = {};
          Object.keys(b.resources).forEach((k) => (drops[k] = 2 + Math.floor(Math.random() * 3)));
          drops.essence = Math.random() < 0.35 ? 1 : 0;
          if (!drops.essence) delete drops.essence;
          AN.Combat.drop(X, r.x, r.y, drops, 1);
          AN.HUD.toast('Une réserve oubliée. Quelqu’un comptait revenir.');
        } else {
          const lore = D.LORE[r.lore];
          const known = X.profile.lore.includes(lore.id);
          let L = lore;
          if (known) {
            const unknown = D.LORE.filter((l) => !X.profile.lore.includes(l.id));
            if (unknown.length) L = unknown[Math.floor(Math.random() * unknown.length)];
          }
          if (!X.profile.lore.includes(L.id)) X.profile.lore.push(L.id);
          AN.Save.write(X.profile);
          AN.UI.lore(L);
        }
        AN.Audio.play('ui_ok');
        break;
      }
      case 'gate':
        if (it.locked) { AN.Audio.play('ui_err'); AN.HUD.toast(it.text); return; }
        AN.Audio.play('portal');
        AN.Game.transition(() => Exp.enterZone(X, it.target.to, X.zi));
        break;
      case 'extract':
        AN.UI.transferDialog(X, it.target);
        break;
      default:
        if (!AN.Tools.interact(X, it)) AN.Structures.interact(X, it);
    }
  }

  function updateInteract(X, dt) {
    if (X.ending) { AN.HUD.prompt(null); return; }
    const it = X.player.alive ? interactables(X) : null;
    const key = it ? it.kind + ':' + (it.target.id || it.target.x + ',' + it.target.y) : null;
    if (key !== X.holdKey) { X.holdKey = key; X.holdT = 0; }
    if (it && I.down('KeyE')) {
      X.holdT += dt;
      if (X.holdT >= it.hold) { X.holdT = -1e9; doInteract(X, it); }
    } else if (X.holdT > 0 || X.holdT < 0) {
      if (!I.down('KeyE')) X.holdT = 0;
    }
    AN.HUD.prompt(it ? { text: it.text, key: 'E', progress: X.holdT > 0 ? X.holdT / it.hold : 0, locked: it.locked } : null);
  }

  /* ======================= Fin d'expédition ======================= */
  Exp.onDeath = function (X) {
    if (X.ending) return;
    X.ending = true;
    AN.HUD.toast('Vous êtes tombé. L’Artefact vous arrache à ce monde.', 4);
    AN.Audio.play('shatter');
    setTimeout(() => Exp.finish(X, 'echec'), 1600);
  };

  Exp.emergency = function (X) {
    if (X.ending) return;
    X.ending = true;
    FX.ring(X.player.x, X.player.y, AN.CYAN, 10, 400, 0.8, 6);
    AN.Audio.play('portal');
    AN.HUD.toast('Extraction d’urgence : l’essentiel du butin est abandonné.', 4);
    setTimeout(() => Exp.finish(X, 'urgence'), 900);
  };

  /**
   * Applique le résultat au profil, sauvegarde, puis lance la cinématique.
   * selection : { territories: [indices de zones] } pour une extraction normale.
   */
  Exp.finish = function (X, outcome) {
    // Le Seuil : sans extraction (ou en partie d'essai), on en sort sans rien garder.
    if (X.tuto && (outcome !== 'extrait' || X.tuto.sandbox)) { AN.Tutorial.leave(X, outcome); return; }
    const prof = X.profile;
    const P = AN.Profile;
    const w = X.world;
    if (X.beam && X.beam.sound) X.beam.sound.stop();
    if (X.collapse && X.collapse.sound) X.collapse.sound.stop();
    if (X.droneSound) X.droneSound.stop();
    const result = { outcome, world: w, creatures: [], territories: [], resources: {}, lostGear: [], injured: [], hatched: [], lost: [], levels: [], rescueMsgs: [] };

    // Ressources (le collecteur d'urgence sauve davantage du sac)
    const T = X.T || {};
    if (outcome === 'extrait') result.resources = { ...X.bag };
    else if (outcome === 'echec' && T.keepOnDeath) {
      for (const k in X.bag) { const n = Math.floor(X.bag[k] * T.keepOnDeath); if (n > 0) result.resources[k] = n; }
    } else if (outcome === 'urgence') {
      const keep = Math.max(T.keepBag || 0, P.upgradeValue(prof, 'stabilisateur').keep);
      for (const k in X.bag) { const n = Math.floor(X.bag[k] * keep); if (n > 0) result.resources[k] = n; }
    }
    for (const k in result.resources) P.add(prof, k, result.resources[k]);

    // Équipement
    D.GEAR_SLOTS.forEach((s) => {
      const id = X.loadout[s];
      if (!id || !D.GEAR[id] || D.GEAR[id].bound) return;
      if (outcome === 'echec') result.lostGear.push(D.GEAR[id].name);
      else prof.owned[id] = (prof.owned[id] || 0) + 1;
    });
    X.consumables.forEach((c) => {
      if (outcome === 'echec') { if (c.n > 0) result.lostGear.push(c.n + ' × ' + D.GEAR[c.id].name); }
      else if (c.n > 0) prof.owned[c.id] = (prof.owned[c.id] || 0) + c.n;
    });
    if (outcome === 'echec') {
      // si l'équipement perdu était dans la configuration, on revient aux objets de base
      D.GEAR_SLOTS.forEach((s) => {
        const id = prof.loadout[s];
        if (id && D.GEAR[id] && !D.GEAR[id].bound && !(prof.owned[id] > 0)) prof.loadout[s] = s === 'ranged' ? 'eclat' : s === 'melee' ? 'lame_neant' : s === 'bag' ? 'sacoche' : null;
      });
    }

    // Territoires (extraction normale uniquement)
    const terrByZone = {};
    if (outcome === 'extrait') {
      const sel = (X.collapse && X.collapse.selection) || { territories: [] };
      const monde = X.echelon.id === 'monde';
      const mk = (zi, quality) => {
        const spec = Exp.zoneSpec(X, zi);
        const seed = AN.hash(w.seed + ':terr:' + zi + ':' + quality);
        // le territoire choisit sa forme en arrivant : il comble les creux de l'Archive (1.7)
        const slot = AN.Arrange.arrival(prof, quality, spec.biome, seed);
        const cells = slot.cells;
        const t = { uid: U.uid('t'), biome: spec.biome, mix: spec.mix || null, quality, q: slot.q, r: slot.r, cells, world: w.code, region: w.region, zoneName: spec.name, seed, created: Date.now(), stock: {} };
        prof.territories.push(t);
        result.territories.push(t);
        return t;
      };
      sel.territories.forEach((zi) => { terrByZone[zi] = mk(zi, zi >= w.zones.length ? (monde ? 'cratere' : 'coeur') : (monde ? 'continent' : 'territoire')); });
      if (!terrByZone[X.zi]) mk(X.zi, 'fragment');
      // Astres : des zones entières retenues par l'Ancrage
      result.astres = [];
      (sel.astres || []).forEach((zi) => {
        const spec = Exp.zoneSpec(X, zi);
        const A = D.astreFor(spec.biome);
        if (!A) return;
        prof.cosmos = prof.cosmos || { astres: [] };
        const astre = { uid: U.uid('a'), biome: spec.biome, kind: A.kind, name: A.name, layer: A.layer, world: w.code, zoneName: spec.name, seed: AN.hash(w.seed + ':astre:' + zi), created: Date.now() };
        prof.cosmos.astres.push(astre);
        result.astres.push(astre);
      });
      // Structures démontées : elles attendent d'être reconstruites dans l'Archive
      result.structures = AN.Structures.afterExtraction(prof, X);
      // Créatures
      X.cargo.forEach((c) => {
        if (c.inhabitants || c.ark || c.structure) return;
        let home = null;
        if (c.guardianOf != null && terrByZone[c.guardianOf]) home = terrByZone[c.guardianOf].uid;
        if (!home) home = P.bestHome(prof, c.species);
        const entry = AN.Save.normalizeCreature({ uid: U.uid('c'), species: c.species, variant: c.variant, hueSeed: c.hueSeed, foreign: c.foreign || null, nickname: null, injured: 0, home, world: w.code, captured: Date.now(), loyalty: c.egg ? 90 : 25 });
        prof.collection.push(entry);
        const b = P.markSeen(prof, c.species);
        if (c.egg) {
          entry.born = Date.now();
          entry.foreign = null;
          result.hatched.push(entry);
          b.born = (b.born || 0) + 1;
        } else {
          result.creatures.push(entry);
          b.captured = (b.captured || 0) + 1;
        }
      });
      prof.stats.captures += X.cargo.filter((c) => c.species && !c.egg && !c.inhabitants && !c.ark).length;
      prof.stats.structures = (prof.stats.structures || 0) + (result.structures || []).length;
      prof.stats.guardians += X.cargo.filter((c) => c.species && !c.egg && D.CREATURE[c.species].tier === 2).length;
      prof.stats.ultras += X.cargo.filter((c) => c.species && !c.egg && D.CREATURE[c.species].tier === 3).length;
      prof.stats.cosmic = (prof.stats.cosmic || 0) + X.cargo.filter((c) => c.species && !c.egg && D.CREATURE[c.species].tier >= 4).length;
    }

    // Compagnons : après un échec, ceux qui étaient loin ou à terre restent dans le monde (voir rescue.js).
    // Sinon, un compagnon à terre revient blessé.
    if (outcome === 'echec') AN.Rescue.onFailure(X, prof, result);
    else X.allies.forEach((a) => {
      if (a.temp) return;
      const c = P.findCreature(prof, a.uid);
      if (c && a.downed) { c.injured = 2; result.injured.push(P.displayName(c)); }
    });
    result.levels = AN.Bonds.afterExpedition(prof, X, outcome);
    result.civ = AN.Civ.finish(X, outcome, X.collapse && X.collapse.selection, terrByZone, !result.sursis);
    // Les blessés des expéditions précédentes récupèrent.
    const heal = 1 + P.powers(prof).heal;
    prof.collection.forEach((c) => { if (c.injured > 0 && !c.lost && !result.injured.includes(P.displayName(c))) c.injured = Math.max(0, c.injured - heal); });
    P.cleanCompanions(prof);

    prof.expeditions++;
    prof.stats.worlds++;
    prof.stats.kills += X.stats.kills;
    if (outcome === 'echec') prof.stats.deaths++;
    if (outcome === 'urgence') prof.stats.emergencies++;
    result.rescueMsgs = AN.Rescue.afterExpedition(prof, X, outcome);
    if (result.hatched.length) result.hatched.forEach((c) => AN.Bonds.log(prof, 'Un œuf a éclos : ' + P.displayName(c) + '.', 'birth'));
    prof.journal.unshift({
      code: w.code, region: w.region, biome: w.primary, threat: w.threat, outcome, date: Date.now(), scale: w.scale || 'region',
      creatures: result.creatures.map((c) => P.displayName(c)), territories: result.territories.length,
      resources: U.sumValues(result.resources),
    });
    prof.journal = prof.journal.slice(0, 60);
    prof.pendingExpedition = null;
    prof.destinations = null;
    prof.destByScale = {};
    if (X.tuto) AN.Tutorial.onExtracted(prof);
    AN.Save.write(prof);

    AN.HUD.hideExpedition();
    AN.UI.closeAll();
    const thumbs = X.world.zones.map((z, i) => (X.zones[i] ? AN.Terrain.thumb(X.zones[i], 2) : null));
    AN.Cinematic.start({ result, X, thumbs, snapshot: X.canvas, zone: X.zone, zi: X.zi, player: { x: X.player.x, y: X.player.y } });
    AN.X = null;
  };

  /* ======================= Mise à jour ======================= */
  /** Révèle la carte autour du joueur sur un rayon donné (en tuiles). */
  Exp.reveal = (X, R) => revealFog(X, R);

  function revealFog(X, radius) {
    const z = X.zone;
    const p = X.player;
    const R = radius || (X.powers.reveal ? 999 : X.S.reveal);
    const tx = Math.floor(p.x / Z.T), ty = Math.floor(p.y / Z.T);
    const fctx = X.fogCanvas.getContext('2d');
    const x0 = Math.max(0, tx - R), x1 = Math.min(z.w - 1, tx + R), y0 = Math.max(0, ty - R), y1 = Math.min(z.h - 1, ty + R);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * z.w + x;
      if (z.state.fog[i]) continue;
      if (R < 999 && (x - tx) ** 2 + (y - ty) ** 2 > R * R) continue;
      z.state.fog[i] = 1;
      fctx.clearRect(x * 3, y * 3, 3, 3);
      X.fogDirty = true;
    }
  }

  function updateLightning(X, dt) {
    if (X.world.rule !== 'orage' && !X.biome.lightning) return;
    X.lightningT -= dt;
    if (X.lightningT > 0) return;
    X.lightningT = X.world.rule === 'orage' ? 3 + Math.random() * 3 : 7 + Math.random() * 6;
    const p = X.player;
    const a = Math.random() * TAU, r = 40 + Math.random() * 180;
    const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    AN.Combat.telegraph(X, { x, y, r: 64, windup: 1.1, dmg: 18, team: 'wild', color: '#a0c8ff', onDone: () => {
      X.flashT = 0.15;
      AN.Audio.play('lightning');
      for (const e of X.creatures) if (e.alive && U.dist(e.x, e.y, x, y) < 70) AN.Combat.hit(X, e, 30, { x, y }, { knock: 200 });
    } });
  }

  function updateWeather(X, dt) {
    const type = X.biome.weather;
    const cam = X.cam;
    const v = cam.view(40);
    const target = type === 'rain' ? 120 : 70;
    while (X.weather.length < target) {
      X.weather.push({ x: U.lerp(v.x0, v.x1, Math.random()), y: U.lerp(v.y0, v.y1, Math.random()), t: Math.random() * 6, s: 0.6 + Math.random() * 0.8, ph: Math.random() * TAU });
    }
    for (const w of X.weather) {
      w.t += dt;
      switch (type) {
        case 'rain': w.x -= 120 * dt; w.y += 620 * dt * w.s; break;
        case 'snow': w.x += Math.sin(w.t + w.ph) * 20 * dt - 15 * dt; w.y += 50 * dt * w.s; break;
        case 'ash': w.x += 30 * dt; w.y += 35 * dt * w.s; break;
        case 'embers': case 'bubbles': case 'fumes': w.y -= (type === 'bubbles' ? 40 : 45) * dt * w.s; w.x += Math.sin(w.t * 2 + w.ph) * 15 * dt; break;
        case 'leaves': w.x += (25 + Math.sin(w.t + w.ph) * 30) * dt; w.y += 40 * dt * w.s; break;
        case 'dust': w.x += 160 * dt * w.s; w.y += Math.sin(w.t + w.ph) * 6 * dt; break;
        default: w.x += Math.sin(w.t * 0.6 + w.ph) * 12 * dt; w.y += Math.cos(w.t * 0.5 + w.ph) * 10 * dt - 6 * dt;
      }
      if (w.x < v.x0) w.x = v.x1; else if (w.x > v.x1) w.x = v.x0;
      if (w.y < v.y0) w.y = v.y1; else if (w.y > v.y1) w.y = v.y0;
    }
  }

  Exp.update = function (dt) {
    const X = AN.X;
    if (!X) return;
    X.time += dt;
    const p = X.player;
    X.flowT -= dt;
    if (X.flowT <= 0) {
      X.flowT = 0.35;
      X.flow = AN.Physics.flowField(X.zone, Math.floor(p.x / Z.T), Math.floor(p.y / Z.T));
    }
    if (!X.ending) AN.PlayerCtl.update(X, dt);
    else { p.dvx = p.dvy = 0; }
    AN.Capture.update(X, dt);
    AN.Abilities.update(X, dt);
    if (X.visionT > 0) X.visionT -= dt;
    for (const c of X.creatures) AN.AI.update(X, c, dt);
    for (const a of X.allies) AN.AI.update(X, a, dt);
    for (const c of X.civils) if (c.kind !== 'ark') AN.AI.update(X, c, dt);
    AN.Civ.update(X, dt);
    AN.Cosmic.update(X, dt);
    AN.Physics.separate(X.creatures.concat(X.allies.filter((a) => !a.ridden), X.captives, X.civils.filter((c) => c.kind !== 'ark')));
    if (X.creatures.some((c) => !c.alive)) X.creatures = X.creatures.filter((c) => c.alive);
    if (X.allies.some((a) => a.temp && !a.alive)) X.allies = X.allies.filter((a) => !a.temp || a.alive);
    AN.Combat.update(X, dt);
    if (X.decoy) { X.decoy.t -= dt; if (X.decoy.t <= 0) X.decoy = null; }
    updateInteract(X, dt);
    if (X.collapse) AN.Collapse.update(X, dt);
    if (X.tuto) AN.Tutorial.update(X, dt);
    AN.Events.update(X, dt);
    AN.Resume.tick(X, dt);
    X.fogT -= dt;
    if (X.fogT <= 0) { X.fogT = 0.15; revealFog(X); }
    updateLightning(X, dt);
    updateWeather(X, dt);
    if (X.flashT > 0) X.flashT -= dt;
    if (AN.Music) updateMusic(X, dt);

    // Extraction d'urgence : maintenir X
    if (!X.ending && p.alive && I.down('KeyX')) {
      X.emergencyT += dt;
      if (X.emergencyT >= 2.5) Exp.emergency(X);
    } else X.emergencyT = Math.max(0, X.emergencyT - dt * 2);

    // Caméra : suit le joueur avec une légère avance vers la visée
    const m = AN.Game.mouseWorld();
    const lead = 0.18;
    const tx = p.x + (m.x - p.x) * lead, ty = p.y + (m.y - p.y) * lead;
    const k = 1 - Math.exp(-6 * dt);
    X.cam.x += (tx - X.cam.x) * k;
    X.cam.y += (ty - X.cam.y) * k;
    // face à un être immense, la caméra recule
    const big = X.activeBoss && X.activeBoss.alive && X.activeBoss.r > 90 ? U.clamp(105 / X.activeBoss.r, 0.62, 1) : 1;
    const z = Exp.baseZoom() * big * (X.collapse ? U.lerp(1, 0.82, U.clamp(X.collapse.t / X.collapse.dur, 0, 1)) : 1);
    X.cam.zoom += (z - X.cam.zoom) * k;

    if (I.hit('Escape')) AN.UI.pause();
    else if (I.hit('Tab')) AN.UI.bagPanel(X);
    AN.HUD.update(X, dt);
  };

  /** La musique suit le danger : créatures qui attaquent près de vous, gardien réveillé, transfert. */
  function updateMusic(X, dt) {
    X.musicT = (X.musicT || 0) - dt;
    if (X.musicT > 0) return;
    X.musicT = 0.25;
    const M = AN.Music, p = X.player;
    if (X.collapse) {
      M.mood('collapse', { seed: X.world.seed });
      M.setProgress(X.collapse.progress / Math.max(1, X.collapse.need));
      return;
    }
    let n = 0;
    for (const c of X.creatures) if (c.alive && c.team === 'wild' && c.state === 'attack' && Math.abs(c.x - p.x) + Math.abs(c.y - p.y) < 900) n += c.isBoss ? 2 : 1;
    M.setIntensity(Math.min(1, n / 4));
    M.setBoss(!!(X.activeBoss && X.activeBoss.alive && X.activeBoss.boss && X.activeBoss.boss.active));
  }

  /* ======================= Rendu ======================= */
  function drawNodes(ctx, X, t) {
    const v = X.cam.view(40);
    for (const n of X.zone.nodes) {
      if (n.uses <= 0 || n.x < v.x0 || n.x > v.x1 || n.y < v.y0 || n.y > v.y1) continue;
      const r = D.RESOURCES[n.res];
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(2, 9, 13, 5, 0, 0, TAU); ctx.fill();
      if (r.rarity > 0) {
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
        g.addColorStop(0, U.rgba(r.color, 0.45)); g.addColorStop(1, U.rgba(r.color, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
      }
      if (n.deep) {
        // filon profond : la roche l'enserre encore
        const open = X.T && X.T.deep;
        ctx.fillStyle = open ? 'rgba(28,34,48,0.35)' : 'rgba(28,34,48,0.75)';
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 7); ctx.lineTo(Math.cos(a + 0.4) * 19, Math.sin(a + 0.4) * 15); ctx.lineTo(Math.cos(a + 0.8) * 10, Math.sin(a + 0.8) * 8); ctx.closePath(); ctx.fill(); }
        if (!open) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      } else if (n.meteor) {
        ctx.strokeStyle = 'rgba(40,24,16,0.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 3, 18, 10, 0, 0, TAU); ctx.stroke();
      }
      // amas de 3 éléments
      for (let k = 0; k < 3; k++) {
        ctx.save();
        ctx.translate([-7, 7, 0][k], [3, 3, -5][k] + Math.sin(t * 2 + n.x + k) * 0.8);
        AN.Icons.drawRes(ctx, n.res, [6, 6, 8][k], t);
        ctx.restore();
      }
      ctx.restore();
      if (X.holdKey && X.holdKey.startsWith('harvest:') && X.holdKey.endsWith(n.x + ',' + n.y) && X.holdT > 0) {
        ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(n.x, n.y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * U.clamp(X.holdT / (AN.Tools.harvestHold(X) * (n.deep ? 1.6 : 1)), 0, 1)); ctx.stroke();
      }
    }
  }

  function drawStructures(ctx, X, t) {
    const zone = X.zone;
    // plaques blanches
    for (const pl of zone.plates) {
      ctx.strokeStyle = U.rgba(AN.INK, 0.35);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(pl.x, pl.y, Z.T * 2.7 + Math.sin(t * 2) * 2, t * 0.2, t * 0.2 + TAU); ctx.stroke();
      ctx.setLineDash([]);
      // repère : losange de l'Artefact
      ctx.save();
      ctx.translate(pl.x, pl.y - 6 + Math.sin(t * 2) * 3);
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 2;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    }
    // passages
    for (const g of zone.gates) {
      const locked = g.kind === 'heart' && !Exp.heartOpen(X);
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, 10, 34, 12, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = locked ? U.rgba(AN.STAMP, 0.8 - i * 0.2) : U.rgba(i ? '#ffffff' : AN.INK, 0.9 - i * 0.25);
        ctx.lineWidth = 3 - i * 0.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28 - i * 6, 34 - i * 7, 0, t * (i % 2 ? -1 : 1) * 0.8, t * (i % 2 ? -1 : 1) * 0.8 + TAU * 0.8);
        ctx.stroke();
      }
      if (!locked) {
        const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
        gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, 20, 26, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // ruines
    for (const r of zone.ruins) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(3, 12, 18, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = r.used ? '#8a8a8a' : '#d8d4c8';
      ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-12, -10); ctx.quadraticCurveTo(0, -22, 12, -10); ctx.lineTo(12, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = r.kind === 'cache' ? '#b8863b' : AN.INK; ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-7, -6 + k * 6); ctx.lineTo(7, -6 + k * 6); ctx.stroke(); }
      if (!r.used) { ctx.fillStyle = U.rgba(AN.CYAN, 0.5 + Math.sin(t * 3) * 0.3); ctx.beginPath(); ctx.arc(0, -26, 3, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    // arène du gardien
    const b = zone.state.boss;
    if (b && b.alive && !b.boss.active) {
      ctx.strokeStyle = U.rgba(AN.STAMP, 0.35);
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.arc(zone.arena.x, zone.arena.y, zone.arena.r * 0.85, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawCreatureOverlay(ctx, X, e, t) {
    if (e.hidden) return;
    if (e.team === 'ally') {
      ctx.strokeStyle = U.rgba(AN.CYAN, 0.8); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.5, e.r * 1.05, e.r * 0.45, 0, 0, TAU); ctx.stroke();
      if (e.downed) {
        ctx.fillStyle = AN.STAMP;
        ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
        ctx.fillText('à terre', e.x, e.y - e.r - 8);
      } else if (e.hp < e.maxHp) bar(ctx, e.x, e.y - e.r - 8, Math.max(18, e.r * 1.6), e.hp / e.maxHp, AN.CYAN);
      return;
    }
    if (e.weak && !e.boss) {
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5 + Math.sin(t * 6) * 1.5, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (!e.boss && e.hp < e.maxHp) bar(ctx, e.x, e.y - e.r - 8, Math.max(16, e.r * 1.6), e.hp / e.maxHp, e.weak ? AN.CYAN : AN.INK);
    if (e.kneel) {
      ctx.fillStyle = AN.INK; ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
      ctx.fillText('se rend', e.x, e.y - e.r - 14);
    }
    if (e.npc && (e.revealed || e.npc.mode === 'zealot')) {
      ctx.fillStyle = AN.STAMP; ctx.font = '700 13px ' + AN.FONT_UI; ctx.textAlign = 'center';
      ctx.fillText('!', e.x, e.y - e.r - 12);
    }
    if (e.stunT > 0) { ctx.strokeStyle = '#e8e0f0'; ctx.lineWidth = 1; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(e.x - e.r, e.y - e.r + k * e.r * 0.6); ctx.lineTo(e.x + e.r, e.y - e.r * 0.6 + k * e.r * 0.6); ctx.stroke(); } }
    if (e.boss && e.boss.exhausted) {
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 14, t, t + TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (e.captureT > 0 || e.capture > 0) {
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 9, -Math.PI / 2, -Math.PI / 2 + TAU * e.capture); ctx.stroke();
    }
  }
  function bar(ctx, x, y, w, k, color) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 4);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, w * U.clamp(k, 0, 1), 2);
  }

  function drawWeather(ctx, X, t) {
    const type = X.biome.weather;
    const col = { spores: X.biome.accent, sparks: '#7ef0ff', dust: '#e6d6b0', motes: X.biome.accent, bubbles: '#d8f2f6', ash: '#9a8a80', embers: '#ffb02e', snow: '#ffffff', leaves: '#6a9a4a', pollen: '#f2d05c', rain: '#c8d8f0', glint: '#ffffff', fumes: '#c8e83a' }[type] || '#ffffff';
    ctx.fillStyle = col; ctx.strokeStyle = col;
    for (const w of X.weather) {
      const a = 0.25 + 0.35 * Math.abs(Math.sin(w.t * 0.8 + w.ph));
      ctx.globalAlpha = a;
      switch (type) {
        case 'rain': ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x - 4, w.y + 16); ctx.stroke(); break;
        case 'dust': ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w.x, w.y); ctx.lineTo(w.x - 14 * w.s, w.y); ctx.stroke(); break;
        case 'leaves': ctx.beginPath(); ctx.ellipse(w.x, w.y, 4 * w.s, 2 * w.s, w.t * 2, 0, TAU); ctx.fill(); break;
        case 'bubbles': ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(w.x, w.y, 3 * w.s, 0, TAU); ctx.stroke(); break;
        case 'glint': if (Math.sin(w.t * 3 + w.ph) > 0.8) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w.x - 4, w.y); ctx.lineTo(w.x + 4, w.y); ctx.moveTo(w.x, w.y - 4); ctx.lineTo(w.x, w.y + 4); ctx.stroke(); } break;
        case 'fumes': ctx.globalAlpha = a * 0.25; ctx.beginPath(); ctx.arc(w.x, w.y, 14 * w.s, 0, TAU); ctx.fill(); break;
        case 'sparks': if (Math.sin(w.t * 9 + w.ph) > 0.5) { ctx.fillRect(w.x, w.y, 2, 2); } break;
        default: ctx.beginPath(); ctx.arc(w.x, w.y, (type === 'snow' ? 2 : 1.6) * w.s, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  let lightCanvas = null;
  function drawDarkness(ctx, X, t) {
    let dark = X.biome.dark;
    if (X.eventDark) dark = Math.max(dark, X.eventDark);
    if (X.world.rule === 'nuit') dark = Math.max(dark, 0.86);
    if (X.world.rule === 'brume') dark = Math.max(dark, 0.45);
    if (dark <= 0.05) return;
    const cam = X.cam;
    const W = cam.W, H = cam.H;
    if (!lightCanvas || lightCanvas.width !== Math.ceil(W / 2) || lightCanvas.height !== Math.ceil(H / 2)) {
      lightCanvas = AN.Terrain.canvas(W / 2, H / 2);
    }
    const lc = lightCanvas.getContext('2d');
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, lightCanvas.width, lightCanvas.height);
    const fog = X.world.rule === 'brume' ? '#c8ccd2' : '#05070e';
    lc.fillStyle = U.rgba(fog, dark);
    lc.fillRect(0, 0, lightCanvas.width, lightCanvas.height);
    lc.globalCompositeOperation = 'destination-out';
    const light = (wx, wy, r, a = 1) => {
      const s = cam.worldToScreen(wx, wy);
      const rr = (r * cam.zoom) / 2;
      if (s.x < -rr * 2 || s.y < -rr * 2 || s.x > W + rr * 2 || s.y > H + rr * 2) return;
      const g = lc.createRadialGradient(s.x / 2, s.y / 2, 0, s.x / 2, s.y / 2, rr);
      g.addColorStop(0, 'rgba(0,0,0,' + a + ')');
      g.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.6 + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath(); lc.arc(s.x / 2, s.y / 2, rr, 0, TAU); lc.fill();
    };
    const p = X.player;
    const pr = X.world.rule === 'nuit' ? 230 : 330;
    light(p.x, p.y, pr + Math.sin(t * 3) * 6);
    X.zone.plates.forEach((pl) => light(pl.x, pl.y, 220, 0.8));
    X.zone.gates.forEach((g) => light(g.x, g.y, 140, 0.7));
    for (const e of X.creatures) if (e.alive && !e.hidden && (e.pal.glow || X.visionT > 0)) light(e.x, e.y, 60 + e.r * 4, 0.8);
    if (X.visionT > 0) light(X.player.x, X.player.y, 900, 0.6);
    for (const a of X.allies) if (a.pal.glow) light(a.x, a.y, 60 + a.r * 4, 0.8);
    for (const pr2 of X.projectiles) if (pr2.team === 'player') light(pr2.x, pr2.y, 50, 0.6);
    if (X.collapse) light(X.collapse.plate.x, X.collapse.plate.y, 420, 1);
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.drawImage(lightCanvas, 0, 0, W, H);
  }

  Exp.render = function (ctx) {
    const X = AN.X;
    if (!X) return;
    const cam = X.cam;
    const t = X.time;
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.fillStyle = X.collapse ? AN.PAPER : X.biome.wall.base;
    ctx.fillRect(0, 0, cam.W, cam.H);
    cam.apply(ctx);
    const v = cam.view(4);
    const cw = X.canvas.width, ch = X.canvas.height;
    const sx = U.clamp(Math.floor(v.x0), 0, cw), sy = U.clamp(Math.floor(v.y0), 0, ch);
    const ex = U.clamp(Math.ceil(v.x1), 0, cw), ey = U.clamp(Math.ceil(v.y1), 0, ch);
    if (ex > sx && ey > sy) ctx.drawImage(X.canvas, sx, sy, ex - sx, ey - sy, sx, sy, ex - sx, ey - sy);

    // reflets animés sur les terrains dangereux
    const zone = X.zone;
    const T = Z.T;
    const tx0 = Math.max(0, Math.floor(v.x0 / T)), tx1 = Math.min(zone.w - 1, Math.floor(v.x1 / T));
    const ty0 = Math.max(0, Math.floor(v.y0 / T)), ty1 = Math.min(zone.h - 1, Math.floor(v.y1 / T));
    for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
      if (zone.grid[y * zone.w + x] !== Z.HAZARD) continue;
      const b = zone.mix && zone.bmap[y * zone.w + x] ? D.BIOME[zone.mix] : X.biome;
      if (!b.hazard) continue;
      const a = 0.12 + 0.12 * Math.sin(t * 2.4 + x * 0.7 + y * 1.3);
      ctx.fillStyle = U.rgba(U.shade(b.hazard.color, 0.5), a);
      ctx.beginPath(); ctx.arc(x * T + T / 2 + Math.sin(t + y) * 3, y * T + T / 2, T * 0.42, 0, TAU); ctx.fill();
    }

    if (X.collapse) AN.Collapse.drawUnder(ctx, X, t);
    AN.Cosmic.drawUnder(ctx, X, t);
    AN.Tools.drawWorld(ctx, X, t);
    drawStructures(ctx, X, t);
    AN.Structures.drawWorld(ctx, X, t);
    AN.Events.drawWorld(ctx, X, t);
    AN.Keys.draw(ctx, X, t);
    AN.Civ.draw(ctx, X, t);
    drawNodes(ctx, X, t);
    if (X.tuto) AN.Tutorial.drawWorld(ctx, X, t);
    AN.Combat.drawUnder(ctx, X, t);
    AN.Combat.drawPickups(ctx, X, t);

    const ents = [];
    for (const c of X.creatures) if (c.alive && cam.visible(c.x, c.y, c.r * 3 + 40)) ents.push(c);
    for (const a of X.allies) if (cam.visible(a.x, a.y, a.r * 3 + 40)) ents.push(a);
    for (const c of X.captives) if (cam.visible(c.x, c.y, c.r * 3 + 40)) ents.push(c);
    for (const c of X.civils) if (c.kind !== 'ark' && c.alive && cam.visible(c.x, c.y, c.r * 3 + 40)) ents.push(c);
    ents.sort((a, b) => (a.isBoss ? 1 : 0) - (b.isBoss ? 1 : 0) || a.y - b.y);
    for (const e of ents) {
      if (e.downed) ctx.globalAlpha = 0.5;
      AN.Art.draw(ctx, e, t);
      ctx.globalAlpha = 1;
      drawCreatureOverlay(ctx, X, e, t);
    }
    AN.PlayerCtl.draw(ctx, X, t);
    AN.Combat.drawOver(ctx, X, t);
    AN.Capture.draw(ctx, X, t);
    AN.Cosmic.drawOver(ctx, X, t);
    AN.FX.draw(ctx, cam);
    AN.Abilities.drawGiants(ctx, X, t);
    drawWeather(ctx, X, t);
    if (X.collapse) AN.Collapse.drawOver(ctx, X, t);
    drawDarkness(ctx, X, t);
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    if (X.flashT > 0 && !AN.Prefs.reduceFx()) { ctx.fillStyle = 'rgba(230,240,255,' + X.flashT * 3 + ')'; ctx.fillRect(0, 0, cam.W, cam.H); }
    if (X.collapse) AN.Collapse.drawScreen(ctx, X, t);
    if (!X.collapse && AN.Search) AN.Search.drawCompass(ctx, X, t);
    if (X.tuto) AN.Tutorial.drawScreen(ctx, X, t);
    AN.Cosmic.drawScreen(ctx, X, t);
    if (X.emergencyT > 0) {
      ctx.fillStyle = U.rgba('#ffffff', U.clamp(X.emergencyT / 2.5, 0, 1) * 0.5);
      ctx.fillRect(0, 0, cam.W, cam.H);
    }
  };

  Exp.scene = {
    name: 'expedition',
    update: (dt) => Exp.update(dt),
    render: (ctx) => Exp.render(ctx),
  };
})();
