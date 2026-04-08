import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';
import { config } from '../config/environment';

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n: number;
  vw: number;
}

export interface AlpacaBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  vw?: number;
  n?: number;
}

export class DataProvider {
  private alpacaClient: AxiosInstance;
  private cache: Map<string, OHLCV[]> = new Map();

  constructor() {
    this.alpacaClient = axios.create({
      baseURL: config.alpaca.dataUrl,
      headers: {
        'APCA-API-KEY-ID': config.alpaca.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  /**
   * Fetch OHLCV data from Alpaca
   */
  async fetchOHLCV(
    symbol: string,
    start: Date,
    end: Date,
    timeframe: string = '1D'
  ): Promise<OHLCV[]> {
    const cacheKey = `${symbol}-${timeframe}-${start.toISOString()}-${end.toISOString()}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    try {
      logger.info(`Fetching ${symbol} OHLCV data from ${start.toDateString()} to ${end.toDateString()}`);

      const response = await this.alpacaClient.get(`/v1/bars`, {
        params: {
          symbols: symbol,
          timeframe,
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          limit: 10000,
          adjustment: 'raw'
        }
      });

      const bars: AlpacaBar[] = response.data.bars?.[symbol] || [];

      const ohlcv: OHLCV[] = bars.map((bar: AlpacaBar) => ({
        timestamp: new Date(bar.t * 1000),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }));

      // Sort by timestamp ascending
      ohlcv.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Cache result
      this.cache.set(cacheKey, ohlcv);

      logger.info(`Retrieved ${ohlcv.length} bars for ${symbol}`);
      return ohlcv;
    } catch (error) {
      logger.error(`Failed to fetch OHLCV for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch multiple symbols in parallel
   */
  async fetchMultipleOHLCV(
    symbols: string[],
    start: Date,
    end: Date,
    timeframe: string = '1D'
  ): Promise<Map<string, OHLCV[]>> {
    try {
      logger.info(`Fetching ${symbols.length} symbols OHLCV data`);

      const results = new Map<string, OHLCV[]>();

      // Fetch in batches to avoid rate limiting
      const batchSize = 10;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchPromises = batch.map((symbol) =>
          this.fetchOHLCV(symbol, start, end, timeframe)
            .then((data) => ({ symbol, data }))
            .catch((error) => {
              logger.warn(`Failed to fetch ${symbol}:`, error.message);
              return { symbol, data: [] };
            })
        );

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ symbol, data }) => {
          results.set(symbol, data);
        });

        // Add delay between batches
        if (i + batchSize < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to fetch multiple OHLCV:', error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific symbol
   */
  clearCache(symbol?: string, timeframe?: string): void {
    if (symbol && timeframe) {
      const keysToDelete = Array.from(this.cache.keys()).filter(
        (key) => key.startsWith(`${symbol}-${timeframe}`)
      );
      keysToDelete.forEach((key) => this.cache.delete(key));
      logger.debug(`Cleared cache for ${symbol}-${timeframe}`);
    } else if (symbol) {
      const keysToDelete = Array.from(this.cache.keys()).filter(
        (key) => key.startsWith(symbol)
      );
      keysToDelete.forEach((key) => this.cache.delete(key));
      logger.debug(`Cleared cache for ${symbol}`);
    } else {
      this.cache.clear();
      logger.debug('Cleared all cache');
    }
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Validate OHLCV data
   */
  static validateData(data: OHLCV[]): boolean {
    if (data.length === 0) {
      logger.warn('Empty OHLCV data');
      return false;
    }

    for (const bar of data) {
      if (
        !bar.timestamp ||
        bar.open <= 0 ||
        bar.high <= 0 ||
        bar.low <= 0 ||
        bar.close <= 0 ||
        bar.volume < 0
      ) {
        logger.warn('Invalid OHLCV bar:', bar);
        return false;
      }

      if (bar.high < bar.low || bar.high < bar.open || bar.high < bar.close) {
        logger.warn('High < Low/Open/Close:', bar);
        return false;
      }

      if (bar.low > bar.open || bar.low > bar.close) {
        logger.warn('Low > Open/Close:', bar);
        return false;
      }
    }

    return true;
  }
}

export default DataProvider;
