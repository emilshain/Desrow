import { promises as dns } from "node:dns";
import net from "node:net";

export class UnsafeUrlError extends Error {
  status = 400;
}

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];
const ALLOWED_PORTS = new Set(["", "80", "443"]);

export function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      a >= 224
    );
  }

  if (net.isIPv6(address)) {
    const value = address.toLowerCase();
    if (value === "::" || value === "::1") return true;
    if (/^f[cd][0-9a-f]{2}:/.test(value)) return true;
    if (/^fe[89ab][0-9a-f]:/.test(value)) return true;
    if (value.startsWith("ff")) return true;

    // IPv4-mapped IPv6 can be written either dotted (::ffff:127.0.0.1) or
    // hexadecimal (::ffff:7f00:1). Normalise both before the IPv4 checks.
    const mapped = value.match(/^::ffff:(.+)$/)?.[1];
    if (mapped) {
      if (net.isIPv4(mapped)) return isPrivateAddress(mapped);
      const hex = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hex) {
        const high = Number.parseInt(hex[1], 16);
        const low = Number.parseInt(hex[2], 16);
        return isPrivateAddress(
          `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`,
        );
      }
    }

    return false;
  }

  return false;
}

function assertHostAllowed(hostname: string): void {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new UnsafeUrlError("The URL has no host.");
  if (host === "localhost" || BLOCKED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new UnsafeUrlError("Local and private hosts are not allowed.");
  }
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new UnsafeUrlError("Private network addresses are not allowed.");
  }
}

function allowlistFor(variable: string | undefined): string[] {
  if (!variable) return [];
  return variable
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Guards both the initial request and each redirect. DNS is re-checked on
 * every hop; the optional allowlist narrows access to known image hosts.
 */
export async function assertSafeRemoteUrl(
  raw: string,
  options: { allowlistVar?: string } = {},
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That URL is not valid.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs can be fetched.");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with embedded credentials are not allowed.");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new UnsafeUrlError("Only standard web ports are allowed.");
  }

  const hostname = url.hostname.toLowerCase();
  assertHostAllowed(hostname);

  const allowlist = allowlistFor(process.env[options.allowlistVar ?? "IMAGE_PROXY_ALLOWLIST"]);
  if (allowlist.length) {
    const allowed = allowlist.some(
      (entry) => hostname === entry || hostname.endsWith(`.${entry}`),
    );
    if (!allowed) {
      throw new UnsafeUrlError("That host is not on the image proxy allowlist.");
    }
  }

  if (!net.isIP(hostname)) {
    let records: { address: string }[];
    try {
      records = await dns.lookup(hostname, { all: true });
    } catch {
      throw new UnsafeUrlError("The host could not be resolved.");
    }
    if (!records.length) throw new UnsafeUrlError("The host could not be resolved.");
    if (records.some((record) => isPrivateAddress(record.address))) {
      throw new UnsafeUrlError("The host resolves to a private network address.");
    }
  }

  return url;
}
