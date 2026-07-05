import type { PasswordStrength } from "@pwm/types";

/** Character sets for password generation (Module 4). */
export const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}|;:,.<>?",
} as const;

export interface GeneratorOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: true,
};

/** Generates a cryptographically secure password (Module 4). */
export function generatePassword(options: Partial<GeneratorOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let charset = "";

  if (opts.lowercase) charset += CHARSETS.lowercase;
  if (opts.uppercase) charset += CHARSETS.uppercase;
  if (opts.digits) charset += CHARSETS.digits;
  if (opts.symbols) charset += CHARSETS.symbols;

  if (opts.excludeAmbiguous) {
    charset = charset.replace(/[0O1lI]/g, "");
  }

  if (!charset) throw new Error("At least one character set must be enabled");

  const array = new Uint32Array(opts.length);
  crypto.getRandomValues(array);

  return Array.from(array, (n) => charset[n % charset.length]).join("");
}

/** Calculates password entropy in bits (Module 4). */
export function calculateEntropy(password: string): number {
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;
  return password.length * Math.log2(poolSize || 1);
}

/** Assesses password strength with feedback (Module 4). */
export function assessStrength(password: string): PasswordStrength {
  const entropy = calculateEntropy(password);
  const feedback: string[] = [];

  if (password.length < 12) feedback.push("Use at least 12 characters");
  if (!/[A-Z]/.test(password)) feedback.push("Add uppercase letters");
  if (!/[0-9]/.test(password)) feedback.push("Add numbers");
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push("Add special characters");

  let score: PasswordStrength["score"];
  let label: PasswordStrength["label"];

  if (entropy < 28) { score = 0; label = "very-weak"; }
  else if (entropy < 36) { score = 1; label = "weak"; }
  else if (entropy < 60) { score = 2; label = "fair"; }
  else if (entropy < 128) { score = 3; label = "strong"; }
  else { score = 4; label = "very-strong"; }

  return { score, label, feedback, entropy: Math.round(entropy) };
}

import { DICEWARE_WORDS } from "./words";

/** Generates a Diceware-style passphrase (Module 4). */
export function generatePassphrase(wordCount = 6, separator = "-"): string {
  if (wordCount < 3) throw new Error("Passphrase must have at least 3 words");
  const indices = new Uint32Array(wordCount);
  crypto.getRandomValues(indices);
  return Array.from(indices, (n) => DICEWARE_WORDS[n % DICEWARE_WORDS.length]).join(separator);
}
