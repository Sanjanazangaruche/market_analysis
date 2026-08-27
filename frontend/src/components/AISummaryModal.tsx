import React from 'react';
import { X, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, FileText, Ban } from 'lucide-react';
import { StockScanResult } from '../types';

interface AISummaryModalProps {
  item: StockScanResult | null;
  onClose: () => void;
}

export const AISummaryModal: React.FC<AISummaryModalProps> = ({ item, onClose }) => {
  if (!item || !item.ai_analysis) return null;

  const ai = item.ai_analysis;
  const isBull = !item.breakout_signal.signal_type.includes('BEARISH');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-dark-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl shadow-purple-900/20 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-dark-750 flex items-center justify-between bg-dark-850">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-lg text-white">{item.symbol} Breakout Intelligence</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  {ai.confidence_score}% Confidence
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {item.company_name} • {item.exchange} • {item.timeframe.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-dark-750 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Signal & Quality Banner */}
          <div className="bg-dark-800 rounded-xl p-4 border border-dark-700 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-400 font-mono block">Setup Verdict</span>
              <span className={`text-base font-bold font-mono ${isBull ? 'text-bull' : 'text-bear'}`}>
                {ai.signal}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-mono block">Holding Duration</span>
              <span className="text-xs font-bold font-mono text-cyan-300">
                {ai.holding_period || item.trade_setup?.holding_period || 'Swing Entry (3 - 7 Days)'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-mono block">Breakout Quality</span>
              <span className="text-sm font-bold font-mono text-purple-300 uppercase px-2.5 py-0.5 rounded bg-purple-500/15 border border-purple-500/30">
                {ai.breakout_quality.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Detailed Narrative Explanation */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center">
              <FileText className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              Technical Synthesis & Setup Breakdown
            </h4>
            <div className="p-3.5 rounded-xl bg-dark-850 border border-dark-750 text-slate-200 text-xs leading-relaxed">
              {ai.explanation}
            </div>
          </div>

          {/* Trade Plan Reasoning Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-dark-850 border border-dark-750 space-y-1">
              <span className="text-slate-400 font-bold block text-[11px]">Entry Logic:</span>
              <p className="text-slate-300 text-[11px] leading-snug">{ai.entry_reasoning}</p>
            </div>
            <div className="p-3 rounded-xl bg-dark-850 border border-dark-750 space-y-1">
              <span className="text-rose-400 font-bold block text-[11px]">Stop Loss Logic:</span>
              <p className="text-slate-300 text-[11px] leading-snug">{ai.stop_loss_reasoning}</p>
            </div>
            <div className="p-3 rounded-xl bg-dark-850 border border-dark-750 space-y-1">
              <span className="text-bull font-bold block text-[11px]">Targets Logic:</span>
              <p className="text-slate-300 text-[11px] leading-snug">{ai.target_reasoning}</p>
            </div>
            <div className="p-3 rounded-xl bg-dark-850 border border-dark-750 space-y-1">
              <span className="text-cyan-400 font-bold block text-[11px]">Risk/Reward Edge:</span>
              <p className="text-slate-300 text-[11px] leading-snug">{ai.risk_reward_explanation}</p>
            </div>
          </div>

          {/* Supporting & Conflicting Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Supporting */}
            <div className="bg-bull/5 border border-bull/20 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-bull flex items-center font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Supporting Technical Confluence ({ai.supporting_indicators.length})
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {ai.supporting_indicators.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-bull mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conflicting / Caution */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-amber-400 flex items-center font-mono">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Caution & Divergences ({ai.conflicting_indicators.length})
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {ai.conflicting_indicators.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Trade Invalidation Rule */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-3">
            <Ban className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-rose-300 font-mono block">Trade Invalidation Condition:</span>
              <p className="text-xs text-rose-200 mt-0.5">{ai.invalidation_condition}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Disclaimer */}
        <div className="px-6 py-3 border-t border-dark-750 bg-dark-950 flex items-center justify-between text-[11px] text-slate-400">
          <span>{ai.disclaimer}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-white font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
