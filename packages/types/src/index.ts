/** Credential entry stored in the encrypted vault. */
export interface CredentialEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  folderId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  attachments?: VaultAttachment[];
}

/** Encrypted file attached to a credential (Module 3 — vault attachments). */
export interface VaultAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** Base64-encoded file bytes. Persisted as part of the encrypted vault blob. */
  dataBase64: string;
  createdAt: number;
}

/** Secure note entry (non-login). */
export interface SecureNote {
  id: string;
  title: string;
  content: string;
  folderId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/** Vault folder for organization. */
export interface VaultFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: number;
}

/** Encrypted vault blob stored in IndexedDB. */
export interface EncryptedVault {
  ciphertext: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
  version: number;
  updatedAt: number;
  /** Key derivation algorithm used to protect this blob. Absent = legacy PBKDF2 vault. */
  kdf?: "PBKDF2" | "Argon2";
}

/** Master key derivation parameters. */
export interface KeyDerivationParams {
  algorithm: "PBKDF2" | "Argon2";
  iterations: number;
  salt: Uint8Array;
}

/** Password strength assessment. */
export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "very-weak" | "weak" | "fair" | "strong" | "very-strong";
  feedback: string[];
  entropy: number;
}

/** Security audit finding. */
export interface SecurityFinding {
  type: "reused" | "weak" | "compromised" | "expired";
  credentialId: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
}

/** TOTP entry (RFC 6238). */
export interface TOTPEntry {
  id: string;
  issuer: string;
  account: string;
  secret: string;
  algorithm: "SHA1" | "SHA256" | "SHA512";
  digits: 6 | 8;
  period: number;
  /** SHA-256 hashes of unused one-time backup codes (plaintext shown once, never persisted). */
  backupCodeHashes?: string[];
  /** SHA-256 hashes of already-consumed backup codes, kept to reject replay. */
  usedBackupCodeHashes?: string[];
}

/** Extension message types. */
export type MessageType =
  | "PING"
  | "PONG"
  | "GET_TAB_INFO"
  | "TAB_INFO"
  | "EXTENSION_READY"
  | "VAULT_UNLOCK"
  | "VAULT_LOCK"
  | "VAULT_STATUS"
  | "VAULT_SAVE"
  | "GET_CREDENTIALS"
  | "ADD_CREDENTIAL"
  | "DELETE_CREDENTIAL"
  | "FORM_DETECTED"
  | "AUTOFILL_REQUEST"
  | "AUTOFILL_FILL"
  | "GENERATE_PASSWORD"
  | "SECURITY_AUDIT"
  | "GET_TOTP_CODES"
  | "GET_SETTINGS"
  | "UPDATE_SETTINGS"
  | "SYNC_VAULT"
  | "REGISTER_PASSKEY"
  | "ADD_TOTP"
  | "SAVE_PASSKEY"
  | "ADD_NOTE"
  | "ADD_FOLDER"
  | "ADD_ATTACHMENT"
  | "REMOVE_ATTACHMENT"
  | "GENERATE_BACKUP_CODES"
  | "VERIFY_BACKUP_CODE";

export interface VaultUnlockPayload {
  masterPassword: string;
  /** Key derivation algorithm for new vault creation. Ignored when unlocking an existing vault. */
  kdf?: "PBKDF2" | "Argon2";
}

export interface AddAttachmentPayload {
  credentialId: string;
  filename: string;
  mimeType: string;
  dataBase64: string;
}

export interface RemoveAttachmentPayload {
  credentialId: string;
  attachmentId: string;
}

export interface GenerateBackupCodesPayload {
  totpId: string;
}

export interface VerifyBackupCodePayload {
  totpId: string;
  code: string;
}

export interface AutofillFillPayload {
  credentialId: string;
  username: string;
  password: string;
  credentialUrl?: string;
}

export interface GeneratePasswordPayload {
  length?: number;
  lowercase?: boolean;
  uppercase?: boolean;
  digits?: boolean;
  symbols?: boolean;
  excludeAmbiguous?: boolean;
  mode?: "password" | "passphrase";
  wordCount?: number;
}

export interface GeneratePasswordResponse {
  password: string;
  strength: PasswordStrength;
}

export interface SettingsPayload {
  autoLockMinutes?: number;
  syncEnabled?: boolean;
  syncEndpoint?: string;
}

export interface AddCredentialPayload {
  title: string;
  username: string;
  password: string;
  url: string;
  notes?: string;
  tags?: string[];
}

export interface TOTPCodeResponse {
  id: string;
  issuer: string;
  account: string;
  code: string;
  remaining: number;
}

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  tabId?: number;
  timestamp: number;
}

export interface TabInfo {
  tabId: number;
  url: string;
  title: string;
}

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Detected login form field. */
export interface FormField {
  type: "username" | "password" | "email" | "unknown";
  element: Element | null;
  name?: string;
  autocomplete?: string;
}

/** Vault lock state. */
export interface VaultState {
  isLocked: boolean;
  lastActivity: number;
  autoLockMinutes: number;
}
