import { buildLut } from "./curve";
import { ensureTemplateFonts } from "./fonts";
import {
  applyGrading,
  applyGrain,
  context2d,
  createCanvas,
  createPlaceholderPortrait,
  loadImageElement,
  roundedRectPath,
  thumbnailDataUrl,
} from "./image";
import { layoutText, setLetterSpacing } from "./text-layout";
import { DEFAULT_PROCESSING, SAMPLE_VALUES } from "./defaults";
import type {
  CropRect,
  ProcessingSettings,
  Template,
  TextLayer,
} from "./types";

const backgroundCache = new Map<string, Promise<HTMLImageElement | null>>();

function backgroundKey(template: Template): string {
  return `${template.id}:${template.updatedAt}:${template.backgroundImage?.length ?? 0}`;
}

export function loadTemplateBackground(
  template: Template,
): Promise<HTMLImageElement | null> {
  if (!template.backgroundImage) return Promise.resolve(null);
  const key = backgroundKey(template);

  const cached = backgroundCache.get(key);
  if (cached) return cached;

  const request = loadImageElement(template.backgroundImage).catch(() => null);
  backgroundCache.set(key, request);

  if (backgroundCache.size > 6) {
    const oldest = backgroundCache.keys().next().value;
    if (oldest) backgroundCache.delete(oldest);
  }
  return request;
}

export interface RenderAssetInput {
  template: Template;
  settings: ProcessingSettings;
  values: Record<string, string>;
  image: HTMLImageElement;
  crop: CropRect;
  scale: number;
}

export async function renderAsset(input: RenderAssetInput): Promise<HTMLCanvasElement> {
  const { template, settings, values, image, crop, scale } = input;
  await ensureTemplateFonts(template);

  const width = Math.max(1, Math.round(template.width * scale));
  const height = Math.max(1, Math.round(template.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = context2d(canvas);

  ctx.fillStyle = template.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const background = await loadTemplateBackground(template);
  if (background) {
    ctx.drawImage(background, 0, 0, width, height);
  }

  const frame = template.photo;
  const fx = frame.x * width;
  const fy = frame.y * height;
  const fw = frame.width * width;
  const fh = frame.height * height;

  if (fw > 1 && fh > 1) {
    const frameCanvas = createCanvas(fw, fh);
    const frameCtx = context2d(frameCanvas);
    frameCtx.imageSmoothingEnabled = true;
    frameCtx.imageSmoothingQuality = "high";
    frameCtx.drawImage(
      image,
      crop.sx,
      crop.sy,
      crop.sw,
      crop.sh,
      0,
      0,
      frameCanvas.width,
      frameCanvas.height,
    );

    const lut = buildLut(
      settings.tone.curve,
      settings.tone.contrast,
      settings.tone.brightness,
    );
    applyGrading(frameCanvas, lut, settings.tone.channelWeights);
    applyGrain(frameCanvas, settings.grain);

    ctx.save();
    roundedRectPath(ctx, fx, fy, fw, fh, frame.radius * scale);
    ctx.clip();
    ctx.drawImage(frameCanvas, fx, fy, fw, fh);
    ctx.restore();

    if (frame.borderWidth > 0) {
      const line = Math.max(0.5, frame.borderWidth * scale);
      ctx.save();
      roundedRectPath(
        ctx,
        fx + line / 2,
        fy + line / 2,
        Math.max(1, fw - line),
        Math.max(1, fh - line),
        Math.max(0, frame.radius * scale - line / 2),
      );
      ctx.strokeStyle = frame.borderColor;
      ctx.lineWidth = line;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawTextLayers(ctx, template.texts, values, scale, template.width, height);

  return canvas;
}

export function drawTextLayers(
  ctx: CanvasRenderingContext2D,
  layers: TextLayer[],
  values: Record<string, string>,
  scale: number,
  templateWidth: number,
  canvasHeight: number,
): void {
  for (const layer of layers) {
    if (!layer.content.trim()) continue;

    const layout = layoutText(ctx, layer, values, scale, templateWidth);
    const left = layer.x * templateWidth * scale;
    const anchor =
      layer.align === "left"
        ? left
        : layer.align === "center"
          ? left + layout.widthPx / 2
          : left + layout.widthPx;
    const top = layer.y * canvasHeight;

    ctx.save();
    ctx.font = layout.font;
    setLetterSpacing(ctx, layer.letterSpacing * scale);
    ctx.fillStyle = layer.color;
    ctx.globalAlpha = Math.min(1, Math.max(0, layer.opacity));
    ctx.textBaseline = "top";
    ctx.textAlign = layer.align;

    layout.lines.forEach((line, index) => {
      ctx.fillText(line, anchor, top + index * layout.lineHeightPx);
    });
    ctx.restore();
  }
}

export async function renderTemplateThumbnail(
  template: Template,
  values: Record<string, string> = SAMPLE_VALUES,
  maxWidth = 560,
): Promise<string> {
  const scale = Math.min(1, maxWidth / template.width);
  const placeholder = createPlaceholderPortrait();
  const image = await loadImageElement(placeholder.toDataURL("image/jpeg", 0.9));

  const canvas = await renderAsset({
    template,
    settings: {
      ...DEFAULT_PROCESSING,
      grain: { ...DEFAULT_PROCESSING.grain, amount: 10 },
    },
    values,
    image,
    crop: { sx: 0, sy: 0, sw: placeholder.width, sh: placeholder.height },
    scale,
  });

  return thumbnailDataUrl(canvas, maxWidth + 40);
}
