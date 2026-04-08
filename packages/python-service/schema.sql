-- Create extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    account_type VARCHAR(32),
    ibkr_account VARCHAR(32),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id),
    symbol VARCHAR(32) NOT NULL,
    quantity INT NOT NULL,
    avg_cost DECIMAL(12,4),
    market_value DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, symbol)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id),
    symbol VARCHAR(32) NOT NULL,
    order_type VARCHAR(32),
    side VARCHAR(32),
    quantity INT NOT NULL,
    price DECIMAL(12,4),
    status VARCHAR(32) DEFAULT 'PENDING',
    ib_order_id VARCHAR(32),
    submitted_at TIMESTAMP,
    filled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id),
    order_id INT REFERENCES orders(id),
    symbol VARCHAR(32),
    quantity INT,
    price DECIMAL(12,4),
    commission DECIMAL(10,4),
    side VARCHAR(32),
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signals table
CREATE TABLE IF NOT EXISTS signals (
    id SERIAL PRIMARY KEY,
    account_id INT NOT NULL REFERENCES accounts(id),
    strategy_name VARCHAR(256),
    symbol VARCHAR(32),
    signal_type VARCHAR(32),
    confidence DECIMAL(5,4),
    entry_price DECIMAL(12,4),
    stop_price DECIMAL(12,4),
    target_price DECIMAL(12,4),
    shariah_compliant BOOLEAN DEFAULT TRUE,
    generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market data table (time-series)
CREATE TABLE IF NOT EXISTS market_data (
    time TIMESTAMP NOT NULL,
    symbol VARCHAR(32) NOT NULL,
    open DECIMAL(12,2),
    high DECIMAL(12,2),
    low DECIMAL(12,2),
    close DECIMAL(12,2),
    volume BIGINT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_positions_account ON positions(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_account ON orders(account_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_account ON signals(account_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol, time DESC);

-- Hypertable for time-series (optional, requires timescaledb)
SELECT create_hypertable('market_data', 'time', IF EXISTS => TRUE) ON CONFLICT DO NOTHING;
