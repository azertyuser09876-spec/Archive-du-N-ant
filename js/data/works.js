/* Outils de préparation, structures et événements des mondes (1.4).
   Données pures :
   - outils : quatre emplacements (récolte, capture, module d'extraction,
     transport), fabriqués à l'Atelier comme l'équipement (ils rejoignent D.GEAR) ;
   - structures : à bâtir dans l'Archive, ou découvertes dans les mondes,
     démontées, emportées et reconstruites ;
   - événements : ce qui peut arriver pendant qu'on explore une zone. */
(function () {
  'use strict';
  const D = window.AN.Data;

  /* ======================= Outils ======================= */
  D.TOOL_SLOTS = [
    { id: 'tool_harvest', name: 'Récolte', desc: 'Récolter plus vite, plus, et plus profond.' },
    { id: 'tool_capture', name: 'Capture', desc: 'Affaiblir moins, capturer plus vite, emporter plus.' },
    { id: 'tool_extract', name: 'Module d’extraction', desc: 'Transférer plus vite, ailleurs, ou sans tout perdre.' },
    { id: 'tool_transport', name: 'Transport', desc: 'Emporter davantage, et démonter les structures.' },
  ];
  /** Tous les emplacements d'équipement emporté (armes, protection, sac, outils). */
  D.GEAR_SLOTS = ['ranged', 'melee', 'armor', 'bag', 'tool_harvest', 'tool_capture', 'tool_extract', 'tool_transport'];

  /* fx : effets lus par game/tools.js
     harvest (récolte plus rapide), yield (unités en plus), deep (filons profonds),
     weak (seuil de capture), beam (vitesse du rayon), range (portée du rayon), freeMinor (mineures sans place),
     transfer (transfert plus court), beacon (plaque portative), keepBag / keepOnDeath (sac sauvé),
     dismantle (démonter les structures), cargo (places de soute), bag (sac), structLight (structures plus légères) */
  Object.assign(D.GEAR, {
    pic_os: { slot: 'tool_harvest', name: 'Pic d’os', cost: { os: 10, fibre: 6 }, fx: { harvest: 0.35 },
      desc: 'Récolte 35 % plus rapide.' },
    faucille_ambre: { slot: 'tool_harvest', name: 'Faucille d’ambre', cost: { ambre: 2, seve: 8, os: 6 }, fx: { harvest: 0.4, yield: 0.5 },
      desc: 'Récolte 40 % plus rapide ; une chance sur deux d’une unité de plus.' },
    foreuse: { slot: 'tool_harvest', name: 'Foreuse résonante', cost: { cristal: 4, rouage: 3, ferraille: 12 }, fx: { harvest: 0.6, yield: 1, deep: true },
      desc: 'Récolte 60 % plus rapide, une unité de plus, et ouvre les filons profonds.' },

    lanterne_apaisante: { slot: 'tool_capture', name: 'Lanterne apaisante', cost: { spore: 8, perle: 1, fibre: 6 }, fx: { weak: 0.15 },
      desc: 'Les créatures deviennent capturables plus tôt (15 % de vigueur en plus).' },
    gantelet_stase: { slot: 'tool_capture', name: 'Gantelet de stase', cost: { etincelle: 10, cristal: 2, chitine: 6 }, fx: { beam: 0.3, range: 0.2 },
      desc: 'Rayon de capture 30 % plus rapide, portée +20 %.' },
    cage_stase: { slot: 'tool_capture', name: 'Cage de stase', cost: { verre: 10, rouage: 2, membrane: 6 }, fx: { beam: 0.15, freeMinor: 3 },
      desc: 'Jusqu’à trois créatures mineures voyagent sans occuper de place. Rayon 15 % plus rapide.' },

    ancre_stable: { slot: 'tool_extract', name: 'Ancre de stabilité', cost: { obsidienne: 1, ferraille: 10 }, fx: { transfer: 0.2 },
      desc: 'Le transfert dure 20 % de moins.' },
    balise_rappel: { slot: 'tool_extract', name: 'Balise de rappel', cost: { etincelle: 12, cristal: 2, neant: 1 }, fx: { beacon: true, transfer: 0.1 },
      desc: 'Une fois par expédition, pose une plaque d’extraction où vous êtes (E, loin de toute plaque). Transfert 10 % plus court.' },
    collecteur: { slot: 'tool_extract', name: 'Collecteur d’urgence', cost: { etincelle: 8, membrane: 8, perle: 1 }, fx: { keepBag: 1, keepOnDeath: 0.3 },
      desc: 'Extraction d’urgence : tout le sac est gardé. Si vous tombez, 30 % du sac est sauvé.' },

    kit_demontage: { slot: 'tool_transport', name: 'Kit de démontage', cost: { ferraille: 8, fibre: 8 }, fx: { dismantle: true },
      desc: 'Permet de démonter les structures découvertes, pour les reconstruire dans l’Archive.' },
    plateforme: { slot: 'tool_transport', name: 'Plateforme flottante', cost: { verre: 8, givre: 10, ecaille: 6 }, fx: { cargo: 2 },
      desc: '+2 places de soute.' },
    traineau: { slot: 'tool_transport', name: 'Traîneau du néant', cost: { neant: 1, rouage: 3, os: 12 }, fx: { dismantle: true, cargo: 1, bag: 10, structLight: 1 },
      desc: 'Démonte les structures (une place de moins chacune), +1 place de soute, +10 de sac.' },
  });

  /** Ressources des filons profonds (ouverts par la foreuse), par étiquette de biome. */
  D.DEEP_VEINS = { mineral: ['cristal', 'minerai'], chaud: ['obsidienne'], volcanique: ['obsidienne'], cendre: ['obsidienne'], eau: ['perle'], sombre: ['encre'], acide: ['encre'], vide: ['neant'], metal: ['rouage'], artificiel: ['rouage'], vie: ['ambre'], organique: ['ambre'], froid: ['cristal'], electrique: ['cristal'], sec: ['minerai'] };
  D.deepVeinsFor = function (b) {
    const out = [];
    b.tags.forEach((t) => (D.DEEP_VEINS[t] || []).forEach((r) => { if (!out.includes(r)) out.push(r); }));
    return out.length ? out : ['minerai'];
  };

  /* ======================= Structures ======================= */
  /* stat : effets lus par game/structures.js (et ajoutés aux pouvoirs du profil)
     storage (stock par territoire), offline (heures hors ligne), collect (ramassage automatique),
     craftCost, breed, heal, scan (fiabilité), dest (destinations), loyalty, xp, transfer, cargo,
     prod, consMax, regen, links, sweep (coût du balayage), hp, armor,
     (1.9) guards (points de garde de l'hexagone), lore (chance de fragment de récit), astres (astres
     retenus en plus par l'Ancrage), mood (humeur des peuples installés), feed (créatures moins
     affamées), buildCost (constructions et modules moins chers), defSlots (modules de défense en plus).
     bonus (1.9) : effet ajouté quand le bâtiment se dresse sur un territoire dont le paysage porte
     l'une des étiquettes tags (ou, pour une structure rapportée, l'un de ses biomes d'origine). */
  D.STRUCTURES = {
    /* --- à bâtir --- */
    entrepot: { kind: 'build', name: 'Entrepôt', art: 'warehouse', color: '#b08a50',
      desc: 'Les territoires stockent davantage avant ramassage, et l’Archive produit plus longtemps en votre absence.',
      bonus: { tags: ['sec', 'mineral'], stat: { storage: 40 }, text: 'au sec : +40 de stock' },
      levels: [
        { cost: { fibre: 20, os: 12, ferraille: 10 }, stat: { storage: 60, offline: 2 }, text: '+60 de stock par territoire, +2 h hors ligne' },
        { cost: { ferraille: 25, rouage: 4, ambre: 2 }, stat: { storage: 150, offline: 5 }, text: '+150 de stock par territoire, +5 h hors ligne' },
      ] },
    collecteur: { kind: 'build', name: 'Collecteur', art: 'collector', color: '#2346c8',
      desc: 'Ramasse lui-même la production des territoires, chaque minute.',
      bonus: { tags: ['vent', 'electrique'], stat: { offline: 1 }, text: 'dans le vent ou l’orage : +1 h hors ligne' },
      levels: [
        { cost: { etincelle: 15, ferraille: 15, cristal: 2 }, stat: { collect: 0.8 }, text: 'Ramassage automatique à 80 %' },
        { cost: { rouage: 5, cristal: 4, neant: 1 }, stat: { collect: 1 }, text: 'Ramassage automatique complet' },
      ] },
    forge: { kind: 'build', name: 'Forge', art: 'forge', color: '#e8582a',
      desc: 'Une vraie forge : tout ce qui se fabrique à l’Atelier coûte moins.',
      bonus: { tags: ['chaud', 'volcanique', 'metal'], stat: { craftCost: 0.04 }, text: 'sur un sol chaud ou métallique : −4 % de plus' },
      levels: [
        { cost: { braise: 15, os: 10, ferraille: 12 }, stat: { craftCost: 0.08 }, text: '−8 % sur les fabrications' },
        { cost: { obsidienne: 2, rouage: 4, braise: 20 }, stat: { craftCost: 0.15 }, text: '−15 % sur les fabrications' },
      ] },
    couveuse: { kind: 'build', name: 'Couveuse', art: 'nursery', color: '#ff9ad0',
      desc: 'Un abri chaud où les créatures se reproduisent plus volontiers.',
      bonus: { tags: ['vie', 'organique'], stat: { breed: 0.3 }, text: 'dans un paysage vivant : reproduction +30 %' },
      levels: [
        { cost: { seve: 15, membrane: 10, fibre: 10 }, stat: { breed: 0.4 }, text: 'Reproduction +40 %' },
        { cost: { perle: 2, membrane: 20, ambre: 2 }, stat: { breed: 1 }, text: 'Reproduction ×2' },
      ] },
    infirmerie: { kind: 'build', name: 'Infirmerie', art: 'infirmary', color: '#5fd08a',
      desc: 'Les compagnons blessés se remettent plus vite, et vous partez mieux soigné.',
      bonus: { tags: ['humide', 'vie'], stat: { hp: 5 }, text: 'au frais et à l’humide : +5 PV' },
      levels: [
        { cost: { seve: 20, spore: 15, pollen: 10 }, stat: { heal: 1, hp: 5 }, text: 'Blessures guéries une expédition plus tôt, +5 PV' },
        { cost: { perle: 3, seve: 30, essence: 1 }, stat: { heal: 2, hp: 12 }, text: 'Blessures guéries deux expéditions plus tôt, +12 PV' },
      ] },
    phare: { kind: 'build', name: 'Tour de guet', art: 'tower', color: '#ffd25a',
      desc: 'Le scanner de l’Artefact voit plus loin : plus de destinations, mieux décrites.',
      bonus: { tags: ['vent', 'aerien', 'lumiere'], stat: { scan: 0.05 }, text: 'en hauteur ou dans la lumière : fiabilité +5 %' },
      levels: [
        { cost: { verre: 15, ferraille: 10, etincelle: 10 }, stat: { dest: 1, scan: 0.08 }, text: '+1 destination, fiabilité +8 %' },
        { cost: { cristal: 4, rouage: 3, encre: 2 }, stat: { dest: 2, scan: 0.15 }, text: '+2 destinations, fiabilité +15 %' },
      ] },
    sanctuaire: { kind: 'build', name: 'Sanctuaire', art: 'shrine', color: '#c8f26a',
      desc: 'Un cercle de pierres où les créatures se sentent chez elles.',
      bonus: { tags: ['vie', 'mineral'], stat: { xp: 0.1 }, text: 'parmi les pierres ou les bêtes : +10 % d’expérience' },
      levels: [
        { cost: { pollen: 15, seve: 10, os: 8 }, stat: { loyalty: 1, xp: 0.2 }, text: 'Loyauté qui monte plus vite, +20 % d’expérience' },
        { cost: { ambre: 3, essence: 1, perle: 2 }, stat: { loyalty: 2, xp: 0.4 }, text: 'Loyauté qui monte bien plus vite, +40 % d’expérience' },
      ] },
    relais: { kind: 'build', name: 'Relais de portail', art: 'relay', color: '#7fe0ff',
      desc: 'Un second anneau qui épaule l’Artefact pendant les transferts.',
      bonus: { tags: ['vide', 'electrique'], stat: { transfer: 0.05 }, text: 'près du vide ou de la foudre : transfert −5 %' },
      levels: [
        { cost: { etincelle: 12, verre: 10, cristal: 2 }, stat: { transfer: 0.1, cargo: 1 }, text: 'Transfert 10 % plus court, +1 place de soute' },
        { cost: { neant: 2, rouage: 4, cristal: 4 }, stat: { transfer: 0.2, cargo: 2 }, text: 'Transfert 20 % plus court, +2 places de soute' },
      ] },
    /* --- 1.9 --- */
    observatoire: { kind: 'build', name: 'Observatoire', art: 'observatory', color: '#7fb8ff',
      desc: 'Une coupole tournée vers les autres mondes : le scanner lit mieux, et le balayage ciblé coûte moins.',
      bonus: { tags: ['froid', 'lumiere', 'sec'], stat: { scan: 0.05 }, text: 'sous un ciel clair : fiabilité +5 %' },
      levels: [
        { cost: { verre: 16, cristal: 3, ferraille: 10 }, stat: { scan: 0.1, sweep: 0.3 }, text: 'Fiabilité du scanner +10 %, balayage ciblé −30 %' },
        { cost: { cristal: 5, encre: 2, rouage: 3 }, stat: { scan: 0.18, sweep: 0.5, dest: 1 }, text: 'Fiabilité +18 %, balayage −50 %, +1 destination' },
      ] },
    bibliotheque: { kind: 'build', name: 'Bibliothèque', art: 'library', color: '#a8541a',
      desc: 'On y range ce que les mondes ont laissé d’écrit. Les fragments du récit se trouvent plus souvent, et vos créatures apprennent.',
      bonus: { tags: ['ruine', 'artificiel', 'sec'], stat: { lore: 0.1 }, text: 'parmi les ruines : fragments encore plus fréquents' },
      levels: [
        { cost: { fibre: 20, encre: 1, os: 10 }, stat: { lore: 0.15, xp: 0.1 }, text: 'Fragments de récit plus fréquents, +10 % d’expérience' },
        { cost: { encre: 3, ambre: 2, verre: 12 }, stat: { lore: 0.3, xp: 0.2 }, text: 'Fragments bien plus fréquents, +20 % d’expérience' },
      ] },
    garnison: { kind: 'build', name: 'Garnison', art: 'garrison', color: '#6e6458',
      desc: 'Des quartiers pour les créatures qui gardent l’hexagone : on peut en affecter davantage.',
      bonus: { tags: ['mineral', 'mort', 'cendre'], stat: { guards: 1 }, text: 'sur un sol dur : +1 point de garde' },
      levels: [
        { cost: { os: 16, minerai: 10, fibre: 12 }, stat: { guards: 3 }, text: '+3 points de garde' },
        { cost: { obsidienne: 2, ferraille: 16, chitine: 10 }, stat: { guards: 6 }, text: '+6 points de garde' },
      ] },
    port_astres: { kind: 'build', name: 'Port d’astres', art: 'starport', color: '#e8e0f0',
      desc: 'Un quai tourné vers le ciel : l’Ancrage y amarre un astre de plus.',
      bonus: { tags: ['vide', 'lune', 'gaz'], stat: { cargo: 1 }, text: 'au bord du vide : +1 place de soute' },
      levels: [
        { cost: { cristal: 6, rouage: 4, neant: 2 }, stat: { astres: 1 }, text: 'L’Ancrage retient un astre de plus' },
        { cost: { neant: 4, essence: 2, noyau: 1 }, stat: { astres: 2, prod: 0.03 }, text: 'Deux astres de plus, +3 % de production' },
      ] },
    temple: { kind: 'build', name: 'Temple', art: 'temple', color: '#cfc4a6',
      desc: 'Un lieu calme pour les peuples installés dans l’Archive. Ils y viennent, et s’apaisent.',
      bonus: { tags: ['lumiere', 'vie'], stat: { mood: 4 }, text: 'dans la lumière : humeur +4' },
      levels: [
        { cost: { minerai: 14, pollen: 12, perle: 1 }, stat: { mood: 8 }, text: 'Humeur des peuples installés +8' },
        { cost: { ambre: 3, perle: 3, essence: 1 }, stat: { mood: 15 }, text: 'Humeur des peuples installés +15' },
      ] },
    serre: { kind: 'build', name: 'Serre', art: 'greenhouse', color: '#7cc35a',
      desc: 'Des cultures sous verre : les créatures de l’Archive mangent moins souvent ce qu’on leur donne.',
      bonus: { tags: ['humide', 'eau', 'vie'], stat: { feed: 0.1 }, text: 'près de l’eau : faim −10 %' },
      levels: [
        { cost: { verre: 14, seve: 12, fibre: 10 }, stat: { feed: 0.25 }, text: 'Les créatures ont faim 25 % moins souvent' },
        { cost: { verre: 20, ambre: 2, perle: 2 }, stat: { feed: 0.45, consMax: 1 }, text: 'Faim −45 %, +1 unité emportable par consommable' },
      ] },
    chantier: { kind: 'build', name: 'Chantier', art: 'yard', color: '#d8a040',
      desc: 'Échafaudages et outils : les constructions et les modules de l’hexagone coûtent moins, et l’hexagone accueille un module de plus.',
      bonus: { tags: ['metal', 'artificiel'], stat: { buildCost: 0.05 }, text: 'parmi le métal : −5 % de plus' },
      levels: [
        { cost: { ferraille: 20, os: 14, fibre: 14 }, stat: { buildCost: 0.1, defSlots: 1 }, text: 'Constructions et modules −10 %, +1 module installé' },
        { cost: { rouage: 5, obsidienne: 2, ferraille: 20 }, stat: { buildCost: 0.2, defSlots: 2 }, text: 'Constructions et modules −20 %, +2 modules installés' },
      ] },

    /* --- découvertes dans les mondes : démontées, emportées, reconstruites --- */
    puits_profond: { kind: 'found', name: 'Puits des profondeurs', art: 'well', color: '#9a8566', weight: 2, chance: 1,
      biomes: ['desert_osseux', 'cavernes_cristallines', 'desert_verre', 'foret_minerale'],
      desc: 'Il descend plus bas que le monde qui l’entourait.', rebuild: { os: 10, minerai: 6 }, stat: { prod: 0.08 }, text: '+8 % de production',
      bonus: { stat: { prod: 0.04 }, text: 'dans son paysage : +4 % de production' } },
    serre_resine: { kind: 'found', name: 'Serre de résine', art: 'greenhouse', color: '#f0b84a', weight: 2, chance: 1,
      biomes: ['jardins_ambre', 'jungle_carnivore', 'foret_fongique'],
      desc: 'Une serre de résine figée où rien ne fane.', rebuild: { ambre: 1, seve: 10 }, stat: { consMax: 1 }, text: '+1 unité emportable par consommable',
      bonus: { stat: { feed: 0.1 }, text: 'dans son paysage : faim −10 %' } },
    forge_abandonnee: { kind: 'found', name: 'Forge abandonnée', art: 'oldforge', color: '#6e6458', weight: 2, chance: 1,
      biomes: ['cite_carbonisee', 'ruines_mecaniques', 'riviere_lave'],
      desc: 'Le feu y est éteint depuis longtemps. Pas les outils.', rebuild: { braise: 10, ferraille: 8 }, stat: { craftCost: 0.06 }, text: '−6 % sur les fabrications',
      bonus: { stat: { craftCost: 0.03 }, text: 'dans son paysage : −3 % de plus' } },
    totem_betes: { kind: 'found', name: 'Totem des bêtes', art: 'totem', color: '#a8541a', weight: 1, chance: 1,
      biomes: ['foret_fongique', 'toundra_givree', 'jungle_carnivore', 'foret_calcinee'],
      desc: 'Des visages de bêtes sculptés les uns sur les autres.', rebuild: { fibre: 10, os: 6 }, stat: { xp: 0.25 }, text: '+25 % d’expérience pour les compagnons',
      bonus: { stat: { loyalty: 1 }, text: 'dans son paysage : loyauté qui monte plus vite' } },
    observatoire_ruine: { kind: 'found', name: 'Observatoire en ruine', art: 'observatory', color: '#7fb8ff', weight: 3, chance: 0.8,
      biomes: ['steppes_orageuses', 'lisiere_neant', 'desert_verre', 'cavernes_cristallines'],
      desc: 'Quelqu’un regardait d’autres mondes, bien avant l’Artefact.', rebuild: { verre: 12, cristal: 2 }, stat: { scan: 0.1, sweep: 0.4 }, text: 'Fiabilité du scanner +10 %, balayage ciblé −40 %',
      bonus: { stat: { lore: 0.1 }, text: 'dans son paysage : fragments de récit plus fréquents' } },
    fontaine_seve: { kind: 'found', name: 'Fontaine de sève', art: 'fountain', color: '#5fd08a', weight: 2, chance: 1,
      biomes: ['foret_fongique', 'jardins_ambre', 'abysses_lumineuses'],
      desc: 'Elle coule encore, sans source visible.', rebuild: { seve: 12, perle: 1 }, stat: { regen: 0.4 }, text: 'Régénère 0,4 PV par seconde en expédition',
      bonus: { stat: { regen: 0.2 }, text: 'dans son paysage : +0,2 PV par seconde' } },
    autel_neant: { kind: 'found', name: 'Autel du Néant', art: 'altar', color: '#1c2230', weight: 3, chance: 0.5,
      biomes: ['lisiere_neant', 'entrailles_vivantes'],
      desc: 'Un bloc noir et un bloc blanc, posés l’un contre l’autre.', rebuild: { neant: 2, encre: 2 }, stat: { links: 1 }, text: '+1 lien de compagnon',
      bonus: { stat: { guards: 1 }, text: 'dans son paysage : +1 point de garde' } },
    ruche_mere: { kind: 'found', name: 'Ruche-mère', art: 'hive', color: '#c4923a', weight: 2, chance: 1,
      biomes: ['ruche_chitineuse', 'jardins_ambre'],
      desc: 'Vide, mais elle bourdonne encore.', rebuild: { chitine: 10, pollen: 10 }, stat: { breed: 0.5 }, text: 'Reproduction +50 %',
      bonus: { stat: { breed: 0.25 }, text: 'dans son paysage : reproduction +25 %' } },
    phare_englouti: { kind: 'found', name: 'Phare englouti', art: 'lighthouse', color: '#5aa3b8', weight: 3, chance: 0.8,
      biomes: ['ocean_suspendu', 'abysses_lumineuses', 'marais_electrique'],
      desc: 'Sa lumière tourne toujours, sous l’eau.', rebuild: { corail: 10, perle: 1 }, stat: { dest: 1 }, text: '+1 destination',
      bonus: { stat: { scan: 0.05 }, text: 'dans son paysage : fiabilité +5 %' } },
    moulin_foudre: { kind: 'found', name: 'Moulin à foudre', art: 'windmill', color: '#e2cf3a', weight: 2, chance: 1,
      biomes: ['marais_electrique', 'steppes_orageuses'],
      desc: 'Ses ailes tournent quand l’orage gronde.', rebuild: { etincelle: 12, fibre: 8 }, stat: { prod: 0.05, cargo: 1 }, text: '+5 % de production, +1 place de soute',
      bonus: { stat: { prod: 0.03 }, text: 'dans son paysage : +3 % de production' } },
    statue_gardien: { kind: 'found', name: 'Statue du gardien', art: 'statue', color: '#cfc4a6', weight: 2, chance: 0.6,
      biomes: ['foret_minerale', 'desert_osseux', 'toundra_givree', 'cite_carbonisee'],
      desc: 'Un gardien d’un autre temps, figé en pleine charge.', rebuild: { minerai: 8, os: 8 }, stat: { hp: 10, armor: 0.03 }, text: '+10 PV, +3 % d’armure',
      bonus: { stat: { hp: 5 }, text: 'dans son paysage : +5 PV' } },
    horloge_figee: { kind: 'found', name: 'Horloge figée', art: 'clock', color: '#ffb347', weight: 2, chance: 0.8,
      biomes: ['ruines_mecaniques', 'cite_carbonisee', 'fosses_acides'],
      desc: 'Ses aiguilles se sont arrêtées au moment exact où son monde a été détruit.', rebuild: { rouage: 2, ferraille: 10 }, stat: { transfer: 0.1 }, text: 'Transfert 10 % plus court',
      bonus: { stat: { offline: 1 }, text: 'dans son paysage : +1 h hors ligne' } },
  };
  D.STRUCTURE_IDS = Object.keys(D.STRUCTURES);
  D.FOUND_STRUCTURES = D.STRUCTURE_IDS.filter((id) => D.STRUCTURES[id].kind === 'found');
  D.BUILD_STRUCTURES = D.STRUCTURE_IDS.filter((id) => D.STRUCTURES[id].kind === 'build');
  /** Chance qu'une zone de région abrite une structure. */
  D.STRUCTURE_CHANCE = 0.3;
  /** Noms lisibles des étiquettes de paysage (pour les bonus des bâtiments). */
  D.TAG_NAMES = { vie: 'vivant', humide: 'humide', sombre: 'sombre', electrique: 'électrique', eau: 'eau', metal: 'métal', artificiel: 'artificiel', sec: 'sec', chaud: 'chaud', mort: 'mort', mineral: 'minéral', froid: 'froid', aerien: 'aérien', lumiere: 'lumière', cendre: 'cendre', volcanique: 'volcanique', ruine: 'ruines', vent: 'vent', acide: 'acide', organique: 'organique', vide: 'vide', lune: 'lune', plasma: 'plasma', gaz: 'gaz' };
  /** Bâtiments qu'un territoire accueille selon son nombre de cases (1.9) : 1 pour un fragment, 2 pour 7 cases… */
  D.buildingCapacity = (cells) => 1 + Math.floor((Math.max(1, cells) - 1) / 4);

  /* ======================= Événements des mondes ======================= */
  D.WORLD_EVENTS = {
    meteores: { name: 'Pluie de météores', dur: 22, good: false, color: '#ff7a3a',
      desc: 'Des pierres tombent du ciel. Certaines laissent des fragments précieux.' },
    floraison: { name: 'Floraison', dur: 30, good: true, color: '#c8f26a',
      desc: 'Le monde refleurit d’un coup : les gisements épuisés repoussent, d’autres apparaissent.' },
    migration: { name: 'Migration', dur: 60, good: true, color: '#9fb4ff',
      desc: 'Un troupeau venu d’ailleurs traverse la zone. Il ne s’arrêtera pas.' },
    eclipse: { name: 'Éclipse', dur: 35, good: false, color: '#2a2440',
      desc: 'La lumière s’éteint. Les créatures deviennent furieuses, mais laissent davantage derrière elles.' },
    faille: { name: 'Faille', dur: 45, good: false, color: '#2346c8',
      desc: 'Une déchirure s’ouvre sur un autre monde. Des créatures en sortent. Refermée, elle laisse une essence.' },
    echo: { name: 'Écho d’un monde', dur: 60, good: true, color: '#e8e0f0',
      desc: 'Le fantôme d’une structure d’un monde déjà détruit apparaît, pour une minute.' },
  };
  D.WORLD_EVENT_IDS = Object.keys(D.WORLD_EVENTS);
  /** Chance qu'une zone connaisse un événement pendant qu'on l'explore. */
  D.WORLD_EVENT_CHANCE = 0.32;
})();
