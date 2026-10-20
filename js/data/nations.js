/* Nations (1.12) : données pures, chargées après civs.js et puissance.js.
   Certains mondes sont tenus tout entiers par un peuple : une ville dans chaque
   zone, leur capitale au cœur, un souverain. On y commerce, on y engage des
   mercenaires, on gagne leur faveur ; leur monde peut rejoindre l'Archive, par
   alliance ou par la force, et devient alors un lieu ancré peuplé, qui envoie
   un tribut. */
(function () {
  'use strict';
  const D = window.AN.Data;

  /* ---------- les peuples à l'échelle des mondes ----------
     realm : le nom de leur État ; reach : les échelons où ils tiennent des mondes ;
     biomes : ils gagnent les paysages de la 1.11 et, pour les peuples qui ont quitté
     leur sol, quelques biomes cosmiques. */
  const P = (id, p) => { const x = D.PEOPLE[id]; if (!x) return; Object.assign(x, { realm: p.realm, reach: p.reach }); (p.biomes || []).forEach((b) => { if (!x.biomes.includes(b)) x.biomes.push(b); }); };
  P('pales', { realm: 'Théocratie des Pâles', reach: ['region', 'monde'], biomes: ['salines', 'calotte_polaire'] });
  P('cendriers', { realm: 'Confédération des forges', reach: ['region', 'monde', 'systeme'], biomes: ['rift_continental', 'couronne_solaire', 'ceinture_fer'] });
  P('rouages', { realm: 'Mécanocratie des Rouages', reach: ['region', 'monde', 'orbite', 'systeme'], biomes: ['epave_orbitale', 'ceinture_asteroides', 'ceinture_fer'] });
  P('myceliens', { realm: 'Grand Réseau mycélien', reach: ['region', 'monde'], biomes: ['foret_continent'] });
  P('nautes', { realm: 'Thalassocratie des Nautes', reach: ['region', 'monde', 'orbite', 'systeme'], biomes: ['mer_interieure', 'anneau_glace', 'geante_gazeuse'] });
  P('chitinides', { realm: 'Ruche-État chitinide', reach: ['region', 'monde'], biomes: ['foret_cire'] });
  P('lithes', { realm: 'Ordre des Socles', reach: ['region', 'monde', 'orbite'], biomes: ['calotte_polaire', 'mer_regolithe'] });
  P('veilleurs', { realm: 'Garde du Seuil', reach: ['region'], biomes: [] });

  D.NATION = {
    /** Chance qu'une destination soit un monde tout entier tenu par un peuple. */
    chance: { region: 0.12, monde: 0.3, orbite: 0.18, systeme: 0.18 },
    minThreat: 2,
    /** Les humeurs d'une nation (sous-ensemble des attitudes des peuples). */
    attitudes: { suppliants: 'Accueillants', voleurs: 'Marchands', fiers: 'Fiers', devots: 'Dévots', hostiles: 'Hostiles', iconoclastes: 'Iconoclastes' },
    /** Faveur : de −100 à 100. Au départ, selon l'humeur, la réputation et ce que ce peuple sait de vous. */
    favor: {
      start: { devots: 55, suppliants: 35, voleurs: 15, fiers: 0, hostiles: -60, iconoclastes: -80 },
      rep: { arche: 10, dieu: 20, collecteur: 0, fleau: -25, pillard: -15, inconnu: 0 },
      saved: 2, savedMax: 20, harmed: -3, harmedMax: -30, // par habitant de ce peuple sauvé, ou emmené de force et tué
      trade: 2, tradeMax: 20, // par échange, pendant une expédition
      guardian: 12, // un gardien qui menaçait l'une de leurs villes
      gift: 10, giftMax: 3, // présents au souverain, par expédition
      killCitizen: -15, killGuard: -6,
      alliance: 60, // seuil de l'alliance
      mercs: 0, champion: 40, // seuils pour engager des mercenaires, et leur champion
      hostile: -20, // en dessous, les villes ferment leurs portes
    },
    /** Rang d'Ancrage nécessaire pour ancrer un monde entier, selon son échelon. */
    anchorTier: { region: 3, monde: 4, orbite: 5, systeme: 6 },
    /** Tribut d'une nation ancrée : toutes les `period` minutes, `base` unités par ressource, multipliées par l'échelle. */
    tribute: { period: 20, base: 5, vassal: 1.5, rare: 0.35 },
    mercMax: 3,
    /** Prix du commerce : valeur × (multiplicateur) ; une faveur haute fait baisser les prix. */
    price: { base: 1.3, max: 1.6, min: 0.8, per: 1 / 200 },
    /** Valeur d'échange de ce qui n'est pas une ressource. */
    value: { consumable: 22, egg: 70 },
    /**
     * Raids de bêtes sur une ville amie (1.13) : `chance` par ville, une fois par visite,
     * entre `delay` secondes après l'arrivée ; `waves` vagues de `size` bêtes (plus une par
     * deux points de menace). Ceux qui aident gagnent `favor` (+`perKill` par bête abattue).
     */
    raid: { chance: 0.35, delay: [25, 45], waves: 2, size: 3, gap: 9, favor: 8, perKill: 1, perKillMax: 6 },
    /** Demandes d'une nation ancrée, depuis la console (1.13) : une par tranche de 30 minutes. */
    request: { amount: 12, favor: 8, reward: 2 },
    /** Dans une nation ancrée, un gouverneur dont on a accompli la mission n'en donne pas d'autre avant ce délai (minutes). */
    missionCooldown: 30,
  };

  /**
   * Missions des gouverneurs (1.13) : une par ville (hors capitale), tirée de la graine.
   * {ville}, {n}, {de_res} (« de fibre », « d’os »), {zone}, {gardien} sont remplacés à l'affichage.
   * favor : faveur gagnée ; la récompense (ressource préférée du peuple, et une ressource
   * rare de leur paysage) suit l'échelle du monde.
   */
  D.NATION_MISSIONS = {
    battue: { name: 'Battue', text: 'Des bêtes rôdent autour de {ville}. Abattez-en {n} dans les environs.', favor: 8, weight: 3 },
    livraison: { name: 'Livraison', text: 'Nos réserves {de_res} sont vides. Apportez-en {n}.', favor: 8, weight: 3 },
    defense: { name: 'Défense', text: 'Une harde approche de {ville}. Restez, et aidez nos gardes à la repousser.', favor: 12, weight: 2 },
    caravane: { name: 'Caravane perdue', text: 'Une de nos caravanes n’est pas revenue de {zone}. Retrouvez sa cargaison et rapportez-la.', favor: 10, weight: 2 },
    gardien: { name: 'Le gardien', text: '{gardien} rôde sur nos routes. Abattez-le, ou emportez-le dans votre Archive.', favor: 10, weight: 2 },
  };
  /** Ce que disent les gouverneurs. */
  D.GOVERNOR_LINES = {
    offer: ['Vous tombez bien. Nous avons besoin de quelqu’un comme vous.', 'Le souverain est loin, et nos ennuis sont tout près.'],
    active: ['Alors ?', 'Nous comptons sur vous.'],
    ready: ['C’est fait ? Alors voici ce qui vous revient.'],
    done: ['Nous vous devons beaucoup. La ville s’en souviendra.', 'Revenez quand vous voulez.'],
    failed: ['Vous êtes parti. Nous avons tenu, de justesse, et sans vous.'],
  };

  /** Mercenaires : rôle d'habitant, nom, prix (en ressource préférée du peuple, plus un peu de leurs ressources rares). */
  D.MERCS = {
    guard: { name: 'Garde', desc: 'Au corps à corps, solide.', cost: 5 },
    archer: { name: 'Archer', desc: 'À distance, prudent.', cost: 6 },
    champion: { name: 'Champion', desc: 'Leur meilleur combattant.', cost: 14, rare: 1 },
  };
  D.CIV_ROLES.champion = { r: 12, hp: 220, speed: 110, attack: { type: 'slam', dmg: 16, cd: 1.8, radius: 72, windup: 0.55 } };
  D.CIV_ROLES.sovereign = { r: 13, hp: 600, speed: 70, attack: { type: 'shoot', dmg: 12, cd: 1.1, speed: 340, count: 5, spread: 0.55, size: 6, color: '#ffffff', range: 360 } };

  /** Répliques du souverain, selon l'humeur de la nation. */
  D.NATION_LINES = {
    suppliants: ['Notre monde est le tien, si tu le veux. Les autres s’éteignent ; nous, nous voudrions durer.', 'On dit que ton Archive garde ce qu’elle prend. Garde-nous.'],
    voleurs: ['Tout s’achète, voyageur. Même une place dans ton Archive. Commençons par de plus petites choses.', 'Nos comptoirs sont ouverts. Nos portes aussi, pour qui paie.'],
    fiers: ['Ce monde est à nous depuis qu’il existe. Prouve que ton Archive vaut mieux que lui.', 'Nous ne suivons personne. Mais nous écoutons ceux qui nous aident.'],
    devots: ['Le Blanc est venu jusqu’à notre capitale ! Prends notre monde, il t’attendait.', 'Nos prêtres l’avaient annoncé. Nous t’offrons tout ce que nous sommes.'],
    hostiles: ['Encore un collecteur de mondes. Celui-ci, on ne te le donnera pas.'],
    iconoclastes: ['Ton Archive est une tombe. Notre monde n’y entrera pas, et toi tu n’en ressortiras pas.'],
    allie: ['Notre monde tient dans ton Archive, et il tient bien. Que veux-tu de nous ?', 'Nos villes vont bien. Nos marchands s’ennuient de toi.'],
    vassal: ['Que veux-tu encore ?', 'Nous payons. Nous n’avons pas oublié.'],
    defait: ['À genoux, le souverain lève une main. « Assez. Que veux-tu de notre monde ? »'],
  };
})();
