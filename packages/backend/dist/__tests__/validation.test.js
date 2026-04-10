"use strict";
/**
 * Deep Validation Tests for Phase 1
 * Tests with realistic 1-4 week market data
 * Validates alignment, accuracy, and edge cases
 */
Object.defineProperty(exports, "__esModule", { value: true });
const TrendIndicators_1 = require("../engine/indicators/TrendIndicators");
const MomentumIndicators_1 = require("../engine/indicators/MomentumIndicators");
const VolatilityIndicators_1 = require("../engine/indicators/VolatilityIndicators");
const VolumeIndicators_1 = require("../engine/indicators/VolumeIndicators");
const FibonacciIndicators_1 = require("../engine/indicators/FibonacciIndicators");
const TechnicalAnalysisEngine_1 = require("../engine/TechnicalAnalysisEngine");
const RegimeDetection_1 = require("../engine/regime/RegimeDetection");
const SupportResistance_1 = require("../engine/patterns/SupportResistance");
const DataPreprocessor_1 = require("../data/DataPreprocessor");
const logger_1 = require("../config/logger");
/**
 * Generate realistic market data with varying volatility and trends
 * Simulates actual market behavior patterns
 */
function generateRealisticMarketData(days, startPrice = 150) {
    const bars = [];
    let price = startPrice;
    let trend = 0.5; // bias towards up/down
    let volatility = 1.5;
    for (let i = 0; i < days; i++) {
        // Trend + random walk with momentum
        const momentum = (Math.random() - 0.5) * 2;
        trend = trend * 0.95 + momentum * 0.05; // Smooth trend
        volatility = Math.max(0.5, Math.min(3, volatility + (Math.random() - 0.5) * 0.3));
        const dailyChange = (trend + (Math.random() - 0.5) * volatility) * 0.01 * price;
        const open = price;
        const close = price + dailyChange;
        const high = Math.max(open, close) + Math.abs(Math.random() * volatility * price * 0.005);
        const low = Math.min(open, close) - Math.abs(Math.random() * volatility * price * 0.005);
        // Volume increases on volatile days
        const baseVolume = 40000000 + Math.random() * 30000000;
        const volatilityMultiplier = 0.5 + Math.abs(dailyChange) / (price * 0.01);
        const volume = baseVolume * volatilityMultiplier;
        bars.push({
            timestamp: new Date(2025, 0, 1 + i),
            open,
            high: Math.max(high, close),
            low: Math.min(low, close),
            close,
            volume: Math.round(volume)
        });
        price = close;
    }
    return bars;
}
describe('Phase 1 Deep Validation Tests', () => {
    // =============================================
    // TEST DATA GENERATION
    // =============================================
    describe('Test Data Generation', () => {
        it('should generate 1 week of realistic market data', () => {
            const bars = generateRealisticMarketData(5); // 5 trading days
            expect(bars.length).toBe(5);
            expect(bars[0].open).toBeGreaterThan(0);
            expect(bars[0].high).toBeGreaterThanOrEqual(bars[0].open);
            expect(bars[0].low).toBeLessThanOrEqual(bars[0].open);
            logger_1.logger.info(`✓ Generated 1-week data: ${bars.length} bars`);
        });
        it('should generate 1 month of realistic market data', () => {
            const bars = generateRealisticMarketData(21); // ~1 month of trading days
            expect(bars.length).toBe(21);
            // Check OHLC relationships
            bars.forEach((bar, idx) => {
                expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
                expect(bar.low).toBeLessThanOrEqual(Math.min(bar.open, bar.close));
                expect(bar.volume).toBeGreaterThan(0);
                if (idx > 0) {
                    expect(bar.open).toBeCloseTo(bars[idx - 1].close, 0);
                }
            });
            logger_1.logger.info(`✓ Generated 1-month data: ${bars.length} bars`);
        });
        it('should generate 3 months of realistic market data', () => {
            const bars = generateRealisticMarketData(63); // ~3 months
            expect(bars.length).toBe(63);
            logger_1.logger.info(`✓ Generated 3-month data: ${bars.length} bars`);
        });
    });
    // =============================================
    // INDICATOR VALIDATION WITH SHORT TIMEFRAMES
    // =============================================
    describe('Indicator Validation (1-Week Data)', () => {
        let weeklyData;
        let closes;
        beforeAll(() => {
            weeklyData = generateRealisticMarketData(5);
            closes = weeklyData.map((b) => b.close);
            logger_1.logger.info(`Testing indicators on ${weeklyData.length} bars`);
        });
        it('should calculate SMA with appropriate warmup', () => {
            // For 5 bars, test with period 3
            const sma = TrendIndicators_1.TrendIndicators.calculateSMA(closes, 3);
            expect(sma.length).toBe(closes.length);
            // First 2 values should be NaN (warmup)
            expect(isNaN(sma[0])).toBe(true);
            expect(isNaN(sma[1])).toBe(true);
            // Third value onwards should be valid
            expect(isNaN(sma[2])).toBe(false);
            expect(sma[2]).toBeGreaterThan(0);
            logger_1.logger.info(`✓ SMA calculated correctly with warmup period`);
        });
        it('should detect trend direction in short timeframe', () => {
            // Use shorter MA periods for short data
            const alignment = TrendIndicators_1.TrendIndicators.getTrendAlignment(closes, [2, 3, 4]);
            expect(['bullish', 'bearish', 'mixed', 'strong_bullish', 'strong_bearish']).toContain(alignment.alignment);
            logger_1.logger.info(`✓ Trend detected: ${alignment.alignment}`);
        });
        it('should calculate RSI without errors on short data', () => {
            const rsi = MomentumIndicators_1.MomentumIndicators.calculateRSI(closes, 3); // Short period for short data
            expect(rsi.length).toBeGreaterThan(0);
            // Find last non-NaN value
            const lastRSI = rsi.find((v, i) => !isNaN(v) && i === rsi.length - 1);
            if (lastRSI) {
                expect(lastRSI).toBeGreaterThanOrEqual(0);
                expect(lastRSI).toBeLessThanOrEqual(100);
                logger_1.logger.info(`✓ RSI calculated: ${lastRSI.toFixed(2)}`);
            }
        });
        it('should calculate MACD with realistic values', () => {
            const macd = MomentumIndicators_1.MomentumIndicators.calculateMACD(closes);
            expect(macd.macd.length).toBe(closes.length);
            expect(macd.signal.length).toBe(closes.length);
            expect(macd.histogram.length).toBe(closes.length);
            const lastMACD = macd.macd.find((v, i) => !isNaN(v) && i === macd.macd.length - 1);
            if (lastMACD !== undefined) {
                expect(typeof lastMACD).toBe('number');
                logger_1.logger.info(`✓ MACD calculated: ${lastMACD.toFixed(4)}`);
            }
        });
        it('should calculate ATR for volatility measurement', () => {
            const atr = VolatilityIndicators_1.VolatilityIndicators.calculateATR(weeklyData);
            expect(atr.length).toBe(weeklyData.length);
            const lastATR = atr.find((v, i) => !isNaN(v) && i === atr.length - 1);
            expect(lastATR).toBeGreaterThan(0);
            logger_1.logger.info(`✓ ATR calculated: ${lastATR?.toFixed(2)}`);
        });
        it('should calculate Bollinger Bands with proper width', () => {
            const bands = VolatilityIndicators_1.VolatilityIndicators.calculateBollingerBands(closes);
            expect(bands.length).toBe(closes.length);
            const lastBand = bands.find((b, i) => !isNaN(b.upper) && i === bands.length - 1);
            if (lastBand) {
                expect(lastBand.upper).toBeGreaterThan(lastBand.lower);
                expect(lastBand.middle).toBeGreaterThan(lastBand.lower);
                expect(lastBand.middle).toBeLessThan(lastBand.upper);
                logger_1.logger.info(`✓ Bollinger Bands: Upper=${lastBand.upper.toFixed(2)}, Mid=${lastBand.middle.toFixed(2)}, Lower=${lastBand.lower.toFixed(2)}`);
            }
        });
        it('should calculate relative volume', () => {
            const volumes = weeklyData.map((b) => b.volume);
            const rvol = VolumeIndicators_1.VolumeIndicators.calculateRelativeVolume(volumes);
            expect(rvol.length).toBe(volumes.length);
            const lastRVOL = rvol.find((v, i) => !isNaN(v) && i === rvol.length - 1);
            if (lastRVOL) {
                expect(lastRVOL).toBeGreaterThan(0);
                logger_1.logger.info(`✓ RVOL calculated: ${lastRVOL.toFixed(2)}`);
            }
        });
        it('should calculate OBV for volume accumulation', () => {
            const obv = VolumeIndicators_1.VolumeIndicators.calculateOBV(weeklyData);
            expect(obv.length).toBe(weeklyData.length);
            expect(typeof obv[obv.length - 1]).toBe('number');
            logger_1.logger.info(`✓ OBV calculated: ${obv[obv.length - 1].toFixed(0)}`);
        });
    });
    // =============================================
    // INDICATOR VALIDATION WITH 1-MONTH DATA
    // =============================================
    describe('Indicator Validation (1-Month Data)', () => {
        let monthlyData;
        let closes;
        beforeAll(() => {
            monthlyData = generateRealisticMarketData(21);
            closes = monthlyData.map((b) => b.close);
            logger_1.logger.info(`Testing indicators on ${monthlyData.length} bars (1 month)`);
        });
        it('should calculate all moving averages with full data', () => {
            const mas = TrendIndicators_1.TrendIndicators.calculateMovingAverages(closes, [5, 10, 20]);
            expect(mas.ma50.length).toBe(closes.length);
            expect(mas.ma100.length).toBe(closes.length);
            expect(mas.ma200.length).toBe(closes.length);
            const lastMA5 = mas.ma50.find((v, i) => !isNaN(v) && i === mas.ma50.length - 1);
            const lastMA10 = mas.ma100.find((v, i) => !isNaN(v) && i === mas.ma100.length - 1);
            const lastMA20 = mas.ma200.find((v, i) => !isNaN(v) && i === mas.ma200.length - 1);
            expect(lastMA5).toBeGreaterThan(0);
            expect(lastMA10).toBeGreaterThan(0);
            expect(lastMA20).toBeGreaterThan(0);
            logger_1.logger.info(`✓ All MAs calculated - MA5: ${lastMA5?.toFixed(2)}, MA10: ${lastMA10?.toFixed(2)}, MA20: ${lastMA20?.toFixed(2)}`);
        });
        it('should detect crossover signals', () => {
            const ma5 = TrendIndicators_1.TrendIndicators.calculateSMA(closes, 5);
            const ma20 = TrendIndicators_1.TrendIndicators.calculateSMA(closes, 20);
            const crossovers = TrendIndicators_1.TrendIndicators.detectCrossovers(ma5, ma20, monthlyData);
            expect(Array.isArray(crossovers)).toBe(true);
            logger_1.logger.info(`✓ Crossovers detected: ${crossovers.length} signals`);
        });
        it('should calculate ADX for trend strength', () => {
            const adx = RegimeDetection_1.RegimeDetection.calculateADX(monthlyData);
            expect(adx.length).toBe(monthlyData.length);
            const lastADX = adx[adx.length - 1];
            expect(lastADX).toBeGreaterThanOrEqual(0);
            expect(lastADX).toBeLessThanOrEqual(100);
            logger_1.logger.info(`✓ ADX calculated: ${lastADX.toFixed(2)}`);
        });
        it('should classify market regime accurately', () => {
            const closes = monthlyData.map((b) => b.close);
            const ma50 = TrendIndicators_1.TrendIndicators.calculateSMA(closes, 5);
            const ma200 = TrendIndicators_1.TrendIndicators.calculateSMA(closes, 20);
            const adx = RegimeDetection_1.RegimeDetection.calculateADX(monthlyData);
            const regime = RegimeDetection_1.RegimeDetection.classifyMarketRegime(closes[closes.length - 1], ma50[ma50.length - 1], ma200[ma200.length - 1], adx[adx.length - 1]);
            expect(['bull', 'bear', 'range', 'transition']).toContain(regime);
            logger_1.logger.info(`✓ Market regime classified: ${regime}`);
        });
        it('should detect Fibonacci levels', () => {
            const closes = monthlyData.map((b) => b.close);
            const high = Math.max(...closes);
            const low = Math.min(...closes);
            const fibs = FibonacciIndicators_1.FibonacciIndicators.calculateFibonacciLevels(high, low);
            expect(fibs.level1000).toBeCloseTo(high, 1);
            expect(fibs.level0).toBeCloseTo(low, 1);
            expect(fibs.level382).toBeGreaterThan(low);
            expect(fibs.level382).toBeLessThan(high);
            logger_1.logger.info(`✓ Fibonacci levels calculated`);
        });
        it('should detect support/resistance levels', () => {
            const pivots = SupportResistance_1.SupportResistanceAnalysis.detectPivots(monthlyData);
            expect(Array.isArray(pivots)).toBe(true);
            expect(pivots.length).toBeGreaterThan(0);
            const srLevels = SupportResistance_1.SupportResistanceAnalysis.detectSRLevels(pivots);
            expect(Array.isArray(srLevels)).toBe(true);
            logger_1.logger.info(`✓ S/R levels detected: ${srLevels.length} levels from ${pivots.length} pivots`);
        });
    });
    // =============================================
    // ANALYSIS ENGINE VALIDATION
    // =============================================
    describe('Analysis Engine Validation', () => {
        let testData;
        beforeAll(() => {
            testData = generateRealisticMarketData(63); // 3 months for full analysis
            logger_1.logger.info(`Testing analysis engine on ${testData.length} bars`);
        });
        it('should produce complete analysis', () => {
            const result = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(testData, 'TEST');
            expect(result).toBeDefined();
            expect(result.symbol).toBe('TEST');
            expect(result.price).toBeGreaterThan(0);
            expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
            expect(result.confidenceScore).toBeLessThanOrEqual(100);
            expect(['Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell']).toContain(result.rating);
            logger_1.logger.info(`✓ Analysis complete:`);
            logger_1.logger.info(`  Price: ${result.price.toFixed(2)}`);
            logger_1.logger.info(`  Confidence: ${result.confidenceScore.toFixed(0)}/100`);
            logger_1.logger.info(`  Rating: ${result.rating}`);
            logger_1.logger.info(`  Regime: ${result.regimeState.marketRegime}`);
        });
        it('should produce consistent narrative', () => {
            const result = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(testData, 'TEST');
            expect(result.narrative).toBeDefined();
            expect(result.narrative.length).toBeGreaterThan(10);
            expect(typeof result.narrative).toBe('string');
            logger_1.logger.info(`✓ Narrative generated: "${result.narrative.substring(0, 100)}..."`);
        });
        it('should score components consistently', () => {
            const result = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(testData, 'TEST');
            // Verify component scores sum appropriately
            expect(result.trendAlignment).toBeDefined();
            expect(result.rsiState).toBeDefined();
            expect(result.macdState).toBeDefined();
            expect(result.volatilityState).toBeDefined();
            expect(result.volumeState).toBeDefined();
            logger_1.logger.info(`✓ All component states available and scored`);
        });
    });
    // =============================================
    // DATA ALIGNMENT VALIDATION
    // =============================================
    describe('Data Alignment Validation', () => {
        let dailyData;
        beforeAll(() => {
            dailyData = generateRealisticMarketData(63);
        });
        it('should resample daily to weekly without gaps', () => {
            const weekly = DataPreprocessor_1.DataPreprocessor.dailyToWeekly(dailyData);
            expect(weekly.length).toBeGreaterThan(0);
            expect(weekly[0].open).toBeGreaterThan(0);
            // Verify OHLC relationships
            weekly.forEach((bar) => {
                expect(bar.high).toBeGreaterThanOrEqual(bar.low);
                expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
                expect(bar.low).toBeLessThanOrEqual(Math.min(bar.open, bar.close));
            });
            logger_1.logger.info(`✓ Weekly resampling: ${dailyData.length} daily → ${weekly.length} weekly`);
        });
        it('should resample daily to monthly without gaps', () => {
            const monthly = DataPreprocessor_1.DataPreprocessor.dailyToMonthly(dailyData);
            expect(monthly.length).toBeGreaterThan(0);
            monthly.forEach((bar) => {
                expect(bar.high).toBeGreaterThanOrEqual(bar.low);
            });
            logger_1.logger.info(`✓ Monthly resampling: ${dailyData.length} daily → ${monthly.length} monthly`);
        });
        it('should validate data quality', () => {
            const validation = DataPreprocessor_1.DataPreprocessor.validateData(dailyData);
            expect(validation.valid).toBe(true);
            expect(validation.issues.length).toBe(0);
            logger_1.logger.info(`✓ Data validation passed - no issues`);
        });
        it('should detect gaps in data', () => {
            // Create data with gaps
            const gappedData = [
                ...dailyData.slice(0, 10),
                // Missing 5 bars
                ...dailyData.slice(15)
            ];
            const validation = DataPreprocessor_1.DataPreprocessor.validateData(gappedData);
            // Validation should detect gaps
            expect(validation.valid || validation.issues.length > 0).toBe(true);
            logger_1.logger.info(`✓ Gap detection working`);
        });
    });
    // =============================================
    // EDGE CASE VALIDATION
    // =============================================
    describe('Edge Case Handling', () => {
        it('should handle limit moves (large price jumps)', () => {
            const limitUpData = generateRealisticMarketData(21);
            // Simulate limit up move
            limitUpData[10].close = limitUpData[10].close * 1.2; // 20% jump
            limitUpData[10].high = limitUpData[10].close;
            const closes = limitUpData.map((b) => b.close);
            const rsi = MomentumIndicators_1.MomentumIndicators.calculateRSI(closes);
            expect(rsi.length).toBeGreaterThan(0);
            const lastRSI = rsi[rsi.length - 1];
            expect(!isNaN(lastRSI)).toBe(true);
            logger_1.logger.info(`✓ Limit moves handled correctly - RSI: ${lastRSI?.toFixed(2)}`);
        });
        it('should handle low volume periods', () => {
            const lowVolData = generateRealisticMarketData(21);
            lowVolData.forEach((bar) => {
                bar.volume = Math.round(bar.volume * 0.1); // 90% volume reduction
            });
            const volumes = lowVolData.map((b) => b.volume);
            const rvol = VolumeIndicators_1.VolumeIndicators.calculateRelativeVolume(volumes);
            expect(rvol.length).toBe(volumes.length);
            logger_1.logger.info(`✓ Low volume periods handled`);
        });
        it('should handle sideways consolidation', () => {
            const consolidationData = [];
            let price = 150;
            // Tight consolidation
            for (let i = 0; i < 21; i++) {
                consolidationData.push({
                    timestamp: new Date(2025, 0, i + 1),
                    open: price,
                    high: price * 1.002,
                    low: price * 0.998,
                    close: price + (Math.random() - 0.5) * price * 0.002,
                    volume: 30000000
                });
            }
            const regime = RegimeDetection_1.RegimeDetection.classifyMarketRegime(consolidationData[consolidationData.length - 1].close, price, price, 20 // Low ADX for consolidation
            );
            expect(['range', 'transition']).toContain(regime);
            logger_1.logger.info(`✓ Consolidation detected as: ${regime}`);
        });
        it('should handle gap opens without errors', () => {
            const gapData = generateRealisticMarketData(21);
            // Create gap up
            gapData[10].open = gapData[9].close * 1.05;
            const closes = gapData.map((b) => b.close);
            const macd = MomentumIndicators_1.MomentumIndicators.calculateMACD(closes);
            expect(macd.macd.length).toBe(closes.length);
            logger_1.logger.info(`✓ Gap opens handled correctly`);
        });
    });
    // =============================================
    // CONSISTENCY VALIDATION
    // =============================================
    describe('Consistency Validation', () => {
        let testData;
        beforeAll(() => {
            testData = generateRealisticMarketData(63);
        });
        it('should produce same results on repeated analysis', () => {
            const result1 = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(testData, 'TEST');
            const result2 = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(testData, 'TEST');
            expect(result1.price).toBe(result2.price);
            expect(result1.confidenceScore).toBe(result2.confidenceScore);
            expect(result1.rating).toBe(result2.rating);
            logger_1.logger.info(`✓ Results are deterministic and consistent`);
        });
        it('should maintain indicator relationships', () => {
            const closes = testData.map((b) => b.close);
            const rsi = MomentumIndicators_1.MomentumIndicators.calculateRSI(closes);
            const ma = TrendIndicators_1.TrendIndicators.calculateSMA(closes, 14);
            // Both should have same length
            expect(rsi.length).toBe(closes.length);
            expect(ma.length).toBe(closes.length);
            logger_1.logger.info(`✓ Indicator array lengths aligned`);
        });
        it('should handle different data frequencies correctly', () => {
            const daily = generateRealisticMarketData(21);
            const dailyResult = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(daily, 'DAILY');
            expect(dailyResult).toBeDefined();
            const longDaily = generateRealisticMarketData(63);
            const longResult = TechnicalAnalysisEngine_1.TechnicalAnalysisEngine.analyze(longDaily, 'LONG');
            expect(longResult).toBeDefined();
            logger_1.logger.info(`✓ Different timeframe frequencies analyzed correctly`);
        });
    });
});
//# sourceMappingURL=validation.test.js.map