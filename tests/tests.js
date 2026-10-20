/* Tests sans affichage. Résultats dans la page et dans window.TEST_RESULTS. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const results = [];
  const test = (name, fn) => {
    try {
      const detail = fn();
      results.push({ name, ok: true, detail: detail || '' });
    } catch (e) {
      results.push({ name, ok: false, detail: e && e.message ? e.message : String(e) });
    }
  };
  const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion fausse'); };
  const eq = (a, b, msg) => { if (a !== b) throw new Error((msg || 'valeurs différentes') + ' : ' + a + ' ≠ ' + b); };
  // les tests n'écrivent jamais dans la vraie sauvegarde du joueur
  if (AN.Save) AN.Save.available = false;
  if (AN.Prefs) AN.Prefs.save = () => {}; // ni les préférences de l'appareil

  /* ---------- aléatoire déterministe ---------- */
  const EMPREINTE_1_11 = 3681943762; // voir « Empreinte des mondes » (recalculée en 1.12 : nations, peuples dans les nouveaux paysages)
  test('Même graine, même suite de nombres', () => {
    const a = new AN.RNG(42), b = new AN.RNG(42);
    for (let i = 0; i < 100; i++) eq(a.next(), b.next());
  });
  test('Graines différentes, suites différentes', () => {
    const a = new AN.RNG(1), b = new AN.RNG(2);
    let same = 0;
    for (let i = 0; i < 50; i++) if (a.next() === b.next()) same++;
    assert(same < 3, same + ' valeurs identiques');
  });
  test('Hachage stable', () => { eq(AN.hash('archive'), AN.hash('archive')); assert(AN.hash('a') !== AN.hash('b')); });
  test('Bruit borné dans [0, 1]', () => {
    const n = new AN.Noise(7);
    for (let i = 0; i < 2000; i++) { const v = n.fbm(i * 0.37, i * 0.91, 4); assert(v >= 0 && v <= 1, 'valeur ' + v); }
  });

  /* ---------- intégrité des données ---------- */
  test('22 biomes de régions, 32 des échelons supérieurs', () => {
    eq(D.BIOMES.filter((b) => !b.scale).length, 22);
    eq(D.BIOMES.filter((b) => b.scale).length, 32, '5 pour les mondes, 18 jusqu’à la galaxie, 9 au-delà (1.10), 6 de plus (1.11)');
  });
  test('Chaque biome a une créature à lui (1.11)', () => {
    D.BIOMES.forEach((b) => assert(D.CREATURES.some((c) => c.biomes.length === 1 && c.biomes[0] === b.id), 'aucune créature propre à ' + b.id));
    D.CREATURES.forEach((c) => { const t = D.trait(c.id); assert(c.tier >= 3 || t.ability, 'capacité de ' + c.id); assert(c.desc, 'description de ' + c.id); });
    D.CREATURES.forEach((c) => (c.phases || []).forEach((ph) => ph.patterns.forEach((pt) => { if (pt.type === 'summon') assert(D.CREATURE[pt.species], c.id + ' appelle ' + pt.species); })));
    return D.CREATURES.length + ' créatures, ' + D.BIOMES.length + ' biomes';
  });
  test('Au moins 50 créatures, identifiants uniques', () => {
    assert(D.CREATURES.length >= 50, D.CREATURES.length + ' créatures');
    eq(new Set(D.CREATURES.map((c) => c.id)).size, D.CREATURES.length, 'doublons');
    const tiers = [0, 1, 2, 3, 4, 5, 6, 7].map((t) => D.CREATURES.filter((c) => c.tier === t).length);
    return 'par rang : ' + tiers.join(' / ');
  });
  test('Les créatures vivent dans des biomes existants', () => {
    D.CREATURES.forEach((c) => c.biomes.forEach((b) => assert(D.BIOME[b], c.id + ' → ' + b)));
  });
  test('Chaque biome a une faune et un gardien', () => {
    D.BIOMES.filter((b) => !b.scale || b.scale !== 'monde').forEach((b) => {
      if (b.scale) {
        const pool = AN.WorldGen.pool(b.id);
        assert(pool.length >= 2 && pool.some((c) => c.tier === 0), b.id + ' : faune');
        assert(D.CREATURES.some((c) => c.tier === 2 && c.scale === b.scale && c.biomes.includes(b.id)), b.id + ' sans gardien');
        assert(D.CREATURES.some((c) => c.tier === D.ECHELONS[b.scale].boss && c.biomes.includes(b.id)), b.id + ' sans maître');
        return;
      }
      const pool = AN.WorldGen.pool(b.id);
      assert(pool.length >= 2, b.id + ' : ' + pool.length + ' espèces');
      assert(pool.some((c) => c.tier === 0), b.id + ' sans créature mineure');
      assert(D.CREATURES.some((c) => c.tier === 2 && c.biomes.includes(b.id)), b.id + ' sans gardien');
      assert(D.CREATURES.some((c) => c.tier === 3 && c.biomes.includes(b.id)), b.id + ' sans ultra-boss');
    });
  });
  test('Toutes les ressources citées existent', () => {
    const check = (obj, where) => Object.keys(obj || {}).forEach((k) => assert(D.RESOURCES[k], where + ' → ' + k));
    D.BIOMES.forEach((b) => check(b.resources, b.id));
    D.CREATURES.forEach((c) => { check(c.drops, c.id); if (c.produces) assert(D.RESOURCES[c.produces.res], c.id + ' production'); });
    Object.entries(D.GEAR).forEach(([id, g]) => check(g.cost, id));
    Object.entries(D.UPGRADES).forEach(([id, u]) => u.levels.forEach((l, i) => check(l.cost, id + ' niv. ' + i)));
  });
  test('Gardiens et ultra-boss : phases et motifs valides', () => {
    D.CREATURES.filter((c) => c.tier >= 2).forEach((c) => {
      assert(c.phases && c.phases.length >= 3, c.id + ' : phases');
      eq(c.phases[0].at, 1, c.id + ' : la première phase commence à 100 %');
      c.phases.forEach((p, i) => {
        if (i) assert(p.at < c.phases[i - 1].at, c.id + ' : seuils décroissants');
        p.patterns.forEach((pt) => {
          assert(AN.Boss.PATTERNS[pt.type], c.id + ' : motif inconnu ' + pt.type);
          if (pt.type === 'summon') assert(D.CREATURE[pt.species], c.id + ' : invocation ' + pt.species);
        });
      });
      assert(c.power || c.global, c.id + ' : pouvoir');
    });
  });
  test('Rôles et variantes connus', () => {
    D.CREATURES.forEach((c) => c.roles.forEach((r) => assert(D.ROLES[r], c.id + ' → rôle ' + r)));
    eq(Math.round(D.VARIANTS.reduce((s, v) => s + v.weight, 0)), 100, 'poids des variantes');
  });

  /* ---------- génération ---------- */
  test('Un monde est entièrement déterminé par sa graine', () => {
    const a = AN.WorldGen.destination(123456, { threat: 3, reliability: 0.7 });
    const b = AN.WorldGen.destination(123456, { threat: 3, reliability: 0.7 });
    eq(JSON.stringify(a), JSON.stringify(b));
    return a.code + ', ' + a.region;
  });
  test('Structure des mondes cohérente', () => {
    for (let s = 1; s <= 120; s++) {
      const t = 1 + (s % 7);
      const w = AN.WorldGen.destination(AN.hash('w' + s), { threat: t, reliability: 0.5 });
      const size = D.SIZES.find((z) => z.id === w.size);
      eq(w.zones.length, size.zones, 'nombre de zones');
      eq(w.threat, t, 'menace');
      w.zones.forEach((z) => { assert(D.BIOME[z.biome]); assert(D.CREATURE[z.guardian].tier === 2); });
      assert(D.CREATURE[w.heart.guardian].tier === 3, 'ultra-boss au cœur');
      if (t < 4) assert(w.zones.every((z) => z.biome !== 'lisiere_neant'), 'Lisière du Néant trop tôt');
    }
  });
  test('Zones déterministes et entièrement accessibles', () => {
    let checked = 0;
    for (let s = 1; s <= 12; s++) {
      const w = AN.WorldGen.destination(AN.hash('z' + s), { threat: 1 + (s % 7), reliability: 1 });
      for (let i = 0; i <= w.zones.length; i++) {
        const z1 = AN.ZoneGen.generate(w, i), z2 = AN.ZoneGen.generate(w, i);
        eq(z1.grid.join(''), z2.grid.join(''), 'grille');
        // flood fill depuis l'entrée
        const seen = new Uint8Array(z1.w * z1.h);
        const T = z1.T;
        const start = Math.floor(z1.entry.y / T) * z1.w + Math.floor(z1.entry.x / T);
        const stack = [start];
        seen[start] = 1;
        while (stack.length) {
          const k = stack.pop();
          [k - 1, k + 1, k - z1.w, k + z1.w].forEach((j) => { if (j >= 0 && j < seen.length && !seen[j] && z1.grid[j] !== AN.ZoneGen.WALL) { seen[j] = 1; stack.push(j); } });
        }
        const reach = (p) => seen[Math.floor(p.y / T) * z1.w + Math.floor(p.x / T)] === 1;
        z1.plates.forEach((p) => assert(reach(p), 'plaque inaccessible'));
        z1.gates.forEach((g) => assert(reach(g), 'passage inaccessible'));
        assert(reach(z1.arena), 'arène inaccessible');
        z1.nodes.forEach((n) => assert(reach(n), 'ressource inaccessible'));
        assert(z1.plates.length >= 2, 'au moins deux plaques');
        checked++;
      }
    }
    return checked + ' zones vérifiées';
  });

  /* ---------- sauvegarde ---------- */
  test('Sauvegarde : aller-retour JSON', () => {
    const p = AN.Save.newProfile(99);
    p.stock.fibre = 12;
    const back = AN.Save.migrate(JSON.parse(JSON.stringify(p)));
    eq(back.stock.fibre, 12);
    eq(back.version, AN.Save.VERSION);
  });
  test('Sauvegarde : migration d’un format ancien', () => {
    const old = { seed: 5, stock: { os: 3 }, collection: [], territories: [] };
    const m = AN.Save.migrate(old);
    eq(m.version, AN.Save.VERSION);
    eq(m.stock.os, 3);
    assert(m.artefact && m.settings && Array.isArray(m.journal), 'champs complétés');
  });
  test('Sauvegarde : refuse un format plus récent', () => {
    let threw = false;
    try { AN.Save.migrate({ version: 999 }); } catch (e) { threw = true; }
    assert(threw);
  });

  /* ---------- règles de l'Archive ---------- */
  test('Spirale hexagonale sans doublon', () => {
    const s = AN.Hex.spiral(6);
    eq(s.length, 3 * 6 * 7, 'nombre de cases');
    eq(new Set(s.map((h) => AN.Hex.key(h.q, h.r))).size, s.length);
    s.forEach((h) => { const px = AN.Hex.toPx(h.q, h.r); const back = AN.Hex.fromPx(px.x, px.y); eq(AN.Hex.key(back.q, back.r), AN.Hex.key(h.q, h.r)); });
  });
  test('Rang de l’Archive selon son contenu', () => {
    const p = AN.Save.newProfile(1);
    eq(AN.Profile.rank(p).index, 0);
    for (let i = 0; i < 5; i++) { const s = AN.Profile.freeSlot(p); p.territories.push({ uid: 't' + i, biome: 'foret_fongique', quality: 'fragment', q: s.q, r: s.r, stock: {} }); }
    eq(AN.Profile.rank(p).index, 1, 'sans gardien, on reste Enclos');
    p.collection.push({ uid: 'g', species: 'reine_mycelienne', variant: 'commun' });
    eq(AN.Profile.rank(p).index, 2, 'avec un gardien : Domaine');
  });
  test('Synergie entre voisins détectée', () => {
    const p = AN.Save.newProfile(1);
    p.territories.push({ uid: 'a', biome: 'riviere_lave', quality: 'territoire', q: 1, r: 0, stock: {} });
    p.territories.push({ uid: 'b', biome: 'ruines_mecaniques', quality: 'territoire', q: 2, r: 0, stock: {} });
    const s = AN.Profile.synergies(p);
    assert(s.some((x) => x.syn.name === 'Forge'), 'Forge attendue');
    assert(AN.Profile.craftMult(p) < 1, 'réduction de coût');
  });
  test('Coûts et paiement', () => {
    const p = AN.Save.newProfile(1);
    p.stock = { fibre: 5 };
    assert(!AN.Profile.pay(p, { fibre: 6 }));
    assert(AN.Profile.pay(p, { fibre: 5 }));
    eq(AN.Profile.stock(p, 'fibre'), 0);
  });
  test('Production : débits positifs, rattrapage plafonné', () => {
    const p = AN.Save.newProfile(1);
    p.territories.push({ uid: 'a', biome: 'foret_fongique', quality: 'territoire', q: 1, r: 0, stock: {} });
    p.collection.push({ uid: 'c', species: 'lumifongue', variant: 'commun', home: 'a' });
    const r = AN.Production.rates(p);
    assert(Object.values(r.a).every((v) => v > 0), 'débits');
    p.lastTick = Date.now() - 24 * 3600 * 1000;
    const el = AN.Production.catchUp(p);
    eq(Math.round(el), 3 * 3600, 'plafond de 3 h');
    assert(AN.Util.sumValues(p.territories[0].stock) <= 61, 'stock plafonné');
  });
  test('Liste de destinations renouvelée après une expédition', () => {
    const p = AN.Save.newProfile(77);
    const a = AN.WorldGen.list(p).map((w) => w.code).join();
    p.expeditions++;
    const b = AN.WorldGen.list(p).map((w) => w.code).join();
    assert(a !== b, 'liste identique');
    eq(AN.WorldGen.list(p).length, 3);
  });

  /* ---------- liens avec les créatures (v0.9) ---------- */
  const mkC = (o) => AN.Save.normalizeCreature(Object.assign({ uid: AN.Util.uid('c'), species: 'lumifongue', variant: 'commun', hueSeed: 1, home: null, world: 'T' }, o));
  test('Sauvegarde v1 → v2 : créatures complétées', () => {
    const old = { version: 1, seed: 3, collection: [{ uid: 'a', species: 'cendrin', variant: 'commun' }], territories: [] };
    const m = AN.Save.migrate(old);
    eq(m.version, AN.Save.VERSION);
    const c = m.collection[0];
    assert(c.level === 1 && c.loyalty >= 0 && c.stage === 0 && c.lost === null, 'champs v2');
    assert(Array.isArray(m.sursis) && Array.isArray(m.essences), 'nouvelles listes');
  });
  test('Chaque espèce a des traits cohérents', () => {
    D.CREATURES.forEach((c) => {
      const t = D.trait(c.id);
      if (t.ability) assert(D.ABILITIES[t.ability], c.id + ' capacité ' + t.ability);
      if (t.call) assert(D.CALLS[t.call], c.id + ' appel ' + t.call);
      t.keys.forEach((k) => assert(D.KEYS[k], c.id + ' clé ' + k));
      if (t.diet) assert(D.RESOURCES[t.diet.res], c.id + ' régime');
      if (t.evo) { assert(D.CREATURE[t.evo.to], c.id + ' évolution'); Object.keys(t.evo.cost).forEach((r) => assert(D.RESOURCES[r], c.id + ' coût ' + r)); }
      if (c.tier < 3) assert(t.ability, c.id + ' sans capacité');
    });
  });
  test('Chaque clé est portée par au moins deux espèces capturables', () => {
    Object.keys(D.KEYS).forEach((k) => {
      const n = D.CREATURES.filter((c) => c.tier < 3 && D.trait(c.id).keys.includes(k)).length;
      assert(n >= 2, k + ' : ' + n);
    });
  });
  test('Expérience et niveaux', () => {
    const c = mkC({});
    const gained = AN.Bonds.addXp(c, D.xpFor(1) + D.xpFor(2) + 1);
    eq(gained, 2); eq(c.level, 3);
    AN.Bonds.addXp(c, 1e9);
    eq(c.level, D.MAX_LEVEL);
  });
  test('Évolution spécifique : Larvule → Ambrelle', () => {
    const p = AN.Save.newProfile(4);
    const c = mkC({ species: 'larvule', level: 4, loyalty: 60 });
    p.collection.push(c);
    let o = AN.Bonds.evolutions(p, c).find((x) => x.kind === 'species');
    assert(o && !o.ok, 'bloquée sans ressources');
    p.stock = { pollen: 10, seve: 10 };
    o = AN.Bonds.evolutions(p, c).find((x) => x.kind === 'species');
    assert(o.ok, 'possible');
    assert(AN.Bonds.evolve(p, c, o));
    eq(c.species, 'ambrelle');
  });
  test('Reproduction : naissances, et territoire plein respecté', () => {
    const p = AN.Save.newProfile(5);
    p.territories.push({ uid: 't', biome: 'foret_fongique', quality: 'fragment', q: 1, r: 0, stock: {} });
    p.collection.push(mkC({ home: 't', level: 3, loyalty: 70 }), mkC({ home: 't', level: 3, loyalty: 70 }));
    let births = 0;
    for (let i = 0; i < 40; i++) births += AN.Bonds.tick(p, 10).births.length;
    assert(births >= 1, 'aucune naissance');
    assert(p.collection.filter((c) => c.home === 't').length <= D.CAPACITY.fragment, 'capacité dépassée');
  });
  test('Faim : un prédateur mange dans la réserve', () => {
    const p = AN.Save.newProfile(6);
    p.stock = { os: 3 };
    const c = mkC({ species: 'croc_spore', fed: 0.4 });
    p.collection.push(c);
    AN.Bonds.tick(p, 1);
    eq(AN.Profile.stock(p, 'os'), 2, 'un os mangé');
    assert(c.fed > 0.9, 'rassasié');
  });
  test('Monde en sursis : compagnon perdu, puis essence', () => {
    const p = AN.Save.newProfile(7);
    const c = mkC({ species: 'cendrin', level: 4 });
    p.collection.push(c);
    p.companions.push(c.uid);
    const X = { world: { code: 'TEST-1', seed: 99, threat: 2, region: 'R', zones: [{}] }, zi: 0, player: { x: 0, y: 0 }, allies: [{ uid: c.uid, x: 2000, y: 0, downed: false }], freed: new Set() };
    const result = { injured: [] };
    AN.Rescue.onFailure(X, p, result);
    assert(c.lost && p.sursis.length === 1 && result.sursis, 'perdu');
    assert(!p.companions.includes(c.uid), 'retiré des compagnons');
    p.expeditions = c.lost.until;
    const msgs = AN.Rescue.afterExpedition(p, { world: { code: 'AUTRE' }, freed: new Set() }, 'extrait');
    assert(msgs.length === 1 && p.essences.length === 1 && !p.collection.length, 'essence');
    p.stock = { essence: 5, braise: 20 };
    const back = AN.Rescue.revive(p, p.essences[0]);
    assert(back && back.species === 'cendrin' && p.essences.length === 0, 'réincarnée');
  });

  /* ---------- peuples (v0.10) ---------- */
  test('Chaque peuple a des données cohérentes', () => {
    D.PEOPLES.forEach((P) => {
      P.biomes.forEach((b) => assert(D.BIOME[b], P.id + ' biome ' + b));
      assert(D.RESOURCES[P.likes], P.id + ' aime ' + P.likes);
      Object.keys(P.bias).forEach((a) => assert(D.ATTITUDES[a], P.id + ' attitude ' + a));
      assert(P.names.length >= 3 && P.titles.length >= 1, P.id + ' noms');
    });
    D.CIV_CONFLICTS.forEach(([a, b]) => assert(D.PEOPLE[a] && D.PEOPLE[b], 'conflit ' + a + '/' + b));
  });
  test('Mondes habités : déterministes, peuple dans un biome qu’il connaît', () => {
    let n = 0;
    for (let i = 1; i <= 200; i++) {
      const w = AN.WorldGen.destination(AN.hash('peuple' + i), { threat: 3, reliability: 1 });
      const w2 = AN.WorldGen.destination(AN.hash('peuple' + i), { threat: 3, reliability: 1 });
      eq(JSON.stringify(w.civ), JSON.stringify(w2.civ), 'déterminisme');
      if (!w.civ) continue;
      n++;
      assert(D.PEOPLE[w.civ.people].biomes.includes(w.zones[w.civ.zone].biome), 'biome du village');
    }
    assert(n > 40 && n < 120, 'fréquence ' + n + ' / 200');
  });
  test('Réputation selon vos choix', () => {
    const p = AN.Save.newProfile(8);
    eq(AN.Civ.reputation(p), 'inconnu');
    p.moral.sauves = 20;
    eq(AN.Civ.reputation(p), 'arche');
    p.moral.abandonnes = 60; p.moral.massacres = 10;
    eq(AN.Civ.reputation(p), 'fleau');
    const q = AN.Save.newProfile(9);
    q.moral.pillages = 3;
    eq(AN.Civ.reputation(q), 'pillard');
  });
  const fakeX = (p, civ, o) => Object.assign({ profile: p, civ: Object.assign({ people: 'pales', attitude: 'suppliants', zone: 0, n: 12, leader: 'A', title: 'B', seed: 3 }, civ), world: { code: 'PEU-1', threat: 2 }, cargo: [], civils: [], creatures: [], zones: [{ state: {} }], zone: null }, o);
  test('Fin d’expédition : sauvés, emmenés, abandonnés', () => {
    const p = AN.Save.newProfile(10);
    p.territories.push({ uid: 't1', biome: D.PEOPLE.pales.biomes[0], quality: 'fragment', q: 1, r: 0, stock: {} });
    const X = fakeX(p, { boarded: 5 });
    X.cargo.push({ inhabitants: 2, people: 'pales', forced: true });
    const out = AN.Civ.finish(X, 'extrait', null, {}, true);
    eq(out.saved, 5); eq(out.forced, 2); eq(out.abandoned, 5);
    eq(p.settlements.length, 2, 'deux groupes');
    eq(p.settlements[0].home, 't1', 'installés dans un biome connu');
    eq(p.moral.sauves, 5); eq(p.moral.contraints, 2); eq(p.moral.abandonnes, 5);
    const q = AN.Save.newProfile(11);
    const Y = fakeX(q, {});
    const o2 = AN.Civ.finish(Y, 'mort', null, {}, false);
    eq(o2.abandoned, 0, 'monde non détruit : personne d’abandonné');
    eq(q.settlements.length, 0);
  });
  test('Peuples installés : humeur, bonus, grève des contraints', () => {
    const p = AN.Save.newProfile(12);
    p.territories.push({ uid: 't1', biome: D.PEOPLE.rouages.biomes[0], quality: 'fragment', q: 1, r: 0, stock: {} });
    p.settlements = [{ uid: 's1', people: 'rouages', attitude: 'suppliants', n: 10, forced: false, home: 't1', village: true, mood: 66, infiltrators: 0, nextEvent: 999 }];
    AN.Settlements.tick(p, 120);
    assert(p.settlements[0].mood > 66, 'biome connu : humeur en hausse');
    const pw = AN.Settlements.powers(p);
    assert(pw.prodBy.t1 > 0, 'travailleurs');
    const b = D.PEOPLE.rouages.bonus;
    if (b.kind !== 'prod' && b.kind !== 'lore') assert(pw[b.kind] > 0, 'bonus du peuple');
    p.settlements.push({ uid: 's2', people: 'rouages', attitude: 'fiers', n: 6, forced: true, home: 't1', village: false, mood: 15, infiltrators: 0, nextEvent: 0 });
    const ev = AN.Settlements.tick(p, 1);
    assert(p.territories[0].strikeUntil > Date.now() || p.settlements.length === 1, 'grève ou fuite');
    assert(ev.length >= 1, 'événement annoncé');
  });
  test('Sauvegarde : champs des peuples présents', () => {
    const p = AN.Save.migrate({ version: 1, seed: 3, collection: [], territories: [] });
    assert(p.moral && Array.isArray(p.settlements) && Array.isArray(p.structures) && p.peoples, 'champs v0.10');
  });

  /* ---------- échelles supérieures (v1.0) ---------- */
  test('Échelons : destinations déterministes et cohérentes', () => {
    const out = [];
    ['monde', 'orbite', 'systeme', 'galaxie'].forEach((sc) => {
      const E = D.ECHELONS[sc];
      for (let s = 1; s <= 25; s++) {
        const a = AN.WorldGen.destination(AN.hash(sc + s), { scale: sc, threat: 7, reliability: 0.8 });
        const b = AN.WorldGen.destination(AN.hash(sc + s), { scale: sc, threat: 7, reliability: 0.8 });
        eq(JSON.stringify(a), JSON.stringify(b), sc + ' déterminisme');
        eq(a.scale, sc);
        assert(a.zones.length >= E.zones[0] && a.zones.length <= E.zones[1], sc + ' : zones');
        a.zones.forEach((z) => {
          const B = D.BIOME[z.biome];
          assert(sc === 'monde' ? (!B.scale || B.scale === 'monde') && !B.heartOnly : B.scale === sc, sc + ' : biome ' + z.biome);
          const g = D.CREATURE[z.guardian];
          assert(g.tier === 2 && (sc === 'monde' ? !g.scale : g.scale === sc), sc + ' : gardien ' + z.guardian);
        });
        const boss = D.CREATURE[a.heart.guardian];
        assert(boss.tier === E.boss && boss.scale === sc, sc + ' : maître ' + boss.id);
        if (sc !== 'monde') assert(!a.civ, 'pas de peuple dans l’espace');
      }
      out.push(sc);
    });
    for (let s = 1; s <= 60; s++) {
      const w = AN.WorldGen.destination(AN.hash('r' + s), { threat: 1 + (s % 7), reliability: 1 });
      assert(!w.scale && w.zones.every((z) => !D.BIOME[z.biome].scale), 'région sans biome cosmique');
      assert(w.zones.every((z) => !D.CREATURE[z.guardian].scale), 'région sans gardien cosmique');
    }
    return out.join(', ');
  });
  test('Zones des échelons accessibles (vide galactique compris)', () => {
    let n = 0;
    ['monde', 'orbite', 'systeme', 'galaxie'].forEach((sc) => {
      for (let s = 1; s <= 3; s++) {
        const w = AN.WorldGen.destination(AN.hash('za' + sc + s), { scale: sc, threat: 7, reliability: 1 });
        for (let i = 0; i <= w.zones.length; i++) {
          const z = AN.ZoneGen.generate(w, i);
          const T = z.T;
          const seen = new Uint8Array(z.w * z.h);
          const start = Math.floor(z.entry.y / T) * z.w + Math.floor(z.entry.x / T);
          const stack = [start];
          seen[start] = 1;
          const blocked = (g) => g === AN.ZoneGen.WALL || g === AN.ZoneGen.ABYSS;
          while (stack.length) {
            const k = stack.pop();
            [k - 1, k + 1, k - z.w, k + z.w].forEach((j) => { if (j >= 0 && j < seen.length && !seen[j] && !blocked(z.grid[j])) { seen[j] = 1; stack.push(j); } });
          }
          const reach = (p) => seen[Math.floor(p.y / T) * z.w + Math.floor(p.x / T)] === 1;
          z.plates.forEach((p) => assert(reach(p), sc + ' : plaque inaccessible'));
          z.gates.forEach((g) => assert(reach(g), sc + ' : passage inaccessible'));
          assert(reach(z.arena), sc + ' : arène inaccessible');
          if (sc === 'galaxie') assert(z.grid.some((g) => g === AN.ZoneGen.ABYSS), 'galaxie sans vide');
          if (sc === 'systeme' && !z.isHeart) assert(Array.isArray(z.wells), 'puits de gravité');
          n++;
        }
      }
    });
    return n + ' zones vérifiées';
  });
  test('Rangs supérieurs de l’Archive', () => {
    const p = AN.Save.newProfile(13);
    for (let i = 0; i < 26; i++) p.territories.push({ uid: 't' + i, biome: 'foret_fongique', quality: 'territoire', q: i + 1, r: 0, stock: {} });
    const add = (sp) => p.collection.push(mkC({ species: sp }));
    ['reine_mycelienne', 'colosse_rouage', 'titan_givre', 'sylvarque', 'pyroclaste'].forEach(add);
    eq(AN.Profile.rank(p).def.name, 'Monde');
    add('atlas');
    eq(AN.Profile.rank(p).def.name, 'Orbite');
    add('baleine_orbitale');
    eq(AN.Profile.rank(p).def.name, 'Orbite', 'il faut aussi des astres');
    const astre = (b) => p.cosmos.astres.push({ uid: 'a' + p.cosmos.astres.length, biome: b, kind: D.ASTRES[b].kind, layer: D.ASTRES[b].layer });
    astre('mer_regolithe'); astre('anneau_glace');
    eq(AN.Profile.rank(p).def.name, 'Système');
    add('astre_veilleur'); astre('couronne_solaire'); astre('geante_gazeuse'); astre('ceinture_fer');
    eq(AN.Profile.rank(p).def.name, 'Galaxie');
    add('myriade');
    eq(AN.Profile.rank(p).def.name, 'Amas', 'l’ancien rang Inconnue devient l’Amas (1.10)');
    add('berger_amas');
    eq(AN.Profile.rank(p).def.name, 'Amas', 'il faut huit astres');
    astre('nebuleuse'); astre('galaxie_naine'); astre('pont_sombre');
    eq(AN.Profile.rank(p).def.name, 'Toile');
    add('tisserand');
    eq(AN.Profile.rank(p).def.name, 'Inconnue');
    assert(AN.Profile.rank(p).def.mystery && !AN.Profile.rank(p).next, 'Inconnue reste le dernier rang');
    const pw = AN.Profile.powers(p);
    assert(pw.cargo >= 2 && pw.hp >= 20, 'bonus des astres');
  });
  test('Formes de capture et ancrage', () => {
    const p = AN.Save.newProfile(14);
    const X = { profile: p, world: { threat: 7 }, creatures: [], player: { x: 0, y: 0 } };
    const def = D.CREATURE.atlas;
    const e = { def, alive: true, x: 0, y: 0, r: def.r, boss: { exhausted: true, form: { kind: 'ancrage', done: true } } };
    assert(!AN.Cosmic.formReady(X, e), 'ancrage insuffisant');
    p.artefact.ancrage = 1;
    assert(AN.Cosmic.formReady(X, e), 'ancré');
    e.boss.form.done = false;
    assert(!AN.Cosmic.formReady(X, e), 'ancres manquantes');
    const s = { def: D.CREATURE.myriade, boss: { exhausted: true, form: { kind: 'synchronisation', done: true, t: 0.1, period: 2.4, window: 0.8 } } };
    assert(AN.Cosmic.captureMul(X, s) > 1, 'dans le rythme');
    s.boss.form.t = 1.5;
    assert(AN.Cosmic.captureMul(X, s) < 0, 'hors du rythme');
  });
  test('Sauvegarde v2 → v3 : astres', () => {
    const m = AN.Save.migrate({ version: 2, seed: 3, collection: [], territories: [] });
    eq(m.version, AN.Save.VERSION);
    assert(m.cosmos && Array.isArray(m.cosmos.astres) && m.destByScale, 'champs v3');
  });

  /* ---------- territoires et compagnons (v1.1) ---------- */
  test('Formes des territoires : taille selon ce qui est ramené, tirée de la zone', () => {
    const S = AN.Shapes;
    const w = AN.WorldGen.destination(AN.hash('forme'), { threat: 3, reliability: 1 });
    const z = AN.ZoneGen.generate(w, 0);
    const out = [];
    ['fragment', 'territoire', 'coeur', 'continent', 'cratere'].forEach((q) => {
      const n = S.sizeOf(q);
      const a = S.fromZone(z, n, 42, z.arena), b = S.fromZone(z, n, 42, z.arena);
      eq(JSON.stringify(a), JSON.stringify(b), 'déterminisme');
      eq(a.length, n, q + ' : nombre de cases');
      eq(new Set(a.map((c) => c.join(','))).size, n, q + ' : cases distinctes');
      // forme d'un seul tenant
      const keys = new Set(a.map((c) => c.join(',')));
      const seen = new Set(['0,0']), st = [[0, 0]];
      while (st.length) { const [q0, r0] = st.pop(); AN.Hex.neighbors(q0, r0).forEach((nb) => { const k = nb.q + ',' + nb.r; if (keys.has(k) && !seen.has(k)) { seen.add(k); st.push([nb.q, nb.r]); } }); }
      eq(seen.size, n, q + ' : forme connexe');
      out.push(q + ' ' + n);
    });
    eq(S.sizeOf('fragment'), 1, 'le fragment reste une case');
    const z2 = AN.ZoneGen.generate(AN.WorldGen.destination(AN.hash('forme2'), { threat: 3, reliability: 1 }), 1);
    assert(JSON.stringify(S.fromZone(z, 12, 1, z.arena)) !== JSON.stringify(S.fromZone(z2, 12, 1, z2.arena)), 'deux zones, deux formes');
    return out.join(', ');
  });
  test('Placement des territoires : sans chevauchement, toujours relié', () => {
    const S = AN.Shapes;
    const p = AN.Save.newProfile(21);
    for (let i = 0; i < 25; i++) {
      const q = ['fragment', 'territoire', 'coeur', 'continent'][i % 4];
      const cells = S.blob(S.sizeOf(q), i + 3);
      const h = AN.Profile.freeSlot(p, cells);
      p.territories.push({ uid: 't' + i, biome: 'foret_fongique', quality: q, q: h.q, r: h.r, cells, stock: {} });
    }
    const all = p.territories.flatMap((t) => S.abs(t).map((c) => c.q + ',' + c.r));
    eq(new Set(all).size, all.length, 'aucune case partagée');
    assert(!all.includes('0,0'), 'le centre reste libre');
    p.territories.forEach((t) => assert(S.neighbors(p, t).length > 0 || S.abs(t).some((c) => AN.Hex.dist({ q: 0, r: 0 }, c) === 1), t.uid + ' isolé'));
    const t = p.territories[1];
    const r = S.canPlace(p, t, p.territories[2].q, p.territories[2].r, S.cellsOf(t));
    assert(!r.ok, 'refus sur une place occupée');
    return all.length + ' cases occupées';
  });
  test('Sauvegarde v3 → v4 : territoires agrandis et réagencés', () => {
    const old = { version: 3, seed: 2, collection: [], territories: [
      { uid: 'a', biome: 'foret_fongique', quality: 'fragment', q: 1, r: 0, seed: 1, stock: {} },
      { uid: 'b', biome: 'desert_osseux', quality: 'territoire', q: 0, r: 1, seed: 2, stock: {} },
      { uid: 'c', biome: 'riviere_lave', quality: 'coeur', q: -1, r: 1, seed: 3, stock: {} },
    ] };
    const m = AN.Save.migrate(old);
    eq(m.version, AN.Save.VERSION);
    const S = AN.Shapes;
    eq(S.cellsOf(m.territories[0]).length, 1, 'fragment inchangé');
    eq(S.cellsOf(m.territories[1]).length, 7);
    eq(S.cellsOf(m.territories[2]).length, 12);
    const all = m.territories.flatMap((t) => S.abs(t).map((c) => c.q + ',' + c.r));
    eq(new Set(all).size, all.length, 'aucun chevauchement après réagencement');
  });
  test('Compagnons de toutes tailles', () => {
    const P = AN.Profile;
    assert(P.canBeCompanion({ species: 'sylvarque' }) && P.canBeCompanion({ species: 'myriade' }), 'géants acceptés');
    eq(P.linkCost('lumifongue'), 1); eq(P.linkCost('reine_mycelienne'), 2); eq(P.linkCost('sylvarque'), 3); eq(P.linkCost('atlas'), 4);
    assert(D.trait('sylvarque').mount, 'un géant peut porter le joueur');
    assert(!P.canBeCompanion({ species: 'sylvarque', lost: { code: 'X' } }), 'sauf s’il est perdu');
  });

  test('Recherche précise : décompte exact des ressources', () => {
    const Se = AN.Search;
    let checked = 0;
    for (let s = 0; s < 6; s++) {
      const w = AN.WorldGen.destination(AN.hash('cherche' + s), { threat: 2 + (s % 4), reliability: 0.5 });
      const res = Object.keys(D.BIOME[w.primary].resources)[0];
      const r = Se.scanWorld(w, { kind: 'res', id: res });
      let total = 0;
      for (let zi = 0; zi <= w.zones.length; zi++) AN.ZoneGen.generate(w, zi).nodes.forEach((n) => { if (n.res === res) total += n.amount * n.uses; });
      eq(r.total, total, w.code + ' / ' + res);
      eq(r.zones.reduce((a, z) => a + z.count, 0), total, 'répartition par zone');
      checked++;
    }
    return checked + ' mondes vérifiés';
  });
  test('Recherche précise : créatures et absence', () => {
    const Se = AN.Search;
    const w = AN.WorldGen.destination(AN.hash('cherche-crea'), { threat: 3, reliability: 0.5 });
    const z0 = AN.ZoneGen.generate(w, 0);
    const sp = z0.groups[0].species;
    const r = Se.scanWorld(w, { kind: 'creature', id: sp });
    assert(r.total >= z0.groups[0].count, 'au moins le premier groupe');
    assert(r.zones.some((z) => z.zi === 0), 'zone 1 citée');
    const absent = D.CREATURES.find((c) => c.tier === 0 && !w.zones.concat([w.heart]).some((z) => c.biomes.some((b) => b === z.biome || b === z.mix)));
    if (absent) { eq(Se.scanWorld(w, { kind: 'creature', id: absent.id }).total, 0, absent.id + ' absent'); assert(/Absent/.test(Se.summary(w, { kind: 'creature', id: absent.id }))); }
    return sp + ' : ' + r.total;
  });
  test('Balayage ciblé : un monde qui contient la cible', () => {
    const Se = AN.Search;
    const p = AN.Save.newProfile(5);
    const target = { kind: 'res', id: 'cristal' };
    const fail = Se.sweep(p, target, 'region');
    assert(fail.error, 'refusé sans ressources');
    p.stock.etincelle = 10; p.stock.verre = 10;
    const ok = Se.sweep(p, target, 'region');
    assert(ok.world, ok.error || 'monde trouvé');
    assert(Se.scanWorld(ok.world, target).total > 0, 'le monde contient la cible');
    eq(AN.Profile.destinations(p)[0], ok.world, 'en tête des destinations');
    eq(p.stock.etincelle, 5); eq(p.stock.verre, 7);
    const again = Se.sweep(p, target, 'region');
    eq(AN.Profile.destinations(p).filter((w) => w.found).length, 1, 'un seul monde balayé à la fois');
    assert(again.world.seed !== ok.world.seed, 'un nouveau monde');
  });

  test('Nouvelle faune : 19 espèces, biomes mieux peuplés', () => {
    eq(D.FAUNA_13.length, 19);
    D.FAUNA_13.forEach((id) => {
      const c = D.CREATURE[id];
      assert(D.trait(id).ability || D.trait(id).call, id + ' : capacité');
      if (c.tier === 2) assert(c.phases.length >= 3 && (c.power || c.global), id + ' : gardien complet');
    });
    // chaque biome de région a maintenant au moins trois espèces communes
    D.BIOMES.filter((b) => !b.scale).forEach((b) => assert(AN.WorldGen.pool(b.id).length >= 3, b.id + ' : ' + AN.WorldGen.pool(b.id).length));
    // le Veilleur du Seuil ne garde aucun monde généré
    for (let s = 0; s < 300; s++) assert(AN.WorldGen.guardianFor(D.BIOMES[s % 20].id, new AN.RNG(s)) !== 'veilleur_seuil', 'Veilleur hors du Seuil');
    return D.CREATURES.length + ' créatures au total';
  });
  test('Le Seuil : zone du tutoriel accessible', () => {
    const Z = AN.ZoneGen;
    const w = AN.Tutorial.world(42);
    const z = Z.generate(w, 0);
    assert(z.tutorial && z.gates.length === 0, 'zone à part');
    const seen = new Uint8Array(z.w * z.h);
    const st = [z.entryT.y * z.w + z.entryT.x];
    seen[st[0]] = 1;
    while (st.length) {
      const i = st.pop();
      [i - 1, i + 1, i - z.w, i + z.w].forEach((j) => { if (j >= 0 && j < z.w * z.h && !seen[j] && !Z.isSolid(z.grid[j])) { seen[j] = 1; st.push(j); } });
    }
    const reach = (x, y) => seen[Math.floor(y / Z.T) * z.w + Math.floor(x / Z.T)] === 1;
    assert(reach(z.arena.x, z.arena.y), 'arène');
    z.plates.forEach((p) => assert(reach(p.x, p.y), 'plaque'));
    z.nodes.forEach((n) => assert(reach(n.x, n.y), 'gisement ' + n.res));
    z.groups.forEach((g) => assert(reach(g.x, g.y), 'groupe ' + g.species));
    eq(AN.Tutorial.STEPS[AN.Tutorial.STEPS.length - 1].id, 'hold');
    assert(AN.Tutorial.shouldOffer(AN.Save.newProfile(3)), 'proposé à une nouvelle partie');
  });
  test('Partie d’essai : la sauvegarde est suspendue', () => {
    const S = AN.Save;
    const was = S.available;
    S.available = false; S.memory = null; S.suspended = true;
    S.write(AN.Save.newProfile(8));
    eq(S.memory, null, 'rien d’écrit');
    S.suspended = false;
    S.write(AN.Save.newProfile(8));
    assert(S.memory, 'écrit après');
    S.available = was;
  });

  test('Outils : effets réunis et soute de la cage de stase', () => {
    const T = AN.Tools.effects({ tool_harvest: 'foreuse', tool_capture: 'cage_stase', tool_extract: 'ancre_stable', tool_transport: 'traineau' });
    assert(T.deep && T.dismantle, 'foreuse et traîneau');
    eq(T.freeMinor, 3); eq(T.cargo, 1); eq(T.bag, 10);
    assert(Math.abs(T.transfer - 0.2) < 1e-9, 'transfert');
    const X = { T, cargo: [{ species: 'lumifongue' }, { species: 'sporelin' }, { species: 'croc_spore' }, { structure: 'totem_betes', weight: 1 }], reservedCargo: 0 };
    eq(AN.Tools.cargoUsed(X), 2 + 1, 'deux mineures gratuites, un prédateur, une structure');
    eq(AN.Tools.weightFor(X, 0), 0, 'encore une place gratuite');
    D.GEAR_SLOTS.forEach((s) => assert(Object.keys(D.GEAR).some((id) => D.GEAR[id].slot === s), 'emplacement ' + s));
  });
  /** Un profil avec quelques territoires posés comme au retour d'expédition. */
  function withTerritories(seed, list) {
    const p = AN.Save.newProfile(seed);
    list.forEach(([biome, quality], i) => {
      const slot = AN.Arrange.arrival(p, quality, biome, AN.hash(seed + ':' + i));
      p.territories.push({ uid: 't' + seed + '_' + i, biome, mix: null, quality, q: slot.q, r: slot.r, cells: slot.cells, world: 'T', region: 'T', zoneName: 'T', seed: i + 1, stock: {} });
    });
    return p;
  }
  test('Structures : bâtir sur un territoire, améliorer, reconstruire, effets', () => {
    const St = AN.Structures;
    const none = AN.Save.newProfile(11);
    Object.keys(D.RESOURCES).forEach((k) => (none.stock[k] = 500));
    assert(St.build(none, 'entrepot'), 'sans territoire, on ne bâtit pas');
    const p = withTerritories(11, [['ruines_mecaniques', 'territoire'], ['desert_osseux', 'territoire'], ['foret_fongique', 'fragment']]);
    Object.keys(D.RESOURCES).forEach((k) => (p.stock[k] = 500));
    eq(St.build(p, 'entrepot'), null);
    eq(St.build(p, 'entrepot'), null, 'amélioration');
    assert(St.build(p, 'entrepot'), 'niveau maximal refusé');
    const ent = St.built(p, 'entrepot');
    assert(St.hasBonus(p, ent), 'l’entrepôt choisit un territoire sec');
    eq(St.powers(p).storage, 150 + 40, 'avec le bonus du paysage');
    eq(AN.Production.cap(p), 60 + 190);
    eq(St.build(p, 'phare'), null);
    eq(AN.Profile.scanner(p).count, AN.Profile.upgradeValue(p, 'scanner').count + 1, 'destination en plus');
    p.structures.push({ uid: 'f1', id: 'autel_neant', level: 1, terr: null, origin: { world: 'X', zone: 'Y' } });
    eq(St.powers(p).links || 0, 0, 'pas encore reconstruit');
    eq(St.rebuild(p, p.structures[2]), null);
    eq(AN.Profile.companionSlots(p), AN.Profile.upgradeValue(p, 'liens') + 1, 'un lien en plus');
    p.structures.push({ uid: 'f2', id: 'autel_neant', level: 1, terr: null });
    St.rebuild(p, p.structures[3]);
    eq(St.powers(p).links, 1, 'un seul exemplaire agit');
    // chaque territoire a une capacité, chaque bâtiment sa case
    p.territories.forEach((t) => {
      const on = St.on(p, t);
      assert(on.length <= St.capacity(t), 'capacité dépassée');
      eq(new Set(on.map((s) => s.cell)).size, on.length, 'cases distinctes');
    });
    eq(St.capacity({ cells: [[0, 0]] }), 1); eq(St.capacity({ cells: new Array(7).fill([0, 0]) }), 2); eq(St.capacity({ cells: new Array(22).fill([0, 0]) }), 6);
    St.store(p, p.structures[0]);
    eq(St.powers(p).storage, 0, 'rangé, il n’agit plus');
    // un bâtiment suit son territoire quand on le déplace
    const ph = St.built(p, 'phare');
    const t = St.terrOf(p, ph);
    const before = St.positions(p).find((o) => o.s === ph);
    t.q += 5; St.changed();
    const after = St.positions(p).find((o) => o.s === ph);
    assert(Math.abs(after.x - before.x) > 100, 'le bâtiment suit son territoire');
    t.q -= 5; St.changed();
    // déplacer vers un territoire plein est refusé
    const frag = p.territories.find((x) => x.quality === 'fragment');
    St.move(p, ph, frag.uid);
    assert(St.move(p, St.list(p).find((s) => s !== ph && St.placed(p, s)), frag.uid), 'fragment plein : refusé');
  });
  /* ---------- la base mobile (1.9) ---------- */
  test('Sauvegarde v5 → v6 : les bâtiments quittent l’Artefact pour les territoires', () => {
    const terr = withTerritories(21, [['riviere_lave', 'territoire'], ['desert_osseux', 'fragment'], ['foret_fongique', 'fragment']]).territories;
    const old = { version: 5, seed: 21, collection: [], territories: JSON.parse(JSON.stringify(terr)), settlements: [],
      structures: [{ uid: 's1', id: 'forge', level: 2, slot: 0, built: 1 }, { uid: 's2', id: 'entrepot', level: 1, slot: 3, built: 1 }, { uid: 's3', id: 'couveuse', level: 1, slot: 5, built: 1 },
        { uid: 's4', id: 'phare', level: 1, slot: 7, built: 1 }, { uid: 's5', id: 'puits_profond', level: 1, slot: null }, { uid: 'a1', kind: 'arche', people: 'pales', slot: 21 }] };
    const m = AN.Save.migrate(old);
    eq(m.version, AN.Save.VERSION);
    const St = AN.Structures;
    eq(m.structures.length, 6, 'rien n’est perdu');
    m.structures.forEach((x) => assert(x.slot === undefined, 'plus d’emplacement autour de l’Artefact'));
    eq(St.terrOf(m, m.structures[0]).biome, 'riviere_lave', 'la forge choisit la rivière de lave (paysage favorable)');
    eq(m.structures[0].level, 2, 'niveau gardé');
    const placed = m.structures.filter((x) => St.placed(m, x));
    eq(placed.length, 4, 'quatre places (2 + 1 + 1), quatre bâtiments posés');
    assert(!St.placed(m, m.structures[4]), 'la trouvaille jamais bâtie reste à reconstruire');
    m.territories.forEach((t) => assert(St.on(m, t).length <= St.capacity(t), 'capacité respectée'));
    // sans territoire : rangés, rien à repayer
    const bare = AN.Save.migrate({ version: 5, seed: 2, collection: [], territories: [], structures: [{ uid: 's1', id: 'forge', level: 1, slot: 0, built: 1 }] });
    assert(!St.placed(bare, bare.structures[0]) && bare.structures[0].built, 'rangé, déjà payé');
    Object.keys(D.RESOURCES).forEach((k) => (bare.stock[k] = 0));
    bare.territories = terr;
    eq(St.place(bare, bare.structures[0]), null, 'reposé gratuitement');
    assert(m.base && Array.isArray(m.base.guards), 'champ base ajouté');
  });
  test('Hexagone : gardes (points, garnison, compagnons)', () => {
    const B = AN.Base;
    const p = withTerritories(22, [['desert_osseux', 'territoire'], ['foret_fongique', 'territoire']]);
    Object.keys(D.RESOURCES).forEach((k) => (p.stock[k] = 500));
    const mk = (species, o) => { const c = AN.Save.normalizeCreature(Object.assign({ uid: 'g' + p.collection.length, species, variant: 'commun', level: 3, loyalty: 60 }, o)); p.collection.push(c); return c; };
    const a = mk('salamandre'), b = mk('mousseron'), c = mk('mousseron'), boss = mk('reine_mycelienne'), hurt = mk('mousseron', { injured: 1 });
    eq(B.guardPoints(p), D.BASE.guardPoints);
    p.companions.push(a.uid);
    eq(B.toggleGuard(p, a.uid), null);
    assert(!p.companions.includes(a.uid), 'un garde n’est plus compagnon');
    eq(B.toggleGuard(p, b.uid), null); eq(B.toggleGuard(p, c.uid), null);
    assert(B.toggleGuard(p, boss.uid), 'plus de points');
    assert(B.toggleGuard(p, hurt.uid), 'blessée : refusée');
    eq(AN.Structures.build(p, 'garnison'), null);
    eq(B.guardPoints(p), D.BASE.guardPoints + 3 + (AN.Structures.hasBonus(p, AN.Structures.built(p, 'garnison')) ? 1 : 0), 'la garnison ajoute des points');
    eq(B.toggleGuard(p, boss.uid), null, 'un ultra-boss coûte ' + AN.Profile.linkCost(boss.species) + ' points');
    eq(B.guardsUsed(p), 3 + AN.Profile.linkCost(boss.species));
    b.injured = 2; B.cleanGuards(p);
    assert(!B.isGuard(p, b.uid), 'un garde blessé quitte la garde');
    eq(B.toggleGuard(p, a.uid), null, 'retirer');
    assert(!B.isGuard(p, a.uid));
  });
  test('Hexagone : modules de défense (bâtir, installer, vigueur)', () => {
    const B = AN.Base;
    const p = withTerritories(23, [['ruines_mecaniques', 'territoire']]);
    Object.keys(D.RESOURCES).forEach((k) => (p.stock[k] = 500));
    const s0 = B.stats(p, 3);
    eq(s0.maxHp, D.BASE.hp + D.BASE.hpThreat * 3);
    eq(B.buildDefense(p, 'mur'), null); eq(B.buildDefense(p, 'mur'), null, 'niveau 2');
    assert(B.buildDefense(p, 'mur'), 'niveau maximal');
    eq(B.stats(p, 3).maxHp, s0.maxHp + D.DEFENSES.mur.levels[1].stat.hp);
    eq(B.stats(p, 3).armor, D.BASE.armor + D.DEFENSES.mur.levels[1].stat.armor);
    ['tourelle', 'bouclier', 'phare_lent'].forEach((id) => eq(B.buildDefense(p, id), null));
    eq(B.installed(p).length, D.BASE.defSlots, 'trois installés, le quatrième attend');
    assert(B.toggleInstall(p, 'phare_lent'), 'pas de place');
    eq(B.stats(p, 3).slow, 0, 'rangé, il n’agit pas');
    eq(AN.Structures.build(p, 'chantier'), null);
    eq(B.toggleInstall(p, 'phare_lent'), null, 'le chantier ajoute une place');
    assert(B.stats(p, 3).slow > 0 && B.stats(p, 3).turret && B.stats(p, 3).shield > 0);
    eq(B.toggleInstall(p, 'tourelle'), null, 'retirer');
    eq(B.stats(p, 3).turret, null);
    assert(B.level(p, 'tourelle') === 1, 'un module retiré n’est pas perdu');
  });
  /** Une fausse expédition, sans affichage, pour les règles de l'hexagone. */
  function fakeExpedition(p, seed) {
    const w = AN.WorldGen.destination(AN.hash('base' + seed), { threat: 3, reliability: 1 });
    const X = { profile: p, world: w, zi: 0, time: 0, cargo: [], allies: [], creatures: [], ending: false, collapse: null, player: { alive: true, x: 0, y: 0, r: 12 }, cam: { shake() {} } };
    const keep = p.base.guards;
    p.base.guards = [];
    AN.Base.setup(X);
    p.base.guards = keep;
    const zone = AN.ZoneGen.generate(w, 0);
    X.zone = zone;
    X.base.guards = []; // pas d'entités dans les tests
    AN.Base.onZoneGenerated(X, zone);
    X.base.state = 'ok';
    return X;
  }
  test('Hexagone : sol dégagé sous lui, le reste du monde inchangé', () => {
    const Z = AN.ZoneGen;
    const p = AN.Save.newProfile(24);
    for (let s = 0; s < 6; s++) {
      const w = AN.WorldGen.destination(AN.hash('base' + s), { threat: 3, reliability: 1 });
      const ref = Z.generate(w, 0);
      const X = fakeExpedition(p, s);
      const z = X.zone, b = X.base;
      eq(b.x, z.entry.x, 'posé sur l’entrée'); eq(b.y, z.entry.y);
      eq(JSON.stringify(z.nodes), JSON.stringify(ref.nodes), 'gisements identiques');
      let changed = 0;
      for (let i = 0; i < z.grid.length; i++) {
        if (z.grid[i] === ref.grid[i]) continue;
        changed++;
        const x = (i % z.w) * Z.T + Z.T / 2, y = Math.floor(i / z.w) * Z.T + Z.T / 2;
        assert(AN.Base.inHexShape(x - b.x, y - b.y, b.R + Z.T), 'case changée hors de l’hexagone');
        eq(z.grid[i], Z.FLOOR, 'dégagée en sol');
      }
      for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
        const px = x * Z.T + Z.T / 2, py = y * Z.T + Z.T / 2;
        if (AN.Base.inHexShape(px - b.x, py - b.y, b.R) && x >= 2 && y >= 2 && x < z.w - 2 && y < z.h - 2) assert(!Z.isSolid(z.grid[y * z.w + x]) || z.grid[y * z.w + x] === Z.KEYWALL || z.grid[y * z.w + x] === Z.BUILDING, 'relief sous l’hexagone');
      }
    }
    assert(AN.Base.inHexShape(0, 99, 100) && !AN.Base.inHexShape(0, 101, 100) && AN.Base.inHexShape(86, 0, 100) && !AN.Base.inHexShape(87, 0, 100) && !AN.Base.inHexShape(80, 60, 100), 'forme hexagonale');
  });
  test('Hexagone submergé : la soute est sauvée, les gardes au sol restent', () => {
    const B = AN.Base;
    const p = AN.Save.newProfile(25);
    const mk = (uid) => { const c = AN.Save.normalizeCreature({ uid, species: 'salamandre', variant: 'commun', level: 3, loyalty: 60 }); p.collection.push(c); p.base.guards.push(uid); return c; };
    mk('ga'); mk('gb');
    const X = fakeExpedition(p, 1);
    const b = X.base;
    // deux gardes : l'un debout sur l'hexagone, l'autre à terre
    b.guards = [{ uid: 'ga', alive: true, downed: false, x: b.x + 20, y: b.y, hp: 50, maxHp: 50 }, { uid: 'gb', alive: true, downed: true, x: b.x - 30, y: b.y, hp: 0, maxHp: 50 }];
    X.cargo = [{ species: 'mousseron', variant: 'commun' }, { structure: 'totem_betes', weight: 1, zone: 0, world: X.world.code }];
    X.player.x = b.x + b.R * 3; X.player.y = b.y; // le joueur est loin
    B.damage(X, b.hp * 0.3);
    eq(b.state, 'ok', 'il encaisse');
    const before = b.hp;
    b.shield = 0;
    B.damage(X, 1e9);
    assert(b.hp <= 0 && b.state === 'lift' && b.submerged, 'submergé');
    eq(X.cargo.length, 0, 'la soute part avec lui');
    eq(b.secured.length, 2);
    assert(!b.withPlayer && !X.ending, 'le joueur reste dans le monde');
    eq(b.aboard.join(), 'ga'); eq(b.abandoned.join(), 'gb');
    assert(before > 0);
    // le joueur sort ensuite par une plaque : le monde est détruit, le garde abandonné aussi
    const r = { injured: [], lost: [], rescueMsgs: [] };
    B.finish(X, p, 'extrait', r);
    assert(!p.collection.some((c) => c.uid === 'gb'), 'il ne reste qu’une essence');
    assert(p.essences.some((e) => e.uid === 'gb'));
    assert(p.collection.some((c) => c.uid === 'ga' && !c.lost), 'le garde à bord est rentré');
    eq(r.base.secured, 2);
    // après une chute, le monde n'est pas détruit : en sursis
    const p2 = AN.Save.newProfile(26);
    const c2 = AN.Save.normalizeCreature({ uid: 'gc', species: 'salamandre', variant: 'commun', level: 3, loyalty: 60 }); p2.collection.push(c2); p2.base.guards.push('gc');
    const X2 = fakeExpedition(p2, 2);
    X2.base.guards = [{ uid: 'gc', alive: true, downed: true, x: X2.base.x, y: X2.base.y, hp: 0, maxHp: 50 }];
    const r2 = { injured: [], lost: [], rescueMsgs: [] };
    B.finish(X2, p2, 'echec', r2);
    assert(c2.lost && c2.lost.seed === X2.world.seed && p2.sursis.length === 1, 'en sursis, une mission de sauvetage suivra');
    // à bord, avec le joueur : il part aussi
    const X3 = fakeExpedition(AN.Save.newProfile(27), 3);
    let ended = false;
    X3.player.x = X3.base.x; X3.player.y = X3.base.y;
    X3.cargo = [{ species: 'mousseron', variant: 'commun' }];
    const lift = B.lift;
    B.lift = function (XX, withPlayer) { ended = withPlayer; return lift.apply(this, [XX, withPlayer, () => {}]); };
    try { B.damage(X3, 1e9); } finally { B.lift = lift; }
    assert(ended && X3.ending && X3.base.secured.length === 1, 'le joueur à bord part avec l’hexagone et la soute');
  });
  test('Bâtiments 1.9 : effets et bonus du paysage', () => {
    const St = AN.Structures, P = AN.Profile;
    const p = withTerritories(28, [['jardins_ambre', 'territoire'], ['marais_electrique', 'territoire'], ['mer_regolithe', 'territoire'], ['cite_carbonisee', 'territoire']]);
    Object.keys(D.RESOURCES).forEach((k) => (p.stock[k] = 999));
    ['observatoire', 'bibliotheque', 'garnison', 'port_astres', 'temple', 'serre', 'chantier'].forEach((id) => eq(St.build(p, id), null, id));
    const pw = St.powers(p);
    assert(pw.scan >= 0.1 && pw.sweep >= 0.3 && pw.lore >= 0.15 && pw.guards >= 3 && pw.astres >= 1 && pw.mood >= 8 && pw.feed >= 0.25 && pw.buildCost >= 0.1 && pw.defSlots >= 1, JSON.stringify(pw));
    eq(St.terrOf(p, St.built(p, 'temple')).biome, 'jardins_ambre', 'le temple cherche la lumière');
    eq(St.statOf(St.built(p, 'temple'), p).mood, 8 + 4, 'bonus du paysage');
    const elsewhere = p.territories.find((t) => !St.suits('temple', t) && St.room(p, t) > 0);
    eq(St.move(p, St.built(p, 'temple'), elsewhere.uid), null);
    eq(St.statOf(St.built(p, 'temple'), p).mood || 0, 8, 'ailleurs, sans bonus');
    // la serre ralentit la faim, le chantier réduit les coûts
    assert(St.costMult(p) < P.craftMult(p), 'chantier');
    const st = { uid: 'v1', people: 'pales', attitude: 'suppliants', n: 6, home: p.territories[0].uid, village: true, mood: 60 };
    p.settlements = [st];
    const withTemple = AN.Settlements.moodTarget(p, st);
    St.store(p, St.built(p, 'temple'));
    eq(withTemple - AN.Settlements.moodTarget(p, st), 8, 'le temple apaise les peuples');
  });

  test('Typographie française à l’affichage', () => {
    const U = AN.Util;
    eq(U.typo('Soute : 3 places ; 40 % ? oui !'), 'Soute\u00a0: 3 places\u202f; 40\u00a0%\u202f? oui\u202f!');
    eq(U.typo('« Garder »'), '«\u00a0Garder\u00a0»');
    eq(U.typo('12:30, https://exemple.fr, x : y'), '12:30, https://exemple.fr, x\u00a0: y', 'heures et adresses intactes');
    eq(U.typo('déjà\u00a0: bon'), 'déjà\u00a0: bon', 'rien à refaire');
    eq(AN.h('p', null, 'Menace : 3').textContent, 'Menace\u00a0: 3', 'appliquée aux textes de l’interface');
  });

  test('Mondes : structures, filons profonds, événements', () => {
    let withS = 0, withE = 0, deep = 0;
    for (let s = 0; s < 40; s++) {
      const w = AN.WorldGen.destination(AN.hash('s14' + s), { threat: 3, reliability: 1 });
      const w2 = AN.WorldGen.destination(AN.hash('s14' + s), { threat: 3, reliability: 1 });
      eq(JSON.stringify(w.zones), JSON.stringify(w2.zones), 'déterministe');
      w.zones.forEach((z, i) => {
        if (z.event) { withE++; assert(D.WORLD_EVENTS[z.event], z.event); }
        if (z.structure) {
          withS++;
          assert(D.STRUCTURES[z.structure].biomes.some((b) => b === z.biome || b === z.mix), z.structure + ' hors de ses biomes');
          if (s < 12) { const zone = AN.ZoneGen.generate(w, i); assert(zone.structure && zone.structure.id === z.structure, 'placée dans la zone'); }
        }
      });
      if (s < 6) deep += AN.ZoneGen.generate(w, 0).nodes.filter((n) => n.deep).length;
    }
    assert(withS > 5 && withE > 10 && deep >= 6, withS + ' structures, ' + withE + ' événements, ' + deep + ' filons');
    return withS + ' structures, ' + withE + ' événements, ' + deep + ' filons profonds';
  });
  test('Sauvegarde v4 → v5 : outils et structures', () => {
    const m = AN.Save.migrate({ version: 4, seed: 3, loadout: { ranged: 'eclat' }, structures: [{ uid: 'a', kind: 'arche', people: 'pales' }], collection: [], territories: [] });
    eq(m.version, AN.Save.VERSION);
    eq(m.loadout.tool_harvest, null);
    eq(m.structures.length, 1);
  });

  test('Touches reconfigurables : traduction physique → logique', () => {
    const I = AN.Input, Pr = AN.Prefs;
    const keep = JSON.stringify(Pr.data.keys);
    Pr.data.keys = {};
    eq(I.logicalOf('KeyF').join(), 'KeyF');
    I.rebind('KeyF', 'KeyC');
    eq(I.logicalOf('KeyC').join(), 'KeyF', 'C capture');
    eq(I.logicalOf('KeyF').length, 0, 'F ne capture plus');
    I.rebind('KeyE', 'KeyC');
    eq(I.bound('KeyE'), 'KeyC'); eq(I.bound('KeyF'), 'KeyE', 'échange : la capture prend l’ancienne touche d’interaction');
    eq(I.logicalOf('KeyZ').join(), 'KeyZ', 'touche libre inchangée');
    Pr.data.keys = JSON.parse(keep);
  });
  test('Emplacements de partie', () => {
    const S = AN.Save;
    const was = [S.available, S.slot];
    S.available = false;
    eq(S.keyOf(1), 'archive-du-neant/save'); eq(S.keyOf(3), 'archive-du-neant/save-3');
    S.useSlot(2);
    const p = S.newProfile(4); p.stats.worlds = 7;
    S.write(p);
    const info = S.peek(2);
    eq(info.worlds, 7);
    eq(S.peek(3), null, 'emplacement vide');
    S.available = was[0]; S.useSlot(was[1]);
  });
  /* ---------- agencement de l'Archive (1.7) ---------- */
  const arrangeProfile = (n, seed) => {
    const p = AN.Save.newProfile(seed);
    const biomes = AN.Data.BIOMES.filter((b) => !b.scale && b.id !== 'seuil').map((b) => b.id);
    const Q = ['fragment', 'territoire', 'fragment', 'coeur', 'fragment', 'territoire', 'continent'];
    for (let i = 0; i < n; i++) {
      const quality = Q[i % Q.length], biome = biomes[(i * 7 + seed) % biomes.length];
      const pl = AN.Arrange.arrival(p, quality, biome, 1000 + i);
      p.territories.push({ uid: 't' + i, biome, quality, q: pl.q, r: pl.r, cells: pl.cells, seed: i + 1, stock: {} });
    }
    return p;
  };
  const layoutOk = (p, label) => {
    const occ = new Map();
    p.territories.forEach((t) => {
      eq(AN.Shapes.cellsOf(t).length, AN.Shapes.sizeOf(t.quality), label + ' : taille de ' + t.uid);
      AN.Shapes.abs(t).forEach((c) => {
        const k = AN.Hex.key(c.q, c.r);
        assert(k !== '0,0', label + ' : le centre est à l’Artefact');
        assert(!occ.has(k), label + ' : chevauchement en ' + k);
        occ.set(k, t);
      });
      const set = new Set(AN.Shapes.abs(t).map((c) => AN.Hex.key(c.q, c.r)));
      const seen = new Set([[...set][0]]); const st = [[...set][0]];
      while (st.length) { const [q, r] = st.pop().split(',').map(Number); AN.Hex.neighbors(q, r).forEach((nb) => { const k = AN.Hex.key(nb.q, nb.r); if (set.has(k) && !seen.has(k)) { seen.add(k); st.push(k); } }); }
      eq(seen.size, set.size, label + ' : ' + t.uid + ' d’un seul tenant');
    });
    // tout est relié à l'Artefact
    const seen = new Set(['0,0']); const st = ['0,0'];
    while (st.length) { const [q, r] = st.pop().split(',').map(Number); AN.Hex.neighbors(q, r).forEach((nb) => { const k = AN.Hex.key(nb.q, nb.r); if (occ.has(k) && !seen.has(k)) { seen.add(k); st.push(k); } }); }
    eq(seen.size - 1, occ.size, label + ' : relié à l’Artefact');
  };
  test('Agencement : les territoires qui arrivent comblent les creux', () => {
    const p = arrangeProfile(16, 3);
    layoutOk(p, 'arrivée');
    const s = AN.Arrange.summary(p);
    eq(s.holes, 0, 'pas de case vide enclavée');
    const again = arrangeProfile(16, 3);
    eq(JSON.stringify(again.territories.map((t) => [t.q, t.r, t.cells])), JSON.stringify(p.territories.map((t) => [t.q, t.r, t.cells])), 'déterministe');
  });
  test('Agencement : forme adaptée au déplacement', () => {
    const p = arrangeProfile(10, 5);
    const t = p.territories.find((x) => x.quality === 'territoire');
    const occ = AN.Shapes.occupancy(p, t);
    const free = AN.Hex.spiral(12).find((h) => !occ.has(AN.Hex.key(h.q, h.r)) && AN.Hex.neighbors(h.q, h.r).some((nb) => occ.has(AN.Hex.key(nb.q, nb.r))));
    const m = AN.Arrange.moldAt(p, t, free.q, free.r, 0);
    assert(m, 'une forme est trouvée');
    eq(m.cells.length, AN.Shapes.cellsOf(t).length);
    eq(m.q, free.q); eq(m.r, free.r);
    assert(AN.Shapes.canPlace(p, t, m.q, m.r, m.cells).ok, 'la forme se pose');
    const other = p.territories.find((x) => x !== t);
    eq(AN.Arrange.moldAt(p, t, other.q, other.r, 0), null, 'pas sur un autre territoire');
    const v1 = AN.Arrange.moldAt(p, t, free.q, free.r, 3);
    assert(v1 && v1.cells.length === m.cells.length, 'une variante a la même taille');
  });
  test('Agencement : rangement automatique', () => {
    const p = arrangeProfile(14, 7);
    const I = AN.Arrange._internal;
    const val = (prof, reshape) => { const M = I.model(prof); return I.evaluate(I.stateFrom(prof, M), M, reshape).total; };
    const before = AN.Arrange.snapshot(p);
    // formes fixes : chaque territoire garde sa forme (à une rotation près)
    const v0 = val(p, false);
    const fixed = AN.Arrange.auto(p, { reshape: false, budget: 20000, passes: 3 });
    const shapes0 = p.territories.map((t) => AN.Arrange.rotationsOf(AN.Shapes.cellsOf(t)).map((r) => { const b = r.reduce((m, c) => (c[0] < m[0] || (c[0] === m[0] && c[1] < m[1]) ? c : m), r[0]); return r.map(([q, rr]) => (q - b[0]) + ',' + (rr - b[1])).sort().join(';'); }));
    AN.Arrange.apply(p, fixed.layout);
    layoutOk(p, 'formes fixes');
    p.territories.forEach((t, i) => {
      const c = AN.Shapes.cellsOf(t); const b = c.reduce((m, x) => (x[0] < m[0] || (x[0] === m[0] && x[1] < m[1]) ? x : m), c[0]);
      assert(shapes0[i].includes(c.map(([q, r]) => (q - b[0]) + ',' + (r - b[1])).sort().join(';')), 'forme gardée : ' + t.uid);
    });
    assert(val(p, false) >= v0 - 1e-6, 'pas moins bien rangé qu’avant');
    // formes adaptées
    assert(AN.Arrange.restore(p, before), 'défaire');
    eq(JSON.stringify(AN.Arrange.snapshot(p)), JSON.stringify(before), 'retour à l’identique');
    const r0 = val(p, true);
    const res = AN.Arrange.auto(p, { reshape: true, budget: 20000, passes: 3 });
    AN.Arrange.apply(p, res.layout);
    layoutOk(p, 'formes adaptées');
    assert(val(p, true) >= r0 - 1e-6, 'pas moins bien rangé qu’avant (formes adaptées)');
    assert(res.after.pos >= res.before.pos - 1 && res.after.prod >= res.before.prod - 0.05, 'au moins autant de synergies');
  });
  test('Reprise d’expédition : changements d’une zone', () => {
    const R = AN.Resume;
    const a = new Uint8Array(500); for (let i = 40; i < 200; i++) a[i] = 1; a[480] = 1;
    eq(Array.from(R.unrle(R.rle(a), 500)).join(''), Array.from(a).join(''), 'brouillard');
    const w = AN.WorldGen.destination(AN.hash('reprise'), { threat: 2, reliability: 1 });
    const z = AN.ZoneGen.generate(w, 0);
    z.state = { fog: a.slice(0, z.w * z.h) };
    z.nodes[0].uses = 0; z.nodes[0].amount = 0;
    if (z.ruins[0]) z.ruins[0].used = true;
    const d = JSON.parse(JSON.stringify(R.zoneDelta(z)));
    const z2 = AN.ZoneGen.generate(w, 0);
    z2.state = { fog: new Uint8Array(z2.w * z2.h) };
    R.applyZone({ conquered: new Set([0]), restore: null }, z2, d);
    eq(z2.nodes[0].uses, 0, 'gisement épuisé');
    if (z.ruins[0]) assert(z2.ruins[0].used, 'ruine fouillée');
    eq(z2.state.conquered, true);
    eq(z2.state.fog[100], 1, 'brouillard levé');
  });
  test('Musique : un thème par monde, reproductible', () => {
    const M = AN.Music;
    const ids = Object.keys(D.BIOME);
    ids.forEach((id) => assert(M.MODES[M.biomeMood(id).mode], 'mode connu pour ' + id));
    const a = M.compose('expedition', { seed: 1234, biome: 'riviere_lave' });
    const b = M.compose('expedition', { seed: 1234, biome: 'riviere_lave' });
    eq(JSON.stringify([a.mode, a.root, a.prog, a.motif]), JSON.stringify([b.mode, b.root, b.prog, b.motif]), 'même graine, même thème');
    const themes = new Set();
    for (let s = 1; s <= 12; s++) { const t = M.compose('expedition', { seed: s * 7919, biome: 'riviere_lave' }); themes.add(JSON.stringify([t.prog, t.motif])); }
    assert(themes.size >= 10, 'des graines différentes donnent des thèmes différents (' + themes.size + ' / 12)');
    const modes = new Set(ids.filter((id) => !D.BIOME[id].scale).map((id) => M.biomeMood(id).mode));
    assert(modes.size >= 4, 'les paysages ne sonnent pas tous pareil (' + modes.size + ' modes)');
    const st = M.compose('expedition', { seed: 5, biome: ids[0] });
    st.prog.forEach((d) => assert(d >= 0 && d < st.scale.length, 'accord dans la gamme'));
    assert(M.rootHz(ids[0], 'galaxie') < M.rootHz(ids[0]), 'les échelons cosmiques sonnent plus grave');
  });
  test('Optimisations (1.8.2) : mêmes résultats qu’avant', () => {
    const U = AN.Util;
    const oldHex = (r, g, b) => '#' + [r, g, b].map((v) => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
    const rnd = new AN.RNG(42);
    for (let i = 0; i < 3000; i++) { const r = rnd.float(-60, 320), g = rnd.float(-60, 320), b = rnd.float(-60, 320); eq(U.toHex(r, g, b), oldHex(r, g, b), 'couleur ' + r + ',' + g + ',' + b); }
    eq(U.toHex(NaN, 0, 0), oldHex(NaN, 0, 0), 'couleur invalide');
    [0, 7, 999, 1000, 123456, -98765, 0.5, 2.5].forEach((n) => eq(U.fmt(n), Math.round(n).toLocaleString('fr-FR'), 'nombre ' + n));
    const S = AN.Shapes, H = AN.Hex;
    const fresh = (t) => { const cs = S.abs(t).map((c) => H.toPx(c.q, c.r)); const c = { x: cs.reduce((s, p) => s + p.x, 0) / cs.length, y: cs.reduce((s, p) => s + p.y, 0) / cs.length }; return [c.x, c.y, cs.reduce((m, p) => Math.max(m, Math.hypot(p.x - c.x, p.y - c.y)), 0) + H.R]; };
    const t = { uid: 'x', q: 2, r: -1, cells: [[0, 0], [1, 0], [0, 1]] };
    const got = () => { const c = S.centroid(t); return [c.x, c.y, S.radius(t)]; };
    eq(JSON.stringify(got()), JSON.stringify(fresh(t)), 'centre et rayon');
    t.q = -3; eq(JSON.stringify(got()), JSON.stringify(fresh(t)), 'après un déplacement');
    t.cells = [[0, 0], [0, 1]]; eq(JSON.stringify(got()), JSON.stringify(fresh(t)), 'après un changement de forme');
    const cam = new AN.Camera(); cam.resize(1280, 760, 1); cam.x = 300; cam.y = -120; cam.zoom = 1.1875;
    for (let i = 0; i < 2000; i++) { const x = rnd.float(-800, 1400), y = rnd.float(-900, 700), r = rnd.float(0, 200); const v = cam.view(r); eq(cam.visible(x, y, r), x >= v.x0 && x <= v.x1 && y >= v.y0 && y <= v.y1, 'visibilité'); }
  });

  /* ---------- 1.10 : au-delà de la galaxie, lieux ancrés ---------- */
  test('Empreinte des mondes (1.12)', () => {
    // les mondes ont changé en 1.11 (nouveaux paysages) ; cette empreinte signale toute autre modification de la génération
    const parts = [];
    ['region', 'monde', 'orbite', 'systeme', 'galaxie'].forEach((sc) => {
      for (let s = 1; s <= 4; s++) {
        const w = AN.WorldGen.destination(AN.hash('fp' + sc + s), sc === 'region' ? { threat: 1 + s, reliability: 1 } : { scale: sc, threat: 7, reliability: 1 });
        parts.push(JSON.stringify([w.code, w.zones.map((z) => [z.biome, z.guardian]), w.heart && w.heart.guardian]));
        for (let i = 0; i <= w.zones.length; i++) { const z = AN.ZoneGen.generate(w, i); parts.push(AN.hash(Array.from(z.grid).join('')) + ':' + z.nodes.length + ':' + z.groups.length); }
      }
    });
    eq(AN.hash(parts.join('|')), EMPREINTE_1_11, 'empreinte des mondes');
  });
  test('Amas, Toile, Pli : zones reproductibles et accessibles', () => {
    const Z = AN.ZoneGen;
    let n = 0;
    ['amas', 'toile', 'pli'].forEach((sc) => {
      const E = D.ECHELONS[sc];
      for (let s = 1; s <= 3; s++) {
        const w = AN.WorldGen.destination(AN.hash('au-dela' + sc + s), { scale: sc, threat: 7, reliability: 1 });
        eq(w.scale, sc);
        assert(w.zones.every((z) => D.BIOME[z.biome].scale === sc && !D.BIOME[z.biome].heartOnly), sc + ' : biomes de l’échelon');
        if (E.heartBiome) eq(w.heart.biome, E.heartBiome, 'cœur du Pli');
        eq(D.CREATURE[w.heart.guardian].tier, E.boss, sc + ' : maître');
        for (let i = 0; i <= w.zones.length; i++) {
          const z = Z.generate(w, i), z2 = Z.generate(w, i);
          eq(Array.from(z.grid).join(''), Array.from(z2.grid).join(''), sc + ' : même graine, même zone');
          eq(JSON.stringify([z.bridges, z.filaments, z.inversions]), JSON.stringify([z2.bridges, z2.filaments, z2.inversions]));
          if (sc === 'amas') { assert(z.bridges.length > 0, 'ponts'); z.bridges.forEach((b) => b.tiles.forEach((k) => eq(z.grid[k], Z.BRIDGE_ON, 'pont ouvert au départ'))); assert(Z.isSolid(Z.BRIDGE_OFF) && !Z.isSolid(Z.BRIDGE_ON), 'pont défait = vide'); }
          else eq(z.bridges.length, 0);
          if (sc === 'toile') assert(z.filaments.length >= 3, 'filaments'); else eq(z.filaments.length, 0);
          if (sc === 'pli') assert(z.inversions.length > 0, 'endroits de l’envers'); else eq(z.inversions.length, 0);
          // tout ce qui compte est accessible (les ponts finissent toujours par revenir)
          const T = z.T, seen = new Uint8Array(z.w * z.h);
          const start = Math.floor(z.entry.y / T) * z.w + Math.floor(z.entry.x / T);
          const stack = [start]; seen[start] = 1;
          const blocked = (g) => g === Z.WALL || g === Z.ABYSS;
          while (stack.length) { const k = stack.pop(); [k - 1, k + 1, k - z.w, k + z.w].forEach((j) => { if (j >= 0 && j < seen.length && !seen[j] && !blocked(z.grid[j])) { seen[j] = 1; stack.push(j); } }); }
          const reach = (p) => seen[Math.floor(p.y / T) * z.w + Math.floor(p.x / T)] === 1;
          z.plates.forEach((p) => assert(reach(p), sc + ' : plaque inaccessible'));
          z.gates.forEach((g) => assert(reach(g), sc + ' : passage inaccessible'));
          assert(reach(z.arena), sc + ' : arène inaccessible');
          n++;
        }
      }
    });
    return n + ' zones vérifiées';
  });
  test('Formes de capture d’au-delà : ancrage et indices', () => {
    const p = AN.Save.newProfile(41);
    const X = { profile: p, world: { threat: 7 }, creatures: [], player: { x: 0, y: 0 } };
    [['berger_amas', 'rassemblement', 8], ['tisserand', 'tissage', 9], ['relieur', 'reflet', 10]].forEach(([sp, kind, tier]) => {
      const def = D.CREATURE[sp];
      assert(def, 'maître ' + sp);
      eq(def.tier, tier); eq(D.ECHELONS[def.scale].form, kind);
      const e = { def, alive: true, boss: { exhausted: true, form: { kind, done: true, orbs: [{ held: true }, {}], order: [0, 1, 2, 3, 4], next: 2 } } };
      p.artefact.ancrage = 4;
      assert(!AN.Cosmic.formReady(X, e), sp + ' : ancrage insuffisant');
      p.artefact.ancrage = D.UPGRADES.ancrage.levels.findIndex((l) => l.v.tier >= tier);
      assert(p.artefact.ancrage > 0 && AN.Cosmic.formReady(X, e), sp + ' : ancré');
      e.boss.form.done = false;
      assert(!AN.Cosmic.formReady(X, e), sp + ' : forme à accomplir');
      assert(AN.Cosmic.formHint(X, e).length > 0, sp + ' : indice');
    });
    eq(AN.Beyond.formHint(X, null, { kind: 'rassemblement', orbs: [{ held: true }, {}, {}, {}] }), 'galaxies ramenées : 1 / 4');
    eq(AN.Beyond.formHint(X, null, { kind: 'tissage', order: [0, 1, 2, 3, 4], next: 3 }), 'nœuds reliés : 3 / 5');
  });
  test('Échos du Pli : tirés du journal', () => {
    const j = { code: 'ABC-12', region: 'Forêt fongique', outcome: 'extrait', territories: 2, creatures: ['Sporelin', 'Myrmidon', 'Lucane'] };
    const line = AN.Beyond.echoLine(j, () => 0);
    assert(line.startsWith('Vous, sur ABC-12.'), line);
    assert(line.includes('2 territoires vous suivaient') && line.includes('Sporelin et Myrmidon, et d’autres,'), line);
    ['extrait', 'urgence', 'echec', 'retour'].forEach((o) => D.ECHO_LINES[o].forEach((l) => assert(l.includes('{code}'), 'réplique ' + o)));
    assert(AN.Beyond.echoLine({ code: 'X-1', outcome: 'inconnue' }, () => 0).includes('X-1'), 'issue inconnue');
    assert(D.ECHO_HOSTILE && D.ECHO_DEF && D.ECHO_DEF.echo && D.ECHO_HOSTILE.echo, 'échos définis');
  });
  test('Lieux ancrés : liste et monde regénéré à l’identique', () => {
    const Pl = AN.Places;
    const p = AN.Save.newProfile(42);
    p.cosmos.astres.push({ uid: 'a1', biome: 'ceinture_asteroides', kind: D.ASTRES.ceinture_asteroides.kind, layer: D.ASTRES.ceinture_asteroides.layer, name: 'Ceinture d’Ister', world: 'IST-21' });
    p.cosmos.astres.push({ uid: 'a2', biome: 'nebuleuse', kind: D.ASTRES.nebuleuse.kind, layer: D.ASTRES.nebuleuse.layer, name: 'Nébuleuse d’Orn', world: 'ORN-07' });
    ['foret_fongique', 'foret_fongique', 'riviere_lave'].forEach((b, i) => p.territories.push({ uid: 't' + i, biome: b, quality: 'continent', world: 'MOR-88', q: i, r: 0, stock: {} }));
    p.territories.push({ uid: 'c0', biome: 'foret_fongique', quality: 'cratere', world: 'MOR-88', q: 5, r: 0, stock: {} });
    p.territories.push({ uid: 'r0', biome: 'foret_fongique', quality: 'territoire', world: 'RRR-01', q: 6, r: 0, stock: {} });
    const L = Pl.list(p);
    eq(L.map((x) => x.id).join(','), 'a:a1,a:a2,m:MOR-88');
    const m = Pl.find(p, 'm:MOR-88');
    eq(m.scale, 'monde'); eq(m.biome, 'foret_fongique', 'le paysage le plus rapporté'); eq(m.continents, 4);
    eq(Pl.find(p, 'a:a1').scale, 'orbite'); eq(Pl.find(p, 'a:a2').scale, D.BIOME.nebuleuse.scale);
    L.forEach((pl) => {
      const w1 = Pl.world(p, pl), w2 = Pl.world(p, pl);
      eq(w1.scale === 'monde' ? 'monde' : w1.scale, pl.scale, 'échelon du lieu');
      eq(JSON.stringify(w1.zones), JSON.stringify(w2.zones), pl.id + ' : toujours le même');
      eq(w1.place, pl.id); assert(!w1.civ && !w1.rescue, 'pas de peuple ni de sauvetage');
      assert(w1.zones.concat([w1.heart]).some((z) => z.biome === pl.biome), pl.id + ' : son paysage');
      eq(Array.from(AN.ZoneGen.generate(w1, 0).grid).join(''), Array.from(AN.ZoneGen.generate(w2, 0).grid).join(''));
    });
    assert(Pl.world(p, L[0]).seed !== Pl.world(AN.Save.newProfile(43), L[0]).seed, 'propre à chaque Archive');
  });
  test('Lieux ancrés : ce qui repousse, ce qui revient', () => {
    const Pl = AN.Places;
    const p = AN.Save.newProfile(44);
    p.cosmos.astres.push({ uid: 'a1', biome: 'mer_regolithe', kind: D.ASTRES.mer_regolithe.kind, layer: D.ASTRES.mer_regolithe.layer, name: 'Mer grise', world: 'GRS-04' });
    const place = Pl.list(p)[0];
    const w = Pl.world(p, place);
    const zone = AN.ZoneGen.generate(w, 0);
    zone.state = { conquered: true };
    const full = zone.nodes.map((nd) => nd.uses);
    zone.nodes.forEach((nd) => { nd.uses = 0; nd.amount = 0; });
    const X = { profile: p, world: w, zones: [zone], zone, creatures: [], conquered: new Set() };
    Pl.save(X, p);
    const v = Pl.visit(p, place.id);
    eq(v.count, 1);
    eq(v.zones[0].cleared.length, zone.groups.length, 'tous les groupes vaincus');
    const again = (minutes) => {
      v.zones[0].at = Date.now() - minutes * 60000;
      const z = AN.ZoneGen.generate(w, 0); z.state = {};
      Pl.applyZone(X, z);
      return z;
    };
    let z = again(0);
    assert(z.nodes.every((nd) => nd.uses === 0), 'rien n’a repoussé');
    zone.groups.forEach((_, gi) => assert(Pl.groupCleared(z, gi), 'groupe encore absent'));
    assert(z.state.conquered, 'gardien encore absent');
    z = again(D.PLACES.regrow / 2);
    assert(z.nodes.some((nd, i) => nd.uses > 0 && nd.uses < full[i]) || z.nodes.every((nd, i) => nd.uses === Math.floor(full[i] / 2)), 'à moitié repoussé');
    z = again(Math.max(D.PLACES.regrow, D.PLACES.respawn, D.PLACES.guardian) + 1);
    eq(z.nodes.map((nd) => nd.uses).join(','), full.join(','), 'tout a repoussé');
    assert(!Pl.groupCleared(z, 0) && !z.state.conquered, 'les créatures et le gardien sont revenus');
    v.zones[0].at = Date.now();
    w.zones.length && (X.world = w);
    Pl.prepare(X);
    assert(X.conquered.has(0), 'zone encore conquise au départ');
    const m = AN.Save.migrate({ version: 5, seed: 3, collection: [], territories: [], cosmos: { astres: [] } });
    assert(m.cosmos.visits && typeof m.cosmos.visits === 'object', 'mémoire des visites dans les anciennes sauvegardes');
  });

  test('Noms propres : stables, élidés, à l’échelle (1.11)', () => {
    const N = AN.Names;
    eq(N.proper('IST-21'), N.proper('IST-21'), 'même code, même nom');
    const names = new Set();
    for (let i = 0; i < 400; i++) { const n = N.proper('W' + i); names.add(n); assert(/^[A-ZÉ][a-zéèêëïîôûüàâ]+$/.test(n), 'nom bien formé : ' + n); assert(!D.PROPER.avoid.includes(n), 'mot évité : ' + n); }
    assert(names.size > 300, 'des noms variés (' + names.size + ' / 400)');
    eq(N.de('Arithal'), 'd’Arithal'); eq(N.de('Nylombe'), 'de Nylombe'); eq(N.de('Hévane'), 'd’Hévane');
    const p = N.proper('KEL-OSS-12');
    eq(N.world('systeme', 'KEL-OSS-12'), 'Système ' + N.de(p));
    eq(N.world('monde', 'KEL-OSS-12'), 'Planète ' + p);
    eq(N.astre({ uid: 'a1', biome: 'couronne_solaire', world: 'KEL-OSS-12' }), 'Planète-tison ' + N.de(p), 'un astre porte le nom de son monde');
    eq(N.astreKind({ biome: 'couronne_solaire' }), 'Planète-tison', 'plus d’étoile naine prise pour un monde');
    const w = AN.WorldGen.destination(AN.hash('noms'), { scale: 'galaxie', threat: 7, reliability: 1 });
    eq(w.region, 'Galaxie ' + N.de(N.proper(w.code)), 'le monde porte son nom');
    // ce qu'on ramène d'une galaxie est à sa taille
    Object.keys(D.ASTRES).forEach((b) => { const A = D.ASTRES[b]; assert(A.noun && A.name, 'nom de l’astre ' + b); assert(D.BIOME[b] && D.BIOME[b].scale === A.layer, b + ' : couche ' + A.layer); });
    ['nebuleuse', 'bras_etoiles', 'halo_sombre', 'coeur_galactique', 'remanent'].forEach((b) => assert(!/étoile naine|système stellaire/i.test(D.ASTRES[b].name), b));
  });
  test('Lieux ancrés : un par monde d’origine, nommé à son échelle (1.11)', () => {
    const Pl = AN.Places, N = AN.Names;
    const p = AN.Save.newProfile(51);
    const add = (biome, world) => p.cosmos.astres.push({ uid: 'u' + p.cosmos.astres.length, biome, kind: D.ASTRES[biome].kind, layer: D.ASTRES[biome].layer, world, zoneName: 'z' });
    add('couronne_solaire', 'ARI-01'); add('geante_gazeuse', 'ARI-01'); add('nebuleuse', 'ARI-01'); add('queue_comete', 'NYL-02');
    p.territories.push({ uid: 't0', biome: 'rift_continental', quality: 'continent', world: 'MON-03', q: 0, r: 0, stock: {} });
    const L = Pl.list(p);
    eq(L.length, 4, 'deux astres du même système ouvrent un seul lieu ; la nébuleuse, prise dans une galaxie, un autre');
    const sys = L.find((x) => x.id === 'a:u0');
    eq(sys.name, 'Système ' + N.de(N.proper('ARI-01'))); eq(sys.astres.join(), 'u0,u1');
    eq(Pl.ofAstre(p, 'u1').id, 'a:u0');
    eq(L.find((x) => x.id === 'a:u2').scale, 'galaxie');
    const m = L.find((x) => x.id === 'm:MON-03');
    assert(m, 'un continent d’un monde entier'); eq(m.name, 'Planète ' + N.proper('MON-03'));
    const w = Pl.world(p, sys);
    eq(w.code, 'ARI-01', 'le lieu garde le code de son monde'); eq(w.region, sys.name);
    eq(w.zones.concat([w.heart]).some((z) => z.biome === 'couronne_solaire'), true);
  });
  test('Mondes entiers : des continents à eux (1.11)', () => {
    let own = 0, n = 0;
    for (let s = 1; s <= 40; s++) {
      const w = AN.WorldGen.destination(AN.hash('cont' + s), { scale: 'monde', threat: 7, reliability: 1 });
      w.zones.forEach((z) => { n++; if (D.BIOME[z.biome].scale === 'monde') own++; assert(z.biome !== 'cratere_souverain', 'le cratère reste le cœur'); });
      eq(w.heart.biome, 'cratere_souverain');
    }
    assert(own > n * 0.25, 'continents propres aux mondes : ' + own + ' / ' + n);
    for (let s = 1; s <= 40; s++) {
      const w = AN.WorldGen.destination(AN.hash('reg' + s), { threat: 1 + (s % 7), reliability: 1 });
      assert(w.zones.every((z) => !D.BIOME[z.biome].scale), 'une région n’a pas de continent');
    }
    return own + ' / ' + n;
  });

  /* ---------- 1.12 : bienfaits, nations ---------- */
  test('Bienfaits à la mesure de l’échelle (1.12)', () => {
    const order = ['orbite', 'systeme', 'galaxie', 'amas', 'toile'];
    // pour une même nature de bienfait, un astre d'une couche plus haute apporte plus
    const best = {};
    Object.values(D.ASTRES).forEach((A) => Object.keys(A.stat).forEach((k) => { const L = order.indexOf(A.layer); const v = A.stat[k] * (Object.keys(A.stat).length); (best[k] = best[k] || []).push([L, v]); }));
    Object.entries(best).forEach(([k, list]) => list.forEach(([la, va]) => list.forEach(([lb, vb]) => { if (lb > la) assert(vb >= va, k + ' : couche ' + order[lb] + ' (' + vb + ') ≥ ' + order[la] + ' (' + va + ')'); })));
    // les gardiens des échelons supérieurs dépassent la base des régions
    D.CREATURES.filter((c) => c.tier === 2 && c.power && c.scale).forEach((c) => Object.keys(c.power.stat).forEach((k) => { if (k !== 'reveal') assert(c.power.stat[k] > D.BOON_BASE[k], c.id + ' : ' + k); }));
    // les grands êtres : plus le rang est haut, plus l'influence pèse (pour une même nature)
    const g = {};
    D.CREATURES.filter((c) => c.tier >= 4 && c.global).forEach((c) => Object.keys(c.global.stat).forEach((k) => (g[k] = g[k] || []).push([c.tier, c.global.stat[k]])));
    Object.entries(g).forEach(([k, list]) => list.forEach(([ta, va]) => list.forEach(([tb, vb]) => { if (tb > ta && k !== 'reveal') assert(vb >= va, k + ' : rang ' + tb + ' ≥ rang ' + ta); })));
    eq(D.statText({ prod: 0.25, capture: 0.4, reveal: 1 }), '+25 % de production, capture 40 % plus rapide et carte toujours révélée');
    eq(D.statText({ regen: 1.8 }), 'Régénère 1,8 PV par seconde');
  });
  test('Nations : des mondes tenus par un peuple (1.12)', () => {
    const found = {};
    ['region', 'monde', 'orbite', 'systeme'].forEach((sc) => {
      let n = 0, w = null;
      for (let s = 1; s <= 120; s++) {
        const x = AN.WorldGen.destination(AN.hash('nat' + sc + s), { scale: sc, threat: 4, reliability: 1 });
        if (x.nation) { n++; if (!w) w = x; }
      }
      assert(w, sc + ' : aucune nation');
      found[sc] = n;
      const again = AN.WorldGen.destination(w.seed, { scale: sc, threat: 4, reliability: 1 });
      eq(JSON.stringify(again.nation), JSON.stringify(w.nation), sc + ' : même graine, même nation');
      assert(!w.civ, 'pas de village isolé dans une nation');
      assert(D.PEOPLE[w.nation.people].reach.includes(sc), sc + ' : peuple à cette échelle');
      for (let i = 0; i <= w.zones.length; i++) {
        const z = AN.ZoneGen.generate(w, i);
        assert(z.village && z.village.city, sc + ' : une ville en zone ' + i);
        const kinds = z.village.buildings.map((b) => b.kind);
        assert(kinds.includes('market') && kinds.includes('hall'), sc + ' : comptoir et caserne');
        if (i === w.zones.length) { assert(z.village.capital && kinds.includes('palace'), sc + ' : la capitale et son palais'); eq(z.village.name, w.nation.capital); }
        assert(kinds.filter((k) => k === 'house').length >= 8, sc + ' : des maisons');
      }
    });
    return Object.entries(found).map(([k, v]) => k + ' ' + v + '/120').join(', ');
  });
  test('Nations : faveur, comptoirs, mercenaires, tribut, lieu ancré (1.12)', () => {
    const Na = AN.Nations;
    const p = AN.Save.newProfile(61);
    eq(Na.startFavor(p, { people: 'pales', attitude: 'devots' }), 55);
    eq(Na.startFavor(p, { people: 'pales', attitude: 'hostiles' }), -60);
    AN.Civ.peopleMemo(p, 'pales').saved = 40;
    eq(Na.startFavor(p, { people: 'pales', attitude: 'fiers' }), 20, 'ceux qu’on a sauvés s’en souviennent');
    assert(Na.priceMul(100) < Na.priceMul(0) && Na.priceMul(0) < Na.priceMul(-60), 'la faveur fait baisser les prix');
    const deals = Na.makeDeals('x', 'desert_osseux', 'pales', 0, 'region');
    const cheap = Na.makeDeals('x', 'desert_osseux', 'pales', 100, 'region');
    assert(deals.length >= 4, 'des offres');
    deals.forEach((d, i) => { const a = Object.values(d.give)[0], b = Object.values(cheap[i].give)[0]; assert(b <= a, 'moins cher en faveur'); });
    assert(Na.mercCost('pales', 'guard', 'systeme').verre > Na.mercCost('pales', 'guard', 'region').verre, 'plus cher dans un monde plus grand');
    // une nation ancrée
    let w = null;
    for (let s = 1; s < 400 && !w; s++) { const x = AN.WorldGen.destination(AN.hash('anc' + s), { threat: 4, reliability: 1 }); if (x.nation) w = x; }
    p.nations.push({ code: w.code, seed: w.seed, scale: 'region', threat: 4, people: w.nation.people, attitude: w.nation.attitude, mode: 'allie', favor: 70, since: Date.now(), primary: w.primary, region: w.region });
    const pl = AN.Places.list(p).find((x) => x.kind === 'nation');
    assert(pl, 'la nation devient un lieu ancré'); eq(pl.id, 'n:' + w.code);
    const w2 = AN.Places.world(p, pl);
    eq(w2.code, w.code); eq(w2.nation.people, w.nation.people, 'son monde, regénéré à l’identique');
    eq(JSON.stringify(w2.zones.map((z) => z.biome)), JSON.stringify(w.zones.map((z) => z.biome)));
    const before = JSON.stringify(p.stock);
    Na.tick(p, D.NATION.tribute.period * 2 + 1);
    assert(JSON.stringify(p.stock) !== before, 'le tribut arrive');
    p.nations[0].favor = -10;
    const mid = JSON.stringify(p.stock);
    Na.tick(p, D.NATION.tribute.period * 3);
    eq(JSON.stringify(p.stock), mid, 'une nation qui vous en veut ne paie pas');
    const m = AN.Save.migrate({ version: 6, seed: 3, collection: [], territories: [] });
    assert(Array.isArray(m.nations) && Array.isArray(m.mercs), 'anciennes sauvegardes : nations et mercenaires');
  });

  /* ---------- 1.13 : les limites des nations ---------- */
  // une expédition réduite à ce que lisent les missions
  function natX(p, w, favor) {
    const X = { world: w, profile: p, zi: 0, zones: [], conquered: new Set(), player: { x: 0, y: 0, alive: true }, bag: {}, creatures: [], civils: [], allies: [], S: { bagCap: 40 }, echelon: null };
    X.addToBag = (r, n) => { X.bag[r] = (X.bag[r] || 0) + n; return n; };
    X.nation = Object.assign({}, w.nation, { favor, trades: 0, gifts: 0, killed: 0, guardians: 0, deals: {}, met: false, war: false, anchored: null });
    X.nation.attitude = 'fiers';
    return X;
  }
  function natWorld(tag, zones) {
    for (let s = 1; s < 2000; s++) { const w = AN.WorldGen.destination(AN.hash(tag + s), { threat: 4, reliability: 1 }); if (w.nation && w.zones.length >= zones) return w; }
    return null;
  }
  test('Lieux ancrés : jamais le monde d’une nation, identiques à la 1.11 (1.13)', () => {
    let n = 0;
    for (let s = 1; s < 300 && n < 6; s++) {
      const seed = AN.hash('lieu-nation' + s);
      ['region', 'monde', 'orbite'].forEach((scale) => {
        const ctx = scale === 'region' ? { threat: 4, reliability: 1 } : { scale, threat: 7, reliability: 1 };
        const w = AN.WorldGen.destination(seed, ctx);
        if (!w.nation) return;
        n++;
        const w2 = AN.WorldGen.destination(seed, Object.assign({ noNation: true }, ctx));
        assert(!w2.nation, 'pas de nation');
        eq(JSON.stringify(w2.zones.map((z) => [z.biome, z.guardian])), JSON.stringify(w.zones.map((z) => [z.biome, z.guardian])), 'mêmes paysages, mêmes gardiens');
        assert(!AN.ZoneGen.generate(w2, 0).village || !AN.ZoneGen.generate(w2, 0).village.city, 'pas de ville');
      });
    }
    assert(n >= 3, n + ' mondes de nation essayés');
    const p = AN.Save.newProfile(62);
    for (let i = 0; i < 30; i++) {
      const w = AN.Places.world(p, { id: 'a:test' + i, kind: 'astre', scale: ['monde', 'orbite', 'systeme'][i % 3], biome: null, name: 'Test', from: 'DEBUG' });
      assert(!w.nation, 'un lieu ancré (' + i + ') n’est pas devenu une nation');
    }
  });
  test('Nations : missions des gouverneurs (1.13)', () => {
    const Na = AN.Nations;
    const p = AN.Save.newProfile(63);
    const w = natWorld('mission', 3);
    const X = natX(p, w, 20);
    eq(Na.mission(X, 1).kind, Na.mission(natX(p, w, 20), 1).kind, 'même graine, même mission');
    assert(Na.mission(X, 1) === Na.mission(X, 1), 'gardée pendant l’expédition');
    // battue
    const b = Na.mission(X, 0, 'battue');
    eq(b.state, 'offer');
    eq(Na.accept(X, 0), 'ok'); eq(b.state, 'active');
    for (let i = 0; i < b.n; i++) Na.onBeastKilled(X, { def: { id: 'x' } }, { team: 'wild' });
    eq(b.got, 0, 'une bête tuée par une autre ne compte pas');
    for (let i = 0; i < b.n; i++) Na.onBeastKilled(X, { def: { id: 'x' } }, { kind: 'player' });
    eq(b.state, 'ready');
    assert(/gouverneur/.test(Na.hudText(X)), Na.hudText(X));
    const f0 = X.nation.favor;
    eq(Na.complete(X, 0), 'ok');
    eq(b.state, 'done'); eq(X.nation.favor, f0 + D.NATION_MISSIONS.battue.favor, 'faveur');
    assert(X.bag[D.PEOPLE[X.nation.people].likes] >= 4, 'récompense : leur ressource préférée');
    // livraison
    const l = Na.mission(X, 1, 'livraison');
    Na.accept(X, 1);
    assert(/^Nos réserves (de |d’)/.test(Na.missionText(X, l)), Na.missionText(X, l));
    eq(Na.deliver(X, 1), 'manque');
    X.bag[l.res] = l.n;
    eq(Na.deliver(X, 1), 'ok'); eq(l.state, 'done'); assert(!X.bag[l.res], 'payé avec le sac');
    // caravane
    const c = Na.mission(X, 2, 'caravane');
    Na.accept(X, 2);
    assert(c.zone !== 2 && c.crate && !c.crate.got, 'la cargaison est ailleurs');
    X.zi = c.zone; c.crate.x = 100; c.crate.y = 100; X.player.x = 110; X.player.y = 96;
    Na.update(X, 0.1);
    eq(c.state, 'ready', 'cargaison ramassée');
    X.zi = 0;
    // gardien
    const g = Na.mission(X, 2, 'gardien');
    Na.accept(X, 2);
    Na.onGuardian(X, { boss: { zoneIndex: 2, errant: false } });
    eq(g.state, 'ready', 'le gardien abattu');
    // défense : ne démarre pas sans ville (pas de zone ici), et revient à l'offre
    const d = Na.mission(X, 1, 'defense');
    eq(Na.accept(X, 1), 'raid'); eq(d.state, 'offer');
    // reprise : l'état de la nation et ses mercenaires
    d.state = 'active';
    X.allies.push({ merc: { people: X.nation.people, role: 'guard' }, hp: 35, maxHp: 70, kills: 2 });
    const snap = JSON.parse(JSON.stringify({ nation: Na.snapshot(X), mercs: Na.mercsSnapshot(X) }));
    const Y = natX(p, w, 0);
    Na.restore(Y, snap.nation);
    eq(Y.nation.favor, X.nation.favor); eq(Y.nation.missions[0].state, 'done'); eq(Y.nation.missions[2].kind, 'gardien');
    eq(Y.nation.missions[1].state, 'offer', 'une défense en cours reprend depuis le début');
    eq(JSON.stringify(snap.mercs), JSON.stringify([{ people: X.nation.people, role: 'guard', hp: 0.5, downed: false, kills: 2 }]));
    // nation ancrée : une mission accomplie ne se refait pas avant le délai
    p.nations.push({ code: w.code, seed: w.seed, scale: 'region', threat: 4, people: w.nation.people, attitude: w.nation.attitude, mode: 'allie', favor: 70, since: Date.now(), primary: w.primary, region: w.region });
    Na.finish(X, p, 'retour', {});
    const entry = Na.entry(p, w.code);
    assert(entry.missionAt && entry.missionAt[0] > 0 && !entry.missionAt[2], 'missions accomplies retenues (et seulement elles)');
    const V = natX(p, w, 70);
    V.nation.missionAt = Object.assign({}, entry.missionAt);
    eq(Na.mission(V, 0).state, 'done', 'le gouverneur n’a rien d’autre à demander');
    V.nation.missionAt[0] -= (D.NATION.missionCooldown + 1) * 60000;
    eq(Na.mission(V, 0, Na.mission(V, 0).kind).state, 'offer', 'après le délai, une nouvelle mission');
    return Object.keys(D.NATION_MISSIONS).length + ' sortes de missions';
  });
  test('Nations : guerre, épargne, raids (1.13)', () => {
    const Na = AN.Nations;
    const p = AN.Save.newProfile(65);
    const w = natWorld('guerre', 2);
    const X = natX(p, w, 30);
    const npc = (role) => ({ npc: { nation: true, role }, team: 'civil', alive: true, temper: 'passif' });
    const g = npc('guard'), v = npc('villager');
    X.civils.push(g, v);
    // déclarer la guerre : leurs gens prennent les armes (ils restaient pacifiques en 1.12)
    Na.declareWar(X);
    assert(Na.hostile(X), 'en guerre');
    assert(X.creatures.includes(g) && g.team === 'wild' && g.fighter, 'le garde prend les armes');
    assert(X.creatures.includes(v) && !X.civils.length, 'les habitants fuient');
    // épargner le souverain : les villes déjà visitées baissent les armes en y revenant
    const other = npc('guard'); other.team = 'wild'; other.fighter = true;
    X.creatures.splice(X.creatures.indexOf(g), 1); // ce garde-là est resté dans une autre zone
    Na.spare(X);
    X.creatures.push(g, other);
    Na.onEnterZone(X);
    assert(X.civils.includes(g) && X.civils.includes(other) && g.team === 'civil' && !g.fighter && !g.exposed, 'synchronisés à l’entrée de la zone');
    // raid : les bêtes affaiblies ne comptent plus, la faveur des bêtes abattues est plafonnée par ville
    X.nation.raid = { zi: 0, wave: 2, nextT: 0, mission: false, kills: 0, near: 0, spawned: 3 };
    X.creatures = [{ alive: true, weak: true, cityRaid: { zi: 0 }, def: {} }, { alive: true, cityRaid: { zi: 0 }, def: {} }];
    eq(Na.raidersLeft(X), 1);
    const f0 = X.nation.favor;
    for (let i = 0; i < 20; i++) Na.onBeastKilled(X, { cityRaid: { zi: 0 }, def: {} }, { kind: 'player' });
    eq(X.nation.favor, f0 + D.NATION.raid.perKillMax, 'faveur plafonnée');
    // défense abandonnée (on quitte la zone) : mission manquée, pas de nouvel essai
    const d = Na.mission(X, 0, 'defense'); d.state = 'active'; X.nation.raid.mission = true;
    X.zi = 1;
    Na.onEnterZone(X);
    eq(X.nation.raid, null); eq(d.state, 'failed');
    eq(Na.accept(X, 0), 'non');
    // nation ancrée : la mission au repos se renouvelle après le délai, pendant la même visite
    const Y = natX(p, w, 50);
    Y.nation.missionAt = { 1: Date.now() };
    const r = Na.mission(Y, 1);
    eq(r.state, 'done'); assert(r.rested);
    r.rested = Y.nation.missionAt[1] = Date.now() - (D.NATION.missionCooldown + 1) * 60000;
    eq(Na.mission(Y, 1).state, 'offer', 'une nouvelle demande');
  });
  test('Nations ancrées : demandes, et place dans le ciel de l’Archive (1.13)', () => {
    const Na = AN.Nations;
    const p = AN.Save.newProfile(64);
    const w = natWorld('demande', 2);
    const n = { code: w.code, seed: w.seed, scale: 'region', threat: 4, people: w.nation.people, attitude: w.nation.attitude, mode: 'allie', favor: 60, since: Date.now(), primary: w.primary, region: w.region };
    p.nations.push(n);
    const q = Na.archiveRequest(p, n);
    assert(q === Na.archiveRequest(p, n), 'une demande par tranche de 30 minutes');
    eq(D.RESOURCES[q.res].rarity, 0); assert(!D.BIOME[w.primary].resources[q.res], 'ce que leur monde ne donne pas');
    assert(Na.requestPending(p, n));
    eq(Na.archiveFulfil(p, n), 'manque');
    AN.Profile.add(p, q.res, q.n);
    eq(Na.archiveFulfil(p, n), 'ok');
    eq(n.favor, 60 + D.NATION.request.favor); assert(!Na.requestPending(p, n));
    eq(Na.archiveFulfil(p, n), 'fait');
    // couche du ciel : leur taille, bornée par ce que le rang laisse voir
    const L = AN.Cosmos.nationLayer;
    eq(L('region', 9), 0); eq(L('monde', 5), 1); eq(L('monde', 3), 0); eq(L('orbite', 6), 2); eq(L('systeme', 6), 2); eq(L('systeme', 8), 3);
  });

  /* ---------- affichage ---------- */
  const ok = results.filter((r) => r.ok).length;
  document.getElementById('summary').textContent = ok + ' / ' + results.length + ' tests réussis';
  const list = document.getElementById('list');
  results.forEach((r) => list.appendChild(AN.h('div', { class: 't ' + (r.ok ? 'ok' : 'ko') }, AN.h('b', null, r.ok ? 'OK' : 'ÉCHEC'), AN.h('span', null, r.name, r.detail ? AN.h('small', null, r.detail) : null))));
  window.TEST_RESULTS = results;
})();
