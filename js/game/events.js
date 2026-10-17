/* Événements des mondes (1.4) : pendant qu'on explore une zone, il peut s'y
   passer quelque chose. Chaque zone tire son événement à la génération du
   monde (world.zones[i].event, eventAt), ce qui permet au scanner de le
   pressentir. Un événement par zone et par visite au plus. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const C = AN.Combat;
  const TAU = Math.PI * 2;

  const Ev = (AN.Events = {});

  /** Une case de sol libre, à une distance donnée du point (ou null). */
  function floorNear(X, x, y, rmin, rmax, tries = 60) {
    for (let k = 0; k < tries; k++) {
      const a = Math.random() * TAU, r = rmin + Math.random() * (rmax - rmin);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (Z.tileAt(X.zone, px, py) === Z.FLOOR && Z.tileAt(X.zone, px + 20, py) === Z.FLOOR && Z.tileAt(X.zone, px - 20, py) === Z.FLOOR) return { x: px, y: py };
    }
    return null;
  }
  function foreignSpecies(X, tierMax) {
    const here = new Set([X.zone.biome, X.zone.mix].filter(Boolean));
    const list = D.CREATURES.filter((c) => c.tier <= tierMax && !c.scale && !c.unique && c.biomes.length && !c.biomes.some((b) => here.has(b)));
    return list[Math.floor(Math.random() * list.length)];
  }

  const H = {};
  /* ---- Pluie de météores ---- */
  H.meteores = {
    start(X, ev) { ev.next = 1; },
    update(X, ev, dt) {
      ev.next -= dt;
      if (ev.next > 0 || ev.left < 3) return;
      ev.next = 0.75;
      const p = X.player;
      const at = floorNear(X, p.x + (p.vx || 0) * 0.4, p.y + (p.vy || 0) * 0.4, 0, 260, 20);
      if (!at) return;
      C.telegraph(X, { x: at.x, y: at.y, r: 52, windup: 1.3, dmg: 12 + X.world.threat * 2, team: 'wild', color: '#ff7a3a', silent: Math.random() < 0.6,
        onDone: (XX) => {
          FX.burst(at.x, at.y, '#ff7a3a', 24, 260, { size: 4 });
          XX.cam.shake(5);
          if (Math.random() < 0.35) {
            const res = ['cristal', 'obsidienne', 'minerai', 'minerai', 'neant'][Math.floor(Math.random() * (XX.world.threat >= 4 ? 5 : 4))];
            XX.zone.nodes.push({ id: 'meteore' + Math.floor(Math.random() * 1e6), x: at.x, y: at.y, tx: Math.floor(at.x / Z.T), ty: Math.floor(at.y / Z.T), res, amount: D.RESOURCES[res].rarity >= 2 ? 1 : 2, uses: 1, meteor: true });
            FX.text(at.x, at.y - 20, 'fragment de météore', AN.INK, { size: 11 });
          }
        } });
    },
  };
  /* ---- Floraison ---- */
  H.floraison = {
    start(X, ev) {
      let n = 0;
      X.zone.nodes.forEach((nd) => { if (nd.uses <= 0 && !nd.vault && !nd.deep) { nd.uses = 1; nd.amount = 2; n++; FX.burst(nd.x, nd.y, '#c8f26a', 10, 120, { size: 3 }); } });
      const b = D.BIOME[X.zone.biome];
      const res = Object.keys(b.resources);
      for (let k = 0; k < 4; k++) {
        const at = floorNear(X, X.player.x, X.player.y, 120, 520);
        if (!at) continue;
        X.zone.nodes.push({ id: 'fleur' + k + Math.floor(Math.random() * 1e6), x: at.x, y: at.y, tx: Math.floor(at.x / Z.T), ty: Math.floor(at.y / Z.T), res: res[Math.floor(Math.random() * res.length)], amount: 3, uses: 1 });
        FX.burst(at.x, at.y, '#c8f26a', 14, 140, { size: 3 });
        n++;
      }
      ev.msg = n + ' gisements fleurissent.';
    },
  };
  /* ---- Migration ---- */
  H.migration = {
    start(X, ev) {
      const def = foreignSpecies(X, 0) || D.CREATURE.mousseron;
      const zone = X.zone;
      const W = zone.w * Z.T, Hh = zone.h * Z.T;
      // du bord le plus éloigné du joueur vers le bord opposé
      const p = X.player;
      const a = Math.atan2(p.y - Hh / 2, p.x - W / 2) + Math.PI + (Math.random() - 0.5);
      const from = floorNear(X, W / 2 + Math.cos(a) * W * 0.32, Hh / 2 + Math.sin(a) * Hh * 0.32, 0, 200, 80) || { x: zone.entry.x, y: zone.entry.y };
      const to = floorNear(X, W / 2 - Math.cos(a) * W * 0.32, Hh / 2 - Math.sin(a) * Hh * 0.32, 0, 200, 80) || { x: W / 2, y: Hh / 2 };
      ev.herd = [];
      const n = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const v = Math.random() < 0.18 ? 'albinos' : Math.random() < 0.4 ? 'robuste' : 'commun';
        const e = AN.Entities.creature(def, from.x + (Math.random() - 0.5) * 80, from.y + (Math.random() - 0.5) * 80, { threat: X.world.threat, variant: v, hueSeed: Math.floor(Math.random() * 999), foreign: zone.biome });
        e.temper = 'passif';
        e.home = { x: to.x, y: to.y };
        e.migrant = true;
        AN.Physics.collide(zone, e);
        X.creatures.push(e);
        ev.herd.push(e);
      }
      ev.to = to;
      ev.msg = 'Un troupeau de ' + def.name + ' traverse la zone : une espèce venue d’ailleurs, à capturer avant qu’elle ne reparte.';
    },
    update(X, ev) {
      for (const e of ev.herd) {
        if (!e.alive) continue;
        // le troupeau avance : son « chez lui » se déplace devant lui, vers l'autre bord
        const a = Math.atan2(ev.to.y - e.y, ev.to.x - e.x);
        e.home = { x: e.x + Math.cos(a) * 170, y: e.y + Math.sin(a) * 170 };
        if (U.dist(e.x, e.y, ev.to.x, ev.to.y) < 60 || ev.left < 0.5) { e.alive = false; FX.burst(e.x, e.y, '#ffffff', 10, 120, { size: 3 }); }
      }
    },
    end(X, ev) { (ev.herd || []).forEach((e) => { if (e.alive && !e.weak) { e.alive = false; FX.burst(e.x, e.y, '#ffffff', 10, 120, { size: 3 }); } }); },
  };
  /* ---- Éclipse ---- */
  H.eclipse = {
    start(X, ev) {
      X.eventDark = 0.001;
      X.dropMul = 1.5;
      X.creatures.forEach((e) => { if (e.alive && e.team === 'wild' && !e.boss && !e.migrant) { e.frenzy = true; e.aggroT = 40; } });
    },
    update(X, ev, dt) { X.eventDark = U.clamp(Math.min(ev.t / 3, ev.left / 3), 0, 1) * 0.8; },
    end(X) { X.eventDark = 0; X.dropMul = 1; X.creatures.forEach((e) => { if (e.alive) e.frenzy = false; }); },
  };
  /* ---- Faille ---- */
  H.faille = {
    start(X, ev) {
      const at = floorNear(X, X.player.x, X.player.y, 220, 380) || floorNear(X, X.player.x, X.player.y, 120, 600);
      if (!at) { ev.left = 0; return; }
      ev.rift = at;
      ev.waves = 2;
      ev.next = 1.2;
      ev.spawned = [];
    },
    update(X, ev, dt) {
      if (!ev.rift) return;
      ev.next -= dt;
      if (ev.waves > 0 && ev.next <= 0) {
        ev.waves--;
        ev.next = 10;
        const def = foreignSpecies(X, ev.waves === 0 ? 1 : 0);
        if (!def) return;
        for (let i = 0; i < 3; i++) {
          const e = AN.Entities.creature(def, ev.rift.x + (Math.random() - 0.5) * 60, ev.rift.y + (Math.random() - 0.5) * 60, { threat: X.world.threat, foreign: X.zone.biome });
          e.temper = 'agressif'; e.aggroT = 30; e.home = { x: ev.rift.x, y: ev.rift.y };
          AN.Physics.collide(X.zone, e);
          X.creatures.push(e);
          ev.spawned.push(e);
          FX.burst(e.x, e.y, AN.CYAN, 12, 160, { size: 3 });
        }
        AN.Audio.play('portal');
      }
      if (ev.waves === 0 && ev.t > 3 && ev.spawned.every((e) => !e.alive)) ev.left = Math.min(ev.left, 0.01);
    },
    end(X, ev) {
      if (!ev.rift) return;
      FX.ring(ev.rift.x, ev.rift.y, AN.CYAN, 60, 10, 0.6, 5);
      if (ev.spawned.every((e) => !e.alive)) {
        X.zone.nodes.push({ id: 'faille' + Math.floor(Math.random() * 1e6), x: ev.rift.x, y: ev.rift.y, tx: Math.floor(ev.rift.x / Z.T), ty: Math.floor(ev.rift.y / Z.T), res: 'essence', amount: 1, uses: 1 });
        ev.msg2 = 'La faille se referme et laisse une essence.';
      } else ev.msg2 = 'La faille se referme.';
    },
    draw(ctx, X, ev, t) {
      if (!ev.rift) return;
      const k = U.clamp(Math.min(ev.t / 1, ev.left / 1), 0, 1);
      ctx.save(); ctx.translate(ev.rift.x, ev.rift.y); ctx.rotate(0.4);
      ctx.fillStyle = U.rgba('#0b1030', 0.9 * k);
      ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.5, 14 * k + Math.sin(t * 6) * 2 * k), Math.max(0.5, 52 * k), 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = U.rgba(AN.CYAN, k); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    },
  };
  /* ---- Écho d'un monde ---- */
  H.echo = {
    start(X, ev) {
      const at = floorNear(X, X.player.x, X.player.y, 200, 420);
      if (!at) { ev.left = 0; return; }
      const id = D.FOUND_STRUCTURES[Math.floor(Math.random() * D.FOUND_STRUCTURES.length)];
      X.eventStruct = { id, x: at.x, y: at.y, ghost: true, searched: false, taken: false, zi: X.zi, fade: 0 };
      ev.msg = 'Le fantôme d’une structure apparaît : ' + D.STRUCTURES[id].name + '. Il s’effacera dans une minute.';
    },
    update(X, ev) { if (X.eventStruct) X.eventStruct.fade = U.clamp(Math.min(ev.t / 1.5, ev.left / 3), 0, 1); },
    end(X) { if (X.eventStruct && !X.eventStruct.taken) X.eventStruct = null; },
  };
  Ev.HANDLERS = H;

  /* ======================= Cycle ======================= */
  Ev.onEnterZone = function (X) {
    X.event = null;
    X.eventDark = 0; X.dropMul = 1;
    if (X.world.tutorial) return;
    const spec = AN.Expedition.zoneSpec(X, X.zi);
    X.eventsDone = X.eventsDone || new Set();
    if (!spec || !spec.event || X.eventsDone.has(X.zi) || !D.WORLD_EVENTS[spec.event]) return;
    X.eventPending = { id: spec.event, at: X.time + (spec.eventAt || 30), zi: X.zi };
  };

  Ev.update = function (X, dt) {
    if (X.eventPending && X.eventPending.zi === X.zi && X.time >= X.eventPending.at && !X.collapse && !X.ending) {
      const id = X.eventPending.id;
      X.eventPending = null;
      X.eventsDone.add(X.zi);
      Ev.start(X, id);
    }
    const ev = X.event;
    if (!ev) return;
    ev.t += dt;
    ev.left -= dt;
    const h = H[ev.id];
    if (h.update) h.update(X, ev, dt);
    if (ev.left <= 0 || X.collapse) Ev.stop(X);
  };

  Ev.start = function (X, id) {
    const def = D.WORLD_EVENTS[id];
    const ev = { id, t: 0, left: def.dur, dur: def.dur };
    X.event = ev;
    H[id].start(X, ev);
    AN.Audio.play(def.good ? 'rank' : 'boss_roar');
    AN.HUD.toast(def.name + ' ! ' + (ev.msg || def.desc), 7);
    X.profile.stats.events = (X.profile.stats.events || 0) + 1;
  };
  Ev.stop = function (X) {
    const ev = X.event;
    if (!ev) return;
    const h = H[ev.id];
    if (h.end) h.end(X, ev);
    if (ev.msg2) AN.HUD.toast(ev.msg2, 4);
    X.event = null;
  };

  Ev.drawWorld = function (ctx, X, t) {
    const ev = X.event;
    if (ev && H[ev.id].draw) H[ev.id].draw(ctx, X, ev, t);
  };

  /** Ligne d'affichage tête haute. */
  Ev.hudText = function (X) {
    const ev = X.event;
    if (!ev) return '';
    return D.WORLD_EVENTS[ev.id].name + ' · ' + Math.max(0, Math.ceil(ev.left)) + ' s';
  };
})();
