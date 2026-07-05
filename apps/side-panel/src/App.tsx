import {
  useCredentials,
  useExtensionStatus,
  useSecurityAudit,
  useTOTPCodes,
  useVaultState,
} from "@pwm/hooks";
import { Button } from "@pwm/ui/button";
import { Card } from "@pwm/ui/card";
import { Header } from "@pwm/ui/header";
import { StatusBadge } from "@pwm/ui/status-badge";
import { maskString } from "@pwm/utils";

export function App() {
  const { isConnected, isLoading } = useExtensionStatus();
  const { vaultState } = useVaultState();
  const { credentials, isLoading: credsLoading } = useCredentials();
  const { findings, isLoading: auditLoading, runAudit } = useSecurityAudit();
  const { codes } = useTOTPCodes();

  const isLocked = vaultState?.isLocked ?? true;
  const connStatus = isLoading ? "loading" : isConnected ? "connected" : "disconnected";
  const connLabel = isLoading ? "Checking…" : isConnected ? "Connected" : "Disconnected";

  return (
    <div className="min-h-screen bg-white">
      <Header title="Vault Browser" subtitle="Credentials · Audit · TOTP" />
      <div className="space-y-4 p-4">
        <StatusBadge label={connLabel} status={connStatus} />

        {isLocked ? (
          <Card title="Vault Locked">
            <p className="text-sm text-slate-500">Unlock the vault from the popup to browse credentials.</p>
          </Card>
        ) : (
          <>
            <Card title={`Credentials (${credentials.length})`}>
              {credsLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : credentials.length === 0 ? (
                <p className="text-sm text-slate-500">No credentials yet. Add one in Settings.</p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {credentials.map((c) => (
                    <div key={c.id} className="rounded border border-slate-100 p-2 text-sm">
                      <p className="font-medium text-slate-800">{c.title}</p>
                      <p className="text-xs text-slate-500">{c.username}</p>
                      <p className="font-mono text-xs text-slate-400">{maskString(c.password)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Security Audit">
              <Button variant="secondary" disabled={auditLoading} onClick={() => void runAudit()}>
                {auditLoading ? "Running…" : "Run Audit"}
              </Button>
              {findings.length > 0 && (
                <div className="mt-3 max-h-32 space-y-1 overflow-y-auto">
                  {findings.slice(0, 10).map((f, i) => (
                    <div
                      key={i}
                      className={`rounded p-2 text-xs ${
                        f.severity === "critical" || f.severity === "high"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {f.message}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {codes.length > 0 && (
              <Card title="TOTP Codes">
                <div className="space-y-2">
                  {codes.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{c.issuer || c.account}</span>
                      <div className="text-right">
                        <code className="font-mono font-bold text-slate-900">{c.code}</code>
                        <span className="ml-2 text-xs text-slate-400">{c.remaining}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
