/* Dessin procédural des créatures : chaque forme (art.shape) est une fonction
   réutilisée par plusieurs espèces, paramétrée par leurs couleurs et options.
   Repère local : la créature regarde vers +x, son rayon vaut e.r. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const TAU = Math.PI * 2;

  const Art = (AN.Art = {});

  /** Couleurs effectives d'une créature selon sa variante. */
  Art.palette = function (def, variantId, hueSeed = 0, foreignBiome = null) {
    const a = def.art;
    let body = a.body, accent = a.accent, eye = a.eye || AN.INK, glow = a.glow || null;
    const v = D.VARIANT[variantId] || D.VARIANT.commun;
    if (v.pale) {
      body = U.mix(body, '#ffffff', 0.72);
      accent = U.mix(U.tint(accent, 0, 0.3), '#ffffff', 0.4);
      eye = '#c8344c';
    } else if (v.hue) {
      const deg = 90 + (hueSeed % 180);
      body = U.tint(body, deg, 1.3, 0.04);
      accent = U.tint(accent, deg + 40, 1.4);
      if (glow) glow = U.tint(glow, deg, 1.2);
      else glow = accent;
    }
    if (foreignBiome && D.BIOME[foreignBiome]) {
      body = U.mix(body, D.BIOME[foreignBiome].accent, 0.22);
    }
    return { body, accent, eye, glow, dark: U.shade(body, -0.5), light: U.shade(body, 0.35), adark: U.shade(accent, -0.35) };
  };
  Art.FLASH = { body: '#ffffff', accent: '#ffffff', eye: '#ffffff', glow: null, dark: '#e8e8e8', light: '#ffffff', adark: '#ffffff' };

  /* ---------- primitives ---------- */
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
  function line(ctx, x1, y1, x2, y2, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  /** n yeux disposés en travers, centrés sur (x, 0). */
  function eyes(ctx, x, n, spread, size, pal) {
    if (!n) return;
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? 0 : (i / (n - 1) - 0.5) * spread;
      const xx = x - (n > 2 ? Math.abs(y) * 0.3 : 0);
      circ(ctx, xx, y, size, pal.eye);
      circ(ctx, xx + size * 0.3, y - size * 0.3, size * 0.32, 'rgba(255,255,255,0.8)');
    }
  }
  function seeded(i, k) { return ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1; }

  /* ---------- formes ---------- */
  const S = {};

  S.fungus = (ctx, e, t, pal, A, r, lw) => {
    const hop = 1 + 0.1 * Math.sin(e.anim * 2);
    if (A.crown) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + t * 0.2;
        poly(ctx, [[Math.cos(a - 0.12) * r * 0.95, Math.sin(a - 0.12) * r * 0.95], [Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3], [Math.cos(a + 0.12) * r * 0.95, Math.sin(a + 0.12) * r * 0.95]], pal.accent, pal.dark, lw * 0.6);
      }
    }
    ell(ctx, 0, 0, r * hop, r * (2 - hop) * 0.98, 0, pal.body, pal.dark, lw);
    circ(ctx, 0, 0, r * 0.62, pal.light);
    for (let i = 0; i < 7; i++) {
      const a = seeded(e.def.index, i) * TAU, d = r * (0.25 + seeded(e.def.index, i + 9) * 0.55);
      circ(ctx, Math.cos(a) * d, Math.sin(a) * d, r * (0.1 + seeded(i, 3) * 0.08), pal.accent);
    }
    eyes(ctx, r * 0.55, A.eyes, r * 0.6, r * 0.11, pal);
  };

  S.blob = (ctx, e, t, pal, A, r, lw) => {
    const sq = Math.sin(t * 4 + e.seed) * 0.07 + Math.sin(e.anim * 2) * 0.06;
    if (A.legs) {
      for (let i = 0; i < A.legs; i++) {
        const side = i % 2 ? 1 : -1;
        const sw = Math.sin(e.anim * 2 + i * Math.PI) * r * 0.3;
        ell(ctx, sw, side * r * 0.85, r * 0.3, r * 0.22, 0, pal.dark);
      }
    }
    ell(ctx, 0, 0, r * (1 + sq), r * (1 - sq), 0, pal.body, pal.dark, lw);
    ell(ctx, -r * 0.2, -r * 0.25, r * 0.45, r * 0.3, -0.4, U.rgba(pal.light, 0.7));
    if (A.pattern === 'spots') for (let i = 0; i < 5; i++) circ(ctx, (seeded(e.def.index, i) - 0.6) * r * 1.2, (seeded(i, e.def.index) - 0.5) * r * 1.3, r * 0.13, pal.accent);
    if (A.pattern === 'flakes') for (let i = 0; i < 4; i++) { const a = i * 1.7; line(ctx, Math.cos(a) * r * 0.2 - r * 0.2, Math.sin(a) * r * 0.5, Math.cos(a) * r * 0.5 - r * 0.2, Math.sin(a) * r * 0.75, pal.accent, lw * 0.7); }
    if (A.pattern === 'cracks') { ctx.strokeStyle = pal.adark; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(-r * 0.1, 0.1 * r); ctx.lineTo(r * 0.2, -r * 0.4); ctx.moveTo(-r * 0.1, 0.1 * r); ctx.lineTo(-r * 0.2, r * 0.6); ctx.stroke(); }
    eyes(ctx, r * 0.5, A.eyes, r * 0.55, r * 0.14, pal);
  };

  S.insect = (ctx, e, t, pal, A, r, lw) => {
    const legs = A.legs || 3;
    for (let i = 0; i < legs; i++) {
      const bx = r * (0.25 - i * 0.28);
      const sw = Math.sin(e.anim * 2.4 + i * 1.7) * 0.35;
      for (const side of [-1, 1]) {
        const a = side * (Math.PI / 2 + (i - (legs - 1) / 2) * 0.5 + sw * side);
        const kx = bx + Math.cos(a) * r * 0.7, ky = Math.sin(a) * r * 0.7;
        line(ctx, bx, 0, kx, ky, pal.dark, lw * 0.9);
        line(ctx, kx, ky, kx + Math.cos(a - side * 0.6) * r * 0.45, ky + Math.sin(a - side * 0.6) * r * 0.45, pal.dark, lw * 0.8);
      }
    }
    if (A.mantis) {
      for (const side of [-1, 1]) {
        const sw = Math.sin(t * 3 + side) * 0.15;
        poly(ctx, [[r * 0.35, side * r * 0.2], [r * 1.25, side * r * (0.55 + sw)], [r * 1.05, side * r * (0.3 + sw)], [r * 0.45, side * r * 0.05]], pal.accent, pal.dark, lw * 0.6);
      }
    }
    if (A.wings) {
      const flap = 0.6 + Math.abs(Math.sin(t * 28 + e.seed)) * 0.4;
      ctx.globalAlpha *= 0.55;
      for (const side of [-1, 1]) ell(ctx, -r * 0.1, side * r * 0.55 * flap, r * 0.6, r * 0.32 * flap, side * 0.5, '#ffffff', pal.dark, lw * 0.5);
      ctx.globalAlpha /= 0.55;
    }
    ell(ctx, -r * 0.55, 0, r * 0.62, r * 0.46, 0, pal.body, pal.dark, lw);
    if (A.pattern === 'stripes') for (let k = 0; k < 3; k++) { ctx.strokeStyle = pal.accent; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(-r * 0.55 + (k - 1) * r * 0.28, 0, r * 0.4, -1.1, 1.1); ctx.stroke(); }
    ell(ctx, 0, 0, r * 0.34, r * 0.3, 0, pal.body, pal.dark, lw);
    circ(ctx, r * 0.5, 0, r * 0.3, pal.body, pal.dark, lw);
    line(ctx, r * 0.7, -r * 0.1, r * 1.1, -r * 0.4 + Math.sin(t * 5) * r * 0.05, pal.dark, lw * 0.6);
    line(ctx, r * 0.7, r * 0.1, r * 1.1, r * 0.4 - Math.sin(t * 5) * r * 0.05, pal.dark, lw * 0.6);
    if (A.spikes) for (let k = 0; k < A.spikes; k++) poly(ctx, [[-r * (0.3 + k * 0.3), -r * 0.35], [-r * (0.45 + k * 0.3), -r * 0.75], [-r * (0.6 + k * 0.3), -r * 0.35]], pal.accent);
    if (A.crown) for (let k = -2; k <= 2; k++) poly(ctx, [[r * 0.4, k * r * 0.1], [r * 0.25, k * r * 0.16 - r * 0.32], [r * 0.6, k * r * 0.12]], pal.accent, pal.dark, lw * 0.5);
    eyes(ctx, r * 0.62, A.eyes, r * 0.34, r * 0.09, pal);
  };

  S.moth = (ctx, e, t, pal, A, r, lw) => {
    const flap = 0.55 + Math.abs(Math.sin(t * 14 + e.seed)) * 0.45;
    for (const side of [-1, 1]) {
      ell(ctx, r * 0.05, side * r * 0.75 * flap, r * 0.7, r * 0.6 * flap, side * 0.3, U.rgba(pal.body, 0.85), pal.dark, lw * 0.6);
      ell(ctx, -r * 0.55, side * r * 0.5 * flap, r * 0.45, r * 0.38 * flap, -side * 0.4, U.rgba(pal.accent, 0.85), pal.dark, lw * 0.5);
      circ(ctx, r * 0.1, side * r * 0.8 * flap, r * 0.18, pal.accent);
    }
    ell(ctx, -r * 0.1, 0, r * 0.65, r * 0.2, 0, pal.dark);
    circ(ctx, r * 0.45, 0, r * 0.18, pal.dark);
    line(ctx, r * 0.55, -r * 0.08, r * 0.9, -r * 0.35, pal.dark, lw * 0.5);
    line(ctx, r * 0.55, r * 0.08, r * 0.9, r * 0.35, pal.dark, lw * 0.5);
  };

  S.construct = (ctx, e, t, pal, A, r, lw) => {
    const legs = A.legs || 2;
    for (let i = 0; i < legs; i++) {
      const bx = r * (0.3 - (i / Math.max(1, legs - 1)) * 0.6);
      const sw = Math.sin(e.anim * 2 + i * 2) * r * 0.2;
      for (const side of [-1, 1]) {
        const kx = bx + sw * side, ky = side * r * 0.95;
        line(ctx, bx, side * r * 0.4, kx, ky, pal.dark, lw * 1.4);
        line(ctx, kx, ky, kx + r * 0.25, ky + side * r * 0.3, pal.dark, lw * 1.2);
        circ(ctx, kx, ky, r * 0.09, pal.accent);
      }
    }
    const big = A.big ? 1.1 : 1;
    ctx.beginPath();
    ctx.roundRect(-r * 0.8 * big, -r * 0.65 * big, r * 1.6 * big, r * 1.3 * big, r * 0.25);
    ctx.fillStyle = pal.body; ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    ctx.fillStyle = pal.light;
    ctx.fillRect(-r * 0.6, -r * 0.5, r * 0.9, r * 0.18);
    for (const [x, y] of [[-0.6, 0.45], [0.55, 0.45], [-0.6, -0.45], [0.55, -0.45]]) circ(ctx, x * r * big, y * r * big, r * 0.07, pal.dark);
    if (A.big) { line(ctx, -r * 0.8, 0, r * 0.2, 0, pal.dark, lw); circ(ctx, -r * 0.35, 0, r * 0.2, pal.accent, pal.dark, lw * 0.6); }
    // lentille
    circ(ctx, r * 0.55, 0, r * 0.3, pal.dark);
    circ(ctx, r * 0.6, 0, r * 0.18, pal.eye);
    circ(ctx, r * 0.66, -r * 0.06, r * 0.06, '#ffffff');
  };

  S.drone = (ctx, e, t, pal, A, r, lw) => {
    ctx.save();
    ctx.rotate(t * 18);
    line(ctx, -r * 1.1, 0, r * 1.1, 0, U.rgba(pal.dark, 0.6), lw * 1.2);
    line(ctx, 0, -r * 1.1, 0, r * 1.1, U.rgba(pal.dark, 0.6), lw * 1.2);
    ctx.restore();
    circ(ctx, 0, 0, r * 0.75, pal.body, pal.dark, lw);
    circ(ctx, 0, 0, r * 0.45, pal.light);
    circ(ctx, r * 0.35, 0, r * 0.26, pal.dark);
    circ(ctx, r * 0.38, 0, r * 0.15, pal.eye);
  };

  S.jelly = (ctx, e, t, pal, A, r, lw) => {
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const y0 = (i / 5 - 0.5) * r * 1.2;
      ctx.strokeStyle = U.rgba(pal.accent, 0.8);
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, y0);
      for (let k = 1; k <= 5; k++) ctx.lineTo(-r * 0.3 - k * r * 0.32, y0 + Math.sin(t * 4 + k * 0.9 + i) * r * 0.18);
      ctx.stroke();
    }
    const p = 1 + Math.sin(t * 3 + e.seed) * 0.07;
    circ(ctx, 0, 0, r * p, U.rgba(pal.body, 0.75), pal.dark, lw * 0.6);
    circ(ctx, r * 0.1, 0, r * 0.55 * p, U.rgba(pal.light, 0.8));
    circ(ctx, r * 0.15, -r * 0.1, r * 0.22, U.rgba(pal.accent, 0.9));
  };

  S.quad = (ctx, e, t, pal, A, r, lw) => {
    const step = e.anim * 2.2;
    const legs = [[0.45, -0.45, 0], [0.45, 0.45, Math.PI], [-0.45, -0.45, Math.PI], [-0.45, 0.45, 0]];
    legs.forEach(([x, y, ph]) => ell(ctx, r * x + Math.sin(step + ph) * r * 0.22, r * y * 1.15, r * 0.24, r * 0.16, 0, pal.dark));
    if (A.tail) {
      ctx.strokeStyle = pal.body; ctx.lineWidth = r * 0.25; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.7, 0); ctx.quadraticCurveTo(-r * 1.2, Math.sin(t * 3 + e.seed) * r * 0.5, -r * 1.55, Math.sin(t * 3 + e.seed + 1) * r * 0.4); ctx.stroke();
    }
    if (A.fluffy) {
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; circ(ctx, Math.cos(a) * r * 0.55 - r * 0.05, Math.sin(a) * r * 0.38, r * 0.34, pal.body, pal.dark, lw * 0.5); }
      ell(ctx, -r * 0.05, 0, r * 0.7, r * 0.45, 0, pal.body);
    } else {
      ell(ctx, 0, 0, r * 0.85, r * 0.5, 0, pal.body, pal.dark, lw);
    }
    if (A.pattern === 'stripes') for (let k = -1; k <= 1; k++) line(ctx, k * r * 0.3, -r * 0.42, k * r * 0.3 - r * 0.1, r * 0.42, pal.accent, r * 0.1);
    if (A.pattern === 'spots') for (let k = 0; k < 5; k++) circ(ctx, (seeded(e.def.index, k) - 0.5) * r * 1.2, (seeded(k, 2) - 0.5) * r * 0.6, r * 0.09, pal.accent);
    if (A.spikes) for (let k = 0; k < A.spikes; k++) { const x = r * (0.4 - k * 0.25); poly(ctx, [[x, -r * 0.08], [x - r * 0.18, -r * 0.08], [x - r * 0.1, -r * 0.42]], pal.accent); poly(ctx, [[x, r * 0.08], [x - r * 0.18, r * 0.08], [x - r * 0.1, r * 0.42]], pal.accent); }
    if (A.ears) for (const side of [-1, 1]) poly(ctx, [[r * 0.72, side * r * 0.12], [r * 0.55, side * r * 0.62], [r * 0.95, side * r * 0.3]], pal.body, pal.dark, lw * 0.7);
    circ(ctx, r * 0.85, 0, r * 0.38, pal.body, pal.dark, lw);
    if (A.ears) poly(ctx, [[r * 1.12, -r * 0.12], [r * 1.42, 0], [r * 1.12, r * 0.12]], pal.dark);
    if (A.tusks) { ctx.strokeStyle = '#fbfaf2'; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(r * 1.25, -r * 0.35, r * 0.3, 2.2, 4.4, true); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.25, r * 0.35, r * 0.3, -2.2, -4.4, false); ctx.stroke(); }
    eyes(ctx, r * 1.02, A.eyes, r * 0.36, r * 0.085, pal);
  };

  S.worm = (ctx, e, t, pal, A, r, lw) => {
    const n = A.segs || 4;
    for (let i = n; i >= 0; i--) {
      const x = -i * r * 0.62;
      const y = Math.sin(e.anim * 1.6 - i * 0.9 + t * 2) * r * 0.3;
      const rr = r * (0.75 - i * (0.35 / n));
      circ(ctx, x, y, rr, i % 2 ? pal.body : U.shade(pal.body, -0.08), pal.dark, lw * 0.8);
      if (i % 2 === 0 && i > 0) line(ctx, x, y - rr * 0.8, x, y + rr * 0.8, pal.accent, lw * 0.6);
    }
    eyes(ctx, r * 0.3, A.eyes, r * 0.5, r * 0.11, pal);
  };

  S.serpent = (ctx, e, t, pal, A, r, lw) => {
    const n = A.segs || 7;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([-i * r * 0.55, Math.sin(e.anim * 1.4 - i * 0.7 + t * 1.5) * r * 0.42 * Math.min(1, i / 2)]);
    for (let i = n; i >= 1; i--) {
      const rr = r * (0.62 - (i / n) * 0.42);
      const [x, y] = pts[i];
      circ(ctx, x, y, rr, pal.body, pal.dark, lw * 0.7);
      if (A.spikes && i % 2 === 1 && i <= A.spikes * 2) poly(ctx, [[x - rr * 0.4, y - rr * 0.6], [x - rr * 0.1, y - rr * 1.5], [x + rr * 0.3, y - rr * 0.6]], pal.accent, pal.dark, lw * 0.4);
      if (i % 3 === 0) circ(ctx, x, y, rr * 0.4, pal.accent);
    }
    poly(ctx, [[r * 0.75, 0], [r * 0.15, -r * 0.55], [-r * 0.25, -r * 0.35], [-r * 0.25, r * 0.35], [r * 0.15, r * 0.55]], pal.body, pal.dark, lw);
    line(ctx, r * 0.6, 0, r * 0.05, 0, pal.adark, lw * 0.5);
    eyes(ctx, r * 0.25, A.eyes || 2, r * 0.55, r * 0.11, pal);
  };

  S.cell = (ctx, e, t, pal, A, r, lw) => {
    ctx.beginPath();
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      const rr = r * (1 + 0.07 * Math.sin(a * 3 + t * 3 + e.seed) + 0.04 * Math.sin(a * 5 - t * 2));
      i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = U.rgba(pal.body, 0.85); ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    if (A.veins) {
      ctx.strokeStyle = U.rgba(pal.accent, 0.7); ctx.lineWidth = lw * 0.8;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.4) * r * 0.5, Math.sin(a + 0.4) * r * 0.5, Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); ctx.stroke(); }
      const beat = 1 + Math.max(0, Math.sin(t * 5)) * 0.15;
      circ(ctx, 0, 0, r * 0.35 * beat, pal.accent, pal.dark, lw * 0.6);
    } else {
      circ(ctx, r * 0.15, -r * 0.1, r * 0.36, pal.accent, pal.adark, lw * 0.5);
      for (let i = 0; i < 5; i++) circ(ctx, (seeded(e.seed, i) - 0.5) * r * 1.2, (seeded(i, e.seed) - 0.5) * r * 1.2, r * 0.08, pal.light);
    }
  };

  S.orb = (ctx, e, t, pal, A, r, lw) => {
    if (A.swirl) {
      ctx.strokeStyle = U.rgba(pal.accent, 0.8); ctx.lineWidth = lw;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (1.1 + i * 0.2), t * 4 + i * 2, t * 4 + i * 2 + 1.6); ctx.stroke(); }
    } else {
      ctx.strokeStyle = U.rgba(pal.accent, 0.5); ctx.lineWidth = lw * 0.6;
      ell(ctx, 0, 0, r * 1.5, r * 0.45, t * 1.3, null, U.rgba(pal.accent, 0.45), lw * 0.6);
    }
    circ(ctx, 0, 0, r, pal.body, pal.dark, lw * 0.8);
    eyes(ctx, r * 0.3, A.eyes, r * 0.6, r * (A.eyes === 1 ? 0.24 : 0.14), pal);
  };

  S.plant = (ctx, e, t, pal, A, r, lw) => {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.sin(t * 1.5 + i) * 0.1 + (A.jaws ? Math.PI / n : 0);
      ell(ctx, Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65, r * 0.55, r * 0.22, a, pal.body, pal.dark, lw * 0.6);
    }
    if (A.jaws) {
      const open = 0.25 + Math.max(0, Math.sin(t * 4 + e.seed)) * 0.45 + (e.attackAnim || 0) * 0.5;
      for (const side of [-1, 1]) {
        ctx.save(); ctx.rotate(side * open);
        ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.65, side > 0 ? 0 : -Math.PI, side > 0 ? Math.PI : 0, side < 0);
        ctx.closePath(); ctx.fillStyle = pal.accent; ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
        for (let k = 0; k < 4; k++) poly(ctx, [[r * (-0.2 + k * 0.28), 0], [r * (-0.08 + k * 0.28), side * r * 0.22], [r * (0.04 + k * 0.28), 0]], '#fbfaf2');
        ctx.restore();
      }
    } else {
      circ(ctx, 0, 0, r * 0.45, pal.accent, pal.dark, lw * 0.6);
      eyes(ctx, r * 0.15, A.eyes, r * 0.35, r * 0.1, pal);
    }
  };

  S.fish = (ctx, e, t, pal, A, r, lw) => {
    const sw = Math.sin(t * 6 + e.seed) * 0.35;
    poly(ctx, [[-r * 0.85, 0], [-r * 1.5, -r * (0.55 + sw * 0.4)], [-r * 1.35, 0], [-r * 1.5, r * (0.55 - sw * 0.4)]], pal.accent, pal.dark, lw * 0.7);
    for (const side of [-1, 1]) poly(ctx, [[r * 0.1, side * r * 0.35], [-r * 0.35, side * r * (0.95 + sw * side * 0.2)], [-r * 0.4, side * r * 0.3]], pal.accent, pal.dark, lw * 0.5);
    ctx.beginPath();
    ctx.moveTo(r * 1.0, 0);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.62, -r * 0.9, -r * 0.08);
    ctx.lineTo(-r * 0.9, r * 0.08);
    ctx.quadraticCurveTo(r * 0.5, r * 0.62, r * 1.0, 0);
    ctx.fillStyle = pal.body; ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    line(ctx, r * 0.6, 0, -r * 0.6, 0, pal.light, lw * 0.8);
    if (A.spikes) poly(ctx, [[r * 0.1, -r * 0.05], [-r * 0.3, -r * 0.05], [-r * 0.15, -r * 0.7]], pal.accent, pal.dark, lw * 0.5);
    if (A.lure) {
      ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.6;
      ctx.beginPath(); ctx.moveTo(r * 0.7, 0); ctx.quadraticCurveTo(r * 1.4, -r * 0.6, r * 1.6, Math.sin(t * 3) * r * 0.2); ctx.stroke();
      circ(ctx, r * 1.6, Math.sin(t * 3) * r * 0.2, r * 0.16, pal.glow || pal.accent);
    }
    eyes(ctx, r * 0.6, A.eyes, r * 0.5, r * 0.09, pal);
  };

  S.wraith = (ctx, e, t, pal, A, r, lw) => {
    for (let g = 2; g >= 0; g--) {
      ctx.globalAlpha *= g ? 0.25 : 1;
      ctx.beginPath();
      const N = 9;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU;
        const jag = i % 2 ? 0.55 : 1.05 + 0.15 * Math.sin(t * 9 + i * 3 + e.seed);
        const x = Math.cos(a) * r * jag - g * r * 0.35, y = Math.sin(a) * r * jag;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = pal.body; ctx.fill();
      ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 0.8; ctx.stroke();
      ctx.globalAlpha /= g ? 0.25 : 1;
    }
    line(ctx, r * 0.25, -r * 0.3, r * 0.35, r * 0.3, pal.eye, r * 0.16);
  };

  S.hydra = (ctx, e, t, pal, A, r, lw) => {
    const heads = A.heads || 3;
    for (let h = 0; h < heads; h++) {
      const spread = (h / (heads - 1) - 0.5) * 1.3;
      let px = r * 0.3, py = 0;
      for (let k = 1; k <= 4; k++) {
        const a = spread + Math.sin(t * 2 + h * 2 + k * 0.6) * 0.18;
        const nx = px + Math.cos(a) * r * 0.32, ny = py + Math.sin(a) * r * 0.32;
        circ(ctx, nx, ny, r * (0.2 - k * 0.012), pal.body, pal.dark, lw * 0.6);
        px = nx; py = ny;
      }
      const a = spread;
      poly(ctx, [[px + Math.cos(a) * r * 0.35, py + Math.sin(a) * r * 0.35], [px + Math.cos(a + 1.8) * r * 0.22, py + Math.sin(a + 1.8) * r * 0.22], [px - Math.cos(a) * r * 0.12, py - Math.sin(a) * r * 0.12], [px + Math.cos(a - 1.8) * r * 0.22, py + Math.sin(a - 1.8) * r * 0.22]], pal.accent, pal.dark, lw * 0.7);
      circ(ctx, px + Math.cos(a) * r * 0.12, py + Math.sin(a) * r * 0.12, r * 0.06, pal.eye);
    }
    ell(ctx, -r * 0.15, 0, r * 0.75, r * 0.62, 0, pal.body, pal.dark, lw);
    for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.4; poly(ctx, [[Math.cos(a) * r * 0.3 - r * 0.15, Math.sin(a) * r * 0.25], [Math.cos(a) * r * 0.75 - r * 0.15, Math.sin(a) * r * 0.62], [Math.cos(a + 0.35) * r * 0.4 - r * 0.15, Math.sin(a + 0.35) * r * 0.32]], pal.accent); }
  };

  S.whale = (ctx, e, t, pal, A, r, lw) => {
    const sw = Math.sin(t * 2 + e.seed) * 0.3;
    poly(ctx, [[-r * 0.95, 0], [-r * 1.5, -r * (0.6 + sw * 0.3)], [-r * 1.3, 0], [-r * 1.5, r * (0.6 - sw * 0.3)]], pal.body, pal.dark, lw);
    for (const side of [-1, 1]) ell(ctx, r * 0.15, side * r * 0.6, r * 0.38, r * 0.14, side * (0.6 + sw * 0.4), pal.body, pal.dark, lw * 0.7);
    ell(ctx, 0, 0, r * 1.05, r * 0.55, 0, pal.body, pal.dark, lw);
    ell(ctx, r * 0.1, 0, r * 0.8, r * 0.25, 0, U.rgba(pal.accent, 0.45));
    if (A.pattern === 'spots') for (let k = 0; k < 8; k++) circ(ctx, (seeded(e.seed, k) - 0.5) * r * 1.6, (seeded(k, e.seed) - 0.5) * r * 0.8, r * 0.06, pal.light);
    if (A.pattern === 'stripes') for (let k = 0; k < 6; k++) line(ctx, r * (0.5 - k * 0.22), -r * 0.45, r * (0.4 - k * 0.22), -r * 0.2, pal.light, lw * 0.8);
    if (e.def.tier >= 3) {
      // îlots sur le dos
      for (let k = 0; k < 4; k++) { circ(ctx, r * (0.3 - k * 0.3), (k % 2 ? -1 : 1) * r * 0.12, r * 0.13, '#7aa65a', '#4a6a3a', lw * 0.4); }
    }
    eyes(ctx, r * 0.72, A.eyes, r * 0.62, r * 0.06, pal);
  };

  S.golem = (ctx, e, t, pal, A, r, lw) => {
    const sw = Math.sin(e.anim * 1.6) * 0.25;
    for (const side of [-1, 1]) {
      const ax = r * 0.15 + Math.sin(e.anim * 1.6 + (side > 0 ? 0 : Math.PI)) * r * 0.25;
      circ(ctx, ax, side * r * 0.95, r * 0.36, pal.body, pal.dark, lw);
      circ(ctx, ax + r * 0.2, side * r * 1.05, r * 0.2, pal.dark);
    }
    const pts = [];
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; const rr = r * (0.82 + seeded(e.def.index, i) * 0.18); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.92]); }
    poly(ctx, pts, pal.body, pal.dark, lw);
    poly(ctx, pts.map(([x, y]) => [x * 0.6 - r * 0.1, y * 0.55 - r * 0.05]), pal.light);
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 1.1;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.3); ctx.lineTo(-r * 0.2, -r * 0.05 + sw); ctx.lineTo(r * 0.1, -r * 0.35); ctx.moveTo(-r * 0.2, -r * 0.05); ctx.lineTo(-r * 0.35, r * 0.5); ctx.moveTo(r * 0.1, r * 0.2); ctx.lineTo(-r * 0.15, r * 0.55); ctx.stroke();
    if (A.canopy) {
      for (let k = 0; k < 9; k++) { const a = (k / 9) * TAU; circ(ctx, Math.cos(a) * r * 0.42 - r * 0.15, Math.sin(a) * r * 0.42, r * 0.32, U.shade(pal.accent, -0.35 + seeded(k, 1) * 0.3), pal.dark, lw * 0.5); }
      circ(ctx, -r * 0.15, 0, r * 0.35, U.shade(pal.accent, -0.2));
    }
    eyes(ctx, r * 0.62, A.eyes, r * 0.45, r * 0.1, pal);
  };

  S.eye = (ctx, e, t, pal, A, r, lw, look) => {
    for (let i = 0; i < 6; i++) {
      const a = t * 0.6 + (i / 6) * TAU;
      poly(ctx, [[Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35], [Math.cos(a + 0.12) * r * 1.6, Math.sin(a + 0.12) * r * 1.6], [Math.cos(a + 0.24) * r * 1.35, Math.sin(a + 0.24) * r * 1.35]], pal.body, pal.accent, lw * 0.5);
    }
    circ(ctx, 0, 0, r, pal.body, pal.accent, lw);
    const lx = Math.cos(look) * r * 0.35, ly = Math.sin(look) * r * 0.35;
    const blink = Math.max(0.08, Math.abs(Math.sin(t * 0.7 + e.seed)) > 0.97 ? 0.1 : 1);
    ell(ctx, lx, ly, r * 0.48, r * 0.48 * blink, 0, pal.accent);
    ell(ctx, lx, ly, r * 0.2, r * 0.32 * blink, 0, '#ffffff');
  };

  S.gearring = (ctx, e, t, pal, A, r, lw) => {
    ctx.save();
    ctx.rotate(t * 0.4);
    ctx.beginPath();
    const teeth = 24;
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * TAU;
      const rr = i % 2 ? r * 0.92 : r * 1.05;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.moveTo(r * 0.62, 0);
    ctx.arc(0, 0, r * 0.62, 0, TAU, true);
    ctx.fillStyle = pal.body; ctx.fill('evenodd'); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; line(ctx, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, pal.dark, lw * 1.5); }
    ctx.restore();
    ctx.save(); ctx.rotate(-t * 0.9);
    circ(ctx, 0, 0, r * 0.32, pal.accent, pal.dark, lw);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; circ(ctx, Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38, r * 0.06, pal.accent); }
    ctx.restore();
    circ(ctx, 0, 0, r * 0.14, pal.eye);
  };

  // Habitants des civilisations (voir render/civArt.js)
  S.npc = (ctx, e, t, pal, A, r, lw) => AN.CivArt.drawPerson(ctx, e, t, pal, A, r, lw);

  const NO_ROTATE = { eye: 1, cell: 1, orb: 1, gearring: 1, jelly: 0, fungus: 0, star: 1, nebula: 1, spiral: 1 };
  Art.SHAPES = S; // complété par render/cosmicArt.js
  Art.NO_ROTATE = NO_ROTATE;

  /** Dessine le corps (sans ombre) centré en (0,0). */
  Art.drawBody = function (ctx, e, t, pal) {
    const def = e.def;
    const A = def.art;
    const r = e.r;
    const lw = Math.max(1, r * 0.09);
    const fn = S[A.shape] || S.blob;
    ctx.save();
    if (!NO_ROTATE[A.shape]) ctx.rotate(e.face || 0);
    ctx.lineJoin = 'round';
    fn(ctx, e, t, pal, A, r, lw, e.face || 0);
    ctx.restore();
  };

  /** Dessin complet d'une entité créature dans le monde. */
  Art.draw = function (ctx, e, t, opts = {}) {
    const def = e.def;
    const flying = def.move === 'fly' || def.move === 'drift' || def.move === 'blink';
    const bob = flying ? Math.sin(t * 3 + (e.seed || 0)) * e.r * 0.15 - e.r * 0.25 : 0;
    ctx.save();
    ctx.translate(e.x, e.y);
    // ombre
    ctx.fillStyle = 'rgba(10,12,20,0.22)';
    ctx.beginPath();
    ctx.ellipse(flying ? e.r * 0.2 : e.r * 0.08, e.r * (flying ? 0.75 : 0.45), e.r * (flying ? 0.7 : 0.95), e.r * (flying ? 0.32 : 0.5), 0, 0, TAU);
    ctx.fill();
    ctx.translate(0, bob);
    if (e.hidden) {
      // créature enfouie : seulement un remous
      ctx.strokeStyle = U.rgba(e.pal.dark, 0.5);
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, e.r * (0.5 + i * 0.3 + (t % 1) * 0.2), 0, TAU); ctx.stroke(); }
      ctx.restore();
      return;
    }
    const pal = e.flash > 0 ? Art.FLASH : e.pal;
    if (pal.glow && opts.glow !== false) {
      const g = ctx.createRadialGradient(0, 0, e.r * 0.3, 0, 0, e.r * 2.4);
      g.addColorStop(0, U.rgba(pal.glow, 0.35));
      g.addColorStop(1, U.rgba(pal.glow, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, e.r * 2.4, 0, TAU); ctx.fill();
    }
    if (e.stage >= 2) {
      // Ancien : un halo pâle et une couronne d'épines
      ctx.fillStyle = U.rgba(pal.accent, 0.16 + Math.sin(t * 2 + e.seed) * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, e.r * 1.55, 0, TAU); ctx.fill();
    }
    if (e.alpha != null) ctx.globalAlpha = e.alpha;
    Art.drawBody(ctx, e, t, pal);
    if (e.stage >= 1) {
      // Aguerri : trois chevrons de l'accent au-dessus de la créature
      ctx.fillStyle = pal.accent; ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(0.8, e.r * 0.05);
      const n = e.stage >= 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.38;
        const x0 = Math.cos(a) * e.r * 1.05, y0 = Math.sin(a) * e.r * 1.05;
        const x1 = Math.cos(a) * e.r * (e.stage >= 2 ? 1.45 : 1.3), y1 = Math.sin(a) * e.r * (e.stage >= 2 ? 1.45 : 1.3);
        ctx.beginPath(); ctx.moveTo(x0 + Math.cos(a + 1.57) * e.r * 0.09, y0 + Math.sin(a + 1.57) * e.r * 0.09); ctx.lineTo(x1, y1); ctx.lineTo(x0 - Math.cos(a + 1.57) * e.r * 0.09, y0 - Math.sin(a + 1.57) * e.r * 0.09); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    if (e.frozenT > 0) {
      ctx.fillStyle = 'rgba(160,210,255,0.45)';
      ctx.beginPath(); ctx.arc(0, 0, e.r * 1.1, 0, TAU); ctx.fill();
    }
    if (e.captive) {
      // Cocon : le compagnon est retenu prisonnier
      ctx.strokeStyle = 'rgba(232,224,240,0.9)'; ctx.lineWidth = Math.max(1.2, e.r * 0.08);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI + Math.sin(t + i) * 0.1;
        ctx.beginPath(); ctx.ellipse(0, 0, e.r * 1.25, e.r * 0.5, a, 0, TAU); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };

  /** Le joueur : un être blanc, une fente pour regard, un éclat de l'Artefact en orbite. */
  Art.drawPlayer = function (ctx, p, t, opts = {}) {
    const r = p.r;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (!opts.mounted) {
      ctx.fillStyle = 'rgba(10,12,20,0.2)';
      ctx.beginPath(); ctx.ellipse(0, r * 0.55, r * 0.95, r * 0.45, 0, 0, TAU); ctx.fill();
    }
    if (p.iframes > 0 && Math.floor(t * 30) % 2 === 0) ctx.globalAlpha = 0.45;
    const flash = p.flash > 0;
    // cape qui traîne derrière le mouvement
    const mv = Math.hypot(p.vx || 0, p.vy || 0);
    const ma = mv > 5 ? Math.atan2(p.vy, p.vx) : p.aim + Math.PI;
    const trail = U.clamp(mv / 200, 0, 1);
    ctx.save();
    ctx.rotate(mv > 5 ? ma : p.aim);
    ctx.fillStyle = flash ? '#ffd0d0' : '#e9ebee';
    ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.85);
    ctx.quadraticCurveTo(-r * (1.2 + trail * 0.8), -r * 0.6 + Math.sin(t * 8) * 2, -r * (1.5 + trail * 0.9), Math.sin(t * 6) * 3);
    ctx.quadraticCurveTo(-r * (1.2 + trail * 0.8), r * 0.6 + Math.sin(t * 7) * 2, 0, r * 0.85);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // corps
    ctx.fillStyle = flash ? '#ffd0d0' : '#ffffff';
    ctx.strokeStyle = AN.INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    // regard
    ctx.save();
    ctx.rotate(p.aim);
    ctx.strokeStyle = AN.INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.38, -r * 0.32); ctx.lineTo(r * 0.5, r * 0.32); ctx.stroke();
    if (opts.weapon) {
      ctx.strokeStyle = opts.weaponColor || AN.CYAN; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(r * 0.9, 0); ctx.lineTo(r * 1.6 - (p.recoil || 0) * 6, 0); ctx.stroke();
    }
    ctx.restore();
    // éclat d'Artefact en orbite
    const oa = t * 1.6;
    const ox = Math.cos(oa) * r * 1.7, oy = Math.sin(oa) * r * 1.1 - r * 0.6;
    ctx.save();
    ctx.translate(ox, oy); ctx.rotate(t * 2);
    ctx.fillStyle = AN.CYAN;
    ctx.beginPath(); ctx.moveTo(0, -4.5); ctx.lineTo(3, 0); ctx.lineTo(0, 4.5); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
  };
})();
