import { OHLCV } from '../../data/DataProvider';
export interface VolumeState {
    relativeVolume: number;
    obvTrend: 'accumulation' | 'distribution' | 'neutral';
    buyerPressure: number;
    sellerPressure: number;
    volumeConfirmation: string;
}
export declare class VolumeIndicators {
    /**
     * Calculate Relative Volume (RVOL)
     * Current volume / Average volume of previous periods
     */
    static calculateRelativeVolume(volumes: number[], period?: number): number[];
    /**
     * Calculate OBV (On-Balance Volume)
     * Cumulative volume indicator that adds/subtracts volume based on price direction
     */
    static calculateOBV(bars: OHLCV[]): number[];
    /**
     * Determine OBV trend direction
     */
    static getOBVTrend(obv: number[], lookback?: number): 'accumulation' | 'distribution' | 'neutral';
    /**
     * Calculate Buyer vs Seller Pressure
     * Based on close position within the bar and volume
     */
    static calculatePressure(bars: OHLCV[]): {
        buyerPressure: number;
        sellerPressure: number;
    }[];
    /**
     * Get current volume confirmation signal
     */
    static getVolumeConfirmation(bars: OHLCV[], priceDirection: 'up' | 'down' | 'neutral'): string;
    /**
     * Calculate Average Volume
     */
    static calculateAverageVolume(bars: OHLCV[], period?: number): number;
    /**
     * Detect Volume Divergence
     * Price making higher high but volume declining
     */
    static detectVolumeDivergence(bars: OHLCV[], lookback?: number): 'bullish' | 'bearish' | null;
    /**
     * Calculate moving average (helper)
     */
    private static calculateMovingAverage;
    /**
     * Get volume state
     */
    static getVolumeState(bars: OHLCV[], priceDirection: 'up' | 'down' | 'neutral'): VolumeState;
}
export default VolumeIndicators;
//# sourceMappingURL=VolumeIndicators.d.ts.map