import { useCallback, useEffect, useState } from "react";
import { createMessage, pingBackground, sendToBackground } from "@pwm/messaging";
import type {
  CredentialEntry,
  SecurityFinding,
  SettingsPayload,
  TabInfo,
  TOTPCodeResponse,
  VaultState,
} from "@pwm/types";

/** Hook to verify background service worker connectivity. */
export function useExtensionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    const connected = await pingBackground();
    setIsConnected(connected);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  return { isConnected, isLoading, checkConnection };
}

/** Hook to fetch current active tab info from the background worker. */
export function useActiveTab() {
  const [tabInfo, setTabInfo] = useState<TabInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTabInfo() {
      setIsLoading(true);
      try {
        const response = await chrome.runtime.sendMessage(createMessage("GET_TAB_INFO"));
        if (response?.success && response.data) {
          setTabInfo(response.data as TabInfo);
        }
      } catch {
        setTabInfo(null);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchTabInfo();
  }, []);

  return { tabInfo, isLoading };
}

/** Hook exposing extension version from the manifest. */
export function useExtensionVersion(): string {
  return chrome.runtime.getManifest().version;
}

/** Hook for vault lock/unlock state. */
export function useVaultState() {
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const response = await sendToBackground<VaultState>(createMessage("VAULT_STATUS"));
    if (response.success && response.data) {
      setVaultState(response.data);
    }
    setIsLoading(false);
  }, []);

  const unlock = useCallback(async (masterPassword: string) => {
    const response = await sendToBackground(createMessage("VAULT_UNLOCK", { masterPassword }));
    await refresh();
    return response;
  }, [refresh]);

  const lock = useCallback(async () => {
    await sendToBackground(createMessage("VAULT_LOCK"));
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { vaultState, isLoading, unlock, lock, refresh };
}

/** Hook for credentials list from unlocked vault. */
export function useCredentials() {
  const [credentials, setCredentials] = useState<CredentialEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const response = await sendToBackground<CredentialEntry[]>(createMessage("GET_CREDENTIALS"));
    if (response.success && response.data) {
      setCredentials(response.data);
    } else {
      setCredentials([]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { credentials, isLoading, refresh };
}

/** Hook for security audit findings. */
export function useSecurityAudit() {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runAudit = useCallback(async () => {
    setIsLoading(true);
    const response = await sendToBackground<SecurityFinding[]>(createMessage("SECURITY_AUDIT"));
    if (response.success && response.data) {
      setFindings(response.data);
    }
    setIsLoading(false);
  }, []);

  return { findings, isLoading, runAudit };
}

/** Hook for TOTP codes with countdown refresh. */
export function useTOTPCodes() {
  const [codes, setCodes] = useState<TOTPCodeResponse[]>([]);

  const refresh = useCallback(async () => {
    const response = await sendToBackground<TOTPCodeResponse[]>(createMessage("GET_TOTP_CODES"));
    if (response.success && response.data) {
      setCodes(response.data);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { codes, refresh };
}

/** Hook for extension settings. */
export function useSettings() {
  const [settings, setSettings] = useState<SettingsPayload & { deviceId?: string }>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const response = await sendToBackground(createMessage("GET_SETTINGS"));
    if (response.success && response.data) {
      setSettings(response.data as SettingsPayload & { deviceId?: string });
    }
    setIsLoading(false);
  }, []);

  const updateSettings = useCallback(async (updates: SettingsPayload) => {
    await sendToBackground(createMessage("UPDATE_SETTINGS", updates));
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { settings, isLoading, updateSettings, refresh };
}
