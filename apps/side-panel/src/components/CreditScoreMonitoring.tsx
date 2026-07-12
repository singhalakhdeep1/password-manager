import React, { useState, useEffect } from 'react';

interface CreditScoreData {
  currentScore: number;
  previousScore: number;
  change: number;
  lastUpdated: Date;
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
  history: {
    date: Date;
    score: number;
  }[];
}

interface CreditAlert {
  id: string;
  type: 'score-change' | 'new-inquiry' | 'account-change' | 'fraud-alert';
  message: string;
  date: Date;
  severity: 'info' | 'warning' | 'critical';
}

interface CreditScoreMonitoringProps {
  userId: string;
}

export function CreditScoreMonitoring({ userId }: CreditScoreMonitoringProps) {
  const [creditData, setCreditData] = useState<CreditScoreData | null>(null);
  const [alerts, setAlerts] = useState<CreditAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCreditData();
  }, [userId]);

  const fetchCreditData = async () => {
    try {
      const [scoreRes, alertsRes] = await Promise.all([
        fetch(`/api/users/${userId}/credit-score`),
        fetch(`/api/users/${userId}/credit-alerts`),
      ]);

      if (scoreRes.ok) setCreditData(await scoreRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } catch (error) {
      console.error('Failed to fetch credit data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/credit-score/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreditData(data.score);
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return 'bg-green-500';
    if (score >= 740) return 'bg-lime-500';
    if (score >= 670) return 'bg-yellow-500';
    if (score >= 580) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreRating = (score: number) => {
    if (score >= 800) return 'Excellent';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  const getImpactColor = (impact: string) => {
    const colors: Record<string, string> = {
      positive: 'bg-green-100 text-green-700',
      negative: 'bg-red-100 text-red-700',
      neutral: 'bg-gray-100 text-gray-700',
    };
    return colors[impact] || colors.neutral;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-100 text-blue-700',
      warning: 'bg-yellow-100 text-yellow-700',
      critical: 'bg-red-100 text-red-700',
    };
    return colors[severity] || colors.info;
  };

  if (isLoading) return <div>Loading credit score data...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Credit Score Monitoring</h2>

      {/* Credit Score Display */}
      {creditData && (
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Current Score</h3>
            <button
              onClick={refreshData}
              disabled={isRefreshing}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:bg-gray-300"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className={`w-32 h-32 rounded-full ${getScoreColor(creditData.currentScore)} flex items-center justify-center text-white text-4xl font-bold`}>
                {creditData.currentScore}
              </div>
              <p className="text-lg font-medium mt-2">{getScoreRating(creditData.currentScore)}</p>
              <p className={`text-sm ${creditData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {creditData.change >= 0 ? '+' : ''}{creditData.change} from last month
              </p>
            </div>

            <div className="flex-1">
              <div className="mb-4">
                <p className="text-sm text-gray-600">Previous Score</p>
                <p className="text-xl font-bold">{creditData.previousScore}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm">{new Date(creditData.lastUpdated).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score Factors */}
      {creditData && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Score Factors</h3>
          <div className="space-y-2">
            {creditData.factors.map((factor, idx) => (
              <div key={idx} className={`p-3 border rounded ${getImpactColor(factor.impact)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{factor.name}</p>
                    <p className="text-sm">{factor.description}</p>
                  </div>
                  <span className="px-2 py-1 rounded text-xs capitalize">
                    {factor.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Alerts */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Recent Alerts ({alerts.length})</h3>
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-3 border rounded ${getSeverityColor(alert.severity)}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium capitalize">{alert.type.replace('-', ' ')}</p>
                  <p className="text-sm">{alert.message}</p>
                </div>
                <p className="text-xs text-gray-600">
                  {new Date(alert.date).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score History */}
      {creditData && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Score History</h3>
          <div className="h-48 bg-gray-50 rounded flex items-center justify-center">
            <p className="text-gray-500">Score history chart would display here</p>
          </div>
          <div className="mt-3 max-h-32 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Score</th>
                  <th className="px-3 py-2 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {creditData.history.slice(0, 5).map((entry, idx) => {
                  const prevEntry = creditData.history[idx + 1];
                  const change = prevEntry ? entry.score - prevEntry.score : 0;
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{new Date(entry.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right font-medium">{entry.score}</td>
                      <td className={`px-3 py-2 text-right ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change >= 0 ? '+' : ''}{change}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit Freeze Status */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Credit Freeze Status</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded p-3 text-center">
            <p className="font-medium">Equifax</p>
            <p className="text-sm text-green-600">Not Frozen</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="font-medium">Experian</p>
            <p className="text-sm text-green-600">Not Frozen</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="font-medium">TransUnion</p>
            <p className="text-sm text-yellow-600">Frozen</p>
          </div>
        </div>
        <button className="mt-3 px-4 py-2 bg-blue-500 text-white rounded text-sm">
          Manage Freezes
        </button>
      </div>
    </div>
  );
}
