/**
 * IBKR Account Information
 */
export interface IBKRAccount {
    account_id: string;
    account_type: string;
    status: string;
    currency: string;
    buying_power: string;
    cash: string;
    portfolio_value: string;
    equity: string;
    long_market_value: string;
    short_market_value: string;
    multiplier: string;
    shorting_enabled: boolean;
    day_trading_buying_power: string;
    net_liquidation_value: string;
    gross_position_value: string;
    created_at: string;
    updated_at: string;
    daytrade_count: number;
    margin_requirement: string;
    maintenance_excess: string;
    available_funds: string;
}
/**
 * IBKR Position
 */
export interface IBKRPosition {
    contract_id: string;
    symbol: string;
    exchange: string;
    asset_class: string;
    avg_entry_price: string;
    qty: string;
    side: 'long' | 'short';
    market_value: string;
    cost_basis: string;
    unrealized_gain: string;
    unrealized_gain_pct: string;
    current_price: string;
    currency: string;
    percentage_of_portfolio: string;
}
/**
 * IBKR Order
 */
export interface IBKROrder {
    order_id: string;
    client_order_id: string;
    symbol: string;
    qty: string;
    filled_qty: string;
    avg_filled_price: string;
    order_type: 'MKT' | 'LMT' | 'STP' | 'STP_LMT';
    side: 'BUY' | 'SELL';
    status: 'PendingSubmit' | 'PreSubmitted' | 'Submitted' | 'ApiPending' | 'ApiCancelled' | 'Cancelled' | 'Filled' | 'Inactive';
    time_in_force: 'DAY' | 'GTC' | 'OPG' | 'CLO';
    limit_price?: string;
    stop_price?: string;
    trailing_stop_pct?: string;
    created_at: string;
    updated_at: string;
    submitted_at?: string;
    filled_at?: string;
    canceled_at?: string;
    parent_id?: string;
    transmit?: boolean;
}
/**
 * IBKR Gateway Client
 * Connects to IBKR Gateway via socket and provides REST-like interface
 *
 * Default ports:
 * - Paper trading: 4002
 * - Live trading: 4001
 */
export declare class IBKRClient {
    private gatewayHost;
    private gatewayPort;
    private clientId;
    private connected;
    private accountId;
    private orderIdCounter;
    private orders;
    private positions;
    private lastUpdate;
    private cache;
    private cacheTTL;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private reconnectDelay;
    constructor(host?: string, port?: number, clientId?: number);
    /**
     * Connect to IBKR Gateway
     */
    connect(): Promise<void>;
    /**
     * Disconnect from IBKR Gateway
     */
    disconnect(): Promise<void>;
    /**
     * Check if connected
     */
    isConnected(): boolean;
    /**
     * Get account information
     */
    getAccount(): Promise<IBKRAccount>;
    /**
     * Get all positions
     */
    getPositions(): Promise<IBKRPosition[]>;
    /**
     * Get specific position
     */
    getPosition(symbol: string): Promise<IBKRPosition | null>;
    /**
     * Submit order
     */
    submitOrder(params: {
        symbol: string;
        qty: number | string;
        side: 'buy' | 'sell';
        order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
        limit_price?: number | string;
        stop_price?: number | string;
        time_in_force?: 'day' | 'gtc' | 'opg' | 'cls';
        extended_hours?: boolean;
        client_order_id?: string;
    }): Promise<IBKROrder>;
    /**
     * Cancel specific order
     */
    cancelOrder(orderId: string): Promise<void>;
    /**
     * Cancel all orders
     */
    cancelAllOrders(): Promise<void>;
    /**
     * Get order details
     */
    getOrder(orderId: string): Promise<IBKROrder>;
    /**
     * Get orders with optional filtering
     */
    getOrders(params?: {
        status?: string;
        limit?: number;
        nested?: boolean;
        symbols?: string;
    }): Promise<IBKROrder[]>;
    /**
     * Close position
     */
    closePosition(symbol: string, qty?: number | string): Promise<IBKROrder>;
    /**
     * Get account configuration
     */
    getAccountConfig(): Promise<Record<string, any>>;
    /**
     * Get market calendar
     */
    getCalendar(params?: {
        start?: string;
        end?: string;
    }): Promise<any[]>;
    /**
     * Get market clock
     */
    getClock(): Promise<any>;
    /**
     * Test connection to IBKR Gateway
     */
    testConnection(): Promise<boolean>;
    /**
     * Private helper: Ensure connected
     */
    private ensureConnected;
    /**
     * Private helper: Get cached data
     */
    private getCachedData;
    /**
     * Private helper: Cache data
     */
    private cacheData;
    /**
     * Private helper: Check if market is open
     */
    private isMarketOpen;
}
declare const _default: IBKRClient;
export default _default;
//# sourceMappingURL=IBKRClient.d.ts.map