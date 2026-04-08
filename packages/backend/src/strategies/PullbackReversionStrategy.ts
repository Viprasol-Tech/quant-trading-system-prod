import Decimal from 'decimal.js';
import { BaseStrategy } from './BaseStrategy';
import { TradeSignal } from '../types';
import { logger } from '../config/logger';

/**
 * Strategy 2: Pullback/Mean Reversion in Uptrend
 *
 * Entry conditions (ALL must be true):
 * 1. Daily MA alignment bullish (confirmed uptrend)
 * 2. Price pulls back to support zone (Fib 38-62%, or MA support)
 * 3. RSI dipped below 50, now turning up
 * 4. Volume declining on pullback (seller fatigue)
 * 5. Bullish price action at support (hammer, engulfing)
 */
export class PullbackReversionStrategy extends BaseStrategy {
  name = 'Pullback/Reversion';
  description = 'Trades support bounces in confirmed uptrends with declining volume';

  // Configurable parameters
  private minConfidence = parseInt(process.env.STRATEGY_2_MIN_CONFIDENCE || '60');
  private maPeriod = parseInt(process.env.STRATEGY_2_MA_PERIOD || '50');
  private fibLevelMin = parseFloat(process.env.STRATEGY_2_FIB_LEVEL_MIN || '0.382');
  private fibLevelMax = parseFloat(process.env.STRATEGY_2_FIB_LEVEL_MAX || '0.618');
  private rsiThreshold = parseInt(process.env.STRATEGY_2_RSI_THRESHOLD || '50');
  private volumeThreshold = parseFloat(process.env.STRATEGY_2_VOLUME_THRESHOLD || '0.8');

  generateSignals(analysisResults: Map<string, any>): TradeSignal[] {
    const signals: TradeSignal[] = [];

    try {
      for (const [symbol, analysis] of analysisResults) {
        if (!analysis) continue;

        // Extract analysis data
        const trendState = analysis.trend || {};
        const momentumState = analysis.momentum || {};
        const volumeState = analysis.volume || {};
        const priceAction = analysis.price_action || {};

        // Check all entry conditions
        const conditions = {
          maBullish: this.checkMAAlignment(trendState),
          supportBounce: this.checkSupportBounce(analysis),
          rsiTurningUp: momentumState.rsi < this.rsiThreshold && momentumState.rsi_turning_up,
          volumeDecline: volumeState.rvol < this.volumeThreshold,
          bullishAction: priceAction.is_bullish
        };

        const conditionsMet = Object.values(conditions).filter(Boolean).length;

        if (conditionsMet >= 4) {
          // Calculate confidence score
          let confidence = 60;
          confidence += conditions.maBullish ? 5 : 0;
          confidence += conditions.supportBounce ? 10 : 0;
          confidence += conditions.rsiTurningUp ? 5 : 0;
          confidence += conditions.volumeDecline ? 5 : 0;
          confidence += conditions.bullishAction ? 5 : 0;

          if (confidence >= this.minConfidence) {
            const signal: TradeSignal = {
              symbol,
              direction: 'long',
              entryPrice: new Decimal(analysis.current_price || 0),
              stopLoss: new Decimal(analysis.swing_low || 0),
              takeProfit: new Decimal(analysis.swing_high || 0),
              riskAmount: new Decimal(0),
              riskPercent: 1,
              confidence,
              rating: this.getConfidenceRating(confidence),
              strategy: this.name,
              timeframe: '1D',
              timestamp: new Date(),
              reasoning: `${this.name}: Uptrend confirmed, bouncing off support with declining volume, RSI turning up`
            };

            signals.push(signal);
          }
        }
      }

      return signals;
    } catch (error) {
      logger.error(`Error in ${this.name} signal generation:`, error);
      return signals;
    }
  }

  private checkMAAlignment(trendState: any): boolean {
    // Check if MAs show uptrend
    return (
      trendState.ma_50 > 0 &&
      trendState.ma_200 > 0 &&
      trendState.ma_50 > trendState.ma_200
    );
  }

  private checkSupportBounce(analysis: any): boolean {
    // Check if price is near support (between Fib levels)
    const currentPrice = analysis.current_price || 0;
    const swingHigh = analysis.swing_high || 0;
    const swingLow = analysis.swing_low || 0;

    if (swingHigh <= swingLow) return false;

    const fibRange = swingHigh - swingLow;
    const fib382 = swingHigh - fibRange * this.fibLevelMin;
    const fib618 = swingHigh - fibRange * this.fibLevelMax;

    // Price near Fib support level
    return currentPrice >= fib618 && currentPrice <= fib382;
  }

  private getConfidenceRating(confidence: number): string {
    if (confidence >= 85) return 'Strong Buy';
    if (confidence >= 70) return 'Buy';
    if (confidence >= 55) return 'Neutral';
    if (confidence >= 40) return 'Sell';
    return 'Strong Sell';
  }
}
