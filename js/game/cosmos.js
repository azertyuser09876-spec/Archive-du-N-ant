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
  Cs.CELL = 1.3e8; // maille de la structure inconnue

  const fade = (z, from, to) => U.clamp((Math.log(from) - Math.log(z)) / (Math.log(from) - Math.log(to)), 0, 1);

  /** Positions des astres et des géants, stables d'une image à l'autre. */
  Cs.layout = function (p) {
    const astres = (p.cosmos && p.cosmos.astres) || [];
    const out = { orbite: [], systeme: [], galaxie: [] };
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
  /** Disque de la planète, sous la mosaïque des territoires (coordonnées du monde). */
  Cs.drawPlanet = function (ctx, A, z, t) {
    const rk = AN.Profile.rank(A.profile).index;
    if (rk < 6) return;
    const k = fade(z, 0.016, 0.006);
    if (k <= 0) return;
    const R = Cs.RP;
    ctx.save();
    ctx.globalAlpha = k;
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#eef0ef'); g.addColorStop(1, '#d9dcdc');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = U.rgba(AN.INK, 0.5); ctx.lineWidth = 2.5 / z;
    ctx.stroke();
    // méridiens et parallèles, très légers
    ctx.strokeStyle = U.rgba(AN.INK, 0.12); ctx.lineWidth = 1 / z;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, R * (i / 4), R, 0, 0, TAU); ctx.stroke(); }
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, R, R * (i / 4), 0, 0, TAU); ctx.stroke(); }
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
      if (tier === 5) { R = Cs.RP * (1.7 + g.i * 0.45); size = Cs.RP * 0.16; k = fade(z, 0.03, 0.01) * (1 - fade(z, 0.002, 6e-4)); }
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
    switch (a.kind) {
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

  /** Couches d'écran : orbites, système, galaxie, structure inconnue. */
  Cs.drawLayers = function (ctx, A, t) {
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
      L.astres.orbite.forEach((o) => {
        const R = Cs.RP * (2.4 + o.i * 0.75) * z;
        ctx.strokeStyle = U.rgba(AN.INK, 0.15); ctx.lineWidth = 1; ctx.setLineDash([3, 6]);
        ctx.beginPath(); ctx.arc(O.x, O.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        const a = o.phase + t * o.speed;
        const x = O.x + Math.cos(a) * R, y = O.y + Math.sin(a) * R;
        const r = Math.max(2.5, Cs.RP * 0.22 * o.size * z);
        drawAstre(ctx, x, y, r, o.a, t, O);
        if (z < 0.01 && z > 1e-3) label(ctx, x, y + r + 14, o.a.name, ko);
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
          if (z < 1.2e-3 && z > 4e-5) label(ctx, x, y + r + 14, o.a.name, ks);
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
      const kg = fade(z, 1.5e-4, 3e-5) * (1 - fade(z, 6e-7, 2e-7));
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
          if (z < 4e-5 && z > 2e-6) label(ctx, x, y + r + 14, o.a.name, kg);
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

    // ---- inconnue : ce qui contient l'Archive ----
    if (rk >= 9) {
      const ku = fade(z, 3e-6, 6e-7);
      if (ku > 0) {
        ctx.globalAlpha = ku;
        const c = Cs.CELL * z;
        // une grille de cases, chacune avec sa galaxie
        const n = Math.ceil(Math.max(cam.W, cam.H) / Math.max(4, c)) + 2;
        const rng = new AN.RNG(7);
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
        rng.next();
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
  };

  /** À la toute première vue de l'échelle inconnue : quelques lignes, puis plus rien. */
  Cs.checkEpilogue = function (A) {
    const p = A.profile;
    if (p.flags.epilogue || AN.Profile.rank(p).index < 9 || A.cam.zoom > 1.2e-6) return;
    p.flags.epilogue = 1;
    AN.Save.write(p);
    AN.Audio.play('rank');
    AN.UI.banner('Échelle inconnue', D.EPILOGUE.join(' '));
  };
})();
