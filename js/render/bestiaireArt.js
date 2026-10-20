/* Formes du bestiaire de la 1.11 : cierge, cloche, cerf, sablier, sonde,
   pulsar, galaxie-méduse, nœud, tache d'encre, origami, montgolfière.
   Même repère que creatureArt.js : centré en (0, 0), rayon r ; les formes qui
   marchent regardent vers +x (vues de dessus), celles de NO_ROTATE sont vues
   de face et ne tournent pas. */
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
  function eyes(ctx, x, y, gap, s, pal, n) {
    const k = n == null ? 2 : n;
    for (let i = 0; i < k; i++) {
      const ex = x + (k === 1 ? 0 : (i - (k - 1) / 2) * gap);
      circ(ctx, ex, y, s, pal.eye);
      circ(ctx, ex + s * 0.3, y - s * 0.3, s * 0.34, 'rgba(255,255,255,0.85)');
    }
  }
  /** Flamme qui vacille (pointe vers le haut). */
  function flame(ctx, x, y, s, t, k, pal) {
    const f = 1 + Math.sin(t * 13 + k * 2.1) * 0.12 + Math.sin(t * 7.3 + k) * 0.08;
    const sway = Math.sin(t * 5 + k) * s * 0.18;
    ctx.fillStyle = U.rgba(pal.accent, 0.95);
    ctx.beginPath(); ctx.moveTo(x - s * 0.45, y); ctx.quadraticCurveTo(x - s * 0.5, y - s * 1.1 * f, x + sway, y - s * 1.9 * f); ctx.quadraticCurveTo(x + s * 0.5, y - s * 1.1 * f, x + s * 0.45, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,240,0.9)';
    ctx.beginPath(); ctx.ellipse(x + sway * 0.4, y - s * 0.55 * f, s * 0.2, s * 0.45 * f, 0, 0, TAU); ctx.fill();
  }

  /** Cierge qui marche : un corps de cire qui coule, une ou plusieurs mèches allumées. */
  S.candle = (ctx, e, t, pal, A, r, lw) => {
    const n = A.wicks || 1;
    const w = r * (n > 1 ? 1.25 : 0.7), h = r * 1.3;
    const st = Math.sin((e.anim || 0) * 6) * r * 0.08;
    ell(ctx, -w * 0.3, h * 0.5 + st, r * 0.2, r * 0.11, 0, pal.dark);
    ell(ctx, w * 0.3, h * 0.5 - st, r * 0.2, r * 0.11, 0, pal.dark);
    // corps, au sommet fondu
    ctx.beginPath();
    ctx.moveTo(-w / 2, h * 0.45);
    ctx.lineTo(-w / 2, -h * 0.35);
    for (let i = 0; i <= 6; i++) { const x = -w / 2 + (i / 6) * w; ctx.lineTo(x, -h * 0.45 + Math.sin(i * 1.7 + (e.seed || 0)) * r * 0.06); }
    ctx.lineTo(w / 2, h * 0.45);
    ctx.quadraticCurveTo(0, h * 0.58, -w / 2, h * 0.45);
    ctx.closePath();
    ctx.fillStyle = pal.body; ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    // coulures
    for (let k = 0; k < 3 + n; k++) {
      const x = -w / 2 + ((k + 0.5) / (3 + n)) * w;
      const len = r * (0.18 + ((k * 37) % 10) / 22) * (1 + Math.sin(t * 0.7 + k) * 0.1);
      ctx.fillStyle = pal.light;
      ctx.beginPath(); ctx.moveTo(x - r * 0.07, -h * 0.42); ctx.lineTo(x - r * 0.07, -h * 0.42 + len); ctx.arc(x, -h * 0.42 + len, r * 0.07, Math.PI, 0, true); ctx.lineTo(x + r * 0.07, -h * 0.42); ctx.closePath(); ctx.fill();
    }
    eyes(ctx, 0, -h * 0.05, r * 0.32, r * 0.1, pal, A.eyes);
    for (let k = 0; k < n; k++) {
      const x = n === 1 ? 0 : (k / (n - 1) - 0.5) * w * 0.8;
      line(ctx, x, -h * 0.45, x, -h * 0.6, pal.adark, lw * 0.8);
      flame(ctx, x, -h * 0.6, r * (n > 1 ? 0.2 : 0.26), t, k + (e.seed || 0), pal);
    }
  };

  /** Cloche : un dôme évasé, un battant qui balance ; des tuyaux d'orgue s'il en a. */
  S.bell = (ctx, e, t, pal, A, r, lw) => {
    if (A.pipes) {
      for (let k = 0; k < A.pipes; k++) {
        const x = (k / (A.pipes - 1) - 0.5) * r * 2.2;
        const hh = r * (0.9 + Math.abs(Math.sin(k * 1.9)) * 0.9);
        ctx.fillStyle = pal.light; ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.6;
        ctx.fillRect(x - r * 0.1, -hh, r * 0.2, hh); ctx.strokeRect(x - r * 0.1, -hh, r * 0.2, hh);
        ell(ctx, x, -hh + r * 0.18, r * 0.07, r * 0.05, 0, pal.adark);
      }
    }
    const sw = Math.sin(t * 3 + (e.seed || 0)) * 0.35;
    // ondes du son
    for (let k = 0; k < 2; k++) {
      const p = ((t * 0.8 + k * 0.5) % 1);
      ctx.strokeStyle = U.rgba(pal.accent, 0.5 * (1 - p)); ctx.lineWidth = lw * 0.8;
      ctx.beginPath(); ctx.arc(0, 0, r * (1 + p * 0.9), Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    }
    // battant
    const bx = Math.sin(sw) * r * 0.5, by = r * 0.55 + Math.cos(sw) * r * 0.25;
    line(ctx, 0, 0, bx, by, pal.adark, lw);
    circ(ctx, bx, by, r * 0.16, pal.accent, pal.dark, lw * 0.6);
    // dôme
    ctx.beginPath();
    ctx.moveTo(-r * 0.95, r * 0.45);
    ctx.quadraticCurveTo(-r * 0.62, r * 0.3, -r * 0.55, -r * 0.2);
    ctx.quadraticCurveTo(-r * 0.5, -r * 0.85, 0, -r * 0.88);
    ctx.quadraticCurveTo(r * 0.5, -r * 0.85, r * 0.55, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.62, r * 0.3, r * 0.95, r * 0.45);
    ctx.quadraticCurveTo(0, r * 0.62, -r * 0.95, r * 0.45);
    ctx.closePath();
    ctx.fillStyle = pal.body; ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    ell(ctx, -r * 0.2, -r * 0.4, r * 0.12, r * 0.3, 0.2, U.rgba('#ffffff', 0.35));
    ctx.strokeStyle = U.rgba(pal.accent, 0.8); ctx.lineWidth = lw * 0.7;
    ctx.beginPath(); ctx.moveTo(-r * 0.6, r * 0.12); ctx.quadraticCurveTo(0, r * 0.25, r * 0.6, r * 0.12); ctx.stroke();
    eyes(ctx, 0, -r * 0.25, r * 0.36, r * 0.1, pal, A.eyes);
  };

  /** Cerf (vu de dessus) : bois ramifiés, qui portent des chapeaux de champignon ou des cristaux. */
  S.stag = (ctx, e, t, pal, A, r, lw) => {
    const step = (e.anim || 0) * 2.4;
    const legs = [[0.42, -0.4, 0], [0.42, 0.4, Math.PI], [-0.45, -0.38, Math.PI], [-0.45, 0.38, 0]];
    legs.forEach(([x, y, ph]) => ell(ctx, r * x + Math.sin(step + ph) * r * 0.2, r * y * 1.2, r * 0.2, r * 0.11, 0, pal.dark));
    ell(ctx, -r * 0.62, 0, r * 0.14, r * 0.1, 0, pal.light); // queue
    ell(ctx, -r * 0.05, 0, r * 0.7, r * 0.42, 0, pal.body, pal.dark, lw);
    for (let k = 0; k < 4; k++) circ(ctx, -r * 0.35 + k * r * 0.17, (k % 2 ? 1 : -1) * r * 0.12, r * 0.05, U.rgba(pal.light, 0.8));
    // cou et tête
    ell(ctx, r * 0.68, 0, r * 0.3, r * 0.22, 0, pal.body, pal.dark, lw * 0.8);
    ell(ctx, r * 0.95, 0, r * 0.12, r * 0.09, 0, pal.dark);
    // bois : de la tête vers les côtés, en couronne ; ils portent des chapeaux de champignon ou des cristaux
    const bone = U.mix(pal.body, '#f2ead8', 0.7);
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const bx = r * 0.72, by = side * r * 0.12;
      const tx = r * 0.42, ty = side * r * 1.0;
      const cx = r * 1.0, cy = side * r * 0.55;
      ctx.strokeStyle = bone; ctx.lineWidth = lw * 1.3;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.stroke();
      const tips = [[tx, ty]];
      [0.35, 0.6, 0.85].forEach((f, k) => {
        // point de la courbe, puis un andouiller qui part vers l'avant
        const u = 1 - f;
        const sx = u * u * bx + 2 * u * f * cx + f * f * tx, sy = u * u * by + 2 * u * f * cy + f * f * ty;
        const ex = sx + r * (0.32 - k * 0.06), ey = sy + side * r * (0.12 + k * 0.06);
        line(ctx, sx, sy, ex, ey, bone, lw * 0.9);
        tips.push([ex, ey]);
      });
      ctx.lineCap = 'butt';
      tips.forEach(([x, y]) => {
        if (A.antler === 'mushroom') { ell(ctx, x, y, r * 0.16, r * 0.12, 0, pal.accent, pal.dark, lw * 0.4); circ(ctx, x - r * 0.04, y - r * 0.03, r * 0.03, '#ffffff'); circ(ctx, x + r * 0.05, y + r * 0.02, r * 0.025, '#ffffff'); }
        else if (A.antler === 'crystal') poly(ctx, [[x, y - r * 0.14], [x + r * 0.08, y], [x, y + r * 0.14], [x - r * 0.08, y]], U.rgba(pal.accent, 0.9), '#ffffff', lw * 0.3);
        else circ(ctx, x, y, r * 0.04, bone);
      });
      ctx.lineCap = 'round';
    }
    ctx.lineCap = 'butt';
    eyes(ctx, r * 0.78, 0, r * 0.22, r * 0.07, pal, 2);
  };

  /** Sablier : deux ampoules de verre, le sable qui passe ; on le croirait arrêté. */
  S.hourglass = (ctx, e, t, pal, A, r, lw) => {
    const st = Math.sin((e.anim || 0) * 5) * r * 0.06;
    ell(ctx, -r * 0.3, r * 1.02 + st, r * 0.16, r * 0.08, 0, pal.dark);
    ell(ctx, r * 0.3, r * 1.02 - st, r * 0.16, r * 0.08, 0, pal.dark);
    const k = (t * 0.08 + (e.seed || 0)) % 1; // part du sable déjà tombée
    const glass = U.rgba('#ffffff', 0.35);
    // ampoules
    poly(ctx, [[-r * 0.6, -r * 0.82], [r * 0.6, -r * 0.82], [r * 0.08, -r * 0.05], [-r * 0.08, -r * 0.05]], glass, pal.dark, lw * 0.6);
    poly(ctx, [[-r * 0.08, r * 0.05], [r * 0.08, r * 0.05], [r * 0.6, r * 0.82], [-r * 0.6, r * 0.82]], glass, pal.dark, lw * 0.6);
    // sable : il baisse en haut, monte en bas
    const top = 1 - k;
    poly(ctx, [[-r * 0.6 * top, -r * 0.05 - r * 0.77 * top], [r * 0.6 * top, -r * 0.05 - r * 0.77 * top], [r * 0.06, -r * 0.08], [-r * 0.06, -r * 0.08]], pal.body);
    poly(ctx, [[-r * 0.58, r * 0.8], [r * 0.58, r * 0.8], [0, r * (0.8 - 0.6 * k)]], pal.body);
    line(ctx, 0, -r * 0.05, 0, r * 0.75, U.rgba(pal.body, 0.9), lw * 0.5);
    // montants
    ctx.fillStyle = pal.accent; ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.6;
    ctx.fillRect(-r * 0.75, -r * 0.95, r * 1.5, r * 0.13); ctx.strokeRect(-r * 0.75, -r * 0.95, r * 1.5, r * 0.13);
    ctx.fillRect(-r * 0.75, r * 0.82, r * 1.5, r * 0.13); ctx.strokeRect(-r * 0.75, r * 0.82, r * 1.5, r * 0.13);
    line(ctx, -r * 0.68, -r * 0.82, -r * 0.68, r * 0.82, pal.adark, lw * 0.7);
    line(ctx, r * 0.68, -r * 0.82, r * 0.68, r * 0.82, pal.adark, lw * 0.7);
    eyes(ctx, 0, -r * 0.55, r * 0.3, r * 0.09, pal, A.eyes);
  };

  /** Sonde : un corps de métal, deux ailes de panneaux solaires, une antenne qui guette. */
  S.satellite = (ctx, e, t, pal, A, r, lw) => {
    ctx.save(); ctx.rotate(t * 0.25 + (e.seed || 0));
    for (const side of [-1, 1]) {
      line(ctx, side * r * 0.35, 0, side * r * 0.55, 0, pal.dark, lw);
      const x0 = side > 0 ? r * 0.55 : -r * 1.35;
      ctx.fillStyle = pal.accent; ctx.fillRect(x0, -r * 0.28, r * 0.8, r * 0.56);
      ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.6; ctx.strokeRect(x0, -r * 0.28, r * 0.8, r * 0.56);
      ctx.strokeStyle = U.rgba(pal.dark, 0.5); ctx.lineWidth = lw * 0.35;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 + (k / 4) * r * 0.8, -r * 0.28); ctx.lineTo(x0 + (k / 4) * r * 0.8, r * 0.28); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + r * 0.8, 0); ctx.stroke();
    }
    ctx.fillStyle = pal.body; ctx.strokeStyle = pal.dark; ctx.lineWidth = lw;
    ctx.fillRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7); ctx.strokeRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7);
    // antenne parabolique
    line(ctx, 0, -r * 0.35, 0, -r * 0.6, pal.dark, lw * 0.7);
    ctx.beginPath(); ctx.ellipse(0, -r * 0.68, r * 0.3, r * 0.12, 0, 0, TAU); ctx.fillStyle = pal.light; ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw * 0.5; ctx.stroke();
    ctx.restore();
    eyes(ctx, 0, 0, r * 0.26, r * 0.1, pal, A.eyes == null ? 1 : A.eyes);
    if (Math.sin(t * 4 + (e.seed || 0)) > 0.6) circ(ctx, r * 0.25, -r * 0.25, r * 0.07, '#ff4d6d');
  };

  /** Pulsar : un cœur minuscule et deux faisceaux qui tournent. */
  S.pulsar = (ctx, e, t, pal, A, r, lw) => {
    const a = t * (A.spin || 2.4) + (e.seed || 0);
    // lignes de champ
    ctx.strokeStyle = U.rgba(pal.accent, 0.35); ctx.lineWidth = lw * 0.5;
    for (const side of [-1, 1]) for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(side * r * 0.35 * k, 0, r * 0.35 * k, r * 0.5 * k, 0, 0, TAU); ctx.stroke(); }
    // faisceaux
    for (const side of [0, Math.PI]) {
      const b = a + side;
      const g = ctx.createLinearGradient(0, 0, Math.cos(b) * r * 2.2, Math.sin(b) * r * 2.2);
      g.addColorStop(0, U.rgba('#ffffff', 0.9)); g.addColorStop(1, U.rgba(pal.accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(b - 0.16) * r * 2.2, Math.sin(b - 0.16) * r * 2.2); ctx.lineTo(Math.cos(b + 0.16) * r * 2.2, Math.sin(b + 0.16) * r * 2.2); ctx.closePath(); ctx.fill();
    }
    circ(ctx, 0, 0, r * 0.42, pal.body, pal.dark, lw * 0.7);
    circ(ctx, 0, 0, r * 0.22, '#ffffff');
    eyes(ctx, 0, -r * 0.05, r * 0.22, r * 0.07, pal, A.eyes == null ? 2 : A.eyes);
  };

  /** Galaxie-méduse : une ombrelle d'étoiles en spirale, et derrière elle, de longs filaments de gaz. */
  S.medusa = (ctx, e, t, pal, A, r, lw) => {
    const n = A.tentacles || 7;
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const x0 = (k / (n - 1) - 0.5) * r * 1.3;
      const len = r * (1.3 + ((k * 13) % 7) / 7);
      ctx.strokeStyle = U.rgba(k % 2 ? pal.accent : pal.light, 0.6); ctx.lineWidth = lw * (0.9 - (k % 3) * 0.2);
      ctx.beginPath(); ctx.moveTo(x0, r * 0.2);
      for (let s = 1; s <= 6; s++) { const f = s / 6; ctx.lineTo(x0 + Math.sin(t * 2 + k + f * 4) * r * 0.18 * f, r * 0.2 + len * f); }
      ctx.stroke();
      for (let s = 2; s <= 6; s += 2) circ(ctx, x0 + Math.sin(t * 2 + k + (s / 6) * 4) * r * 0.18 * (s / 6), r * 0.2 + len * (s / 6), r * 0.04, '#fff0c0');
    }
    ctx.lineCap = 'butt';
    // ombrelle
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.7, 0, Math.PI, 0); ctx.quadraticCurveTo(0, r * 0.45, -r * 0.95, 0); ctx.closePath();
    ctx.fillStyle = U.rgba(pal.body, 0.92); ctx.fill(); ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    // la spirale d'étoiles dans l'ombrelle
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.7, 0, Math.PI, 0); ctx.closePath(); ctx.clip();
    for (let a = 0; a < 2; a++) for (let s = 0; s < 10; s++) {
      const d = s / 10, ang = a * Math.PI + d * 3.6 + t * 0.4;
      circ(ctx, Math.cos(ang) * r * 0.8 * d, -r * 0.25 + Math.sin(ang) * r * 0.45 * d, r * (0.08 - d * 0.04), U.rgba(s % 3 ? '#fff0c0' : pal.accent, 0.9 - d * 0.5));
    }
    ctx.restore();
    circ(ctx, 0, -r * 0.25, r * 0.12, '#fff6d0');
    eyes(ctx, 0, -r * 0.05, r * 0.4, r * 0.08, pal, A.eyes);
  };

  /** Nœud : des boucles de fil emmêlées qui tournent les unes dans les autres. */
  S.knot = (ctx, e, t, pal, A, r, lw) => {
    const n = A.loops || 4;
    ctx.lineCap = 'round';
    for (let k = 0; k < n; k++) {
      const rot = (k / n) * Math.PI + t * (k % 2 ? 0.5 : -0.4);
      ctx.strokeStyle = k % 2 ? pal.accent : pal.body; ctx.lineWidth = lw * 1.3;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.38, rot, 0, TAU); ctx.stroke();
      ctx.strokeStyle = U.rgba('#ffffff', 0.5); ctx.lineWidth = lw * 0.4;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 0.38, rot, 0.4, 1.4); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    circ(ctx, 0, 0, r * 0.3, pal.dark, pal.accent, lw * 0.6);
    // bouts de fil qui dépassent
    for (const side of [-1, 1]) {
      ctx.strokeStyle = pal.accent; ctx.lineWidth = lw * 0.9;
      ctx.beginPath(); ctx.moveTo(side * r * 0.9, side * r * 0.3); ctx.quadraticCurveTo(side * r * 1.25, side * r * (0.2 + Math.sin(t * 3) * 0.2), side * r * 1.35, side * r * 0.65); ctx.stroke();
    }
    eyes(ctx, 0, 0, r * 0.2, r * 0.08, pal, A.eyes);
  };

  /** Tache d'encre : une forme symétrique, comme pliée en deux pendant qu'elle était fraîche. */
  S.inkblot = (ctx, e, t, pal, A, r, lw) => {
    const seed = e.def.index || 1;
    const pts = 9;
    const shape = (side) => {
      ctx.beginPath(); ctx.moveTo(0, -r * 0.9);
      for (let k = 1; k < pts; k++) {
        const a = -Math.PI / 2 + (k / pts) * Math.PI;
        const rr = r * (0.55 + 0.45 * Math.abs(Math.sin(k * 2.3 + seed))) * (1 + Math.sin(t * 1.5 + k) * 0.05);
        ctx.lineTo(side * Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.lineTo(0, r * 0.9); ctx.closePath();
    };
    ctx.fillStyle = pal.body;
    for (const side of [-1, 1]) { shape(side); ctx.fill(); }
    // éclaboussures
    for (let k = 0; k < 4; k++) for (const side of [-1, 1]) circ(ctx, side * r * (1 + ((k * 7 + seed) % 5) / 12), r * (-0.6 + k * 0.4), r * (0.06 + (k % 2) * 0.04), pal.body);
    line(ctx, 0, -r * 0.9, 0, r * 0.9, U.rgba(pal.light, 0.35), lw * 0.4);
    for (const side of [-1, 1]) { circ(ctx, side * r * 0.25, -r * 0.15, r * 0.13, '#ffffff'); circ(ctx, side * r * 0.25, -r * 0.13, r * 0.06, pal.eye); }
  };

  /** Origami (vu de dessus) : un animal de papier plié, à facettes ; renard par défaut. */
  S.origami = (ctx, e, t, pal, A, r, lw) => {
    const step = Math.sin((e.anim || 0) * 2.6);
    const ink = U.rgba(pal.dark, 0.7);
    for (const [x, y, ph] of [[0.35, -0.4, 1], [0.35, 0.4, -1], [-0.4, -0.38, -1], [-0.4, 0.38, 1]]) poly(ctx, [[r * x, r * y * 0.6], [r * (x + 0.12 + step * ph * 0.1), r * y * 1.25], [r * (x - 0.08), r * y * 1.15]], U.shade(pal.body, -0.12), ink, lw * 0.4);
    // queue en éventail
    poly(ctx, [[-r * 0.55, 0], [-r * 1.3, -r * 0.35], [-r * 1.15, 0], [-r * 1.3, r * 0.35]], pal.light, ink, lw * 0.5);
    line(ctx, -r * 0.55, 0, -r * 1.15, 0, ink, lw * 0.3);
    // corps : deux facettes, l'une plus sombre
    poly(ctx, [[r * 0.55, 0], [-r * 0.6, -r * 0.42], [-r * 0.6, 0]], pal.body, ink, lw * 0.5);
    poly(ctx, [[r * 0.55, 0], [-r * 0.6, r * 0.42], [-r * 0.6, 0]], U.shade(pal.body, -0.1), ink, lw * 0.5);
    // tête et oreilles
    poly(ctx, [[r * 1.05, 0], [r * 0.5, -r * 0.3], [r * 0.4, 0], [r * 0.5, r * 0.3]], pal.light, ink, lw * 0.5);
    poly(ctx, [[r * 0.55, -r * 0.2], [r * 0.4, -r * 0.55], [r * 0.4, -r * 0.15]], pal.accent, ink, lw * 0.4);
    poly(ctx, [[r * 0.55, r * 0.2], [r * 0.4, r * 0.55], [r * 0.4, r * 0.15]], pal.accent, ink, lw * 0.4);
    line(ctx, r * 0.4, 0, r * 1.05, 0, U.rgba(pal.dark, 0.3), lw * 0.3);
    circ(ctx, r * 0.72, -r * 0.1, r * 0.05, pal.eye); circ(ctx, r * 0.72, r * 0.1, r * 0.05, pal.eye);
  };

  /** Montgolfière : une poche de gaz à bandes, des cordages, et ce qui pend dessous. */
  S.balloon = (ctx, e, t, pal, A, r, lw) => {
    const sway = Math.sin(t * 1.4 + (e.seed || 0)) * r * 0.08;
    // cordages et nacelle (ou tentacules)
    ctx.strokeStyle = pal.adark; ctx.lineWidth = lw * 0.5;
    for (const k of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.moveTo(k * r, r * 0.55); ctx.lineTo(k * r * 0.4 + sway, r * 1.05); ctx.stroke(); }
    if (A.basket) { ctx.fillStyle = pal.adark; ctx.fillRect(-r * 0.22 + sway, r * 1.0, r * 0.44, r * 0.26); }
    else for (let k = 0; k < 4; k++) { ctx.strokeStyle = U.rgba(pal.accent, 0.7); ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo((k - 1.5) * r * 0.15 + sway, r * 1.0); ctx.quadraticCurveTo((k - 1.5) * r * 0.25 + Math.sin(t * 2 + k) * r * 0.15, r * 1.3, (k - 1.5) * r * 0.2 + sway, r * 1.55); ctx.stroke(); }
    // poche
    ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.62); ctx.bezierCurveTo(-r * 1.15, r * 0.1, -r * 0.95, -r * 1.0, 0, -r * 1.0); ctx.bezierCurveTo(r * 0.95, -r * 1.0, r * 1.15, r * 0.1, r * 0.3, r * 0.62); ctx.closePath();
    ctx.fillStyle = pal.body; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = U.rgba(pal.accent, 0.55);
    for (let k = -2; k <= 2; k++) ctx.fillRect(-r * 1.2, k * r * 0.34 - r * 0.07 - r * 0.2, r * 2.4, r * 0.12);
    ctx.restore();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = lw; ctx.stroke();
    ell(ctx, -r * 0.35, -r * 0.55, r * 0.15, r * 0.28, 0.4, U.rgba('#ffffff', 0.3));
    eyes(ctx, 0, -r * 0.1, r * 0.4, r * 0.11, pal, A.eyes);
  };

  Object.assign(AN.Art.NO_ROTATE, { candle: 1, bell: 1, hourglass: 1, satellite: 1, pulsar: 1, medusa: 1, knot: 1, inkblot: 1, balloon: 1 });
})();
