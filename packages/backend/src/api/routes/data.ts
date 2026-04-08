import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/logger';
import { MassiveAPIClient } from '../../data/MassiveAPIClient';
import { DataPreprocessor, MultiTimeframeData } from '../../data/DataPreprocessor';
import { OHLCV } from '../../types';

export async function dataRoutes(app: FastifyInstance) {
  const massive = new MassiveAPIClient();

  /**
   * GET /api/data/bars - Get OHLCV bars
   */
  app.get<{
    Querystring: {
      symbol: string;
      from: string;
      to: string;
      timeframe?: 'day' | 'hour' | 'week';
    };
    Reply: { success: boolean; data?: OHLCV[]; error?: string; count?: number };
  }>('/api/data/bars', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { symbol, from, to, timeframe = 'day' } = request.query as {
        symbol: string;
        from: string;
        to: string;
        timeframe?: 'day' | 'hour' | 'week';
      };

      if (!symbol || !from || !to) {
        return reply.status(400).send({
          success: false,
          error: 'symbol, from, and to are required'
        });
      }

      logger.info(`Fetching ${timeframe} bars for ${symbol} from ${from} to ${to}`);

      let bars: OHLCV[] = [];

      if (timeframe === 'day') {
        bars = await massive.getDailyBars(symbol, from, to);
      } else if (timeframe === 'hour') {
        bars = await massive.getHourlyBars(symbol, from, to);
      } else if (timeframe === 'week') {
        bars = await massive.getAggregates(symbol, 1, 'week', from, to);
      }

      // Validate data
      const validation = DataPreprocessor.validateData(bars);
      if (!validation.valid) {
        logger.warn(`Data validation issues for ${symbol}:`, validation.issues);
      }

      reply.send({
        success: true,
        data: bars,
        count: bars.length
      });
    } catch (error) {
      logger.error('Bars fetch failed:', error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/data/multitimeframe - Get multi-timeframe data
   */
  app.get<{
    Querystring: {
      symbol: string;
      from: string;
      to: string;
    };
    Reply: { success: boolean; data?: MultiTimeframeData; error?: string };
  }>(
    '/api/data/multitimeframe',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { symbol, from, to } = request.query as {
          symbol: string;
          from: string;
          to: string;
        };

        if (!symbol || !from || !to) {
          return reply.status(400).send({
            success: false,
            error: 'symbol, from, and to are required'
          });
        }

        logger.info(`Fetching multi-timeframe data for ${symbol}`);

        // Fetch daily data
        const dailyBars = await massive.getDailyBars(symbol, from, to);

        if (dailyBars.length === 0) {
          return reply.status(404).send({
            success: false,
            error: `No data found for ${symbol}`
          });
        }

        // Resample to weekly and monthly
        const weeklyBars = DataPreprocessor.dailyToWeekly(dailyBars);
        const monthlyBars = DataPreprocessor.dailyToMonthly(dailyBars);

        // Try to fetch hourly data if available
        let fourHourBars: OHLCV[] = [];
        try {
          fourHourBars = await massive.getAggregates(symbol, 4, 'hour', from, to);
        } catch (error) {
          logger.warn(`Could not fetch 4-hour data for ${symbol}`);
        }

        const multiTimeframeData: MultiTimeframeData = {
          daily: dailyBars,
          weekly: weeklyBars,
          monthly: monthlyBars,
          fourHour: fourHourBars.length > 0 ? fourHourBars : undefined
        };

        reply.send({
          success: true,
          data: multiTimeframeData
        });
      } catch (error) {
        logger.error('Multi-timeframe data fetch failed:', error);
        reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );

  /**
   * GET /api/data/connection-test - Test Massive API connection
   */
  app.get<{
    Reply: { success: boolean; message?: string; error?: string };
  }>('/api/data/connection-test', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('Testing Massive API connection');

      const isConnected = await massive.testConnection();

      if (isConnected) {
        reply.send({
          success: true,
          message: 'Massive API connection successful'
        });
      } else {
        reply.status(503).send({
          success: false,
          error: 'Massive API connection test failed'
        });
      }
    } catch (error) {
      logger.error('Connection test failed:', error);
      reply.status(503).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/data/cache-stats - Get cache statistics
   */
  app.get<{
    Reply: { success: boolean; data?: { cacheSize: number }; error?: string };
  }>('/api/data/cache-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cacheSize = massive.getCacheSize();

      reply.send({
        success: true,
        data: { cacheSize }
      });
    } catch (error) {
      logger.error('Cache stats fetch failed:', error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/data/markets - Get available markets
   */
  app.get<{
    Reply: { success: boolean; data?: string[]; error?: string };
  }>('/api/data/markets', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Return Shariah-compliant asset universe
      const markets = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX',
        'GLD', 'SLV', 'SGOL', 'IAU', 'BAR', 'USO', 'BTC', 'ETH'
      ];

      reply.send({
        success: true,
        data: markets
      });
    } catch (error) {
      logger.error('Markets fetch failed:', error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/data/quotes/:symbol - Get latest quote for symbol
   */
  app.get<{
    Params: { symbol: string };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/data/quotes/:symbol', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { symbol } = request.params as { symbol: string };

      logger.info(`Fetching latest quote for ${symbol}`);

      // Get latest daily data
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const bars = await massive.getDailyBars(
        symbol,
        thirtyDaysAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      );

      if (bars.length === 0) {
        return reply.status(404).send({
          success: false,
          error: `No data found for ${symbol}`
        });
      }

      const latestBar = bars[bars.length - 1];

      reply.send({
        success: true,
        data: {
          symbol,
          price: latestBar.close,
          high: latestBar.high,
          low: latestBar.low,
          open: latestBar.open,
          volume: latestBar.volume,
          timestamp: latestBar.timestamp
        }
      });
    } catch (error) {
      logger.error(`Quote fetch failed for symbol:`, error);
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default dataRoutes;
