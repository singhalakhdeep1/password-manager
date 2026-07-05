import type { TOTPEntry } from "@pwm/types";

/** Generates a TOTP code per RFC 6238 (Module 9). */
export async function generateTOTP(entry: TOTPEntry, timestamp = Date.now()): Promise<string> {
  const counter = Math.floor(timestamp / 1000 / entry.period);
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setBigUint64(0, BigInt(counter));

  const key = await importTOTPKey(entry.secret, entry.algorithm);
  const hmac = await crypto.subtle.sign("HMAC", key, counterBuffer);
  const hmacArray = new Uint8Array(hmac);

  const offset = hmacArray[hmacArray.length - 1]! & 0x0f;
  const code =
    (((hmacArray[offset]! & 0x7f) << 24) |
      ((hmacArray[offset + 1]! & 0xff) << 16) |
      ((hmacArray[offset + 2]! & 0xff) << 8) |
      (hmacArray[offset + 3]! & 0xff)) %
    Math.pow(10, entry.digits);

  return code.toString().padStart(entry.digits, "0");
}

/** Returns seconds remaining in current TOTP period. */
export function getTOTPRemaining(entry: TOTPEntry, timestamp = Date.now()): number {
  return entry.period - (Math.floor(timestamp / 1000) % entry.period);
}

/** Parses otpauth:// URI from QR code (Module 9). */
export function parseOTPAuthURI(uri: string): Partial<TOTPEntry> | null {
  try {
    const url = new URL(uri);
    if (url.protocol !== "otpauth:") return null;

    const type = url.hostname;
    if (type !== "totp") return null;

    const label = decodeURIComponent(url.pathname.slice(1));
    const params = url.searchParams;

    return {
      issuer: params.get("issuer") ?? label.split(":")[0] ?? "",
      account: label.split(":")[1] ?? label,
      secret: params.get("secret") ?? "",
      algorithm: (params.get("algorithm") as TOTPEntry["algorithm"]) ?? "SHA1",
      digits: parseInt(params.get("digits") ?? "6", 10) as 6 | 8,
      period: parseInt(params.get("period") ?? "30", 10),
    };
  } catch {
    return null;
  }
}

async function importTOTPKey(secret: string, algorithm: TOTPEntry["algorithm"]): Promise<CryptoKey> {
  const decoded = base32Decode(secret);
  const hashMap: Record<TOTPEntry["algorithm"], string> = {
    SHA1: "SHA-1",
    SHA256: "SHA-256",
    SHA512: "SHA-512",
  };
  return crypto.subtle.importKey(
    "raw",
    decoded,
    { name: "HMAC", hash: hashMap[algorithm] },
    false,
    ["sign"],
  );
}

function base32Decode(input: string): ArrayBuffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes).buffer;
}
