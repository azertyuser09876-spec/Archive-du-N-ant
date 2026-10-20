/* Point d'entrée : canevas, boucle de jeu, scènes, transitions. */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;

  const G = (AN.Game = {
    canvas: null, ctx: null, cam: new AN.Camera(), scene: null, profile: null,
    paused: false, fade: 0, fadeDir: 0, fadeCb: null, fadeSpeed: 3, last: 0, playT: 0,
  });

  G.setScene = function (scene) {
    G.scene = scene;
  };

  G.mouseWorld = function () {
    return G.cam.screenToWorld(AN.Input.mouse.x, AN.Input.mouse.y);
  };

  /** Fondu au blanc, appel du rappel, puis retour. */
  G.transition = function (cb, dur = 0.35) {
    if (G.fadeDir) { cb(); return; }
    G.fadeDir = 1;
    G.fadeSpeed = 1 / Math.max(0.05, dur);
    G.fadeCb = cb;
  };

  G.begin = function (profile) {
    G.profile = profile;
    AN.Audio.configure(profile.settings);
    // Le Seuil interrompu ne compte pas : on le reproposera.
    AN.Tutorial.recover(profile);
    // Une expédition sauvegardée en cours de route : on propose de la reprendre.
    const pe0 = profile.pendingExpedition;
    if (pe0 && pe0.snap && pe0.snap.v === AN.Resume.VERSION && pe0.snap.world) {
      AN.UI.resumeChoice(profile, AN.Resume.describe(pe0.snap), () => {
        AN.Game.transition(() => {
          try { AN.Expedition.start(profile, pe0.snap.world, { snap: pe0.snap }); }
          catch (e) {
            // point de reprise illisible : on revient à l'Archive, comme avant
            console.warn('Reprise impossible :', e);
            AN.X = null; AN.HUD.hideExpedition(); G.abandonPending(profile); AN.Archive.enter({});
          }
        }, 0.5);
      }, () => { G.abandonPending(profile); AN.Archive.enter({}); });
      return;
    }
    G.abandonPending(profile);
    AN.Archive.enter({});
  };

  /** Une expédition interrompue et non reprise compte comme une extraction d'urgence sans butin. */
  G.abandonPending = function (profile) {
    if (profile.pendingExpedition) {
      const pe = profile.pendingExpedition;
      const L = pe.loadout || {};
      AN.Data.GEAR_SLOTS.forEach((s) => {
        const id = L[s];
        if (id && AN.Data.GEAR[id] && !AN.Data.GEAR[id].bound) profile.owned[id] = (profile.owned[id] || 0) + 1;
      });
      // les consommables rendus sont ceux qui restaient au dernier point de reprise
      const cons = pe.snap && Array.isArray(pe.snap.consumables) ? pe.snap.consumables : pe.consumables || [];
      cons.forEach((c) => { if (c.n > 0) profile.owned[c.id] = (profile.owned[c.id] || 0) + c.n; });
      profile.pendingExpedition = null;
      profile.destinations = null;
      profile.expeditions++;
      profile.stats.emergencies++;
      profile.journal.unshift({ code: pe.code, region: 'Expédition interrompue', biome: null, threat: 0, outcome: 'urgence', date: Date.now(), creatures: [], territories: 0, resources: 0 });
      AN.Save.write(profile);
      setTimeout(() => AN.HUD.toast('L’expédition vers ' + pe.code + ' a été abandonnée. L’Artefact vous a ramené, sans butin.', 6), 1200);
    }
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    G.canvas.width = Math.floor(W * dpr);
    G.canvas.height = Math.floor(H * dpr);
    G.canvas.style.width = W + 'px';
    G.canvas.style.height = H + 'px';
    G.cam.resize(W, H, dpr);
  }

  // horloge réelle (le banc d'essai des performances fige performance.now pendant une image)
  G.clock = () => (window.__realNow ? window.__realNow() : performance.now());
  function frame(now) {
    G.frameT0 = G.clock();
    requestAnimationFrame(frame);
    let dt = (now - G.last) / 1000;
    G.last = now;
    if (!(dt > 0)) dt = 0.016;
    dt = Math.min(dt, 0.05);
    try {
      if (G.fadeDir) {
        G.fade += G.fadeDir * dt * G.fadeSpeed;
        if (G.fadeDir > 0 && G.fade >= 1) {
          G.fade = 1;
          const cb = G.fadeCb; G.fadeCb = null;
          if (cb) cb();
          G.fadeDir = -1;
        } else if (G.fadeDir < 0 && G.fade <= 0) { G.fade = 0; G.fadeDir = 0; }
      }
      // manette et commandes tactiles : traduites en touches avant la mise à jour
      if (AN.Pad) AN.Pad.poll(dt);
      if (AN.Touch) AN.Touch.update(dt);
      if (G.scene && !G.paused) {
        G.scene.update(dt);
        if (G.profile) G.profile.stats.playTime += dt;
      }
      if (G.scene) {
        if (G.scene.name !== 'archive' || !G.paused) AN.FX.update(G.paused ? 0 : (G.scene.name === 'archive' ? 0 : dt));
        G.cam.update(G.paused ? 0 : dt);
        // l'oreille suit la caméra ; la musique s'efface un peu quand une fenêtre est ouverte
        AN.Audio.listener = { x: G.cam.x, y: G.cam.y, zoom: G.cam.zoom || 1, W: G.cam.W, H: G.cam.H };
        if (AN.Music) { const duck = !!(AN.UI.isOpen() && G.scene.name !== 'cinematic'); if (duck !== G.ducked) { G.ducked = duck; AN.Music.setDuck(duck); } }
        G.scene.render(G.ctx);
        drawReticle(G.ctx);
      } else {
        drawIdle(now / 1000);
      }
      if (G.fade > 0) {
        G.ctx.setTransform(G.cam.dpr, 0, 0, G.cam.dpr, 0, 0);
        G.ctx.fillStyle = U.rgba(AN.PAPER, G.fade);
        G.ctx.fillRect(0, 0, G.cam.W, G.cam.H);
      }
    } catch (err) {
      console.error(err);
      showError(err);
    }
    AN.Input.endFrame();
  }

  /** Réticule de visée (manette, tactile) et curseur libre de l'agencement. */
  function drawReticle(ctx) {
    const I = AN.Input;
    if (I.lastDevice !== 'manette' && I.lastDevice !== 'tactile') return;
    if (!(I.aimDir || I.cursorVisible) || AN.UI.isOpen()) return;
    const sc = G.scene && G.scene.name;
    if (sc !== 'expedition' && sc !== 'archive') return;
    if (sc === 'archive' && !I.cursorVisible) return;
    ctx.setTransform(G.cam.dpr, 0, 0, G.cam.dpr, 0, 0);
    ctx.strokeStyle = U.rgba(AN.CYAN, 0.85); ctx.lineWidth = 2;
    const x = I.mouse.x, y = I.mouse.y;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 15, y); ctx.moveTo(x, y - 15); ctx.lineTo(x, y - 5); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 15); ctx.stroke();
  }

  /**
   * Fond de l'écran titre : le blanc, quelques traces d'encre qui dérivent, et
   * l'Archive de la partie choisie qui tourne lentement, très pâle (1.8).
   */
  const idleDots = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.4, v: Math.random() * 0.01 + 0.002 }));
  let bgCur = null, bgPrev = null;
  function drawBackdrop(ctx, bg, a, t, W, H) {
    if (!bg || !bg.territories.length || a <= 0.001 || !AN.Mosaic) return;
    const b = AN.Mosaic.bounds(bg.territories);
    const sc = (Math.min(W, H) * 1.1) / Math.max(b.w, b.h, 2600);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(t * 0.01 + (bg.rot || 0));
    ctx.scale(sc, sc);
    ctx.translate(-b.cx, -b.cy);
    AN.Mosaic.draw(ctx, bg.territories, { scale: sc, alpha: 0.13 * a, lineAlpha: 0.6 });
    ctx.restore();
  }
  function drawIdle(t) {
    const ctx = G.ctx, W = G.cam.W, H = G.cam.H;
    ctx.setTransform(G.cam.dpr, 0, 0, G.cam.dpr, 0, 0);
    ctx.fillStyle = AN.PAPER;
    ctx.fillRect(0, 0, W, H);
    if (G.titleBg !== (bgCur && bgCur.src)) {
      bgPrev = bgCur ? Object.assign({}, bgCur, { out: performance.now() }) : null;
      bgCur = G.titleBg ? { src: G.titleBg, territories: G.titleBg.territories, t0: performance.now(), rot: (AN.hash(String(G.titleBg.territories.length)) % 628) / 100 } : null;
    }
    const fade = AN.Prefs && AN.Prefs.reduceFx() ? 1 : 0;
    if (bgPrev) { const k = 1 - Math.min(1, fade || (performance.now() - bgPrev.out) / 600); drawBackdrop(ctx, bgPrev, k * (bgPrev.a || 1), t, W, H); if (k <= 0) bgPrev = null; }
    if (bgCur) { bgCur.a = Math.min(1, fade || (performance.now() - bgCur.t0) / 900); drawBackdrop(ctx, bgCur, bgCur.a, t, W, H); }
    ctx.fillStyle = U.rgba(AN.INK, 0.25);
    for (const d of idleDots) {
      d.y -= d.v * 0.016;
      if (d.y < 0) d.y = 1;
      ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.s, 0, Math.PI * 2); ctx.fill();
    }
  }

  let errorShown = false;
  function showError(err) {
    if (errorShown) return;
    errorShown = true;
    const box = AN.h('div', { class: 'fatal' },
      AN.h('b', null, 'Une erreur est survenue.'),
      AN.h('p', null, String(err && err.message ? err.message : err)),
      AN.h('p', null, 'Votre dernière sauvegarde est intacte. Rechargez la page pour reprendre.'),
      AN.h('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, 'Recharger'));
    document.body.appendChild(box);
  }
  window.addEventListener('error', (e) => { if (e.error) showError(e.error); });

  // En quittant la page (ou en la mettant en arrière-plan sur mobile), on enregistre :
  // l'Archive, ou un point de reprise de l'expédition en cours.
  const saveNow = () => {
    if (!G.profile) return;
    if (AN.X) AN.Resume.checkpoint(AN.X);
    else { G.profile.lastTick = Date.now(); AN.Save.write(G.profile); }
  };
  window.addEventListener('beforeunload', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

  function boot() {
    G.canvas = document.getElementById('game');
    G.ctx = G.canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    AN.Input.init(G.canvas);
    AN.Prefs.applyUI();
    AN.HUD.init();
    // pause automatique quand la fenêtre perd le focus (onglet changé, appel sur mobile…)
    const autoPause = () => {
      if (!AN.Prefs.data.ui.autoPause || !G.profile || !G.scene || AN.UI.isOpen() || G.fadeDir) return;
      if (G.scene.name === 'expedition' || G.scene.name === 'archive') AN.UI.pause();
    };
    window.addEventListener('blur', autoPause);
    document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
    AN.Bus.on('layout', () => { if (AN.HUD.mode === 'archive' && AN.Archive.state()) AN.HUD.updateArchive(AN.Archive.state(), true); });
    requestAnimationFrame((t) => { G.last = t; requestAnimationFrame(frame); });
    if (AN.debug && /[?&]auto=1/.test(location.search)) {
      AN.Prefs.data.ui.autoPause = false; // tests automatiques : jamais de pause intempestive
      AN.Save.useSlot(1);
      const p = AN.Save.load() || AN.Save.newProfile(12345);
      p.flags.intro = 1;
      if (!/[?&]tuto=1/.test(location.search)) p.flags.tutorial = p.flags.tutorial || 'skipped';
      G.begin(p);
    } else AN.UI.title();
    if (AN.debug) installDebug();
    loadMods();
    // application installable et jouable hors ligne (seulement en ligne : https ou localhost)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !AN.debug) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker indisponible :', e));
    }
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); G.installPrompt = e; AN.Bus.emit('installable'); });
  }

  /**
   * Mod facultatif (1.8.1) : mods/triche.js ne fait pas partie du jeu publié (le
   * dossier mods est ignoré par Git). On ne le cherche qu'en local (fichier ouvert
   * depuis le disque, localhost) ou avec ?triche=1 dans l'adresse ; ?triche=0
   * l'empêche de se charger. Absent, il n'a aucun effet.
   */
  function loadMods() {
    const q = location.search;
    if (/[?&]triche=0/.test(q)) return;
    const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    if (!local && !/[?&]triche=1/.test(q)) return;
    const s = document.createElement('script');
    s.src = 'mods/triche.js';
    s.async = true;
    s.onerror = () => s.remove();
    document.head.appendChild(s);
  }

  const Z_T = () => AN.ZoneGen.T;
  const Exp_enter = (X, zi) => AN.Expedition.enterZone(X, zi, X.zi);
  const D_BIOMES = () => AN.Data.BIOMES;
  /** Outils de test, uniquement avec ?debug=1 dans l'adresse. */
  function installDebug() {
    AN.dbg = {
      give(n = 50) { Object.keys(AN.Data.RESOURCES).forEach((k) => AN.Profile.add(G.profile, k, n)); AN.Save.write(G.profile); AN.HUD.toast('Ressources ajoutées'); },
      god() { if (AN.X) AN.X.god = !AN.X.god; },
      go(i = 0) { const w = AN.Profile.destinations(G.profile)[i]; AN.UI.closeAll(); AN.Expedition.start(G.profile, w); },
      goBiome(id, threat = 2) {
        for (let s = 1; s < 5000; s++) {
          const w = AN.WorldGen.destination(AN.hash('dbg' + s), { threat, reliability: 1 });
          if (w.primary === id) { AN.UI.closeAll(); AN.Expedition.start(G.profile, w); return w.code; }
        }
        return null;
      },
      weaken() { if (!AN.X) return; AN.X.creatures.forEach((c) => { if (!c.isBoss) { c.hp = c.maxHp * 0.2; c.weak = true; } }); },
      tp(kind = 'arena') { const X = AN.X; if (!X) return; const t = kind === 'arena' ? X.zone.arena : kind === 'plate' ? X.zone.plates[0] : X.zone.gates[0]; X.player.x = t.x + 60; X.player.y = t.y + 60; AN.Physics.collide(X.zone, X.player); },
      boss() { const X = AN.X; if (!X) return; const b = X.creatures.find((c) => c.boss); if (b) { b.hp = 1; AN.Boss.onZero(X, b); } },
      conquerAll() { const X = AN.X; if (!X) return; for (let i = 0; i <= X.world.zones.length; i++) X.conquered.add(i); },
      /** Ajoute une créature à la collection (niveau et loyauté réglables). */
      add(species, o = {}) {
        const c = AN.Save.normalizeCreature(Object.assign({ uid: AN.Util.uid('c'), species, variant: 'commun', hueSeed: 1, foreign: null, nickname: null, injured: 0, home: AN.Profile.bestHome(G.profile, species), world: 'DEBUG', captured: Date.now(), level: 5, loyalty: 70 }, o));
        G.profile.collection.push(c);
        if (o.companion) G.profile.companions.push(c.uid);
        AN.Save.write(G.profile);
        if (AN.Archive.state()) AN.Archive.rebuildCreatures();
        return c;
      },
      time(minutes = 60) { const ev = AN.Bonds.tick(G.profile, minutes); if (AN.Archive.state()) { AN.Archive.rebuildCreatures(); AN.Archive.announce(ev); } return ev; },
      /** Monde habité (zone de départ) avec l'attitude demandée. */
      goCiv(attitude, threat = 2, people) {
        for (let s = 1; s < 20000; s++) {
          const w = AN.WorldGen.destination(AN.hash('civ' + s), { threat, reliability: 1, rep: AN.Civ.reputation(G.profile) });
          if (w.civ && w.civ.zone === 0 && (!attitude || w.civ.attitude === attitude) && (!people || w.civ.people === people)) { AN.UI.closeAll(); AN.Expedition.start(G.profile, w); return w.code + ' ' + w.civ.people + ' ' + w.civ.attitude; }
        }
        return null;
      },
      /** Expédition d'un échelon supérieur : 'monde', 'orbite', 'systeme', 'galaxie', 'amas', 'toile', 'pli'. */
      goScale(scale, k = 0) {
        const w = AN.WorldGen.destination(AN.hash('echelon' + scale + k), { scale, threat: 7, reliability: 1, rep: AN.Civ.reputation(G.profile) });
        AN.UI.closeAll(); AN.Expedition.start(G.profile, w);
        return w.code + ' ' + w.heart.guardian;
      },
      /** Ajoute n territoires comme s'ils revenaient d'expédition (qualités et biomes variés). */
      terr(n = 12, seed = 1) {
        const P = G.profile;
        const biomes = AN.Data.BIOMES.filter((b) => !b.space && !b.special && b.id !== 'seuil' && !b.scale).map((b) => b.id);
        const Q = ['fragment', 'territoire', 'fragment', 'fragment', 'coeur', 'territoire', 'fragment', 'territoire', 'fragment', 'continent', 'fragment', 'territoire'];
        const rng = AN.RNG.from(seed, 'dbg-terr');
        for (let i = 0; i < n; i++) {
          const quality = Q[(i + seed) % Q.length], biome = rng.pick(biomes), s = AN.hash('dbg' + seed + ':' + i);
          const pl = AN.Arrange.arrival(P, quality, biome, s);
          P.territories.push({ uid: AN.Util.uid('t'), biome, quality, q: pl.q, r: pl.r, cells: pl.cells, world: 'DBG-' + i, region: 'Debug', zoneName: 'Debug', seed: s, created: Date.now(), stock: {} });
        }
        AN.Save.write(P);
        if (AN.Archive.state()) { AN.Archive.rebuildCreatures(); AN.Archive.rebuildSettlements(); AN.Archive.checkRank(); }
        return P.territories.length;
      },
      /** Prépare un profil avancé : rang, ancrage et astres pour tester les échelles. */
      cosmic(rank = 8) {
        const P = G.profile;
        const add = (sp) => this.add(sp, { level: 5 });
        for (let i = P.territories.length; i < 26; i++) { const quality = i % 3 ? 'fragment' : 'territoire'; const s = AN.Arrange.arrival(P, quality, D_BIOMES()[i % 20].id, i + 1); const cells = s.cells; P.territories.push({ uid: AN.Util.uid('t'), biome: D_BIOMES()[i % 20].id, quality, q: s.q, r: s.r, cells, world: 'DEBUG', region: 'Debug', zoneName: 'Debug', seed: i + 1, created: Date.now(), stock: {} }); }
        ['reine_mycelienne', 'colosse_rouage', 'titan_givre', 'sylvarque', 'pyroclaste'].forEach(add);
        if (rank >= 6) add('atlas');
        if (rank >= 7) { add('baleine_orbitale'); ['mer_regolithe', 'anneau_glace'].forEach((b) => this.astre(b)); }
        if (rank >= 8) { add('astre_veilleur'); ['couronne_solaire', 'geante_gazeuse', 'ceinture_fer'].forEach((b) => this.astre(b)); }
        if (rank >= 9) add('myriade');
        if (rank >= 10) { add('berger_amas'); ['nebuleuse', 'galaxie_naine', 'pont_sombre'].forEach((b) => this.astre(b)); }
        if (rank >= 11) add('tisserand');
        P.artefact.ancrage = Math.min(AN.Data.UPGRADES.ancrage.levels.length - 1, Math.max(0, rank - 4));
        P.artefact.soute = 6; P.artefact.liens = 5; P.artefact.rayon = 5;
        P.destinations = null; P.destByScale = {};
        AN.Save.write(P);
        if (AN.Archive.state()) { AN.Archive.rebuildCreatures(); AN.Archive.rebuildSettlements(); AN.Archive.checkRank(); }
        return AN.Profile.rank(P).def.name;
      },
      astre(biome) {
        const P = G.profile; const A = AN.Data.ASTRES[biome];
        P.cosmos.astres.push({ uid: AN.Util.uid('a'), biome, kind: A.kind, name: A.name, layer: A.layer, world: 'DEBUG', zoneName: 'Debug', seed: 1, created: Date.now() });
        AN.Save.write(P);
        if (AN.Archive.state()) AN.Archive.rebuildCreatures();
        return P.cosmos.astres.length;
      },
      /** Monde tenu par un peuple (1.12) : échelon, peuple et humeur au choix. */
      goNation(scale = 'region', people, attitude, threat = 4) {
        for (let s = 1; s < 40000; s++) {
          const w = AN.WorldGen.destination(AN.hash('nation' + scale + s), { scale, threat, reliability: 1, rep: AN.Civ.reputation(G.profile) });
          if (!w.nation || (people && w.nation.people !== people) || (attitude && w.nation.attitude !== attitude)) continue;
          AN.UI.closeAll(); AN.Expedition.start(G.profile, w);
          return w.code + ' ' + w.nation.realm + ' ' + w.nation.attitude;
        }
        return null;
      },
      /** Faveur de la nation où l'on se trouve. */
      favor(v = 80) { const X = AN.X; if (!X || !X.nation) return null; X.nation.favor = v; return v; },
      /** Mission du gouverneur de la ville où l'on se trouve (1.13) : battue, livraison, defense, caravane, gardien. */
      mission(kind) { const X = AN.X; if (!X || !X.nation) return null; const m = AN.Nations.mission(X, X.zi, kind || 'battue'); return m && m.kind; },
      /** Raid de bêtes sur la ville où l'on se trouve (1.13). */
      cityRaid() { const X = AN.X; return !!(X && X.nation && AN.Nations.startRaid(X, false)); },
      /** Une nation ancrée de chaque taille (1.13), pour voir le ciel de l'Archive. */
      nationSky(scales = ['region', 'monde', 'orbite', 'systeme']) {
        const P = G.profile;
        scales.forEach((scale) => {
          for (let s = 1; s < 40000; s++) {
            const w = AN.WorldGen.destination(AN.hash('ciel' + scale + s), { scale, threat: 4, reliability: 1, rep: 'inconnu' });
            if (!w.nation || AN.Nations.entry(P, w.code)) continue;
            AN.Nations.list(P).push({ code: w.code, seed: w.seed, scale, threat: w.threat, people: w.nation.people, attitude: w.nation.attitude, mode: s % 2 ? 'allie' : 'vassal', favor: 60, since: Date.now(), tributeAt: Date.now(), primary: w.primary, region: w.region });
            break;
          }
        });
        AN.Save.write(P);
        return AN.Nations.list(P).map((n) => n.scale + ' ' + n.code);
      },
      /** Lieu ancré (1.10) : liste, ou départ vers le n-ième (sans passer par la Préparation). */
      place(n) {
        const L = AN.Places.list(G.profile);
        if (n == null) return L.map((x, i) => i + ' ' + x.id + ' ' + x.name + ' (' + x.scale + ')');
        const pl = L[n];
        if (!pl) return null;
        AN.UI.closeAll(); AN.Expedition.start(G.profile, AN.Places.world(G.profile, pl));
        return pl.name;
      },
      zoom(z) { const A = AN.Archive.state(); if (A) { A.zoom = z; A.cam.zoom = z; } },
      village() { const X = AN.X; if (!X || !X.zone.village) return false; const v = X.zone.village; X.player.x = v.x; X.player.y = v.y + Z_T(); AN.Physics.collide(X.zone, X.player); return true; },
      /** L'hexagone (1.9) : y aller, le submerger, lancer un assaut, ajouter un garde. */
      base() { const X = AN.X; if (!X || !X.base) return null; if (X.zi !== X.base.zi) Exp_enter(X, X.base.zi); X.player.x = X.base.x; X.player.y = X.base.y + 60; return X.base.state; },
      submerge() { const X = AN.X; if (X && X.base) AN.Base.damage(X, 1e9); return X && X.base && X.base.state; },
      raid() { const X = AN.X; if (X && X.base) AN.Base.raid(X); },
      guard(species, o = {}) { const c = this.add(species, o); AN.Base.of(G.profile).guards.push(c.uid); AN.Save.write(G.profile); if (AN.Archive.state()) AN.Archive.rebuildCreatures(); return c.uid; },
      vault() { const X = AN.X; if (!X) return null; const v = (X.zone.vaults || [])[0]; if (!v) return null; X.player.x = v.x + v.dir[0] * 60; X.player.y = v.y + v.dir[1] * 60; AN.Physics.collide(X.zone, X.player); return v.key; },
    };
    console.log('[AN] mode débogage : AN.dbg.give(), AN.dbg.go(0), AN.dbg.god(), AN.dbg.weaken(), AN.dbg.tp(), AN.dbg.boss()');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
