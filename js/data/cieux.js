/* Les cieux, repris (1.11) : données pures, chargées après beyond.js.
   - Chaque nom est à l'échelle de ce qu'il désigne. Les zones d'un système sont
     des astres (une planète-tison, une géante, une comète, une naine brune) ;
     celles d'un amas, des galaxies (fantôme, spirale barrée, en fusion,
     méduse) ; celles de la Toile, des superamas. On ne ramène d'une galaxie
     que ce qui est à sa taille (une nébuleuse, un courant d'étoiles, un pulsar).
   - Un biome de plus par échelon cosmique, et chaque biome a désormais au
     moins une créature qui n'existe que là.
   - Les mondes cosmiques et ce qu'on en rapporte portent un nom propre (voir
     gen/names.js) ; placeNoun dit comment s'appelle le monde entier :
     « Système d'Arithal », « Orbites de Nylombe », « Cahier de Quelore ».
   Les identifiants ne changent pas : les sauvegardes restent valables. */
(function () {
  'use strict';
  const D = window.AN.Data;
  const patch = (table, id, p) => { if (table[id]) Object.assign(table[id], p); };

  /* =================== Échelons =================== */
  patch(D.ECHELONS, 'monde', { placeNoun: 'Planète', placeApposition: true });
  patch(D.ECHELONS, 'orbite', { placeNoun: 'Orbites' });
  patch(D.ECHELONS, 'systeme', { placeNoun: 'Système', unit: 'Astre' });
  patch(D.ECHELONS, 'galaxie', { placeNoun: 'Galaxie' });
  patch(D.ECHELONS, 'amas', { placeNoun: 'Amas', heart: 'Géante du centre' });
  patch(D.ECHELONS, 'toile', { placeNoun: 'Trame', unit: 'Superamas' });
  patch(D.ECHELONS, 'pli', { placeNoun: 'Cahier' });

  /* =================== Biomes renommés =================== */
  const B = (id, p) => patch(D.BIOME, id, p);
  // le cratère n'est que le cœur d'un monde : il n'en forme jamais un continent
  B('cratere_souverain', { heartOnly: true });
  // système : chaque zone est un astre du système
  B('couronne_solaire', { name: 'Monde-tison', region: 'du Tison', climate: 'Aveuglant, à deux pas de l’étoile',
    desc: 'Une planète si proche de son étoile que son sol coule. On marche sur des croûtes de plasma figé, entre deux éruptions.' });
  B('queue_comete', { name: 'Comète chevelue', region: 'de la Chevelure',
    desc: 'On marche sur le noyau d’une comète, dans la chevelure de glace qu’elle traîne vers l’étoile.' });
  B('ceinture_fer', { name: 'Planète éventrée', region: 'du Noyau nu',
    desc: 'Une planète ouverte en deux. Son noyau de fer est à nu, aimanté par un champ que rien n’explique.' });
  // galaxie : ce qui est à la taille d'un bras de galaxie
  B('nebuleuse', { name: 'Pouponnière d’étoiles', region: 'de la Pouponnière', desc: 'Un nuage de gaz où naissent les étoiles. Il y fait presque doux.' });
  B('bras_etoiles', { name: 'Courant stellaire', region: 'du Courant',
    desc: 'Des étoiles arrachées à un amas globulaire, qui défilent en file, toutes dans le même sens.' });
  B('coeur_galactique', { name: 'Bulbe galactique', region: 'du Bulbe',
    desc: 'Le renflement du centre, où de vieilles étoiles tournent serrées. Plus loin, quelque chose ne laisse rien repartir.' });
  // amas : chaque zone est une galaxie
  B('pont_sombre', { name: 'Galaxie fantôme', region: 'des Fantômes',
    desc: 'Une galaxie faite presque toute de matière sombre : quelques étoiles, et beaucoup de ce qu’on ne voit pas. Ses ponts la relient aux autres.' });
  B('galaxie_naine', { name: 'Spirale barrée', region: 'de la Barre',
    desc: 'Une galaxie spirale traversée d’une barre d’étoiles. Ses bras s’enroulent autour, sans jamais la lâcher.' });
  B('front_collision', { name: 'Fusion galactique', region: 'du Choc' });
  // Toile : chaque zone est un superamas
  B('filament_lumiere', { name: 'Filament de galaxies', region: 'du Filament' });
  B('bord_vide', { name: 'Lisière du Grand Vide', region: 'du Grand Vide' });
  B('noeud_toile', { name: 'Grand Attracteur', region: 'de l’Attracteur',
    desc: 'Là où les filaments se croisent. Tout y tombe, lentement, depuis le début ; des amas entiers y tiennent comme des perles.' });

  /* =================== Nouveaux biomes =================== */
  const NEW_BIOMES = [
    {
      id: 'lune_soufre', name: 'Lune de soufre', region: 'de la Lune jaune', tags: ['chaud', 'volcanique', 'lune'], scale: 'orbite',
      climate: 'Sulfureux, secoué par les marées', desc: 'Une lune que sa planète pétrit sans arrêt. Des geysers de soufre retombent en neige jaune.',
      ground: ['#8a7a2a', '#9a8830', '#aa9636'], detail: '#6a5a1a',
      wall: { base: '#4a3a14', top: '#e8d050', shape: 'blob', orn: 'cracks' },
      accent: '#f2d23a', open: 0.6, dark: 0.1, weather: 'ash',
      hazard: { name: 'Soufre en fusion', color: '#d8641a', dps: 11, slow: 0.25 }, hazardAmt: 0.06,
      decor: [['ember', '#ff9a3a'], ['ashbit', '#e8d050'], ['pebble', '#6a5a1a']],
      resources: { regolithe: 3, braise: 2, magma: 1.5, ether: 0.5 },
    },
    {
      id: 'naine_brune', name: 'Naine brune', region: 'de l’Étoile éteinte', tags: ['sombre', 'chaud', 'gaz'], scale: 'systeme',
      climate: 'Tiède, étouffé', desc: 'Une étoile qui n’a jamais réussi à s’allumer. Elle couve, sombre et tiède, et se souvient de ce qu’elle aurait pu être.',
      ground: ['#3a2220', '#442826', '#4e2e2a'], detail: '#6a3a32',
      wall: { base: '#1e1010', top: '#a8503a', shape: 'blob', orn: 'glow' },
      accent: '#e0663a', open: 0.6, dark: 0.5, weather: 'fumes',
      hazard: { name: 'Gaz brûlant', color: '#8a3a2a', dps: 8, slow: 0.35 }, hazardAmt: 0.06,
      decor: [['ember', '#e0663a'], ['dot', '#6a3a32'], ['glowdot', '#ff9a6a']],
      resources: { braise: 2, plasma: 1.5, ether: 1, obsidienne: 0.6 },
    },
    {
      id: 'remanent', name: 'Rémanent de supernova', region: 'du Rémanent', tags: ['lumiere', 'vide', 'chaud'], scale: 'galaxie',
      climate: 'Soufflé par une explosion qui dure encore',
      desc: 'Ce qui reste d’une étoile qui a explosé : une coquille de gaz qui s’étend toujours, et au centre, un cœur qui tourne mille fois par seconde.',
      ground: ['#2a1a3a', '#321e46', '#3a2252'], detail: '#5a3a7a',
      wall: { base: '#120a1e', top: '#7ae8d8', shape: 'shard', orn: 'glow' },
      accent: '#7ae8d8', open: 0.6, dark: 0.25, weather: 'glint',
      hazard: { name: 'Front de choc', color: '#4ab8c8', dps: 10, slow: 0.15 }, hazardAmt: 0.05,
      decor: [['glowdot', '#7ae8d8'], ['glowdot', '#ff8ac8'], ['shardbit', '#5a3a7a']],
      resources: { poussiere: 3, plasma: 2, cristal: 0.6, matiere_noire: 0.2 },
    },
    {
      id: 'galaxie_meduse', name: 'Galaxie-méduse', region: 'des Méduses', tags: ['gaz', 'vie', 'lumiere'], scale: 'amas',
      climate: 'Un vent qui arrache tout',
      desc: 'Une galaxie qui traverse l’amas trop vite. Le vent du milieu lui arrache son gaz, qui traîne derrière elle en longs tentacules où naissent des étoiles.',
      ground: ['#1e2a40', '#22304a', '#263654'], detail: '#3a5078',
      wall: { base: '#0c1220', top: '#8ae0ff', shape: 'blob', orn: 'bubbles' },
      accent: '#ff8ad8', open: 0.58, dark: 0.3, weather: 'bubbles',
      hazard: { name: 'Gaz arraché', color: '#5a8ac0', dps: 7, slow: 0.3 }, hazardAmt: 0.05,
      decor: [['glowdot', '#ff8ad8'], ['bubble', '#8ae0ff'], ['dot', '#3a5078']],
      resources: { onde: 2, poussiere: 2, seve: 1, ether: 1 },
    },
    {
      id: 'grand_mur', name: 'Grand Mur', region: 'de la Muraille', tags: ['lumiere', 'mineral', 'vide'], scale: 'toile',
      climate: 'Immobile, immense',
      desc: 'Une muraille de galaxies longue d’un milliard d’années-lumière. On marche sur sa crête ; de chaque côté, le vide.',
      ground: ['#2a2a30', '#303038', '#363640'], detail: '#4a4a58',
      wall: { base: '#14141a', top: '#d8d0f0', shape: 'block', orn: 'glow' },
      accent: '#d8d0f0', open: 0.5, dark: 0.2, weather: 'glint',
      hazard: { name: 'Éboulis de galaxies', color: '#6a6a88', dps: 8, slow: 0.3 }, hazardAmt: 0.05,
      decor: [['glowdot', '#d8d0f0'], ['rubble', '#4a4a58'], ['glowdot', '#fff0c0']],
      resources: { minerai: 2, fil: 2, poussiere: 2, onde: 1 },
    },
    {
      id: 'brouillon', name: 'Le Brouillon', region: 'du Brouillon', tags: ['sombre', 'artificiel', 'vide'], scale: 'pli',
      climate: 'Recommencé', desc: 'Des univers raturés, recommencés, abandonnés. Sous les ratures, certains respirent encore.',
      ground: ['#e8e4d8', '#ece8dc', '#f0ece0'], detail: '#9a968a',
      wall: { base: '#c8c2b0', top: '#f6f2e6', shape: 'shard', orn: 'cracks' },
      accent: '#1c2230', open: 0.6, dark: 0.1, weather: 'ash',
      hazard: { name: 'Gribouillis', color: '#2a2a34', dps: 10, slow: 0.35 }, hazardAmt: 0.06,
      decor: [['vein', '#3a3a44'], ['dot', '#9a968a'], ['glitch', '#c8322c']],
      resources: { encre: 3, fibre: 2, blanc: 1, neant: 0.8 },
    },
  ];
  NEW_BIOMES.forEach((b) => { b.index = D.BIOMES.length; D.BIOMES.push(b); D.BIOME[b.id] = b; });

  /* =================== Créatures renommées, et réparties =================== */
  const R = (id, p) => patch(D.CREATURE, id, p);
  R('lunaire', { name: 'Lunambule' });
  R('comete_naine', { name: 'Cométule' });
  R('devoreur', { name: 'Ventre-noir' });
  R('chasseur_lumiere', { name: 'Happe-photons' });
  R('gardien_bras', { name: 'Le Phare du bras' });
  R('arpenteur', { name: 'Géomètre', desc: 'Il ne quitte jamais un filament : il le mesure. Il y court plus vite que la lumière qui le porte.' });
  R('mangeur_vide', { name: 'Buveur de vide' });
  if (D.CREATURE.noeud_vivant) D.CREATURE.noeud_vivant.art = Object.assign({}, D.CREATURE.noeud_vivant.art, { shape: 'knot', loops: 6 });
  // dans l'Amas, la Toile et le Pli, chaque biome a ses créatures
  const where = {
    galaxion: ['galaxie_naine', 'galaxie_meduse'], agnelet: ['pont_sombre', 'galaxie_naine'], loup_sombre: ['pont_sombre'],
    ricocheur: ['front_collision'], chien_amas: ['pont_sombre', 'galaxie_naine'], onde_vivante: ['front_collision', 'galaxie_meduse'],
    fileuse: ['filament_lumiere', 'grand_mur'], perle_rosee: ['filament_lumiere', 'bord_vide'], arpenteur: ['grand_mur', 'noeud_toile', 'filament_lumiere'],
    mangeur_vide: ['bord_vide'], veilleuse_trame: ['filament_lumiere', 'noeud_toile'], noeud_vivant: ['noeud_toile', 'bord_vide'],
    cocotte: ['envers', 'marge'], tache: ['brouillon', 'envers'], rature: ['brouillon', 'marge'], marque_page: ['marge', 'coeur_pli'],
    gardien_marge: ['marge', 'envers'], oeil_blanc: ['coeur_pli', 'brouillon', 'envers'],
  };
  for (const id in where) if (D.CREATURE[id]) D.CREATURE[id].biomes = where[id];
  // les maîtres et les grands êtres de chaque échelon vivent aussi dans ses nouveaux biomes
  const also = { orbite: 'lune_soufre', systeme: 'naine_brune', galaxie: 'remanent', amas: 'galaxie_meduse', toile: 'grand_mur', pli: 'brouillon' };
  D.CREATURES.forEach((c) => { if (c.scale && also[c.scale] && c.tier >= 5 && !c.biomes.includes(also[c.scale])) c.biomes.push(also[c.scale]); });
  ['requin_vide'].forEach((id) => D.CREATURE[id] && D.CREATURE[id].biomes.push('lune_soufre'));

  /* =================== Nouvelles créatures =================== */
  const C = [
    /* ---------------- Orbite ---------------- */
    { id: 'asteropode', name: 'Astéropode', tier: 0, scale: 'orbite', biomes: ['ceinture_asteroides'],
      r: 11, hp: 62, armor: 0.15, speed: 60, temper: 'territorial', move: 'walk', attack: { type: 'bite', dmg: 8, cd: 1.2 }, group: [2, 3],
      art: { shape: 'crab', body: '#6a6670', accent: '#c8c4d8', eye: '#ffd25a', eyes: 2 },
      drops: { regolithe: 2, minerai: 1 }, produces: { res: 'minerai', rate: 1.2 }, roles: ['porteur', 'producteur'],
      desc: 'Un astéroïde qui s’est trouvé des pattes. Il ne sait pas encore très bien quoi en faire.' },
    { id: 'patineur_anneau', name: 'Patineur d’anneau', tier: 1, scale: 'orbite', biomes: ['anneau_glace'],
      r: 18, hp: 180, speed: 150, temper: 'agressif', move: 'drift', attack: { type: 'charge', dmg: 18, cd: 2.2, windup: 0.45, speed: 600, dist: 360 }, group: [1, 2],
      art: { shape: 'ray', body: '#d8eaf8', accent: '#7fb8ff', eye: '#1c2230', eyes: 2 },
      drops: { givre: 3, ether: 1 }, roles: ['combat', 'eclaireur'],
      desc: 'Il file sur la glace de l’anneau sans jamais toucher deux fois le même éclat.' },
    { id: 'regolitaupe', name: 'Régolitaupe', tier: 0, scale: 'orbite', biomes: ['mer_regolithe'],
      r: 10, hp: 52, speed: 80, temper: 'craintif', move: 'burrow', attack: null, group: [1, 3],
      art: { shape: 'quad', body: '#a09a92', accent: '#e8e2d6', eye: '#1c2230', eyes: 2, ears: true },
      drops: { regolithe: 2, verre: 1 }, produces: { res: 'verre', rate: 1 }, roles: ['producteur', 'eclaireur'],
      desc: 'Elle creuse la poussière de la lune, qui se referme derrière elle sans laisser de trace.' },
    { id: 'sonde_perdue', name: 'Sonde perdue', tier: 0, scale: 'orbite', biomes: ['epave_orbitale'],
      r: 11, hp: 50, speed: 85, temper: 'passif', move: 'drift', attack: null, traits: ['glow'], group: [1, 2],
      art: { shape: 'satellite', body: '#b8bcc8', accent: '#3a6ad0', eye: '#4fd8f0', eyes: 1, glow: '#4fd8f0' },
      drops: { ferraille: 2, etincelle: 1, ether: 0.3 }, produces: { res: 'etincelle', rate: 1 }, roles: ['eclaireur', 'soutien'],
      desc: 'Elle émet encore, toutes les quatre-vingt-dix minutes, un message que personne n’attend plus.' },
    { id: 'soufrelin', name: 'Soufrelin', tier: 0, scale: 'orbite', biomes: ['lune_soufre'],
      r: 8, hp: 44, speed: 75, temper: 'craintif', move: 'drift', attack: null, traits: ['glow'], group: [3, 6],
      art: { shape: 'orb', body: '#f2d23a', accent: '#ffffff', eye: '#6a5a1a', eyes: 1, glow: '#f2d23a' },
      drops: { braise: 1, regolithe: 1 }, produces: { res: 'braise', rate: 1.3 }, roles: ['producteur'],
      desc: 'Un flocon de soufre qui n’est jamais retombé. Il sent l’œuf et la poudre.' },
    { id: 'geysard', name: 'Geysard', tier: 1, scale: 'orbite', biomes: ['lune_soufre'],
      r: 17, hp: 195, speed: 70, temper: 'territorial', move: 'walk', attack: { type: 'spit', dmg: 15, cd: 2, range: 320, radius: 42, life: 3.5, color: '#f2a23a' }, traits: ['glow'], group: [1, 2],
      art: { shape: 'snail', body: '#c8a030', accent: '#ff7a1a', eye: '#1c2230', eyes: 2, shell: '#6a4a14', glow: '#ff9a3a' },
      drops: { magma: 1, braise: 3 }, roles: ['combat', 'porteur'],
      desc: 'Il a une cheminée sur le dos. Ce qui en sort retombe toujours sur quelqu’un.' },
    { id: 'petrisseur', name: 'Le Pétrisseur', tier: 2, scale: 'orbite', biomes: ['lune_soufre'],
      r: 54, hp: 1250, armor: 0.15, speed: 40, temper: 'agressif', move: 'walk', traits: ['glow'],
      art: { shape: 'golem', body: '#8a6a20', accent: '#f2d23a', eye: '#ff5a1f', eyes: 2, glow: '#f2d23a', craters: true },
      phases: [
        { at: 1, speed: 40, patterns: [{ type: 'slam', dmg: 22, radius: 150, windup: 1 }, { type: 'pools', count: 4, radius: 56, dps: 16, color: '#d8641a' }] },
        { at: 0.6, speed: 48, patterns: [{ type: 'shockwave', dmg: 20, speed: 260, count: 3 }, { type: 'rain', count: 8, radius: 58, dmg: 18, windup: 1.1, color: '#f2d23a' }, { type: 'summon', species: 'soufrelin', count: 3 }] },
        { at: 0.3, speed: 56, patterns: [{ type: 'pull', dur: 2.4, force: 280, dmg: 12 }, { type: 'slam', dmg: 26, radius: 170, windup: 0.9 }, { type: 'pools', count: 6, radius: 60, dps: 18, color: '#d8641a' }] },
      ],
      drops: { braise: 10, regolithe: 8, magma: 4, essence: 1 }, produces: { res: 'braise', rate: 4 }, roles: ['combat'],
      power: { name: 'Marées de roche', desc: '+12 % de dégâts au corps à corps', stat: { meleeDmg: 0.12 } },
      desc: 'La force qui pétrit cette lune a fini par prendre forme. Chaque fois qu’elle serre, un geyser s’ouvre.' },

    /* ---------------- Système ---------------- */
    { id: 'coulee_vive', name: 'Coulée-vive', tier: 0, scale: 'systeme', biomes: ['couronne_solaire'],
      r: 9, hp: 50, speed: 65, temper: 'territorial', move: 'walk', attack: { type: 'bite', dmg: 9, cd: 1.2 }, traits: ['glow'], group: [2, 4],
      art: { shape: 'blob', body: '#ff7a1a', accent: '#ffe14d', eye: '#3a1a0a', eyes: 2, glow: '#ff9a3a' },
      drops: { braise: 2, plasma: 0.5 }, produces: { res: 'braise', rate: 1.5 }, roles: ['producteur', 'combat'],
      desc: 'Une goutte de sol fondu qui a décidé de partir. Elle refroidit si elle s’arrête : elle ne s’arrête pas.' },
    { id: 'montgolfiere', name: 'Montgolfière', tier: 1, scale: 'systeme', biomes: ['geante_gazeuse'],
      r: 22, hp: 200, speed: 55, temper: 'territorial', move: 'drift', attack: { type: 'shoot', dmg: 12, cd: 2.2, speed: 240, count: 4, spread: 0.9, size: 7, color: '#e8d0a8', range: 360 }, group: [1, 2],
      art: { shape: 'balloon', body: '#d8a870', accent: '#8a5a3a', eye: '#1c2230', eyes: 2 },
      drops: { ether: 2, seve: 1 }, roles: ['soutien', 'porteur'],
      desc: 'Une poche de gaz plus léger que les tempêtes. Pour monter, elle lâche du lest : sur vous, de préférence.' },
    { id: 'echevele', name: 'Échevelé', tier: 0, scale: 'systeme', biomes: ['queue_comete'],
      r: 10, hp: 48, speed: 130, temper: 'craintif', move: 'fly', attack: null, traits: ['glow'], group: [2, 4],
      art: { shape: 'comet', body: '#d8f2ff', accent: '#9fe8ff', eye: '#1c2230', eyes: 2, glow: '#bfeaff' },
      drops: { givre: 2, poussiere: 1 }, produces: { res: 'givre', rate: 1.3 }, roles: ['eclaireur', 'producteur'],
      desc: 'Tout en chevelure de glace. Plus il va vite, plus il en perd, et plus il est content.' },
    { id: 'aimantin', name: 'Aimantin', tier: 1, scale: 'systeme', biomes: ['ceinture_fer'],
      r: 17, hp: 210, armor: 0.2, speed: 80, temper: 'agressif', move: 'walk',
      attack: { type: 'shoot', dmg: 11, cd: 1.5, speed: 380, count: 3, spread: 0.25, size: 5, color: '#ff8a5a', range: 340, slow: 0.3 }, group: [1, 2],
      art: { shape: 'orb', body: '#5a4a48', accent: '#ff8a5a', eye: '#ffb347', eyes: 1, swirl: true },
      drops: { ferrite: 3, rouage: 0.3 }, roles: ['combat', 'capture'],
      desc: 'Un cœur de fer qui attire tout ce qui traîne. Il porte une armure de clous qu’il n’a pas choisis.' },
    { id: 'escarbille', name: 'Escarbille', tier: 0, scale: 'systeme', biomes: ['naine_brune'],
      r: 8, hp: 46, speed: 90, temper: 'passif', move: 'drift', attack: null, traits: ['glow'], group: [3, 5],
      art: { shape: 'orb', body: '#a8503a', accent: '#ff9a6a', eye: '#1c2230', eyes: 2, glow: '#e0663a' },
      drops: { braise: 2, plasma: 0.3 }, produces: { res: 'braise', rate: 1.2 }, roles: ['producteur', 'soutien'],
      desc: 'Une braise qui flotte au-dessus de la naine brune. Elle attend un souffle qui ne vient pas.' },
    { id: 'couveur', name: 'Couveur', tier: 1, scale: 'systeme', biomes: ['naine_brune'],
      r: 20, hp: 220, speed: 70, temper: 'territorial', move: 'fly', attack: { type: 'charge', dmg: 19, cd: 2.4, windup: 0.6, speed: 500, dist: 300 }, traits: ['glow'], group: [1, 1],
      art: { shape: 'bird', body: '#4a2a26', accent: '#e0663a', eye: '#ffb347', eyes: 2, owl: true, glow: '#e0663a' },
      drops: { braise: 2, plasma: 1, obsidienne: 0.4 }, roles: ['combat', 'soutien'],
      desc: 'Il couve la naine brune comme un œuf, ailes ouvertes. Il est sûr qu’elle finira par éclore.' },
    { id: 'allumeur', name: 'L’Allumeur', tier: 2, scale: 'systeme', biomes: ['naine_brune'],
      r: 52, hp: 1300, speed: 45, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'candle', body: '#3a2220', accent: '#ffd25a', eye: '#ff9a6a', eyes: 2, wicks: 3, glow: '#ff9a3a' },
      phases: [
        { at: 1, speed: 45, patterns: [{ type: 'aimed', count: 5, spread: 0.5, speed: 340, dmg: 12, color: '#ffd25a', bursts: 2 }, { type: 'rain', count: 7, radius: 56, dmg: 18, windup: 1.2, color: '#ff9a3a' }] },
        { at: 0.6, speed: 52, patterns: [{ type: 'laser', dur: 2.6, sweep: 2.4, dmg: 34, color: '#ffd25a' }, { type: 'summon', species: 'escarbille', count: 4 }, { type: 'pools', count: 4, radius: 54, dps: 14, color: '#e0663a' }] },
        { at: 0.3, speed: 60, patterns: [{ type: 'spiral', arms: 5, dur: 2.6, speed: 210, dmg: 12, color: '#ffd25a' }, { type: 'rain', count: 12, radius: 60, dmg: 20, windup: 1, color: '#ff9a3a' }, { type: 'laser', dur: 2.4, sweep: 3.2, dmg: 36, color: '#ffffff', beams: 2 }] },
      ],
      drops: { braise: 10, plasma: 6, obsidienne: 2, essence: 1 }, produces: { res: 'plasma', rate: 2 }, roles: ['combat', 'soutien'],
      power: { name: 'Mèche patiente', desc: '+10 % de dégâts à distance', stat: { rangedDmg: 0.1 } },
      desc: 'Il essaie d’allumer la naine brune depuis le début des temps. Il a juré d’y arriver ; il commencera par vous.' },

    /* ---------------- Galaxie ---------------- */
    { id: 'protetoile', name: 'Protétoile', tier: 0, scale: 'galaxie', biomes: ['nebuleuse'],
      r: 9, hp: 54, speed: 40, temper: 'passif', move: 'drift', attack: null, traits: ['glow', 'heal'], group: [2, 4],
      art: { shape: 'orb', body: '#ffd8f8', accent: '#ff9ae8', eye: '#3a2450', eyes: 2, glow: '#ff9ae8', swirl: true },
      drops: { poussiere: 2, seve: 1 }, produces: { res: 'poussiere', rate: 1.5 }, roles: ['soutien', 'producteur'],
      desc: 'Une étoile qui n’est pas encore née. Elle dort enroulée dans son gaz et soigne ce qui s’approche.' },
    { id: 'banc_etoiles', name: 'Banc d’étoiles', tier: 0, scale: 'galaxie', biomes: ['bras_etoiles'],
      r: 7, hp: 40, speed: 120, temper: 'craintif', move: 'drift', attack: null, traits: ['glow'], group: [4, 7],
      art: { shape: 'fish', body: '#fff0c0', accent: '#ffffff', eye: '#1c2230', eyes: 1, glow: '#fff0c0' },
      drops: { poussiere: 1, plasma: 0.3 }, produces: { res: 'poussiere', rate: 1.2 }, roles: ['eclaireur', 'producteur'],
      desc: 'Elles nagent ensemble dans le courant, et tournent toutes en même temps sans qu’on sache qui décide.' },
    { id: 'lentille', name: 'Lentille', tier: 1, scale: 'galaxie', biomes: ['halo_sombre'],
      r: 18, hp: 210, speed: 100, temper: 'agressif', move: 'blink',
      attack: { type: 'shoot', dmg: 13, cd: 1.6, speed: 420, count: 2, spread: 0.15, size: 6, color: '#8a8aff', range: 380 }, traits: ['glow'], group: [1, 2],
      art: { shape: 'orb', body: '#14142a', accent: '#8a8aff', eye: '#ffffff', eyes: 1, swirl: true, glow: '#8a8aff' },
      drops: { poussiere: 2, cristal: 0.3, matiere_noire: 0.15 }, roles: ['combat', 'eclaireur'],
      desc: 'On ne la voit pas. On voit seulement les étoiles qui, derrière elle, se tordent en anneau.' },
    { id: 'doyenne', name: 'Doyenne', tier: 0, scale: 'galaxie', biomes: ['coeur_galactique'],
      r: 13, hp: 80, armor: 0.15, speed: 30, temper: 'passif', move: 'drift', attack: null, traits: ['glow'], group: [1, 3],
      art: { shape: 'star', body: '#ff8a5a', accent: '#ffd0a0', eye: '#3a1a0a', eyes: 2, glow: '#ff8a5a' },
      drops: { plasma: 1, poussiere: 2 }, produces: { res: 'plasma', rate: 0.8 }, roles: ['soutien', 'porteur'],
      desc: 'Une très vieille étoile rouge, gonflée et lente. Elle a vu naître le bulbe et compte bien le voir finir.' },
    { id: 'cendre_etoile', name: 'Cendre d’étoile', tier: 0, scale: 'galaxie', biomes: ['remanent'],
      r: 8, hp: 46, speed: 85, temper: 'craintif', move: 'drift', attack: null, traits: ['glow'], group: [3, 5],
      art: { shape: 'nebula', body: '#5a3a7a', accent: '#7ae8d8', eye: '#ffffff', eyes: 1, glow: '#7ae8d8' },
      drops: { poussiere: 2, cristal: 0.2 }, produces: { res: 'poussiere', rate: 1.3 }, roles: ['producteur'],
      desc: 'Ce qui reste d’une étoile après l’explosion. Les étoiles qui naîtront ici en seront faites.' },
    { id: 'pulsard', name: 'Pulsard', tier: 1, scale: 'galaxie', biomes: ['remanent'],
      r: 16, hp: 200, speed: 115, temper: 'agressif', move: 'fly',
      attack: { type: 'shoot', dmg: 12, cd: 1.3, speed: 520, count: 2, spread: 3.14, size: 5, color: '#7ae8d8', range: 420 }, traits: ['glow'], group: [1, 2],
      art: { shape: 'pulsar', body: '#c8f0ff', accent: '#7ae8d8', eye: '#1c2230', eyes: 2, spin: 4, glow: '#7ae8d8' },
      drops: { plasma: 1, cristal: 0.4 }, roles: ['combat'],
      desc: 'Il tourne sur lui-même mille fois par seconde et balaie le ciel de deux faisceaux. Ne restez pas dans l’axe.' },
    { id: 'coquille', name: 'La Coquille', tier: 2, scale: 'galaxie', biomes: ['remanent'],
      r: 56, hp: 1350, speed: 35, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'nebula', body: '#3a2252', accent: '#7ae8d8', eye: '#ffffff', eyes: 2, glow: '#7ae8d8' },
      phases: [
        { at: 1, speed: 35, patterns: [{ type: 'shockwave', dmg: 20, speed: 260, count: 3 }, { type: 'radial', n: 18, speed: 200, dmg: 12, color: '#7ae8d8' }] },
        { at: 0.6, speed: 40, patterns: [{ type: 'shockwave', dmg: 22, speed: 300, count: 4 }, { type: 'summon', species: 'pulsard', count: 2 }, { type: 'spiral', arms: 4, dur: 2.4, speed: 200, dmg: 12, color: '#ff8ac8' }] },
        { at: 0.3, speed: 46, patterns: [{ type: 'radial', n: 30, speed: 230, dmg: 13, color: '#7ae8d8' }, { type: 'shockwave', dmg: 26, speed: 340, count: 5 }, { type: 'laser', dur: 2.6, sweep: 3.6, dmg: 38, color: '#ffffff', beams: 2 }] },
      ],
      drops: { poussiere: 12, plasma: 6, cristal: 2, essence: 1 }, produces: { res: 'poussiere', rate: 4 }, roles: ['combat'],
      power: { name: 'Souffle de l’explosion', desc: '+8 % de vitesse de déplacement', stat: { speed: 0.08 } },
      desc: 'L’enveloppe d’une étoile morte, qui s’étend encore. Elle n’a pas fini d’exploser ; elle prend son temps.' },

    /* ---------------- Amas ---------------- */
    { id: 'brebis_egaree', name: 'Brebis égarée', tier: 0, scale: 'amas', biomes: ['pont_sombre'], rarity: 1,
      r: 12, hp: 72, speed: 55, temper: 'craintif', move: 'walk', attack: null, traits: ['glow'], group: [1, 1],
      art: { shape: 'quad', body: '#2a2244', accent: '#c8b8ff', eye: '#fff0c0', eyes: 2, fluffy: true, ears: true, glow: '#9a7ae8' },
      drops: { poussiere: 2, onde: 1, matiere_noire: 0.1 }, produces: { res: 'onde', rate: 0.6 }, roles: ['soutien'],
      desc: 'Celle qui manque toujours au compte du Berger. Elle se cache dans les galaxies fantômes, où il ne regarde jamais.' },
    { id: 'barreur', name: 'Barreur', tier: 1, scale: 'amas', biomes: ['galaxie_naine'],
      r: 18, hp: 215, speed: 95, temper: 'territorial', move: 'drift',
      attack: { type: 'shoot', dmg: 12, cd: 1.7, speed: 400, count: 3, spread: 0.5, size: 6, color: '#fff0c0', range: 380 }, traits: ['glow'], group: [1, 2],
      art: { shape: 'spiral', body: '#9a8ae8', accent: '#fff0c0', eye: '#ffffff', eyes: 1, glow: '#c8b8ff' },
      drops: { onde: 1, poussiere: 2, plasma: 0.5 }, roles: ['combat', 'eclaireur'],
      desc: 'Il tient la barre de la spirale. Tant qu’il la tient, les bras tournent dans le bon sens.' },
    { id: 'etincelle_maree', name: 'Étincelle de marée', tier: 0, scale: 'amas', biomes: ['front_collision'],
      r: 8, hp: 50, speed: 120, temper: 'craintif', move: 'fly', attack: null, traits: ['glow'], group: [3, 6],
      art: { shape: 'comet', body: '#ff9ac8', accent: '#ffffff', eye: '#1c2230', eyes: 1, glow: '#ff9ac8' },
      drops: { plasma: 1, onde: 0.3 }, produces: { res: 'plasma', rate: 0.8 }, roles: ['eclaireur', 'producteur'],
      desc: 'Une étoile éjectée par la collision, au bout d’une longue queue de marée. Elle ne sait plus à quelle galaxie elle appartient.' },
    { id: 'polype', name: 'Polype d’étoiles', tier: 0, scale: 'amas', biomes: ['galaxie_meduse'],
      r: 9, hp: 58, speed: 45, temper: 'passif', move: 'drift', attack: null, traits: ['glow'], group: [2, 5],
      art: { shape: 'jelly', body: '#8ae0ff', accent: '#ff8ad8', eye: '#1c2230', eyes: 2, glow: '#8ae0ff' },
      drops: { seve: 1, poussiere: 1, onde: 0.5 }, produces: { res: 'seve', rate: 1 }, roles: ['producteur', 'soutien'],
      desc: 'Il pousse au bout des tentacules de gaz. Un jour, il se détache, et devient un amas d’étoiles.' },
    { id: 'tentacule', name: 'Tentacule errant', tier: 1, scale: 'amas', biomes: ['galaxie_meduse'],
      r: 19, hp: 220, speed: 105, temper: 'agressif', move: 'slither', attack: { type: 'bite', dmg: 17, cd: 0.9 }, traits: ['glow'], group: [1, 2],
      art: { shape: 'serpent', body: '#5a8ac0', accent: '#ff8ad8', eye: '#ffffff', eyes: 2, segs: 12, glow: '#8ae0ff' },
      drops: { onde: 1, seve: 1, ether: 0.5 }, roles: ['combat', 'capture'],
      desc: 'Arraché à sa méduse par le vent de l’amas, il continue de chasser pour elle.' },
    { id: 'meduse_mere', name: 'La Méduse-mère', tier: 2, scale: 'amas', biomes: ['galaxie_meduse'],
      r: 58, hp: 1450, speed: 40, temper: 'agressif', move: 'drift', traits: ['glow'],
      art: { shape: 'medusa', body: '#3a5078', accent: '#ff8ad8', eye: '#ffffff', eyes: 2, tentacles: 9, glow: '#8ae0ff' },
      phases: [
        { at: 1, speed: 40, patterns: [{ type: 'pull', dur: 2.4, force: 260, dmg: 12 }, { type: 'aimed', count: 7, spread: 0.9, speed: 320, dmg: 12, color: '#ff8ad8', bursts: 2 }] },
        { at: 0.6, speed: 46, patterns: [{ type: 'summon', species: 'polype', count: 4 }, { type: 'rain', count: 9, radius: 58, dmg: 18, windup: 1.1, color: '#8ae0ff' }, { type: 'pull', dur: 2.6, force: 300, dmg: 13 }] },
        { at: 0.3, speed: 52, patterns: [{ type: 'spiral', arms: 6, dur: 2.8, speed: 210, dmg: 12, color: '#ff8ad8' }, { type: 'summon', species: 'tentacule', count: 2 }, { type: 'radial', n: 26, speed: 220, dmg: 12, color: '#8ae0ff' }] },
      ],
      drops: { onde: 10, seve: 6, essence: 1 }, produces: { res: 'onde', rate: 2.5 }, roles: ['soutien', 'capture'],
      power: { name: 'Voile d’étoiles', desc: 'Rayon de capture 10 % plus rapide', stat: { capture: 0.1 } },
      desc: 'Elle traverse l’amas et y perd son gaz, qui se change en étoiles derrière elle. Elle sème plus qu’elle ne fuit.' },

    /* ---------------- Toile ---------------- */
    { id: 'funambule', name: 'Funambule', tier: 0, scale: 'toile', biomes: ['filament_lumiere'],
      r: 9, hp: 54, speed: 110, temper: 'craintif', move: 'walk', attack: null, traits: ['glow'], group: [2, 4],
      art: { shape: 'insect', body: '#e8f4ff', accent: '#bfe2ff', eye: '#1c2230', eyes: 2, legs: 2, glow: '#bfe2ff' },
      drops: { fil: 1, poussiere: 1 }, produces: { res: 'fil', rate: 0.7 }, roles: ['eclaireur', 'producteur'],
      desc: 'Il marche sur le filament, les bras tendus. Il n’a jamais regardé en bas, et en bas il n’y a rien.' },
    { id: 'lacune', name: 'Lacune', tier: 1, scale: 'toile', biomes: ['bord_vide'],
      r: 19, hp: 215, speed: 95, temper: 'agressif', move: 'blink', attack: { type: 'zap', dmg: 15, cd: 1.1, range: 64 }, group: [1, 2],
      art: { shape: 'inkblot', body: '#0a0a12', accent: '#7a7aa8', eye: '#7a7aa8', eyes: 2 },
      drops: { onde: 1, neant: 0.5, matiere_noire: 0.2 }, roles: ['combat'],
      desc: 'Un trou dans le Grand Vide lui-même. Là où elle passe, il manque quelque chose, et on ne sait plus quoi.' },
    { id: 'chute_lente', name: 'Chute-lente', tier: 0, scale: 'toile', biomes: ['noeud_toile'],
      r: 11, hp: 62, speed: 35, temper: 'passif', move: 'drift', attack: null, traits: ['glow'], group: [2, 4],
      art: { shape: 'orb', body: '#ffe8a0', accent: '#ffffff', eye: '#1c2230', eyes: 2, glow: '#ffe8a0' },
      drops: { fil: 1, plasma: 0.5, onde: 0.5 }, produces: { res: 'onde', rate: 0.6 }, roles: ['producteur', 'porteur'],
      desc: 'Elle tombe vers le Grand Attracteur depuis le début de l’univers. Elle a encore le temps.' },
    { id: 'moellon', name: 'Moellon', tier: 0, scale: 'toile', biomes: ['grand_mur'],
      r: 12, hp: 80, armor: 0.25, speed: 40, temper: 'passif', move: 'walk', attack: null, group: [2, 3],
      art: { shape: 'golem', body: '#4a4a58', accent: '#d8d0f0', eye: '#fff0c0', eyes: 1 },
      drops: { minerai: 2, fil: 0.5 }, produces: { res: 'minerai', rate: 1.4 }, roles: ['porteur', 'producteur'],
      desc: 'Une pierre du Grand Mur, faite de mille galaxies tassées. Elle se déplace quand le mur a besoin d’elle ailleurs.' },
    { id: 'creneleur', name: 'Créneleur', tier: 1, scale: 'toile', biomes: ['grand_mur'],
      r: 18, hp: 220, armor: 0.2, speed: 70, temper: 'territorial', move: 'walk',
      attack: { type: 'shoot', dmg: 13, cd: 1.7, speed: 400, count: 3, spread: 0.3, size: 6, color: '#d8d0f0', range: 400 }, group: [1, 2],
      art: { shape: 'construct', body: '#5a5a6a', accent: '#d8d0f0', eye: '#fff0c0', eyes: 1, legs: 2 },
      drops: { minerai: 2, fil: 1, cristal: 0.3 }, roles: ['combat'],
      desc: 'Il taille des créneaux dans la crête du Grand Mur, et tire par chacun d’eux.' },
    { id: 'rempart', name: 'Le Rempart', tier: 2, scale: 'toile', biomes: ['grand_mur'],
      r: 56, hp: 1550, armor: 0.25, speed: 35, temper: 'agressif', move: 'walk', traits: ['glow'],
      art: { shape: 'golem', body: '#3a3a48', accent: '#d8d0f0', eye: '#fff0c0', eyes: 2, glow: '#d8d0f0' },
      phases: [
        { at: 1, speed: 35, patterns: [{ type: 'slam', dmg: 24, radius: 160, windup: 1.1 }, { type: 'aimed', count: 5, spread: 0.5, speed: 360, dmg: 12, color: '#d8d0f0', bursts: 3 }] },
        { at: 0.6, speed: 40, patterns: [{ type: 'summon', species: 'moellon', count: 3 }, { type: 'shockwave', dmg: 22, speed: 280, count: 3 }, { type: 'laser', dur: 2.6, sweep: 2.4, dmg: 34, color: '#d8d0f0' }] },
        { at: 0.3, speed: 46, patterns: [{ type: 'rain', count: 12, radius: 60, dmg: 20, windup: 1, color: '#d8d0f0' }, { type: 'slam', dmg: 28, radius: 190, windup: 0.9 }, { type: 'radial', n: 24, speed: 210, dmg: 12, color: '#fff0c0' }] },
      ],
      drops: { minerai: 12, fil: 6, essence: 1 }, produces: { res: 'minerai', rate: 4 }, roles: ['combat', 'porteur'],
      power: { name: 'Crête du monde', desc: '+20 PV maximum', stat: { hp: 20 } },
      desc: 'La partie du Grand Mur qui s’est levée. Elle ne laisse rien passer d’un côté à l’autre, pas même le vide.' },

    /* ---------------- Pli ---------------- */
    { id: 'renard_plie', name: 'Renard plié', tier: 1, scale: 'pli', biomes: ['envers'],
      r: 16, hp: 200, speed: 150, temper: 'agressif', move: 'walk', attack: { type: 'bite', dmg: 17, cd: 0.85 }, group: [1, 2],
      art: { shape: 'origami', body: '#f7f6f2', accent: '#c8322c', eye: '#1c2230', eyes: 2 },
      drops: { fibre: 2, encre: 1, blanc: 0.2 }, roles: ['combat', 'eclaireur'],
      desc: 'Plié d’une seule feuille, sans coller ni couper. Quand il court, on entend le papier.' },
    { id: 'annotation', name: 'Annotation', tier: 0, scale: 'pli', biomes: ['marge'],
      r: 8, hp: 50, speed: 80, temper: 'craintif', move: 'slither', attack: null, group: [2, 4],
      art: { shape: 'serpent', body: '#2a2a34', accent: '#c8322c', eye: '#ffffff', eyes: 1, segs: 7 },
      drops: { encre: 2 }, produces: { res: 'encre', rate: 0.6 }, roles: ['eclaireur', 'producteur'],
      desc: 'Une petite note écrite à la main dans la marge. Elle commente tout ce que vous faites, sans qu’on puisse la lire.' },
    { id: 'onglet', name: 'Onglet', tier: 0, scale: 'pli', biomes: ['coeur_pli'],
      r: 10, hp: 60, speed: 70, temper: 'passif', move: 'hop', attack: null, group: [1, 3],
      art: { shape: 'origami', body: '#ecebe6', accent: '#2346c8', eye: '#1c2230', eyes: 2 },
      drops: { fibre: 1, blanc: 0.15 }, produces: { res: 'fibre', rate: 1 }, roles: ['soutien'],
      desc: 'Un coin de page corné, qui garde l’endroit où l’univers s’est plié. Il saute d’un pli à l’autre.' },
    { id: 'gribouille', name: 'Gribouille', tier: 0, scale: 'pli', biomes: ['brouillon'],
      r: 10, hp: 60, speed: 100, temper: 'territorial', move: 'walk', attack: { type: 'bite', dmg: 9, cd: 1 }, group: [2, 4],
      art: { shape: 'knot', body: '#1c2230', accent: '#3a3a44', eye: '#ffffff', eyes: 2, loops: 5 },
      drops: { encre: 2, fibre: 1 }, produces: { res: 'encre', rate: 0.8 }, roles: ['combat', 'producteur'],
      desc: 'Un gribouillis qui a trouvé des jambes. Il s’emmêle quand il s’énerve, ce qui arrive souvent.' },
    { id: 'croquis', name: 'Croquis', tier: 1, scale: 'pli', biomes: ['brouillon'],
      r: 18, hp: 210, speed: 130, temper: 'agressif', move: 'walk', attack: { type: 'charge', dmg: 20, cd: 2.2, speed: 540, windup: 0.6, dist: 320 }, group: [1, 2],
      art: { shape: 'wraith', body: '#e8e4d8', accent: '#1c2230', eye: '#c8322c', eyes: 2 },
      drops: { encre: 2, blanc: 0.2, neant: 0.3 }, roles: ['combat'],
      desc: 'Le premier jet d’une bête qu’on n’a jamais terminée. Il lui manque des pattes, pas les dents.' },
    { id: 'esquisse', name: 'L’Esquisse', tier: 2, scale: 'pli', biomes: ['brouillon'],
      r: 54, hp: 1550, speed: 50, temper: 'agressif', move: 'walk',
      art: { shape: 'hydra', body: '#e8e4d8', accent: '#1c2230', eye: '#c8322c', eyes: 2, heads: 3 },
      phases: [
        { at: 1, speed: 50, patterns: [{ type: 'blink' }, { type: 'aimed', count: 6, spread: 0.7, speed: 360, dmg: 12, color: '#1c2230', bursts: 2 }] },
        { at: 0.6, speed: 56, patterns: [{ type: 'summon', species: 'gribouille', count: 4 }, { type: 'pools', count: 5, radius: 56, dps: 16, color: '#2a2a34' }, { type: 'charge', dmg: 26, speed: 560, windup: 0.8 }] },
        { at: 0.3, speed: 62, patterns: [{ type: 'blink' }, { type: 'radial', n: 28, speed: 220, dmg: 13, color: '#1c2230' }, { type: 'laser', dur: 2.6, sweep: 3.2, dmg: 38, color: '#c8322c', beams: 2 }] },
      ],
      drops: { encre: 12, blanc: 2, essence: 1 }, produces: { res: 'encre', rate: 3 }, roles: ['combat'],
      power: { name: 'Trait sûr', desc: '−6 % de dégâts reçus', stat: { armor: 0.06 } },
      desc: 'L’ébauche d’un dévoreur de mondes, abandonnée en cours de route. Elle cherche qui l’a commencée, pour qu’on la finisse.' },
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
    asteropode: { ability: 'seisme', keys: ['fouisseur'] },
    patineur_anneau: { ability: 'gel', keys: ['vol'], mount: M(340, true), diet: { res: 'givre', period: 18, n: 1 } },
    regolitaupe: { ability: 'seisme', keys: ['fouisseur'] },
    sonde_perdue: { ability: 'vision', keys: ['conduction', 'vol'], breed: 0 },
    soufrelin: { ability: 'flammes', keys: ['feu'] },
    geysard: { ability: 'flammes', keys: ['feu', 'fouisseur'], mount: M(220), diet: { res: 'braise', period: 20, n: 1 } },
    petrisseur: { ability: 'seisme', keys: ['feu', 'fouisseur'], mount: M(220), diet: { res: 'braise', period: 12, n: 2 } },
    coulee_vive: { ability: 'flammes', keys: ['feu'] },
    montgolfiere: { ability: 'nuage', keys: ['vol'], mount: M(240, true), diet: { res: 'ether', period: 20, n: 1 } },
    echevele: { ability: 'saut', keys: ['vol', 'lumiere'] },
    aimantin: { ability: 'entrave', keys: ['conduction', 'fouisseur'], mount: M(250), diet: { res: 'ferrite', period: 18, n: 1 } },
    escarbille: { ability: 'soin', keys: ['feu', 'lumiere'] },
    couveur: { ability: 'bouclier', keys: ['vol', 'feu'], mount: M(300, true), diet: { res: 'braise', period: 18, n: 2 } },
    allumeur: { ability: 'flammes', keys: ['feu', 'lumiere'], diet: { res: 'plasma', period: 12, n: 2 } },
    protetoile: { ability: 'soin', keys: ['lumiere'] },
    banc_etoiles: { ability: 'essaim', keys: ['vol', 'lumiere'] },
    lentille: { ability: 'vision', keys: ['lumiere', 'resonance'], mount: M(300, true), diet: { res: 'poussiere', period: 18, n: 2 } },
    doyenne: { ability: 'bouclier', keys: ['feu', 'lumiere'] },
    cendre_etoile: { ability: 'vision', keys: ['lumiere'] },
    pulsard: { ability: 'rayon', keys: ['lumiere', 'conduction'], mount: M(320, true), diet: { res: 'plasma', period: 18, n: 1 } },
    coquille: { ability: 'vague', keys: ['lumiere', 'vol'], diet: { res: 'poussiere', period: 12, n: 3 } },
    brebis_egaree: { ability: 'cri', keys: ['lumiere', 'fouisseur'], breed: 0.3 },
    barreur: { ability: 'arc', keys: ['lumiere', 'vol'], mount: M(300, true), diet: { res: 'onde', period: 18, n: 1 } },
    etincelle_maree: { ability: 'saut', keys: ['vol', 'feu'] },
    polype: { ability: 'soin', keys: ['nage', 'lumiere'] },
    tentacule: { ability: 'entrave', keys: ['nage', 'vol'], mount: M(320), diet: { res: 'seve', period: 18, n: 2 } },
    meduse_mere: { ability: 'nuage', keys: ['nage', 'vol', 'lumiere'], diet: { res: 'seve', period: 12, n: 3 } },
    funambule: { ability: 'saut', keys: ['vol', 'lumiere'] },
    lacune: { ability: 'entrave', keys: ['vol', 'lumiere'], diet: { res: 'neant', period: 30, n: 1 } },
    chute_lente: { ability: 'bouclier', keys: ['lumiere'] },
    moellon: { ability: 'bouclier', keys: ['fouisseur', 'resonance'] },
    creneleur: { ability: 'rayon', keys: ['fouisseur', 'conduction'], mount: M(240), diet: { res: 'minerai', period: 18, n: 2 } },
    rempart: { ability: 'bouclier', keys: ['fouisseur', 'resonance'], mount: M(210), diet: { res: 'minerai', period: 12, n: 3 } },
    renard_plie: { ability: 'ruee', keys: ['vol', 'fouisseur'], mount: M(340), diet: { res: 'fibre', period: 18, n: 2 } },
    annotation: { ability: 'vision', keys: ['lumiere'] },
    onglet: { ability: 'saut', keys: ['vol'] },
    gribouille: { ability: 'entrave', keys: ['acide'] },
    croquis: { ability: 'rage', keys: ['vol', 'acide'], mount: M(330), diet: { res: 'encre', period: 18, n: 2 } },
    esquisse: { ability: 'rage', keys: ['acide', 'vol'], diet: { res: 'encre', period: 12, n: 3 } },
  });

  /* =================== Astres =================== */
  // noun : ce que l'on voit dans le ciel de l'Archive, suivi du nom propre (« Lune grise de Nylombe »)
  const A = (id, p) => patch(D.ASTRES, id, p);
  A('ceinture_asteroides', { noun: 'Planétoïde' });
  A('anneau_glace', { noun: 'Anneau' });
  A('mer_regolithe', { noun: 'Lune grise' });
  A('epave_orbitale', { noun: 'Station' });
  A('couronne_solaire', { kind: 'tison', name: 'Planète-tison', noun: 'Planète-tison' });
  A('geante_gazeuse', { noun: 'Géante' });
  A('queue_comete', { noun: 'Comète' });
  A('ceinture_fer', { name: 'Planète éventrée', noun: 'Planète éventrée' });
  A('nebuleuse', { noun: 'Nébuleuse' });
  A('bras_etoiles', { name: 'Courant stellaire', noun: 'Courant stellaire' });
  A('halo_sombre', { noun: 'Halo' });
  A('coeur_galactique', { kind: 'bulbe', name: 'Bulbe galactique', noun: 'Bulbe' });
  A('pont_sombre', { name: 'Galaxie fantôme', noun: 'Galaxie fantôme' });
  A('galaxie_naine', { name: 'Spirale barrée', noun: 'Spirale barrée' });
  A('front_collision', { name: 'Galaxies en fusion', noun: 'Collision' });
  A('filament_lumiere', { name: 'Filament de galaxies', noun: 'Filament' });
  A('bord_vide', { name: 'Bulle de vide', noun: 'Vide' });
  A('noeud_toile', { name: 'Grand Attracteur', noun: 'Attracteur' });
  Object.assign(D.ASTRES, {
    lune_soufre: { kind: 'lune', name: 'Lune de soufre', noun: 'Lune jaune', layer: 'orbite', stat: { meleeDmg: 0.06 }, desc: '+6 % de dégâts au corps à corps.' },
    naine_brune: { kind: 'naine', name: 'Naine brune', noun: 'Naine brune', layer: 'systeme', stat: { armor: 0.04 }, desc: '−4 % de dégâts reçus.' },
    remanent: { kind: 'pulsar', name: 'Pulsar', noun: 'Pulsar', layer: 'galaxie', stat: { rangedDmg: 0.1 }, desc: '+10 % de dégâts à distance.' },
    galaxie_meduse: { kind: 'meduse', name: 'Galaxie-méduse', noun: 'Galaxie-méduse', layer: 'amas', stat: { capture: 0.08 }, desc: 'Capture 8 % plus rapide.' },
    grand_mur: { kind: 'mur', name: 'Grand Mur', noun: 'Grand Mur', layer: 'toile', stat: { hp: 15 }, desc: '+15 PV maximum.' },
  });
})();
