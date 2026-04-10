export interface AlpacaAccount {
    id: string;
    account_number: string;
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
    regt_buying_power: string;
    sma: string;
    created_at: string;
    updated_at: string;
    daytrade_count: number;
    last_maintenance_margin: string;
    daytrading_buying_power: string;
    cash_withdrawable: string;
}
export interface AlpacaPosition {
    asset_id: string;
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
    unrealized_intraday_gain: string;
    unrealized_intraday_gain_pct: string;
    current_price: string;
    lastday_price: string;
    change_today: string;
}
export interface AlpacaOrder {
    id: string;
    client_order_id: string;
    created_at: string;
    updated_at: string;
    submitted_at: string;
    filled_at: string | null;
    expired_at: string | null;
    canceled_at: string | null;
    failed_at: string | null;
    replaced_by: string | null;
    replaces: string | null;
    symbol: string;
    asset_id: string;
    asset_class: string;
    notional: string | null;
    qty: string | null;
    filled_qty: string;
    filled_avg_price: string | null;
    order_class: string;
    order_type: string;
    type: string;
    side: 'buy' | 'sell';
    time_in_force: string;
    limit_price: string | null;
    stop_price: string | null;
    status: string;
    extended_hours: boolean;
    legs: null;
    trail_price: string | null;
    trail_percent: string | null;
    hwm: string | null;
}
export interface AlpacaTrade {
    id: string;
    account_number: string;
    symbol: string;
    asset_id: string;
    asset_class: string;
    exchange: string;
    order_id: string;
    order_client_id: string;
    direction: string;
    order_type: string;
    price: string;
    quantity: string;
    side: 'buy' | 'sell';
    timestamp: string;
    leaves_qty: string;
    cum_qty: string;
    filled_avg_price: string;
    filled_qty: string;
    type: string;
}
export declare class AlpacaClient {
    private client;
    private baseUrl;
    constructor(apiKey?: string, apiSecret?: string);
    /**
     * Get account information
     */
    getAccount(): Promise<AlpacaAccount>;
    /**
     * Get all open positions
     */
    getPositions(): Promise<AlpacaPosition[]>;
    /**
     * Get specific position by symbol
     */
    getPosition(symbol: string): Promise<AlpacaPosition>;
    /**
     * Submit a new order
     */
    submitOrder(params: {
        symbol: string;
        qty?: number;
        notional?: number;
        side: 'buy' | 'sell';
        type: 'market' | 'limit' | 'stop' | 'stop_limit';
        time_in_force?: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
        limit_price?: number;
        stop_price?: number;
        extended_hours?: boolean;
        order_class?: string;
        take_profit?: {
            limit_price: number;
        };
        stop_loss?: {
            stop_price: number;
        };
    }): Promise<AlpacaOrder>;
    /**
     * Cancel an order by ID
     */
    cancelOrder(orderId: string): Promise<void>;
    /**
     * Cancel all orders
     */
    cancelAllOrders(): Promise<void>;
    /**
     * Get order by ID
     */
    getOrder(orderId: string): Promise<AlpacaOrder>;
    /**
     * Get all orders
     */
    getOrders(params?: {
        status?: 'open' | 'closed' | 'all';
        limit?: number;
        after?: string;
        until?: string;
        direction?: 'asc' | 'desc';
        nested?: boolean;
        side?: 'buy' | 'sell';
    }): Promise<AlpacaOrder[]>;
    /**
     * Close a position
     */
    closePosition(symbol: string, qty?: number | string): Promise<AlpacaOrder>;
    /**
     * Get account configuration
     */
    getAccountConfig(): Promise<Record<string, any>>;
    /**
     * Get calendar (trading hours)
     */
    getCalendar(params?: {
        start?: string;
        end?: string;
    }): Promise<any[]>;
    /**
     * Get clock (market status)
     */
    getClock(): Promise<any>;
}
export default AlpacaClient;
//# sourceMappingURL=AlpacaClient.d.ts.map