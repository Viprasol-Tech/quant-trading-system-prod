import { BaseStrategy } from './BaseStrategy';
import { TradeSignal } from '../types';
/**
 * Strategy 1: Trend/Breakout Momentum
 *
 * Entry conditions (ALL must be true):
 * 1. Daily MA alignment bullish (50 > 100 > 200)
 * 2. Price breaks above S/R resistance level
 * 3. RVOL > 1.5x average
 * 4. RSI between 40-70 (not overbought)
 * 5. MACD histogram positive AND rising
 * 6. Market regime = 'bull'
 */
export declare class TrendBreakoutStrategy extends BaseStrategy {
    name: string;
    description: string;
    private minConfidence;
    private rsiMin;
    private rsiMax;
    private rvolThreshold;
    private atrMultiplier;
    constructor(params?: Record<string, any>);
    generateSignals(analysisResults: Map<string, any>): TradeSignal[];
    private checkMAAlignment;
    private checkBreakoutSignal;
    private getConfidenceRating;
}
//# sourceMappingURL=TrendBreakoutStrategy.d.ts.map