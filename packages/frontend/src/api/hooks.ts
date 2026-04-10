import { useQuery } from '@tanstack/react-query';
import apiClient from './client';
import { useTradingStore } from '../store/tradingStore';

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

// Portfolio hooks - now using Zustand store instead of polling
export const usePortfolioStats = () => {
  const portfolio = useTradingStore((state) => state.portfolio);

  return {
    data: portfolio ? {
      accountValue: portfolio.totalEquity,
      cash: portfolio.cash,
      buyingPower: portfolio.buyingPower,
      tradingExponent: '0',
      multiplier: '1',
      portfolio_value: portfolio.totalEquity,
      dayTradeCount: 0,
    } : undefined,
    isLoading: false,
  };
};

export const usePortfolio = () => {
  const portfolio = useTradingStore((state) => state.portfolio);

  return {
    data: portfolio,
    isLoading: false,
  };
};

// Positions hooks - now using Zustand store
export const usePositions = () => {
  const positions = useTradingStore((state) => state.positions);

  return {
    data: positions,
    isLoading: false,
  };
};

export const usePosition = (symbol: string) => {
  const positions = useTradingStore((state) => state.positions);
  const position = positions.find((p) => p.symbol === symbol);

  return {
    data: position,
    isLoading: false,
  };
};

// Orders hooks - now using Zustand store
export const useOrders = (status?: string) => {
  const orders = useTradingStore((state) => state.orders);
  const filteredOrders = status
    ? orders.filter((o) => o.status.toLowerCase() === status.toLowerCase())
    : orders;

  return {
    data: filteredOrders,
    isLoading: false,
  };
};

export const useOrder = (orderId: string) => {
  const orders = useTradingStore((state) => state.orders);
  const order = orders.find((o) => o.id === orderId);

  return {
    data: order,
    isLoading: false,
  };
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
