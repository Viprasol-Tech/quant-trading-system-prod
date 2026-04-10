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
export declare abstract class BaseStrategy implements IStrategy {
    abstract name: string;
    abstract description: string;
    /**
     * Generate trade signals from analysis results
     */
    abstract generateSignals(analysisResults: Map<string, any>): TradeSignal[];
    /**
     * Filter signals based on strategy rules
     */
    filterSignals(signals: TradeSignal[]): TradeSignal[];
    /**
     * Rank signals by confidence score
     */
    rankSignals(signals: TradeSignal[]): TradeSignal[];
}
//# sourceMappingURL=BaseStrategy.d.ts.map