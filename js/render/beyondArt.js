/* Formes des êtres d'au-delà de la galaxie (1.10) : le Berger d'amas, le
   Tisserand, le Relieur, les échos de soi-même et les cocottes de papier du Pli.
   Même repère que creatureArt.js : centré en (0, 0), rayon r, tourné selon e.face
   (sauf les formes de NO_ROTATE). */
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
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function spiralAt(ctx, x, y, r, t, body, accent, k) {
    for (let a = 0; a < 3; a++) {
      for (let s = 0; s < 9; s++) {
        const d = s / 9;
        const ang = (a / 3) * TAU + d * 3.6 + t * 0.6 * k;
        circ(ctx, x + Math.cos(ang) * r * (0.2 + d), y + Math.sin(ang) * r * (0.2 + d), r * (0.16 - d * 0.1), U.rgba(s % 3 ? body : accent, 0.8 - d * 0.5));
      }
    }
    circ(ctx, x, y, r * 0.25, accent);
  }

  /** Le Berger d'amas : une silhouette voûtée faite de nuit, une houlette, ses galaxies autour. */
  S.shepherd = (ctx, e, t, pal, A, r, lw) => {
    // les galaxies du troupeau tournent autour de lui
    for (let k = 0; k < 7; k++) {
      const a = t * 0.25 + (k / 7) * TAU;
      const rr = r * (1.05 + 0.12 * Math.sin(t + k));
      spiralAt(ctx, Math.cos(a) * rr, Math.sin(a) * rr * 0.75, r * 0.13, t, pal.light, pal.accent, k % 2 ? 1 : -1);
    }
    // manteau
    poly(ctx, [[0, -r * 0.82], [r * 0.5, -r * 0.2], [r * 0.62, r * 0.7], [-r * 0.62, r * 0.7], [-r * 0.5, -r * 0.2]], pal.body, pal.dark, lw);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, -r * 0.82); ctx.lineTo(r * 0.5, -r * 0.2); ctx.lineTo(r * 0.62, r * 0.7); ctx.lineTo(-r * 0.62, r * 0.7); ctx.lineTo(-r * 0.5, -r * 0.2); ctx.closePath(); ctx.clip();
    for (let k = 0; k < 40; k++) circ(ctx, ((k * 37) % 100 / 100 - 0.5) * r * 1.2, ((k * 61) % 100 / 100 - 0.4) * r * 1.4, r * 0.012 + (k % 3) * r * 0.006, U.rgba(pal.accent, 0.5 + 0.4 * Math.sin(t * 2 + k)));
    ctx.restore();
    // capuchon et regard
    circ(ctx, 0, -r * 0.58, r * 0.26, U.shade(pal.body, -0.2), pal.dark, lw);
    circ(ctx, -r * 0.08, -r * 0.58, r * 0.04, pal.eye);
    circ(ctx, r * 0.08, -r * 0.58, r * 0.04, pal.eye);
    // houlette
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 1.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.55, r * 0.7); ctx.lineTo(r * 0.72, -r * 0.7); ctx.arc(r * 0.6, -r * 0.7, r * 0.12, 0, -Math.PI, true); ctx.stroke();
    ctx.lineCap = 'butt';
  };

  /** Le Tisserand : un corps de nuit suspendu à huit pattes de lumière, et la trame qu'il tient. */
  S.weaver = (ctx, e, t, pal, A, r, lw) => {
    ctx.strokeStyle = U.rgba(pal.accent, 0.35); ctx.lineWidth = Math.max(1, lw * 0.4);
    for (let k = 1; k <= 3; k++) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = (i / 8) * TAU; const rr = r * (0.35 * k); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.stroke(); }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + 0.2;
      const step = Math.sin(t * 2 + i) * 0.08;
      const kx = Math.cos(a + step) * r * 0.62, ky = Math.sin(a + step) * r * 0.62;
      const fx = Math.cos(a) * r * 1.05, fy = Math.sin(a) * r * 1.05;
      ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 1.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(kx, ky - r * 0.12); ctx.lineTo(fx, fy); ctx.stroke();
      circ(ctx, fx, fy, r * 0.03, '#ffffff');
    }
    ctx.lineCap = 'butt';
    circ(ctx, 0, 0, r * 0.32, pal.body, pal.accent, lw);
    for (let i = 0; i < (A.eyes || 6); i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.32; circ(ctx, Math.cos(a) * r * 0.18, Math.sin(a) * r * 0.18 + r * 0.06, r * 0.045, pal.eye); }
  };

  /** Le Relieur : un livre ouvert dressé, dont les pages forment un cadre hexagonal. */
  S.binder = (ctx, e, t, pal, A, r, lw) => {
    const open = 0.75 + Math.sin(t * 0.8) * 0.08;
    for (let k = 5; k >= 0; k--) {
      const s = 1 - k * 0.08;
      const ang = (k - 2.5) * 0.09 * open;
      ctx.save(); ctx.rotate(ang);
      poly(ctx, [[-r * 0.62 * s, -r * 0.82 * s], [r * 0.62 * s, -r * 0.82 * s], [r * 0.62 * s, r * 0.82 * s], [-r * 0.62 * s, r * 0.82 * s]], k ? U.shade(pal.body, -0.03 * k) : pal.body, U.rgba(pal.dark, 0.7), lw * 0.6);
      ctx.restore();
    }
    // lignes d'écriture, à l'envers
    ctx.strokeStyle = U.rgba('#1c2230', 0.25); ctx.lineWidth = Math.max(1, lw * 0.35);
    for (let i = 0; i < 9; i++) { const y = -r * 0.6 + i * r * 0.13; ctx.beginPath(); ctx.moveTo(-r * 0.48, y); ctx.lineTo(r * (0.2 + ((i * 13) % 7) / 25), y); ctx.stroke(); }
    // le cadre hexagonal de l'Artefact, au milieu
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6 + t * 0.1; const x = Math.cos(a) * r * 0.32, y = Math.sin(a) * r * 0.32; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.stroke();
    circ(ctx, 0, 0, r * 0.07, pal.eye);
  };

  /** Un écho de soi-même : la silhouette du joueur, en pointillés. */
  S.echo = (ctx, e, t, pal, A, r, lw) => {
    const hostile = e.team === 'wild' && e.temper === 'agressif';
    ctx.save();
    ctx.globalAlpha *= 0.55 + Math.sin(t * 2 + (e.seed || 0)) * 0.15;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.strokeStyle = hostile ? AN.STAMP || '#c8322c' : AN.INK || '#1c2230'; ctx.lineWidth = Math.max(1.2, lw * 0.9);
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.quadraticCurveTo(-r * 1.4, -r * 0.5, -r * 1.6, Math.sin(t * 5) * 2); ctx.quadraticCurveTo(-r * 1.4, r * 0.5, 0, r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = Math.max(1.5, lw * 1.3); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(r * 0.38, -r * 0.32); ctx.lineTo(r * 0.5, r * 0.32); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.fillStyle = hostile ? AN.STAMP || '#c8322c' : AN.CYAN || '#2346c8';
    const oa = t * 1.6;
    ctx.beginPath(); ctx.arc(Math.cos(oa) * r * 1.6, Math.sin(oa) * r * 1.1, r * 0.18, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /** Cocotte de papier : un oiseau plié, qui bat des ailes par à-coups. */
  S.paperbird = (ctx, e, t, pal, A, r, lw) => {
    const flap = Math.abs(Math.sin(e.anim * 2 + (e.seed || 0))) * 0.6 + 0.2;
    const ink = U.rgba(pal.dark, 0.8);
    poly(ctx, [[r * 0.9, 0], [-r * 0.2, -r * 0.18], [-r * 0.7, 0], [-r * 0.2, r * 0.18]], pal.body, ink, lw * 0.6);
    poly(ctx, [[r * 0.2, 0], [-r * 0.35, -r * (0.3 + flap)], [-r * 0.5, 0]], U.shade(pal.body, -0.06), ink, lw * 0.6);
    poly(ctx, [[r * 0.2, 0], [-r * 0.35, r * (0.3 + flap)], [-r * 0.5, 0]], U.shade(pal.body, -0.12), ink, lw * 0.6);
    poly(ctx, [[-r * 0.6, 0], [-r * 0.95, -r * 0.3], [-r * 0.8, 0]], pal.body, ink, lw * 0.5);
    ctx.strokeStyle = pal.accent; ctx.lineWidth = Math.max(0.8, lw * 0.4);
    ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(r * 0.5, 0); ctx.stroke();
    circ(ctx, r * 0.55, -r * 0.05, r * 0.06, pal.eye);
  };

  Object.assign(AN.Art.NO_ROTATE, { shepherd: 1, weaver: 1, binder: 1 });
})();
