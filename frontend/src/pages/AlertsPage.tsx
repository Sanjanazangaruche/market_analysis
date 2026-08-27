import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Trash2,
  Filter,
  Save,
  Volume2,
  VolumeX,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  Briefcase,
  ShieldCheck,
  Clock,
  Flame
} from 'lucide-react';
import { AlertItem, AlertFilterSettings } from '../types';
import { alertsApi } from '../services/api';

interface AlertsPageProps {
  alerts: AlertItem[];
  onSelectStock: (symbol: string) => void;
  onRefreshAlerts: () => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  alerts,
  onSelectStock,
  onRefreshAlerts,
}) => {
  const [settings, setSettings] = useState<AlertFilterSettings>({
    min_score: 80,
    min_confidence: 90,
    min_risk_reward: 1.5,
    bullish_only: false,
    bearish_only: false,
    exchanges: ['NSE', 'BSE'],
    timeframes: ['5m', '15m', '1h', '1d'],
    stocks_selection: 'ALL',
    sound_enabled: true,
    desktop_popup_enabled: true,
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    alertsApi.getSettings().then((data) => {
      if (data) setSettings(data);
    }).catch(() => {});
  }, []);

  const handleApply90Preset = () => {
    setSettings((prev) => ({
      ...prev,
      min_score: 80,
      min_confidence: 90,
      min_risk_reward: 2.0,
      sound_enabled: true,
      desktop_popup_enabled: true,
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await alertsApi.saveSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save alert settings:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAlerts = async () => {
    if (window.confirm('Are you sure you want to clear all alert history?')) {
      await alertsApi.clearAlerts();
      onRefreshAlerts();
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-dark-850 border border-dark-750 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-bull/15 border border-bull/30 flex items-center justify-center text-bull">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Desktop Alert Center & Triggers</h1>
            <p className="text-xs text-slate-400 font-mono">
              Live notifications triggered by multi-confirmation breakout algorithms.
            </p>
          </div>
        </div>

        <button
          onClick={handleClearAlerts}
          className="flex items-center space-x-2 px-3 py-2 rounded-xl bg-dark-750 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-dark-750 hover:border-rose-500/30 text-xs font-semibold font-mono transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      {/* Grid: Alert Filter Configuration on Left, Alert Feed on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 Col): Alert Settings */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 space-y-4 font-mono text-xs shadow-xl">
          <div className="flex items-center justify-between border-b border-dark-750 pb-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-bull" />
              <h3 className="font-bold text-sm text-white">Alert Criteria Filters</h3>
            </div>
          </div>

          {/* Quick Preset 90%+ Button */}
          <button
            type="button"
            onClick={handleApply90Preset}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600/30 to-bull/20 border border-bull/40 text-bull-light hover:text-white font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md"
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Apply 90%+ High Accuracy Preset</span>
          </button>

          {/* Min Score */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Minimum Quality Score:</span>
              <span className="text-bull font-bold">{settings.min_score}/100</span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={settings.min_score}
              onChange={(e) => setSettings({ ...settings, min_score: Number(e.target.value) })}
              className="w-full accent-bull h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Min Confidence */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Minimum AI Confidence:</span>
              <span className={`font-bold ${settings.min_confidence >= 90 ? 'text-bull-light font-extrabold' : 'text-purple-400'}`}>
                {settings.min_confidence}% {settings.min_confidence >= 90 && '🔥'}
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={95}
              step={5}
              value={settings.min_confidence}
              onChange={(e) => setSettings({ ...settings, min_confidence: Number(e.target.value) })}
              className="w-full accent-purple-500 h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Min Risk Reward */}
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Minimum Risk/Reward:</span>
              <span className="text-cyan-400 font-bold">1:{settings.min_risk_reward}</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={3.5}
              step={0.25}
              value={settings.min_risk_reward}
              onChange={(e) => setSettings({ ...settings, min_risk_reward: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Direction Toggles */}
          <div className="space-y-2 pt-2 border-t border-dark-750">
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.bullish_only}
                onChange={(e) => setSettings({ ...settings, bullish_only: e.target.checked, bearish_only: false })}
                className="rounded accent-bull"
              />
              <span>Bullish Breakouts Only</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.bearish_only}
                onChange={(e) => setSettings({ ...settings, bearish_only: e.target.checked, bullish_only: false })}
                className="rounded accent-bear"
              />
              <span>Bearish Breakdowns Only</span>
            </label>
          </div>

          {/* Audio & Desktop Push Toggles */}
          <div className="space-y-2 pt-2 border-t border-dark-750">
            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sound_enabled}
                onChange={(e) => setSettings({ ...settings, sound_enabled: e.target.checked })}
                className="rounded accent-bull"
              />
              <span>Play Sound Chime on Alert</span>
            </label>

            <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.desktop_popup_enabled}
                onChange={(e) => setSettings({ ...settings, desktop_popup_enabled: e.target.checked })}
                className="rounded accent-bull"
              />
              <span>Show Desktop System Notification</span>
            </label>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-bull hover:bg-bull-light text-dark-950 font-bold transition-all flex items-center justify-center space-x-2 shadow-md shadow-bull/20"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : saveSuccess ? 'Settings Saved!' : 'Save Filter Rules'}</span>
            </button>
          </div>
        </div>

        {/* Right Column (2 Cols): Alerts History Table */}
        <div className="lg:col-span-2 bg-dark-850 border border-dark-750 rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-4 border-b border-dark-750 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white font-mono">
              Alert Stream History ({alerts.length})
            </h3>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-dark-900 border-b border-dark-750 text-slate-400 select-none">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Signal</th>
                  <th className="py-3 px-4">Holding Period</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Score & AI</th>
                  <th className="py-3 px-4">Trade Plan</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-750/70">
                {alerts.length > 0 ? (
                  alerts.map((item, idx) => {
                    const isBull = !item.breakout_type.includes('BEARISH');
                    const isHighAcc = item.ai_confidence >= 90;

                    return (
                      <tr key={item.id || idx} className={`transition-colors ${
                        isHighAcc ? 'bg-purple-950/20 hover:bg-purple-900/30' : 'hover:bg-dark-800/80'
                      }`}>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {item.created_at ? item.created_at.split(' ')[1] : 'Just now'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <span className="font-bold text-white">{item.symbol}</span>
                            <span className="text-[10px] text-slate-500">({item.exchange})</span>
                          </div>
                          {isHighAcc && (
                            <span className="text-[9px] text-amber-300 font-bold flex items-center">
                              <Flame className="w-2.5 h-2.5 mr-0.5 fill-amber-300" />
                              90%+ AI
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                              isBull
                                ? 'bg-bull/15 text-bull-light border-bull/30'
                                : 'bg-bear/15 text-bear-light border-bear/30'
                            }`}
                          >
                            {item.breakout_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                            <Clock className="w-3 h-3 mr-1 text-cyan-400 shrink-0" />
                            {item.holding_period || 'Swing Entry (3 - 7 Days)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-200">
                          ₹{item.price}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-bull font-bold">{item.score}/100</div>
                          <div className={`text-[10px] ${isHighAcc ? 'text-amber-300 font-bold' : 'text-purple-400'}`}>
                            AI: {item.ai_confidence}%
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[10px] text-slate-400">
                          <div>SL: <span className="text-rose-400">₹{item.stop_loss}</span></div>
                          <div>T2: <span className="text-bull">₹{item.target_2}</span> (1:{item.risk_reward})</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onSelectStock(item.symbol)}
                            className="px-2.5 py-1 rounded bg-dark-750 hover:bg-bull hover:text-dark-950 text-slate-200 font-semibold transition-colors flex items-center space-x-1 ml-auto"
                          >
                            <span>Analyze</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                      No alerts triggered yet. Scanner will notify you when setups match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
