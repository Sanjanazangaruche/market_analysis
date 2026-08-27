from fastapi import APIRouter, BackgroundTasks, Query
from typing import List, Dict, Any, Optional
from backend.services.scanner_service import scanner_service
from backend.models.schemas import StockScanResult

router = APIRouter(prefix="/api/scanner", tags=["Scanner"])

@router.post("/run")
async def trigger_scan(background_tasks: BackgroundTasks, timeframe: str = Query("15m")):
    """Trigger a manual synchronous or background stock scan."""
    results = await asyncio_to_thread_scan(timeframe)
    return {
        "status": "SUCCESS",
        "message": f"Scan completed for {len(results)} stocks",
        "count": len(results),
        "results": results
    }

async def asyncio_to_thread_scan(timeframe: str):
    import asyncio
    return await asyncio.to_thread(scanner_service.scan_all_stocks, timeframe=timeframe)

@router.get("/results")
async def get_latest_scan_results():
    """Get the latest cached scan results."""
    # If empty, run an initial scan
    if not scanner_service.latest_results:
        scanner_service.scan_all_stocks(timeframe="15m")

    return {
        "count": len(scanner_service.latest_results),
        "last_scan_time": scanner_service.last_scan_time,
        "results": scanner_service.latest_results
    }

@router.post("/start")
async def start_auto_scanner(interval_minutes: int = Query(5)):
    """Start continuous background auto-scanning."""
    started = scanner_service.start_scanner(interval_minutes=interval_minutes)
    return {
        "status": "RUNNING" if scanner_service.is_running else "FAILED",
        "is_running": scanner_service.is_running,
        "interval_minutes": scanner_service.interval_minutes
    }

@router.post("/stop")
async def stop_auto_scanner():
    """Stop continuous background auto-scanning."""
    scanner_service.stop_scanner()
    return {
        "status": "STOPPED",
        "is_running": scanner_service.is_running
    }

@router.get("/status")
async def get_scanner_status():
    """Get scanner running status and progress."""
    return {
        "is_running": scanner_service.is_running,
        "interval_minutes": scanner_service.interval_minutes,
        "last_scan_time": scanner_service.last_scan_time,
        "progress": scanner_service._current_progress,
        "results_count": len(scanner_service.latest_results)
    }
