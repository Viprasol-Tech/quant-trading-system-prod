import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Decimal from 'decimal.js';
import { logger } from '../../config/logger';
import IBKRClient from '../../broker/IBKRClient';
import { Portfolio } from '../../types';

export async function portfolioRoutes(app: FastifyInstance) {
  const broker = IBKRClient;

  /**
   * GET /api/portfolio - Get portfolio overview
   */
  app.get<{ Reply: { success: boolean; data?: Portfolio; error?: string } }>(
    '/api/portfolio',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        logger.info('Fetching portfolio data');

        let account: any;
        let positions: any[] = [];

        try {
          account = await broker.getAccount();
          positions = await broker.getPositions();
        } catch (ibkrError) {
          logger.warn('IBKR not connected, using mock data:', ibkrError);
          // Fallback to mock data
          account = {
            equity: 100000,
            cash: 50000,
            buying_power: 50000
          };
          positions = [];
        }

        const totalEquity = new Decimal(account.equity);
        const totalCash = new Decimal(account.cash);
        const maxRisk = totalEquity.times(new Decimal(0.07)); // 7% max risk

        const portfolio: Portfolio = {
          totalEquity,
          totalCash,
          positions: positions.map((pos) => ({
            symbol: pos.symbol,
            quantity: parseInt(pos.qty, 10),
            entryPrice: new Decimal(pos.avg_entry_price),
            currentPrice: new Decimal(pos.current_price),
            pnl: new Decimal(pos.unrealized_gain),
            pnlPercent: parseFloat(pos.unrealized_gain_pct),
            stopLoss: new Decimal(0), // Placeholder
            takeProfit: new Decimal(0), // Placeholder
            entryTime: new Date(),
            strategy: 'N/A'
          })),
          openPositions: positions.length,
          openRisk: totalEquity.times(new Decimal(0.03)), // Placeholder
          maxRisk,
          riskPercent: 3, // Placeholder
          drawdown: 0
        };

        logger.info(`Portfolio fetched: ${portfolio.openPositions} positions`);

        reply.send({
          success: true,
          data: portfolio
        });
      } catch (error) {
        logger.error('Portfolio fetch failed:', error);
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/portfolio/stats - Get portfolio statistics
   */
  app.get<{
    Reply: {
      success: boolean;
      data?: {
        equity: string;
        cash: string;
        buyingPower: string;
        dayTradingBuyingPower: string;
        multiplier: string;
        shorting_enabled: boolean;
        sma: string;
      };
      error?: string;
    };
  }>('/api/portfolio/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('Fetching portfolio stats');

      const account = await broker.getAccount();

      reply.send({
        success: true,
        data: {
          equity: account.equity,
          cash: account.cash,
          buyingPower: account.buying_power,
          dayTradingBuyingPower: account.daytrade_count,
          multiplier: account.multiplier,
          shorting_enabled: account.shorting_enabled,
          accountId: account.account_id
        }
      });
    } catch (error) {
      logger.error('Portfolio stats fetch failed:', error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default portfolioRoutes;
