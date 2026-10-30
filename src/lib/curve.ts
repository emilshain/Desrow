import type { CurvePoint } from "./types";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function normalizeCurve(points: CurvePoint[]): CurvePoint[] {
  const sorted = [...points]
    .map((point) => ({ x: clamp01(point.x), y: clamp01(point.y) }))
    .sort((a, b) => a.x - b.x);

  const unique: CurvePoint[] = [];
  for (const point of sorted) {
    if (unique.length && Math.abs(unique[unique.length - 1].x - point.x) < 0.001) {
      unique[unique.length - 1] = point;
    } else {
      unique.push(point);
    }
  }

  if (!unique.length) return [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  if (unique[0].x > 0) unique.unshift({ x: 0, y: unique[0].y });
  if (unique[unique.length - 1].x < 1) unique.push({ x: 1, y: unique[unique.length - 1].y });
  unique[0] = { x: 0, y: unique[0].y };
  unique[unique.length - 1] = { x: 1, y: unique[unique.length - 1].y };
  return unique;
}

/** Monotone cubic Hermite interpolation (Fritsch–Carlson style tangents). */
export function evaluateCurve(points: CurvePoint[], x: number): number {
  const p = normalizeCurve(points);
  const t = clamp01(x);

  let index = 0;
  while (index < p.length - 2 && t > p[index + 1].x) index += 1;

  const p0 = p[index];
  const p1 = p[index + 1];
  const h = p1.x - p0.x || 1e-6;
  const slope = (p1.y - p0.y) / h;

  const slopes = p.map((point, i) => {
    if (i === 0 || i === p.length - 1) return 0;
    const prev = p[i - 1];
    const next = p[i + 1];
    const left = (point.y - prev.y) / Math.max(1e-6, point.x - prev.x);
    const right = (next.y - point.y) / Math.max(1e-6, next.x - point.x);
    if (left * right <= 0) return 0;
    return (2 * left * right) / (left + right);
  });

  const m0 = slopes[index] * h;
  const m1 = slopes[index + 1] * h;
  const u = (t - p0.x) / h;
  const u2 = u * u;
  const u3 = u2 * u;

  const value =
    (2 * u3 - 3 * u2 + 1) * p0.y +
    (u3 - 2 * u2 + u) * m0 +
    (-2 * u3 + 3 * u2) * p1.y +
    (u3 - u2) * m1;

  return clamp01(value);
}

export function buildLut(
  points: CurvePoint[],
  contrast = 0,
  brightness = 0,
): Uint8Array {
  const lut = new Uint8Array(256);
  const contrastFactor = Math.pow(2, contrast / 50);
  const exposure = brightness / 200;

  for (let i = 0; i < 256; i += 1) {
    const curved = evaluateCurve(points, i / 255);
    const adjusted = (curved - 0.5) * contrastFactor + 0.5 + exposure;
    lut[i] = Math.round(clamp01(adjusted) * 255);
  }
  return lut;
}

/** SVG path for the curve editor, in a 0..w / 0..h box. */
export function curvePath(points: CurvePoint[], width: number, height: number): string {
  const steps = 96;
  const commands: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = i / steps;
    const y = evaluateCurve(points, x);
    const px = x * width;
    const py = (1 - y) * height;
    commands.push(`${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)}`);
  }
  return commands.join(" ");
}
