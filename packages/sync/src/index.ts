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
const SYNC_ENDPOINT_KEY = "pwm:sync-endpoint";

const DEFAULT_SYNC_ENDPOINT = "http://localhost:3199/api/sync";

// ---------- Serialization helpers ----------

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

// ---------- Sync endpoint management ----------

/** Gets the configured sync server URL. */
async function getSyncEndpoint(): Promise<string> {
  const result = await chrome.storage.local.get(SYNC_ENDPOINT_KEY);
  return (result[SYNC_ENDPOINT_KEY] as string) || DEFAULT_SYNC_ENDPOINT;
}

/** Sets the sync server URL. */
export async function setSyncEndpoint(endpoint: string): Promise<void> {
  await chrome.storage.local.set({ [SYNC_ENDPOINT_KEY]: endpoint });
}

// ---------- Offline queue ----------

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

/** Clears completed operations from the offline queue. */
export async function clearCompletedFromQueue(): Promise<void> {
  const queue = await getOfflineQueue();
  const pending = queue.filter((op) => op.status === "pending");
  await chrome.storage.local.set({ [OFFLINE_QUEUE_KEY]: serializeQueue(pending) });
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

// ---------- Conflict resolution ----------

/** Resolves sync conflicts using last-write-wins (Module 10). */
export function resolveConflict(
  local: EncryptedVault,
  remote: EncryptedVault,
): EncryptedVault {
  return local.updatedAt >= remote.updatedAt ? local : remote;
}

// ---------- Device ID ----------

/** Generates or retrieves a unique device ID (Module 10). */
export async function getDeviceId(): Promise<string> {
  const result = await chrome.storage.local.get(DEVICE_ID_KEY);
  const stored = result[DEVICE_ID_KEY] as string | undefined;
  if (stored) return stored;
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [DEVICE_ID_KEY]: id });
  return id;
}

// ---------- Real sync operations ----------

/** Pushes encrypted vault to the sync server (zero-knowledge — server never sees plaintext). */
export async function pushVault(vault: EncryptedVault, deviceId: string): Promise<void> {
  const endpoint = await getSyncEndpoint();
  const response = await fetch(`${endpoint}/vault/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      vault: serializeVault(vault),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Push failed" }));
    throw new Error((error as { error?: string }).error || `Push failed: ${response.status}`);
  }
}

/** Pulls remote vault from the sync server and resolves conflict with local copy. */
export async function pullVault(local: EncryptedVault | null): Promise<EncryptedVault | null> {
  const deviceId = await getDeviceId();
  const endpoint = await getSyncEndpoint();
  const response = await fetch(`${endpoint}/vault/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) {
    throw new Error(`Pull failed: ${response.status}`);
  }

  const data = (await response.json()) as { success: boolean; vault: SerializedVault | null };
  if (!data.vault) return local;

  const remoteVault = deserializeVault(data.vault);
  if (!local) return remoteVault;
  return resolveConflict(local, remoteVault);
}

/** Checks if the sync server is reachable. */
export async function isSyncServerReachable(): Promise<boolean> {
  try {
    const endpoint = await getSyncEndpoint();
    const response = await fetch(`${endpoint}/health`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

/** Full sync: push local, pull remote, resolve conflicts. Falls back to offline queue. */
export async function syncVault(
  local: EncryptedVault,
  deviceId: string,
): Promise<EncryptedVault> {
  try {
    // First check server reachability
    const reachable = await isSyncServerReachable();

    if (!reachable) {
      // Queue for later
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

    // Push local vault to server
    await pushVault(local, deviceId);

    // Pull latest (may be from another device) and resolve conflicts
    const synced = await pullVault(local);

    // Process any queued offline operations
    await processOfflineQueue(async (op) => {
      if (op.type === "push") {
        await pushVault(op.vault, op.deviceId);
      }
    });
    await clearCompletedFromQueue();

    return synced ?? local;
  } catch {
    // Network error — queue the operation
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
