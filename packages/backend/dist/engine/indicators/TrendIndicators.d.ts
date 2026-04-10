import { OHLCV } from '../../data/DataProvider';
export interface MovingAverages {
    ma50: number[];
    ma100: number[];
    ma200: number[];
}
export interface TrendAlignment {
    ma50Above100: boolean;
    ma100Above200: boolean;
    priceAbove50: boolean;
    priceAbove100: boolean;
    priceAbove200: boolean;
    alignment: 'strong_bullish' | 'bullish' | 'mixed' | 'bearish' | 'strong_bearish';
}
export interface Crossover {
    type: 'golden_cross' | 'death_cross';
    bar: number;
    timestamp: Date;
    fastMA: number;
    slowMA: number;
}
export interface MASlope {
    period: number;
    slope: number;
    direction: 'up' | 'down' | 'flat';
    strength: 'strong' | 'moderate' | 'weak';
}
export declare class TrendIndicators {
    /**
     * Calculate Simple Moving Average (SMA)
     */
    static calculateSMA(prices: number[], period: number): number[];
    /**
     * Calculate all moving averages
     */
    static calculateMovingAverages(closes: number[], periods?: number[]): MovingAverages;
    /**
     * Get most recent MAs (non-NaN values)
     */
    static getLatestMAs(closes: number[], periods?: number[]): {
        ma50: number;
        ma100: number;
        ma200: number;
        price: number;
    };
    /**
     * Determine trend alignment (bullish/bearish/mixed)
     */
    static getTrendAlignment(closes: number[], periods?: number[]): TrendAlignment;
    /**
     * Detect moving average crossovers
     */
    static detectCrossovers(fastMA: number[], slowMA: number[], bars: OHLCV[]): Crossover[];
    /**
     * Calculate MA slope (direction of trend)
     */
    static calculateMASlope(maValues: number[], lookbackPeriod?: number): MASlope;
    /**
     * Get EMA (Exponential Moving Average)
     */
    static calculateEMA(prices: number[], period: number): number[];
    /**
     * Detect uptrend (price making higher highs and higher lows)
     */
    static isUptrend(bars: OHLCV[], lookbackPeriod?: number): boolean;
    /**
     * Detect downtrend (price making lower highs and lower lows)
     */
    static isDowntrend(bars: OHLCV[], lookbackPeriod?: number): boolean;
}
export default TrendIndicators;
//# sourceMappingURL=TrendIndicators.d.ts.map