/* Sauvegarde versionnée dans le navigateur (localStorage), avec migrations,
   export et import d'un fichier JSON. */
(function () {
  'use strict';
  const AN = window.AN;

  const KEY = 'archive-du-neant/save';
  const S = (AN.Save = { KEY, VERSION: 5, memory: null, available: true, SLOTS: 3, slot: 1 });
  /** Trois emplacements de partie ; le premier garde la clé historique. */
  S.keyOf = (n) => (n === 1 ? KEY : KEY + '-' + n);
  S.useSlot = function (n) {
    S.slot = n;
    S.memory = null;
    if (AN.Prefs) { AN.Prefs.data.lastSlot = n; AN.Prefs.save(); }
  };
  if (AN.Prefs && AN.Prefs.data) S.slot = Math.min(S.SLOTS, Math.max(1, AN.Prefs.data.lastSlot || 1));

  try {
    const t = '__an_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
  } catch (e) {
    S.available = false; // navigation privée stricte : on garde la partie en mémoire
  }

  S.newProfile = function (seed) {
    const now = Date.now();
    return {
      version: S.VERSION,
      created: now,
      updated: now,
      seed: seed >>> 0,
      expeditions: 0,
      scans: 0,
      stats: { worlds: 0, captures: 0, kills: 0, deaths: 0, emergencies: 0, guardians: 0, ultras: 0, playTime: 0 },
      stock: {},
      owned: { eclat: 1, lame_neant: 1, sacoche: 1, baume_seve: 2 },
      loadout: { ranged: 'eclat', melee: 'lame_neant', armor: null, bag: 'sacoche', consumables: [{ id: 'baume_seve', n: 2 }], tool_harvest: null, tool_capture: null, tool_extract: null, tool_transport: null },
      artefact: { soute: 0, liens: 0, stabilisateur: 0, scanner: 0, rayon: 0 },
      collection: [],
      companions: [],
      territories: [],
      centerStock: {},
      bestiary: {},
      lore: [],
      journal: [],
      destinations: null,
      pendingExpedition: null,
      settings: { volume: 0.7, ambience: 0.5, music: 0.55, mute: false, shake: true, autoFeed: true },
      flags: {},
      lastTick: now,
      bondTick: now,
      sursis: [],
      essences: [],
      legacy: { capture: 0, hp: 0, loyalty: 0 },
      call: null,
      archiveLog: [],
      moral: { sauves: 0, abandonnes: 0, contraints: 0, massacres: 0, combattus: 0, pillages: 0, adores: 0, evades: 0 },
      peoples: {},
      settlements: [],
      structures: [],
      civLore: [],
      cosmos: { astres: [] },
      destByScale: {},
      arrange: { reshape: false, autoReshape: true }, // agencement (1.7) : forme adaptée au déplacement, au rangement
    };
  };

  /** Complète une créature de la collection avec les champs apparus en version 2. */
  S.normalizeCreature = function (c) {
    if (c.level == null) c.level = 1;
    if (c.xp == null) c.xp = 0;
    if (c.loyalty == null) c.loyalty = 45;
    if (c.stage == null) c.stage = 0;
    if (c.fed == null) c.fed = 1;
    if (c.injured == null) c.injured = 0;
    if (c.lost === undefined) c.lost = null;
    if (c.kills == null) c.kills = 0;
    if (c.outings == null) c.outings = 0;
    if (c.gen == null) c.gen = 0;
    if (c.parents === undefined) c.parents = null;
    if (c.breedAcc == null) c.breedAcc = 0;
    return c;
  };

  /** Migrations : MIGRATIONS[v] transforme une sauvegarde v en v+1. */
  const MIGRATIONS = {
    // 2 → 3 : échelles supérieures (astres, destinations par échelon). Rien n'est retiré.
    2: (d) => {
      d.cosmos = d.cosmos || { astres: [] };
      d.destByScale = {};
      d.version = 3;
      return d;
    },
    // 3 → 4 : les territoires prennent une taille et une forme (le fragment reste une case),
    // puis l'Archive est réagencée au plus près de l'ancienne disposition.
    3: (d) => {
      (d.territories || []).forEach((t) => {
        if (!t.cells) t.cells = AN.Shapes ? AN.Shapes.blob(AN.Shapes.sizeOf(t.quality), t.seed || 1) : [[0, 0]];
      });
      if (AN.Shapes && d.territories && d.territories.length) AN.Shapes.relayout(d);
      d.version = 4;
      return d;
    },
    // 4 → 5 : outils de préparation, bâtiments et structures rapportées. Les arches déjà
    // emportées prennent un emplacement autour de l'Artefact.
    4: (d) => {
      d.loadout = d.loadout || {};
      ['tool_harvest', 'tool_capture', 'tool_extract', 'tool_transport'].forEach((k) => { if (d.loadout[k] === undefined) d.loadout[k] = null; });
      d.structures = d.structures || [];
      d.version = 5;
      return d;
    },
    0: (d) => { d.version = 1; return d; },
    // v2 : niveaux, loyauté, faim, compagnons perdus
    1: (d) => { d.version = 2; (d.collection || []).forEach((c) => { if (c.loyalty == null) c.loyalty = 55; }); return d; },
  };

  function fillDefaults(target, defaults) {
    for (const k in defaults) {
      if (target[k] === undefined) target[k] = defaults[k];
      else if (defaults[k] && typeof defaults[k] === 'object' && !Array.isArray(defaults[k]) &&
               target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        fillDefaults(target[k], defaults[k]);
      }
    }
    return target;
  }

  S.migrate = function (data) {
    if (!data || typeof data !== 'object') throw new Error('Sauvegarde illisible');
    let v = typeof data.version === 'number' ? data.version : 0;
    if (v > S.VERSION) throw new Error('Sauvegarde créée par une version plus récente du jeu (format ' + v + ')');
    while (v < S.VERSION) {
      const m = MIGRATIONS[v];
      if (!m) throw new Error('Aucune migration depuis le format ' + v);
      data = m(data);
      v = data.version;
    }
    fillDefaults(data, S.newProfile(data.seed || 1));
    (data.collection || []).forEach(S.normalizeCreature);
    return data;
  };

  S.load = function (slot = S.slot) {
    try {
      const raw = S.available ? window.localStorage.getItem(S.keyOf(slot)) : slot === S.slot ? S.memory : null;
      if (!raw) return null;
      return S.migrate(JSON.parse(raw));
    } catch (e) {
      console.warn('Sauvegarde ignorée :', e);
      return null;
    }
  };

  S.write = function (profile) {
    if (S.suspended) return false; // partie d'essai (tutoriel rejoué) : rien n'est enregistré
    profile.updated = Date.now();
    const raw = JSON.stringify(profile);
    if (S.available) {
      try { window.localStorage.setItem(S.keyOf(S.slot), raw); return true; } catch (e) { S.available = false; }
    }
    S.memory = raw;
    return false;
  };

  S.clear = function (slot = S.slot) {
    try { if (S.available) window.localStorage.removeItem(S.keyOf(slot)); } catch (e) { /* ignoré */ }
    if (slot === S.slot) S.memory = null;
  };

  /** Résumé d'un emplacement, pour l'écran titre (null s'il est vide). */
  S.peek = function (slot) {
    const p = S.load(slot);
    if (!p) return null;
    let rank = '';
    try { rank = AN.Profile.rank(p).def.name; } catch (e) { rank = ''; }
    return { p, rank, territories: p.territories.length, creatures: p.collection.length, worlds: p.stats.worlds, updated: p.updated || p.created, expedition: !!(p.pendingExpedition && p.pendingExpedition.snap) };
  };

  S.exportFile = function (profile) {
    const blob = new Blob([JSON.stringify(profile, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'archive-du-neant-' + d.toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };

  S.importFile = function (file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try { resolve(S.migrate(JSON.parse(reader.result))); } catch (e) { reject(e); }
      };
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
      reader.readAsText(file);
    });
  };
})();
