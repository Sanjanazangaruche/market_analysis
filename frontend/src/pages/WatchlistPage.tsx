import React, { useState, useEffect } from 'react';
import {
  BookmarkCheck,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Search,
  ArrowUpRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { WatchlistItem } from '../types';
import { watchlistApi } from '../services/api';

interface WatchlistPageProps {
  onSelectStock: (symbol: string) => void;
  onScanNow: () => void;
}

export const WatchlistPage: React.FC<WatchlistPageProps> = ({
  onSelectStock,
  onScanNow,
}) => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newSymbol, setNewSymbol] = useState<string>('');
  const [newExchange, setNewExchange] = useState<string>('NSE');
  const [newName, setNewName] = useState<string>('');
  const [newSector, setNewSector] = useState<string>('Equities');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchWatchlist = async () => {
    setIsLoading(true);
    try {
      const data = await watchlistApi.getAll();
      setWatchlist(data || []);
    } catch (e) {
      console.error('Error loading watchlist:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    setErrorMsg('');

    try {
      await watchlistApi.add({
        symbol: newSymbol.trim().toUpperCase(),
        exchange: newExchange,
        name: newName.trim() || newSymbol.trim().toUpperCase(),
        sector: newSector.trim(),
        alert_enabled: true,
      });
      setNewSymbol('');
      setNewName('');
      setShowAddModal(false);
      fetchWatchlist();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to add stock');
    }
  };

  const handleRemove = async (symbol: string) => {
    try {
      await watchlistApi.remove(symbol);
      setWatchlist((prev) => prev.filter((item) => item.symbol !== symbol));
    } catch (e) {
      console.error('Error removing stock:', e);
    }
  };

  const handleToggleAlert = async (symbol: string) => {
    try {
      const res = await watchlistApi.toggleAlert(symbol);
      setWatchlist((prev) =>
        prev.map((item) =>
          item.symbol === symbol ? { ...item, alert_enabled: res.alert_enabled } : item
        )
      );
    } catch (e) {
      console.error('Error toggling alert:', e);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dark-850 border border-dark-750 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-bull/15 border border-bull/30 flex items-center justify-center text-bull">
            <BookmarkCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Custom Watchlist Manager</h1>
            <p className="text-xs text-slate-400 font-mono">
              Curate target equities for prioritized scanner execution and dedicated alert triggers.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-bull hover:bg-bull-light text-dark-950 text-xs font-bold font-mono transition-colors shadow-lg shadow-bull/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-dark-900 border-b border-dark-750 text-slate-400 select-none">
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Exchange</th>
                <th className="py-3 px-4">Sector</th>
                <th className="py-3 px-4">Alert Trigger</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-750/70">
              {watchlist.length > 0 ? (
                watchlist.map((item) => (
                  <tr key={item.symbol} className="hover:bg-dark-800/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onSelectStock(item.symbol)}
                        className="font-bold text-white group-hover:text-bull text-left transition-colors"
                      >
                        {item.symbol}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-sans">{item.name}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-750 text-slate-400">
                        {item.exchange}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-dark-750 text-slate-300 border border-dark-700 text-[10px]">
                        {item.sector}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleAlert(item.symbol)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                          item.alert_enabled
                            ? 'bg-bull/15 border-bull/30 text-bull'
                            : 'bg-dark-750 border-dark-700 text-slate-500'
                        }`}
                      >
                        {item.alert_enabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                        <span>{item.alert_enabled ? 'Active' : 'Muted'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => onSelectStock(item.symbol)}
                          className="p-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-300 hover:text-white transition-colors"
                          title="Open Chart"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemove(item.symbol)}
                          className="p-1.5 rounded-lg bg-dark-750 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove from Watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                    Your watchlist is currently empty. Click "Add Stock" to begin tracking equities.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Add Stock to Watchlist</h3>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddStock} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Stock Symbol (e.g. INFY, TCS, RELIANCE)</label>
                <input
                  type="text"
                  required
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="INFY"
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Exchange</label>
                  <select
                    value={newExchange}
                    onChange={(e) => setNewExchange(e.target.value)}
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
                  >
                    <option value="NSE">NSE</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Sector</label>
                  <input
                    type="text"
                    value={newSector}
                    onChange={(e) => setNewSector(e.target.value)}
                    placeholder="IT, Banking..."
                    className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Company Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Infosys Limited"
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-bull focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-dark-750 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-bull text-dark-950 font-bold hover:bg-bull-light"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
