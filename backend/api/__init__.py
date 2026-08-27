from backend.api.scanner_router import router as scanner_router
from backend.api.stocks_router import router as stocks_router
from backend.api.market_router import router as market_router
from backend.api.ai_router import router as ai_router
from backend.api.alerts_router import router as alerts_router
from backend.api.watchlist_router import router as watchlist_router
from backend.api.paper_trades_router import router as paper_trades_router
from backend.api.backtest_router import router as backtest_router
from backend.api.settings_router import router as settings_router
from backend.api.websocket_router import router as websocket_router

__all__ = [
    "scanner_router",
    "stocks_router",
    "market_router",
    "ai_router",
    "alerts_router",
    "watchlist_router",
    "paper_trades_router",
    "backtest_router",
    "settings_router",
    "websocket_router"
]
