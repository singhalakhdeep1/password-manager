import type { EncryptedVault } from "@pwm/types";

/** Sync operation queued while offline (Module 10). */
export interface SyncOperation {
  id: string;
  type: "push" | "pull";
  vault: EncryptedVault;
  deviceId: string;
  timestamp: number;
  status: "pending" | "completed" | "failed";
}

/** Device trust record (Module 10). */
export interface TrustedDevice {
  id: string;
  name: string;
  publicKey: ArrayBuffer;
  lastSyncAt: number;
  createdAt: number;
}

const OFFLINE_QUEUE_KEY = "pwm:sync-queue";
const DEVICE_ID_KEY = "pwm:device-id";
const REMOTE_VAULT_KEY = "pwm:remote-vault";

/** Queues a sync operation for when connectivity returns (Module 10). */
export async function queueSyncOperation(operation: SyncOperation): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push(operation);
  await chrome.storage.local.set({ [OFFLINE_QUEUE_KEY]: serializeQueue(queue) });
}

/** Returns pending offline sync operations. */
export async function getOfflineQueue(): Promise<SyncOperation[]> {
  const result = await chrome.storage.local.get(OFFLINE_QUEUE_KEY);
  return deserializeQueue(result[OFFLINE_QUEUE_KEY] as SerializedSyncOperation[] | undefined);
}

/** Processes offline queue when back online (Module 10). */
export async function processOfflineQueue(
  handler: (op: SyncOperation) => Promise<void>,
): Promise<number> {
  const queue = await getOfflineQueue();
  let processed = 0;

  for (const op of queue) {
    if (op.status !== "pending") continue;
    try {
      await handler(op);
      op.status = "completed";
      processed++;
    } catch {
      op.status = "failed";
    }
  }

  await chrome.storage.local.set({ [OFFLINE_QUEUE_KEY]: serializeQueue(queue) });
  return processed;
}

/** Resolves sync conflicts using last-write-wins (Module 10). */
export function resolveConflict(
  local: EncryptedVault,
  remote: EncryptedVault,
): EncryptedVault {
  return local.updatedAt >= remote.updatedAt ? local : remote;
}

/** Generates or retrieves a unique device ID (Module 10). */
export async function getDeviceId(): Promise<string> {
  const result = await chrome.storage.local.get(DEVICE_ID_KEY);
  const stored = result[DEVICE_ID_KEY] as string | undefined;
  if (stored) return stored;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [DEVICE_ID_KEY]: id });
  return id;
}

/** Pushes encrypted vault to remote storage (simulated E2E sync). */
export async function pushVault(vault: EncryptedVault, deviceId: string): Promise<void> {
  await chrome.storage.local.set({
    [REMOTE_VAULT_KEY]: { vault: serializeVault(vault), deviceId, syncedAt: Date.now() },
  });
}

/** Pulls remote vault and resolves conflict with local copy. */
export async function pullVault(local: EncryptedVault | null): Promise<EncryptedVault | null> {
  const result = await chrome.storage.local.get(REMOTE_VAULT_KEY);
  const remote = result[REMOTE_VAULT_KEY] as { vault: SerializedVault; deviceId: string } | undefined;
  if (!remote) return local;
  const remoteVault = deserializeVault(remote.vault);
  if (!local) return remoteVault;
  return resolveConflict(local, remoteVault);
}

/** Full sync: push local, pull remote, resolve conflicts. */
export async function syncVault(
  local: EncryptedVault,
  deviceId: string,
): Promise<EncryptedVault> {
  try {
    await pushVault(local, deviceId);
    return (await pullVault(local)) ?? local;
  } catch {
    await queueSyncOperation({
      id: crypto.randomUUID(),
      type: "push",
      vault: local,
      deviceId,
      timestamp: Date.now(),
      status: "pending",
    });
    return local;
  }
}

interface SerializedVault {
  ciphertext: number[];
  iv: number[];
  salt: number[];
  version: number;
  updatedAt: number;
}

interface SerializedSyncOperation {
  id: string;
  type: "push" | "pull";
  vault: SerializedVault;
  deviceId: string;
  timestamp: number;
  status: "pending" | "completed" | "failed";
}

function serializeVault(vault: EncryptedVault): SerializedVault {
  return {
    ciphertext: Array.from(new Uint8Array(vault.ciphertext)),
    iv: Array.from(vault.iv),
    salt: Array.from(vault.salt),
    version: vault.version,
    updatedAt: vault.updatedAt,
  };
}

function deserializeVault(serialized: SerializedVault): EncryptedVault {
  return {
    ciphertext: new Uint8Array(serialized.ciphertext).buffer,
    iv: new Uint8Array(serialized.iv),
    salt: new Uint8Array(serialized.salt),
    version: serialized.version,
    updatedAt: serialized.updatedAt,
  };
}

function serializeQueue(queue: SyncOperation[]): SerializedSyncOperation[] {
  return queue.map((op) => ({ ...op, vault: serializeVault(op.vault) }));
}

function deserializeQueue(raw: SerializedSyncOperation[] | undefined): SyncOperation[] {
  if (!raw) return [];
  return raw.map((op) => ({ ...op, vault: deserializeVault(op.vault) }));
}
