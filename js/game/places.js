/* Lieux ancrés (1.10) : les mondes, astres et galaxies qu'on a ramenés deviennent
   des destinations permanentes. Trop grands pour être stockés, ils sont regénérés
   à partir de leur graine à chaque visite. On s'y téléporte sans limite, depuis la
   console de l'Artefact ou en cliquant dessus dans l'Archive dézoomée.
   On y récolte, on y capture, on peut y tomber (et perdre l'équipement non lié),
   mais ils ne sont jamais détruits : pas d'effondrement au retour. Les gisements
   repoussent et les créatures réapparaissent avec le temps (D.PLACES).
   Ce qui change d'une visite à l'autre est gardé dans profile.cosmos.visits. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  const Pl = (AN.Places = {});

  /**
   * Lieux ancrés du profil (1.11) : un par monde d'où l'on a ramené quelque chose,
   * à l'échelle de ce monde. Les astres pris dans le même monde ouvrent le même
   * lieu (« Système d'Arithal ») ; un monde dont on a rapporté des continents
   * devient une planète (« Planète Nylombe »). L'identifiant reste celui du
   * premier astre (« a: » + uid) ou du code du monde (« m: » + code).
   */
  let cache = null; // la liste est demandée à chaque image dans l'Archive dézoomée : gardée tant que rien ne change
  const sig = (p) => { const A = (p.cosmos && p.cosmos.astres) || [], T = p.territories; return A.length + ':' + T.length + ':' + (A.length ? A[A.length - 1].uid : '') + ':' + (T.length ? T[T.length - 1].uid + T[0].uid : '') + ':' + (p.nations || []).length; };
  Pl.list = function (p) {
    const k = sig(p);
    if (cache && cache.p === p && cache.k === k) return cache.out;
    const out = Pl.build(p);
    cache = { p, k, out };
    return out;
  };
  Pl.build = function (p) {
    const out = [];
    const N = AN.Names;
    const groups = new Map();
    ((p.cosmos && p.cosmos.astres) || []).forEach((a) => {
      const b = D.BIOME[a.biome];
      if (!b || !b.scale || !D.ECHELONS[b.scale] || b.scale === 'monde') return;
      const solo = !a.world || /^(DEBUG|TRICHE)$/.test(a.world);
      const key = solo ? 'u:' + a.uid : b.scale + '|' + a.world;
      let g = groups.get(key);
      if (!g) {
        groups.set(key, (g = { id: 'a:' + a.uid, kind: 'astre', scale: b.scale, biome: a.biome, from: a.world, zoneName: a.zoneName, astre: a.uid, astres: [] }));
        const proper = N.astreProper(a);
        g.proper = proper;
        const E = D.ECHELONS[b.scale];
        g.name = E.placeNoun ? E.placeNoun + ' ' + N.de(proper) : proper;
      }
      g.astres.push(a.uid);
    });
    groups.forEach((g) => out.push(g));
    const worlds = new Map();
    p.territories.forEach((t) => {
      if (t.quality !== 'continent' && t.quality !== 'cratere') return;
      let w = worlds.get(t.world);
      if (!w) worlds.set(t.world, (w = { code: t.world, biomes: {}, n: 0 }));
      w.n++;
      if (t.quality === 'continent') w.biomes[t.biome] = (w.biomes[t.biome] || 0) + 1;
    });
    worlds.forEach((w) => {
      const biome = Object.keys(w.biomes).sort((a, b) => w.biomes[b] - w.biomes[a])[0];
      if (!biome || !D.BIOME[biome] || (D.BIOME[biome].scale && D.BIOME[biome].scale !== 'monde')) return;
      out.push({ id: 'm:' + w.code, kind: 'monde', name: N.world('monde', w.code), proper: N.proper(w.code), scale: 'monde', biome, from: w.code, continents: w.n });
    });
    // les nations ancrées (1.12) : leur monde tout entier, avec ses villes
    (p.nations || []).forEach((n) => {
      if (!D.PEOPLE[n.people]) return;
      out.push({ id: 'n:' + n.code, kind: 'nation', name: AN.Nations.realm(n.people), scale: n.scale, biome: n.primary, from: n.code, nation: n.code, region: n.region, mode: n.mode });
    });
    // deux mondes qui porteraient le même nom : on les numérote, comme les astronomes
    const seen = {};
    out.forEach((x) => { seen[x.name] = (seen[x.name] || 0) + 1; if (seen[x.name] > 1) x.name += ' ' + ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(10, seen[x.name])]; });
    return out;
  };
  Pl.find = (p, id) => Pl.list(p).find((x) => x.id === id) || null;
  /** Le lieu qu'ouvre un astre (celui de son monde d'origine). */
  Pl.ofAstre = (p, uid) => Pl.list(p).find((x) => x.astres && x.astres.includes(uid)) || null;

  /** Le lieu, regénéré à partir de sa graine : toujours le même. */
  Pl.world = function (p, place) {
    if (place.kind === 'nation') {
      // le monde d'une nation ancrée : regénéré à l'identique, à partir de sa propre graine (1.12)
      const entry = AN.Nations.entry(p, place.from);
      const nw = AN.Nations.world(p, entry);
      nw.place = place.id;
      nw.placeName = place.name;
      nw.placeWhy = (entry.mode === 'allie' ? 'Alliée' : 'Soumise') + ' · ' + (entry.region || entry.code);
      nw.civ = null;
      nw.rescue = null;
      if (nw.scan) { nw.scan.stability = 'Ancré'; }
      return nw;
    }
    const seed = AN.hash(p.seed + ':lieu:' + place.id);
    // noNation (1.13) : ce qu'on a ramené ne devient pas, après coup, le monde d'une nation
    const w = AN.WorldGen.destination(seed, { scale: place.scale, threat: 7, reliability: 1, primary: place.biome, rep: AN.Civ ? AN.Civ.reputation(p) : 'inconnu', noNation: true });
    w.place = place.id;
    w.placeName = place.name;
    // ce qui l'ancre : les astres qu'on en a rapportés, ou les continents
    const ast = place.astres ? ((p.cosmos && p.cosmos.astres) || []).filter((a) => place.astres.includes(a.uid)) : [];
    w.placeWhy = ast.length ? ast.map((a) => AN.Names.astre(a)).join(', ') : place.continents ? place.continents + ' continent' + (place.continents > 1 ? 's' : '') + ' dans l’Archive' : '';
    // le lieu garde le code du monde d'où l'on a rapporté ce qui l'ancre : ce qu'on y prend porte le même nom (1.11)
    if (place.from && !/^(DEBUG|TRICHE)$/.test(place.from)) w.code = place.from;
    w.civ = null;
    w.rescue = null;
    w.region = place.name;
    if (w.scan) { w.scan.civ = 'Aucune'; w.scan.stability = 'Ancré'; }
    return w;
  };

  /* ======================= Mémoire des visites ======================= */
  const visits = (p) => { p.cosmos = p.cosmos || { astres: [] }; return (p.cosmos.visits = p.cosmos.visits || {}); };
  Pl.visit = (p, id) => visits(p)[id] || null;
  const minutesSince = (at) => Math.max(0, (Date.now() - (at || 0)) / 60000);

  /** Au départ : les zones dont le gardien n'est pas encore revenu restent conquises. */
  Pl.prepare = function (X) {
    const v = Pl.visit(X.profile, X.world.place);
    if (!v) return;
    for (const zi in v.zones || {}) {
      const z = v.zones[zi];
      if (z.conquered && minutesSince(z.at) < D.PLACES.guardian) X.conquered.add(Number(zi));
    }
    X.heartDone = X.conquered.has(X.world.zones.length);
  };

  /** Une zone fraîchement générée : ce qui n'a pas encore repoussé ou réapparu. */
  Pl.applyZone = function (X, zone) {
    if (!X.world.place) return;
    const v = Pl.visit(X.profile, X.world.place);
    const z = v && v.zones && v.zones[zone.index];
    if (!z) return;
    const m = minutesSince(z.at);
    const k = U.clamp(m / D.PLACES.regrow, 0, 1);
    if (k < 1) {
      const byId = new Map(zone.nodes.map((n) => [n.id, n]));
      (z.nodes || []).forEach(([id, uses, amount]) => {
        const n = byId.get(id);
        if (!n) return;
        const grown = uses + Math.floor((n.uses - uses) * k);
        if (grown < n.uses) { n.uses = grown; if (grown <= uses) n.amount = amount; }
      });
    }
    zone.cleared = m < D.PLACES.respawn ? new Set(z.cleared || []) : null;
    if (z.conquered && m < D.PLACES.guardian) zone.state.conquered = true;
  };
  /** Ce groupe de créatures a-t-il été vaincu il y a trop peu de temps pour être revenu ? */
  Pl.groupCleared = (zone, gi) => !!(zone.cleared && zone.cleared.has(gi));

  /** Au retour (quelle que soit l'issue) : on retient l'état de chaque zone visitée. */
  Pl.save = function (X, p) {
    if (!X.world.place) return;
    const v = (visits(p)[X.world.place] = visits(p)[X.world.place] || { zones: {}, count: 0 });
    v.count = (v.count || 0) + 1;
    v.last = Date.now();
    X.zones.forEach((zone, zi) => {
      if (!zone) return;
      const alive = (zone === X.zone ? X.creatures : zone.state.saved || []).filter((e) => e.alive && e.team === 'wild');
      const cleared = [];
      zone.groups.forEach((g, gi) => { if (!alive.some((e) => e.group === gi)) cleared.push(gi); });
      // un groupe déjà absent au départ (pas encore revenu) le reste
      if (zone.cleared) zone.cleared.forEach((gi) => { if (!cleared.includes(gi)) cleared.push(gi); });
      v.zones[zi] = {
        at: Date.now(),
        nodes: zone.nodes.filter((n) => /^[nvd]\d+$/.test(n.id)).map((n) => [n.id, n.uses, n.amount]),
        cleared,
        conquered: !!zone.state.conquered,
      };
    });
  };

  /* ======================= Retour ======================= */
  /** Rentrer à l'Archive depuis un lieu ancré : pas d'effondrement. */
  Pl.leave = function (X, plate) {
    if (X.ending) return;
    if (plate && plate.base && X.base && X.base.state === 'ok') { AN.Base.lift(X, true, () => AN.Expedition.finish(X, 'retour')); return; }
    X.ending = true;
    const p = X.player;
    AN.FX.ring(p.x, p.y, AN.CYAN, 10, 260, 0.8, 5);
    AN.Audio.play('portal');
    setTimeout(() => { if (AN.X === X) AN.Expedition.finish(X, 'retour'); }, 900);
  };
})();
