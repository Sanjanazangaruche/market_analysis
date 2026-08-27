import json
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.backtesting.engine import BacktestingEngine
from backend.models.schemas import BacktestRequest, BacktestResult
from backend.database.db import get_db_connection

router = APIRouter(prefix="/api/backtest", tags=["Backtesting"])

@router.post("/run", response_model=BacktestResult)
async def run_backtest(req: BacktestRequest):
    """Run simulated historical backtest for breakout strategy."""
    result = BacktestingEngine.run_backtest(req)
    return result

@router.get("/history")
async def get_backtest_history(limit: int = 20):
    """Get previous backtesting experiment runs from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM backtest_runs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()

    history = []
    for r in rows:
        history.append({
            "id": r["id"],
            "strategy_name": r["strategy_name"],
            "symbol": r["symbol"],
            "timeframe": r["timeframe"],
            "total_trades": r["total_trades"],
            "winning_trades": r["winning_trades"],
            "losing_trades": r["losing_trades"],
            "win_rate": r["win_rate"],
            "profit_factor": r["profit_factor"],
            "max_drawdown": r["max_drawdown"],
            "net_profit": r["net_profit"],
            "created_at": str(r["created_at"])
        })
    return history
