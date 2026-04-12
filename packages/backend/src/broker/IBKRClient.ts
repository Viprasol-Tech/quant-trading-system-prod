/**
 * @deprecated DO NOT USE
 * This file contains MOCK/FAKE implementations only.
 * Use PythonServiceClient (../../services/PythonServiceClient) for all IBKR data.
 * This file is kept only to avoid breaking TypeScript compilation.
 * It will be removed in a future cleanup.
 */

import Decimal from 'decimal.js';
import { logger } from '../config/logger';
import { config } from '../config/environment';
import axios, { AxiosInstance } from 'axios';

/**
 * IBKR Account Information
 */
export interface IBKRAccount {
  account_id: string;
  account_type: string;
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
  net_liquidation_value: string;
  gross_position_value: string;
  created_at: string;
  updated_at: string;
  daytrade_count: number;
  margin_requirement: string;
  maintenance_excess: string;
  available_funds: string;
}

/**
 * IBKR Position
 */
export interface IBKRPosition {
  contract_id: string;
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
  current_price: string;
  currency: string;
  percentage_of_portfolio: string;
}

/**
 * IBKR Order
 */
export interface IBKROrder {
  order_id: string;
  client_order_id: string;
  symbol: string;
  qty: string;
  filled_qty: string;
  avg_filled_price: string;
  order_type: 'MKT' | 'LMT' | 'STP' | 'STP_LMT';
  side: 'BUY' | 'SELL';
  status: 'PendingSubmit' | 'PreSubmitted' | 'Submitted' | 'ApiPending' | 'ApiCancelled' | 'Cancelled' | 'Filled' | 'Inactive';
  time_in_force: 'DAY' | 'GTC' | 'OPG' | 'CLO';
  limit_price?: string;
  stop_price?: string;
  trailing_stop_pct?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  filled_at?: string;
  canceled_at?: string;
  parent_id?: string;
  transmit?: boolean;
}

/**
 * @deprecated DO NOT USE - Contains mock implementations only
 * Use PythonServiceClient instead for all IBKR integration
 *
 * IBKR Gateway Client
 * Connects to IBKR Gateway via socket and provides REST-like interface
 *
 * Default ports:
 * - Paper trading: 4002
 * - Live trading: 4001
 */
export class IBKRClient {
  private gatewayHost: string;
  private gatewayPort: number;
  private clientId: number;
  private connected: boolean = false;
  private accountId: string | null = null;
  private orderIdCounter: number = 1;
  private orders: Map<string, IBKROrder> = new Map();
  private positions: Map<string, IBKRPosition> = new Map();
  private lastUpdate: number = 0;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 5000; // 5 seconds
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;

  constructor(
    host: string = config.ibkr?.gatewayHost || '127.0.0.1',
    port: number = config.ibkr?.gatewayPort || 4002,
    clientId: number = 1
  ) {
    this.gatewayHost = host;
    this.gatewayPort = port;
    this.clientId = clientId;

    logger.info(`IBKRClient initialized: ${host}:${port} (clientId: ${clientId})`);
  }

  /**
   * Connect to IBKR Gateway
   */
  async connect(): Promise<void> {
    try {
      logger.info(`Connecting to IBKR Gateway at ${this.gatewayHost}:${this.gatewayPort}`);

      // Test connection via health endpoint
      const healthUrl = `http://${this.gatewayHost}:${this.gatewayPort}/health`;
      const response = await axios.get(healthUrl, { timeout: 5000 });

      if (response.status === 200) {
        this.connected = true;
        this.reconnectAttempts = 0;
        logger.info('Connected to IBKR Gateway successfully');
      } else {
        throw new Error(`Gateway health check failed: ${response.status}`);
      }
    } catch (error) {
      logger.error(`Failed to connect to IBKR Gateway:`, error);

      // Exponential backoff reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const waitTime = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        logger.info(`Retrying in ${waitTime}ms...`);
        this.reconnectAttempts++;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.connect();
      }

      throw new Error(
        `Failed to connect to IBKR Gateway after ${this.maxReconnectAttempts} attempts`
      );
    }
  }

  /**
   * Disconnect from IBKR Gateway
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    logger.info('Disconnected from IBKR Gateway');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get account information
   */
  async getAccount(): Promise<IBKRAccount> {
    this.ensureConnected();

    const cacheKey = 'account';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      logger.debug('Fetching account information');

      // Mock implementation - replace with actual IBKR API call
      const account: IBKRAccount = {
        account_id: 'DU123456',
        account_type: 'INDIVIDUAL',
        status: 'Active',
        currency: 'USD',
        buying_power: new Decimal(100000).toString(),
        cash: new Decimal(50000).toString(),
        portfolio_value: new Decimal(150000).toString(),
        equity: new Decimal(150000).toString(),
        long_market_value: new Decimal(100000).toString(),
        short_market_value: new Decimal(0).toString(),
        multiplier: '1',
        shorting_enabled: false,
        day_trading_buying_power: new Decimal(100000).toString(),
        net_liquidation_value: new Decimal(150000).toString(),
        gross_position_value: new Decimal(100000).toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        daytrade_count: 0,
        margin_requirement: new Decimal(0).toString(),
        maintenance_excess: new Decimal(100000).toString(),
        available_funds: new Decimal(100000).toString(),
      };

      this.cacheData(cacheKey, account);
      return account;
    } catch (error) {
      logger.error('Error fetching account:', error);
      throw error;
    }
  }

  /**
   * Get all positions
   */
  async getPositions(): Promise<IBKRPosition[]> {
    this.ensureConnected();

    const cacheKey = 'positions';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      logger.debug('Fetching all positions');

      // Mock implementation - replace with actual IBKR API call
      const positions: IBKRPosition[] = [];
      this.cacheData(cacheKey, positions);
      return positions;
    } catch (error) {
      logger.error('Error fetching positions:', error);
      throw error;
    }
  }

  /**
   * Get specific position
   */
  async getPosition(symbol: string): Promise<IBKRPosition | null> {
    this.ensureConnected();

    try {
      logger.debug(`Fetching position for ${symbol}`);

      const positions = await this.getPositions();
      return positions.find((p) => p.symbol === symbol) || null;
    } catch (error) {
      logger.error(`Error fetching position for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Submit order
   */
  async submitOrder(params: {
    symbol: string;
    qty: number | string;
    side: 'buy' | 'sell';
    order_type: 'market' | 'limit' | 'stop' | 'stop_limit';
    limit_price?: number | string;
    stop_price?: number | string;
    time_in_force?: 'day' | 'gtc' | 'opg' | 'cls';
    extended_hours?: boolean;
    client_order_id?: string;
  }): Promise<IBKROrder> {
    this.ensureConnected();

    try {
      logger.info(`Submitting order: ${params.side} ${params.qty} ${params.symbol}@${params.order_type}`);

      const orderId = `${this.orderIdCounter++}`;
      const clientOrderId = params.client_order_id || `order-${Date.now()}`;

      const order: IBKROrder = {
        order_id: orderId,
        client_order_id: clientOrderId,
        symbol: params.symbol.toUpperCase(),
        qty: new Decimal(params.qty).toString(),
        filled_qty: '0',
        avg_filled_price: '',
        order_type: params.order_type.toUpperCase() as any,
        side: params.side.toUpperCase() as 'BUY' | 'SELL',
        status: 'Submitted',
        time_in_force: (params.time_in_force || 'day').toUpperCase() as any,
        limit_price: params.limit_price ? new Decimal(params.limit_price).toString() : undefined,
        stop_price: params.stop_price ? new Decimal(params.stop_price).toString() : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
      };

      this.orders.set(orderId, order);
      logger.info(`Order submitted: ${orderId}`);

      return order;
    } catch (error) {
      logger.error('Error submitting order:', error);
      throw error;
    }
  }

  /**
   * Cancel specific order
   */
  async cancelOrder(orderId: string): Promise<void> {
    this.ensureConnected();

    try {
      logger.info(`Canceling order: ${orderId}`);

      const order = this.orders.get(orderId);
      if (order) {
        order.status = 'Cancelled';
        order.canceled_at = new Date().toISOString();
        order.updated_at = new Date().toISOString();
      }

      logger.info(`Order canceled: ${orderId}`);
    } catch (error) {
      logger.error(`Error canceling order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(): Promise<void> {
    this.ensureConnected();

    try {
      logger.info('Canceling all orders');

      for (const [orderId, order] of this.orders) {
        if (order.status !== 'Filled' && order.status !== 'Cancelled') {
          await this.cancelOrder(orderId);
        }
      }

      logger.info('All orders canceled');
    } catch (error) {
      logger.error('Error canceling all orders:', error);
      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<IBKROrder> {
    this.ensureConnected();

    try {
      logger.debug(`Fetching order: ${orderId}`);

      const order = this.orders.get(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      return order;
    } catch (error) {
      logger.error(`Error fetching order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Get orders with optional filtering
   */
  async getOrders(params?: {
    status?: string;
    limit?: number;
    nested?: boolean;
    symbols?: string;
  }): Promise<IBKROrder[]> {
    this.ensureConnected();

    try {
      logger.debug('Fetching orders');

      let orders = Array.from(this.orders.values());

      if (params?.status) {
        orders = orders.filter((o) => o.status === params.status);
      }

      if (params?.symbols) {
        const symbols = params.symbols.split(',');
        orders = orders.filter((o) => symbols.includes(o.symbol));
      }

      if (params?.limit) {
        orders = orders.slice(0, params.limit);
      }

      return orders;
    } catch (error) {
      logger.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Close position
   */
  async closePosition(symbol: string, qty?: number | string): Promise<IBKROrder> {
    this.ensureConnected();

    try {
      logger.info(`Closing position: ${symbol}`);

      const position = await this.getPosition(symbol);
      if (!position) {
        throw new Error(`No position found for ${symbol}`);
      }

      const closeQty = qty || position.qty;
      const order = await this.submitOrder({
        symbol,
        qty: closeQty,
        side: position.side === 'long' ? 'sell' : 'buy',
        order_type: 'market',
      });

      logger.info(`Position closed: ${symbol}`);
      return order;
    } catch (error) {
      logger.error(`Error closing position ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get account configuration
   */
  async getAccountConfig(): Promise<Record<string, any>> {
    this.ensureConnected();

    try {
      logger.debug('Fetching account configuration');

      return {
        dtbp_check: 'both',
        trade_blocked_reason: '',
        day_trading_buying_power_multiplier: 4,
        requirements: {
          equity_multi: 2,
          commodity_multiplier: 1,
        },
      };
    } catch (error) {
      logger.error('Error fetching account config:', error);
      throw error;
    }
  }

  /**
   * Get market calendar
   */
  async getCalendar(params?: { start?: string; end?: string }): Promise<any[]> {
    try {
      logger.debug('Fetching market calendar');

      // Mock calendar data
      return [
        {
          date: new Date().toISOString().split('T')[0],
          open: '09:30',
          close: '16:00',
          session: 'regular',
        },
      ];
    } catch (error) {
      logger.error('Error fetching calendar:', error);
      throw error;
    }
  }

  /**
   * Get market clock
   */
  async getClock(): Promise<any> {
    try {
      logger.debug('Fetching market clock');

      const now = new Date();
      const isMarketOpen = this.isMarketOpen(now);

      return {
        timestamp: now.toISOString(),
        is_open: isMarketOpen,
        next_open: new Date(now.getTime() + 86400000).toISOString(),
        next_close: new Date(now.getTime() + 86400000).toISOString(),
      };
    } catch (error) {
      logger.error('Error fetching clock:', error);
      throw error;
    }
  }

  /**
   * Test connection to IBKR Gateway
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      return this.isConnected();
    } catch {
      return false;
    }
  }

  /**
   * Private helper: Ensure connected
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Not connected to IBKR Gateway. Call connect() first.');
    }
  }

  /**
   * Private helper: Get cached data
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      logger.debug(`Cache hit: ${key}`);
      return cached.data;
    }
    return null;
  }

  /**
   * Private helper: Cache data
   */
  private cacheData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Private helper: Check if market is open
   */
  private isMarketOpen(date: Date): boolean {
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    // Market open 9:30-16:00 EST, Monday-Friday
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isMarketHours = hour >= 9 && hour < 16;

    return isWeekday && isMarketHours;
  }
}

export default new IBKRClient();
