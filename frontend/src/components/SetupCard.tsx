import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
  Briefcase,
  Clock,
  Flame
} from 'lucide-react';
import { StockScanResult } from '../types';
import { BreakoutScoreGauge } from './BreakoutScoreGauge';

interface SetupCardProps {
  item: StockScanResult;
  onSelectStock: (symbol: string) => void;
  onOpenAIModal: (item: StockScanResult) => void;
  onOpenTradeModal: (item: StockScanResult) => void;
}

export const SetupCard: React.FC<SetupCardProps> = ({
  item,
  onSelectStock,
  onOpenAIModal,
  onOpenTradeModal,
}) => {
  const isBull = !item.breakout_signal.signal_type.includes('BEARISH');
  const setup = item.trade_setup;
  const isHighConviction = (item.ai_analysis?.confidence_score ?? 0) >= 90;

  return (
    <div className="bg-dark-850 border border-dark-750 hover:border-dark-600 rounded-xl p-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 flex flex-col justify-between group relative overflow-hidden">
      {/* Glow highlight top line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          isHighConviction
            ? 'bg-gradient-to-r from-purple-500 via-bull to-amber-400'
            : isBull
            ? 'bg-gradient-to-r from-bull to-emerald-400'
            : 'bg-gradient-to-r from-bear to-rose-400'
        }`}
      />

      <div>
        {/* Top Row: Symbol, Exchange, Price, and 90%+ badge */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-white tracking-tight">{item.symbol}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-750 text-slate-300 border border-dark-700">
                {item.exchange}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-750 text-slate-400">
                {item.timeframe.toUpperCase()}
              </span>
              {isHighConviction && (
                <span className="flex items-center space-x-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-600/30 to-bull/30 text-bull-light border border-bull/40 font-bold animate-pulse">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>90%+ CONVICTION</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[180px]">{item.company_name}</p>
          </div>

          <div className="text-right">
            <div className="font-mono font-bold text-sm text-white">
              ₹{item.current_price.toLocaleString('en-IN')}
            </div>
            <div
              className={`text-xs font-mono font-semibold flex items-center justify-end ${
                item.change_pct >= 0 ? 'text-bull' : 'text-bear'
              }`}
            >
              {item.change_pct >= 0 ? '+' : ''}{item.change_pct}%
            </div>
          </div>
        </div>

        {/* Signal & Score Row */}
        <div className="mt-3 flex items-center justify-between bg-dark-900/80 rounded-lg p-2.5 border border-dark-750">
          <div className="space-y-1">
            <span
              className={`inline-flex items-center text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                isBull
                  ? 'bg-bull/20 text-bull-light border border-bull/30'
                  : 'bg-bear/20 text-bear-light border border-bear/30'
              }`}
            >
              {isBull ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {item.breakout_signal.signal_type.replace('_', ' ')}
            </span>
            <div className="text-[10px] text-slate-400 font-mono">
              RVOL: <span className="text-slate-200 font-bold">{item.relative_volume}x</span> | RSI: <span className="text-slate-200 font-bold">{item.indicators.rsi.rsi14}</span>
            </div>
          </div>

          <BreakoutScoreGauge
            score={item.score_breakdown.total_score}
            classification={item.score_breakdown.classification}
            size="sm"
          />
        </div>

        {/* Holding Period Badge */}
        <div className="mt-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-dark-900/90 border border-cyan-500/30 text-[11px] font-mono shadow-inner">
          <span className="flex items-center text-slate-300 font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-400 mr-1.5" /> Holding Horizon:
          </span>
          <span className="font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
            {setup?.holding_period || item.ai_analysis?.holding_period || 'Swing Entry (3 - 7 Days)'}
          </span>
        </div>

        {/* Trade Setup Parameters */}
        {setup && (
          <div className="mt-2.5 grid grid-cols-3 gap-2 bg-dark-800/60 rounded-lg p-2.5 border border-dark-700/60 font-mono text-[11px]">
            <div>
              <span className="text-[10px] text-slate-400 block">Entry Zone</span>
              <span className="font-semibold text-slate-200">
                ₹{setup.entry_min}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-rose-400 block flex items-center">
                <ShieldAlert className="w-2.5 h-2.5 mr-0.5 inline" /> SL
              </span>
              <span className="font-semibold text-rose-300">₹{setup.stop_loss}</span>
            </div>
            <div>
              <span className="text-[10px] text-bull block flex items-center">
                <Target className="w-2.5 h-2.5 mr-0.5 inline" /> Target 2
              </span>
              <span className="font-semibold text-emerald-300">₹{setup.target_2}</span>
            </div>
          </div>
        )}

        {/* R:R & AI Confidence row */}
        {setup && (
          <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono px-1">
            <span className="text-slate-400">
              Risk:Reward: <span className="font-bold text-slate-200">1:{setup.risk_reward_ratio}</span>
            </span>
            {item.ai_analysis && (
              <span className={`flex items-center font-bold ${
                isHighConviction ? 'text-bull-light' : 'text-purple-400'
              }`}>
                <Sparkles className="w-3 h-3 mr-1" />
                AI Conf: {item.ai_analysis.confidence_score}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-dark-750/80 grid grid-cols-3 gap-1.5">
        <button
          onClick={() => onSelectStock(item.symbol)}
          className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-200 text-xs font-semibold transition-colors"
        >
          <span>Chart</span>
          <ArrowUpRight className="w-3 h-3" />
        </button>

        <button
          onClick={() => onOpenAIModal(item)}
          className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          <span>AI Insight</span>
        </button>

        <button
          onClick={() => onOpenTradeModal(item)}
          className="flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-bull/20 hover:bg-bull/30 border border-bull/30 text-bull-light text-xs font-semibold transition-colors"
        >
          <Briefcase className="w-3 h-3" />
          <span>Trade</span>
        </button>
      </div>
    </div>
  );
};
