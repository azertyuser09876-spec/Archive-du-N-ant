/* Structures (1.4).
   - Dans l'Archive : des bâtiments à construire autour de l'Artefact
     (entrepôt, collecteur, forge, couveuse…), améliorables, et les structures
     rapportées des mondes, à reconstruire. Leurs effets rejoignent les pouvoirs
     du profil (AN.Profile.powers).
   - Dans les mondes : une structure par zone, parfois. On la fouille, puis,
     avec un outil de transport, on la démonte et on l'emporte dans la soute. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const FX = AN.FX;
  const TAU = Math.PI * 2;

  const St = (AN.Structures = {});
  St.SIZE = 36; // rayon d'un bâtiment dans l'Archive

  /* ======================= Profil ======================= */
  /*
   * Depuis la 1.9, les bâtiments ne sont plus autour de l'Artefact (l'hexagone
   * central part en expédition) : chacun se dresse sur une case d'un
   * territoire (s.terr : uid du territoire, s.cell : rang de la case dans sa
   * forme) et le suit quand on l'agence ou qu'il change de forme. Un paysage
   * qui lui convient ajoute un bonus (def.bonus). Les arches des peuples
   * (kind 'arche') ne sont pas des bâtiments : elles se dressent près de leur peuple.
   */
  St.list = function (p) { return (p.structures = p.structures || []); };
  St.terrOf = (p, s) => (s && s.terr ? p.territories.find((t) => t.uid === s.terr) || null : null);
  St.placed = (p, s) => !!St.terrOf(p, s);
  /** Structures en service : posées, une seule par type. */
  St.active = function (p) {
    const seen = new Set();
    return St.list(p).filter((s) => {
      if (!D.STRUCTURES[s.id] || seen.has(s.id) || !St.placed(p, s)) return false;
      seen.add(s.id);
      return true;
    });
  };
  /** Le paysage de ce territoire convient-il à la structure ? */
  St.suits = function (id, t) {
    const def = D.STRUCTURES[id];
    if (!def || !def.bonus || !t) return false;
    if (def.kind === 'found') return def.biomes.includes(t.biome) || (!!t.mix && def.biomes.includes(t.mix));
    const tags = D.BIOME[t.biome] ? D.BIOME[t.biome].tags : [];
    const mix = t.mix && D.BIOME[t.mix] ? D.BIOME[t.mix].tags : [];
    return def.bonus.tags.some((g) => tags.includes(g) || mix.includes(g));
  };
  St.hasBonus = (p, s) => St.suits(s.id, St.terrOf(p, s));
  St.baseStat = function (s) {
    const def = D.STRUCTURES[s.id];
    return def.kind === 'build' ? def.levels[Math.max(0, (s.level || 1) - 1)].stat : def.stat;
  };
  /** Effets d'une structure, bonus du paysage compris (si le profil est donné). */
  St.statOf = function (s, p) {
    const st = Object.assign({}, St.baseStat(s));
    if (p && St.hasBonus(p, s)) { const b = D.STRUCTURES[s.id].bonus.stat; for (const k in b) st[k] = (st[k] || 0) + b[k]; }
    return st;
  };
  St.textOf = function (s, p) {
    const def = D.STRUCTURES[s.id];
    const base = def.kind === 'build' ? def.levels[Math.max(0, (s.level || 1) - 1)].text : def.text;
    return base + (p && St.hasBonus(p, s) ? ' ; ' + def.bonus.text : '');
  };
  /** Effets réunis (ajoutés aux pouvoirs du profil). */
  St.powers = function (p) {
    const out = { storage: 0, offline: 0, collect: 0, craftCost: 0, breed: 0, heal: 0, scan: 0, dest: 0, loyalty: 0, xp: 0, transfer: 0, cargo: 0, prod: 0, consMax: 0, regen: 0, links: 0, sweep: 0, hp: 0, armor: 0,
      guards: 0, lore: 0, astres: 0, mood: 0, feed: 0, buildCost: 0, defSlots: 0 };
    St.active(p).forEach((s) => {
      const st = St.statOf(s, p);
      for (const k in st) out[k] = k === 'collect' ? Math.min(1, Math.max(out[k], st[k])) : (out[k] || 0) + st[k];
    });
    return out;
  };
  St.built = (p, id) => St.list(p).find((s) => s.id === id && St.placed(p, s)) || null;
  /** Coûts des constructions : ceux de l'Atelier, et le chantier. */
  St.costMult = (p) => Math.max(0.5, AN.Profile.craftMult(p) - St.powers(p).buildCost);

  /** Bâtiments qu'un territoire peut accueillir, et ceux qu'il porte. */
  St.capacity = (t) => D.buildingCapacity(AN.Shapes.cellsOf(t).length);
  St.on = (p, t) => St.list(p).filter((s) => s.terr === t.uid && D.STRUCTURES[s.id]);
  St.room = (p, t, except) => St.capacity(t) - St.on(p, t).filter((s) => s !== except).length;
  /** Case libre d'un territoire : pas d'autre bâtiment, et de préférence pas de village. */
  St.freeCell = function (p, t, except) {
    const n = AN.Shapes.cellsOf(t).length;
    const used = new Set(St.on(p, t).filter((s) => s !== except).map((s) => s.cell % n));
    const village = new Set((p.settlements || []).filter((st) => st.home === t.uid).map((st) => AN.hash(st.uid) % n));
    let best = null;
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      if (!village.has(i)) return i;
      if (best == null) best = i;
    }
    return best;
  };
  /** Meilleur territoire pour une structure : un paysage qui lui convient, de la place, près du centre. */
  St.bestTerritory = function (p, id, except) {
    let best = null, bs = -1e9;
    p.territories.forEach((t) => {
      if (St.room(p, t, except) <= 0) return;
      const c = AN.Shapes.centroid(t);
      const sc = (St.suits(id, t) ? 1e6 : 0) + St.room(p, t, except) * 1e3 - Math.hypot(c.x, c.y) / 100;
      if (sc > bs) { bs = sc; best = t; }
    });
    return best;
  };
  function settle(p, s, t) {
    St.changed();
    s.terr = t.uid;
    s.cell = St.freeCell(p, t, s);
    delete s.slot;
  }
  function pickTerritory(p, id, terrUid, s) {
    const t = terrUid ? p.territories.find((x) => x.uid === terrUid) : St.bestTerritory(p, id, s);
    if (!t) return { why: p.territories.length ? 'Aucun territoire n’a de place : rapportez de nouveaux territoires, ou rangez un bâtiment.' : 'Il faut d’abord un territoire dans l’Archive pour y bâtir.' };
    if (St.room(p, t, s) <= 0) return { why: 'Ce territoire n’a plus de place (' + St.capacity(t) + ' bâtiment' + (St.capacity(t) > 1 ? 's' : '') + ' au plus).' };
    return { t };
  }

  /** Bâtir un bâtiment, ou l'améliorer s'il existe. terrUid : le territoire choisi (sinon le meilleur). Renvoie un message d'erreur, ou null. */
  St.build = function (p, id, terrUid) {
    const def = D.STRUCTURES[id];
    const cur = St.built(p, id);
    const lv = cur ? cur.level || 1 : 0;
    if (lv >= def.levels.length) return 'Niveau maximal.';
    let t = null;
    if (!cur) { const r = pickTerritory(p, id, terrUid, null); if (r.why) return r.why; t = r.t; }
    const cost = AN.Profile.scaledCost(def.levels[lv].cost, St.costMult(p));
    if (!AN.Profile.pay(p, cost)) return 'Ressources insuffisantes.';
    if (cur) cur.level = lv + 1;
    else { const s = { uid: U.uid('s'), id, level: 1, built: Date.now() }; settle(p, s, t); St.list(p).push(s); St.lastBuilt = s; }
    AN.Bonds && AN.Bonds.log && AN.Bonds.log(p, (cur ? 'Amélioration : ' : 'Construction : ') + def.name + (cur ? ', niveau ' + (lv + 1) : ', ' + D.BIOME[t.biome].name.toLowerCase()) + '.', 'build');
    AN.Save.write(p);
    return null;
  };
  /** Reconstruire une structure rapportée d'un monde. */
  St.rebuild = function (p, s, terrUid) {
    const def = D.STRUCTURES[s.id];
    if (St.placed(p, s)) return null;
    const r = pickTerritory(p, s.id, terrUid, s);
    if (r.why) return r.why;
    const cost = AN.Profile.scaledCost(def.rebuild, St.costMult(p));
    if (!AN.Profile.pay(p, cost)) return 'Ressources insuffisantes.';
    settle(p, s, r.t);
    s.level = 1;
    s.built = Date.now();
    St.lastBuilt = s;
    AN.Bonds && AN.Bonds.log && AN.Bonds.log(p, 'Reconstruction : ' + def.name + ', rapportée de ' + ((s.origin && s.origin.world) || 'un monde détruit') + '.', 'build');
    AN.Save.write(p);
    return null;
  };
  /** Ranger : la structure quitte son territoire (et cesse d'agir), sans rien perdre. */
  St.store = function (p, s) { St.changed(); s.terr = null; s.cell = null; delete s.slot; AN.Save.write(p); };
  /** Reposer une structure rangée (bâtiment déjà payé) : gratuit pour un bâtiment, reconstruction pour une trouvaille jamais bâtie. */
  St.place = function (p, s, terrUid) {
    if (St.placed(p, s)) return null;
    if (D.STRUCTURES[s.id].kind === 'found' && !s.built) return St.rebuild(p, s, terrUid);
    const r = pickTerritory(p, s.id, terrUid, s);
    if (r.why) return r.why;
    settle(p, s, r.t);
    St.lastBuilt = s;
    AN.Save.write(p);
    return null;
  };
  /** Déplacer une structure posée vers un autre territoire (gratuit). */
  St.move = function (p, s, terrUid) {
    if (s.terr === terrUid) return null;
    const r = pickTerritory(p, s.id, terrUid, s);
    if (r.why) return r.why;
    settle(p, s, r.t);
    AN.Save.write(p);
    return null;
  };
  /** Recycler : la structure disparaît, la moitié de son coût revient. */
  St.recycle = function (p, s) {
    const def = D.STRUCTURES[s.id];
    const base = def.kind === 'build' ? def.levels[0].cost : def.rebuild;
    const back = {};
    for (const k in base) { const n = Math.floor(base[k] / 2); if (n > 0) back[k] = n; }
    for (const k in back) AN.Profile.add(p, k, back[k]);
    p.structures = St.list(p).filter((x) => x !== s);
    St.changed();
    AN.Save.write(p);
    return back;
  };

  /**
   * Migration (format 6) : les bâtiments posés autour de l'Artefact rejoignent
   * chacun le territoire qui leur convient le mieux ; faute de place, ils sont
   * rangés (ni perdus ni à repayer). Les arches perdent leur emplacement.
   */
  St.migrate = function (p) {
    const L = St.list(p);
    // les bâtiments d'abord, puis les trouvailles ; chacun choisit le meilleur territoire libre
    const order = L.filter((s) => s.slot != null && D.STRUCTURES[s.id]).sort((a, b) => (D.STRUCTURES[a.id].kind === 'build' ? 0 : 1) - (D.STRUCTURES[b.id].kind === 'build' ? 0 : 1) || a.slot - b.slot);
    order.forEach((s) => {
      s.built = s.built || Date.now();
      const t = St.bestTerritory(p, s.id, s);
      if (t) settle(p, s, t);
      else { s.terr = null; s.cell = null; }
      delete s.slot;
    });
    L.forEach((s) => { delete s.slot; if (s.terr === undefined) s.terr = null; });
    return p;
  };

  /* ======================= Expédition ======================= */
  St.weightOf = (X, id) => Math.max(1, D.STRUCTURES[id].weight - ((X.T && X.T.structLight) || 0));

  function candidates(X) {
    const out = [];
    const s = X.zone.structure;
    if (s && !s.taken) out.push(s);
    if (X.eventStruct && !X.eventStruct.taken && X.eventStruct.zi === X.zi) out.push(X.eventStruct);
    return out;
  }

  St.interactables = function (X, consider) {
    const p = X.player;
    for (const s of candidates(X)) {
      const def = D.STRUCTURES[s.id];
      const d = U.dist(s.x, s.y, p.x, p.y);
      consider(d, 70, () => {
        if (!s.searched) return { kind: 'struct_search', target: s, text: 'Fouiller : ' + def.name + (s.ghost ? ' (écho)' : ''), hold: 0.7 };
        const w = St.weightOf(X, s.id);
        if (!X.T || !X.T.dismantle) return { kind: 'struct_locked', target: s, locked: true, text: def.name + ' : un kit de démontage permettrait de l’emporter', hold: 0.3 };
        return { kind: 'struct_take', target: s, text: 'Démonter et emporter : ' + def.name + ' (' + w + ' place' + (w > 1 ? 's' : '') + ')', hold: 2.4 };
      });
    }
  };

  St.interact = function (X, it) {
    const s = it.target;
    const def = s && D.STRUCTURES[s.id];
    if (it.kind === 'struct_search') {
      s.searched = true;
      const b = D.BIOME[X.zone.biome];
      const drops = {};
      Object.keys(b.resources).forEach((k) => (drops[k] = 2 + Math.floor(Math.random() * 3)));
      if (Math.random() < 0.3) drops.essence = 1;
      AN.Combat.drop(X, s.x, s.y + 20, drops, 1);
      AN.Audio.play('ui_ok');
      AN.HUD.toast(def.name + ' : ' + def.desc + (X.T && X.T.dismantle ? ' Maintenez E pour la démonter et l’emporter.' : ' Avec un kit de démontage, on pourrait l’emporter et la reconstruire dans l’Archive.'), 7);
      if (Math.random() < 0.35 + St.powers(X.profile).lore) {
        const unknown = D.LORE.filter((l) => !X.profile.lore.includes(l.id));
        if (unknown.length) { const L = unknown[Math.floor(Math.random() * unknown.length)]; X.profile.lore.push(L.id); AN.Save.write(X.profile); setTimeout(() => AN.UI.lore(L), 600); }
      }
      return true;
    }
    if (it.kind === 'struct_locked') {
      AN.Audio.play('ui_err');
      AN.HUD.toast('Pour emporter ' + def.name + ', équipez un Kit de démontage ou un Traîneau du néant (Atelier, outils de transport).', 5);
      return true;
    }
    if (it.kind === 'struct_take') {
      const w = St.weightOf(X, s.id);
      if (X.cargoUsed() + w > X.cargoCap) { AN.Audio.play('ui_err'); AN.HUD.toast('Soute pleine : ' + def.name + ' occupe ' + w + ' places.'); return true; }
      s.taken = true;
      X.cargo.push({ structure: s.id, weight: w, zone: X.zi, world: X.world.code });
      FX.burst(s.x, s.y, def.color, 40, 260, { size: 4 });
      FX.ring(s.x, s.y, AN.CYAN, 10, 120, 0.7, 4);
      FX.stream(s.x, s.y, X.player.x, X.player.y, '#ffffff', { life: 0.6, size: 6 });
      AN.Audio.play('capture_ok');
      AN.HUD.toast(def.name + ' démontée : elle sera reconstruite dans l’Archive (' + def.text.toLowerCase() + ').', 6);
      return true;
    }
    return false;
  };

  St.drawWorld = function (ctx, X, t) {
    for (const s of candidates(X)) {
      if (!X.cam.visible(s.x, s.y, 80)) continue;
      St.drawFound(ctx, s, t, X.zone.biome);
      if (X.holdKey && X.holdKey.startsWith('struct_take:') && X.holdT > 0) {
        ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(s.x, s.y, 46, -Math.PI / 2, -Math.PI / 2 + TAU * U.clamp(X.holdT / 2.4, 0, 1)); ctx.stroke();
      }
    }
  };
  St.drawFound = function (ctx, s, t, biome) {
    AN.StructArt.draw(ctx, s.id, s.x, s.y - 6, 34, t, { ruined: !s.ghost, ghost: s.ghost, biome, seed: s.seed || 0, alpha: s.ghost ? (s.fade != null ? s.fade : 1) : 1 });
    if (!s.searched) {
      ctx.fillStyle = AN.CYAN;
      ctx.beginPath(); ctx.arc(s.x + 30, s.y - 38 + Math.sin(t * 3) * 2, 4, 0, TAU); ctx.fill();
    }
  };
  St.drawMinimap = function (ctx, X, k, seen) {
    for (const s of candidates(X)) {
      if (!s.ghost && !seen(s.x, s.y)) continue;
      ctx.fillStyle = D.STRUCTURES[s.id].color; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.fillRect(s.x * k - 3.5, s.y * k - 3.5, 7, 7); ctx.strokeRect(s.x * k - 3.5, s.y * k - 3.5, 7, 7);
    }
  };

  /** À l'extraction : les structures de la soute rejoignent les réserves de l'Archive. */
  St.afterExtraction = function (prof, X, list) {
    const out = [];
    (list || X.cargo).forEach((c) => {
      if (!c.structure) return;
      const s = { uid: U.uid('s'), id: c.structure, level: 1, terr: null, origin: { world: c.world || X.world.code, zone: AN.Expedition.zoneSpec(X, c.zone).name } };
      St.list(prof).push(s);
      out.push(s);
    });
    return out;
  };

  /* ======================= Archive ======================= */
  /** Position d'une structure posée : le centre de sa case, ou le bord si un village y vit. */
  // positions gardées un instant : elles ne changent qu'avec l'agencement ou les constructions
  let posMemo = null;
  St.version = 0;
  St.changed = () => { St.version++; posMemo = null; };
  St.positions = function (p) {
    const now = AN.Game && AN.Game.clock ? AN.Game.clock() : Date.now();
    if (posMemo && posMemo.p === p && posMemo.v === St.version && now - posMemo.at < 500) return posMemo.list;
    const out = [];
    const H = AN.Hex;
    const tmap = new Map(p.territories.map((t) => [t.uid, t]));
    St.list(p).forEach((s) => {
      const t = s.terr && tmap.get(s.terr);
      if (!t || !D.STRUCTURES[s.id]) return;
      const cs = AN.Shapes.centers(t);
      const i = (s.cell || 0) % cs.length;
      const c = cs[i];
      const village = (p.settlements || []).some((st) => st.home === t.uid && AN.hash(st.uid) % cs.length === i);
      const a = (AN.hash(s.uid) % 628) / 100;
      const r = village ? H.R * 0.62 : H.R * 0.12;
      out.push({ s, t, x: Math.round(c.x + Math.cos(a) * r), y: Math.round(c.y + Math.sin(a) * r * 0.8) });
    });
    posMemo = { p, v: St.version, at: now, list: out };
    return out;
  };
  /** Où se dresse une arche emportée : près de son peuple, sinon sur le premier territoire. */
  St.archePos = function (p, s, settle) {
    const L = (settle || []).find((o) => o.st.people === s.people);
    if (L) return { x: L.x + L.r * 0.95, y: L.y - L.r * 0.35 };
    const t = p.territories[0];
    if (t) { const c = AN.Shapes.centers(t)[0]; return { x: c.x - AN.Hex.R * 0.5, y: c.y + AN.Hex.R * 0.2 }; }
    return null;
  };
  /** Entités de dessin, triées avec les créatures. */
  St.drawables = function (p) {
    return St.positions(p).map((o) => ({ kind: 'struct', s: o.s, x: o.x, y: o.y + St.SIZE * 0.6, ax: o.x, ay: o.y }));
  };
  /** Un bâtiment qui vient d'être posé sort de terre (pas enregistré avec la partie). */
  const rising = new Map();
  St.rise = (s) => { if (s) rising.set(s.uid, performance.now()); };
  St.drawArchive = function (ctx, e, t, active) {
    const t0 = rising.get(e.s.uid);
    let k = 1;
    if (t0 != null) { k = U.clamp((performance.now() - t0) / 1200, 0, 1); if (k >= 1) rising.delete(e.s.uid); }
    AN.StructArt.draw(ctx, e.s.id, e.ax, e.ay, St.SIZE * (0.2 + 0.8 * U.easeOut(k)), t, { level: e.s.level || 1, alpha: (active ? 1 : 0.55) * Math.min(1, 0.2 + k * 2) });
  };
  St.nearest = function (p, x, y) {
    let best = null, bd = 1e9;
    for (const o of St.positions(p)) { const d = U.dist(o.x, o.y, x, y); if (d < St.SIZE + 40 && d < bd) { bd = d; best = o; } }
    return best;
  };
  /** Le joueur contourne les bâtiments. */
  St.collide = function (p, pl, list) {
    for (const o of list || St.positions(p)) {
      const dx = pl.x - o.x, dy = pl.y - (o.y + 6), d = Math.hypot(dx, dy), r = St.SIZE * 0.8 + 10;
      if (d < r && d > 0.01) { pl.x = o.x + (dx / d) * r; pl.y = o.y + 6 + (dy / d) * r; }
    }
  };
  /** Collecteur : ramasse la production chaque minute. */
  St.tick = function (A, minutes) {
    const pw = St.powers(A.profile);
    if (!pw.collect) return null;
    if (AN.Archive.returnPickups) AN.Archive.returnPickups();
    const got = AN.Production.collectAll(A.profile, pw.collect);
    return U.sumValues(got) > 0 ? got : null;
  };
})();
