/* Équipement, consommables et améliorations de l'Artefact. Données pures.
   bound : objet lié au joueur, jamais perdu en cas d'échec. */
(function () {
  'use strict';
  const D = window.AN.Data;

  D.GEAR = {
    /* ---- armes à distance ---- */
    eclat: { slot: 'ranged', name: 'Éclat', bound: true, dmg: 9, rate: 4, speed: 560, spread: 0.04, count: 1, size: 4, range: 560, color: '#2346c8',
      desc: 'Un fragment de l’Artefact qui tire de petites aiguilles de lumière.' },
    dispersion: { slot: 'ranged', name: 'Dispersion', dmg: 6, rate: 1.5, speed: 480, spread: 0.36, count: 6, size: 4, range: 300, color: '#8b7d6b', heavy: true,
      cost: { ferraille: 10, os: 6 }, desc: 'Une gerbe de projectiles à courte portée.' },
    aiguilleur: { slot: 'ranged', name: 'Aiguilleur', dmg: 5, rate: 11, speed: 640, spread: 0.12, count: 1, size: 3, range: 480, color: '#7a6440',
      cost: { chitine: 10, cristal: 2, fibre: 6 }, desc: 'Une cadence de tir très élevée, au prix de la précision.' },
    arc_voltaique: { slot: 'ranged', name: 'Arc voltaïque', dmg: 15, rate: 2.4, speed: 760, spread: 0.02, count: 1, size: 5, range: 620, pierce: 2, color: '#3ab8d8',
      cost: { etincelle: 14, rouage: 3, ecaille: 4 }, desc: 'Un éclair qui traverse plusieurs cibles.' },
    lance_ambre: { slot: 'ranged', name: 'Lance-ambre', dmg: 20, rate: 1.7, speed: 520, spread: 0.03, count: 1, size: 6, range: 520, slow: 0.5, color: '#e0952a',
      cost: { ambre: 5, seve: 10, pollen: 6 }, desc: 'Englue les cibles : elles ralentissent, et fuient moins vite pendant une capture.' },
    canon_vide: { slot: 'ranged', name: 'Canon du vide', dmg: 46, rate: 0.85, speed: 420, spread: 0, count: 1, size: 8, range: 520, explode: 70, color: '#1c2230', heavy: true,
      cost: { obsidienne: 6, neant: 2, essence: 1 }, desc: 'Un projectile lent qui efface tout dans un petit rayon.' },

    /* ---- armes de mêlée ---- */
    lame_neant: { slot: 'melee', name: 'Lame du Néant', bound: true, dmg: 15, arc: 1.9, range: 48, cd: 0.42, knock: 240,
      desc: 'Une lame blanche, découpée dans votre propre monde.' },
    gantelet: { slot: 'melee', name: 'Gantelet de ferraille', dmg: 13, arc: 1.4, range: 40, cd: 0.24, knock: 160,
      cost: { ferraille: 12, rouage: 2 }, desc: 'Rapide et brutal. Idéal pour affaiblir sans tuer.' },
    faux_cristal: { slot: 'melee', name: 'Faux cristalline', dmg: 22, arc: 2.9, range: 66, cd: 0.58, knock: 260,
      cost: { cristal: 5, givre: 8, minerai: 6 }, desc: 'Un large arc qui frappe tout autour de vous.' },
    hache_obsidienne: { slot: 'melee', name: 'Hache d’obsidienne', dmg: 36, arc: 1.7, range: 56, cd: 0.75, knock: 380,
      cost: { obsidienne: 4, braise: 10, os: 6 }, desc: 'Lourde, lente, dévastatrice.' },
    fouet_membrane: { slot: 'melee', name: 'Fouet de membrane', dmg: 16, arc: 1.1, range: 96, cd: 0.5, knock: 120, lifesteal: 0.15,
      cost: { membrane: 10, acide: 6, seve: 4 }, desc: 'Une longue portée, et une partie des dégâts vous soigne.' },

    /* ---- protections ---- */
    carapace_chitine: { slot: 'armor', name: 'Carapace de chitine', armor: 0.15,
      cost: { chitine: 8, fibre: 6 }, desc: '−15 % de dégâts reçus.' },
    manteau_givre: { slot: 'armor', name: 'Manteau de givre', armor: 0.18, hazardRes: 0.4,
      cost: { givre: 10, fibre: 8, os: 4 }, desc: '−18 % de dégâts, −40 % de dégâts des terrains dangereux.' },
    plastron_rouage: { slot: 'armor', name: 'Plastron à rouages', armor: 0.28, speed: -0.06,
      cost: { ferraille: 16, rouage: 4 }, desc: '−28 % de dégâts, un peu plus lent.' },
    armure_obsidienne: { slot: 'armor', name: 'Armure d’obsidienne', armor: 0.38, speed: -0.08,
      cost: { obsidienne: 6, minerai: 12, essence: 1 }, desc: '−38 % de dégâts, un peu plus lent.' },
    voile_neant: { slot: 'armor', name: 'Voile du néant', armor: 0.22, dashCd: 0.35,
      cost: { neant: 2, membrane: 8, perle: 2 }, desc: '−22 % de dégâts, esquive 35 % plus fréquente.' },

    /* ---- sacs ---- */
    sacoche: { slot: 'bag', name: 'Sacoche', bound: true, cap: 20, desc: '20 unités de ressources.' },
    besace_fibre: { slot: 'bag', name: 'Besace de fibre', cap: 32, cost: { fibre: 14, seve: 4 }, desc: '32 unités de ressources.' },
    sac_membrane: { slot: 'bag', name: 'Sac de membrane', cap: 46, cost: { membrane: 12, chitine: 6, ecaille: 4 }, desc: '46 unités de ressources.' },
    coffre_portatif: { slot: 'bag', name: 'Coffre portatif', cap: 66, cost: { ferraille: 14, rouage: 4, cristal: 4 }, desc: '66 unités de ressources.' },

    /* ---- consommables ---- */
    baume_seve: { slot: 'consumable', name: 'Baume de sève', heal: 35, cost: { seve: 4, fibre: 2 }, makes: 2, desc: 'Rend 35 PV.' },
    injecteur_ambre: { slot: 'consumable', name: 'Injecteur d’ambre', heal: 90, cost: { ambre: 1, pollen: 4, seve: 2 }, makes: 1, desc: 'Rend 90 PV.' },
    leurre_spore: { slot: 'consumable', name: 'Leurre à spores', decoy: 6, cost: { spore: 6, fibre: 2 }, makes: 2, desc: 'Attire les créatures pendant 6 secondes.' },
    grenade_braise: { slot: 'consumable', name: 'Grenade de braise', bomb: 70, radius: 90, cost: { braise: 5, ferraille: 2 }, makes: 2, desc: 'Explose et inflige 70 dégâts autour du point visé.' },
    ancre_stabilite: { slot: 'consumable', name: 'Ancre de stabilité', anchor: 10, cost: { cristal: 1, etincelle: 6, minerai: 4 }, makes: 1, desc: 'Pendant une extraction, fige l’effondrement 10 secondes.' },
    filet_soie: { slot: 'consumable', name: 'Filet de soie', net: 4, cost: { fibre: 8, chitine: 2 }, makes: 2, desc: 'Immobilise une créature 4 secondes. Idéal avant une capture.' },
  };

  D.CONSUMABLE_MAX = 5; // par type et par expédition
  D.CONSUMABLE_SLOTS = 4;

  /* ---- Améliorations de l'Artefact ----
     Chaque niveau donne une valeur ; cost = prix pour atteindre ce niveau ;
     rank = rang minimal de l'Archive requis. */
  D.UPGRADES = {
    soute: {
      name: 'Soute', desc: 'Capacité de transfert : créatures (1 à 8 places selon leur taille) et fragments de territoire.',
      levels: [
        { v: 3 },
        { v: 5, cost: { fibre: 12, minerai: 8, os: 6 } },
        { v: 8, cost: { cristal: 4, ferraille: 16, chitine: 10 }, rank: 1 },
        { v: 12, cost: { essence: 2, perle: 4, rouage: 6, ambre: 4 }, rank: 2 },
        { v: 18, cost: { essence: 4, noyau: 1, obsidienne: 8, neant: 2 }, rank: 3 },
      ],
      fmt: (v) => v + ' places',
    },
    liens: {
      name: 'Liens', desc: 'Nombre de créatures qui peuvent vous accompagner en expédition.',
      levels: [
        { v: 1 },
        { v: 2, cost: { seve: 10, spore: 10, pollen: 6 } },
        { v: 3, cost: { membrane: 12, ambre: 3, essence: 1 }, rank: 1 },
        { v: 4, cost: { essence: 3, perle: 4, encre: 4 }, rank: 2 },
      ],
      fmt: (v) => v + ' ' + (v > 1 ? 'compagnons' : 'compagnon'),
    },
    stabilisateur: {
      name: 'Stabilisateur', desc: 'Raccourcit le transfert et augmente ce que conserve une extraction d’urgence.',
      levels: [
        { v: { dur: 40, keep: 0.25 } },
        { v: { dur: 34, keep: 0.35 }, cost: { etincelle: 12, minerai: 10, verre: 8 } },
        { v: { dur: 28, keep: 0.45 }, cost: { cristal: 5, rouage: 4, givre: 10 }, rank: 1 },
        { v: { dur: 23, keep: 0.55 }, cost: { essence: 2, obsidienne: 4, encre: 3 }, rank: 2 },
        { v: { dur: 18, keep: 0.65 }, cost: { essence: 4, noyau: 1, neant: 3 }, rank: 3 },
      ],
      fmt: (v) => v.dur + ' s de transfert, ' + Math.round(v.keep * 100) + ' % gardés en urgence',
    },
    scanner: {
      name: 'Scanner', desc: 'Nombre de destinations détectées et fiabilité des informations.',
      levels: [
        { v: { count: 3, reliab: 0.5 } },
        { v: { count: 4, reliab: 0.7 }, cost: { verre: 10, etincelle: 8, perle: 1 } },
        { v: { count: 5, reliab: 0.85 }, cost: { cristal: 6, encre: 3, rouage: 3 }, rank: 1 },
        { v: { count: 6, reliab: 1 }, cost: { essence: 2, neant: 2, cristal: 6 }, rank: 2 },
      ],
      fmt: (v) => v.count + ' destinations, fiabilité ' + Math.round(v.reliab * 100) + ' %',
    },
    rayon: {
      name: 'Rayon de capture', desc: 'Seuil d’affaiblissement, vitesse et portée de la capture.',
      levels: [
        { v: { thr: 0.3, mult: 1, range: 190 } },
        { v: { thr: 0.38, mult: 1.3, range: 215 }, cost: { spore: 10, etincelle: 8, seve: 8 } },
        { v: { thr: 0.46, mult: 1.6, range: 240 }, cost: { cristal: 4, membrane: 8, perle: 2 }, rank: 1 },
        { v: { thr: 0.54, mult: 2, range: 265 }, cost: { essence: 2, ambre: 4, encre: 3 }, rank: 2 },
        { v: { thr: 0.62, mult: 2.5, range: 290 }, cost: { essence: 4, noyau: 1, neant: 2 }, rank: 3 },
      ],
      fmt: (v) => 'sous ' + Math.round(v.thr * 100) + ' % des PV, vitesse ×' + String(v.mult).replace('.', ',') + ', portée ' + v.range,
    },
  };
  D.UPGRADE_ORDER = ['soute', 'liens', 'stabilisateur', 'scanner', 'rayon'];

  /** Coût en soute d'un fragment de territoire. */
  D.TERRITORY_WEIGHT = { fragment: 0, territoire: 3, coeur: 6 };
})();
