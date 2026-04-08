import React from 'react';
import { usePortfolioStats, usePositions, useOrders } from '../api/hooks';
import StatsCard from '../components/StatsCard';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = usePortfolioStats();
  const { data: positions = [], isLoading: positionsLoading } = usePositions();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Portfolio Overview</h1>
        <p className="text-gray-400">Real-time trading metrics and position summary</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statsLoading ? (
          <div className="col-span-4 text-center py-8 text-gray-400">Loading statistics...</div>
        ) : stats ? (
          <>
            <StatsCard
              title="Total Account Value"
              value={`$${parseFloat(stats.portfolio_value || stats.accountValue || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <StatsCard
              title="Available Cash"
              value={`$${parseFloat(stats.cash || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              trend="up"
            />
            <StatsCard
              title="Buying Power"
              value={`$${parseFloat(stats.buyingPower || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <StatsCard
              title="Open Positions"
              value={positions.length}
            />
          </>
        ) : null}
      </div>

      {/* Positions */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Open Positions</h2>
        {positionsLoading ? (
          <div className="text-center py-8 text-gray-400">Loading positions...</div>
        ) : positions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No open positions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Symbol</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">Quantity</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">Market Value</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">Unrealized P&L</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">P&L %</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const pnl = parseFloat(position.unrealized_pl || '0');
                  const pnlPercent = parseFloat(position.unrealized_plpc || '0');
                  const pnlColor = pnl >= 0 ? 'text-green-400' : 'text-red-400';

                  return (
                    <tr key={position.symbol} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-white font-semibold">{position.symbol}</td>
                      <td className="text-right py-3 px-4 text-gray-300">{parseInt(position.qty || '0').toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-gray-300">
                        ${parseFloat(position.market_value || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`text-right py-3 px-4 font-semibold ${pnlColor}`}>
                        ${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`text-right py-3 px-4 font-semibold ${pnlColor}`}>
                        {pnlPercent.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Recent Orders</h2>
        {ordersLoading ? (
          <div className="text-center py-8 text-gray-400">Loading orders...</div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Symbol</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Side</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">Quantity</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const statusColor = {
                    filled: 'text-green-400',
                    pending: 'text-yellow-400',
                    cancelled: 'text-red-400',
                    rejected: 'text-red-400'
                  }[order.status] || 'text-gray-400';

                  return (
                    <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="py-3 px-4 text-white font-semibold">{order.symbol}</td>
                      <td className="py-3 px-4 text-gray-300">{order.side.toUpperCase()}</td>
                      <td className="text-right py-3 px-4 text-gray-300">{order.qty}</td>
                      <td className={`py-3 px-4 font-semibold ${statusColor}`}>{order.status}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
