export interface ComplianceData {
    symbol: string;
    compliant: boolean;
    result?: string;
    verdicts: {
        aaoifi?: boolean;
        sp?: boolean;
        dowJones?: boolean;
        msci?: boolean;
        ftse?: boolean;
    };
    verdictStrings?: {
        aaoifi?: string;
        sp?: string;
        dowJones?: string;
        msci?: string;
        ftse?: string;
    };
    impureIncome?: {
        totalPercentage: number;
        interestIncome: number;
        haram: number;
    };
    purificationAmount?: number;
    zakatPerShare?: number;
    debtRatio?: number;
    businessScreening?: string;
    lastUpdated?: string;
}
export declare class MuslimXchangeClient {
    private client;
    private baseUrl;
    private username;
    private password;
    private cache;
    private cacheExpiry;
    constructor(username: string, password: string);
    /**
     * Screen a single stock by ticker symbol
     */
    screenTicker(symbol: string): Promise<ComplianceData>;
    /**
     * Batch screen multiple stocks
     */
    batchScreenTickers(symbols: string[]): Promise<ComplianceData[]>;
    /**
     * Screen multiple stocks by market
     */
    screenMarket(market: string): Promise<ComplianceData[]>;
    /**
     * Filter compliant stocks
     */
    filterCompliantStocks(symbols: string[]): Promise<string[]>;
    /**
     * Get compliance score (0-100)
     */
    getComplianceScore(data: ComplianceData): number;
    /**
     * Clear cache
     */
    clearCache(): void;
    /**
     * Parse API response for ticker endpoint
     * API response format: { Result: "Compliant", AAOIFI: "PASS", FTSE: "PASS", ... }
     */
    private parseTickerResponse;
    /**
     * Parse API response for batch market endpoint
     */
    private parseMarketResponse;
}
export default MuslimXchangeClient;
//# sourceMappingURL=MuslimXchangeClient.d.ts.map