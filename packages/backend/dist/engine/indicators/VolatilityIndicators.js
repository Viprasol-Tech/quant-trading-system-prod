"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolatilityIndicators = void 0;
const logger_1 = require("../../config/logger");
class VolatilityIndicators {
    /**
     * Calculate ATR (Average True Range)
     */
    static calculateATR(bars, period = 14) {
        if (period > bars.length) {
            logger_1.logger.warn(`ATR period ${period} exceeds data length ${bars.length}`);
            return [];
        }
        const atr = [];
        const trueRanges = [];
        // Calculate True Range for each bar
        for (let i = 0; i < bars.length; i++) {
            let tr;
            if (i === 0) {
                tr = bars[i].high - bars[i].low;
            }
            else {
                const highLow = bars[i].high - bars[i].low;
                const highPrevClose = Math.abs(bars[i].high - bars[i - 1].close);
                const lowPrevClose = Math.abs(bars[i].low - bars[i - 1].close);
                tr = Math.max(highLow, highPrevClose, lowPrevClose);
            }
            trueRanges.push(tr);
        }
        // Calculate initial ATR (simple average)
        let atrValue = 0;
        for (let i = 0; i < period; i++) {
            atrValue += trueRanges[i];
        }
        atrValue /= period;
        // Push NaN for initial period
        for (let i = 0; i < period - 1; i++) {
            atr.push(NaN);
        }
        atr.push(atrValue);
        // Calculate subsequent ATR values (smoothed)
        for (let i = period; i < trueRanges.length; i++) {
            atrValue = (atrValue * (period - 1) + trueRanges[i]) / period;
            atr.push(atrValue);
        }
        return atr;
    }
    /**
     * Calculate Bollinger Bands
     */
    static calculateBollingerBands(closes, period = 20, stdDev = 2) {
        if (period > closes.length) {
            logger_1.logger.warn(`BB period ${period} exceeds data length ${closes.length}`);
            return [];
        }
        const bands = [];
        const sma = this.calculateSMA(closes, period);
        for (let i = 0; i < closes.length; i++) {
            if (i < period - 1 || isNaN(sma[i])) {
                bands.push({
                    upper: NaN,
                    middle: NaN,
                    lower: NaN,
                    width: NaN,
                    pctB: NaN,
                    bandwidth: NaN
                });
                continue;
            }
            // Calculate standard deviation
            let variance = 0;
            for (let j = i - period + 1; j <= i; j++) {
                variance += Math.pow(closes[j] - sma[i], 2);
            }
            variance /= period;
            const std = Math.sqrt(variance);
            const upper = sma[i] + stdDev * std;
            const lower = sma[i] - stdDev * std;
            const width = upper - lower;
            const bandwidth = width / sma[i];
            // %B: where price is within bands (0-1)
            const pctB = width === 0 ? 0.5 : (closes[i] - lower) / width;
            bands.push({
                upper,
                middle: sma[i],
                lower,
                width,
                pctB,
                bandwidth
            });
        }
        return bands;
    }
    /**
     * Detect Bollinger Band squeeze (low volatility)
     */
    static detectSqueeze(bands, threshold = 0.1) {
        if (bands.length === 0)
            return false;
        const latestBand = bands[bands.length - 1];
        return !isNaN(latestBand.bandwidth) && latestBand.bandwidth < threshold;
    }
    /**
     * Get latest volatility state
     */
    static getVolatilityState(bars, closes, threshold = 0.1) {
        const atrValues = this.calculateATR(bars);
        const bbValues = this.calculateBollingerBands(closes);
        const latestATR = atrValues[atrValues.length - 1] || 0;
        const latestBB = bbValues[bbValues.length - 1];
        const isSqueezing = this.detectSqueeze(bbValues, threshold);
        // Determine volatility regime based on ATR percentile
        const atrPercentile = this.getATRPercentile(atrValues);
        let volatilityRegime = 'normal';
        if (atrPercentile > 0.75) {
            volatilityRegime = 'high';
        }
        else if (atrPercentile < 0.25) {
            volatilityRegime = 'low';
        }
        return {
            atr: latestATR,
            bollingerBands: latestBB,
            isSqueezing,
            volatilityRegime
        };
    }
    /**
     * Get ATR as percentage of close
     */
    static getATRPercent(atr, close) {
        return close === 0 ? 0 : (atr / close) * 100;
    }
    /**
     * Get ATR percentile rank (0-1)
     */
    static getATRPercentile(atrValues) {
        const validATR = atrValues.filter((v) => !isNaN(v));
        if (validATR.length < 2)
            return 0.5;
        const currentATR = validATR[validATR.length - 1];
        const sorted = [...validATR].sort((a, b) => a - b);
        let rank = 0;
        for (const value of sorted) {
            if (value <= currentATR)
                rank++;
        }
        return rank / sorted.length;
    }
    /**
     * Helper: Calculate SMA
     */
    static calculateSMA(prices, period) {
        const sma = [];
        for (let i = 0; i < prices.length; i++) {
            if (i < period - 1) {
                sma.push(NaN);
            }
            else {
                const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                sma.push(sum / period);
            }
        }
        return sma;
    }
}
exports.VolatilityIndicators = VolatilityIndicators;
exports.default = VolatilityIndicators;
//# sourceMappingURL=VolatilityIndicators.js.map