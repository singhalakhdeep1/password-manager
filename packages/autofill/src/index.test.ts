import { describe, expect, it } from "vitest";
import { detectHomograph, validateOrigin } from "./index.js";

describe("@pwm/autofill", () => {
  it("validateOrigin matches exact origins", () => {
    expect(validateOrigin("https://github.com/login", "https://github.com/page")).toBe(true);
    expect(validateOrigin("https://github.com", "https://evil.com")).toBe(false);
  });

  it("validateOrigin rejects invalid URLs", () => {
    expect(validateOrigin("not-a-url", "https://example.com")).toBe(false);
  });

  it("detectHomograph flags punycode hostnames", () => {
    expect(detectHomograph("https://xn--pple-43d.com")).toBe(true);
    expect(detectHomograph("https://apple.com")).toBe(false);
  });
});
