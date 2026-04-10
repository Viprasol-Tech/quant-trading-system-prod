import { TradeSignal } from '../types';
/**
 * Strategy 3: Hybrid Composite
 *
 * Composite scoring with 6 weighted factors:
 * - Trend alignment (25%): All timeframes agree
 * - Momentum score (20%): RSI + MACD combined
 * - Volume confirmation (15%): RVOL + OBV direction
 * - Pattern detected (15%): Any bullish pattern
 * - Regime favorability (15%): Bull or recovering
 * - Volatility state (10%): Not extreme high vol
 *
 * Entry when: Composite score > 65 AND regime != 'bear'
 */
export declare class Strategy3Hybrid {
    name: string;
    shortName: string;
    generateSignal(symbol: string, analysis: any, currentPrice: number): TradeSignal | null;
    private calculateTrendScore;
    private calculateMomentumScore;
    private calculateVolumeScore;
    private calculatePatternScore;
    private calculateRegimeScore;
    private calculateVolatilityScore;
    private scoreToRating;
}
declare const _default: Strategy3Hybrid;
export default _default;
//# sourceMappingURL=Strategy3Hybrid.d.ts.map