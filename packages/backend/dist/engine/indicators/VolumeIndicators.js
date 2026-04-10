"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VolumeIndicators = void 0;
const logger_1 = require("../../config/logger");
class VolumeIndicators {
    /**
     * Calculate Relative Volume (RVOL)
     * Current volume / Average volume of previous periods
     */
    static calculateRelativeVolume(volumes, period = 20) {
        if (period > volumes.length) {
            logger_1.logger.warn(`RVOL period ${period} exceeds data length ${volumes.length}`);
            return [];
        }
        const rvol = [];
        const avgVolumes = this.calculateMovingAverage(volumes, period);
        for (let i = 0; i < volumes.length; i++) {
            if (isNaN(avgVolumes[i]) || avgVolumes[i] === 0) {
                rvol.push(NaN);
            }
            else {
                rvol.push(volumes[i] / avgVolumes[i]);
            }
        }
        return rvol;
    }
    /**
     * Calculate OBV (On-Balance Volume)
     * Cumulative volume indicator that adds/subtracts volume based on price direction
     */
    static calculateOBV(bars) {
        const obv = [];
        let cumulativeVolume = 0;
        for (let i = 0; i < bars.length; i++) {
            if (i === 0) {
                cumulativeVolume = bars[i].volume;
            }
            else {
                if (bars[i].close > bars[i - 1].close) {
                    cumulativeVolume += bars[i].volume;
                }
                else if (bars[i].close < bars[i - 1].close) {
                    cumulativeVolume -= bars[i].volume;
                }
                // If close == previous close, no change
            }
            obv.push(cumulativeVolume);
        }
        return obv;
    }
    /**
     * Determine OBV trend direction
     */
    static getOBVTrend(obv, lookback = 10) {
        if (obv.length < lookback)
            return 'neutral';
        const recentOBV = obv.slice(-lookback);
        let upDays = 0;
        let downDays = 0;
        for (let i = 1; i < recentOBV.length; i++) {
            if (recentOBV[i] > recentOBV[i - 1]) {
                upDays++;
            }
            else if (recentOBV[i] < recentOBV[i - 1]) {
                downDays++;
            }
        }
        if (upDays > downDays * 1.5) {
            return 'accumulation';
        }
        else if (downDays > upDays * 1.5) {
            return 'distribution';
        }
        return 'neutral';
    }
    /**
     * Calculate Buyer vs Seller Pressure
     * Based on close position within the bar and volume
     */
    static calculatePressure(bars) {
        const pressure = [];
        for (const bar of bars) {
            const range = bar.high - bar.low;
            const closePosition = range === 0 ? 0.5 : (bar.close - bar.low) / range;
            // Close near high = buyer pressure
            // Close near low = seller pressure
            const buyerPressure = closePosition * bar.volume;
            const sellerPressure = (1 - closePosition) * bar.volume;
            pressure.push({ buyerPressure, sellerPressure });
        }
        return pressure;
    }
    /**
     * Get current volume confirmation signal
     */
    static getVolumeConfirmation(bars, priceDirection) {
        if (bars.length < 2)
            return 'Insufficient data';
        const currentBar = bars[bars.length - 1];
        const previousBar = bars[bars.length - 2];
        const avgVolume = bars.slice(-20).reduce((sum, bar) => sum + bar.volume, 0) / 20;
        const rvol = currentBar.volume / avgVolume;
        const volumeIncreasing = currentBar.volume > previousBar.volume;
        if (priceDirection === 'up' && volumeIncreasing && rvol > 1.5) {
            return 'Strong volume confirmation of uptrend';
        }
        else if (priceDirection === 'down' && volumeIncreasing && rvol > 1.5) {
            return 'Strong volume confirmation of downtrend';
        }
        else if (priceDirection === 'up' && volumeIncreasing) {
            return 'Volume confirms uptrend';
        }
        else if (priceDirection === 'down' && volumeIncreasing) {
            return 'Volume confirms downtrend';
        }
        else if (priceDirection === 'up' && !volumeIncreasing) {
            return 'Weak volume on uptrend - caution';
        }
        else if (priceDirection === 'down' && !volumeIncreasing) {
            return 'Weak volume on downtrend - possible reversal';
        }
        return 'Neutral volume';
    }
    /**
     * Calculate Average Volume
     */
    static calculateAverageVolume(bars, period = 20) {
        if (bars.length < period) {
            return bars.reduce((sum, bar) => sum + bar.volume, 0) / bars.length;
        }
        return bars.slice(-period).reduce((sum, bar) => sum + bar.volume, 0) / period;
    }
    /**
     * Detect Volume Divergence
     * Price making higher high but volume declining
     */
    static detectVolumeDivergence(bars, lookback = 20) {
        if (bars.length < lookback)
            return null;
        const recentBars = bars.slice(-lookback);
        // Check price trend
        const prices = recentBars.map((b) => b.high);
        const volumes = recentBars.map((b) => b.volume);
        // Simple trend: compare first half and second half
        const firstHalfAvgPrice = prices.slice(0, Math.floor(prices.length / 2)).reduce((a, b) => a + b) / Math.floor(prices.length / 2);
        const secondHalfAvgPrice = prices.slice(Math.floor(prices.length / 2)).reduce((a, b) => a + b) / Math.ceil(prices.length / 2);
        const firstHalfAvgVolume = volumes.slice(0, Math.floor(volumes.length / 2)).reduce((a, b) => a + b) / Math.floor(volumes.length / 2);
        const secondHalfAvgVolume = volumes.slice(Math.floor(volumes.length / 2)).reduce((a, b) => a + b) / Math.ceil(volumes.length / 2);
        // Bullish divergence: price up, volume down
        if (secondHalfAvgPrice > firstHalfAvgPrice && secondHalfAvgVolume < firstHalfAvgVolume) {
            return 'bullish';
        }
        // Bearish divergence: price down, volume down
        if (secondHalfAvgPrice < firstHalfAvgPrice && secondHalfAvgVolume < firstHalfAvgVolume) {
            return 'bearish';
        }
        return null;
    }
    /**
     * Calculate moving average (helper)
     */
    static calculateMovingAverage(values, period) {
        const ma = [];
        for (let i = 0; i < values.length; i++) {
            if (i < period - 1) {
                ma.push(NaN);
            }
            else {
                const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                ma.push(sum / period);
            }
        }
        return ma;
    }
    /**
     * Get volume state
     */
    static getVolumeState(bars, priceDirection) {
        const rvol = this.calculateRelativeVolume(bars.map((b) => b.volume));
        const obv = this.calculateOBV(bars);
        const pressure = this.calculatePressure(bars);
        const latestRVOL = rvol[rvol.length - 1] || 1;
        const latestPressure = pressure[pressure.length - 1];
        return {
            relativeVolume: latestRVOL,
            obvTrend: this.getOBVTrend(obv),
            buyerPressure: latestPressure.buyerPressure,
            sellerPressure: latestPressure.sellerPressure,
            volumeConfirmation: this.getVolumeConfirmation(bars, priceDirection)
        };
    }
}
exports.VolumeIndicators = VolumeIndicators;
exports.default = VolumeIndicators;
//# sourceMappingURL=VolumeIndicators.js.map