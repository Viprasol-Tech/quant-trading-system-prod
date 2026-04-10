import { OHLCV } from '../../data/DataProvider';
export type MarketRegime = 'bull' | 'bear' | 'range' | 'transition';
export type VolatilityRegime = 'high' | 'normal' | 'low';
export interface RegimeState {
    marketRegime: MarketRegime;
    volatilityRegime: VolatilityRegime;
    trendStrength: number;
    confidence: number;
    interpretation: string;
}
export declare class RegimeDetection {
    /**
     * Classify market regime: Bull / Bear / Range
     */
    static classifyMarketRegime(price: number, ma50: number, ma100: number, ma200: number, adx?: number): MarketRegime;
    /**
     * Calculate ADX (Average Directional Index)
     * Measures trend strength from 0-100
     */
    static calculateADX(bars: OHLCV[], period?: number): number[];
    /**
     * Classify volatility regime
     */
    static classifyVolatilityRegime(currentATR: number, atrValues: number[], lookback?: number): VolatilityRegime;
    /**
     * Calculate trend strength (0-100)
     */
    static calculateTrendStrength(adx: number, rsi: number, maAlignment: boolean): number;
    /**
     * Get complete regime state
     */
    static getRegimeState(bars: OHLCV[], price: number, ma50: number, ma100: number, ma200: number, atrValues: number[], adxValues: number[], rsi: number): RegimeState;
}
export default RegimeDetection;
//# sourceMappingURL=RegimeDetection.d.ts.map