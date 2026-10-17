/* Liens entre le joueur et ses créatures : niveaux, loyauté, faim,
   évolution, reproduction et conflits dans l'Archive.
   Aucune logique d'affichage : ce module modifie la sauvegarde et renvoie
   des événements que l'interface présente. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  const B = (AN.Bonds = {});

  /* ---------- multiplicateurs ---------- */
  B.levelMul = (c) => 1 + 0.08 * ((c.level || 1) - 1);
  B.stageMul = (c) => D.STAGES[c.stage || 0].mul;
  B.loyaltyMul = (c) => (c.loyalty >= 80 ? 1.1 : c.loyalty < 20 ? 0.8 : c.loyalty < 50 ? 0.92 : 1);
  /** Puissance d'un compagnon par rapport à son espèce de base. */
  B.powerMul = (c) => B.levelMul(c) * B.stageMul(c) * B.loyaltyMul(c);
  /** Multiplicateur de recharge des capacités prêtées. */
  B.cooldownMul = (c) => (c.loyalty >= 80 ? 0.8 : c.loyalty < 50 ? 1.3 : 1) * (1 - 0.03 * ((c.level || 1) - 1));
  B.sizeMul = (c) => D.STAGES[c.stage || 0].size;

  /** Une créature mineure s'inquiète d'un prédateur d'une autre espèce dans son territoire (pas dans le Néant). */
  B.fears = (c, neighbours) => !!c.home && D.CREATURE[c.species].tier === 0 && neighbours.some((o) => o !== c && !o.lost && o.species !== c.species && D.CREATURE[o.species].tier === 1);
  B.isNative = (c, home) => !!home && D.CREATURE[c.species].biomes.includes(home.biome);
  B.canFollow = (c) => !c.lost && !c.injured && c.loyalty >= 20;

  /* ---------- journal de l'Archive ---------- */
  B.log = function (p, text, kind = 'info') {
    p.archiveLog = p.archiveLog || [];
    p.archiveLog.unshift({ t: Date.now(), text, kind });
    p.archiveLog = p.archiveLog.slice(0, 50);
  };

  /* ---------- expérience ---------- */
  /** Ajoute de l'expérience ; renvoie le nombre de niveaux gagnés. */
  B.addXp = function (c, n) {
    if (!(n > 0) || c.level >= D.MAX_LEVEL) return 0;
    c.xp = (c.xp || 0) + n;
    let gained = 0;
    while (c.level < D.MAX_LEVEL && c.xp >= D.xpFor(c.level)) {
      c.xp -= D.xpFor(c.level);
      c.level++;
      gained++;
    }
    if (c.level >= D.MAX_LEVEL) c.xp = 0;
    return gained;
  };
  B.addLoyalty = (c, n) => { c.loyalty = U.clamp((c.loyalty || 0) + n, 0, 100); };

  /* ---------- évolution ---------- */
  /** Options d'évolution d'une créature, avec leur disponibilité. */
  B.evolutions = function (p, c) {
    const out = [];
    const def = D.CREATURE[c.species];
    const tr = D.trait(c.species);
    if (tr.evo && D.CREATURE[tr.evo.to]) {
      const to = D.CREATURE[tr.evo.to];
      const why = [];
      if (c.level < tr.evo.level) why.push('niveau ' + tr.evo.level + ' requis');
      if (c.loyalty < 50) why.push('loyauté fidèle requise');
      if (!AN.Profile.canPay(p, tr.evo.cost)) why.push('ressources insuffisantes');
      out.push({ kind: 'species', to: to.id, name: to.name, desc: 'Devient ' + to.name + ' (' + D.TIERS[to.tier].name.toLowerCase() + '). Garde son nom, son niveau et sa loyauté.', cost: tr.evo.cost, ok: !why.length, why });
    }
    const next = (c.stage || 0) + 1;
    if (next < D.STAGES.length && def.tier < 3) {
      const st = D.STAGES[next];
      const cost = D.stageCost(c.species, next);
      const why = [];
      if (c.level < st.level) why.push('niveau ' + st.level + ' requis');
      if (c.loyalty < 50) why.push('loyauté fidèle requise');
      if (!AN.Profile.canPay(p, cost)) why.push('ressources insuffisantes');
      out.push({ kind: 'stage', stage: next, name: def.name + ' ' + st.name, desc: 'Stade ' + st.name + ' : +' + Math.round((st.mul - 1) * 100) + ' % de puissance, +' + Math.round((st.prod - 1) * 100) + ' % de production.', cost, ok: !why.length, why });
    }
    return out;
  };

  B.evolve = function (p, c, opt) {
    if (!opt.ok || !AN.Profile.pay(p, opt.cost)) return false;
    const before = AN.Profile.displayName(c);
    if (opt.kind === 'species') {
      c.species = opt.to;
      c.stage = 0;
      AN.Profile.markSeen(p, opt.to);
      const b = p.bestiary[opt.to];
      b.captured = (b.captured || 0) + 1;
    } else c.stage = opt.stage;
    B.addLoyalty(c, 8);
    B.log(p, before + ' a évolué : ' + AN.Profile.displayName(c) + '.', 'evo');
    return true;
  };

  /* ---------- naissance ---------- */
  B.birth = function (p, a, b, homeUid) {
    const pick = Math.random() < 0.5 ? a : b;
    let variant = pick.variant;
    const roll = Math.random();
    if (roll < 0.02) variant = 'chromatique';
    else if (roll < 0.05) variant = 'albinos';
    else if (roll < 0.15) variant = ['robuste', 'vif', 'geant', 'nain'][Math.floor(Math.random() * 4)];
    if (variant === 'feroce') variant = 'commun';
    const child = AN.Save.normalizeCreature({
      uid: U.uid('c'), species: a.species, variant, hueSeed: Math.round(((a.hueSeed || 0) + (b.hueSeed || 0)) / 2 + Math.random() * 60) % 1000,
      foreign: null, nickname: null, injured: 0, home: homeUid, world: 'Archive', captured: Date.now(),
      level: 1, xp: 0, loyalty: 75, stage: 0, fed: 1, gen: Math.max(a.gen || 0, b.gen || 0) + 1, parents: [a.uid, b.uid], born: Date.now(),
    });
    p.collection.push(child);
    const bs = AN.Profile.markSeen(p, a.species);
    bs.born = (bs.born || 0) + 1;
    return child;
  };

  /* ---------- écoulement du temps dans l'Archive ---------- */
  /**
   * Fait passer des minutes dans l'Archive. Renvoie les événements marquants :
   * { births: [créatures], evolutions: [], conflicts: [textes], hungry: [ressources], levels: [créatures] }
   */
  B.tick = function (p, minutes) {
    const ev = { births: [], conflicts: [], hungry: new Set(), levels: [] };
    if (!(minutes > 0)) return ev;
    const tmap = new Map(p.territories.map((t) => [t.uid, t]));
    const legacyLoy = ((p.legacy && p.legacy.loyalty) || 0) + (AN.Settlements ? AN.Settlements.powers(p).loyalty / 0.05 : 0) + (AN.Structures ? AN.Structures.powers(p).loyalty : 0);
    const homes = new Map();
    const live = p.collection.filter((c) => !c.lost);
    live.forEach((c) => {
      const k = c.home || 'center';
      if (!homes.has(k)) homes.set(k, []);
      homes.get(k).push(c);
    });
    const companions = new Set(p.companions);
    live.forEach((c) => {
      const def = D.CREATURE[c.species];
      if (!def) return;
      const tr = D.trait(c.species);
      const home = c.home ? tmap.get(c.home) : null;
      const neighbours = homes.get(c.home || 'center') || [];
      // faim
      if (tr.diet) {
        c.fed = Math.max(0, (c.fed == null ? 1 : c.fed) - minutes / tr.diet.period);
        let guard = 8;
        while (c.fed < 0.5 && guard-- > 0) {
          if (p.settings.autoFeed !== false && AN.Profile.stock(p, tr.diet.res) >= tr.diet.n) {
            AN.Profile.add(p, tr.diet.res, -tr.diet.n);
            c.fed = Math.min(1, c.fed + 1);
          } else { ev.hungry.add(tr.diet.res); break; }
        }
      } else c.fed = 1;
      // loyauté
      let dl = 0.12 + legacyLoy * 0.05;
      if (!home) dl -= 0.08;
      else if (def.biomes.includes(home.biome)) dl += 0.3;
      else dl -= 0.2;
      if (c.fed < 0.3) dl -= 0.6;
      if (c.injured) dl -= 0.1;
      if (B.fears(c, neighbours)) dl -= 0.15;
      if (neighbours.some((o) => o !== c && o.species === c.species)) dl += 0.08;
      if (companions.has(c.uid)) dl += 0.05;
      B.addLoyalty(c, dl * minutes);
      // expérience paisible
      if (c.loyalty >= 40 && c.fed >= 0.3 && !c.injured) {
        if (B.addXp(c, 0.4 * minutes) > 0) ev.levels.push(c);
      }
    });
    // conflits : un prédateur affamé s'en prend à une créature mineure d'une autre espèce
    homes.forEach((list) => {
      const hungryPreds = list.filter((c) => D.CREATURE[c.species].tier === 1 && c.fed < 0.35);
      hungryPreds.forEach((pred) => {
        if (Math.random() > 1 - Math.pow(1 - 0.03, minutes)) return;
        const prey = list.filter((o) => D.CREATURE[o.species].tier === 0 && o.species !== pred.species && !o.injured);
        if (!prey.length) return;
        const v = prey[Math.floor(Math.random() * prey.length)];
        v.injured = 1;
        B.addLoyalty(v, -12);
        pred.fed = Math.min(1, pred.fed + 0.5);
        const text = AN.Profile.displayName(pred) + ', affamé, s’en est pris à ' + AN.Profile.displayName(v) + '.';
        ev.conflicts.push(text);
        B.log(p, text, 'conflict');
      });
    });
    // reproduction (la couveuse et la ruche-mère l'accélèrent)
    p.breeding = p.breeding || {};
    const breedMul = 1 + (AN.Structures ? AN.Structures.powers(p).breed : 0);
    homes.forEach((list, key) => {
      const t = key === 'center' ? null : tmap.get(key);
      if (key === 'center') return; // le Néant central n'est pas un habitat
      const cap = D.CAPACITY[t.quality] || 8;
      if (list.length >= cap) return;
      const bySp = new Map();
      list.forEach((c) => {
        if (c.level < 2 || c.loyalty < 40 || c.fed < 0.3 || c.injured) return;
        if (!bySp.has(c.species)) bySp.set(c.species, []);
        bySp.get(c.species).push(c);
      });
      bySp.forEach((adults, sp) => {
        const tr = D.trait(sp);
        if (adults.length < 2 || !(tr.breed > 0)) return;
        const native = D.CREATURE[sp].biomes.includes(t.biome);
        const k = key + '|' + sp;
        p.breeding[k] = (p.breeding[k] || 0) + (tr.breed * (native ? 1 : 0.35) * Math.min(3, adults.length / 2) * minutes * breedMul) / 40;
        if (p.breeding[k] >= 1 && list.length < cap) {
          p.breeding[k] -= 1;
          const a = adults[Math.floor(Math.random() * adults.length)];
          const others = adults.filter((x) => x !== a);
          const child = B.birth(p, a, others[Math.floor(Math.random() * others.length)], key);
          list.push(child);
          ev.births.push(child);
          B.log(p, 'Naissance : ' + AN.Profile.displayName(child) + (child.variant !== 'commun' ? ' (' + D.VARIANT[child.variant].name + ')' : '') + ', dans ' + D.BIOME[t.biome].name + '.', 'birth');
        }
      });
    });
    ev.civ = AN.Settlements ? AN.Settlements.tick(p, minutes) : [];
    return ev;
  };

  /** Rattrape le temps écoulé hors du jeu (3 h au maximum). */
  B.catchUp = function (p) {
    const now = Date.now();
    const minutes = U.clamp((now - (p.bondTick || now)) / 60000, 0, 180);
    p.bondTick = now;
    const all = { births: [], conflicts: [], hungry: new Set(), levels: [], civ: [] };
    let left = minutes;
    while (left > 0.5) {
      const m = Math.min(10, left);
      const ev = B.tick(p, m);
      all.births.push(...ev.births);
      all.conflicts.push(...ev.conflicts);
      ev.hungry.forEach((r) => all.hungry.add(r));
      all.levels.push(...ev.levels);
      all.civ.push(...(ev.civ || []));
      left -= m;
    }
    return all;
  };

  /* ---------- retour d'expédition ---------- */
  /** Applique expérience et loyauté aux compagnons après une expédition. */
  B.afterExpedition = function (p, X, outcome) {
    const lines = [];
    const xpMul = 1 + (AN.Structures ? AN.Structures.powers(p).xp : 0);
    X.allies.forEach((a) => {
      const c = AN.Profile.findCreature(p, a.uid);
      if (!c) return;
      c.outings = (c.outings || 0) + 1;
      c.kills = (c.kills || 0) + (a.kills || 0);
      const xp = Math.round(((outcome === 'extrait' ? 18 : outcome === 'urgence' ? 6 : 2) + (a.kills || 0) * 4 + Math.min(20, X.stats.kills)) * xpMul);
      const lv = B.addXp(c, xp);
      B.addLoyalty(c, outcome === 'extrait' ? 6 : outcome === 'urgence' ? 2 : -6);
      if (a.downed) B.addLoyalty(c, -5);
      if (lv) lines.push(AN.Profile.displayName(c) + ' passe niveau ' + c.level);
    });
    return lines;
  };
})();
