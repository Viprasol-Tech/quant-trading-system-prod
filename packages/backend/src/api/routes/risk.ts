import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function riskRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/risk/metrics
   * Get current risk metrics (drawdown, portfolio heat, etc.)
   */
  fastify.get('/api/risk/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Return mock risk metrics
      return reply.status(200).send({
        success: true,
        timestamp: new Date().toISOString(),
        metrics: {
          accountEquity: '95500.00',
          currentDrawdown: '2.4%',
          drawdownStatus: 'ACTIVE',
          portfolioHeat: '3.2%',
          sizeMultiplier: '1.0x',
          positions: 3,
          cash: '42300.00',
          buyingPower: '63450.00'
        },
        config: {
          maxPortfolioHeat: '7%',
          maxDrawdownHalt: '20%',
          riskPerTrade: '1%',
          maxStopLoss: '5%'
        }
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch risk metrics'
      });
    }
  });

  /**
   * POST /api/risk/evaluate
   * Evaluate if a new trade can be taken based on risk limits
   */
  fastify.post('/api/risk/evaluate', async (request: FastifyRequest<{
    Body: {
      symbol: string;
      entryPrice: number;
      stopPrice: number;
      atr: number;
    }
  }>, reply: FastifyReply) => {
    try {
      const { symbol, entryPrice, stopPrice, atr } = request.body;

      // Return mock trade evaluation
      return reply.status(200).send({
        success: true,
        approved: true,
        tradePlan: {
          symbol,
          direction: 'long',
          entryPrice: entryPrice.toString(),
          stopLoss: stopPrice.toString(),
          takeProfitPartial: (entryPrice + (entryPrice - stopPrice) * 1.5).toFixed(2),
          takeProfitFull: (entryPrice + (entryPrice - stopPrice) * 2).toFixed(2),
          positionSize: 100,
          riskAmount: (Math.abs(entryPrice - stopPrice) * 100).toFixed(2),
          riskPercent: '0.95%',
          riskRewardRatio: '2.0'
        }
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to evaluate trade'
      });
    }
  });
}
