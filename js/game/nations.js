/* Nations (1.12) : les mondes tenus tout entiers par un peuple.
   Une ville par zone (zone.village.city), la capitale au cœur, un souverain.
   - Faveur (−100 à 100) : de départ selon leur humeur et votre réputation ; elle
     monte quand on commerce, qu'on fait des présents, qu'on abat les gardiens qui
     menacent leurs villes ; elle tombe quand on tue les leurs.
   - Comptoirs (marché de chaque ville) : du troc, payé avec le sac ; plus la
     faveur est haute, plus les prix baissent.
   - Mercenaires (caserne) : des gardes, des archers, leur champion, qui se battent
     à vos côtés jusqu'à la fin de l'expédition.
   - Audience du souverain (palais de la capitale) : présents, alliance, ou guerre.
     Un monde allié, ou soumis (souverain vaincu), rejoint l'Archive sans être
     détruit : il devient un lieu ancré peuplé et envoie un tribut.
   Les nations ancrées sont gardées dans profile.nations ; leur monde se regénère
   à partir de sa graine. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const Z = AN.ZoneGen;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const Na = (AN.Nations = {});
  const toast = (...a) => AN.HUD && AN.HUD.toast(...a);
  const F = () => D.NATION.favor;

  /* ======================= Profil ======================= */
  Na.list = (p) => (p.nations = p.nations || []);
  Na.entry = (p, code) => Na.list(p).find((n) => n.code === code) || null;
  Na.realm = (pid) => D.PEOPLE[pid].realm || D.PEOPLE[pid].Name;
  /** « des Pâles » */
  Na.ofPeople = (pid) => D.PEOPLE[pid].name.replace(/^les /, 'des ');

  /** Faveur de départ d'une nation rencontrée. */
  Na.startFavor = function (p, nat) {
    const f = F();
    let v = (f.start[nat.attitude] || 0) + (f.rep[AN.Civ.reputation(p)] || 0);
    const memo = AN.Civ.peopleMemo(p, nat.people);
    v += Math.min(f.savedMax, memo.saved * f.saved);
    v += Math.max(f.harmedMax, (memo.forced + memo.killed) * f.harmed);
    return U.clamp(Math.round(v), -100, 100);
  };
  /** Multiplicateur des prix selon la faveur. */
  Na.priceMul = (favor) => { const P = D.NATION.price; return U.clamp(P.base - favor * P.per, P.min, P.max); };

  /* ======================= Expédition ======================= */
  Na.setup = function (X, resume) {
    const nat = X.world.nation;
    X.nation = null;
    // les mercenaires engagés depuis l'Archive rejoignent l'expédition, quel que soit le monde (1.13)
    const hired = X.profile.mercs || [];
    hired.forEach((m, i) => Na.spawnMerc(X, m.people, m.role, null, i));
    X.profile.mercs = [];
    if (!nat) return;
    const entry = Na.entry(X.profile, X.world.code);
    X.nation = Object.assign({}, nat, {
      favor: entry ? entry.favor : Na.startFavor(X.profile, nat),
      anchored: entry ? entry.mode : null,
      trades: 0, gifts: 0, killed: 0, guardians: 0, deals: {}, met: false, war: false,
      missionAt: entry ? Object.assign({}, entry.missionAt) : {}, // nation ancrée : missions accomplies lors des visites précédentes (1.13)
    });
    if (entry) X.nation.attitude = entry.mode === 'vassal' ? 'fiers' : 'suppliants';
    if (!resume) AN.Civ.peopleMemo(X.profile, nat.people).met++;
  };
  /** Ville et peuple fermés : on vous attaque à vue. */
  Na.hostile = (X) => !!X.nation && !X.nation.anchored && (X.nation.war || !!D.ATTITUDES[X.nation.attitude].hostile || X.nation.favor <= F().hostile);
  Na.cityOf = (X, zone) => (zone && zone.village && zone.village.city ? zone.village : null);

  function addFavor(X, n, why) {
    const nat = X.nation;
    if (!nat || !n) return;
    const was = Na.hostile(X);
    nat.favor = U.clamp(nat.favor + n, -100, 100);
    if (why && FX) FX.text(X.player.x, X.player.y - 30, (n > 0 ? '+' : '') + n + ' faveur ' + Na.ofPeople(nat.people), n > 0 ? AN.CYAN : AN.STAMP, { size: 12, bold: true, life: 1.6 });
    if (!was && Na.hostile(X)) Na.turnHostile(X);
  }
  Na.addFavor = addFavor;

  /* ---------- habitants ---------- */
  function mk(X, zone, role, x, y, team) {
    const nat = X.nation;
    const e = AN.Entities.creature(AN.Civ.def(nat.people, role), x, y, { team, threat: X.world.threat });
    e.npc = { role, mode: 'idle', city: zone.index, nation: true };
    e.home = { x: zone.village.x, y: zone.village.y };
    e.temper = team === 'wild' ? (role === 'villager' ? 'craintif' : 'agressif') : 'passif';
    e.fighter = team === 'wild' && role !== 'villager';
    AN.Physics.collide(zone, e);
    return e;
  }
  /** Peuple une ville quand sa zone est générée (la première fois). */
  Na.spawnCity = function (X, zone) {
    const nat = X.nation;
    const v = Na.cityOf(X, zone);
    if (!nat || !v) return;
    const rng = AN.RNG.from(nat.seed, 'citoyens' + zone.index);
    const hostile = Na.hostile(X);
    const team = hostile ? 'wild' : 'civil';
    const spot = (rmin, rmax) => {
      for (let k = 0; k < 40; k++) {
        const a = rng.float(0, TAU), r = rng.float(rmin, rmax) * v.r;
        const x = v.x + Math.cos(a) * r, y = v.y + Math.sin(a) * r;
        if (!Z.isSolid(Z.tileAt(zone, x, y))) return { x, y };
      }
      return { x: v.x, y: v.y };
    };
    const n = v.capital ? 16 : 11;
    for (let i = 0; i < n; i++) { const s = spot(0.1, 0.85); const e = mk(X, zone, 'villager', s.x, s.y, team); (hostile ? X.creatures : X.civils).push(e); }
    const guards = (v.capital ? 4 : 3) + (hostile ? 2 + Math.floor(X.world.threat / 3) : 0);
    for (let i = 0; i < guards; i++) {
      const s = spot(0.3, 0.75);
      const g = mk(X, zone, i % 3 === 2 ? 'archer' : 'guard', s.x, s.y, team);
      (hostile ? X.creatures : X.civils).push(g);
    }
    if (v.capital) {
      const pal = v.buildings.find((b) => b.kind === 'palace') || v;
      const S = mk(X, zone, 'sovereign', pal.x, pal.y + Z.T * 2.2, team);
      S.nickname = nat.sovereign + ', ' + nat.title;
      S.npc.sovereign = true;
      S.maxHp = S.hp = Math.round(S.maxHp * (hostile ? 2.4 : 1));
      (hostile ? X.creatures : X.civils).push(S);
    } else {
      const G = mk(X, zone, 'leader', v.x, v.y, team);
      G.nickname = 'Gouverneur de ' + v.name;
      G.npc.governor = true;
      (hostile ? X.creatures : X.civils).push(G);
    }
  };
  /** La nation vous ferme ses portes : dans la zone, ses gens deviennent hostiles. */
  /** Un habitant prend les armes (ou fuit, s'il n'est pas combattant). */
  function hostilize(X, e) {
    AN.Civ.toWild(X, e, e.npc.role === 'villager' ? 'craintif' : 'agressif');
    e.exposed = false;
    if (e.npc.role !== 'villager') { e.fighter = true; e.aggroT = 20; }
  }
  /** Un habitant baisse les armes et revient parmi les siens. */
  function pacify(X, e) {
    e.team = 'civil'; e.fighter = false; e.temper = 'passif'; e.weak = false; e.aggroT = 0; e.kneel = false; e.exposed = false; e.npc.mode = 'idle';
    X.creatures = X.creatures.filter((c) => c !== e);
    if (!X.civils.includes(e)) X.civils.push(e);
  }
  /**
   * Les habitants de la zone où l'on entre suivent l'humeur actuelle de la nation (1.13) :
   * une ville quittée avant une guerre, ou avant qu'on épargne le souverain, est à jour.
   */
  function syncZone(X) {
    const hostile = Na.hostile(X);
    if (hostile) X.civils.slice().forEach((e) => { if (e.alive && e.npc && e.npc.nation) hostilize(X, e); });
    else X.creatures.slice().forEach((e) => { if (e.alive && e.npc && e.npc.nation) pacify(X, e); });
  }
  Na.turnHostile = function (X) {
    toast(D.PEOPLE[X.nation.people].Name + ' vous ferment leurs portes. Leurs gardes prennent les armes.', 6);
    X.civils.slice().forEach((e) => { if (e.npc && e.npc.nation) hostilize(X, e); });
    // les mercenaires de ce peuple s'en vont
    X.allies.forEach((a) => { if (a.merc && a.merc.people === X.nation.people) { a.alive = false; FX.burst(a.x, a.y, a.pal.body, 8, 100); } });
    X.allies = X.allies.filter((a) => a.alive !== false);
  };
  /** Déclarer la guerre : leur monde sera pris de force. */
  Na.declareWar = function (X) {
    const was = Na.hostile(X); // avant de déclarer la guerre (1.13 : la guerre rendait la nation hostile sans que ses gens prennent les armes)
    X.nation.war = true;
    AN.Civ.moral(X.profile).combattus++;
    addFavor(X, -Math.max(0, X.nation.favor - F().hostile + 40));
    if (!was) Na.turnHostile(X);
  };
  /** Le souverain vaincu a été épargné : la nation baisse les armes. */
  Na.spare = function (X) {
    const nat = X.nation;
    nat.war = false;
    nat.attitude = 'fiers';
    nat.favor = Math.max(nat.favor, 0);
    X.creatures.slice().forEach((e) => { if (e.npc && e.npc.nation) pacify(X, e); }); // les autres villes suivront en y entrant
    toast('Vous les épargnez. Ils baissent les armes, sans un mot.', 5);
  };

  Na.onKilled = function (X, e, src) {
    if (!X.nation || !e.npc || !e.npc.nation) return;
    const byPlayer = src && (src.kind === 'player' || src.team === 'player' || src.team === 'ally');
    if (!byPlayer) return;
    X.nation.killed++;
    addFavor(X, e.npc.role === 'villager' ? F().killCitizen : F().killGuard);
  };
  /** Un gardien de zone abattu ou capturé : il menaçait l'une de leurs villes. */
  Na.onGuardian = function (X, e) {
    if (!X.nation || Na.hostile(X) || !e.boss || e.boss.errant) return;
    X.nation.guardians++;
    addFavor(X, F().guardian, true);
    // la mission « le gardien » de cette ville (1.13)
    const zi = e.boss.zoneIndex != null ? e.boss.zoneIndex : X.zi;
    const m = X.nation.missions && X.nation.missions[zi];
    if (m && m.kind === 'gardien' && m.state === 'active') {
      m.state = 'ready';
      toast('Le gardien ne menacera plus leurs routes. Retournez voir le gouverneur de ' + cityName(X, zi) + '.', 5);
    }
  };

  Na.update = function (X, dt) {
    const nat = X.nation;
    if (!nat) return;
    if (nat.raid) raidUpdate(X, dt);
    crateUpdate(X);
    const v = Na.cityOf(X, X.zone);
    if (!v || Na.hostile(X)) return;
    // à l'arrivée dans une ville, on vous salue
    if (!v.hailed && U.dist(v.x, v.y, X.player.x, X.player.y) < v.r + 120) {
      v.hailed = true;
      toast((v.capital ? 'Capitale ' : 'Ville ') + 'de ' + v.name + ' (' + Na.realm(nat.people) + '). Le comptoir et la caserne sont sur la place' + (v.capital ? ', le palais au nord.' : ', le gouverneur près de la fontaine.'), 6);
      // une fois par expédition, des bêtes peuvent s'en prendre à la ville (1.13)
      if (!(nat.raided && nat.raided[X.zi]) && Math.random() < RAID().chance) v.raidAt = X.time + U.lerp(RAID().delay[0], RAID().delay[1], Math.random());
    }
    if (v.raidAt && X.time >= v.raidAt) { v.raidAt = null; Na.startRaid(X, false); }
  };

  /* ======================= Défense des villes (1.13) ======================= */
  const RAID = () => D.NATION.raid;
  const DEFENDERS = { guard: 1, archer: 1, champion: 1 };
  /** Pendant un raid, les bêtes s'en prennent aux habitants ; le gouverneur et le souverain restent à l'abri. */
  const preyOf = (e) => e.npc && e.npc.nation && !e.npc.governor && !e.npc.sovereign;
  /**
   * Les gardes d'une ville amie s'en prennent aux bêtes qui la menacent (celles qui
   * attaquent, ou qui viennent en raid), sans s'éloigner de leurs murs. Ils épargnent
   * les bêtes affaiblies, qu'on puisse les capturer. Retourne vrai s'ils combattent.
   */
  Na.defend = function (X, e, dt) {
    if (!X.nation || !e.npc || !e.npc.nation || e.team !== 'civil' || !DEFENDERS[e.npc.role] || !e.atk) return false;
    const v = Na.cityOf(X, X.zone);
    if (!v) return false;
    if (e.defendT > 0) e.defendT -= dt;
    const leash = v.r + 260;
    let enemy = null, bd = 1e9;
    for (const c of X.creatures) {
      if (!c.alive || c.team !== 'wild' || c.hidden || c.def.npc || c.herd || c.reflection || c.weak) continue;
      if (c.boss && (c.boss.exhausted || !c.boss.active)) continue;
      if (!c.cityRaid && !c.isBoss && c.state !== 'attack' && c.aggroT <= 0) continue;
      if (U.dist(c.x, c.y, v.x, v.y) > leash) continue;
      const d = U.dist(c.x, c.y, e.x, e.y);
      if (d < bd) { bd = d; enemy = c; }
    }
    if (!enemy || U.dist(e.x, e.y, v.x, v.y) > leash + 100) {
      if (!(e.defendT > 0)) e.exposed = !!X.nation.raid && X.nation.raid.zi === X.zi;
      return false;
    }
    e.exposed = true; // au combat, on peut les blesser
    e.defendT = 3;
    e.state = 'attack';
    AN.AI.attack(X, e, enemy, dt);
    return true;
  };

  /** Des bêtes marchent sur la ville où l'on se trouve : deux vagues. */
  const raidPool = (zone) => AN.WorldGen.pool(zone.biome).filter((d) => d.attack && d.tier <= 1 && !d.npc);
  Na.startRaid = function (X, mission) {
    const nat = X.nation;
    const v = Na.cityOf(X, X.zone);
    if (!nat || !v || nat.raid || X.collapse || X.ending || Na.hostile(X) || !raidPool(X.zone).length) return false;
    nat.raided = nat.raided || {};
    nat.raided[X.zi] = true; // une ville n'est attaquée d'elle-même qu'une fois par expédition
    nat.raid = { zi: X.zi, wave: 0, nextT: 3, mission: !!mission, kills: 0, near: 0, spawned: 0 };
    X.civils.forEach((c) => { if (c.alive && preyOf(c)) c.exposed = true; }); // les bêtes s'en prennent aux habitants
    toast('Des bêtes marchent sur ' + v.name + '. Les gardes prennent les armes.', 5);
    AN.Audio.play('telegraph');
    return true;
  };
  function raidWave(X, v) {
    const zone = X.zone;
    const pool = raidPool(zone);
    if (!pool.length) return 0;
    const n = RAID().size + Math.floor(X.world.threat / 2);
    const a0 = Math.random() * TAU;
    let k = 0;
    for (let i = 0; i < n * 12 && k < n; i++) {
      const a = a0 + (Math.random() - 0.5) * (i < n * 6 ? 1.4 : TAU), r = v.r + (i < n * 6 ? 340 + Math.random() * 220 : 120 + Math.random() * 500);
      const x = v.x + Math.cos(a) * r, y = v.y + Math.sin(a) * r;
      if (Z.tileAt(zone, x, y) !== Z.FLOOR) continue;
      const e = AN.Entities.creature(pool[Math.floor(Math.random() * pool.length)], x, y, { threat: X.world.threat, rule: X.world.rule });
      e.frenzy = true; e.aggroT = 60; e.noLoot = Math.random() < 0.5;
      e.cityRaid = { zi: X.zi, x: v.x, y: v.y };
      e.home = { x: v.x, y: v.y };
      X.creatures.push(e);
      FX.burst(x, y, e.pal.body, 8, 100, { size: 3 });
      k++;
    }
    return k;
  }
  /** Bêtes du raid encore debout ; celles qui sont affaiblies ne comptent plus (elles fuient, on peut les capturer). */
  Na.raidersLeft = (X) => X.creatures.filter((c) => c.alive && !c.weak && c.cityRaid && X.nation.raid && c.cityRaid.zi === X.nation.raid.zi).length;
  function raidUpdate(X, dt) {
    const nat = X.nation;
    const r = nat.raid;
    const v = X.zi === r.zi ? Na.cityOf(X, X.zone) : null;
    if (!v || X.collapse || Na.hostile(X)) { endRaid(X, false); return; }
    r.nextT -= dt;
    if (U.dist(v.x, v.y, X.player.x, X.player.y) < v.r + 320) r.near += dt;
    if (r.wave < RAID().waves && r.nextT <= 0) {
      r.spawned += raidWave(X, v);
      r.wave++;
      r.nextT = RAID().gap;
      if (r.wave > 1) toast('Une autre vague approche de ' + v.name + '.', 3);
    }
    if (r.wave >= RAID().waves && r.nextT < RAID().gap - 1.5 && Na.raidersLeft(X) === 0) endRaid(X, true);
  }
  /** Fin du raid : repoussé, ou abandonné (on a quitté la ville). */
  function endRaid(X, won) {
    const nat = X.nation;
    const r = nat.raid;
    nat.raid = null;
    const zone = X.zones[r.zi];
    const v = zone && zone.village;
    const here = X.zi === r.zi;
    // les bêtes restées en arrière se calment ; les habitants ne sont plus des proies
    (here ? X.creatures : (zone && zone.state.saved) || []).forEach((c) => { if (c.cityRaid) { c.cityRaid = null; c.frenzy = false; c.aggroT = 0; } });
    (here ? X.civils : (zone && zone.state.civils) || []).forEach((c) => { if (c.npc && c.npc.nation) c.exposed = false; });
    const m = nat.missions && nat.missions[r.zi];
    const mission = m && m.kind === 'defense' && m.state === 'active' ? m : null;
    if (won && !r.spawned) { // aucune bête n'a pu venir : fausse alerte
      if (mission) mission.state = 'offer';
      return;
    }
    if (!won) { // on est parti : la ville s'est défendue sans vous, et la mission est manquée
      if (mission) mission.state = 'failed';
      if (v) toast(v.name + ' se défend sans vous.', 4);
      return;
    }
    const helped = r.kills > 0 || r.near > 6;
    if (!helped) {
      if (mission) mission.state = 'failed';
      toast('Les gardes de ' + v.name + ' ont repoussé les bêtes, seuls.', 4);
      return;
    }
    if (mission) { mission.state = 'ready'; Na.complete(X, r.zi); }
    else {
      addFavor(X, RAID().favor, true);
      toast(v.name + ' a tenu. On vous en sera reconnaissant.', 5);
    }
  }

  /** Une bête abattue (hors habitants) : raid, battue. */
  Na.onBeastKilled = function (X, e, src) {
    const nat = X.nation;
    if (!nat || Na.hostile(X)) return;
    const byPlayer = src && (src.kind === 'player' || src.team === 'player' || src.team === 'ally');
    if (!byPlayer) return;
    if (e.cityRaid && nat.raid && e.cityRaid.zi === nat.raid.zi) {
      nat.raid.kills++;
      // faveur plafonnée par ville et par expédition, même si le raid recommence
      nat.raidFavor = nat.raidFavor || {};
      const got = nat.raidFavor[nat.raid.zi] || 0;
      if (got < RAID().perKillMax) { nat.raidFavor[nat.raid.zi] = got + RAID().perKill; addFavor(X, RAID().perKill); }
    }
    const m = nat.missions && nat.missions[X.zi];
    if (m && m.kind === 'battue' && m.state === 'active' && !e.def.fake && !e.echo) {
      m.got++;
      if (m.got >= m.n) {
        m.state = 'ready';
        toast('Battue terminée. Retournez voir le gouverneur de ' + cityName(X, X.zi) + '.', 5);
        AN.Audio.play('ui_ok');
      }
    }
  };

  /* ======================= Missions des gouverneurs (1.13) ======================= */
  const MIS = () => D.NATION_MISSIONS;
  const scaleMul = (scale) => (D.BOON_SCALE ? D.BOON_SCALE[scale || 'region'] || 1 : 1);
  const cityName = (X, zi) => (zi >= X.world.zones.length ? X.world.nation.capital : X.world.nation.cities[zi] || X.world.nation.capital);
  const zoneLabel = (X, zi) => cityName(X, zi) + ' (' + (X.echelon ? X.echelon.unit.toLowerCase() : 'zone') + ' ' + (zi + 1) + ')';
  Na.cityName = cityName;

  /** La mission du gouverneur d'une ville (zone zi), tirée de la graine à la première visite. */
  Na.mission = function (X, zi, force) {
    const nat = X.nation;
    nat.missions = nat.missions || {};
    const old = nat.missions[zi];
    if (old && !force) {
      if (old.rested && Date.now() - old.rested >= D.NATION.missionCooldown * 60000) delete nat.missionAt[zi]; // le gouverneur a une nouvelle demande
      else {
        if (old.kind === 'gardien' && old.state === 'active' && X.conquered.has(zi)) old.state = 'ready'; // abattu pendant une brouille
        return old;
      }
    }
    const w = X.world;
    const spec = w.zones[zi];
    if (!spec) return null;
    const rng = AN.RNG.from(nat.seed, 'mission' + zi);
    const kinds = Object.keys(MIS()).filter((k) => {
      if (k === 'gardien') return !!spec.guardian && !X.conquered.has(zi);
      if (k === 'caravane') return w.zones.length > 1;
      return true;
    });
    const kind = force && kinds.includes(force) ? force : rng.weighted(kinds.map((k) => [k, MIS()[k].weight])); // force : pour le débogage
    const big = scaleMul(w.scale);
    const m = { kind, state: 'offer', got: 0, zi };
    if (kind === 'battue') m.n = 4 + Math.floor(w.threat / 2);
    if (kind === 'livraison') {
      const b = D.BIOME[spec.biome];
      const commons = Object.keys(b.resources).filter((r) => D.RESOURCES[r].rarity === 0);
      m.res = rng.pick(commons.length ? commons : ['fibre']);
      m.n = Math.min(Math.round((7 + rng.int(0, 4)) * big), Math.max(5, Math.floor((X.S ? X.S.bagCap : 30) * 0.45)));
    }
    if (kind === 'caravane') m.zone = rng.pick(w.zones.map((z, i) => i).filter((i) => i !== zi));
    if (kind === 'gardien') m.guardian = spec.guardian;
    // nation ancrée : le gouverneur n'a rien d'autre à demander tant que la dernière mission est récente
    const at = nat.missionAt && nat.missionAt[zi];
    if (at && Date.now() - at < D.NATION.missionCooldown * 60000) { m.state = 'done'; m.rested = at; }
    nat.missions[zi] = m;
    return m;
  };
  /** Ce que demande le gouverneur, en toutes lettres. */
  Na.missionText = function (X, m) {
    const res = m.res ? D.RESOURCES[m.res].name.toLowerCase() : '';
    return MIS()[m.kind].text.replace('{ville}', cityName(X, m.zi)).replace('{n}', m.n).replace('{de_res}', AN.Names.de(res))
      .replace('{zone}', m.zone != null ? zoneLabel(X, m.zone) : '').replace('{gardien}', m.guardian ? D.CREATURE[m.guardian].name : '');
  };
  /** Ce que rapporte une mission : la ressource préférée du peuple, et une ressource rare de la ville. */
  Na.missionReward = function (X, m) {
    const nat = X.nation;
    const big = scaleMul(X.world.scale);
    const out = { [D.PEOPLE[nat.people].likes]: Math.round(4 * big) };
    const b = D.BIOME[X.world.zones[m.zi].biome];
    const rares = Object.keys(b.resources).filter((r) => D.RESOURCES[r].rarity >= 1 && r !== 'essence');
    const r = rares.length ? rares[(nat.seed + m.zi) % rares.length] : 'cristal';
    out[r] = (out[r] || 0) + Math.max(1, Math.round(big));
    return out;
  };
  Na.accept = function (X, zi) {
    const m = Na.mission(X, zi);
    if (!m || m.state !== 'offer') return 'non';
    m.state = 'active';
    if (m.kind === 'defense') {
      const nat = X.nation;
      if (nat.raid && nat.raid.zi === X.zi) nat.raid.mission = true; // la harde est déjà là
      else if (!Na.startRaid(X, true)) { m.state = 'offer'; return 'raid'; }
    }
    if (m.kind === 'caravane') { m.crate = { zi: m.zone, x: null, y: null, got: false }; if (X.zi === m.zone) placeCrate(X, m); }
    if (m.kind === 'gardien' && X.conquered.has(zi)) m.state = 'ready';
    AN.Audio.play('ui_ok');
    return 'ok';
  };
  /** Livraison : depuis le sac. */
  Na.deliver = function (X, zi) {
    const m = Na.mission(X, zi);
    if (!m || m.kind !== 'livraison' || m.state !== 'active') return 'non';
    if ((X.bag[m.res] || 0) < m.n) return 'manque';
    X.bag[m.res] -= m.n;
    if (!X.bag[m.res]) delete X.bag[m.res];
    m.state = 'ready';
    return Na.complete(X, zi);
  };
  /** Mission accomplie : récompense (au sol, près de vous, si le sac est plein) et faveur. */
  Na.complete = function (X, zi) {
    const nat = X.nation;
    const m = nat.missions && nat.missions[zi];
    if (!m || m.state !== 'ready') return 'non';
    m.state = 'done';
    m.doneAt = Date.now();
    const reward = Na.missionReward(X, m);
    m.reward = reward;
    const p = X.player;
    for (const k in reward) {
      const got = X.addToBag(k, reward[k]);
      if (got < reward[k]) AN.Combat.drop(X, p.x, p.y, { [k]: reward[k] - got }, 1);
    }
    nat.missionsDone = (nat.missionsDone || 0) + 1;
    addFavor(X, MIS()[m.kind].favor, true);
    toast(MIS()[m.kind].name + ' : mission accomplie pour ' + cityName(X, zi) + '. ' + Object.entries(reward).map(([k, n]) => n + ' ' + D.RESOURCES[k].name).join(', ') + '.', 5);
    AN.Audio.play('craft');
    return 'ok';
  };

  /* ---------- la caravane perdue ---------- */
  function placeCrate(X, m) {
    const zone = X.zone;
    const c = m.crate;
    if (c.x != null || X.zi !== c.zi) return;
    const rng = AN.RNG.from(X.nation.seed, 'caravane' + c.zi);
    const W = zone.w * Z.T, H = zone.h * Z.T;
    const v = zone.village;
    let best = null;
    for (let k = 0; k < 400 && !best; k++) {
      const x = rng.float(Z.T * 4, W - Z.T * 4), y = rng.float(Z.T * 4, H - Z.T * 4);
      if (Z.tileAt(zone, x, y) !== Z.FLOOR) continue;
      if (v && U.dist(x, y, v.x, v.y) < v.r + 260) continue;
      if (zone.gates.some((g) => U.dist(x, y, g.x, g.y) < 320)) continue;
      if (U.dist(x, y, X.player.x, X.player.y) < 500 && k < 300) continue;
      best = { x, y };
    }
    best = best || { x: zone.entry.x, y: zone.entry.y };
    c.x = Math.round(best.x); c.y = Math.round(best.y);
    // des bêtes se sont installées sur la cargaison
    const pool = AN.WorldGen.pool(zone.biome).filter((d) => d.attack && d.tier <= 1 && !d.npc);
    for (let i = 0; i < 2 + Math.floor(X.world.threat / 3) && pool.length; i++) {
      const a = (i / 3) * TAU;
      const e = AN.Entities.creature(pool[i % pool.length], c.x + Math.cos(a) * 70, c.y + Math.sin(a) * 70, { threat: X.world.threat, rule: X.world.rule });
      e.temper = 'territorial'; e.home = { x: c.x, y: c.y };
      AN.Physics.collide(zone, e);
      X.creatures.push(e);
    }
  }
  /** À l'entrée d'une zone : la cargaison s'y trouve-t-elle ? un raid laissé derrière soi s'achève. */
  Na.onEnterZone = function (X) {
    const nat = X.nation;
    if (!nat) return;
    syncZone(X);
    if (nat.raid && nat.raid.zi !== X.zi) endRaid(X, false);
    Object.values(nat.missions || {}).forEach((m) => {
      if (m.kind === 'caravane' && m.state === 'active' && m.crate && m.crate.zi === X.zi && !m.crate.got) {
        placeCrate(X, m);
        setTimeout(() => { if (AN.X === X && X.zi === m.crate.zi) toast('La cargaison de la caravane est dans cette zone. La flèche dorée vous guide.', 5); }, 1500);
      }
    });
  };
  function crateUpdate(X) {
    const m = Object.values(X.nation.missions || {}).find((q) => q.kind === 'caravane' && q.state === 'active' && q.crate && q.crate.zi === X.zi && !q.crate.got && q.crate.x != null);
    if (!m) return;
    const p = X.player;
    if (U.dist(p.x, p.y, m.crate.x, m.crate.y) > 46) return;
    m.crate.got = true;
    m.state = 'ready';
    if (FX) FX.burst(m.crate.x, m.crate.y, '#c08a2a', 14, 140, { size: 3 });
    AN.Audio.play('pickup');
    toast('Cargaison retrouvée. Rapportez-la au gouverneur de ' + cityName(X, m.zi) + '.', 5);
  }

  /** La ligne de l'affichage tête haute : le raid en cours, ou la mission à suivre. */
  Na.hudText = function (X) {
    const nat = X.nation;
    if (!nat) return '';
    if (nat.raid) return 'Raid sur ' + cityName(X, nat.raid.zi) + ' : ' + (nat.raid.wave < RAID().waves ? 'vague ' + Math.max(1, nat.raid.wave) + ' sur ' + RAID().waves : Na.raidersLeft(X) + ' bête' + (Na.raidersLeft(X) > 1 ? 's' : '') + ' encore');
    const list = Object.values(nat.missions || {}).filter((m) => m.state === 'active' || m.state === 'ready');
    if (!list.length) return '';
    const m = list.find((q) => q.zi === X.zi) || list[0];
    const city = cityName(X, m.zi);
    if (m.state === 'ready') return MIS()[m.kind].name + ' : retournez voir le gouverneur de ' + city;
    switch (m.kind) {
      case 'battue': return 'Battue (' + city + ') : ' + m.got + ' / ' + m.n + (X.zi === m.zi ? '' : ', dans sa zone');
      case 'livraison': return 'Livraison (' + city + ') : ' + Math.min(m.n, X.bag[m.res] || 0) + ' / ' + m.n + ' ' + D.RESOURCES[m.res].name.toLowerCase();
      case 'caravane': return 'Caravane (' + city + ') : ' + (X.zi === m.zone ? 'la cargaison est dans cette zone' : 'la cargaison est vers ' + zoneLabel(X, m.zone));
      case 'gardien': return 'Le gardien (' + city + ') : ' + D.CREATURE[m.guardian].name;
      default: return MIS()[m.kind].name + ' (' + city + ')';
    }
  };
  /** Où aller : la cargaison, ou le gouverneur qui attend votre retour. */
  Na.compassTarget = function (X) {
    const nat = X.nation;
    if (!nat || Na.hostile(X)) return null;
    for (const m of Object.values(nat.missions || {})) {
      if (m.kind === 'caravane' && m.state === 'active' && m.crate && m.crate.zi === X.zi && m.crate.x != null && !m.crate.got) return { x: m.crate.x, y: m.crate.y, label: 'Cargaison' };
      if (m.state === 'ready' && m.zi === X.zi) {
        const G = X.civils.find((c) => c.alive && c.npc && c.npc.governor);
        if (G) return { x: G.x, y: G.y, label: 'Gouverneur' };
      }
    }
    return null;
  };

  /* ---------- reprise d'une expédition (1.13) ---------- */
  const KEEP = ['favor', 'trades', 'gifts', 'killed', 'guardians', 'met', 'war', 'attitude', 'deals', 'missions', 'missionsDone', 'raided', 'raidFavor'];
  /** L'état de la nation, pour le point de reprise. */
  Na.snapshot = function (X) {
    if (!X.nation) return null;
    const out = {};
    KEEP.forEach((k) => { if (X.nation[k] !== undefined) out[k] = X.nation[k]; });
    return JSON.parse(JSON.stringify(out));
  };
  Na.restore = function (X, s) {
    if (!X.nation || !s) return;
    KEEP.forEach((k) => { if (s[k] !== undefined) X.nation[k] = s[k]; });
    X.nation.raid = null;
    // une défense en cours reprend depuis le début (la faveur déjà gagnée pendant ce raid reste comptée)
    Object.values(X.nation.missions || {}).forEach((m) => { if (m.kind === 'defense' && m.state === 'active') m.state = 'offer'; });
  };
  /** Les mercenaires, pour le point de reprise. */
  Na.mercsSnapshot = (X) => X.allies.filter((a) => a.merc && a.alive !== false).map((a) => ({ people: a.merc.people, role: a.merc.role, hp: Math.round((a.hp / a.maxHp) * 100) / 100, downed: !!a.downed, kills: a.kills || 0 }));
  Na.restoreMercs = function (X, list) {
    (list || []).forEach((s, i) => {
      if (!D.PEOPLE[s.people] || !D.MERCS[s.role]) return;
      const a = Na.spawnMerc(X, s.people, s.role, null, i);
      a.hp = Math.max(1, Math.round(a.maxHp * (s.hp || 1)));
      a.downed = !!s.downed;
      if (a.downed) a.hp = 0;
      a.kills = s.kills || 0;
    });
  };

  /* ---------- interactions ---------- */
  Na.interactables = function (X, consider) {
    const nat = X.nation;
    const v = Na.cityOf(X, X.zone);
    if (!nat || !v || X.collapse) return;
    const p = X.player;
    if (Na.hostile(X)) {
      const S = X.creatures.find((e) => e.alive && e.npc && e.npc.sovereign && e.weak);
      if (S) consider(U.dist(S.x, S.y, p.x, p.y), S.r + 70, () => ({ kind: 'nation_parley', target: S, text: 'Parlementer avec ' + nat.sovereign, hold: 0.4 }));
      return;
    }
    const G = !v.capital && X.civils.find((c) => c.alive && c.npc && c.npc.governor);
    if (G) consider(U.dist(G.x, G.y, p.x, p.y), G.r + 64, () => ({ kind: 'nation_governor', target: G, text: 'Parler au gouverneur de ' + v.name, hold: 0.2 }));
    for (const b of v.buildings) {
      if (b.kind === 'market') consider(U.dist(b.x, b.y, p.x, p.y), Z.T * 2.6, () => ({ kind: 'nation_market', target: b, text: 'Comptoir de ' + v.name, hold: 0.2 }));
      if (b.kind === 'hall') consider(U.dist(b.x, b.y, p.x, p.y), Z.T * 2.6, () => ({ kind: 'nation_hall', target: b, text: 'Caserne de ' + v.name + ' : engager des mercenaires', hold: 0.2 }));
      if (b.kind === 'palace') consider(U.dist(b.x, b.y + Z.T * 1.5, p.x, p.y), Z.T * 3.4, () => ({ kind: 'nation_court', target: b, text: 'Audience auprès de ' + nat.sovereign + ', ' + nat.title, hold: 0.25 }));
    }
  };
  Na.interact = function (X, it) {
    switch (it.kind) {
      case 'nation_market': AN.UI.nationMarket(X); return true;
      case 'nation_hall': AN.UI.nationHall(X); return true;
      case 'nation_court': X.nation.met = true; AN.UI.nationCourt(X); return true;
      case 'nation_parley': AN.UI.nationParley(X); return true;
      case 'nation_governor': AN.UI.nationGovernor(X); return true;
      default: return false;
    }
  };

  /* ======================= Comptoirs ======================= */
  const valueOf = (get) => {
    const V = D.NATION.value;
    if (get.res) return Object.keys(get.res).reduce((s, k) => s + D.resValue(k) * get.res[k], 0);
    if (get.item) return V.consumable * get.n;
    if (get.egg) return V.egg;
    return 10;
  };
  /**
   * Les offres d'un comptoir, tirées de la graine : ce que vend le peuple (ressources rares
   * de son paysage, essence, consommables, un œuf) contre ce qu'il demande (des ressources
   * communes, ou celle qu'il préfère). La faveur fait le prix.
   */
  Na.makeDeals = function (seed, biomeId, pid, favor, scale) {
    const rng = AN.RNG.from(seed, 'comptoir');
    const P = D.PEOPLE[pid];
    const b = D.BIOME[biomeId];
    const res = Object.keys(b.resources);
    const commons = res.filter((r) => D.RESOURCES[r].rarity === 0);
    const rares = res.filter((r) => D.RESOURCES[r].rarity >= 1 && r !== 'essence');
    const payWith = commons.length ? commons : ['fibre'];
    const m = Na.priceMul(favor);
    const big = D.BOON_SCALE ? D.BOON_SCALE[scale] || 1 : 1;
    const pay = (get, pref) => { const r = pref || rng.pick(payWith); return { [r]: Math.max(1, Math.ceil((valueOf(get) * m) / Math.max(1, D.resValue(r)))) }; };
    const deals = [];
    const add = (get, stock, pref) => deals.push({ get, give: pay(get, pref), stock });
    if (rares.length) add({ res: { [rng.pick(rares)]: Math.max(1, Math.round(big)) } }, 3);
    add({ res: { [rng.pick(rares.length ? rares : ['cristal'])]: Math.max(2, Math.round(2 * big)) } }, 2, D.RESOURCES[P.likes].rarity === 0 ? P.likes : null);
    const cons = Object.keys(D.GEAR).filter((id) => D.GEAR[id].slot === 'consumable');
    add({ item: rng.pick(cons), n: 2 }, 2);
    const pool = AN.WorldGen.pool(biomeId).filter((c) => c.tier === 0);
    if (pool.length) add({ egg: rng.pick(pool).id }, 1);
    add({ res: { essence: 1 } }, 1);
    // ce qu'ils préfèrent, contre une ressource commune d'ailleurs : ils l'achètent cher
    if (D.RESOURCES[P.likes]) deals.push({ give: { [P.likes]: 4 }, get: { res: { [rng.pick(['minerai', 'fibre', 'seve', 'os'])]: Math.round((10 * big) / m) } }, stock: 3 });
    return deals;
  };
  /** Les offres du comptoir de la ville où l'on se trouve. */
  Na.deals = function (X) {
    const nat = X.nation;
    const zi = X.zi;
    if (!nat.deals[zi]) nat.deals[zi] = Na.makeDeals(nat.seed + ':' + zi, X.zone.biome, nat.people, nat.favor, X.world.scale || 'region');
    return nat.deals[zi];
  };
  /** Échange (paiement depuis le sac). */
  Na.trade = function (X, deal) {
    if (deal.stock <= 0) return 'fait';
    for (const k in deal.give) if ((X.bag[k] || 0) < deal.give[k]) return 'manque';
    if (deal.get.egg && X.cargoUsed() + 1 > X.cargoCap) return 'soute';
    if (deal.get.item && !X.consumables.some((c) => c.id === deal.get.item) && X.consumables.length >= D.CONSUMABLE_SLOTS) return 'emplacements';
    for (const k in deal.give) { X.bag[k] -= deal.give[k]; if (!X.bag[k]) delete X.bag[k]; }
    const g = deal.get;
    if (g.res) for (const k in g.res) X.bag[k] = (X.bag[k] || 0) + g.res[k];
    if (g.item) { const c = X.consumables.find((cc) => cc.id === g.item); if (c) c.n += g.n; else X.consumables.push({ id: g.item, n: g.n, start: 0 }); AN.HUD.refreshConsumables(X); }
    if (g.egg) X.cargo.push({ egg: true, species: g.egg, variant: 'commun', hueSeed: 7, zone: X.zi });
    deal.stock--;
    const nat = X.nation;
    if (nat.trades * F().trade < F().tradeMax) { nat.trades++; addFavor(X, F().trade); }
    AN.Audio.play('craft');
    return 'ok';
  };

  /* ======================= Mercenaires ======================= */
  Na.mercCost = function (pid, role, scale) {
    const P = D.PEOPLE[pid];
    const M = D.MERCS[role];
    const big = D.BOON_SCALE ? D.BOON_SCALE[scale || 'region'] || 1 : 1;
    const cost = { [P.likes]: Math.round(M.cost * big) };
    if (M.rare) cost.essence = 1;
    return cost;
  };
  Na.mercRoles = (favor, capital) => Object.keys(D.MERCS).filter((r) => r !== 'champion' || capital || favor >= F().champion);
  Na.mercCount = (X) => X.allies.filter((a) => a.merc && a.alive !== false).length;
  /** Un mercenaire rejoint la troupe, près du joueur. */
  Na.spawnMerc = function (X, pid, role, at, i) {
    const p = X.player;
    const rank = AN.Profile.rank(X.profile).index;
    const def = AN.Civ.def(pid, role);
    const a2 = (i || 0) * 1.3 + Math.random();
    const x = at ? at.x : p.x + Math.cos(a2) * 60, y = at ? at.y : p.y + Math.sin(a2) * 60;
    const a = AN.Entities.creature(def, x, y, { team: 'ally', scale: (1.2 + rank * 0.4) * (role === 'champion' ? 1.5 : 1) });
    a.merc = { people: pid, role };
    a.npc = { role, mode: 'merc' };
    a.fighter = true;
    a.temper = 'agressif';
    a.kills = 0;
    a.nickname = D.MERCS[role].name + ' ' + Na.ofPeople(pid);
    if (X.zone) AN.Physics.collide(X.zone, a);
    X.allies.push(a);
    return a;
  };
  /** Engager à la caserne (paiement depuis le sac). */
  Na.hire = function (X, role) {
    const nat = X.nation;
    if (Na.mercCount(X) >= D.NATION.mercMax) return 'plein';
    if (nat.favor < F().mercs) return 'faveur';
    const cost = Na.mercCost(nat.people, role, X.world.scale);
    for (const k in cost) if ((X.bag[k] || 0) < cost[k]) return 'manque';
    for (const k in cost) { X.bag[k] -= cost[k]; if (!X.bag[k]) delete X.bag[k]; }
    const m = Na.spawnMerc(X, nat.people, role, null, Na.mercCount(X));
    FX.ring(m.x, m.y, AN.CYAN, 10, 60, 0.5, 3);
    AN.Audio.play('ui_ok');
    return 'ok';
  };

  /* ======================= Audience ======================= */
  Na.giftCost = (X) => ({ [D.PEOPLE[X.nation.people].likes]: Math.round(6 * (D.BOON_SCALE ? D.BOON_SCALE[X.world.scale || 'region'] || 1 : 1)) });
  Na.gift = function (X) {
    const nat = X.nation;
    if (nat.gifts >= F().giftMax) return 'assez';
    const cost = Na.giftCost(X);
    for (const k in cost) if ((X.bag[k] || 0) < cost[k]) return 'manque';
    for (const k in cost) { X.bag[k] -= cost[k]; if (!X.bag[k]) delete X.bag[k]; }
    nat.gifts++;
    addFavor(X, F().gift, true);
    AN.Audio.play('craft');
    return 'ok';
  };
  /** Ce qui manque pour ancrer ce monde (null s'il ne manque rien). */
  Na.anchorBlock = function (X) {
    const need = D.NATION.anchorTier[X.world.scale || 'region'] || 3;
    if (AN.Cosmic.anchorTier(X) < need) return 'L’Ancrage de l’Artefact ne retient pas encore un monde de cette taille (il faut retenir : ' + D.TIERS[need].name.toLowerCase() + ').';
    return null;
  };
  Na.canAlly = (X) => !!X.nation && !X.nation.anchored && !Na.hostile(X) && X.nation.favor >= F().alliance;

  /**
   * Le monde rejoint l'Archive : par alliance (« allie ») ou soumis (« vassal »).
   * Il n'est pas détruit : il devient un lieu ancré, et l'expédition s'achève.
   */
  Na.anchor = function (X, mode) {
    const nat = X.nation;
    const w = X.world;
    const p = X.profile;
    if (X.ending || Na.entry(p, w.code)) return;
    const entry = {
      code: w.code, seed: w.seed, scale: w.scale || 'region', threat: w.threat, people: nat.people, attitude: nat.attitude, mode,
      favor: mode === 'allie' ? Math.max(nat.favor, F().alliance) : 0, since: Date.now(), tributeAt: Date.now(),
      primary: w.primary, region: w.region,
    };
    Na.list(p).push(entry);
    const m = AN.Civ.moral(p);
    const memo = AN.Civ.peopleMemo(p, nat.people);
    if (mode === 'allie') { m.sauves += 12; memo.saved += 12; if (nat.attitude === 'devots') m.adores += 12; }
    else { m.contraints += 12; memo.forced += 12; }
    AN.Bonds.log(p, Na.realm(nat.people) + ' (' + w.code + ') : ' + (mode === 'allie' ? 'leur monde rejoint l’Archive, en allié.' : 'soumis, leur monde rejoint l’Archive.'), 'civ');
    X.anchoredNation = entry;
    X.ending = true;
    FX.ring(X.player.x, X.player.y, AN.CYAN, 10, 600, 1.2, 6);
    AN.Audio.play('portal');
    toast(mode === 'allie' ? 'Leur monde tient désormais dans l’Archive. Il ne s’éteindra pas.' : 'Leur monde est à l’Archive. Ils n’ont pas eu le choix.', 5);
    setTimeout(() => { if (AN.X === X) AN.Expedition.finish(X, 'ancre'); }, 1400);
  };

  /** Fin d'expédition : la faveur d'une nation ancrée est gardée ; les mercenaires tombés coûtent un peu. */
  Na.finish = function (X, prof, outcome, result) {
    const nat = X.nation;
    const fallen = X.allies.filter((a) => a.merc && a.downed);
    if (fallen.length) result.mercsFallen = fallen.map((a) => a.nickname);
    if (!nat) return;
    const entry = Na.entry(prof, X.world.code);
    if (entry) { // missions accomplies : le gouverneur s'en souvient (1.13)
      entry.missionAt = entry.missionAt || {};
      Object.values(nat.missions || {}).forEach((m) => { if (m.doneAt) entry.missionAt[m.zi] = m.doneAt; });
    }
    if (entry && outcome !== 'ancre') entry.favor = U.clamp(Math.round(nat.favor - fallen.filter((a) => a.merc.people === nat.people).length * 3), -100, 100);
    if (outcome === 'ancre' && X.anchoredNation) result.nation = { name: Na.realm(nat.people), mode: X.anchoredNation.mode, place: 'n:' + X.world.code };
  };

  /* ======================= Archive ======================= */
  /** Monde d'une nation ancrée, regénéré à l'identique. */
  Na.world = function (p, entry) {
    const w = AN.WorldGen.destination(entry.seed, { scale: entry.scale, threat: entry.threat, reliability: 1, rep: 'inconnu' });
    if (!w.nation) w.nation = { people: entry.people, attitude: entry.attitude, realm: Na.realm(entry.people), sovereign: D.PEOPLE[entry.people].names[0], title: D.PEOPLE[entry.people].titles[0], capital: 'Capitale', cities: w.zones.map((z, i) => 'Ville ' + (i + 1)), seed: entry.seed };
    w.nation.people = entry.people;
    return w;
  };
  /** Tribut des nations ancrées, au fil du temps de l'Archive. */
  Na.tick = function (p, minutes) {
    const T = D.NATION.tribute;
    const out = [];
    Na.list(p).forEach((n) => {
      n.acc = (n.acc || 0) + minutes;
      if (n.favor < 0) { n.acc = Math.min(n.acc, T.period); return; } // une nation qui vous en veut ne paie pas
      let got = null;
      while (n.acc >= T.period) {
        n.acc -= T.period;
        got = got || {};
        const b = D.BIOME[n.primary] || D.BIOME[D.PEOPLE[n.people].biomes[0]];
        const big = (D.BOON_SCALE ? D.BOON_SCALE[n.scale] || 1 : 1) * (n.mode === 'vassal' ? T.vassal : 1);
        Object.keys(b.resources).forEach((r) => {
          const rare = D.RESOURCES[r].rarity >= 1;
          if (rare && Math.random() > T.rare) return;
          const k = Math.max(1, Math.round((rare ? 1 : T.base) * big * Math.min(1, b.resources[r] / 2)));
          got[r] = (got[r] || 0) + k;
        });
      }
      if (got) {
        for (const r in got) AN.Profile.add(p, r, got[r]);
        const txt = Object.entries(got).map(([r, k]) => k + ' ' + D.RESOURCES[r].name).join(', ');
        AN.Bonds.log(p, 'Tribut (' + Na.realm(n.people) + ') : ' + txt + '.', 'civ');
        out.push({ people: n.people, got });
      }
    });
    return out;
  };
  /** Comptoir d'une nation ancrée, depuis la console : payé avec la réserve de l'Archive, renouvelé toutes les 30 minutes. */
  Na.archiveDeals = function (p, n) {
    const period = 30 * 60000;
    const slot = Math.floor(Date.now() / period);
    if (!n.deals || n.dealsSlot !== slot) {
      n.deals = Na.makeDeals(n.code + ':' + slot, n.primary, n.people, n.favor, n.scale).filter((d) => !d.get.egg);
      n.dealsSlot = slot;
    }
    return n.deals;
  };
  Na.archiveTrade = function (p, n, deal) {
    if (deal.stock <= 0) return 'fait';
    if (!AN.Profile.canPay(p, deal.give)) return 'manque';
    AN.Profile.pay(p, deal.give);
    const g = deal.get;
    if (g.res) for (const k in g.res) AN.Profile.add(p, k, g.res[k]);
    if (g.item) p.owned[g.item] = (p.owned[g.item] || 0) + g.n;
    deal.stock--;
    n.favor = Math.min(100, n.favor + 1);
    AN.Save.write(p);
    return 'ok';
  };
  /** Engager depuis la console pour la prochaine expédition (réserve de l'Archive). */
  Na.archiveHire = function (p, n, role) {
    p.mercs = p.mercs || [];
    if (p.mercs.length >= D.NATION.mercMax) return 'plein';
    if (n.favor < F().mercs || (role === 'champion' && n.favor < F().champion)) return 'faveur';
    const cost = Na.mercCost(n.people, role, n.scale);
    if (!AN.Profile.pay(p, cost)) return 'manque';
    p.mercs.push({ people: n.people, role });
    AN.Save.write(p);
    return 'ok';
  };
  Na.archiveGift = function (p, n) {
    const cost = { [D.PEOPLE[n.people].likes]: Math.round(8 * (D.BOON_SCALE ? D.BOON_SCALE[n.scale] || 1 : 1)) };
    if (!AN.Profile.pay(p, cost)) return 'manque';
    n.favor = Math.min(100, n.favor + 6);
    AN.Save.write(p);
    return 'ok';
  };
  /**
   * Demande d'une nation ancrée (1.13), depuis la console : une par tranche de 30 minutes.
   * Il leur manque une ressource commune que leur monde ne donne pas ; on l'envoie depuis
   * la réserve, ils rendent une ressource rare de leur monde et leur faveur monte.
   */
  Na.archiveRequest = function (p, n) {
    const slot = Math.floor(Date.now() / (30 * 60000));
    if (!n.request || n.request.slot !== slot) {
      const Q = D.NATION.request;
      const rng = AN.RNG.from(AN.hash(n.code + ':demande:' + slot), 'demande');
      const b = D.BIOME[n.primary] || D.BIOME[D.PEOPLE[n.people].biomes[0]];
      const lack = Object.keys(D.RESOURCES).filter((r) => D.RESOURCES[r].rarity === 0 && !b.resources[r] && r !== D.PEOPLE[n.people].likes);
      const rares = Object.keys(b.resources).filter((r) => D.RESOURCES[r].rarity >= 1 && r !== 'essence');
      const big = scaleMul(n.scale);
      n.request = { slot, res: rng.pick(lack.length ? lack : ['fibre']), n: Math.round(Q.amount * big), reward: { [rng.pick(rares.length ? rares : ['cristal'])]: Math.max(1, Math.round(Q.reward * big)) }, done: false };
    }
    return n.request;
  };
  Na.archiveFulfil = function (p, n) {
    const q = Na.archiveRequest(p, n);
    if (q.done) return 'fait';
    const cost = { [q.res]: q.n };
    if (!AN.Profile.canPay(p, cost)) return 'manque';
    AN.Profile.pay(p, cost);
    for (const k in q.reward) AN.Profile.add(p, k, q.reward[k]);
    q.done = true;
    n.favor = Math.min(100, n.favor + D.NATION.request.favor);
    AN.Bonds.log(p, Na.realm(n.people) + ' : vous leur envoyez ' + q.n + ' ' + D.RESOURCES[q.res].name + '. Ils vous en savent gré.', 'civ');
    AN.Save.write(p);
    return 'ok';
  };
  Na.requestPending = (p, n) => !Na.archiveRequest(p, n).done;
  Na.giftArchiveCost = (n) =>({ [D.PEOPLE[n.people].likes]: Math.round(8 * (D.BOON_SCALE ? D.BOON_SCALE[n.scale] || 1 : 1)) });

  /* ======================= Dessin ======================= */
  /** Le pavage d'une ville : la place, et des rues qui rayonnent vers les maisons. */
  Na.drawPlaza = function (ctx, X, v, t) {
    const P = D.PEOPLE[v.people];
    const T = Z.T;
    ctx.save();
    ctx.fillStyle = U.rgba('#d8d2c2', 0.55);
    ctx.beginPath(); ctx.arc(v.x, v.y, T * 3.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = U.rgba('#a8a090', 0.6); ctx.lineWidth = T * 0.9; ctx.lineCap = 'round';
    for (const b of v.buildings) {
      if (b.kind === 'house' && (b.seed % 3)) continue;
      ctx.beginPath(); ctx.moveTo(v.x, v.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.strokeStyle = U.rgba(P.body.trim, 0.5); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(v.x, v.y, T * 3.2, 0, TAU); ctx.stroke();
    // fontaine
    ctx.fillStyle = '#c8c0ae'; ctx.beginPath(); ctx.arc(v.x, v.y, T * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = U.rgba(P.body.mark, 0.7 + Math.sin(t * 2) * 0.1); ctx.beginPath(); ctx.arc(v.x, v.y, T * 0.4, 0, TAU); ctx.fill();
    ctx.restore();
  };
  /** Missions (1.13) : la cargaison perdue, et une bulle au-dessus du gouverneur qui a quelque chose à dire. */
  Na.drawWorld = function (ctx, X, t) {
    const nat = X.nation;
    if (!nat || Na.hostile(X)) return;
    const MOR = '#c08a2a';
    for (const m of Object.values(nat.missions || {})) {
      const c = m.crate;
      if (m.kind !== 'caravane' || !c || c.got || c.zi !== X.zi || c.x == null || !X.cam.visible(c.x, c.y, 60)) continue;
      const P = D.PEOPLE[nat.people];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0, 10, 20, 7, 0, 0, TAU); ctx.fill();
      ctx.rotate(-0.12);
      ctx.fillStyle = '#b08a5a'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 2;
      ctx.fillRect(-16, -12, 32, 22); ctx.strokeRect(-16, -12, 32, 22);
      ctx.strokeStyle = U.rgba(AN.INK, 0.5); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-16, -1); ctx.lineTo(16, -1); ctx.moveTo(-5, -12); ctx.lineTo(-5, 10); ctx.moveTo(5, -12); ctx.lineTo(5, 10); ctx.stroke();
      ctx.fillStyle = P.body.trim; ctx.beginPath(); ctx.arc(0, -1, 4, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = U.rgba(MOR, 0.6 + Math.sin(t * 4) * 0.3); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c.x, c.y, 30 + Math.sin(t * 3) * 3, 0, TAU); ctx.stroke();
    }
    const v = Na.cityOf(X, X.zone);
    if (!v || v.capital) return;
    const G = X.civils.find((e) => e.alive && e.npc && e.npc.governor);
    const m = G ? Na.mission(X, X.zi) : null;
    const mark = !m ? null : m.state === 'offer' ? '!' : m.state === 'ready' ? '?' : null;
    if (!G || !mark || !X.cam.visible(G.x, G.y, 60)) return;
    const bob = Math.sin(t * 3) * 3;
    const y = G.y - G.r - 26 + bob;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(G.x, y, 10, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = MOR; ctx.font = '800 13px ' + AN.FONT_UI; ctx.textAlign = 'center';
    ctx.fillText(mark, G.x, y + 5);
  };
  /** Flèche dorée vers la cargaison, ou vers le gouverneur qui attend (écran). */
  Na.drawCompass = function (ctx, X, t) {
    const q = Na.compassTarget(X);
    if (!q) return;
    const cam = X.cam;
    const p = X.player;
    const s = cam.worldToScreen(q.x, q.y);
    const W = cam.W, H = cam.H;
    if (s.x > 30 && s.y > 30 && s.x < W - 30 && s.y < H - 30) return; // à l'écran : la cargaison brille déjà
    const ps = cam.worldToScreen(p.x, p.y);
    const a = Math.atan2(s.y - ps.y, s.x - ps.x);
    const r = 92 + Math.sin(t * 4) * 4;
    ctx.save();
    ctx.translate(ps.x + Math.cos(a) * r, ps.y + Math.sin(a) * r); ctx.rotate(a);
    ctx.fillStyle = '#c08a2a'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-7, -8); ctx.lineTo(-2, 0); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-a);
    ctx.font = '600 11px ' + AN.FONT_UI; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    const txt = q.label + ' · ' + Math.round(U.dist(p.x, p.y, q.x, q.y) / Z.T) + ' m';
    const ty = Math.sin(a) > 0.3 ? 24 : -16;
    ctx.strokeText(txt, 0, ty); ctx.fillStyle = AN.INK; ctx.fillText(txt, 0, ty);
    ctx.restore();
  };
  /** Marques sur la mini-carte (k : échelle de la mini-carte). */
  Na.drawMinimap = function (ctx, X, k, t) {
    const q = Na.compassTarget(X);
    if (!q) return;
    ctx.strokeStyle = '#c08a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(q.x * k, q.y * k, 3.5 + Math.sin(t * 5), 0, TAU); ctx.stroke();
  };

  /** Le nom de la ville, au-dessus de la place, quand on approche. */
  Na.drawCity = function (ctx, X, v, t) {
    const d = U.dist(v.x, v.y, X.player.x, X.player.y);
    const a = U.clamp(1 - (d - v.r) / 300, 0, 1);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '600 15px ' + AN.FONT_SERIF; ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(247,248,247,0.9)';
    const txt = (v.capital ? 'Capitale · ' : '') + v.name;
    ctx.strokeText(txt, v.x, v.y - Z.T * 3.6); ctx.fillStyle = AN.INK; ctx.fillText(txt, v.x, v.y - Z.T * 3.6);
    if (X.nation && Na.hostile(X)) { ctx.font = '600 11px ' + AN.FONT_UI; ctx.fillStyle = AN.STAMP; ctx.fillText('portes fermées', v.x, v.y - Z.T * 3.6 + 16); }
    ctx.restore();
  };
})();
