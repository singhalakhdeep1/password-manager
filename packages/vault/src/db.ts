import Dexie, { type Table } from "dexie";
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

class VaultDatabase extends Dexie {
  vault!: Table<VaultRecord, string>;
  settings!: Table<VaultSettingsRecord, string>;

  constructor() {
    super("pwm-vault");
    this.version(1).stores({
      vault: "id",
      settings: "id",
    });
  }
}

export const vaultDb = new VaultDatabase();

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
