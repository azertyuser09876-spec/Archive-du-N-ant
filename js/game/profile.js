/* Règles qui portent sur la sauvegarde du joueur : stock, coûts, rangs,
   améliorations, collection, territoires, pouvoirs. Aucune logique d'affichage. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  /* ---------- Hexagones (axial, pointe en haut) ---------- */
  const Hex = (AN.Hex = { R: 420 });
  Hex.toPx = (q, r) => ({ x: Hex.R * Math.sqrt(3) * (q + r / 2), y: Hex.R * 1.5 * r });
  Hex.fromPx = (x, y) => {
    const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / Hex.R;
    const r = ((2 / 3) * y) / Hex.R;
    return Hex.round(q, r);
  };
  Hex.round = (q, r) => {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return { q: rq + 0, r: rr + 0 };
  };
  Hex.key = (q, r) => q + ',' + r;
  Hex.DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  Hex.neighbors = (q, r) => Hex.DIRS.map((d) => ({ q: q + d[0], r: r + d[1] }));
  Hex.dist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  /** Cases en spirale autour du centre (le centre est réservé à l'Artefact). */
  Hex.spiral = function (rings) {
    const out = [];
    for (let k = 1; k <= rings; k++) {
      let q = -k, r = k; // départ : direction 4 × k
      for (let side = 0; side < 6; side++) {
        for (let step = 0; step < k; step++) {
          out.push({ q, r });
          q += Hex.DIRS[side][0];
          r += Hex.DIRS[side][1];
        }
      }
    }
    return out;
  };
  Hex.corners = (cx, cy, R) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
    return pts;
  };

  /* ---------- Profil ---------- */
  const P = (AN.Profile = {});

  P.stock = (p, id) => p.stock[id] || 0;
  P.add = (p, id, n) => {
    p.stock[id] = (p.stock[id] || 0) + n;
    if (p.stock[id] <= 0) delete p.stock[id];
  };
  P.scaledCost = (cost, mult) => {
    const out = {};
    for (const k in cost) out[k] = Math.max(1, Math.round(cost[k] * mult));
    return out;
  };
  P.canPay = (p, cost) => Object.keys(cost || {}).every((k) => P.stock(p, k) >= cost[k]);
  P.pay = (p, cost) => {
    if (!P.canPay(p, cost)) return false;
    for (const k in cost) P.add(p, k, -cost[k]);
    return true;
  };

  P.upgradeValue = (p, key) => D.UPGRADES[key].levels[p.artefact[key] || 0].v;

  P.counts = (p) => {
    const by = [0, 0, 0, 0, 0, 0, 0, 0];
    p.collection.forEach((c) => {
      const d = D.CREATURE[c.species];
      if (!d) return;
      by[d.tier] = (by[d.tier] || 0) + 1;
    });
    return {
      territories: p.territories.length, creatures: p.collection.length,
      guardians: by[2], ultras: by[3], souverains: by[4], cataclysmes: by[5], stellaires: by[6], galactiques: by[7],
      astres: ((p.cosmos && p.cosmos.astres) || []).length,
    };
  };
  /** Rang de l'Archive : chaque rang suppose le précédent. */
  P.rank = (p) => {
    const c = P.counts(p);
    let index = 0;
    for (let i = 1; i < D.RANKS.length; i++) {
      const n = D.RANKS[i].need;
      if (Object.keys(n).every((k) => (c[k] || 0) >= n[k])) index = i;
      else break;
    }
    return { index, def: D.RANKS[index], next: D.RANKS[index + 1] || null, counts: c };
  };

  /** Bonus permanents : pouvoirs territoriaux des gardiens et bonus globaux des ultra-boss. */
  P.powers = (p) => {
    const out = { hp: 0, rangedDmg: 0, meleeDmg: 0, armor: 0, capture: 0, speed: 0, compDmg: 0, hazardRes: 0, regen: 0, reveal: 0, prod: 0, craftCost: 0, cargo: 0, stability: 0, list: [] };
    const lg = p.legacy || {};
    out.capture += (lg.capture || 0) * 0.03;
    out.hp += (lg.hp || 0) * 4;
    if (AN.Settlements) {
      const sp = AN.Settlements.powers(p);
      out.capture += sp.capture;
      out.hp += sp.hp;
      out.craftCost += sp.craft;
      out.cargo += sp.cargo;
      out.upgradeCost = sp.upgrade;
      out.loyaltyRate = sp.loyalty;
    }
    // structures de l'Archive (bâtiments, structures rapportées)
    if (AN.Structures) {
      const st = AN.Structures.powers(p);
      for (const k in st) out[k] = (out[k] || 0) + st[k];
    }
    ((p.cosmos && p.cosmos.astres) || []).forEach((a) => {
      const A = D.ASTRES && D.ASTRES[a.biome];
      if (!A) return;
      for (const k in A.stat) out[k] += A.stat[k];
    });
    const seen = new Set();
    p.collection.forEach((c) => {
      const d = D.CREATURE[c.species];
      if (!d || seen.has(d.id) || c.lost) return;
      const src = d.power || d.global;
      if (!src) return;
      seen.add(d.id);
      for (const k in src.stat) out[k] += src.stat[k];
      out.list.push({ species: d.id, name: src.name, desc: src.desc, global: !!d.global });
    });
    return out;
  };

  /** Synergies actives entre territoires voisins. */
  P.synergies = (p) => {
    const found = [];
    const done = new Set();
    p.territories.forEach((t) => {
      AN.Shapes.neighbors(p, t).forEach((o) => {
        const pairKey = [t.uid, o.uid].sort().join('|');
        if (done.has(pairKey)) return;
        done.add(pairKey);
        const A = D.BIOME[t.biome], B = D.BIOME[o.biome];
        D.SYNERGIES.forEach((s) => {
          if ((A.tags.includes(s.a) && B.tags.includes(s.b)) || (A.tags.includes(s.b) && B.tags.includes(s.a))) {
            found.push({ syn: s, a: t, b: o });
          }
        });
      });
    });
    return found;
  };

  P.craftMult = (p) => {
    const forge = P.synergies(p).filter((s) => s.syn.effect === 'craft').length;
    return U.clamp(1 - Math.min(0.2, forge * 0.1) - P.powers(p).craftCost, 0.5, 1);
  };

  P.cargoCap = (p) => P.upgradeValue(p, 'soute') + P.powers(p).cargo;
  /** Coût d'une amélioration de l'Artefact (réduit par certains peuples). */
  P.upgradeCost = (p, cost) => (cost ? P.scaledCost(cost, 1 - (P.powers(p).upgradeCost || 0)) : cost);

  /* ---------- Collection ---------- */
  P.creatureWeight = (speciesId) => D.TIERS[D.CREATURE[speciesId].tier].weight;
  /** Places de soute d'un élément transporté (créature ou œuf). */
  P.cargoWeight = (c) => (c.structure ? c.weight || 2 : c.inhabitants ? D.civWeight(c.inhabitants) : c.ark ? D.ARK_WEIGHT : c.egg ? 1 : P.creatureWeight(c.species));
  P.cargoLabel = (c) => (c.structure ? 'Structure : ' + D.STRUCTURES[c.structure].name : c.inhabitants ? D.PEOPLE[c.people].Name + ' : ' + c.inhabitants + ' habitant' + (c.inhabitants > 1 ? 's' : '') + ' emmené' + (c.inhabitants > 1 ? 's' : '') + ' de force'
    : c.ark ? 'Arche des ' + D.PEOPLE[c.people].name.replace(/^les /, '')
    : c.egg ? 'Œuf de ' + D.CREATURE[c.species].name : D.CREATURE[c.species].name + (D.VARIANT[c.variant] && D.VARIANT[c.variant].name ? ' ' + D.VARIANT[c.variant].name : ''));
  P.displayName = (c) => {
    const d = D.CREATURE[c.species];
    const v = D.VARIANT[c.variant] || D.VARIANT.commun;
    return c.nickname || (d.name + (v.name ? ' ' + v.name : ''));
  };
  P.findCreature = (p, uid) => p.collection.find((c) => c.uid === uid);
  P.companionSlots = (p) => P.upgradeValue(p, 'liens') + (P.powers(p).links || 0);
  /** Unités emportables par type de consommable. */
  P.consumableMax = (p) => D.CONSUMABLE_MAX + (P.powers(p).consMax || 0);
  /** Scanner de l'Artefact, avec les bâtiments qui l'épaulent. */
  P.scanner = (p) => {
    const sc = P.upgradeValue(p, 'scanner');
    const pw = P.powers(p);
    return { count: sc.count + (pw.dest || 0), reliab: Math.min(1, sc.reliab + (pw.scan || 0)) };
  };
  /** Un gardien en compagnon occupe 2 liens. Les ultra-boss ne peuvent pas accompagner. */
  /** Liens occupés par un compagnon : plus il est grand, plus l'Artefact doit le retenir. */
  P.LINK_COST = [1, 1, 2, 3, 4, 4, 4, 4];
  P.linkCost = (speciesId) => P.LINK_COST[D.CREATURE[speciesId].tier] || 4;
  /** Toutes les créatures peuvent accompagner : les géants voyagent sous une forme réduite. */
  P.canBeCompanion = (c) => !!D.CREATURE[c.species] && !c.lost;
  P.isReduced = (speciesId) => D.CREATURE[speciesId].tier >= 3;
  P.companionsUsed = (p) => p.companions.reduce((s, uid) => { const c = P.findCreature(p, uid); return s + (c ? P.linkCost(c.species) : 0); }, 0);
  P.cleanCompanions = (p) => {
    p.companions = p.companions.filter((uid) => { const c = P.findCreature(p, uid); return c && !c.injured && P.canBeCompanion(c) && (c.loyalty == null || c.loyalty >= 20); });
    while (P.companionsUsed(p) > P.companionSlots(p)) p.companions.pop();
  };

  P.markSeen = (p, speciesId) => {
    const b = (p.bestiary[speciesId] = p.bestiary[speciesId] || { seen: 0, captured: 0, killed: 0 });
    b.seen = 1;
    return b;
  };

  /* ---------- Territoires ---------- */
  /** Emplacement libre pour une forme (une seule case par défaut : un fragment). */
  P.freeSlot = (p, cells) => AN.Shapes.place(p, cells || [[0, 0]]);
  P.territoryAt = (p, q, r) => AN.Shapes.territoryAt(p, q, r);
  P.creaturesIn = (p, terr) => p.collection.filter((c) => c.home === terr.uid);

  /** Choisit l'habitat d'une créature : un territoire de son biome, sinon le Néant central. */
  P.bestHome = (p, speciesId) => {
    const d = D.CREATURE[speciesId];
    if (d.tier >= 5) return null; // trop grands pour un territoire : ils vivent autour de l'Archive
    const t = p.territories.find((x) => d.biomes.includes(x.biome) && (d.tier < 2 || !p.collection.some((c) => c.home === x.uid && D.CREATURE[c.species].tier >= 2)));
    return t ? t.uid : null;
  };

  /* ---------- Destinations ---------- */
  P.destinations = (p, scale = 'region') => {
    if (scale !== 'region') {
      p.destByScale = p.destByScale || {};
      if (!p.destByScale[scale] || !p.destByScale[scale].length) p.destByScale[scale] = AN.WorldGen.list(p, scale);
      return p.destByScale[scale];
    }
    if (!p.destinations || !p.destinations.length) p.destinations = AN.WorldGen.list(p);
    return p.destinations;
  };
  P.refreshDestinations = (p) => {
    p.destByScale = {};
    p.destinations = AN.WorldGen.list(p);
    return p.destinations;
  };
  /** Échelons d'expédition accessibles avec le rang actuel de l'Archive. */
  P.echelons = (p) => {
    const rk = P.rank(p).index;
    return D.ECHELON_ORDER.map((id) => ({ e: D.ECHELONS[id], open: rk >= D.ECHELONS[id].rank }));
  };

  /** Valeur engagée dans une expédition (ce qui serait perdu en cas d'échec). */
  P.loadoutRisk = (p) => {
    const L = p.loadout;
    let v = 0;
    D.GEAR_SLOTS.forEach((s) => {
      const g = L[s] && D.GEAR[L[s]];
      if (g && !g.bound && g.cost) v += Object.entries(g.cost).reduce((a, [k, n]) => a + D.resValue(k) * n, 0);
    });
    (L.consumables || []).forEach((c) => {
      const g = D.GEAR[c.id];
      if (g && g.cost) v += (Object.entries(g.cost).reduce((a, [k, n]) => a + D.resValue(k) * n, 0) / (g.makes || 1)) * c.n;
    });
    return Math.round(v);
  };
})();
