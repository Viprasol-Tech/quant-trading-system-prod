import { logger } from '../../config/logger';
import { OHLCV } from '../../data/DataProvider';

export interface FibonacciLevels {
  level0: number; // 0%
  level236: number; // 23.6%
  level382: number; // 38.2%
  level500: number; // 50%
  level618: number; // 61.8%
  level786: number; // 78.6%
  level1000: number; // 100%
}

export interface SwingPoint {
  index: number;
  timestamp: Date;
  price: number;
  type: 'high' | 'low';
  atrFiltered: boolean;
}

export interface ConfluenceZone {
  price: number;
  strength: number; // Number of confluence points
  levels: string[];
}

export class FibonacciIndicators {
  /**
   * Detect swing points (highs and lows) using ATR filtering
   */
  static detectSwingPoints(
    bars: OHLCV[],
    atrValues: number[],
    minSwingPercent: number = 0.05,
    atrFilterMultiplier: number = 1.5
  ): SwingPoint[] {
    if (bars.length < 5) {
      logger.warn('Insufficient data for swing detection');
      return [];
    }

    const swingPoints: SwingPoint[] = [];

    for (let i = 2; i < bars.length - 2; i++) {
      const prevBar = bars[i - 1];
      const currentBar = bars[i];
      const nextBar = bars[i + 1];
      const avgATR = atrValues[i] || 0;

      // Detect local high
      if (
        currentBar.high > prevBar.high &&
        currentBar.high > nextBar.high &&
        currentBar.high > bars[i - 2].high &&
        currentBar.high > bars[i + 2].high
      ) {
        // Check if move is significant (ATR filtered)
        const moveSize = currentBar.high - Math.min(prevBar.low, nextBar.low);
        if (moveSize > avgATR * atrFilterMultiplier) {
          swingPoints.push({
            index: i,
            timestamp: currentBar.timestamp,
            price: currentBar.high,
            type: 'high',
            atrFiltered: true
          });
        }
      }

      // Detect local low
      if (
        currentBar.low < prevBar.low &&
        currentBar.low < nextBar.low &&
        currentBar.low < bars[i - 2].low &&
        currentBar.low < bars[i + 2].low
      ) {
        // Check if move is significant (ATR filtered)
        const moveSize = Math.max(prevBar.high, nextBar.high) - currentBar.low;
        if (moveSize > avgATR * atrFilterMultiplier) {
          swingPoints.push({
            index: i,
            timestamp: currentBar.timestamp,
            price: currentBar.low,
            type: 'low',
            atrFiltered: true
          });
        }
      }
    }

    return swingPoints;
  }

  /**
   * Calculate Fibonacci levels from a swing (high to low or low to high)
   */
  static calculateFibonacciLevels(swingHigh: number, swingLow: number): FibonacciLevels {
    const diff = swingHigh - swingLow;

    return {
      level0: swingHigh,
      level236: swingHigh - diff * 0.236,
      level382: swingHigh - diff * 0.382,
      level500: swingHigh - diff * 0.500,
      level618: swingHigh - diff * 0.618,
      level786: swingHigh - diff * 0.786,
      level1000: swingLow
    };
  }

  /**
   * Find confluence zones where multiple Fibonacci levels cluster
   */
  static findConfluenceZones(
    fibLevelsList: FibonacciLevels[],
    clusteringDistance: number = 0.015 // 1.5% of price
  ): ConfluenceZone[] {
    if (fibLevelsList.length === 0) return [];

    // Collect all levels from all swings
    const allLevels: { price: number; level: string }[] = [];

    for (const fib of fibLevelsList) {
      allLevels.push({ price: fib.level236, level: '23.6%' });
      allLevels.push({ price: fib.level382, level: '38.2%' });
      allLevels.push({ price: fib.level500, level: '50%' });
      allLevels.push({ price: fib.level618, level: '61.8%' });
      allLevels.push({ price: fib.level786, level: '78.6%' });
    }

    // Sort by price
    allLevels.sort((a, b) => a.price - b.price);

    // Find clusters
    const confluenceZones: ConfluenceZone[] = [];
    let currentCluster: { price: number; level: string }[] = [allLevels[0]];

    for (let i = 1; i < allLevels.length; i++) {
      const distance = Math.abs(allLevels[i].price - currentCluster[currentCluster.length - 1].price);
      const clusterAvg = currentCluster.reduce((sum, l) => sum + l.price, 0) / currentCluster.length;
      const percentDistance = distance / clusterAvg;

      if (percentDistance < clusteringDistance) {
        currentCluster.push(allLevels[i]);
      } else {
        // Save current cluster if strength > 1
        if (currentCluster.length > 1) {
          const avgPrice = currentCluster.reduce((sum, l) => sum + l.price, 0) / currentCluster.length;
          const levels = currentCluster.map((l) => l.level);
          confluenceZones.push({
            price: avgPrice,
            strength: currentCluster.length,
            levels
          });
        }
        currentCluster = [allLevels[i]];
      }
    }

    // Don't forget last cluster
    if (currentCluster.length > 1) {
      const avgPrice = currentCluster.reduce((sum, l) => sum + l.price, 0) / currentCluster.length;
      const levels = currentCluster.map((l) => l.level);
      confluenceZones.push({
        price: avgPrice,
        strength: currentCluster.length,
        levels
      });
    }

    return confluenceZones.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Determine nearest Fibonacci level for current price
   */
  static getNearestFibLevel(price: number, fibLevels: FibonacciLevels): { level: string; distance: number } {
    const levels = [
      { name: '0%', value: fibLevels.level0 },
      { name: '23.6%', value: fibLevels.level236 },
      { name: '38.2%', value: fibLevels.level382 },
      { name: '50%', value: fibLevels.level500 },
      { name: '61.8%', value: fibLevels.level618 },
      { name: '78.6%', value: fibLevels.level786 },
      { name: '100%', value: fibLevels.level1000 }
    ];

    let nearest = levels[0];
    let minDistance = Math.abs(price - nearest.value);

    for (const level of levels) {
      const distance = Math.abs(price - level.value);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = level;
      }
    }

    return {
      level: nearest.name,
      distance: minDistance
    };
  }

  /**
   * Check if price is within range of a Fibonacci level
   */
  static isPriceNearFibLevel(
    price: number,
    fibLevel: number,
    tolerance: number = 0.01 // 1%
  ): boolean {
    const percentDistance = Math.abs(price - fibLevel) / fibLevel;
    return percentDistance < tolerance;
  }

  /**
   * Get support/resistance from Fibonacci levels
   */
  static getFibSupport(
    bars: OHLCV[],
    atrValues: number[],
    lookbackPeriods: number = 3
  ): { support: number[]; resistance: number[] } {
    const swingPoints = this.detectSwingPoints(bars, atrValues);

    if (swingPoints.length < 2) {
      return { support: [], resistance: [] };
    }

    const recentSwings = swingPoints.slice(-lookbackPeriods * 2);
    const support: number[] = [];
    const resistance: number[] = [];

    for (let i = 1; i < recentSwings.length; i++) {
      if (recentSwings[i - 1].type === 'high' && recentSwings[i].type === 'low') {
        const fib = this.calculateFibonacciLevels(recentSwings[i - 1].price, recentSwings[i].price);
        support.push(fib.level382, fib.level618);
      } else if (recentSwings[i - 1].type === 'low' && recentSwings[i].type === 'high') {
        const fib = this.calculateFibonacciLevels(recentSwings[i].price, recentSwings[i - 1].price);
        resistance.push(fib.level382, fib.level618);
      }
    }

    return { support, resistance };
  }
}

export default FibonacciIndicators;
