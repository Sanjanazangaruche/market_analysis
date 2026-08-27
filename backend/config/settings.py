import os
from typing import Dict, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App config
    APP_NAME: str = "AI NSE/BSE Breakout Scanner"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "127.0.0.1"

    # Database
    DATABASE_URL: str = "sqlite:///./breakout_scanner.db"

    # API Keys
    OPENAI_API_KEY: str = Field(default="")
    OPENAI_MODEL: str = "gpt-4o-mini"
    MARKET_DATA_API_KEY: str = Field(default="")

    # Data Provider: 'yfinance', 'mock'
    DEFAULT_DATA_PROVIDER: str = "yfinance"

    # Scanner Settings
    DEFAULT_SCAN_INTERVAL_MINUTES: int = 5
    AUTO_SCAN_ENABLED: bool = False
    DEFAULT_TIMEFRAME: str = "15m"  # 5m, 15m, 1h, 1d
    SUPPORTED_TIMEFRAMES: List[str] = ["5m", "15m", "1h", "1d"]

    # Minimum Alert Thresholds (Only high conviction >= 90% AI confidence)
    MIN_ALERT_SCORE: int = 80
    MIN_ALERT_CONFIDENCE: int = 90
    MIN_RISK_REWARD: float = 1.5

    # Scoring Weights (Total 100)
    WEIGHT_SR_BREAKOUT: int = 20
    WEIGHT_VOLUME_CONFIRM: int = 15
    WEIGHT_EMA_TREND: int = 15
    WEIGHT_RSI_MOMENTUM: int = 10
    WEIGHT_MACD_CONFIRM: int = 10
    WEIGHT_ADX_STRENGTH: int = 10
    WEIGHT_VWAP: int = 5
    WEIGHT_SUPERTREND: int = 5
    WEIGHT_PRICE_ACTION: int = 5
    WEIGHT_RISK_REWARD: int = 5

    # Default Stock Universe
    NSE_TOP_STOCKS: List[str] = [
        "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", 
        "HINDUNILVR", "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK",
        "LT", "AXISBANK", "ASIANPAINT", "MARUTI", "TITAN",
        "BAJFINANCE", "TATAMOTORS", "SUNPHARMA", "ULTRACEMCO", "TATASTEEL",
        "WIPRO", "NTPC", "POWERGRID", "M&M", "JSWSTEEL",
        "ADANIENT", "ADANIPORTS", "COALINDIA", "HCLTECH", "ONGC"
    ]

    BSE_TOP_STOCKS: List[str] = [
        "500325", "532540", "500180", "500209", "500696", "532174"
    ]

    # Market Timings (IST: 09:15 to 15:30)
    MARKET_OPEN_TIME: str = "09:15"
    MARKET_CLOSE_TIME: str = "15:30"
    TIMEZONE: str = "Asia/Kolkata"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
