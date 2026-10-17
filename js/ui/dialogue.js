/* Dialogues avec les peuples, commerce, et fiches des villages de l'Archive. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const h = AN.h;
  const UI = AN.UI;
  const btn = (...a) => UI.btn(...a);

  function shownAttitude(civ) {
    const A = D.ATTITUDES[civ.attitude];
    return civ.revealed && A.reveal ? A.reveal : A.name;
  }

  function scene(X, paragraphs, choices) {
    const civ = X.civ;
    const P = D.PEOPLE[civ.people];
    const el = h('div', { class: 'panel dialogue' },
      h('div', { class: 'dlg-head' },
        h('div', { class: 'dlg-portrait' }, AN.CivArt.portrait(civ.people, 'leader', 96)),
        h('div', null,
          h('h2', null, civ.leader),
          h('p', { class: 'muted' }, civ.title + ' · ' + P.Name + ' · ' + civ.n + ' habitants'),
          h('p', { class: 'dlg-att' }, shownAttitude(civ)))),
      h('div', { class: 'dlg-text' }, paragraphs.filter(Boolean).map((t) => (typeof t === 'string' ? h('p', null, t) : t))),
      h('div', { class: 'dlg-choices' }, choices.filter(Boolean).map((c) => {
        const b = btn(c.label, () => { c.fn(); }, 'choice' + (c.danger ? ' danger' : ''), c.disabled ? { disabled: true } : {});
        return h('div', { class: 'dlg-choice' }, b, c.note ? h('small', { class: 'muted' }, c.note) : null);
      })));
    UI.closeAll();
    UI.open(el);
  }

  /** Conversation avec le chef d'un village. */
  UI.civDialogue = function (X) {
    const civ = X.civ;
    const Cv = AN.Civ;
    const P = D.PEOPLE[civ.people];
    const rep = Cv.reputation(X.profile);
    const rumor = D.CIV_RUMORS[rep];
    const scout = X.allies.find((a) => !a.downed && a.def.roles && a.def.roles.includes('eclaireur'));
    const att = civ.attitude;
    const texts = [];
    const lineKey = att === 'infiltres' ? 'suppliants' : att;
    texts.push('« ' + Cv.line(X, D.CIV_LINES[lineKey] || D.CIV_LINES.suppliants) + ' »');
    if (rumor) texts.push('« ' + rumor + ' »');
    if (att === 'infiltres' && scout) texts.push(h('p', { class: 'note' }, (scout.nickname || scout.def.name) + ' fixe certains habitants avec méfiance.'));
    if (att === 'voleurs' && scout) texts.push(h('p', { class: 'note' }, (scout.nickname || scout.def.name) + ' ne quitte pas des yeux l’un des marchands, qui ne regarde que l’Artefact.'));
    if (att === 'devots' && civ.gifted) texts.push(h('p', { class: 'muted' }, 'Ils déposent leurs offrandes à vos pieds.'));
    const close = { label: 'Partir', fn: () => UI.close() };
    const know = P.knows ? { label: 'Que savez-vous de l’Artefact ?', fn: () => {
      const i = (civ.seed >>> 5) % D.CIV_KNOWLEDGE.length;
      const prof = X.profile;
      prof.civLore = prof.civLore || [];
      if (!prof.civLore.includes(i)) prof.civLore.push(i);
      AN.Save.write(prof);
      scene(X, ['« ' + D.CIV_KNOWLEDGE[i] + ' »'], [{ label: 'Revenir à la conversation', fn: () => UI.civDialogue(X) }, close]);
    } } : null;
    const w = D.civWeight(civ.n);
    switch (civ.state === 'rally' ? 'rally' : att) {
      case 'rally':
        scene(X, ['« Nous sommes prêts. Nous attendons près de la surface blanche. »', 'Il faudra ' + w + ' place' + (w > 1 ? 's' : '') + ' de soute pour les ' + civ.n + ' habitants, et ils ne peuvent embarquer que depuis cette zone.'], [know, close]);
        return;
      case 'suppliants': case 'infiltres': case 'devots':
        scene(X, texts, [
          { label: 'Rassemblez-vous près d’une plaque blanche. Je vous emmène.', note: w + ' place' + (w > 1 ? 's' : '') + ' de soute (3 habitants par place). Protégez-les jusqu’au transfert.', fn: () => { Cv.startRally(X); UI.close(); } },
          { label: 'Je ne peux pas vous emmener.', fn: () => { civ.state = 'refused'; scene(X, [att === 'devots' ? '« Alors nous rejoindrons le Blanc à notre façon. »' : '« Nous comprenons. Nous aurions préféré ne pas comprendre. »'], [close]); } },
          know, close,
        ]);
        return;
      case 'fiers': {
        const cost = Cv.persuadeCost(X);
        const res = Object.keys(cost)[0];
        const have = X.bag[res] || 0;
        scene(X, texts, [
          { label: 'Je respecte votre choix.', fn: () => { Cv.respect(X); scene(X, ['« Alors laisse-nous finir comme nous avons vécu. »'], [close]); } },
          { label: 'Laissez-moi vous convaincre.', note: 'Offrir ' + cost[res] + ' ' + D.RESOURCES[res].name + ' de votre sac (vous en avez ' + have + '). Rien n’est garanti.', disabled: have < cost[res], fn: () => {
            const r = Cv.persuade(X);
            if (r === 'ok') scene(X, ['Un long silence. Puis : « Tu as raison. Nous viendrons. »'], [{ label: 'Rassemblez-vous près d’une plaque blanche.', fn: () => { Cv.startRally(X); UI.close(); } }]);
            else scene(X, ['Ils prennent vos présents, et ne bougent pas. « Merci. Ça ne change rien. »'], [close]);
          } },
          { label: 'Vous venez, que vous le vouliez ou non.', danger: true, note: 'Leur garde se battra. Le rayon de capture fonctionnera sur les habitants.', fn: () => { Cv.force(X); UI.close(); } },
          know, close,
        ]);
        return;
      }
      case 'voleurs':
        scene(X, texts, [
          { label: 'Commercer', fn: () => UI.civTrade(X) },
          { label: 'Venez avec moi, je vous emmène.', note: 'Ils hésitent, puis acceptent un peu trop vite.', fn: () => { Cv.startRally(X); UI.close(); } },
          know, close,
        ]);
        return;
      case 'evades': {
        if (civ.ark && civ.ark.state === 'defend') { scene(X, ['« Tiens bon ! Encore ' + Math.ceil(civ.ark.dur - civ.ark.t) + ' secondes ! »'], [close]); return; }
        if (civ.ark && (civ.ark.state === 'launch' || civ.ark.state === 'gone')) { scene(X, ['Le village est vide. Ils sont partis.'], [close]); return; }
        scene(X, texts, [
          { label: 'Je vous aide à tenir jusqu’au lancement.', note: 'Défendre l’arche pendant 50 secondes contre les bêtes attirées par le bruit.', fn: () => { Cv.helpArk(X); UI.close(); } },
          { label: 'Je prends votre arche.', danger: true, note: D.ARK_WEIGHT + ' places de soute. Ils n’auront plus aucun moyen de fuir. Leur garde se battra.', disabled: X.cargoUsed() + D.ARK_WEIGHT > X.cargoCap, fn: () => { Cv.takeArk(X); UI.close(); } },
          { label: 'Emmenez plutôt vos gens avec moi.', fn: () => { Cv.startRally(X); UI.close(); } },
          { label: 'Bonne chance.', fn: () => UI.close() },
        ]);
        return;
      }
      default:
        scene(X, texts, [close]);
    }
  };

  /** Un chef hostile vaincu se rend. */
  UI.civParley = function (X) {
    const Cv = AN.Civ;
    const civ = X.civ;
    scene(X, ['À genoux, ' + civ.leader + ' lève une main. « Assez. Que veux-tu de nous ? »'], [
      { label: 'Rien. Je vous épargne.', fn: () => { Cv.spare(X); UI.close(); } },
      { label: 'Vous venez avec moi.', danger: true, note: 'Les habitants seront capturables au rayon.', fn: () => { Cv.force(X); UI.close(); } },
      { label: 'Partir', fn: () => UI.close() },
    ]);
  };

  /** Commerce avec les marchands (paiement depuis le sac). */
  UI.civTrade = function (X) {
    const Cv = AN.Civ;
    const deals = Cv.deals(X);
    const render = () => {
      const list = h('ul', { class: 'rows' }, deals.map((d) => {
        const give = Object.entries(d.give).map(([k, n]) => h('span', { class: 'c' + ((X.bag[k] || 0) >= n ? '' : ' lack') }, AN.Icons.img('res', k, 16), n));
        const g = d.get;
        const get = g.res ? Object.entries(g.res).map(([k, n]) => h('span', null, AN.Icons.img('res', k, 16), n + ' ' + D.RESOURCES[k].name))
          : g.item ? [h('span', null, AN.Icons.img('gear', g.item, 16), g.n + ' × ' + D.GEAR[g.item].name)]
          : [h('span', null, AN.Icons.egg({ species: g.egg }, 18), 'Œuf de ' + D.CREATURE[g.egg].name)];
        return h('li', { class: d.done ? 'disabled' : '' }, h('span', { class: 'cost' }, give), h('span', null, '→'), h('span', { class: 'grow' }, get),
          btn(d.done ? 'Fait' : 'Échanger', () => {
            const r = Cv.trade(X, d);
            if (r === 'manque') AN.HUD.toast('Il manque des ressources dans votre sac.');
            else if (r === 'soute') AN.HUD.toast('Soute pleine.');
            UI.close(); UI.civTrade(X);
          }, 'small', d.done ? { disabled: true } : {}));
      }));
      return list;
    };
    const el = h('div', { class: 'panel dialogue' },
      h('header', null, h('h2', null, 'Commerce'), btn('Retour', () => UI.civDialogue(X), 'ghost')),
      h('p', { class: 'muted' }, 'Ils prennent ce qui est dans votre sac.'),
      render());
    UI.closeAll();
    UI.open(el);
  };

  /* ======================= Archive ======================= */
  const MOODS = [[0, 'Au bord de la révolte'], [25, 'Inquiets'], [45, 'Paisibles'], [70, 'Heureux']];
  UI.moodName = (v) => { let r = MOODS[0][1]; MOODS.forEach(([m, n]) => { if (v >= m) r = n; }); return r; };

  /** Fiche d'un village de l'Archive. */
  UI.settlement = function (st) {
    const prof = AN.Game.profile;
    const S = AN.Settlements;
    const P = D.PEOPLE[st.people];
    const att = D.ATTITUDES[st.attitude];
    const home = st.home ? prof.territories.find((t) => t.uid === st.home) : null;
    const reopen = () => UI.reopenKeep(() => { UI.close(); UI.settlement(st); });
    const gift = S.giftCost(st);
    const canGift = AN.Profile.canPay(prof, gift);
    const homeSel = h('select', { onchange: (e) => { st.home = e.target.value || null; AN.Save.write(prof); if (AN.Archive.state()) AN.Archive.rebuildSettlements(); reopen(); } },
      h('option', { value: '', selected: !st.home }, 'Le Néant (autour de l’Artefact)'),
      prof.territories.map((t) => h('option', { value: t.uid, selected: t.uid === st.home }, D.BIOME[t.biome].name + ' (' + t.world + ')' + (P.biomes.includes(t.biome) ? ' · leur biome' : ''))));
    const effects = S.effects(prof, st);
    const req = st.request;
    const el = h('div', { class: 'panel dialogue settlement' },
      h('div', { class: 'dlg-head' },
        h('div', { class: 'dlg-portrait' }, AN.CivArt.portrait(st.people, 'villager', 96)),
        h('div', null,
          h('h2', null, P.Name),
          h('p', { class: 'muted' }, st.n + ' habitant' + (st.n > 1 ? 's' : '') + ' · venus de ' + st.world + (st.forced ? ' · emmenés de force' : '')),
          h('p', { class: 'dlg-att' }, st.revealed && att.reveal ? att.reveal : st.forced ? 'Contraints' : att.name))),
      h('p', null, P.desc),
      h('div', { class: 'bars' }, h('span', null, 'Humeur'), h('div', { class: 'bar loy' + (st.mood < 45 ? ' low' : '') }, h('i', { style: { transform: 'scaleX(' + st.mood / 100 + ')' } })), h('small', null, UI.moodName(st.mood))),
      h('p', { class: 'muted' }, S.moodWhy(prof, st).join(' ')),
      h('h3', null, 'Ce qu’ils apportent'),
      h('ul', { class: 'rows' }, effects.map((e) => h('li', { class: e.active ? '' : 'disabled' }, h('span', { class: 'grow' }, e.text, e.active ? null : h('small', null, e.why))))),
      req ? h('div', { class: 'note' }, h('p', null, req.text), UI.costList(req.cost, prof),
        h('div', { class: 'actions wrap' },
          btn('Donner', () => { if (S.answer(prof, st, true)) { AN.Audio.play('ui_ok'); reopen(); } else AN.HUD.toast('Ressources insuffisantes.'); }, 'primary small', AN.Profile.canPay(prof, req.cost) ? {} : { disabled: true }),
          btn('Refuser', () => { S.answer(prof, st, false); reopen(); }, 'ghost small'))) : null,
      h('label', { class: 'field' }, h('span', null, 'Lieu de vie'), homeSel),
      h('div', { class: 'actions wrap' },
        btn('Offrir ' + Object.entries(gift).map(([k, n]) => n + ' ' + D.RESOURCES[k].name).join(', '), () => { if (S.gift(prof, st)) { AN.Audio.play('craft'); reopen(); } }, canGift ? 'small' : 'small', canGift ? {} : { disabled: true }),
        st.forced ? btn('Les laisser partir', () => UI.confirm('Les laisser partir dans le Néant ? Personne ne sait où il mène.', () => { S.release(prof, st); UI.closeAll(); }, 'Les laisser partir'), 'danger ghost small') : null,
        btn('Fermer', () => UI.close(), 'ghost')));
    UI.closeAll();
    UI.open(el, { onClose: () => AN.Save.write(prof) });
  };
})();
