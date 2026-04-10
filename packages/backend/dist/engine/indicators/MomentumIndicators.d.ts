import { OHLCV } from '../../data/DataProvider';
export interface RSIState {
    value: number;
    interpretation: string;
    signal: 'overbought' | 'oversold' | 'normal';
}
export interface MACDState {
    macd: number;
    signal: number;
    histogram: number;
    interpretation: string;
    bullish: boolean;
}
export interface Divergence {
    type: 'bullish' | 'bearish';
    bar: number;
    timestamp: Date;
    priceLevel1: number;
    priceLevel2: number;
    indicatorLevel1: number;
    indicatorLevel2: number;
}
export declare class MomentumIndicators {
    /**
     * Calculate RSI (Relative Strength Index)
     */
    static calculateRSI(closes: number[], period?: number): number[];
    /**
     * Interpret RSI value
     */
    static interpretRSI(rsi: number, overbought?: number, oversold?: number): RSIState;
    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     */
    static calculateMACD(closes: number[], fast?: number, slow?: number, signal?: number): {
        macd: number[];
        signal: number[];
        histogram: number[];
    };
    /**
     * Interpret MACD state
     */
    static interpretMACD(macd: number, signal: number, histogram: number): MACDState;
    /**
     * Detect bullish divergence (price lower, indicator higher)
     */
    static detectBullishDivergence(bars: OHLCV[], indicator: number[], lookback?: number): Divergence | null;
    /**
     * Detect bearish divergence (price higher, indicator lower)
     */
    static detectBearishDivergence(bars: OHLCV[], indicator: number[], lookback?: number): Divergence | null;
    /**
     * Calculate EMA (helper)
     */
    private static calculateEMA;
}
export default MomentumIndicators;
//# sourceMappingURL=MomentumIndicators.d.ts.map