import React, { useState } from 'react';
import { useOrders } from '../api/hooks';

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: orders = [], isLoading } = useOrders(statusFilter);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Order History</h1>
        <p className="text-gray-400">View and manage all your trade orders</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setStatusFilter(undefined)} className={`px-4 py-2 rounded-xl font-semibold transition-colors ${!statusFilter ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>All</button>
        <button onClick={() => setStatusFilter('filled')} className={`px-4 py-2 rounded-xl font-semibold transition-colors ${statusFilter === 'filled' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Filled</button>
        <button onClick={() => setStatusFilter('pending')} className={`px-4 py-2 rounded-xl font-semibold transition-colors ${statusFilter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Pending</button>
        <button onClick={() => setStatusFilter('cancelled')} className={`px-4 py-2 rounded-xl font-semibold transition-colors ${statusFilter === 'cancelled' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Cancelled</button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-12 text-center text-gray-400">
          No orders found
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Order ID</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Symbol</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Side</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">Quantity</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Status</th>
                <th className="text-left py-4 px-6 text-gray-300 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => {
                const statusColor = {
                  filled: 'text-green-400 bg-green-900/30',
                  pending: 'text-yellow-400 bg-yellow-900/30',
                  cancelled: 'text-red-400 bg-red-900/30',
                  rejected: 'text-red-400 bg-red-900/30'
                }[order.status] || 'text-gray-400';

                return (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/30">
                    <td className="py-4 px-6 text-gray-300 font-mono text-sm">{order.id.slice(0, 8)}...</td>
                    <td className="py-4 px-6 text-white font-semibold">{order.symbol}</td>
                    <td className="py-4 px-6 text-gray-300">{order.side.toUpperCase()}</td>
                    <td className="text-right py-4 px-6 text-gray-300">{order.qty}</td>
                    <td className={`py-4 px-6 font-semibold px-3 py-1 rounded ${statusColor}`}>{order.status}</td>
                    <td className="py-4 px-6 text-gray-400 text-xs">{new Date(order.created_at).toLocaleString()}</td>
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
