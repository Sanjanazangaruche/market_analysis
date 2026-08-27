export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockQuote {
  symbol: string;
  exchange: string;
  company_name?: string;
  sector?: string;
  current_price: number;
  change: number;
  change_percent: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  volume: number;
  avg_volume: number;
  timestamp: string;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_percent: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  advance_count?: number;
  decline_count?: number;
}

export interface EMAValues {
  ema20: number;
  ema50: number;
  ema200: number;
  alignment: 'BULLISH' | 'BEARISH' | 'MIXED' | 'NEUTRAL';
  price_above_ema20: boolean;
  price_above_ema50: boolean;
  price_above_ema200: boolean;
  crossover_20_50?: string;
  crossover_50_200?: string;
}

export interface RSIValues {
  rsi14: number;
  status: 'OVERBOUGHT' | 'OVERSOLD' | 'BULLISH_MOMENTUM' | 'BEARISH_MOMENTUM' | 'NEUTRAL';
  momentum_confirmed: boolean;
}

export interface MACDValues {
  macd: number;
  signal: number;
  histogram: number;
  crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface VWAPValues {
  vwap: number;
  price_position: 'ABOVE' | 'BELOW' | 'NEUTRAL';
  vwap_breakout: boolean;
  vwap_rejection: boolean;
}

export interface ADXValues {
  adx14: number;
  plus_di: number;
  minus_di: number;
  trend_strength: 'VERY_STRONG' | 'STRONG' | 'MODERATE' | 'WEAK';
  trend_direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface SupertrendValues {
  supertrend: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reversal: boolean;
}

export interface ATRValues {
  atr14: number;
  atr_percent: number;
}

export interface VolumeAnalysis {
  current_volume: number;
  avg_volume_20: number;
  relative_volume: number;
  is_volume_spike: boolean;
  breakout_volume_confirmed: boolean;
}

export interface TechnicalIndicators {
  ema: EMAValues;
  rsi: RSIValues;
  macd: MACDValues;
  vwap: VWAPValues;
  adx: ADXValues;
  supertrend: SupertrendValues;
  atr: ATRValues;
  volume: VolumeAnalysis;
}

export interface SRLevel {
  price: number;
  level_type: 'SUPPORT' | 'RESISTANCE';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  touch_count: number;
  score: number;
  is_major: boolean;
}

export interface SupportResistanceSummary {
  nearest_support: number;
  nearest_resistance: number;
  distance_to_support_pct: number;
  distance_to_resistance_pct: number;
  all_supports: SRLevel[];
  all_resistances: SRLevel[];
  swing_highs: number[];
  swing_lows: number[];
  prev_day_high?: number;
  prev_day_low?: number;
  prev_week_high?: number;
  prev_week_low?: number;
  consolidation_range?: {
    high: number;
    low: number;
    mid: number;
    range_pct: number;
    duration_candles: number;
  };
}

export interface BreakoutSignal {
  is_breakout: boolean;
  signal_type: 'BULLISH_BREAKOUT' | 'BEARISH_BREAKDOWN' | 'RETEST_CONFIRMED' | 'FALSE_BREAKOUT' | 'VOLUME_BREAKOUT' | 'CONSOLIDATION_BREAKOUT' | 'NO_BREAKOUT';
  breakout_level: number;
  breakout_price: number;
  candle_time: string;
  confirmation_count: number;
  confirmations: string[];
  failed_conditions: string[];
}

export interface BreakoutScoreBreakdown {
  sr_breakout_score: number;
  volume_score: number;
  ema_trend_score: number;
  rsi_score: number;
  macd_score: number;
  adx_score: number;
  vwap_score: number;
  supertrend_score: number;
  price_action_score: number;
  risk_reward_score: number;
  total_score: number;
  classification: 'VERY_STRONG' | 'STRONG' | 'GOOD' | 'MODERATE' | 'WEAK';
}

export interface TradeSetup {
  symbol: string;
  exchange: string;
  current_price: number;
  breakout_level: number;
  setup_type: string;
  entry_min: number;
  entry_max: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  target_3: number;
  risk_per_share: number;
  potential_reward_t1: number;
  potential_reward_t2: number;
  risk_reward_ratio: number;
  holding_period?: string;
  entry_reasoning: string;
  stop_loss_reasoning: string;
  target_reasoning: string;
}

export interface TimeframeSummary {
  timeframe: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsi: number;
  ema_aligned: boolean;
  supertrend: string;
  score: number;
}

export interface MultiTimeframeAnalysis {
  daily: TimeframeSummary;
  one_hour: TimeframeSummary;
  fifteen_min: TimeframeSummary;
  five_min: TimeframeSummary;
  composite_trend: string;
  overall_mtf_score: number;
  alignment_summary: string;
}

export interface AIAnalysisResult {
  signal: string;
  breakout_quality: string;
  explanation: string;
  holding_period?: string;
  entry_reasoning: string;
  stop_loss_reasoning: string;
  target_reasoning: string;
  risk_reward_explanation: string;
  supporting_indicators: string[];
  conflicting_indicators: string[];
  risk_factors: string[];
  invalidation_condition: string;
  confidence_score: number;
  disclaimer: string;
}

export interface StockScanResult {
  symbol: string;
  exchange: string;
  company_name?: string;
  sector?: string;
  timeframe: string;
  current_price: number;
  change_pct: number;
  volume: number;
  relative_volume: number;
  breakout_signal: BreakoutSignal;
  score_breakdown: BreakoutScoreBreakdown;
  trade_setup?: TradeSetup;
  multi_timeframe?: MultiTimeframeAnalysis;
  indicators: TechnicalIndicators;
  support_resistance: SupportResistanceSummary;
  ai_analysis?: AIAnalysisResult;
  scanned_at: string;
}

export interface AlertItem {
  id?: number;
  symbol: string;
  exchange: string;
  timeframe: string;
  price: number;
  breakout_type: string;
  score: number;
  quality: string;
  ai_confidence: number;
  holding_period?: string;
  entry_min: number;
  entry_max: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  target_3?: number;
  risk_reward: number;
  created_at?: string;
  status?: string;
}

export interface AlertFilterSettings {
  min_score: number;
  min_confidence: number;
  min_risk_reward: number;
  bullish_only: boolean;
  bearish_only: boolean;
  exchanges: string[];
  timeframes: string[];
  stocks_selection: string;
  sound_enabled: boolean;
  desktop_popup_enabled: boolean;
}

export interface WatchlistItem {
  id?: number;
  symbol: string;
  exchange: string;
  name?: string;
  sector?: string;
  alert_enabled: boolean;
  added_at?: string;
}

export interface PaperTrade {
  id: number;
  symbol: string;
  exchange: string;
  signal_type: 'BUY' | 'SELL';
  entry_price: number;
  quantity: number;
  stop_loss: number;
  target_1: number;
  target_2: number;
  current_price: number;
  status: 'OPEN' | 'CLOSED_TP1' | 'CLOSED_TP2' | 'CLOSED_SL' | 'CLOSED_MANUAL';
  pnl: number;
  pnl_percent: number;
  entry_time: string;
  exit_time?: string;
  exit_price?: number;
  exit_reason?: string;
}

export interface BacktestRequest {
  symbol: string;
  exchange?: string;
  timeframe?: string;
  period_days?: number;
  initial_capital?: number;
  risk_per_trade_pct?: number;
  min_breakout_score?: number;
}

export interface BacktestTrade {
  symbol: string;
  entry_time: string;
  entry_price: number;
  exit_time: string;
  exit_price: number;
  trade_type: 'LONG' | 'SHORT';
  quantity: number;
  pnl: number;
  pnl_pct: number;
  exit_reason: string;
  score_at_entry: number;
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  period: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate_pct: number;
  profit_factor: number;
  total_pnl: number;
  total_pnl_pct: number;
  max_drawdown_pct: number;
  avg_risk_reward: number;
  trades: BacktestTrade[];
  equity_curve: { time: string; equity: number; pnl: number }[];
}

export interface AppSettings {
  app_name: string;
  version: string;
  data_provider: string;
  openai_api_key_configured: boolean;
  openai_api_key_masked: string;
  openai_model: string;
  default_timeframe: string;
  scoring_weights: Record<string, number>;
  market_timings: {
    open: string;
    close: string;
    timezone: string;
  };
}
