import type { FontKey, TextLayer } from "./types";

export interface FontDefinition {
  key: FontKey;
  label: string;
  stack: string;
  weights: number[];
  note: string;
}

export const FONTS: Record<FontKey, FontDefinition> = {
  sans: {
    key: "sans",
    label: "Inter",
    stack: '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
    weights: [300, 400, 500, 600, 700, 800],
    note: "Neutral grotesk · variable",
  },
  serif: {
    key: "serif",
    label: "Instrument Serif",
    stack: '"Instrument Serif", "Times New Roman", Georgia, serif',
    weights: [400],
    note: "Editorial display serif",
  },
  mono: {
    key: "mono",
    label: "JetBrains Mono",
    stack: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace',
    weights: [400, 500, 700],
    note: "Technical, for IDs and captions",
  },
};

export const FONT_LIST = Object.values(FONTS);

export function canvasFont(layer: Pick<TextLayer, "font" | "weight" | "size">, scale = 1): string {
  return `${layer.weight} ${Math.max(1, layer.size * scale)}px ${FONTS[layer.font].stack}`;
}

/** Canvas does not wait for webfonts on its own, so preload every face we draw. */
export async function ensureTemplateFonts(layers: TextLayer[]): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const fonts = new Set(
    layers.map((layer) => `${layer.weight} 16px ${FONTS[layer.font].stack}`),
  );

  await Promise.all(
    [...fonts].map((font) => document.fonts.load(font).catch(() => undefined)),
  );
  await document.fonts.ready;
}
