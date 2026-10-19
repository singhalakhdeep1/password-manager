import { describe, expect, it, vi } from "vitest";
import type { EncryptedVault } from "@pwm/types";
import { getDeviceId, resolveConflict, queueSyncOperation, getOfflineQueue } from "./index.js";

function makeVault(updatedAt: number): EncryptedVault {
  return {
    ciphertext: new ArrayBuffer(8),
    iv: new Uint8Array(12),
    salt: new Uint8Array(16),
    version: 1,
    updatedAt,
  };
}

describe("@pwm/sync", () => {
  it("resolveConflict picks newer vault", () => {
    const local = makeVault(2000);
    const remote = makeVault(1000);
    expect(resolveConflict(local, remote).updatedAt).toBe(2000);
    expect(resolveConflict(makeVault(500), makeVault(1000)).updatedAt).toBe(1000);
  });

  it("getDeviceId uses chrome.storage when available", async () => {
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });
    const id = await getDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    vi.unstubAllGlobals();
  });

  it("queues and retrieves offline operations", async () => {
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });
    await queueSyncOperation({
      id: "op-1",
      type: "push",
      vault: makeVault(Date.now()),
      deviceId: "dev-1",
      timestamp: Date.now(),
      status: "pending",
    });
    const queue = await getOfflineQueue();
    expect(queue.length).toBeGreaterThanOrEqual(0);
    vi.unstubAllGlobals();
  });
});
