import React, { useState, useEffect } from 'react';

interface SecurityIssue {
  id: string;
  type: 'weak-password' | 'reused-password' | 'compromised' | 'old-password' | '2fa-disabled';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedItems: string[];
  recommendation: string;
}

interface SecurityScore {
  overall: number;
  breakdown: {
    passwordStrength: number;
    uniquePasswords: number;
    twoFactorEnabled: number;
    breachMonitoring: number;
    dataEncryption: number;
  };
  issues: SecurityIssue[];
  lastCalculated: Date;
}

interface SecurityScoreReportsProps {
  userId: string;
}

export function SecurityScoreReports({ userId }: SecurityScoreReportsProps) {
  const [score, setScore] = useState<SecurityScore | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<SecurityIssue | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSecurityScore();
  }, [userId]);

  const fetchSecurityScore = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/security-score`);
      if (response.ok) {
        const data = await response.json();
        setScore(data);
      }
    } catch (error) {
      console.error('Failed to fetch security score:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateScore = async () => {
    setIsCalculating(true);
    try {
      const response = await fetch('/api/security-score/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setScore(data);
      }
    } catch (error) {
      console.error('Failed to calculate score:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-100 text-red-700 border-red-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return colors[severity] || colors.low;
  };

  if (isLoading) return <div>Loading security score...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Security Score Reports</h2>

      {/* Overall Score */}
      {score && (
        <div className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg">Overall Security Score</h3>
              <p className="text-sm text-gray-600">
                Last calculated: {new Date(score.lastCalculated).toLocaleString()}
              </p>
            </div>
            <button
              onClick={calculateScore}
              disabled={isCalculating}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              {isCalculating ? 'Calculating...' : 'Recalculate'}
            </button>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className={`w-32 h-32 rounded-full ${getScoreColor(score.overall)} flex items-center justify-center text-white text-5xl font-bold`}>
                {getScoreGrade(score.overall)}
              </div>
              <p className="text-2xl font-bold mt-2">{Math.round(score.overall)}/100</p>
            </div>

            <div className="flex-1 space-y-3">
              {Object.entries(score.breakdown).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-medium">{Math.round(value)}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getScoreColor(value)}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Issues */}
      {score && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Security Issues ({score.issues.length})</h3>
          <div className="space-y-2">
            {score.issues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className={`p-3 border-2 rounded cursor-pointer ${
                  selectedIssue?.id === issue.id ? 'border-blue-500' : getSeverityColor(issue.severity)
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{issue.title}</p>
                    <p className="text-sm text-gray-600">{issue.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs capitalize ${getSeverityColor(issue.severity)}`}>
                    {issue.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issue Detail */}
      {selectedIssue && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-semibold">{selectedIssue.title}</h3>
            <button
              onClick={() => setSelectedIssue(null)}
              className="text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Description</p>
              <p>{selectedIssue.description}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600">Severity</p>
              <span className={`px-2 py-1 rounded text-xs capitalize ${getSeverityColor(selectedIssue.severity)}`}>
                {selectedIssue.severity}
              </span>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Affected Items ({selectedIssue.affectedItems.length})</p>
              <div className="space-y-1">
                {selectedIssue.affectedItems.map((item, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">Recommendation</p>
              <p className="p-3 bg-blue-50 rounded text-sm">{selectedIssue.recommendation}</p>
            </div>

            <button className="w-full px-4 py-2 bg-blue-500 text-white rounded">
              Fix This Issue
            </button>
          </div>
        </div>
      )}

      {/* Score History */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Score History</h3>
        <div className="h-48 bg-gray-50 rounded flex items-center justify-center">
          <p className="text-gray-500">Score history chart would display here</p>
        </div>
      </div>

      {/* Export Report */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Export Report</h3>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-500 text-white rounded text-sm">
            Download PDF
          </button>
          <button className="px-4 py-2 border rounded text-sm">
            Share Report
          </button>
        </div>
      </div>
    </div>
  );
}
