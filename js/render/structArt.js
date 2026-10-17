/* Dessin procédural des structures : bâtiments de l'Archive et structures
   découvertes dans les mondes. Une forme par « art », paramétrée par la couleur
   de la structure. opts : ruined (envahie, dans son monde d'origine),
   ghost (écho d'un monde détruit), level (bâtiments améliorés). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const TAU = Math.PI * 2;
  const INK = '#1c2230';

  const SA = (AN.StructArt = {});

  function rect(ctx, x, y, w, h, fill, lw = 1.6) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h); }
  function circ(ctx, x, y, r, fill, lw = 1.6) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(); } }
  function poly(ctx, pts, fill, lw = 1.6) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (lw) { ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(); } }
  function line(ctx, x1, y1, x2, y2, c = INK, lw = 1.6) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function glow(ctx, x, y, r, color, a = 0.35) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, U.rgba(color, a)); g.addColorStop(1, U.rgba(color, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }

  /* Chaque forme dessine dans un carré d'environ [-1, 1] × [-1, 1] (unité s), sol vers y = +0.8. */
  const A = {};
  A.warehouse = (ctx, s, c, t, o) => {
    rect(ctx, -0.85 * s, -0.35 * s, 1.7 * s, 1.1 * s, '#efe8da');
    poly(ctx, [[-0.95 * s, -0.35 * s], [0, -0.95 * s], [0.95 * s, -0.35 * s]], c);
    rect(ctx, -0.28 * s, 0.15 * s, 0.56 * s, 0.6 * s, U.shade(c, -0.25));
    for (let k = 0; k < (o.level > 1 ? 3 : 2); k++) rect(ctx, (0.45 + (k % 2) * 0.22) * s, (0.42 - Math.floor(k / 2) * 0.22) * s, 0.2 * s, 0.2 * s, U.shade(c, 0.25), 1.2);
  };
  A.collector = (ctx, s, c, t, o) => {
    poly(ctx, [[-0.35 * s, 0.75 * s], [0.35 * s, 0.75 * s], [0.2 * s, -0.2 * s], [-0.2 * s, -0.2 * s]], '#efe8da');
    poly(ctx, [[-0.7 * s, -0.75 * s], [0.7 * s, -0.75 * s], [0.2 * s, -0.2 * s], [-0.2 * s, -0.2 * s]], U.shade(c, 0.3));
    glow(ctx, 0, -0.55 * s, 0.8 * s, c, 0.25);
    for (let k = 0; k < (o.level > 1 ? 5 : 3); k++) { const a = t * 1.6 + (k / (o.level > 1 ? 5 : 3)) * TAU; circ(ctx, Math.cos(a) * 0.62 * s, -0.55 * s + Math.sin(a) * 0.2 * s, 0.07 * s, c, 1); }
  };
  A.forge = (ctx, s, c, t, o) => {
    rect(ctx, -0.8 * s, -0.2 * s, 1.3 * s, 0.95 * s, '#d8cfc0');
    rect(ctx, 0.25 * s, -0.95 * s, 0.3 * s, 0.75 * s, '#9a8f80');
    for (let k = 0; k < 3; k++) { const ph = (t * 0.6 + k / 3) % 1; circ(ctx, 0.4 * s + Math.sin(ph * 6 + k) * 0.08 * s, -1 * s - ph * 0.7 * s, (0.08 + ph * 0.12) * s, U.rgba('#bfb8ac', 0.7 * (1 - ph)), 0); }
    glow(ctx, -0.3 * s, 0.4 * s, 0.6 * s, c, 0.5 + Math.sin(t * 5) * 0.1);
    rect(ctx, -0.55 * s, 0.2 * s, 0.5 * s, 0.4 * s, c);
    poly(ctx, [[0.6 * s, 0.45 * s], [1.0 * s, 0.45 * s], [0.95 * s, 0.6 * s], [0.65 * s, 0.6 * s]], '#4a4a52', 1.2);
  };
  A.nursery = (ctx, s, c, t, o) => {
    ctx.beginPath(); ctx.arc(0, 0.6 * s, 0.85 * s, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = U.rgba('#eaf6ff', 0.85); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    for (let k = -2; k <= 2; k++) line(ctx, k * 0.33 * s, 0.6 * s, k * 0.2 * s, -0.25 * s, U.rgba(INK, 0.35), 1);
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse((k - 1) * 0.3 * s, 0.45 * s, 0.12 * s, 0.16 * s, 0, 0, TAU); ctx.fillStyle = k === 1 ? c : '#fff3d0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); }
    glow(ctx, 0, 0.3 * s, 0.7 * s, c, 0.2);
  };
  A.infirmary = (ctx, s, c, t, o) => {
    poly(ctx, [[-0.9 * s, 0.75 * s], [0, -0.75 * s], [0.9 * s, 0.75 * s]], '#f7f6f0');
    poly(ctx, [[-0.25 * s, 0.75 * s], [0, 0.15 * s], [0.25 * s, 0.75 * s]], U.shade(c, -0.2), 1.2);
    // une feuille, pas une croix
    ctx.save(); ctx.translate(0, -0.2 * s); ctx.rotate(-0.6);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.18 * s, 0.09 * s, 0, 0, TAU); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  };
  A.tower = (ctx, s, c, t, o) => {
    poly(ctx, [[-0.35 * s, 0.8 * s], [0.35 * s, 0.8 * s], [0.22 * s, -0.55 * s], [-0.22 * s, -0.55 * s]], '#efe8da');
    for (let k = 0; k < 3; k++) line(ctx, -0.3 * s + k * 0.03 * s, (0.4 - k * 0.35) * s, 0.3 * s - k * 0.03 * s, (0.4 - k * 0.35) * s, U.rgba(INK, 0.4), 1);
    rect(ctx, -0.3 * s, -0.85 * s, 0.6 * s, 0.32 * s, '#ffffff');
    const a = t * 1.2;
    ctx.save(); ctx.globalAlpha *= 0.35; ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(0, -0.7 * s); ctx.arc(0, -0.7 * s, 2.2 * s * (o.level > 1 ? 1.3 : 1), a - 0.18, a + 0.18); ctx.closePath(); ctx.fill(); ctx.restore();
    glow(ctx, 0, -0.7 * s, 0.4 * s, c, 0.8);
  };
  A.shrine = (ctx, s, c, t, o) => {
    glow(ctx, 0, 0.2 * s, 0.9 * s, c, 0.25 + Math.sin(t * 2) * 0.05);
    const n = o.level > 1 ? 7 : 5;
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU - Math.PI / 2; const x = Math.cos(a) * 0.7 * s, y = 0.2 * s + Math.sin(a) * 0.4 * s; rect(ctx, x - 0.08 * s, y - 0.35 * s, 0.16 * s, 0.35 * s, '#cfc4a6', 1.2); }
    circ(ctx, 0, 0.2 * s, 0.16 * s, c, 1.2);
  };
  A.relay = (ctx, s, c, t, o) => {
    ctx.save(); ctx.translate(0, 0.05 * s);
    ctx.lineWidth = 0.22 * s; ctx.strokeStyle = INK; ctx.beginPath(); ctx.ellipse(0, 0, 0.6 * s, 0.8 * s, 0, 0, TAU); ctx.stroke();
    ctx.lineWidth = 0.14 * s; ctx.strokeStyle = '#efe8da'; ctx.stroke();
    ctx.fillStyle = U.rgba(c, 0.25 + Math.sin(t * 3) * 0.1); ctx.beginPath(); ctx.ellipse(0, 0, 0.48 * s, 0.68 * s, 0, 0, TAU); ctx.fill();
    for (let k = 0; k < 4; k++) { const a = t * 2 + k * Math.PI / 2; circ(ctx, Math.cos(a) * 0.3 * s, Math.sin(a) * 0.45 * s, 0.05 * s, c, 0); }
    ctx.restore();
  };
  // ---- structures découvertes ----
  A.well = (ctx, s, c, t, o) => {
    ctx.beginPath(); ctx.ellipse(0, 0.35 * s, 0.75 * s, 0.4 * s, 0, 0, TAU); ctx.fillStyle = '#b9ad98'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0.3 * s, 0.5 * s, 0.25 * s, 0, 0, TAU); ctx.fillStyle = '#1c2230'; ctx.fill();
    line(ctx, -0.6 * s, 0.3 * s, -0.6 * s, -0.7 * s, INK, 2); line(ctx, 0.6 * s, 0.3 * s, 0.6 * s, -0.7 * s, INK, 2);
    poly(ctx, [[-0.8 * s, -0.65 * s], [0, -1 * s], [0.8 * s, -0.65 * s]], c);
    glow(ctx, 0, 0.3 * s, 0.4 * s, '#7fb8ff', 0.3);
  };
  A.greenhouse = (ctx, s, c, t, o) => {
    ctx.beginPath(); ctx.arc(0, 0.7 * s, 0.85 * s, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = U.rgba(c, 0.55); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    for (let k = 0; k < 4; k++) { const x = (k - 1.5) * 0.35 * s; line(ctx, x, 0.7 * s, x * 0.7, 0.2 * s, '#3a6a2a', 2); circ(ctx, x * 0.7, 0.15 * s, 0.1 * s, '#5fbf6a', 1); }
    ctx.beginPath(); ctx.arc(0, 0.7 * s, 0.85 * s, Math.PI * 1.15, Math.PI * 1.4); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3; ctx.stroke();
  };
  A.oldforge = (ctx, s, c, t, o) => {
    poly(ctx, [[-0.8 * s, 0.75 * s], [-0.8 * s, -0.1 * s], [-0.3 * s, -0.3 * s], [0.1 * s, -0.05 * s], [0.6 * s, -0.2 * s], [0.75 * s, 0.75 * s]], '#a89c8c');
    rect(ctx, -0.5 * s, 0.2 * s, 0.45 * s, 0.35 * s, '#3a3430');
    if (!o.ruined) glow(ctx, -0.28 * s, 0.38 * s, 0.4 * s, '#ff641a', 0.4);
    poly(ctx, [[0.2 * s, 0.4 * s], [0.75 * s, 0.4 * s], [0.68 * s, 0.55 * s], [0.27 * s, 0.55 * s]], '#4a4a52', 1.2);
  };
  A.totem = (ctx, s, c, t, o) => {
    for (let k = 0; k < 3; k++) {
      const y = (0.45 - k * 0.5) * s;
      rect(ctx, -0.3 * s, y - 0.22 * s, 0.6 * s, 0.48 * s, k % 2 ? U.shade(c, 0.2) : c, 1.4);
      circ(ctx, -0.12 * s, y - 0.02 * s, 0.06 * s, '#fff3d0', 1); circ(ctx, 0.12 * s, y - 0.02 * s, 0.06 * s, '#fff3d0', 1);
      line(ctx, -0.12 * s, y + 0.14 * s, 0.12 * s, y + 0.14 * s, INK, 1.2);
    }
    poly(ctx, [[-0.6 * s, -0.75 * s], [0, -0.6 * s], [0.6 * s, -0.75 * s], [0, -0.95 * s]], U.shade(c, -0.15), 1.2);
  };
  A.observatory = (ctx, s, c, t, o) => {
    rect(ctx, -0.75 * s, 0, 1.5 * s, 0.75 * s, '#e0dbcf');
    ctx.beginPath(); ctx.arc(0, 0, 0.75 * s, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#f2efe6'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save(); ctx.translate(0, -0.3 * s); ctx.rotate(-0.7 + Math.sin(t * 0.3) * 0.1);
    rect(ctx, -0.08 * s, -0.75 * s, 0.16 * s, 0.75 * s, c, 1.2); ctx.restore();
    if (o.ruined) poly(ctx, [[0.2 * s, -0.7 * s], [0.5 * s, -0.5 * s], [0.35 * s, -0.3 * s]], '#7a7468', 1);
  };
  A.fountain = (ctx, s, c, t, o) => {
    ctx.beginPath(); ctx.ellipse(0, 0.5 * s, 0.85 * s, 0.32 * s, 0, 0, TAU); ctx.fillStyle = '#cfc4a6'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0.45 * s, 0.65 * s, 0.22 * s, 0, 0, TAU); ctx.fillStyle = U.rgba(c, 0.8); ctx.fill();
    rect(ctx, -0.1 * s, -0.5 * s, 0.2 * s, 0.95 * s, '#e0dbcf', 1.2);
    for (let k = 0; k < 6; k++) { const ph = (t * 1.2 + k / 6) % 1; const a = (k / 6) * TAU; circ(ctx, Math.cos(a) * ph * 0.5 * s, -0.5 * s + ph * ph * 0.95 * s, 0.05 * s, U.rgba(c, 1 - ph), 0); }
  };
  A.altar = (ctx, s, c, t, o) => {
    glow(ctx, 0, 0, 0.9 * s, '#9fb4ff', 0.2 + Math.sin(t * 2) * 0.08);
    rect(ctx, -0.55 * s, -0.7 * s, 0.5 * s, 1.45 * s, '#1c2230');
    rect(ctx, 0.05 * s, -0.55 * s, 0.5 * s, 1.3 * s, '#ffffff');
  };
  A.hive = (ctx, s, c, t, o) => {
    for (let k = 0; k < 4; k++) { const w = (0.85 - Math.abs(k - 1.2) * 0.18) * s; ctx.beginPath(); ctx.ellipse(0, (0.5 - k * 0.38) * s, w, 0.24 * s, 0, 0, TAU); ctx.fillStyle = k % 2 ? U.shade(c, 0.15) : c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke(); }
    circ(ctx, 0, 0.35 * s, 0.13 * s, '#2a1f10', 1);
    if (!o.ruined) for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2; circ(ctx, Math.cos(a) * 0.9 * s, -0.2 * s + Math.sin(a * 1.3) * 0.4 * s, 0.05 * s, '#ffd25a', 0.6); }
  };
  A.lighthouse = (ctx, s, c, t, o) => {
    ctx.save(); if (o.ruined) ctx.rotate(0.18);
    poly(ctx, [[-0.3 * s, 0.8 * s], [0.3 * s, 0.8 * s], [0.18 * s, -0.5 * s], [-0.18 * s, -0.5 * s]], '#f2efe6');
    for (let k = 0; k < 3; k++) { const y = (0.6 - k * 0.42) * s; poly(ctx, [[-0.29 * s + k * 0.04 * s, y], [0.29 * s - k * 0.04 * s, y], [0.27 * s - k * 0.04 * s, y - 0.18 * s], [-0.27 * s + k * 0.04 * s, y - 0.18 * s]], c, 1); }
    rect(ctx, -0.24 * s, -0.8 * s, 0.48 * s, 0.3 * s, '#fff8d8');
    ctx.restore();
    glow(ctx, 0, -0.65 * s, 0.5 * s, '#fff3a0', 0.6 + Math.sin(t * 2.5) * 0.2);
    if (o.ruined) for (let k = 0; k < 3; k++) circ(ctx, (k - 1) * 0.4 * s, 0.75 * s, 0.14 * s, '#ff9ad0', 1);
  };
  A.windmill = (ctx, s, c, t, o) => {
    poly(ctx, [[-0.35 * s, 0.8 * s], [0.35 * s, 0.8 * s], [0.2 * s, -0.4 * s], [-0.2 * s, -0.4 * s]], '#d8cfc0');
    ctx.save(); ctx.translate(0, -0.45 * s); ctx.rotate(t * (o.ruined ? 0.3 : 1.4));
    for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); poly(ctx, [[0.05 * s, 0], [0.9 * s, -0.08 * s], [0.9 * s, 0.14 * s], [0.1 * s, 0.1 * s]], '#f2efe6', 1.2); }
    circ(ctx, 0, 0, 0.09 * s, c, 1.2); ctx.restore();
    if (!o.ruined && Math.sin(t * 7) > 0.85) line(ctx, 0.5 * s, -0.9 * s, 0.35 * s, -0.55 * s, c, 2);
  };
  A.statue = (ctx, s, c, t, o) => {
    rect(ctx, -0.55 * s, 0.45 * s, 1.1 * s, 0.32 * s, '#b9ad98');
    poly(ctx, [[-0.45 * s, 0.45 * s], [-0.5 * s, -0.1 * s], [-0.2 * s, -0.35 * s], [0.25 * s, -0.4 * s], [0.6 * s, -0.15 * s], [0.45 * s, 0.45 * s]], c);
    circ(ctx, 0.55 * s, -0.35 * s, 0.2 * s, c, 1.4);
    line(ctx, 0.62 * s, -0.48 * s, 0.85 * s, -0.75 * s, INK, 2);
    if (o.ruined) line(ctx, -0.1 * s, -0.3 * s, 0.05 * s, 0.4 * s, U.rgba(INK, 0.6), 1);
  };
  A.clock = (ctx, s, c, t, o) => {
    rect(ctx, -0.35 * s, -0.4 * s, 0.7 * s, 1.15 * s, '#d8cfc0');
    poly(ctx, [[-0.45 * s, -0.4 * s], [0, -0.95 * s], [0.45 * s, -0.4 * s]], U.shade(c, -0.2));
    circ(ctx, 0, -0.05 * s, 0.27 * s, '#fff8e8', 1.4);
    const a = o.ruined ? 1.1 : t * 0.5;
    line(ctx, 0, -0.05 * s, Math.cos(a - Math.PI / 2) * 0.2 * s, -0.05 * s + Math.sin(a - Math.PI / 2) * 0.2 * s, INK, 1.6);
    line(ctx, 0, -0.05 * s, Math.cos(a * 12 - Math.PI / 2) * 0.13 * s, -0.05 * s + Math.sin(a * 12 - Math.PI / 2) * 0.13 * s, c, 1.6);
  };

  /** Dessine une structure centrée en (x, y), de rayon s. */
  SA.draw = function (ctx, id, x, y, s, t, opts = {}) {
    const def = D.STRUCTURES[id];
    if (!def) return;
    const fn = A[def.art] || A.warehouse;
    ctx.save();
    ctx.translate(x, y);
    if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
    // ombre
    ctx.fillStyle = 'rgba(10,12,20,0.18)';
    ctx.beginPath(); ctx.ellipse(s * 0.1, s * 0.8, s * 0.95, s * 0.28, 0, 0, TAU); ctx.fill();
    if (opts.ghost) { ctx.globalAlpha *= 0.55 + Math.sin(t * 3) * 0.1; }
    fn(ctx, s, def.color, t, opts);
    if (opts.ruined) {
      // la végétation et la poussière de son monde la recouvrent
      const b = opts.biome && D.BIOME[opts.biome];
      const col = b ? b.wall.top : '#6a8f3a';
      ctx.globalAlpha *= 0.85;
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + (opts.seed || 0); circ(ctx, Math.cos(a) * s * 0.75, s * 0.55 + Math.sin(a) * s * 0.2, s * 0.13, col, 0); }
    }
    if (opts.level > 1) {
      for (let k = 0; k < opts.level; k++) poly(ctx, [[(k - (opts.level - 1) / 2) * s * 0.22 - s * 0.07, -s * 1.08], [(k - (opts.level - 1) / 2) * s * 0.22, -s * 1.22], [(k - (opts.level - 1) / 2) * s * 0.22 + s * 0.07, -s * 1.08]], def.color, 1);
    }
    ctx.restore();
  };

  /** Petite image (pour les listes). */
  SA.icon = function (id, size = 32) {
    const cv = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = size * dpr;
    cv.style.width = cv.style.height = size + 'px';
    cv.className = 'struct-icon';
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    SA.draw(ctx, id, size / 2, size / 2 + size * 0.04, size * 0.38, 1.3, {});
    return cv;
  };
})();
