"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Strategy3Hybrid = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
/**
 * Strategy 3: Hybrid Composite
 *
 * Composite scoring with 6 weighted factors:
 * - Trend alignment (25%): All timeframes agree
 * - Momentum score (20%): RSI + MACD combined
 * - Volume confirmation (15%): RVOL + OBV direction
 * - Pattern detected (15%): Any bullish pattern
 * - Regime favorability (15%): Bull or recovering
 * - Volatility state (10%): Not extreme high vol
 *
 * Entry when: Composite score > 65 AND regime != 'bear'
 */
class Strategy3Hybrid {
    constructor() {
        this.name = 'Hybrid Composite';
        this.shortName = 'S3';
    }
    generateSignal(symbol, analysis, currentPrice) {
        // Calculate weighted scores for each factor
        const trendScore = this.calculateTrendScore(analysis);
        const momentumScore = this.calculateMomentumScore(analysis);
        const volumeScore = this.calculateVolumeScore(analysis);
        const patternScore = this.calculatePatternScore(analysis);
        const regimeScore = this.calculateRegimeScore(analysis);
        const volatilityScore = this.calculateVolatilityScore(analysis);
        // Weighted composite score
        const compositeScore = trendScore * 0.25 +
            momentumScore * 0.20 +
            volumeScore * 0.15 +
            patternScore * 0.15 +
            regimeScore * 0.15 +
            volatilityScore * 0.10;
        // Check if regime is bear (disqualifying)
        if (analysis.regime?.classification === 'bear') {
            return null;
        }
        // Entry threshold
        if (compositeScore < 65) {
            return null;
        }
        // Calculate REAL stop loss based on ATR
        const atr = analysis.volatility?.atr || currentPrice * 0.02;
        const atrMultiplier = 2.5;
        const stopLossPrice = currentPrice - (atr * atrMultiplier);
        // Apply 5% max stop loss cap
        const maxStopLoss = currentPrice * 0.95;
        const finalStopLoss = Math.max(stopLossPrice, maxStopLoss);
        // Calculate REAL take profit (2:1 R:R ratio)
        const riskPerShare = currentPrice - finalStopLoss;
        const takeProfit2 = currentPrice + (riskPerShare * 2.0);
        // All conditions met
        return {
            symbol,
            direction: 'long',
            entryPrice: new decimal_js_1.default(currentPrice),
            stopLoss: new decimal_js_1.default(finalStopLoss),
            takeProfit: new decimal_js_1.default(takeProfit2),
            riskAmount: new decimal_js_1.default(riskPerShare * 100),
            riskPercent: ((currentPrice - finalStopLoss) / currentPrice) * 100,
            confidence: Math.round(compositeScore),
            rating: this.scoreToRating(compositeScore),
            strategy: this.name,
            timeframe: 'daily',
            timestamp: new Date(),
            reasoning: `Hybrid composite score ${compositeScore.toFixed(0)}: Trend ${trendScore.toFixed(0)}, Momentum ${momentumScore.toFixed(0)}, Volume ${volumeScore.toFixed(0)}, Pattern ${patternScore.toFixed(0)}, Regime ${regimeScore.toFixed(0)}, Volatility ${volatilityScore.toFixed(0)}`
        };
    }
    calculateTrendScore(analysis) {
        let score = 0;
        if (analysis.trend?.ma_alignment === 'bullish')
            score += 40;
        else if (analysis.trend?.ma_alignment === 'mixed')
            score += 20;
        if ((analysis.trend?.ma_50_slope || 0) > 0)
            score += 20;
        if ((analysis.trend?.ma_100_slope || 0) > 0)
            score += 20;
        if ((analysis.trend?.ma_200_slope || 0) > 0)
            score += 20;
        return Math.min(100, score);
    }
    calculateMomentumScore(analysis) {
        let score = 0;
        // RSI scoring
        const rsi = analysis.momentum?.rsi || 50;
        if (rsi >= 50 && rsi <= 70)
            score += 40;
        else if (rsi >= 40 && rsi < 50)
            score += 25;
        else if (rsi > 70)
            score += 10; // Overbought, lower score
        // MACD scoring
        const macd = analysis.momentum?.macd || 0;
        const macdSignal = analysis.momentum?.macd_signal || 0;
        const macdHistogram = analysis.momentum?.macd_histogram || 0;
        if (macd > macdSignal)
            score += 30; // Bullish crossover
        if (macdHistogram > 0)
            score += 30; // Positive histogram
        return Math.min(100, score);
    }
    calculateVolumeScore(analysis) {
        let score = 0;
        // RVOL scoring
        const rvol = analysis.volume?.rvol || 1;
        if (rvol > 2)
            score += 50;
        else if (rvol > 1.5)
            score += 40;
        else if (rvol > 1)
            score += 25;
        // OBV direction
        if ((analysis.volume?.obv_trend || 0) > 0)
            score += 30;
        // Money flow
        if ((analysis.volume?.mfi || 50) > 50)
            score += 20;
        return Math.min(100, score);
    }
    calculatePatternScore(analysis) {
        let score = 0;
        // Check for bullish patterns
        const patterns = analysis.patterns || {};
        if (patterns.bullish_engulfing)
            score += 30;
        if (patterns.hammer)
            score += 25;
        if (patterns.morning_star)
            score += 30;
        if (patterns.three_white_soldiers)
            score += 35;
        if (patterns.double_bottom)
            score += 40;
        if (patterns.ascending_triangle)
            score += 35;
        // Near support adds to pattern score
        const nearSupport = analysis.support_resistance?.levels?.some((l) => l.type === 'support' &&
            (analysis.currentPrice || 0) >= l.price * 0.98 &&
            (analysis.currentPrice || 0) <= l.price * 1.02);
        if (nearSupport)
            score += 20;
        return Math.min(100, score);
    }
    calculateRegimeScore(analysis) {
        const regime = analysis.regime?.classification || 'unknown';
        switch (regime) {
            case 'bull': return 100;
            case 'recovering': return 75;
            case 'range': return 50;
            case 'bear': return 0;
            default: return 25;
        }
    }
    calculateVolatilityScore(analysis) {
        // Lower volatility = higher score (more predictable)
        const atrPercent = analysis.volatility?.atr_percent || 2;
        if (atrPercent < 1.5)
            return 100;
        if (atrPercent < 2.5)
            return 80;
        if (atrPercent < 3.5)
            return 60;
        if (atrPercent < 5)
            return 40;
        return 20; // High volatility
    }
    scoreToRating(score) {
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
exports.Strategy3Hybrid = Strategy3Hybrid;
exports.default = new Strategy3Hybrid();
//# sourceMappingURL=Strategy3Hybrid.js.map