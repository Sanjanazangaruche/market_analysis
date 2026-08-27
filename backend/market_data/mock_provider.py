import math
import random
import time
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from backend.market_data.base import MarketDataProvider
from backend.models.schemas import StockQuote, MarketIndex

class MockMarketDataProvider(MarketDataProvider):
    """
    Realistic Mock Market Data Provider for offline testing, UI demonstration,
    and simulated breakout scenarios.
    Clearly designated as MOCK MODE.
    """

    def __init__(self):
        # Base prices for known Indian stocks
        self._base_prices = {
            "RELIANCE": 2980.50,
            "TCS": 4150.00,
            "HDFCBANK": 1675.20,
            "INFY": 1820.75,
            "ICICIBANK": 1240.30,
            "BHARTIARTL": 1580.40,
            "SBIN": 845.60,
            "ITC": 495.20,
            "KOTAKBANK": 1810.00,
            "LT": 3650.00,
            "AXISBANK": 1210.50,
            "ASIANPAINT": 2890.00,
            "MARUTI": 12350.00,
            "TITAN": 3560.00,
            "BAJFINANCE": 7180.00,
            "TATAMOTORS": 1040.50,
            "SUNPHARMA": 1720.00,
            "ULTRACEMCO": 11250.00,
            "TATASTEEL": 162.40,
            "WIPRO": 540.20,
            "NTPC": 410.00,
            "POWERGRID": 335.50,
            "M&M": 2850.00,
            "JSWSTEEL": 960.00,
            "ADANIENT": 3120.00,
            "ADANIPORTS": 1460.00,
            "COALINDIA": 510.00,
            "HCLTECH": 1740.00,
            "ONGC": 320.00
        }

        # Preset stocks that simulate strong breakouts for demonstration
        self._breakout_archetypes = {
            "RELIANCE": "BULLISH_BREAKOUT",
            "BHARTIARTL": "BULLISH_BREAKOUT",
            "TATAMOTORS": "RETEST_CONFIRMED",
            "TATASTEEL": "CONSOLIDATION_BREAKOUT",
            "INFY": "BEARISH_BREAKDOWN",
            "BAJFINANCE": "BULLISH_BREAKOUT",
            "HDFCBANK": "CONSOLIDATION"
        }

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

    def _get_time_delta(self, timeframe: str) -> timedelta:
        tf = timeframe.lower()
        if tf == "5m":
            return timedelta(minutes=5)
        elif tf == "15m":
            return timedelta(minutes=15)
        elif tf == "1h" or tf == "60m":
            return timedelta(hours=1)
        elif tf == "1d" or tf == "daily":
            return timedelta(days=1)
        return timedelta(minutes=15)

    def get_candles(self, symbol: str, timeframe: str = "15m", count: int = 100, exchange: str = "NSE") -> pd.DataFrame:
        clean_sym = symbol.replace(".NS", "").replace(".BO", "").replace("^", "").upper()
        base_price = self._base_prices.get(clean_sym, 1500.0)
        
        # Use deterministic seed based on symbol and hour to have consistent yet evolving candles
        current_hour_seed = int(time.time() // 300) + sum(ord(c) for c in clean_sym)
        rng = np.random.RandomState(current_hour_seed)

        archetype = self._breakout_archetypes.get(clean_sym, "RANDOM_WALK")
        dt_step = self._get_time_delta(timeframe)
        now = datetime.now().replace(second=0, microsecond=0)

        # Generate realistic price path
        prices = [base_price]
        volumes = []

        # Generate base volatility
        volatility = 0.003 if "m" in timeframe else 0.012

        for i in range(1, count):
            # If approaching the end and archetype is breakout, synthesize the setup
            if i > count - 8 and archetype == "BULLISH_BREAKOUT":
                # Strong upward push with big candles
                drift = 0.008 + rng.uniform(0.002, 0.006)
                vol = int(rng.uniform(150000, 350000))
            elif i > count - 8 and archetype == "BEARISH_BREAKDOWN":
                # Strong downward push
                drift = -0.007 - rng.uniform(0.002, 0.005)
                vol = int(rng.uniform(120000, 280000))
            elif i > count - 8 and archetype == "RETEST_CONFIRMED":
                # Breakout earlier, slight dip, then bounce
                if i < count - 3:
                    drift = 0.006
                elif i < count - 1:
                    drift = -0.002 # pullback/retest
                else:
                    drift = 0.007 # bounce from retest
                vol = int(rng.uniform(110000, 250000))
            elif archetype == "CONSOLIDATION_BREAKOUT" and i > count - 4:
                drift = 0.009
                vol = int(rng.uniform(180000, 380000))
            else:
                # Normal fluctuating market
                drift = rng.normal(0.0002, volatility)
                vol = int(rng.uniform(30000, 90000))

            next_price = max(1.0, prices[-1] * (1.0 + drift))
            prices.append(next_price)
            volumes.append(vol)

        volumes.insert(0, int(rng.uniform(40000, 80000)))

        rows = []
        for i in range(count):
            candle_time = now - dt_step * (count - 1 - i)
            c_close = prices[i]
            c_open = prices[i-1] if i > 0 else c_close * (1.0 + rng.uniform(-0.002, 0.002))
            
            # Make high and low encompass open and close
            high_ext = abs(c_close * rng.uniform(0.001, 0.004))
            low_ext = abs(c_close * rng.uniform(0.001, 0.004))
            c_high = max(c_open, c_close) + high_ext
            c_low = min(c_open, c_close) - low_ext
            c_vol = volumes[i]

            rows.append({
                "timestamp": candle_time.strftime("%Y-%m-%d %H:%M:%S"),
                "open": round(c_open, 2),
                "high": round(c_high, 2),
                "low": round(c_low, 2),
                "close": round(c_close, 2),
                "volume": float(c_vol)
            })

        df = pd.DataFrame(rows)
        return df

    def get_quote(self, symbol: str, exchange: str = "NSE") -> Optional[StockQuote]:
        clean_sym = symbol.replace(".NS", "").replace(".BO", "").replace("^", "").upper()
        df = self.get_candles(clean_sym, timeframe="15m", count=25, exchange=exchange)
        
        last_row = df.iloc[-1]
        prev_row = df.iloc[-2]

        curr_price = float(last_row['close'])
        prev_close = float(prev_row['close'])
        change = curr_price - prev_close
        change_pct = (change / prev_close * 100.0)

        info = self._company_names.get(clean_sym, (clean_sym, "General"))

        return StockQuote(
            symbol=clean_sym,
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
            avg_volume=round(float(df['volume'].mean()), 0),
            timestamp=str(last_row['timestamp'])
        )

    def get_market_indices(self) -> List[MarketIndex]:
        return [
            MarketIndex(
                symbol="^NSEI",
                name="NIFTY 50",
                price=24850.40,
                change=142.60,
                change_percent=0.58,
                trend="BULLISH",
                advance_count=34,
                decline_count=16
            ),
            MarketIndex(
                symbol="^NSEBANK",
                name="BANK NIFTY",
                price=51280.75,
                change=320.15,
                change_percent=0.63,
                trend="BULLISH",
                advance_count=9,
                decline_count=3
            ),
            MarketIndex(
                symbol="^BSESN",
                name="SENSEX",
                price=81520.10,
                change=480.30,
                change_percent=0.59,
                trend="BULLISH",
                advance_count=21,
                decline_count=9
            )
        ]

    def get_multi_timeframe_data(self, symbol: str, timeframes: List[str] = ["5m", "15m", "1h", "1d"], exchange: str = "NSE") -> Dict[str, pd.DataFrame]:
        data = {}
        for tf in timeframes:
            data[tf] = self.get_candles(symbol, timeframe=tf, count=100, exchange=exchange)
        return data

    def is_market_open(self) -> bool:
        return True
