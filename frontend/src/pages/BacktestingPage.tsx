import React, { useState } from 'react';
import {
  LineChart,
  Play,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Target,
  RefreshCw,
  Award,
  AlertCircle
} from 'lucide-react';
import { BacktestRequest, BacktestResult, BacktestTrade } from '../types';
import { backtestApi } from '../services/api';
import { EquityCurveChart } from '../charts/EquityCurveChart';

interface BacktestingPageProps {
  onSelectStock: (symbol: string) => void;
}

export const BacktestingPage: React.FC<BacktestingPageProps> = ({ onSelectStock }) => {
  const [symbol, setSymbol] = useState<string>('RELIANCE');
  const [exchange, setExchange] = useState<string>('NSE');
  const [timeframe, setTimeframe] = useState<string>('15m');
  const [periodDays, setPeriodDays] = useState<number>(60);
  const [initialCapital, setInitialCapital] = useState<number>(100000);
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(2.0);
  const [minScore, setMinScore] = useState<number>(70);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await backtestApi.run({
        symbol: symbol.toUpperCase(),
        exchange,
        timeframe,
        period_days: periodDays,
        initial_capital: initialCapital,
        risk_per_trade_pct: riskPerTradePct,
        min_breakout_score: minScore,
      });
      setResult(data);
    } catch (err) {
      console.error('Error running backtest:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Quantitative Strategy Backtester</h1>
            <p className="text-xs text-slate-400 font-mono">
              Simulate breakout confluence entry, multi-level target exits, and risk parameters on historical candles.
            </p>
          </div>
        </div>
      </div>

      {/* Backtest Parameters Form */}
      <form onSubmit={handleRunBacktest} className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
          Backtest Simulation Parameters
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Stock Symbol</label>
            <input
              type="text"
              required
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Timeframe</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
            >
              <option value="5m">5 Minute</option>
              <option value="15m">15 Minute</option>
              <option value="1h">1 Hour</option>
              <option value="1d">Daily (1D)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Lookback Period</label>
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(Number(e.target.value))}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
            >
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
              <option value={180}>180 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Initial Capital (₹)</label>
            <input
              type="number"
              step={10000}
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Risk Per Trade (%)</label>
            <input
              type="number"
              step={0.5}
              value={riskPerTradePct}
              onChange={(e) => setRiskPerTradePct(Number(e.target.value))}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Min Breakout Score</label>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
            >
              <option value={60}>60 (Moderate+)</option>
              <option value={70}>70 (Good+)</option>
              <option value={80}>80 (Strong+)</option>
              <option value={85}>85 (Very Strong)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold font-mono text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            <Play className={`w-4 h-4 fill-current ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Running Historical Simulation...' : 'Run Quantitative Backtest'}</span>
          </button>
        </div>
      </form>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-mono text-xs">
            <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
              <span className="text-slate-400 block mb-1">Net Strategy Profit</span>
              <div className={`text-xl font-bold ${result.total_pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                {result.total_pnl >= 0 ? '+' : ''}₹{result.total_pnl.toLocaleString('en-IN')} ({result.total_pnl_pct.toFixed(2)}%)
              </div>
            </div>

            <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
              <span className="text-slate-400 block mb-1">Win Rate</span>
              <div className="text-xl font-bold text-purple-400">
                {result.win_rate_pct}%
              </div>
              <span className="text-[10px] text-slate-500">
                {result.winning_trades} Wins / {result.losing_trades} Losses
              </span>
            </div>

            <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
              <span className="text-slate-400 block mb-1">Profit Factor</span>
              <div className="text-xl font-bold text-cyan-400">
                {result.profit_factor}
              </div>
            </div>

            <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
              <span className="text-slate-400 block mb-1">Max Drawdown</span>
              <div className="text-xl font-bold text-rose-400">
                {result.max_drawdown_pct.toFixed(2)}%
              </div>
            </div>

            <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
              <span className="text-slate-400 block mb-1">Total Executed Trades</span>
              <div className="text-xl font-bold text-white">
                {result.total_trades} Trades
              </div>
            </div>
          </div>

          {/* Equity Progression Curve */}
          <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-white font-mono flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-bull" />
              <span>Cumulative Equity Growth Curve</span>
            </h3>
            <EquityCurveChart data={result.equity_curve} height={260} />
          </div>

          {/* Trade Log Table */}
          <div className="bg-dark-850 border border-dark-750 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-dark-750">
              <h3 className="font-bold text-sm text-white font-mono">
                Individual Simulated Trades Log ({result.trades.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-dark-900 border-b border-dark-750 text-slate-400 select-none">
                    <th className="py-3 px-4">Entry Time</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Entry Price</th>
                    <th className="py-3 px-4">Exit Time</th>
                    <th className="py-3 px-4">Exit Price</th>
                    <th className="py-3 px-4">Score at Entry</th>
                    <th className="py-3 px-4">Exit Reason</th>
                    <th className="py-3 px-4 text-right">P&L (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-750/70">
                  {result.trades.map((t, idx) => (
                    <tr key={idx} className="hover:bg-dark-800/80 transition-colors">
                      <td className="py-3 px-4 text-slate-300">{t.entry_time}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          t.trade_type === 'LONG' ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                        }`}>
                          {t.trade_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white font-bold">₹{t.entry_price}</td>
                      <td className="py-3 px-4 text-slate-400">{t.exit_time}</td>
                      <td className="py-3 px-4 text-white font-bold">₹{t.exit_price}</td>
                      <td className="py-3 px-4 text-bull">{t.score_at_entry}/100</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          t.exit_reason.includes('TARGET') ? 'bg-bull/20 text-bull' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {t.exit_reason}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${t.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                        {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toLocaleString('en-IN')} ({t.pnl_pct.toFixed(2)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
