/* Fenêtres de l'interface : écran titre, introduction, pause, dialogues
   d'expédition (sac, transfert, récit), rapport de retour, fiche de créature. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const U = AN.Util;
  const h = AN.h;

  const UI = (AN.UI = { stack: [] });

  /* ---------- pile de fenêtres ---------- */
  UI.open = function (el, opts = {}) {
    const root = document.getElementById('ui');
    const wrap = h('div', { class: 'overlay' + (opts.cls ? ' ' + opts.cls : ''), role: 'dialog', 'aria-modal': 'true' }, el);
    if (opts.dismiss !== false) wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) UI.close(); });
    root.appendChild(wrap);
    const item = { wrap, opts };
    UI.stack.push(item);
    AN.Input.blocked = true;
    AN.Game.paused = opts.pause !== false;
    const first = wrap.querySelector('[autofocus]') || wrap.querySelector('button, input, select');
    if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
    return item;
  };
  UI.close = function () {
    const item = UI.stack.pop();
    if (!item) return;
    item.wrap.remove();
    if (item.opts.onClose) item.opts.onClose();
    if (!UI.stack.length) {
      AN.Input.blocked = false;
      AN.Game.paused = false;
      for (const k in AN.Input.keys) AN.Input.keys[k] = false;
      AN.Input.mouse.down = [false, false, false];
    }
  };
  UI.closeAll = function () { while (UI.stack.length) UI.close(); };

  /**
   * Une fenêtre qui se referme pour se rouvrir aussitôt (après un choix) garde
   * sa position de lecture et l'élément actif, sans rejouer son animation.
   */
  UI.reopenKeep = function (fn) {
    const focusables = (p) => [...p.querySelectorAll('button, input, select, [tabindex]')];
    const top = UI.stack[UI.stack.length - 1];
    const panel = top && top.wrap.querySelector('.panel');
    const st = panel ? panel.scrollTop : 0;
    const fi = panel && document.activeElement && panel.contains(document.activeElement) ? focusables(panel).indexOf(document.activeElement) : -1;
    fn();
    const nt = UI.stack[UI.stack.length - 1];
    if (!nt) return;
    nt.wrap.classList.add('instant');
    const np = nt.wrap.querySelector('.panel');
    if (!np) return;
    np.classList.add('instant');
    np.scrollTop = st;
    if (fi >= 0) setTimeout(() => { const f = focusables(np)[fi]; if (f) f.focus({ preventScroll: true }); }, 40);
  };
  UI.isOpen = () => UI.stack.length > 0;

  window.addEventListener('keydown', (e) => {
    if (!UI.stack.length) return;
    const top = UI.stack[UI.stack.length - 1];
    // stopImmediatePropagation : la touche qui ferme la fenêtre ne doit pas la rouvrir aussitôt
    if (e.code === 'Escape' && top.opts.dismiss !== false) { e.preventDefault(); e.stopImmediatePropagation(); UI.close(); }
    else if (e.code === 'Tab' && top.opts.tabClose) { e.preventDefault(); e.stopImmediatePropagation(); UI.close(); }
    else if (e.code === 'Tab') e.preventDefault();
  });

  const btn = (label, onclick, cls = '', attrs = {}) => h('button', Object.assign({ class: 'btn ' + cls, type: 'button', onclick: (e) => { AN.Audio.play('ui'); onclick(e); } }, attrs), label);
  UI.btn = btn;
  UI.costList = function (cost, profile) {
    return h('div', { class: 'cost' }, Object.entries(cost).map(([k, n]) => {
      const have = AN.Profile.stock(profile, k);
      const lack = have < n;
      // une ressource manquante est un raccourci vers la recherche précise
      const seek = lack && UI.seek && AN.Game.profile;
      return h('span', { class: 'c' + (lack ? ' lack' : '') + (seek ? ' seek' : ''), title: D.RESOURCES[k].name + ' : ' + have + ' en réserve' + (seek ? '. Cliquez pour chercher où en trouver.' : ''),
        role: seek ? 'button' : null, tabindex: seek ? '0' : null,
        onclick: seek ? (e) => { e.stopPropagation(); AN.Audio.play('ui'); UI.seek('res', k); } : null }, AN.Icons.img('res', k, 16), n);
    }));
  };
  UI.resList = function (res, cls = '') {
    const entries = Object.entries(res).filter(([, n]) => n > 0);
    if (!entries.length) return h('div', { class: 'muted' }, 'Rien.');
    return h('div', { class: 'reslist ' + cls }, entries.map(([k, n]) => h('span', { class: 'r', title: D.RESOURCES[k].name }, AN.Icons.img('res', k, 18), h('b', null, n), h('small', null, D.RESOURCES[k].name))));
  };

  /* ---------- écran titre ---------- */
  /** « il y a 3 h » */
  UI.ago = function (t) {
    const s = Math.max(0, (Date.now() - (t || Date.now())) / 1000);
    if (s < 90) return 'à l’instant';
    if (s < 3600) return 'il y a ' + Math.round(s / 60) + ' min';
    if (s < 86400) return 'il y a ' + Math.round(s / 3600) + ' h';
    const d = Math.round(s / 86400);
    return d === 1 ? 'hier' : 'il y a ' + d + ' jours';
  };

  /* ---------- écran titre : trois emplacements de partie ---------- */
  UI.title = function () {
    const S = AN.Save;
    let pendingSlot = 1;
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { const p = await S.importFile(f); S.useSlot(pendingSlot); S.write(p); UI.closeAll(); AN.Game.begin(p); }
      catch (err) { AN.HUD.toast('Import impossible : ' + err.message, 5); }
    } });
    const list = h('div', { class: 'slots' });
    // le fond de l'écran titre montre l'Archive de la dernière partie
    const backdrop = (info) => { AN.Game.titleBg = info && info.p ? { territories: info.p.territories || [], t0: performance.now() } : null; };
    const render = () => {
      AN.clear(list);
      backdrop(S.peek(S.slot));
      for (let n = 1; n <= S.SLOTS; n++) {
        const info = S.peek(n);
        const last = n === S.slot;
        const start = () => { S.useSlot(n); S.clear(n); UI.closeAll(); AN.Game.titleBg = null; AN.Game.begin(S.newProfile((Math.random() * 4294967295) >>> 0)); };
        const terr = info && info.p ? info.p.territories || [] : [];
        list.appendChild(h('article', { class: 'save-slot' + (info ? '' : ' vacant') + (last && info ? ' last' : ''), onmouseenter: () => backdrop(info || null) },
          h('div', { class: 'slot-num' }, String(n)),
          info && AN.Mosaic ? h('div', { class: 'slot-seal' }, AN.Mosaic.canvas(terr, 54, 54, { pad: 0.04, lineAlpha: 0.55 })) : h('div', { class: 'slot-seal blank' }),
          h('div', { class: 'slot-body' },
            h('b', null, info ? 'Archive : ' + (info.rank || 'Néant') : 'Emplacement libre'),
            h('small', null, info
              ? info.territories + ' territoire' + (info.territories > 1 ? 's' : '') + ', ' + info.creatures + ' créature' + (info.creatures > 1 ? 's' : '') + ', ' + info.worlds + ' monde' + (info.worlds > 1 ? 's' : '') + ' visité' + (info.worlds > 1 ? 's' : '')
              : 'Une nouvelle archive commence ici.'),
            info ? h('small', { class: 'muted' }, 'Jouée ' + UI.ago(info.updated) + (info.expedition ? ', expédition en cours' : '')) : null),
          h('div', { class: 'slot-actions' },
            info ? btn('Continuer', () => { S.useSlot(n); UI.closeAll(); AN.Game.titleBg = null; AN.Game.begin(S.load(n)); }, last ? 'primary' : '', last ? { autofocus: true } : {}) : btn('Commencer', start, !S.peek(S.slot) && last ? 'primary' : '', !S.peek(S.slot) && last ? { autofocus: true } : {}),
            info ? btn('Effacer', () => UI.confirm('Effacer définitivement la partie ' + n + ' ? Exportez-la d’abord (menu pause) si vous voulez la garder.', () => { S.clear(n); render(); }, 'Effacer'), 'ghost small') : btn('Importer', () => { pendingSlot = n; fileInput.click(); }, 'ghost small', { title: 'Charger un fichier de sauvegarde dans cet emplacement' }))));
      }
    };
    render();
    list.addEventListener('mouseleave', () => backdrop(S.peek(S.slot)));
    // installer, plein écran : utile sur téléphone et tablette
    const extras = h('div', { class: 'title-extras' });
    const standalone = window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const fillExtras = () => {
      AN.clear(extras);
      if (AN.Game.installPrompt && !standalone) extras.appendChild(btn('Installer le jeu', async () => { const e = AN.Game.installPrompt; AN.Game.installPrompt = null; e.prompt(); try { await e.userChoice; } catch (er) { /* ignoré */ } fillExtras(); }, 'ghost small', { title: 'L’ajouter à l’écran d’accueil : il se lance en plein écran et marche hors ligne' }));
      if (AN.Touch && AN.Touch.wanted() && !standalone && (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) extras.appendChild(btn('Plein écran', () => AN.Touch.fullscreen(), 'ghost small'));
      if (ios && !standalone && /^https?:$/.test(location.protocol)) extras.appendChild(h('small', { class: 'muted' }, 'Pour l’installer : Partager, puis « Sur l’écran d’accueil ».'));
    };
    fillExtras();
    AN.Bus.on('installable', fillExtras);
    const el = h('div', { class: 'title-screen' },
      h('h1', { class: 'title' }, h('span', null, 'L’Archive'), h('span', null, 'du Néant')),
      h('p', { class: 'title-sub' }, 'Partir de rien. Visiter des mondes condamnés. Tout ramener.'),
      list, fileInput, extras,
      h('p', { class: 'title-foot' }, 'Version ' + AN.VERSION + (S.available ? '' : '. Sauvegarde indisponible dans ce navigateur : la partie sera perdue à la fermeture.')),
    );
    UI.open(el, { dismiss: false, cls: 'title-overlay' });
    if (AN.Music) AN.Music.mood('title');
  };

  /* ---------- introduction ---------- */
  UI.intro = function (done) {
    const lines = D.INTRO.map((t) => h('p', null, t));
    const el = h('div', { class: 'intro' }, lines, h('button', { class: 'btn ghost skip', type: 'button', onclick: () => finish() }, 'Passer'));
    const item = UI.open(el, { dismiss: false, cls: 'intro-overlay' });
    let i = 0, timer;
    const step = () => {
      if (i < lines.length) { lines[i].classList.add('in'); i++; timer = setTimeout(step, 2300); }
      else timer = setTimeout(finish, 1600);
    };
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      item.wrap.classList.add('out');
      setTimeout(() => { UI.close(); if (done() === 'quiet') return; setTimeout(() => AN.HUD.toast('Approchez-vous de l’Artefact avec ' + AN.Input.moveKeys() + ', puis appuyez sur ' + AN.Input.label('KeyE') + '.', 7), 1800); }, 700);
    };
    timer = setTimeout(step, 500);
  };

  /* ---------- reprise d'une expédition sauvegardée ---------- */
  UI.resumeChoice = function (prof, text, onResume, onAbandon) {
    const el = h('div', { class: 'panel small resume-panel' },
      h('p', { class: 'kicker' }, 'Expédition en cours'),
      h('h2', null, 'Reprendre là où vous étiez ?'),
      h('p', null, text),
      h('p', { class: 'muted small' }, 'Vos découvertes, votre sac et votre soute sont intacts. Les créatures, elles, ont repris leur place. Abandonner revient à une extraction d’urgence sans butin.'),
      h('div', { class: 'actions' },
        btn('Abandonner', () => UI.confirm('Abandonner cette expédition ? Le sac et la soute seront perdus ; l’équipement vous est rendu.', () => { UI.closeAll(); onAbandon(); }, 'Abandonner'), 'ghost'),
        btn('Reprendre l’expédition', () => { UI.close(); onResume(); }, 'primary', { autofocus: true })));
    UI.open(el, { dismiss: false });
  };

  /* ---------- bannière (changement de rang) ---------- */
  UI.banner = function (title, sub) {
    const el = h('div', { class: 'banner' }, h('div', { class: 'banner-title' }, title), h('div', { class: 'banner-sub' }, sub));
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 5000);
  };

  /* ---------- confirmation ---------- */
  UI.confirm = function (text, onYes, yesLabel = 'Confirmer') {
    const el = h('div', { class: 'panel small' },
      h('p', null, text),
      h('div', { class: 'actions' }, btn('Annuler', () => UI.close(), 'ghost', { autofocus: true }), btn(yesLabel, () => { UI.close(); onYes(); }, 'danger')));
    UI.open(el);
  };

  /* ---------- rangement automatique de l'Archive (1.7) ---------- */
  UI.arrangeDialog = function (prof, onRun) {
    const ar = (prof.arrange = prof.arrange || { reshape: false, autoReshape: true });
    let reshape = ar.autoReshape !== false;
    const sum = AN.Arrange.summary(prof);
    const pct = (v) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + ' %';
    const el = h('div', { class: 'panel small arrange-dialog' },
      h('h2', null, 'Ranger l’Archive'),
      h('p', null, 'Les territoires sont replacés pour former le plus de synergies possible, en évitant les voisinages néfastes et les peuples ennemis côte à côte. L’Archive reste d’un seul tenant, sans trous, mais n’a pas besoin d’être ronde.'),
      h('p', { class: 'now small' }, 'Aujourd’hui : ' + sum.pos + ' synergie' + (sum.pos > 1 ? 's' : '') + ', ' + sum.neg + ' néfaste' + (sum.neg > 1 ? 's' : '') + ', production des territoires ' + pct(sum.prod) + (sum.holes ? ', ' + sum.holes + ' case' + (sum.holes > 1 ? 's' : '') + ' vide' + (sum.holes > 1 ? 's' : '') + ' enclavée' + (sum.holes > 1 ? 's' : '') : '') + '.'),
      h('label', { class: 'field check' },
        h('input', { type: 'checkbox', checked: reshape, onchange: (e) => { reshape = e.target.checked; } }),
        h('span', null, 'Adapter la forme des territoires', h('small', { class: 'muted' }, ' : chacun prend la forme qui comble les vides et touche le plus de partenaires. Sinon, ils gardent leur forme et peuvent seulement tourner.'))),
      h('p', { class: 'muted small' }, 'Rien n’est perdu : « Défaire » rétablit la disposition actuelle.'),
      h('div', { class: 'actions' },
        btn('Annuler', () => UI.close(), 'ghost'),
        btn('Ranger', () => { ar.autoReshape = reshape; UI.close(); onRun(reshape); }, 'primary', { autofocus: true })));
    UI.open(el);
  };

  /* ---------- pause : son, jeu, accessibilité, commandes, partie ---------- */
  let pauseTab = 'son';
  UI.pause = function (tab) {
    if (tab) pauseTab = tab === 'jeu' ? 'son' : tab;
    const prof = AN.Game.profile;
    const st = prof.settings;
    if (st.music == null) st.music = 0.55;
    const Pr = AN.Prefs;
    const I = AN.Input;
    const apply = () => { AN.Audio.configure(st); AN.Save.write(prof); };
    const range = (label, key, help) => h('label', { class: 'field range' }, h('span', null, label, help ? h('small', { class: 'muted' }, ' ' + help) : null),
      h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st[key], oninput: (e) => { st[key] = Number(e.target.value); apply(); }, onchange: () => AN.Audio.play(key === 'music' ? 'ui' : 'ui_ok') }));
    const check = (label, key) => h('label', { class: 'field check' }, h('input', { type: 'checkbox', checked: st[key], onchange: (e) => { st[key] = e.target.checked; apply(); } }), h('span', null, label));
    const pcheck = (label, sec, key, help) => h('label', { class: 'field check' }, h('input', { type: 'checkbox', checked: !!Pr.data[sec][key], onchange: (e) => { Pr.set(sec, key, e.target.checked); } }), h('span', null, label, help ? h('small', { class: 'muted' }, ' ' + help) : null));
    const pselect = (label, sec, key, options) => h('label', { class: 'opt-row' }, h('span', null, label),
      h('select', { onchange: (e) => { const v = e.target.value; Pr.set(sec, key, isNaN(Number(v)) ? v : Number(v)); } }, options.map(([v, t]) => h('option', { value: v, selected: String(Pr.data[sec][key]) === String(v) }, t))));
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { const p = await AN.Save.importFile(f); AN.Save.write(p); location.reload(); }
      catch (err) { AN.HUD.toast('Import impossible : ' + err.message, 5); }
    } });
    const X = AN.X;
    const inExp = !!X;
    const where = inExp
      ? (X.tuto ? 'Le Seuil, tutoriel' : 'Expédition ' + X.world.code + ', ' + X.world.region + ' : ' + (X.zi >= X.world.zones.length ? 'cœur' : 'zone ' + (X.zi + 1) + ' sur ' + X.world.zones.length))
      : 'Archive : ' + AN.Profile.rank(prof).def.name + ', ' + prof.territories.length + ' territoire' + (prof.territories.length > 1 ? 's' : '');
    const playMin = Math.floor((prof.stats.playTime || 0) / 60);
    const body = h('div', { class: 'pause-body' });
    const TABS = [['son', 'Son'], ['jeu', 'Jeu'], ['access', 'Accessibilité'], ['touches', 'Commandes'], ['partie', 'Partie']];
    const nav = h('nav', { class: 'pause-tabs', role: 'tablist' });
    let el = null;
    const show = (id) => {
      const same = id === pauseTab && body.firstChild;
      pauseTab = id;
      const render = () => {
        AN.clear(nav);
        TABS.forEach(([k, n]) => nav.appendChild(h('button', { type: 'button', role: 'tab', class: 'seg' + (k === id ? ' on' : ''), 'aria-selected': k === id ? 'true' : 'false', onclick: () => { AN.Audio.play('tab'); show(k); } }, n)));
        AN.clear(body);
        body.appendChild(SECTIONS[id]());
      };
      if (same && el) UI.keepPlace(el, render); else render();
    };
    const SECTIONS = {
      son: () => h('section', null,
        range('Musique', 'music', 'composée en direct, selon le monde et le danger'), range('Effets sonores', 'volume'), range('Ambiance', 'ambience', 'bourdon de l’Archive et des mondes'),
        check('Couper tout le son', 'mute')),
      jeu: () => h('section', null,
        check('Tremblements de l’écran', 'shake'),
        pcheck('Mettre en pause quand la fenêtre perd le focus', 'ui', 'autoPause'),
        AN.Touch ? pselect('Commandes tactiles', 'touch', 'mode', [['auto', 'Automatique (écran tactile)'], ['on', 'Toujours affichées'], ['off', 'Jamais']]) : null,
        AN.Touch ? pselect('Taille des commandes tactiles', 'touch', 'size', [[0.85, 'Petites'], [1, 'Normales'], [1.2, 'Grandes']]) : null,
        AN.Touch ? pcheck('Commandes tactiles inversées (gaucher)', 'touch', 'left') : null,
        AN.Pad ? pcheck('Vibrations de la manette', 'pad', 'vibrate') : null),
      access: () => h('section', null,
        pselect('Taille de l’interface', 'ui', 'scale', [[0.9, '90 %'], [1, '100 %'], [1.15, '115 %'], [1.3, '130 %'], [1.5, '150 %']]),
        pselect('Couleurs', 'ui', 'palette', Object.entries(Pr.PALETTES).map(([k, v]) => [k, v.name])),
        pcheck('Texte plus grand dans les messages', 'ui', 'bigText'),
        pcheck('Effets réduits', 'ui', 'reduceFx', '(moins de particules, ni flash ni tremblement, animations de l’interface coupées)'),
        h('p', { class: 'muted small' }, 'Ces réglages concernent cet appareil et valent pour toutes les parties.')),
      touches: () => {
        const grid = h('div', { class: 'keymap' });
        I.ACTIONS.forEach((a) => {
          const row = h('div', { style: { display: 'contents' } });
          const k = h('kbd', null, I.label(a.code));
          const b2 = btn('Changer', () => {
            row.classList.add('listening'); k.textContent = '…';
            I.captureNext((code) => {
              if (code) I.rebind(a.code, code);
              show('touches');
            });
          }, 'tiny ghost');
          row.appendChild(h('span', null, a.name)); row.appendChild(k); row.appendChild(b2);
          grid.appendChild(row);
        });
        return h('section', null,
          h('p', { class: 'muted small' }, 'Touchez « Changer », puis appuyez sur la nouvelle touche (Échap pour annuler). Une touche déjà utilisée est échangée.'),
          grid,
          h('dl', { class: 'keys' },
            h('dt', null, 'Clic gauche'), h('dd', null, 'Tirer'),
            h('dt', null, 'Clic droit'), h('dd', null, 'Frapper au corps à corps'),
            h('dt', null, 'Molette'), h('dd', null, 'Dézoomer l’Archive, changer de capacité'),
            h('dt', null, 'Flèches'), h('dd', null, 'Se déplacer (toujours actives)'),
            h('dt', null, 'Échap'), h('dd', null, 'Pause')),
          h('div', { class: 'actions' }, btn('Touches par défaut', () => { I.resetBinds(); show('touches'); }, 'ghost small')));
      },
      partie: () => h('section', null,
        h('p', { class: 'muted' }, inExp ? 'L’expédition est enregistrée en continu : si vous fermez le jeu, vous pourrez la reprendre là où vous étiez.' : 'La partie ' + AN.Save.slot + ' est enregistrée automatiquement dans ce navigateur.'),
        h('div', { class: 'actions wrap left' },
          btn('Exporter la sauvegarde', () => AN.Save.exportFile(prof), 'ghost'),
          btn('Importer…', () => fileInput.click(), 'ghost'), fileInput,
          !inExp ? btn('Changer de partie', () => { AN.Save.write(prof); location.reload(); }, 'ghost', { title: 'Revenir à l’écran titre et ses trois emplacements' }) : null,
          !inExp && AN.Archive.state() ? btn('Rejouer le tutoriel', () => { UI.closeAll(); AN.Archive.exit(); AN.Game.transition(() => AN.Tutorial.start(prof, { sandbox: !AN.Tutorial.shouldOffer(prof) }), 0.6); }, 'ghost', { title: 'Le Seuil, sans rien garder' }) : null),
        inExp ? h('div', { class: 'danger-zone' },
          h('p', { class: 'small' }, X.tuto ? 'Quitter le Seuil ramène à l’Archive.' : 'Abandonner ramène à l’Archive par une extraction d’urgence : presque tout le butin reste là-bas.'),
          X.tuto ? btn('Quitter le tutoriel', () => { UI.closeAll(); AN.Tutorial.askSkip(X); }, 'ghost') : btn('Abandonner l’expédition', () => { UI.closeAll(); AN.Expedition.emergency(X); }, 'danger')) : null,
        h('div', { class: 'danger-zone' },
          h('p', { class: 'small' }, 'Effacer la partie ' + AN.Save.slot + ' est définitif.'),
          btn('Effacer la partie', () => UI.confirm('Effacer définitivement la partie ' + AN.Save.slot + ' ? Exportez-la d’abord si vous voulez la garder.', () => { AN.Save.clear(); AN.Game.profile = null; location.reload(); }, 'Effacer'), 'danger'))),
    };
    el = h('div', { class: 'panel pause' },
      h('header', null, h('div', null, h('h2', null, 'Pause'), h('p', { class: 'muted pause-where' }, where)), btn('Reprendre', () => UI.close(), 'primary', { autofocus: true })),
      nav, body,
      h('p', { class: 'muted foot' }, 'L’Archive du Néant, version ' + AN.VERSION + '. Partie ' + AN.Save.slot + ', ' + (playMin >= 60 ? Math.floor(playMin / 60) + ' h ' + String(playMin % 60).padStart(2, '0') : playMin + ' min') + ' de jeu.'),
    );
    show(pauseTab);
    UI.open(el);
  };

  /* ---------- fragment de récit ---------- */
  UI.lore = function (L) {
    const n = AN.Game.profile.lore.length;
    const el = h('div', { class: 'panel lore' },
      h('div', { class: 'lore-num' }, 'Fragment ' + n + ' sur ' + D.LORE.length),
      h('h2', null, L.title),
      h('blockquote', null, L.text),
      h('div', { class: 'actions' }, btn('Fermer', () => UI.close(), 'primary', { autofocus: true })));
    UI.open(el);
  };

  /* ---------- sac et soute (expédition) ---------- */
  UI.bagPanel = function (X) {
    const body = h('div');
    let el = null;
    const redo = () => (el ? UI.keepPlace(el, render) : render());
    const render = () => {
      AN.clear(body);
      const bagEntries = Object.entries(X.bag).filter(([, n]) => n > 0).sort((a, b) => D.resValue(b[0]) - D.resValue(a[0]));
      body.appendChild(h('section', null,
        h('h3', null, 'Sac : ' + X.bagCount() + ' / ' + X.S.bagCap),
        bagEntries.length ? h('ul', { class: 'rows' }, bagEntries.map(([k, n]) => h('li', null,
          AN.Icons.img('res', k, 22), h('span', { class: 'grow' }, D.RESOURCES[k].name, h('small', null, D.RARITY[D.RESOURCES[k].rarity].name + ' · valeur ' + D.resValue(k))),
          h('b', null, '×' + n),
          btn('Jeter 1', () => { X.bag[k]--; AN.Combat.drop(X, X.player.x, X.player.y, { [k]: 1 }); X.pickups[X.pickups.length - 1].t = -4; if (!X.bag[k]) delete X.bag[k]; redo(); }, 'tiny ghost'),
          btn('Tout jeter', () => { const m = X.bag[k]; delete X.bag[k]; AN.Combat.drop(X, X.player.x, X.player.y, { [k]: m }); X.pickups.slice(-m).forEach((p) => (p.t = -4)); redo(); }, 'tiny ghost'),
        ))) : h('p', { class: 'muted' }, 'Le sac est vide.')));
      const cu = X.cargoUsed();
      body.appendChild(h('section', null,
        h('h3', null, 'Soute de l’Artefact : ' + cu + ' / ' + X.cargoCap + ' places'),
        X.cargo.length ? h('ul', { class: 'rows' }, X.cargo.map((c, i) => {
          if (c.structure) {
            const sd = D.STRUCTURES[c.structure];
            return h('li', null, AN.StructArt.icon(c.structure, 34), h('span', { class: 'grow' }, sd.name, h('small', null, c.weight + ' places · ' + sd.text + ' · à reconstruire dans l’Archive')),
              btn('Laisser', () => {
                if (X.zone.structure && !X.zone.structure.taken) { AN.HUD.toast('Une structure occupe déjà cette zone.'); return; }
                X.cargo.splice(i, 1);
                X.zone.structure = { id: c.structure, x: X.player.x + 40, y: X.player.y, searched: true, taken: false, seed: 1 };
                UI.reopenKeep(() => UI.bagPanel(X));
              }, 'tiny ghost'));
          }
          const d = D.CREATURE[c.species];
          if (!d) return h('li', null, c.people ? AN.CivArt.portrait(c.people, 'villager', 34) : null, h('span', { class: 'grow' }, AN.Profile.cargoLabel(c), h('small', null, AN.Profile.cargoWeight(c) + ' places')));
          if (c.egg) {
            return h('li', null, AN.Icons.egg(c, 34), h('span', { class: 'grow' }, AN.Profile.cargoLabel(c), h('small', null, '1 place · éclora dans l’Archive')),
              btn('Laisser', () => {
                X.cargo.splice(i, 1);
                X.zone.eggs = X.zone.eggs || [];
                X.zone.eggs.push({ id: U.uid('oeuf'), x: X.player.x + 24, y: X.player.y, species: c.species, variant: c.variant, hueSeed: c.hueSeed, taken: false });
                UI.reopenKeep(() => UI.bagPanel(X));
              }, 'tiny ghost'));
          }
          return h('li', null, AN.Icons.creature(c, 34),
            h('span', { class: 'grow' }, d.name + (D.VARIANT[c.variant].name ? ' ' + D.VARIANT[c.variant].name : ''), h('small', null, D.TIERS[d.tier].name + ' · ' + (d.tier >= 4 ? 'retenu par l’Ancrage' : D.TIERS[d.tier].weight + ' place' + (d.tier ? 's' : '')) + ' · valeur ' + AN.Entities.value(c.species, c.variant))),
            btn('Relâcher', () => UI.confirm('Relâcher ' + d.name + ' dans ce monde ? Elle sera détruite avec lui.', () => {
              X.cargo.splice(i, 1);
              const e = AN.Entities.creature(d, X.player.x + 30, X.player.y, { threat: X.world.threat, variant: c.variant, hueSeed: c.hueSeed });
              e.hp = e.maxHp * 0.25; e.weak = !e.isBoss; e.temper = 'craintif';
              if (e.isBoss) { AN.Boss.init(e, { arena: { x: e.x, y: e.y, r: 300 }, zoneIndex: X.zi, errant: true }); }
              X.creatures.push(e);
              UI.reopenKeep(() => UI.bagPanel(X));
            }, 'Relâcher'), 'tiny ghost'));
        })) : h('p', { class: 'muted' }, 'Aucune créature capturée pour l’instant.')));
      const team = X.allies.filter((a) => !a.temp);
      if (team.length) body.appendChild(h('section', null, h('h3', null, 'Compagnons'),
        h('ul', { class: 'rows' }, team.map((a) => {
          const tr = D.trait(a.def.id);
          const info = [];
          if (a.level) info.push('niveau ' + a.level);
          if (tr.ability) info.push('capacité : ' + D.ABILITIES[tr.ability].name);
          if ((a.keys || []).length) info.push('clés : ' + a.keys.map((k) => D.KEYS[k].name).join(', '));
          if (tr.mount) info.push('monture' + (tr.mount.fly ? ' volante' : ''));
          return h('li', null, AN.Icons.creature({ species: a.def.id, variant: a.variant, hueSeed: a.hueSeed }, 34),
            h('span', { class: 'grow' }, a.nickname || a.def.name, h('small', null, info.join(' · '))),
            h('b', { class: a.downed ? 'warn' : '' }, a.downed ? 'À terre' : Math.ceil(a.hp) + ' PV'));
        }))));
      body.appendChild(h('p', { class: 'muted' }, 'Valeur en jeu : ' + U.fmt(X.bagValue() + X.cargoValue()) + '. Rien de tout cela n’est acquis avant l’extraction.'));
    };
    render();
    el = h('div', { class: 'panel bag' }, h('header', null, h('h2', null, 'Sac et soute'), btn('Fermer', () => UI.close(), 'ghost')), body);
    UI.closeAll();
    UI.open(el, { tabClose: true });
  };

  /* ---------- préparation du transfert ---------- */
  UI.transferDialog = function (X, plate) {
    const sel = new Set();
    const astreSel = new Set();
    const civ = X.civ;
    const opt = { villagers: true, village: false };
    const conquered = [...X.conquered].sort((a, b) => a - b);
    const body = h('div');
    const fragSpec = AN.Expedition.zoneSpec(X, X.zi);
    const E = X.echelon || D.ECHELONS.region;
    const monde = E.id === 'monde';
    const zoneWeight = (zi) => (zi >= X.world.zones.length ? (monde ? D.TERRITORY_WEIGHT.cratere : D.TERRITORY_WEIGHT.coeur) : (monde ? D.TERRITORY_WEIGHT.continent : D.TERRITORY_WEIGHT.territoire));
    const zoneLabel = (zi) => (zi >= X.world.zones.length ? (monde ? 'Cratère : ' : 'Cœur : ') : (monde ? 'Continent conquis : ' : 'Territoire conquis : '));
    const maxAstres = E.astre ? AN.Profile.upgradeValue(X.profile, 'ancrage').astres + (AN.Profile.upgradeValue(X.profile, 'ancrage').astres > 0 ? AN.Profile.powers(X.profile).astres || 0 : 0) : 0;
    let el = null;
    const redo = () => (el ? UI.keepPlace(el, render) : render());
    const render = () => {
      AN.clear(body);
      const here = civ && AN.Civ.inVillageZone(X);
      const rallied = here && civ.state === 'rally' ? X.civils.filter((c) => c.alive && c.npc && (c.npc.mode === 'rally' || c.npc.mode === 'waiting')).length : 0;
      const civW = rallied && opt.villagers ? D.civWeight(rallied) + (opt.village ? D.VILLAGE_WEIGHT : 0) : 0;
      const used = X.cargoUsed() + civW + [...sel].reduce((s, zi) => s + zoneWeight(zi), 0);
      body.appendChild(h('div', { class: 'capacity' + (used > X.cargoCap ? ' over' : '') },
        h('span', null, 'Soute'), h('div', { class: 'bar' }, h('i', { style: { transform: 'scaleX(' + U.clamp(used / X.cargoCap, 0, 1) + ')' } })), h('b', null, used + ' / ' + X.cargoCap)));
      body.appendChild(h('section', null, h('h3', null, 'Territoires'),
        h('ul', { class: 'rows' },
          h('li', null, h('span', { class: 'swatch', style: { background: D.BIOME[fragSpec.biome].ground[1] } }), h('span', { class: 'grow' }, 'Fragment : ' + fragSpec.name, h('small', null, 'Toujours emporté, gratuit : le sol autour du portail (une case dans l’Archive).')), h('b', null, 'inclus')),
          conquered.length ? conquered.map((zi) => {
            const spec = AN.Expedition.zoneSpec(X, zi);
            const wgt = zoneWeight(zi);
            return h('li', { class: astreSel.has(zi) ? 'disabled' : '' },
              h('label', { class: 'check grow' }, h('input', { type: 'checkbox', checked: sel.has(zi), disabled: astreSel.has(zi), onchange: (e) => { e.target.checked ? sel.add(zi) : sel.delete(zi); redo(); } }),
                h('span', { class: 'swatch', style: { background: D.BIOME[spec.biome].ground[1] } }),
                h('span', null, zoneLabel(zi) + spec.name, h('small', null, astreSel.has(zi) ? 'Retenu comme astre.' : 'Occupera ' + AN.Shapes.sizeOf(zi >= X.world.zones.length ? (monde ? 'cratere' : 'coeur') : (monde ? 'continent' : 'territoire')) + ' cases dans l’Archive, avec la forme de cette zone. Production plus élevée, et son gardien peut y vivre.'))),
              h('b', null, wgt + ' places'));
          }) : h('li', { class: 'muted' }, 'Aucune zone conquise. Vaincre ou capturer un gardien permet de transférer sa zone entière.'))));
      if (E.astre) {
        const cands = conquered.filter((zi) => D.astreFor(AN.Expedition.zoneSpec(X, zi).biome));
        body.appendChild(h('section', null, h('h3', null, 'Astres (Ancrage : ' + astreSel.size + ' / ' + maxAstres + ')'),
          maxAstres <= 0 ? h('p', { class: 'muted' }, 'L’Ancrage de l’Artefact ne retient pas encore d’astre entier. Améliorez-le pour emporter des lunes, des planètes, des étoiles.') : null,
          cands.length ? h('ul', { class: 'rows' }, cands.map((zi) => {
            const spec = AN.Expedition.zoneSpec(X, zi);
            const A = D.astreFor(spec.biome);
            const on = astreSel.has(zi);
            return h('li', { class: sel.has(zi) || (!on && astreSel.size >= maxAstres) ? 'disabled' : '' },
              h('label', { class: 'check grow' }, h('input', { type: 'checkbox', checked: on, disabled: sel.has(zi) || (!on && astreSel.size >= maxAstres), onchange: (e) => { e.target.checked ? astreSel.add(zi) : astreSel.delete(zi); redo(); } }),
                h('span', { class: 'swatch round', style: { background: D.BIOME[spec.biome].ground[1] } }),
                h('span', null, (A.noun || A.name) + ' ' + AN.Names.de(AN.Names.proper(X.world.code)) + ' : ' + spec.name, h('small', null, U.cap(A.name) + '. ' + A.desc + ' Il rejoindra le ciel de l’Archive.'))),
              h('b', null, 'Ancrage'));
          })) : h('p', { class: 'muted' }, 'Conquérez une zone pour pouvoir l’emporter tout entière, comme un astre.')));
      }
      if (civ) {
        const P = D.PEOPLE[civ.people];
        const rows = [];
        if (rallied) {
          rows.push(h('li', null, h('label', { class: 'check grow' }, h('input', { type: 'checkbox', checked: opt.villagers, onchange: (e) => { opt.villagers = e.target.checked; redo(); } }),
            AN.CivArt.portrait(civ.people, 'villager', 30), h('span', null, 'Emmener ' + P.name + ' rassemblés (' + rallied + ')', h('small', null, 'Ils embarquent en atteignant le portail. Ceux qui n’y arrivent pas restent.'))), h('b', null, D.civWeight(rallied) + ' pl.')));
          if (opt.villagers) rows.push(h('li', null, h('label', { class: 'check grow' }, h('input', { type: 'checkbox', checked: opt.village, onchange: (e) => { opt.village = e.target.checked; redo(); } }),
            h('span', null, 'Emporter aussi leur village', h('small', null, 'Sans lui, ils vivront sous des abris de fortune, moins heureux et moins utiles.'))), h('b', null, D.VILLAGE_WEIGHT + ' pl.')));
        }
        if (sel.has(civ.zone)) rows.push(h('li', { class: 'note' }, 'Le village de ' + P.name + ' fait partie d’un territoire transféré : ses habitants viendront avec lui' + (['fiers', 'hostiles', 'iconoclastes'].includes(civ.attitude) || civ.forced ? ', qu’ils le veuillent ou non.' : '.')));
        else if (civ.state === 'rally' && !here) rows.push(h('li', { class: 'warn' }, P.Name + ' attendent dans leur zone (' + AN.Expedition.zoneSpec(X, civ.zone).name + '). Ils ne peuvent embarquer que depuis là-bas.'));
        else if (!rallied) rows.push(h('li', { class: 'muted' }, civ.met ? P.Name + ' resteront dans ce monde, qui sera détruit.' : 'Un peuple vit quelque part dans ce monde. Il sera détruit avec lui.'));
        if (civ.forced || civ.state === 'arkTaken') rows.push(h('li', { class: 'muted' }, 'Les habitants capturés de force sont dans la soute.'));
        body.appendChild(h('section', null, h('h3', null, 'Habitants'), h('ul', { class: 'rows' }, rows)));
      }
      body.appendChild(h('section', null, h('h3', null, 'Dans la soute'),
        X.cargo.length ? h('ul', { class: 'rows' }, X.cargo.map((c, i) => {
          const ico = c.structure ? AN.StructArt.icon(c.structure, 30) : c.inhabitants || c.ark ? AN.CivArt.portrait(c.people, 'villager', 30) : c.egg ? AN.Icons.egg(c, 30) : AN.Icons.creature(c, 30);
          return h('li', null, ico, h('span', { class: 'grow' }, AN.Profile.cargoLabel(c)), h('b', null, c.species && D.CREATURE[c.species].tier >= 4 ? 'Ancrage' : AN.Profile.cargoWeight(c) + ' pl.'),
            btn('Laisser ici', () => { X.cargo.splice(i, 1); redo(); }, 'tiny ghost'));
        })) : h('p', { class: 'muted' }, 'La soute est vide.')));
      const down = X.allies.filter((a) => a.downed && !a.temp);
      if (down.length) body.appendChild(h('p', { class: 'note' }, down.map((a) => a.nickname || a.def.name).join(', ') + ' ' + (down.length > 1 ? 'sont' : 'est') + ' à terre : l’Artefact les ramènera blessés.'));
      const st = AN.Profile.upgradeValue(X.profile, 'stabilisateur');
      const fromBase = !!plate.base;
      body.appendChild(h('p', { class: 'note' }, 'Une fois lancé, le transfert dure environ ' + Math.round(st.dur * 0.62 * AN.Collapse.transferMul(X) * (fromBase ? 1 - D.BASE.transfer : 1)) + ' secondes de présence ' + (fromBase ? 'sur l’hexagone' : 'dans le portail') + '. Le monde s’effondre autour de vous, puis il est détruit. Vous ne pourrez jamais y revenir.'));
      if (fromBase) body.appendChild(h('p', { class: 'note' }, 'L’hexagone repart avec le butin, vous à bord, ses gardes et ses défenses. Les créatures marcheront sur lui : s’il tombe avant la fin, l’Artefact rentre seul avec la soute, sans les territoires.'));
      const go = btn('Lancer le transfert', () => {
        UI.close();
        AN.Collapse.start(X, plate, { territories: [...sel], astres: [...astreSel], villagers: !!(rallied && opt.villagers), village: !!(rallied && opt.villagers && opt.village) });
      }, 'primary danger-ish');
      go.disabled = used > X.cargoCap;
      body.appendChild(h('div', { class: 'actions' }, btn('Pas encore', () => UI.close(), 'ghost'), go));
    };
    render();
    el = h('div', { class: 'panel transfer' }, h('header', null, h('h2', null, plate.base ? 'Extraction depuis l’hexagone' : 'Extraction'), h('p', { class: 'muted' }, X.world.code + ', ' + X.world.region)), body);
    UI.open(el);
  };

  /* ---------- retour d'un lieu ancré (1.10) ---------- */
  UI.placeReturn = function (X, plate) {
    const P = AN.Profile;
    const bag = U.sumValues(X.bag);
    const body = h('div', null,
      h('p', null, (X.world.placeName || X.world.region) + ' est ancré à l’Archive : il ne sera pas détruit, et vous pourrez y revenir quand vous voudrez. Les gisements repoussent et les créatures reviennent avec le temps.'),
      h('ul', { class: 'rows' },
        h('li', null, h('span', { class: 'grow' }, 'Sac'), h('b', null, bag + ' ressource' + (bag > 1 ? 's' : ''))),
        h('li', null, h('span', { class: 'grow' }, 'Soute'), h('b', null, X.cargo.length ? X.cargo.map((c) => P.cargoLabel(c)).join(', ') : 'vide'))),
      h('p', { class: 'muted small' }, plate.base ? 'L’hexagone repart aussitôt, vous à bord.' : 'L’Artefact vous ramène depuis la plaque, sans transfert.'));
    const el = h('div', { class: 'panel small transfer' }, h('header', null, h('h2', null, 'Rentrer à l’Archive'), h('p', { class: 'muted' }, X.world.code + ', ' + (X.world.placeName || X.world.region))), body,
      h('div', { class: 'actions' }, btn('Pas encore', () => UI.close(), 'ghost'), btn('Rentrer', () => { UI.close(); AN.Places.leave(X, plate); }, 'primary', { autofocus: true })));
    UI.open(el);
  };

  /* ---------- rapport de retour (refait en 1.8) ---------- */
  UI.report = function (r) {
    const P = AN.Profile;
    const prof = AN.Game.profile;
    const ok = r.outcome === 'extrait' || r.outcome === 'retour' || r.outcome === 'ancre';
    const title = r.nation ? (r.nation.mode === 'allie' ? 'Alliance : ' : 'Soumission : ') + r.nation.name : r.place && r.outcome === 'retour' ? 'Retour de ' + r.place.name : r.base && r.base.submerged && r.base.withPlayer ? 'Hexagone submergé' : ok ? 'Transfert réussi' : r.outcome === 'urgence' ? 'Extraction d’urgence' : 'Échec de l’expédition';
    const band = h('canvas', { class: 'report-band', width: 640, height: 64 });
    if (UI.drawSwatch) UI.drawSwatch(band, r.world);
    const resEntries = Object.entries(r.resources || {}).filter(([, n]) => n > 0).sort((a, b) => D.resValue(b[0]) * b[1] - D.resValue(a[0]) * a[1]);
    const value = resEntries.reduce((s, [k, n]) => s + D.resValue(k) * n, 0);
    const gains = [];
    if (r.nation) gains.push(h('div', { class: 'gain-block' }, h('h4', null, r.nation.mode === 'allie' ? 'Un monde allié' : 'Un monde soumis'),
      h('p', null, r.nation.name + ' : leur monde n’a pas été détruit. Il devient un lieu ancré, avec ses villes, ses comptoirs et ses mercenaires, et il envoie un tribut toutes les ' + D.NATION.tribute.period + ' minutes (page Peuples).')));
    if (r.territories.length) gains.push(h('div', { class: 'gain-block' }, h('h4', null, 'Territoires ', h('small', { class: 'muted' }, 'ils ont choisi leur place dans l’Archive')),
      h('ul', { class: 'gain-list' }, r.territories.map((t) => h('li', null, AN.Mosaic ? AN.Mosaic.shape(t, 44) : null,
        h('span', null, h('b', null, t.zoneName), h('small', null, D.BIOME[t.biome].name + ', ' + (D.QUALITY_NAMES[t.quality] || 'territoire').toLowerCase() + ', ' + AN.Shapes.cellsOf(t).length + ' case' + (AN.Shapes.cellsOf(t).length > 1 ? 's' : ''))))))));
    if (r.astres && r.astres.length) gains.push(h('div', { class: 'gain-block' }, h('h4', null, 'Astres retenus par l’Ancrage'),
      h('ul', { class: 'gain-list' }, r.astres.map((a) => h('li', null, h('span', { class: 'astre-dot', style: { background: D.BIOME[a.biome].ground[1] } }), h('span', null, h('b', null, AN.Names.astre(a)), h('small', null, U.cap(AN.Names.astreKind(a)) + '. ' + D.ASTRES[a.biome].desc)))))));
    const beings = (r.creatures || []).concat(r.hatched || []);
    if (beings.length) gains.push(h('div', { class: 'gain-block' }, h('h4', null, 'Créatures archivées'),
      h('div', { class: 'portraits' }, beings.map((c) => h('figure', null, AN.Icons.creature(c, 56), h('figcaption', null, P.displayName(c), (r.hatched || []).includes(c) ? h('small', { class: 'muted' }, 'éclos') : null))))));
    if (r.structures && r.structures.length) gains.push(h('div', { class: 'gain-block' }, h('h4', null, 'Structures rapportées'),
      h('ul', { class: 'gain-list' }, r.structures.map((s) => h('li', null, AN.StructArt.icon(s.id, 40), h('span', null, h('b', null, D.STRUCTURES[s.id].name), h('small', null, D.STRUCTURES[s.id].text + '. À reconstruire autour de l’Artefact.')))))));
    if (r.civ) gains.push(h('div', { class: 'gain-block' }, h('h4', null, D.PEOPLE[r.civ.people].Name),
      h('div', { class: 'civ-report' }, AN.CivArt.portrait(r.civ.people, 'villager', 52),
        h('div', null, (r.civ.lines.length ? r.civ.lines : ['Vous ne les avez pas rencontrés.']).map((l) => h('p', null, l))))));
    const losses = [];
    if (r.lost && r.lost.length) losses.push(h('p', null, h('b', null, r.lost.join(', ') + (r.lost.length > 1 ? ' sont restés' : ' est resté') + ' dans ' + r.world.code + '. '), 'Ce monde tiendra encore ' + AN.Rescue.DELAY + ' expéditions : une mission de sauvetage apparaît parmi les destinations.'));
    if (r.lostGear.length) losses.push(h('p', null, h('b', null, 'Équipement perdu : '), r.lostGear.join(', ') + '.'));
    if (r.injured.length) losses.push(h('p', null, h('b', null, 'Blessés : '), r.injured.join(', ') + ', au repos pendant les deux prochaines expéditions.'));
    const rk = prof ? P.rank(prof) : null;
    const next = rk && rk.next && UI.rankProgress ? UI.rankProgress(rk) : null;
    const el = h('div', { class: 'panel report ' + r.outcome },
      band,
      h('header', { class: 'report-head' },
        h('div', null, h('h2', null, title), h('p', { class: 'muted' }, r.world.code + ', ' + r.world.region + ', menace ' + r.world.threat + ' sur 7')),
        h('div', { class: 'stamp' + (r.place || r.nation ? ' kept' : '') }, r.nation ? (r.nation.mode === 'allie' ? 'Allié' : 'Soumis') : r.place ? 'Ancré' : r.sursis ? 'En sursis' : 'Détruit')),
      r.base && r.base.submerged ? h('p', { class: 'note' }, r.base.withPlayer
        ? 'L’hexagone a cédé pendant que vous étiez à bord : l’Artefact vous a ramené avec la soute, sans les territoires.'
        : 'L’hexagone a cédé : l’Artefact est rentré seul avec ses défenses' + (r.base.secured ? ' et la soute (' + r.base.secured + ' élément' + (r.base.secured > 1 ? 's' : '') + ')' : '') + '.') : null,
      r.rescueMsgs && r.rescueMsgs.length ? h('div', { class: 'note' }, r.rescueMsgs.map((m) => h('p', null, m))) : null,
      h('div', { class: 'report-grid' },
        h('div', { class: 'report-gains' },
          gains.length ? gains : h('p', { class: 'muted empty-line' }, ok ? 'Rien d’autre que des ressources.' : 'Rien n’a rejoint l’Archive.')),
        h('aside', { class: 'report-side' },
          h('h4', null, 'Ressources ', value ? h('small', { class: 'muted' }, 'valeur ' + U.fmt(value)) : null),
          resEntries.length ? h('ul', { class: 'res-table' }, resEntries.map(([k, n]) => h('li', null, AN.Icons.img('res', k, 18), h('span', null, D.RESOURCES[k].name), h('b', null, '+' + n)))) : h('p', { class: 'muted' }, 'Aucune.'),
          r.levels && r.levels.length ? [h('h4', null, 'Compagnons'), h('p', { class: 'small' }, r.levels.join(', ') + '.')] : null,
          next ? h('div', { class: 'report-rank' }, h('h4', null, 'L’Archive'), h('p', { class: 'small' }, 'Rang ' + rk.def.name + ', vers ' + next.name), h('div', { class: 'bar thin' }, h('i', { style: { transform: 'scaleX(' + next.k + ')' } })), h('small', { class: 'muted' }, next.short)) : null)),
      losses.length ? h('div', { class: 'report-losses' }, h('h4', null, 'Pertes'), losses) : null,
      h('div', { class: 'actions' }, btn('Retour à l’Archive', () => UI.close(), 'primary', { autofocus: true })));
    UI.open(el, { onClose: () => { AN.HUD.refreshArchive(AN.Archive.state()); AN.Archive.showPendingRank(); } });
    if (r.levels && r.levels.length) setTimeout(() => AN.Audio.play('levelup'), 450);
  };

  /* ---------- fiche d'une créature ---------- */
  UI.creatureCard = function (entry) {
    const P = AN.Profile;
    const B = AN.Bonds;
    const prof = AN.Game.profile;
    const d = D.CREATURE[entry.species];
    const tr = D.trait(entry.species);
    const v = D.VARIANT[entry.variant] || D.VARIANT.commun;
    const home = entry.home ? prof.territories.find((t) => t.uid === entry.home) : null;
    const prod = AN.Production.creatureRate(prof, entry, home, prof.collection.filter((c) => (c.home || null) === (entry.home || null)));
    const isComp = prof.companions.includes(entry.uid);
    const nameInput = h('input', { type: 'text', value: entry.nickname || '', placeholder: d.name, maxlength: 24, 'aria-label': 'Surnom' });
    const count = (uid) => prof.collection.filter((c) => (c.home || null) === uid).length;
    const homeSelect = h('select', { 'aria-label': 'Habitat' },
      h('option', { value: '', selected: !entry.home }, 'Le Néant (autour de l’Artefact)'),
      prof.territories.map((t) => h('option', { value: t.uid, selected: t.uid === entry.home }, D.BIOME[t.biome].name + ' (' + t.world + ') · ' + count(t.uid) + '/' + (D.CAPACITY[t.quality] || 8) + (d.biomes.includes(t.biome) ? ' · habitat d’origine' : ''))));
    const save = () => {
      entry.nickname = nameInput.value.trim() || null;
      const nh = homeSelect.value || null;
      if (nh !== (entry.home || null)) entry.home = nh;
      AN.Save.write(prof);
      if (AN.Archive.state()) AN.Archive.rebuildCreatures();
    };
    const reopen = () => { save(); UI.reopenKeep(() => { UI.close(); UI.creatureCard(entry); }); };

    // Barres : niveau, loyauté, satiété
    const loy = D.loyaltyLevel(entry.loyalty);
    const need = D.xpFor(entry.level);
    const bars = h('div', { class: 'bars' },
      h('span', null, 'Niveau ' + entry.level), h('div', { class: 'bar xp' }, h('i', { style: { transform: 'scaleX(' + (entry.level >= D.MAX_LEVEL ? 1 : U.clamp(entry.xp / need, 0, 1)) + ')' } })), h('small', null, entry.level >= D.MAX_LEVEL ? 'max' : Math.floor(entry.xp) + ' / ' + need),
      h('span', null, 'Loyauté'), h('div', { class: 'bar loy' + (entry.loyalty < 50 ? ' low' : '') }, h('i', { style: { transform: 'scaleX(' + entry.loyalty / 100 + ')' } })), h('small', { title: loy.desc }, loy.name),
      tr.diet ? [h('span', null, 'Satiété'), h('div', { class: 'bar fed' }, h('i', { style: { transform: 'scaleX(' + U.clamp(entry.fed, 0, 1) + ')' } })), h('small', null, entry.fed < 0.3 ? 'affamé' : 'nourri')] : null);

    const mood = [];
    const neigh = prof.collection.filter((c) => (c.home || null) === (entry.home || null));
    if (B.fears(entry, neigh)) mood.push('Inquiète : un prédateur partage son territoire.');
    if (!home) mood.push('Le Néant n’est pas un habitat : sa loyauté y progresse lentement.');
    else if (!d.biomes.includes(home.biome)) mood.push('Habitat étranger : elle y est mal à l’aise.');
    else mood.push('Habitat d’origine : elle s’y épanouit.');
    if (tr.diet && entry.fed < 0.3) mood.push('Affamée : il faut ' + D.RESOURCES[tr.diet.res].name + ' dans la réserve.');
    const tags = h('div', { class: 'tags' },
      tr.ability ? h('span', { class: 'tag', title: D.ABILITIES[tr.ability].desc }, h('i', { style: { background: D.ABILITIES[tr.ability].color } }), 'Capacité : ' + D.ABILITIES[tr.ability].name) : null,
      tr.keys.map((k) => h('span', { class: 'tag', title: 'Ouvre : ' + D.KEYS[k].barrier }, h('i', { style: { background: D.KEYS[k].color } }), 'Clé : ' + D.KEYS[k].name)),
      tr.mount ? h('span', { class: 'tag', title: 'Touche R près d’elle pour la chevaucher' }, h('i', { style: { background: '#ffffff' } }), 'Monture' + (tr.mount.fly ? ' volante' : '') + ' · vitesse ' + tr.mount.speed) : null,
      tr.call ? h('span', { class: 'tag', title: D.CALLS[tr.call].desc }, h('i', { style: { background: D.CALLS[tr.call].color } }), 'Appel : ' + D.CALLS[tr.call].name) : null);

    // Évolutions
    const evos = B.evolutions(prof, entry);
    const evoBox = evos.length ? h('section', null, h('h3', null, 'Évolution'), evos.map((o) => h('div', { class: 'evo' },
      h('div', null, h('b', null, o.name), h('p', { class: 'muted' }, o.desc), UI.costList(o.cost, prof), o.why.length ? h('div', { class: 'why' }, o.why.join(' · ')) : null),
      btn('Faire évoluer', () => {
        if (B.evolve(prof, entry, o)) {
          AN.Audio.play('rank');
          AN.HUD.toast(P.displayName(entry) + ' a évolué.', 4);
          if (AN.Archive.state()) AN.Archive.celebrate(entry.uid);
          reopen();
        }
      }, o.ok ? 'primary small' : 'small', { disabled: !o.ok })))) : null;

    // Faits
    const origin = entry.born ? 'Née dans l’Archive' + (entry.gen ? ', génération ' + entry.gen : '') + (entry.parents ? ' (parents : ' + entry.parents.map((u) => { const pc = P.findCreature(prof, u); return pc ? P.displayName(pc) : 'disparu'; }).join(' et ') + ')' : '') : 'Monde ' + entry.world;
    const state = entry.lost
      ? 'Perdue dans ' + entry.lost.code + ' : mission de sauvetage disponible encore ' + Math.max(0, entry.lost.until - prof.expeditions) + ' expédition(s)'
      : entry.injured ? 'Blessée : repos pendant ' + entry.injured + ' expédition' + (entry.injured > 1 ? 's' : '') : 'En forme';
    const facts = h('dl', { class: 'facts' },
      h('dt', null, 'Origine'), h('dd', null, origin),
      h('dt', null, 'Biomes'), h('dd', null, d.biomes.map((b) => D.BIOME[b].name).join(', ')),
      h('dt', null, 'Rôles'), h('dd', null, d.roles.length ? d.roles.map((r) => D.ROLES[r].name).join(', ') : 'Élément de l’Archive'),
      d.produces ? h('dt', null, 'Production') : null,
      d.produces ? h('dd', null, D.RESOURCES[d.produces.res].name + ' : ' + prod.rate.toFixed(2).replace('.', ',') + ' par minute' + (prod.why.length ? ' (' + prod.why.join(', ') + ')' : '')) : null,
      tr.diet ? h('dt', null, 'Régime') : null,
      tr.diet ? h('dd', null, tr.diet.n + ' ' + D.RESOURCES[tr.diet.res].name + ' toutes les ' + tr.diet.period + ' minutes, pris dans la réserve') : null,
      h('dt', null, 'Reproduction'), h('dd', null, tr.breed > 0 ? 'Avec une autre ' + d.name + ' de niveau 2 au moins, fidèle et nourrie, dans un territoire qui n’est pas plein. Plus rapide dans son habitat d’origine.' : 'Ne se reproduit pas.'),
      d.power ? h('dt', null, 'Pouvoir') : null, d.power ? h('dd', null, d.power.name + ' : ' + d.power.desc) : null,
      d.global ? h('dt', null, 'Influence') : null, d.global ? h('dd', null, d.global.name + ' : ' + d.global.desc) : null,
      h('dt', null, 'Exploits'), h('dd', null, (entry.outings || 0) + ' expédition(s), ' + (entry.kills || 0) + ' créature(s) vaincue(s)'),
      h('dt', null, 'État'), h('dd', { class: entry.injured || entry.lost ? 'warn' : '' }, state));

    const canComp = P.canBeCompanion(entry) && entry.loyalty >= 20;
    const compBtn = btn(isComp ? 'Retirer des compagnons' : 'Emmener en expédition', () => {
      if (isComp) prof.companions = prof.companions.filter((u) => u !== entry.uid);
      else {
        if (entry.injured) { AN.HUD.toast('Cette créature est blessée et doit se reposer.'); return; }
        if (P.companionsUsed(prof) + P.linkCost(entry.species) > P.companionSlots(prof)) { AN.HUD.toast('Plus assez de liens (' + P.companionsUsed(prof) + ' / ' + P.companionSlots(prof) + '). Améliorez les Liens de l’Artefact ou retirez un compagnon.', 5); return; }
        prof.companions.push(entry.uid);
        if (AN.Base.isGuard(prof, entry.uid)) AN.Base.toggleGuard(prof, entry.uid);
      }
      reopen();
    }, isComp ? 'ghost' : 'primary');
    // garder l'hexagone (1.9)
    const isGuard = AN.Base.isGuard(prof, entry.uid);
    const guardBtn = !entry.lost && D.CREATURE[entry.species].tier < 5 ? btn(isGuard ? 'Retirer de la garde' : 'Garder l’hexagone', () => {
      const m = AN.Base.toggleGuard(prof, entry.uid);
      if (m) { AN.Audio.play('ui_err'); AN.HUD.toast(m, 4); return; }
      AN.Audio.play(isGuard ? 'ui' : 'bond');
      if (AN.Archive.state()) AN.Archive.rebuildCreatures();
      reopen();
    }, 'ghost', { title: 'Elle reste sur l’hexagone pendant les expéditions et le défend (' + AN.Base.guardCost(entry) + ' point' + (AN.Base.guardCost(entry) > 1 ? 's' : '') + ' de garde).' }) : null;
    if (!canComp && !isComp) compBtn.disabled = true;
    const callBtn = tr.call && !entry.lost ? btn(prof.call === entry.uid ? 'Appel préparé' : 'Préparer comme appel (G)', () => { prof.call = prof.call === entry.uid ? null : entry.uid; reopen(); }, prof.call === entry.uid ? 'ghost' : 'small') : null;

    const el = h('div', { class: 'panel creature-card' },
      h('header', null, h('h2', null, P.displayName(entry)), btn('Fermer', () => { save(); UI.close(); }, 'ghost')),
      h('div', { class: 'card-body' },
        h('div', null, h('div', { class: 'portrait-big' }, AN.Icons.creature(entry, 132)), entry.stage ? h('p', { class: 'muted', style: { textAlign: 'center' } }, 'Stade : ' + D.STAGES[entry.stage].name) : null),
        h('div', { class: 'card-info' },
          h('p', { class: 'species' }, d.name + (v.name ? ', variante ' + v.name : '') + ' · ' + D.TIERS[d.tier].name),
          h('p', null, d.desc),
          bars, h('p', { class: 'muted' }, mood.join(' ')), tags, facts,
          h('label', { class: 'field' }, h('span', null, 'Surnom'), nameInput),
          h('label', { class: 'field' }, h('span', null, 'Habitat'), homeSelect),
          P.isReduced(entry.species) && !entry.lost ? h('p', { class: 'muted' }, 'Trop grande pour une expédition telle quelle : l’Artefact la réduit pour qu’elle vous accompagne (' + P.linkCost(entry.species) + ' liens). Elle peut aussi vous porter.' + (tr.call ? ' Restée dans l’Archive, ou à vos côtés, elle peut lancer son appel une fois par expédition.' : '')) : d.tier >= 2 ? h('p', { class: 'muted' }, 'Un gardien occupe deux liens.') : null,
          entry.loyalty < 20 ? h('p', { class: 'warn' }, 'Rebelle : elle refuse de vous suivre. Logez-la dans son habitat d’origine et nourrissez-la pour regagner sa confiance.') : null,
          evoBox)),
      h('div', { class: 'actions' },
        btn('Relâcher', () => UI.confirm('Relâcher ' + P.displayName(entry) + ' dans le Néant ? Elle disparaîtra définitivement.', () => {
          prof.collection = prof.collection.filter((c) => c.uid !== entry.uid);
          prof.companions = prof.companions.filter((u) => u !== entry.uid);
          if (prof.call === entry.uid) prof.call = null;
          AN.Save.write(prof);
          UI.closeAll();
          if (AN.Archive.state()) AN.Archive.rebuildCreatures();
        }, 'Relâcher'), 'danger ghost'),
        callBtn,
        guardBtn,
        AN.Archive.state() && !entry.lost && D.CREATURE[entry.species].tier < 5 ? btn(AN.Archive.state().follow === entry.uid ? 'Ne plus me suivre' : 'Me suivre dans l’Archive', () => { AN.Archive.setFollower(AN.Archive.state().follow === entry.uid ? null : entry.uid); reopen(); }, 'ghost') : null,
        P.canBeCompanion(entry) ? compBtn : null));
    UI.open(el, { onClose: save });
  };
})();
