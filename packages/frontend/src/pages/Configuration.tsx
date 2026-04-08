import React, { useState } from 'react';

export default function Configuration() {
  const [activeTab, setActiveTab] = useState<'strategies' | 'indicators' | 'risk'>('strategies');

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuration</h1>
        <p className="text-gray-400">Manage strategy parameters, indicators, and trading rules</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('strategies')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'strategies'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Strategies
        </button>
        <button
          onClick={() => setActiveTab('indicators')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'indicators'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Indicators
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'risk'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Risk
        </button>
      </div>

      {/* Strategies Configuration */}
      {activeTab === 'strategies' && (
        <div className="space-y-6">
          {/* Strategy 1 */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Strategy 1: Trend Breakout</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Enabled</label>
                <select className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500">
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Min Confidence</label>
                <input type="number" defaultValue="60" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">MA Fast Period</label>
                <input type="number" defaultValue="50" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">MA Slow Period</label>
                <input type="number" defaultValue="200" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">ATR Period</label>
                <input type="number" defaultValue="14" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">ATR Multiplier</label>
                <input type="number" defaultValue="2.5" step="0.1" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">RSI Min</label>
                <input type="number" defaultValue="40" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">RSI Max</label>
                <input type="number" defaultValue="70" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">RVOL Threshold</label>
                <input type="number" defaultValue="1.5" step="0.1" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
            </div>
            <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-glow transition-all duration-300 font-semibold transition-colors font-semibold">
              Save Changes
            </button>
          </div>

          {/* Strategy 2 */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Strategy 2: Pullback Reversion</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Enabled</label>
                <select className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500">
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Min Confidence</label>
                <input type="number" defaultValue="60" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">MA Period</label>
                <input type="number" defaultValue="50" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Fib Level Min</label>
                <input type="number" defaultValue="0.382" step="0.01" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Fib Level Max</label>
                <input type="number" defaultValue="0.618" step="0.01" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">RSI Threshold</label>
                <input type="number" defaultValue="50" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
            </div>
            <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-glow transition-all duration-300 font-semibold transition-colors font-semibold">
              Save Changes
            </button>
          </div>

          {/* Strategy 3 */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Strategy 3: Hybrid Composite</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Enabled</label>
                <select className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500">
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Min Confidence</label>
                <input type="number" defaultValue="60" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Score Threshold</label>
                <input type="number" defaultValue="65" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Trend Weight %</label>
                <input type="number" defaultValue="25" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Momentum Weight %</label>
                <input type="number" defaultValue="20" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Volume Weight %</label>
                <input type="number" defaultValue="15" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
            </div>
            <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-glow transition-all duration-300 font-semibold transition-colors font-semibold">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Indicators Configuration */}
      {activeTab === 'indicators' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Technical Indicators</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">RSI Period</label>
                <input type="number" defaultValue="14" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">RSI Overbought</label>
                <input type="number" defaultValue="70" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">RSI Oversold</label>
                <input type="number" defaultValue="30" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">MACD Fast</label>
                <input type="number" defaultValue="12" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">MACD Slow</label>
                <input type="number" defaultValue="26" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">MACD Signal</label>
                <input type="number" defaultValue="9" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Bollinger Period</label>
                <input type="number" defaultValue="20" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Bollinger Std Dev</label>
                <input type="number" defaultValue="2.0" step="0.1" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">ATR Period</label>
                <input type="number" defaultValue="14" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Volume MA Period</label>
                <input type="number" defaultValue="20" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
            </div>
            <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-glow transition-all duration-300 font-semibold transition-colors font-semibold">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Risk Configuration */}
      {activeTab === 'risk' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Risk Management</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Risk per Trade %</label>
                <input type="number" defaultValue="1" step="0.1" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Max Stop Loss %</label>
                <input type="number" defaultValue="5" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Max Portfolio Heat %</label>
                <input type="number" defaultValue="7" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Max Positions</label>
                <input type="number" defaultValue="8" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Max per Strategy</label>
                <input type="number" defaultValue="3" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Drawdown Yellow %</label>
                <input type="number" defaultValue="5" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Drawdown Orange %</label>
                <input type="number" defaultValue="10" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Drawdown Red %</label>
                <input type="number" defaultValue="15" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Halt Threshold %</label>
                <input type="number" defaultValue="20" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Take Profit R:R</label>
                <input type="number" defaultValue="2.0" step="0.1" className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>
            </div>
            <button className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-glow transition-all duration-300 font-semibold transition-colors font-semibold">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
