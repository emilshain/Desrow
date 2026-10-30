const TOKEN_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function findToken(input: string): string[] {
  const found: string[] = [];
  for (const match of input.matchAll(TOKEN_PATTERN)) {
    found.push(match[1].trim());
  }
  return found;
}

/** Case-insensitive {{column}} resolution against a row's values. */
export function resolveTokens(input: string, values: Record<string, string>): string {
  return input.replace(TOKEN_PATTERN, (_match, rawKey: string) => {
    const target = rawKey.trim().toLowerCase();
    const key = Object.keys(values).find(
      (candidate) => candidate.trim().toLowerCase() === target,
    );
    return key ? (values[key] ?? "") : "";
  });
}

export function slugify(input: string, fallback = "record"): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

export function extensionFor(format: "png" | "jpeg"): string {
  return format === "png" ? "png" : "jpg";
}

export function safeFilename(input: string): string {
  return input
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);
}

export function buildFilename(input: {
  pattern: string;
  values: Record<string, string>;
  index: number;
  format: "png" | "jpeg";
  fallbackLabel: string;
}): string {
  const resolved = resolveTokens(input.pattern, {
    ...input.values,
    index: String(input.index),
  });
  const base = safeFilename(resolved || `${input.fallbackLabel}-${input.index}`);
  return `${base || `record-${input.index}`}.${extensionFor(input.format)}`;
}

export function fileNameWithoutExtension(filename: string): string {
  return filename.replace(/\.[a-z0-9]+$/i, "");
}
