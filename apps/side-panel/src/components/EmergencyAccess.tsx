import React, { useState, useEffect } from 'react';

interface EmergencyContact {
  id: string;
  name: string;
  email: string;
  relationship: string;
  waitTime: number;
  status: 'pending' | 'active' | 'revoked';
  addedAt: Date;
}

interface EmergencyRequest {
  id: string;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

interface EmergencyAccessProps {
  userId: string;
}

export function EmergencyAccess({ userId }: EmergencyAccessProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    relationship: '',
    waitTime: 7,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEmergencyData();
  }, [userId]);

  const fetchEmergencyData = async () => {
    try {
      const [contactsRes, requestsRes] = await Promise.all([
        fetch(`/api/users/${userId}/emergency-contacts`),
        fetch(`/api/users/${userId}/emergency-requests`),
      ]);

      if (contactsRes.ok) setContacts(await contactsRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
    } catch (error) {
      console.error('Failed to fetch emergency data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addContact = async () => {
    try {
      const response = await fetch('/api/emergency-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...newContact }),
      });

      if (response.ok) {
        const contact = await response.json();
        setContacts(prev => [...prev, contact]);
        setIsAdding(false);
        setNewContact({ name: '', email: '', relationship: '', waitTime: 7 });
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const revokeContact = async (id: string) => {
    try {
      const response = await fetch(`/api/emergency-contacts/${id}/revoke`, {
        method: 'POST',
      });

      if (response.ok) {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, status: 'revoked' } : c));
      }
    } catch (error) {
      console.error('Failed to revoke contact:', error);
    }
  };

  const requestAccess = async (contactId: string) => {
    try {
      const response = await fetch('/api/emergency-access/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, contactId }),
      });

      if (response.ok) {
        const request = await response.json();
        setRequests(prev => [request, ...prev]);
      }
    } catch (error) {
      console.error('Failed to request access:', error);
    }
  };

  const approveRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/emergency-requests/${id}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  };

  const denyRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/emergency-requests/${id}/deny`, {
        method: 'POST',
      });

      if (response.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'denied' } : r));
      }
    } catch (error) {
      console.error('Failed to deny request:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      revoked: 'bg-red-100 text-red-700',
      approved: 'bg-green-100 text-green-700',
      denied: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) return <div>Loading emergency access...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Emergency Access</h2>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Emergency access allows trusted contacts to request access to your vault if you're unable to.
          Contacts must wait the specified time before access is granted, giving you time to deny the request.
        </p>
      </div>

      {/* Emergency Contacts */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Emergency Contacts</h3>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            {isAdding ? 'Cancel' : '+ Add Contact'}
          </button>
        </div>

        {isAdding && (
          <div className="space-y-3 p-3 bg-gray-50 rounded mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder="Full name"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="contact@example.com"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Relationship</label>
              <input
                type="text"
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                placeholder="e.g., Spouse, Parent"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Wait Time (days)</label>
              <input
                type="number"
                value={newContact.waitTime}
                onChange={(e) => setNewContact({ ...newContact, waitTime: Number(e.target.value) })}
                min="1"
                max="30"
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Contact must wait this many days before accessing your vault
              </p>
            </div>
            <button
              onClick={addContact}
              disabled={!newContact.name || !newContact.email}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              Add Contact
            </button>
          </div>
        )}

        <div className="space-y-2">
          {contacts.map((contact) => (
            <div key={contact.id} className="p-3 border rounded">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-600">{contact.email}</p>
                  <p className="text-xs text-gray-500">{contact.relationship}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(contact.status)}`}>
                    {contact.status}
                  </span>
                  {contact.status === 'active' && (
                    <button
                      onClick={() => revokeContact(contact.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Wait time: {contact.waitTime} days
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Access Requests */}
      {requests.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Access Requests</h3>
          <div className="space-y-2">
            {requests.map((request) => (
              <div key={request.id} className="p-3 border rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">Requested by: {request.requestedBy}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(request.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>
                {request.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => approveRequest(request.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm"
                    >
                      Approve Access
                    </button>
                    <button
                      onClick={() => denyRequest(request.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      Deny Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Emergency Access */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Test Emergency Access</h3>
        <p className="text-sm text-gray-600 mb-3">
          Send a test request to verify your emergency contacts are set up correctly.
        </p>
        <button className="px-4 py-2 bg-blue-500 text-white rounded text-sm">
          Send Test Request
        </button>
      </div>
    </div>
  );
}
