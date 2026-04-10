"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegimeDetection = void 0;
const logger_1 = require("../../config/logger");
class RegimeDetection {
    /**
     * Classify market regime: Bull / Bear / Range
     */
    static classifyMarketRegime(price, ma50, ma100, ma200, adx = 0) {
        // Bull regime: price > 200 MA AND 50 > 100 > 200 AND ADX > 20
        if (price > ma200 && ma50 > ma100 && ma100 > ma200 && adx > 20) {
            return 'bull';
        }
        // Bear regime: price < 200 MA AND 50 < 100 < 200 AND ADX > 20
        if (price < ma200 && ma50 < ma100 && ma100 < ma200 && adx > 20) {
            return 'bear';
        }
        // Range: everything else when ADX < 20
        if (adx < 20) {
            return 'range';
        }
        // Transition: conditions don't clearly meet bull/bear
        return 'transition';
    }
    /**
     * Calculate ADX (Average Directional Index)
     * Measures trend strength from 0-100
     */
    static calculateADX(bars, period = 14) {
        if (period > bars.length) {
            logger_1.logger.warn(`ADX period ${period} exceeds data length ${bars.length}`);
            return [];
        }
        const adx = [];
        const plusDM = [];
        const minusDM = [];
        const trueRange = [];
        // Calculate true range and directional movements
        for (let i = 0; i < bars.length; i++) {
            let tr;
            if (i === 0) {
                tr = bars[i].high - bars[i].low;
                plusDM.push(0);
                minusDM.push(0);
            }
            else {
                const highLow = bars[i].high - bars[i].low;
                const highClose = Math.abs(bars[i].high - bars[i - 1].close);
                const lowClose = Math.abs(bars[i].low - bars[i - 1].close);
                tr = Math.max(highLow, highClose, lowClose);
                // Plus DM
                const upMove = bars[i].high - bars[i - 1].high;
                const downMove = bars[i - 1].low - bars[i].low;
                let pDM = 0;
                let mDM = 0;
                if (upMove > downMove && upMove > 0) {
                    pDM = upMove;
                }
                if (downMove > upMove && downMove > 0) {
                    mDM = downMove;
                }
                plusDM.push(pDM);
                minusDM.push(mDM);
            }
            trueRange.push(tr);
        }
        // Calculate DI+ and DI-
        let atrSum = trueRange.slice(0, period).reduce((a, b) => a + b, 0);
        let pDMSum = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
        let mDMSum = minusDM.slice(0, period).reduce((a, b) => a + b, 0);
        let diPlus = (pDMSum / atrSum) * 100;
        let diMinus = (mDMSum / atrSum) * 100;
        // Calculate DX
        const dx = Array(period - 1).fill(NaN);
        for (let i = period - 1; i < bars.length; i++) {
            const diDiff = Math.abs(diPlus - diMinus);
            const diSum = diPlus + diMinus;
            const dxValue = diSum === 0 ? 0 : (diDiff / diSum) * 100;
            dx.push(dxValue);
            // Update smoothed values
            if (i > period) {
                atrSum = atrSum - trueRange[i - period] + trueRange[i];
                pDMSum = pDMSum - plusDM[i - period] + plusDM[i];
                mDMSum = mDMSum - minusDM[i - period] + minusDM[i];
                diPlus = (pDMSum / atrSum) * 100;
                diMinus = (mDMSum / atrSum) * 100;
            }
        }
        // Calculate ADX (smoothed DX)
        let adxValue = dx.slice(period, period * 2).filter((v) => !isNaN(v)).reduce((a, b) => a + b, 0) / period;
        for (let i = 0; i < period * 2; i++) {
            adx.push(NaN);
        }
        adx.push(adxValue);
        for (let i = period * 2 + 1; i < dx.length; i++) {
            if (!isNaN(dx[i])) {
                adxValue = (adxValue * (period - 1) + dx[i]) / period;
                adx.push(adxValue);
            }
            else {
                adx.push(NaN);
            }
        }
        return adx;
    }
    /**
     * Classify volatility regime
     */
    static classifyVolatilityRegime(currentATR, atrValues, lookback = 252) {
        if (atrValues.length < lookback) {
            logger_1.logger.warn(`Insufficient data for volatility regime (need ${lookback}, have ${atrValues.length})`);
            return 'normal';
        }
        const validATR = atrValues.filter((v) => !isNaN(v));
        if (validATR.length === 0) {
            return 'normal';
        }
        // Calculate percentile
        const sorted = [...validATR].sort((a, b) => a - b);
        const percentile = sorted.indexOf(sorted.find((v) => v >= currentATR) || sorted[sorted.length - 1]) / sorted.length;
        if (percentile > 0.75) {
            return 'high';
        }
        else if (percentile < 0.25) {
            return 'low';
        }
        return 'normal';
    }
    /**
     * Calculate trend strength (0-100)
     */
    static calculateTrendStrength(adx, rsi, maAlignment) {
        let strength = 0;
        // ADX contribution (0-40 points)
        if (adx > 25) {
            strength += Math.min(40, (adx / 50) * 40);
        }
        // RSI contribution (0-30 points)
        // Strong if RSI not overbought/oversold
        if (rsi > 40 && rsi < 70) {
            strength += 30;
        }
        else if (rsi > 50 && rsi < 70) {
            strength += 20;
        }
        // MA alignment contribution (0-30 points)
        if (maAlignment) {
            strength += 30;
        }
        return Math.min(100, strength);
    }
    /**
     * Get complete regime state
     */
    static getRegimeState(bars, price, ma50, ma100, ma200, atrValues, adxValues, rsi) {
        const currentATR = atrValues[atrValues.length - 1] || 0;
        const currentADX = adxValues[adxValues.length - 1] || 0;
        const marketRegime = this.classifyMarketRegime(price, ma50, ma100, ma200, currentADX);
        const volatilityRegime = this.classifyVolatilityRegime(currentATR, atrValues);
        const maAlignment = (marketRegime === 'bull') || (marketRegime === 'bear');
        const trendStrength = this.calculateTrendStrength(currentADX, rsi, maAlignment);
        // Confidence based on ADX and consistency
        const confidence = Math.max(0, Math.min(100, currentADX + (maAlignment ? 20 : 0)));
        let interpretation = '';
        if (marketRegime === 'bull') {
            interpretation = `Bullish trend with ${volatilityRegime} volatility. ADX: ${currentADX.toFixed(0)}, RSI: ${rsi.toFixed(0)}`;
        }
        else if (marketRegime === 'bear') {
            interpretation = `Bearish trend with ${volatilityRegime} volatility. ADX: ${currentADX.toFixed(0)}, RSI: ${rsi.toFixed(0)}`;
        }
        else if (marketRegime === 'range') {
            interpretation = `Range-bound market with ${volatilityRegime} volatility. No strong directional bias.`;
        }
        else {
            interpretation = `Transitional regime - unclear direction.`;
        }
        return {
            marketRegime,
            volatilityRegime,
            trendStrength,
            confidence,
            interpretation
        };
    }
}
exports.RegimeDetection = RegimeDetection;
exports.default = RegimeDetection;
//# sourceMappingURL=RegimeDetection.js.map