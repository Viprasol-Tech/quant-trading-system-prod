import { logger } from '../config/logger';
import { config } from '../config/environment';

export interface EquityFinancials {
  symbol: string;
  marketCap: number;
  totalDebt: number;
  totalAssets: number;
  haramIncome: number; // Riba (interest), haram business income
  percentageHaramIncome: number;
}

export interface ScreeningResult {
  symbol: string;
  isCompliant: boolean;
  reasons: string[];
  score: number; // 0-100, higher is better
}

/**
 * AAOIFI Standard No. 21 - Shariah Compliance Screening
 * - Debt/Market Cap < 30%
 * - Haram income < 5%
 * - No involvement in prohibited industries
 */
export class ShariahScreener {
  private prohibitedIndustries = [
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

  private prohibitedCompanies = [
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

  /**
   * Screen equity for Shariah compliance
   */
  screenEquity(financials: EquityFinancials): ScreeningResult {
    const reasons: string[] = [];
    let isCompliant = true;
    let score = 100;

    // Check if company is in prohibited list
    if (this.prohibitedCompanies.includes(financials.symbol.toUpperCase())) {
      reasons.push('Company in prohibited list');
      isCompliant = false;
      score = 0;
      logger.warn(`${financials.symbol} is in prohibited list`);
      return { symbol: financials.symbol, isCompliant, reasons, score };
    }

    // Check debt/market cap ratio (AAOIFI: < 30%)
    const debtRatio = financials.totalDebt / financials.marketCap;
    if (debtRatio > config.shariah.equityDebtLimit) {
      reasons.push(
        `Debt/Market Cap ratio ${(debtRatio * 100).toFixed(2)}% exceeds limit of ${(config.shariah.equityDebtLimit * 100).toFixed(2)}%`
      );
      isCompliant = false;
      score -= 30;
    } else {
      // Score higher for lower debt ratio
      score += (config.shariah.equityDebtLimit - debtRatio) * 30;
    }

    // Check haram income percentage (AAOIFI: < 5%)
    if (financials.percentageHaramIncome > config.shariah.haramIncomeLimit) {
      reasons.push(
        `Haram income ${(financials.percentageHaramIncome * 100).toFixed(2)}% exceeds limit of ${(config.shariah.haramIncomeLimit * 100).toFixed(2)}%`
      );
      isCompliant = false;
      score -= 40;
    } else {
      // Score higher for lower haram income
      score += (config.shariah.haramIncomeLimit - financials.percentageHaramIncome) * 40;
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    if (isCompliant) {
      logger.info(`✓ ${financials.symbol} passed Shariah screening (score: ${score.toFixed(0)})`);
    } else {
      logger.warn(`✗ ${financials.symbol} failed Shariah screening: ${reasons.join(', ')}`);
    }

    return { symbol: financials.symbol, isCompliant, reasons, score };
  }

  /**
   * Screen multiple equities
   */
  screenMultiple(equities: EquityFinancials[]): ScreeningResult[] {
    return equities.map((equity) => this.screenEquity(equity));
  }

  /**
   * Filter compliant equities
   */
  filterCompliant(equities: EquityFinancials[]): EquityFinancials[] {
    return equities.filter((equity) => {
      const result = this.screenEquity(equity);
      return result.isCompliant;
    });
  }

  /**
   * Get Shariah score (0-100)
   */
  getScore(financials: EquityFinancials): number {
    return this.screenEquity(financials).score;
  }

  /**
   * Check if industry is prohibited
   */
  isProhibitedIndustry(industry: string): boolean {
    const lowerIndustry = industry.toLowerCase();
    return this.prohibitedIndustries.some((prohibited) =>
      lowerIndustry.includes(prohibited)
    );
  }

  /**
   * Check if company is in prohibited list
   */
  isProhibitedCompany(symbol: string): boolean {
    return this.prohibitedCompanies.includes(symbol.toUpperCase());
  }

  /**
   * Add custom prohibited company
   */
  addProhibitedCompany(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    if (!this.prohibitedCompanies.includes(upperSymbol)) {
      this.prohibitedCompanies.push(upperSymbol);
      logger.info(`Added ${upperSymbol} to prohibited list`);
    }
  }

  /**
   * Remove from prohibited list
   */
  removeProhibitedCompany(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    const index = this.prohibitedCompanies.indexOf(upperSymbol);
    if (index !== -1) {
      this.prohibitedCompanies.splice(index, 1);
      logger.info(`Removed ${upperSymbol} from prohibited list`);
    }
  }
}

export default ShariahScreener;
