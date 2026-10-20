/* Affichage tête haute (HTML par-dessus le canevas) : expédition et Archive. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const h = AN.h;

  const HUD = (AN.HUD = { ready: false, root: null, els: {}, mode: null, toasts: [] });

  HUD.init = function () {
    HUD.root = document.getElementById('hud');
    HUD.toastBox = document.getElementById('toasts');
    HUD.ready = true;
  };

  HUD.clear = function () {
    AN.clear(HUD.root);
    HUD.els = {};
    HUD.mode = null;
  };

  /* ---------- messages ---------- */
  HUD.toast = function (text, secs = 3.5) {
    if (!HUD.toastBox) return;
    if (HUD.toasts.some((t) => t.text === text)) return;
    const el = h('div', { class: 'toast', role: 'status' }, text);
    HUD.toastBox.appendChild(el);
    const item = { el, text };
    HUD.toasts.push(item);
    while (HUD.toasts.length > 3) { const o = HUD.toasts.shift(); o.el.remove(); }
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => { el.remove(); HUD.toasts = HUD.toasts.filter((x) => x !== item); }, 400);
    }, secs * 1000);
  };

  /* Écritures de l'affichage tête haute : seulement quand la valeur change (1.8.2) */
  function setText(el, v) { v = AN.Util.typo(v); if (el && el.textContent !== v) el.textContent = v; }
  function setTf(el, v) { if (el && el._tf !== v) { el._tf = v; el.style.transform = v; } }

  HUD.prompt = function (p) {
    let el = HUD.els.prompt;
    if (!el) return;
    if (!p) { if (!el.hidden) el.hidden = true; HUD.lastPrompt = null; return; }
    if (el.hidden) el.hidden = false;
    const key = p.text + '|' + (p.locked ? 1 : 0);
    if (HUD.lastPrompt !== key) {
      HUD.lastPrompt = key;
      AN.clear(el);
      el.appendChild(h('kbd', null, AN.Input.label('KeyE')));
      el.appendChild(h('span', null, p.text));
      el.appendChild(h('i', { class: 'prompt-fill' }));
      el.classList.toggle('locked', !!p.locked);
    }
    setTf(el.lastChild, 'scaleX(' + U.clamp(p.progress || 0, 0, 1) + ')');
  };

  HUD.hurt = function () {
    if (AN.Pad) AN.Pad.rumble(0.45, 120);
    const el = document.getElementById('hurt');
    if (!el) return;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
  };

  /** Rappel des commandes, avec les touches réellement configurées. */
  HUD.helpText = function (X) {
    const L = AN.Input.label;
    if (AN.Input.lastDevice === 'tactile' || AN.Input.lastDevice === 'manette') return '';
    return AN.Input.moveKeys() + ' bouger · clic gauche tirer · clic droit frapper · ' + L('Space') + ' esquiver' + (X.echelon && X.echelon.move === 'leap' ? ' (maintenir : sauter)' : '') + ' · ' + L('KeyF') + ' capturer · ' + L('KeyE') + ' interagir · ' + L('KeyQ') + ' capacité (molette : changer) · ' + L('KeyG') + ' appel · ' + L('KeyR') + ' monture · ' + L('Tab') + ' sac · ' + L('KeyX') + ' (maintenir) urgence';
  };

  /* ======================= Expédition ======================= */
  HUD.showExpedition = function (X) {
    HUD.clear();
    HUD.mode = 'expedition';
    const E = HUD.els;
    const w = X.world;
    E.where = h('div', { class: 'card hud-where' },
      h('div', { class: 'where-code' }, w.code),
      E.zoneName = h('div', { class: 'where-zone' }, ''),
      h('div', { class: 'threat', title: 'Menace' }, 'Menace ', ...Array.from({ length: 7 }, (_, i) => h('b', { class: i < w.threat ? 'on' : '' }))),
      E.eventLine = h('div', { class: 'where-event', hidden: true }),
      E.missionLine = h('div', { class: 'where-event mission', hidden: true }), // raid ou mission d'une nation (1.13)
    );
    // la minicarte de la zone, et sous elle la carte de l'échelon : où l'on se trouve (1.10) ; au toucher, l'une ou l'autre
    E.mapBox = h('div', { class: 'card hud-map', onclick: () => { if (document.body.classList.contains('touch-on')) { E.mapBox.classList.toggle('where-on'); drawWhere(X); } } },
      E.map = h('canvas', { width: 190, height: 190 }), E.whereMap = h('canvas', { class: 'where', width: 190, height: 100 }), E.mapLabel = h('div', { class: 'map-label' }, ''));
    E.hp = h('div', { class: 'hp' }, E.hpFill = h('i'), E.hpText = h('span'));
    E.dash = h('div', { class: 'dash' });
    E.mountRow = h('div', { class: 'mount-row', hidden: true }, E.mountName = h('span', { class: 'lbl' }), E.mountBar = h('div', { class: 'bar cargo' }, h('i')));
    E.baseRow = h('div', { class: 'mount-row base-row', hidden: !X.base }, E.baseName = h('span', { class: 'lbl' }, 'Hexagone'), E.baseBar = h('div', { class: 'bar cargo' }, h('i')));
    E.vitals = h('div', { class: 'card hud-vitals' }, h('div', { class: 'lbl' }, 'Intégrité'), E.hp, E.mountRow, E.baseRow, h('div', { class: 'row' }, E.dash, E.weapons = h('div', { class: 'weapons' })));
    E.abil = h('div', { class: 'card hud-abil', hidden: true });
    E.cons = h('div', { class: 'hud-cons' });
    E.loot = h('div', { class: 'card hud-loot' },
      h('div', { class: 'meter' }, h('span', { class: 'lbl' }, 'Sac'), E.bagBar = h('div', { class: 'bar' }, h('i')), E.bagText = h('span', { class: 'num' })),
      h('div', { class: 'meter' }, h('span', { class: 'lbl' }, 'Soute'), E.cargoBar = h('div', { class: 'bar cargo' }, h('i')), E.cargoText = h('span', { class: 'num' })),
      E.value = h('div', { class: 'stake' }),
    );
    E.prompt = h('div', { class: 'prompt', hidden: true });
    E.boss = h('div', { class: 'bossbar', hidden: true }, E.bossName = h('div', { class: 'boss-name' }), h('div', { class: 'bar' }, E.bossFill = h('i')), E.bossPhase = h('div', { class: 'boss-phase' }));
    E.collapse = h('div', { class: 'collapsebar', hidden: true }, E.colText = h('div'), h('div', { class: 'bar' }, E.colFill = h('i')), E.colTime = h('div', { class: 'small' }));
    E.emerg = h('div', { class: 'emerg', hidden: true }, 'Extraction d’urgence…', h('div', { class: 'bar' }, E.emFill = h('i')));
    E.help = h('div', { class: 'hud-help' }, HUD.helpText(X));
    [E.where, E.mapBox, E.vitals, E.abil, E.cons, E.loot, E.prompt, E.boss, E.collapse, E.emerg, E.help].forEach((el) => HUD.root.appendChild(el));
    HUD.zoneChanged(X);
    HUD.refreshConsumables(X);
    HUD.refreshWeapons(X);
    HUD.refreshAbilities(X);
    HUD.t = 0;
  };

  /** Capacités prêtées et appel stratégique. */
  HUD.refreshAbilities = function (X) {
    const E = HUD.els;
    if (!E.abil) return;
    AN.clear(E.abil);
    E.abilSlots = [];
    const A = X.abil;
    if (!A || (!A.list.length && !A.call)) { E.abil.hidden = true; return; }
    E.abil.hidden = false;
    const row = h('div', { class: 'aslots' });
    A.list.forEach((s, i) => {
      const def = D.ABILITIES[s.id];
      const a = s.ally;
      const cd = h('i', { class: 'acd' });
      const slot = h('div', { class: 'aslot' + (i === A.idx ? ' on' : ''), style: { borderColor: i === A.idx ? def.color : '' }, title: def.name + ' (' + (a.nickname || a.def.name) + ') : ' + def.desc },
        AN.Icons.creature({ species: a.def.id, variant: a.variant, hueSeed: a.hueSeed }, 30),
        h('i', { class: 'adot', style: { background: def.color } }),
        cd,
        i === A.idx ? h('kbd', null, AN.Input.label('KeyQ')) : null);
      row.appendChild(slot);
      E.abilSlots.push({ slot, s, cd });
    });
    if (A.call) {
      const def = D.CALLS[A.call.id];
      E.callSlot = h('div', { class: 'aslot call' + (A.call.used ? ' used' : ''), title: 'Appel stratégique : ' + def.name + '. ' + def.desc },
        AN.Icons.creature(A.call.entry, 30), h('kbd', null, 'G'));
      row.appendChild(E.callSlot);
    }
    E.abil.appendChild(row);
    const act = A.list.length ? A.list[A.idx % A.list.length] : null;
    E.abil.appendChild(h('div', { class: 'aname' }, act ? D.ABILITIES[act.id].name + ' · ' + (act.ally.nickname || act.ally.def.name) : 'Appel : ' + D.CALLS[A.call.id].name));
  };

  HUD.mountChanged = function (X) {
    const E = HUD.els;
    if (!E.mountRow) return;
    E.mountRow.hidden = !X.mount;
    if (X.mount) E.mountName.textContent = 'Monture : ' + (X.mount.nickname || X.mount.def.name);
  };

  HUD.hideExpedition = function () { HUD.clear(); };

  HUD.zoneChanged = function (X) {
    const E = HUD.els;
    if (!E.zoneName) return;
    const spec = AN.Expedition.zoneSpec(X, X.zi);
    const conq = X.conquered.has(X.zi);
    const unit = X.echelon ? X.echelon.unit : 'Zone';
    E.zoneName.textContent = (X.zone.isHeart ? '' : unit + ' ' + (X.zi + 1) + '/' + X.world.zones.length + ' · ') + spec.name + (conq ? ' · conquise' : '');
    X.fogDirty = true;
    drawWhere(X);
  };

  /** La carte de l'échelon (1.10) : l'ensemble des zones, celle où l'on est, l'hexagone. */
  function drawWhere(X) {
    const cv = HUD.els.whereMap;
    if (!cv || !AN.Skies) return;
    setText(HUD.els.mapLabel, AN.Skies.drawWhere(cv.getContext('2d'), X, cv.width, cv.height, X.time || 0));
  }

  HUD.refreshWeapons = function (X) {
    const E = HUD.els;
    if (!E.weapons) return;
    AN.clear(E.weapons);
    E.weapons.appendChild(AN.Icons.img('gear', X.loadout.ranged, 22));
    E.weapons.appendChild(AN.Icons.img('gear', X.loadout.melee, 22));
  };

  HUD.refreshConsumables = function (X) {
    const E = HUD.els;
    if (!E.cons) return;
    AN.clear(E.cons);
    for (let i = 0; i < D.CONSUMABLE_SLOTS; i++) {
      const c = X.consumables[i];
      E.cons.appendChild(h('div', { class: 'slot' + (c && c.n > 0 ? '' : ' vacant'), title: c ? D.GEAR[c.id].name + ' : ' + D.GEAR[c.id].desc : '' },
        h('kbd', null, String(i + 1)),
        c ? AN.Icons.img('gear', c.id, 22) : null,
        c ? h('span', { class: 'n' }, '×' + c.n) : null));
    }
  };

  HUD.bagPulse = function () {
    const el = HUD.els.bagBar;
    if (!el) return;
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  };

  HUD.collapse = function () { if (HUD.els.collapse) HUD.els.collapse.hidden = false; };

  function drawMinimap(X) {
    const E = HUD.els;
    const cv = E.map;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const zone = X.zone;
    const S = cv.width / Math.max(zone.w, zone.h);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (X.thumbDirty) { X.thumb = AN.Terrain.thumb(zone, 3); X.thumbDirty = false; }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(X.thumb, 0, 0, zone.w * S, zone.h * S);
    ctx.drawImage(X.fogCanvas, 0, 0, zone.w * S, zone.h * S);
    const k = S / zone.T;
    const seen = (x, y) => zone.state.fog[Math.floor(y / zone.T) * zone.w + Math.floor(x / zone.T)];
    // structures
    zone.plates.forEach((p) => { if (!seen(p.x, p.y)) return; ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x * k, p.y * k, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    zone.gates.forEach((g) => { if (!seen(g.x, g.y)) return; ctx.strokeStyle = g.kind === 'heart' && !AN.Expedition.heartOpen(X) ? AN.STAMP : '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(g.x * k, g.y * k, 4, 5.5, 0, 0, Math.PI * 2); ctx.stroke(); });
    zone.nodes.forEach((n) => { if (n.uses <= 0 || !seen(n.x, n.y)) return; ctx.fillStyle = D.RESOURCES[n.res].color; ctx.fillRect(n.x * k - 1.5, n.y * k - 1.5, 3, 3); });
    zone.ruins.forEach((r) => { if (r.used || !seen(r.x, r.y)) return; ctx.fillStyle = '#d8d4c8'; ctx.fillRect(r.x * k - 2.5, r.y * k - 2.5, 5, 5); });
    if (zone.village && seen(zone.village.x, zone.village.y)) {
      const P = D.PEOPLE[zone.village.people];
      ctx.fillStyle = P.body.trim; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      zone.village.buildings.forEach((b) => { if (!b.taken) ctx.fillRect(b.x * k - 2.5, b.y * k - 2.5, 5, 5); });
    }
    const b = zone.state.boss;
    if (b && b.alive && (seen(zone.arena.x, zone.arena.y) || X.powers.reveal)) { ctx.strokeStyle = AN.STAMP; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(zone.arena.x * k, zone.arena.y * k, 7, 0, Math.PI * 2); ctx.stroke(); }
    for (const e of X.creatures) {
      if (!e.alive || e.hidden || !e.boss || !e.boss.active) continue;
      ctx.fillStyle = AN.STAMP; ctx.beginPath(); ctx.arc(e.x * k, e.y * k, 4, 0, Math.PI * 2); ctx.fill();
    }
    X.allies.forEach((a) => { ctx.fillStyle = a.downed ? AN.STAMP : '#9fb4ff'; ctx.fillRect(a.x * k - 1.5, a.y * k - 1.5, 3, 3); });
    if (AN.Search) AN.Search.drawMinimap(ctx, X, k, X.time);
    AN.Nations.drawMinimap(ctx, X, k, X.time);
    AN.Structures.drawMinimap(ctx, X, k, seen);
    if (AN.Base) AN.Base.drawMinimap(ctx, X, k);
    if (X.T && X.T.deep) zone.nodes.forEach((n) => { if (n.deep && n.uses > 0 && seen(n.x, n.y)) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2; ctx.strokeRect(n.x * k - 3, n.y * k - 3, 6, 6); } });
    if (X.collapse) {
      ctx.strokeStyle = AN.CYAN; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X.collapse.plate.x * k, X.collapse.plate.y * k, 8 + Math.sin(X.time * 6) * 2, 0, Math.PI * 2); ctx.stroke();
    }
    const p = X.player;
    ctx.save();
    ctx.translate(p.x * k, p.y * k);
    ctx.rotate(p.aim);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = AN.INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  HUD.update = function (X, dt) {
    const E = HUD.els;
    if (HUD.mode !== 'expedition') return;
    HUD.t = (HUD.t || 0) + dt;
    const p = X.player;
    setTf(E.hpFill, 'scaleX(' + U.clamp(p.hp / p.maxHp, 0, 1) + ')');
    E.hp.classList.toggle('low', p.hp / p.maxHp < 0.3);
    setText(E.hpText, Math.ceil(p.hp) + ' / ' + p.maxHp);
    E.dash.classList.toggle('ready', p.dashCd <= 0);
    if (X.mount) setTf(E.mountBar.firstChild, 'scaleX(' + U.clamp(X.mount.hp / X.mount.maxHp, 0, 1) + ')');
    if (E.abilSlots) E.abilSlots.forEach(({ slot, s, cd }) => {
      setTf(cd, 'scaleY(' + U.clamp(s.cd / s.max, 0, 1) + ')');
      slot.classList.toggle('down', !!s.ally.downed);
    });
    if (HUD.t > 0.1) {
      HUD.t = 0;
      const bc = X.bagCount(), cap = X.S.bagCap;
      setTf(E.bagBar.firstChild, 'scaleX(' + U.clamp(bc / cap, 0, 1) + ')');
      setText(E.bagText, bc + ' / ' + cap);
      E.bagBar.classList.toggle('full', bc >= cap);
      const cu = X.cargoUsed();
      setTf(E.cargoBar.firstChild, 'scaleX(' + U.clamp(cu / X.cargoCap, 0, 1) + ')');
      setText(E.cargoText, cu + ' / ' + X.cargoCap);
      const stake = X.bagValue() + X.cargoValue();
      setText(E.value, 'En jeu : ' + U.fmt(stake) + (X.T && X.T.keepOnDeath ? ' — un tiers du sac survivrait à une chute' : ' — perdu si vous tombez'));
      const evt = AN.Events.hudText(X);
      if (E.eventLine) { E.eventLine.hidden = !evt; if (evt) { E.eventLine.textContent = evt; E.eventLine.style.borderColor = D.WORLD_EVENTS[X.event.id].color; } }
      const mis = AN.Nations.hudText(X);
      if (E.missionLine) { E.missionLine.hidden = !mis; if (mis) setText(E.missionLine, mis); }
      drawMinimap(X);
      drawWhere(X);
      // l'hexagone (1.9) : sa vigueur, ou ce qu'il est devenu
      const bs = X.base;
      if (bs && E.baseRow) {
        const gone = bs.state === 'gone' || bs.state === 'lift';
        setText(E.baseName, gone ? (bs.submerged ? 'Hexagone parti (submergé)' : 'Hexagone parti') : X.zi === bs.zi ? 'Hexagone' + (bs.shield > 1 ? ' · bouclier ' + Math.ceil(bs.shield) : '') : 'Hexagone (' + (X.echelon ? X.echelon.unit.toLowerCase() : 'zone') + ' ' + (bs.zi + 1) + ')');
        setTf(E.baseBar.firstChild, 'scaleX(' + (gone ? 0 : U.clamp(bs.hp / bs.st.maxHp, 0, 1)) + ')');
        E.baseRow.classList.toggle('hit', !gone && X.time - bs.lastHit < 2);
      }
    }
    const b = X.activeBoss;
    if (b && b.alive && b.boss.active) {
      E.boss.hidden = false;
      setText(E.bossName, b.def.name + (b.variant !== 'commun' ? ' ' + D.VARIANT[b.variant].name : ''));
      setTf(E.bossFill, 'scaleX(' + U.clamp(b.boss.exhausted ? b.capture : b.hp / b.maxHp, 0, 1) + ')');
      E.boss.classList.toggle('exhausted', b.boss.exhausted);
      setText(E.bossPhase, b.boss.exhausted ? 'Épuisé : capture ' + Math.round(b.capture * 100) + ' %, se relève dans ' + Math.ceil(b.boss.exhaustT) + ' s' : 'Phase ' + (b.boss.phase + 1) + ' sur ' + b.def.phases.length);
    } else E.boss.hidden = true;
    if (X.collapse) {
      const c = X.collapse;
      E.collapse.hidden = false;
      setText(E.colText, c.inPortal ? 'Transfert en cours' : 'Revenez dans le portail !');
      E.collapse.classList.toggle('away', !c.inPortal);
      setTf(E.colFill, 'scaleX(' + U.clamp(c.progress / c.need, 0, 1) + ')');
      setText(E.colTime, (c.frozen > 0 ? 'Effondrement figé (' + Math.ceil(c.frozen) + ' s)' : 'Effondrement total dans ' + Math.max(0, Math.ceil(c.dur - c.t)) + ' s') + (c.integrity != null ? ' · portail ' + Math.ceil(c.integrity) + ' %' : ''));
    }
    E.emerg.hidden = !(X.emergencyT > 0.05);
    if (!E.emerg.hidden) setTf(E.emFill, 'scaleX(' + U.clamp(X.emergencyT / 2.5, 0, 1) + ')');
  };

  /* ======================= Archive ======================= */
  HUD.showArchive = function (A) {
    HUD.clear();
    HUD.mode = 'archive';
    const E = HUD.els;
    E.rank = h('div', { class: 'card hud-rank' }, E.rankName = h('div', { class: 'rank-name' }), E.rankNext = h('div', { class: 'rank-next' }), E.scale = h('div', { class: 'scale' }));
    E.stock = h('div', { class: 'card hud-stock' });
    E.prompt = h('div', { class: 'prompt', hidden: true });
    E.help = h('div', { class: 'hud-help' });
    E.arrange = h('div', { class: 'card hud-arrange', hidden: true });
    [E.rank, E.stock, E.prompt, E.help, E.arrange].forEach((el) => HUD.root.appendChild(el));
    HUD.arrKey = null;
    HUD.refreshArchive(A);
    HUD.updateArchive(A, true);
  };

  HUD.refreshArchive = function (A) {
    const E = HUD.els;
    if (HUD.mode !== 'archive') return;
    const p = A.profile;
    const rk = AN.Profile.rank(p);
    setText(E.rankName, 'Archive : ' + rk.def.name);
    if (rk.next) {
      const n = rk.next.need, c = rk.counts;
      const parts = [];
      if (n.territories) parts.push(Math.min(c.territories, n.territories) + '/' + n.territories + ' territoires');
      if (n.guardians) parts.push(Math.min(c.guardians, n.guardians) + '/' + n.guardians + ' gardien' + (n.guardians > 1 ? 's' : ''));
      if (n.ultras) parts.push(Math.min(c.ultras, n.ultras) + '/' + n.ultras + ' ultra-boss');
      if (n.souverains) parts.push(Math.min(c.souverains, n.souverains) + '/' + n.souverains + ' souverain');
      if (n.cataclysmes) parts.push(Math.min(c.cataclysmes, n.cataclysmes) + '/' + n.cataclysmes + ' cataclysme');
      if (n.astres) parts.push(Math.min(c.astres, n.astres) + '/' + n.astres + ' astres');
      if (n.stellaires) parts.push(Math.min(c.stellaires, n.stellaires) + '/' + n.stellaires + ' entité stellaire');
      if (n.galactiques) parts.push(Math.min(c.galactiques, n.galactiques) + '/' + n.galactiques + ' organisme galactique');
      if (n.amas) parts.push(Math.min(c.amas, n.amas) + '/' + n.amas + ' entité d’amas');
      if (n.toiles) parts.push(Math.min(c.toiles, n.toiles) + '/' + n.toiles + ' entité de la Toile');
      setText(E.rankNext, rk.next.mystery ? 'Prochain rang : ??? (' + parts.join(', ') + ')' : 'Prochain rang, ' + rk.next.name + ' : ' + parts.join(', '));
    } else setText(E.rankNext, 'Il n’y a plus rien au-dessus. Ou rien que vous puissiez voir.');
    const entries = Object.entries(p.stock).filter(([, n]) => n > 0).sort((a, b) => D.RESOURCES[b[0]].rarity - D.RESOURCES[a[0]].rarity || b[1] - a[1]);
    // la réserve n'est reconstruite que si ce qu'elle montre a changé (1.8.2)
    const sig = entries.slice(0, 12).map(([k, n]) => k + ':' + U.fmt(n)).join(',') + '|' + entries.length + '|' + AN.CYAN + AN.STAMP;
    if (E.stock._sig === sig) return;
    E.stock._sig = sig;
    AN.clear(E.stock);
    if (!entries.length) E.stock.appendChild(h('div', { class: 'muted' }, 'Réserve vide'));
    entries.slice(0, 12).forEach(([k, n]) => E.stock.appendChild(h('div', { class: 'res', title: D.RESOURCES[k].name }, AN.Icons.img('res', k, 18), h('span', null, U.fmt(n)))));
    if (entries.length > 12) E.stock.appendChild(h('div', { class: 'muted' }, '+' + (entries.length - 12)));
  };

  /* ---------- panneau d'agencement ---------- */
  const pctTxt = (v) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + ' %';
  const synTxt = (s) => s.name + (s.mult ? ' ' + pctTxt(s.mult) : s.effect === 'craft' ? ' (Atelier −10 %)' : '');
  /** Panneau du mode Agencer : bilan, territoire survolé, forme, rangement, défaire. Reconstruit seulement quand il change. */
  HUD.arrange = function (A, force) {
    const E = HUD.els;
    if (HUD.mode !== 'archive' || !E.arrange) return;
    const on = !!A.mapMode;
    if (E.arrange.hidden === on) E.arrange.hidden = !on;
    if (E.stock && E.stock.hidden !== on) E.stock.hidden = on;
    if (document.body.classList.contains('arranging') !== on) document.body.classList.toggle('arranging', on);
    if (!on) { HUD.arrKey = null; return; }
    const p = A.profile;
    const Ag = AN.Arrange;
    const sel = A.selected ? p.territories.find((t) => t.uid === A.selected) : null;
    const foc = sel || (A.hover ? AN.Profile.territoryAt(p, A.hover.q, A.hover.r) : null);
    const ar = p.arrange || {};
    const I = AN.Input;
    const dev = I.lastDevice;
    const key = [A.layoutV || 0, p.territories.length, foc ? foc.uid : '', sel ? 1 : 0, ar.reshape ? 1 : 0, (A.history || []).length, dev, I.layout ? 1 : 0].join('|');
    if (!force && key === HUD.arrKey) return;
    HUD.arrKey = key;
    if (!A.sumCache || A.sumCache.k !== (A.layoutV || 0) + ':' + p.territories.length) A.sumCache = { k: (A.layoutV || 0) + ':' + p.territories.length, v: Ag.summary(p) };
    const sum = A.sumCache.v;
    const kb = (code) => (dev === 'tactile' ? null : h('kbd', null, I.label(code)));
    const pl = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');
    const B = (label, fn, code, extra = {}) => h('button', Object.assign({ type: 'button', class: 'btn ghost small', onmousedown: (e) => e.preventDefault(), onclick: () => { fn(); } }, extra), h('span', null, label), kb(code));
    AN.clear(E.arrange);
    E.arrange.appendChild(h('div', { class: 'arr-head' }, h('b', null, 'Agencement'), h('span', { class: 'muted small' }, pl(p.territories.length, 'territoire'))));
    E.arrange.appendChild(h('div', { class: 'arr-stats' },
      h('span', { class: 'arr-good' }, '▲ ' + pl(sum.pos, 'synergie')),
      h('span', { class: sum.neg ? 'arr-bad' : 'muted' }, '▼ ' + sum.neg + ' néfaste' + (sum.neg > 1 ? 's' : '')),
      h('div', null, 'Production des territoires : ', h('b', null, pctTxt(sum.prod))),
      sum.forge ? h('div', { class: 'muted' }, 'Forge : −' + sum.forge * 10 + ' % à l’Atelier') : null,
      sum.conflicts ? h('div', { class: 'arr-bad' }, pl(sum.conflicts, 'voisinage') + ' de peuples ennemis') : null,
      sum.holes ? h('div', { class: 'muted' }, pl(sum.holes, 'case') + ' vide' + (sum.holes > 1 ? 's' : '') + ' enclavée' + (sum.holes > 1 ? 's' : '')) : null));
    if (foc) {
      const D = AN.Data;
      const sv = AN.Archive.synergyView();
      const mine = sv.list.filter((e) => e.a === foc || e.b === foc);
      const nbs = AN.Shapes.neighbors(p, foc);
      const nearB = new Set(nbs.map((t) => t.biome));
      // voisins à rechercher ou à éviter, parmi les paysages qui ne le touchent pas encore
      const want = [], avoid = [];
      const seenB = new Set();
      p.territories.forEach((o) => {
        if (o === foc || nearB.has(o.biome) || seenB.has(o.biome)) return;
        const list = Ag.between(foc, o);
        if (!list.length) return;
        seenB.add(o.biome);
        const v = list.reduce((s, x) => s + (x.mult || (x.effect ? 0.1 : 0)), 0);
        (v > 0 ? want : avoid).push({ name: D.BIOME[o.biome].name, list, v });
      });
      want.sort((a, b) => b.v - a.v); avoid.sort((a, b) => a.v - b.v);
      const n = AN.Shapes.cellsOf(foc).length;
      E.arrange.appendChild(h('div', { class: 'arr-focus' },
        h('h4', null, D.BIOME[foc.biome].name),
        h('div', { class: 'muted small' }, (D.QUALITY_NAMES[foc.quality] || 'Territoire') + ' · ' + pl(n, 'case') + ' · ' + foc.world),
        mine.length ? h('ul', null, mine.map((e) => {
          const o = e.a === foc ? e.b : e.a;
          const twin = mine.some((x) => x !== e && (x.a === foc ? x.b : x.a).biome === o.biome);
          return h('li', { class: e.good ? 'good' : 'bad' }, e.list.map(synTxt).join(', ') + ' avec ' + D.BIOME[o.biome].name + (twin ? ' (' + o.world + ')' : ''));
        }))
          : h('p', { class: 'small muted' }, 'Aucune synergie avec ses voisins.'),
        want.length ? h('p', { class: 'small' }, h('b', null, 'S’accorderait avec : '), want.slice(0, 3).map((w) => w.name + ' (' + w.list.map((x) => x.name).join(', ') + ')').join(' ; ')) : null,
        avoid.length ? h('p', { class: 'small arr-bad-text' }, h('b', null, 'À tenir loin de : '), avoid.slice(0, 2).map((w) => w.name + ' (' + w.list.map((x) => x.name).join(', ') + ')').join(' ; ')) : null,
        sel ? h('p', { class: 'small muted' }, dev === 'tactile' ? 'Touchez sa nouvelle place.' : 'Cliquez sa nouvelle place' + (dev === 'manette' ? ' (A), B pour le lâcher.' : ', clic droit pour le lâcher.')) : null));
    } else {
      E.arrange.appendChild(h('p', { class: 'small muted arr-hint' }, dev === 'tactile'
        ? 'Touchez un territoire, puis sa nouvelle place. Glissez pour déplacer la vue.'
        : dev === 'manette'
          ? 'Stick droit : viser une case, A : saisir puis poser, stick gauche : déplacer la vue.'
          : 'Cliquez un territoire, puis sa nouvelle place. Les frontières vertes rapportent, les rouges coûtent.'));
    }
    const fragmentSel = sel && AN.Shapes.cellsOf(sel).length === 1;
    E.arrange.appendChild(h('div', { class: 'arr-shape' },
      h('span', { class: 'small' }, 'Forme :'),
      h('div', { class: 'segs' },
        h('button', { type: 'button', class: 'seg' + (!ar.reshape ? ' on' : ''), onmousedown: (e) => e.preventDefault(), onclick: () => { if (ar.reshape) AN.Archive.toggleReshape(); } }, 'Fixe'),
        h('button', { type: 'button', class: 'seg' + (ar.reshape ? ' on' : ''), onmousedown: (e) => e.preventDefault(), onclick: () => { if (!ar.reshape) AN.Archive.toggleReshape(); } }, 'Adaptée')),
      kb('KeyF')));
    E.arrange.appendChild(h('p', { class: 'small muted arr-shape-help' }, ar.reshape
      ? 'Un territoire déplacé prend la forme de sa nouvelle place.' + (sel && !fragmentSel ? ' ' + (dev === 'tactile' ? '« Tourner »' : I.label('KeyR')) + ' : une autre forme.' : '')
      : 'Un territoire déplacé garde sa forme.' + (sel && !fragmentSel ? ' ' + (dev === 'tactile' ? '« Tourner »' : I.label('KeyR')) + ' : tourner.' : '')));
    E.arrange.appendChild(h('div', { class: 'arr-btns' },
      B('Ranger automatiquement', () => AN.Archive.autoDialog(), 'KeyG'),
      B('Défaire', () => AN.Archive.undo(), 'KeyQ', { disabled: !(A.history || []).length }),
      B('Terminer', () => AN.Archive.toggleMap(), 'KeyV')));
  };

  HUD.updateArchive = function (A, force) {
    const E = HUD.els;
    if (HUD.mode !== 'archive') return;
    const z = A.cam.zoom;
    const label = AN.Archive.scaleName(z);
    const txt = label + ' · ×' + (z >= 0.1 ? z.toFixed(2) : z.toFixed(3)).replace('.', ',');
    if (force || E.scale.textContent !== txt) E.scale.textContent = txt;
    const L = AN.Input.label;
    const touchy = AN.Input.lastDevice === 'tactile' || AN.Input.lastDevice === 'manette';
    const help = touchy ? '' : A.mapMode
      ? 'Clic : saisir puis poser un territoire · glisser ou ' + AN.Input.moveKeys() + ' : déplacer la vue · molette : zoom · clic droit : lâcher · ' + L('KeyV') + ' ou Échap : terminer'
      : AN.Input.moveKeys() + ' bouger · molette : dézoomer · ' + L('KeyE') + ' : Artefact / observer · ' + L('KeyR') + ' : chevaucher · ' + L('KeyV') + ' : agencer · ' + L('Tab') + ' : collection · Échap : menu';
    if (force || E.help.textContent !== help) E.help.textContent = help;
    HUD.arrange(A);
    HUD.tA = (HUD.tA || 0) + 1;
    if (HUD.tA % 30 === 0) HUD.refreshArchive(A);
  };
})();
