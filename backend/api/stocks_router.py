import urllib.parse
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from backend.services.scanner_service import scanner_service
from backend.market_data.provider_factory import get_market_data_provider
from backend.market_data.mock_provider import MockMarketDataProvider
from backend.models.schemas import StockScanResult, Candle, StockQuote

router = APIRouter(prefix="/api/stocks", tags=["Stocks"])

def _clean_symbol(raw_symbol: str) -> str:
    unquoted = urllib.parse.unquote(raw_symbol).strip().upper()
    return unquoted

@router.get("/{symbol}")
async def get_stock_analysis(symbol: str, exchange: str = Query("NSE"), timeframe: str = Query("15m")):
    """Get in-depth technical and AI analysis for a specific stock."""
    clean_sym = _clean_symbol(symbol)
    res = scanner_service.scan_single_stock(clean_sym, exchange=exchange, timeframe=timeframe)
    
    if not res:
        # Retry with guaranteed mock fallback
        from backend.indicators.engine import IndicatorEngine
        from backend.support_resistance.detector import SupportResistanceDetector
        from backend.breakout.detector import BreakoutDetector
        from backend.strategy.scoring import BreakoutScoringEngine
        from backend.strategy.trade_setup import TradeSetupEngine
        from backend.strategy.multi_timeframe import MultiTimeframeAnalyzer
        from backend.ai.openai_analyzer import AIAnalyzer
        import pandas as pd
        from datetime import datetime

        mock = MockMarketDataProvider()
        tf_data = mock.get_multi_timeframe_data(clean_sym, exchange=exchange)
        df = tf_data.get(timeframe, mock.get_candles(clean_sym, timeframe=timeframe, count=100))
        daily_df = tf_data.get("1d", df)

        current_price = float(df['close'].iloc[-1])
        prev_close = float(df['close'].iloc[-2]) if len(df) > 1 else current_price
        change_pct = round(((current_price - prev_close) / prev_close) * 100.0, 2)

        indicators = IndicatorEngine.compute_all_indicators(df)
        sr = SupportResistanceDetector.calculate_support_resistance(df, daily_df=daily_df)
        signal = BreakoutDetector.detect_breakout(df, indicators, sr)
        score = BreakoutScoringEngine.calculate_score(signal, indicators, sr)
        trade_setup = TradeSetupEngine.generate_trade_setup(clean_sym, exchange, current_price, signal, indicators, sr, timeframe=timeframe)
        mtf_analysis = MultiTimeframeAnalyzer.analyze_mtf(tf_data)
        ai_res = AIAnalyzer.analyze_setup(clean_sym, exchange, timeframe, current_price, indicators, sr, signal, score, trade_setup)

        res = StockScanResult(
            symbol=clean_sym,
            exchange=exchange,
            company_name=clean_sym,
            sector="Equities",
            timeframe=timeframe,
            current_price=round(current_price, 2),
            change_pct=change_pct,
            volume=indicators.volume.current_volume,
            relative_volume=indicators.volume.relative_volume,
            breakout_signal=signal,
            score_breakdown=score,
            trade_setup=trade_setup,
            multi_timeframe=mtf_analysis,
            indicators=indicators,
            support_resistance=sr,
            ai_analysis=ai_res,
            scanned_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        )

    return res

@router.get("/{symbol}/candles")
async def get_stock_candles(symbol: str, exchange: str = Query("NSE"), timeframe: str = Query("15m"), count: int = Query(150)):
    """Get candlestick OHLCV data for TradingView / Lightweight Charts rendering."""
    clean_sym = _clean_symbol(symbol)
    provider = get_market_data_provider()
    df = provider.get_candles(clean_sym, timeframe=timeframe, count=count, exchange=exchange)
    
    if df.empty or len(df) < 5:
        # Fallback to mock provider
        mock = MockMarketDataProvider()
        df = mock.get_candles(clean_sym, timeframe=timeframe, count=count, exchange=exchange)

    candles = []
    for _, row in df.iterrows():
        candles.append({
            "time": str(row["timestamp"]),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": float(row["volume"])
        })

    return {
        "symbol": clean_sym,
        "exchange": exchange,
        "timeframe": timeframe,
        "count": len(candles),
        "candles": candles
    }

@router.get("/{symbol}/quote")
async def get_stock_quote(symbol: str, exchange: str = Query("NSE")):
    """Get real-time / latest quote."""
    clean_sym = _clean_symbol(symbol)
    provider = get_market_data_provider()
    quote = provider.get_quote(clean_sym, exchange=exchange)
    if not quote:
        mock = MockMarketDataProvider()
        quote = mock.get_quote(clean_sym, exchange=exchange)
    return quote
