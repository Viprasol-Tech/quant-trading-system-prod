import { OHLCV } from './DataProvider';
export interface MassiveBar {
    c: number;
    h: number;
    l: number;
    n: number;
    o: number;
    t: number;
    v: number;
    vw: number;
}
export interface MassiveResponse {
    results?: MassiveBar[];
    status: string;
    next_url?: string;
}
export declare class MassiveAPIClient {
    private client;
    private cache;
    private readonly CACHE_TTL;
    constructor(apiKey?: string);
    /**
     * Clean up expired cache entries
     */
    private cleanupExpiredCache;
    /**
     * Fetch aggregated bars (OHLCV data)
     */
    getAggregates(ticker: string, multiplier: number | undefined, timespan: "minute" | "hour" | "day" | "week" | "month" | "quarter" | "year" | undefined, from: string, to: string): Promise<OHLCV[]>;
    /**
     * Get daily bars (convenience method)
     */
    getDailyBars(ticker: string, from: string, to: string): Promise<OHLCV[]>;
    /**
     * Get hourly bars
     */
    getHourlyBars(ticker: string, from: string, to: string): Promise<OHLCV[]>;
    /**
     * Get multiple tickers in parallel
     */
    getMultipleAggregates(tickers: string[], multiplier: number | undefined, timespan: "minute" | "hour" | "day" | undefined, from: string, to: string): Promise<Map<string, OHLCV[]>>;
    /**
     * Get last trade for a ticker
     */
    getLastTrade(ticker: string): Promise<number | null>;
    /**
     * Get quote for a ticker
     * Note: /v1/last/quote may return 404 on free tier - fallback to daily bars instead
     */
    getQuote(ticker: string): Promise<{
        bid: number;
        ask: number;
        mid: number;
        spread: number;
    } | null>;
    /**
     * Clear cache
     */
    clearCache(ticker?: string): void;
    /**
     * Get cache size and statistics
     */
    getCacheSize(): number;
    /**
     * Get detailed cache statistics
     */
    getCacheStats(): {
        size: number;
        entries: Array<{
            key: string;
            ageMs: number;
            ageDays: string;
        }>;
    };
    /**
     * Test connection
     */
    testConnection(): Promise<boolean>;
}
export default MassiveAPIClient;
//# sourceMappingURL=MassiveAPIClient.d.ts.map