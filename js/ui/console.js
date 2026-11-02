/* Console de l'Artefact (refondue en 1.8).
   En tête : le sceau de l'Archive (sa mosaïque), son rang et la marche vers le
   suivant, la réserve. À gauche, un sommaire en quatre parties : Voyager,
   Fabriquer, L'Archive, Savoir ; une pastille signale ce qui attend le joueur
   (une amélioration possible, une créature prête à évoluer, une demande…).
   Les pages se redessinent sans perdre la position de lecture. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const h = AN.h;
  const UI = AN.UI;
  const btn = (...a) => UI.btn(...a);

  /* ---------- pictogrammes du sommaire (traits, couleur du texte) ---------- */
  const ICON = {
    destinations: '<circle cx="9" cy="9" r="7"/><path d="M9 4.5 12.5 9 9 13.5 5.5 9Z"/>',
    preparation: '<path d="M5 6.5h8l1 9H4Z"/><path d="M7 6.5V5a2 2 0 0 1 4 0v1.5"/><path d="M6.5 10h5"/>',
    atelier: '<path d="M3 15l6.5-6.5"/><path d="M8 4.5l2.5-2 5 5-2 2.5Z"/><path d="M10.5 7l1.5 1.5"/>',
    artefact: '<path d="M9 2l6 7-6 7-6-7Z"/><path d="M9 6l2.6 3L9 12 6.4 9Z"/>',
    constructions: '<path d="M3 16V8l6-5 6 5v8"/><path d="M7 16v-4.5h4V16"/>',
    hexagone: '<path d="M9 1.8l6.2 3.6v7.2L9 16.2l-6.2-3.6V5.4Z"/><path d="M9 6.5l2.2 1.25v2.5L9 11.5 6.8 10.25v-2.5Z"/>',
    archive: '<path d="M9 1.8l3 1.75v3.5L9 8.8 6 7.05v-3.5Z"/><path d="M6 7.05l3 1.75v3.5l-3 1.75-3-1.75v-3.5Z"/><path d="M12 7.05l3 1.75v3.5l-3 1.75-3-1.75"/>',
    collection: '<circle cx="9" cy="10.5" r="5"/><circle cx="7.2" cy="9.6" r=".9" fill="currentColor"/><circle cx="10.8" cy="9.6" r=".9" fill="currentColor"/><path d="M5.5 6.5 4 3.5M12.5 6.5 14 3.5"/>',
    peuples: '<path d="M2.5 15.5 9 3l6.5 12.5Z"/><path d="M9 15.5V11"/>',
    bestiaire: '<path d="M1.5 9s3-5 7.5-5 7.5 5 7.5 5-3 5-7.5 5-7.5-5-7.5-5Z"/><circle cx="9" cy="9" r="2.2"/>',
    journal: '<path d="M3 3.5h4.5A1.5 1.5 0 0 1 9 5v10a1.5 1.5 0 0 0-1.5-1.5H3Z"/><path d="M15 3.5h-4.5A1.5 1.5 0 0 0 9 5v10a1.5 1.5 0 0 1 1.5-1.5H15Z"/>',
    guide: '<circle cx="9" cy="9" r="7"/><path d="M7 7.2a2 2 0 1 1 2.8 1.8c-.6.3-.8.7-.8 1.4"/><circle cx="9" cy="12.8" r=".7" fill="currentColor"/>',
  };
  const icon = (id) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 18 18'); s.setAttribute('width', '18'); s.setAttribute('height', '18');
    s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'tab-ico');
    s.innerHTML = ICON[id] || '';
    return s;
  };
  UI.tabIcon = icon;

  /** Le sommaire du registre (1.15) : quatre chapitres. */
  const GROUPS = [
    { n: 'I', name: 'Partir', tabs: ['destinations', 'preparation', 'hexagone'] },
    { n: 'II', name: 'Fabriquer', tabs: ['atelier', 'artefact', 'constructions'] },
    { n: 'III', name: 'L’Archive', tabs: ['archive', 'collection', 'peuples'] },
    { n: 'IV', name: 'Savoir', tabs: ['guide', 'bestiaire', 'journal'] },
  ];
  const TABS = {
    destinations: 'Destinations', preparation: 'Préparation', hexagone: 'Hexagone', atelier: 'Atelier', artefact: 'Améliorations', constructions: 'Constructions',
    archive: 'Vue d’ensemble', collection: 'Collection', peuples: 'Peuples', guide: 'Guide', bestiaire: 'Bestiaire', journal: 'Journal',
  };
  const chapterOf = (tab) => GROUPS.find((g) => g.tabs.includes(tab)) || GROUPS[0];
  UI.CONSOLE_TABS = TABS;

  let state = { tab: 'destinations', world: null, scale: 'region', craft: 'tout', craftCan: false, coll: 'toutes', openSlot: null };

  /** Ce qui attend le joueur, par page (pastilles du sommaire et liste « À faire »). */
  function todo(prof) {
    const P = AN.Profile;
    const out = { artefact: [], constructions: [], collection: [], peuples: [], destinations: [] };
    const rk = P.rank(prof).index;
    D.UPGRADE_ORDER.forEach((key) => {
      const lv = prof.artefact[key] || 0;
      const next = D.UPGRADES[key].levels[lv + 1];
      if (next && (next.rank || 0) <= rk && P.canPay(prof, P.upgradeCost(prof, next.cost))) out.artefact.push('Améliorer : ' + D.UPGRADES[key].name);
    });
    (AN.Structures ? AN.Structures.list(prof) : []).forEach((s) => {
      if (D.STRUCTURES[s.id] && !AN.Structures.placed(prof, s)) out.constructions.push(D.STRUCTURES[s.id].name + ' attend d’être ' + (D.STRUCTURES[s.id].kind === 'found' && !s.built ? 'reconstruite' : 'reposée'));
    });
    prof.collection.forEach((c) => {
      if (!c.lost && AN.Bonds.evolutions(prof, c).some((o) => o.ok)) out.collection.push(P.displayName(c) + ' peut évoluer');
    });
    (prof.essences || []).forEach((e) => { if (P.canPay(prof, AN.Rescue.reviveCost(e))) out.collection.push('Une essence peut être réincarnée'); });
    (prof.settlements || []).forEach((st) => { if (st.request) out.peuples.push(D.PEOPLE[st.people].Name + ' ont une demande'); });
    (prof.destinations || []).forEach((w) => { if (w.rescue) out.destinations.push('Mission de sauvetage : ' + w.code); });
    return out;
  }

  /** Redessine un conteneur sans perdre la position de lecture ni l'élément actif. */
  UI.keepPlace = function (container, fn) {
    const scrollers = [];
    for (let el = container; el && el !== document.body; el = el.parentElement) if (el.scrollTop) scrollers.push([el, el.scrollTop]);
    container.querySelectorAll('*').forEach((el) => { if (el.scrollTop) scrollers.push([el, el.scrollTop, el.dataset.keep]); });
    const focusables = () => [...container.querySelectorAll('button, input, select, [tabindex]')];
    const act = document.activeElement;
    const fi = act && container.contains(act) ? focusables().indexOf(act) : -1;
    fn();
    scrollers.forEach(([el, top, k]) => {
      if (el.isConnected) el.scrollTop = top;
      else if (k) { const twin = container.querySelector('[data-keep="' + k + '"]'); if (twin) twin.scrollTop = top; }
    });
    if (fi >= 0) { const f = focusables()[Math.min(fi, focusables().length - 1)]; if (f) f.focus({ preventScroll: true }); }
  };

  /**
   * La console (1.15) : un registre ouvert. Page de gauche : l'Artefact (sa forme et sa
   * couleur du moment), le rang de l'Archive, la réserve, le sommaire en quatre
   * chapitres. Page de droite : le chapitre en cours, ses pages, l'aide (« ? »).
   */
  UI.console = function (tab) {
    const prof = AN.Game.profile;
    if (tab) state.tab = tab;
    if (state.tab === 'preparation' && !state.world) state.tab = 'destinations';
    const nav = h('nav', { class: 'reg-index', 'aria-label': 'Sommaire de la console' });
    const content = h('div', { class: 'tab-content', 'data-keep': 'console' });
    const head = h('header', { class: 'console-head' });
    const crumb = h('div', { class: 'reg-crumb' });
    const tabsRow = h('div', { class: 'reg-tabs', role: 'tablist' });
    const el = h('div', { class: 'panel console registre' },
      h('aside', { class: 'reg-left' }, head, nav),
      h('section', { class: 'reg-right' }, h('div', { class: 'reg-top' }, crumb, btn('Fermer', () => UI.close(), 'ghost small reg-close')), tabsRow, content));
    const show = (id) => {
      const same = id === state.tab && content.firstChild;
      state.tab = id;
      state.lastTab = state.lastTab || {};
      state.lastTab[chapterOf(id).n] = id; // on revient à la dernière page lue du chapitre
      if (!same) state.openSlot = null;
      const render = () => {
        const td = todo(prof);
        const cur = chapterOf(id);
        AN.clear(nav);
        GROUPS.forEach((g) => {
          const tabs = g.tabs.filter((t) => t !== 'preparation' || state.world);
          const n = tabs.reduce((s, t) => s + (td[t] || []).length, 0);
          nav.appendChild(h('button', { type: 'button', class: 'chapter' + (g === cur ? ' on' : ''), 'aria-current': g === cur ? 'true' : null,
            onclick: () => { AN.Audio.play('tab'); show(g === cur ? id : (state.lastTab && state.lastTab[g.n]) || g.tabs[0]); } },
            h('span', { class: 'chap-n' }, g.n), h('span', { class: 'chap-name' }, g.name), h('span', { class: 'dots' }),
            n ? h('span', { class: 'badge', 'aria-label': n + ' à voir', title: tabs.flatMap((t) => td[t] || []).join('\n') }, String(n)) : null));
        });
        // les pages du chapitre, en onglets
        AN.clear(tabsRow);
        cur.tabs.filter((t) => t !== 'preparation' || state.world).forEach((t) => {
          const n = (td[t] || []).length;
          tabsRow.appendChild(h('button', { class: 'tab' + (t === id ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': t === id ? 'true' : 'false', title: n ? td[t].join('\n') : null,
            onclick: () => { AN.Audio.play('tab'); show(t); } }, icon(t), h('span', { class: 'tab-name' }, TABS[t]), n ? h('span', { class: 'badge', 'aria-label': n + ' à voir' }, String(n)) : null));
        });
        AN.clear(crumb);
        crumb.appendChild(h('span', { class: 'crumb-n' }, cur.n));
        crumb.appendChild(h('span', null, cur.name + ' · ' + TABS[id]));
        AN.clear(content);
        content.appendChild(RENDER[id](prof, show, td));
        renderHead(head, prof, show);
        if (UI.tourStep) UI.tourStep(el);
      };
      if (same) UI.keepPlace(el, render);
      else { render(); content.scrollTop = 0; }
    };
    UI.closeAll();
    UI.open(el, { cls: 'console-overlay', onClose: () => { AN.Save.write(prof); const A = AN.Archive.state(); if (A) AN.HUD.refreshArchive(A); } });
    show(state.tab);
    UI.refreshConsole = () => show(state.tab);
    UI.consoleShow = show;
    UI.consoleTab = () => state.tab;
    // à la première ouverture : la visite guidée (1.15)
    if (AN.Tips && !(prof.flags.tips && prof.flags.tips.tour) && !AN.X) setTimeout(() => { if (el.isConnected) UI.startTour(); }, 400);
  };

  /* ---------- en-tête : sceau, rang, réserve ---------- */
  function renderHead(head, prof, show) {
    const P = AN.Profile;
    const rk = P.rank(prof);
    const rates = AN.Production.rates(prof);
    let perMin = 0;
    for (const k in rates) for (const r in rates[k]) perMin += rates[k][r];
    const people = (prof.settlements || []).reduce((s, st) => s + (st.n || 0), 0);
    const facts = [prof.territories.length + ' territoire' + (prof.territories.length > 1 ? 's' : ''), prof.collection.length + ' créature' + (prof.collection.length > 1 ? 's' : '')];
    if (people) facts.push(people + ' habitant' + (people > 1 ? 's' : ''));
    if (perMin > 0) facts.push(perMin.toFixed(perMin < 10 ? 1 : 0).replace('.', ',') + ' ressources par minute');
    const next = rk.next ? nextRank(rk) : null;
    const entries = Object.entries(prof.stock).filter(([, n]) => n > 0).sort((a, b) => D.RESOURCES[b[0]].rarity - D.RESOURCES[a[0]].rarity || b[1] - a[1]);
    const open = !!state.reserveOpen;
    AN.clear(head);
    head.appendChild(h('button', { type: 'button', class: 'seal artefact-seal', title: 'L’Artefact : ' + AN.Story.form(prof).name.toLowerCase() + ' (vue d’ensemble de l’Archive)', onclick: () => { AN.Audio.play('tab'); show('archive'); } }, artefactCanvas(prof)));
    head.appendChild(h('div', { class: 'ch-title' },
      h('h2', null, 'L’Artefact'),
      h('p', { class: 'ch-facts' }, h('b', null, 'Archive : ' + rk.def.name), ', ' + facts.join(', ') + '.'),
      next ? h('div', { class: 'ch-next', title: next.text }, h('span', null, 'Vers ' + next.name), h('div', { class: 'bar thin' }, h('i', { style: { transform: 'scaleX(' + next.k + ')' } })), h('small', null, next.short)) : null));
    head.appendChild(h('button', { type: 'button', class: 'reserve-btn' + (open ? ' on' : ''), 'aria-expanded': open ? 'true' : 'false', onclick: () => { state.reserveOpen = !state.reserveOpen; AN.Audio.play('ui'); renderHead(head, prof, show); } },
      h('span', { class: 'reserve-label' }, 'Réserve'),
      h('span', { class: 'reserve-top' }, entries.slice(0, 6).map(([k, n]) => h('span', { title: D.RESOURCES[k].name }, AN.Icons.img('res', k, 15), U.fmt(n)))),
      entries.length > 6 ? h('small', { class: 'reserve-more' }, '+' + (entries.length - 6)) : null,
      entries.length ? h('small', { class: 'reserve-count' }, entries.length + ' ressource' + (entries.length > 1 ? 's' : '')) : null,
      !entries.length ? h('small', { class: 'muted' }, 'vide') : null));
    if (open) {
      const byR = {};
      entries.forEach(([k, n]) => { const r = D.RESOURCES[k].rarity; (byR[r] = byR[r] || []).push([k, n]); });
      head.appendChild(h('div', { class: 'reserve-pop' },
        Object.keys(byR).sort((a, b) => b - a).map((r) => h('div', { class: 'reserve-row' }, h('span', { class: 'rar' }, D.RARITY[r] ? D.RARITY[r].name : ''),
          h('div', { class: 'reslist' }, byR[r].map(([k, n]) => h('span', { class: 'r', title: D.RESOURCES[k].name }, AN.Icons.img('res', k, 18), h('b', null, U.fmt(n)), h('small', null, D.RESOURCES[k].name)))))),
        !entries.length ? h('p', { class: 'muted' }, 'La réserve est vide : récoltez en expédition, ramassez ce que produit l’Archive.') : null));
    }
  }
  /** L'Artefact, vivant, en haut du registre : sa forme et sa couleur du moment (1.15). */
  let artCv = null;
  function artefactCanvas(prof) {
    if (artCv && artCv.isConnected) return artCv;
    const cv = h('canvas', { width: 160, height: 160, class: 'artefact-live' });
    artCv = cv;
    const t0 = performance.now();
    const loop = (now) => {
      if (!cv.isConnected && now - t0 > 500) return;
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, 160, 160);
      AN.ArtefactArt.draw(ctx, 80, 92, (now - t0) / 1000, Object.assign(AN.Story.look(prof), { size: 1.25, shadow: true }));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return cv;
  }

  /** Progression vers le rang suivant : part accomplie, texte court. */
  function nextRank(rk) {
    const n = rk.next.need, c = rk.counts;
    const parts = [];
    let done = 0, tot = 0;
    const add = (k, label) => { if (!n[k]) return; parts.push(Math.min(c[k] || 0, n[k]) + '/' + n[k] + ' ' + label); done += Math.min(c[k] || 0, n[k]) / n[k]; tot++; };
    add('territories', 'territoires'); add('guardians', 'gardiens'); add('ultras', 'colosses régionaux'); add('souverains', 'colosses du monde');
    add('cataclysmes', 'cataclysmes'); add('astres', 'astres'); add('stellaires', 'entités stellaires'); add('galactiques', 'organismes galactiques'); add('amas', 'entités d’amas'); add('toiles', 'entités de la Toile');
    return { name: rk.next.mystery ? '???' : rk.next.name, k: tot ? done / tot : 0, short: parts.join(', '), text: 'Prochain rang : ' + (rk.next.mystery ? '???' : rk.next.name) + ' (' + parts.join(', ') + ')' };
  }

  UI.rankProgress = nextRank;

  /** En-tête de page : titre, phrase d'explication, actions. */
  const page = (cls, title, desc, actions, ...body) => {
    const help = D.HELP && D.HELP[cls];
    state.help = state.help || {};
    const note = help ? h('aside', { class: 'help-note', hidden: !state.help[cls] }, h('b', null, 'Comment ça marche'), h('ul', null, help.map((t) => h('li', null, t)))) : null;
    const helpBtn = help ? h('button', { type: 'button', class: 'help-btn' + (state.help[cls] ? ' on' : ''), title: 'Comment ça marche', 'aria-label': 'Aide de la page', 'aria-expanded': state.help[cls] ? 'true' : 'false',
      onclick: () => { state.help[cls] = !state.help[cls]; note.hidden = !state.help[cls]; helpBtn.classList.toggle('on', !!state.help[cls]); helpBtn.setAttribute('aria-expanded', state.help[cls] ? 'true' : 'false'); AN.Audio.play('ui'); } }, '?') : null;
    return h('div', { class: 'page ' + cls },
      h('div', { class: 'page-head' }, h('div', null, h('h3', { class: 'page-title' }, title, helpBtn), desc ? h('p', { class: 'page-desc' }, desc) : null), actions ? h('div', { class: 'page-actions' }, actions) : null),
      note, body);
  };
  UI.consolePage = page;

  const RENDER = {};

  /* ---------- Destinations ---------- */
  RENDER.destinations = function (prof, show) {
    const ech = AN.Profile.echelons(prof);
    const places = AN.Places.list(prof);
    if (state.scale === 'lieux' && !places.length) state.scale = 'region';
    if (state.scale === 'lieux') return placesPage(prof, show, ech, places);
    if (!ech.some((x) => x.e.id === state.scale && x.open)) state.scale = 'region';
    const list = AN.Profile.destinations(prof, state.scale);
    const scanCost = { etincelle: 3, verre: 2 };
    const rk = AN.Profile.rank(prof).index;
    // les échelons apparaissent quand l'Archive approche de l'échelle correspondante
    const shown = ech.filter((x) => x.open || rk + 1 >= x.e.rank);
    const E = D.ECHELONS[state.scale];
    const chips = echelonChips(shown, places, show);
    const scan = h('div', { class: 'scan' }, btn('Recalibrer le scanner', () => {
      if (!AN.Profile.pay(prof, scanCost)) { AN.Audio.play('ui_err'); AN.HUD.toast('Il faut 3 Étincelles et 2 Sables vitreux pour recalibrer.'); return; }
      prof.scans++;
      AN.Profile.refreshDestinations(prof);
      state.world = null;
      AN.Save.write(prof);
      AN.Audio.play('scan');
      show('destinations');
    }, 'ghost small', { title: 'Capter d’autres mondes' }), UI.costList(scanCost, prof));
    return page('destinations', 'Destinations', 'Les mondes que capte l’Artefact. Leur danger est donné pour vous ; chacun sera détruit à votre départ.', scan,
      chips,
      E.id !== 'region' ? h('div', { class: 'note echelon-note' }, h('b', null, E.plural + '. '), E.desc + ' Déplacement : ' + E.moveDesc.toLowerCase() + '. Phénomène propre : ' + E.threatDesc.toLowerCase() + '. Capture du maître des lieux : ' + D.CAPTURE_FORMS[E.form].name.toLowerCase() + '.') : null,
      searchPanel(prof, show, list),
      h('div', { class: 'view-toggle', role: 'tablist' },
        ['carte', 'liste'].map((v) => h('button', { type: 'button', role: 'tab', class: 'seg' + ((state.view || 'carte') === v ? ' on' : ''), 'aria-selected': (state.view || 'carte') === v ? 'true' : 'false',
          onclick: () => { AN.Audio.play('tab'); state.view = v; show('destinations'); } }, v === 'carte' ? 'Carte' : 'Liste'))),
      destinationsBody(prof, show, list));
  };

  /** Les échelons d'expédition, et les lieux ancrés quand il y en a (1.10). */
  function echelonChips(shown, places, show) {
    if (shown.length <= 1 && !places.length) return null;
    return h('div', { class: 'echelons', role: 'tablist' }, shown.map((x) => h('button', {
      class: 'echelon' + (x.e.id === state.scale ? ' on' : '') + (x.open ? '' : ' locked'), type: 'button', disabled: !x.open,
      title: x.open ? x.e.desc || '' : 'Requiert une Archive de rang ' + D.RANKS[x.e.rank].name,
      onclick: () => { AN.Audio.play('tab'); state.scale = x.e.id; state.world = null; show('destinations'); },
    }, x.e.plural, x.open ? null : h('small', null, D.RANKS[x.e.rank].name))),
    places.length ? h('button', { class: 'echelon places' + (state.scale === 'lieux' ? ' on' : ''), type: 'button', title: 'Ce que vous avez ramené : on y retourne sans limite',
      onclick: () => { AN.Audio.play('tab'); state.scale = 'lieux'; state.world = null; show('destinations'); } }, 'Lieux ancrés', h('small', null, String(places.length))) : null);
  }

  /** Lieux ancrés (1.10) : les mondes, astres et galaxies qu'on a ramenés. */
  function placesPage(prof, show, ech, places) {
    const rk = AN.Profile.rank(prof).index;
    const shown = ech.filter((x) => x.open || rk + 1 >= x.e.rank);
    const pick = (pl) => { state.world = AN.Places.world(prof, pl); state.openSlot = null; AN.Audio.play('ui_ok'); show('preparation'); };
    const order = ['monde', 'orbite', 'systeme', 'galaxie', 'amas', 'toile'];
    const sorted = places.slice().sort((a, b) => order.indexOf(a.scale) - order.indexOf(b.scale));
    return page('destinations', 'Destinations', 'Les lieux ancrés sont ce que vous avez ramené. L’Artefact s’y téléporte sans limite ; ils ne sont jamais détruits.', null,
      echelonChips(shown, places, show),
      h('p', { class: 'note place-note' }, 'On y récolte et l’on y capture ; on peut y tomber, et perdre l’équipement non lié. Au retour, pas d’effondrement : le lieu reste tel que vous l’avez laissé. Les gisements repoussent en ' + D.PLACES.regrow + ' minutes, les créatures reviennent en ' + D.PLACES.respawn + ', les gardiens en ' + D.PLACES.guardian + '. On ne rapporte pas de territoire d’un lieu ancré.'),
      h('div', { class: 'world-grid' }, sorted.map((pl) => {
        const w = AN.Places.world(prof, pl);
        const v = AN.Places.visit(prof, pl.id);
        const card = worldCard(w, prof, () => pick(pl));
        card.insertBefore(h('p', { class: 'muted small' }, D.ECHELONS[pl.scale].name + ' · rapporté de ' + (pl.from || '?') + (v ? ' · ' + v.count + ' visite' + (v.count > 1 ? 's' : '') : ' · jamais visité')), card.children[1] || null);
        return card;
      })));
  }
  UI.openPlace = function (placeId) {
    const prof = AN.Game.profile;
    const pl = AN.Places.find(prof, placeId);
    if (!pl) return;
    state.scale = 'lieux';
    state.world = AN.Places.world(prof, pl);
    UI.console('preparation');
  };

  /** Carte interactive (par défaut) ou liste de fiches. */
  function destinationsBody(prof, show, list) {
    const pick = (w) => { state.world = w; state.openSlot = null; AN.Audio.play('ui_ok'); show('preparation'); };
    if ((state.view || 'carte') === 'liste' || !list.length || !AN.WorldMap) return h('div', { class: 'world-grid' }, list.map((w) => worldCard(w, prof, () => pick(w))));
    const target = AN.Search.get(prof);
    let sel = list.includes(state.mapSel) ? state.mapSel : null;
    if (!sel && target) sel = list.find((w) => AN.Search.scanWorld(w, target).total > 0) || null;
    sel = sel || list.find((w) => w.rescue) || list[0];
    state.mapSel = sel;
    const side = h('div', { class: 'map-side' });
    const fill = (w) => { AN.clear(side); side.appendChild(worldCard(w, prof, () => pick(w))); };
    const map = AN.WorldMap.create({ worlds: list, prof, selected: sel, search: target, onSelect: (w) => { state.mapSel = w; fill(w); } });
    fill(sel);
    return h('div', { class: 'map-layout' },
      h('div', { class: 'map-col' }, map,
        h('div', { class: 'map-legend' },
          h('span', { class: 'legend-grades' }, AN.Danger.GRADES.map((g, i) => h('span', { class: 'legend-grade danger-' + g.id, title: g.note }, h('i', { style: { background: AN.WorldMap.COLORS[i] } }), g.name))),
          h('span', { class: 'legend-picto muted' }, h('span', null, h('i', { class: 'lg-house' }), 'peuple'), h('span', null, h('i', { class: 'lg-dot' }), 'caveau'), h('span', null, h('i', { class: 'lg-rescue' }), 'sauvetage'), target ? h('span', null, h('i', { class: 'lg-hit' }), 'votre recherche') : null),
          h('small', { class: 'muted' }, 'Survolez un monde pour un aperçu, touchez-le pour sa fiche ; flèches du clavier : parcourir.'))),
      side);
  }

  /**
   * Recherche précise : rien n'est indiqué tant que le joueur ne cherche rien.
   * Quand il désigne une ressource ou une créature, l'Artefact dit exactement
   * quels mondes la contiennent, et où.
   */
  function searchPanel(prof, show, list) {
    const Se = AN.Search;
    const t = Se.get(prof);
    const opts = Se.options(prof);
    const kind = state.searchKind || (t ? t.kind : 'res');
    const ids = kind === 'res' ? opts.res : opts.crea;
    const kindSel = h('select', { 'aria-label': 'Type de recherche', onchange: (e) => { state.searchKind = e.target.value; show('destinations'); } },
      h('option', { value: 'res', selected: kind === 'res' }, 'Ressource'), h('option', { value: 'creature', selected: kind === 'creature' }, 'Créature'));
    const itemSel = h('select', { 'aria-label': kind === 'res' ? 'Ressource recherchée' : 'Créature recherchée', disabled: !ids.length },
      ids.length ? ids.map((id) => h('option', { value: id, selected: !!t && t.kind === kind && t.id === id }, kind === 'res' ? D.RESOURCES[id].name : D.CREATURE[id].name))
        : h('option', { value: '' }, 'Aucune créature observée'));
    const go = btn('Chercher', () => {
      if (!itemSel.value) return;
      Se.set(prof, kind, itemSel.value);
      state.mapSel = null;
      AN.Audio.play('scan');
      show('destinations');
    }, 'primary small', { disabled: !ids.length });
    const row = h('div', { class: 'search-row' }, h('b', null, 'Je cherche'), kindSel, itemSel, go,
      t ? btn('Effacer', () => { Se.set(prof, null); AN.Audio.play('ui'); show('destinations'); }, 'ghost small') : null);
    if (!t) return h('section', { class: 'search-box' }, row, h('p', { class: 'muted small' }, 'Une ressource, ou une créature déjà observée : l’Artefact dit quels mondes en ont, et vous guide sur place.'));
    const hits = list.map((w) => ({ w, r: Se.scanWorld(w, t) })).filter((x) => x.r.total > 0);
    const label = Se.label(t);
    const ico = t.kind === 'res' ? AN.Icons.img('res', t.id, 20) : AN.Icons.img('creature', t.id, 24);
    const elsewhere = Se.scalesFor(t).filter((s) => s !== state.scale);
    const sweep = h('div', { class: 'actions' },
      btn('Balayage ciblé', () => {
        const res = Se.sweep(prof, t, state.scale);
        if (res.error) { AN.Audio.play('ui_err'); AN.HUD.toast(res.error, 5); return; }
        AN.Audio.play('rank');
        state.scale = res.scale; state.mapSel = res.world; state.view = state.view || 'carte';
        AN.HUD.toast('Monde trouvé : ' + res.world.code + '. ' + Se.summary(res.world, t), 6);
        show('destinations');
      }, 'small'), UI.costList(Se.sweepCost(prof), prof),
      h('small', { class: 'muted' }, 'L’Artefact cherche un monde qui contient ' + label + ' et l’ajoute aux destinations.'));
    return h('section', { class: 'search-box on' }, row,
      h('div', { class: 'search-result' }, ico,
        hits.length
          ? h('div', null, h('p', null, h('b', null, label), ' : présent dans ' + hits.length + ' destination' + (hits.length > 1 ? 's' : '') + ' captée' + (hits.length > 1 ? 's' : '') + '.'),
            h('ul', { class: 'hits' }, hits.map((x) => h('li', null, h('button', { type: 'button', class: 'linkish', onclick: () => { state.mapSel = x.w; state.view = 'carte'; show('destinations'); } }, x.w.code), ' ' + Se.summary(x.w, t)))))
          : h('div', null, h('p', { class: 'warn' }, 'Aucune destination captée ici ne contient ' + label + '.'),
            elsewhere.length ? h('p', { class: 'muted' }, 'On en trouve aussi parmi les ' + elsewhere.map((s) => D.ECHELONS[s].plural.toLowerCase()).join(', ') + '.') : null)),
      sweep,
      h('p', { class: 'muted small' }, 'La recherche reste active en expédition : une flèche bleue mène à la cible la plus proche, et la mini-carte la marque.'));
  }

  /** Raccourci depuis l'Atelier ou le Bestiaire : ouvrir les destinations avec une recherche. */
  UI.seek = function (kind, id) {
    const prof = AN.Game.profile;
    if (!prof || !AN.Search) return;
    AN.Search.set(prof, kind, id);
    state.searchKind = kind;
    state.mapSel = null;
    state.view = 'carte';
    if (AN.Game.scene && AN.Game.scene === AN.Expedition.scene) { if (AN.X) AN.X.search = AN.Search.get(prof); return; }
    UI.console('destinations');
  };

  /** Le danger, en tampon : quatre cases, la couleur et le mot (1.15). */
  UI.dangerStamp = function (d) {
    return h('span', { class: 'danger-stamp danger-' + d.id, title: d.note }, h('i', { 'aria-hidden': 'true' }, [0, 1, 2, 3].map((k) => h('b', { class: k <= d.rank ? 'on' : '' }))), d.name);
  };

  /**
   * La fiche d'un monde (1.15) : le danger pour vous, ce qu'on y trouve, les conditions.
   * Tout y est exact ; ce que le scanner ne perçoit pas encore est marqué d'un « ? ».
   */
  function worldCard(w, prof, onPick) {
    const f = AN.Fiche.of(w, prof, state.world === w ? prof.loadout : null);
    const swatch = h('canvas', { class: 'world-swatch', width: 220, height: 70 });
    drawSwatch(swatch, w);
    const lostHere = w.rescue ? prof.collection.filter((c) => w.rescue.uids.includes(c.uid)) : [];
    const target = AN.Search ? AN.Search.get(prof) : null;
    const found = target ? AN.Search.scanWorld(w, target) : null;
    const unknown = (need) => h('span', { class: 'unknown', title: 'Le scanner ne le perçoit pas encore (fiabilité ' + need + ' % requise).' }, '?');
    const pct = (k) => Math.round(AN.Fiche.NEED[k] * 100);
    const row = (k, v) => [h('dt', null, k), h('dd', null, v)];
    const R = (id) => D.RULES.find((x) => x.id === id) || { name: id, desc: '' };
    const A = (id) => D.ANOMALIES.find((x) => x.id === id) || { name: id, desc: '' };
    const res = h('div', { class: 'fiche-res' }, f.resources.map((r) => h('span', { class: 'res-chip lv' + r.level, title: D.RESOURCES[r.id].name + ' : ' + AN.Fiche.ABUNDANCE[r.level].toLowerCase() },
      AN.Icons.img('res', r.id, 18), h('small', null, D.RESOURCES[r.id].name), h('i', { 'aria-hidden': 'true' }, [1, 2, 3].map((k) => h('b', { class: k <= r.level ? 'on' : '' }))))));
    const plural = (n, s) => n + ' ' + s + (n > 1 ? 's' : '');
    const knownF = f.fauna ? f.fauna.filter((x) => x.known) : [], newF = f.fauna ? f.fauna.length - knownF.length : 0;
    const fauna = !f.fauna ? h('span', null, plural(f.faunaCount, 'espèce') + ' ', unknown(pct('fauna')))
      : !knownF.length ? plural(f.faunaCount, 'espèce') + ', aucune encore observée'
        : h('span', { class: 'fiche-fauna' }, knownF.slice(0, 10).map((x) => h('span', { title: D.CREATURE[x.id].name }, AN.Icons.img('creature', x.id, 26))),
          knownF.length > 10 ? h('small', { class: 'muted' }, ' +' + (knownF.length - 10)) : null,
          newF ? h('small', { class: 'muted' }, ' et ' + plural(newF, 'espèce') + ' jamais observée' + (newF > 1 ? 's' : '')) : null);
    const people = !f.people ? 'Aucun' : f.people.nation ? h('b', null, AN.Nations.realm(f.people.people) + ' : une ville par zone') : f.people.unknown ? h('span', null, 'Un peuple ', unknown(pct('people'))) : D.PEOPLE[f.people.people].Name + ', environ ' + (Math.round(f.people.n / 5) * 5 || 5);
    const vaults = !f.vaults.n ? 'Aucun' : f.vaults.keys ? h('span', { class: 'tags' }, f.vaults.keys.map((k) => h('span', { class: 'tag', title: D.KEYS[k].barrier + ' : nécessite un compagnon doté de « ' + D.KEYS[k].name + ' »' }, h('i', { style: { background: D.KEYS[k].color } }), D.KEYS[k].name)))
      : h('span', null, f.vaults.n + ' scellé' + (f.vaults.n > 1 ? 's' : '') + ' ', unknown(pct('vaults')));
    const guardians = f.guardians ? f.guardians.map((g) => D.CREATURE[g].name).join(', ') : unknown(pct('guardians'));
    const miss = AN.Fiche.missing(f);
    return h('article', { class: 'world-card fiche' + (state.world === w ? ' picked' : '') + (w.rescue ? ' rescue' : '') + (found && found.total ? ' hit' : '') },
      swatch,
      h('h3', null, w.place ? w.placeName : w.code, w.found ? h('span', { class: 'tag found' }, 'Balayage') : null, w.place ? h('span', { class: 'tag found' }, 'Ancré') : null, w.nation && !w.place ? h('span', { class: 'tag nation' }, 'Nation') : null),
      h('p', { class: 'region' }, w.place ? w.placeWhy || w.code : w.region),
      h('div', { class: 'fiche-danger' }, UI.dangerStamp(f.danger), h('small', { class: 'muted', title: 'Écart de 10 niveaux : une force double' }, 'monde niveau ' + f.danger.world + ' · vous ' + f.danger.you), h('p', null, f.danger.note)),
      target ? h('p', { class: found.total ? 'search-hit' : 'search-miss' }, h('b', null, 'Recherche. '), AN.Search.summary(w, target)) : null,
      w.rescue ? h('p', { class: 'warn' }, 'Mission de sauvetage : ' + lostHere.map((c) => AN.Profile.displayName(c)).join(', ') + '. Ce monde s’effondrera dans ' + Math.max(0, w.rescue.until - prof.expeditions) + ' expédition(s).') : null,
      h('h4', { class: 'fiche-h' }, 'Ce qu’on y trouve'),
      res,
      h('dl', { class: 'facts' },
        row('Faune', fauna),
        row('Gardiens', guardians),
        f.master ? row((D.TIERS[D.CREATURE[f.master].tier] || { name: 'Maître' }).name, D.CREATURE[f.master].name + (D.COLOSSI && D.COLOSSI[f.master] ? ', un colosse' : '')) : null,
        row('Peuple', people),
        row('Caveaux', vaults),
        f.structures.n ? row('Structures', f.structures.ids ? f.structures.ids.map((id) => D.STRUCTURES[id].name).join(', ') : h('span', null, f.structures.n + ' ', unknown(pct('structures')))) : null,
        f.events.n ? row('Événements', f.events.ids ? f.events.ids.map((id) => D.WORLD_EVENTS[id].name).join(', ') : h('span', null, 'possibles ', unknown(pct('events')))) : null),
      h('h4', { class: 'fiche-h' }, 'Conditions'),
      h('dl', { class: 'facts' },
        row('Paysages', h('span', { class: 'fiche-biomes' }, f.biomes.map((b) => h('span', { class: 'biome-chip', style: { borderColor: D.BIOME[b].ground[2] } }, h('i', { style: { background: D.BIOME[b].ground[1] } }), D.BIOME[b].name)))),
        row('Taille', (f.size ? f.size + ', ' : '') + f.zones + ' ' + (f.scale !== 'region' && D.ECHELONS[f.scale] ? D.ECHELONS[f.scale].unit.toLowerCase() + (f.zones > 1 ? 's' : '') : 'zone' + (f.zones > 1 ? 's' : '')) + ' et un cœur'),
        row('Règle', f.rule ? h('span', { title: R(f.rule).desc }, R(f.rule).name + (R(f.rule).desc ? ' : ' + R(f.rule).desc.charAt(0).toLowerCase() + R(f.rule).desc.slice(1) : '')) : unknown(pct('rule'))),
        row('Anomalie', f.anomaly ? h('span', { title: A(f.anomaly).desc }, A(f.anomaly).name) : unknown(pct('anomaly'))),
        row('Stabilité', f.anchored ? 'Ancré : il ne s’effondre pas' : f.stability + ' %')),
      miss ? h('p', { class: 'fiche-miss muted' }, 'Scanner : fiabilité ' + Math.round(f.reliability * 100) + ' %. Les « ? » se lèvent à ' + miss + ' % (Fabriquer, Améliorations).') : null,
      btn(w.place ? 'S’y rendre' : 'Préparer l’expédition', onPick, 'primary block'));
  }
  UI.worldCard = (w, prof, onPick) => worldCard(w, prof, onPick);

  function drawSwatch(cv, w) {
    const ctx = cv.getContext('2d');
    const n = w.zones.length;
    const W = cv.width, H = cv.height;
    const rng = AN.RNG.from(w.seed, 'swatch');
    w.zones.forEach((z, i) => {
      const b = D.BIOME[z.biome];
      const x0 = (i / n) * W, x1 = ((i + 1) / n) * W;
      ctx.fillStyle = b.ground[1];
      ctx.fillRect(x0, 0, x1 - x0 + 1, H);
      for (let k = 0; k < 26; k++) {
        ctx.fillStyle = U.rgba(rng.pick([b.wall.top, b.wall.base, b.ground[2], b.accent]), 0.8);
        const x = rng.float(x0, x1), y = rng.float(0, H), r = rng.float(2, 9);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      if (z.mix) { ctx.fillStyle = U.rgba(D.BIOME[z.mix].ground[1], 0.7); ctx.beginPath(); ctx.arc(rng.float(x0, x1), rng.float(0, H), 18, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.strokeStyle = 'rgba(28,34,48,0.6)';
    for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo((i / n) * W, 0); ctx.lineTo((i / n) * W, H); ctx.stroke(); }
  }
  UI.drawSwatch = drawSwatch;

  /* ---------- Préparation ---------- */
  function gearStats(g) {
    if (g.slot === 'ranged') return Math.round(g.dmg * (g.count || 1)) + ' dégâts' + (g.count > 1 ? ' (' + g.count + ' projectiles)' : '') + ', ' + String(g.rate).replace('.', ',') + ' tirs/s' + (g.pierce ? ', perce ' + g.pierce : '') + (g.explode ? ', explose' : '') + (g.slow ? ', ralentit' : '');
    if (g.slot === 'melee') return g.dmg + ' dégâts, ' + (1 / g.cd).toFixed(1).replace('.', ',') + ' coups/s, portée ' + g.range + (g.lifesteal ? ', vol de vie' : '');
    if (g.slot === 'armor') return g.desc;
    if (g.slot === 'bag') return g.cap + ' unités';
    return g.desc;
  }

  RENDER.preparation = function (prof, show) {
    const P = AN.Profile;
    const w = state.world;
    const L = prof.loadout;
    const owned = (id) => (D.GEAR[id].bound ? 1 : prof.owned[id] || 0);
    const redraw = () => { AN.Save.write(prof); show('preparation'); };

    /** Un emplacement : sa carte, et sous elle (si ouvert) le choix parmi ce qu'on possède. */
    const slotCard = (slot, label, allowNone) => {
      const items = Object.keys(D.GEAR).filter((id) => D.GEAR[id].slot === slot && owned(id) > 0);
      const cur = L[slot] ? D.GEAR[L[slot]] : null;
      const open = state.openSlot === slot;
      const card = h('button', { type: 'button', class: 'slot-card' + (open ? ' open' : '') + (cur ? '' : ' vacant'), 'aria-expanded': open ? 'true' : 'false',
        onclick: () => { state.openSlot = open ? null : slot; AN.Audio.play('ui'); show('preparation'); } },
        h('span', { class: 'slot-ico' }, cur ? AN.Icons.img('gear', L[slot], 30) : null),
        h('span', { class: 'slot-txt' }, h('small', null, label), h('b', null, cur ? cur.name : 'Aucun'), cur ? h('small', { class: 'muted' }, gearStats(cur)) : null),
        h('span', { class: 'slot-tag' + (cur && !cur.bound ? ' risk' : '') }, cur ? (cur.bound ? 'Lié' : 'Risqué') : ''));
      if (!open) return card;
      const choice = (id) => {
        const g = id ? D.GEAR[id] : null;
        const on = (L[slot] || null) === id;
        return h('button', { type: 'button', class: 'choice' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false',
          onclick: () => { L[slot] = id; state.openSlot = null; AN.Audio.play(id ? 'equip' : 'ui'); redraw(); } },
          g ? AN.Icons.img('gear', id, 26) : h('span', { class: 'none-ico' }),
          h('span', null, h('b', null, g ? g.name : 'Aucun'), h('small', null, g ? gearStats(g) : 'Laisser l’emplacement vide'),
            g ? h('small', { class: g.bound ? 'muted' : 'risk-text' }, g.bound ? 'Lié : jamais perdu' : 'En réserve : ' + owned(id) + ' · perdu si vous tombez') : null));
      };
      return h('div', { class: 'slot-open' }, card, h('div', { class: 'choices' }, allowNone ? choice(null) : null, items.map(choice),
        !items.length ? h('p', { class: 'muted small' }, 'Rien à équiper ici : fabriquez-en à l’Atelier.') : null));
    };

    // consommables
    const consTypes = Object.keys(D.GEAR).filter((id) => D.GEAR[id].slot === 'consumable');
    L.consumables = (L.consumables || []).filter((c) => c.n > 0 && (prof.owned[c.id] || 0) > 0);
    const consTiles = consTypes.filter((id) => (prof.owned[id] || 0) > 0 || L.consumables.some((c) => c.id === id)).map((id) => {
      const g = D.GEAR[id];
      const have = prof.owned[id] || 0;
      const entry = L.consumables.find((c) => c.id === id);
      const n = entry ? Math.min(entry.n, have) : 0;
      const set = (v) => {
        v = U.clamp(v, 0, Math.min(have, AN.Profile.consumableMax(prof)));
        let e = L.consumables.find((c) => c.id === id);
        if (v > 0 && !e) {
          if (L.consumables.length >= D.CONSUMABLE_SLOTS) { AN.Audio.play('ui_err'); AN.HUD.toast('Quatre types de consommables au maximum.'); return; }
          L.consumables.push((e = { id, n: 0 }));
        }
        if (e) e.n = v;
        L.consumables = L.consumables.filter((c) => c.n > 0);
        AN.Audio.play(v > n ? 'equip' : 'ui');
        redraw();
      };
      return h('div', { class: 'cons-tile' + (n ? ' on' : '') }, AN.Icons.img('gear', id, 26),
        h('span', { class: 'grow' }, h('b', null, g.name), h('small', null, g.desc), h('small', { class: 'muted' }, 'En réserve : ' + have)),
        h('div', { class: 'stepper' }, btn('−', () => set(n - 1), 'tiny ghost', { 'aria-label': 'Retirer un ' + g.name, disabled: !n }), h('b', null, n), btn('+', () => set(n + 1), 'tiny ghost', { 'aria-label': 'Ajouter un ' + g.name, disabled: n >= Math.min(have, AN.Profile.consumableMax(prof)) })));
    });
    // compagnons
    P.cleanCompanions(prof);
    const used = P.companionsUsed(prof), slots = P.companionSlots(prof);
    const candidates = prof.collection.filter((c) => P.canBeCompanion(c));
    const compTiles = candidates.map((c) => {
      const on = prof.companions.includes(c.uid);
      const tr = D.trait(c.species);
      const rebel = c.loyalty < 20;
      const info = ['niv. ' + c.level];
      if (tr.ability) info.push(D.ABILITIES[tr.ability].name);
      if (tr.keys.length) info.push('clés : ' + tr.keys.map((k) => D.KEYS[k].name).join(', '));
      if (tr.mount) info.push('monture' + (tr.mount.fly ? ' volante' : ''));
      const cost = P.linkCost(c.species);
      return h('button', { type: 'button', class: 'comp-tile' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', disabled: !!c.injured || rebel,
        title: c.injured ? 'Blessée : elle se repose' : rebel ? 'Rebelle : elle refuse de vous suivre' : null,
        onclick: () => {
          if (on) prof.companions = prof.companions.filter((u) => u !== c.uid);
          else {
            if (used + cost > slots) { AN.Audio.play('ui_err'); AN.HUD.toast('Plus assez de liens. Améliorez les Liens de l’Artefact ou retirez un compagnon.'); return; }
            prof.companions.push(c.uid);
            if (AN.Base.isGuard(prof, c.uid)) { AN.Base.toggleGuard(prof, c.uid); AN.HUD.toast(P.displayName(c) + ' quitte la garde de l’hexagone pour vous suivre.', 3); }
          }
          AN.Audio.play(on ? 'ui' : 'bond');
          redraw();
        } },
        AN.Icons.creature(c, 44),
        h('b', null, P.displayName(c)),
        h('small', null, (c.injured ? 'Blessée · ' : rebel ? 'Rebelle · ' : AN.Base.isGuard(prof, c.uid) ? 'Garde l’hexagone · ' : '') + info.join(' · ')),
        cost > 1 ? h('span', { class: 'link-cost' }, cost + ' liens') : null);
    });
    // clés réunies par la troupe, utiles aux caveaux annoncés
    const teamKeys = new Set();
    prof.companions.forEach((u) => { const c = P.findCreature(prof, u); if (c) D.trait(c.species).keys.forEach((k) => teamKeys.add(k)); });
    const wanted = AN.Fiche.of(w, prof).vaults.keys || [];
    const keyNote = wanted.length ? h('p', { class: wanted.every((k) => teamKeys.has(k)) ? 'muted small' : 'warn small' },
      'Caveaux annoncés : ' + wanted.map((k) => D.KEYS[k].name + (teamKeys.has(k) ? ' (vous l’avez)' : ' (manquante)')).join(', ') + '.') : null;
    // appel stratégique : un géant resté dans l'Archive
    const giants = prof.collection.filter((c) => D.trait(c.species).call && !c.lost);
    if (prof.call && !giants.some((c) => c.uid === prof.call)) prof.call = null;
    const callTiles = giants.length ? h('div', { class: 'choices inline' },
      [null].concat(giants).map((c) => h('button', { type: 'button', class: 'choice' + ((prof.call || null) === (c ? c.uid : null) ? ' on' : ''),
        onclick: () => { prof.call = c ? c.uid : null; AN.Audio.play('ui'); redraw(); } },
        c ? AN.Icons.creature(c, 30) : h('span', { class: 'none-ico' }),
        h('span', null, h('b', null, c ? P.displayName(c) : 'Aucun'), h('small', null, c ? D.CALLS[D.trait(c.species).call].name : 'Pas d’appel stratégique'))))) : null;

    const risk = P.loadoutRisk(prof);
    const bossDef = w.scale && w.scale !== 'region' ? D.CREATURE[w.heart.guardian] : null;
    const anchorNote = bossDef && P.upgradeValue(prof, 'ancrage').tier < bossDef.tier
      ? h('p', { class: 'warn small' }, 'L’Ancrage de l’Artefact ne retient pas encore un ' + D.TIERS[bossDef.tier].name.toLowerCase() + ' : vous pourrez affronter ' + bossDef.name + ', pas le capturer.') : null;
    const go = btn('Ouvrir le passage', () => {
      UI.closeAll();
      state.world = null;
      // l'hexagone de l'Artefact se détache, puis le passage s'ouvre (1.9)
      AN.Base.depart(() => {
        AN.Archive.exit();
        AN.Audio.play('portal');
        AN.Game.transition(() => AN.Expedition.start(prof, w), 0.6);
      });
    }, 'primary big');
    const pips = h('span', { class: 'link-pips', 'aria-label': used + ' liens utilisés sur ' + slots }, Array.from({ length: slots }, (_, i) => h('i', { class: i < used ? 'on' : '' })));
    return h('div', { class: 'page prep' },
      h('div', { class: 'prep-world' }, worldCard(w, prof, () => {})),
      h('div', { class: 'prep-main' },
        h('div', { class: 'page-head' }, h('div', null, h('h3', { class: 'page-title' }, 'Préparer l’expédition'), h('p', { class: 'page-desc' }, 'Touchez un emplacement pour changer ce qu’il contient. Ce qui n’est pas lié est perdu si vous tombez.'))),
        h('section', null, h('h4', null, 'Équipement'),
          h('div', { class: 'slot-grid' }, slotCard('ranged', 'Arme à distance'), slotCard('melee', 'Arme de corps à corps'), slotCard('armor', 'Protection', true), slotCard('bag', 'Sac'))),
        h('section', null, h('h4', null, 'Outils'),
          h('div', { class: 'slot-grid' }, D.TOOL_SLOTS.map((ts) => slotCard(ts.id, ts.name, true)))),
        h('section', null, h('h4', null, 'Consommables ', h('small', { class: 'muted' }, L.consumables.length + ' type' + (L.consumables.length > 1 ? 's' : '') + ' sur ' + D.CONSUMABLE_SLOTS + ', touches 1 à 4')),
          consTiles.length ? h('div', { class: 'cons-grid' }, consTiles) : h('p', { class: 'muted small' }, 'Aucun consommable en réserve. L’Atelier en fabrique.')),
        h('section', null, h('h4', null, 'Compagnons ', pips, h('small', { class: 'muted' }, used + ' / ' + slots + ' liens')),
          compTiles.length ? h('div', { class: 'comp-grid' }, compTiles) : h('p', { class: 'muted small' }, 'Aucune créature capturée pour l’instant.'),
          keyNote),
        callTiles ? h('section', null, h('h4', null, 'Appel stratégique ', h('small', { class: 'muted' }, 'touche ' + AN.Input.label('KeyG') + ', une fois par expédition')), callTiles) : null,
        baseSummary(prof, show),
        h('div', { class: 'prep-bar' },
          h('div', { class: 'prep-risk' }, anchorNote,
            (() => { const dg = AN.Danger.of(w, prof, prof.loadout); return h('p', { class: 'prep-danger' }, 'Avec cette préparation : ', UI.dangerStamp(dg), h('small', { class: 'muted' }, ' monde niveau ' + dg.world + ', vous ' + dg.you)); })(),
            h('p', null, risk > 0 ? h('span', null, 'Valeur engagée : ', h('b', null, U.fmt(risk)), '. Perdue si vous tombez.') : 'Vous n’emportez que de l’équipement lié : seul le butin peut être perdu.')),
          h('div', { class: 'actions' }, btn('Changer de destination', () => { state.world = null; show('destinations'); }, 'ghost'), go))));
  };

  /* ---------- Atelier ---------- */
  const CRAFT_GROUPS = [['tout', 'Tout'], ['ranged', 'Armes à distance'], ['melee', 'Corps à corps'], ['armor', 'Protections'], ['bag', 'Sacs'], ['consumable', 'Consommables'], ['tools', 'Outils']];
  RENDER.atelier = function (prof, show) {
    const P = AN.Profile;
    const mult = P.craftMult(prof);
    const groups = [['ranged', 'Armes à distance'], ['melee', 'Corps à corps'], ['armor', 'Protections'], ['bag', 'Sacs'], ['consumable', 'Consommables']].concat(D.TOOL_SLOTS.map((ts) => [ts.id, 'Outils : ' + ts.name.toLowerCase()]));
    const inLoadout = new Set(D.GEAR_SLOTS.map((s) => prof.loadout[s]).filter(Boolean));
    const f = state.craft;
    const shownGroups = groups.filter(([slot]) => f === 'tout' || (f === 'tools' ? slot.startsWith('tool_') : slot === f));
    const chips = h('div', { class: 'chips', role: 'tablist' }, CRAFT_GROUPS.map(([k, n]) => h('button', { type: 'button', role: 'tab', class: 'chip' + (f === k ? ' on' : ''), 'aria-selected': f === k ? 'true' : 'false', onclick: () => { state.craft = k; AN.Audio.play('tab'); show('atelier'); } }, n)),
      h('label', { class: 'chip-check' }, h('input', { type: 'checkbox', checked: state.craftCan, onchange: (e) => { state.craftCan = e.target.checked; show('atelier'); } }), h('span', null, 'Seulement ce que je peux fabriquer')));
    const sections = shownGroups.map(([slot, title]) => {
      const cards = Object.keys(D.GEAR).filter((id) => D.GEAR[id].slot === slot && D.GEAR[id].cost).map((id) => {
        const g = D.GEAR[id];
        const cost = P.scaledCost(g.cost, mult);
        const can = P.canPay(prof, cost);
        if (state.craftCan && !can) return null;
        const have = prof.owned[id] || 0;
        return h('article', { class: 'craft' + (can ? '' : ' cannot') },
          h('div', { class: 'craft-head' }, AN.Icons.img('gear', id, 32), h('div', null, h('b', null, g.name),
            h('small', null, have ? 'Possédé : ' + have : 'Pas encore fabriqué', inLoadout.has(id) ? h('span', { class: 'tag eq' }, 'Équipé') : null))),
          h('p', null, slot === 'consumable' || slot.startsWith('tool_') ? g.desc + (g.makes > 1 ? ' Fabrique ' + g.makes + ' unités.' : '') : gearStats(g) + '. ' + (slot === 'armor' || slot === 'bag' ? '' : g.desc)),
          h('div', { class: 'craft-foot' }, UI.costList(cost, prof),
            btn('Fabriquer', () => {
              if (!P.pay(prof, cost)) { AN.Audio.play('ui_err'); return; }
              prof.owned[id] = (prof.owned[id] || 0) + (g.makes || 1);
              AN.Audio.play('craft');
              AN.HUD.toast(g.name + (g.makes > 1 ? ' ×' + g.makes : '') + ' fabriqué' + (g.makes > 1 ? 's' : '') + '.', 2);
              AN.Save.write(prof);
              show('atelier');
            }, can ? 'primary small' : 'small', { disabled: !can })));
      }).filter(Boolean);
      return cards.length ? h('section', null, h('h4', null, title), h('div', { class: 'craft-grid' }, cards)) : null;
    }).filter(Boolean);
    return page('atelier', 'Atelier', 'Ce qui est fabriqué est risqué : emporté en expédition, c’est perdu si vous tombez. Une ressource manquante, en rouge, se touche pour chercher où la trouver.' + (mult < 1 ? ' Réduction active : −' + Math.round((1 - mult) * 100) + '\u202f% sur les coûts.' : ''), null,
      chips, sections.length ? sections : h('p', { class: 'empty-line muted' }, 'Rien à fabriquer avec la réserve actuelle dans cette catégorie.'));
  };

  /* ---------- Améliorations de l'Artefact ---------- */
  RENDER.artefact = function (prof, show) {
    const P = AN.Profile;
    const rk = P.rank(prof).index;
    return page('upgrades-page', 'Améliorations de l’Artefact', 'Chaque amélioration agit sur toutes les expéditions à venir. Certaines attendent que l’Archive grandisse.', null,
      h('div', { class: 'upgrades' }, D.UPGRADE_ORDER.map((key) => {
        const U2 = D.UPGRADES[key];
        const lv = prof.artefact[key] || 0;
        const next = U2.levels[lv + 1];
        const ncost = next ? P.upgradeCost(prof, next.cost) : null;
        const can = next && P.canPay(prof, ncost) && (next.rank || 0) <= rk;
        return h('article', { class: 'upgrade' + (can ? ' ready' : '') },
          h('div', { class: 'up-head' }, h('b', null, U2.name), h('span', { class: 'pips', 'aria-label': 'Niveau ' + (lv + 1) + ' sur ' + U2.levels.length }, U2.levels.map((_, i) => h('i', { class: i <= lv ? 'on' : '' })))),
          h('p', { class: 'muted' }, U2.desc),
          h('p', null, 'Actuel : ', h('b', null, U2.fmt(U2.levels[lv].v))),
          next ? h('div', { class: 'up-next' },
            h('p', null, 'Niveau suivant : ' + U2.fmt(next.v)),
            (next.rank || 0) > rk ? h('p', { class: 'warn small' }, 'Requiert une Archive de rang ' + D.RANKS[next.rank].name + '.') : null,
            h('div', { class: 'craft-foot' }, UI.costList(ncost, prof),
              btn('Améliorer', () => {
                if ((next.rank || 0) > rk || !P.pay(prof, ncost)) { AN.Audio.play('ui_err'); return; }
                prof.artefact[key] = lv + 1;
                prof.destinations = key === 'scanner' ? null : prof.destinations;
                AN.Audio.play('upgrade');
                AN.Save.write(prof);
                show('artefact');
              }, can ? 'primary small' : 'small', { disabled: !can }))) : h('p', { class: 'muted small' }, 'Niveau maximal.'));
      })));
  };

  /* ---------- Collection ---------- */
  RENDER.collection = function (prof, show) {
    const P = AN.Profile;
    const R = AN.Rescue;
    const essences = (prof.essences || []).length ? h('section', null, h('h4', null, 'Essences (' + prof.essences.length + ')'),
      h('p', { class: 'muted small' }, 'Ce qui reste des créatures perdues avec un monde. Réincarnez-les, jeunes mais fidèles, ou absorbez leur héritage.'),
      h('div', { class: 'essences' }, prof.essences.map((e) => {
        const d = D.CREATURE[e.species];
        const cost = R.reviveCost(e);
        const can = P.canPay(prof, cost);
        return h('div', { class: 'essence' }, AN.Icons.creature(e, 48), h('b', null, e.nickname || d.name), h('small', { class: 'muted' }, d.name + ', niveau ' + (e.level || 1) + ', perdue dans ' + e.world),
          UI.costList(cost, prof),
          h('div', { class: 'actions wrap' },
            btn('Réincarner', () => { if (R.revive(prof, e)) { AN.Audio.play('appear'); AN.Save.write(prof); if (AN.Archive.state()) AN.Archive.rebuildCreatures(); show('collection'); } }, can ? 'primary small' : 'small', { disabled: !can }),
            btn('Absorber', () => UI.confirm('Absorber l’essence de ' + (e.nickname || d.name) + ' ? Elle disparaît et vous laisse un bonus permanent.', () => { const k = R.absorb(prof, e); AN.HUD.toast('Héritage : ' + R.LEGACY[k] + '.', 5); AN.Save.write(prof); show('collection'); }, 'Absorber'), 'ghost small')));
      }))) : null;
    const care = h('label', { class: 'field check care' }, h('input', { type: 'checkbox', checked: prof.settings.autoFeed !== false, onchange: (e) => { prof.settings.autoFeed = e.target.checked; AN.Save.write(prof); } }),
      h('span', null, 'Nourrir les créatures avec la réserve', h('small', { class: 'muted' }, ' Affamés, prédateurs et gardiens perdent leur loyauté et produisent moins.')));
    if (!prof.collection.length) return page('collection', 'Collection', null, null, h('div', { class: 'empty' }, h('p', null, 'Votre collection est vide.'), h('p', { class: 'muted' }, 'En expédition, affaiblissez une créature, puis maintenez ' + AN.Input.label('KeyF') + ' pour la capturer. Elle n’est à vous qu’après l’extraction.')), essences);
    const F = [['toutes', 'Toutes'], ['compagnons', 'Compagnons'], ['evoluer', 'Peuvent évoluer'], ['blessees', 'Blessées ou perdues'], ['gardiens', 'Gardiens et plus']];
    const test = {
      toutes: () => true,
      compagnons: (c) => prof.companions.includes(c.uid),
      evoluer: (c) => !c.lost && AN.Bonds.evolutions(prof, c).some((o) => o.ok),
      blessees: (c) => c.injured || c.lost,
      gardiens: (c) => D.CREATURE[c.species].tier >= 2,
    };
    const f = test[state.coll] ? state.coll : 'toutes';
    const sorted = prof.collection.filter(test[f]).sort((a, b) => D.CREATURE[b.species].tier - D.CREATURE[a.species].tier || D.CREATURE[a.species].index - D.CREATURE[b.species].index || (b.level || 1) - (a.level || 1));
    return page('collection', 'Collection', prof.collection.length + ' créature' + (prof.collection.length > 1 ? 's' : '') + '. Compagnons : ' + P.companionsUsed(prof) + ' / ' + P.companionSlots(prof) + ' liens. Touchez une fiche pour la renommer, changer son habitat ou l’emmener.', null,
      h('div', { class: 'chips' }, F.map(([k, n]) => {
        const count = prof.collection.filter(test[k]).length;
        return h('button', { type: 'button', class: 'chip' + (f === k ? ' on' : ''), disabled: !count && k !== 'toutes', onclick: () => { state.coll = k; AN.Audio.play('tab'); show('collection'); } }, n, h('small', null, String(count)));
      })),
      care,
      sorted.length ? h('div', { class: 'creature-grid' }, sorted.map((c) => {
        const d = D.CREATURE[c.species];
        const home = c.home ? prof.territories.find((t) => t.uid === c.home) : null;
        return h('button', { class: 'creature-tile tier' + d.tier + (prof.companions.includes(c.uid) ? ' comp' : '') + (c.lost ? ' lost' : ''), type: 'button', onclick: () => { AN.Audio.play('ui'); UI.creatureCard(c); } },
          AN.Icons.creature(c, 64),
          h('b', null, P.displayName(c)),
          h('small', null, h('span', { class: 'lvl' }, 'niv. ' + (c.level || 1) + (c.stage ? ' · ' + D.STAGES[c.stage].name : '')), ' · ' + D.loyaltyLevel(c.loyalty).name.toLowerCase()),
          h('small', { class: 'muted' }, c.lost ? 'Perdue dans ' + c.lost.code : home ? D.BIOME[home.biome].name + (d.biomes.includes(home.biome) ? '' : ' (étranger)') : 'Le Néant'),
          c.lost ? h('em', { class: 'warn' }, 'à secourir') : c.injured ? h('em', { class: 'warn' }, 'blessé') : prof.companions.includes(c.uid) ? h('em', { class: 'cyan' }, 'compagnon') : AN.Bonds.evolutions(prof, c).some((o) => o.ok) ? h('em', { class: 'cyan' }, 'peut évoluer') : null);
      })) : h('p', { class: 'empty-line muted' }, 'Aucune créature dans cette sélection.'),
      essences);
  };

  /* ---------- Constructions (refondues en 1.9 : sur les territoires) ---------- */
  /** Nom court d'un territoire, pour les listes. */
  const terrName = (t) => D.BIOME[t.biome].name + (t.zoneName ? ' (' + t.zoneName + ')' : '');
  const bonusLine = (id) => {
    const def = D.STRUCTURES[id];
    if (!def.bonus) return null;
    const where = def.kind === 'build' ? 'paysage ' + def.bonus.tags.map((g) => D.TAG_NAMES && D.TAG_NAMES[g] ? D.TAG_NAMES[g] : g).join(', ') : 'son paysage d’origine';
    return h('p', { class: 'muted small' }, 'Bonus (' + where + ') : ' + def.bonus.text.replace(/^[^:]+ : /, '') + '.');
  };

  /** Choisir le territoire d'une structure. onPick(uid). */
  UI.pickTerritory = function (prof, id, onPick, except) {
    const St = AN.Structures;
    const list = prof.territories.slice().sort((a, b) => (St.suits(id, b) - St.suits(id, a)) || (St.room(prof, b, except) > 0) - (St.room(prof, a, except) > 0) || St.room(prof, b, except) - St.room(prof, a, except));
    const def = D.STRUCTURES[id];
    const el = h('div', { class: 'panel small pick-terr' },
      h('header', null, h('h2', null, 'Où bâtir : ' + def.name), btn('Annuler', () => UI.close(), 'ghost')),
      h('p', { class: 'muted' }, 'Un territoire accueille un bâtiment, plus un par tranche de quatre cases. ' + (def.bonus ? 'Un paysage favorable ajoute un bonus.' : '')),
      list.length ? h('ul', { class: 'rows terr-pick' }, list.map((t) => {
        const room = St.room(prof, t, except);
        const here = except && except.terr === t.uid;
        const good = St.suits(id, t);
        return h('li', { class: room > 0 && !here ? '' : 'disabled' },
          h('button', { type: 'button', class: 'row-btn', disabled: room <= 0 || here, onclick: () => { UI.close(); onPick(t.uid); } },
            AN.Mosaic ? AN.Mosaic.shape(t, 34) : null,
            h('span', { class: 'grow' }, h('b', null, terrName(t)), h('small', null, (D.QUALITY_NAMES[t.quality] || 'Territoire') + ', ' + AN.Shapes.cellsOf(t).length + ' case' + (AN.Shapes.cellsOf(t).length > 1 ? 's' : '') + ' · ' + (here ? 'il s’y trouve déjà' : room > 0 ? room + ' place' + (room > 1 ? 's' : '') + ' libre' + (room > 1 ? 's' : '') : 'complet'))),
            good ? h('em', { class: 'cyan' }, 'paysage favorable') : null));
      })) : h('p', { class: 'muted' }, 'L’Archive n’a encore aucun territoire.'));
    UI.open(el);
  };

  RENDER.constructions = function (prof, show) {
    const St = AN.Structures;
    const P = AN.Profile;
    const mult = St.costMult(prof);
    const list = St.list(prof).filter((s) => D.STRUCTURES[s.id]);
    const active = new Set(St.active(prof).map((s) => s.uid));
    const err = (m) => { if (m) { AN.Audio.play('ui_err'); AN.HUD.toast(m, 4); return true; } AN.Audio.play('build'); return false; };
    const after = () => { const A = AN.Archive.state(); if (A) { AN.Archive.rebuildCreatures(); AN.HUD.refreshArchive(A); } show('constructions'); };
    const total = prof.territories.reduce((s, t) => s + St.capacity(t), 0);
    const used = list.filter((s) => St.placed(prof, s)).length;
    const where = (s) => {
      const t = St.terrOf(prof, s);
      if (!t) return 'Rangé';
      return 'Sur ' + terrName(t) + (St.hasBonus(prof, s) ? ' · paysage favorable' : '');
    };
    const pick = (id, fn, except) => {
      if (!prof.territories.length) { err('Il faut d’abord un territoire dans l’Archive pour y bâtir.'); return; }
      UI.pickTerritory(prof, id, (uid) => {
        if (err(fn(uid))) return;
        St.rise(St.lastBuilt);
        // on regarde le bâtiment se construire (1.14), puis on retrouve l'Archive
        const A = AN.Archive.state();
        const pos = A && St.lastBuilt && St.positions(prof).find((o) => o.s.uid === St.lastBuilt.uid);
        if (pos) { AN.Archive.rebuildCreatures(); AN.HUD.refreshArchive(A); UI.closeAll(); AN.Archive.watch(pos.x, pos.y - 20, 0.9, 3.2); }
        else after();
      }, except);
    };
    // bâtiments
    const builds = D.BUILD_STRUCTURES.map((id) => {
      const def = D.STRUCTURES[id];
      const cur = St.built(prof, id);
      const stored = !cur && list.find((s) => s.id === id && !St.placed(prof, s));
      const lv = cur ? cur.level || 1 : stored ? stored.level || 1 : 0;
      const next = def.levels[lv];
      const cost = next ? P.scaledCost(next.cost, mult) : null;
      const can = next && P.canPay(prof, cost) && (cur || total > used);
      const s = cur || stored;
      return h('article', { class: 'build-card' + (cur ? ' on' : '') },
        h('div', { class: 'build-head' }, AN.StructArt.icon(id, 44), h('div', null, h('b', null, def.name), h('small', null, cur ? 'Niveau ' + lv + ' sur ' + def.levels.length + ' · ' + where(cur) : stored ? 'Rangé (niveau ' + lv + ')' : 'Pas encore bâti'))),
        h('p', null, def.desc),
        s ? h('p', { class: 'effect' }, St.textOf(s, prof)) : null,
        next ? h('p', { class: 'muted small' }, (lv ? 'Niveau ' + (lv + 1) + ' : ' : 'Effet : ') + next.text) : h('p', { class: 'muted small' }, 'Niveau maximal.'),
        bonusLine(id),
        h('div', { class: 'actions' },
          stored ? btn('Reposer', () => pick(id, (uid) => St.place(prof, stored, uid), stored), 'primary small') : null,
          cur ? btn('Déplacer', () => pick(id, (uid) => St.move(prof, cur, uid), cur), 'ghost small') : null,
          cur ? btn('Ranger', () => { St.store(prof, cur); after(); }, 'ghost small', { title: 'Le bâtiment quitte son territoire et cesse d’agir, sans rien perdre.' }) : null,
          next && !stored ? [UI.costList(cost, prof), btn(lv ? 'Améliorer' : 'Bâtir', () => (cur ? (err(St.build(prof, id)) || after()) : pick(id, (uid) => St.build(prof, id, uid))), can ? 'primary small' : 'small', { disabled: !can })] : null));
    });
    // structures rapportées
    const found = list.filter((s) => D.STRUCTURES[s.id].kind === 'found');
    const foundCards = found.map((s) => {
      const def = D.STRUCTURES[s.id];
      const placed = St.placed(prof, s);
      const on = active.has(s.uid);
      const cost = P.scaledCost(def.rebuild, mult);
      const can = !placed && (s.built || P.canPay(prof, cost)) && total > used;
      return h('article', { class: 'build-card' + (on ? ' on' : placed ? '' : ' idle') },
        h('div', { class: 'build-head' }, AN.StructArt.icon(s.id, 44), h('div', null, h('b', null, def.name), h('small', null, (placed ? where(s) + ' · ' : '') + 'Rapportée de ' + ((s.origin && s.origin.world) || '?') + (s.origin && s.origin.zone ? ', ' + s.origin.zone : '')))),
        h('p', null, def.desc),
        h('p', { class: on ? 'effect' : 'muted small' }, St.textOf(s, prof) + (placed && !on ? ' (une structure identique agit déjà)' : '')),
        bonusLine(s.id),
        h('div', { class: 'actions' },
          placed ? [btn('Déplacer', () => pick(s.id, (uid) => St.move(prof, s, uid), s), 'ghost small'), btn('Ranger', () => { St.store(prof, s); after(); }, 'ghost small', { title: 'Elle quitte son territoire et cesse d’agir.' })]
            : [s.built ? null : UI.costList(cost, prof), btn(s.built ? 'Reposer' : 'Reconstruire', () => pick(s.id, (uid) => St.place(prof, s, uid), s), can ? 'primary small' : 'small', { disabled: !can })],
          btn('Recycler', () => UI.confirm('Recycler ' + def.name + ' ? Elle disparaît ; la moitié de son coût vous revient.', () => { const back = St.recycle(prof, s); AN.HUD.toast('Recyclée : ' + Object.entries(back).map(([k, n]) => n + ' ' + D.RESOURCES[k].name).join(', ') + '.'); after(); }, 'Recycler'), 'ghost small')));
    });
    const pw = St.powers(prof);
    const sum = [];
    if (pw.storage) sum.push('stock +' + pw.storage + ' par territoire');
    if (pw.offline) sum.push('+' + pw.offline + ' h hors ligne');
    if (pw.collect) sum.push('ramassage automatique ' + Math.round(pw.collect * 100) + ' %');
    if (pw.craftCost) sum.push('fabrication −' + Math.round(pw.craftCost * 100) + ' %');
    if (pw.buildCost) sum.push('constructions −' + Math.round(pw.buildCost * 100) + ' %');
    if (pw.breed) sum.push('reproduction +' + Math.round(pw.breed * 100) + ' %');
    if (pw.feed) sum.push('faim −' + Math.round(pw.feed * 100) + ' %');
    if (pw.heal) sum.push('guérison +' + pw.heal);
    if (pw.dest) sum.push('+' + pw.dest + ' destination' + (pw.dest > 1 ? 's' : ''));
    if (pw.scan) sum.push('scanner +' + Math.round(pw.scan * 100) + ' %');
    if (pw.sweep) sum.push('balayage −' + Math.round(Math.min(0.9, pw.sweep) * 100) + ' %');
    if (pw.xp) sum.push('expérience +' + Math.round(pw.xp * 100) + ' %');
    if (pw.lore) sum.push('fragments de récit plus fréquents');
    if (pw.transfer) sum.push('transfert −' + Math.round(pw.transfer * 100) + ' %');
    if (pw.cargo) sum.push('soute +' + pw.cargo);
    if (pw.prod) sum.push('production +' + Math.round(pw.prod * 100) + ' %');
    if (pw.links) sum.push('liens +' + pw.links);
    if (pw.guards) sum.push('points de garde +' + pw.guards);
    if (pw.defSlots) sum.push('modules de l’hexagone +' + pw.defSlots);
    if (pw.astres) sum.push('astres retenus +' + pw.astres);
    if (pw.mood) sum.push('humeur des peuples +' + pw.mood);
    if (pw.consMax) sum.push('consommables +' + pw.consMax);
    if (pw.regen) sum.push('régénération ' + String(Math.round(pw.regen * 10) / 10).replace('.', ',') + ' PV/s');
    if (pw.hp) sum.push('PV +' + pw.hp);
    const shown = Math.min(total, 40);
    return page('constructions', 'Constructions', 'Les bâtiments se dressent sur les territoires de l’Archive, et les suivent quand on les agence. Un territoire en accueille un, plus un par tranche de quatre cases ; un paysage favorable ajoute un bonus. Les structures des mondes se démontent, voyagent dans la soute, puis se reconstruisent ici.', null,
      h('div', { class: 'slots-line', title: used + ' places occupées sur ' + total }, Array.from({ length: shown }, (_, i) => h('i', { class: i < used ? 'on' : '' })), h('small', { class: 'muted' }, ' ' + used + ' / ' + total + ' places sur les territoires')),
      sum.length ? h('p', { class: 'note' }, h('b', null, 'Effets en cours : '), sum.join(', ') + '.') : null,
      h('section', null, h('h4', null, 'Bâtiments'), h('div', { class: 'build-grid' }, builds)),
      h('section', null, h('h4', null, 'Structures rapportées des mondes (' + found.length + ')'),
        foundCards.length ? h('div', { class: 'build-grid' }, foundCards) : h('p', { class: 'muted' }, 'Aucune pour l’instant. Le scanner signale les structures des destinations ; fouillez-les, puis démontez-les avec un Kit de démontage ou un Traîneau du néant.')));
  };

  /** Fiche d'une structure, ouverte depuis l'Archive (E à côté). */
  UI.structurePanel = function (s) {
    const prof = AN.Game.profile;
    const def = D.STRUCTURES[s.id];
    const St = AN.Structures;
    const on = St.active(prof).some((x) => x.uid === s.uid);
    const lv = s.level || 1;
    const next = def.kind === 'build' ? def.levels[lv] : null;
    const cost = next ? AN.Profile.scaledCost(next.cost, St.costMult(prof)) : null;
    const t = St.terrOf(prof, s);
    const refresh = () => { const A = AN.Archive.state(); if (A) AN.HUD.refreshArchive(A); };
    const el = h('div', { class: 'panel small structure-panel' },
      h('header', null, h('h2', null, def.name), btn('Fermer', () => UI.close(), 'ghost')),
      h('div', { class: 'build-head' }, AN.StructArt.icon(s.id, 64), h('p', null, def.desc)),
      h('p', { class: on ? 'effect' : 'muted' }, St.textOf(s, prof) + (on ? '' : ' (une structure identique agit déjà)')),
      t ? h('p', { class: 'muted small' }, 'Sur ' + terrName(t) + '.' + (def.bonus && !St.hasBonus(prof, s) ? ' Ailleurs, dans un paysage favorable : ' + def.bonus.text.replace(/^[^:]+ : /, '') + '.' : '')) : null,
      s.origin ? h('p', { class: 'muted small' }, 'Rapportée de ' + s.origin.world + ', ' + s.origin.zone + '.') : null,
      next ? h('div', null, h('p', null, 'Niveau ' + (lv + 1) + ' : ' + next.text), UI.costList(cost, prof)) : null,
      h('div', { class: 'actions' },
        btn('Ranger', () => { St.store(prof, s); UI.close(); refresh(); }, 'ghost', { title: 'Le bâtiment quitte son territoire' }),
        btn('Déplacer', () => UI.pickTerritory(prof, s.id, (uid) => { const m = St.move(prof, s, uid); if (m) { AN.Audio.play('ui_err'); AN.HUD.toast(m); return; } AN.Audio.play('build'); UI.close(); refresh(); }, s), 'ghost'),
        btn('Constructions', () => { UI.close(); UI.console('constructions'); }, 'ghost'),
        next ? btn('Améliorer', () => { const m = St.build(prof, s.id); if (m) { AN.Audio.play('ui_err'); AN.HUD.toast(m); return; } AN.Audio.play('build'); UI.close(); UI.structurePanel(s); }, AN.Profile.canPay(prof, cost) ? 'primary' : '', { disabled: !AN.Profile.canPay(prof, cost) }) : null));
    UI.open(el);
  };

  /* ---------- L'hexagone (1.9) : gardes et modules de défense ---------- */
  function baseSummary(prof, show) {
    const B = AN.Base;
    B.cleanGuards(prof);
    const guards = B.of(prof).guards.map((u) => AN.Profile.findCreature(prof, u)).filter(Boolean);
    const mods = B.installed(prof);
    return h('section', null, h('h4', null, 'L’hexagone ', h('small', { class: 'muted' }, 'il se pose dans le monde et vous attend')),
      h('p', { class: 'small' }, (guards.length ? 'Gardes : ' + guards.map((c) => AN.Profile.displayName(c)).join(', ') : 'Aucun garde') + ' · ' + (mods.length ? 'Défenses : ' + mods.map((id) => D.DEFENSES[id].name).join(', ') : 'aucune défense') + '.'),
      btn('Organiser l’hexagone', () => show('hexagone'), 'ghost small'));
  }

  RENDER.hexagone = function (prof, show) {
    const B = AN.Base;
    const P = AN.Profile;
    B.cleanGuards(prof);
    const err = (m) => { if (m) { AN.Audio.play('ui_err'); AN.HUD.toast(m, 4); return true; } return false; };
    const redo = () => { const A = AN.Archive.state(); if (A) AN.Archive.rebuildCreatures(); show('hexagone'); };
    const pts = B.guardPoints(prof), usedPts = B.guardsUsed(prof);
    const slots = B.defSlots(prof), inst = B.installed(prof);
    // gardes
    const cands = prof.collection.filter((c) => !c.lost && D.CREATURE[c.species] && D.CREATURE[c.species].tier < 5);
    const guardTiles = cands.map((c) => {
      const on = B.isGuard(prof, c.uid);
      const why = B.whyNot(prof, c);
      const comp = prof.companions.includes(c.uid);
      const cost = B.guardCost(c);
      return h('button', { type: 'button', class: 'comp-tile' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', disabled: !!why && !on, title: why || null,
        onclick: () => {
          if (err(B.toggleGuard(prof, c.uid))) return;
          AN.Audio.play(on ? 'ui' : 'bond');
          if (!on && comp) AN.HUD.toast(P.displayName(c) + ' ne vous accompagnera plus : elle garde l’hexagone.', 3);
          redo();
        } },
        AN.Icons.creature(c, 44),
        h('b', null, P.displayName(c)),
        h('small', null, (why ? why + ' · ' : comp ? 'Compagnon · ' : '') + 'niv. ' + c.level + ' · ' + D.TIERS[D.CREATURE[c.species].tier].name),
        cost > 1 ? h('span', { class: 'link-cost' }, cost + ' points') : null);
    });
    // modules
    const modCards = D.DEFENSE_IDS.map((id) => {
      const def = D.DEFENSES[id];
      const lv = B.level(prof, id);
      const next = def.levels[lv];
      const cost = next ? B.defenseCost(prof, id) : null;
      const can = next && P.canPay(prof, cost);
      const on = inst.includes(id);
      return h('article', { class: 'build-card' + (on ? ' on' : '') },
        h('div', { class: 'build-head' }, AN.StructArt.defenseIcon(id, 44), h('div', null, h('b', null, def.name), h('small', null, lv ? 'Niveau ' + lv + ' sur ' + def.levels.length + (on ? ' · installé' : ' · rangé') : 'Pas encore bâti'))),
        h('p', null, def.desc),
        lv ? h('p', { class: 'effect' }, def.levels[lv - 1].text) : null,
        next ? h('p', { class: 'muted small' }, (lv ? 'Niveau ' + (lv + 1) + ' : ' : 'Effet : ') + next.text) : h('p', { class: 'muted small' }, 'Niveau maximal.'),
        h('div', { class: 'actions' },
          lv ? btn(on ? 'Retirer' : 'Installer', () => { if (!err(B.toggleInstall(prof, id))) { AN.Audio.play('equip'); AN.Save.write(prof); redo(); } }, on ? 'ghost small' : 'small', { disabled: !on && inst.length >= slots }) : null,
          next ? [UI.costList(cost, prof), btn(lv ? 'Améliorer' : 'Bâtir', () => { if (!err(B.buildDefense(prof, id))) { AN.Audio.play('build'); redo(); } }, can ? 'primary small' : 'small', { disabled: !can })] : null));
    });
    const st = B.stats(prof, 4);
    return page('hexagone', 'L’hexagone', 'Au départ, l’hexagone de l’Artefact se détache de l’Archive et se pose dans le monde visité. On y lance le transfert ; il repart avec le butin. S’il tombe sous les coups, l’Artefact rentre seul avec la soute et ses défenses, et vous devez sortir par une plaque blanche ou par l’extraction d’urgence.', null,
      h('p', { class: 'note' }, 'Vigueur de l’hexagone : ' + st.maxHp + ' dans un monde ordinaire' + (st.armor ? ', ' + Math.round(st.armor * 100) + ' % des coups absorbés' : '') + (st.shield ? ', bouclier de ' + st.shield : '') + '. Il se répare lentement quand on le laisse en paix. Les modules ne se perdent jamais.'),
      h('section', null, h('h4', null, 'Gardes ', h('span', { class: 'link-pips' }, Array.from({ length: pts }, (_, i) => h('i', { class: i < usedPts ? 'on' : '' }))), h('small', { class: 'muted' }, usedPts + ' / ' + pts + ' points')),
        h('p', { class: 'muted small' }, 'Ils restent sur l’hexagone et le défendent, pendant l’exploration et le transfert. Un garde coûte autant de points que de liens. À terre, il revient blessé ; s’il est encore au sol quand l’hexagone repart, il est perdu (en sursis après une chute, sinon il ne reste de lui qu’une essence).'),
        guardTiles.length ? h('div', { class: 'comp-grid' }, guardTiles) : h('p', { class: 'muted small' }, 'Aucune créature capturée pour l’instant.')),
      h('section', null, h('h4', null, 'Défenses ', h('small', { class: 'muted' }, inst.length + ' / ' + slots + ' installées')),
        h('div', { class: 'build-grid' }, modCards)));
  };

  /* ---------- Vue d'ensemble de l'Archive ---------- */
  RENDER.archive = function (prof, show, td) {
    const P = AN.Profile;
    const rk = P.rank(prof);
    const syns = P.synergies(prof);
    const powers = P.powers(prof);
    const rates = AN.Production.rates(prof);
    const totals = {};
    for (const k in rates) for (const r in rates[k]) totals[r] = (totals[r] || 0) + rates[k][r];
    if (AN.Archive.state()) AN.Archive.returnPickups();
    const waiting = {};
    prof.territories.forEach((t) => { for (const k in t.stock) waiting[k] = (waiting[k] || 0) + Math.floor(t.stock[k]); });
    for (const k in prof.centerStock) waiting[k] = (waiting[k] || 0) + Math.floor(prof.centerStock[k]);
    const sum = AN.Arrange ? AN.Arrange.summary(prof) : null;
    const pct = (v) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + ' %';
    // à faire : tout ce que signalent les pastilles, avec un lien vers la page
    const jobs = [];
    Object.entries(td).forEach(([tab, list]) => list.forEach((txt) => jobs.push({ tab, txt })));
    const next = rk.next ? nextRank(rk) : null;
    const big = AN.Mosaic ? AN.Mosaic.canvas(prof.territories, 300, 300, { pad: 0.05 }) : null;
    return page('overview', 'Vue d’ensemble', null, null,
      h('div', { class: 'ov-top' },
        h('figure', { class: 'ov-seal' }, big, h('figcaption', { class: 'muted small' }, prof.territories.length ? 'L’Archive vue de haut. ' + AN.Input.label('KeyV') + ' dans l’Archive pour l’agencer.' : 'Encore rien autour de l’Artefact.')),
        h('div', { class: 'ov-side' },
          h('p', { class: 'ov-rank' }, h('span', null, 'Rang'), h('b', null, rk.def.name)),
          h('p', { class: 'muted' }, rk.def.desc),
          next ? h('div', { class: 'ov-next' }, h('p', null, 'Prochain rang : ', h('b', null, next.name)), h('div', { class: 'bar' }, h('i', { style: { transform: 'scaleX(' + next.k + ')' } })), h('small', { class: 'muted' }, next.short)) : h('p', { class: 'muted' }, 'Il n’y a plus rien au-dessus. Ou rien que vous puissiez voir.'),
          h('dl', { class: 'ov-figs' },
            h('dt', null, 'Territoires'), h('dd', null, String(prof.territories.length)),
            h('dt', null, 'Créatures'), h('dd', null, String(prof.collection.length)),
            h('dt', null, 'Synergies'), h('dd', null, sum ? sum.pos + (sum.neg ? ' (' + sum.neg + ' néfaste' + (sum.neg > 1 ? 's' : '') + ')' : '') : String(syns.length)),
            sum ? [h('dt', null, 'Production gagnée par les voisinages'), h('dd', null, pct(sum.prod))] : null,
            (prof.cosmos && prof.cosmos.astres.length) ? [h('dt', null, 'Astres'), h('dd', null, String(prof.cosmos.astres.length))] : null),
          jobs.length ? h('div', { class: 'ov-todo' }, h('h4', null, 'À faire'),
            h('ul', null, jobs.slice(0, 7).map((j) => h('li', null, h('button', { type: 'button', class: 'linkish', onclick: () => { AN.Audio.play('tab'); show(j.tab); } }, j.txt)))),
            jobs.length > 7 ? h('small', { class: 'muted' }, 'et ' + (jobs.length - 7) + ' autre' + (jobs.length - 7 > 1 ? 's' : '') + '.') : null) : null)),
      h('section', null, h('h4', null, 'Rangs de l’Archive'),
        h('ol', { class: 'ranks' }, D.RANKS.map((r, i) => (i > rk.index + 1 || (r.mystery && i > rk.index)
          ? h('li', { class: 'locked' }, h('b', null, '???'), h('span', null, r.mystery ? 'Échelle inconnue' : 'Échelle non détectée'))
          : h('li', { class: i <= rk.index ? 'done' : i === rk.index + 1 ? 'next' : '' }, h('b', null, r.name), h('span', null, needText(r.need))))))),
      h('section', null, h('h4', null, 'Productions'),
        h('p', { class: 'muted small' }, 'Par minute, tous territoires et créatures confondus. Elles apparaissent au sol : marchez dessus pour les ramasser.'),
        Object.keys(totals).length ? h('div', { class: 'reslist' }, Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([k, v]) => h('span', { class: 'r' }, AN.Icons.img('res', k, 18), h('b', null, v.toFixed(1).replace('.', ',')), h('small', null, D.RESOURCES[k].name)))) : h('p', { class: 'muted' }, 'Rien ne produit encore. Rapportez des territoires et des créatures.'),
        U.sumValues(waiting) > 0 ? h('div', { class: 'actions wrap left' }, btn('Rapatrier à distance (75 %)', () => {
          AN.Archive.returnPickups();
          const got = AN.Production.collectAll(prof, 0.75);
          AN.Audio.play('craft');
          AN.HUD.toast('Rapatrié : ' + Object.entries(got).map(([k, n]) => n + ' ' + D.RESOURCES[k].name).join(', ') + '.', 5);
          AN.Save.write(prof);
          show('archive');
        }, 'ghost small'), h('small', { class: 'muted' }, 'Le ramassage à pied ne perd rien.')) : null),
      (prof.cosmos && prof.cosmos.astres.length) ? h('section', null, h('h4', null, 'Astres de l’Archive (' + prof.cosmos.astres.length + ')'),
        h('ul', { class: 'rows' }, prof.cosmos.astres.map((a) => h('li', null, h('span', { class: 'swatch round', style: { background: D.BIOME[a.biome].ground[1] } }),
          h('span', { class: 'grow' }, AN.Names.astre(a), h('small', null, U.cap(AN.Names.astreKind(a)) + '. ' + D.ASTRES[a.biome].desc + ' Venu de ' + a.world + ', ' + a.zoneName + '.')))))) : null,
      h('section', null, h('h4', null, 'Territoires (' + prof.territories.length + ')'),
        prof.territories.length ? h('ul', { class: 'rows terr-rows' }, prof.territories.map((t) => {
          const { mult, why } = AN.Production.territoryMult(prof, t, syns, powers);
          const r = rates[t.uid] || {};
          return h('li', null, AN.Mosaic ? AN.Mosaic.shape(t, 34) : null,
            h('span', { class: 'grow' }, D.BIOME[t.biome].name + ', ' + (D.QUALITY_NAMES[t.quality] || 'Territoire').toLowerCase(),
              h('small', null, t.world + ', ' + t.zoneName + ' : ' + P.creaturesIn(prof, t).length + ' créature' + (P.creaturesIn(prof, t).length > 1 ? 's' : '') + (why.length ? '. ' + why.map((w) => w.name + ' ' + (w.v > 0 ? '+' : '−') + Math.round(Math.abs(w.v) * 100) + ' %').join(', ') : ''))),
            h('b', { title: 'Multiplicateur de production' }, '×' + mult.toFixed(2).replace('.', ',')),
            h('span', { class: 'mini-res' }, Object.keys(r).slice(0, 4).map((k) => AN.Icons.img('res', k, 14))));
        })) : h('p', { class: 'muted' }, 'Aucun territoire. Chaque extraction rapporte au moins un fragment du sol.')),
      h('section', null, h('h4', null, 'Synergies actives (' + syns.length + ')'),
        syns.length ? h('ul', { class: 'rows' }, syns.map((s) => h('li', null, h('b', { class: s.syn.mult < 0 ? 'warn' : 'good' }, s.syn.name), h('span', { class: 'grow' }, D.BIOME[s.a.biome].name + ' et ' + D.BIOME[s.b.biome].name, h('small', null, s.syn.desc))))) : h('p', { class: 'muted' }, 'Aucune pour l’instant. Placez côte à côte des territoires aux climats complémentaires, ou laissez l’Archive se ranger (' + AN.Input.label('KeyV') + ' dans l’Archive).')),
      h('section', null, h('h4', null, 'Pouvoirs acquis'),
        powers.list.length ? h('ul', { class: 'rows' }, powers.list.map((p) => h('li', null, AN.Icons.img('creature', p.species, 30), h('span', { class: 'grow' }, p.name, h('small', null, p.desc + (p.global ? ' (influence d’un colosse)' : ' (pouvoir territorial)')))))) : h('p', { class: 'muted' }, 'Capturez un gardien pour obtenir son pouvoir territorial.')));
  };
  function needText(n) {
    const p = [];
    if (n.territories) p.push(n.territories + ' territoires');
    if (n.guardians) p.push(n.guardians + ' gardien' + (n.guardians > 1 ? 's' : ''));
    if (n.ultras) p.push(n.ultras + (n.ultras > 1 ? ' colosses régionaux' : ' colosse régional'));
    if (n.souverains) p.push(n.souverains + ' colosse' + (n.souverains > 1 ? 's' : '') + ' du monde');
    if (n.cataclysmes) p.push(n.cataclysmes + ' cataclysme' + (n.cataclysmes > 1 ? 's' : ''));
    if (n.astres) p.push(n.astres + ' astres');
    if (n.stellaires) p.push(n.stellaires + ' entité' + (n.stellaires > 1 ? 's' : '') + ' stellaire' + (n.stellaires > 1 ? 's' : ''));
    if (n.galactiques) p.push(n.galactiques + ' organisme' + (n.galactiques > 1 ? 's' : '') + ' galactique' + (n.galactiques > 1 ? 's' : ''));
    if (n.amas) p.push(n.amas + ' entité' + (n.amas > 1 ? 's' : '') + ' d’amas');
    if (n.toiles) p.push(n.toiles + ' entité' + (n.toiles > 1 ? 's' : '') + ' de la Toile');
    return p.length ? p.join(', ') : 'Point de départ';
  }

  /* ---------- Peuples ---------- */
  RENDER.peuples = function (prof) {
    const Cv = AN.Civ;
    const m = Cv.moral(prof);
    const rep = D.REPUTATIONS[Cv.reputation(prof)];
    const sts = prof.settlements || [];
    const memo = prof.peoples || {};
    const lore = (prof.civLore || []).map((i) => D.CIV_KNOWLEDGE[i]).filter(Boolean);
    const stat = (k, v) => [h('dt', null, k), h('dd', null, String(v))];
    return page('peuples', 'Peuples', 'Ceux que vous avez sauvés, emmenés ou laissés. Les peuples à venir en ont entendu parler.', null,
      h('section', null, h('h4', null, 'Ce que les mondes disent de vous'),
        h('p', { class: 'rep' }, h('b', null, rep.name), ' : ' + rep.desc),
        h('dl', { class: 'facts' },
          stat('Sauvés', m.sauves), stat('Partis par leurs propres moyens', m.evades), stat('Emmenés de force', m.contraints),
          stat('Laissés dans des mondes détruits', m.abandonnes), stat('Tués alors qu’ils ne se battaient pas', m.massacres),
          stat('Combattus', m.combattus), stat('Arches emportées', m.pillages), stat('Fidèles qui vous vénèrent', m.adores))),
      AN.UI.nationsSection ? AN.UI.nationsSection(prof) : null,
      h('section', null, h('h4', null, 'Installés dans l’Archive (' + sts.length + ')'),
        sts.length ? h('ul', { class: 'rows' }, sts.map((st) => {
          const P = D.PEOPLE[st.people];
          const home = st.home ? prof.territories.find((t) => t.uid === st.home) : null;
          return h('li', null, AN.CivArt.portrait(st.people, 'villager', 36),
            h('span', { class: 'grow' }, P.Name + ', ' + st.n + ' habitants', h('small', null, AN.UI.moodName(st.mood) + ', ' + (home ? D.BIOME[home.biome].name : 'le Néant') + (st.forced ? ', contraints' : '') + (st.request ? '. Une demande attend votre réponse.' : ''))),
            st.request ? h('span', { class: 'badge' }, '1') : null,
            btn('Voir', () => AN.UI.settlement(st), 'small ghost'));
        })) : h('p', { class: 'muted' }, 'Aucun peuple ne vit encore dans l’Archive. Certains mondes sont habités : le scanner l’indique.')),
      Object.keys(memo).length ? h('section', null, h('h4', null, 'Peuples rencontrés'),
        h('ul', { class: 'rows' }, Object.entries(memo).map(([pid, r]) => h('li', null, AN.CivArt.portrait(pid, 'villager', 30),
          h('span', { class: 'grow' }, D.PEOPLE[pid].Name, h('small', null, D.PEOPLE[pid].desc)),
          h('small', { class: 'muted' }, 'sauvés ' + r.saved + ', contraints ' + r.forced + ', laissés ' + r.abandoned + ', partis ' + r.escaped))))) : null,
      lore.length ? h('section', null, h('h4', null, 'Ce que disent ceux qui savent'), h('div', { class: 'lore-list' }, lore.map((l) => h('blockquote', null, l)))) : null);
  };

  /* ---------- Bestiaire ---------- */
  RENDER.bestiaire = function (prof) {
    const seen = Object.keys(prof.bestiary).length;
    const caught = Object.values(prof.bestiary).filter((b) => b.captured).length;
    const rk = AN.Profile.rank(prof).index;
    // Les échelons supérieurs ne se révèlent qu'à l'approche de l'échelle correspondante.
    const tierOpen = (t) => t <= 3 || D.CREATURES.some((c) => c.tier === t && prof.bestiary[c.id]) || rk + 1 >= [0, 0, 0, 0, 5, 6, 7, 8, 9, 10, 11][t];
    const all = D.TIERS.map((x) => x.id);
    const tiers = all.filter(tierOpen);
    const hidden = all.filter((t) => t >= 4 && !tierOpen(t)).length;
    const TITLES = ['Créatures mineures', 'Prédateurs', 'Gardiens de zone', 'Colosses régionaux', 'Colosses du monde', 'Colosses planétaires', 'Colosses stellaires', 'Colosses galactiques', 'Colosses d’amas', 'Colosses de la Toile', 'Colosses du Pli'];
    return page('bestiaire', 'Bestiaire', seen + ' espèces observées, ' + caught + ' capturées.', null,
      tiers.map((t) => h('section', null, h('h4', null, TITLES[t]),
        h('div', { class: 'beast-grid' }, D.CREATURES.filter((c) => c.tier === t).map((c) => {
          const b = prof.bestiary[c.id];
          if (!b) return h('div', { class: 'beast unknown', title: 'Non observée' }, AN.Icons.img('silhouette', c.id, 56), h('b', null, '???'));
          return h('div', { class: 'beast' + (b.captured ? ' caught' : '') },
            AN.Icons.img('creature', c.id, 56),
            h('b', null, c.name),
            h('small', null, c.biomes.map((x) => D.BIOME[x].name).join(', ')),
            h('p', null, c.desc),
            AN.Kits && AN.Kits.of(c) ? h('p', { class: 'beast-kit' }, h('b', null, 'Gestes. '), AN.Kits.of(c).name + '.') : null, // son jeu d'attaques, à elle seule (1.17)
            h('small', { class: 'muted' }, (b.captured ? 'Capturée ×' + b.captured : 'Jamais capturée') + (b.killed ? ', vaincue ×' + b.killed : '')),
            // un colosse (1.16) : sa faiblesse, dès le premier sceau brisé
            D.COLOSSI && D.COLOSSI[c.id] ? h('p', { class: 'beast-secret' + (b.secret ? '' : ' muted') }, h('b', null, 'Colosse ' + D.COLOSSUS_PLAN_NAME[D.COLOSSI[c.id].plan] + ', ' + U.fmt(Math.round(AN.Colossus.length(c) / 100) * 100) + ' px' + (AN.Colossus.isMap(c) ? ', colosse-carte : son dos est la zone entière. ' : '. ')), b.secret ? D.COLOSSI[c.id].secret : 'Sa faiblesse reste à découvrir : brisez l’un de ses sceaux.') : null,
            c.tier <= 2 && c.biomes.length ? btn('Chercher', () => UI.seek('creature', c.id), 'ghost tiny seek', { title: 'Indiquer quels mondes abritent ' + c.name }) : null);
        })))),
      hidden + D.HIGHER_TIERS.length ? h('section', null, h('h4', null, 'Échelons supérieurs'),
        h('div', { class: 'beast-grid' }, [...new Array(hidden).fill('???'), ...D.HIGHER_TIERS.map(() => '???')].map((n) => h('div', { class: 'beast locked' }, h('div', { class: 'void-sil' }), h('b', null, n), h('small', null, 'Non détecté'))))) : null);
  };

  /* ---------- Guide (1.15) ---------- */
  RENDER.guide = function (prof, show) {
    const seen = (prof.flags.tips || {});
    const known = D.TIPS.filter((t) => seen[t.id]), left = D.TIPS.filter((t) => !seen[t.id]);
    const card = (t, on) => h('article', { class: 'tip-card' + (on ? '' : ' locked') }, h('small', { class: 'tip-where' }, t.where), h('h4', null, t.title), on ? h('p', null, t.text) : h('p', { class: 'muted' }, 'À découvrir en jouant.'));
    return page('guide', 'Guide', 'Les conseils de l’Artefact, rangés ici à mesure que vous les rencontrez.', h('div', { class: 'actions' },
      btn('Refaire la visite', () => { UI.startTour(true); }, 'small'),
      AN.Tutorial ? btn('Rejouer le Seuil', () => { UI.closeAll(); AN.Tutorial.start(prof, { sandbox: true }); }, 'ghost small', { title: 'Le tutoriel, sans rien perdre ni gagner' }) : null),
      h('section', null, h('h4', null, 'Les commandes'),
        h('dl', { class: 'facts keys-list' }, [
          ['Se déplacer', AN.Input.moveKeys()], ['Tirer, frapper', 'clic gauche, clic droit'], ['Esquiver', AN.Input.label('Space')], ['Capturer', AN.Input.label('KeyF') + ' (maintenu, sur une créature affaiblie)'],
          ['Interagir', AN.Input.label('KeyE')], ['Capacité d’un compagnon', AN.Input.label('KeyQ') + ' (molette : changer)'], ['Appel', AN.Input.label('KeyG')], ['Monture', AN.Input.label('KeyR')],
          ['Sac', AN.Input.label('Tab')], ['Extraction d’urgence', AN.Input.label('KeyX') + ' (maintenu)'], ['Agencer l’Archive', AN.Input.label('KeyV')],
          ['Sauter', AN.Input.label('KeyC') + ' (maintenir, puis relâcher) : au-dessus du vide d’une galaxie, près d’un colosse pour atteindre plus haut'],
          ['Près d’un colosse', AN.Input.label('KeyE') + ' : s’agripper (au sol, ou en plein saut)'],
          ['Sur un colosse', 'clic : frapper un sceau (clic droit maintenu : plus fort) ; ' + AN.Input.label('KeyC') + ' : sauter vers une autre prise ; ' + AN.Input.label('Space') + ' : lâcher prise ; ' + AN.Input.label('KeyE') + ' maintenu : tenir quand il se secoue'],
          ['Sur un colosse-carte', 'on n’en descend pas ; ' + AN.Input.label('KeyE') + ' sur la plateforme : extraire, ou retourner d’où l’on vient ; ' + AN.Input.label('KeyE') + ' près d’un compagnon à terre : le relever'],
        ].map(([k, v]) => [h('dt', null, k), h('dd', null, v)]))),
      h('section', null, h('h4', null, 'Conseils (' + known.length + ' sur ' + D.TIPS.length + ')'),
        h('div', { class: 'tip-grid' }, known.map((t) => card(t, true)).concat(left.map((t) => card(t, false))))));
  };

  /* ---------- Journal ---------- */
  RENDER.journal = function (prof) {
    const st = prof.stats;
    const lore = D.LORE.filter((l) => prof.lore.includes(l.id));
    const log = prof.archiveLog || [];
    // le récit, acte par acte (1.14) : ce qu'on a lu, et des blancs pour ce qui manque ; les actes à venir restent cachés
    const act = AN.Story.act(prof);
    const acts = D.ACTS.filter((a) => a.n <= act || D.LORE.some((l) => l.act === a.n && prof.lore.includes(l.id))).map((a) => {
      const pr = AN.Story.progress(prof, a.n);
      const roman = ['I', 'II', 'III', 'IV'][a.n - 1];
      const gaps = pr.total - pr.read.length;
      return h('div', { class: 'journal-act' }, h('h5', null, 'Acte ' + roman + ' · ' + a.title + ' (' + pr.read.length + ' sur ' + pr.total + ')'),
        pr.read.length ? h('div', { class: 'lore-list' }, pr.read.map((l) => h('blockquote', null, h('b', null, l.title), l.text))) : null,
        gaps ? h('p', { class: 'lore-gap' }, '…'.repeat(Math.min(3, gaps))) : null);
    });
    const chron = AN.Story.state(prof).chronicles.map((pid) => D.CHRONICLES[pid]).filter(Boolean);
    const outcomeName = (o) => (o === 'extrait' ? 'Extrait' : o === 'urgence' ? 'Urgence' : o === 'retour' ? 'Retour' : o === 'ancre' ? 'Ancré' : 'Échec');
    return page('journal', 'Journal', null, null,
      log.length ? h('section', null, h('h4', null, 'La vie de l’Archive'), log.slice(0, 20).map((l) => h('div', { class: 'logline' }, h('small', null, new Date(l.t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })), l.text))) : null,
      h('section', null, h('h4', null, 'Fragments retrouvés (' + lore.length + ' sur ' + D.LORE.length + ')'),
        lore.length ? acts : h('p', { class: 'muted' }, 'Fouillez les ruines et les stèles des autres mondes.')),
      chron.length ? h('section', null, h('h4', null, 'Chroniques des peuples (' + chron.length + ')'), h('div', { class: 'lore-list' }, chron.map((x) => h('blockquote', null, h('b', null, x.title), x.text)))) : null,
      h('section', null, h('h4', null, 'Expéditions (' + st.worlds + ')'),
        prof.journal.length ? h('ul', { class: 'rows log' }, prof.journal.map((j) => h('li', null,
          h('span', { class: 'swatch', style: { background: D.BIOME[j.biome] ? D.BIOME[j.biome].ground[1] : '#888' } }),
          h('span', { class: 'grow' }, j.code + ', ' + j.region, h('small', null, new Date(j.date).toLocaleDateString('fr-FR') + (j.danger && AN.Danger.GRADES.find((g) => g.id === j.danger) ? ', ' + AN.Danger.GRADES.find((g) => g.id === j.danger).name.toLowerCase() : '') + '. ' + (j.creatures.length ? j.creatures.join(', ') : 'Aucune capture') + ', ' + j.territories + ' territoire' + (j.territories > 1 ? 's' : '') + ', ' + j.resources + ' ressources.')),
          h('span', { class: 'stamp-small ' + j.outcome }, outcomeName(j.outcome))))) : h('p', { class: 'muted' }, 'Aucun monde visité.')),
      h('section', null, h('h4', null, 'Statistiques'),
        h('dl', { class: 'facts' },
          h('dt', null, 'Créatures capturées'), h('dd', null, st.captures),
          h('dt', null, 'Créatures vaincues'), h('dd', null, st.kills),
          h('dt', null, 'Gardiens capturés'), h('dd', null, st.guardians),
          h('dt', null, 'Colosses régionaux capturés'), h('dd', null, st.ultras),
          st.cosmic ? [h('dt', null, 'Êtres cosmiques capturés'), h('dd', null, st.cosmic)] : null,
          (prof.cosmos && prof.cosmos.astres.length) ? [h('dt', null, 'Astres retenus'), h('dd', null, prof.cosmos.astres.length)] : null,
          h('dt', null, 'Extractions d’urgence'), h('dd', null, st.emergencies),
          h('dt', null, 'Échecs'), h('dd', null, st.deaths),
          h('dt', null, 'Temps de jeu'), h('dd', null, Math.floor(st.playTime / 3600) + ' h ' + String(Math.floor((st.playTime % 3600) / 60)).padStart(2, '0')))));
  };
})();
