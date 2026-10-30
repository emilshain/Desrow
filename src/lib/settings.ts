import { DEFAULT_PROCESSING } from "./defaults";
import type { ProcessingSettings } from "./types";

const STORAGE_KEY = "desrow.processing.v1";

function cloneDefaults(): ProcessingSettings {
  return JSON.parse(JSON.stringify(DEFAULT_PROCESSING)) as ProcessingSettings;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function loadSettings(): ProcessingSettings {
  const base = cloneDefaults();
  if (typeof window === "undefined") return base;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as {
      crop?: Partial<ProcessingSettings["crop"]>;
      tone?: Partial<Omit<ProcessingSettings["tone"], "channelWeights">> & {
        channelWeights?: Partial<ProcessingSettings["tone"]["channelWeights"]>;
      };
      grain?: Partial<ProcessingSettings["grain"]>;
      output?: Partial<ProcessingSettings["output"]>;
    } | null;
    if (!parsed || typeof parsed !== "object") return base;

    const crop = parsed.crop ?? {};
    const tone = parsed.tone ?? {};
    const grain = parsed.grain ?? {};
    const output = parsed.output ?? {};

    const weights = tone.channelWeights ?? base.tone.channelWeights;
    const curve =
      Array.isArray(tone.curve) && tone.curve.length >= 2
        ? tone.curve.slice(0, 9).map((point: { x?: unknown; y?: unknown }) => ({
            x: num(point?.x, 0, 0, 1),
            y: num(point?.y, 0, 0, 1),
          }))
        : base.tone.curve;

    return {
      crop: {
        detectFaces: bool(crop.detectFaces, base.crop.detectFaces),
        faceScale: num(crop.faceScale, base.crop.faceScale, 8, 100),
        faceX: num(crop.faceX, base.crop.faceX, 0, 100),
        faceY: num(crop.faceY, base.crop.faceY, 0, 100),
      },
      tone: {
        channelWeights: {
          r: num(weights.r, base.tone.channelWeights.r, 0, 1),
          g: num(weights.g, base.tone.channelWeights.g, 0, 1),
          b: num(weights.b, base.tone.channelWeights.b, 0, 1),
        },
        curve,
        contrast: num(tone.contrast, base.tone.contrast, -50, 50),
        brightness: num(tone.brightness, base.tone.brightness, -50, 50),
      },
      grain: {
        amount: num(grain.amount, base.grain.amount, 0, 70),
        size: num(grain.size, base.grain.size, 0.4, 4),
        seed: Math.round(num(grain.seed, base.grain.seed, 1, 999999)),
      },
      output: {
        scale: [1, 1.5, 2].includes(output.scale as number)
          ? (output.scale as number)
          : base.output.scale,
        format: output.format === "jpeg" ? "jpeg" : "png",
        jpegQuality: num(output.jpegQuality, base.output.jpegQuality, 50, 100),
        filenamePattern:
          typeof output.filenamePattern === "string" && output.filenamePattern.trim()
            ? output.filenamePattern
            : base.output.filenamePattern,
        concurrency: Math.round(
          num(output.concurrency, base.output.concurrency, 1, 4),
        ),
      },
    };
  } catch {
    return base;
  }
}

export function storeSettings(settings: ProcessingSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private mode.
  }
}

export function clearStoredSettings(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
