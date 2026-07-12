import React, { useState, useEffect } from 'react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  status: 'active' | 'pending' | 'invited';
}

interface TeamPlan {
  id: string;
  name: string;
  type: 'family' | 'team';
  maxMembers: number;
  currentMembers: number;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  renewalDate: Date;
}

interface FamilyTeamPlansProps {
  userId: string;
}

export function FamilyTeamPlans({ userId }: FamilyTeamPlansProps) {
  const [plans, setPlans] = useState<TeamPlan[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentPlan, setCurrentPlan] = useState<TeamPlan | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTeamData();
  }, [userId]);

  const fetchTeamData = async () => {
    try {
      const [plansRes, membersRes, currentRes] = await Promise.all([
        fetch('/api/team-plans'),
        fetch(`/api/users/${userId}/team-members`),
        fetch(`/api/users/${userId}/current-plan`),
      ]);

      if (plansRes.ok) setPlans(await plansRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
      if (currentRes.ok) setCurrentPlan(await currentRes.json());
    } catch (error) {
      console.error('Failed to fetch team data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const inviteMember = async () => {
    if (!inviteEmail) return;

    try {
      const response = await fetch('/api/team-members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: inviteEmail }),
      });

      if (response.ok) {
        const member = await response.json();
        setMembers(prev => [...prev, member]);
        setInviteEmail('');
        setIsInviting(false);
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const removeMember = async (id: string) => {
    try {
      const response = await fetch(`/api/team-members/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMembers(prev => prev.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const changeRole = async (id: string, role: TeamMember['role']) => {
    try {
      const response = await fetch(`/api/team-members/${id}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const upgradePlan = async (planId: string) => {
    try {
      const response = await fetch('/api/team-plans/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, planId }),
      });

      if (response.ok) {
        const plan = await response.json();
        setCurrentPlan(plan);
      }
    } catch (error) {
      console.error('Failed to upgrade plan:', error);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'bg-purple-100 text-purple-700',
      admin: 'bg-blue-100 text-blue-700',
      member: 'bg-green-100 text-green-700',
    };
    return colors[role] || colors.member;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      invited: 'bg-blue-100 text-blue-700',
    };
    return colors[status] || colors.pending;
  };

  if (isLoading) return <div>Loading team plans...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Family & Team Plans</h2>

      {/* Current Plan */}
      {currentPlan && (
        <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold">Current Plan: {currentPlan.name}</h3>
              <p className="text-sm text-gray-600">
                {currentPlan.currentMembers}/{currentPlan.maxMembers} members
              </p>
              <p className="text-sm text-gray-600">
                Renews: {new Date(currentPlan.renewalDate).toLocaleDateString()}
              </p>
            </div>
            <p className="text-2xl font-bold">
              ${currentPlan.price}/{currentPlan.billingCycle}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
              Manage Subscription
            </button>
            <button className="px-3 py-1 border rounded text-sm">
              Cancel Plan
            </button>
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="border rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Team Members ({members.length})</h3>
          <button
            onClick={() => setIsInviting(!isInviting)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
          >
            {isInviting ? 'Cancel' : '+ Invite'}
          </button>
        </div>

        {isInviting && (
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="member@example.com"
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              onClick={inviteMember}
              disabled={!inviteEmail}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              Send Invite
            </button>
          </div>
        )}

        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-600">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs ${getRoleColor(member.role)}`}>
                  {member.role}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(member.status)}`}>
                  {member.status}
                </span>
                {member.role !== 'owner' && (
                  <div className="flex gap-1">
                    <select
                      value={member.role}
                      onChange={(e) => changeRole(member.id, e.target.value as any)}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Plans */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Available Plans</h3>
        <div className="grid grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-4 ${
                currentPlan?.id === plan.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <h4 className="font-semibold">{plan.name}</h4>
              <p className="text-sm text-gray-600 mb-2">
                Up to {plan.maxMembers} members
              </p>
              <p className="text-2xl font-bold mb-3">
                ${plan.price}/{plan.billingCycle}
              </p>
              <ul className="space-y-1 text-sm mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {currentPlan?.id !== plan.id && (
                <button
                  onClick={() => upgradePlan(plan.id)}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded text-sm"
                >
                  Upgrade
                </button>
              )}
              {currentPlan?.id === plan.id && (
                <button className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm" disabled>
                  Current Plan
                </button>
              )}
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
            <span className="text-sm">Allow members to view all passwords</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            <span className="text-sm">Allow members to add passwords</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Require approval for sharing</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Separate vaults per member</span>
          </label>
        </div>
      </div>

      {/* Billing */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Billing</h3>
        <div className="space-y-2">
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Current billing cycle</span>
            <span className="text-sm font-medium">Monthly</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Next billing date</span>
            <span className="text-sm font-medium">
              {currentPlan ? new Date(currentPlan.renewalDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">Payment method</span>
            <span className="text-sm font-medium">•••• 4242</span>
          </div>
        </div>
        <button className="mt-3 px-4 py-2 border rounded text-sm">
          Update Payment Method
        </button>
      </div>
    </div>
  );
}
