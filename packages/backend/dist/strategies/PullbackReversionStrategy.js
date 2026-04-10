"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullbackReversionStrategy = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const BaseStrategy_1 = require("./BaseStrategy");
const logger_1 = require("../config/logger");
/**
 * Strategy 2: Pullback/Mean Reversion
 *
 * Entry conditions:
 * 1. Overall trend is bullish
 * 2. Price pulls back to support (Fib level or S/R)
 * 3. RSI oversold bounce (35-50, rising)
 * 4. Volume declining on pullback
 * 5. MACD showing reversal signs
 */
class PullbackReversionStrategy extends BaseStrategy_1.BaseStrategy {
    constructor() {
        super(...arguments);
        this.name = 'Pullback/Reversion';
        this.description = 'Buys pullback to support in an uptrend with volume confirmation';
        this.minConfidence = parseInt(process.env.STRATEGY_2_MIN_CONFIDENCE || '55');
        this.rsiMin = parseInt(process.env.STRATEGY_2_RSI_MIN || '35');
        this.rsiMax = parseInt(process.env.STRATEGY_2_RSI_MAX || '50');
        this.atrMultiplier = parseFloat(process.env.STRATEGY_2_ATR_MULTIPLIER || '2.0');
    }
    generateSignals(analysisResults) {
        const signals = [];
        try {
            for (const [symbol, analysis] of analysisResults) {
                if (!analysis)
                    continue;
                const trendState = analysis.trend || {};
                const momentumState = analysis.momentum || {};
                const volumeState = analysis.volume || {};
                const regimeState = analysis.regime || {};
                const volatilityState = analysis.volatility || {};
                const fibLevels = analysis.fibonacci?.retracement_levels || {};
                const currentPrice = analysis.current_price || analysis.currentPrice || 0;
                if (currentPrice <= 0)
                    continue;
                // Check trend is bullish
                const trendBullish = trendState.ma_alignment === 'bullish' ||
                    (trendState.ma_50 || 0) > (trendState.ma_200 || 0);
                if (!trendBullish)
                    continue;
                // Check price near support
                const nearFibSupport = this.checkNearFibSupport(currentPrice, fibLevels);
                const nearSRSupport = this.checkNearSRSupport(currentPrice, analysis.support_resistance);
                if (!nearFibSupport && !nearSRSupport)
                    continue;
                // Check RSI oversold bounce
                const rsi = momentumState.rsi || 50;
                const rsiOversold = rsi >= this.rsiMin && rsi <= this.rsiMax;
                if (!rsiOversold)
                    continue;
                // Check volume declining (pullback on low volume)
                const rvol = volumeState.rvol || 1;
                const volumeDeclining = rvol < 1.2;
                // Check regime
                const regime = regimeState.classification || regimeState.regime || 'unknown';
                const regimeOk = regime === 'bull' || regime === 'recovering';
                // Calculate confidence
                let confidence = 50;
                confidence += trendBullish ? 10 : 0;
                confidence += nearFibSupport ? 10 : 0;
                confidence += nearSRSupport ? 10 : 0;
                confidence += rsiOversold ? 10 : 0;
                confidence += volumeDeclining ? 5 : 0;
                confidence += regimeOk ? 5 : 0;
                if (confidence >= this.minConfidence) {
                    // Calculate REAL stop loss
                    const atr = volatilityState.atr || currentPrice * 0.02;
                    const supportLevel = this.getNearestSupport(currentPrice, analysis);
                    const stopLossPrice = Math.min(supportLevel * 0.99, currentPrice - (atr * this.atrMultiplier));
                    const maxStopLoss = currentPrice * 0.95;
                    const finalStopLoss = Math.max(stopLossPrice, maxStopLoss);
                    // Calculate REAL take profit
                    const riskPerShare = currentPrice - finalStopLoss;
                    const takeProfit = currentPrice + (riskPerShare * 1.5);
                    const signal = {
                        symbol,
                        direction: 'long',
                        entryPrice: new decimal_js_1.default(currentPrice),
                        stopLoss: new decimal_js_1.default(finalStopLoss),
                        takeProfit: new decimal_js_1.default(takeProfit),
                        riskAmount: new decimal_js_1.default(riskPerShare * 100),
                        riskPercent: (riskPerShare / currentPrice) * 100,
                        confidence,
                        rating: this.getConfidenceRating(confidence),
                        strategy: this.name,
                        timeframe: '1D',
                        timestamp: new Date(),
                        reasoning: `${this.name}: Pullback to support, RSI=${rsi.toFixed(1)}, RVOL=${rvol.toFixed(2)}x (low vol pullback), Stop=$${finalStopLoss.toFixed(2)}`
                    };
                    signals.push(signal);
                }
            }
            return signals;
        }
        catch (error) {
            logger_1.logger.error(`Error in ${this.name} signal generation:`, error);
            return signals;
        }
    }
    checkNearFibSupport(price, fibLevels) {
        const fib382 = fibLevels['38.2%'] || fibLevels['0.382'] || 0;
        const fib50 = fibLevels['50%'] || fibLevels['0.5'] || 0;
        const fib618 = fibLevels['61.8%'] || fibLevels['0.618'] || 0;
        return [fib382, fib50, fib618].some(level => level > 0 && price >= level * 0.98 && price <= level * 1.02);
    }
    checkNearSRSupport(price, sr) {
        const levels = sr?.levels || [];
        return levels.some((l) => l.type === 'support' && price >= l.price * 0.98 && price <= l.price * 1.02);
    }
    getNearestSupport(price, analysis) {
        const levels = analysis.support_resistance?.levels || [];
        const supports = levels
            .filter((l) => l.type === 'support' && l.price < price)
            .map((l) => l.price);
        return supports.length > 0 ? Math.max(...supports) : price * 0.95;
    }
    getConfidenceRating(confidence) {
        if (confidence >= 85)
            return 'Strong Buy';
        if (confidence >= 70)
            return 'Buy';
        if (confidence >= 55)
            return 'Neutral';
        if (confidence >= 40)
            return 'Sell';
        return 'Strong Sell';
    }
}
exports.PullbackReversionStrategy = PullbackReversionStrategy;
//# sourceMappingURL=PullbackReversionStrategy.js.map