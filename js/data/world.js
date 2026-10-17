/* Données de monde : noms procéduraux, anomalies, règles particulières,
   rangs de l'Archive, échelles du dézoom, synergies entre territoires,
   fragments de récit. */
(function () {
  'use strict';
  const D = window.AN.Data;

  D.NAME_PARTS = {
    a: ['VOR', 'KEL', 'ASH', 'MOR', 'TYR', 'ULN', 'SEV', 'ORA', 'ZAH', 'IRN', 'EKH', 'NAV', 'QAL', 'DUM', 'RHE', 'SOL', 'VEX', 'HAL', 'OMB', 'LYS'],
    b: ['AMN', 'ITH', 'OKR', 'ELD', 'UMA', 'RIS', 'ANT', 'OSS', 'YRN', 'ESK', 'IVA', 'OLM', 'ATH', 'UNE', 'ERG', 'IDR', 'AVO', 'ORN'],
  };
  D.REGION_WORDS = ['Royaume', 'Domaine', 'Marches', 'Confins', 'Terres', 'Bassin', 'Archipel', 'Plateau', 'Abîme', 'Couronne'];
  D.ZONE_SUFFIXES = ['', 'du Nord', 'basse', 'haute', 'profonde', 'intérieure', 'oubliée', 'brisée', 'ancienne', 'jumelle'];

  D.SIZES = [
    { id: 'petite', name: 'Petite', zones: 2, tiles: 58 },
    { id: 'moyenne', name: 'Moyenne', zones: 3, tiles: 66 },
    { id: 'grande', name: 'Grande', zones: 4, tiles: 74 },
  ];

  /** Anomalies : un événement unique dans le monde. */
  D.ANOMALIES = [
    { id: 'signal', name: 'Signal mobile souterrain', desc: 'Une créature chromatique rôde quelque part.' },
    { id: 'blanc', name: 'Surface blanche', desc: 'Un point d’extraction supplémentaire.' },
    { id: 'cache', name: 'Structure inconnue', desc: 'Des ruines contenant une réserve de ressources.' },
    { id: 'echo', name: 'Écho d’un autre Archiviste', desc: 'Un fragment de récit est présent.' },
    { id: 'migration', name: 'Migration en cours', desc: 'Les créatures sont deux fois plus nombreuses.' },
    { id: 'errant', name: 'Gardien errant', desc: 'Un gardien supplémentaire parcourt une zone.' },
    { id: 'aucune', name: 'Aucune', desc: '' },
  ];

  /** Règles particulières : modifient l'expédition. */
  D.RULES = [
    { id: 'aucune', name: 'Aucune', desc: '' },
    { id: 'nuit', name: 'Nuit perpétuelle', desc: 'La vision est très réduite.' },
    { id: 'enragee', name: 'Faune enragée', desc: 'Les créatures sont plus agressives et frappent plus fort.' },
    { id: 'riche', name: 'Gisements riches', desc: '+50 % de ressources par récolte.' },
    { id: 'gravite', name: 'Gravité faible', desc: 'Vous vous déplacez et esquivez plus loin.' },
    { id: 'instable', name: 'Monde instable', desc: 'L’effondrement est plus rapide.' },
    { id: 'brume', name: 'Brume épaisse', desc: 'Les créatures vous repèrent de moins loin. Vous aussi.' },
    { id: 'orage', name: 'Tempête', desc: 'La foudre frappe régulièrement près de vous.' },
  ];

  /** Rangs de l'Archive : le monde du joueur change d'échelle. */
  D.RANKS = [
    { name: 'Parcelle', need: { territories: 0 }, zoom: 0.5, threat: 2, desc: 'Un peu de blanc et un Artefact.' },
    { name: 'Enclos', need: { territories: 2 }, zoom: 0.25, threat: 3, desc: 'Les premiers fragments forment un lieu.' },
    { name: 'Domaine', need: { territories: 5, guardians: 1 }, zoom: 0.12, threat: 4, desc: 'Un gardien veille sur l’Archive.' },
    { name: 'Contrée', need: { territories: 9, guardians: 3 }, zoom: 0.06, threat: 5, desc: 'Une mosaïque de réalités incompatibles.' },
    { name: 'Région', need: { territories: 14, ultras: 1 }, zoom: 0.03, threat: 6, desc: 'Un ultra-boss a pris racine.' },
    { name: 'Monde', need: { territories: 22, ultras: 2 }, zoom: 0.012, threat: 7, desc: 'La surface n’était pas plate.' },
  ];

  /** Échelles du dézoom. Les dernières ne sont pas encore accessibles. */
  D.SCALES = [
    { name: 'Échelle personnelle', zoom: 0.8 },
    { name: 'Échelle locale', zoom: 0.35 },
    { name: 'Échelle régionale', zoom: 0.1 },
    { name: 'Échelle mondiale', zoom: 0.025 },
    { name: 'Échelle orbitale', zoom: 0, locked: true },
    { name: 'Échelle stellaire', zoom: 0, locked: true },
    { name: 'Échelle galactique', zoom: 0, locked: true },
    { name: 'Échelle inconnue', zoom: 0, locked: true },
  ];

  /** Synergies entre territoires voisins (paires d'étiquettes de biome). */
  D.SYNERGIES = [
    { a: 'chaud', b: 'metal', name: 'Forge', mult: 0, effect: 'craft', value: 0.1, desc: 'La chaleur alimente les machines : −10 % sur les coûts de l’Atelier.' },
    { a: 'eau', b: 'sec', name: 'Irrigation', mult: 0.4, desc: 'L’eau rend la terre fertile : +40 % de production.' },
    { a: 'vie', b: 'cendre', name: 'Renouveau', mult: 0.3, desc: 'La vie repousse sur les cendres : +30 % de production.' },
    { a: 'electrique', b: 'artificiel', name: 'Alimentation', mult: 0.3, desc: 'Le courant réveille les structures : +30 % de production.' },
    { a: 'electrique', b: 'organique', name: 'Fièvre', mult: -0.25, desc: 'Les décharges affolent les organismes : −25 % de production.' },
    { a: 'froid', b: 'chaud', name: 'Choc thermique', mult: -0.25, desc: 'Les climats s’affrontent : −25 % de production.' },
    { a: 'acide', b: 'vie', name: 'Corrosion', mult: -0.3, desc: 'L’acide ronge le vivant : −30 % de production.' },
    { a: 'mineral', b: 'eau', name: 'Sédiments', mult: 0.3, desc: 'L’eau dépose ses minéraux : +30 % de production.' },
    { a: 'froid', b: 'mineral', name: 'Cristallisation', mult: 0.25, desc: 'Le froid fait pousser les cristaux : +25 % de production.' },
    { a: 'organique', b: 'vie', name: 'Symbiose', mult: 0.25, desc: 'Les organismes s’entraident : +25 % de production.' },
    { a: 'lumiere', b: 'sombre', name: 'Pénombre', mult: 0.2, desc: 'La lumière apprivoise l’obscurité : +20 % de production.' },
    { a: 'vide', b: 'vie', name: 'Effacement', mult: -0.35, desc: 'Le néant efface le vivant : −35 % de production.' },
    { a: 'volcanique', b: 'humide', name: 'Geysers', mult: 0.35, desc: 'La vapeur jaillit et fertilise : +35 % de production.' },
  ];

  /** Fragments de récit trouvés dans les ruines. Ils posent des questions sans y répondre. */
  D.LORE = [
    { id: 'l1', title: 'Stèle fendue', text: 'Quand le blanc viendra, il ne restera que ce qu’il aura choisi.' },
    { id: 'l2', title: 'Carnet carbonisé', text: 'Nous avons vu une porte s’ouvrir dans le ciel. Rien ne la franchissait dans l’autre sens.' },
    { id: 'l3', title: 'Gravure ancienne', text: 'Un être seul, debout sur une surface vide, tient un objet aux angles impossibles. La pierre est plus vieille que la montagne.' },
    { id: 'l4', title: 'Tablette de comptes', text: 'Le Collecteur précédent n’a jamais rendu ce qu’il avait pris. Nous ne savons pas où il est allé.' },
    { id: 'l5', title: 'Note marginale', text: 'Les mondes ne sont pas détruits. Ils sont classés.' },
    { id: 'l6', title: 'Murmure pris dans un cristal', text: 'Combien de mondes faut-il pour remplir le blanc ?' },
    { id: 'l7', title: 'Carte annotée', text: 'Une région entière est laissée en blanc. En marge, une seule mention : « déjà archivée ».' },
    { id: 'l8', title: 'Prière des Pâles', text: 'Qu’il nous choisisse. Qu’il nous choisisse. Qu’il ne nous choisisse pas.' },
    { id: 'l9', title: 'Journal d’ingénieur', text: 'L’objet ne s’active qu’au contact d’une surface de néant. Nous avons tenté d’en fabriquer une. Le laboratoire a disparu.' },
    { id: 'l10', title: 'Rapport d’observation', text: 'La surface blanche ne renvoie aucune lumière. Elle en absorbe le souvenir.' },
    { id: 'l11', title: 'Inscription murale', text: 'Il y a eu d’autres Archives. Certaines sont pleines.' },
    { id: 'l12', title: 'Lettre jamais envoyée', text: 'Si tu lis ceci, c’est que nous avons été laissés derrière. Ne te sens pas coupable. Ou alors un peu.' },
    { id: 'l13', title: 'Schéma effacé', text: 'Un dessin de l’Archive vue de très loin. Elle n’est pas plate. Elle n’est peut-être pas un sol.' },
    { id: 'l14', title: 'Fragment de liturgie', text: 'Tout ce qui est emporté continue de vivre. Tout ce qui reste est oublié, même par ceux qui l’ont connu.' },
    { id: 'l15', title: 'Bas-relief usé', text: 'Une main immense tient une planète comme un caillou ramassé sur une plage.' },
    { id: 'l16', title: 'Dernière page', text: 'Le gardien ne garde pas la zone. Il la retient.' },
    { id: 'l17', title: 'Graffiti récent', text: 'IL REVIENT. CACHEZ LES PETITS.' },
    { id: 'l18', title: 'Équation inachevée', text: 'Si chaque monde contient une Archive, et chaque Archive des mondes, alors —' },
  ];

  /** Texte d'introduction : court, sans exposition. */
  D.INTRO = [
    'Tu as toujours été seul.',
    'Le blanc s’étend dans toutes les directions. Il n’a jamais rien contenu.',
    'Aujourd’hui, quelque chose est apparu.',
  ];
})();
