import json
import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from backend.models.schemas import (
    StockScanResult, AlertItem, AlertFilterSettings
)
from backend.database.db import get_db_connection

logger = logging.getLogger(__name__)

class AlertManager:
    """
    Real-time Desktop Alert & Notification Manager.
    Filters candidate breakouts against user thresholds, prevents duplicate spam,
    records active alerts in SQLite database, and handles dispatch.
    """

    _last_alert_times: Dict[str, float] = {}
    _alert_cooldown_seconds = 1800  # 30 minutes cooldown per symbol+type

    @classmethod
    def get_filter_settings(cls) -> AlertFilterSettings:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings_store WHERE key = 'alert_filter_settings'")
            row = cursor.fetchone()
            conn.close()
            if row:
                data = json.loads(row["value"])
                return AlertFilterSettings(**data)
        except Exception as e:
            logger.error(f"Error fetching alert settings: {str(e)}")

        return AlertFilterSettings()

    @classmethod
    def save_filter_settings(cls, settings_obj: AlertFilterSettings) -> bool:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO settings_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                ("alert_filter_settings", json.dumps(settings_obj.model_dump()))
            )
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"Error saving alert settings: {str(e)}")
            return False

    @classmethod
    def should_trigger_alert(cls, scan_result: StockScanResult, filter_settings: Optional[AlertFilterSettings] = None) -> bool:
        if not scan_result.breakout_signal.is_breakout:
            return False
        
        if not scan_result.trade_setup:
            return False

        if filter_settings is None:
            filter_settings = cls.get_filter_settings()

        # Score filter
        score = scan_result.score_breakdown.total_score
        if score < filter_settings.min_score:
            return False

        # Confidence filter
        confidence = scan_result.ai_analysis.confidence_score if scan_result.ai_analysis else 0
        if confidence < filter_settings.min_confidence:
            return False

        # Risk/Reward filter
        rr = scan_result.trade_setup.risk_reward_ratio
        if rr < filter_settings.min_risk_reward:
            return False

        # Direction filters
        is_bullish = "BULLISH" in scan_result.breakout_signal.signal_type or "RETEST" in scan_result.breakout_signal.signal_type or "CONSOLIDATION" in scan_result.breakout_signal.signal_type
        if filter_settings.bullish_only and not is_bullish:
            return False
        if filter_settings.bearish_only and is_bullish:
            return False

        # Exchange filter
        if scan_result.exchange.upper() not in [e.upper() for e in filter_settings.exchanges]:
            return False

        # Timeframe filter
        if scan_result.timeframe.lower() not in [tf.lower() for tf in filter_settings.timeframes]:
            return False

        # Deduplication check
        dedup_key = f"{scan_result.symbol}_{scan_result.breakout_signal.signal_type}_{scan_result.timeframe}"
        now = time.time()
        last_time = cls._last_alert_times.get(dedup_key, 0)
        if now - last_time < cls._alert_cooldown_seconds:
            return False

        cls._last_alert_times[dedup_key] = now
        return True

    @classmethod
    def record_alert(cls, scan_result: StockScanResult) -> Optional[AlertItem]:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            trade = scan_result.trade_setup
            score = scan_result.score_breakdown
            ai = scan_result.ai_analysis
            holding_period = trade.holding_period if trade and trade.holding_period else (
                ai.holding_period if ai and ai.holding_period else "Swing Entry (3 - 7 Days)"
            )
            ai_conf = ai.confidence_score if ai else int(score.total_score)

            cursor.execute("""
            INSERT INTO alerts (
                symbol, exchange, timeframe, price, breakout_type,
                score, quality, ai_confidence, holding_period, entry_min, entry_max,
                stop_loss, target_1, target_2, target_3, risk_reward,
                indicators_json, trade_setup_json, ai_analysis_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                scan_result.symbol,
                scan_result.exchange,
                scan_result.timeframe,
                scan_result.current_price,
                scan_result.breakout_signal.signal_type,
                int(score.total_score),
                score.classification,
                ai_conf,
                holding_period,
                trade.entry_min if trade else scan_result.current_price,
                trade.entry_max if trade else scan_result.current_price,
                trade.stop_loss if trade else 0.0,
                trade.target_1 if trade else 0.0,
                trade.target_2 if trade else 0.0,
                trade.target_3 if trade else 0.0,
                trade.risk_reward_ratio if trade else 2.0,
                json.dumps(scan_result.indicators.model_dump()),
                json.dumps(trade.model_dump()) if trade else None,
                json.dumps(ai.model_dump()) if ai else None
            ))

            alert_id = cursor.lastrowid
            conn.commit()

            cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
            row = cursor.fetchone()
            conn.close()

            if row:
                return AlertItem(
                    id=row["id"],
                    symbol=row["symbol"],
                    exchange=row["exchange"],
                    timeframe=row["timeframe"],
                    price=row["price"],
                    breakout_type=row["breakout_type"],
                    score=row["score"],
                    quality=row["quality"],
                    ai_confidence=row["ai_confidence"],
                    holding_period=row["holding_period"] if "holding_period" in row.keys() and row["holding_period"] else "Swing Entry (3 - 7 Days)",
                    entry_min=row["entry_min"],
                    entry_max=row["entry_max"],
                    stop_loss=row["stop_loss"],
                    target_1=row["target_1"],
                    target_2=row["target_2"],
                    target_3=row["target_3"],
                    risk_reward=row["risk_reward"],
                    indicators_json=row["indicators_json"],
                    trade_setup_json=row["trade_setup_json"],
                    ai_analysis_json=row["ai_analysis_json"],
                    created_at=row["created_at"],
                    status=row["status"]
                )
        except Exception as e:
            logger.error(f"Error saving alert to database: {str(e)}")

        return None

    @classmethod
    def get_recent_alerts(cls, limit: int = 50) -> List[AlertItem]:
        results = []
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            conn.close()

            for row in rows:
                results.append(AlertItem(
                    id=row["id"],
                    symbol=row["symbol"],
                    exchange=row["exchange"],
                    timeframe=row["timeframe"],
                    price=row["price"],
                    breakout_type=row["breakout_type"],
                    score=row["score"],
                    quality=row["quality"],
                    ai_confidence=row["ai_confidence"],
                    holding_period=row["holding_period"] if "holding_period" in row.keys() and row["holding_period"] else "Swing Entry (3 - 7 Days)",
                    entry_min=row["entry_min"],
                    entry_max=row["entry_max"],
                    stop_loss=row["stop_loss"],
                    target_1=row["target_1"],
                    target_2=row["target_2"],
                    target_3=row["target_3"],
                    risk_reward=row["risk_reward"],
                    indicators_json=row["indicators_json"],
                    trade_setup_json=row["trade_setup_json"],
                    ai_analysis_json=row["ai_analysis_json"],
                    created_at=row["created_at"],
                    status=row["status"]
                ))
        except Exception as e:
            logger.error(f"Error fetching recent alerts: {str(e)}")

        return results

    @classmethod
    def clear_alerts(cls) -> bool:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM alerts")
            conn.commit()
            conn.close()
            cls._last_alert_times.clear()
            return True
        except Exception as e:
            logger.error(f"Error clearing alerts: {str(e)}")
            return False
