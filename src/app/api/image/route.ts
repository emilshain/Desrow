import { NextResponse, type NextRequest } from "next/server";
import { extractDriveFileId, normalizeImageUrl } from "@/lib/drive";
import { guardedFetch, RemoteFetchError } from "@/lib/server/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

/** SVG is deliberately excluded: it can carry script and is served inline. */
const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/webp",
  "image/avif",
  "image/gif",
];

function imageResponse(buffer: Buffer, contentType: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-length": String(buffer.byteLength),
      "cache-control": "private, max-age=3600, stale-while-revalidate=86400",
      "content-security-policy": "default-src 'none'; sandbox",
      "cross-origin-resource-policy": "same-origin",
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
    },
  });
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");

  if (!raw) {
    return NextResponse.json({ error: "A url parameter is required." }, { status: 400 });
  }
  if (raw.length > 4096) {
    return NextResponse.json({ error: "That URL is too long." }, { status: 414 });
  }

  const normalized = normalizeImageUrl(raw);
  if (!normalized) {
    return NextResponse.json(
      { error: "That value is not a supported image URL." },
      { status: 400 },
    );
  }

  const candidates = [normalized];
  const driveId = extractDriveFileId(normalized);
  if (driveId) {
    candidates.push(`https://lh3.googleusercontent.com/d/${driveId}=w2400`);
  }

  let lastError = "The image could not be fetched.";
  let lastStatus = 502;

  for (const candidate of candidates) {
    try {
      const result = await guardedFetch(candidate, {
        maxBytes: MAX_BYTES,
        timeoutMs: 25000,
        allowedContentTypes: SUPPORTED_IMAGE_TYPES,
        accept: "image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8",
      });
      return imageResponse(result.buffer, result.contentType);
    } catch (error) {
      if (error instanceof RemoteFetchError) {
        lastError = error.message;
        lastStatus = error.status;
      }
    }
  }

  return NextResponse.json(
    {
      error: lastError,
      hint: "Google Drive files must be shared with anyone who has the link.",
    },
    { status: lastStatus },
  );
}
