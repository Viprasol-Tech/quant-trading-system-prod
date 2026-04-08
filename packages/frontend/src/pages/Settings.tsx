import React, { useState } from 'react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'shariah' | 'notifications' | 'api'>('general');

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage system preferences and configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'general'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('shariah')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'shariah'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Shariah Compliance
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'notifications'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'api'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          API Keys
        </button>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-6">General Settings</h3>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Trading Mode</label>
                <select className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500">
                  <option>Paper Trading</option>
                  <option>Live Trading</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Current: Paper Trading</p>
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Primary Timeframe</label>
                <select className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500">
                  <option>Daily (1D)</option>
                  <option>4 Hours (4H)</option>
                  <option>1 Hour (1H)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Market Open Hour (EST)</label>
                <input type="number" min="0" max="23" defaultValue="9" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Market Close Hour (EST)</label>
                <input type="number" min="0" max="23" defaultValue="16" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Lookback Period (Days)</label>
                <input type="number" defaultValue="252" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Enable Trade Alerts</span>
                </label>
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Enable Risk Limit Alerts</span>
                </label>
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Enable Error Alerts</span>
                </label>
              </div>
            </div>
            <button className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Shariah Compliance */}
      {activeTab === 'shariah' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-6">Shariah Compliance Settings</h3>
            <div className="space-y-6">
              <div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-white font-semibold">Enable Shariah Compliance</span>
                </label>
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Screening Standard</label>
                <select className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500">
                  <option>AAOIFI Standard No. 21</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Max Equity/Debt Ratio</label>
                <input type="number" defaultValue="0.30" step="0.01" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Max Haram Income %</label>
                <input type="number" defaultValue="5" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Enforce Long Only</span>
                </label>
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Enforce No Leverage</span>
                </label>
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Enforce No Derivatives</span>
                </label>
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide mt-4 block">Approved Equities (comma-separated)</label>
                <textarea defaultValue="AAPL,MSFT,GOOGL,AMZN,NVDA" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500 h-24" />
              </div>
            </div>
            <button className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-6">Notification Channels</h3>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Email Notifications</label>
                <input type="email" placeholder="your@email.com" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500" />
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Email on Signal Generated</span>
                </label>
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Email on Risk Limit Breach</span>
                </label>
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide mt-6 block">Slack Webhook URL</label>
                <input type="text" placeholder="https://hooks.slack.com/..." className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500" />
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Slack on Trade Alert</span>
                </label>
              </div>

              <div>
                <label className="flex items-center mt-4">
                  <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                  <span className="ml-3 text-sm text-gray-300">Slack on Error</span>
                </label>
              </div>

              {/* Telegram Section */}
              <div className="border-t border-gray-700 pt-6 mt-6">
                <label className="text-sm text-gray-400 uppercase tracking-wide block mb-4">Telegram Bot Configuration</label>

                <div>
                  <label className="text-sm text-gray-400 uppercase tracking-wide">Bot Token</label>
                  <input type="password" placeholder="123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500" />
                </div>

                <div className="mt-4">
                  <label className="text-sm text-gray-400 uppercase tracking-wide">Chat ID</label>
                  <input type="text" placeholder="123456789" className="w-full mt-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500" />
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold">
                    Test Alert
                  </button>
                  <span className="text-xs text-gray-400 flex items-center">Send test message to verify connection</span>
                </div>

                <div>
                  <label className="flex items-center mt-4">
                    <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                    <span className="ml-3 text-sm text-gray-300">Telegram on Trade Alert</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center mt-4">
                    <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                    <span className="ml-3 text-sm text-gray-300">Telegram on Risk Limit Breach</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center mt-4">
                    <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border border-gray-700 accent-blue-600" />
                    <span className="ml-3 text-sm text-gray-300">Telegram on Error</span>
                  </label>
                </div>

                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3 mt-4">
                  <p className="text-xs text-blue-300">
                    Get bot token from @BotFather, then message your bot to find your Chat ID.
                  </p>
                </div>
              </div>
            </div>
            <button className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* API Keys */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-6">API Credentials</h3>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Alpaca API Key</label>
                <div className="flex gap-2 mt-2">
                  <input type="password" defaultValue="PKMDEKJWJ7HFGMUX4E2X..." className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Show</button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Alpaca API Secret</label>
                <div className="flex gap-2 mt-2">
                  <input type="password" defaultValue="••••••••••••••••••••••••" className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Show</button>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 uppercase tracking-wide">Polygon.io API Key</label>
                <div className="flex gap-2 mt-2">
                  <input type="password" defaultValue="WnetBf8Zr71T0F7DUg8O..." className="flex-1 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-primary-500" />
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Show</button>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-6">
                <p className="text-sm text-blue-300">
                  API keys are encrypted and stored securely. Never share your API keys with anyone.
                </p>
              </div>
            </div>
            <button className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold">
              Update Keys
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
