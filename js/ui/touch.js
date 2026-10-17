/* Commandes tactiles (1.6) : deux sticks virtuels et des boutons, posés
   par-dessus le jeu sur téléphone et tablette.
   - Expédition : stick gauche se déplacer ; stick droit viser et tirer
     (le tir part dès qu'on pousse le stick) ; boutons Esquive, Frappe,
     Capture, Agir, Capacité, Appel, Monture ; en haut Pause.
     Les consommables se touchent directement dans leur barre, le sac en
     touchant son encart ; le retour d'urgence est dans la pause.
   - Archive : stick gauche ; Agir, Monture, Agencer, Collection, zoom, Pause.
   - Agencement : on touche un territoire puis sa place, on glisse pour déplacer
     la vue ; boutons Tourner et zoom (le panneau d'agencement fait le reste).
   Chaque bouton presse la même touche logique que le clavier : le jeu n'a
   pas de code propre au tactile. */
(function () {
  'use strict';
  const AN = window.AN;
  const I = AN.Input;
  const U = AN.Util;
  const h = AN.h;

  const T = (AN.Touch = { on: false, sticks: {}, root: null, mode: null });
  T.LABELS = { KeyE: '« Agir »', Space: '« Esquive »', KeyF: '« Capture »', KeyQ: '« Capacité »', KeyG: '« Appel »', KeyR: '« Monture »', Tab: '« Sac »', KeyX: '« Urgence »', KeyV: '« Agencer »', Escape: '« Pause »', Digit1: 'la case 1', Digit2: 'la case 2', Digit3: 'la case 3', Digit4: 'la case 4', Mouse0: 'stick droit', Mouse2: '« Frappe »' };

  const prefs = () => (AN.Prefs ? AN.Prefs.data.touch : { mode: 'auto', size: 1, left: false });
  const coarse = () => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };

  /** Faut-il afficher les commandes ? */
  T.wanted = function () {
    const m = prefs().mode;
    if (m === 'on') return true;
    if (m === 'off') return false;
    return T.seenTouch || (coarse() && !T.seenMouse);
  };

  /* ---------- boutons ---------- */
  function button(id, label, code, opts = {}) {
    const el = h('button', { type: 'button', class: 'tbtn tb-' + id + (opts.small ? ' small' : ''), 'aria-label': opts.aria || label, 'data-id': id }, h('span', null, label));
    const press = (e) => {
      e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (er) { /* pointeur synthétique */ }
      el.classList.add('down');
      T.seenTouch = true;
      I.lastDevice = 'tactile';
      if (opts.mouse != null) I.mousePress(opts.mouse);
      else if (opts.wheel) I.wheel += opts.wheel;
      else I.press(code);
      if (opts.aim && AN.X && AN.Pad) { const t = AN.Pad.assist(opts.aim); if (t) { I.aimDir = t; I.virtualCursor(); } }
      if (navigator.vibrate && opts.buzz) navigator.vibrate(12);
    };
    const release = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (!el.classList.contains('down')) return;
      el.classList.remove('down');
      if (opts.mouse != null) I.mouseRelease(opts.mouse);
      else if (!opts.wheel) I.release(code);
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    return el;
  }

  /* ---------- sticks : ils apparaissent là où le pouce se pose ---------- */
  function stick(side) {
    const zone = h('div', { class: 'tzone tz-' + side });
    const base = h('div', { class: 'tstick' }, h('i', { class: 'knob' }));
    zone.appendChild(base);
    const st = (T.sticks[side] = { zone, base, id: null, ox: 0, oy: 0, x: 0, y: 0, active: false });
    const R = () => 56 * (prefs().size || 1);
    const move = (e) => {
      const dx = e.clientX - st.ox, dy = e.clientY - st.oy;
      const l = Math.hypot(dx, dy), r = R();
      const k = l > r ? r / l : 1;
      st.x = (dx * k) / r; st.y = (dy * k) / r;
      base.firstChild.style.transform = 'translate(' + dx * k + 'px,' + dy * k + 'px)';
    };
    zone.addEventListener('pointerdown', (e) => {
      if (st.id != null) return;
      e.preventDefault();
      T.seenTouch = true;
      I.lastDevice = 'tactile';
      st.id = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (er) { /* pointeur synthétique */ }
      const zr = zone.getBoundingClientRect();
      st.ox = e.clientX; st.oy = e.clientY;
      base.style.left = (e.clientX - zr.left) + 'px';
      base.style.top = (e.clientY - zr.top) + 'px';
      base.classList.add('on');
      st.active = true;
      move(e);
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === st.id) { e.preventDefault(); move(e); } });
    const end = (e) => {
      if (e.pointerId !== st.id) return;
      st.id = null; st.active = false; st.x = st.y = 0;
      base.classList.remove('on');
      base.firstChild.style.transform = '';
      base.style.left = base.style.top = ''; // retour à la position de repos
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    return zone;
  }

  T.build = function () {
    if (T.root) return;
    T.root = h('div', { id: 'touch', class: 'touch', hidden: true },
      stick('left'), stick('right'),
      h('div', { class: 'tgroup tg-exp' },
        button('dash', 'Esquive', 'Space', { buzz: true }),
        button('melee', 'Frappe', null, { mouse: 2, aim: 'melee' }),
        button('capture', 'Capture', 'KeyF', { aim: 'capture' }),
        button('act', 'Agir', 'KeyE', { buzz: true }),
        button('ability', 'Capacité', 'KeyQ', { small: true }),
        button('call', 'Appel', 'KeyG', { small: true }),
        button('mount', 'Monture', 'KeyR', { small: true })),
      h('div', { class: 'tgroup tg-top' },
        button('pause', '❚❚', 'Escape', { small: true, aria: 'Pause' })),
      h('div', { class: 'tgroup tg-arc' },
        button('act2', 'Agir', 'KeyE', { buzz: true }),
        button('mount2', 'Monture', 'KeyR', { small: true }),
        button('map', 'Agencer', 'KeyV', { small: true }),
        button('coll', 'Collection', 'Tab', { small: true }),
        button('zout', '−', null, { wheel: 2, small: true, aria: 'Dézoomer' }),
        button('zin', '+', null, { wheel: -2, small: true, aria: 'Zoomer' })),
      h('div', { class: 'tgroup tg-map' },
        button('rot', 'Tourner', 'KeyR'),
        button('mzout', '−', null, { wheel: 2, small: true, aria: 'Dézoomer' }),
        button('mzin', '+', null, { wheel: -2, small: true, aria: 'Zoomer' })));
    document.body.appendChild(T.root);
    // les consommables se touchent directement
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { T.seenTouch = true; I.lastDevice = 'tactile'; }
      else if (e.pointerType === 'mouse') T.seenMouse = true;
      if (!T.on) return;
      // toucher le sac ouvre le sac et la soute
      if (T.mode === 'exp' && e.target.closest && e.target.closest('.hud-loot')) { e.preventDefault(); I.press('Tab'); setTimeout(() => I.release('Tab'), 60); return; }
      const slot = e.target.closest && e.target.closest('.hud-cons .slot');
      if (slot) {
        const i = [...slot.parentElement.children].indexOf(slot);
        if (i >= 0 && i < 4) { e.preventDefault(); I.press('Digit' + (i + 1)); setTimeout(() => I.release('Digit' + (i + 1)), 60); }
      }
    }, true);
  };

  /** À chaque image : visibilité, sticks → entrées. */
  T.update = function () {
    if (!T.root) T.build();
    const want = T.wanted();
    const G = AN.Game;
    const scene = G.scene && G.scene.name;
    const A = AN.Archive && AN.Archive.state ? AN.Archive.state() : null;
    let mode = null;
    if (want && !AN.UI.isOpen() && !G.fadeDir) {
      if (scene === 'expedition' && AN.X && !AN.X.ending) mode = 'exp';
      else if (scene === 'archive' && A) mode = A.mapMode ? 'map' : 'arc';
    }
    if (mode !== T.mode) {
      T.mode = mode;
      T.root.hidden = !mode;
      T.root.className = 'touch' + (mode ? ' m-' + mode : '') + (prefs().left ? ' lefty' : '');
      if (!mode) T.releaseAll();
    }
    T.on = want;
    document.body.classList.toggle('touch-on', !!want);
    document.documentElement.style.setProperty('--tsize', String(prefs().size || 1));
    if (!mode) return;
    const L = T.sticks.left, R = T.sticks.right;
    // déplacement
    if (L.active) I.vAxis = { x: L.x, y: L.y };
    else if (I.lastDevice === 'tactile') I.vAxis = null;
    // visée et tir
    if (mode === 'exp' || mode === 'arc') {
      if (R.active && Math.hypot(R.x, R.y) > 0.25) {
        const l = Math.hypot(R.x, R.y);
        I.aimDir = { x: R.x / l, y: R.y / l };
        if (mode === 'exp' && l > 0.45 && !T.firing) { I.mousePress(0); T.firing = true; }
      } else if (T.firing) { I.mouseRelease(0); T.firing = false; }
      if (I.lastDevice === 'tactile') {
        if (!I.aimDir && L.active) I.aimDir = { x: L.x || 1, y: L.y };
        I.virtualCursor();
      }
    }
    // le bouton Agir s'allume quand une interaction est possible
    const prompt = AN.HUD.els && AN.HUD.els.prompt;
    const ready = !!(prompt && !prompt.hidden) || (mode === 'arc' && document.querySelector('.prompt:not([hidden])'));
    T.root.classList.toggle('can-act', !!ready);
  };

  T.releaseAll = function () {
    if (T.firing) { I.mouseRelease(0); T.firing = false; }
    T.root && T.root.querySelectorAll('.tbtn.down').forEach((b) => b.dispatchEvent(new PointerEvent('pointercancel')));
    for (const k in T.sticks) { const s = T.sticks[k]; s.id = null; s.active = false; s.x = s.y = 0; s.base.classList.remove('on'); s.base.style.left = s.base.style.top = ''; s.base.firstChild.style.transform = ''; }
    if (I.lastDevice === 'tactile') I.vAxis = null;
  };

  /* ---------- plein écran (mobile) ---------- */
  T.fullscreen = function () {
    const d = document.documentElement;
    const req = d.requestFullscreen || d.webkitRequestFullscreen;
    if (!req) return false;
    Promise.resolve(req.call(d)).then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* ignoré */ } }).catch(() => {});
    return true;
  };
})();
