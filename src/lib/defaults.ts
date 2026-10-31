import type {
  CurvePoint,
  ProcessingSettings,
  Template,
  TextLayer,
} from "./types";

export const DEFAULT_CURVE: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.24, y: 0.2 },
  { x: 0.5, y: 0.51 },
  { x: 0.78, y: 0.84 },
  { x: 1, y: 1 },
];

export const CURVE_PRESETS: { name: string; points: CurvePoint[] }[] = [
  { name: "Neutral", points: DEFAULT_CURVE },
  {
    name: "Film",
    points: [
      { x: 0, y: 0.04 },
      { x: 0.22, y: 0.17 },
      { x: 0.5, y: 0.52 },
      { x: 0.78, y: 0.86 },
      { x: 1, y: 0.98 },
    ],
  },
  {
    name: "Hard",
    points: [
      { x: 0, y: 0 },
      { x: 0.22, y: 0.1 },
      { x: 0.5, y: 0.5 },
      { x: 0.78, y: 0.9 },
      { x: 1, y: 1 },
    ],
  },
  {
    name: "Matte",
    points: [
      { x: 0, y: 0.09 },
      { x: 0.25, y: 0.26 },
      { x: 0.5, y: 0.52 },
      { x: 0.75, y: 0.78 },
      { x: 1, y: 0.93 },
    ],
  },
];

export const DEFAULT_PROCESSING: ProcessingSettings = {
  crop: {
    detectFaces: true,
    fitToFrame: false,
    autoFit: true,
    faceScale: 38,
    faceX: 50,
    faceY: 42,
  },
  tone: {
    channelWeights: { r: 0.3, g: 0.59, b: 0.11 },
    curve: DEFAULT_CURVE,
    contrast: 6,
    brightness: 0,
  },
  grain: {
    amount: 18,
    size: 1.2,
    seed: 1337,
  },
  output: {
    scale: 1,
    format: "png",
    jpegQuality: 92,
    filenamePattern: "{{name}}-{{index}}",
    concurrency: 2,
  },
};

export const TEMPLATE_PRESETS = [
  { label: "Portrait pass", width: 900, height: 1200 },
  { label: "Square card", width: 1200, height: 1200 },
  { label: "Wide credential", width: 1400, height: 900 },
  { label: "Print portrait", width: 1500, height: 2000 },
];

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function textLayer(
  partial: Partial<TextLayer> & Pick<TextLayer, "name" | "content">,
): TextLayer {
  return {
    id: uid(),
    name: partial.name,
    content: partial.content,
    x: partial.x ?? 0.08,
    y: partial.y ?? 0.84,
    width: partial.width ?? 0.84,
    font: partial.font ?? "serif",
    size: partial.size ?? 64,
    weight: partial.weight ?? 400,
    letterSpacing: partial.letterSpacing ?? 0,
    lineHeight: partial.lineHeight ?? 1.05,
    maxLines: partial.maxLines ?? 0,
    align: partial.align ?? "left",
    color: partial.color ?? "#f2efe7",
    uppercase: partial.uppercase ?? false,
    opacity: partial.opacity ?? 1,
  };
}

export function createTemplate(input?: {
  name?: string;
  width?: number;
  height?: number;
}): Template {
  const now = Date.now();
  const width = input?.width ?? 900;
  const height = input?.height ?? 1200;

  return {
    id: uid(),
    name: input?.name ?? "Untitled template",
    width,
    height,
    backgroundColor: "#0c0c0d",
    backgroundImage: null,
    fonts: [],
    photo: {
      x: 0,
      y: 0,
      width: 1,
      height: 0.8,
      radius: 0,
      borderWidth: 0,
      borderColor: "#f2efe7",
    },
    texts: [
      textLayer({
        name: "Name",
        content: "{{name}}",
        x: 0.07,
        y: 0.845,
        width: 0.86,
        size: Math.round(width * 0.082),
        font: "serif",
      }),
      textLayer({
        name: "Role",
        content: "{{title}}",
        x: 0.075,
        y: 0.915,
        width: 0.8,
        size: Math.round(width * 0.021),
        font: "sans",
        weight: 400,
        letterSpacing: 1.5,
        color: "#a7a297",
      }),
      textLayer({
        name: "Footer",
        content: "DESROW / PORTRAIT ARCHIVE",
        x: 0.075,
        y: 0.962,
        width: 0.8,
        size: Math.round(width * 0.0135),
        font: "mono",
        weight: 500,
        letterSpacing: 2.4,
        color: "#6f6c64",
        uppercase: true,
      }),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export const SAMPLE_VALUES: Record<string, string> = {
  name: "Avery Sinclair",
  title: "Head of Program",
  id: "DSW-0042",
  cohort: "Autumn 2026",
};

export function sampleValuesFor(columns: string[]): Record<string, string> {
  const values: Record<string, string> = { ...SAMPLE_VALUES };
  for (const column of columns) {
    const key = column.trim().toLowerCase();
    if (!(key in values)) {
      values[key] = `Sample ${column}`;
    }
  }
  return values;
}
