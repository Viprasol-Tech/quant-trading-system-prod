"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridCompositeStrategy = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const BaseStrategy_1 = require("./BaseStrategy");
const logger_1 = require("../config/logger");
/**
 * Strategy 3: Hybrid Composite
 *
 * Composite scoring with 6 weighted factors:
 * - Trend alignment (25%)
 * - Momentum score (20%)
 * - Volume confirmation (15%)
 * - Pattern detected (15%)
 * - Regime favorability (15%)
 * - Volatility state (10%)
 *
 * Entry when: Composite score > 65 AND regime != 'bear'
 */
class HybridCompositeStrategy extends BaseStrategy_1.BaseStrategy {
    constructor(params) {
        super();
        this.name = 'Hybrid/Composite';
        this.description = 'Adaptive strategy using 6-factor weighted composite scoring';
        this.minCompositeScore = params?.minCompositeScore ?? parseInt(process.env.STRATEGY_3_MIN_SCORE || '65');
        this.atrMultiplier = params?.atrMultiplier ?? parseFloat(process.env.STRATEGY_3_ATR_MULTIPLIER || '2.5');
    }
    generateSignals(analysisResults) {
        const signals = [];
        try {
            for (const [symbol, analysis] of analysisResults) {
                if (!analysis)
                    continue;
                const currentPrice = analysis.current_price || analysis.currentPrice || 0;
                if (currentPrice <= 0)
                    continue;
                const regime = analysis.regime?.classification || analysis.regime?.regime || 'unknown';
                // Skip if bearish regime
                if (regime === 'bear')
                    continue;
                // Calculate weighted scores
                const trendScore = this.calculateTrendScore(analysis);
                const momentumScore = this.calculateMomentumScore(analysis);
                const volumeScore = this.calculateVolumeScore(analysis);
                const patternScore = this.calculatePatternScore(analysis, currentPrice);
                const regimeScore = this.calculateRegimeScore(regime);
                const volatilityScore = this.calculateVolatilityScore(analysis);
                // Weighted composite
                const compositeScore = trendScore * 0.25 +
                    momentumScore * 0.20 +
                    volumeScore * 0.15 +
                    patternScore * 0.15 +
                    regimeScore * 0.15 +
                    volatilityScore * 0.10;
                if (compositeScore >= this.minCompositeScore) {
                    // Calculate REAL stop loss
                    const atr = analysis.volatility?.atr || currentPrice * 0.02;
                    const stopLossPrice = currentPrice - (atr * this.atrMultiplier);
                    const maxStopLoss = currentPrice * 0.95;
                    const finalStopLoss = Math.max(stopLossPrice, maxStopLoss);
                    // Calculate REAL take profit
                    const riskPerShare = currentPrice - finalStopLoss;
                    const takeProfit = currentPrice + (riskPerShare * 2);
                    const signal = {
                        symbol,
                        direction: 'long',
                        entryPrice: new decimal_js_1.default(currentPrice),
                        stopLoss: new decimal_js_1.default(finalStopLoss),
                        takeProfit: new decimal_js_1.default(takeProfit),
                        riskAmount: new decimal_js_1.default(riskPerShare * 100),
                        riskPercent: (riskPerShare / currentPrice) * 100,
                        confidence: Math.round(compositeScore),
                        rating: this.getConfidenceRating(compositeScore),
                        strategy: this.name,
                        timeframe: '1D',
                        timestamp: new Date(),
                        reasoning: `${this.name} score=${compositeScore.toFixed(0)}: T${trendScore.toFixed(0)} M${momentumScore.toFixed(0)} V${volumeScore.toFixed(0)} P${patternScore.toFixed(0)} R${regimeScore.toFixed(0)} Vol${volatilityScore.toFixed(0)}, Stop=$${finalStopLoss.toFixed(2)}`
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
    calculateTrendScore(analysis) {
        const trend = analysis.trend || {};
        let score = 0;
        if (trend.ma_alignment === 'bullish')
            score += 40;
        else if (trend.ma_alignment === 'mixed')
            score += 20;
        if ((trend.ma_50_slope || trend.ma50_slope || 0) > 0)
            score += 20;
        if ((trend.ma_100_slope || trend.ma100_slope || 0) > 0)
            score += 20;
        if ((trend.ma_200_slope || trend.ma200_slope || 0) > 0)
            score += 20;
        return Math.min(100, score);
    }
    calculateMomentumScore(analysis) {
        const momentum = analysis.momentum || {};
        let score = 0;
        const rsi = momentum.rsi || 50;
        if (rsi >= 50 && rsi <= 70)
            score += 40;
        else if (rsi >= 40 && rsi < 50)
            score += 25;
        else if (rsi > 70)
            score += 10;
        if ((momentum.macd || 0) > (momentum.macd_signal || 0))
            score += 30;
        if ((momentum.macd_histogram || 0) > 0)
            score += 30;
        return Math.min(100, score);
    }
    calculateVolumeScore(analysis) {
        const volume = analysis.volume || {};
        let score = 0;
        const rvol = volume.rvol || 1;
        if (rvol > 2)
            score += 50;
        else if (rvol > 1.5)
            score += 40;
        else if (rvol > 1)
            score += 25;
        if ((volume.obv_trend || 0) > 0)
            score += 30;
        if ((volume.mfi || 50) > 50)
            score += 20;
        return Math.min(100, score);
    }
    calculatePatternScore(analysis, price) {
        const patterns = analysis.patterns || {};
        const sr = analysis.support_resistance || {};
        let score = 0;
        if (patterns.bullish_engulfing)
            score += 30;
        if (patterns.hammer)
            score += 25;
        if (patterns.morning_star)
            score += 30;
        if (patterns.double_bottom)
            score += 40;
        // Near support bonus
        const nearSupport = (sr.levels || []).some((l) => l.type === 'support' && price >= l.price * 0.98 && price <= l.price * 1.02);
        if (nearSupport)
            score += 20;
        return Math.min(100, score);
    }
    calculateRegimeScore(regime) {
        switch (regime) {
            case 'bull': return 100;
            case 'recovering': return 75;
            case 'range': return 50;
            case 'bear': return 0;
            default: return 25;
        }
    }
    calculateVolatilityScore(analysis) {
        const atrPercent = analysis.volatility?.atr_percent || 2;
        if (atrPercent < 1.5)
            return 100;
        if (atrPercent < 2.5)
            return 80;
        if (atrPercent < 3.5)
            return 60;
        if (atrPercent < 5)
            return 40;
        return 20;
    }
    getConfidenceRating(score) {
        if (score >= 80)
            return 'Strong Buy';
        if (score >= 65)
            return 'Buy';
        if (score >= 50)
            return 'Neutral';
        if (score >= 35)
            return 'Sell';
        return 'Strong Sell';
    }
}
exports.HybridCompositeStrategy = HybridCompositeStrategy;
//# sourceMappingURL=HybridCompositeStrategy.js.map