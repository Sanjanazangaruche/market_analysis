import React, { useState } from 'react';
import {
  Play,
  Square,
  RefreshCw,
  Volume2,
  VolumeX,
  Clock,
  TrendingUp,
  TrendingDown,
  Bell
} from 'lucide-react';
import { MarketIndex } from '../types';
import { notificationService } from '../services/notifications';

interface HeaderProps {
  indices: MarketIndex[];
  isMarketOpen: boolean;
  isScanning: boolean;
  autoScannerRunning: boolean;
  lastScanTime: string;
  scanProgress: { scanned: number; total: number; status: string };
  soundEnabled: boolean;
  selectedTimeframe: string;
  setSelectedTimeframe: (tf: string) => void;
  onManualScan: () => void;
  onToggleAutoScanner: (interval: number) => void;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  indices,
  isMarketOpen,
  isScanning,
  autoScannerRunning,
  lastScanTime,
  scanProgress,
  soundEnabled,
  selectedTimeframe,
  setSelectedTimeframe,
  onManualScan,
  onToggleAutoScanner,
  onToggleSound,
}) => {
  const [scanInterval, setScanInterval] = useState<number>(5);
  const [notifGranted, setNotifGranted] = useState<boolean>(notificationService.isGranted());

  const handleRequestNotification = async () => {
    const granted = await notificationService.requestPermission();
    setNotifGranted(granted);
  };

  return (
    <header className="h-16 bg-dark-900 border-b border-dark-750 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md shadow-black/20">
      {/* Left: Market Indices Ticker */}
      <div className="flex items-center space-x-4 overflow-x-auto py-1 scrollbar-none">
        {/* Session Badge */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-dark-800 border border-dark-700 shrink-0">
          <span className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-bull animate-pulse' : 'bg-rose-500'}`} />
          <span className="text-[11px] font-mono font-semibold text-slate-300">
            {isMarketOpen ? 'LIVE MARKET' : 'MARKET CLOSED'}
          </span>
        </div>

        {/* Indices */}
        {indices.map((idx) => {
          const isUp = idx.change >= 0;
          return (
            <div
              key={idx.symbol}
              className="flex items-center space-x-2.5 px-3 py-1 rounded bg-dark-850 border border-dark-700/80 hover:border-dark-600 transition-colors shrink-0"
            >
              <span className="text-xs font-bold text-slate-200 tracking-tight">{idx.name}</span>
              <span className="text-xs font-mono font-bold text-white">₹{idx.price.toLocaleString('en-IN')}</span>
              <div className={`flex items-center text-[11px] font-mono font-semibold ${isUp ? 'text-bull' : 'text-bear'}`}>
                {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                <span>{isUp ? '+' : ''}{idx.change_percent.toFixed(2)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: Scanner Controls & Actions */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Timeframe Switcher */}
        <div className="flex bg-dark-800 rounded-lg p-0.5 border border-dark-700">
          {['5m', '15m', '1h', '1d'].map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                selectedTimeframe === tf
                  ? 'bg-bull text-dark-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Auto Scanner Toggle */}
        <div className="flex items-center bg-dark-800 rounded-lg border border-dark-700 p-0.5">
          <select
            value={scanInterval}
            onChange={(e) => setScanInterval(Number(e.target.value))}
            className="bg-transparent text-slate-300 text-xs font-mono px-2 py-1 focus:outline-none cursor-pointer"
            disabled={autoScannerRunning}
          >
            <option value={1} className="bg-dark-900 text-slate-200">1m</option>
            <option value={5} className="bg-dark-900 text-slate-200">5m</option>
            <option value={10} className="bg-dark-900 text-slate-200">10m</option>
            <option value={15} className="bg-dark-900 text-slate-200">15m</option>
          </select>
          <button
            onClick={() => onToggleAutoScanner(scanInterval)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
              autoScannerRunning
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                : 'bg-bull/20 text-bull hover:bg-bull/30 border border-bull/30'
            }`}
          >
            {autoScannerRunning ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span>Stop Auto</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Auto Scan</span>
              </>
            )}
          </button>
        </div>

        {/* Manual Scan Button */}
        <button
          onClick={onManualScan}
          disabled={isScanning}
          className="flex items-center space-x-2 bg-gradient-to-r from-bull to-emerald-600 hover:from-bull-light hover:to-emerald-500 text-dark-950 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-md shadow-bull/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? `Scanning (${scanProgress.scanned}/${scanProgress.total})` : 'Scan Now'}</span>
        </button>

        {/* Notification Permission Request */}
        <button
          onClick={handleRequestNotification}
          title={notifGranted ? 'Desktop Notifications Enabled' : 'Enable Desktop Notifications'}
          className={`p-2 rounded-lg border transition-colors ${
            notifGranted
              ? 'bg-dark-800 border-bull/40 text-bull'
              : 'bg-dark-800 border-dark-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Alert Audio On' : 'Alert Audio Muted'}
          className="p-2 rounded-lg bg-dark-800 border border-dark-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-bull" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Last Scan Time */}
        {lastScanTime && (
          <div className="hidden xl:flex items-center space-x-1.5 text-[11px] font-mono text-slate-400 pl-2 border-l border-dark-700">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{lastScanTime}</span>
          </div>
        )}
      </div>
    </header>
  );
};
