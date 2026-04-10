import { OHLCV } from '../../data/DataProvider';
export interface FibonacciLevels {
    level0: number;
    level236: number;
    level382: number;
    level500: number;
    level618: number;
    level786: number;
    level1000: number;
}
export interface SwingPoint {
    index: number;
    timestamp: Date;
    price: number;
    type: 'high' | 'low';
    atrFiltered: boolean;
}
export interface ConfluenceZone {
    price: number;
    strength: number;
    levels: string[];
}
export declare class FibonacciIndicators {
    /**
     * Detect swing points (highs and lows) using ATR filtering
     */
    static detectSwingPoints(bars: OHLCV[], atrValues: number[], minSwingPercent?: number, atrFilterMultiplier?: number): SwingPoint[];
    /**
     * Calculate Fibonacci levels from a swing (high to low or low to high)
     */
    static calculateFibonacciLevels(swingHigh: number, swingLow: number): FibonacciLevels;
    /**
     * Find confluence zones where multiple Fibonacci levels cluster
     */
    static findConfluenceZones(fibLevelsList: FibonacciLevels[], clusteringDistance?: number): ConfluenceZone[];
    /**
     * Determine nearest Fibonacci level for current price
     */
    static getNearestFibLevel(price: number, fibLevels: FibonacciLevels): {
        level: string;
        distance: number;
    };
    /**
     * Check if price is within range of a Fibonacci level
     */
    static isPriceNearFibLevel(price: number, fibLevel: number, tolerance?: number): boolean;
    /**
     * Get support/resistance from Fibonacci levels
     */
    static getFibSupport(bars: OHLCV[], atrValues: number[], lookbackPeriods?: number): {
        support: number[];
        resistance: number[];
    };
}
export default FibonacciIndicators;
//# sourceMappingURL=FibonacciIndicators.d.ts.map