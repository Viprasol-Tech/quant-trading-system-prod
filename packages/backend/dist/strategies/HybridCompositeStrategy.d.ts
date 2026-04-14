import { BaseStrategy } from './BaseStrategy';
import { TradeSignal } from '../types';
/**
 * Strategy 3: Hybrid Composite
 *
 * Composite scoring with 6 weighted factors:
 * - Trend alignment (25%)
 * - Momentum score (20%)
 * - Volume confirmation (15%)
 * - Pattern detected (15%)
 * - Regime favorability (15%)
 * - Volatility state (10%)
 *
 * Entry when: Composite score > 65 AND regime != 'bear'
 */
export declare class HybridCompositeStrategy extends BaseStrategy {
    name: string;
    description: string;
    private minCompositeScore;
    private atrMultiplier;
    constructor(params?: Record<string, any>);
    generateSignals(analysisResults: Map<string, any>): TradeSignal[];
    private calculateTrendScore;
    private calculateMomentumScore;
    private calculateVolumeScore;
    private calculatePatternScore;
    private calculateRegimeScore;
    private calculateVolatilityScore;
    private getConfidenceRating;
}
//# sourceMappingURL=HybridCompositeStrategy.d.ts.map