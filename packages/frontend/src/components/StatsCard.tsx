import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendPercent?: number;
}

export default function StatsCard({ title, value, trend, trendPercent }: StatsCardProps) {
  const trendColor = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-primary-400'
  }[trend || 'neutral'];

  const bgColor = {
    up: 'bg-green-900/20 border-green-700/50 hover:border-green-600',
    down: 'bg-red-900/20 border-red-700/50 hover:border-red-600',
    neutral: 'bg-primary-900/10 border-primary-600/30 hover:border-primary-500'
  }[trend || 'neutral'];

  const glowClass = {
    up: '',
    down: '',
    neutral: 'hover:shadow-glow'
  }[trend || 'neutral'];

  return (
    <div className={`${bgColor} ${glowClass} border rounded-xl p-6 backdrop-blur-sm transition-all duration-300 hover:scale-105`}>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{title}</p>
        <p className="text-3xl font-bold text-white mt-3 tracking-tight">{value}</p>
        {trend && trendPercent !== undefined && (
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-sm font-semibold ${trendColor}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {Math.abs(trendPercent).toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
