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
    const maBullish = analysis.trend?.ma_alignment === 'bullish' &&
      analysis.trend?.ma_50_slope > 0 &&
      analysis.trend?.ma_100_slope > 0;

    if (!maBullish) return null;

    // 2. Check if price is near or breaking resistance
    const resistanceLevels = analysis.support_resistance?.levels?.filter((l: any) => l.type === 'resistance') || [];
    const nearResistance = resistanceLevels.some((level: any) =>
      currentPrice >= level.price * 0.98 &&
      currentPrice <= level.price * 1.02
    );

    if (!nearResistance && resistanceLevels.length > 0) return null;

    // 3. Check volume - RVOL > 1.5x
    const volumeConfirms = analysis.volume?.rvol > 1.5;
    if (!volumeConfirms) return null;

    // 4. Check RSI - between 40-70
    const rsi = analysis.momentum?.rsi || 50;
    const rsiOk = rsi >= 40 && rsi <= 70;
    if (!rsiOk) return null;

    // 5. Check MACD - positive and rising
    const macdPositive = (analysis.momentum?.macd || 0) > (analysis.momentum?.macd_signal || 0);
    const macdHistogram = analysis.momentum?.macd_histogram || 0;
    const macdRising = macdHistogram > 0;

    if (!macdPositive || !macdRising) return null;

    // 6. Check regime - must be bull
    if (analysis.regime?.classification !== 'bull') return null;

    // Calculate REAL stop loss based on ATR
    const atr = analysis.volatility?.atr || currentPrice * 0.02; // Default 2% if no ATR
    const atrMultiplier = 2.5;
    const stopLossPrice = currentPrice - (atr * atrMultiplier);
    
    // Apply 5% max stop loss cap
    const maxStopLoss = currentPrice * 0.95;
    const finalStopLoss = Math.max(stopLossPrice, maxStopLoss);

    // Calculate REAL take profit (2:1 R:R ratio)
    const riskPerShare = currentPrice - finalStopLoss;
    const takeProfit1 = currentPrice + (riskPerShare * 1.5); // 1.5R
    const takeProfit2 = currentPrice + (riskPerShare * 2.0); // 2R

    // Calculate confidence
    const confidence = Math.min(
      100,
      50 +
      (analysis.trend?.ma_alignment === 'bullish' ? 10 : 0) +
      (volumeConfirms ? 10 : 0) +
      (macdRising ? 10 : 0) +
      ((analysis.volume?.obv_trend || 0) > 0 ? 10 : 0) +
      (rsi > 50 && rsi < 65 ? 10 : 0)
    );

    return {
      symbol,
      direction: 'long',
      entryPrice: new Decimal(currentPrice),
      stopLoss: new Decimal(finalStopLoss),
      takeProfit: new Decimal(takeProfit2),
      riskAmount: new Decimal(riskPerShare * 100), // Assume 100 shares for calculation
      riskPercent: ((currentPrice - finalStopLoss) / currentPrice) * 100,
      confidence: Math.round(confidence),
      rating: this.scoreToRating(confidence),
      strategy: this.name,
      timeframe: 'daily',
      timestamp: new Date(),
      reasoning: `Bullish trend breakout: MA alignment ${analysis.trend?.ma_alignment}, RVOL ${(analysis.volume?.rvol || 0).toFixed(2)}x, RSI ${rsi.toFixed(1)}, ATR stop at $${finalStopLoss.toFixed(2)}`
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
