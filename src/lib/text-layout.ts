import { canvasFont } from "./fonts";
import { resolveTokens } from "./tokens";
import type { TextLayer } from "./types";

export interface TextLayout {
  lines: string[];
  font: string;
  widthPx: number;
  lineHeightPx: number;
  heightPx: number;
}

type CanvasWithSpacing = CanvasRenderingContext2D & { letterSpacing?: string };

export function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  const target = ctx as CanvasWithSpacing;
  try {
    target.letterSpacing = `${px}px`;
  } catch {
    // Older browsers simply render without tracking.
  }
}

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidth: number,
): string[] {
  if (!paragraph) return [""];
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines: string[] = [];
  let current = "";

  const pushWord = (word: string) => {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      return;
    }
    lines.push(current);
    current = word;
  };

  for (const word of words) {
    if (ctx.measureText(word).width > maxWidth && !current) {
      // A single unbreakable word: split by character.
      let chunk = "";
      for (const char of word) {
        if (ctx.measureText(chunk + char).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      current = chunk;
      continue;
    }
    pushWord(word);
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function layoutText(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  values: Record<string, string>,
  scale: number,
  templateWidth: number,
): TextLayout {
  const resolved = resolveTokens(layer.content, values);
  const text = layer.uppercase ? resolved.toUpperCase() : resolved;
  const font = canvasFont(layer, scale);

  ctx.save();
  ctx.font = font;
  setLetterSpacing(ctx, layer.letterSpacing * scale);

  const widthPx = Math.max(8, layer.width * templateWidth * scale);
  const paragraphs = text.split(/\r?\n/);
  const lines = paragraphs.flatMap((paragraph) => wrapParagraph(ctx, paragraph, widthPx));
  const lineHeightPx = layer.size * layer.lineHeight * scale;
  ctx.restore();

  return {
    lines,
    font,
    widthPx,
    lineHeightPx,
    heightPx: Math.max(lineHeightPx, lines.length * lineHeightPx),
  };
}
