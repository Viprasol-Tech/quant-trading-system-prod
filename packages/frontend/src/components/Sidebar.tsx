import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navCategories = [
  {
    category: 'Dashboard',
    color: 'from-primary-600 to-primary-700',
    icon: '📊',
    items: [
      { path: '/', label: 'Overview' },
    ]
  },
  {
    category: 'Trading',
    color: 'from-green-600 to-emerald-700',
    icon: '📈',
    items: [
      { path: '/positions', label: 'Positions' },
      { path: '/orders', label: 'Orders' },
      { path: '/strategies', label: 'Strategies' },
    ]
  },
  {
    category: 'Analytics',
    color: 'from-blue-600 to-cyan-700',
    icon: '📉',
    items: [
      { path: '/market', label: 'Market Data' },
      { path: '/risk', label: 'Risk Manager' },
    ]
  },
  {
    category: 'System',
    color: 'from-purple-600 to-indigo-700',
    icon: '⚙️',
    items: [
      { path: '/configuration', label: 'Configuration' },
      { path: '/settings', label: 'Settings' },
    ]
  },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-72 bg-gradient-to-b from-gray-900 via-gray-920 to-gray-950 border-r border-primary-600/30 overflow-y-auto">
      <div className="sticky top-0 bg-gradient-to-b from-gray-900 to-transparent px-6 py-6 border-b border-primary-600/20 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-300 to-primary-500 bg-clip-text text-transparent">Trading</h1>
            <p className="text-xs text-primary-400 font-semibold">System</p>
          </div>
        </div>
        <div className="mt-3 px-3 py-2 bg-primary-600/20 rounded-lg border border-primary-500/30">
          <p className="text-xs text-primary-300 font-semibold">Shariah Compliant</p>
        </div>
      </div>

      <nav className="px-4 py-6 space-y-4">
        {navCategories.map((cat) => {
          const catItems = cat.items;
          const hasActive = catItems.some(item => location.pathname === item.path);

          return (
            <div key={cat.category}>
              <div className={`h-12 rounded-xl bg-gradient-to-r ${cat.color} p-3 flex items-center gap-2 mb-2 shadow-md`}>
                <span className="text-lg">{cat.icon}</span>
                <span className="text-white font-bold text-sm">{cat.category}</span>
              </div>

              <div className="space-y-1 pl-2">
                {catItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`block px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                        isActive
                          ? 'bg-primary-600/80 text-white shadow-glow'
                          : 'text-gray-300 hover:bg-gray-800/60 hover:text-primary-200'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-primary-600/20 bg-gradient-to-t from-gray-950 to-transparent">
        <div className="space-y-2 text-center">
          <p className="text-xs text-primary-400 font-semibold">Version 1.0.0</p>
          <div className="h-6 flex items-center justify-center">
            <div className="h-1 w-1 bg-green-500 rounded-full animate-pulse"></div>
            <p className="text-xs text-green-400 ml-1.5 font-semibold">Paper Trading</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
