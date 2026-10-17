/* Clés d'environnement : certains compagnons ouvrent les caveaux scellés
   (eaux profondes, coulées ardentes, gouffres, ténèbres, éboulis, portes
   mortes, sceaux cristallins, parois de chitine). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const K = (AN.Keys = {});

  /** Le compagnon (debout) qui possède cette clé, s'il y en a un. */
  K.holder = function (X, key) {
    return X.allies.find((a) => !a.downed && !a.temp && a.alive !== false && (a.keys || []).includes(key)) || null;
  };

  K.open = function (X, v, holder) {
    const zone = X.zone;
    v.opened = true;
    v.tiles.forEach((i) => { zone.grid[i] = Z.FLOOR; });
    X.thumbDirty = true;
    const col = D.KEYS[v.key].color;
    FX.ring(v.x, v.y, col, 10, 160, 0.8, 5);
    FX.burst(v.x, v.y, col, 40, 260, { size: 4 });
    if (holder) {
      FX.stream(holder.x, holder.y, v.x, v.y, col, { life: 0.6, size: 5 });
      holder.attackAnim = 1;
    }
    X.cam.shake(5);
    AN.Audio.play('portal');
    AN.HUD.toast(D.KEYS[v.key].barrier + ' franchi' + (D.KEYS[v.key].barrier.endsWith('s') ? 's' : '') + (holder ? ' grâce à ' + (holder.nickname || holder.def.name) : '') + '. Le caveau est ouvert.', 4);
    X.stats.vaults = (X.stats.vaults || 0) + 1;
  };

  /** Dessin animé des barrières encore fermées et des œufs. */
  K.draw = function (ctx, X, t) {
    const zone = X.zone;
    const T = Z.T;
    const v0 = X.cam.view(40);
    for (const v of zone.vaults || []) {
      if (v.opened) continue;
      if (v.x < v0.x0 - 200 || v.x > v0.x1 + 200 || v.y < v0.y0 - 200 || v.y > v0.y1 + 200) continue;
      for (const i of v.tiles) {
        const x = (i % zone.w) * T, y = Math.floor(i / zone.w) * T;
        drawTile(ctx, v.key, x, y, T, t, i);
      }
      // halo indiquant la clé
      const col = D.KEYS[v.key].color;
      ctx.strokeStyle = U.rgba(col, 0.35 + Math.sin(t * 2) * 0.15);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.arc(v.x, v.y, 46, t * 0.4, t * 0.4 + TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const e of zone.eggs || []) {
      if (e.taken || e.x < v0.x0 || e.x > v0.x1 || e.y < v0.y0 || e.y > v0.y1) continue;
      K.drawEgg(ctx, e.x, e.y, 9, e.species, e.variant, e.hueSeed, t);
    }
  };

  K.drawEgg = function (ctx, x, y, r, species, variant, hueSeed, t) {
    const def = D.CREATURE[species];
    const pal = AN.Art.palette(def, variant, hueSeed);
    const wob = Math.sin(t * 3 + x) * 0.12;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(1, r * 0.95, r * 0.9, r * 0.35, 0, 0, TAU); ctx.fill();
    ctx.rotate(wob);
    ctx.fillStyle = U.mix(pal.body, '#fff6e6', 0.55);
    ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.78, r, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pal.accent;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(Math.cos(k * 1.9) * r * 0.4, Math.sin(k * 2.3) * r * 0.55, r * 0.16, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.18, r * 0.28, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  };

  function hash(i) { return ((Math.sin(i * 91.7) * 43758.5453) % 1 + 1) % 1; }

  function drawTile(ctx, key, x, y, T, t, i) {
    const cx = x + T / 2, cy = y + T / 2;
    switch (key) {
      case 'nage': {
        ctx.fillStyle = '#1d4f7a'; ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        ctx.strokeStyle = 'rgba(160,215,240,0.55)'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          const yy = y + 6 + k * 10 + Math.sin(t * 2 + i + k) * 2;
          ctx.beginPath(); ctx.moveTo(x + 2, yy); ctx.quadraticCurveTo(cx, yy - 4, x + T - 2, yy); ctx.stroke();
        }
        break;
      }
      case 'feu': {
        ctx.fillStyle = '#a63a12'; ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        const a = 0.55 + Math.sin(t * 3 + i) * 0.25;
        ctx.strokeStyle = U.rgba('#ffd25a', a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 4, y + 6 + hash(i) * 8); ctx.lineTo(cx, cy); ctx.lineTo(x + T - 5, y + T - 6 - hash(i + 1) * 6); ctx.stroke();
        ctx.fillStyle = U.rgba('#ff8a2a', 0.5); ctx.beginPath(); ctx.arc(cx + Math.sin(t + i) * 4, cy, 6, 0, TAU); ctx.fill();
        break;
      }
      case 'vol': {
        const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, T * 0.75);
        g.addColorStop(0, '#000000'); g.addColorStop(1, '#22242e');
        ctx.fillStyle = g; ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        ctx.fillStyle = 'rgba(200,200,220,0.5)';
        const dy = ((t * 20 + hash(i) * 30) % T);
        ctx.fillRect(x + hash(i + 3) * T, y + dy, 1.5, 1.5);
        break;
      }
      case 'lumiere': {
        ctx.fillStyle = '#06070c'; ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        ctx.strokeStyle = 'rgba(90,70,140,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, 8 + Math.sin(t * 2 + i) * 3, t + i, t + i + 3.5); ctx.stroke();
        break;
      }
      case 'fouisseur': {
        ctx.fillStyle = '#5c5246'; ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        for (let k = 0; k < 5; k++) {
          ctx.fillStyle = k % 2 ? '#8a7c69' : '#a39480';
          ctx.strokeStyle = '#3b342c'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x + 5 + hash(i * 7 + k) * (T - 10), y + 5 + hash(i * 3 + k) * (T - 10), 4 + hash(i + k) * 5, 0, TAU); ctx.fill(); ctx.stroke();
        }
        break;
      }
      case 'conduction': {
        ctx.fillStyle = '#4f555d'; ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        ctx.strokeStyle = '#2b3036'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, T - 6, T - 6);
        ctx.strokeStyle = 'rgba(79,216,240,' + (Math.random() < 0.04 ? 0.9 : 0.15) + ')';
        ctx.beginPath(); ctx.moveTo(x + 6, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, y + T - 6); ctx.stroke();
        break;
      }
      case 'resonance': {
        ctx.fillStyle = '#244a7a'; ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        const a = 0.4 + Math.sin(t * 2.5 + i * 0.7) * 0.3;
        ctx.fillStyle = U.rgba('#9fd0ff', a);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU + Math.PI / 6; ctx.lineTo(cx + Math.cos(an) * 11, cy + Math.sin(an) * 11); }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(230,245,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
        break;
      }
      case 'acide': {
        ctx.fillStyle = '#7a5a2a'; ctx.fillRect(x - 1, y - 1, T + 2, T + 2);
        ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(cx, y + T + 4 - k * 10, 14, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
        ctx.fillStyle = 'rgba(232,180,80,0.35)'; ctx.fillRect(x + 4, y + 4, T - 8, 4);
        break;
      }
      default:
        ctx.fillStyle = '#333'; ctx.fillRect(x, y, T, T);
    }
  }
})();
