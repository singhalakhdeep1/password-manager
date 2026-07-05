import type { CredentialEntry, EncryptedVault, SecureNote, TOTPEntry, VaultFolder } from "@pwm/types";
import type { StoredPasskey } from "@pwm/webauthn";
import { decrypt, deriveKey, encrypt, generateSalt } from "@pwm/crypto";
import { generateId } from "@pwm/utils";

export { loadEncryptedVault, saveEncryptedVault, vaultExists, loadSettings, saveSettings } from "./storage";
export { scheduleAutoLock, resetAutoLockTimer, clearAutoLockTimer, getAutoLockMinutes } from "./auto-lock";
export type { VaultSettingsRecord } from "./db";

/** In-memory vault state (cleared on lock). */
export interface VaultData {
  credentials: CredentialEntry[];
  notes: SecureNote[];
  folders: VaultFolder[];
  totpEntries: TOTPEntry[];
  passkeys: StoredPasskey[];
}

let vaultData: VaultData | null = null;
let derivedKey: CryptoKey | null = null;
let currentSalt: Uint8Array | null = null;

const EMPTY_VAULT: VaultData = {
  credentials: [],
  notes: [],
  folders: [],
  totpEntries: [],
  passkeys: [],
};

/** Creates a new empty vault with master password. */
export async function createVault(masterPassword: string): Promise<VaultData> {
  const salt = generateSalt();
  const key = await deriveKey(masterPassword, salt);
  vaultData = { ...EMPTY_VAULT, credentials: [], notes: [], folders: [], totpEntries: [], passkeys: [] };
  derivedKey = key;
  currentSalt = salt;
  return vaultData;
}

/** Unlocks the vault with master password (Module 3). */
export async function unlockVault(
  masterPassword: string,
  encrypted: EncryptedVault,
): Promise<VaultData> {
  const key = await deriveKey(masterPassword, encrypted.salt);
  const json = await decrypt(encrypted.ciphertext, key, encrypted.iv);
  const parsed = JSON.parse(json) as Partial<VaultData>;
  vaultData = {
    credentials: parsed.credentials ?? [],
    notes: parsed.notes ?? [],
    folders: parsed.folders ?? [],
    totpEntries: parsed.totpEntries ?? [],
    passkeys: parsed.passkeys ?? [],
  };
  derivedKey = key;
  currentSalt = encrypted.salt;
  return vaultData;
}

/** Locks the vault and clears in-memory keys (Module 3). */
export function lockVault(): void {
  vaultData = null;
  derivedKey = null;
  currentSalt = null;
}

/** Returns whether vault is currently unlocked. */
export function isVaultUnlocked(): boolean {
  return vaultData !== null && derivedKey !== null;
}

/** Encrypts current vault data for persistence (Module 3). */
export async function encryptVault(): Promise<EncryptedVault> {
  if (!vaultData || !derivedKey || !currentSalt) throw new Error("Vault is locked");

  const { ciphertext, iv } = await encrypt(JSON.stringify(vaultData), derivedKey);

  return { ciphertext, iv, salt: currentSalt, version: 1, updatedAt: Date.now() };
}

/** Adds a credential to the unlocked vault. */
export function addCredential(entry: Omit<CredentialEntry, "id" | "createdAt" | "updatedAt">): CredentialEntry {
  if (!vaultData) throw new Error("Vault is locked");

  const credential: CredentialEntry = {
    ...entry,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  vaultData.credentials.push(credential);
  return credential;
}

/** Updates an existing credential. */
export function updateCredential(id: string, updates: Partial<Omit<CredentialEntry, "id" | "createdAt">>): CredentialEntry {
  if (!vaultData) throw new Error("Vault is locked");
  const idx = vaultData.credentials.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Credential not found");
  vaultData.credentials[idx] = { ...vaultData.credentials[idx]!, ...updates, updatedAt: Date.now() };
  return vaultData.credentials[idx]!;
}

/** Deletes a credential by id. */
export function deleteCredential(id: string): void {
  if (!vaultData) throw new Error("Vault is locked");
  vaultData.credentials = vaultData.credentials.filter((c) => c.id !== id);
}

/** Retrieves all credentials (requires unlocked vault). */
export function getCredentials(): CredentialEntry[] {
  if (!vaultData) throw new Error("Vault is locked");
  return [...vaultData.credentials];
}

/** Returns full vault data snapshot. */
export function getVaultData(): VaultData {
  if (!vaultData) throw new Error("Vault is locked");
  return {
    credentials: [...vaultData.credentials],
    notes: [...vaultData.notes],
    folders: [...vaultData.folders],
    totpEntries: [...vaultData.totpEntries],
    passkeys: [...vaultData.passkeys],
  };
}

/** Adds a TOTP entry to the vault. */
export function addTOTPEntry(entry: Omit<TOTPEntry, "id">): TOTPEntry {
  if (!vaultData) throw new Error("Vault is locked");
  const totp: TOTPEntry = { ...entry, id: generateId() };
  vaultData.totpEntries.push(totp);
  return totp;
}

/** Returns TOTP entries. */
export function getTOTPEntries(): TOTPEntry[] {
  if (!vaultData) throw new Error("Vault is locked");
  return [...vaultData.totpEntries];
}

/** Adds a passkey to the vault. */
export function addPasskey(passkey: StoredPasskey): StoredPasskey {
  if (!vaultData) throw new Error("Vault is locked");
  vaultData.passkeys.push(passkey);
  return passkey;
}

/** Returns stored passkeys. */
export function getPasskeys(): StoredPasskey[] {
  if (!vaultData) throw new Error("Vault is locked");
  return [...vaultData.passkeys];
}

/** Adds a secure note to the vault. */
export function addNote(note: Omit<SecureNote, "id" | "createdAt" | "updatedAt">): SecureNote {
  if (!vaultData) throw new Error("Vault is locked");
  const entry: SecureNote = {
    ...note,
    id: generateId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  vaultData.notes.push(entry);
  return entry;
}

/** Adds a folder to organize credentials. */
export function addFolder(folder: Omit<VaultFolder, "id" | "createdAt">): VaultFolder {
  if (!vaultData) throw new Error("Vault is locked");
  const entry: VaultFolder = { ...folder, id: generateId(), createdAt: Date.now() };
  vaultData.folders.push(entry);
  return entry;
}

/** Returns secure notes. */
export function getNotes(): SecureNote[] {
  if (!vaultData) throw new Error("Vault is locked");
  return [...vaultData.notes];
}

/** Returns vault folders. */
export function getFolders(): VaultFolder[] {
  if (!vaultData) throw new Error("Vault is locked");
  return [...vaultData.folders];
}

/** Finds credentials matching a URL origin (Module 7). */
export function findCredentialsByOrigin(origin: string): CredentialEntry[] {
  if (!vaultData) return [];
  return vaultData.credentials.filter((c) => {
    try {
      return new URL(c.url).origin === origin;
    } catch {
      return false;
    }
  });
}
