"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MomentumIndicators = void 0;
const logger_1 = require("../../config/logger");
class MomentumIndicators {
    /**
     * Calculate RSI (Relative Strength Index)
     */
    static calculateRSI(closes, period = 14) {
        if (period > closes.length) {
            logger_1.logger.warn(`RSI period ${period} exceeds data length ${closes.length}`);
            return [];
        }
        const rsi = [];
        const deltas = [];
        // Calculate price changes
        for (let i = 1; i < closes.length; i++) {
            deltas.push(closes[i] - closes[i - 1]);
        }
        let gains = 0;
        let losses = 0;
        // First average gain/loss
        for (let i = 0; i < period; i++) {
            const delta = deltas[i];
            if (delta > 0) {
                gains += delta;
            }
            else {
                losses += Math.abs(delta);
            }
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;
        // Push NaN for initial period
        for (let i = 0; i < period; i++) {
            rsi.push(NaN);
        }
        // Calculate RSI for remaining values
        for (let i = period; i < deltas.length; i++) {
            const delta = deltas[i];
            if (delta > 0) {
                avgGain = (avgGain * (period - 1) + delta) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            }
            else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) + Math.abs(delta)) / period;
            }
            const rs = avgGain / (avgLoss === 0 ? 1 : avgLoss);
            const rsiValue = 100 - 100 / (1 + rs);
            rsi.push(rsiValue);
        }
        return rsi;
    }
    /**
     * Interpret RSI value
     */
    static interpretRSI(rsi, overbought = 70, oversold = 30) {
        let signal = 'normal';
        let interpretation = `RSI at ${rsi.toFixed(2)}`;
        if (rsi > overbought) {
            signal = 'overbought';
            interpretation = `Overbought at ${rsi.toFixed(2)} - potential pullback`;
        }
        else if (rsi < oversold) {
            signal = 'oversold';
            interpretation = `Oversold at ${rsi.toFixed(2)} - potential bounce`;
        }
        else if (rsi > 60) {
            interpretation = `Strong momentum at ${rsi.toFixed(2)}`;
        }
        else if (rsi < 40) {
            interpretation = `Weak momentum at ${rsi.toFixed(2)}`;
        }
        return { value: rsi, interpretation, signal };
    }
    /**
     * Calculate MACD (Moving Average Convergence Divergence)
     */
    static calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
        // Calculate EMAs
        const ema12 = this.calculateEMA(closes, fast);
        const ema26 = this.calculateEMA(closes, slow);
        // Calculate MACD line
        const macdLine = [];
        for (let i = 0; i < ema12.length; i++) {
            if (!isNaN(ema12[i]) && !isNaN(ema26[i])) {
                macdLine.push(ema12[i] - ema26[i]);
            }
            else {
                macdLine.push(NaN);
            }
        }
        // Calculate signal line (EMA of MACD)
        const signalLine = this.calculateEMA(macdLine.filter((v) => !isNaN(v)), signal);
        // Pad signal line with NaN
        const paddedSignal = [];
        let signalIndex = 0;
        for (let i = 0; i < macdLine.length; i++) {
            if (isNaN(macdLine[i])) {
                paddedSignal.push(NaN);
            }
            else {
                paddedSignal.push(signalLine[signalIndex] || NaN);
                signalIndex++;
            }
        }
        // Calculate histogram
        const histogram = [];
        for (let i = 0; i < macdLine.length; i++) {
            if (!isNaN(macdLine[i]) && !isNaN(paddedSignal[i])) {
                histogram.push(macdLine[i] - paddedSignal[i]);
            }
            else {
                histogram.push(NaN);
            }
        }
        return {
            macd: macdLine,
            signal: paddedSignal,
            histogram
        };
    }
    /**
     * Interpret MACD state
     */
    static interpretMACD(macd, signal, histogram) {
        const bullish = histogram > 0 && macd > signal;
        let interpretation = '';
        if (histogram > 0 && macd > signal) {
            interpretation = 'Bullish - MACD above signal, histogram positive';
        }
        else if (histogram < 0 && macd < signal) {
            interpretation = 'Bearish - MACD below signal, histogram negative';
        }
        else if (histogram > 0 && macd < signal) {
            interpretation = 'Momentum weakening - histogram still positive but MACD below signal';
        }
        else if (histogram < 0 && macd > signal) {
            interpretation = 'Momentum recovering - histogram still negative but MACD above signal';
        }
        return {
            macd,
            signal,
            histogram,
            interpretation,
            bullish
        };
    }
    /**
     * Detect bullish divergence (price lower, indicator higher)
     */
    static detectBullishDivergence(bars, indicator, lookback = 30) {
        if (bars.length < lookback || indicator.length !== bars.length) {
            return null;
        }
        const recentBars = bars.slice(-lookback);
        const recentIndicator = indicator.slice(-lookback);
        // Find two local lows in price
        let priceLowest1 = recentBars[0];
        let priceLowest1Idx = 0;
        let priceLowest2 = recentBars[recentBars.length - 1];
        let priceLowest2Idx = recentBars.length - 1;
        for (let i = 1; i < recentBars.length - 1; i++) {
            if (recentBars[i].low < recentBars[i - 1].low && recentBars[i].low < recentBars[i + 1].low) {
                if (recentBars[i].low < priceLowest1.low) {
                    priceLowest2 = priceLowest1;
                    priceLowest2Idx = priceLowest1Idx;
                    priceLowest1 = recentBars[i];
                    priceLowest1Idx = i;
                }
            }
        }
        // Check if indicator values are higher at the second low (bullish divergence)
        const ind1 = recentIndicator[priceLowest1Idx];
        const ind2 = recentIndicator[priceLowest2Idx];
        if (priceLowest2.low < priceLowest1.low &&
            !isNaN(ind1) &&
            !isNaN(ind2) &&
            ind2 > ind1) {
            return {
                type: 'bullish',
                bar: bars.length - 1,
                timestamp: bars[bars.length - 1].timestamp,
                priceLevel1: priceLowest1.low,
                priceLevel2: priceLowest2.low,
                indicatorLevel1: ind1,
                indicatorLevel2: ind2
            };
        }
        return null;
    }
    /**
     * Detect bearish divergence (price higher, indicator lower)
     */
    static detectBearishDivergence(bars, indicator, lookback = 30) {
        if (bars.length < lookback || indicator.length !== bars.length) {
            return null;
        }
        const recentBars = bars.slice(-lookback);
        const recentIndicator = indicator.slice(-lookback);
        // Find two local highs in price
        let priceHighest1 = recentBars[0];
        let priceHighest1Idx = 0;
        let priceHighest2 = recentBars[recentBars.length - 1];
        let priceHighest2Idx = recentBars.length - 1;
        for (let i = 1; i < recentBars.length - 1; i++) {
            if (recentBars[i].high > recentBars[i - 1].high && recentBars[i].high > recentBars[i + 1].high) {
                if (recentBars[i].high > priceHighest1.high) {
                    priceHighest2 = priceHighest1;
                    priceHighest2Idx = priceHighest1Idx;
                    priceHighest1 = recentBars[i];
                    priceHighest1Idx = i;
                }
            }
        }
        // Check if indicator values are lower at the second high (bearish divergence)
        const ind1 = recentIndicator[priceHighest1Idx];
        const ind2 = recentIndicator[priceHighest2Idx];
        if (priceHighest2.high > priceHighest1.high &&
            !isNaN(ind1) &&
            !isNaN(ind2) &&
            ind2 < ind1) {
            return {
                type: 'bearish',
                bar: bars.length - 1,
                timestamp: bars[bars.length - 1].timestamp,
                priceLevel1: priceHighest1.high,
                priceLevel2: priceHighest2.high,
                indicatorLevel1: ind1,
                indicatorLevel2: ind2
            };
        }
        return null;
    }
    /**
     * Calculate EMA (helper)
     */
    static calculateEMA(values, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        // Find first valid value for initial EMA
        let sum = 0;
        let count = 0;
        for (let i = 0; i < Math.min(period, values.length); i++) {
            if (!isNaN(values[i])) {
                sum += values[i];
                count++;
            }
        }
        if (count === 0)
            return [];
        let currentEMA = sum / count;
        for (let i = 0; i < values.length; i++) {
            if (isNaN(values[i]))
                continue;
            currentEMA = (values[i] - currentEMA) * multiplier + currentEMA;
            ema.push(currentEMA);
        }
        return ema;
    }
}
exports.MomentumIndicators = MomentumIndicators;
exports.default = MomentumIndicators;
//# sourceMappingURL=MomentumIndicators.js.map