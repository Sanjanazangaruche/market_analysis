import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np

from backend.market_data.provider_factory import get_market_data_provider
from backend.indicators.engine import IndicatorEngine
from backend.support_resistance.detector import SupportResistanceDetector
from backend.breakout.detector import BreakoutDetector
from backend.strategy.scoring import BreakoutScoringEngine
from backend.strategy.trade_setup import TradeSetupEngine
from backend.models.schemas import (
    BacktestRequest, BacktestResult, BacktestTrade
)
from backend.database.db import get_db_connection

logger = logging.getLogger(__name__)

class BacktestingEngine:
    """
    Quantitative Backtesting Engine for the Breakout Strategy.
    Runs simulated historical candle simulations, tracking entry triggers,
    SL/TP executions, win rates, drawdown, and equity progression.
    """

    @classmethod
    def run_backtest(cls, req: BacktestRequest) -> BacktestResult:
        provider = get_market_data_provider()
        candle_count = 250 if req.timeframe == "1d" else 300
        df = provider.get_candles(req.symbol, timeframe=req.timeframe, count=candle_count, exchange=req.exchange)

        if df.empty or len(df) < 50:
            return BacktestResult(
                symbol=req.symbol,
                timeframe=req.timeframe,
                period=f"{req.period_days} Days",
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate_pct=0.0,
                profit_factor=0.0,
                total_pnl=0.0,
                total_pnl_pct=0.0,
                max_drawdown_pct=0.0,
                avg_risk_reward=0.0,
                trades=[],
                equity_curve=[]
            )

        capital = req.initial_capital
        peak_capital = capital
        max_drawdown = 0.0

        trades: List[BacktestTrade] = []
        equity_curve: List[Dict[str, Any]] = [
            {"time": str(df['timestamp'].iloc[0]), "equity": round(capital, 2), "pnl": 0.0}
        ]

        active_trade = None
        warmup = 35

        for i in range(warmup, len(df)):
            current_window = df.iloc[:i+1]
            curr_candle = df.iloc[i]
            curr_time = str(curr_candle['timestamp'])
            curr_high = float(curr_candle['high'])
            curr_low = float(curr_candle['low'])
            curr_close = float(curr_candle['close'])

            # 1. Manage Active Trade if any
            if active_trade is not None:
                trade_type = active_trade["type"]
                entry_p = active_trade["entry_price"]
                sl = active_trade["sl"]
                t1 = active_trade["t1"]
                t2 = active_trade["t2"]
                qty = active_trade["qty"]
                score = active_trade["score"]
                entry_time = active_trade["entry_time"]
                hold_bars = i - active_trade["entry_index"]

                exit_price = None
                exit_reason = None

                if trade_type == "LONG":
                    # Check SL
                    if curr_low <= sl:
                        exit_price = sl
                        exit_reason = "STOP_LOSS"
                    # Check T2
                    elif curr_high >= t2:
                        exit_price = t2
                        exit_reason = "TARGET_2"
                    # Check T1
                    elif curr_high >= t1:
                        exit_price = t1
                        exit_reason = "TARGET_1"
                    # Timeout after 20 bars
                    elif hold_bars >= 20:
                        exit_price = curr_close
                        exit_reason = "TIMEOUT"

                    if exit_price is not None:
                        pnl = (exit_price - entry_p) * qty
                        pnl_pct = ((exit_price - entry_p) / entry_p) * 100.0
                        capital += pnl
                        peak_capital = max(peak_capital, capital)
                        drawdown = ((peak_capital - capital) / peak_capital) * 100.0
                        max_drawdown = max(max_drawdown, drawdown)

                        trades.append(BacktestTrade(
                            symbol=req.symbol,
                            entry_time=entry_time,
                            entry_price=round(entry_p, 2),
                            exit_time=curr_time,
                            exit_price=round(exit_price, 2),
                            trade_type="LONG",
                            quantity=qty,
                            pnl=round(pnl, 2),
                            pnl_pct=round(pnl_pct, 2),
                            exit_reason=exit_reason,
                            score_at_entry=round(score, 1)
                        ))

                        equity_curve.append({
                            "time": curr_time,
                            "equity": round(capital, 2),
                            "pnl": round(pnl, 2)
                        })
                        active_trade = None

                else: # SHORT
                    if curr_high >= sl:
                        exit_price = sl
                        exit_reason = "STOP_LOSS"
                    elif curr_low <= t2:
                        exit_price = t2
                        exit_reason = "TARGET_2"
                    elif curr_low <= t1:
                        exit_price = t1
                        exit_reason = "TARGET_1"
                    elif hold_bars >= 20:
                        exit_price = curr_close
                        exit_reason = "TIMEOUT"

                    if exit_price is not None:
                        pnl = (entry_p - exit_price) * qty
                        pnl_pct = ((entry_p - exit_price) / entry_p) * 100.0
                        capital += pnl
                        peak_capital = max(peak_capital, capital)
                        drawdown = ((peak_capital - capital) / peak_capital) * 100.0
                        max_drawdown = max(max_drawdown, drawdown)

                        trades.append(BacktestTrade(
                            symbol=req.symbol,
                            entry_time=entry_time,
                            entry_price=round(entry_p, 2),
                            exit_time=curr_time,
                            exit_price=round(exit_price, 2),
                            trade_type="SHORT",
                            quantity=qty,
                            pnl=round(pnl, 2),
                            pnl_pct=round(pnl_pct, 2),
                            exit_reason=exit_reason,
                            score_at_entry=round(score, 1)
                        ))

                        equity_curve.append({
                            "time": curr_time,
                            "equity": round(capital, 2),
                            "pnl": round(pnl, 2)
                        })
                        active_trade = None

            # 2. Check for New Setup if no trade active
            if active_trade is None and i < len(df) - 1:
                indicators = IndicatorEngine.compute_all_indicators(current_window)
                sr = SupportResistanceDetector.calculate_support_resistance(current_window)
                signal = BreakoutDetector.detect_breakout(current_window, indicators, sr)
                score_obj = BreakoutScoringEngine.calculate_score(signal, indicators, sr)

                if signal.is_breakout and score_obj.total_score >= req.min_breakout_score:
                    setup = TradeSetupEngine.generate_trade_setup(
                        req.symbol, req.exchange, curr_close, signal, indicators, sr
                    )
                    if setup:
                        is_bullish = "BUY" in setup.setup_type or "BULLISH" in signal.signal_type
                        risk_capital = capital * (req.risk_per_trade_pct / 100.0)
                        qty = max(1, int(risk_capital / max(setup.risk_per_share, 1.0)))

                        active_trade = {
                            "type": "LONG" if is_bullish else "SHORT",
                            "entry_price": curr_close,
                            "entry_time": curr_time,
                            "entry_index": i,
                            "sl": setup.stop_loss,
                            "t1": setup.target_1,
                            "t2": setup.target_2,
                            "qty": qty,
                            "score": score_obj.total_score,
                            "rr": setup.risk_reward_ratio
                        }

        # Calculate summary statistics
        total_trades = len(trades)
        winning_trades = len([t for t in trades if t.pnl > 0])
        losing_trades = len([t for t in trades if t.pnl <= 0])
        win_rate = (winning_trades / total_trades * 100.0) if total_trades > 0 else 0.0

        gross_profit = sum(t.pnl for t in trades if t.pnl > 0)
        gross_loss = abs(sum(t.pnl for t in trades if t.pnl < 0))
        profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else (99.0 if gross_profit > 0 else 1.0)

        total_pnl = capital - req.initial_capital
        total_pnl_pct = (total_pnl / req.initial_capital) * 100.0

        # Save run to SQLite
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO backtest_runs (
                strategy_name, symbol, timeframe, total_trades,
                winning_trades, losing_trades, win_rate, profit_factor,
                max_drawdown, net_profit, results_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "Breakout Confluence",
                req.symbol,
                req.timeframe,
                total_trades,
                winning_trades,
                losing_trades,
                round(win_rate, 2),
                round(profit_factor, 2),
                round(max_drawdown, 2),
                round(total_pnl, 2),
                json.dumps([t.model_dump() for t in trades])
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving backtest run: {str(e)}")

        return BacktestResult(
            symbol=req.symbol,
            timeframe=req.timeframe,
            period=f"{req.period_days} Days ({len(df)} candles)",
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate_pct=round(win_rate, 1),
            profit_factor=round(profit_factor, 2),
            total_pnl=round(total_pnl, 2),
            total_pnl_pct=round(total_pnl_pct, 2),
            max_drawdown_pct=round(max_drawdown, 2),
            avg_risk_reward=round(sum(t.pnl_pct for t in trades) / total_trades, 2) if total_trades > 0 else 2.0,
            trades=trades,
            equity_curve=equity_curve
        )
