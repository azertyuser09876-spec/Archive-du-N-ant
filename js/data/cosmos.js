/* Échelles supérieures : données pures.
   Échelons d'expédition (monde, orbite, système, galaxie), biomes de l'espace,
   ressources, créatures des échelles cosmiques, astres, rangs de l'Archive,
   équipement et améliorations. Chargé après les autres données : il les complète
   sans modifier les entrées existantes. */
(function () {
  'use strict';
  const D = window.AN.Data;

  /* =================== Échelons d'expédition =================== */
  // move  : walk (marche), drift (inertie), gravity (inertie + puits de gravité), leap (sauts au-dessus du vide)
  // event : menace propre à l'échelon (voir game/cosmic.js)
  // form  : forme de capture du boss de l'échelon
  D.ECHELONS = {
    region: { id: 'region', name: 'Région', plural: 'Régions', rank: 0, move: 'walk', event: null, zoom: 1, boss: 3, unit: 'Zone', heart: 'Cœur de la région' },
    monde: {
      id: 'monde', name: 'Monde', plural: 'Mondes', rank: 5, zones: [3, 4], tiles: [74, 82], move: 'walk', event: 'seisme', zoom: 0.92, boss: 4,
      unit: 'Continent', heart: 'Cratère du Souverain', form: 'ancrage', words: ['Planète', 'Monde', 'Sphère', 'Globe'],
      desc: 'Une planète entière. Chaque continent a son gardien ; au centre, un Souverain retient le monde.',
      threatDesc: 'Séismes', moveDesc: 'Marche, sur des continents plus vastes',
    },
    orbite: {
      id: 'orbite', name: 'Orbite', plural: 'Orbites', rank: 6, zones: [2, 3], tiles: [66, 72], move: 'drift', event: 'meteores', zoom: 0.84, boss: 5,
      unit: 'Orbite', heart: 'Orbite du Cataclysme', form: 'scellement', astre: true, words: ['Orbite', 'Ceinture', 'Satellites', 'Anneaux'],
      desc: 'L’espace autour d’un monde : lunes, anneaux, épaves. Rien ne vous retient, rien ne vous arrête.',
      threatDesc: 'Pluies de météores', moveDesc: 'Apesanteur : vous dérivez sur votre élan',
    },
    systeme: {
      id: 'systeme', name: 'Système', plural: 'Systèmes', rank: 7, zones: [3, 3], tiles: [68, 74], move: 'gravity', event: 'eruption', zoom: 0.76, boss: 6,
      unit: 'Planète', heart: 'Foyer de l’étoile', form: 'encerclement', astre: true, words: ['Système', 'Constellation', 'Couronne', 'Famille'],
      desc: 'Une étoile et ses planètes. Leur gravité vous attire, et l’étoile se réveille par éruptions.',
      threatDesc: 'Éruptions solaires', moveDesc: 'Apesanteur et puits de gravité',
    },
    galaxie: {
      id: 'galaxie', name: 'Galaxie', plural: 'Galaxies', rank: 8, zones: [3, 3], tiles: [70, 76], move: 'leap', event: 'devoreurs', zoom: 0.7, boss: 7,
      unit: 'Bras', heart: 'Noyau galactique', form: 'synchronisation', astre: true, words: ['Galaxie', 'Spirale', 'Amas', 'Voie'],
      desc: 'Des îles de lumière séparées par le vide. On le franchit d’un bond, ou on y tombe.',
      threatDesc: 'Dévoreurs du vide', moveDesc: 'Sauts au-dessus du vide (maintenir Espace)',
    },
  };
  D.ECHELON_ORDER = ['region', 'monde', 'orbite', 'systeme', 'galaxie'];

  /** Formes de capture des êtres trop grands pour le seul rayon. */
  D.CAPTURE_FORMS = {
    ancrage: { name: 'Ancrage', desc: 'Plantez les trois ancres de l’Artefact autour du Souverain épuisé (E), puis capturez-le.' },
    scellement: { name: 'Scellement', desc: 'Brisez les trois noyaux qui gravitent autour du Cataclysme épuisé, puis capturez-le.' },
    encerclement: { name: 'Encerclement', desc: 'Faites le tour complet de l’Entité épuisée en restant dans l’anneau, puis capturez-la.' },
    synchronisation: { name: 'Synchronisation', desc: 'Le rayon ne progresse qu’au rythme des pulsations de l’Organisme. Hors du rythme, il recule.' },
  };

  /* =================== Rangs supérieurs de créatures =================== */
  D.TIERS.push(
    { id: 4, name: 'Souverain du monde', weight: 0, anchor: 1 },
    { id: 5, name: 'Cataclysme planétaire', weight: 0, anchor: 2 },
    { id: 6, name: 'Entité stellaire', weight: 0, anchor: 3 },
    { id: 7, name: 'Organisme galactique', weight: 0, anchor: 4 },
  );
  // Ce qui reste au-delà : jamais rencontré, seulement pressenti.
  D.HIGHER_TIERS = ['Entité dimensionnelle', 'Structure inconnue'];

  /* =================== Tailles des destinations =================== */
  D.SIZES.push(
    { id: 'planetaire', name: 'Planétaire', zones: 4 },
    { id: 'orbitale', name: 'Orbitale', zones: 3 },
    { id: 'stellaire', name: 'Stellaire', zones: 3 },
    { id: 'galactique', name: 'Galactique', zones: 3 },
  );
  D.SIZE_OF = { monde: 'planetaire', orbite: 'orbitale', systeme: 'stellaire', galaxie: 'galactique' };

  /* =================== Ressources =================== */
  Object.assign(D.RESOURCES, {
    magma: { name: 'Magma primordial', rarity: 1, color: '#ff5a1f', icon: 'flame' },
    regolithe: { name: 'Régolithe', rarity: 0, color: '#a9a49a', icon: 'rock' },
    ether: { name: 'Éther', rarity: 1, color: '#7fd8f0', icon: 'orb' },
    ferrite: { name: 'Fer météorique', rarity: 0, color: '#7a6f6a', icon: 'ingot' },
    plasma: { name: 'Plasma solaire', rarity: 1, color: '#f2b21e', icon: 'spark' },
    poussiere: { name: 'Poussière d’étoiles', rarity: 0, color: '#b8acf0', icon: 'dots' },
    matiere_noire: { name: 'Matière sombre', rarity: 2, color: '#3a2a60', icon: 'void' },
  });

  /* =================== Biomes des échelles supérieures =================== */
  const NEW_BIOMES = [
    {
      id: 'cratere_souverain', name: 'Cratère du Souverain', region: 'du Souverain', tags: ['volcanique', 'mineral', 'chaud'], scale: 'monde',
      climate: 'Écrasant, la roche respire', desc: 'Le centre du monde, creusé par ce qui y dort.',
      ground: ['#2b2220', '#352a26', '#40322c'], detail: '#5a463c',
      wall: { base: '#1a1412', top: '#6a4a3a', shape: 'shard', orn: 'glow' },
      accent: '#ff7a3a', open: 0.62, dark: 0.3, weather: 'embers',
      hazard: { name: 'Magma primordial', color: '#ff5a1f', dps: 12, slow: 0.3 }, hazardAmt: 0.07,
      decor: [['ember', '#ff7a3a'], ['pebble', '#5a463c'], ['shardbit', '#8a6a58']],
      resources: { magma: 3, obsidienne: 2, minerai: 3, braise: 2 },
    },
    /* ---- orbite ---- */
    {
      id: 'ceinture_asteroides', name: 'Ceinture d’astéroïdes', region: 'des Astéroïdes', tags: ['mineral', 'vide', 'metal'], scale: 'orbite',
      climate: 'Vide, silence absolu', desc: 'Des rochers à la dérive, et rien pour les retenir.',
      ground: ['#151826', '#191d2e', '#1e2336'], detail: '#2c3350',
      wall: { base: '#2a2a30', top: '#7a7680', shape: 'blob', orn: 'cracks' },
      accent: '#c8c4d8', open: 0.6, dark: 0.45, weather: 'motes',
      hazard: { name: 'Débris en rotation', color: '#4a4658', dps: 8, slow: 0.2 }, hazardAmt: 0.04,
      decor: [['glowdot', '#ffffff'], ['dot', '#9aa0c8'], ['rubble', '#4a4658']],
      resources: { regolithe: 4, minerai: 3, ferraille: 1, ether: 0.4 },
    },
    {
      id: 'anneau_glace', name: 'Anneau de glace', region: 'des Anneaux', tags: ['froid', 'vide', 'mineral'], scale: 'orbite',
      climate: 'Glacial, scintillant', desc: 'Des milliards d’éclats de glace qui tournent autour d’un monde mort.',
      ground: ['#1a2236', '#1f2840', '#25304a'], detail: '#3c5070',
      wall: { base: '#5a7090', top: '#e2f2ff', shape: 'shard', orn: 'gloss' },
      accent: '#bfeaff', open: 0.58, dark: 0.35, weather: 'glint',
      hazard: { name: 'Glace coupante', color: '#9cc8e8', dps: 6, slow: 0.35 }, hazardAmt: 0.06,
      decor: [['glowdot', '#ffffff'], ['flakebit', '#bfeaff'], ['crystalbit', '#9cc8e8']],
      resources: { givre: 4, ether: 1, regolithe: 2, cristal: 0.6 },
    },
    {
      id: 'mer_regolithe', name: 'Mer de régolithe', region: 'de la Lune grise', tags: ['sec', 'mineral', 'vide', 'lune'], scale: 'orbite',
      climate: 'Sans air, poussière fine', desc: 'Une lune couverte d’une poussière qui ne retombe jamais tout à fait.',
      ground: ['#8a8680', '#958f88', '#a09a92'], detail: '#6e6a64',
      wall: { base: '#5e5a56', top: '#c8c2b8', shape: 'blob', orn: 'rings' },
      accent: '#e8e2d6', open: 0.66, dark: 0.15, weather: 'dust',
      hazard: { name: 'Poussière lunaire', color: '#6e6a64', dps: 0, slow: 0.5 }, hazardAmt: 0.08,
      decor: [['pebble', '#6e6a64'], ['dot', '#c8c2b8'], ['ashbit', '#7a756e']],
      resources: { regolithe: 5, verre: 2, minerai: 1, ether: 0.5 },
    },
    {
      id: 'epave_orbitale', name: 'Épave orbitale', region: 'de l’Épave', tags: ['artificiel', 'metal', 'vide'], scale: 'orbite',
      climate: 'Pressurisé par endroits', desc: 'Une station construite par quelqu’un. Il n’y a plus personne.',
      ground: ['#2a2e36', '#30353e', '#383e48'], detail: '#4a5260',
      wall: { base: '#20242c', top: '#8a94a4', shape: 'block', orn: 'rivets' },
      accent: '#4fd8f0', open: 0.5, dark: 0.3, weather: 'sparks', ruins: 0.7,
      hazard: { name: 'Câbles dénudés', color: '#3aa6bd', dps: 9, slow: 0.1 }, hazardAmt: 0.03,
      decor: [['bolt', '#8a94a4'], ['plate', '#4a5260'], ['glitch', '#4fd8f0']],
      resources: { ferraille: 4, rouage: 1, etincelle: 2, ether: 0.6 },
    },
    /* ---- système ---- */
    {
      id: 'couronne_solaire', name: 'Couronne solaire', region: 'de la Couronne', tags: ['chaud', 'lumiere', 'plasma'], scale: 'systeme',
      climate: 'Aveuglant', desc: 'La surface agitée d’une étoile. On y marche sur des filaments de plasma figé.',
      ground: ['#4a2a10', '#5a3414', '#6a3e18'], detail: '#8a5420',
      wall: { base: '#2a1606', top: '#ffb02e', shape: 'blob', orn: 'glow' },
      accent: '#ffd23a', open: 0.58, dark: 0, weather: 'embers',
      hazard: { name: 'Plasma', color: '#ffb02e', dps: 14, slow: 0.2 }, hazardAmt: 0.08,
      decor: [['ember', '#ffd23a'], ['glowdot', '#fff0b0']],
      resources: { plasma: 3, braise: 3, etincelle: 2 },
    },
    {
      id: 'geante_gazeuse', name: 'Géante gazeuse', region: 'des Bandes', tags: ['gaz', 'aerien', 'vent'], scale: 'systeme',
      climate: 'Tempêtes éternelles', desc: 'On marche sur des nuages assez denses pour porter une montagne.',
      ground: ['#a07850', '#b08a5e', '#c09c6c'], detail: '#7a5a3c',
      wall: { base: '#6a4a30', top: '#e8d0a8', shape: 'blob', orn: 'bubbles' },
      accent: '#f0e0c0', open: 0.64, dark: 0.05, weather: 'dust',
      hazard: { name: 'Vortex', color: '#7a5a3c', dps: 4, slow: 0.45 }, hazardAmt: 0.07,
      decor: [['ashbit', '#e8d0a8'], ['bubble', '#f0e0c0']],
      resources: { ether: 1.5, seve: 1, pollen: 1, plasma: 0.6, perle: 0.5 },
    },
    {
      id: 'queue_comete', name: 'Queue de comète', region: 'de la Comète', tags: ['froid', 'vide', 'lumiere'], scale: 'systeme',
      climate: 'Glacial, en mouvement', desc: 'Une traînée de glace et de poussière qui file vers l’étoile.',
      ground: ['#1c2a3a', '#223244', '#283a4e'], detail: '#3a5068',
      wall: { base: '#3a5068', top: '#d8f2ff', shape: 'shard', orn: 'glow' },
      accent: '#9fe8ff', open: 0.6, dark: 0.3, weather: 'snow',
      hazard: { name: 'Jet de gaz', color: '#9fe8ff', dps: 7, slow: 0.25 }, hazardAmt: 0.05,
      decor: [['glowdot', '#ffffff'], ['flakebit', '#d8f2ff']],
      resources: { givre: 3, ether: 1, poussiere: 1, cristal: 0.5 },
    },
    {
      id: 'ceinture_fer', name: 'Ceinture de fer', region: 'du Fer', tags: ['metal', 'mineral', 'vide'], scale: 'systeme',
      climate: 'Magnétique', desc: 'Des noyaux de planètes éventrées, alignés par un champ que rien n’explique.',
      ground: ['#2e2a2a', '#363030', '#3e3838'], detail: '#5a5050',
      wall: { base: '#3a2a26', top: '#a07a6a', shape: 'hex', orn: 'veins' },
      accent: '#ff8a5a', open: 0.52, dark: 0.25, weather: 'sparks',
      hazard: { name: 'Champ magnétique', color: '#7a5a6a', dps: 6, slow: 0.4 }, hazardAmt: 0.05,
      decor: [['rubble', '#5a5050'], ['bolt', '#a07a6a']],
      resources: { ferrite: 5, minerai: 2, rouage: 0.6 },
    },
    /* ---- galaxie ---- */
    {
      id: 'nebuleuse', name: 'Nébuleuse', region: 'de la Nébuleuse', tags: ['gaz', 'lumiere', 'vie'], scale: 'galaxie',
      climate: 'Lumineux, presque tiède', desc: 'Un nuage où naissent les étoiles. Il y fait presque doux.',
      ground: ['#3a2450', '#442a5c', '#4e3068'], detail: '#6a4a8a',
      wall: { base: '#1a0e2a', top: '#d08ae8', shape: 'blob', orn: 'glow' },
      accent: '#ff9ae8', open: 0.6, dark: 0.2, weather: 'motes',
      hazard: { name: 'Gaz ionisé', color: '#b06ad0', dps: 6, slow: 0.2 }, hazardAmt: 0.05,
      decor: [['glowdot', '#ffd8f8'], ['dot', '#ff9ae8']],
      resources: { poussiere: 4, ether: 1, spore: 1, seve: 1 },
    },
    {
      id: 'bras_etoiles', name: 'Bras d’étoiles', region: 'du Bras', tags: ['lumiere', 'vide', 'chaud'], scale: 'galaxie',
      climate: 'Brûlant de lumière', desc: 'Des étoiles si serrées qu’on marche sur leur lumière.',
      ground: ['#2a2840', '#30304c', '#383858'], detail: '#4a4a70',
      wall: { base: '#14142a', top: '#fff0c0', shape: 'shard', orn: 'glow' },
      accent: '#fff0c0', open: 0.6, dark: 0.15, weather: 'glint',
      hazard: { name: 'Vent stellaire', color: '#f0d890', dps: 9, slow: 0.15 }, hazardAmt: 0.04,
      decor: [['glowdot', '#fff0c0'], ['glowdot', '#ffffff'], ['dot', '#9a9ac8']],
      resources: { poussiere: 3, plasma: 2, cristal: 0.5 },
    },
    {
      id: 'halo_sombre', name: 'Halo sombre', region: 'du Halo', tags: ['sombre', 'vide', 'froid'], scale: 'galaxie',
      climate: 'Aucun', desc: 'La marge de la galaxie, là où la lumière renonce.',
      ground: ['#121220', '#161626', '#1a1a2e'], detail: '#2a2a44',
      wall: { base: '#08080e', top: '#4a4a7a', shape: 'shard', orn: 'glow' },
      accent: '#8a8aff', open: 0.56, dark: 0.6, weather: 'motes',
      hazard: { name: 'Ombre froide', color: '#2a2a50', dps: 8, slow: 0.3 }, hazardAmt: 0.05,
      decor: [['dot', '#4a4a7a'], ['glowdot', '#8a8aff']],
      resources: { poussiere: 2, obsidienne: 1, neant: 0.5, matiere_noire: 0.35 },
    },
    {
      id: 'coeur_galactique', name: 'Cœur galactique', region: 'du Noyau', tags: ['lumiere', 'chaud', 'gaz'], scale: 'galaxie',
      climate: 'Insoutenable', desc: 'Là où tout tourne. Au centre, quelque chose ne laisse rien repartir.',
      ground: ['#5a4630', '#6a5238', '#7a5e40'], detail: '#9a7a50',
      wall: { base: '#2a1e10', top: '#ffe0a0', shape: 'blob', orn: 'glow' },
      accent: '#ffe8b0', open: 0.6, dark: 0.05, weather: 'embers',
      hazard: { name: 'Disque brûlant', color: '#ffc870', dps: 13, slow: 0.2 }, hazardAmt: 0.06,
      decor: [['ember', '#ffe0a0'], ['glowdot', '#ffffff']],
      resources: { plasma: 2, poussiere: 2, matiere_noire: 0.3, essence: 0.2 },
    },
  ];
  NEW_BIOMES.forEach((b) => { b.index = D.BIOMES.length; D.BIOMES.push(b); D.BIOME[b.id] = b; });

  D.SYNERGIES.push(
    { a: 'plasma', b: 'metal', name: 'Fonderie stellaire', mult: 0.4, desc: 'Le plasma fond le métal : +40 % de production.' },
    { a: 'lune', b: 'eau', name: 'Marées', mult: 0.35, desc: 'Une lune soulève les eaux voisines : +35 % de production.' },
    { a: 'gaz', b: 'vie', name: 'Pluies d’éther', mult: 0.3, desc: 'Les nuages nourrissent le vivant : +30 % de production.' },
    { a: 'plasma', b: 'froid', name: 'Sublimation', mult: -0.3, desc: 'La glace s’évapore au contact de l’étoile : −30 % de production.' },
  );

  /* =================== Créatures des échelles supérieures =================== */
  const C = [
    /* ---------------- Souverains du monde ---------------- */
    { id: 'atlas', name: 'Atlas, porteur de continents', tier: 4, scale: 'monde', biomes: ['cratere_souverain'],
      r: 130, hp: 3600, armor: 0.15, speed: 30, temper: 'agressif', move: 'walk', traits: ['glow'],
      art: { shape: 'golem', body: '#5a4a3a', accent: '#ff7a3a', eye: '#ffd25a', eyes: 2, glow: '#ff7a3a', continents: true },
      phases: [
        { at: 1, speed: 30, patterns: [{ type: 'slam', dmg: 30, radius: 250, windup: 1.3 }, { type: 'rain', count: 8, radius: 70, dmg: 20, windup: 1.2, color: '#ff7a3a' }, { type: 'summon', species: 'salamandre', count: 2 }] },
        { at: 0.75, speed: 34, patterns: [{ type: 'shockwave', dmg: 22, speed: 260, count: 3 }, { type: 'aimed', count: 7, spread: 0.8, speed: 300, dmg: 13, color: '#ffb02e', bursts: 3 }, { type: 'slam', dmg: 32, radius: 270, windup: 1.2 }] },
        { at: 0.5, speed: 38, patterns: [{ type: 'pull', dur: 2.6, force: 280, dmg: 14 }, { type: 'rain', count: 14, radius: 72, dmg: 22, windup: 1.1, color: '#ff7a3a' }, { type: 'slam', dmg: 34, radius: 300, windup: 1.1 }] },
        { at: 0.25, speed: 44, patterns: [{ type: 'radial', n: 30, speed: 210, dmg: 13, size: 8, color: '#ffb02e' }, { type: 'shockwave', dmg: 24, speed: 300, count: 4 }, { type: 'rain', count: 16, radius: 72, dmg: 22, windup: 1, color: '#ff7a3a' }] },
      ],
      drops: { magma: 12, noyau: 2, essence: 3 }, roles: [],
      global: { name: 'Épaules du monde', desc: '+30 PV maximum et +10 % de production', stat: { hp: 30, prod: 0.1 } },
      desc: 'Il porte des continents sur son dos. Quand il se lève, le monde change de forme.' },
    { id: 'leviathan_tellurique', name: 'Léviathan tellurique', tier: 4, scale: 'monde', biomes: ['cratere_souverain'],
      r: 120, hp: 3500, speed: 70, temper: 'agressif', move: 'slither', traits: ['glow'],
      art: { shape: 'serpent', body: '#3a2a26', accent: '#ff5a1f', eye: '#ffd25a', eyes: 2, segs: 18, spikes: 14, glow: '#ff5a1f' },
      phases: [
        { at: 1, speed: 70, patterns: [{ type: 'burrow', dmg: 30, radius: 150, windup: 1.3, emergeRing: 18 }, { type: 'pools', count: 5, radius: 60, dps: 16, color: '#ff5a1f' }] },
        { at: 0.75, speed: 82, patterns: [{ type: 'charge', dmg: 30, speed: 560, windup: 0.9 }, { type: 'radial', n: 24, speed: 220, dmg: 12, color: '#ffb02e' }, { type: 'burrow', dmg: 30, radius: 150, windup: 1.2, emergeRing: 20 }] },
        { at: 0.5, speed: 92, patterns: [{ type: 'laser', dur: 3, sweep: 3, dmg: 40, color: '#ff5a1f', beams: 2 }, { type: 'pools', count: 7, radius: 64, dps: 18, color: '#ff5a1f' }, { type: 'burrow', dmg: 32, radius: 160, windup: 1.1, emergeRing: 24 }] },
        { at: 0.25, speed: 105, patterns: [{ type: 'spiral', arms: 6, dur: 2.8, speed: 230, dmg: 12, color: '#ffb02e' }, { type: 'charge', dmg: 32, speed: 600, windup: 0.7 }, { type: 'rain', count: 14, radius: 66, dmg: 20, windup: 1, color: '#ff5a1f' }] },
      ],
      drops: { magma: 14, obsidienne: 8, noyau: 2, essence: 3 }, roles: [],
      global: { name: 'Fleuves de magma', desc: '−20 % sur les coûts de l’Atelier', stat: { craftCost: 0.2 } },
      desc: 'Il nage dans le manteau du monde. Les volcans sont ses respirations.' },
    { id: 'tortue_monde', name: 'Tortue-Monde', tier: 4, scale: 'monde', biomes: ['cratere_souverain'],
      r: 140, hp: 4000, armor: 0.25, speed: 22, temper: 'agressif', move: 'walk', traits: [],
      art: { shape: 'turtle', body: '#5f6a4a', accent: '#d8cdb5', eye: '#1c2230', eyes: 2, city: true },
      phases: [
        { at: 1, speed: 22, patterns: [{ type: 'summon', species: 'sentinelle', count: 2 }, { type: 'radial', n: 16, speed: 140, dmg: 14, size: 11, color: '#d8cdb5' }] },
        { at: 0.75, speed: 26, patterns: [{ type: 'shockwave', dmg: 22, speed: 240, count: 3 }, { type: 'aimed', count: 5, spread: 0.5, speed: 340, dmg: 14, color: '#ffffff', bursts: 3 }] },
        { at: 0.5, speed: 30, patterns: [{ type: 'rain', count: 12, radius: 70, dmg: 22, windup: 1.2, color: '#d8cdb5' }, { type: 'summon', species: 'sentinelle', count: 3 }, { type: 'laser', dur: 3, sweep: 2.4, dmg: 36, color: '#ffffff' }] },
        { at: 0.25, speed: 34, patterns: [{ type: 'radial', n: 32, speed: 170, dmg: 14, size: 10, color: '#d8cdb5' }, { type: 'shockwave', dmg: 24, speed: 280, count: 5 }, { type: 'pull', dur: 2.2, force: 260, dmg: 12 }] },
      ],
      drops: { magma: 10, rouage: 8, noyau: 2, essence: 3 }, roles: [],
      global: { name: 'Cité portée', desc: '+4 places de soute', stat: { cargo: 4 } },
      desc: 'Une ville entière vit sur sa carapace. Ses habitants ne savent pas qu’ils voyagent.' },

    /* ---------------- Orbite ---------------- */
    { id: 'poussiere_vive', name: 'Poussière vive', tier: 0, scale: 'orbite', biomes: ['mer_regolithe', 'ceinture_asteroides'],
      r: 8, hp: 42, speed: 70, temper: 'craintif', move: 'drift', attack: null, traits: ['glow'], group: [3, 6],
      art: { shape: 'cell', body: '#c8c2b8', accent: '#ffffff', eye: '#1c2230', eyes: 0, glow: '#ffffff' },
      drops: { regolithe: 2 }, produces: { res: 'regolithe', rate: 1.4 }, roles: ['producteur', 'porteur'],
      desc: 'Un nuage de grains qui se tient ensemble par habitude.' },
    { id: 'lunaire', name: 'Lunaire', tier: 0, scale: 'orbite', biomes: ['mer_regolithe', 'anneau_glace'],
      r: 10, hp: 48, speed: 95, temper: 'passif', move: 'fly', attack: null, traits: ['glow'], group: [2, 4],
      art: { shape: 'moth', body: '#e8e6f2', accent: '#9fe8ff', eye: '#1c2230', eyes: 2, glow: '#9fe8ff', wings: 2 },
      drops: { ether: 1 }, produces: { res: 'ether', rate: 0.6 }, roles: ['eclaireur', 'producteur'],
      desc: 'Un papillon qui ne vole que du côté éclairé de la lune.' },
    { id: 'bernard_epave', name: 'Bernard des épaves', tier: 0, scale: 'orbite', biomes: ['epave_orbitale', 'ceinture_asteroides'],
      r: 11, hp: 60, speed: 75, temper: 'territorial', move: 'walk', attack: { type: 'bite', dmg: 8, cd: 1.1 }, traits: [], group: [2, 3],
      art: { shape: 'insect', body: '#8a94a4', accent: '#4fd8f0', eye: '#1c2230', eyes: 2, legs: 4, jaws: true },
      drops: { ferraille: 3, rouage: 1 }, produces: { res: 'ferraille', rate: 1.6 }, roles: ['porteur', 'producteur'],
      desc: 'Il habite une capsule de sauvetage. Il ne la prête pas.' },
    { id: 'glacon_chantant', name: 'Glaçon chantant', tier: 0, scale: 'orbite', biomes: ['anneau_glace'],
      r: 9, hp: 44, speed: 55, temper: 'passif', move: 'drift', attack: null, traits: ['glow'], group: [2, 5],
      art: { shape: 'orb', body: '#d8f2ff', accent: '#7fb8ff', eye: '#1c2230', eyes: 1, glow: '#bfeaff' },
      drops: { givre: 2, ether: 1 }, produces: { res: 'givre', rate: 1.5 }, roles: ['soutien', 'producteur'],
      desc: 'Il résonne quand la lumière le traverse. Les autres créatures s’endorment en l’écoutant.' },
    { id: 'requin_vide', name: 'Requin du vide', tier: 1, scale: 'orbite', biomes: ['ceinture_asteroides', 'anneau_glace', 'mer_regolithe', 'epave_orbitale'],
      r: 19, hp: 190, speed: 135, temper: 'agressif', move: 'drift', attack: { type: 'charge', dmg: 20, cd: 2.6, windup: 0.5, speed: 560, dist: 340 }, traits: [], group: [1, 2],
      art: { shape: 'fish', body: '#2a2e40', accent: '#c8c4d8', eye: '#9fe8ff', eyes: 2, spikes: 1 },
      drops: { regolithe: 3, ether: 1 }, roles: ['combat'],
      desc: 'Il n’a jamais connu l’eau. Il nage quand même.' },
    { id: 'tisseuse_orbite', name: 'Tisseuse d’orbite', tier: 1, scale: 'orbite', biomes: ['epave_orbitale', 'anneau_glace'],
      r: 17, hp: 170, speed: 85, temper: 'territorial', move: 'walk', attack: { type: 'shoot', dmg: 9, cd: 1.6, speed: 300, count: 3, spread: 0.3, size: 5, color: '#e8e0f0', slow: 0.5, range: 340 }, traits: [], group: [1, 2],
      art: { shape: 'insect', body: '#3a3e52', accent: '#e8e0f0', eye: '#ff4d6d', eyes: 4, legs: 8 },
      drops: { ferraille: 2, ether: 1 }, roles: ['combat', 'capture'],
      desc: 'Ses toiles relient les débris entre eux. Certaines retiennent des satellites entiers.' },
    { id: 'sentinelle_lunaire', name: 'Sentinelle lunaire', tier: 2, scale: 'orbite', biomes: ['mer_regolithe', 'epave_orbitale'],
      r: 50, hp: 1200, armor: 0.2, speed: 45, temper: 'agressif', move: 'walk', traits: ['glow'],
      art: { shape: 'construct', body: '#b8b4ac', accent: '#9fe8ff', eye: '#4fd8f0', eyes: 1, legs: 2, big: true },
      phases: [
        { at: 1, speed: 45, patterns: [{ type: 'aimed', count: 5, spread: 0.4, speed: 380, dmg: 12, color: '#9fe8ff', bursts: 3 }, { type: 'rain', count: 6, radius: 56, dmg: 18, windup: 1.2, color: '#e8e2d6' }] },
        { at: 0.6, speed: 52, patterns: [{ type: 'laser', dur: 2.8, sweep: 2.6, dmg: 34, color: '#9fe8ff' }, { type: 'summon', species: 'poussiere_vive', count: 3 }, { type: 'charge', dmg: 22, speed: 480, windup: 0.8 }] },
        { at: 0.3, speed: 60, patterns: [{ type: 'radial', n: 22, speed: 220, dmg: 12, color: '#9fe8ff' }, { type: 'laser', dur: 2.4, sweep: 3.4, dmg: 36, color: '#ffffff', beams: 2 }] },
      ],
      drops: { regolithe: 10, ether: 3, essence: 1 }, produces: { res: 'regolithe', rate: 4 }, roles: ['combat'],
      power: { name: 'Veille lunaire', desc: '−8 % de dégâts reçus', stat: { armor: 0.08 } },
      desc: 'Quelqu’un l’a laissée pour garder cette lune. Elle attend toujours la relève.' },
    { id: 'kraken_anneaux', name: 'Kraken des anneaux', tier: 2, scale: 'orbite', biomes: ['anneau_glace', 'ceinture_asteroides'],
      r: 54, hp: 1150, speed: 50, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'hydra', body: '#4a5a7a', accent: '#bfeaff', eye: '#ffffff', eyes: 2, heads: 5, glow: '#bfeaff' },
      phases: [
        { at: 1, speed: 50, patterns: [{ type: 'spiral', arms: 4, dur: 2.4, speed: 190, dmg: 11, color: '#bfeaff' }, { type: 'pull', dur: 2, force: 220, dmg: 10 }] },
        { at: 0.6, speed: 58, patterns: [{ type: 'radial', n: 20, speed: 200, dmg: 11, color: '#e2f2ff' }, { type: 'summon', species: 'glacon_chantant', count: 3 }, { type: 'charge', dmg: 22, speed: 480, windup: 0.8 }] },
        { at: 0.3, speed: 66, patterns: [{ type: 'spiral', arms: 6, dur: 2.6, speed: 210, dmg: 11, color: '#bfeaff' }, { type: 'rain', count: 9, radius: 56, dmg: 18, windup: 1, color: '#e2f2ff' }, { type: 'pull', dur: 2.2, force: 260, dmg: 12 }] },
      ],
      drops: { givre: 12, ether: 3, essence: 1 }, produces: { res: 'givre', rate: 4 }, roles: ['combat', 'capture'],
      power: { name: 'Étreinte glacée', desc: 'Rayon de capture 10 % plus rapide', stat: { capture: 0.1 } },
      desc: 'Chacun de ses bras tient un morceau d’anneau. Il ne lâche jamais.' },
    { id: 'baleine_orbitale', name: 'Baleine d’orbite', tier: 5, scale: 'orbite', biomes: ['mer_regolithe', 'anneau_glace', 'ceinture_asteroides', 'epave_orbitale'],
      r: 150, hp: 4400, speed: 45, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'whale', body: '#3a4a6a', accent: '#e8f4ff', eye: '#1c2230', eyes: 2, glow: '#9fe8ff', pattern: 'spots', moons: true },
      phases: [
        { at: 1, speed: 45, patterns: [{ type: 'shockwave', dmg: 22, speed: 250, count: 3 }, { type: 'summon', species: 'requin_vide', count: 2 }] },
        { at: 0.75, speed: 55, patterns: [{ type: 'charge', dmg: 32, speed: 520, windup: 1 }, { type: 'radial', n: 26, speed: 170, dmg: 13, size: 11, color: '#e8f4ff' }, { type: 'pull', dur: 2.6, force: 300, dmg: 14 }] },
        { at: 0.5, speed: 62, patterns: [{ type: 'laser', dur: 3.2, sweep: 3, dmg: 42, color: '#9fe8ff', beams: 2 }, { type: 'rain', count: 12, radius: 70, dmg: 22, windup: 1.1, color: '#e8e2d6' }, { type: 'summon', species: 'requin_vide', count: 2 }] },
        { at: 0.25, speed: 70, patterns: [{ type: 'shockwave', dmg: 26, speed: 320, count: 5 }, { type: 'spiral', arms: 7, dur: 2.8, speed: 200, dmg: 12, size: 9, color: '#e8f4ff' }, { type: 'charge', dmg: 34, speed: 580, windup: 0.8 }] },
      ],
      drops: { ether: 10, regolithe: 20, noyau: 2, essence: 3 }, roles: [],
      global: { name: 'Chant orbital', desc: '+20 % de dégâts des compagnons', stat: { compDmg: 0.2 } },
      desc: 'Elle avale des lunes entières. Celles qui restent sur son dos sont ses favorites.' },
    { id: 'serpent_annulaire', name: 'Serpent annulaire', tier: 5, scale: 'orbite', biomes: ['anneau_glace', 'ceinture_asteroides', 'epave_orbitale', 'mer_regolithe'],
      r: 125, hp: 4300, speed: 85, temper: 'agressif', move: 'slither', traits: ['glow'],
      art: { shape: 'serpent', body: '#2e3448', accent: '#c8f2ff', eye: '#ffffff', eyes: 2, segs: 24, spikes: 18, glow: '#9fe8ff' },
      phases: [
        { at: 1, speed: 85, patterns: [{ type: 'spiral', arms: 4, dur: 2.6, speed: 200, dmg: 12, color: '#c8f2ff' }, { type: 'charge', dmg: 30, speed: 560, windup: 0.9 }] },
        { at: 0.75, speed: 95, patterns: [{ type: 'radial', n: 28, speed: 210, dmg: 12, color: '#ffffff' }, { type: 'pull', dur: 2.4, force: 300, dmg: 12 }, { type: 'charge', dmg: 32, speed: 600, windup: 0.8 }] },
        { at: 0.5, speed: 105, patterns: [{ type: 'laser', dur: 3, sweep: 4, dmg: 40, color: '#c8f2ff', beams: 3 }, { type: 'spiral', arms: 6, dur: 2.6, speed: 220, dmg: 12, color: '#ffffff' }] },
        { at: 0.25, speed: 115, patterns: [{ type: 'charge', dmg: 34, speed: 640, windup: 0.6 }, { type: 'shockwave', dmg: 24, speed: 320, count: 4 }, { type: 'rain', count: 14, radius: 64, dmg: 22, windup: 1, color: '#c8f2ff' }] },
      ],
      drops: { ether: 12, givre: 20, noyau: 2, essence: 3 }, roles: [],
      global: { name: 'Anneau protecteur', desc: 'Effondrement 25 % plus lent pendant les extractions', stat: { stability: 0.25 } },
      desc: 'Il fait le tour d’une planète en mordant sa propre queue. Personne ne sait depuis quand.' },
    { id: 'titan_lune', name: 'Titan-Lune', tier: 5, scale: 'orbite', biomes: ['mer_regolithe', 'ceinture_asteroides', 'anneau_glace', 'epave_orbitale'],
      r: 140, hp: 4600, armor: 0.2, speed: 32, temper: 'agressif', move: 'walk', traits: [],
      art: { shape: 'golem', body: '#a8a29a', accent: '#e8e2d6', eye: '#1c2230', eyes: 2, craters: true },
      phases: [
        { at: 1, speed: 32, patterns: [{ type: 'rain', count: 10, radius: 74, dmg: 22, windup: 1.3, color: '#e8e2d6' }, { type: 'slam', dmg: 32, radius: 260, windup: 1.2 }] },
        { at: 0.75, speed: 36, patterns: [{ type: 'pull', dur: 3, force: 320, dmg: 14 }, { type: 'radial', n: 24, speed: 180, dmg: 13, size: 10, color: '#c8c2b8' }, { type: 'summon', species: 'poussiere_vive', count: 4 }] },
        { at: 0.5, speed: 40, patterns: [{ type: 'rain', count: 16, radius: 76, dmg: 24, windup: 1.1, color: '#e8e2d6' }, { type: 'shockwave', dmg: 24, speed: 270, count: 3 }, { type: 'slam', dmg: 34, radius: 300, windup: 1.1 }] },
        { at: 0.25, speed: 46, patterns: [{ type: 'pull', dur: 3, force: 360, dmg: 16 }, { type: 'radial', n: 34, speed: 200, dmg: 13, color: '#ffffff' }, { type: 'rain', count: 18, radius: 76, dmg: 24, windup: 1, color: '#e8e2d6' }] },
      ],
      drops: { regolithe: 30, ether: 8, noyau: 2, essence: 3 }, roles: [],
      global: { name: 'Marée haute', desc: '+20 % de production pour tous les territoires', stat: { prod: 0.2 } },
      desc: 'Une lune qui s’est levée un jour, et qui a décidé de marcher.' },

    /* ---------------- Système ---------------- */
    { id: 'flammeche', name: 'Flammèche', tier: 0, scale: 'systeme', biomes: ['couronne_solaire', 'ceinture_fer'],
      r: 8, hp: 46, speed: 105, temper: 'craintif', move: 'drift', attack: null, traits: ['glow'], group: [3, 5],
      art: { shape: 'orb', body: '#ffd23a', accent: '#fff0b0', eye: '#1c2230', eyes: 1, glow: '#ffb02e' },
      drops: { plasma: 1 }, produces: { res: 'plasma', rate: 0.5 }, roles: ['eclaireur', 'producteur'],
      desc: 'Une goutte d’étoile qui a pris la fuite.' },
    { id: 'nuageon', name: 'Nuageon', tier: 0, scale: 'systeme', biomes: ['geante_gazeuse', 'queue_comete'],
      r: 12, hp: 56, speed: 50, temper: 'passif', move: 'drift', attack: null, traits: [], group: [2, 4],
      art: { shape: 'jelly', body: '#e8d0a8', accent: '#a07850', eye: '#1c2230', eyes: 2 },
      drops: { ether: 1, seve: 1 }, produces: { res: 'ether', rate: 0.7 }, roles: ['soutien', 'producteur'],
      desc: 'Il se laisse porter par les tempêtes. Il les aime.' },
    { id: 'comete_naine', name: 'Comète naine', tier: 0, scale: 'systeme', biomes: ['queue_comete', 'ceinture_fer', 'couronne_solaire'],
      r: 9, hp: 40, speed: 160, temper: 'craintif', move: 'fly', attack: null, traits: ['glow'], group: [1, 3],
      art: { shape: 'comet', body: '#d8f2ff', accent: '#9fe8ff', eye: '#1c2230', eyes: 1, glow: '#9fe8ff' },
      drops: { poussiere: 2, givre: 1 }, produces: { res: 'poussiere', rate: 1.2 }, roles: ['eclaireur', 'porteur'],
      desc: 'Rapide, curieuse, et incapable de s’arrêter.' },
    { id: 'salamandre_solaire', name: 'Salamandre solaire', tier: 1, scale: 'systeme', biomes: ['couronne_solaire', 'ceinture_fer'],
      r: 18, hp: 200, speed: 90, temper: 'territorial', move: 'walk', attack: { type: 'spit', dmg: 14, cd: 1.9, range: 300, radius: 40, life: 3.5, color: '#ffb02e' }, traits: ['glow'], group: [1, 2],
      art: { shape: 'quad', body: '#6a3418', accent: '#ffd23a', eye: '#fff0b0', eyes: 2, spikes: 6, glow: '#ffb02e', tail: true },
      drops: { plasma: 2, braise: 3 }, roles: ['combat'],
      desc: 'Elle se baigne dans le plasma. Elle trouve l’Archive un peu froide.' },
    { id: 'raie_gazeuse', name: 'Raie des gaz', tier: 1, scale: 'systeme', biomes: ['geante_gazeuse', 'queue_comete'],
      r: 22, hp: 185, speed: 125, temper: 'agressif', move: 'drift', attack: { type: 'charge', dmg: 18, cd: 2.4, windup: 0.5, speed: 520, dist: 320 }, traits: [], group: [1, 2],
      art: { shape: 'moth', body: '#a07850', accent: '#f0e0c0', eye: '#1c2230', eyes: 2, wings: 2 },
      drops: { ether: 2, perle: 1 }, roles: ['combat'],
      desc: 'Elle plane dans les tempêtes et fond sur tout ce qui ne tourne pas avec le vent.' },
    { id: 'forge_vivante', name: 'Forge vivante', tier: 2, scale: 'systeme', biomes: ['ceinture_fer', 'couronne_solaire'],
      r: 52, hp: 1300, armor: 0.25, speed: 40, temper: 'agressif', move: 'walk', traits: ['glow'],
      art: { shape: 'construct', body: '#5a3a2a', accent: '#ff8a5a', eye: '#ffd23a', eyes: 1, legs: 2, big: true },
      phases: [
        { at: 1, speed: 40, patterns: [{ type: 'pools', count: 4, radius: 56, dps: 16, color: '#ffb02e' }, { type: 'aimed', count: 3, spread: 0.2, speed: 420, dmg: 14, color: '#ff8a5a', bursts: 3 }] },
        { at: 0.6, speed: 48, patterns: [{ type: 'laser', dur: 2.8, sweep: 2.8, dmg: 36, color: '#ffd23a' }, { type: 'summon', species: 'salamandre_solaire', count: 1 }, { type: 'slam', dmg: 26, radius: 180, windup: 1 }] },
        { at: 0.3, speed: 56, patterns: [{ type: 'radial', n: 24, speed: 220, dmg: 12, color: '#ff8a5a' }, { type: 'pools', count: 6, radius: 60, dps: 18, color: '#ffb02e' }, { type: 'laser', dur: 2.4, sweep: 3.6, dmg: 38, color: '#ffffff', beams: 2 }] },
      ],
      drops: { ferrite: 14, plasma: 3, essence: 1 }, produces: { res: 'ferrite', rate: 4 }, roles: ['combat'],
      power: { name: 'Enclume stellaire', desc: '+12 % de dégâts au corps à corps', stat: { meleeDmg: 0.12 } },
      desc: 'Elle forge des noyaux de planètes. Personne ne lui a jamais rien commandé.' },
    { id: 'meduse_couronne', name: 'Méduse de couronne', tier: 2, scale: 'systeme', biomes: ['geante_gazeuse', 'queue_comete', 'couronne_solaire'],
      r: 56, hp: 1200, speed: 45, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'jelly', body: '#f0d890', accent: '#ffb02e', eye: '#1c2230', eyes: 0, glow: '#ffd23a' },
      phases: [
        { at: 1, speed: 45, patterns: [{ type: 'radial', n: 18, speed: 160, dmg: 11, size: 9, color: '#ffd23a' }, { type: 'pull', dur: 2, force: 220, dmg: 10 }] },
        { at: 0.6, speed: 52, patterns: [{ type: 'spiral', arms: 5, dur: 2.6, speed: 190, dmg: 11, color: '#ffb02e' }, { type: 'summon', species: 'nuageon', count: 3 }, { type: 'pools', count: 4, radius: 56, dps: 14, color: '#ffd23a' }] },
        { at: 0.3, speed: 60, patterns: [{ type: 'radial', n: 28, speed: 180, dmg: 12, size: 9, color: '#ffffff' }, { type: 'shockwave', dmg: 20, speed: 280, count: 3 }, { type: 'pull', dur: 2.4, force: 260, dmg: 12 }] },
      ],
      drops: { plasma: 4, ether: 4, essence: 1 }, produces: { res: 'plasma', rate: 1.5 }, roles: ['soutien'],
      power: { name: 'Aura solaire', desc: '+1 PV par seconde', stat: { regen: 1 } },
      desc: 'Ses filaments mesurent des milliers de kilomètres. Elle s’en sert pour caresser les comètes.' },
    { id: 'astre_veilleur', name: 'L’Astre veilleur', tier: 6, scale: 'systeme', biomes: ['couronne_solaire', 'geante_gazeuse', 'queue_comete', 'ceinture_fer'],
      r: 150, hp: 4900, speed: 30, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'star', body: '#ffd23a', accent: '#fff6d0', eye: '#2a1606', eyes: 1, glow: '#ffb02e' },
      phases: [
        { at: 1, speed: 30, patterns: [{ type: 'radial', n: 28, speed: 180, dmg: 13, size: 8, color: '#ffd23a' }, { type: 'pools', count: 5, radius: 64, dps: 18, color: '#ffb02e' }] },
        { at: 0.75, speed: 34, patterns: [{ type: 'laser', dur: 3.2, sweep: 3.4, dmg: 42, color: '#fff6d0', beams: 3 }, { type: 'summon', species: 'flammeche', count: 4 }, { type: 'pull', dur: 2.6, force: 320, dmg: 16 }] },
        { at: 0.5, speed: 38, patterns: [{ type: 'spiral', arms: 7, dur: 3, speed: 210, dmg: 13, color: '#ffd23a' }, { type: 'shockwave', dmg: 26, speed: 300, count: 4 }, { type: 'pools', count: 7, radius: 66, dps: 20, color: '#ffb02e' }] },
        { at: 0.25, speed: 42, patterns: [{ type: 'laser', dur: 3.4, sweep: 4.4, dmg: 46, color: '#ffffff', beams: 4 }, { type: 'radial', n: 36, speed: 210, dmg: 13, color: '#ffd23a' }, { type: 'pull', dur: 3, force: 360, dmg: 18 }] },
      ],
      drops: { plasma: 14, ferrite: 20, noyau: 3, essence: 4 }, roles: [],
      global: { name: 'Lumière perpétuelle', desc: 'Vous régénérez 1,5 PV par seconde en expédition', stat: { regen: 1.5 } },
      desc: 'Une étoile qui a ouvert un œil. Elle regarde l’Artefact comme on regarde une autre étoile.' },
    { id: 'phenix_plasma', name: 'Phénix de plasma', tier: 6, scale: 'systeme', biomes: ['couronne_solaire', 'geante_gazeuse', 'queue_comete', 'ceinture_fer'],
      r: 135, hp: 4800, speed: 95, temper: 'agressif', move: 'fly', traits: ['glow'],
      art: { shape: 'moth', body: '#ff7a3a', accent: '#ffd23a', eye: '#fff6d0', eyes: 2, glow: '#ff7a3a', wings: 2, phoenix: true },
      phases: [
        { at: 1, speed: 95, patterns: [{ type: 'charge', dmg: 32, speed: 600, windup: 0.8 }, { type: 'rain', count: 10, radius: 66, dmg: 22, windup: 1.1, color: '#ff7a3a' }] },
        { at: 0.75, speed: 105, patterns: [{ type: 'spiral', arms: 6, dur: 2.8, speed: 220, dmg: 13, color: '#ffd23a' }, { type: 'summon', species: 'flammeche', count: 4 }, { type: 'charge', dmg: 34, speed: 640, windup: 0.7 }] },
        { at: 0.5, speed: 115, patterns: [{ type: 'pools', count: 8, radius: 64, dps: 20, color: '#ff7a3a' }, { type: 'laser', dur: 3, sweep: 3.6, dmg: 44, color: '#ffd23a', beams: 2 }, { type: 'rain', count: 14, radius: 66, dmg: 24, windup: 1, color: '#ff7a3a' }] },
        { at: 0.25, speed: 125, patterns: [{ type: 'radial', n: 34, speed: 230, dmg: 13, color: '#ffd23a' }, { type: 'charge', dmg: 36, speed: 680, windup: 0.6 }, { type: 'shockwave', dmg: 26, speed: 320, count: 4 }] },
      ],
      drops: { plasma: 16, braise: 30, noyau: 3, essence: 4 }, roles: [],
      global: { name: 'Renaissance', desc: '+20 % de dégâts à distance et au corps à corps', stat: { rangedDmg: 0.2, meleeDmg: 0.2 } },
      desc: 'Il meurt à chaque éruption, et renaît dans la suivante. Il a perdu le compte.' },

    /* ---------------- Galaxie ---------------- */
    { id: 'scintille', name: 'Scintille', tier: 0, scale: 'galaxie', biomes: ['bras_etoiles', 'nebuleuse', 'coeur_galactique'],
      r: 7, hp: 50, speed: 90, temper: 'craintif', move: 'fly', attack: null, traits: ['glow'], group: [3, 6],
      art: { shape: 'star', body: '#fff0c0', accent: '#ffffff', eye: '#1c2230', eyes: 0, glow: '#fff0c0' },
      drops: { poussiere: 2 }, produces: { res: 'poussiere', rate: 1.6 }, roles: ['eclaireur', 'producteur'],
      desc: 'Une étoile toute petite, qui a encore le temps de grandir.' },
    { id: 'nebulon', name: 'Nébulon', tier: 0, scale: 'galaxie', biomes: ['nebuleuse', 'halo_sombre'],
      r: 13, hp: 64, speed: 45, temper: 'passif', move: 'drift', attack: null, traits: ['glow'], group: [2, 3],
      art: { shape: 'nebula', body: '#b06ad0', accent: '#ff9ae8', eye: '#ffffff', eyes: 2, glow: '#ff9ae8' },
      drops: { poussiere: 1, ether: 1 }, produces: { res: 'ether', rate: 0.8 }, roles: ['soutien', 'producteur'],
      desc: 'Un petit nuage d’où naissent parfois des scintilles.' },
    { id: 'devoreur', name: 'Dévoreur', tier: 1, scale: 'galaxie', biomes: ['halo_sombre', 'bras_etoiles', 'coeur_galactique', 'nebuleuse'],
      r: 16, hp: 180, speed: 130, temper: 'agressif', move: 'fly', attack: { type: 'bite', dmg: 16, cd: 0.9 }, traits: [], group: [2, 3],
      art: { shape: 'wraith', body: '#14142a', accent: '#8a8aff', eye: '#ffffff', eyes: 2 },
      drops: { poussiere: 2, matiere_noire: 0.15 }, roles: ['combat'],
      desc: 'Il sort du vide entre les étoiles. Il y retourne, plus lourd.' },
    { id: 'chasseur_lumiere', name: 'Chasseur de lumière', tier: 1, scale: 'galaxie', biomes: ['bras_etoiles', 'coeur_galactique', 'nebuleuse'],
      r: 18, hp: 210, speed: 110, temper: 'territorial', move: 'slither', attack: { type: 'shoot', dmg: 12, cd: 1.5, speed: 460, count: 1, spread: 0, size: 6, color: '#fff0c0', range: 420 }, traits: ['glow'], group: [1, 2],
      art: { shape: 'serpent', body: '#2a2a4a', accent: '#fff0c0', eye: '#fff0c0', eyes: 2, segs: 9, glow: '#fff0c0' },
      drops: { plasma: 2, poussiere: 2 }, roles: ['combat'],
      desc: 'Il chasse les photons. Les plus lents finissent dans son ventre.' },
    { id: 'gardien_bras', name: 'Gardien du bras', tier: 2, scale: 'galaxie', biomes: ['bras_etoiles', 'coeur_galactique'],
      r: 50, hp: 1400, speed: 50, temper: 'agressif', move: 'blink', traits: ['glow'],
      art: { shape: 'eye', body: '#2a2a4a', accent: '#fff0c0', eye: '#1c2230', eyes: 1, glow: '#fff0c0' },
      phases: [
        { at: 1, speed: 50, patterns: [{ type: 'blink' }, { type: 'aimed', count: 7, spread: 0.7, speed: 360, dmg: 12, color: '#fff0c0', bursts: 2 }] },
        { at: 0.6, speed: 58, patterns: [{ type: 'laser', dur: 2.8, sweep: 3, dmg: 38, color: '#fff0c0', beams: 2 }, { type: 'blink' }, { type: 'summon', species: 'scintille', count: 4 }] },
        { at: 0.3, speed: 66, patterns: [{ type: 'radial', n: 26, speed: 230, dmg: 12, color: '#ffffff' }, { type: 'blink' }, { type: 'laser', dur: 2.6, sweep: 4, dmg: 40, color: '#ffffff', beams: 3 }] },
      ],
      drops: { poussiere: 14, plasma: 3, essence: 1 }, produces: { res: 'poussiere', rate: 5 }, roles: ['eclaireur'],
      power: { name: 'Regard des étoiles', desc: '+10 % de dégâts à distance', stat: { rangedDmg: 0.1 } },
      desc: 'Il surveille le bras depuis que les étoiles y ont été posées.' },
    { id: 'trou_vivant', name: 'Trou vivant', tier: 2, scale: 'galaxie', biomes: ['halo_sombre', 'nebuleuse'],
      r: 54, hp: 1350, speed: 35, temper: 'agressif', move: 'drift', traits: [],
      art: { shape: 'nebula', body: '#0e0e1a', accent: '#8a8aff', eye: '#ffffff', eyes: 1, dark: true },
      phases: [
        { at: 1, speed: 35, patterns: [{ type: 'pull', dur: 3, force: 300, dmg: 12 }, { type: 'radial', n: 16, speed: 150, dmg: 12, size: 10, color: '#8a8aff' }] },
        { at: 0.6, speed: 42, patterns: [{ type: 'summon', species: 'devoreur', count: 2 }, { type: 'spiral', arms: 4, dur: 2.6, speed: 180, dmg: 11, color: '#8a8aff' }, { type: 'pull', dur: 3, force: 330, dmg: 14 }] },
        { at: 0.3, speed: 50, patterns: [{ type: 'radial', n: 30, speed: 170, dmg: 12, color: '#ffffff' }, { type: 'pull', dur: 3.2, force: 360, dmg: 16 }, { type: 'pools', count: 5, radius: 60, dps: 16, color: '#2a2a50' }] },
      ],
      drops: { matiere_noire: 1, poussiere: 8, essence: 1 }, produces: { res: 'matiere_noire', rate: 0.15 }, roles: ['capture'],
      power: { name: 'Horizon apprivoisé', desc: '+8 % de vitesse de déplacement', stat: { speed: 0.08 } },
      desc: 'Il avale la lumière, et ce qui la suit. Il a appris à ne pas avaler ce qui le nourrit.' },
    { id: 'myriade', name: 'La Myriade', tier: 7, scale: 'galaxie', biomes: ['nebuleuse', 'bras_etoiles', 'halo_sombre', 'coeur_galactique'],
      r: 165, hp: 5600, speed: 40, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'nebula', body: '#6a4a9a', accent: '#fff0c0', eye: '#ffffff', eyes: 3, glow: '#ff9ae8', stars: true },
      phases: [
        { at: 1, speed: 40, patterns: [{ type: 'summon', species: 'scintille', count: 4 }, { type: 'spiral', arms: 6, dur: 2.8, speed: 200, dmg: 13, color: '#fff0c0' }] },
        { at: 0.75, speed: 46, patterns: [{ type: 'blink' }, { type: 'radial', n: 32, speed: 200, dmg: 13, color: '#ff9ae8' }, { type: 'summon', species: 'devoreur', count: 2 }] },
        { at: 0.5, speed: 52, patterns: [{ type: 'laser', dur: 3.4, sweep: 4, dmg: 46, color: '#fff0c0', beams: 4 }, { type: 'pull', dur: 3, force: 340, dmg: 16 }, { type: 'spiral', arms: 8, dur: 3, speed: 220, dmg: 13, color: '#ff9ae8' }] },
        { at: 0.25, speed: 58, patterns: [{ type: 'blink' }, { type: 'radial', n: 40, speed: 220, dmg: 14, color: '#ffffff' }, { type: 'rain', count: 18, radius: 70, dmg: 24, windup: 1, color: '#ff9ae8' }, { type: 'summon', species: 'devoreur', count: 3 }] },
      ],
      drops: { matiere_noire: 3, poussiere: 30, noyau: 3, essence: 5 }, roles: [],
      global: { name: 'Mille regards', desc: 'Capture 25 % plus rapide et carte toujours révélée', stat: { capture: 0.25, reveal: 1 } },
      desc: 'Des milliards d’étoiles qui ont décidé, un jour, d’être une seule chose.' },
    { id: 'spirale_mere', name: 'Spirale-mère', tier: 7, scale: 'galaxie', biomes: ['coeur_galactique', 'bras_etoiles', 'nebuleuse', 'halo_sombre'],
      r: 160, hp: 5800, speed: 28, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'spiral', body: '#3a3060', accent: '#fff0c0', eye: '#ffffff', eyes: 1, glow: '#fff0c0' },
      phases: [
        { at: 1, speed: 28, patterns: [{ type: 'spiral', arms: 5, dur: 3, speed: 190, dmg: 13, color: '#fff0c0' }, { type: 'pull', dur: 2.6, force: 300, dmg: 14 }] },
        { at: 0.75, speed: 32, patterns: [{ type: 'radial', n: 30, speed: 200, dmg: 13, color: '#b8acf0' }, { type: 'shockwave', dmg: 24, speed: 280, count: 4 }, { type: 'summon', species: 'chasseur_lumiere', count: 2 }] },
        { at: 0.5, speed: 36, patterns: [{ type: 'spiral', arms: 8, dur: 3.2, speed: 210, dmg: 13, color: '#fff0c0' }, { type: 'pull', dur: 3.2, force: 380, dmg: 18 }, { type: 'laser', dur: 3.2, sweep: 4.6, dmg: 46, color: '#ffffff', beams: 3 }] },
        { at: 0.25, speed: 40, patterns: [{ type: 'shockwave', dmg: 28, speed: 340, count: 6 }, { type: 'spiral', arms: 10, dur: 3, speed: 230, dmg: 14, color: '#b8acf0' }, { type: 'pull', dur: 3.4, force: 420, dmg: 20 }] },
      ],
      drops: { matiere_noire: 3, plasma: 16, noyau: 3, essence: 5 }, roles: [],
      global: { name: 'Gravité première', desc: '+25 % de production et +10 % de vitesse', stat: { prod: 0.25, speed: 0.1 } },
      desc: 'Elle tourne. Tout ce qui l’entoure tourne avec elle, et finit par lui ressembler.' },
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

  /* ---- traits des nouvelles espèces ---- */
  const M = (speed, fly) => ({ speed, fly: !!fly });
  Object.assign(D.EXTRA_TRAITS, {
    poussiere_vive: { ability: 'nuage', keys: ['fouisseur'], diet: null },
    lunaire: { ability: 'vision', keys: ['lumiere', 'vol'] },
    bernard_epave: { ability: 'bouclier', keys: ['conduction'], diet: { res: 'ferraille', period: 20, n: 1 } },
    glacon_chantant: { ability: 'soin', keys: ['resonance'] },
    requin_vide: { ability: 'ruee', keys: ['vol', 'nage'], mount: M(330, true), diet: { res: 'regolithe', period: 16, n: 2 } },
    tisseuse_orbite: { ability: 'toile', keys: ['conduction', 'vol'], diet: { res: 'ferraille', period: 16, n: 2 } },
    sentinelle_lunaire: { ability: 'rayon', keys: ['conduction', 'fouisseur'], mount: M(230), diet: { res: 'regolithe', period: 12, n: 3 } },
    kraken_anneaux: { ability: 'gel', keys: ['nage', 'resonance'], mount: M(260, true), diet: { res: 'givre', period: 12, n: 3 } },
    flammeche: { ability: 'flammes', keys: ['feu', 'lumiere'] },
    nuageon: { ability: 'soin', keys: ['vol', 'nage'] },
    comete_naine: { ability: 'saut', keys: ['vol', 'lumiere'] },
    salamandre_solaire: { ability: 'flammes', keys: ['feu'], mount: M(290), diet: { res: 'plasma', period: 18, n: 1 } },
    raie_gazeuse: { ability: 'vague', keys: ['vol'], mount: M(340, true), diet: { res: 'ether', period: 18, n: 1 } },
    forge_vivante: { ability: 'seisme', keys: ['feu', 'conduction'], mount: M(220), diet: { res: 'ferrite', period: 12, n: 3 } },
    meduse_couronne: { ability: 'entrave', keys: ['lumiere', 'feu', 'vol'], diet: { res: 'plasma', period: 12, n: 1 } },
    scintille: { ability: 'vision', keys: ['lumiere'] },
    nebulon: { ability: 'soin', keys: ['vol', 'acide'] },
    devoreur: { ability: 'rage', keys: ['vol', 'acide'], diet: { res: 'poussiere', period: 14, n: 2 } },
    chasseur_lumiere: { ability: 'arc', keys: ['lumiere', 'vol'], mount: M(320), diet: { res: 'plasma', period: 16, n: 1 } },
    gardien_bras: { ability: 'rayon', keys: ['lumiere', 'resonance', 'vol'], diet: { res: 'poussiere', period: 12, n: 3 } },
    trou_vivant: { ability: 'cri', keys: ['vol', 'acide', 'fouisseur'], diet: { res: 'poussiere', period: 12, n: 3 } },
    atlas: { call: 'seisme_monde' },
    leviathan_tellurique: { call: 'magma' },
    tortue_monde: { call: 'rempart' },
    baleine_orbitale: { call: 'chant' },
    serpent_annulaire: { call: 'anneau' },
    titan_lune: { call: 'impact' },
    astre_veilleur: { call: 'eruption' },
    phenix_plasma: { call: 'phenix' },
    myriade: { call: 'constellation' },
    spirale_mere: { call: 'trou_noir' },
  });

  Object.assign(D.CALLS, {
    seisme_monde: { name: 'Séisme du monde', desc: 'Le sol se soulève : tout ce qui vous entoure est étourdi et blessé.', color: '#ff7a3a' },
    magma: { name: 'Fleuves de magma', desc: 'Des geysers de magma jaillissent sous chaque ennemi visible.', color: '#ff5a1f' },
    rempart: { name: 'Rempart vivant', desc: 'La cité de la Tortue vous protège : bouclier et soins pour toute la troupe.', color: '#d8cdb5' },
    chant: { name: 'Chant orbital', desc: 'Un chant qui fige les créatures hostiles et soigne la troupe.', color: '#9fe8ff' },
    anneau: { name: 'Anneau de débris', desc: 'Un anneau de rocs tourne autour de vous et broie ce qui l’approche.', color: '#c8f2ff' },
    impact: { name: 'Chute de lune', desc: 'Un astre s’écrase au curseur.', color: '#e8e2d6' },
    eruption: { name: 'Éruption solaire', desc: 'Une vague de plasma balaie tout l’écran.', color: '#ffd23a' },
    phenix: { name: 'Envol du phénix', desc: 'Un phénix traverse la zone en embrasant tout sur son passage.', color: '#ff7a3a' },
    constellation: { name: 'Constellation', desc: 'Des étoiles s’allument au-dessus de chaque ennemi, puis tombent.', color: '#fff0c0' },
    trou_noir: { name: 'Trou noir', desc: 'Un trou noir s’ouvre au curseur et avale ce qui l’approche.', color: '#3a2a60' },
  });

  /* =================== Astres : ce que l'Ancrage rapporte des échelles cosmiques =================== */
  // stat : clé de AN.Profile.powers ; layer : couche de l'Archive où l'astre apparaît
  D.ASTRES = {
    mer_regolithe: { kind: 'lune', name: 'Lune de régolithe', layer: 'orbite', stat: { prod: 0.08 }, desc: '+8 % de production : ses marées remuent l’Archive.' },
    anneau_glace: { kind: 'anneau', name: 'Anneau de glace', layer: 'orbite', stat: { cargo: 2 }, desc: '+2 places de soute.' },
    ceinture_asteroides: { kind: 'planetoide', name: 'Planétoïde', layer: 'orbite', stat: { craftCost: 0.05 }, desc: '−5 % sur les coûts de l’Atelier.' },
    epave_orbitale: { kind: 'station', name: 'Station orbitale', layer: 'orbite', stat: { stability: 0.1 }, desc: 'Effondrement 10 % plus lent.' },
    couronne_solaire: { kind: 'etoile', name: 'Étoile naine', layer: 'systeme', stat: { prod: 0.12 }, desc: '+12 % de production.' },
    geante_gazeuse: { kind: 'geante', name: 'Géante gazeuse', layer: 'systeme', stat: { hp: 20 }, desc: '+20 PV maximum.' },
    queue_comete: { kind: 'comete', name: 'Comète', layer: 'systeme', stat: { speed: 0.05 }, desc: '+5 % de vitesse de déplacement.' },
    ceinture_fer: { kind: 'planete', name: 'Planète de fer', layer: 'systeme', stat: { armor: 0.05 }, desc: '−5 % de dégâts reçus.' },
    nebuleuse: { kind: 'nebuleuse', name: 'Nébuleuse', layer: 'galaxie', stat: { capture: 0.08 }, desc: 'Capture 8 % plus rapide.' },
    bras_etoiles: { kind: 'amas', name: 'Amas d’étoiles', layer: 'galaxie', stat: { prod: 0.15 }, desc: '+15 % de production.' },
    halo_sombre: { kind: 'halo', name: 'Halo sombre', layer: 'galaxie', stat: { rangedDmg: 0.1 }, desc: '+10 % de dégâts à distance.' },
    coeur_galactique: { kind: 'systeme', name: 'Système stellaire', layer: 'galaxie', stat: { compDmg: 0.12 }, desc: '+12 % de dégâts des compagnons.' },
  };
  D.astreFor = (biomeId) => D.ASTRES[biomeId] || null;

  /* =================== Rangs de l'Archive au-delà du Monde =================== */
  D.RANKS.push(
    { name: 'Orbite', need: { territories: 24, souverains: 1 }, zoom: 0.0025, threat: 7, desc: 'Ce que vous appeliez le sol tourne autour de quelque chose. Des lunes tournent autour de lui.' },
    { name: 'Système', need: { cataclysmes: 1, astres: 2 }, zoom: 2e-4, threat: 7, desc: 'L’Archive a ses propres astres. Elle est devenue un centre.' },
    { name: 'Galaxie', need: { stellaires: 1, astres: 5 }, zoom: 4e-6, threat: 7, desc: 'Les systèmes ne sont plus que des points de lumière autour du blanc.' },
    { name: 'Inconnue', need: { galactiques: 1 }, zoom: 1.5e-7, threat: 7, mystery: true, desc: 'Quelque chose contient l’Archive. Cela a une forme que vous connaissez.' },
  );

  /* =================== Échelles du dézoom =================== */
  D.SCALES.length = 0;
  D.SCALES.push(
    { name: 'Échelle personnelle', zoom: 0.8, rank: 0 },
    { name: 'Échelle locale', zoom: 0.35, rank: 0 },
    { name: 'Échelle régionale', zoom: 0.1, rank: 0 },
    { name: 'Échelle mondiale', zoom: 0.025, rank: 4 },
    { name: 'Échelle orbitale', zoom: 0.006, rank: 6 },
    { name: 'Échelle stellaire', zoom: 6e-4, rank: 7 },
    { name: 'Échelle galactique', zoom: 2e-5, rank: 8 },
    { name: 'Échelle inconnue', zoom: 8e-7, rank: 9 },
  );

  /* =================== Territoires des mondes =================== */
  D.QUALITY_NAMES = { fragment: 'Fragment', territoire: 'Territoire', coeur: 'Cœur de région', continent: 'Continent', cratere: 'Cratère du Souverain' };
  D.TERRITORY_WEIGHT.continent = 5;
  D.TERRITORY_WEIGHT.cratere = 8;
  D.CAPACITY.continent = 14;
  D.CAPACITY.cratere = 18;

  /* =================== Équipement des échelles supérieures =================== */
  Object.assign(D.GEAR, {
    lance_plasma: { slot: 'ranged', name: 'Lance à plasma', dmg: 26, rate: 3.2, speed: 820, spread: 0.02, count: 1, size: 5, range: 640, pierce: 3, color: '#f2b21e',
      cost: { plasma: 6, ferrite: 12, rouage: 4 }, desc: 'Un trait d’étoile qui traverse tout ce qui s’aligne.' },
    canon_ether: { slot: 'ranged', name: 'Canon à éther', dmg: 72, rate: 0.9, speed: 460, spread: 0, count: 1, size: 9, range: 560, explode: 110, color: '#7fd8f0', heavy: true,
      cost: { ether: 8, regolithe: 14, neant: 2 }, desc: 'Une sphère d’éther qui éclate en une large onde.' },
    tisse_etoiles: { slot: 'ranged', name: 'Tisse-étoiles', dmg: 14, rate: 9, speed: 700, spread: 0.18, count: 2, size: 4, range: 520, color: '#b8acf0',
      cost: { poussiere: 16, matiere_noire: 1, plasma: 4 }, desc: 'Une pluie continue de petites étoiles.' },
    lame_horizon: { slot: 'melee', name: 'Lame d’horizon', dmg: 70, arc: 2.6, range: 86, cd: 0.55, knock: 420,
      cost: { matiere_noire: 1, ferrite: 10, ether: 6 }, desc: 'Elle coupe la lumière. Le reste suit.' },
    combinaison_vide: { slot: 'armor', name: 'Combinaison du vide', armor: 0.3, hazardRes: 0.6, thrust: 2,
      cost: { regolithe: 14, ether: 4, membrane: 8 }, desc: '−30 % de dégâts, −60 % des terrains dangereux, et bien meilleur contrôle en apesanteur.' },
    egide_stellaire: { slot: 'armor', name: 'Égide stellaire', armor: 0.5, speed: -0.05, flareRes: 0.6,
      cost: { plasma: 8, ferrite: 16, essence: 2 }, desc: '−50 % de dégâts, −60 % des éruptions solaires, un peu plus lent.' },
    soute_portative: { slot: 'bag', name: 'Soute portative', cap: 100, cost: { ferrite: 16, ether: 4, regolithe: 10 }, desc: '100 unités de ressources.' },
    balise_gravite: { slot: 'consumable', name: 'Balise de gravité', gravity: 4, radius: 220, cost: { ferrite: 4, ether: 1 }, makes: 2, desc: 'Attire et maintient les créatures autour du point visé pendant 4 secondes.' },
    cellule_plasma: { slot: 'consumable', name: 'Cellule de plasma', heal: 160, cost: { plasma: 2, seve: 4 }, makes: 2, desc: 'Rend 160 PV.' },
  });

  /* =================== Améliorations de l'Artefact =================== */
  D.UPGRADES.ancrage = {
    name: 'Ancrage', desc: 'Retenir ce qui dépasse la soute : les êtres des échelles supérieures, puis des astres entiers.',
    levels: [
      { v: { tier: 3, astres: 0 } },
      { v: { tier: 4, astres: 0 }, cost: { magma: 6, noyau: 2, essence: 4 }, rank: 5 },
      { v: { tier: 5, astres: 1 }, cost: { ether: 6, regolithe: 20, noyau: 2 }, rank: 6 },
      { v: { tier: 6, astres: 2 }, cost: { plasma: 8, ferrite: 20, essence: 6 }, rank: 7 },
      { v: { tier: 7, astres: 3 }, cost: { matiere_noire: 2, poussiere: 30, noyau: 3 }, rank: 8 },
    ],
    fmt: (v) => (v.tier <= 3 ? 'aucun ancrage' : 'retient : ' + D.TIERS[v.tier].name.toLowerCase() + (v.astres ? ', ' + v.astres + ' astre' + (v.astres > 1 ? 's' : '') + ' par extraction' : '')),
  };
  D.UPGRADE_ORDER.push('ancrage');
  D.UPGRADES.soute.levels.push(
    { v: 24, cost: { magma: 6, regolithe: 16, essence: 4 }, rank: 6 },
    { v: 32, cost: { plasma: 6, ether: 6, noyau: 2 }, rank: 7 },
  );
  D.UPGRADES.liens.levels.push(
    { v: 5, cost: { magma: 4, essence: 4, perle: 6 }, rank: 5 },
    { v: 6, cost: { ether: 6, plasma: 4, noyau: 2 }, rank: 7 },
  );
  D.UPGRADES.stabilisateur.levels.push({ v: { dur: 15, keep: 0.75 }, cost: { regolithe: 12, ether: 4, noyau: 1 }, rank: 6 });
  D.UPGRADES.rayon.levels.push({ v: { thr: 0.68, mult: 3, range: 320 }, cost: { ether: 4, noyau: 2, plasma: 2 }, rank: 7 });
  D.UPGRADES.scanner.levels.push({ v: { count: 7, reliab: 1 }, cost: { ether: 4, regolithe: 10, cristal: 6 }, rank: 6 });

  /* =================== Récit des échelles supérieures =================== */
  D.LORE.push(
    { id: 'l19', title: 'Plaque de bord', text: 'Orbite stable. Aucun signe de vie en surface. Nous allons descendre voir pourquoi le sol est blanc.' },
    { id: 'l20', title: 'Chant enregistré', text: 'La baleine chante pour une lune qui n’existe plus. Les autres lunes l’écoutent quand même.' },
    { id: 'l21', title: 'Carte stellaire', text: 'Toutes les étoiles de cette carte sont reliées au même point. Le point a été gratté.' },
    { id: 'l22', title: 'Inscription sur un météore', text: 'Nous étions une planète. On nous a pris un continent, puis un autre. Puis il n’y a plus eu de « nous ».' },
    { id: 'l23', title: 'Mesure impossible', text: 'Distance à l’Archive : zéro. Où que l’on soit.' },
    { id: 'l24', title: 'Dernière transmission', text: 'Le blanc grandit à la vitesse exacte à laquelle on le remplit.' },
  );

  /** Ce qu'on découvre en dézoomant au-delà de la galaxie. */
  D.EPILOGUE = [
    'La galaxie n’est plus qu’un point.',
    'Autour d’elle, d’autres points. Des milliards.',
    'Ils sont rangés. Chacun dans sa case.',
    'La structure qui les contient a des angles impossibles. Vous la reconnaissez.',
  ];
})();
