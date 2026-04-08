import axios, { AxiosInstance } from 'axios';
import Decimal from 'decimal.js';
import { logger } from '../config/logger';
import { config } from '../config/environment';

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  long_market_value: string;
  short_market_value: string;
  multiplier: string;
  shorting_enabled: boolean;
  day_trading_buying_power: string;
  regt_buying_power: string;
  sma: string;
  created_at: string;
  updated_at: string;
  daytrade_count: number;
  last_maintenance_margin: string;
  daytrading_buying_power: string;
  cash_withdrawable: string;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_gain: string;
  unrealized_gain_pct: string;
  unrealized_intraday_gain: string;
  unrealized_intraday_gain_pct: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  replaced_by: string | null;
  replaces: string | null;
  symbol: string;
  asset_id: string;
  asset_class: string;
  notional: string | null;
  qty: string | null;
  filled_qty: string;
  filled_avg_price: string | null;
  order_class: string;
  order_type: string;
  type: string;
  side: 'buy' | 'sell';
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  extended_hours: boolean;
  legs: null;
  trail_price: string | null;
  trail_percent: string | null;
  hwm: string | null;
}

export interface AlpacaTrade {
  id: string;
  account_number: string;
  symbol: string;
  asset_id: string;
  asset_class: string;
  exchange: string;
  order_id: string;
  order_client_id: string;
  direction: string;
  order_type: string;
  price: string;
  quantity: string;
  side: 'buy' | 'sell';
  timestamp: string;
  leaves_qty: string;
  cum_qty: string;
  filled_avg_price: string;
  filled_qty: string;
  type: string;
}

export class AlpacaClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(apiKey: string = config.alpaca.apiKey, apiSecret: string = config.alpaca.apiSecret) {
    this.baseUrl = config.alpaca.baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-SECRET-KEY': apiSecret,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Alpaca API error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message
        });
        throw error;
      }
    );
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<AlpacaAccount> {
    try {
      const response = await this.client.get<AlpacaAccount>('/v2/account');
      logger.info('Account fetched successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to get account:', error);
      throw error;
    }
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    try {
      const response = await this.client.get<AlpacaPosition[]>('/v2/positions');
      logger.info(`Retrieved ${response.data.length} positions`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get positions:', error);
      throw error;
    }
  }

  /**
   * Get specific position by symbol
   */
  async getPosition(symbol: string): Promise<AlpacaPosition> {
    try {
      const response = await this.client.get<AlpacaPosition>(`/v2/positions/${symbol}`);
      logger.info(`Position retrieved for ${symbol}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get position for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Submit a new order
   */
  async submitOrder(params: {
    symbol: string;
    qty?: number;
    notional?: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit' | 'stop' | 'stop_limit';
    time_in_force?: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
    limit_price?: number;
    stop_price?: number;
    extended_hours?: boolean;
    order_class?: string;
    take_profit?: { limit_price: number };
    stop_loss?: { stop_price: number };
  }): Promise<AlpacaOrder> {
    try {
      const response = await this.client.post<AlpacaOrder>('/v2/orders', params);
      logger.info(`Order submitted: ${params.symbol} ${params.side} ${params.qty || params.notional}`);
      return response.data;
    } catch (error) {
      logger.error('Order submission failed:', error);
      throw error;
    }
  }

  /**
   * Cancel an order by ID
   */
  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.client.delete(`/v2/orders/${orderId}`);
      logger.info(`Order cancelled: ${orderId}`);
    } catch (error) {
      logger.error('Order cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(): Promise<void> {
    try {
      await this.client.delete('/v2/orders');
      logger.info('All orders cancelled');
    } catch (error) {
      logger.error('Cancel all orders failed:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<AlpacaOrder> {
    try {
      const response = await this.client.get<AlpacaOrder>(`/v2/orders/${orderId}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to get order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get all orders
   */
  async getOrders(params?: {
    status?: 'open' | 'closed' | 'all';
    limit?: number;
    after?: string;
    until?: string;
    direction?: 'asc' | 'desc';
    nested?: boolean;
    side?: 'buy' | 'sell';
  }): Promise<AlpacaOrder[]> {
    try {
      const response = await this.client.get<AlpacaOrder[]>('/v2/orders', { params });
      return response.data;
    } catch (error) {
      logger.error('Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Close a position
   */
  async closePosition(symbol: string, qty?: number | string): Promise<AlpacaOrder> {
    try {
      const response = await this.client.delete<AlpacaOrder>(`/v2/positions/${symbol}`, {
        params: { qty }
      });
      logger.info(`Position closed: ${symbol}`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to close position ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get account configuration
   */
  async getAccountConfig(): Promise<Record<string, any>> {
    try {
      const response = await this.client.get('/v2/account/configurations');
      return response.data;
    } catch (error) {
      logger.error('Failed to get account config:', error);
      throw error;
    }
  }

  /**
   * Get calendar (trading hours)
   */
  async getCalendar(params?: { start?: string; end?: string }): Promise<any[]> {
    try {
      const response = await this.client.get('/v1/calendar', { params });
      return response.data;
    } catch (error) {
      logger.error('Failed to get calendar:', error);
      throw error;
    }
  }

  /**
   * Get clock (market status)
   */
  async getClock(): Promise<any> {
    try {
      const response = await this.client.get('/v1/clock');
      return response.data;
    } catch (error) {
      logger.error('Failed to get clock:', error);
      throw error;
    }
  }
}

export default AlpacaClient;
