/* Formes de la nouvelle faune (1.3) : grenouille, oiseau, escargot, crabe,
   raie, scorpion. Même repère que creatureArt.js : la créature regarde vers +x,
   son rayon vaut r ; e.anim avance avec la marche, t est le temps. */
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
  function line(ctx, x1, y1, x2, y2, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function eye(ctx, x, y, s, pal) {
    circ(ctx, x, y, s, pal.eye);
    circ(ctx, x + s * 0.3, y - s * 0.3, s * 0.34, 'rgba(255,255,255,0.85)');
  }
  const seeded = (i, k) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;

  /** Grenouille : pattes arrière repliées, gorge qui se gonfle, yeux sur le dessus. */
  S.frog = (ctx, e, t, pal, A, r, lw) => {
    const hop = Math.max(0, Math.sin(e.anim * 2));
    for (const side of [-1, 1]) {
      // pattes arrière : se détendent pendant le saut
      const ext = 0.25 + hop * 0.45;
      poly(ctx, [[-r * 0.3, side * r * 0.45], [-r * (0.75 + ext * 0.4), side * r * 0.85], [-r * (0.9 + ext), side * r * 0.55], [-r * 0.55, side * r * 0.25]], pal.dark);
      ell(ctx, -r * (0.95 + ext), side * r * 0.6, r * 0.2, r * 0.13, 0, pal.adark);
      // pattes avant
      line(ctx, r * 0.35, side * r * 0.35, r * 0.62, side * r * 0.62, pal.dark, lw * 1.2);
      circ(ctx, r * 0.64, side * r * 0.64, r * 0.08, pal.adark);
    }
    ell(ctx, -r * 0.05, 0, r * 0.82, r * 0.62, 0, pal.body, pal.dark, lw);
    // gorge
    const sac = 0.28 + Math.max(0, Math.sin(t * 3.4 + (e.seed || 0))) * 0.16;
    ell(ctx, r * 0.55, 0, r * sac, r * sac * 1.1, 0, U.rgba(pal.accent, 0.7));
    if (A.pattern === 'spots') for (let k = 0; k < 5; k++) circ(ctx, (seeded(e.def.index, k) - 0.6) * r * 1.1, (seeded(k, 7) - 0.5) * r * 0.8, r * 0.09, pal.accent);
    for (const side of [-1, 1]) {
      circ(ctx, r * 0.3, side * r * 0.38, r * 0.2, pal.body, pal.dark, lw * 0.7);
      eye(ctx, r * 0.33, side * r * 0.38, r * 0.12, pal);
    }
  };

  /** Oiseau : ailes qui battent en vol, repliées au sol ; variantes chouette, métal, huppe, long cou. */
  S.bird = (ctx, e, t, pal, A, r, lw) => {
    const flying = e.def.move === 'fly' && !e.downed;
    const flap = flying ? Math.sin(t * (A.owl ? 5 : 11) + (e.seed || 0)) : 0;
    // queue
    poly(ctx, [[-r * 0.55, 0], [-r * 1.15, -r * 0.35], [-r * 1.25, 0], [-r * 1.15, r * 0.35]], pal.accent, pal.dark, lw * 0.6);
    // ailes
    for (const side of [-1, 1]) {
      if (flying) {
        // aile : bord d'attaque courbe, bord de fuite en plumes
        const span = r * (1.2 + flap * 0.4);
        const tipX = -r * 0.35 - flap * r * 0.1;
        ctx.beginPath();
        ctx.moveTo(r * 0.22, side * r * 0.22);
        ctx.quadraticCurveTo(r * 0.2, side * span * 0.85, tipX, side * span);
        for (let k = 1; k <= 4; k++) {
          const f = k / 4;
          const x = U.lerp(tipX, -r * 0.5, f), y = side * U.lerp(span, r * 0.3, f);
          ctx.quadraticCurveTo(x + r * 0.05, y + side * r * 0.12, x - r * 0.08, y);
        }
        ctx.closePath();
        ctx.fillStyle = pal.light; ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.7; ctx.stroke();
        for (let k = 1; k <= 3; k++) line(ctx, -r * 0.05 - k * r * 0.1, side * r * 0.35, tipX + (k / 4) * (-r * 0.15), side * span * (1 - k * 0.17), U.rgba(pal.dark, 0.4), lw * 0.4);
      } else {
        ell(ctx, -r * 0.2, side * r * 0.42, r * 0.55, r * 0.22, side * 0.15, pal.light, pal.dark, lw * 0.7);
      }
    }
    // corps
    ell(ctx, -r * 0.05, 0, r * 0.68, r * (A.owl ? 0.58 : 0.46), 0, pal.body, pal.dark, lw);
    if (A.metal) {
      for (const [x, y] of [[-0.35, -0.22], [-0.35, 0.22], [0.05, -0.3], [0.05, 0.3]]) circ(ctx, x * r, y * r, r * 0.06, pal.adark);
      line(ctx, -r * 0.6, 0, r * 0.3, 0, U.rgba(pal.dark, 0.6), lw * 0.6);
    }
    if (A.owl) {
      // plastron et disque facial
      ell(ctx, -r * 0.05, 0, r * 0.38, r * 0.3, 0, U.rgba(pal.light, 0.9));
      for (let k = 0; k < 4; k++) line(ctx, -r * 0.3 + k * r * 0.13, -r * 0.18, -r * 0.27 + k * r * 0.13, r * 0.18, U.rgba(pal.dark, 0.35), lw * 0.5);
    }
    // tête
    const hx = A.long ? r * 0.85 : r * 0.62;
    if (A.long) line(ctx, r * 0.4, 0, hx, 0, pal.body, r * 0.26);
    const hr = A.owl ? r * 0.42 : r * 0.3;
    circ(ctx, hx, 0, hr, pal.body, pal.dark, lw * 0.9);
    if (A.crest) for (let k = -1; k <= 1; k++) poly(ctx, [[hx - hr * 0.4, k * hr * 0.25], [hx - hr * 1.6, k * hr * 0.7], [hx - hr * 0.1, k * hr * 0.4]], pal.accent, pal.dark, lw * 0.4);
    // bec
    const bl = A.long ? r * 0.75 : A.owl ? r * 0.18 : r * 0.35;
    poly(ctx, [[hx + hr * 0.75, -hr * 0.28], [hx + hr * 0.75 + bl, 0], [hx + hr * 0.75, hr * 0.28]], A.metal ? pal.accent : '#e8b84a', pal.dark, lw * 0.5);
    if (A.owl) {
      for (const side of [-1, 1]) { circ(ctx, hx + hr * 0.3, side * hr * 0.42, hr * 0.32, '#ffffff', pal.dark, lw * 0.4); eye(ctx, hx + hr * 0.36, side * hr * 0.42, hr * 0.2, pal); }
    } else if (A.eyes === 1) {
      circ(ctx, hx + hr * 0.25, 0, hr * 0.42, pal.dark); circ(ctx, hx + hr * 0.25, 0, hr * 0.26, pal.eye);
    } else for (const side of [-1, 1]) eye(ctx, hx + hr * 0.35, side * hr * 0.52, hr * 0.22, pal);
  };

  /** Escargot : coquille en spirale (lueur dans les fentes), corps mou et cornes. */
  S.snail = (ctx, e, t, pal, A, r, lw) => {
    const crawl = Math.sin(e.anim * 1.6) * 0.06;
    // pied
    ell(ctx, r * 0.1, 0, r * (1.05 + crawl), r * 0.42, 0, pal.body, pal.dark, lw);
    for (const side of [-1, 1]) {
      line(ctx, r * 0.85, side * r * 0.12, r * 1.25, side * r * (0.32 + crawl), pal.body, lw * 1.4);
      circ(ctx, r * 1.27, side * r * (0.33 + crawl), r * 0.1, pal.eye);
    }
    // coquille
    const shell = A.shell || pal.dark;
    const sx = -r * 0.25;
    circ(ctx, sx, 0, r * 0.72, shell, pal.dark, lw);
    ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 1.3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k <= 46; k++) {
      const a = k * 0.32, rr = r * 0.66 * (1 - k / 52);
      const x = sx + Math.cos(a + t * 0.2) * rr, y = Math.sin(a + t * 0.2) * rr;
      if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.globalAlpha *= 0.85; ctx.stroke(); ctx.globalAlpha /= 0.85;
    ctx.lineCap = 'butt';
    circ(ctx, sx - r * 0.18, -r * 0.2, r * 0.16, U.rgba('#ffffff', 0.18));
  };

  /** Crabe : carapace large, trois pattes par côté, deux pinces, yeux pédonculés. */
  S.crab = (ctx, e, t, pal, A, r, lw) => {
    const big = A.big ? 1.08 : 1;
    for (let i = 0; i < 3; i++) {
      const bx = r * (0.2 - i * 0.32);
      const sw = Math.sin(e.anim * 2.6 + i * 1.9) * r * 0.16;
      for (const side of [-1, 1]) {
        const kx = bx + sw, ky = side * r * 0.95 * big;
        line(ctx, bx, side * r * 0.45, kx, ky, pal.dark, lw * 1.1);
        line(ctx, kx, ky, kx - r * 0.2, ky + side * r * 0.35, pal.dark, lw);
      }
    }
    // pinces
    const pinch = 0.25 + Math.abs(Math.sin(t * 2.2 + (e.seed || 0))) * 0.35;
    for (const side of [-1, 1]) {
      line(ctx, r * 0.4, side * r * 0.45, r * 0.85, side * r * 0.62, pal.dark, lw * 1.3);
      ell(ctx, r * 1.05, side * r * 0.62, r * 0.32 * big, r * 0.22 * big, 0, pal.accent, pal.dark, lw * 0.8);
      poly(ctx, [[r * 1.2, side * r * 0.55], [r * 1.6, side * r * (0.55 - pinch * 0.4)], [r * 1.32, side * r * 0.62]], pal.accent, pal.dark, lw * 0.6);
      poly(ctx, [[r * 1.2, side * r * 0.7], [r * 1.58, side * r * (0.7 + pinch * 0.25)], [r * 1.3, side * r * 0.62]], pal.accent, pal.dark, lw * 0.6);
    }
    // carapace
    ell(ctx, 0, 0, r * 0.72 * big, r * 0.95 * big, 0, pal.body, pal.dark, lw);
    ell(ctx, -r * 0.1, 0, r * 0.45 * big, r * 0.62 * big, 0, U.rgba(pal.light, 0.55));
    if (A.towers) {
      // la forteresse sur le dos
      ctx.fillStyle = U.shade(pal.body, 0.15); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.7;
      ctx.beginPath(); ctx.rect(-r * 0.42, -r * 0.42, r * 0.7, r * 0.84); ctx.fill(); ctx.stroke();
      for (const [x, y] of [[-0.42, -0.42], [0.28, -0.42], [-0.42, 0.42], [0.28, 0.42]]) {
        circ(ctx, x * r, y * r, r * 0.17, U.shade(pal.body, 0.25), pal.dark, lw * 0.7);
        circ(ctx, x * r, y * r, r * 0.07, pal.accent);
      }
      for (let k = 0; k < 3; k++) ctx.fillRect(-r * 0.32 + k * r * 0.2, -r * 0.08, r * 0.08, r * 0.16);
    } else if (A.big) {
      for (let k = 0; k < 4; k++) circ(ctx, (seeded(e.def.index, k) - 0.6) * r * 0.9, (seeded(k, 3) - 0.5) * r * 1.2, r * 0.1, U.rgba(pal.accent, 0.8));
    }
    for (const side of [-1, 1]) {
      line(ctx, r * 0.55, side * r * 0.22, r * 0.82, side * r * 0.3, pal.dark, lw * 0.8);
      eye(ctx, r * 0.85, side * r * 0.3, r * 0.1, pal);
    }
  };

  /** Raie : grandes nageoires qui ondulent, longue queue fine. */
  S.ray = (ctx, e, t, pal, A, r, lw) => {
    const w = Math.sin(t * 3.2 + (e.seed || 0)) * 0.22;
    ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-r * 0.6, 0);
    ctx.quadraticCurveTo(-r * 1.3, Math.sin(t * 2 + 1) * r * 0.3, -r * 2, Math.sin(t * 2) * r * 0.4); ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(r * 0.8, 0);
    ctx.bezierCurveTo(r * 0.75, -r * 0.5, r * 0.35, -r * (1.05 + w), -r * 0.1, -r * (1.15 + w));
    ctx.bezierCurveTo(-r * 0.25, -r * 0.8, -r * 0.6, -r * 0.35, -r * 0.7, 0);
    ctx.bezierCurveTo(-r * 0.6, r * 0.35, -r * 0.25, r * 0.8, -r * 0.1, r * (1.15 - w));
    ctx.bezierCurveTo(r * 0.35, r * (1.05 - w), r * 0.75, r * 0.5, r * 0.8, 0);
    ctx.closePath();
    ctx.fillStyle = pal.body; ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    ell(ctx, r * 0.05, 0, r * 0.45, r * 0.28, 0, U.rgba(pal.light, 0.5));
    for (let k = 0; k < 4; k++) circ(ctx, -r * 0.1 - k * r * 0.12, (k % 2 ? 1 : -1) * r * (0.35 + k * 0.1), r * 0.07, pal.accent);
    for (const side of [-1, 1]) eye(ctx, r * 0.55, side * r * 0.2, r * 0.08, pal);
  };

  /** Scorpion : quatre pattes par côté, pinces, queue qui se recourbe au-dessus du dos. */
  S.scorpion = (ctx, e, t, pal, A, r, lw) => {
    for (let i = 0; i < 4; i++) {
      const bx = r * (0.25 - i * 0.22);
      const sw = Math.sin(e.anim * 2.8 + i * 1.6) * r * 0.14;
      for (const side of [-1, 1]) {
        const kx = bx + sw - r * 0.1, ky = side * r * 0.75;
        line(ctx, bx, side * r * 0.25, kx, ky, pal.dark, lw * 0.9);
        line(ctx, kx, ky, kx - r * 0.25, ky + side * r * 0.3, pal.dark, lw * 0.8);
      }
    }
    // pinces
    const pinch = 0.2 + Math.abs(Math.sin(t * 2.6 + (e.seed || 0))) * 0.3;
    for (const side of [-1, 1]) {
      line(ctx, r * 0.4, side * r * 0.2, r * 0.75, side * r * 0.5, pal.dark, lw * 1.1);
      ell(ctx, r * 0.95, side * r * 0.52, r * 0.26, r * 0.17, side * 0.3, pal.body, pal.dark, lw * 0.7);
      poly(ctx, [[r * 1.1, side * r * 0.45], [r * 1.42, side * r * (0.42 - pinch * 0.3)], [r * 1.2, side * r * 0.54]], pal.accent, pal.dark, lw * 0.5);
    }
    // corps segmenté
    for (let k = 0; k < 4; k++) ell(ctx, r * (0.3 - k * 0.24), 0, r * 0.28, r * (0.42 - k * 0.03), 0, k % 2 ? pal.body : U.shade(pal.body, -0.06), pal.dark, lw * 0.8);
    // queue : part vers l'arrière puis se recourbe au-dessus du dos, dard pointé vers l'avant
    const curl = 0.9 + Math.sin(t * 1.8 + (e.seed || 0)) * 0.08;
    const at = (s) => [-r * 0.55 - r * 0.75 * Math.sin(Math.PI * s * curl), -r * 0.36 * (1 - Math.cos(Math.PI * s * curl))];
    for (let k = 0; k <= 6; k++) {
      const [x, y] = at(k / 6);
      circ(ctx, x, y, r * (0.18 - k * 0.012), k % 2 ? pal.body : U.shade(pal.body, -0.08), pal.dark, lw * 0.6);
    }
    const [sx, sy] = at(1);
    poly(ctx, [[sx, sy - r * 0.08], [sx + r * 0.3, sy + r * 0.02], [sx, sy + r * 0.1]], pal.accent, pal.dark, lw * 0.5);
    if (A.crown) for (let k = -2; k <= 2; k++) poly(ctx, [[r * 0.35, k * r * 0.08], [r * 0.2, k * r * 0.12 - r * 0.3], [r * 0.5, k * r * 0.1]], pal.accent, pal.dark, lw * 0.4);
    const n = A.eyes || 2;
    for (let i = 0; i < n; i++) eye(ctx, r * 0.42, (n === 1 ? 0 : (i / (n - 1) - 0.5)) * r * 0.3, r * 0.06, pal);
  };
})();
