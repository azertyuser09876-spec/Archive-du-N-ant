/* Caméra 2D : position, zoom, tremblement, conversions écran / monde. */
(function () {
  'use strict';
  const AN = window.AN;

  class Camera {
    constructor() {
      this.x = 0; this.y = 0; this.zoom = 1;
      this.shakeAmt = 0; this.sx = 0; this.sy = 0;
      this.W = 800; this.H = 600; this.dpr = 1;
    }
    resize(W, H, dpr) { this.W = W; this.H = H; this.dpr = dpr; }
    shake(amount) {
      if (AN.Game && AN.Game.profile && !AN.Game.profile.settings.shake) return;
      if (AN.Prefs && AN.Prefs.reduceFx()) return;
      this.shakeAmt = Math.min(24, Math.max(this.shakeAmt, amount));
    }
    update(dt) {
      if (this.shakeAmt > 0.05) {
        this.sx = (Math.random() * 2 - 1) * this.shakeAmt;
        this.sy = (Math.random() * 2 - 1) * this.shakeAmt;
        this.shakeAmt *= Math.pow(0.0015, dt);
      } else { this.sx = this.sy = 0; this.shakeAmt = 0; }
    }
    apply(ctx) {
      const z = this.zoom * this.dpr;
      ctx.setTransform(z, 0, 0, z, this.dpr * (this.W / 2 + this.sx) - this.x * z, this.dpr * (this.H / 2 + this.sy) - this.y * z);
    }
    screenToWorld(sx, sy) {
      return { x: (sx - this.W / 2) / this.zoom + this.x, y: (sy - this.H / 2) / this.zoom + this.y };
    }
    worldToScreen(wx, wy) {
      return { x: (wx - this.x) * this.zoom + this.W / 2, y: (wy - this.y) * this.zoom + this.H / 2 };
    }
    view(margin = 0) {
      const hw = this.W / 2 / this.zoom + margin, hh = this.H / 2 / this.zoom + margin;
      return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh };
    }
    visible(x, y, r) {
      // même calcul que view(r), sans créer d'objet à chaque appel (1.8.2)
      const hw = this.W / 2 / this.zoom + r, hh = this.H / 2 / this.zoom + r;
      return x >= this.x - hw && x <= this.x + hw && y >= this.y - hh && y <= this.y + hh;
    }
  }
  AN.Camera = Camera;
})();
