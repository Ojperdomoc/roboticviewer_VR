// ---------------------------------------------------------------------------
// Motor: cámara + MediaPipe + juego + render (mono / estéreo VR)
// ---------------------------------------------------------------------------
import {
  GAME_TIME,
  MATERIALS,
  MODULES,
  PI,
  clamp,
  type Mat,
  type Pt,
} from "./config";
import { createTrackers, type Trackers } from "./tracking";
import * as D from "./draw";

export type PartId = "manos" | "brazos" | "torso" | "piernas" | "cabeza";

export type Options = {
  material: string;
  stereo: boolean;
  ipd: number;
  background: "real" | "grid" | "void";
  diagnostics: boolean;
  game: boolean;
  sound: boolean;
  partOn: Record<PartId, boolean>;
};

export type Stats = {
  score: number;
  best: number;
  time: number;
  energy: number;
  combo: number;
  fps: number;
  hands: number;
  poseFound: boolean;
  installed: Record<PartId, boolean>;
  collected: Record<PartId, number>;
  nextModule: string | null;
  status: string;
  over: boolean;
  victory: boolean;
  paused: boolean;
};

type Cube = { x: number; y: number; z: number; life: number; born: number };
type Virus = { x: number; y: number; vx: number; vy: number; r: number; spin: number };
type Bolt = { x: number; y: number; vx: number; vy: number; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number };
type Ring = { x: number; y: number; r: number; max: number; life: number; color: string };
type Text = { x: number; y: number; text: string; life: number; color: string; size: number };

type View = { x: number; y: number; w: number; h: number; ox: number; oy: number; dw: number; dh: number; eye: number };

const DEFAULT_PARTS: Record<PartId, boolean> = {
  manos: true,
  brazos: true,
  torso: true,
  piernas: true,
  cabeza: true,
};

export class Engine {
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  ctx: CanvasRenderingContext2D;
  onStats: (s: Stats) => void;
  onStatus: (msg: string, busy: boolean) => void;

  opt: Options = {
    material: "cromo",
    stereo: false,
    ipd: 0.55,
    background: "real",
    diagnostics: false,
    game: true,
    sound: true,
    partOn: { ...DEFAULT_PARTS },
  };

  private trackers: Trackers | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private lastT = 0;
  private lastVideoTime = -1;
  private lastTs = 0;
  private fps = 0;
  private statT = 0;
  private mirror = true;
  private facing: "user" | "environment" = "user";
  private paused = false;
  private handFrame = 0;

  private poseSm: Pt[] = [];
  private handSm: Pt[][] = [];
  private poseRaw: Pt[] | null = null;
  private handRaw: Pt[][] = [];
  private handsFound = 0;

  private pinch = [
    { active: false, charge: 0, x: 0.5, y: 0.5 },
    { active: false, charge: 0, x: 0.5, y: 0.5 },
  ];

  private g = {
    running: false,
    over: false,
    victory: false,
    time: GAME_TIME,
    score: 0,
    combo: 0,
    comboT: 0,
    energy: 100,
    installed: { ...DEFAULT_PARTS } as Record<PartId, boolean>,
    collected: { manos: 0, brazos: 0, torso: 0, piernas: 0, cabeza: 0 } as Record<PartId, number>,
    cubeTimer: 0.6,
    virusTimer: 14,
    cubes: [] as Cube[],
    viruses: [] as Virus[],
    bolts: [] as Bolt[],
    parts: [] as Particle[],
    rings: [] as Ring[],
    texts: [] as Text[],
    pulse: 0,
    shake: 0,
  };

  private best = Number(localStorage.getItem("androide.best") || 0);
  private audio: AudioContext | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    onStats: (s: Stats) => void,
    onStatus: (msg: string, busy: boolean) => void,
  ) {
    this.canvas = canvas;
    this.video = video;
    this.ctx = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
    this.onStats = onStats;
    this.onStatus = onStatus;
  }

  // ---------------------------------------------------------------- lifecycle
  async start(facing: "user" | "environment" = "user") {
    this.facing = facing;
    this.mirror = facing === "user";
    this.onStatus("Solicitando acceso a la cámara…", true);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err) {
      this.onStatus("No se pudo acceder a la cámara. Revisa los permisos del navegador.", false);
      throw err;
    }
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => undefined);

    this.onStatus("Descargando modelos de IA corporal…", true);
    if (!this.trackers) this.trackers = await createTrackers(2);
    this.onStatus("Calibrando sensores…", true);
    this.resetGame();
    this.onStatus("Sistema activo", false);
    this.lastT = performance.now();
    cancelAnimationFrame(this.raf);
    this.loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  destroy() {
    this.stop();
    this.trackers?.close();
    this.trackers = null;
  }

  async switchCamera() {
    const next = this.facing === "user" ? "environment" : "user";
    this.stream?.getTracks().forEach((t) => t.stop());
    this.mirror = next === "user";
    this.facing = next;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: next, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play().catch(() => undefined);
  }

  snapshot() {
    try {
      const url = this.canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `protocolo-androide-${Date.now()}.png`;
      a.click();
      this.beep(1200, 0.12, "triangle", 0.06);
    } catch {
      /* noop */
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.floor(parent.clientWidth * dpr);
    const h = Math.floor(parent.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  setOptions(o: Partial<Options>) {
    this.opt = { ...this.opt, ...o };
    if (!this.opt.game) {
      // Modo libre: todo el cuerpo alterado
      const all = { ...DEFAULT_PARTS };
      this.g.installed = all;
    }
  }

  togglePause() {
    this.paused = !this.paused;
  }

  resetGame() {
    this.g = {
      ...this.g,
      running: this.opt.game,
      over: false,
      victory: false,
      time: GAME_TIME,
      score: 0,
      combo: 0,
      comboT: 0,
      energy: 100,
      installed: this.opt.game ? { manos: false, brazos: false, torso: false, piernas: false, cabeza: false } : { ...DEFAULT_PARTS },
      collected: { manos: 0, brazos: 0, torso: 0, piernas: 0, cabeza: 0 },
      cubes: [],
      viruses: [],
      bolts: [],
      parts: [],
      rings: [],
      texts: [],
      cubeTimer: 0.5,
      virusTimer: 14,
    };
    this.paused = false;
  }

  // ------------------------------------------------------------------- audio
  private beep(freq: number, dur = 0.08, type: OscillatorType = "square", vol = 0.06) {
    if (!this.opt.sound) return;
    try {
      if (!this.audio) this.audio = new AudioContext();
      const ctx = this.audio;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch {
      /* noop */
    }
  }

  private buzz(ms: number) {
    // @ts-ignore
    if (navigator.vibrate) navigator.vibrate(ms);
  }

  // ------------------------------------------------------------------- bucle
  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastT) / 1000);
    this.lastT = now;
    this.fps = this.fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1;
    this.resize();
    this.detect(now);
    if (!this.paused) this.update(dt);
    this.render(now / 1000, dt);
    this.statT += dt;
    if (this.statT > 0.12) {
      this.statT = 0;
      this.emitStats();
    }
  };

  private detect(now: number) {
    const v = this.video;
    if (!this.trackers || !v || v.readyState < 2 || !v.videoWidth) return;
    if (v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    const ts = Math.max(Math.round(now), this.lastTs + 1);
    this.lastTs = ts;
    const verySlow = this.fps > 0 && this.fps < 16;
    if (!verySlow || this.handFrame % 2 === 1) {
      try {
        const pr = this.trackers.pose.detectForVideo(v, ts);
        this.poseRaw = pr?.landmarks?.[0] ?? null;
      } catch {
        /* noop */
      }
    }
    this.handFrame++;
    const even = this.handFrame % 2 === 0;
    const slow = this.fps > 0 && this.fps < 24;
    if (!slow || even) {
      try {
        const hr = this.trackers.hand.detectForVideo(v, ts);
        this.handRaw = hr?.landmarks ?? [];
      } catch {
        this.handRaw = [];
      }
    }
    this.smooth();
  }

  private smooth() {
    const k = 0.55;
    if (this.poseRaw) {
      if (this.poseSm.length !== this.poseRaw.length) this.poseSm = this.poseRaw.map((p) => ({ ...p }));
      else
        for (let i = 0; i < this.poseRaw.length; i++) {
          const a = this.poseSm[i];
          const b = this.poseRaw[i];
          a.x += (b.x - a.x) * k;
          a.y += (b.y - a.y) * k;
          a.z += (b.z - a.z) * k;
        }
    } else if (this.poseSm.length) {
      // decaimiento para que el robot se desvanezca si se pierde
      this.poseSm = [];
    }
    this.handsFound = this.handRaw.length;
    this.handSm = this.handRaw.map((h, hi) => {
      const prev = this.handSm[hi];
      if (!prev || prev.length !== h.length) return h.map((p) => ({ ...p }));
      return h.map((p, i) => ({
        x: prev[i].x + (p.x - prev[i].x) * 0.6,
        y: prev[i].y + (p.y - prev[i].y) * 0.6,
        z: prev[i].z + (p.z - prev[i].z) * 0.6,
      }));
    });
  }

  // ------------------------------------------------------------------ juego
  private project(v: View, lm: { x: number; y: number; z?: number }): Pt {
    const par = v.dw * 0.03 * this.opt.ipd;
    return {
      x: v.ox + (this.mirror ? 1 - lm.x : lm.x) * v.dw + v.eye * par * clamp(lm.z ?? 0, -0.35, 0.35),
      y: v.oy + lm.y * v.dh,
      z: lm.z ?? 0,
    };
  }

  private centerView(): View {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const vw = this.video.videoWidth || 16;
    const vh = this.video.videoHeight || 9;
    const scale = Math.max(cw / vw, ch / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    return { x: 0, y: 0, w: cw, h: ch, ox: (cw - dw) / 2, oy: (ch - dh) / 2, dw, dh, eye: 0 };
  }

  private coreNorm(): Pt {
    const p = this.poseSm;
    const sl = p[PI.shoulderL];
    const sr = p[PI.shoulderR];
    const hl = p[PI.hipL];
    const hr = p[PI.hipR];
    if (sl && sr) {
      const c = { x: (sl.x + sr.x) / 2, y: (sl.y + sr.y) / 2, z: 0 };
      if (hl && hr) {
        c.x = (c.x + (hl.x + hr.x) / 2) / 2;
        c.y = (c.y + (hl.y + hr.y) / 2) / 2;
      } else {
        c.y += 0.16;
      }
      return c;
    }
    return { x: 0.5, y: 0.55, z: 0 };
  }

  private fingertipsNorm(): Pt[] {
    const pts: Pt[] = [];
    if (this.handSm.length) {
      for (const h of this.handSm) {
        for (const i of [4, 8, 12, 16, 20]) if (h[i]) pts.push(h[i]);
      }
    }
    const p = this.poseSm;
    if (p[PI.indexL]) pts.push(p[PI.indexL]);
    if (p[PI.indexR]) pts.push(p[PI.indexR]);
    return pts;
  }

  private update(dt: number) {
    const g = this.g;
    const mat = MATERIALS[this.opt.material] ?? MATERIALS.cromo;
    g.pulse = Math.max(0, g.pulse - dt * 2.5);
    g.shake = Math.max(0, g.shake - dt * 3);

    // Actualizar pellizcos (pinza) de cada mano
    this.handSm.forEach((h, i) => {
      const st = this.pinch[i] ?? (this.pinch[i] = { active: false, charge: 0, x: 0.5, y: 0.5 });
      const scale = Math.hypot(h[0].x - h[9].x, h[0].y - h[9].y) || 0.1;
      const d = Math.hypot(h[4].x - h[8].x, h[4].y - h[8].y);
      const pinching = d / scale < 0.45;
      st.x = (h[4].x + h[8].x) / 2;
      st.y = (h[4].y + h[8].y) / 2;
      if (pinching) {
        if (!st.active) st.charge = 0;
        st.charge += dt;
        st.active = true;
      } else if (st.active) {
        st.active = false;
        if (g.running && !g.over) {
          if (st.charge > 1.1 && g.energy >= 25) this.emp(st.x, st.y);
          else this.fireBolt(st.x, st.y);
        }
        st.charge = 0;
      }
    });
    for (let i = this.handSm.length; i < this.pinch.length; i++) this.pinch[i].active = false;

    // Partículas / anillos / textos
    g.parts.forEach((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.25 * dt;
      p.life -= dt * 1.6;
    });
    g.parts = g.parts.filter((p) => p.life > 0);
    g.rings.forEach((r) => {
      r.r += dt * r.max * 1.8;
      r.life -= dt * 0.9;
    });
    g.rings = g.rings.filter((r) => r.life > 0);
    g.texts.forEach((tx) => {
      tx.y -= dt * 0.06;
      tx.life -= dt * 0.8;
    });
    g.texts = g.texts.filter((tx) => tx.life > 0);

    if (!g.running || g.over) return;

    // Tiempo
    g.time -= dt;
    if (g.comboT > 0) {
      g.comboT -= dt;
      if (g.comboT <= 0) g.combo = 0;
    }
    if (g.time <= 0) {
      g.time = 0;
      this.finish(MODULES.every((m) => g.installed[m.id as PartId]));
      return;
    }
    if (g.energy <= 0) {
      this.finish(false);
      return;
    }

    // Cubos de datos
    g.cubeTimer -= dt;
    const maxCubes = 3 + (g.time < GAME_TIME * 0.4 ? 2 : 0);
    if (g.cubeTimer <= 0 && g.cubes.length < maxCubes) {
      g.cubeTimer = clamp(2.1 - (GAME_TIME - g.time) * 0.012, 0.7, 2.1);
      this.spawnCube();
    }
    // Los cubos son atraídos suavemente por los dedos del jugador
    const tipsN = this.fingertipsNorm();
    g.cubes.forEach((c) => {
      c.life -= dt * 0.16;
      if (!tipsN.length) return;
      let best = 1e9;
      let tp: Pt | null = null;
      for (const t of tipsN) {
        const d = Math.hypot(t.x - c.x, t.y - c.y);
        if (d < best) {
          best = d;
          tp = t;
        }
      }
      if (tp && best < 0.42 && best > 0.001) {
        const sp = 0.55 * (1 - best / 0.42) * dt;
        c.x += ((tp.x - c.x) / best) * sp;
        c.y += ((tp.y - c.y) / best) * sp;
      }
    });
    g.cubes = g.cubes.filter((c) => c.life > 0);

    // Virus
    g.virusTimer -= dt;
    if (g.virusTimer <= 0) {
      g.virusTimer = clamp(9 - (GAME_TIME - g.time) * 0.06, 3.2, 9);
      this.spawnVirus();
    }
    const core = this.coreNorm();
    for (const v of g.viruses) {
      const dx = core.x - v.x;
      const dy = core.y - v.y;
      const l = Math.hypot(dx, dy) || 1;
      const sp = 0.055 + (GAME_TIME - g.time) * 0.0009;
      v.x += (dx / l) * sp * dt;
      v.y += (dy / l) * sp * dt;
      v.spin += dt;
      if (l < 0.075) {
        v.x = -9;
        this.damage(18, core);
      }
    }
    g.viruses = g.viruses.filter((v) => v.x > -1);

    // Disparos
    for (const b of g.bolts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const v of g.viruses) {
        if (Math.hypot(v.x - b.x, v.y - b.y) < 0.055) {
          this.killVirus(v);
          v.x = -9;
          b.life = 0;
        }
      }
    }
    g.bolts = g.bolts.filter((b) => b.life > 0 && b.x > -0.2 && b.x < 1.2 && b.y > -0.2 && b.y < 1.2);

    // Recolección con los dedos
    const view = this.centerView();
    const tips = this.fingertipsNorm().map((p) => this.project(view, p));
    const reach = Math.min(view.dw, view.dh) * 0.055;
    for (const c of g.cubes) {
      const cp = this.project(view, { x: c.x, y: c.y, z: c.z });
      if (tips.some((tp) => Math.hypot(tp.x - cp.x, tp.y - cp.y) < reach + Math.min(view.dw, view.dh) * 0.02)) {
        c.life = -1;
        this.collect(c, mat, view);
      }
    }
    g.cubes = g.cubes.filter((c) => c.life > 0);
  }

  private spawnCube() {
    const core = this.coreNorm();
    let x = 0;
    let y = 0;
    for (let i = 0; i < 24; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.18 + Math.random() * 0.3;
      x = clamp(core.x + Math.cos(ang) * rad, 0.08, 0.92);
      y = clamp(core.y + Math.sin(ang) * rad * 0.9, 0.08, 0.9);
      if (this.g.cubes.every((c) => Math.hypot(c.x - x, c.y - y) > 0.14)) break;
    }
    this.g.cubes.push({ x, y, z: (Math.random() - 0.5) * 0.3, life: 1, born: performance.now() });
  }

  private spawnVirus() {
    const core = this.coreNorm();
    const ang = Math.random() * Math.PI * 2;
    const x = clamp(core.x + Math.cos(ang) * 0.55, 0.05, 0.95);
    const y = clamp(core.y + Math.sin(ang) * 0.55, 0.05, 0.95);
    this.g.viruses.push({ x, y, vx: 0, vy: 0, r: 0.035, spin: Math.random() * 6 });
  }

  private collect(c: Cube, mat: Mat, view: View) {
    const g = this.g;
    g.combo = Math.min(g.combo + 1, 9);
    g.comboT = 3;
    const pts = 100 * g.combo;
    g.score += pts;
    g.energy = clamp(g.energy + 6, 0, 100);
    g.pulse = 1;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 0.06 + Math.random() * 0.16;
      g.parts.push({
        x: c.x,
        y: c.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 0.05,
        life: 1,
        color: Math.random() > 0.5 ? mat.accent : "#ffffff",
        size: 2 + Math.random() * 3,
      });
    }
    g.rings.push({ x: c.x, y: c.y, r: 0.01, max: 0.28, life: 1, color: mat.accent });
    g.texts.push({ x: c.x, y: c.y - 0.03, text: `+${pts}${g.combo > 1 ? ` x${g.combo}` : ""}`, life: 1, color: mat.glow, size: Math.max(14, view.h * 0.032) });
    this.beep(660 + g.combo * 60, 0.07, "square", 0.05);
    this.buzz(15);

    // Instalación progresiva de módulos corporales
    const next = MODULES.find((m) => !g.installed[m.id as PartId]);
    if (next) {
      g.collected[next.id as PartId] += 1;
      if (g.collected[next.id as PartId] >= next.need) {
        g.installed[next.id as PartId] = true;
        g.score += 500;
        g.texts.push({
          x: c.x,
          y: c.y - 0.09,
          text: `MÓDULO INSTALADO: ${next.short}`,
          life: 1.6,
          color: "#ffffff",
          size: Math.max(16, view.h * 0.038),
        });
        this.beep(880, 0.18, "triangle", 0.07);
        this.buzz(45);
        if (MODULES.every((m) => g.installed[m.id as PartId])) {
          g.texts.push({ x: 0.5, y: 0.35, text: "¡TRANSFORMACIÓN COMPLETA!", life: 2.2, color: mat.glow, size: Math.max(20, view.h * 0.05) });
          setTimeout(() => this.finish(true), 1800);
        }
      }
    }
  }

  private fireBolt(x: number, y: number) {
    const g = this.g;
    let target: Virus | null = null;
    let best = 1e9;
    for (const v of g.viruses) {
      const d = Math.hypot(v.x - x, v.y - y);
      if (d < best) {
        best = d;
        target = v;
      }
    }
    const ang = target ? Math.atan2(target.y - y, target.x - x) : -Math.PI / 2;
    const sp = 1.5;
    g.bolts.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1.4 });
    this.beep(320, 0.06, "sawtooth", 0.04);
  }

  private emp(x: number, y: number) {
    const g = this.g;
    g.energy = clamp(g.energy - 25, 0, 100);
    g.rings.push({ x, y, r: 0.02, max: 0.9, life: 1.2, color: "#7dfcff" });
    let hits = 0;
    for (const v of g.viruses) {
      if (Math.hypot(v.x - x, v.y - y) < 0.55) {
        hits++;
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          g.parts.push({ x: v.x, y: v.y, vx: Math.cos(a) * 0.2, vy: Math.sin(a) * 0.2, life: 1, color: "#ff5555", size: 3 });
        }
        v.x = -9;
      }
    }
    g.viruses = g.viruses.filter((v) => v.x > -1);
    g.score += hits * 120;
    if (hits) g.texts.push({ x, y: y - 0.05, text: `PEM x${hits}`, life: 1.2, color: "#7dfcff", size: 34 });
    this.beep(140, 0.3, "sawtooth", 0.07);
    this.buzz(60);
  }

  private killVirus(v: Virus) {
    const g = this.g;
    g.score += 150 * Math.max(1, g.combo);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      g.parts.push({ x: v.x, y: v.y, vx: Math.cos(a) * 0.18, vy: Math.sin(a) * 0.18, life: 1, color: i % 2 ? "#ff5555" : "#ffdddd", size: 3 });
    }
    g.rings.push({ x: v.x, y: v.y, r: 0.01, max: 0.3, life: 1, color: "#ff6666" });
    this.beep(220, 0.12, "square", 0.05);
    this.buzz(25);
  }

  private damage(amount: number, at: Pt) {
    const g = this.g;
    g.energy = clamp(g.energy - amount, 0, 100);
    g.combo = 0;
    g.shake = 1;
    g.pulse = 1;
    g.texts.push({ x: at.x, y: at.y - 0.05, text: `-${amount} ENERGÍA`, life: 1.2, color: "#ff6b6b", size: 30 });
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      g.parts.push({ x: at.x, y: at.y, vx: Math.cos(a) * 0.22, vy: Math.sin(a) * 0.22, life: 1, color: "#ff4444", size: 3 });
    }
    this.beep(110, 0.25, "sawtooth", 0.07);
    this.buzz(80);
  }

  private finish(victory: boolean) {
    const g = this.g;
    g.over = true;
    g.running = false;
    g.victory = victory;
    if (g.score > this.best) {
      this.best = g.score;
      localStorage.setItem("androide.best", String(this.best));
    }
    this.beep(victory ? 880 : 120, 0.5, "triangle", 0.08);
  }

  // ----------------------------------------------------------------- render
  private views(): View[] {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const vw = this.video.videoWidth || 16;
    const vh = this.video.videoHeight || 9;
    if (!this.opt.stereo) return [this.makeView(0, 0, cw, ch, 0, vw, vh)];
    const half = Math.floor(cw / 2);
    return [
      this.makeView(0, 0, half, ch, -1, vw, vh),
      this.makeView(half, 0, cw - half, ch, 1, vw, vh),
    ];
  }

  private makeView(x: number, y: number, w: number, h: number, eye: number, vw: number, vh: number): View {
    const scale = Math.max(w / vw, h / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    return { x, y, w, h, ox: x + (w - dw) / 2, oy: y + (h - dh) / 2, dw, dh, eye };
  }

  private render(t: number, dt: number) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const mat = MATERIALS[this.opt.material] ?? MATERIALS.cromo;
    const g = this.g;
    ctx.fillStyle = "#04070d";
    ctx.fillRect(0, 0, cw, ch);

    const shake = g.shake * Math.min(cw, ch) * 0.012;
    ctx.save();
    if (shake > 0.2) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    const views = this.views();
    for (const v of views) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(v.x, v.y, v.w, v.h);
      ctx.clip();

      // --- Fondo (cámara real) ---
      const ready = this.video.readyState >= 2 && this.video.videoWidth > 0;
      if (ready) {
        const shift = v.eye * v.w * 0.01 * this.opt.ipd;
        ctx.save();
        if (this.mirror) {
          ctx.translate(v.ox + v.dw + shift, v.oy);
          ctx.scale(-1, 1);
          ctx.drawImage(this.video, 0, 0, v.dw, v.dh);
        } else {
          ctx.drawImage(this.video, v.ox + shift, v.oy, v.dw, v.dh);
        }
        ctx.restore();
        if (this.opt.background !== "real") {
          ctx.fillStyle = this.opt.background === "void" ? "rgba(2,5,10,0.92)" : "rgba(4,10,18,0.66)";
          ctx.fillRect(v.x, v.y, v.w, v.h);
        }
        // Tinte frío
        ctx.fillStyle = "rgba(10,30,60,0.16)";
        ctx.fillRect(v.x, v.y, v.w, v.h);
      }
      if (this.opt.background !== "real") D.drawGrid(ctx, v.x, v.y, v.w, v.h, t, mat.accent);

      // --- Entidades del juego ---
      const P = (p: { x: number; y: number; z?: number }) => this.project(v, p);
      for (const c of g.cubes) {
        const p = P({ x: c.x, y: c.y + Math.sin(t * 2 + c.x * 9) * 0.012, z: c.z });
        const r = Math.min(v.dw, v.dh) * 0.032 * clamp(c.life * 2, 0.2, 1);
        D.drawDataCube(ctx, p, r, t, mat.accent);
      }
      for (const vi of g.viruses) D.drawVirus(ctx, P(vi), Math.min(v.dw, v.dh) * vi.r, t + vi.spin);
      for (const b of g.bolts) D.drawBolt(ctx, P(b), Math.min(v.dw, v.dh) * 0.022, mat.glow);
      for (const p of g.parts) {
        const pp = P(p);
        ctx.globalAlpha = clamp(p.life, 0, 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(pp.x, pp.y, (p.size * v.dw) / 900, (p.size * v.dw) / 900);
        ctx.globalAlpha = 1;
      }
      for (const r of g.rings) {
        const pp = P({ x: r.x, y: r.y, z: 0 });
        D.drawRing(ctx, pp, r.r * v.dh, r.max * v.dh, r.color, r.life);
      }

      // --- Cuerpo robótico ---
      this.drawBodyInView(ctx, v, mat, t);

      // --- Pellizco / carga PEM ---
      this.handSm.forEach((h, i) => {
        const st = this.pinch[i];
        if (st?.active) {
          const p = P({ x: st.x, y: st.y, z: (h[4].z + h[8].z) / 2 });
          const r = Math.min(v.dw, v.dh) * (0.03 + clamp(st.charge, 0, 1.6) * 0.06);
          const readyEmp = st.charge > 1.1;
          ctx.save();
          ctx.strokeStyle = readyEmp ? "#7dfcff" : D.hexA(mat.accent, 0.8);
          ctx.lineWidth = Math.max(2, r * 0.12);
          ctx.shadowColor = readyEmp ? "#7dfcff" : mat.glow;
          ctx.shadowBlur = r * 0.8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(st.charge / 1.1, 0, 1));
          ctx.stroke();
          if (readyEmp) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(125,252,255,0.35)";
            ctx.fill();
          }
          ctx.restore();
        }
      });

      // --- Textos flotantes ---
      for (const tx of g.texts) {
        const p = P({ x: tx.x, y: tx.y, z: 0 });
        D.drawFloatText(ctx, p, tx.text, tx.life, tx.color, tx.size * (v.h / 900));
      }

      // --- Atmósfera ---
      D.drawScanlines(ctx, v.x, v.y, v.w, v.h, t);
      if (!this.poseSm.length) D.drawReticle(ctx, v.x, v.y, v.w, v.h, t, mat.accent, false);
      if (this.opt.stereo) {
        D.drawLens(ctx, v.x, v.y, v.w, v.h);
        this.drawEyeHud(ctx, v, mat);
      } else {
        const g2 = ctx.createRadialGradient(v.x + v.w / 2, v.y + v.h / 2, Math.min(v.w, v.h) * 0.35, v.x + v.w / 2, v.y + v.h / 2, Math.max(v.w, v.h) * 0.75);
        g2.addColorStop(0, "rgba(0,0,0,0)");
        g2.addColorStop(1, "rgba(0,0,0,0.55)");
        ctx.fillStyle = g2;
        ctx.fillRect(v.x, v.y, v.w, v.h);
      }
      ctx.restore();
    }

    if (this.opt.stereo) {
      ctx.fillStyle = "#000";
      ctx.fillRect(Math.floor(cw / 2) - 3, 0, 6, ch);
    }
    ctx.restore();
    void dt;
  }

  private drawBodyInView(ctx: CanvasRenderingContext2D, v: View, mat: Mat, t: number) {
    const p = this.poseSm;
    if (!p.length) return;
    const P = p.map((lm) => this.project(v, lm));
    const S = D.bodyScale(P, v.dw);
    const g = this.g;
    const parts: Record<string, boolean> = {};
    for (const k of Object.keys(this.opt.partOn) as PartId[]) parts[k] = this.opt.partOn[k] && g.installed[k];
    const o: D.BodyOpts = {
      mat,
      parts,
      t,
      energy: g.energy,
      diagnostics: this.opt.diagnostics,
      pulse: g.pulse,
    };

    // Partes aún no alteradas: contorno fantasma del cuerpo real
    (["piernas", "torso", "brazos"] as PartId[]).forEach((k) => {
      if (!parts[k]) D.drawGhost(ctx, P, k === "piernas" ? "piernas" : k === "torso" ? "torso" : "brazos");
    });

    if (parts.piernas) {
      D.drawLeg(ctx, P, "L", S, o);
      D.drawLeg(ctx, P, "R", S, o);
    }
    if (parts.torso) D.drawTorso(ctx, P, S, o);
    if (parts.brazos) {
      D.drawArm(ctx, P, "L", S, o);
      D.drawArm(ctx, P, "R", S, o);
    }
    if (parts.cabeza) D.drawHead(ctx, P, S, o);

    // Manos
    if (parts.manos) {
      this.handSm.forEach((h) => {
        const H = h.map((lm) => this.project(v, lm));
        const hs = Math.hypot(H[0].x - H[9].x, H[0].y - H[9].y);
        D.drawRoboHand(ctx, H, hs, o);
      });
      if (!this.handSm.length) {
        [PI.wristL, PI.wristR].forEach((i) => {
          if (P[i]) D.joint(ctx, P[i], S * 0.13, mat, t, 1);
        });
      }
    }
  }

  private drawEyeHud(ctx: CanvasRenderingContext2D, v: View, mat: Mat) {
    const g = this.g;
    const s = Math.max(10, v.h * 0.028);
    ctx.save();
    ctx.font = `700 ${s}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(v.x + v.w * 0.28, v.y + v.h * 0.03, v.w * 0.44, s * 1.9);
    ctx.fillStyle = mat.core;
    const mm = Math.floor(g.time / 60);
    const ss = Math.floor(g.time % 60);
    ctx.fillText(
      `${g.score.toString().padStart(5, "0")}   ${mm}:${ss.toString().padStart(2, "0")}`,
      v.x + v.w / 2,
      v.y + v.h * 0.03 + s * 1.35,
    );
    // Barra de energía
    const bw = v.w * 0.34;
    const bx = v.x + (v.w - bw) / 2;
    const by = v.y + v.h * 0.07;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(bx, by, bw, s * 0.5);
    ctx.fillStyle = g.energy > 35 ? mat.glow : "#ff5555";
    ctx.fillRect(bx, by, bw * (g.energy / 100), s * 0.5);
    ctx.restore();
  }

  private emitStats() {
    const g = this.g;
    const next = MODULES.find((m) => !g.installed[m.id as PartId]);
    this.onStats({
      score: g.score,
      best: this.best,
      time: g.time,
      energy: g.energy,
      combo: g.combo,
      fps: Math.round(this.fps),
      hands: this.handsFound,
      poseFound: this.poseSm.length > 0,
      installed: { ...g.installed },
      collected: { ...g.collected },
      nextModule: next ? next.id : null,
      status: this.paused ? "PAUSA" : g.over ? (g.victory ? "TRANSFORMACIÓN COMPLETA" : "SISTEMA CAÍDO") : g.running ? "EN MISIÓN" : "MODO LIBRE",
      over: g.over,
      victory: g.victory,
      paused: this.paused,
    });
  }
}
