/* L'impression d'y être (1.10) : ce qu'on voit autour de soi aux échelons
   Monde, Orbite et Système, et la carte « vous êtes ici » de chaque échelon.
   - Monde : un horizon courbe en haut de l'écran, des ombres de nuages qui passent.
   - Orbite : la planète en contrebas, qui défile plus lentement que le sol, des
     étoiles, et des débris qui passent devant.
   - Système : l'étoile et les autres planètes au loin, et les puits de gravité
     qui creusent une trame de l'espace.
   Pour l'orbite et le système, le sol de la zone est peint à demi transparent
   (zone.backdrop) : le fond se voit au travers. Rien de tout cela ne touche aux règles. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const TAU = Math.PI * 2;

  const Sk = (AN.Skies = {});
  /** Les échelons dont le sol laisse voir un fond. */
  Sk.hasBackdrop = (X) => !!X && !!X.echelon && (X.echelon.id === 'orbite' || X.echelon.id === 'systeme');

  let STARS = null;
  function stars() {
    if (STARS) return STARS;
    const rng = new AN.RNG(31337);
    STARS = Array.from({ length: 260 }, () => ({ x: rng.next(), y: rng.next(), s: rng.float(0.6, 2), a: rng.float(0.25, 0.9), c: rng.pick(['#ffffff', '#c8d8ff', '#fff0c0']), d: rng.float(0.01, 0.05) }));
    return STARS;
  }
  /** Couleurs de la planète vue d'orbite (ou des planètes du système), tirées de la graine du monde. */
  function planetPal(seed, k) {
    const regions = D.BIOMES.filter((b) => !b.scale);
    const b = regions[AN.hash(seed + ':planete:' + (k || 0)) % regions.length];
    return { sea: b.ground[0], land: b.ground[2], top: b.wall.top, accent: b.accent };
  }

  function drawStars(ctx, X, W, H) {
    const cam = X.cam;
    for (const s of stars()) {
      const x = ((s.x * W - cam.x * s.d) % W + W) % W, y = ((s.y * H - cam.y * s.d) % H + H) % H;
      ctx.fillStyle = U.rgba(s.c, s.a);
      ctx.fillRect(x, y, s.s, s.s);
    }
  }

  /** Fond d'écran, sous le terrain (orbite, système). */
  Sk.drawBackdrop = function (ctx, X, t) {
    const cam = X.cam, W = cam.W, H = cam.H;
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#04050b'); g.addColorStop(1, '#0b1020');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    drawStars(ctx, X, W, H);
    const seed = X.world.seed;
    if (X.echelon.id === 'orbite') {
      // la planète en contrebas : énorme, et elle défile bien plus lentement que le sol
      const P = planetPal(seed, 0);
      // son bord (le limbe) passe vers le haut de l'écran : au-dessus, l'espace
      const R = Math.max(W, H) * 1.6;
      const cx = W / 2 - cam.x * 0.04, cy = H * 0.38 + R - cam.y * 0.04;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
      ctx.fillStyle = P.sea; ctx.fillRect(0, 0, W, H);
      const rng = AN.RNG.from(seed, 'continents');
      for (let i = 0; i < 9; i++) {
        const a = rng.float(-0.9, 0.9) - Math.PI / 2 + t * 0.004, d = R * rng.float(0.55, 0.98);
        const s = R * rng.float(0.06, 0.16);
        ctx.fillStyle = U.rgba(P.land, 0.9);
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s * 1.6, s, a, 0, TAU); ctx.fill();
      }
      for (let i = 0; i < 7; i++) {
        const a = rng.float(-0.9, 0.9) - Math.PI / 2 + t * 0.007, d = R * rng.float(0.6, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * 0.14, R * 0.025, a + Math.PI / 2, 0, TAU); ctx.fill();
      }
      const sh = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R);
      sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = sh; ctx.fillRect(0, 0, W, H);
      ctx.restore();
      ctx.strokeStyle = U.rgba('#9fe8ff', 0.45); ctx.lineWidth = 10;
      ctx.beginPath(); ctx.arc(cx, cy, R + 5, 0, TAU); ctx.stroke();
      ctx.strokeStyle = U.rgba('#ffffff', 0.35); ctx.lineWidth = 2;
      ctx.stroke();
    } else if (X.echelon.id === 'systeme') {
      // l'étoile, au loin, dans la direction d'où viennent les éruptions
      const a = X.zone.starAngle || 0;
      const sx = W / 2 + Math.cos(a) * Math.min(W, H) * 0.75 - cam.x * 0.015, sy = H / 2 + Math.sin(a) * Math.min(W, H) * 0.75 - cam.y * 0.015;
      const sr = Math.min(W, H) * 0.16;
      const glow = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 4);
      glow.addColorStop(0, 'rgba(255,240,190,0.75)'); glow.addColorStop(0.4, 'rgba(255,200,90,0.18)'); glow.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff3c8'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
      // les autres planètes, sur leurs orbites, à des distances différentes (parallaxe)
      for (let k = 1; k <= 3; k++) {
        const P = planetPal(seed, k);
        const orb = Math.min(W, H) * (0.45 + k * 0.32);
        const pa = AN.hash(seed + ':orbite:' + k) % 628 / 100 + t * 0.01 / k;
        const par = 0.03 + k * 0.03;
        const px = sx + Math.cos(pa) * orb - cam.x * par, py = sy + Math.sin(pa) * orb * 0.7 - cam.y * par;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(sx - cam.x * par, sy - cam.y * par, orb, orb * 0.7, 0, 0, TAU); ctx.stroke();
        const pr = Math.min(W, H) * (0.03 + k * 0.012);
        ctx.fillStyle = P.land; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
        const lit = ctx.createLinearGradient(px + Math.cos(Math.atan2(sy - py, sx - px)) * pr, py + Math.sin(Math.atan2(sy - py, sx - px)) * pr, px - Math.cos(Math.atan2(sy - py, sx - px)) * pr, py - Math.sin(Math.atan2(sy - py, sx - px)) * pr);
        lit.addColorStop(0, 'rgba(255,255,255,0.25)'); lit.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = lit; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
        if (k === 2) { ctx.strokeStyle = U.rgba(P.top, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, pr * 2, pr * 0.5, -0.3, 0, TAU); ctx.stroke(); }
      }
    }
  };

  /** Système : les puits de gravité creusent une trame de l'espace (coordonnées du monde, sous les créatures). */
  Sk.drawWellGrid = function (ctx, X, t) {
    const wells = X.zone.wells;
    if (!wells || !wells.length || !X.echelon || X.echelon.id !== 'systeme') return;
    const v = X.cam.view(60);
    const step = 96, seg = 32;
    const bend = (x, y) => {
      let dx = 0, dy = 0;
      for (const w of wells) {
        const ex = w.x - x, ey = w.y - y, d = Math.hypot(ex, ey) || 1;
        if (d > w.range * 1.3) continue;
        const k = Math.pow(1 - d / (w.range * 1.3), 2) * 46;
        dx += (ex / d) * k; dy += (ey / d) * k;
      }
      return [x + dx, y + dy];
    };
    ctx.strokeStyle = U.rgba('#9fe8ff', 0.12); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = Math.floor(v.x0 / step) * step; x <= v.x1; x += step) {
      for (let y = v.y0; y <= v.y1 + seg; y += seg) { const q = bend(x, y); y === v.y0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); }
    }
    for (let y = Math.floor(v.y0 / step) * step; y <= v.y1; y += step) {
      for (let x = v.x0; x <= v.x1 + seg; x += seg) { const q = bend(x, y); x === v.x0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); }
    }
    ctx.stroke();
    // le centre du puits : un trou qui tourne
    for (const w of wells) {
      if (!X.cam.visible(w.x, w.y, 80)) continue;
      const g = ctx.createRadialGradient(w.x, w.y, 4, w.x, w.y, 70);
      g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w.x, w.y, 70, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.rgba('#9fe8ff', 0.3); ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(w.x, w.y, 20 + k * 14, t * (1 + k * 0.4), t * (1 + k * 0.4) + 2.4); ctx.stroke(); }
    }
  };

  let DEBRIS = null;
  /** Par-dessus tout (écran) : débris qui passent devant en orbite ; ombres de nuages et horizon courbe sur un monde. */
  Sk.drawFront = function (ctx, X, t) {
    if (!X.echelon) return;
    const cam = X.cam, W = cam.W, H = cam.H;
    const id = X.echelon.id;
    if (id === 'orbite') {
      if (!DEBRIS) { const rng = new AN.RNG(4242); DEBRIS = Array.from({ length: 10 }, () => ({ x: rng.next(), y: rng.next(), s: rng.float(10, 34), r: rng.float(0, TAU), v: rng.float(-0.6, 0.6), pts: Array.from({ length: 7 }, () => rng.float(0.6, 1.1)) })); }
      ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
      const MW = W + 200, MH = H + 200;
      for (const d of DEBRIS) {
        // plus proches que le sol : ils défilent plus vite que lui
        const x = ((d.x * MW - cam.x * 1.35 * cam.zoom - t * 12) % MW + MW) % MW - 100, y = ((d.y * MH - cam.y * 1.35 * cam.zoom) % MH + MH) % MH - 100;
        ctx.save(); ctx.translate(x, y); ctx.rotate(d.r + t * d.v);
        ctx.fillStyle = 'rgba(30,30,40,0.55)'; ctx.strokeStyle = 'rgba(200,200,220,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); d.pts.forEach((k, i) => { const a = (i / d.pts.length) * TAU; i ? ctx.lineTo(Math.cos(a) * d.s * k, Math.sin(a) * d.s * k) : ctx.moveTo(Math.cos(a) * d.s * k, Math.sin(a) * d.s * k); });
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    } else if (id === 'monde') {
      // ombres de nuages, poussées par le vent (coordonnées du monde)
      cam.apply(ctx);
      const rng = AN.RNG.from(X.world.seed, 'nuages');
      const v = cam.view(400);
      const span = 2600;
      for (let i = 0; i < 9; i++) {
        const bx = rng.float(0, span), by = rng.float(0, span), sx = rng.float(160, 380), sy = rng.float(80, 190);
        const wx = ((bx + t * 22 - v.x0) % span + span) % span + v.x0 - 400, wy = ((by + t * 6 - v.y0) % span + span) % span + v.y0 - 400;
        if (wx < v.x0 - sx || wx > v.x1 + sx || wy < v.y0 - sy || wy > v.y1 + sy) continue;
        const g = ctx.createRadialGradient(wx, wy, 10, wx, wy, sx);
        g.addColorStop(0, 'rgba(10,14,24,0.2)'); g.addColorStop(1, 'rgba(10,14,24,0)');
        ctx.fillStyle = g;
        ctx.save(); ctx.translate(wx, wy); ctx.scale(1, sy / sx); ctx.translate(-wx, -wy);
        ctx.beginPath(); ctx.arc(wx, wy, sx, 0, TAU); ctx.fill();
        ctx.restore();
      }
      // l'horizon : au loin, le monde se courbe et s'efface sous le ciel (fixe à l'écran, comme tout horizon)
      ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
      const cx = W / 2, cy = H * 2.7 + Math.max(0, W - H * 1.7) * 0.6;
      const rh = cy - H * 0.035; // le bord : tout en haut au centre, plus bas dans les coins
      const g = ctx.createRadialGradient(cx, cy, rh - H * 0.3, cx, cy, rh + H * 0.12);
      g.addColorStop(0, 'rgba(225,236,255,0)');
      g.addColorStop(0.62, 'rgba(225,236,255,0.2)');
      g.addColorStop(0.71, 'rgba(240,246,255,0.42)');
      g.addColorStop(0.73, 'rgba(150,190,240,0.5)');
      g.addColorStop(1, 'rgba(26,40,80,0.6)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.4);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, rh, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    }
  };

  /* ======================= Carte « vous êtes ici » ======================= */
  /** Un schéma de l'échelon : le monde et ses zones, l'orbite et ses lunes, le système, la galaxie…
      Retourne la légende (« Vous êtes ici : … »). */
  Sk.drawWhere = function (ctx, X, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#10131c'; ctx.fillRect(0, 0, w, h);
    const E = X.echelon || D.ECHELONS.region;
    const n = X.world.zones.length;
    const cx = w / 2, cy = h / 2 + 2;
    const R = Math.min(w, h) * 0.38;
    const base = X.base && X.base.state !== 'gone' ? X.base.zi : -1;
    const col = (zi) => D.BIOME[AN.Expedition.zoneSpec(X, zi).biome].ground[1];
    const here = X.zi;
    const pts = []; // centre de chaque zone (puis le cœur, en dernier)
    const id = E.id;
    ctx.lineWidth = 1;
    if (id === 'orbite') {
      ctx.fillStyle = '#5a7090'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(cx, cy, R * 1.25, R * 0.75, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU + 0.6; pts.push({ x: cx + Math.cos(a) * R * 1.25, y: cy + Math.sin(a) * R * 0.75, r: 7 }); }
      pts.push({ x: cx, y: cy - R * 0.32 - 8, r: 6 });
    } else if (id === 'systeme') {
      ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, TAU); ctx.fill();
      for (let i = 0; i < n; i++) {
        const rr = R * (0.55 + i * 0.32);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(cx, cy, rr * 1.3, rr * 0.7, 0, 0, TAU); ctx.stroke();
        const a = i * 2.1 + 0.4;
        pts.push({ x: cx + Math.cos(a) * rr * 1.3, y: cy + Math.sin(a) * rr * 0.7, r: 6 });
      }
      pts.push({ x: cx, y: cy, r: 9 });
    } else if (id === 'galaxie' || id === 'amas') {
      if (id === 'galaxie') {
        for (let k = 0; k < 140; k++) { const arm = k % 3, d = (k / 140); const a = arm * (TAU / 3) + d * 4.5; ctx.fillStyle = 'rgba(200,190,255,0.35)'; ctx.fillRect(cx + Math.cos(a) * R * 1.3 * d, cy + Math.sin(a) * R * 0.8 * d, 1.4, 1.4); }
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU + 2.4; const d = 0.75; pts.push({ x: cx + Math.cos(a + d * 4.5 - 2.4) * R * 1.3 * d, y: cy + Math.sin(a + d * 4.5 - 2.4) * R * 0.8 * d, r: 6 }); }
      } else {
        for (let i = 0; i < n; i++) { const a = (i / n) * TAU + 0.3; pts.push({ x: cx + Math.cos(a) * R * 1.3, y: cy + Math.sin(a) * R * 0.85, r: 8 }); }
        ctx.strokeStyle = 'rgba(154,122,232,0.45)'; ctx.setLineDash([3, 3]);
        pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cx, cy); ctx.stroke(); });
        ctx.setLineDash([]);
      }
      pts.push({ x: cx, y: cy, r: 8 });
    } else if (id === 'toile') {
      for (let i = 0; i < n; i++) { const a = (i / n) * TAU - Math.PI / 2; pts.push({ x: cx + Math.cos(a) * R * 1.3, y: cy + Math.sin(a) * R * 0.85, r: 6 }); }
      pts.push({ x: cx, y: cy, r: 8 });
      ctx.strokeStyle = 'rgba(191,226,255,0.55)';
      pts.forEach((p, i) => pts.forEach((q, j) => { if (j > i) { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); } }));
    } else if (id === 'pli') {
      // des feuillets, et le pli au milieu
      ctx.fillStyle = '#f2f0ea';
      ctx.beginPath(); ctx.moveTo(cx - R * 1.4, cy - R * 0.8); ctx.lineTo(cx, cy - R); ctx.lineTo(cx + R * 1.4, cy - R * 0.8); ctx.lineTo(cx + R * 1.4, cy + R * 0.9); ctx.lineTo(cx, cy + R * 0.7); ctx.lineTo(cx - R * 1.4, cy + R * 0.9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2346c8'; ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R * 0.7); ctx.stroke();
      for (let i = 0; i < n; i++) pts.push({ x: cx + (i % 2 ? 1 : -1) * R * 0.75, y: cy - R * 0.4 + Math.floor(i / 2) * R * 0.8, r: 7 });
      pts.push({ x: cx, y: cy, r: 7 });
    } else {
      // région ou monde : un disque en secteurs, le cœur au centre
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU - Math.PI / 2, a1 = ((i + 1) / n) * TAU - Math.PI / 2;
        ctx.fillStyle = U.rgba(col(i), i === here ? 1 : 0.55);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 1.05, a0, a1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#10131c'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
        const am = (a0 + a1) / 2;
        pts.push({ x: cx + Math.cos(am) * R * 0.7, y: cy + Math.sin(am) * R * 0.7, r: 0, sector: true });
      }
      ctx.fillStyle = U.rgba(col(n), here === n ? 1 : 0.7);
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, TAU); ctx.fill(); ctx.strokeStyle = '#10131c'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
      pts.push({ x: cx, y: cy, r: 0, sector: true });
    }
    // les zones : conquises, l'hexagone, vous (à l'encre sur la page blanche du Pli)
    const ink = id === 'pli' ? '#1c2230' : '#ffffff';
    pts.forEach((q, zi) => {
      if (!q.sector) {
        ctx.fillStyle = col(zi); ctx.strokeStyle = zi === here ? ink : U.rgba(ink, 0.45); ctx.lineWidth = zi === here ? 2 : 1;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1;
      }
      if (X.conquered.has(zi)) { ctx.fillStyle = AN.CYAN; ctx.beginPath(); ctx.arc(q.x + 7, q.y - 7, 2.5, 0, TAU); ctx.fill(); }
      if (X.world.nation) {
        // une ville dans chaque zone d'une nation, la capitale au cœur (1.12)
        const P = D.PEOPLE[X.world.nation.people];
        ctx.fillStyle = P ? P.body.trim : '#ffffff'; ctx.strokeStyle = ink; ctx.lineWidth = 1;
        const cx2 = q.x - 8, cy2 = q.y - 8, s2 = zi === n ? 4 : 3;
        ctx.beginPath(); ctx.moveTo(cx2 - s2, cy2); ctx.lineTo(cx2, cy2 - s2); ctx.lineTo(cx2 + s2, cy2); ctx.lineTo(cx2 + s2, cy2 + s2); ctx.lineTo(cx2 - s2, cy2 + s2); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (zi === base) {
        ctx.strokeStyle = ink; ctx.lineWidth = 1.3; AN.Base.hexPath(ctx, q.x - 9, q.y + 6, 4); ctx.stroke(); ctx.lineWidth = 1;
      }
    });
    const me = pts[here];
    if (me) {
      ctx.strokeStyle = id === 'pli' ? AN.CYAN : '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(me.x, me.y, (me.r || 6) + 4 + Math.sin(t * 4) * 1.5, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
    }
    return 'Vous êtes ici : ' + (here >= n ? E.heart.toLowerCase() : E.unit.toLowerCase() + ' ' + (here + 1) + ' sur ' + n);
  };
})();
