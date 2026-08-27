import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ArrowUpRight,
  Briefcase,
  Layers,
  Zap,
  SlidersHorizontal,
  Flame,
  Clock
} from 'lucide-react';
import { StockScanResult } from '../types';
import { BreakoutScoreGauge } from '../components/BreakoutScoreGauge';

interface ScannerPageProps {
  results: StockScanResult[];
  onSelectStock: (symbol: string) => void;
  onOpenAIModal: (item: StockScanResult) => void;
  onOpenTradeModal: (item: StockScanResult) => void;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({
  results,
  onSelectStock,
  onOpenAIModal,
  onOpenTradeModal,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('ALL');
  const [signalFilter, setSignalFilter] = useState<string>('ALL');
  const [highAccuracyOnly, setHighAccuracyOnly] = useState<boolean>(false);
  const [minScore, setMinScore] = useState<number>(0);
  const [minRvol, setMinRvol] = useState<number>(0);
  const [sortField, setSortField] = useState<string>('score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      // Search
      const matchesSearch =
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.company_name && item.company_name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // Exchange
      if (exchangeFilter !== 'ALL' && item.exchange !== exchangeFilter) return false;

      // High Accuracy Filter
      if (highAccuracyOnly) {
        const conf = item.ai_analysis?.confidence_score ?? 0;
        const score = item.score_breakdown.total_score;
        if (conf < 90 && score < 85) return false;
      }

      // Signal Filter
      if (signalFilter === 'BREAKOUT_ONLY' && !item.breakout_signal.is_breakout) return false;
      if (signalFilter === 'BULLISH' && (!item.breakout_signal.is_breakout || item.breakout_signal.signal_type.includes('BEARISH'))) return false;
      if (signalFilter === 'BEARISH' && (!item.breakout_signal.is_breakout || !item.breakout_signal.signal_type.includes('BEARISH'))) return false;
      if (signalFilter === 'RETEST' && item.breakout_signal.signal_type !== 'RETEST_CONFIRMED') return false;

      // Min Score
      if (item.score_breakdown.total_score < minScore) return false;

      // Min RVOL
      if (item.relative_volume < minRvol) return false;

      return true;
    }).sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'score':
          valA = a.score_breakdown.total_score;
          valB = b.score_breakdown.total_score;
          break;
        case 'price':
          valA = a.current_price;
          valB = b.current_price;
          break;
        case 'rvol':
          valA = a.relative_volume;
          valB = b.relative_volume;
          break;
        case 'rsi':
          valA = a.indicators.rsi.rsi14;
          valB = b.indicators.rsi.rsi14;
          break;
        case 'confidence':
          valA = a.ai_analysis ? a.ai_analysis.confidence_score : 0;
          valB = b.ai_analysis ? b.ai_analysis.confidence_score : 0;
          break;
        case 'symbol':
          valA = a.symbol;
          valB = b.symbol;
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        default:
          valA = a.score_breakdown.total_score;
          valB = b.score_breakdown.total_score;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [results, searchTerm, exchangeFilter, signalFilter, highAccuracyOnly, minScore, minRvol, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter Controls Bar */}
      <div className="bg-dark-850 border border-dark-750 rounded-xl p-4 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-bull/15 border border-bull/30 flex items-center justify-center text-bull">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Multi-Timeframe Breakout Scanner
              </h1>
              <span className="text-xs font-mono text-slate-400">
                Displaying {filteredResults.length} of {results.length} Stocks
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* 90%+ High Accuracy Toggle Button */}
            <button
              onClick={() => setHighAccuracyOnly(!highAccuracyOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all shadow-md ${
                highAccuracyOnly
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-bull text-white border-bull shadow-bull/20'
                  : 'bg-dark-900 border-dark-700 text-slate-300 hover:border-purple-500/50 hover:text-purple-300'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${highAccuracyOnly ? 'text-amber-300 fill-amber-300' : 'text-slate-400'}`} />
              <span>90%+ AI Conviction Only</span>
            </button>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search symbol, sector..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:border-bull focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-dark-750 text-xs font-mono">
          {/* Signal Filter */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Signal Type</label>
            <select
              value={signalFilter}
              onChange={(e) => setSignalFilter(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-bull focus:outline-none"
            >
              <option value="ALL">All Stocks</option>
              <option value="BREAKOUT_ONLY">Any Breakout Only</option>
              <option value="BULLISH">Bullish Breakouts</option>
              <option value="BEARISH">Bearish Breakdowns</option>
              <option value="RETEST">Retest Confirmed</option>
            </select>
          </div>

          {/* Exchange Filter */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Exchange</label>
            <select
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-bull focus:outline-none"
            >
              <option value="ALL">All Exchanges (NSE & BSE)</option>
              <option value="NSE">NSE Only</option>
              <option value="BSE">BSE Only</option>
            </select>
          </div>

          {/* Min Score Slider */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Min Score</span>
              <span className="text-bull font-bold">{minScore}</span>
            </div>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-bull h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Min RVOL */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Min Volume (RVOL)</label>
            <select
              value={minRvol}
              onChange={(e) => setMinRvol(Number(e.target.value))}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-bull focus:outline-none"
            >
              <option value={0}>Any Volume</option>
              <option value={1.2}>&gt; 1.2x (Above Average)</option>
              <option value={1.5}>&gt; 1.5x (Volume Surge)</option>
              <option value={2.0}>&gt; 2.0x (Institutional Volume)</option>
            </select>
          </div>

          {/* Reset button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setExchangeFilter('ALL');
                setSignalFilter('ALL');
                setHighAccuracyOnly(false);
                setMinScore(0);
                setMinRvol(0);
              }}
              className="w-full py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-300 text-xs transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Scanner Table */}
      <div className="bg-dark-850 border border-dark-750 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-dark-900 border-b border-dark-750 text-slate-400 select-none">
                <th onClick={() => handleSort('symbol')} className="py-3 px-4 font-semibold cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Stock</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('price')} className="py-3 px-4 font-semibold cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>LTP & Change</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">Breakout Signal</th>
                <th className="py-3 px-4 font-semibold">Holding Period</th>
                <th onClick={() => handleSort('rvol')} className="py-3 px-4 font-semibold cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>RVOL</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('rsi')} className="py-3 px-4 font-semibold cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>RSI 14</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold">EMA Trend</th>
                <th onClick={() => handleSort('score')} className="py-3 px-4 font-semibold cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th onClick={() => handleSort('confidence')} className="py-3 px-4 font-semibold cursor-pointer hover:text-white">
                  <div className="flex items-center space-x-1">
                    <span>AI Confidence</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-dark-750/70">
              {filteredResults.length > 0 ? (
                filteredResults.map((item) => {
                  const isBull = !item.breakout_signal.signal_type.includes('BEARISH');
                  const isBreakout = item.breakout_signal.is_breakout;
                  const isHighAcc = (item.ai_analysis?.confidence_score ?? 0) >= 90;

                  return (
                    <tr
                      key={item.symbol}
                      className={`transition-colors group ${
                        isHighAcc
                          ? 'bg-purple-950/20 hover:bg-purple-900/30'
                          : 'hover:bg-dark-800/80'
                      }`}
                    >
                      {/* Symbol & Exchange */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onSelectStock(item.symbol)}
                            className="font-bold text-white group-hover:text-bull text-left transition-colors"
                          >
                            {item.symbol}
                          </button>
                          <span className="text-[10px] px-1 rounded bg-dark-750 text-slate-400">
                            {item.exchange}
                          </span>
                          {isHighAcc && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold border border-purple-500/40">
                              90%+
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans truncate max-w-[140px]">
                          {item.company_name}
                        </div>
                      </td>

                      {/* LTP & Change % */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100">
                          ₹{item.current_price.toLocaleString('en-IN')}
                        </div>
                        <div
                          className={`text-[11px] font-semibold flex items-center ${
                            item.change_pct >= 0 ? 'text-bull' : 'text-bear'
                          }`}
                        >
                          {item.change_pct >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5 inline" /> : <TrendingDown className="w-3 h-3 mr-0.5 inline" />}
                          <span>{item.change_pct >= 0 ? '+' : ''}{item.change_pct}%</span>
                        </div>
                      </td>

                      {/* Signal Badge */}
                      <td className="py-3 px-4">
                        {isBreakout ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[11px] border ${
                              isBull
                                ? 'bg-bull/15 text-bull-light border-bull/30'
                                : 'bg-bear/15 text-bear-light border-bear/30'
                            }`}
                          >
                            {item.breakout_signal.signal_type.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">No Breakout</span>
                        )}
                      </td>

                      {/* Holding Period */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                          <Clock className="w-3 h-3 mr-1 text-cyan-400 shrink-0" />
                          {item.trade_setup?.holding_period || item.ai_analysis?.holding_period || 'Swing Entry (3 - 7 Days)'}
                        </span>
                      </td>

                      {/* RVOL */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-bold ${item.relative_volume >= 1.5 ? 'text-bull' : 'text-slate-300'}`}>
                            {item.relative_volume}x
                          </span>
                          {item.indicators.volume.is_volume_spike && (
                            <span className="text-[9px] px-1 rounded bg-bull/20 text-bull font-bold">
                              SPIKE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {(item.volume / 1000).toFixed(0)}k
                        </div>
                      </td>

                      {/* RSI */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            item.indicators.rsi.rsi14 >= 70
                              ? 'text-amber-400'
                              : item.indicators.rsi.rsi14 <= 30
                              ? 'text-rose-400'
                              : 'text-slate-200'
                          }`}
                        >
                          {item.indicators.rsi.rsi14}
                        </span>
                        <div className="text-[9px] text-slate-500">
                          {item.indicators.rsi.status.replace('_', ' ')}
                        </div>
                      </td>

                      {/* EMA Alignment */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            item.indicators.ema.alignment === 'BULLISH'
                              ? 'text-bull'
                              : item.indicators.ema.alignment === 'BEARISH'
                              ? 'text-bear'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.indicators.ema.alignment}
                        </span>
                      </td>

                      {/* Breakout Score Gauge */}
                      <td className="py-3 px-4">
                        <BreakoutScoreGauge
                          score={item.score_breakdown.total_score}
                          classification={item.score_breakdown.classification}
                          size="sm"
                        />
                      </td>

                      {/* AI Confidence */}
                      <td className="py-3 px-4">
                        {item.ai_analysis ? (
                          <div className={`flex items-center space-x-1 font-bold ${
                            isHighAcc ? 'text-bull-light animate-pulse' : 'text-purple-400'
                          }`}>
                            <Sparkles className="w-3 h-3" />
                            <span>{item.ai_analysis.confidence_score}%</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectStock(item.symbol)}
                            title="Interactive Chart"
                            className="p-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenAIModal(item)}
                            title="AI Deep Analysis"
                            className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenTradeModal(item)}
                            title="Execute Paper Trade"
                            className="p-1.5 rounded-lg bg-bull/20 hover:bg-bull/30 text-bull transition-colors"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-mono">
                    No stocks matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
