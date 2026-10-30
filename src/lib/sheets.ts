export interface SheetSource {
  id: string;
  /** Sheet tab ID, or null when the link does not specify one. */
  gid: string | null;
  published: boolean;
  csvUrl: string;
}

const SHEETS_HOST = "docs.google.com";

export function parseSheetGid(raw: string): string | null {
  const hashMatch = raw.match(/[#&]gid=(\d+)/);
  if (hashMatch?.[1]) return hashMatch[1];
  try {
    const url = new URL(raw);
    const gid = url.searchParams.get("gid");
    return gid && /^\d+$/.test(gid) ? gid : null;
  } catch {
    return null;
  }
}

/** Accepts /spreadsheets/d/{id}/… and /spreadsheets/d/e/{2PACX…}/pubhtml links. */
export function resolveSheetSource(raw: string, gidOverride?: string): SheetSource | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname.toLowerCase() !== SHEETS_HOST) return null;

  const published = url.pathname.match(/^\/spreadsheets\/d\/e\/([a-zA-Z0-9_-]+)/);
  const standard = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  const id = published?.[1] ?? standard?.[1];
  if (!id) return null;

  const requestedGid = gidOverride ?? parseSheetGid(raw);
  const gid = requestedGid && /^\d+$/.test(requestedGid) ? requestedGid : null;
  // Omitting gid lets Google use the first visible tab. Forcing gid=0 breaks
  // sheets whose first tab has a different (or reused) tab ID.
  const gidParam = gid ? `&gid=${gid}` : "";
  const csvUrl = published
    ? `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv${gidParam}`
    : `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gidParam}`;

  return {
    id,
    gid,
    published: Boolean(published),
    csvUrl,
  };
}

export function isGoogleSheetsUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return (
      url.hostname.toLowerCase() === SHEETS_HOST &&
      /^\/spreadsheets\/d\/(e\/)?[a-zA-Z0-9_-]+/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
