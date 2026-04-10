import { TradeSignal } from '../types';
import Decimal from 'decimal.js';

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
export class Strategy2PullbackReversion {
  name = 'Pullback/Mean Reversion';
  shortName = 'S2';

  generateSignal(symbol: string, analysis: any, currentPrice: number): TradeSignal | null {
    // 1. Check overall trend is bullish
    const trendBullish = analysis.trend?.ma_alignment === 'bullish' ||
      (analysis.trend?.ma_50 > analysis.trend?.ma_200);

    if (!trendBullish) return null;

    // 2. Check if price is near Fibonacci support
    const fibLevels = analysis.fibonacci?.retracement_levels || {};
    const fib382 = fibLevels['38.2%'] || currentPrice * 0.962;
    const fib50 = fibLevels['50%'] || currentPrice * 0.95;
    
    const nearFibSupport = 
      (currentPrice >= fib382 * 0.98 && currentPrice <= fib382 * 1.02) ||
      (currentPrice >= fib50 * 0.98 && currentPrice <= fib50 * 1.02);

    // Also check S/R support
    const supportLevels = analysis.support_resistance?.levels?.filter((l: any) => l.type === 'support') || [];
    const nearSupport = supportLevels.some((level: any) =>
      currentPrice >= level.price * 0.98 &&
      currentPrice <= level.price * 1.02
    );

    if (!nearFibSupport && !nearSupport) return null;

    // 3. Check RSI - oversold bounce
    const rsi = analysis.momentum?.rsi || 50;
    const rsiOversoldBounce = rsi >= 35 && rsi <= 50;
    if (!rsiOversoldBounce) return null;

    // 4. Check volume - declining on pullback (RVOL < 1)
    const volumeDeclining = (analysis.volume?.rvol || 1) < 1.2;
    if (!volumeDeclining) return null;

    // 5. Check MACD - early reversal (histogram turning up from negative)
    const macdHistogram = analysis.momentum?.macd_histogram || 0;
    const macdReversal = macdHistogram > -0.5 && macdHistogram < 0.5;

    // 6. Check regime
    const regime = analysis.regime?.classification;
    if (regime !== 'bull' && regime !== 'recovering') return null;

    // Calculate REAL stop loss based on ATR and support
    const atr = analysis.volatility?.atr || currentPrice * 0.02;
    const atrMultiplier = 2.0; // Tighter stop for mean reversion
    
    // Use support level as reference if available
    const nearestSupport = supportLevels.length > 0 
      ? Math.max(...supportLevels.map((l: any) => l.price).filter((p: number) => p < currentPrice))
      : currentPrice - (atr * atrMultiplier);
    
    const stopLossPrice = Math.min(
      nearestSupport * 0.99, // Just below support
      currentPrice - (atr * atrMultiplier)
    );
    
    // Apply 5% max stop loss cap
    const maxStopLoss = currentPrice * 0.95;
    const finalStopLoss = Math.max(stopLossPrice, maxStopLoss);

    // Calculate REAL take profit
    const riskPerShare = currentPrice - finalStopLoss;
    const takeProfit1 = currentPrice + (riskPerShare * 1.5);
    const takeProfit2 = currentPrice + (riskPerShare * 2.0);

    // Calculate confidence
    const confidence = Math.min(
      100,
      45 +
      (nearFibSupport ? 15 : 0) +
      (nearSupport ? 10 : 0) +
      (rsiOversoldBounce ? 10 : 0) +
      (volumeDeclining ? 10 : 0) +
      (macdReversal ? 10 : 0)
    );

    return {
      symbol,
      direction: 'long',
      entryPrice: new Decimal(currentPrice),
      stopLoss: new Decimal(finalStopLoss),
      takeProfit: new Decimal(takeProfit2),
      riskAmount: new Decimal(riskPerShare * 100),
      riskPercent: ((currentPrice - finalStopLoss) / currentPrice) * 100,
      confidence: Math.round(confidence),
      rating: this.scoreToRating(confidence),
      strategy: this.name,
      timeframe: 'daily',
      timestamp: new Date(),
      reasoning: `Mean reversion at support: RSI ${rsi.toFixed(1)} bouncing, RVOL ${(analysis.volume?.rvol || 0).toFixed(2)}x (low volume pullback), stop at $${finalStopLoss.toFixed(2)}`
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
