from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from backend.alerts.alert_manager import AlertManager
from backend.models.schemas import AlertItem, AlertFilterSettings

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertItem])
async def get_alerts(limit: int = Query(50)):
    """Get active and historical breakout alerts."""
    return AlertManager.get_recent_alerts(limit=limit)

@router.delete("")
async def clear_all_alerts():
    """Clear all alert records from the database."""
    success = AlertManager.clear_alerts()
    return {"status": "SUCCESS" if success else "FAILED", "message": "Alert history cleared."}

@router.get("/settings", response_model=AlertFilterSettings)
async def get_alert_settings():
    """Get user-configured alert threshold filters."""
    return AlertManager.get_filter_settings()

@router.post("/settings")
async def save_alert_settings(settings: AlertFilterSettings):
    """Update user-configured alert threshold filters."""
    success = AlertManager.save_filter_settings(settings)
    return {"status": "SUCCESS" if success else "FAILED", "settings": settings}
