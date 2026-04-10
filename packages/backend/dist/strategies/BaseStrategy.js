"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseStrategy = void 0;
/**
 * Abstract base class for trading strategies
 */
class BaseStrategy {
    /**
     * Filter signals based on strategy rules
     */
    filterSignals(signals) {
        return signals.filter(s => s.confidence >= 60); // Default: min 60 confidence
    }
    /**
     * Rank signals by confidence score
     */
    rankSignals(signals) {
        return signals.sort((a, b) => b.confidence - a.confidence);
    }
}
exports.BaseStrategy = BaseStrategy;
//# sourceMappingURL=BaseStrategy.js.map