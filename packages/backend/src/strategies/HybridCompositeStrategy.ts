import Decimal from 'decimal.js';
import { BaseStrategy } from './BaseStrategy';
import { TradeSignal } from '../types';
import { logger } from '../config/logger';

/**
 * Strategy 3: Hybrid Composite (TA + Stats + Regime)
 *
 * Composite scoring system:
 * - Trend alignment (25%)
 * - Momentum score (20%)
 * - Volume confirmation (15%)
 * - Pattern detected (15%)
 * - Regime favorability (15%)
 * - Volatility state (10%)
 *
 * Entry when: Composite score > 65 AND regime != 'bear'
 *
 * Adaptive behavior:
 * - In trending regime: behaves like Strategy 1 (breakout-oriented)
 * - In pullback regime: behaves like Strategy 2 (support-buying)
 */
export class HybridCompositeStrategy extends BaseStrategy {
  name = 'Hybrid Composite';
  description = 'Adaptive strategy using multi-factor scoring with regime detection';

  // Configurable weights (must sum to 100)
  private trendWeight = parseFloat(process.env.STRATEGY_3_TREND_WEIGHT || '0.25');
  private momentumWeight = parseFloat(process.env.STRATEGY_3_MOMENTUM_WEIGHT || '0.20');
  private volumeWeight = parseFloat(process.env.STRATEGY_3_VOLUME_WEIGHT || '0.15');
  private patternWeight = parseFloat(process.env.STRATEGY_3_PATTERN_WEIGHT || '0.15');
  private regimeWeight = parseFloat(process.env.STRATEGY_3_REGIME_WEIGHT || '0.15');
  private volatilityWeight = parseFloat(process.env.STRATEGY_3_VOLATILITY_WEIGHT || '0.10');

  private scoreThreshold = parseFloat(process.env.STRATEGY_3_THRESHOLD || '65');
  private minConfidence = parseInt(process.env.STRATEGY_3_MIN_CONFIDENCE || '60');

  generateSignals(analysisResults: Map<string, any>): TradeSignal[] {
    const signals: TradeSignal[] = [];

    try {
      for (const [symbol, analysis] of analysisResults) {
        if (!analysis) continue;

        // Extract all analysis components
        const trendState = analysis.trend || {};
        const momentumState = analysis.momentum || {};
        const volumeState = analysis.volume || {};
        const patternState = analysis.patterns || {};
        const regimeState = analysis.regime || {};
        const volatilityState = analysis.volatility || {};

        // Calculate component scores (0-100)
        const trendScore = this.calculateTrendScore(trendState);
        const momentumScore = this.calculateMomentumScore(momentumState);
        const volumeScore = this.calculateVolumeScore(volumeState);
        const patternScore = this.calculatePatternScore(patternState);
        const regimeScore = this.calculateRegimeScore(regimeState);
        const volatilityScore = this.calculateVolatilityScore(volatilityState);

        // Weighted composite score
        const compositeScore =
          trendScore * this.trendWeight +
          momentumScore * this.momentumWeight +
          volumeScore * this.volumeWeight +
          patternScore * this.patternWeight +
          regimeScore * this.regimeWeight +
          volatilityScore * this.volatilityWeight;

        // Check regime for filter
        const regimeIsBullish = regimeState.regime !== 'bear';

        if (compositeScore >= this.scoreThreshold && regimeIsBullish) {
          // Adaptive confidence based on regime
          let confidence = Math.min(compositeScore, 95);

          if (regimeState.regime === 'trend') {
            confidence += 5; // Extra confidence in trending regime
          } else if (regimeState.regime === 'range') {
            confidence -= 5; // Less confidence in range
          }

          confidence = Math.max(confidence, this.minConfidence);

          const signal: TradeSignal = {
            symbol,
            direction: 'long',
            entryPrice: new Decimal(analysis.current_price || 0),
            stopLoss: this.calculateAdaptiveStop(analysis, regimeState),
            takeProfit: new Decimal(analysis.resistance_level || 0),
            riskAmount: new Decimal(0),
            riskPercent: 1,
            confidence: Math.floor(confidence),
            rating: this.getConfidenceRating(Math.floor(confidence)),
            strategy: this.name,
            timeframe: '1D',
            timestamp: new Date(),
            reasoning: `${this.name}: Composite score ${Math.floor(compositeScore)}/100 (Trend:${Math.floor(trendScore)} Momentum:${Math.floor(momentumScore)} Volume:${Math.floor(volumeScore)} Pattern:${Math.floor(patternScore)} Regime:${Math.floor(regimeScore)} Vol:${Math.floor(volatilityScore)})`
          };

          signals.push(signal);
        }
      }

      return signals;
    } catch (error) {
      logger.error(`Error in ${this.name} signal generation:`, error);
      return signals;
    }
  }

  private calculateTrendScore(trendState: any): number {
    if (!trendState.ma_50 || !trendState.ma_100 || !trendState.ma_200) return 0;

    let score = 0;

    // MA alignment (0-50 points)
    if (trendState.ma_50 > trendState.ma_100 && trendState.ma_100 > trendState.ma_200) {
      score = 50;
    } else if (trendState.ma_50 > trendState.ma_100 || trendState.ma_100 > trendState.ma_200) {
      score = 25;
    }

    // MA slope (0-50 points)
    if (trendState.slope_50 > 0 && trendState.slope_100 > 0 && trendState.slope_200 > 0) {
      score += 50;
    } else if (trendState.slope_50 > 0 && trendState.slope_100 > 0) {
      score += 25;
    }

    return Math.min(score, 100);
  }

  private calculateMomentumScore(momentumState: any): number {
    let score = 0;

    // RSI score (0-50)
    const rsi = momentumState.rsi || 50;
    if (rsi > 40 && rsi < 70) {
      score += 50 - Math.abs(rsi - 55) / 3; // Peak at 55
    } else if (rsi > 30 && rsi <= 40) {
      score += 25;
    }

    // MACD score (0-50)
    if (momentumState.macd_histogram > 0 && momentumState.macd > momentumState.macd_signal) {
      score += 50;
    } else if (momentumState.macd_histogram > 0) {
      score += 25;
    }

    // Divergence detection (bonus)
    if (momentumState.bullish_divergence) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateVolumeScore(volumeState: any): number {
    let score = 50; // Base score

    // RVOL score
    const rvol = volumeState.rvol || 1.0;
    if (rvol > 1.5) {
      score += 30;
    } else if (rvol > 1.2) {
      score += 15;
    }

    // OBV trend
    if (volumeState.obv_trend === 'up') {
      score += 20;
    }

    return Math.min(score, 100);
  }

  private calculatePatternScore(patternState: any): number {
    let score = 30; // Base score (neutral)

    if (!patternState.patterns || patternState.patterns.length === 0) {
      return score;
    }

    // Bullish patterns
    const bullishPatterns = patternState.patterns.filter(
      (p: any) => p.direction === 'bullish'
    );

    if (bullishPatterns.length > 0) {
      score = 70;
      score += bullishPatterns.length * 10; // +10 per pattern
    }

    // Bearish patterns reduce score
    const bearishPatterns = patternState.patterns.filter(
      (p: any) => p.direction === 'bearish'
    );
    if (bearishPatterns.length > 0) {
      score -= bearishPatterns.length * 10;
    }

    return Math.max(0, Math.min(score, 100));
  }

  private calculateRegimeScore(regimeState: any): number {
    const regime = regimeState.regime || 'range';

    if (regime === 'bull') return 100;
    if (regime === 'trend') return 80;
    if (regime === 'range') return 40;
    if (regime === 'bear') return 0;

    return 50;
  }

  private calculateVolatilityScore(volatilityState: any): number {
    let score = 50;

    const isSqueezing = volatilityState.is_squeeze || false;
    const bandwidth = volatilityState.bb_bandwidth || 0.5;

    // Prefer moderate volatility
    if (bandwidth > 0.3 && bandwidth < 0.7) {
      score = 75;
    } else if (bandwidth < 0.3) {
      score = 60; // Squeeze - expanding soon?
    } else if (bandwidth > 0.8) {
      score = 40; // Very high vol - more risky
    }

    return score;
  }

  private calculateAdaptiveStop(analysis: any, regimeState: any): Decimal {
    // In trending regime, use wider stops; in range, tighter
    const regime = regimeState.regime || 'range';
    const support = new Decimal(analysis.support_level || analysis.swing_low || 0);

    if (regime === 'trend') {
      // Use ATR-based stop, wider
      return support.minus(new Decimal(analysis.atr || 2).times(new Decimal(2.5)));
    } else if (regime === 'range') {
      // Use tighter stops
      return support.minus(new Decimal(analysis.atr || 2).times(new Decimal(1.5)));
    }

    return support;
  }

  private getConfidenceRating(confidence: number): string {
    if (confidence >= 85) return 'Strong Buy';
    if (confidence >= 70) return 'Buy';
    if (confidence >= 55) return 'Neutral';
    if (confidence >= 40) return 'Sell';
    return 'Strong Sell';
  }
}
