/* Production de l'Archive : territoires et créatures productrices génèrent
   des ressources avec le temps, y compris pendant votre absence (3 h maximum). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  const Prod = (AN.Production = {});
  const BASE = { fragment: 0.6, territoire: 2, coeur: 4, continent: 3, cratere: 5 };
  Prod.BASE = BASE; // production de base par qualité (lue aussi par l'agencement)
  const CAP = 60; // stock maximum par territoire avant ramassage
  const OFFLINE_MAX = 3 * 3600;

  /** Multiplicateur de production d'un territoire et la liste de ses causes. */
  Prod.territoryMult = function (profile, t, syns, powers) {
    let m = 1 + powers.prod;
    const why = [];
    if (powers.prod) why.push({ name: 'Bonus global', v: powers.prod });
    syns.forEach((s) => {
      if (s.a === t || s.b === t) {
        if (s.syn.mult) { m += s.syn.mult; why.push({ name: s.syn.name, v: s.syn.mult }); }
      }
    });
    const guardian = profile.collection.some((c) => c.home === t.uid && !c.lost && D.CREATURE[c.species].tier >= 2);
    if (guardian) { m += 0.5; why.push({ name: 'Gardien présent', v: 0.5 }); }
    if (AN.Settlements) {
      const sp = powers.settle || (powers.settle = AN.Settlements.powers(profile));
      if (sp.prodBy[t.uid]) { m += sp.prodBy[t.uid]; why.push({ name: 'Habitants', v: sp.prodBy[t.uid] }); }
      if (sp.prodAll) { m += sp.prodAll; why.push({ name: 'Autel', v: sp.prodAll }); }
      if (sp.strike[t.uid]) { m *= 0.5; why.push({ name: 'Grève', v: -0.5 }); }
    }
    return { mult: Math.max(0.2, m), why };
  };

  /** Débits par minute : { [uidTerritoire | 'center']: { ressource: débit } } */
  Prod.rates = function (profile) {
    const out = { center: {} };
    const syns = AN.Profile.synergies(profile);
    const powers = AN.Profile.powers(profile);
    const tmap = new Map(profile.territories.map((t) => [t.uid, t]));
    profile.territories.forEach((t) => {
      const b = D.BIOME[t.biome];
      const tot = U.sumValues(b.resources);
      const { mult } = Prod.territoryMult(profile, t, syns, powers);
      const r = (out[t.uid] = {});
      for (const k in b.resources) r[k] = (BASE[t.quality] * b.resources[k] / tot) * mult;
    });
    // créatures productrices
    const byHome = new Map();
    profile.collection.forEach((c) => {
      const k = c.home || 'center';
      if (!byHome.has(k)) byHome.set(k, []);
      byHome.get(k).push(c);
    });
    profile.collection.forEach((c) => {
      const d = D.CREATURE[c.species];
      if (!d || !d.produces) return;
      const home = c.home ? tmap.get(c.home) : null;
      const key = home ? home.uid : 'center';
      Prod.creatureRate(profile, c, home, byHome.get(key) || [], (rate) => {
        out[key] = out[key] || {};
        out[key][d.produces.res] = (out[key][d.produces.res] || 0) + rate;
      });
    });
    return out;
  };

  /** Débit d'une créature (par minute), avec explication. */
  Prod.creatureRate = function (profile, c, home, neighbours, cb) {
    const d = D.CREATURE[c.species];
    if (!d.produces) { if (cb) cb(0); return { rate: 0, why: [] }; }
    const v = D.VARIANT[c.variant] || D.VARIANT.commun;
    const why = [];
    let m = 1;
    if (!home) { m *= 0.5; why.push('hors de son habitat (Néant) ×0,5'); }
    else if (d.biomes.includes(home.biome)) { m *= 1.5; why.push('habitat d’origine ×1,5'); }
    else { m *= 0.8; why.push('habitat étranger ×0,8'); }
    const same = neighbours.filter((o) => o.species === c.species).length;
    if (same >= 3) { const cm = d.colony || 1.3; m *= cm; why.push('colonie de ' + same + ' ×' + String(cm).replace('.', ',')); }
    if (d.tier === 0 && neighbours.some((o) => D.CREATURE[o.species].tier === 1 && o.species !== c.species)) { m *= 0.8; why.push('prédateur voisin ×0,8'); }
    if (v.prod) { m *= v.prod; why.push('variante ' + v.name + ' ×' + String(v.prod).replace('.', ',')); }
    if (c.injured) { m *= 0.5; why.push('blessé ×0,5'); }
    if (c.level > 1) { const lm = 1 + 0.05 * (c.level - 1); m *= lm; why.push('niveau ' + c.level + ' ×' + lm.toFixed(2).replace('.', ',')); }
    if (c.stage) { const sm = D.STAGES[c.stage].prod; m *= sm; why.push(D.STAGES[c.stage].name + ' ×' + String(sm).replace('.', ',')); }
    if (c.loyalty != null && c.loyalty < 20) { m *= 0.6; why.push('rebelle ×0,6'); }
    if (c.fed != null && c.fed < 0.3) { m *= 0.7; why.push('affamé ×0,7'); }
    if (c.lost) { m = 0; why.push('perdu'); }
    const rate = d.produces.rate * m;
    if (cb) cb(rate);
    return { rate, why };
  };

  /** Stock maximal par territoire (l'entrepôt l'augmente). */
  Prod.cap = (profile) => CAP + (AN.Structures ? AN.Structures.powers(profile).storage : 0);
  Prod.offlineMax = (profile) => OFFLINE_MAX + 3600 * (AN.Structures ? AN.Structures.powers(profile).offline : 0);

  Prod.tick = function (profile, dt) {
    const rates = Prod.rates(profile);
    const cap = Prod.cap(profile);
    const tmap = new Map(profile.territories.map((t) => [t.uid, t]));
    for (const key in rates) {
      const stock = key === 'center' ? profile.centerStock : (tmap.get(key) || {}).stock;
      if (!stock) continue;
      let total = U.sumValues(stock);
      for (const res in rates[key]) {
        if (total >= cap) break;
        const add = Math.min((rates[key][res] / 60) * dt, cap - total);
        stock[res] = (stock[res] || 0) + add;
        total += add;
      }
    }
  };

  Prod.catchUp = function (profile) {
    const now = Date.now();
    const elapsed = U.clamp((now - (profile.lastTick || now)) / 1000, 0, Prod.offlineMax(profile));
    profile.lastTick = now;
    if (elapsed > 5) Prod.tick(profile, elapsed);
    return elapsed;
  };

  /** Ramassage à distance par l'Artefact : 75 % seulement. */
  Prod.collectAll = function (profile, ratio = 0.75) {
    const got = {};
    const take = (stock) => {
      for (const k in stock) {
        const n = Math.floor(stock[k] * ratio);
        if (n > 0) { got[k] = (got[k] || 0) + n; }
        stock[k] = 0;
      }
    };
    profile.territories.forEach((t) => take(t.stock));
    take(profile.centerStock);
    for (const k in got) AN.Profile.add(profile, k, got[k]);
    return got;
  };
})();
