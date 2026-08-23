# AI-Powered NSE/BSE Breakout Stock Scanner Desktop Platform

A professional quantitative desktop trading terminal for Indian Equities (NSE & BSE) that continuously scans markets, computes technical indicator confluence, identifies Support & Resistance breakout/breakdown setups, scores breakout quality from 0 to 100, generates precision entry/SL/target plans, and provides OpenAI-powered technical explanations with real-time desktop notifications.

---

## 🏛️ Architecture & End-to-End Workflow

```
NSE/BSE Real Market Data (Yahoo Finance .NS/.BO or Mock Simulator)
                          ↓
              Market Data Service Layer
            (5m / 15m / 1h / Daily Timeframes)
                          ↓
          Technical Indicator Calculation Engine
      (EMA 20/50/200, RSI 14, MACD, VWAP, ADX, Supertrend, ATR, RVOL)
                          ↓
        Support & Resistance Detection Engine
 (Multi-Touch Pivot Clustering, Swing Highs/Lows, PDH/PDL, Consolidation)
                          ↓
              Breakout Detection Engine
 (Bullish Breakout, Bearish Breakdown, Retest Confirmed, False Breakout)
                          ↓
        Breakout Quality Scoring Engine (0–100)
    (Transparent 10-Pillar Weighting & Classification)
                          ↓
         Precision Trade Setup & Risk Engine
     (Entry Zone, Stop Loss, Target 1, Target 2, Target 3, R:R)
                          ↓
          Multi-Timeframe Confluence Matrix
           (Daily + 1H + 15M + 5M Confluence)
                          ↓
              OpenAI Analysis Layer
(Structured Prompting: Signals, Confluences, Invalidation Rules, Confidence)
                          ↓
   Desktop Terminal Dashboard & Native Desktop Audio/Popup Alerts
```

---

## 🌟 Key Features

1. **Modular Market Data Interface (`MarketDataProvider`)**:
   - Production-ready Yahoo Finance data provider supporting all NSE equities (`SYMBOL.NS`) and BSE equities (`SYMBOL.BO`).
   - Built-in High-Fidelity Mock Simulator for offline testing, backtesting, and development.
   - Switchable dynamically via the UI Settings page or API without restarting the application.

2. **Technical Indicators Engine**:
   - **EMA**: 20, 50, 200 with bullish/bearish stacked alignment detection and Golden/Death cross detection.
   - **RSI (14)**: Overbought/oversold boundaries, bullish/bearish momentum confirmation.
   - **MACD (12, 26, 9)**: Signal line, histogram expansion, bullish/bearish crossovers.
   - **VWAP**: Intraday volume-weighted average price, VWAP breakout, and VWAP rejection.
   - **ADX (14)**: +DI / -DI directional movement and trend strength classification.
   - **Supertrend (10, 3)**: ATR-based trend direction and trend reversals.
   - **ATR (14)**: Dynamic volatility measurement for risk-based Stop Loss & Target calculations.
   - **Volume Analysis**: 20-period average volume, Relative Volume Ratio (RVOL), volume spikes (>1.5x / >2.0x).

3. **Support & Resistance Engine**:
   - Rolling fractal pivot detection (swing highs and swing lows).
   - Multi-touch cluster density grouping with touch count scoring.
   - Previous Day High (PDH), Previous Day Low (PDL), Previous Week High (PWH), Previous Week Low (PWL).
   - Consolidation range / box breakout detection.
   - Level distance in points and percentage.

4. **Breakout Detection & Quality Scoring (0–100)**:
   - Identifies: `BULLISH_BREAKOUT`, `BEARISH_BREAKDOWN`, `RETEST_CONFIRMED`, `FALSE_BREAKOUT` (Bull/Bear Trap), `CONSOLIDATION_BREAKOUT`, `VOLUME_BREAKOUT`.
   - Transparent 10-pillar scoring formula:
     - S/R Breakout (20)
     - Volume Confirmation (15)
     - EMA Trend Alignment (15)
     - RSI Momentum (10)
     - MACD Confirmation (10)
     - ADX Trend Strength (10)
     - VWAP Confirmation (5)
     - Supertrend (5)
     - Price Action (5)
     - Risk/Reward Favourability (5)
   - Classification: `VERY STRONG` (90–100), `STRONG` (80–89), `GOOD` (70–79), `MODERATE` (60–69), `WEAK` (<60).

5. **AI Trade Intelligence Layer (OpenAI)**:
   - Consumes structured technical indicator data (never raw noise).
   - Generates structured JSON responses: Setup Verdict, Narrative Explanation, Entry/SL/Target Justifications, Supporting & Conflicting Factors, Risk Factors, and Hard Invalidation Conditions.
   - Includes a deterministic rule-based quantitative reasoning engine fallback when `OPENAI_API_KEY` is not provided.

6. **Interactive Candlestick Terminal**:
   - Candlestick chart with EMA 20/50/200, VWAP, Supertrend overlays.
   - Visual Support/Resistance horizontal lines, Breakout levels, Entry zone, SL red band, and Target green lines.
   - RSI (14), MACD Histogram, and Volume subcharts with crosshairs.

7. **Simulated Paper Trading Portfolio**:
   - Execute simulated breakout trades with custom quantities.
   - Automated mark-to-market P&L tracking.
   - Automatic execution when market price hits Stop Loss, Target 1, or Target 2.
   - Trade journal with win rates and performance analytics.

8. **Quantitative Historical Backtester**:
   - Test breakout strategies across customizable historical periods (30–180 days).
   - Interactive cumulative equity progression curve.
   - Calculates Win Rate %, Profit Factor, Max Drawdown %, Net Profit, and itemized trade logs.

9. **Real-time Desktop Alerts**:
   - Web Audio API acoustic chimes (Bullish high-tone, Bearish deep-tone).
   - Native HTML5 / Electron desktop notifications.
   - Configurable alert threshold filters (Min Score, Min Confidence, Min R:R, Bullish/Bearish only).
   - Cooldown deduplication preventing spam.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Python 3.10+ installed
- Node.js 18+ installed

### 2. Launch the Application

#### Option A: Quick Batch Launcher (Windows)
Double-click `start.bat` in the project root folder.

#### Option B: Python Launcher
```bash
python run_app.py
```
This automatically starts the FastAPI server on `http://127.0.0.1:8000` and opens your desktop browser.

#### Option C: Development Mode
```bash
# Terminal 1: Start FastAPI Backend
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Start React Frontend Dev Server
cd frontend
npm run dev
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` or configure settings directly through the UI **Settings** tab:

```env
# Optional: OpenAI API Key (can also be entered in the UI Settings)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Market Data Provider ('yfinance' or 'mock')
DEFAULT_DATA_PROVIDER=yfinance

# Auto-Scanner Settings
DEFAULT_SCAN_INTERVAL_MINUTES=5
AUTO_SCAN_ENABLED=false
DEFAULT_TIMEFRAME=15m

# Minimum Alert Thresholds
MIN_ALERT_SCORE=70
MIN_ALERT_CONFIDENCE=70
MIN_RISK_REWARD=1.5
```

---

## 🧪 Running Test Suite

Verify all components (Indicators, S/R detection, Breakout engine, Scoring, AI analyzer, Paper trading, Backtesting):

```bash
python -m pytest tests/test_pipeline.py -v
```

---

## 📁 Project Structure

```
market/
├── backend/
│   ├── config/             # Settings, defaults, stock universes
│   ├── database/           # SQLite DB connection, tables, migrations
│   ├── market_data/        # MarketDataProvider interface, YFinance & Mock providers
│   ├── indicators/         # Vectorized EMA, RSI, MACD, VWAP, ADX, Supertrend, ATR, Volume
│   ├── support_resistance/ # Pivot extraction, multi-touch clustering, level scoring
│   ├── breakout/           # Multi-confirmation breakout & breakdown detection
│   ├── strategy/           # 10-pillar scoring engine, trade setup generator, MTF analysis
│   ├── ai/                 # OpenAI structured analyzer & deterministic fallback engine
│   ├── alerts/             # Alert filter engine, deduplication, DB persistence
│   ├── paper_trading/      # Simulated paper trading engine with automated SL/TP
│   ├── backtesting/        # Quantitative historical candle backtesting simulator
│   ├── services/           # Auto-scanner background worker & WebSocket broadcaster
│   ├── models/             # Pydantic schemas and response contracts
│   ├── api/                # FastAPI REST & WebSocket routers
│   └── main.py             # FastAPI entry point & static file server
│
├── frontend/
│   ├── src/
│   │   ├── types/          # Full TypeScript interfaces
│   │   ├── services/       # Axios API client, Web Audio synthesizer, Notifications
│   │   ├── hooks/          # useScanner WebSocket & state hook
│   │   ├── components/     # Navigation, Header, ScoreGauge, SetupCard, TradeModal, AIModal, Toast
│   │   ├── charts/         # CandlestickChart, SubIndicatorsChart, EquityCurveChart
│   │   ├── pages/          # Dashboard, Scanner, StockDetail, AIAnalysis, Alerts, Watchlist, PaperTrading, Backtesting, Settings
│   │   ├── App.tsx         # Main layout & router container
│   │   └── main.tsx        # React root mount
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── electron/               # Electron desktop window wrapper
├── tests/                  # Pytest test suite
├── run_app.py              # Desktop launcher script
├── start.bat               # Windows 1-click batch launcher
├── .env.example            # Environment template
└── README.md               # Documentation
```

---

## 🛡️ Safety & Compliance Disclaimer

> **Disclaimer:** AI-generated analysis and technical indicators are provided for informational and decision-support purposes only and do not constitute financial advice, investment recommendations, or trade guarantees. Trading Indian equities involves financial risk.
