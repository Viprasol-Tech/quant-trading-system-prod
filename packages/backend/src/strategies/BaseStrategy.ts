import { TradeSignal } from '../types';

/**
 * Base Strategy interface
 * All strategies must implement this interface
 */
export interface IStrategy {
  name: string;
  description: string;
  generateSignals(analysisResults: Map<string, any>): TradeSignal[];
  filterSignals(signals: TradeSignal[]): TradeSignal[];
  rankSignals(signals: TradeSignal[]): TradeSignal[];
}

/**
 * Abstract base class for trading strategies
 */
export abstract class BaseStrategy implements IStrategy {
  abstract name: string;
  abstract description: string;

  /**
   * Generate trade signals from analysis results
   */
  abstract generateSignals(analysisResults: Map<string, any>): TradeSignal[];

  /**
   * Filter signals based on strategy rules
   */
  filterSignals(signals: TradeSignal[]): TradeSignal[] {
    return signals.filter(s => s.confidence >= 60); // Default: min 60 confidence
  }

  /**
   * Rank signals by confidence score
   */
  rankSignals(signals: TradeSignal[]): TradeSignal[] {
    return signals.sort((a, b) => b.confidence - a.confidence);
  }
}
