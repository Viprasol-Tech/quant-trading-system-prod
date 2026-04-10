import { TradeSignal } from '../types';
/**
 * Strategy 1: Trend Breakout Momentum
 *
 * Entry conditions (ALL must be true):
 * 1. Daily MA alignment bullish (50 > 100 > 200)
 * 2. Price breaks above S/R resistance
 * 3. RVOL > 1.5x average
 * 4. RSI between 40-70 (not overbought)
 * 5. MACD histogram positive AND rising
 * 6. Market regime = 'bull'
 */
export declare class Strategy1TrendBreakout {
    name: string;
    shortName: string;
    generateSignal(symbol: string, analysis: any, currentPrice: number): TradeSignal | null;
    private scoreToRating;
}
declare const _default: Strategy1TrendBreakout;
export default _default;
//# sourceMappingURL=Strategy1TrendBreakout.d.ts.map