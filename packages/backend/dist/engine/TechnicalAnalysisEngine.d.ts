import { OHLCV } from '../data/DataProvider';
import { TrendAlignment } from './indicators/TrendIndicators';
import { RSIState, MACDState } from './indicators/MomentumIndicators';
import { VolatilityState } from './indicators/VolatilityIndicators';
import { VolumeState } from './indicators/VolumeIndicators';
import { FibonacciLevels } from './indicators/FibonacciIndicators';
import { SRLevel } from './patterns/SupportResistance';
import { RegimeState } from './regime/RegimeDetection';
export interface AnalysisResult {
    symbol: string;
    timestamp: Date;
    price: number;
    trendAlignment: TrendAlignment;
    rsiState: RSIState;
    macdState: MACDState;
    volatilityState: VolatilityState;
    volumeState: VolumeState;
    regimeState: RegimeState;
    srLevels: SRLevel[];
    fibonacciLevels?: FibonacciLevels;
    confidenceScore: number;
    rating: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
    narrative: string;
}
export declare class TechnicalAnalysisEngine {
    /**
     * Comprehensive technical analysis on a single timeframe
     */
    static analyze(bars: OHLCV[], symbol: string): AnalysisResult;
    /**
     * Calculate confidence score (0-100)
     */
    private static calculateConfidenceScore;
    /**
     * Convert score to rating
     */
    private static getRating;
    /**
     * Generate plain-English narrative
     */
    private static generateNarrative;
}
export default TechnicalAnalysisEngine;
//# sourceMappingURL=TechnicalAnalysisEngine.d.ts.map