import type { CredentialEntry, SecurityFinding } from "@pwm/types";
import { sha1 } from "@pwm/crypto";
import { assessStrength } from "@pwm/generator";

const HIBP_API = "https://api.pwnedpasswords.com/range/";

/** Detects reused passwords across credentials (Module 5). */
export function detectReusedPasswords(credentials: CredentialEntry[]): SecurityFinding[] {
  const passwordMap = new Map<string, string[]>();
  const findings: SecurityFinding[] = [];

  for (const cred of credentials) {
    const existing = passwordMap.get(cred.password) ?? [];
    existing.push(cred.id);
    passwordMap.set(cred.password, existing);
  }

  for (const [password, ids] of passwordMap) {
    if (ids.length > 1) {
      for (const id of ids) {
        findings.push({
          type: "reused",
          credentialId: id,
          severity: "high",
          message: `Password reused across ${ids.length} accounts`,
        });
      }
    }
    void password;
  }

  return findings;
}

/** Detects weak passwords (Module 5). */
export function detectWeakPasswords(credentials: CredentialEntry[]): SecurityFinding[] {
  return credentials
    .filter((c) => assessStrength(c.password).score <= 1)
    .map((c) => ({
      type: "weak" as const,
      credentialId: c.id,
      severity: "medium" as const,
      message: `Weak password: ${assessStrength(c.password).label}`,
    }));
}

/** Checks password against HIBP using k-anonymity (Module 5). */
export async function checkCompromised(password: string): Promise<number> {
  const hash = await sha1(password);
  const prefix = hash.slice(0, 5).toUpperCase();
  const suffix = hash.slice(5).toUpperCase();

  try {
    const response = await fetch(`${HIBP_API}${prefix}`);
    const text = await response.text();
    for (const line of text.split("\n")) {
      const [hashSuffix, count] = line.split(":");
      if (hashSuffix?.trim() === suffix) return parseInt(count ?? "0", 10);
    }
    return 0;
  } catch {
    return -1; // Network error — check skipped
  }
}

/** Detects expired credentials (Module 5). */
export function detectExpiredCredentials(credentials: CredentialEntry[]): SecurityFinding[] {
  const now = Date.now();
  return credentials
    .filter((c) => c.expiresAt !== undefined && c.expiresAt < now)
    .map((c) => ({
      type: "expired" as const,
      credentialId: c.id,
      severity: "low" as const,
      message: "Credential password has expired",
    }));
}

/** Runs full security audit (Module 5). */
export async function runSecurityAudit(
  credentials: CredentialEntry[],
  options: { checkHibp?: boolean } = { checkHibp: true },
): Promise<SecurityFinding[]> {
  const findings = [
    ...detectReusedPasswords(credentials),
    ...detectWeakPasswords(credentials),
    ...detectExpiredCredentials(credentials),
  ];

  if (options.checkHibp) {
    const seen = new Set<string>();
    for (const cred of credentials) {
      if (seen.has(cred.password)) continue;
      seen.add(cred.password);
      const count = await checkCompromised(cred.password);
      if (count > 0) {
        findings.push({
          type: "compromised",
          credentialId: cred.id,
          severity: count > 1000 ? "critical" : "high",
          message: `Password found in ${count.toLocaleString()} data breaches (HIBP)`,
        });
      }
    }
  }

  return findings;
}
