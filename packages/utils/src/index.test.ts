import { describe, expect, it } from "vitest";
import { generateId, maskString, safeJsonParse } from "./index.js";

describe("@pwm/utils", () => {
  it("generateId returns unique strings", () => {
    expect(generateId()).not.toBe(generateId());
  });

  it("maskString hides most characters", () => {
    expect(maskString("password123")).toBe("•••••••123");
  });

  it("safeJsonParse returns fallback on invalid JSON", () => {
    expect(safeJsonParse("invalid", { ok: false })).toEqual({ ok: false });
  });
});
