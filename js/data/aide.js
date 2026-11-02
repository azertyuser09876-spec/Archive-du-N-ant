/* L'aide (1.15) : données pures, chargées après recit.js.
   - D.HELP : pour chaque page de la console, l'essentiel en quelques lignes (bouton « ? ») ;
   - D.TIPS : les conseils, montrés la première fois qu'un système apparaît, puis
     rangés dans le Guide (console, Savoir) ;
   - D.TOUR : la visite guidée de la console, à la première ouverture. */
(function () {
  'use strict';
  const D = window.AN.Data;

  D.HELP = {
    destinations: [
      'Chaque monde capté par l’Artefact a sa fiche. Le danger y est donné pour vous : il compare la force de ce qui y vit à la vôtre (équipement, compagnons, améliorations).',
      'Facile, Équilibré, Difficile, Mortel : commencez par l’équilibré, gardez le mortel pour plus tard.',
      'Sur la carte, plus un monde est loin du centre, plus il est dangereux pour vous.',
      'Tout ce que dit la fiche est exact. Ce que le scanner ne perçoit pas encore est marqué d’un « ? » : améliorez le scanner pour en savoir plus.',
      'Un monde visité est détruit à votre départ, sauf les lieux ancrés et les mondes des nations.',
    ],
    preparation: [
      'Choisissez votre équipement et vos compagnons, puis ouvrez le passage.',
      'Ce qui n’est pas « lié » est perdu si vous tombez ; l’équipement de départ, lui, est lié.',
      'Le danger affiché tient compte de l’équipement choisi : il change pendant que vous préparez.',
    ],
    hexagone: [
      'L’hexagone de l’Artefact part avec vous : c’est votre point d’arrivée et d’extraction.',
      'Des gardes (créatures de la collection) le défendent pendant que vous explorez ; des modules le renforcent.',
      'S’il tombe, l’Artefact rentre seul avec la soute : vous devrez sortir par une plaque blanche.',
    ],
    atelier: [
      'Fabriquez armes, protections, sacs, consommables et outils avec la réserve de l’Archive.',
      'Ce qui est fabriqué et emporté est perdu si vous tombez.',
    ],
    'upgrades-page': [
      'Les améliorations de l’Artefact agissent sur toutes les expéditions : soute, liens (compagnons), stabilisateur, scanner, rayon de capture, ancrage.',
      'Certaines attendent que l’Archive grandisse (son rang).',
    ],
    constructions: [
      'Les bâtiments se posent sur les territoires et les suivent quand on agence l’Archive.',
      'Un paysage favorable renforce leur effet.',
    ],
    overview: [
      'L’état de l’Archive : son rang, ses territoires, sa production, ses bienfaits.',
      'Le rang grandit avec ce que vous ramenez : territoires, gardiens, êtres plus grands.',
    ],
    collection: [
      'Vos créatures vivent dans leurs territoires et y produisent.',
      'Choisissez vos compagnons (le nombre dépend des « liens » de l’Artefact) : ils combattent avec vous et prêtent une capacité (touche Q).',
      'Une créature nourrie et dans son habitat est fidèle ; elle gagne des niveaux et peut évoluer.',
    ],
    peuples: [
      'Les peuples que vous avez sauvés vivent dans l’Archive, avec leurs humeurs et leurs demandes.',
      'Les nations ancrées envoient un tribut, et on peut commercer avec elles.',
      'Ce que vous faites aux peuples, les mondes s’en souviennent : c’est votre réputation.',
    ],
    bestiaire: [
      'Toutes les espèces observées, et ce qu’on sait d’elles. « Chercher » indique quels mondes les abritent.',
    ],
    journal: [
      'La vie de l’Archive, le récit (fragments retrouvés, acte par acte) et vos expéditions passées.',
    ],
    guide: [
      'Les conseils déjà vus, et ceux qui restent à découvrir. Vous pouvez refaire la visite de la console.',
    ],
  };

  /** Conseils : la première fois que le système apparaît (une seule fois), puis dans le Guide. */
  D.TIPS = [
    { id: 'archive', where: 'Archive', title: 'L’Archive', text: 'Ce que vous ramenez y vit et y produit. Ramassez les ressources qui apparaissent sur les territoires, puis approchez l’Artefact (E) pour ouvrir la console.' },
    { id: 'console', where: 'Archive', title: 'La console', text: 'Quatre chapitres : Partir (choisir un monde), Fabriquer, L’Archive (vos créatures et vos peuples), Savoir. Le « ? » de chaque page en dit l’essentiel.' },
    { id: 'danger', where: 'Console', title: 'Le danger', text: 'Il compare ce qui vit dans un monde à votre force. Facile, Équilibré, Difficile, Mortel : il change avec votre équipement et vos compagnons.' },
    { id: 'companions', where: 'Expédition', title: 'Compagnons et capacités', text: 'Vos compagnons combattent à vos côtés. Chacun prête une capacité : Q pour l’utiliser, la molette pour changer. Relevez-les (E, maintenu) s’ils tombent.' },
    { id: 'mount', where: 'Expédition', title: 'Monture', text: 'Certains compagnons se chevauchent : R près d’eux. Plus rapide, et certains franchissent les terrains dangereux.' },
    { id: 'call', where: 'Expédition', title: 'Appel', text: 'Un appel stratégique (G) fait venir l’un de vos êtres les plus grands, une fois par expédition.' },
    { id: 'vault', where: 'Expédition', title: 'Caveaux', text: 'Une barrière scelle un caveau. Il faut un compagnon qui possède la bonne clé (feu, fouisseur…) : approchez-le de la barrière.' },
    { id: 'village', where: 'Expédition', title: 'Les peuples', text: 'Parlez à leur chef (E). Ils peuvent vous suivre dans l’Archive si vous les sauvez de l’effondrement : rassemblez-les sur une plaque.' },
    { id: 'nation', where: 'Expédition', title: 'Les nations', text: 'Un peuple tient ce monde : une ville par zone. Commercez, rendez service aux gouverneurs, gagnez leur faveur. Leur monde peut rejoindre l’Archive.' },
    { id: 'bag', where: 'Expédition', title: 'Sac et soute', text: 'Le sac porte les ressources (Tab pour le voir), la soute de l’Artefact les créatures, œufs et territoires. Rien n’est acquis avant l’extraction.' },
    { id: 'extract', where: 'Expédition', title: 'Extraction', text: 'À l’hexagone (E) ou sur une plaque blanche : choisissez les territoires conquis à emporter, puis tenez pendant que le monde s’efface.' },
    { id: 'emergency', where: 'Expédition', title: 'Extraction d’urgence', text: 'En danger ? Maintenez X : l’Artefact vous arrache au monde, mais vous perdez l’essentiel du butin.' },
    { id: 'structure', where: 'Expédition', title: 'Structures', text: 'Un bâtiment abandonné : fouillez-le (E). Avec un kit de démontage, on peut l’emporter et le reconstruire dans l’Archive.' },
    { id: 'event', where: 'Expédition', title: 'Événements', text: 'Un monde vit : migrations, tempêtes, pluies de météores… Ils passent ; certains rapportent.' },
    { id: 'echelon', where: 'Expédition', title: 'Échelles supérieures', text: 'Chaque échelle a ses déplacements et ses menaces. Son maître se capture d’une façon propre : la fiche le dit.' },
    { id: 'colossus', where: 'Expédition', title: 'Les colosses', text: 'Les maîtres des régions et des échelles supérieures sont des colosses : on ne les use pas à coups de tirs. Brisez leurs sceaux lumineux. Ceux du bas se découvrent quand le colosse frappe ou s’expose ; ceux du haut s’atteignent en grimpant sur lui. Son dos est un paysage : des créatures y vivent, des gisements s’y récoltent.' },
    { id: 'colmap', where: 'Expédition', title: 'Un colosse-carte', text: 'Les plus grands maîtres sont la zone entière : on arrive sur leur dos avec la plateforme de l’Artefact, et tout autour, c’est le vide. On n’en descend pas : une chute vous fait glisser jusqu’à la plateforme. Ses sceaux du bas s’atteignent à pied, au bout de ses membres. Pour repartir, extraire ou retourner d’où vous venez : E sur la plateforme.' },
    { id: 'climb', where: 'Expédition', title: 'Grimper', text: 'E près d’une partie basse de son corps pour vous agripper ; C maintenu près de lui, un saut pour atteindre plus haut. Sur lui, on marche librement : on y tire et on y frappe comme au sol, on récolte (E) ; près d’un sceau, clic pour le frapper (clic droit maintenu : plus fort). C pour sauter vers une autre prise (la flèche pointillée), Espace pour lâcher prise. Quand il se secoue, maintenez E. Votre prise s’épuise lentement : reprenez votre souffle immobile sur une surface plate.' },
    { id: 'evolve', where: 'Archive', title: 'Évolution', text: 'Une créature fidèle et expérimentée peut évoluer (Collection) : plus forte, plus productive, plus grande.' },
    { id: 'arrange', where: 'Archive', title: 'Agencer l’Archive', text: 'V pour agencer : déplacez les territoires, formez des synergies entre paysages voisins.' },
    { id: 'rank', where: 'Archive', title: 'Rangs de l’Archive', text: 'L’Archive grandit avec ce que vous ramenez. Chaque rang ouvre de nouvelles améliorations et, plus tard, de nouvelles échelles.' },
  ];

  /** Visite guidée de la console : une page, une phrase. */
  D.TOUR = [
    { tab: 'destinations', text: 'Partir. Les mondes captés par l’Artefact, sur une carte : le centre est sûr, les bords sont dangereux. Touchez un monde pour lire sa fiche.' },
    { tab: 'destinations', anchor: '.fiche-danger', text: 'Le danger, pour vous. Il compare ce qui vit là-bas à votre force. Commencez par l’équilibré.' },
    { tab: 'collection', text: 'L’Archive. Vos créatures : choisissez ici vos compagnons d’expédition.' },
    { tab: 'artefact', text: 'Fabriquer. Améliorez l’Artefact : plus de soute, plus de compagnons, un meilleur scanner.' },
    { tab: 'guide', text: 'Savoir. Tous les conseils, et cette visite, sont rangés ici. Le « ? » de chaque page en dit l’essentiel.' },
  ];
})();
