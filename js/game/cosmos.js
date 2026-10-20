/* Les échelles supérieures de l'Archive, vues en dézoomant : la planète qu'elle
   est devenue, ses lunes et ses cataclysmes en orbite, le système de ses astres,
   la galaxie qui tourne autour d'elle, et ce qui la contient.
   Les couches les plus lointaines sont dessinées en coordonnées d'écran, calculées
   en double précision, pour rester nettes à des zooms de l'ordre de 1e-7. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const TAU = Math.PI * 2;

  const Cs = (AN.Cosmos = {});
  Cs.RP = 16000; // rayon de la planète-Archive (unités du monde)
  Cs.SYS = 130000; // écart entre deux orbites du système
  Cs.GAL = 3.2e7; // rayon de la galaxie
  Cs.AMAS = 6e8; // rayon de l'amas (1.10)
  Cs.WEB = 1.2e10; // étendue de la Toile (1.10)
  Cs.CELL = 4e10; // maille de la structure inconnue

  /** Rayon du globe : la planète-Archive, centrée sur l'Artefact, assez grande pour porter tous les territoires. */
  Cs.globeR = function (A) {
    const p = A.profile;
    const k = p.territories.length + ':' + (A.layoutV || 0);
    if (A.globe && A.globe.k === k) return A.globe.R;
    let ext = 0;
    p.territories.forEach((t) => { const c = AN.Shapes.centroid(t); ext = Math.max(ext, Math.hypot(c.x, c.y) + AN.Shapes.radius(t)); });
    A.globe = { k, R: Math.max(Cs.RP, ext * 1.25) };
    return A.globe.R;
  };

  const fade = (z, from, to) => U.clamp((Math.log(from) - Math.log(z)) / (Math.log(from) - Math.log(to)), 0, 1);

  /** Positions des astres et des géants, stables d'une image à l'autre. */
  Cs.layout = function (p) {
    const astres = (p.cosmos && p.cosmos.astres) || [];
    const out = { orbite: [], systeme: [], galaxie: [], amas: [], toile: [] };
    astres.forEach((a) => {
      const L = out[a.layer || 'orbite'];
      if (!L) return;
      const rng = AN.RNG.from(AN.hash(a.uid), 'orbite');
      L.push({ a, i: L.length, phase: rng.float(0, TAU), speed: rng.float(0.02, 0.06) * (rng.chance(0.5) ? 1 : -1), size: rng.float(0.8, 1.25), tilt: rng.float(-0.5, 0.5) });
    });
    const giants = p.collection.filter((c) => D.CREATURE[c.species] && D.CREATURE[c.species].tier >= 5).map((c, i) => ({ c, def: D.CREATURE[c.species], i, phase: (i * 2.3) % TAU }));
    return { astres: out, giants };
  };

  /* ======================= Monde : la planète ======================= */
  /**
   * Le globe (1.10) : dès le rang Monde, l'Archive est une planète vue d'au-dessus
   * de son pôle, et ce pôle est l'Artefact. Parallèles concentriques autour de lui,
   * méridiens qui en partent, ombre du bord, nuages qui tournent lentement.
   * Dessiné sous la mosaïque des territoires (coordonnées du monde).
   */
  Cs.drawPlanet = function (ctx, A, z, t) {
    const rk = AN.Profile.rank(A.profile).index;
    if (rk < 5) return;
    const k = fade(z, 0.035, 0.014);
    if (k <= 0) return;
    const R = Cs.globeR(A);
    ctx.save();
    ctx.globalAlpha = k;
    const g = ctx.createRadialGradient(0, 0, R * 0.05, 0, 0, R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.62, '#f2f3f2'); g.addColorStop(0.9, '#e2e5e5'); g.addColorStop(1, '#cdd2d3');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    // parallèles : des cercles autour du pôle, de plus en plus serrés vers le bord (projection du globe)
    ctx.strokeStyle = U.rgba(AN.INK, 0.12); ctx.lineWidth = 1 / z;
    for (let i = 1; i < 6; i++) { const lat = (i / 6) * (Math.PI / 2); ctx.beginPath(); ctx.arc(0, 0, R * Math.sin(lat), 0, TAU); ctx.stroke(); }
    // méridiens : du pôle vers le bord
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + t * 0.004; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.08, Math.sin(a) * R * 0.08); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); }
    // ombres de nuages, qui tournent autour du pôle
    const rng = AN.RNG.from(7, 'nuages');
    for (let i = 0; i < 14; i++) {
      const d = R * rng.float(0.35, 0.95), a = rng.float(0, TAU) + t * 0.01 * (0.6 + d / R);
      const s = R * rng.float(0.06, 0.13);
      ctx.fillStyle = U.rgba(AN.INK, 0.035);
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, s * 1.8, s * (1 - 0.6 * d / R), a + Math.PI / 2, 0, TAU); ctx.fill();
    }
    // le bord du monde s'assombrit : on voit qu'il est rond
    const limb = ctx.createRadialGradient(0, 0, R * 0.78, 0, 0, R);
    limb.addColorStop(0, U.rgba(AN.INK, 0)); limb.addColorStop(1, U.rgba(AN.INK, 0.14));
    ctx.fillStyle = limb;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = U.rgba(AN.INK, 0.5); ctx.lineWidth = 2.5 / z;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    // atmosphère de l'Artefact
    ctx.strokeStyle = U.rgba(AN.CYAN, 0.35); ctx.lineWidth = 6 / z;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.04, 0, TAU); ctx.stroke();
    ctx.restore();
  };

  /** Les cataclysmes capturés tournent autour de l'Archive (coordonnées du monde). */
  Cs.drawGiants = function (ctx, A, z, t) {
    const L = A.cosmo || (A.cosmo = Cs.layout(A.profile));
    for (const g of L.giants) {
      const tier = g.def.tier;
      let R, size, k;
      if (tier === 5) { R = Cs.globeR(A) * (1.7 + g.i * 0.45); size = Cs.RP * 0.16; k = fade(z, 0.03, 0.01) * (1 - fade(z, 0.002, 6e-4)); }
      else continue; // les entités stellaires et galactiques sont dessinées avec leur couche
      if (k <= 0) continue;
      const a = g.phase + t * 0.03 * (g.i % 2 ? -1 : 1);
      const e = { def: g.def, x: Math.cos(a) * R, y: Math.sin(a) * R, r: size, face: a + Math.PI / 2 * (g.i % 2 ? -1 : 1), anim: t * 2, seed: g.i + 1, pal: AN.Art.palette(g.def, g.c.variant, g.c.hueSeed), vx: 0, vy: 0, flash: 0, alpha: k };
      AN.Art.draw(ctx, e, t, { glow: true });
      if (z < 0.02 && z > 0.002) {
        ctx.save(); ctx.translate(e.x, e.y + size * 1.4); ctx.scale(1 / z, 1 / z);
        ctx.globalAlpha = k;
        ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(247,248,247,0.85)';
        const label = AN.Profile.displayName(g.c);
        ctx.strokeText(label, 0, 0); ctx.fillStyle = AN.INK; ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }
  };

  /* ======================= Couches lointaines (écran) ======================= */
  function S(A, x, y) {
    const cam = A.cam;
    return { x: cam.W / 2 + (x - cam.x) * cam.zoom, y: cam.H / 2 + (y - cam.y) * cam.zoom };
  }
  function disc(ctx, x, y, r, fill, stroke, lw = 1) {
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function label(ctx, x, y, text, alpha, size = 11) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '600 ' + size + 'px ' + AN.FONT_UI; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(247,248,247,0.85)';
    ctx.strokeText(text, x, y); ctx.fillStyle = AN.INK; ctx.fillText(text, x, y);
    ctx.restore();
  }

  /** Dessin d'un astre à l'écran, selon sa nature. */
  function drawAstre(ctx, x, y, r, a, t, center) {
    const b = D.BIOME[a.biome];
    const col = b.ground[1], top = b.wall.top, acc = b.accent;
    // la nature vient des données, pas de la sauvegarde : un astre renommé change d'aspect avec son nom (1.11)
    switch ((D.ASTRES[a.biome] || a).kind) {
      case 'tison': {
        const g = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
        g.addColorStop(0, U.rgba('#ff9a3a', 0.6)); g.addColorStop(1, U.rgba('#ff9a3a', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2, 0, TAU); ctx.fill();
        disc(ctx, x, y, r, '#ff7a1a', AN.INK, 1);
        ctx.strokeStyle = U.rgba('#ffe14d', 0.8); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0.3, 2.2); ctx.stroke();
        break;
      }
      case 'naine': {
        const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.8);
        g.addColorStop(0, U.rgba('#e0663a', 0.35)); g.addColorStop(1, U.rgba('#e0663a', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, TAU); ctx.fill();
        disc(ctx, x, y, r * 0.9, '#4e2e2a', AN.INK, 1);
        break;
      }
      case 'pulsar': {
        const a2 = t * 3;
        ctx.strokeStyle = U.rgba('#7ae8d8', 0.7); ctx.lineWidth = Math.max(1, r * 0.25);
        ctx.beginPath(); ctx.moveTo(x - Math.cos(a2) * r * 3, y - Math.sin(a2) * r * 3); ctx.lineTo(x + Math.cos(a2) * r * 3, y + Math.sin(a2) * r * 3); ctx.stroke();
        disc(ctx, x, y, r * 0.45, '#ffffff', AN.INK, 1);
        break;
      }
      case 'bulbe': {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
        g.addColorStop(0, U.rgba('#ffe8b0', 0.9)); g.addColorStop(1, U.rgba('#ff8a5a', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r * 1.1, 0.3, 0, TAU); ctx.fill();
        break;
      }
      case 'anneau':
        ctx.strokeStyle = U.rgba(top, 0.8); ctx.lineWidth = Math.max(1.5, r * 0.25);
        ctx.beginPath(); ctx.ellipse(center.x, center.y, r * 6, r * 2.2, -0.3, 0, TAU); ctx.stroke();
        disc(ctx, x, y, r * 0.6, acc, AN.INK, 1);
        break;
      case 'station':
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.3);
        ctx.fillStyle = col; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1;
        ctx.fillRect(-r * 0.4, -r * 0.4, r * 0.8, r * 0.8); ctx.strokeRect(-r * 0.4, -r * 0.4, r * 0.8, r * 0.8);
        ctx.fillStyle = acc; ctx.fillRect(-r * 1.5, -r * 0.15, r * 0.9, r * 0.3); ctx.fillRect(r * 0.6, -r * 0.15, r * 0.9, r * 0.3);
        ctx.restore();
        break;
      case 'etoile': {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, U.rgba('#fff6d0', 0.9)); g.addColorStop(1, U.rgba('#ffd23a', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
        disc(ctx, x, y, r, '#ffd23a', AN.INK, 1);
        break;
      }
      case 'geante':
        disc(ctx, x, y, r * 1.4, col, AN.INK, 1);
        ctx.save(); ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, TAU); ctx.clip();
        ctx.fillStyle = U.rgba(top, 0.7);
        for (let k = -2; k <= 2; k++) ctx.fillRect(x - r * 1.5, y + k * r * 0.5 - r * 0.1, r * 3, r * 0.22);
        ctx.restore();
        break;
      case 'comete': {
        const ang = Math.atan2(y - center.y, x - center.x);
        const g = ctx.createLinearGradient(x, y, x + Math.cos(ang) * r * 8, y + Math.sin(ang) * r * 8);
        g.addColorStop(0, U.rgba('#d8f2ff', 0.8)); g.addColorStop(1, U.rgba('#d8f2ff', 0));
        ctx.strokeStyle = g; ctx.lineWidth = r * 1.2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * r * 8, y + Math.sin(ang) * r * 8); ctx.stroke();
        disc(ctx, x, y, r * 0.7, '#ffffff', AN.INK, 1);
        break;
      }
      case 'nebuleuse':
        for (let k = 0; k < 6; k++) disc(ctx, x + Math.cos(k * 1.7) * r * 1.2, y + Math.sin(k * 2.3) * r, r * (1.2 - k * 0.1), U.rgba(acc, 0.25));
        break;
      case 'amas':
        for (let k = 0; k < 12; k++) disc(ctx, x + Math.cos(k * 2.4) * r * (0.3 + (k % 4) * 0.3), y + Math.sin(k * 2.4) * r * (0.3 + (k % 4) * 0.3), Math.max(0.8, r * 0.18), '#fff0c0');
        break;
      case 'halo':
        ctx.strokeStyle = U.rgba('#4a4a7a', 0.8); ctx.lineWidth = Math.max(1, r * 0.3);
        ctx.beginPath(); ctx.arc(x, y, r * 1.2, 0, TAU); ctx.stroke();
        break;
      case 'systeme':
        disc(ctx, x, y, r * 0.5, '#fff0c0', AN.INK, 1);
        ctx.strokeStyle = U.rgba(AN.INK, 0.4); ctx.lineWidth = 1;
        for (let k = 1; k <= 2; k++) { ctx.beginPath(); ctx.arc(x, y, r * (0.5 + k * 0.5), 0, TAU); ctx.stroke(); }
        break;
      default: // lune, planète, planétoïde
        disc(ctx, x, y, r, col, AN.INK, 1);
        if (a.kind === 'lune' || a.kind === 'planetoide') { disc(ctx, x - r * 0.3, y - r * 0.2, r * 0.25, U.rgba(AN.INK, 0.15)); disc(ctx, x + r * 0.35, y + r * 0.3, r * 0.18, U.rgba(AN.INK, 0.12)); }
        if (a.kind === 'planete') { ctx.strokeStyle = U.rgba(top, 0.8); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0.4, 2.4); ctx.stroke(); }
    }
  }

  /** Galaxie : bras spiraux précalculés. */
  let GALAXY = null;
  function galaxyPoints() {
    if (GALAXY) return GALAXY;
    const rng = new AN.RNG(424242);
    const pts = [];
    for (let i = 0; i < 2600; i++) {
      const arm = i % 4;
      const d = Math.pow(rng.next(), 0.7);
      const a = arm * (TAU / 4) + d * 5.2 + rng.float(-0.35, 0.35) * (1 - d * 0.4);
      const r = d * Cs.GAL * rng.float(0.92, 1.08);
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.92, s: rng.float(1, 2.6) * (1.3 - d * 0.5), c: rng.pick(['#1c2230', '#2346c8', '#6a5a90', '#b8863b', '#1c2230']), a: rng.float(0.3, 0.85) });
    }
    GALAXY = pts;
    return pts;
  }

  /** Amas (1.10) : des galaxies voisines, précalculées. */
  let CLUSTER = null;
  function clusterPoints() {
    if (CLUSTER) return CLUSTER;
    const rng = new AN.RNG(515151);
    const gal = [];
    for (let i = 0; i < 12; i++) {
      const a = rng.float(0, TAU), d = Cs.AMAS * rng.float(0.28, 1);
      gal.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.85, s: rng.float(0.5, 1.2), rot: rng.float(0, TAU), tilt: rng.float(0.35, 1), c: rng.pick(['#6a5aa8', '#2346c8', '#b8863b', '#8a6ad0']), ph: rng.float(0, TAU) });
    }
    const links = [];
    for (let i = 0; i < gal.length; i++) {
      const near = gal.map((g, j) => [j, Math.hypot(g.x - gal[i].x, g.y - gal[i].y)]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 2);
      near.forEach(([j]) => { if (!links.some((l) => (l[0] === j && l[1] === i))) links.push([i, j, rng.float(0, TAU)]); });
      if (rng.chance(0.45)) links.push([i, -1, rng.float(0, TAU)]); // vers la galaxie de l'Archive
    }
    CLUSTER = { gal, links };
    return CLUSTER;
  }
  /** Toile (1.10) : des nœuds et les filaments qui les relient. */
  let WEB = null;
  function webPoints() {
    if (WEB) return WEB;
    const rng = new AN.RNG(626262);
    const nodes = [{ x: 0, y: 0, s: 1.4 }];
    for (let i = 0; i < 80; i++) { const a = rng.float(0, TAU), d = Cs.WEB * Math.pow(rng.next(), 0.6); nodes.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: rng.float(0.4, 1.2) }); }
    const edges = [];
    nodes.forEach((n, i) => {
      nodes.map((m, j) => [j, Math.hypot(m.x - n.x, m.y - n.y)]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 3)
        .forEach(([j]) => { if (!edges.some((e) => e[0] === j && e[1] === i)) edges.push([i, j]); });
    });
    WEB = { nodes, edges };
    return WEB;
  }
  function tinySpiral(ctx, x, y, r, t, col, rot, tilt, alpha) {
    if (r < 1.5) { ctx.fillStyle = U.rgba(col, alpha); ctx.fillRect(x - 1, y - 1, 2, 2); return; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, tilt);
    for (let a = 0; a < 2; a++) for (let k = 0; k < 10; k++) {
      const d = k / 10, ang = a * Math.PI + d * 4 + t * 0.05;
      ctx.fillStyle = U.rgba(k % 3 ? col : '#fff0c0', alpha * (0.85 - d * 0.5));
      ctx.beginPath(); ctx.arc(Math.cos(ang) * r * d, Math.sin(ang) * r * d, Math.max(0.6, r * 0.09 * (1 - d * 0.5)), 0, TAU); ctx.fill();
    }
    ctx.fillStyle = U.rgba('#fff6d0', alpha); ctx.beginPath(); ctx.arc(0, 0, Math.max(1, r * 0.14), 0, TAU); ctx.fill();
    ctx.restore();
  }
  /** Un astre qu'on peut viser dans l'Archive dézoomée : clic pour s'y rendre (lieux ancrés, 1.10). */
  function hit(A, x, y, r, a, alpha) {
    if (alpha < 0.5 || !A.placeHits) return;
    const pl = AN.Places.ofAstre(A.profile, a.uid); // le lieu du monde d'où vient l'astre (1.11)
    if (pl) A.placeHits.push({ x, y, r: Math.max(10, r + 4), id: pl.id, name: pl.name });
  }
  const astreName = (a) => (AN.Names ? AN.Names.astre(a) : a.name);

  /** Couches d'écran : orbites, système, galaxie, amas, Toile, structure inconnue ; nations ancrées ; astre survolé. */
  Cs.drawLayers = function (ctx, A, t) {
    A.placeHits = [];
    farLayers(ctx, A, t);
    Cs.drawNations(ctx, A, t);
    // l'astre (ou la nation) survolé : on peut s'y rendre
    const M = AN.Input.mouse;
    const hov = A.placeHits.find((q) => Math.hypot(q.x - M.x, q.y - M.y) <= q.r);
    A.placeHover = hov || null;
    if (hov && !A.mapMode) {
      const cam = A.cam;
      ctx.save();
      ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(hov.x, hov.y, hov.r + 4, t, t + TAU); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, hov.x, hov.y - hov.r - 10, hov.name + ' : cliquer pour s’y rendre', 1, 12);
      ctx.restore();
    }
  };
  function farLayers(ctx, A, t) {
    const cam = A.cam;
    const z = cam.zoom;
    const rk = AN.Profile.rank(A.profile).index;
    if (rk < 6 || z > 0.05) return;
    const L = A.cosmo || (A.cosmo = Cs.layout(A.profile));
    ctx.save();
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    const O = S(A, 0, 0);

    // ---- orbite : lunes, anneaux, stations ----
    const ko = fade(z, 0.03, 0.008) * (1 - fade(z, 6e-4, 2e-4));
    if (ko > 0) {
      ctx.globalAlpha = ko;
      const GR = Cs.globeR(A);
      L.astres.orbite.forEach((o) => {
        const R = GR * (2.4 + o.i * 0.75) * z;
        ctx.strokeStyle = U.rgba(AN.INK, 0.15); ctx.lineWidth = 1; ctx.setLineDash([3, 6]);
        ctx.beginPath(); ctx.arc(O.x, O.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const a = o.phase + t * o.speed;
        const x = O.x + Math.cos(a) * R, y = O.y + Math.sin(a) * R;
        const r = Math.max(2.5, Cs.RP * 0.22 * o.size * z);
        drawAstre(ctx, x, y, r, o.a, t, O);
        hit(A, x, y, r, o.a, ko);
        if (z < 0.01 && z > 1e-3) label(ctx, x, y + r + 14, astreName(o.a), ko);
      });
      ctx.globalAlpha = 1;
    }

    // ---- système : l'Archive au centre, ses astres en orbite ----
    if (rk >= 7) {
      const ks = fade(z, 0.004, 0.0012) * (1 - fade(z, 1.5e-5, 5e-6));
      if (ks > 0) {
        ctx.globalAlpha = ks;
        const n = Math.max(3, L.astres.systeme.length + 2);
        for (let i = 1; i <= n; i++) {
          ctx.strokeStyle = U.rgba(AN.INK, i <= L.astres.systeme.length ? 0.22 : 0.08); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(O.x, O.y, Cs.SYS * i * z, 0, TAU); ctx.stroke();
        }
        // l'Archive, devenue un centre
        disc(ctx, O.x, O.y, Math.max(3, Cs.RP * z * 1.2), '#ffffff', AN.INK, 1.5);
        L.astres.systeme.forEach((o) => {
          const R = Cs.SYS * (o.i + 1) * z;
          const a = o.phase + t * o.speed * 0.5;
          const x = O.x + Math.cos(a) * R, y = O.y + Math.sin(a) * R;
          const r = Math.max(2.5, Cs.SYS * 0.12 * o.size * z);
          drawAstre(ctx, x, y, r, o.a, t, O);
          hit(A, x, y, r, o.a, ks);
          if (z < 1.2e-3 && z > 4e-5) label(ctx, x, y + r + 14, astreName(o.a), ks);
        });
        // entités stellaires : une seconde étoile qui veille
        L.giants.filter((g) => g.def.tier === 6).forEach((g, i) => {
          const R = Cs.SYS * (0.5 + i * 0.3) * z;
          const a = g.phase + t * 0.04;
          const e = { def: g.def, x: O.x + Math.cos(a) * R, y: O.y + Math.sin(a) * R, r: Math.max(4, Cs.SYS * 0.1 * z), face: a, anim: t * 2, seed: i + 1, pal: AN.Art.palette(g.def, g.c.variant, g.c.hueSeed), vx: 0, vy: 0, flash: 0, alpha: ks };
          AN.Art.draw(ctx, e, t, { glow: true });
        });
        if (z < 1e-3 && z > 4e-5) label(ctx, O.x, O.y + Math.max(3, Cs.RP * z * 1.2) + 16, 'L’Archive', ks, 12);
        ctx.globalAlpha = 1;
      }
    }

    // ---- galaxie : elle tourne autour du blanc ----
    if (rk >= 8) {
      const kg = fade(z, 1.5e-4, 3e-5) * (1 - fade(z, rk >= 9 ? 1.2e-6 : 6e-7, rk >= 9 ? 4e-7 : 2e-7));
      if (kg > 0) {
        const rot = t * 0.004;
        const cr = Math.cos(rot), sr = Math.sin(rot);
        ctx.globalAlpha = kg;
        for (const q of galaxyPoints()) {
          const x = O.x + (q.x * cr - q.y * sr) * z, y = O.y + (q.x * sr + q.y * cr) * z;
          if (x < -10 || y < -10 || x > cam.W + 10 || y > cam.H + 10) continue;
          ctx.fillStyle = U.rgba(q.c, q.a * kg);
          ctx.fillRect(x, y, q.s, q.s);
        }
        L.astres.galaxie.forEach((o) => {
          const R = Cs.GAL * (0.22 + o.i * 0.13) * z;
          const a = o.phase + rot;
          const x = O.x + Math.cos(a) * R, y = O.y + Math.sin(a) * R * 0.92;
          const r = Math.max(3, Cs.GAL * 0.03 * o.size * z);
          drawAstre(ctx, x, y, r, o.a, t, O);
          hit(A, x, y, r, o.a, kg);
          if (z < 4e-5 && z > 2e-6) label(ctx, x, y + r + 14, astreName(o.a), kg);
        });
        L.giants.filter((g) => g.def.tier === 7).forEach((g, i) => {
          const R = Cs.GAL * (0.55 + i * 0.2) * z;
          const a = g.phase + rot * 2;
          const e = { def: g.def, x: O.x + Math.cos(a) * R, y: O.y + Math.sin(a) * R, r: Math.max(6, Cs.GAL * 0.08 * z), face: a, anim: t, seed: i + 1, pal: AN.Art.palette(g.def, g.c.variant, g.c.hueSeed), vx: 0, vy: 0, flash: 0, alpha: kg * 0.85 };
          AN.Art.draw(ctx, e, t, { glow: true });
        });
        disc(ctx, O.x, O.y, 3, '#ffffff', AN.CYAN, 2);
        ctx.globalAlpha = 1;
      }
    }

    // ---- amas (1.10) : des galaxies serrées, reliées par des ponts de matière sombre ----
    if (rk >= 9) {
      const ka = fade(z, 2e-6, 6e-7) * (1 - fade(z, rk >= 10 ? 4e-8 : 1e-12, rk >= 10 ? 1.5e-8 : 1e-13));
      if (ka > 0) {
        const C = clusterPoints();
        ctx.globalAlpha = ka;
        const pos = (g) => (g ? { x: O.x + g.x * z, y: O.y + g.y * z } : O);
        // ponts : ils se font et se défont
        C.links.forEach(([i, j, ph]) => {
          const on = 0.5 + 0.5 * Math.sin(t * 0.25 + ph);
          if (on < 0.25) return;
          const a = pos(C.gal[i]), b = pos(j < 0 ? null : C.gal[j]);
          ctx.strokeStyle = U.rgba('#6a5aa8', 0.35 * on); ctx.lineWidth = 1 + on * 2; ctx.setLineDash(on < 0.5 ? [3, 6] : []);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo((a.x + b.x) / 2 + (b.y - a.y) * 0.12, (a.y + b.y) / 2 - (b.x - a.x) * 0.12, b.x, b.y); ctx.stroke();
        });
        ctx.setLineDash([]);
        C.gal.forEach((g) => { const q = pos(g); tinySpiral(ctx, q.x, q.y, Math.max(4, Cs.AMAS * 0.07 * g.s * z), t, g.c, g.rot, g.tilt, ka); });
        // la galaxie de l'Archive
        tinySpiral(ctx, O.x, O.y, Math.max(5, Cs.AMAS * 0.08 * z), t, '#2346c8', 0, 0.92, ka);
        disc(ctx, O.x, O.y, 2.5, '#ffffff', AN.CYAN, 2);
        // les galaxies ramenées, et le Berger qui les garde
        L.astres.amas.forEach((o) => {
          const R = Cs.AMAS * (0.25 + o.i * 0.09) * z;
          const a = o.phase + t * 0.01;
          const x = O.x + Math.cos(a) * R, y = O.y + Math.sin(a) * R * 0.85;
          const r = Math.max(5, Cs.AMAS * 0.06 * o.size * z);
          const kind = (D.ASTRES[o.a.biome] || o.a).kind;
          if (kind === 'meduse') {
            ctx.strokeStyle = U.rgba('#8ae0ff', 0.5 * ka); ctx.lineWidth = 1;
            for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * r * 0.25, y); ctx.quadraticCurveTo(x + k * r * 0.35 + Math.sin(t + k) * r * 0.3, y + r * 1.2, x + k * r * 0.3, y + r * 2.2); ctx.stroke(); }
          }
          if (kind === 'collision') { tinySpiral(ctx, x - r * 0.4, y, r * 0.8, t, '#ff9ac8', 0.4, 0.7, ka); tinySpiral(ctx, x + r * 0.4, y, r * 0.8, -t, '#9a7ae8', 2, 0.6, ka); }
          else tinySpiral(ctx, x, y, r, t, D.BIOME[o.a.biome].accent, o.phase, 0.8, ka);
          hit(A, x, y, r, o.a, ka);
          if (z < 1.2e-6 && z > 6e-8) label(ctx, x, y + r + 14, astreName(o.a), ka);
        });
        L.giants.filter((g) => g.def.tier === 8).forEach((g, i) => {
          const a = g.phase + t * 0.02;
          const e = { def: g.def, x: O.x + Math.cos(a) * Cs.AMAS * 0.6 * z, y: O.y + Math.sin(a) * Cs.AMAS * 0.5 * z, r: Math.max(8, Cs.AMAS * 0.05 * z), face: a, anim: t, seed: i + 1, pal: AN.Art.palette(g.def, g.c.variant, g.c.hueSeed), vx: 0, vy: 0, flash: 0, alpha: ka * 0.85 };
          AN.Art.draw(ctx, e, t, { glow: true });
        });
        if (z < 1.2e-6 && z > 6e-8) label(ctx, O.x, O.y + 22, 'L’Archive', ka, 12);
        ctx.globalAlpha = 1;
      }
    }

    // ---- la Toile (1.10) : des filaments de lumière, des nœuds, de grands vides ----
    if (rk >= 10) {
      const kt = fade(z, 1.5e-7, 5e-8) * (1 - fade(z, rk >= 11 ? 3e-9 : 1e-14, rk >= 11 ? 1.5e-9 : 1e-15));
      if (kt > 0) {
        const W = webPoints();
        ctx.globalAlpha = kt;
        ctx.lineCap = 'round';
        W.edges.forEach(([i, j]) => {
          const a = W.nodes[i], b = W.nodes[j];
          const ax = O.x + a.x * z, ay = O.y + a.y * z, bx = O.x + b.x * z, by = O.y + b.y * z;
          if (Math.max(ax, bx) < -20 || Math.min(ax, bx) > cam.W + 20 || Math.max(ay, by) < -20 || Math.min(ay, by) > cam.H + 20) return;
          ctx.strokeStyle = U.rgba('#8ac0f0', 0.18); ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          ctx.strokeStyle = U.rgba('#2346c8', 0.45); ctx.lineWidth = 1;
          ctx.stroke();
        });
        ctx.lineCap = 'butt';
        W.nodes.forEach((n, i) => {
          const x = O.x + n.x * z, y = O.y + n.y * z;
          if (x < -10 || y < -10 || x > cam.W + 10 || y > cam.H + 10) return;
          disc(ctx, x, y, Math.max(1.2, n.s * 2.5), i ? U.rgba('#fff0c0', 0.85) : '#ffffff', i ? null : AN.CYAN, 2);
        });
        L.astres.toile.forEach((o) => {
          const n = W.nodes[1 + (o.i * 7) % (W.nodes.length - 1)];
          const x = O.x + n.x * z, y = O.y + n.y * z;
          const r = 6;
          const kind = (D.ASTRES[o.a.biome] || o.a).kind;
          const col = kind === 'vide' ? '#1a1a2a' : kind === 'filament' ? '#bfe2ff' : kind === 'mur' ? '#d8d0f0' : '#ffe8a0';
          disc(ctx, x, y, r, col, AN.INK, 1.2);
          hit(A, x, y, r, o.a, kt);
          if (z < 1.2e-7 && z > 5e-9) label(ctx, x, y + r + 14, astreName(o.a), kt);
        });
        L.giants.filter((g) => g.def.tier === 9).forEach((g, i) => {
          const n = W.nodes[3 + i];
          const e = { def: g.def, x: O.x + n.x * z, y: O.y + n.y * z, r: 14, face: 0, anim: t, seed: i + 1, pal: AN.Art.palette(g.def, g.c.variant, g.c.hueSeed), vx: 0, vy: 0, flash: 0, alpha: kt * 0.9 };
          AN.Art.draw(ctx, e, t, { glow: true });
        });
        if (z < 1.2e-7 && z > 5e-9) label(ctx, O.x, O.y + 18, 'L’Archive', kt, 12);
        ctx.globalAlpha = 1;
      }
    }

    // ---- inconnue : ce qui contient l'Archive ----
    if (rk >= 11) {
      const ku = fade(z, 3e-9, 1.2e-9);
      if (ku > 0) {
        ctx.globalAlpha = ku;
        const c = Cs.CELL * z;
        // une grille de cases, chacune avec sa toile
        const n = Math.ceil(Math.max(cam.W, cam.H) / Math.max(4, c)) + 2;
        for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
          const x = O.x + i * c, y = O.y + j * c;
          if (x < -c || y < -c || x > cam.W + c || y > cam.H + c) continue;
          ctx.strokeStyle = U.rgba(AN.INK, 0.12); ctx.lineWidth = 1;
          ctx.strokeRect(x - c / 2, y - c / 2, c, c);
          const h = AN.hash(i + ':' + j);
          if (i === 0 && j === 0) continue;
          if (h % 5 === 0) continue; // des cases vides : déjà archivées ?
          disc(ctx, x + ((h % 7) - 3) * c * 0.05, y + ((h % 11) - 5) * c * 0.03, Math.max(0.8, c * 0.06), U.rgba(['#1c2230', '#2346c8', '#6a5a90'][h % 3], 0.6));
        }
        // l'emblème de l'Artefact, à une échelle impossible
        for (let k = 0; k < 4; k++) {
          ctx.save();
          ctx.translate(O.x, O.y);
          ctx.rotate(t * (0.02 + k * 0.01) * (k % 2 ? -1 : 1) + k * 0.4);
          const s = c * (6 + k * 5);
          ctx.strokeStyle = k === 0 ? U.rgba(AN.CYAN, 0.8) : U.rgba(AN.INK, 0.55 - k * 0.1);
          ctx.lineWidth = k === 0 ? 3 : 1.5;
          ctx.strokeRect(-s, -s, s * 2, s * 2);
          ctx.restore();
        }
        disc(ctx, O.x, O.y, 2.5, '#ffffff', AN.CYAN, 2);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  /* ======================= Nations ancrées (1.13) ======================= */
  /**
   * Là où leur monde tient dans l'Archive, selon sa taille et ce que le rang de
   * l'Archive laisse voir : 0 = au bord de la mosaïque (régions, et tout ce qu'on ne
   * peut pas encore voir plus loin), 1 = en orbite proche du globe (mondes),
   * 2 = couche des orbites, 3 = couche du système.
   */
  const NATION_LAYER = { region: 0, monde: 1, orbite: 2, systeme: 3 };
  const NATION_LABEL = [[0.02, 10], [0.0015, 0.05], [1e-3, 0.012], [4e-5, 1.2e-3]]; // zooms où l'on voit leur nom
  Cs.nationLayer = (scale, rk) => Math.min(NATION_LAYER[scale] || 0, rk >= 7 ? 3 : rk >= 6 ? 2 : rk >= 5 ? 1 : 0);
  Cs.nationSpots = function (A) {
    const p = A.profile;
    const rk = AN.Profile.rank(p).index;
    const list = AN.Nations.list(p);
    const key = list.length + ':' + p.territories.length + ':' + (A.layoutV || 0) + ':' + rk;
    if (A.natSpots && A.natSpots.key === key) return A.natSpots;
    let ext = 0;
    p.territories.forEach((tr) => { const c = AN.Shapes.centroid(tr); ext = Math.max(ext, Math.hypot(c.x, c.y) + AN.Shapes.radius(tr)); });
    const count = [0, 0, 0, 0];
    const spots = list.map((n) => {
      const layer = Cs.nationLayer(n.scale, rk);
      const rng = AN.RNG.from(AN.hash(n.code), 'ancrage');
      return { n, layer, i: count[layer]++, phase: rng.float(0, TAU), speed: rng.float(0.012, 0.03) * (rng.chance(0.5) ? 1 : -1), size: rng.float(0.85, 1.15), seed: AN.hash(n.code) };
    });
    A.natSpots = { key, spots, ext: Math.max(ext, 500) };
    return A.natSpots;
  };

  /** Un monde habité, vu de loin : son sol, ses lumières, la couleur de son peuple. */
  function drawNationWorld(ctx, x, y, r, s, t, alpha, layer) {
    const n = s.n;
    const b = D.BIOME[n.primary] || D.BIOME[D.PEOPLE[n.people].biomes[0]];
    const P = D.PEOPLE[n.people];
    const rng = AN.RNG.from(s.seed, 'vue');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (layer === 0) {
      // une île de terre, tenue au bord de l'Archive
      ctx.beginPath();
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU, rr = r * rng.float(0.78, 1.08); k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath();
    } else { ctx.beginPath(); ctx.arc(0, 0, Math.max(1.5, r), 0, TAU); }
    ctx.fillStyle = b.ground[1]; ctx.fill();
    ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.2; ctx.stroke();
    if (layer === 2 && r > 3) { // orbite : un anneau de stations
      ctx.strokeStyle = U.rgba(P.body.trim, 0.8); ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.7, r * 0.5, -0.35, 0, TAU); ctx.stroke();
    }
    if (layer === 3 && r > 3) { // système : leur étoile, et leur monde autour
      ctx.fillStyle = U.rgba('#fff0b8', 0.9); ctx.beginPath(); ctx.arc(-r * 1.6, -r * 0.9, r * 0.45, 0, TAU); ctx.fill();
    }
    // les maisons, si l'on est assez près ; sinon des lumières
    if (layer === 0 && r > 26) {
      for (let k = 0; k < 7; k++) {
        const a = rng.float(0, TAU), d = r * rng.float(0.1, 0.6), hx = Math.cos(a) * d, hy = Math.sin(a) * d, hs = r * 0.09;
        ctx.fillStyle = P.body.cloth; ctx.fillRect(hx - hs, hy - hs * 0.6, hs * 2, hs * 1.4);
        ctx.fillStyle = P.body.trim; ctx.beginPath(); ctx.moveTo(hx - hs * 1.2, hy - hs * 0.6); ctx.lineTo(hx, hy - hs * 1.6); ctx.lineTo(hx + hs * 1.2, hy - hs * 0.6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f2c14e'; ctx.fillRect(hx - hs * 0.25, hy - hs * 0.1, hs * 0.5, hs * 0.5);
      }
    } else {
      const lights = Math.min(9, 3 + Math.floor(r / 4));
      for (let k = 0; k < lights; k++) {
        const a = rng.float(0, TAU), d = r * rng.float(0.05, 0.7);
        ctx.fillStyle = U.rgba('#f2c14e', 0.6 + 0.4 * Math.sin(t * 2 + k * 1.7));
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.8, r * 0.07), 0, TAU); ctx.fill();
      }
    }
    ctx.strokeStyle = U.rgba(P.body.trim, 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(3, r) + 3, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  /** Les nations ancrées dans le ciel de l'Archive (écran) ; un clic y conduit. */
  Cs.drawNations = function (ctx, A, t) {
    const p = A.profile;
    if (!AN.Nations || !AN.Nations.list(p).length) return;
    const cam = A.cam;
    const z = cam.zoom;
    const N = Cs.nationSpots(A);
    const L = A.cosmo || (A.cosmo = Cs.layout(p));
    const GR = Cs.globeR(A);
    ctx.save();
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    const O = S(A, 0, 0);
    for (const s of N.spots) {
      let x, y, r, k;
      if (s.layer === 0) {
        const R = N.ext + 480 + (s.i % 3) * 300;
        const q = S(A, Math.cos(s.phase) * R, Math.sin(s.phase) * R);
        x = q.x; y = q.y; r = Math.max(5, 300 * s.size * z);
        k = 1 - fade(z, 0.012, 0.004);
      } else if (s.layer === 1) {
        const R = GR * (1.32 + s.i * 0.15);
        const a = s.phase + t * s.speed;
        const q = S(A, Math.cos(a) * R, Math.sin(a) * R);
        x = q.x; y = q.y; r = Math.max(3, Cs.RP * 0.09 * s.size * z);
        k = fade(z, 0.05, 0.02) * (1 - fade(z, 0.0025, 0.001));
      } else if (s.layer === 2) {
        const R = GR * (2.4 + (L.astres.orbite.length + s.i) * 0.75) * z;
        const a = s.phase + t * s.speed;
        x = O.x + Math.cos(a) * R; y = O.y + Math.sin(a) * R; r = Math.max(2.5, Cs.RP * 0.2 * s.size * z);
        k = fade(z, 0.03, 0.008) * (1 - fade(z, 6e-4, 2e-4));
      } else {
        const R = Cs.SYS * (L.astres.systeme.length + 1 + s.i) * z;
        const a = s.phase + t * s.speed * 0.5;
        x = O.x + Math.cos(a) * R; y = O.y + Math.sin(a) * R; r = Math.max(2.5, Cs.SYS * 0.1 * s.size * z);
        k = fade(z, 0.004, 0.0012) * (1 - fade(z, 1.5e-5, 5e-6));
        if (k > 0) { ctx.globalAlpha = k; ctx.strokeStyle = U.rgba(D.PEOPLE[s.n.people].body.trim, 0.35); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(O.x, O.y, R, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      }
      if (k <= 0.02 || x < -60 || y < -60 || x > cam.W + 60 || y > cam.H + 60) continue;
      if (s.layer === 0 && r > 8) { // tenue à l'Archive : un fil bleu vers le centre
        const a = Math.atan2(O.y - y, O.x - x);
        ctx.save(); ctx.globalAlpha = k * 0.6; ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05); ctx.lineTo(x + Math.cos(a) * r * 1.9, y + Math.sin(a) * r * 1.9); ctx.stroke();
        ctx.restore();
      }
      drawNationWorld(ctx, x, y, r, s, t, k, s.layer);
      // nom et clic seulement à l'échelle où on les distingue (comme les astres)
      const win = NATION_LABEL[s.layer];
      if (k <= 0.5 || z < win[0] || z > win[1]) continue;
      const realm = AN.Nations.realm(s.n.people);
      const twin = N.spots.some((o) => o !== s && o.n.people === s.n.people); // deux nations d'un même peuple : on précise laquelle
      const ask = AN.Nations.requestPending(p, s.n);
      if (ask) { // une demande attend, dans la console
        const by = y - Math.max(3, r) - 16 + Math.sin(t * 3) * 2;
        disc(ctx, x, by, 8, '#ffffff', AN.INK, 1.5);
        ctx.fillStyle = '#c08a2a'; ctx.font = '800 11px ' + AN.FONT_UI; ctx.textAlign = 'center'; ctx.fillText('!', x, by + 4);
      }
      label(ctx, x, y + Math.max(3, r) + 16, realm + (twin ? ' · ' + (s.n.region || s.n.code) : '') + (s.n.mode === 'vassal' ? ' (soumise)' : ''), k);
      A.placeHits.push({ x, y, r: Math.max(12, r + 4), id: 'n:' + s.n.code, name: realm, any: true });
    }
    ctx.restore();
  };

  /** À la toute première vue de l'échelle inconnue : quelques lignes, puis plus rien. */
  Cs.checkEpilogue = function (A) {
    const p = A.profile;
    if (p.flags.epilogue || AN.Profile.rank(p).index < 11 || A.cam.zoom > 2e-9) return;
    p.flags.epilogue = 1;
    AN.Save.write(p);
    AN.Audio.play('rank');
    AN.UI.banner('Échelle inconnue', D.EPILOGUE.join(' '));
  };
})();
