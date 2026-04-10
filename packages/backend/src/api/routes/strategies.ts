import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TrendBreakoutStrategy } from '../../strategies/TrendBreakoutStrategy';
import { PullbackReversionStrategy } from '../../strategies/PullbackReversionStrategy';
import { HybridCompositeStrategy } from '../../strategies/HybridCompositeStrategy';
import { logger } from '../../config/logger';

// Strategy instances
const strategies = {
  's1': new TrendBreakoutStrategy(),
  's2': new PullbackReversionStrategy(),
  's3': new HybridCompositeStrategy()
};

// Strategy configurations (NOT mock data - actual strategy definitions)
const strategyConfigs = [
  {
    id: 's1',
    name: 'Trend Breakout Momentum',
    shortName: 'S1',
    status: 'active',
    description: 'Breaks above resistance with MA alignment bullish, high volume, and MACD confirmation',
    entryConditions: [
      'MA alignment bullish (50 > 100 > 200)',
      'Price breaks above S/R resistance',
      'RVOL > 1.5x average',
      'RSI between 40-70',
      'MACD positive and rising',
      'Market regime = bull'
    ],
    riskManagement: {
      stopLoss: 'ATR-based (2.5x), max 5%',
      takeProfit: '1.5R (partial), 2R (full)',
      riskRewardRatio: '1:2'
    }
  },
  {
    id: 's2',
    name: 'Pullback/Mean Reversion',
    shortName: 'S2',
    status: 'active',
    description: 'Buys pullback to support in an uptrend with volume confirmation',
    entryConditions: [
      'MA alignment bullish (uptrend confirmed)',
      'Price at support (Fib 38-62%, MA, or prior S/R)',
      'RSI below 50 but turning up',
      'Volume declining (seller fatigue)',
      'OBV still in uptrend'
    ],
    riskManagement: {
      stopLoss: 'Below swing low, 2x ATR, max 5%',
      takeProfit: '1.5-2R (prior swing high)',
      riskRewardRatio: '1:1.5'
    }
  },
  {
    id: 's3',
    name: 'Hybrid Composite',
    shortName: 'S3',
    status: 'active',
    description: 'Adaptive strategy using 6-factor composite scoring',
    entryConditions: [
      'Composite score > 65',
      'Regime != bear',
      'Factors: trend (25%), momentum (20%), volume (15%), pattern (15%), regime (15%), volatility (10%)'
    ],
    riskManagement: {
      stopLoss: 'ATR-based, adjusted by volatility regime',
      takeProfit: '50% at 1.5R, trail remainder',
      riskRewardRatio: '1:2'
    }
  }
];

export async function strategiesRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/strategies
   * Get list of available strategies and their configuration
   */
  fastify.get('/api/strategies', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        strategies: strategyConfigs,
        count: strategyConfigs.length
      }
    });
  });

  /**
   * GET /api/strategies/:id
   * Get detailed configuration for a specific strategy
   */
  fastify.get('/api/strategies/:id', async (request: FastifyRequest<{ 
    Params: { id: string } 
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const lowerKey = id.toLowerCase();

    const config = strategyConfigs.find(s => 
      s.id === lowerKey || 
      s.shortName.toLowerCase() === lowerKey ||
      s.name.toLowerCase().includes(lowerKey)
    );

    if (!config) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'STRATEGY_NOT_FOUND',
          message: `Strategy '${id}' not found. Available: S1, S2, S3`
        }
      });
    }

    return reply.status(200).send({
      success: true,
      timestamp: new Date().toISOString(),
      data: config
    });
  });

  /**
   * GET /api/strategies/:id/performance
   * Get performance metrics - REQUIRES DATABASE
   * Returns error if no backtest data exists
   */
  fastify.get('/api/strategies/:id/performance', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;

    // TODO: Connect to database to get real backtest/trading performance
    // For now, return an error indicating no data available
    
    logger.warn(`Performance data requested for ${id} but no database connected`);

    return reply.status(503).send({
      success: false,
      error: {
        code: 'NO_PERFORMANCE_DATA',
        message: 'Performance data requires historical backtest results stored in database. Run backtests first.'
      }
    });
  });

  /**
   * POST /api/strategies/:id/toggle
   * Enable/disable a strategy
   */
  fastify.post('/api/strategies/:id/toggle', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const lowerKey = id.toLowerCase();

    const configIndex = strategyConfigs.findIndex(s => 
      s.id === lowerKey || 
      s.shortName.toLowerCase() === lowerKey
    );

    if (configIndex === -1) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'STRATEGY_NOT_FOUND',
          message: `Strategy '${id}' not found`
        }
      });
    }

    // Toggle status
    const config = strategyConfigs[configIndex];
    config.status = config.status === 'active' ? 'inactive' : 'active';

    logger.info(`Strategy ${config.name} toggled to ${config.status}`);

    return reply.status(200).send({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        id: config.id,
        name: config.name,
        status: config.status
      }
    });
  });
}
