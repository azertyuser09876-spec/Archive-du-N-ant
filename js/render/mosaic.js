/* Mosaïque de l'Archive en miniature (1.8) : les territoires avec leurs vraies
   formes, dans la couleur de leur biome, autour de la case noire de
   l'Artefact. Sert de sceau à la console, aux emplacements de partie, au fond
   de l'écran titre, au rapport de retour et à la fin d'expédition. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const H = AN.Hex;

  const Mo = (AN.Mosaic = {});

  const colorOf = (t, k = 1) => {
    const B = D.BIOME[t.biome];
    return B && B.ground ? B.ground[Math.min(k, B.ground.length - 1)] : '#9aa0a8';
  };
  Mo.colorOf = colorOf;

  /** Boîte englobante (en pixels de l'Archive) d'une liste de territoires. */
  Mo.bounds = function (territories) {
    let x0 = -H.R, x1 = H.R, y0 = -H.R, y1 = H.R;
    territories.forEach((t) => AN.Shapes.centers(t).forEach((c) => {
      x0 = Math.min(x0, c.x - H.R); x1 = Math.max(x1, c.x + H.R);
      y0 = Math.min(y0, c.y - H.R); y1 = Math.max(y1, c.y + H.R);
    }));
    return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  };

  /**
   * Dessine la mosaïque dans ctx, déjà placé et mis à l'échelle par l'appelant
   * (unités : pixels de l'Archive). opts : { line, alpha, artefact, highlight (Set d'uid), only }
   */
  Mo.draw = function (ctx, territories, opts = {}) {
    const S = AN.Shapes;
    const sc = opts.scale || 1;
    territories.forEach((t) => {
      if (opts.only && !opts.only.has(t.uid)) return;
      const hi = opts.highlight && opts.highlight.has(t.uid);
      ctx.globalAlpha = (opts.alpha == null ? 1 : opts.alpha) * (opts.dim && !hi ? 0.45 : 1);
      ctx.fillStyle = colorOf(t, t.quality === 'fragment' ? 2 : 1);
      S.pathCells(ctx, t, H.R + 1);
      ctx.fill();
      if (opts.line !== false) {
        ctx.strokeStyle = hi ? AN.CYAN : U.rgba(AN.INK, opts.lineAlpha == null ? 0.85 : opts.lineAlpha);
        ctx.lineWidth = (hi ? 3 : opts.lineWidth || 1.2) / sc;
        S.strokeOutline(ctx, t, H.R);
      }
    });
    ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
    if (opts.artefact !== false) {
      ctx.fillStyle = opts.center || AN.INK;
      ctx.beginPath();
      H.corners(0, 0, H.R).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = AN.CYAN;
      const r = H.R * 0.32;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /** Canevas carré (ou w×h) de la mosaïque, cadré sur l'Archive. */
  Mo.canvas = function (territories, w, h = w, opts = {}) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    cv.className = 'mosaic' + (opts.cls ? ' ' + opts.cls : '');
    const ctx = cv.getContext('2d');
    const b = Mo.bounds(territories);
    const pad = opts.pad == null ? 0.08 : opts.pad;
    const sc = Math.min(w / (b.w * (1 + pad * 2)), h / (b.h * (1 + pad * 2))) * dpr;
    ctx.translate((w * dpr) / 2, (h * dpr) / 2);
    ctx.scale(sc, sc);
    ctx.translate(-b.cx, -b.cy);
    Mo.draw(ctx, territories, Object.assign({ scale: sc }, opts));
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', opts.label || 'Mosaïque de l’Archive : ' + territories.length + ' territoire' + (territories.length > 1 ? 's' : ''));
    return cv;
  };

  /** Forme d'un seul territoire, centrée (pour les listes et le rapport). */
  Mo.shape = function (t, size, opts = {}) {
    const one = { uid: t.uid, biome: t.biome, quality: t.quality, q: 0, r: 0, cells: AN.Shapes.cellsOf(t) };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.round(size * dpr);
    cv.style.width = cv.style.height = size + 'px';
    cv.className = 'shape-ico';
    const ctx = cv.getContext('2d');
    const S = AN.Shapes;
    const cs = S.centers(one);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    cs.forEach((c) => { x0 = Math.min(x0, c.x - H.R); x1 = Math.max(x1, c.x + H.R); y0 = Math.min(y0, c.y - H.R); y1 = Math.max(y1, c.y + H.R); });
    const sc = (size * dpr * 0.9) / Math.max(x1 - x0, y1 - y0);
    ctx.translate((size * dpr) / 2, (size * dpr) / 2);
    ctx.scale(sc, sc);
    ctx.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    Mo.draw(ctx, [one], { artefact: false, scale: sc, lineWidth: opts.lineWidth || 1.4 });
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', (D.QUALITY_NAMES[t.quality] || 'Territoire') + ', ' + AN.Shapes.cellsOf(t).length + ' case' + (AN.Shapes.cellsOf(t).length > 1 ? 's' : ''));
    return cv;
  };
})();
