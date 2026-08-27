import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "breakout_scanner.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        exchange TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        price REAL NOT NULL,
        breakout_type TEXT NOT NULL,
        score INTEGER NOT NULL,
        quality TEXT NOT NULL,
        ai_confidence INTEGER NOT NULL,
        holding_period TEXT DEFAULT 'Swing Entry (3 - 7 Days)',
        entry_min REAL NOT NULL,
        entry_max REAL NOT NULL,
        stop_loss REAL NOT NULL,
        target_1 REAL NOT NULL,
        target_2 REAL NOT NULL,
        target_3 REAL,
        risk_reward REAL NOT NULL,
        indicators_json TEXT,
        trade_setup_json TEXT,
        ai_analysis_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'ACTIVE'
    )
    """)

    # Ensure holding_period column exists if database was created earlier
    try:
        cursor.execute("ALTER TABLE alerts ADD COLUMN holding_period TEXT DEFAULT 'Swing Entry (3 - 7 Days)'")
    except Exception:
        pass

    # Watchlist Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL UNIQUE,
        exchange TEXT NOT NULL DEFAULT 'NSE',
        name TEXT,
        sector TEXT,
        alert_enabled INTEGER DEFAULT 1,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Paper Trades Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS paper_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        exchange TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        entry_price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        stop_loss REAL NOT NULL,
        target_1 REAL NOT NULL,
        target_2 REAL NOT NULL,
        current_price REAL NOT NULL,
        status TEXT DEFAULT 'OPEN',
        pnl REAL DEFAULT 0.0,
        pnl_percent REAL DEFAULT 0.0,
        entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        exit_time TIMESTAMP,
        exit_price REAL,
        exit_reason TEXT
    )
    """)

    # Backtest Runs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS backtest_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        total_trades INTEGER NOT NULL,
        winning_trades INTEGER NOT NULL,
        losing_trades INTEGER NOT NULL,
        win_rate REAL NOT NULL,
        profit_factor REAL NOT NULL,
        max_drawdown REAL NOT NULL,
        net_profit REAL NOT NULL,
        results_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Settings Store Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Insert default watchlist if empty
    cursor.execute("SELECT COUNT(*) as count FROM watchlist")
    count = cursor.fetchone()["count"]
    if count == 0:
        default_stocks = [
            ("RELIANCE", "NSE", "Reliance Industries Ltd", "Energy"),
            ("TCS", "NSE", "Tata Consultancy Services Ltd", "IT"),
            ("HDFCBANK", "NSE", "HDFC Bank Ltd", "Banking"),
            ("INFY", "NSE", "Infosys Ltd", "IT"),
            ("ICICIBANK", "NSE", "ICICI Bank Ltd", "Banking"),
            ("BHARTIARTL", "NSE", "Bharti Airtel Ltd", "Telecom"),
            ("SBIN", "NSE", "State Bank of India", "Banking"),
            ("ITC", "NSE", "ITC Ltd", "FMCG"),
            ("TATAMOTORS", "NSE", "Tata Motors Ltd", "Automobile"),
            ("LT", "NSE", "Larsen & Toubro Ltd", "Infrastructure"),
            ("SUNPHARMA", "NSE", "Sun Pharmaceutical Industries", "Pharma"),
            ("MARUTI", "NSE", "Maruti Suzuki India Ltd", "Automobile"),
            ("BAJFINANCE", "NSE", "Bajaj Finance Ltd", "Financial Services"),
            ("TITAN", "NSE", "Titan Company Ltd", "Consumer Durables"),
            ("TATASTEEL", "NSE", "Tata Steel Ltd", "Metals")
        ]
        cursor.executemany(
            "INSERT INTO watchlist (symbol, exchange, name, sector) VALUES (?, ?, ?, ?)",
            default_stocks
        )

    conn.commit()
    conn.close()

# Initialize DB on module import
init_db()
