"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataPreprocessor = void 0;
const logger_1 = require("../config/logger");
class DataPreprocessor {
    /**
     * Resample daily data to weekly
     */
    static dailyToWeekly(dailyData) {
        if (dailyData.length === 0)
            return [];
        const weekly = [];
        let currentWeek = [];
        for (const bar of dailyData) {
            const dayOfWeek = bar.timestamp.getDay();
            // Friday (5) is end of week for US markets
            if (dayOfWeek === 5 || bar === dailyData[dailyData.length - 1]) {
                currentWeek.push(bar);
                if (currentWeek.length > 0) {
                    const weekBar = DataPreprocessor.aggregateBars(currentWeek);
                    weekly.push(weekBar);
                }
                currentWeek = [];
            }
            else if (dayOfWeek === 1 && currentWeek.length > 0) {
                // Monday: start new week
                const weekBar = DataPreprocessor.aggregateBars(currentWeek);
                weekly.push(weekBar);
                currentWeek = [bar];
            }
            else {
                currentWeek.push(bar);
            }
        }
        // Handle remaining bars
        if (currentWeek.length > 0) {
            const weekBar = DataPreprocessor.aggregateBars(currentWeek);
            weekly.push(weekBar);
        }
        return weekly;
    }
    /**
     * Resample daily data to monthly
     */
    static dailyToMonthly(dailyData) {
        if (dailyData.length === 0)
            return [];
        const monthly = [];
        let currentMonth = [];
        let lastMonth = dailyData[0].timestamp.getMonth();
        for (const bar of dailyData) {
            const barMonth = bar.timestamp.getMonth();
            if (barMonth !== lastMonth) {
                // Month changed
                if (currentMonth.length > 0) {
                    const monthBar = DataPreprocessor.aggregateBars(currentMonth);
                    monthly.push(monthBar);
                }
                currentMonth = [bar];
                lastMonth = barMonth;
            }
            else {
                currentMonth.push(bar);
            }
        }
        // Handle remaining bars
        if (currentMonth.length > 0) {
            const monthBar = DataPreprocessor.aggregateBars(currentMonth);
            monthly.push(monthBar);
        }
        return monthly;
    }
    /**
     * Resample 1-hour data to 4-hour
     */
    static hourlyTo4Hourly(hourlyData) {
        if (hourlyData.length === 0)
            return [];
        const fourHourly = [];
        let bars4H = [];
        for (const bar of hourlyData) {
            const hour = bar.timestamp.getHours();
            // Group by 4-hour blocks (0-4, 4-8, 8-12, 12-16, 16-20, 20-24)
            bars4H.push(bar);
            if (bars4H.length === 4 || bar === hourlyData[hourlyData.length - 1]) {
                const bar4H = DataPreprocessor.aggregateBars(bars4H);
                fourHourly.push(bar4H);
                bars4H = [];
            }
        }
        return fourHourly;
    }
    /**
     * Aggregate multiple bars into single OHLCV
     */
    static aggregateBars(bars) {
        if (bars.length === 0)
            throw new Error('Cannot aggregate empty bars array');
        return {
            timestamp: bars[0].timestamp,
            open: bars[0].open,
            high: Math.max(...bars.map((b) => b.high)),
            low: Math.min(...bars.map((b) => b.low)),
            close: bars[bars.length - 1].close,
            volume: bars.reduce((sum, b) => sum + b.volume, 0)
        };
    }
    /**
     * Align multiple timeframes to have matching date indices
     */
    static alignTimeframes(data) {
        const result = {
            daily: data.daily,
            weekly: data.weekly || [],
            monthly: data.monthly || []
        };
        if (data.fourHour) {
            result.fourHour = data.fourHour;
        }
        // Validate all timeframes have data
        if (result.daily.length === 0) {
            logger_1.logger.warn('Daily data is empty');
            return result;
        }
        return result;
    }
    /**
     * Validate data for gaps and anomalies
     */
    static validateData(data) {
        const issues = [];
        if (data.length === 0) {
            issues.push('Data is empty');
            return { valid: false, issues };
        }
        // Check for NaN or negative prices
        for (let i = 0; i < data.length; i++) {
            const bar = data[i];
            if (isNaN(bar.open) || isNaN(bar.high) || isNaN(bar.low) || isNaN(bar.close)) {
                issues.push(`Bar ${i} has NaN prices`);
            }
            if (bar.open <= 0 || bar.high <= 0 || bar.low <= 0 || bar.close <= 0) {
                issues.push(`Bar ${i} has non-positive prices`);
            }
            if (bar.volume < 0) {
                issues.push(`Bar ${i} has negative volume`);
            }
            if (bar.high < bar.low) {
                issues.push(`Bar ${i} has high < low`);
            }
            // Check for unusual gaps (> 50% move)
            if (i > 0) {
                const prevClose = data[i - 1].close;
                const gap = Math.abs((bar.open - prevClose) / prevClose);
                if (gap > 0.5) {
                    issues.push(`Bar ${i} has unusual gap of ${(gap * 100).toFixed(2)}%`);
                }
            }
        }
        // Check for minimum data points
        if (data.length < 20) {
            issues.push(`Only ${data.length} bars available, minimum 20 required`);
        }
        const valid = issues.length === 0;
        if (!valid) {
            logger_1.logger.warn('Data validation failed:', issues);
        }
        return { valid, issues };
    }
    /**
     * Fill gaps in data (if any missing dates)
     */
    static fillGaps(data) {
        if (data.length < 2)
            return data;
        const filled = [data[0]];
        for (let i = 1; i < data.length; i++) {
            const prev = filled[filled.length - 1];
            const current = data[i];
            const timeDiff = current.timestamp.getTime() - prev.timestamp.getTime();
            const dayMs = 24 * 60 * 60 * 1000;
            // If gap is larger than expected, log warning but continue
            if (timeDiff > dayMs * 1.5) {
                logger_1.logger.warn(`Gap detected between ${prev.timestamp.toDateString()} and ${current.timestamp.toDateString()}`);
            }
            filled.push(current);
        }
        return filled;
    }
    /**
     * Remove duplicate bars
     */
    static removeDuplicates(data) {
        const seen = new Set();
        const unique = [];
        for (const bar of data) {
            const key = bar.timestamp.toISOString();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(bar);
            }
            else {
                logger_1.logger.warn(`Duplicate bar found at ${key}`);
            }
        }
        return unique;
    }
    /**
     * Limit data to lookback period
     */
    static limitLookback(data, days) {
        const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
        return data.filter((bar) => bar.timestamp.getTime() >= cutoffTime);
    }
}
exports.DataPreprocessor = DataPreprocessor;
exports.default = DataPreprocessor;
//# sourceMappingURL=DataPreprocessor.js.map