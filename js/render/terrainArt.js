/* Rendu des terrains : une zone complète est dessinée une seule fois dans un
   canevas hors écran, puis affichée par morceaux. Même logique pour les
   territoires de l'Archive, à plus petite échelle. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const TAU = Math.PI * 2;

  const Terrain = (AN.Terrain = {});

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  Terrain.canvas = canvas;

  function groundColor(b, s) {
    const g = b.ground;
    return s < 0.45 ? U.mix(g[0], g[1], s / 0.45) : U.mix(g[1], g[2], U.clamp((s - 0.45) / 0.3, 0, 1));
  }

  /** Petit élément de décor au sol. */
  Terrain.decor = function (ctx, d) {
    const s = d.s;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.fillStyle = d.color;
    ctx.strokeStyle = d.color;
    ctx.lineCap = 'round';
    switch (d.type) {
      case 'tuft':
        ctx.lineWidth = 1.4;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 1.6, 3 * s); ctx.lineTo(i * 2.6 * s, -4 * s); ctx.stroke(); }
        break;
      case 'dot': case 'glowdot':
        ctx.globalAlpha = d.type === 'glowdot' ? 0.9 : 0.6;
        ctx.beginPath(); ctx.arc(0, 0, 1.6 * s, 0, TAU); ctx.fill();
        if (d.type === 'glowdot') { ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(0, 0, 6 * s, 0, TAU); ctx.fill(); }
        break;
      case 'pebble': ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.ellipse(0, 0, 3.5 * s, 2.4 * s, 0, 0, TAU); ctx.fill(); break;
      case 'mushroom':
        ctx.beginPath(); ctx.arc(0, 0, 4 * s, 0, TAU); ctx.fill();
        ctx.fillStyle = U.shade(d.color, 0.4); ctx.beginPath(); ctx.arc(-1 * s, -1 * s, 1.3 * s, 0, TAU); ctx.fill();
        break;
      case 'reed': case 'kelp':
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 3 - 3, 5 * s); ctx.quadraticCurveTo(i * 3 - 1, 0, i * 3 - 4, -7 * s); ctx.stroke(); }
        break;
      case 'bolt': ctx.beginPath(); ctx.arc(0, 0, 2.6 * s, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-1.6 * s, -0.4, 3.2 * s, 0.8); break;
      case 'plate': ctx.globalAlpha = 0.6; ctx.fillRect(-6 * s, -4 * s, 12 * s, 8 * s); break;
      case 'bonebit': ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(-5 * s, 0); ctx.lineTo(5 * s, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(-5 * s, 0, 1.8 * s, 0, TAU); ctx.arc(5 * s, 0, 1.8 * s, 0, TAU); ctx.fill(); break;
      case 'crystalbit': case 'shardbit':
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(0, -6 * s); ctx.lineTo(2.4 * s, 0); ctx.lineTo(0, 3 * s); ctx.lineTo(-2.4 * s, 0); ctx.closePath(); ctx.fill();
        break;
      case 'ember': ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, 1.5 * s, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.2; ctx.beginPath(); ctx.arc(0, 0, 4.5 * s, 0, TAU); ctx.fill(); break;
      case 'ashbit': ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.ellipse(0, 0, 5 * s, 2 * s, 0, 0, TAU); ctx.fill(); break;
      case 'flakebit': ctx.globalAlpha = 0.8; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(-3 * s, 0); ctx.lineTo(3 * s, 0); ctx.stroke(); } break;
      case 'leaf': ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(0, 0, 5 * s, 2.2 * s, 0, 0, TAU); ctx.fill(); break;
      case 'flower':
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(Math.cos((i / 5) * TAU) * 2.4 * s, Math.sin((i / 5) * TAU) * 2.4 * s, 1.6 * s, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(0, 0, 1.2 * s, 0, TAU); ctx.fill();
        break;
      case 'rubble': ctx.globalAlpha = 0.85; ctx.fillRect(-4 * s, -3 * s, 5 * s, 4 * s); ctx.fillRect(1 * s, 0, 4 * s, 3 * s); break;
      case 'bubble': ctx.globalAlpha = 0.7; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 2.6 * s, 0, TAU); ctx.stroke(); break;
      case 'cellbit': ctx.globalAlpha = 0.6; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.lineTo(Math.cos(a) * 4 * s, Math.sin(a) * 4 * s); } ctx.closePath(); ctx.stroke(); break;
      case 'vein': ctx.globalAlpha = 0.6; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8 * s, 0); ctx.quadraticCurveTo(0, 5 * s, 8 * s, -2 * s); ctx.stroke(); break;
      case 'glitch': ctx.globalAlpha = 0.85; ctx.fillRect(-5 * s, -1, 10 * s, 2); ctx.fillRect(-2 * s, 2, 7 * s, 1.5); break;
      default: ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  /** Ornement sur le dessus d'un bloc de relief. */
  function ornament(ctx, b, x, y, T, rng) {
    const o = b.wall.orn;
    const top = b.wall.top;
    ctx.save();
    ctx.translate(x, y - 5);
    switch (o) {
      case 'spots':
        ctx.fillStyle = b.accent;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(rng.float(-9, 9), rng.float(-9, 9), rng.float(1.5, 3.5), 0, TAU); ctx.fill(); }
        break;
      case 'roots':
        ctx.strokeStyle = U.shade(b.wall.base, -0.3); ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { const a = rng.float(0, TAU); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * 10, Math.sin(a) * 10 + 5, Math.cos(a) * 20, Math.sin(a) * 20 + 9); ctx.stroke(); }
        break;
      case 'rivets':
        ctx.fillStyle = U.shade(top, -0.35);
        for (const [dx, dy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { ctx.beginPath(); ctx.arc(dx, dy, 1.6, 0, TAU); ctx.fill(); }
        if (rng.chance(0.3)) { ctx.fillStyle = b.accent; ctx.fillRect(-6, -2, 12, 3); }
        break;
      case 'ribs':
        ctx.strokeStyle = top; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 10, 13, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
        break;
      case 'glow':
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = U.rgba(b.accent, 0.5);
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(4, 2); ctx.lineTo(-4, 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = U.rgba(b.accent, 0.12);
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill();
        break;
      case 'grass':
        ctx.fillStyle = '#7aa65a';
        ctx.beginPath(); ctx.arc(rng.float(-5, 5), rng.float(-5, 5), rng.float(5, 9), 0, TAU); ctx.fill();
        break;
      case 'branches':
        ctx.strokeStyle = U.shade(b.wall.base, -0.2); ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { const a = rng.float(0, TAU); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke(); }
        break;
      case 'leaves':
        for (let i = 0; i < 3; i++) { ctx.fillStyle = U.shade(top, rng.float(-0.25, 0.15)); ctx.beginPath(); ctx.arc(rng.float(-9, 9), rng.float(-9, 9), rng.float(6, 10), 0, TAU); ctx.fill(); }
        if (rng.chance(0.15)) { ctx.fillStyle = b.accent; ctx.beginPath(); ctx.arc(rng.float(-6, 6), rng.float(-6, 6), 3, 0, TAU); ctx.fill(); }
        break;
      case 'rings':
        ctx.strokeStyle = U.shade(top, -0.25); ctx.lineWidth = 1.2;
        for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(0, 0, i * 4, 0, TAU); ctx.stroke(); }
        break;
      case 'cracks':
        ctx.strokeStyle = U.shade(b.wall.base, -0.3); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-2, 0); ctx.lineTo(4, -8); ctx.moveTo(-2, 0); ctx.lineTo(2, 10); ctx.stroke();
        break;
      case 'gloss':
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(-2, -2, 9, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
        break;
      case 'bubbles':
        ctx.strokeStyle = U.rgba(b.accent, 0.7); ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(rng.float(-9, 9), rng.float(-9, 9), rng.float(2, 4), 0, TAU); ctx.stroke(); }
        break;
      case 'veins':
        ctx.strokeStyle = U.shade(top, -0.3); ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(-12, rng.float(-6, 6)); ctx.bezierCurveTo(-4, -10, 4, 10, 12, rng.float(-6, 6)); ctx.stroke();
        break;
      default: break;
    }
    ctx.restore();
  }

  /** Bloc de relief (une tuile de mur). */
  function wallBase(ctx, b, x, y, T, rng) {
    ctx.fillStyle = b.wall.base;
    switch (b.wall.shape) {
      case 'block': ctx.fillRect(x - T / 2 - 1, y - T / 2 - 1, T + 2, T + 2); break;
      case 'hex': hexPath(ctx, x, y, T * 0.68); ctx.fill(); break;
      case 'shard':
        ctx.beginPath(); ctx.arc(x, y, T * 0.72, 0, TAU); ctx.fill();
        break;
      default: ctx.beginPath(); ctx.arc(x + rng.float(-3, 3), y + rng.float(-3, 3), T * 0.8, 0, TAU); ctx.fill();
    }
  }
  function wallTop(ctx, b, x, y, T, rng, s) {
    const col = U.mix(b.wall.base, b.wall.top, 0.45 + s * 0.55);
    ctx.fillStyle = col;
    switch (b.wall.shape) {
      case 'block': {
        const inset = 3;
        ctx.fillRect(x - T / 2 + inset, y - T / 2 + inset - 5, T - inset * 2, T - inset * 2);
        break;
      }
      case 'hex':
        hexPath(ctx, x, y - 4, T * 0.5); ctx.fill();
        ctx.strokeStyle = U.shade(b.wall.base, -0.2); ctx.lineWidth = 1.2; ctx.stroke();
        break;
      case 'shard': {
        const n = rng.int(1, 3);
        for (let i = 0; i < n; i++) {
          const a = rng.float(-0.6, 0.6) - Math.PI / 2;
          const len = rng.float(T * 0.55, T * 0.95);
          const ox = x + rng.float(-8, 8), oy = y + rng.float(-4, 6);
          const tx = ox + Math.cos(a) * len, ty = oy + Math.sin(a) * len;
          const w = rng.float(5, 9);
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(ox - w, oy); ctx.lineTo(tx, ty); ctx.lineTo(ox + w, oy); ctx.closePath(); ctx.fill();
          ctx.fillStyle = U.shade(col, 0.25);
          ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, ty); ctx.lineTo(ox + w, oy); ctx.closePath(); ctx.fill();
        }
        break;
      }
      default:
        ctx.beginPath(); ctx.arc(x + rng.float(-2, 2), y - 5 + rng.float(-2, 2), T * rng.float(0.5, 0.66), 0, TAU); ctx.fill();
    }
  }
  function hexPath(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
  }

  /**
   * Dessine une grille dans un contexte (zone d'expédition ou territoire).
   * g : { w, h, T, grid, bmap, shade, biome, mix, decor, plates }
   */
  function paintGrid(ctx, g, seed) {
    const T = g.T;
    const B = D.BIOME[g.biome], M = g.mix ? D.BIOME[g.mix] : null;
    const rng = new AN.RNG(seed);
    const at = (x, y) => (M && g.bmap[y * g.w + x] ? M : B);

    // sol
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      const b = at(x, y);
      ctx.fillStyle = groundColor(b, g.shade[i]);
      ctx.fillRect(x * T, y * T, T + 1, T + 1);
    }
    // adoucit la frontière entre deux biomes mêlés
    if (M) {
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        const i = y * g.w + x;
        if (!g.bmap[i]) continue;
        const border = (x > 0 && !g.bmap[i - 1]) || (x < g.w - 1 && !g.bmap[i + 1]) || (y > 0 && !g.bmap[i - g.w]) || (y < g.h - 1 && !g.bmap[i + g.w]);
        if (!border) continue;
        ctx.fillStyle = groundColor(M, g.shade[i]);
        ctx.beginPath(); ctx.arc(x * T + T / 2 + rng.float(-4, 4), y * T + T / 2 + rng.float(-4, 4), T * 0.8, 0, TAU); ctx.fill();
      }
    }
    // texture organique
    const blots = Math.round(g.w * g.h * 0.5);
    for (let k = 0; k < blots; k++) {
      const x = rng.int(0, g.w - 1), y = rng.int(0, g.h - 1);
      const b = at(x, y);
      ctx.fillStyle = U.rgba(rng.pick(b.ground), 0.35);
      ctx.beginPath(); ctx.arc(x * T + rng.float(0, T), y * T + rng.float(0, T), rng.float(4, 15), 0, TAU); ctx.fill();
    }
    const isW = (x, y) => x < 0 || y < 0 || x >= g.w || y >= g.h || g.grid[y * g.w + x] === Z.WALL;
    const isH = (x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h && g.grid[y * g.w + x] === Z.HAZARD;
    const isA = (x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h && g.grid[y * g.w + x] === Z.ABYSS;
    // vide galactique : un ciel profond entre les îles, bordé de lumière
    let hasAbyss = false;
    for (let i = 0; i < g.w * g.h && !hasAbyss; i++) if (g.grid[i] === Z.ABYSS) hasAbyss = true;
    if (hasAbyss) {
      const edgeA = (x, y) => !isA(x - 1, y) || !isA(x + 1, y) || !isA(x, y - 1) || !isA(x, y + 1);
      // bords arrondis et lueur : des îles qui flottent au-dessus du vide
      ctx.save();
      ctx.shadowColor = U.rgba(D.BIOME[g.biome].accent, 0.9);
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#06070d';
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        if (!isA(x, y) || !edgeA(x, y)) continue;
        ctx.beginPath(); ctx.arc(x * T + T / 2 + rng.float(-3, 3), y * T + T / 2 + rng.float(-3, 3), T * 0.78, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#06070d';
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        if (!isA(x, y)) continue;
        if (edgeA(x, y)) { ctx.beginPath(); ctx.arc(x * T + T / 2, y * T + T / 2, T * 0.7, 0, TAU); ctx.fill(); }
        else ctx.fillRect(x * T - 1, y * T - 1, T + 2, T + 2);
      }
      for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
        if (!isA(x, y)) continue;
        for (let k = 0; k < 2; k++) {
          if (!rng.chance(0.5)) continue;
          ctx.fillStyle = U.rgba(rng.pick(['#ffffff', '#c8c0ff', '#fff0c0']), rng.float(0.3, 0.9));
          const s = rng.float(0.6, 1.8);
          ctx.fillRect(x * T + rng.float(0, T), y * T + rng.float(0, T), s, s);
        }
      }
    }
    // terrains dangereux : masse pleine, bords arrondis, reflets
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!isH(x, y)) continue;
      const b = at(x, y);
      if (!b.hazard) continue;
      ctx.fillStyle = b.hazard.color;
      const edge = !isH(x - 1, y) || !isH(x + 1, y) || !isH(x, y - 1) || !isH(x, y + 1);
      if (!edge) ctx.fillRect(x * T - 1, y * T - 1, T + 2, T + 2);
      else { ctx.beginPath(); ctx.arc(x * T + T / 2 + rng.float(-3, 3), y * T + T / 2 + rng.float(-3, 3), T * 0.74, 0, TAU); ctx.fill(); }
    }
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!isH(x, y) || !rng.chance(0.3)) continue;
      const b = at(x, y);
      if (!b.hazard) continue;
      ctx.fillStyle = U.rgba(U.shade(b.hazard.color, 0.22), 0.7);
      ctx.beginPath(); ctx.ellipse(x * T + T / 2 + rng.float(-6, 6), y * T + T / 2 + rng.float(-6, 6), T * rng.float(0.2, 0.42), T * rng.float(0.12, 0.25), rng.float(0, 3), 0, TAU); ctx.fill();
    }
    // plaques blanches (surfaces de néant)
    (g.plates || []).forEach((p) => {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(p.x + 3, p.y + 5, T * 2.45, 0, TAU); ctx.fill();
      ctx.fillStyle = AN.PAPER;
      ctx.beginPath();
      for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU; const rr = T * (2.3 + rng.float(-0.18, 0.18)); ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    });
    // décor
    (g.decor || []).forEach((d) => Terrain.decor(ctx, d));
    const edgeW = (x, y) => !isW(x - 1, y) || !isW(x + 1, y) || !isW(x, y - 1) || !isW(x, y + 1);
    // ombres portées du relief (bords seulement)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!isW(x, y) || !edgeW(x, y)) continue;
      ctx.beginPath(); ctx.arc(x * T + T / 2 + 5, y * T + T / 2 + 9, T * 0.72, 0, TAU); ctx.fill();
    }
    // relief : masse pleine au centre, bords arrondis
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!isW(x, y)) continue;
      const b = at(x, y);
      const cx = x * T + T / 2, cy = y * T + T / 2;
      if (b.wall.shape === 'block' || b.wall.shape === 'hex' || edgeW(x, y)) wallBase(ctx, b, cx, cy, T, rng);
      else { ctx.fillStyle = b.wall.base; ctx.fillRect(x * T - 1, y * T - 1, T + 2, T + 2); }
    }
    // sommets : volumes plus grands à l'intérieur des massifs, éclairés d'en haut à gauche
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      if (!isW(x, y)) continue;
      const b = at(x, y);
      const cx = x * T + T / 2, cy = y * T + T / 2;
      const edge = edgeW(x, y);
      if (b.wall.shape === 'blob') {
        if (!rng.chance(edge ? 0.85 : 0.6)) continue;
        const r = T * (edge ? rng.float(0.45, 0.68) : rng.float(0.62, 1.0));
        const col = U.mix(b.wall.base, b.wall.top, 0.4 + g.shade[i] * 0.6);
        const ox = cx + rng.float(-5, 5), oy = cy - 6 + rng.float(-4, 4);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, TAU); ctx.fill();
        ctx.fillStyle = U.rgba(U.shade(col, 0.2), 0.75);
        ctx.beginPath(); ctx.arc(ox - r * 0.28, oy - r * 0.3, r * 0.48, 0, TAU); ctx.fill();
      } else {
        wallTop(ctx, b, cx, cy, T, rng, g.shade[i]);
      }
    }
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (!isW(x, y)) continue;
      if (rng.chance(0.4)) ornament(ctx, at(x, y), x * T + T / 2, y * T + T / 2, T, rng);
    }
  }

  /** Canevas complet d'une zone d'expédition. */
  Terrain.renderZone = function (zone, seed) {
    const T = zone.T;
    const cv = canvas(zone.w * T, zone.h * T);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = D.BIOME[zone.biome].wall.base;
    ctx.fillRect(0, 0, cv.width, cv.height);
    paintGrid(ctx, zone, seed);
    return cv;
  };

  /** Miniature de la grille (carte, cinématique). */
  Terrain.thumb = function (zone, S = 3) {
    const cv = canvas(zone.w * S, zone.h * S);
    const ctx = cv.getContext('2d');
    const B = D.BIOME[zone.biome], M = zone.mix ? D.BIOME[zone.mix] : null;
    for (let y = 0; y < zone.h; y++) for (let x = 0; x < zone.w; x++) {
      const i = y * zone.w + x;
      const b = M && zone.bmap[i] ? M : B;
      const g = zone.grid[i];
      ctx.fillStyle = g === Z.WALL ? U.mix(b.wall.base, b.wall.top, 0.35) : g === Z.ABYSS ? '#06070d' : g === Z.HAZARD && b.hazard ? b.hazard.color : g === Z.PLATE ? AN.PAPER : groundColor(b, zone.shade[i]);
      ctx.fillRect(x * S, y * S, S, S);
    }
    (zone.vaults || []).forEach((v) => {
      if (v.opened) return;
      ctx.fillStyle = D.KEYS[v.key].color;
      v.tiles.forEach((i) => ctx.fillRect((i % zone.w) * S, Math.floor(i / zone.w) * S, S, S));
    });
    if (zone.village && D.PEOPLE) {
      ctx.fillStyle = D.PEOPLE[zone.village.people].body.trim;
      zone.village.buildings.forEach((b) => { if (!b.taken) ctx.fillRect(b.tx * S, b.ty * S, b.w * S, b.h * S); });
    }
    return cv;
  };

  /**
   * Territoire de l'Archive : un morceau de biome découpé en hexagone.
   * Retourne un canevas carré de côté 2R * scale.
   */
  Terrain.renderTerritory = function (terr, R, scale = 0.5) {
    const cells = AN.Shapes ? AN.Shapes.cellsOf(terr) : [[0, 0]];
    if (cells.length > 1) return renderShape(terr, R, scale, cells);
    const T = 32;
    const n = Math.ceil((R * 2) / T) + 2;
    const rng = AN.RNG.from(terr.seed, 'terrain');
    const noise = new AN.Noise(rng.int(1, 1e9));
    const hz = new AN.Noise(rng.int(1, 1e9));
    const mixN = new AN.Noise(rng.int(1, 1e9));
    const B = D.BIOME[terr.biome];
    const g = { w: n, h: n, T, biome: terr.biome, mix: terr.mix || null, grid: new Uint8Array(n * n), bmap: new Uint8Array(n * n), shade: new Float32Array(n * n), decor: [], plates: [] };
    const c = (n * T) / 2;
    const wallLimit = terr.quality === 'fragment' ? 0.74 : 0.7;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x;
      g.shade[i] = noise.fbm(x * 0.2, y * 0.2, 3);
      const px = x * T + T / 2 - c, py = y * T + T / 2 - c;
      const dc = Math.hypot(px, py) / R;
      const v = noise.fbm(x * 0.13 + 30, y * 0.13, 3);
      if (dc > 0.3 && v > wallLimit) g.grid[i] = Z.WALL;
      else if (B.hazard && hz.fbm(x * 0.15, y * 0.15, 3) > 0.7) g.grid[i] = Z.HAZARD;
      if (g.mix && mixN.fbm(x * 0.1, y * 0.1, 2) > 0.55) g.bmap[i] = 1;
    }
    const dn = Math.round(n * n * 0.1);
    for (let k = 0; k < dn; k++) {
      const x = rng.int(0, n - 1), y = rng.int(0, n - 1);
      if (g.grid[y * n + x] !== Z.FLOOR) continue;
      const d = rng.pick(B.decor);
      g.decor.push({ x: x * T + rng.float(2, T - 2), y: y * T + rng.float(2, T - 2), type: d[0], color: d[1], s: rng.float(0.8, 1.4), rot: rng.float(0, TAU) });
    }
    const big = canvas(n * T, n * T);
    const bctx = big.getContext('2d');
    paintGrid(bctx, g, rng.int(1, 1e9));
    const size = R * 2 * scale;
    const out = canvas(size, size);
    const ctx = out.getContext('2d');
    ctx.save();
    ctx.beginPath();
    AN.Hex.corners(size / 2, size / 2, (R - 2) * scale).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(big, c - R, c - R, R * 2, R * 2, 0, 0, size, size);
    ctx.restore();
    out.offX = -R; out.offY = -R; out.wpx = R * 2; out.hpx = R * 2;
    return out;
  };

  /** Territoire de plusieurs cases : même terrain, découpé selon la forme. */
  function renderShape(terr, R, scale, cells) {
    const T = 32;
    const cs = cells.map(([q, r]) => AN.Hex.toPx(q, r));
    const minX = Math.min(...cs.map((c) => c.x)) - R, maxX = Math.max(...cs.map((c) => c.x)) + R;
    const minY = Math.min(...cs.map((c) => c.y)) - R, maxY = Math.max(...cs.map((c) => c.y)) + R;
    const wpx = maxX - minX, hpx = maxY - minY;
    const nx = Math.ceil(wpx / T) + 1, ny = Math.ceil(hpx / T) + 1;
    const rng = AN.RNG.from(terr.seed, 'terrain');
    const noise = new AN.Noise(rng.int(1, 1e9));
    const hz = new AN.Noise(rng.int(1, 1e9));
    const mixN = new AN.Noise(rng.int(1, 1e9));
    const B = D.BIOME[terr.biome];
    const g = { w: nx, h: ny, T, biome: terr.biome, mix: terr.mix || null, grid: new Uint8Array(nx * ny), bmap: new Uint8Array(nx * ny), shade: new Float32Array(nx * ny), decor: [], plates: [] };
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = y * nx + x;
      g.shade[i] = noise.fbm(x * 0.2, y * 0.2, 3);
      const px = x * T + T / 2 + minX, py = y * T + T / 2 + minY;
      let dc = 1e9;
      for (const c of cs) { const d = Math.hypot(px - c.x, py - c.y); if (d < dc) dc = d; }
      dc /= R;
      const v = noise.fbm(x * 0.13 + 30, y * 0.13, 3);
      if (dc > 0.3 && v > 0.68) g.grid[i] = Z.WALL;
      else if (B.hazard && hz.fbm(x * 0.15, y * 0.15, 3) > 0.7) g.grid[i] = Z.HAZARD;
      if (g.mix && mixN.fbm(x * 0.1, y * 0.1, 2) > 0.55) g.bmap[i] = 1;
    }
    const dn = Math.round(nx * ny * 0.1);
    for (let k = 0; k < dn; k++) {
      const x = rng.int(0, nx - 1), y = rng.int(0, ny - 1);
      if (g.grid[y * nx + x] !== Z.FLOOR) continue;
      const d = rng.pick(B.decor);
      g.decor.push({ x: x * T + rng.float(2, T - 2), y: y * T + rng.float(2, T - 2), type: d[0], color: d[1], s: rng.float(0.8, 1.4), rot: rng.float(0, TAU) });
    }
    const out = canvas(wpx * scale, hpx * scale);
    const ctx = out.getContext('2d');
    ctx.save();
    ctx.scale(scale, scale);
    ctx.beginPath();
    cs.forEach((c) => {
      AN.Hex.corners(c.x - minX, c.y - minY, R + 1).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
    });
    ctx.clip();
    paintGrid(ctx, g, rng.int(1, 1e9));
    ctx.restore();
    out.offX = minX; out.offY = minY; out.wpx = wpx; out.hpx = hpx;
    return out;
  }

  /** Version légère d'un territoire, pour les vues lointaines (quelques millisecondes). */
  Terrain.renderTerritoryLo = function (terr, R) {
    const cells = AN.Shapes ? AN.Shapes.cellsOf(terr) : [[0, 0]];
    const cs = cells.map(([q, r]) => AN.Hex.toPx(q, r));
    const minX = Math.min(...cs.map((c) => c.x)) - R, maxX = Math.max(...cs.map((c) => c.x)) + R;
    const minY = Math.min(...cs.map((c) => c.y)) - R, maxY = Math.max(...cs.map((c) => c.y)) + R;
    const k = 0.06;
    const out = canvas((maxX - minX) * k, (maxY - minY) * k);
    const ctx = out.getContext('2d');
    const B = D.BIOME[terr.biome], M = terr.mix ? D.BIOME[terr.mix] : null;
    const rng = AN.RNG.from(terr.seed, 'apercu');
    ctx.scale(k, k);
    ctx.beginPath();
    cs.forEach((c) => { AN.Hex.corners(c.x - minX, c.y - minY, cells.length > 1 ? R + 1 : R - 2).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); });
    ctx.save();
    ctx.clip();
    ctx.fillStyle = B.ground[1];
    ctx.fillRect(0, 0, maxX - minX, maxY - minY);
    for (let i = 0; i < 18 * cells.length; i++) {
      const c = rng.pick(cs);
      const b = M && rng.chance(0.3) ? M : B;
      ctx.fillStyle = rng.chance(0.3) ? b.wall.top : rng.chance(0.5) ? b.ground[2] : b.ground[0];
      ctx.beginPath(); ctx.arc(c.x - minX + rng.float(-R, R), c.y - minY + rng.float(-R, R), rng.float(R * 0.08, R * 0.3), 0, TAU); ctx.fill();
    }
    ctx.restore();
    out.offX = minX; out.offY = minY; out.wpx = maxX - minX; out.hpx = maxY - minY;
    return out;
  };
})();
