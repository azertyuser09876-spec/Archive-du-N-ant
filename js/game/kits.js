/* Bestiaire vivant (1.17) : chaque espèce compose ses attaques, à partir de sa graine.
   - Une famille, d'après son ancienne attaque (morsure → mêlée, charge → ruée, impact → sol,
     tir → projectiles, crachat → humeurs, décharge → orage) ; une forme dans cette famille
     (croc bondissant, griffes en croissant, salve, éventail, tirs courbes, mortier, faille…),
     et ses paramètres (nombre, angle, portée, délais, vitesse, taille).
   - Une seconde attaque pour les prédateurs (et certaines créatures mineures), d'une autre
     famille, choisie selon sa façon de se déplacer ; un réflexe pour celles qui n'attaquent pas
     (éblouir, repousser, nuage, esquive, boule).
   - Les dégâts suivent un budget : ce que l'ancienne attaque infligeait par usage, réparti
     entre les coups de la nouvelle forme. Le rythme suit l'ancien délai, plus l'annonce.
   - Aucune espèce n'a la même combinaison (signature) qu'une autre.
   K.of(def) donne le jeu d'attaques ; K.attack(X, e, cible, dt) le joue (approche, annonce,
   frappe, reprise) ; K.reflex(X, e) le réflexe ; K.signature(X, e) l'attaque signature d'un gardien. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const TAU = Math.PI * 2;

  const K = (AN.Kits = {});
  const FAMILY = { bite: 'melee', charge: 'rush', slam: 'ground', shoot: 'missile', spit: 'bile', zap: 'storm' };
  K.FAMILY_NAME = { melee: 'mêlée', rush: 'ruée', ground: 'sol', missile: 'projectiles', bile: 'humeurs', storm: 'orage', reflex: 'réflexe' };
  // familles voisines selon la façon de se déplacer (pour la seconde attaque)
  const BY_MOVE = {
    walk: ['melee', 'rush', 'ground', 'missile'], hop: ['melee', 'ground', 'bile'], fly: ['missile', 'storm', 'bile', 'rush'],
    drift: ['storm', 'bile', 'missile'], slither: ['rush', 'bile', 'melee'], blink: ['storm', 'missile', 'melee'], burrow: ['ground', 'melee', 'rush'],
  };
  const r2 = (v) => Math.round(v * 100) / 100;
  const pl = (n, one, many) => n + ' ' + (n > 1 ? many : one);

  /* ======================= Formes ======================= */
  // gen(rng, b) : paramètres ; b = { dmg (par usage), cd, range, speed, size, radius, color, scale }
  // Chaque forme : fam, name(p), range (distance souhaitée), reach (portée), windup, recover, cd, et son jeu.
  const F = (K.FORMS = {});

  /* ----- mêlée ----- */
  F.croc = { fam: 'melee', gen: (g, b) => ({ lunge: g.int(28, 72), windup: g.float(0.16, 0.34), dmg: b.dmg * 1.05 }),
    name: (p) => 'Croc bondissant (' + p.lunge + ' px)', reach: (p, e) => e.r + 22 + p.lunge, range: () => 0 };
  F.griffes = { fam: 'melee', gen: (g, b) => { const n = g.int(1, 3); return { n, arc: r2(g.float(1.0, 2.0)), rad: g.int(22, 44), gap: r2(g.float(0.15, 0.26)), windup: g.float(0.18, 0.32), dmg: (b.dmg * 1.1) / Math.pow(n, 0.8) }; },
    name: (p) => (p.n > 1 ? pl(p.n, 'griffe', 'griffes') + ' en croissant' : 'Griffe en croissant'), reach: (p, e) => e.r + p.rad + 6, range: () => 0 };
  F.dard = { fam: 'melee', gen: (g, b) => ({ len: g.int(50, 100), width: g.int(14, 22), windup: g.float(0.3, 0.5), dmg: b.dmg * 0.8, venom: b.dmg * g.float(0.2, 0.32) }),
    name: (p) => 'Dard venimeux (' + p.len + ' px)', reach: (p, e) => e.r + p.len - 6, range: () => 0 };
  F.bond = { fam: 'melee', gen: (g, b) => ({ leap: g.int(140, 220), rad: g.int(40, 68), windup: g.float(0.35, 0.6), air: r2(g.float(0.45, 0.65)), dmg: b.dmg * 1.3 }),
    name: (p) => 'Bond écrasant (' + p.leap + ' px)', reach: (p) => p.leap, range: (p) => p.leap * 0.7, mobile: true };
  F.toupie = { fam: 'melee', gen: (g, b) => { const n = g.int(1, 3); return { n, rad: g.int(28, 60), gap: r2(g.float(0.24, 0.4)), windup: g.float(0.24, 0.42), dmg: b.dmg / Math.pow(n, 0.7) }; },
    name: (p) => (p.n > 1 ? 'Toupie, ' + pl(p.n, 'tour', 'tours') : 'Toupie'), reach: (p, e) => e.r + p.rad * 0.8, range: () => 0 };
  F.etreinte = { fam: 'melee', gen: (g, b) => ({ lunge: g.int(16, 40), slow: r2(g.float(0.4, 0.65)), hold: r2(g.float(1.2, 2)), windup: g.float(0.2, 0.36), dmg: b.dmg * 0.9 }),
    name: (p) => 'Étreinte (ralentit ' + Math.round(p.slow * 100) + ' %)', reach: (p, e) => e.r + 20 + p.lunge, range: () => 0 };

  /* ----- ruée ----- */
  F.charge = { fam: 'rush', gen: (g, b) => ({ dist: g.int(220, 340), speed: Math.round((b.speed || 480) * g.float(0.85, 1.15)), windup: g.float(0.45, 0.8), dmg: b.dmg }),
    name: (p) => 'Charge (' + p.dist + ' px)', reach: (p) => p.dist * 0.85, range: (p) => p.dist * 0.6, mobile: true };
  F.zigzag = { fam: 'rush', gen: (g, b) => { const n = g.int(2, 3); return { n, seg: g.int(110, 170), turn: r2(g.float(0.5, 0.95)), speed: Math.round((b.speed || 480) * g.float(0.9, 1.15)), windup: g.float(0.4, 0.7), dmg: b.dmg * 0.8 }; },
    name: (p) => 'Charge en zigzag (' + pl(p.n, 'bond', 'bonds') + ')', reach: (p) => p.seg * p.n * 0.7, range: (p) => p.seg * 1.2, mobile: true };
  F.retour = { fam: 'rush', gen: (g, b) => ({ dist: g.int(180, 280), speed: Math.round((b.speed || 480) * g.float(0.85, 1.1)), pause: r2(g.float(0.15, 0.35)), windup: g.float(0.45, 0.75), dmg: b.dmg * 0.75 }),
    name: (p) => 'Aller-retour (' + p.dist + ' px)', reach: (p) => p.dist * 0.8, range: (p) => p.dist * 0.5, mobile: true };
  F.roulade = { fam: 'rush', gen: (g, b) => ({ dist: g.int(260, 380), speed: Math.round((b.speed || 420) * g.float(0.75, 1)), trail: r2(b.dmg * g.float(0.22, 0.34)), windup: g.float(0.5, 0.8), dmg: b.dmg * 0.8 }),
    name: (p) => 'Roulade brûlante (' + p.dist + ' px)', reach: (p) => p.dist * 0.8, range: (p) => p.dist * 0.6, mobile: true };
  F.percee = { fam: 'rush', gen: (g, b) => ({ dist: g.int(200, 300), speed: Math.round((b.speed || 500) * g.float(0.95, 1.2)), wave: g.int(90, 140), windup: g.float(0.4, 0.7), dmg: b.dmg * 0.6 }),
    name: (p) => 'Percée et onde (' + p.wave + ' px)', reach: (p) => p.dist * 0.8, range: (p) => p.dist * 0.55, mobile: true };

  /* ----- sol ----- */
  F.onde = { fam: 'ground', gen: (g, b) => ({ rad: Math.round((b.radius || 80) * g.float(0.8, 1.2)), windup: g.float(0.5, 0.9), dmg: b.dmg }),
    name: (p) => 'Onde de choc (' + p.rad + ' px)', reach: (p) => p.rad * 0.8, range: () => 0 };
  F.faille = { fam: 'ground', gen: (g, b) => ({ n: g.int(3, 6), rad: g.int(28, 44), step: r2(g.float(0.09, 0.2)), windup: g.float(0.4, 0.7), dmg: b.dmg * 0.7 }),
    name: (p) => 'Faille (' + pl(p.n, 'secousse', 'secousses') + ')', reach: (p) => p.n * p.rad * 1.6, range: (p) => p.n * p.rad * 1.1 };
  F.double = { fam: 'ground', gen: (g, b) => ({ rad: Math.round((b.radius || 80) * g.float(0.6, 0.9)), mult: r2(g.float(1.4, 1.8)), gap: r2(g.float(0.3, 0.5)), windup: g.float(0.45, 0.75), dmg: b.dmg * 0.7 }),
    name: (p) => 'Double frappe (' + p.rad + ' puis ' + Math.round(p.rad * p.mult) + ' px)', reach: (p) => p.rad * p.mult * 0.8, range: () => 0 };
  F.eruption = { fam: 'ground', gen: (g, b) => ({ n: g.int(1, 3), rad: g.int(32, 50), windup: g.float(0.65, 1), dmg: b.dmg * 0.9 }),
    name: (p) => 'Éruption (' + pl(p.n, 'jet', 'jets') + ')', reach: () => 300, range: () => 200 };
  F.cratere = { fam: 'ground', gen: (g, b) => ({ rad: Math.round((b.radius || 80) * g.float(0.7, 1)), dps: r2(b.dmg * g.float(0.22, 0.34)), life: r2(g.float(2.5, 4)), windup: g.float(0.5, 0.85), dmg: b.dmg * 0.85 }),
    name: (p) => 'Cratère (' + p.rad + ' px, sol brûlant)', reach: (p) => p.rad * 0.8, range: () => 0 };

  /* ----- projectiles ----- */
  const shotBase = (b, g) => ({ speed: Math.round((b.speed || 260) * g.float(0.85, 1.15)), size: Math.max(3, Math.round((b.size || 5) * g.float(0.8, 1.3))), range: Math.round((b.range || 280) * g.float(0.9, 1.15)) });
  F.salve = { fam: 'missile', gen: (g, b) => { const n = g.int(2, 5); return Object.assign(shotBase(b, g), { n, gap: r2(g.float(0.07, 0.18)), windup: g.float(0.2, 0.4), dmg: (b.dmg * 1.0) / Math.pow(n, 0.85) }); },
    name: (p) => 'Salve de ' + p.n, reach: (p) => p.range, range: (p) => p.range * 0.65, ranged: true };
  F.eventail = { fam: 'missile', gen: (g, b) => { const n = g.int(3, 7); return Object.assign(shotBase(b, g), { n, spread: r2(g.float(0.3, 0.95)), windup: g.float(0.25, 0.45), dmg: (b.dmg * 1.1) / Math.min(n, 2.2) }); },
    name: (p) => 'Éventail de ' + p.n, reach: (p) => p.range * 0.9, range: (p) => p.range * 0.55, ranged: true };
  F.courbe = { fam: 'missile', gen: (g, b) => { const n = g.int(1, 2); return Object.assign(shotBase(b, g), { n, turn: r2(g.float(0.8, 2.2)), windup: g.float(0.25, 0.45), dmg: b.dmg / (1.3 * n) }); },
    name: (p) => 'Tirs courbes (' + pl(p.n * 2, 'trait', 'traits') + ')', reach: (p) => p.range * 0.85, range: (p) => p.range * 0.55, ranged: true };
  F.ondule = { fam: 'missile', gen: (g, b) => { const n = g.int(1, 3); return Object.assign(shotBase(b, g), { n, amp: g.int(10, 28), freq: r2(g.float(7, 13)), windup: g.float(0.2, 0.4), dmg: b.dmg / Math.pow(n, 0.85) }); },
    name: (p) => 'Tir ondulant' + (p.n > 1 ? ' ×' + p.n : ''), reach: (p) => p.range, range: (p) => p.range * 0.65, ranged: true };
  F.boomerang = { fam: 'missile', gen: (g, b) => { const n = g.int(1, 2); return Object.assign(shotBase(b, g), { n, windup: g.float(0.3, 0.5), dmg: (b.dmg * 0.75) / n }); },
    name: (p) => (p.n > 1 ? 'Deux boomerangs' : 'Boomerang'), reach: (p) => p.range * 0.8, range: (p) => p.range * 0.5, ranged: true };
  F.eclats = { fam: 'missile', gen: (g, b) => Object.assign(shotBase(b, g), { k: g.int(3, 7), windup: g.float(0.3, 0.55), dmg: b.dmg * 0.7, frag: b.dmg * g.float(0.28, 0.4) }),
    name: (p) => 'Éclat qui se brise (' + p.k + ')', reach: (p) => p.range, range: (p) => p.range * 0.7, ranged: true };
  F.traqueur = { fam: 'missile', gen: (g, b) => Object.assign(shotBase(b, g), { home: r2(g.float(1.2, 2.6)), windup: g.float(0.35, 0.6), dmg: b.dmg * 1.25 }),
    name: () => 'Orbe traqueur', reach: (p) => p.range * 1.1, range: (p) => p.range * 0.7, ranged: true };
  F.mortier = { fam: 'missile', gen: (g, b) => ({ rad: g.int(34, 56), fly: r2(g.float(0.6, 0.95)), range: Math.round((b.range || 280) * g.float(0.9, 1.2)), windup: g.float(0.3, 0.5), dmg: b.dmg * 1.1 }),
    name: (p) => 'Mortier (' + p.rad + ' px)', reach: (p) => p.range, range: (p) => p.range * 0.7, ranged: true };

  /* ----- humeurs ----- */
  F.crachat = { fam: 'bile', gen: (g, b) => ({ rad: Math.round((b.radius || 40) * g.float(0.85, 1.2)), life: r2((b.life || 3) * g.float(0.85, 1.2)), range: Math.round((b.range || 240) * g.float(0.9, 1.1)), windup: g.float(0.35, 0.6), dmg: b.dmg }),
    name: (p) => 'Crachat (flaque de ' + p.rad + ' px)', reach: (p) => p.range, range: (p) => p.range * 0.6, ranged: true };
  F.chapelet = { fam: 'bile', gen: (g, b) => ({ n: g.int(3, 5), rad: g.int(22, 32), space: g.int(30, 45), life: r2((b.life || 3) * g.float(0.8, 1.1)), windup: g.float(0.35, 0.6), dmg: b.dmg * 0.75 }),
    name: (p) => 'Chapelet de ' + p.n + ' flaques', reach: (p) => p.n * p.space + 40, range: (p) => p.n * p.space * 0.6, ranged: true };
  F.nappe = { fam: 'bile', gen: (g, b) => ({ n: g.int(3, 5), arc: r2(g.float(0.5, 0.95)), rad: g.int(20, 30), dist: g.int(70, 120), life: r2((b.life || 3) * g.float(0.8, 1.1)), windup: g.float(0.3, 0.55), dmg: b.dmg * 0.7 }),
    name: (p) => 'Nappe de ' + p.n + ' gouttes', reach: (p) => p.dist + 30, range: (p) => p.dist * 0.7, ranged: true };
  F.brume = { fam: 'bile', gen: (g, b) => ({ rad: g.int(50, 82), slow: r2(g.float(0.3, 0.55)), life: r2(g.float(2.5, 4)), windup: g.float(0.4, 0.7), dmg: b.dmg * 0.45 }),
    name: (p) => 'Brume (' + p.rad + ' px)', reach: (p) => p.rad * 0.9, range: () => 0 };
  F.bulle = { fam: 'bile', gen: (g, b) => ({ speed: Math.round(g.float(90, 150)), rad: g.int(30, 46), life: r2((b.life || 3) * g.float(0.9, 1.2)), range: Math.round((b.range || 240) * g.float(0.9, 1.1)), windup: g.float(0.3, 0.5), dmg: b.dmg * 0.9 }),
    name: () => 'Bulle qui éclate', reach: (p) => p.range, range: (p) => p.range * 0.6, ranged: true };

  /* ----- orage ----- */
  F.arc = { fam: 'storm', gen: (g, b) => ({ chain: g.int(1, 2), reachA: Math.round((b.range || 46) * g.float(1.1, 1.8)), windup: g.float(0.18, 0.34), dmg: b.dmg }),
    name: (p) => 'Arc électrique (rebondit ' + p.chain + ' fois)', reach: (p) => p.reachA, range: (p) => p.reachA * 0.7 };
  F.faisceau = { fam: 'storm', gen: (g, b) => ({ len: g.int(120, 220), width: g.int(10, 16), dur: r2(g.float(0.5, 0.9)), sweep: r2(g.float(0, 0.6)), windup: g.float(0.4, 0.6), dmg: b.dmg * 1.05 }), // dmg : ce que le faisceau inflige s'il vous suit tout du long
    name: (p) => 'Faisceau (' + p.len + ' px)', reach: (p) => p.len * 0.9, range: (p) => p.len * 0.6, ranged: true };
  F.nova = { fam: 'storm', gen: (g, b) => ({ max: g.int(90, 150), speed: g.int(260, 360), windup: g.float(0.35, 0.6), dmg: b.dmg }),
    name: (p) => 'Nova (' + p.max + ' px)', reach: (p) => p.max * 0.8, range: () => 0 };
  F.piliers = { fam: 'storm', gen: (g, b) => ({ n: g.int(1, 3), rad: g.int(26, 40), windup: g.float(0.5, 0.8), dmg: b.dmg * 0.95 }),
    name: (p) => (p.n > 1 ? pl(p.n, 'pilier', 'piliers') + ' de foudre' : 'Pilier de foudre'), reach: () => 260, range: () => 180, ranged: true };
  F.orbe = { fam: 'storm', gen: (g, b) => ({ speed: Math.round(g.float(110, 170)), size: g.int(8, 12), range: Math.round(g.float(220, 320)), windup: g.float(0.3, 0.5), dmg: b.dmg * 0.8 }),
    name: () => 'Orbe chargé', reach: (p) => p.range, range: (p) => p.range * 0.6, ranged: true };

  /* ----- réflexes (celles qui n'attaquent pas) ----- */
  F.eblouir = { fam: 'reflex', gen: (g) => ({ rad: g.int(70, 120), slow: r2(g.float(0.35, 0.6)), dur: r2(g.float(1, 1.6)) }), name: (p) => 'Éblouissement (' + p.rad + ' px)' };
  F.repousser = { fam: 'reflex', gen: (g) => ({ rad: g.int(80, 120), knock: g.int(300, 520) }), name: (p) => 'Souffle qui repousse (' + p.rad + ' px)' };
  F.spores = { fam: 'reflex', gen: (g) => ({ rad: g.int(40, 62), slow: r2(g.float(0.3, 0.5)), life: r2(g.float(2, 3.5)) }), name: (p) => 'Nuage (' + p.rad + ' px)' };
  F.esquive = { fam: 'reflex', gen: (g) => ({ dist: g.int(80, 140) }), name: (p) => 'Esquive (' + p.dist + ' px)' };
  F.boule = { fam: 'reflex', gen: (g) => ({ armor: r2(g.float(0.6, 0.85)), dur: r2(g.float(1.5, 2.5)) }), name: (p) => 'Boule (−' + Math.round(p.armor * 100) + ' % de dégâts)' };

  const FAMS = {};
  Object.keys(F).forEach((k) => { (FAMS[F[k].fam] = FAMS[F[k].fam] || []).push(k); });
  K.FAMS = FAMS;

  /* ======================= Composition ======================= */
  /** Le budget d'une espèce, tiré de son ancienne attaque (ou de ses phases, pour un gardien). */
  function baseOf(def) {
    const A = def.attack;
    if (A) return { type: A.type, dmg: (A.dmg || 6) * (A.count || 1), cd: A.cd || 1.2, range: A.range, speed: A.speed, size: A.size, radius: A.radius, life: A.life, color: A.color };
    if (def.phases) { // un gardien : la moyenne des dégâts de ses motifs
      const ds = []; def.phases.forEach((ph) => ph.patterns.forEach((pt) => { if (pt.dmg) ds.push(pt.dmg); }));
      const dmg = ds.length ? ds.reduce((s, x) => s + x, 0) / ds.length : 16;
      return { type: null, dmg: dmg * 1.4, cd: 1.6, color: (def.art || {}).accent, boss: true };
    }
    return null;
  }
  const MOVE_FAM = { walk: 'melee', hop: 'melee', fly: 'missile', drift: 'storm', slither: 'rush', blink: 'storm', burrow: 'ground' };
  function makeSpec(form, rng, b, role, def) {
    const P = F[form].gen(rng, b);
    P.dmg = Math.max(1, Math.round((P.dmg || 0) * 10) / 10);
    if (P.venom) P.venom = r2(P.venom); if (P.frag) P.frag = r2(P.frag);
    P.windup = r2(P.windup || 0.3);
    const cd = r2((b.cd || 1.2) * rng.float(0.9, 1.25) * (role === 'second' ? rng.float(3.5, 6) : 1) + P.windup);
    return Object.assign({ form, fam: F[form].fam, role, cd, recover: r2(rng.float(0.15, 0.4)), color: b.color || (def.art && def.art.accent) || '#ffffff' }, P);
  }
  const sigOf = (s) => s ? s.form + ':' + Object.keys(s).filter((k) => typeof s[k] === 'number' && k !== 'dmg' && k !== 'cd' && k !== 'recover').sort().map((k) => k + '=' + s[k]).join(',') : '-';
  const used = new Set();
  /** Le jeu d'attaques d'une espèce : { primary, second, reflex, sig }. Gardé sur sa définition. */
  let ready = false;
  K.of = function (def) {
    if (!def) return null;
    if (!ready) { ready = true; D.CREATURES.forEach(compute); } // toutes, dans l'ordre du bestiaire : les mêmes à chaque partie
    if (def.kit !== undefined) return def.kit;
    return compute(def);
  };
  function compute(def) {
    if (def.kit !== undefined) return def.kit;
    if (def.npc || def.fake || (D.COLOSSI && D.COLOSSI[def.id] && def.tier >= 3)) return (def.kit = null); // les habitants, les colosses ont les leurs
    const b = baseOf(def);
    let kit = null;
    for (let tryN = 0; tryN < 40; tryN++) {
      const rng = new AN.RNG(AN.hash('kit:' + def.id + ':' + tryN));
      kit = { primary: null, second: null, reflex: null };
      if (b) {
        const fam = b.type ? FAMILY[b.type] : (rng.chance(0.5) ? MOVE_FAM[def.move] || 'missile' : rng.pick(Object.keys(MOVE_FAM).map((m) => MOVE_FAM[m])));
        kit.primary = makeSpec(rng.pick(FAMS[fam]), rng, b, 'primary', def);
        // une seconde attaque : les prédateurs, et une créature mineure sur trois
        if (!b.boss && (def.tier >= 1 || rng.chance(0.35))) {
          const fams = (BY_MOVE[def.move] || BY_MOVE.walk).filter((f) => f !== fam);
          const f2 = rng.pick(fams);
          kit.second = makeSpec(rng.pick(FAMS[f2]), rng, Object.assign({}, b, { dmg: b.dmg * 0.8, radius: b.radius || 70, speed: b.speed || 440 }), 'second', def);
        }
      }
      if (!(b && b.boss) && (!b || def.temper === 'craintif' || def.temper === 'passif' || rng.chance(0.25))) kit.reflex = makeSpec(rng.pick(FAMS.reflex), rng, { dmg: 0, cd: rng.float(4, 8) }, 'reflex', def);
      kit.sig = [sigOf(kit.primary), sigOf(kit.second), sigOf(kit.reflex)].join(' | ');
      if (!used.has(kit.sig)) break;
    }
    used.add(kit.sig);
    kit.name = K.name(kit);
    return (def.kit = kit);
  }
  /** Ce qu'en dit le bestiaire. */
  K.name = function (kit) {
    if (!kit) return '';
    const parts = [];
    if (kit.primary) parts.push(F[kit.primary.form].name(kit.primary));
    if (kit.second) parts.push('puis ' + F[kit.second.form].name(kit.second).replace(/^./, (c) => c.toLowerCase()));
    if (kit.reflex) parts.push((kit.primary ? 'réflexe : ' : 'Réflexe : ') + F[kit.reflex.form].name(kit.reflex).replace(/^./, (c) => c.toLowerCase()));
    return parts.join(' ; ');
  };
  /** Toutes les espèces, dans l'ordre du bestiaire (les signatures restent les mêmes d'une partie à l'autre). */
  K.all = () => D.CREATURES.map((c) => K.of(c)).filter(Boolean);
  K.reset = () => { ready = false; used.clear(); D.CREATURES.forEach((c) => { delete c.kit; }); }; // pour les tests
  /** Les gardiens gagnent leur attaque signature dans chacune de leurs phases. */
  K.prepareBosses = function () {
    D.CREATURES.forEach((c) => {
      if (!c.phases || c.tier !== 2 || c.signatureAdded) return;
      c.signatureAdded = true;
      c.phases.forEach((ph) => ph.patterns.splice(Math.min(1, ph.patterns.length), 0, { type: 'signature' }));
    });
  };

  /* ======================= Jeu ======================= */
  const C = () => AN.Combat;
  const FX = () => AN.FX;
  const teamOf = (e) => (e.team === 'ally' || e.team === 'civil' ? 'player' : 'wild');
  const mulOf = (X, e) => (e.dmgMul || 1) * (e.team === 'ally' ? X.compDmg || 1 : 1) * (e.isBoss ? 1 : 1);
  const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  /** Touche tout ce qui, de l'autre camp, passe le test. */
  function strike(X, e, test, dmg, opts = {}) {
    let n = 0;
    for (const t of C().enemiesOf(X, teamOf(e))) {
      if (!test(t)) continue;
      C().hit(X, t, dmg, e, Object.assign({ knock: 120 }, opts));
      n++;
    }
    return n;
  }
  const inCone = (e, t, ang, rad, arc) => U.dist(e.x, e.y, t.x, t.y) <= rad + (t.r || 10) * 0.6 && Math.abs(U.angDiff(ang, angTo(e, t))) <= arc / 2 + Math.atan2(t.r || 10, Math.max(1, U.dist(e.x, e.y, t.x, t.y)));
  function move(e, ang, speed) { e.dvx = Math.cos(ang) * speed; e.dvy = Math.sin(ang) * speed; e.vx = e.dvx; e.vy = e.dvy; }
  function stop(e) { e.dvx = e.dvy = 0; }
  function shot(X, e, ang, s, extra) {
    const team = teamOf(e);
    return C().shoot(X, Object.assign({ x: e.x + Math.cos(ang) * e.r * 0.7, y: e.y + Math.sin(ang) * e.r * 0.7, angle: ang, speed: s.speed || 260, dmg: s.dmg * mulOf(X, e), team, size: s.size || 5, color: s.color, range: s.range || 300, owner: e }, extra || {}));
  }

  // le jeu de chaque forme : start (au moment de frapper), tick (tant qu'elle dure ; vrai quand c'est fini)
  const RUN = {
    croc: { start(X, e, A) { A.ang = angTo(e, A.tgt); A.dur = 0.16; }, tick(X, e, A, dt, s) {
      if (!A.fixed) move(e, A.ang, s.lunge / A.dur);
      if (A.t >= A.dur && !A.hit) { A.hit = 1; stop(e); strike(X, e, (t) => inCone(e, t, A.ang, e.r + 22, 1.3), s.dmg * mulOf(X, e), { knock: 140 }); FX().burst(e.x + Math.cos(A.ang) * e.r, e.y + Math.sin(A.ang) * e.r, e.pal.accent, 6, 110, { size: 2.5 }); }
      return A.t >= A.dur + 0.05; } },
    griffes: { start(X, e, A) { A.k = 0; A.next = 0; }, tick(X, e, A, dt, s) {
      stop(e);
      if (A.t >= A.next && A.k < s.n) {
        const ang = angTo(e, A.tgt) + (A.k % 2 ? 0.22 : -0.22);
        strike(X, e, (t) => inCone(e, t, ang, e.r + s.rad, s.arc), s.dmg * mulOf(X, e), { knock: 90 });
        slashFx(e, ang, e.r + s.rad, s.arc, e.pal.accent);
        A.k++; A.next = A.t + s.gap;
      }
      return A.k >= s.n && A.t >= A.next - s.gap + 0.12; } },
    dard: { start(X, e, A) { A.ang = angTo(e, A.tgt); }, tick(X, e, A, dt, s) {
      stop(e);
      if (!A.hit) {
        A.hit = 1;
        const ex = e.x + Math.cos(A.ang) * (e.r + s.len), ey = e.y + Math.sin(A.ang) * (e.r + s.len);
        let touched = null;
        strike(X, e, (t) => { const ok = segDist(t.x, t.y, e.x, e.y, ex, ey) <= s.width / 2 + (t.r || 10); if (ok) touched = t; return ok; }, s.dmg * mulOf(X, e), { knock: 60 });
        if (touched) C().pool(X, { x: touched.x, y: touched.y, r: 22, dps: s.venom * mulOf(X, e), life: 2, color: '#93c94e', team: teamOf(e) });
        lineFx(e.x, e.y, ex, ey, e.pal.accent);
      }
      return A.t >= 0.12; } },
    bond: { start(X, e, A) {
      const d = Math.min(U.dist(e.x, e.y, A.tgt.x, A.tgt.y), s0(A).leap), ang = angTo(e, A.tgt);
      A.ang = ang; A.tx = e.x + Math.cos(ang) * d; A.ty = e.y + Math.sin(ang) * d; A.fx = e.x; A.fy = e.y;
      C().telegraph(X, { x: A.tx, y: A.ty, r: s0(A).rad, windup: s0(A).air, dmg: 0, team: teamOf(e), silent: true });
    }, tick(X, e, A, dt, s) {
      const k = Math.min(1, A.t / s.air);
      if (!A.fixed) { const nx = U.lerp(A.fx, A.tx, k), ny = U.lerp(A.fy, A.ty, k); e.dvx = (nx - e.x) / Math.max(dt, 1e-3); e.dvy = (ny - e.y) / Math.max(dt, 1e-3); e.vx = e.dvx; e.vy = e.dvy; }
      A.air = Math.sin(k * Math.PI); // hauteur du saut, pour le dessin
      if (k >= 1 && !A.hit) { A.hit = 1; stop(e); A.air = 0; strike(X, e, (t) => U.dist(t.x, t.y, e.x, e.y) <= s.rad + (t.r || 10) * 0.5, s.dmg * mulOf(X, e), { knock: 240 }); FX().ring(e.x, e.y, e.pal.accent, 6, s.rad, 0.35, 4); if (X.cam) X.cam.shake(3); }
      return A.hit && A.t >= s.air + 0.05; } },
    toupie: { start(X, e, A) { A.k = 0; A.next = 0; }, tick(X, e, A, dt, s) {
      stop(e);
      if (A.t >= A.next && A.k < s.n) { A.k++; A.next = A.t + s.gap; strike(X, e, (t) => U.dist(t.x, t.y, e.x, e.y) <= e.r + s.rad + (t.r || 10) * 0.5, s.dmg * mulOf(X, e), { knock: 180 }); FX().ring(e.x, e.y, e.pal.accent, e.r, e.r + s.rad, 0.3, 3); }
      return A.k >= s.n && A.t >= A.next - s.gap + 0.15; } },
    etreinte: { start(X, e, A) { A.ang = angTo(e, A.tgt); A.dur = 0.14; }, tick(X, e, A, dt, s) {
      if (!A.fixed) move(e, A.ang, s.lunge / A.dur);
      if (A.t >= A.dur && !A.hit) {
        A.hit = 1; stop(e);
        strike(X, e, (t) => { const ok = inCone(e, t, A.ang, e.r + 20, 1.4); if (ok) { t.slowT = Math.max(t.slowT || 0, s.hold); t.slowAmt = Math.max(t.slowAmt || 0, s.slow); if (t.kind === 'player') FX().text(t.x, t.y - 24, 'saisi', AN.INK, { size: 11 }); } return ok; }, s.dmg * mulOf(X, e), { knock: 30 });
      }
      return A.t >= A.dur + 0.1; } },

    charge: { start(X, e, A) { A.ang = angTo(e, A.tgt); A.dur = s0(A).dist / s0(A).speed; }, tick(X, e, A, dt, s) { return dash(X, e, A, dt, s, A.ang, A.dur); } },
    zigzag: { start(X, e, A) { A.leg = 0; A.base = angTo(e, A.tgt); A.ang = A.base + s0(A).turn; A.dur = s0(A).seg / s0(A).speed; A.t0 = 0; }, tick(X, e, A, dt, s) {
      if (dash(X, e, A, dt, s, A.ang, A.dur, A.t0)) {
        A.leg++; if (A.leg >= s.n) return true;
        A.t0 = A.t; A.hit = 0; A.base = angTo(e, A.tgt); A.ang = A.base + (A.leg % 2 ? -s.turn : s.turn);
      }
      return false; } },
    retour: { start(X, e, A) { A.leg = 0; A.ang = angTo(e, A.tgt); A.dur = s0(A).dist / s0(A).speed; A.t0 = 0; }, tick(X, e, A, dt, s) {
      if (A.leg === 1 && A.t < A.t0 + s.pause) { stop(e); return false; }
      if (dash(X, e, A, dt, s, A.ang, A.dur, A.leg === 1 ? A.t0 + s.pause : 0)) {
        A.leg++; if (A.leg >= 2) return true;
        A.t0 = A.t; A.hit = 0; A.ang += Math.PI;
      }
      return false; } },
    roulade: { start(X, e, A) { A.ang = angTo(e, A.tgt); A.dur = s0(A).dist / s0(A).speed; A.drop = 0; }, tick(X, e, A, dt, s) {
      A.drop -= dt;
      if (A.drop <= 0 && A.t < A.dur) { A.drop = 34 / s.speed; C().pool(X, { x: e.x, y: e.y, r: Math.max(16, e.r * 0.8), dps: s.trail * mulOf(X, e), life: 2.4, color: e.pal.accent, team: teamOf(e) }); }
      return dash(X, e, A, dt, s, A.ang, A.dur); } },
    percee: { start(X, e, A) { A.ang = angTo(e, A.tgt); A.dur = s0(A).dist / s0(A).speed; }, tick(X, e, A, dt, s) {
      const done = dash(X, e, A, dt, s, A.ang, A.dur);
      if (done && !A.wave) { A.wave = 1; C().shockwave(X, { x: e.x, y: e.y, r0: e.r, speed: 300, max: s.wave, width: 18, dmg: s.dmg * mulOf(X, e), team: teamOf(e), color: e.pal.accent }); }
      return done; } },

    onde: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; strike(X, e, (t) => U.dist(t.x, t.y, e.x, e.y) <= s.rad + (t.r || 10) * 0.5, s.dmg * mulOf(X, e), { knock: 260 }); FX().ring(e.x, e.y, e.pal.accent, e.r, s.rad, 0.35, 4); if (X.cam) X.cam.shake(4); } return A.t > 0.1; } },
    faille: { start(X, e, A) {
      const ang = angTo(e, A.tgt), s = s0(A);
      for (let i = 0; i < s.n; i++) C().telegraph(X, { x: e.x + Math.cos(ang) * (e.r + s.rad * (1 + i * 1.5)), y: e.y + Math.sin(ang) * (e.r + s.rad * (1 + i * 1.5)), r: s.rad, windup: 0.25 + i * s.step, dmg: s.dmg * mulOf(X, e), team: teamOf(e), color: e.pal.accent, silent: i > 0 });
    }, tick(X, e, A, dt, s) { stop(e); return A.t > 0.25 + s.n * s.step; } },
    double: { tick(X, e, A, dt, s) {
      stop(e);
      if (!A.k) { A.k = 1; strike(X, e, (t) => U.dist(t.x, t.y, e.x, e.y) <= s.rad + (t.r || 10) * 0.5, s.dmg * mulOf(X, e), { knock: 200 }); FX().ring(e.x, e.y, e.pal.accent, e.r, s.rad, 0.3, 3); C().telegraph(X, { x: e.x, y: e.y, r: s.rad * s.mult, windup: s.gap, dmg: s.dmg * mulOf(X, e), team: teamOf(e), color: e.pal.accent, silent: true }); }
      return A.t > s.gap + 0.05; } },
    eruption: { start(X, e, A) {
      const s = s0(A), t = A.tgt;
      for (let i = 0; i < s.n; i++) { const a = i ? Math.random() * TAU : 0, d = i ? 40 + Math.random() * 50 : 0; C().telegraph(X, { x: t.x + (t.vx || 0) * 0.25 + Math.cos(a) * d, y: t.y + (t.vy || 0) * 0.25 + Math.sin(a) * d, r: s.rad, windup: s.windup + 0.1 + i * 0.15, dmg: s.dmg * mulOf(X, e), team: teamOf(e), color: e.pal.accent, silent: i > 0 }); }
    }, tick(X, e, A, dt, s) { stop(e); return A.t > 0.2; } },
    cratere: { tick(X, e, A, dt, s) {
      stop(e);
      if (!A.hit) { A.hit = 1; strike(X, e, (t) => U.dist(t.x, t.y, e.x, e.y) <= s.rad + (t.r || 10) * 0.5, s.dmg * mulOf(X, e), { knock: 220 }); FX().ring(e.x, e.y, e.pal.accent, e.r, s.rad, 0.35, 4); C().pool(X, { x: e.x, y: e.y, r: s.rad * 0.7, dps: s.dps * mulOf(X, e), life: s.life, color: e.pal.accent, team: teamOf(e) }); }
      return A.t > 0.1; } },

    salve: { start(X, e, A) { A.k = 0; A.next = 0; }, tick(X, e, A, dt, s) {
      stop(e);
      if (A.t >= A.next && A.k < s.n) { A.k++; A.next = A.t + s.gap; shot(X, e, angTo(e, A.tgt) + (Math.random() - 0.5) * 0.08, s); A.recoil = 1; AN.Audio.play('enemy_shoot', { gap: 0.06, at: e }); }
      return A.k >= s.n; } },
    eventail: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; const a = angTo(e, A.tgt); for (let i = 0; i < s.n; i++) shot(X, e, a + (i / (s.n - 1) - 0.5) * s.spread, s); AN.Audio.play('enemy_shoot', { gap: 0.08, at: e }); } return true; } },
    courbe: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; const a = angTo(e, A.tgt); for (let i = 0; i < s.n; i++) for (const sd of [-1, 1]) shot(X, e, a - sd * (0.45 + i * 0.25), s, { turn: sd * s.turn * (1 - i * 0.2) }); AN.Audio.play('enemy_shoot', { gap: 0.08, at: e }); } return true; } },
    ondule: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; const a = angTo(e, A.tgt); for (let i = 0; i < s.n; i++) shot(X, e, a + (i - (s.n - 1) / 2) * 0.12, s, { wave: { amp: s.amp, freq: s.freq, ph: i * 1.4 } }); AN.Audio.play('enemy_shoot', { gap: 0.08, at: e }); } return true; } },
    boomerang: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; const a = angTo(e, A.tgt); for (let i = 0; i < s.n; i++) shot(X, e, a + (i ? 0.3 : -0.0) * (s.n > 1 ? 1 : 0) - (s.n > 1 ? 0.15 : 0), s, { ret: (s.range / s.speed) * 0.5, pierce: 3, life: (s.range / s.speed) * 2.2, size: s.size + 1 }); AN.Audio.play('enemy_shoot', { gap: 0.08, at: e }); } return true; } },
    eclats: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; shot(X, e, angTo(e, A.tgt), s, { size: s.size + 2, split: { n: s.k, dmg: s.frag * mulOf(X, e), speed: s.speed * 0.8, size: Math.max(3, s.size - 1), range: 160 } }); AN.Audio.play('enemy_shoot', { gap: 0.08, at: e }); } return true; } },
    traqueur: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; shot(X, e, angTo(e, A.tgt), Object.assign({}, s, { speed: s.speed * 0.55 }), { home: s.home, size: s.size * 1.7, life: (s.range / (s.speed * 0.55)) * 1.4 }); AN.Audio.play('enemy_shoot', { gap: 0.08, at: e, pitch: 0.7 }); } return true; } },
    mortier: { tick(X, e, A, dt, s) {
      stop(e);
      if (!A.hit) {
        A.hit = 1;
        const t = A.tgt, x = t.x + (t.vx || 0) * s.fly * 0.6, y = t.y + (t.vy || 0) * s.fly * 0.6;
        C().telegraph(X, { x, y, r: s.rad, windup: s.fly, dmg: s.dmg * mulOf(X, e), team: teamOf(e), color: e.pal.accent });
        FX().stream(e.x, e.y, x, y, e.pal.accent, { life: s.fly, size: 5 });
      }
      return true; } },

    crachat: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; lob(X, e, A.tgt.x + (A.tgt.vx || 0) * 0.4, A.tgt.y + (A.tgt.vy || 0) * 0.4, s.rad, s.dmg, s.life, 0.7); } return true; } },
    chapelet: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; const a = angTo(e, A.tgt); for (let i = 0; i < s.n; i++) lob(X, e, e.x + Math.cos(a) * (e.r + s.space * (i + 1)), e.y + Math.sin(a) * (e.r + s.space * (i + 1)), s.rad, s.dmg, s.life, 0.45 + i * 0.12); } return true; } },
    nappe: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; const a = angTo(e, A.tgt); for (let i = 0; i < s.n; i++) { const aa = a + (i / Math.max(1, s.n - 1) - 0.5) * s.arc; lob(X, e, e.x + Math.cos(aa) * s.dist, e.y + Math.sin(aa) * s.dist, s.rad, s.dmg, s.life, 0.4); } } return true; } },
    brume: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; C().pool(X, { x: e.x, y: e.y, r: s.rad, dps: s.dmg * mulOf(X, e), life: s.life, color: e.pal.accent, team: teamOf(e), slow: s.slow }); FX().ring(e.x, e.y, e.pal.accent, e.r, s.rad, 0.5, 3); } return true; } },
    bulle: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; shot(X, e, angTo(e, A.tgt), { speed: s.speed, dmg: s.dmg * 0.5, size: 9, color: e.pal.accent, range: s.range }, { burst: { r: s.rad, dps: s.dmg * mulOf(X, e), life: s.life, color: e.pal.accent } }); } return true; } },

    arc: { tick(X, e, A, dt, s) {
      stop(e);
      if (!A.hit) {
        A.hit = 1;
        let from = e, t = A.tgt; const hitSet = new Set();
        for (let k = 0; k <= s.chain && t; k++) {
          C().hit(X, t, s.dmg * mulOf(X, e) * (k ? 0.6 : 1), e, { knock: 50 }); hitSet.add(t); zap(from.x, from.y, t.x, t.y, e.pal.glow || e.pal.accent);
          from = t; t = null; let bd = 130;
          for (const o of C().enemiesOf(X, teamOf(e))) { if (hitSet.has(o)) continue; const d = U.dist(o.x, o.y, from.x, from.y); if (d < bd) { bd = d; t = o; } }
        }
      }
      return true; } },
    faisceau: { start(X, e, A) { const s = s0(A); C().laser(X, { owner: e, angle: angTo(e, A.tgt), sweep: s.sweep, dur: s.dur, windup: 0.01, dps: (s.dmg / s.dur) * mulOf(X, e), width: s.width, len: s.len, color: e.pal.glow || e.pal.accent, team: teamOf(e) }); }, tick(X, e, A, dt, s) { stop(e); return A.t >= s.dur; } },
    nova: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; C().shockwave(X, { x: e.x, y: e.y, r0: e.r, speed: s.speed, max: s.max, width: 18, dmg: s.dmg * mulOf(X, e), team: teamOf(e), color: e.pal.glow || e.pal.accent }); } return true; } },
    piliers: { start(X, e, A) { const s = s0(A), t = A.tgt; for (let i = 0; i < s.n; i++) { const a = Math.random() * TAU, d = i ? 30 + Math.random() * 40 : 0; C().telegraph(X, { x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d, r: s.rad, windup: s.windup + i * 0.2, dmg: s.dmg * mulOf(X, e), team: teamOf(e), color: '#a0c8ff', silent: i > 0, onDone: (XX, tg) => zap(tg.x, tg.y - 120, tg.x, tg.y, '#d8ecff') }); } }, tick(X, e, A, dt, s) { stop(e); return A.t > 0.15; } },
    orbe: { tick(X, e, A, dt, s) { stop(e); if (!A.hit) { A.hit = 1; shot(X, e, angTo(e, A.tgt), Object.assign({}, s, { color: e.pal.glow || e.pal.accent }), { pierce: 2, size: s.size, life: s.range / s.speed }); } return true; } },
  };
  /** La spécification de l'acte en cours. */
  const s0 = (A) => A.spec;
  /** Une ruée : elle touche une fois par passage, ce qu'elle traverse. */
  function dash(X, e, A, dt, s, ang, dur, t0 = 0) {
    const tt = A.t - t0;
    if (!A.fixed) move(e, ang, s.speed);
    if (!A.hit) {
      A.hit = strike(X, e, (t) => U.dist(t.x, t.y, e.x, e.y) <= e.r + (t.r || 10) + 4, s.dmg * mulOf(X, e), { knock: 320 }) > 0 ? 1 : 0;
    }
    if (tt >= dur) { stop(e); return true; }
    return false;
  }
  function lob(X, e, x, y, rad, dmg, life, fly) {
    const team = teamOf(e), mul = mulOf(X, e), color = e.pal.accent;
    C().telegraph(X, { x, y, r: rad, windup: fly, dmg: dmg * 0.6 * mul, team, color, silent: true, onDone: (XX) => C().pool(XX, { x, y, r: rad, dps: dmg * mul, life, color, team }) });
    FX().stream(e.x, e.y, x, y, color, { life: fly, size: 4 });
  }
  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1, k = U.clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1);
    return Math.hypot(px - (x1 + dx * k), py - (y1 + dy * k));
  }
  function zap(x1, y1, x2, y2, color) {
    for (let i = 0; i <= 6; i++) { const k = i / 6; FX().add({ kind: 'dot', x: U.lerp(x1, x2, k) + (Math.random() - 0.5) * 10, y: U.lerp(y1, y2, k) + (Math.random() - 0.5) * 10, color, life: 0.18, size: 2.5, glow: true }); }
  }
  function lineFx(x1, y1, x2, y2, color) { for (let i = 0; i <= 5; i++) { const k = i / 5; FX().add({ kind: 'dot', x: U.lerp(x1, x2, k), y: U.lerp(y1, y2, k), color, life: 0.2, size: 2 }); } }
  function slashFx(e, ang, rad, arc, color) {
    for (let i = 0; i <= 6; i++) { const a = ang - arc / 2 + (arc * i) / 6; FX().add({ kind: 'dot', x: e.x + Math.cos(a) * rad, y: e.y + Math.sin(a) * rad, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, color, life: 0.22, size: 2.5 }); }
  }

  /** Commence un acte : annonce (pose, et pour certaines formes, une zone), puis frappe, puis reprise. */
  function begin(X, e, tgt, spec, fixed) {
    const A = (e.act = { spec, tgt, t: 0, phase: 'windup', fixed: !!fixed, air: 0 });
    // annonces visibles des formes qui frappent loin
    if (spec.form === 'charge' || spec.form === 'percee' || spec.form === 'roulade') C().telegraph(X, { kind: 'line', x: e.x, y: e.y, angle: angTo(e, tgt), len: spec.dist, width: e.r * 2, windup: spec.windup, dmg: 0, team: teamOf(e), silent: true });
    if (spec.form === 'dard') C().telegraph(X, { kind: 'line', x: e.x, y: e.y, angle: angTo(e, tgt), len: e.r + spec.len, width: spec.width, windup: spec.windup, dmg: 0, team: teamOf(e), silent: true });
    if (spec.form === 'onde' || spec.form === 'cratere' || spec.form === 'double') C().telegraph(X, { x: e.x, y: e.y, r: spec.rad, windup: spec.windup, dmg: 0, team: teamOf(e), follow: fixed ? null : e, silent: true });
    if (spec.form === 'griffes' || spec.form === 'toupie') C().telegraph(X, { kind: 'cone', x: e.x, y: e.y, angle: angTo(e, tgt), r: e.r + (spec.rad || 30), arc: spec.form === 'toupie' ? TAU : spec.arc, windup: spec.windup, dmg: 0, team: teamOf(e), follow: fixed ? null : e, silent: true });
    return A;
  }
  /** Fait avancer l'acte en cours. Vrai tant qu'il dure. */
  K.run = function (X, e, dt) {
    const A = e.act;
    if (!A) return false;
    const s = A.spec, R = RUN[s.form];
    if (!R || !A.tgt || A.tgt.alive === false) { e.act = null; return false; }
    A.t += dt;
    if (A.phase === 'windup') {
      if (!A.fixed) stop(e);
      e.face += U.angDiff(e.face, angTo(e, A.tgt)) * Math.min(1, dt * 10);
      if (A.t >= s.windup) { A.phase = 'active'; A.t = 0; if (R.start) R.start(X, e, A); e.attackAnim = 1; }
      return true;
    }
    if (A.phase === 'active') {
      if (R.tick(X, e, A, dt, s)) { A.phase = 'recover'; A.t = 0; stop(e); }
      return true;
    }
    if (A.t >= s.recover) { e.act = null; return false; }
    stop(e);
    return true;
  };
  /** L'attaque d'une créature contre une cible : s'approcher à sa distance, annoncer, frapper. */
  K.attack = function (X, e, tgt, dt, opts = {}) {
    const kit = K.of(e.def);
    if (!kit || !kit.primary) return false;
    if (e.act) { K.run(X, e, dt); return true; }
    e.atkCd2 = (e.atkCd2 == null ? 2 + Math.random() * 3 : e.atkCd2) - dt;
    const d = U.dist(e.x, e.y, tgt.x, tgt.y) - (tgt.r || 10);
    const Z = AN.ZoneGen;
    const sec = kit.second && e.atkCd2 <= 0 && d <= F[kit.second.form].reach(kit.second, e) && (!F[kit.second.form].ranged || Z.los(X.zone, e.x, e.y, tgt.x, tgt.y)) ? kit.second : null;
    const spec = sec || kit.primary, form = F[spec.form];
    const reach = form.reach(spec, e), want = form.range(spec, e);
    const ready = sec || e.atkCd <= 0;
    const sees = !form.ranged || Z.los(X.zone, e.x, e.y, tgt.x, tgt.y);
    if (ready && d <= reach && sees) {
      begin(X, e, tgt, spec, opts.fixed);
      if (sec) e.atkCd2 = spec.cd; else e.atkCd = spec.cd;
      return true;
    }
    if (opts.fixed) return false;
    // s'approcher, garder sa distance, tourner autour
    const sp = e.speed * (e.slowT > 0 ? 1 - (e.slowAmt || 0) : 1);
    e.face += U.angDiff(e.face, angTo(e, tgt)) * Math.min(1, dt * 8);
    if (d > Math.max(want, reach * 0.85) || !sees) opts.steer(tgt.x, tgt.y, sp);
    else if (want > 40 && d < want * 0.6) { const a = angTo(tgt, e); e.dvx = Math.cos(a) * sp * 0.7; e.dvy = Math.sin(a) * sp * 0.7; }
    else if (want > 40) { const a = angTo(e, tgt) + Math.PI / 2, sd = Math.sin(X.time * 0.8 + (e.seed || 0)) > 0 ? 1 : -1; e.dvx = Math.cos(a) * sp * 0.4 * sd; e.dvy = Math.sin(a) * sp * 0.4 * sd; }
    else opts.steer(tgt.x, tgt.y, sp);
    return true;
  };
  /** Le réflexe d'une créature qui n'attaque pas (ou en plus de son attaque) : quand on la frappe, ou qu'on la serre de près. */
  K.reflex = function (X, e) {
    const kit = K.of(e.def), s = kit && kit.reflex;
    if (!s || (e.reflexCd || 0) > X.time || !e.alive || e.weak) return false;
    e.reflexCd = X.time + s.cd;
    e.reflexT = 0.4; // pour le dessin
    const team = teamOf(e);
    if (s.form === 'eblouir') {
      FX().ring(e.x, e.y, '#ffffff', e.r, s.rad, 0.35, 4); FX().burst(e.x, e.y, '#ffffff', 16, 160, { size: 3, glow: true });
      for (const t of C().enemiesOf(X, team)) if (U.dist(t.x, t.y, e.x, e.y) < s.rad) { t.slowT = Math.max(t.slowT || 0, s.dur); t.slowAmt = Math.max(t.slowAmt || 0, s.slow); }
    } else if (s.form === 'repousser') {
      FX().ring(e.x, e.y, e.pal.accent, e.r, s.rad, 0.3, 3);
      for (const t of C().enemiesOf(X, team)) { const dd = U.dist(t.x, t.y, e.x, e.y); if (dd < s.rad) { const a = angTo(e, t), k = s.knock * (1 - dd / s.rad) + 80; t.kbx = (t.kbx || 0) + Math.cos(a) * k; t.kby = (t.kby || 0) + Math.sin(a) * k; } }
    } else if (s.form === 'spores') {
      C().pool(X, { x: e.x, y: e.y, r: s.rad, dps: 0.5, life: s.life, color: U.rgba(e.pal.accent, 0.8), team, slow: s.slow });
    } else if (s.form === 'esquive') {
      const p = X.player, a = angTo(p, e) + (Math.random() - 0.5) * 1.2, Z = AN.ZoneGen;
      const nx = e.x + Math.cos(a) * s.dist, ny = e.y + Math.sin(a) * s.dist;
      if (!e.rider && !Z.isSolid(Z.tileAt(X.zone, nx, ny))) { FX().burst(e.x, e.y, e.pal.body, 8, 120, { size: 2 }); e.x = nx; e.y = ny; }
    } else if (s.form === 'boule') {
      e.shellT = s.dur; e.shellK = s.armor;
    }
    return true;
  };
  /** Un gardien joue son attaque signature (motif « signature » de ses phases). */
  K.signature = function (X, e) {
    const kit = K.of(e.def);
    if (!kit || !kit.primary || e.act) return { busy: 0, cd: 0.6 };
    const spec = Object.assign({}, kit.primary, { boss: true });
    begin(X, e, X.player, spec, false);
    return { busy: spec.windup + 1.2, cd: 1.4 };
  };
  K.prepareBosses();
})();
