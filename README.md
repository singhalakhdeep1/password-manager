# Password Manager

A **zero-knowledge Chrome extension password manager** with encrypted vault storage, secure autofill, TOTP authenticator, WebAuthn passkeys, and security auditing — built with the Web Crypto API and a security-focused Turborepo monorepo.

> **Portfolio status:** ~**72% complete** (1 ✅ · 10 ⚠️ · 1 ❌ across 12 modules)

[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Chrome Extension](https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)

---

## What It Does

Store credentials encrypted at rest, generate strong passwords, autofill login forms with origin validation, manage TOTP codes, register WebAuthn passkeys, and audit your vault for weak or compromised passwords.

| Feature | Status | Notes |
|---------|--------|-------|
| AES-256-GCM + PBKDF2 vault | ✅ | 600k iterations, zero-knowledge |
| Credential CRUD | ✅ | Add, list, delete via popup/options |
| Password generator | ✅ | CSPRNG + Diceware + strength meter |
| Security audit (reuse, weak, HIBP) | ✅ | HIBP uses SHA-1 k-anonymity |
| Form detection (Shadow DOM, SPA) | ⚠️ | `all_frames: true`; needs real-world QA |
| Secure autofill | ⚠️ | Origin + homograph checks wired |
| TOTP generation + otpauth import | ⚠️ | No backup codes UI |
| WebAuthn passkey registration | ⚠️ | Options UI + vault storage; needs browser QA |
| Folders & secure notes | ⚠️ | APIs + Options UI; no attachments |
| Encrypted sync | ❌ | Simulated via `chrome.storage.local` |
| Auto-lock timer | ✅ | Configurable inactivity lock |
| Clipboard auto-clear | ✅ | Clears copied passwords after 30s |
| STRIDE + OWASP threat model | ✅ | `docs/threat-model.md` |
| Chrome Store release | ⚠️ | Firefox manifest + LICENSE; no screenshots |

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Language | TypeScript 5 (strict) |
| UI | React 19, Tailwind CSS |
| Build | Vite, CRXJS |
| Monorepo | Turborepo + pnpm |
| Crypto | Web Crypto API (AES-GCM, PBKDF2, SHA-1) |
| Storage | IndexedDB (encrypted vault blob) |
| Auth | WebAuthn / FIDO2, RFC 6238 TOTP |
| Testing | Vitest, Playwright |
| Quality | ESLint, Prettier, Husky, GitHub Actions |

---

## Project Structure

```
password-manager/
├── apps/
│   ├── popup/              # Unlock, generate, autofill
│   ├── side-panel/         # Credential list + TOTP codes
│   └── options/            # Add creds, TOTP, passkeys, folders, notes
├── extension/
│   ├── background/         # Vault ops, autofill routing, security audit
│   ├── content/            # Form detection bridge
│   └── injected/           # Page-world form field detection
├── packages/
│   ├── crypto/             # AES-GCM, PBKDF2, SHA-1/256
│   ├── vault/              # Encrypted in-memory vault + persistence
│   ├── generator/          # Password + passphrase generation
│   ├── security-audit/     # HIBP, reuse, weak password checks
│   ├── autofill/           # Form detection + homograph detection
│   ├── webauthn/           # Passkey registration + authentication
│   ├── totp/               # RFC 6238 + otpauth:// parsing
│   ├── sync/               # Offline queue + conflict resolution (local)
│   ├── messaging/          # Typed cross-context messages
│   ├── hooks/              # React hooks
│   ├── ui/                 # Shared components
│   ├── types/              # Shared types
│   └── utils/              # Logger, clipboard auto-clear
├── tests/e2e/
└── docs/
    ├── architecture.md
    ├── threat-model.md
    └── roadmap.md
```

---

## Getting Started

### Prerequisites

- Node.js **22+**
- pnpm **9+**
- Google Chrome (latest)

### Install & Run

```bash
pnpm install
node scripts/generate-icons.mjs
pnpm dev          # Dev server on port 5175
pnpm build        # Production build → extension/dist
pnpm test         # Vitest unit tests
pnpm test:e2e     # Playwright E2E
```

### Load in Chrome

1. Run `pnpm build`
2. Open `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select `extension/dist`
4. Click the extension icon → enter a **master password** to create or unlock the vault

### Usage

| Action | Where |
|--------|-------|
| Unlock / lock vault | Popup |
| Generate password | Popup |
| Autofill current page | Popup (requires matching credential URL) |
| Add credential | Options |
| Add TOTP (paste `otpauth://` URI) | Options |
| Register WebAuthn passkey | Options |
| Add folder / secure note | Options |
| Security audit | Side panel |
| View live TOTP codes | Side panel |

---

## Security Architecture

```
Master Password
      │
      ▼
  PBKDF2 (600k iterations)
      │
      ▼
  AES-256-GCM Key
      │
      ▼
  Encrypted Vault Blob → IndexedDB
      │
      ▼
  Plaintext never leaves device
```

**Autofill protections:**
- Strict origin matching between credential URL and active tab
- Homograph / IDN attack detection before fill
- Content script runs in isolated world with minimal permissions

See [docs/architecture.md](./docs/architecture.md) and [docs/threat-model.md](./docs/threat-model.md).

---

## Module Progress

| # | Module | Status | Notes |
|---|--------|--------|-------|
| 1 | Extension Foundation | ⚠️ ~85% | Monorepo, MV3, CI — E2E is browser-level |
| 2 | Cryptography | ⚠️ ~80% | AES-GCM + PBKDF2 solid; Argon2 not implemented |
| 3 | Vault Engine | ⚠️ ~70% | Core vault + folders/notes; no attachments |
| 4 | Password Generator | ✅ | CSPRNG, Diceware, strength meter |
| 5 | Security Scanner | ⚠️ ~85% | HIBP (SHA-1), reuse, weak — expiration alerts thin |
| 6 | Form Detection | ⚠️ ~75% | Shadow DOM, SPA, iframes via `all_frames` |
| 7 | Secure Autofill | ⚠️ ~80% | Origin + homograph checks in autofill flow |
| 8 | WebAuthn | ⚠️ ~70% | Package + Options UI; needs manual QA |
| 9 | TOTP | ⚠️ ~70% | Generation + otpauth import; no backup codes |
| 10 | Sync Engine | ❌ ~40% | Local simulation only; no real remote E2E sync |
| 11 | Threat Modeling | ⚠️ ~85% | STRIDE + OWASP doc; pen-test checklist unchecked |
| 12 | Production Release | ⚠️ ~55% | Firefox manifest, LICENSE; no store assets or benchmarks |

**Overall: ~72%** · 1 complete · 10 partial · 1 missing (real remote sync)

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start extension dev server (port 5175) |
| `pnpm build` | Build all packages + extension |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm lint` | Lint all packages |

---

## Interview Highlights

- Zero-knowledge architecture: master password never stored, only derived key used in memory
- PBKDF2 vs Argon2 trade-offs for browser-based key derivation
- Why AES-GCM over AES-CBC (authenticated encryption)
- HIBP k-anonymity: only 5-char SHA-1 prefix sent over the network
- WebAuthn passkeys vs TOTP: phishing resistance and UX trade-offs
- Homograph attack prevention in autofill (punycode / IDN)
- STRIDE threat modeling for browser extension attack surfaces

---

## Remaining Work

- [ ] Real end-to-end encrypted remote sync backend
- [ ] Vault attachments support
- [ ] TOTP backup codes UI
- [ ] Argon2 key derivation option
- [ ] Extension-loaded Playwright E2E
- [ ] Chrome Web Store screenshots + performance benchmarks
- [ ] Penetration testing checklist execution

---

## Documentation

- [Architecture](./docs/architecture.md)
- [Threat Model](./docs/threat-model.md)
- [Roadmap](./docs/roadmap.md)

---

## License

[MIT](./LICENSE)
