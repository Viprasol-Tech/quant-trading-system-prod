import { logger } from '../config/logger';
import { TechnicalAnalysisEngine } from './TechnicalAnalysisEngine';
import { TrendBreakoutStrategy } from '../strategies/TrendBreakoutStrategy';
import { PullbackReversionStrategy } from '../strategies/PullbackReversionStrategy';
import { HybridCompositeStrategy } from '../strategies/HybridCompositeStrategy';
import { MassiveAPIClient } from '../data/MassiveAPIClient';
import { OHLCV } from '../types';

export interface BacktestConfig {
  strategyId: string;
  symbol: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  initialCapital: number;
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  symbol: string;
  action: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
}

export interface BacktestResult {
  strategyId: string;
  strategyName: string;
  symbol: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinioRatio?: number;
  calmarRatio?: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  expectancy?: number;
  trades: BacktestTrade[];
  equityCurve: Array<{ date: string; equity: number }>;
}

const SLIPPAGE_BPS = 5; // 5 basis points
const COMMISSION = 0; // IBKR paper trading is free

export class BacktestEngine {
  private taEngine = new TechnicalAnalysisEngine();
  private massiveAPI = new MassiveAPIClient();

  /**
   * Map strategy ID to strategy instance
   */
  private getStrategy(strategyId: string): any {
    const id = strategyId.toLowerCase();

    if (id.includes('trend') || id === 's1' || id === 'strategy-1-momentum') {
      return new TrendBreakoutStrategy();
    }

    if (id.includes('pullback') || id.includes('reversion') || id === 's2' || id === 'strategy-2-mean-reversion') {
      return new PullbackReversionStrategy();
    }

    if (id.includes('hybrid') || id === 's3' || id === 'strategy-3-hybrid') {
      return new HybridCompositeStrategy();
    }

    throw new Error(`Unknown strategy: ${strategyId}`);
  }

  /**
   * Run backtest
   */
  async run(config: BacktestConfig): Promise<BacktestResult> {
    logger.info(`Starting backtest: ${config.symbol} with strategy ${config.strategyId}`);

    // Fetch historical data
    const bars = await this.massiveAPI.getDailyBars(config.symbol, config.startDate, config.endDate);

    if (!bars || bars.length < 100) {
      throw new Error(`Insufficient data: need 100+ bars, got ${bars?.length || 0}`);
    }

    logger.info(`Fetched ${bars.length} bars for ${config.symbol}`);

    // Initialize tracking
    const strategy = this.getStrategy(config.strategyId);
    const trades: BacktestTrade[] = [];
    const equityCurve: Array<{ date: string; equity: number }> = [];

    let cash = config.initialCapital;
    let position: {
      quantity: number;
      entryPrice: number;
      entryDate: string;
      stopLoss: number;
      takeProfit: number;
    } | null = null;
    let equity = config.initialCapital;
    let peakEquity = config.initialCapital;
    const drawdowns: number[] = [];

    // Bar-by-bar replay (100 bar lookback, start from index 100)
    for (let i = 100; i < bars.length; i++) {
      const currentBar = bars[i];

      // Slice for analysis: bars[0..i-1] (NO lookahead)
      const analysisSlice = bars.slice(0, i);

      try {
        // Run technical analysis on historical slice (static method)
        const analysis = TechnicalAnalysisEngine.analyze(analysisSlice, config.symbol);

        // Adapt analysis from TypeScript format to strategy-expected format
        const adaptedAnalysis = this.adaptAnalysisForStrategy(analysis, analysisSlice);

        // Generate signal from CURRENT bar close (bar[i])
        // Note: generateSignals() is synchronous, not async
        const signals = strategy.generateSignals(new Map([
          [config.symbol, adaptedAnalysis]
        ]));

        // Check for signals for this symbol
        const signal = signals.find(s => s.symbol === config.symbol);

        // If signal fires and no position, ENTER
        if (signal && !position) {
          // Entry price: current bar close + slippage
          const entryPrice = currentBar.close * (1 + SLIPPAGE_BPS / 10000);
          const quantity = Math.floor(cash / entryPrice);

          if (quantity > 0) {
            // Use signal's stop loss and take profit, or fallback to defaults
            const stopLoss = signal.stopLoss || (entryPrice * 0.98);
            const takeProfit = signal.takeProfit || (entryPrice * 1.04);

            position = {
              quantity,
              entryPrice,
              entryDate: currentBar.timestamp instanceof Date ? currentBar.timestamp.toISOString() : String(currentBar.timestamp),
              stopLoss,
              takeProfit
            };

            cash -= quantity * entryPrice + COMMISSION;

            logger.debug(
              `[${currentBar.timestamp}] ENTER: ${config.symbol} ${quantity} @ $${entryPrice.toFixed(2)} ` +
              `SL=$${stopLoss.toFixed(2)} TP=$${takeProfit.toFixed(2)}`
            );
          }
        }

        // If position open, check stop loss / take profit
        if (position) {
          const { stopLoss, takeProfit } = position;
          let actualExit: number | null = null;
          let exitReason = '';

          // Check if both SL and TP are hit in the same bar
          const slHit = currentBar.low <= stopLoss;
          const tpHit = currentBar.high >= takeProfit;

          if (slHit && tpHit) {
            // Open-proximity heuristic: which was hit first?
            // Distance from open to SL vs distance from open to TP
            const distToSL = Math.abs(currentBar.open - stopLoss);
            const distToTP = Math.abs(currentBar.open - takeProfit);

            if (distToSL <= distToTP) {
              // SL is closer to open, assume it hit first
              actualExit = stopLoss;
              exitReason = 'SL (intrabar)';
            } else {
              // TP is closer to open, assume it hit first
              actualExit = takeProfit;
              exitReason = 'TP (intrabar)';
            }
          } else if (slHit) {
            actualExit = stopLoss;
            exitReason = 'SL';
          } else if (tpHit) {
            actualExit = takeProfit;
            exitReason = 'TP';
          }

          // Execute exit if conditions met
          if (actualExit) {
            const exitValue = position.quantity * actualExit - COMMISSION;
            const pnl = exitValue - (position.quantity * position.entryPrice);
            const pnlPercent = (pnl / (position.quantity * position.entryPrice)) * 100;

            trades.push({
              entryDate: position.entryDate,
              exitDate: currentBar.timestamp instanceof Date ? currentBar.timestamp.toISOString() : String(currentBar.timestamp),
              symbol: config.symbol,
              action: 'LONG',
              entryPrice: position.entryPrice,
              exitPrice: actualExit,
              quantity: position.quantity,
              pnl,
              pnlPercent
            });

            cash += exitValue;
            position = null;

            logger.debug(
              `[${currentBar.timestamp}] EXIT (${exitReason}): ` +
              `PnL=$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`
            );
          }
        }

        // Update equity
        let positionValue = 0;
        if (position) {
          positionValue = position.quantity * currentBar.close;
        }

        equity = cash + positionValue;
        equityCurve.push({
          date: currentBar.timestamp instanceof Date ? currentBar.timestamp.toISOString() : String(currentBar.timestamp),
          equity
        });

        // Track drawdown
        if (equity > peakEquity) {
          peakEquity = equity;
        }
        drawdowns.push((peakEquity - equity) / peakEquity);
      } catch (error) {
        logger.warn(`Error processing bar ${i}: ${error}`);
      }
    }

    // Close any open position at last bar
    if (position) {
      const lastBar = bars[bars.length - 1];
      const exitPrice = lastBar.close * (1 - SLIPPAGE_BPS / 10000); // Slippage on exit

      const exitValue = position.quantity * exitPrice - COMMISSION;
      const pnl = exitValue - (position.quantity * position.entryPrice);
      const pnlPercent = (pnl / (position.quantity * position.entryPrice)) * 100;

      trades.push({
        entryDate: position.entryDate,
        exitDate: lastBar.timestamp instanceof Date ? lastBar.timestamp.toISOString() : String(lastBar.timestamp),
        symbol: config.symbol,
        action: 'LONG',
        entryPrice: position.entryPrice,
        exitPrice,
        quantity: position.quantity,
        pnl,
        pnlPercent
      });

      cash += exitValue;
      equity = cash;
    }

    // Calculate metrics
    const finalCapital = equity;
    const totalReturn = finalCapital - config.initialCapital;
    const totalReturnPercent = (totalReturn / config.initialCapital) * 100;

    const maxDrawdown = Math.max(...drawdowns, 0);

    // Sharpe Ratio: annualized (sqrt(252) * mean(daily_returns) / std(daily_returns))
    const dailyReturns = equityCurve.slice(1).map((day, i) => {
      const prev = equityCurve[i].equity;
      return (day.equity - prev) / prev;
    });

    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);

    const sharpeRatio = stdDev > 0 ? Math.sqrt(252) * (meanReturn / stdDev) : 0;

    // Sortino Ratio: like Sharpe but only downside deviation
    const downsdideReturns = dailyReturns.filter(r => r < 0);
    const downscaleVariance = downsdideReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / dailyReturns.length;
    const downsideStdDev = Math.sqrt(downscaleVariance);

    const sortinioRatio = downsideStdDev > 0 ? Math.sqrt(252) * (meanReturn / downsideStdDev) : 0;

    // Calmar Ratio: CAGR / max drawdown
    const daysHeld = (new Date(config.endDate).getTime() - new Date(config.startDate).getTime()) / (1000 * 60 * 60 * 24);
    const cagr = Math.pow(finalCapital / config.initialCapital, 252 / daysHeld) - 1;
    const calmarRatio = maxDrawdown > 0 ? cagr / maxDrawdown : 0;

    // Win rate
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

    // Profit factor
    const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

    // Expectancy
    const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
    const avgLoss = trades.filter(t => t.pnl < 0).length > 0 ? grossLoss / trades.filter(t => t.pnl < 0).length : 0;
    const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);

    const result: BacktestResult = {
      strategyId: config.strategyId,
      strategyName: this.getStrategyName(config.strategyId),
      symbol: config.symbol,
      startDate: config.startDate,
      endDate: config.endDate,
      initialCapital: config.initialCapital,
      finalCapital: Math.round(finalCapital * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      totalReturnPercent: Math.round(totalReturnPercent * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      sortinioRatio: Math.round(sortinioRatio * 100) / 100,
      calmarRatio: Math.round(calmarRatio * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
      totalTrades: trades.length,
      profitFactor: Math.round(profitFactor * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      trades,
      equityCurve
    };

    logger.info(`Backtest complete: Return=${result.totalReturnPercent.toFixed(2)}%, MaxDD=${result.maxDrawdown.toFixed(2)}%, Trades=${trades.length}`);

    return result;
  }

  /**
   * Adapter: Convert AnalysisResult to strategy-expected format
   * Strategies were built for Python TA format, not TypeScript AnalysisResult.
   * This adapter bridges the gap without modifying strategy implementations.
   */
  private adaptAnalysisForStrategy(analysis: any, bars: OHLCV[]): Record<string, any> {
    // Extract MA values
    const latestMA50 = analysis.trendAlignment?.ma50 || 0;
    const latestMA100 = analysis.trendAlignment?.ma100 || 0;
    const latestMA200 = analysis.trendAlignment?.ma200 || 0;

    // Determine MA alignment
    const maAlignment = latestMA50 > latestMA100 && latestMA100 > latestMA200
      ? 'bullish'
      : latestMA50 < latestMA100 && latestMA100 < latestMA200
        ? 'bearish'
        : 'mixed';

    // MA slopes (approximated from recent bars)
    const ma50Slope = (latestMA50 - (analysis.trendAlignment?.ma50Prev || latestMA50)) || 0;
    const ma100Slope = (latestMA100 - (analysis.trendAlignment?.ma100Prev || latestMA100)) || 0;
    const ma200Slope = (latestMA200 - (analysis.trendAlignment?.ma200Prev || latestMA200)) || 0;

    // Fibonacci levels
    const fib = analysis.fibonacciLevels;
    const fibLevels = fib ? {
      '38.2%': fib.level382 || 0,
      '50%': fib.level500 || 0,
      '61.8%': fib.level618 || 0,
    } : { '38.2%': 0, '50%': 0, '61.8%': 0 };

    // Support/resistance
    const srLevels = (analysis.srLevels || []).map((l: any) => ({
      type: l.type,
      price: l.price,
      strength: l.strength || 1,
    }));

    // Highest resistance and support from SR levels
    const resistanceLevels = srLevels.filter((l: any) => l.type === 'resistance');
    const supportLevels = srLevels.filter((l: any) => l.type === 'support');
    const resistance = resistanceLevels.length > 0 ? Math.max(...resistanceLevels.map((l: any) => l.price)) : 0;
    const support = supportLevels.length > 0 ? Math.min(...supportLevels.map((l: any) => l.price)) : 0;

    return {
      current_price: analysis.price,
      currentPrice: analysis.price,
      price: analysis.price,
      trend: {
        ma_alignment: maAlignment,
        ma_50: latestMA50,
        ma_100: latestMA100,
        ma_200: latestMA200,
        ma_50_slope: ma50Slope,
        ma_100_slope: ma100Slope,
        ma_200_slope: ma200Slope,
      },
      momentum: {
        rsi: analysis.rsiState?.rsi || 50,
        macd: analysis.macdState?.macd || 0,
        macd_signal: analysis.macdState?.signal || 0,
        macd_histogram: analysis.macdState?.histogram || 0,
      },
      volume: {
        rvol: analysis.volumeState?.rvol || 1,
        obv_trend: analysis.volumeState?.obvTrend || 0,
        mfi: analysis.volumeState?.mfi || 50,
        current: bars[bars.length - 1]?.volume || 0,
        average: (bars.slice(-20).reduce((sum, b) => sum + (b.volume || 0), 0) / 20) || 1,
      },
      volatility: {
        atr: analysis.volatilityState?.atr || (analysis.price * 0.02),
        atr_percent: analysis.volatilityState?.atrPercent || 2,
      },
      regime: {
        classification: analysis.regimeState?.marketRegime || 'range',
        regime: analysis.regimeState?.marketRegime || 'range',
      },
      support_resistance: {
        levels: srLevels,
        resistance: resistance,
        support: support,
      },
      resistance_level: resistance,
      support_level: support,
      fibonacci: {
        retracement_levels: fibLevels,
      },
      patterns: {
        bullish_engulfing: false,
        hammer: false,
        morning_star: false,
        double_bottom: false,
      }
    };
  }

  /**
   * Get human-readable strategy name
   */
  private getStrategyName(strategyId: string): string {
    const id = strategyId.toLowerCase();

    if (id.includes('trend') || id === 's1' || id === 'strategy-1-momentum') {
      return 'S1: Trend Breakout';
    }

    if (id.includes('pullback') || id.includes('reversion') || id === 's2' || id === 'strategy-2-mean-reversion') {
      return 'S2: Pullback Reversion';
    }

    if (id.includes('hybrid') || id === 's3' || id === 'strategy-3-hybrid') {
      return 'S3: Hybrid Composite';
    }

    return 'Unknown Strategy';
  }
}

export const backtestEngine = new BacktestEngine();
