/* Extraction : l'Artefact ouvre un portail sur une plaque blanche, le monde
   perd sa stabilité et s'efface dans le blanc, du bord vers le portail.
   Le joueur doit rester dans le portail le temps du transfert. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const Col = (AN.Collapse = {});

  /** Raccourcissement du transfert (modules d'extraction, relais, horloge figée). */
  Col.transferMul = (X) => 1 - Math.min(0.5, ((X.T && X.T.transfer) || 0) + (X.powers ? X.powers.transfer || 0 : 0));

  Col.start = function (X, plate, selection) {
    const zone = X.zone;
    const st = AN.Profile.upgradeValue(X.profile, 'stabilisateur');
    const pw = X.powers;
    let dur = st.dur * (1 + pw.stability) * U.lerp(0.8, 1.15, X.world.stability);
    if (X.world.rule === 'instable') dur *= 0.8;
    // tuiles triées de la plus lointaine à la plus proche du portail
    const T = Z.T;
    const tiles = [];
    let maxD = 0;
    for (let y = 0; y < zone.h; y++) for (let x = 0; x < zone.w; x++) {
      const d = Math.hypot(x * T + T / 2 - plate.x, y * T + T / 2 - plate.y) + ((x * 7 + y * 13) % 11) * 4;
      tiles.push([d, x, y]);
      if (d > maxD) maxD = d;
    }
    tiles.sort((a, b) => b[0] - a[0]);
    // depuis l'hexagone (1.9) : le portail est l'hexagone entier, et le transfert y est plus court
    const base = plate.base && X.base;
    X.collapse = {
      plate, selection, t: 0, dur, need: dur * 0.62 * Col.transferMul(X) * (base ? 1 - D.BASE.transfer : 1), progress: 0, frozen: 0,
      maxD, front: maxD, safe: base ? X.base.R + T : T * 4.2, tiles, ptr: 0, cracked: new Set(),
      portalR: base ? X.base.R * 0.92 : T * 3.2, waveT: 3, debrisT: 2, sound: AN.Audio.loop('rumble'), done: false,
    };
    for (const e of X.creatures) {
      if (!e.alive || e.team !== 'wild' || e.boss) continue;
      if (e.tier === 0 && (e.temper === 'passif' || e.temper === 'craintif')) e.panic = true;
      else { e.frenzy = true; e.aggroT = 30; }
    }
    AN.Audio.play('portal');
    X.cam.shake(8);
    FX.ring(plate.x, plate.y, AN.CYAN, 10, 300, 1, 5);
    AN.HUD.toast('Le transfert commence. Restez dans le cercle du portail jusqu’à la fin.', 5);
    X.reservedCargo = 0;
    AN.Civ.collapseStart(X);
    AN.HUD.collapse(X);
  };

  function crackTile(X, x, y, ctx) {
    const T = Z.T;
    ctx.strokeStyle = 'rgba(10,10,14,0.55)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const cx = x * T + Math.random() * T, cy = y * T + Math.random() * T;
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 3; k++) ctx.lineTo(cx + (Math.random() - 0.5) * T * 1.6, cy + (Math.random() - 0.5) * T * 1.6);
    ctx.stroke();
  }

  Col.update = function (X, dt) {
    const c = X.collapse;
    if (!c || c.done) return;
    const zone = X.zone;
    const p = X.player;
    const T = Z.T;
    if (c.frozen > 0) c.frozen -= dt;
    else c.t += dt;
    const k = U.clamp(c.t / c.dur, 0, 1);
    c.front = U.lerp(c.maxD, c.safe, Math.pow(k, 0.85));
    c.sound.set(0.3 + k * 0.7);
    if (Math.random() < dt * 4) X.cam.shake(1 + k * 4);

    // fissures en avant du front, effacement derrière
    const ctx = X.canvas.getContext('2d');
    const view = X.cam.view(60);
    let n = 0;
    while (c.ptr < c.tiles.length && c.tiles[c.ptr][0] > c.front && n < 400) {
      const [, x, y] = c.tiles[c.ptr++];
      n++;
      const i = y * zone.w + x;
      const was = zone.grid[i];
      zone.grid[i] = Z.VOID;
      // la miniature est repeinte case par case (1.8.2) plutôt qu'entièrement ;
      // un sol effacé y garde sa couleur, seuls relief, vide, danger et plaques changent
      if (X.thumb && (was === Z.WALL || was === Z.ABYSS || was === Z.HAZARD || was === Z.PLATE)) AN.Terrain.thumbTile(X.thumb, zone, x, y, 3);
      ctx.fillStyle = AN.PAPER;
      ctx.fillRect(x * T - 0.5, y * T - 0.5, T + 1, T + 1);
      (X.zoneDirty || (X.zoneDirty = [])).push(x, y, 0); // à reporter dans le calque du terrain
      const px = x * T + T / 2, py = y * T + T / 2;
      if (px > view.x0 && px < view.x1 && py > view.y0 && py < view.y1 && Math.random() < 0.6) {
        const b = Z.biomeAt(zone, px, py);
        const col = was === Z.WALL ? b.wall.top : b.ground[1];
        FX.add({ kind: 'square', x: px, y: py, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, size: T * 0.9, color: col, life: 0.7, vr: (Math.random() - 0.5) * 4, rot: 0, drag: 1 });
      }
    }
    // fissures sur une bande de 80 px devant le front
    for (let j = c.ptr; j < Math.min(c.tiles.length, c.ptr + 60); j++) {
      const [d, x, y] = c.tiles[j];
      if (d < c.front - 90) break;
      const key = y * zone.w + x;
      if (!c.cracked.has(key) && Math.random() < 0.08) { c.cracked.add(key); crackTile(X, x, y, ctx); (X.zoneDirty || (X.zoneDirty = [])).push(x, y, 1); }
    }

    // présence dans le portail
    const inPortal = U.dist(p.x, p.y, c.plate.x, c.plate.y) <= c.portalR;
    if (inPortal && p.alive) c.progress += dt;
    c.inPortal = inPortal;
    // Quand le front a tout englouti, le vide gagne aussi l'abord du portail.
    if (k >= 1 && !inPortal && p.alive) AN.PlayerCtl.damage(X, 30 * dt, null, { dot: true, numbers: false, ignoreIframes: true });

    // vagues de créatures et débris
    c.waveT -= dt;
    if (c.waveT <= 0 && k < 0.9) {
      c.waveT = 5 + Math.random() * 3;
      const pool = AN.WorldGen.pool(zone.biome).filter((d) => d.attack);
      if (pool.length) {
        const count = 1 + Math.floor(X.world.threat / 2) + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const a = Math.random() * TAU;
          const r = Math.min(c.front - 40, 560);
          let x = c.plate.x + Math.cos(a) * r, y = c.plate.y + Math.sin(a) * r;
          if (Z.tileAt(zone, x, y) !== Z.FLOOR) continue;
          const def = pool[Math.floor(Math.random() * pool.length)];
          const e = AN.Entities.creature(def, x, y, { threat: X.world.threat, rule: X.world.rule });
          e.frenzy = true; e.aggroT = 30; e.noLoot = true;
          if (c.plate.base) e.raid = true; // elles marchent sur l'hexagone (1.9)
          X.creatures.push(e);
          FX.burst(x, y, e.pal.body, 10, 120, { size: 3 });
        }
      }
    }
    c.debrisT -= dt;
    if (c.debrisT <= 0) {
      c.debrisT = U.lerp(2.2, 0.8, k);
      const a = Math.random() * TAU, r = 60 + Math.random() * 200;
      AN.Combat.telegraph(X, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 44, windup: 1, dmg: 12 + X.world.threat * 2, team: 'wild', silent: true });
    }
    // les compagnons rejoignent le portail
    for (const al of X.allies) {
      if (al.downed) continue;
      if (U.dist(al.x, al.y, c.plate.x, c.plate.y) > c.portalR) { al.home = { x: c.plate.x, y: c.plate.y }; }
    }
    if (c.integrity != null && c.integrity <= 0 && !X.ending) {
      AN.HUD.toast('Le portail cède sous les coups des iconoclastes !', 5);
      c.done = true;
      c.sound.stop();
      AN.Expedition.emergency(X);
      return;
    }
    if (c.progress >= c.need && p.alive) {
      c.done = true;
      c.sound.stop();
      AN.Audio.play('shatter');
      // depuis l'hexagone, il repart d'abord avec le butin, le joueur à bord (1.9)
      if (c.plate.base && X.base && X.base.state === 'ok') AN.Base.lift(X, true, () => AN.Expedition.finish(X, 'extrait'));
      else AN.Expedition.finish(X, 'extrait');
    }
  };

  Col.drawUnder = function (ctx, X, t) {
    const c = X.collapse;
    const pl = c.plate;
    // portail : colonne de lumière vue de dessus
    const pulse = 1 + Math.sin(t * 6) * 0.04;
    const g = ctx.createRadialGradient(pl.x, pl.y, 10, pl.x, pl.y, c.portalR * 1.2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.6, U.rgba(AN.CYAN, 0.25));
    g.addColorStop(1, U.rgba(AN.CYAN, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(pl.x, pl.y, c.portalR * 1.2 * pulse, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.inPortal ? AN.CYAN : AN.STAMP;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.beginPath(); ctx.arc(pl.x, pl.y, c.portalR, t * 0.8, t * 0.8 + TAU); ctx.stroke();
    ctx.setLineDash([]);
    // progression du transfert
    ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(pl.x, pl.y, c.portalR + 8, -Math.PI / 2, -Math.PI / 2 + TAU * U.clamp(c.progress / c.need, 0, 1)); ctx.stroke();
    // anneaux de l'Artefact (l'hexagone dessine déjà le sien)
    for (let i = 0; i < (pl.base ? 0 : 3); i++) {
      ctx.save();
      ctx.translate(pl.x, pl.y);
      ctx.rotate(t * (0.6 + i * 0.4) * (i % 2 ? -1 : 1));
      ctx.strokeStyle = U.rgba(AN.INK, 0.7 - i * 0.18);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-14 - i * 9, -14 - i * 9, 28 + i * 18, 28 + i * 18);
      ctx.restore();
    }
  };

  Col.drawOver = function (ctx, X, t) {
    const c = X.collapse;
    // particules aspirées vers le portail
    if (Math.random() < 0.7) {
      const a = Math.random() * TAU, r = c.portalR * 2 + Math.random() * 300;
      FX.stream(c.plate.x + Math.cos(a) * r, c.plate.y + Math.sin(a) * r, c.plate.x, c.plate.y, Math.random() < 0.5 ? '#ffffff' : AN.CYAN, { life: 0.9, size: 2.5 });
    }
  };

  /*
   * Halo blanc du bord de l'écran. Son intensité ne prend que 256 valeurs
   * (le navigateur arrondit l'opacité d'une couleur) : il est peint dans un
   * calque gardé tant qu'elle ne change pas (1.8.2), au lieu d'un dégradé
   * plein écran recalculé à chaque image.
   */
  let halo = null;
  Col.drawScreen = function (ctx, X, t) {
    const c = X.collapse;
    const k = U.clamp(c.t / c.dur, 0, 1);
    const W = X.cam.W, H = X.cam.H, dpr = X.cam.dpr;
    const alpha = 0.15 + k * 0.45;
    const a8 = Math.round(alpha * 255);
    const dw = ctx.canvas.width, dh = ctx.canvas.height;
    if (!halo || halo.a8 !== a8 || halo.W !== W || halo.H !== H || halo.dpr !== dpr || halo.cv.width !== dw || halo.cv.height !== dh) {
      const cv = halo && halo.cv.width === dw && halo.cv.height === dh ? halo.cv : AN.Terrain.canvas(dw, dh);
      const hc = cv.getContext('2d');
      hc.setTransform(1, 0, 0, 1, 0, 0);
      hc.clearRect(0, 0, dw, dh);
      hc.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = hc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,' + alpha + ')');
      hc.fillStyle = g;
      hc.fillRect(0, 0, W, H);
      halo = { cv, a8, W, H, dpr };
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(halo.cv, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  /** Fin du transfert : le calque du halo est rendu. */
  Col.release = () => { halo = null; };
})();
