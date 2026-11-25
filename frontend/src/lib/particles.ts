/** A small canvas particle engine for the rank-up shows. No library. */

export type Kind = "sparkle" | "confetti" | "crystal" | "leaf" | "ember" | "star" | "shard" | "gold" | "firework" | "gem"
  | "streak" | "coin" | "bubble" | "petal" | "ring";

interface P { k: Kind; x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; rot: number; vr: number; tx?: number; ty?: number; a?: number }

export class Particles {
  private ps: P[] = [];
  private bolts: { pts: [number, number][]; life: number }[] = [];
  private raf = 0;
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private emitters: { kind: Kind; rate: number; until: number; colors: string[] }[] = [];
  private last = 0;
  private ringI = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get cx() { return this.w / 2; }
  get cy() { return this.h * 0.42; }

  /** A one-off burst of `n` particles. */
  burst(kind: Kind, n: number, colors: string[], at?: { x: number; y: number }) {
    for (let i = 0; i < n; i++) this.ps.push(this.make(kind, colors, at));
  }

  /** Keep emitting `rate` particles a second for `ms` milliseconds. */
  emit(kind: Kind, rate: number, ms: number, colors: string[]) {
    this.emitters.push({ kind, rate, until: performance.now() + ms, colors });
  }

  lightning() {
    const pts: [number, number][] = [];
    let x = this.cx + (Math.random() - 0.5) * this.w * 0.8, y = 0;
    while (y < this.cy) { pts.push([x, y]); x += (Math.random() - 0.5) * 60; y += 20 + Math.random() * 30; }
    pts.push([this.cx + (Math.random() - 0.5) * 40, this.cy]);
    this.bolts.push({ pts, life: 1 });
  }

  firework(colors: string[]) {
    const at = { x: this.w * (0.15 + Math.random() * 0.7), y: this.h * (0.12 + Math.random() * 0.35) };
    this.burst("firework", 70, colors, at);
  }

  private make(kind: Kind, colors: string[], at?: { x: number; y: number }): P {
    const c = colors[Math.floor(Math.random() * colors.length)];
    const r = Math.random, cx = at?.x ?? this.cx, cy = at?.y ?? this.cy;
    const base = { k: kind, life: 0, color: c, rot: r() * Math.PI, vr: (r() - 0.5) * 0.2 };
    switch (kind) {
      case "sparkle": { const a = r() * Math.PI * 2, s = 2 + r() * 7; return { ...base, x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: 50 + r() * 40, size: 2 + r() * 4 }; }
      case "firework": { const a = r() * Math.PI * 2, s = 1 + r() * 5; return { ...base, x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: 60 + r() * 40, size: 2 + r() * 2 }; }
      case "confetti": return { ...base, x: r() * this.w, y: -20, vx: (r() - 0.5) * 3, vy: 2 + r() * 3, max: 400, size: 6 + r() * 6 };
      case "gold": { const a = r() * Math.PI * 2, d = Math.max(this.w, this.h) * 0.6; return { ...base, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, vx: 0, vy: 0, a, max: 140, size: 2 + r() * 3 }; }
      case "crystal": return { ...base, x: r() * this.w, y: -10, vx: (r() - 0.5) * 0.8, vy: 1 + r() * 1.6, max: 500, size: 4 + r() * 6 };
      case "leaf": { const a = r() * Math.PI * 2; return { ...base, x: cx, y: cy, vx: 0, vy: 0, a, tx: 60 + r() * 220, max: 160, size: 5 + r() * 6 }; }
      case "ember": return { ...base, x: r() * this.w, y: this.h + 10, vx: (r() - 0.5) * 1.2, vy: -(1.5 + r() * 3), max: 260, size: 2 + r() * 3 };
      case "star": return { ...base, x: r() * this.w, y: r() * this.h, vx: 0, vy: 0, max: 200 + r() * 300, size: 0.6 + r() * 1.8 };
      case "shard": { const a = r() * Math.PI * 2, d = Math.max(this.w, this.h) * 0.7; return { ...base, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, tx: cx, ty: cy, vx: 0, vy: 0, max: 70, size: 8 + r() * 14 }; }
      case "streak": { const x = r() * this.w * 0.9, s = 9 + r() * 6; return { ...base, x, y: -20 + r() * this.h * 0.25, vx: s, vy: s * 0.45, rot: 0, vr: 0, max: 70, size: 2 }; }
      case "coin": return { ...base, x: r() * this.w, y: -20, vx: (r() - 0.5) * 2, vy: 2 + r() * 3, max: 400, size: 7 + r() * 5 };
      case "bubble": return { ...base, x: r() * this.w, y: this.h + 20, vx: 0, vy: -(1 + r() * 2), max: 500, size: 3 + r() * 9 };
      case "petal": return { ...base, x: r() * this.w, y: -20, vx: 0.6 + r() * 1.2, vy: 1 + r() * 1.5, max: 600, size: 5 + r() * 5 };
      case "ring": { const a = (this.ringI++ % 48) / 48 * Math.PI * 2, s = 7 + r() * 0.6; return { ...base, x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: 70, size: 3 + r() * 2 }; }
      case "gem": { const a = -Math.PI / 2 + (r() - 0.5) * 1.6, s = 6 + r() * 8; return { ...base, x: cx, y: this.h * 0.55, vx: Math.cos(a) * s, vy: Math.sin(a) * s, max: 120, size: 8 + r() * 8 }; }
    }
  }

  start() {
    const tick = (t: number) => {
      const dt = this.last ? Math.min(50, t - this.last) : 16;
      this.last = t;
      for (const e of this.emitters) {
        if (t > e.until) continue;
        const n = (e.rate * dt) / 1000;
        for (let i = 0; i < Math.floor(n) + (Math.random() < n % 1 ? 1 : 0); i++) this.ps.push(this.make(e.kind, e.colors));
      }
      this.emitters = this.emitters.filter((e) => t <= e.until);
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() { cancelAnimationFrame(this.raf); }

  /** Stop all running emitters (used when the show is skipped). */
  calm() { this.emitters = []; }

  private draw() {
    const g = this.ctx;
    g.clearRect(0, 0, this.w, this.h);
    for (const p of this.ps) {
      p.life++;
      const t = p.life / p.max;
      switch (p.k) {
        case "sparkle": case "firework": p.vx *= 0.96; p.vy = p.vy * 0.96 + (p.k === "firework" ? 0.05 : 0.02); p.x += p.vx; p.y += p.vy; break;
        case "confetti": p.vy += 0.03; p.x += p.vx + Math.sin(p.life / 12); p.y += p.vy; p.rot += p.vr; break;
        case "crystal": p.x += p.vx + Math.sin(p.life / 30) * 0.4; p.y += p.vy; p.rot += p.vr * 0.3; break;
        case "ember": p.x += p.vx + Math.sin(p.life / 10) * 0.6; p.y += p.vy; break;
        case "gold": { const k = 1 - t; p.a! += 0.06; const d = Math.max(this.w, this.h) * 0.6 * k; p.x = this.cx + Math.cos(p.a!) * d; p.y = this.cy + Math.sin(p.a!) * d; break; }
        case "leaf": { p.a! += 0.05; const d = p.tx! * Math.min(1, t * 2); p.x = this.cx + Math.cos(p.a!) * d; p.y = this.cy + Math.sin(p.a!) * d * 0.6; p.rot += 0.05; break; }
        case "shard": { const e = Math.min(1, t * 1.4), ease = 1 - Math.pow(1 - e, 3); p.x += (p.tx! - p.x) * 0.08 * ease + 0; p.y += (p.ty! - p.y) * 0.08 * ease; p.rot += 0.1; break; }
        case "gem": p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.rot += p.vr; break;
        case "streak": p.x += p.vx; p.y += p.vy; break;
        case "coin": p.vy += 0.06; p.x += p.vx; p.y += p.vy; p.rot += 0.12; break;
        case "bubble": p.x += Math.sin(p.life / 20 + p.size) * 0.7; p.y += p.vy; break;
        case "petal": p.x += p.vx + Math.sin(p.life / 18) * 1.2; p.y += p.vy; p.rot += 0.04; break;
        case "ring": p.vx *= 0.97; p.vy *= 0.97; p.x += p.vx; p.y += p.vy; break;
        case "star": break;
      }
      const alpha = p.k === "star" ? 0.35 + 0.65 * Math.abs(Math.sin(p.life / 25 + p.rot * 10))
        : p.k === "confetti" || p.k === "crystal" || p.k === "coin" || p.k === "petal" ? 1 : p.k === "bubble" ? 0.7 : Math.max(0, 1 - t);
      g.globalAlpha = alpha;
      g.fillStyle = p.color;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      if (p.k === "streak") {
        g.rotate(-p.rot); g.strokeStyle = p.color; g.lineWidth = 2.5; g.shadowBlur = 10; g.shadowColor = p.color;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-p.vx * 9, -p.vy * 9); g.stroke();
      } else if (p.k === "coin") { g.scale(Math.cos(p.rot), 1); g.beginPath(); g.arc(0, 0, p.size, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#8a6400"; g.lineWidth = 1.5; g.stroke(); }
      else if (p.k === "bubble") { g.strokeStyle = p.color; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, p.size, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 0.5; g.beginPath(); g.arc(-p.size / 3, -p.size / 3, p.size / 4, 0, Math.PI * 2); g.fill(); }
      else if (p.k === "petal") { g.beginPath(); g.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2); g.fill(); }
      else if (p.k === "confetti") g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else if (p.k === "crystal" || p.k === "shard" || p.k === "gem") { g.beginPath(); g.moveTo(0, -p.size); g.lineTo(p.size * 0.6, 0); g.lineTo(0, p.size); g.lineTo(-p.size * 0.6, 0); g.closePath(); g.fill(); }
      else if (p.k === "leaf") { g.beginPath(); g.ellipse(0, 0, p.size, p.size / 2.4, 0, 0, Math.PI * 2); g.fill(); }
      else { g.shadowBlur = p.k === "ember" || p.k === "gold" || p.k === "firework" ? 12 : 6; g.shadowColor = p.color; g.beginPath(); g.arc(0, 0, p.size, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
    this.ps = this.ps.filter((p) => p.life < p.max && p.y < this.h + 40 && p.y > -60);
    for (const b of this.bolts) {
      g.globalAlpha = b.life;
      g.strokeStyle = "#d9c8ff";
      g.shadowColor = "#9b6bff";
      g.shadowBlur = 24;
      g.lineWidth = 3;
      g.beginPath();
      b.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      b.life -= 0.06;
    }
    g.shadowBlur = 0;
    this.bolts = this.bolts.filter((b) => b.life > 0);
    g.globalAlpha = 1;
  }
}
