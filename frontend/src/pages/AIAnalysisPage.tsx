import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Ban,
  FileText,
  Briefcase,
  Layers,
  ArrowRight,
  Clock
} from 'lucide-react';
import { StockScanResult } from '../types';
import { aiApi } from '../services/api';

interface AIAnalysisPageProps {
  results: StockScanResult[];
  onSelectStock: (symbol: string) => void;
  onOpenTradeModal: (item: StockScanResult) => void;
}

export const AIAnalysisPage: React.FC<AIAnalysisPageProps> = ({
  results,
  onSelectStock,
  onOpenTradeModal,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    results.length > 0 ? results[0].symbol : 'RELIANCE'
  );
  const [selectedResult, setSelectedResult] = useState<StockScanResult | null>(
    results.length > 0 ? results[0] : null
  );
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);

  const handleSelectSymbol = (sym: string) => {
    setSelectedSymbol(sym);
    const match = results.find((r) => r.symbol === sym);
    if (match) setSelectedResult(match);
  };

  const handleRunAIDeepDive = async () => {
    if (!selectedSymbol) return;
    setIsLoadingAI(true);
    try {
      const res = await aiApi.analyze(selectedSymbol, 'NSE', '15m');
      if (res && res.ai_analysis && selectedResult) {
        setSelectedResult({
          ...selectedResult,
          ai_analysis: res.ai_analysis,
        });
      }
    } catch (e) {
      console.error('Error running AI deep dive:', e);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const ai = selectedResult?.ai_analysis;
  const isBull = selectedResult ? !selectedResult.breakout_signal.signal_type.includes('BEARISH') : true;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-dark-850 to-dark-850 border border-purple-500/30 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              AI Trade Intelligence & Breakout Explanation
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Multi-indicator quantitative validation combined with OpenAI structured reasoning engine.
            </p>
          </div>
        </div>

        {/* Stock Selector Dropdown */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedSymbol}
            onChange={(e) => handleSelectSymbol(e.target.value)}
            className="bg-dark-900 border border-purple-500/40 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-purple-400 cursor-pointer"
          >
            {results.map((r) => (
              <option key={r.symbol} value={r.symbol}>
                {r.symbol} — Score: {r.score_breakdown.total_score}/100 ({r.breakout_signal.signal_type.replace('_', ' ')})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunAIDeepDive}
            disabled={isLoadingAI}
            className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold font-mono transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center space-x-2"
          >
            <Sparkles className={`w-4 h-4 ${isLoadingAI ? 'animate-spin' : ''}`} />
            <span>{isLoadingAI ? 'Analyzing...' : 'Re-Evaluate AI'}</span>
          </button>
        </div>
      </div>

      {selectedResult && ai ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Narrative & Structured Factors */}
          <div className="lg:col-span-2 space-y-6">
            {/* Verdict Card */}
            <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 font-mono block mb-1">AI Setup Verdict</span>
                <div className={`text-xl font-bold font-mono ${isBull ? 'text-bull' : 'text-bear'}`}>
                  {ai.signal}
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-mono block mb-1">Estimated Holding Duration</span>
                <div className="text-sm font-bold font-mono text-cyan-300 flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  {ai.holding_period || selectedResult.trade_setup?.holding_period || '3 - 7 Days (Swing Setup)'}
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="text-xs text-slate-400 block mb-1">Confidence Score</span>
                <span className={`text-xl font-bold ${ai.confidence_score >= 90 ? 'text-bull-light font-extrabold' : 'text-purple-400'}`}>
                  {ai.confidence_score}% {ai.confidence_score >= 90 && '🔥'}
                </span>
              </div>
            </div>

            {/* Narrative Explanation */}
            <div className="bg-dark-850 border border-dark-750 rounded-2xl p-6 space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono">
                  Technical Thesis & Breakout Mechanism
                </h3>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed font-sans bg-dark-900/80 p-4 rounded-xl border border-dark-750">
                {ai.explanation}
              </p>
            </div>

            {/* Supporting & Conflicting Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supporting Factors */}
              <div className="bg-bull/5 border border-bull/20 rounded-2xl p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-bull" />
                  <h4 className="text-xs font-bold text-bull uppercase font-mono tracking-wider">
                    Supporting Technical Confluence ({ai.supporting_indicators.length})
                  </h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-200">
                  {ai.supporting_indicators.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-bull mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Conflicting / Risk Factors */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-400 uppercase font-mono tracking-wider">
                    Caution & Divergences ({ai.conflicting_indicators.length})
                  </h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-200">
                  {ai.conflicting_indicators.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Invalidation Rules Card */}
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 flex items-start space-x-3">
              <Ban className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-rose-300 font-mono uppercase tracking-wider block">
                  Hard Invalidation Condition
                </span>
                <p className="text-xs text-rose-200 mt-1 font-mono">{ai.invalidation_condition}</p>
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Trade Execution Box */}
          <div className="space-y-6">
            {selectedResult.trade_setup && (
              <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-dark-750 pb-3">
                  <span className="font-bold text-sm text-white">AI Trade Plan</span>
                  <span className="text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                    R:R 1:{selectedResult.trade_setup.risk_reward_ratio}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-dark-900 border border-dark-750">
                    <span className="text-slate-400 block text-[10px]">Entry Zone</span>
                    <span className="font-bold text-sm text-white">
                      ₹{selectedResult.trade_setup.entry_min} – ₹{selectedResult.trade_setup.entry_max}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-900 border border-dark-750">
                    <span className="text-rose-400 block text-[10px]">Stop Loss</span>
                    <span className="font-bold text-sm text-rose-300">
                      ₹{selectedResult.trade_setup.stop_loss}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-900 border border-dark-750">
                    <span className="text-bull block text-[10px]">Target 1 (1.5R)</span>
                    <span className="font-bold text-sm text-emerald-300">
                      ₹{selectedResult.trade_setup.target_1}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-dark-900 border border-dark-750">
                    <span className="text-bull block text-[10px]">Target 2 (Major)</span>
                    <span className="font-bold text-sm text-emerald-300">
                      ₹{selectedResult.trade_setup.target_2}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onOpenTradeModal(selectedResult)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-bull to-emerald-600 hover:from-bull-light hover:to-emerald-500 text-dark-950 font-bold text-xs shadow-lg shadow-bull/20 transition-all flex items-center justify-center space-x-2"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Execute Paper Trade</span>
                </button>

                <button
                  onClick={() => onSelectStock(selectedResult.symbol)}
                  className="w-full py-2.5 rounded-xl bg-dark-750 hover:bg-dark-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Open Interactive Chart</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-12 text-center text-slate-400 font-mono">
          Select a stock to view its AI trade intelligence breakdown.
        </div>
      )}
    </div>
  );
};
