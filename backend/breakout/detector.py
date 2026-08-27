import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from backend.models.schemas import (
    BreakoutSignal, TechnicalIndicators, SupportResistanceSummary
)

class BreakoutDetector:
    """
    Comprehensive Breakout Engine.
    Detects Bullish Breakouts, Bearish Breakdowns, Retest Confirmed,
    False Breakouts, Volume Surges, and Consolidation Breakouts.
    """

    @classmethod
    def detect_breakout(
        cls,
        df: pd.DataFrame,
        indicators: TechnicalIndicators,
        sr: SupportResistanceSummary
    ) -> BreakoutSignal:
        if df.empty or len(df) < 5:
            return BreakoutSignal(
                is_breakout=False,
                signal_type="NO_BREAKOUT",
                breakout_level=0.0,
                breakout_price=0.0,
                candle_time="",
                confirmation_count=0,
                confirmations=[],
                failed_conditions=["Insufficient candle data"]
            )

        last_row = df.iloc[-1]
        prev_row = df.iloc[-2] if len(df) > 1 else last_row
        prev_2_row = df.iloc[-3] if len(df) > 2 else prev_row

        current_close = float(last_row['close'])
        current_open = float(last_row['open'])
        current_high = float(last_row['high'])
        current_low = float(last_row['low'])
        candle_time = str(last_row['timestamp'])

        prev_close = float(prev_row['close'])
        prev_high = float(prev_row['high'])
        prev_low = float(prev_row['low'])

        nearest_res = sr.nearest_resistance
        nearest_sup = sr.nearest_support

        confirmations: List[str] = []
        failed_conditions: List[str] = []

        # --- 1. Check for FALSE BREAKOUT (Bull Trap / Bear Trap) ---
        # Price spiked above resistance during candle but closed back below
        if current_high > nearest_res and current_close < nearest_res and (current_high - current_close) > (current_close - current_low):
            return BreakoutSignal(
                is_breakout=False,
                signal_type="FALSE_BREAKOUT",
                breakout_level=nearest_res,
                breakout_price=current_close,
                candle_time=candle_time,
                confirmation_count=1,
                confirmations=["Price rejected at resistance with upper wick (Bull Trap)"],
                failed_conditions=["Failed to close above resistance"]
            )

        # --- 2. Check for RETEST CONFIRMED ---
        # Price broke out 1-3 candles ago, tested the breakout level from above, and is bouncing
        retest_detected = False
        if prev_close >= nearest_res * 0.998 or float(prev_2_row['close']) >= nearest_res * 0.998:
            if current_low <= nearest_res * 1.004 and current_close > current_open and current_close > nearest_res:
                retest_detected = True

        # --- 3. Check for CONSOLIDATION BREAKOUT ---
        consolidation_break = False
        if sr.consolidation_range:
            c_high = sr.consolidation_range["high"]
            c_low = sr.consolidation_range["low"]
            if current_close > c_high and prev_close <= c_high:
                consolidation_break = True

        # --- 4. BULLISH BREAKOUT CONDITIONS ---
        bullish_conditions_met = 0
        
        # Condition 1: Resistance Breach & Close Above
        is_above_resistance = current_close > nearest_res or (nearest_res > 0 and (current_close - nearest_res) / nearest_res >= -0.001)
        if is_above_resistance or consolidation_break or retest_detected:
            bullish_conditions_met += 1
            if retest_detected:
                confirmations.append(f"Retest confirmed at key level ₹{nearest_res}")
            elif consolidation_break:
                confirmations.append(f"Broken out from tight consolidation range (High: ₹{sr.consolidation_range['high']})")
            else:
                confirmations.append(f"Candle closed firmly above resistance ₹{nearest_res}")
        else:
            failed_conditions.append(f"Price (₹{current_close}) is below nearest resistance ₹{nearest_res}")

        # Condition 2: Volume Confirmation
        if indicators.volume.relative_volume >= 1.25:
            bullish_conditions_met += 1
            confirmations.append(f"Volume surge confirmed: RVOL is {indicators.volume.relative_volume}x (Avg: {int(indicators.volume.avg_volume_20):,})")
        else:
            failed_conditions.append(f"Volume RVOL ({indicators.volume.relative_volume}x) is below 1.25x average")

        # Condition 3: RSI Momentum Confirmation
        if 54.0 <= indicators.rsi.rsi14 <= 78.0:
            bullish_conditions_met += 1
            confirmations.append(f"RSI ({indicators.rsi.rsi14}) confirms strong bullish momentum without extreme overbought")
        elif indicators.rsi.rsi14 > 78.0:
            failed_conditions.append(f"RSI ({indicators.rsi.rsi14}) is in extreme overbought territory (>78)")
        else:
            failed_conditions.append(f"RSI ({indicators.rsi.rsi14}) lacks bullish momentum (<54)")

        # Condition 4: EMA Trend Alignment
        if indicators.ema.price_above_ema20 and indicators.ema.alignment == "BULLISH":
            bullish_conditions_met += 1
            confirmations.append("EMA Alignment is Bullish (EMA 20 > EMA 50 > EMA 200)")
        elif indicators.ema.price_above_ema20:
            bullish_conditions_met += 1
            confirmations.append("Price is trading firmly above EMA 20")
        else:
            failed_conditions.append("Price is below EMA 20")

        # Condition 5: MACD Histogram Acceleration
        if indicators.macd.histogram > 0:
            bullish_conditions_met += 1
            confirmations.append(f"MACD Histogram is positive ({indicators.macd.histogram}) and expanding")
        else:
            failed_conditions.append("MACD Histogram is negative or losing momentum")

        # Condition 6: ADX Trend Strength
        if indicators.adx.adx14 >= 20.0 and indicators.adx.trend_direction == "BULLISH":
            bullish_conditions_met += 1
            confirmations.append(f"ADX ({indicators.adx.adx14}) signals strong trending strength (+DI > -DI)")
        elif indicators.adx.adx14 >= 18.0:
            bullish_conditions_met += 1
            confirmations.append(f"ADX ({indicators.adx.adx14}) indicates developing trend strength")
        else:
            failed_conditions.append(f"ADX ({indicators.adx.adx14}) is weak/ranging (<18)")

        # Condition 7: VWAP Confirmation
        if indicators.vwap.price_position == "ABOVE":
            bullish_conditions_met += 1
            confirmations.append(f"Price is above VWAP (₹{indicators.vwap.vwap})")
        else:
            failed_conditions.append(f"Price is below intraday VWAP (₹{indicators.vwap.vwap})")

        # Condition 8: Supertrend Bullish
        if indicators.supertrend.direction == "BULLISH":
            bullish_conditions_met += 1
            confirmations.append("Supertrend indicator is green (Bullish)")
        else:
            failed_conditions.append("Supertrend indicator is Bearish (Red)")

        # --- 5. BEARISH BREAKDOWN CONDITIONS ---
        bearish_conditions_met = 0
        bear_confirmations: List[str] = []
        bear_failed: List[str] = []

        is_below_support = current_close < nearest_sup or (nearest_sup > 0 and (nearest_sup - current_close) / nearest_sup >= -0.001)
        if is_below_support:
            bearish_conditions_met += 1
            bear_confirmations.append(f"Candle closed below key support ₹{nearest_sup}")
        else:
            bear_failed.append(f"Price (₹{current_close}) is above support ₹{nearest_sup}")

        if indicators.volume.relative_volume >= 1.25:
            bearish_conditions_met += 1
            bear_confirmations.append(f"Breakdown volume confirmed: RVOL {indicators.volume.relative_volume}x")
        else:
            bear_failed.append("Breakdown volume is low")

        if indicators.rsi.rsi14 <= 46.0 and indicators.rsi.rsi14 >= 22.0:
            bearish_conditions_met += 1
            bear_confirmations.append(f"RSI ({indicators.rsi.rsi14}) confirms bearish momentum")
        else:
            bear_failed.append(f"RSI ({indicators.rsi.rsi14}) is not bearish")

        if not indicators.ema.price_above_ema20 and indicators.ema.alignment == "BEARISH":
            bearish_conditions_met += 1
            bear_confirmations.append("EMA Alignment is Bearish (EMA 20 < EMA 50 < EMA 200)")
        elif not indicators.ema.price_above_ema20:
            bearish_conditions_met += 1
            bear_confirmations.append("Price is below EMA 20")
        else:
            bear_failed.append("Price is above EMA 20")

        if indicators.macd.histogram < 0:
            bearish_conditions_met += 1
            bear_confirmations.append("MACD Histogram is negative")
        else:
            bear_failed.append("MACD Histogram is positive")

        if indicators.supertrend.direction == "BEARISH":
            bearish_conditions_met += 1
            bear_confirmations.append("Supertrend is Bearish")

        # --- EVALUATE FINAL SIGNAL ---
        if retest_detected and bullish_conditions_met >= 4:
            return BreakoutSignal(
                is_breakout=True,
                signal_type="RETEST_CONFIRMED",
                breakout_level=nearest_res,
                breakout_price=current_close,
                candle_time=candle_time,
                confirmation_count=bullish_conditions_met,
                confirmations=confirmations,
                failed_conditions=failed_conditions
            )

        if consolidation_break and bullish_conditions_met >= 4:
            return BreakoutSignal(
                is_breakout=True,
                signal_type="CONSOLIDATION_BREAKOUT",
                breakout_level=sr.consolidation_range["high"] if sr.consolidation_range else nearest_res,
                breakout_price=current_close,
                candle_time=candle_time,
                confirmation_count=bullish_conditions_met,
                confirmations=confirmations,
                failed_conditions=failed_conditions
            )

        if is_above_resistance and bullish_conditions_met >= 5:
            return BreakoutSignal(
                is_breakout=True,
                signal_type="BULLISH_BREAKOUT",
                breakout_level=nearest_res,
                breakout_price=current_close,
                candle_time=candle_time,
                confirmation_count=bullish_conditions_met,
                confirmations=confirmations,
                failed_conditions=failed_conditions
            )

        if is_below_support and bearish_conditions_met >= 4:
            return BreakoutSignal(
                is_breakout=True,
                signal_type="BEARISH_BREAKDOWN",
                breakout_level=nearest_sup,
                breakout_price=current_close,
                candle_time=candle_time,
                confirmation_count=bearish_conditions_met,
                confirmations=bear_confirmations,
                failed_conditions=bear_failed
            )

        if indicators.volume.relative_volume >= 2.2 and abs(current_close - current_open) / current_open >= 0.015:
            return BreakoutSignal(
                is_breakout=True,
                signal_type="VOLUME_BREAKOUT",
                breakout_level=prev_high if current_close > current_open else prev_low,
                breakout_price=current_close,
                candle_time=candle_time,
                confirmation_count=3,
                confirmations=[f"Massive institutional volume surge ({indicators.volume.relative_volume}x RVOL) with price expansion"],
                failed_conditions=[]
            )

        # No qualified breakout
        return BreakoutSignal(
            is_breakout=False,
            signal_type="NO_BREAKOUT",
            breakout_level=nearest_res,
            breakout_price=current_close,
            candle_time=candle_time,
            confirmation_count=max(bullish_conditions_met, bearish_conditions_met),
            confirmations=confirmations if bullish_conditions_met > bearish_conditions_met else bear_confirmations,
            failed_conditions=failed_conditions
        )
