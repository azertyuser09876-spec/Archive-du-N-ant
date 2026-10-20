/* Nations (1.12) : comptoir, caserne, audience du souverain, et nations ancrées
   dans la console (page Peuples). */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const h = AN.h;
  const UI = AN.UI;
  const btn = (...a) => UI.btn(...a);
  const Na = () => AN.Nations;

  const favorBar = (v) => h('div', { class: 'bars' }, h('span', null, 'Faveur'),
    h('div', { class: 'bar loy favor' + (v < 0 ? ' low' : '') }, h('i', { style: { transform: 'scaleX(' + U.clamp((v + 100) / 200, 0, 1) + ')' } })),
    h('small', null, (v > 0 ? '+' : '') + Math.round(v)));
  const resList = (o) => Object.entries(o).map(([k, n]) => h('span', null, AN.Icons.img('res', k, 16), n + ' ' + D.RESOURCES[k].name));
  function getList(g) {
    if (g.res) return resList(g.res);
    if (g.item) return [h('span', null, AN.Icons.img('gear', g.item, 16), g.n + ' × ' + D.GEAR[g.item].name)];
    return [h('span', null, AN.Icons.egg({ species: g.egg }, 18), 'Œuf de ' + D.CREATURE[g.egg].name)];
  }
  function city(X) { return Na().cityOf(X, X.zone); }

  function panel(X, title, sub, body) {
    const nat = X.nation;
    const el = h('div', { class: 'panel dialogue nation' },
      h('div', { class: 'dlg-head' },
        h('div', { class: 'dlg-portrait' }, AN.CivArt.portrait(nat.people, 'leader', 96)),
        h('div', null, h('h2', null, title), h('p', { class: 'muted' }, sub), favorBar(nat.favor))),
      body);
    UI.closeAll();
    UI.open(el);
  }

  /** Comptoir d'une ville : troc, payé avec le sac. */
  UI.nationMarket = function (X) {
    const nat = X.nation;
    const v = city(X);
    const deals = Na().deals(X);
    const list = h('ul', { class: 'rows' }, deals.map((d) => {
      const give = Object.entries(d.give).map(([k, n]) => h('span', { class: 'c' + ((X.bag[k] || 0) >= n ? '' : ' lack') }, AN.Icons.img('res', k, 16), n));
      return h('li', { class: d.stock <= 0 ? 'disabled' : '' }, h('span', { class: 'cost' }, give), h('span', null, '→'), h('span', { class: 'grow' }, getList(d.get), h('small', null, d.stock > 0 ? d.stock + ' en stock' : 'épuisé')),
        btn(d.stock > 0 ? 'Échanger' : 'Épuisé', () => {
          const r = Na().trade(X, d);
          if (r === 'manque') AN.HUD.toast('Il manque des ressources dans votre sac.');
          else if (r === 'soute') AN.HUD.toast('Soute pleine.');
          else if (r === 'emplacements') AN.HUD.toast('Plus d’emplacement libre pour un nouveau consommable.');
          UI.nationMarket(X);
        }, 'small', d.stock > 0 ? {} : { disabled: true }));
    }));
    panel(X, 'Comptoir de ' + v.name, Na().realm(nat.people) + (v.capital ? ' · capitale' : ''), h('div', null,
      h('p', { class: 'muted' }, 'Ils prennent ce qui est dans votre sac. Leurs prix suivent la faveur : ×' + String(Math.round(Na().priceMul(nat.favor) * 100) / 100).replace('.', ',') + '. Chaque échange l’améliore un peu.'),
      list, h('div', { class: 'dlg-choices' }, btn('Partir', () => UI.close(), 'ghost'))));
  };

  /** Caserne : mercenaires pour la suite de l'expédition. */
  UI.nationHall = function (X) {
    const nat = X.nation;
    const v = city(X);
    const F = D.NATION.favor;
    const n = Na().mercCount(X);
    const roles = Na().mercRoles(nat.favor, v.capital);
    const list = h('ul', { class: 'rows' }, roles.map((role) => {
      const M = D.MERCS[role];
      const cost = Na().mercCost(nat.people, role, X.world.scale);
      const have = Object.keys(cost).every((k) => (X.bag[k] || 0) >= cost[k]);
      const ok = have && n < D.NATION.mercMax && nat.favor >= F.mercs;
      return h('li', null, AN.CivArt.portrait(nat.people, role, 40),
        h('span', { class: 'grow' }, M.name + ' ' + Na().ofPeople(nat.people), h('small', null, M.desc + ' Coût : ' + Object.entries(cost).map(([k, c]) => c + ' ' + D.RESOURCES[k].name).join(', ') + '.')),
        btn('Engager', () => {
          const r = Na().hire(X, role);
          if (r === 'manque') AN.HUD.toast('Il manque des ressources dans votre sac.');
          else if (r === 'plein') AN.HUD.toast('Vous avez déjà ' + D.NATION.mercMax + ' mercenaires.');
          else if (r === 'faveur') AN.HUD.toast('Ils ne se battent pas pour vous : leur faveur est trop basse.');
          else AN.HUD.toast(M.name + ' ' + Na().ofPeople(nat.people) + ' vous suit jusqu’à la fin de l’expédition.');
          UI.nationHall(X);
        }, 'small', ok ? {} : { disabled: true }));
    }));
    panel(X, 'Caserne de ' + v.name, 'Mercenaires : ' + n + ' sur ' + D.NATION.mercMax, h('div', null,
      h('p', { class: 'muted' }, 'Ils vous suivent jusqu’à la fin de l’expédition, puis rentrent chez eux. Payés avec votre sac. ' + (roles.includes('champion') ? '' : 'Leur champion ne sert que ceux qu’ils estiment (faveur ' + F.champion + ') ou se trouve à la capitale.')),
      list, h('div', { class: 'dlg-choices' }, btn('Partir', () => UI.close(), 'ghost'))));
  };

  /** Audience auprès du souverain, au palais de la capitale. */
  UI.nationCourt = function (X) {
    const nat = X.nation;
    const F = D.NATION.favor;
    const key = nat.anchored || nat.attitude;
    const lines = D.NATION_LINES[key] || D.NATION_LINES.fiers;
    const line = lines[(nat.seed >>> 3) % lines.length];
    const gift = Na().giftCost(X);
    const gk = Object.keys(gift)[0];
    const block = Na().anchorBlock(X);
    const choices = [];
    choices.push({ label: 'Offrir ' + gift[gk] + ' ' + D.RESOURCES[gk].name, note: nat.gifts >= F.giftMax ? 'Ils ont reçu assez de présents pour cette fois.' : '+' + F.gift + ' faveur. Vous en avez ' + (X.bag[gk] || 0) + ' dans votre sac.',
      disabled: nat.gifts >= F.giftMax || (X.bag[gk] || 0) < gift[gk], fn: () => { Na().gift(X); UI.nationCourt(X); } });
    if (!nat.anchored) {
      choices.push({ label: 'Que votre monde rejoigne l’Archive.', note: Na().canAlly(X) ? (block || 'Leur monde ne sera pas détruit : il deviendra un lieu ancré, avec ses villes, ses comptoirs et ses mercenaires, et il vous enverra un tribut. L’expédition s’achève.') : 'Il faut leur faveur (' + F.alliance + ') : commercez, faites des présents, abattez les gardiens qui menacent leurs villes.',
        disabled: !Na().canAlly(X) || !!block, fn: () => { UI.close(); Na().anchor(X, 'allie'); } });
      choices.push({ label: 'Ce monde sera à l’Archive, de gré ou de force.', danger: true, note: 'La guerre : leurs villes vous fermeront leurs portes. Vainquez le souverain pour soumettre leur monde.',
        fn: () => UI.confirm('Déclarer la guerre ' + Na().ofPeople(nat.people).replace(/^des /, 'aux ') + ' ? Leurs gardes vous attaqueront à vue.', () => { Na().declareWar(X); UI.closeAll(); }, 'Déclarer la guerre') });
    }
    choices.push({ label: 'Partir', fn: () => UI.close() });
    const el = h('div', { class: 'panel dialogue nation' },
      h('div', { class: 'dlg-head' },
        h('div', { class: 'dlg-portrait' }, AN.CivArt.portrait(nat.people, 'sovereign', 96)),
        h('div', null,
          h('h2', null, nat.sovereign),
          h('p', { class: 'muted' }, nat.title + ' · ' + Na().realm(nat.people) + ' · capitale ' + nat.capital),
          h('p', { class: 'dlg-att' }, nat.anchored === 'allie' ? 'Alliés de l’Archive' : nat.anchored === 'vassal' ? 'Soumis à l’Archive' : D.NATION.attitudes[nat.attitude] || ''),
          favorBar(nat.favor))),
      h('div', { class: 'dlg-text' }, h('p', null, '« ' + line + ' »'), nat.guardians ? h('p', { class: 'muted' }, 'Vous avez abattu ' + nat.guardians + ' des bêtes qui menaçaient leurs villes.') : null),
      h('div', { class: 'dlg-choices' }, choices.map((c) => h('div', { class: 'dlg-choice' }, btn(c.label, c.fn, 'choice' + (c.danger ? ' danger' : ''), c.disabled ? { disabled: true } : {}), c.note ? h('small', { class: 'muted' }, c.note) : null))));
    UI.closeAll();
    UI.open(el);
  };

  /** Le gouverneur d'une ville et sa mission (1.13). */
  UI.nationGovernor = function (X) {
    const nat = X.nation;
    const v = city(X);
    const zi = X.zi;
    const m = Na().mission(X, zi);
    if (!m) return;
    const MD = D.NATION_MISSIONS[m.kind];
    const L = D.GOVERNOR_LINES[m.state] || D.GOVERNOR_LINES.offer;
    const line = L[(nat.seed + zi) % L.length];
    const reward = Na().missionReward(X, m);
    const rewardTxt = Object.entries(reward).map(([k, n]) => n + ' ' + D.RESOURCES[k].name).join(', ') + ', +' + MD.favor + ' faveur';
    const choices = [];
    const redo = () => UI.nationGovernor(X);
    if (m.state === 'offer') {
      choices.push({ label: 'J’accepte.', note: 'Récompense : ' + rewardTxt + '.', fn: () => {
        const r = Na().accept(X, zi);
        if (r === 'raid') AN.HUD.toast('Pas maintenant : la ville est déjà attaquée.');
        if (m.kind === 'defense' && r === 'ok') { UI.close(); return; }
        redo();
      } });
    }
    if (m.state === 'active' && m.kind === 'livraison') {
      const have = X.bag[m.res] || 0;
      choices.push({ label: 'Livrer ' + m.n + ' ' + D.RESOURCES[m.res].name, note: 'Vous en avez ' + have + ' dans votre sac.', disabled: have < m.n, fn: () => { Na().deliver(X, zi); redo(); } });
    }
    if (m.state === 'ready') choices.push({ label: 'Voilà qui est fait.', note: 'Récompense : ' + rewardTxt + '.', fn: () => { Na().complete(X, zi); redo(); } });
    choices.push({ label: 'Partir', fn: () => UI.close() });
    const later = m.rested ? Math.max(1, Math.ceil((m.rested + D.NATION.missionCooldown * 60000 - Date.now()) / 60000)) : 0;
    const status = m.state === 'active' ? h('p', { class: 'note' }, 'En cours : ' + Na().hudText(X).replace(/^[^:]*: /, '') + '.')
      : m.rested ? h('p', { class: 'muted' }, 'Rien d’autre à vous demander pour l’instant. Revenez dans ' + later + ' min.')
        : m.state === 'failed' ? h('p', { class: 'muted' }, 'Mission manquée.')
        : m.state === 'done' ? h('p', { class: 'muted' }, 'Mission accomplie' + (m.reward ? ' : vous avez reçu ' + Object.entries(m.reward).map(([k, n]) => n + ' ' + D.RESOURCES[k].name).join(', ') : '') + '.') : null;
    const el = h('div', { class: 'panel dialogue nation' },
      h('div', { class: 'dlg-head' },
        h('div', { class: 'dlg-portrait' }, AN.CivArt.portrait(nat.people, 'leader', 96)),
        h('div', null, h('h2', null, 'Gouverneur de ' + v.name), h('p', { class: 'muted' }, Na().realm(nat.people) + ' · ' + MD.name), favorBar(nat.favor))),
      h('div', { class: 'dlg-text' }, h('p', null, '« ' + line + ' »'), m.state !== 'done' && m.state !== 'failed' ? h('p', null, Na().missionText(X, m)) : null, status),
      h('div', { class: 'dlg-choices' }, choices.map((c) => h('div', { class: 'dlg-choice' }, btn(c.label, c.fn, 'choice', c.disabled ? { disabled: true } : {}), c.note ? h('small', { class: 'muted' }, c.note) : null))));
    UI.closeAll();
    UI.open(el);
  };

  /** Le souverain vaincu se rend. */
  UI.nationParley = function (X) {
    const nat = X.nation;
    const block = Na().anchorBlock(X);
    const el = h('div', { class: 'panel dialogue nation' },
      h('div', { class: 'dlg-head' }, h('div', { class: 'dlg-portrait' }, AN.CivArt.portrait(nat.people, 'sovereign', 96)),
        h('div', null, h('h2', null, nat.sovereign), h('p', { class: 'muted' }, nat.title + ' · ' + Na().realm(nat.people)))),
      h('div', { class: 'dlg-text' }, h('p', null, D.NATION_LINES.defait[0])),
      h('div', { class: 'dlg-choices' },
        h('div', { class: 'dlg-choice' }, btn('Votre monde appartient à l’Archive.', () => { UI.close(); Na().anchor(X, 'vassal'); }, 'choice danger', block ? { disabled: true } : {}),
          h('small', { class: 'muted' }, block || 'Soumis, leur monde rejoint l’Archive sans être détruit. Ils paieront un tribut plus lourd, mais ils ne vous aimeront pas.')),
        h('div', { class: 'dlg-choice' }, btn('Rien. Je vous épargne.', () => { Na().spare(X); UI.close(); }, 'choice'), h('small', { class: 'muted' }, 'Ils baissent les armes ; leur faveur repart de zéro.')),
        h('div', { class: 'dlg-choice' }, btn('Partir', () => UI.close(), 'choice ghost'))));
    UI.closeAll();
    UI.open(el);
  };

  /* ======================= Console ======================= */
  /** Nations ancrées, dans la page Peuples : faveur, tribut, comptoir, mercenaires. */
  UI.nationsSection = function (prof) {
    const list = Na().list(prof);
    const hired = prof.mercs || [];
    if (!list.length && !hired.length) return null;
    const T = D.NATION.tribute;
    const redo = () => UI.reopenKeep(() => UI.console('peuples'));
    return h('section', null, h('h4', null, 'Nations ancrées (' + list.length + ')'),
      h('p', { class: 'muted' }, 'Leur monde tient dans l’Archive. Elles envoient un tribut toutes les ' + T.period + ' minutes tant que leur faveur n’est pas négative ; on peut commercer avec elles et engager leurs mercenaires pour la prochaine expédition.'),
      hired.length ? h('p', { class: 'note' }, 'Mercenaires engagés pour la prochaine expédition : ' + hired.map((m) => D.MERCS[m.role].name + ' ' + Na().ofPeople(m.people)).join(', ') + '.') : null,
      h('ul', { class: 'rows' }, list.map((n) => {
        const left = Math.max(0, Math.ceil(T.period - (n.acc || 0)));
        const ask = Na().requestPending(prof, n);
        return h('li', { class: 'nation-row' }, AN.CivArt.portrait(n.people, 'sovereign', 40),
          h('span', { class: 'grow' }, Na().realm(n.people), h('small', null, (n.mode === 'allie' ? 'Alliée' : 'Soumise') + ' · ' + (n.region || n.code) + ' · faveur ' + Math.round(n.favor) + ' · ' + (n.favor < 0 ? 'ne paie plus de tribut' : 'tribut dans ' + left + ' min'))),
          btn(ask ? 'Demande !' : 'Demande', () => UI.nationArchiveRequest(n), 'small ' + (ask ? '' : 'ghost')),
          btn('Comptoir', () => UI.nationArchiveMarket(n), 'small ghost'),
          btn('Mercenaires', () => UI.nationArchiveHall(n), 'small ghost'),
          btn('S’y rendre', () => UI.openPlace('n:' + n.code), 'small'));
      })));
  };

  function archivePanel(n, title, body) {
    const el = h('div', { class: 'panel dialogue nation' },
      h('div', { class: 'dlg-head' }, h('div', { class: 'dlg-portrait' }, AN.CivArt.portrait(n.people, 'leader', 96)),
        h('div', null, h('h2', null, title), h('p', { class: 'muted' }, Na().realm(n.people) + ' · ' + (n.region || n.code)), favorBar(n.favor))),
      body);
    UI.closeAll();
    UI.open(el);
  }
  /** Comptoir d'une nation ancrée, payé avec la réserve de l'Archive. */
  UI.nationArchiveMarket = function (n) {
    const prof = AN.Game.profile;
    const deals = Na().archiveDeals(prof, n);
    const gift = Na().giftArchiveCost(n);
    archivePanel(n, 'Comptoir', h('div', null,
      h('p', { class: 'muted' }, 'Payé avec la réserve de l’Archive. Les offres changent toutes les 30 minutes.'),
      h('ul', { class: 'rows' }, deals.map((d) => h('li', { class: d.stock <= 0 ? 'disabled' : '' },
        h('span', { class: 'cost' }, Object.entries(d.give).map(([k, c]) => h('span', { class: 'c' + (AN.Profile.stock(prof, k) >= c ? '' : ' lack') }, AN.Icons.img('res', k, 16), c))),
        h('span', null, '→'), h('span', { class: 'grow' }, getList(d.get), h('small', null, d.stock > 0 ? d.stock + ' en stock' : 'épuisé')),
        btn('Échanger', () => { const r = Na().archiveTrade(prof, n, d); if (r === 'manque') AN.HUD.toast('Réserve insuffisante.'); else AN.Audio.play('craft'); UI.nationArchiveMarket(n); }, 'small', d.stock > 0 ? {} : { disabled: true })))),
      h('div', { class: 'dlg-choices' },
        h('div', { class: 'dlg-choice' }, btn('Offrir ' + Object.entries(gift).map(([k, c]) => c + ' ' + D.RESOURCES[k].name).join(', '), () => { if (Na().archiveGift(prof, n) === 'manque') AN.HUD.toast('Réserve insuffisante.'); else AN.Audio.play('ui_ok'); UI.nationArchiveMarket(n); }, 'choice', AN.Profile.canPay(prof, gift) ? {} : { disabled: true }), h('small', { class: 'muted' }, '+6 faveur.')),
        btn('Retour', () => UI.console('peuples'), 'ghost'))));
  };
  /** La demande d'une nation ancrée (1.13) : une ressource qui leur manque, envoyée depuis la réserve. */
  UI.nationArchiveRequest = function (n) {
    const prof = AN.Game.profile;
    const q = Na().archiveRequest(prof, n);
    const have = AN.Profile.stock(prof, q.res);
    const reward = Object.entries(q.reward).map(([k, c]) => c + ' ' + D.RESOURCES[k].name).join(', ');
    const left = Math.max(1, Math.ceil(((q.slot + 1) * 30 * 60000 - Date.now()) / 60000));
    archivePanel(n, 'Demande', h('div', null,
      h('p', null, q.done ? 'Ils ont reçu ce qu’il leur manquait. Une autre demande viendra dans ' + left + ' min.' : 'Leur monde ne donne pas ' + AN.Names.de(D.RESOURCES[q.res].name.toLowerCase()) + ', et il leur en faut. Ils en demandent ' + q.n + '.'),
      q.done ? null : h('p', { class: 'muted' }, 'En retour : ' + reward + ', et +' + D.NATION.request.favor + ' faveur. Réserve : ' + have + ' ' + D.RESOURCES[q.res].name + '. La demande change dans ' + left + ' min.'),
      h('div', { class: 'dlg-choices' },
        q.done ? null : btn('Envoyer ' + q.n + ' ' + D.RESOURCES[q.res].name, () => { if (Na().archiveFulfil(prof, n) === 'manque') AN.HUD.toast('Réserve insuffisante.'); else AN.Audio.play('ui_ok'); UI.nationArchiveRequest(n); }, 'choice', have >= q.n ? {} : { disabled: true }),
        btn('Retour', () => UI.console('peuples'), 'ghost'))));
  };
  /** Mercenaires d'une nation ancrée, pour la prochaine expédition. */
  UI.nationArchiveHall = function (n) {
    const prof = AN.Game.profile;
    const F = D.NATION.favor;
    const hired = (prof.mercs || []).length;
    archivePanel(n, 'Mercenaires', h('div', null,
      h('p', { class: 'muted' }, 'Ils rejoindront votre prochaine expédition, puis rentreront chez eux. Payés avec la réserve de l’Archive. Engagés : ' + hired + ' sur ' + D.NATION.mercMax + '.'),
      h('ul', { class: 'rows' }, Object.keys(D.MERCS).map((role) => {
        const M = D.MERCS[role];
        const cost = Na().mercCost(n.people, role, n.scale);
        const ok = AN.Profile.canPay(prof, cost) && hired < D.NATION.mercMax && n.favor >= (role === 'champion' ? F.champion : F.mercs);
        return h('li', null, AN.CivArt.portrait(n.people, role, 40),
          h('span', { class: 'grow' }, M.name + ' ' + Na().ofPeople(n.people), h('small', null, M.desc + ' Coût : ' + Object.entries(cost).map(([k, c]) => c + ' ' + D.RESOURCES[k].name).join(', ') + '.' + (role === 'champion' ? ' Faveur ' + F.champion + ' au moins.' : ''))),
          btn('Engager', () => { const r = Na().archiveHire(prof, n, role); if (r !== 'ok') AN.HUD.toast(r === 'plein' ? 'Déjà ' + D.NATION.mercMax + ' mercenaires engagés.' : r === 'faveur' ? 'Leur faveur est trop basse.' : 'Réserve insuffisante.'); else AN.Audio.play('ui_ok'); UI.nationArchiveHall(n); }, 'small', ok ? {} : { disabled: true }));
      })),
      h('div', { class: 'dlg-choices' }, btn('Retour', () => UI.console('peuples'), 'ghost'))));
  };
})();
