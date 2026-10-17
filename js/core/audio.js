/* Sons synthétisés en direct avec la Web Audio API : aucun fichier audio.
   1.8 : sons placés dans l'espace (gauche, droite, distance à la caméra),
   tirs propres à chaque arme, cris de créatures selon leur forme et leur
   taille, sons d'interface plus variés. La musique est dans music.js. */
(function () {
  'use strict';
  const AN = window.AN;

  const A = (AN.Audio = {
    ctx: null,
    master: null,
    sfxBus: null,
    ambBus: null,
    noiseBuf: null,
    volume: 0.7,
    ambience: 0.5,
    music: 0.55,
    muted: false,
    out: null, // sortie du son en cours (spatialisé) ; à défaut, sfxBus
    listener: null, // { x, y, zoom, W, H } : la caméra, mise à jour à chaque image
    last: Object.create(null),
    loops: new Set(),
  });

  A.ensure = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      A.ctx = new Ctx();
      A.master = A.ctx.createGain();
      A.master.connect(A.ctx.destination);
      A.sfxBus = A.ctx.createGain();
      A.sfxBus.connect(A.master);
      A.ambBus = A.ctx.createGain();
      A.ambBus.connect(A.master);
      const len = A.ctx.sampleRate * 1.5;
      A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const d = A.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.applyVolume();
      return true;
    } catch (e) {
      A.ctx = null;
      return false;
    }
  };

  A.applyVolume = function () {
    if (!A.ctx) return;
    A.master.gain.value = A.muted ? 0 : 1;
    A.sfxBus.gain.value = A.volume * 0.55;
    A.ambBus.gain.value = A.ambience * 0.35;
    if (AN.Music) AN.Music.applyVolume();
  };
  A.configure = function (settings) {
    A.volume = settings.volume;
    A.ambience = settings.ambience;
    A.music = settings.music == null ? 0.55 : settings.music;
    A.muted = settings.mute;
    A.applyVolume();
  };

  // Débloque l'audio au premier geste de l'utilisateur.
  const unlock = () => { A.ensure(); };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });

  function env(g, t0, attack, dur, vol) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  function tone(o) {
    const c = A.ctx;
    const t0 = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.dur);
    const g = c.createGain();
    env(g, t0, o.attack || 0.005, o.dur, o.vol || 0.2);
    let node = osc;
    if (o.lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(o.bus || A.out || A.sfxBus);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  function noise(o) {
    const c = A.ctx;
    const t0 = c.currentTime + (o.delay || 0);
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = o.ftype || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.dur);
    f.Q.value = o.q || 1;
    const g = c.createGain();
    env(g, t0, o.attack || 0.004, o.dur, o.vol || 0.2);
    src.connect(f);
    f.connect(g);
    g.connect(o.bus || A.out || A.sfxBus);
    src.start(t0, Math.random());
    src.stop(t0 + o.dur + 0.05);
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  /** Tirs : chaque arme a sa signature (onde, hauteur, bruit, écho électrique…). */
  const SHOTS = {
    eclat: { type: 'square', f: 900, f2: 320, dur: 0.07, vol: 0.06, lp: 2600 },
    dispersion: { type: 'sawtooth', f: 420, f2: 160, dur: 0.12, vol: 0.07, lp: 1600, noise: { f: 1200, dur: 0.12, vol: 0.1 } },
    aiguilleur: { type: 'square', f: 1600, f2: 900, dur: 0.035, vol: 0.035, lp: 4000 },
    arc_voltaique: { type: 'sawtooth', f: 1200, f2: 180, dur: 0.16, vol: 0.05, lp: 3500, noise: { f: 3500, dur: 0.14, vol: 0.06, q: 0.5 }, zap: true },
    lance_ambre: { type: 'triangle', f: 520, f2: 240, dur: 0.14, vol: 0.08, noise: { f: 700, dur: 0.1, vol: 0.05 } },
    canon_vide: { type: 'sine', f: 140, f2: 40, dur: 0.4, vol: 0.16, noise: { f: 300, f2: 80, dur: 0.35, vol: 0.12, type: 'lowpass' } },
    lance_plasma: { type: 'sawtooth', f: 700, f2: 1400, dur: 0.1, vol: 0.05, lp: 3000, noise: { f: 2400, dur: 0.1, vol: 0.05 } },
    canon_ether: { type: 'sine', f: 260, f2: 60, dur: 0.45, vol: 0.15, noise: { f: 900, f2: 200, dur: 0.4, vol: 0.09 } },
    tisse_etoiles: { type: 'sine', f: 1800, f2: 2600, dur: 0.05, vol: 0.03 },
  };
  const SWINGS = {
    lame_neant: { f: 1800, f2: 500, dur: 0.12 }, gantelet: { f: 600, f2: 200, dur: 0.1, thud: true },
    faux_cristal: { f: 2600, f2: 900, dur: 0.18, ring: 1400 }, hache_obsidienne: { f: 900, f2: 250, dur: 0.2, thud: true },
    fouet_membrane: { f: 3000, f2: 1200, dur: 0.09 }, lame_horizon: { f: 2200, f2: 400, dur: 0.22, ring: 900 },
  };

  /* ---------- voix des créatures : une famille par forme ---------- */
  const VOICE = {
    growl: ['quad', 'whale', 'turtle', 'hydra', 'frog'],
    chirp: ['bird', 'moth'],
    buzz: ['insect', 'drone'],
    gloop: ['blob', 'jelly', 'cell', 'fungus', 'plant', 'snail', 'cap'],
    grind: ['golem', 'construct', 'block', 'automaton', 'gearring', 'armor', 'stone', 'crab'],
    chime: ['shard', 'orb', 'star', 'hex', 'eye', 'comet', 'spiral', 'nebula'],
    hiss: ['serpent', 'worm', 'scorpion'],
    wail: ['wraith', 'robe', 'hood', 'sailor'],
    bloop: ['fish', 'ray'],
  };
  const VOICE_OF = {};
  for (const v in VOICE) VOICE[v].forEach((sh) => (VOICE_OF[sh] = v));
  /** kind : 'aggro' | 'hurt' | 'death' ; k : hauteur (1 = petite créature) ; big : gardien et plus */
  function cry(voiceName, kind, k, big) {
    const L = kind === 'death' ? 1.6 : kind === 'aggro' ? 1.15 : 0.6;
    const dn = kind === 'death' ? 0.6 : 1; // la mort tombe vers le grave
    const vol = (kind === 'hurt' ? 0.05 : 0.08) * (big ? 1.4 : 1);
    switch (voiceName) {
      case 'growl':
        tone({ type: 'sawtooth', f: 150 * k, f2: 90 * k * dn, dur: 0.32 * L, vol, lp: 700 * k + 200, attack: 0.03 });
        noise({ f: 420 * k, dur: 0.26 * L, vol: vol * 0.7, q: 3 });
        break;
      case 'chirp':
        tone({ type: 'sine', f: 2100 * k, f2: 3100 * k * dn, dur: 0.07 * L, vol: vol * 0.7 });
        tone({ type: 'sine', f: 2600 * k, f2: 1700 * k * dn, dur: 0.09 * L, vol: vol * 0.6, delay: 0.08 });
        break;
      case 'buzz':
        tone({ type: 'square', f: 180 * k, f2: 210 * k * dn, dur: 0.22 * L, vol: vol * 0.5, lp: 1800 });
        tone({ type: 'square', f: 186 * k, dur: 0.22 * L, vol: vol * 0.4, lp: 1500 });
        break;
      case 'gloop':
        tone({ type: 'sine', f: 320 * k, f2: 640 * k * dn, dur: 0.1 * L, vol });
        tone({ type: 'sine', f: 260 * k, f2: 520 * k * dn, dur: 0.1 * L, vol: vol * 0.8, delay: 0.09 });
        break;
      case 'grind':
        tone({ type: 'square', f: 110 * k, f2: 70 * k * dn, dur: 0.25 * L, vol: vol * 0.7, lp: 900 });
        noise({ f: 2600, dur: 0.12 * L, vol: vol * 0.8, q: 6 });
        tone({ type: 'triangle', f: 1300 * k, dur: 0.18, vol: vol * 0.3, delay: 0.04 });
        break;
      case 'chime':
        tone({ type: 'sine', f: 1300 * k, dur: 0.5 * L, vol: vol * 0.7 });
        tone({ type: 'sine', f: 1300 * k * 1.5 * dn, dur: 0.4 * L, vol: vol * 0.45, delay: 0.06 });
        break;
      case 'hiss':
        noise({ f: 5000, f2: 2600 * dn, dur: 0.35 * L, vol: vol * 1.1, ftype: 'highpass', q: 0.6 });
        break;
      case 'wail':
        tone({ type: 'sine', f: 520 * k, f2: 380 * k * dn, dur: 0.6 * L, vol: vol * 0.8, attack: 0.08 });
        tone({ type: 'sine', f: 528 * k, f2: 360 * k * dn, dur: 0.6 * L, vol: vol * 0.5, attack: 0.1 });
        break;
      case 'bloop':
        tone({ type: 'sine', f: 240 * k, f2: 120 * k * dn, dur: 0.18 * L, vol });
        noise({ f: 600 * k, f2: 300, dur: 0.2 * L, vol: vol * 0.5, ftype: 'lowpass' });
        break;
      default:
        tone({ type: 'triangle', f: 420 * k, f2: 280 * k * dn, dur: 0.2 * L, vol });
    }
    if (big) tone({ type: 'sawtooth', f: 70 * k, f2: 40 * k, dur: 0.6 * L, vol: vol * 0.9, lp: 300, attack: 0.05 });
  }

  const SFX = {
    shoot: (p) => {
      const W = SHOTS[p.weapon] || SHOTS.eclat;
      const k = p.pitch || 1;
      tone({ type: W.type, f: W.f * k, f2: W.f2 * k, dur: W.dur, vol: W.vol, lp: W.lp });
      if (W.noise) noise({ f: W.noise.f * k, f2: W.noise.f2, dur: W.noise.dur, vol: W.noise.vol, q: W.noise.q || 1, ftype: W.noise.type });
      if (W.zap) tone({ type: 'square', f: 2400 * k, f2: 600, dur: 0.06, vol: 0.02, delay: 0.03 });
    },
    shoot_heavy: () => { tone({ type: 'sawtooth', f: 180, f2: 50, dur: 0.25, vol: 0.12, lp: 900 }); noise({ f: 400, dur: 0.2, vol: 0.12 }); },
    enemy_shoot: (p) => tone({ type: 'triangle', f: 520 * (p.pitch || rnd(0.9, 1.1)), f2: 260, dur: 0.09, vol: 0.05 }),
    melee: (p) => {
      const S = SWINGS[p.weapon] || SWINGS.lame_neant;
      noise({ f: S.f * rnd(0.92, 1.08), f2: S.f2, dur: S.dur, vol: 0.14, q: 0.8 });
      if (S.thud) tone({ type: 'sine', f: 140, f2: 60, dur: 0.12, vol: 0.08 });
      if (S.ring) tone({ type: 'sine', f: S.ring, dur: 0.3, vol: 0.03, delay: 0.04 });
    },
    // impact : plus grave et plus fort quand le coup est lourd ; cristallin sur un gardien
    hit: (p) => {
      const heavy = Math.min(1, (p.dmg || 8) / 50);
      noise({ f: 1400 - heavy * 700, dur: 0.05 + heavy * 0.06, vol: 0.1 + heavy * 0.08, q: 2 });
      tone({ type: 'square', f: 200 - heavy * 80, f2: 90 - heavy * 40, dur: 0.06 + heavy * 0.05, vol: 0.05 + heavy * 0.04 });
      if (p.boss) tone({ type: 'triangle', f: 900, f2: 700, dur: 0.12, vol: 0.03 });
    },
    hurt: () => { tone({ type: 'sawtooth', f: 260, f2: 110, dur: 0.18, vol: 0.12, lp: 1200 }); noise({ f: 600, dur: 0.12, vol: 0.1 }); },
    death: () => { tone({ type: 'triangle', f: 420, f2: 70, dur: 0.35, vol: 0.12 }); noise({ f: 900, f2: 200, dur: 0.3, vol: 0.08 }); },
    cry: (p) => cry(p.voice, p.kind, p.k || 1, p.big),
    dash: (p) => noise({ f: 700 * (p.pitch || 1), f2: 2400 * (p.pitch || 1), dur: 0.16, vol: 0.09, q: 0.6, ftype: 'highpass' }),
    harvest: () => { const k = rnd(0.94, 1.06); tone({ type: 'triangle', f: 660 * k, dur: 0.06, vol: 0.06 }); tone({ type: 'triangle', f: 990 * k, dur: 0.08, vol: 0.05, delay: 0.05 }); },
    pickup: (p) => tone({ type: 'sine', f: 880 * (p.pitch || 1), f2: 1320 * (p.pitch || 1), dur: 0.08, vol: 0.06 }),
    capture_ok: () => [523, 659, 784, 1046].forEach((f, i) => { tone({ type: 'triangle', f, dur: 0.22, vol: 0.09, delay: i * 0.07 }); tone({ type: 'sine', f: f * 2, dur: 0.3, vol: 0.025, delay: i * 0.07 + 0.02 }); }),
    capture_fail: () => tone({ type: 'square', f: 220, f2: 110, dur: 0.25, vol: 0.07, lp: 800 }),
    weak: () => tone({ type: 'sine', f: 1200, f2: 600, dur: 0.15, vol: 0.06 }),
    boss_roar: (p) => { const k = p.pitch || 1; tone({ type: 'sawtooth', f: 90 * k, f2: 40 * k, dur: 1.1, vol: 0.2, lp: 500, attack: 0.08 }); noise({ f: 300 * k, f2: 120, dur: 1.0, vol: 0.14, attack: 0.1 }); tone({ type: 'square', f: 45 * k, f2: 30, dur: 1.2, vol: 0.06, lp: 200, attack: 0.1 }); },
    telegraph: () => tone({ type: 'sine', f: 300, f2: 600, dur: 0.3, vol: 0.04 }),
    explosion: (p) => { const k = p.pitch || 1; noise({ f: 300 * k, f2: 60, dur: 0.5, vol: 0.2, q: 0.5, ftype: 'lowpass' }); tone({ type: 'sine', f: 120 * k, f2: 30, dur: 0.4, vol: 0.15 }); noise({ f: 2400, f2: 600, dur: 0.25, vol: 0.05, delay: 0.05 }); },
    portal: (p) => { const k = p.pitch || 1; tone({ type: 'sine', f: 220 * k, f2: 880 * k, dur: 1.2, vol: 0.1, attack: 0.3 }); tone({ type: 'sine', f: 330 * k, f2: 1320 * k, dur: 1.2, vol: 0.06, attack: 0.3 }); noise({ f: 800, f2: 4000, dur: 1.1, vol: 0.03, attack: 0.4 }); },
    shatter: () => { noise({ f: 3000, f2: 800, dur: 0.6, vol: 0.12, q: 0.7 }); tone({ type: 'triangle', f: 1800, f2: 300, dur: 0.5, vol: 0.05 }); for (let i = 0; i < 4; i++) tone({ type: 'sine', f: rnd(1800, 4200), dur: 0.12, vol: 0.02, delay: rnd(0.02, 0.3) }); },
    lightning: () => { noise({ f: 2500, f2: 200, dur: 0.6, vol: 0.18, q: 0.4 }); tone({ type: 'sawtooth', f: 80, f2: 30, dur: 0.5, vol: 0.1, lp: 400 }); },
    // interface
    ui: () => tone({ type: 'sine', f: 740 * rnd(0.98, 1.02), dur: 0.05, vol: 0.05 }),
    tab: () => { noise({ f: 2600, dur: 0.035, vol: 0.05, q: 1.5 }); tone({ type: 'sine', f: 520, dur: 0.04, vol: 0.03 }); },
    ui_ok: () => { tone({ type: 'sine', f: 660, dur: 0.07, vol: 0.06 }); tone({ type: 'sine', f: 990, dur: 0.1, vol: 0.06, delay: 0.06 }); },
    ui_err: () => tone({ type: 'square', f: 180, dur: 0.12, vol: 0.05, lp: 700 }),
    equip: () => { noise({ f: 3200, dur: 0.05, vol: 0.06, q: 4 }); tone({ type: 'triangle', f: 1400, f2: 1100, dur: 0.12, vol: 0.03, delay: 0.02 }); },
    bond: () => { tone({ type: 'sine', f: 440, f2: 660, dur: 0.2, vol: 0.05 }); tone({ type: 'sine', f: 660, f2: 880, dur: 0.25, vol: 0.04, delay: 0.08 }); },
    craft: () => { noise({ f: 2200, dur: 0.06, vol: 0.08, q: 5 }); [392, 523, 659].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.15, vol: 0.07, delay: 0.05 + i * 0.05 })); },
    build: () => { [0, 0.12, 0.24].forEach((d) => { tone({ type: 'sine', f: 150, f2: 80, dur: 0.1, vol: 0.09, delay: d }); noise({ f: 900, dur: 0.06, vol: 0.05, delay: d }); }); tone({ type: 'triangle', f: 784, dur: 0.4, vol: 0.05, delay: 0.36 }); },
    upgrade: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ type: 'sine', f, dur: 0.5, vol: 0.05, delay: i * 0.06, attack: 0.02 })); noise({ f: 1500, f2: 6000, dur: 0.5, vol: 0.03 }); },
    scan: () => { tone({ type: 'sine', f: 600, f2: 2400, dur: 0.5, vol: 0.04 }); tone({ type: 'sine', f: 2400, dur: 0.06, vol: 0.03, delay: 0.52 }); tone({ type: 'sine', f: 2400, dur: 0.06, vol: 0.02, delay: 0.66 }); },
    appear: () => { tone({ type: 'sine', f: 196, f2: 392, dur: 1.4, vol: 0.12, attack: 0.4 }); tone({ type: 'sine', f: 294, f2: 588, dur: 1.6, vol: 0.08, attack: 0.5 }); },
    rank: () => [262, 330, 392, 523, 659].forEach((f, i) => tone({ type: 'sine', f, dur: 0.8, vol: 0.06, delay: i * 0.12, attack: 0.05 })),
    levelup: () => [659, 784, 988].forEach((f, i) => tone({ type: 'triangle', f, dur: 0.18, vol: 0.05, delay: i * 0.06 })),
    // fin d'expédition
    whoosh: (p) => noise({ f: 300 * (p.pitch || 1), f2: 3000 * (p.pitch || 1), dur: p.dur || 0.7, vol: 0.08, q: 0.8, attack: 0.25 }),
    land: (p) => { const k = p.pitch || 1; tone({ type: 'sine', f: 660 * k, dur: 0.5, vol: 0.05 }); tone({ type: 'sine', f: 990 * k, dur: 0.4, vol: 0.03, delay: 0.03 }); noise({ f: 1200, dur: 0.05, vol: 0.04, q: 3 }); },
    boom: () => { noise({ f: 200, f2: 40, dur: 1.6, vol: 0.24, q: 0.4, ftype: 'lowpass', attack: 0.01 }); tone({ type: 'sine', f: 70, f2: 25, dur: 1.4, vol: 0.2 }); noise({ f: 4000, f2: 500, dur: 0.8, vol: 0.05 }); },
    rumble_hit: () => { noise({ f: 120, f2: 60, dur: 0.9, vol: 0.12, ftype: 'lowpass' }); tone({ type: 'sine', f: 55, dur: 0.8, vol: 0.08 }); },
  };

  /**
   * Joue un son. p.at = { x, y } (pixels du monde) : le son est placé dans
   * l'espace (gauche/droite) et s'éloigne avec la distance à la caméra.
   */
  A.play = function (name, p = {}) {
    if (!A.ctx || A.muted || !SFX[name]) return;
    const now = A.ctx.currentTime;
    const gap = p.gap != null ? p.gap : 0.035;
    const lk = p.key ? name + ':' + p.key : name;
    if (A.last[lk] && now - A.last[lk] < gap) return;
    A.last[lk] = now;
    let chain = null;
    if (p.at && A.listener) {
      const L = A.listener;
      const dx = (p.at.x - L.x) * L.zoom, dy = (p.at.y - L.y) * L.zoom;
      const d = Math.hypot(dx, dy);
      const far = Math.max(0, d - Math.max(L.W, L.H) * 0.55);
      const g = 1 / (1 + far / 380);
      if (g < 0.06) return; // trop loin pour être entendu
      try {
        chain = A.ctx.createGain();
        chain.gain.value = g;
        if (A.ctx.createStereoPanner) {
          const pan = A.ctx.createStereoPanner();
          pan.pan.value = Math.max(-1, Math.min(1, dx / (L.W * 0.5))) * 0.8;
          chain.connect(pan); pan.connect(A.sfxBus);
        } else chain.connect(A.sfxBus);
        setTimeout(() => { try { chain.disconnect(); } catch (e) { /* déjà libéré */ } }, 3000);
      } catch (e) { chain = null; }
    }
    A.out = chain;
    try { SFX[name](p); } catch (e) { /* ignoré */ }
    A.out = null;
  };

  /** Cri d'une créature (forme et taille), placé là où elle se trouve. */
  A.cry = function (e, kind) {
    if (!e || !e.def || !A.ctx) return;
    const shape = e.def.art && e.def.art.shape;
    const voice = VOICE_OF[shape] || 'growl';
    const k = Math.max(0.3, Math.min(1.7, 13 / Math.max(6, e.r || 12))) * ((e.hueSeed || 0) % 7 * 0.025 + 0.92);
    A.play('cry', { voice, kind, k, big: (e.def.tier || 0) >= 2, at: { x: e.x, y: e.y }, key: (e.uid || e.def.id) + kind, gap: kind === 'hurt' ? 0.45 : 0.25 });
  };

  /** Boucle continue (rayon de capture, grondement, bourdon de l'Archive). */
  A.loop = function (kind, opts) {
    if (!A.ensure()) return { set() {}, stop() {} };
    const c = A.ctx;
    const g = c.createGain();
    g.gain.value = 0.0001;
    const nodes = [];
    let handle;
    if (kind === 'beam') {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 220;
      const lfo = c.createOscillator(); lfo.frequency.value = 9;
      const lg = c.createGain(); lg.gain.value = 18;
      lfo.connect(lg); lg.connect(o.frequency);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      o.connect(f); f.connect(g); g.connect(A.sfxBus);
      o.start(); lfo.start(); nodes.push(o, lfo);
      g.gain.setTargetAtTime(0.05, c.currentTime, 0.05);
      handle = { set(p) { o.frequency.setTargetAtTime(220 + p * 500, c.currentTime, 0.05); f.frequency.setTargetAtTime(700 + p * 1800, c.currentTime, 0.05); } };
    } else if (kind === 'rumble') {
      const src = c.createBufferSource(); src.buffer = A.noiseBuf; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 140;
      src.connect(f); f.connect(g); g.connect(A.sfxBus);
      src.start(); nodes.push(src);
      handle = { set(p) { g.gain.setTargetAtTime(0.05 + p * 0.35, c.currentTime, 0.2); f.frequency.setTargetAtTime(120 + p * 260, c.currentTime, 0.2); } };
    } else {
      // bourdon : accord doux et lent
      const r0 = opts && opts.root;
      const freqs = kind === 'drone_world' ? (r0 ? [r0, r0 * 1.5, r0 * 2.25] : [73.4, 110, 164.8]) : [65.4, 98, 130.8, 196];
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      freqs.forEach((fr, i) => {
        const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = fr;
        const lfo = c.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03;
        const lg = c.createGain(); lg.gain.value = fr * 0.004;
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(f); o.start(); lfo.start(); nodes.push(o, lfo);
      });
      f.connect(g); g.connect(A.ambBus);
      g.gain.setTargetAtTime(0.35, c.currentTime, 2.5);
      handle = { set(p) { f.frequency.setTargetAtTime(300 + p * 900, c.currentTime, 0.5); } };
    }
    handle.stop = function () {
      try {
        g.gain.setTargetAtTime(0.0001, c.currentTime, 0.15);
        setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch (e) { /* déjà arrêté */ } }), 600);
      } catch (e) { /* ignoré */ }
      A.loops.delete(handle);
    };
    A.loops.add(handle);
    return handle;
  };
  A.stopAll = function () { [...A.loops].forEach((h) => h.stop()); };
})();
