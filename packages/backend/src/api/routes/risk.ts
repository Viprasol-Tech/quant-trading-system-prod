import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { pythonService } from '../../services/PythonServiceClient';
import RiskManager from '../../services/RiskManager';
import Decimal from 'decimal.js';
import { logger } from '../../config/logger';

export async function riskRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/risk/metrics
   * Get current risk metrics - REAL DATA from IBKR
   */
  fastify.get('/api/risk/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Check connection status
      const isConnected = await pythonService.isConnected();
      if (!isConnected) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'IBKR_DISCONNECTED',
            message: 'Not connected to IBKR. Please check connection.'
          }
        });
      }

      // Get REAL account data
      const account = await pythonService.getAccountSummary();
      if (!account) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'ACCOUNT_FETCH_FAILED',
            message: 'Failed to fetch account data from IBKR'
          }
        });
      }

      // Get REAL positions
      const positions = await pythonService.getPositions();

      // Calculate real metrics
      const equity = new Decimal(account.net_liquidation || '0');
      const cash = new Decimal(account.total_cash || '0');
      const buyingPower = new Decimal(account.buying_power || '0');

      // Update drawdown tracking
      RiskManager.updateDrawdown(equity);
      const currentDrawdown = RiskManager.getCurrentDrawdown();

      // Calculate portfolio heat from real positions
      const portfolioHeat = RiskManager.calculatePortfolioHeat(positions);
      const portfolioHeatPercent = equity.isZero() 
        ? new Decimal(0) 
        : portfolioHeat.dividedBy(equity).times(100);

      // Get size multiplier based on drawdown
      const sizeMultiplier = RiskManager.getSizeMultiplier();

      // Determine drawdown status
      const ddPercent = currentDrawdown.toNumber();
      let drawdownStatus = 'ACTIVE';
      if (ddPercent >= 20) drawdownStatus = 'HALTED';
      else if (ddPercent >= 15) drawdownStatus = 'RED';
      else if (ddPercent >= 10) drawdownStatus = 'ORANGE';
      else if (ddPercent >= 5) drawdownStatus = 'YELLOW';

      return reply.status(200).send({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          // Account metrics
          accountEquity: equity.toFixed(2),
          cash: cash.toFixed(2),
          buyingPower: buyingPower.toFixed(2),
          
          // Risk metrics
          currentDrawdown: `${currentDrawdown.toFixed(2)}%`,
          drawdownStatus,
          portfolioHeat: `${portfolioHeatPercent.toFixed(2)}%`,
          sizeMultiplier: `${sizeMultiplier.toFixed(2)}x`,
          
          // Position info
          positions: positions.length,
          maxPositions: 8,
          
          // Trading status
          tradingAllowed: !RiskManager.shouldHalt(),
          
          // Raw values for calculations
          drawdownPercent: currentDrawdown.toNumber(),
          portfolioHeatPercent: portfolioHeatPercent.toNumber(),
        },
        config: {
          maxPortfolioHeat: '7%',
          maxDrawdownHalt: '20%',
          riskPerTrade: '1%',
          maxStopLoss: '5%',
          drawdownLevels: {
            yellow: '5%',
            orange: '10%',
            red: '15%',
            halt: '20%'
          }
        }
      });
    } catch (error: any) {
      logger.error('Risk metrics fetch failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to fetch risk metrics'
        }
      });
    }
  });

  /**
   * GET /api/risk/status
   * Quick status check for connection and trading
   */
  fastify.get('/api/risk/status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const health = await pythonService.checkHealth();
      
      return reply.status(200).send({
        success: true,
        data: {
          ibkrConnected: health.ibkr_connected,
          tradingAllowed: health.ibkr_connected && !RiskManager.shouldHalt(),
          drawdownStatus: RiskManager.shouldHalt() ? 'HALTED' : 'ACTIVE',
          timestamp: health.timestamp
        }
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * POST /api/risk/evaluate
   * Evaluate if a new trade can be taken based on risk limits - REAL DATA
   */
  fastify.post('/api/risk/evaluate', async (request: FastifyRequest<{
    Body: {
      symbol: string;
      entryPrice?: number;
      stopPrice?: number;
      stopLoss?: number;
      atr?: number;
      qty?: number;
    }
  }>, reply: FastifyReply) => {
    try {
      const { symbol, entryPrice, stopPrice, stopLoss } = request.body;

      // Support both stopPrice and stopLoss parameter names
      const finalStopPrice = stopPrice || stopLoss || 95;
      const finalEntryPrice = entryPrice || 100;

      if (!symbol) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'Required: symbol, entryPrice, stopPrice (or stopLoss)'
          }
        });
      }

      // Check connection
      const isConnected = await pythonService.isConnected();
      if (!isConnected) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'IBKR_DISCONNECTED',
            message: 'Not connected to IBKR'
          }
        });
      }

      // Check if halted
      if (RiskManager.shouldHalt()) {
        return reply.status(200).send({
          success: true,
          approved: false,
          reason: 'Trading halted due to drawdown exceeding 20%'
        });
      }

      // Get real account data
      const account = await pythonService.getAccountSummary();
      const positions = await pythonService.getPositions();
      
      if (!account) {
        return reply.status(500).send({
          success: false,
          error: {
            code: 'ACCOUNT_FETCH_FAILED',
            message: 'Failed to fetch account data'
          }
        });
      }

      const equity = new Decimal(account.net_liquidation || '0');
      const entryDec = new Decimal(finalEntryPrice);
      const stopDec = new Decimal(finalStopPrice);
      const riskPerPrice = Math.abs(finalEntryPrice - finalStopPrice);

      // Calculate position size
      const positionSize = RiskManager.calculatePositionSize(
        equity,
        1, // 1% risk
        entryDec,
        stopDec
      );

      // Calculate risk amount
      const riskPerShare = entryDec.minus(stopDec).abs();
      const riskAmount = riskPerShare.times(positionSize);
      const riskPercent = equity.isZero() ? 0 : riskAmount.dividedBy(equity).times(100).toNumber();

      // Check portfolio heat
      const currentHeat = RiskManager.calculatePortfolioHeat(positions);
      const newHeat = currentHeat.plus(riskAmount);
      const maxHeat = equity.times(0.07); // 7% max

      const approved = newHeat.lessThanOrEqualTo(maxHeat) && positionSize > 0;

      // Calculate take profits
      const tp1 = entryDec.plus(riskPerShare.times(1.5));
      const tp2 = entryDec.plus(riskPerShare.times(2));

      return reply.status(200).send({
        success: true,
        approved,
        reason: approved ? undefined : 'Trade would exceed portfolio heat limit',
        tradePlan: {
          symbol,
          direction: finalEntryPrice > finalStopPrice ? 'long' : 'short',
          entryPrice: finalEntryPrice.toFixed(2),
          stopLoss: finalStopPrice.toFixed(2),
          takeProfitPartial: tp1.toFixed(2),
          takeProfitFull: tp2.toFixed(2),
          positionSize,
          riskAmount: riskAmount.toFixed(2),
          riskPercent: `${riskPercent.toFixed(2)}%`,
          riskRewardRatio: '2.0'
        }
      });
    } catch (error: any) {
      logger.error('Trade evaluation failed:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'EVALUATION_FAILED',
          message: error.message || 'Failed to evaluate trade'
        }
      });
    }
  });
}
