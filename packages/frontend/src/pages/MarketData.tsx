import React, { useState } from 'react';
import { useMarketData } from '../api/hooks';

export default function MarketData() {
  const [symbol, setSymbol] = useState('AAPL');
  const [fromDate, setFromDate] = useState('2026-03-20');
  const [toDate, setToDate] = useState('2026-03-31');

  const { data: marketData = [], isLoading } = useMarketData(symbol, fromDate, toDate);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Market Data</h1>
        <p className="text-gray-400">OHLCV data and multi-timeframe analysis</p>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm text-gray-400 uppercase tracking-wide">Symbol</label>
          <input
            type="text"
            placeholder="Symbol (e.g., AAPL)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-sm text-gray-400 uppercase tracking-wide">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-primary-500"
          />
        </div>
        <div className="flex-1">
          <label className="text-sm text-gray-400 uppercase tracking-wide">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full mt-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading market data...</div>
      ) : marketData.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-400">
          No data available for {symbol}
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="text-left py-3 px-4 text-gray-300 font-semibold">Date</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Open</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">High</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Low</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Close</th>
                <th className="text-right py-3 px-4 text-gray-300 font-semibold">Volume</th>
              </tr>
            </thead>
            <tbody>
              {marketData.slice().reverse().map((bar: any, index: number) => (
                <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/30">
                  <td className="py-3 px-4 text-gray-300">{new Date(bar.t).toLocaleDateString()}</td>
                  <td className="text-right py-3 px-4 text-gray-300">${bar.o.toFixed(2)}</td>
                  <td className="text-right py-3 px-4 text-green-400">${bar.h.toFixed(2)}</td>
                  <td className="text-right py-3 px-4 text-red-400">${bar.l.toFixed(2)}</td>
                  <td className="text-right py-3 px-4 text-white font-semibold">${bar.c.toFixed(2)}</td>
                  <td className="text-right py-3 px-4 text-gray-300">{(bar.v / 1000000).toFixed(2)}M</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
