import Decimal from 'decimal.js';
export interface TradeSignal {
    symbol: string;
    direction: 'long';
    entryPrice: Decimal;
    stopLoss: Decimal;
    takeProfit: Decimal;
    riskAmount: Decimal;
    riskPercent: number;
    confidence: number;
    rating: string;
    strategy: string;
    timeframe: string;
    timestamp: Date;
    reasoning: string;
}
export interface TradePlan {
    signal: TradeSignal;
    positionSize: number;
    stopLoss: Decimal;
    takeProfit1: Decimal;
    takeProfit2: Decimal;
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
    duration?: number;
    strategy: string;
    status: 'open' | 'closed';
}
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
    target1: Decimal;
    target2: Decimal;
    partialExitPct: number;
}
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
export interface AppError extends Error {
    code: string;
    statusCode: number;
    context?: Record<string, any>;
}
//# sourceMappingURL=index.d.ts.map