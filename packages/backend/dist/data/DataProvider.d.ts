export interface OHLCV {
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export interface Bar {
    t: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    n: number;
    vw: number;
}
export interface AlpacaBar {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw?: number;
    n?: number;
}
export declare class DataProvider {
    private alpacaClient;
    private cache;
    constructor();
    /**
     * Fetch OHLCV data from Alpaca
     */
    fetchOHLCV(symbol: string, start: Date, end: Date, timeframe?: string): Promise<OHLCV[]>;
    /**
     * Fetch multiple symbols in parallel
     */
    fetchMultipleOHLCV(symbols: string[], start: Date, end: Date, timeframe?: string): Promise<Map<string, OHLCV[]>>;
    /**
     * Clear cache for a specific symbol
     */
    clearCache(symbol?: string, timeframe?: string): void;
    /**
     * Get cache size
     */
    getCacheSize(): number;
    /**
     * Validate OHLCV data
     */
    static validateData(data: OHLCV[]): boolean;
}
export default DataProvider;
//# sourceMappingURL=DataProvider.d.ts.map