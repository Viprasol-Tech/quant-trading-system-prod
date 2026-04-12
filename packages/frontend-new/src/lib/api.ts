const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6005/api";

// Types
export interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  marketPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface Order {
  orderId: number;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  orderType: string;
  status: string;
  filledQuantity: number;
  avgFillPrice: number;
  createdAt: string;
}

export interface AccountSummary {
  accountId: string;
  netLiquidation: number;
  totalCash: number;
  buyingPower: number;
  grossPositionValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
}

export interface RiskMetrics {
  portfolioHeat: number;
  maxDrawdown: number;
  currentDrawdown: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
}

export interface Signal {
  id: string;
  strategy: string;
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  strength: number;
  price: number;
  timestamp: string;
  indicators: Record<string, number>;
}

export interface Strategy {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  symbols: string[];
  parameters: Record<string, number | string | boolean>;
  performance: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

export interface MarketData {
  symbol: string;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
  change?: number;
  changePercent?: number;
  timestamp?: string;
  source?: 'IBKR' | 'POLYGON';
  error?: string;
}

export interface BacktestResult {
  strategyId: string;
  strategyName: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  trades: BacktestTrade[];
  equityCurve: { date: string; equity: number }[];
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  symbol: string;
  action: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
}

export interface BacktestConfig {
  strategyId: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  parameters?: Record<string, number | string | boolean>;
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
  }

  // Portfolio
  async getPortfolio(): Promise<{ account: AccountSummary; positions: Position[] }> {
    return this.request("/portfolio");
  }

  async getPositions(): Promise<Position[]> {
    return this.request("/portfolio/positions");
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return this.request("/orders");
  }

  async placeOrder(order: {
    symbol: string;
    action: "BUY" | "SELL";
    quantity: number;
    orderType: string;
    limitPrice?: number;
  }): Promise<Order> {
    return this.request("/orders", {
      method: "POST",
      body: JSON.stringify(order),
    });
  }

  async cancelOrder(orderId: number): Promise<void> {
    return this.request(`/orders/${orderId}`, { method: "DELETE" });
  }

  // Risk
  async getRiskMetrics(): Promise<RiskMetrics> {
    return this.request("/risk");
  }

  // Signals
  async getSignals(): Promise<Signal[]> {
    return this.request("/signals");
  }

  // Strategies
  async getStrategies(): Promise<Strategy[]> {
    return this.request("/strategies");
  }

  async toggleStrategy(id: string, enabled: boolean): Promise<Strategy> {
    return this.request(`/strategies/${id}/toggle`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    });
  }

  // Market Data
  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    const response = await this.request<{ success: boolean; data: MarketData[]; count: number; error?: string }>(
      `/data/quotes?symbols=${symbols.join(",")}`
    );
    return response.data;
  }

  async getHistoricalData(
    symbol: string,
    interval: string,
    startDate: string,
    endDate: string
  ): Promise<{ bars: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> }> {
    return this.request(
      `/data/historical?symbol=${symbol}&interval=${interval}&startDate=${startDate}&endDate=${endDate}`
    );
  }

  // Backtesting
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    return this.request("/backtest/run", {
      method: "POST",
      body: JSON.stringify(config),
    });
  }

  async getBacktestHistory(): Promise<BacktestResult[]> {
    return this.request("/backtest/history");
  }

  // System
  async getSystemStatus(): Promise<{
    ibkrConnected: boolean;
    dataFeedActive: boolean;
    tradingEnabled: boolean;
    lastHeartbeat: string;
  }> {
    return this.request("/system/status");
  }
}

export const api = new ApiClient(API_BASE);

// React Query hooks
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: () => api.getPortfolio(),
    refetchInterval: 5000,
  });
}

export function usePositions() {
  return useQuery({
    queryKey: ["positions"],
    queryFn: () => api.getPositions(),
    refetchInterval: 5000,
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api.getOrders(),
    refetchInterval: 5000,
  });
}

export function useRiskMetrics() {
  return useQuery({
    queryKey: ["risk"],
    queryFn: () => api.getRiskMetrics(),
    refetchInterval: 5000,
  });
}

export function useSignals() {
  return useQuery({
    queryKey: ["signals"],
    queryFn: () => api.getSignals(),
    refetchInterval: 3000,
  });
}

export function useStrategies() {
  return useQuery({
    queryKey: ["strategies"],
    queryFn: () => api.getStrategies(),
    refetchInterval: 10000,
  });
}

export function useMarketData(symbols: string[]) {
  return useQuery({
    queryKey: ["marketData", symbols],
    queryFn: () => api.getMarketData(symbols),
    refetchInterval: 1000,
    staleTime: 5000,
    placeholderData: (prev) => prev,
    enabled: symbols.length > 0,
  });
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ["systemStatus"],
    queryFn: () => api.getSystemStatus(),
    refetchInterval: 5000,
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.placeOrder.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.cancelOrder.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRunBacktest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.runBacktest.bind(api),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backtestHistory"] });
    },
  });
}

export function useBacktestHistory() {
  return useQuery({
    queryKey: ["backtestHistory"],
    queryFn: () => api.getBacktestHistory(),
  });
}
