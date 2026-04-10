import Decimal from 'decimal.js';
import { TradeSignal, TradePlan, Position } from '../types';
export declare class RiskManager {
    private peakEquity;
    private currentDrawdown;
    private maxPositionRiskPercent;
    private maxPortfolioHeat;
    private maxPositions;
    private maxPerStrategy;
    private drawdownYellow;
    private drawdownOrange;
    private drawdownRed;
    private drawdownHalt;
    constructor();
    /**
     * Calculate position size based on risk per trade
     */
    calculatePositionSize(equity: Decimal, riskPercent: number, entryPrice: Decimal, stopPrice: Decimal): number;
    /**
     * Calculate ATR-based stop loss
     */
    calculateATRStop(entryPrice: Decimal, atr: Decimal, multiplier?: number, direction?: 'long' | 'short'): Decimal;
    /**
     * Apply hard cap to stop loss (max 5% from entry)
     */
    applyHardCap(entryPrice: Decimal, stopPrice: Decimal, maxPercent?: number): Decimal;
    /**
     * Calculate portfolio heat (total % at risk)
     */
    calculatePortfolioHeat(positions: any[]): Decimal;
    /**
     * Check if can add a new trade (comprehensive checks)
     */
    canAddTrade(signal: TradeSignal, currentPositions: Position[]): {
        allowed: boolean;
        reason?: string;
    };
    /**
     * Update drawdown tracking
     */
    updateDrawdown(currentEquity: Decimal): void;
    /**
     * Calculate take-profit targets
     */
    calculateTakeProfits(entryPrice: Decimal, stopPrice: Decimal, rrRatio?: Decimal): {
        tp1: Decimal;
        tp2: Decimal;
    };
    /**
     * Get size multiplier based on drawdown level
     */
    getSizeMultiplier(): Decimal;
    /**
     * Check if trading should be halted
     */
    shouldHalt(): boolean;
    /**
     * Get current drawdown percentage
     */
    getCurrentDrawdown(): Decimal;
    /**
     * Evaluate a trade signal and return a trade plan if approved
     */
    evaluateTrade(signal: TradeSignal, equity: Decimal, openPositions: any[], atr: Decimal): TradePlan | null;
}
declare const _default: RiskManager;
export default _default;
//# sourceMappingURL=RiskManager.d.ts.map