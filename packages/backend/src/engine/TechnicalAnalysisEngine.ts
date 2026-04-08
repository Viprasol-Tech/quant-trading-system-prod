import Decimal from 'decimal.js';
import { logger } from '../config/logger';
import { OHLCV } from '../data/DataProvider';
import { TrendIndicators, TrendAlignment } from './indicators/TrendIndicators';
import { MomentumIndicators, RSIState, MACDState } from './indicators/MomentumIndicators';
import { VolatilityIndicators, VolatilityState } from './indicators/VolatilityIndicators';
import { VolumeIndicators, VolumeState } from './indicators/VolumeIndicators';
import { FibonacciIndicators, SwingPoint, FibonacciLevels } from './indicators/FibonacciIndicators';
import { SupportResistanceAnalysis, SRLevel } from './patterns/SupportResistance';
import { RegimeDetection, RegimeState } from './regime/RegimeDetection';

export interface AnalysisResult {
  symbol: string;
  timestamp: Date;
  price: number;
  trendAlignment: TrendAlignment;
  rsiState: RSIState;
  macdState: MACDState;
  volatilityState: VolatilityState;
  volumeState: VolumeState;
  regimeState: RegimeState;
  srLevels: SRLevel[];
  fibonacciLevels?: FibonacciLevels;
  confidenceScore: number; // 0-100
  rating: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
  narrative: string;
}

export class TechnicalAnalysisEngine {
  /**
   * Comprehensive technical analysis on a single timeframe
   */
  static analyze(bars: OHLCV[], symbol: string): AnalysisResult {
    if (bars.length < 100) {
      logger.warn(`Insufficient data for ${symbol}: ${bars.length} bars`);
      throw new Error(`Minimum 100 bars required, got ${bars.length}`);
    }

    const timestamp = bars[bars.length - 1].timestamp;
    const closes = bars.map((b) => b.close);
    const currentPrice = closes[closes.length - 1];

    logger.info(`Analyzing ${symbol} with ${bars.length} bars`);

    // Calculate all indicators
    const maValues = TrendIndicators.calculateMovingAverages(closes);
    const latestMA = TrendIndicators.getLatestMAs(closes);
    const trendAlignment = TrendIndicators.getTrendAlignment(closes);

    const rsiValues = MomentumIndicators.calculateRSI(closes);
    const latestRSI = rsiValues[rsiValues.length - 1] || 50;
    const rsiState = MomentumIndicators.interpretRSI(latestRSI);

    const macd = MomentumIndicators.calculateMACD(closes);
    const latestMACD = macd.macd[macd.macd.length - 1] || 0;
    const latestSignal = macd.signal[macd.signal.length - 1] || 0;
    const latestHistogram = macd.histogram[macd.histogram.length - 1] || 0;
    const macdState = MomentumIndicators.interpretMACD(latestMACD, latestSignal, latestHistogram);

    const atrValues = VolatilityIndicators.calculateATR(bars);
    const latestATR = atrValues[atrValues.length - 1] || 0;
    const volatilityState = VolatilityIndicators.getVolatilityState(bars, closes);

    const priceDirection: 'up' | 'down' | 'neutral' =
      currentPrice > closes[Math.max(0, closes.length - 5)] ? 'up' :
      currentPrice < closes[Math.max(0, closes.length - 5)] ? 'down' :
      'neutral';
    const volumeState = VolumeIndicators.getVolumeState(bars, priceDirection);

    const adxValues = RegimeDetection.calculateADX(bars);
    const latestADX = adxValues[adxValues.length - 1] || 0;
    const regimeState = RegimeDetection.getRegimeState(
      bars,
      currentPrice,
      latestMA.ma50,
      latestMA.ma100,
      latestMA.ma200,
      atrValues,
      adxValues,
      latestRSI
    );

    // Support/Resistance
    const pivots = SupportResistanceAnalysis.detectPivots(bars);
    const srLevels = SupportResistanceAnalysis.detectSRLevels(pivots);

    // Fibonacci
    let fibonacciLevels: FibonacciLevels | undefined;
    const swingPoints = FibonacciIndicators.detectSwingPoints(bars, atrValues);
    if (swingPoints.length >= 2) {
      const lastSwingHigh = swingPoints.filter((s) => s.type === 'high').pop();
      const lastSwingLow = swingPoints.filter((s) => s.type === 'low').pop();

      if (lastSwingHigh && lastSwingLow) {
        fibonacciLevels = FibonacciIndicators.calculateFibonacciLevels(
          lastSwingHigh.price,
          lastSwingLow.price
        );
      }
    }

    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore({
      trendAlignment,
      rsiState,
      macdState,
      volumeState,
      regimeState,
      srLevels,
      currentPrice
    });

    // Generate rating
    const rating = this.getRating(confidenceScore);

    // Generate narrative
    const narrative = this.generateNarrative({
      symbol,
      currentPrice,
      trendAlignment,
      rsiState,
      macdState,
      volumeState,
      regimeState,
      confidenceScore
    });

    return {
      symbol,
      timestamp,
      price: currentPrice,
      trendAlignment,
      rsiState,
      macdState,
      volatilityState,
      volumeState,
      regimeState,
      srLevels,
      fibonacciLevels,
      confidenceScore,
      rating,
      narrative
    };
  }

  /**
   * Calculate confidence score (0-100)
   */
  private static calculateConfidenceScore(params: {
    trendAlignment: TrendAlignment;
    rsiState: RSIState;
    macdState: MACDState;
    volumeState: VolumeState;
    regimeState: RegimeState;
    srLevels: SRLevel[];
    currentPrice: number;
  }): number {
    let score = 50; // Base score

    // Trend alignment (30 points)
    if (params.trendAlignment.alignment === 'strong_bullish') {
      score += 30;
    } else if (params.trendAlignment.alignment === 'bullish') {
      score += 20;
    } else if (params.trendAlignment.alignment === 'strong_bearish') {
      score -= 30;
    } else if (params.trendAlignment.alignment === 'bearish') {
      score -= 20;
    }

    // Momentum (20 points)
    if (params.macdState.bullish) {
      score += 15;
    } else {
      score -= 15;
    }

    if (params.rsiState.signal === 'oversold') {
      score += 10;
    } else if (params.rsiState.signal === 'overbought') {
      score -= 10;
    }

    // Volume (15 points)
    if (params.volumeState.relativeVolume > 1.5) {
      score += 10;
    }

    if (params.volumeState.obvTrend === 'accumulation') {
      score += 10;
    } else if (params.volumeState.obvTrend === 'distribution') {
      score -= 10;
    }

    // Regime (15 points)
    if (params.regimeState.marketRegime === 'bull') {
      score += 15;
    } else if (params.regimeState.marketRegime === 'bear') {
      score -= 15;
    }

    // S/R proximity (10 points)
    const support = SupportResistanceAnalysis.findNearestSupport(params.currentPrice, params.srLevels);
    const resistance = SupportResistanceAnalysis.findNearestResistance(params.currentPrice, params.srLevels);

    if (support && (params.currentPrice - support.price) / params.currentPrice < 0.02) {
      score += 5;
    }
    if (resistance && (resistance.price - params.currentPrice) / params.currentPrice > 0.05) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Convert score to rating
   */
  private static getRating(
    score: number
  ): 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell' {
    if (score >= 80) return 'Strong Buy';
    if (score >= 60) return 'Buy';
    if (score >= 40) return 'Neutral';
    if (score >= 20) return 'Sell';
    return 'Strong Sell';
  }

  /**
   * Generate plain-English narrative
   */
  private static generateNarrative(params: {
    symbol: string;
    currentPrice: number;
    trendAlignment: TrendAlignment;
    rsiState: RSIState;
    macdState: MACDState;
    volumeState: VolumeState;
    regimeState: RegimeState;
    confidenceScore: number;
  }): string {
    const parts: string[] = [];

    parts.push(`${params.symbol} at $${params.currentPrice.toFixed(2)}`);

    // Trend
    parts.push(`Trend: ${params.trendAlignment.alignment.replace(/_/g, ' ')}`);

    // Momentum
    parts.push(`Momentum: ${params.rsiState.interpretation}`);
    parts.push(`MACD: ${params.macdState.interpretation}`);

    // Volume
    parts.push(`${params.volumeState.volumeConfirmation}`);

    // Regime
    parts.push(`Regime: ${params.regimeState.interpretation}`);

    // Confidence
    parts.push(`Confidence: ${params.confidenceScore.toFixed(0)}/100`);

    return parts.join(' | ');
  }
}

export default TechnicalAnalysisEngine;
