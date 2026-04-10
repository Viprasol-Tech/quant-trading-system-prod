import { OHLCV } from '../../data/DataProvider';
export interface BollingerBands {
    upper: number;
    middle: number;
    lower: number;
    width: number;
    pctB: number;
    bandwidth: number;
}
export interface VolatilityState {
    atr: number;
    bollingerBands: BollingerBands;
    isSqueezing: boolean;
    volatilityRegime: 'high' | 'normal' | 'low';
}
export declare class VolatilityIndicators {
    /**
     * Calculate ATR (Average True Range)
     */
    static calculateATR(bars: OHLCV[], period?: number): number[];
    /**
     * Calculate Bollinger Bands
     */
    static calculateBollingerBands(closes: number[], period?: number, stdDev?: number): BollingerBands[];
    /**
     * Detect Bollinger Band squeeze (low volatility)
     */
    static detectSqueeze(bands: BollingerBands[], threshold?: number): boolean;
    /**
     * Get latest volatility state
     */
    static getVolatilityState(bars: OHLCV[], closes: number[], threshold?: number): VolatilityState;
    /**
     * Get ATR as percentage of close
     */
    static getATRPercent(atr: number, close: number): number;
    /**
     * Get ATR percentile rank (0-1)
     */
    private static getATRPercentile;
    /**
     * Helper: Calculate SMA
     */
    private static calculateSMA;
}
export default VolatilityIndicators;
//# sourceMappingURL=VolatilityIndicators.d.ts.map