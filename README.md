# Password Manager

A zero-knowledge Manifest V3 Chrome extension password manager with encrypted vault storage, secure autofill, TOTP authenticator, WebAuthn passkeys, and security auditing. Built with the Web Crypto API and a security-focused Turborepo monorepo.

---

## Overview

Store credentials encrypted at rest with **AES-256-GCM + PBKDF2**. Generate strong passwords, autofill login forms with **origin validation**, manage **TOTP codes**, register **WebAuthn passkeys**, and audit your vault for weak or compromised passwords.

**Zero-knowledge:** your master password never leaves the device. The server (sync backend) never sees plaintext credentials.

---

## Features

- AES-256-GCM vault encryption (Web Crypto API, 600k PBKDF2 iterations)
- Credential CRUD (Add, list, delete via popup/options)
- Password generator (CSPRNG + Diceware + strength meter)
- Passphrase generator (Diceware word list)
- Security audit (reuse, weak)
- HIBP breach check (SHA-1 k-anonymity)
- Form detection (Shadow DOM, SPA, all_frames: true)
- Secure autofill (Origin + homograph checks)
- TOTP generation (RFC 6238 compliant)
- TOTP import (otpauth://)
- WebAuthn passkeys (Options registration + vault storage)
- Folders & secure notes
- Auto-lock timer
- Clipboard auto-clear
- STRIDE + OWASP threat model docs/threat-model.md
- Firefox manifest (browser_specific_settings.gecko)
- Chrome Store release (LICENSE + listing copy)

---

## Tech Stack

### Core

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Language | TypeScript | 5.9 | Strict typing across all contexts |
| UI Framework | React | 19 | Popup, side panel, options |
| Build Tool | Vite | 6 | Fast HMR dev server |
| Extension Build | CRXJS Vite Plugin | 2.0 beta | MV3 bundling + hot reload |
| Package Manager | pnpm | 9 | Workspace dependency management |
| Monorepo | Turborepo | 2.10 | Parallel builds, task caching |

### UI & Styling

| Category | Technology | Purpose |
|----------|-----------|---------|
| CSS | Tailwind CSS | 4 | Utility-first styling |
| Tailwind Plugin | `@tailwindcss/vite` | Vite integration |
| Components | `@pwm/ui` | Button, Card, Header, StatusBadge |

### Cryptography & Security

| Category | Technology | Purpose |
|----------|-----------|---------|
| Encryption | AES-256-GCM | Authenticated symmetric encryption |
| Key Derivation | PBKDF2 (600k iter, SHA-256) | Master password → AES key |
| Hashing | SHA-1 | HIBP k-anonymity API |
| Hashing | SHA-256 | General-purpose hashing |
| Random | `crypto.getRandomValues` | CSPRNG for passwords + salts |
| Comparison | Constant-time equal | Timing-safe string compare |
| WebAuthn | FIDO2 / Platform Authenticator | Passkey registration + auth |
| TOTP | RFC 6238 | Time-based one-time passwords |

### Storage

| Category | Technology | Purpose |
|----------|-----------|---------|
| Vault persistence | IndexedDB | Encrypted ciphertext blob |
| Settings | `chrome.storage.local` | Auto-lock, sync preferences |
| In-memory vault | JavaScript Map | Cleared on lock |

### Chrome Extension Platform

| API | Used In | Purpose |
|-----|---------|---------|
| `chrome.runtime` | All contexts | Message passing |
| `chrome.storage` | Background, Options | Settings + simulated sync |
| `chrome.tabs` | Background, Popup | Active tab for autofill |
| `chrome.scripting` | Manifest permission | Content script injection |
| `clipboardWrite` | Popup | Copy generated passwords |
| `chrome.sidePanel` | Manifest | Credential list + TOTP view |

### DOM & Autofill APIs

| API | Package | Purpose |
|-----|---------|---------|
| `MutationObserver` | `autofill` | SPA form detection |
| Shadow DOM traversal | `autofill` | Find fields in web components |
| `all_frames: true` | manifest | iframe form support |
| Homograph detection | `autofill` | IDN / punycode phishing prevention |

### Testing & Quality

| Category | Technology | Purpose |
|----------|-----------|---------|
| Unit Tests | Vitest | 3.1 | crypto, vault, generator, audit, totp, webauthn, sync |
| E2E Tests | Playwright | 1.51 | Browser API + manifest validation |
| Linting | ESLint | 9 | Shared `@repo/eslint-config` |
| Formatting | Prettier | 3.7 | Code style |
| Git Hooks | Husky + lint-staged | Pre-commit quality gate |
| CI/CD | GitHub Actions | Full pipeline on push/PR |

---

## Chrome Extension Surfaces

| Surface | Path | Description |
|---------|------|-------------|
| **Popup** | `apps/popup/` | Unlock vault, generate password, autofill |
| **Side Panel** | `apps/side-panel/` | Credential list, TOTP codes, security audit |
| **Options Page** | `apps/options/` | Add creds, TOTP, passkeys, folders, notes, sync |
| **Background SW** | `extension/background/` | Vault ops, autofill routing, security audit |
| **Content Script** | `extension/content/` | Form detection bridge |
| **Injected Script** | `extension/injected/` | Page-world form field detection + fill |

### Manifest Permissions

```
storage · tabs · activeTab · scripting · sidePanel · clipboardWrite
host_permissions: <all_urls>
content_scripts: all_frames: true
```

---

## Browser APIs Used

| API | Module | What It Does |
|-----|--------|-------------|
| `crypto.subtle.encrypt/decrypt` | M2 | AES-256-GCM vault encryption |
| `crypto.subtle.deriveKey` (PBKDF2) | M2 | Master password → AES key |
| `crypto.subtle.digest` (SHA-1) | M5 | HIBP k-anonymity hash |
| `crypto.getRandomValues` | M4 | CSPRNG password generation |
| `navigator.credentials.create/get` | M8 | WebAuthn passkey registration |
| `IndexedDB` | M3 | Encrypted vault blob persistence |
| `chrome.storage.local` | M10 | Simulated sync + settings |
| `navigator.clipboard` | M9 | Copy with auto-clear |
| `MutationObserver` | M6 | SPA login form detection |

---

## Security Architecture

```
Master Password (never stored)
        │
        ▼
  PBKDF2 — 600,000 iterations, SHA-256, random 16-byte salt
        │
        ▼
  AES-256-GCM Key (in memory only while vault unlocked)
        │
        ▼
  Encrypt vault JSON → { ciphertext, iv, salt, version }
        │
        ▼
  IndexedDB (ciphertext only — zero knowledge)
        │
        ▼
  Lock vault → clear key + vault data from memory
```

### Autofill Protections

| Threat | Mitigation |
|--------|-----------|
| Phishing (wrong origin) | Strict `URL.origin` match before fill |
| Homograph / IDN attacks | Punycode detection blocks suspicious domains |
| XSS in content script | Isolated world, no `eval`, minimal permissions |
| Memory dump | Auto-lock timer clears keys from memory |
| Vault tampering | GCM authentication tag rejects modified ciphertext |
| HIBP privacy | Only 5-char SHA-1 prefix sent to API |

---

## Project Structure

```
password-manager/
├── apps/
│   ├── popup/              # Unlock, generate, autofill
│   ├── side-panel/         # Credentials, TOTP, security audit
│   └── options/            # Full vault management UI
├── extension/
│   ├── background/
│   │   └── service-worker.ts   # Vault ops, autofill, audit routing
│   ├── content/
│   │   └── content-script.ts   # Form detection bridge
│   ├── injected/
│   │   └── injected-script.ts  # Page-world form fill
│   └── manifest.ts
├── packages/
│   ├── crypto/             # M2 — AES-GCM, PBKDF2, SHA-1/256
│   ├── vault/              # M3 — encrypted in-memory vault + IndexedDB
│   ├── generator/          # M4 — CSPRNG + Diceware + strength meter
│   ├── security-audit/     # M5 — HIBP, reuse, weak password checks
│   ├── autofill/           # M6/7 — form detection + homograph detection
│   ├── webauthn/           # M8 — passkey registration + authentication
│   ├── totp/               # M9 — RFC 6238 + otpauth:// parsing
│   ├── sync/               # M10 — offline queue + conflict resolution
│   ├── messaging/          # Typed cross-context messages
│   ├── hooks/              # useVaultState, useCredentials, useSettings
│   ├── ui/                 # Shared React components
│   ├── types/              # Shared TypeScript types
│   └── utils/              # Logger, copyWithAutoClear, generateId
├── tests/e2e/
├── docs/
│   ├── architecture.md
│   ├── threat-model.md     # STRIDE + OWASP + pen-test checklist
│   └── roadmap.md
├── scripts/generate-icons.mjs
├── .github/workflows/ci.yml
└── package.json
```

---

## Package Map

| Package | Scope | Key Exports |
|---------|-------|-------------|
| `@pwm/crypto` | M2 | `deriveKey`, `encrypt`, `decrypt`, `sha1`, `sha256` |
| `@pwm/vault` | M3 | `unlockVault`, `lockVault`, `addCredential`, `addNote`, `addFolder` |
| `@pwm/generator` | M4 | `generatePassword`, `generatePassphrase`, `assessStrength` |
| `@pwm/security-audit` | M5 | `runSecurityAudit`, `checkHIBP` |
| `@pwm/autofill` | M6/7 | `detectLoginForms`, `detectHomograph`, `matchOrigin` |
| `@pwm/webauthn` | M8 | `registerPasskey`, `authenticateWithPasskey` |
| `@pwm/totp` | M9 | `generateTOTP`, `parseOTPAuthURI`, `getTOTPRemaining` |
| `@pwm/sync` | M10 | `syncVault`, `queueOfflineOperation`, `resolveConflict` |
| `@pwm/messaging` | — | `createMessage`, `sendToBackground` |
| `@pwm/hooks` | — | `useVaultState`, `useCredentials`, `useSettings` |
| `@pwm/extension` | — | CRXJS entry — bundles all contexts |

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22 LTS+ |
| pnpm | 9+ |
| Google Chrome | Latest (WebAuthn requires HTTPS or localhost) |

### Install

```bash
git clone <your-repo-url>
cd password-manager
pnpm install
node scripts/generate-icons.mjs
```

### Development

```bash
pnpm dev    # CRXJS dev server — port 5175
```

### Production Build

```bash
pnpm build  # Output → extension/dist/
```

### Load in Chrome

1. Run `pnpm build` (or `pnpm dev`)
2. Open `chrome://extensions` → **Developer mode** ON
3. **Load unpacked** → `extension/dist`
4. Click extension icon → enter **master password** to create or unlock vault

---

## Usage Guide

| Action | Where | How |
|--------|-------|-----|
| Create / unlock vault | Popup | Enter master password |
| Lock vault | Popup | Click **Lock Vault** |
| Generate password | Popup | **Generate** → copy (auto-clears in 30s) |
| Autofill current page | Popup | **Autofill** (requires matching credential URL) |
| Add credential | Options | Title, username, password, URL → Save |
| Add TOTP | Options | Paste `otpauth://totp/...` URI → Add TOTP |
| Register passkey | Options | Enter label → Register Passkey |
| Add folder / note | Options | Folders & Notes section |
| Security audit | Side Panel | View weak, reused, breached passwords |
| Live TOTP codes | Side Panel | Countdown timer per entry |
| Configure auto-lock | Options | Set inactivity minutes |
| Sync vault | Options | Enable sync → Sync Now (local simulation) |

---

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | CRXJS dev server with HMR (port **5175**) |
| `pnpm build` | Typecheck + production build |
| `pnpm test` | Vitest unit tests (9 packages) |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm lint` | ESLint all workspaces |
| `pnpm check-types` | TypeScript check |
| `pnpm format` | Prettier write |

---

## Testing

| Layer | Tool | Packages Tested |
|-------|------|----------------|
| Unit | Vitest | `crypto`, `vault`, `generator`, `security-audit`, `totp`, `webauthn`, `sync`, `autofill`, `types`, `utils` |
| E2E | Playwright | Manifest validation, clipboard permission |
| Manual | Chrome | Vault unlock, autofill, WebAuthn, TOTP |

```bash
pnpm test && pnpm test:e2e
```

---

## Architecture

```
  Popup ──────┐
  Side Panel ┤
  Options ───┤
             ▼
    Background Service Worker
      │         │         │
   Vault     Autofill   Security
   (crypto)  (origin)   Audit (HIBP)
      │         │         │
      ▼         ▼         ▼
  IndexedDB  Content Script ← Injected Script
  (cipher)       │                │
                 └──── Form Fill ─┘
                        │
                   Login Page DOM
```

---

## Message Passing

| Message Type | Direction | Purpose |
|-------------|-----------|---------|
| `VAULT_UNLOCK` | Popup → BG | Derive key + decrypt vault |
| `VAULT_LOCK` | Popup → BG | Clear memory |
| `ADD_CREDENTIAL` | Options → BG | Encrypt + persist |
| `AUTOFILL_REQUEST` | Popup → BG | Find creds for origin |
| `AUTOFILL_FILL` | BG → Content → Injected | Fill username/password |
| `GENERATE_PASSWORD` | Popup → BG | CSPRNG generation |
| `SECURITY_AUDIT` | Side Panel → BG | Run HIBP + reuse checks |
| `ADD_TOTP` | Options → BG | Parse otpauth + store |
| `SAVE_PASSKEY` | Options → BG | Store WebAuthn credential |
| `ADD_NOTE` / `ADD_FOLDER` | Options → BG | Vault organization |
| `SYNC_VAULT` | Options → BG | Push/pull encrypted blob |

---

## Module Progress

| # | Module | Version | Status | Key Deliverables |
|---|--------|---------|--------|-----------------|
| 1 | Extension Foundation | v0.1 | ⚠️ ~85% | Monorepo, MV3, CI, all UI |
| 2 | Cryptography | v0.2 | ⚠️ ~80% | AES-GCM + PBKDF2; no Argon2 |
| 3 | Vault Engine | v0.3 | ⚠️ ~70% | Core vault + folders/notes; no attachments |
| 4 | Password Generator | v0.4 | ✅ | CSPRNG, Diceware, strength meter |
| 5 | Security Scanner | v0.5 | ⚠️ ~85% | HIBP SHA-1, reuse, weak detection |
| 6 | Form Detection | v0.6 | ⚠️ ~75% | Shadow DOM, SPA, iframes |
| 7 | Secure Autofill | v0.7 | ⚠️ ~80% | Origin + homograph enforcement |
| 8 | WebAuthn | v0.8 | ⚠️ ~70% | Package + Options UI |
| 9 | TOTP | v0.9 | ⚠️ ~70% | Generation + otpauth; no backup codes |
| 10 | Sync Engine | v0.10 | ❌ ~40% | Local simulation only |
| 11 | Threat Modeling | v0.11 | ⚠️ ~85% | STRIDE + OWASP doc |
| 12 | Production Release | v1.0 | ⚠️ ~55% | Firefox manifest, LICENSE |

**Overall: ~72%** · 1 complete · 10 partial · 1 missing (real remote sync)

---

## Threat Model

Full analysis in [docs/threat-model.md](./docs/threat-model.md):

| Framework | Coverage |
|-----------|----------|
| **STRIDE** | Spoofing, Tampering, Repudiation, Info Disclosure, DoS, Elevation |
| **OWASP Top 10** | Extension-context security review |
| **Attack Surface** | Trusted vs untrusted boundaries mapped |
| **Pen-test Checklist** | 8 manual test scenarios documented |

---

## CI/CD

GitHub Actions on every push/PR to `main`:

`install → generate-icons → lint → typecheck → test → build → e2e`

---

## Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 120+ | ✅ Primary | Full WebAuthn + Web Crypto |
| Edge 120+ | ✅ | Chromium-based |
| Firefox 109+ | ⚠️ | Manifest ready; WebAuthn needs QA |
| Safari | ❌ | No MV3 extension support |

---

## Interview Highlights

- **Zero-knowledge architecture** — master password never stored; only derived key in memory
- **PBKDF2 vs Argon2** — why PBKDF2 was chosen for browser Web Crypto API compatibility
- **AES-GCM over AES-CBC** — authenticated encryption prevents tampering
- **HIBP k-anonymity** — only 5-char SHA-1 prefix transmitted; full hash never leaves device
- **WebAuthn vs TOTP** — phishing resistance and UX trade-offs
- **Homograph attack prevention** — punycode / IDN detection before autofill
- **STRIDE threat modeling** — browser extension attack surface analysis
- **Content script isolated world** — why autofill runs through injected script in page world

---

## Remaining Work

- [ ] Real end-to-end encrypted remote sync backend
- [ ] Vault attachments support
- [ ] TOTP backup codes UI
- [ ] Argon2 key derivation option
- [ ] Extension-loaded Playwright E2E
- [ ] Chrome Web Store screenshots + performance benchmarks
- [ ] Execute penetration testing checklist

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](./docs/architecture.md) | Security flow, package boundaries |
| [Threat Model](./docs/threat-model.md) | STRIDE + OWASP + pen-test checklist |
| [Roadmap](./docs/roadmap.md) | 12-module development plan |
| [Portfolio Overview](../CHROME_EXTENSIONS_PORTFOLIO.md) | All three projects |

---

## License

Proprietary - All rights reserved.
