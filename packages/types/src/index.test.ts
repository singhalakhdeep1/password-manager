import { describe, expect, it } from "vitest";
import type { ExtensionMessage, CredentialEntry } from "./index";

describe("@pwm/types", () => {
  it("ExtensionMessage shape is valid", () => {
    const message: ExtensionMessage = { type: "PING", timestamp: Date.now() };
    expect(message.type).toBe("PING");
  });

  it("CredentialEntry shape is valid", () => {
    const cred: CredentialEntry = {
      id: "1", title: "GitHub", username: "user", password: "pass",
      url: "https://github.com", tags: [], createdAt: Date.now(), updatedAt: Date.now(),
    };
    expect(cred.title).toBe("GitHub");
  });
});
