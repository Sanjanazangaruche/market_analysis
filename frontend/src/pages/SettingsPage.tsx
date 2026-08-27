import React, { useState, useEffect } from 'react';
import {
  Settings2,
  Key,
  Database,
  Sliders,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Cpu
} from 'lucide-react';
import { AppSettings } from '../types';
import { settingsApi } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [model, setModel] = useState<string>('gpt-4o-mini');
  const [dataProvider, setDataProvider] = useState<string>('yfinance');
  const [weights, setWeights] = useState<Record<string, number>>({
    sr_breakout: 20,
    volume: 15,
    ema_trend: 15,
    rsi: 10,
    macd: 10,
    adx: 10,
    vwap: 5,
    supertrend: 5,
    price_action: 5,
    risk_reward: 5,
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    settingsApi.getSettings().then((data) => {
      if (data) {
        setSettings(data);
        setModel(data.openai_model || 'gpt-4o-mini');
        setDataProvider(data.data_provider || 'yfinance');
        if (data.scoring_weights) setWeights(data.scoring_weights);
      }
    }).catch(() => {});
  }, []);

  const totalWeights = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleWeightChange = (key: string, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload: any = {
        data_provider: dataProvider,
        openai_model: model,
        scoring_weights: weights,
      };
      if (apiKey.trim()) {
        payload.openai_api_key = apiKey.trim();
      }

      await settingsApi.updateSettings(payload);
      setSaveSuccess(true);
      setApiKey('');
      // Refresh
      const updated = await settingsApi.getSettings();
      setSettings(updated);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-dark-850 border border-dark-750 rounded-2xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-bull/15 border border-bull/30 flex items-center justify-center text-bull">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">System & AI Scanner Settings</h1>
            <p className="text-xs text-slate-400 font-mono">
              Configure OpenAI API keys, Market Data provider modes, and custom 10-factor scoring weights.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 font-mono text-xs">
        {/* OpenAI API Configuration Card */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-dark-750 pb-3">
            <Key className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white font-mono">
              OpenAI Intelligence API Configuration
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-slate-400 mb-1.5">
                <label>OpenAI API Key (sk-...)</label>
                {settings?.openai_api_key_configured ? (
                  <span className="text-bull flex items-center font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Configured ({settings.openai_api_key_masked})
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Not Set (Using Deterministic AI Engine)
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder={settings?.openai_api_key_configured ? "Enter new key to update..." : "sk-..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-white focus:border-purple-400 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Keys are stored securely in local SQLite database and are never sent to the browser or leaked.
              </p>
            </div>

            <div>
              <label className="block text-slate-400 mb-1.5">AI Reasoning Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-4 py-2.5 text-white focus:border-purple-400 focus:outline-none"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Recommended - Fast & Cost-efficient)</option>
                <option value="gpt-4o">gpt-4o (Deep Multimodal Quantitative Analysis)</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Market Data Provider Mode */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-dark-750 pb-3">
            <Database className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white font-mono">
              Market Data Feed Provider Mode
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Live Yahoo Finance */}
            <div
              onClick={() => setDataProvider('yfinance')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                dataProvider === 'yfinance'
                  ? 'bg-bull/10 border-bull/50 shadow-md shadow-bull/10'
                  : 'bg-dark-900 border-dark-700 hover:border-dark-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white">Live Yahoo Finance (NSE & BSE)</span>
                {dataProvider === 'yfinance' && <CheckCircle2 className="w-4 h-4 text-bull" />}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Fetches real-time and historical multi-timeframe candle data for NSE stocks (.NS) and BSE stocks (.BO).
              </p>
            </div>

            {/* Mock Simulator */}
            <div
              onClick={() => setDataProvider('mock')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                dataProvider === 'mock'
                  ? 'bg-purple-500/10 border-purple-500/50 shadow-md shadow-purple-500/10'
                  : 'bg-dark-900 border-dark-700 hover:border-dark-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white">Mock Market Simulator (Offline Mode)</span>
                {dataProvider === 'mock' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                High-fidelity realistic synthetic candle stream simulating breakout surges, pullbacks, and S/R touches without requiring an internet connection.
              </p>
            </div>
          </div>
        </div>

        {/* Scoring Weights Configurator */}
        <div className="bg-dark-850 border border-dark-750 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-dark-750 pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-bull" />
              <h2 className="text-sm font-bold text-white font-mono">
                Breakout Quality Scoring Weights (Total 100%)
              </h2>
            </div>
            <div className={`text-xs font-bold px-2.5 py-1 rounded-lg font-mono ${
              totalWeights === 100 ? 'bg-bull/20 text-bull border border-bull/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}>
              Total: {totalWeights} / 100
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {[
              { key: 'sr_breakout', label: 'Support / Resistance Breakout', def: 20 },
              { key: 'volume', label: 'Volume Surge & RVOL Confirmation', def: 15 },
              { key: 'ema_trend', label: 'EMA Stacked Trend Alignment', def: 15 },
              { key: 'rsi', label: 'RSI Momentum Confirmation', def: 10 },
              { key: 'macd', label: 'MACD Histogram Expansion', def: 10 },
              { key: 'adx', label: 'ADX Trend Strength', def: 10 },
              { key: 'vwap', label: 'VWAP Intraday Confirmation', def: 5 },
              { key: 'supertrend', label: 'Supertrend Direction', def: 5 },
              { key: 'price_action', label: 'Price Action & Candlestick Pattern', def: 5 },
              { key: 'risk_reward', label: 'Risk/Reward Ratio Favourability', def: 5 },
            ].map((w) => (
              <div key={w.key} className="space-y-1">
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>{w.label}</span>
                  <span className="text-bull font-bold">{weights[w.key] ?? w.def}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={weights[w.key] ?? w.def}
                  onChange={(e) => handleWeightChange(w.key, Number(e.target.value))}
                  className="w-full accent-bull h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between p-4 bg-dark-900 border border-dark-750 rounded-2xl">
          <div className="text-slate-400 text-[11px]">
            Market Trading Hours: <span className="text-slate-200 font-bold">09:15 – 15:30 IST (Mon-Fri)</span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-xl bg-bull hover:bg-bull-light text-dark-950 font-bold text-xs font-mono shadow-lg shadow-bull/20 transition-all flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Settings Successfully Saved!' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
