/* Le récit (1.14) : un lieu qui raconte, l'ouverture d'un acte, la nouvelle forme
   de l'Artefact. Peu de mots, et jamais de dialogue. */
(function () {
  'use strict';
  const AN = window.AN;
  const D = AN.Data;
  const h = AN.h;
  const UI = AN.UI;

  /** Un lieu qui raconte : ce qu'on y voit, et le fragment qu'on y trouve (s'il en reste un). */
  UI.storySite = function (def, text, frag) {
    const p = AN.Game.profile;
    const el = h('div', { class: 'panel lore story-site' },
      h('div', { class: 'lore-num' }, def.name),
      h('p', { class: 'site-text' }, text),
      frag ? [h('div', { class: 'lore-num' }, 'Fragment ' + p.lore.length + ' sur ' + D.LORE.length), h('h2', null, frag.title), h('blockquote', null, frag.text)] : null,
      h('div', { class: 'actions' }, UI.btn('Fermer', () => UI.close(), 'primary', { autofocus: true })));
    UI.open(el);
  };

  /** Une ruine où il ne reste rien à lire, à cet acte. */
  UI.silence = function (text) {
    const el = h('div', { class: 'panel lore story-site' },
      h('p', { class: 'site-text' }, text),
      h('div', { class: 'actions' }, UI.btn('Fermer', () => UI.close(), 'primary', { autofocus: true })));
    UI.open(el);
  };

  /**
   * L'ouverture d'un acte, comme l'introduction : quelques lignes sur le blanc, une
   * à une, puis plus rien. done() est appelé à la fin.
   */
  UI.interlude = function (act, done) {
    const roman = ['I', 'II', 'III', 'IV'][act.n - 1];
    const lines = act.open.map((t) => h('p', null, t));
    const head = h('div', { class: 'act-head' }, h('small', null, 'Acte ' + roman), h('div', null, act.title));
    const el = h('div', { class: 'intro interlude' }, head, lines, h('button', { class: 'btn ghost skip', type: 'button', onclick: () => finish() }, 'Passer'));
    const item = UI.open(el, { dismiss: false, cls: 'intro-overlay' });
    let i = -1, timer, finished = false;
    const step = () => {
      if (i < 0) head.classList.add('in');
      else if (i < lines.length) lines[i].classList.add('in');
      i++;
      timer = setTimeout(i <= lines.length ? step : finish, i <= lines.length ? 2100 : 1800);
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      item.wrap.classList.add('out');
      setTimeout(() => { UI.close(); if (done) done(); }, 700);
    };
    AN.Audio.play('rank');
    timer = setTimeout(step, 400);
  };
})();
