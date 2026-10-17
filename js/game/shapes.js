/* Formes des territoires dans l'Archive. Un fragment occupe une seule case
   hexagonale ; un territoire, un cœur ou un continent en occupe plusieurs, et
   leur forme est tirée de la zone d'origine : on reporte ses parties ouvertes
   sur une grille hexagonale, puis on fait croître la forme vers elles. */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;
  const H = AN.Hex;
  const SQ3 = Math.sqrt(3);

  const S = (AN.Shapes = {});

  /** Nombre de cases selon ce qui a été ramené. */
  S.SIZE = { fragment: 1, territoire: 7, coeur: 12, continent: 16, cratere: 22 };
  S.sizeOf = (quality) => S.SIZE[quality] || 1;

  /** Cases relatives d'un territoire (la première est l'ancre, en [0, 0]). */
  S.cellsOf = (t) => (t.cells && t.cells.length ? t.cells : [[0, 0]]);
  S.abs = (t, q = t.q, r = t.r, cells = S.cellsOf(t)) => cells.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
  S.centers = (t) => S.abs(t).map((c) => H.toPx(c.q, c.r));
  S.centroid = (t) => {
    const cs = S.centers(t);
    return { x: cs.reduce((s, c) => s + c.x, 0) / cs.length, y: cs.reduce((s, c) => s + c.y, 0) / cs.length };
  };
  /** Rayon englobant (depuis le centroïde), pour la caméra et les animations. */
  S.radius = (t) => {
    const c = S.centroid(t);
    return S.centers(t).reduce((m, p) => Math.max(m, Math.hypot(p.x - c.x, p.y - c.y)), 0) + H.R;
  };

  /** Rotation de 60° d'une forme (coordonnées axiales). */
  S.rotate = (cells) => cells.map(([q, r]) => [-r, q + r]);

  /** Repère une case hexagonale de taille R depuis des pixels (même convention que AN.Hex). */
  function fromPx(x, y, R) {
    const q = ((SQ3 / 3) * x - (1 / 3) * y) / R;
    const r = ((2 / 3) * y) / R;
    return H.round(q, r);
  }

  /**
   * Forme tirée d'une zone : les parties ouvertes (sol, plaques) attirent la croissance.
   * focus : point de départ en pixels de la zone (par défaut, le centre).
   */
  S.fromZone = function (zone, n, seed, focus) {
    if (n <= 1) return [[0, 0]];
    const rng = AN.RNG.from(seed, 'forme');
    const Z = AN.ZoneGen;
    const T = zone.T, W = zone.w * T, Ht = zone.h * T;
    const R = Math.max(W, Ht) / (SQ3 * 7.5);
    const stat = new Map();
    for (let y = 2; y < zone.h - 2; y += 2) for (let x = 2; x < zone.w - 2; x += 2) {
      const g = zone.grid[y * zone.w + x];
      const c = fromPx(x * T + T / 2 - W / 2, y * T + T / 2 - Ht / 2, R);
      const k = H.key(c.q, c.r);
      let s = stat.get(k);
      if (!s) stat.set(k, (s = { q: c.q, r: c.r, open: 0, tot: 0 }));
      s.tot++;
      if (!Z.isSolid(g) && g !== Z.VOID) s.open++;
    }
    const f = focus ? fromPx(focus.x - W / 2, focus.y - Ht / 2, R) : { q: 0, r: 0 };
    return grow(n, rng, (q, r) => {
      const s = stat.get(H.key(q, r));
      return s && s.tot ? s.open / s.tot : 0.05;
    }, f);
  };

  /** Forme aléatoire compacte (quand la zone n'est pas connue). */
  S.blob = function (n, seed) {
    if (n <= 1) return [[0, 0]];
    const rng = AN.RNG.from(seed, 'forme');
    return grow(n, rng, () => 0.5, { q: 0, r: 0 });
  };

  function grow(n, rng, openness, start) {
    const inShape = new Map([[H.key(start.q, start.r), start]]);
    const order = [start];
    while (order.length < n) {
      let best = null, bs = -1e9;
      for (const c of order) {
        for (const nb of H.neighbors(c.q, c.r)) {
          const k = H.key(nb.q, nb.r);
          if (inShape.has(k)) continue;
          const touching = H.neighbors(nb.q, nb.r).filter((o) => inShape.has(H.key(o.q, o.r))).length;
          const score = openness(nb.q, nb.r) * 1.2 + touching * 0.22 + rng.float(0, 0.35);
          if (score > bs) { bs = score; best = nb; }
        }
      }
      inShape.set(H.key(best.q, best.r), best);
      order.push(best);
    }
    return order.map((c) => [c.q - start.q, c.r - start.r]);
  }

  /* ---------- placement dans l'Archive ---------- */
  /** Carte des cases occupées : clé → territoire. */
  S.occupancy = function (p, except) {
    const m = new Map();
    p.territories.forEach((t) => { if (t !== except) S.abs(t).forEach((c) => m.set(H.key(c.q, c.r), t)); });
    return m;
  };
  S.territoryAt = (p, q, r) => S.occupancy(p).get(H.key(q, r)) || null;

  /** Une forme peut-elle se poser ici ? Elle doit toucher l'Archive (le centre ou un territoire). */
  S.canPlace = function (p, t, q, r, cells, occ) {
    occ = occ || S.occupancy(p, t);
    const abs = cells.map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
    for (const c of abs) {
      if (c.q === 0 && c.r === 0) return { ok: false, why: 'Le centre appartient à l’Artefact.' };
      if (occ.has(H.key(c.q, c.r))) return { ok: false, why: 'Pas assez de place : un autre territoire occupe ces cases.' };
      if (H.dist({ q: 0, r: 0 }, c) > 40) return { ok: false, why: 'Trop loin du centre.' };
    }
    const own = new Set(abs.map((c) => H.key(c.q, c.r)));
    const touches = abs.some((c) => H.neighbors(c.q, c.r).some((nb) => (nb.q === 0 && nb.r === 0) || (!own.has(H.key(nb.q, nb.r)) && occ.has(H.key(nb.q, nb.r)))));
    if (!touches) return { ok: false, why: 'Un territoire doit toucher l’Archive.' };
    return { ok: true };
  };

  /** Meilleur emplacement libre pour une forme, le plus près du centre. */
  S.place = function (p, cells, prefer) {
    const occ = S.occupancy(p);
    const target = prefer ? H.toPx(prefer.q, prefer.r) : { x: 0, y: 0 };
    let best = null, bd = 1e18;
    const ring = H.spiral(30);
    for (const h of ring) {
      const c = H.toPx(h.q, h.r);
      const d = Math.hypot(c.x - target.x, c.y - target.y);
      if (d >= bd) continue;
      if (S.canPlace(p, null, h.q, h.r, cells, occ).ok) { bd = d; best = h; }
    }
    return best || { q: 30, r: 0 };
  };

  /** Territoires voisins (au moins une case en contact). */
  S.neighbors = function (p, t) {
    const occ = S.occupancy(p, t);
    const out = new Set();
    S.abs(t).forEach((c) => H.neighbors(c.q, c.r).forEach((nb) => { const o = occ.get(H.key(nb.q, nb.r)); if (o) out.add(o); }));
    return [...out];
  };

  /**
   * Pose de nouveau tous les territoires (migration des anciennes sauvegardes) :
   * les plus grands d'abord, chacun au plus près de son ancienne place.
   */
  S.relayout = function (p) {
    const list = p.territories.slice().sort((a, b) => S.cellsOf(b).length - S.cellsOf(a).length);
    const old = new Map(list.map((t) => [t.uid, { q: t.q, r: t.r }]));
    const placed = [];
    const keep = p.territories;
    p.territories = placed;
    list.forEach((t) => {
      const h = S.place(p, S.cellsOf(t), old.get(t.uid));
      t.q = h.q; t.r = h.r;
      placed.push(t);
    });
    p.territories = keep;
  };

  /** Côtés extérieurs d'une forme (pour tracer son contour). i : index de côté de AN.Hex.corners. */
  const EDGE_DIR = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  S.outline = function (t) {
    const abs = S.abs(t);
    const own = new Set(abs.map((c) => H.key(c.q, c.r)));
    const out = [];
    abs.forEach((c) => {
      for (let i = 0; i < 6; i++) {
        const d = EDGE_DIR[i];
        if (!own.has(H.key(c.q + d[0], c.r + d[1]))) out.push({ c, i });
      }
    });
    return out;
  };
  /** Côtés que deux territoires ont en commun (côtés de a, tournés vers b). */
  S.contactEdges = function (a, b) {
    const bs = new Set(S.abs(b).map((c) => H.key(c.q, c.r)));
    const out = [];
    S.abs(a).forEach((c) => {
      for (let i = 0; i < 6; i++) {
        const d = EDGE_DIR[i];
        if (bs.has(H.key(c.q + d[0], c.r + d[1]))) out.push({ c, i });
      }
    });
    return out;
  };
  /** Milieu d'un côté { c, i }, en pixels. */
  S.edgeMid = function (e, R = H.R) {
    const p = H.toPx(e.c.q, e.c.r);
    const k = H.corners(p.x, p.y, R);
    return { x: (k[e.i][0] + k[(e.i + 1) % 6][0]) / 2, y: (k[e.i][1] + k[(e.i + 1) % 6][1]) / 2 };
  };
  /** Trace le contour (côtés extérieurs) dans le contexte. */
  S.strokeOutline = function (ctx, t, R = H.R, q = t.q, r = t.r, cells = S.cellsOf(t)) {
    const fake = { q, r, cells };
    ctx.beginPath();
    S.outline(fake).forEach(({ c, i }) => {
      const p = H.toPx(c.q, c.r);
      const k = H.corners(p.x, p.y, R);
      ctx.moveTo(k[i][0], k[i][1]);
      ctx.lineTo(k[(i + 1) % 6][0], k[(i + 1) % 6][1]);
    });
    ctx.stroke();
  };
  /** Chemin rempli de toutes les cases (pour découper ou ombrer). */
  S.pathCells = function (ctx, t, R = H.R, dx = 0, dy = 0, q = t.q, r = t.r, cells = S.cellsOf(t)) {
    ctx.beginPath();
    cells.forEach(([cq, cr]) => {
      const p = H.toPx(q + cq, r + cr);
      H.corners(p.x + dx, p.y + dy, R).forEach((k, i) => (i ? ctx.lineTo(k[0], k[1]) : ctx.moveTo(k[0], k[1])));
      ctx.closePath();
    });
  };
})();
