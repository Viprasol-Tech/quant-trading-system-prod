import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function strategiesRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/strategies
   * Get list of available strategies and their status
   */
  fastify.get('/api/strategies', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(200).send({
      success: true,
      timestamp: new Date().toISOString(),
      strategies: [
        {
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
          stopLoss: 'ATR-based (2.5x), max 5%',
          takeProfit: '1.5R (partial), 2R (full), trailing',
          riskRewardRatio: '1:2',
          winRate: '62%',
          avgHoldDays: 5,
          activeSignals: 2
        },
        {
          name: 'Pullback/Mean Reversion',
          shortName: 'S2',
          status: 'active',
          description: 'Buys pullback to support in an uptrend with volume confirmation',
          entryConditions: [
            'MA alignment bullish (uptrend confirmed)',
            'Price at support (Fib 38-62%, MA, or prior S/R)',
            'RSI below 50 but turning up',
            'Volume declining (seller fatigue)',
            'OBV still in uptrend (accumulation intact)'
          ],
          stopLoss: 'Below swing low, 2x ATR, max 5%',
          takeProfit: '1.5-2R (static target = prior swing high)',
          riskRewardRatio: '1:1.5',
          winRate: '58%',
          avgHoldDays: 3,
          activeSignals: 1
        },
        {
          name: 'Hybrid Composite',
          shortName: 'S3',
          status: 'active',
          description: 'Adaptive strategy using 6-factor composite scoring',
          entryConditions: [
            'Composite score > 65',
            'Regime != bear',
            '6 weighted factors: trend (25%), momentum (20%), volume (15%), pattern (15%), regime (15%), volatility (10%)'
          ],
          stopLoss: 'ATR-based, adjusted by volatility regime',
          takeProfit: '50% at 1.5R, trail remainder',
          riskRewardRatio: '1:2',
          winRate: '65%',
          avgHoldDays: 4,
          activeSignals: 3
        }
      ]
    });
  });

  /**
   * GET /api/strategies/:name
   * Get detailed performance metrics for a specific strategy
   */
  fastify.get('/api/strategies/:name', async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
    const { name } = request.params;

    // Mock performance data
    const performanceData: any = {
      'Trend Breakout Momentum': {
        name: 'Trend Breakout Momentum',
        totalTrades: 42,
        winningTrades: 26,
        losingTrades: 16,
        profitFactor: 2.1,
        avgWin: 456,
        avgLoss: 218,
        expectancy: 8.5,
        maxDrawdown: -4.2,
        sharpeRatio: 1.85,
        calmarRatio: 0.95,
        cagr: 24.5
      },
      'Pullback/Mean Reversion': {
        name: 'Pullback/Mean Reversion',
        totalTrades: 38,
        winningTrades: 22,
        losingTrades: 16,
        profitFactor: 1.9,
        avgWin: 385,
        avgLoss: 215,
        expectancy: 7.2,
        maxDrawdown: -3.8,
        sharpeRatio: 1.65,
        calmarRatio: 0.85,
        cagr: 21.3
      },
      'Hybrid Composite': {
        name: 'Hybrid Composite',
        totalTrades: 51,
        winningTrades: 33,
        losingTrades: 18,
        profitFactor: 2.3,
        avgWin: 512,
        avgLoss: 225,
        expectancy: 9.8,
        maxDrawdown: -3.5,
        sharpeRatio: 2.1,
        calmarRatio: 1.05,
        cagr: 27.8
      }
    };

    const data = performanceData[name] || performanceData['Trend Breakout Momentum'];

    if (!data) {
      return reply.status(404).send({
        success: false,
        error: 'Strategy not found'
      });
    }

    return reply.status(200).send({
      success: true,
      strategy: {
        ...data,
        winRate: ((data.winningTrades / data.totalTrades) * 100).toFixed(1) + '%',
        timestamp: new Date().toISOString()
      }
    });
  });
}
