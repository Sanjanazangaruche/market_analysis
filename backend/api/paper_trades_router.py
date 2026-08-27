from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from backend.paper_trading.paper_engine import PaperTradingEngine
from backend.models.schemas import PaperTrade, PaperTradeOrder

router = APIRouter(prefix="/api/paper-trades", tags=["Paper Trading"])

@router.get("")
async def get_paper_trades():
    """Get all simulated paper trade positions and summary statistics."""
    trades = PaperTradingEngine.get_all_trades()
    summary = PaperTradingEngine.get_portfolio_summary()
    return {
        "summary": summary,
        "trades": trades
    }

@router.post("", response_model=PaperTrade)
async def open_paper_trade(order: PaperTradeOrder):
    """Execute a simulated paper trade based on a breakout setup."""
    trade = PaperTradingEngine.place_order(order)
    if not trade:
        raise HTTPException(status_code=400, detail="Failed to place paper trade order.")
    return trade

@router.post("/{trade_id}/close", response_model=PaperTrade)
async def close_paper_trade(trade_id: int, exit_price: float = Query(None)):
    """Manually close an open paper trade position."""
    trade = PaperTradingEngine.close_trade_manually(trade_id, exit_price=exit_price)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found or already closed.")
    return trade
