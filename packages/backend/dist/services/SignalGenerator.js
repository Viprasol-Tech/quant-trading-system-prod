"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalGenerator = void 0;
const TrendBreakoutStrategy_1 = require("../strategies/TrendBreakoutStrategy");
const PullbackReversionStrategy_1 = require("../strategies/PullbackReversionStrategy");
const HybridCompositeStrategy_1 = require("../strategies/HybridCompositeStrategy");
const logger_1 = require("../config/logger");
/**
 * SignalGenerator orchestrates all 3 strategies and produces ranked trade signals
 */
class SignalGenerator {
    constructor() {
        this.strategies = [
            new TrendBreakoutStrategy_1.TrendBreakoutStrategy(),
            new PullbackReversionStrategy_1.PullbackReversionStrategy(),
            new HybridCompositeStrategy_1.HybridCompositeStrategy()
        ];
    }
    /**
     * Generate signals for a universe of symbols across all strategies
     */
    async generateSignals(analysisResults) {
        const signals = [];
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
            logger_1.logger.info(`Generated ${ranked.length} signals from ${analysisResults.size} symbols`);
            return ranked;
        }
        catch (error) {
            logger_1.logger.error('Error generating signals:', error);
            return signals;
        }
    }
    /**
     * Generate signals for a single symbol across all strategies
     */
    generateSignalForSymbol(symbol, analysis) {
        try {
            // Create a map with just this symbol
            const analysisMap = new Map();
            analysisMap.set(symbol, analysis);
            // Try each strategy in order
            for (const strategy of this.strategies) {
                const signals = strategy.generateSignals(analysisMap);
                if (signals && signals.length > 0) {
                    return signals[0]; // Return highest confidence signal
                }
            }
            return null; // No strategy generated a signal
        }
        catch (error) {
            logger_1.logger.error(`Error generating signal for ${symbol}:`, error);
            return null;
        }
    }
    /**
     * Filter signals by confidence threshold
     */
    filterByConfidence(signals, threshold = 60) {
        return signals.filter(signal => signal.confidence >= threshold);
    }
    /**
     * Filter signals by strategy name
     */
    filterByStrategy(signals, strategyName) {
        return signals.filter(signal => signal.strategy === strategyName);
    }
    /**
     * Get signals for a specific symbol
     */
    getSignalsForSymbol(signals, symbol) {
        return signals.filter(signal => signal.symbol === symbol);
    }
    /**
     * Rank signals by confidence (highest first)
     */
    rankSignals(signals) {
        return signals.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Deduplicate signals (only keep highest confidence per symbol)
     */
    deduplicateBySymbol(signals) {
        const best = new Map();
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
    getStrategyStats(signals) {
        const stats = {};
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
exports.SignalGenerator = SignalGenerator;
exports.default = new SignalGenerator();
//# sourceMappingURL=SignalGenerator.js.map