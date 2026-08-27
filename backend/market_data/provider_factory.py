import logging
from backend.market_data.base import MarketDataProvider
from backend.market_data.yfinance_provider import YFinanceMarketDataProvider
from backend.market_data.mock_provider import MockMarketDataProvider
from backend.config.settings import settings
from backend.database.db import get_db_connection

logger = logging.getLogger(__name__)

_providers: dict[str, MarketDataProvider] = {}

def get_market_data_provider(override_name: str = None) -> MarketDataProvider:
    """
    Get active MarketDataProvider singleton instance.
    Checks DB settings store or environment fallback.
    """
    provider_name = override_name
    if not provider_name:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings_store WHERE key = 'data_provider'")
            row = cursor.fetchone()
            if row:
                provider_name = row["value"]
            conn.close()
        except Exception:
            pass

    if not provider_name:
        provider_name = settings.DEFAULT_DATA_PROVIDER

    provider_name = provider_name.lower()
    
    if provider_name not in _providers:
        if provider_name == "mock":
            logger.info("Initializing MockMarketDataProvider")
            _providers[provider_name] = MockMarketDataProvider()
        else:
            logger.info("Initializing YFinanceMarketDataProvider")
            _providers[provider_name] = YFinanceMarketDataProvider()

    return _providers[provider_name]
