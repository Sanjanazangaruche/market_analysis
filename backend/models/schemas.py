from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

# --- Candle & Market Data ---
class Candle(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float

class StockQuote(BaseModel):
    symbol: str
    exchange: str = "NSE"
    company_name: Optional[str] = None
    sector: Optional[str] = None
    current_price: float
    change: float
    change_percent: float
    open: float
    high: float
    low: float
    prev_close: float
    volume: float
    avg_volume: float
    timestamp: str

class MarketIndex(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    trend: str  # BULLISH, BEARISH, NEUTRAL
    advance_count: Optional[int] = 0
    decline_count: Optional[int] = 0

# --- Technical Indicators ---
class EMAValues(BaseModel):
    ema20: float
    ema50: float
    ema200: float
    alignment: str  # BULLISH, BEARISH, MIXED
    price_above_ema20: bool
    price_above_ema50: bool
    price_above_ema200: bool
    crossover_20_50: Optional[str] = None  # GOLDEN_CROSS, DEATH_CROSS, NONE
    crossover_50_200: Optional[str] = None

class RSIValues(BaseModel):
    rsi14: float
    status: str  # OVERBOUGHT, OVERSOLD, BULLISH_MOMENTUM, BEARISH_MOMENTUM, NEUTRAL
    momentum_confirmed: bool

class MACDValues(BaseModel):
    macd: float
    signal: float
    histogram: float
    crossover: str  # BULLISH_CROSS, BEARISH_CROSS, NONE
    trend: str

class VWAPValues(BaseModel):
    vwap: float
    price_position: str  # ABOVE, BELOW
    vwap_breakout: bool
    vwap_rejection: bool

class ADXValues(BaseModel):
    adx14: float
    plus_di: float
    minus_di: float
    trend_strength: str  # VERY_STRONG, STRONG, MODERATE, WEAK
    trend_direction: str  # BULLISH, BEARISH, NEUTRAL

class SupertrendValues(BaseModel):
    supertrend: float
    direction: str  # BULLISH, BEARISH
    reversal: bool

class ATRValues(BaseModel):
    atr14: float
    atr_percent: float

class VolumeAnalysis(BaseModel):
    current_volume: float
    avg_volume_20: float
    relative_volume: float  # RVOL
    is_volume_spike: bool
    breakout_volume_confirmed: bool

class TechnicalIndicators(BaseModel):
    ema: EMAValues
    rsi: RSIValues
    macd: MACDValues
    vwap: VWAPValues
    adx: ADXValues
    supertrend: SupertrendValues
    atr: ATRValues
    volume: VolumeAnalysis

# --- Support & Resistance ---
class SRLevel(BaseModel):
    price: float
    level_type: str  # SUPPORT, RESISTANCE
    strength: str  # STRONG, MODERATE, WEAK
    touch_count: int
    score: float
    is_major: bool

class SupportResistanceSummary(BaseModel):
    nearest_support: float
    nearest_resistance: float
    distance_to_support_pct: float
    distance_to_resistance_pct: float
    all_supports: List[SRLevel]
    all_resistances: List[SRLevel]
    swing_highs: List[float]
    swing_lows: List[float]
    prev_day_high: Optional[float] = None
    prev_day_low: Optional[float] = None
    prev_week_high: Optional[float] = None
    prev_week_low: Optional[float] = None
    consolidation_range: Optional[Dict[str, float]] = None  # {high, low, duration}

# --- Breakout & Quality Score ---
class BreakoutSignal(BaseModel):
    is_breakout: bool
    signal_type: str  # BULLISH_BREAKOUT, BEARISH_BREAKDOWN, RETEST_CONFIRMED, FALSE_BREAKOUT, CONSOLIDATION_BREAKOUT, NO_BREAKOUT
    breakout_level: float
    breakout_price: float
    candle_time: str
    confirmation_count: int
    confirmations: List[str]
    failed_conditions: List[str]

class BreakoutScoreBreakdown(BaseModel):
    sr_breakout_score: float = 0.0
    volume_score: float = 0.0
    ema_trend_score: float = 0.0
    rsi_score: float = 0.0
    macd_score: float = 0.0
    adx_score: float = 0.0
    vwap_score: float = 0.0
    supertrend_score: float = 0.0
    price_action_score: float = 0.0
    risk_reward_score: float = 0.0
    total_score: float = 0.0
    classification: str  # VERY_STRONG, STRONG, GOOD, MODERATE, WEAK

# --- Trade Setup ---
class TradeSetup(BaseModel):
    symbol: str
    exchange: str
    current_price: float
    breakout_level: float
    setup_type: str  # BUY_BREAKOUT, SELL_BREAKDOWN, RETEST_BUY, RETEST_SELL
    entry_min: float
    entry_max: float
    stop_loss: float
    target_1: float
    target_2: float
    target_3: float
    risk_per_share: float
    potential_reward_t1: float
    potential_reward_t2: float
    risk_reward_ratio: float
    holding_period: str = "Swing Entry (3 - 7 Trading Days)"
    entry_reasoning: str
    stop_loss_reasoning: str
    target_reasoning: str

# --- Multi-Timeframe Confirmation ---
class TimeframeSummary(BaseModel):
    timeframe: str
    trend: str  # BULLISH, BEARISH, NEUTRAL
    rsi: float
    ema_aligned: bool
    supertrend: str
    score: float

class MultiTimeframeAnalysis(BaseModel):
    daily: TimeframeSummary
    one_hour: TimeframeSummary
    fifteen_min: TimeframeSummary
    five_min: TimeframeSummary
    composite_trend: str
    overall_mtf_score: float
    alignment_summary: str

# --- AI Analysis ---
class AIAnalysisResult(BaseModel):
    signal: str
    breakout_quality: str
    explanation: str
    holding_period: str = "Swing Entry (3 - 7 Trading Days)"
    entry_reasoning: str
    stop_loss_reasoning: str
    target_reasoning: str
    risk_reward_explanation: str
    supporting_indicators: List[str]
    conflicting_indicators: List[str]
    risk_factors: List[str]
    invalidation_condition: str
    confidence_score: int
    disclaimer: str = "AI-generated analysis is for informational and decision-support purposes and is not financial advice."

# --- Complete Stock Scan Result ---
class StockScanResult(BaseModel):
    symbol: str
    exchange: str = "NSE"
    company_name: Optional[str] = None
    sector: Optional[str] = None
    timeframe: str = "15m"
    current_price: float
    change_pct: float
    volume: float
    relative_volume: float
    breakout_signal: BreakoutSignal
    score_breakdown: BreakoutScoreBreakdown
    trade_setup: Optional[TradeSetup] = None
    multi_timeframe: Optional[MultiTimeframeAnalysis] = None
    indicators: TechnicalIndicators
    support_resistance: SupportResistanceSummary
    ai_analysis: Optional[AIAnalysisResult] = None
    scanned_at: str

# --- Alerts & Notifications ---
class AlertItem(BaseModel):
    id: Optional[int] = None
    symbol: str
    exchange: str = "NSE"
    timeframe: str
    price: float
    breakout_type: str
    score: int
    quality: str
    ai_confidence: int
    holding_period: Optional[str] = "Swing Entry (3 - 7 Days)"
    entry_min: float
    entry_max: float
    stop_loss: float
    target_1: float
    target_2: float
    target_3: Optional[float] = None
    risk_reward: float
    indicators_json: Optional[str] = None
    trade_setup_json: Optional[str] = None
    ai_analysis_json: Optional[str] = None
    created_at: Optional[str] = None
    status: str = "ACTIVE"

class AlertFilterSettings(BaseModel):
    min_score: int = 80
    min_confidence: int = 90
    min_risk_reward: float = 1.5
    bullish_only: bool = False
    bearish_only: bool = False
    exchanges: List[str] = ["NSE", "BSE"]
    timeframes: List[str] = ["5m", "15m", "1h", "1d"]
    stocks_selection: str = "ALL"  # ALL or WATCHLIST_ONLY
    sound_enabled: bool = True
    desktop_popup_enabled: bool = True

# --- Watchlist ---
class WatchlistItem(BaseModel):
    id: Optional[int] = None
    symbol: str
    exchange: str = "NSE"
    name: Optional[str] = None
    sector: Optional[str] = None
    alert_enabled: bool = True
    added_at: Optional[str] = None

# --- Paper Trading ---
class PaperTradeOrder(BaseModel):
    symbol: str
    exchange: str = "NSE"
    signal_type: str  # BUY or SELL
    entry_price: float
    quantity: int
    stop_loss: float
    target_1: float
    target_2: float

class PaperTrade(BaseModel):
    id: int
    symbol: str
    exchange: str
    signal_type: str
    entry_price: float
    quantity: int
    stop_loss: float
    target_1: float
    target_2: float
    current_price: float
    status: str  # OPEN, CLOSED_TP1, CLOSED_TP2, CLOSED_SL, CLOSED_MANUAL
    pnl: float
    pnl_percent: float
    entry_time: str
    exit_time: Optional[str] = None
    exit_price: Optional[float] = None
    exit_reason: Optional[str] = None

# --- Backtest ---
class BacktestRequest(BaseModel):
    symbol: str
    exchange: str = "NSE"
    timeframe: str = "15m"
    period_days: int = 60
    initial_capital: float = 100000.0
    risk_per_trade_pct: float = 2.0
    min_breakout_score: int = 70

class BacktestTrade(BaseModel):
    symbol: str
    entry_time: str
    entry_price: float
    exit_time: str
    exit_price: float
    trade_type: str  # LONG, SHORT
    quantity: int
    pnl: float
    pnl_pct: float
    exit_reason: str  # TARGET_1, TARGET_2, STOP_LOSS, TIMEOUT
    score_at_entry: float

class BacktestResult(BaseModel):
    symbol: str
    timeframe: str
    period: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate_pct: float
    profit_factor: float
    total_pnl: float
    total_pnl_pct: float
    max_drawdown_pct: float
    avg_risk_reward: float
    trades: List[BacktestTrade]
    equity_curve: List[Dict[str, Any]]
