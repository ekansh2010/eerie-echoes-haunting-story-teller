import { useState, useEffect, useRef } from "react";

// ── Timing ───────────────────────────────────────────────────────────────────
const T_CRAWL_END = 4.5;
const T_PAUSE     = 4.9;
const T_BURST     = 5.2;
const T_EE_DONE   = 7.0;
const T_ZOOM      = 7.8;
const T_FADE      = 8.6;
const T_TOTAL     = 10.0;

const clamp         = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp          = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic  = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutExpo   = (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutBack   = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

// ── Bone primitives ──────────────────────────────────────────────────────────
function drawBoneSegment(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  r1: number, r2: number, a: number
) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.5) return;
  const nx = -dy / len, ny = dx / len;
  const mr = Math.max(r1, r2) * 1.12;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;

  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1, y1 + ny * r1);
  ctx.quadraticCurveTo(mx + nx * mr, my + ny * mr, x2 + nx * r2, y2 + ny * r2);
  ctx.arc(x2, y2, r2, Math.atan2(ny, nx), Math.atan2(ny, nx) + Math.PI, false);
  ctx.quadraticCurveTo(mx - nx * mr, my - ny * mr, x1 - nx * r1, y1 - ny * r1);
  ctx.arc(x1, y1, r1, Math.atan2(-ny, -nx), Math.atan2(-ny, -nx) + Math.PI, false);
  ctx.closePath();

  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0,   `rgba(210,195,175,${a * 0.85})`);
  g.addColorStop(0.5, `rgba(228,213,193,${a})`);
  g.addColorStop(1,   `rgba(185,170,150,${a * 0.75})`);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = `rgba(110,88,65,${a * 0.55})`; ctx.lineWidth = 0.8; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1 + nx * r1 * 0.38, y1 + ny * r1 * 0.38);
  ctx.quadraticCurveTo(mx + nx * r1 * 0.3, my + ny * r1 * 0.3, x2 + nx * r2 * 0.38, y2 + ny * r2 * 0.38);
  ctx.strokeStyle = `rgba(255,245,230,${a * 0.28})`;
  ctx.lineWidth = r1 * 0.32; ctx.lineCap = "round"; ctx.stroke();
}

function drawKnuckle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  const g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.32, r * 0.05, x, y, r);
  g.addColorStop(0,    `rgba(228,213,193,${a})`);
  g.addColorStop(0.55, `rgba(175,155,132,${a})`);
  g.addColorStop(1,    `rgba(88,68,52,${a * 0.8})`);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = `rgba(110,88,65,${a * 0.45})`; ctx.lineWidth = 0.7; ctx.stroke();
}

function drawClaw(ctx: CanvasRenderingContext2D, tx: number, ty: number, angle: number, len: number, a: number) {
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.28, -len * 0.42, len * 0.88, -len * 0.52, len, -len * 0.14);
  ctx.bezierCurveTo(len * 0.84, len * 0.06, len * 0.18, len * 0.09, 0, 0);
  ctx.closePath();
  ctx.fillStyle = `rgba(205,190,168,${a * 0.9})`; ctx.fill();
  ctx.strokeStyle = `rgba(110,88,65,${a * 0.5})`; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.restore();
}

// ── Skeletal hand ─────────────────────────────────────────────────────────────
// Local: -Y = fingers toward center, +Y = elbow away from center
function drawHand(
  ctx: CanvasRenderingContext2D,
  px: number, py: number,
  dirAngle: number,
  crawlT: number, clenchT: number,
  alpha: number, sc: number
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(px, py);
  ctx.rotate(dirAngle);
  ctx.scale(sc, sc);
  const a = alpha;

  // shadow
  ctx.save(); ctx.scale(1, 0.18);
  const sh = ctx.createRadialGradient(0, 0, 5, 0, 0, 95);
  sh.addColorStop(0, "rgba(228,9,19,0.28)"); sh.addColorStop(1, "transparent");
  ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(0, 0, 95, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // elbow knobs
  drawKnuckle(ctx,  3, 110, 8,   a);
  drawKnuckle(ctx, -4, 108, 6.5, a * 0.85);

  // radius + ulna
  drawBoneSegment(ctx,  4, 110,  4, 40, 8,   5.5, a);
  drawBoneSegment(ctx, -4, 108, -5, 42, 6,   4.5, a * 0.88);

  // proximal carpals
  const proxRow = [{ x: -9, y: 36 }, { x: -3, y: 32 }, { x: 3, y: 32 }, { x: 9, y: 36 }];
  proxRow.forEach(w => drawKnuckle(ctx, w.x, w.y, 4.2, a));

  // distal carpals
  const distRow = [{ x: -10, y: 18 }, { x: -3.5, y: 14 }, { x: 3.5, y: 14 }, { x: 10, y: 18 }];
  distRow.forEach(w => drawKnuckle(ctx, w.x, w.y, 3.8, a));

  // forearm → proximal
  drawBoneSegment(ctx,  4, 40,  9, 36, 5.5, 3.8, a);
  drawBoneSegment(ctx, -5, 42, -9, 36, 4.5, 3.5, a * 0.85);

  // proximal → distal
  for (let i = 0; i < 4; i++) {
    drawBoneSegment(ctx, proxRow[i].x, proxRow[i].y, distRow[i].x, distRow[i].y, 3.5, 3.2, a * 0.8);
  }

  // metacarpals
  const metaBases = [{ x: -10, y: 18 }, { x: -3.5, y: 14 }, { x: 3.5, y: 14 }, { x: 10, y: 18 }];
  const metaTips  = [{ x: -17, y: -25 }, { x: -5.5, y: -30 }, { x: 5.5, y: -30 }, { x: 17, y: -25 }];
  metaBases.forEach((mb, i) => {
    drawBoneSegment(ctx, mb.x, mb.y, metaTips[i].x, metaTips[i].y, 3.5, 4.8, a);
    drawKnuckle(ctx, metaTips[i].x, metaTips[i].y, 5.2, a);
  });

  // 4 fingers × 3 phalanges
  const fingerDefs = [
    { bx: -17,  by: -25, lens: [22, 16, 10], sp: -0.16 },
    { bx: -5.5, by: -30, lens: [25, 18, 12], sp: -0.05 },
    { bx:  5.5, by: -30, lens: [24, 17, 11], sp:  0.05 },
    { bx:  17,  by: -25, lens: [20, 14,  9], sp:  0.16 },
  ];
  fingerDefs.forEach((fd, fi) => {
    const wave = (1 - clenchT) * Math.sin(crawlT * Math.PI * 3 + fi * 0.88) * 0.2;
    const cA   = clenchT * (0.58 + fi * 0.04);
    let cx = fd.bx, cy = fd.by, curA = fd.sp + wave;
    fd.lens.forEach((segLen, si) => {
      const jA = curA + cA * (si + 1) * 0.34;
      const ex = cx + Math.sin(jA) * segLen;
      const ey = cy - Math.cos(jA) * segLen;
      drawBoneSegment(ctx, cx, cy, ex, ey, 4.4 - si * 0.55, 3.8 - si * 0.55, a);
      drawKnuckle(ctx, ex, ey, 3.8 - si * 0.55, a);
      cx = ex; cy = ey; curA = jA;
    });
    drawClaw(ctx, cx, cy, curA, 10, a);
  });

  // thumb
  const tc = clenchT * 0.52;
  const tmx = -22, tmy = 10;
  drawBoneSegment(ctx, -10, 18, tmx, tmy, 3.5, 4.2, a);
  drawKnuckle(ctx, tmx, tmy, 4.8, a);
  let ta = -0.95 + (1 - clenchT) * Math.sin(crawlT * Math.PI * 3 + 3.6) * 0.14;
  let ttx = tmx, tty = tmy;
  ([[18, 4.8, 4.2], [13, 4.2, 3.6]] as number[][]).forEach(seg => {
    ta += tc * 0.42;
    const ex = ttx + Math.cos(ta) * seg[0], ey = tty - Math.sin(ta) * seg[0];
    drawBoneSegment(ctx, ttx, tty, ex, ey, seg[1], seg[2], a);
    drawKnuckle(ctx, ex, ey, seg[2], a);
    ttx = ex; tty = ey;
  });
  drawClaw(ctx, ttx, tty, ta - Math.PI * 0.5 + tc, 9, a);

  // red joint glow
  const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 75);
  glow.addColorStop(0, "rgba(228,9,19,0.1)"); glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 75, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

// ── HI logo target points ─────────────────────────────────────────────────────
function buildHI(CX: number, CY: number) {
  const GH = 112, GW = 76, SW = 17, GAP = 28;
  const startX = CX - (GW * 2 + GAP) / 2;
  const oy = CY - GH / 2;

  // H rects
  const buildH = (ox: number, ey: number): number[][] => [
    [ox,           ey,                  SW,          GH], // left spine
    [ox + GW - SW, ey,                  SW,          GH], // right spine
    [ox + SW,      ey + GH/2 - SW/2,   GW - SW * 2, SW], // crossbar
  ];

  // I rects — centered within same GW slot
  const buildI = (ox: number, ey: number): number[][] => {
    const cx = ox + GW / 2 - SW / 2;
    return [
      [cx,  ey,           SW,   GH], // vertical spine
      [ox,  ey,           GW,   SW], // top serif
      [ox,  ey + GH - SW, GW,   SW], // bottom serif
    ];
  };

  const rects = [
    ...buildH(startX, oy),
    ...buildI(startX + GW + GAP, oy),
  ];

  const pts: { x: number; y: number }[] = [];
  rects.forEach(r => {
    for (let x = r[0]; x < r[0] + r[2]; x += 5)
      for (let y = r[1]; y < r[1] + r[3]; y += 5)
        pts.push({ x, y });
  });
  return { pts, rects };
}

// ── Hand configs: 8 directions ────────────────────────────────────────────────
type HandConfig = { sx: number; sy: number; ex: number; ey: number; a: number; s: number; stagger: number };

function getHands(W: number, H: number, CX: number, CY: number): HandConfig[] {
  const R = 190;
  const defs = [
    { ex: CX - R,        ey: CY,          sx: -220,    sy: CY,       s: 1.05, st: 0.00 },
    { ex: CX + R,        ey: CY,          sx: W + 220, sy: CY,       s: 1.05, st: 0.05 },
    { ex: CX,            ey: CY - R,      sx: CX,      sy: -220,     s: 0.90, st: 0.10 },
    { ex: CX,            ey: CY + R,      sx: CX,      sy: H + 220,  s: 0.90, st: 0.15 },
    { ex: CX - R * 0.71, ey: CY - R * 0.71, sx: -220,    sy: -220,     s: 0.78, st: 0.08 },
    { ex: CX + R * 0.71, ey: CY - R * 0.71, sx: W + 220, sy: -220,     s: 0.78, st: 0.13 },
    { ex: CX - R * 0.71, ey: CY + R * 0.71, sx: -220,    sy: H + 220,  s: 0.78, st: 0.18 },
    { ex: CX + R * 0.71, ey: CY + R * 0.71, sx: W + 220, sy: H + 220,  s: 0.78, st: 0.22 },
  ];
  return defs.map((h, idx) => {
    const vx = CX - h.ex, vy = CY - h.ey;
    const len = Math.sqrt(vx * vx + vy * vy);
    const angle = Math.atan2(vx / len, vy / len) + Math.PI;
    const finalAngle = (idx === 0 || idx === 1) ? angle + Math.PI : angle;
    return { sx: h.sx, sy: h.sy, ex: h.ex, ey: h.ey, a: finalAngle, s: h.s, stagger: h.st };
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Particle = {
  ox: number; oy: number; tx: number; ty: number;
  x: number; y: number;
  color: string; size: number; delay: number;
  trail: { x: number; y: number }[];
};
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number };

// ── Component ─────────────────────────────────────────────────────────────────
const Echoes = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(true);
  const [fading,  setFading]  = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    try {
      audioRef.current = new Audio("/audio/scary-horror-music.mp3");
      audioRef.current.volume = 0.3;
      audioRef.current.play().catch(() => {});
    } catch {}

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const W = canvas.width, H = canvas.height, CX = W / 2, CY = H / 2;

    const hands = getHands(W, H, CX, CY);
    const { pts, rects } = buildHI(CX, CY);
    const COLORS = ["#e40913","#ff2a2a","#ff6600","#ff0000","#c0000e","#ff5533"];

    const particles: Particle[] = pts.map(tp => {
      const bx = CX + (Math.random() - 0.5) * 55;
      const by = CY + (Math.random() - 0.5) * 38;
      return {
        ox: bx, oy: by, tx: tp.x, ty: tp.y, x: bx, y: by,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 1.5 + Math.random() * 2, delay: Math.random() * 0.52, trail: [],
      };
    });

    const sparks: Spark[] = [];
    let t0: number | null = null;

    const frame = (ts: number) => {
      if (!t0) t0 = ts;
      const T = (ts - t0) / 1000;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

      // vignette
      const vig = ctx.createRadialGradient(CX, CY, H * 0.04, CX, CY, H * 0.95);
      vig.addColorStop(0,   "rgba(4,0,0,0.1)");
      vig.addColorStop(0.5, "rgba(0,0,0,0.5)");
      vig.addColorStop(1,   "rgba(0,0,0,0.93)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      // red ground fog
      if (T > 0.3 && T < T_ZOOM) {
        const ga = clamp((T - 0.3) / 1.5, 0, 1) * 0.22;
        const gl = ctx.createRadialGradient(CX, CY, 10, CX, CY, W * 0.55);
        gl.addColorStop(0, `rgba(228,9,19,${ga})`); gl.addColorStop(1, "transparent");
        ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      }

      // ambient sparks
      if (T > 0.5 && T < T_BURST && Math.random() < 0.28) {
        const ang = Math.random() * Math.PI * 2, r = 40 + Math.random() * 160;
        sparks.push({
          x: CX + Math.cos(ang) * r, y: CY + Math.sin(ang) * r * 0.18 + 55,
          vx: (Math.random() - 0.5) * 0.8, vy: -0.55 - Math.random() * 1.5,
          life: 0, max: 22 + Math.random() * 30, size: 0.6 + Math.random() * 1.2,
        });
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.x += s.vx; s.y += s.vy; s.life++;
        ctx.globalAlpha = Math.sin((s.life / s.max) * Math.PI) * 0.7;
        ctx.fillStyle = "#e40913";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
        if (s.life >= s.max) sparks.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      // ── Hands ─────────────────────────────────────────────────────────────
      if (T < T_ZOOM + 0.9) {
        const clenchRaw  = clamp((T - T_CRAWL_END) / (T_PAUSE - T_CRAWL_END), 0, 1);
        const clenchProg = easeOutBack(Math.min(clenchRaw, 1));
        const fadeOut    = clamp((T - T_ZOOM) / 0.85, 0, 1);

        hands.forEach((hc, hi) => {
          const hT = clamp((T - hc.stagger * T_CRAWL_END * 0.14) / T_CRAWL_END, 0, 1);
          let hProg: number;
          if      (hT < 0.38) hProg = easeInOutSine(hT / 0.38) * 0.32;
          else if (hT < 0.64) hProg = 0.32 + easeOutCubic((hT - 0.38) / 0.26) * 0.46;
          else                hProg = 0.78 + easeInOutSine((hT - 0.64) / 0.36) * 0.22;

          const hx   = lerp(hc.sx, hc.ex, hProg);
          const hy   = lerp(hc.sy, hc.ey, hProg);
          const bob  = (1 - clenchRaw) * 6 * Math.sin(hProg * Math.PI * 4 + hi * 1.35);
          const sway = Math.sin(T * 0.75 + hi * 2.2) * (1 - clenchRaw) * 3;
          const vx   = hc.ex - hc.sx, vy = hc.ey - hc.sy;
          const vlen = Math.sqrt(vx * vx + vy * vy) || 1;
          const perpX = -vy / vlen, perpY = vx / vlen;
          const alpha = clamp(hProg / 0.07, 0, 1) * (1 - fadeOut);
          drawHand(ctx, hx + perpX * sway, hy + perpY * sway + bob * 0.3, hc.a, hProg, clenchProg, alpha, hc.s);
        });
      }

      // ── Particles → HI ────────────────────────────────────────────────────
      if (T >= T_BURST) {
        const pDur = T_EE_DONE - T_BURST;
        particles.forEach(p => {
          const pt   = Math.max(0, T - T_BURST - p.delay);
          const prog = clamp(pt / pDur, 0, 1);
          const ep   = easeOutExpo(prog);
          p.x = lerp(p.ox, p.tx, ep); p.y = lerp(p.oy, p.ty, ep);
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 7) p.trail.shift();

          if (prog < 0.96 && p.trail.length > 1) {
            for (let i = 1; i < p.trail.length; i++) {
              ctx.globalAlpha = (i / p.trail.length) * ep * 0.5;
              ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.4; ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
              ctx.lineTo(p.trail[i].x, p.trail[i].y); ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }

          const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4.5);
          gr.addColorStop(0, p.color + "88"); gr.addColorStop(1, "transparent");
          ctx.globalAlpha = ep * 0.25; ctx.fillStyle = gr;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = clamp(ep, 0, 1); ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        });

        // impact flash
        if (T >= T_EE_DONE && T < T_EE_DONE + 0.35) {
          const fp = 1 - (T - T_EE_DONE) / 0.35;
          ctx.globalAlpha = fp * 0.6; ctx.fillStyle = "#e40913";
          ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
        }

        // HI bloom
        if (T >= T_EE_DONE) {
          const bp    = clamp((T - T_EE_DONE) / 0.6, 0, 1);
          const pulse = 0.5 + 0.5 * Math.sin((T - T_EE_DONE) * Math.PI * 2.2);
          rects.forEach(r => {
            const bcx = r[0] + r[2] / 2, bcy = r[1] + r[3] / 2;
            const brad = Math.max(r[2], r[3]) * 0.95;
            const bloom = ctx.createRadialGradient(bcx, bcy, 0, bcx, bcy, brad);
            bloom.addColorStop(0, `rgba(228,9,19,${0.26 * bp * (0.7 + 0.3 * pulse)})`);
            bloom.addColorStop(1, "transparent");
            ctx.fillStyle = bloom;
            ctx.fillRect(bcx - brad, bcy - brad, brad * 2, brad * 2);
          });
        }
      }

      // ── Zoom into HI ──────────────────────────────────────────────────────
      if (T >= T_ZOOM) {
        const zp = clamp((T - T_ZOOM) / (T_TOTAL - T_ZOOM), 0, 1);
        const zs = 1 + easeOutExpo(zp) * 24;
        const za = clamp(1 - zp * 1.3, 0, 1);
        ctx.save();
        ctx.translate(CX, CY); ctx.scale(zs, zs); ctx.translate(-CX, -CY);
        particles.forEach(p => {
          ctx.globalAlpha = za; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1; ctx.restore();
        ctx.globalAlpha = clamp(zp * 1.1, 0, 1);
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      if (T < T_TOTAL) rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);

    const fadeTimer     = setTimeout(() => setFading(true), T_FADE * 1000);
    const completeTimer = setTimeout(() => {
      setVisible(false);
      audioRef.current?.pause();
      onComplete();
    }, T_TOTAL * 1000 + 100);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      audioRef.current?.pause();
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      style={{
        position:   "fixed",
        inset:       0,
        zIndex:      10000,
        background: "#000",
        opacity:     fading ? 0 : 1,
        transition: "opacity 1.5s ease",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default Echoes;