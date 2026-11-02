/* Le danger d'un monde, relatif à votre force (1.15).
   Remplace la « menace 1 à 7 » à l'affichage : un monde est Facile, Équilibré,
   Difficile ou Mortel selon le rapport entre sa force et la vôtre.
   - Force d'un monde : celle de sa faune (vigueur × dégâts par seconde des créatures
     de chaque zone, à la menace du monde) et de ses gardiens, tirée des données.
   - Votre force : vigueur effective (PV, protection, régénération) × dégâts par
     seconde (armes, bienfaits, compagnons), avec l'équipement choisi.
   Les deux s'expriment en « niveaux » sur une même échelle (logarithmique) : un
   écart de 10 niveaux, c'est une force doublée. La menace reste la règle interne
   qui règle les créatures ; elle ne s'affiche plus. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  const Dg = (AN.Danger = {});
  const LOG2 = Math.log(2);
  /** Force de référence (niveau 0) et pas : 10 niveaux = force ×2. */
  const F0 = 25, STEP = 10;
  Dg.level = (force) => Math.max(1, Math.round(STEP * Math.log(Math.max(1, force) / F0) / LOG2));

  /* ---------- le monde ---------- */
  const hpMul = (t) => 1 + 0.32 * (t - 1);
  const dmgMul = (t) => 1 + 0.2 * (t - 1);
  /** Dégâts par seconde d'une attaque de créature (0 si elle n'attaque pas). */
  function dps(atk) {
    if (!atk || !(atk.dmg > 0)) return 0;
    const n = atk.count || 1;
    return (atk.dmg * Math.min(n, 3)) / Math.max(0.3, atk.cd || 1);
  }
  /** Force d'une créature : vigueur × dégâts, à la menace donnée (racine : une « force » comparable à la vôtre). */
  function creatureForce(c, threat, rule) {
    const atk = c.attack || (c.tier >= 2 ? { dmg: 11, cd: 1.1, count: 3 } : null);
    const d = dps(atk) * dmgMul(threat) * (rule === 'enragee' ? 1.25 : 1);
    const hp = c.hp * hpMul(threat) / (1 - Math.min(0.6, c.armor || 0));
    return Math.sqrt(hp * Math.max(2, d));
  }
  /**
   * Force d'un monde : la meute typique de ses zones (une créature qui attaque, et ses
   * congénères), et le plus fort de ses gardiens (pondéré : on le combat seul, et une fois).
   * Gardée dans le monde (w._force) : elle ne dépend que de lui.
   */
  Dg.worldForce = function (w) {
    if (w._force) return w._force;
    let fauna = 0, n = 0;
    w.zones.forEach((z) => {
      const pool = AN.WorldGen.pool(z.biome).filter((c) => c.attack);
      if (!pool.length) return;
      const f = pool.reduce((s, c) => s + creatureForce(c, w.threat, w.rule), 0) / pool.length;
      fauna += f * 2.2; // une meute de deux ou trois
      n++;
    });
    fauna = n ? fauna / n : 10;
    let boss = 0;
    w.zones.concat(w.heart ? [w.heart] : []).forEach((z) => {
      const c = z.guardian && D.CREATURE[z.guardian];
      if (c) boss = Math.max(boss, creatureForce(c, w.threat, w.rule) * (z.heart ? 0.45 : 0.6));
    });
    const f = Math.max(fauna, boss) * (w.density ? Math.sqrt(w.density) : 1);
    Object.defineProperty(w, '_force', { value: f, enumerable: false, writable: true }); // jamais enregistrée avec la partie
    return f;
  };
  Dg.worldLevel = (w) => Dg.level(Dg.worldForce(w));

  /* ---------- vous ---------- */
  /**
   * Votre force pour une expédition : l'équipement du chargement (ou celui donné), les
   * bienfaits de l'Archive, les compagnons choisis à l'échelle de votre rang.
   */
  Dg.playerForce = function (p, loadout) {
    const L = loadout || p.loadout || {};
    const pw = AN.Profile.powers(p);
    const R = D.GEAR[L.ranged] || D.GEAR.eclat, M = D.GEAR[L.melee] || D.GEAR.lame_neant;
    const armor = L.armor ? D.GEAR[L.armor] : null;
    const ranged = R.dmg * Math.min(R.count || 1, 3) * (R.rate || 1) * (1 + pw.rangedDmg) * (R.explode ? 1.6 : 1) * (R.pierce ? 1.2 : 1);
    const melee = (M.dmg / Math.max(0.15, M.cd || 0.5)) * (1 + pw.meleeDmg) * 0.6; // on frappe moins souvent qu'on ne tire
    let comp = 0;
    const rank = AN.Profile.rank(p).index;
    (p.companions || []).forEach((uid) => {
      const c = AN.Profile.findCreature(p, uid);
      const def = c && D.CREATURE[c.species];
      if (!def || c.lost) return;
      const atk = def.attack || (def.tier >= 2 ? { dmg: 11, cd: 1.1, count: 3 } : null);
      const scale = (1.4 + rank * 0.45 + def.tier * 0.3) * AN.Bonds.powerMul(c) * (AN.Profile.isReduced(c.species) ? 0.35 : 1);
      comp += dps(atk) * (0.7 + scale * 0.3) * AN.Bonds.powerMul(c) * (1 + pw.compDmg) * 0.7;
      comp += Math.sqrt(def.hp * scale) * 0.4; // un compagnon encaisse aussi
    });
    const maxHp = 100 + pw.hp;
    const arm = Math.min(0.75, (armor ? armor.armor || 0 : 0) + pw.armor);
    const ehp = (maxHp + pw.regen * 30) / (1 - arm);
    // calée pour qu'avec l'équipement de départ, un monde de menace 1 ou 2 soit « Équilibré » et un monde de menace 7 « Mortel »
    return Math.sqrt(ehp * (ranged * 0.75 + melee + comp)) * 2.15;
  };
  Dg.playerLevel = (p, loadout) => Dg.level(Dg.playerForce(p, loadout));

  /* ---------- le verdict ---------- */
  /** Les quatre dangers : écart de niveaux (monde − vous) à partir duquel on y entre. */
  Dg.GRADES = [
    { id: 'facile', name: 'Facile', from: -Infinity, note: 'Vous y êtes nettement plus fort que ce qui y vit.' },
    { id: 'equilibre', name: 'Équilibré', from: -6, note: 'Un combat juste : prudence avec le gardien.' },
    { id: 'difficile', name: 'Difficile', from: 3, note: 'Ce qui y vit est plus fort que vous. Choisissez bien vos compagnons.' },
    { id: 'mortel', name: 'Mortel', from: 9, note: 'Vous n’êtes pas prêt pour ce monde : vos armes, votre protection ou vos compagnons sont trop faibles.' },
  ];
  /** Le danger d'un monde pour vous : { id, name, note, rank (0 à 3), world, you, gap }. */
  Dg.of = function (w, p, loadout) {
    if (w.tutorial) return Object.assign({}, Dg.GRADES[0], { rank: 0, world: 1, you: 1, gap: 0 });
    const world = Dg.worldLevel(w), you = Dg.playerLevel(p, loadout);
    const gap = world - you;
    let k = 0;
    Dg.GRADES.forEach((g, i) => { if (gap >= g.from) k = i; });
    return Object.assign({}, Dg.GRADES[k], { rank: k, world, you, gap });
  };
  /** En toutes lettres : « Difficile · monde niveau 34, vous 27 ». */
  Dg.text = (d) => d.name + ' · monde niveau ' + d.world + ', vous ' + d.you;
})();
