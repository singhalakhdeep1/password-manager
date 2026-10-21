import { useState } from "react";
import {
  useActiveTab,
  useExtensionStatus,
  useExtensionVersion,
  useVaultState,
  useCredentials,
} from "@pwm/hooks";
import { createMessage, sendToBackground } from "@pwm/messaging";
import { copyWithAutoClear } from "@pwm/utils";
import { Button } from "@pwm/ui/button";
import { Card } from "@pwm/ui/card";
import { Header } from "@pwm/ui/header";
import { StatusBadge } from "@pwm/ui/status-badge";
import type { GeneratePasswordResponse } from "@pwm/types";

export function App() {
  const { isConnected, isLoading, checkConnection } = useExtensionStatus();
  const { tabInfo } = useActiveTab();
  const { vaultState, isLoading: vaultLoading, unlock, lock } = useVaultState();
  const { credentials } = useCredentials();
  const version = useExtensionVersion();

  const [masterPassword, setMasterPassword] = useState("");
  const [generated, setGenerated] = useState("");
  const [message, setMessage] = useState("");

  const isLocked = vaultState?.isLocked ?? true;
  const connStatus = isLoading ? "loading" : isConnected ? "connected" : "disconnected";
  const connLabel = isLoading ? "Checking…" : isConnected ? "Connected" : "Disconnected";

  async function handleUnlock() {
    const res = await unlock(masterPassword);
    setMessage(res.success ? "Vault unlocked" : (res.error ?? "Unlock failed"));
    setMasterPassword("");
  }

  async function handleGenerate() {
    const res = await sendToBackground<
      { length: number; symbols: boolean },
      GeneratePasswordResponse
    >(createMessage("GENERATE_PASSWORD", { length: 20, symbols: true }));
    if (res.success && res.data) {
      setGenerated(res.data.password);
      setMessage(`Strength: ${res.data.strength.label}`);
    }
  }

  async function handleAutofill() {
    const res = await sendToBackground(createMessage("AUTOFILL_REQUEST"));
    if (!res.success || !res.data) {
      setMessage(res.error ?? "Autofill failed");
      return;
    }
    const data = res.data as {
      credentials: Array<{ id: string; username: string; password: string; url: string }>;
    };
    if (data.credentials.length === 0) {
      setMessage("No credentials for this site");
      return;
    }
    const cred = data.credentials[0]!;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(
      tab.id,
      createMessage("AUTOFILL_FILL", {
        credentialId: cred.id,
        username: cred.username,
        password: cred.password,
        credentialUrl: cred.url,
      }),
    );
    setMessage(`Filled credentials for ${cred.username}`);
  }

  return (
    <div className="flex min-h-[520px] flex-col">
      <Header title="Password Manager" subtitle={`v${version} · Zero-Knowledge`} />

      <main className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <StatusBadge label={connLabel} status={connStatus} />
          <Button variant="ghost" onClick={() => void checkConnection()}>
            Refresh
          </Button>
        </div>

        <Card
          title="Vault"
          description={isLocked ? "Enter master password" : `${credentials.length} credentials`}
        >
          {vaultLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : isLocked ? (
            <div className="space-y-2">
              <input
                type="password"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                placeholder="Master password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
              />
              <Button className="w-full" onClick={() => void handleUnlock()}>
                Unlock / Create Vault
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">Unlocked</span>
              </div>
              <Button variant="secondary" className="w-full" onClick={() => void lock()}>
                Lock Vault
              </Button>
            </div>
          )}
        </Card>

        <Card title="Active Page">
          <p className="truncate text-sm text-slate-600">{tabInfo?.url ?? "No tab"}</p>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" disabled={isLocked} onClick={() => void handleGenerate()}>
            Generate
          </Button>
          <Button variant="secondary" disabled={isLocked} onClick={() => void handleAutofill()}>
            Autofill
          </Button>
        </div>

        {generated && (
          <Card title="Generated Password">
            <code className="block break-all text-xs text-slate-700">{generated}</code>
            <Button
              variant="ghost"
              className="mt-2 text-xs"
              onClick={() =>
                void copyWithAutoClear(generated).then(() =>
                  setMessage("Copied (auto-clears in 30s)"),
                )
              }
            >
              Copy
            </Button>
          </Card>
        )}

        {message && <p className="text-xs text-slate-500">{message}</p>}

        <Button
          variant="secondary"
          className="w-full"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Settings
        </Button>
      </main>
    </div>
  );
}
