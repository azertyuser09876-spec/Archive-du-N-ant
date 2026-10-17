/* Formes des créatures des échelles supérieures : tortue-monde, astres vivants,
   comètes, nébuleuses, spirales ; et ornements des géants (continents sur le dos,
   cratères, lunes en orbite, traînée de flammes). Même repère que creatureArt.js. */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;
  const TAU = Math.PI * 2;
  const S = AN.Art.SHAPES;

  function circ(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.2, r), 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function ell(ctx, x, y, rx, ry, rot, fill, stroke, lw) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), rot || 0, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function eyes(ctx, x, n, spread, size, pal) {
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread;
      circ(ctx, x, y, size, pal.eye);
      circ(ctx, x + size * 0.3, y - size * 0.3, size * 0.32, 'rgba(255,255,255,0.8)');
    }
  }
  const seeded = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;

  /** Tortue-Monde : une carapace qui porte une ville. */
  S.turtle = (ctx, e, t, pal, A, r, lw) => {
    const step = Math.sin(e.anim * 1.2);
    for (const [fx, fy, ph] of [[0.55, -0.7, 0], [0.55, 0.7, Math.PI], [-0.55, -0.7, Math.PI], [-0.55, 0.7, 0]]) {
      const s = Math.sin(e.anim * 1.2 + ph) * 0.12;
      ell(ctx, r * (fx + s), r * fy, r * 0.28, r * 0.2, 0, U.shade(pal.body, -0.15), pal.dark, lw * 0.8);
    }
    ell(ctx, r * 1.02 + step * r * 0.03, 0, r * 0.32, r * 0.25, 0, U.shade(pal.body, -0.1), pal.dark, lw);
    eyes(ctx, r * 1.15, A.eyes || 2, r * 0.26, r * 0.05, pal);
    poly(ctx, [[-r * 0.95, 0], [-r * 1.2, -r * 0.1], [-r * 1.2, r * 0.1]], pal.dark);
    ell(ctx, 0, 0, r * 0.95, r * 0.82, 0, pal.body, pal.dark, lw);
    // écailles de la carapace
    ctx.strokeStyle = U.rgba(pal.dark, 0.6); ctx.lineWidth = lw * 0.6;
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.3); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.78); ctx.stroke(); }
    ell(ctx, 0, 0, r * 0.38, r * 0.32, 0, null, U.rgba(pal.dark, 0.6), lw * 0.6);
    if (A.city) {
      // la ville sur son dos
      for (let k = 0; k < 14; k++) {
        const a = seeded(k, 3) * TAU, d = Math.sqrt(seeded(k, 7)) * r * 0.62;
        const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.85, s = r * (0.07 + seeded(k, 11) * 0.06);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - s + s * 0.3, y - s + s * 0.4, s * 2, s * 2);
        ctx.fillStyle = k % 3 ? pal.accent : U.shade(pal.accent, -0.15); ctx.fillRect(x - s, y - s, s * 2, s * 2);
        ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.3; ctx.strokeRect(x - s, y - s, s * 2, s * 2);
      }
      circ(ctx, 0, 0, r * 0.1, '#ffffff', pal.dark, lw * 0.4);
      // petites lumières aux fenêtres
      for (let k = 0; k < 8; k++) { if (Math.sin(t * 2 + k * 3) > 0.3) circ(ctx, Math.cos(k * 2.1) * r * 0.45, Math.sin(k * 2.1) * r * 0.38, r * 0.018, '#ffe8a0'); }
    }
  };

  /** Astre vivant : un disque lumineux, une couronne de flammes, un œil. */
  S.star = (ctx, e, t, pal, A, r, lw) => {
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + t * 0.4;
      const len = r * (1.35 + Math.sin(t * 3 + k * 1.7) * 0.18);
      poly(ctx, [[Math.cos(a - 0.14) * r * 0.9, Math.sin(a - 0.14) * r * 0.9], [Math.cos(a) * len, Math.sin(a) * len], [Math.cos(a + 0.14) * r * 0.9, Math.sin(a + 0.14) * r * 0.9]], U.rgba(pal.accent, 0.85));
    }
    circ(ctx, 0, 0, r, pal.body, pal.dark, lw * 0.7);
    circ(ctx, -r * 0.25, -r * 0.25, r * 0.55, U.rgba(pal.accent, 0.5));
    // granulation
    for (let k = 0; k < 9; k++) circ(ctx, Math.cos(k * 2.4 + t * 0.2) * r * 0.6, Math.sin(k * 2.4 + t * 0.2) * r * 0.6, r * 0.09, U.rgba(pal.dark, 0.18));
    if (A.eyes) {
      const look = e.face || 0;
      const blink = Math.abs(Math.sin(t * 0.5 + e.seed)) > 0.97 ? 0.1 : 1;
      ell(ctx, Math.cos(look) * r * 0.2, Math.sin(look) * r * 0.2, r * 0.3, r * 0.3 * blink, 0, '#ffffff', pal.dark, lw * 0.5);
      ell(ctx, Math.cos(look) * r * 0.28, Math.sin(look) * r * 0.28, r * 0.12, r * 0.16 * blink, 0, pal.eye);
    }
  };

  /** Comète : une tête de glace et une longue chevelure. */
  S.comet = (ctx, e, t, pal, A, r, lw) => {
    for (let k = 0; k < 5; k++) {
      const w = r * (0.9 - k * 0.15), len = r * (2.2 + k * 0.5);
      const sw = Math.sin(t * 6 + k) * r * 0.08;
      poly(ctx, [[0, -w], [-len, sw - w * 0.2], [-len * 1.05, sw], [-len, sw + w * 0.2], [0, w]], U.rgba(k % 2 ? pal.accent : '#ffffff', 0.35 - k * 0.05));
    }
    circ(ctx, 0, 0, r * 0.75, pal.body, pal.dark, lw);
    circ(ctx, r * 0.2, -r * 0.2, r * 0.25, '#ffffff');
    eyes(ctx, r * 0.4, A.eyes || 1, r * 0.3, r * 0.12, pal);
  };

  /** Nébuleuse vivante : des volutes de gaz, des étoiles naissantes, des yeux. */
  S.nebula = (ctx, e, t, pal, A, r, lw) => {
    const n = 9;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + t * 0.15 * (k % 2 ? 1 : -1);
      const d = r * (0.45 + seeded(e.def.index, k) * 0.35);
      circ(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.45 + seeded(k, e.def.index) * 0.25), U.rgba(k % 3 ? pal.body : pal.accent, A.dark ? 0.75 : 0.42));
    }
    circ(ctx, 0, 0, r * 0.7, U.rgba(A.dark ? '#000000' : pal.body, A.dark ? 0.9 : 0.6));
    if (A.dark) {
      ctx.strokeStyle = U.rgba(pal.accent, 0.8); ctx.lineWidth = lw;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.72, t, t + TAU * 0.75); ctx.stroke();
    }
    const stars = A.stars ? 26 : 8;
    for (let k = 0; k < stars; k++) {
      const a = seeded(k, 5) * TAU + t * 0.1, d = Math.sqrt(seeded(k, 9)) * r * 1.05;
      const tw = 0.5 + Math.sin(t * 4 + k * 2.3) * 0.5;
      circ(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.02 + tw * 0.03), U.rgba(pal.accent, 0.5 + tw * 0.5));
    }
    const ne = A.eyes || 0;
    for (let i = 0; i < ne; i++) {
      const a = (i / Math.max(1, ne)) * TAU + t * 0.2;
      const d = ne > 1 ? r * 0.35 : 0;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      ell(ctx, x, y, r * 0.13, r * 0.09, 0, '#ffffff');
      circ(ctx, x + Math.cos(e.face || 0) * r * 0.04, y + Math.sin(e.face || 0) * r * 0.03, r * 0.05, pal.eye === '#ffffff' ? '#1c2230' : pal.eye);
    }
  };

  /** Spirale-mère : une galaxie qui tourne sur elle-même, un œil au centre. */
  S.spiral = (ctx, e, t, pal, A, r, lw) => {
    const arms = 4;
    for (let a = 0; a < arms; a++) {
      for (let k = 0; k < 26; k++) {
        const d = k / 26;
        const ang = (a / arms) * TAU + d * 4.2 + t * 0.35;
        const rr = r * (0.18 + d * 0.95);
        circ(ctx, Math.cos(ang) * rr, Math.sin(ang) * rr, r * (0.11 - d * 0.07), U.rgba(k % 4 ? pal.body : pal.accent, 0.75 - d * 0.45));
      }
    }
    circ(ctx, 0, 0, r * 0.32, pal.accent, pal.dark, lw * 0.6);
    circ(ctx, 0, 0, r * 0.16, '#ffffff');
    circ(ctx, Math.cos(e.face || 0) * r * 0.05, Math.sin(e.face || 0) * r * 0.05, r * 0.08, '#1c2230');
  };

  /* ---------- ornements des géants ---------- */
  const golem = S.golem;
  S.golem = (ctx, e, t, pal, A, r, lw) => {
    golem(ctx, e, t, pal, A, r, lw);
    if (A.continents) {
      // des continents miniatures sur les épaules d'Atlas
      for (let k = 0; k < 5; k++) {
        const a = seeded(k, 2) * TAU, d = r * (0.25 + seeded(k, 4) * 0.35);
        const pts = [];
        for (let j = 0; j < 7; j++) { const b = (j / 7) * TAU; const rr = r * (0.1 + seeded(k * 7 + j, 1) * 0.07); pts.push([Math.cos(a) * d + Math.cos(b) * rr, Math.sin(a) * d + Math.sin(b) * rr]); }
        poly(ctx, pts, ['#7aa65a', '#cdb58a', '#8cc6ea', '#9a8566', '#5f8a4a'][k], U.rgba(pal.dark, 0.6), lw * 0.4);
      }
    }
    if (A.craters) {
      for (let k = 0; k < 7; k++) {
        const a = seeded(k, 6) * TAU, d = r * seeded(k, 8) * 0.7;
        const s = r * (0.06 + seeded(k, 3) * 0.1);
        circ(ctx, Math.cos(a) * d, Math.sin(a) * d, s, U.rgba(pal.dark, 0.35));
        circ(ctx, Math.cos(a) * d - s * 0.2, Math.sin(a) * d - s * 0.2, s * 0.6, U.rgba(pal.light, 0.5));
      }
    }
  };
  const whale = S.whale;
  S.whale = (ctx, e, t, pal, A, r, lw) => {
    if (A.moons) {
      // les lunes favorites de la Baleine, en orbite autour d'elle
      for (let k = 0; k < 3; k++) {
        const a = t * (0.4 + k * 0.15) + k * 2.1;
        const x = Math.cos(a) * r * (1.3 + k * 0.18), y = Math.sin(a) * r * (0.8 + k * 0.1);
        circ(ctx, x, y, r * (0.1 - k * 0.02), ['#c8c2b8', '#e8e2d6', '#a8a29a'][k], pal.dark, lw * 0.4);
      }
    }
    whale(ctx, e, t, pal, A, r, lw);
  };
  const moth = S.moth;
  S.moth = (ctx, e, t, pal, A, r, lw) => {
    if (A.phoenix) {
      for (let k = 0; k < 7; k++) {
        const len = r * (1 + k * 0.25), w = r * (0.5 - k * 0.05);
        const sw = Math.sin(t * 5 + k) * r * 0.1;
        poly(ctx, [[-r * 0.4, -w], [-r * 0.4 - len, sw], [-r * 0.4, w]], U.rgba(k % 2 ? pal.accent : pal.body, 0.4 - k * 0.04));
      }
    }
    moth(ctx, e, t, pal, A, r, lw);
  };
})();
