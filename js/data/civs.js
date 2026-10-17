/* Civilisations : peuples, attitudes, répliques, commerce et événements.
   Données pures. Le jeu n'impose pas de lecture morale : les peuples
   réagissent à ce que les mondes racontent du joueur. */
(function () {
  'use strict';
  const D = window.AN.Data;

  /* ---------- peuples ----------
     body  : silhouette des habitants (voir render/civArt.js)
     style : architecture
     likes : ressource qu'ils apprécient (offrandes, demandes)
     bonus : effet dans l'Archive quand ils y vivent, de bonne humeur */
  D.PEOPLES = [
    { id: 'pales', name: 'les Pâles', Name: 'Les Pâles', sing: 'Pâle', biomes: ['desert_osseux', 'desert_verre', 'toundra_givree', 'lisiere_neant'],
      bias: { devots: 4, suppliants: 2, fiers: 1, iconoclastes: 0.4 }, knows: true,
      body: { shape: 'robe', cloth: '#f2f2ee', trim: '#9aa4b8', skin: '#e8e6e0', mark: '#2346c8' }, style: 'shrine', likes: 'verre',
      bonus: { kind: 'loyalty', value: 0.08, desc: 'Vos créatures gagnent la loyauté plus vite.' },
      names: ['Ilm', 'Saé', 'Orrel', 'Vesh', 'Aïo', 'Thal'], titles: ['Gardienne du Blanc', 'Celui-qui-attend', 'Première Voix'],
      desc: 'Un peuple ascète qui vénère les surfaces blanches. Ils disent les avoir toujours connues.' },
    { id: 'cendriers', name: 'les Cendriers', Name: 'Les Cendriers', sing: 'Cendrier', biomes: ['foret_calcinee', 'riviere_lave', 'cite_carbonisee'],
      bias: { fiers: 3, hostiles: 2, evades: 2, suppliants: 1 },
      body: { shape: 'armor', cloth: '#3a2f2a', trim: '#ff7a3a', skin: '#8a6a58', mark: '#ffb02e' }, style: 'forge', likes: 'braise',
      bonus: { kind: 'craft', value: 0.08, desc: '−8 % sur les coûts de l’Atelier.' },
      names: ['Brask', 'Tövra', 'Kalm', 'Harrow', 'Isse', 'Garn'], titles: ['Maîtresse des forges', 'Garde-Foyer', 'Dernier Soufflet'],
      desc: 'Des forgerons qui ont appris à vivre sur un sol qui brûle.' },
    { id: 'rouages', name: 'les Rouages', Name: 'Les Rouages', sing: 'Rouage', biomes: ['ruines_mecaniques', 'steppes_orageuses', 'cite_carbonisee'],
      bias: { voleurs: 3, evades: 2, fiers: 1, iconoclastes: 1 },
      body: { shape: 'automaton', cloth: '#7d746a', trim: '#ffb347', skin: '#9a9184', mark: '#4fd8f0' }, style: 'tower', likes: 'ferraille',
      bonus: { kind: 'upgrade', value: 0.08, desc: '−8 % sur les améliorations de l’Artefact.' },
      names: ['Unité 7', 'Cliquet', 'Pendule', 'Axe-Mère', 'Ressort', 'Vis'], titles: ['Régulateur', 'Horloge Première', 'Mémoire de série'],
      desc: 'Les héritiers mécaniques d’une civilisation disparue. Ils réparent ce qu’ils ne comprennent plus.' },
    { id: 'myceliens', name: 'les Mycéliens', Name: 'Les Mycéliens', sing: 'Mycélien', biomes: ['foret_fongique', 'jungle_carnivore', 'fosses_acides'],
      bias: { infiltres: 3, suppliants: 2, devots: 1 },
      body: { shape: 'cap', cloth: '#6a5a90', trim: '#c8f26a', skin: '#d8c8ff', mark: '#c8f26a' }, style: 'mushroom', likes: 'seve',
      bonus: { kind: 'prod', value: 0.15, desc: '+15 % de production dans leur territoire.' },
      names: ['Hyphe', 'Sporée', 'Moll', 'Rhizo', 'Lamelle', 'Velum'], titles: ['Réseau-Mère', 'Nœud ancien', 'Voix du Sous-bois'],
      desc: 'Un peuple-réseau : chacun pense un peu avec tous les autres.' },
    { id: 'nautes', name: 'les Nautes des nues', Name: 'Les Nautes des nues', sing: 'Naute', biomes: ['ocean_suspendu', 'marais_electrique', 'abysses_lumineuses'],
      bias: { evades: 3, voleurs: 2, suppliants: 2 },
      body: { shape: 'sailor', cloth: '#2f5f7a', trim: '#e2d6aa', skin: '#c9a890', mark: '#ffffff' }, style: 'boat', likes: 'perle',
      bonus: { kind: 'cargo', value: 1, desc: '+1 place dans la soute de l’Artefact.' },
      names: ['Marel', 'Skiff', 'Ondine', 'Haubert', 'Brume', 'Nolis'], titles: ['Capitaine', 'Pilote des nues', 'Vieille Ancre'],
      desc: 'Des marins qui naviguent sur une mer suspendue au-dessus du vide.' },
    { id: 'chitinides', name: 'les Chitinides', Name: 'Les Chitinides', sing: 'Chitinide', biomes: ['ruche_chitineuse', 'jardins_ambre', 'entrailles_vivantes'],
      bias: { hostiles: 3, iconoclastes: 2, fiers: 1 },
      body: { shape: 'insect', cloth: '#c4923a', trim: '#3a2c16', skin: '#e8b850', mark: '#ffd25a' }, style: 'hive', likes: 'pollen',
      bonus: { kind: 'capture', value: 0.06, desc: 'Rayon de capture 6 % plus rapide.' },
      names: ['Tkk', 'Zeyr', 'Kesh', 'Vrr', 'Asheth', 'Klik'], titles: ['Pondeuse', 'Esprit de la ruche', 'Sentinelle-Mère'],
      desc: 'Une ruche pensante. Elle parle d’une seule voix, à travers mille bouches.' },
    { id: 'lithes', name: 'les Lithes', Name: 'Les Lithes', sing: 'Lithe', biomes: ['foret_minerale', 'cavernes_cristallines', 'toundra_givree'],
      bias: { fiers: 3, devots: 2, suppliants: 1 },
      body: { shape: 'stone', cloth: '#7c8691', trim: '#b9f0d0', skin: '#93a08a', mark: '#7fe0ff' }, style: 'cairn', likes: 'minerai',
      bonus: { kind: 'hp', value: 6, desc: '+6 points de vie en expédition.' },
      names: ['Gneiss', 'Orm', 'Basalte', 'Schiste', 'Quartzine', 'Tuf'], titles: ['Aîné', 'Pierre-qui-se-souvient', 'Socle'],
      desc: 'Un peuple de pierre. Une conversation avec eux peut durer une saison.' },
    { id: 'veilleurs', name: 'les Veilleurs du Seuil', Name: 'Les Veilleurs du Seuil', sing: 'Veilleur', biomes: ['lisiere_neant', 'cite_carbonisee', 'cavernes_cristallines'],
      bias: { iconoclastes: 4, fiers: 1, devots: 1 }, knows: true, rare: true,
      body: { shape: 'hood', cloth: '#1c2230', trim: '#ffffff', skin: '#f4f6f8', mark: '#ffffff' }, style: 'obelisk', likes: 'neant',
      bonus: { kind: 'lore', value: 1, desc: 'Ils vous confient ce qu’ils savent de l’Archive.' },
      names: ['Sentinelle', 'Seuil', 'Garde-Blanc', 'Témoin', 'Liminaire'], titles: ['Premier Veilleur', 'Garde du Seuil', 'Témoin'],
      desc: 'Ils surveillent les surfaces blanches depuis des siècles. Ils savent ce que vous êtes.' },
  ];
  D.PEOPLE = {};
  D.PEOPLES.forEach((p) => (D.PEOPLE[p.id] = p));

  /** Peuples qui ne s'entendent pas quand ils sont voisins dans l'Archive. */
  D.CIV_CONFLICTS = [['cendriers', 'myceliens'], ['rouages', 'chitinides'], ['pales', 'veilleurs'], ['nautes', 'lithes']];

  /* ---------- attitudes ---------- */
  D.ATTITUDES = {
    suppliants: { name: 'Suppliants', desc: 'Ils demandent à être emmenés.' },
    fiers: { name: 'Fiers', desc: 'Ils refusent de quitter leur monde.' },
    hostiles: { name: 'Hostiles', desc: 'Ils attaquent à vue.', hostile: true },
    voleurs: { name: 'Marchands', desc: 'Ils commercent volontiers.', reveal: 'Voleurs', revealDesc: 'Ils convoitent l’Artefact.' },
    evades: { name: 'Bâtisseurs d’arche', desc: 'Ils préparent leur propre fuite.' },
    infiltres: { name: 'Suppliants', desc: 'Ils demandent à être emmenés.', reveal: 'Infiltrés', revealDesc: 'Certains d’entre eux travaillent contre l’Archive.' },
    devots: { name: 'Dévots', desc: 'Ils vous vénèrent.' },
    iconoclastes: { name: 'Iconoclastes', desc: 'Ils veulent détruire l’Archive.', hostile: true },
  };

  /* ---------- répliques ----------
     {peuple} {chef} {titre} {monde} sont remplacés. */
  D.CIV_LINES = {
    suppliants: [
      'Tu viens de là où vont les mondes qui s’éteignent. Emmène-nous. Tout ce que nous sommes tient dans ce village.',
      'Nous avons vu le ciel se fendre au-dessus des autres terres. Nous savons ce qui va arriver. Prends-nous avec toi.',
      'Nous ne demandons pas de rester nous-mêmes. Seulement de rester.',
    ],
    fiers: [
      'Ce monde nous a portés depuis le premier jour. Nous ne le quitterons pas pour le tien.',
      'Tu parles de fin. Nous parlons de chez nous. Va-t’en, si tu dois partir.',
      'Si ce monde doit s’éteindre, il s’éteindra avec ceux qui l’ont aimé.',
    ],
    voleurs: [
      'Un voyageur ! Rare, très rare. Nous avons de quoi échanger. Et toi, cet objet qui flotte près de toi… il est à vendre ?',
      'Commerce, commerce. Tout s’échange, même ce qui ne devrait pas.',
    ],
    evades: [
      'Nous n’avons pas besoin de toi pour partir. Notre arche est presque prête. Mais les bêtes sentent le départ. Aide-nous à tenir.',
      'Nous avons bâti notre propre porte vers ailleurs. Elle n’attend plus qu’un peu de temps. Le temps, toi, tu peux nous l’offrir.',
    ],
    devots: [
      'Le Blanc est venu ! Il marche parmi nous ! Prends nos offrandes. Prends-nous, si tu le veux.',
      'Nos ancêtres avaient peint ta forme sur les murs. Nous t’attendions.',
    ],
    hostiles: ['Encore un collecteur. Celui-là ne repartira pas.'],
    iconoclastes: ['Ton Archive est une tombe déguisée en jardin. Nous la briserons, toi d’abord.'],
  };
  /** Rumeurs : ce que les mondes racontent du joueur, selon sa réputation. */
  D.CIV_RUMORS = {
    arche: 'On dit que tu emportes ceux qui te supplient.',
    collecteur: 'On dit que tu prends ce qui t’intéresse et que tu laisses le reste s’éteindre.',
    fleau: 'On dit que derrière toi, les mondes se taisent.',
    dieu: 'On dit que des peuples entiers t’ont suivi en chantant.',
    pillard: 'On dit que tu voles même les portes de secours des autres.',
    inconnu: null,
  };
  /** Ce que savent les peuples qui connaissent l'Archive. */
  D.CIV_KNOWLEDGE = [
    'Les surfaces blanches ne sont pas des trous dans le monde. Ce sont des fenêtres. Quelqu’un regarde de l’autre côté.',
    'Avant toi, il y en a eu un autre. Il remplissait son Archive très vite. Un jour, elle a cessé de grandir. Lui aussi.',
    'Ton objet ne détruit pas les mondes. Il les ferme. Ce n’est pas la même chose, mais le résultat se ressemble.',
    'Une Archive pleine ne reste pas une Archive. Nous ne savons pas ce qu’elle devient.',
    'Nous gardons ce seuil pour que rien n’en sorte. Toi, tu en es sorti.',
  ];

  /** Titres que les peuples donnent au joueur. */
  D.REPUTATIONS = {
    inconnu: { name: 'L’Inconnu', desc: 'Les mondes ne savent encore rien de vous.' },
    arche: { name: 'L’Arche blanche', desc: 'On raconte que vous sauvez ceux qui le demandent.' },
    collecteur: { name: 'Le Collecteur', desc: 'On raconte que vous prenez ce qui vous sert, et rien d’autre.' },
    fleau: { name: 'Le Fléau pâle', desc: 'On raconte que les mondes s’éteignent derrière vous.' },
    dieu: { name: 'Le Dieu blanc', desc: 'Des peuples entiers vous vénèrent.' },
    pillard: { name: 'Le Voleur de portes', desc: 'On raconte que vous prenez même les moyens de fuir des autres.' },
  };

  /* ---------- habitants ---------- */
  D.CIV_ROLES = {
    villager: { r: 8, hp: 26, speed: 70 },
    guard: { r: 9, hp: 70, speed: 115, attack: { type: 'bite', dmg: 8, cd: 1 } },
    archer: { r: 8, hp: 45, speed: 90, attack: { type: 'shoot', dmg: 6, cd: 1.6, speed: 340, count: 1, spread: 0, size: 4, color: '#e8e0d0', range: 300 } },
    leader: { r: 11, hp: 160, speed: 80, attack: { type: 'shoot', dmg: 9, cd: 1.4, speed: 320, count: 3, spread: 0.3, size: 5, color: '#ffffff', range: 320 } },
    thief: { r: 8, hp: 34, speed: 175 },
  };

  /** Places de soute occupées par des habitants (3 par place) et par le village entier. */
  D.civWeight = (n) => Math.ceil(n / 3);
  D.VILLAGE_WEIGHT = 4;
  D.ARK_WEIGHT = 6;

  /* ---------- événements de l'Archive ---------- */
  D.CIV_REQUESTS = [
    { text: '{peuple} demandent {n} {res} pour {raison}.', reasons: ['réparer leurs maisons', 'leurs rites', 'nourrir les anciens', 'tenir l’hiver qu’ils ont apporté avec eux', 'célébrer leur arrivée'] },
  ];
  D.CIV_GIFTS = [
    '{peuple} vous laissent une offrande : {gift}.',
    '{peuple} ont travaillé plus que nécessaire. Ils vous apportent {gift}.',
  ];
})();
(function () {
  'use strict';
  const D = window.AN.Data;
  /** Influence de la réputation sur l'attitude des peuples rencontrés. */
  D.REP_WEIGHTS = {
    arche: { suppliants: 1.6, infiltres: 1.5, devots: 1.3, hostiles: 0.8 },
    collecteur: { fiers: 1.3, voleurs: 1.3 },
    fleau: { hostiles: 1.8, iconoclastes: 1.8, devots: 1.3, suppliants: 1.2, fiers: 0.7 },
    dieu: { devots: 2, suppliants: 1.3, iconoclastes: 1.4 },
    pillard: { voleurs: 1.6, hostiles: 1.5, evades: 0.6 },
  };
  D.repWeight = (rep, attitude) => ((D.REP_WEIGHTS[rep] || {})[attitude] || 1);
})();
