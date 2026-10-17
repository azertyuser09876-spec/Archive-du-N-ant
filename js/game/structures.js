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
  St.list = function (p) {
    const L = (p.structures = p.structures || []);
    // les arches des peuples (civs.js) occupent aussi un emplacement autour de l'Artefact
    L.forEach((s) => { if (s.kind === 'arche' && s.slot == null) { const used = new Set(L.filter((o) => o.slot != null).map((o) => o.slot)); for (let i = D.STRUCT_SLOTS.length - 1; i >= 0; i--) if (!used.has(i)) { s.slot = i; break; } } });
    return L;
  };
  /** Structures en service : bâties, une seule par type. */
  St.active = function (p) {
    const seen = new Set();
    return St.list(p).filter((s) => {
      if (s.slot == null || seen.has(s.id) || !D.STRUCTURES[s.id]) return false;
      seen.add(s.id);
      return true;
    });
  };
  St.statOf = function (s) {
    const def = D.STRUCTURES[s.id];
    return def.kind === 'build' ? def.levels[Math.max(0, (s.level || 1) - 1)].stat : def.stat;
  };
  St.textOf = function (s) {
    const def = D.STRUCTURES[s.id];
    return def.kind === 'build' ? def.levels[Math.max(0, (s.level || 1) - 1)].text : def.text;
  };
  /** Effets réunis (ajoutés aux pouvoirs du profil). */
  St.powers = function (p) {
    const out = { storage: 0, offline: 0, collect: 0, craftCost: 0, breed: 0, heal: 0, scan: 0, dest: 0, loyalty: 0, xp: 0, transfer: 0, cargo: 0, prod: 0, consMax: 0, regen: 0, links: 0, sweep: 0, hp: 0, armor: 0 };
    St.active(p).forEach((s) => {
      const st = St.statOf(s);
      for (const k in st) out[k] = k === 'collect' ? Math.max(out[k], st[k]) : (out[k] || 0) + st[k];
    });
    return out;
  };
  St.usedSlots = (p) => new Set(St.list(p).filter((s) => s.slot != null).map((s) => s.slot));
  St.freeSlot = function (p) {
    const used = St.usedSlots(p);
    for (let i = 0; i < D.STRUCT_SLOTS.length; i++) if (!used.has(i)) return i;
    return null;
  };
  St.built = (p, id) => St.list(p).find((s) => s.id === id && s.slot != null) || null;
  St.costMult = (p) => AN.Profile.craftMult(p);

  /** Bâtir un bâtiment, ou l'améliorer s'il existe. Renvoie un message d'erreur, ou null. */
  St.build = function (p, id) {
    const def = D.STRUCTURES[id];
    const cur = St.built(p, id);
    const lv = cur ? cur.level || 1 : 0;
    if (lv >= def.levels.length) return 'Niveau maximal.';
    const slot = cur ? cur.slot : St.freeSlot(p);
    if (slot == null) return 'Plus de place autour de l’Artefact : rangez une structure.';
    const cost = AN.Profile.scaledCost(def.levels[lv].cost, St.costMult(p));
    if (!AN.Profile.pay(p, cost)) return 'Ressources insuffisantes.';
    if (cur) cur.level = lv + 1;
    else St.list(p).push({ uid: U.uid('s'), id, level: 1, slot, built: Date.now() });
    AN.Bonds && AN.Bonds.log && AN.Bonds.log(p, (cur ? 'Amélioration : ' : 'Construction : ') + def.name + (cur ? ', niveau ' + (lv + 1) : '') + '.', 'build');
    AN.Save.write(p);
    return null;
  };
  /** Reconstruire une structure rapportée d'un monde. */
  St.rebuild = function (p, s) {
    const def = D.STRUCTURES[s.id];
    if (s.slot != null) return null;
    const slot = St.freeSlot(p);
    if (slot == null) return 'Plus de place autour de l’Artefact : rangez une structure.';
    const cost = AN.Profile.scaledCost(def.rebuild, St.costMult(p));
    if (!AN.Profile.pay(p, cost)) return 'Ressources insuffisantes.';
    s.slot = slot;
    s.level = 1;
    s.built = Date.now();
    AN.Bonds && AN.Bonds.log && AN.Bonds.log(p, 'Reconstruction : ' + def.name + ', rapportée de ' + ((s.origin && s.origin.world) || 'un monde détruit') + '.', 'build');
    AN.Save.write(p);
    return null;
  };
  /** Ranger : la structure quitte son emplacement (et cesse d'agir), sans rien perdre. */
  St.store = function (p, s) { s.slot = null; AN.Save.write(p); };
  /** Reposer une structure rangée (bâtiment déjà payé) : gratuit pour un bâtiment, reconstruction pour une trouvaille jamais bâtie. */
  St.place = function (p, s) {
    if (s.slot != null) return null;
    if (D.STRUCTURES[s.id].kind === 'found' && !s.built) return St.rebuild(p, s);
    const slot = St.freeSlot(p);
    if (slot == null) return 'Plus de place autour de l’Artefact.';
    s.slot = slot;
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
    AN.Save.write(p);
    return back;
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
      if (Math.random() < 0.35) {
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
  St.afterExtraction = function (prof, X) {
    const out = [];
    X.cargo.forEach((c) => {
      if (!c.structure) return;
      const s = { uid: U.uid('s'), id: c.structure, level: 1, slot: null, origin: { world: c.world || X.world.code, zone: AN.Expedition.zoneSpec(X, c.zone).name } };
      St.list(prof).push(s);
      out.push(s);
    });
    return out;
  };

  /* ======================= Archive ======================= */
  St.positions = function (p) {
    return St.list(p).filter((s) => s.slot != null && D.STRUCT_SLOTS[s.slot]).map((s) => ({ s, x: D.STRUCT_SLOTS[s.slot].x, y: D.STRUCT_SLOTS[s.slot].y }));
  };
  /** Entités de dessin, triées avec les créatures. */
  St.drawables = function (p) {
    return St.positions(p).map((o) => ({ kind: 'struct', s: o.s, x: o.x, y: o.y + St.SIZE * 0.6, ax: o.x, ay: o.y }));
  };
  St.drawArchive = function (ctx, e, t, active) {
    AN.StructArt.draw(ctx, e.s.id, e.ax, e.ay, St.SIZE, t, { level: e.s.level || 1, alpha: active ? 1 : 0.55 });
  };
  St.nearest = function (p, x, y) {
    let best = null, bd = 1e9;
    for (const o of St.positions(p)) { const d = U.dist(o.x, o.y, x, y); if (d < St.SIZE + 40 && d < bd) { bd = d; best = o; } }
    return best;
  };
  /** Le joueur contourne les bâtiments. */
  St.collide = function (p, pl) {
    for (const o of St.positions(p)) {
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
