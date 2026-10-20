/* Dessin des peuples : habitants vus de dessus et architecture propre à chacun.
   Les habitants passent par le même moteur que les créatures (forme « npc »). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const TAU = Math.PI * 2;

  const CA = (AN.CivArt = {});

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

  /**
   * Habitant (repère local : regarde vers +x). Appelé par creatureArt pour la forme « npc ».
   * A = def.art : { people, role }
   */
  CA.drawPerson = function (ctx, e, t, pal, A, r, lw) {
    const P = D.PEOPLE[A.people] || D.PEOPLES[0];
    const b = P.body;
    const cloth = pal.body, trim = pal.accent, skin = b.skin, dark = pal.dark;
    const step = Math.sin(e.anim * 2.2);
    // jambes / pas
    ell(ctx, -r * 0.1 + step * r * 0.25, -r * 0.42, r * 0.28, r * 0.18, 0, dark);
    ell(ctx, -r * 0.1 - step * r * 0.25, r * 0.42, r * 0.28, r * 0.18, 0, dark);
    // accessoire selon le rôle
    const role = A.role;
    if (role === 'guard') {
      ctx.strokeStyle = '#3a3026'; ctx.lineWidth = r * 0.16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.6); ctx.lineTo(r * 1.5, r * 0.45); ctx.stroke();
      poly(ctx, [[r * 1.5, r * 0.3], [r * 1.95, r * 0.45], [r * 1.5, r * 0.6]], '#d8d8d8', dark, lw * 0.5);
    } else if (role === 'archer') {
      ctx.strokeStyle = '#5a4630'; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.arc(r * 0.6, 0, r * 0.9, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(r * 0.6 + Math.cos(-1.2) * r * 0.9, Math.sin(-1.2) * r * 0.9); ctx.lineTo(r * 0.6 + Math.cos(1.2) * r * 0.9, Math.sin(1.2) * r * 0.9); ctx.stroke();
    } else if (role === 'leader') {
      ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = r * 0.14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.75); ctx.lineTo(r * 1.1, -r * 0.95); ctx.stroke();
      circ(ctx, r * 1.15, -r * 0.97, r * 0.24, b.mark, dark, lw * 0.5);
    } else if (role === 'villager' && (e.seed | 0) % 3 === 0) {
      ell(ctx, -r * 0.75, r * 0.35, r * 0.35, r * 0.28, 0.4, '#b89a6a', dark, lw * 0.5); // baluchon
    }
    // corps
    switch (b.shape) {
      case 'robe':
        ell(ctx, -r * 0.15, 0, r * 0.95, r * 0.8, 0, cloth, dark, lw);
        ctx.strokeStyle = trim; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.62, -1.3, 1.3); ctx.stroke();
        break;
      case 'armor':
        ell(ctx, -r * 0.1, 0, r * 0.85, r * 0.78, 0, cloth, dark, lw);
        for (let k = -1; k <= 1; k++) { ctx.strokeStyle = U.rgba(trim, 0.8); ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(-r * 0.5 + k * r * 0.25, -r * 0.6); ctx.lineTo(-r * 0.5 + k * r * 0.25, r * 0.6); ctx.stroke(); }
        break;
      case 'automaton':
        ctx.beginPath(); ctx.roundRect(-r * 0.9, -r * 0.75, r * 1.5, r * 1.5, r * 0.25);
        ctx.fillStyle = cloth; ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = lw; ctx.stroke();
        circ(ctx, -r * 0.55, -r * 0.45, r * 0.09, trim); circ(ctx, -r * 0.55, r * 0.45, r * 0.09, trim);
        break;
      case 'cap':
        ell(ctx, -r * 0.2, 0, r * 0.7, r * 0.62, 0, U.shade(cloth, -0.2), dark, lw);
        break;
      case 'sailor':
        poly(ctx, [[r * 0.2, -r * 0.75], [-r * 1.1, -r * 0.95], [-r * 1.25, 0], [-r * 1.1, r * 0.95], [r * 0.2, r * 0.75]], cloth, dark, lw);
        break;
      case 'insect':
        ell(ctx, -r * 0.75, 0, r * 0.62, r * 0.5, 0, U.shade(cloth, -0.1), dark, lw);
        for (let k = 0; k < 2; k++) { ctx.strokeStyle = trim; ctx.lineWidth = r * 0.12; ctx.beginPath(); ctx.arc(-r * 0.75 + (k - 0.5) * r * 0.35, 0, r * 0.4, -1.1, 1.1); ctx.stroke(); }
        ell(ctx, -r * 0.05, 0, r * 0.45, r * 0.42, 0, cloth, dark, lw);
        break;
      case 'stone':
        poly(ctx, [[r * 0.4, -r * 0.6], [-r * 0.5, -r * 0.85], [-r * 1.0, -r * 0.1], [-r * 0.6, r * 0.8], [r * 0.4, r * 0.65], [r * 0.6, 0]], cloth, dark, lw);
        circ(ctx, -r * 0.35, -r * 0.2, r * 0.12, trim);
        break;
      case 'hood':
        ell(ctx, -r * 0.2, 0, r * 1.0, r * 0.82, 0, cloth, '#000000', lw);
        break;
      default:
        circ(ctx, 0, 0, r * 0.8, cloth, dark, lw);
    }
    // tête
    const hx = r * 0.35;
    switch (b.shape) {
      case 'automaton':
        circ(ctx, hx, 0, r * 0.42, U.shade(cloth, 0.15), dark, lw);
        circ(ctx, hx + r * 0.12, 0, r * 0.2, b.mark);
        break;
      case 'cap':
        circ(ctx, hx - r * 0.1, 0, r * 0.95, cloth, dark, lw);
        for (let k = 0; k < 4; k++) circ(ctx, hx - r * 0.1 + Math.cos(k * 1.7) * r * 0.5, Math.sin(k * 1.7) * r * 0.5, r * 0.14, trim);
        break;
      case 'sailor':
        circ(ctx, hx, 0, r * 0.4, skin, dark, lw);
        ell(ctx, hx - r * 0.05, 0, r * 0.62, r * 0.62, 0, null, dark, lw);
        ctx.strokeStyle = trim; ctx.lineWidth = lw * 1.2; ctx.beginPath(); ctx.arc(hx - r * 0.05, 0, r * 0.62, 0, TAU); ctx.stroke();
        break;
      case 'insect':
        circ(ctx, hx + r * 0.15, 0, r * 0.32, cloth, dark, lw);
        ctx.strokeStyle = dark; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(hx + r * 0.4, -r * 0.15); ctx.lineTo(hx + r * 0.75, -r * 0.3); ctx.moveTo(hx + r * 0.4, r * 0.15); ctx.lineTo(hx + r * 0.75, r * 0.3); ctx.stroke();
        circ(ctx, hx + r * 0.25, -r * 0.14, r * 0.08, b.mark); circ(ctx, hx + r * 0.25, r * 0.14, r * 0.08, b.mark);
        break;
      case 'stone':
        circ(ctx, hx - r * 0.05, 0, r * 0.32, U.shade(cloth, 0.1), dark, lw);
        break;
      case 'hood':
        circ(ctx, hx, 0, r * 0.45, cloth, '#000000', lw);
        ctx.fillStyle = b.mark; ctx.fillRect(hx + r * 0.05, -r * 0.2, r * 0.3, r * 0.4);
        break;
      default:
        circ(ctx, hx, 0, r * 0.42, skin, dark, lw);
        if (b.shape === 'robe') { ctx.strokeStyle = trim; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(hx, 0, r * 0.48, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke(); }
        if (b.shape === 'armor') { ctx.fillStyle = trim; ctx.fillRect(hx + r * 0.15, -r * 0.08, r * 0.2, r * 0.16); }
    }
    if (role === 'leader') {
      for (let k = -1; k <= 1; k++) poly(ctx, [[hx - r * 0.3, k * r * 0.22 - r * 0.06], [hx - r * 0.65, k * r * 0.3], [hx - r * 0.3, k * r * 0.22 + r * 0.06]], b.mark);
    }
    if (role === 'thief' && e.revealed) { ctx.fillStyle = '#1c2230'; ctx.fillRect(hx - r * 0.1, -r * 0.42, r * 0.25, r * 0.84); }
  };

  /* ---------- architecture ---------- */
  /**
   * Bâtiment vu de dessus, avec un léger relief. Centré en (x, y), taille s (côté en pixels).
   * kind : 'house' | 'ark', style : style du peuple.
   */
  CA.drawBuilding = function (ctx, x, y, s, style, P, kind, variant, t, seed) {
    const b = P.body;
    const ink = AN.INK;
    const lw = Math.max(1, s * 0.035);
    ctx.save();
    ctx.translate(x, y);
    // ombre
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(s * 0.08, s * 0.16, s * (kind === 'ark' ? 0.75 : 0.52), s * 0.36, 0, 0, TAU); ctx.fill();
    if (kind === 'ark') { drawArk(ctx, s, style, P, t, lw); ctx.restore(); return; }
    if (kind === 'market' || kind === 'hall' || kind === 'palace') { drawPublic(ctx, s, style, P, kind, variant, t, seed || 0, lw); ctx.restore(); return; }
    const v = variant || 0;
    switch (style) {
      case 'shrine': {
        // petit temple de pierre pâle : socle octogonal, colonnes, coupole
        const oct = [];
        for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + Math.PI / 8 + v * 0.15; oct.push([Math.cos(a) * s * 0.46, Math.sin(a) * s * 0.42]); }
        poly(ctx, oct, '#d9d5ca', ink, lw);
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + v * 0.3; circ(ctx, Math.cos(a) * s * 0.33, Math.sin(a) * s * 0.3, s * 0.05, '#f4f2ec', ink, lw * 0.6); }
        circ(ctx, 0, -s * 0.02, s * 0.24, '#eeece6', ink, lw);
        circ(ctx, -s * 0.06, -s * 0.08, s * 0.14, '#fbfaf7');
        circ(ctx, 0, -s * 0.02, s * 0.045, b.mark);
        // marches
        ctx.fillStyle = '#c8c3b6'; ctx.fillRect(-s * 0.12, s * 0.3, s * 0.24, s * 0.12);
        ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.6; ctx.strokeRect(-s * 0.12, s * 0.3, s * 0.24, s * 0.12);
        break;
      }
      case 'forge': {
        circ(ctx, 0, 0, s * 0.44, '#4a3d33', ink, lw);
        circ(ctx, -s * 0.05, -s * 0.05, s * 0.3, '#5e4d40');
        ctx.fillStyle = '#2a201a'; ctx.fillRect(s * 0.12, -s * 0.38, s * 0.16, s * 0.2);
        const glow = 0.6 + Math.sin(t * 4 + seed) * 0.2;
        ctx.fillStyle = U.rgba('#ff7a3a', glow); ctx.beginPath(); ctx.arc(s * 0.3, s * 0.12, s * 0.1, 0, TAU); ctx.fill();
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.5 + k / 3 + seed % 1) % 1;
          ctx.fillStyle = U.rgba('#8a8078', 0.4 * (1 - ph));
          ctx.beginPath(); ctx.arc(s * 0.2 + ph * s * 0.2, -s * 0.45 - ph * s * 0.6, s * (0.08 + ph * 0.12), 0, TAU); ctx.fill();
        }
        break;
      }
      case 'tower': {
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + Math.PI / 6; ctx.lineTo(Math.cos(a) * s * 0.42, Math.sin(a) * s * 0.42); }
        ctx.closePath(); ctx.fillStyle = '#7d746a'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
        ctx.save(); ctx.rotate(t * 0.6 * (v % 2 ? -1 : 1));
        ctx.strokeStyle = '#b8863b'; ctx.lineWidth = lw * 1.5;
        ctx.beginPath(); ctx.arc(0, 0, s * 0.2, 0, TAU); ctx.stroke();
        for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2); ctx.lineTo(Math.cos(a) * s * 0.27, Math.sin(a) * s * 0.27); ctx.stroke(); }
        ctx.restore();
        circ(ctx, 0, 0, s * 0.07, Math.random() < 0.02 ? '#ffffff' : b.mark);
        break;
      }
      case 'mushroom': {
        circ(ctx, 0, 0, s * 0.46, '#6a5a90', ink, lw);
        circ(ctx, -s * 0.06, -s * 0.06, s * 0.36, '#7d6aa8');
        for (let k = 0; k < 6; k++) circ(ctx, Math.cos(k * 1.3 + v) * s * 0.26, Math.sin(k * 1.3 + v) * s * 0.26, s * 0.06, b.trim);
        ctx.fillStyle = U.rgba('#c8f26a', 0.5 + Math.sin(t * 2 + seed) * 0.2); ctx.beginPath(); ctx.arc(s * 0.32, s * 0.18, s * 0.05, 0, TAU); ctx.fill();
        break;
      }
      case 'boat': {
        ctx.save(); ctx.rotate(v * 0.5 - 0.3);
        poly(ctx, [[s * 0.5, 0], [s * 0.25, -s * 0.26], [-s * 0.45, -s * 0.22], [-s * 0.5, 0], [-s * 0.45, s * 0.22], [s * 0.25, s * 0.26]], '#6a4a30', ink, lw);
        ctx.fillStyle = '#8a6a48'; ctx.fillRect(-s * 0.35, -s * 0.14, s * 0.6, s * 0.28);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.4); ctx.lineTo(-s * 0.05, s * 0.4); ctx.stroke();
        ctx.fillStyle = '#e2d6aa'; ctx.beginPath(); ctx.moveTo(-s * 0.05, -s * 0.36); ctx.quadraticCurveTo(s * 0.2 + Math.sin(t + seed) * s * 0.03, 0, -s * 0.05, s * 0.36); ctx.closePath(); ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
        ctx.restore();
        break;
      }
      case 'hive': {
        for (let k = 0; k < 7; k++) {
          const a = k === 0 ? 0 : ((k - 1) / 6) * TAU;
          const cx = k === 0 ? 0 : Math.cos(a) * s * 0.26, cy = k === 0 ? 0 : Math.sin(a) * s * 0.26;
          ctx.beginPath();
          for (let j = 0; j < 6; j++) { const aa = (j / 6) * TAU + Math.PI / 6; ctx.lineTo(cx + Math.cos(aa) * s * 0.15, cy + Math.sin(aa) * s * 0.15); }
          ctx.closePath(); ctx.fillStyle = k % 2 ? '#c4923a' : '#d8a64a'; ctx.fill(); ctx.strokeStyle = '#5a3c16'; ctx.lineWidth = lw; ctx.stroke();
        }
        circ(ctx, 0, 0, s * 0.06, '#3a2c16');
        break;
      }
      case 'cairn': {
        for (let k = 0; k < 4; k++) circ(ctx, Math.cos(k * 1.6 + v) * s * 0.22, Math.sin(k * 1.6 + v) * s * 0.18, s * (0.24 - k * 0.02), k % 2 ? '#8a9488' : '#a2ac9c', ink, lw);
        poly(ctx, [[0, -s * 0.36], [s * 0.08, -s * 0.12], [0, -s * 0.02], [-s * 0.08, -s * 0.12]], U.rgba('#b9f0d0', 0.9), ink, lw * 0.6);
        break;
      }
      case 'obelisk': {
        poly(ctx, [[0, -s * 0.48], [s * 0.2, -s * 0.2], [s * 0.2, s * 0.4], [-s * 0.2, s * 0.4], [-s * 0.2, -s * 0.2]], '#1c2230', '#000000', lw);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(-s * 0.08, -s * 0.05, s * 0.16, s * 0.16);
        break;
      }
      default:
        circ(ctx, 0, 0, s * 0.42, '#c8b898', ink, lw);
    }
    ctx.restore();
  };

  /**
   * Bâtiments publics d'une ville (1.12) : le comptoir (un étal sous un auvent aux couleurs
   * du peuple), la caserne (une longue salle, des bannières) et le palais de la capitale
   * (une enceinte, quatre tours, et au centre une maison du peuple, en grand).
   */
  function drawPublic(ctx, s, style, P, kind, variant, t, seed, lw) {
    const b = P.body;
    const ink = AN.INK;
    const banner = (x, y, k) => {
      line(ctx, x, y, x, y - s * 0.3, '#5a4a3a', lw);
      const wave = Math.sin(t * 3 + seed + k) * s * 0.02;
      poly(ctx, [[x, y - s * 0.3], [x + s * 0.12 + wave, y - s * 0.27], [x + s * 0.1, y - s * 0.2], [x + s * 0.12 + wave, y - s * 0.14], [x, y - s * 0.16]], b.trim, ink, lw * 0.5);
      circ(ctx, x + s * 0.05, y - s * 0.22, s * 0.02, b.mark);
    };
    if (kind === 'market') {
      // étal et marchandises
      ctx.fillStyle = '#8a6a48'; ctx.fillRect(-s * 0.42, -s * 0.05, s * 0.84, s * 0.26);
      ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.strokeRect(-s * 0.42, -s * 0.05, s * 0.84, s * 0.26);
      const goods = ['#e8582a', '#4fb6e8', '#e6c23a', '#4fa864', '#cfc6e8', b.mark];
      for (let k = 0; k < 6; k++) circ(ctx, -s * 0.34 + k * s * 0.135, s * 0.07, s * 0.045, goods[(k + (variant || 0)) % goods.length], ink, lw * 0.4);
      // auvent rayé, bord festonné
      const w = s * 0.5, top = -s * 0.32, bot = -s * 0.06;
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = k % 2 ? '#f4f2ec' : b.trim;
        ctx.fillRect(-w + k * (w / 3), top, w / 3 + 0.5, bot - top);
      }
      ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.strokeRect(-w, top, w * 2, bot - top);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#f4f2ec' : b.trim; ctx.beginPath(); ctx.arc(-w + (k + 0.5) * (w / 3), bot, w / 6, 0, Math.PI); ctx.fill(); ctx.stroke(); }
      // caisses
      for (const [x, y] of [[-s * 0.48, s * 0.28], [s * 0.4, s * 0.3]]) { ctx.fillStyle = '#a8865e'; ctx.fillRect(x, y, s * 0.1, s * 0.09); ctx.strokeRect(x, y, s * 0.1, s * 0.09); }
      return;
    }
    if (kind === 'hall') {
      ctx.fillStyle = U.shade(b.cloth, -0.15); ctx.fillRect(-s * 0.45, -s * 0.28, s * 0.9, s * 0.56);
      ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.strokeRect(-s * 0.45, -s * 0.28, s * 0.9, s * 0.56);
      ctx.fillStyle = U.shade(b.cloth, 0.12);
      poly(ctx, [[-s * 0.45, -s * 0.28], [s * 0.45, -s * 0.28], [s * 0.38, -s * 0.02], [-s * 0.38, -s * 0.02]], U.shade(b.cloth, 0.12), ink, lw * 0.6);
      line(ctx, -s * 0.38, -s * 0.02, s * 0.38, -s * 0.02, ink, lw * 0.6);
      // porte, râtelier
      ctx.fillStyle = '#2a201a'; ctx.fillRect(-s * 0.07, s * 0.1, s * 0.14, s * 0.18);
      for (let k = 0; k < 4; k++) line(ctx, s * 0.18 + k * s * 0.05, s * 0.06, s * 0.2 + k * s * 0.05, s * 0.26, '#c8c0b0', lw * 0.6);
      // bouclier du peuple
      circ(ctx, -s * 0.24, s * 0.14, s * 0.07, b.trim, ink, lw * 0.6); circ(ctx, -s * 0.24, s * 0.14, s * 0.025, b.mark);
      banner(-s * 0.4, -s * 0.28, 0); banner(s * 0.32, -s * 0.28, 1);
      return;
    }
    // palais : enceinte, tours d'angle, et la maison du peuple au centre, en grand
    const R = s * 0.48;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + Math.PI / 8; ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R * 0.8); }
    ctx.closePath(); ctx.fillStyle = '#cfc8b8'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = lw * 1.4; ctx.stroke();
    ctx.beginPath();
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + Math.PI / 8; ctx.lineTo(Math.cos(a) * R * 0.82, Math.sin(a) * R * 0.66); }
    ctx.closePath(); ctx.fillStyle = '#e6e0d2'; ctx.fill();
    ctx.save(); ctx.scale(0.62, 0.62); CA.drawBuilding(ctx, 0, 0, s, style, P, 'house', variant, t, seed); ctx.restore();
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4;
      const x = Math.cos(a) * R * 0.92, y = Math.sin(a) * R * 0.74;
      circ(ctx, x, y, s * 0.07, '#bdb5a2', ink, lw);
      circ(ctx, x, y, s * 0.03, b.mark);
    }
    banner(-s * 0.05, -R * 0.78, 2); banner(s * 0.12, -R * 0.78, 3);
  }

  function drawArk(ctx, s, style, P, t, lw) {
    const b = P.body;
    const ink = AN.INK;
    const hull = style === 'boat' ? '#6a4a30' : style === 'tower' || style === 'forge' ? '#5a5048' : style === 'hive' ? '#c4923a' : style === 'mushroom' ? '#6a5a90' : '#d8d4c8';
    poly(ctx, [[s * 0.8, 0], [s * 0.45, -s * 0.36], [-s * 0.7, -s * 0.32], [-s * 0.85, 0], [-s * 0.7, s * 0.32], [s * 0.45, s * 0.36]], hull, ink, lw * 1.4);
    ctx.fillStyle = U.shade(hull, 0.15); ctx.fillRect(-s * 0.55, -s * 0.18, s * 0.95, s * 0.36);
    for (let k = 0; k < 4; k++) circ(ctx, -s * 0.4 + k * s * 0.25, 0, s * 0.06, U.rgba(b.mark, 0.6 + Math.sin(t * 3 + k) * 0.3));
    // échafaudage
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = lw;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.7 + k * s * 0.35, -s * 0.45); ctx.lineTo(-s * 0.7 + k * s * 0.35, -s * 0.32); ctx.stroke(); }
  }

  /** Portrait d'un habitant pour l'interface. */
  CA.portrait = function (peopleId, role, px = 72) {
    const key = 'pp:' + peopleId + ':' + role + ':' + px;
    const cache = AN.Icons.cache;
    let u = cache.get(key);
    if (!u) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = px * 2;
      const ctx = cv.getContext('2d');
      ctx.setTransform(2, 0, 0, 2, px, px);
      const def = AN.Civ.def(peopleId, role);
      const e = { def, r: px * 0.3, face: -Math.PI / 2, anim: 0, seed: 1, pal: AN.Art.palette(def, 'commun', 0), x: 0, y: 0, vx: 0, vy: 0 };
      AN.Art.drawBody(ctx, e, 0, e.pal);
      u = cv.toDataURL();
      cache.set(key, u);
    }
    return AN.h('img', { src: u, width: px, height: px, class: 'ico portrait', alt: '' });
  };
})();
