import dotenv from 'dotenv';

dotenv.config();

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  return parsed;
}

function getEnvAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

export const config = {
  // Node environment
  node: {
    env: getEnvOrDefault('NODE_ENV', 'development'),
    port: parseInt(process.env.SERVER_PORT || process.env.PORT || '6005'),
    logLevel: getEnvOrDefault('LOG_LEVEL', 'info')
  },

  // Alpaca broker configuration (Legacy)
  alpaca: {
    apiKey: getEnvOrDefault('ALPACA_API_KEY', ''),
    apiSecret: getEnvOrDefault('ALPACA_API_SECRET', ''),
    baseUrl: getEnvOrDefault('ALPACA_BASE_URL', 'https://paper-api.alpaca.markets'),
    dataUrl: getEnvOrDefault('ALPACA_DATA_URL', 'https://data.alpaca.markets')
  },

  // IBKR Gateway configuration (Primary)
  ibkr: {
    gatewayHost: getEnvOrDefault('IBKR_GATEWAY_HOST', '127.0.0.1'),
    gatewayPort: getEnvAsNumber('IBKR_GATEWAY_PORT', 4002), // Paper trading
    username: getEnvOrDefault('IBKR_USERNAME', ''),
    password: getEnvOrDefault('IBKR_PASSWORD', ''),
    accountId: getEnvOrDefault('IBKR_ACCOUNT_ID', ''),
    clientId: getEnvAsNumber('IBKR_CLIENT_ID', 1),
    tradingMode: getEnvOrDefault('IBKR_TRADING_MODE', 'paper') // paper or live
  },

  // Massive API configuration (Market Data)
  massive: {
    apiKey: getEnvOrDefault('MASSIVE_API_KEY', ''),
    apiUrl: getEnvOrDefault('MASSIVE_API_URL', 'https://api.polygon.io')
  },

  // Python computation service
  python: {
    serviceUrl: getEnvOrDefault('PYTHON_SERVICE_URL', 'http://localhost:8000'),
    timeout: parseInt(process.env.PYTHON_SERVICE_TIMEOUT || '30000')
  },

  // Risk management
  risk: {
    // Position sizing
    maxPositionRiskPercent: getEnvAsNumber('MAX_POSITION_RISK_PERCENT', 0.01),
    maxPositionSizePercent: getEnvAsNumber('MAX_POSITION_SIZE_PERCENT', 0.15),
    kellyCeiling: getEnvAsNumber('KELLY_CEILING', 0.25),

    // Portfolio management
    maxPortfolioHeat: getEnvAsNumber('MAX_PORTFOLIO_HEAT', 0.07),
    maxPositions: parseInt(process.env.MAX_POSITIONS || '8'),
    maxPerStrategy: parseInt(process.env.MAX_PER_STRATEGY || '3'),
    maxSectorPercent: getEnvAsNumber('MAX_SECTOR_PERCENT', 0.25),

    // Stop-loss settings
    maxStopPercent: getEnvAsNumber('MAX_STOP_PERCENT', 0.05),
    atrStopMultiplier: getEnvAsNumber('ATR_STOP_MULTIPLIER', 2.5),
    chandelierMultiplier: getEnvAsNumber('CHANDELIER_MULTIPLIER', 3.0),
    useFixedPercentStop: getEnvAsBoolean('USE_FIXED_PERCENT_STOP', false),

    // Drawdown circuit breakers
    drawdownYellowPercent: getEnvAsNumber('DRAWDOWN_YELLOW_PERCENT', 0.05),
    drawdownOrangePercent: getEnvAsNumber('DRAWDOWN_ORANGE_PERCENT', 0.10),
    drawdownRedPercent: getEnvAsNumber('DRAWDOWN_RED_PERCENT', 0.15),
    drawdownHaltPercent: getEnvAsNumber('DRAWDOWN_HALT_PERCENT', 0.20),

    // Take-profit targets
    takeProfitRRRatio: getEnvAsNumber('TAKE_PROFIT_RR_RATIO', 2.0),
    partialExitPct: getEnvAsNumber('PARTIAL_EXIT_PCT', 0.33),
    trailRemaining: getEnvAsBoolean('TRAIL_REMAINING', true)
  },

  // Strategy parameters
  strategies: {
    strategy1: {
      enabled: getEnvAsBoolean('STRATEGY_1_ENABLED', true),
      atrPeriod: parseInt(process.env.STRATEGY_1_ATR_PERIOD || '14'),
      atrMultiplier: getEnvAsNumber('STRATEGY_1_ATR_MULTIPLIER', 2.5),
      maFast: parseInt(process.env.STRATEGY_1_MA_FAST || '50'),
      maSlow: parseInt(process.env.STRATEGY_1_MA_SLOW || '200'),
      rsiPeriod: parseInt(process.env.STRATEGY_1_RSI_PERIOD || '14'),
      rsiMin: parseInt(process.env.STRATEGY_1_RSI_MIN || '40'),
      rsiMax: parseInt(process.env.STRATEGY_1_RSI_MAX || '70'),
      rvolThreshold: getEnvAsNumber('STRATEGY_1_RVOL_THRESHOLD', 1.5),
      minConfidence: parseInt(process.env.STRATEGY_1_MIN_CONFIDENCE || '60')
    },
    strategy2: {
      enabled: getEnvAsBoolean('STRATEGY_2_ENABLED', true),
      maPeriod: parseInt(process.env.STRATEGY_2_MA_PERIOD || '50'),
      fibLevelMin: getEnvAsNumber('STRATEGY_2_FIB_LEVEL_MIN', 0.382),
      fibLevelMax: getEnvAsNumber('STRATEGY_2_FIB_LEVEL_MAX', 0.618),
      rsiPeriod: parseInt(process.env.STRATEGY_2_RSI_PERIOD || '14'),
      rsiThreshold: parseInt(process.env.STRATEGY_2_RSI_THRESHOLD || '50'),
      volumeThreshold: getEnvAsNumber('STRATEGY_2_VOLUME_THRESHOLD', 0.8),
      minConfidence: parseInt(process.env.STRATEGY_2_MIN_CONFIDENCE || '60')
    },
    strategy3: {
      enabled: getEnvAsBoolean('STRATEGY_3_ENABLED', true),
      trendWeight: getEnvAsNumber('STRATEGY_3_TREND_WEIGHT', 0.25),
      momentumWeight: getEnvAsNumber('STRATEGY_3_MOMENTUM_WEIGHT', 0.20),
      volumeWeight: getEnvAsNumber('STRATEGY_3_VOLUME_WEIGHT', 0.15),
      patternWeight: getEnvAsNumber('STRATEGY_3_PATTERN_WEIGHT', 0.15),
      regimeWeight: getEnvAsNumber('STRATEGY_3_REGIME_WEIGHT', 0.15),
      volatilityWeight: getEnvAsNumber('STRATEGY_3_VOLATILITY_WEIGHT', 0.10),
      threshold: parseInt(process.env.STRATEGY_3_THRESHOLD || '65'),
      minConfidence: parseInt(process.env.STRATEGY_3_MIN_CONFIDENCE || '60')
    }
  },

  // Technical indicators
  indicators: {
    maPeriods: (process.env.MA_PERIODS || '50,100,200').split(',').map(x => parseInt(x)),
    rsi: {
      period: parseInt(process.env.RSI_PERIOD || '14'),
      overbought: parseInt(process.env.RSI_OVERBOUGHT || '70'),
      oversold: parseInt(process.env.RSI_OVERSOLD || '30')
    },
    macd: {
      fast: parseInt(process.env.MACD_FAST || '12'),
      slow: parseInt(process.env.MACD_SLOW || '26'),
      signal: parseInt(process.env.MACD_SIGNAL || '9')
    },
    bb: {
      period: parseInt(process.env.BB_PERIOD || '20'),
      stdDev: getEnvAsNumber('BB_STD_DEV', 2.0)
    },
    atr: {
      period: parseInt(process.env.ATR_PERIOD || '14')
    }
  },

  // Market parameters
  market: {
    primaryTimeframe: getEnvOrDefault('PRIMARY_TIMEFRAME', '1D'),
    secondaryTimeframes: (process.env.SECONDARY_TIMEFRAMES || '4H,1W').split(','),
    marketOpenHour: parseInt(process.env.MARKET_OPEN_HOUR || '9'),
    marketOpenMinute: parseInt(process.env.MARKET_OPEN_MINUTE || '30'),
    marketCloseHour: parseInt(process.env.MARKET_CLOSE_HOUR || '16'),
    marketCloseMinute: parseInt(process.env.MARKET_CLOSE_MINUTE || '0'),
    tradingTimezone: getEnvOrDefault('TRADING_TIMEZONE', 'America/New_York'),
    slippageBps: parseInt(process.env.SLIPPAGE_BPS || '5'),
    commissionPerShare: getEnvAsNumber('COMMISSION_PER_SHARE', 0.0),
    lookbackPeriodDays: parseInt(process.env.LOOKBACK_PERIOD_DAYS || '252'),
    minDataPoints: parseInt(process.env.MIN_DATA_POINTS || '100')
  },

  // Shariah compliance
  shariah: {
    enabled: getEnvAsBoolean('SHARIAH_ENABLED', true),
    equityDebtLimit: getEnvAsNumber('SHARIAH_EQUITY_DEBT_LIMIT', 0.30),
    haramIncomeLimit: getEnvAsNumber('SHARIAH_HARAM_INCOME_LIMIT', 0.05),
    enforceLongOnly: getEnvAsBoolean('ENFORCE_LONG_ONLY', true),
    enforceNoLeverage: getEnvAsBoolean('ENFORCE_NO_LEVERAGE', true),
    enforceNoDerivatives: getEnvAsBoolean('ENFORCE_NO_DERIVATIVES', true)
  },

  // Notifications
  notifications: {
    enableTradeAlerts: getEnvAsBoolean('ENABLE_TRADE_ALERTS', true),
    alertOnSignal: getEnvAsBoolean('ALERT_ON_SIGNAL', true),
    alertOnRiskLimit: getEnvAsBoolean('ALERT_ON_RISK_LIMIT', true),
    alertOnError: getEnvAsBoolean('ALERT_ON_ERROR', true)
  },

  // Health checks
  health: {
    checkIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS || '10000'),
    timeoutMs: parseInt(process.env.HEALTH_CHECK_TIMEOUT_MS || '5000')
  }
};
