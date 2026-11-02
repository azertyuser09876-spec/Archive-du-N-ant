/* Dessin des colosses (1.16), entièrement procédural.
   - drawGround : l'ombre portée (une seule forme, toutes capsules confondues), les remous
     d'un serpent enfoui, puis les parties basses du corps (pieds, anneaux au sol, pointes
     des bras) : elles passent sous le joueur.
   - drawHigh : le reste du corps, au-dessus du joueur (rendu translucide quand il est dessous),
     les ornements de chaque colosse, les sceaux, les yeux ; l'endroit où l'on peut s'agripper.
   - drawGrip : la jauge d'endurance de la prise, autour du joueur. */
(function () {
  'use strict';
  const AN = window.AN;
  const U = AN.Util;
  const TAU = Math.PI * 2;
  const CA = (AN.ColossusArt = {});

  /** Position dessinée d'un nœud : sa hauteur le projette (perspective et parallaxe, voir colossus.js). */
  const P = (col, n) => AN.Colossus.pn(col, n);
  const sy = (col, n) => P(col, n).y;
  const sxn = (col, n) => P(col, n).x;

  function capPath(ctx, ax, ay, ra, bx, by, rb) {
    const a = Math.atan2(by - ay, bx - ax);
    ctx.moveTo(ax + Math.cos(a + Math.PI / 2) * ra, ay + Math.sin(a + Math.PI / 2) * ra);
    ctx.arc(ax, ay, Math.max(0.5, ra), a + Math.PI / 2, a + Math.PI * 1.5);
    ctx.arc(bx, by, Math.max(0.5, rb), a - Math.PI / 2, a + Math.PI / 2);
    ctx.closePath();
  }
  const meanZ = (col, c) => (col.n[c.a].z + col.n[c.b].z) / 2;
  /** Nuance de chaque partie : vers le sombre (positif) ou le clair (négatif). */
  const PART_TONE = { dos: 0, corps: 0, moyeu: -0.1, tete: -0.12, cou: 0.08, epaule: 0.06, hanche: 0.1, bras: 0.18, cuisse: 0.18, main: 0.3, pied: 0.32, queue: 0.15, aile: 0 };
  const isLow = (col, c) => Math.max(col.n[c.a].z, col.n[c.b].z) < 0.55;
  const hiddenCap = (col, c) => c.hide || (col.n[c.a].under && col.n[c.b].under);

  function colossi(X) {
    const cam = X.cam, out = [];
    for (const e of X.creatures) if (e.alive && e.col && cam.visible(e.col.x, e.col.y, e.col.L * 1.4)) out.push(e);
    return out;
  }

  /* ---------- ombre et parties basses ---------- */
  CA.drawGround = function (ctx, X, t) {
    AN.Colossus.setView(X.cam);
    for (const e of colossi(X)) {
      const col = e.col;
      if (col.hidden > 0) { sparkles(ctx, e, col, t); continue; }
      // une seule ombre pour tout le corps (un colosse-carte n'a pas de sol où la porter)
      if (!col.map) {
      const alt = col.plan === 'volant' ? col.alt : 0;
      ctx.fillStyle = 'rgba(10,12,20,' + U.clamp(0.24 - alt * 0.06, 0.08, 0.24) + ')';
      ctx.beginPath();
      for (const c of col.caps) {
        if (hiddenCap(col, c)) continue;
        const A = col.n[c.a], B = col.n[c.b];
        const k = 1 + (A.z + B.z) * 0.08;
        capPath(ctx, A.x + A.z * 8, A.y + A.z * 6, c.ra * k, B.x + B.z * 8, B.y + B.z * 6, c.rb * k);
      }
      if (col.plan === 'volant') wingShape(ctx, col, true);
      ctx.fill('nonzero');
      }
      // un serpent enfoui : la terre se soulève
      if (col.plan === 'serpent') for (let i = 0; i < col.N; i++) {
        const n = col.n['s' + i];
        if (!n.under) continue;
        ctx.strokeStyle = U.rgba(e.pal.dark, 0.35); ctx.lineWidth = 3;
        const r = col.L * 0.05 * (1 - i / col.N * 0.5) + 6 + Math.sin(t * 6 + i) * 2;
        ctx.beginPath(); ctx.ellipse(n.x, n.y, r * 1.3, r * 0.8, col.a, 0, TAU); ctx.stroke();
      }
      drawCaps(ctx, X, e, col, t, true);
    }
  };
  /* ---------- le corps, au-dessus ---------- */
  CA.drawHigh = function (ctx, X, t) {
    const p = X.player;
    let under = false;
    for (const e of colossi(X)) {
      if (e.col.hidden > 0) continue;
      drawCaps(ctx, X, e, e.col, t, false);
      grabHint(ctx, X, e, t);
      if (!p.climb && (p.z || 0) <= 0.3 && e.col.caps.some((c) => !hiddenCap(e.col, c) && !isLow(e.col, c) && AN.Colossus.closest(e.col, c, p.x, p.y, false).d < 0)) under = true;
    }
    // sous le corps : on se voit quand même (un contour par-dessus)
    if (under && p.alive) {
      ctx.strokeStyle = U.rgba('#ffffff', 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, TAU); ctx.stroke();
      ctx.strokeStyle = U.rgba(AN.CYAN, 0.8); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(p.aim) * (p.r + 10), p.y + Math.sin(p.aim) * (p.r + 10)); ctx.stroke();
    }
  };

  function drawCaps(ctx, X, e, col, t, low) {
    const pal = e.flash > 0 ? AN.Art.FLASH : e.pal;
    const p = X.player;
    const list = col.caps.filter((c) => !hiddenCap(col, c) && isLow(col, c) === low);
    // le tronc passe au-dessus des attaches des membres, la tête au-dessus du tronc
    const key = (c) => meanZ(col, c) + (c.part === 'dos' || c.part === 'corps' || c.part === 'moyeu' ? 0.12 : c.part === 'tete' ? 0.2 : 0);
    list.sort((a, b) => key(a) - key(b) || (col.n[a.a].y + col.n[a.b].y) - (col.n[b.a].y + col.n[b.b].y));
    if (!low && col.plan === 'volant') drawWings(ctx, col, pal, t);
    for (let c of list) {
      if (c.part === 'aile') continue;
      const A = col.n[c.a], B = col.n[c.b];
      const pa = P(col, A), pb = P(col, B);
      const ax = pa.x, ay = pa.y, bx = pb.x, by = pb.y;
      // chaque extrémité grandit avec sa hauteur : la capsule a sa propre perspective
      c = Object.assign(Object.create(c), { ra: c.ra * pa.s, rb: c.rb * pb.s });
      // le joueur est dessous : le corps se fait translucide
      let alpha = 1;
      if (!low && !p.climb) {
        const q = AN.Colossus.closest(col, Object.getPrototypeOf(c), p.x, p.y, false);
        if (q.d < 6) alpha = 0.45;
      }
      ctx.globalAlpha = alpha;
      // chaque membre a sa nuance : le tronc clair, les membres plus sombres vers leur extrémité
      const tone = PART_TONE[c.part] != null ? PART_TONE[c.part] : 0.1;
      ctx.fillStyle = tone >= 0 ? U.mix(pal.body, pal.dark, tone) : U.mix(pal.body, pal.light, -tone);
      ctx.beginPath(); capPath(ctx, ax, ay, c.ra, bx, by, c.rb); ctx.fill();
      ctx.strokeStyle = U.shade(pal.dark, -0.25); ctx.lineWidth = Math.max(2.5, col.L * 0.0045); ctx.stroke();
      // lumière sur le dessus
      ctx.fillStyle = U.rgba(pal.light, 0.35);
      ctx.beginPath(); capPath(ctx, ax - c.ra * 0.2, ay - c.ra * 0.25, c.ra * 0.55, bx - c.rb * 0.2, by - c.rb * 0.25, c.rb * 0.55); ctx.fill();
      if (c.part === 'pied' || c.part === 'main') { // le pied (ou le poing) : une semelle sombre
        ctx.fillStyle = U.shade(pal.dark, -0.15);
        ctx.beginPath(); ctx.ellipse(bx, by, c.rb * 1.35, c.rb * 1.05, Math.atan2(by - ay, bx - ax), 0, TAU); ctx.fill();
        ctx.strokeStyle = U.rgba(pal.light, 0.4); ctx.lineWidth = 2; ctx.stroke();
      }
      if (c.part === 'cuisse' || c.part === 'bras') { ctx.fillStyle = U.shade(pal.dark, -0.1); ctx.beginPath(); ctx.arc(bx, by, c.rb * 0.75, 0, TAU); ctx.fill(); }
      deco(ctx, e, col, c, ax, ay, bx, by, pal, t);
      if (c.part === 'tete') eyes(ctx, e, col, c, ax, ay, bx, by, pal, t);
      ctx.globalAlpha = 1;
    }
    // son dos (1.16.2) : ce qui y pousse, les gisements, ceux qui y vivent
    if (col.deck) drawDeck(ctx, X, e, col, t, low, pal);
    // les sceaux de cette couche
    for (const s of col.seals) {
      const q = AN.Colossus.sealPos(col, s);
      if (!q || hiddenCap(col, q.cap) || isLow(col, q.cap) !== low) continue;
      seal(ctx, e, col, s, q, pal, t);
    }
  }

  /* ---------- l'écosystème de son dos (1.16.2) ---------- */
  function drawDeck(ctx, X, e, col, t, low, pal) {
    const zb = (X.zone && AN.Data.BIOME[X.zone.biome]) || {};
    const g1 = (zb.ground && zb.ground[1]) || '#6a8a4a', acc = zb.accent || pal.accent;
    const big = Math.min(1.7, col.L / 1100);
    for (const d of col.deck.decor) {
      const c = col.caps[d.cap];
      if (!c || hiddenCap(col, c) || isLow(col, c) !== low) continue;
      const q = AN.Colossus.capPoint(col, c, d.t, d.off);
      item(ctx, d.kind, q.x, q.y, q.s * d.s * big, d.seed, t, pal, g1, acc);
    }
    // la plateforme de l'Artefact, sur un colosse-carte (1.16.3)
    const pad = col.deck.pad, pc = pad && col.caps[pad.cap];
    if (pc && !hiddenCap(col, pc) && isLow(col, pc) === low) {
      const q = AN.Colossus.capPoint(col, pc, pad.t, pad.off);
      padDraw(ctx, q.x, q.y, q.s, pad.R, t, AN.Colossus.padLand(X));
    }
    for (const n of col.deck.nodes) {
      const c = col.caps[n.cap];
      if (n.uses <= 0 || !c || hiddenCap(col, c) || isLow(col, c) !== low) continue;
      const q = AN.Colossus.capPoint(col, c, n.t, n.off), R = AN.Data.RESOURCES[n.res], s = q.s;
      const g = ctx.createRadialGradient(q.x, q.y, 2, q.x, q.y, 26 * s);
      g.addColorStop(0, U.rgba(R.color, 0.5)); g.addColorStop(1, U.rgba(R.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 26 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = R.color; ctx.strokeStyle = U.shade(R.color, -0.4); ctx.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) { const a = k * 1.7 + n.t * 9; ctx.beginPath(); ctx.ellipse(q.x + Math.cos(a) * 7 * s, q.y + Math.sin(a) * 5 * s, 6 * s, 4.5 * s, a, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
    for (const r of col.deck.riders) {
      if (!r.alive || !r.rider || r.rider.low !== low) continue;
      const s = r.riderS || 1;
      ctx.save(); ctx.translate(r.x, r.y); ctx.scale(s, s); ctx.translate(-r.x, -r.y);
      AN.Art.draw(ctx, r, t);
      ctx.restore();
      if (r.weak) { ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(r.x, r.y, r.r * s + 5, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      if (r.hp < r.maxHp) { const w = Math.max(16, r.r * s * 1.6); ctx.fillStyle = 'rgba(16,19,28,0.6)'; ctx.fillRect(r.x - w / 2, r.y - r.r * s - 10, w, 3); ctx.fillStyle = r.weak ? AN.CYAN : AN.INK; ctx.fillRect(r.x - w / 2, r.y - r.r * s - 10, w * U.clamp(r.hp / r.maxHp, 0, 1), 3); }
    }
  }
  /** Un élément du paysage de son dos. */
  function item(ctx, kind, x, y, s, seed, t, pal, g1, acc) {
    const u = 14 * s, rr = (k) => ((seed * 9301 + k * 49297) % 233280) / 233280;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(10,12,20,0.18)'; ctx.beginPath(); ctx.ellipse(u * 0.25, u * 0.35, u * 0.9, u * 0.35, 0, 0, TAU); ctx.fill();
    if (kind === 'arbre') {
      ctx.fillStyle = U.shade(g1, -0.35); ctx.fillRect(-u * 0.12, -u * 0.6, u * 0.24, u * 0.8);
      ctx.fillStyle = U.shade(g1, -0.1); ctx.beginPath(); ctx.arc(0, -u * 0.9, u * 0.75, 0, TAU); ctx.fill();
      ctx.fillStyle = U.shade(g1, 0.15); ctx.beginPath(); ctx.arc(-u * 0.2, -u * 1.05, u * 0.4, 0, TAU); ctx.fill();
    } else if (kind === 'herbe') {
      ctx.strokeStyle = U.shade(g1, 0.1); ctx.lineWidth = Math.max(1, u * 0.1);
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.35 + Math.sin(t * 2 + seed + k) * 0.08; ctx.beginPath(); ctx.moveTo((k - 2) * u * 0.12, 0); ctx.lineTo((k - 2) * u * 0.12 + Math.cos(a) * u * 0.7, Math.sin(a) * u * 0.7); ctx.stroke(); }
    } else if (kind === 'champignon') {
      ctx.fillStyle = '#e8e0d0'; ctx.fillRect(-u * 0.1, -u * 0.5, u * 0.2, u * 0.5);
      ctx.fillStyle = acc; ctx.beginPath(); ctx.ellipse(0, -u * 0.55, u * 0.45, u * 0.28, 0, Math.PI, TAU); ctx.fill();
    } else if (kind === 'rocher') {
      ctx.fillStyle = U.mix(pal.dark, '#8a8478', 0.5); ctx.strokeStyle = U.shade(pal.dark, -0.3); ctx.lineWidth = 1.5;
      ctx.beginPath(); for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, r = u * (0.45 + rr(k) * 0.3); k ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.75 - u * 0.15) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.75 - u * 0.15); } ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'ruine') {
      ctx.fillStyle = '#d8d2c4'; ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) { const h = u * (0.5 + rr(k) * 0.9); ctx.fillRect((k - 1) * u * 0.45 - u * 0.12, -h, u * 0.24, h); ctx.strokeRect((k - 1) * u * 0.45 - u * 0.12, -h, u * 0.24, h); }
      ctx.fillRect(-u * 0.6, -u * 0.08, u * 1.2, u * 0.16);
    } else if (kind === 'cristal') {
      ctx.fillStyle = U.rgba(acc, 0.85); ctx.strokeStyle = U.shade(acc, -0.35); ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) { const ox = (k - 1) * u * 0.3, h = u * (0.6 + rr(k) * 0.7); ctx.beginPath(); ctx.moveTo(ox - u * 0.14, 0); ctx.lineTo(ox + (k - 1) * u * 0.1, -h); ctx.lineTo(ox + u * 0.14, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    } else if (kind === 'braise') {
      const pu = 0.6 + 0.4 * Math.sin(t * 4 + seed);
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, u); g.addColorStop(0, U.rgba('#ffb04a', 0.8 * pu)); g.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, u, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2a24'; ctx.beginPath(); ctx.arc(0, 0, u * 0.3, 0, TAU); ctx.fill();
    } else if (kind === 'corail') {
      ctx.strokeStyle = U.mix(acc, '#ff8a9a', 0.5); ctx.lineWidth = Math.max(1.5, u * 0.14); ctx.lineCap = 'round';
      for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + (k - 1.5) * 0.45; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a) * u * 0.4, Math.sin(a) * u * 0.5, Math.cos(a) * u * 0.8 + Math.sin(t + k) * 1.5, Math.sin(a) * u * 0.9); ctx.stroke(); }
      ctx.lineCap = 'butt';
    } else if (kind === 'rouage') {
      ctx.fillStyle = U.shade(pal.dark, -0.1); ctx.strokeStyle = U.shade(pal.dark, -0.4); ctx.lineWidth = 1.5;
      ctx.save(); ctx.translate(0, -u * 0.3); ctx.rotate(t * 0.5 + seed);
      for (let k = 0; k < 8; k++) { ctx.rotate(TAU / 8); ctx.fillRect(-u * 0.08, -u * 0.6, u * 0.16, u * 0.2); }
      ctx.beginPath(); ctx.arc(0, 0, u * 0.45, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if (kind === 'etoile') {
      for (let k = 0; k < 3; k++) { const tw = 0.5 + 0.5 * Math.sin(t * 3 + seed + k * 2); ctx.fillStyle = U.rgba('#ffffff', 0.5 + tw * 0.5); ctx.beginPath(); ctx.arc((rr(k) - 0.5) * u * 1.6, (rr(k + 5) - 0.5) * u * 1.2, 1.5 + tw * 2 * s, 0, TAU); ctx.fill(); }
    } else if (kind === 'toile') {
      ctx.strokeStyle = 'rgba(232,224,240,0.6)'; ctx.lineWidth = 1;
      for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * u, Math.sin(a) * u * 0.8); ctx.stroke(); }
      for (let ring = 1; ring <= 2; ring++) { ctx.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k / 6) * TAU; const x2 = Math.cos(a) * u * ring * 0.45, y2 = Math.sin(a) * u * ring * 0.36; k ? ctx.lineTo(x2, y2) : ctx.moveTo(x2, y2); } ctx.stroke(); }
    }
    ctx.restore();
  }

  /* ---------- ailes et nageoires ---------- */
  function wingShape(ctx, col, ground) {
    ['g', 'd'].forEach((s) => {
      const r = col.n['aile_' + s + '0'], tip = col.n['aile_' + s + '1'], back = col.n.ventre;
      const Y = (n) => (ground ? n.y + n.z * 6 : sy(col, n));
      const X0 = (n) => (ground ? n.x + n.z * 8 : sxn(col, n));
      ctx.moveTo(X0(r), Y(r));
      ctx.quadraticCurveTo((X0(r) + X0(tip)) / 2 + (tip.y - r.y) * 0.1, (Y(r) + Y(tip)) / 2 - col.L * 0.04, X0(tip), Y(tip));
      ctx.quadraticCurveTo((X0(tip) + X0(back)) / 2, (Y(tip) + Y(back)) / 2 + col.L * 0.03, X0(back), Y(back));
      ctx.closePath();
    });
  }
  function drawWings(ctx, col, pal, t) {
    ctx.fillStyle = U.rgba(pal.light, 0.85);
    ctx.beginPath(); wingShape(ctx, col, false); ctx.fill();
    ctx.strokeStyle = pal.dark; ctx.lineWidth = Math.max(2, col.L * 0.004); ctx.stroke();
    // nervures ou plumes
    ['g', 'd'].forEach((s) => {
      const r = col.n['aile_' + s + '0'], tip = col.n['aile_' + s + '1'], back = col.n.ventre;
      ctx.strokeStyle = U.rgba(pal.dark, 0.5); ctx.lineWidth = 1.5;
      for (let k = 1; k < 5; k++) {
        const f = k / 5;
        const ex = U.lerp(sxn(col, tip), sxn(col, back), f * 0.8), ey = U.lerp(sy(col, tip), sy(col, back), f * 0.8);
        ctx.beginPath(); ctx.moveTo(sxn(col, r), sy(col, r)); ctx.lineTo(ex, ey); ctx.stroke();
      }
      if (col.cfg.look === 'plumes') {
        ctx.fillStyle = U.rgba('#ff9a3a', 0.35 + 0.15 * Math.sin(t * 8));
        for (let k = 0; k < 6; k++) { const f = k / 6; ctx.beginPath(); ctx.arc(U.lerp(sxn(col, tip), sxn(col, back), f), U.lerp(sy(col, tip), sy(col, back), f), col.L * 0.02, 0, TAU); ctx.fill(); }
      }
    });
  }

  /* ---------- ornements ---------- */
  function deco(ctx, e, col, c, ax, ay, bx, by, pal, t) {
    const look = col.cfg.look;
    const L = col.L, len = Math.hypot(bx - ax, by - ay), r = (c.ra + c.rb) / 2;
    const at = (f, o) => { const a = Math.atan2(by - ay, bx - ax); return { x: U.lerp(ax, bx, f) + Math.cos(a + Math.PI / 2) * o * r, y: U.lerp(ay, by, f) + Math.sin(a + Math.PI / 2) * o * r }; };
    const seed = c.i * 7.3;
    if (look === 'mousse') {
      ctx.strokeStyle = '#4f7f2a'; ctx.lineWidth = 2;
      for (let k = 0; k < 5; k++) { const q = at((k + 0.5) / 5, Math.sin(seed + k * 2.1) * 0.7); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.quadraticCurveTo(q.x + 4, q.y - 8, q.x + Math.sin(t + k) * 3, q.y - 14); ctx.stroke(); }
    } else if (look === 'continent' && c.part === 'dos') {
      // un continent sur ses épaules : côtes irrégulières, forêts, un lac
      const cx = (ax + bx) / 2, cy = (ay + by) / 2, R = Math.max(c.ra, c.rb) * 1.05;
      ctx.fillStyle = '#7a9a5a'; ctx.strokeStyle = '#4a6a3a'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) { const a = (k / 24) * TAU, rr = R * (0.78 + 0.18 * Math.sin(a * 3 + 1.3) + 0.08 * Math.sin(a * 7)); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.9; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5a8ab0'; ctx.beginPath(); ctx.ellipse(cx + R * 0.25, cy - R * 0.1, R * 0.16, R * 0.1, 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2f5a2a';
      for (let k = 0; k < 16; k++) { const a = k * 2.39, rr = R * 0.6 * Math.sqrt((k + 0.5) / 16); ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr - R * 0.15, cy + Math.sin(a) * rr * 0.9, L * 0.011, 0, TAU); ctx.fill(); }
    } else if (look === 'carapace' && c.part === 'dos') {
      ctx.strokeStyle = U.rgba(pal.dark, 0.7); ctx.lineWidth = 2.5;
      const cx = (ax + bx) / 2, cy = (ay + by) / 2;
      for (let ring = 1; ring <= 2; ring++) for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + ring * 0.5, rr = r * 0.3 * ring;
        ctx.beginPath(); for (let v = 0; v <= 6; v++) { const b = a + (v / 6) * TAU; const x = cx + Math.cos(a) * rr + Math.cos(b) * r * 0.16, y = cy + Math.sin(a) * rr + Math.sin(b) * r * 0.16; v ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      }
    } else if (look === 'braises') {
      ctx.strokeStyle = U.rgba('#ff7a2a', 0.55 + 0.3 * Math.sin(t * 5 + seed)); ctx.lineWidth = 2.5;
      ctx.beginPath(); const q0 = at(0.1, -0.3), q1 = at(0.5, 0.25), q2 = at(0.9, -0.2); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
    } else if (look === 'cristaux' || look === 'glace') {
      ctx.fillStyle = look === 'glace' ? 'rgba(220,240,255,0.75)' : U.rgba(pal.accent, 0.8);
      if (c.part === 'corps' || c.part === 'tete') { const q = at(0.5, 0); ctx.beginPath(); ctx.moveTo(q.x - r * 0.3, q.y); ctx.lineTo(q.x, q.y - r * 1.1); ctx.lineTo(q.x + r * 0.3, q.y); ctx.closePath(); ctx.fill(); }
    } else if (look === 'cratères') {
      ctx.strokeStyle = U.rgba(pal.dark, 0.5); ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const q = at((k + 0.5) / 3, Math.sin(seed + k) * 0.5); ctx.beginPath(); ctx.arc(q.x, q.y, r * (0.15 + 0.1 * ((k + c.i) % 2)), 0, TAU); ctx.stroke(); }
    } else if (look === 'engrenages' && (c.part === 'bras' || c.part === 'moyeu')) {
      ctx.fillStyle = pal.dark;
      const n = c.part === 'moyeu' ? 14 : 3;
      if (c.part === 'moyeu') { const cx = (ax + bx) / 2, cy = (ay + by) / 2; for (let k = 0; k < n; k++) { const a = col.spin + (k / n) * TAU; ctx.fillRect(cx + Math.cos(a) * r - 5, cy + Math.sin(a) * r - 5, 10, 10); } }
      else for (let k = 0; k < n; k++) { const q = at((k + 0.5) / n, 1); ctx.fillRect(q.x - 4, q.y - 4, 8, 8); }
    } else if (look === 'rayons' && c.part === 'bras') {
      ctx.strokeStyle = U.rgba(pal.glow || '#ffe08a', (col.stall > 0 ? 0.15 : 0.55) + 0.2 * Math.sin(t * 7 + seed)); ctx.lineWidth = r * 0.5;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    } else if (look === 'spirale' && c.part === 'moyeu') {
      ctx.strokeStyle = U.rgba(pal.light, 0.8); ctx.lineWidth = 2;
      const cx = (ax + bx) / 2, cy = (ay + by) / 2;
      ctx.beginPath(); for (let k = 0; k < 60; k++) { const a = col.spin * 1.5 + k * 0.25, rr = (k / 60) * r; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    } else if (look === 'pages' && c.part === 'bras') {
      ctx.fillStyle = '#fbfbfa'; ctx.strokeStyle = U.rgba(AN.INK, 0.5); ctx.lineWidth = 1;
      const q = at(0.5, 0), a = Math.atan2(by - ay, bx - ax);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(a); ctx.fillRect(-len * 0.4, -r * 0.8, len * 0.8, r * 1.6); ctx.strokeRect(-len * 0.4, -r * 0.8, len * 0.8, r * 1.6);
      ctx.strokeStyle = U.rgba(AN.INK, 0.25); for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-len * 0.32, -r * 0.5 + k * r * 0.33); ctx.lineTo(len * 0.32, -r * 0.5 + k * r * 0.33); ctx.stroke(); }
      ctx.restore();
    } else if (look === 'etoiles') {
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 4; k++) { const q = at(((k * 0.37 + seed) % 1), Math.sin(seed * 3 + k) * 0.7); const tw = 0.5 + 0.5 * Math.sin(t * 3 + k + seed); ctx.globalAlpha *= 1; ctx.beginPath(); ctx.arc(q.x, q.y, 1.5 + tw * 1.5, 0, TAU); ctx.fill(); }
    } else if (look === 'fils' && (c.part === 'pied' || c.part === 'cuisse')) {
      ctx.strokeStyle = 'rgba(232,224,240,0.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(sxn(col, col.n.corps), sy(col, col.n.corps)); ctx.stroke();
    } else if (look === 'nageoires' && c.part === 'dos') {
      ctx.strokeStyle = U.rgba(pal.light, 0.6); ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const q = at(0.2 + k * 0.2, -0.5), q2 = at(0.2 + k * 0.2, 0.5); ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q2.x, q2.y); ctx.stroke(); }
    }
  }
  function eyes(ctx, e, col, c, ax, ay, bx, by, pal, t) {
    const head = col.plan === 'serpent' ? { x: ax, y: ay } : { x: bx, y: by };
    const r = col.plan === 'serpent' ? c.ra : c.rb;
    const a = col.plan === 'serpent' ? Math.atan2(ay - by, ax - bx) : Math.atan2(by - ay, bx - ax);
    const blink = (Math.sin(t * 0.7 + col.L) > 0.97) ? 0.2 : 1;
    [-1, 1].forEach((sd) => {
      const x = head.x + Math.cos(a) * r * 0.35 + Math.cos(a + Math.PI / 2) * sd * r * 0.42;
      const y = head.y + Math.sin(a) * r * 0.35 + Math.sin(a + Math.PI / 2) * sd * r * 0.42;
      if (pal.glow) { ctx.fillStyle = U.rgba(pal.glow, 0.4); ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, TAU); ctx.fill(); }
      ctx.fillStyle = e.boss && e.boss.exhausted ? U.rgba(pal.eye, 0.4) : pal.eye;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.16, r * 0.16 * blink, a, 0, TAU); ctx.fill();
    });
  }

  /* ---------- sceaux ---------- */
  function seal(ctx, e, col, s, q, pal, t) {
    const r = q.sr;
    ctx.save();
    ctx.translate(q.x, q.y);
    if (s.broken) {
      ctx.strokeStyle = U.rgba(pal.dark, 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.stroke();
      for (let k = 0; k < 5; k++) { const a = k * 1.3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
      ctx.restore();
      return;
    }
    const glow = pal.glow || pal.accent;
    const open = s.open, high = s.kind === 'haut';
    const pulse = 0.5 + 0.5 * Math.sin(t * (open ? 8 : 2.5));
    // halo
    const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * (open ? 3 : 2));
    g.addColorStop(0, U.rgba(open ? '#ffffff' : glow, open ? 0.75 : high ? 0.45 : 0.18));
    g.addColorStop(1, U.rgba(open ? '#ffffff' : glow, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * (open ? 3 : 2), 0, TAU); ctx.fill();
    // le disque, et sa rune
    ctx.fillStyle = open ? '#ffffff' : high ? U.mix(glow, '#ffffff', 0.25) : U.shade(pal.dark, -0.2);
    ctx.strokeStyle = open ? AN.CYAN : pal.dark; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = open ? AN.CYAN : high ? U.rgba(pal.dark, 0.8) : U.rgba(glow, 0.35 + pulse * 0.3); ctx.lineWidth = 2;
    ctx.rotate(t * (open ? 1.5 : 0.4));
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.5, r * 0.35); ctx.lineTo(-r * 0.5, r * 0.35); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, TAU); ctx.stroke();
    if (open) { ctx.strokeStyle = U.rgba(AN.CYAN, 0.7 * pulse); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * (1.3 + pulse * 0.4), 0, TAU); ctx.stroke(); }
    ctx.restore();
    // la vigueur du sceau entamé
    if (s.hp < s.max) {
      const w = Math.max(26, r * 2.2);
      ctx.fillStyle = 'rgba(16,19,28,0.7)'; ctx.fillRect(q.x - w / 2, q.y + r + 5, w, 4);
      ctx.fillStyle = open ? AN.CYAN : glow; ctx.fillRect(q.x - w / 2, q.y + r + 5, w * U.clamp(s.hp / s.max, 0, 1), 4);
    }
  }

  /** Là où l'on peut s'agripper, quand on en est tout près. */
  function grabHint(ctx, X, e, t) {
    const p = X.player;
    if (p.climb || !p.alive) return;
    const g = AN.Colossus.grabSpot(e, p);
    if (!g) return;
    const c = e.col.caps[g.cap];
    const q = AN.Colossus.capPoint(e.col, c, g.t, 0);
    ctx.strokeStyle = U.rgba(AN.CYAN, 0.6 + 0.3 * Math.sin(t * 6)); ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r + 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  }
  function sparkles(ctx, e, col, t) {
    ctx.fillStyle = e.pal.glow || '#ffffff';
    for (let k = 0; k < 40; k++) {
      const a = k * 2.39 + t * 2, r = (k / 40) * col.L * 0.4 * (1 + Math.sin(t * 3) * 0.2);
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 5 + k);
      ctx.beginPath(); ctx.arc(col.x + Math.cos(a) * r, col.y + Math.sin(a) * r * 0.8, 2, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- le colosse-carte (1.16.3) ---------- */
  /** La plateforme : un petit hexagone du blanc de l'Archive, l'Artefact au milieu. land : 0 (dans le ciel) → 1 (posée). */
  function padDraw(ctx, x, y, s, R, t, land) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
    AN.Base.drawPlatform(ctx, x, y, R, t, land < 1 ? { land } : {});
    const up = land < 1 ? Math.pow(1 - U.easeOut(land), 2) : 0;
    ctx.globalAlpha *= U.clamp(land * 3, 0, 1);
    AN.Base.drawArtefact(ctx, x, y - up * 520, t, 1, 0.7);
    ctx.restore();
  }
  let VOID = null;
  function voidStars() {
    if (VOID) return VOID;
    const rng = new AN.RNG(9157);
    VOID = Array.from({ length: 340 }, () => ({ x: rng.next(), y: rng.next(), s: rng.float(0.5, 2.2), a: rng.float(0.2, 0.9), d: rng.float(0.01, 0.12), c: rng.pick(['#ffffff', '#c8d8ff', '#ffe8c8', '#d8c8ff']), ph: rng.float(0, TAU) }));
    return VOID;
  }
  /** Le vide autour d'un colosse-carte : du noir, des étoiles très lointaines, une brume teintée par son paysage. */
  CA.drawVoid = function (ctx, X, t) {
    const cam = X.cam, W = cam.W, H = cam.H;
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
    g.addColorStop(0, '#0a0c18'); g.addColorStop(1, '#020207');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const b = (X.zone && AN.Data.BIOME[X.zone.biome]) || {};
    const acc = b.accent || '#6a7aff';
    const ox = cam.x * cam.zoom, oy = cam.y * cam.zoom;
    for (let k = 0; k < 3; k++) {
      const x = (((0.2 + k * 0.33) * W - ox * 0.004 * (k + 1)) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2;
      const y = (((0.3 + k * 0.21) * H - oy * 0.004 * (k + 1)) % (H * 1.4) + H * 1.4) % (H * 1.4) - H * 0.2;
      const r = Math.max(W, H) * (0.35 + k * 0.1);
      const n = ctx.createRadialGradient(x, y, 0, x, y, r);
      n.addColorStop(0, U.rgba(k === 1 ? '#8a6aff' : acc, 0.07)); n.addColorStop(1, U.rgba(acc, 0));
      ctx.fillStyle = n; ctx.fillRect(0, 0, W, H);
    }
    for (const st of voidStars()) {
      const x = ((st.x * W - ox * st.d) % W + W) % W, y = ((st.y * H - oy * st.d) % H + H) % H;
      ctx.globalAlpha = st.a * (0.75 + 0.25 * Math.sin(t * 1.3 + st.ph));
      ctx.fillStyle = st.c; ctx.fillRect(x, y, st.s, st.s);
    }
    ctx.globalAlpha = 1;
  };
  /** La plateforme seule dans le vide (le colosse n'est plus), et la colonne de lumière de l'arrivée. */
  CA.drawPad = function (ctx, X, t) {
    const host = AN.Colossus.mapHost(X), P = AN.Colossus.padPoint(X);
    if (!P) return;
    if (!host) padDraw(ctx, P.x, P.y, 1, P.R, t, 1);
    const S = X.colShow;
    if (S && S.t < 3) { // la colonne de lumière : on la voit de très loin
      const k = S.t < 0.4 ? S.t / 0.4 : U.clamp((3 - S.t) / 0.8, 0, 1);
      const w = Math.max(18, 6 / X.cam.zoom);
      const g = ctx.createLinearGradient(P.x, P.y - 60 / X.cam.zoom * 4, P.x, P.y);
      g.addColorStop(0, U.rgba(AN.CYAN, 0)); g.addColorStop(1, U.rgba('#ffffff', 0.55 * k));
      ctx.fillStyle = g; ctx.fillRect(P.x - w / 2, P.y - 240 / X.cam.zoom, w, 240 / X.cam.zoom);
      ctx.strokeStyle = U.rgba(AN.CYAN, 0.8 * k); ctx.lineWidth = Math.max(2, 2 / X.cam.zoom);
      ctx.beginPath(); ctx.arc(P.x, P.y, Math.max(P.R, 14 / X.cam.zoom) * (1 + 0.1 * Math.sin(t * 6)), 0, TAU); ctx.stroke();
    }
  };
  /** La carte d'une zone-colosse : le vide (le colosse s'y dessine par-dessus). */
  CA.voidThumb = function (zone) {
    const cv = AN.Terrain.canvas(zone.w * 3, zone.h * 3), c = cv.getContext('2d');
    c.fillStyle = '#05060c'; c.fillRect(0, 0, cv.width, cv.height);
    const rng = new AN.RNG(zone.index * 97 + 5);
    c.fillStyle = 'rgba(255,255,255,0.5)';
    for (let k = 0; k < 60; k++) c.fillRect(rng.int(0, cv.width - 1), rng.int(0, cv.height - 1), 1, 1);
    return cv;
  };
  /** Sur la carte : sa silhouette et la plateforme. k : échelle monde → carte. */
  CA.drawMinimap = function (ctx, X, k) {
    if (!X.zone || !X.zone.colMap) return;
    ctx.lineCap = 'round';
    for (const e of X.creatures) {
      if (!e.alive || !e.col || !e.col.map) continue;
      const col = e.col;
      ctx.strokeStyle = U.rgba(e.pal.body, 0.85);
      for (const c of col.caps) {
        if (hiddenCap(col, c)) continue;
        const A = col.n[c.a], B = col.n[c.b];
        ctx.lineWidth = Math.max(1, (c.ra + c.rb) * k);
        ctx.beginPath(); ctx.moveTo(A.x * k, A.y * k); ctx.lineTo(B.x * k, B.y * k); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    const P = X.mapPad;
    if (P) { ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(P.x * k, P.y * k, 4, 0, TAU); ctx.fill(); ctx.stroke(); }
  };

  /* ---------- la prise ---------- */
  CA.drawGrip = function (ctx, X, t) {
    const p = X.player;
    // sur le corps : où mène un saut (Espace)
    if (p.climb && !p.climb.hop && p.alive) {
      const tg = AN.Colossus.hopTarget(p.climb.e, p, AN.Input.axis());
      if (tg) {
        ctx.strokeStyle = U.rgba('#ffffff', 0.55 + 0.25 * Math.sin(t * 6)); ctx.lineWidth = 2; ctx.setLineDash([5, 6]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo((p.x + tg.x) / 2, (p.y + tg.y) / 2 - 40, tg.x, tg.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(tg.x, tg.y, 12, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    const g = p.grip == null ? 1 : p.grip;
    if (!p.alive || (!p.climb && g >= 0.999)) return;
    const r = 22;
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(16,19,28,0.35)';
    ctx.beginPath(); ctx.arc(p.x, p.y - 4, r, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
    ctx.strokeStyle = g < 0.3 ? AN.STAMP : p.climb ? '#ffffff' : U.rgba('#ffffff', 0.7);
    ctx.beginPath(); ctx.arc(p.x, p.y - 4, r, -Math.PI / 2, -Math.PI / 2 + TAU * g); ctx.stroke();
    if (p.climb && p.climb.charge > 0) {
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y - 4, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * p.climb.charge); ctx.stroke();
    }
    ctx.lineCap = 'butt';
  };
})();
