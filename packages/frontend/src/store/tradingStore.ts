import { create } from 'zustand';

export type WsStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WSPortfolio {
  totalEquity: string;
  cash: string;
  buyingPower: string;
  dayPnL: string;
  unrealizedPnL: string;
}

export interface WSPosition {
  symbol: string;
  qty: string;
  avg_entry_price?: string;
  current_price?: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}

export interface WSOrder {
  id: string;
  symbol: string;
  qty: string;
  side: string;
  status: string;
  created_at: string;
}

export interface TradingStoreState {
  portfolio: WSPortfolio | null;
  positions: WSPosition[];
  orders: WSOrder[];
  wsStatus: WsStatus;
  lastUpdate: string | null;
  setPortfolioUpdate: (data: {
    portfolio?: WSPortfolio;
    positions?: WSPosition[];
    orders?: WSOrder[];
  }, timestamp: string) => void;
  setWsStatus: (status: WsStatus) => void;
}

export const useTradingStore = create<TradingStoreState>((set) => ({
  portfolio: null,
  positions: [],
  orders: [],
  wsStatus: 'disconnected',
  lastUpdate: null,

  setPortfolioUpdate: (data, timestamp) =>
    set((state) => ({
      portfolio: data.portfolio || state.portfolio,
      positions: data.positions !== undefined ? data.positions : state.positions,
      orders: data.orders !== undefined ? data.orders : state.orders,
      lastUpdate: timestamp,
    })),

  setWsStatus: (status) =>
    set({
      wsStatus: status,
    }),
}));
