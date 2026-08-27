import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple
from backend.models.schemas import (
    TechnicalIndicators, EMAValues, RSIValues, MACDValues,
    VWAPValues, ADXValues, SupertrendValues, ATRValues, VolumeAnalysis
)

class IndicatorEngine:
    """
    High-performance Vectorized Technical Indicator Engine.
    Computes EMA, RSI, MACD, VWAP, ADX, Supertrend, ATR, and Volume metrics.
    """

    @staticmethod
    def calculate_ema(series: pd.Series, span: int) -> pd.Series:
        return series.ewm(span=span, adjust=False).mean()

    @staticmethod
    def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
        delta = series.diff()
        gain = (delta.where(delta > 0, 0.0))
        loss = (-delta.where(delta < 0, 0.0))

        avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
        avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()

        rs = avg_gain / avg_loss.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50.0)

    @staticmethod
    def calculate_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[pd.Series, pd.Series, pd.Series]:
        ema_fast = series.ewm(span=fast, adjust=False).mean()
        ema_slow = series.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    @staticmethod
    def calculate_vwap(df: pd.DataFrame) -> pd.Series:
        typical_price = (df['high'] + df['low'] + df['close']) / 3.0
        # If timestamp contains date, reset VWAP daily if possible, or cumulative rolling
        try:
            dates = pd.to_datetime(df['timestamp']).dt.date
            cum_vol = df.groupby(dates)['volume'].cumsum()
            cum_vol_price = (typical_price * df['volume']).groupby(dates).cumsum()
            vwap = cum_vol_price / cum_vol.replace(0, np.nan)
            return vwap.ffill().bfill()
        except Exception:
            cum_vol = df['volume'].cumsum()
            cum_vol_price = (typical_price * df['volume']).cumsum()
            vwap = cum_vol_price / cum_vol.replace(0, np.nan)
            return vwap.ffill().bfill()

    @staticmethod
    def calculate_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
        high = df['high']
        low = df['low']
        close = df['close']
        prev_close = close.shift(1)

        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()

        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
        return atr.bfill()

    @staticmethod
    def calculate_adx(df: pd.DataFrame, period: int = 14) -> Tuple[pd.Series, pd.Series, pd.Series]:
        high = df['high']
        low = df['low']
        close = df['close']
        prev_close = close.shift(1)
        prev_high = high.shift(1)
        prev_low = low.shift(1)

        # True Range
        tr1 = high - low
        tr2 = (high - prev_close).abs()
        tr3 = (low - prev_close).abs()
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        atr = tr.ewm(alpha=1/period, min_periods=period, adjust=False).mean()

        # Directional Movement
        up_move = high - prev_high
        down_move = prev_low - low

        plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
        minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

        plus_dm_series = pd.Series(plus_dm, index=df.index).ewm(alpha=1/period, min_periods=period, adjust=False).mean()
        minus_dm_series = pd.Series(minus_dm, index=df.index).ewm(alpha=1/period, min_periods=period, adjust=False).mean()

        plus_di = 100 * (plus_dm_series / atr.replace(0, np.nan))
        minus_di = 100 * (minus_dm_series / atr.replace(0, np.nan))

        dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan))
        adx = dx.ewm(alpha=1/period, min_periods=period, adjust=False).mean()

        return adx.fillna(20.0), plus_di.fillna(20.0), minus_di.fillna(20.0)

    @staticmethod
    def calculate_supertrend(df: pd.DataFrame, period: int = 10, multiplier: float = 3.0) -> Tuple[pd.Series, pd.Series]:
        atr = IndicatorEngine.calculate_atr(df, period)
        hl2 = (df['high'] + df['low']) / 2.0

        upper_band = hl2 + (multiplier * atr)
        lower_band = hl2 - (multiplier * atr)

        close = df['close'].values
        n = len(df)
        supertrend = np.zeros(n)
        direction = np.zeros(n)  # 1 for BULLISH, -1 for BEARISH

        in_uptrend = True
        upper_band_vals = upper_band.values
        lower_band_vals = lower_band.values

        for i in range(1, n):
            # Final upper band
            if upper_band_vals[i] < upper_band_vals[i-1] or close[i-1] > upper_band_vals[i-1]:
                upper_band_vals[i] = upper_band_vals[i]
            else:
                upper_band_vals[i] = upper_band_vals[i-1]

            # Final lower band
            if lower_band_vals[i] > lower_band_vals[i-1] or close[i-1] < lower_band_vals[i-1]:
                lower_band_vals[i] = lower_band_vals[i]
            else:
                lower_band_vals[i] = lower_band_vals[i-1]

            # Supertrend value & trend
            if in_uptrend:
                if close[i] < lower_band_vals[i]:
                    in_uptrend = False
                    supertrend[i] = upper_band_vals[i]
                    direction[i] = -1
                else:
                    supertrend[i] = lower_band_vals[i]
                    direction[i] = 1
            else:
                if close[i] > upper_band_vals[i]:
                    in_uptrend = True
                    supertrend[i] = lower_band_vals[i]
                    direction[i] = 1
                else:
                    supertrend[i] = upper_band_vals[i]
                    direction[i] = -1

        # Fill index 0
        supertrend[0] = lower_band_vals[0]
        direction[0] = 1

        return pd.Series(supertrend, index=df.index), pd.Series(direction, index=df.index)

    @classmethod
    def compute_all_indicators(cls, df: pd.DataFrame) -> TechnicalIndicators:
        """
        Compute full structured indicators suite from a candlestick DataFrame.
        """
        if df.empty or len(df) < 5:
            # Return safe default indicators
            return cls._empty_indicators()

        close = df['close']
        high = df['high']
        low = df['low']
        volume = df['volume']
        current_price = float(close.iloc[-1])

        # --- EMAs ---
        ema20_series = cls.calculate_ema(close, 20)
        ema50_series = cls.calculate_ema(close, 50)
        ema200_series = cls.calculate_ema(close, 200) if len(df) >= 50 else cls.calculate_ema(close, len(df))

        ema20_val = float(ema20_series.iloc[-1])
        ema50_val = float(ema50_series.iloc[-1])
        ema200_val = float(ema200_series.iloc[-1])

        if ema20_val > ema50_val > ema200_val:
            ema_align = "BULLISH"
        elif ema20_val < ema50_val < ema200_val:
            ema_align = "BEARISH"
        else:
            ema_align = "MIXED"

        # Check crossovers
        prev_ema20 = float(ema20_series.iloc[-2]) if len(df) > 1 else ema20_val
        prev_ema50 = float(ema50_series.iloc[-2]) if len(df) > 1 else ema50_val
        prev_ema200 = float(ema200_series.iloc[-2]) if len(df) > 1 else ema200_val

        cross_20_50 = "GOLDEN_CROSS" if (prev_ema20 <= prev_ema50 and ema20_val > ema50_val) else \
                      ("DEATH_CROSS" if (prev_ema20 >= prev_ema50 and ema20_val < ema50_val) else "NONE")

        cross_50_200 = "GOLDEN_CROSS" if (prev_ema50 <= prev_ema200 and ema50_val > ema200_val) else \
                       ("DEATH_CROSS" if (prev_ema50 >= prev_ema200 and ema50_val < ema200_val) else "NONE")

        ema_obj = EMAValues(
            ema20=round(ema20_val, 2),
            ema50=round(ema50_val, 2),
            ema200=round(ema200_val, 2),
            alignment=ema_align,
            price_above_ema20=(current_price > ema20_val),
            price_above_ema50=(current_price > ema50_val),
            price_above_ema200=(current_price > ema200_val),
            crossover_20_50=cross_20_50,
            crossover_50_200=cross_50_200
        )

        # --- RSI ---
        rsi_series = cls.calculate_rsi(close, 14)
        rsi_val = float(rsi_series.iloc[-1])
        
        if rsi_val >= 70:
            rsi_status = "OVERBOUGHT"
        elif rsi_val <= 30:
            rsi_status = "OVERSOLD"
        elif rsi_val >= 55:
            rsi_status = "BULLISH_MOMENTUM"
        elif rsi_val <= 45:
            rsi_status = "BEARISH_MOMENTUM"
        else:
            rsi_status = "NEUTRAL"

        rsi_obj = RSIValues(
            rsi14=round(rsi_val, 2),
            status=rsi_status,
            momentum_confirmed=(rsi_val >= 55 and rsi_val <= 75) or (rsi_val <= 45 and rsi_val >= 25)
        )

        # --- MACD ---
        macd_line, sig_line, hist = cls.calculate_macd(close)
        m_val = float(macd_line.iloc[-1])
        s_val = float(sig_line.iloc[-1])
        h_val = float(hist.iloc[-1])
        prev_h = float(hist.iloc[-2]) if len(df) > 1 else h_val

        m_cross = "BULLISH_CROSS" if (prev_h <= 0 and h_val > 0) else \
                  ("BEARISH_CROSS" if (prev_h >= 0 and h_val < 0) else "NONE")

        macd_trend = "BULLISH" if h_val > 0 else ("BEARISH" if h_val < 0 else "NEUTRAL")

        macd_obj = MACDValues(
            macd=round(m_val, 2),
            signal=round(s_val, 2),
            histogram=round(h_val, 2),
            crossover=m_cross,
            trend=macd_trend
        )

        # --- VWAP ---
        vwap_series = cls.calculate_vwap(df)
        vwap_val = float(vwap_series.iloc[-1])
        prev_close_val = float(close.iloc[-2]) if len(df) > 1 else current_price
        prev_vwap_val = float(vwap_series.iloc[-2]) if len(df) > 1 else vwap_val

        vwap_position = "ABOVE" if current_price >= vwap_val else "BELOW"
        vwap_break = (prev_close_val < prev_vwap_val and current_price > vwap_val)
        vwap_reject = (float(high.iloc[-1]) >= vwap_val and current_price < vwap_val)

        vwap_obj = VWAPValues(
            vwap=round(vwap_val, 2),
            price_position=vwap_position,
            vwap_breakout=vwap_break,
            vwap_rejection=vwap_reject
        )

        # --- ADX ---
        adx_series, plus_di_series, minus_di_series = cls.calculate_adx(df, 14)
        adx_val = float(adx_series.iloc[-1])
        p_di_val = float(plus_di_series.iloc[-1])
        m_di_val = float(minus_di_series.iloc[-1])

        if adx_val >= 40:
            trend_str = "VERY_STRONG"
        elif adx_val >= 25:
            trend_str = "STRONG"
        elif adx_val >= 18:
            trend_str = "MODERATE"
        else:
            trend_str = "WEAK"

        trend_dir = "BULLISH" if p_di_val > m_di_val else ("BEARISH" if m_di_val > p_di_val else "NEUTRAL")

        adx_obj = ADXValues(
            adx14=round(adx_val, 2),
            plus_di=round(p_di_val, 2),
            minus_di=round(m_di_val, 2),
            trend_strength=trend_str,
            trend_direction=trend_dir
        )

        # --- Supertrend ---
        st_series, st_dir = cls.calculate_supertrend(df, 10, 3.0)
        st_val = float(st_series.iloc[-1])
        st_direction_val = "BULLISH" if int(st_dir.iloc[-1]) == 1 else "BEARISH"
        prev_st_dir = int(st_dir.iloc[-2]) if len(df) > 1 else int(st_dir.iloc[-1])
        reversal = (prev_st_dir != int(st_dir.iloc[-1]))

        supertrend_obj = SupertrendValues(
            supertrend=round(st_val, 2),
            direction=st_direction_val,
            reversal=reversal
        )

        # --- ATR ---
        atr_series = cls.calculate_atr(df, 14)
        atr_val = float(atr_series.iloc[-1])
        atr_pct = (atr_val / current_price * 100.0) if current_price > 0 else 0.0

        atr_obj = ATRValues(
            atr14=round(atr_val, 2),
            atr_percent=round(atr_pct, 2)
        )

        # --- Volume ---
        vol_series = df['volume']
        curr_vol = float(vol_series.iloc[-1])
        avg_vol = float(vol_series.tail(20).mean()) if len(vol_series) >= 5 else curr_vol
        rvol = (curr_vol / avg_vol) if avg_vol > 0 else 1.0
        is_spike = (rvol >= 1.75)
        is_breakout_vol = (rvol >= 1.30)

        vol_obj = VolumeAnalysis(
            current_volume=round(curr_vol, 0),
            avg_volume_20=round(avg_vol, 0),
            relative_volume=round(rvol, 2),
            is_volume_spike=is_spike,
            breakout_volume_confirmed=is_breakout_vol
        )

        return TechnicalIndicators(
            ema=ema_obj,
            rsi=rsi_obj,
            macd=macd_obj,
            vwap=vwap_obj,
            adx=adx_obj,
            supertrend=supertrend_obj,
            atr=atr_obj,
            volume=vol_obj
        )

    @classmethod
    def _empty_indicators(cls) -> TechnicalIndicators:
        return TechnicalIndicators(
            ema=EMAValues(ema20=0, ema50=0, ema200=0, alignment="NEUTRAL", price_above_ema20=False, price_above_ema50=False, price_above_ema200=False),
            rsi=RSIValues(rsi14=50, status="NEUTRAL", momentum_confirmed=False),
            macd=MACDValues(macd=0, signal=0, histogram=0, crossover="NONE", trend="NEUTRAL"),
            vwap=VWAPValues(vwap=0, price_position="NEUTRAL", vwap_breakout=False, vwap_rejection=False),
            adx=ADXValues(adx14=20, plus_di=20, minus_di=20, trend_strength="MODERATE", trend_direction="NEUTRAL"),
            supertrend=SupertrendValues(supertrend=0, direction="NEUTRAL", reversal=False),
            atr=ATRValues(atr14=0, atr_percent=0),
            volume=VolumeAnalysis(current_volume=0, avg_volume_20=0, relative_volume=1.0, is_volume_spike=False, breakout_volume_confirmed=False)
        )
