import json
import os
from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from backend.config.settings import settings
from backend.database.db import get_db_connection

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("")
async def get_settings():
    """Retrieve full app settings including scoring weights, data provider, and API key status."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM settings_store")
    rows = cursor.fetchall()
    conn.close()

    db_settings = {r["key"]: r["value"] for r in rows}

    openai_key = db_settings.get("openai_api_key", os.environ.get("OPENAI_API_KEY", settings.OPENAI_API_KEY))
    masked_key = (openai_key[:7] + "..." + openai_key[-4:]) if (openai_key and len(openai_key) > 10) else ""

    # Load scoring weights if saved, else defaults
    weights = db_settings.get("scoring_weights")
    if weights:
        try:
            weights = json.loads(weights)
        except Exception:
            weights = None

    if not weights:
        weights = {
            "sr_breakout": settings.WEIGHT_SR_BREAKOUT,
            "volume": settings.WEIGHT_VOLUME_CONFIRM,
            "ema_trend": settings.WEIGHT_EMA_TREND,
            "rsi": settings.WEIGHT_RSI_MOMENTUM,
            "macd": settings.WEIGHT_MACD_CONFIRM,
            "adx": settings.WEIGHT_ADX_STRENGTH,
            "vwap": settings.WEIGHT_VWAP,
            "supertrend": settings.WEIGHT_SUPERTREND,
            "price_action": settings.WEIGHT_PRICE_ACTION,
            "risk_reward": settings.WEIGHT_RISK_REWARD
        }

    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "data_provider": db_settings.get("data_provider", settings.DEFAULT_DATA_PROVIDER),
        "openai_api_key_configured": bool(openai_key and len(openai_key.strip()) > 10),
        "openai_api_key_masked": masked_key,
        "openai_model": db_settings.get("openai_model", settings.OPENAI_MODEL),
        "default_timeframe": db_settings.get("default_timeframe", settings.DEFAULT_TIMEFRAME),
        "scoring_weights": weights,
        "market_timings": {
            "open": settings.MARKET_OPEN_TIME,
            "close": settings.MARKET_CLOSE_TIME,
            "timezone": settings.TIMEZONE
        }
    }

@router.post("")
async def update_settings(payload: Dict[str, Any] = Body(...)):
    """Update settings in SQLite settings_store."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if "openai_api_key" in payload:
        cursor.execute(
            "INSERT OR REPLACE INTO settings_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            ("openai_api_key", payload["openai_api_key"].strip())
        )
    if "data_provider" in payload:
        cursor.execute(
            "INSERT OR REPLACE INTO settings_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            ("data_provider", payload["data_provider"])
        )
    if "openai_model" in payload:
        cursor.execute(
            "INSERT OR REPLACE INTO settings_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            ("openai_model", payload["openai_model"])
        )
    if "default_timeframe" in payload:
        cursor.execute(
            "INSERT OR REPLACE INTO settings_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            ("default_timeframe", payload["default_timeframe"])
        )
    if "scoring_weights" in payload:
        cursor.execute(
            "INSERT OR REPLACE INTO settings_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            ("scoring_weights", json.dumps(payload["scoring_weights"]))
        )

    conn.commit()
    conn.close()

    return {"status": "SUCCESS", "message": "Settings updated successfully."}
