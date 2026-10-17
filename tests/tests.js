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
  test('20 biomes de régions, 13 des échelles supérieures', () => {
    eq(D.BIOMES.filter((b) => !b.scale).length, 20);
    eq(D.BIOMES.filter((b) => b.scale).length, 13);
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
          assert(sc === 'monde' ? !B.scale : B.scale === sc, sc + ' : biome ' + z.biome);
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
    eq(AN.Profile.rank(p).def.name, 'Inconnue');
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
  test('Structures : bâtir, améliorer, reconstruire, effets', () => {
    const St = AN.Structures;
    const p = AN.Save.newProfile(11);
    Object.keys(D.RESOURCES).forEach((k) => (p.stock[k] = 500));
    eq(St.build(p, 'entrepot'), null);
    eq(St.build(p, 'entrepot'), null, 'amélioration');
    assert(St.build(p, 'entrepot'), 'niveau maximal refusé');
    eq(St.powers(p).storage, 150);
    eq(AN.Production.cap(p), 60 + 150);
    eq(St.build(p, 'phare'), null);
    eq(AN.Profile.scanner(p).count, AN.Profile.upgradeValue(p, 'scanner').count + 1, 'destination en plus');
    p.structures.push({ uid: 'f1', id: 'autel_neant', level: 1, slot: null, origin: { world: 'X', zone: 'Y' } });
    eq(St.powers(p).links || 0, 0, 'pas encore reconstruit');
    eq(St.rebuild(p, p.structures[2]), null);
    eq(AN.Profile.companionSlots(p), AN.Profile.upgradeValue(p, 'liens') + 1, 'un lien en plus');
    p.structures.push({ uid: 'f2', id: 'autel_neant', level: 1, slot: null });
    St.rebuild(p, p.structures[3]);
    eq(St.powers(p).links, 1, 'un seul exemplaire agit');
    const slots = p.structures.map((s) => s.slot);
    eq(new Set(slots).size, slots.length, 'emplacements distincts');
    St.store(p, p.structures[0]);
    eq(St.powers(p).storage, 0, 'rangé, il n’agit plus');
    // une arche (peuples) prend aussi un emplacement
    p.structures.push({ uid: 'a1', kind: 'arche', people: 'pales' });
    St.list(p);
    assert(p.structures[4].slot != null && !slots.includes(p.structures[4].slot), 'arche placée');
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

  /* ---------- affichage ---------- */
  const ok = results.filter((r) => r.ok).length;
  document.getElementById('summary').textContent = ok + ' / ' + results.length + ' tests réussis';
  const list = document.getElementById('list');
  results.forEach((r) => list.appendChild(AN.h('div', { class: 't ' + (r.ok ? 'ok' : 'ko') }, AN.h('b', null, r.ok ? 'OK' : 'ÉCHEC'), AN.h('span', null, r.name, r.detail ? AN.h('small', null, r.detail) : null))));
  window.TEST_RESULTS = results;
})();
