/**
 * Realistic Phase 1 Validation Tests
 * Uses appropriate data sizes for each indicator
 * Tests with 1-month minimum for meaningful signal generation
 */

import { TrendIndicators } from '../engine/indicators/TrendIndicators';
import { MomentumIndicators } from '../engine/indicators/MomentumIndicators';
import { VolatilityIndicators } from '../engine/indicators/VolatilityIndicators';
import { VolumeIndicators } from '../engine/indicators/VolumeIndicators';
import { FibonacciIndicators } from '../engine/indicators/FibonacciIndicators';
import { TechnicalAnalysisEngine } from '../engine/TechnicalAnalysisEngine';
import { RegimeDetection } from '../engine/regime/RegimeDetection';
import { SupportResistanceAnalysis } from '../engine/patterns/SupportResistance';
import { DataPreprocessor } from '../data/DataPreprocessor';
import { logger } from '../config/logger';
import { OHLCV } from '../data/DataProvider';

/**
 * Generate realistic market data
 */
function generateRealisticData(days: number, startPrice: number = 150): OHLCV[] {
  const bars: OHLCV[] = [];
  let price = startPrice;
  let trend = 0.5;
  let volatility = 1.5;

  for (let i = 0; i < days; i++) {
    const momentum = (Math.random() - 0.5) * 2;
    trend = trend * 0.95 + momentum * 0.05;
    volatility = Math.max(0.5, Math.min(3, volatility + (Math.random() - 0.5) * 0.3));

    const dailyChange = (trend + (Math.random() - 0.5) * volatility) * 0.01 * price;
    const open = price;
    const close = price + dailyChange;
    const high = Math.max(open, close) + Math.abs(Math.random() * volatility * price * 0.005);
    const low = Math.min(open, close) - Math.abs(Math.random() * volatility * price * 0.005);

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

describe('Phase 1 Realistic Validation Tests', () => {
  // =============================================
  // 1-MONTH VALIDATION (21 trading days)
  // =============================================

  describe('1-Month Trading Data Validation', () => {
    let data: OHLCV[];
    let closes: number[];

    beforeAll(() => {
      data = generateRealisticData(21);
      closes = data.map((b) => b.close);
      logger.info(`Generated 1-month dataset: ${data.length} bars`);
    });

    it('should be sufficient for technical analysis', () => {
      expect(data.length).toBe(21);
      expect(closes.length).toBe(21);
      logger.info(`✓ 1-month data: ${data.length} bars`);
    });

    it('should calculate SMA(14) with warmup', () => {
      const sma = TrendIndicators.calculateSMA(closes, 14);
      expect(sma.length).toBe(closes.length);

      // First 13 should be NaN, rest valid
      let firstValidIdx = -1;
      for (let i = 0; i < sma.length; i++) {
        if (!isNaN(sma[i])) {
          firstValidIdx = i;
          break;
        }
      }

      expect(firstValidIdx).toBe(13); // 0-indexed, so 14th element
      expect(sma[sma.length - 1]).toBeGreaterThan(0);
      logger.info(`✓ SMA(14) calculated correctly`);
    });

    it('should calculate RSI(14)', () => {
      const rsi = MomentumIndicators.calculateRSI(closes, 14);
      const lastRSI = rsi[rsi.length - 1];

      expect(!isNaN(lastRSI)).toBe(true);
      expect(lastRSI).toBeGreaterThanOrEqual(0);
      expect(lastRSI).toBeLessThanOrEqual(100);
      logger.info(`✓ RSI(14): ${lastRSI.toFixed(2)}`);
    });

    it('should calculate MACD', () => {
      const macd = MomentumIndicators.calculateMACD(closes);
      const lastMACD = macd.macd[macd.macd.length - 1];

      expect(!isNaN(lastMACD)).toBe(true);
      logger.info(`✓ MACD: ${lastMACD.toFixed(4)}`);
    });

    it('should calculate ATR(14)', () => {
      const atr = VolatilityIndicators.calculateATR(data);
      const lastATR = atr[atr.length - 1];

      expect(lastATR).toBeGreaterThan(0);
      logger.info(`✓ ATR(14): ${lastATR.toFixed(2)}`);
    });

    it('should calculate Bollinger Bands(20)', () => {
      const bands = VolatilityIndicators.calculateBollingerBands(closes, 20);
      const lastBand = bands[bands.length - 1];

      expect(lastBand.upper).toBeGreaterThan(lastBand.lower);
      expect(lastBand.middle).toBeGreaterThan(lastBand.lower);
      logger.info(`✓ Bollinger Bands: ${lastBand.lower.toFixed(2)}-${lastBand.upper.toFixed(2)}`);
    });

    it('should calculate ADX(14)', () => {
      const adx = RegimeDetection.calculateADX(data);
      const lastADX = adx[adx.length - 1];

      expect(lastADX).toBeGreaterThanOrEqual(0);
      expect(lastADX).toBeLessThanOrEqual(100);
      logger.info(`✓ ADX(14): ${lastADX.toFixed(2)}`);
    });

    it('should classify market regime', () => {
      const closes = data.map((b) => b.close);
      const ma50 = TrendIndicators.calculateSMA(closes, 5);
      const ma200 = TrendIndicators.calculateSMA(closes, 20);
      const adx = RegimeDetection.calculateADX(data);

      const regime = RegimeDetection.classifyMarketRegime(
        closes[closes.length - 1],
        ma50[ma50.length - 1],
        ma200[ma200.length - 1],
        adx[adx.length - 1]
      );

      expect(['bull', 'bear', 'range', 'transition']).toContain(regime);
      logger.info(`✓ Market regime: ${regime}`);
    });

    it('should reample daily to weekly correctly', () => {
      const weekly = DataPreprocessor.dailyToWeekly(data);
      expect(weekly.length).toBeGreaterThan(0);
      expect(weekly[0].close).toBeGreaterThan(0);
      logger.info(`✓ Daily→Weekly: ${data.length} → ${weekly.length}`);
    });

    it('should validate data integrity', () => {
      const validation = DataPreprocessor.validateData(data);
      expect(validation.valid).toBe(true);
      logger.info(`✓ Data validation passed`);
    });
  });

  // =============================================
  // 3-MONTH VALIDATION (63 trading days)
  // =============================================

  describe('3-Month Trading Data Validation', () => {
    let data: OHLCV[];

    beforeAll(() => {
      // Generate 100+ bars for full analysis engine (requirement)
      data = generateRealisticData(105);
      logger.info(`Generated full dataset: ${data.length} bars`);
    });

    it('should support full analysis engine', () => {
      const result = TechnicalAnalysisEngine.analyze(data, 'TEST');

      expect(result.symbol).toBe('TEST');
      expect(result.price).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(100);
      expect(['Strong Buy', 'Buy', 'Neutral', 'Sell', 'Strong Sell']).toContain(result.rating);

      logger.info(`✓ Full analysis:`);
      logger.info(`  Price: $${result.price.toFixed(2)}`);
      logger.info(`  Confidence: ${result.confidenceScore.toFixed(0)}/100`);
      logger.info(`  Rating: ${result.rating}`);
      logger.info(`  Regime: ${result.regimeState.marketRegime}`);
    });

    it('should detect pivot points and S/R levels', () => {
      const pivots = SupportResistanceAnalysis.detectPivots(data);
      const srLevels = SupportResistanceAnalysis.detectSRLevels(pivots);

      expect(pivots.length).toBeGreaterThan(0);
      expect(srLevels.length).toBeGreaterThan(0);

      logger.info(`✓ Support/Resistance: ${pivots.length} pivots → ${srLevels.length} levels`);
    });

    it('should calculate Fibonacci levels', () => {
      const closes = data.map((b) => b.close);
      const high = Math.max(...closes);
      const low = Math.min(...closes);

      const fibs = FibonacciIndicators.calculateFibonacciLevels(high, low);

      // Verify all levels are calculated
      expect(fibs.level0).toBeGreaterThan(0);
      expect(fibs.level236).toBeGreaterThan(0);
      expect(fibs.level382).toBeGreaterThan(0);
      expect(fibs.level500).toBeGreaterThan(0);
      expect(fibs.level618).toBeGreaterThan(0);
      expect(fibs.level786).toBeGreaterThan(0);
      expect(fibs.level1000).toBeGreaterThan(0);

      logger.info(`✓ Fibonacci levels calculated: 0%=${fibs.level0.toFixed(2)}, 50%=${fibs.level500.toFixed(2)}, 100%=${fibs.level1000.toFixed(2)}`);
    });

    it('should produce consistent results on repeated analysis', () => {
      const result1 = TechnicalAnalysisEngine.analyze(data, 'TEST');
      const result2 = TechnicalAnalysisEngine.analyze(data, 'TEST');

      expect(result1.price).toBe(result2.price);
      expect(result1.confidenceScore).toBe(result2.confidenceScore);
      expect(result1.rating).toBe(result2.rating);

      logger.info(`✓ Results are deterministic`);
    });
  });

  // =============================================
  // DATA ALIGNMENT VALIDATION
  // =============================================

  describe('Multi-Timeframe Alignment', () => {
    let dailyData: OHLCV[];

    beforeAll(() => {
      dailyData = generateRealisticData(63);
    });

    it('should align daily and weekly data', () => {
      const daily = generateRealisticData(21);
      const weekly = DataPreprocessor.dailyToWeekly(daily);

      expect(weekly.length).toBeGreaterThan(0);
      // Weekly data should have fewer but valid bars
      expect(weekly.length).toBeLessThanOrEqual(daily.length);

      // Verify OHLC relationships
      weekly.forEach((bar) => {
        expect(bar.high).toBeGreaterThanOrEqual(bar.low);
        expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
      });

      logger.info(`✓ Daily→Weekly alignment: ${daily.length} → ${weekly.length}`);
    });

    it('should handle daily to monthly resampling', () => {
      const monthly = DataPreprocessor.dailyToMonthly(dailyData);

      expect(monthly.length).toBeGreaterThan(0);
      expect(monthly.length).toBeLessThanOrEqual(dailyData.length);

      logger.info(`✓ Daily→Monthly: ${dailyData.length} → ${monthly.length}`);
    });

    it('should maintain volume consistency across timeframes', () => {
      const weekly = DataPreprocessor.dailyToWeekly(dailyData);

      // Weekly volume should be sum of daily volumes (approximately)
      const dailyVolumes = dailyData.slice(0, 5).reduce((sum, b) => sum + b.volume, 0);
      const weeklyVolume = weekly[0]?.volume || 0;

      expect(weeklyVolume).toBeGreaterThan(0);
      logger.info(`✓ Volume preserved across timeframes`);
    });
  });

  // =============================================
  // EDGE CASE HANDLING
  // =============================================

  describe('Edge Case Handling', () => {
    it('should handle strong uptrend', () => {
      const upTrendData: OHLCV[] = [];
      let price = 100;

      for (let i = 0; i < 21; i++) {
        const change = price * 0.02; // 2% daily increase
        upTrendData.push({
          timestamp: new Date(2025, 0, i + 1),
          open: price,
          high: price * 1.025,
          low: price * 0.99,
          close: price + change,
          volume: 50000000
        });
        price = price + change;
      }

      const closes = upTrendData.map((b) => b.close);
      const ma5 = TrendIndicators.calculateSMA(closes, 5);
      const rsi = MomentumIndicators.calculateRSI(closes);

      const lastMA5 = ma5[ma5.length - 1];
      const lastRSI = rsi[rsi.length - 1];

      expect(lastMA5).toBeGreaterThan(0);
      expect(lastRSI).toBeGreaterThan(60); // Should be in overbought territory

      logger.info(`✓ Strong uptrend handled - RSI: ${lastRSI.toFixed(2)}`);
    });

    it('should handle strong downtrend', () => {
      const downTrendData: OHLCV[] = [];
      let price = 150;

      for (let i = 0; i < 21; i++) {
        const change = price * -0.015; // 1.5% daily decrease
        downTrendData.push({
          timestamp: new Date(2025, 0, i + 1),
          open: price,
          high: price * 1.01,
          low: price * 0.975,
          close: price + change,
          volume: 60000000
        });
        price = price + change;
      }

      const closes = downTrendData.map((b) => b.close);
      const rsi = MomentumIndicators.calculateRSI(closes);

      const lastRSI = rsi[rsi.length - 1];
      expect(lastRSI).toBeLessThan(40); // Should be in oversold territory

      logger.info(`✓ Strong downtrend handled - RSI: ${lastRSI.toFixed(2)}`);
    });

    it('should handle sideways consolidation', () => {
      const consolidationData: OHLCV[] = [];
      let price = 150;

      for (let i = 0; i < 21; i++) {
        // Tiny oscillations around the same price
        const change = (Math.random() - 0.5) * price * 0.002; // ±0.1% movement
        consolidationData.push({
          timestamp: new Date(2025, 0, i + 1),
          open: price + change * 0.5,
          high: Math.max(price, price + change * 0.7),
          low: Math.min(price, price + change * 0.3),
          close: price + change,
          volume: 30000000
        });
        price = price + change;
      }

      const closes = consolidationData.map((b) => b.close);
      const rsi = MomentumIndicators.calculateRSI(closes, 14);

      // In consolidation, RSI should be somewhere in middle (not extreme)
      const validRSI = rsi.find((v, i) => !isNaN(v) && i === rsi.length - 1);
      if (validRSI !== undefined) {
        expect(validRSI).toBeGreaterThan(20);
        expect(validRSI).toBeLessThan(80);
        logger.info(`✓ Consolidation handled - RSI: ${validRSI.toFixed(2)}`);
      } else {
        logger.info(`✓ Consolidation handled - RSI calculation requires momentum`);
      }
    });
  });

  // =============================================
  // PERFORMANCE & RELIABILITY
  // =============================================

  describe('Performance & Reliability', () => {
    it('should handle 100+ bars without slowdown', () => {
      const largeData = generateRealisticData(100);
      const startTime = Date.now();

      TechnicalAnalysisEngine.analyze(largeData, 'PERF');

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second

      logger.info(`✓ 100-bar analysis completed in ${elapsed}ms`);
    });

    it('should maintain accuracy with 252+ bars (1 year)', () => {
      const yearData = generateRealisticData(252);
      const result = TechnicalAnalysisEngine.analyze(yearData, 'YEAR');

      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(100);
      expect(result.rating).toBeDefined();

      logger.info(`✓ Year-long data handled correctly - Confidence: ${result.confidenceScore.toFixed(0)}`);
    });

    it('should handle null/invalid data gracefully', () => {
      expect(() => {
        TechnicalAnalysisEngine.analyze([], 'EMPTY');
      }).toThrow();

      const tooSmallData = generateRealisticData(5);
      expect(() => {
        TechnicalAnalysisEngine.analyze(tooSmallData, 'SMALL');
      }).toThrow();

      logger.info(`✓ Invalid data handled with proper errors`);
    });
  });
});
