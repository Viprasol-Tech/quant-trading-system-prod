"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportResistanceAnalysis = void 0;
const logger_1 = require("../../config/logger");
class SupportResistanceAnalysis {
    /**
     * Detect pivot points (local highs and lows)
     */
    static detectPivots(bars, leftBars = 5, rightBars = 5) {
        const pivots = [];
        if (bars.length < leftBars + rightBars + 1) {
            logger_1.logger.warn('Insufficient data for pivot detection');
            return pivots;
        }
        for (let i = leftBars; i < bars.length - rightBars; i++) {
            let isHigh = true;
            let isLow = true;
            // Check left side
            for (let j = i - leftBars; j < i; j++) {
                if (bars[j].high > bars[i].high)
                    isHigh = false;
                if (bars[j].low < bars[i].low)
                    isLow = false;
            }
            // Check right side
            for (let j = i + 1; j <= i + rightBars; j++) {
                if (bars[j].high > bars[i].high)
                    isHigh = false;
                if (bars[j].low < bars[i].low)
                    isLow = false;
            }
            if (isHigh) {
                pivots.push({
                    index: i,
                    timestamp: bars[i].timestamp,
                    price: bars[i].high,
                    type: 'high'
                });
            }
            if (isLow) {
                pivots.push({
                    index: i,
                    timestamp: bars[i].timestamp,
                    price: bars[i].low,
                    type: 'low'
                });
            }
        }
        return pivots;
    }
    /**
     * Detect support and resistance levels
     */
    static detectSRLevels(pivots, nLevels = 5, tolerance = 0.015) {
        const srLevels = [];
        if (pivots.length < 2) {
            return srLevels;
        }
        // Cluster similar pivot prices
        const clusters = [];
        for (const pivot of pivots) {
            let foundCluster = false;
            for (const cluster of clusters) {
                const clusterAvg = cluster.reduce((sum, p) => sum + p.price, 0) / cluster.length;
                const percentDiff = Math.abs(pivot.price - clusterAvg) / clusterAvg;
                if (percentDiff < tolerance) {
                    cluster.push(pivot);
                    foundCluster = true;
                    break;
                }
            }
            if (!foundCluster) {
                clusters.push([pivot]);
            }
        }
        // Score each cluster
        for (const cluster of clusters) {
            const avgPrice = cluster.reduce((sum, p) => sum + p.price, 0) / cluster.length;
            const touches = cluster.length;
            // Determine if support or resistance based on cluster composition
            const highs = cluster.filter((p) => p.type === 'high').length;
            const lows = cluster.filter((p) => p.type === 'low').length;
            const type = lows > highs ? 'support' : 'resistance';
            // Score: more touches = higher strength
            const strength = Math.min(100, touches * 15);
            srLevels.push({
                price: avgPrice,
                type,
                strength,
                touches,
                proximity: cluster.map((p) => p.price)
            });
        }
        // Sort by strength and return top N
        return srLevels.sort((a, b) => b.strength - a.strength).slice(0, nLevels);
    }
    /**
     * Calculate classic pivot points
     */
    static calculatePivotPoints(bar) {
        const pivot = (bar.high + bar.low + bar.close) / 3;
        const range = bar.high - bar.low;
        return {
            pivot,
            r1: pivot * 2 - bar.low,
            r2: pivot + range,
            s1: pivot * 2 - bar.high,
            s2: pivot - range
        };
    }
    /**
     * Check if price is near a support/resistance level
     */
    static isPriceNearLevel(price, level, tolerance = 0.01) {
        const percentDistance = Math.abs(price - level) / level;
        return percentDistance < tolerance;
    }
    /**
     * Find nearest support below price
     */
    static findNearestSupport(price, srLevels, maxDistance = 0.05 // 5%
    ) {
        const supports = srLevels
            .filter((level) => level.type === 'support' && level.price < price)
            .sort((a, b) => b.price - a.price);
        if (supports.length === 0) {
            return null;
        }
        const nearest = supports[0];
        const percentDistance = (price - nearest.price) / price;
        if (percentDistance < maxDistance) {
            return nearest;
        }
        return null;
    }
    /**
     * Find nearest resistance above price
     */
    static findNearestResistance(price, srLevels, maxDistance = 0.05 // 5%
    ) {
        const resistances = srLevels
            .filter((level) => level.type === 'resistance' && level.price > price)
            .sort((a, b) => a.price - b.price);
        if (resistances.length === 0) {
            return null;
        }
        const nearest = resistances[0];
        const percentDistance = (nearest.price - price) / price;
        if (percentDistance < maxDistance) {
            return nearest;
        }
        return null;
    }
    /**
     * Analyze price position relative to SR levels
     */
    static analyzePricePosition(price, srLevels) {
        const support = this.findNearestSupport(price, srLevels);
        const resistance = this.findNearestResistance(price, srLevels);
        let position = 'between';
        if (!resistance) {
            position = 'above_resistance';
        }
        else if (!support) {
            position = 'below_support';
        }
        return { support, resistance, position };
    }
}
exports.SupportResistanceAnalysis = SupportResistanceAnalysis;
exports.default = SupportResistanceAnalysis;
//# sourceMappingURL=SupportResistance.js.map