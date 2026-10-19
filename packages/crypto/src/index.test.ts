import { describe, expect, it } from "vitest";
import {
  CRYPTO_CONFIG,
  constantTimeEqual,
  decrypt,
  deriveKey,
  encrypt,
  generateIV,
  generateSalt,
  sha256,
} from "./index.js";

describe("@pwm/crypto", () => {
  it("generates salt and IV of configured lengths", () => {
    expect(generateSalt().length).toBe(CRYPTO_CONFIG.SALT_LENGTH);
    expect(generateIV().length).toBe(CRYPTO_CONFIG.IV_LENGTH);
  });

  it("derives key and round-trips AES-256-GCM encrypt/decrypt", async () => {
    const salt = generateSalt();
    const key = await deriveKey("test-master-password", salt);
    const plaintext = '{"credentials":[]}';
    const { ciphertext, iv } = await encrypt(plaintext, key);
    const decrypted = await decrypt(ciphertext, key, iv);
    expect(decrypted).toBe(plaintext);
  });

  it("fails decrypt with wrong key", async () => {
    const salt = generateSalt();
    const key = await deriveKey("correct-password", salt);
    const wrongKey = await deriveKey("wrong-password", salt);
    const { ciphertext, iv } = await encrypt("secret", key);
    await expect(decrypt(ciphertext, wrongKey, iv)).rejects.toThrow();
  });

  it("computes SHA-256 hex digest", async () => {
    const hash = await sha256("password");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(
      "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    );
  });

  it("constantTimeEqual compares strings safely", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});
