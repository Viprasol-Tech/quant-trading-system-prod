"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskManager = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
const environment_1 = require("../config/environment");
const logger_1 = require("../config/logger");
class RiskManager {
    constructor() {
        this.peakEquity = new decimal_js_1.default(0);
        this.currentDrawdown = new decimal_js_1.default(0);
        // Load parameters from environment
        this.maxPositionRiskPercent = new decimal_js_1.default(process.env.MAX_POSITION_RISK_PERCENT || environment_1.config.risk?.maxPositionRiskPercent || 0.01);
        this.maxPortfolioHeat = new decimal_js_1.default(process.env.MAX_PORTFOLIO_HEAT || environment_1.config.risk?.maxPortfolioHeat || 0.07);
        this.maxPositions = parseInt(process.env.MAX_POSITIONS || String(environment_1.config.risk?.maxPositions || 8));
        this.maxPerStrategy = parseInt(process.env.MAX_PER_STRATEGY || String(environment_1.config.risk?.maxPerStrategy || 3));
        this.drawdownYellow = new decimal_js_1.default(process.env.DRAWDOWN_YELLOW_PERCENT || 0.05);
        this.drawdownOrange = new decimal_js_1.default(process.env.DRAWDOWN_ORANGE_PERCENT || 0.10);
        this.drawdownRed = new decimal_js_1.default(process.env.DRAWDOWN_RED_PERCENT || 0.15);
        this.drawdownHalt = new decimal_js_1.default(process.env.DRAWDOWN_HALT_PERCENT || 0.20);
        logger_1.logger.info('RiskManager initialized with environment parameters');
    }
    /**
     * Calculate position size based on risk per trade
     */
    calculatePositionSize(equity, riskPercent, entryPrice, stopPrice) {
        const riskAmount = equity.times(new decimal_js_1.default(riskPercent / 100));
        const priceRisk = entryPrice.minus(stopPrice).abs();
        if (priceRisk.isZero())
            return 0;
        const shares = Math.floor(riskAmount.dividedBy(priceRisk).toNumber());
        return Math.max(1, shares);
    }
    /**
     * Calculate ATR-based stop loss
     */
    calculateATRStop(entryPrice, atr, multiplier = 2.5, direction = 'long') {
        const stop = atr.times(new decimal_js_1.default(multiplier));
        if (direction === 'long') {
            return entryPrice.minus(stop);
        }
        else {
            return entryPrice.plus(stop);
        }
    }
    /**
     * Apply hard cap to stop loss (max 5% from entry)
     */
    applyHardCap(entryPrice, stopPrice, maxPercent = 5) {
        const maxStop = entryPrice.times(new decimal_js_1.default(1 - maxPercent / 100));
        // For long positions, ensure stop is not too far
        if (stopPrice.lessThan(maxStop)) {
            return maxStop;
        }
        return stopPrice;
    }
    /**
     * Calculate portfolio heat (total % at risk)
     */
    calculatePortfolioHeat(positions) {
        if (positions.length === 0)
            return new decimal_js_1.default(0);
        let totalHeat = new decimal_js_1.default(0);
        for (const position of positions) {
            const marketValue = new decimal_js_1.default(position.market_value || position.qty * position.current_price || '0');
            const risk = marketValue.times(new decimal_js_1.default(0.05)); // Assume 5% per position as default
            totalHeat = totalHeat.plus(risk);
        }
        return totalHeat;
    }
    /**
     * Check if can add a new trade (comprehensive checks)
     */
    canAddTrade(signal, currentPositions) {
        try {
            // Check max positions limit
            if (currentPositions.length >= this.maxPositions) {
                return { allowed: false, reason: `Max positions (${this.maxPositions}) reached` };
            }
            // Check per-strategy limit
            const strategyPositions = currentPositions.filter(p => p.strategy === signal.strategy);
            if (strategyPositions.length >= this.maxPerStrategy) {
                return {
                    allowed: false,
                    reason: `Max positions per strategy (${this.maxPerStrategy}) reached for ${signal.strategy}`
                };
            }
            // Check portfolio heat
            const currentHeat = this.calculatePortfolioHeat(currentPositions);
            const newRiskPercent = new decimal_js_1.default(signal.riskPercent);
            const projectedHeat = currentHeat.plus(newRiskPercent);
            if (projectedHeat.greaterThan(this.maxPortfolioHeat)) {
                return {
                    allowed: false,
                    reason: `Portfolio heat ${projectedHeat.toFixed(2)} exceeds max ${this.maxPortfolioHeat.toFixed(2)}`
                };
            }
            return { allowed: true };
        }
        catch (error) {
            logger_1.logger.error('Error in canAddTrade:', error);
            return { allowed: false, reason: 'Internal error checking trade limits' };
        }
    }
    /**
     * Update drawdown tracking
     */
    updateDrawdown(currentEquity) {
        if (currentEquity.greaterThan(this.peakEquity)) {
            this.peakEquity = currentEquity;
        }
        this.currentDrawdown = this.peakEquity
            .minus(currentEquity)
            .dividedBy(this.peakEquity)
            .times(new decimal_js_1.default(100));
    }
    /**
     * Calculate take-profit targets
     */
    calculateTakeProfits(entryPrice, stopPrice, rrRatio = new decimal_js_1.default(2)) {
        const riskAmount = entryPrice.minus(stopPrice).abs();
        const tp1 = entryPrice.plus(riskAmount.times(new decimal_js_1.default(1.5))); // 1.5R
        const tp2 = entryPrice.plus(riskAmount.times(rrRatio)); // 2R default
        return { tp1, tp2 };
    }
    /**
     * Get size multiplier based on drawdown level
     */
    getSizeMultiplier() {
        const ddPercent = this.currentDrawdown.toNumber();
        if (ddPercent < this.drawdownYellow.toNumber())
            return new decimal_js_1.default(1.0); // Normal
        if (ddPercent < this.drawdownOrange.toNumber())
            return new decimal_js_1.default(0.75); // Yellow: 75%
        if (ddPercent < this.drawdownRed.toNumber())
            return new decimal_js_1.default(0.50); // Orange: 50%
        if (ddPercent < this.drawdownHalt.toNumber())
            return new decimal_js_1.default(0.25); // Red: 25%
        return new decimal_js_1.default(0); // Halt
    }
    /**
     * Check if trading should be halted
     */
    shouldHalt() {
        return this.currentDrawdown.greaterThanOrEqualTo(new decimal_js_1.default(20));
    }
    /**
     * Get current drawdown percentage
     */
    getCurrentDrawdown() {
        return this.currentDrawdown;
    }
    /**
     * Evaluate a trade signal and return a trade plan if approved
     */
    evaluateTrade(signal, equity, openPositions, atr) {
        // Check if halted
        if (this.shouldHalt()) {
            console.warn('Trading halted - drawdown threshold exceeded');
            return null;
        }
        // Calculate stop loss
        const stopPrice = this.applyHardCap(new decimal_js_1.default(signal.entryPrice), this.calculateATRStop(new decimal_js_1.default(signal.entryPrice), atr, environment_1.config.risk.atrStopMultiplier || 2.5));
        // Calculate position size
        const positionSize = this.calculatePositionSize(equity, 0.01 * 100, new decimal_js_1.default(signal.entryPrice), stopPrice);
        if (positionSize < 1) {
            console.warn('Position size too small');
            return null;
        }
        // Calculate risk amount
        const riskAmount = new decimal_js_1.default(signal.entryPrice)
            .minus(stopPrice)
            .times(new decimal_js_1.default(positionSize));
        // Check portfolio heat using canAddTrade
        const heat = this.canAddTrade(signal, openPositions);
        if (!heat.allowed) {
            logger_1.logger.warn(heat.reason || 'Trade rejected');
            return null;
        }
        // Calculate take profit levels (1.5R and 2R)
        const riskReward = new decimal_js_1.default(signal.entryPrice)
            .minus(stopPrice)
            .abs();
        const tp1 = new decimal_js_1.default(signal.entryPrice).plus(riskReward.times(new decimal_js_1.default(1.5)));
        const tp2 = new decimal_js_1.default(signal.entryPrice).plus(riskReward.times(new decimal_js_1.default(2)));
        // Calculate risk percentage
        const riskPercent = riskAmount.dividedBy(equity).times(new decimal_js_1.default(100));
        // Apply size multiplier based on drawdown
        const sizeMultiplier = this.getSizeMultiplier();
        const adjustedSize = Math.floor(new decimal_js_1.default(positionSize).times(sizeMultiplier).toNumber());
        // Create proper TradePlan object
        const tradeSignal = {
            symbol: signal.symbol,
            direction: 'long',
            entryPrice: new decimal_js_1.default(signal.entryPrice),
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
            riskReward: riskReward.isZero() ? new decimal_js_1.default(0) : tp2.minus(new decimal_js_1.default(signal.entryPrice)).dividedBy(riskReward),
            riskAmount: riskAmount,
            riskPercent: riskPercent.toNumber()
        };
    }
}
exports.RiskManager = RiskManager;
exports.default = new RiskManager();
//# sourceMappingURL=RiskManager.js.map