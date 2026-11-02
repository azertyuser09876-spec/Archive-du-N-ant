/* Les colosses (1.16) : données pures, chargées après cosmos.js et beyond.js.
   Les maîtres des régions et des échelles supérieures (rang 3 et plus) ne sont plus
   des cibles qu'on use à coups de tirs : ce sont des corps immenses, animés pas à pas,
   qui errent dans leur paysage. On ne les abat pas en les criblant : on brise leurs
   sceaux, certains depuis le sol quand le colosse se découvre, d'autres en grimpant
   sur lui.

   Plans de corps (le squelette, animé par le code) :
   - bipede : deux jambes, deux bras, une tête ; il piétine, balaie, frappe le sol ;
   - quadrupede : quatre pattes, un cou, une carapace ;
   - serpent : un long corps qui suit sa tête, s'enfouit, charge ;
   - volant : un corps et deux ailes (ou nageoires), qui plane haut et plonge ;
   - roue : un moyeu et des bras qui tournent, balaient le sol, s'arrêtent pour se recharger ;
   - araignee : un corps suspendu sur de longues pattes, qui s'abaisse quand elles cèdent.

   Sceaux : `at` nomme un point du corps (voir colossus.js) ; `kind` dit comment l'atteindre :
   - 'bas' : depuis le sol, quand le colosse le découvre (pied planté, tête étourdie,
     ventre au ras du sol, bras au repos…) ; on tire dessus ou on le frappe ;
   - 'haut' : seulement en grimpant jusqu'à lui, puis en frappant (clic ; maintenu, plus fort).

   Pour chaque colosse : `look` (ornements dessinés), `signature` (son attaque propre),
   `hints` (ce que l'Artefact finit par remarquer, si l'on piétine) et `secret` (sa faiblesse,
   rangée dans le bestiaire dès le premier sceau brisé). */
(function () {
  'use strict';
  const D = window.AN.Data;

  /** Longueur du corps (px), selon le rang (1.16.2 : bien plus grands ; les derniers couvrent presque leur zone). */
  D.COLOSSUS_LENGTH = [0, 0, 0, 1100, 1350, 1600, 1800, 2000, 2200, 2400, 2600];
  /** À partir de ce rang, le colosse est la carte (1.16.3) : la zone du cœur, c'est lui, et le vide tout autour. */
  D.COLOSSUS_MAP_TIER = 7;
  /** Part de la vigueur du maître répartie entre ses sceaux. */
  D.COLOSSUS_SEAL_SHARE = 0.24;
  /** Dégâts de base d'un coup de corps, par rang (multipliés par la force du monde). */
  D.COLOSSUS_DMG = [0, 0, 0, 24, 27, 30, 33, 36, 38, 40, 42];

  D.COLOSSI = {
    /* ---------- maîtres des régions (rang 3) ---------- */
    sylvarque: {
      plan: 'bipede', size: 1, look: 'mousse',
      seals: [{ at: 'pied_g', kind: 'bas' }, { at: 'main_d', kind: 'bas' }, { at: 'dos', kind: 'haut' }],
      attacks: ['pietinement', 'balayage', 'racines'], signature: 'racines',
      hints: ['Quand il plante sa main dans le sol pour y faire pousser des racines, elle y reste un moment.', 'Sa jambe et son bras sont couverts de lianes : on peut s’y agripper (E).'],
      secret: 'Ses mains et ses pieds restent plantés après avoir frappé le sol : leurs sceaux se découvrent. Ses lianes mènent jusqu’au sceau du dos.',
    },
    pyroclaste: {
      plan: 'serpent', size: 1, look: 'braises', burrow: true,
      seals: [{ at: 'tete', kind: 'bas' }, { at: 'dorsal_1', kind: 'haut' }, { at: 'dorsal_2', kind: 'haut' }],
      attacks: ['charge', 'plongee', 'morsure'], signature: 'geyser',
      hints: ['Il fonce droit sur vous. Et s’il heurtait la roche ?', 'Étourdi, il ne bouge plus : c’est le moment de grimper sur son dos.'],
      secret: 'Lancé contre un mur de roche, il s’assomme : le sceau de sa tête se découvre, et son dos s’offre à l’escalade.',
    },
    thalassor: {
      plan: 'volant', size: 1, look: 'nageoires',
      seals: [{ at: 'ventre', kind: 'bas' }, { at: 'dos', kind: 'haut' }, { at: 'queue', kind: 'haut' }],
      attacks: ['plongeon', 'bourrasque', 'pluie'], signature: 'pluie',
      hints: ['Son ombre annonce son plongeon. Au ras du sol, son ventre est à portée de tir.', 'Quand il rase le sol, sa queue et ses nageoires passent à portée de main (E).'],
      secret: 'Il plonge sur vous au ras du sol : son ventre se tire alors, et l’on peut s’agripper à sa queue pour atteindre son dos.',
    },
    engrenage: {
      plan: 'roue', size: 1, look: 'engrenages', arms: 4,
      seals: [{ at: 'bras_1', kind: 'bas' }, { at: 'bras_3', kind: 'bas' }, { at: 'moyeu', kind: 'haut' }],
      attacks: ['tourbillon', 'onde', 'roulement'], signature: 'inversion',
      hints: ['De temps en temps, ses rouages s’arrêtent pour se recharger.', 'À l’arrêt, ses bras reposent au sol : on peut grimper jusqu’au moyeu.'],
      secret: 'Il s’arrête régulièrement pour se recharger : ses bras posés au sol découvrent leurs sceaux, et mènent jusqu’au moyeu.',
    },

    /* ---------- souverains du monde (rang 4) ---------- */
    atlas: {
      plan: 'bipede', size: 1.05, look: 'continent',
      seals: [{ at: 'pied_d', kind: 'bas' }, { at: 'main_g', kind: 'bas' }, { at: 'dos', kind: 'haut' }, { at: 'tete', kind: 'haut' }],
      attacks: ['pietinement', 'balayage', 'ecrasement'], signature: 'eboulis',
      hints: ['Un continent repose sur ses épaules. Quand il se secoue, des rochers en tombent.', 'Ses poings écrasés au sol y restent un instant : par l’avant-bras, on monte.'],
      secret: 'Il écrase le sol de ses poings et de ses pieds, qui y restent pris un moment. Son dos porte un continent : on y grimpe, et sa tête n’est pas loin.',
    },
    leviathan_tellurique: {
      plan: 'serpent', size: 1.05, look: 'cristaux', burrow: true,
      seals: [{ at: 'tete', kind: 'bas' }, { at: 'dorsal_1', kind: 'haut' }, { at: 'dorsal_2', kind: 'haut' }, { at: 'dorsal_3', kind: 'haut' }],
      attacks: ['charge', 'plongee', 'morsure'], signature: 'seisme',
      hints: ['Chaque fois qu’il plonge, la terre tremble. Mais quand il charge, il ne regarde pas devant lui.', 'Une falaise est son ennemie : faites-le charger contre la roche.'],
      secret: 'Il charge sans regarder : contre la roche, il s’assomme. Sa tête et son échine se découvrent alors.',
    },
    tortue_monde: {
      plan: 'quadrupede', size: 1.1, look: 'carapace',
      seals: [{ at: 'tete', kind: 'bas' }, { at: 'pied_av_g', kind: 'bas' }, { at: 'dos', kind: 'haut' }, { at: 'queue', kind: 'haut' }],
      attacks: ['pietinement', 'morsure', 'charge'], signature: 'carapace',
      hints: ['Quand elle mord, sa tête reste un instant au sol.', 'Rentrée dans sa carapace, elle est intouchable. Grimpez par une patte quand elle ressort.'],
      secret: 'Après une morsure, sa tête reste au sol : son sceau se découvre. Sa carapace se gravit par les pattes, jusqu’au sceau du dos et à celui de la queue.',
    },

    /* ---------- cataclysmes planétaires (rang 5) ---------- */
    baleine_orbitale: {
      plan: 'volant', size: 1.05, look: 'nageoires',
      seals: [{ at: 'ventre', kind: 'bas' }, { at: 'aile_g', kind: 'haut' }, { at: 'dos', kind: 'haut' }, { at: 'nuque', kind: 'haut' }],
      attacks: ['plongeon', 'bourrasque', 'souffle'], signature: 'aspiration',
      hints: ['Quand elle ouvre la gueule, elle aspire tout ce qui flotte : éloignez-vous de sa tête.', 'Ses passages au ras du sol sont le seul moment où l’atteindre.'],
      secret: 'Elle rase le sol à chaque plongeon : son ventre se tire alors, et ses nageoires se saisissent. Sur son dos, elle se roule pour vous jeter dans le vide.',
    },
    serpent_annulaire: {
      plan: 'serpent', size: 1.05, look: 'glace', burrow: false,
      seals: [{ at: 'tete', kind: 'bas' }, { at: 'queue', kind: 'bas' }, { at: 'dorsal_1', kind: 'haut' }, { at: 'dorsal_3', kind: 'haut' }],
      attacks: ['charge', 'morsure', 'enroulement'], signature: 'enroulement',
      hints: ['Il s’enroule autour de vous pour vous broyer. Quand l’anneau se ferme, il se mord la queue.', 'Une esquive franchit son corps. Ou bien, agrippez-vous à lui.'],
      secret: 'Il vous encercle et se mord la queue : à cet instant, sa tête et sa queue se découvrent. Le reste de son corps se gravit.',
    },
    titan_lune: {
      plan: 'bipede', size: 1.1, look: 'cratères',
      seals: [{ at: 'pied_g', kind: 'bas' }, { at: 'pied_d', kind: 'bas' }, { at: 'dos', kind: 'haut' }, { at: 'tete', kind: 'haut' }],
      attacks: ['pietinement', 'balayage', 'bond'], signature: 'bond',
      hints: ['Il bondit et retombe de tout son poids : ses deux pieds restent alors pris dans le cratère.', 'Ses jambes se gravissent : son dos et sa tête portent ses derniers sceaux.'],
      secret: 'Après un bond, ses deux pieds restent pris dans le régolithe : leurs sceaux se découvrent, et ses jambes mènent au dos.',
    },

    /* ---------- entités stellaires (rang 6) ---------- */
    astre_veilleur: {
      plan: 'roue', size: 1, look: 'rayons', arms: 6,
      seals: [{ at: 'bras_1', kind: 'bas' }, { at: 'bras_3', kind: 'bas' }, { at: 'bras_5', kind: 'bas' }, { at: 'moyeu', kind: 'haut' }],
      attacks: ['tourbillon', 'onde', 'souffle'], signature: 'eclipse',
      hints: ['Ses rayons brûlent tant qu’il tourne. Il s’éclipse parfois pour reprendre son souffle.', 'Pendant l’éclipse, ses rayons reposent : leurs pointes se tirent, et ils mènent au cœur.'],
      secret: 'Il s’éclipse pour se recharger : ses rayons s’éteignent et se posent, leurs sceaux se découvrent, et l’on grimpe jusqu’au cœur.',
    },
    phenix_plasma: {
      plan: 'volant', size: 1, look: 'plumes',
      seals: [{ at: 'ventre', kind: 'bas' }, { at: 'aile_d', kind: 'haut' }, { at: 'dos', kind: 'haut' }, { at: 'nuque', kind: 'haut' }],
      attacks: ['plongeon', 'bourrasque', 'souffle'], signature: 'sillage',
      hints: ['Chaque plongeon laisse un sillage de plasma : ne restez pas sur sa trajectoire.', 'Ses plumes de traîne se saisissent quand il passe au ras du sol.'],
      secret: 'Il plonge en laissant du feu derrière lui : sur le côté de sa trajectoire, on tire sur son ventre, et l’on saisit ses plumes pour monter sur son dos.',
    },

    /* ---------- organismes galactiques (rang 7) ---------- */
    myriade: {
      plan: 'araignee', size: 1, look: 'etoiles', legs: 8,
      seals: [{ at: 'patte_1', kind: 'bas' }, { at: 'patte_4', kind: 'bas' }, { at: 'patte_6', kind: 'bas' }, { at: 'corps', kind: 'haut' }],
      attacks: ['empalement', 'toile', 'onde'], signature: 'dispersion',
      hints: ['Elle se disperse et se recompose ailleurs. Ses pattes plantées se figent un instant.', 'Chaque patte brisée l’abaisse : son corps finit à portée.'],
      secret: 'Ses pattes se plantent pour frapper et s’y figent : leurs sceaux se découvrent. Chaque patte brisée abaisse son corps, jusqu’à ce qu’on puisse y monter.',
    },
    spirale_mere: {
      plan: 'roue', size: 1.05, look: 'spirale', arms: 5,
      seals: [{ at: 'bras_1', kind: 'bas' }, { at: 'bras_2', kind: 'bas' }, { at: 'bras_4', kind: 'bas' }, { at: 'moyeu', kind: 'haut' }],
      attacks: ['tourbillon', 'onde', 'roulement'], signature: 'attraction',
      hints: ['En tournant, elle attire tout vers son cœur. Elle doit pourtant s’arrêter.', 'À l’arrêt, ses bras touchent le sol.'],
      secret: 'Elle vous attire en tournant, mais s’arrête pour se recharger : ses bras posés se tirent et se gravissent jusqu’au cœur.',
    },

    /* ---------- au-delà (rangs 8 à 10) ---------- */
    berger_amas: {
      plan: 'bipede', size: 1.1, look: 'etoiles',
      seals: [{ at: 'main_d', kind: 'bas' }, { at: 'pied_g', kind: 'bas' }, { at: 'dos', kind: 'haut' }, { at: 'tete', kind: 'haut' }, { at: 'epaule_g', kind: 'haut' }],
      attacks: ['pietinement', 'balayage', 'houlette'], signature: 'houlette',
      hints: ['Sa houlette vous ramène à lui. Quand il la plante, elle reste en terre.', 'Son bras planté est un chemin vers ses épaules.'],
      secret: 'Il plante sa houlette pour vous ramener : sa main reste au sol, son sceau se découvre, et son bras mène aux épaules, au dos et à la tête.',
    },
    tisserand: {
      plan: 'araignee', size: 1.1, look: 'fils', legs: 8,
      seals: [{ at: 'patte_2', kind: 'bas' }, { at: 'patte_3', kind: 'bas' }, { at: 'patte_6', kind: 'bas' }, { at: 'patte_7', kind: 'bas' }, { at: 'corps', kind: 'haut' }],
      attacks: ['empalement', 'toile', 'onde'], signature: 'toile',
      hints: ['Il tisse des fils qui ralentissent. Ses pattes se figent un instant quand elles frappent.', 'Brisez ses pattes : il s’affaisse, et son corps devient accessible.'],
      secret: 'Ses pattes se figent après avoir frappé : brisez leurs sceaux, il s’affaisse, et son corps se gravit.',
    },
    relieur: {
      plan: 'roue', size: 1.05, look: 'pages', arms: 6,
      seals: [{ at: 'bras_1', kind: 'bas' }, { at: 'bras_3', kind: 'bas' }, { at: 'bras_5', kind: 'bas' }, { at: 'bras_6', kind: 'bas' }, { at: 'moyeu', kind: 'haut' }],
      attacks: ['tourbillon', 'onde', 'roulement'], signature: 'inversion',
      hints: ['Ses pages tournent, puis repartent dans l’autre sens. Elles se referment parfois pour se relire.', 'Refermé, il pose ses pages : on monte jusqu’à la reliure.'],
      secret: 'Il se referme régulièrement pour se relire : ses pages posées se découvrent, et mènent à la reliure.',
    },
  };

  /** Ce que disent l'interface et l'Artefact pendant le combat. */
  D.COLOSSUS_TEXT = {
    grab: 'S’agripper',
    strike: 'Frapper le sceau',
    fall: 'Vous lâchez prise.',
    ricochet: 'ça ricoche',
    tooHigh: 'trop haut : grimpez',
    sealBroken: 'Un sceau se brise.',
    lastSeal: 'Le dernier sceau se brise : le colosse s’effondre.',
    under: 'Il plonge : vous êtes rejeté.',
  };
})();
