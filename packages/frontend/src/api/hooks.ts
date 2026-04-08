import { useQuery } from '@tanstack/react-query';
import apiClient from './client';

// Types
export interface PortfolioStats {
  accountValue: string;
  cash: string;
  buyingPower: string;
  tradingExponent: string;
  multiplier: string;
  portfolio_value: string;
  dayTradeCount: number;
}

export interface Position {
  symbol: string;
  qty: string;
  avg_entry_price?: string;
  current_price?: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl?: string;
  unrealized_intraday_plpc?: string;
  quantity?: string;
  side?: string;
  cost_basis?: string;
}

export interface Order {
  id: string;
  symbol: string;
  qty: string;
  side: string;
  status: string;
  filledQty?: string;
  filledAvgPrice?: string;
  created_at: string;
  updated_at?: string;
}

export interface MarketData {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw?: number;
}

// Portfolio hooks
export const usePortfolioStats = () => {
  return useQuery({
    queryKey: ['portfolio', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<PortfolioStats>('/portfolio/stats');
      return response.data;
    },
    refetchInterval: 5000, // Refetch every 5s
    retry: 1
  });
};

export const usePortfolio = () => {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: async () => {
      const response = await apiClient.get('/portfolio');
      return response.data;
    },
    refetchInterval: 5000,
    retry: 1
  });
};

// Positions hooks
export const usePositions = () => {
  return useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const response = await apiClient.get<Position[]>('/positions');
      return response.data;
    },
    refetchInterval: 5000,
    retry: 1
  });
};

export const usePosition = (symbol: string) => {
  return useQuery({
    queryKey: ['positions', symbol],
    queryFn: async () => {
      const response = await apiClient.get<Position>(`/positions/${symbol}`);
      return response.data;
    },
    refetchInterval: 5000,
    retry: 1
  });
};

// Orders hooks
export const useOrders = (status?: string) => {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: async () => {
      const params = status ? { status } : {};
      const response = await apiClient.get<Order[]>('/orders', { params });
      return response.data;
    },
    refetchInterval: 5000,
    retry: 1
  });
};

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: ['orders', orderId],
    queryFn: async () => {
      const response = await apiClient.get<Order>(`/orders/${orderId}`);
      return response.data;
    },
    refetchInterval: 5000,
    retry: 1
  });
};

// Market data hooks
export const useMarketData = (symbol: string, from: string, to: string, timeframe: string = 'day') => {
  return useQuery({
    queryKey: ['market-data', symbol, from, to, timeframe],
    queryFn: async () => {
      const response = await apiClient.get<MarketData[]>('/data/bars', {
        params: { symbol, from, to, timeframe }
      });
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30s for market data
    retry: 1
  });
};

export const useMultitimeframeData = (symbol: string, from: string, to: string) => {
  return useQuery({
    queryKey: ['multitimeframe', symbol, from, to],
    queryFn: async () => {
      const response = await apiClient.get('/data/multitimeframe', {
        params: { symbol, from, to }
      });
      return response.data;
    },
    refetchInterval: 30000,
    retry: 1
  });
};
