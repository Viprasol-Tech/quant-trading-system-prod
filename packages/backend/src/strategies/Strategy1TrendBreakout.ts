import { TradeSignal } from '../types';
import Decimal from 'decimal.js';

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
export class Strategy1TrendBreakout {
  name = 'Trend Breakout Momentum';
  shortName = 'S1';

  generateSignal(symbol: string, analysis: any, currentPrice: number): TradeSignal | null {
    // 1. Check MA alignment - all must be bullish
    const maBullish = analysis.trend.ma_alignment === 'bullish' &&
      analysis.trend.ma_50_slope > 0 &&
      analysis.trend.ma_100_slope > 0;

    if (!maBullish) return null;

    // 2. Check if price is near or breaking resistance
    const nearResistance = analysis.support_resistance.levels.some((level: any) =>
      level.type === 'resistance' &&
      currentPrice >= level.price * 0.98 && // Within 2% of resistance
      currentPrice <= level.price * 1.02
    );

    if (!nearResistance) return null;

    // 3. Check volume - RVOL > 1.5x
    const volumeConfirms = analysis.volume.rvol > 1.5;
    if (!volumeConfirms) return null;

    // 4. Check RSI - between 40-70
    const rsiOk = analysis.momentum.rsi >= 40 && analysis.momentum.rsi <= 70;
    if (!rsiOk) return null;

    // 5. Check MACD - positive and rising
    const macdPositive = analysis.momentum.macd > analysis.momentum.macd_signal;
    const macdHistogram = analysis.momentum.macd_histogram;
    const macdRising = macdHistogram > 0; // Histogram positive means rising

    if (!macdPositive || !macdRising) return null;

    // 6. Check regime - must be bull
    if (analysis.regime.classification !== 'bull') return null;

    // All conditions met - generate signal
    const confidence = Math.min(
      100,
      50 + // Base confidence
      (analysis.trend.ma_alignment === 'bullish' ? 10 : 0) +
      (volumeConfirms ? 10 : 0) +
      (macdRising ? 10 : 0) +
      (analysis.volume.obv_trend > 0 ? 10 : 0)
    );

    return {
      symbol,
      direction: 'long',
      entryPrice: new Decimal(currentPrice),
      stopLoss: new Decimal(0), // Placeholder
      takeProfit: new Decimal(0), // Placeholder
      riskAmount: new Decimal(0), // Placeholder
      riskPercent: 1,
      confidence: Math.round(confidence),
      rating: this.scoreToRating(confidence),
      strategy: this.name,
      timeframe: 'daily',
      timestamp: new Date(),
      reasoning: `Bullish trend breakout: MA alignment ${analysis.trend.ma_alignment}, RVOL ${analysis.volume.rvol.toFixed(2)}x, RSI ${analysis.momentum.rsi.toFixed(1)}, MACD rising`
    };
  }

  private scoreToRating(score: number): string {
    if (score >= 80) return 'Strong Buy';
    if (score >= 60) return 'Buy';
    if (score >= 40) return 'Neutral';
    if (score >= 20) return 'Sell';
    return 'Strong Sell';
  }
}

export default new Strategy1TrendBreakout();
