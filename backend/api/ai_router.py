from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, Optional
from backend.services.scanner_service import scanner_service
from backend.ai.openai_analyzer import AIAnalyzer
from backend.models.schemas import AIAnalysisResult

router = APIRouter(prefix="/api/ai", tags=["AI Analysis"])

@router.post("/analyze")
async def analyze_stock_with_ai(
    symbol: str = Query(...),
    exchange: str = Query("NSE"),
    timeframe: str = Query("15m")
):
    """Run an on-demand AI deep dive on any stock setup."""
    clean_sym = symbol.upper()
    scan_res = scanner_service.scan_single_stock(clean_sym, exchange=exchange, timeframe=timeframe)
    if not scan_res:
        raise HTTPException(status_code=404, detail=f"Could not compute technical indicators for {clean_sym}")

    ai_result = AIAnalyzer.analyze_setup(
        symbol=clean_sym,
        exchange=exchange,
        timeframe=timeframe,
        current_price=scan_res.current_price,
        indicators=scan_res.indicators,
        sr=scan_res.support_resistance,
        signal=scan_res.breakout_signal,
        score=scan_res.score_breakdown,
        trade_setup=scan_res.trade_setup
    )

    return {
        "symbol": clean_sym,
        "exchange": exchange,
        "timeframe": timeframe,
        "current_price": scan_res.current_price,
        "score": scan_res.score_breakdown.total_score,
        "classification": scan_res.score_breakdown.classification,
        "trade_setup": scan_res.trade_setup,
        "ai_analysis": ai_result
    }
