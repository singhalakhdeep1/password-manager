import { describe, expect, it } from "vitest";
import { isWebAuthnAvailable, credentialIdToBase64 } from "./index.js";

describe("@pwm/webauthn", () => {
  it("isWebAuthnAvailable returns boolean", () => {
    expect(typeof isWebAuthnAvailable()).toBe("boolean");
  });

  it("credentialIdToBase64 encodes buffer", () => {
    const buf = new Uint8Array([1, 2, 3]).buffer;
    expect(credentialIdToBase64(buf)).toBeTruthy();
  });
});
