import React from 'react';
import { usePositions } from '../api/hooks';

export default function Positions() {
  const { data: positions = [], isLoading } = usePositions();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Open Positions</h1>
        <p className="text-gray-400">Detailed position management and P&L tracking</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading positions...</div>
      ) : positions.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center text-gray-400">
          No open positions
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Symbol</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">Quantity</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">Entry Price</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">Market Value</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">P&L</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">P&L %</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => {
                const pnl = parseFloat(position.unrealized_pl || '0');
                const pnlPercent = parseFloat(position.unrealized_plpc || '0');
                const pnlColor = pnl >= 0 ? 'text-green-400' : 'text-red-400';

                return (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/30">
                    <td className="py-4 px-6 text-white font-semibold">{position.symbol}</td>
                    <td className="text-right py-4 px-6 text-gray-300">{parseInt(position.qty || '0').toLocaleString()}</td>
                    <td className="text-right py-4 px-6 text-gray-300">${position.cost_basis || 'N/A'}</td>
                    <td className="text-right py-4 px-6 text-gray-300">
                      ${parseFloat(position.market_value || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`text-right py-4 px-6 font-semibold ${pnlColor}`}>
                      ${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`text-right py-4 px-6 font-semibold ${pnlColor}`}>{pnlPercent.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
