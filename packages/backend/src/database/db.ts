import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'trading.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

logger.info(`Database initialized at ${DB_PATH}`);

// Create tables
const initializeDatabase = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS backtest_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id TEXT NOT NULL,
        strategy_name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        initial_capital REAL NOT NULL,
        final_capital REAL NOT NULL,
        total_return REAL NOT NULL,
        total_return_pct REAL NOT NULL,
        max_drawdown REAL NOT NULL,
        sharpe_ratio REAL NOT NULL,
        sortino_ratio REAL,
        calmar_ratio REAL,
        win_rate REAL NOT NULL,
        total_trades INTEGER NOT NULL,
        profit_factor REAL NOT NULL,
        expectancy REAL,
        equity_curve TEXT,
        trades TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS signals_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        strategy TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit REAL NOT NULL,
        confidence INTEGER NOT NULL,
        rating TEXT,
        reasoning TEXT,
        shariah_compliant INTEGER DEFAULT 1,
        acted_on INTEGER DEFAULT 0,
        order_id TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS trade_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        entry_price REAL,
        exit_price REAL,
        entry_date TEXT,
        exit_date TEXT,
        pnl REAL,
        pnl_pct REAL,
        strategy TEXT,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS system_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database tables:', error);
    throw error;
  }
};

initializeDatabase();

export default db;
