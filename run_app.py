"""
AI-Powered NSE/BSE Breakout Stock Scanner Desktop Platform
Launcher Script
"""

import sys
import os
import time
import webbrowser
import threading
import uvicorn

# Add current directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def open_browser():
    time.sleep(1.8)
    url = "http://127.0.0.1:8000"
    print(f"\n========================================================")
    print(f"🚀 AI NSE/BSE Breakout Stock Scanner is LIVE!")
    print(f"👉 Open Desktop Terminal at: {url}")
    print(f"⚡ FastAPI REST & WebSocket Docs at: {url}/docs")
    print(f"========================================================\n")
    try:
        webbrowser.open(url)
    except Exception:
        pass

def main():
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║       AI NSE/BSE BREAKOUT STOCK SCANNER TERMINAL          ║
    ║   Real Market Data • 10-Factor Scoring • OpenAI Reasoning ║
    ╚═══════════════════════════════════════════════════════════╝
    """)

    # Launch browser thread
    threading.Thread(target=open_browser, daemon=True).start()

    # Start FastAPI server with uvicorn
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info"
    )

if __name__ == "__main__":
    main()
