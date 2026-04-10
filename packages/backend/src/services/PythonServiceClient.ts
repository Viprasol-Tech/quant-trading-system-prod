/**
 * Python Service Client
 * Connects to Python service (port 6105) for REAL IBKR data
 * NO MOCK DATA - everything from actual IBKR connection
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';
import { config } from '../config/environment';

export interface AccountSummary {
  account_id: string;
  net_liquidation: string;
  total_cash: string;
  buying_power: string;
  gross_position_value: string;
  available_funds: string;
  excess_liquidity: string;
  currency: string;
}

export interface Position {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string | null;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: 'long' | 'short';
}

export interface Order {
  order_id: string;
  symbol: string;
  qty: string;
  filled_qty: string;
  side: 'BUY' | 'SELL';
  order_type: string;
  status: string;
  limit_price?: string;
  stop_price?: string;
  created_at: string;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  timestamp: string;
}

export interface HealthStatus {
  status: string;
  ibkr_connected: boolean;
  timestamp: string;
}

class PythonServiceClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private connected: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 10000; // 10 seconds

  constructor() {
    // Python service runs on port 6105
    this.baseUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:6105';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Python Service: ${response.config.method?.toUpperCase()} ${response.config.url} -> ${response.status}`);
        return response;
      },
      (error) => {
        logger.error(`Python Service Error: ${error.message}`);
        throw error;
      }
    );

    logger.info(`PythonServiceClient initialized: ${this.baseUrl}`);
  }

  /**
   * Check if Python service and IBKR are connected
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await this.client.get<HealthStatus>('/health');
      this.connected = response.data.ibkr_connected;
      this.lastHealthCheck = Date.now();
      return response.data;
    } catch (error) {
      this.connected = false;
      logger.error('Python service health check failed:', error);
      return {
        status: 'unhealthy',
        ibkr_connected: false,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get connection status (cached)
   */
  async isConnected(): Promise<boolean> {
    // Re-check if stale
    if (Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
      await this.checkHealth();
    }
    return this.connected;
  }

  /**
   * Get account summary - REAL DATA
   */
  async getAccountSummary(): Promise<AccountSummary | null> {
    try {
      const response = await this.client.get('/account/summary');
      return response.data;
    } catch (error) {
      logger.error('Failed to get account summary:', error);
      return null;
    }
  }

  /**
   * Get all positions - REAL DATA
   */
  async getPositions(): Promise<Position[]> {
    try {
      const response = await this.client.get('/positions');
      return response.data || [];
    } catch (error) {
      logger.error('Failed to get positions:', error);
      return [];
    }
  }

  /**
   * Get open orders - REAL DATA
   */
  async getOrders(): Promise<Order[]> {
    try {
      const response = await this.client.get('/orders');
      return response.data || [];
    } catch (error) {
      logger.error('Failed to get orders:', error);
      return [];
    }
  }

  /**
   * Submit order - REAL EXECUTION
   */
  async submitOrder(params: {
    symbol: string;
    quantity: number;
    order_type: 'MKT' | 'LMT' | 'STP';
    price?: number;
  }): Promise<Order | null> {
    try {
      const response = await this.client.post('/orders', params);
      return response.data;
    } catch (error) {
      logger.error('Failed to submit order:', error);
      return null;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.client.delete(`/orders/${orderId}`);
      return true;
    } catch (error) {
      logger.error('Failed to cancel order:', error);
      return false;
    }
  }

  /**
   * Get market data for symbol - REAL DATA
   */
  async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      const response = await this.client.get(`/market/${symbol}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get market data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get historical data
   */
  async getHistoricalData(
    symbol: string,
    barSize: string = '1 day',
    duration: string = '1 M'
  ): Promise<any[]> {
    try {
      const response = await this.client.get(`/historical/${symbol}`, {
        params: { bar_size: barSize, duration },
      });
      return response.data || [];
    } catch (error) {
      logger.error(`Failed to get historical data for ${symbol}:`, error);
      return [];
    }
  }
}

// Singleton instance
export const pythonService = new PythonServiceClient();
export default pythonService;
