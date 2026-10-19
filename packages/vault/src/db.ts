import { Dexie, type EntityTable } from "dexie";
import type { EncryptedVault } from "@pwm/types";

/** Serializable vault record for IndexedDB storage. */
export interface VaultRecord {
  id: "main";
  ciphertext: number[];
  iv: number[];
  salt: number[];
  version: number;
  updatedAt: number;
}

export interface VaultSettingsRecord {
  id: "settings";
  autoLockMinutes: number;
  syncEnabled: boolean;
  syncEndpoint: string;
  deviceId: string;
}

const vaultDb = new Dexie("pwm-vault") as Dexie & {
  vault: EntityTable<VaultRecord, "id">;
  settings: EntityTable<VaultSettingsRecord, "id">;
};

vaultDb.version(1).stores({
  vault: "id",
  settings: "id",
});

export { vaultDb };

export function serializeVault(vault: EncryptedVault): VaultRecord {
  return {
    id: "main",
    ciphertext: Array.from(new Uint8Array(vault.ciphertext)),
    iv: Array.from(vault.iv),
    salt: Array.from(vault.salt),
    version: vault.version,
    updatedAt: vault.updatedAt,
  };
}

export function deserializeVault(record: VaultRecord): EncryptedVault {
  return {
    ciphertext: new Uint8Array(record.ciphertext).buffer,
    iv: new Uint8Array(record.iv),
    salt: new Uint8Array(record.salt),
    version: record.version,
    updatedAt: record.updatedAt,
  };
}
