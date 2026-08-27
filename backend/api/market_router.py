from fastapi import APIRouter
from typing import List, Dict, Any
from backend.market_data.provider_factory import get_market_data_provider

router = APIRouter(prefix="/api/market", tags=["Market"])

@router.get("/overview")
async def get_market_overview():
    """Get market benchmark indices (NIFTY 50, BANK NIFTY, SENSEX) and trading session status."""
    provider = get_market_data_provider()
    indices = provider.get_market_indices()
    is_open = provider.is_market_open()

    return {
        "is_market_open": is_open,
        "session_status": "LIVE MARKET" if is_open else "MARKET CLOSED",
        "market_indices": indices,
        "market_sentiment": "BULLISH" if sum(1 for idx in indices if idx.trend == "BULLISH") >= 2 else ("BEARISH" if sum(1 for idx in indices if idx.trend == "BEARISH") >= 2 else "NEUTRAL")
    }

@router.get("/status")
async def get_market_status():
    provider = get_market_data_provider()
    return {
        "is_open": provider.is_market_open(),
        "timezone": "Asia/Kolkata",
        "trading_hours": "09:15 - 15:30 IST (Mon-Fri)"
    }
