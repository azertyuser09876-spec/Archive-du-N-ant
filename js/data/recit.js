/* Le récit (1.14) : données pures, chargées après nations.js et noms.js.
   Une histoire discrète en quatre actes, calée sur les rangs de l'Archive :
   des fragments, des silences, des lieux qui racontent, jamais de grand dialogue.
   Pas de fin pour l'instant : le dernier fragment laisse la page ouverte.
   - D.ACTS : les actes, leurs rangs, les quelques lignes qui les ouvrent ;
   - chaque fragment de D.LORE reçoit un acte (`act`) et, s'il ne se trouve qu'en un
     lieu précis, ce lieu (`site`) ;
   - D.STORY_SITES : les lieux qui racontent, un par acte ;
   - D.CHRONICLES : ce que chaque peuple se rappelle de celui d'avant ;
   - D.ARTEFACT_FORMS, D.ARTEFACT_TINTS : les formes de l'Artefact et sa couleur. */
(function () {
  'use strict';
  const D = window.AN.Data;

  /* ---------------- les actes ---------------- */
  D.ACTS = [
    { n: 1, id: 'solitude', title: 'La solitude', from: 0, open: null }, // l'ouverture du premier acte est l'introduction du jeu
    { n: 2, id: 'prix', title: 'Le prix', from: 3, open: ['Ils étaient là avant vous.', 'Chaque monde que vous emportez en laisse un autre derrière vous.', 'Celui-là, personne ne l’emporte.'] },
    { n: 3, id: 'origine', title: 'L’origine', from: 6, open: ['Vu de loin, le blanc a des bords.', 'Quelqu’un les a tracés.'] },
    { n: 4, id: 'pli', title: 'Le Pli', from: 11, open: ['Il n’y a plus rien au-dessus.', 'Alors on regarde en dessous.', 'On y voit une main, et une page.'] },
  ];
  // l'introduction ne dit plus « seul » : elle s'adresse à tout le monde
  D.INTRO[0] = 'Il n’y a toujours eu que toi.';

  /* ---------------- fragments : acte de chacun ---------------- */
  const ACT_OF = {
    l1: 1, l2: 1, l3: 1, l6: 1, l9: 1, l10: 1,
    l5: 2, l8: 2, l12: 2, l14: 2, l16: 2, l17: 2, l22: 2,
    l4: 3, l7: 3, l11: 3, l13: 3, l15: 3, l19: 3, l20: 3, l21: 3, l23: 3, l24: 3, l25: 3, l26: 3,
    l18: 4, l27: 4,
  };
  D.LORE.forEach((l) => { l.act = ACT_OF[l.id] || 3; });
  D.LORE.push(
    // I. La solitude
    { id: 'l28', act: 1, site: 'empreintes', title: 'Galet poli', text: 'Sur une face, un losange. Sur l’autre, rien. On l’a usé à force de le tenir.' },
    { id: 'l29', act: 1, title: 'Registre vide', text: 'Une seule ligne, en haut de la première page : « Premier jour ». Le reste est blanc.' },
    { id: 'l30', act: 1, title: 'Inscription au seuil', text: 'Personne n’est venu par ce chemin avant toi. Personne n’est reparti par l’autre.' },
    // II. Le prix
    { id: 'l31', act: 2, site: 'cairn', title: 'Liste de noms', text: 'Des noms, des centaines, puis un trait. En dessous : « les autres sont restés ».' },
    { id: 'l32', act: 2, title: 'Traité scellé', text: 'Nous lui céderons notre monde, mais pas notre nom. Le nom, nous le gardons.' },
    { id: 'l33', act: 2, title: 'Chant de caserne', text: 'On ne se bat pas pour le Blanc. On se bat pour ceux qu’il ne prendra pas.' },
    { id: 'l34', act: 2, title: 'Plainte gravée', text: 'Il a pris la forêt et laissé les oiseaux. Les oiseaux tournent encore au-dessus du vide.' },
    // III. L'origine
    { id: 'l35', act: 3, title: 'Mode d’emploi', text: 'Poser l’objet sur le blanc. Attendre. Ne pas regarder trop loin.' },
    { id: 'l36', act: 3, title: 'Inventaire', text: 'Mondes : beaucoup. Peuples : quelques-uns. Archivistes : un. Puis un autre.' },
    { id: 'l37', act: 3, site: 'hexagone', title: 'Lettre à qui viendra ensuite', text: 'Tu trouveras mon hexagone. Ne le répare pas. Il n’était pas cassé à mon départ : il s’est éteint quand j’ai compris.' },
    // IV. Le Pli
    { id: 'l38', act: 4, title: 'Feuille volante', text: 'Le Pli est l’endroit où la page se replie sur elle-même. De là, on voit l’envers de tout.' },
    { id: 'l39', act: 4, site: 'page', title: 'Croquis', text: 'Quelqu’un penché sur une table. Sur la table, une Archive. Dans l’Archive, quelqu’un penché sur une table.' },
    { id: 'l40', act: 4, title: 'Ratures', text: 'On a effacé plusieurs mondes. On voit encore la trace du crayon.' },
    { id: 'l41', act: 4, title: 'Mot laissé sur la page', text: 'Je ne sais pas qui tiendra la plume après moi. J’espère que ce sera toi.' },
    { id: 'l42', act: 4, title: 'Écho', text: 'Vous vous entendez parler. Vous ne vous souvenez pas l’avoir dit. Vous le direz.' },
    { id: 'l43', act: 4, last: true, title: 'Dernière ligne', text: 'La suite n’est pas écrite.' },
  );

  /** Une ruine dont on a déjà tout lu, à cet acte : un silence. */
  D.LORE_SILENCES = [
    'Les inscriptions ont été effacées. Proprement.',
    'Une pierre lisse, à l’endroit où devrait se trouver un texte.',
    'Quelqu’un a écrit ici, puis a tout recouvert de blanc.',
  ];

  /* ---------------- les lieux qui racontent ----------------
     Un par acte. Ils n'apparaissent qu'une fois dans un monde donné, rarement, dans
     une zone tirée de la graine (flux à part : le reste du monde ne change pas). */
  D.STORY_SITES = {
    empreintes: { act: 1, name: 'Des pas blancs', text: 'Des pas, blancs comme le sol de l’Archive, puis un carré net, comme découpé dans le sol. Quelqu’un s’est posé ici, avant vous. Puis il est reparti.', chance: 0.22 },
    cairn: { act: 2, name: 'Le cairn', text: 'Des pierres empilées. Sur chacune, un nom gravé : {mondes}. Ce sont des mondes que vous avez quittés. Personne ne sait qui les a posées.', textEmpty: 'Des pierres empilées. Sur chacune, un nom gravé que vous ne connaissez pas encore.', chance: 0.25 },
    hexagone: { act: 3, name: 'L’hexagone enfoui', text: 'Un hexagone blanc, à moitié enfoui. L’objet qui flottait au-dessus est tombé, éteint. Il porte les mêmes rayures que le vôtre.', chance: 0.25 },
    page: { act: 4, name: 'La page', text: 'Une page posée sur le sol. On y a dessiné une Archive : la vôtre, case par case. Le trait est encore frais.', chance: 0.35, pli: 1 },
  };

  /* ---------------- chroniques des peuples ----------------
     Ce que chaque peuple se rappelle de celui qui archivait avant vous. Elle arrive avec
     le tribut, quand leur monde rejoint l'Archive (alliance ou soumission). */
  D.CHRONICLES = {
    pales: { title: 'Chronique des Pâles', text: 'Nos ancêtres ont vu le Blanc une première fois. Il ne parlait pas. Il a choisi une vallée, et la vallée n’était plus là. Depuis, nous attendons. Nous ne savions pas si c’était pour le prier ou pour le fuir.' },
    cendriers: { title: 'Registre des forges', text: 'Une fois par âge, quelqu’un vient chercher le feu. Le dernier n’a pas rendu l’enclume. Nous avons forgé autour du trou qu’elle a laissé.' },
    rouages: { title: 'Mémoire des Rouages', text: 'Calcul : le visiteur précédent a emporté 4 096 mondes. Il en manquait un pour remplir sa grille. Hypothèse : le nôtre.' },
    myceliens: { title: 'Le Réseau se souvient', text: 'Nos filaments touchaient autrefois un autre sol, sous le blanc. Il était chaud. Puis il s’est refroidi, et quelqu’un a marché dessus.' },
    nautes: { title: 'Livre de bord des Nautes', text: 'Nous avons navigué jusqu’au bord du monde. Il y avait une marge, et des annotations dans la marge.' },
    chitinides: { title: 'Mémoire de la Ruche', text: 'La Ruche a compté deux Blancs. Le premier construisait. Le second range ce que le premier a construit.' },
    lithes: { title: 'Strates des Socles', text: 'Sous la dernière couche de nos montagnes, il y en a une blanche. Elle est plus récente que toutes les autres.' },
    veilleurs: { title: 'Consigne de la Garde', text: 'Garder le seuil. Ne pas demander ce qu’il y a derrière. Celui d’avant a demandé.' },
  };
  /** Ce que dit un souverain, à partir du troisième acte, la première fois qu'on le rencontre. */
  D.NATION_LINES.origine = ['D’autres sont venus chercher des mondes avant toi. Le dernier ne parlait pas non plus.', 'Avant toi, un autre est venu. Il emportait, lui aussi. Il a fini par s’arrêter.'];

  /* ---------------- l'Artefact ----------------
     Six formes, selon le rang (et donc l'acte) ; chacune avec une seule phrase, dite
     la première fois qu'elle apparaît. */
  D.ARTEFACT_FORMS = [
    { id: 'losange', name: 'Losange', from: 0, line: 'Il flotte. Il attend.' },
    { id: 'anneaux', name: 'Anneaux', from: 2, line: 'Des anneaux se sont formés autour de lui. Ils tournent quand vous approchez.' },
    { id: 'fissures', name: 'Fissures', from: 3, line: 'Il s’est fendu. La lumière passe par les fissures.' },
    { id: 'cadre', name: 'Cadre', from: 6, line: 'Un cadre s’est refermé autour de lui, à la forme des cases.' },
    { id: 'etoile', name: 'Étoile', from: 8, line: 'Il éclaire désormais plus loin que l’Archive.' },
    { id: 'oeil', name: 'Œil', from: 11, line: 'Il a ouvert un œil. Il regarde dans la même direction que vous.' },
  ];
  /**
   * Sa couleur suit votre réputation (ce que les mondes disent de vous). `base` : couleur
   * de l'Artefact quand on ne sait encore rien de vous (la couleur d'accent du jeu).
   */
  D.ARTEFACT_TINTS = {
    inconnu: { color: null, name: 'sa couleur d’origine' },
    collecteur: { color: '#4a5a8a', name: 'le gris-bleu de ceux qui collectent' },
    arche: { color: '#1f9bd1', name: 'le bleu clair de ceux qui sauvent' },
    dieu: { color: '#c99a1e', name: 'l’or de ceux qu’on vénère' },
    fleau: { color: '#b3261e', name: 'le rouge de ceux qu’on craint' },
    pillard: { color: '#8a4b1f', name: 'la rouille de ceux qui pillent' },
  };
})();
