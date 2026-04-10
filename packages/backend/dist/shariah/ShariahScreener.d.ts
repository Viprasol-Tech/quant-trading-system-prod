export interface EquityFinancials {
    symbol: string;
    marketCap: number;
    totalDebt: number;
    totalAssets: number;
    haramIncome: number;
    percentageHaramIncome: number;
}
export interface ScreeningResult {
    symbol: string;
    isCompliant: boolean;
    reasons: string[];
    score: number;
}
/**
 * AAOIFI Standard No. 21 - Shariah Compliance Screening
 * - Debt/Market Cap < 30%
 * - Haram income < 5%
 * - No involvement in prohibited industries
 */
export declare class ShariahScreener {
    private prohibitedIndustries;
    private prohibitedCompanies;
    /**
     * Screen equity for Shariah compliance
     */
    screenEquity(financials: EquityFinancials): ScreeningResult;
    /**
     * Screen multiple equities
     */
    screenMultiple(equities: EquityFinancials[]): ScreeningResult[];
    /**
     * Filter compliant equities
     */
    filterCompliant(equities: EquityFinancials[]): EquityFinancials[];
    /**
     * Get Shariah score (0-100)
     */
    getScore(financials: EquityFinancials): number;
    /**
     * Check if industry is prohibited
     */
    isProhibitedIndustry(industry: string): boolean;
    /**
     * Check if company is in prohibited list
     */
    isProhibitedCompany(symbol: string): boolean;
    /**
     * Add custom prohibited company
     */
    addProhibitedCompany(symbol: string): void;
    /**
     * Remove from prohibited list
     */
    removeProhibitedCompany(symbol: string): void;
}
export default ShariahScreener;
//# sourceMappingURL=ShariahScreener.d.ts.map