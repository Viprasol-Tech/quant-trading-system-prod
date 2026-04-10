import { TradeSignal } from '../types';
/**
 * SignalGenerator orchestrates all 3 strategies and produces ranked trade signals
 */
export declare class SignalGenerator {
    private strategies;
    /**
     * Generate signals for a universe of symbols across all strategies
     */
    generateSignals(analysisResults: Map<string, any>): Promise<TradeSignal[]>;
    /**
     * Generate signals for a single symbol across all strategies
     */
    generateSignalForSymbol(symbol: string, analysis: any): TradeSignal | null;
    /**
     * Filter signals by confidence threshold
     */
    filterByConfidence(signals: TradeSignal[], threshold?: number): TradeSignal[];
    /**
     * Filter signals by strategy name
     */
    filterByStrategy(signals: TradeSignal[], strategyName: string): TradeSignal[];
    /**
     * Get signals for a specific symbol
     */
    getSignalsForSymbol(signals: TradeSignal[], symbol: string): TradeSignal[];
    /**
     * Rank signals by confidence (highest first)
     */
    rankSignals(signals: TradeSignal[]): TradeSignal[];
    /**
     * Deduplicate signals (only keep highest confidence per symbol)
     */
    deduplicateBySymbol(signals: TradeSignal[]): TradeSignal[];
    /**
     * Get strategy statistics
     */
    getStrategyStats(signals: TradeSignal[]): any;
}
declare const _default: SignalGenerator;
export default _default;
//# sourceMappingURL=SignalGenerator.d.ts.map