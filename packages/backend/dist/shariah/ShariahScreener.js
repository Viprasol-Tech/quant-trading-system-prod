"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShariahScreener = void 0;
const logger_1 = require("../config/logger");
const environment_1 = require("../config/environment");
/**
 * AAOIFI Standard No. 21 - Shariah Compliance Screening
 * - Debt/Market Cap < 30%
 * - Haram income < 5%
 * - No involvement in prohibited industries
 */
class ShariahScreener {
    constructor() {
        this.prohibitedIndustries = [
            'alcohol',
            'tobacco',
            'pork',
            'gambling',
            'weapons',
            'adult',
            'interest-bearing',
            'conventional-bank',
            'insurance',
            'entertainment'
        ];
        this.prohibitedCompanies = [
            'BAC', // Bank of America
            'C', // Citigroup
            'JPM', // JPMorgan
            'WFC', // Wells Fargo
            'GS', // Goldman Sachs
            'MS', // Morgan Stanley
            'BLK', // BlackRock
            'PG', // Procter & Gamble (involved with alcohol/tobacco)
            'MO', // Altria (tobacco)
            'IBM' // Historical issues
        ];
    }
    /**
     * Screen equity for Shariah compliance
     */
    screenEquity(financials) {
        const reasons = [];
        let isCompliant = true;
        let score = 100;
        // Check if company is in prohibited list
        if (this.prohibitedCompanies.includes(financials.symbol.toUpperCase())) {
            reasons.push('Company in prohibited list');
            isCompliant = false;
            score = 0;
            logger_1.logger.warn(`${financials.symbol} is in prohibited list`);
            return { symbol: financials.symbol, isCompliant, reasons, score };
        }
        // Check debt/market cap ratio (AAOIFI: < 30%)
        const debtRatio = financials.totalDebt / financials.marketCap;
        if (debtRatio > environment_1.config.shariah.equityDebtLimit) {
            reasons.push(`Debt/Market Cap ratio ${(debtRatio * 100).toFixed(2)}% exceeds limit of ${(environment_1.config.shariah.equityDebtLimit * 100).toFixed(2)}%`);
            isCompliant = false;
            score -= 30;
        }
        else {
            // Score higher for lower debt ratio
            score += (environment_1.config.shariah.equityDebtLimit - debtRatio) * 30;
        }
        // Check haram income percentage (AAOIFI: < 5%)
        if (financials.percentageHaramIncome > environment_1.config.shariah.haramIncomeLimit) {
            reasons.push(`Haram income ${(financials.percentageHaramIncome * 100).toFixed(2)}% exceeds limit of ${(environment_1.config.shariah.haramIncomeLimit * 100).toFixed(2)}%`);
            isCompliant = false;
            score -= 40;
        }
        else {
            // Score higher for lower haram income
            score += (environment_1.config.shariah.haramIncomeLimit - financials.percentageHaramIncome) * 40;
        }
        // Ensure score is within bounds
        score = Math.max(0, Math.min(100, score));
        if (isCompliant) {
            logger_1.logger.info(`✓ ${financials.symbol} passed Shariah screening (score: ${score.toFixed(0)})`);
        }
        else {
            logger_1.logger.warn(`✗ ${financials.symbol} failed Shariah screening: ${reasons.join(', ')}`);
        }
        return { symbol: financials.symbol, isCompliant, reasons, score };
    }
    /**
     * Screen multiple equities
     */
    screenMultiple(equities) {
        return equities.map((equity) => this.screenEquity(equity));
    }
    /**
     * Filter compliant equities
     */
    filterCompliant(equities) {
        return equities.filter((equity) => {
            const result = this.screenEquity(equity);
            return result.isCompliant;
        });
    }
    /**
     * Get Shariah score (0-100)
     */
    getScore(financials) {
        return this.screenEquity(financials).score;
    }
    /**
     * Check if industry is prohibited
     */
    isProhibitedIndustry(industry) {
        const lowerIndustry = industry.toLowerCase();
        return this.prohibitedIndustries.some((prohibited) => lowerIndustry.includes(prohibited));
    }
    /**
     * Check if company is in prohibited list
     */
    isProhibitedCompany(symbol) {
        return this.prohibitedCompanies.includes(symbol.toUpperCase());
    }
    /**
     * Add custom prohibited company
     */
    addProhibitedCompany(symbol) {
        const upperSymbol = symbol.toUpperCase();
        if (!this.prohibitedCompanies.includes(upperSymbol)) {
            this.prohibitedCompanies.push(upperSymbol);
            logger_1.logger.info(`Added ${upperSymbol} to prohibited list`);
        }
    }
    /**
     * Remove from prohibited list
     */
    removeProhibitedCompany(symbol) {
        const upperSymbol = symbol.toUpperCase();
        const index = this.prohibitedCompanies.indexOf(upperSymbol);
        if (index !== -1) {
            this.prohibitedCompanies.splice(index, 1);
            logger_1.logger.info(`Removed ${upperSymbol} from prohibited list`);
        }
    }
}
exports.ShariahScreener = ShariahScreener;
exports.default = ShariahScreener;
//# sourceMappingURL=ShariahScreener.js.map