import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Briefcase,
  ShieldAlert,
  Target,
  Layers,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Sliders,
  DollarSign,
  Clock
} from 'lucide-react';
import { StockScanResult, Candle } from '../types';
import { stocksApi, aiApi } from '../services/api';
import { CandlestickChart } from '../charts/CandlestickChart';
import { SubIndicatorsChart } from '../charts/SubIndicatorsChart';
import { BreakoutScoreGauge } from '../components/BreakoutScoreGauge';

interface StockDetailPageProps {
  symbol: string;
  onBack: () => void;
  onOpenTradeModal: (item: StockScanResult) => void;
  onOpenAIModal: (item: StockScanResult) => void;
}

export const StockDetailPage: React.FC<StockDetailPageProps> = ({
  symbol,
  onBack,
  onOpenTradeModal,
  onOpenAIModal,
}) => {
  const [stockData, setStockData] = useState<StockScanResult | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [subchartType, setSubchartType] = useState<'RSI' | 'MACD' | 'VOLUME'>('RSI');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [analysisRes, candleRes] = await Promise.all([
          stocksApi.getAnalysis(symbol, 'NSE', timeframe),
          stocksApi.getCandles(symbol, 'NSE', timeframe, 120)
        ]);
        if (isMounted) {
          setStockData(analysisRes);
          setCandles(candleRes.candles || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.response?.data?.detail || 'Failed to load stock data');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [symbol, timeframe]);

  if (isLoading && !stockData) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-bull animate-spin" />
        <div className="text-sm font-mono text-slate-400">Loading {symbol} Candlesticks & Technical Confluence...</div>
      </div>
    );
  }

  if (error || !stockData) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <div className="text-rose-400 font-bold">{error || 'Stock data unavailable'}</div>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-dark-750 text-white text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isBull = !stockData.breakout_signal.signal_type.includes('BEARISH');
  const setup = stockData.trade_setup;
  const ind = stockData.indicators;
  const sr = stockData.support_resistance;
  const mtf = stockData.multi_timeframe;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Symbol Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dark-850 border border-dark-750 rounded-xl p-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">{stockData.symbol}</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-dark-750 text-slate-300 border border-dark-700">
                {stockData.exchange}
              </span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  isBull ? 'bg-bull/20 text-bull border border-bull/30' : 'bg-bear/20 text-bear border border-bear/30'
                }`}
              >
                {stockData.breakout_signal.signal_type.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {stockData.company_name} • Sector: {stockData.sector}
            </p>
          </div>
        </div>

        {/* Price Metrics */}
        <div className="flex items-center space-x-6">
          <div className="text-right font-mono">
            <div className="text-2xl font-bold text-white">
              ₹{stockData.current_price.toLocaleString('en-IN')}
            </div>
            <div
              className={`text-xs font-bold flex items-center justify-end ${
                stockData.change_pct >= 0 ? 'text-bull' : 'text-bear'
              }`}
            >
              {stockData.change_pct >= 0 ? '+' : ''}{stockData.change_pct}%
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenAIModal(stockData)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Deep Dive</span>
            </button>

            <button
              onClick={() => onOpenTradeModal(stockData)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-bull hover:bg-bull-light text-dark-950 text-xs font-bold transition-colors shadow-lg shadow-bull/20"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Execute Paper Trade</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Timeframe Confluence Matrix */}
      {mtf && (
        <div className="bg-dark-850 border border-dark-750 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-bull" />
            <span className="font-bold text-slate-200">MTF Confluence Matrix:</span>
            <span className="text-slate-400 text-[11px]">{mtf.alignment_summary}</span>
          </div>

          <div className="flex items-center space-x-2">
            {[mtf.daily, mtf.one_hour, mtf.fifteen_min, mtf.five_min].map((tf) => {
              const isTfBull = tf.trend === 'BULLISH';
              return (
                <div
                  key={tf.timeframe}
                  className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1.5 ${
                    isTfBull
                      ? 'bg-bull/10 border-bull/30 text-bull-light'
                      : tf.trend === 'BEARISH'
                      ? 'bg-bear/10 border-bear/30 text-bear-light'
                      : 'bg-dark-750 border-dark-700 text-slate-300'
                  }`}
                >
                  <span className="font-bold">{tf.timeframe}:</span>
                  <span>{tf.trend}</span>
                  <span className="text-[10px] opacity-70">(RSI: {Math.round(tf.rsi)})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Layout: Chart (Left) + Trade Plan & S/R Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Candlestick Chart & Subcharts */}
        <div className="lg:col-span-2 space-y-4">
          <CandlestickChart
            candles={candles}
            indicators={ind}
            supportResistance={sr}
            tradeSetup={setup}
            height={430}
          />

          {/* Subchart Controls */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex bg-dark-850 rounded-lg p-0.5 border border-dark-750 text-xs font-mono">
              {(['RSI', 'MACD', 'VOLUME'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSubchartType(type)}
                  className={`px-3 py-1 rounded transition-colors ${
                    subchartType === type
                      ? 'bg-bull text-dark-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              ATR (14): <span className="text-slate-200 font-bold">₹{ind.atr.atr14}</span> ({ind.atr.atr_percent}%) • ADX (14): <span className="text-slate-200 font-bold">{ind.adx.adx14}</span>
            </div>
          </div>

          <SubIndicatorsChart
            candles={candles}
            indicators={ind}
            subchartType={subchartType}
            height={120}
          />
        </div>

        {/* Right Column (1 Col): Trade Setup, Score Breakdown, S/R Levels */}
        <div className="space-y-4 font-mono text-xs">
          {/* Trade Setup Box */}
          {setup && (
            <div className="bg-dark-850 border border-dark-750 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-dark-750 pb-2">
                <span className="font-bold text-sm text-white flex items-center">
                  <Target className="w-4 h-4 mr-1.5 text-bull" />
                  Calculated Trade Setup
                </span>
                <span className="text-[11px] font-bold text-bull px-2 py-0.5 rounded bg-bull/15 border border-bull/30">
                  R:R 1:{setup.risk_reward_ratio}
                </span>
              </div>

              {/* Holding Period Banner */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900 border border-dark-750 text-[11px]">
                <span className="text-slate-400 flex items-center">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
                  Estimated Holding Duration:
                </span>
                <span className="font-bold text-cyan-300">
                  {setup.holding_period || stockData.ai_analysis?.holding_period || 'Swing Entry (3 - 7 Days)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-dark-900 border border-dark-750">
                  <span className="text-slate-400 block text-[10px]">Entry Zone</span>
                  <span className="font-bold text-slate-200">
                    ₹{setup.entry_min} – ₹{setup.entry_max}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-900 border border-dark-750">
                  <span className="text-rose-400 block text-[10px]">Stop Loss</span>
                  <span className="font-bold text-rose-300">₹{setup.stop_loss}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-900 border border-dark-750">
                  <span className="text-bull block text-[10px]">Target 1 (1.5R)</span>
                  <span className="font-bold text-emerald-300">₹{setup.target_1}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-dark-900 border border-dark-750">
                  <span className="text-bull block text-[10px]">Target 2 (Major)</span>
                  <span className="font-bold text-emerald-300">₹{setup.target_2}</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 text-[10px] text-slate-400">
                <div>
                  <span className="text-slate-300 font-semibold block">Entry Reasoning:</span>
                  <span>{setup.entry_reasoning}</span>
                </div>
                <div>
                  <span className="text-rose-300 font-semibold block">Stop Loss Reasoning:</span>
                  <span>{setup.stop_loss_reasoning}</span>
                </div>
                <div>
                  <span className="text-emerald-300 font-semibold block">Target Reasoning:</span>
                  <span>{setup.target_reasoning}</span>
                </div>
              </div>
            </div>
          )}

          {/* Breakout Score Breakdown Card */}
          <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
            <h3 className="font-bold text-sm text-white mb-2">Breakout Quality Scoring</h3>
            <BreakoutScoreGauge
              score={stockData.score_breakdown.total_score}
              classification={stockData.score_breakdown.classification}
              breakdown={stockData.score_breakdown}
              size="lg"
              showDetails={true}
            />
          </div>

          {/* Support & Resistance Levels Card */}
          <div className="bg-dark-850 border border-dark-750 rounded-xl p-4 space-y-2.5">
            <h3 className="font-bold text-sm text-white">Support & Resistance Zones</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 rounded-lg bg-dark-900 border border-dark-750">
                <span className="text-rose-400">Nearest Resistance:</span>
                <span className="font-bold text-white">
                  ₹{sr.nearest_resistance} ({sr.distance_to_resistance_pct}% away)
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-dark-900 border border-dark-750">
                <span className="text-bull">Nearest Support:</span>
                <span className="font-bold text-white">
                  ₹{sr.nearest_support} ({sr.distance_to_support_pct}% away)
                </span>
              </div>
              {sr.prev_day_high && (
                <div className="flex justify-between text-[11px] text-slate-400 px-1">
                  <span>PDH: ₹{sr.prev_day_high}</span>
                  <span>PDL: ₹{sr.prev_day_low}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
