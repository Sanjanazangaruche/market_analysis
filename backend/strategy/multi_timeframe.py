import pandas as pd
from typing import Dict, Any, Optional
from backend.models.schemas import (
    MultiTimeframeAnalysis, TimeframeSummary
)
from backend.indicators.engine import IndicatorEngine

class MultiTimeframeAnalyzer:
    """
    Multi-Timeframe Confluence Engine.
    Examines Daily (Macro), 1H (Intermediate), 15M (Setup), 5M (Trigger)
    and computes unified trend confluence score.
    """

    @classmethod
    def _analyze_single_tf(cls, df: pd.DataFrame, tf_name: str) -> TimeframeSummary:
        if df.empty or len(df) < 5:
            return TimeframeSummary(
                timeframe=tf_name,
                trend="NEUTRAL",
                rsi=50.0,
                ema_aligned=False,
                supertrend="NEUTRAL",
                score=50.0
            )

        indicators = IndicatorEngine.compute_all_indicators(df)
        close = float(df['close'].iloc[-1])

        # Trend check
        bull_points = 0
        bear_points = 0

        # EMA
        if indicators.ema.alignment == "BULLISH" and indicators.ema.price_above_ema20:
            bull_points += 2
        elif indicators.ema.price_above_ema20:
            bull_points += 1
        elif indicators.ema.alignment == "BEARISH":
            bear_points += 2
        else:
            bear_points += 1

        # RSI
        if indicators.rsi.rsi14 >= 55.0:
            bull_points += 1
        elif indicators.rsi.rsi14 <= 45.0:
            bear_points += 1

        # Supertrend
        if indicators.supertrend.direction == "BULLISH":
            bull_points += 1
        else:
            bear_points += 1

        if bull_points >= 3:
            trend = "BULLISH"
            score = 75.0 + (bull_points * 6.0)
        elif bear_points >= 3:
            trend = "BEARISH"
            score = 25.0 - (bear_points * 5.0)
        else:
            trend = "NEUTRAL"
            score = 50.0

        return TimeframeSummary(
            timeframe=tf_name,
            trend=trend,
            rsi=indicators.rsi.rsi14,
            ema_aligned=(indicators.ema.alignment in ["BULLISH", "BEARISH"]),
            supertrend=indicators.supertrend.direction,
            score=round(score, 1)
        )

    @classmethod
    def analyze_mtf(cls, tf_data: Dict[str, pd.DataFrame]) -> MultiTimeframeAnalysis:
        daily_df = tf_data.get("1d", pd.DataFrame())
        one_h_df = tf_data.get("1h", pd.DataFrame())
        fifteen_m_df = tf_data.get("15m", pd.DataFrame())
        five_m_df = tf_data.get("5m", pd.DataFrame())

        daily_res = cls._analyze_single_tf(daily_df, "1D")
        one_h_res = cls._analyze_single_tf(one_h_df, "1H")
        fifteen_res = cls._analyze_single_tf(fifteen_m_df, "15M")
        five_res = cls._analyze_single_tf(five_m_df, "5M")

        # Weighted composite score: Daily (35%), 1H (30%), 15M (20%), 5M (15%)
        mtf_score = (
            (daily_res.score * 0.35) +
            (one_h_res.score * 0.30) +
            (fifteen_res.score * 0.20) +
            (five_res.score * 0.15)
        )

        trends = [daily_res.trend, one_h_res.trend, fifteen_res.trend, five_res.trend]
        bull_count = trends.count("BULLISH")
        bear_count = trends.count("BEARISH")

        if bull_count >= 3:
            comp_trend = "STRONG_BULLISH" if bull_count == 4 else "BULLISH"
            summary = f"Full Bullish alignment: {bull_count}/4 timeframes confirm upside momentum."
        elif bear_count >= 3:
            comp_trend = "STRONG_BEARISH" if bear_count == 4 else "BEARISH"
            summary = f"Bearish alignment: {bear_count}/4 timeframes confirm downside pressure."
        else:
            comp_trend = "MIXED"
            summary = f"Mixed timeframe signals (Daily: {daily_res.trend}, 1H: {one_h_res.trend}, 15M: {fifteen_res.trend}). Proceed with caution."

        return MultiTimeframeAnalysis(
            daily=daily_res,
            one_hour=one_h_res,
            fifteen_min=fifteen_res,
            five_min=five_res,
            composite_trend=comp_trend,
            overall_mtf_score=round(mtf_score, 1),
            alignment_summary=summary
        )
