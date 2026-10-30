import type {
  FontKey,
  FontSelection,
  Template,
  TemplateFont,
  TextLayer,
} from "./types";

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

export const DEVICE_FONT_SUGGESTIONS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Palatino Linotype",
  "Book Antiqua",
  "Garamond",
  "Baskerville",
  "Didot",
  "Optima",
  "Futura",
  "Gill Sans",
  "Copperplate",
  "Impact",
  "Rockwell",
  "Segoe UI",
  "SF Pro Display",
];

const fontFaceRegistry = new Map<string, Promise<void>>();

export function isBuiltinFont(font: string): font is FontKey {
  return font === "sans" || font === "serif" || font === "mono";
}

export function customFontFamily(id: string): string {
  return `Desrow ${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function quotedFamily(family: string): string {
  const safe = family.replace(/["\\]/g, "").trim();
  return safe ? `"${safe}"` : '"Inter Variable"';
}

export function localFontFamily(font: FontSelection): string | null {
  return font.startsWith("local:") ? font.slice("local:".length) : null;
}

export function customFontId(font: FontSelection): string | null {
  return font.startsWith("custom:") ? font.slice("custom:".length) : null;
}

export function fontFamily(font: FontSelection): string {
  if (isBuiltinFont(font)) return FONTS[font].stack;

  const local = localFontFamily(font);
  if (local !== null) {
    return `${quotedFamily(local)}, ui-sans-serif, system-ui, sans-serif`;
  }

  const custom = customFontId(font);
  if (custom !== null) {
    return `${quotedFamily(customFontFamily(custom))}, ui-sans-serif, system-ui, sans-serif`;
  }

  return FONTS.sans.stack;
}

export function fontLabel(
  font: FontSelection,
  templateFonts: TemplateFont[] = [],
): string {
  if (isBuiltinFont(font)) return FONTS[font].label;

  const local = localFontFamily(font);
  if (local !== null) return local;

  const custom = customFontId(font);
  if (custom !== null) {
    const match = templateFonts.find((entry) => entry.id === custom);
    return match?.label ?? "Uploaded font";
  }

  return "Font";
}

export function fontWeights(font: FontSelection): number[] {
  if (isBuiltinFont(font)) return FONTS[font].weights;
  return [100, 200, 300, 400, 500, 600, 700, 800, 900];
}

export function canvasFont(
  layer: Pick<TextLayer, "font" | "weight" | "size">,
  scale = 1,
): string {
  return `${layer.weight} ${Math.max(1, layer.size * scale)}px ${fontFamily(layer.font)}`;
}

/** Registers an embedded font file with the document and the canvas. */
export async function registerFontFace(id: string, dataUrl: string): Promise<void> {
  if (typeof document === "undefined" || typeof FontFace === "undefined") return;

  const existing = fontFaceRegistry.get(id);
  if (existing) return existing;

  const request = (async () => {
    const face = new FontFace(customFontFamily(id), `url(${dataUrl})`);
    const loaded = await face.load();
    document.fonts.add(loaded);
  })();

  fontFaceRegistry.set(id, request);
  try {
    await request;
  } catch (error) {
    fontFaceRegistry.delete(id);
    throw error;
  }
}

async function registerTemplateFonts(fonts: TemplateFont[] = []): Promise<void> {
  await Promise.all(
    fonts.map((font) =>
      registerFontFace(font.id, font.dataUrl).catch(() => undefined),
    ),
  );
}

export async function ensureTemplateFonts(
  template: Pick<Template, "texts" | "fonts">,
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  await registerTemplateFonts(template.fonts ?? []);

  const descriptors = new Set(
    (template.texts ?? []).map(
      (layer) => `${layer.weight} 16px ${fontFamily(layer.font)}`,
    ),
  );

  await Promise.all(
    [...descriptors].map((font) => document.fonts.load(font).catch(() => undefined)),
  );
  await document.fonts.ready;
}

export async function ensureFontFamily(family: string): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await document.fonts.load(`16px ${quotedFamily(family)}`).catch(() => undefined);
}
