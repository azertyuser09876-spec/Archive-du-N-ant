/* Civilisations en expédition : village, habitants, dialogues, choix,
   rassemblement et embarquement, arches, voleurs, iconoclastes,
   et ce que le monde garde en mémoire de vos choix. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const Cv = (AN.Civ = {});

  /* ======================= Réputation ======================= */
  Cv.moral = (p) => (p.moral = p.moral || { sauves: 0, abandonnes: 0, contraints: 0, massacres: 0, combattus: 0, pillages: 0, adores: 0, evades: 0 });
  Cv.reputation = function (p) {
    const m = Cv.moral(p);
    const savior = m.sauves + m.evades * 1.5;
    const terror = m.abandonnes * 0.5 + m.contraints + m.massacres * 2 + m.pillages * 3;
    const worship = m.adores;
    if (savior + terror + worship < 6) return 'inconnu';
    if (m.pillages >= 2 && m.pillages * 3 >= terror * 0.5) return 'pillard';
    if (worship >= 15 && worship > savior) return 'dieu';
    if (terror > savior * 2) return 'fleau';
    if (savior > terror * 1.5) return 'arche';
    return 'collecteur';
  };
  Cv.peopleMemo = (p, id) => {
    p.peoples = p.peoples || {};
    return (p.peoples[id] = p.peoples[id] || { met: 0, saved: 0, forced: 0, abandoned: 0, killed: 0, escaped: 0 });
  };

  /* ======================= Habitants ======================= */
  const defs = new Map();
  /** Fausse « espèce » d'un habitant, pour réutiliser le moteur des créatures. */
  Cv.def = function (pid, role) {
    const key = pid + ':' + role;
    let d = defs.get(key);
    if (d) return d;
    const P = D.PEOPLE[pid], R = D.CIV_ROLES[role];
    d = {
      id: 'npc_' + pid + '_' + role, name: role === 'leader' ? P.sing + ', chef' : P.sing, tier: role === 'leader' ? 1 : 0,
      biomes: P.biomes, r: R.r, hp: R.hp, speed: R.speed, temper: 'passif', move: 'walk', attack: R.attack || null,
      traits: [], group: [1, 1], roles: [], resist: role === 'leader' ? 1.6 : 1, rarity: 0, armor: role === 'guard' ? 0.1 : 0, index: 9000,
      art: { shape: 'npc', people: pid, role, body: P.body.cloth, accent: P.body.trim, eye: P.body.mark },
      drops: { [P.likes]: role === 'leader' ? 4 : 1 }, npc: true, desc: P.desc,
    };
    defs.set(key, d);
    return d;
  };

  function mkNpc(X, zone, role, x, y, team) {
    const civ = X.civ;
    const e = AN.Entities.creature(Cv.def(civ.people, role), x, y, { team, threat: X.world.threat });
    e.npc = { role, mode: 'idle' };
    e.home = { x: zone.village.x, y: zone.village.y };
    e.temper = team === 'wild' ? (role === 'villager' ? 'craintif' : 'territorial') : 'passif';
    e.fighter = team === 'wild' && role !== 'villager' && role !== 'thief';
    AN.Physics.collide(zone, e);
    return e;
  }

  /** Peuple un village quand sa zone est générée. */
  Cv.spawnVillage = function (X, zone) {
    const civ = X.civ;
    if (!civ || !zone.village || civ.zone !== zone.index) return;
    // (reprise d'une expédition) un village parti ou détruit ne revient pas
    if (civ.state === 'gone' || civ.state === 'destroyed') return;
    const rng = AN.RNG.from(civ.seed, 'habitants');
    const v = zone.village;
    const hostile = D.ATTITUDES[civ.attitude].hostile;
    const team = hostile ? 'wild' : 'civil';
    const spot = () => {
      for (let k = 0; k < 30; k++) {
        const a = rng.float(0, TAU), r = rng.float(0, v.r * 0.55);
        const x = v.x + Math.cos(a) * r, y = v.y + Math.sin(a) * r;
        if (!Z.isSolid(Z.tileAt(zone, x, y))) return { x, y };
      }
      return { x: v.x, y: v.y };
    };
    const villagers = Math.min(civ.n, 22);
    for (let i = 0; i < villagers; i++) { const s = spot(); X.civils.push(mkNpc(X, zone, 'villager', s.x, s.y, 'civil')); }
    if (hostile) X.civils.forEach((e) => Cv.toWild(X, e, 'craintif'));
    const guards = hostile ? 3 + Math.floor(X.world.threat / 2) : civ.attitude === 'fiers' ? 2 : civ.attitude === 'evades' ? 2 : 1;
    for (let i = 0; i < guards; i++) {
      const s = spot();
      const g = mkNpc(X, zone, i % 3 === 2 ? 'archer' : 'guard', s.x, s.y, team);
      (team === 'wild' ? X.creatures : X.civils).push(g);
    }
    if (civ.attitude === 'voleurs') {
      for (let i = 0; i < 2 + (X.world.threat > 3 ? 1 : 0); i++) { const s = spot(); const th = mkNpc(X, zone, 'thief', s.x, s.y, 'civil'); X.civils.push(th); }
    }
    const L = mkNpc(X, zone, 'leader', v.x, v.y, team);
    L.nickname = civ.leader + ', ' + civ.title;
    if (team === 'wild') { L.fighter = true; X.creatures.push(L); } else X.civils.push(L);
    civ.leaderEnt = L;
    if (civ.attitude === 'evades') {
      const ark = v.buildings.find((b) => b.kind === 'ark');
      if (ark) civ.arkPos = { x: ark.x, y: ark.y };
    }
  };

  /** Fait passer un habitant dans le camp « sauvage » (capturable, attaquable). */
  Cv.toWild = function (X, e, temper) {
    e.team = 'wild';
    e.temper = temper || 'craintif';
    X.civils = X.civils.filter((c) => c !== e);
    if (!X.creatures.includes(e)) X.creatures.push(e);
  };

  Cv.leader = (X) => (X.civ && X.civ.leaderEnt && X.civ.leaderEnt.alive ? X.civ.leaderEnt : null);
  Cv.inVillageZone = (X) => !!(X.civ && X.zone && X.zone.village && X.civ.zone === X.zi);
  Cv.villagersAlive = (X) => X.civils.filter((c) => c.alive && c.npc && (c.npc.role === 'villager' || c.npc.role === 'leader') && !c.npc.boarded);

  /* ======================= Comportement ======================= */
  function goTo(X, e, tx, ty, sp, field) {
    let dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    if (field && d > 60) {
      const f = AN.Physics.flowDir(X.zone, field, e.x, e.y);
      if (f) { dx = f.x; dy = f.y; }
    }
    e.dvx = dx * sp; e.dvy = dy * sp;
    return d;
  }
  function wanderNear(e, dt, cx, cy, R, sp) {
    e.wanderT -= dt;
    if (!e.wanderTo || e.wanderT <= 0) {
      const a = Math.random() * TAU, r = Math.random() * R;
      e.wanderTo = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
      e.wanderT = 2 + Math.random() * 4;
      e.idleT = Math.random() < 0.5 ? 1 + Math.random() * 3 : 0;
    }
    if (e.idleT > 0) { e.idleT -= dt; e.dvx = e.dvy = 0; return; }
    const dx = e.wanderTo.x - e.x, dy = e.wanderTo.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) { e.dvx = e.dvy = 0; return; }
    e.dvx = (dx / d) * sp; e.dvy = (dy / d) * sp;
  }

  /** Habitants non combattants (et combattants pacifiques). */
  Cv.ai = function (X, e, dt) {
    const civ = X.civ;
    const n = e.npc;
    const v = X.zone.village || { x: e.homeX || e.x, y: e.homeY || e.y, r: 240 };
    const sp = e.speed * (e.slowT > 0 ? 1 - e.slowAmt : 1);
    const col = X.collapse;
    // Une créature sauvage menace l'habitant : il s'éloigne.
    if (n.mode !== 'thief' && n.mode !== 'zealot') {
      let threat = null, td = 130;
      for (const c of X.creatures) {
        if (!c.alive || c.def.npc || c.hidden) continue;
        const d = U.dist(c.x, c.y, e.x, e.y);
        if (d < td && (c.state === 'attack' || c.aggroT > 0)) { td = d; threat = c; }
      }
      if (threat) {
        const a = Math.atan2(e.y - threat.y, e.x - threat.x);
        e.dvx = Math.cos(a) * sp * 1.1; e.dvy = Math.sin(a) * sp * 1.1;
        return;
      }
    }
    if (e.team === 'wild' && n.role === 'villager') {
      // contraints ou habitants d'un peuple hostile : ils fuient le joueur
      const p = X.player;
      if (U.dist(p.x, p.y, e.x, e.y) < 220) { const a = Math.atan2(e.y - p.y, e.x - p.x); e.dvx = Math.cos(a) * sp; e.dvy = Math.sin(a) * sp; }
      else wanderNear(e, dt, v.x, v.y, v.r * 0.8, sp * 0.4);
      return;
    }
    switch (n.mode) {
      case 'rally': {
        const pl = civ.rallyPlate;
        if (col) { n.mode = 'board'; return; }
        const d = goTo(X, e, pl.x, pl.y, sp * 0.9, civ.rallyFlow);
        if (d < Z.T * 2.2) n.mode = 'waiting';
        e.exposed = true;
        break;
      }
      case 'waiting': {
        if (col) { n.mode = 'board'; return; }
        wanderNear(e, dt, civ.rallyPlate.x, civ.rallyPlate.y, Z.T * 2, sp * 0.3);
        e.exposed = true;
        break;
      }
      case 'board': {
        if (!col) { n.mode = 'waiting'; return; }
        if (col.selection && col.selection.villagers === false) { wanderNear(e, dt, civ.rallyPlate.x, civ.rallyPlate.y, Z.T * 2, sp * 0.3); return; }
        const d = goTo(X, e, col.plate.x, col.plate.y, sp * 1.1, civ.portalFlow);
        e.exposed = true;
        if (d < col.portalR * 0.8) {
          n.boarded = true;
          e.alive = false;
          civ.boarded = (civ.boarded || 0) + 1;
          FX.burst(e.x, e.y, '#ffffff', 10, 120, { size: 3 });
          FX.stream(e.x, e.y, col.plate.x, col.plate.y, AN.CYAN, { life: 0.4, size: 3 });
        }
        break;
      }
      case 'thief': {
        if (!col) { wanderNear(e, dt, v.x, v.y, v.r * 0.6, sp * 0.3); return; }
        e.aggroT = Math.max(e.aggroT, 1); // démasqué : les compagnons le prennent en chasse
        const d = goTo(X, e, col.plate.x, col.plate.y, sp, civ.portalFlow);
        if (d < col.portalR) {
          e.dvx = e.dvy = 0;
          n.steal = (n.steal || 0) + dt;
          if (Math.random() < dt * 12) FX.add({ kind: 'dot', x: e.x, y: e.y, vx: (col.plate.x - e.x), vy: (col.plate.y - e.y), color: AN.STAMP, life: 0.4, size: 2.5 });
          if (n.steal >= 2.2) Cv.steal(X, e);
        } else n.steal = 0;
        break;
      }
      case 'zealot': {
        if (!col) return;
        e.aggroT = Math.max(e.aggroT, 1);
        const d = goTo(X, e, col.plate.x, col.plate.y, sp * 1.05, civ.portalFlow);
        if (d < col.portalR) {
          e.dvx = e.dvy = 0;
          col.integrity = Math.max(0, col.integrity - 7 * dt);
          if (Math.random() < dt * 8) FX.add({ kind: 'spark', x: e.x, y: e.y, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, color: '#ffffff', life: 0.3, size: 2 });
        }
        break;
      }
      case 'ark': {
        const a = civ.arkPos;
        wanderNear(e, dt, a.x, a.y, 70, sp * 0.4);
        break;
      }
      default:
        if (n.governor) wanderNear(e, dt, v.x, v.y + Z.T * 1.9, Z.T * 0.8, sp * 0.3); // le gouverneur d'une ville reste près de la fontaine (1.13)
        else wanderNear(e, dt, v.x, v.y, v.r * 0.75, sp * 0.3);
    }
  };

  /* ======================= Mise à jour ======================= */
  Cv.update = function (X, dt) {
    const civ = X.civ;
    if (!civ) return;
    if (X.civils.some((c) => !c.alive)) X.civils = X.civils.filter((c) => c.alive);
    if (civ.ark && civ.ark.state === 'defend' && Cv.inVillageZone(X)) arkUpdate(X, dt);
    if (civ.ark && civ.ark.state === 'launch') {
      civ.ark.launchT += dt;
      if (civ.ark.launchT > 3) civ.ark.state = 'gone';
    }
    // Les dévots apportent leurs offrandes à la première rencontre.
    const L = Cv.leader(X);
    if (L && !civ.met && Cv.inVillageZone(X) && U.dist(L.x, L.y, X.player.x, X.player.y) < 340 && !D.ATTITUDES[civ.attitude].hostile) {
      if (!civ.hailed) { civ.hailed = true; FX.text(L.x, L.y - L.r - 18, civ.attitude === 'devots' ? 'Le Blanc est là !' : 'Voyageur !', AN.INK, { size: 13, bold: true, life: 2 }); }
    }
  };

  /* ---------- l'arche ---------- */
  function arkUpdate(X, dt) {
    const civ = X.civ;
    const A = civ.ark;
    A.t += dt;
    A.waveT -= dt;
    if (A.waveT <= 0 && A.t < A.dur - 4) {
      A.waveT = 7;
      const pool = AN.WorldGen.pool(X.zone.biome).filter((d) => d.attack);
      const n = 2 + Math.floor(X.world.threat / 2) + Math.floor(A.t / 15);
      for (let i = 0; i < n && pool.length; i++) {
        const a = Math.random() * TAU;
        const x = A.ent.x + Math.cos(a) * 480, y = A.ent.y + Math.sin(a) * 480;
        if (Z.isSolid(Z.tileAt(X.zone, x, y))) continue;
        const e = AN.Entities.creature(pool[Math.floor(Math.random() * pool.length)], x, y, { threat: X.world.threat, rule: X.world.rule });
        e.temper = 'agressif'; e.aggroT = 30; e.noLoot = Math.random() < 0.5; e.arkHunter = true;
        X.creatures.push(e);
        FX.burst(x, y, e.pal.body, 8, 100, { size: 3 });
      }
    }
    if (A.t >= A.dur && A.ent.alive) Cv.launchArk(X);
  }

  Cv.launchArk = function (X) {
    const civ = X.civ;
    const A = civ.ark;
    A.state = 'launch';
    A.launchT = 0;
    A.ent.alive = false;
    const left = Cv.villagersAlive(X).length;
    X.civils.forEach((c) => { if (c.npc && (c.npc.role === 'villager' || c.npc.role === 'leader' || c.npc.role === 'guard')) { c.alive = false; FX.stream(c.x, c.y, A.ent.x, A.ent.y, '#ffffff', { life: 0.5, size: 3 }); } });
    civ.escaped = Math.max(left, Math.round(civ.n * 0.8));
    X.cam.shake(10);
    AN.Audio.play('portal');
    FX.ring(A.ent.x, A.ent.y, '#ffffff', 20, 400, 1.4, 6);
    const P = D.PEOPLE[civ.people];
    AN.Combat.drop(X, A.ent.x, A.ent.y, { [P.likes]: 8, essence: 1 }, 1);
    AN.HUD.toast('L’arche des ' + P.name.replace(/^les /, '') + ' s’arrache au monde. Ils partent par leurs propres moyens, et vous laissent leurs présents.', 7);
  };

  Cv.arkDestroyed = function (X) {
    const civ = X.civ;
    if (!civ || !civ.ark) return;
    civ.ark.state = 'destroyed';
    civ.ark.ent.alive = false;
    FX.burst(civ.ark.ent.x, civ.ark.ent.y, '#8a6a48', 50, 300, { size: 5 });
    X.cam.shake(12);
    AN.Audio.play('explosion');
    civ.attitude = 'suppliants';
    X.civils.forEach((c) => { if (c.npc) c.npc.mode = 'idle'; });
    AN.HUD.toast('L’arche est détruite. Les ' + D.PEOPLE[civ.people].name.replace(/^les /, '') + ' n’ont plus que vous.', 6);
    const z = X.zone.village && X.zone.village.buildings.find((b) => b.kind === 'ark');
    if (z) z.broken = true;
  };

  /* ======================= Dialogues et choix ======================= */
  Cv.line = function (X, list) {
    const civ = X.civ;
    const L = list[(civ.seed >>> 3) % list.length];
    return L.replace('{peuple}', D.PEOPLE[civ.people].name).replace('{chef}', civ.leader).replace('{monde}', X.world.code);
  };

  /** Clés de la scène de dialogue selon l'attitude affichée. */
  Cv.talk = function (X) {
    const civ = X.civ;
    const L = Cv.leader(X);
    if (!civ || !L) return;
    if (!civ.met) {
      civ.met = true;
      const memo = Cv.peopleMemo(X.profile, civ.people);
      memo.met++;
      if (civ.attitude === 'devots' && !civ.gifted) {
        civ.gifted = true;
        const P = D.PEOPLE[civ.people];
        AN.Combat.drop(X, L.x, L.y, { [P.likes]: 6, seve: 2 }, 1);
      }
    }
    AN.UI.civDialogue(X);
  };

  /** Le plateau d'extraction le plus proche du village. */
  Cv.nearestPlate = function (X) {
    const v = X.zone.village;
    let best = X.zone.plates[0], bd = 1e9;
    X.zone.plates.forEach((p) => { const d = U.dist(p.x, p.y, v.x, v.y); if (d < bd) { bd = d; best = p; } });
    return best;
  };

  Cv.startRally = function (X) {
    const civ = X.civ;
    civ.state = 'rally';
    civ.rallyPlate = Cv.nearestPlate(X);
    civ.rallyFlow = AN.Physics.flowField(X.zone, Math.floor(civ.rallyPlate.x / Z.T), Math.floor(civ.rallyPlate.y / Z.T), 260);
    X.civils.forEach((c) => { if (c.npc && c.npc.role !== 'thief') c.npc.mode = 'rally'; });
    AN.HUD.toast('Les ' + D.PEOPLE[civ.people].name.replace(/^les /, '') + ' se rassemblent près de la plaque blanche la plus proche. Protégez-les jusqu’au transfert.', 6);
  };

  Cv.respect = function (X) { X.civ.state = 'respected'; };

  /** Tentative de persuasion : un présent pris dans le sac. */
  Cv.persuadeCost = (X) => ({ [D.PEOPLE[X.civ.people].likes]: Math.max(3, Math.round(X.civ.n / 3)) });
  Cv.persuade = function (X) {
    const civ = X.civ;
    const cost = Cv.persuadeCost(X);
    const res = Object.keys(cost)[0];
    if ((X.bag[res] || 0) < cost[res]) return 'manque';
    X.bag[res] -= cost[res];
    if (!X.bag[res]) delete X.bag[res];
    const rep = Cv.reputation(X.profile);
    const chance = 0.55 + (rep === 'arche' ? 0.2 : rep === 'fleau' ? -0.2 : 0) + (civ.attitude === 'hostiles' ? -0.25 : 0);
    if (Math.random() < chance) { civ.attitude = 'suppliants'; civ.persuaded = true; return 'ok'; }
    civ.state = 'refused-gift';
    return 'refus';
  };

  /** Emmener de force : les habitants deviennent capturables, la garde attaque. */
  Cv.force = function (X) {
    const civ = X.civ;
    civ.state = 'forced';
    civ.forced = true;
    X.civils.slice().forEach((e) => {
      if (!e.npc) return;
      if (e.npc.role === 'villager' || e.npc.role === 'thief') { Cv.toWild(X, e, 'craintif'); e.weak = true; e.hp = Math.min(e.hp, e.maxHp * 0.3); }
      else { Cv.toWild(X, e, 'agressif'); e.fighter = true; e.aggroT = 20; }
    });
    AN.HUD.toast('Les habitants fuient. Leur garde se dresse contre vous. Le rayon de capture fonctionne sur eux.', 6);
  };

  /** Chef hostile vaincu : il se rend. */
  Cv.spare = function (X) {
    const civ = X.civ;
    civ.attitude = 'fiers';
    civ.state = 'spared';
    X.creatures.slice().forEach((e) => {
      if (!e.def.npc) return;
      e.team = 'civil'; e.fighter = false; e.temper = 'passif'; e.weak = false; e.aggroT = 0;
      e.npc.mode = 'idle';
      X.creatures = X.creatures.filter((c) => c !== e);
      X.civils.push(e);
    });
    AN.HUD.toast('Vous les épargnez. Ils baissent les armes, sans un mot.', 5);
  };

  Cv.helpArk = function (X) {
    const civ = X.civ;
    const pos = civ.arkPos || { x: X.zone.village.x, y: X.zone.village.y };
    civ.arkPos = pos;
    civ.state = 'ark';
    const ent = { kind: 'ark', team: 'civil', x: pos.x, y: pos.y, r: 44, hp: 520 + X.world.threat * 60, maxHp: 520 + X.world.threat * 60, alive: true, exposed: true, def: { traits: [], name: 'Arche', npc: true }, flash: 0, kbx: 0, kby: 0 };
    civ.ark = { ent, t: 0, dur: 50, waveT: 3, state: 'defend' };
    X.civils.push(ent);
    X.civils.forEach((c) => { if (c.npc && c.npc.role === 'villager') c.npc.mode = 'ark'; });
    AN.HUD.toast('L’arche décolle dans 50 secondes. Les bêtes accourent : tenez bon.', 6);
  };

  Cv.takeArk = function (X) {
    const civ = X.civ;
    if (X.cargoUsed() + D.ARK_WEIGHT > X.cargoCap) return false;
    civ.state = 'arkTaken';
    X.cargo.push({ ark: true, people: civ.people });
    const b = X.zone.village.buildings.find((bb) => bb.kind === 'ark');
    if (b) {
      b.taken = true;
      for (let y = b.ty; y < b.ty + b.h; y++) for (let x = b.tx; x < b.tx + b.w; x++) X.zone.grid[y * X.zone.w + x] = Z.FLOOR;
      AN.FX.ring(b.x, b.y, AN.CYAN, 60, 10, 0.6, 4);
    }
    Cv.force(X);
    AN.HUD.toast('L’arche disparaît dans la soute. Ses bâtisseurs n’ont plus aucun moyen de fuir.', 6);
    return true;
  };

  /* ---------- commerce ---------- */
  Cv.deals = function (X) {
    const civ = X.civ;
    if (civ.deals) return civ.deals;
    const rng = AN.RNG.from(civ.seed, 'commerce');
    const b = D.BIOME[X.zone.biome];
    const common = Object.keys(b.resources).filter((r) => D.RESOURCES[r].rarity === 0);
    const rare = Object.keys(b.resources).filter((r) => D.RESOURCES[r].rarity >= 1);
    const ask = (n) => ({ [rng.pick(common.length ? common : ['fibre'])]: n });
    const deals = [];
    deals.push({ give: ask(rng.int(5, 8)), get: { res: { [rare.length ? rng.pick(rare) : 'cristal']: rng.int(1, 2) } } });
    deals.push({ give: ask(rng.int(4, 6)), get: { item: 'baume_seve', n: 2 } });
    const pool = AN.WorldGen.pool(b.id).filter((c) => c.tier === 0);
    if (pool.length) deals.push({ give: ask(rng.int(8, 12)), get: { egg: rng.pick(pool).id } });
    deals.push({ give: ask(rng.int(10, 14)), get: { res: { essence: 1 } } });
    civ.deals = deals;
    return deals;
  };
  Cv.trade = function (X, deal) {
    if (deal.done) return 'fait';
    for (const k in deal.give) if ((X.bag[k] || 0) < deal.give[k]) return 'manque';
    if (deal.get.egg && X.cargoUsed() + 1 > X.cargoCap) return 'soute';
    for (const k in deal.give) { X.bag[k] -= deal.give[k]; if (!X.bag[k]) delete X.bag[k]; }
    const g = deal.get;
    if (g.res) for (const k in g.res) X.bag[k] = (X.bag[k] || 0) + g.res[k];
    if (g.item) { const c = X.consumables.find((cc) => cc.id === g.item); if (c) c.n += g.n; else if (X.consumables.length < D.CONSUMABLE_SLOTS) X.consumables.push({ id: g.item, n: g.n, start: 0 }); AN.HUD.refreshConsumables(X); }
    if (g.egg) X.cargo.push({ egg: true, species: g.egg, variant: 'commun', hueSeed: 7, zone: X.zi });
    deal.done = true;
    X.civ.traded = true;
    AN.Audio.play('craft');
    return 'ok';
  };

  /* ======================= Pendant l'effondrement ======================= */
  Cv.collapseStart = function (X) {
    const civ = X.civ;
    if (!civ) return;
    const col = X.collapse;
    const here = Cv.inVillageZone(X);
    if (here) civ.portalFlow = AN.Physics.flowField(X.zone, Math.floor(col.plate.x / Z.T), Math.floor(col.plate.y / Z.T), 260);
    // Les marchands révèlent leur jeu.
    if (civ.attitude === 'voleurs' && (civ.met || civ.traded)) {
      civ.revealed = true;
      let thieves = X.civils.filter((c) => c.npc && c.npc.role === 'thief');
      if (!here) {
        thieves = [];
        const g = X.zone.gates[0] || X.zone.plates[0];
        for (let i = 0; i < 2; i++) {
          const e = AN.Entities.creature(Cv.def(civ.people, 'thief'), g.x + (Math.random() - 0.5) * 60, g.y + (Math.random() - 0.5) * 60, { team: 'civil', threat: X.world.threat });
          e.npc = { role: 'thief', mode: 'thief' };
          X.civils.push(e);
          thieves.push(e);
        }
        if (!civ.portalFlow) civ.portalFlow = AN.Physics.flowField(X.zone, Math.floor(col.plate.x / Z.T), Math.floor(col.plate.y / Z.T), 260);
      }
      thieves.forEach((t) => { Cv.toWild(X, t, 'craintif'); t.npc.mode = 'thief'; t.revealed = true; t.exposed = true; });
      if (thieves.length) AN.HUD.toast('Les marchands courent vers le portail : ils veulent l’Artefact ! Arrêtez-les.', 6);
    }
    // Les iconoclastes attaquent le portail.
    if (civ.attitude === 'iconoclastes' && !civ.spared) {
      col.integrity = 100;
      if (!civ.portalFlow) civ.portalFlow = AN.Physics.flowField(X.zone, Math.floor(col.plate.x / Z.T), Math.floor(col.plate.y / Z.T), 260);
      const n = 3 + Math.floor(X.world.threat / 2);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const x = col.plate.x + Math.cos(a) * 520, y = col.plate.y + Math.sin(a) * 520;
        if (Z.isSolid(Z.tileAt(X.zone, x, y))) continue;
        const e = AN.Entities.creature(Cv.def(civ.people, 'guard'), x, y, { team: 'wild', threat: X.world.threat });
        e.npc = { role: 'guard', mode: 'zealot' };
        e.fighter = false;
        e.temper = 'agressif';
        X.creatures.push(e);
      }
      AN.HUD.toast('Des iconoclastes surgissent : ils s’en prennent au portail.', 5);
    }
  };

  Cv.steal = function (X, e) {
    e.alive = false;
    FX.burst(e.x, e.y, AN.STAMP, 20, 200, { size: 3 });
    const loot = X.cargo.filter((c) => !c.ark).sort((a, b) => AN.Profile.cargoWeight(b) - AN.Profile.cargoWeight(a))[0];
    if (loot) {
      X.cargo.splice(X.cargo.indexOf(loot), 1);
      AN.HUD.toast('Un voleur a plongé dans le portail avec ' + AN.Profile.cargoLabel(loot) + ' !', 6);
    } else {
      let taken = 0;
      for (const k in X.bag) { const n = Math.ceil(X.bag[k] * 0.35); X.bag[k] -= n; taken += n; if (!X.bag[k]) delete X.bag[k]; }
      AN.HUD.toast('Un voleur a plongé dans le portail avec ' + taken + ' ressources de votre sac !', 6);
    }
    AN.Audio.play('capture_fail');
  };

  /* ======================= Morts et captures ======================= */
  Cv.onKilled = function (X, e, src) {
    const civ = X.civ;
    if (!civ) return;
    const byPlayer = src && (src.kind === 'player' || src.team === 'player' || src.team === 'ally');
    civ.killed = (civ.killed || 0) + 1;
    if (byPlayer) {
      const victim = e.npc && (e.npc.role === 'villager' || (e.npc.role === 'thief' && !e.revealed));
      if (victim) civ.massacred = (civ.massacred || 0) + 1;
      else civ.fought = (civ.fought || 0) + 1;
    }
    if (e === civ.leaderEnt && civ.attitude === 'evades' && civ.ark && civ.ark.state === 'defend') civ.ark.dur += 10;
  };

  /** Place qu'occupera le prochain habitant capturé (trois par place). */
  Cv.captureWeight = function (X) {
    const entry = X.cargo.find((c) => c.inhabitants && c.people === X.civ.people && c.forced);
    return entry && entry.inhabitants % 3 ? 0 : 1;
  };
  /** Un habitant capturé rejoint la soute : trois par place. */
  Cv.captured = function (X, e) {
    const civ = X.civ;
    let entry = X.cargo.find((c) => c.inhabitants && c.people === civ.people && c.forced);
    if (!entry) { entry = { inhabitants: 0, people: civ.people, forced: true, attitude: civ.attitude }; X.cargo.push(entry); }
    entry.inhabitants++;
    civ.captured = (civ.captured || 0) + 1;
    FX.text(e.x, e.y - e.r - 10, 'emmené de force', AN.STAMP, { size: 12, bold: true, life: 1.4 });
    AN.Audio.play('capture_ok');
  };

  /* ======================= Fin d'expédition ======================= */
  /**
   * Ce que deviennent les habitants. Renvoie un résumé pour le rapport.
   * terrByZone : territoires créés par cette extraction (index de zone → territoire).
   */
  Cv.finish = function (X, outcome, sel, terrByZone, worldDestroyed) {
    const civ = X.civ;
    const prof = X.profile;
    if (!civ) return null;
    const P = D.PEOPLE[civ.people];
    const m = Cv.moral(prof);
    const memo = Cv.peopleMemo(prof, civ.people);
    const out = { people: civ.people, attitude: civ.attitude, revealed: civ.revealed, saved: 0, forced: 0, abandoned: 0, escaped: 0, killed: civ.killed || 0, carried: 0, ark: false };
    const boarded = civ.boarded || 0;
    // la soute livrée : celle de l'extraction, et ce que l'hexagone submergé a déjà ramené (1.9)
    const cargo = X.delivered || (outcome === 'extrait' ? X.cargo : []);
    const forcedCargo = cargo.filter((c) => c.inhabitants).reduce((s, c) => s + c.inhabitants, 0);
    const arkTaken = cargo.some((c) => c.ark);
    // Le territoire du village transféré emporte ses habitants avec lui.
    let carried = 0;
    const vt = outcome === 'extrait' && terrByZone[civ.zone];
    if (vt) {
      const zone = X.zones[civ.zone];
      const list = (zone === X.zone ? X.civils.concat(X.creatures) : (zone.state.civils || []).concat(zone.state.saved || [])).filter((c) => c.alive && c.npc && !c.npc.boarded && c.npc.role !== 'thief');
      carried = list.length;
    }
    const hostileAtt = ['hostiles', 'iconoclastes', 'fiers'].includes(civ.attitude);
    const voluntary = boarded + (vt && !hostileAtt && !civ.forced ? carried : 0);
    const forced = forcedCargo + (vt && (hostileAtt || civ.forced) ? carried : 0);
    out.carried = carried;
    out.saved = voluntary;
    out.forced = forced;
    out.escaped = civ.escaped || 0;
    out.ark = arkTaken;
    const home = vt ? vt.uid : Cv.bestHome(prof, civ.people);
    const mk = (n, isForced) => {
      const st = {
        uid: U.uid('s'), people: civ.people, attitude: civ.attitude, revealed: false, n, forced: isForced,
        home, village: !!(vt || (sel && sel.village && !isForced)), mood: isForced ? (vt && civ.attitude === 'fiers' ? 45 : 22) : civ.attitude === 'devots' ? 88 : 66,
        infiltrators: civ.attitude === 'infiltres' && !isForced ? Math.max(1, Math.ceil(n / 4)) : 0,
        world: X.world.code, arrived: Date.now(), nextEvent: 8 + Math.random() * 10, request: null,
      };
      prof.settlements = prof.settlements || [];
      prof.settlements.push(st);
      return st;
    };
    if (voluntary > 0) { const st = mk(voluntary, false); out.settlement = st.uid; }
    if (forced > 0) mk(forced, true);
    if (arkTaken) {
      prof.structures = prof.structures || [];
      prof.structures.push({ uid: U.uid('st'), kind: 'arche', people: civ.people, world: X.world.code, date: Date.now() });
      m.pillages++;
    }
    m.sauves += voluntary;
    if (civ.attitude === 'devots') m.adores += voluntary;
    m.contraints += forced;
    m.massacres += civ.massacred || 0;
    m.combattus += civ.fought || 0;
    m.evades += out.escaped ? 1 : 0;
    memo.saved += voluntary; memo.forced += forced; memo.killed += out.killed; memo.escaped += out.escaped;
    if (worldDestroyed) {
      out.abandoned = Math.max(0, civ.n - voluntary - forced - out.escaped - (civ.killed || 0));
      m.abandonnes += out.abandoned;
      memo.abandoned += out.abandoned;
    }
    const lines = [];
    if (voluntary) lines.push(voluntary + ' ' + P.name.replace(/^les /, '') + ' vous ont suivi.');
    if (forced) lines.push(forced + ' ont été emmenés de force.');
    if (out.escaped) lines.push('Leur arche a quitté le monde à temps.');
    if (out.ark) lines.push('Vous avez emporté leur arche.');
    if (out.abandoned) lines.push(out.abandoned + ' sont restés dans le monde détruit.');
    AN.Bonds.log(prof, P.Name + ' (' + X.world.code + ') : ' + (lines.join(' ') || 'aucune nouvelle.'), 'civ');
    out.lines = lines;
    return out;
  };

  /** Territoire où s'installe un peuple : un biome qu'il connaît, sans autre village. */
  Cv.bestHome = function (prof, pid) {
    const P = D.PEOPLE[pid];
    const taken = new Set((prof.settlements || []).map((s) => s.home));
    const t = prof.territories.find((x) => P.biomes.includes(x.biome) && !taken.has(x.uid)) || prof.territories.find((x) => P.biomes.includes(x.biome));
    return t ? t.uid : null;
  };

  /* ======================= Dessin ======================= */
  Cv.draw = function (ctx, X, t) {
    const v = X.zone.village;
    if (!v) return;
    const P = D.PEOPLE[v.people];
    const view = X.cam.view(120);
    const vm = (v.r || 0) + 240;
    if (v.x < view.x0 - vm || v.x > view.x1 + vm || v.y < view.y0 - vm || v.y > view.y1 + vm) return;
    // place du village (et, dans une ville, son pavage)
    if (v.city && AN.Nations) AN.Nations.drawPlaza(ctx, X, v, t);
    ctx.strokeStyle = U.rgba(P.body.trim, 0.35);
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 9]);
    ctx.beginPath(); ctx.arc(v.x, v.y, Z.T * 2.6, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    const civ = X.civ;
    for (const b of v.buildings) {
      if (b.taken) continue;
      if (b.kind === 'ark') {
        const A = civ && civ.ark;
        if (A && (A.state === 'launch' || A.state === 'gone')) {
          if (A.state === 'gone') continue;
          const k = U.easeIn(A.launchT / 3);
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.translate(0, -k * 400);
          AN.CivArt.drawBuilding(ctx, b.x, b.y, Z.T * 2 * (1 + k), P.style, P, 'ark', b.variant, t, b.seed);
          ctx.restore();
          continue;
        }
        AN.CivArt.drawBuilding(ctx, b.x, b.y, Z.T * 2, P.style, P, 'ark', b.variant, t, b.seed);
        if (b.broken) { ctx.fillStyle = 'rgba(30,20,10,0.5)'; ctx.beginPath(); ctx.arc(b.x, b.y, 40, 0, TAU); ctx.fill(); }
        if (A && A.state === 'defend') {
          const w = 90;
          ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(b.x - w / 2 - 1, b.y - 58, w + 2, 6);
          ctx.fillStyle = AN.CYAN; ctx.fillRect(b.x - w / 2, b.y - 57, w * U.clamp(A.ent.hp / A.ent.maxHp, 0, 1), 4);
          ctx.fillStyle = AN.INK; ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
          ctx.fillText('Lancement dans ' + Math.max(0, Math.ceil(A.dur - A.t)) + ' s', b.x, b.y - 64);
        }
        continue;
      }
      const pub = b.kind === 'market' || b.kind === 'hall' || b.kind === 'palace';
      AN.CivArt.drawBuilding(ctx, b.x, b.y, Z.T * (pub ? Math.max(b.w, b.h) * 0.95 : 2), P.style, P, pub ? b.kind : 'house', b.variant, t, b.seed);
    }
    if (v.city && AN.Nations) AN.Nations.drawCity(ctx, X, v, t);
    // bulle au-dessus du chef
    const L = Cv.leader(X);
    if (L && civ && !D.ATTITUDES[civ.attitude].hostile && !civ.met) {
      const bob = Math.sin(t * 3) * 3;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(L.x, L.y - L.r - 22 + bob, 12, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = AN.INK; ctx.font = '700 12px ' + AN.FONT_UI; ctx.textAlign = 'center'; ctx.fillText('…', L.x, L.y - L.r - 18 + bob);
    }
    // plaque de rassemblement
    if (civ && civ.rallyPlate && (civ.state === 'rally') && X.zone === X.zones[civ.zone]) {
      const pl = civ.rallyPlate;
      ctx.strokeStyle = U.rgba(P.body.mark, 0.7); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(pl.x, pl.y, Z.T * 2.9 + Math.sin(t * 3) * 3, 0, TAU); ctx.stroke();
    }
  };
})();
