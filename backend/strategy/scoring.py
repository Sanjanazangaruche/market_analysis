from typing import Dict, Any, Optional
from backend.models.schemas import (
    BreakoutScoreBreakdown, BreakoutSignal, TechnicalIndicators, SupportResistanceSummary
)
from backend.config.settings import settings

class BreakoutScoringEngine:
    """
    Transparent 0-100 Breakout Quality Scoring Engine with configurable weights.
    Evaluates 10 technical pillars and classifies setups into:
    VERY STRONG (90-100), STRONG (80-89), GOOD (70-79), MODERATE (60-69), WEAK (<60).
    """

    @classmethod
    def calculate_score(
        cls,
        signal: BreakoutSignal,
        indicators: TechnicalIndicators,
        sr: SupportResistanceSummary,
        weights: Optional[Dict[str, int]] = None
    ) -> BreakoutScoreBreakdown:
        # Load weights or defaults
        w_sr = weights.get("sr_breakout", settings.WEIGHT_SR_BREAKOUT) if weights else settings.WEIGHT_SR_BREAKOUT
        w_vol = weights.get("volume", settings.WEIGHT_VOLUME_CONFIRM) if weights else settings.WEIGHT_VOLUME_CONFIRM
        w_ema = weights.get("ema_trend", settings.WEIGHT_EMA_TREND) if weights else settings.WEIGHT_EMA_TREND
        w_rsi = weights.get("rsi", settings.WEIGHT_RSI_MOMENTUM) if weights else settings.WEIGHT_RSI_MOMENTUM
        w_macd = weights.get("macd", settings.WEIGHT_MACD_CONFIRM) if weights else settings.WEIGHT_MACD_CONFIRM
        w_adx = weights.get("adx", settings.WEIGHT_ADX_STRENGTH) if weights else settings.WEIGHT_ADX_STRENGTH
        w_vwap = weights.get("vwap", settings.WEIGHT_VWAP) if weights else settings.WEIGHT_VWAP
        w_st = weights.get("supertrend", settings.WEIGHT_SUPERTREND) if weights else settings.WEIGHT_SUPERTREND
        w_pa = weights.get("price_action", settings.WEIGHT_PRICE_ACTION) if weights else settings.WEIGHT_PRICE_ACTION
        w_rr = weights.get("risk_reward", settings.WEIGHT_RISK_REWARD) if weights else settings.WEIGHT_RISK_REWARD

        is_bearish = "BEARISH" in signal.signal_type

        # 1. S/R Breakout Score (Max w_sr = 20)
        sr_score = 0.0
        if signal.is_breakout:
            if signal.signal_type in ["BULLISH_BREAKOUT", "RETEST_CONFIRMED", "CONSOLIDATION_BREAKOUT", "BEARISH_BREAKDOWN"]:
                sr_score = float(w_sr)
            elif signal.signal_type == "VOLUME_BREAKOUT":
                sr_score = float(w_sr) * 0.75
        elif signal.confirmation_count >= 3:
            sr_score = float(w_sr) * 0.4

        # 2. Volume Confirmation Score (Max w_vol = 15)
        vol_score = 0.0
        rvol = indicators.volume.relative_volume
        if rvol >= 2.0:
            vol_score = float(w_vol)
        elif rvol >= 1.5:
            vol_score = float(w_vol) * 0.85
        elif rvol >= 1.25:
            vol_score = float(w_vol) * 0.65
        elif rvol >= 1.0:
            vol_score = float(w_vol) * 0.35
        else:
            vol_score = float(w_vol) * 0.1

        # 3. EMA Trend Alignment Score (Max w_ema = 15)
        ema_score = 0.0
        if not is_bearish:
            if indicators.ema.alignment == "BULLISH" and indicators.ema.price_above_ema20:
                ema_score = float(w_ema)
            elif indicators.ema.price_above_ema20 and indicators.ema.price_above_ema50:
                ema_score = float(w_ema) * 0.8
            elif indicators.ema.price_above_ema20:
                ema_score = float(w_ema) * 0.5
            elif indicators.ema.crossover_20_50 == "GOLDEN_CROSS":
                ema_score = float(w_ema) * 0.75
        else:
            if indicators.ema.alignment == "BEARISH" and not indicators.ema.price_above_ema20:
                ema_score = float(w_ema)
            elif not indicators.ema.price_above_ema20 and not indicators.ema.price_above_ema50:
                ema_score = float(w_ema) * 0.8
            elif not indicators.ema.price_above_ema20:
                ema_score = float(w_ema) * 0.5

        # 4. RSI Momentum Score (Max w_rsi = 10)
        rsi_score = 0.0
        rsi = indicators.rsi.rsi14
        if not is_bearish:
            if 60.0 <= rsi <= 74.0:
                rsi_score = float(w_rsi) # Sweet spot of strong momentum
            elif 54.0 <= rsi < 60.0:
                rsi_score = float(w_rsi) * 0.8
            elif 74.0 < rsi <= 80.0:
                rsi_score = float(w_rsi) * 0.6 # Getting warm
            elif rsi > 80.0:
                rsi_score = float(w_rsi) * 0.3 # Overbought caution
            elif 48.0 <= rsi < 54.0:
                rsi_score = float(w_rsi) * 0.4
        else:
            if 26.0 <= rsi <= 40.0:
                rsi_score = float(w_rsi)
            elif 40.0 < rsi <= 46.0:
                rsi_score = float(w_rsi) * 0.8
            elif rsi < 26.0:
                rsi_score = float(w_rsi) * 0.4

        # 5. MACD Confirmation Score (Max w_macd = 10)
        macd_score = 0.0
        if not is_bearish:
            if indicators.macd.crossover == "BULLISH_CROSS" or (indicators.macd.histogram > 0 and indicators.macd.trend == "BULLISH"):
                macd_score = float(w_macd)
            elif indicators.macd.histogram > 0:
                macd_score = float(w_macd) * 0.75
            elif indicators.macd.macd > indicators.macd.signal:
                macd_score = float(w_macd) * 0.5
        else:
            if indicators.macd.crossover == "BEARISH_CROSS" or (indicators.macd.histogram < 0 and indicators.macd.trend == "BEARISH"):
                macd_score = float(w_macd)
            elif indicators.macd.histogram < 0:
                macd_score = float(w_macd) * 0.75

        # 6. ADX Trend Strength Score (Max w_adx = 10)
        adx_score = 0.0
        adx = indicators.adx.adx14
        if adx >= 28.0:
            adx_score = float(w_adx)
        elif adx >= 22.0:
            adx_score = float(w_adx) * 0.85
        elif adx >= 18.0:
            adx_score = float(w_adx) * 0.5
        else:
            adx_score = float(w_adx) * 0.2

        # 7. VWAP Confirmation Score (Max w_vwap = 5)
        vwap_score = 0.0
        if not is_bearish:
            if indicators.vwap.vwap_breakout:
                vwap_score = float(w_vwap)
            elif indicators.vwap.price_position == "ABOVE":
                vwap_score = float(w_vwap)
            else:
                vwap_score = 0.0
        else:
            if indicators.vwap.price_position == "BELOW":
                vwap_score = float(w_vwap)

        # 8. Supertrend Score (Max w_st = 5)
        st_score = 0.0
        if not is_bearish and indicators.supertrend.direction == "BULLISH":
            st_score = float(w_st)
        elif is_bearish and indicators.supertrend.direction == "BEARISH":
            st_score = float(w_st)

        # 9. Price Action Score (Max w_pa = 5)
        pa_score = float(w_pa) * 0.8 if signal.is_breakout else float(w_pa) * 0.4

        # 10. Risk/Reward Score (Max w_rr = 5)
        rr_score = float(w_rr) # Baseline, adjusted by trade setup

        total = sr_score + vol_score + ema_score + rsi_score + macd_score + adx_score + vwap_score + st_score + pa_score + rr_score
        total_score = min(100.0, max(0.0, total))

        if total_score >= 90.0:
            classification = "VERY_STRONG"
        elif total_score >= 80.0:
            classification = "STRONG"
        elif total_score >= 70.0:
            classification = "GOOD"
        elif total_score >= 60.0:
            classification = "MODERATE"
        else:
            classification = "WEAK"

        return BreakoutScoreBreakdown(
            sr_breakout_score=round(sr_score, 1),
            volume_score=round(vol_score, 1),
            ema_trend_score=round(ema_score, 1),
            rsi_score=round(rsi_score, 1),
            macd_score=round(macd_score, 1),
            adx_score=round(adx_score, 1),
            vwap_score=round(vwap_score, 1),
            supertrend_score=round(st_score, 1),
            price_action_score=round(pa_score, 1),
            risk_reward_score=round(rr_score, 1),
            total_score=round(total_score, 1),
            classification=classification
        )
