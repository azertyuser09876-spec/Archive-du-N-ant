/* Des bienfaits à la mesure de l'échelle (1.12) : données pures, chargées après terres.js.
   Plus ce qu'on rapporte est grand, plus il apporte. Trois familles de bienfaits :
   - les astres, selon la couche du ciel où ils vont (orbite, système, galaxie, amas, Toile) ;
   - le pouvoir des gardiens de zone des échelons supérieurs (ceux des régions ne changent pas) ;
   - l'influence des grands êtres, du Souverain du monde (rang 4) au Relieur (rang 10).
   Chaque bienfait garde sa nature (production, capture, vitesse…) ; sa force vient d'une
   valeur de base par nature, multipliée par l'échelle. Les textes sont recalculés. */
(function () {
  'use strict';
  const D = window.AN.Data;

  /** Valeur de base d'un bienfait, à l'échelle d'une région (le meilleur pouvoir de gardien de région). */
  D.BOON_BASE = { hp: 20, capture: 0.15, speed: 0.1, meleeDmg: 0.1, rangedDmg: 0.1, armor: 0.08, compDmg: 0.2, prod: 0.1, regen: 1,
    hazardRes: 0.25, craftCost: 0.06, cargo: 1, stability: 0.1, scan: 0.1, reveal: 1, links: 1 };
  /** Multiplicateur par échelon (astres et gardiens de zone). */
  D.BOON_SCALE = { region: 1, monde: 1.25, orbite: 1.5, systeme: 1.75, galaxie: 2, amas: 2.5, toile: 3, pli: 3.5 };
  /** Influence des grands êtres : base au rang 3 (ultra-boss des régions, inchangés), puis par rang. */
  D.GIANT_BASE = { prod: 0.25, craftCost: 0.2, cargo: 3, stability: 0.2, hp: 30, compDmg: 0.2, regen: 1, rangedDmg: 0.15, meleeDmg: 0.15,
    capture: 0.2, speed: 0.1, links: 1, reveal: 1 };
  D.GIANT_SCALE = { 4: 1.25, 5: 1.5, 6: 1.75, 7: 2, 8: 2.25, 9: 2.5, 10: 2.75 };

  const WHOLE = { hp: 1, cargo: 1, links: 1, reveal: 1 };
  // des nombres ronds : PV par cinq (au-delà de 20), pourcentages par cinq au-delà de 20 %
  const round = (k, v) => {
    if (k === 'reveal') return 1;
    if (k === 'hp') return v > 20 ? Math.round(v / 5) * 5 : Math.round(v);
    if (WHOLE[k]) return Math.max(1, Math.round(v));
    if (k === 'regen') return Math.round(v * 10) / 10;
    return v >= 0.2 ? Math.round(v * 20) / 20 : Math.round(v * 100) / 100;
  };

  /** Un bienfait en toutes lettres : « +18 % de production et capture 30 % plus rapide ». */
  D.statText = function (stat) {
    const pct = (v) => Math.round(v * 100) + ' %';
    const num = (v) => String(v).replace('.', ',');
    const T = {
      prod: (v) => '+' + pct(v) + ' de production',
      craftCost: (v) => '−' + pct(v) + ' sur les coûts de l’Atelier',
      cargo: (v) => '+' + v + ' place' + (v > 1 ? 's' : '') + ' de soute',
      stability: (v) => 'effondrement ' + pct(v) + ' plus lent',
      hp: (v) => '+' + v + ' PV maximum',
      speed: (v) => '+' + pct(v) + ' de vitesse de déplacement',
      armor: (v) => '−' + pct(v) + ' de dégâts reçus',
      capture: (v) => 'capture ' + pct(v) + ' plus rapide',
      rangedDmg: (v) => '+' + pct(v) + ' de dégâts à distance',
      meleeDmg: (v) => '+' + pct(v) + ' de dégâts au corps à corps',
      compDmg: (v) => '+' + pct(v) + ' de dégâts des compagnons',
      regen: (v) => 'régénère ' + num(v) + ' PV par seconde',
      hazardRes: (v) => '−' + pct(v) + ' de dégâts des terrains dangereux',
      scan: (v) => 'fiabilité du scanner +' + pct(v),
      reveal: () => 'carte toujours révélée',
      links: (v) => '+' + v + ' lien' + (v > 1 ? 's' : '') + ' de compagnon',
    };
    const parts = Object.keys(stat).filter((k) => T[k]).map((k) => T[k](stat[k]));
    const s = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1] : parts[0] || '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  /* ---------------- Astres : la couche du ciel fait la force ---------------- */
  // la nature de quelques astres change pour ne pas doubler celle d'un voisin de la même couche
  const KIND = {
    naine_brune: ['regen'], // sa chaleur sourde soigne
    halo_sombre: ['armor'], // le halo de matière sombre enveloppe et protège
  };
  Object.keys(D.ASTRES).forEach((id) => {
    const A = D.ASTRES[id];
    const m = D.BOON_SCALE[A.layer] || 1;
    const keys = KIND[id] || Object.keys(A.stat);
    const share = keys.length > 1 ? 1 / keys.length : 1; // deux bienfaits : chacun à moitié
    const stat = {};
    keys.forEach((k) => { stat[k] = round(k, D.BOON_BASE[k] * m * share); });
    A.stat = stat;
    A.desc = D.statText(stat) + '.';
  });

  /* ---------------- Gardiens de zone des échelons supérieurs ---------------- */
  const scaleOfGuardian = (c) => c.scale || (c.biomes.some((b) => D.BIOME[b] && D.BIOME[b].scale === 'monde') ? 'monde' : 'region');
  D.CREATURES.forEach((c) => {
    if (c.tier !== 2 || !c.power) return;
    const sc = scaleOfGuardian(c);
    if (sc === 'region') return;
    const m = D.BOON_SCALE[sc] || 1;
    const stat = {};
    Object.keys(c.power.stat).forEach((k) => { stat[k] = round(k, (D.BOON_BASE[k] || c.power.stat[k]) * m); });
    c.power.stat = stat;
    c.power.desc = D.statText(stat);
  });

  /* ---------------- Grands êtres (rang 4 et plus) ---------------- */
  D.CREATURES.forEach((c) => {
    const f = D.GIANT_SCALE[c.tier];
    const g = c.global;
    if (!f || !g) return;
    const stat = {};
    Object.keys(g.stat).forEach((k) => { stat[k] = round(k, (D.GIANT_BASE[k] || g.stat[k]) * f); });
    g.stat = stat;
    g.desc = D.statText(stat);
  });
})();
