import pytest
import pandas as pd
import numpy as np
from backend.market_data.mock_provider import MockMarketDataProvider
from backend.indicators.engine import IndicatorEngine
from backend.support_resistance.detector import SupportResistanceDetector
from backend.breakout.detector import BreakoutDetector
from backend.strategy.scoring import BreakoutScoringEngine
from backend.strategy.trade_setup import TradeSetupEngine
from backend.strategy.multi_timeframe import MultiTimeframeAnalyzer
from backend.ai.openai_analyzer import AIAnalyzer
from backend.alerts.alert_manager import AlertManager
from backend.paper_trading.paper_engine import PaperTradingEngine
from backend.backtesting.engine import BacktestingEngine
from backend.models.schemas import BacktestRequest, PaperTradeOrder

def test_market_data_and_indicators():
    provider = MockMarketDataProvider()
    df = provider.get_candles("RELIANCE", timeframe="15m", count=100)
    assert not df.empty
    assert len(df) == 100
    assert "close" in df.columns

    indicators = IndicatorEngine.compute_all_indicators(df)
    assert indicators.ema.ema20 > 0
    assert indicators.rsi.rsi14 >= 0 and indicators.rsi.rsi14 <= 100
    assert indicators.adx.adx14 >= 0
    assert indicators.volume.relative_volume >= 0

def test_support_resistance():
    provider = MockMarketDataProvider()
    df = provider.get_candles("RELIANCE", timeframe="15m", count=100)
    sr = SupportResistanceDetector.calculate_support_resistance(df)
    assert sr.nearest_support > 0
    assert sr.nearest_resistance > 0
    assert sr.distance_to_support_pct >= 0

def test_breakout_detection_and_scoring():
    provider = MockMarketDataProvider()
    df = provider.get_candles("RELIANCE", timeframe="15m", count=100)
    indicators = IndicatorEngine.compute_all_indicators(df)
    sr = SupportResistanceDetector.calculate_support_resistance(df)

    signal = BreakoutDetector.detect_breakout(df, indicators, sr)
    assert signal is not None
    assert signal.signal_type in [
        "BULLISH_BREAKOUT", "BEARISH_BREAKDOWN", "RETEST_CONFIRMED",
        "FALSE_BREAKOUT", "VOLUME_BREAKOUT", "CONSOLIDATION_BREAKOUT", "NO_BREAKOUT"
    ]

    score = BreakoutScoringEngine.calculate_score(signal, indicators, sr)
    assert 0 <= score.total_score <= 100
    assert score.classification in ["VERY_STRONG", "STRONG", "GOOD", "MODERATE", "WEAK"]

def test_trade_setup_and_ai():
    provider = MockMarketDataProvider()
    df = provider.get_candles("RELIANCE", timeframe="15m", count=100)
    current_p = float(df['close'].iloc[-1])
    indicators = IndicatorEngine.compute_all_indicators(df)
    sr = SupportResistanceDetector.calculate_support_resistance(df)
    signal = BreakoutDetector.detect_breakout(df, indicators, sr)
    score = BreakoutScoringEngine.calculate_score(signal, indicators, sr)

    setup = TradeSetupEngine.generate_trade_setup("RELIANCE", "NSE", current_p, signal, indicators, sr)
    if setup:
        assert setup.entry_min > 0
        assert setup.stop_loss > 0
        assert setup.target_1 > 0
        assert setup.risk_reward_ratio > 0

    ai_res = AIAnalyzer.analyze_setup(
        "RELIANCE", "NSE", "15m", current_p, indicators, sr, signal, score, setup
    )
    assert ai_res is not None
    assert ai_res.confidence_score >= 0
    assert len(ai_res.explanation) > 10

def test_paper_trading():
    order = PaperTradeOrder(
        symbol="TEST_RELIANCE",
        exchange="NSE",
        signal_type="BUY",
        entry_price=2900.0,
        quantity=10,
        stop_loss=2850.0,
        target_1=2980.0,
        target_2=3050.0
    )
    trade = PaperTradingEngine.place_order(order)
    assert trade is not None
    assert trade.id > 0
    assert trade.status == "OPEN"

    # Update position price
    updated = PaperTradingEngine.update_position_price("TEST_RELIANCE", 2950.0)
    assert len(updated) > 0
    assert updated[0].pnl == 500.0

def test_backtesting():
    req = BacktestRequest(
        symbol="RELIANCE",
        exchange="NSE",
        timeframe="15m",
        period_days=30,
        initial_capital=100000.0,
        risk_per_trade_pct=2.0,
        min_breakout_score=60
    )
    res = BacktestingEngine.run_backtest(req)
    assert res is not None
    assert len(res.equity_curve) > 0

def test_ai_confidence_and_holding_timeframe_alert_trigger():
    from backend.models.schemas import StockScanResult, AlertFilterSettings, BreakoutSignal, BreakoutScoreBreakdown, AIAnalysisResult
    
    # Verify AlertFilterSettings defaults to 90% min_confidence
    filter_settings = AlertManager.get_filter_settings()
    assert filter_settings.min_confidence == 90
    assert filter_settings.min_score == 80

    provider = MockMarketDataProvider()
    df = provider.get_candles("RELIANCE", timeframe="15m", count=100)
    current_p = float(df['close'].iloc[-1])
    indicators = IndicatorEngine.compute_all_indicators(df)
    sr = SupportResistanceDetector.calculate_support_resistance(df)
    
    # 1. Test TradeSetup holding period mapping
    setup_15m = TradeSetupEngine.generate_trade_setup("RELIANCE", "NSE", current_p, BreakoutSignal(is_breakout=True, signal_type="BULLISH_BREAKOUT", breakout_level=2800, breakout_price=2810, candle_time="2026-08-23", confirmation_count=4, confirmations=["EMA", "RVOL", "RSI", "SR"], failed_conditions=[]), indicators, sr, timeframe="15m")
    assert "Short-Term Swing" in setup_15m.holding_period

    setup_1h = TradeSetupEngine.generate_trade_setup("RELIANCE", "NSE", current_p, BreakoutSignal(is_breakout=True, signal_type="BULLISH_BREAKOUT", breakout_level=2800, breakout_price=2810, candle_time="2026-08-23", confirmation_count=4, confirmations=["EMA", "RVOL", "RSI", "SR"], failed_conditions=[]), indicators, sr, timeframe="1h")
    assert "Swing Entry" in setup_1h.holding_period

    setup_1d = TradeSetupEngine.generate_trade_setup("RELIANCE", "NSE", current_p, BreakoutSignal(is_breakout=True, signal_type="BULLISH_BREAKOUT", breakout_level=2800, breakout_price=2810, candle_time="2026-08-23", confirmation_count=4, confirmations=["EMA", "RVOL", "RSI", "SR"], failed_conditions=[]), indicators, sr, timeframe="1d")
    assert "Positional Swing" in setup_1d.holding_period

    # 2. Test low confidence (< 90%) setup rejection
    low_conf_scan = StockScanResult(
        symbol="LOW_CONF_STOCK",
        exchange="NSE",
        timeframe="15m",
        current_price=2500.0,
        change_pct=1.5,
        volume=100000,
        relative_volume=1.2,
        breakout_signal=BreakoutSignal(is_breakout=True, signal_type="BULLISH_BREAKOUT", breakout_level=2490, breakout_price=2500, candle_time="2026-08-23", confirmation_count=3, confirmations=["EMA", "SR"], failed_conditions=[]),
        score_breakdown=BreakoutScoreBreakdown(sr_breakout_score=20, volume_score=10, ema_trend_score=10, rsi_score=8, macd_score=8, adx_score=8, vwap_score=5, supertrend_score=5, price_action_score=4, risk_reward_score=4, total_score=82.0, classification="STRONG"),
        trade_setup=setup_1h,
        indicators=indicators,
        support_resistance=sr,
        ai_analysis=AIAnalysisResult(
            signal="Bullish Breakout",
            breakout_quality="STRONG",
            explanation="Test explanation",
            holding_period="Swing Entry (3 - 7 Days)",
            entry_reasoning="Entry at breakout",
            stop_loss_reasoning="SL below pivot",
            target_reasoning="T1 at resistance",
            risk_reward_explanation="1:2.5",
            supporting_indicators=["EMA"],
            conflicting_indicators=[],
            risk_factors=[],
            invalidation_condition="Close below SL",
            confidence_score=85  # BELOW 90%
        ),
        scanned_at="2026-08-23 22:00:00"
    )
    # Should NOT trigger alert because confidence (85) < min_confidence (90)
    assert AlertManager.should_trigger_alert(low_conf_scan, filter_settings) is False

    # 3. Test high confidence (>= 90%) setup triggers alert and includes holding period
    high_conf_scan = StockScanResult(
        symbol="HIGH_CONF_STOCK",
        exchange="NSE",
        timeframe="1h",
        current_price=3100.0,
        change_pct=3.2,
        volume=500000,
        relative_volume=2.2,
        breakout_signal=BreakoutSignal(is_breakout=True, signal_type="BULLISH_BREAKOUT", breakout_level=3080, breakout_price=3100, candle_time="2026-08-23", confirmation_count=5, confirmations=["EMA", "RVOL", "RSI", "MACD", "SR"], failed_conditions=[]),
        score_breakdown=BreakoutScoreBreakdown(sr_breakout_score=20, volume_score=15, ema_trend_score=15, rsi_score=10, macd_score=10, adx_score=10, vwap_score=5, supertrend_score=5, price_action_score=5, risk_reward_score=5, total_score=95.0, classification="VERY_STRONG"),
        trade_setup=setup_1h,
        indicators=indicators,
        support_resistance=sr,
        ai_analysis=AIAnalysisResult(
            signal="Bullish Breakout",
            breakout_quality="VERY_STRONG",
            explanation="Exceptional high-conviction breakout setup.",
            holding_period="Swing Entry (3 - 7 Trading Days)",
            entry_reasoning="Entry confirmed above major resistance",
            stop_loss_reasoning="SL placed below structural support",
            target_reasoning="Targets aligned with multi-touch pivots",
            risk_reward_explanation="1:2.8",
            supporting_indicators=["Stacked EMAs", "RVOL > 2.0x", "RSI Momentum", "MACD Expansion"],
            conflicting_indicators=[],
            risk_factors=[],
            invalidation_condition="Candle close below SL",
            confidence_score=94  # ABOVE 90%
        ),
        scanned_at="2026-08-23 22:00:00"
    )
    # Should TRIGGER alert
    assert AlertManager.should_trigger_alert(high_conf_scan, filter_settings) is True
    recorded = AlertManager.record_alert(high_conf_scan)
    assert recorded is not None
    assert recorded.ai_confidence == 94
    assert recorded.holding_period == "Swing Entry (3 - 7 Trading Days)"

