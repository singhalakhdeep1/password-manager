import { describe, it, expect } from 'vitest';
import { VaultCrypto } from '../packages/crypto/src/vault-crypto';

describe('Password Manager Vault Crypto', () => {
  it('should evaluate password strength correctly', () => {
    expect(VaultCrypto.calculatePasswordStrength('12345')).toBe('WEAK');
    expect(VaultCrypto.calculatePasswordStrength('Tr0ub4dour&3!P@ss')).toBe('VERY_STRONG');
  });

  it('should generate requested length random passwords', async () => {
    const pwd = await VaultCrypto.generateRandomToken(24);
    expect(pwd.length).toBe(24);
  });
});
