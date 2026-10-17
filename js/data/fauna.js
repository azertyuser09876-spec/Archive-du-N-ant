/* Nouvelle faune des régions (1.3) : 19 espèces qui peuplent les biomes les
   moins fournis, avec six nouvelles formes dessinées (grenouille, oiseau,
   escargot, crabe, raie, scorpion ; voir render/faunaArt.js).
   Données pures, même format que creatures.js. Le Veilleur du Seuil ne vit que
   dans le monde du tutoriel (biomes vides, champ « unique »). */
(function () {
  'use strict';
  const D = window.AN.Data;

  const C = [
    /* ===================== CRÉATURES MINEURES ===================== */
    { id: 'rainevolt', name: 'Rainevolt', tier: 0, biomes: ['marais_electrique', 'jungle_carnivore'],
      r: 7, hp: 18, speed: 110, temper: 'craintif', move: 'hop', attack: null, traits: ['glow'], group: [2, 4],
      art: { shape: 'frog', body: '#5fbf6a', accent: '#7ef0ff', eye: '#1c2230', eyes: 2, glow: '#7ef0ff', pattern: 'spots' },
      drops: { etincelle: 1, seve: 1 }, produces: { res: 'etincelle', rate: 1.1 }, roles: ['producteur', 'combat'],
      desc: 'Son chant fait grésiller l’eau des flaques. On l’entend avant l’orage.' },
    { id: 'plumeneige', name: 'Plumeneige', tier: 0, biomes: ['toundra_givree', 'steppes_orageuses'],
      r: 7, hp: 16, speed: 125, temper: 'craintif', move: 'fly', attack: null, traits: [], group: [2, 5],
      art: { shape: 'bird', body: '#eef4fb', accent: '#8cc6ea', eye: '#1c2230', eyes: 2 },
      drops: { givre: 1, fibre: 1 }, produces: { res: 'givre', rate: 1 }, roles: ['eclaireur', 'producteur'],
      desc: 'Un petit oiseau blanc qui ne se pose que sur la neige fraîche.' },
    { id: 'braisargot', name: 'Braisargot', tier: 0, biomes: ['riviere_lave', 'foret_calcinee'],
      r: 9, hp: 38, armor: 0.2, speed: 32, temper: 'passif', move: 'walk', attack: null, traits: ['glow'], group: [1, 3],
      art: { shape: 'snail', body: '#c9a080', accent: '#ff7a3a', eye: '#1c2230', eyes: 2, glow: '#ff7a3a', shell: '#3a2a24' },
      drops: { braise: 2, obsidienne: 0.2 }, produces: { res: 'braise', rate: 1.1 }, roles: ['producteur', 'porteur'],
      desc: 'Sa coquille garde la chaleur de la coulée où il est né. Il ne refroidit jamais.' },
    { id: 'ossicrabe', name: 'Ossicrabe', tier: 0, biomes: ['desert_osseux', 'desert_verre'],
      r: 8, hp: 26, armor: 0.15, speed: 85, temper: 'territorial', move: 'walk', attack: { type: 'bite', dmg: 4, cd: 1.1 }, traits: [], group: [1, 3],
      art: { shape: 'crab', body: '#e8dcc0', accent: '#a48c64', eye: '#3a2a1a', eyes: 2 },
      drops: { os: 2 }, produces: { res: 'os', rate: 1.1 }, roles: ['producteur', 'combat'],
      desc: 'Il porte un crâne en guise de carapace et change de crâne en grandissant.' },
    { id: 'fourmiel', name: 'Fourmiel', tier: 0, biomes: ['ruche_chitineuse', 'jardins_ambre'],
      r: 6, hp: 14, speed: 95, temper: 'passif', move: 'walk', attack: null, traits: [], group: [3, 6],
      art: { shape: 'insect', body: '#8a4a20', accent: '#ffd25a', eye: '#1c2230', eyes: 2, legs: 3, pattern: 'stripes' },
      drops: { pollen: 1, chitine: 1 }, produces: { res: 'chitine', rate: 0.8 }, roles: ['producteur', 'porteur'], colony: 1.6,
      desc: 'Une fourmi qui stocke le miel dans son propre ventre, pour toute la colonie.' },
    { id: 'raie_sable', name: 'Raie des sables', tier: 0, biomes: ['desert_verre', 'desert_osseux'],
      r: 9, hp: 22, speed: 120, temper: 'craintif', move: 'burrow', attack: null, traits: [], group: [1, 2],
      art: { shape: 'ray', body: '#d8c49a', accent: '#7fd0e0', eye: '#1c2230', eyes: 2 },
      drops: { verre: 2 }, produces: { res: 'verre', rate: 1 }, roles: ['eclaireur', 'producteur'],
      desc: 'Elle nage sous le sable. On ne voit que l’ondulation qui la trahit.' },
    { id: 'filblanc', name: 'Fil-blanc', tier: 0, biomes: ['lisiere_neant'], rarity: 1,
      r: 6, hp: 16, speed: 100, temper: 'craintif', move: 'blink', attack: null, traits: ['glow'], group: [1, 3],
      art: { shape: 'serpent', body: '#f4f4f6', accent: '#2346c8', eye: '#2346c8', eyes: 1, segs: 9, glow: '#cfd6ff' },
      drops: { neant: 0.3, encre: 0.5 }, produces: { res: 'encre', rate: 0.25 }, roles: ['eclaireur'],
      desc: 'Un trait blanc qui se déplace d’un bord à l’autre du néant. Il ne laisse pas d’ombre.' },
    { id: 'nuagelin', name: 'Nuagelin', tier: 0, biomes: ['ocean_suspendu', 'steppes_orageuses'],
      r: 10, hp: 30, speed: 45, temper: 'passif', move: 'drift', attack: null, traits: ['heal'], group: [2, 4],
      art: { shape: 'quad', body: '#f4f6ff', accent: '#9ab8e8', eye: '#1c2230', eyes: 2, fluffy: true },
      drops: { perle: 0.5, fibre: 2 }, produces: { res: 'fibre', rate: 1.2 }, roles: ['soutien', 'producteur'], colony: 1.3,
      desc: 'Un mouton fait de brume, qui flotte au ras de l’eau suspendue. Sa laine apaise les blessures.' },
    { id: 'horlogette', name: 'Horlogette', tier: 0, biomes: ['ruines_mecaniques', 'cite_carbonisee'],
      r: 6, hp: 16, armor: 0.2, speed: 130, temper: 'territorial', move: 'fly',
      attack: { type: 'shoot', dmg: 3, cd: 1.8, speed: 300, count: 1, spread: 0, size: 4, color: '#ffb347', range: 260 }, traits: [], group: [2, 3],
      art: { shape: 'bird', body: '#b08a50', accent: '#ffb347', eye: '#ffb347', eyes: 1, metal: true },
      drops: { ferraille: 1, rouage: 0.25 }, produces: { res: 'rouage', rate: 0.2 }, roles: ['combat', 'eclaireur'],
      desc: 'Un oiseau-automate qui sonne les heures d’une ville disparue.' },

    /* ===================== PRÉDATEURS ===================== */
    { id: 'loup_givre', name: 'Loup de givre', tier: 1, biomes: ['toundra_givree', 'cavernes_cristallines'],
      r: 14, hp: 85, speed: 150, temper: 'agressif', move: 'walk', attack: { type: 'bite', dmg: 9, cd: 1.0 }, traits: [], group: [2, 3],
      art: { shape: 'quad', body: '#dfe9f2', accent: '#7fb8e8', eye: '#2346c8', eyes: 2, tail: true, spikes: 2, ears: true },
      drops: { givre: 3, os: 2 }, produces: { res: 'givre', rate: 1.6 }, roles: ['combat'],
      desc: 'Ils chassent en silence. Leur haleine gèle avant de toucher le sol.' },
    { id: 'heron_foudre', name: 'Héron-foudre', tier: 1, biomes: ['marais_electrique', 'steppes_orageuses'],
      r: 15, hp: 90, speed: 95, temper: 'territorial', move: 'fly',
      attack: { type: 'shoot', dmg: 7, cd: 1.6, speed: 380, count: 2, spread: 0.18, size: 5, color: '#7ef0ff', range: 360 }, traits: ['glow'], group: [1, 1],
      art: { shape: 'bird', body: '#cfd8e0', accent: '#7ef0ff', eye: '#1c2230', eyes: 2, glow: '#7ef0ff', crest: true, long: true },
      drops: { etincelle: 3, seve: 1 }, produces: { res: 'etincelle', rate: 2 }, roles: ['combat', 'eclaireur'],
      desc: 'Il pêche la foudre dans les flaques, le bec tendu vers le ciel.' },
    { id: 'crabe_lave', name: 'Crabe de lave', tier: 1, biomes: ['riviere_lave', 'foret_calcinee'],
      r: 17, hp: 150, armor: 0.3, speed: 60, temper: 'territorial', move: 'walk',
      attack: { type: 'slam', dmg: 13, cd: 2.8, radius: 80, windup: 0.8 }, traits: ['glow'], group: [1, 1],
      art: { shape: 'crab', body: '#4a2e26', accent: '#ff641a', eye: '#ffb347', eyes: 2, glow: '#ff641a', big: true },
      drops: { braise: 3, obsidienne: 0.5 }, produces: { res: 'braise', rate: 2 }, roles: ['combat', 'porteur'],
      desc: 'Ses pinces sont refroidies, son ventre ne l’est pas. Ne le retournez pas.' },
    { id: 'limier_rouille', name: 'Limier de rouille', tier: 1, biomes: ['ruines_mecaniques', 'cite_carbonisee'],
      r: 14, hp: 80, armor: 0.15, speed: 160, temper: 'agressif', move: 'walk', attack: { type: 'bite', dmg: 9, cd: 0.95 }, traits: [], group: [1, 2],
      art: { shape: 'quad', body: '#8a6a4a', accent: '#ffb347', eye: '#ffb347', eyes: 1, tail: true, spikes: 3, ears: true },
      drops: { ferraille: 3, rouage: 0.5 }, produces: { res: 'ferraille', rate: 1.8 }, roles: ['combat'],
      desc: 'Un chien de garde mécanique. Il garde toujours, même ce qui n’existe plus.' },
    { id: 'scorpion_verre', name: 'Scorpion de verre', tier: 1, biomes: ['desert_verre', 'desert_osseux', 'cavernes_cristallines'],
      r: 15, hp: 95, armor: 0.2, speed: 90, temper: 'territorial', move: 'walk',
      attack: { type: 'shoot', dmg: 7, cd: 1.7, speed: 340, count: 2, spread: 0.2, size: 5, color: '#bfefff', range: 320, slow: 0.4 }, traits: [], group: [1, 2],
      art: { shape: 'scorpion', body: '#bfe8f0', accent: '#4fb6e8', eye: '#1c2230', eyes: 2 },
      drops: { verre: 3, cristal: 0.4 }, produces: { res: 'verre', rate: 1.8 }, roles: ['combat'],
      desc: 'Transparent au soleil, invisible à l’ombre. Son dard engourdit.' },
    { id: 'raie_nues', name: 'Raie des nues', tier: 1, biomes: ['ocean_suspendu', 'abysses_lumineuses'],
      r: 18, hp: 100, speed: 115, temper: 'agressif', move: 'drift',
      attack: { type: 'charge', dmg: 13, cd: 2.6, windup: 0.5, speed: 470, dist: 280 }, traits: ['glow'], group: [1, 2],
      art: { shape: 'ray', body: '#3a5a8a', accent: '#ff9ad0', eye: '#ffffff', eyes: 2, glow: '#ff9ad0' },
      drops: { ecaille: 3, perle: 0.6 }, produces: { res: 'ecaille', rate: 1.8 }, roles: ['combat'],
      desc: 'Elle plane entre les îles d’eau et fond sur ce qui brille.' },

    /* ===================== GARDIENS DE ZONE ===================== */
    { id: 'veilleur_seuil', name: 'Veilleur du Seuil', tier: 2, biomes: [], unique: 'seuil',
      r: 34, hp: 320, speed: 40, temper: 'agressif', move: 'fly', traits: ['glow'],
      art: { shape: 'bird', body: '#f3efe2', accent: '#2346c8', eye: '#1c2230', eyes: 2, glow: '#9fb4ff', crest: true, owl: true },
      phases: [
        { at: 1, speed: 40, patterns: [{ type: 'aimed', count: 3, spread: 0.3, speed: 230, dmg: 6, color: '#9fb4ff' }, { type: 'radial', n: 8, speed: 140, dmg: 6, color: '#9fb4ff' }] },
        { at: 0.6, speed: 50, patterns: [{ type: 'charge', dmg: 10, speed: 360, windup: 1.1 }, { type: 'radial', n: 10, speed: 150, dmg: 6, color: '#9fb4ff' }] },
        { at: 0.3, speed: 55, patterns: [{ type: 'spiral', arms: 2, dur: 2, speed: 150, dmg: 6, color: '#9fb4ff' }, { type: 'aimed', count: 3, spread: 0.3, speed: 240, dmg: 6, color: '#9fb4ff', bursts: 2 }] },
      ],
      drops: { seve: 4, fibre: 6, essence: 1 }, produces: { res: 'fibre', rate: 2 }, roles: ['eclaireur', 'combat'],
      power: { name: 'Premier regard', desc: '+10 PV maximum', stat: { hp: 10 } },
      desc: 'Il gardait le premier monde que l’Artefact ait touché. Il a ouvert les yeux en même temps que vous.' },
    { id: 'grand_duc', name: 'Grand-Duc d’orage', tier: 2, biomes: ['marais_electrique', 'steppes_orageuses', 'toundra_givree'],
      r: 44, hp: 820, speed: 55, temper: 'agressif', move: 'fly', traits: ['glow'],
      art: { shape: 'bird', body: '#4a5468', accent: '#7ef0ff', eye: '#ffe14d', eyes: 2, glow: '#7ef0ff', crest: true, owl: true },
      phases: [
        { at: 1, speed: 55, patterns: [{ type: 'aimed', count: 3, spread: 0.25, speed: 380, dmg: 9, color: '#7ef0ff', bursts: 3 }, { type: 'rain', count: 6, radius: 54, dmg: 16, windup: 1.2, color: '#7ef0ff' }] },
        { at: 0.6, speed: 65, patterns: [{ type: 'laser', dur: 2.4, sweep: 2.4, dmg: 28, color: '#7ef0ff' }, { type: 'summon', species: 'gresillon', count: 4 }, { type: 'radial', n: 14, speed: 210, dmg: 9, color: '#7ef0ff' }] },
        { at: 0.3, speed: 75, patterns: [{ type: 'rain', count: 10, radius: 58, dmg: 18, windup: 1, color: '#7ef0ff' }, { type: 'spiral', arms: 4, dur: 2.4, speed: 220, dmg: 9, color: '#7ef0ff' }, { type: 'laser', dur: 2.2, sweep: 3, dmg: 30, color: '#7ef0ff', beams: 2 }] },
      ],
      drops: { etincelle: 12, encre: 1, essence: 1 }, produces: { res: 'etincelle', rate: 4 }, roles: ['combat', 'eclaireur'],
      power: { name: 'Serres patientes', desc: 'Rayon de capture 12 % plus rapide', stat: { capture: 0.12 } },
      desc: 'Quand il ouvre les ailes, l’orage commence. Quand il les ferme, il se tait.' },
    { id: 'crabe_forteresse', name: 'Crabe-Forteresse', tier: 2, biomes: ['riviere_lave', 'desert_osseux', 'desert_verre'],
      r: 48, hp: 900, armor: 0.3, speed: 40, temper: 'agressif', move: 'walk', traits: [],
      art: { shape: 'crab', body: '#6a5446', accent: '#ffb347', eye: '#ff641a', eyes: 2, big: true, towers: true },
      phases: [
        { at: 1, speed: 40, patterns: [{ type: 'slam', dmg: 18, radius: 130, windup: 1 }, { type: 'aimed', count: 4, spread: 0.35, speed: 330, dmg: 9, color: '#ffb347', bursts: 2 }] },
        { at: 0.6, speed: 50, patterns: [{ type: 'charge', dmg: 20, speed: 420, windup: 0.9 }, { type: 'pools', count: 4, radius: 50, dps: 14, color: '#ff641a' }, { type: 'summon', species: 'ossicrabe', count: 3 }] },
        { at: 0.3, speed: 60, patterns: [{ type: 'shockwave', count: 3 }, { type: 'radial', n: 16, speed: 200, dmg: 10, color: '#ffb347' }, { type: 'rain', count: 8, radius: 60, dmg: 18, windup: 1.1, color: '#ff641a' }] },
      ],
      drops: { os: 10, braise: 6, obsidienne: 1, essence: 1 }, produces: { res: 'os', rate: 4 }, roles: ['combat', 'porteur'],
      power: { name: 'Carapace-forteresse', desc: '+20 PV maximum', stat: { hp: 20 } },
      desc: 'Une forteresse abandonnée qu’un crabe a trouvée à sa taille. Ses tours tirent encore.' },
    { id: 'reine_scorpionne', name: 'Reine scorpionne', tier: 2, biomes: ['desert_verre', 'cavernes_cristallines', 'desert_osseux'],
      r: 42, hp: 800, armor: 0.2, speed: 60, temper: 'agressif', move: 'walk', traits: [],
      art: { shape: 'scorpion', body: '#9fd8e8', accent: '#2f7fb8', eye: '#1c2230', eyes: 4, crown: true },
      phases: [
        { at: 1, speed: 60, patterns: [{ type: 'aimed', count: 5, spread: 0.45, speed: 360, dmg: 9, color: '#bfefff' }, { type: 'summon', species: 'scorpion_verre', count: 2 }] },
        { at: 0.6, speed: 70, patterns: [{ type: 'burrow', dmg: 20, radius: 95, windup: 1.1, emergeRing: 14 }, { type: 'spiral', arms: 3, dur: 2.4, speed: 200, dmg: 9, color: '#bfefff' }] },
        { at: 0.3, speed: 80, patterns: [{ type: 'laser', dur: 2.4, sweep: 2.6, dmg: 30, color: '#bfefff' }, { type: 'burrow', dmg: 24, radius: 110, windup: 0.9, emergeRing: 18 }, { type: 'radial', n: 18, speed: 220, dmg: 10, color: '#4fb6e8' }] },
      ],
      drops: { verre: 12, cristal: 2, essence: 1 }, produces: { res: 'verre', rate: 4 }, roles: ['combat'],
      power: { name: 'Carapace vitrifiée', desc: 'Régénère 0,6 PV par seconde', stat: { regen: 0.6 } },
      desc: 'Elle a creusé ses galeries dans le verre fondu. Ses petits brillent comme des éclats.' },
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
  D.FAUNA_13 = C.map((c) => c.id);

  /* ---- traits ---- */
  const M = (speed, fly) => ({ speed, fly: !!fly });
  Object.assign(D.EXTRA_TRAITS, {
    rainevolt: { ability: 'arc', keys: ['conduction', 'nage'], breed: 1.4 },
    plumeneige: { ability: 'vision', keys: ['vol'], breed: 1.2 },
    braisargot: { ability: 'bouclier', keys: ['feu'], breed: 0.8 },
    ossicrabe: { ability: 'seisme', keys: ['fouisseur'], breed: 1 },
    fourmiel: { ability: 'essaim', keys: ['acide'], breed: 1.6 },
    raie_sable: { ability: 'ruee', keys: ['fouisseur'], breed: 0.8, evo: { to: 'raie_nues', level: 7, cost: { verre: 12, perle: 2 } } },
    filblanc: { ability: 'saut', keys: ['vol', 'lumiere'], breed: 0.3 },
    nuagelin: { ability: 'soin', keys: ['vol'], breed: 1.2 },
    horlogette: { ability: 'arc', keys: ['conduction', 'vol'], breed: 0, evo: { to: 'limier_rouille', level: 6, cost: { ferraille: 16, rouage: 2 } } },

    loup_givre: { ability: 'gel', keys: ['fouisseur'], mount: M(320), diet: { res: 'os', period: 25 }, breed: 0.5 },
    heron_foudre: { ability: 'arc', keys: ['vol', 'conduction', 'nage'], mount: M(300, true), diet: { res: 'ecaille', period: 25 }, breed: 0.3 },
    crabe_lave: { ability: 'flammes', keys: ['feu', 'fouisseur'], mount: M(220), diet: { res: 'braise', period: 25 }, breed: 0.3 },
    limier_rouille: { ability: 'ruee', keys: ['conduction'], mount: M(330), diet: { res: 'ferraille', period: 25 }, breed: 0 },
    scorpion_verre: { ability: 'entrave', keys: ['fouisseur', 'resonance'], mount: M(270), diet: { res: 'verre', period: 25 }, breed: 0.4 },
    raie_nues: { ability: 'vague', keys: ['nage', 'vol'], mount: M(310, true), diet: { res: 'corail', period: 25 }, breed: 0.3 },

    veilleur_seuil: { ability: 'vision', keys: ['lumiere', 'vol'], mount: M(280, true), diet: { res: 'fibre', period: 15, n: 2 } },
    grand_duc: { ability: 'arc', keys: ['vol', 'conduction'], mount: M(320, true), diet: { res: 'etincelle', period: 15, n: 2 } },
    crabe_forteresse: { ability: 'bouclier', keys: ['feu', 'fouisseur'], mount: M(210), diet: { res: 'os', period: 15, n: 2 } },
    reine_scorpionne: { ability: 'entrave', keys: ['fouisseur', 'resonance'], mount: M(270), diet: { res: 'verre', period: 15, n: 2 } },
  });
})();
