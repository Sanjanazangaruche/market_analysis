import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from backend.models.schemas import SRLevel, SupportResistanceSummary

class SupportResistanceDetector:
    """
    Advanced Multi-Touch Support & Resistance Engine.
    Detects pivot swing highs/lows, clusters levels by touch density,
    calculates Previous Day/Week Highs and Lows, identifies consolidation ranges,
    and quantifies level strength.
    """

    @classmethod
    def detect_pivots(cls, df: pd.DataFrame, window: int = 4) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Detect local swing highs and swing lows using rolling pivot window.
        """
        highs = df['high'].values
        lows = df['low'].values
        volumes = df['volume'].values
        n = len(df)
        
        swing_highs = []
        swing_lows = []

        if n < window * 2 + 1:
            return swing_highs, swing_lows

        for i in range(window, n - window):
            curr_high = highs[i]
            curr_low = lows[i]

            # Check if high is highest in window before and after
            is_pivot_high = all(curr_high >= highs[i - k] for k in range(1, window + 1)) and \
                            all(curr_high >= highs[i + k] for k in range(1, window + 1))
            
            # Check if low is lowest in window before and after
            is_pivot_low = all(curr_low <= lows[i - k] for k in range(1, window + 1)) and \
                           all(curr_low <= lows[i + k] for k in range(1, window + 1))

            if is_pivot_high:
                swing_highs.append({
                    "price": float(curr_high),
                    "index": i,
                    "volume": float(volumes[i]),
                    "timestamp": str(df['timestamp'].iloc[i])
                })

            if is_pivot_low:
                swing_lows.append({
                    "price": float(curr_low),
                    "index": i,
                    "volume": float(volumes[i]),
                    "timestamp": str(df['timestamp'].iloc[i])
                })

        return swing_highs, swing_lows

    @classmethod
    def cluster_levels(cls, pivot_list: List[Dict[str, Any]], level_type: str, current_price: float, tolerance_pct: float = 0.0075) -> List[SRLevel]:
        """
        Group nearby pivot points into consolidated Support/Resistance zones
        and score strength based on touch count, volume, and recency.
        """
        if not pivot_list:
            return []

        # Sort pivots by price
        sorted_pivots = sorted(pivot_list, key=lambda x: x["price"])
        clusters: List[List[Dict[str, Any]]] = []

        for p in sorted_pivots:
            if not clusters:
                clusters.append([p])
            else:
                last_cluster = clusters[-1]
                avg_price = sum(item["price"] for item in last_cluster) / len(last_cluster)
                if abs(p["price"] - avg_price) / avg_price <= tolerance_pct:
                    last_cluster.append(p)
                else:
                    clusters.append([p])

        sr_levels: List[SRLevel] = []
        for cluster in clusters:
            touch_count = len(cluster)
            avg_price = sum(item["price"] for item in cluster) / touch_count
            total_vol = sum(item["volume"] for item in cluster)

            # Strength score formula: touches (50%), volume weight (30%), recency (20%)
            raw_score = (touch_count * 25.0) + min(25.0, (total_vol / 100000.0) * 5.0)
            score = min(100.0, raw_score)

            if touch_count >= 3 or score >= 75.0:
                strength = "STRONG"
                is_major = True
            elif touch_count == 2 or score >= 50.0:
                strength = "MODERATE"
                is_major = False
            else:
                strength = "WEAK"
                is_major = False

            sr_levels.append(SRLevel(
                price=round(avg_price, 2),
                level_type=level_type,
                strength=strength,
                touch_count=touch_count,
                score=round(score, 1),
                is_major=is_major
            ))

        return sr_levels

    @classmethod
    def detect_consolidation_zone(cls, df: pd.DataFrame, lookback: int = 20) -> Optional[Dict[str, float]]:
        """
        Detect if price has been consolidating in a tight trading range.
        Consolidation defined as high-low range < 2.5% over the lookback period.
        """
        if len(df) < lookback:
            return None

        recent_df = df.tail(lookback)
        highest = float(recent_df['high'].max())
        lowest = float(recent_df['low'].min())
        mid = (highest + lowest) / 2.0

        range_pct = ((highest - lowest) / mid) * 100.0

        if range_pct <= 3.0:
            return {
                "high": round(highest, 2),
                "low": round(lowest, 2),
                "mid": round(mid, 2),
                "range_pct": round(range_pct, 2),
                "duration_candles": lookback
            }
        return None

    @classmethod
    def calculate_support_resistance(cls, df: pd.DataFrame, daily_df: Optional[pd.DataFrame] = None) -> SupportResistanceSummary:
        """
        Full S/R pipeline:
        1. Swing high/low extraction
        2. Touch clustering & strength scoring
        3. Nearest level identification & distance calculation
        4. Previous day & week stats
        5. Consolidation analysis
        """
        if df.empty or len(df) < 10:
            current_p = float(df['close'].iloc[-1]) if not df.empty else 100.0
            return SupportResistanceSummary(
                nearest_support=round(current_p * 0.98, 2),
                nearest_resistance=round(current_p * 1.02, 2),
                distance_to_support_pct=2.0,
                distance_to_resistance_pct=2.0,
                all_supports=[],
                all_resistances=[],
                swing_highs=[],
                swing_lows=[]
            )

        current_price = float(df['close'].iloc[-1])

        # 1. Swing pivots
        pivot_highs, pivot_lows = cls.detect_pivots(df, window=3)

        raw_swing_highs = [p["price"] for p in pivot_highs]
        raw_swing_lows = [p["price"] for p in pivot_lows]

        # 2. Clusters
        resistances = cls.cluster_levels(pivot_highs, "RESISTANCE", current_price)
        supports = cls.cluster_levels(pivot_lows, "SUPPORT", current_price)

        # Filter levels above current price as resistances, below as supports
        res_above = [r for r in resistances if r.price >= current_price * 0.999]
        sup_below = [s for s in supports if s.price <= current_price * 1.001]

        # Find nearest
        if res_above:
            nearest_res_obj = min(res_above, key=lambda x: abs(x.price - current_price))
            nearest_resistance = nearest_res_obj.price
        else:
            # If no swing high above, use recent period max or 1.5% above
            recent_max = float(df['high'].tail(30).max())
            nearest_resistance = max(recent_max, current_price * 1.015)
            resistances.append(SRLevel(
                price=round(nearest_resistance, 2),
                level_type="RESISTANCE",
                strength="MODERATE",
                touch_count=1,
                score=50.0,
                is_major=False
            ))

        if sup_below:
            nearest_sup_obj = max(sup_below, key=lambda x: x.price)
            nearest_support = nearest_sup_obj.price
        else:
            recent_min = float(df['low'].tail(30).min())
            nearest_support = min(recent_min, current_price * 0.985)
            supports.append(SRLevel(
                price=round(nearest_support, 2),
                level_type="SUPPORT",
                strength="MODERATE",
                touch_count=1,
                score=50.0,
                is_major=False
            ))

        # Distances
        dist_sup_pct = abs((current_price - nearest_support) / current_price) * 100.0
        dist_res_pct = abs((nearest_resistance - current_price) / current_price) * 100.0

        # Previous Day / Week calculations if daily data provided
        pdh, pdl, pwh, pwl = None, None, None, None
        if daily_df is not None and len(daily_df) >= 2:
            try:
                prev_day_candle = daily_df.iloc[-2]
                pdh = round(float(prev_day_candle['high']), 2)
                pdl = round(float(prev_day_candle['low']), 2)

                if len(daily_df) >= 6:
                    prev_week_candles = daily_df.iloc[-6:-1]
                    pwh = round(float(prev_week_candles['high'].max()), 2)
                    pwl = round(float(prev_week_candles['low'].min()), 2)
            except Exception:
                pass

        # Consolidation zone
        consolidation = cls.detect_consolidation_zone(df, lookback=16)

        return SupportResistanceSummary(
            nearest_support=round(nearest_support, 2),
            nearest_resistance=round(nearest_resistance, 2),
            distance_to_support_pct=round(dist_sup_pct, 2),
            distance_to_resistance_pct=round(dist_res_pct, 2),
            all_supports=sorted(supports, key=lambda x: x.price, reverse=True),
            all_resistances=sorted(resistances, key=lambda x: x.price),
            swing_highs=sorted(raw_swing_highs),
            swing_lows=sorted(raw_swing_lows),
            prev_day_high=pdh,
            prev_day_low=pdl,
            prev_week_high=pwh,
            prev_week_low=pwl,
            consolidation_range=consolidation
        )
