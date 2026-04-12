import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../config/logger';
import { backtestEngine, BacktestConfig, BacktestResult } from '../../engine/BacktestEngine';
import db from '../../database/db';

export async function backtestRoutes(app: FastifyInstance) {
  /**
   * POST /api/backtest/run - Run a backtest
   */
  app.post<{
    Body: BacktestConfig;
    Reply: { success: boolean; data?: BacktestResult; error?: string };
  }>('/api/backtest/run', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const config = request.body as BacktestConfig;

      // Validation
      if (!config.strategyId || !config.symbol || !config.startDate || !config.endDate || !config.initialCapital) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: strategyId, symbol, startDate, endDate, initialCapital'
        });
      }

      if (new Date(config.startDate) >= new Date(config.endDate)) {
        return reply.status(400).send({
          success: false,
          error: 'startDate must be before endDate'
        });
      }

      logger.info(`Starting backtest: ${config.symbol} (${config.strategyId})`);

      // Run backtest
      const result = await backtestEngine.run(config);

      // Save to database
      try {
        const stmt = db.prepare(`
          INSERT INTO backtest_runs (
            strategy_id, strategy_name, symbol, start_date, end_date,
            initial_capital, final_capital, total_return, total_return_pct,
            max_drawdown, sharpe_ratio, sortino_ratio, calmar_ratio,
            win_rate, total_trades, profit_factor, expectancy,
            equity_curve, trades
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          config.strategyId,
          result.strategyName,
          config.symbol,
          config.startDate,
          config.endDate,
          config.initialCapital,
          result.finalCapital,
          result.totalReturn,
          result.totalReturnPercent,
          result.maxDrawdown,
          result.sharpeRatio,
          result.sortinioRatio || 0,
          result.calmarRatio || 0,
          result.winRate,
          result.totalTrades,
          result.profitFactor,
          result.expectancy || 0,
          JSON.stringify(result.equityCurve),
          JSON.stringify(result.trades)
        );

        logger.info('Backtest result saved to database');
      } catch (dbError) {
        logger.error('Failed to save backtest result to database:', dbError);
        // Continue anyway - don't fail the backtest if DB save fails
      }

      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Backtest failed:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/backtest/history - Get past backtest runs
   */
  app.get<{
    Reply: { success: boolean; data?: any[]; error?: string };
  }>('/api/backtest/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stmt = db.prepare(`
        SELECT id, strategy_id, strategy_name, symbol, start_date, end_date,
               initial_capital, final_capital, total_return_pct,
               max_drawdown, sharpe_ratio, win_rate, total_trades,
               created_at
        FROM backtest_runs
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const runs = stmt.all();

      return reply.send({
        success: true,
        data: runs
      });
    } catch (error) {
      logger.error('Failed to fetch backtest history:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/backtest/:id - Get specific backtest run with full details
   */
  app.get<{
    Params: { id: string };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/backtest/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const stmt = db.prepare('SELECT * FROM backtest_runs WHERE id = ?');
      const run = stmt.get(id) as any;

      if (!run) {
        return reply.status(404).send({
          success: false,
          error: 'Backtest not found'
        });
      }

      // Parse JSON columns
      if (run.equity_curve) {
        try {
          run.equityCurve = JSON.parse(run.equity_curve);
        } catch (e) {
          run.equityCurve = [];
        }
      }

      if (run.trades) {
        try {
          run.trades = JSON.parse(run.trades);
        } catch (e) {
          run.trades = [];
        }
      }

      return reply.send({
        success: true,
        data: run
      });
    } catch (error) {
      logger.error('Failed to fetch backtest:', error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
