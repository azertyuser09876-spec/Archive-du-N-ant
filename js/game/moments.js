/* Moments d'expédition (1.14) : de courtes animations qui marquent ce qui compte.
   - l'entrée d'un gardien : la caméra se tourne vers lui, son nom à l'écran ;
   - une créature capturée, aspirée vers l'Artefact (l'hexagone s'il est là, le ciel sinon) ;
   - la chute du joueur : le temps ralentit, le monde se décolore et se fend ;
   - le monde d'une nation qui rejoint l'Archive : ses lumières montent, tout blanchit.
   Rien n'est enregistré : ce sont des effets. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const Mo = (AN.Moments = {});
  const reduce = () => !!(AN.Prefs && AN.Prefs.reduceFx());

  /** Avance les moments ; renvoie le pas de temps du monde (ralenti pendant la chute). */
  Mo.update = function (X, dt) {
    const bi = X.bossIntro;
    if (bi) { bi.t += dt; if (bi.t >= bi.dur) X.bossIntro = null; }
    if (X.flights) {
      for (const f of X.flights) {
        f.t += dt;
        const k = f.t / f.dur;
        if (k < 1 && Math.random() < 0.7) { const q = flightPos(f, k); FX.add({ kind: 'dot', x: q.x, y: q.y, vx: 0, vy: 0, color: AN.CYAN, life: 0.35, size: 2.5, glow: true }); }
        if (k >= 1 && !f.done) {
          f.done = true;
          FX.ring(f.tx, f.ty, AN.CYAN, 6, f.base ? 90 : 60, 0.5, 3);
          FX.burst(f.tx, f.ty, '#ffffff', 12, 140, { size: 2.5 });
          if (f.base && X.base) X.base.flash = Math.max(X.base.flash || 0, 0.35);
        }
      }
      X.flights = X.flights.filter((f) => f.t < f.dur + 0.1);
    }
    if (X.fall) { X.fall.t += dt; return dt * (X.fall.t < 2 ? 0.3 : 0.6); }
    if (X.ascend) X.ascend.t += dt;
    return dt;
  };

  /* ======================= Entrée d'un gardien ======================= */
  /** Le gardien se réveille : son nom, et la caméra qui se tourne vers lui. Il attend la fin de l'entrée pour frapper. */
  Mo.bossIntro = function (X, e) {
    const b = e.boss;
    if (!b || b.errant || X.ending) return false;
    const dur = reduce() ? 1.6 : 2.8;
    b.introT = dur - 0.5;
    const zi = b.zoneIndex != null ? b.zoneIndex : X.zi;
    const spec = AN.Expedition.zoneSpec(X, zi);
    const tier = e.def.tier;
    const sub = tier >= 3 ? D.TIERS[tier].name + (spec ? ' · ' + spec.name : '') : 'Gardien · ' + (spec ? spec.name : '');
    const v = D.VARIANT[e.variant];
    X.bossIntro = { e, t: 0, dur, name: e.def.name + (v && v.name ? ' ' + v.name : ''), sub };
    return true;
  };
  /** Où regarde la caméra pendant l'entrée : { x, y, k (part du gardien), zoom (multiplicateur) }. */
  Mo.focus = function (X) {
    const bi = X.bossIntro;
    if (!bi || !bi.e.alive) return null;
    const k = bi.t < 0.6 ? U.easeOut(bi.t / 0.6) : bi.t > bi.dur - 0.7 ? U.clamp((bi.dur - bi.t) / 0.7, 0, 1) : 1;
    return { x: bi.e.x, y: bi.e.y, k: k * 0.85, zoom: 1 + 0.12 * k };
  };

  /* ======================= Capture ======================= */
  function flightPos(f, k) {
    const e = k * k; // de plus en plus vite
    const mx = (f.x0 + f.tx) / 2, my = Math.min(f.y0, f.ty) - 200;
    const u = 1 - e;
    return { x: u * u * f.x0 + 2 * u * e * mx + e * e * f.tx, y: u * u * f.y0 + 2 * u * e * my + e * e * f.ty, e };
  }
  /** Une créature capturée est aspirée vers l'Artefact : l'hexagone, s'il est dans la zone ; sinon, le ciel. */
  Mo.capture = function (X, e) {
    const b = X.base;
    const toBase = !!(b && b.state === 'ok' && X.zi === b.zi && U.dist(b.x, b.y, e.x, e.y) < 2600);
    const g = Object.assign({}, e, { alive: true, weak: false, capture: 0, flash: 0, hidden: false, rig: null, _drawT: null });
    X.flights = X.flights || [];
    X.flights.push({ g, x0: e.x, y0: e.y, tx: toBase ? b.x : e.x + (X.player.x - e.x) * 0.25, ty: toBase ? b.y - 60 : e.y - 760, base: toBase, t: 0, dur: toBase ? Math.min(1.6, 0.8 + U.dist(b.x, b.y, e.x, e.y) / 1400) : 1.1 });
  };
  Mo.drawWorld = function (ctx, X, t) {
    if (X.flights) for (const f of X.flights) {
      const k = U.clamp(f.t / f.dur, 0, 1);
      if (k >= 1) continue;
      const q = flightPos(f, k);
      const s = 1 - 0.88 * q.e;
      ctx.save();
      ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
      ctx.translate(q.x, q.y); ctx.rotate(q.e * 6); ctx.scale(s, s);
      f.g.x = 0; f.g.y = 0;
      AN.Art.draw(ctx, f.g, t, { glow: true });
      // la lumière qui l'enveloppe
      ctx.strokeStyle = U.rgba(AN.CYAN, 0.6); ctx.lineWidth = 2 / Math.max(0.2, s);
      ctx.beginPath(); ctx.arc(0, 0, f.g.r * 1.4, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // le monde d'une nation s'élève : ses lumières montent
    const asc = X.ascend;
    if (asc && Math.random() < 0.9) {
      const p = X.player;
      for (let i = 0; i < 3; i++) FX.add({ kind: 'dot', x: p.x + (Math.random() - 0.5) * 1400, y: p.y + (Math.random() - 0.5) * 900, vx: 0, vy: -180 - Math.random() * 220, color: i ? '#f2c14e' : AN.CYAN, life: 1.4, size: 3, glow: true });
    }
  };

  /* ======================= Chute ======================= */
  /** Le joueur tombe : il se brise, le temps ralentit, le monde perd ses couleurs et se fend. */
  Mo.fall = function (X) {
    const p = X.player;
    X.fall = { t: 0, dur: 2.9, seed: X.world.seed };
    p.hidden = true;
    FX.burst(p.x, p.y, '#ffffff', reduce() ? 14 : 44, 280, { size: 4, kind: 'square' });
    FX.burst(p.x, p.y, AN.INK, reduce() ? 8 : 24, 220, { size: 3, kind: 'square' });
    FX.ring(p.x, p.y, AN.STAMP, 8, 160, 0.7, 4);
    if (!reduce()) X.cam.shake(16);
    return X.fall.dur;
  };

  /* ======================= Une nation rejoint l'Archive ======================= */
  Mo.ascend = function (X) {
    X.ascend = { t: 0, dur: 1.4 };
    const v = X.zone && X.zone.village;
    if (v) v.buildings.forEach((b, i) => { if (i % 2 === 0) FX.stream(b.x, b.y, b.x, b.y - 900, '#f2c14e', { life: 1.2, size: 3 }); });
  };

  /* ======================= Écran ======================= */
  Mo.drawScreen = function (ctx, X, t) {
    const W = X.cam.W, H = X.cam.H;
    const bi = X.bossIntro;
    if (bi) {
      const a = bi.t < 0.4 ? bi.t / 0.4 : bi.t > bi.dur - 0.5 ? U.clamp((bi.dur - bi.t) / 0.5, 0, 1) : 1;
      const bar = H * 0.085 * a;
      ctx.fillStyle = U.rgba('#0c0f16', 0.92); ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
      const tt = U.clamp((bi.t - 0.3) / 0.6, 0, 1) * a;
      if (tt > 0) {
        ctx.save();
        ctx.globalAlpha = tt;
        ctx.textAlign = 'center';
        const fs = Math.round(U.clamp(W / 26, 24, 46));
        ctx.font = '600 ' + fs + 'px ' + AN.FONT_SERIF;
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(247,248,247,0.85)';
        const y = H * 0.64; // sous le gardien, au-dessus de sa barre de vie ; les messages restent en haut
        ctx.strokeText(bi.name, W / 2, y); ctx.fillStyle = AN.INK; ctx.fillText(bi.name, W / 2, y);
        const lw = Math.min(W * 0.4, 360) * U.easeOut(U.clamp((bi.t - 0.5) / 0.7, 0, 1));
        ctx.strokeStyle = AN.STAMP; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - lw / 2, y + 14); ctx.lineTo(W / 2 + lw / 2, y + 14); ctx.stroke();
        ctx.font = '600 13px ' + AN.FONT_UI;
        const sub = bi.sub.toUpperCase().split('').join(' ');
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(247,248,247,0.85)'; ctx.strokeText(sub, W / 2, y + 36); ctx.fillStyle = U.rgba(AN.INK, 0.8); ctx.fillText(sub, W / 2, y + 36);
        ctx.restore();
      }
    }
    const f = X.fall;
    if (f) {
      const k = U.clamp(f.t / f.dur, 0, 1);
      // le monde perd ses couleurs
      ctx.save();
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = 'rgba(128,128,128,' + Math.min(1, k * 2.4) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      // assombri sur les bords
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
      vg.addColorStop(0, 'rgba(10,12,20,0)'); vg.addColorStop(1, 'rgba(10,12,20,' + 0.55 * Math.min(1, k * 2) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      // il se fend, à partir de l'endroit où vous êtes tombé
      const s = X.cam.worldToScreen(X.player.x, X.player.y);
      const g = U.easeOut(U.clamp(k * 2.2, 0, 1));
      const rng = AN.RNG.from(f.seed, 'chute');
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < 9; i++) {
        const a0 = (i / 9) * TAU + rng.float(-0.25, 0.25);
        const L = Math.max(W, H) * rng.float(0.35, 0.8) * g;
        const pts = [[s.x, s.y]];
        let x = s.x, y = s.y, a = a0;
        for (let j = 1; j <= 5; j++) { a += rng.float(-0.35, 0.35); x = s.x + Math.cos(a) * L * (j / 5); y = s.y + Math.sin(a) * L * (j / 5); pts.push([x, y]); }
        for (const [col, lw] of [['rgba(10,12,20,0.55)', 3.5], ['rgba(255,255,255,0.95)', 1.4]]) {
          ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
          pts.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
        }
      }
      ctx.restore();
      // tout blanchit, et trois mots
      if (k > 0.62) { ctx.fillStyle = U.rgba('#f7f8f7', U.clamp((k - 0.62) / 0.33, 0, 1)); ctx.fillRect(0, 0, W, H); }
      const ta = U.clamp((k - 0.25) / 0.25, 0, 1) * (k > 0.9 ? U.clamp((1 - k) / 0.1, 0, 1) : 1);
      if (ta > 0) {
        ctx.save(); ctx.globalAlpha = ta; ctx.textAlign = 'center';
        ctx.font = '500 ' + Math.round(U.clamp(W / 30, 22, 40)) + 'px ' + AN.FONT_SERIF;
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(247,248,247,0.8)';
        ctx.strokeText('Vous tombez.', W / 2, H * 0.42); ctx.fillStyle = AN.INK; ctx.fillText('Vous tombez.', W / 2, H * 0.42);
        ctx.restore();
      }
    }
    const asc = X.ascend;
    if (asc) {
      const k = U.clamp(asc.t / asc.dur, 0, 1);
      ctx.fillStyle = U.rgba('#ffffff', k * k * 0.95); ctx.fillRect(0, 0, W, H);
    }
  };
})();
