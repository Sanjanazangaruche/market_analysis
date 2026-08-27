import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldAlert,
  Target,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { PaperTrade } from '../types';
import { paperTradesApi } from '../services/api';

interface PaperTradingPageProps {
  onSelectStock: (symbol: string) => void;
}

export const PaperTradingPage: React.FC<PaperTradingPageProps> = ({ onSelectStock }) => {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [summary, setSummary] = useState<any>({
    total_trades: 0,
    open_positions: 0,
    closed_trades: 0,
    total_pnl: 0,
    realized_pnl: 0,
    unrealized_pnl: 0,
    winning_trades: 0,
    losing_trades: 0,
    win_rate_percent: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPaperTrades = async () => {
    setIsLoading(true);
    try {
      const data = await paperTradesApi.getTrades();
      if (data) {
        setTrades(data.trades || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error('Error fetching paper trades:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaperTrades();
    const interval = setInterval(fetchPaperTrades, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCloseTrade = async (id: number) => {
    try {
      await paperTradesApi.closeTrade(id);
      fetchPaperTrades();
    } catch (e) {
      console.error('Error closing trade:', e);
    }
  };

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const closedTrades = trades.filter((t) => t.status !== 'OPEN');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dark-850 border border-dark-750 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-bull/15 border border-bull/30 flex items-center justify-center text-bull">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Paper Trading Portfolio & Positions</h1>
            <p className="text-xs text-slate-400 font-mono">
              Live simulated trading with automatic Stop Loss & Take Profit execution engine.
            </p>
          </div>
        </div>

        <button
          onClick={fetchPaperTrades}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-750 hover:bg-dark-700 text-slate-300 text-xs font-mono transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh P&L</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Net P&L</span>
          <div className={`text-2xl font-bold ${summary.total_pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            ₹{summary.total_pnl?.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Win Rate</span>
          <div className="text-2xl font-bold text-purple-400">
            {summary.win_rate_percent}%
          </div>
          <span className="text-[10px] text-slate-500">
            {summary.winning_trades} Wins / {summary.losing_trades} Losses
          </span>
        </div>

        <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Realized Profit</span>
          <div className={`text-2xl font-bold ${summary.realized_pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
            ₹{summary.realized_pnl?.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="bg-dark-850 border border-dark-750 rounded-xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Active Positions</span>
          <div className="text-2xl font-bold text-cyan-400">
            {summary.open_positions}
          </div>
        </div>
      </div>

      {/* Open Positions Table */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl overflow-hidden shadow-xl space-y-3">
        <div className="p-4 border-b border-dark-750 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Open Positions ({openTrades.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-dark-900 border-b border-dark-750 text-slate-400 select-none">
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Entry</th>
                <th className="py-3 px-4">LTP</th>
                <th className="py-3 px-4">Stop Loss</th>
                <th className="py-3 px-4">Target 1 & 2</th>
                <th className="py-3 px-4">Unrealized P&L</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-750/70">
              {openTrades.length > 0 ? (
                openTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-dark-800/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      <button onClick={() => onSelectStock(t.symbol)} className="hover:text-bull">
                        {t.symbol}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        t.signal_type === 'BUY' ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
                      }`}>
                        {t.signal_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200">{t.quantity}</td>
                    <td className="py-3 px-4 text-slate-200">₹{t.entry_price}</td>
                    <td className="py-3 px-4 font-bold text-white">₹{t.current_price}</td>
                    <td className="py-3 px-4 text-rose-400">₹{t.stop_loss}</td>
                    <td className="py-3 px-4 text-emerald-400">
                      <span>T1: ₹{t.target_1}</span> | <span>T2: ₹{t.target_2}</span>
                    </td>
                    <td className="py-3 px-4 font-bold">
                      <div className={t.pnl >= 0 ? 'text-bull' : 'text-bear'}>
                        {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toLocaleString('en-IN')} ({t.pnl_percent.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCloseTrade(t.id)}
                        className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs transition-colors"
                      >
                        Exit Position
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono">
                    No active positions currently open.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Closed Trades History */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl overflow-hidden shadow-xl space-y-3">
        <div className="p-4 border-b border-dark-750 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Closed Trade Journal ({closedTrades.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-dark-900 border-b border-dark-750 text-slate-400 select-none">
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Entry</th>
                <th className="py-3 px-4">Exit Price</th>
                <th className="py-3 px-4">Realized P&L</th>
                <th className="py-3 px-4">Exit Trigger</th>
                <th className="py-3 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-750/70">
              {closedTrades.length > 0 ? (
                closedTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-dark-800/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{t.symbol}</td>
                    <td className="py-3 px-4">{t.signal_type}</td>
                    <td className="py-3 px-4 text-slate-300">{t.quantity}</td>
                    <td className="py-3 px-4 text-slate-300">₹{t.entry_price}</td>
                    <td className="py-3 px-4 font-bold text-slate-200">₹{t.exit_price || t.current_price}</td>
                    <td className="py-3 px-4 font-bold">
                      <div className={t.pnl >= 0 ? 'text-bull' : 'text-bear'}>
                        {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toLocaleString('en-IN')} ({t.pnl_percent.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status.includes('TP') ? 'bg-bull/20 text-bull' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {t.exit_reason || t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {t.exit_time ? t.exit_time.split(' ')[1] : t.entry_time}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-mono">
                    No closed trades recorded yet.
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
