import type { GrainSettings } from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is unavailable in this browser.");
  return ctx;
}

export function loadImage(src: string, timeoutMs = 30000): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    const timer = window.setTimeout(() => {
      image.src = "";
      reject(new Error("The image took too long to load."));
    }, timeoutMs);

    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("The image could not be loaded."));
    };
    image.src = src;
  });
}

export async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const image = await loadImage(src);
  try {
    await image.decode();
  } catch {
    // Decode is an optimisation; the load event is enough.
  }
  return image;
}

export function applyGrading(
  canvas: HTMLCanvasElement,
  lut: Uint8Array,
  channelWeights: { r: number; g: number; b: number },
): void {
  const ctx = context2d(canvas);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;

  let total = channelWeights.r + channelWeights.g + channelWeights.b;
  if (total <= 0.001) total = 1;
  const wr = channelWeights.r / total;
  const wg = channelWeights.g / total;
  const wb = channelWeights.b / total;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * wr + data[i + 1] * wg + data[i + 2] * wb;
    const value = lut[gray < 0 ? 0 : gray > 255 ? 255 : Math.round(gray)];
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(frame, 0, 0);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Grain is a scaled, seeded noise tile composited in overlay mode. The tile is
 * generated once per render, so large exports stay fast.
 */
export function applyGrain(canvas: HTMLCanvasElement, grain: GrainSettings): void {
  if (grain.amount <= 0) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const base = 256;
  const cell = clamp(grain.size, 0.25, 6);
  const tileSize = Math.max(16, Math.round(base * cell));

  const noise = createCanvas(base, base);
  const noiseCtx = noise.getContext("2d");
  if (!noiseCtx) return;

  const imageData = noiseCtx.createImageData(base, base);
  const random = mulberry32(Math.max(1, Math.round(grain.seed)));
  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = Math.floor(random() * 255);
    imageData.data[i] = value;
    imageData.data[i + 1] = value;
    imageData.data[i + 2] = value;
    imageData.data[i + 3] = 255;
  }
  noiseCtx.putImageData(imageData, 0, 0);

  const tile = createCanvas(tileSize, tileSize);
  const tileCtx = tile.getContext("2d");
  if (!tileCtx) return;
  tileCtx.imageSmoothingEnabled = false;
  tileCtx.drawImage(noise, 0, 0, tileSize, tileSize);

  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = clamp(grain.amount / 100, 0, 1) * 0.92;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: "png" | "jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The browser could not encode this image."));
      },
      format === "png" ? "image/png" : "image/jpeg",
      quality,
    );
  });
}

export function thumbnailDataUrl(
  canvas: HTMLCanvasElement,
  maxWidth = 420,
  quality = 0.78,
): string {
  const scale = Math.min(1, maxWidth / canvas.width);
  const thumb = createCanvas(canvas.width * scale, canvas.height * scale);
  const ctx = thumb.getContext("2d");
  if (!ctx) return "";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/jpeg", quality);
}

/** A neutral stand-in portrait used by template thumbnails. */
export function createPlaceholderPortrait(): HTMLCanvasElement {
  const canvas = createCanvas(800, 1100);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const background = ctx.createLinearGradient(0, 0, 800, 1100);
  background.addColorStop(0, "#3b3a37");
  background.addColorStop(0.55, "#6c6a64");
  background.addColorStop(1, "#262523");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 800, 1100);

  const halo = ctx.createRadialGradient(400, 360, 20, 400, 360, 430);
  halo.addColorStop(0, "rgba(238,234,224,0.78)");
  halo.addColorStop(0.5, "rgba(198,193,182,0.36)");
  halo.addColorStop(1, "rgba(20,20,20,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 800, 1100);

  ctx.fillStyle = "rgba(26,25,23,0.82)";
  ctx.beginPath();
  ctx.ellipse(400, 620, 250, 290, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(400, 1080, 420, 300, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(236,232,223,0.9)";
  ctx.beginPath();
  ctx.ellipse(400, 420, 118, 150, 0, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}
