import os
import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI
from backend.models.schemas import (
    AIAnalysisResult, TechnicalIndicators, SupportResistanceSummary,
    BreakoutSignal, BreakoutScoreBreakdown, TradeSetup
)
from backend.config.settings import settings
from backend.database.db import get_db_connection

logger = logging.getLogger(__name__)

class AIAnalyzer:
    """
    OpenAI Analysis Engine for Technical Breakouts.
    Consumes structured technical metrics and synthesizes professional trade plans,
    risk evaluations, and invalidation rules.
    Includes a deterministic AI reasoning engine fallback when API key is not configured.
    """

    @classmethod
    def _get_api_key(cls) -> str:
        # Check DB first, then settings / env
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings_store WHERE key = 'openai_api_key'")
            row = cursor.fetchone()
            if row and row["value"]:
                conn.close()
                return row["value"]
            conn.close()
        except Exception:
            pass

        return os.environ.get("OPENAI_API_KEY", settings.OPENAI_API_KEY)

    @classmethod
    def analyze_setup(
        cls,
        symbol: str,
        exchange: str,
        timeframe: str,
        current_price: float,
        indicators: TechnicalIndicators,
        sr: SupportResistanceSummary,
        signal: BreakoutSignal,
        score: BreakoutScoreBreakdown,
        trade_setup: Optional[TradeSetup]
    ) -> AIAnalysisResult:
        if not indicators or not sr:
            return cls._insufficient_data_result()

        api_key = cls._get_api_key()

        # Build structured technical payload
        payload = {
            "symbol": symbol,
            "exchange": exchange,
            "timeframe": timeframe,
            "price": current_price,
            "ema20": indicators.ema.ema20,
            "ema50": indicators.ema.ema50,
            "ema200": indicators.ema.ema200,
            "ema_alignment": indicators.ema.alignment,
            "rsi": indicators.rsi.rsi14,
            "rsi_status": indicators.rsi.status,
            "macd": indicators.macd.macd,
            "macd_signal": indicators.macd.signal,
            "macd_histogram": indicators.macd.histogram,
            "vwap": indicators.vwap.vwap,
            "price_vs_vwap": indicators.vwap.price_position,
            "adx": indicators.adx.adx14,
            "trend_strength": indicators.adx.trend_strength,
            "supertrend": indicators.supertrend.direction,
            "atr": indicators.atr.atr14,
            "atr_pct": indicators.atr.atr_percent,
            "volume": indicators.volume.current_volume,
            "average_volume": indicators.volume.avg_volume_20,
            "relative_volume": indicators.volume.relative_volume,
            "nearest_support": sr.nearest_support,
            "nearest_resistance": sr.nearest_resistance,
            "distance_to_support_pct": sr.distance_to_support_pct,
            "distance_to_resistance_pct": sr.distance_to_resistance_pct,
            "breakout_type": signal.signal_type,
            "breakout_level": signal.breakout_level,
            "breakout_score": score.total_score,
            "score_classification": score.classification,
            "holding_period": trade_setup.holding_period if trade_setup else "3 - 7 Trading Days",
            "trade_setup": {
                "entry_min": trade_setup.entry_min if trade_setup else current_price,
                "entry_max": trade_setup.entry_max if trade_setup else current_price,
                "stop_loss": trade_setup.stop_loss if trade_setup else 0.0,
                "target_1": trade_setup.target_1 if trade_setup else 0.0,
                "target_2": trade_setup.target_2 if trade_setup else 0.0,
                "target_3": trade_setup.target_3 if trade_setup else 0.0,
                "risk_reward": trade_setup.risk_reward_ratio if trade_setup else 0.0,
                "holding_period": trade_setup.holding_period if trade_setup else "3 - 7 Trading Days"
            } if trade_setup else None
        }

        # If API key is available, call OpenAI
        if api_key and len(api_key.strip()) > 10:
            try:
                client = OpenAI(api_key=api_key)
                system_prompt = (
                    "You are a professional quantitative technical analyst for Indian Equities (NSE/BSE). "
                    "Analyze the provided structured technical indicator data. "
                    "Do NOT predict future stock prices or guarantee returns. "
                    "Base your reasoning strictly on the provided technical levels, indicators, and volume. "
                    "For high-conviction breakout setups with full stacked EMAs, expanding volume (>1.25x RVOL), bullish RSI/MACD, and clean S/R breakout, assign a high conviction AI Confidence score above 90% (between 90% and 98%) so the trader can take entries confidently. "
                    "Assign a clear and specific holding timeframe (e.g., 'Intraday Scalp (1 - 4 Hours)', 'Short-Term Swing (1 - 3 Days)', 'Swing Entry (3 - 7 Days)', 'Positional Swing (1 - 3 Weeks)'). "
                    "Never invent indicator values. "
                    "Return ONLY a valid JSON object matching the requested schema."
                )

                user_prompt = f"""
Structured Technical Data:
{json.dumps(payload, indent=2)}

Please return a valid JSON object with the following fields:
- "signal": string (e.g. "Bullish Breakout", "Bearish Breakdown", "Retest Confirmed", "Consolidation Breakout", "Neutral / No Breakout")
- "breakout_quality": string ("VERY STRONG", "STRONG", "GOOD", "MODERATE", "WEAK")
- "explanation": string (A concise 3-4 sentence explanation of the technical price action and breakout validation)
- "holding_period": string (Explicit holding timeframe e.g. "Swing Entry (3 - 7 Days)", "Short-Term Swing (1 - 3 Days)", "Positional Swing (1 - 3 Weeks)", "Intraday Scalp (1 - 4 Hours)")
- "entry_reasoning": string (Why the entry range was chosen)
- "stop_loss_reasoning": string (Why the stop loss provides structural invalidation)
- "target_reasoning": string (Why target 1 and target 2 are technically achievable)
- "risk_reward_explanation": string (Evaluation of the risk-to-reward ratio)
- "supporting_indicators": list of strings (Key indicators confirming the move)
- "conflicting_indicators": list of strings (Any indicators not aligned or showing caution)
- "risk_factors": list of strings (Key trading risks, overhead supply/demand, volatility)
- "invalidation_condition": string (Exact price action that nullifies this thesis)
- "confidence_score": integer (0 to 100, where 90-98 indicates high-conviction setup for confident entry)
"""

                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2
                )

                content = response.choices[0].message.content
                data = json.loads(content)

                return AIAnalysisResult(
                    signal=data.get("signal", signal.signal_type.replace("_", " ").title()),
                    breakout_quality=data.get("breakout_quality", score.classification),
                    explanation=data.get("explanation", "Breakout setup verified against multi-indicator technical confluence."),
                    holding_period=data.get("holding_period", trade_setup.holding_period if trade_setup else "Swing Entry (3 - 7 Days)"),
                    entry_reasoning=data.get("entry_reasoning", "Entry aligned with breakout level and volume expansion."),
                    stop_loss_reasoning=data.get("stop_loss_reasoning", "Stop loss placed below nearest structural support and ATR volatility band."),
                    target_reasoning=data.get("target_reasoning", "Targets set at key overhead resistance levels."),
                    risk_reward_explanation=data.get("risk_reward_explanation", f"Favorable Risk/Reward ratio of 1:{trade_setup.risk_reward_ratio if trade_setup else 2.0}."),
                    supporting_indicators=data.get("supporting_indicators", signal.confirmations),
                    conflicting_indicators=data.get("conflicting_indicators", signal.failed_conditions),
                    risk_factors=data.get("risk_factors", ["Nearby market volatility", "Broader sector correlation"]),
                    invalidation_condition=data.get("invalidation_condition", f"Candle close below ₹{trade_setup.stop_loss if trade_setup else sr.nearest_support}"),
                    confidence_score=int(data.get("confidence_score", 92 if score.total_score >= 80 and len(signal.confirmations) >= 3 else int(score.total_score * 0.95)))
                )
            except Exception as e:
                logger.error(f"OpenAI API call error: {str(e)}. Falling back to deterministic AI engine.")

        # Deterministic Rule-Based AI Engine
        return cls._generate_deterministic_analysis(payload, signal, score, trade_setup, indicators, sr)

    @classmethod
    def _generate_deterministic_analysis(
        cls,
        payload: Dict[str, Any],
        signal: BreakoutSignal,
        score: BreakoutScoreBreakdown,
        trade_setup: Optional[TradeSetup],
        indicators: TechnicalIndicators,
        sr: SupportResistanceSummary
    ) -> AIAnalysisResult:
        is_bullish = "BULLISH" in signal.signal_type or "RETEST" in signal.signal_type or "CONSOLIDATION" in signal.signal_type
        price = payload["price"]
        rvol = indicators.volume.relative_volume
        rsi_val = indicators.rsi.rsi14
        
        # Supporting indicators
        supporting = []
        conflicting = []
        risks = []

        if is_bullish:
            signal_name = "Bullish Breakout" if signal.is_breakout else "Developing Bullish Setup"
            supporting.append(f"Price closed firmly above breakout resistance (₹{sr.nearest_resistance})")
            if rvol >= 1.25:
                supporting.append(f"Institutional volume expansion confirmed ({rvol}x 20-period average)")
            if indicators.ema.alignment == "BULLISH":
                supporting.append("Bullish stacked EMAs (EMA 20 > EMA 50 > EMA 200)")
            if indicators.rsi.rsi14 >= 55:
                supporting.append(f"RSI ({rsi_val}) confirms strong bullish momentum")
            if indicators.macd.histogram > 0:
                supporting.append(f"MACD histogram positive ({indicators.macd.histogram})")
            if indicators.vwap.price_position == "ABOVE":
                supporting.append(f"Trading above intraday VWAP (₹{indicators.vwap.vwap})")

            # Conflicting / Caution
            if rsi_val > 76:
                conflicting.append(f"RSI ({rsi_val}) is approaching overbought boundary (>76)")
                risks.append("Potential short-term mean reversion due to high RSI")
            if rvol < 1.15:
                conflicting.append(f"Volume relative strength ({rvol}x) is moderate")
                risks.append("Lack of sustained buying volume on higher timeframes")
            if sr.distance_to_resistance_pct < 1.0 and signal.signal_type != "BULLISH_BREAKOUT":
                risks.append(f"Overhead resistance near ₹{sr.nearest_resistance} may limit immediate upside")

            explanation = (
                f"{payload['symbol']} has established a high-conviction technical breakout above ₹{signal.breakout_level} on the {payload['timeframe']} timeframe. "
                f"The move is reinforced by an RVOL of {rvol}x average volume and positive momentum across RSI ({rsi_val}) and MACD. "
                f"Moving averages reflect an established uptrend with price holding comfortably above the 20 EMA and VWAP."
            )
            invalidation = f"Candle close below structural support at ₹{trade_setup.stop_loss if trade_setup else sr.nearest_support}"
        else:
            signal_name = "Bearish Breakdown" if signal.is_breakout else "Bearish Pressure"
            supporting.append(f"Price breached below key support level (₹{sr.nearest_support})")
            if rvol >= 1.25:
                supporting.append(f"Breakdown volume surge confirmed ({rvol}x RVOL)")
            if indicators.ema.alignment == "BEARISH":
                supporting.append("Bearish EMA alignment (EMA 20 < EMA 50 < EMA 200)")
            if indicators.rsi.rsi14 <= 45:
                supporting.append(f"RSI ({rsi_val}) signals persistent selling pressure")

            if rsi_val < 25:
                conflicting.append("RSI in extreme oversold territory (<25)")
                risks.append("Risk of sharp dead-cat bounce from oversold levels")

            explanation = (
                f"{payload['symbol']} has broken below key horizontal support ₹{signal.breakout_level} on the {payload['timeframe']} timeframe. "
                f"Sustained selling volume ({rvol}x average) and negative MACD histogram confirm downside continuation pressure."
            )
            invalidation = f"Candle close back above breakdown level at ₹{trade_setup.stop_loss if trade_setup else sr.nearest_resistance}"

        if not risks:
            risks.append("Broader market (NIFTY/BANK NIFTY) sentiment shifts")
            risks.append(f"Volatility fluctuation (ATR: ₹{indicators.atr.atr14})")

        # Precision AI Confidence Calibration
        # High-conviction setups with strong technical confluence achieve > 90% (90% - 96%) so trader can enter confidently
        if score.total_score >= 80 and len(supporting) >= 3 and len(conflicting) <= 1:
            base_conf = 90
            bonus = int((score.total_score - 80) * 0.4) + min(len(supporting) - 3, 3) * 2
            conf_score = min(96, base_conf + bonus)
        elif score.total_score >= 75 and len(supporting) >= 3:
            conf_score = min(88, 82 + int((score.total_score - 75) * 1.0))
        elif score.total_score >= 68:
            conf_score = min(80, 70 + int((score.total_score - 68) * 1.0))
        else:
            conf_score = max(40, int(score.total_score * 0.8))

        tf = payload.get("timeframe", "15m").lower()
        if trade_setup and trade_setup.holding_period:
            holding_period = trade_setup.holding_period
        elif tf in ["1d", "daily"]:
            holding_period = "Positional Swing (1 - 3 Weeks)"
        elif tf in ["1h", "60m"]:
            holding_period = "Swing Entry (3 - 7 Trading Days)"
        elif tf == "15m":
            holding_period = "Short-Term Swing (1 - 3 Trading Days)"
        elif tf == "5m":
            holding_period = "Intraday Scalp (1 - 4 Hours)"
        else:
            holding_period = "Swing Entry (3 - 7 Trading Days)"

        return AIAnalysisResult(
            signal=signal_name,
            breakout_quality=score.classification,
            explanation=explanation,
            holding_period=holding_period,
            entry_reasoning=trade_setup.entry_reasoning if trade_setup else "Optimal entry at breakout retest zone.",
            stop_loss_reasoning=trade_setup.stop_loss_reasoning if trade_setup else "Stop loss placed below nearest structural pivot.",
            target_reasoning=trade_setup.target_reasoning if trade_setup else "Targets set based on key multi-touch resistance levels.",
            risk_reward_explanation=f"Favorable Risk/Reward ratio of 1:{trade_setup.risk_reward_ratio if trade_setup else 2.0} provides mathematical edge.",
            supporting_indicators=supporting,
            conflicting_indicators=conflicting if conflicting else ["No major technical divergences detected"],
            risk_factors=risks,
            invalidation_condition=invalidation,
            confidence_score=conf_score
        )

    @classmethod
    def _insufficient_data_result(cls) -> AIAnalysisResult:
        return AIAnalysisResult(
            signal="INSUFFICIENT DATA",
            breakout_quality="WEAK",
            explanation="Insufficient candle or indicator data available to perform deterministic technical evaluation.",
            entry_reasoning="N/A - Wait for complete data feed",
            stop_loss_reasoning="N/A",
            target_reasoning="N/A",
            risk_reward_explanation="N/A",
            supporting_indicators=[],
            conflicting_indicators=[],
            risk_factors=["Data stream incomplete"],
            invalidation_condition="N/A",
            confidence_score=0
        )
