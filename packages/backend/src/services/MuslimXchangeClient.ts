import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

export interface ComplianceData {
  symbol: string;
  compliant: boolean;
  result?: string; // "Compliant" or "Non-Compliant"
  verdicts: {
    aaoifi?: boolean;
    sp?: boolean;
    dowJones?: boolean;
    msci?: boolean;
    ftse?: boolean;
  };
  verdictStrings?: {
    aaoifi?: string;
    sp?: string;
    dowJones?: string;
    msci?: string;
    ftse?: string;
  };
  impureIncome?: {
    totalPercentage: number;
    interestIncome: number;
    haram: number;
  };
  purificationAmount?: number;
  zakatPerShare?: number;
  debtRatio?: number;
  businessScreening?: string;
  lastUpdated?: string;
}

export class MuslimXchangeClient {
  private client: AxiosInstance;
  private baseUrl = 'https://muslimxchange.com/wp-json/proxy/v1';
  private username: string;
  private password: string; // API password (not login password)
  private cache: Map<string, { data: ComplianceData; timestamp: number }> = new Map();
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }


  /**
   * Screen a single stock by ticker symbol
   */
  async screenTicker(symbol: string): Promise<ComplianceData> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        logger.info(`Using cached compliance data for ${symbol}`);
        return cached.data;
      }

      logger.info(`Screening ${symbol} via Muslim Xchange API...`);

      const response = await this.client.get('/ticker-data', {
        params: {
          username: this.username,
          password: this.password,
          ticker: symbol.toUpperCase(),
          fields: 'Result,AAOIFI,FTSE,DJIM,SP500,MSCI,TotalImpurePct,ZakatPerShare'
        }
      });

      const complianceData = this.parseTickerResponse(symbol, response.data);

      // Cache the result
      this.cache.set(symbol, {
        data: complianceData,
        timestamp: Date.now()
      });

      logger.info(`${symbol}: ${complianceData.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);

      return complianceData;
    } catch (error) {
      logger.warn(`Error screening ${symbol}:`, error instanceof Error ? error.message : 'Unknown error');
      // Return safe default non-compliant response
      return {
        symbol: symbol.toUpperCase(),
        compliant: false,
        verdicts: {},
        businessScreening: 'API error - unable to verify'
      } as ComplianceData;
    }
  }

  /**
   * Batch screen multiple stocks
   */
  async batchScreenTickers(symbols: string[]): Promise<ComplianceData[]> {
    try {
      logger.info(`Batch screening ${symbols.length} symbols...`);

      const results = await Promise.all(
        symbols.map(symbol => this.screenTicker(symbol).catch(err => {
          logger.warn(`Failed to screen ${symbol}, returning non-compliant`, err);
          return {
            symbol,
            compliant: false,
            verdicts: {},
            businessScreening: 'Error fetching data'
          } as ComplianceData;
        }))
      );

      return results;
    } catch (error) {
      logger.error('Error in batch screening:', error);
      throw error;
    }
  }

  /**
   * Screen multiple stocks by market
   */
  async screenMarket(market: string): Promise<ComplianceData[]> {
    try {
      logger.info(`Screening market: ${market}`);

      const response = await this.client.get('/batch/market-data', {
        params: {
          username: this.username,
          password: this.password,
          market: market.toUpperCase(),
          fields: 'ticker,Result,AAOIFI,FTSE,DJIM,SP500,MSCI,TotalImpurePct,ZakatPerShare'
        }
      });

      // Response is array of objects
      const results = Array.isArray(response.data)
        ? response.data.map((item: any) => this.parseMarketResponse(item))
        : [];

      logger.info(`Screened ${results.length} stocks from ${market}`);

      return results;
    } catch (error) {
      logger.warn(`Error screening market ${market}:`, error instanceof Error ? error.message : 'Unknown error');
      // Return empty array if API fails
      return [];
    }
  }

  /**
   * Filter compliant stocks
   */
  async filterCompliantStocks(symbols: string[]): Promise<string[]> {
    try {
      const results = await this.batchScreenTickers(symbols);
      return results
        .filter(result => result.compliant)
        .map(result => result.symbol);
    } catch (error) {
      logger.error('Error filtering compliant stocks:', error);
      throw error;
    }
  }

  /**
   * Get compliance score (0-100)
   */
  getComplianceScore(data: ComplianceData): number {
    let score = 100;

    // Deduct for non-compliant verdicts
    if (data.verdicts.aaoifi === false) score -= 25;
    if (data.verdicts.sp === false) score -= 20;
    if (data.verdicts.dowJones === false) score -= 15;
    if (data.verdicts.msci === false) score -= 15;
    if (data.verdicts.ftse === false) score -= 10;

    // Deduct for impure income
    if (data.impureIncome?.totalPercentage) {
      score -= Math.min(data.impureIncome.totalPercentage * 10, 25);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Compliance cache cleared');
  }

  /**
   * Parse API response for ticker endpoint
   * API response format: { Result: "Compliant", AAOIFI: "PASS", FTSE: "PASS", ... }
   */
  private parseTickerResponse(symbol: string, data: any): ComplianceData {
    const result = data.Result || '';
    const compliant = result.toLowerCase() === 'compliant';

    // Parse verdict strings (PASS/FAIL) to booleans
    const parseVerdict = (verdict: string): boolean => {
      return verdict?.toUpperCase() === 'PASS';
    };

    return {
      symbol: symbol.toUpperCase(),
      compliant,
      result,
      verdicts: {
        aaoifi: parseVerdict(data.AAOIFI),
        sp: parseVerdict(data.SP500),
        dowJones: parseVerdict(data.DJIM),
        msci: parseVerdict(data.MSCI),
        ftse: parseVerdict(data.FTSE)
      },
      verdictStrings: {
        aaoifi: data.AAOIFI,
        sp: data.SP500,
        dowJones: data.DJIM,
        msci: data.MSCI,
        ftse: data.FTSE
      },
      impureIncome: data.TotalImpurePct ? {
        totalPercentage: parseFloat(data.TotalImpurePct) || 0,
        interestIncome: 0,
        haram: 0
      } : undefined,
      zakatPerShare: data.ZakatPerShare ? parseFloat(data.ZakatPerShare) : undefined,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Parse API response for batch market endpoint
   */
  private parseMarketResponse(data: any): ComplianceData {
    const result = data.Result || '';
    const compliant = result.toLowerCase() === 'compliant';

    const parseVerdict = (verdict: string): boolean => {
      return verdict?.toUpperCase() === 'PASS';
    };

    return {
      symbol: (data.ticker || data.symbol || 'UNKNOWN').toUpperCase(),
      compliant,
      result,
      verdicts: {
        aaoifi: parseVerdict(data.AAOIFI),
        sp: parseVerdict(data.SP500),
        dowJones: parseVerdict(data.DJIM),
        msci: parseVerdict(data.MSCI),
        ftse: parseVerdict(data.FTSE)
      },
      impureIncome: data.TotalImpurePct ? {
        totalPercentage: parseFloat(data.TotalImpurePct) || 0,
        interestIncome: 0,
        haram: 0
      } : undefined,
      zakatPerShare: data.ZakatPerShare ? parseFloat(data.ZakatPerShare) : undefined,
      lastUpdated: new Date().toISOString()
    };
  }
}

export default MuslimXchangeClient;
