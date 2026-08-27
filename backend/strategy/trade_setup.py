from typing import Optional, List
from backend.models.schemas import (
    TradeSetup, BreakoutSignal, TechnicalIndicators, SupportResistanceSummary
)

class TradeSetupEngine:
    """
    Precision Trade Setup Engine.
    Calculates Entry zones, Stop Losses, Multi-tier Targets (T1, T2, T3),
    Risk/Reward ratios, and technical justifications based on actual S/R levels and ATR.
    """

    @classmethod
    def generate_trade_setup(
        cls,
        symbol: str,
        exchange: str,
        current_price: float,
        signal: BreakoutSignal,
        indicators: TechnicalIndicators,
        sr: SupportResistanceSummary,
        timeframe: str = "15m"
    ) -> Optional[TradeSetup]:
        if not signal.is_breakout and signal.confirmation_count < 3:
            return None

        is_bearish = "BEARISH" in signal.signal_type
        atr_val = indicators.atr.atr14 if indicators.atr.atr14 > 0 else (current_price * 0.015)
        breakout_lvl = signal.breakout_level if signal.breakout_level > 0 else current_price

        # Calculate estimated holding period
        tf = timeframe.lower()
        if tf == "5m":
            holding_period = "Intraday Scalp (1 - 4 Hours)"
        elif tf == "15m":
            holding_period = "Short-Term Swing (1 - 3 Trading Days)"
        elif tf in ["1h", "60m"]:
            holding_period = "Swing Entry (3 - 7 Trading Days)"
        elif tf in ["1d", "daily"]:
            holding_period = "Positional Swing (1 - 3 Weeks)"
        else:
            holding_period = "Swing Entry (3 - 7 Trading Days)"

        if not is_bearish:
            # --- BULLISH TRADE SETUP ---
            setup_type = "RETEST_BUY" if signal.signal_type == "RETEST_CONFIRMED" else "BUY_BREAKOUT"
            
            # Entry Zone: between breakout level and current market price
            entry_min = round(min(breakout_lvl, current_price), 2)
            entry_max = round(max(breakout_lvl * 1.002, current_price * 1.002), 2)
            avg_entry = (entry_min + entry_max) / 2.0

            # Stop Loss Calculation:
            # Strategy: Place SL just below breakout level / nearest support or 1.5 * ATR, whichever provides safe invalidation
            support_candidates = [s.price for s in sr.all_supports if s.price < avg_entry]
            if support_candidates:
                nearest_sup_below = max(support_candidates)
                # Ensure SL is not too tight (at least 0.8 * ATR) and not too loose (> 2.5 * ATR)
                raw_sl = min(nearest_sup_below * 0.996, avg_entry - 0.9 * atr_val)
                stop_loss = max(raw_sl, avg_entry - 2.0 * atr_val)
                sl_reasoning = f"Set below key structural support ₹{nearest_sup_below} with ATR buffer (1.2x ATR: ₹{round(atr_val*1.2, 2)})"
            else:
                stop_loss = round(avg_entry - (1.3 * atr_val), 2)
                sl_reasoning = f"Volatility-based stop loss set at 1.3x ATR (₹{round(atr_val*1.3, 2)}) below entry zone"

            risk_per_share = max(round(avg_entry - stop_loss, 2), 0.5)

            # Targets Calculation:
            # Look for higher resistance levels
            higher_resistances = [r.price for r in sr.all_resistances if r.price > avg_entry * 1.005]
            
            if higher_resistances:
                t1 = min(higher_resistances)
                if (t1 - avg_entry) < 1.2 * risk_per_share:
                    t1 = round(avg_entry + (1.5 * risk_per_share), 2)
                
                # T2
                if len(higher_resistances) > 1:
                    t2 = higher_resistances[1]
                    if (t2 - avg_entry) < 2.0 * risk_per_share:
                        t2 = round(avg_entry + (2.5 * risk_per_share), 2)
                else:
                    t2 = round(avg_entry + (2.5 * risk_per_share), 2)
                
                t_reason = f"T1 mapped to next overhead resistance ₹{t1}; T2 targeted at major technical resistance ₹{t2}"
            else:
                t1 = round(avg_entry + (1.5 * risk_per_share), 2)
                t2 = round(avg_entry + (2.5 * risk_per_share), 2)
                t_reason = f"Targets projected using standard risk multiples: 1.5R (T1: ₹{t1}) and 2.5R (T2: ₹{t2})"

            t3 = round(avg_entry + (3.5 * risk_per_share), 2)

            reward_t1 = round(t1 - avg_entry, 2)
            reward_t2 = round(t2 - avg_entry, 2)
            rr_ratio = round(reward_t2 / risk_per_share, 2) if risk_per_share > 0 else 2.0

            entry_reason = f"Breakout confirmed above ₹{breakout_lvl} with volume expansion ({indicators.volume.relative_volume}x RVOL) and bullish EMA alignment."

        else:
            # --- BEARISH TRADE SETUP ---
            setup_type = "RETEST_SELL" if signal.signal_type == "RETEST_CONFIRMED" else "SELL_BREAKDOWN"
            
            entry_min = round(min(current_price * 0.998, breakout_lvl * 0.998), 2)
            entry_max = round(max(breakout_lvl, current_price), 2)
            avg_entry = (entry_min + entry_max) / 2.0

            # Stop Loss Calculation
            res_candidates = [r.price for r in sr.all_resistances if r.price > avg_entry]
            if res_candidates:
                nearest_res_above = min(res_candidates)
                raw_sl = max(nearest_res_above * 1.004, avg_entry + 0.9 * atr_val)
                stop_loss = min(raw_sl, avg_entry + 2.0 * atr_val)
                sl_reasoning = f"Set above key breakdown level ₹{nearest_res_above} with ATR volatility buffer"
            else:
                stop_loss = round(avg_entry + (1.3 * atr_val), 2)
                sl_reasoning = f"Set at 1.3x ATR (₹{round(atr_val*1.3, 2)}) above breakdown entry zone"

            risk_per_share = max(round(stop_loss - avg_entry, 2), 0.5)

            # Targets
            lower_supports = [s.price for s in sr.all_supports if s.price < avg_entry * 0.995]
            if lower_supports:
                t1 = max(lower_supports)
                if (avg_entry - t1) < 1.2 * risk_per_share:
                    t1 = round(avg_entry - (1.5 * risk_per_share), 2)
                
                if len(lower_supports) > 1:
                    t2 = lower_supports[1]
                else:
                    t2 = round(avg_entry - (2.5 * risk_per_share), 2)
                t_reason = f"T1 mapped to next demand level ₹{t1}; T2 targeted at major support ₹{t2}"
            else:
                t1 = round(avg_entry - (1.5 * risk_per_share), 2)
                t2 = round(avg_entry - (2.5 * risk_per_share), 2)
                t_reason = f"Targets calculated using 1.5R (T1: ₹{t1}) and 2.5R (T2: ₹{t2}) breakdown extension"

            t3 = round(avg_entry - (3.5 * risk_per_share), 2)

            reward_t1 = round(avg_entry - t1, 2)
            reward_t2 = round(avg_entry - t2, 2)
            rr_ratio = round(reward_t2 / risk_per_share, 2) if risk_per_share > 0 else 2.0

            entry_reason = f"Bearish breakdown below key level ₹{breakout_lvl} with momentum confirmation (RSI: {indicators.rsi.rsi14})."

        return TradeSetup(
            symbol=symbol,
            exchange=exchange,
            current_price=round(current_price, 2),
            breakout_level=round(breakout_lvl, 2),
            setup_type=setup_type,
            entry_min=round(entry_min, 2),
            entry_max=round(entry_max, 2),
            stop_loss=round(stop_loss, 2),
            target_1=round(t1, 2),
            target_2=round(t2, 2),
            target_3=round(t3, 2),
            risk_per_share=round(risk_per_share, 2),
            potential_reward_t1=round(reward_t1, 2),
            potential_reward_t2=round(reward_t2, 2),
            risk_reward_ratio=round(rr_ratio, 2),
            holding_period=holding_period,
            entry_reasoning=entry_reason,
            stop_loss_reasoning=sl_reasoning,
            target_reasoning=t_reason
        )
