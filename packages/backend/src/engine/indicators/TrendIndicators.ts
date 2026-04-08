import Decimal from 'decimal.js';
import { logger } from '../../config/logger';
import { OHLCV } from '../../data/DataProvider';

export interface MovingAverages {
  ma50: number[];
  ma100: number[];
  ma200: number[];
}

export interface TrendAlignment {
  ma50Above100: boolean;
  ma100Above200: boolean;
  priceAbove50: boolean;
  priceAbove100: boolean;
  priceAbove200: boolean;
  alignment: 'strong_bullish' | 'bullish' | 'mixed' | 'bearish' | 'strong_bearish';
}

export interface Crossover {
  type: 'golden_cross' | 'death_cross';
  bar: number;
  timestamp: Date;
  fastMA: number;
  slowMA: number;
}

export interface MASlope {
  period: number;
  slope: number; // positive = uptrend, negative = downtrend
  direction: 'up' | 'down' | 'flat';
  strength: 'strong' | 'moderate' | 'weak';
}

export class TrendIndicators {
  /**
   * Calculate Simple Moving Average (SMA)
   */
  static calculateSMA(prices: number[], period: number): number[] {
    if (period > prices.length) {
      logger.warn(`SMA period ${period} exceeds data length ${prices.length}`);
      return [];
    }

    const sma: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
        continue;
      }

      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }

    return sma;
  }

  /**
   * Calculate all moving averages
   */
  static calculateMovingAverages(closes: number[], periods: number[] = [50, 100, 200]): MovingAverages {
    return {
      ma50: this.calculateSMA(closes, periods[0]),
      ma100: this.calculateSMA(closes, periods[1]),
      ma200: this.calculateSMA(closes, periods[2])
    };
  }

  /**
   * Get most recent MAs (non-NaN values)
   */
  static getLatestMAs(
    closes: number[],
    periods: number[] = [50, 100, 200]
  ): { ma50: number; ma100: number; ma200: number; price: number } {
    const mas = this.calculateMovingAverages(closes, periods);

    return {
      price: closes[closes.length - 1],
      ma50: mas.ma50[closes.length - 1],
      ma100: mas.ma100[closes.length - 1],
      ma200: mas.ma200[closes.length - 1]
    };
  }

  /**
   * Determine trend alignment (bullish/bearish/mixed)
   */
  static getTrendAlignment(closes: number[], periods: number[] = [50, 100, 200]): TrendAlignment {
    const latest = this.getLatestMAs(closes, periods);

    const ma50Above100 = latest.ma50 > latest.ma100;
    const ma100Above200 = latest.ma100 > latest.ma200;
    const priceAbove50 = latest.price > latest.ma50;
    const priceAbove100 = latest.price > latest.ma100;
    const priceAbove200 = latest.price > latest.ma200;

    let alignment: TrendAlignment['alignment'] = 'mixed';

    if (priceAbove200 && priceAbove100 && priceAbove50 && ma50Above100 && ma100Above200) {
      alignment = 'strong_bullish';
    } else if (priceAbove100 && ma50Above100) {
      alignment = 'bullish';
    } else if (!priceAbove200 && !priceAbove100 && !priceAbove50 && !ma50Above100 && !ma100Above200) {
      alignment = 'strong_bearish';
    } else if (!priceAbove100 && !ma50Above100) {
      alignment = 'bearish';
    }

    return {
      ma50Above100,
      ma100Above200,
      priceAbove50,
      priceAbove100,
      priceAbove200,
      alignment
    };
  }

  /**
   * Detect moving average crossovers
   */
  static detectCrossovers(
    fastMA: number[],
    slowMA: number[],
    bars: OHLCV[]
  ): Crossover[] {
    const crossovers: Crossover[] = [];

    if (fastMA.length !== slowMA.length || fastMA.length !== bars.length) {
      logger.warn('MA arrays have different lengths');
      return crossovers;
    }

    for (let i = 1; i < fastMA.length; i++) {
      const prevFast = fastMA[i - 1];
      const prevSlow = slowMA[i - 1];
      const currFast = fastMA[i];
      const currSlow = slowMA[i];

      // Skip if NaN
      if (isNaN(prevFast) || isNaN(prevSlow) || isNaN(currFast) || isNaN(currSlow)) {
        continue;
      }

      // Golden cross: fast MA crosses above slow MA
      if (prevFast <= prevSlow && currFast > currSlow) {
        crossovers.push({
          type: 'golden_cross',
          bar: i,
          timestamp: bars[i].timestamp,
          fastMA: currFast,
          slowMA: currSlow
        });
      }

      // Death cross: fast MA crosses below slow MA
      if (prevFast >= prevSlow && currFast < currSlow) {
        crossovers.push({
          type: 'death_cross',
          bar: i,
          timestamp: bars[i].timestamp,
          fastMA: currFast,
          slowMA: currSlow
        });
      }
    }

    return crossovers;
  }

  /**
   * Calculate MA slope (direction of trend)
   */
  static calculateMASlope(maValues: number[], lookbackPeriod: number = 10): MASlope {
    const recentValues = maValues.slice(-lookbackPeriod).filter((v) => !isNaN(v));

    if (recentValues.length < 2) {
      return {
        period: lookbackPeriod,
        slope: 0,
        direction: 'flat',
        strength: 'weak'
      };
    }

    // Simple slope: (recent - old) / old
    const oldValue = recentValues[0];
    const recentValue = recentValues[recentValues.length - 1];
    const slope = (recentValue - oldValue) / oldValue;

    let direction: 'up' | 'down' | 'flat' = 'flat';
    let strength: 'strong' | 'moderate' | 'weak' = 'weak';

    const absSlope = Math.abs(slope);

    if (absSlope < 0.01) {
      direction = 'flat';
      strength = 'weak';
    } else if (slope > 0) {
      direction = 'up';
      strength = absSlope > 0.05 ? 'strong' : absSlope > 0.02 ? 'moderate' : 'weak';
    } else {
      direction = 'down';
      strength = absSlope > 0.05 ? 'strong' : absSlope > 0.02 ? 'moderate' : 'weak';
    }

    return {
      period: lookbackPeriod,
      slope,
      direction,
      strength
    };
  }

  /**
   * Get EMA (Exponential Moving Average)
   */
  static calculateEMA(prices: number[], period: number): number[] {
    if (period > prices.length) {
      logger.warn(`EMA period ${period} exceeds data length ${prices.length}`);
      return [];
    }

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);

    // Calculate EMA for remaining values
    for (let i = period; i < prices.length; i++) {
      const newEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(newEMA);
    }

    // Pad with NaN for initial period
    return Array(period - 1).fill(NaN).concat(ema);
  }

  /**
   * Detect uptrend (price making higher highs and higher lows)
   */
  static isUptrend(bars: OHLCV[], lookbackPeriod: number = 20): boolean {
    if (bars.length < lookbackPeriod) return false;

    const recentBars = bars.slice(-lookbackPeriod);
    const highs = recentBars.map((b) => b.high);
    const lows = recentBars.map((b) => b.low);

    let higherHighs = 0;
    let higherLows = 0;

    for (let i = 1; i < recentBars.length; i++) {
      if (highs[i] > highs[i - 1]) higherHighs++;
      if (lows[i] > lows[i - 1]) higherLows++;
    }

    // At least 60% of bars should show higher highs and lows
    return higherHighs > lookbackPeriod * 0.6 && higherLows > lookbackPeriod * 0.6;
  }

  /**
   * Detect downtrend (price making lower highs and lower lows)
   */
  static isDowntrend(bars: OHLCV[], lookbackPeriod: number = 20): boolean {
    if (bars.length < lookbackPeriod) return false;

    const recentBars = bars.slice(-lookbackPeriod);
    const highs = recentBars.map((b) => b.high);
    const lows = recentBars.map((b) => b.low);

    let lowerHighs = 0;
    let lowerLows = 0;

    for (let i = 1; i < recentBars.length; i++) {
      if (highs[i] < highs[i - 1]) lowerHighs++;
      if (lows[i] < lows[i - 1]) lowerLows++;
    }

    // At least 60% of bars should show lower highs and lows
    return lowerHighs > lookbackPeriod * 0.6 && lowerLows > lookbackPeriod * 0.6;
  }
}

export default TrendIndicators;
