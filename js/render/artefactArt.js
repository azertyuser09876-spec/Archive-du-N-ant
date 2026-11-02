/* L'Artefact (1.14) : six formes, chacune avec sa petite animation, et sa couleur
   (celle de votre réputation). Dessin pur : la forme et la couleur sont choisies
   par AN.Story (game/story.js).
     losange  : le losange flottant et ses cadres carrés (la forme d'origine) ;
     anneaux  : des anneaux inclinés qui tournent autour de lui ;
     fissures : il s'est fendu, la lumière passe par les fêlures ;
     cadre    : un double cadre hexagonal, à la forme des cases ;
     etoile   : huit rayons qui respirent ;
     oeil     : un œil qui cligne et regarde où l'on va. */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;
  const TAU = Math.PI * 2;

  const AA = (AN.ArtefactArt = {});
  AA.FORMS = ['losange', 'anneaux', 'fissures', 'cadre', 'etoile', 'oeil'];

  function diamond(ctx, s, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.72, 0); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function hex(ctx, R, rot) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = rot + (i / 6) * TAU; const x = Math.cos(a) * R, y = Math.sin(a) * R; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath();
  }
  /** Fêlures de lumière, toujours les mêmes pour un nombre donné. */
  function cracks(ctx, n, len, col, t, alpha) {
    const rng = AN.RNG.from(17, 'fissures');
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng.float(-0.3, 0.3);
      const L = len * rng.float(0.65, 1.1);
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7);
      ctx.strokeStyle = U.rgba(col, alpha * pulse);
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      let x = 0, y = 0;
      for (let k = 1; k <= 3; k++) { const d = (L * k) / 3; const j = rng.float(-0.35, 0.35); x = Math.cos(a + j) * d; y = Math.sin(a + j) * d; ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.strokeStyle = U.rgba('#ffffff', alpha * pulse * 0.9); ctx.lineWidth = 0.9; ctx.stroke();
    }
    ctx.restore();
  }

  const FORM = {
    losange(ctx, t, c, o) {
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate(t * (0.3 + i * 0.25) * (i % 2 ? -1 : 1) + i * 0.4);
        const s = 10 + i * 7;
        ctx.strokeStyle = i === 0 ? c : U.rgba(AN.INK, 0.9 - i * 0.18);
        ctx.lineWidth = i === 0 ? 3 : 1.5;
        ctx.strokeRect(-s, -s, s * 2, s * 2);
        ctx.restore();
      }
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 0); ctx.lineTo(0, 7); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
    },
    anneaux(ctx, t, c, o) {
      // l'ancien cadre, petit, et trois anneaux inclinés qui tournent
      ctx.save(); ctx.rotate(t * 0.3); ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.strokeRect(-10, -10, 20, 20); ctx.restore();
      for (let i = 0; i < 3; i++) {
        const tilt = i * (Math.PI / 3) + t * 0.15 * (i % 2 ? -1 : 1);
        const open = 0.28 + 0.22 * Math.abs(Math.sin(t * (0.5 + i * 0.2) + i));
        ctx.save(); ctx.rotate(tilt);
        ctx.strokeStyle = i === 0 ? c : U.rgba(AN.INK, 0.75 - i * 0.15); ctx.lineWidth = i === 0 ? 2.4 : 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, 30 - i * 3, (30 - i * 3) * open, 0, 0, TAU); ctx.stroke();
        // une perle qui court sur l'anneau
        const a = t * (1.2 + i * 0.4) + i * 2;
        ctx.fillStyle = i === 0 ? c : AN.INK;
        ctx.beginPath(); ctx.arc(Math.cos(a) * (30 - i * 3), Math.sin(a) * (30 - i * 3) * open, 2.2, 0, TAU); ctx.fill();
        ctx.restore();
      }
      diamond(ctx, 9, c);
    },
    fissures(ctx, t, c, o) {
      // les anneaux sont rompus : des arcs, avec des trous
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.rotate(t * (0.25 + i * 0.12) * (i % 2 ? -1 : 1) + i);
        ctx.strokeStyle = U.rgba(AN.INK, 0.7 - i * 0.15); ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, 24 + i * 7, k * (TAU / 3), k * (TAU / 3) + TAU / 3 - 0.6 - i * 0.2); ctx.stroke(); }
        ctx.restore();
      }
      cracks(ctx, o.cracks || 4, 30, c, t, 0.85);
      diamond(ctx, 12, '#ffffff', c);
      ctx.save(); ctx.clip(); cracks(ctx, o.cracks || 4, 14, c, t, 1); ctx.restore();
      ctx.lineWidth = 2.2; diamond(ctx, 12, null, c);
    },
    cadre(ctx, t, c, o) {
      // deux hexagones qui tournent en sens contraire, et six nœuds aux angles
      ctx.lineWidth = 2.6; ctx.strokeStyle = c; hex(ctx, 34, t * 0.12); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.strokeStyle = U.rgba(AN.INK, 0.7); hex(ctx, 25, -t * 0.2 + 0.3); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = t * 0.12 + (i / 6) * TAU;
        ctx.fillStyle = (i + Math.floor(t * 1.5)) % 6 === 0 ? c : AN.INK;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 34, Math.sin(a) * 34, 2.6, 0, TAU); ctx.fill();
      }
      cracks(ctx, Math.max(2, (o.cracks || 4) - 2), 18, c, t, 0.6); // les fêlures, refermées par la lumière
      diamond(ctx, 11, c);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, TAU); ctx.fill();
    },
    etoile(ctx, t, c, o) {
      ctx.lineWidth = 1; ctx.strokeStyle = U.rgba(AN.INK, 0.25); hex(ctx, 30, t * 0.05); ctx.stroke();
      ctx.save(); ctx.rotate(t * 0.08); ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const L = (i % 2 ? 26 : 40) + Math.sin(t * 2 + i) * 5;
        const g = ctx.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L);
        g.addColorStop(0, U.rgba(c, 0.95)); g.addColorStop(1, U.rgba(c, 0));
        ctx.strokeStyle = g; ctx.lineWidth = i % 2 ? 2 : 3.2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.stroke();
      }
      ctx.restore();
      diamond(ctx, 10, c);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, TAU); ctx.fill();
    },
    oeil(ctx, t, c, o) {
      // les rayons, plus pâles, et l'œil qui cligne de temps en temps
      ctx.save(); ctx.rotate(t * 0.05);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; ctx.strokeStyle = U.rgba(c, 0.25); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); ctx.lineTo(Math.cos(a) * 44, Math.sin(a) * 44); ctx.stroke(); }
      ctx.restore();
      const cyc = t % 6.5;
      const open = cyc > 6.25 ? Math.abs(cyc - 6.375) / 0.125 : 1; // un battement de paupière
      const W = 30, Hh = 15 * Math.max(0.06, open);
      ctx.beginPath(); ctx.moveTo(-W, 0); ctx.quadraticCurveTo(0, -Hh * 1.9, W, 0); ctx.quadraticCurveTo(0, Hh * 1.9, -W, 0); ctx.closePath();
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.save(); ctx.clip();
      const lx = U.clamp(o.lookX || 0, -1, 1) * 9, ly = U.clamp(o.lookY || 0, -1, 1) * 4;
      ctx.fillStyle = U.rgba(c, 0.9); ctx.beginPath(); ctx.arc(lx, ly, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = AN.INK; ctx.translate(lx, ly); diamond(ctx, 5.5, AN.INK);
      ctx.restore();
      ctx.strokeStyle = AN.INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-W, 0); ctx.quadraticCurveTo(0, -Hh * 1.9, W, 0); ctx.quadraticCurveTo(0, Hh * 1.9, -W, 0); ctx.closePath(); ctx.stroke();
    },
  };

  /**
   * Dessine l'Artefact en (x, y).
   * o : { form, color, cracks, k (opacité), size, still (sans flotter), shadow, dead (éteint),
   *       lookX, lookY (où regarde l'œil, de −1 à 1), morph : { from, k } (transformation en cours) }
   */
  AA.draw = function (ctx, x, y, t, o = {}) {
    const size = o.size || 1;
    const c = o.color || AN.CYAN || '#2346c8';
    ctx.save();
    ctx.translate(x, y + (o.still || o.dead ? 0 : Math.sin(t * 1.3) * 4 * size - 20 * size));
    ctx.scale(size, size);
    ctx.globalAlpha *= o.k == null ? 1 : o.k;
    if (o.shadow !== false && !o.dead) {
      ctx.fillStyle = 'rgba(28,34,48,0.12)';
      ctx.beginPath(); ctx.ellipse(0, 44, 30, 9, 0, 0, TAU); ctx.fill();
    }
    if (!o.dead) {
      const big = o.form === 'etoile' || o.form === 'oeil' ? 95 : 70;
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, big);
      g.addColorStop(0, U.rgba(c, 0.25)); g.addColorStop(1, U.rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, big, 0, TAU); ctx.fill();
    }
    const m = o.morph;
    const draw = (form, alpha, sc) => {
      if (alpha <= 0) return;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.scale(sc, sc);
      (FORM[form] || FORM.losange)(ctx, o.dead ? 0 : t, c, o);
      ctx.restore();
    };
    if (m && m.k < 1) {
      // l'ancienne forme se défait en grandissant, la nouvelle se resserre
      const k = U.clamp(m.k, 0, 1);
      draw(m.from, 1 - U.clamp(k * 1.6, 0, 1), 1 + k * 0.5);
      draw(o.form, U.clamp((k - 0.35) / 0.5, 0, 1), 0.55 + 0.45 * U.easeOut(U.clamp((k - 0.35) / 0.65, 0, 1)));
      ctx.strokeStyle = U.rgba(c, Math.max(0, 1 - k)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 20 + k * 90, 0, TAU); ctx.stroke();
    } else draw(o.form || 'losange', 1, 1);
    ctx.restore();
  };
})();
