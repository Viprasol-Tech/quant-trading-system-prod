import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface RiskMetrics {
  portfolioHeat: number;
  maxHeat: number;
  drawdown: number;
  maxDrawdown: number;
  sharpeRatio: number;
  calmarRatio: number;
  profitFactor: number;
  winRate: number;
  expectancy: number;
}

export default function RiskPage() {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [drawdown, setDrawdown] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRiskMetrics();
    const interval = setInterval(fetchRiskMetrics, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchRiskMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/risk/metrics');
      if (response.data.success && response.data.data) {
        setMetrics(response.data.data);
        setDrawdown(response.data.data.drawdown || 0);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load risk metrics');
      console.error('Error fetching risk metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCircuitBreakerStatus = (dd: number) => {
    if (dd < 5) return { level: 'Normal', color: 'bg-green-500', status: 'Active' };
    if (dd < 10) return { level: 'Yellow', color: 'bg-yellow-500', status: 'Caution' };
    if (dd < 15) return { level: 'Orange', color: 'bg-orange-500', status: 'Warning' };
    if (dd < 20) return { level: 'Red', color: 'bg-red-500', status: 'Critical' };
    return { level: 'Halt', color: 'bg-red-700', status: 'Halted' };
  };

  const breaker = getCircuitBreakerStatus(drawdown);

  const circuitBreakers = [
    { name: 'Normal Operation', range: '0-5%', color: 'bg-green-500', width: drawdown < 5 ? 100 : 0 },
    { name: 'Yellow Alert', range: '5-10%', color: 'bg-yellow-500', width: drawdown >= 5 && drawdown < 10 ? 100 : 0 },
    { name: 'Orange Alert', range: '10-15%', color: 'bg-orange-500', width: drawdown >= 10 && drawdown < 15 ? 100 : 0 },
    { name: 'Red Alert', range: '15-20%', color: 'bg-red-500', width: drawdown >= 15 && drawdown < 20 ? 100 : 0 },
    { name: 'Halt', range: '>20%', color: 'bg-red-700', width: drawdown >= 20 ? 100 : 0 }
  ];

  return (
    <div className="flex-1 overflow-auto p-8 bg-gray-50">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading risk metrics...</div>
          ) : (
            <>
              {/* Key Risk Metrics */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm font-medium mb-2">Portfolio Heat</p>
                  <p className="text-3xl font-bold text-gray-900">{(metrics?.portfolioHeat || 0).toFixed(2)}%</p>
                  <p className="text-xs text-gray-500 mt-2">Max: {(metrics?.maxHeat || 0).toFixed(2)}%</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm font-medium mb-2">Current Drawdown</p>
                  <p className={`text-3xl font-bold ${drawdown > 15 ? 'text-red-600' : drawdown > 10 ? 'text-orange-600' : drawdown > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {drawdown.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Max: {(metrics?.maxDrawdown || 0).toFixed(2)}%</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm font-medium mb-2">Sharpe Ratio</p>
                  <p className="text-3xl font-bold text-gray-900">{(metrics?.sharpeRatio || 0).toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-2">Risk-adjusted return</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600 text-sm font-medium mb-2">Win Rate</p>
                  <p className="text-3xl font-bold text-green-600">{((metrics?.winRate || 0) * 100).toFixed(0)}%</p>
                  <p className="text-xs text-gray-500 mt-2">% of profitable trades</p>
                </div>
              </div>

              {/* Circuit Breaker Status */}
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Circuit Breaker Status: <span className={`inline-block px-3 py-1 rounded-full text-white font-semibold ${breaker.color}`}>{breaker.level}</span></h2>

                <div className="space-y-4">
                  {circuitBreakers.map((cb) => (
                    <div key={cb.name}>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-700 font-medium">{cb.name}</span>
                        <span className={`text-sm font-semibold ${cb.width > 0 ? 'text-primary-600' : 'text-gray-500'}`}>
                          {cb.range}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className={`${cb.color} h-3 rounded-full transition-all duration-300`} style={{ width: `${cb.width}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Position Size Multiplier:</span> {(1 - Math.max(0, Math.min(1, drawdown / 20)) * 0.75).toFixed(2)}x
                  </p>
                  <p className="text-xs text-blue-700 mt-2">Position sizes are automatically reduced as drawdown increases to protect capital.</p>
                </div>
              </div>

              {/* Risk Parameters Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Position Sizing Rules</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Risk per Trade</span>
                      <span className="text-gray-900 font-semibold">1%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Max Stop Loss</span>
                      <span className="text-gray-900 font-semibold">5%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">ATR Multiplier</span>
                      <span className="text-gray-900 font-semibold">2.5x</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Chandelier Trailing</span>
                      <span className="text-gray-900 font-semibold">3.0x ATR</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Constraints</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Max Portfolio Heat</span>
                      <span className="text-gray-900 font-semibold">7%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Max Positions</span>
                      <span className="text-gray-900 font-semibold">8</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Max per Strategy</span>
                      <span className="text-gray-900 font-semibold">3</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Max Sector Exposure</span>
                      <span className="text-gray-900 font-semibold">25%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-2">Profit Factor</p>
                    <p className="text-2xl font-bold text-gray-900">{(metrics?.profitFactor || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-2">Expectancy (R)</p>
                    <p className="text-2xl font-bold text-green-600">{(metrics?.expectancy || 0).toFixed(2)}R</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-2">Calmar Ratio</p>
                    <p className="text-2xl font-bold text-gray-900">{(metrics?.calmarRatio || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 text-sm mb-2">Recovery Factor</p>
                    <p className="text-2xl font-bold text-gray-900">{((metrics?.profitFactor || 0) / Math.max((metrics?.maxDrawdown || 1) / 100, 1)).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
    </div>
  );
}
