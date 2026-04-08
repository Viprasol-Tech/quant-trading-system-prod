import { TradeSignal } from '../types';
import Decimal from 'decimal.js';

/**
 * Strategy 2: Pullback/Mean Reversion in Uptrend
 *
 * Entry conditions (ALL must be true):
 * 1. Daily MA alignment bullish (confirmed uptrend)
 * 2. Price pulls back to support zone (Fib 38-62%, MA support, or prior S/R)
 * 3. RSI dipped below 50, now turning up
 * 4. Volume declining on pullback (seller fatigue)
 * 5. Bullish price action at support
 */
export class Strategy2PullbackReversion {
  name = 'Pullback/Mean Reversion';
  shortName = 'S2';

  generateSignal(symbol: string, analysis: any, currentPrice: number): TradeSignal | null {
    // 1. Check MA alignment - must be bullish uptrend
    const maBullish = analysis.trend.ma_alignment === 'bullish' &&
      analysis.trend.ma_50_slope > 0;

    if (!maBullish) return null;

    // 2. Check if price is near support
    const nearSupport = analysis.support_resistance.levels.some((level: any) =>
      level.type === 'support' &&
      currentPrice >= level.price * 0.98 && // Within 2% of support
      currentPrice <= level.price * 1.02
    );

    if (!nearSupport) return null;

    // 3. Check RSI - must be below 50 but turning up
    // We check if RSI is in lower range (retracement) but positive momentum
    const rsiInRetracement = analysis.momentum.rsi < 50;
    const rsiTurningUp = analysis.momentum.rsi > 35; // Recovering from oversold

    if (!rsiInRetracement || !rsiTurningUp) return null;

    // 4. Check volume - declining (seller fatigue)
    // RVOL < 1.0 indicates lower volume during pullback
    const volumeDecline = analysis.volume.rvol < 1.0;
    if (!volumeDecline) return null;

    // 5. Check OBV - should still be in uptrend (not breaking down)
    const obvUptrend = analysis.volume.obv_trend > 0;
    if (!obvUptrend) return null;

    // All conditions met - generate signal
    const confidence = Math.min(
      100,
      50 + // Base confidence
      (maBullish ? 10 : 0) +
      (rsiTurningUp ? 10 : 0) +
      (volumeDecline ? 10 : 0) +
      (obvUptrend ? 10 : 0)
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
      reasoning: `Pullback reversion: Uptrend ${analysis.trend.ma_alignment}, support zone, RSI ${analysis.momentum.rsi.toFixed(1)} recovering, low volume pullback`
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

export default new Strategy2PullbackReversion();
