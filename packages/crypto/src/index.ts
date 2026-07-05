/** Cryptographic constants for the vault (Module 2). */
export const CRYPTO_CONFIG = {
  PBKDF2_ITERATIONS: 600_000,
  SALT_LENGTH: 16,
  IV_LENGTH: 12,
  KEY_LENGTH: 256,
  ALGORITHM: "AES-GCM" as const,
  HASH: "SHA-256" as const,
} as const;

/** Generates a cryptographically secure random salt. */
export function generateSalt(length = CRYPTO_CONFIG.SALT_LENGTH): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Generates a random IV for AES-GCM encryption. */
export function generateIV(length = CRYPTO_CONFIG.IV_LENGTH): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Derives an AES-256 key from a master password using PBKDF2 (Module 2). */
export async function deriveKey(
  masterPassword: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      hash: CRYPTO_CONFIG.HASH,
    },
    keyMaterial,
    { name: CRYPTO_CONFIG.ALGORITHM, length: CRYPTO_CONFIG.KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts data with AES-256-GCM (Module 2). */
export async function encrypt(
  data: string,
  key: CryptoKey,
  iv?: Uint8Array,
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const encoder = new TextEncoder();
  const usedIv = iv ?? generateIV();
  const ciphertext = await crypto.subtle.encrypt(
    { name: CRYPTO_CONFIG.ALGORITHM, iv: usedIv },
    key,
    encoder.encode(data),
  );
  return { ciphertext, iv: usedIv };
}

/** Decrypts AES-256-GCM ciphertext (Module 2). */
export async function decrypt(
  ciphertext: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: CRYPTO_CONFIG.ALGORITHM, iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

/** Computes SHA-1 hash of input (required for HIBP k-anonymity API). */
export async function sha1(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-1", encoder.encode(input));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Computes SHA-256 hash of input. */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Securely compares two strings in constant time. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Zeroes out a string from memory (best-effort in JS). */
export function zeroString(str: string): void {
  // JS strings are immutable — best effort via reassignment at call site
  void str;
}
