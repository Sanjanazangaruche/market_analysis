import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config.settings import settings
from backend.database.db import init_db
from backend.services.scanner_service import scanner_service
from backend.api import (
    scanner_router, stocks_router, market_router, ai_router,
    alerts_router, watchlist_router, paper_trades_router,
    backtest_router, settings_router, websocket_router
)

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("breakout_scanner")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing SQLite database...")
    init_db()
    
    # Check if auto-scan enabled on startup
    if settings.AUTO_SCAN_ENABLED:
        logger.info("Starting background auto-scanner on startup...")
        scanner_service.start_scanner(interval_minutes=settings.DEFAULT_SCAN_INTERVAL_MINUTES)

    yield

    # Shutdown
    logger.info("Stopping background scanner...")
    scanner_service.stop_scanner()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered NSE/BSE Breakout Stock Scanner Desktop Platform",
    lifespan=lifespan
)

# CORS Configuration for Desktop Electron & React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(scanner_router)
app.include_router(stocks_router)
app.include_router(market_router)
app.include_router(ai_router)
app.include_router(alerts_router)
app.include_router(watchlist_router)
app.include_router(paper_trades_router)
app.include_router(backtest_router)
app.include_router(settings_router)
app.include_router(websocket_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "scanner_active": scanner_service.is_running
    }

# Serve static React frontend if dist exists
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api") or full_path.startswith("ws"):
            return None
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Frontend not built yet."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
