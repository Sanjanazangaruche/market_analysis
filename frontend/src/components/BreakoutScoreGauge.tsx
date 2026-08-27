import React from 'react';
import { BreakoutScoreBreakdown } from '../types';

interface BreakoutScoreGaugeProps {
  score: number;
  classification: string;
  breakdown?: BreakoutScoreBreakdown;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const BreakoutScoreGauge: React.FC<BreakoutScoreGaugeProps> = ({
  score,
  classification,
  breakdown,
  size = 'md',
  showDetails = false,
}) => {
  const getColorClass = (val: number) => {
    if (val >= 90) return { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/40', stroke: '#10b981' };
    if (val >= 80) return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/40', stroke: '#22c55e' };
    if (val >= 70) return { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40', stroke: '#06b6d4' };
    if (val >= 60) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/40', stroke: '#f59e0b' };
    return { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/40', stroke: '#ef4444' };
  };

  const style = getColorClass(score);
  const radius = size === 'lg' ? 38 : size === 'md' ? 24 : 16;
  const strokeWidth = size === 'lg' ? 6 : size === 'md' ? 4 : 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs border ${style.bg} ${style.text} ${style.border}`}>
        <span>{Math.round(score)}</span>
        <span className="text-[9px] opacity-70 ml-0.5">/100</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg
          className="transform -rotate-90"
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
        >
          {/* Background circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#1c2538"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke={style.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className={`font-mono font-bold ${size === 'lg' ? 'text-2xl' : 'text-sm'} ${style.text}`}>
            {Math.round(score)}
          </span>
          {size === 'lg' && (
            <span className="text-[10px] font-mono text-slate-400 -mt-1">/ 100</span>
          )}
        </div>
      </div>

      <div className="mt-1 text-center">
        <span className={`text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}>
          {classification.replace('_', ' ')}
        </span>
      </div>

      {showDetails && breakdown && (
        <div className="w-full mt-3 pt-3 border-t border-dark-750 text-xs space-y-1 font-mono">
          <div className="flex justify-between text-slate-400">
            <span>S/R Breakout:</span>
            <span className="text-slate-200">{breakdown.sr_breakout_score}/20</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Volume Confirm:</span>
            <span className="text-slate-200">{breakdown.volume_score}/15</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>EMA Alignment:</span>
            <span className="text-slate-200">{breakdown.ema_trend_score}/15</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>RSI Momentum:</span>
            <span className="text-slate-200">{breakdown.rsi_score}/10</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>MACD Confirmation:</span>
            <span className="text-slate-200">{breakdown.macd_score}/10</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>ADX Trend Strength:</span>
            <span className="text-slate-200">{breakdown.adx_score}/10</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>VWAP & Supertrend:</span>
            <span className="text-slate-200">{breakdown.vwap_score + breakdown.supertrend_score}/10</span>
          </div>
        </div>
      )}
    </div>
  );
};
