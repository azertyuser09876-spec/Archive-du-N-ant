/* Noms propres (1.11) : données pures.
   Les mondes des échelons cosmiques, et ce qu'on en ramène, reçoivent un nom
   propre tiré de leur code (voir gen/names.js) : « Système d'Arithal »,
   « Planète-tison d'Arithal ». Deux moitiés qui s'enchaînent toujours bien :
   un début qui finit par une voyelle suivi d'une fin qui commence par une
   consonne, ou l'inverse. */
(function () {
  'use strict';
  const D = window.AN.Data;

  D.PROPER = {
    // débuts qui finissent par une voyelle, puis fins qui commencent par une consonne
    pv: ['Isa', 'Calé', 'Ora', 'Vaé', 'Mira', 'Tho', 'Sé', 'Ari', 'Ny', 'Ela', 'Omé', 'Que', 'Zé', 'Lu', 'Ke', 'Tha', 'Ili', 'Eu', 'Vo', 'Sy',
      'Bé', 'Dra', 'Fé', 'Ga', 'Hé', 'Jo', 'Lé', 'Mé', 'Né', 'Pa', 'Ré', 'Sa', 'Té', 'Ya', 'Au', 'Co', 'Ilo', 'Aste', 'Céli', 'Mo'],
    sc: ['ster', 'dre', 'lle', 'ne', 'ris', 'phe', 'nor', 'mire', 've', 'stre', 'dis', 'rune', 'lis', 'zar', 'lon', 'rique', 'sande', 'thée',
      'vane', 'ssie', 'vence', 'gor', 'line', 'ros', 'thal', 'vik', 'mar', 'dun', 'brune', 'cielle', 'phane', 'tide'],
    // débuts qui finissent par une consonne, puis fins qui commencent par une voyelle
    pc: ['Is', 'Cal', 'Or', 'Mir', 'Thol', 'Sel', 'Ar', 'Nyl', 'El', 'Om', 'Quel', 'Ker', 'Il', 'Vor', 'Syl', 'Bel', 'Gal', 'Jor', 'Pal', 'Sar',
      'Tér', 'Ul', 'Aub', 'Cor', 'Ess', 'Ilm', 'Ond', 'Hal', 'Mor', 'Vel'],
    sv: ['ane', 'ède', 'ielle', 'ys', 'ion', 'ore', 'ante', 'ise', 'ère', 'ance', 'ine', 'orée', 'ussa', 'ithe', 'aël', 'ombe', 'émire', 'uve',
      'alde', 'oé', 'ias', 'érène', 'ondre', 'ilde'],
    // mots qui existent déjà : on en tire un autre
    avoid: ['Paris', 'Save', 'Gave', 'Thave', 'Coster', 'Mare', 'Pane', 'Sane', 'Gaine', 'Orne', 'Ilion', 'Arise', 'Selle', 'Sylve', 'Voline', 'Done'],
  };
})();
