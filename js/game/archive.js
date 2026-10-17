/* L'Archive : le monde blanc du joueur, qui se remplit de tout ce qu'il ramène.
   Territoires en hexagones, créatures qui y vivent, productions à ramasser,
   Artefact au centre, dézoom presque infini. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const H = AN.Hex;
  const FX = AN.FX;
  const I = AN.Input;
  const TAU = Math.PI * 2;

  const Ar = (AN.Archive = {});
  let A = null;
  Ar.state = () => A;

  Ar.enter = function (opts = {}) {
    const profile = AN.Game.profile;
    const cam = AN.Game.cam;
    A = {
      profile, cam, time: 0, canvases: new Map(), creatures: [], pickups: [],
      player: { kind: 'player', x: 0, y: 150, vx: 0, vy: 0, dvx: 0, dvy: 0, kbx: 0, kby: 0, r: 12, aim: -Math.PI / 2, anim: 0, iframes: 0, flash: 0 },
      zoom: 1, mapMode: false, selected: null, follow: profile.flags.follow || null, reveal: new Map(), queue: [], qT: 0, saveT: 20, tickT: 0, bondT: 60, mount: null,
      artefactShown: !!profile.flags.intro, introT: profile.flags.intro ? -1 : 0, hover: null, focus: null,
    };
    FX.clear();
    const off = AN.Production.catchUp(profile);
    const bondEv = AN.Bonds.catchUp(profile);
    Ar.rebuildCreatures();
    Ar.rebuildSettlements();
    cam.x = A.player.x; cam.y = A.player.y - 40; cam.zoom = 1;
    if (A.drone) A.drone.stop();
    A.drone = AN.Audio.loop('drone');
    if (AN.Music) AN.Music.mood('archive', { rank: AN.Profile.rank(profile).index, seed: profile.seed });
    AN.Game.setScene(Ar.scene);
    AN.HUD.showArchive(A);
    const appear = () => { A.introT = 0.01; AN.Audio.play('appear'); };
    if (!profile.flags.intro) {
      AN.UI.intro(() => {
        profile.flags.intro = 1;
        AN.Save.write(profile);
        // première partie : le Seuil (tutoriel) est proposé avant tout
        if (AN.Tutorial.shouldOffer(profile)) { AN.Tutorial.offer(profile, () => { appear(); AN.HUD.toast('Approchez-vous de l’Artefact avec ' + AN.Input.moveKeys() + ', puis appuyez sur ' + AN.Input.label('KeyE') + '.', 7); }); return 'quiet'; }
        appear();
      });
    } else if (AN.Tutorial.shouldOffer(profile) && !opts.integration) {
      // partie commencée avant le tutoriel, ou Seuil interrompu : on le repropose
      setTimeout(() => { if (AN.Archive.state() === A && !AN.UI.isOpen()) AN.Tutorial.offer(profile); }, 700);
    }
    if (profile.flags.afterTutorial) {
      delete profile.flags.afterTutorial;
      setTimeout(() => AN.HUD.toast('Voici l’Archive : ce que vous ramenez y vit et y produit. Approchez-vous de l’Artefact (' + AN.Input.label('KeyE') + ') pour choisir votre prochain monde.', 9), 10500);
    }
    if (opts.integration) Ar.integrate(opts.integration);
    else if (off > 60) setTimeout(() => AN.HUD.toast('Pendant votre absence, l’Archive a continué de produire.', 4), 600);
    setTimeout(() => Ar.announce(bondEv), opts.integration ? 9000 : 1500);
    Ar.checkRank(!!opts.integration);
    AN.Save.write(profile);
  };

  /** Recrée les entités des créatures de la collection. */
  Ar.rebuildCreatures = function () {
    const p = A.profile;
    const tmap = new Map(p.territories.map((t) => [t.uid, t]));
    const prev = new Map((A.creatures || []).map((e) => [e.uid, e]));
    const riding = A.mount ? A.mount.uid : null;
    A.cosmo = null;
    A.creatures = p.collection.map((c) => {
      const def = D.CREATURE[c.species];
      if (!def || c.lost || def.tier >= 5) return null; // les géants cosmiques vivent autour de l'Archive (voir cosmos.js)
      const home = c.home ? tmap.get(c.home) : null;
      const cells = home ? AN.Shapes.centers(home) : null;
      const center = home ? cells[AN.hash(c.uid) % cells.length] : { x: 0, y: 0 };
      const old = prev.get(c.uid);
      const a = Math.random() * TAU, rr = Math.random() * (home ? H.R * 0.55 : 200) + (home ? 0 : 90);
      const x = old && old.species === c.species && old.homeKey === (c.home || 'center') ? old.x : center.x + Math.cos(a) * rr;
      const y = old && old.species === c.species && old.homeKey === (c.home || 'center') ? old.y : center.y + Math.sin(a) * rr;
      const e = AN.Entities.creature(def, x, y, { team: 'archive', variant: c.variant, hueSeed: c.hueSeed, foreign: c.foreign, uid: c.uid, nickname: c.nickname, size: AN.Bonds.sizeMul(c), stage: c.stage });
      e.species = c.species;
      e.homeKey = c.home || 'center';
      e.homeC = center;
      e.homeR = home ? H.R * (def.tier >= 3 ? 0.35 : 0.68) : 260;
      e.homeCells = cells && cells.length > 1 && def.tier < 3 ? cells : null; // elles parcourent tout le territoire
      e.entry = c;
      if (old) { e.hiddenUntilIntegrated = old.hiddenUntilIntegrated; e.face = old.face; }
      if (riding === c.uid) { e.ridden = true; A.mount = e; }
      return e;
    }).filter(Boolean);
    if (riding && !A.creatures.some((e) => e.uid === riding)) A.mount = null;
  };

  /** Villages des peuples installés dans l'Archive. */
  Ar.rebuildSettlements = function () {
    if (!A) return;
    A.settle = AN.Settlements.layout(A.profile);
    A.villagers = [];
    A.settle.forEach((L) => {
      const k = Math.min(6, Math.ceil(L.st.n / 3));
      for (let i = 0; i < k; i++) {
        const a = Math.random() * TAU, r = Math.random() * L.r * 0.6;
        const e = AN.Entities.creature(AN.Civ.def(L.st.people, 'villager'), L.x + Math.cos(a) * r, L.y + Math.sin(a) * r, { team: 'archive' });
        e.homeC = { x: L.x, y: L.y };
        e.homeR = L.r * 0.7;
        A.villagers.push(e);
      }
    });
  };

  /** Petite fête visuelle autour d'une créature (évolution, naissance). */
  Ar.celebrate = function (uid) {
    if (!A) return;
    Ar.rebuildCreatures();
    const e = A.creatures.find((c) => c.uid === uid);
    if (!e) return;
    FX.burst(e.x, e.y, e.pal.accent, 30, 220, { size: 3 });
    FX.ring(e.x, e.y, AN.CYAN, e.r, e.r * 4, 0.8, 3);
  };

  /** Annonce les événements de la vie de l'Archive. */
  Ar.announce = function (ev) {
    if (!A || !ev) return;
    if (ev.births.length) {
      AN.Audio.play('appear');
      ev.births.slice(0, 3).forEach((c) => Ar.celebrate(c.uid));
      AN.HUD.toast(ev.births.length > 1 ? ev.births.length + ' naissances dans l’Archive.' : 'Naissance : ' + AN.Profile.displayName(ev.births[0]) + '.', 5);
    }
    ev.conflicts.slice(0, 2).forEach((t) => AN.HUD.toast(t, 5));
    (ev.civ || []).slice(0, 3).forEach((t) => AN.HUD.toast(t, 6));
    if ((ev.civ || []).length) Ar.rebuildSettlements();
    if (ev.hungry.size) AN.HUD.toast('Des créatures ont faim. Il manque : ' + [...ev.hungry].map((r) => D.RESOURCES[r].name).join(', ') + '.', 6);
    if (ev.levels.length) AN.HUD.toast(ev.levels.length > 1 ? ev.levels.length + ' créatures ont gagné un niveau.' : AN.Profile.displayName(ev.levels[0]) + ' passe au niveau ' + ev.levels[0].level + '.', 4);
    AN.HUD.refreshArchive(A);
  };

  /**
   * Canevas d'un territoire. De loin, une version légère ; de près, le terrain complet,
   * calculé au plus une fois par image et oublié quand il n'est plus regardé.
   */
  Ar.terrCanvas = function (t, far) {
    const key = t.uid + ':' + AN.Shapes.cellsOf(t).join(';');
    A.canvasesLo = A.canvasesLo || new Map();
    let lo = A.canvasesLo.get(key);
    if (!lo) { lo = AN.Terrain.renderTerritoryLo(t, H.R); A.canvasesLo.set(key, lo); }
    if (far) return lo;
    let c = A.canvases.get(key);
    if (!c && A.hiBudget > 0) {
      A.hiBudget--;
      c = AN.Terrain.renderTerritory(t, H.R, AN.Shapes.cellsOf(t).length > 1 ? 0.45 : 0.55);
      A.canvases.set(key, c);
    }
    if (c) { c.used = A.time; return c; }
    return lo;
  };
  function evictCanvases() {
    if (A.canvases.size <= 18) return;
    for (const [k, c] of A.canvases) if (A.time - (c.used || 0) > 4) A.canvases.delete(k);
  }

  /* ---------- intégration du butin ---------- */
  Ar.integrate = function (result) {
    result.territories.forEach((t) => {
      A.reveal.set(t.uid, 0);
      A.queue.push({ type: 'territory', t });
    });
    const newUids = new Set(result.creatures.map((c) => c.uid));
    A.creatures.forEach((e) => { if (newUids.has(e.uid)) { e.hiddenUntilIntegrated = true; } });
    if (result.creatures.length) A.queue.push({ type: 'creatures', uids: newUids });
    A.queue.push({ type: 'report', result });
    A.qT = 0.8;
  };

  function processQueue(dt) {
    if (!A.queue.length) { A.focus = null; return; }
    A.qT -= dt;
    const q = A.queue[0];
    if (q.type === 'territory') {
      const c = AN.Shapes.centroid(q.t);
      const rad = AN.Shapes.radius(q.t);
      A.focus = { x: c.x, y: c.y, zoom: U.clamp(0.55 * (H.R * 1.6) / rad, 0.12, 0.55) };
      if (A.qT <= 0 && !q.started) {
        q.started = true; q.t0 = A.time;
        AN.Audio.play('appear');
        FX.ring(c.x, c.y, AN.CYAN, 20, rad, 1.2, 4);
      }
      if (q.started) {
        const k = U.clamp((A.time - q.t0) / 1.6, 0, 1);
        A.reveal.set(q.t.uid, k);
        if (k >= 1) { A.reveal.delete(q.t.uid); A.queue.shift(); A.qT = 0.4; }
      }
    } else if (q.type === 'creatures') {
      const list = A.creatures.filter((e) => q.uids.has(e.uid));
      if (list.length) A.focus = { x: list[0].x, y: list[0].y, zoom: 0.8 };
      if (A.qT <= 0) {
        list.forEach((e, i) => setTimeout(() => {
          e.hiddenUntilIntegrated = false;
          FX.burst(e.x, e.y, e.pal.body, 24, 200, { size: 3 });
          FX.ring(e.x, e.y, AN.CYAN, e.r, e.r * 4, 0.6, 3);
          AN.Audio.play('capture_ok');
        }, i * 250));
        A.queue.shift();
        A.qT = 0.6 + list.length * 0.25;
      }
    } else if (q.type === 'report') {
      if (A.qT <= 0) {
        A.queue.shift();
        A.focus = null;
        AN.UI.report(q.result);
      }
    }
  }

  /* ---------- rang de l'Archive ---------- */
  Ar.checkRank = function (delayed) {
    const p = A.profile;
    const rk = AN.Profile.rank(p);
    const seen = p.flags.rankSeen || 0;
    if (rk.index > seen) {
      p.flags.rankSeen = rk.index;
      A.pendingRank = rk;
      if (!delayed) setTimeout(Ar.showPendingRank, 800);
      AN.Save.write(p);
    }
  };
  /** Annonce du nouveau rang, après le rapport d'expédition. */
  Ar.showPendingRank = function () {
    if (!A || !A.pendingRank) return;
    const rk = A.pendingRank;
    A.pendingRank = null;
    AN.Audio.play('rank');
    AN.UI.banner('L’Archive devient : ' + rk.def.name, rk.def.desc + (rk.next ? '' : ''));
    A.rankZoom = { t: 0 };
  };

  Ar.minZoom = () => {
    const rk = AN.Profile.rank(A.profile).index;
    return D.RANKS[rk].zoom;
  };
  Ar.scaleName = (z) => {
    const rk = AN.Profile.rank(A.profile).index;
    let name = D.SCALES[0].name;
    for (let i = 1; i < D.SCALES.length; i++) {
      if (D.SCALES[i].rank > rk) break;
      if (z <= D.SCALES[i].zoom * 1.0001) name = D.SCALES[i].name;
    }
    return name;
  };

  /** Une créature choisie suit le joueur dans l'Archive. */
  Ar.setFollower = function (uid) {
    if (!A) return;
    A.follow = uid;
    A.profile.flags.follow = uid || 0;
    const e = A.creatures.find((c) => c.uid === uid);
    if (e) AN.HUD.toast(AN.Profile.displayName(e.entry) + ' vous suit.', 3);
  };
  function followStep(e, dt) {
    const p = A.player;
    const back = Math.atan2(p.vy, p.vx) + Math.PI;
    const moving = Math.hypot(p.vx, p.vy) > 20;
    const tx = p.x + (moving ? Math.cos(back) : 0.7) * (e.r + 34), ty = p.y + (moving ? Math.sin(back) : 0.7) * (e.r + 34);
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    const s = Math.min(Math.max(e.speed * 1.4, d * 4), 1400);
    if (d > 8) { e.dvx = (dx / d) * s; e.dvy = (dy / d) * s; } else e.dvx = e.dvy = 0;
    const kk = 1 - Math.exp(-8 * dt);
    e.vx += (e.dvx - e.vx) * kk; e.vy += (e.dvy - e.vy) * kk;
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.anim += Math.hypot(e.vx, e.vy) * dt / Math.max(4, e.r * 0.9);
    if (Math.abs(e.vx) + Math.abs(e.vy) > 5) e.face += U.angDiff(e.face, Math.atan2(e.vy, e.vx)) * Math.min(1, dt * 8);
  }

  /** Errance paisible autour d'un foyer (créatures et habitants de l'Archive). */
  function wanderStep(e, dt, speedK) {
    e.wanderT -= dt;
    if (!e.wanderTo || e.wanderT <= 0) {
      const a = Math.random() * TAU, r = Math.random() * e.homeR;
      if (e.homeCells && Math.random() < 0.35) e.homeC = e.homeCells[Math.floor(Math.random() * e.homeCells.length)];
      e.wanderTo = { x: e.homeC.x + Math.cos(a) * r, y: e.homeC.y + Math.sin(a) * r };
      e.wanderT = 3 + Math.random() * 5;
      e.idle = Math.random() < 0.45 ? 1 + Math.random() * 3 : 0;
    }
    if (e.idle > 0) { e.idle -= dt; e.dvx = e.dvy = 0; }
    else {
      const dx = e.wanderTo.x - e.x, dy = e.wanderTo.y - e.y;
      const d = Math.hypot(dx, dy);
      const s = e.speed * speedK;
      if (d > 6) { e.dvx = (dx / d) * s; e.dvy = (dy / d) * s; } else { e.dvx = e.dvy = 0; }
    }
    const kk = 1 - Math.exp(-6 * dt);
    e.vx += (e.dvx - e.vx) * kk; e.vy += (e.dvy - e.vy) * kk;
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.anim += Math.hypot(e.vx, e.vy) * dt / Math.max(4, e.r * 0.9);
    if (Math.abs(e.vx) + Math.abs(e.vy) > 5) e.face += U.angDiff(e.face, Math.atan2(e.vy, e.vx)) * Math.min(1, dt * 6);
  }

  /* ---------- mise à jour ---------- */
  Ar.update = function (dt) {
    if (!A) return;
    A.time += dt;
    const p = A.player;
    const cam = A.cam;
    if (A.introT >= 0 && A.introT < 3) A.introT += dt;
    processQueue(dt);

    // déplacement
    const ax = I.axis();
    const sp = (A.mount ? 2.2 : 1) * 230 / Math.max(0.35, Math.sqrt(A.cam.zoom));
    if (A.mapMode && A.mapView) {
      // agencement : les touches de déplacement (ou le stick) font glisser la vue
      const v = 720 / A.mapView.zoom;
      A.mapView.x += ax.x * v * dt; A.mapView.y += ax.y * v * dt;
      p.dvx = p.dvy = 0;
    } else { p.dvx = ax.x * sp; p.dvy = ax.y * sp; }
    const k = 1 - Math.exp(-14 * dt);
    p.vx += (p.dvx - p.vx) * k; p.vy += (p.dvy - p.vy) * k;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (!A.mount) AN.Structures.collide(A.profile, p);
    p.anim += Math.hypot(p.vx, p.vy) * dt / 10;
    const m = AN.Game.mouseWorld();
    p.aim = Math.atan2(m.y - p.y, m.x - p.x);

    // dézoom à la molette
    if (I.wheel && !I.blocked) {
      if (A.mapMode && A.mapView) Ar.mapZoom(Math.pow(1.18, -I.wheel), I.mouse.x, I.mouse.y);
      else {
        // plus on s'éloigne, plus chaque cran de molette franchit de distance
        const step = A.zoom < 0.02 ? 1.5 : 1.15;
        A.zoom = U.clamp(A.zoom * Math.pow(step, -I.wheel), Ar.minZoom(), 1.6);
      }
    }
    if (I.hit('KeyV')) Ar.toggleMap();
    let tz = A.zoom, tx = p.x, ty = p.y;
    // aux grandes échelles, la caméra se recentre sur l'Archive elle-même
    const center = U.clamp((0.04 - A.zoom) / 0.03, 0, 1);
    tx *= 1 - center; ty *= 1 - center;
    if (A.focus) { tz = A.focus.zoom; tx = A.focus.x; ty = A.focus.y; }
    if (A.rankZoom) {
      A.rankZoom.t += dt;
      const kk = A.rankZoom.t;
      const zo = Ar.fitZoom();
      tz = kk < 3.5 ? zo : A.zoom;
      tx = kk < 3.5 ? 0 : tx; ty = kk < 3.5 ? 0 : ty;
      if (kk > 3.5) A.rankZoom = null;
    }
    if (A.mapMode && A.mapView) { tz = A.mapView.zoom; tx = A.mapView.x; ty = A.mapView.y; }
    if (A.slide) { A.slide.t += dt; if (A.slide.t >= A.slide.dur) A.slide = null; }
    const kc = 1 - Math.exp(-4 * dt);
    cam.zoom = Math.exp(U.lerp(Math.log(cam.zoom), Math.log(tz), kc));
    cam.x += (tx - cam.x) * kc;
    cam.y += (ty - cam.y) * kc;

    // créatures
    AN.Mount.archiveUpdate(A, dt);
    for (const e of A.creatures) {
      e.flash -= dt;
      if (e.ridden) continue;
      if (A.follow && A.follow === e.uid) { followStep(e, dt); continue; }
      wanderStep(e, dt, e.def.tier >= 3 ? 0.15 : 0.32);
    }
    for (const e of A.villagers || []) wanderStep(e, dt, 0.4);

    // la vie de l'Archive : une minute d'Archive par minute de jeu
    A.bondT -= dt;
    if (A.bondT <= 0) {
      A.bondT = 60;
      const ev = AN.Bonds.tick(A.profile, 1);
      A.profile.bondTick = Date.now();
      // collecteur : la production rejoint la réserve sans qu'on la ramasse
      const got = AN.Structures.tick(A, 1);
      if (got) { const pos = AN.Structures.positions(A.profile).find((o) => o.s.id === 'collecteur'); if (pos) FX.ring(pos.x, pos.y, AN.CYAN, 10, 90, 0.6, 3); AN.HUD.refreshArchive(A); }
      if (ev.births.length) Ar.rebuildCreatures();
      Ar.announce(ev);
    }
    // production et ramassage
    A.tickT -= dt;
    if (A.tickT <= 0) {
      A.tickT = 1;
      AN.Production.tick(A.profile, 1);
      A.profile.lastTick = Date.now();
      spawnPickups();
    }
    for (let i = A.pickups.length - 1; i >= 0; i--) {
      const it = A.pickups[i];
      it.t += dt;
      const d = U.dist(it.x, it.y, p.x, p.y);
      if (d < 110) {
        const a = Math.atan2(p.y - it.y, p.x - it.x);
        it.x += Math.cos(a) * 360 * dt; it.y += Math.sin(a) * 360 * dt;
      }
      if (d < 18) {
        AN.Profile.add(A.profile, it.res, it.n);
        FX.text(p.x, p.y - 24, '+' + it.n + ' ' + D.RESOURCES[it.res].name, AN.INK, { size: 12 });
        AN.Audio.play('pickup', { pitch: 1 + D.RESOURCES[it.res].rarity * 0.25 });
        A.pickups.splice(i, 1);
        AN.HUD.refreshArchive(A);
      }
    }

    // survol et interactions
    A.hover = null;
    if (!A.mapMode && A.cam.zoom < 0.08) AN.HUD.prompt(null);
    else if (!A.mapMode) {
      let best = null, bd = 1e9;
      for (const e of A.creatures) {
        if (e.hiddenUntilIntegrated) continue;
        const d = U.dist(e.x, e.y, p.x, p.y) - e.r;
        if (d < 34 && d < bd) { bd = d; best = e; }
      }
      const nearArtefact = U.dist(p.x, p.y, 0, 0) < 90 && A.artefactShown;
      let village = null;
      if (!best) for (const L of A.settle || []) { if (U.dist(L.x, L.y, p.x, p.y) < L.r * 0.85) { village = L; break; } }
      const building = !best && !nearArtefact ? AN.Structures.nearest(A.profile, p.x, p.y) : null;
      if (nearArtefact) AN.HUD.prompt({ text: 'Utiliser l’Artefact', key: 'E' });
      else if (best) AN.HUD.prompt({ text: 'Observer : ' + AN.Profile.displayName(best.entry), key: 'E' });
      else if (building) AN.HUD.prompt({ text: D.STRUCTURES[building.s.id].name + (building.s.level > 1 ? ' (niveau ' + building.s.level + ')' : ''), key: 'E' });
      else if (village) AN.HUD.prompt({ text: 'Parler à ' + D.PEOPLE[village.st.people].name + (village.st.request ? ' (une demande)' : ''), key: 'E' });
      else AN.HUD.prompt(null);
      if (I.hit('KeyE')) {
        if (nearArtefact) AN.UI.console();
        else if (best) AN.UI.creatureCard(best.entry);
        else if (building) AN.UI.structurePanel(building.s);
        else if (village) AN.UI.settlement(village.st);
      }
      if (I.hit('KeyR') && !AN.Mount.archiveToggle(A)) AN.HUD.toast('Approchez-vous d’une monture fidèle pour la chevaucher (R).');
    } else {
      AN.HUD.prompt(null);
      const mw = AN.Game.mouseWorld();
      A.hover = H.fromPx(mw.x, mw.y);
      mapInput();
    }
    if (I.hit('Escape')) { if (A.mapMode) Ar.toggleMap(); else AN.UI.pause(); }
    else if (I.hit('Tab')) AN.UI.console('collection');

    FX.update(dt);
    A.saveT -= dt;
    if (A.saveT <= 0) { A.saveT = 20; AN.Save.write(A.profile); }
    if (A.drone) A.drone.set(Math.min(1, A.profile.territories.length / 20));
    AN.HUD.updateArchive(A);
  };

  function spawnPickups() {
    const p = A.profile;
    const cells = p.territories.map((t) => { const cs = AN.Shapes.centers(t); return { key: t.uid, stock: t.stock, c: cs[Math.floor(Math.random() * cs.length)], r: H.R * 0.6 }; }).concat([{ key: 'center', stock: p.centerStock, c: { x: 0, y: 0 }, r: 240 }]);
    for (const cell of cells) {
      const here = A.pickups.filter((it) => it.cell === cell.key).length;
      if (here >= 8) continue;
      for (const res in cell.stock) {
        if (cell.stock[res] < 1) continue;
        const n = Math.min(3, Math.floor(cell.stock[res]));
        cell.stock[res] -= n;
        const a = Math.random() * TAU, r = (cell.key === 'center' ? 90 : 0) + Math.random() * cell.r;
        A.pickups.push({ cell: cell.key, res, n, x: cell.c.x + Math.cos(a) * r, y: cell.c.y + Math.sin(a) * r, t: 0 });
        break;
      }
    }
  }

  /** Remet les productions posées au sol dans les réserves de leur territoire. */
  Ar.returnPickups = function () {
    if (!A) return;
    const p = A.profile;
    const tmap = new Map(p.territories.map((t) => [t.uid, t]));
    A.pickups.forEach((it) => {
      const stock = it.cell === 'center' ? p.centerStock : (tmap.get(it.cell) || {}).stock;
      if (stock) stock[it.res] = (stock[it.res] || 0) + it.n;
    });
    A.pickups = [];
  };

  /* ---------- carte et agencement ---------- */
  /** Zoom qui montre toute l'Archive (free : sans la limite du rang, pour l'agencement). */
  Ar.fitZoom = function (free) {
    const p = A.profile;
    let maxD = 1;
    p.territories.forEach((t) => AN.Shapes.centers(t).forEach((c) => { maxD = Math.max(maxD, Math.hypot(c.x, c.y) + H.R * 1.4); }));
    const z = Math.min(A.cam.W, A.cam.H) / (maxD * 2.3);
    return U.clamp(z, free ? Math.min(Ar.minZoom(), z) : Ar.minZoom(), 0.6);
  };
  Ar.mapMinZoom = () => Math.min(Ar.minZoom(), Ar.fitZoom(true) * 0.7);
  /** Vue d'ensemble pour l'agencement : toute l'Archive, à gauche du panneau. */
  Ar.mapHome = function () {
    const p = A.profile, cam = A.cam;
    let x0 = -H.R, x1 = H.R, y0 = -H.R, y1 = H.R;
    p.territories.forEach((t) => AN.Shapes.centers(t).forEach((c) => {
      x0 = Math.min(x0, c.x - H.R); x1 = Math.max(x1, c.x + H.R); y0 = Math.min(y0, c.y - H.R); y1 = Math.max(y1, c.y + H.R);
    }));
    const panel = document.querySelector('.hud-arrange');
    const pw = panel && !panel.hidden && cam.W > 640 ? panel.offsetWidth + 20 : 0;
    const top = cam.H > 520 ? 70 : 20;
    const z = 0.92 * Math.min((cam.W - pw - 60) / (x1 - x0), (cam.H - top - 50) / (y1 - y0));
    const zoom = U.clamp(z, Math.min(Ar.minZoom(), z), 0.6);
    return { x: (x0 + x1) / 2 + pw / 2 / zoom, y: (y0 + y1) / 2 - (top - 50) / 2 / zoom, zoom };
  };
  /** Zoom de la vue d'agencement, en gardant immobile le point sous le pointeur. */
  Ar.mapZoom = function (f, sx, sy) {
    const V = A.mapView;
    if (!V) return;
    const cam = A.cam;
    const z0 = V.zoom, z1 = U.clamp(z0 * f, Ar.mapMinZoom(), 1.2);
    if (sx != null) {
      const wx = V.x + (sx - cam.W / 2) / z0, wy = V.y + (sy - cam.H / 2) / z0;
      V.x = wx - (sx - cam.W / 2) / z1; V.y = wy - (sy - cam.H / 2) / z1;
    }
    V.zoom = z1;
  };
  const arrangeOf = (p) => (p.arrange = p.arrange || { reshape: false, autoReshape: true });
  Ar.toggleMap = function () {
    A.mapMode = !A.mapMode;
    A.selected = null; A.drag = null; A.moldCache = null; A.variant = 0;
    if (A.mapMode) {
      A.prevZoom = A.zoom;
      A.focus = null;
      AN.HUD.arrange(A, true);
      A.mapView = Ar.mapHome();
      if (!A.mapHelpShown) {
        A.mapHelpShown = true;
        const touch = AN.Input.lastDevice === 'tactile';
        AN.HUD.toast(touch
          ? 'Agencement : touchez un territoire, puis sa nouvelle place. Glissez pour déplacer la vue. Les voisins créent des synergies.'
          : 'Agencement : choisissez un territoire, puis sa nouvelle place. Les voisins créent des synergies ; le panneau propose aussi un rangement automatique.', 7);
      }
    } else { A.zoom = A.prevZoom || 1; A.focus = null; A.mapView = null; AN.Save.write(A.profile); }
    AN.HUD.arrange(A, true);
    AN.HUD.updateArchive(A, true);
  };

  function mapInput() {
    const M = I.mouse, V = A.mapView;
    if (!V) return;
    // glisser déplace la vue ; un clic sans glisser saisit ou pose
    if (I.mouseHit(0)) A.drag = { sx: M.x, sy: M.y, vx: V.x, vy: V.y, moved: false };
    if (A.drag) {
      if (M.down[0] && !I.blocked) {
        const dx = M.x - A.drag.sx, dy = M.y - A.drag.sy;
        if (!A.drag.moved && Math.hypot(dx, dy) > 10) A.drag.moved = true;
        if (A.drag.moved) { V.x = A.drag.vx - dx / V.zoom; V.y = A.drag.vy - dy / V.zoom; A.cam.x = V.x; A.cam.y = V.y; }
      } else {
        if (!A.drag.moved && !I.blocked) Ar.mapClick(A.hover);
        A.drag = null;
      }
    }
    if (I.mouseHit(2) && A.selected) { A.selected = null; A.moldCache = null; AN.Audio.play('ui'); }
    if (I.hit('KeyR')) Ar.mapRotate();
    if (I.hit('KeyF')) Ar.toggleReshape();
    if (I.hit('KeyG')) Ar.autoDialog();
    if (I.hit('KeyQ') || I.hit('Backspace')) Ar.undo();
  }

  /** Forme adaptée pour le territoire saisi ? (un fragment n'a qu'une forme) */
  const molding = (sel) => !!(arrangeOf(A.profile).reshape && sel && AN.Shapes.cellsOf(sel).length > 1);

  /**
   * Emplacement visé pour le territoire saisi : { q, r, cells } (cells relatives),
   * avec fail si la forme adaptée ne trouve pas la place.
   */
  Ar.mapTarget = function () {
    if (!A.selected || !A.hover) return null;
    const p = A.profile;
    const sel = p.territories.find((x) => x.uid === A.selected);
    if (!sel) return null;
    if (molding(sel)) {
      const k = A.hover.q + ',' + A.hover.r + ':' + A.variant + ':' + (A.layoutV || 0);
      if (!A.moldCache || A.moldCache.k !== k) A.moldCache = { k, m: AN.Arrange.moldAt(p, sel, A.hover.q, A.hover.r, A.variant) };
      const m = A.moldCache.m;
      return m ? { q: m.q, r: m.r, cells: m.cells } : { q: A.hover.q, r: A.hover.r, cells: [[0, 0]], fail: true };
    }
    return { q: A.hover.q - A.grab[0], r: A.hover.r - A.grab[1], cells: A.selCells };
  };
  Ar.mapRotate = function () {
    if (!A.selected) return;
    const sel = A.profile.territories.find((x) => x.uid === A.selected);
    if (molding(sel)) { A.variant = (A.variant + 1) % 12; A.moldCache = null; }
    else {
      A.selCells = AN.Shapes.rotate(A.selCells);
      A.grab = AN.Shapes.rotate([A.grab])[0];
    }
    AN.Audio.play('ui');
  };
  Ar.mapClick = function (h) {
    if (!h) return;
    const p = A.profile;
    const S = AN.Shapes;
    const t = AN.Profile.territoryAt(p, h.q, h.r);
    if (!A.selected) {
      if (t) {
        A.selected = t.uid;
        A.grab = [h.q - t.q, h.r - t.r];
        A.selCells = S.cellsOf(t).map((c) => c.slice());
        A.variant = 0; A.moldCache = null;
        AN.Audio.play('ui');
        AN.HUD.arrange(A, true);
      }
      return;
    }
    const sel = p.territories.find((x) => x.uid === A.selected);
    if (!sel) { A.selected = null; return; }
    if (t && t.uid === sel.uid && h.q - sel.q === A.grab[0] && h.r - sel.r === A.grab[1] && S.cellsOf(sel).length === 1) { A.selected = null; AN.HUD.arrange(A, true); return; }
    const before = AN.Arrange.snapshot(p);
    // deux fragments s'échangent, comme avant
    if (t && t !== sel && S.cellsOf(t).length === 1 && S.cellsOf(sel).length === 1) {
      Ar.remember(before);
      const oq = sel.q, or = sel.r;
      sel.q = t.q; sel.r = t.r; t.q = oq; t.r = or;
    } else {
      const tgt = Ar.mapTarget();
      if (!tgt || tgt.fail) { AN.Audio.play('ui_err'); AN.HUD.toast(t && t !== sel ? 'Cette case est déjà prise.' : 'Pas assez de place libre ici pour ce territoire.'); return; }
      const res = S.canPlace(p, sel, tgt.q, tgt.r, tgt.cells);
      if (!res.ok) { AN.Audio.play('ui_err'); AN.HUD.toast(res.why); return; }
      Ar.remember(before);
      sel.q = tgt.q; sel.r = tgt.r; sel.cells = tgt.cells.map((c) => c.slice());
    }
    AN.Audio.play('ui_ok');
    A.selected = null;
    Ar.layoutChanged();
  };

  /** Mémorise la disposition actuelle (pour « Défaire »). */
  Ar.remember = function (snap) {
    A.history = A.history || [];
    A.history.push(snap || AN.Arrange.snapshot(A.profile));
    if (A.history.length > 30) A.history.shift();
  };
  Ar.undo = function () {
    const prev = A.history && A.history.pop();
    if (!prev) { AN.Audio.play('ui_err'); AN.HUD.toast('Rien à défaire.', 2); return; }
    const before = AN.Arrange.snapshot(A.profile);
    if (!AN.Arrange.restore(A.profile, prev)) { A.history = []; AN.HUD.toast('Rien à défaire : l’Archive a changé depuis.', 3); AN.HUD.arrange(A, true); return; }
    A.selected = null;
    AN.Audio.play('ui');
    Ar.layoutChanged(before);
  };
  /** Après un changement de disposition : glissement, créatures, villages, sauvegarde, panneau. */
  Ar.layoutChanged = function (before) {
    const p = A.profile;
    A.layoutV = (A.layoutV || 0) + 1;
    A.moldCache = null;
    if (before) {
      const old = new Map(before.map((o) => [o.uid, AN.Shapes.centroid(o)]));
      const from = new Map();
      p.territories.forEach((t) => {
        const o = old.get(t.uid);
        if (!o) return;
        const c = AN.Shapes.centroid(t);
        if (Math.abs(o.x - c.x) + Math.abs(o.y - c.y) > 1) from.set(t.uid, { dx: o.x - c.x, dy: o.y - c.y });
      });
      A.slide = from.size ? { t: 0, dur: AN.Prefs && AN.Prefs.reduceFx() ? 0.01 : 0.65, from } : null;
    }
    Ar.rebuildCreatures();
    Ar.rebuildSettlements();
    AN.Save.write(p);
    AN.HUD.arrange(A, true);
  };
  Ar.toggleReshape = function () {
    const ar = arrangeOf(A.profile);
    ar.reshape = !ar.reshape;
    A.moldCache = null; A.variant = 0;
    AN.Audio.play('ui');
    const L = AN.Input.label;
    AN.HUD.toast(ar.reshape
      ? 'Forme adaptée : un territoire déplacé prend la forme de sa nouvelle place (' + L('KeyR') + ' : une autre forme).'
      : 'Forme fixe : un territoire déplacé garde sa forme (' + L('KeyR') + ' : tourner).', 4);
    AN.Save.write(A.profile);
    AN.HUD.arrange(A, true);
  };
  /** Rangement automatique : on choisit les options, puis l'Archive se range (et se défait si besoin). */
  Ar.autoDialog = function () {
    const p = A.profile;
    if (!p.territories.length) { AN.HUD.toast('Il n’y a encore rien à ranger.', 3); return; }
    AN.UI.arrangeDialog(p, (reshape) => {
      AN.HUD.toast('Rangement de l’Archive…', 1.2);
      setTimeout(() => {
        if (!A || AN.Archive.state() !== A) return;
        const res = AN.Arrange.auto(p, { reshape });
        if (!res) return;
        const before = AN.Arrange.snapshot(p);
        Ar.remember(before);
        AN.Arrange.apply(p, res.layout);
        A.selected = null;
        Ar.layoutChanged(before);
        if (A.mapView) A.mapView = Ar.mapHome();
        AN.Audio.play('ui_ok');
        const b = res.before, a = res.after;
        const pct = (v) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + ' %';
        AN.HUD.toast('Archive rangée. Synergies : ' + b.pos + ' → ' + a.pos + ' ; néfastes : ' + b.neg + ' → ' + a.neg + ' ; production des territoires : ' + pct(b.prod) + ' → ' + pct(a.prod) + '. « Défaire » revient en arrière.', 9);
      }, 80);
    });
  };

  /** Bilan qu'aurait l'Archive si le territoire saisi était posé là (affiché sur le fantôme). */
  function drawPreview(ctx, sel, tgt, z) {
    const p = A.profile;
    const k = sel.uid + ':' + tgt.q + ',' + tgt.r + ':' + tgt.cells.join(';') + ':' + (A.layoutV || 0);
    if (!A.preview || A.preview.k !== k) {
      const lay = {};
      lay[sel.uid] = { q: tgt.q, r: tgt.r, cells: tgt.cells };
      if (!A.sumNow || A.sumNow.k !== (A.layoutV || 0) + ':' + p.territories.length) A.sumNow = { k: (A.layoutV || 0) + ':' + p.territories.length, v: AN.Arrange.summary(p) };
      A.preview = { k, v: AN.Arrange.summary(p, lay), now: A.sumNow.v };
    }
    const v = A.preview.v, n = A.preview.now;
    const d = Math.round((v.prod - n.prod) * 100);
    const col = d > 0 ? '#1f8a5a' : d < 0 ? AN.STAMP : AN.INK;
    const c = AN.Shapes.centroid({ q: tgt.q, r: tgt.r, cells: tgt.cells });
    const txt = '▲ ' + v.pos + '  ▼ ' + v.neg + '  ·  production ' + (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d) + ' pt';
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1 / z, 1 / z);
    ctx.font = '600 12.5px ' + AN.FONT_UI; ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width + 16;
    ctx.fillStyle = 'rgba(255,255,255,0.94)'; ctx.fillRect(-w / 2, -13, w, 24);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -13, w, 24);
    ctx.fillStyle = col; ctx.fillText(txt, 0, 4);
    ctx.restore();
  }

  /** Synergies vues sur la carte : une par paire de voisins, posée sur leur frontière. */
  function synergyView() {
    const p = A.profile;
    const k = (A.layoutV || 0) + ':' + p.territories.length;
    if (A.synView && A.synView.k === k) return A.synView;
    const pairs = new Map();
    AN.Profile.synergies(p).forEach((s) => {
      const pk = [s.a.uid, s.b.uid].sort().join('|');
      let e = pairs.get(pk);
      if (!e) pairs.set(pk, (e = { a: s.a, b: s.b, list: [], sum: 0, craft: false }));
      e.list.push(s.syn);
      e.sum += s.syn.mult || 0;
      if (s.syn.effect === 'craft') e.craft = true;
    });
    const list = [...pairs.values()];
    list.forEach((e) => {
      e.edges = AN.Shapes.contactEdges(e.a, e.b);
      e.good = e.sum > 0 || (e.sum === 0 && e.craft);
      const mid = e.edges[Math.floor(e.edges.length / 2)];
      e.at = mid ? AN.Shapes.edgeMid(mid) : AN.Shapes.centroid(e.a);
      e.label = e.list.map((s) => s.name + (s.mult ? ' ' + (s.mult > 0 ? '+' : '−') + Math.round(Math.abs(s.mult) * 100) + ' %' : '')).join(' · ');
    });
    A.synView = { k, list };
    return A.synView;
  }
  Ar.synergyView = () => synergyView();

  /* ---------- rendu ---------- */
  function drawSettlements(ctx, t, z) {
    const cam = A.cam;
    for (const L of A.settle || []) {
      if (!cam.visible(L.x, L.y, L.r + 80)) continue;
      const P = D.PEOPLE[L.st.people];
      if (z > 0.08) {
        L.buildings.forEach((b) => {
          if (b.tent) AN.Settlements.drawTent(ctx, b.x, b.y, 40, P);
          else AN.CivArt.drawBuilding(ctx, b.x, b.y, 54, P.style, P, 'house', b.variant, t, b.seed);
        });
      }
      if (L.st.request && z > 0.12) {
        const bob = Math.sin(t * 3) * 3;
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(L.x, L.y - 30 + bob, 11, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = AN.STAMP; ctx.font = '800 13px ' + AN.FONT_UI; ctx.textAlign = 'center'; ctx.fillText('!', L.x, L.y - 25 + bob);
      }
      if ((z < 0.42 && z > 0.05) || A.mapMode) {
        ctx.save(); ctx.translate(L.x, L.y + L.r * 0.4); ctx.scale(1 / z, 1 / z);
        ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(247,248,247,0.85)';
        const label = P.Name + ' · ' + L.st.n;
        ctx.strokeText(label, 0, 0); ctx.fillStyle = AN.INK; ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
    // arches emportées : des monuments près de l'Artefact
    AN.Structures.list(A.profile).forEach((s, i) => {
      if (s.kind !== 'arche') return;
      const P = D.PEOPLE[s.people];
      const pos = D.STRUCT_SLOTS[s.slot] || { x: 0, y: 200 };
      AN.CivArt.drawBuilding(ctx, pos.x, pos.y, 56, P.style, P, 'ark', 0, t, i + 1);
    });
  }

  function drawArtefact(ctx, t) {
    if (!A.artefactShown && A.introT <= 0) return;
    let k = 1;
    if (A.introT >= 0 && A.introT < 3) {
      k = U.easeOut(U.clamp(A.introT / 2.2, 0, 1));
      if (A.introT > 0.05 && !A.artefactShown) {
        A.artefactShown = true;
        FX.burst(0, 0, AN.INK, 60, 300, { size: 3 });
        FX.ring(0, 0, AN.CYAN, 10, 400, 1.6, 4);
      }
    }
    ctx.save();
    ctx.translate(0, Math.sin(t * 1.3) * 4 - 20);
    ctx.globalAlpha = k;
    ctx.fillStyle = 'rgba(28,34,48,0.12)';
    ctx.beginPath(); ctx.ellipse(0, 44, 30, 9, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 70);
    g.addColorStop(0, U.rgba(AN.CYAN, 0.25)); g.addColorStop(1, U.rgba(AN.CYAN, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 70, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate(t * (0.3 + i * 0.25) * (i % 2 ? -1 : 1) + i * 0.4);
      const s = (10 + i * 7) * k;
      ctx.strokeStyle = i === 0 ? AN.CYAN : U.rgba(AN.INK, 0.9 - i * 0.18);
      ctx.lineWidth = i === 0 ? 3 : 1.5;
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      ctx.restore();
    }
    ctx.fillStyle = AN.CYAN;
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawGrid(ctx, cam) {
    const z = cam.zoom;
    const v = cam.view(10);
    const levels = [64, 64 * 8, 64 * 64];
    for (const step of levels) {
      const px = step * z;
      if (px < 12 || px > 4000) continue;
      const a = U.clamp((px - 12) / 60, 0, 1) * 0.18;
      ctx.fillStyle = U.rgba(AN.INK, a);
      const x0 = Math.floor(v.x0 / step) * step, y0 = Math.floor(v.y0 / step) * step;
      const r = Math.max(1, 1.4 / z);
      for (let y = y0; y <= v.y1; y += step) for (let x = x0; x <= v.x1; x += step) ctx.fillRect(x - r / 2, y - r / 2, r, r);
    }
  }

  Ar.render = function (ctx) {
    if (!A) return;
    const cam = A.cam;
    const t = A.time;
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.fillStyle = AN.PAPER;
    ctx.fillRect(0, 0, cam.W, cam.H);
    cam.apply(ctx);
    drawGrid(ctx, cam);
    const z = cam.zoom;
    const p = A.profile;

    AN.Cosmos.drawPlanet(ctx, A, z, t);
    // courbure de l'Archive : visible seulement au rang Monde et à très grande échelle
    if (AN.Profile.rank(p).index >= 5 && z < 0.03 && (AN.Profile.rank(p).index === 5 || z > 0.008)) {
      const R = 60000;
      ctx.strokeStyle = U.rgba(AN.INK, U.clamp((0.03 - z) / 0.015, 0, 1) * 0.35);
      ctx.lineWidth = 2 / z;
      ctx.beginPath(); ctx.arc(0, R * 0.98, R, 0, TAU); ctx.stroke();
    }

    // territoires
    const syns = A.mapMode ? synergyView() : null;
    const S = AN.Shapes;
    A.hiBudget = 1;
    const far = z < 0.15;
    const hoverT = A.mapMode && A.hover ? AN.Profile.territoryAt(p, A.hover.q, A.hover.r) : null;
    const slideK = A.slide ? 1 - U.easeOut(U.clamp(A.slide.t / A.slide.dur, 0, 1)) : 0;
    for (const tr of p.territories) {
      if (z < 0.0012) break; // la mosaïque n'est plus qu'un point
      const sl = A.slide && A.slide.from.get(tr.uid);
      const ox = sl ? sl.dx * slideK : 0, oy = sl ? sl.dy * slideK : 0;
      const c0 = S.centroid(tr);
      const c = { x: c0.x + ox, y: c0.y + oy };
      const rad = S.radius(tr);
      if (!cam.visible(c.x, c.y, rad)) continue;
      const rev = A.reveal.has(tr.uid) ? A.reveal.get(tr.uid) : 1;
      if (rev <= 0) continue;
      const cv = Ar.terrCanvas(tr, far);
      const a = H.toPx(tr.q, tr.r);
      ctx.save();
      if (sl) ctx.translate(ox, oy);
      ctx.save();
      if (rev < 1) {
        ctx.beginPath();
        ctx.arc(c0.x, c0.y, rad * 1.1 * U.easeOut(rev), 0, TAU);
        ctx.clip();
      }
      ctx.fillStyle = 'rgba(28,34,48,0.10)';
      S.pathCells(ctx, tr, H.R, 6, 10);
      ctx.fill();
      ctx.drawImage(cv, a.x + cv.offX, a.y + cv.offY, cv.wpx, cv.hpx);
      ctx.restore();
      const selected = A.selected === tr.uid;
      const hovered = !selected && hoverT === tr;
      ctx.strokeStyle = selected || hovered ? AN.CYAN : U.rgba(AN.INK, tr.quality === 'fragment' ? 0.35 : 0.8);
      ctx.lineWidth = (selected ? 4 : hovered ? 3 : tr.quality === 'fragment' ? 1 : 2.4) / Math.max(0.25, z);
      if (tr.quality === 'fragment' && !hovered && !selected) ctx.setLineDash([10 / z, 8 / z]);
      S.strokeOutline(ctx, tr, H.R - 2);
      ctx.setLineDash([]);
      // en agençant, les noms s'effacent quand la mosaïque est trop petite pour les lire
      const named = A.mapMode ? selected || hovered || rad * z > (tr.quality === 'fragment' ? 70 : 60) : z < 0.42 && z > 0.05;
      if (named) {
        ctx.save();
        ctx.translate(c0.x, c0.y);
        ctx.scale(1 / z, 1 / z);
        ctx.textAlign = 'center';
        ctx.font = '400 ' + (tr.quality === 'fragment' ? 13 : 15) + 'px ' + AN.FONT_SERIF;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(247,248,247,0.85)';
        ctx.strokeText(D.BIOME[tr.biome].name, 0, 0);
        ctx.fillStyle = AN.INK;
        ctx.fillText(D.BIOME[tr.biome].name, 0, 0);
        ctx.font = '400 11px ' + AN.FONT_UI;
        const q = D.QUALITY_NAMES[tr.quality] || 'Territoire';
        ctx.strokeText(q + ' · ' + tr.world, 0, 16);
        ctx.fillStyle = U.rgba(AN.INK, 0.7);
        ctx.fillText(q + ' · ' + tr.world, 0, 16);
        ctx.restore();
      }
      ctx.restore();
    }
    evictCanvases();
    // synergies (mode agencement) : la frontière commune s'allume, un badge la résume
    if (syns) {
      const GOOD = '#1f8a5a';
      const focusT = A.selected ? p.territories.find((x) => x.uid === A.selected) : hoverT;
      if (!A.slide) {
        for (const e of syns.list) {
          ctx.strokeStyle = e.good ? GOOD : AN.STAMP;
          ctx.lineWidth = Math.max(7 / z, 24);
          ctx.lineCap = 'round';
          ctx.beginPath();
          e.edges.forEach(({ c, i }) => {
            const pp = H.toPx(c.q, c.r);
            const k = H.corners(pp.x, pp.y, H.R - 2);
            ctx.moveTo(k[i][0], k[i][1]);
            ctx.lineTo(k[(i + 1) % 6][0], k[(i + 1) % 6][1]);
          });
          ctx.stroke();
          ctx.lineCap = 'butt';
        }
        for (const e of syns.list) {
          const full = z > 0.2 || (focusT && (e.a === focusT || e.b === focusT));
          ctx.save(); ctx.translate(e.at.x, e.at.y); ctx.scale(1 / z, 1 / z);
          const col = e.good ? GOOD : AN.STAMP;
          if (full) {
            ctx.font = '600 12px ' + AN.FONT_UI; ctx.textAlign = 'center';
            const w = ctx.measureText(e.label).width + 12;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(-w / 2, -11, w, 20);
            ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -11, w, 20);
            ctx.fillStyle = col; ctx.fillText(e.label, 0, 4);
          } else {
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = col; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.fillStyle = col; ctx.font = '700 12px ' + AN.FONT_UI; ctx.textAlign = 'center';
            ctx.fillText(e.good ? '+' : '−', 0, 4);
          }
          ctx.restore();
        }
      }
      // case survolée, ou fantôme du territoire saisi
      const tgt = Ar.mapTarget();
      if (tgt) {
        const sel = p.territories.find((x) => x.uid === A.selected);
        const ok = sel && !tgt.fail && S.canPlace(p, sel, tgt.q, tgt.r, tgt.cells).ok;
        ctx.fillStyle = U.rgba(ok ? AN.CYAN : AN.STAMP, ok ? 0.16 : 0.12);
        S.pathCells(ctx, null, H.R - 6, 0, 0, tgt.q, tgt.r, tgt.cells);
        ctx.fill();
        ctx.strokeStyle = ok ? AN.CYAN : AN.STAMP;
        ctx.lineWidth = 3 / z;
        ctx.setLineDash([12 / z, 10 / z]);
        S.strokeOutline(ctx, null, H.R - 6, tgt.q, tgt.r, tgt.cells);
        ctx.setLineDash([]);
        if (ok) drawPreview(ctx, sel, tgt, z);
      } else if (A.hover) {
        const c = H.toPx(A.hover.q, A.hover.r);
        ctx.strokeStyle = U.rgba(AN.INK, 0.4);
        ctx.lineWidth = 3 / z;
        ctx.setLineDash([12 / z, 10 / z]);
        ctx.beginPath(); H.corners(c.x, c.y, H.R - 8).forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ramassages
    for (const it of A.pickups) {
      if (!cam.visible(it.x, it.y, 20)) continue;
      ctx.save(); ctx.translate(it.x, it.y + Math.sin(t * 3 + it.x) * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(0, 7, 6, 2.5, 0, 0, TAU); ctx.fill();
      AN.Icons.drawRes(ctx, it.res, 7, t);
      ctx.restore();
    }

    drawArtefact(ctx, t);
    drawSettlements(ctx, t, z);
    AN.Cosmos.drawGiants(ctx, A, z, t);

    const ents = A.creatures.filter((e) => !e.hiddenUntilIntegrated && cam.visible(e.x, e.y, e.r * 3));
    if (z > 0.12) for (const v of A.villagers || []) if (cam.visible(v.x, v.y, 30)) ents.push(v);
    if (z > 0.05) { const act = new Set(AN.Structures.active(p).map((s) => s.uid)); for (const b of AN.Structures.drawables(p)) { b.active = act.has(b.s.uid); ents.push(b); } }
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) {
      if (e.kind === 'struct') { AN.Structures.drawArchive(ctx, e, t, e.active); continue; }
      if (z < 0.12 && e.def.tier < 2) continue;
      AN.Art.draw(ctx, e, t, { glow: false });
      if (e.entry && e.entry.injured) {
        ctx.fillStyle = AN.STAMP; ctx.font = '600 10px ' + AN.FONT_UI; ctx.textAlign = 'center';
        ctx.fillText('blessé', e.x, e.y - e.r - 6);
      }
    }
    if (z > 0.2) {
      if (A.mount) AN.Art.drawPlayer(ctx, Object.assign({}, A.player, { y: A.player.y - A.mount.r * 0.42, r: 11 }), t, { weapon: false, mounted: true });
      else AN.Art.drawPlayer(ctx, A.player, t, { weapon: false });
    }
    else {
      ctx.fillStyle = AN.INK;
      ctx.beginPath(); ctx.arc(A.player.x, A.player.y, 3 / z, 0, TAU); ctx.fill();
    }
    FX.draw(ctx, cam);
    AN.Cosmos.drawLayers(ctx, A, t);
    AN.Cosmos.checkEpilogue(A);
  };

  Ar.exit = function () {
    if (A && A.drone) A.drone.stop();
  };

  Ar.scene = { name: 'archive', update: (dt) => Ar.update(dt), render: (ctx) => Ar.render(ctx) };
})();
