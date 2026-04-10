/**
 * Python Service Client
 * Connects to Python service (port 6105) for REAL IBKR data
 * NO MOCK DATA - everything from actual IBKR connection
 */
export interface AccountSummary {
    account_id: string;
    net_liquidation: string;
    total_cash: string;
    buying_power: string;
    gross_position_value: string;
    available_funds: string;
    excess_liquidity: string;
    currency: string;
}
export interface Position {
    symbol: string;
    qty: string;
    avg_entry_price: string;
    current_price: string | null;
    market_value: string;
    unrealized_pl: string;
    unrealized_plpc: string;
    side: 'long' | 'short';
}
export interface Order {
    order_id: string;
    symbol: string;
    qty: string;
    filled_qty: string;
    side: 'BUY' | 'SELL';
    order_type: string;
    status: string;
    limit_price?: string;
    stop_price?: string;
    created_at: string;
}
export interface MarketData {
    symbol: string;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    timestamp: string;
}
export interface HealthStatus {
    status: string;
    ibkr_connected: boolean;
    timestamp: string;
}
declare class PythonServiceClient {
    private client;
    private baseUrl;
    private connected;
    private lastHealthCheck;
    private healthCheckInterval;
    constructor();
    /**
     * Check if Python service and IBKR are connected
     */
    checkHealth(): Promise<HealthStatus>;
    /**
     * Get connection status (cached)
     */
    isConnected(): Promise<boolean>;
    /**
     * Get account summary - REAL DATA
     */
    getAccountSummary(): Promise<AccountSummary | null>;
    /**
     * Get all positions - REAL DATA
     */
    getPositions(): Promise<Position[]>;
    /**
     * Get open orders - REAL DATA
     */
    getOrders(): Promise<Order[]>;
    /**
     * Submit order - REAL EXECUTION
     */
    submitOrder(params: {
        symbol: string;
        quantity: number;
        order_type: 'MKT' | 'LMT' | 'STP';
        price?: number;
    }): Promise<Order | null>;
    /**
     * Cancel order
     */
    cancelOrder(orderId: string): Promise<boolean>;
    /**
     * Get market data for symbol - REAL DATA
     */
    getMarketData(symbol: string): Promise<MarketData | null>;
    /**
     * Get historical data
     */
    getHistoricalData(symbol: string, barSize?: string, duration?: string): Promise<any[]>;
}
export declare const pythonService: PythonServiceClient;
export default pythonService;
//# sourceMappingURL=PythonServiceClient.d.ts.map