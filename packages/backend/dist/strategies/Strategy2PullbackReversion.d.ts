import { TradeSignal } from '../types';
/**
 * Strategy 2: Pullback/Mean Reversion
 *
 * Entry conditions (ALL must be true):
 * 1. Overall trend is bullish (50 MA > 200 MA)
 * 2. Price pulls back to support (38.2% or 50% Fib level)
 * 3. RSI shows oversold bounce (35-45 range, rising)
 * 4. Volume declining on pullback (dry-up)
 * 5. MACD showing early reversal signs
 * 6. Market regime = 'bull' or 'recovering'
 */
export declare class Strategy2PullbackReversion {
    name: string;
    shortName: string;
    generateSignal(symbol: string, analysis: any, currentPrice: number): TradeSignal | null;
    private scoreToRating;
}
declare const _default: Strategy2PullbackReversion;
export default _default;
//# sourceMappingURL=Strategy2PullbackReversion.d.ts.map