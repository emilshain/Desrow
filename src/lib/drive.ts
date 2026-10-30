const DRIVE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "photos.google.com",
]);

export function extractDriveFileId(raw: string): string | null {
  if (!raw) return null;

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /[?&]id=([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
    /\/uc\?export=view&id=([a-zA-Z0-9_-]{10,})/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Accepts Drive share links, Drive direct download links, and ordinary image
 * URLs. Returns a public https URL, or null when the value cannot be used.
 */
export function normalizeImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

  const host = parsed.hostname.toLowerCase();
  if (DRIVE_HOSTS.has(host) || host.endsWith(".googleusercontent.com")) {
    const id = extractDriveFileId(trimmed);
    if (id) {
      return `https://drive.google.com/thumbnail?id=${id}&sz=w2400`;
    }
  }

  return parsed.toString();
}

/** Same-origin URL used by <img>, <canvas> and the face detector. */
export function proxiedImageUrl(raw: string): string | null {
  const normalized = normalizeImageUrl(raw);
  if (!normalized) return null;
  return `/api/image?url=${encodeURIComponent(normalized)}`;
}

export function looksLikeLink(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
