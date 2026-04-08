import { TradeSignal } from '../types';
import { TrendBreakoutStrategy } from '../strategies/TrendBreakoutStrategy';
import { PullbackReversionStrategy } from '../strategies/PullbackReversionStrategy';
import { HybridCompositeStrategy } from '../strategies/HybridCompositeStrategy';
import { logger } from '../config/logger';

/**
 * SignalGenerator orchestrates all 3 strategies and produces ranked trade signals
 */
export class SignalGenerator {
  private strategies = [
    new TrendBreakoutStrategy(),
    new PullbackReversionStrategy(),
    new HybridCompositeStrategy()
  ];

  /**
   * Generate signals for a universe of symbols across all strategies
   */
  async generateSignals(analysisResults: Map<string, any>): Promise<TradeSignal[]> {
    const signals: TradeSignal[] = [];

    try {
      // Run all strategies
      for (const strategy of this.strategies) {
        const strategySignals = strategy.generateSignals(analysisResults);
        signals.push(...strategySignals);
      }

      // Filter, rank, and deduplicate
      let filtered = this.filterByConfidence(signals, 60);
      filtered = this.deduplicateBySymbol(filtered);
      const ranked = this.rankSignals(filtered);

      logger.info(`Generated ${ranked.length} signals from ${analysisResults.size} symbols`);
      return ranked;
    } catch (error) {
      logger.error('Error generating signals:', error);
      return signals;
    }
  }

  /**
   * Generate signals for a single symbol across all strategies
   */
  generateSignalForSymbol(symbol: string, analysis: any): TradeSignal | null {
    try {
      // Create a map with just this symbol
      const analysisMap = new Map<string, any>();
      analysisMap.set(symbol, analysis);

      // Try each strategy in order
      for (const strategy of this.strategies) {
        const signals = strategy.generateSignals(analysisMap);
        if (signals && signals.length > 0) {
          return signals[0]; // Return highest confidence signal
        }
      }

      return null; // No strategy generated a signal
    } catch (error) {
      logger.error(`Error generating signal for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Filter signals by confidence threshold
   */
  filterByConfidence(signals: TradeSignal[], threshold: number = 60): TradeSignal[] {
    return signals.filter(signal => signal.confidence >= threshold);
  }

  /**
   * Filter signals by strategy name
   */
  filterByStrategy(signals: TradeSignal[], strategyName: string): TradeSignal[] {
    return signals.filter(signal => signal.strategy === strategyName);
  }

  /**
   * Get signals for a specific symbol
   */
  getSignalsForSymbol(signals: TradeSignal[], symbol: string): TradeSignal[] {
    return signals.filter(signal => signal.symbol === symbol);
  }

  /**
   * Rank signals by confidence (highest first)
   */
  rankSignals(signals: TradeSignal[]): TradeSignal[] {
    return signals.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Deduplicate signals (only keep highest confidence per symbol)
   */
  deduplicateBySymbol(signals: TradeSignal[]): TradeSignal[] {
    const best = new Map<string, TradeSignal>();

    for (const signal of signals) {
      const existing = best.get(signal.symbol);
      if (!existing || signal.confidence > existing.confidence) {
        best.set(signal.symbol, signal);
      }
    }

    return Array.from(best.values());
  }

  /**
   * Get strategy statistics
   */
  getStrategyStats(signals: TradeSignal[]): any {
    const stats: any = {};

    for (const strategy of this.strategies) {
      const strategySignals = signals.filter(s => s.strategy === strategy.name);
      stats[strategy.name] = {
        count: strategySignals.length,
        avgConfidence: strategySignals.length > 0
          ? strategySignals.reduce((sum, s) => sum + s.confidence, 0) / strategySignals.length
          : 0,
        signals: strategySignals
      };
    }

    return stats;
  }
}

export default new SignalGenerator();
