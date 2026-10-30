import { assertSafeRemoteUrl, UnsafeUrlError } from "./security";

export class RemoteFetchError extends Error {
  status: number;
  /** The HTTP status returned by the remote host, when one was received. */
  upstreamStatus?: number;
  constructor(message: string, status = 502, upstreamStatus?: number) {
    super(message);
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

export interface GuardedFetchOptions {
  maxBytes: number;
  timeoutMs?: number;
  maxRedirects?: number;
  accept?: string;
  allowlistVar?: string;
  allowedContentTypes?: string[];
  hostCheck?: (url: URL) => boolean;
}

export interface GuardedResponse {
  buffer: Buffer;
  contentType: string;
  finalUrl: string;
}

export async function guardedFetch(
  rawUrl: string,
  options: GuardedFetchOptions,
): Promise<GuardedResponse> {
  const maxRedirects = options.maxRedirects ?? 4;
  let current = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    let url: URL;
    try {
      url = await assertSafeRemoteUrl(current, { allowlistVar: options.allowlistVar });
    } catch (error) {
      throw new RemoteFetchError(
        error instanceof UnsafeUrlError ? error.message : "The URL could not be validated.",
        400,
      );
    }

    if (options.hostCheck && !options.hostCheck(url)) {
      throw new RemoteFetchError("That host is not allowed for this endpoint.", 400);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: options.accept ?? "image/*,text/csv,text/plain;q=0.8,*/*;q=0.5",
          "user-agent": "Desrow/0.1 image proxy",
        },
      });
    } catch {
      clearTimeout(timer);
      throw new RemoteFetchError(
        controller.signal.aborted
          ? "The remote server took too long to respond."
          : "The remote server could not be reached.",
      );
    }
    clearTimeout(timer);

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new RemoteFetchError("The remote server returned an invalid redirect.", 502);
      current = new URL(location, url).toString();
      continue;
    }

    if (!response.ok) {
      throw new RemoteFetchError(
        response.status === 404
          ? "The file was not found at that link."
          : "The remote server rejected the request.",
        502,
        response.status,
      );
    }

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (
      options.allowedContentTypes?.length &&
      !options.allowedContentTypes.some((type) => contentType.startsWith(type))
    ) {
      throw new RemoteFetchError(
        "That link did not return a supported file. Check the sharing settings.",
        415,
      );
    }

    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (declaredLength > options.maxBytes) {
      throw new RemoteFetchError("The remote file is too large.", 413);
    }

    if (!response.body) throw new RemoteFetchError("The remote file was empty.", 502);

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > options.maxBytes) {
          await reader.cancel();
          throw new RemoteFetchError("The remote file is too large.", 413);
        }
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof RemoteFetchError) throw error;
      throw new RemoteFetchError("The remote file could not be read.", 502);
    }

    return {
      buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
      contentType,
      finalUrl: url.toString(),
    };
  }

  throw new RemoteFetchError("Too many redirects.", 508);
}
