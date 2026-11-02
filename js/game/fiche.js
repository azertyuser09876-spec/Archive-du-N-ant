/* La fiche d'un monde (1.15) : ce que l'Artefact en sait, sans jamais rien inventer.
   Remplace l'ancienne « estimation » du scanner, qui pouvait afficher des ressources
   fausses ou une menace approximative. Tout ce qui est montré est exact ; ce que le
   scanner ne perçoit pas encore est marqué inconnu (null), et un meilleur scanner
   le révèle aussitôt (la fiche est calculée à l'affichage, pas enregistrée).
   - toujours : danger pour vous, taille, paysages, ressources (toutes, avec leur
     abondance), stabilité, peuple ou nation, sauvetage, maître du cœur (échelons cosmiques) ;
   - selon la fiabilité du scanner : faune (les espèces déjà observées, puis toutes),
     gardiens, règle et anomalie, caveaux, structures et événements. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;

  const Fi = (AN.Fiche = {});
  /** Fiabilité à partir de laquelle chaque information est perçue. */
  Fi.NEED = { fauna: 0.5, guardians: 0.7, rule: 0.5, anomaly: 0.7, vaults: 0.5, structures: 0.7, events: 0.85, people: 0.5 };
  Fi.ABUNDANCE = ['', 'Traces', 'Présent', 'Abondant'];

  const reliab = (p) => (p ? AN.Profile.scanner(p).reliab : 1); // l'amélioration et les bâtiments qui l'épaulent

  /** Toutes les ressources du monde, et leur abondance (1 à 3), des zones et de leurs mélanges. */
  Fi.resources = function (w) {
    const sum = {};
    w.zones.concat(w.heart ? [w.heart] : []).forEach((z) => {
      const b = D.BIOME[z.biome];
      for (const r in b.resources) sum[r] = (sum[r] || 0) + b.resources[r];
      if (z.mix) { const m = D.BIOME[z.mix]; for (const r in m.resources) sum[r] = (sum[r] || 0) + m.resources[r] * 0.35; }
    });
    const zones = w.zones.length + 1;
    return Object.keys(sum).map((id) => {
      const per = sum[id] / zones;
      return { id, level: per >= 2.2 ? 3 : per >= 0.9 ? 2 : 1 };
    }).sort((a, b) => b.level - a.level || D.RESOURCES[b.id].rarity - D.RESOURCES[a.id].rarity);
  };

  /** Les espèces qui y vivent (hors gardiens). */
  Fi.species = function (w) {
    const set = new Set();
    w.zones.forEach((z) => { [z.biome, z.mix].filter(Boolean).forEach((b) => AN.WorldGen.pool(b).forEach((c) => set.add(c.id))); });
    return [...set];
  };

  /** La fiche complète, pour vous (danger) et votre scanner (ce qui est perçu). */
  Fi.of = function (w, p, loadout) {
    const r = reliab(p);
    const knows = (k) => r >= Fi.NEED[k] - 1e-9;
    const seen = (id) => !!(p && p.bestiary && p.bestiary[id] && p.bestiary[id].seen);
    const species = Fi.species(w);
    const out = {
      reliability: r,
      danger: AN.Danger.of(w, p, loadout),
      scale: w.scale || 'region',
      zones: w.zones.length,
      size: (D.SIZES.find((s) => s.id === w.size) || {}).name || null,
      biomes: w.zones.map((z) => z.biome),
      heart: w.heart ? w.heart.biome : null,
      resources: Fi.resources(w),
      stability: Math.round(w.stability * 100),
      anchored: !!w.place,
      // la faune : ce qu'on a déjà observé est nommé ; le reste n'est qu'un nombre, sauf avec un bon scanner
      fauna: knows('fauna') ? species.map((id) => ({ id, known: seen(id) || r >= 1 })) : null,
      faunaCount: species.length,
      guardians: knows('guardians') ? w.zones.map((z) => z.guardian).filter(Boolean) : null,
      master: w.scale && w.scale !== 'region' && w.heart ? w.heart.guardian : knows('guardians') && w.heart ? w.heart.guardian : null,
      rule: knows('rule') ? w.rule : null,
      anomaly: knows('anomaly') ? w.anomaly : null,
      people: w.nation ? { nation: true, realm: w.nation.realm, people: w.nation.people } : w.civ ? (knows('people') ? { people: w.civ.people, n: w.civ.n, attitude: w.civ.attitude } : { unknown: true }) : null,
      vaults: (() => { const keys = w.zones.concat([w.heart]).map((z) => z && z.vault).filter(Boolean); return { n: keys.length, keys: knows('vaults') ? [...new Set(keys)] : null }; })(),
      structures: (() => { const s = w.zones.map((z) => z.structure).filter(Boolean); return { n: s.length, ids: knows('structures') ? s : null }; })(),
      events: (() => { const e = [...new Set(w.zones.map((z) => z.event).filter(Boolean))]; return { n: e.length, ids: knows('events') ? e : null }; })(),
    };
    return out;
  };

  /** Ce qu'il faudrait au scanner pour en savoir plus (null s'il voit tout). */
  Fi.missing = function (f) {
    const left = Object.keys(Fi.NEED).filter((k) => f.reliability < Fi.NEED[k] - 1e-9);
    return left.length ? Math.round(Math.min(...left.map((k) => Fi.NEED[k])) * 100) : null;
  };
})();
