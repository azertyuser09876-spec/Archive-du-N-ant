/* Traits approfondis des créatures : données pures.
   - ability : capacité prêtée au joueur quand la créature l'accompagne (touche Q)
   - call    : appel stratégique d'une créature géante restée dans l'Archive (touche G)
   - keys    : clés d'environnement (ouvrent les caveaux scellés)
   - mount   : monture (touche R) : vitesse, vol
   - diet    : régime (ressource consommée dans l'Archive), null = se nourrit seule
   - breed   : fertilité dans l'Archive (0 = ne se reproduit pas)
   - evo     : évolution spécifique vers une autre espèce
   Les autres espèces évoluent par stades génériques (Aguerri, Ancien). */
(function () {
  'use strict';
  const D = window.AN.Data;

  /* ---------- clés d'environnement ---------- */
  D.KEYS = {
    nage: { name: 'Nage', barrier: 'Eaux profondes', verb: 'traverser les eaux profondes', color: '#2f6fa8' },
    feu: { name: 'Résistance au feu', barrier: 'Coulée ardente', verb: 'franchir la coulée', color: '#e8582a' },
    vol: { name: 'Vol', barrier: 'Gouffre', verb: 'passer le gouffre', color: '#7a7f95' },
    lumiere: { name: 'Lumière', barrier: 'Ténèbres', verb: 'dissiper les ténèbres', color: '#c8f26a' },
    fouisseur: { name: 'Fouissage', barrier: 'Éboulis', verb: 'creuser les éboulis', color: '#9a8566' },
    conduction: { name: 'Conduction', barrier: 'Porte morte', verb: 'réalimenter la porte', color: '#4fd8f0' },
    resonance: { name: 'Résonance', barrier: 'Sceau cristallin', verb: 'faire vibrer le sceau', color: '#7fb8ff' },
    acide: { name: 'Corrosion', barrier: 'Paroi de chitine', verb: 'dissoudre la paroi', color: '#a6cc2a' },
  };
  /** Clés dont un biome peut sceller ses caveaux (selon ses étiquettes). */
  D.keysForBiome = function (b) {
    const t = new Set(b.tags);
    const out = [];
    if (t.has('eau') || t.has('humide')) out.push('nage');
    if (t.has('chaud') || t.has('volcanique') || t.has('cendre')) out.push('feu');
    if (t.has('aerien') || t.has('mort') || t.has('vide') || t.has('vent')) out.push('vol');
    if (t.has('sombre')) out.push('lumiere');
    if (t.has('mineral') || t.has('sec') || t.has('ruine')) out.push('fouisseur');
    if (t.has('artificiel') || t.has('metal') || t.has('electrique')) out.push('conduction');
    if (t.has('mineral') && (t.has('froid') || t.has('lumiere') || t.has('sombre'))) out.push('resonance');
    if (t.has('organique') || t.has('acide')) out.push('acide');
    return out.length ? out : ['fouisseur'];
  };
  /** Clé qui annule le danger du terrain d'un biome, pour une monture. */
  D.hazardKey = function (b) {
    if (!b || !b.hazard) return null;
    const t = new Set(b.tags);
    if (t.has('volcanique') || t.has('cendre') || (t.has('chaud') && !t.has('vie'))) return 'feu';
    if (t.has('acide') || t.has('organique')) return 'acide';
    if (t.has('eau') || t.has('humide')) return 'nage';
    return null;
  };

  /* ---------- capacités prêtées (Q) ---------- */
  D.ABILITIES = {
    vision: { name: 'Regard', cd: 20, color: '#c8f26a', desc: 'Révèle une large partie de la carte et les créatures alentour.' },
    soin: { name: 'Soin', cd: 18, color: '#5fd08a', desc: 'Soigne le joueur et ses compagnons.' },
    arc: { name: 'Arc électrique', cd: 9, color: '#4fd8f0', desc: 'Un éclair qui rebondit entre les ennemis proches du curseur.' },
    nuage: { name: 'Nuage de spores', cd: 12, color: '#93c94e', desc: 'Un nuage toxique qui ronge et ralentit, au curseur.' },
    toile: { name: 'Toile', cd: 12, color: '#e8e0f0', desc: 'Une toile qui immobilise tout ce qu’elle touche, au curseur.' },
    ruee: { name: 'Ruée', cd: 8, color: '#d9d0b8', desc: 'Une charge fulgurante vers le curseur qui blesse sur son passage.' },
    flammes: { name: 'Souffle ardent', cd: 10, color: '#ff7a3a', desc: 'Un cône de flammes vers le curseur.' },
    acide: { name: 'Jet acide', cd: 10, color: '#aad21e', desc: 'Une flaque corrosive au curseur.' },
    seisme: { name: 'Séisme', cd: 14, color: '#a48c64', desc: 'Étourdit et blesse tout ce qui vous entoure.' },
    rage: { name: 'Rage', cd: 20, color: '#ff4f7a', desc: '+40 % de dégâts pendant 6 secondes.' },
    saut: { name: 'Saut', cd: 10, color: '#ffffff', desc: 'Vous téléporte au curseur.' },
    bouclier: { name: 'Carapace', cd: 18, color: '#b8863b', desc: 'Absorbe les prochains dégâts pendant 8 secondes.' },
    entrave: { name: 'Entrave', cd: 14, color: '#2346c8', desc: 'Immobilise la cible visée et double la vitesse de capture 6 secondes.' },
    cri: { name: 'Cri', cd: 16, color: '#cfc4a6', desc: 'Les créatures proches fuient, terrifiées.' },
    gel: { name: 'Gel', cd: 14, color: '#8cc6ea', desc: 'Gèle les créatures autour du curseur.' },
    essaim: { name: 'Essaim', cd: 20, color: '#ffd25a', desc: 'Appelle un essaim allié pendant 12 secondes.' },
    rayon: { name: 'Rayon', cd: 16, color: '#ff4d6d', desc: 'Un rayon dévastateur dans la direction visée.' },
    vague: { name: 'Vague', cd: 14, color: '#5aa3b8', desc: 'Une onde qui repousse et blesse.' },
  };

  /* ---------- appels stratégiques (G), une fois par expédition ---------- */
  D.CALLS = {
    foret: { name: 'Forêt vivante', desc: 'Des racines jaillissent partout autour de vous.', color: '#c8f26a' },
    pluie_feu: { name: 'Pluie de cendres', desc: 'Une averse de roche en fusion s’abat sur les ennemis.', color: '#ff641a' },
    maree: { name: 'Grande marée', desc: 'Une vague immense balaie la zone.', color: '#7fe0ff' },
    frappe: { name: 'Frappe mécanique', desc: 'Des rayons tombent du ciel sur chaque ennemi visible.', color: '#ffb347' },
  };

  /* ---------- traits par espèce ---------- */
  const M = (speed, fly) => ({ speed, fly: !!fly });
  const DIET1 = 25, DIET2 = 15; // minutes par repas
  const T = {
    lumifongue: { ability: 'vision', keys: ['lumiere'], breed: 1.2 },
    sporelin: { ability: 'nuage', keys: [], breed: 1.5, evo: { to: 'croc_spore', level: 6, cost: { spore: 16, os: 6 } } },
    gresillon: { ability: 'arc', keys: ['conduction'], breed: 1.5 },
    rouillard: { ability: 'bouclier', keys: ['conduction'], breed: 0.8, evo: { to: 'sentinelle', level: 6, cost: { ferraille: 16, rouage: 3 } } },
    osselet: { ability: 'saut', keys: ['fouisseur'], breed: 1 },
    prismite: { ability: 'vision', keys: ['resonance', 'lumiere'], breed: 0.8, evo: { to: 'mante', level: 7, cost: { cristal: 4, verre: 10 } } },
    bullepode: { ability: 'soin', keys: ['nage'], breed: 0.8 },
    cendrin: { ability: 'flammes', keys: ['feu'], breed: 1, evo: { to: 'salamandre', level: 6, cost: { braise: 12, obsidienne: 1 } } },
    magmouche: { ability: 'flammes', keys: ['feu', 'vol'], breed: 1.4 },
    givrelot: { ability: 'gel', keys: [], breed: 1, evo: { to: 'givreur', level: 7, cost: { givre: 20, os: 6 } } },
    feuillerat: { ability: 'vision', keys: [], breed: 1.4 },
    ambrelle: { ability: 'essaim', keys: ['vol'], breed: 1.4, evo: { to: 'frelon', level: 7, cost: { ambre: 2, chitine: 8 } } },
    acidule: { ability: 'acide', keys: ['acide'], breed: 1, evo: { to: 'rodeur_acide', level: 6, cost: { acide: 16, chitine: 4 } } },
    larvule: { ability: 'bouclier', keys: ['acide'], breed: 1.6, evo: { to: 'ambrelle', level: 4, cost: { pollen: 8, seve: 4 } } },
    vitrelle: { ability: 'vision', keys: ['resonance', 'vol'], breed: 1 },
    globule: { ability: 'soin', keys: ['acide'], breed: 1.2, evo: { to: 'phagocyte', level: 6, cost: { membrane: 14, acide: 4 } } },
    echoide: { ability: 'saut', keys: ['vol'], breed: 0.3, evo: { to: 'spectre', level: 6, cost: { neant: 2 } } },
    mousseron: { ability: 'bouclier', keys: [], breed: 1.2 },
    tisseuse: { ability: 'toile', keys: ['vol'], breed: 0.9 },
    lanternelle: { ability: 'vision', keys: ['lumiere', 'nage'], breed: 1.2, evo: { to: 'pecheur', level: 7, cost: { encre: 3, ecaille: 8 } } },
    ventrillon: { ability: 'ruee', keys: ['vol'], breed: 0.8 },
    galet: { ability: 'bouclier', keys: ['fouisseur'], breed: 0.6 },
    brindeuil: { ability: 'soin', keys: [], breed: 1.2, evo: { to: 'dionee', level: 6, cost: { seve: 14, fibre: 10 } } },
    vrillon: { ability: 'arc', keys: ['conduction', 'vol'], breed: 0 },

    croc_spore: { ability: 'rage', keys: [], mount: M(300), diet: { res: 'os', period: DIET1 }, breed: 0.4 },
    fouetteur: { ability: 'arc', keys: ['nage', 'conduction'], mount: M(260), diet: { res: 'ecaille', period: DIET1 }, breed: 0.4 },
    sentinelle: { ability: 'rayon', keys: ['conduction'], mount: M(210), diet: { res: 'ferraille', period: DIET1 }, breed: 0 },
    charognard: { ability: 'ruee', keys: ['fouisseur'], mount: M(320), diet: { res: 'os', period: DIET1 }, breed: 0.4 },
    mante: { ability: 'rage', keys: ['resonance'], mount: M(290), diet: { res: 'verre', period: DIET1 }, breed: 0.4 },
    requin_nuage: { ability: 'ruee', keys: ['nage', 'vol'], mount: M(300, true), diet: { res: 'ecaille', period: DIET1 }, breed: 0.3 },
    salamandre: { ability: 'flammes', keys: ['feu'], mount: M(250), diet: { res: 'braise', period: DIET1 }, breed: 0.4 },
    givreur: { ability: 'seisme', keys: ['fouisseur'], mount: M(230), diet: { res: 'fibre', period: DIET1 }, breed: 0.3 },
    dionee: { ability: 'entrave', keys: ['fouisseur'], diet: { res: 'membrane', period: DIET1 }, breed: 0.4 },
    pecheur: { ability: 'entrave', keys: ['nage', 'lumiere'], mount: M(250), diet: { res: 'ecaille', period: DIET1 }, breed: 0.3 },
    frelon: { ability: 'essaim', keys: ['vol'], mount: M(330, true), diet: { res: 'pollen', period: DIET1 }, breed: 0.5 },
    rodeur_acide: { ability: 'acide', keys: ['acide'], mount: M(260), diet: { res: 'membrane', period: DIET1 }, breed: 0.4 },
    phagocyte: { ability: 'soin', keys: ['acide'], diet: { res: 'membrane', period: DIET1 }, breed: 0.3 },
    spectre: { ability: 'saut', keys: ['vol'], breed: 0 },

    reine_mycelienne: { ability: 'nuage', keys: ['lumiere', 'acide'], diet: { res: 'seve', period: DIET2, n: 2 } },
    colosse_rouage: { ability: 'rayon', keys: ['conduction', 'fouisseur'], mount: M(220), diet: { res: 'ferraille', period: DIET2, n: 2 } },
    wyrm_os: { ability: 'seisme', keys: ['fouisseur'], mount: M(300), diet: { res: 'os', period: DIET2, n: 2 } },
    hydre_cristal: { ability: 'arc', keys: ['resonance'], mount: M(230), diet: { res: 'minerai', period: DIET2, n: 2 } },
    leviathan: { ability: 'vague', keys: ['nage', 'vol'], mount: M(260, true), diet: { res: 'corail', period: DIET2, n: 2 } },
    brasier: { ability: 'flammes', keys: ['feu', 'fouisseur'], mount: M(220), diet: { res: 'braise', period: DIET2, n: 2 } },
    matriarche: { ability: 'essaim', keys: ['vol', 'acide'], mount: M(300, true), diet: { res: 'pollen', period: DIET2, n: 2 } },
    titan_givre: { ability: 'gel', keys: ['fouisseur'], mount: M(220), diet: { res: 'givre', period: DIET2, n: 2 } },
    coeur_battant: { ability: 'soin', keys: ['acide'], diet: { res: 'membrane', period: DIET2, n: 2 } },
    observateur: { ability: 'vision', keys: ['lumiere', 'vol', 'resonance'] },

    sylvarque: { call: 'foret' },
    pyroclaste: { call: 'pluie_feu' },
    thalassor: { call: 'maree' },
    engrenage: { call: 'frappe' },
  };

  /** Traits complets d'une espèce (avec valeurs par défaut). */
  D.trait = function (id) {
    const c = D.CREATURE[id];
    const t = T[id] || D.EXTRA_TRAITS[id] || {};
    return {
      ability: t.ability || null,
      call: t.call || null,
      keys: t.keys || [],
      // les géants, réduits par l'Artefact, peuvent tous porter le joueur
      mount: t.mount || (c && c.tier >= 3 ? { speed: 255 + (c.tier - 3) * 15, fly: ['fly', 'drift', 'blink'].includes(c.move) } : null),
      diet: t.diet ? { res: t.diet.res, period: t.diet.period, n: t.diet.n || 1 } : null,
      breed: t.breed != null ? t.breed : c && c.tier === 0 ? 1 : c && c.tier === 1 ? 0.4 : 0,
      evo: t.evo || null,
    };
  };
  D.EXTRA_TRAITS = D.EXTRA_TRAITS || {}; // complété par les données des échelles supérieures

  /* ---------- progression d'une créature ---------- */
  D.MAX_LEVEL = 10;
  D.xpFor = (level) => Math.round(25 * Math.pow(level, 1.6));
  D.STAGES = [
    { name: '', level: 0, mul: 1, prod: 1, size: 1 },
    { name: 'aguerri', level: 5, mul: 1.15, prod: 1.2, size: 1.08 },
    { name: 'ancien', level: 9, mul: 1.3, prod: 1.45, size: 1.16 },
  ];
  /** Coût d'un stade générique : ressources produites ou laissées par l'espèce. */
  D.stageCost = function (id, stage) {
    const c = D.CREATURE[id];
    const res = (c.produces && c.produces.res) || Object.keys(c.drops || { fibre: 1 })[0];
    const n = (stage === 1 ? 6 : 14) * (1 + c.tier);
    const cost = { [res]: n };
    if (stage === 2) cost.essence = 1 + Math.floor(c.tier / 2);
    return cost;
  };

  D.LOYALTY = [
    { min: 0, name: 'Rebelle', desc: 'Refuse de vous suivre. Produit peu.' },
    { min: 20, name: 'Méfiante', desc: 'Vous suit, mais n’obéit pas toujours.' },
    { min: 50, name: 'Fidèle', desc: 'Vous suit et vous obéit.' },
    { min: 80, name: 'Dévouée', desc: 'Plus forte et plus réactive à vos côtés.' },
  ];
  D.loyaltyLevel = (v) => { let r = D.LOYALTY[0]; D.LOYALTY.forEach((l) => { if (v >= l.min) r = l; }); return r; };

  /** Capacité d'accueil des territoires (créatures). */
  D.CAPACITY = { fragment: 4, territoire: 10, coeur: 16, trone: 22, center: 12 };
})();
