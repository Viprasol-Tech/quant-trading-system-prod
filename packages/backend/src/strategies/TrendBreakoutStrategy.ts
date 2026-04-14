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
  private minConfidence: number;
  private rsiMin: number;
  private rsiMax: number;
  private rvolThreshold: number;
  private atrMultiplier: number;

  constructor(params?: Record<string, any>) {
    super();
    this.minConfidence = params?.minConfidence ?? parseInt(process.env.STRATEGY_1_MIN_CONFIDENCE || '60');
    this.rsiMin = params?.rsiMin ?? parseInt(process.env.STRATEGY_1_RSI_MIN || '40');
    this.rsiMax = params?.rsiMax ?? parseInt(process.env.STRATEGY_1_RSI_MAX || '70');
    this.rvolThreshold = params?.rvolThreshold ?? parseFloat(process.env.STRATEGY_1_RVOL_THRESHOLD || '1.5');
    this.atrMultiplier = params?.atrMultiplier ?? parseFloat(process.env.STRATEGY_1_ATR_MULTIPLIER || '2.5');
  }

  generateSignals(analysisResults: Map<string, any>): TradeSignal[] {
    const signals: TradeSignal[] = [];

    try {
      for (const [symbol, analysis] of analysisResults) {
        if (!analysis) continue;

        const trendState = analysis.trend || {};
        const momentumState = analysis.momentum || {};
        const volumeState = analysis.volume || {};
        const regimeState = analysis.regime || {};
        const volatilityState = analysis.volatility || {};
        const currentPrice = analysis.current_price || analysis.currentPrice || 0;

        if (currentPrice <= 0) continue;

        // Check all entry conditions
        const conditions = {
          maBullish: this.checkMAAlignment(trendState),
          breakoutSignal: this.checkBreakoutSignal(analysis, currentPrice),
          volumeConfirm: (volumeState.rvol || 1) >= this.rvolThreshold,
          rsiValid: (momentumState.rsi || 50) >= this.rsiMin && (momentumState.rsi || 50) <= this.rsiMax,
          macdPositive: (momentumState.macd_histogram || 0) > 0,
          bullishRegime: regimeState.classification === 'bull' || regimeState.regime === 'bull'
        };

        const conditionsMet = Object.values(conditions).filter(Boolean).length;

        if (conditionsMet >= 5) {
          // Calculate confidence score
          let confidence = 60;
          confidence += conditions.maBullish ? 5 : 0;
          confidence += conditions.volumeConfirm ? 10 : 0;
          confidence += conditions.macdPositive ? 5 : 0;
          confidence += conditions.bullishRegime ? 5 : 0;
          confidence += conditionsMet === 6 ? 5 : 0;

          if (confidence >= this.minConfidence) {
            // Calculate REAL stop loss based on ATR
            const atr = volatilityState.atr || currentPrice * 0.02;
            const stopLossPrice = currentPrice - (atr * this.atrMultiplier);
            const maxStopLoss = currentPrice * 0.95; // 5% max
            const finalStopLoss = Math.max(stopLossPrice, maxStopLoss);

            // Calculate REAL take profit (2:1 R:R)
            const riskPerShare = currentPrice - finalStopLoss;
            const takeProfit = currentPrice + (riskPerShare * 2);

            const signal: TradeSignal = {
              symbol,
              direction: 'long',
              entryPrice: new Decimal(currentPrice),
              stopLoss: new Decimal(finalStopLoss),
              takeProfit: new Decimal(takeProfit),
              riskAmount: new Decimal(riskPerShare * 100), // Per 100 shares
              riskPercent: (riskPerShare / currentPrice) * 100,
              confidence,
              rating: this.getConfidenceRating(confidence),
              strategy: this.name,
              timeframe: '1D',
              timestamp: new Date(),
              reasoning: `${this.name}: MA bullish=${conditions.maBullish}, RVOL=${(volumeState.rvol || 1).toFixed(2)}x, RSI=${(momentumState.rsi || 50).toFixed(1)}, Stop=$${finalStopLoss.toFixed(2)}`
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
    const ma50 = trendState.ma_50 || trendState.ma50 || 0;
    const ma100 = trendState.ma_100 || trendState.ma100 || 0;
    const ma200 = trendState.ma_200 || trendState.ma200 || 0;

    return ma50 > 0 && ma100 > 0 && ma200 > 0 && ma50 > ma100 && ma100 > ma200;
  }

  private checkBreakoutSignal(analysis: any, currentPrice: number): boolean {
    const resistance = analysis.resistance_level || analysis.support_resistance?.resistance || 0;
    const volume = analysis.volume?.current || analysis.volume || 0;
    const avgVolume = analysis.volume?.average || analysis.volume_ma || 1;

    return currentPrice > resistance * 0.98 && volume > avgVolume * 1.5;
  }

  private getConfidenceRating(confidence: number): string {
    if (confidence >= 85) return 'Strong Buy';
    if (confidence >= 70) return 'Buy';
    if (confidence >= 55) return 'Neutral';
    if (confidence >= 40) return 'Sell';
    return 'Strong Sell';
  }
}
