/* La base mobile (1.9) : l'hexagone de l'Artefact quitte l'Archive à chaque
   départ et se pose dans le monde visité. Données pures :
   - D.BASE : règles de l'hexagone (taille, vigueur, gardes, assauts) ;
   - D.DEFENSES : modules de défense installés dans l'hexagone, qui voyagent
     avec lui et ne se perdent jamais. */
(function () {
  'use strict';
  const D = window.AN.Data;

  D.BASE = {
    radius: 5.5, // rayon de l'hexagone posé dans un monde, en tuiles
    hp: 320, // vigueur de base de l'hexagone…
    hpThreat: 55, // … plus ceci par point de menace du monde
    armor: 0.15, // part des coups que l'hexagone absorbe de lui-même
    regen: 3, // vigueur rendue par seconde, après 10 s sans coup
    guardPoints: 3, // points de garde sans garnison (un garde coûte autant de points que de liens)
    defSlots: 3, // modules installés à la fois, sans chantier
    transfer: 0.15, // transfert plus court depuis l'hexagone
    raidFirst: [80, 110], // premier assaut (secondes passées dans la zone de l'hexagone)
    raidEvery: [90, 130], // assauts suivants
    raidFrom: 2, // pas d'assaut pendant les deux premières expéditions
    landDur: 1.8, // durée de la pose dans un monde
    liftDur: 1.8, // durée du départ (retour ou submersion)
  };

  /* stat lu par game/base.js :
     dmg, rate, range (tourelle) ; hp, armor (mur) ; shield, shieldRegen (bouclier) ;
     slow, slowRange (phare) ; heal (source) */
  D.DEFENSES = {
    tourelle: { name: 'Tourelle', color: '#2346c8',
      desc: 'Elle tire sur ce qui approche de l’hexagone. Elle épargne les créatures affaiblies.',
      levels: [
        { cost: { ferraille: 18, etincelle: 10, os: 8 }, stat: { dmg: 12, rate: 0.9, range: 420 }, text: '12 dégâts, 0,9 tir par seconde, portée 420' },
        { cost: { rouage: 4, cristal: 3, etincelle: 16 }, stat: { dmg: 20, rate: 1.3, range: 500 }, text: '20 dégâts, 1,3 tir par seconde, portée 500' },
      ] },
    mur: { name: 'Mur d’enceinte', color: '#8a8070',
      desc: 'Un rempart bas sur le pourtour de l’hexagone : il encaisse à sa place.',
      levels: [
        { cost: { minerai: 12, os: 14, fibre: 10 }, stat: { hp: 220, armor: 0.15 }, text: '+220 de vigueur, 15 % des coups absorbés' },
        { cost: { obsidienne: 2, minerai: 20, ferraille: 12 }, stat: { hp: 480, armor: 0.3 }, text: '+480 de vigueur, 30 % des coups absorbés' },
      ] },
    bouclier: { name: 'Générateur de bouclier', color: '#7fe0ff',
      desc: 'Un dôme qui prend les coups avant l’hexagone, et se recharge quand l’assaut faiblit.',
      levels: [
        { cost: { etincelle: 14, verre: 10, cristal: 2 }, stat: { shield: 160, shieldRegen: 10 }, text: 'Bouclier de 160, rechargé de 10 par seconde' },
        { cost: { neant: 1, cristal: 4, verre: 16 }, stat: { shield: 320, shieldRegen: 18 }, text: 'Bouclier de 320, rechargé de 18 par seconde' },
      ] },
    phare_lent: { name: 'Phare ralentisseur', color: '#ffd25a',
      desc: 'Sa lumière alourdit les créatures qui s’approchent, et éclaire les mondes sombres.',
      levels: [
        { cost: { verre: 12, pollen: 10, etincelle: 6 }, stat: { slow: 0.35, slowRange: 300 }, text: 'Ralentit de 35 % à moins de 300 du bord' },
        { cost: { perle: 2, verre: 18, encre: 1 }, stat: { slow: 0.5, slowRange: 420 }, text: 'Ralentit de 50 % à moins de 420 du bord' },
      ] },
    source: { name: 'Source de soin', color: '#5fd08a',
      desc: 'Une vasque de sève : sur l’hexagone, vous et vos gardes reprenez des forces.',
      levels: [
        { cost: { seve: 16, spore: 10, membrane: 6 }, stat: { heal: 3 }, text: '3 PV par seconde sur l’hexagone' },
        { cost: { perle: 2, seve: 24, essence: 1 }, stat: { heal: 6 }, text: '6 PV par seconde sur l’hexagone' },
      ] },
  };
  D.DEFENSE_IDS = Object.keys(D.DEFENSES);
})();
