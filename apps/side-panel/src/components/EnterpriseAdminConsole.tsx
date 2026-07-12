import React, { useState, useEffect } from 'react';

interface EnterpriseTeam {
  id: string;
  name: string;
  members: number;
  plan: 'starter' | 'business' | 'enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: Date;
}

interface EnterpriseUser {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'manager' | 'user';
  teamId: string;
  teamName: string;
  lastActive: Date;
  status: 'active' | 'inactive' | 'suspended';
}

interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  target: string;
  timestamp: Date;
  ip: string;
}

interface EnterpriseAdminConsoleProps {
  userId: string;
}

export function EnterpriseAdminConsole({ userId }: EnterpriseAdminConsoleProps) {
  const [teams, setTeams] = useState<EnterpriseTeam[]>([]);
  const [users, setUsers] = useState<EnterpriseUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'teams' | 'users' | 'audit'>('teams');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEnterpriseData();
  }, [userId]);

  const fetchEnterpriseData = async () => {
    try {
      const [teamsRes, usersRes, auditRes] = await Promise.all([
        fetch('/api/enterprise/teams'),
        fetch('/api/enterprise/users'),
        fetch('/api/enterprise/audit-logs'),
      ]);

      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (error) {
      console.error('Failed to fetch enterprise data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const suspendTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/enterprise/teams/${teamId}/suspend`, {
        method: 'POST',
      });

      if (response.ok) {
        setTeams(prev => prev.map(t => t.id === teamId ? { ...t, status: 'suspended' } : t));
      }
    } catch (error) {
      console.error('Failed to suspend team:', error);
    }
  };

  const suspendUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/enterprise/users/${userId}/suspend`, {
        method: 'POST',
      });

      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'suspended' } : u));
      }
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      starter: 'bg-blue-100 text-blue-700',
      business: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-green-100 text-green-700',
    };
    return colors[plan] || colors.starter;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      trial: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || colors.active;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'super-admin': 'bg-red-100 text-red-700',
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      user: 'bg-gray-100 text-gray-700',
    };
    return colors[role] || colors.user;
  };

  if (isLoading) return <div>Loading enterprise console...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Enterprise Admin Console</h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Teams</p>
          <p className="text-2xl font-bold">{teams.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Active Teams</p>
          <p className="text-2xl font-bold text-green-600">
            {teams.filter(t => t.status === 'active').length}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-gray-600">Revenue (MTD)</p>
          <p className="text-2xl font-bold">$12,450</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border rounded-lg p-4">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded ${activeTab === 'teams' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Teams
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded ${activeTab === 'users' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded ${activeTab === 'audit' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            Audit Logs
          </button>
        </div>

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-2">
            {teams.map((team) => (
              <div key={team.id} className="p-3 border rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-gray-600">{team.members} members</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${getPlanColor(team.plan)}`}>
                      {team.plan}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(team.status)}`}>
                      {team.status}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Created {new Date(team.createdAt).toLocaleDateString()}
                  </p>
                  {team.status === 'active' && (
                    <button
                      onClick={() => suspendTeam(team.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="p-3 border rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">{user.teamName}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-500">
                    Last active {new Date(user.lastActive).toLocaleDateString()}
                  </p>
                  {user.status === 'active' && (
                    <button
                      onClick={() => suspendUser(user.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 border rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-sm text-gray-600">
                      {log.performedBy} → {log.target}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">IP: {log.ip}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          <button className="px-4 py-2 bg-blue-500 text-white rounded text-sm">
            Create Team
          </button>
          <button className="px-4 py-2 border rounded text-sm">
            Add User
          </button>
          <button className="px-4 py-2 border rounded text-sm">
            Generate Report
          </button>
          <button className="px-4 py-2 border rounded text-sm">
            Bulk Import
          </button>
          <button className="px-4 py-2 border rounded text-sm">
            Send Announcement
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded text-sm">
            Emergency Lockdown
          </button>
        </div>
      </div>

      {/* Enterprise Settings */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Enterprise Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Default Team Plan</label>
            <select className="w-full border rounded px-3 py-2">
              <option>Starter</option>
              <option>Business</option>
              <option>Enterprise</option>
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Require SSO for all teams</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Enable audit logging</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Enforce 2FA for all users</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Auto-suspend inactive accounts (90 days)</span>
          </label>
        </div>
      </div>
    </div>
  );
}
