/* Au-delà de la galaxie (1.10) : trois nouveaux paliers, données pures.
   - L'Amas : des galaxies serrées, reliées par des ponts de matière sombre qui
     se font et se défont ; des galaxies se percutent ; le Berger d'amas.
   - La Toile : des filaments de lumière où l'on file, entre de grands vides où
     l'on se traîne ; le Grand Vide s'étend ; le Tisserand.
   - Le Pli : au-delà de l'univers, un monde blanc comme le Néant du début ; on y
     croise des échos de soi-même ; la gravité s'y inverse ; le Relieur.
   Chargé après cosmos.js : il complète ses tables sans rien retirer, sauf le rang
   « Inconnue », reporté après les deux nouveaux rangs (Amas, Toile). */
(function () {
  'use strict';
  const D = window.AN.Data;

  /* =================== Échelons =================== */
  // move : bridges (îles et ponts qui se font et se défont, sauts possibles),
  //        filaments (rapide sur les filaments, lent ailleurs), inversion (zones où la marche s'inverse)
  Object.assign(D.ECHELONS, {
    amas: {
      id: 'amas', name: 'Amas', plural: 'Amas', rank: 9, zones: [3, 3], tiles: [72, 78], move: 'bridges', event: 'collision', zoom: 0.66, boss: 8,
      unit: 'Galaxie', heart: 'Centre de l’amas', form: 'rassemblement', astre: true, words: ['Amas', 'Grappe', 'Troupeau', 'Essaim'],
      desc: 'Des galaxies serrées les unes contre les autres. Des ponts de matière sombre les relient, puis se défont.',
      threatDesc: 'Collisions de galaxies', moveDesc: 'Ponts de matière sombre qui se font et se défont (et sauts au-dessus du vide)',
    },
    toile: {
      id: 'toile', name: 'Toile', plural: 'Toiles', rank: 10, zones: [3, 3], tiles: [76, 82], move: 'filaments', event: 'grand_vide', zoom: 0.62, boss: 9,
      unit: 'Nœud', heart: 'Cœur de la Toile', form: 'tissage', astre: true, words: ['Toile', 'Trame', 'Réseau', 'Filament'],
      desc: 'La structure de l’univers : des filaments de lumière où l’on file, entre de grands vides où l’on se traîne.',
      threatDesc: 'Le Grand Vide, qui s’étend', moveDesc: 'Rapide sur les filaments, lent dans les vides',
    },
    pli: {
      id: 'pli', name: 'Pli', plural: 'Plis', rank: 11, zones: [2, 3], tiles: [66, 72], move: 'inversion', event: 'pliure', zoom: 0.9, boss: 10,
      unit: 'Feuillet', heart: 'Le Pli', heartBiome: 'coeur_pli', form: 'reflet', astre: false, words: ['Pli', 'Feuillet', 'Marge', 'Envers'],
      desc: 'Au-delà de l’univers, un monde blanc, comme celui du début. On y croise ce que l’on a été.',
      threatDesc: 'Pliures', moveDesc: 'La marche s’inverse par endroits',
    },
  });
  D.ECHELON_ORDER.push('amas', 'toile', 'pli');

  Object.assign(D.CAPTURE_FORMS, {
    rassemblement: { name: 'Rassemblement', desc: 'Ses galaxies errantes s’éloignent. Frappez-les pour les repousser dans son orbite (l’anneau clair), toutes, puis capturez-le.' },
    tissage: { name: 'Tissage', desc: 'Des nœuds s’allument autour de lui. Touchez-les dans l’ordre indiqué pour fermer la trame, puis capturez-le.' },
    reflet: { name: 'Reflet', desc: 'Il se dédouble. Un seul porte une ombre : capturez celui-là. Un reflet se déchire sous le rayon, et le vrai reprend des forces.' },
  });

  /* =================== Rangs de créatures =================== */
  D.TIERS.push(
    { id: 8, name: 'Entité d’amas', weight: 0, anchor: 5 },
    { id: 9, name: 'Entité de la Toile', weight: 0, anchor: 6 },
    { id: 10, name: 'Entité du Pli', weight: 0, anchor: 7 },
  );
  // il n'y a plus de rang de créature seulement pressenti
  D.HIGHER_TIERS = [];

  D.SIZES.push(
    { id: 'amas', name: 'Amas', zones: 3 },
    { id: 'toile', name: 'Toile', zones: 3 },
    { id: 'pli', name: 'Pli', zones: 3 },
  );
  Object.assign(D.SIZE_OF, { amas: 'amas', toile: 'toile', pli: 'pli' });

  /* =================== Ressources =================== */
  Object.assign(D.RESOURCES, {
    onde: { name: 'Onde gravitationnelle', rarity: 1, color: '#9a7ae8', icon: 'orb' },
    fil: { name: 'Fil de lumière', rarity: 1, color: '#bfe2ff', icon: 'strand' },
    blanc: { name: 'Feuillet blanc', rarity: 2, color: '#e9e6dc', icon: 'shard' },
  });

  /* =================== Biomes =================== */
  const NEW_BIOMES = [
    /* ---- amas ---- */
    {
      id: 'pont_sombre', name: 'Ponts sombres', region: 'des Ponts', tags: ['sombre', 'vide', 'gaz'], scale: 'amas',
      climate: 'Lourd, presque palpable', desc: 'De la matière que l’on ne voit pas tend des passerelles d’une galaxie à l’autre.',
      ground: ['#1e1830', '#241d3a', '#2a2244'], detail: '#3e3260',
      wall: { base: '#0c0a16', top: '#6a5aa8', shape: 'blob', orn: 'glow' },
      accent: '#9a7ae8', open: 0.56, dark: 0.45, weather: 'motes',
      hazard: { name: 'Matière sombre', color: '#3a2a60', dps: 8, slow: 0.35 }, hazardAmt: 0.05,
      decor: [['glowdot', '#c8b8ff'], ['dot', '#6a5aa8']],
      resources: { onde: 2, poussiere: 2, matiere_noire: 0.4 },
    },
    {
      id: 'galaxie_naine', name: 'Galaxie naine', region: 'des Petites Spirales', tags: ['lumiere', 'vie', 'gaz'], scale: 'amas',
      climate: 'Doux, scintillant', desc: 'Une galaxie toute petite, qu’on traverse en une marche.',
      ground: ['#2c2a48', '#343254', '#3c3a60'], detail: '#5a5890',
      wall: { base: '#14122a', top: '#fff0c0', shape: 'shard', orn: 'glow' },
      accent: '#fff0c0', open: 0.6, dark: 0.15, weather: 'glint',
      hazard: { name: 'Vent stellaire', color: '#e8d890', dps: 7, slow: 0.15 }, hazardAmt: 0.04,
      decor: [['glowdot', '#fff0c0'], ['glowdot', '#c8c0ff'], ['dot', '#8a88c8']],
      resources: { poussiere: 3, onde: 1, plasma: 1, spore: 1 },
    },
    {
      id: 'front_collision', name: 'Front de collision', region: 'du Choc', tags: ['chaud', 'lumiere', 'plasma'], scale: 'amas',
      climate: 'Déchiré, brûlant', desc: 'Deux galaxies se traversent. Leurs étoiles ne se touchent pas ; leurs gaz, si.',
      ground: ['#3a2236', '#46283e', '#522e46'], detail: '#7a4060',
      wall: { base: '#1a0c18', top: '#ffb0d0', shape: 'shard', orn: 'glow' },
      accent: '#ff9ac8', open: 0.58, dark: 0.1, weather: 'embers',
      hazard: { name: 'Gaz en fusion', color: '#ff7aa8', dps: 12, slow: 0.2 }, hazardAmt: 0.06,
      decor: [['ember', '#ffb0d0'], ['glowdot', '#ffffff']],
      resources: { plasma: 2, onde: 2, poussiere: 2, essence: 0.15 },
    },
    /* ---- toile ---- */
    {
      id: 'filament_lumiere', name: 'Filament de lumière', region: 'du Filament', tags: ['lumiere', 'vent', 'vide'], scale: 'toile',
      climate: 'Rapide, sifflant', desc: 'Des milliers de galaxies alignées si serrées qu’elles forment un fil.',
      ground: ['#1a2236', '#1e283e', '#232e48'], detail: '#3a4a70',
      wall: { base: '#0a0e1a', top: '#bfe2ff', shape: 'shard', orn: 'glow' },
      accent: '#bfe2ff', open: 0.6, dark: 0.3, weather: 'glint',
      hazard: { name: 'Courant de lumière', color: '#8ac0f0', dps: 6, slow: 0.1 }, hazardAmt: 0.04,
      decor: [['glowdot', '#ffffff'], ['glowdot', '#bfe2ff'], ['dot', '#6a8ac0']],
      resources: { fil: 3, poussiere: 2, ether: 1 },
    },
    {
      id: 'bord_vide', name: 'Bord du Grand Vide', region: 'du Grand Vide', tags: ['sombre', 'vide', 'froid'], scale: 'toile',
      climate: 'Rien. Pas même le froid', desc: 'Ici commence un vide plus grand que tout ce que vous avez rapporté.',
      ground: ['#0e0e16', '#12121c', '#161622'], detail: '#262636',
      wall: { base: '#050508', top: '#4a4a6a', shape: 'blob', orn: 'glow' },
      accent: '#7a7aa8', open: 0.62, dark: 0.65, weather: 'motes',
      hazard: { name: 'Vide pur', color: '#1a1a2a', dps: 9, slow: 0.4 }, hazardAmt: 0.06,
      decor: [['dot', '#3a3a5a'], ['glowdot', '#7a7aa8']],
      resources: { matiere_noire: 0.5, fil: 1, neant: 1, onde: 1 },
    },
    {
      id: 'noeud_toile', name: 'Nœud de la Toile', region: 'du Nœud', tags: ['lumiere', 'chaud', 'gaz'], scale: 'toile',
      climate: 'Éblouissant', desc: 'Là où les filaments se croisent, des amas entiers tiennent comme des perles sur un fil.',
      ground: ['#3a3424', '#46402c', '#524a32'], detail: '#7a6a44',
      wall: { base: '#1a160c', top: '#ffe8a0', shape: 'blob', orn: 'glow' },
      accent: '#ffe8a0', open: 0.58, dark: 0.05, weather: 'embers',
      hazard: { name: 'Nœud brûlant', color: '#ffc860', dps: 12, slow: 0.2 }, hazardAmt: 0.05,
      decor: [['ember', '#ffe8a0'], ['glowdot', '#ffffff']],
      resources: { fil: 2, plasma: 2, onde: 1, essence: 0.15 },
    },
    /* ---- pli : un monde blanc ---- */
    {
      id: 'envers', name: 'L’Envers', region: 'de l’Envers', tags: ['vide', 'artificiel', 'froid'], scale: 'pli',
      climate: 'Aucun', desc: 'Le dos de quelque chose. Tout y est blanc, et tout y est à l’envers.',
      ground: ['#efeeea', '#f3f2ee', '#f7f6f2'], detail: '#d4d2ca',
      wall: { base: '#dcdad2', top: '#ffffff', shape: 'block', orn: 'cracks' },
      accent: '#2346c8', open: 0.62, dark: 0, weather: 'motes',
      hazard: { name: 'Encre', color: '#1c2230', dps: 10, slow: 0.3 }, hazardAmt: 0.04,
      decor: [['dot', '#c8c6be'], ['plate', '#e2e0d8'], ['glitch', '#2346c8']],
      resources: { blanc: 1, encre: 2, neant: 1, verre: 2 },
    },
    {
      id: 'marge', name: 'La Marge', region: 'de la Marge', tags: ['ruine', 'sec', 'lumiere'], scale: 'pli',
      climate: 'Silencieux', desc: 'Une bande blanche le long de quelque chose d’écrit. Des annotations, partout.',
      ground: ['#f2efe6', '#f6f3ea', '#faf7ee'], detail: '#d8d2c0',
      wall: { base: '#e2dccb', top: '#fffdf6', shape: 'block', orn: 'rivets' },
      accent: '#c8322c', open: 0.6, dark: 0, weather: 'dust',
      hazard: { name: 'Rature', color: '#2a2a34', dps: 9, slow: 0.25 }, hazardAmt: 0.05,
      decor: [['dot', '#c8c0aa'], ['plate', '#e8e2d2'], ['bonebit', '#d8d2c0']],
      resources: { blanc: 1, encre: 3, fibre: 2, essence: 0.2 },
    },
    {
      id: 'coeur_pli', name: 'Le Pli', region: 'du Pli', tags: ['vide', 'lumiere', 'artificiel'], scale: 'pli', heartOnly: true,
      climate: 'Plié', desc: 'L’endroit où l’univers est replié sur lui-même. On y voit son propre dos.',
      ground: ['#ecebe6', '#f1f0eb', '#f6f5f0'], detail: '#cfcdc4',
      wall: { base: '#d6d4cc', top: '#ffffff', shape: 'hex', orn: 'cracks' },
      accent: '#2346c8', open: 0.64, dark: 0, weather: 'motes',
      hazard: { name: 'Encre', color: '#1c2230', dps: 12, slow: 0.3 }, hazardAmt: 0.04,
      decor: [['dot', '#c8c6be'], ['glitch', '#2346c8']],
      resources: { blanc: 2, encre: 2, neant: 1, essence: 0.3 },
    },
  ];
  NEW_BIOMES.forEach((b) => { b.index = D.BIOMES.length; D.BIOMES.push(b); D.BIOME[b.id] = b; });

  D.SYNERGIES.push(
    { a: 'vide', b: 'lumiere', name: 'Contraste', mult: 0.2, desc: 'La lumière se voit mieux au bord du vide : +20 % de production.' },
  );

  /* =================== Créatures =================== */
  const AMAS = ['pont_sombre', 'galaxie_naine', 'front_collision'];
  const TOILE = ['filament_lumiere', 'bord_vide', 'noeud_toile'];
  const PLI = ['envers', 'marge', 'coeur_pli'];
  const C = [
    /* ---------------- Amas ---------------- */
    { id: 'galaxion', name: 'Galaxion', tier: 0, scale: 'amas', biomes: AMAS,
      r: 9, hp: 60, speed: 70, temper: 'craintif', move: 'drift', attack: null, traits: ['glow'], group: [3, 5],
      art: { shape: 'spiral', body: '#7a6ad0', accent: '#fff0c0', eye: '#ffffff', eyes: 1, glow: '#c8b8ff' },
      drops: { poussiere: 2, onde: 0.3 }, produces: { res: 'onde', rate: 0.5 }, roles: ['producteur'],
      desc: 'Une galaxie de la taille d’une main. Elle suit le troupeau.' },
    { id: 'agnelet', name: 'Agnelet d’étoiles', tier: 0, scale: 'amas', biomes: AMAS,
      r: 12, hp: 70, speed: 60, temper: 'passif', move: 'walk', attack: null, traits: ['glow'], group: [2, 4],
      art: { shape: 'quad', body: '#e8e0ff', accent: '#fff0c0', eye: '#1c2230', eyes: 2, fluffy: true, ears: true, glow: '#e8e0ff' },
      drops: { poussiere: 2, onde: 0.2 }, produces: { res: 'poussiere', rate: 1.6 }, roles: ['producteur', 'soutien'],
      desc: 'Sa laine est faite de poussière d’étoiles. Le Berger les compte, une à une.' },
    { id: 'loup_sombre', name: 'Loup de matière sombre', tier: 1, scale: 'amas', biomes: AMAS,
      r: 18, hp: 220, speed: 140, temper: 'agressif', move: 'walk', attack: { type: 'bite', dmg: 18, cd: 0.9 }, traits: [], group: [2, 3],
      art: { shape: 'quad', body: '#1a1430', accent: '#9a7ae8', eye: '#c8b8ff', eyes: 2, ears: true, tail: true, spikes: 4 },
      drops: { onde: 1, matiere_noire: 0.2 }, roles: ['combat'],
      desc: 'On ne le voit qu’à ce qui manque autour de lui.' },
    { id: 'ricocheur', name: 'Ricocheur', tier: 1, scale: 'amas', biomes: AMAS,
      r: 16, hp: 190, speed: 120, temper: 'territorial', move: 'fly', attack: { type: 'charge', dmg: 22, cd: 2.2, speed: 520, windup: 0.6, dist: 300 }, traits: ['glow'], group: [1, 2],
      art: { shape: 'comet', body: '#ff9ac8', accent: '#ffffff', eye: '#1c2230', eyes: 1, glow: '#ff9ac8' },
      drops: { plasma: 1, onde: 1 }, roles: ['combat', 'eclaireur'],
      desc: 'Un fragment de collision qui n’a jamais su s’arrêter.' },
    { id: 'chien_amas', name: 'Chien de l’amas', tier: 2, scale: 'amas', biomes: AMAS,
      r: 50, hp: 1450, speed: 70, temper: 'agressif', move: 'walk', traits: ['glow'],
      art: { shape: 'quad', body: '#2a2244', accent: '#fff0c0', eye: '#fff0c0', eyes: 2, ears: true, tail: true, fluffy: true, glow: '#9a7ae8' },
      phases: [
        { at: 1, speed: 70, patterns: [{ type: 'charge', dmg: 26, speed: 560, windup: 0.8, count: 2 }, { type: 'aimed', count: 5, spread: 0.6, speed: 340, dmg: 12, color: '#fff0c0', bursts: 2 }] },
        { at: 0.6, speed: 80, patterns: [{ type: 'summon', species: 'loup_sombre', count: 2 }, { type: 'charge', dmg: 28, speed: 600, windup: 0.7, count: 3 }, { type: 'shockwave', dmg: 18, speed: 260, count: 2 }] },
        { at: 0.3, speed: 90, patterns: [{ type: 'radial', n: 24, speed: 230, dmg: 12, color: '#c8b8ff' }, { type: 'charge', dmg: 30, speed: 640, windup: 0.6, count: 3 }, { type: 'summon', species: 'loup_sombre', count: 2 }] },
      ],
      drops: { onde: 8, poussiere: 10, essence: 1 }, produces: { res: 'onde', rate: 2 }, roles: ['combat'],
      power: { name: 'Flair d’amas', desc: '+10 % de dégâts des compagnons', stat: { compDmg: 0.1 } },
      desc: 'Il ramène les galaxies égarées. Il mord celles qui résistent.' },
    { id: 'onde_vivante', name: 'Onde vivante', tier: 2, scale: 'amas', biomes: AMAS,
      r: 54, hp: 1400, speed: 40, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'jelly', body: '#6a5aa8', accent: '#ff9ac8', eye: '#ffffff', eyes: 2, glow: '#9a7ae8' },
      phases: [
        { at: 1, speed: 40, patterns: [{ type: 'shockwave', dmg: 20, speed: 260, count: 3 }, { type: 'pull', dur: 2.4, force: 260, dmg: 12 }] },
        { at: 0.6, speed: 46, patterns: [{ type: 'radial', n: 20, speed: 200, dmg: 12, color: '#ff9ac8' }, { type: 'shockwave', dmg: 22, speed: 300, count: 4 }, { type: 'summon', species: 'galaxion', count: 3 }] },
        { at: 0.3, speed: 52, patterns: [{ type: 'spiral', arms: 5, dur: 2.8, speed: 210, dmg: 12, color: '#c8b8ff' }, { type: 'shockwave', dmg: 24, speed: 320, count: 5 }, { type: 'pull', dur: 2.8, force: 320, dmg: 14 }] },
      ],
      drops: { onde: 10, plasma: 3, essence: 1 }, produces: { res: 'onde', rate: 2.5 }, roles: ['soutien'],
      power: { name: 'Résonance', desc: '+12 % de production', stat: { prod: 0.12 } },
      desc: 'Le bruit de deux galaxies qui se rencontrent. Il a fini par se lever.' },
    { id: 'berger_amas', name: 'Le Berger d’amas', tier: 8, scale: 'amas', biomes: AMAS,
      r: 170, hp: 6400, armor: 0.1, speed: 30, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'shepherd', body: '#2a2244', accent: '#fff0c0', eye: '#fff0c0', eyes: 2, glow: '#c8b8ff' },
      phases: [
        { at: 1, speed: 30, patterns: [{ type: 'summon', species: 'agnelet', count: 3 }, { type: 'shockwave', dmg: 22, speed: 280, count: 3 }, { type: 'aimed', count: 9, spread: 1, speed: 320, dmg: 13, color: '#fff0c0', bursts: 2 }] },
        { at: 0.75, speed: 34, patterns: [{ type: 'pull', dur: 2.8, force: 320, dmg: 15 }, { type: 'summon', species: 'loup_sombre', count: 3 }, { type: 'radial', n: 32, speed: 210, dmg: 13, color: '#c8b8ff' }] },
        { at: 0.5, speed: 38, patterns: [{ type: 'shockwave', dmg: 26, speed: 320, count: 5 }, { type: 'rain', count: 16, radius: 72, dmg: 24, windup: 1.1, color: '#9a7ae8' }, { type: 'spiral', arms: 6, dur: 3, speed: 210, dmg: 13, color: '#fff0c0' }] },
        { at: 0.25, speed: 44, patterns: [{ type: 'summon', species: 'loup_sombre', count: 4 }, { type: 'laser', dur: 3.2, sweep: 4.2, dmg: 46, color: '#fff0c0', beams: 3 }, { type: 'shockwave', dmg: 28, speed: 360, count: 6 }] },
      ],
      drops: { onde: 20, matiere_noire: 3, noyau: 3, essence: 6 }, roles: [],
      global: { name: 'Houlette', desc: '+20 % de production et +1 lien de compagnon', stat: { prod: 0.2, links: 1 } },
      desc: 'Il garde des galaxies comme on garde des bêtes. Il les compte. Il en manque toujours une.' },

    /* ---------------- Toile ---------------- */
    { id: 'fileuse', name: 'Fileuse', tier: 0, scale: 'toile', biomes: TOILE,
      r: 9, hp: 55, speed: 90, temper: 'craintif', move: 'fly', attack: null, traits: ['glow'], group: [3, 5],
      art: { shape: 'insect', body: '#d8ecff', accent: '#ffffff', eye: '#1c2230', eyes: 2, legs: 8, glow: '#bfe2ff' },
      drops: { fil: 1, poussiere: 1 }, produces: { res: 'fil', rate: 0.6 }, roles: ['producteur', 'eclaireur'],
      desc: 'Elle répare les filaments. Personne ne lui a demandé.' },
    { id: 'perle_rosee', name: 'Perle de rosée', tier: 0, scale: 'toile', biomes: TOILE,
      r: 10, hp: 60, speed: 40, temper: 'passif', move: 'drift', attack: null, traits: ['glow'], group: [2, 4],
      art: { shape: 'orb', body: '#e8f4ff', accent: '#8ac0f0', eye: '#1c2230', eyes: 1, glow: '#bfe2ff' },
      drops: { ether: 1, fil: 0.3 }, produces: { res: 'ether', rate: 0.8 }, roles: ['soutien', 'producteur'],
      desc: 'Une goutte de lumière restée accrochée à la Toile.' },
    { id: 'arpenteur', name: 'Arpenteur', tier: 1, scale: 'toile', biomes: TOILE,
      r: 17, hp: 200, speed: 170, temper: 'agressif', move: 'slither', attack: { type: 'bite', dmg: 17, cd: 0.8 }, traits: ['glow'], group: [1, 2],
      art: { shape: 'serpent', body: '#3a4a70', accent: '#bfe2ff', eye: '#ffffff', eyes: 2, segs: 12, glow: '#bfe2ff' },
      drops: { fil: 1, ether: 1 }, roles: ['combat'],
      desc: 'Il ne quitte jamais un filament. Il y court plus vite que la lumière qui le porte.' },
    { id: 'mangeur_vide', name: 'Mangeur de vide', tier: 1, scale: 'toile', biomes: TOILE,
      r: 18, hp: 210, speed: 100, temper: 'agressif', move: 'fly', attack: { type: 'zap', dmg: 14, cd: 1.1, range: 60 }, traits: [], group: [2, 3],
      art: { shape: 'wraith', body: '#0a0a12', accent: '#7a7aa8', eye: '#ffffff', eyes: 2 },
      drops: { matiere_noire: 0.2, fil: 1 }, roles: ['combat'],
      desc: 'Il se nourrit du rien. Il grossit pourtant.' },
    { id: 'veilleuse_trame', name: 'Veilleuse de la trame', tier: 2, scale: 'toile', biomes: TOILE,
      r: 52, hp: 1500, speed: 60, temper: 'agressif', move: 'walk', traits: ['glow'],
      art: { shape: 'insect', body: '#2a3450', accent: '#bfe2ff', eye: '#ffffff', eyes: 4, legs: 8, spikes: 3, glow: '#bfe2ff' },
      phases: [
        { at: 1, speed: 60, patterns: [{ type: 'aimed', count: 6, spread: 0.7, speed: 360, dmg: 12, color: '#bfe2ff', bursts: 2 }, { type: 'summon', species: 'fileuse', count: 3 }] },
        { at: 0.6, speed: 70, patterns: [{ type: 'laser', dur: 2.8, sweep: 3, dmg: 38, color: '#bfe2ff', beams: 2 }, { type: 'charge', dmg: 26, speed: 560, windup: 0.7, count: 2 }] },
        { at: 0.3, speed: 80, patterns: [{ type: 'radial', n: 28, speed: 230, dmg: 12, color: '#ffffff' }, { type: 'laser', dur: 2.6, sweep: 4, dmg: 40, color: '#bfe2ff', beams: 3 }, { type: 'summon', species: 'arpenteur', count: 2 }] },
      ],
      drops: { fil: 10, ether: 4, essence: 1 }, produces: { res: 'fil', rate: 2 }, roles: ['capture'],
      power: { name: 'Fil tendu', desc: 'Capture 10 % plus rapide', stat: { capture: 0.1 } },
      desc: 'Elle veille sur un carrefour de la Toile, et sur ce qui s’y prend.' },
    { id: 'noeud_vivant', name: 'Nœud vivant', tier: 2, scale: 'toile', biomes: TOILE,
      r: 50, hp: 1450, speed: 45, temper: 'agressif', move: 'blink', traits: ['glow'],
      art: { shape: 'eye', body: '#3a3424', accent: '#ffe8a0', eye: '#1c2230', eyes: 1, glow: '#ffe8a0' },
      phases: [
        { at: 1, speed: 45, patterns: [{ type: 'blink' }, { type: 'radial', n: 18, speed: 210, dmg: 12, color: '#ffe8a0' }] },
        { at: 0.6, speed: 52, patterns: [{ type: 'pull', dur: 2.6, force: 300, dmg: 13 }, { type: 'blink' }, { type: 'spiral', arms: 4, dur: 2.6, speed: 200, dmg: 12, color: '#ffe8a0' }] },
        { at: 0.3, speed: 60, patterns: [{ type: 'blink' }, { type: 'radial', n: 30, speed: 230, dmg: 13, color: '#ffffff' }, { type: 'laser', dur: 2.6, sweep: 3.6, dmg: 40, color: '#ffe8a0', beams: 2 }] },
      ],
      drops: { fil: 8, plasma: 4, essence: 1 }, produces: { res: 'plasma', rate: 1.2 }, roles: ['eclaireur'],
      power: { name: 'Carrefour', desc: '+8 % de vitesse de déplacement', stat: { speed: 0.08 } },
      desc: 'Un point où se croisent cent filaments. Il regarde dans toutes les directions à la fois.' },
    { id: 'tisserand', name: 'Le Tisserand', tier: 9, scale: 'toile', biomes: TOILE,
      r: 175, hp: 7000, armor: 0.1, speed: 26, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'weaver', body: '#1a2236', accent: '#bfe2ff', eye: '#ffffff', eyes: 6, glow: '#bfe2ff' },
      phases: [
        { at: 1, speed: 26, patterns: [{ type: 'laser', dur: 3, sweep: 3.4, dmg: 40, color: '#bfe2ff', beams: 3 }, { type: 'summon', species: 'fileuse', count: 4 }] },
        { at: 0.75, speed: 30, patterns: [{ type: 'radial', n: 34, speed: 220, dmg: 13, color: '#bfe2ff' }, { type: 'pull', dur: 3, force: 340, dmg: 16 }, { type: 'summon', species: 'arpenteur', count: 2 }] },
        { at: 0.5, speed: 34, patterns: [{ type: 'laser', dur: 3.4, sweep: 5, dmg: 46, color: '#ffffff', beams: 4 }, { type: 'spiral', arms: 8, dur: 3, speed: 220, dmg: 13, color: '#bfe2ff' }] },
        { at: 0.25, speed: 40, patterns: [{ type: 'rain', count: 18, radius: 70, dmg: 24, windup: 1, color: '#bfe2ff' }, { type: 'laser', dur: 3.4, sweep: 5.4, dmg: 48, color: '#ffffff', beams: 5 }, { type: 'summon', species: 'mangeur_vide', count: 3 }] },
      ],
      drops: { fil: 24, matiere_noire: 3, noyau: 4, essence: 7 }, roles: [],
      global: { name: 'Trame', desc: 'Capture 20 % plus rapide et +15 % de vitesse', stat: { capture: 0.2, speed: 0.15 } },
      desc: 'Il a tendu la structure de l’univers. Il la retend chaque fois qu’elle cède. Il ne se souvient plus pour qui.' },

    /* ---------------- Pli ---------------- */
    { id: 'cocotte', name: 'Cocotte de papier', tier: 0, scale: 'pli', biomes: PLI,
      r: 10, hp: 55, speed: 95, temper: 'craintif', move: 'fly', attack: null, traits: [], group: [3, 5],
      art: { shape: 'paperbird', body: '#f7f6f2', accent: '#2346c8', eye: '#1c2230', eyes: 1 },
      drops: { encre: 1, blanc: 0.1 }, produces: { res: 'encre', rate: 0.8 }, roles: ['eclaireur', 'producteur'],
      desc: 'Pliée par quelqu’un, il y a longtemps. Elle cherche encore à qui elle était destinée.' },
    { id: 'tache', name: 'Tache d’encre', tier: 0, scale: 'pli', biomes: PLI,
      r: 11, hp: 65, speed: 45, temper: 'passif', move: 'walk', attack: null, traits: [], group: [2, 4],
      art: { shape: 'blob', body: '#1c2230', accent: '#2346c8', eye: '#ffffff', eyes: 2 },
      drops: { encre: 2 }, produces: { res: 'encre', rate: 1.2 }, roles: ['producteur'],
      desc: 'Une goutte tombée d’une plume. Elle s’étale quand elle a peur.' },
    { id: 'rature', name: 'Rature', tier: 1, scale: 'pli', biomes: PLI,
      r: 17, hp: 210, speed: 150, temper: 'agressif', move: 'slither', attack: { type: 'bite', dmg: 18, cd: 0.85 }, traits: [], group: [2, 3],
      art: { shape: 'serpent', body: '#1c2230', accent: '#c8322c', eye: '#ffffff', eyes: 2, segs: 14, spikes: 10 },
      drops: { encre: 2, blanc: 0.15 }, roles: ['combat'],
      desc: 'Un trait qui barre quelque chose. Il voudrait vous barrer aussi.' },
    { id: 'marque_page', name: 'Marque-page', tier: 1, scale: 'pli', biomes: PLI,
      r: 17, hp: 190, speed: 120, temper: 'territorial', move: 'fly', attack: { type: 'charge', dmg: 22, cd: 2, speed: 540, windup: 0.6, dist: 300 }, traits: [], group: [1, 2],
      art: { shape: 'ray', body: '#c8322c', accent: '#f7f6f2', eye: '#1c2230', eyes: 2 },
      drops: { fibre: 2, blanc: 0.15 }, roles: ['combat', 'eclaireur'],
      desc: 'Il garde la page où quelqu’un s’est arrêté de lire.' },
    { id: 'gardien_marge', name: 'Gardien de la marge', tier: 2, scale: 'pli', biomes: PLI,
      r: 52, hp: 1550, speed: 55, temper: 'agressif', move: 'walk', traits: [],
      art: { shape: 'golem', body: '#efeee8', accent: '#2346c8', eye: '#1c2230', eyes: 2 },
      phases: [
        { at: 1, speed: 55, patterns: [{ type: 'slam', dmg: 24, radius: 170, windup: 1.1 }, { type: 'aimed', count: 5, spread: 0.6, speed: 340, dmg: 12, color: '#1c2230', bursts: 2 }] },
        { at: 0.6, speed: 62, patterns: [{ type: 'shockwave', dmg: 20, speed: 260, count: 3 }, { type: 'summon', species: 'rature', count: 2 }, { type: 'slam', dmg: 26, radius: 190, windup: 1 }] },
        { at: 0.3, speed: 70, patterns: [{ type: 'radial', n: 26, speed: 220, dmg: 12, color: '#1c2230' }, { type: 'rain', count: 12, radius: 66, dmg: 20, windup: 1, color: '#2346c8' }, { type: 'slam', dmg: 28, radius: 210, windup: 0.9 }] },
      ],
      drops: { blanc: 2, encre: 8, essence: 1 }, produces: { res: 'encre', rate: 2.5 }, roles: ['combat'],
      power: { name: 'Bord de page', desc: '+20 PV maximum', stat: { hp: 20 } },
      desc: 'Il empêche que l’on écrive dans la marge. Quelqu’un l’a fait quand même.' },
    { id: 'oeil_blanc', name: 'L’Œil du blanc', tier: 2, scale: 'pli', biomes: PLI,
      r: 50, hp: 1450, speed: 40, temper: 'agressif', move: 'blink', traits: [],
      art: { shape: 'eye', body: '#f2f0ea', accent: '#2346c8', eye: '#1c2230', eyes: 1 },
      phases: [
        { at: 1, speed: 40, patterns: [{ type: 'blink' }, { type: 'laser', dur: 2.6, sweep: 2.6, dmg: 36, color: '#2346c8', beams: 1 }] },
        { at: 0.6, speed: 48, patterns: [{ type: 'blink' }, { type: 'radial', n: 22, speed: 210, dmg: 12, color: '#1c2230' }, { type: 'summon', species: 'cocotte', count: 4 }] },
        { at: 0.3, speed: 56, patterns: [{ type: 'laser', dur: 3, sweep: 4, dmg: 42, color: '#2346c8', beams: 3 }, { type: 'blink' }, { type: 'pull', dur: 2.6, force: 300, dmg: 14 }] },
      ],
      drops: { blanc: 2, encre: 6, essence: 1 }, produces: { res: 'blanc', rate: 0.1 }, roles: ['eclaireur'],
      power: { name: 'Regard blanc', desc: 'Fiabilité du scanner +10 %', stat: { scan: 0.1 } },
      desc: 'Il vous regarde comme vous regardiez les mondes, depuis l’Artefact.' },
    { id: 'relieur', name: 'Le Relieur', tier: 10, scale: 'pli', biomes: PLI,
      r: 160, hp: 7600, armor: 0.1, speed: 30, temper: 'agressif', move: 'drift', traits: [],
      art: { shape: 'binder', body: '#f2f0ea', accent: '#2346c8', eye: '#1c2230', eyes: 1 },
      phases: [
        { at: 1, speed: 30, patterns: [{ type: 'blink' }, { type: 'aimed', count: 9, spread: 1.1, speed: 330, dmg: 13, color: '#1c2230', bursts: 3 }, { type: 'summon', species: 'rature', count: 2 }] },
        { at: 0.75, speed: 34, patterns: [{ type: 'laser', dur: 3.2, sweep: 4, dmg: 44, color: '#2346c8', beams: 3 }, { type: 'pull', dur: 3, force: 340, dmg: 16 }, { type: 'blink' }] },
        { at: 0.5, speed: 38, patterns: [{ type: 'shockwave', dmg: 26, speed: 320, count: 5 }, { type: 'summon', species: 'marque_page', count: 3 }, { type: 'radial', n: 36, speed: 220, dmg: 13, color: '#1c2230' }] },
        { at: 0.25, speed: 44, patterns: [{ type: 'blink' }, { type: 'rain', count: 20, radius: 70, dmg: 24, windup: 1, color: '#2346c8' }, { type: 'laser', dur: 3.4, sweep: 5.6, dmg: 48, color: '#1c2230', beams: 5 }] },
      ],
      drops: { blanc: 8, encre: 20, noyau: 4, essence: 8 }, roles: [],
      global: { name: 'Reliure', desc: '+30 PV, +20 % de production et carte toujours révélée', stat: { hp: 30, prod: 0.2, reveal: 1 } },
      desc: 'Il assemble les feuillets. Il a les mêmes gestes que vous quand vous rangez l’Archive.' },
  ];
  C.forEach((c) => {
    c.index = D.CREATURES.length;
    c.armor = c.armor || 0;
    c.traits = c.traits || [];
    c.roles = c.roles || [];
    c.resist = c.resist || 1;
    c.rarity = c.rarity != null ? c.rarity : c.tier >= 2 ? 2 : c.tier;
    c.group = c.group || [1, 1];
    D.CREATURES.push(c);
    D.CREATURE[c.id] = c;
  });

  /* ---- traits ---- */
  const M = (speed, fly) => ({ speed, fly: !!fly });
  Object.assign(D.EXTRA_TRAITS, {
    galaxion: { ability: 'vision', keys: ['lumiere', 'vol'] },
    agnelet: { ability: 'soin', keys: ['lumiere'], diet: { res: 'poussiere', period: 20, n: 1 } },
    loup_sombre: { ability: 'rage', keys: ['fouisseur', 'acide'], mount: M(320), diet: { res: 'onde', period: 18, n: 1 } },
    ricocheur: { ability: 'ruee', keys: ['vol', 'feu'], diet: { res: 'plasma', period: 18, n: 1 } },
    chien_amas: { ability: 'cri', keys: ['fouisseur', 'resonance'], mount: M(300), diet: { res: 'onde', period: 12, n: 2 } },
    onde_vivante: { ability: 'vague', keys: ['resonance', 'vol'], diet: { res: 'onde', period: 12, n: 2 } },
    fileuse: { ability: 'toile', keys: ['vol', 'lumiere'] },
    perle_rosee: { ability: 'soin', keys: ['nage', 'lumiere'] },
    arpenteur: { ability: 'ruee', keys: ['conduction'], mount: M(360), diet: { res: 'fil', period: 18, n: 1 } },
    mangeur_vide: { ability: 'entrave', keys: ['vol', 'acide'], diet: { res: 'matiere_noire', period: 30, n: 1 } },
    veilleuse_trame: { ability: 'toile', keys: ['conduction', 'resonance', 'vol'], mount: M(260), diet: { res: 'fil', period: 12, n: 2 } },
    noeud_vivant: { ability: 'rayon', keys: ['lumiere', 'resonance'], diet: { res: 'plasma', period: 12, n: 2 } },
    cocotte: { ability: 'vision', keys: ['vol'] },
    tache: { ability: 'nuage', keys: ['acide', 'nage'] },
    rature: { ability: 'acide', keys: ['acide', 'fouisseur'], mount: M(330), diet: { res: 'encre', period: 18, n: 1 } },
    marque_page: { ability: 'saut', keys: ['vol'], mount: M(340, true), diet: { res: 'fibre', period: 18, n: 2 } },
    gardien_marge: { ability: 'bouclier', keys: ['fouisseur', 'resonance'], mount: M(220), diet: { res: 'encre', period: 12, n: 3 } },
    oeil_blanc: { ability: 'rayon', keys: ['lumiere', 'resonance'], diet: { res: 'encre', period: 12, n: 2 } },
    berger_amas: { call: 'rassemblement' },
    tisserand: { call: 'trame' },
    relieur: { call: 'repli' },
  });

  Object.assign(D.CALLS, {
    rassemblement: { name: 'Rassemblement', desc: 'Toutes les créatures hostiles visibles sont ramenées au curseur, étourdies, puis frappées par une onde.', color: '#c8b8ff' },
    trame: { name: 'Trame', desc: 'Un fil relie chaque créature hostile visible : toutes sont blessées et ralenties.', color: '#bfe2ff' },
    repli: { name: 'Repli', desc: 'La page se replie : les créatures hostiles visibles sont rejetées et blessées, la troupe se soigne.', color: '#2346c8' },
  });

  /** Un écho de soi-même, croisé dans le Pli (créature factice, voir game/beyond.js). */
  D.ECHO_DEF = {
    id: 'echo', name: 'Écho', tier: 1, r: 12, hp: 160, speed: 95, temper: 'passif', move: 'walk', attack: null,
    traits: [], group: [1, 1], roles: [], biomes: [], resist: 1, armor: 0, rarity: 0, index: 9998, fake: true, echo: true,
    art: { shape: 'echo', body: '#ffffff', accent: '#2346c8', eye: '#1c2230', eyes: 0 }, drops: { blanc: 0.5, encre: 2 },
  };
  D.ECHO_HOSTILE = Object.assign({}, D.ECHO_DEF, { temper: 'agressif', hp: 220, speed: 120, attack: { type: 'shoot', dmg: 12, cd: 1.2, speed: 480, count: 1, spread: 0, size: 5, color: '#2346c8', range: 420 }, drops: { blanc: 1, encre: 3, essence: 0.3 } });

  /** Ce qu'un écho vous dit, selon ce que dit le journal de cette expédition. */
  D.ECHO_LINES = {
    extrait: ['Vous, sur {code}. Vous en revenez.', 'Vous, sur {code}, {region}. Le monde s’est éteint derrière vous.', 'Vous, qui portez quelque chose de {code}. Vous ne vous retournez pas.'],
    urgence: ['Vous, qui fuyez {code}. Vous avez presque tout laissé.', 'Vous, sur {code}. Vous maintenez la touche, et vous partez.'],
    echec: ['Vous, à terre sur {code}. Vous ne vous relevez pas.', 'Vous, sur {code}. Vous tombez encore.'],
    retour: ['Vous, sur {code}. Vous y revenez toujours.'],
  };

  /** Lieux ancrés (1.10) : en minutes, ce qu'il faut pour que tout repousse, que les créatures et les gardiens reviennent. */
  D.PLACES = { regrow: 30, respawn: 20, guardian: 60 };

  /* =================== Astres =================== */
  Object.assign(D.ASTRES, {
    pont_sombre: { kind: 'galaxie', name: 'Galaxie errante', layer: 'amas', stat: { speed: 0.06 }, desc: '+6 % de vitesse de déplacement.' },
    galaxie_naine: { kind: 'galaxie', name: 'Galaxie naine', layer: 'amas', stat: { prod: 0.15 }, desc: '+15 % de production.' },
    front_collision: { kind: 'collision', name: 'Galaxies en collision', layer: 'amas', stat: { meleeDmg: 0.12 }, desc: '+12 % de dégâts au corps à corps.' },
    filament_lumiere: { kind: 'filament', name: 'Filament', layer: 'toile', stat: { speed: 0.05, prod: 0.05 }, desc: '+5 % de vitesse et de production.' },
    bord_vide: { kind: 'vide', name: 'Morceau du Grand Vide', layer: 'toile', stat: { armor: 0.05 }, desc: '−5 % de dégâts reçus.' },
    noeud_toile: { kind: 'noeud', name: 'Nœud de la Toile', layer: 'toile', stat: { capture: 0.1 }, desc: 'Capture 10 % plus rapide.' },
  });

  /* =================== Rangs de l'Archive =================== */
  // « Inconnue » reste le dernier rang : il passe après l'Amas et la Toile, et ouvre le Pli.
  const unknown = D.RANKS.findIndex((r) => r.mystery);
  if (unknown >= 0) D.RANKS.splice(unknown, 1);
  D.RANKS.push(
    { name: 'Amas', need: { galactiques: 1 }, zoom: 4e-7, threat: 7, desc: 'Votre galaxie n’est pas seule. D’autres se pressent autour, reliées par ce qu’on ne voit pas.' },
    { name: 'Toile', need: { amas: 1, astres: 8 }, zoom: 3e-8, threat: 7, desc: 'Les amas pendent à des fils de lumière. L’Archive est un nœud parmi d’autres.' },
    { name: 'Inconnue', need: { toiles: 1 }, zoom: 2e-9, threat: 7, mystery: true, desc: 'Quelque chose contient l’Archive. Cela a une forme que vous connaissez.' },
  );

  /* =================== Échelles du dézoom =================== */
  const lastScale = D.SCALES.findIndex((s) => s.name === 'Échelle inconnue');
  if (lastScale >= 0) D.SCALES.splice(lastScale, 1);
  D.SCALES.push(
    { name: 'Échelle de l’amas', zoom: 1.5e-6, rank: 9 },
    { name: 'Échelle de la Toile', zoom: 1.2e-7, rank: 10 },
    { name: 'Échelle inconnue', zoom: 1e-8, rank: 11 },
  );

  /* =================== Ancrage =================== */
  D.UPGRADES.ancrage.levels.push(
    { v: { tier: 8, astres: 3 }, cost: { onde: 8, matiere_noire: 3, noyau: 3 }, rank: 9 },
    { v: { tier: 9, astres: 4 }, cost: { fil: 10, onde: 8, noyau: 4 }, rank: 10 },
    { v: { tier: 10, astres: 4 }, cost: { fil: 14, essence: 8, noyau: 5 }, rank: 11 },
  );

  /* =================== Équipement =================== */
  Object.assign(D.GEAR, {
    houlette: { slot: 'melee', name: 'Houlette d’amas', dmg: 84, arc: 2.8, range: 96, cd: 0.6, knock: 520,
      cost: { onde: 10, matiere_noire: 2, ferrite: 12 }, desc: 'Elle ramène ce qu’elle frappe dans le droit chemin, ou ailleurs.' },
    navette_fil: { slot: 'ranged', name: 'Navette de fil', dmg: 30, rate: 4, speed: 900, spread: 0.02, count: 1, size: 4, range: 680, pierce: 4, color: '#bfe2ff',
      cost: { fil: 12, plasma: 4, cristal: 6 }, desc: 'Elle traverse ce qu’elle touche, et repart.' },
    manteau_blanc: { slot: 'armor', name: 'Manteau blanc', armor: 0.45, hazardRes: 0.5, thrust: 1,
      cost: { blanc: 2, encre: 10, fil: 8 }, desc: '−45 % de dégâts, −50 % des terrains dangereux. Dans le Pli, il ne se distingue pas du sol.' },
  });

  /* =================== Récit =================== */
  D.LORE.push(
    { id: 'l25', title: 'Compte du berger', text: 'Quatre cent douze. Quatre cent onze. Il en manque une. Il en manquera toujours une.' },
    { id: 'l26', title: 'Nœud défait', text: 'On a tiré sur un fil. Toute une région de l’univers a glissé de quelques années-lumière vers l’Archive.' },
    { id: 'l27', title: 'Note dans la marge', text: 'Quelqu’un a annoté cet univers. L’écriture penche du même côté que la vôtre.' },
  );
})();
