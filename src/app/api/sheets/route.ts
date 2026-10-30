import { NextResponse, type NextRequest } from "next/server";
import { resolveSheetSource } from "@/lib/sheets";
import { guardedFetch, RemoteFetchError } from "@/lib/server/fetch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

function googleHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return (
    host === "docs.google.com" ||
    host.endsWith(".docs.google.com") ||
    host.endsWith(".google.com") ||
    host.endsWith(".googleusercontent.com")
  );
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  const gid = request.nextUrl.searchParams.get("gid") ?? undefined;

  if (!raw) {
    return NextResponse.json({ error: "A Google Sheets URL is required." }, { status: 400 });
  }

  const source = resolveSheetSource(raw, gid);
  if (!source) {
    return NextResponse.json(
      { error: "That is not a valid Google Sheets link." },
      { status: 400 },
    );
  }

  try {
    const result = await guardedFetch(source.csvUrl, {
      maxBytes: MAX_BYTES,
      timeoutMs: 25000,
      allowedContentTypes: ["text/csv", "application/csv", "text/plain"],
      accept: "text/csv,text/plain;q=0.9,*/*;q=0.1",
      hostCheck: googleHost,
    });

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof RemoteFetchError) {
      const upstream = error.upstreamStatus;
      const message =
        error.status === 415
          ? "Google returned a page instead of CSV. Set the sheet to “Anyone with the link can view” and try again."
          : upstream === 401 || upstream === 403
            ? "Google refused access to this sheet. Set Share to “Anyone with the link → Viewer” and try again."
            : upstream === 400
              ? "Google rejected that sheet tab. Open the sheet, copy a fresh link, and try again."
              : upstream === 404
                ? "The sheet was not found. Check the link and its sharing settings."
                : upstream === 429
                  ? "Google is limiting requests right now. Wait a moment and try again."
                  : error.message;
      return NextResponse.json(
        { error: message },
        { status: error.status === 400 ? 400 : 502 },
      );
    }
    return NextResponse.json({ error: "The sheet could not be fetched." }, { status: 502 });
  }
}
