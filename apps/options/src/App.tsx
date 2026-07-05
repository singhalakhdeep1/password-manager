import { useState } from "react";
import { useExtensionVersion, useSettings, useVaultState } from "@pwm/hooks";
import { createMessage, sendToBackground } from "@pwm/messaging";
import { parseOTPAuthURI } from "@pwm/totp";
import { registerPasskey, isWebAuthnAvailable } from "@pwm/webauthn";
import { Button } from "@pwm/ui/button";
import { Card } from "@pwm/ui/card";
import { Header } from "@pwm/ui/header";

export function App() {
  const version = useExtensionVersion();
  const { settings, updateSettings } = useSettings();
  const { vaultState } = useVaultState();
  const [message, setMessage] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [passkeyName, setPasskeyName] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [folderName, setFolderName] = useState("");

  const [newCred, setNewCred] = useState({
    title: "",
    username: "",
    password: "",
    url: "",
  });

  async function handleAddCredential() {
    const res = await sendToBackground(createMessage("ADD_CREDENTIAL", {
      ...newCred,
      tags: [],
    }));
    setMessage(res.success ? "Credential saved" : res.error ?? "Failed to save");
    if (res.success) setNewCred({ title: "", username: "", password: "", url: "" });
  }

  async function handleAddTOTP() {
    const parsed = parseOTPAuthURI(totpUri);
    if (!parsed?.secret) {
      setMessage("Invalid otpauth:// URI");
      return;
    }
    const res = await sendToBackground(createMessage("ADD_TOTP", {
      issuer: parsed.issuer ?? "Unknown",
      account: parsed.account ?? "account",
      secret: parsed.secret,
      algorithm: parsed.algorithm ?? "SHA1",
      digits: parsed.digits ?? 6,
      period: parsed.period ?? 30,
    }));
    setMessage(res.success ? "TOTP entry added" : res.error ?? "Failed");
    if (res.success) setTotpUri("");
  }

  async function handleRegisterPasskey() {
    if (!isWebAuthnAvailable()) {
      setMessage("WebAuthn not available in this browser");
      return;
    }
    const hostname = "localhost";
    const userId = new TextEncoder().encode(passkeyName || "user");
    const result = await registerPasskey(hostname, passkeyName || "user", userId);
    if (!result) {
      setMessage("Passkey registration cancelled or failed");
      return;
    }
    const res = await sendToBackground(createMessage("SAVE_PASSKEY", result.stored));
    setMessage(res.success ? "Passkey registered and saved" : res.error ?? "Save failed");
  }

  async function handleAddFolder() {
    if (!folderName.trim()) return;
    const res = await sendToBackground(createMessage("ADD_FOLDER", { name: folderName.trim() }));
    setMessage(res.success ? "Folder created" : res.error ?? "Failed");
    if (res.success) setFolderName("");
  }

  async function handleAddNote() {
    if (!noteTitle.trim()) return;
    const res = await sendToBackground(createMessage("ADD_NOTE", {
      title: noteTitle.trim(),
      content: noteContent,
      tags: [],
    }));
    setMessage(res.success ? "Note saved" : res.error ?? "Failed");
    if (res.success) {
      setNoteTitle("");
      setNoteContent("");
    }
  }

  async function handleSync() {
    const res = await sendToBackground(createMessage("SYNC_VAULT"));
    setMessage(res.success ? "Vault synced" : res.error ?? "Sync failed");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title="Settings" subtitle={`Password Manager v${version}`} />
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Card title="Extension Info">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Version</dt>
              <dd className="font-mono">{version}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Encryption</dt>
              <dd className="font-mono">AES-256-GCM + PBKDF2</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Vault</dt>
              <dd className="font-mono">{vaultState?.isLocked ? "Locked" : "Unlocked"}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Add Credential">
          <div className="space-y-2">
            {(["title", "username", "password", "url"] as const).map((field) => (
              <input
                key={field}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm capitalize"
                placeholder={field}
                type={field === "password" ? "password" : "text"}
                value={newCred[field]}
                onChange={(e) => setNewCred({ ...newCred, [field]: e.target.value })}
              />
            ))}
            <Button
              className="w-full"
              disabled={vaultState?.isLocked || !newCred.title}
              onClick={() => void handleAddCredential()}
            >
              Save Credential
            </Button>
          </div>
        </Card>

        <Card title="Add TOTP Entry" description="Paste otpauth:// URI from QR code">
          <input
            className="mb-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="otpauth://totp/Issuer:account?secret=..."
            value={totpUri}
            onChange={(e) => setTotpUri(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={vaultState?.isLocked || !totpUri}
            onClick={() => void handleAddTOTP()}
          >
            Add TOTP
          </Button>
        </Card>

        <Card title="WebAuthn Passkey" description="Register a platform passkey">
          <input
            className="mb-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="Passkey label"
            value={passkeyName}
            onChange={(e) => setPasskeyName(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={vaultState?.isLocked}
            onClick={() => void handleRegisterPasskey()}
          >
            Register Passkey
          </Button>
        </Card>

        <Card title="Folders & Notes">
          <input
            className="mb-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="New folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
          <Button
            variant="secondary"
            className="mb-4"
            disabled={vaultState?.isLocked || !folderName}
            onClick={() => void handleAddFolder()}
          >
            Add Folder
          </Button>
          <input
            className="mb-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="Note title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <textarea
            className="mb-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="Note content"
            rows={3}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={vaultState?.isLocked || !noteTitle}
            onClick={() => void handleAddNote()}
          >
            Save Note
          </Button>
        </Card>

        <Card title="Auto-Lock">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={60}
              className="w-20 rounded border border-slate-200 px-2 py-1 text-sm"
              value={settings.autoLockMinutes ?? 15}
              onChange={(e) =>
                void updateSettings({ autoLockMinutes: parseInt(e.target.value, 10) })
              }
            />
            <span className="text-sm text-slate-600">minutes of inactivity</span>
          </div>
        </Card>

        <Card title="Encrypted Sync">
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.syncEnabled ?? false}
              onChange={(e) => void updateSettings({ syncEnabled: e.target.checked })}
            />
            Enable vault sync
          </label>
          <input
            className="mb-3 w-full rounded border border-slate-200 px-3 py-2 text-sm"
            placeholder="Sync endpoint URL (optional)"
            value={settings.syncEndpoint ?? ""}
            onChange={(e) => void updateSettings({ syncEndpoint: e.target.value })}
          />
          <Button variant="secondary" onClick={() => void handleSync()}>Sync Now</Button>
        </Card>

        <Card title="Security">
          <p className="text-sm text-slate-600">
            Zero-knowledge architecture. Master password and encryption keys never leave your device.
            See docs/threat-model.md for STRIDE + OWASP review.
          </p>
        </Card>

        {message && <p className="text-sm text-slate-500">{message}</p>}
      </div>
    </div>
  );
}
