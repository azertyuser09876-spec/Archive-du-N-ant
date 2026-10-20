/* Génération des destinations (mondes) à partir d'une graine.
   Ne dessine rien : produit uniquement une description de données.
   La même graine donne toujours le même monde. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  const FAMILY = {
    fungus: 'Fongiques', blob: 'Amorphes', insect: 'Arthropodes', construct: 'Mécanismes', moth: 'Lépidoptères',
    jelly: 'Gélatineux', quad: 'Quadrupèdes', worm: 'Vermiformes', cell: 'Cellulaires', orb: 'Formes sphériques',
    plant: 'Végétaux mobiles', drone: 'Mécanismes', serpent: 'Serpentiformes', fish: 'Nageurs', wraith: 'Silhouettes',
    frog: 'Batraciens', bird: 'Oiseaux', snail: 'Gastéropodes', crab: 'Crustacés', ray: 'Raies', scorpion: 'Arachnides',
    candle: 'Cierges', bell: 'Clochettes', stag: 'Cervidés', hourglass: 'Sabliers', satellite: 'Mécanismes', origami: 'Papiers pliés',
  };
  const ADJ = {
    foret_fongique: 'fongiques', marais_electrique: 'électriques', ruines_mecaniques: 'rouillés', desert_osseux: 'osseux',
    cavernes_cristallines: 'cristallins', ocean_suspendu: 'aériens', foret_calcinee: 'cendrés', riviere_lave: 'ardents',
    toundra_givree: 'givrés', jungle_carnivore: 'carnivores', abysses_lumineuses: 'luminescents', foret_minerale: 'minéraux',
    cite_carbonisee: 'charognards', jardins_ambre: 'dorés', steppes_orageuses: 'orageux', fosses_acides: 'corrosifs',
    ruche_chitineuse: 'chitineux', desert_verre: 'vitreux', entrailles_vivantes: 'organiques', lisiere_neant: 'blancs',
    foret_cire: 'cireux', salines: 'salins', rift_continental: 'telluriques', mer_interieure: 'lacustres', calotte_polaire: 'polaires',
    foret_continent: 'sylvestres',
  };

  const W = (AN.WorldGen = {});

  W.code = function (rng) {
    return rng.pick(D.NAME_PARTS.a) + '-' + rng.pick(D.NAME_PARTS.b) + '-' + rng.int(2, 98);
  };

  W.sharedTags = (a, b) => a.tags.filter((t) => b.tags.includes(t)).length;

  /** Échelle d'un biome ou d'une créature : les régions et les mondes partagent la faune des régions. */
  const scaleOf = (x) => (x && x.scale && x.scale !== 'monde' ? x.scale : 'region');
  W.scaleOfBiome = (biomeId) => scaleOf(D.BIOME[biomeId]);

  /** Espèces vivant dans un biome (hors gardiens et ultra-boss). */
  W.pool = function (biomeId) {
    return D.CREATURES.filter((c) => c.tier <= 1 && c.biomes.includes(biomeId));
  };
  W.guardianFor = function (biomeId, rng, exclude = []) {
    const sc = W.scaleOfBiome(biomeId);
    const ofScale = D.CREATURES.filter((c) => c.tier === 2 && !c.unique && scaleOf(c) === sc);
    let list = ofScale.filter((c) => c.biomes.includes(biomeId) && !exclude.includes(c.id));
    if (!list.length) list = ofScale.filter((c) => c.biomes.includes(biomeId));
    if (!list.length) list = ofScale;
    return rng.pick(list).id;
  };
  W.ultraFor = function (biomeId, rng) {
    let list = D.CREATURES.filter((c) => c.tier === 3 && c.biomes.includes(biomeId));
    if (!list.length) list = D.CREATURES.filter((c) => c.tier === 3);
    return rng.pick(list).id;
  };
  /** Boss du cœur d'un échelon cosmique (Souverain, Cataclysme, Entité stellaire, Organisme galactique). */
  W.bossFor = function (scale, biomeId, rng) {
    const E = D.ECHELONS[scale];
    const all = D.CREATURES.filter((c) => c.tier === E.boss && c.scale === scale);
    const list = all.filter((c) => c.biomes.includes(biomeId));
    return rng.pick(list.length ? list : all).id;
  };

  /**
   * Crée une destination.
   * @param {number} seed graine du monde
   * @param {object} ctx { threat, reliability, scale, rep, noNation }
   *   noNation : jamais un monde tenu par un peuple (lieux ancrés, 1.13 : ils restent ceux de la 1.11)
   */
  W.destination = function (seed, ctx) {
    if (ctx.scale && ctx.scale !== 'region' && D.ECHELONS && D.ECHELONS[ctx.scale]) return W.cosmic(seed, ctx);
    const rng = new AN.RNG(seed);
    const threat = U.clamp(ctx.threat, 1, 7);
    const allowed = D.BIOMES.filter((b) => !b.scale && (!b.minThreat || threat >= b.minThreat));
    const primary = rng.pick(allowed);
    const size = threat <= 1 ? D.SIZES[rng.int(0, 1)] : rng.weighted([[D.SIZES[0], 3], [D.SIZES[1], 4], [D.SIZES[2], threat >= 3 ? 3 : 1]]);

    // Biomes des zones : cohérents avec le biome principal (étiquettes partagées).
    const zones = [];
    const used = [primary.id];
    for (let i = 0; i < size.zones; i++) {
      let biome = primary;
      if (i > 0) {
        const cands = allowed
          .filter((b) => !used.includes(b.id))
          .map((b) => [b, W.sharedTags(primary, b) * 3 + 0.15]);
        biome = cands.length ? rng.weighted(cands) : primary;
        used.push(biome.id);
      }
      let mix = null;
      if (rng.chance(0.35)) {
        const mc = allowed.filter((b) => b.id !== biome.id).map((b) => [b, W.sharedTags(biome, b) * 2 + 0.1]);
        mix = rng.weighted(mc).id;
      }
      zones.push({ biome: biome.id, mix, name: biome.name + (i > 0 && rng.chance(0.5) ? ' ' + rng.pick(D.ZONE_SUFFIXES.slice(1)) : '') });
    }
    const guardians = [];
    zones.forEach((z) => { const g = W.guardianFor(z.biome, rng, guardians); z.guardian = g; guardians.push(g); });
    // Caveaux scellés : tirage séparé pour ne pas modifier le reste du monde.
    const vr = AN.RNG.from(seed, 'caveaux');
    zones.forEach((z) => { z.vault = vr.chance(0.55) ? vr.pick(D.keysForBiome(D.BIOME[z.biome])) : null; });

    // Structures à découvrir et événements : tirages séparés, qui n'altèrent pas le reste du monde.
    W.structuresAndEvents(seed, zones);

    const regionName = rng.pick(D.REGION_WORDS) + ' ' + primary.region;
    const heart = { biome: primary.id, mix: null, name: 'Cœur ' + primary.region, guardian: W.ultraFor(primary.id, rng), heart: true };
    heart.vault = vr.chance(0.3) ? vr.pick(D.keysForBiome(primary)) : null;

    const anomaly = rng.weighted(D.ANOMALIES.map((a) => [a.id, a.id === 'aucune' ? 5 : a.id === 'errant' ? (threat >= 3 ? 1 : 0) : 1.2]));
    const rule = rng.weighted(D.RULES.map((r) => [r.id, r.id === 'aucune' ? (threat <= 1 ? 8 : 4) : r.id === 'orage' && !primary.lightning ? 0.6 : 1]));

    const life = rng.pick(W.pool(primary.id).filter((c) => c.tier === 0)) || D.CREATURES[0];
    const resTotals = {};
    zones.forEach((z) => {
      const b = D.BIOME[z.biome];
      for (const r in b.resources) resTotals[r] = (resTotals[r] || 0) + b.resources[r];
    });
    const resources = Object.keys(resTotals).sort((a, b) => resTotals[b] - resTotals[a]).slice(0, 4);

    const stability = U.clamp(0.95 - threat * 0.05 - (rule === 'instable' ? 0.25 : 0) + rng.float(-0.08, 0.08), 0.25, 0.97);
    const density = rng.float(0.8, 1.25) * (anomaly === 'migration' ? 1.8 : 1);

    const world = {
      seed, code: W.code(rng), region: regionName, primary: primary.id, threat, size: size.id, tiles: size.tiles,
      zones, heart, anomaly, anomalyZone: rng.int(0, zones.length - 1), rule, stability, density,
      life: life.id, resources,
    };
    world.civ = W.civilisation(seed, zones, threat, ctx.rep);
    if (!ctx.noNation) W.applyNation(world, 'region', ctx.rep);
    world.scan = W.scan(world, rng, ctx.reliability);
    return world;
  };

  /**
   * Destination d'un échelon supérieur : un monde entier, une orbite, un système, une galaxie.
   * Même structure qu'une région (zones, cœur), mêmes moteurs ; seules les données changent.
   */
  W.cosmic = function (seed, ctx) {
    const scale = ctx.scale;
    const E = D.ECHELONS[scale];
    const rng = new AN.RNG(seed);
    const threat = 7;
    // un monde entier mêle les paysages des régions et ses propres continents (1.11), plus souvent tirés en premier
    const pool = scale === 'monde' ? D.BIOMES.filter((b) => (!b.scale || b.scale === 'monde') && !b.heartOnly) : D.BIOMES.filter((b) => b.scale === scale && !b.heartOnly);
    const own = (b) => (scale === 'monde' && b.scale === 'monde' ? 1.5 : 0);
    // un lieu ancré (1.10) garde le paysage de ce qu'on a rapporté ; le tirage reste le même
    const drawn = scale === 'monde' ? rng.weighted(pool.map((b) => [b, b.scale === 'monde' ? 4 : 1])) : rng.pick(pool);
    const primary = ctx.primary && D.BIOME[ctx.primary] ? D.BIOME[ctx.primary] : drawn;
    const nZones = rng.int(E.zones[0], E.zones[1]);
    const zones = [];
    const used = [primary.id];
    for (let i = 0; i < nZones; i++) {
      let biome = primary;
      if (i > 0) {
        const cands = pool.filter((b) => !used.includes(b.id)).map((b) => [b, W.sharedTags(primary, b) * 3 + 0.4 + own(b)]);
        biome = cands.length ? rng.weighted(cands) : primary;
        used.push(biome.id);
      }
      let mix = null;
      if (rng.chance(0.3)) {
        const mc = pool.filter((b) => b.id !== biome.id).map((b) => [b, W.sharedTags(biome, b) * 2 + 0.1]);
        if (mc.length) mix = rng.weighted(mc).id;
      }
      zones.push({ biome: biome.id, mix, name: biome.name + (i > 0 && rng.chance(0.5) ? ' ' + rng.pick(D.ZONE_SUFFIXES.slice(1)) : '') });
    }
    const guardians = [];
    zones.forEach((z) => { const g = W.guardianFor(z.biome, rng, guardians); z.guardian = g; guardians.push(g); });
    const vr = AN.RNG.from(seed, 'caveaux');
    zones.forEach((z) => { z.vault = vr.chance(0.5) ? vr.pick(D.keysForBiome(D.BIOME[z.biome])) : null; });
    const heartBiome = scale === 'monde' ? 'cratere_souverain' : E.heartBiome || primary.id;
    rng.pick(E.words); // tirage gardé (l'ancien nom de région), pour ne pas décaler la suite
    const heart = { biome: heartBiome, mix: null, name: E.heart, guardian: W.bossFor(scale, heartBiome, rng), heart: true };
    heart.vault = vr.chance(0.25) ? vr.pick(D.keysForBiome(D.BIOME[heartBiome])) : null;
    const anomaly = rng.weighted(D.ANOMALIES.map((a) => [a.id, a.id === 'aucune' ? 5 : a.id === 'errant' ? 1 : 1.2]));
    const banned = scale === 'monde' ? [] : ['gravite', 'orage', 'brume'];
    const rule = rng.weighted(D.RULES.filter((r) => !banned.includes(r.id)).map((r) => [r.id, r.id === 'aucune' ? 4 : 1]));
    const life = rng.pick(W.pool(primary.id).filter((c) => c.tier === 0)) || D.CREATURES[0];
    const resTotals = {};
    zones.forEach((z) => { const b = D.BIOME[z.biome]; for (const r in b.resources) resTotals[r] = (resTotals[r] || 0) + b.resources[r]; });
    const resources = Object.keys(resTotals).sort((a, b) => resTotals[b] - resTotals[a]).slice(0, 4);
    const stability = U.clamp(0.7 + rng.float(-0.12, 0.12) - (rule === 'instable' ? 0.2 : 0), 0.25, 0.95);
    const density = rng.float(0.9, 1.25) * (anomaly === 'migration' ? 1.6 : 1);
    const tiles = rng.int(E.tiles[0], E.tiles[1]);
    const code = W.code(rng);
    const world = {
      // un nom propre tiré du code (1.11) : « Système d'Arithal » ; ce qu'on en ramène le portera aussi
      seed, code, region: AN.Names ? AN.Names.world(scale, code) : E.name + ' ' + primary.region, primary: primary.id, threat, size: D.SIZE_OF[scale], tiles,
      zones, heart, anomaly, anomalyZone: rng.int(0, zones.length - 1), rule, stability, density,
      life: life.id, resources, scale,
    };
    world.civ = scale === 'monde' ? W.civilisation(seed, zones, threat, ctx.rep) : null;
    if (!ctx.noNation) W.applyNation(world, scale, ctx.rep);
    world.scan = W.scan(world, rng, ctx.reliability);
    return world;
  };

  /**
   * Nation (1.12) : un monde tout entier tenu par un peuple, une ville par zone et
   * sa capitale au cœur. Tirage à part : un monde qui n'en est pas une ne change pas.
   */
  W.nation = function (seed, zones, scale, threat, rep) {
    const N = D.NATION;
    if (!N) return null;
    const nr = AN.RNG.from(seed, 'nation');
    const ch = N.chance[scale || 'region'];
    if (!ch || threat < N.minThreat || !nr.chance(ch)) return null;
    const here = zones.map((z) => z.biome);
    const cands = D.PEOPLES.filter((p) => (p.reach || []).includes(scale || 'region'))
      .map((p) => [p, (p.biomes.some((b) => here.includes(b)) ? 3 : 0.4) * (p.rare ? 0.3 : 1)]);
    if (!cands.length) return null;
    const people = nr.weighted(cands);
    const attitude = nr.weighted(Object.keys(N.attitudes).map((a) => [a, (people.bias[a] || 0.35) * D.repWeight(rep, a)]));
    const name = (k) => (AN.Names ? AN.Names.proper(seed + ':' + k) : k);
    return {
      people: people.id, attitude, realm: people.realm, sovereign: nr.pick(people.names), title: nr.pick(people.titles),
      capital: name('capitale'), cities: zones.map((z, i) => name('ville' + i)), seed: nr.int(1, 1e9),
    };
  };
  W.applyNation = function (world, scale, rep) {
    const nat = W.nation(world.seed, world.zones, scale, world.threat, rep);
    if (!nat) return;
    world.nation = nat;
    world.civ = null; // le village isolé laisse la place à leurs villes
  };

  /** Un peuple habite-t-il ce monde ? Tirage séparé, influencé par la réputation du joueur. */
  W.civilisation = function (seed, zones, threat, rep) {
    if (!D.PEOPLES) return null;
    const cr = AN.RNG.from(seed, 'civilisation');
    if (!cr.chance(threat <= 1 ? 0.3 : 0.45)) return null;
    const here = zones.map((z) => z.biome);
    const cands = D.PEOPLES.map((p) => [p, p.biomes.some((b) => here.includes(b)) ? (p.rare ? 0.6 : 3) : 0]).filter((e) => e[1] > 0);
    if (!cands.length) return null;
    const people = cr.weighted(cands);
    const matching = zones.map((z, i) => i).filter((i) => people.biomes.includes(zones[i].biome));
    const zi = cr.pick(matching.length ? matching : [0]);
    const attitude = cr.weighted(Object.keys(D.ATTITUDES).map((a) => [a, (people.bias[a] || 0.35) * D.repWeight(rep, a)]));
    return {
      people: people.id, attitude, zone: zi, n: cr.int(6, 10) + threat * 2,
      leader: cr.pick(people.names), title: cr.pick(people.titles), buildings: cr.int(4, 7), seed: cr.int(1, 1e9),
    };
  };

  /** Ce que l'Artefact affiche : incomplet ou approximatif selon la fiabilité du scanner. */
  W.scan = function (w, rng, reliability) {
    const r = reliability;
    const life = D.CREATURE[w.life];
    const s = {};
    const off = rng.chance(1 - r) ? rng.pick([-1, 1]) : 0;
    s.threat = rng.chance(r) ? String(w.threat) : U.clamp(w.threat - 1 + Math.min(0, off), 1, 7) + ' à ' + U.clamp(w.threat + 1 + Math.max(0, off), 1, 7);
    s.size = rng.chance(0.4 + r * 0.6) ? D.SIZES.find((z) => z.id === w.size).name : 'Indéterminée';
    s.zones = rng.chance(0.3 + r * 0.7) ? String(w.zones.length) : 'Au moins ' + Math.max(1, w.zones.length - 1);
    s.type = D.BIOME[w.primary].name;
    s.climate = D.BIOME[w.primary].climate;
    s.life = (FAMILY[life.art.shape] || 'Formes inconnues') + ' ' + (ADJ[w.primary] || '');
    const stab = U.clamp(w.stability + (rng.float(-1, 1) * (1 - r) * 0.2), 0.05, 0.99);
    s.stability = Math.round(stab * 100) + ' %' + (r < 1 ? ' (estimé)' : '');
    s.guardian = rng.chance(r * 0.75) ? D.CREATURE[w.zones[0].guardian].name : 'Non identifié';
    if (w.scale && w.scale !== 'region') {
      // Le maître du cœur est toujours détecté : c'est lui qui retient ce monde.
      const boss = D.CREATURE[w.heart.guardian];
      s.boss = boss.name;
      s.bossTier = D.TIERS[boss.tier].name;
    }
    const an = D.ANOMALIES.find((a) => a.id === w.anomaly);
    s.anomaly = rng.chance(0.35 + r * 0.65) ? an.name : 'Signal indéterminé';
    const ru = D.RULES.find((x) => x.id === w.rule);
    s.rule = rng.chance(0.4 + r * 0.6) ? ru.name : 'Inconnue';
    s.resources = w.resources.filter(() => rng.chance(0.45 + r * 0.55));
    if (w.civ) s.civ = rng.chance(0.35 + r * 0.65) ? D.PEOPLE[w.civ.people].Name + ', environ ' + (Math.round(w.civ.n / 5) * 5 || 5) + ' habitants' : 'Signes de vie intelligente';
    else if (w.nation) s.civ = w.nation.realm + ' : une ville par zone';
    else s.civ = rng.chance(0.15 * (1 - r)) ? 'Signes de vie intelligente' : 'Aucune';
    const keys = [...new Set(w.zones.concat([w.heart]).map((z) => z.vault).filter(Boolean))];
    s.vaults = keys.length ? (rng.chance(0.3 + r * 0.7) ? keys : ['?']) : [];
    // structures et événements (tirage séparé : les fiches existantes ne changent pas)
    const r2 = AN.RNG.from(w.seed, 'scan-structures');
    const structs = w.zones.map((z) => z.structure).filter(Boolean);
    s.structures = structs.length ? (r2.chance(0.35 + r * 0.65) ? structs.map((id) => D.STRUCTURES[id].name) : ['?']) : [];
    const evs = [...new Set(w.zones.map((z) => z.event).filter(Boolean))];
    s.events = evs.length ? (r2.chance(0.25 + r * 0.6) ? evs.map((id) => D.WORLD_EVENTS[id].name) : ['?']) : [];
    return s;
  };

  /** Une structure à découvrir (selon le biome) et un événement possible par zone. */
  W.structuresAndEvents = function (seed, zones) {
    if (!D.FOUND_STRUCTURES) return;
    const sr = AN.RNG.from(seed, 'structures');
    zones.forEach((z) => {
      z.structure = null;
      const roll = sr.chance(D.STRUCTURE_CHANCE);
      const cands = D.FOUND_STRUCTURES.filter((id) => D.STRUCTURES[id].biomes.includes(z.biome) || (z.mix && D.STRUCTURES[id].biomes.includes(z.mix))).map((id) => [id, D.STRUCTURES[id].chance]);
      const pick = cands.length ? sr.weighted(cands) : null;
      if (roll && pick) z.structure = pick;
    });
    const er = AN.RNG.from(seed, 'evenements');
    zones.forEach((z) => {
      const roll = er.chance(D.WORLD_EVENT_CHANCE);
      const ev = er.pick(D.WORLD_EVENT_IDS);
      z.event = roll ? ev : null;
      z.eventAt = Math.round(er.float(18, 45));
    });
  };

  /** Génère la liste de destinations proposée par l'Artefact. */
  W.list = function (profile, scale = 'region') {
    const P = AN.Profile;
    const rank = P.rank(profile).index;
    const cap = D.RANKS[rank].threat;
    const sc = P.scanner ? P.scanner(profile) : P.upgradeValue(profile, 'scanner');
    const out = [];
    if (scale !== 'region') {
      const n = Math.max(2, Math.min(4, sc.count - 2));
      for (let i = 0; i < n; i++) {
        const seed = AN.hash(profile.seed + ':' + scale + ':' + profile.expeditions + ':' + profile.scans + ':' + i);
        out.push(W.destination(seed, { scale, threat: 7, reliability: sc.reliab, rep: AN.Civ ? AN.Civ.reputation(profile) : 'inconnu' }));
      }
      return out;
    }
    for (let i = 0; i < sc.count; i++) {
      const seed = AN.hash(profile.seed + ':' + profile.expeditions + ':' + profile.scans + ':' + i);
      const r = AN.RNG.from(seed, 'menace');
      let threat;
      if (profile.expeditions === 0) threat = i === 0 ? 1 : r.int(1, 2);
      else if (i === 0) threat = Math.max(1, cap - 2);
      else threat = r.chance(0.18) ? cap + 1 : r.int(Math.max(1, cap - 2), cap);
      out.push(W.destination(seed, { threat, reliability: sc.reliab, rep: AN.Civ ? AN.Civ.reputation(profile) : 'inconnu' }));
    }
    if (AN.Rescue) out.unshift(...AN.Rescue.destinations(profile));
    return out;
  };
})();
