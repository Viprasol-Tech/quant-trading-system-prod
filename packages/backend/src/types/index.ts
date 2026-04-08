import Decimal from 'decimal.js';

// Trading Types
export interface TradeSignal {
  symbol: string;
  direction: 'long';
  entryPrice: Decimal;
  stopLoss: Decimal;
  takeProfit: Decimal;
  riskAmount: Decimal;
  riskPercent: number;
  confidence: number; // 0-100
  rating: string; // Strong Buy / Buy / Neutral / Sell / Strong Sell
  strategy: string; // Strategy name
  timeframe: string;
  timestamp: Date;
  reasoning: string;
}

export interface TradePlan {
  signal: TradeSignal;
  positionSize: number;
  stopLoss: Decimal;
  takeProfit1: Decimal; // Partial exit at 1.5R
  takeProfit2: Decimal; // Full exit target
  riskReward: Decimal;
  riskAmount: Decimal;
  riskPercent: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  entryPrice: Decimal;
  currentPrice: Decimal;
  pnl: Decimal;
  pnlPercent: number;
  stopLoss: Decimal;
  takeProfit: Decimal;
  entryTime: Date;
  strategy: string;
}

export interface Portfolio {
  totalEquity: Decimal;
  totalCash: Decimal;
  positions: Position[];
  openPositions: number;
  openRisk: Decimal;
  maxRisk: Decimal;
  riskPercent: number;
  drawdown: number;
}

export interface Order {
  id: string;
  symbol: string;
  quantity: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price?: Decimal;
  status: 'pending' | 'filled' | 'rejected' | 'cancelled';
  filledQuantity: number;
  filledPrice?: Decimal;
  timestamp: Date;
}

export interface Trade {
  id: string;
  symbol: string;
  entryTime: Date;
  exitTime?: Date;
  entryPrice: Decimal;
  exitPrice?: Decimal;
  quantity: number;
  pnl?: Decimal;
  pnlPercent?: number;
  riskReward?: Decimal;
  duration?: number; // seconds
  strategy: string;
  status: 'open' | 'closed';
}

// Market Data Types
export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketData {
  symbol: string;
  timestamp: Date;
  price: Decimal;
  bid: Decimal;
  ask: Decimal;
  bidSize: number;
  askSize: number;
  volume: number;
}

// Risk Management Types
export interface RiskMetrics {
  portfolioHeat: Decimal;
  maxHeat: Decimal;
  drawdown: number;
  maxDrawdown: number;
  sharpeRatio: number;
  calmarRatio: number;
  profitFactor: number;
  winRate: number;
  expectancy: number;
}

export interface StopLoss {
  initial: Decimal;
  current: Decimal;
  trailing: boolean;
  breakeven: boolean;
}

export interface TakeProfit {
  target1: Decimal; // Partial exit
  target2: Decimal; // Full exit
  partialExitPct: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface PortfolioUpdate extends WebSocketMessage {
  type: 'portfolio_update';
  data: Portfolio;
}

export interface TradeSignalMessage extends WebSocketMessage {
  type: 'trade_signal';
  data: TradeSignal;
}

export interface MarketUpdate extends WebSocketMessage {
  type: 'market_update';
  data: MarketData[];
}

export interface PositionUpdate extends WebSocketMessage {
  type: 'position_update';
  data: Position;
}

// Error Types
export interface AppError extends Error {
  code: string;
  statusCode: number;
  context?: Record<string, any>;
}
