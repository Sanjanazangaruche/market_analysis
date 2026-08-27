import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.models.schemas import PaperTrade, PaperTradeOrder
from backend.database.db import get_db_connection

logger = logging.getLogger(__name__)

class PaperTradingEngine:
    """
    Simulated Paper Trading Engine.
    Manages orders, live mark-to-market position updates, automatic SL/TP triggers,
    and portfolio statistics.
    """

    @classmethod
    def place_order(cls, order: PaperTradeOrder) -> Optional[PaperTrade]:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO paper_trades (
                symbol, exchange, signal_type, entry_price, quantity,
                stop_loss, target_1, target_2, current_price, status,
                pnl, pnl_percent, entry_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', 0.0, 0.0, CURRENT_TIMESTAMP)
            """, (
                order.symbol.upper(),
                order.exchange.upper(),
                order.signal_type.upper(),
                order.entry_price,
                order.quantity,
                order.stop_loss,
                order.target_1,
                order.target_2,
                order.entry_price
            ))

            trade_id = cursor.lastrowid
            conn.commit()

            cursor.execute("SELECT * FROM paper_trades WHERE id = ?", (trade_id,))
            row = cursor.fetchone()
            conn.close()

            if row:
                return cls._row_to_trade(row)
        except Exception as e:
            logger.error(f"Error placing paper trade: {str(e)}")

        return None

    @classmethod
    def get_all_trades(cls) -> List[PaperTrade]:
        results = []
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM paper_trades ORDER BY id DESC")
            rows = cursor.fetchall()
            conn.close()

            for row in rows:
                results.append(cls._row_to_trade(row))
        except Exception as e:
            logger.error(f"Error fetching paper trades: {str(e)}")

        return results

    @classmethod
    def update_position_price(cls, symbol: str, current_price: float) -> List[PaperTrade]:
        """
        Updates live P&L and checks for automatic SL/TP execution.
        """
        updated_trades = []
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM paper_trades WHERE symbol = ? AND status = 'OPEN'", (symbol.upper(),))
            rows = cursor.fetchall()

            for row in rows:
                trade_id = row["id"]
                sig_type = row["signal_type"]
                entry_p = row["entry_price"]
                qty = row["quantity"]
                sl = row["stop_loss"]
                t1 = row["target_1"]
                t2 = row["target_2"]

                new_status = "OPEN"
                exit_price = None
                exit_reason = None

                if sig_type == "BUY":
                    pnl = (current_price - entry_p) * qty
                    pnl_pct = ((current_price - entry_p) / entry_p) * 100.0

                    # Check SL
                    if current_price <= sl:
                        new_status = "CLOSED_SL"
                        exit_price = sl
                        exit_reason = f"Stop Loss hit at ₹{sl}"
                        pnl = (sl - entry_p) * qty
                        pnl_pct = ((sl - entry_p) / entry_p) * 100.0
                    # Check Target 2
                    elif current_price >= t2:
                        new_status = "CLOSED_TP2"
                        exit_price = t2
                        exit_reason = f"Target 2 hit at ₹{t2}"
                        pnl = (t2 - entry_p) * qty
                        pnl_pct = ((t2 - entry_p) / entry_p) * 100.0
                    # Check Target 1
                    elif current_price >= t1:
                        new_status = "CLOSED_TP1"
                        exit_price = t1
                        exit_reason = f"Target 1 hit at ₹{t1}"
                        pnl = (t1 - entry_p) * qty
                        pnl_pct = ((t1 - entry_p) / entry_p) * 100.0

                else: # SELL / SHORT
                    pnl = (entry_p - current_price) * qty
                    pnl_pct = ((entry_p - current_price) / entry_p) * 100.0

                    if current_price >= sl:
                        new_status = "CLOSED_SL"
                        exit_price = sl
                        exit_reason = f"Stop Loss hit at ₹{sl}"
                        pnl = (entry_p - sl) * qty
                        pnl_pct = ((entry_p - sl) / entry_p) * 100.0
                    elif current_price <= t2:
                        new_status = "CLOSED_TP2"
                        exit_price = t2
                        exit_reason = f"Target 2 hit at ₹{t2}"
                        pnl = (entry_p - t2) * qty
                        pnl_pct = ((entry_p - t2) / entry_p) * 100.0
                    elif current_price <= t1:
                        new_status = "CLOSED_TP1"
                        exit_price = t1
                        exit_reason = f"Target 1 hit at ₹{t1}"
                        pnl = (entry_p - t1) * qty
                        pnl_pct = ((entry_p - t1) / entry_p) * 100.0

                if new_status != "OPEN":
                    cursor.execute("""
                    UPDATE paper_trades
                    SET current_price = ?, status = ?, pnl = ?, pnl_percent = ?,
                        exit_time = CURRENT_TIMESTAMP, exit_price = ?, exit_reason = ?
                    WHERE id = ?
                    """, (round(current_price, 2), new_status, round(pnl, 2), round(pnl_pct, 2), exit_price, exit_reason, trade_id))
                else:
                    cursor.execute("""
                    UPDATE paper_trades
                    SET current_price = ?, pnl = ?, pnl_percent = ?
                    WHERE id = ?
                    """, (round(current_price, 2), round(pnl, 2), round(pnl_pct, 2), trade_id))

            conn.commit()

            cursor.execute("SELECT * FROM paper_trades WHERE symbol = ?", (symbol.upper(),))
            updated_rows = cursor.fetchall()
            conn.close()

            for r in updated_rows:
                updated_trades.append(cls._row_to_trade(r))

        except Exception as e:
            logger.error(f"Error updating paper trades for {symbol}: {str(e)}")

        return updated_trades

    @classmethod
    def close_trade_manually(cls, trade_id: int, exit_price: Optional[float] = None) -> Optional[PaperTrade]:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM paper_trades WHERE id = ?", (trade_id,))
            row = cursor.fetchone()

            if not row or row["status"] != "OPEN":
                conn.close()
                return None

            close_p = exit_price if exit_price is not None else row["current_price"]
            entry_p = row["entry_price"]
            qty = row["quantity"]
            sig = row["signal_type"]

            pnl = (close_p - entry_p) * qty if sig == "BUY" else (entry_p - close_p) * qty
            pnl_pct = ((close_p - entry_p) / entry_p * 100.0) if sig == "BUY" else ((entry_p - close_p) / entry_p * 100.0)

            cursor.execute("""
            UPDATE paper_trades
            SET status = 'CLOSED_MANUAL', exit_time = CURRENT_TIMESTAMP, exit_price = ?, exit_reason = 'Manually closed by trader',
                pnl = ?, pnl_percent = ?, current_price = ?
            WHERE id = ?
            """, (round(close_p, 2), round(pnl, 2), round(pnl_pct, 2), round(close_p, 2), trade_id))
            conn.commit()

            cursor.execute("SELECT * FROM paper_trades WHERE id = ?", (trade_id,))
            updated_row = cursor.fetchone()
            conn.close()

            return cls._row_to_trade(updated_row)
        except Exception as e:
            logger.error(f"Error closing paper trade {trade_id}: {str(e)}")
            return None

    @classmethod
    def get_portfolio_summary(cls) -> Dict[str, Any]:
        trades = cls.get_all_trades()
        open_trades = [t for t in trades if t.status == "OPEN"]
        closed_trades = [t for t in trades if t.status != "OPEN"]

        total_pnl = sum(t.pnl for t in trades)
        realized_pnl = sum(t.pnl for t in closed_trades)
        unrealized_pnl = sum(t.pnl for t in open_trades)

        winning_trades = len([t for t in closed_trades if t.pnl > 0])
        losing_trades = len([t for t in closed_trades if t.pnl < 0])
        win_rate = (winning_trades / len(closed_trades) * 100.0) if closed_trades else 0.0

        return {
            "total_trades": len(trades),
            "open_positions": len(open_trades),
            "closed_trades": len(closed_trades),
            "total_pnl": round(total_pnl, 2),
            "realized_pnl": round(realized_pnl, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "winning_trades": winning_trades,
            "losing_trades": losing_trades,
            "win_rate_percent": round(win_rate, 1)
        }

    @staticmethod
    def _row_to_trade(row) -> PaperTrade:
        return PaperTrade(
            id=row["id"],
            symbol=row["symbol"],
            exchange=row["exchange"],
            signal_type=row["signal_type"],
            entry_price=row["entry_price"],
            quantity=row["quantity"],
            stop_loss=row["stop_loss"],
            target_1=row["target_1"],
            target_2=row["target_2"],
            current_price=row["current_price"],
            status=row["status"],
            pnl=row["pnl"],
            pnl_percent=row["pnl_percent"],
            entry_time=str(row["entry_time"]),
            exit_time=str(row["exit_time"]) if row["exit_time"] else None,
            exit_price=row["exit_price"],
            exit_reason=row["exit_reason"]
        )
