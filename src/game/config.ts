// ---------------------------------------------------------------------------
// Configuración general del juego "PROTOCOLO ANDROIDE"
// ---------------------------------------------------------------------------

export type Pt = { x: number; y: number; z: number };

export type Mat = {
  id: string;
  name: string;
  hull: string;
  hullDark: string;
  edge: string;
  accent: string;
  glow: string;
  core: string;
};

export const MATERIALS: Record<string, Mat> = {
  cromo: {
    id: "cromo",
    name: "Cromo",
    hull: "#e2e9f4",
    hullDark: "#5a6a80",
    edge: "#080d16",
    accent: "#4dd8ff",
    glow: "#7fe9ff",
    core: "#d8f8ff",
  },
  carbono: {
    id: "carbono",
    name: "Carbono",
    hull: "#454b55",
    hullDark: "#15181e",
    edge: "#04060a",
    accent: "#ff8a3d",
    glow: "#ffb066",
    core: "#ffe0b8",
  },
  neon: {
    id: "neon",
    name: "Neón",
    hull: "#232f57",
    hullDark: "#0a0f1f",
    edge: "#03050c",
    accent: "#ff2fd0",
    glow: "#ff7ae6",
    core: "#7dfcff",
  },
  oro: {
    id: "oro",
    name: "Oro",
    hull: "#f7dd94",
    hullDark: "#8a6420",
    edge: "#241703",
    accent: "#fff6cf",
    glow: "#ffe9a8",
    core: "#fffbe8",
  },
  militar: {
    id: "militar",
    name: "Militar",
    hull: "#77825f",
    hullDark: "#2b3122",
    edge: "#0b0e08",
    accent: "#c3ff5a",
    glow: "#d6ff8f",
    core: "#eaffd0",
  },
  iridio: {
    id: "iridio",
    name: "Iridio",
    hull: "#f2fbff",
    hullDark: "#79a9cc",
    edge: "#041018",
    accent: "#a8ffea",
    glow: "#c9fff2",
    core: "#ffffff",
  },
};

export type ModuleDef = {
  id: string;
  label: string;
  short: string;
  icon: string;
  need: number;
  hint: string;
};

// Módulos que se van "instalando" sobre el cuerpo real del jugador.
export const MODULES: ModuleDef[] = [
  {
    id: "manos",
    label: "Manos biónicas",
    short: "MANOS",
    icon: "✋",
    need: 4,
    hint: "Falanges servo-accionadas con sensores táctiles",
  },
  {
    id: "brazos",
    label: "Brazos hidráulicos",
    short: "BRAZOS",
    icon: "💪",
    need: 5,
    hint: "Pistones de alta presión y blindaje segmentado",
  },
  {
    id: "torso",
    label: "Torso blindado",
    short: "TORSO",
    icon: "🛡️",
    need: 6,
    hint: "Placa pectoral y reactor de energía central",
  },
  {
    id: "piernas",
    label: "Piernas de carbono",
    short: "PIERNAS",
    icon: "🦵",
    need: 6,
    hint: "Fibra de carbono con amortiguación magnética",
  },
  {
    id: "cabeza",
    label: "Casco sensorial",
    short: "CASCO",
    icon: "🪖",
    need: 5,
    hint: "Visor holográfico y antena de enlace",
  },
];

export const TOTAL_CUBES = MODULES.reduce((a, m) => a + m.need, 0);

// Índices de BlazePose (33 puntos)
export const PI = {
  nose: 0,
  eyeL: 2,
  eyeR: 5,
  earL: 7,
  earR: 8,
  shoulderL: 11,
  shoulderR: 12,
  elbowL: 13,
  elbowR: 14,
  wristL: 15,
  wristR: 16,
  indexL: 19,
  indexR: 20,
  hipL: 23,
  hipR: 24,
  kneeL: 25,
  kneeR: 26,
  ankleL: 27,
  ankleR: 28,
  heelL: 29,
  heelR: 30,
  footL: 31,
  footR: 32,
} as const;

// Cadenas de huesos por grupo corporal
export const BONES = {
  torso: [
    [11, 12],
    [11, 23],
    [12, 24],
    [23, 24],
  ],
  brazos: [
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
  ],
  piernas: [
    [23, 25],
    [25, 27],
    [27, 31],
    [24, 26],
    [26, 28],
    [28, 32],
  ],
} as const;

export const HAND_BONES: number[][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

export const FINGER_TIPS = [4, 8, 12, 16, 20];

export const GAME_TIME = 120;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
