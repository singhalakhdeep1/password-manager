import React, { useState, useEffect } from 'react';

interface SharedPassword {
  id: string;
  title: string;
  username: string;
  sharedWith: string[];
  sharedBy: string;
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  createdAt: Date;
}

interface ShareRequest {
  id: string;
  from: string;
  passwordTitle: string;
  message: string;
  createdAt: Date;
}

interface SecurePasswordSharingProps {
  userId: string;
}

export function SecurePasswordSharing({ userId }: SecurePasswordSharingProps) {
  const [sharedPasswords, setSharedPasswords] = useState<SharedPassword[]>([]);
  const [shareRequests, setShareRequests] = useState<ShareRequest[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareForm, setShareForm] = useState({
    passwordId: '',
    recipientEmail: '',
    expiresIn: '7d',
    maxAccess: 5,
    message: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSharedData();
  }, [userId]);

  const fetchSharedData = async () => {
    try {
      const [sharedRes, requestsRes] = await Promise.all([
        fetch(`/api/users/${userId}/shared-passwords`),
        fetch(`/api/users/${userId}/share-requests`),
      ]);

      if (sharedRes.ok) setSharedPasswords(await sharedRes.json());
      if (requestsRes.ok) setShareRequests(await requestsRes.json());
    } catch (error) {
      console.error('Failed to fetch shared data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sharePassword = async () => {
    try {
      const response = await fetch('/api/share-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...shareForm }),
      });

      if (response.ok) {
        const shared = await response.json();
        setSharedPasswords(prev => [shared, ...prev]);
        setIsSharing(false);
        setShareForm({
          passwordId: '',
          recipientEmail: '',
          expiresIn: '7d',
          maxAccess: 5,
          message: '',
        });
      }
    } catch (error) {
      console.error('Failed to share password:', error);
    }
  };

  const revokeShare = async (id: string) => {
    try {
      const response = await fetch(`/api/shared-passwords/${id}/revoke`, {
        method: 'POST',
      });

      if (response.ok) {
        setSharedPasswords(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to revoke share:', error);
    }
  };

  const acceptRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/share-requests/${id}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        setShareRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const declineRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/share-requests/${id}/decline`, {
        method: 'POST',
      });

      if (response.ok) {
        setShareRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Failed to decline request:', error);
    }
  };

  if (isLoading) return <div>Loading shared passwords...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Secure Password Sharing</h2>

      {/* Share Password */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Share a Password</h3>
          <button
            onClick={() => setIsSharing(!isSharing)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            {isSharing ? 'Cancel' : '+ Share'}
          </button>
        </div>

        {isSharing && (
          <div className="space-y-3 p-3 bg-gray-50 rounded mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Password</label>
              <select
                value={shareForm.passwordId}
                onChange={(e) => setShareForm({ ...shareForm, passwordId: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Choose a password...</option>
                <option value="1">Netflix Account</option>
                <option value="2">AWS Console</option>
                <option value="3">GitHub</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recipient Email</label>
              <input
                type="email"
                value={shareForm.recipientEmail}
                onChange={(e) => setShareForm({ ...shareForm, recipientEmail: e.target.value })}
                placeholder="user@example.com"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Expires In</label>
                <select
                  value={shareForm.expiresIn}
                  onChange={(e) => setShareForm({ ...shareForm, expiresIn: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="1d">1 Day</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="never">Never</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Access</label>
                <input
                  type="number"
                  value={shareForm.maxAccess}
                  onChange={(e) => setShareForm({ ...shareForm, maxAccess: Number(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message (Optional)</label>
              <textarea
                value={shareForm.message}
                onChange={(e) => setShareForm({ ...shareForm, message: e.target.value })}
                placeholder="Add a message for the recipient..."
                className="w-full border rounded px-3 py-2"
                rows={2}
              />
            </div>
            <button
              onClick={sharePassword}
              disabled={!shareForm.passwordId || !shareForm.recipientEmail}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              Share Securely
            </button>
          </div>
        )}
      </div>

      {/* Share Requests */}
      {shareRequests.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Pending Requests ({shareRequests.length})</h3>
          <div className="space-y-2">
            {shareRequests.map((request) => (
              <div key={request.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{request.from}</p>
                    <p className="text-sm text-gray-600">wants to share: {request.passwordTitle}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {request.message && (
                  <p className="text-sm text-gray-600 mb-2">"{request.message}"</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(request.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineRequest(request.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared by Me */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Shared by Me</h3>
        <div className="space-y-2">
          {sharedPasswords.map((shared) => (
            <div key={shared.id} className="p-3 border rounded">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{shared.title}</p>
                  <p className="text-sm text-gray-600">
                    Shared with: {shared.sharedWith.join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => revokeShare(shared.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Revoke
                </button>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Accessed {shared.accessCount}/{shared.maxAccess || '∞'} times</span>
                {shared.expiresAt && (
                  <span>Expires: {new Date(shared.expiresAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sharing Settings */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Sharing Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Require recipient confirmation</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Notify on access</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Auto-expire after max access</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Allow re-sharing</span>
          </label>
        </div>
      </div>
    </div>
  );
}
