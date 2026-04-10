"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TechnicalAnalysisEngine = void 0;
const logger_1 = require("../config/logger");
const TrendIndicators_1 = require("./indicators/TrendIndicators");
const MomentumIndicators_1 = require("./indicators/MomentumIndicators");
const VolatilityIndicators_1 = require("./indicators/VolatilityIndicators");
const VolumeIndicators_1 = require("./indicators/VolumeIndicators");
const FibonacciIndicators_1 = require("./indicators/FibonacciIndicators");
const SupportResistance_1 = require("./patterns/SupportResistance");
const RegimeDetection_1 = require("./regime/RegimeDetection");
class TechnicalAnalysisEngine {
    /**
     * Comprehensive technical analysis on a single timeframe
     */
    static analyze(bars, symbol) {
        if (bars.length < 100) {
            logger_1.logger.warn(`Insufficient data for ${symbol}: ${bars.length} bars`);
            throw new Error(`Minimum 100 bars required, got ${bars.length}`);
        }
        const timestamp = bars[bars.length - 1].timestamp;
        const closes = bars.map((b) => b.close);
        const currentPrice = closes[closes.length - 1];
        logger_1.logger.info(`Analyzing ${symbol} with ${bars.length} bars`);
        // Calculate all indicators
        const maValues = TrendIndicators_1.TrendIndicators.calculateMovingAverages(closes);
        const latestMA = TrendIndicators_1.TrendIndicators.getLatestMAs(closes);
        const trendAlignment = TrendIndicators_1.TrendIndicators.getTrendAlignment(closes);
        const rsiValues = MomentumIndicators_1.MomentumIndicators.calculateRSI(closes);
        const latestRSI = rsiValues[rsiValues.length - 1] || 50;
        const rsiState = MomentumIndicators_1.MomentumIndicators.interpretRSI(latestRSI);
        const macd = MomentumIndicators_1.MomentumIndicators.calculateMACD(closes);
        const latestMACD = macd.macd[macd.macd.length - 1] || 0;
        const latestSignal = macd.signal[macd.signal.length - 1] || 0;
        const latestHistogram = macd.histogram[macd.histogram.length - 1] || 0;
        const macdState = MomentumIndicators_1.MomentumIndicators.interpretMACD(latestMACD, latestSignal, latestHistogram);
        const atrValues = VolatilityIndicators_1.VolatilityIndicators.calculateATR(bars);
        const latestATR = atrValues[atrValues.length - 1] || 0;
        const volatilityState = VolatilityIndicators_1.VolatilityIndicators.getVolatilityState(bars, closes);
        const priceDirection = currentPrice > closes[Math.max(0, closes.length - 5)] ? 'up' :
            currentPrice < closes[Math.max(0, closes.length - 5)] ? 'down' :
                'neutral';
        const volumeState = VolumeIndicators_1.VolumeIndicators.getVolumeState(bars, priceDirection);
        const adxValues = RegimeDetection_1.RegimeDetection.calculateADX(bars);
        const latestADX = adxValues[adxValues.length - 1] || 0;
        const regimeState = RegimeDetection_1.RegimeDetection.getRegimeState(bars, currentPrice, latestMA.ma50, latestMA.ma100, latestMA.ma200, atrValues, adxValues, latestRSI);
        // Support/Resistance
        const pivots = SupportResistance_1.SupportResistanceAnalysis.detectPivots(bars);
        const srLevels = SupportResistance_1.SupportResistanceAnalysis.detectSRLevels(pivots);
        // Fibonacci
        let fibonacciLevels;
        const swingPoints = FibonacciIndicators_1.FibonacciIndicators.detectSwingPoints(bars, atrValues);
        if (swingPoints.length >= 2) {
            const lastSwingHigh = swingPoints.filter((s) => s.type === 'high').pop();
            const lastSwingLow = swingPoints.filter((s) => s.type === 'low').pop();
            if (lastSwingHigh && lastSwingLow) {
                fibonacciLevels = FibonacciIndicators_1.FibonacciIndicators.calculateFibonacciLevels(lastSwingHigh.price, lastSwingLow.price);
            }
        }
        // Calculate confidence score
        const confidenceScore = this.calculateConfidenceScore({
            trendAlignment,
            rsiState,
            macdState,
            volumeState,
            regimeState,
            srLevels,
            currentPrice
        });
        // Generate rating
        const rating = this.getRating(confidenceScore);
        // Generate narrative
        const narrative = this.generateNarrative({
            symbol,
            currentPrice,
            trendAlignment,
            rsiState,
            macdState,
            volumeState,
            regimeState,
            confidenceScore
        });
        return {
            symbol,
            timestamp,
            price: currentPrice,
            trendAlignment,
            rsiState,
            macdState,
            volatilityState,
            volumeState,
            regimeState,
            srLevels,
            fibonacciLevels,
            confidenceScore,
            rating,
            narrative
        };
    }
    /**
     * Calculate confidence score (0-100)
     */
    static calculateConfidenceScore(params) {
        let score = 50; // Base score
        // Trend alignment (30 points)
        if (params.trendAlignment.alignment === 'strong_bullish') {
            score += 30;
        }
        else if (params.trendAlignment.alignment === 'bullish') {
            score += 20;
        }
        else if (params.trendAlignment.alignment === 'strong_bearish') {
            score -= 30;
        }
        else if (params.trendAlignment.alignment === 'bearish') {
            score -= 20;
        }
        // Momentum (20 points)
        if (params.macdState.bullish) {
            score += 15;
        }
        else {
            score -= 15;
        }
        if (params.rsiState.signal === 'oversold') {
            score += 10;
        }
        else if (params.rsiState.signal === 'overbought') {
            score -= 10;
        }
        // Volume (15 points)
        if (params.volumeState.relativeVolume > 1.5) {
            score += 10;
        }
        if (params.volumeState.obvTrend === 'accumulation') {
            score += 10;
        }
        else if (params.volumeState.obvTrend === 'distribution') {
            score -= 10;
        }
        // Regime (15 points)
        if (params.regimeState.marketRegime === 'bull') {
            score += 15;
        }
        else if (params.regimeState.marketRegime === 'bear') {
            score -= 15;
        }
        // S/R proximity (10 points)
        const support = SupportResistance_1.SupportResistanceAnalysis.findNearestSupport(params.currentPrice, params.srLevels);
        const resistance = SupportResistance_1.SupportResistanceAnalysis.findNearestResistance(params.currentPrice, params.srLevels);
        if (support && (params.currentPrice - support.price) / params.currentPrice < 0.02) {
            score += 5;
        }
        if (resistance && (resistance.price - params.currentPrice) / params.currentPrice > 0.05) {
            score += 5;
        }
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Convert score to rating
     */
    static getRating(score) {
        if (score >= 80)
            return 'Strong Buy';
        if (score >= 60)
            return 'Buy';
        if (score >= 40)
            return 'Neutral';
        if (score >= 20)
            return 'Sell';
        return 'Strong Sell';
    }
    /**
     * Generate plain-English narrative
     */
    static generateNarrative(params) {
        const parts = [];
        parts.push(`${params.symbol} at $${params.currentPrice.toFixed(2)}`);
        // Trend
        parts.push(`Trend: ${params.trendAlignment.alignment.replace(/_/g, ' ')}`);
        // Momentum
        parts.push(`Momentum: ${params.rsiState.interpretation}`);
        parts.push(`MACD: ${params.macdState.interpretation}`);
        // Volume
        parts.push(`${params.volumeState.volumeConfirmation}`);
        // Regime
        parts.push(`Regime: ${params.regimeState.interpretation}`);
        // Confidence
        parts.push(`Confidence: ${params.confidenceScore.toFixed(0)}/100`);
        return parts.join(' | ');
    }
}
exports.TechnicalAnalysisEngine = TechnicalAnalysisEngine;
exports.default = TechnicalAnalysisEngine;
//# sourceMappingURL=TechnicalAnalysisEngine.js.map