import { BaseStrategy } from './BaseStrategy';
import { TradeSignal } from '../types';
/**
 * Strategy 2: Pullback/Mean Reversion
 *
 * Entry conditions:
 * 1. Overall trend is bullish
 * 2. Price pulls back to support (Fib level or S/R)
 * 3. RSI oversold bounce (35-50, rising)
 * 4. Volume declining on pullback
 * 5. MACD showing reversal signs
 */
export declare class PullbackReversionStrategy extends BaseStrategy {
    name: string;
    description: string;
    private minConfidence;
    private rsiMin;
    private rsiMax;
    private atrMultiplier;
    generateSignals(analysisResults: Map<string, any>): TradeSignal[];
    private checkNearFibSupport;
    private checkNearSRSupport;
    private getNearestSupport;
    private getConfidenceRating;
}
//# sourceMappingURL=PullbackReversionStrategy.d.ts.map