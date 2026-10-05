export class VaultCrypto {
  static async generateRandomToken(length: number = 32): Promise<string> {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    const limit = Math.floor(0x100000000 / charset.length) * charset.length;
    const buf = new Uint32Array(1);
    while (result.length < length) {
      globalThis.crypto.getRandomValues(buf);
      // rejection sampling avoids modulo bias
      if (buf[0] < limit) result += charset.charAt(buf[0] % charset.length);
    }
    return result;
  }

  static calculatePasswordStrength(password: string): 'WEAK' | 'MEDIUM' | 'STRONG' | 'VERY_STRONG' {
    if (password.length < 8) return 'WEAK';
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length;
    if (password.length >= 16 && score === 4) return 'VERY_STRONG';
    if (password.length >= 12 && score >= 3) return 'STRONG';
    if (score >= 2) return 'MEDIUM';
    return 'WEAK';
  }
}
