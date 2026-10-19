import { describe, expect, it, vi } from "vitest";
import type { CredentialEntry } from "@pwm/types";
import {
  checkCompromised,
  detectReusedPasswords,
  detectWeakPasswords,
  runSecurityAudit,
} from "./index.js";

function makeCred(overrides: Partial<CredentialEntry> = {}): CredentialEntry {
  return {
    id: "1",
    title: "Test",
    username: "user",
    password: "password123",
    url: "https://example.com",
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("@pwm/security-audit", () => {
  it("detects reused passwords", () => {
    const creds = [
      makeCred({ id: "a", password: "same" }),
      makeCred({ id: "b", password: "same" }),
      makeCred({ id: "c", password: "unique" }),
    ];
    const findings = detectReusedPasswords(creds);
    expect(findings).toHaveLength(2);
    expect(findings.every((f) => f.type === "reused")).toBe(true);
  });

  it("detects weak passwords", () => {
    const findings = detectWeakPasswords([makeCred({ password: "abc" })]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.type).toBe("weak");
  });

  it("checkCompromised returns 0 on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const result = await checkCompromised("test");
    expect(result).toBe(-1);
    vi.unstubAllGlobals();
  });

  it("runSecurityAudit merges all finding types", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ text: () => Promise.resolve("") }),
    );
    const findings = await runSecurityAudit(
      [makeCred({ id: "a", password: "abc" }), makeCred({ id: "b", password: "abc" })],
      { checkHibp: true },
    );
    expect(findings.some((f) => f.type === "reused")).toBe(true);
    expect(findings.some((f) => f.type === "weak")).toBe(true);
    vi.unstubAllGlobals();
  });
});
