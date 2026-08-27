import React, { useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, X, ArrowUpRight, Clock, Flame } from 'lucide-react';
import { AlertItem } from '../types';

interface AlertToastProps {
  alert: AlertItem | null;
  onClose: () => void;
  onSelectStock: (symbol: string) => void;
}

export const AlertToast: React.FC<AlertToastProps> = ({ alert, onClose, onSelectStock }) => {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onClose();
    }, 9000);
    return () => clearTimeout(timer);
  }, [alert, onClose]);

  if (!alert) return null;

  const isBull = !alert.breakout_type.includes('BEARISH');
  const isHighAcc = alert.ai_confidence >= 90;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200">
      <div className={`rounded-2xl p-4 shadow-2xl border backdrop-blur-lg bg-dark-900/95 ${
        isHighAcc
          ? 'border-bull shadow-bull/30 ring-1 ring-bull/50'
          : isBull
          ? 'border-bull/50 shadow-bull/20'
          : 'border-bear/50 shadow-bear/20'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl ${isBull ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'}`}>
              {isBull ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm text-white">{alert.symbol}</span>
                <span className="text-[10px] font-mono px-1 rounded bg-dark-750 text-slate-300">
                  {alert.exchange}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bull/20 text-bull font-bold">
                  {alert.score}/100
                </span>
                {isHighAcc && (
                  <span className="flex items-center text-[9px] font-mono px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-600 to-bull text-white font-bold animate-pulse shadow-sm shadow-bull/30">
                    <Flame className="w-2.5 h-2.5 mr-0.5 text-amber-300 fill-amber-300" />
                    90%+ AI Conf
                  </span>
                )}
              </div>
              <span className={`text-xs font-mono font-bold block ${isBull ? 'text-bull-light' : 'text-bear-light'}`}>
                {alert.breakout_type.replace('_', ' ')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Holding Timeframe Info */}
        <div className="mt-2.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-dark-800 border border-cyan-500/30 text-[11px] font-mono shadow-inner">
          <span className="text-slate-300 flex items-center font-medium">
            <Clock className="w-3.5 h-3.5 text-cyan-400 mr-1.5" /> Holding Horizon:
          </span>
          <span className="font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/40">
            {alert.holding_period || 'Swing Entry (3 - 7 Days)'}
          </span>
        </div>

        {/* Quick parameters */}
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center font-mono text-[10px] bg-dark-800/80 p-2 rounded-lg border border-dark-750">
          <div>
            <span className="text-slate-400 block">Entry</span>
            <span className="font-bold text-white">₹{alert.entry_min}</span>
          </div>
          <div>
            <span className="text-rose-400 block">SL</span>
            <span className="font-bold text-rose-300">₹{alert.stop_loss}</span>
          </div>
          <div>
            <span className="text-bull block">Target 2</span>
            <span className="font-bold text-emerald-300">₹{alert.target_2}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-400">
            R:R 1:{alert.risk_reward} • Conf: <span className={isHighAcc ? 'text-bull font-bold' : 'text-purple-300'}>{alert.ai_confidence}%</span>
          </span>
          <button
            onClick={() => {
              onSelectStock(alert.symbol);
              onClose();
            }}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-bull text-dark-950 font-bold text-xs hover:bg-bull-light transition-colors shadow-md shadow-bull/20"
          >
            <span>Analyze Chart</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
