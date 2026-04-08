import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';

interface Signal {
  symbol: string;
  direction: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  rating: string;
  strategy: string;
  timeframe: string;
  timestamp: Date;
  reasoning: string;
}

interface StrategyStats {
  [key: string]: { count: number; avgConfidence: number };
}

export default function StrategiesPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState<StrategyStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSignals = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/signals');
      if (response.data.success) {
        setSignals(response.data.signals || []);

        // Calculate stats
        const statsData: StrategyStats = {};
        const signalArray = response.data.signals || [];

        signalArray.forEach((signal: Signal) => {
          if (!statsData[signal.strategy]) {
            statsData[signal.strategy] = {
              count: 0,
              avgConfidence: 0
            };
          }
          statsData[signal.strategy].count += 1;
          statsData[signal.strategy].avgConfidence =
            (statsData[signal.strategy].avgConfidence * (statsData[signal.strategy].count - 1) + signal.confidence) /
            statsData[signal.strategy].count;
        });

        setStats(statsData);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load signals');
      console.error('Error fetching signals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 85) return 'text-green-600 bg-green-50';
    if (confidence >= 70) return 'text-primary-600 bg-blue-50';
    if (confidence >= 55) return 'text-yellow-600 bg-yellow-50';
    if (confidence >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const chartData = Object.entries(stats).map(([name, data]) => ({
    name,
    count: data.count || 0,
    confidence: Math.round(data.avgConfidence || 0)
  }));

  return (
    <div className="flex-1 overflow-auto p-8 bg-gray-50">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Strategy Overview Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {chartData.map((strategy) => (
              <div key={strategy.name} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{strategy.name}</h3>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{strategy.count}</p>
                    <p className="text-sm text-gray-600">Active Signals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">{strategy.confidence}%</p>
                    <p className="text-sm text-gray-600">Avg Confidence</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Strategy Performance</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                    formatter={(value) => value}
                  />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Active Signals" />
                  <Bar dataKey="confidence" fill="#10b981" name="Avg Confidence %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Active Signals Feed */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Active Signals Feed</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading signals...</div>
            ) : signals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No signals generated yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Symbol</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Strategy</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Entry</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Stop</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Target</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Confidence</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Rating</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Reasoning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {signals.map((signal, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{signal.symbol}</td>
                        <td className="px-6 py-4 text-gray-700">{signal.strategy}</td>
                        <td className="px-6 py-4 text-right text-gray-700">${signal.entryPrice.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-gray-700">${signal.stopLoss.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-gray-700">${signal.takeProfit.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full font-semibold ${getConfidenceColor(signal.confidence)}`}>
                            {signal.confidence}%
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          {signal.rating === 'Buy' ? (
                            <span className="text-green-600">Buy</span>
                          ) : signal.rating === 'Strong Buy' ? (
                            <span className="text-green-700">Strong Buy</span>
                          ) : (
                            <span className="text-gray-700">{signal.rating}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate text-xs" title={signal.reasoning}>
                          {signal.reasoning}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
    </div>
  );
}
