/* Thème graphique commun et icônes dessinées par le code (ressources, équipement). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;

  AN.INK = '#1c2230';
  AN.CYAN = '#2346c8';
  AN.STAMP = '#b3261e';
  AN.PAPER = '#f7f8f7';
  AN.FONT_UI = '"Avenir Next", "Segoe UI", "Helvetica Neue", system-ui, sans-serif';
  AN.FONT_SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';

  const Icons = (AN.Icons = { cache: new Map() });

  /** Dessine l'icône d'une ressource centrée en (0,0), rayon s. */
  Icons.drawRes = function (ctx, id, s, t = 0) {
    const r = D.RESOURCES[id];
    if (!r) return;
    const c = r.color, dark = U.shade(c, -0.45), light = U.shade(c, 0.45);
    ctx.lineWidth = Math.max(1, s * 0.14);
    ctx.strokeStyle = dark;
    ctx.fillStyle = c;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const P = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0] * s, p[1] * s) : ctx.moveTo(p[0] * s, p[1] * s))); ctx.closePath(); ctx.fill(); ctx.stroke(); };
    const C = (x, y, rr, fill = c) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x * s, y * s, rr * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    switch (r.icon) {
      case 'strand':
        ctx.strokeStyle = c; ctx.lineWidth = s * 0.28;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-0.7 * s, (k * 0.35 - 0.3) * s); ctx.quadraticCurveTo(0, (k * 0.35 + 0.4) * s, 0.7 * s, (k * 0.35 - 0.2) * s); ctx.stroke(); }
        break;
      case 'dots': C(-0.35, 0.25, 0.32); C(0.35, 0.2, 0.28); C(0, -0.35, 0.3); break;
      case 'drop': P([[0, -0.9], [0.55, 0.15], [0.45, 0.6], [0, 0.8], [-0.45, 0.6], [-0.55, 0.15]]); ctx.fillStyle = light; ctx.beginPath(); ctx.arc(-0.15 * s, 0.25 * s, 0.14 * s, 0, 7); ctx.fill(); break;
      case 'spark': P([[0, -0.95], [0.22, -0.22], [0.9, -0.1], [0.3, 0.2], [0.45, 0.9], [0, 0.4], [-0.45, 0.9], [-0.3, 0.2], [-0.9, -0.1], [-0.22, -0.22]]); break;
      case 'ingot': P([[-0.8, 0.45], [-0.5, -0.4], [0.5, -0.4], [0.8, 0.45]]); break;
      case 'gear': {
        ctx.beginPath();
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + t; const rr = (i % 2 ? 0.62 : 0.88) * s; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        C(0, 0, 0.25, light);
        break;
      }
      case 'bone':
        ctx.save(); ctx.rotate(-0.6);
        ctx.fillRect(-0.55 * s, -0.16 * s, 1.1 * s, 0.32 * s); ctx.strokeRect(-0.55 * s, -0.16 * s, 1.1 * s, 0.32 * s);
        C(-0.62, -0.18, 0.22); C(-0.62, 0.18, 0.22); C(0.62, -0.18, 0.22); C(0.62, 0.18, 0.22);
        ctx.restore();
        break;
      case 'shard': P([[0, -0.95], [0.5, -0.1], [0.15, 0.9], [-0.45, 0.3]]); ctx.strokeStyle = light; ctx.beginPath(); ctx.moveTo(0, -0.7 * s); ctx.lineTo(0.05 * s, 0.5 * s); ctx.stroke(); break;
      case 'gem': P([[0, -0.9], [0.75, -0.25], [0.45, 0.8], [-0.45, 0.8], [-0.75, -0.25]]); ctx.strokeStyle = light; ctx.beginPath(); ctx.moveTo(-0.75 * s, -0.25 * s); ctx.lineTo(0.75 * s, -0.25 * s); ctx.moveTo(0, -0.9 * s); ctx.lineTo(0, 0.8 * s); ctx.stroke(); break;
      case 'rock': P([[-0.8, 0.3], [-0.5, -0.5], [0.2, -0.75], [0.8, -0.1], [0.6, 0.65], [-0.3, 0.75]]); break;
      case 'pearl': C(0, 0, 0.75); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-0.25 * s, -0.25 * s, 0.2 * s, 0, 7); ctx.fill(); break;
      case 'branch':
        ctx.strokeStyle = c; ctx.lineWidth = s * 0.3;
        ctx.beginPath(); ctx.moveTo(0, 0.9 * s); ctx.lineTo(0, -0.2 * s); ctx.lineTo(-0.5 * s, -0.8 * s); ctx.moveTo(0, -0.1 * s); ctx.lineTo(0.55 * s, -0.7 * s); ctx.moveTo(0, 0.3 * s); ctx.lineTo(-0.55 * s, 0); ctx.stroke();
        break;
      case 'flame': P([[0, -0.95], [0.6, 0], [0.45, 0.65], [0, 0.85], [-0.45, 0.65], [-0.6, 0], [-0.15, -0.3]]); ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(0, 0.35 * s, 0.25 * s, 0, 7); ctx.fill(); break;
      case 'flake':
        ctx.strokeStyle = c; ctx.lineWidth = s * 0.22;
        for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; ctx.beginPath(); ctx.moveTo(Math.cos(a) * -0.9 * s, Math.sin(a) * -0.9 * s); ctx.lineTo(Math.cos(a) * 0.9 * s, Math.sin(a) * 0.9 * s); ctx.stroke(); }
        break;
      case 'scale': P([[0, -0.85], [0.75, -0.3], [0.6, 0.55], [0, 0.85], [-0.6, 0.55], [-0.75, -0.3]]); ctx.strokeStyle = dark; ctx.beginPath(); ctx.arc(0, 0.9 * s, 0.9 * s, -2.3, -0.84); ctx.stroke(); break;
      case 'cell': C(0, 0, 0.8); C(0.15, -0.1, 0.3, dark); break;
      case 'void':
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.INK;
        P([[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]);
        ctx.fillStyle = AN.INK; ctx.beginPath(); ctx.arc(0, 0, 0.12 * s, 0, 7); ctx.fill();
        break;
      case 'orb': {
        const g = ctx.createRadialGradient(-0.2 * s, -0.2 * s, 0.1 * s, 0, 0, 0.85 * s);
        g.addColorStop(0, light); g.addColorStop(1, c);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 0.8 * s, 0, 7); ctx.fill(); ctx.stroke();
        break;
      }
      default: C(0, 0, 0.7);
    }
  };

  /** Icône d'équipement par emplacement. */
  Icons.drawGear = function (ctx, id, s) {
    const g = D.GEAR[id];
    if (!g) return;
    ctx.lineWidth = Math.max(1.2, s * 0.13);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = AN.INK;
    const col = g.color || (g.cost ? D.RESOURCES[Object.keys(g.cost)[0]].color : '#ffffff');
    ctx.fillStyle = col;
    ctx.beginPath();
    switch (g.slot) {
      case 'ranged':
        ctx.moveTo(-0.85 * s, 0.25 * s); ctx.lineTo(0.85 * s, -0.2 * s); ctx.lineTo(0.85 * s, 0.1 * s); ctx.lineTo(-0.2 * s, 0.35 * s); ctx.lineTo(-0.4 * s, 0.8 * s); ctx.lineTo(-0.75 * s, 0.75 * s); ctx.closePath(); break;
      case 'melee':
        ctx.moveTo(-0.7 * s, 0.7 * s); ctx.lineTo(0.55 * s, -0.75 * s); ctx.lineTo(0.8 * s, -0.8 * s); ctx.lineTo(0.75 * s, -0.55 * s); ctx.lineTo(-0.55 * s, 0.85 * s); ctx.closePath(); break;
      case 'armor':
        ctx.moveTo(0, -0.85 * s); ctx.lineTo(0.75 * s, -0.5 * s); ctx.lineTo(0.6 * s, 0.4 * s); ctx.lineTo(0, 0.9 * s); ctx.lineTo(-0.6 * s, 0.4 * s); ctx.lineTo(-0.75 * s, -0.5 * s); ctx.closePath(); break;
      case 'bag':
        ctx.moveTo(-0.7 * s, -0.25 * s); ctx.lineTo(0.7 * s, -0.25 * s); ctx.lineTo(0.6 * s, 0.85 * s); ctx.lineTo(-0.6 * s, 0.85 * s); ctx.closePath();
        ctx.moveTo(-0.3 * s, -0.25 * s); ctx.arc(0, -0.25 * s, 0.3 * s, Math.PI, 0); break;
      case 'tool_harvest': // pic
        ctx.moveTo(-0.9 * s, -0.35 * s); ctx.quadraticCurveTo(0, -0.95 * s, 0.9 * s, -0.35 * s); ctx.lineTo(0.75 * s, -0.25 * s); ctx.quadraticCurveTo(0, -0.65 * s, -0.75 * s, -0.25 * s); ctx.closePath();
        ctx.moveTo(-0.08 * s, -0.55 * s); ctx.lineTo(0.08 * s, -0.55 * s); ctx.lineTo(0.12 * s, 0.9 * s); ctx.lineTo(-0.12 * s, 0.9 * s); ctx.closePath(); break;
      case 'tool_capture': // lanterne de stase
        ctx.moveTo(-0.45 * s, -0.55 * s); ctx.lineTo(0.45 * s, -0.55 * s); ctx.lineTo(0.55 * s, 0.75 * s); ctx.lineTo(-0.55 * s, 0.75 * s); ctx.closePath();
        ctx.moveTo(-0.25 * s, -0.55 * s); ctx.arc(0, -0.55 * s, 0.25 * s, Math.PI, 0); break;
      case 'tool_extract': // module : losange de l'Artefact dans un cadre
        ctx.moveTo(0, -0.9 * s); ctx.lineTo(0.85 * s, 0); ctx.lineTo(0, 0.9 * s); ctx.lineTo(-0.85 * s, 0); ctx.closePath();
        ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.fillStyle = AN.CYAN;
        ctx.moveTo(0, -0.4 * s); ctx.lineTo(0.38 * s, 0); ctx.lineTo(0, 0.4 * s); ctx.lineTo(-0.38 * s, 0); ctx.closePath(); break;
      case 'tool_transport': // caisse sur patins
        ctx.rect(-0.7 * s, -0.6 * s, 1.4 * s, 1.05 * s);
        ctx.moveTo(-0.95 * s, 0.75 * s); ctx.lineTo(0.95 * s, 0.75 * s); ctx.lineTo(0.95 * s, 0.6 * s); ctx.lineTo(-0.8 * s, 0.6 * s); ctx.closePath(); break;
      default:
        ctx.moveTo(-0.35 * s, -0.85 * s); ctx.lineTo(0.35 * s, -0.85 * s); ctx.lineTo(0.35 * s, -0.4 * s); ctx.lineTo(0.65 * s, 0.75 * s); ctx.lineTo(-0.65 * s, 0.75 * s); ctx.lineTo(-0.35 * s, -0.4 * s); ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
  };

  /** URL d'image (data:) d'une icône, pour l'interface HTML. */
  Icons.url = function (kind, id, px = 28) {
    const key = kind + ':' + id + ':' + px;
    let u = Icons.cache.get(key);
    if (u) return u;
    const cv = document.createElement('canvas');
    const dpr = 2;
    cv.width = cv.height = px * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, (px * dpr) / 2, (px * dpr) / 2);
    if (kind === 'res') Icons.drawRes(ctx, id, px * 0.42);
    else if (kind === 'gear') Icons.drawGear(ctx, id, px * 0.4);
    else if (kind === 'egg') {
      const [sid, variant, hue] = String(id).split('|');
      AN.Keys.drawEgg(ctx, 0, 0, px * 0.34, sid, variant || 'commun', Number(hue) || 0, 0);
    }
    else if (kind === 'creature' || kind === 'silhouette') {
      const [sid, variant, hue, foreign] = String(id).split('|');
      const def = D.CREATURE[sid];
      const fake = { def, r: px * 0.27, face: -Math.PI / 2 + 0.6, anim: 0, seed: 0, pal: AN.Art.palette(def, variant || 'commun', Number(hue) || 0, foreign || null), x: 0, y: 0, vx: 0, vy: 0 };
      AN.Art.drawBody(ctx, fake, 0.3, fake.pal);
      if (kind === 'silhouette') {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(28,34,48,0.82)';
        ctx.fillRect(0, 0, cv.width, cv.height);
      }
    }
    u = cv.toDataURL();
    Icons.cache.set(key, u);
    return u;
  };
  Icons.img = (kind, id, px = 28, cls = 'ico') => AN.h('img', { src: Icons.url(kind, id, px), width: px, height: px, class: cls, alt: '' });
  /** Portrait d'une créature de la collection (avec sa variante). */
  Icons.egg = (entry, px = 34) => Icons.img('egg', entry.species + '|' + (entry.variant || 'commun') + '|' + (entry.hueSeed || 0), px, 'ico portrait');
  Icons.creature = (entry, px = 56) => Icons.img('creature', entry.species + '|' + (entry.variant || 'commun') + '|' + (entry.hueSeed || 0) + '|' + (entry.foreign || ''), px, 'ico portrait');
})();
