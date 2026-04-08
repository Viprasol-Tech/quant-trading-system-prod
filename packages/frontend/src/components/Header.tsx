import React from 'react';
import { usePortfolioStats } from '../api/hooks';

export default function Header() {
  const { data: stats, isLoading } = usePortfolioStats();

  return (
    <header className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-primary-600/20 px-8 py-6 flex items-center justify-between backdrop-blur-sm">
      <div>
        <h2 className="text-2xl font-bold text-white">Trading Dashboard</h2>
        <p className="text-sm text-primary-400/70 mt-1">Real-time monitoring & control</p>
      </div>

      <div className="flex gap-12">
        {isLoading ? (
          <div className="text-primary-400/60 text-sm font-semibold">Loading...</div>
        ) : stats ? (
          <>
            <div className="text-right px-4 py-2 rounded-xl bg-green-900/20 border border-green-700/30">
              <p className="text-xs text-green-400/70 uppercase tracking-widest font-semibold">Account Value</p>
              <p className="text-xl font-bold text-green-400 mt-1">
                ${parseFloat(stats.accountValue || stats.portfolio_value || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right px-4 py-2 rounded-xl bg-primary-900/20 border border-primary-600/30">
              <p className="text-xs text-primary-400/70 uppercase tracking-widest font-semibold">Cash</p>
              <p className="text-xl font-bold text-primary-400 mt-1">
                ${parseFloat(stats.cash || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right px-4 py-2 rounded-xl bg-amber-900/20 border border-amber-700/30">
              <p className="text-xs text-amber-400/70 uppercase tracking-widest font-semibold">Buying Power</p>
              <p className="text-xl font-bold text-amber-400 mt-1">
                ${parseFloat(stats.buyingPower || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
