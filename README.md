# Password Manager

Zero-knowledge Chrome extension password manager with encrypted vault, secure autofill, TOTP authenticator, and WebAuthn passkey support.

## Features

- **AES-256-GCM + PBKDF2** — Zero-knowledge encryption core
- **Encrypted Vault** — IndexedDB storage for credentials, notes, TOTP entries
- **Password Generator** — CSPRNG + Diceware passphrases with strength meter
- **Security Audit** — HIBP k-anonymity, reuse/weak/expired detection
- **Secure Autofill** — Origin validation, Shadow DOM form detection
- **TOTP Authenticator** — RFC 6238 with live countdown
- **WebAuthn Passkeys** — Platform authenticator support
- **Encrypted Sync** — Offline queue with conflict resolution
- **STRIDE Threat Model** — Documented in architecture.md

## Getting Started

```bash
pnpm install
node scripts/generate-icons.mjs
pnpm dev
pnpm build
```

Load `extension/dist` in `chrome://extensions`.

## Module Progress

- [x] Module 1 — Extension foundation
- [x] Module 2 — Cryptography
- [x] Module 3 — Vault engine
- [x] Module 4 — Password generator
- [x] Module 5 — Security scanner
- [x] Module 6–7 — Form detection + secure autofill
- [x] Module 8 — WebAuthn passkeys
- [x] Module 9 — TOTP authenticator
- [x] Module 10 — Sync engine
- [x] Module 11 — Threat modeling
- [x] Module 12 — Production release assets

## License

MIT
