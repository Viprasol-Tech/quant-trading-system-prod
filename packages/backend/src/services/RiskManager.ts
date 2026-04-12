import Decimal from 'decimal.js';
import { config } from '../config/environment';
import { logger } from '../config/logger';
import { TradeSignal, TradePlan, Position } from '../types';
import db from '../database/db';

export class RiskManager {
  private peakEquity: Decimal = new Decimal(0);
  private currentDrawdown: Decimal = new Decimal(0);

  // Configurable parameters from environment
  private maxPositionRiskPercent: Decimal;
  private maxPortfolioHeat: Decimal;
  private maxPositions: number;
  private maxPerStrategy: number;
  private drawdownYellow: Decimal;
  private drawdownOrange: Decimal;
  private drawdownRed: Decimal;
  private drawdownHalt: Decimal;

  constructor() {
    // Load parameters from environment
    this.maxPositionRiskPercent = new Decimal(
      process.env.MAX_POSITION_RISK_PERCENT || config.risk?.maxPositionRiskPercent || 0.01
    );
    this.maxPortfolioHeat = new Decimal(
      process.env.MAX_PORTFOLIO_HEAT || config.risk?.maxPortfolioHeat || 0.07
    );
    this.maxPositions = parseInt(
      process.env.MAX_POSITIONS || String(config.risk?.maxPositions || 8)
    );
    this.maxPerStrategy = parseInt(
      process.env.MAX_PER_STRATEGY || String(config.risk?.maxPerStrategy || 3)
    );
    this.drawdownYellow = new Decimal(
      process.env.DRAWDOWN_YELLOW_PERCENT || 0.05
    );
    this.drawdownOrange = new Decimal(
      process.env.DRAWDOWN_ORANGE_PERCENT || 0.10
    );
    this.drawdownRed = new Decimal(
      process.env.DRAWDOWN_RED_PERCENT || 0.15
    );
    this.drawdownHalt = new Decimal(
      process.env.DRAWDOWN_HALT_PERCENT || 0.20
    );

    logger.info('RiskManager initialized with environment parameters');

    // Load peak_equity from database
    this.loadPeakEquity();
  }

  /**
   * Load peak_equity from database (called on startup)
   */
  private loadPeakEquity(): void {
    try {
      const stmt = db.prepare('SELECT value FROM system_state WHERE key = ?');
      const row = stmt.get('peak_equity') as any;

      if (row && row.value) {
        this.peakEquity = new Decimal(row.value);
        logger.info(`Loaded peak_equity from database: ${this.peakEquity}`);
      } else {
        logger.info('No peak_equity found in database, starting fresh');
      }
    } catch (error) {
      logger.error('Failed to load peak_equity from database:', error);
      // Continue with default value
    }
  }

  /**
   * Save peak_equity to database
   */
  private savePeakEquity(): void {
    try {
      const stmt = db.prepare(`
        INSERT INTO system_state (key, value, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = datetime('now')
      `);

      stmt.run('peak_equity', this.peakEquity.toString());
    } catch (error) {
      logger.warn('Failed to save peak_equity to database:', error);
      // Continue anyway - don't let DB failure stop trading
    }
  }

  /**
   * Calculate position size based on risk per trade
   */
  calculatePositionSize(
    equity: Decimal,
    riskPercent: number,
    entryPrice: Decimal,
    stopPrice: Decimal
  ): number {
    const riskAmount = equity.times(new Decimal(riskPercent / 100));
    const priceRisk = entryPrice.minus(stopPrice).abs();

    if (priceRisk.isZero()) return 0;

    const shares = Math.floor(riskAmount.dividedBy(priceRisk).toNumber());
    return Math.max(1, shares);
  }

  /**
   * Calculate ATR-based stop loss
   */
  calculateATRStop(
    entryPrice: Decimal,
    atr: Decimal,
    multiplier: number = 2.5,
    direction: 'long' | 'short' = 'long'
  ): Decimal {
    const stop = atr.times(new Decimal(multiplier));

    if (direction === 'long') {
      return entryPrice.minus(stop);
    } else {
      return entryPrice.plus(stop);
    }
  }

  /**
   * Apply hard cap to stop loss (max 5% from entry)
   */
  applyHardCap(entryPrice: Decimal, stopPrice: Decimal, maxPercent: number = 5): Decimal {
    const maxStop = entryPrice.times(new Decimal(1 - maxPercent / 100));

    // For long positions, ensure stop is not too far
    if (stopPrice.lessThan(maxStop)) {
      return maxStop;
    }

    return stopPrice;
  }

  /**
   * Calculate portfolio heat (total % at risk)
   */
  calculatePortfolioHeat(positions: any[]): Decimal {
    if (positions.length === 0) return new Decimal(0);

    let totalHeat = new Decimal(0);

    for (const position of positions) {
      const marketValue = new Decimal(position.market_value || position.qty * position.current_price || '0');
      const risk = marketValue.times(new Decimal(0.05)); // Assume 5% per position as default
      totalHeat = totalHeat.plus(risk);
    }

    return totalHeat;
  }

  /**
   * Check if can add a new trade (comprehensive checks)
   */
  canAddTrade(
    signal: TradeSignal,
    currentPositions: Position[]
  ): { allowed: boolean; reason?: string } {
    try {
      // Check max positions limit
      if (currentPositions.length >= this.maxPositions) {
        return { allowed: false, reason: `Max positions (${this.maxPositions}) reached` };
      }

      // Check per-strategy limit
      const strategyPositions = currentPositions.filter(
        p => p.strategy === signal.strategy
      );
      if (strategyPositions.length >= this.maxPerStrategy) {
        return {
          allowed: false,
          reason: `Max positions per strategy (${this.maxPerStrategy}) reached for ${signal.strategy}`
        };
      }

      // Check portfolio heat
      const currentHeat = this.calculatePortfolioHeat(currentPositions);
      const newRiskPercent = new Decimal(signal.riskPercent);
      const projectedHeat = currentHeat.plus(newRiskPercent);

      if (projectedHeat.greaterThan(this.maxPortfolioHeat)) {
        return {
          allowed: false,
          reason: `Portfolio heat ${projectedHeat.toFixed(2)} exceeds max ${this.maxPortfolioHeat.toFixed(2)}`
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error in canAddTrade:', error);
      return { allowed: false, reason: 'Internal error checking trade limits' };
    }
  }

  /**
   * Update drawdown tracking
   */
  updateDrawdown(currentEquity: Decimal): void {
    if (currentEquity.greaterThan(this.peakEquity)) {
      this.peakEquity = currentEquity;
      // Save new peak equity to database
      this.savePeakEquity();
    }

    this.currentDrawdown = this.peakEquity
      .minus(currentEquity)
      .dividedBy(this.peakEquity)
      .times(new Decimal(100));
  }

  /**
   * Calculate take-profit targets
   */
  calculateTakeProfits(
    entryPrice: Decimal,
    stopPrice: Decimal,
    rrRatio: Decimal = new Decimal(2)
  ): { tp1: Decimal; tp2: Decimal } {
    const riskAmount = entryPrice.minus(stopPrice).abs();
    const tp1 = entryPrice.plus(riskAmount.times(new Decimal(1.5))); // 1.5R
    const tp2 = entryPrice.plus(riskAmount.times(rrRatio)); // 2R default
    return { tp1, tp2 };
  }

  /**
   * Get size multiplier based on drawdown level
   */
  getSizeMultiplier(): Decimal {
    const ddPercent = this.currentDrawdown.toNumber();

    if (ddPercent < this.drawdownYellow.toNumber()) return new Decimal(1.0); // Normal
    if (ddPercent < this.drawdownOrange.toNumber()) return new Decimal(0.75); // Yellow: 75%
    if (ddPercent < this.drawdownRed.toNumber()) return new Decimal(0.50); // Orange: 50%
    if (ddPercent < this.drawdownHalt.toNumber()) return new Decimal(0.25); // Red: 25%
    return new Decimal(0); // Halt
  }

  /**
   * Check if trading should be halted
   */
  shouldHalt(): boolean {
    return this.currentDrawdown.greaterThanOrEqualTo(new Decimal(20));
  }

  /**
   * Get current drawdown percentage
   */
  getCurrentDrawdown(): Decimal {
    return this.currentDrawdown;
  }

  /**
   * Evaluate a trade signal and return a trade plan if approved
   */
  evaluateTrade(
    signal: TradeSignal,
    equity: Decimal,
    openPositions: any[],
    atr: Decimal
  ): TradePlan | null {
    // Check if halted
    if (this.shouldHalt()) {
      console.warn('Trading halted - drawdown threshold exceeded');
      return null;
    }

    // Calculate stop loss
    const stopPrice = this.applyHardCap(
      new Decimal(signal.entryPrice),
      this.calculateATRStop(
        new Decimal(signal.entryPrice),
        atr,
        config.risk.atrStopMultiplier || 2.5
      )
    );

    // Calculate position size
    const positionSize = this.calculatePositionSize(
      equity,
      0.01 * 100,
      new Decimal(signal.entryPrice),
      stopPrice
    );

    if (positionSize < 1) {
      console.warn('Position size too small');
      return null;
    }

    // Calculate risk amount
    const riskAmount = new Decimal(signal.entryPrice)
      .minus(stopPrice)
      .times(new Decimal(positionSize));

    // Check portfolio heat using canAddTrade
    const heat = this.canAddTrade(signal, openPositions as Position[]);
    if (!heat.allowed) {
      logger.warn(heat.reason || 'Trade rejected');
      return null;
    }

    // Calculate take profit levels (1.5R and 2R)
    const riskReward = new Decimal(signal.entryPrice)
      .minus(stopPrice)
      .abs();
    const tp1 = new Decimal(signal.entryPrice).plus(riskReward.times(new Decimal(1.5)));
    const tp2 = new Decimal(signal.entryPrice).plus(riskReward.times(new Decimal(2)));

    // Calculate risk percentage
    const riskPercent = riskAmount.dividedBy(equity).times(new Decimal(100));

    // Apply size multiplier based on drawdown
    const sizeMultiplier = this.getSizeMultiplier();
    const adjustedSize = Math.floor(new Decimal(positionSize).times(sizeMultiplier).toNumber());

    // Create proper TradePlan object
    const tradeSignal: TradeSignal = {
      symbol: signal.symbol,
      direction: 'long',
      entryPrice: new Decimal(signal.entryPrice),
      stopLoss: stopPrice,
      takeProfit: tp1,
      riskAmount: riskAmount,
      riskPercent: riskPercent.toNumber(),
      confidence: signal.confidence,
      rating: signal.rating,
      strategy: signal.strategy,
      timeframe: signal.timeframe,
      timestamp: signal.timestamp,
      reasoning: signal.reasoning
    };

    return {
      signal: tradeSignal,
      positionSize: adjustedSize,
      stopLoss: stopPrice,
      takeProfit1: tp1,
      takeProfit2: tp2,
      riskReward: riskReward.isZero() ? new Decimal(0) : tp2.minus(new Decimal(signal.entryPrice)).dividedBy(riskReward),
      riskAmount: riskAmount,
      riskPercent: riskPercent.toNumber()
    };
  }
}

export default new RiskManager();
