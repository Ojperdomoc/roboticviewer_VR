// ---------------------------------------------------------------------------
// Renderizado del cuerpo robótico sobre los landmarks detectados.
// Solo se dibuja ENCIMA de las partes del cuerpo humano detectadas.
// ---------------------------------------------------------------------------
import { BONES, HAND_BONES, PI, clamp, type Mat, type Pt } from "./config";

export const TAU = Math.PI * 2;

export function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

function angleAt(a: Pt, b: Pt, c: Pt) {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const d = (v1.x * v2.x + v1.y * v2.y) / ((Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1);
  return Math.round((Math.acos(clamp(d, -1, 1)) * 180) / Math.PI);
}

// ---------------------------------------------------------------------------
// Primitivas robóticas
// ---------------------------------------------------------------------------

export function limb(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, mat: Mat, t = 0) {
  if (w <= 0.5) return;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  // Contorno oscuro
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = mat.edge;
  ctx.lineWidth = w + Math.max(2, w * 0.28);
  ctx.stroke();

  // Cuerpo metálico con degradado cilíndrico
  const g = ctx.createLinearGradient(a.x + nx * w * 0.5, a.y + ny * w * 0.5, a.x - nx * w * 0.5, a.y - ny * w * 0.5);
  g.addColorStop(0, mat.hullDark);
  g.addColorStop(0.28, mat.hull);
  g.addColorStop(0.55, mat.hull);
  g.addColorStop(1, mat.hullDark);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = g;
  ctx.lineWidth = w;
  ctx.stroke();

  // Líneas de panel
  ctx.strokeStyle = hexA(mat.edge, 0.55);
  ctx.lineWidth = Math.max(1, w * 0.1);
  const steps = Math.max(1, Math.floor(len / (w * 0.9)));
  for (let i = 1; i < steps; i++) {
    const p = lerpPt(a, b, i / steps);
    ctx.beginPath();
    ctx.moveTo(p.x + nx * w * 0.42, p.y + ny * w * 0.42);
    ctx.lineTo(p.x - nx * w * 0.42, p.y - ny * w * 0.42);
    ctx.stroke();
  }

  // Brillo especular animado
  const sh = (Math.sin(t * 1.2) * 0.5 + 0.5) * w * 0.3;
  ctx.strokeStyle = hexA("#ffffff", 0.22);
  ctx.lineWidth = Math.max(1, w * 0.14);
  ctx.beginPath();
  ctx.moveTo(a.x + nx * (w * 0.22 - sh), a.y + ny * (w * 0.22 - sh));
  ctx.lineTo(b.x + nx * (w * 0.22 - sh), b.y + ny * (w * 0.22 - sh));
  ctx.stroke();

  // Cable de energía
  ctx.strokeStyle = hexA(mat.accent, 0.45);
  ctx.lineWidth = Math.max(1, w * 0.09);
  ctx.beginPath();
  ctx.moveTo(a.x - nx * w * 0.34, a.y - ny * w * 0.34);
  ctx.lineTo(b.x - nx * w * 0.34, b.y - ny * w * 0.34);
  ctx.stroke();
}

export function piston(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, mat: Mat) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w * 0.72;
  const ny = (dx / len) * w * 0.72;
  ctx.strokeStyle = hexA(mat.hullDark, 0.95);
  ctx.lineWidth = Math.max(1.2, w * 0.16);
  ctx.beginPath();
  ctx.moveTo(a.x + nx, a.y + ny);
  ctx.lineTo(b.x + nx, b.y + ny);
  ctx.moveTo(a.x - nx, a.y - ny);
  ctx.lineTo(b.x - nx, b.y - ny);
  ctx.stroke();
  ctx.strokeStyle = hexA(mat.accent, 0.5);
  ctx.lineWidth = Math.max(1, w * 0.08);
  ctx.beginPath();
  ctx.moveTo(a.x + nx * 1.1, a.y + ny * 1.1);
  ctx.lineTo(lerpPt(a, b, 0.6).x + nx * 1.1, lerpPt(a, b, 0.6).y + ny * 1.1);
  ctx.stroke();
}

export function joint(ctx: CanvasRenderingContext2D, p: Pt, r: number, mat: Mat, t = 0, spin = 1) {
  if (r <= 0.5) return;
  ctx.save();
  const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.12, p.x, p.y, r);
  g.addColorStop(0, mat.core);
  g.addColorStop(0.42, mat.hull);
  g.addColorStop(1, mat.hullDark);
  ctx.shadowColor = hexA(mat.glow, 0.8);
  ctx.shadowBlur = r * 1.4;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.strokeStyle = mat.edge;
  ctx.stroke();

  // Muescas de servo giratorias
  ctx.strokeStyle = hexA(mat.accent, 0.85);
  ctx.lineWidth = Math.max(1, r * 0.12);
  for (let i = 0; i < 4; i++) {
    const ang = t * spin + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(ang) * r * 0.5, p.y + Math.sin(ang) * r * 0.5);
    ctx.lineTo(p.x + Math.cos(ang) * r * 0.92, p.y + Math.sin(ang) * r * 0.92);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 0.22, 0, TAU);
  ctx.fillStyle = hexA(mat.glow, 0.9);
  ctx.fill();
  ctx.restore();
}

function polyPath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

function plate(ctx: CanvasRenderingContext2D, pts: Pt[], mat: Mat, vertical = true) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const g = vertical
    ? ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys))
    : ctx.createLinearGradient(Math.min(...xs), 0, Math.max(...xs), 0);
  g.addColorStop(0, mat.hullDark);
  g.addColorStop(0.35, mat.hull);
  g.addColorStop(0.7, mat.hull);
  g.addColorStop(1, mat.hullDark);
  polyPath(ctx, pts);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, dist(pts[0], pts[1]) * 0.06);
  ctx.strokeStyle = mat.edge;
  ctx.stroke();
}

function ghostLine(ctx: CanvasRenderingContext2D, a: Pt, b: Pt) {
  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(150,205,235,0.4)";
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Partes del cuerpo
// ---------------------------------------------------------------------------

export type BodyOpts = {
  mat: Mat;
  parts: Record<string, boolean>;
  t: number;
  energy: number;
  diagnostics: boolean;
  pulse: number;
};

export function bodyScale(P: Pt[], w: number) {
  const a = P[PI.shoulderL];
  const b = P[PI.shoulderR];
  const s = a && b ? dist(a, b) : 0;
  return s > 8 ? s : w * 0.16;
}

export function drawTorso(ctx: CanvasRenderingContext2D, P: Pt[], S: number, o: BodyOpts) {
  const { mat, t } = o;
  const sl = P[PI.shoulderL];
  const sr = P[PI.shoulderR];
  const hl = P[PI.hipL];
  const hr = P[PI.hipR];
  if (!sl || !sr) return;

  const center = { x: (sl.x + sr.x + (hl?.x ?? sl.x) + (hr?.x ?? sr.x)) / 4, y: (sl.y + sr.y + (hl?.y ?? sl.y + S) + (hr?.y ?? sr.y + S)) / 4, z: 0 };

  if (hl && hr) {
    const push = (p: Pt, f: number): Pt => ({
      x: center.x + (p.x - center.x) * f,
      y: center.y + (p.y - center.y) * f,
      z: 0,
    });
    plate(ctx, [push(sl, 1.2), push(sr, 1.2), push(hr, 1.12), push(hl, 1.12)], mat);

    // Líneas abdominales
    ctx.strokeStyle = hexA(mat.edge, 0.5);
    ctx.lineWidth = Math.max(1, S * 0.02);
    for (let i = 1; i <= 3; i++) {
      const k = i / 4;
      const a = lerpPt(push(sl, 1.16), push(hl, 1.08), k);
      const b = lerpPt(push(sr, 1.16), push(hr, 1.08), k);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Placa pectoral hexagonal
    const chest = lerpPt(mid(sl, sr), mid(hl, hr), 0.28);
    const rr = S * 0.42;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * TAU - Math.PI / 2;
      const px = chest.x + Math.cos(ang) * rr;
      const py = chest.y + Math.sin(ang) * rr * 1.05;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    const gg = ctx.createLinearGradient(chest.x, chest.y - rr, chest.x, chest.y + rr);
    gg.addColorStop(0, mat.hull);
    gg.addColorStop(0.5, mat.hullDark);
    gg.addColorStop(1, mat.hull);
    ctx.fillStyle = gg;
    ctx.fill();
    ctx.lineWidth = Math.max(2, S * 0.035);
    ctx.strokeStyle = mat.edge;
    ctx.stroke();
    ctx.clip();
    ctx.strokeStyle = hexA(mat.accent, 0.4);
    ctx.lineWidth = Math.max(1, S * 0.02);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(chest.x + i * S * 0.16, chest.y - rr);
      ctx.lineTo(chest.x + i * S * 0.16 + S * 0.2, chest.y + rr);
      ctx.stroke();
    }
    ctx.restore();

    // Reactor de energía
    drawCore(ctx, chest, S * 0.2, o);
  }

  // Hombreras
  [sl, sr].forEach((p) => {
    const r = S * 0.26;
    ctx.save();
    const g = ctx.createRadialGradient(p.x - r * 0.4, p.y - r * 0.5, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, mat.hull);
    g.addColorStop(1, mat.hullDark);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - r * 0.15, r, r * 0.82, 0, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.strokeStyle = mat.edge;
    ctx.stroke();
    ctx.strokeStyle = hexA(mat.accent, 0.8);
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.beginPath();
    ctx.arc(p.x, p.y - r * 0.15, r * 0.6, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.restore();
  });

  // Cuello
  const neckTop = P[PI.nose] ? { x: P[PI.nose].x, y: P[PI.nose].y + S * 0.18, z: 0 } : center;
  limb(ctx, mid(sl, sr), neckTop, S * 0.16, mat, t);
  ctx.strokeStyle = hexA(mat.accent, 0.6);
  ctx.lineWidth = Math.max(1, S * 0.03);
  for (let i = 0; i < 3; i++) {
    const a = lerpPt(mid(sl, sr), neckTop, 0.2 + i * 0.25);
    ctx.beginPath();
    ctx.arc(a.x, a.y, S * 0.05, 0, TAU);
    ctx.stroke();
  }
}

export function drawCore(ctx: CanvasRenderingContext2D, c: Pt, r: number, o: BodyOpts) {
  const { mat, t, energy, pulse } = o;
  const lvl = clamp(energy / 100, 0, 1);
  const beat = 1 + Math.sin(t * 4) * 0.06 + pulse * 0.35;
  ctx.save();
  ctx.shadowColor = hexA(mat.glow, 0.9);
  ctx.shadowBlur = r * 2.2 * (0.5 + lvl * 0.8);
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * beat);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.35, hexA(mat.core, 0.9));
  g.addColorStop(1, hexA(mat.accent, 0.15));
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * beat, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Anillos de contención
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = hexA(mat.accent, 0.75 - i * 0.2);
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * (1.3 + i * 0.28), t * (0.8 + i * 0.5) % TAU, (t * (0.8 + i * 0.5)) % TAU + Math.PI * 1.3);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 1.6, -Math.PI / 2, -Math.PI / 2 + TAU * lvl);
  ctx.strokeStyle = lvl > 0.3 ? hexA(mat.glow, 0.9) : "#ff5a5a";
  ctx.lineWidth = Math.max(2, r * 0.2);
  ctx.stroke();
  ctx.restore();
}

export function drawHead(ctx: CanvasRenderingContext2D, P: Pt[], S: number, o: BodyOpts) {
  const { mat, t } = o;
  const el = P[PI.earL];
  const er = P[PI.earR];
  const nose = P[PI.nose];
  if (!nose) return;
  let c: Pt;
  let r: number;
  if (el && er) {
    c = mid(el, er);
    r = dist(el, er) * 0.72;
  } else {
    c = { x: nose.x, y: nose.y - S * 0.1, z: 0 };
    r = S * 0.4;
  }
  r = clamp(r, S * 0.22, S * 0.9);

  // Casco
  ctx.save();
  const g = ctx.createLinearGradient(c.x - r, c.y - r, c.x + r, c.y + r);
  g.addColorStop(0, mat.hull);
  g.addColorStop(0.45, mat.hullDark);
  g.addColorStop(1, mat.hull);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y - r * 0.05, r * 0.95, r * 1.05, 0, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = mat.edge;
  ctx.stroke();

  // Visor
  const vy = c.y - r * 0.12;
  ctx.beginPath();
  ctx.roundRect(c.x - r * 0.82, vy - r * 0.3, r * 1.64, r * 0.6, r * 0.28);
  const vg = ctx.createLinearGradient(c.x, vy - r * 0.3, c.x, vy + r * 0.3);
  vg.addColorStop(0, "#050a14");
  vg.addColorStop(1, hexA(mat.accent, 0.35));
  ctx.fillStyle = vg;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.08);
  ctx.strokeStyle = mat.edge;
  ctx.stroke();

  // Ojos LED
  const blink = Math.sin(t * 0.9) > 0.985 ? 0.15 : 1;
  [-1, 1].forEach((s) => {
    ctx.save();
    ctx.shadowColor = mat.glow;
    ctx.shadowBlur = r * 0.6;
    ctx.fillStyle = mat.core;
    ctx.beginPath();
    ctx.ellipse(c.x + s * r * 0.34, vy, r * 0.2, r * 0.16 * blink, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  });

  // Mandíbula
  ctx.strokeStyle = hexA(mat.edge, 0.7);
  ctx.lineWidth = Math.max(1, r * 0.07);
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(c.x + i * r * 0.22, vy + r * 0.42);
    ctx.lineTo(c.x + i * r * 0.22, vy + r * 0.86);
    ctx.stroke();
  }

  // Antena
  ctx.strokeStyle = hexA(mat.hullDark, 1);
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.beginPath();
  ctx.moveTo(c.x + r * 0.6, c.y - r * 0.8);
  ctx.quadraticCurveTo(c.x + r * 1.2, c.y - r * 1.5, c.x + r * 0.95, c.y - r * 1.9);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = mat.glow;
  ctx.shadowBlur = r * 0.9;
  ctx.fillStyle = mat.accent;
  ctx.beginPath();
  ctx.arc(c.x + r * 0.95, c.y - r * 1.9, r * 0.12 * (1 + Math.sin(t * 6) * 0.25), 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawArm(
  ctx: CanvasRenderingContext2D,
  P: Pt[],
  side: "L" | "R",
  S: number,
  o: BodyOpts,
) {
  const { mat, t, diagnostics } = o;
  const si = side === "L" ? PI.shoulderL : PI.shoulderR;
  const ei = side === "L" ? PI.elbowL : PI.elbowR;
  const wi = side === "L" ? PI.wristL : PI.wristR;
  const a = P[si];
  const b = P[ei];
  const c = P[wi];
  if (!a || !b) return;
  limb(ctx, a, b, S * 0.2, mat, t);
  piston(ctx, lerpPt(a, b, 0.15), lerpPt(a, b, 0.9), S * 0.2, mat);
  joint(ctx, b, S * 0.15, mat, t, side === "L" ? 1 : -1);
  if (c) {
    limb(ctx, b, c, S * 0.15, mat, t);
    piston(ctx, lerpPt(b, c, 0.2), lerpPt(b, c, 0.85), S * 0.15, mat);
    joint(ctx, c, S * 0.11, mat, -t, side === "L" ? -1 : 1);
    if (diagnostics) label(ctx, b, `${angleAt(a, b, c)}°`, mat, S * 0.16);
  }
}

export function drawLeg(
  ctx: CanvasRenderingContext2D,
  P: Pt[],
  side: "L" | "R",
  S: number,
  o: BodyOpts,
) {
  const { mat, t, diagnostics } = o;
  const hi = side === "L" ? PI.hipL : PI.hipR;
  const ki = side === "L" ? PI.kneeL : PI.kneeR;
  const ai = side === "L" ? PI.ankleL : PI.ankleR;
  const fi = side === "L" ? PI.footL : PI.footR;
  const heel = side === "L" ? PI.heelL : PI.heelR;
  const a = P[hi];
  const b = P[ki];
  const c = P[ai];
  if (!a || !b) return;
  limb(ctx, a, b, S * 0.26, mat, t);
  piston(ctx, lerpPt(a, b, 0.2), lerpPt(a, b, 0.85), S * 0.26, mat);
  joint(ctx, b, S * 0.17, mat, t, side === "L" ? -1 : 1);
  if (c) {
    limb(ctx, b, c, S * 0.2, mat, t);
    piston(ctx, lerpPt(b, c, 0.25), lerpPt(b, c, 0.8), S * 0.2, mat);
    joint(ctx, c, S * 0.12, mat, -t, side === "L" ? 1 : -1);
    const f = P[fi] ?? P[heel];
    if (f) {
      const w = S * 0.22;
      const dx = f.x - c.x;
      const dy = f.y - c.y;
      const l = Math.hypot(dx, dy) || 1;
      const nx = (-dy / l) * w * 0.5;
      const ny = (dx / l) * w * 0.5;
      plate(ctx, [
        { x: c.x + nx * 0.2, y: c.y + ny * 0.2, z: 0 },
        { x: f.x + nx, y: f.y + ny, z: 0 },
        { x: f.x - nx, y: f.y - ny, z: 0 },
        { x: c.x - nx * 0.2, y: c.y - ny * 0.2, z: 0 },
      ], mat, false);
    }
    if (diagnostics) label(ctx, b, `${angleAt(a, b, c)}°`, mat, S * 0.16);
  }
}

export function drawRoboHand(ctx: CanvasRenderingContext2D, H: Pt[], S: number, o: BodyOpts) {
  const { mat, t } = o;
  if (!H || H.length < 21) return;
  const palm = dist(H[0], H[9]) || S * 0.2;
  const w = palm * 0.3;

  // Palma blindada
  plate(ctx, [H[0], H[5], H[9], H[13], H[17]], mat);
  ctx.strokeStyle = hexA(mat.accent, 0.55);
  ctx.lineWidth = Math.max(1, palm * 0.045);
  ctx.beginPath();
  ctx.moveTo(H[0].x, H[0].y);
  ctx.lineTo(H[9].x, H[9].y);
  ctx.moveTo(H[0].x, H[0].y);
  ctx.lineTo(H[13].x, H[13].y);
  ctx.stroke();

  // Dedos
  for (const [a, b] of HAND_BONES) {
    const pa = H[a];
    const pb = H[b];
    if (!pa || !pb) continue;
    const isTip = [4, 8, 12, 16, 20].includes(b);
    limb(ctx, pa, pb, isTip ? w * 0.62 : w * 0.85, mat, t);
    joint(ctx, pa, w * 0.42, mat, t * (a === 0 ? 1 : 0.5), 1);
    if (isTip) {
      ctx.save();
      ctx.shadowColor = mat.glow;
      ctx.shadowBlur = w * 1.2;
      ctx.fillStyle = mat.core;
      ctx.beginPath();
      ctx.arc(pb.x, pb.y, w * 0.36, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  // Garra en el pulgar
  joint(ctx, H[2], w * 0.5, mat, t, 1);
}

export function drawGhost(ctx: CanvasRenderingContext2D, P: Pt[], group: keyof typeof BONES) {
  for (const [a, b] of BONES[group]) {
    const pa = P[a];
    const pb = P[b];
    if (!pa || !pb) continue;
    ghostLine(ctx, pa, pb);
  }
}

export function label(ctx: CanvasRenderingContext2D, p: Pt, text: string, mat: Mat, size: number) {
  ctx.save();
  ctx.font = `600 ${Math.max(9, size)}px ui-monospace, monospace`;
  ctx.fillStyle = hexA(mat.edge, 0.75);
  const w = ctx.measureText(text).width + 8;
  ctx.fillRect(p.x + 6, p.y - size * 0.9, w, size * 1.3);
  ctx.fillStyle = mat.core;
  ctx.fillText(text, p.x + 10, p.y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Entidades del juego
// ---------------------------------------------------------------------------

export function drawDataCube(ctx: CanvasRenderingContext2D, p: Pt, r: number, t: number, accent: string) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(t * 0.8);
  ctx.shadowColor = accent;
  ctx.shadowBlur = r * 1.4;
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.beginPath();
  ctx.rect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4);
  ctx.stroke();
  ctx.rotate(-t * 1.6);
  ctx.beginPath();
  ctx.rect(-r * 0.42, -r * 0.42, r * 0.84, r * 0.84);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.stroke();
  ctx.fillStyle = hexA(accent, 0.55);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawVirus(ctx: CanvasRenderingContext2D, p: Pt, r: number, t: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowColor = "#ff3b3b";
  ctx.shadowBlur = r * 1.6;
  ctx.fillStyle = "rgba(120,10,20,0.85)";
  ctx.beginPath();
  const spikes = 9;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i / (spikes * 2)) * TAU + t * 0.6;
    const rad = i % 2 === 0 ? r : r * 0.55;
    const x = Math.cos(ang) * rad;
    const y = Math.sin(ang) * rad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#ff6b6b";
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.stroke();
  ctx.fillStyle = "#ff2b2b";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawBolt(ctx: CanvasRenderingContext2D, p: Pt, r: number, accent: string) {
  ctx.save();
  ctx.shadowColor = accent;
  ctx.shadowBlur = r * 2;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.6);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.4, accent);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 1.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawRing(ctx: CanvasRenderingContext2D, p: Pt, r: number, max: number, color: string, life: number) {
  const k = clamp(1 - r / max, 0, 1);
  ctx.save();
  ctx.strokeStyle = hexA(color, 0.85 * k * life);
  ctx.lineWidth = Math.max(1.5, max * 0.02);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

export function drawFloatText(ctx: CanvasRenderingContext2D, p: Pt, text: string, life: number, color: string, size: number) {
  ctx.save();
  ctx.globalAlpha = clamp(life, 0, 1);
  ctx.font = `800 ${size}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.6;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, p.x, p.y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Fondo / atmósfera / HUD dentro del visor
// ---------------------------------------------------------------------------

export function drawGrid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, accent: string) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = hexA(accent, 0.12);
  ctx.lineWidth = 1;
  const step = Math.max(28, h / 16);
  const off = (t * 12) % step;
  for (let gx = x - step; gx < x + w + step; gx += step) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + h);
    ctx.stroke();
  }
  for (let gy = y - step + off; gy < y + h + step; gy += step) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + w, gy);
    ctx.stroke();
  }
  // Horizonte
  ctx.strokeStyle = hexA(accent, 0.22);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.72);
  ctx.lineTo(x + w, y + h * 0.72);
  ctx.stroke();
  ctx.restore();
}

export function drawScanlines(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  for (let sy = y; sy < y + h; sy += 4) ctx.fillRect(x, sy, w, 1.5);
  const band = ((t * 90) % (h + 200)) - 100;
  const g = ctx.createLinearGradient(0, y + band - 60, 0, y + band + 60);
  g.addColorStop(0, "rgba(120,255,255,0)");
  g.addColorStop(0.5, "rgba(140,255,255,0.10)");
  g.addColorStop(1, "rgba(120,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y + band - 60, w, 120);
  ctx.restore();
}

export function drawLens(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, x + w / 2, y + h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.7, "rgba(0,0,0,0.25)");
  g.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.lineWidth = 8;
  ctx.strokeRect(x, y, w, h);
}

export function drawReticle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, accent: string, found: boolean) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) * (found ? 0.12 : 0.2 + Math.sin(t * 2) * 0.02);
  ctx.save();
  ctx.strokeStyle = hexA(found ? accent : "#8fd8ff", 0.6);
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a0 = (i * Math.PI) / 2 + t * (found ? 0.6 : -0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a0 + 0.5);
    ctx.stroke();
  }
  if (!found) {
    ctx.font = `600 ${Math.max(11, h * 0.026)}px ui-monospace, monospace`;
    ctx.fillStyle = hexA("#9fe6ff", 0.75);
    ctx.textAlign = "center";
    ctx.fillText("BUSCANDO CUERPO…", cx, cy + r + h * 0.03);
  }
  ctx.restore();
}
