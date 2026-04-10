"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MuslimXchangeClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../config/logger");
class MuslimXchangeClient {
    constructor(username, password) {
        this.baseUrl = 'https://muslimxchange.com/wp-json/proxy/v1';
        this.cache = new Map();
        this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        this.username = username;
        this.password = password;
        this.client = axios_1.default.create({
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
    async screenTicker(symbol) {
        try {
            // Check cache first
            const cached = this.cache.get(symbol);
            if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                logger_1.logger.info(`Using cached compliance data for ${symbol}`);
                return cached.data;
            }
            logger_1.logger.info(`Screening ${symbol} via Muslim Xchange API...`);
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
            logger_1.logger.info(`${symbol}: ${complianceData.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`);
            return complianceData;
        }
        catch (error) {
            logger_1.logger.warn(`Error screening ${symbol}:`, error instanceof Error ? error.message : 'Unknown error');
            // Return safe default non-compliant response
            return {
                symbol: symbol.toUpperCase(),
                compliant: false,
                verdicts: {},
                businessScreening: 'API error - unable to verify'
            };
        }
    }
    /**
     * Batch screen multiple stocks
     */
    async batchScreenTickers(symbols) {
        try {
            logger_1.logger.info(`Batch screening ${symbols.length} symbols...`);
            const results = await Promise.all(symbols.map(symbol => this.screenTicker(symbol).catch(err => {
                logger_1.logger.warn(`Failed to screen ${symbol}, returning non-compliant`, err);
                return {
                    symbol,
                    compliant: false,
                    verdicts: {},
                    businessScreening: 'Error fetching data'
                };
            })));
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error in batch screening:', error);
            throw error;
        }
    }
    /**
     * Screen multiple stocks by market
     */
    async screenMarket(market) {
        try {
            logger_1.logger.info(`Screening market: ${market}`);
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
                ? response.data.map((item) => this.parseMarketResponse(item))
                : [];
            logger_1.logger.info(`Screened ${results.length} stocks from ${market}`);
            return results;
        }
        catch (error) {
            logger_1.logger.warn(`Error screening market ${market}:`, error instanceof Error ? error.message : 'Unknown error');
            // Return empty array if API fails
            return [];
        }
    }
    /**
     * Filter compliant stocks
     */
    async filterCompliantStocks(symbols) {
        try {
            const results = await this.batchScreenTickers(symbols);
            return results
                .filter(result => result.compliant)
                .map(result => result.symbol);
        }
        catch (error) {
            logger_1.logger.error('Error filtering compliant stocks:', error);
            throw error;
        }
    }
    /**
     * Get compliance score (0-100)
     */
    getComplianceScore(data) {
        let score = 100;
        // Deduct for non-compliant verdicts
        if (data.verdicts.aaoifi === false)
            score -= 25;
        if (data.verdicts.sp === false)
            score -= 20;
        if (data.verdicts.dowJones === false)
            score -= 15;
        if (data.verdicts.msci === false)
            score -= 15;
        if (data.verdicts.ftse === false)
            score -= 10;
        // Deduct for impure income
        if (data.impureIncome?.totalPercentage) {
            score -= Math.min(data.impureIncome.totalPercentage * 10, 25);
        }
        return Math.max(0, Math.min(100, score));
    }
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        logger_1.logger.info('Compliance cache cleared');
    }
    /**
     * Parse API response for ticker endpoint
     * API response format: { Result: "Compliant", AAOIFI: "PASS", FTSE: "PASS", ... }
     */
    parseTickerResponse(symbol, data) {
        const result = data.Result || '';
        const compliant = result.toLowerCase() === 'compliant';
        // Parse verdict strings (PASS/FAIL) to booleans
        const parseVerdict = (verdict) => {
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
    parseMarketResponse(data) {
        const result = data.Result || '';
        const compliant = result.toLowerCase() === 'compliant';
        const parseVerdict = (verdict) => {
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
exports.MuslimXchangeClient = MuslimXchangeClient;
exports.default = MuslimXchangeClient;
//# sourceMappingURL=MuslimXchangeClient.js.map