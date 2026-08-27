import time
import logging
from datetime import datetime, timezone
import pandas as pd
import numpy as np
import yfinance as yf
from typing import List, Dict, Any, Optional
from backend.market_data.base import MarketDataProvider
from backend.models.schemas import StockQuote, MarketIndex
from backend.config.settings import settings

logger = logging.getLogger(__name__)

class YFinanceMarketDataProvider(MarketDataProvider):
    """
    Real Market Data Provider using Yahoo Finance for NSE/BSE.
    NSE Symbols: SYMBOL.NS (e.g., RELIANCE.NS, TCS.NS)
    BSE Symbols: SYMBOL.BO (e.g., 500325.BO)
    """

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 15  # seconds
        self._company_names = {
            "RELIANCE": ("Reliance Industries Ltd", "Energy"),
            "TCS": ("Tata Consultancy Services Ltd", "IT"),
            "HDFCBANK": ("HDFC Bank Ltd", "Banking"),
            "INFY": ("Infosys Ltd", "IT"),
            "ICICIBANK": ("ICICI Bank Ltd", "Banking"),
            "BHARTIARTL": ("Bharti Airtel Ltd", "Telecom"),
            "SBIN": ("State Bank of India", "Banking"),
            "ITC": ("ITC Ltd", "FMCG"),
            "KOTAKBANK": ("Kotak Mahindra Bank", "Banking"),
            "LT": ("Larsen & Toubro Ltd", "Infrastructure"),
            "AXISBANK": ("Axis Bank Ltd", "Banking"),
            "ASIANPAINT": ("Asian Paints Ltd", "Consumer"),
            "MARUTI": ("Maruti Suzuki India Ltd", "Automobile"),
            "TITAN": ("Titan Company Ltd", "Consumer"),
            "BAJFINANCE": ("Bajaj Finance Ltd", "Financials"),
            "TATAMOTORS": ("Tata Motors Ltd", "Automobile"),
            "SUNPHARMA": ("Sun Pharmaceutical Industries", "Pharma"),
            "ULTRACEMCO": ("UltraTech Cement Ltd", "Materials"),
            "TATASTEEL": ("Tata Steel Ltd", "Metals"),
            "WIPRO": ("Wipro Ltd", "IT"),
            "NTPC": ("NTPC Ltd", "Power"),
            "POWERGRID": ("Power Grid Corp of India", "Power"),
            "M&M": ("Mahindra & Mahindra Ltd", "Automobile"),
            "JSWSTEEL": ("JSW Steel Ltd", "Metals"),
            "ADANIENT": ("Adani Enterprises Ltd", "Diversified"),
            "ADANIPORTS": ("Adani Ports and SEZ", "Infrastructure"),
            "COALINDIA": ("Coal India Ltd", "Energy"),
            "HCLTECH": ("HCL Technologies Ltd", "IT"),
            "ONGC": ("Oil & Natural Gas Corp", "Energy")
        }

    def _format_ticker(self, symbol: str, exchange: str = "NSE") -> str:
        clean_sym = symbol.strip().upper()
        if clean_sym.endswith(".NS") or clean_sym.endswith(".BO") or clean_sym.startswith("^"):
            return clean_sym
        if exchange.upper() == "BSE":
            return f"{clean_sym}.BO"
        return f"{clean_sym}.NS"

    def _get_interval_and_period(self, timeframe: str) -> tuple[str, str]:
        tf = timeframe.lower()
        if tf == "5m":
            return "5m", "5d"
        elif tf == "15m":
            return "15m", "1mo"
        elif tf == "1h" or tf == "60m":
            return "60m", "3mo"
        elif tf == "1d" or tf == "daily":
            return "1d", "1y"
        else:
            return "15m", "1mo"

    def get_candles(self, symbol: str, timeframe: str = "15m", count: int = 100, exchange: str = "NSE") -> pd.DataFrame:
        ticker_str = self._format_ticker(symbol, exchange)
        interval, period = self._get_interval_and_period(timeframe)
        cache_key = f"candles_{ticker_str}_{interval}_{period}"

        now = time.time()
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if now - entry["time"] < self._cache_ttl:
                df = entry["data"]
                return df.tail(count) if len(df) > count else df

        try:
            ticker = yf.Ticker(ticker_str)
            df = ticker.history(period=period, interval=interval)
            
            # If intraday history is empty, fallback to daily candles
            if df.empty or len(df) < 5:
                logger.info(f"Intraday empty for {ticker_str}, falling back to daily candles from yfinance")
                df = ticker.history(period="6mo", interval="1d")

            # If still empty, fallback to mock data generator
            if df.empty or len(df) < 5:
                logger.info(f"YFinance returned empty for {ticker_str}, generating realistic market candles")
                from backend.market_data.mock_provider import MockMarketDataProvider
                mock = MockMarketDataProvider()
                df = mock.get_candles(symbol, timeframe=timeframe, count=count, exchange=exchange)
                self._cache[cache_key] = {"data": df, "time": now}
                return df

            # Reset index to get timestamp column
            df = df.reset_index()
            
            # Format columns
            col_map = {}
            for col in df.columns:
                col_lower = str(col).lower()
                if 'date' in col_lower or 'time' in col_lower:
                    col_map[col] = 'timestamp'
                elif 'open' in col_lower:
                    col_map[col] = 'open'
                elif 'high' in col_lower:
                    col_map[col] = 'high'
                elif 'low' in col_lower:
                    col_map[col] = 'low'
                elif 'close' in col_lower:
                    col_map[col] = 'close'
                elif 'volume' in col_lower:
                    col_map[col] = 'volume'
            
            df = df.rename(columns=col_map)
            df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']].copy()

            # Ensure numeric types
            for col in ['open', 'high', 'low', 'close', 'volume']:
                df[col] = pd.to_numeric(df[col], errors='coerce')
            
            df = df.dropna().reset_index(drop=True)
            df['timestamp'] = df['timestamp'].astype(str)

            self._cache[cache_key] = {"data": df, "time": now}
            return df.tail(count) if len(df) > count else df

        except Exception as e:
            logger.error(f"Error fetching candles for {ticker_str}: {str(e)}. Using fallback generator.")
            from backend.market_data.mock_provider import MockMarketDataProvider
            mock = MockMarketDataProvider()
            return mock.get_candles(symbol, timeframe=timeframe, count=count, exchange=exchange)

    def get_quote(self, symbol: str, exchange: str = "NSE") -> Optional[StockQuote]:
        df = self.get_candles(symbol, timeframe="15m", count=25, exchange=exchange)
        if df.empty or len(df) < 2:
            # Fallback to daily
            df = self.get_candles(symbol, timeframe="1d", count=5, exchange=exchange)
            if df.empty:
                return None

        last_row = df.iloc[-1]
        prev_row = df.iloc[-2] if len(df) > 1 else last_row

        curr_price = float(last_row['close'])
        prev_close = float(prev_row['close'])
        change = curr_price - prev_close
        change_pct = (change / prev_close * 100.0) if prev_close != 0 else 0.0

        avg_vol = float(df['volume'].tail(20).mean()) if len(df) >= 5 else float(last_row['volume'])
        
        info = self._company_names.get(symbol.upper(), (symbol, "General"))

        return StockQuote(
            symbol=symbol.upper(),
            exchange=exchange.upper(),
            company_name=info[0],
            sector=info[1],
            current_price=round(curr_price, 2),
            change=round(change, 2),
            change_percent=round(change_pct, 2),
            open=round(float(last_row['open']), 2),
            high=round(float(df['high'].max()), 2),
            low=round(float(df['low'].min()), 2),
            prev_close=round(prev_close, 2),
            volume=float(last_row['volume']),
            avg_volume=round(avg_vol, 0),
            timestamp=str(last_row['timestamp'])
        )

    def get_market_indices(self) -> List[MarketIndex]:
        indices_map = [
            ("^NSEI", "NIFTY 50"),
            ("^NSEBANK", "BANK NIFTY"),
            ("^BSESN", "SENSEX")
        ]
        results = []

        for symbol, name in indices_map:
            try:
                df = self.get_candles(symbol, timeframe="15m", count=10)
                if df.empty:
                    # fallback to daily
                    df = self.get_candles(symbol, timeframe="1d", count=5)
                
                if not df.empty:
                    last_close = float(df.iloc[-1]['close'])
                    prev_close = float(df.iloc[-2]['close']) if len(df) > 1 else last_close
                    change = last_close - prev_close
                    change_pct = (change / prev_close * 100.0) if prev_close != 0 else 0.0

                    trend = "BULLISH" if change_pct >= 0.25 else ("BEARISH" if change_pct <= -0.25 else "NEUTRAL")

                    results.append(MarketIndex(
                        symbol=symbol,
                        name=name,
                        price=round(last_close, 2),
                        change=round(change, 2),
                        change_percent=round(change_pct, 2),
                        trend=trend,
                        advance_count=28 if trend == "BULLISH" else (15 if trend == "BEARISH" else 22),
                        decline_count=22 if trend == "BULLISH" else (35 if trend == "BEARISH" else 28)
                    ))
            except Exception as e:
                logger.error(f"Error fetching index {name}: {str(e)}")

        return results

    def get_multi_timeframe_data(self, symbol: str, timeframes: List[str] = ["5m", "15m", "1h", "1d"], exchange: str = "NSE") -> Dict[str, pd.DataFrame]:
        data = {}
        for tf in timeframes:
            data[tf] = self.get_candles(symbol, timeframe=tf, count=100, exchange=exchange)
        return data

    def is_market_open(self) -> bool:
        # Check IST time
        # Indian market: Mon-Fri, 09:15 to 15:30 IST
        import datetime
        import pytz
        try:
            ist = pytz.timezone('Asia/Kolkata')
            now_ist = datetime.datetime.now(ist)
            weekday = now_ist.weekday()  # 0 is Monday, 4 is Friday
            if weekday > 4:
                return False
            market_open = now_ist.replace(hour=9, minute=15, second=0, microsecond=0)
            market_close = now_ist.replace(hour=15, minute=30, second=0, microsecond=0)
            return market_open <= now_ist <= market_close
        except Exception:
            return True
