import type { EncryptedVault } from "@pwm/types";
import { deserializeVault, serializeVault, vaultDb, type VaultSettingsRecord } from "./db.js";

const DEFAULT_SETTINGS: Omit<VaultSettingsRecord, "id"> = {
  autoLockMinutes: 15,
  syncEnabled: false,
  syncEndpoint: "",
  deviceId: crypto.randomUUID(),
};

/** Loads encrypted vault from IndexedDB. */
export async function loadEncryptedVault(): Promise<EncryptedVault | null> {
  const record = await vaultDb.vault.get("main");
  return record ? deserializeVault(record) : null;
}

/** Persists encrypted vault to IndexedDB. */
export async function saveEncryptedVault(vault: EncryptedVault): Promise<void> {
  await vaultDb.vault.put(serializeVault(vault));
}

/** Returns whether a vault exists in storage. */
export async function vaultExists(): Promise<boolean> {
  const count = await vaultDb.vault.count();
  return count > 0;
}

/** Loads vault settings or returns defaults. */
export async function loadSettings(): Promise<VaultSettingsRecord> {
  const stored = await vaultDb.settings.get("settings");
  if (stored) return stored;
  const defaults: VaultSettingsRecord = { id: "settings", ...DEFAULT_SETTINGS };
  await vaultDb.settings.put(defaults);
  return defaults;
}

/** Updates vault settings. */
export async function saveSettings(
  settings: Partial<Omit<VaultSettingsRecord, "id">>,
): Promise<VaultSettingsRecord> {
  const current = await loadSettings();
  const updated: VaultSettingsRecord = { ...current, ...settings };
  await vaultDb.settings.put(updated);
  return updated;
}
