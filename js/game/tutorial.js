/* Tutoriel interactif : « Le Seuil », un petit monde à part, proposé à la
   première partie. Une seule zone, construite à la main (pas par le
   générateur), traversée d'étape en étape : se déplacer, récolter, tirer,
   frapper et esquiver, capturer, affronter un gardien, extraire.
   Le moteur d'expédition est le même que partout ailleurs : le tutoriel ne
   fait qu'ajouter un monde, une carte d'objectifs et un guidage.
   Dans le Seuil, on ne peut pas tomber. Rejoué depuis la pause, le tutoriel
   tourne sur un profil jetable : rien n'est conservé. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const h = AN.h;
  const TAU = Math.PI * 2;

  const Tu = (AN.Tutorial = {});
  Tu.CODE = 'SEUIL';

  /** Salles du Seuil, en tuiles (centre et rayon). */
  Tu.ROOMS = {
    start: { x: 9, y: 23, r: 5 },
    grove: { x: 23, y: 12, r: 6 },
    training: { x: 37, y: 28, r: 6.5 },
    meadow: { x: 52, y: 13, r: 7 },
    arena: { x: 63, y: 31, r: 8 },
    plate: { x: 46, y: 39, r: 4 },
  };
  const PATHS = [['start', 'grove'], ['grove', 'training'], ['training', 'meadow'], ['meadow', 'arena'], ['training', 'plate'], ['plate', 'arena']];

  /** Le monde du tutoriel (même forme qu'une destination). */
  Tu.world = function (seed) {
    seed = seed >>> 0 || 7;
    const zone = { biome: 'jardins_ambre', mix: null, name: 'Clairière du Seuil', guardian: 'veilleur_seuil', vault: null };
    return {
      tutorial: true, seed, code: Tu.CODE, region: 'Le Seuil', primary: 'jardins_ambre', threat: 1, size: 'petit', tiles: 0,
      zones: [zone], heart: { biome: 'jardins_ambre', mix: null, name: 'Cœur du Seuil', guardian: 'veilleur_seuil', heart: true, vault: null },
      anomaly: 'aucune', anomalyZone: -1, rule: 'aucune', stability: 0.97, density: 1, life: 'mousseron', resources: ['pollen', 'seve', 'ambre'],
      civ: null, scale: 'region',
      scan: { type: 'Jardins d’ambre', threat: '1', size: 'Minuscule', zones: '1', climate: 'Doux', life: 'Mousserons', stability: '97 %', anomaly: 'Aucune', rule: 'Aucune', guardian: 'Veilleur du Seuil', civ: 'Aucune', resources: ['pollen', 'seve', 'ambre'], vaults: [] },
    };
  };

  /** La zone du Seuil, construite à la main. Appelée par ZoneGen.generate. */
  Tu.zone = function (world, index) {
    const Z = AN.ZoneGen, T = Z.T;
    const w = 74, h = 48;
    const grid = new Uint8Array(w * h).fill(Z.WALL);
    const bmap = new Uint8Array(w * h);
    const shade = new Float32Array(w * h);
    const idx = (x, y) => y * w + x;
    const rng = AN.RNG.from(world.seed, 'seuil');
    const nz = new AN.Noise(rng.int(1, 1e9)), ns = new AN.Noise(rng.int(1, 1e9));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) shade[idx(x, y)] = ns.fbm(x * 0.18, y * 0.18, 3);
    const disk = (cx, cy, r, val = Z.FLOOR, rough = 2.4) => {
      for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
        const edge = r + (nz.fbm(x * 0.25, y * 0.25, 2) - 0.5) * rough;
        if (Math.hypot(x - cx, y - cy) <= edge) grid[idx(x, y)] = val;
      }
    };
    const R = Tu.ROOMS;
    Object.values(R).forEach((room) => disk(room.x, room.y, room.r));
    PATHS.forEach(([a, b], k) => {
      const A = R[a], B = R[b];
      const n = Math.ceil(Math.hypot(B.x - A.x, B.y - A.y));
      const nx = -(B.y - A.y) / n, ny = (B.x - A.x) / n;
      for (let i = 0; i <= n; i++) {
        const f = i / n, wob = Math.sin(f * Math.PI * 2 + k) * 2.2 * Math.sin(f * Math.PI);
        disk(A.x + (B.x - A.x) * f + nx * wob, A.y + (B.y - A.y) * f + ny * wob, 2.1, Z.FLOOR, 1.2);
      }
    });
    // plaque d'extraction
    const P = R.plate;
    for (let y = P.y - 2; y <= P.y + 2; y++) for (let x = P.x - 2; x <= P.x + 2; x++) if ((x - P.x) ** 2 + (y - P.y) ** 2 <= 4.6) grid[idx(x, y)] = Z.PLATE;

    const toPx = (t) => ({ x: t.x * T + T / 2, y: t.y * T + T / 2 });
    const at = (room, a, d) => ({ x: Math.round(room.x + Math.cos(a) * d), y: Math.round(room.y + Math.sin(a) * d) });
    // gisements du bosquet
    const nodes = [];
    [['pollen', 0.3], ['seve', 2.2], ['pollen', 4.1], ['ambre', 5.4]].forEach(([res, a], i) => {
      const t = at(R.grove, a, i === 3 ? 4 : 3);
      grid[idx(t.x, t.y)] = Z.FLOOR;
      nodes.push({ id: 'n' + i, tx: t.x, ty: t.y, ...toPx(t), res, amount: res === 'ambre' ? 1 : 3, uses: res === 'ambre' ? 1 : 2 });
    });
    // créatures : des Ambrelles pour s'exercer, des Mousserons à capturer
    const groups = [
      { species: 'ambrelle', ...pt(R.training, 0.6, 2.5), count: 2, temper: 'territorial' },
      { species: 'mousseron', ...pt(R.meadow, 2.6, 2), count: 2, temper: 'passif' },
      { species: 'mousseron', ...pt(R.meadow, 0.2, 3.5), count: 1, temper: 'passif' },
    ];
    function pt(room, a, d) { const t = at(room, a, d); return { tx: t.x, ty: t.y, ...toPx(t) }; }
    // décor
    const biome = D.BIOME.jardins_ambre;
    const decor = [];
    for (let k = 0; k < w * h * 0.08; k++) {
      const x = rng.int(2, w - 3), y = rng.int(2, h - 3);
      if (grid[idx(x, y)] !== Z.FLOOR) continue;
      const d = rng.pick(biome.decor);
      decor.push({ x: x * T + rng.float(2, T - 2), y: y * T + rng.float(2, T - 2), type: d[0], color: d[1], s: rng.float(0.7, 1.3), rot: rng.float(0, TAU) });
    }
    const A = R.arena;
    return {
      index, isHeart: false, name: 'Clairière du Seuil', biome: 'jardins_ambre', mix: null, guardian: 'veilleur_seuil', tutorial: true,
      w, h, T, grid, bmap, shade,
      entry: toPx(R.start), entryT: { x: R.start.x, y: R.start.y },
      arena: { ...toPx(A), r: (A.r - 1) * T, tx: A.x, ty: A.y },
      plates: [toPx(P)],
      gates: [], nodes, groups, ruins: [], decor, vaults: [], eggs: [], village: null, wells: [],
      starAngle: 1.1,
    };
  };

  /* ======================= Étapes ======================= */
  const kbd = (t) => h('kbd', null, t);
  const roomPx = (k) => { const r = Tu.ROOMS[k], T = AN.ZoneGen.T; return { x: r.x * T + T / 2, y: r.y * T + T / 2 }; };
  const nearest = (X, list) => {
    const p = X.player;
    let best = null, bd = 1e12;
    for (const q of list) { const d = U.dist(q.x, q.y, p.x, p.y); if (d < bd) { bd = d; best = q; } }
    return best;
  };
  const alive = (X, sp) => X.creatures.filter((c) => c.alive && c.def.id === sp && !c.hidden);

  Tu.STEPS = [
    {
      id: 'move', title: 'Se déplacer',
      text: () => [AN.Input.lastDevice === 'clavier' ? 'Déplacez-vous avec ' : 'Déplacez-vous avec le ', kbd(AN.Input.moveKeys()), '. Rejoignez la lueur bleue : la flèche autour de vous indique toujours où aller.'],
      target: () => roomPx('grove'),
      done: (X, S) => U.dist(X.player.x, X.player.y, roomPx('grove').x, roomPx('grove').y) < 150,
    },
    {
      id: 'harvest', title: 'Récolter',
      text: () => ['Approchez-vous d’un gisement et maintenez ', kbd(AN.Input.label('KeyE')), '. Ce que vous récoltez va dans votre sac (', kbd(AN.Input.label('Tab')), ' pour le voir). Il ne vous appartient qu’après l’extraction.'],
      target: (X) => nearest(X, X.zone.nodes.filter((n) => n.uses > 0)),
      done: (X) => X.stats.harvested >= 1,
    },
    {
      id: 'shoot', title: 'Tirer',
      text: () => {
        const tail = '. Les Ambrelles défendent leur territoire : abattez-en une.';
        if (AN.Input.lastDevice === 'tactile') return ['Poussez le ', kbd('stick droit'), ' : vous visez et tirez en même temps', tail];
        if (AN.Input.lastDevice === 'manette') return ['Visez avec le ', kbd('stick droit'), ', tirez avec ', kbd('RT'), tail];
        return ['Visez avec la souris, tirez au ', kbd('clic gauche'), tail];
      },
      target: (X) => nearest(X, alive(X, 'ambrelle')) || roomPx('training'),
      done: (X, S) => X.stats.kills > S.k0 || !alive(X, 'ambrelle').length,
    },
    {
      id: 'melee', title: 'Frapper et esquiver',
      text: () => ['Au contact, frappez (', kbd(AN.Input.label('Mouse2')), '). Puis esquivez (', kbd(AN.Input.label('Space')), ') : pendant l’esquive, rien ne vous touche.'],
      target: (X) => nearest(X, alive(X, 'ambrelle')),
      progress: (X, S) => [X.stats.swings > S.sw0, X.stats.dashes > S.da0],
      done: (X, S) => X.stats.swings > S.sw0 && X.stats.dashes > S.da0,
    },
    {
      id: 'capture', title: 'Capturer',
      text: () => ['Les Mousserons sont paisibles. Affaiblissez-en un en tirant, sans le tuer : un cercle bleu l’entoure. Visez-le alors et maintenez ', kbd(AN.Input.label('KeyF')), ' : le rayon de l’Artefact l’emporte dans la soute.'],
      target: (X) => nearest(X, alive(X, 'mousseron')) || roomPx('meadow'),
      done: (X) => X.cargo.some((c) => c.species && c.species !== 'veilleur_seuil'),
    },
    {
      id: 'guardian', title: 'Le gardien',
      text: (X) => {
        const b = X && X.zone.state.boss;
        if (b && b.alive && b.boss.exhausted) return ['Il est épuisé ! Maintenez ', kbd(AN.Input.label('KeyF')), ' en le visant. Ses ondes de choc interrompent le rayon : franchissez-les d’une esquive (', kbd(AN.Input.label('Space')), ') sans lâcher ', kbd(AN.Input.label('KeyF')), '. Ou achevez-le : ', kbd(AN.Input.label('KeyE')), ' à son contact.'];
        return ['Le Veilleur du Seuil garde la clairière. Esquivez ses tirs (', kbd(AN.Input.label('Space')), ') et frappez-le jusqu’à l’épuiser. Épuisé, il se capture (', kbd(AN.Input.label('KeyF')), ') ou s’achève (', kbd(AN.Input.label('KeyE')), ' à son contact). Vaincu, la zone est à vous.'];
      },
      key: (X) => { const b = X.zone.state.boss; return b && b.alive && b.boss.exhausted ? 'ex' : ''; },
      target: (X) => { const b = X.zone.state.boss; return b && b.alive ? b : roomPx('arena'); },
      done: (X) => X.conquered.has(0),
    },
    {
      id: 'extract', title: 'Extraire',
      text: () => ['Rejoignez la plaque blanche et appuyez sur ', kbd(AN.Input.label('KeyE')), '. Choisissez ce qui part dans l’Archive, puis restez dans le portail pendant que le monde s’efface : rien n’est acquis avant la fin.'],
      target: () => roomPx('plate'),
      done: (X) => !!X.collapse,
    },
    {
      id: 'hold', title: 'Tenir',
      text: () => ['Le Seuil se défait. Restez sur la plaque jusqu’au bout : ce que vous emportez rejoindra l’Archive, et ce monde disparaîtra.'],
      target: () => roomPx('plate'),
      done: () => false,
    },
  ];

  /* ======================= Démarrage et fin ======================= */
  /**
   * Lance le Seuil. opts.sandbox : rejouer sans rien garder (profil jetable,
   * sauvegarde suspendue) ; le vrai profil est rendu à la fin.
   */
  Tu.start = function (profile, opts = {}) {
    let prof = profile;
    if (opts.sandbox) {
      prof = AN.Save.newProfile((Math.random() * 4294967295) >>> 0);
      prof.flags.intro = 1;
      prof.flags.tutorial = 'sandbox';
      prof.settings = profile.settings;
      AN.Save.suspended = true;
      AN.Game.profile = prof;
    } else {
      prof.flags.tutorial = 'started';
      prof.flags.firstExpedition = 1;
    }
    const X = AN.Expedition.start(prof, Tu.world(AN.hash(prof.seed + ':seuil')));
    X.tuto = { i: 0, t: 0, sandbox: opts.sandbox ? profile : null, S: {}, shown: -1, guardT: 0 };
    Tu.enterStep(X, 0);
    return X;
  };

  /** Appelé par l'expédition une fois l'affichage prêt. */
  Tu.setup = function (X) {
    document.body.classList.add('tuto-on');
    X.stats.swings = X.stats.swings || 0;
    X.stats.dashes = X.stats.dashes || 0;
    X.stats.shots = X.stats.shots || 0;
    const card = h('div', { class: 'card tuto-card', role: 'status', 'aria-live': 'polite' });
    AN.HUD.root.appendChild(card);
    AN.HUD.els.tuto = card;
  };

  Tu.enterStep = function (X, i) {
    const T = X.tuto;
    T.i = i;
    T.t = 0;
    T.S = { k0: X.stats.kills, sw0: X.stats.swings || 0, da0: X.stats.dashes || 0 };
    if (i > 0) AN.Audio.play('rank');
    renderCard(X);
  };

  function renderCard(X) {
    const card = AN.HUD.els.tuto;
    if (!card) return;
    const T = X.tuto;
    const st = Tu.STEPS[T.i];
    const n = Tu.STEPS.length - 1;
    AN.clear(card);
    const prog = st.progress ? st.progress(X, T.S) : null;
    card.appendChild(h('div', { class: 'tuto-head' },
      h('span', { class: 'tuto-kicker' }, 'Le Seuil · ' + (T.i < n ? 'étape ' + (T.i + 1) + ' sur ' + n : 'dernière ligne droite')),
      h('button', { type: 'button', class: 'linkish tuto-skip', onclick: () => Tu.askSkip(X) }, T.sandbox ? 'Quitter' : 'Passer le tutoriel')));
    card.appendChild(h('h3', null, st.title));
    card.appendChild(h('p', null, st.text(X)));
    if (prog) card.appendChild(h('div', { class: 'tuto-checks' }, prog.map((ok, k) => h('span', { class: ok ? 'ok' : '' }, ok ? '✓ ' : '○ ', k ? 'Esquiver' : 'Frapper'))));
    card.appendChild(h('div', { class: 'tuto-dots' }, Tu.STEPS.slice(0, n).map((_, k) => h('i', { class: k < T.i ? 'done' : k === T.i ? 'on' : '' }))));
    T.progKey = (prog ? prog.join() : '') + (st.key ? st.key(X) : '') + '|' + AN.Input.lastDevice;
  }

  Tu.update = function (X, dt) {
    const T = X.tuto;
    if (!T) return;
    T.t += dt;
    // la soute du Seuil peut accueillir une créature, le gardien et la zone conquise
    X.cargoCap = Math.max(X.cargoCap, 9);
    let st = Tu.STEPS[T.i];
    // le transfert a commencé : quelle que soit l'étape, il ne reste qu'à tenir
    if (X.collapse && st.id !== 'hold') { Tu.enterStep(X, Tu.STEPS.length - 1); st = Tu.STEPS[T.i]; }
    // la carte se redessine quand l'étape avance, ou quand on change d'appareil (les touches affichées suivent)
    { const k = (st.progress ? st.progress(X, T.S).join() : '') + (st.key ? st.key(X) : '') + '|' + AN.Input.lastDevice; if (k !== T.progKey) renderCard(X); }
    // un gardien épuisé ne se relève pas dans le Seuil : on a le temps d'apprendre
    const boss = X.zone.state.boss;
    if (boss && boss.alive && boss.boss.exhausted && boss.boss.exhaustT < 5) boss.boss.exhaustT = 5;
    // on rend un Mousseron s'il n'en reste plus avant la capture
    if (st.id === 'capture' && T.t > 1 && !alive(X, 'mousseron').length && !st.done(X, T.S)) {
      const def = D.CREATURE.mousseron, m = roomPx('meadow');
      const e = AN.Entities.creature(def, m.x, m.y, { threat: 1, variant: 'commun', hueSeed: 5 });
      e.home = { x: m.x, y: m.y }; e.temper = 'passif';
      X.creatures.push(e);
      AN.FX.burst(m.x, m.y, '#ffffff', 18, 160, { size: 3 });
      AN.HUD.toast('Un autre Mousseron sort des herbes. Plus doucement cette fois : affaiblir, pas tuer.', 5);
      T.t = 0;
    }
    // une étape déjà accomplie (par exemple un gardien vaincu en avance) passe d'elle-même
    if (st.done(X, T.S) && T.t > 0.6 && T.i < Tu.STEPS.length - 1) Tu.enterStep(X, T.i + 1);
  };

  /** Dans le Seuil, l'Artefact retient le joueur au bord de la chute. */
  Tu.guard = function (X, d) {
    const p = X.player;
    if (p.hp - d >= 1) return d;
    if (!X.tuto.guardMsg) { X.tuto.guardMsg = 1; AN.HUD.toast('L’Artefact vous retient. Ici, vous ne pouvez pas tomber ; ailleurs, tomber fait tout perdre.', 6); }
    p.hp = Math.max(p.hp, p.maxHp * 0.5);
    p.iframes = 1.2;
    return 0;
  };

  Tu.askSkip = function (X) {
    const sandbox = !!X.tuto.sandbox;
    AN.UI.confirm(sandbox ? 'Quitter le tutoriel ? Rien de ce monde n’était conservé.' : 'Passer le tutoriel ? Vous rejoindrez l’Archive les mains vides. Vous pourrez le rejouer depuis la pause.', () => Tu.leave(X, 'passe'), sandbox ? 'Quitter' : 'Passer');
  };

  /** Quitte le Seuil sans extraction (passé, abandonné, ou fin d'une partie d'essai). */
  Tu.leave = function (X, why) {
    if (X.left) return;
    X.left = true;
    const real = X.tuto && X.tuto.sandbox;
    const prof = X.profile;
    if (X.beam && X.beam.sound) X.beam.sound.stop();
    if (X.collapse && X.collapse.sound) X.collapse.sound.stop();
    if (X.droneSound) X.droneSound.stop();
    AN.UI.closeAll();
    AN.HUD.hideExpedition();
    document.body.classList.remove('tuto-on');
    AN.X = null;
    if (real) {
      AN.Save.suspended = false;
      AN.Game.profile = real;
      AN.Game.transition(() => {
        AN.Archive.enter({});
        setTimeout(() => AN.HUD.toast(why === 'extrait' ? 'Tutoriel terminé. C’était un exercice : rien n’a été conservé.' : 'Retour à l’Archive.', 5), 900);
      }, 0.5);
      return;
    }
    // première partie : on rend l'équipement emporté, rien d'autre
    D.GEAR_SLOTS.forEach((s) => { const id = X.loadout[s]; if (id && D.GEAR[id] && !D.GEAR[id].bound) prof.owned[id] = (prof.owned[id] || 0) + 1; });
    X.consumables.forEach((c) => { if (c.n > 0) prof.owned[c.id] = (prof.owned[c.id] || 0) + c.n; });
    prof.pendingExpedition = null;
    prof.flags.tutorial = 'skipped';
    AN.Save.write(prof);
    AN.Game.transition(() => {
      AN.Archive.enter({});
      const A = AN.Archive.state();
      if (A && !A.artefactShown) A.introT = 0.01;
      setTimeout(() => AN.HUD.toast('Approchez-vous de l’Artefact avec ' + AN.Input.moveKeys() + ', puis appuyez sur ' + AN.Input.label('KeyE') + '. Le tutoriel se rejoue depuis la pause (Échap).', 8), 1400);
    }, 0.5);
  };

  /** Fin réussie (extraction) de la première partie. */
  Tu.onExtracted = function (prof) {
    prof.flags.tutorial = 'done';
    prof.flags.afterTutorial = 1;
    document.body.classList.remove('tuto-on');
  };

  /** Une expédition interrompue dans le Seuil (onglet fermé) : on efface, sans pénalité. */
  Tu.recover = function (prof) {
    const pe = prof.pendingExpedition;
    if (!pe || pe.code !== Tu.CODE) return false;
    const L = pe.loadout || {};
    D.GEAR_SLOTS.forEach((s) => { const id = L[s]; if (id && D.GEAR[id] && !D.GEAR[id].bound) prof.owned[id] = (prof.owned[id] || 0) + 1; });
    (pe.consumables || []).forEach((c) => { prof.owned[c.id] = (prof.owned[c.id] || 0) + c.n; });
    prof.pendingExpedition = null;
    if (prof.flags.tutorial === 'started') prof.flags.tutorial = null;
    AN.Save.write(prof);
    return true;
  };

  /** Faut-il proposer le Seuil ? (première partie, rien encore visité) */
  Tu.shouldOffer = (prof) => !prof.flags.tutorial && (prof.expeditions || 0) === 0;

  /* ======================= Guidage ======================= */
  function targetOf(X) {
    const st = Tu.STEPS[X.tuto.i];
    return st.target ? st.target(X) : null;
  }

  /** Cercle pulsant sur l'objectif (dans le monde). */
  Tu.drawWorld = function (ctx, X, t) {
    if (!X.tuto) return;
    const g = targetOf(X);
    if (!g) return;
    const r = (g.r ? g.r + 18 : 34) + Math.sin(t * 4) * 5;
    ctx.save();
    ctx.strokeStyle = U.rgba(AN.CYAN, 0.9); ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 30;
    ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    const grd = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
    grd.addColorStop(0, U.rgba(AN.CYAN, 0.16)); grd.addColorStop(1, U.rgba(AN.CYAN, 0));
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /** Flèche autour du personnage vers l'objectif (à l'écran). */
  Tu.drawScreen = function (ctx, X, t) {
    if (!X.tuto) return;
    const g = targetOf(X);
    if (!g) return;
    const cam = X.cam, p = X.player;
    const s = cam.worldToScreen(g.x, g.y);
    const ps = cam.worldToScreen(p.x, p.y);
    const d = Math.hypot(s.x - ps.x, s.y - ps.y);
    if (d < 110) return;
    const a = Math.atan2(s.y - ps.y, s.x - ps.x);
    const rr = 62 + Math.sin(t * 5) * 4;
    ctx.save();
    ctx.translate(ps.x + Math.cos(a) * rr, ps.y + Math.sin(a) * rr);
    ctx.rotate(a);
    ctx.fillStyle = AN.CYAN; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.lineTo(-7, -10); ctx.lineTo(-2, 0); ctx.lineTo(-7, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  /** Offre du Seuil, après l'introduction d'une nouvelle partie. */
  Tu.offer = function (prof, onSkip) {
    const UI = AN.UI;
    const el = h('div', { class: 'panel small tuto-offer' },
      h('p', { class: 'kicker' }, 'Première partie'),
      h('h2', null, 'Le Seuil'),
      h('p', null, 'Un monde minuscule s’est accroché à l’Artefact. Il va s’effondrer, comme tous les autres. Avant, il peut vous apprendre l’essentiel : récolter, combattre, capturer, extraire.'),
      h('p', { class: 'muted' }, 'Cinq minutes environ. Ce que vous en rapporterez sera le premier morceau de votre Archive. Ici, vous ne pouvez pas tomber.'),
      h('div', { class: 'actions' },
        UI.btn('Passer', () => { UI.close(); prof.flags.tutorial = 'skipped'; AN.Save.write(prof); if (onSkip) onSkip(); }, 'ghost'),
        UI.btn('Entrer dans le Seuil', () => {
          UI.close();
          AN.Archive.exit();
          AN.Game.transition(() => Tu.start(prof), 0.7);
        }, 'primary', { autofocus: true })));
    UI.open(el, { dismiss: false });
  };
})();
