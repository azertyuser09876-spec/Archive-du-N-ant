/* Particules, textes flottants et anneaux. Tout est dessiné dans l'espace du monde. */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;

  const MAX = 1800;
  const FX = (AN.FX = { list: [] });

  FX.clear = () => { FX.list.length = 0; };

  FX.add = function (p) {
    if (FX.list.length >= MAX) FX.list.shift();
    p.t = 0;
    p.life = p.life || 0.6;
    p.vx = p.vx || 0; p.vy = p.vy || 0;
    p.size = p.size || 3;
    p.drag = p.drag != null ? p.drag : 2;
    FX.list.push(p);
    return p;
  };

  FX.burst = function (x, y, color, n = 10, speed = 160, opts = {}) {
    if (AN.Prefs && AN.Prefs.reduceFx()) n = Math.ceil(n * 0.35);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      FX.add({ kind: opts.kind || 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, color, life: (opts.life || 0.5) * (0.6 + Math.random() * 0.6), size: (opts.size || 3) * (0.6 + Math.random() * 0.8), drag: opts.drag != null ? opts.drag : 3, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, grav: opts.grav || 0, glow: opts.glow });
    }
  };
  FX.ring = (x, y, color, r0, r1, life = 0.5, width = 3) => FX.add({ kind: 'ring', x, y, color, r0, r1, life, width, drag: 0 });
  FX.text = (x, y, text, color = '#1c2230', opts = {}) =>
    FX.add({ kind: 'text', x, y, vy: opts.vy != null ? opts.vy : -40, text, color, life: opts.life || 1, size: opts.size || 13, drag: 1, bold: opts.bold });
  /** Particule qui file vers une cible (absorption par l'Artefact, collecte). */
  FX.stream = (x, y, tx, ty, color, opts = {}) =>
    FX.add({ kind: 'stream', x, y, sx: x, sy: y, tx, ty, color, life: opts.life || 0.8, size: opts.size || 3, curve: (Math.random() - 0.5) * 120, drag: 0 });

  FX.update = function (dt) {
    const L = FX.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt;
      if (p.t >= p.life) { L.splice(i, 1); continue; }
      if (p.kind === 'stream') {
        const k = U.easeIn(p.t / p.life);
        const mx = (p.sx + p.tx) / 2 + p.curve, my = (p.sy + p.ty) / 2 - Math.abs(p.curve);
        const a = 1 - k;
        p.x = a * a * p.sx + 2 * a * k * mx + k * k * p.tx;
        p.y = a * a * p.sy + 2 * a * k * my + k * k * p.ty;
        continue;
      }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy *= d;
      if (p.grav) p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
  };

  FX.draw = function (ctx, cam) {
    const v = cam.view(80);
    for (const p of FX.list) {
      if (p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1) continue;
      const k = p.t / p.life;
      const alpha = p.kind === 'text' ? (k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3) : 1 - k;
      ctx.globalAlpha = U.clamp(alpha, 0, 1);
      if (p.glow) ctx.globalCompositeOperation = 'lighter';
      switch (p.kind) {
        case 'ring': {
          const r = U.lerp(p.r0, p.r1, U.easeOut(k));
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.width * (1 - k * 0.7);
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, r), 0, Math.PI * 2); ctx.stroke();
          break;
        }
        case 'text': {
          ctx.font = (p.bold ? '700 ' : '600 ') + p.size + 'px ' + AN.FONT_UI;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.strokeText(p.text, p.x, p.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, p.x, p.y);
          break;
        }
        case 'shard': {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          const s = p.size * (1 - k * 0.5);
          ctx.beginPath(); ctx.moveTo(-s, -s * 0.6); ctx.lineTo(s, -s * 0.2); ctx.lineTo(-s * 0.3, s); ctx.closePath(); ctx.fill();
          ctx.restore();
          break;
        }
        case 'square': {
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          const s = p.size * (1 - k);
          ctx.fillStyle = p.color;
          ctx.fillRect(-s / 2, -s / 2, s, s);
          ctx.restore();
          break;
        }
        case 'spark': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.5;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke();
          break;
        }
        default: {
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.3, p.size * (1 - k * 0.6)), 0, Math.PI * 2); ctx.fill();
        }
      }
      if (p.glow) ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  };
})();
