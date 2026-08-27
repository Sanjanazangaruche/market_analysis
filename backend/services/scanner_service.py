import asyncio
import logging
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import pandas as pd

from backend.market_data.provider_factory import get_market_data_provider
from backend.indicators.engine import IndicatorEngine
from backend.support_resistance.detector import SupportResistanceDetector
from backend.breakout.detector import BreakoutDetector
from backend.strategy.scoring import BreakoutScoringEngine
from backend.strategy.trade_setup import TradeSetupEngine
from backend.strategy.multi_timeframe import MultiTimeframeAnalyzer
from backend.ai.openai_analyzer import AIAnalyzer
from backend.alerts.alert_manager import AlertManager
from backend.paper_trading.paper_engine import PaperTradingEngine
from backend.models.schemas import StockScanResult, AlertItem
from backend.config.settings import settings
from backend.database.db import get_db_connection

logger = logging.getLogger(__name__)

class ScannerService:
    """
    Core Scanner Orchestrator and Background Worker.
    Executes the entire multi-step breakout analysis pipeline:
    Market Data -> Indicators -> S/R -> Breakout -> Scoring -> Trade Setup -> MTF -> AI -> Alerts -> Paper Trading.
    """

    def __init__(self):
        self.is_running: bool = False
        self.interval_minutes: int = settings.DEFAULT_SCAN_INTERVAL_MINUTES
        self.last_scan_time: Optional[str] = None
        self.latest_results: List[StockScanResult] = []
        self.latest_alerts: List[AlertItem] = []
        self._task: Optional[asyncio.Task] = None
        self._subscribers: List[Any] = []
        self._current_progress: Dict[str, Any] = {"scanned": 0, "total": 0, "status": "IDLE"}

    def get_stock_universe(self) -> List[Dict[str, str]]:
        """
        Get universe of stocks to scan: Watchlist + NSE top stocks + BSE stocks.
        """
        stocks = []
        seen = set()

        # 1. From Watchlist
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT symbol, exchange, name, sector FROM watchlist WHERE alert_enabled = 1")
            rows = cursor.fetchall()
            conn.close()
            for r in rows:
                sym = r["symbol"].upper()
                if sym not in seen:
                    stocks.append({
                        "symbol": sym,
                        "exchange": r["exchange"],
                        "name": r["name"] or sym,
                        "sector": r["sector"] or "General"
                    })
                    seen.add(sym)
        except Exception as e:
            logger.error(f"Error reading watchlist: {str(e)}")

        # 2. Add NSE top stocks
        for sym in settings.NSE_TOP_STOCKS:
            if sym not in seen:
                stocks.append({
                    "symbol": sym,
                    "exchange": "NSE",
                    "name": sym,
                    "sector": "Large Cap"
                })
                seen.add(sym)

        return stocks

    def scan_single_stock(self, symbol: str, exchange: str = "NSE", timeframe: str = "15m", company_name: str = None, sector: str = None) -> Optional[StockScanResult]:
        """
        Executes complete pipeline for one stock.
        """
        provider = get_market_data_provider()

        try:
            # 1. Fetch Multi-Timeframe Candle Data
            timeframes = ["5m", "15m", "1h", "1d"]
            tf_data = provider.get_multi_timeframe_data(symbol, timeframes=timeframes, exchange=exchange)
            df = tf_data.get(timeframe, pd.DataFrame())

            if df.empty or len(df) < 10:
                # Fallback to single timeframe fetch
                df = provider.get_candles(symbol, timeframe=timeframe, count=100, exchange=exchange)
                if df.empty or len(df) < 10:
                    logger.warning(f"Insufficient candle data for {symbol}")
                    return None

            daily_df = tf_data.get("1d", pd.DataFrame())
            current_price = float(df['close'].iloc[-1])
            prev_close = float(df['close'].iloc[-2]) if len(df) > 1 else current_price
            change_pct = round(((current_price - prev_close) / prev_close) * 100.0, 2)

            # 2. Compute Technical Indicators
            indicators = IndicatorEngine.compute_all_indicators(df)

            # 3. Support & Resistance Detection
            sr = SupportResistanceDetector.calculate_support_resistance(df, daily_df=daily_df)

            # 4. Breakout Detection
            signal = BreakoutDetector.detect_breakout(df, indicators, sr)

            # 5. Breakout Quality Scoring
            score = BreakoutScoringEngine.calculate_score(signal, indicators, sr)

            # 6. Trade Setup Calculation
            trade_setup = TradeSetupEngine.generate_trade_setup(
                symbol, exchange, current_price, signal, indicators, sr, timeframe=timeframe
            )

            # 7. Multi-Timeframe Confirmation
            mtf_analysis = MultiTimeframeAnalyzer.analyze_mtf(tf_data)

            # 8. AI Analysis Layer
            ai_res = None
            if signal.is_breakout or score.total_score >= 65.0:
                ai_res = AIAnalyzer.analyze_setup(
                    symbol, exchange, timeframe, current_price, indicators, sr, signal, score, trade_setup
                )

            # 9. Mark-to-market open paper trades
            PaperTradingEngine.update_position_price(symbol, current_price)

            scan_res = StockScanResult(
                symbol=symbol,
                exchange=exchange,
                company_name=company_name or symbol,
                sector=sector or "Equities",
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

            # 10. Check and record Desktop Alerts
            if AlertManager.should_trigger_alert(scan_res):
                alert_item = AlertManager.record_alert(scan_res)
                if alert_item:
                    self.latest_alerts.insert(0, alert_item)
                    # Notify WebSocket clients
                    self._broadcast_event({"type": "NEW_ALERT", "data": alert_item.model_dump()})

            return scan_res

        except Exception as e:
            logger.error(f"Error scanning stock {symbol}: {str(e)}", exc_info=True)
            return None

    def scan_all_stocks(self, timeframe: str = "15m") -> List[StockScanResult]:
        """
        Scan all stocks in universe synchronously or as task.
        Continues if any single stock fails.
        """
        universe = self.get_stock_universe()
        results: List[StockScanResult] = []
        total = len(universe)

        self._current_progress = {"scanned": 0, "total": total, "status": "SCANNING"}
        self._broadcast_event({"type": "SCAN_PROGRESS", "data": self._current_progress})

        for i, item in enumerate(universe):
            res = self.scan_single_stock(
                symbol=item["symbol"],
                exchange=item["exchange"],
                timeframe=timeframe,
                company_name=item["name"],
                sector=item["sector"]
            )
            if res:
                results.append(res)

            self._current_progress = {"scanned": i + 1, "total": total, "status": "SCANNING"}
            if (i + 1) % 3 == 0:
                self._broadcast_event({"type": "SCAN_PROGRESS", "data": self._current_progress})

        # Sort by total score descending
        results.sort(key=lambda x: x.score_breakdown.total_score, reverse=True)
        self.latest_results = results
        self.last_scan_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        self._current_progress = {"scanned": total, "total": total, "status": "IDLE"}
        self._broadcast_event({
            "type": "SCAN_COMPLETED",
            "data": {
                "count": len(results),
                "timestamp": self.last_scan_time,
                "results": [r.model_dump() for r in results]
            }
        })

        return results

    async def _scan_loop(self):
        """Continuous background scanning loop."""
        logger.info("Auto Scanner loop started.")
        while self.is_running:
            try:
                await asyncio.to_thread(self.scan_all_stocks, timeframe=settings.DEFAULT_TIMEFRAME)
            except Exception as e:
                logger.error(f"Error in scanner loop iteration: {str(e)}")

            # Sleep for interval
            sleep_secs = max(30, self.interval_minutes * 60)
            logger.info(f"Scanner sleeping for {sleep_secs}s...")
            for _ in range(sleep_secs):
                if not self.is_running:
                    break
                await asyncio.sleep(1)

        logger.info("Auto Scanner loop stopped.")

    def start_scanner(self, interval_minutes: Optional[int] = None) -> bool:
        if interval_minutes:
            self.interval_minutes = interval_minutes

        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._scan_loop())
            logger.info(f"Auto Scanner started (Interval: {self.interval_minutes}m)")
            return True
        return False

    def stop_scanner(self) -> bool:
        if self.is_running:
            self.is_running = False
            if self._task and not self._task.done():
                self._task.cancel()
            logger.info("Auto Scanner stopped")
            return True
        return False

    def subscribe(self, callback):
        self._subscribers.append(callback)

    def unsubscribe(self, callback):
        if callback in self._subscribers:
            self._subscribers.remove(callback)

    def _broadcast_event(self, event: Dict[str, Any]):
        for sub in list(self._subscribers):
            try:
                sub(event)
            except Exception:
                pass

# Global Singleton instance
scanner_service = ScannerService()
