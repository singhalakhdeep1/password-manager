import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import type Database from "better-sqlite3";

/** Serialized vault payload from the extension. */
interface VaultPayload {
  ciphertext: number[];
  iv: number[];
  salt: number[];
  version: number;
  updatedAt: number;
}

interface PushBody {
  deviceId: string;
  deviceName?: string;
  vault: VaultPayload;
}

interface PullBody {
  deviceId: string;
}

interface RegisterBody {
  deviceId: string;
  deviceName: string;
  publicKey: string;
}

export function createRoutes(db: Database.Database): Router {
  const router = createRouter();

  // ---------- Device registration ----------

  const upsertDevice = db.prepare(`
    INSERT INTO devices (id, name, public_key, last_seen_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      last_seen_at = excluded.last_seen_at
  `);

  router.post("/devices/register", (req: Request, res: Response) => {
    try {
      const { deviceId, deviceName, publicKey } = req.body as RegisterBody;
      if (!deviceId || !deviceName || !publicKey) {
        res.status(400).json({ error: "deviceId, deviceName, and publicKey are required" });
        return;
      }

      upsertDevice.run(deviceId, deviceName, publicKey, Date.now());
      res.json({ success: true, deviceId });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Registration failed" });
    }
  });

  // ---------- Push vault (upload encrypted blob) ----------

  const upsertVault = db.prepare(`
    INSERT INTO vaults (device_id, ciphertext, iv, salt, version, updated_at, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      ciphertext = excluded.ciphertext,
      iv = excluded.iv,
      salt = excluded.salt,
      version = excluded.version,
      updated_at = excluded.updated_at,
      synced_at = excluded.synced_at
  `);

  const touchDevice = db.prepare(`
    UPDATE devices SET last_seen_at = ? WHERE id = ?
  `);

  const insertSyncLog = db.prepare(`
    INSERT INTO sync_log (device_id, action, version) VALUES (?, ?, ?)
  `);

  const pushTransaction = db.transaction((deviceId: string, vault: VaultPayload) => {
    const now = Date.now();
    const ciphertext = JSON.stringify(vault.ciphertext);
    const iv = JSON.stringify(vault.iv);
    const salt = JSON.stringify(vault.salt);

    upsertVault.run(deviceId, ciphertext, iv, salt, vault.version, vault.updatedAt, now);
    touchDevice.run(now, deviceId);
    insertSyncLog.run(deviceId, "push", vault.version);
  });

  router.post("/vault/push", (req: Request, res: Response) => {
    try {
      const { deviceId, vault } = req.body as PushBody;
      if (!deviceId || !vault) {
        res.status(400).json({ error: "deviceId and vault are required" });
        return;
      }

      // Auto-register device if not known (first sync)
      const device = db.prepare("SELECT id FROM devices WHERE id = ?").get(deviceId) as { id: string } | undefined;
      if (!device) {
        upsertDevice.run(deviceId, `Device-${deviceId.slice(0, 8)}`, "auto-registered", Date.now());
      }

      pushTransaction(deviceId, vault);
      res.json({ success: true, syncedAt: Date.now() });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Push failed" });
    }
  });

  // ---------- Pull vault (download latest encrypted blob) ----------

  const getLatestVault = db.prepare(`
    SELECT ciphertext, iv, salt, version, updated_at as updatedAt, synced_at as syncedAt
    FROM vaults
    ORDER BY updated_at DESC
    LIMIT 1
  `);

  const getVaultByDevice = db.prepare(`
    SELECT ciphertext, iv, salt, version, updated_at as updatedAt, synced_at as syncedAt
    FROM vaults
    WHERE device_id = ?
  `);

  router.post("/vault/pull", (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body as PullBody;
      if (!deviceId) {
        res.status(400).json({ error: "deviceId is required" });
        return;
      }

      touchDevice.run(Date.now(), deviceId);

      // Get the latest vault across all devices (last-write-wins)
      const row = getLatestVault.get() as {
        ciphertext: string;
        iv: string;
        salt: string;
        version: number;
        updatedAt: number;
        syncedAt: number;
      } | undefined;

      if (!row) {
        res.json({ success: true, vault: null });
        return;
      }

      insertSyncLog.run(deviceId, "pull", row.version);

      res.json({
        success: true,
        vault: {
          ciphertext: JSON.parse(row.ciphertext),
          iv: JSON.parse(row.iv),
          salt: JSON.parse(row.salt),
          version: row.version,
          updatedAt: row.updatedAt,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Pull failed" });
    }
  });

  // ---------- Sync status ----------

  router.get("/vault/status/:deviceId", (req: Request, res: Response) => {
    try {
      const { deviceId } = req.params;

      const localVault = getVaultByDevice.get(deviceId) as { version: number; updatedAt: number } | undefined;
      const latestVault = getLatestVault.get() as { version: number; updatedAt: number } | undefined;

      const devices = db.prepare("SELECT id, name, last_seen_at as lastSeenAt FROM devices").all() as Array<{
        id: string;
        name: string;
        lastSeenAt: number;
      }>;

      res.json({
        success: true,
        localVersion: localVault?.version ?? null,
        latestVersion: latestVault?.version ?? null,
        needsSync: localVault && latestVault ? localVault.updatedAt < latestVault.updatedAt : false,
        devices,
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Status check failed" });
    }
  });

  // ---------- Health ----------

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  return router;
}
