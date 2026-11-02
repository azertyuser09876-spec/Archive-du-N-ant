/* Le récit (1.14) : l'acte en cours, les fragments dans l'ordre, les silences,
   les lieux qui racontent, les chroniques des peuples ; la forme et la couleur de
   l'Artefact. Tout ce qui est retenu tient dans profile.story :
   { act : dernier acte annoncé, form : dernière forme montrée, courts : souverains
     qui ont parlé de celui d'avant, chronicles : peuples dont on a la chronique }. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const TAU = Math.PI * 2;

  const St = (AN.Story = {});
  St.state = (p) => (p.story = Object.assign({ act: 0, form: null, courts: {}, chronicles: [] }, p.story || {}));

  /* ======================= Actes ======================= */
  /** L'acte en cours, d'après le rang de l'Archive (1 à 4). */
  St.act = function (p) {
    const rk = AN.Profile.rank(p).index;
    let n = 1;
    D.ACTS.forEach((a) => { if (rk >= a.from) n = a.n; });
    return n;
  };
  St.actDef = (n) => D.ACTS[n - 1];
  /** Un acte commence : renvoie son ouverture (une seule fois). Une ancienne partie ne voit que l'acte où elle en est. */
  St.checkAct = function (p) {
    const s = St.state(p);
    const n = St.act(p);
    if (n <= s.act) return null;
    s.act = n;
    const a = St.actDef(n);
    return a.open ? a : null;
  };

  /* ======================= Fragments ======================= */
  const order = () => D.LORE.map((l, i) => ({ l, i })).sort((a, b) => a.l.act - b.l.act || a.i - b.i).map((o) => o.l);
  /** Le prochain fragment à lire dans une ruine : celui de l'acte en cours (ou d'avant) qu'on ne connaît pas encore. */
  St.nextFragment = function (p) {
    const act = St.act(p);
    return order().find((l) => !l.site && l.act <= act && !p.lore.includes(l.id)) || null;
  };
  /** Une ruine dont on a tout lu, à cet acte : quelques mots, et rien. */
  St.silence = (seed) => D.LORE_SILENCES[Math.abs(seed | 0) % D.LORE_SILENCES.length];
  St.learn = function (p, L) {
    if (L && !p.lore.includes(L.id)) p.lore.push(L.id);
    return L;
  };
  /** Les fragments de l'acte n déjà lus, et combien il y en a. */
  St.progress = (p, n) => { const all = D.LORE.filter((l) => l.act === n); return { read: all.filter((l) => p.lore.includes(l.id)), total: all.length }; };

  /* ======================= Chroniques des peuples ======================= */
  /** La chronique d'un peuple dont le monde vient de rejoindre l'Archive (une fois). */
  St.chronicle = function (p, people) {
    const s = St.state(p);
    const c = D.CHRONICLES[people];
    if (!c || s.chronicles.includes(people)) return null;
    s.chronicles.push(people);
    AN.Bonds.log(p, c.title + ' : elle est arrivée avec leur premier tribut.', 'civ');
    return c;
  };
  /** Un souverain parle de celui d'avant, à partir du troisième acte, la première fois. */
  St.courtLine = function (p, code, seed) {
    const s = St.state(p);
    if (St.act(p) < 3 || s.courts[code]) return null;
    s.courts[code] = 1;
    const L = D.NATION_LINES.origine;
    return L[Math.abs(seed | 0) % L.length];
  };

  /* ======================= Lieux qui racontent ======================= */
  /** Mondes qu'on a laissés derrière soi (détruits), ceux où des gens sont restés d'abord. */
  St.leftWorlds = function (p, n = 6) {
    const gone = (p.journal || []).filter((j) => j.outcome !== 'retour' && j.outcome !== 'ancre' && !j.place);
    const first = gone.filter((j) => j.abandoned > 0).concat(gone.filter((j) => !(j.abandoned > 0)));
    return [...new Set(first.map((j) => j.code))].slice(0, n);
  };
  /**
   * Le lieu qui raconte dans ce monde, s'il y en a un : celui de l'acte en cours.
   * Tirage à part (flux 'recit') : le monde lui-même ne change pas.
   */
  St.siteFor = function (world, p) {
    if (!world || world.tutorial || !world.zones || !world.zones.length) return null;
    const act = St.act(p);
    const kind = Object.keys(D.STORY_SITES).find((k) => D.STORY_SITES[k].act === act);
    if (!kind) return null;
    const S = D.STORY_SITES[kind];
    const frag = D.LORE.find((l) => l.site === kind);
    const known = frag && p.lore.includes(frag.id);
    let ch = S.chance * (known ? 0.4 : 1);
    if (S.pli) ch = world.scale === 'pli' ? (known ? 0.5 : 1) : ch * 0.6;
    const rng = AN.RNG.from(world.seed, 'recit');
    if (!rng.chance(ch)) return null;
    return { kind, zi: rng.int(0, world.zones.length - 1), x: null, y: null, read: false };
  };
  St.setup = function (X) {
    X.story = { site: St.siteFor(X.world, X.profile) };
  };
  /** À l'entrée de sa zone, le lieu prend place : loin des passages, de l'entrée et des villes. */
  St.onEnterZone = function (X) {
    const s = X.story && X.story.site;
    if (!s || s.zi !== X.zi || s.x != null) return;
    const zone = X.zone;
    if (zone.colMap) { X.story.site = null; return; } // un colosse-carte (1.16.3) : pas de sol où raconter
    const rng = AN.RNG.from(X.world.seed, 'recit-lieu' + X.zi);
    const W = zone.w * Z.T, H = zone.h * Z.T;
    const v = zone.village;
    const clear = (x, y) => {
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Z.tileAt(zone, x + dx * Z.T, y + dy * Z.T) !== Z.FLOOR) return false;
      return true;
    };
    for (let k = 0; k < 500; k++) {
      const x = rng.float(Z.T * 6, W - Z.T * 6), y = rng.float(Z.T * 6, H - Z.T * 6);
      if (!clear(x, y)) continue;
      if (v && U.dist(x, y, v.x, v.y) < v.r + 300) continue;
      if (zone.gates.some((g) => U.dist(x, y, g.x, g.y) < 300) || U.dist(x, y, zone.entry.x, zone.entry.y) < 400) continue;
      if (zone.arena && U.dist(x, y, zone.arena.x, zone.arena.y) < zone.arena.r + 80) continue;
      s.x = Math.round(x); s.y = Math.round(y);
      s.from = rng.float(0, TAU); // d'où viennent les pas
      return;
    }
    X.story.site = null; // pas de place dans cette zone : ce monde ne raconte rien
  };
  St.interactables = function (X, consider) {
    const s = X.story && X.story.site;
    if (!s || s.zi !== X.zi || s.x == null || X.collapse) return;
    const p = X.player;
    consider(U.dist(s.x, s.y, p.x, p.y), 80, () => ({ kind: 'story_site', target: s, text: 'Examiner : ' + D.STORY_SITES[s.kind].name.toLowerCase(), hold: 0.4 }));
  };
  /** Ce que dit le lieu (le cairn porte les noms des mondes qu'on a quittés). */
  St.siteText = function (p, kind) {
    const S = D.STORY_SITES[kind];
    if (kind !== 'cairn') return S.text;
    const codes = St.leftWorlds(p);
    return codes.length ? S.text.replace('{mondes}', codes.join(', ')) : S.textEmpty;
  };
  St.interact = function (X, it) {
    if (it.kind !== 'story_site') return false;
    const s = it.target;
    const p = X.profile;
    const first = !s.read;
    s.read = true;
    const frag = D.LORE.find((l) => l.site === s.kind && !p.lore.includes(l.id)) || null;
    St.learn(p, frag);
    AN.Save.write(p);
    AN.Audio.play(first ? 'appear' : 'ui_ok');
    AN.UI.storySite(D.STORY_SITES[s.kind], St.siteText(p, s.kind), frag);
    return true;
  };

  /* ---------- dessin des lieux ---------- */
  St.drawWorld = function (ctx, X, t) {
    const s = X.story && X.story.site;
    if (!s || s.zi !== X.zi || s.x == null || !X.cam.visible(s.x, s.y, 520)) return;
    ctx.save();
    DRAW[s.kind](ctx, X, s, t);
    ctx.restore();
  };
  const DRAW = {
    // des pas blancs qui viennent de loin, et le carré net où quelqu'un s'est posé
    empreintes(ctx, X, s, t) {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const d = 420 - i * 28;
        const side = i % 2 ? 1 : -1;
        const a = s.from;
        const x = s.x + Math.cos(a) * d + Math.cos(a + Math.PI / 2) * side * 7, y = s.y + Math.sin(a) * d + Math.sin(a + Math.PI / 2) * side * 7;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI);
        ctx.fillStyle = U.rgba('#f4f4f2', 0.3 + 0.45 * (i / n)); // des pas blancs : il venait du blanc
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.5, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(-7, 0, 3, 2.6, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.translate(s.x, s.y); ctx.rotate(0.3);
      ctx.fillStyle = '#fbfbfa'; ctx.fillRect(-34, -34, 68, 68);
      ctx.strokeStyle = U.rgba(AN.INK, 0.35); ctx.lineWidth = 1; ctx.strokeRect(-34, -34, 68, 68);
      if (!s.read) { ctx.strokeStyle = U.rgba(AN.INK, 0.15 + 0.1 * Math.sin(t * 2)); ctx.strokeRect(-40, -40, 80, 80); }
    },
    // des pierres empilées, gravées
    cairn(ctx, X, s, t) {
      ctx.translate(s.x, s.y);
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(0, 14, 38, 11, 0, 0, TAU); ctx.fill();
      const stones = [[-20, 6, 16, 10], [2, 8, 18, 11], [22, 7, 13, 9], [-10, -8, 15, 9], [12, -7, 14, 9], [0, -21, 12, 8], [1, -32, 8, 6]];
      stones.forEach(([x, y, rx, ry], i) => {
        ctx.fillStyle = ['#a9a69f', '#bdb9b1', '#9c9890', '#c4c0b8'][i % 4];
        ctx.strokeStyle = U.rgba(AN.INK, 0.5); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(x, y, rx, ry, (i % 3 - 1) * 0.15, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = U.rgba(AN.INK, 0.45); ctx.lineWidth = 1; // les noms gravés
        ctx.beginPath(); ctx.moveTo(x - rx * 0.5, y); ctx.lineTo(x + rx * 0.4, y); ctx.moveTo(x - rx * 0.3, y + 3); ctx.lineTo(x + rx * 0.2, y + 3); ctx.stroke();
      });
    },
    // un hexagone comme le vôtre, à moitié enfoui, et son Artefact éteint, tombé
    hexagone(ctx, X, s, t) {
      ctx.translate(s.x, s.y);
      ctx.save(); ctx.scale(1, 0.62); ctx.rotate(0.18);
      ctx.fillStyle = '#f2f2f0'; ctx.strokeStyle = U.rgba(AN.INK, 0.55); ctx.lineWidth = 2;
      AN.Base.hexPath(ctx, 0, 0, 96); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = U.rgba(AN.INK, 0.3); ctx.lineWidth = 1.2; // fêlures
      ctx.beginPath(); ctx.moveTo(-60, -20); ctx.lineTo(-20, 4); ctx.lineTo(10, -8); ctx.lineTo(48, 26); ctx.moveTo(-20, 4); ctx.lineTo(-30, 44); ctx.stroke();
      ctx.restore();
      // la terre recouvre une moitié
      const b = X.biome;
      ctx.fillStyle = U.rgba(b.ground[1], 0.92);
      ctx.beginPath(); ctx.moveTo(-110, 6); ctx.bezierCurveTo(-60, -10, -10, 30, 40, 18); ctx.bezierCurveTo(80, 10, 110, 30, 120, 70); ctx.lineTo(-110, 70); ctx.closePath(); ctx.fill();
      // l'Artefact éteint, couché
      ctx.save(); ctx.translate(-18, -18); ctx.rotate(1.2);
      AN.ArtefactArt.draw(ctx, 0, 0, 0, { form: 'cadre', color: '#8c8f96', dead: true, shadow: false, size: 0.8 });
      ctx.restore();
    },
    // la page : votre Archive, dessinée case par case, et un trait qui s'allonge
    page(ctx, X, s, t) {
      ctx.translate(s.x, s.y); ctx.rotate(-0.08);
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(-118, -82, 244, 170);
      ctx.fillStyle = '#fffefb'; ctx.fillRect(-124, -88, 244, 170);
      ctx.strokeStyle = U.rgba(AN.INK, 0.35); ctx.lineWidth = 1; ctx.strokeRect(-124, -88, 244, 170);
      // votre Archive, case par case : dessinée une fois, puis gardée (1.14)
      if (!s.map) {
        const cv = AN.Terrain.canvas(240, 168), c2 = cv.getContext('2d');
        const terr = X.profile.territories;
        let ext = 1;
        terr.forEach((tr) => { const c = AN.Shapes.centroid(tr); ext = Math.max(ext, Math.abs(c.x) + 60, Math.abs(c.y) + 60); });
        const k = Math.min(0.08, 62 / ext);
        c2.translate(120, 80);
        c2.strokeStyle = U.rgba(AN.INK, 0.7); c2.lineWidth = 0.8;
        c2.beginPath();
        terr.slice(0, 200).forEach((tr) => AN.Shapes.centers(tr).forEach((c) => {
          const R = Math.max(1.6, AN.Hex.R * k * 0.9), x = c.x * k, y = c.y * k;
          for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * TAU; i ? c2.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R) : c2.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R); }
        }));
        c2.stroke();
        AN.Base.hexPath(c2, 0, 0, Math.max(3, AN.Hex.R * k)); c2.stroke(); // l'hexagone de l'Artefact, toujours là
        s.map = cv;
      }
      ctx.drawImage(s.map, -122, -86);
      // le losange au centre, à l'encre
      ctx.fillStyle = AN.INK; ctx.beginPath(); ctx.moveTo(-2, -10); ctx.lineTo(2, -6); ctx.lineTo(-2, -2); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill();
      // le trait encore frais : il avance, s'arrête, reprend
      const w = 60 + ((t * 18) % 60);
      ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-90, 66); ctx.lineTo(-90 + w, 66 + Math.sin(w * 0.2) * 1.5); ctx.stroke();
    },
  };
  St.DRAW = DRAW;

  /* ======================= Artefact : forme et couleur ======================= */
  /** La forme de l'Artefact, d'après le rang (donc l'acte). */
  St.form = function (p) {
    const rk = AN.Profile.rank(p).index;
    let f = D.ARTEFACT_FORMS[0];
    D.ARTEFACT_FORMS.forEach((x) => { if (rk >= x.from) f = x; });
    return f;
  };
  /** Une nouvelle forme est apparue : { from, to } (une seule fois). Une ancienne partie voit une fois sa forme actuelle. */
  St.checkForm = function (p, commit = true) {
    const s = St.state(p);
    const f = St.form(p);
    if (s.form === f.id) return null;
    const from = s.form || (f.id === 'losange' ? null : 'losange');
    if (commit || !from) s.form = f.id; // commit = false : l'Archive la retient à la fin de la transformation
    return from ? { from, to: f.id, def: f } : null;
  };
  /** Le poids de vos choix : réputation, et à quel point elle est marquée (0 à 1). */
  St.mood = function (p) {
    const m = AN.Civ.moral(p);
    const rep = AN.Civ.reputation(p);
    const total = m.sauves + m.evades * 1.5 + m.abandonnes * 0.5 + m.contraints + m.massacres * 2 + m.pillages * 3 + m.adores;
    return { rep, strength: rep === 'inconnu' ? 0 : U.clamp(total / 60, 0.35, 1), terror: m.abandonnes * 0.5 + m.contraints + m.massacres * 2 + m.pillages * 3 };
  };
  /** Sa couleur : l'accent du jeu, glissant vers celle de votre réputation. */
  St.color = function (p) {
    const base = AN.CYAN || '#2346c8';
    if (!p) return base;
    const mo = St.mood(p);
    const T = D.ARTEFACT_TINTS[mo.rep];
    return T && T.color ? U.mix(base, T.color, mo.strength) : base;
  };
  /** Combien de fissures (troisième forme et après) : le prix payé se voit. */
  St.cracks = (p) => (p ? U.clamp(3 + Math.round(St.mood(p).terror / 12), 3, 9) : 4);
  /** Ce qu'il faut pour dessiner l'Artefact de cette partie. */
  St.look = (p) => ({ form: p ? St.form(p).id : 'losange', color: St.color(p), cracks: St.cracks(p) });
})();
