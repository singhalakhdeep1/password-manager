import { describe, expect, it } from "vitest";
import type { TOTPEntry } from "@pwm/types";
import { generateTOTP, getTOTPRemaining, parseOTPAuthURI } from "./index";

describe("@pwm/totp", () => {
  const entry: TOTPEntry = {
    id: "1",
    issuer: "Test",
    account: "user@test.com",
    secret: "JBSWY3DPEHPK3PXP",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  };

  it("generates 6-digit TOTP code", async () => {
    const code = await generateTOTP(entry, 59_000);
    expect(code).toMatch(/^\d{6}$/);
    expect(code).toBe("287082");
  });

  it("returns remaining seconds in period", () => {
    expect(getTOTPRemaining(entry, 65_000)).toBe(25);
  });

  it("parses otpauth URI", () => {
    const parsed = parseOTPAuthURI(
      "otpauth://totp/Issuer:user@email.com?secret=JBSWY3DPEHPK3PXP&issuer=Issuer&digits=6",
    );
    expect(parsed?.secret).toBe("JBSWY3DPEHPK3PXP");
    expect(parsed?.issuer).toBe("Issuer");
    expect(parsed?.digits).toBe(6);
  });
});
