import { OHLCV } from './DataProvider';
export interface MultiTimeframeData {
    daily: OHLCV[];
    weekly: OHLCV[];
    monthly: OHLCV[];
    fourHour?: OHLCV[];
}
export declare class DataPreprocessor {
    /**
     * Resample daily data to weekly
     */
    static dailyToWeekly(dailyData: OHLCV[]): OHLCV[];
    /**
     * Resample daily data to monthly
     */
    static dailyToMonthly(dailyData: OHLCV[]): OHLCV[];
    /**
     * Resample 1-hour data to 4-hour
     */
    static hourlyTo4Hourly(hourlyData: OHLCV[]): OHLCV[];
    /**
     * Aggregate multiple bars into single OHLCV
     */
    private static aggregateBars;
    /**
     * Align multiple timeframes to have matching date indices
     */
    static alignTimeframes(data: {
        daily: OHLCV[];
        weekly?: OHLCV[];
        monthly?: OHLCV[];
        fourHour?: OHLCV[];
    }): MultiTimeframeData;
    /**
     * Validate data for gaps and anomalies
     */
    static validateData(data: OHLCV[]): {
        valid: boolean;
        issues: string[];
    };
    /**
     * Fill gaps in data (if any missing dates)
     */
    static fillGaps(data: OHLCV[]): OHLCV[];
    /**
     * Remove duplicate bars
     */
    static removeDuplicates(data: OHLCV[]): OHLCV[];
    /**
     * Limit data to lookback period
     */
    static limitLookback(data: OHLCV[], days: number): OHLCV[];
}
export default DataPreprocessor;
//# sourceMappingURL=DataPreprocessor.d.ts.map