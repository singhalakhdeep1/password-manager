import React, { useState, useEffect } from 'react';

interface BreachAlert {
  id: string;
  type: 'password' | 'email' | 'credit-card' | 'other';
  source: string;
  date: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedCredentials: {
    id: string;
    title: string;
    username: string;
  }[];
  status: 'unresolved' | 'investigating' | 'resolved';
}

interface MonitoringSettings {
  enabled: boolean;
  checkFrequency: 'daily' | 'weekly' | 'monthly';
  notifyOnNewBreaches: boolean;
  autoRotateCompromised: boolean;
}

interface ContinuousBreachMonitoringProps {
  userId: string;
}

export function ContinuousBreachMonitoring({ userId }: ContinuousBreachMonitoringProps) {
  const [alerts, setAlerts] = useState<BreachAlert[]>([]);
  const [settings, setSettings] = useState<MonitoringSettings>({
    enabled: true,
    checkFrequency: 'weekly',
    notifyOnNewBreaches: true,
    autoRotateCompromised: false,
  });
  const [selectedAlert, setSelectedAlert] = useState<BreachAlert | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBreachData();
  }, [userId]);

  const fetchBreachData = async () => {
    try {
      const [alertsRes, settingsRes] = await Promise.all([
        fetch(`/api/users/${userId}/breach-alerts`),
        fetch(`/api/users/${userId}/breach-settings`),
      ]);

      if (alertsRes.ok) setAlerts(await alertsRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (error) {
      console.error('Failed to fetch breach data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/breach-monitoring/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Failed to run scan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const updateSettings = async () => {
    try {
      const response = await fetch('/api/breach-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...settings }),
      });

      if (response.ok) {
        // Settings updated
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/breach-alerts/${id}/resolve`, {
        method: 'POST',
      });

      if (response.ok) {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'resolved' } : a));
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700',
    };
    return colors[severity] || colors.low;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      unresolved: 'bg-red-100 text-red-700',
      investigating: 'bg-yellow-100 text-yellow-700',
      resolved: 'bg-green-100 text-green-700',
    };
    return colors[status] || colors.unresolved;
  };

  if (isLoading) return <div>Loading breach monitoring...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Continuous Breach Monitoring</h2>

      {/* Monitoring Status */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Monitoring Status</h3>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            />
            <span className="text-sm">Enabled</span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border rounded p-3 text-center">
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter(a => a.status === 'unresolved').length}
            </p>
            <p className="text-sm text-gray-600">Unresolved</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {alerts.filter(a => a.status === 'investigating').length}
            </p>
            <p className="text-sm text-gray-600">Investigating</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {alerts.filter(a => a.status === 'resolved').length}
            </p>
            <p className="text-sm text-gray-600">Resolved</p>
          </div>
        </div>

        <button
          onClick={runScan}
          disabled={isScanning}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isScanning ? 'Scanning...' : 'Run Manual Scan'}
        </button>
      </div>

      {/* Breach Alerts */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Breach Alerts</h3>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              className={`p-3 border rounded cursor-pointer ${
                selectedAlert?.id === alert.id ? 'border-blue-500' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{alert.source}</p>
                  <p className="text-sm text-gray-600">{alert.description}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(alert.status)}`}>
                    {alert.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(alert.date).toLocaleDateString()} • {alert.affectedCredentials.length} affected
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Alert Detail */}
      {selectedAlert && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-semibold">{selectedAlert.source}</h3>
              <p className="text-sm text-gray-600">
                {new Date(selectedAlert.date).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setSelectedAlert(null)}
              className="text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Description</p>
              <p>{selectedAlert.description}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Affected Credentials</p>
              <div className="space-y-2">
                {selectedAlert.affectedCredentials.map((cred) => (
                  <div key={cred.id} className="p-3 bg-gray-50 rounded">
                    <p className="font-medium">{cred.title}</p>
                    <p className="text-sm text-gray-600">{cred.username}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {selectedAlert.status !== 'resolved' && (
                <button
                  onClick={() => resolveAlert(selectedAlert.id)}
                  className="px-4 py-2 bg-green-500 text-white rounded text-sm"
                >
                  Mark as Resolved
                </button>
              )}
              <button className="px-4 py-2 border rounded text-sm">
                Rotate Passwords
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Monitoring Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Check Frequency</label>
            <select
              value={settings.checkFrequency}
              onChange={(e) => setSettings({ ...settings, checkFrequency: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.notifyOnNewBreaches}
              onChange={(e) => setSettings({ ...settings, notifyOnNewBreaches: e.target.checked })}
            />
            <span className="text-sm">Notify on new breaches</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoRotateCompromised}
              onChange={(e) => setSettings({ ...settings, autoRotateCompromised: e.target.checked })}
            />
            <span className="text-sm">Auto-rotate compromised passwords</span>
          </label>
          <button
            onClick={updateSettings}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
