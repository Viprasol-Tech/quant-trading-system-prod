import { TradeSignal } from '../types';
import Decimal from 'decimal.js';

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
export class Strategy3Hybrid {
  name = 'Hybrid Composite';
  shortName = 'S3';

  generateSignal(symbol: string, analysis: any, currentPrice: number): TradeSignal | null {
    // Calculate weighted scores for each factor
    const trendScore = this.calculateTrendScore(analysis);
    const momentumScore = this.calculateMomentumScore(analysis);
    const volumeScore = this.calculateVolumeScore(analysis);
    const patternScore = this.calculatePatternScore(analysis);
    const regimeScore = this.calculateRegimeScore(analysis);
    const volatilityScore = this.calculateVolatilityScore(analysis);

    // Weighted composite score
    const compositeScore =
      trendScore * 0.25 +
      momentumScore * 0.20 +
      volumeScore * 0.15 +
      patternScore * 0.15 +
      regimeScore * 0.15 +
      volatilityScore * 0.10;

    // Check if regime is bear (disqualifying)
    if (analysis.regime.classification === 'bear') {
      return null;
    }

    // Entry threshold
    if (compositeScore < 65) {
      return null;
    }

    // All conditions met
    return {
      symbol,
      direction: 'long',
      entryPrice: new Decimal(currentPrice),
      stopLoss: new Decimal(0), // Placeholder
      takeProfit: new Decimal(0), // Placeholder
      riskAmount: new Decimal(0), // Placeholder
      riskPercent: 1,
      confidence: Math.round(compositeScore),
      rating: this.scoreToRating(compositeScore),
      strategy: this.name,
      timeframe: 'daily',
      timestamp: new Date(),
      reasoning: `Hybrid composite: Trend ${trendScore.toFixed(0)}, Momentum ${momentumScore.toFixed(0)}, Volume ${volumeScore.toFixed(0)}, Pattern ${patternScore.toFixed(0)}, Regime ${regimeScore.toFixed(0)}, Vol ${volatilityScore.toFixed(0)}`
    };
  }

  private calculateTrendScore(analysis: any): number {
    let score = 0;

    if (analysis.trend.ma_alignment === 'bullish') score += 40;
    else if (analysis.trend.ma_alignment === 'mixed') score += 20;

    if (analysis.trend.ma_50_slope > 0) score += 20;
    if (analysis.trend.ma_100_slope > 0) score += 20;

    return Math.min(100, score);
  }

  private calculateMomentumScore(analysis: any): number {
    let score = 0;

    // RSI component (0-50)
    if (analysis.momentum.rsi >= 40 && analysis.momentum.rsi <= 70) score += 40;
    else if (analysis.momentum.rsi >= 30 && analysis.momentum.rsi < 40) score += 20;

    // MACD component (0-50)
    if (analysis.momentum.macd > analysis.momentum.macd_signal) score += 30;
    if (analysis.momentum.macd_histogram > 0) score += 20;

    return Math.min(100, score);
  }

  private calculateVolumeScore(analysis: any): number {
    let score = 0;

    // RVOL component (0-50)
    if (analysis.volume.rvol > 1.5) score += 50;
    else if (analysis.volume.rvol > 1.0) score += 30;
    else if (analysis.volume.rvol > 0.8) score += 15;

    // OBV component (0-50)
    if (analysis.volume.obv_trend > 0) score += 50;

    return Math.min(100, (score / 2)); // Scale to 0-100
  }

  private calculatePatternScore(analysis: any): number {
    // If patterns detected, award points
    // In this simplified version, use support/resistance proximity
    let score = 50; // Base

    const nearSupport = analysis.support_resistance.levels.some((level: any) =>
      level.type === 'support' &&
      Math.abs(level.price - analysis.price) / analysis.price < 0.02
    );

    if (nearSupport) score += 25;

    return Math.min(100, score);
  }

  private calculateRegimeScore(analysis: any): number {
    if (analysis.regime.classification === 'bull') return 80;
    if (analysis.regime.classification === 'range') return 40;
    if (analysis.regime.classification === 'bear') return 0;
    return 50;
  }

  private calculateVolatilityScore(analysis: any): number {
    // Avoid extreme high volatility
    const atrPercent = (analysis.volatility.atr / analysis.price) * 100;

    if (atrPercent < 2) return 100; // Low vol - optimal
    if (atrPercent < 3) return 80;
    if (atrPercent < 5) return 60;
    if (atrPercent < 8) return 30;
    return 10; // Extreme vol - avoid
  }

  private scoreToRating(score: number): string {
    if (score >= 80) return 'Strong Buy';
    if (score >= 60) return 'Buy';
    if (score >= 40) return 'Neutral';
    if (score >= 20) return 'Sell';
    return 'Strong Sell';
  }
}

export default new Strategy3Hybrid();
