/* Ce qui arrive dans l'Archive (1.14) : des animations au retour d'expédition et
   dans la vie de l'Archive.
   - un peuple qui arrive à pied depuis l'Artefact et s'installe (ses maisons sortent de terre) ;
   - un astre, ou le monde d'une nation, qui prend place dans le ciel (la caméra recule
     jusqu'à sa couche, il arrive en spirale ; voir Cosmos.arrive) ;
   - une créature qui évolue, sous une colonne de lumière.
   Les deux premiers passent par la file d'intégration de l'Archive (archive.js). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const Av = (AN.Arrivals = {});

  /** Une ancienne partie : ses peuples sont déjà installés, ils n'arrivent pas une seconde fois. */
  Av.init = function (p) {
    if (p.flags.arrivals) return;
    p.flags.arrivals = 1;
    (p.settlements || []).forEach((st) => { st.walked = true; });
  };

  /** Les étapes à ajouter à la file d'intégration, après les créatures et avant le rapport. */
  Av.queueFor = function (p, result) {
    const out = [];
    const newcomers = (p.settlements || []).filter((st) => !st.walked);
    newcomers.forEach((st) => { st.walked = true; });
    if (newcomers.length) out.push({ type: 'settlers', uids: newcomers.map((st) => st.uid) });
    const ids = (result.astres || []).map((a) => a.uid);
    if (result.nation && result.nation.place) ids.push(result.nation.place);
    if (ids.length) out.push({ type: 'sky', ids, astres: result.astres || [], nation: result.nation || null });
    return out;
  };

  /* ======================= Un peuple arrive à pied ======================= */
  function startSettlers(A, q) {
    q.started = true;
    q.t0 = A.time;
    q.groups = q.uids.map((uid) => {
      const L = (A.settle || []).find((l) => l.st.uid === uid);
      if (!L) return null;
      const n = U.clamp(Math.ceil(L.st.n / 3), 3, 8);
      const walkers = [];
      for (let i = 0; i < n; i++) {
        const e = AN.Entities.creature(AN.Civ.def(L.st.people, 'villager'), (Math.random() - 0.5) * 50, 30 + Math.random() * 30, { team: 'archive' });
        const a = Math.random() * TAU, r = Math.random() * L.r * 0.5;
        e.goal = { x: L.x + Math.cos(a) * r, y: L.y + Math.sin(a) * r };
        e.delay = i * 0.3;
        e.pace = Math.max(80, Math.hypot(e.goal.x - e.x, e.goal.y - e.y) / 4.5) * (0.9 + Math.random() * 0.2); // environ 4,5 s de marche (1.14)
        walkers.push(e);
      }
      return { L, walkers, built: 0, bt: [], buildT: 0 };
    }).filter(Boolean);
    // ceux qui vivaient déjà là (reconstruits à l'entrée) attendent la fin de l'arrivée
    A.villagers = (A.villagers || []).filter((v) => !q.groups.some((g) => U.dist(v.homeC.x, v.homeC.y, g.L.x, g.L.y) < 5));
    A.arrival = q;
    FX.ring(0, 30, AN.CYAN, 10, 140, 0.8, 3);
    AN.Audio.play('portal');
  }
  /** Renvoie vrai quand le peuple est installé. */
  function settlersStep(A, q, dt) {
    if (!q.started) startSettlers(A, q);
    const g0 = q.groups[0];
    if (!g0) { A.arrival = null; return true; }
    const d = Math.hypot(g0.L.x, g0.L.y);
    A.focus = { x: g0.L.x * 0.55, y: g0.L.y * 0.55, zoom: U.clamp(Math.min(A.cam.W, A.cam.H) / (d * 1.5 + 420), 0.14, 0.8) };
    let all = true;
    for (const g of q.groups) {
      let any = false;
      for (const w of g.walkers) {
        if (A.time - q.t0 < w.delay) { all = false; continue; }
        w.out = true;
        const dx = w.goal.x - w.x, dy = w.goal.y - w.y, dd = Math.hypot(dx, dy);
        if (dd > 8) {
          w.vx = (dx / dd) * w.pace; w.vy = (dy / dd) * w.pace;
          w.x += w.vx * dt; w.y += w.vy * dt;
          w.face = Math.atan2(dy, dx);
          w.anim += dt * 6;
          all = false;
        } else { w.vx = w.vy = 0; w.arrived = true; any = true; }
      }
      // les maisons sortent de terre dès que les premiers arrivent (au plus tard après 4 s)
      if (any || g.walkers.some((w) => w.arrived) || A.time - q.t0 > 4) {
        g.buildT -= dt;
        if (g.built < g.L.buildings.length && g.buildT <= 0) {
          const b = g.L.buildings[g.built];
          g.bt[g.built] = A.time;
          g.built++;
          g.buildT = 0.45;
          FX.burst(b.x, b.y + 12, '#b8a888', 14, 120, { size: 3 });
          AN.Audio.play('craft');
        }
      }
      if (g.built < g.L.buildings.length) all = false;
    }
    if (all) { q.doneT = q.doneT || A.time; }
    if ((q.doneT && A.time - q.doneT > 1.2) || A.time - q.t0 > 10) {
      A.arrival = null;
      const P = D.PEOPLE[g0.L.st.people];
      AN.HUD.toast(P.Name + ' s’installent dans l’Archive.', 4);
      AN.Archive.rebuildSettlements();
      return true;
    }
    return false;
  }
  /** Combien de maisons d'un village sont déjà sorties de terre, et depuis quand (null : toutes). */
  Av.buildings = function (A, L) {
    const g = A.arrival && A.arrival.groups && A.arrival.groups.find((x) => x.L.st.uid === L.st.uid);
    return g ? { n: g.built, bt: g.bt } : null;
  };
  Av.walkers = (A) => (A.arrival && A.arrival.groups ? A.arrival.groups.flatMap((g) => g.walkers.filter((w) => w.out)) : []);

  /* ======================= Le ciel ======================= */
  const LAYER_ZOOM = { orbite: 0.004, systeme: 2.5e-4, galaxie: 1e-5, amas: 2.5e-7, toile: 2e-8 };
  /** Le zoom où l'on voit ce qui arrive : la couche de l'astre, ou celle de la nation. */
  Av.skyZoom = function (A, q) {
    const p = A.profile;
    if (q.astres.length) {
      const a = q.astres[0];
      return LAYER_ZOOM[a.layer || (D.ASTRES[a.biome] || {}).layer] || 0.004;
    }
    const n = q.nation && AN.Nations.entry(p, q.nation.place.slice(2));
    if (!n) return A.cam.zoom;
    const layer = AN.Cosmos.nationLayer(n.scale, AN.Profile.rank(p).index);
    if (layer > 0) return [0, 0.012, 0.004, 2.5e-4][layer];
    q.edge = true; // une région : elle flotte au bord de la mosaïque
    const N = AN.Cosmos.nationSpots(A);
    return U.clamp(Math.min(A.cam.W, A.cam.H) / (2.4 * (N.ext + 1150)), Math.min(AN.Archive.minZoom(), 0.3), 0.3);
  };
  function skyStep(A, q) {
    if (A.mapMode) AN.Archive.toggleMap(); // la caméra doit pouvoir reculer jusqu'au ciel
    if (!q.started) {
      q.started = true;
      q.ts = A.time;
      q.zoom = Av.skyZoom(A, q);
      A.skyAnim = { ids: new Set(q.ids), t0: Infinity, dur: 3.2 };
      A.natSpots = null; // la nouvelle nation prend sa place parmi les autres
      A.cosmo = null;
    }
    A.focus = { x: 0, y: 0, zoom: q.zoom };
    const S = A.skyAnim;
    if (S.t0 === Infinity && Math.abs(Math.log(A.cam.zoom / q.zoom)) < 0.25) {
      S.t0 = A.time + 0.3;
      AN.Audio.play('appear');
      const names = q.astres.map((a) => AN.Names.astre(a)).concat(q.nation ? [q.nation.name] : []);
      AN.HUD.toast(names.join(', ') + (names.length > 1 ? ' prennent' : ' prend') + (q.edge ? ' place au bord de l’Archive.' : ' place dans le ciel de l’Archive.'), 5);
    }
    if (A.time > S.t0 + S.dur + 1.4 || A.time - q.ts > 16) { A.skyAnim = null; return true; }
    return false;
  }

  /** Une étape de la file d'intégration ; vrai quand elle est finie. */
  Av.step = function (A, q, dt) {
    if (q.type === 'settlers') return settlersStep(A, q, dt);
    if (q.type === 'sky') return skyStep(A, q);
    return true;
  };

  /* ======================= Évolution ======================= */
  /** Une créature évolue : la caméra s'approche, une colonne de lumière, puis sa nouvelle taille. */
  Av.evolve = function (A, uid, text) {
    if (!A.creatures.some((c) => c.uid === uid)) { AN.Audio.play('rank'); if (text) AN.HUD.toast(text, 4); return; } // pas dans l'Archive en ce moment
    A.evo = { uid, t0: A.time, dur: 3.2, text, swapped: false };
  };
  Av.evoUpdate = function (A) {
    const ev = A.evo;
    const e = A.creatures.find((c) => c.uid === ev.uid);
    if (!e) { A.evo = null; return; }
    const k = (A.time - ev.t0) / ev.dur;
    A.focus = { x: e.x, y: e.y - 20, zoom: 1.1 };
    if (Math.random() < 0.6) FX.add({ kind: 'dot', x: e.x + (Math.random() - 0.5) * e.r * 3, y: e.y + e.r, vx: 0, vy: -90 - Math.random() * 90, color: Math.random() < 0.5 ? AN.CYAN : e.pal.accent, life: 1, size: 2.5, glow: true });
    if (k >= 0.55 && !ev.swapped) {
      ev.swapped = true;
      AN.Archive.rebuildCreatures(); // sa nouvelle taille
      const n = A.creatures.find((c) => c.uid === ev.uid);
      if (n) { n.flash = 0.35; FX.burst(n.x, n.y, n.pal.accent, 34, 240, { size: 3 }); FX.ring(n.x, n.y, AN.CYAN, n.r, n.r * 5, 0.9, 4); }
      A.cam.shake(4);
      AN.Audio.play('rank');
      if (ev.text) AN.HUD.toast(ev.text, 5);
    }
    if (k >= 1.2) { A.evo = null; A.focus = null; }
  };
  Av.drawWorld = function (ctx, A, t) {
    const ev = A.evo;
    if (!ev) return;
    const e = A.creatures.find((c) => c.uid === ev.uid);
    if (!e) return;
    const k = U.clamp((A.time - ev.t0) / ev.dur, 0, 1);
    const a = Math.sin(Math.PI * U.clamp(k / 0.9, 0, 1));
    const w = e.r * 2.2 + 16;
    const g = ctx.createLinearGradient(0, e.y - 420, 0, e.y + e.r);
    g.addColorStop(0, U.rgba(AN.CYAN, 0)); g.addColorStop(1, U.rgba(AN.CYAN, 0.35 * a));
    ctx.fillStyle = g; ctx.fillRect(e.x - w / 2, e.y - 420, w, 420 + e.r);
    // un anneau qui tourne à ses pieds
    ctx.save(); ctx.translate(e.x, e.y + e.r * 0.6); ctx.scale(1, 0.35);
    ctx.strokeStyle = U.rgba(AN.CYAN, 0.8 * a); ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -t * 60;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 1.6 + 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  };
})();
