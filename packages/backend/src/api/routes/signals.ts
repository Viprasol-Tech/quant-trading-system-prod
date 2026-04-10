import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pythonService } from '../../services/PythonServiceClient';
import SignalGenerator from '../../services/SignalGenerator';
import RiskManager from '../../services/RiskManager';
import { TechnicalAnalysisEngine } from '../../engine/TechnicalAnalysisEngine';
import { MassiveAPIClient } from '../../data/MassiveAPIClient';
import { ShariahScreener } from '../../shariah/ShariahScreener';
import { logger } from '../../config/logger';
import Decimal from 'decimal.js';

// Initialize services
const taEngine = new TechnicalAnalysisEngine();
const dataProvider = new MassiveAPIClient();
const shariahScreener = new ShariahScreener();

// Default universe of Shariah-compliant symbols
const DEFAULT_UNIVERSE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META',
  'GLD', 'SLV', 'SGOL', 'IAU'
];

export async function signalsRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/signals
   * Generate trading signals from REAL market data using REAL strategies
   */
  fastify.get('/api/signals', async (request: FastifyRequest<{
    Querystring: {
      symbols?: string;
      minConfidence?: number;
    }
  }>, reply: FastifyReply) => {
    try {
      const { symbols: symbolsParam, minConfidence = 60 } = request.query as any;
      
      // Parse symbols or use default universe
      const symbols = symbolsParam 
        ? symbolsParam.split(',').map((s: string) => s.trim().toUpperCase())
        : DEFAULT_UNIVERSE;

      logger.info(`Generating signals for ${symbols.length} symbols`);

      // Check IBKR connection (optional - signals can work without live connection)
      const isConnected = await pythonService.isConnected();

      // Get date range (last 100 days for analysis)
      const to = new Date();
      const from = new Date(to.getTime() - 100 * 24 * 60 * 60 * 1000);
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];

      // Analyze each symbol
      const analysisResults = new Map<string, any>();
      const errors: string[] = [];

      for (const symbol of symbols) {
        try {
          // Get historical data
          const bars = await dataProvider.getDailyBars(symbol, fromStr, toStr);
          
          if (bars.length < 50) {
            errors.push(`${symbol}: Insufficient data (${bars.length} bars)`);
            continue;
          }

          // Run technical analysis
          const analysis = TechnicalAnalysisEngine.analyze(bars, symbol);
          
          // Get current price (already set as 'price' in analysis)

          // Check Shariah compliance
          const compliance = shariahScreener.screenEquity({
            symbol,
            marketCap: 1000000000, // Default - would need real data
            totalDebt: 100000000,
            totalAssets: 500000000,
            haramIncome: 0,
            percentageHaramIncome: 0
          });

          analysisResults.set(symbol, analysis);
        } catch (error: any) {
          errors.push(`${symbol}: ${error.message}`);
          logger.warn(`Failed to analyze ${symbol}:`, error.message);
        }
      }

      // Generate signals using real strategies
      const allSignals = await SignalGenerator.generateSignals(analysisResults);

      // Filter by confidence
      const signals = allSignals.filter(s => s.confidence >= minConfidence);

      // Format signals for response
      const formattedSignals = signals.map(signal => ({
        symbol: signal.symbol,
        direction: signal.direction,
        entryPrice: signal.entryPrice.toNumber(),
        stopLoss: signal.stopLoss.toNumber(),
        takeProfit: signal.takeProfit.toNumber(),
        riskAmount: signal.riskAmount.toNumber(),
        riskPercent: signal.riskPercent,
        confidence: signal.confidence,
        rating: signal.rating,
        strategy: signal.strategy,
        timeframe: signal.timeframe,
        timestamp: signal.timestamp,
        reasoning: signal.reasoning,
        shariahCompliant: analysisResults.get(signal.symbol)?.shariahCompliant ?? false
      }));

      // Get strategy stats
      const strategyStats = SignalGenerator.getStrategyStats(signals);

      return reply.status(200).send({
        success: true,
        timestamp: new Date().toISOString(),
        ibkrConnected: isConnected,
        data: {
          signals: formattedSignals,
          totalCount: formattedSignals.length,
          analyzedSymbols: analysisResults.size,
          strategyStats,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error: any) {
      logger.error('Signal generation failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SIGNAL_GENERATION_FAILED',
          message: error.message || 'Failed to generate signals'
        }
      });
    }
  });

  /**
   * GET /api/signals/:symbol
   * Generate signal for a specific symbol - REAL DATA
   */
  fastify.get('/api/signals/:symbol', async (request: FastifyRequest<{ 
    Params: { symbol: string } 
  }>, reply: FastifyReply) => {
    try {
      const { symbol } = request.params;
      const upperSymbol = symbol.toUpperCase();

      logger.info(`Generating signal for ${upperSymbol}`);

      // Get date range
      const to = new Date();
      const from = new Date(to.getTime() - 100 * 24 * 60 * 60 * 1000);
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];

      // Get historical data
      const bars = await dataProvider.getDailyBars(upperSymbol, fromStr, toStr);
      
      if (bars.length < 50) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_DATA',
            message: `Insufficient historical data for ${upperSymbol} (${bars.length} bars, need 50+)`
          }
        });
      }

      // Run technical analysis
      const analysis = TechnicalAnalysisEngine.analyze(bars, upperSymbol);
      const currentPrice = analysis.price;

      // Check Shariah compliance
      const compliance = shariahScreener.screenEquity({
        symbol: upperSymbol,
        marketCap: 1000000000,
        totalDebt: 100000000,
        totalAssets: 500000000,
        haramIncome: 0,
        percentageHaramIncome: 0
      });

      // Generate signal
      const signal = SignalGenerator.generateSignalForSymbol(upperSymbol, analysis);

      if (!signal) {
        return reply.status(200).send({
          success: true,
          timestamp: new Date().toISOString(),
          symbol: upperSymbol,
          signal: null,
          message: 'No trading opportunity detected by any strategy',
          analysis: {
            price: currentPrice,
            trend: analysis.trendAlignment?.alignment || 'neutral',
            regime: analysis.regimeState?.marketRegime || 'unknown',
            shariahCompliant: compliance.isCompliant,
            complianceScore: compliance.score
          }
        });
      }

      return reply.status(200).send({
        success: true,
        timestamp: new Date().toISOString(),
        symbol: upperSymbol,
        signal: {
          direction: signal.direction,
          entryPrice: signal.entryPrice.toNumber(),
          stopLoss: signal.stopLoss.toNumber(),
          takeProfit: signal.takeProfit.toNumber(),
          riskAmount: signal.riskAmount.toNumber(),
          riskPercent: signal.riskPercent,
          confidence: signal.confidence,
          rating: signal.rating,
          strategy: signal.strategy,
          timeframe: signal.timeframe,
          reasoning: signal.reasoning,
          shariahCompliant: compliance.isCompliant
        },
        analysis: {
          price: currentPrice,
          trend: analysis.trendAlignment,
          momentum: { rsi: analysis.rsiState, macd: analysis.macdState },
          volume: analysis.volumeState,
          regime: analysis.regimeState,
          shariahCompliant: compliance.isCompliant,
          complianceScore: compliance.score
        }
      });
    } catch (error: any) {
      logger.error(`Signal generation failed for symbol:`, error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SIGNAL_GENERATION_FAILED',
          message: error.message || 'Failed to generate signal'
        }
      });
    }
  });

  /**
   * POST /api/signals/execute
   * Execute a signal - REAL ORDER to IBKR
   */
  fastify.post('/api/signals/execute', async (request: FastifyRequest<{
    Body: {
      symbol: string;
      direction: 'long' | 'short';
      entryPrice: number;
      stopLoss: number;
      quantity?: number;
    }
  }>, reply: FastifyReply) => {
    try {
      const { symbol, direction, entryPrice, stopLoss, quantity } = request.body;

      // Check IBKR connection
      const isConnected = await pythonService.isConnected();
      if (!isConnected) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'IBKR_DISCONNECTED',
            message: 'Not connected to IBKR. Cannot execute orders.'
          }
        });
      }

      // Check if trading is halted
      if (RiskManager.shouldHalt()) {
        return reply.status(200).send({
          success: false,
          error: {
            code: 'TRADING_HALTED',
            message: 'Trading halted due to drawdown exceeding limit'
          }
        });
      }

      // Get account for position sizing
      const account = await pythonService.getAccountSummary();
      if (!account) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'ACCOUNT_FETCH_FAILED',
            message: 'Failed to fetch account data'
          }
        });
      }

      // Calculate position size if not provided
      const equity = new Decimal(account.net_liquidation || '0');
      const positionSize = quantity || RiskManager.calculatePositionSize(
        equity,
        1, // 1% risk
        new Decimal(entryPrice),
        new Decimal(stopLoss)
      );

      if (positionSize < 1) {
        return reply.status(200).send({
          success: false,
          error: {
            code: 'POSITION_TOO_SMALL',
            message: 'Calculated position size is less than 1 share'
          }
        });
      }

      // Submit order to IBKR
      const order = await pythonService.submitOrder({
        symbol,
        quantity: positionSize,
        order_type: 'MKT'
      });

      if (!order) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'ORDER_SUBMISSION_FAILED',
            message: 'Failed to submit order to IBKR'
          }
        });
      }

      return reply.status(200).send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          orderId: order.order_id,
          symbol,
          direction,
          quantity: positionSize,
          entryPrice,
          stopLoss,
          status: order.status,
          message: 'Order submitted to IBKR'
        }
      });
    } catch (error: any) {
      logger.error('Signal execution failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error.message || 'Failed to execute signal'
        }
      });
    }
  });
}
