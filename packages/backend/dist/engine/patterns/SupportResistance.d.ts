import { OHLCV } from '../../data/DataProvider';
export interface SRLevel {
    price: number;
    type: 'support' | 'resistance';
    strength: number;
    touches: number;
    proximity: number[];
}
export interface PivotPoints {
    pivot: number;
    r1: number;
    r2: number;
    s1: number;
    s2: number;
}
export interface PivotPoint {
    index: number;
    timestamp: Date;
    price: number;
    type: 'high' | 'low';
}
export declare class SupportResistanceAnalysis {
    /**
     * Detect pivot points (local highs and lows)
     */
    static detectPivots(bars: OHLCV[], leftBars?: number, rightBars?: number): PivotPoint[];
    /**
     * Detect support and resistance levels
     */
    static detectSRLevels(pivots: PivotPoint[], nLevels?: number, tolerance?: number): SRLevel[];
    /**
     * Calculate classic pivot points
     */
    static calculatePivotPoints(bar: OHLCV): PivotPoints;
    /**
     * Check if price is near a support/resistance level
     */
    static isPriceNearLevel(price: number, level: number, tolerance?: number): boolean;
    /**
     * Find nearest support below price
     */
    static findNearestSupport(price: number, srLevels: SRLevel[], maxDistance?: number): SRLevel | null;
    /**
     * Find nearest resistance above price
     */
    static findNearestResistance(price: number, srLevels: SRLevel[], maxDistance?: number): SRLevel | null;
    /**
     * Analyze price position relative to SR levels
     */
    static analyzePricePosition(price: number, srLevels: SRLevel[]): {
        support: SRLevel | null;
        resistance: SRLevel | null;
        position: 'above_resistance' | 'between' | 'below_support';
    };
}
export default SupportResistanceAnalysis;
//# sourceMappingURL=SupportResistance.d.ts.map