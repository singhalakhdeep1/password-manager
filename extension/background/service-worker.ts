import { onMessage, sendToTab } from "@pwm/messaging";
import type {
  AddCredentialPayload,
  GeneratePasswordPayload,
  GeneratePasswordResponse,
  SecurityFinding,
  SettingsPayload,
  TabInfo,
  TOTPCodeResponse,
  VaultState,
  VaultUnlockPayload,
} from "@pwm/types";
import { assessStrength, generatePassphrase, generatePassword } from "@pwm/generator";
import { detectHomograph } from "@pwm/autofill";
import { runSecurityAudit } from "@pwm/security-audit";
import { generateTOTP, getTOTPRemaining } from "@pwm/totp";
import { getDeviceId, syncVault } from "@pwm/sync";
import {
  addCredential,
  clearAutoLockTimer,
  createVault,
  deleteCredential,
  encryptVault,
  findCredentialsByOrigin,
  getCredentials,
  getTOTPEntries,
  addTOTPEntry,
  addPasskey,
  addNote,
  addFolder,
  isVaultUnlocked,
  loadEncryptedVault,
  loadSettings,
  lockVault,
  resetAutoLockTimer,
  saveEncryptedVault,
  saveSettings,
  scheduleAutoLock,
  unlockVault,
  vaultExists,
} from "@pwm/vault";
import { logger } from "@pwm/utils";

logger.info("Background service worker initialized");

const DEFAULT_VAULT_STATE: VaultState = {
  isLocked: true,
  lastActivity: Date.now(),
  autoLockMinutes: 15,
};

async function updateVaultState(partial: Partial<VaultState>): Promise<VaultState> {
  const result = await chrome.storage.local.get("pwm:vault-state");
  const current = (result["pwm:vault-state"] as VaultState) ?? DEFAULT_VAULT_STATE;
  const updated = { ...current, ...partial };
  await chrome.storage.local.set({ "pwm:vault-state": updated });
  return updated;
}

async function persistVault(): Promise<void> {
  const encrypted = await encryptVault();
  await saveEncryptedVault(encrypted);
  await updateVaultState({ lastActivity: Date.now() });
  resetAutoLockTimer(async () => {
    await updateVaultState({ isLocked: true, lastActivity: Date.now() });
  });
}

async function initAutoLock(): Promise<void> {
  const settings = await loadSettings();
  scheduleAutoLock(settings.autoLockMinutes, async () => {
    lockVault();
    clearAutoLockTimer();
    await updateVaultState({ isLocked: true, lastActivity: Date.now() });
  });
  await updateVaultState({ autoLockMinutes: settings.autoLockMinutes });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info(`Extension ${details.reason}`, {
    version: chrome.runtime.getManifest().version,
  });

  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }

  await updateVaultState(DEFAULT_VAULT_STATE);
  await initAutoLock();
});

void initAutoLock();

onMessage({
  PING: () => ({ success: true, data: "PONG" }),

  GET_TAB_INFO: async (_message, sender) => {
    try {
      const tabId = sender.tab?.id;
      if (!tabId) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.id) return { success: false, error: "No active tab found" };
        return {
          success: true,
          data: { tabId: activeTab.id, url: activeTab.url ?? "", title: activeTab.title ?? "" } satisfies TabInfo,
        };
      }
      return {
        success: true,
        data: { tabId, url: sender.tab?.url ?? "", title: sender.tab?.title ?? "" } satisfies TabInfo,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  },

  EXTENSION_READY: () => ({ success: true, data: { ready: true } }),

  VAULT_STATUS: async () => {
    const result = await chrome.storage.local.get("pwm:vault-state");
    const state = (result["pwm:vault-state"] as VaultState) ?? DEFAULT_VAULT_STATE;
    return {
      success: true,
      data: { ...state, isLocked: !isVaultUnlocked() || state.isLocked },
    };
  },

  VAULT_UNLOCK: async (message) => {
    try {
      const { masterPassword } = (message.payload ?? {}) as VaultUnlockPayload;
      if (!masterPassword) return { success: false, error: "Master password required" };

      const exists = await vaultExists();
      if (!exists) {
        await createVault(masterPassword);
        await persistVault();
      } else {
        const encrypted = await loadEncryptedVault();
        if (!encrypted) return { success: false, error: "Vault not found" };
        await unlockVault(masterPassword, encrypted);
      }

      await updateVaultState({ isLocked: false, lastActivity: Date.now() });
      resetAutoLockTimer(async () => {
        lockVault();
        await updateVaultState({ isLocked: true, lastActivity: Date.now() });
      });

      return { success: true, data: { unlocked: true } };
    } catch {
      return { success: false, error: "Invalid master password" };
    }
  },

  VAULT_LOCK: async () => {
    lockVault();
    clearAutoLockTimer();
    await updateVaultState({ isLocked: true, lastActivity: Date.now() });
    return { success: true, data: { locked: true } };
  },

  VAULT_SAVE: async () => {
    try {
      if (!isVaultUnlocked()) return { success: false, error: "Vault is locked" };
      await persistVault();
      return { success: true, data: { saved: true } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Save failed" };
    }
  },

  GET_CREDENTIALS: () => {
    try {
      return { success: true, data: getCredentials() };
    } catch {
      return { success: false, error: "Vault is locked" };
    }
  },

  ADD_CREDENTIAL: async (message) => {
    try {
      const payload = message.payload as AddCredentialPayload;
      const cred = addCredential({
        title: payload.title,
        username: payload.username,
        password: payload.password,
        url: payload.url,
        notes: payload.notes,
        tags: payload.tags ?? [],
      });
      await persistVault();
      return { success: true, data: cred };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  },

  DELETE_CREDENTIAL: async (message) => {
    try {
      const { id } = (message.payload ?? {}) as { id: string };
      deleteCredential(id);
      await persistVault();
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  },

  GENERATE_PASSWORD: (message) => {
    const opts = (message.payload ?? {}) as GeneratePasswordPayload;
    let password: string;
    if (opts.mode === "passphrase") {
      password = generatePassphrase(opts.wordCount ?? 6);
    } else {
      password = generatePassword(opts);
    }
    const strength = assessStrength(password);
    return { success: true, data: { password, strength } satisfies GeneratePasswordResponse };
  },

  AUTOFILL_REQUEST: async (message, sender) => {
    try {
      if (!isVaultUnlocked()) return { success: false, error: "Vault is locked" };

      const tabUrl = sender.tab?.url ?? "";
      if (!tabUrl) return { success: false, error: "No tab URL" };

      if (detectHomograph(tabUrl)) {
        return { success: false, error: "Homograph attack detected — autofill blocked" };
      }

      const origin = new URL(tabUrl).origin;
      const matches = findCredentialsByOrigin(origin);
      return { success: true, data: { credentials: matches, origin } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  },

  SECURITY_AUDIT: async () => {
    try {
      const credentials = getCredentials();
      const findings: SecurityFinding[] = await runSecurityAudit(credentials, { checkHibp: true });
      return { success: true, data: findings };
    } catch {
      return { success: false, error: "Vault is locked" };
    }
  },

  GET_TOTP_CODES: async () => {
    try {
      const entries = getTOTPEntries();
      const codes: TOTPCodeResponse[] = await Promise.all(
        entries.map(async (entry) => ({
          id: entry.id,
          issuer: entry.issuer,
          account: entry.account,
          code: await generateTOTP(entry),
          remaining: getTOTPRemaining(entry),
        })),
      );
      return { success: true, data: codes };
    } catch {
      return { success: false, error: "Vault is locked" };
    }
  },

  GET_SETTINGS: async () => {
    const settings = await loadSettings();
    return {
      success: true,
      data: {
        autoLockMinutes: settings.autoLockMinutes,
        syncEnabled: settings.syncEnabled,
        syncEndpoint: settings.syncEndpoint,
        deviceId: settings.deviceId,
      },
    };
  },

  UPDATE_SETTINGS: async (message) => {
    const payload = (message.payload ?? {}) as SettingsPayload;
    const updated = await saveSettings(payload);
    if (payload.autoLockMinutes !== undefined) {
      scheduleAutoLock(updated.autoLockMinutes, async () => {
        lockVault();
        await updateVaultState({ isLocked: true, lastActivity: Date.now() });
      });
      await updateVaultState({ autoLockMinutes: updated.autoLockMinutes });
    }
    return { success: true, data: updated };
  },

  SYNC_VAULT: async () => {
    try {
      if (!isVaultUnlocked()) return { success: false, error: "Vault is locked" };
      const settings = await loadSettings();
      if (!settings.syncEnabled) return { success: false, error: "Sync is disabled" };

      const encrypted = await encryptVault();
      const deviceId = await getDeviceId();
      const synced = await syncVault(encrypted, deviceId);
      await saveEncryptedVault(synced);
      return { success: true, data: { syncedAt: Date.now() } };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Sync failed" };
    }
  },

  FORM_DETECTED: async (message, sender) => {
    logger.debug("Form detected", message.payload, sender.tab?.url);
    return { success: true, data: { acknowledged: true } };
  },

  ADD_TOTP: async (message) => {
    try {
      const entry = message.payload as Omit<import("@pwm/types").TOTPEntry, "id">;
      const totp = addTOTPEntry(entry);
      await persistVault();
      return { success: true, data: totp };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  },

  SAVE_PASSKEY: async (message) => {
    try {
      const passkey = message.payload as import("@pwm/webauthn").StoredPasskey;
      const saved = addPasskey(passkey);
      await persistVault();
      return { success: true, data: saved };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  },

  ADD_NOTE: async (message) => {
    try {
      const note = message.payload as Omit<import("@pwm/types").SecureNote, "id" | "createdAt" | "updatedAt">;
      const saved = addNote(note);
      await persistVault();
      return { success: true, data: saved };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  },

  ADD_FOLDER: async (message) => {
    try {
      const folder = message.payload as Omit<import("@pwm/types").VaultFolder, "id" | "createdAt">;
      const saved = addFolder(folder);
      await persistVault();
      return { success: true, data: saved };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed" };
    }
  },
});

/** Route autofill fill to content script tab. */
export async function routeAutofillFill(
  tabId: number,
  payload: { username: string; password: string },
): Promise<boolean> {
  const response = await sendToTab(tabId, {
    type: "AUTOFILL_FILL",
    payload,
    timestamp: Date.now(),
  });
  return response.success && (response.data as { filled?: boolean })?.filled === true;
}

export {};
