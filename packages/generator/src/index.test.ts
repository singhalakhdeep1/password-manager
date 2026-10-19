import { describe, expect, it } from "vitest";
import { assessStrength, calculateEntropy, generatePassphrase, generatePassword } from "./index.js";

describe("@pwm/generator", () => {
  it("generates password of requested length", () => {
    const pwd = generatePassword({ length: 24 });
    expect(pwd).toHaveLength(24);
  });

  it("throws when no charset selected", () => {
    expect(() =>
      generatePassword({ lowercase: false, uppercase: false, digits: false, symbols: false }),
    ).toThrow();
  });

  it("assesses strength with feedback", () => {
    const weak = assessStrength("abc");
    expect(weak.score).toBeLessThanOrEqual(1);
    expect(weak.feedback.length).toBeGreaterThan(0);

    const strong = assessStrength("Xk9#mP2$vL8@nQ4!wR6");
    expect(strong.score).toBeGreaterThanOrEqual(2);
  });

  it("calculates entropy based on character pool", () => {
    expect(calculateEntropy("aaaa")).toBeGreaterThan(0);
    expect(calculateEntropy("Aa1!")).toBeGreaterThan(calculateEntropy("aaaa"));
  });

  it("generates Diceware passphrase with separator", () => {
    const phrase = generatePassphrase(4, "-");
    expect(phrase.split("-")).toHaveLength(4);
    expect(phrase.length).toBeGreaterThan(10);
  });
});
