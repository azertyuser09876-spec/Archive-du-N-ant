/* Fin d'expédition (refaite en 1.8).
   A. La zone se fend en éclats hexagonaux, du bord vers le portail ; une
      colonne de lumière emporte ce qui était dans la soute (créatures,
      structures, habitants).
   B. Le monde entier, vu de haut : le blanc du Néant le ronge depuis les
      bords, ses zones se séparent ; les territoires emportés s'en arrachent
      avec leurs vraies formes et filent vers le portail.
   C. L'échelle au-dessus (système, galaxie…) : le monde n'est plus qu'un
      point, qui s'éteint dans une onde de choc. Tampon DÉTRUIT ou EN SURSIS.
   D. L'Archive vue de haut : les nouveaux territoires tombent à leur place
      dans la mosaïque, les créatures rejoignent l'Artefact.
   Échec ou urgence : pas d'arrachement ni d'arrivée, un monde plus sombre.
   La musique joue une humeur de fin et marque les moments forts. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const TAU = Math.PI * 2;
  const SQ3 = Math.sqrt(3);

  const Cin = (AN.Cinematic = {});
  let S = null;

  // repères (en secondes, avant accélération)
  const A_END = 2.8, B0 = 2.2, B_END = 6.0, C0 = 5.6, C_DEATH = 6.9, C_END = 7.7, D0 = 7.4, D_END = 10.8;

  Cin.start = function (opts) {
    const r = opts.result;
    const zone = opts.zone;
    const ok = r.outcome === 'extrait';
    const world = r.world;
    const prof = opts.X.profile;
    const zw = zone.w * zone.T, zh = zone.h * zone.T;
    // éclats hexagonaux : le bord cède d'abord, le portail en dernier
    const R = Math.max(zw, zh) / 11;
    const shards = [];
    const rows = Math.ceil(zh / (R * 1.5)) + 2, cols = Math.ceil(zw / (R * SQ3)) + 2;
    const maxD = Math.hypot(zw, zh);
    for (let j = -1; j < rows; j++) for (let i = -1; i < cols; i++) {
      const cx = (i + (j % 2 ? 0.5 : 0)) * R * SQ3, cy = j * R * 1.5;
      if (cx < -R || cy < -R || cx > zw + R || cy > zh + R) continue;
      const d = Math.hypot(cx - opts.player.x, cy - opts.player.y) / maxD;
      const a = Math.atan2(cy - opts.player.y, cx - opts.player.x);
      shards.push({ cx, cy, delay: 0.5 + (1 - Math.min(1, d * 1.5)) * 1.5 + Math.random() * 0.25, rot: (Math.random() - 0.5) * 1.6, dx: Math.cos(a) * R * (1.5 + Math.random()), dy: Math.sin(a) * R * (1.5 + Math.random()) + R * 0.6 });
    }
    // secteurs du monde (une zone chacun, le cœur compris)
    const n = world.zones.length + 1;
    const sectors = [];
    for (let i = 0; i < n; i++) {
      const spec = i < world.zones.length ? world.zones[i] : world.heart;
      sectors.push({ i, a0: (i / n) * TAU, a1: ((i + 1) / n) * TAU, biome: D.BIOME[spec.biome], thumb: opts.thumbs[i] || null, isHere: i === opts.zi, drift: 0.6 + Math.random() * 0.8 });
    }
    const rng = AN.RNG.from(world.seed, 'systeme');
    const others = [];
    for (let i = 0; i < 26; i++) others.push({ a: rng.float(0, TAU), r: rng.float(0.15, 1), s: rng.float(1, 3.5), c: rng.pick(D.BIOMES).ground[1] });
    // ce qui part dans la lumière (phase A) et vers l'Archive (phase D)
    const fake = (def, variant, hue, foreign) => ({ def, r: 13, face: -Math.PI / 2 + 0.4, anim: 0, seed: 1, pal: AN.Art.palette(def, variant || 'commun', hue || 0, foreign || null), x: 0, y: 0, vx: 0, vy: 0 });
    const cargo = [];
    if (ok) {
      (r.creatures || []).forEach((c) => { const def = D.CREATURE[c.species]; if (def) cargo.push({ kind: 'creature', e: fake(def, c.variant, c.hueSeed, c.foreign), big: def.tier >= 2 }); });
      (r.structures || []).forEach((s) => cargo.push({ kind: 'struct', id: s.id }));
      if (r.civ && r.civ.people && (r.civ.saved || r.civ.forced || r.civ.carried)) cargo.push({ kind: 'people', e: fake(AN.Civ.def(r.civ.people, 'villager')) });
    }
    // territoires emportés : leurs vraies formes, parties de leur secteur
    const lifted = ok ? r.territories.map((t) => {
      const zi = (opts.X.zones || []).findIndex((z) => z && t.zoneName === Expedition_zoneName(opts.X, z.index));
      const sec = sectors[zi >= 0 ? zi : opts.zi] || sectors[0];
      return { t, a: (sec.a0 + sec.a1) / 2 + (Math.random() - 0.5) * 0.4, rr: 0.45 + Math.random() * 0.25 };
    }).concat((r.astres || []).map((a) => ({ astre: a, a: Math.random() * TAU, rr: 0.5 }))) : [];
    const newUids = new Set(r.territories.map((t) => t.uid));
    S = {
      t: 0, speed: ok ? 1 : 1.25, opts, shards, R, sectors, others, zw, zh, world, result: r, ok,
      cargo, lifted, newUids, prof,
      archive: ok && (r.territories.length || cargo.length) ? prof.territories.slice() : null,
      scale: world.scale || 'region',
      level: prof.artefact.stabilisateur || 0,
      fired: {}, done: false,
    };
    S.total = S.archive ? D_END : C_END + 0.6;
    AN.Audio.play('shatter');
    if (AN.Music) AN.Music.mood('finale', { outcome: r.outcome, seed: world.seed });
    // les messages de l'expédition s'effacent : la scène est à la fin du monde
    const toasts = document.getElementById('toasts');
    if (toasts) [...toasts.children].forEach((el) => { el.style.transition = 'opacity 0.4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 450); });
    AN.Game.setScene(Cin.scene);
  };
  /** Nom de la zone d'indice i (pour retrouver le secteur d'un territoire). */
  function Expedition_zoneName(X, i) {
    const spec = i >= X.world.zones.length ? X.world.heart : X.world.zones[i];
    return spec && spec.name;
  }

  Cin.skip = function () { if (S && !S.done) end(); };
  /** Débogage : se placer à un instant de la cinématique et l'y figer. */
  Cin.__seek = function (t) { if (S) { S.t = t; S.speed = 0; S.fired = new Proxy({}, { get: () => true }); } };

  function end() {
    S.done = true;
    const r = S.result;
    AN.Game.transition(() => AN.Archive.enter({ integration: r }), 0.25);
  }

  /** Une seule fois, au passage d'un instant. */
  function at(name, time, prev, fn) { if (!S.fired[name] && prev < time && S.t >= time) { S.fired[name] = true; fn(); } }

  Cin.update = function (dt) {
    if (!S || S.done) return;
    const prev = S.t;
    S.t += dt * S.speed;
    const M = AN.Music;
    at('crack', 0.4, prev, () => AN.Audio.play('rumble_hit'));
    at('shatter', 1.2, prev, () => { AN.Audio.play('shatter'); if (M) M.hit(0.6); });
    if (S.ok) at('rise', 1.0, prev, () => AN.Audio.play('whoosh', { dur: 1.6 }));
    at('break', 3.6, prev, () => AN.Audio.play('rumble_hit'));
    if (S.ok && S.lifted.length) at('lift', 4.4, prev, () => AN.Audio.play('whoosh', { pitch: 1.3, dur: 1.2 }));
    at('death', C_DEATH, prev, () => { if (!S.result.sursis) { AN.Audio.play('boom'); if (M) M.hit(1); } else AN.Audio.play('rumble_hit'); });
    if (S.archive) {
      at('arrive', D0 + 0.3, prev, () => AN.Audio.play('appear'));
      S.lifted.forEach((L, i) => at('land' + i, D0 + 1.0 + i * 0.35 + 0.75, prev, () => AN.Audio.play('land', { pitch: 0.9 + (i % 5) * 0.06 })));
    }
    if (S.t >= S.total) end();
    const I = AN.Input;
    if (I.anyHit('Space', 'Escape', 'Enter', 'KeyE') || I.mouseHit(0)) Cin.skip();
  };

  function label(ctx, W, H, top, sub, alpha, stamp) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = AN.INK;
    ctx.font = '400 30px ' + AN.FONT_SERIF;
    ctx.fillText(top, W / 2, H - 92);
    ctx.font = '400 15px ' + AN.FONT_UI;
    ctx.fillStyle = U.rgba(AN.INK, 0.7);
    ctx.fillText(sub, W / 2, H - 64);
    if (stamp) {
      ctx.translate(W / 2 + Math.min(220, W * 0.3), H - 128);
      ctx.rotate(-0.12);
      const sk = 1 + Math.max(0, 1 - alpha) * 0.6; // le tampon s'abat
      ctx.scale(sk, sk);
      ctx.strokeStyle = AN.STAMP; ctx.fillStyle = AN.STAMP;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-66, -18, 132, 34);
      ctx.font = '700 17px ' + AN.FONT_UI;
      ctx.fillText(stamp, 0, 6);
    }
    ctx.restore();
  }
  const fade = (t, a, b, inD = 0.4, outD = 0.5) => U.clamp(Math.min((t - a) / inD, (b - t) / outD), 0, 1);
  function hexPath(ctx, x, y, R) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + Math.PI / 6; const px = x + Math.cos(a) * R, py = y + Math.sin(a) * R; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  }
  /** Forme d'un territoire (ses vraies cases) centrée en (x, y), à la taille size. */
  function drawShape(ctx, t, x, y, size, alpha, glow) {
    const one = { biome: t.biome, quality: t.quality, q: 0, r: 0, cells: AN.Shapes.cellsOf(t) };
    const c = AN.Shapes.centroid(one);
    const rad = AN.Shapes.radius(one);
    const k = size / rad;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.translate(-c.x, -c.y);
    if (glow) { ctx.shadowColor = 'rgba(255,255,255,0.95)'; ctx.shadowBlur = 16; } // le flou ne suit pas l'échelle
    ctx.fillStyle = AN.Mosaic ? AN.Mosaic.colorOf(t, 1) : '#888';
    AN.Shapes.pathCells(ctx, one, AN.Hex.R + 1);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.6 / k;
    AN.Shapes.strokeOutline(ctx, one, AN.Hex.R);
    ctx.restore();
  }
  function drawCargo(ctx, c, x, y, s, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (c.kind === 'struct') AN.StructArt.draw(ctx, c.id, 0, 4, 15, 1.2, {});
    else { c.e.anim = t * 4; AN.Art.drawBody(ctx, c.e, t, c.e.pal); }
    ctx.restore();
  }

  Cin.render = function (ctx) {
    if (!S) return;
    const cam = AN.Game.cam;
    const W = cam.W, H = cam.H;
    const t = S.t;
    const reduce = AN.Prefs && AN.Prefs.reduceFx();
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.fillStyle = AN.PAPER;
    ctx.fillRect(0, 0, W, H);
    const world = S.world;
    const fit = Math.min(W, H) * 0.62;

    /* ---------- A : la zone se fend ---------- */
    if (t < A_END + 0.4) {
      const k = U.clamp(t / A_END, 0, 1);
      const startScale = cam.zoom || 1;
      const endScale = fit / Math.max(S.zw, S.zh);
      const sc = Math.exp(U.lerp(Math.log(startScale), Math.log(endScale), U.easeInOut(k)));
      const fx = U.lerp(S.opts.player.x, S.zw / 2, U.easeInOut(k)), fy = U.lerp(S.opts.player.y, S.zh / 2, U.easeInOut(k));
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(sc, sc);
      ctx.translate(-fx, -fy);
      const R = S.R;
      for (const p of S.shards) {
        const lt = U.clamp((t - p.delay) / 1.0, 0, 1);
        if (lt >= 1) continue;
        ctx.save();
        ctx.globalAlpha = 1 - U.easeIn(lt);
        ctx.translate(p.cx + p.dx * U.easeIn(lt), p.cy + p.dy * U.easeIn(lt));
        ctx.rotate(p.rot * lt);
        const s = 1 - lt * 0.45;
        ctx.scale(s, s);
        hexPath(ctx, 0, 0, R * 1.02);
        ctx.save();
        ctx.clip();
        ctx.drawImage(S.opts.snapshot, p.cx - R * 1.1, p.cy - R * 1.1, R * 2.2, R * 2.2, -R * 1.1, -R * 1.1, R * 2.2, R * 2.2);
        ctx.restore();
        // fissures : les bords s'illuminent avant la rupture
        const crack = U.clamp((t - p.delay + 0.7) / 0.7, 0, 1);
        if (crack > 0) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * crack) + ')';
          ctx.lineWidth = (2 + crack * 3) / sc;
          hexPath(ctx, 0, 0, R);
          ctx.stroke();
        }
        ctx.restore();
      }
      // la colonne de lumière du portail, et ce qu'elle emporte
      const px = S.opts.player.x, py = S.opts.player.y;
      const beam = U.clamp((t - 0.3) / 0.6, 0, 1) * (1 - U.clamp((t - A_END + 0.2) / 0.6, 0, 1));
      if (beam > 0) {
        const bw = (40 + 60 * beam) / Math.sqrt(sc);
        const g = ctx.createLinearGradient(px - bw, 0, px + bw, 0);
        g.addColorStop(0, U.rgba(AN.CYAN, 0)); g.addColorStop(0.5, 'rgba(255,255,255,' + 0.9 * beam + ')'); g.addColorStop(1, U.rgba(AN.CYAN, 0));
        ctx.fillStyle = g;
        ctx.fillRect(px - bw, py - 6000, bw * 2, 6000);
        const rg = ctx.createRadialGradient(px, py, 0, px, py, bw * 2.2);
        rg.addColorStop(0, 'rgba(255,255,255,' + beam + ')'); rg.addColorStop(1, U.rgba(AN.CYAN, 0));
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(px, py, bw * 2.2, 0, TAU); ctx.fill();
      }
      ctx.restore();
      // la soute monte dans la lumière (dessinée à taille fixe, à l'écran)
      const sp = { x: W / 2 + (px - fx) * sc, y: H / 2 + (py - fy) * sc };
      S.cargo.forEach((c, i) => {
        const lt = U.clamp((t - 0.7 - i * 0.18) / 1.6, 0, 1);
        if (lt <= 0 || lt >= 1) return;
        const y = U.lerp(sp.y, -60, U.easeIn(lt));
        const x = sp.x + Math.sin(lt * 7 + i) * 18 * (1 - lt);
        ctx.globalAlpha = Math.min(1, lt * 5) * (1 - U.clamp((lt - 0.8) / 0.2, 0, 1));
        drawCargo(ctx, c, x, y, c.big ? 1.5 : 1.1, t);
        ctx.globalAlpha = 1;
      });
      label(ctx, W, H, S.opts.zone.name, 'Zone ' + (S.opts.zi < world.zones.length ? (S.opts.zi + 1) + ' sur ' + world.zones.length : 'centrale'), fade(t, 0, A_END + 0.4, 0.5, 0.6));
    }

    /* ---------- B : le monde, rongé par le Néant ---------- */
    if (t > B0 && t < C0 + 0.8) {
      const k = U.clamp((t - B0) / (B_END - B0), 0, 1);
      const R = fit * 0.55 * U.lerp(1.5, 1, U.easeOut(Math.min(1, k * 1.8)));
      const shrink = t > B_END - 0.4 ? U.easeInOut(U.clamp((t - (B_END - 0.4)) / 1.0, 0, 1)) : 0;
      const Rr = R * (1 - shrink * 0.97);
      const cx = W / 2, cy = H / 2 - 20;
      const appear = U.clamp((t - B0) / 0.6, 0, 1);
      const brkAll = U.clamp((k - 0.4) / 0.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = appear * (1 - shrink);
      for (const s of S.sectors) {
        const brk = brkAll * s.drift;
        const mid = (s.a0 + s.a1) / 2;
        const ox = Math.cos(mid) * brk * Rr * 0.3, oy = Math.sin(mid) * brk * Rr * 0.3;
        ctx.save();
        ctx.globalAlpha *= (1 - U.clamp(brk * 0.85, 0, 1)) * (s.isHere ? 0.35 : 1) * (S.ok ? 1 : 0.85);
        ctx.translate(cx + ox, cy + oy);
        ctx.rotate(brk * 0.25 * (s.drift - 1));
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, Rr, s.a0, s.a1); ctx.closePath();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = s.biome.ground[1];
        ctx.fillRect(-Rr, -Rr, Rr * 2, Rr * 2);
        if (s.thumb) ctx.drawImage(s.thumb, -Rr, -Rr, Rr * 2, Rr * 2);
        if (!S.ok) { ctx.fillStyle = 'rgba(28,34,48,0.25)'; ctx.fillRect(-Rr, -Rr, Rr * 2, Rr * 2); }
        ctx.restore();
        ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5; ctx.stroke();
        // la frontière se fend, en bleu, juste avant de céder
        const glow = U.clamp((k - 0.25) / 0.2, 0, 1) * (1 - brk);
        if (glow > 0) { ctx.strokeStyle = U.rgba(AN.CYAN, glow); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(s.a0) * Rr, Math.sin(s.a0) * Rr); ctx.stroke(); }
        ctx.restore();
      }
      // relief : à partir de l'échelle d'un monde, c'est une sphère
      if (S.scale !== 'region') {
        const sh = ctx.createRadialGradient(cx - Rr * 0.35, cy - Rr * 0.35, Rr * 0.1, cx, cy, Rr * 1.05);
        sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.65, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(10,14,24,0.45)');
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(cx, cy, Rr * (1 + brkAll * 0.2), 0, TAU); ctx.fill();
      }
      ctx.restore();
      // le Néant gagne depuis le bord : un anneau blanc qui se resserre
      const eat = U.clamp((k - 0.15) / 0.85, 0, 1);
      if (eat > 0 && shrink < 1) {
        const inner = Rr * (1.25 - eat * 1.0);
        const g = ctx.createRadialGradient(cx, cy, Math.max(1, inner), cx, cy, inner + Rr * 0.35);
        g.addColorStop(0, U.rgba(AN.PAPER, 0)); g.addColorStop(1, U.rgba(AN.PAPER, 0.98));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      // ce qui est arraché au monde file vers le portail, puis monte vers l'Archive
      if (S.ok) {
        const lk = U.clamp((k - 0.1) / 0.6, 0, 1);
        const up = U.clamp((t - (B_END - 0.6)) / 1.0, 0, 1);
        S.lifted.forEach((L, i) => {
          const lt = U.clamp(lk * 1.3 - i * 0.08, 0, 1);
          const rr = U.lerp(Rr * L.rr, 0, U.easeIn(lt));
          const sw = L.a + lt * 1.6;
          const x = cx + Math.cos(sw) * rr;
          const y = cy + Math.sin(sw) * rr - lt * 30 - U.easeIn(up) * (H * 0.7);
          const al = appear * Math.min(1, lt * 4 + 0.2) * (1 - U.clamp((up - 0.7) / 0.3, 0, 1));
          if (L.astre) {
            ctx.globalAlpha = al; ctx.fillStyle = D.BIOME[L.astre.biome].ground[1]; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(x, y, 18 * (1 - lt * 0.4), 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
          } else drawShape(ctx, L.t, x, y, (24 + 11 * Math.sqrt(AN.Shapes.cellsOf(L.t).length)) * (1 - lt * 0.3), al, lt > 0.2);
        });
        const portals = 1 + Math.floor(S.level / 2);
        for (let i = 0; i < portals; i++) {
          const a = (i / portals) * TAU + t * 0.6;
          const ppx = cx + (portals > 1 ? Math.cos(a) * 26 : 0), ppy = cy + (portals > 1 ? Math.sin(a) * 26 : 0);
          const pr = 30 + Math.sin(t * 5) * 4;
          const g = ctx.createRadialGradient(ppx, ppy, 0, ppx, ppy, pr);
          g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, U.rgba(AN.CYAN, 0));
          ctx.globalAlpha = appear * (1 - shrink);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ppx, ppy, pr, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      label(ctx, W, H, world.code, world.region, fade(t, B0 + 0.3, C0 + 0.3, 0.5, 0.5));
    }

    /* ---------- C : l'échelle au-dessus ---------- */
    if (t > C0) {
      const k = U.clamp((t - C0) / (C_END - C0), 0, 1);
      const cx = W / 2, cy = H / 2 - 20;
      const RR = Math.min(W, H) * 0.42;
      const out = S.archive ? U.clamp((t - (D0 - 0.1)) / 0.6, 0, 1) : U.clamp((t - C_END) / 0.6, 0, 1);
      ctx.save();
      ctx.globalAlpha = U.clamp(k * 2.5, 0, 1) * (1 - out);
      if (S.scale === 'systeme') {
        for (let i = 0; i < 700; i++) {
          const arm = i % 3, d = ((i * 0.618) % 1);
          const a = arm * (TAU / 3) + d * 5 + Math.sin(i * 12.9) * 0.3 + t * 0.03;
          ctx.fillStyle = U.rgba(['#1c2230', '#2346c8', '#6a5a90'][i % 3], 0.5);
          ctx.fillRect(cx + Math.cos(a) * RR * d, cy + Math.sin(a) * RR * d * 0.9, 1.6, 1.6);
        }
      } else if (S.scale === 'galaxie') {
        const c = RR / 3;
        ctx.strokeStyle = U.rgba(AN.INK, 0.2); ctx.lineWidth = 1;
        for (let j = -3; j <= 3; j++) for (let i = -4; i <= 4; i++) {
          ctx.strokeRect(cx + i * c - c / 2, cy + j * c - c / 2, c, c);
          if ((i * 7 + j * 3) % 4) { ctx.fillStyle = U.rgba(AN.INK, 0.35); ctx.beginPath(); ctx.arc(cx + i * c, cy + j * c, 2, 0, TAU); ctx.fill(); }
        }
      } else {
        ctx.strokeStyle = U.rgba(AN.INK, 0.25); ctx.lineWidth = 1;
        for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx, cy, RR * i / 3, 0, TAU); ctx.stroke(); }
        for (const o of S.others) {
          ctx.fillStyle = o.c; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(cx + Math.cos(o.a + t * 0.05) * RR * o.r, cy + Math.sin(o.a + t * 0.05) * RR * o.r, o.s, 0, TAU); ctx.fill(); ctx.stroke();
        }
      }
      // le monde : un point qui flamboie puis s'éteint dans une onde de choc
      const sursis = !!S.result.sursis;
      const dead = sursis ? 0 : U.clamp((t - C_DEATH) / 0.5, 0, 1);
      const flare = sursis ? 0 : U.clamp(1 - Math.abs(t - C_DEATH) / 0.35, 0, 1);
      if (dead < 1) {
        ctx.fillStyle = D.BIOME[world.primary].ground[1];
        ctx.beginPath(); ctx.arc(cx, cy, 5 * (1 + flare * 2.5), 0, TAU);
        ctx.save(); ctx.globalAlpha *= 1 - dead; ctx.fill(); ctx.strokeStyle = sursis ? AN.INK : AN.STAMP; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      if (!sursis && t > C_DEATH - 0.05) {
        const wt = t - C_DEATH;
        for (let i = 0; i < (reduce ? 1 : 3); i++) {
          const w = U.clamp((wt - i * 0.12) / 0.9, 0, 1);
          if (w <= 0 || w >= 1) continue;
          ctx.strokeStyle = i === 0 ? U.rgba(AN.STAMP, 1 - w) : U.rgba(AN.INK, (1 - w) * 0.5);
          ctx.lineWidth = (1 - w) * 6 + 1;
          ctx.beginPath(); ctx.arc(cx, cy, 6 + w * RR * (0.6 + i * 0.25), 0, TAU); ctx.stroke();
        }
        if (!reduce && flare > 0) { const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90); fg.addColorStop(0, 'rgba(255,255,255,' + flare + ')'); fg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, 90, 0, TAU); ctx.fill(); }
      }
      ctx.restore();
      const outc = S.result.outcome;
      const stamp = sursis ? 'EN SURSIS' : 'DÉTRUIT';
      const sub = outc === 'extrait' ? 'Transfert terminé. Ce monde n’existe plus.' : outc === 'urgence' ? 'Extraction d’urgence. Presque tout est resté là-bas.' : sursis ? 'Échec. Ce monde tient encore, et des vôtres y sont restés.' : 'Échec. L’Artefact vous a ramené sans rien.';
      const upper = { region: 'Échelle supérieure', monde: 'Échelle supérieure : son système', orbite: 'Échelle supérieure : son système', systeme: 'Échelle supérieure : sa galaxie', galaxie: 'Échelle supérieure : son amas', amas: 'Échelle supérieure : sa toile', toile: 'Échelle supérieure : ???', pli: 'Échelle supérieure : ???' }[S.scale] || 'Échelle supérieure';
      const la = U.clamp((t - C0 - 0.3) * 2, 0, 1) * (1 - out);
      label(ctx, W, H, upper, sub, la, t > C_DEATH - 0.1 || sursis ? stamp : null);
    }

    /* ---------- D : l'Archive reçoit ce qui a été sauvé ---------- */
    if (S.archive && t > D0) {
      const k = U.clamp((t - D0) / 0.8, 0, 1);
      const terr = S.archive;
      const b = AN.Mosaic.bounds(terr);
      const sc = Math.min((W * 0.62) / b.w, (H * 0.56) / b.h) * U.lerp(0.85, 1, U.easeOut(k));
      const cx = W / 2, cy = H / 2 - 30;
      const toScr = (x, y) => ({ x: cx + (x - b.cx) * sc, y: cy + (y - b.cy) * sc });
      ctx.save();
      ctx.globalAlpha = k;
      ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-b.cx, -b.cy);
      // la mosaïque, sans les nouveaux venus
      AN.Mosaic.draw(ctx, terr.filter((x) => !S.newUids.has(x.uid)), { scale: sc, alpha: k * 0.9, lineAlpha: 0.75 });
      ctx.restore();
      // les nouveaux territoires tombent à leur place
      let i = 0;
      S.lifted.forEach((L) => {
        if (!L.t) return;
        const t0 = D0 + 1.0 + i * 0.35;
        i++;
        const lt = U.clamp((t - t0) / 0.75, 0, 1);
        if (lt <= 0) return;
        const c = AN.Shapes.centroid(L.t);
        const dst = toScr(c.x, c.y);
        const src = { x: W / 2 + (i % 2 ? -1 : 1) * 40, y: -80 };
        const e = U.easeOut(lt);
        const x = U.lerp(src.x, dst.x, e), y = U.lerp(src.y, dst.y, e);
        const rad = AN.Shapes.radius(L.t) * sc;
        drawShape(ctx, L.t, x, y, rad * U.lerp(1.6, 1, e), 1, lt < 1);
        if (lt >= 1) {
          const ring = U.clamp((t - t0 - 0.75) / 0.6, 0, 1);
          if (ring < 1) { ctx.strokeStyle = U.rgba(AN.CYAN, 1 - ring); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(dst.x, dst.y, rad * (1 + ring * 0.8), 0, TAU); ctx.stroke(); }
        }
      });
      // la soute rejoint l'Artefact
      const art = toScr(0, 0);
      S.cargo.forEach((c, j) => {
        const lt = U.clamp((t - D0 - 0.9 - j * 0.2) / 0.9, 0, 1);
        if (lt <= 0) return;
        const a = (j / Math.max(1, S.cargo.length)) * TAU - Math.PI / 2;
        const rr = 34 + (S.cargo.length > 6 ? 14 : 0);
        const x = U.lerp(W / 2, art.x + Math.cos(a) * rr, U.easeOut(lt)), y = U.lerp(-60, art.y + Math.sin(a) * rr, U.easeOut(lt));
        ctx.globalAlpha = Math.min(1, lt * 3);
        drawCargo(ctx, c, x, y, 0.8, t);
        ctx.globalAlpha = 1;
      });
      const rk = AN.Profile.rank(S.prof);
      const nT = S.lifted.filter((L) => L.t).length, nA = S.lifted.filter((L) => L.astre).length;
      const bits = [];
      if (nT) bits.push(nT + ' territoire' + (nT > 1 ? 's' : '') + ' rejoigne' + (nT > 1 ? 'nt' : '') + ' la mosaïque');
      if (nA) bits.push(nA + ' astre' + (nA > 1 ? 's' : '') + ' dans son ciel');
      const nC = S.cargo.filter((c) => c.kind === 'creature').length;
      if (nC) bits.push(nC + ' créature' + (nC > 1 ? 's' : '') + ' archivée' + (nC > 1 ? 's' : ''));
      label(ctx, W, H, 'L’Archive : ' + rk.def.name, bits.join(', ') + (bits.length ? '.' : ''), fade(t, D0 + 0.4, S.total + 0.3, 0.6, 0.4));
    }

    // indication de passage
    ctx.fillStyle = U.rgba(AN.INK, 0.45);
    ctx.font = '400 12px ' + AN.FONT_UI;
    ctx.textAlign = 'right';
    const dev = AN.Input.lastDevice;
    ctx.fillText(dev === 'tactile' ? 'Touchez pour passer' : dev === 'manette' ? AN.Input.label('KeyE') + ' pour passer' : 'Espace pour passer', W - 20, H - 20);
  };

  Cin.scene = { name: 'cinematic', update: (dt) => Cin.update(dt), render: (ctx) => Cin.render(ctx) };
})();
