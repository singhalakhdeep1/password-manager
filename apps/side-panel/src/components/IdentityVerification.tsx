import React, { useState, useEffect } from 'react';

interface VerificationMethod {
  id: string;
  type: 'email' | 'sms' | 'authenticator' | 'biometric' | 'hardware-key';
  name: string;
  enabled: boolean;
  verified: boolean;
  lastUsed?: Date;
}

interface VerificationSession {
  id: string;
  method: string;
  initiatedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'completed' | 'failed' | 'expired';
}

interface IdentityVerificationProps {
  userId: string;
}

export function IdentityVerification({ userId }: IdentityVerificationProps) {
  const [methods, setMethods] = useState<VerificationMethod[]>([]);
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<VerificationMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVerificationData();
  }, [userId]);

  const fetchVerificationData = async () => {
    try {
      const [methodsRes, sessionsRes] = await Promise.all([
        fetch(`/api/users/${userId}/verification-methods`),
        fetch(`/api/users/${userId}/verification-sessions`),
      ]);

      if (methodsRes.ok) setMethods(await methodsRes.json());
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
    } catch (error) {
      console.error('Failed to fetch verification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMethod = async (id: string) => {
    try {
      const response = await fetch(`/api/verification-methods/${id}/toggle`, {
        method: 'POST',
      });

      if (response.ok) {
        setMethods(prev =>
          prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m)
        );
      }
    } catch (error) {
      console.error('Failed to toggle method:', error);
    }
  };

  const verifyMethod = async (id: string) => {
    try {
      const response = await fetch(`/api/verification-methods/${id}/verify`, {
        method: 'POST',
      });

      if (response.ok) {
        setMethods(prev =>
          prev.map(m => m.id === id ? { ...m, verified: true, lastUsed: new Date() } : m)
        );
      }
    } catch (error) {
      console.error('Failed to verify method:', error);
    }
  };

  const getMethodIcon = (type: string) => {
    const icons: Record<string, string> = {
      email: '📧',
      sms: '📱',
      authenticator: '🔐',
      biometric: '👆',
      'hardware-key': '🔑',
    };
    return icons[type] || '🔒';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) return <div>Loading verification data...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Identity Verification</h2>

      {/* Verification Methods */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Verification Methods</h3>
          <button
            onClick={() => setIsAddingMethod(!isAddingMethod)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            {isAddingMethod ? 'Cancel' : '+ Add Method'}
          </button>
        </div>

        {isAddingMethod && (
          <div className="space-y-3 p-3 bg-gray-50 rounded mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Method Type</label>
              <select className="w-full border rounded px-3 py-2">
                <option value="email">Email Verification</option>
                <option value="sms">SMS Verification</option>
                <option value="authenticator">Authenticator App</option>
                <option value="biometric">Biometric (Fingerprint/Face)</option>
                <option value="hardware-key">Hardware Key (YubiKey)</option>
              </select>
            </div>
            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded">
              Add Method
            </button>
          </div>
        )}

        <div className="space-y-2">
          {methods.map((method) => (
            <div
              key={method.id}
              onClick={() => setSelectedMethod(method)}
              className={`flex items-center justify-between p-3 border rounded cursor-pointer ${
                selectedMethod?.id === method.id ? 'border-blue-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getMethodIcon(method.type)}</span>
                <div>
                  <p className="font-medium">{method.name}</p>
                  <p className="text-sm text-gray-600 capitalize">{method.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {method.verified && (
                  <span className="text-green-600 text-sm">✓ Verified</span>
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={method.enabled}
                    onChange={() => toggleMethod(method.id)}
                  />
                  <span className="text-sm">Enabled</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Method Detail */}
      {selectedMethod && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getMethodIcon(selectedMethod.type)}</span>
              <div>
                <h3 className="font-semibold">{selectedMethod.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{selectedMethod.type}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedMethod(null)}
              className="text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <span className={`px-2 py-1 rounded text-xs ${selectedMethod.verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {selectedMethod.verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            {selectedMethod.lastUsed && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Used</span>
                <span className="text-sm">{new Date(selectedMethod.lastUsed).toLocaleString()}</span>
              </div>
            )}

            {!selectedMethod.verified && (
              <button
                onClick={() => verifyMethod(selectedMethod.id)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded"
              >
                Verify Now
              </button>
            )}

            <button className="w-full px-4 py-2 border rounded text-sm">
              Remove Method
            </button>
          </div>
        </div>
      )}

      {/* Verification Sessions */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Recent Sessions</h3>
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="p-3 border rounded">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium capitalize">{session.method}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(session.initiatedAt).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(session.status)}`}>
                  {session.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Settings */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Security Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Require verification for sensitive actions</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Remember trusted devices for 30 days</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Require verification on every login</span>
          </label>
        </div>
      </div>

      {/* Trusted Devices */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Trusted Devices</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium">Chrome on Windows</p>
              <p className="text-sm text-gray-600">Last active: 2 hours ago</p>
            </div>
            <button className="text-red-600 hover:text-red-800 text-sm">Remove</button>
          </div>
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium">Safari on iPhone</p>
              <p className="text-sm text-gray-600">Last active: 1 day ago</p>
            </div>
            <button className="text-red-600 hover:text-red-800 text-sm">Remove</button>
          </div>
        </div>
        <button className="mt-3 px-4 py-2 border rounded text-sm">
          Revoke All Devices
        </button>
      </div>
    </div>
  );
}
