# Password Manager — Threat Model

## STRIDE Analysis

| Threat | Description | Mitigation | Status |
|--------|-------------|------------|--------|
| **Spoofing** | Fake login page phishing | Origin validation + homograph detection on autofill | ✅ Implemented |
| **Tampering** | Modified vault ciphertext | AES-GCM authentication tags reject tampered data | ✅ Implemented |
| **Repudiation** | Denied autofill action | Local audit via service worker logging | ⚠️ Basic |
| **Information Disclosure** | Memory dump of master key | Auto-lock timer clears keys from memory | ✅ Implemented |
| **Denial of Service** | Vault corruption | Checksum via GCM auth tag; encrypted backups via sync | ✅ Implemented |
| **Elevation of Privilege** | XSS in content script | Minimal permissions, no eval, CSP on extension pages | ✅ Implemented |

## OWASP Top 10 (Extension Context)

| OWASP Risk | Application | Mitigation |
|------------|-------------|------------|
| A01 Broken Access Control | Vault unlock without password | PBKDF2 600k iterations; key never stored |
| A02 Cryptographic Failures | Weak encryption | AES-256-GCM + PBKDF2; HIBP uses SHA-1 k-anonymity |
| A03 Injection | Malicious page scripts | Content script isolated world; origin checks |
| A04 Insecure Design | Plaintext credential storage | Zero-knowledge encrypted vault |
| A05 Security Misconfiguration | Over-broad permissions | Least-privilege manifest |
| A07 Identification Failures | Weak master password | Strength meter on generator |
| A08 Software Integrity | Tampered extension | Chrome Web Store signing |

## Attack Surface

```
User Input → Popup/Options UI → Background SW → Vault (encrypted)
                    ↓
              Content Script → Page DOM (untrusted)
                    ↓
              Injected Script → Form fields (untrusted)
```

**Trusted boundaries:** Background SW, Vault crypto, IndexedDB ciphertext  
**Untrusted boundaries:** All webpage DOM, network responses (except HIBP hash prefix)

## Penetration Testing Checklist

- [ ] Attempt autofill on origin-mismatched phishing page
- [ ] Attempt homograph URL (punycode) autofill
- [ ] Verify vault remains locked after auto-lock timeout
- [ ] Verify credentials not readable without master password
- [ ] Verify HIBP only sends 5-char hash prefix
- [ ] Verify WebAuthn passkey stored encrypted in vault
- [ ] Verify sync payload is encrypted before transmission
- [ ] Test iframe form detection with `all_frames: true`

## Security Review Summary

The extension follows zero-knowledge architecture: the master password derives an AES key via PBKDF2, and all credentials are encrypted at rest. Autofill enforces strict origin matching and blocks homograph attacks. WebAuthn passkeys and TOTP entries are stored inside the encrypted vault blob.

**Residual risks:**
- JavaScript strings are immutable — best-effort memory clearing only
- Simulated sync uses chrome.storage.local (production would use E2E encrypted remote backend)
- Content scripts cannot fully prevent sophisticated DOM manipulation attacks
