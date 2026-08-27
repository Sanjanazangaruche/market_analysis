from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.models.schemas import WatchlistItem
from backend.database.db import get_db_connection

router = APIRouter(prefix="/api/watchlist", tags=["Watchlist"])

@router.get("", response_model=List[WatchlistItem])
async def get_watchlist():
    """Get all stocks in the user's custom watchlist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM watchlist ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    return [
        WatchlistItem(
            id=r["id"],
            symbol=r["symbol"],
            exchange=r["exchange"],
            name=r["name"],
            sector=r["sector"],
            alert_enabled=bool(r["alert_enabled"]),
            added_at=str(r["added_at"])
        )
        for r in rows
    ]

@router.post("")
async def add_to_watchlist(item: WatchlistItem):
    """Add a new stock to the watchlist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO watchlist (symbol, exchange, name, sector, alert_enabled) VALUES (?, ?, ?, ?, ?)",
            (item.symbol.upper(), item.exchange.upper(), item.name or item.symbol.upper(), item.sector or "General", 1 if item.alert_enabled else 0)
        )
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        return {"status": "SUCCESS", "id": new_id, "symbol": item.symbol.upper()}
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=400, detail=f"Stock already in watchlist or invalid: {str(e)}")

@router.delete("/{symbol}")
async def remove_from_watchlist(symbol: str):
    """Remove a stock from the watchlist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol.upper(),))
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Symbol not found in watchlist")
    return {"status": "SUCCESS", "message": f"{symbol.upper()} removed from watchlist"}

@router.patch("/{symbol}/toggle-alert")
async def toggle_watchlist_alert(symbol: str):
    """Toggle alert enabled status for a watchlist stock."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE watchlist SET alert_enabled = CASE WHEN alert_enabled = 1 THEN 0 ELSE 1 END WHERE symbol = ?", (symbol.upper(),))
    conn.commit()
    cursor.execute("SELECT alert_enabled FROM watchlist WHERE symbol = ?", (symbol.upper(),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Symbol not found")
    return {"status": "SUCCESS", "symbol": symbol.upper(), "alert_enabled": bool(row["alert_enabled"])}
