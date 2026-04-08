import Decimal from 'decimal.js';
import { BaseStrategy } from './BaseStrategy';
import { TradeSignal } from '../types';
import { logger } from '../config/logger';

/**
 * Strategy 1: Trend/Breakout Momentum
 *
 * Entry conditions (ALL must be true):
 * 1. Daily MA alignment bullish (50 > 100 > 200)
 * 2. Price breaks above S/R resistance level
 * 3. RVOL > 1.5x average
 * 4. RSI between 40-70 (not overbought)
 * 5. MACD histogram positive AND rising
 * 6. Market regime = 'bull'
 */
export class TrendBreakoutStrategy extends BaseStrategy {
  name = 'Trend/Breakout';
  description = 'Trades uptrends when price breaks above resistance with volume confirmation';

  // Configurable parameters
  private minConfidence = parseInt(process.env.STRATEGY_1_MIN_CONFIDENCE || '60');
  private maFast = parseInt(process.env.STRATEGY_1_MA_FAST || '50');
  private maSlow = parseInt(process.env.STRATEGY_1_MA_SLOW || '200');
  private rsiMin = parseInt(process.env.STRATEGY_1_RSI_MIN || '40');
  private rsiMax = parseInt(process.env.STRATEGY_1_RSI_MAX || '70');
  private rvolThreshold = parseFloat(process.env.STRATEGY_1_RVOL_THRESHOLD || '1.5');
  private atrMultiplier = parseFloat(process.env.STRATEGY_1_ATR_MULTIPLIER || '2.5');

  generateSignals(analysisResults: Map<string, any>): TradeSignal[] {
    const signals: TradeSignal[] = [];

    try {
      for (const [symbol, analysis] of analysisResults) {
        if (!analysis) continue;

        // Extract analysis data
        const trendState = analysis.trend || {};
        const momentumState = analysis.momentum || {};
        const volumeState = analysis.volume || {};
        const regimeState = analysis.regime || {};
        const volatilityState = analysis.volatility || {};

        // Check all entry conditions
        const conditions = {
          maBullish: this.checkMAAlignment(trendState),
          breakoutSignal: this.checkBreakoutSignal(analysis),
          volumeConfirm: volumeState.rvol >= this.rvolThreshold,
          rsiValid: momentumState.rsi >= this.rsiMin && momentumState.rsi <= this.rsiMax,
          macdPositive: momentumState.macd_histogram > 0,
          bullishRegime: regimeState.regime === 'bull'
        };

        const conditionsMet = Object.values(conditions).filter(Boolean).length;

        if (conditionsMet >= 5) {
          // Calculate confidence score
          let confidence = 60;
          confidence += conditions.maBullish ? 5 : 0;
          confidence += conditions.volumeConfirm ? 10 : 0;
          confidence += conditions.macdPositive ? 5 : 0;
          confidence += conditions.bullishRegime ? 5 : 0;

          if (confidence >= this.minConfidence) {
            const signal: TradeSignal = {
              symbol,
              direction: 'long',
              entryPrice: new Decimal(analysis.current_price || 0),
              stopLoss: new Decimal(analysis.support_level || 0),
              takeProfit: new Decimal(analysis.resistance_level || 0),
              riskAmount: new Decimal(0),
              riskPercent: 1,
              confidence,
              rating: this.getConfidenceRating(confidence),
              strategy: this.name,
              timeframe: '1D',
              timestamp: new Date(),
              reasoning: `${this.name}: MA bullish, volume confirmation, MACD positive, bullish regime`
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
    // Check if all moving averages are aligned bullishly
    return (
      trendState.ma_50 > 0 &&
      trendState.ma_100 > 0 &&
      trendState.ma_200 > 0 &&
      trendState.ma_50 > trendState.ma_100 &&
      trendState.ma_100 > trendState.ma_200
    );
  }

  private checkBreakoutSignal(analysis: any): boolean {
    // Check if price broke above resistance with volume
    const currentPrice = analysis.current_price || 0;
    const resistance = analysis.resistance_level || 0;
    const volume = analysis.volume || 0;
    const avgVolume = analysis.volume_ma || 1;

    return (
      currentPrice > resistance &&
      volume > avgVolume * 1.5 // At least 1.5x average volume
    );
  }

  private getConfidenceRating(confidence: number): string {
    if (confidence >= 85) return 'Strong Buy';
    if (confidence >= 70) return 'Buy';
    if (confidence >= 55) return 'Neutral';
    if (confidence >= 40) return 'Sell';
    return 'Strong Sell';
  }
}
