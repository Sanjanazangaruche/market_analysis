import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
  Activity,
  AlertCircle,
  Clock,
  ArrowRight,
  BarChart3,
  Layers,
  Flame,
  Filter
} from 'lucide-react';
import { StockScanResult, AlertItem, MarketIndex } from '../types';
import { SetupCard } from '../components/SetupCard';

interface DashboardPageProps {
  results: StockScanResult[];
  alerts: AlertItem[];
  indices: MarketIndex[];
  marketSentiment: string;
  isMarketOpen: boolean;
  onSelectStock: (symbol: string) => void;
  onOpenAIModal: (item: StockScanResult) => void;
  onOpenTradeModal: (item: StockScanResult) => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  results,
  alerts,
  indices,
  marketSentiment,
  isMarketOpen,
  onSelectStock,
  onOpenAIModal,
  onOpenTradeModal,
  onNavigateTab,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'HIGH_ACCURACY' | 'BULLISH' | 'BEARISH'>('ALL');

  // Filter lists
  const highAccuracySetups = results.filter(
    (r) => (r.ai_analysis?.confidence_score ?? 0) >= 90 || r.score_breakdown.total_score >= 85
  );

  const bullishBreakouts = results.filter(
    (r) => r.breakout_signal.is_breakout && !r.breakout_signal.signal_type.includes('BEARISH')
  );
  const bearishBreakdowns = results.filter(
    (r) => r.breakout_signal.is_breakout && r.breakout_signal.signal_type.includes('BEARISH')
  );

  let displayedSetups = results.filter((r) => r.breakout_signal.is_breakout || r.score_breakdown.total_score >= 70);

  if (filterMode === 'HIGH_ACCURACY') {
    displayedSetups = highAccuracySetups.length > 0 ? highAccuracySetups : displayedSetups.slice(0, 6);
  } else if (filterMode === 'BULLISH') {
    displayedSetups = bullishBreakouts;
  } else if (filterMode === 'BEARISH') {
    displayedSetups = bearishBreakdowns;
  }

  const topBreakouts = displayedSetups.slice(0, 6);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 90%+ High Accuracy Setups */}
        <div
          onClick={() => setFilterMode(filterMode === 'HIGH_ACCURACY' ? 'ALL' : 'HIGH_ACCURACY')}
          className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between shadow-lg transition-all ${
            filterMode === 'HIGH_ACCURACY'
              ? 'bg-gradient-to-r from-purple-900/40 via-dark-850 to-bull/10 border-bull shadow-bull/10'
              : 'bg-dark-850 border-dark-750/80 hover:border-dark-600'
          }`}
        >
          <div>
            <div className="flex items-center space-x-1 text-xs font-mono text-amber-400 font-bold mb-1">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>90%+ High Conviction</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-bull-light">{highAccuracySetups.length}</span>
              <span className="text-[11px] text-slate-400 font-mono">Setups</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Bullish Breakouts */}
        <div
          onClick={() => setFilterMode(filterMode === 'BULLISH' ? 'ALL' : 'BULLISH')}
          className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between shadow-lg transition-all ${
            filterMode === 'BULLISH'
              ? 'bg-bull/15 border-bull shadow-bull/10'
              : 'bg-dark-850 border-dark-750/80 hover:border-dark-600'
          }`}
        >
          <div>
            <span className="text-xs font-mono text-slate-400 block mb-1">Bullish Breakouts</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-bull">{bullishBreakouts.length}</span>
              <span className="text-[11px] text-slate-400 font-mono">Confirmed</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-bull/15 border border-bull/30 flex items-center justify-center text-bull">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Bearish Breakdowns */}
        <div
          onClick={() => setFilterMode(filterMode === 'BEARISH' ? 'ALL' : 'BEARISH')}
          className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between shadow-lg transition-all ${
            filterMode === 'BEARISH'
              ? 'bg-bear/15 border-bear shadow-bear/10'
              : 'bg-dark-850 border-dark-750/80 hover:border-dark-600'
          }`}
        >
          <div>
            <span className="text-xs font-mono text-slate-400 block mb-1">Bearish Breakdowns</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-bear">{bearishBreakdowns.length}</span>
              <span className="text-[11px] text-slate-400 font-mono">Signals</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-bear/15 border border-bear/30 flex items-center justify-center text-bear">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Market Sentiment */}
        <div className="bg-dark-850 border border-dark-750/80 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-black/20">
          <div>
            <span className="text-xs font-mono text-slate-400 block mb-1">Market Sentiment</span>
            <div className="flex items-baseline space-x-2">
              <span className={`text-base font-bold font-mono ${marketSentiment === 'BULLISH' ? 'text-bull' : (marketSentiment === 'BEARISH' ? 'text-bear' : 'text-slate-200')}`}>
                {marketSentiment}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">({results.length} Stocks)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Top Breakouts on Left, Live Alert Feed on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Top Breakout Setups */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-bull" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
                {filterMode === 'HIGH_ACCURACY' ? '🔥 90%+ AI High Conviction Setups' : 'Top Breakout Opportunities'}
              </h2>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 text-xs font-mono">
              <button
                onClick={() => setFilterMode('ALL')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterMode === 'ALL' ? 'bg-bull text-dark-950 font-bold' : 'bg-dark-750 text-slate-300 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('HIGH_ACCURACY')}
                className={`px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors ${
                  filterMode === 'HIGH_ACCURACY' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold' : 'bg-dark-750 text-slate-300 hover:text-purple-300'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>90%+ Accuracy</span>
              </button>
              <button
                onClick={() => onNavigateTab('scanner')}
                className="text-xs text-bull-light hover:text-white font-mono flex items-center space-x-1 group ml-2"
              >
                <span>View All ({results.length})</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {topBreakouts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topBreakouts.map((item) => (
                <SetupCard
                  key={item.symbol}
                  item={item}
                  onSelectStock={onSelectStock}
                  onOpenAIModal={onOpenAIModal}
                  onOpenTradeModal={onOpenTradeModal}
                />
              ))}
            </div>
          ) : (
            <div className="bg-dark-850 border border-dark-750 rounded-xl p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">No active breakout setups matching filter</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The scanner is actively monitoring Indian stocks across 5M, 15M, 1H, and Daily timeframes. Click "Scan Now" or switch filters.
              </p>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Live Alerts Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
                Live Alert Stream
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab('alerts')}
              className="text-xs text-purple-400 hover:text-white font-mono flex items-center space-x-1"
            >
              <span>Alert History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-dark-850 border border-dark-750 rounded-xl p-3 space-y-2.5 max-h-[560px] overflow-y-auto">
            {alerts.length > 0 ? (
              alerts.slice(0, 8).map((alert, idx) => {
                const isBull = !alert.breakout_type.includes('BEARISH');
                return (
                  <div
                    key={alert.id || idx}
                    onClick={() => onSelectStock(alert.symbol)}
                    className="p-3 rounded-lg bg-dark-900/90 border border-dark-750 hover:border-dark-600 transition-all cursor-pointer space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-white group-hover:text-bull transition-colors">
                          {alert.symbol}
                        </span>
                        <span className="text-[10px] font-mono px-1 rounded bg-dark-750 text-slate-400">
                          {alert.exchange}
                        </span>
                        {alert.ai_confidence >= 90 && (
                          <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                            90%+ AI
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-bull/20 text-bull">
                        {alert.score}/100
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={isBull ? 'text-bull' : 'text-bear'}>
                        {alert.breakout_type.replace('_', ' ')}
                      </span>
                      <span className="text-white font-bold">₹{alert.price}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono">
                      <span className="flex items-center font-medium">
                        <Clock className="w-3 h-3 mr-1 text-cyan-400" />
                        {alert.holding_period || 'Swing Entry (3 - 7 Days)'}
                      </span>
                      <span className="text-slate-400 text-[10px]">R:R 1:{alert.risk_reward}</span>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-dark-800">
                      <span>SL: ₹{alert.stop_loss}</span>
                      <span>T2: ₹{alert.target_2}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 font-mono">
                No alerts received in this session.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
