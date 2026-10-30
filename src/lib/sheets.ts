export interface SheetSource {
  id: string;
  gid: string;
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

  const gid = gidOverride ?? parseSheetGid(raw) ?? "0";
  const csvUrl = published
    ? `https://docs.google.com/spreadsheets/d/e/${id}/pub?output=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

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
