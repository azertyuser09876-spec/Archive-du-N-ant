/* Entrées clavier / souris.
   Les touches sont lues par position physique (event.code) : ZQSD sur AZERTY
   et WASD sur QWERTY fonctionnent sans réglage. */
(function () {
  'use strict';
  const AN = window.AN;

  const I = (AN.Input = {
    keys: Object.create(null),
    pressed: Object.create(null),
    released: Object.create(null),
    mouse: { x: 0, y: 0, down: [false, false, false], pressed: [false, false, false], released: [false, false, false], inside: true },
    wheel: 0,
    layout: null, // Map code -> caractère quand le navigateur le permet
    blocked: false, // vrai quand un menu capture les entrées
    lastDevice: 'clavier', // 'clavier' (et souris), 'manette' ou 'tactile' : les touches affichées suivent
  });

  const PREVENT = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1']);

  /* ---------- touches reconfigurables (1.5) ----------
     Le jeu raisonne en codes « logiques » (les touches par défaut : KeyF pour
     capturer…). Une touche physique reconfigurée est traduite vers son code
     logique dès sa lecture : le reste du jeu n'a pas à le savoir. */
  I.ACTIONS = [
    { code: 'KeyW', name: 'Haut' }, { code: 'KeyS', name: 'Bas' }, { code: 'KeyA', name: 'Gauche' }, { code: 'KeyD', name: 'Droite' },
    { code: 'Space', name: 'Esquiver (ou sauter, en galaxie)' }, { code: 'KeyF', name: 'Rayon de capture (maintenir) · en agençant : forme fixe ou adaptée' },
    { code: 'KeyE', name: 'Interagir, récolter, extraire' }, { code: 'KeyQ', name: 'Capacité du compagnon · en agençant : défaire' },
    { code: 'KeyG', name: 'Appel stratégique · en agençant : ranger automatiquement' }, { code: 'KeyR', name: 'Monture · en agençant : tourner, autre forme' }, { code: 'Tab', name: 'Sac et soute, collection' },
    { code: 'KeyX', name: 'Extraction d’urgence (maintenir)' }, { code: 'KeyV', name: 'Agencer l’Archive' },
    { code: 'Digit1', name: 'Consommable 1' }, { code: 'Digit2', name: 'Consommable 2' }, { code: 'Digit3', name: 'Consommable 3' }, { code: 'Digit4', name: 'Consommable 4' },
  ];
  const binds = () => (AN.Prefs && AN.Prefs.data ? AN.Prefs.data.keys : {});
  /** Touche physique associée à un code logique. */
  I.bound = (code) => binds()[code] || code;
  /** Codes logiques déclenchés par une touche physique. */
  I.logicalOf = function (phys) {
    const b = binds();
    const out = [];
    let moved = false;
    for (const a of I.ACTIONS) {
      const k = b[a.code] || a.code;
      if (k === phys) out.push(a.code);
      if (a.code === phys && k !== phys) moved = true;
    }
    if (!out.length && !moved) out.push(phys);
    return out;
  };
  /** Change la touche d'une action ; une action qui l'utilisait déjà prend l'ancienne. */
  I.rebind = function (code, phys) {
    const b = binds();
    const old = I.bound(code);
    for (const a of I.ACTIONS) if (a.code !== code && I.bound(a.code) === phys) { if (old === a.code) delete b[a.code]; else b[a.code] = old; }
    if (phys === code) delete b[code]; else b[code] = phys;
    if (AN.Prefs) AN.Prefs.save();
    AN.Bus.emit('layout');
  };
  I.resetBinds = function () {
    if (!AN.Prefs) return;
    AN.Prefs.data.keys = {};
    AN.Prefs.save();
    AN.Bus.emit('layout');
  };
  /** Attend la prochaine touche (pour la reconfiguration) ; Échap annule. */
  I.captureNext = function (cb) { I.capturing = cb; };

  /* ---------- entrées virtuelles (tactile, manette) ---------- */
  I.vAxis = null; // { x, y } fourni par un stick
  I.press = function (code) { if (!I.keys[code]) I.pressed[code] = true; I.keys[code] = true; };
  I.release = function (code) { if (I.keys[code]) I.released[code] = true; I.keys[code] = false; };
  /** Direction de visée donnée par un stick (manette, tactile) ; null = souris. */
  I.aimDir = null;
  /** Place le curseur virtuel dans la direction visée, autour du personnage. */
  I.virtualCursor = function () {
    if (!I.aimDir || !AN.Game) return;
    const A = AN.Archive && AN.Archive.state ? AN.Archive.state() : null;
    const pl = AN.X ? AN.X.player : A ? A.player : null;
    if (!pl) return;
    const cam = AN.Game.cam;
    const s = cam.worldToScreen(pl.x, pl.y);
    const r = Math.min(cam.W, cam.H) * 0.3;
    I.mouse.x = s.x + I.aimDir.x * r;
    I.mouse.y = s.y + I.aimDir.y * r;
  };
  I.mousePress = function (b) { if (!I.mouse.down[b]) I.mouse.pressed[b] = true; I.mouse.down[b] = true; };
  I.mouseRelease = function (b) { if (I.mouse.down[b]) I.mouse.released[b] = true; I.mouse.down[b] = false; };

  function isTyping(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  I.init = function (canvas) {
    window.addEventListener('keydown', (e) => {
      if (I.capturing) {
        // reconfiguration : cette touche n'agit pas sur le jeu
        e.preventDefault(); e.stopImmediatePropagation();
        const cb = I.capturing; I.capturing = null;
        cb(e.code === 'Escape' ? null : e.code);
        return;
      }
      if (isTyping(e.target)) return;
      // la touche qui ferme une fenêtre ne doit pas la rouvrir aussitôt
      if (AN.UI && AN.UI.isOpen && AN.UI.isOpen() && (e.code === 'Escape' || e.code === 'Tab')) return;
      if (PREVENT.has(e.code)) e.preventDefault();
      I.lastDevice = 'clavier';
      for (const code of I.logicalOf(e.code)) {
        if (!I.keys[code]) I.pressed[code] = true;
        I.keys[code] = true;
      }
    }, true);
    window.addEventListener('keyup', (e) => {
      for (const code of I.logicalOf(e.code)) {
        I.keys[code] = false;
        I.released[code] = true;
      }
    });
    window.addEventListener('blur', () => {
      for (const k in I.keys) I.keys[k] = false;
      I.mouse.down = [false, false, false];
    });
    // Dans l'Archive, un doigt sur le canevas agit comme la souris (toucher, glisser,
    // lâcher) : les clics émulés par le navigateur ne donnent pas la position du doigt.
    const now = () => (window.performance ? performance.now() : Date.now());
    let touchId = null;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || touchId != null) return;
      if (!(AN.Game && AN.Game.scene && AN.Game.scene.name === 'archive')) return;
      touchId = e.pointerId;
      I.mouse.x = e.clientX; I.mouse.y = e.clientY;
      I.mouse.down[0] = true; I.mouse.pressed[0] = true;
      I.touchMouseT = now();
    });
    canvas.addEventListener('pointermove', (e) => { if (e.pointerId === touchId) { I.mouse.x = e.clientX; I.mouse.y = e.clientY; } });
    const touchEnd = (e) => {
      if (e.pointerId !== touchId) return;
      touchId = null;
      if (I.mouse.down[0]) I.mouse.released[0] = true;
      I.mouse.down[0] = false;
      I.touchMouseT = now();
    };
    canvas.addEventListener('pointerup', touchEnd);
    canvas.addEventListener('pointercancel', touchEnd);
    const emulated = () => touchId != null || now() - (I.touchMouseT || -1e9) < 800;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button > 2) return;
      if (emulated()) return;
      I.mouse.down[e.button] = true;
      I.mouse.pressed[e.button] = true;
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button > 2) return;
      if (emulated()) return;
      if (I.mouse.down[e.button]) I.mouse.released[e.button] = true;
      I.mouse.down[e.button] = false;
    });
    window.addEventListener('mousemove', (e) => {
      // les clics tactiles émulent aussi la souris : on ne change d'appareil que pour une vraie souris
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      I.mouse.x = e.clientX;
      I.mouse.y = e.clientY;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) { I.lastDevice = 'clavier'; I.aimDir = null; }
    });
    canvas.addEventListener('mouseleave', () => (I.mouse.inside = false));
    canvas.addEventListener('mouseenter', () => (I.mouse.inside = true));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      I.wheel += Math.sign(e.deltaY) * Math.min(3, Math.abs(e.deltaY) / 60 || 1);
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Libellés réels des touches (Chrome/Edge) pour afficher Z/Q au lieu de W/A.
    try {
      if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
        navigator.keyboard.getLayoutMap().then((map) => { I.layout = map; AN.Bus.emit('layout'); }).catch(() => {});
      }
    } catch (e) { /* ignoré */ }
  };

  I.down = (code) => !I.blocked && !!I.keys[code];
  I.hit = (code) => !I.blocked && !!I.pressed[code];
  I.up = (code) => !I.blocked && !!I.released[code];
  I.anyHit = (...codes) => codes.some((c) => I.hit(c));
  I.mouseDown = (b) => !I.blocked && I.mouse.down[b];
  I.mouseHit = (b) => !I.blocked && I.mouse.pressed[b];

  /** Vecteur de déplacement normalisé. */
  I.axis = function () {
    if (I.blocked) return { x: 0, y: 0 };
    if (I.vAxis && (Math.abs(I.vAxis.x) > 0.01 || Math.abs(I.vAxis.y) > 0.01)) {
      // stick analogique : on garde l'intensité (marche lente possible)
      const l = Math.hypot(I.vAxis.x, I.vAxis.y);
      return l > 1 ? { x: I.vAxis.x / l, y: I.vAxis.y / l } : { x: I.vAxis.x, y: I.vAxis.y };
    }
    let x = 0, y = 0;
    if (I.keys.KeyW || I.keys.ArrowUp) y -= 1;
    if (I.keys.KeyS || I.keys.ArrowDown) y += 1;
    if (I.keys.KeyA || I.keys.ArrowLeft) x -= 1;
    if (I.keys.KeyD || I.keys.ArrowRight) x += 1;
    const l = Math.hypot(x, y);
    return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  };

  /** Libellé lisible d'une touche selon la disposition du clavier. */
  I.label = function (logical) {
    // à la manette ou au doigt, on nomme le bouton à presser
    if (I.lastDevice === 'manette' && AN.Pad && AN.Pad.LABELS[logical]) return AN.Pad.LABELS[logical];
    if (I.lastDevice === 'tactile' && AN.Touch && AN.Touch.LABELS[logical]) return AN.Touch.LABELS[logical];
    if (logical === 'Mouse0') return 'clic gauche';
    if (logical === 'Mouse2') return 'clic droit';
    const code = I.bound(logical);
    if (I.layout && I.layout.get(code)) return I.layout.get(code).toUpperCase();
    const named = { Space: 'Espace', Tab: 'Tab', Escape: 'Échap', ShiftLeft: 'Maj gauche', ShiftRight: 'Maj droite', ControlLeft: 'Ctrl', ControlRight: 'Ctrl droit', AltLeft: 'Alt', Enter: 'Entrée', Backspace: 'Retour', CapsLock: 'Verr. maj', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
    if (code.startsWith('Numpad')) return 'Pavé ' + code.slice(6);
    if (named[code]) return named[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return code;
  };
  I.moveKeys = function () {
    if (I.lastDevice === 'manette' || I.lastDevice === 'tactile') return 'stick gauche';
    const b = binds();
    if (!I.layout && !b.KeyW && !b.KeyA && !b.KeyS && !b.KeyD) return 'ZQSD / WASD';
    return ['KeyW', 'KeyA', 'KeyS', 'KeyD'].map(I.label).join('');
  };

  I.endFrame = function () {
    for (const k in I.pressed) delete I.pressed[k];
    for (const k in I.released) delete I.released[k];
    I.mouse.pressed[0] = I.mouse.pressed[1] = I.mouse.pressed[2] = false;
    I.mouse.released[0] = I.mouse.released[1] = I.mouse.released[2] = false;
    I.wheel = 0;
  };
})();
