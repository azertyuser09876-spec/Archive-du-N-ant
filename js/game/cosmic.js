/* Échelles supérieures, côté expédition : déplacements propres à chaque échelon
   (apesanteur, puits de gravité, sauts au-dessus du vide), menaces (séismes,
   météores, éruptions solaires, dévoreurs), formes de capture des êtres géants
   (ancrage, scellement, encerclement, synchronisation) et appels des géants cosmiques. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const C = AN.Combat;
  const I = AN.Input;
  const TAU = Math.PI * 2;

  const Co = (AN.Cosmic = {});

  Co.echelon = (world) => D.ECHELONS[(world && world.scale) || 'region'] || D.ECHELONS.region;
  Co.isCosmic = (X) => !!(X && X.echelon && X.echelon.id !== 'region');

  const EVENTS = {
    seisme: { first: 24, every: [30, 40] },
    meteores: { first: 16, every: [20, 28] },
    eruption: { first: 22, every: [30, 40] },
    devoreurs: { first: 22, every: [26, 34] },
  };

  Co.setup = function (X) {
    X.echelon = Co.echelon(X.world);
    const ev = X.echelon.event && EVENTS[X.echelon.event];
    X.cosmo = { eventT: ev ? ev.first : 1e9, warn: null, flare: null, flash: 0, ring: null, hole: null, beacons: [], charge: 0, leapTrail: [] };
  };

  /* ======================= Déplacements ======================= */
  /** Réglages du joueur selon l'échelon : inertie en apesanteur. */
  Co.playerMode = function (X, p) {
    const mv = X.echelon ? X.echelon.move : 'walk';
    p.accel = mv === 'drift' || mv === 'gravity' ? X.S.thrust : null;
  };

  /** Forces extérieures : puits de gravité du système. */
  Co.playerForces = function (X, p, dt) {
    const wells = X.zone.wells;
    if (!wells || !wells.length || p.leap) return;
    for (const w of wells) {
      const dx = w.x - p.x, dy = w.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > w.range) continue;
      const g = w.g * (1 - d / w.range) * (1 - d / w.range * 0.4);
      p.vx += (dx / d) * g * dt;
      p.vy += (dy / d) * g * dt;
    }
    // la fronde : près d'un puits, la vitesse maximale augmente
    const sp = Math.hypot(p.vx, p.vy), max = X.S.speed * 2.1;
    if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
  };

  /**
   * Galaxie : Espace bref = esquive ; Espace maintenu = saut au-dessus du vide.
   * Renvoie true si l'action d'esquive a été prise en charge ici.
   */
  Co.leapControl = function (X, p, dt, ax) {
    if (!X.echelon || X.echelon.move !== 'leap') return false;
    const c = X.cosmo;
    if (p.leap) return true;
    if (I.down('Space') && p.dashCd <= 0) {
      c.charge = Math.min(1, c.charge + dt / 0.9);
      return true;
    }
    if (c.charge > 0) {
      const k = c.charge;
      c.charge = 0;
      if (k < 0.22) return false; // appui bref : esquive normale (traitée par le joueur)
      const dx = ax.x || Math.cos(p.aim), dy = ax.y || Math.sin(p.aim);
      const l = Math.hypot(dx, dy) || 1;
      const dist = 140 + k * 280;
      const dur = 0.3 + k * 0.25;
      p.leap = { t: 0, dur, x0: p.x, y0: p.y, vx: (dx / l) * dist / dur, vy: (dy / l) * dist / dur };
      p.iframes = Math.max(p.iframes, dur + 0.1);
      p.dashCd = X.S.dashCd * 1.4;
      AN.Audio.play('dash', { pitch: 0.7 });
      return true;
    }
    return false;
  };
  /** Mise à jour du saut en cours (appelée avant le déplacement du joueur). */
  Co.leapUpdate = function (X, p, dt) {
    const L = p.leap;
    if (!L) return false;
    L.t += dt;
    p.dvx = p.vx = L.vx; p.dvy = p.vy = L.vy;
    if (Math.random() < 0.9) X.cosmo.leapTrail.push({ x: p.x, y: p.y, t: 0 });
    if (L.t >= L.dur) {
      p.leap = null;
      p.vx *= 0.3; p.vy *= 0.3; p.dvx = p.dvy = 0;
      const tile = Z.tileAt(X.zone, p.x, p.y);
      if (Z.isSolid(tile) || tile === Z.VOID) {
        FX.burst(p.x, p.y, '#8a8aff', 20, 200, { size: 3 });
        p.x = L.x0; p.y = L.y0;
        AN.PlayerCtl.damage(X, 14, null, { ignoreIframes: true });
        AN.HUD.toast('Trop court : le vide vous rejette au bord de l’île.', 2.5);
      } else {
        FX.ring(p.x, p.y, '#ffffff', 6, 60, 0.35, 3);
        X.cam.shake(3);
      }
      AN.Physics.collide(X.zone, p);
    }
    return true;
  };

  /* ======================= Menaces des échelons ======================= */
  function nearFloor(X, x, y) {
    for (let k = 0; k < 20; k++) {
      const a = Math.random() * TAU, r = k * 8;
      const xx = x + Math.cos(a) * r, yy = y + Math.sin(a) * r;
      if (Z.tileAt(X.zone, xx, yy) === Z.FLOOR) return { x: xx, y: yy };
    }
    return null;
  }

  const RUN = {
    seisme(X) {
      X.cosmo.warn = { kind: 'seisme', t: 0, dur: 1.8, text: 'La croûte du monde tremble…' };
      AN.Audio.play('boss_roar', { pitch: 0.5 });
    },
    meteores(X) {
      AN.HUD.toast('Pluie de météores ! Écartez-vous des cercles.', 3.5);
      const p = X.player;
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * TAU, r = i === 0 ? 0 : 50 + Math.random() * 360;
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        C.telegraph(X, { x, y, r: 46, windup: 1.3 + i * 0.2, dmg: 22, team: 'wild', color: '#c8c2b8', silent: i > 0,
          onDone: (XX) => {
            FX.burst(x, y, '#e8e2d6', 16, 200, { size: 4 });
            XX.cam.shake(4);
            AN.Audio.play('explosion', { gap: 0.15 });
            if (Math.random() < 0.3 && Z.tileAt(XX.zone, x, y) === Z.FLOOR) {
              XX.zone.nodes.push({ id: 'm' + Math.random().toString(36).slice(2, 7), tx: Math.floor(x / Z.T), ty: Math.floor(y / Z.T), x, y, res: Math.random() < 0.3 ? 'ether' : 'regolithe', amount: 2, uses: 1 });
            }
          } });
      }
    },
    eruption(X) {
      X.cosmo.flare = { t: 0, warn: 3.6, dir: X.zone.starAngle, done: false };
      AN.HUD.toast('Éruption solaire imminente : abritez-vous derrière le relief, à l’opposé de l’étoile !', 4);
      AN.Audio.play('telegraph');
    },
    devoreurs(X) {
      const p = X.player;
      const def = D.CREATURE.devoreur;
      const n = 3 + Math.floor(Math.random() * 3);
      let made = 0;
      for (let k = 0; k < 60 && made < n; k++) {
        const a = Math.random() * TAU, r = 260 + Math.random() * 260;
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        const tile = Z.tileAt(X.zone, x, y);
        if (tile !== Z.ABYSS && tile !== Z.FLOOR) continue;
        const e = AN.Entities.creature(def, x, y, { threat: X.world.threat, rule: X.world.rule });
        e.temper = 'agressif'; e.aggroT = 20; e.noLoot = Math.random() < 0.5;
        X.creatures.push(e);
        FX.burst(x, y, '#8a8aff', 12, 140, { size: 3 });
        made++;
      }
      if (made) AN.HUD.toast('Des dévoreurs sortent du vide.', 3);
    },
  };

  function resolveFlare(X) {
    const f = X.cosmo.flare;
    const zone = X.zone;
    const dx = Math.cos(f.dir), dy = Math.sin(f.dir);
    const exposed = (e) => Z.los(zone, e.x, e.y, e.x + dx * 320, e.y + dy * 320);
    const p = X.player;
    X.cosmo.flash = 0.8;
    X.cam.shake(12);
    AN.Audio.play('explosion');
    const armor = X.loadout.armor ? D.GEAR[X.loadout.armor] : null;
    if (p.alive && exposed(p)) {
      AN.PlayerCtl.damage(X, 34 * (1 - ((armor && armor.flareRes) || 0)), null, { ignoreIframes: true });
      AN.HUD.toast('L’éruption vous a frappé de plein fouet.', 2.5);
    } else if (p.alive) FX.text(p.x, p.y - 30, 'à l’abri', AN.CYAN, { size: 12, bold: true });
    for (const e of X.creatures) if (e.alive && e.team === 'wild' && !e.isBoss && exposed(e)) C.hit(X, e, 40, null, {});
    for (const a of X.allies) if (!a.downed && exposed(a)) C.hit(X, a, 18, null, {});
  }

  /* ======================= Mise à jour ======================= */
  Co.update = function (X, dt) {
    const c = X.cosmo;
    if (!c) return;
    const p = X.player;
    // menaces périodiques
    const ev = X.echelon.event && EVENTS[X.echelon.event];
    if (ev && !X.ending) {
      c.eventT -= dt * (X.collapse ? 0.6 : 1);
      if (c.eventT <= 0) {
        c.eventT = U.lerp(ev.every[0], ev.every[1], Math.random());
        RUN[X.echelon.event](X);
      }
    }
    if (c.warn) {
      c.warn.t += dt;
      if (Math.random() < dt * 8) X.cam.shake(2 + c.warn.t * 3);
      if (c.warn.t >= c.warn.dur) {
        c.warn = null;
        X.cam.shake(16);
        AN.Audio.play('explosion');
        for (let i = 0; i < 9; i++) {
          const a = Math.random() * TAU, r = i === 0 ? 0 : 40 + Math.random() * 300;
          C.telegraph(X, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, r: 54, windup: 0.9 + i * 0.12, dmg: 18, team: 'wild', color: '#a48c64', silent: i > 0 });
        }
        const hz = X.biome.hazard;
        if (hz && hz.dps) for (let i = 0; i < 2; i++) {
          const q = nearFloor(X, p.x + (Math.random() - 0.5) * 400, p.y + (Math.random() - 0.5) * 400);
          if (q) C.pool(X, { x: q.x, y: q.y, r: 60, dps: hz.dps, life: 7, color: hz.color, team: 'wild', slow: hz.slow || 0 });
        }
        for (const e of X.creatures) if (e.alive && !e.isBoss && U.dist(e.x, e.y, p.x, p.y) < 500) e.stunT = Math.max(e.stunT || 0, 1.2);
      }
    }
    if (c.flare) {
      c.flare.t += dt;
      if (!c.flare.done && c.flare.t >= c.flare.warn) { c.flare.done = true; resolveFlare(X); }
      if (c.flare.t >= c.flare.warn + 1) c.flare = null;
    }
    if (c.flash > 0) c.flash -= dt;
    c.leapTrail.forEach((q) => { q.t += dt; });
    c.leapTrail = c.leapTrail.filter((q) => q.t < 0.35);

    // effets d'appels et balises
    if (c.ring) {
      const R = c.ring;
      R.t += dt;
      if (R.t >= R.life) c.ring = null;
      else for (let k = 0; k < 6; k++) {
        const a = R.t * 2.6 + (k / 6) * TAU;
        const x = p.x + Math.cos(a) * R.r, y = p.y + Math.sin(a) * R.r;
        for (const e of X.creatures) {
          if (!e.alive || e.team !== 'wild' || e.hidden) continue;
          if (U.dist(e.x, e.y, x, y) < e.r + 22 && (e.ringCd || 0) <= X.time) { e.ringCd = X.time + 0.5; C.hit(X, e, R.dmg, { x, y }, { knock: 240 }); }
        }
      }
    }
    if (c.hole) {
      const H = c.hole;
      H.t += dt;
      for (const e of X.creatures) {
        if (!e.alive || e.team !== 'wild' || e.hidden) continue;
        const d = U.dist(e.x, e.y, H.x, H.y);
        if (d > H.r) continue;
        const a = Math.atan2(H.y - e.y, H.x - e.x);
        if (!e.isBoss) { e.kbx += Math.cos(a) * 900 * dt; e.kby += Math.sin(a) * 900 * dt; }
        if ((e.holeCd || 0) <= X.time) { e.holeCd = X.time + 0.5; C.hit(X, e, H.dps * 0.5, H, {}); }
      }
      if (Math.random() < 0.6) { const a = Math.random() * TAU; FX.stream(H.x + Math.cos(a) * H.r, H.y + Math.sin(a) * H.r, H.x, H.y, Math.random() < 0.5 ? '#8a8aff' : '#ffffff', { life: 0.6, size: 2.5 }); }
      if (H.t >= H.life) {
        for (const e of X.creatures) if (e.alive && e.team === 'wild' && U.dist(e.x, e.y, H.x, H.y) < H.r * 0.6) C.hit(X, e, H.burst, H, { knock: 400 });
        FX.ring(H.x, H.y, '#ffffff', 10, H.r, 0.6, 6);
        c.hole = null;
      }
    }
    c.beacons = c.beacons.filter((b) => {
      b.t += dt;
      for (const e of X.creatures) {
        if (!e.alive || e.team !== 'wild' || e.isBoss || e.hidden) continue;
        const d = U.dist(e.x, e.y, b.x, b.y);
        if (d > b.r) continue;
        const a = Math.atan2(b.y - e.y, b.x - e.x);
        e.kbx += Math.cos(a) * 700 * dt; e.kby += Math.sin(a) * 700 * dt;
        e.slowT = 0.3; e.slowAmt = 0.6;
      }
      return b.t < b.life;
    });

    // formes de capture des boss épuisés
    for (const e of X.creatures) {
      if (!e.alive || !e.boss || !e.boss.form || !e.boss.exhausted) continue;
      const F = e.boss.form;
      F.t += dt;
      if (F.kind === 'scellement') {
        F.ang += dt * 0.55;
        let alive = 0;
        F.cores.forEach((k, i) => {
          if (!k.alive) return;
          alive++;
          const a = F.ang + (i / F.cores.length) * TAU;
          k.x = e.x + Math.cos(a) * (e.r + 95); k.y = e.y + Math.sin(a) * (e.r + 95);
        });
        if (!alive && !F.done) {
          F.done = true;
          FX.ring(e.x, e.y, AN.CYAN, e.r, e.r * 2.5, 0.8, 5);
          AN.Audio.play('rank');
          AN.HUD.toast(e.def.name + ' est scellé. Maintenez ' + AN.Input.label('KeyF') + ' pour le capturer.', 5);
        }
      } else if (F.kind === 'encerclement' && !F.done) {
        const d = U.dist(p.x, p.y, e.x, e.y);
        F.inBand = d >= F.inner && d <= F.outer;
        if (F.inBand) {
          const a = (Math.atan2(p.y - e.y, p.x - e.x) + TAU) % TAU;
          const s = Math.floor(a / (TAU / F.sectors.length));
          if (!F.sectors[s]) { F.sectors[s] = true; AN.Audio.play('pickup', { pitch: 1 + F.sectors.filter(Boolean).length * 0.05 }); }
          if (F.sectors.every(Boolean)) {
            F.done = true;
            FX.ring(e.x, e.y, AN.CYAN, F.inner, F.outer, 0.8, 5);
            AN.Audio.play('rank');
            AN.HUD.toast(e.def.name + ' est encerclée. Maintenez ' + AN.Input.label('KeyF') + ' pour la capturer.', 5);
          }
        }
      }
    }
  };

  /* ======================= Formes de capture ======================= */
  const CORE_DEF = {
    id: 'noyau_scelle', name: 'Noyau de scellement', tier: 0, r: 15, hp: 110, speed: 0, temper: 'passif', move: 'drift', attack: null,
    traits: ['glow'], group: [1, 1], roles: [], biomes: [], resist: 1, armor: 0, rarity: 0, index: 9999, fake: true,
    art: { shape: 'orb', body: '#ffffff', accent: '#2346c8', eye: '#2346c8', eyes: 1, glow: '#2346c8' }, drops: {},
  };

  Co.anchorTier = (X) => AN.Profile.upgradeValue(X.profile, 'ancrage').tier;

  Co.onExhausted = function (X, e) {
    if (!e.def.scale || e.def.tier < 4) return false;
    const form = D.ECHELONS[e.def.scale].form;
    const F = (e.boss.form = { kind: form, done: false, t: 0 });
    if (form === 'ancrage') {
      const a0 = Math.random() * TAU;
      F.anchors = [0, 1, 2].map((k) => {
        const a = a0 + (k / 3) * TAU;
        const q = nearFloor(X, e.x + Math.cos(a) * (e.r + 170), e.y + Math.sin(a) * (e.r + 170)) || { x: e.x + Math.cos(a) * (e.r + 170), y: e.y + Math.sin(a) * (e.r + 170) };
        return { x: q.x, y: q.y, planted: false };
      });
    } else if (form === 'scellement') {
      F.ang = 0;
      F.cores = [0, 1, 2].map(() => {
        const k = AN.Entities.creature(CORE_DEF, e.x, e.y, { threat: X.world.threat });
        k.fixed = true; k.core = true; k.noLoot = true; k.isBoss = false; k.aggroT = 999;
        X.creatures.push(k);
        return k;
      });
    } else if (form === 'encerclement') {
      F.sectors = new Array(12).fill(false);
      F.inner = e.r + 60;
      F.outer = e.r + 300;
    } else if (form === 'synchronisation') {
      F.done = true;
      F.period = 2.4;
      F.window = 0.8;
    }
    const lvl = Co.anchorTier(X);
    const need = lvl < e.def.tier ? ' L’Ancrage de l’Artefact est trop faible pour le retenir (niveau ' + (e.def.tier - 3) + ' requis) : vous pouvez seulement l’achever (' + AN.Input.label('KeyE') + ').' : '';
    AN.HUD.toast(e.def.name + ' est épuisé. ' + D.CAPTURE_FORMS[form].name + ' : ' + D.CAPTURE_FORMS[form].desc + need, 9);
    return true;
  };

  Co.onRecover = function (X, e) {
    const F = e.boss.form;
    if (!F) return;
    if (F.cores) F.cores.forEach((k) => { k.alive = false; });
    e.boss.form = null;
  };

  /** Le boss épuisé peut-il être capturé (forme accomplie et Ancrage suffisant) ? */
  Co.formReady = function (X, e) {
    if (!e.boss || e.def.tier < 4) return true;
    if (Co.anchorTier(X) < e.def.tier) return false;
    return !!(e.boss.form && e.boss.form.done);
  };
  Co.formHint = function (X, e) {
    if (Co.anchorTier(X) < e.def.tier) return 'Ancrage trop faible';
    const F = e.boss.form;
    if (!F) return 'pas encore épuisé';
    if (F.kind === 'ancrage') return 'ancres plantées : ' + F.anchors.filter((a) => a.planted).length + ' / 3';
    if (F.kind === 'scellement') return 'noyaux restants : ' + F.cores.filter((k) => k.alive).length;
    if (F.kind === 'encerclement') return 'anneau parcouru : ' + Math.round((F.sectors.filter(Boolean).length / F.sectors.length) * 100) + ' %';
    return '';
  };
  /** Synchronisation : le rayon avance au rythme du boss, et recule hors du rythme. */
  Co.syncOpen = function (e) {
    const F = e.boss && e.boss.form;
    if (!F || F.kind !== 'synchronisation') return true;
    return (F.t % F.period) < F.window;
  };
  Co.captureMul = function (X, e) {
    const F = e.boss && e.boss.form;
    if (!F || F.kind !== 'synchronisation') return 1;
    return Co.syncOpen(e) ? 2.2 : -0.7;
  };

  /** Interactions : planter les ancres autour d'un Souverain épuisé. */
  Co.interactables = function (X, consider) {
    for (const e of X.creatures) {
      const F = e.alive && e.boss && e.boss.exhausted && e.boss.form;
      if (!F || F.kind !== 'ancrage') continue;
      for (const a of F.anchors) {
        if (a.planted) continue;
        consider(U.dist(a.x, a.y, X.player.x, X.player.y), 70, () => ({ kind: 'anchor', target: a, boss: e, text: 'Planter une ancre de l’Artefact', hold: 1 }));
      }
    }
  };
  Co.plant = function (X, a, e) {
    if (a.planted || !e.alive || !e.boss.exhausted) return;
    a.planted = true;
    FX.ring(a.x, a.y, AN.CYAN, 8, 80, 0.5, 4);
    FX.stream(a.x, a.y, e.x, e.y, AN.CYAN, { life: 0.5, size: 4 });
    AN.Audio.play('capture_ok');
    X.cam.shake(5);
    const F = e.boss.form;
    if (F.anchors.every((q) => q.planted)) {
      F.done = true;
      e.boss.exhaustT = Math.max(e.boss.exhaustT, 12);
      AN.Audio.play('rank');
      AN.HUD.toast(e.def.name + ' est ancré. Maintenez ' + AN.Input.label('KeyF') + ' pour le capturer.', 5);
    }
  };

  /* ======================= Consommables ======================= */
  Co.gravityBeacon = function (X, g) {
    const p = X.player;
    const m = AN.Game.mouseWorld();
    const d = Math.min(300, U.dist(p.x, p.y, m.x, m.y));
    const x = p.x + Math.cos(p.aim) * d, y = p.y + Math.sin(p.aim) * d;
    X.cosmo.beacons.push({ x, y, r: g.radius, t: 0, life: g.gravity });
    FX.ring(x, y, '#7a6f6a', 10, g.radius, 0.6, 4);
    AN.Audio.play('portal', { pitch: 1.4 });
  };

  /* ======================= Appels des géants cosmiques ======================= */
  Co.call = function (X, id, pw, visible) {
    const p = X.player;
    const m = AN.Game.mouseWorld();
    switch (id) {
      case 'seisme_monde':
        X.cam.shake(20);
        C.shockwave(X, { x: p.x, y: p.y, r0: 30, speed: 520, max: 900, width: 70, dmg: 55 * pw, team: 'player', color: '#ff7a3a' });
        visible.forEach((e) => { if (!e.isBoss) e.stunT = Math.max(e.stunT || 0, 2.5); });
        break;
      case 'magma':
        visible.slice(0, 16).forEach((e, k) => C.telegraph(X, { x: e.x, y: e.y, r: 70, windup: 0.7 + k * 0.06, dmg: 80 * pw, team: 'player', silent: k > 0, color: '#ff5a1f',
          onDone: (XX, t) => C.pool(XX, { x: t.x, y: t.y, r: 60, dps: 20 * pw, life: 4, color: '#ff5a1f', team: 'player' }) }));
        break;
      case 'rempart': {
        const b = X.abil.buffs;
        b.shield = 10; b.shieldHp = 140 * pw;
        p.hp = Math.min(p.maxHp, p.hp + 60 * pw);
        X.allies.forEach((a) => { if (!a.downed) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.5); });
        FX.ring(p.x, p.y, '#d8cdb5', 20, 220, 0.8, 6);
        break;
      }
      case 'chant':
        visible.forEach((e) => { e.stunT = Math.max(e.stunT || 0, e.isBoss ? 1.5 : 4); });
        X.allies.forEach((a) => { if (!a.downed) a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.35); });
        p.hp = Math.min(p.maxHp, p.hp + 40 * pw);
        for (let i = 0; i < 3; i++) FX.ring(p.x, p.y, '#9fe8ff', 30 + i * 40, 700, 1.2 + i * 0.2, 3);
        break;
      case 'anneau':
        X.cosmo.ring = { t: 0, life: 9, r: 120, dmg: 35 * pw };
        break;
      case 'impact':
        C.telegraph(X, { x: m.x, y: m.y, r: 190, windup: 1.4, dmg: 230 * pw, team: 'player', color: '#e8e2d6', onDone: (XX) => { XX.cam.shake(20); FX.burst(m.x, m.y, '#e8e2d6', 60, 400, { size: 6 }); } });
        break;
      case 'eruption':
        C.shockwave(X, { x: p.x, y: p.y, r0: 30, speed: 720, max: 1500, width: 100, dmg: 75 * pw, team: 'player', color: '#ffd23a' });
        X.cosmo.flash = 0.5;
        break;
      case 'phenix': {
        const a = p.aim;
        C.telegraph(X, { kind: 'line', x: p.x - Math.cos(a) * 700, y: p.y - Math.sin(a) * 700, angle: a, len: 1400, width: 170, windup: 0.9, dmg: 120 * pw, team: 'player', color: '#ff7a3a' });
        break;
      }
      case 'constellation':
        visible.slice(0, 24).forEach((e, k) => C.telegraph(X, { x: e.x, y: e.y, r: 52, windup: 0.8 + k * 0.07, dmg: 95 * pw, team: 'player', silent: k > 0, color: '#fff0c0', follow: e.isBoss ? null : e }));
        break;
      case 'trou_noir':
        X.cosmo.hole = { x: m.x, y: m.y, r: 280, t: 0, life: 5, dps: 45 * pw, burst: 160 * pw };
        break;
      default: break;
    }
  };

  /* ======================= Motif de boss : attraction ======================= */
  AN.Boss.PATTERNS.pull = function (X, e, p) {
    e.boss.current = { type: 'pull', t: 0, dur: p.dur || 2.5, p };
    FX.ring(e.x, e.y, e.pal.accent, e.r * 3, e.r, 0.6, 4);
    AN.Audio.play('portal', { pitch: 0.6 });
    return { busy: (p.dur || 2.5) + 0.3, cd: 1.6 };
  };
  AN.Boss.EXTRA = AN.Boss.EXTRA || {};
  AN.Boss.EXTRA.pull = function (X, e, cur, dt) {
    e.dvx = e.dvy = 0;
    const pl = X.player;
    if (cur.t < cur.dur) {
      const d = U.dist(e.x, e.y, pl.x, pl.y);
      const a = Math.atan2(e.y - pl.y, e.x - pl.x);
      const f = (cur.p.force || 280) * (1 - Math.min(1, d / 1500));
      if (!pl.leap) { pl.kbx += Math.cos(a) * f * dt * 3; pl.kby += Math.sin(a) * f * dt * 3; }
      if (Math.random() < 0.5) { const b = Math.random() * TAU, r = e.r * 2 + Math.random() * 300; FX.stream(e.x + Math.cos(b) * r, e.y + Math.sin(b) * r, e.x, e.y, e.pal.accent, { life: 0.6, size: 2.5 }); }
      if (d < e.r + pl.r + 10 && (cur.hitT || 0) <= cur.t) { cur.hitT = cur.t + 0.6; C.hit(X, pl, (cur.p.dmg || 12) * e.dmgMul, e, { knock: 380 }); }
    } else e.boss.current = null;
  };

  /* ======================= Dessin ======================= */
  Co.drawUnder = function (ctx, X, t) {
    const wells = X.zone.wells;
    if (wells && wells.length) {
      for (const w of wells) {
        if (!X.cam.visible(w.x, w.y, w.range)) continue;
        ctx.strokeStyle = U.rgba(X.biome.accent, 0.22);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 12]);
        for (let i = 1; i <= 3; i++) {
          const r = ((i / 3 + (t * 0.12) % (1 / 3)) % 1) * w.range;
          ctx.beginPath(); ctx.arc(w.x, w.y, Math.max(4, w.range - r), 0, TAU); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }
    const c = X.cosmo;
    if (!c) return;
    for (const b of c.beacons) {
      ctx.strokeStyle = U.rgba('#b8acf0', 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1 - (b.t * 0.8) % 1 * 0.6), 0, TAU); ctx.stroke();
      ctx.fillStyle = '#7a6f6a'; ctx.beginPath(); ctx.arc(b.x, b.y, 7, 0, TAU); ctx.fill();
    }
    if (c.hole) {
      const H = c.hole;
      const g = ctx.createRadialGradient(H.x, H.y, 4, H.x, H.y, H.r);
      g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.25, 'rgba(20,10,40,0.7)'); g.addColorStop(1, 'rgba(20,10,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(H.x, H.y, H.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(H.x, H.y, 26 + Math.sin(t * 8) * 3, 0, TAU); ctx.stroke();
    }
  };

  Co.drawOver = function (ctx, X, t) {
    const c = X.cosmo;
    if (!c) return;
    const p = X.player;
    // traînée et préparation du saut
    for (const q of c.leapTrail) {
      ctx.fillStyle = U.rgba('#ffffff', 0.5 * (1 - q.t / 0.35));
      ctx.beginPath(); ctx.arc(q.x, q.y, 8 * (1 - q.t / 0.35), 0, TAU); ctx.fill();
    }
    if (c.charge > 0) {
      const k = c.charge;
      const ax = I.axis();
      const dx = ax.x || Math.cos(p.aim), dy = ax.y || Math.sin(p.aim);
      const l = Math.hypot(dx, dy) || 1;
      const dist = 140 + k * 280;
      const tx = p.x + (dx / l) * dist, ty = p.y + (dy / l) * dist;
      const ok = !Z.isSolid(Z.tileAt(X.zone, tx, ty));
      ctx.strokeStyle = ok ? AN.CYAN : AN.STAMP;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo((p.x + tx) / 2 - dy / l * 40, (p.y + ty) / 2 + dx / l * 40 - 30, tx, ty); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(tx, ty, 14, 0, TAU); ctx.stroke();
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
    }
    // anneau de débris
    if (c.ring) {
      for (let k = 0; k < 6; k++) {
        const a = c.ring.t * 2.6 + (k / 6) * TAU;
        const x = p.x + Math.cos(a) * c.ring.r, y = p.y + Math.sin(a) * c.ring.r;
        ctx.fillStyle = '#a8a29a'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    // formes de capture
    for (const e of X.creatures) {
      const F = e.alive && e.boss && e.boss.exhausted && e.boss.form;
      if (!F) continue;
      if (F.kind === 'ancrage') {
        for (const a of F.anchors) {
          ctx.save(); ctx.translate(a.x, a.y);
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(3, 10, 14, 5, 0, 0, TAU); ctx.fill();
          ctx.rotate(Math.PI / 4 + (a.planted ? t : 0));
          ctx.fillStyle = a.planted ? AN.CYAN : '#ffffff'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 2;
          ctx.fillRect(-10, -10, 20, 20); ctx.strokeRect(-10, -10, 20, 20);
          ctx.restore();
          if (a.planted) {
            ctx.strokeStyle = U.rgba(AN.CYAN, 0.7 + Math.sin(t * 10) * 0.2); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(e.x, e.y); ctx.stroke();
          } else {
            ctx.strokeStyle = U.rgba(AN.INK, 0.4); ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
            ctx.beginPath(); ctx.arc(a.x, a.y, 30 + Math.sin(t * 4) * 3, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          }
        }
      } else if (F.kind === 'scellement') {
        for (const k of F.cores) {
          if (!k.alive) continue;
          ctx.strokeStyle = U.rgba(AN.CYAN, 0.6); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(k.x, k.y); ctx.lineTo(e.x, e.y); ctx.stroke();
        }
      } else if (F.kind === 'encerclement') {
        const n = F.sectors.length;
        for (let s = 0; s < n; s++) {
          const a0 = (s / n) * TAU, a1 = ((s + 1) / n) * TAU;
          ctx.fillStyle = F.sectors[s] ? U.rgba(AN.CYAN, 0.22) : U.rgba('#ffffff', 0.06);
          ctx.beginPath(); ctx.arc(e.x, e.y, F.outer, a0, a1); ctx.arc(e.x, e.y, F.inner, a1, a0, true); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = U.rgba(F.done ? AN.CYAN : '#ffffff', 0.7); ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.arc(e.x, e.y, F.inner, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(e.x, e.y, F.outer, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      } else if (F.kind === 'synchronisation') {
        const ph = (F.t % F.period) / F.period;
        const open = Co.syncOpen(e);
        ctx.strokeStyle = U.rgba(open ? AN.CYAN : '#ffffff', open ? 0.9 : 0.35);
        ctx.lineWidth = open ? 6 : 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1.1 + ph * 1.4), 0, TAU); ctx.stroke();
        ctx.strokeStyle = U.rgba(AN.CYAN, 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 1.1, 0, TAU); ctx.stroke();
      }
      // indication sous le boss
      const hint = Co.formHint(X, e);
      if (hint) {
        ctx.save(); ctx.translate(e.x, e.y + e.r + 30);
        ctx.font = '600 13px ' + AN.FONT_UI; ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.strokeText(hint, 0, 0);
        ctx.fillStyle = Co.formReady(X, e) ? AN.CYAN : AN.INK; ctx.fillText(Co.formReady(X, e) ? 'prêt pour la capture (F)' : hint, 0, 0);
        ctx.restore();
      }
    }
  };

  /** Avertissements à l'écran : éruption solaire, séisme, flash. */
  Co.drawScreen = function (ctx, X, t) {
    const c = X.cosmo;
    if (!c) return;
    const W = X.cam.W, H = X.cam.H;
    if (c.flare && !c.flare.done) {
      const left = Math.max(0, c.flare.warn - c.flare.t);
      const a = c.flare.dir;
      const cx = W / 2 + Math.cos(a) * Math.min(W, H) * 0.42, cy = H / 2 + Math.sin(a) * Math.min(W, H) * 0.42;
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.min(W, H) * 0.5);
      g.addColorStop(0, U.rgba('#ffd23a', 0.35 + Math.sin(t * 12) * 0.1)); g.addColorStop(1, U.rgba('#ffd23a', 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + Math.PI);
      ctx.fillStyle = '#ffb02e'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-10, -18); ctx.lineTo(-10, 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.font = '700 16px ' + AN.FONT_UI; ctx.textAlign = 'center'; ctx.fillStyle = AN.INK;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      const txt = 'Éruption dans ' + Math.ceil(left) + ' s : abritez-vous';
      ctx.strokeText(txt, W / 2, H - 150); ctx.fillText(txt, W / 2, H - 150);
    }
    if (c.flash > 0) { ctx.fillStyle = U.rgba('#fff6d0', Math.min(0.85, c.flash)); ctx.fillRect(0, 0, W, H); }
    if (c.warn) {
      ctx.font = '700 16px ' + AN.FONT_UI; ctx.textAlign = 'center'; ctx.fillStyle = AN.INK;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeText(c.warn.text, W / 2, H - 150); ctx.fillText(c.warn.text, W / 2, H - 150);
    }
  };
})();
