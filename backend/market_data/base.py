from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import pandas as pd
from backend.models.schemas import StockQuote, MarketIndex

class MarketDataProvider(ABC):
    """
    Abstract Base Class for Market Data Providers.
    Any live NSE/BSE broker/feed (Zerodha Kite, Angel One, Upstox, Yahoo Finance, AlphaVantage, etc.)
    can be plugged in without modifying the scanner core.
    """

    @abstractmethod
    def get_candles(self, symbol: str, timeframe: str = "15m", count: int = 100, exchange: str = "NSE") -> pd.DataFrame:
        """
        Fetch historical candle dataframe with columns:
        ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        """
        pass

    @abstractmethod
    def get_quote(self, symbol: str, exchange: str = "NSE") -> Optional[StockQuote]:
        """Fetch current live or latest quote for a stock."""
        pass

    @abstractmethod
    def get_market_indices(self) -> List[MarketIndex]:
        """Fetch major benchmark indices (NIFTY 50, BANK NIFTY, SENSEX)."""
        pass

    @abstractmethod
    def get_multi_timeframe_data(self, symbol: str, timeframes: List[str] = ["5m", "15m", "1h", "1d"], exchange: str = "NSE") -> Dict[str, pd.DataFrame]:
        """Fetch candles for multiple timeframes in a single call."""
        pass

    @abstractmethod
    def is_market_open(self) -> bool:
        """Check if Indian market (NSE/BSE) is currently open."""
        pass
